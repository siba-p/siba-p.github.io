---
title: "Machine-learned interatomic potentials"
description: "Learning the potential energy surface from quantum-mechanical data: the energy decomposition, forces and stresses by automatic differentiation, four generations of architectures, training on energies and forces, building data sets, validation beyond RMSE, uncertainty, and universal foundation potentials."
track: ai4mat
weight: 2
level: Advanced
minutes: 70
lab: "Fit a potential, then ask it to extrapolate"
prereqs: ["potential-energy-surfaces", "molecular-dynamics", "graph-neural-networks"]
---

## The trade-off they break

Every atomistic simulation chooses a model of the potential energy surface ([the lesson on potential energy surfaces](../potential-energy-surfaces/)). Density functional theory is accurate and general, but its cost grows roughly as $N^3$ in the number of electrons, limiting it to hundreds of atoms for picoseconds. Classical force fields are fast and scale linearly, but their fixed functional forms cannot describe bond breaking, changing coordination or chemistry they were not parameterised for. A **machine-learned interatomic potential** (MLIP) is a flexible function, fitted to DFT energies and forces, that reproduces the DFT surface closely while keeping the linear scaling and speed of a force field. With MLIPs, near-DFT-quality molecular dynamics of millions of atoms for nanoseconds has become routine.

## The anatomy of an MLIP

Almost every MLIP shares the same skeleton.

1. **Locality.** The energy is a sum of atomic energies, each a function of the atom's neighbourhood within a cut-off $r_c$ (typically 5–6 Å):
   $$ E(\mathbf R) = \sum_{i=1}^{N} \varepsilon_{Z_i}\big(\{\mathbf r_{ij}, Z_j\}_{r_{ij} < r_c}\big). $$
2. **Symmetry.** $\varepsilon$ is invariant to rotation, translation and permutation of like neighbours, through invariant descriptors ([the lesson on symmetry and descriptors](../symmetry-descriptors/)) or an equivariant network ([the lesson on graph neural networks](../graph-neural-networks/)).
3. **Conservative forces and stress by differentiation.** Forces and the stress tensor are derivatives of the single predicted energy, computed by automatic differentiation:
   $$ \mathbf F_i = -\frac{\partial E}{\partial\mathbf r_i}, \qquad \sigma_{\alpha\beta} = \frac{1}{V}\frac{\partial E}{\partial \epsilon_{\alpha\beta}}, $$
   where $\epsilon$ is a homogeneous strain of the cell (sign conventions for stress vary between codes). Because the forces are an exact gradient, energy is conserved in MD ([the molecular dynamics lesson](../molecular-dynamics/)). Models that predict forces directly, without an energy, are faster but not conservative, and can drift or heat up in long simulations.

## Four generations of architectures

- **Descriptor + neural network.** Behler and Parrinello (2007): atom-centred symmetry functions fed to element-specific networks. ANI applied the idea to organic molecules; DeePMD learns a local-frame descriptor and is widely used for large-scale materials simulation.
- **Kernel methods.** Gaussian approximation potentials (GAP; Bartók et al., 2010) use SOAP kernels with sparse Gaussian-process regression, which provides a built-in variance ([the lesson on Gaussian processes](../uncertainty-gaussian-processes/)).
- **Linear models in complete bases.** Moment tensor potentials (MTP) and the atomic cluster expansion (ACE) are linear in their parameters over a systematically improvable many-body basis. They are fast, data-efficient and easy to fit.
- **Message-passing and equivariant networks.** SchNet, NequIP, Allegro and MACE learn the representation end to end. Equivariant models in particular reach a given accuracy with far less data, which matters when each training point is an expensive DFT calculation. Most new work uses this family.

## Training on energies and forces

A training set is a list of configurations (positions, species, cell) labelled with DFT energies, forces and, for periodic systems, stresses. The loss combines all three:

$$
\mathcal L = \sum_{\text{configs } c}\left[ w_E\left(\frac{E_c - E_c^{\text{DFT}}}{N_c}\right)^2 + \frac{w_F}{3N_c}\sum_{i=1}^{N_c}\big\lVert\mathbf F_{i,c} - \mathbf F_{i,c}^{\text{DFT}}\big\rVert^2 + w_\sigma\big\lVert\boldsymbol\sigma_c - \boldsymbol\sigma_c^{\text{DFT}}\big\rVert^2\right].
$$

