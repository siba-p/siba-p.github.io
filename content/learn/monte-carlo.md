---
title: "Monte Carlo simulation"
description: "Sampling the Boltzmann distribution without dynamics: the origins of Monte Carlo at Los Alamos, Markov chains, stationary distributions and detailed balance, the Metropolis and Metropolis–Hastings acceptance rules, tuning moves and measuring correlation, Monte Carlo in the canonical, isothermal–isobaric, grand canonical and Gibbs ensembles, configurational-bias, cluster and hybrid moves, and when to choose Monte Carlo over molecular dynamics."
track: sampling
weight: 1
level: Core
prereqs: ["ensembles-and-free-energy", "probability", "integrals"]
lab: "Watch Metropolis trial moves being accepted and rejected, and tune the step size for efficiency"
---

## Origins

The averages of statistical mechanics are integrals over all configurations, weighted by the Boltzmann factor, in a space of thousands of dimensions. [The chapter on integrals](../integrals/) showed why such integrals cannot be done on a grid and why random sampling, with an error falling as $1/\sqrt N$ whatever the dimension, is the only practical approach. The question is how to sample. Drawing configurations uniformly at random is useless: almost all of them have overlapping atoms and a Boltzmann weight of essentially zero. The samples must be drawn from the Boltzmann distribution itself.

The solution was found at Los Alamos at the dawn of electronic computing. Stanislaw Ulam and John von Neumann had used random sampling for neutron-diffusion calculations in the late 1940s, and Nicholas Metropolis named the approach after the Monte Carlo casino; Metropolis and Ulam described it in 1949. In 1953 Metropolis, Arianna and Marshall Rosenbluth, and Augusta and Edward Teller published "Equation of state calculations by fast computing machines", in which they computed the equation of state of a two-dimensional system of hard disks on the MANIAC computer. Their algorithm, now called the **Metropolis algorithm**, generates a sequence of configurations that visits each one with a frequency proportional to its Boltzmann weight, without ever computing the partition function. It is among the most influential algorithms of the twentieth century.

## Markov chains and detailed balance

The algorithm generates a **Markov chain**: a sequence of configurations in which each new one is chosen at random with a probability that depends only on the current one, $\pi(o \to n)$ from old to new. If the chain is run long enough, it settles into a **stationary distribution** $p(\mathbf x)$ that no longer changes from step to step. The design problem is to choose $\pi$ so that the stationary distribution is the Boltzmann distribution. A sufficient condition is **detailed balance**: in the stationary state, the flow of probability from any configuration to any other is exactly balanced by the reverse flow,

{{< eq title="Detailed balance" say="In equilibrium, as many systems move from o to n per step as move back from n to o." >}}
$$ p(o)\,\pi(o \to n) = p(n)\,\pi(n \to o), \qquad \frac{\pi(o \to n)}{\pi(n \to o)} = \frac{p(n)}{p(o)} = e^{-\beta\,[U(n) - U(o)]} $$
- the partition function cancels in the ratio, so it never needs to be known
- together with **ergodicity** (every configuration can be reached from every other), detailed balance guarantees convergence to $p$
{{< /eq >}}

The transition is split into two stages: propose a trial configuration $n$ with probability $\alpha(o \to n)$, then accept it with probability $\mathrm{acc}(o \to n)$, otherwise keep $o$. If the proposal is symmetric, $\alpha(o \to n) = \alpha(n \to o)$, detailed balance only constrains the ratio of acceptance probabilities, and the Metropolis choice satisfies it in the simplest way:

{{< eq title="The Metropolis acceptance rule" say="Always accept a move downhill in energy; accept a move uphill with probability e to the minus the energy increase over kT." >}}
$$ \mathrm{acc}(o \to n) = \min\!\left(1,\; e^{-\beta\,[U(n) - U(o)]}\right) $$
- for an asymmetric proposal, Hastings's generalisation (1970) multiplies the ratio by $\alpha(n \to o)/\alpha(o \to n)$
- a rejected move still counts: the old configuration is sampled again
{{< /eq >}}

The last point is often missed and causes real errors: when a move is rejected, the current configuration must be counted again in all averages. Discarding rejected steps biases the averages towards configurations that are easy to leave.

## The algorithm in practice

