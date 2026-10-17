---
title: "Thermostats and barostats"
description: "Controlling temperature and pressure in molecular dynamics: why NVE dynamics is not enough, the kinetic temperature, velocity rescaling and the Berendsen weak-coupling scheme and why they fail to sample the canonical ensemble, the Andersen and Langevin stochastic thermostats, the Nosé–Hoover extended system and its chains, stochastic velocity rescaling, and barostats from Berendsen and Andersen to Parrinello–Rahman, MTK and stochastic cell rescaling."
track: dyn
weight: 3
level: Core
prereqs: ["molecular-dynamics", "fluctuations-and-response"]
lab: "Run a small Lennard-Jones fluid under seven thermostats and compare their kinetic-energy distributions with the canonical one"
---

## Why control temperature

Newton's equations conserve energy, so plain molecular dynamics samples the **microcanonical** (NVE) ensemble: constant number of particles, volume and energy. Experiments are almost always done at constant temperature, and usually at constant pressure. Simulations also need temperature control for practical reasons: to equilibrate a system prepared far from equilibrium, to remove the heat produced by a driving force (as in shear or current flow), and to compensate for the slow energy drift caused by numerical integration errors over long runs.

A **thermostat** modifies the equations of motion so that the system samples the canonical (NVT) ensemble at a chosen temperature $T_0$. The temperature it controls is the **kinetic temperature**, defined through equipartition ([the topic on Boltzmann and Maxwell](../boltzmann-and-maxwell/)) as

$$
T = \frac{2K}{N_{\text{df}}\,k_B}, \qquad K = \sum_i \tfrac12 m_i v_i^2,
$$

where $N_{\text{df}}$ is the number of degrees of freedom ($3N$ minus constraints and conserved momenta). In the canonical ensemble the kinetic energy is not constant: it fluctuates, with a gamma distribution whose relative width is $\sqrt{2/N_{\text{df}}}$, about 3 % for a thousand atoms. A thermostat that holds $K$ exactly fixed, or suppresses its fluctuations, does not produce the canonical ensemble, and every quantity derived from fluctuations, such as the heat capacity ([the topic on fluctuations](../fluctuations-and-response/)), will be wrong. A good thermostat must get the whole distribution right, not just the average, and ideally disturb the dynamics as little as possible.

## Rescaling velocities, and why it is not enough

The simplest idea is to multiply all velocities at every step by the factor that makes the kinetic temperature exactly $T_0$, $\lambda = \sqrt{T_0/T}$. This **velocity rescaling** (Leslie Woodcock, 1971) holds the temperature perfectly constant and therefore removes all its fluctuations. The **Berendsen** thermostat (Herman Berendsen and colleagues, 1984) softens it by relaxing the temperature exponentially towards $T_0$ with a coupling time $\tau$:

{{< eq title="The Berendsen weak-coupling thermostat" say="Nudge the velocities each step so that the temperature relaxes towards its target with time constant τ." >}}
$$ \frac{\mathrm dT}{\mathrm dt} = \frac{T_0 - T}{\tau}, \qquad \lambda = \sqrt{1 + \frac{\Delta t}{\tau}\left(\frac{T_0}{T} - 1\right)} $$
- excellent for driving a system quickly to a target temperature during equilibration
- it does **not** sample the canonical ensemble: kinetic-energy fluctuations are suppressed
{{< /eq >}}

Berendsen coupling was for decades the most popular thermostat because it is stable and gentle, but its incorrect ensemble has consequences. Beyond wrong fluctuations, it can transfer energy systematically between degrees of freedom: in simulations of solvated biomolecules, kinetic energy drained from fast internal motions into overall translation and rotation, so that the molecule "froze" while flying through the box, an artefact named the **flying ice cube** by Stephen Harvey, Robert Tan and Thomas Cheatham (1998). Berendsen coupling is now recommended only for equilibration.

## Stochastic thermostats: Andersen and Langevin

A thermostat that samples the canonical ensemble exactly is obtained by mimicking a heat bath with random collisions. In the **Andersen** thermostat (Hans Andersen, 1980), each particle is occasionally, with probability $\nu\Delta t$ per step, given a new velocity drawn from the Maxwell–Boltzmann distribution at $T_0$, as if it had collided with a bath particle. Between collisions the dynamics is Newtonian. The method samples the canonical ensemble exactly, but the collisions randomise momentum and disturb dynamical properties such as diffusion.

