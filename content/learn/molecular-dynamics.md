---
title: "Molecular dynamics"
description: "Newton's equations on a computer: the Verlet integrator and why it conserves energy, choosing the time step, periodic boundaries and cut-offs, thermostats and barostats, and a working MD workflow."
hook: "Write the obvious integrator for Newton's equations and your simulated liquid slowly heats up until it boils. Loup Verlet's 1967 algorithm keeps the energy flat for millions of steps, and the reason is geometry, not raw accuracy."
objectives:
  - "Derive the Verlet algorithm from Taylor expansions forward and backward in time"
  - "Explain why symplectic integrators show no systematic energy drift over long runs"
  - "Choose a time step from the fastest vibration in the system"
  - "Describe how periodic boundaries, cut-offs and Ewald sums mimic bulk matter"
  - "Run a minimise, equilibrate and produce workflow and test energy conservation in NVE"
cover: "cover.svg"
milestones:
  - year: 1957
    text: "Berni Alder and Thomas Wainwright find a freezing transition in hard-sphere MD"
  - year: 1964
    text: "Aneesur Rahman simulates 864 Lennard-Jones argon atoms"
  - year: 1967
    text: "Loup Verlet introduces his integrator and the neighbour list"
  - year: 1984
    text: "Shuichi Nosé derives deterministic dynamics that sample the canonical ensemble"
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

{{< note type="story" >}}
Aneesur Rahman's 1964 paper at Argonne National Laboratory followed 864 argon atoms in a periodic cube, interacting through a Lennard-Jones potential with $\varepsilon/k_B = 120$ K and $\sigma = 3.4$ Å, at 94.4 K, with a time step of $10^{-14}$ s. It reproduced the measured self-diffusion coefficient of liquid argon and showed that the velocity autocorrelation function of a dense liquid turns negative, as atoms rebound from the cage of their neighbours. Loup Verlet's 1967 study used the same number of atoms, and in it he introduced both the integrator that bears his name and the bookkeeping list of nearby pairs now called the Verlet neighbour list.
{{< /note >}}

{{< note type="practice" title="Back of the envelope" >}}
How far can MD reach? At a 2 fs time step, one microsecond is $5\times10^8$ steps. A GPU that completes 1,000 steps per second for a 100,000-atom solvated protein would need $5\times10^5$ s, almost six days, for that microsecond. A millisecond, the time scale of many conformational changes and of slow folding, is a thousand times further away. David Shaw's group reached it in 2010 for the small protein BPTI only by building Anton, a special-purpose machine for MD. Most biological and materials questions therefore sit at the edge of what plain MD can sample, which is why [enhanced sampling](../es-metadynamics/) exists.
{{< /note >}}

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

### Why Verlet works: the harmonic oscillator

The claims above can be checked exactly on the simplest system there is, a harmonic oscillator $\ddot x = -\omega^2x$. One step of velocity Verlet is a linear map of $(x, v)$,

$$
\begin{pmatrix} x' \\ v' \end{pmatrix} =
\begin{pmatrix} 1 - \tfrac12\omega^2\Delta t^2 & \Delta t \\ -\omega^2\Delta t\,\big(1 - \tfrac14\omega^2\Delta t^2\big) & 1 - \tfrac12\omega^2\Delta t^2 \end{pmatrix}
\begin{pmatrix} x \\ v \end{pmatrix},
$$

whose determinant is exactly 1: phase-space area is preserved, which is what symplectic means in one dimension. Multiplying out shows that the quantity

$$
\tilde H = \tfrac12 v^2 + \tfrac12\omega^2x^2\Big(1 - \frac{\omega^2\Delta t^2}{4}\Big)
$$

is conserved to round-off at every step. This is the shadow Hamiltonian, written down explicitly. It differs from the true energy by a term of order $\Delta t^2$, so the true energy oscillates within a band of relative width $\omega^2\Delta t^2/4$ and never drifts. The same formula gives the stability limit: $\tilde H$ describes a closed ellipse only while the bracket is positive, that is for $\omega\Delta t < 2$, or a time step shorter than the period divided by $\pi$.

Explicit Euler, $x' = x + \Delta t\,v$ and $v' = v - \omega^2\Delta t\,x$, has a matrix with determinant $1 + \omega^2\Delta t^2$. Each step multiplies the energy by exactly that factor. With 20 steps per period, $\omega\Delta t = 0.314$, the factor is 1.099 per step, 6.6 per period and 43 after two periods.

