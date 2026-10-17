---
title: "Molecular dynamics"
description: "Newton's equations on a computer: the Verlet integrator and why it conserves energy, choosing the time step, periodic boundaries and cut-offs, thermostats and barostats, and a working MD workflow."
track: dyn
weight: 2
level: Core
minutes: 60
lab: "Run a Lennard-Jones fluid and break the integrator"
prereqs: ["potential-energy-surfaces", "boltzmann-and-maxwell"]
---

## The idea

Molecular dynamics (MD) solves Newton's equations of motion for every atom,

$$
m_i\,\ddot{\mathbf r}_i = \mathbf F_i = -\nabla_{\mathbf r_i} E(\mathbf R), \qquad i = 1,\dots,N,
$$

one small time step at a time, starting from some positions and velocities. The result is a **trajectory**, a movie of the atoms. Averages over the trajectory give thermodynamic and structural properties; correlations in time give transport properties. The method dates from Alder and Wainwright's hard-sphere simulations (1957) and Rahman's simulation of liquid argon (1964); today it runs routinely on millions of atoms.

Two facts make MD work in practice. First, a good integrator keeps the total energy constant for millions of steps even though each step has an error. Second, statistical mechanics tells us that a long trajectory samples the same states as an ensemble average (the **ergodic hypothesis**), so time averages from one simulation give equilibrium properties.

## Integrating the equations: Verlet

Expand the position forward and backward in time by a step $\Delta t$:

$$
\mathbf r(t \pm \Delta t) = \mathbf r(t) \pm \mathbf v(t)\Delta t + \tfrac12\mathbf a(t)\Delta t^2 \pm \tfrac16\dddot{\mathbf r}(t)\Delta t^3 + \mathcal O(\Delta t^4).
$$

Adding the two expansions cancels the odd terms and gives the **Verlet algorithm** (Verlet, 1967),

$$
\mathbf r(t+\Delta t) = 2\mathbf r(t) - \mathbf r(t-\Delta t) + \frac{\mathbf F(t)}{m}\Delta t^2 + \mathcal O(\Delta t^4).
$$

The equivalent form used in most codes, **velocity Verlet**, carries velocities explicitly:

$$
\begin{aligned}
\mathbf v\big(t+\tfrac{\Delta t}{2}\big) &= \mathbf v(t) + \frac{\Delta t}{2m}\mathbf F(t),\\
\mathbf r(t+\Delta t) &= \mathbf r(t) + \Delta t\,\mathbf v\big(t+\tfrac{\Delta t}{2}\big),\\
\mathbf v(t+\Delta t) &= \mathbf v\big(t+\tfrac{\Delta t}{2}\big) + \frac{\Delta t}{2m}\mathbf F(t+\Delta t).
\end{aligned}
$$

One force evaluation per step, which is where nearly all the cost lies.

**Why Verlet and not something more accurate?** The obvious scheme, explicit Euler ($\mathbf r \mathrel{+}= \mathbf v\Delta t$, $\mathbf v \mathrel{+}= \mathbf a\Delta t$), has a smaller per-step error than you might think, yet its energy grows without limit. Verlet is **time-reversible** and **symplectic**: it preserves the volume of phase space exactly, as the true dynamics does. A deep consequence is that a symplectic integrator exactly conserves a slightly perturbed "shadow" Hamiltonian $\tilde H = H + \mathcal O(\Delta t^2)$. The energy therefore fluctuates around a constant value with an amplitude proportional to $\Delta t^2$, with no systematic drift for a well-chosen step. Higher-order, non-symplectic methods such as Runge–Kutta are more accurate over a few steps but drift over millions of steps.

{{< widget name="md2d" title="A 2D Lennard-Jones fluid" caption="Particles are coloured by speed. With velocity Verlet and no thermostat, the total energy (black) stays flat while kinetic and potential energy exchange. Switch to Euler and watch it climb; raise the time step towards 0.03 with Verlet and watch the fluctuations grow until the system explodes. Then turn on a thermostat, change the temperature and density, press Restart and switch the plot to g(r)." >}}

Things to try in the lab:

1. **NVE with Verlet at Δt = 0.005.** Total energy is flat to four decimal places; kinetic and potential energy trade places.
2. **Euler.** The total energy rises steadily: the integrator is pumping energy in. The system heats up until it boils.
3. **Verlet with Δt = 0.02–0.03.** Fluctuations grow roughly as $\Delta t^2$ until close collisions are no longer resolved and the energy jumps. The NumPy code below shows the same trend quantitatively.
4. **Langevin thermostat at T\* = 0.4 and density 0.85, then Restart.** The atoms lock into a close-packed (triangular) arrangement, with defects because 100 atoms do not tile a square box perfectly. In the g(r) plot the second peak splits into two, at about $\sqrt3\,\sigma$ and $2\sigma$, the signature of hexagonal order. At T\* = 2 and density 0.3 the system is a dense gas with a single weak peak.

## Choosing the time step

The step must resolve the fastest motion in the system, with about 10 to 20 steps per period. The fastest motions in molecules are bond stretches involving hydrogen: a C–H stretch at about 3000 cm⁻¹ has a period of about 11 fs, so unconstrained all-atom MD uses $\Delta t \approx 0.5$–1 fs. Constraining bonds to hydrogen with SHAKE or LINCS removes these motions and allows 2 fs, the standard in biomolecular simulation; **hydrogen mass repartitioning** (moving mass from heavy atoms to their hydrogens) allows about 4 fs. Coarse-grained models, which have no fast vibrations, use 10–40 fs. Monoatomic Lennard-Jones argon is comfortable at about 5 fs, $0.002$–$0.005\tau$ in reduced units.

## Simulating bulk matter with a few thousand atoms

**Periodic boundary conditions.** A box of $10^4$ atoms would be mostly surface. Instead the box is surrounded by infinite copies of itself: an atom leaving through one face re-enters through the opposite one. Each atom interacts with the nearest image of every other atom (the **minimum-image convention**), which is why the box must be more than twice the interaction cut-off. Periodicity suppresses fluctuations longer than the box, and some properties, notably diffusion coefficients, need finite-size corrections.

**Cut-offs and neighbour lists.** Short-range interactions are truncated at a cut-off $r_c$, typically 1.0–1.2 nm in biomolecular force fields or $2.5\sigma$ for Lennard-Jones. Shifting the potential so that it reaches zero at $r_c$ avoids a jump in energy, and long-range dispersion corrections can be added analytically. Rebuilding a list of neighbours within $r_c$ plus a skin every few steps makes the cost proportional to $N$ instead of $N^2$.

**Electrostatics cannot be cut off.** The Coulomb interaction decays as $1/r$ and its sum over a periodic system converges only conditionally. **Ewald summation** splits it into a short-range part summed in real space and a smooth long-range part summed in reciprocal space; the **particle-mesh Ewald** (PME) method does the reciprocal sum with fast Fourier transforms in $\mathcal O(N\log N)$ time. Every serious biomolecular or electrolyte simulation uses PME.

## Temperature and pressure control

Plain MD conserves energy and samples the **microcanonical** (NVE) ensemble. Experiments are usually at constant temperature and pressure. The instantaneous temperature comes from equipartition,

$$
T_{\text{inst}} = \frac{2K}{N_{\text{df}}\,k_B}, \qquad K = \sum_i \tfrac12 m_i v_i^2,
$$

where $N_{\text{df}}$ is the number of degrees of freedom ($3N - 3$ in 3D after removing centre-of-mass motion, $2N - 2$ in the 2D lab). A **thermostat** modifies the dynamics so that the temperature fluctuates correctly around a target.

- **Berendsen** rescales velocities so that $T$ relaxes exponentially to the target with time constant $\tau_T$. It is robust for equilibration but suppresses the natural fluctuations of the kinetic energy, so it does *not* generate the canonical ensemble and should not be used for production runs.
- **Nosé–Hoover** adds a fictitious heat-bath variable with its own equation of motion. It is deterministic and samples the canonical ensemble, though a single thermostat can be non-ergodic for small or stiff systems (Nosé–Hoover chains fix this).
- **Stochastic velocity rescaling** (Bussi, Donadio and Parrinello) is a Berendsen-like scheme with a correctly designed random term. It samples the canonical ensemble and is the default in GROMACS (`v-rescale`).
- **Langevin dynamics** adds friction and a random force to every atom, $m\dot{\mathbf v} = \mathbf F - \gamma m\mathbf v + \sqrt{2\gamma m k_BT}\,\boldsymbol\xi(t)$. It is canonical and very stable, but the friction slows diffusion, so dynamical properties depend on $\gamma$.

