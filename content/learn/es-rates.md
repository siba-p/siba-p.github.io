---
title: "Reaction rates"
description: "How fast transitions happen: first-order kinetics and waiting times, the Arrhenius and Eyring equations and their history, transition-state theory derived from the flux through a dividing surface, harmonic TST and the Vineyard prefactor, recrossing and the transmission coefficient, variational TST, Kramers' theory of friction-controlled rates, and how rates are measured in simulations and used in kinetic Monte Carlo."
hook: "Every 5.7 kJ/mol of activation free energy makes a reaction ten times slower at room temperature. Transition-state theory explains why, and turns one saddle-point calculation into a rate far too slow to watch directly."
objectives:
  - "Derive the transition-state theory rate as the equilibrium flux through a dividing surface"
  - "Compute harmonic TST rates from a barrier and a vibrational prefactor at several temperatures"
  - "Explain recrossing, the transmission coefficient and why TST is an upper bound on the rate"
  - "Interpret Kramers' turnover: how friction first raises and then lowers the escape rate"
  - "Estimate an activation energy from the slope of an Arrhenius plot"
cover: "cover.svg"
milestones:
  - year: 1889
    text: "Svante Arrhenius proposes the exponential temperature dependence of rate constants"
  - year: 1935
    text: "Henry Eyring, Meredith Evans and Michael Polanyi formulate transition-state theory"
  - year: 1940
    text: "Hendrik Kramers derives escape rates over a barrier with friction"
  - year: 1957
    text: "George Vineyard derives harmonic transition-state theory for diffusion in crystals"
track: rl-land
weight: 2
level: Core
prereqs: ["es-landscapes", "boltzmann-and-maxwell"]
lab: "Count transitions of hundreds of Langevin walkers and build an Arrhenius plot against TST and Kramers theory"
---

## Rates and waiting times

When a system sits in a basin A and occasionally escapes to basin B, and the escapes are rare compared with the time it takes to forget how it got into A, every moment spent in A carries the same small chance of escape. The process is then **memoryless**: the probability of still being in A after time $t$ decays exponentially, and the waiting times are exponentially distributed.