{{< fig src="phase-portrait.svg" alt="Two phase-space plots of a harmonic oscillator. Left: the Euler method spirals outward from the unit circle, reaching a radius of about six after two periods. Right: velocity Verlet with 20, 6 and 4 steps per period traces three closed ellipses, increasingly squashed in velocity as the step grows" caption="Left: Euler at 20 steps per period gains energy at every step. Right: velocity Verlet stays on a closed ellipse for 2000 steps, even at 4 steps per period; the ellipse is the contour of the shadow energy $\tilde H$, which approaches the exact circle (dashed) as $\Delta t \to 0$." >}}

Verlet is also only second-order accurate. The position update has a local error of $\mathcal O(\Delta t^4)$ per step, but errors from $t/\Delta t$ steps accumulate into a global error of $\mathcal O(\Delta t^2)$ in the trajectory. In a chaotic many-body system, however, accuracy of the trajectory is not achievable by any integrator for long, as the next note explains, and what matters is that the sampled distribution is right. Symplecticity guarantees that.

{{< note type="warn" title="Myth" >}}
**Myth:** an accurate MD run reproduces the true trajectory of the atoms. **Reality:** the dynamics of a liquid or a protein is chaotic. Two runs that differ by $10^{-10}$ Å in one coordinate, or merely in the order of floating-point additions on a different number of processors, separate exponentially and become uncorrelated within picoseconds. The NumPy example later in this chapter shows it: rerun with a different NumPy build, its drift values change in the second significant figure. What MD gets right is the statistics: the numerical trajectory stays close to *some* exact trajectory of the shadow Hamiltonian, so averages, distributions and time-correlation functions are reliable even though no individual path is.
{{< /note >}}

{{< note type="fun" >}}
The integrator is older than Verlet. The Norwegian mathematician Carl Størmer used the same scheme in the early 1900s to compute the paths of charged particles in the Earth's magnetic field in his work on the aurora, and numerical analysts still call it the Störmer–Verlet method.
{{< /note >}}

{{< widget name="md2d" title="A 2D Lennard-Jones fluid" caption="Particles are coloured by speed. With velocity Verlet and no thermostat, the total energy (black) stays flat while kinetic and potential energy exchange. Switch to Euler and watch it climb; raise the time step towards 0.03 with Verlet and watch the fluctuations grow until the system explodes. Then turn on a thermostat, change the temperature and density, press Restart and switch the plot to g(r)." >}}

Things to try in the lab:

1. **NVE with Verlet at Δt = 0.005.** Total energy is flat to four decimal places; kinetic and potential energy trade places.
2. **Euler.** The total energy rises steadily: the integrator is pumping energy in. The system heats up until it boils.
3. **Verlet with Δt = 0.02–0.03.** Fluctuations grow roughly as $\Delta t^2$ until close collisions are no longer resolved and the energy jumps. The NumPy code below shows the same trend quantitatively.
4. **Langevin thermostat at T\* = 0.4 and density 0.85, then Restart.** The atoms lock into a close-packed (triangular) arrangement, with defects because 100 atoms do not tile a square box perfectly. In the g(r) plot the second peak splits into two, at about $\sqrt3\,\sigma$ and $2\sigma$, the signature of hexagonal order. At T\* = 2 and density 0.3 the system is a dense gas with a single weak peak.

## Choosing the time step

The step must resolve the fastest motion in the system, with about 10 to 20 steps per period. The fastest motions in molecules are bond stretches involving hydrogen: a C–H stretch at about 3000 cm⁻¹ has a period of about 11 fs, so unconstrained all-atom MD uses $\Delta t \approx 0.5$–1 fs. Constraining bonds to hydrogen with SHAKE or LINCS removes these motions and allows 2 fs, the standard in biomolecular simulation; **hydrogen mass repartitioning** (moving mass from heavy atoms to their hydrogens) allows about 4 fs. Coarse-grained models, which have no fast vibrations, use 10–40 fs. Monoatomic Lennard-Jones argon is comfortable at about 5 fs, $0.002$–$0.005\tau$ in reduced units.

