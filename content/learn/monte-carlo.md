---
title: "Monte Carlo simulation"
description: "Sampling the Boltzmann distribution without dynamics: the origins of Monte Carlo at Los Alamos, Markov chains, stationary distributions and detailed balance, the Metropolis and Metropolis–Hastings acceptance rules, tuning moves and measuring correlation, Monte Carlo in the canonical, isothermal–isobaric, grand canonical and Gibbs ensembles, configurational-bias, cluster and hybrid moves, and when to choose Monte Carlo over molecular dynamics."
hook: "In 1953, on the MANIAC computer at Los Alamos, five scientists found how to sample the Boltzmann distribution without ever computing the partition function. Their rule fits on one line: always go downhill, go uphill only sometimes."
objectives:
  - "Derive the Metropolis acceptance rule from detailed balance"
  - "Explain why a rejected move must count the old configuration again"
  - "Tune the step size by minimising the integrated autocorrelation time"
  - "Choose Monte Carlo moves for the isothermal–isobaric, grand canonical and Gibbs ensembles"
  - "Compare Monte Carlo with molecular dynamics and pick the right one for a problem"
cover: "cover.svg"
milestones:
  - year: 1949
    text: "Nicholas Metropolis and Stanislaw Ulam publish 'The Monte Carlo method'"
  - year: 1953
    text: "Metropolis, the Rosenbluths and the Tellers introduce the Metropolis algorithm"
  - year: 1970
    text: "W. Keith Hastings generalises the acceptance rule to asymmetric proposals"
  - year: 1987
    text: "Athanassios Panagiotopoulos introduces the Gibbs ensemble for phase coexistence"
track: sampling
weight: 1
level: Core
prereqs: ["ensembles-and-free-energy", "probability", "integrals"]
lab: "Watch Metropolis trial moves being accepted and rejected, and tune the step size for efficiency"
---

## Origins

The averages of statistical mechanics are integrals over all configurations, weighted by the Boltzmann factor, in a space of thousands of dimensions. [The chapter on integrals](../integrals/) showed why such integrals cannot be done on a grid and why random sampling, with an error falling as $1/\sqrt N$ whatever the dimension, is the only practical approach. The question is how to sample. Drawing configurations uniformly at random is useless: almost all of them have overlapping atoms and a Boltzmann weight of essentially zero. The samples must be drawn from the Boltzmann distribution itself.

{{< note type="practice" title="Back of the envelope" >}}
How useless is uniform sampling? For hard spheres the Boltzmann weight is 1 if no two spheres overlap and 0 otherwise, so the fraction of uniformly random configurations that count is exactly $e^{-\beta F_{\text{ex}}}$, where $F_{\text{ex}}$ is the excess free energy. The Carnahan–Starling equation of state gives $\beta F_{\text{ex}}/N = \eta(4 - 3\eta)/(1-\eta)^2$ at packing fraction $\eta$. For a dense liquid, $\eta = 0.45$, that is 3.94 per sphere. A random configuration of only 100 spheres is therefore free of overlaps with probability $e^{-394} \approx 10^{-171}$. Even at $\eta = 0.30$ it is $10^{-82}$. No computer will ever draw one such configuration by chance.
{{< /note >}}

The solution was found at Los Alamos at the dawn of electronic computing. Stanislaw Ulam and John von Neumann had used random sampling for neutron-diffusion calculations in the late 1940s, and Nicholas Metropolis named the approach after the Monte Carlo casino; Metropolis and Ulam described it in 1949. In 1953 Metropolis, Arianna and Marshall Rosenbluth, and Augusta and Edward Teller published "Equation of state calculations by fast computing machines", in which they computed the equation of state of a two-dimensional system of hard disks on the MANIAC computer. Their algorithm, now called the **Metropolis algorithm**, generates a sequence of configurations that visits each one with a frequency proportional to its Boltzmann weight, without ever computing the partition function. It is among the most influential algorithms of the twentieth century.

## Markov chains and detailed balance

The algorithm generates a **Markov chain**: a sequence of configurations in which each new one is chosen at random with a probability that depends only on the current one, $\pi(o \to n)$ from old to new. If the chain is run long enough, it settles into a **stationary distribution** $p(\mathbf x)$ that no longer changes from step to step. The design problem is to choose $\pi$ so that the stationary distribution is the Boltzmann distribution. A sufficient condition is **detailed balance**: in the stationary state, the flow of probability from any configuration to any other is exactly balanced by the reverse flow,