For a system of particles, a Monte Carlo step consists of choosing a particle, displacing it by a random vector drawn uniformly from a small cube of side $2\Delta$, computing the change in energy, and accepting or rejecting by the Metropolis rule. Only the interactions of the moved particle change, so the energy difference costs $O(N)$ (or $O(1)$ with neighbour lists), not a full energy evaluation. One attempted move per particle is a **cycle** or **sweep**.

The figure runs the algorithm for a single coordinate in a double-well potential. Each arrow is a trial move: green if accepted, rose if rejected. The histogram of visited positions converges to the Boltzmann distribution.

{{< widget name="metropolis" title="The Metropolis algorithm, one trial at a time" caption="Top: the potential, the current state (orange) and the last trial move (green accepted, rose rejected). Bottom: the histogram of the chain against the exact Boltzmann distribution. Vary the maximum step and watch the acceptance rate and the integrated autocorrelation time; turn off slow motion to accumulate statistics quickly." >}}

The step size $\Delta$ controls efficiency. Very small steps are almost always accepted but move the system hardly at all, so successive configurations are nearly identical. Very large steps jump far but are almost always rejected, so the system stays put. Between these extremes lies an optimum, which the figure measures through the **integrated autocorrelation time** $\tau_{\text{int}}$: the number of steps needed to produce one effectively independent sample, as defined in [the chapter on probability](../probability/). A common rule of thumb targets an acceptance rate of 30–50 %, but the real criterion is the smallest $\tau_{\text{int}}$ for the quantities of interest, and in a double well the optimal step may be the one that can occasionally jump the barrier. Codes adjust $\Delta$ during equilibration to reach a target acceptance, then keep it fixed during production, because changing the move during sampling breaks detailed balance.

## Monte Carlo in other ensembles

Molecular dynamics naturally samples the microcanonical ensemble, and other ensembles require thermostats and barostats. Monte Carlo is the opposite: ensembles are chosen simply by choosing which moves to make and how to accept them, each derived from detailed balance in that ensemble.

In the **isothermal–isobaric** (NPT) ensemble, the volume becomes a variable. A volume move rescales the box and all positions from $V$ to $V'$ and is accepted with

