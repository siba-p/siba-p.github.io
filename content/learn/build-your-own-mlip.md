---
title: "Tutorial: build your own machine-learned potential"
description: "A complete, tested walk-through: generate a labelled data set of copper configurations, write Behler–Parrinello symmetry functions and an atomic neural network from scratch in PyTorch, train on energies and forces, wrap the model as an ASE calculator, validate it by lattice constant, energy–volume curve and energy-conserving molecular dynamics, and then train an equivariant MACE model on the same data from the command line."
track: practice
weight: 3
level: Advanced
prereqs: ["neural-network-potentials", "mlip", "python-classes", "numpy-arrays"]
lab: "Every script below was run while writing this topic; the numbers quoted are its output"
---

## What we will build

This topic builds a complete machine-learned interatomic potential for copper, from raw data to molecular dynamics, using the ideas of the preceding topics: the atomic decomposition and symmetry functions of [neural-network potentials](../neural-network-potentials/), the energy-and-force loss of [what an MLIP must learn](../mlip-foundations/), and the validation strategy of [training and validation](../mlip/). Every line of code below was run while writing this topic, on a laptop CPU, and every number quoted is the actual output. The whole exercise takes about an hour of computer time.

The steps are: generate reference data; turn each atom's environment into symmetry-function descriptors; define the atomic neural network; train it on energies and forces; use it as an ASE calculator and test it beyond its test error; and finally train an equivariant MACE model on the same data, to see how a modern package compares with a model written by hand.

The scripts need Python 3.10 or later with NumPy, PyTorch and ASE (`pip install numpy torch ase`), and the last step needs `pip install mace-torch`. To keep the exercise self-contained and fast, the reference energies and forces come from ASE's EMT potential, a simple many-body potential for metals, instead of from DFT. EMT plays the role of the "quantum-mechanical" reference here; in real work you replace it by a DFT calculator (GPAW, VASP, Quantum ESPRESSO or CP2K through their ASE interfaces) and nothing else in the pipeline changes.

## Step 1: reference data

A potential can only describe configurations like those it was trained on, so the data must cover what the simulations will visit. Here we want copper crystals at temperatures up to 1200 K and under ±3 % strain. The script starts from 32-atom cubic cells of face-centred cubic copper at three lattice strains, rattles the atoms slightly, and runs short Langevin molecular dynamics with EMT at four temperatures, saving a snapshot every 20 steps. That gives 480 configurations with 32 atoms each, 15 360 atomic environments and 46 080 force components. Shuffling and splitting gives 400 structures for training and 80 for testing.

```python
# Step 1: a reference data set of copper configurations, labelled with the EMT potential
import numpy as np
from ase.build import bulk
from ase.calculators.emt import EMT
from ase.md.langevin import Langevin
from ase.md.velocitydistribution import MaxwellBoltzmannDistribution
from ase.io import write
from ase import units

rng = np.random.default_rng(0)
frames = []
for T in (300, 600, 900, 1200):
    for strain in (-0.03, 0.0, 0.03):
        atoms = bulk("Cu", "fcc", a=3.61 * (1 + strain), cubic=True).repeat((2, 2, 2))   # 32 atoms
        atoms.rattle(stdev=0.05, seed=int(rng.integers(1_000_000)))
        atoms.calc = EMT()
        MaxwellBoltzmannDistribution(atoms, temperature_K=T, rng=rng)
        dyn = Langevin(atoms, 2 * units.fs, temperature_K=T, friction=0.02, rng=rng)
        for _ in range(40):                       # 40 snapshots, 20 steps apart
            dyn.run(20)
            a = atoms.copy()
            a.info["energy"] = atoms.get_potential_energy()
            a.arrays["forces"] = atoms.get_forces()
            frames.append(a)
rng.shuffle(frames)
write("cu_train.extxyz", frames[:400])
write("cu_test.extxyz", frames[400:])
print(len(frames), "configurations;", len(frames[0]), "atoms each")
```

