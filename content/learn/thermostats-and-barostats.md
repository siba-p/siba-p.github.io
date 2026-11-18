---
title: "Thermostats and barostats"
description: "Controlling temperature and pressure in molecular dynamics: why NVE dynamics is not enough, the kinetic temperature, velocity rescaling and the Berendsen weak-coupling scheme and why they fail to sample the canonical ensemble, the Andersen and Langevin stochastic thermostats, the Nosé–Hoover extended system and its chains, stochastic velocity rescaling, and barostats from Berendsen and Andersen to Parrinello–Rahman, MTK and stochastic cell rescaling."
hook: "The flying ice cube is a real simulation artefact: a biomolecule freezes internally while flying through its box, its kinetic energy drained into overall motion. Its cause was velocity rescaling, a thermostat that gets the average temperature right but the ensemble wrong."
objectives:
  - "Explain why a thermostat must reproduce kinetic-energy fluctuations, not only their mean"
  - "Diagnose the artefacts of velocity rescaling and Berendsen coupling"
  - "Compare the Andersen, Langevin, Nosé–Hoover and stochastic velocity-rescaling thermostats"
  - "Choose a barostat that samples correct volume fluctuations in production runs"
  - "Set coupling so that thermostats leave dynamics intact when measuring transport"
cover: "cover.svg"
milestones:
  - year: 1980
    text: "Hans Andersen introduces stochastic-collision thermostats and a dynamical-volume barostat"
  - year: 1981
    text: "Parrinello and Rahman let the whole simulation cell change shape"
  - year: 1984
    text: "Shuichi Nosé derives deterministic canonical dynamics from an extended system"
  - year: 2007
    text: "Bussi, Donadio and Parrinello publish stochastic velocity rescaling"
track: dyn
weight: 3
level: Core
prereqs: ["molecular-dynamics", "fluctuations-and-response"]
lab: "Run a small Lennard-Jones fluid under seven thermostats and compare their kinetic-energy distributions with the canonical one"
---

## Why control temperature

Newton's equations conserve energy, so plain molecular dynamics samples the **microcanonical** (NVE) ensemble: constant number of particles, volume and energy. Experiments are almost always done at constant temperature, and usually at constant pressure. Simulations also need temperature control for practical reasons: to equilibrate a system prepared far from equilibrium, to remove the heat produced by a driving force (as in shear or current flow), and to compensate for the slow energy drift caused by numerical integration errors over long runs.

A **thermostat** modifies the equations of motion so that the system samples the canonical (NVT) ensemble at a chosen temperature $T_0$. The temperature it controls is the **kinetic temperature**, defined through equipartition ([the chapter on Boltzmann and Maxwell](../boltzmann-and-maxwell/)) as

$$
T = \frac{2K}{N_{\text{df}}\,k_B}, \qquad K = \sum_i \tfrac12 m_i v_i^2,
$$

where $N_{\text{df}}$ is the number of degrees of freedom ($3N$ minus constraints and conserved momenta). In the canonical ensemble the kinetic energy is not constant: it fluctuates, with a gamma distribution whose relative width is $\sqrt{2/N_{\text{df}}}$, about 3 % for a thousand atoms. A thermostat that holds $K$ exactly fixed, or suppresses its fluctuations, does not produce the canonical ensemble, and every quantity derived from fluctuations, such as the heat capacity ([the chapter on fluctuations](../fluctuations-and-response/)), will be wrong. A good thermostat must get the whole distribution right, not just the average, and ideally disturb the dynamics as little as possible.

### Where the width comes from

The canonical distribution factorises into a configurational part and a kinetic part, and the kinetic part is Gaussian in every momentum component: $p_{i\alpha}$ has mean zero and variance $m_ik_BT_0$. The kinetic energy is therefore a sum of $N_{\text{df}}$ squared Gaussian variables, each contributing on average $\tfrac12 k_BT_0$, and such a sum follows a gamma (scaled chi-squared) distribution,