{{< eq title="Detailed balance" say="In equilibrium, as many systems move from o to n per step as move back from n to o." >}}
$$ p(o)\,\pi(o \to n) = p(n)\,\pi(n \to o), \qquad \frac{\pi(o \to n)}{\pi(n \to o)} = \frac{p(n)}{p(o)} = e^{-\beta\,[U(n) - U(o)]} $$
- the partition function cancels in the ratio, so it never needs to be known
- together with **ergodicity** (every configuration can be reached from every other), detailed balance guarantees convergence to $p$
{{< /eq >}}

Detailed balance is stronger than necessary. Stationarity only requires **balance**: the total flow into each configuration equals the total flow out. Detailed balance enforces this pair by pair, which makes it easy to verify for each type of move separately. Some widely used schemes satisfy balance but not detailed balance; the commonest is to visit the particles in a fixed order rather than at random, which Vasilios Manousiouthakis and Michael Deem (1999) showed still converges to the correct distribution.

The transition is split into two stages: propose a trial configuration $n$ with probability $\alpha(o \to n)$, then accept it with probability $\mathrm{acc}(o \to n)$, otherwise keep $o$. If the proposal is symmetric, $\alpha(o \to n) = \alpha(n \to o)$, detailed balance only constrains the ratio of acceptance probabilities, and the Metropolis choice satisfies it in the simplest way:

{{< eq title="The Metropolis acceptance rule" say="Always accept a move downhill in energy; accept a move uphill with probability e to the minus the energy increase over kT." >}}
$$ \mathrm{acc}(o \to n) = \min\!\left(1,\; e^{-\beta\,[U(n) - U(o)]}\right) $$
- for an asymmetric proposal, Hastings's generalisation (1970) multiplies the ratio by $\alpha(n \to o)/\alpha(o \to n)$
- a rejected move still counts: the old configuration is sampled again
{{< /eq >}}

The last point is often missed and causes real errors: when a move is rejected, the current configuration must be counted again in all averages. Discarding rejected steps biases the averages towards configurations that are easy to leave.

Checking that the Metropolis rule satisfies detailed balance takes two lines. Suppose $U(n) > U(o)$. Then $\mathrm{acc}(o \to n) = e^{-\beta[U(n) - U(o)]}$ and $\mathrm{acc}(n \to o) = 1$, so the ratio of acceptances is $e^{-\beta[U(n) - U(o)]} = p(n)/p(o)$, as required. If $U(n) < U(o)$ the roles swap and the same ratio follows. The rule is not unique: Barker's choice (1965), $\mathrm{acc} = 1/(1 + e^{\beta\Delta U})$, also satisfies detailed balance, but it accepts every move with lower probability than Metropolis does, and Peskun (1973) showed that this makes its averages statistically less efficient.

{{< note type="warn" title="Myth" >}}
**Myth:** a rejected move is a wasted step that should not be counted. **Reality:** the chain stays at $x$ for a number of steps whose mean is $1/a(x)$, where $a(x)$ is the average acceptance probability from $x$. That waiting time *is* the Boltzmann weight at work. Recording only accepted configurations samples $p(x)\,a(x)$ instead of $p(x)$, overweighting the high-energy configurations from which almost every move goes downhill.
{{< /note >}}

{{< fig src="rejections.svg" alt="Histogram of a Metropolis chain in a harmonic well that matches the exact Gaussian, and a second, flatter and wider histogram from the same chain when only accepted moves are recorded" caption="One chain of 400,000 steps in $U = x^2/2$ with maximum step 4. Counting every step reproduces the Gaussian, $\langle x^2\rangle = 1.005$. Counting only the 39 % of accepted moves gives a flattened distribution with $\langle x^2\rangle = 1.239$, matching the predicted $p(x)a(x)$ (dashed)." >}}

The numbers in the figure are worth a second look. At $x = 0$, the bottom of the well, only 31 % of moves are accepted, since almost any displacement goes uphill; at $x = 2$, on the wall, 55 % are. Recording only accepted configurations therefore overcounts the wall by nearly a factor of two relative to the bottom, and the error in $\langle x^2\rangle$, 24 %, is far outside any statistical error bar. It does not shrink with longer runs.

### A three-state chain, by hand

The abstractions become concrete for a system with three states, of energies $0$, $k_BT$ and $2k_BT$. From any state, propose one of the other two with probability 1/2 and accept by the Metropolis rule. A move from the ground state to the middle state is accepted with probability $e^{-1} = 0.368$, so the transition probability is $0.5 \times 0.368 = 0.184$; a move downhill is always accepted, so the probability is 0.5; whatever probability is left over is the chance of staying put. Assembled into a matrix, with row $i$ giving the probabilities of going from state $i$ to each state,

