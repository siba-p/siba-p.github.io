---
title: "Reaction rates"
description: "How fast transitions happen: first-order kinetics and waiting times, the Arrhenius and Eyring equations and their history, transition-state theory derived from the flux through a dividing surface, harmonic TST and the Vineyard prefactor, recrossing and the transmission coefficient, variational TST, Kramers' theory of friction-controlled rates, and how rates are measured in simulations and used in kinetic Monte Carlo."
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

## Transition-state theory from first principles

TST can be derived cleanly in one dimension, and the derivation shows exactly what it assumes. Let the reaction coordinate be $x$, with the reactant basin at $x < x^\ddagger$ and the dividing surface at $x^\ddagger$, the top of the free-energy barrier. The rate is the flux of trajectories crossing the dividing surface from left to right, divided by the population of the reactant:

{{< eq title="TST as a flux through a dividing surface" say="Count how many systems per second cross the top of the barrier heading forward, and divide by how many are in the reactant well." >}}
$$ k_{\text{TST}} = \frac{\big\langle \dot x\,\delta(x - x^\ddagger)\,\theta(\dot x) \big\rangle}{\big\langle \theta(x^\ddagger - x)\big\rangle} = \sqrt{\frac{k_BT}{2\pi m}}\; \frac{e^{-\beta F(x^\ddagger)}}{\int_{x < x^\ddagger} e^{-\beta F(x)}\,\mathrm dx} $$
- averages are over the equilibrium (Boltzmann) distribution; $\theta$ is the step function, $\delta$ the Dirac delta
- $\sqrt{k_BT/2\pi m}$ is the mean forward speed of a Maxwell–Boltzmann velocity
{{< /eq >}}

The derivation makes two assumptions. First, the reactant is in **equilibrium**, so its population and the density at the barrier top follow the Boltzmann distribution; this holds when relaxation within the basin is fast compared with escape. Second, every trajectory that crosses the dividing surface forwards is counted as a reaction, even if it turns round and recrosses a moment later. The second assumption means that TST is an **upper bound** on the true rate.

For a solid or a molecule, where the barrier is a saddle point on the potential energy surface, expanding the energy to second order around the minimum and around the saddle gives **harmonic transition-state theory**, derived by George Vineyard in 1957 for diffusion in crystals:

{{< eq title="Harmonic TST (Vineyard)" say="The prefactor is the ratio of the vibrational frequencies at the minimum to those at the saddle, with the unstable mode left out." >}}
$$ k_{\text{hTST}} = \frac{\prod_{i=1}^{3N} \nu_i^{\text{min}}}{\prod_{j=1}^{3N-1} \nu_j^{\ddagger}}\; e^{-\Delta E^\ddagger / k_BT} $$
- $\nu_i$: normal-mode frequencies (square roots of Hessian eigenvalues over $2\pi$); the saddle has one mode fewer because its unstable mode has an imaginary frequency
- typical prefactors in solids are $10^{12}$–$10^{13}$ s⁻¹
{{< /eq >}}

The vacancy hop in copper computed with NEB in [the previous chapter](../es-landscapes/) has a barrier of 0.78 eV with the EMT potential. With a prefactor of $5 \times 10^{12}$ s⁻¹, harmonic TST predicts about 0.4 hops per second at 300 K, $1.4 \times 10^6$ at 600 K and $2 \times 10^8$ at 900 K: from essentially frozen to rapid diffusion over a few hundred kelvin, the hallmark of an activated process. No direct MD simulation could see the room-temperature hops, but a single NEB calculation predicts their rate.

## Recrossing and the transmission coefficient

Real trajectories that reach the dividing surface do not all continue to the product. Collisions with surrounding atoms can turn them round, so that they recross the surface one or more times before settling on either side. The true rate is the TST rate multiplied by a **transmission coefficient** $\kappa \le 1$, the fraction of forward crossings that lead to a committed reaction. The **Bennett–Chandler** method computes it from simulation: start many short trajectories at the dividing surface with Maxwell–Boltzmann velocities, follow each for a short time, and measure the fraction that ends in the product, weighted by the initial velocity. The rate is then $k = \kappa\,k_{\text{TST}}$, with $k_{\text{TST}}$ obtained from a free-energy calculation of $F(x)$. This two-step "reactive flux" approach was introduced by Charles Bennett (1977) and David Chandler (1978) and is still a standard route to rates in solution.

Because TST is an upper bound, the dividing surface can be moved to minimise the predicted rate; this **variational transition-state theory**, developed from ideas of Eugene Wigner and James Keck and systematised by Donald Truhlar and others, gives the best TST estimate and reduces the recrossing correction.

## Kramers' theory: the role of friction