Forces matter enormously. One DFT calculation on a 100-atom cell yields one energy but 300 force components, each a direct measurement of the *slope* of the surface. Training on forces therefore pins down the shape of the energy surface between and around the training points. Training a force loss requires differentiating the force (itself a derivative) with respect to the parameters, a second-order derivative that autodiff frameworks handle with `create_graph=True`.

{{< widget name="mlip" title="Five networks fitted to a dimer curve" caption="The shaded band is the training range; outside it the networks are extrapolating. Compare energies only with energies plus forces at three or four training points; then move the sampled range so that the repulsive wall or the long-range tail is missing, and watch the ensemble spread warn you." >}}

The lab makes four points that hold for real potentials.

1. **Forces are worth many energies.** With four training points and energies only, the networks interpolate wildly; with forces the same four points constrain the curve tightly.
2. **Inside the training range, errors are small; outside, anything can happen.** Remove short distances from the training set and the repulsive wall disappears: a real MD simulation with such a potential lets atoms collapse onto each other, the most common failure of a new MLIP.
3. **The ensemble knows when it is guessing.** Where the five networks agree, they are usually right; where they disagree, they are usually wrong. That spread is the trigger for active learning ([the active-learning lesson](../active-learning/)).
4. **Fine structure needs data.** The small bump near 2.4 Å is invisible to the model unless points are sampled there.

## Building a training set

The data set matters more than the architecture. Good practice:

- **Cover the configurations the simulation will visit**: MD snapshots at and above the target temperature, strained and rattled cells, surfaces, defects, and the short-distance repulsive region.
- **Remove near-duplicates.** Consecutive MD frames add almost nothing ([the lesson on generalisation](../generalisation/)). Select diverse frames, for example by farthest-point sampling in descriptor space.
- **Use consistent DFT settings** for every label: the same functional, pseudopotentials, plane-wave cut-off, k-point density and smearing. Mixed settings inject noise the model cannot fit.
- **Grow the set iteratively**: train, run MD, find configurations where an ensemble disagrees or where the simulation fails, compute them with DFT, add, retrain. Tools such as FLARE (on-the-fly learning during MD) and DP-GEN (for DeePMD potentials) automate this loop.

## Validation beyond the test RMSE

Low test errors (a few meV/atom in energy, tens of meV/Å in force) are necessary but not sufficient. A potential can have excellent average errors and still fail in simulation, because MD visits rare configurations that a random test set does not contain. Validate the *physics*:

- energy conservation in NVE and stability over long runs at the highest temperature of interest;
- lattice constants, elastic constants and phonon dispersions against DFT;
- radial distribution functions, densities and diffusion coefficients against reference simulations or experiment;
- energies along the processes you care about: vacancy migration, surface energies, reaction barriers.

Fu et al. (2023) showed across many models that force accuracy and simulation stability are only loosely correlated, which is why simulation-based tests are now standard.

## Long-range physics

A cut-off of 5 Å cannot describe electrostatics or dispersion between distant atoms. For ionic systems, interfaces and charged defects, modern potentials add explicit long-range terms: learned atomic charges with Ewald summation (as in fourth-generation neural network potentials), or empirical dispersion corrections such as Grimme's D3 added on top of the short-range model.

## Universal potentials

Since 2022, MLIPs have been trained on hundreds of thousands of diverse structures spanning most of the periodic table, mainly DFT relaxation trajectories from the Materials Project and larger data sets that followed. M3GNet, CHGNet, MACE-MP-0 and their successors run out of the box on almost any inorganic material. They are excellent starting points and for screening, but have systematic errors (often a softening of the energy surface inherited from PBE and from under-sampling of high-energy configurations), so for quantitative work they are **fine-tuned** on a smaller set of system-specific DFT calculations.

## In practice

A minimal Behler–Parrinello potential in PyTorch, trained on energies and forces of random Lennard-Jones clusters, with forces obtained by automatic differentiation:

```python
import torch

torch.manual_seed(0)
RC = 3.0
CENTRES = torch.linspace(0.8, RC, 16)

def lj(pos):                                      # reference "DFT": Lennard-Jones, eps = sigma = 1
    r = torch.cdist(pos, pos)
    iu = torch.triu_indices(len(pos), len(pos), 1)
    r = r[iu[0], iu[1]]
    return torch.sum(4 * (r ** -12 - r ** -6))

def features(pos):                                # per-atom radial symmetry functions G2
    d = pos[:, None] - pos[None]
    r = torch.sqrt((d ** 2).sum(-1) + torch.eye(len(pos)))   # +eye avoids sqrt(0) on the diagonal
    fc = torch.where(r < RC, 0.5 * (torch.cos(torch.pi * r / RC) + 1), torch.zeros_like(r))
    fc = fc * (1 - torch.eye(len(pos)))                      # no self-interaction
    return (torch.exp(-4.0 * (r[..., None] - CENTRES) ** 2) * fc[..., None]).sum(1)

class Potential(torch.nn.Module):                 # E = sum_i NN(G_i): Behler-Parrinello form
    def __init__(self):
        super().__init__()
        self.nn = torch.nn.Sequential(torch.nn.Linear(16, 32), torch.nn.SiLU(),
                                      torch.nn.Linear(32, 32), torch.nn.SiLU(), torch.nn.Linear(32, 1))
    def forward(self, pos):
        return self.nn(features(pos)).sum()

def sample():                                     # random 5-atom clusters without close contacts
    while True:
        pos = torch.rand(5, 3) * 2.2
        if torch.pdist(pos).min() > 0.95:
            return pos

def label(pos):                                   # reference energy and forces = -dE/dr
    pos = pos.clone().requires_grad_(True)
    e = lj(pos)
    return e.detach(), -torch.autograd.grad(e, pos)[0]

data = [(p, *label(p)) for p in (sample() for _ in range(300))]
train, test = data[:250], data[250:]
model = Potential()
opt = torch.optim.Adam(model.parameters(), lr=3e-3)

def predict(pos):
    pos = pos.clone().requires_grad_(True)
    e = model(pos)
    f = -torch.autograd.grad(e, pos, create_graph=True)[0]   # forces by autodiff, differentiable
    return e, f

for epoch in range(60):
    for pos, e_ref, f_ref in train:
        e, f = predict(pos)
        loss = (e - e_ref) ** 2 + 10.0 * ((f - f_ref) ** 2).mean()   # energy + weighted force loss
        opt.zero_grad(); loss.backward(); opt.step()

e_err, f_err = [], []
for pos, e_ref, f_ref in test:
    e, f = predict(pos)
    e_err.append((e.detach() - e_ref).abs() / 5); f_err.append((f.detach() - f_ref).abs().mean())
f_scale = torch.stack([f.abs().mean() for _, _, f in test]).mean()
print(f"test MAE: energy {torch.stack(e_err).mean():.3f} eps/atom, force {torch.stack(f_err).mean():.3f} eps/sigma")
print(f"for scale, the mean |force component| in the test set is {f_scale:.2f} eps/sigma")
```

```text
test MAE: energy 0.053 eps/atom, force 1.221 eps/sigma
for scale, the mean |force component| in the test set is 4.71 eps/sigma
```

The force error, about a quarter of a typical force, is honest for a toy: 250 configurations, a few minutes of training, and a target with an extremely steep repulsive wall. Production potentials use thousands of configurations and train for hours on a GPU. With the MACE package, training and using a potential looks like this (not run here; it needs the package and a GPU for realistic sizes):

```bash
# train.xyz: extended-XYZ frames with DFT energy, forces and stress
mace_run_train --name="my_mace" --train_file="train.xyz" --valid_fraction=0.05 \
    --test_file="test.xyz" --E0s="average" --model="MACE" --r_max=5.0 \
    --energy_key="REF_energy" --forces_key="REF_forces" \
    --batch_size=10 --max_num_epochs=300 --ema --device=cuda
```

```python
from mace.calculators import mace_mp           # a universal foundation model
from ase.build import bulk
atoms = bulk("Si", "diamond", a=5.43)
atoms.calc = mace_mp(model="medium", device="cpu")
print(atoms.get_potential_energy(), atoms.get_stress())
```

{{< note type="warn" title="The failure modes to watch for" >}}
- **Holes in the repulsive wall**: atoms fuse or the simulation explodes. Always include short-distance configurations.
- **Silent extrapolation**: the simulation looks stable but visits configurations unlike the training set. Monitor ensemble disagreement or another uncertainty measure during production runs.
- **Mismatch between label and target physics**: an MLIP reproduces its DFT functional, including its errors. It cannot be more accurate than its training data.
{{< /note >}}

{{< quiz >}}
- q: "Why are MLIP forces usually computed as the derivative of a predicted energy rather than predicted directly?"
  options: ["It is faster", "It guarantees conservative forces, so energy is conserved in molecular dynamics", "Direct prediction is impossible for neural networks"]
  answer: 1
  why: "Forces that are an exact gradient of a scalar energy are conservative by construction. Directly predicted forces can contain a non-conservative part that pumps energy into an NVE simulation."