$$
P(K) \propto K^{N_{\text{df}}/2 - 1}\,e^{-K/k_BT_0}, \qquad \langle K\rangle = \tfrac12N_{\text{df}}k_BT_0, \qquad \frac{\sigma_K}{\langle K\rangle} = \sqrt{\frac{2}{N_{\text{df}}}} .
$$

Because the kinetic temperature is proportional to $K$, it has the same relative width. The consequences are concrete. A 100-atom cluster thermostatted at 300 K should show an instantaneous temperature that wanders by ±24 K; a solvated protein of 30,000 atoms, ±1.4 K; a million-atom membrane patch, ±0.24 K.

{{< fig src="fluctuations.svg" alt="A straight falling line on log–log axes of the standard deviation of the kinetic temperature at 300 K against the number of atoms, with points marked at 100, 1,000, 30,000 and one million atoms" caption="The canonical standard deviation of the kinetic temperature at 300 K, assuming $N_{\text{df}} \approx 3N$. Constraints reduce $N_{\text{df}}$ (a rigid water molecule has 6 degrees of freedom instead of 9) and widen the distribution slightly." >}}

{{< note type="warn" title="Myth" >}}
**Myth:** in an NVT simulation the temperature should stay at the target value, so a trace that wanders by several kelvin means the thermostat is failing. **Reality:** for a 1,000-atom system at 300 K the canonical distribution has a standard deviation of 7.7 K, and a correct thermostat must reproduce it. A trace that stays within a fraction of a kelvin of the target in a small system is the warning sign: it indicates velocity rescaling or very tight Berendsen coupling. What should match $T_0$ is the time average, within its statistical error.
{{< /note >}}

Thermostats differ in where they act on the system: on all velocities at once, on single atoms at random times, on every atom continuously, or through an additional dynamical variable. That choice decides both whether they sample the canonical ensemble and how much they disturb the dynamics.

{{< fig src="mechanisms.svg" alt="Four small boxes of atoms with velocity arrows: in the first all arrows are shortened by the same factor; in the second one atom receives a new random velocity from a bath collision; in the third every atom has a friction arrow and a random kick; in the fourth a gauge labelled xi and Q stands for one extra variable acting on all atoms" caption="Four ways to couple a system to a heat bath. Rescaling and Nosé–Hoover act globally through one number; Andersen and Langevin act on individual atoms and therefore randomise momenta locally, which is why they perturb diffusion more." >}}

## Rescaling velocities, and why it is not enough

The simplest idea is to multiply all velocities at every step by the factor that makes the kinetic temperature exactly $T_0$, $\lambda = \sqrt{T_0/T}$. This **velocity rescaling** (Leslie Woodcock, 1971) holds the temperature perfectly constant and therefore removes all its fluctuations. The **Berendsen** thermostat (Herman Berendsen and colleagues, 1984) softens it by relaxing the temperature exponentially towards $T_0$ with a coupling time $\tau$:

{{< eq title="The Berendsen weak-coupling thermostat" say="Nudge the velocities each step so that the temperature relaxes towards its target with time constant τ." >}}
$$ \frac{\mathrm dT}{\mathrm dt} = \frac{T_0 - T}{\tau}, \qquad \lambda = \sqrt{1 + \frac{\Delta t}{\tau}\left(\frac{T_0}{T} - 1\right)} $$
- excellent for driving a system quickly to a target temperature during equilibration
- it does **not** sample the canonical ensemble: kinetic-energy fluctuations are suppressed
{{< /eq >}}

Berendsen coupling was for decades the most popular thermostat because it is stable and gentle, but its incorrect ensemble has consequences. Beyond wrong fluctuations, it can transfer energy systematically between degrees of freedom: in simulations of solvated biomolecules, kinetic energy drained from fast internal motions into overall translation and rotation, so that the molecule "froze" while flying through the box, an artefact named the **flying ice cube** by Stephen Harvey, Robert Tan and Thomas Cheatham (1998). Berendsen coupling is now recommended only for equilibration.