The data are written in extended XYZ format, which stores positions, cell, energy and forces together and is read by every MLIP code.

## Step 2: describing atomic environments

Each atom is described by 36 numbers: 24 radial and 12 angular symmetry functions over its neighbours within a 5 Å cutoff, which in fcc copper includes the first three neighbour shells (at 2.55, 3.61 and 4.42 Å). The radial functions are Gaussians in the neighbour distance at eight centres and three widths, summed over neighbours and multiplied by the smooth cutoff function. The angular functions are of Behler's G5 type, $2^{1-\zeta}\sum_{j,k}(1 + \lambda\cos\theta_{ijk})^\zeta e^{-\eta(r_{ij}^2 + r_{ik}^2)}f_c(r_{ij})f_c(r_{ik})$, at three values of $\zeta$, both signs of $\lambda$ and two radial decays.

The descriptors must be differentiable with respect to positions, because forces will be obtained by differentiating through them. The code therefore builds the neighbour list once with ASE (which handles periodic images), and computes all distances and angles from the position tensor inside PyTorch, so that automatic differentiation can follow every operation. The function `triplets` lists every pair of neighbours of the same central atom, which is what the angular terms sum over.

The choice of widths matters more than any other setting in this tutorial. The first version of this script used radial Gaussians with widths between 1.25 and 5 Å, a common-looking choice. Trained identically, it reached a force error of 296 meV/Å after 25 epochs; the version below, with widths between 0.25 and 0.7 Å, reached 34 meV/Å at the same point. The figure, which runs the plotting code in the page, shows why: the broad functions overlap so much that they cannot tell the first, second and third neighbour shells apart, so the descriptor barely changes when an atom moves between them.

{{< widget name="pyfig" title="Radial descriptors against the neighbour shells of copper" caption="Each curve is one radial basis function multiplied by the cutoff; dashed lines mark the fcc copper neighbour distances. Top: the first attempt, too broad to resolve the shells. Bottom: the set used below. The code runs in the page and can be edited." opts=`{"code": "import numpy as np\nimport matplotlib.pyplot as plt\n\nR_C = 5.0\nr = np.linspace(0.0, R_C, 400)\nfc = 0.5 * (np.cos(np.pi * r / R_C) + 1.0)\nshells = [2.55, 3.61, 4.42]                       # fcc copper neighbour distances (\u00c5)\n\nfig, axes = plt.subplots(2, 1, figsize=(6.2, 5.2), sharex=True)\nsets = [(\"first attempt: broad\", np.array([0.5, 1, 2, 4, 8]) / R_C**2, np.linspace(1.5, 4.5, 6)),\n        (\"second attempt: sharp\", np.array([1.0, 3.0, 8.0]), np.linspace(2.0, 4.8, 8))]\nfor ax, (title, etas, rss) in zip(axes, sets):\n    for eta in etas:\n        for rs in rss:\n            ax.plot(r, np.exp(-eta * (r - rs) ** 2) * fc, lw=0.8, color=plt.cm.viridis(eta / etas.max()))\n    for s in shells:\n        ax.axvline(s, color=\"#e64980\", ls=\"--\", lw=1.2)\n    ax.set_title(f\"{title}: widths {1 / np.sqrt(2 * etas.max()):.2f}\u2013{1 / np.sqrt(2 * etas.min()):.2f} \u00c5\", fontsize=10)\n    ax.set_ylabel(\"G2 term\")\naxes[1].set_xlabel(\"neighbour distance r (\u00c5)    (dashed: Cu neighbour shells)\")\nfig.tight_layout()\n"}` >}}

## Step 3: the atomic network

The model is the Behler–Parrinello architecture in its simplest form, since there is only one element: one network, shared by every atom, maps a standardised descriptor vector to an atomic energy, and the energy of a structure is the sum over its atoms. The network has two hidden layers of 32 neurons with SiLU activations, a smooth function so that forces are smooth too; that is 2 273 weights in total. The descriptors are standardised with the mean and standard deviation over the training set, stored with the model, and the output bias starts at the mean energy per atom, so that training begins from a sensible baseline.