$$
\mathrm{acc} = \min\!\left(1,\; \exp\!\Big\{-\beta\big[U(n) - U(o) + P(V' - V)\big] + N\ln\frac{V'}{V}\Big\}\right),
$$

where the last term comes from the change in the volume available to $N$ scaled coordinates (for moves uniform in $V$).

In the **grand canonical** ($\mu VT$) ensemble, particles are inserted at random positions and deleted at random, with

$$
\mathrm{acc}(\text{insert}) = \min\!\left(1,\; \frac{V}{\Lambda^3(N + 1)}\,e^{\beta[\mu - \Delta U]}\right), \qquad
\mathrm{acc}(\text{delete}) = \min\!\left(1,\; \frac{\Lambda^3 N}{V}\,e^{-\beta[\mu + \Delta U]}\right),
$$

where $\Lambda$ is the thermal wavelength. Grand canonical Monte Carlo is the standard method for computing adsorption isotherms of gases in porous materials such as zeolites and metal–organic frameworks, with the chemical potential set from the gas pressure through an equation of state; codes such as RASPA are built around it.

The **Gibbs ensemble** method of Athanassios Panagiotopoulos (1987) simulates two coexisting phases in two separate boxes without an interface, exchanging volume and particles between them so that pressure and chemical potential equalise; it gives liquid–vapour coexistence curves directly.

## Smarter moves

The freedom to invent moves is Monte Carlo's great strength: moves need not be physical, only correct. Inserting a long chain molecule at a random position almost always produces an overlap and is rejected. **Configurational-bias Monte Carlo** (J. Ilja Siepmann and Daan Frenkel; Frenkel, G. C. A. M. Mooij and Berend Smit, 1992) grows the chain segment by segment, choosing each segment among several trial positions with probability proportional to its Boltzmann weight, and corrects for the bias in the acceptance rule with a Rosenbluth weight; it made simulations of alkanes in zeolites and of polymer melts practical. **Cluster moves**, such as the Swendsen–Wang (1987) and Wolff (1989) algorithms for spin models, flip whole correlated clusters at once and largely eliminate critical slowing down near phase transitions ([the chapter on phase transitions](../phase-transitions-ising/)). **Hybrid Monte Carlo** (Simon Duane, Anthony Kennedy, Brian Pendleton and Duncan Roweth, 1987) proposes a new configuration by running a short molecular dynamics trajectory with random initial velocities, and accepts it with a Metropolis test on the change in total energy, combining the large collective moves of dynamics with the exactness of Monte Carlo. **Replica-exchange** moves between simulations at different temperatures are also Monte Carlo moves ([the chapter on replica exchange](../es-replica-exchange/)).

## Monte Carlo or molecular dynamics?

Both sample equilibrium ensembles, and for equilibrium properties the choice is practical. Molecular dynamics provides genuine time evolution and therefore transport properties and kinetics; it moves all particles collectively and parallelises naturally; and it needs forces, which every modern potential supplies. Monte Carlo provides no dynamics (its "time" is the number of trials), but it can sample ensembles with fluctuating particle numbers, use unphysical moves that jump over barriers, handle discontinuous potentials such as hard spheres, and needs only energy differences. Systems with discrete degrees of freedom, such as lattice models, alloy orderings and adsorption, are natural for Monte Carlo; liquids, biomolecules and anything requiring dynamics are natural for MD. Kinetic Monte Carlo, discussed in [the chapter on rates](../es-rates/), is a different method that uses rates to generate true stochastic dynamics.

{{< note type="key" >}}
- Monte Carlo samples the Boltzmann distribution with a Markov chain; detailed balance $p(o)\pi(o\to n) = p(n)\pi(n\to o)$ and ergodicity guarantee convergence without knowing $Z$.
- Metropolis acceptance: $\min(1, e^{-\beta\Delta U})$ for symmetric proposals; rejected moves re-count the old configuration.
- Tune the step size for the smallest integrated autocorrelation time, then fix it for production.
- Ensembles are chosen by moves: volume moves (NPT), insertions and deletions (grand canonical), box exchanges (Gibbs ensemble).
- Configurational-bias, cluster, hybrid and replica-exchange moves exploit the freedom to use unphysical moves; MD gives dynamics, MC gives flexibility.
{{< /note >}}

{{< quiz >}}
- q: "A trial move raises the energy by 2 k_BT. With what probability is it accepted?"
  options: ["0", "e⁻² ≈ 0.14", "0.5"]
  answer: 1
  why: "Metropolis: min(1, e^(−ΔU/k_BT)) = e^(−2)."
- q: "A program discards rejected moves instead of counting the old configuration again. What happens?"
  options: ["Nothing", "Averages are biased towards configurations that are easy to leave", "The acceptance rate rises"]
  answer: 1
  why: "Each step must contribute a sample, accepted or not."
- q: "Why does grand canonical Monte Carlo suit adsorption in porous materials?"
  options: ["It is faster than MD for diffusion", "Particles can be inserted and deleted at a chemical potential set by the gas pressure, so the loading equilibrates directly", "It needs no potential"]
  answer: 1
  why: "The adsorbed amount at given μ and T is exactly what an isotherm measures."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. N. Metropolis and S. Ulam, "The Monte Carlo method", *Journal of the American Statistical Association* **44**, 335–341 (1949).
2. N. Metropolis, A. W. Rosenbluth, M. N. Rosenbluth, A. H. Teller and E. Teller, "Equation of state calculations by fast computing machines", *Journal of Chemical Physics* **21**, 1087–1092 (1953).
3. W. K. Hastings, "Monte Carlo sampling methods using Markov chains and their applications", *Biometrika* **57**, 97–109 (1970).
4. A. Z. Panagiotopoulos, "Direct determination of phase coexistence properties of fluids by Monte Carlo simulation in a new ensemble", *Molecular Physics* **61**, 813–826 (1987).
5. J. I. Siepmann and D. Frenkel, "Configurational bias Monte Carlo: a new sampling scheme for flexible chains", *Molecular Physics* **75**, 59–70 (1992).
6. S. Duane, A. D. Kennedy, B. J. Pendleton and D. Roweth, "Hybrid Monte Carlo", *Physics Letters B* **195**, 216–222 (1987).
7. D. Frenkel and B. Smit, *Understanding Molecular Simulation*, 3rd ed., Academic Press (2023), chapters 3, 6, 10 and 13.
8. D. P. Landau and K. Binder, *A Guide to Monte Carlo Simulations in Statistical Physics*, 5th ed., Cambridge University Press (2021).
9. D. Dubbeldam, S. Calero, D. E. Ellis and R. Q. Snurr, "RASPA: molecular simulation software for adsorption and diffusion in flexible nanoporous materials", *Molecular Simulation* **42**, 81–101 (2016).

</div>