$$
\mathsf P = \begin{pmatrix} 0.748 & 0.184 & 0.068 \\ 0.500 & 0.316 & 0.184 \\ 0.500 & 0.500 & 0 \end{pmatrix}.
$$

The Boltzmann distribution, $(1, e^{-1}, e^{-2})/Z = (0.665, 0.245, 0.090)$, is a left eigenvector of $\mathsf P$ with eigenvalue 1, and detailed balance can be checked entry by entry: $0.665 \times 0.184 = 0.245 \times 0.500 = 0.122$.

{{< fig src="three-state.svg" alt="Left: the probabilities of three states converging within about five steps from a start in the highest state to the Boltzmann values. Right: the fraction of time a single simulated chain spends in each state, fluctuating strongly at first and settling onto the Boltzmann values after thousands of steps" caption="Left: started in the top state, the distribution reaches the Boltzmann values (dashed) within five steps, because the second eigenvalue of $\mathsf P$ is only 0.248. Right: a single chain’s time averages converge far more slowly, with errors that fall as one over the square root of the run length." >}}

How fast the chain forgets its starting point is set by the other eigenvalues of $\mathsf P$, here 0.248 and −0.184. The deviation from equilibrium shrinks by a factor of about $1/0.248 \approx 4$ per step, so after six steps it is below $2\times10^{-4}$. The right-hand panel shows the other half of the story: even once the *distribution* has converged, the *estimate* from one chain carries a statistical error, here a few per cent after $10^3$ steps and below 1 % only after $10^4$. In a molecular system the second eigenvalue is so close to 1 that the relaxation takes thousands of sweeps, and both effects, equilibration and correlation, must be measured rather than assumed.

{{< py title="a three-state Metropolis chain" >}}
import numpy as np
E = np.array([0.0, 1.0, 2.0])                 # state energies in units of kBT
P = np.zeros((3, 3))                          # P[i, j]: probability of going from i to j
for i in range(3):
    for j in range(3):
        if i != j:                            # propose j with probability 1/2, accept by Metropolis
            P[i, j] = 0.5 * min(1.0, np.exp(-(E[j] - E[i])))
    P[i, i] = 1.0 - P[i].sum()                # rejected proposals stay put
print("transition matrix:\n", P.round(4))
boltz = np.exp(-E) / np.exp(-E).sum()
print("Boltzmann:", boltz.round(4))
flow = boltz[:, None] * P                     # probability flow i -> j in equilibrium
print("detailed balance holds:", np.allclose(flow, flow.T))
p = np.array([0.0, 0.0, 1.0])                 # start in the highest state
for t in range(1, 7):
    p = p @ P
    print(f"step {t}: p = {p.round(4)}, largest error {np.abs(p - boltz).max():.1e}")
print("eigenvalues:", np.sort(np.linalg.eigvals(P).real).round(4))
{{< /py >}}

## The algorithm in practice

For a system of particles, a Monte Carlo step consists of choosing a particle, displacing it by a random vector drawn uniformly from a small cube of side $2\Delta$, computing the change in energy, and accepting or rejecting by the Metropolis rule. Only the interactions of the moved particle change, so the energy difference costs $O(N)$ (or $O(1)$ with neighbour lists), not a full energy evaluation. One attempted move per particle is a **cycle** or **sweep**.

The figure runs the algorithm for a single coordinate in a double-well potential. Each arrow is a trial move: green if accepted, rose if rejected. The histogram of visited positions converges to the Boltzmann distribution.

{{< widget name="metropolis" title="The Metropolis algorithm, one trial at a time" caption="Top: the potential, the current state (orange) and the last trial move (green accepted, rose rejected). Bottom: the histogram of the chain against the exact Boltzmann distribution. Vary the maximum step and watch the acceptance rate and the integrated autocorrelation time; turn off slow motion to accumulate statistics quickly." >}}