In 1940 Hendrik Kramers asked how a particle escapes from a well when it is coupled to a heat bath through friction $\gamma$ and random forces, the Langevin dynamics described in [the chapter on thermostats](../thermostats-and-barostats/). His answer shows that the rate depends on friction in a non-monotonic way. At very **low friction**, the particle exchanges energy with the bath too slowly to reach the barrier energy, and the rate is limited by energy diffusion, increasing with friction. At **high friction**, the particle reaches the barrier easily but its motion across the barrier top becomes diffusive, and it recrosses many times; the rate falls as $1/\gamma$. In between, the rate peaks near the TST value: the **Kramers turnover**. In the moderate-to-high friction regime the rate is

{{< eq title="Kramers' rate (moderate to high friction)" say="Friction reduces the TST rate by a factor that compares the friction with the curvature of the barrier top." >}}
$$ k_{\text{Kr}} = \frac{\omega_a}{2\pi\,\omega_b}\left(\sqrt{\frac{\gamma^2}{4} + \omega_b^2} - \frac{\gamma}{2}\right) e^{-\Delta U/k_BT} \;\xrightarrow{\;\gamma \gg \omega_b\;}\; \frac{\omega_a\,\omega_b}{2\pi\gamma}\,e^{-\Delta U/k_BT} $$
- $\omega_a$: the angular frequency of the well; $\omega_b$: the imaginary frequency of the barrier top ($|U''|^{1/2}$ for unit mass)
- for $\gamma \to 0$ the bracket tends to $\omega_b$ and the formula reduces to TST, $\omega_a e^{-\Delta U/k_BT}/2\pi$
{{< /eq >}}

The figure below measures rates directly. Three hundred independent particles move by Langevin dynamics in a double well with a barrier of 5 (in units where the temperature can be varied); each time a particle passes from the left well to the right one, a transition is counted, and the rate is the number of transitions divided by the total time spent in the left well. Record points at several temperatures to build an Arrhenius plot and compare with TST (dashed) and Kramers (solid). Then change the friction: at low friction the measured rate approaches TST; at high friction it falls well below, as Kramers predicted.

{{< widget name="rates" title="Measuring a rate and testing rate theory" caption="Left: 300 Langevin walkers in a double well (orange in the left well, teal in the right); the violet bar shows k_BT. Right: ln k against 1/k_BT. Record your measured rate at several temperatures and frictions, and compare with transition-state theory (gold dashed) and Kramers' theory (rose)." >}}

The straight lines on the Arrhenius plot have a slope equal to the barrier height, and their intercepts differ by the transmission coefficient, which the readout gives as $\kappa = k_{\text{Kr}}/k_{\text{TST}}$. At very low friction, below the turnover, Kramers' high-friction formula itself breaks down and the measured rate falls again, a regime that matters for gas-phase reactions and for weakly damped degrees of freedom.

## Rates from simulation in practice

When barriers are low enough that transitions occur within simulation time, rates can be counted directly, as in the figure, or computed from **mean first-passage times**. When they are not, the strategies of the following chapters apply. A free-energy profile along a good collective variable gives the TST rate, and short trajectories from the barrier top give $\kappa$. Path-sampling methods ([the chapter on paths](../es-path-sampling/)) sample the rare reactive trajectories themselves and compute rates without a dividing surface. Markov state models ([their own chapter](../es-msm/)) build rates from many short simulations. And for crystals, where transitions are hops between well-defined sites, harmonic TST with NEB barriers feeds **kinetic Monte Carlo**, which advances a lattice of sites event by event, choosing each event with probability proportional to its rate and advancing the clock by an exponentially distributed waiting time. This is how diffusion, ordering and growth in materials are simulated over seconds to hours.

The quantity that connects all these approaches is the **committor** $p_B(\mathbf x)$: the probability that a trajectory started at configuration $\mathbf x$, with random velocities, reaches B before A. It is 0 in A, 1 in B, and $\tfrac12$ on the true transition state ensemble. The committor is the ideal reaction coordinate, and much of modern rare-event theory, from transition path theory to machine-learned collective variables, can be seen as attempts to approximate it.

{{< note type="key" >}}
- Rare transitions follow first-order kinetics: exponential waiting times with mean $1/k$.
- Arrhenius (1889): $k = A e^{-E_a/RT}$; Eyring–Evans–Polanyi (1935): $k = \kappa (k_BT/h) e^{-\Delta G^\ddagger/k_BT}$.
- TST is the equilibrium flux through a dividing surface divided by the reactant population, an upper bound on the true rate; harmonic TST (Vineyard) gives prefactors from vibrational frequencies.
- The transmission coefficient $\kappa \le 1$ accounts for recrossing (Bennett–Chandler); variational TST minimises it.
- Kramers' theory: rates rise with friction at low friction, fall as $1/\gamma$ at high friction, with a turnover near TST; the committor is the ideal reaction coordinate.
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

</div>