## Step 4: training on energies and forces

Forces are computed exactly as the negative gradient of the predicted energy with `torch.autograd.grad`. During training this gradient must itself be differentiated with respect to the weights, which is why `create_graph=True` is passed: PyTorch keeps the graph of the force computation so that the force error can be backpropagated. To process many structures at once, each mini-batch of ten structures is joined into one disconnected graph, with atom indices offset so that the neighbour lists of different structures do not mix, and structure energies are collected with `index_add`.

The loss weights the squared energy error per atom by 10 and the squared force error per component by 1, in units of eV and eV/Å. Forces dominate the information, 96 numbers per structure against one energy, so a moderate energy weight keeps energies accurate without starving the force fit. Adam with a cosine learning-rate schedule runs for 120 epochs. Here is the complete script for steps 2 to 4:

```python
"""A Behler-Parrinello neural-network potential for copper, from scratch in PyTorch.

Steps: (2) symmetry-function descriptors, (3) an atomic network, (4) training on energies
and forces. Run make_data.py first to create cu_train.extxyz and cu_test.extxyz.
"""
import time
import numpy as np
import torch
from ase.io import read
from ase.neighborlist import neighbor_list

torch.set_default_dtype(torch.float64)
torch.manual_seed(0)

R_C = 5.0                                                   # cutoff radius (Å)
ETA = torch.tensor([1.0, 3.0, 8.0])                         # radial sharpness (1/Å²): widths 0.7 to 0.25 Å
R_S = torch.linspace(2.0, 4.8, 8)                           # radial centres spanning the neighbour shells (Å)
ZETA = torch.tensor([1.0, 2.0, 4.0])                        # angular sharpness
LAMBDA = torch.tensor([-1.0, 1.0])                          # angular sign
ETA_A = torch.tensor([0.05, 0.25])                          # angular radial decay (1/Å²)
N_DESC = len(ETA) * len(R_S) + len(ETA_A) * len(ZETA) * len(LAMBDA)   # 24 radial + 12 angular = 36


def cutoff(r):
    """Smooth cutoff: equal to 1 at r = 0, and to 0 with zero slope at r = R_C."""
    return 0.5 * (torch.cos(torch.pi * r / R_C) + 1.0) * (r < R_C)


def triplets(i):
    """All pairs (a, b) of neighbour entries that belong to the same centre atom."""
    order = np.argsort(i, kind="stable")
    counts = np.bincount(i)
    starts = np.cumsum(counts) - counts
    A, B = [], []
    for s, c in zip(starts, counts):
        idx = order[s:s + c]
        a, b = np.triu_indices(c, 1)
        A.append(idx[a]); B.append(idx[b])
    return np.concatenate(A), np.concatenate(B)


def featurise(atoms, offset=0):
    """Neighbour lists for one structure; positions stay free so forces can be taken later."""
    i, j, S = neighbor_list("ijS", atoms, R_C)
    A, B = triplets(i)
    return dict(i=i + offset, j=j + offset, shift=S @ atoms.cell.array, A=A, B=B)


def descriptors(pos, i, j, shift, A, B):
    """Radial (G2) and angular (G5-type) symmetry functions for every atom, differentiable in pos."""
    n = pos.shape[0]
    d = pos[j] - pos[i] + shift                             # neighbour vectors, periodic images included
    r = d.norm(dim=1)
    fc = cutoff(r)
    g2 = torch.exp(-ETA[:, None, None] * (r - R_S[None, :, None]) ** 2) * fc     # (eta, Rs, pairs)
    G2 = torch.zeros(n, len(ETA) * len(R_S)).index_add(0, i, g2.reshape(-1, len(r)).T)
    cos = (d[A] * d[B]).sum(1) / (r[A] * r[B])               # cosine of each angle j-i-k
    rad = torch.exp(-ETA_A[:, None] * (r[A] ** 2 + r[B] ** 2)) * fc[A] * fc[B]                 # (eta_a, pairs)
    ang = 2 ** (1 - ZETA)[:, None, None] * (1 + LAMBDA[None, :, None] * cos) ** ZETA[:, None, None]   # (zeta, lambda, pairs)
    g4 = ang[None] * rad[:, None, None, :]                                                     # (eta_a, zeta, lambda, pairs)
    G4 = torch.zeros(n, N_DESC - len(ETA) * len(R_S)).index_add(0, i[A], g4.reshape(-1, len(A)).T)
    return torch.cat([G2, G4], dim=1)


class BPNN(torch.nn.Module):
    """Total energy = sum over atoms of NN(G_i); one network for the single element Cu."""
    def __init__(self, g_mean, g_std, e0, hidden=32):
        super().__init__()
        self.register_buffer("g_mean", g_mean)
        self.register_buffer("g_std", g_std)
        self.net = torch.nn.Sequential(
            torch.nn.Linear(N_DESC, hidden), torch.nn.SiLU(),
            torch.nn.Linear(hidden, hidden), torch.nn.SiLU(),
            torch.nn.Linear(hidden, 1))
        with torch.no_grad():
            self.net[-1].bias.fill_(e0)                     # start from the mean energy per atom

    def forward(self, pos, graph, struct, n_struct):
        G = descriptors(pos, *(graph[k] for k in ("i", "j", "shift", "A", "B")))
        e_atom = self.net((G - self.g_mean) / self.g_std).squeeze(-1)
        return torch.zeros(n_struct).index_add(0, struct, e_atom)   # energy of each structure


def batch(frames):
    """Join several structures into one disconnected graph."""
    pos, E, F, struct, parts, off = [], [], [], [], [], 0
    for k, a in enumerate(frames):
        g = featurise(a, off)
        g["A"] = g["A"] + sum(len(p["i"]) for p in parts)    # triplet indices point into pair arrays
        g["B"] = g["B"] + sum(len(p["i"]) for p in parts)
        parts.append(g)
        pos.append(a.positions); E.append(a.get_potential_energy()); F.append(a.get_forces())
        struct += [k] * len(a); off += len(a)
    graph = {k: torch.tensor(np.concatenate([p[k] for p in parts])) for k in ("i", "j", "shift", "A", "B")}
    n_atoms = torch.tensor([len(a) for a in frames], dtype=torch.float64)
    return dict(pos=torch.tensor(np.concatenate(pos)), graph=graph, struct=torch.tensor(struct),
                n=len(frames), n_atoms=n_atoms, E=torch.tensor(E), F=torch.tensor(np.concatenate(F)))


def predict(model, b, create_graph=False):
    pos = b["pos"].clone().requires_grad_(True)
    E = model(pos, b["graph"], b["struct"], b["n"])
    F = -torch.autograd.grad(E.sum(), pos, create_graph=create_graph)[0]   # F = -dE/dr, exactly
    return E, F


def rmse(model, b):
    E, F = predict(model, b)
    e = ((E - b["E"]) / b["n_atoms"]).detach()
    return 1000 * e.pow(2).mean().sqrt().item(), 1000 * (F - b["F"]).detach().pow(2).mean().sqrt().item()


if __name__ == "__main__":
    train_frames, test_frames = read("cu_train.extxyz", ":"), read("cu_test.extxyz", ":")
    test = batch(test_frames)
    batches = [batch(train_frames[k:k + 10]) for k in range(0, len(train_frames), 10)]   # fixed mini-batches
    G = torch.cat([descriptors(b["pos"], *(b["graph"][k] for k in ("i", "j", "shift", "A", "B"))) for b in batches])
    e0 = torch.cat([b["E"] / b["n_atoms"] for b in batches]).mean()
    model = BPNN(G.mean(0), G.std(0) + 1e-8, e0.item())
    opt = torch.optim.Adam(model.parameters(), lr=2e-3)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=120)
    w_E, w_F = 10.0, 1.0             # weights for (eV/atom)² and (eV/Å)² errors
    t0 = time.time()
    for epoch in range(1, 121):
        for k in torch.randperm(len(batches)).tolist():
            b = batches[k]
            E, F = predict(model, b, create_graph=True)
            loss = w_E * (((E - b["E"]) / b["n_atoms"]) ** 2).mean() + w_F * ((F - b["F"]) ** 2).mean()
            opt.zero_grad(); loss.backward(); opt.step()
        sched.step()
        if epoch in (1, 10, 25, 50, 80, 120):
            eE, eF = rmse(model, test)
            print(f"epoch {epoch:3d}   test RMSE  energy {eE:6.2f} meV/atom   forces {eF:6.1f} meV/Å   ({time.time() - t0:4.0f} s)")
    torch.save(model.state_dict(), "cu_bpnn.pt")
```