The step size $\Delta$ controls efficiency. Very small steps are almost always accepted but move the system hardly at all, so successive configurations are nearly identical. Very large steps jump far but are almost always rejected, so the system stays put. Between these extremes lies an optimum, which the figure measures through the **integrated autocorrelation time** $\tau_{\text{int}}$: the number of steps needed to produce one effectively independent sample, as defined in [the chapter on probability](../probability/). A common rule of thumb targets an acceptance rate of 30–50 %, but the real criterion is the smallest $\tau_{\text{int}}$ for the quantities of interest, and in a double well the optimal step may be the one that can occasionally jump the barrier. Codes adjust $\Delta$ during equilibration to reach a target acceptance, then keep it fixed during production, because changing the move during sampling breaks detailed balance.

{{< note type="try" title="Pause and predict" >}}
What acceptance rate minimises the correlation time? Guess before reading on. For random-walk Metropolis on a smooth target, Gareth Roberts, Andrew Gelman and Walter Gilks (1997) proved that in the limit of many dimensions the optimum is an acceptance of 0.234, and for a one-dimensional Gaussian it is about 0.44. Both are well below the 0.5 that intuition suggests: it pays to be bold and be rejected often. In the interactive figure above, sweep the maximum step and note the acceptance rate at which the integrated autocorrelation time is smallest; in a double well it is often lower still, because the best steps are long enough to jump the barrier.
{{< /note >}}

### Error bars, equilibration and ergodicity

A Monte Carlo average from $M$ correlated samples has a statistical error $\sigma\sqrt{2\tau_{\text{int}}/M}$, where $\sigma$ is the standard deviation of the quantity and $\tau_{\text{int}}$ its integrated autocorrelation time in steps. A run of $10^6$ sweeps with $\tau_{\text{int}} = 50$ sweeps therefore contains about $10^4$ independent samples, and its error is 1 % of $\sigma$. In practice $\tau_{\text{int}}$ is estimated by **block averaging**: split the run into blocks, compute the standard error of the block means, and increase the block length until the estimate stops growing ([the chapter on probability](../probability/)).

The start of a run must be discarded, because the initial configuration (often a lattice or a random packing) is not typical of equilibrium. The standard checks are to plot the energy and density against the number of sweeps and discard everything before they plateau, and to start two or more chains from very different configurations and confirm that they reach the same averages.

That second check also guards against the most dangerous failure: **broken ergodicity**. Detailed balance guarantees the right answer only if every relevant configuration can be reached in the available time. A chain in one well of a double well with a barrier of $20\,k_BT$ will need of order $e^{20} \approx 5\times10^8$ attempts to cross, and until it does, its averages look converged, with small error bars, and are wrong. Larger steps, the cluster and replica-exchange moves described below, and the enhanced-sampling methods of [the metadynamics chapter](../es-metadynamics/) are the remedies.