The harmonic analysis makes these numbers quantitative. A C–H stretch at 3000 cm⁻¹ has a period of 11.1 fs, so velocity Verlet becomes unstable above $11.1/\pi = 3.5$ fs. Well below that limit, the energy of the bond oscillates with a relative swing of $(\omega\Delta t)^2/4$: 2 % at 0.5 fs, 8 % at 1 fs and 32 % at 2 fs. That swing is local to the fast mode and averages out in the total energy, but a 2 fs step with free C–H bonds sits close enough to the limit that anharmonicity and the transfer of energy between modes make long runs unstable. Constraints remove the problem at its source. **SHAKE** (Jean-Paul Ryckaert, Giovanni Ciccotti and Herman Berendsen, 1977) and **LINCS** (Berk Hess and co-workers, 1997) solve for the forces that keep chosen bond lengths fixed at each step, removing the fastest vibrations from the dynamics altogether.

{{< fig src="timestep.svg" alt="The relative swing in the energy of a C–H bond oscillator under velocity Verlet against time step, rising as a parabola from zero to 100 percent at the stability limit of 3.54 fs, with points marked at 0.5, 1 and 2 fs" caption="The energy of a C–H stretch (period 11.1 fs) integrated with velocity Verlet swings by $(\omega\Delta t)^2/4$: 8 % at 1 fs, 32 % at 2 fs, and 100 % at the stability limit $T/\pi$ = 3.54 fs, beyond which the oscillation grows without bound." >}}

A second strategy treats fast and slow forces differently. In **multiple time stepping**, formalised as the reversible reference system propagator algorithm (r-RESPA) by Mark Tuckerman, Bruce Berne and Glenn Martyna (1992), cheap, rapidly varying forces such as bonds are integrated with a short step, and expensive, slowly varying forces such as long-range electrostatics are evaluated only every second or fourth step. The scheme stays time-reversible and symplectic, but the outer step cannot be lengthened at will: when it approaches a simple fraction of the period of a fast vibration, resonances pump energy into that mode.

## Simulating bulk matter with a few thousand atoms

**Periodic boundary conditions.** In a cube of $10^4$ atoms, about 22 atoms on a side, a quarter of the atoms would sit in the outermost layer. Instead the box is surrounded by infinite copies of itself: an atom leaving through one face re-enters through the opposite one. Each atom interacts with the nearest image of every other atom (the **minimum-image convention**), which is why the box must be more than twice the interaction cut-off. Periodicity suppresses fluctuations longer than the box, and some properties, notably diffusion coefficients, need finite-size corrections.

{{< fig src="pbc.svg" alt="A central square simulation box surrounded by eight faded periodic copies. A dashed cut-off circle around a blue atom reaches into the left neighbour, where a line joins it to the nearest copy of an orange atom; an atom leaving through the top face has its copy entering through the bottom" caption="Periodic boundaries. Each atom interacts with the nearest copy of every other atom, here the orange atom’s image through the left face rather than the copy inside the box. A cut-off shorter than $L/2$ guarantees that no atom sees two copies of the same neighbour." >}}

The diffusion correction is a clear example of why box size matters. A diffusing molecule drags solvent with it, and in a periodic system it also feels the flow set up by its own images. In-Chul Yeh and Gerhard Hummer (2004) showed that this lowers the diffusion coefficient by $\xi k_BT/(6\pi\eta L)$, with $\xi = 2.837$ for a cubic box and $\eta$ the viscosity. For water at 298 K ($\eta = 0.89$ mPa s) in a 3 nm box, the correction is $0.23\times10^{-9}$ m² s⁻¹, 10 % of the experimental value of $2.3\times10^{-9}$ m² s⁻¹, as large as many differences between water models ([the chapter on transport coefficients](../transport-coefficients/) has the details).

**Cut-offs and neighbour lists.** Short-range interactions are truncated at a cut-off $r_c$, typically 1.0–1.2 nm in biomolecular force fields or $2.5\sigma$ for Lennard-Jones. Shifting the potential so that it reaches zero at $r_c$ avoids a jump in energy, and long-range dispersion corrections can be added analytically. Rebuilding a list of neighbours within $r_c$ plus a skin every few steps makes the cost proportional to $N$ instead of $N^2$.

**Electrostatics cannot be cut off.** The Coulomb interaction decays as $1/r$ and its sum over a periodic system converges only conditionally. **Ewald summation** splits it into a short-range part summed in real space and a smooth long-range part summed in reciprocal space; the **particle-mesh Ewald** (PME) method does the reciprocal sum with fast Fourier transforms in $\mathcal O(N\log N)$ time. Every serious biomolecular or electrolyte simulation uses PME.