The **Langevin** thermostat adds a friction force and a random force to every particle:

{{< eq title="Langevin dynamics" say="Friction removes energy, random kicks add it back, and their balance, fixed by the temperature, produces exactly the canonical ensemble." >}}
$$ m\ddot{\mathbf r}_i = \mathbf F_i - \textcolor{#845ef7}{\gamma}\, m\,\dot{\mathbf r}_i + \textcolor{#e64980}{\mathbf R_i}(t), \qquad \big\langle R_{i\alpha}(t)\,R_{j\beta}(t')\big\rangle = 2\textcolor{#845ef7}{\gamma}\, m\,k_BT_0\,\delta_{ij}\delta_{\alpha\beta}\,\delta(t - t') $$
- the noise strength is tied to the friction by the fluctuation–dissipation theorem
- integrated accurately and efficiently by splitting schemes such as BAOAB (Benedict Leimkuhler and Charles Matthews, 2013)
{{< /eq >}}

Langevin dynamics is the physical model of a particle in a solvent, the equation Paul Langevin wrote down in 1908 for Brownian motion, and as a thermostat it is robust, simple and exactly canonical. Its friction slows diffusion and other dynamics, increasingly so as $\gamma$ grows, so weak coupling (a friction time $1/\gamma$ of about a picosecond or longer) is used when dynamics matters.

## The Nosé–Hoover extended system

A deterministic route to the canonical ensemble was found by Shuichi Nosé in 1984 and reformulated by William Hoover in 1985. The system is coupled to an extra dynamical variable, a friction coefficient $\xi$ with a fictitious mass $Q$, that speeds up or slows down all particles depending on whether the system is too cold or too hot:

{{< eq title="The Nosé–Hoover equations" say="A single extra variable acts as a variable friction: it grows when the system is too hot and becomes negative when it is too cold." >}}
$$ \dot{\mathbf r}_i = \frac{\mathbf p_i}{m_i}, \qquad \dot{\mathbf p}_i = \mathbf F_i - \textcolor{#845ef7}{\xi}\,\mathbf p_i, \qquad \dot{\textcolor{#845ef7}{\xi}} = \frac{1}{Q}\Big(\sum_i \frac{p_i^2}{m_i} - N_{\text{df}}\,k_BT_0\Big) $$
- the extended system conserves a modified energy, which serves as a check of the integration
- $Q$ sets the timescale of temperature oscillations
{{< /eq >}}

Nosé–Hoover dynamics is deterministic, time-reversible and samples the canonical ensemble **if it is ergodic**. For a single harmonic oscillator, or for stiff, weakly coupled systems, it is not: the trajectory stays on a subset of phase space and the distribution is wrong. Glenn Martyna, Michael Klein and Mark Tuckerman (1992) fixed this with **Nosé–Hoover chains**, in which the thermostat variable is itself thermostatted by another, and so on; chains of a few thermostats are ergodic in practice and are a standard choice in many codes.

## Stochastic velocity rescaling

In 2007 Giovanni Bussi, Davide Donadio and Michele Parrinello combined the simplicity of rescaling with exact canonical sampling in the **canonical sampling through velocity rescaling** (CSVR) thermostat. Instead of rescaling the kinetic energy to its target value, they rescale it to a value drawn stochastically, so that the kinetic energy follows exactly the canonical distribution:

{{< eq title="Stochastic velocity rescaling (Bussi–Donadio–Parrinello)" say="Relax the kinetic energy towards its target like Berendsen, but add exactly the right noise so that it fluctuates canonically." >}}
$$ \mathrm dK = \big(K_0 - K\big)\frac{\mathrm dt}{\tau} + 2\sqrt{\frac{K K_0}{N_{\text{df}}}}\,\frac{\mathrm dW}{\sqrt\tau}, \qquad K_0 = \tfrac12 N_{\text{df}}\,k_BT_0 $$
- $\mathrm dW$: a Wiener noise increment; the first term is Berendsen's relaxation, the second the correction that restores fluctuations
- all velocities are rescaled by a single factor, so the dynamics is disturbed only globally
{{< /eq >}}

CSVR samples the canonical ensemble for any coupling time, is as stable as Berendsen, and perturbs dynamical properties very little because it acts only on the total kinetic energy. It is the default in GROMACS (`tcoupl = v-rescale`) and widely used elsewhere.

The figure runs a small two-dimensional Lennard-Jones fluid under each thermostat and histograms the kinetic energy against the canonical gamma distribution.

{{< widget name="thermostats" title="Seven thermostats on the same fluid" caption="Left: the fluid, coloured by speed. Right, top: the instantaneous kinetic temperature. Right, bottom: the distribution of the kinetic energy against the canonical distribution (rose). The readout compares the relative fluctuation with the canonical value √(2/N_df). Try each thermostat and vary the coupling time." >}}

Velocity rescaling collapses the distribution to a spike. Berendsen produces a distribution that is too narrow, increasingly so for short coupling times. NVE dynamics also gives a narrower distribution, because kinetic energy can only be exchanged with the potential energy of a small isolated system. Andersen, Langevin, Nosé–Hoover (this fluid is chaotic enough to be ergodic) and CSVR all reproduce the canonical fluctuations.

## Barostats

Controlling pressure requires letting the volume, and possibly the shape, of the simulation box change. The instantaneous pressure is computed from the virial, $P = \frac{1}{dV}\left(2K + \sum_i \mathbf r_i\cdot\mathbf F_i\right)$ in $d$ dimensions (with the pairwise form used for periodic systems), and in the isothermal–isobaric ensemble the volume fluctuates with a variance set by the compressibility, as [the topic on fluctuations](../fluctuations-and-response/) explained.

The **Berendsen barostat** scales coordinates and box to relax the pressure exponentially towards its target; like its thermostat, it equilibrates well but does not sample the correct ensemble, suppressing volume fluctuations. **Andersen's barostat** (1980) treats the volume as a dynamical variable with a fictitious mass, driven by the difference between internal and external pressure, and samples the NPH ensemble correctly. **Parrinello–Rahman** (Michele Parrinello and Aneesur Rahman, 1981) extends this to the full cell matrix, allowing the box shape to change, which is essential for studying solid–solid phase transitions and anisotropic materials; their simulations of structural transformations in crystals under stress were the first of their kind. **Martyna–Tobias–Klein** (MTK, 1994) equations combine extended-system thermostats and barostats in a form that samples the NPT ensemble exactly. **Stochastic cell rescaling** (Mattia Bernetti and Giovanni Bussi, 2020) applies the stochastic idea of CSVR to the volume, giving a first-order barostat that is robust like Berendsen but samples correct volume fluctuations; it is available in GROMACS as `pcoupl = c-rescale`. Monte Carlo volume moves, as in [the topic on Monte Carlo](../monte-carlo/), are another exact alternative.

## Practical recommendations

For equilibration from a poor starting structure, Berendsen thermostats and barostats (or stochastic cell rescaling) are robust and quick. For production runs in which ensemble properties matter, use a thermostat that samples the canonical ensemble: CSVR, Langevin, or Nosé–Hoover chains; and a barostat that samples the correct volume distribution: Parrinello–Rahman, MTK or stochastic cell rescaling. Coupling times of 0.1–1 ps for thermostats and 1–5 ps for barostats are typical. When transport properties such as diffusion or viscosity are computed, use weak coupling or a global thermostat (CSVR, Nosé–Hoover), or run the measurement in NVE after equilibrating, because local stochastic thermostats such as Langevin or Andersen with strong coupling alter the dynamics being measured. And for systems with large, stiff, weakly coupled degrees of freedom, such as a solid at low temperature, check ergodicity: a single Nosé–Hoover thermostat may fail where chains or stochastic thermostats succeed.

{{< note type="key" >}}
- NVE dynamics samples the microcanonical ensemble; thermostats target the canonical distribution, whose kinetic energy fluctuates with relative width $\sqrt{2/N_{\text{df}}}$.
- Velocity rescaling and Berendsen suppress fluctuations and can cause artefacts (flying ice cube); use them only for equilibration.
- Andersen and Langevin thermostats are exactly canonical but perturb dynamics; Nosé–Hoover is deterministic and canonical if ergodic, and chains restore ergodicity.
- Stochastic velocity rescaling (CSVR) adds the right noise to Berendsen relaxation: canonical, stable and gentle.
- Barostats: Berendsen (equilibration), Andersen and Parrinello–Rahman (volume and cell as dynamical variables), MTK (exact NPT), stochastic cell rescaling and MC volume moves.
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

</div>