{{< note type="warn" title="Random numbers matter" >}}
Every acceptance test consumes a random number, so a production run uses $10^{9}$ or more of them, and any correlation between them can bias the result. Alan Ferrenberg, David Landau and Joanna Wong (1992) found that the Wolff cluster algorithm gave measurably wrong energies and specific heats for the two-dimensional Ising model, whose exact solution is known, with random number generators that had passed the standard statistical tests. Use a modern, well-tested generator (NumPy's `default_rng`, which is PCG64, or a Mersenne Twister), seed it explicitly, and never reuse one stream for parallel chains.
{{< /note >}}

## Monte Carlo in other ensembles

Molecular dynamics naturally samples the microcanonical ensemble, and other ensembles require thermostats and barostats. Monte Carlo is the opposite: ensembles are chosen simply by choosing which moves to make and how to accept them, each derived from detailed balance in that ensemble.

{{< fig src="moves.svg" alt="Four schematic simulation boxes: a single particle displaced, a box being enlarged with its particles rescaled, a box with one particle being inserted and one deleted, and two boxes labelled liquid and vapour exchanging particles and volume" caption="The ensemble is set by the move set. Every scheme keeps the displacement move and adds one more: a volume change for NPT, insertions and deletions for the grand canonical ensemble, and exchanges of volume and particles between two boxes for the Gibbs ensemble." >}}

In the **isothermal–isobaric** (NPT) ensemble, the volume becomes a variable. A volume move rescales the box and all positions from $V$ to $V'$ and is accepted with

$$
\mathrm{acc} = \min\!\left(1,\; \exp\!\Big\{-\beta\big[U(n) - U(o) + P(V' - V)\big] + N\ln\frac{V'}{V}\Big\}\right),
$$

where the last term comes from the change in the volume available to $N$ scaled coordinates (for moves uniform in $V$).

The origin of that term is a change of variables. Writing each position as $\mathbf r_i = L\mathbf s_i$, with $\mathbf s_i$ in the unit cube, turns the configurational integral $\int_V \mathrm d\mathbf r^N$ into $V^N\int \mathrm d\mathbf s^N$, so the NPT weight of a configuration is $V^N e^{-\beta(U + PV)}$. The ratio of these weights for $V'$ and $V$ is the acceptance above. Codes often make moves uniform in $\ln V$ instead, which samples large and small boxes more evenly; the Jacobian then changes $N$ to $N + 1$. Volume moves cost a full energy evaluation, because every distance changes, so they are attempted about once per sweep rather than once per particle.

In the **grand canonical** ($\mu VT$) ensemble, particles are inserted at random positions and deleted at random, with

$$
\mathrm{acc}(\text{insert}) = \min\!\left(1,\; \frac{V}{\Lambda^3(N + 1)}\,e^{\beta[\mu - \Delta U]}\right), \qquad
\mathrm{acc}(\text{delete}) = \min\!\left(1,\; \frac{\Lambda^3 N}{V}\,e^{-\beta[\mu + \Delta U]}\right),
$$

where $\Lambda$ is the thermal wavelength. Grand canonical Monte Carlo is the standard method for computing adsorption isotherms of gases in porous materials such as zeolites and metal–organic frameworks, with the chemical potential set from the gas pressure through an equation of state; codes such as RASPA are built around it.

When the reservoir is an ideal gas, the chemical potential is $\mu = k_BT\ln(\beta P\Lambda^3)$, and the thermal wavelength cancels: the insertion rule becomes $\min\!\big(1,\ \beta P V e^{-\beta\Delta U}/(N+1)\big)$, with the pressure replaced by the fugacity for a real gas. The acceptance of insertions then reads directly as a physical quantity. Averaging $e^{-\beta\Delta U}$ over random trial insertions of a single molecule into an otherwise empty framework gives the **Henry coefficient**, the slope of the isotherm at zero pressure; this is Benjamin Widom's test-particle method (1963), which also gives the excess chemical potential of a liquid as $\mu_{\text{ex}} = -k_BT\ln\langle e^{-\beta\Delta U}\rangle$.

{{< note type="practice" title="From the lab" >}}
A typical screening study of CO₂ capture in metal–organic frameworks runs grand canonical Monte Carlo at 298 K and pressures from 0.01 to 1 bar for each candidate structure. The framework is held rigid, with Lennard-Jones parameters from a generic force field such as UFF or DREIDING and partial charges fitted to the electrostatic potential of a DFT calculation; CO₂ uses the three-site TraPPE model of Potoff and Siepmann, with a quadrupole represented by charges on the carbon and oxygens. Each pressure point needs a few thousand cycles of equilibration and a few thousand of production. Three checks catch most errors: the simulation box must be at least twice the cut-off in every perpendicular width, which often means several unit cells; pockets that are inaccessible from the main channels must be blocked, or GCMC will fill them with molecules that could never get there; and simulations give **absolute** adsorption, while volumetric experiments report **excess** adsorption, so the two must be converted using the pore volume before they are compared.
{{< /note >}}

The **Gibbs ensemble** method of Athanassios Panagiotopoulos (1987) simulates two coexisting phases in two separate boxes without an interface, exchanging volume and particles between them so that pressure and chemical potential equalise; it gives liquid–vapour coexistence curves directly.

Three kinds of move run side by side: displacements within each box, a volume move that grows one box while shrinking the other by the same amount, and transfers of a particle from one box to the other, accepted with the product of a deletion and an insertion probability. At coexistence the two boxes settle at the liquid and vapour densities. The method has two limits. Close to the critical point the two phases become similar, and the boxes swap identities back and forth, so the densities must be read from a histogram rather than per box. At high liquid densities, or for large molecules, nearly every transfer into the liquid box overlaps, and the method needs configurational-bias insertions to work at all.

## Smarter moves

The freedom to invent moves is Monte Carlo's great strength: moves need not be physical, only correct. Inserting a long chain molecule at a random position almost always produces an overlap and is rejected. **Configurational-bias Monte Carlo** (J. Ilja Siepmann and Daan Frenkel; Frenkel, G. C. A. M. Mooij and Berend Smit, 1992) grows the chain segment by segment, choosing each segment among several trial positions with probability proportional to its Boltzmann weight, and corrects for the bias in the acceptance rule with a Rosenbluth weight; it made simulations of alkanes in zeolites and of polymer melts practical. **Cluster moves**, such as the Swendsen–Wang (1987) and Wolff (1989) algorithms for spin models, flip whole correlated clusters at once and largely eliminate critical slowing down near phase transitions ([the chapter on phase transitions](../phase-transitions-ising/)). **Hybrid Monte Carlo** (Simon Duane, Anthony Kennedy, Brian Pendleton and Duncan Roweth, 1987) proposes a new configuration by running a short molecular dynamics trajectory with random initial velocities, and accepts it with a Metropolis test on the change in total energy, combining the large collective moves of dynamics with the exactness of Monte Carlo. **Replica-exchange** moves between simulations at different temperatures are also Monte Carlo moves ([the chapter on replica exchange](../es-replica-exchange/)).

## Monte Carlo or molecular dynamics?

Both sample equilibrium ensembles, and for equilibrium properties the choice is practical. Molecular dynamics provides genuine time evolution and therefore transport properties and kinetics; it moves all particles collectively and parallelises naturally; and it needs forces, which every modern potential supplies. Monte Carlo provides no dynamics (its "time" is the number of trials), but it can sample ensembles with fluctuating particle numbers, use unphysical moves that jump over barriers, handle discontinuous potentials such as hard spheres, and needs only energy differences. Systems with discrete degrees of freedom, such as lattice models, alloy orderings and adsorption, are natural for Monte Carlo; liquids, biomolecules and anything requiring dynamics are natural for MD. Kinetic Monte Carlo, discussed in [the chapter on rates](../es-rates/), is a different method that uses rates to generate true stochastic dynamics.

Alloys show the difference clearly. Chemical ordering or segregation in a solid such as Cu–Au or a Ni-based superalloy proceeds by vacancy-mediated diffusion, which at room temperature takes hours to years: far beyond MD. A Monte Carlo **swap move**, which exchanges the species of two atoms of different elements and is accepted by the Metropolis rule, reaches the equilibrium arrangement in a few thousand sweeps, and hybrid schemes that alternate swap moves with short MD runs, so that the lattice relaxes around each new arrangement, are now standard for studying segregation to grain boundaries and surfaces. The price is that the path the system took is lost; only the end state is physical.

{{< note type="key" >}}
- Monte Carlo samples the Boltzmann distribution with a Markov chain; detailed balance $p(o)\pi(o\to n) = p(n)\pi(n\to o)$ and ergodicity guarantee convergence without knowing $Z$.
- Metropolis acceptance: $\min(1, e^{-\beta\Delta U})$ for symmetric proposals; rejected moves re-count the old configuration.
- Tune the step size for the smallest integrated autocorrelation time, then fix it for production.
- The error of an average is $\sigma\sqrt{2\tau_{\text{int}}/M}$; small error bars do not prove ergodic sampling, so start several chains from different configurations.
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
- q: "In a three-state Metropolis chain, the second-largest eigenvalue of the transition matrix is 0.25. Roughly how many steps does it take for the deviation from equilibrium to fall by a factor of a million?"
  options: ["About 10", "About 100", "About 1000"]
  answer: 0
  why: "The deviation shrinks by a factor of 4 per step, and $4^{10} \\approx 10^6$."
- q: "A Metropolis chain in a double well with a 20 $k_BT$ barrier gives an average with a tiny error bar after $10^6$ steps, all in one well. What is wrong?"
  options: ["Nothing: a small error bar means convergence", "The chain is not ergodic on this time scale; it would need of order $e^{20} \\approx 5\\times10^8$ attempts to cross", "The acceptance rate is too high"]
  answer: 1
  why: "Error bars measure fluctuations within the region visited. Start chains in both wells, or use replica exchange or metadynamics to cross the barrier."
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
10. B. Widom, "Some topics in the theory of fluids", *Journal of Chemical Physics* **39**, 2808–2812 (1963).
11. P. H. Peskun, "Optimum Monte-Carlo sampling using Markov chains", *Biometrika* **60**, 607–612 (1973).
12. G. O. Roberts, A. Gelman and W. R. Gilks, "Weak convergence and optimal scaling of random walk Metropolis algorithms", *Annals of Applied Probability* **7**, 110–120 (1997).
13. V. I. Manousiouthakis and M. W. Deem, "Strict detailed balance is unnecessary in Monte Carlo simulation", *Journal of Chemical Physics* **110**, 2753–2756 (1999).
14. A. M. Ferrenberg, D. P. Landau and Y. J. Wong, "Monte Carlo simulations: hidden errors from 'good' random number generators", *Physical Review Letters* **69**, 3382–3384 (1992).

</div>