- q: "A DFT calculation of a 64-atom cell gives how many force labels, compared with energy labels?"
  options: ["One energy and one force", "One energy and 192 force components", "64 energies and 64 forces"]
  answer: 1
  why: "Each of the 64 atoms has a 3-component force, 192 numbers in total, alongside a single total energy (and 6 independent stress components for a periodic cell)."
- q: "Your new potential has a force RMSE of 30 meV/Å on the test set, but MD at 1200 K explodes after 20 ps. What is the most likely cause?"
  options: ["The test set error is too high", "The simulation reached configurations, such as close contacts, that were absent from the training data", "The time step is too small"]
  answer: 1
  why: "Average test errors measure performance on configurations like the training data. High-temperature MD finds rare, high-energy regions; if they were not sampled, the potential can have holes there."
- q: "What is the main role of the disagreement between members of an ensemble of potentials?"
  options: ["To average out the DFT noise", "To flag configurations where the model is extrapolating, so they can be computed with DFT and added to the training set", "To speed up the simulation"]
  answer: 1
  why: "Ensemble spread is a practical estimate of epistemic uncertainty and drives active-learning loops."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. Behler, “Four generations of high-dimensional neural network potentials,” *Chemical Reviews* **121**, 10037–10072 (2021).
2. O. T. Unke, S. Chmiela, H. E. Sauceda, M. Gastegger, I. Poltavsky, K. T. Schütt, A. Tkatchenko and K.-R. Müller, “Machine learning force fields,” *Chemical Reviews* **121**, 10142–10186 (2021).
3. V. L. Deringer, M. A. Caro and G. Csányi, “Machine learning interatomic potentials as emerging tools for materials science,” *Advanced Materials* **31**, 1902765 (2019).
4. J. Behler and M. Parrinello, “Generalized neural-network representation of high-dimensional potential-energy surfaces,” *Physical Review Letters* **98**, 146401 (2007).
5. A. P. Bartók, M. C. Payne, R. Kondor and G. Csányi, “Gaussian approximation potentials: the accuracy of quantum mechanics, without the electrons,” *Physical Review Letters* **104**, 136403 (2010).
6. J. S. Smith, O. Isayev and A. E. Roitberg, “ANI-1: an extensible neural network potential with DFT accuracy at force field computational cost,” *Chemical Science* **8**, 3192–3203 (2017).
7. L. Zhang, J. Han, H. Wang, R. Car and W. E, “Deep potential molecular dynamics: a scalable model with the accuracy of quantum mechanics,” *Physical Review Letters* **120**, 143001 (2018).
8. A. V. Shapeev, “Moment tensor potentials: a class of systematically improvable interatomic potentials,” *Multiscale Modeling & Simulation* **14**, 1153–1173 (2016).
9. S. Batzner et al., “E(3)-equivariant graph neural networks for data-efficient and accurate interatomic potentials,” *Nature Communications* **13**, 2453 (2022).
10. A. Musaelian, S. Batzner, A. Johansson, L. Sun, C. J. Owen, M. Kornbluth and B. Kozinsky, “Learning local equivariant representations for large-scale atomistic dynamics,” *Nature Communications* **14**, 579 (2023) (Allegro).
11. I. Batatia, D. P. Kovács, G. N. C. Simm, C. Ortner and G. Csányi, “MACE: higher order equivariant message passing neural networks for fast and accurate force fields,” *Advances in Neural Information Processing Systems* **35** (2022).
12. B. Deng, P. Zhong, K. Jun, J. Riebesell, K. Han, C. J. Bartel and G. Ceder, “CHGNet as a pretrained universal neural network potential for charge-informed atomistic modelling,” *Nature Machine Intelligence* **5**, 1031–1041 (2023).
13. I. Batatia et al., “A foundation model for atomistic materials chemistry,” arXiv:2401.00096 (2023) (MACE-MP-0).
14. X. Fu, Z. Wu, W. Wang, T. Xie, S. Keten, R. Gomez-Bombarelli and T. Jaakkola, “Forces are not enough: benchmark and critical evaluation for machine learning force fields with molecular simulations,” *Transactions on Machine Learning Research* (2023).
15. T. W. Ko, J. A. Finkler, S. Goedecker and J. Behler, “A fourth-generation high-dimensional neural network potential with accurate electrostatics including non-local charge transfer,” *Nature Communications* **12**, 398 (2021).

</div>