Running it prints the test error at a few points during training:

| epoch | energy RMSE (meV/atom) | force RMSE (meV/Å) |
|---|---|---|
| 1 | 8.23 | 150.0 |
| 10 | 10.21 | 67.4 |
| 25 | 3.82 | 33.8 |
| 50 | 1.62 | 21.6 |
| 80 | 0.56 | 18.1 |
| 120 | 0.29 | 16.6 |

The final model predicts the energies of unseen structures to 0.3 meV per atom and their forces to 17 meV/Å, against force magnitudes of about 700 meV/Å in the data: an error of a few per cent. Training took about 33 minutes of wall time on a laptop CPU.

## Step 5: using the potential, and testing it properly

A test error is not a validation. The last script wraps the network as an ASE calculator, so that it can drive any ASE workflow, and then asks three questions that the test set cannot answer. Does it reproduce the equation of state of the crystal, including volumes slightly outside the training range? Does it predict the equilibrium lattice constant? And does molecular dynamics with it conserve energy in a cell larger than any it was trained on?

```python
"""Step 5: use the trained network as an ASE calculator, then test it beyond the test RMSE."""
import numpy as np
import torch
from ase.build import bulk
from ase.calculators.calculator import Calculator, all_changes
from ase.calculators.emt import EMT
from ase.md.verlet import VelocityVerlet
from ase.md.velocitydistribution import MaxwellBoltzmannDistribution
from ase import units
from bpnn import BPNN, featurise, descriptors

class BPNNCalculator(Calculator):
    implemented_properties = ["energy", "forces"]
    def __init__(self, model, **kw):
        super().__init__(**kw)
        self.model = model.eval()
    def calculate(self, atoms=None, properties=("energy",), system_changes=all_changes):
        super().calculate(atoms, properties, system_changes)
        g = {k: torch.tensor(v) for k, v in featurise(atoms).items()}        # neighbour list rebuilt every call
        pos = torch.tensor(atoms.positions, requires_grad=True)
        e_atom = self.model.net((descriptors(pos, g["i"], g["j"], g["shift"], g["A"], g["B"]) - self.model.g_mean) / self.model.g_std)
        E = e_atom.sum()
        F = -torch.autograd.grad(E, pos)[0]
        self.results = {"energy": E.item(), "forces": F.numpy()}

state = torch.load("cu_bpnn.pt")
model = BPNN(state["g_mean"], state["g_std"], 0.0)
model.load_state_dict(state)
calc = BPNNCalculator(model)

# (a) energy-volume curve and lattice constant, compared with the reference potential
print(" a (Å)   E_EMT (eV/atom)   E_NN (eV/atom)")
a_list = np.linspace(3.45, 3.80, 8)
for a in a_list:
    at = bulk("Cu", "fcc", a=a, cubic=True).repeat((2, 2, 2))
    at.calc = EMT(); e1 = at.get_potential_energy() / len(at)
    at.calc = calc;  e2 = at.get_potential_energy() / len(at)
    print(f" {a:.3f}   {e1:10.4f}        {e2:10.4f}")
for name, c in (("EMT", EMT()), ("NN", calc)):
    es = []
    for a in a_list:
        at = bulk("Cu", "fcc", a=a, cubic=True).repeat((2, 2, 2)); at.calc = c; es.append(at.get_potential_energy())
    p = np.polyfit(a_list, es, 3); r = np.roots(np.polyder(p)); a0 = r[np.isreal(r)].real; a0 = a0[(a0 > 3.4) & (a0 < 3.9)][0]
    print(f"{name}: equilibrium lattice constant {a0:.3f} Å")

# (b) NVE molecular dynamics: does the total energy stay constant? are forces close to EMT along the way?
atoms = bulk("Cu", "fcc", a=3.61, cubic=True).repeat((3, 3, 3))          # 108 atoms: larger than any training cell
MaxwellBoltzmannDistribution(atoms, temperature_K=600, rng=np.random.default_rng(1))
atoms.calc = calc
dyn = VelocityVerlet(atoms, 2 * units.fs)
etot, ferr = [], []
for step in range(250):                                                    # 500 steps of 2 fs = 1 ps
    dyn.run(2)
    etot.append(atoms.get_potential_energy() + atoms.get_kinetic_energy())
    if step % 25 == 0:
        ref = atoms.copy(); ref.calc = EMT()
        ferr.append(np.sqrt(np.mean((atoms.get_forces() - ref.get_forces()) ** 2)))
etot = np.array(etot) / len(atoms)
print(f"NVE, 108 atoms, 1 ps: total-energy drift {1000 * (etot[-1] - etot[0]):+.2f} meV/atom, "
      f"fluctuation {1000 * etot.std():.2f} meV/atom; T at end {atoms.get_temperature():.0f} K")
print(f"force RMSE against EMT along the trajectory: {1000 * np.mean(ferr):.0f} meV/Å")
```