{{< eq title="First-order kinetics" say="A constant chance per unit time of escaping gives exponential survival, and the mean waiting time is one over the rate." >}}
$$ \frac{\mathrm d P_A}{\mathrm d t} = -\textcolor{#e64980}{k}_{AB}\,P_A + k_{BA}\,P_B, \qquad P_{\text{wait}}(t) = \textcolor{#e64980}{k}\,e^{-\textcolor{#e64980}{k} t}, \qquad \langle t \rangle = 1/\textcolor{#e64980}{k} $$
- $\textcolor{#e64980}{k}_{AB}$: the rate constant for A → B, in s⁻¹
- valid when the time between events is much longer than the time to relax within a basin: a separation of timescales
{{< /eq >}}

The rate constant is what experiments measure and what simulations must predict. Because events are rare, it is usually far too small to measure by watching a simulation, and the theories in this chapter estimate it from properties of the barrier instead.

For a reversible two-state system the populations relax to equilibrium with a single rate, $k_{AB} + k_{BA}$, and at equilibrium the forward and backward fluxes balance: $k_{AB}\,P_A^{\text{eq}} = k_{BA}\,P_B^{\text{eq}}$. This **detailed balance** condition ties kinetics to thermodynamics, $k_{AB}/k_{BA} = e^{-\Delta F_{AB}/k_BT}$, so a free-energy difference fixes the ratio of the two rates but says nothing about their magnitude. A rate theory has to supply the missing piece: how often the system attempts to cross, and how many attempts succeed.

{{< note type="practice" title="Back of the envelope" >}}
Ten independent 100 ns trajectories, 1 μs in total, show three transitions. The estimate is $k \approx 3/(1\ \mu\text{s}) = 3 \times 10^6$ s⁻¹, but the number of events in a Poisson process fluctuates by its square root, so the relative uncertainty is $1/\sqrt 3 \approx 58\%$. To know a rate to 10%, about a hundred transitions must be observed. Direct counting is therefore practical only for barriers of a few $k_BT$; for anything slower, the rate has to be computed from the properties of the barrier.
{{< /note >}}

## Arrhenius and Eyring

In 1889 Svante Arrhenius, analysing the temperature dependence of the inversion of sucrose, proposed that rate constants follow

$$
k = A\,e^{-E_a/RT},
$$

so that a plot of $\ln k$ against $1/T$ is a straight line whose slope gives the activation energy $E_a$. He interpreted $E_a$ as the energy a molecule must acquire to react, and the exponential as the fraction of molecules that have it, which is the Boltzmann factor of [statistical mechanics](../boltzmann-and-maxwell/). The prefactor $A$ remained empirical.

In 1935 Henry Eyring, and independently Meredith Evans and Michael Polanyi, derived the prefactor from statistical mechanics, founding **transition-state theory** (TST). Eyring's result, in its thermodynamic form, is

{{< eq title="The Eyring equation" say="The rate is a universal attempt frequency, k_BT/h, times the Boltzmann factor of the free energy needed to reach the transition state." >}}
$$ k = \textcolor{#845ef7}{\kappa}\,\frac{k_B T}{h}\,e^{-\Delta G^\ddagger / k_B T} $$
- $k_BT/h \approx 6.25 \times 10^{12}$ s⁻¹ at 300 K: a universal frequency
- $\Delta G^\ddagger$: the free energy of activation, the free energy of the transition state relative to the reactant
- $\textcolor{#845ef7}{\kappa} \le 1$: the transmission coefficient, which corrects for trajectories that recross the barrier
{{< /eq >}}

With $\kappa = 1$, every 5.7 kJ/mol of activation free energy at room temperature reduces the rate tenfold. The equation underlies how chemists interpret reaction rates and how computational chemists turn computed barriers into rate predictions.

The 5.7 kJ/mol rule is $RT\ln 10$ at 298 K. It converts barriers into experimental timescales quickly. With $k_BT/h = 6.2 \times 10^{12}$ s⁻¹ at 298 K, a unimolecular reaction with $\Delta G^\ddagger = 80$ kJ/mol has $k = 0.06$ s⁻¹ and a half-life of about 12 s; at 90 kJ/mol the half-life is 11 minutes, and at 100 kJ/mol about 10 hours. This is why synthetic chemists regard roughly 90 to 100 kJ/mol as the limit for a reaction that runs overnight at room temperature, and why a computed barrier of 150 kJ/mol for a proposed room-temperature mechanism is strong evidence that the mechanism is wrong.

Splitting the activation free energy as $\Delta G^\ddagger = \Delta H^\ddagger - T\Delta S^\ddagger$ separates the two contributions. A plot of $\ln(k/T)$ against $1/T$, the **Eyring plot**, has slope $-\Delta H^\ddagger/R$ and intercept $\ln(k_B/h) + \Delta S^\ddagger/R$. For a unimolecular reaction in solution the Arrhenius and Eyring parameters are related by $E_a = \Delta H^\ddagger + RT$, a difference of only 2.5 kJ/mol at room temperature. A strongly negative $\Delta S^\ddagger$ indicates an ordered transition state, as in a cyclic, concerted rearrangement or a bimolecular association; a positive one indicates a loosened transition state, as in a bond dissociation.

{{< note type="warn" title="Myth" >}}
**Myth:** reaction rates double for every 10 °C rise in temperature. **Reality:** the factor is $\exp[E_a(1/T_1 - 1/T_2)/R]$, which equals 1.9 between 298 and 308 K only for $E_a \approx 50$ kJ/mol. A reaction with $E_a = 100$ kJ/mol speeds up 3.7-fold over the same interval, and the factor shrinks at higher temperature. The rule of thumb is a statement about typical activation energies, not a law.
{{< /note >}}

## Transition-state theory from first principles

TST can be derived cleanly in one dimension, and the derivation shows exactly what it assumes. Let the reaction coordinate be $x$, with the reactant basin at $x < x^\ddagger$ and the dividing surface at $x^\ddagger$, the top of the free-energy barrier. The rate is the flux of trajectories crossing the dividing surface from left to right, divided by the population of the reactant:

{{< eq title="TST as a flux through a dividing surface" say="Count how many systems per second cross the top of the barrier heading forward, and divide by how many are in the reactant well." >}}
$$ k_{\text{TST}} = \frac{\big\langle \dot x\,\delta(x - x^\ddagger)\,\theta(\dot x) \big\rangle}{\big\langle \theta(x^\ddagger - x)\big\rangle} = \sqrt{\frac{k_BT}{2\pi m}}\; \frac{e^{-\beta F(x^\ddagger)}}{\int_{x < x^\ddagger} e^{-\beta F(x)}\,\mathrm dx} $$
- averages are over the equilibrium (Boltzmann) distribution; $\theta$ is the step function, $\delta$ the Dirac delta
- $\sqrt{k_BT/2\pi m}$ is the mean forward speed of a Maxwell–Boltzmann velocity
{{< /eq >}}

{{< fig src="flux.svg" alt="Left: a double-well energy profile with the Boltzmann population of the left well shaded orange and a dashed violet dividing surface at the barrier top with an arrow for forward flux. Right: the Maxwell–Boltzmann velocity distribution at the barrier top with the positive half shaded and its mean marked" caption="The two halves of the TST formula. The denominator is the reactant population, the orange area; the numerator is the Boltzmann density at $x^\ddagger$ times the mean forward speed, $\sqrt{k_BT/2\pi m} = 0.399$ in reduced units. For the 5 $k_BT$ double well of the interactive figure below, the exact one-dimensional TST rate is $6.45 \times 10^{-3}$, against $6.78 \times 10^{-3}$ from the harmonic approximation." >}}

The formula reduces to a familiar form when the reactant well is harmonic, $F(x) \approx F_A + \tfrac12 m\omega_a^2 (x - x_A)^2$. The Gaussian integral in the denominator is $\sqrt{2\pi k_BT/m\omega_a^2}\,e^{-\beta F_A}$, the mass and $k_BT$ cancel against the prefactor, and

$$
k_{\text{TST}} = \frac{\omega_a}{2\pi}\,e^{-\beta \Delta F^\ddagger}.
$$

The attempt frequency is the vibrational frequency of the reactant well, and the exponential is the probability of being at the top. The anharmonicity of a real well lowers the rate slightly: the quartic double well in the figure has a flatter well than its harmonic approximation, so more probability sits in the reactant basin and the exact rate is 5% below the harmonic one.

The derivation makes two assumptions. First, the reactant is in **equilibrium**, so its population and the density at the barrier top follow the Boltzmann distribution; this holds when relaxation within the basin is fast compared with escape. Second, every trajectory that crosses the dividing surface forwards is counted as a reaction, even if it turns round and recrosses a moment later. The second assumption means that TST is an **upper bound** on the true rate.

For a solid or a molecule, where the barrier is a saddle point on the potential energy surface, expanding the energy to second order around the minimum and around the saddle gives **harmonic transition-state theory**, derived by George Vineyard in 1957 for diffusion in crystals:

{{< eq title="Harmonic TST (Vineyard)" say="The prefactor is the ratio of the vibrational frequencies at the minimum to those at the saddle, with the unstable mode left out." >}}
$$ k_{\text{hTST}} = \frac{\prod_{i=1}^{3N} \nu_i^{\text{min}}}{\prod_{j=1}^{3N-1} \nu_j^{\ddagger}}\; e^{-\Delta E^\ddagger / k_BT} $$
- $\nu_i$: normal-mode frequencies (square roots of Hessian eigenvalues over $2\pi$); the saddle has one mode fewer because its unstable mode has an imaginary frequency
- typical prefactors in solids are $10^{12}$–$10^{13}$ s⁻¹
{{< /eq >}}

Harmonic TST and Eyring's equation are the same theory. Eyring wrote the rate as $(k_BT/h)\,(q^\ddagger/q_A)\,e^{-\Delta E^\ddagger/k_BT}$, a ratio of partition functions with the unstable mode removed from $q^\ddagger$. In the classical limit each vibrational mode contributes $k_BT/h\nu_i$ to its partition function. The saddle has one mode fewer than the minimum, so the ratio $q^\ddagger/q_A$ contains one surplus factor of $h\nu/k_BT$ that cancels the $k_BT/h$ in front, leaving Vineyard's frequency ratio. Planck's constant disappears from the classical rate; it survives only through quantum corrections.

Those corrections matter for light atoms. Because the classical prefactor scales as $m^{-1/2}$ for a single hopping atom, deuterium should hop $\sqrt 2$ times more slowly than hydrogen, but measured isotope effects for hydrogen transfer at room temperature are often much larger. Zero-point energy lowers the effective barrier more for the lighter isotope, and tunnelling through the barrier top adds to the rate. Eugene Wigner's 1932 correction multiplies the rate by $1 + \tfrac{1}{24}(\hbar\omega_b/k_BT)^2$; for a barrier with an imaginary frequency of 1000 cm⁻¹, typical of proton transfer, this is already a factor of 2 at 300 K. Beyond this leading term, path-integral methods such as ring-polymer molecular dynamics are needed.

{{< fig src="vacancy.svg" alt="Logarithm of the vacancy hop rate in copper against temperature from 200 to 1100 K, rising steeply, with points at 300, 600 and 900 K and horizontal lines at one hop per second and one hop per microsecond" caption="Harmonic TST for the EMT vacancy hop in copper, $\Delta E^\ddagger = 0.78$ eV and prefactor $5 \times 10^{12}$ s⁻¹. The rate rises by more than eight orders of magnitude between 300 and 900 K; only above about 590 K does one hop per microsecond, the reach of direct MD, become available." >}}

The vacancy hop in copper computed with NEB in [the previous chapter](../es-landscapes/) has a barrier of 0.78 eV with the EMT potential. With a prefactor of $5 \times 10^{12}$ s⁻¹, harmonic TST predicts about 0.4 hops per second at 300 K, $1.4 \times 10^6$ at 600 K and $2 \times 10^8$ at 900 K: from essentially frozen to rapid diffusion over a few hundred kelvin, the hallmark of an activated process. No direct MD simulation could see the room-temperature hops, but a single NEB calculation predicts their rate.

## Recrossing and the transmission coefficient

Real trajectories that reach the dividing surface do not all continue to the product. Collisions with surrounding atoms can turn them round, so that they recross the surface one or more times before settling on either side. The true rate is the TST rate multiplied by a **transmission coefficient** $\kappa \le 1$, the fraction of forward crossings that lead to a committed reaction. The **Bennett–Chandler** method computes it from simulation: start many short trajectories at the dividing surface with Maxwell–Boltzmann velocities, follow each for a short time, and measure the fraction that ends in the product, weighted by the initial velocity. The rate is then $k = \kappa\,k_{\text{TST}}$, with $k_{\text{TST}}$ obtained from a free-energy calculation of $F(x)$. This two-step "reactive flux" approach was introduced by Charles Bennett (1977) and David Chandler (1978) and is still a standard route to rates in solution.

{{< fig src="recrossing.svg" alt="Left: 24 Langevin trajectories x(t) started at the barrier top at friction 10, coloured by whether they end in A or B, many of them recrossing zero. Right: the transmission coefficient κ(t) falling from 1 to plateaus of 0.79 at friction 2 and 0.36 at friction 10, with dashed lines at the Kramers predictions 0.80 and 0.38" caption="The Bennett–Chandler calculation done for the double well of the interactive figure, with 20,000 trajectories per friction. Trajectories launched forward often turn back; $\kappa(t)$ drops within about one time unit and then stays flat. The plateau values agree with Kramers' formula to within 5%." >}}

The figure shows the two features that make the method practical. First, $\kappa(t)$ reaches its plateau after a time comparable to the barrier-crossing time, here about one reduced time unit or roughly a picosecond for an atomic system, so the trajectories are short even when the rate itself is seconds. Second, the plateau value does not depend on where exactly the dividing surface is put, provided it lies in the barrier region: a poorly placed surface gives a larger TST rate and a correspondingly smaller $\kappa$, and the product is the same. A very small $\kappa$, below about 0.1, is the practical warning sign: either the friction is high, or the coordinate used to define the surface misses the slow motion that actually decides the outcome, the problem examined in [the chapter on collective variables](../es-collective-variables/).

Because TST is an upper bound, the dividing surface can be moved to minimise the predicted rate; this **variational transition-state theory**, developed from ideas of Eugene Wigner and James Keck and systematised by Donald Truhlar and others, gives the best TST estimate and reduces the recrossing correction.

## Kramers' theory: the role of friction

In 1940 Hendrik Kramers asked how a particle escapes from a well when it is coupled to a heat bath through friction $\gamma$ and random forces, the Langevin dynamics described in [the chapter on thermostats](../thermostats-and-barostats/). His answer shows that the rate depends on friction in a non-monotonic way. At very **low friction**, the particle exchanges energy with the bath too slowly to reach the barrier energy, and the rate is limited by energy diffusion, increasing with friction. At **high friction**, the particle reaches the barrier easily but its motion across the barrier top becomes diffusive, and it recrosses many times; the rate falls as $1/\gamma$. In between, the rate peaks near the TST value: the **Kramers turnover**. In the moderate-to-high friction regime the rate is

{{< eq title="Kramers' rate (moderate to high friction)" say="Friction reduces the TST rate by a factor that compares the friction with the curvature of the barrier top." >}}
$$ k_{\text{Kr}} = \frac{\omega_a}{2\pi\,\omega_b}\left(\sqrt{\frac{\gamma^2}{4} + \omega_b^2} - \frac{\gamma}{2}\right) e^{-\Delta U/k_BT} \;\xrightarrow{\;\gamma \gg \omega_b\;}\; \frac{\omega_a\,\omega_b}{2\pi\gamma}\,e^{-\Delta U/k_BT} $$
- $\omega_a$: the angular frequency of the well; $\omega_b$: the imaginary frequency of the barrier top ($|U''|^{1/2}$ for unit mass)
- for $\gamma \to 0$ the bracket tends to $\omega_b$ and the formula reduces to TST, $\omega_a e^{-\Delta U/k_BT}/2\pi$
{{< /eq >}}

In the units of the interactive figure, the double well $U = 5(x^2-1)^2$ has $\omega_a = \sqrt{40} = 6.3$ and $\omega_b = \sqrt{20} = 4.5$. The Kramers factor is 0.98 at $\gamma = 0.2$, 0.80 at $\gamma = 2$, 0.38 at $\gamma = 10$ and 0.21 at $\gamma = 20$: friction comparable to the barrier frequency already removes most of the TST rate. For the weak-friction side of the turnover Kramers derived a separate result, $k \approx \gamma\,(I_b/k_BT)\,(\omega_a/2\pi)\,e^{-\Delta U/k_BT}$, where $I_b$ is the action of the orbit in the well at the barrier energy. Here the rate is proportional to the friction, because the bottleneck is the slow diffusion of energy up the well, not the passage over the top. The turnover lies roughly where the energy exchanged with the bath during one oscillation in the well is about $k_BT$. Melnikov and Meshkov later joined the two limits into a single formula valid across the turnover, reviewed by Hänggi, Talkner and Borkovec.

The figure below measures rates directly. Three hundred independent particles move by Langevin dynamics in a double well with a barrier of 5 (in units where the temperature can be varied); each time a particle passes from the left well to the right one, a transition is counted, and the rate is the number of transitions divided by the total time spent in the left well. Record points at several temperatures to build an Arrhenius plot and compare with TST (dashed) and Kramers (solid). Then change the friction: at low friction the measured rate approaches TST; at high friction it falls well below, as Kramers predicted.

{{< widget name="rates" title="Measuring a rate and testing rate theory" caption="Left: 300 Langevin walkers in a double well (orange in the left well, teal in the right); the violet bar shows k_BT. Right: ln k against 1/k_BT. Record your measured rate at several temperatures and frictions, and compare with transition-state theory (gold dashed) and Kramers' theory (rose)." >}}

The straight lines on the Arrhenius plot have a slope equal to the barrier height, and their intercepts differ by the transmission coefficient, which the readout gives as $\kappa = k_{\text{Kr}}/k_{\text{TST}}$. At very low friction, below the turnover, Kramers' high-friction formula itself breaks down and the measured rate falls again, a regime that matters for gas-phase reactions and for weakly damped degrees of freedom.

Kramers assumed that the friction is instantaneous, with no memory. In a liquid the solvent responds on a finite timescale, and the barrier crossing, which takes tens of femtoseconds for a sharp barrier, may be over before the solvent has reacted. Richard Grote and James Hynes (1980) generalised Kramers' result to friction with memory: the bracket in Kramers' formula is replaced by the reactive frequency $\lambda_r$ that solves $\lambda_r = \omega_b^2/[\lambda_r + \hat\gamma(\lambda_r)]$, where $\hat\gamma$ is the Laplace transform of the memory kernel. Because the solvent cannot follow a fast crossing, the effective friction is smaller than the zero-frequency friction, and the Grote–Hynes transmission coefficient can be several times larger than Kramers' estimate for reactions with sharp barriers in polar solvents.

## Rates from simulation in practice

When barriers are low enough that transitions occur within simulation time, rates can be counted directly, as in the figure, or computed from **mean first-passage times**. When they are not, the strategies of the following chapters apply. A free-energy profile along a good collective variable gives the TST rate, and short trajectories from the barrier top give $\kappa$. Path-sampling methods ([the chapter on paths](../es-path-sampling/)) sample the rare reactive trajectories themselves and compute rates without a dividing surface. Markov state models ([their own chapter](../es-msm/)) build rates from many short simulations. And for crystals, where transitions are hops between well-defined sites, harmonic TST with NEB barriers feeds **kinetic Monte Carlo**, which advances a lattice of sites event by event, choosing each event with probability proportional to its rate and advancing the clock by an exponentially distributed waiting time. This is how diffusion, ordering and growth in materials are simulated over seconds to hours.

{{< fig src="kmc.svg" alt="Left: a square lattice with a vacancy and four neighbouring atoms labelled a to d, with arrows of different thickness for their hop rates. Right: the four rates 4, 1, 2.5 and 0.5 per second stacked as coloured segments of a bar of total length 8, with a pointer at 4.24 selecting event b" caption="The residence-time algorithm. All possible events are listed with their rates; a uniform random number $u_1$ times $k_{\text{tot}}$ selects one in proportion to its rate, and a second random number advances the clock by an exponentially distributed time with mean $1/k_{\text{tot}}$." >}}

This rejection-free scheme was introduced by Alfred Bortz, Malvin Kalos and Joel Lebowitz in 1975 for Ising models and, in the form used for chemical kinetics, by Daniel Gillespie in 1976. Its efficiency comes from never wasting a step: every iteration executes an event, and the clock advances by the time the system would have waited. For the copper vacancy at 300 K there are 12 neighbours, each hopping at 0.39 s⁻¹, so $k_{\text{tot}} = 4.7$ s⁻¹ and each KMC step advances the clock by 0.21 s on average, more than $10^{14}$ MD time steps per iteration. The cost is that the event list must be complete. An event that is missing from the catalogue, such as a concerted two-atom exchange that nobody thought to compute, never happens in the simulation, which is why adaptive KMC searches for saddles on the fly, as described in [the chapter on landscapes](../es-landscapes/).

The cell below runs KMC for a single vacancy on an fcc lattice at 600 K, where all 12 hops have the same rate, and compares the diffusion coefficient with the random-walk result. With $z = 12$ neighbours at distance $a/\sqrt 2$, $D = z\Gamma\lambda^2/6 = \Gamma a^2$.

{{< py title="Kinetic Monte Carlo for a vacancy in copper" >}}
import numpy as np
rng = np.random.default_rng(0)
a, Ea, nu, kB, T = 3.6, 0.78, 5e12, 8.617e-5, 600.0   # Å, eV, 1/s, eV/K, K
G = nu * np.exp(-Ea / (kB * T))                       # rate of one particular hop
# the 12 nearest-neighbour vectors of an fcc lattice
hops = np.array([(i, j, 0) for i in (1, -1) for j in (1, -1)] +
                [(i, 0, j) for i in (1, -1) for j in (1, -1)] +
                [(0, i, j) for i in (1, -1) for j in (1, -1)]) * a / 2
ktot = 12 * G                                         # all 12 hops have the same rate
nwalk, nstep = 2000, 1000
r = np.zeros((nwalk, 3)); t = np.zeros(nwalk)
for step in range(nstep):
    r += hops[rng.integers(0, 12, nwalk)]             # pick an event (all equally likely here)
    t += -np.log(rng.random(nwalk)) / ktot            # advance each walker's clock
D_sim = np.mean(np.sum(r**2, axis=1)) / (6 * np.mean(t))
print(f"hop rate Gamma = {G:.3g} 1/s at {T:.0f} K")
print(f"simulated time per walker: {np.mean(t)*1e6:.0f} microseconds")
print(f"D from KMC   = {D_sim*1e-16:.3g} cm^2/s")
print(f"D = Gamma a^2 = {G*a**2*1e-16:.3g} cm^2/s")
{{< /py >}}

A thousand events cover about 60 μs of simulated time per walker, and the two estimates of $D$ agree at $1.8 \times 10^{-9}$ cm²/s. In a real alloy the rates depend on the local environment of each hop, the event list changes after every step, and computing those environment-dependent barriers, increasingly with machine-learned potentials, is where most of the effort goes.

When the events cannot be catalogued in advance, accelerated MD methods developed by Arthur Voter and co-workers offer an alternative. Hyperdynamics (1997) adds a bias that raises the basins without touching the saddles, so that transitions happen sooner but in the correct relative proportions, and the simulation clock is advanced by the known boost factor; parallel-replica dynamics runs many copies of the same basin and accepts the first escape; temperature-accelerated dynamics runs hot and extrapolates the observed events back to low temperature with harmonic TST.

The quantity that connects all these approaches is the **committor** $p_B(\mathbf x)$: the probability that a trajectory started at configuration $\mathbf x$, with random velocities, reaches B before A. It is 0 in A, 1 in B, and $\tfrac12$ on the true transition state ensemble. The committor is the ideal reaction coordinate, and much of modern rare-event theory, from transition path theory to machine-learned collective variables, can be seen as attempts to approximate it.

{{< note type="key" >}}
- Rare transitions follow first-order kinetics: exponential waiting times with mean $1/k$.
- Arrhenius (1889): $k = A e^{-E_a/RT}$; Eyring–Evans–Polanyi (1935): $k = \kappa (k_BT/h) e^{-\Delta G^\ddagger/k_BT}$.
- TST is the equilibrium flux through a dividing surface divided by the reactant population, an upper bound on the true rate; harmonic TST (Vineyard) gives prefactors from vibrational frequencies.
- The transmission coefficient $\kappa \le 1$ accounts for recrossing (Bennett–Chandler); variational TST minimises it.
- Kramers' theory: rates rise with friction at low friction, fall as $1/\gamma$ at high friction, with a turnover near TST; the committor is the ideal reaction coordinate.
- Harmonic TST is Eyring's equation in the classical limit, where Planck's constant cancels; kinetic Monte Carlo strings TST rates together into long-time trajectories.
{{< /note >}}

{{< quiz >}}
- q: "An Arrhenius plot of ln k against 1/T has slope −9000 K. What is the activation energy?"
  options: ["9000 J/mol", "about 75 kJ/mol (9000 K × R)", "9 kJ/mol"]
  answer: 1
  why: "Slope = −E_a/R, so E_a = 9000 × 8.314 J/mol ≈ 74.8 kJ/mol."
- q: "Why is transition-state theory an upper bound on the rate?"
  options: ["It ignores the barrier", "It counts every forward crossing of the dividing surface as a reaction, including those that recross", "It assumes zero temperature"]
  answer: 1
  why: "Recrossing trajectories are counted but do not react; κ ≤ 1 corrects this."
- q: "In Kramers' theory, what happens to the rate at very high friction?"
  options: ["It increases without limit", "It decreases as 1/γ, because motion over the barrier becomes diffusive and recrossing is frequent", "It equals TST"]
  answer: 1
  why: "Strong damping slows the passage over the barrier top."
- q: "What is the committor of a configuration exactly on the transition state ensemble?"
  options: ["0", "1/2", "1"]
  answer: 1
  why: "From the transition state, trajectories are equally likely to reach A or B first."
- q: "A reaction has ΔG‡ = 90 kJ/mol at 298 K. Roughly how long is its half-life?"
  options: ["About a millisecond", "About ten minutes", "About a year"]
  answer: 1
  why: "k = (k_BT/h) e^(−ΔG‡/RT) ≈ 6.2 × 10¹² × e^(−36.3) ≈ 1 × 10⁻³ s⁻¹, so t½ = ln 2 / k ≈ 650 s."
- q: "A KMC simulation has 12 possible events, each with rate 0.4 s⁻¹. What is the mean time advanced per step?"
  options: ["0.4 s", "about 0.2 s", "2.5 s"]
  answer: 1
  why: "The clock advances by an exponential time with mean 1/k_tot = 1/(12 × 0.4 s⁻¹) ≈ 0.21 s."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. S. Arrhenius, "Über die Reaktionsgeschwindigkeit bei der Inversion von Rohrzucker durch Säuren", *Zeitschrift für Physikalische Chemie* **4**, 226–248 (1889).
2. H. Eyring, "The activated complex in chemical reactions", *Journal of Chemical Physics* **3**, 107–115 (1935).
3. M. G. Evans and M. Polanyi, "Some applications of the transition state method to the calculation of reaction velocities, especially in solution", *Transactions of the Faraday Society* **31**, 875–894 (1935).
4. G. H. Vineyard, "Frequency factors and isotope effects in solid state rate processes", *Journal of Physics and Chemistry of Solids* **3**, 121–127 (1957).
5. H. A. Kramers, "Brownian motion in a field of force and the diffusion model of chemical reactions", *Physica* **7**, 284–304 (1940).
6. P. Hänggi, P. Talkner and M. Borkovec, "Reaction-rate theory: fifty years after Kramers", *Reviews of Modern Physics* **62**, 251–341 (1990).
7. C. H. Bennett, "Molecular dynamics and transition state theory: the simulation of infrequent events", in *Algorithms for Chemical Computations*, ACS Symposium Series **46**, 63–97 (1977).
8. D. Chandler, "Statistical mechanics of isomerization dynamics in liquids and the transition state approximation", *Journal of Chemical Physics* **68**, 2959–2970 (1978).
9. D. G. Truhlar, B. C. Garrett and S. J. Klippenstein, "Current status of transition-state theory", *Journal of Physical Chemistry* **100**, 12771–12800 (1996).
10. A. F. Voter, "Introduction to the kinetic Monte Carlo method", in *Radiation Effects in Solids*, Springer (2007), 1–23.
11. W. E and E. Vanden-Eijnden, "Transition-path theory and path-finding algorithms for the study of rare events", *Annual Review of Physical Chemistry* **61**, 391–420 (2010).
12. R. F. Grote and J. T. Hynes, "The stable states picture of chemical reactions. II. Rate constants for condensed and gas phase reaction models", *Journal of Chemical Physics* **73**, 2715–2732 (1980).
13. A. B. Bortz, M. H. Kalos and J. L. Lebowitz, "A new algorithm for Monte Carlo simulation of Ising spin systems", *Journal of Computational Physics* **17**, 10–18 (1975).
14. D. T. Gillespie, "A general method for numerically simulating the stochastic time evolution of coupled chemical reactions", *Journal of Computational Physics* **22**, 403–434 (1976).
15. A. F. Voter, "Hyperdynamics: accelerated molecular dynamics of infrequent events", *Physical Review Letters* **78**, 3908–3911 (1997).

</div>