The idea behind Ewald's split is to screen each point charge with a Gaussian cloud of opposite charge of width $1/\alpha$. The screened charges interact through $\operatorname{erfc}(\alpha r)/r$, which decays fast enough to cut off at about 1 nm; the Gaussian clouds, added back with the opposite sign, form a smooth charge density whose potential converges rapidly in Fourier space. The split parameter $\alpha$ moves work between the two sums without changing the result. In GROMACS the usual PME settings are a real-space cut-off of 1.0–1.2 nm, a Fourier grid spacing of 0.12 nm and fourth-order interpolation, which keep the relative error in the electrostatic energy at the level of $10^{-3}$ at modest cost.

## Temperature and pressure control

Plain MD conserves energy and samples the **microcanonical** (NVE) ensemble. Experiments are usually at constant temperature and pressure. The instantaneous temperature comes from equipartition,

$$
T_{\text{inst}} = \frac{2K}{N_{\text{df}}\,k_B}, \qquad K = \sum_i \tfrac12 m_i v_i^2,
$$

where $N_{\text{df}}$ is the number of degrees of freedom ($3N - 3$ in 3D after removing centre-of-mass motion, $2N - 2$ in the 2D lab). A **thermostat** modifies the dynamics so that the temperature fluctuates correctly around a target.

- **Berendsen** rescales velocities so that $T$ relaxes exponentially to the target with time constant $\tau_T$. It is robust for equilibration but suppresses the natural fluctuations of the kinetic energy, so it does *not* generate the canonical ensemble and should not be used for production runs.
- **Nosé–Hoover** adds a fictitious heat-bath variable with its own equation of motion. It is deterministic and samples the canonical ensemble, though a single thermostat can be non-ergodic for small or stiff systems (Nosé–Hoover chains fix this).
- **Stochastic velocity rescaling** (Bussi, Donadio and Parrinello) is a Berendsen-like scheme with a correctly designed random term. It samples the canonical ensemble and is the usual choice in GROMACS (`v-rescale`).
- **Langevin dynamics** adds friction and a random force to every atom, $m\dot{\mathbf v} = \mathbf F - \gamma m\mathbf v + \sqrt{2\gamma m k_BT}\,\boldsymbol\xi(t)$. It is canonical and very stable, but the friction slows diffusion, so dynamical properties depend on $\gamma$.

The size of the fluctuations a thermostat must preserve follows from the canonical distribution of the kinetic energy, whose relative standard deviation is $\sqrt{2/N_{\text{df}}}$. For 1,000 atoms that is 2.6 %, for 100,000 atoms 0.26 %. Berendsen coupling narrows this distribution, which biases any quantity computed from energy fluctuations, such as the heat capacity, and in long runs it can drain energy from fast modes into slow ones: the "flying ice cube" artefact described by Stephen Harvey, Robert Tan and Thomas Cheatham (1998), in which the centre-of-mass motion of a solute ends up holding much of the kinetic energy. [The chapter on thermostats and barostats](../thermostats-and-barostats/) derives each scheme.

**Barostats** do the same for pressure by letting the box volume (and shape) fluctuate: Parrinello–Rahman and the Martyna–Tobias–Klein (MTK) equations are canonical for production; Berendsen and the stochastic cell-rescaling method are used for equilibration or, in the latter case, also production.

## A typical workflow

1. **Build** the system: structure, topology (force-field parameters), solvent and ions.
2. **Minimise** the energy to remove bad contacts.
3. **Equilibrate at constant volume and temperature** (NVT) for tens to hundreds of picoseconds, often with restraints on the solute.
4. **Equilibrate at constant pressure** (NPT) until the density is stable.
5. **Production**: a long run with canonical thermostat and barostat, saving coordinates every few picoseconds.
6. **Analyse**, checking equilibration and statistical errors ([the lesson on trajectory analysis](../trajectory-analysis/)).

{{< note type="practice" title="From the lab" >}}
Each stage has a test that must pass before the next begins. Minimisation should bring the largest force on any atom below about 1000 kJ mol⁻¹ nm⁻¹; if it stalls far above that, two atoms are overlapping or a topology entry is wrong, and dynamics will crash. In NVT equilibration the temperature should reach the target within a few multiples of the thermostat time constant and then fluctuate by the canonical amount. In NPT the density should plateau, for water near 1.0 g/cm³ with most models, within a few hundred picoseconds; a density still drifting after a nanosecond means the system is not equilibrated, or the barostat is coupled too weakly. Before production with any new force field or MLIP, a short NVE run from an equilibrated state checks that energy is conserved.
{{< /note >}}