The output:

```text
 a (Å)   E_EMT (eV/atom)   E_NN (eV/atom)
 3.450       0.0677            0.0724
 3.500       0.0226            0.0227
 3.550      -0.0015           -0.0012
 3.600      -0.0067           -0.0066
 3.650       0.0046            0.0038
 3.700       0.0303            0.0298
 3.750       0.0686            0.0677
 3.800       0.1181            0.1137
EMT: equilibrium lattice constant 3.590 Å
NN: equilibrium lattice constant 3.590 Å
NVE, 108 atoms, 1 ps: total-energy drift +0.03 meV/atom, fluctuation 0.01 meV/atom; T at end 279 K
force RMSE against EMT along the trajectory: 7 meV/Å
```

The network reproduces the equilibrium lattice constant exactly and the energy–volume curve to within a meV per atom across the strains it was trained on (lattice constants between about 3.50 and 3.72 Å). At 3.45 and 3.80 Å, outside the training range, the errors grow to 5 meV per atom, the first sign of extrapolation that [the topic on training and validation](../mlip/) warns about: the model was never shown such strongly compressed or expanded crystals. The molecular dynamics run, in a 108-atom cell three times larger than the training cells, conserves the total energy to 0.03 meV per atom over a picosecond, which shows that the forces are smooth and exactly conservative, and the forces along the trajectory agree with EMT to 7 meV/Å, better than the test error because room-temperature configurations are near the centre of the training distribution.