The mechanism was clarified twenty years later. Efrem Braun, Seyed Mohamad Moosavi and Berend Smit (2018) showed that the drift of energy into the slowest modes is a consequence of the balance condition being violated: rescaling schemes that do not generate the canonical distribution push the system towards a stationary state in which equipartition fails, with the zero-frequency modes (overall translation and rotation) gaining energy at the expense of fast vibrations. They found the effect with Berendsen coupling as well as with simple rescaling, and it does not arise with thermostats that sample the canonical ensemble, such as stochastic velocity rescaling. Removing the centre-of-mass motion every step hides the most visible symptom but does not restore the correct distribution of energy among internal modes.

{{< note type="practice" title="From the lab" >}}
The GROMACS input for older protein simulations often contains `tcoupl = berendsen` with `tc-grps = Protein Non-Protein`. The separate groups were introduced because, with weak coupling to a single group, heat generated in the solvent (for example by cut-off artefacts in the electrostatics) was not shared evenly, leaving the solvent hotter than the solute: the "hot solvent, cold solute" problem. With `tcoupl = v-rescale` and `tau_t = 0.1` ps the split is harmless but rarely needed. The opposite mistake is common: coupling very small groups, such as the ions alone, which gives a group temperature with large fluctuations and poor control; ions belong with the solvent group.
{{< /note >}}

## Stochastic thermostats: Andersen and Langevin

A thermostat that samples the canonical ensemble exactly is obtained by mimicking a heat bath with random collisions. In the **Andersen** thermostat (Hans Andersen, 1980), each particle is occasionally, with probability $\nu\Delta t$ per step, given a new velocity drawn from the Maxwell–Boltzmann distribution at $T_0$, as if it had collided with a bath particle. Between collisions the dynamics is Newtonian. The method samples the canonical ensemble exactly, but the collisions randomise momentum and disturb dynamical properties such as diffusion.

The **Langevin** thermostat adds a friction force and a random force to every particle:

{{< eq title="Langevin dynamics" say="Friction removes energy, random kicks add it back, and their balance, fixed by the temperature, produces exactly the canonical ensemble." >}}
$$ m\ddot{\mathbf r}_i = \mathbf F_i - \textcolor{#845ef7}{\gamma}\, m\,\dot{\mathbf r}_i + \textcolor{#e64980}{\mathbf R_i}(t), \qquad \big\langle R_{i\alpha}(t)\,R_{j\beta}(t')\big\rangle = 2\textcolor{#845ef7}{\gamma}\, m\,k_BT_0\,\delta_{ij}\delta_{\alpha\beta}\,\delta(t - t') $$
- the noise strength is tied to the friction by the fluctuation–dissipation theorem
- integrated accurately and efficiently by splitting schemes such as BAOAB (Benedict Leimkuhler and Charles Matthews, 2013)
{{< /eq >}}

Langevin dynamics is the physical model of a particle in a solvent, the equation Paul Langevin wrote down in 1908 for Brownian motion, and as a thermostat it is robust, simple and exactly canonical. Its friction slows diffusion and other dynamics, increasingly so as $\gamma$ grows, so weak coupling (a friction time $1/\gamma$ of about a picosecond or longer) is used when dynamics matters.

{{< note type="practice" title="Back of the envelope" >}}
How much does Langevin friction slow a water molecule? Its intrinsic friction coefficient follows from the measured diffusion coefficient, $\zeta = k_BT/D = (4.1\times10^{-21}\text{ J})/(2.3\times10^{-9}\text{ m}^2\text{/s}) = 1.8\times10^{-12}$ kg/s. A Langevin thermostat adds $m\gamma$; for a water molecule ($m = 3.0\times10^{-26}$ kg) and $\gamma = 1$ ps⁻¹ that is $3.0\times10^{-14}$ kg/s, 1.7 % of the intrinsic friction. If the two frictions simply add, $D$ falls by about 1.6 %. At $\gamma$ = 10 ps⁻¹ the estimate is 14 %, and at $\gamma$ = 50 ps⁻¹, a value sometimes used in implicit-solvent or coarse-grained runs, 45 %. The additive-friction picture is approximate, but the scaling is right: the slowdown grows in proportion to $\gamma$ while $\gamma$ is small.
{{< /note >}}

Joseph Basconi and Michael Shirts (2013) compared thermostats systematically on transport properties and found the same pattern: global thermostats with typical coupling times leave diffusion coefficients and viscosities essentially unchanged, while Andersen and Langevin thermostats with strong coupling change them measurably. Langevin dynamics has compensating advantages. It is the natural thermostat for implicit-solvent and coarse-grained models, where $\gamma$ stands in for the missing solvent; it is robust for systems that are far from equilibrium or that contain stiff, weakly coupled modes; and, because each atom is coupled to its own bath, it thermostats a heterogeneous system (a metal slab with an adsorbed liquid, a crystal with a hot spot) locally rather than through a single global temperature.

## The Nosé–Hoover extended system

A deterministic route to the canonical ensemble was found by Shuichi Nosé in 1984 and reformulated by William Hoover in 1985. The system is coupled to an extra dynamical variable, a friction coefficient $\xi$ with a fictitious mass $Q$, that speeds up or slows down all particles depending on whether the system is too cold or too hot:

{{< eq title="The Nosé–Hoover equations" say="A single extra variable acts as a variable friction: it grows when the system is too hot and becomes negative when it is too cold." >}}
$$ \dot{\mathbf r}_i = \frac{\mathbf p_i}{m_i}, \qquad \dot{\mathbf p}_i = \mathbf F_i - \textcolor{#845ef7}{\xi}\,\mathbf p_i, \qquad \dot{\textcolor{#845ef7}{\xi}} = \frac{1}{Q}\Big(\sum_i \frac{p_i^2}{m_i} - N_{\text{df}}\,k_BT_0\Big) $$
- the extended system conserves a modified energy, which serves as a check of the integration
- $Q$ sets the timescale of temperature oscillations
{{< /eq >}}

Nosé–Hoover dynamics is deterministic, time-reversible and samples the canonical ensemble **if it is ergodic**. For a single harmonic oscillator, or for stiff, weakly coupled systems, it is not: the trajectory stays on a subset of phase space and the distribution is wrong. Glenn Martyna, Michael Klein and Mark Tuckerman (1992) fixed this with **Nosé–Hoover chains**, in which the thermostat variable is itself thermostatted by another, and so on; chains of a few thermostats are ergodic in practice and are a standard choice in many codes.

Two details explain how the method works in practice. The extended system conserves the quantity $H' = H + \tfrac12Q\xi^2 + N_{\text{df}}k_BT_0\,\eta$, where $\dot\eta = \xi$; its drift is a direct check of the integration, as the total energy is in NVE. And $\xi$ behaves like an integral controller: it accumulates the excess of kinetic energy over its target, so a heavy $Q$ responds slowly and lets the temperature oscillate with a long period, while a light $Q$ responds fast and couples the thermostat strongly to the fastest vibrations of the system. Codes usually ask for the coupling as an oscillation period rather than as $Q$ itself.

{{< note type="try" title="Pause and predict" >}}
Take a single one-dimensional harmonic oscillator, with $m = k = k_BT_0 = Q = 1$, start it at $x = 1$, $p = 0$, and attach one Nosé–Hoover thermostat. In the canonical ensemble its phase-space density is a Gaussian centred on the origin. After a long run, what does the trajectory's cloud of points look like? Then attach a chain of three thermostats instead.
{{< /note >}}

{{< fig src="nh-oscillator.svg" alt="Left: phase-space points of an oscillator under one Nosé–Hoover thermostat forming a ring with an empty centre. Middle: under a chain of three thermostats the points form a filled round cloud. Right: the distribution of position, double-peaked for the single thermostat and Gaussian for the chain" caption="A harmonic oscillator integrated to $t$ = 6,000 (about 950 periods). With one Nosé–Hoover thermostat the trajectory never comes closer to the origin than its starting radius, and the position distribution is bimodal, with $\langle x^2\rangle$ = 0.79 instead of 1. A chain of three fills the Gaussian: $\langle x^2\rangle$ = 1.04 and $\langle p^2\rangle$ = 1.01." >}}

The oscillator is the worst case, because it has no internal chaos to help the thermostat mix. Real systems with similar behaviour include crystals at low temperature, where phonons are nearly harmonic and weakly coupled, and small rigid molecules in the gas phase. In a dense liquid the anharmonic interactions mix energy among modes so quickly that a single Nosé–Hoover thermostat is usually adequate, as the interactive figure above shows for the Lennard-Jones fluid. When in doubt, chains of length 3 to 10 cost almost nothing; GROMACS uses `nh-chain-length = 10` by default with its velocity Verlet integrators.

## Stochastic velocity rescaling

In 2007 Giovanni Bussi, Davide Donadio and Michele Parrinello combined the simplicity of rescaling with exact canonical sampling in the **canonical sampling through velocity rescaling** (CSVR) thermostat. Instead of rescaling the kinetic energy to its target value, they rescale it to a value drawn stochastically, so that the kinetic energy follows exactly the canonical distribution:

{{< eq title="Stochastic velocity rescaling (Bussi–Donadio–Parrinello)" say="Relax the kinetic energy towards its target like Berendsen, but add exactly the right noise so that it fluctuates canonically." >}}
$$ \mathrm dK = \big(K_0 - K\big)\frac{\mathrm dt}{\tau} + 2\sqrt{\frac{K K_0}{N_{\text{df}}}}\,\frac{\mathrm dW}{\sqrt\tau}, \qquad K_0 = \tfrac12 N_{\text{df}}\,k_BT_0 $$
- $\mathrm dW$: a Wiener noise increment; the first term is Berendsen's relaxation, the second the correction that restores fluctuations
- all velocities are rescaled by a single factor, so the dynamics is disturbed only globally
{{< /eq >}}

CSVR samples the canonical ensemble for any coupling time, is as stable as Berendsen, and perturbs dynamical properties very little because it acts only on the total kinetic energy. It is the usual choice in GROMACS (`tcoupl = v-rescale`) and widely used elsewhere.

The two limits of the coupling time make the construction transparent. As $\tau \to \infty$ the noise and the relaxation both vanish and CSVR becomes plain NVE dynamics. As $\tau \to 0$ the kinetic energy is redrawn from the canonical gamma distribution at every step, which is still exact but disturbs the dynamics more. In between, $\tau$ only sets how quickly the kinetic energy forgets its value; it never changes the distribution that is sampled. Bussi and co-workers also defined an effective energy, the total energy minus the cumulative energy exchanged with the bath, which should be conserved up to integration error and is a useful diagnostic for the time step. A coupling time of 0.1 ps is a typical default for biomolecular systems; for transport calculations values of 1 ps or more make the perturbation of the dynamics negligible.

The figure runs a small two-dimensional Lennard-Jones fluid under each thermostat and histograms the kinetic energy against the canonical gamma distribution.

{{< widget name="thermostats" title="Seven thermostats on the same fluid" caption="Left: the fluid, coloured by speed. Right, top: the instantaneous kinetic temperature. Right, bottom: the distribution of the kinetic energy against the canonical distribution (rose). The readout compares the relative fluctuation with the canonical value √(2/N_df). Try each thermostat and vary the coupling time." >}}

Velocity rescaling collapses the distribution to a spike. Berendsen produces a distribution that is too narrow, increasingly so for short coupling times. NVE dynamics also gives a narrower distribution, because kinetic energy can only be exchanged with the potential energy of a small isolated system. Andersen, Langevin, Nosé–Hoover (this fluid is chaotic enough to be ergodic) and CSVR all reproduce the canonical fluctuations.

## Barostats

Controlling pressure requires letting the volume, and possibly the shape, of the simulation box change. The instantaneous pressure is computed from the virial, $P = \frac{1}{dV}\left(2K + \sum_i \mathbf r_i\cdot\mathbf F_i\right)$ in $d$ dimensions (with the pairwise form used for periodic systems), and in the isothermal–isobaric ensemble the volume fluctuates with a variance set by the compressibility, as [the chapter on fluctuations](../fluctuations-and-response/) explained.

The volume fluctuations are small but not negligible, $\sigma_V/V = \sqrt{k_BT\kappa_T/V}$. For a 3 nm cube of water at 300 K, with $\kappa_T = 4.5\times10^{-10}$ Pa⁻¹, this gives 0.8 %, or ±0.22 nm³ around 27 nm³. The instantaneous pressure fluctuates far more in relative terms: in the same box it varies by a few hundred bar from frame to frame, because the virial is a sum of large positive and negative contributions that nearly cancel.

{{< note type="warn" title="Myth" >}}
**Myth:** a simulation at 1 bar whose pressure reads 150 bar in one frame, or whose average after 1 ns is 20 ± 30 bar, has a broken barostat. **Reality:** in a box of a few thousand atoms the instantaneous pressure has a standard deviation of hundreds of bar, and its average converges slowly. What the barostat controls is the average, and the meaningful checks are the average density, which converges far faster than the pressure, and the volume distribution, whose width should match $\sqrt{k_BT\kappa_TV}$.
{{< /note >}}

The **Berendsen barostat** scales coordinates and box to relax the pressure exponentially towards its target; like its thermostat, it equilibrates well but does not sample the correct ensemble, suppressing volume fluctuations. **Andersen's barostat** (1980) treats the volume as a dynamical variable with a fictitious mass, driven by the difference between internal and external pressure, and samples the NPH ensemble correctly. **Parrinello–Rahman** (Michele Parrinello and Aneesur Rahman, 1981) extends this to the full cell matrix, allowing the box shape to change, which is essential for studying solid–solid phase transitions and anisotropic materials; their simulations of structural transformations in crystals under stress were the first of their kind. **Martyna–Tobias–Klein** (MTK, 1994) equations combine extended-system thermostats and barostats in a form that samples the NPT ensemble exactly. **Stochastic cell rescaling** (Mattia Bernetti and Giovanni Bussi, 2020) applies the stochastic idea of CSVR to the volume, giving a first-order barostat that is robust like Berendsen but samples correct volume fluctuations; it is available in GROMACS as `pcoupl = c-rescale`. Monte Carlo volume moves, as in [the chapter on Monte Carlo](../monte-carlo/), are another exact alternative.

How the box is allowed to deform matters as much as which algorithm drives it. Isotropic coupling scales all three edges together and suits liquids and solutions. Semi-isotropic coupling treats the membrane plane and the normal separately, so a lipid bilayer can adjust its area per lipid independently of its thickness; it is the standard choice for membrane simulations, sometimes combined with an imposed surface tension. Fully anisotropic coupling, with the cell matrix $h = (\mathbf a, \mathbf b, \mathbf c)$ as the dynamical variable, lets a crystal shear and change its lattice angles, which is what a pressure-induced phase transition, the breathing of a flexible metal–organic framework, or the thermal expansion of a non-cubic crystal requires.

{{< fig src="cells.svg" alt="Three box diagrams: a square box growing uniformly, a box containing a lipid bilayer that stretches sideways while shrinking vertically, and a square cell sheared and stretched into a parallelogram defined by vectors a and b" caption="Three ways a barostat can deform the box. Isotropic coupling has one degree of freedom, semi-isotropic two, and the full Parrinello–Rahman cell matrix six independent components once rotations are removed." >}}

{{< note type="practice" title="From the lab" >}}
A typical GROMACS protocol for a solvated protein runs energy minimisation, then 100 ps of NVT with `tcoupl = v-rescale` (`tau_t = 0.1` ps) and position restraints on heavy atoms, then 100 ps to 1 ns of NPT with `pcoupl = c-rescale` (`tau_p = 2` ps, `compressibility = 4.5e-5` bar⁻¹, `ref_p = 1.0` bar), and finally production with the same thermostat and either C-rescale or Parrinello–Rahman. The order matters: Parrinello–Rahman started from a box far from its equilibrium density produces large, slowly damped oscillations of the volume and can crash the run, which is why a first-order barostat (Berendsen or C-rescale) is used to reach the right density first. For a crystal, the equivalent step is to equilibrate the lattice parameters with anisotropic coupling and then check that the average cell matches experiment before any property is measured.
{{< /note >}}

Constant-pressure simulations also give thermodynamic quantities directly. The density of a liquid at several temperatures gives its thermal expansion coefficient, $\alpha_P = (\partial\ln V/\partial T)_P$, and the enthalpy fluctuations give the heat capacity at constant pressure, provided both the thermostat and the barostat sample the isothermal–isobaric ensemble correctly; with Berendsen coupling the averages are usually acceptable but the fluctuation formulas are not.

## Practical recommendations

For equilibration from a poor starting structure, Berendsen thermostats and barostats (or stochastic cell rescaling) are robust and quick. For production runs in which ensemble properties matter, use a thermostat that samples the canonical ensemble: CSVR, Langevin, or Nosé–Hoover chains; and a barostat that samples the correct volume distribution: Parrinello–Rahman, MTK or stochastic cell rescaling. Coupling times of 0.1–1 ps for thermostats and 1–5 ps for barostats are typical. When transport properties such as diffusion or viscosity are computed, use weak coupling or a global thermostat (CSVR, Nosé–Hoover), or run the measurement in NVE after equilibrating, because local stochastic thermostats such as Langevin or Andersen with strong coupling alter the dynamics being measured. And for systems with large, stiff, weakly coupled degrees of freedom, such as a solid at low temperature, check ergodicity: a single Nosé–Hoover thermostat may fail where chains or stochastic thermostats succeed.

{{< note type="key" >}}
- NVE dynamics samples the microcanonical ensemble; thermostats target the canonical distribution, whose kinetic energy fluctuates with relative width $\sqrt{2/N_{\text{df}}}$.
- Velocity rescaling and Berendsen suppress fluctuations and can cause artefacts (flying ice cube); use them only for equilibration.
- Andersen and Langevin thermostats are exactly canonical but perturb dynamics; Nosé–Hoover is deterministic and canonical if ergodic, and chains restore ergodicity.
- Stochastic velocity rescaling (CSVR) adds the right noise to Berendsen relaxation: canonical, stable and gentle.
- Barostats: Berendsen (equilibration), Andersen and Parrinello–Rahman (volume and cell as dynamical variables), MTK (exact NPT), stochastic cell rescaling and MC volume moves.
- A single Nosé–Hoover thermostat fails for nearly harmonic systems (the oscillator leaves a hole in phase space); chains of three or more fix it at negligible cost.
- Langevin friction slows diffusion roughly in proportion to $\gamma$; use global thermostats or weak coupling for transport.
- Choose the box deformation to match the system: isotropic for liquids, semi-isotropic for membranes, fully anisotropic for crystals.
{{< /note >}}

{{< quiz >}}
- q: "A 500-atom simulation with a Berendsen thermostat gives a heat capacity far below experiment. A likely reason is…"
  options: ["The force field", "Berendsen suppresses kinetic-energy fluctuations, so fluctuation-based properties are wrong", "The time step"]
  answer: 1
  why: "C_V from energy fluctuations requires the canonical distribution."
- q: "Why can a single Nosé–Hoover thermostat fail for a harmonic crystal at low temperature?"
  options: ["It is stochastic", "The dynamics may not be ergodic, so the extended system does not explore the canonical distribution", "It cannot conserve energy"]
  answer: 1
  why: "Nosé–Hoover chains or stochastic thermostats fix this."
- q: "Which barostat lets the shape of the simulation box change, as needed for a solid–solid phase transition?"
  options: ["Berendsen isotropic", "Parrinello–Rahman", "Andersen thermostat"]
  answer: 1
  why: "Parrinello–Rahman treats the full cell matrix as dynamical."
- q: "What does the noise term in CSVR achieve compared with Berendsen?"
  options: ["Faster equilibration", "It restores the correct canonical fluctuations of the kinetic energy", "It removes friction"]
  answer: 1
  why: "CSVR is Berendsen relaxation plus exactly the right stochastic term."
- q: "A 1,000-atom fluid is thermostatted at 300 K. Which trace of the instantaneous temperature indicates a correct canonical thermostat?"
  options: ["Constant at 300.0 ± 0.1 K", "Fluctuating with a standard deviation of about 8 K around 300 K", "Fluctuating by about 30 K"]
  answer: 1
  why: "$\\sigma_T = T_0\\sqrt{2/N_{\\text{df}}}$ = 300 × √(2/3000) ≈ 7.7 K. A flat trace indicates velocity rescaling or very tight Berendsen coupling."
- q: "Which barostat coupling is standard for a lipid bilayer?"
  options: ["Isotropic", "Semi-isotropic: the membrane plane and the normal are scaled independently", "None: membranes must be run at constant volume"]
  answer: 1
  why: "Semi-isotropic coupling lets the area per lipid and the bilayer thickness relax independently."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. L. V. Woodcock, "Isothermal molecular dynamics calculations for liquid salts", *Chemical Physics Letters* **10**, 257–261 (1971).
2. H. J. C. Berendsen, J. P. M. Postma, W. F. van Gunsteren, A. DiNola and J. R. Haak, "Molecular dynamics with coupling to an external bath", *Journal of Chemical Physics* **81**, 3684–3690 (1984).
3. S. C. Harvey, R. K.-Z. Tan and T. E. Cheatham III, "The flying ice cube: velocity rescaling in molecular dynamics leads to violation of energy equipartition", *Journal of Computational Chemistry* **19**, 726–740 (1998).
4. H. C. Andersen, "Molecular dynamics simulations at constant pressure and/or temperature", *Journal of Chemical Physics* **72**, 2384–2393 (1980).
5. S. Nosé, "A unified formulation of the constant temperature molecular dynamics methods", *Journal of Chemical Physics* **81**, 511–519 (1984).
6. W. G. Hoover, "Canonical dynamics: equilibrium phase-space distributions", *Physical Review A* **31**, 1695–1697 (1985).
7. G. J. Martyna, M. L. Klein and M. Tuckerman, "Nosé–Hoover chains: the canonical ensemble via continuous dynamics", *Journal of Chemical Physics* **97**, 2635–2643 (1992).
8. G. Bussi, D. Donadio and M. Parrinello, "Canonical sampling through velocity rescaling", *Journal of Chemical Physics* **126**, 014101 (2007).
9. B. Leimkuhler and C. Matthews, "Rational construction of stochastic numerical methods for molecular sampling", *Applied Mathematics Research eXpress* **2013**, 34–56 (2013).
10. M. Parrinello and A. Rahman, "Polymorphic transitions in single crystals: a new molecular dynamics method", *Journal of Applied Physics* **52**, 7182–7190 (1981).
11. G. J. Martyna, D. J. Tobias and M. L. Klein, "Constant pressure molecular dynamics algorithms", *Journal of Chemical Physics* **101**, 4177–4189 (1994).
12. M. Bernetti and G. Bussi, "Pressure control using stochastic cell rescaling", *Journal of Chemical Physics* **153**, 114107 (2020).
13. M. E. Tuckerman, *Statistical Mechanics: Theory and Molecular Simulation*, 2nd ed., Oxford University Press (2023), chapters 4–5.
14. E. Braun, S. M. Moosavi and B. Smit, "Anomalous effects of velocity rescaling algorithms: the flying ice cube effect revisited", *Journal of Chemical Theory and Computation* **14**, 5262–5272 (2018).
15. J. E. Basconi and M. R. Shirts, "Effects of temperature control algorithms on transport properties and kinetics in molecular dynamics simulations", *Journal of Chemical Theory and Computation* **9**, 2887–2899 (2013).

</div>