How long the production run must be depends on the slowest relaxation that affects the quantity of interest, not on the time step. The error of a time average is $\sigma\sqrt{2\tau/t_{\text{run}}}$, where $\tau$ is the integrated correlation time of the quantity, the same formula as for a Monte Carlo chain ([the Monte Carlo chapter](../monte-carlo/)). The density of liquid water decorrelates in picoseconds, so a few nanoseconds give it to three figures. The population of two side-chain rotamers in a protein may switch on a nanosecond time scale and needs hundreds of nanoseconds; a ligand unbinding with a residence time of seconds cannot be sampled at all by plain MD. Block averaging over the production run, and repeating it from independent starting velocities, are the honest checks.

{{< note type="practice" >}}
For step 1, my browser tool [BoxMaker](/boxmaker/) gives the numbers of molecules and ions for a box at a target molarity, molality, mass fraction or mole fraction, with the rounding error and the matching GROMACS and Packmol commands.
{{< /note >}}

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
dt = 0.005:  drift of E/N = -0.00076,  fluctuation = 0.00022
dt = 0.010:  drift of E/N = -0.00098,  fluctuation = 0.00073
dt = 0.020:  drift of E/N = +0.01938,  fluctuation = 0.00934
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

{{< note type="key" >}}
- MD integrates Newton's equations step by step; time averages over a long trajectory give ensemble averages if the dynamics is ergodic on the time scale simulated.
- Velocity Verlet is time-reversible and symplectic: it conserves a shadow Hamiltonian, so the energy fluctuates by $\mathcal O(\Delta t^2)$ without drifting, while Euler pumps energy in at every step.
- The fastest vibration sets the time step: Verlet is unstable above $T/\pi$, and accuracy needs 10–20 steps per period, hence 1 fs, or 2 fs with bonds to hydrogen constrained.
- Periodic boundaries, cut-offs with neighbour lists, and PME for electrostatics let a few thousand atoms represent bulk matter; finite-size effects such as the Yeh–Hummer correction remain.
- Use canonical thermostats and barostats (Nosé–Hoover chains, stochastic velocity rescaling, Langevin, Parrinello–Rahman, MTK) for production; Berendsen only to equilibrate.
- A short NVE run that conserves energy is the first test of any new potential, MLIP or integrator.
{{< /note >}}

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
- q: "A bond vibrates with a period of 9 fs. Above what time step does velocity Verlet become unstable for this vibration?"
  options: ["About 0.9 fs", "About 2.9 fs", "About 9 fs"]
  answer: 1
  why: "Verlet is stable for $\\omega\\Delta t < 2$, that is $\\Delta t < T/\\pi = 9/3.14 \\approx 2.9$ fs. Accurate dynamics needs a step several times shorter."
- q: "With explicit Euler and 20 steps per period, by what factor does a harmonic oscillator's energy grow in one period?"
  options: ["About 1.1", "About 6.6", "It does not grow"]
  answer: 1
  why: "Each step multiplies the energy by $1 + (\\omega\\Delta t)^2 = 1.099$ for $\\omega\\Delta t = 2\\pi/20$, and $1.099^{20} \\approx 6.6$."
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
17. J.-P. Ryckaert, G. Ciccotti and H. J. C. Berendsen, “Numerical integration of the cartesian equations of motion of a system with constraints: molecular dynamics of n-alkanes,” *Journal of Computational Physics* **23**, 327–341 (1977).
18. M. Tuckerman, B. J. Berne and G. J. Martyna, “Reversible multiple time scale molecular dynamics,” *Journal of Chemical Physics* **97**, 1990–2001 (1992).
19. I.-C. Yeh and G. Hummer, “System-size dependence of diffusion coefficients and viscosities from molecular dynamics simulations with periodic boundary conditions,” *Journal of Physical Chemistry B* **108**, 15873–15879 (2004).
20. S. C. Harvey, R. K.-Z. Tan and T. E. Cheatham III, “The flying ice cube: velocity rescaling in molecular dynamics leads to violation of energy equipartition,” *Journal of Computational Chemistry* **19**, 726–740 (1998).
21. E. Hairer, C. Lubich and G. Wanner, “Geometric numerical integration illustrated by the Störmer–Verlet method,” *Acta Numerica* **12**, 399–450 (2003).
22. D. E. Shaw et al., “Atomic-level characterization of the structural dynamics of proteins,” *Science* **330**, 341–346 (2010).

</div>