## Step 6: the same data with MACE

Writing a potential by hand shows every moving part. For production work, mature packages implement far more capable architectures with careful defaults, GPU support and interfaces to LAMMPS. The same data set can be used to train an equivariant MACE model ([message-passing potentials](../message-passing-potentials/)) from the command line. MACE expects the reference values under explicit keys, so the data are first copied into new files with the energy and forces stored as `REF_energy` and `REF_forces`:

```python
from ase.io import read, write
for name in ("train", "test"):
    frames = read(f"cu_{name}.extxyz", ":")
    for a in frames:
        a.info["REF_energy"] = a.get_potential_energy()
        a.arrays["REF_forces"] = a.get_forces()
        a.calc = None
    write(f"cu_{name}_mace.xyz", frames)
```

and then trained with

```bash
mace_run_train --name="cu_mace" --train_file="cu_train_mace.xyz" --valid_fraction=0.1 \
    --test_file="cu_test_mace.xyz" --energy_key="REF_energy" --forces_key="REF_forces" \
    --E0s="average" --model="MACE" --num_channels=32 --max_L=1 --correlation=3 \
    --r_max=5.0 --batch_size=10 --max_num_epochs=30 --swa --start_swa=20 \
    --default_dtype="float64" --device=cpu --seed=1
```