**Barostats** do the same for pressure by letting the box volume (and shape) fluctuate: Parrinello–Rahman and the Martyna–Tobias–Klein (MTK) equations are canonical for production; Berendsen and the stochastic cell-rescaling method are used for equilibration or, in the latter case, also production.

## A typical workflow

1. **Build** the system: structure, topology (force-field parameters), solvent and ions.
2. **Minimise** the energy to remove bad contacts.
3. **Equilibrate at constant volume and temperature** (NVT) for tens to hundreds of picoseconds, often with restraints on the solute.
4. **Equilibrate at constant pressure** (NPT) until the density is stable.
5. **Production**: a long run with canonical thermostat and barostat, saving coordinates every few picoseconds.
6. **Analyse**, checking equilibration and statistical errors ([the lesson on trajectory analysis](../trajectory-analysis/)).

In GROMACS each stage is a preprocess-then-run pair (each `.mdp` file holds the stage's settings):

```bash
gmx grompp -f em.mdp  -c solvated.gro -p topol.top -o em.tpr
gmx mdrun  -deffnm em                        # energy minimisation
gmx grompp -f nvt.mdp -c em.gro  -r em.gro  -p topol.top -o nvt.tpr
gmx mdrun  -deffnm nvt                       # NVT equilibration
gmx grompp -f npt.mdp -c nvt.gro -t nvt.cpt -r nvt.gro -p topol.top -o npt.tpr
gmx mdrun  -deffnm npt                       # NPT equilibration
gmx grompp -f md.mdp  -c npt.gro -t npt.cpt -p topol.top -o md.tpr
gmx mdrun  -deffnm md -nb gpu                # production, non-bonded work on the GPU
gmx energy -f md.edr -o density.xvg          # pick "Density" from the menu
```

The same physics in LAMMPS, the classic Lennard-Jones melt in reduced units:

```text
units           lj
atom_style      atomic
lattice         fcc 0.8442
region          box block 0 10 0 10 0 10
create_box      1 box
create_atoms    1 box
mass            1 1.0
velocity        all create 1.44 87287 loop geom
pair_style      lj/cut 2.5
pair_coeff      1 1 1.0 1.0 2.5
neighbor        0.3 bin
fix             1 all nve
thermo          50
run             250
```

## MD in NumPy, and the energy test

A complete velocity-Verlet code fits on one screen. Run it to see how the energy drift depends on the time step (64 atoms in 2D, reduced units):

```python
import numpy as np

def lj_forces(x, L, rc=2.5):
    """Forces and potential energy for a periodic Lennard-Jones system (reduced units)."""
    d = x[:, None, :] - x[None, :, :]            # all pair vectors, shape (N, N, dim)
    d -= L * np.round(d / L)                      # minimum-image convention
    r2 = (d ** 2).sum(-1)
    np.fill_diagonal(r2, np.inf)
    mask = r2 < rc * rc
    inv6 = np.where(mask, r2 ** -3, 0.0)
    ec = 4 * (rc ** -12 - rc ** -6)               # shift so U(rc) = 0
    pe = 0.5 * np.sum(np.where(mask, 4 * (inv6 ** 2 - inv6) - ec, 0.0))
    fmag = np.where(mask, 24 * (2 * inv6 ** 2 - inv6) / r2, 0.0)
    return (fmag[:, :, None] * d).sum(1), pe

def run(dt, nsteps=2000, seed=1):
    rng = np.random.default_rng(seed)
    n, rho = 8, 0.6                                # 8 x 8 = 64 atoms in 2D
    L = np.sqrt(n * n / rho)
    g = (np.arange(n) + 0.5) * L / n
    x = np.array([[a, b] for a in g for b in g])
    v = rng.normal(size=x.shape); v -= v.mean(0)
    v *= np.sqrt(1.0 / (v ** 2).sum(1).mean() * 2)   # T* = 1 (2 degrees of freedom per atom)
    f, pe = lj_forces(x, L)
    energies = []
    for step in range(nsteps):                     # velocity Verlet
        v += 0.5 * dt * f
        x += dt * v
        x %= L
        f, pe = lj_forces(x, L)
        v += 0.5 * dt * f
        energies.append(0.5 * (v ** 2).sum() + pe)
    e = np.array(energies) / len(x)
    return e[-1] - e[0], e.std()

for dt in (0.002, 0.005, 0.01, 0.02):
    drift, fluct = run(dt)
    print(f"dt = {dt:.3f}:  drift of E/N = {drift:+.5f},  fluctuation = {fluct:.5f}")
```

```text
dt = 0.002:  drift of E/N = -0.00007,  fluctuation = 0.00003
dt = 0.005:  drift of E/N = -0.00078,  fluctuation = 0.00022
dt = 0.010:  drift of E/N = -0.00163,  fluctuation = 0.00071
dt = 0.020:  drift of E/N = +0.03473,  fluctuation = 0.01650
```

Halving the step from 0.010 to 0.005 cuts the fluctuation by about a factor of three, close to the $\Delta t^2$ scaling expected of Verlet; at 0.020 close encounters are no longer resolved and the energy jumps. **Checking energy conservation in a short NVE run is the first test of any new force field, MLIP or integrator.** It catches wrong forces (forces that are not the gradient of the energy) immediately.

With ASE, the same physics for 108 three-dimensional argon atoms:

```python
import numpy as np
from ase.lattice.cubic import FaceCenteredCubic
from ase.calculators.lj import LennardJones
from ase.md.velocitydistribution import MaxwellBoltzmannDistribution, Stationary
from ase.md.verlet import VelocityVerlet
from ase import units

# 108 argon atoms on an fcc lattice; LJ parameters in eV and Å
atoms = FaceCenteredCubic("Ar", size=(3, 3, 3), latticeconstant=5.26)
atoms.calc = LennardJones(epsilon=0.0104, sigma=3.40, rc=8.5, smooth=True)
MaxwellBoltzmannDistribution(atoms, temperature_K=60, rng=np.random.default_rng(0))
Stationary(atoms)                                  # remove centre-of-mass motion

dyn = VelocityVerlet(atoms, timestep=5 * units.fs)
def report():
    n = len(atoms)
    epot, ekin = atoms.get_potential_energy() / n, atoms.get_kinetic_energy() / n
    print(f"t = {dyn.get_time() / units.fs:6.0f} fs   Epot {epot:.4f}   Ekin {ekin:.4f}   "
          f"Etot {epot + ekin:.5f} eV/atom   T = {ekin / (1.5 * units.kB):5.1f} K")
dyn.attach(report, interval=200)
dyn.run(1000)
```

```text
t =      0 fs   Epot -0.0789   Ekin 0.0080   Etot -0.07089 eV/atom   T =  62.2 K
t =   1000 fs   Epot -0.0748   Ekin 0.0040   Etot -0.07088 eV/atom   T =  30.6 K
t =   2000 fs   Epot -0.0748   Ekin 0.0039   Etot -0.07088 eV/atom   T =  30.5 K
...
```

Notice the temperature falling from 60 K to 30 K while the total energy stays constant to $10^{-5}$ eV/atom. The run started from a perfect lattice, at the bottom of the potential well; half of the initial kinetic energy flows into potential energy as the atoms start to vibrate, exactly as the equipartition theorem predicts for a harmonic solid. This is why simulations are **equilibrated** before anything is measured.

{{< quiz >}}
- q: "Why is velocity Verlet preferred to a higher-order Runge–Kutta method for long MD runs?"
  options: ["It is more accurate per step", "It is symplectic and time-reversible, so the energy does not drift systematically over millions of steps", "It needs fewer atoms"]
  answer: 1
  why: "A symplectic integrator conserves a shadow Hamiltonian close to the true one, so the energy only fluctuates. Non-symplectic methods accumulate a systematic energy drift even if each step is more accurate."
- q: "An all-atom simulation with no constraints is unstable at 2 fs. What is the most likely cause?"
  options: ["The box is too small", "Bond vibrations involving hydrogen (period ≈ 10 fs) are not resolved with only about five steps per period", "The thermostat is too weak"]
  answer: 1
  why: "X–H stretches are the fastest motions. Either use about 1 fs, or constrain bonds to hydrogen (SHAKE/LINCS) to allow 2 fs."
- q: "Which thermostat should not be used for production runs, because it does not sample the canonical ensemble?"
  options: ["Berendsen", "Nosé–Hoover", "Stochastic velocity rescaling (Bussi)"]
  answer: 0
  why: "Berendsen coupling suppresses kinetic-energy fluctuations. It is fine for bringing a system to temperature but gives incorrect fluctuation properties, such as heat capacities, in production."
- q: "You implement a new machine-learned potential and run NVE MD. The total energy drifts steadily even at a tiny time step. What does that suggest?"
  options: ["The time step is still too large", "The forces are not the exact negative gradient of the predicted energy", "The system is not equilibrated"]
  answer: 1
  why: "If the drift persists as Δt → 0, the integrator is not to blame: the forces must be inconsistent with the energy (non-conservative forces). Forces should be computed as $-\\nabla E$ by automatic differentiation."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. D. Frenkel and B. Smit, *Understanding Molecular Simulation*, 3rd ed., Academic Press (2023), chapters 4 (molecular dynamics) and 7 (other ensembles).
2. M. P. Allen and D. J. Tildesley, *Computer Simulation of Liquids*, 2nd ed., Oxford University Press (2017), chapters 3 (molecular dynamics) and 5–6 (practical aspects, long-range forces).
3. M. E. Tuckerman, *Statistical Mechanics: Theory and Molecular Simulation*, 2nd ed., Oxford University Press (2023), chapters 3 and 4 (symplectic integration, thermostats).
4. B. J. Alder and T. E. Wainwright, “Phase transition for a hard sphere system,” *Journal of Chemical Physics* **27**, 1208–1209 (1957).
5. A. Rahman, “Correlations in the motion of atoms in liquid argon,” *Physical Review* **136**, A405–A411 (1964).
6. L. Verlet, “Computer ‘experiments’ on classical fluids. I. Thermodynamical properties of Lennard-Jones molecules,” *Physical Review* **159**, 98–103 (1967).
7. W. C. Swope, H. C. Andersen, P. H. Berens and K. R. Wilson, “A computer simulation method for the calculation of equilibrium constants for the formation of physical clusters of molecules,” *Journal of Chemical Physics* **76**, 637–649 (1982) (velocity Verlet).
8. H. J. C. Berendsen, J. P. M. Postma, W. F. van Gunsteren, A. DiNola and J. R. Haak, “Molecular dynamics with coupling to an external bath,” *Journal of Chemical Physics* **81**, 3684–3690 (1984).
9. S. Nosé, “A unified formulation of the constant temperature molecular dynamics methods,” *Journal of Chemical Physics* **81**, 511–519 (1984); W. G. Hoover, “Canonical dynamics: equilibrium phase-space distributions,” *Physical Review A* **31**, 1695–1697 (1985).
10. G. Bussi, D. Donadio and M. Parrinello, “Canonical sampling through velocity rescaling,” *Journal of Chemical Physics* **126**, 014101 (2007).
11. M. Parrinello and A. Rahman, “Polymorphic transitions in single crystals: a new molecular dynamics method,” *Journal of Applied Physics* **52**, 7182–7190 (1981).
12. T. Darden, D. York and L. Pedersen, “Particle mesh Ewald: an N·log(N) method for Ewald sums in large systems,” *Journal of Chemical Physics* **98**, 10089–10092 (1993).
13. B. Hess, H. Bekker, H. J. C. Berendsen and J. G. E. M. Fraaije, “LINCS: a linear constraint solver for molecular simulations,” *Journal of Computational Chemistry* **18**, 1463–1472 (1997).
14. M. J. Abraham, T. Murtola, R. Schulz, S. Páll, J. C. Smith, B. Hess and E. Lindahl, “GROMACS: high performance molecular simulations through multi-level parallelism from laptops to supercomputers,” *SoftwareX* **1–2**, 19–25 (2015).
15. A. P. Thompson et al., “LAMMPS: a flexible simulation tool for particle-based materials modeling at the atomic, meso, and continuum scales,” *Computer Physics Communications* **271**, 108171 (2022).
16. A. H. Larsen et al., “The atomic simulation environment: a Python library for working with atoms,” *Journal of Physics: Condensed Matter* **29**, 273002 (2017).

</div>