This is a deliberately small MACE (32 channels, vector features up to $L = 1$, correlation order 3) trained for only 30 epochs on a CPU. The `--swa` flag turns on what MACE calls stage two: from epoch 20 the energy weight in the loss rises from 1 to 1000 while the force weight stays at 100. The first stage is dominated by forces, which carry many numbers per configuration, but forces say nothing about how the energy changes under uniform strain, where every atom stays at a symmetric site with zero force; without stage two the energy–volume curve is learned poorly, even when the forces are excellent. The trained model is saved as `cu_mace.model` and is used from ASE with `from mace.calculators import MACECalculator; calc = MACECalculator(model_paths="cu_mace.model", device="cpu")`, or from LAMMPS for large simulations. Fine-tuning a foundation model instead of training from scratch, as described in [the topic on universal potentials](../universal-potentials/), uses the same command with `--foundation_model` pointing to a pre-trained model.

## From here to a research potential

Turning this exercise into a potential for research changes four things. The reference becomes DFT, computed with consistent settings, which makes each configuration seconds to hours of computer time instead of milliseconds, so every configuration must earn its place. The data set grows by **active learning**: train an ensemble, run molecular dynamics, compute the configurations on which the models disagree, retrain ([active learning](../active-learning/)). The system gains elements, which for a Behler–Parrinello potential means element-resolved descriptors and one network per element, and for MACE needs no change at all. And validation extends to the properties the potential will be used for: defects, surfaces, phonons, diffusion, melting, whatever the research question requires. The structure of the code, data in, descriptors or learned features, an atomic model, a loss on energies and forces, an ASE calculator out, stays exactly as here.

{{< note type="key" >}}
- The pipeline is: labelled configurations → differentiable descriptors → atomic network summed over atoms → loss on energies and forces with `create_graph=True` → calculator → physical validation.
- Descriptor resolution matters: radial functions must resolve the neighbour shells; too-broad functions left forces ten times worse at the same training stage.
- The hand-written network reached 0.3 meV/atom and 17 meV/Å, reproduced the lattice constant and conserved energy in NVE dynamics in a cell larger than any training cell; errors grew outside the trained strain range.
- MACE trains on the same extended-XYZ data from one command; real potentials replace the reference by DFT and grow data by active learning.
{{< /note >}}

## References and further reading

<div class="refs">

1. J. Behler and M. Parrinello, "Generalized neural-network representation of high-dimensional potential-energy surfaces", *Physical Review Letters* **98**, 146401 (2007).
2. J. Behler, "Atom-centered symmetry functions for constructing high-dimensional neural network potentials", *Journal of Chemical Physics* **134**, 074106 (2011).
3. K. W. Jacobsen, P. Stoltze and J. K. Nørskov, "A semi-empirical effective medium theory for metals and alloys", *Surface Science* **366**, 394–402 (1996), the EMT potential used as the reference.
4. A. H. Larsen et al., "The atomic simulation environment—a Python library for working with atoms", *Journal of Physics: Condensed Matter* **29**, 273002 (2017).
5. A. Paszke et al., "PyTorch: an imperative style, high-performance deep learning library", *Advances in Neural Information Processing Systems* **32** (2019).
6. I. Batatia, D. P. Kovács, G. N. C. Simm, C. Ortner and G. Csányi, "MACE: higher order equivariant message passing neural networks for fast and accurate force fields", *Advances in Neural Information Processing Systems* **35** (2022); documentation at mace-docs.readthedocs.io.

</div>
