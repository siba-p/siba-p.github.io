---
title: "Replica exchange, tempering and accelerated dynamics"
description: "Enhanced sampling without collective variables: heating to cross barriers, parallel tempering and replica-exchange MD, the exchange acceptance rule from detailed balance, designing temperature ladders, Hamiltonian replica exchange and REST2 solute tempering, simulated tempering, combinations with metadynamics, and boost-potential methods (accelerated MD and Gaussian-accelerated MD)."
track: rl-bias
weight: 3
level: Advanced
prereqs: ["es-opes-abf", "monte-carlo"]
lab: "Run a ladder of replicas on a rugged landscape, with and without exchanges, and compare the low-temperature sampling"
---

## Heating without losing the low-temperature ensemble

The collective-variable methods of the previous topics accelerate sampling along chosen coordinates. A blunter but more general way to cross barriers is to raise the temperature: at high $T$, barriers that are many $k_BT$ high at room temperature become small, and the system explores freely. The difficulty is that the high-temperature ensemble is not the one we want. The idea of **tempering** is to run at high temperature to explore, and at low temperature to sample correctly, letting configurations move between the two in a way that preserves the correct distribution at every temperature.

## Parallel tempering and replica exchange

**Parallel tempering**, or replica exchange, runs $M$ copies (replicas) of the system simultaneously at temperatures $T_1 < T_2 < \cdots < T_M$, each sampling its own canonical ensemble. Periodically, a swap of configurations between two replicas is attempted and accepted with a probability that keeps every replica's ensemble exact. The method was introduced for spin glasses by Robert Swendsen and Jian-Sheng Wang (1986), generalised by Charles Geyer (1991) and by Koji Hukushima and Koji Nemoto (1996) as exchange Monte Carlo, and brought to molecular dynamics by Yuji Sugita and Yuko Okamoto in 1999 as **replica-exchange molecular dynamics** (REMD).

The acceptance rule follows from detailed balance in the extended ensemble of all replicas, whose probability is a product of Boltzmann factors. Swapping configurations $\mathbf x_i$ and $\mathbf x_j$ between temperatures $T_i$ and $T_j$ changes that product by a factor that depends only on the two energies:

{{< eq title="Replica-exchange acceptance" say="A swap is always accepted if it moves the lower-energy configuration to the colder replica; otherwise it is accepted with a Boltzmann-like probability." >}}
$$ P_{\text{acc}}(i \leftrightarrow j) = \min\!\Big(1,\; \exp\big[(\beta_i - \beta_j)\big(U(\mathbf x_i) - U(\mathbf x_j)\big)\big]\Big) $$
- $\beta = 1/k_BT$; in molecular dynamics, velocities are rescaled by $\sqrt{T_{\text{new}}/T_{\text{old}}}$ after an accepted swap so that kinetic energies match
- every replica continues to sample its exact canonical ensemble
{{< /eq >}}

Each configuration therefore performs a random walk in temperature: it heats up, crosses barriers easily, cools down, and is sampled at the target temperature in a new basin. The figure runs a ladder of walkers by Metropolis Monte Carlo on a rugged one-dimensional landscape with several wells separated by barriers of several $k_BT$ at the lowest temperature.

{{< widget name="remd" title="Parallel tempering on a rugged landscape" caption="Top: one walker per temperature, coloured from blue (T = 1) to red (T_max), on the landscape. Bottom: the histogram of the T = 1 replica against the exact Boltzmann distribution. Turn exchanges off and on, and vary the number of replicas and the highest temperature." >}}

Without exchanges, the lowest-temperature walker stays in its starting well, and its histogram covers one well only, a large error in the sampled distribution. With exchanges, configurations visited at high temperature flow down the ladder, and the lowest-temperature histogram converges to the full Boltzmann distribution across all wells. Reduce the number of replicas while keeping $T_{\max}$ fixed and the acceptance falls: neighbouring temperatures are now so different that their energy distributions do not overlap, and swaps are almost always rejected.

## Designing the ladder

The acceptance between neighbouring replicas depends on the overlap of their potential-energy distributions. For a system with $N$ degrees of freedom, the energy fluctuates by $\sim\sqrt N$ while its mean changes with temperature by $\sim N$, so the temperature spacing must shrink as $1/\sqrt N$ and the number of replicas needed to span a given range grows as $\sqrt N$, as David Kofke analysed in 2002. A solvated protein of tens of thousands of atoms needs dozens to hundreds of replicas to span 300–450 K, which is the main cost of the method. Temperatures are usually spaced geometrically, giving roughly uniform acceptance, with target acceptance rates around 20–30 %; the highest temperature must be high enough to cross the relevant barriers quickly, but not so high that the system spends its time in irrelevant high-energy states, such as an unfolded protein that takes long to refold.

## Hamiltonian replica exchange and REST

For large solvated systems, most of the energy fluctuation comes from the solvent, which is why so many replicas are needed. **Hamiltonian replica exchange** (Hiroaki Fukunishi, Osamu Watanabe and Shoji Takada, 2002) instead varies the Hamiltonian across replicas, for example by scaling particular interactions, while keeping the temperature fixed; the acceptance rule involves the energies of each configuration under both Hamiltonians. **Replica exchange with solute tempering** (REST, Pu Liu, Byungchan Kim, Richard Friesner and Bruce Berne, 2005) and its improved form REST2 (Lingle Wang, Friesner and Berne, 2011) scale only the interactions involving a solute, which is equivalent to heating the solute while the solvent stays cold. Because only a small part of the system is effectively heated, far fewer replicas are needed. REST2 is widely used for protein–ligand binding and peptide conformations, and as a component of alchemical free-energy protocols.

## Simulated tempering and expanded ensembles

**Simulated tempering** (Enzo Marinari and Giorgio Parisi, 1992) achieves the same random walk in temperature with a single simulation, by treating the temperature as a dynamical variable that changes by Monte Carlo moves. To make the walk uniform it needs weights for each temperature, essentially the free energy at each temperature, which must be learned; adaptive schemes such as Wang–Landau-style updating or the OPES expanded-ensemble method of [the previous topic](../es-opes-abf/) provide them. The single-simulation approach avoids running many replicas but is harder to tune.

## Combinations and boost potentials

Tempering and collective-variable biasing are complementary: tempering helps all degrees of freedom a little, while CV biasing helps a few degrees of freedom a lot. **Parallel-tempering metadynamics** (Giovanni Bussi, Francesco Gervasio, Alessandro Laio and Michele Parrinello, 2006) combines them, and many protocols use replica exchange between umbrella windows to reduce hidden barriers in orthogonal coordinates.

A different CV-free strategy adds a **boost potential** that raises the energy of low-lying regions without changing the high ones, flattening the landscape everywhere at once. **Accelerated MD** (Donald Hamelberg, John Mongan and Andrew McCammon, 2004) adds, whenever the potential energy $U$ is below a threshold $E$, the boost $\Delta U = (E - U)^2/(\alpha + E - U)$. **Gaussian-accelerated MD** (GaMD, Yinglong Miao, Victoria Feher and McCammon, 2015) uses a harmonic boost $\Delta U = \tfrac12 k(E - U)^2$, chosen so that the distribution of boost energies is nearly Gaussian, which makes reweighting by a cumulant expansion accurate. Both are implemented in AMBER and other codes and are popular for exploring protein conformational changes, but reweighting becomes noisy for large boosts and large systems, which limits their use for accurate free energies.

{{< note type="key" >}}
- Replica exchange runs replicas at a ladder of temperatures and swaps configurations with probability $\min(1, e^{(\beta_i - \beta_j)(U_i - U_j)})$, preserving every ensemble exactly.
- Configurations random-walk in temperature: they cross barriers when hot and are sampled correctly when cold.
- The number of replicas grows as $\sqrt N$; geometric spacing and 20–30 % acceptance are typical.
- Hamiltonian exchange and REST2 heat only part of the system and need far fewer replicas; simulated tempering does the walk in one simulation with learned weights.
- Boost-potential methods (aMD, GaMD) flatten the whole landscape without CVs but reweighting is noisy for large boosts.
{{< /note >}}

{{< quiz >}}
- q: "A swap moves the lower-energy configuration from the hot replica to the cold one. It is accepted with probability…"
  options: ["0", "1", "1/2"]
  answer: 1
  why: "(β_cold − β_hot)(U_cold − U_hot) > 0 in that case, so the exponent is positive and the move is always accepted."
- q: "Why does a large solvated protein need many replicas in temperature REMD?"
  options: ["Proteins are slow", "Energy fluctuations grow as √N while energy differences grow as N, so neighbouring temperatures must be close to keep overlap", "The force field is inaccurate"]
  answer: 1
  why: "The number of replicas scales roughly as √N."
- q: "What does REST2 heat effectively?"
  options: ["The whole system", "Only the solute's interactions, so far fewer replicas are needed", "Only the solvent"]
  answer: 1
  why: "Scaling solute interactions is equivalent to heating the solute alone."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. R. H. Swendsen and J.-S. Wang, "Replica Monte Carlo simulation of spin-glasses", *Physical Review Letters* **57**, 2607–2609 (1986).
2. K. Hukushima and K. Nemoto, "Exchange Monte Carlo method and application to spin glass simulations", *Journal of the Physical Society of Japan* **65**, 1604–1608 (1996).
3. Y. Sugita and Y. Okamoto, "Replica-exchange molecular dynamics method for protein folding", *Chemical Physics Letters* **314**, 141–151 (1999).
4. D. A. Kofke, "On the acceptance probability of replica-exchange Monte Carlo trials", *Journal of Chemical Physics* **117**, 6911–6914 (2002).
5. H. Fukunishi, O. Watanabe and S. Takada, "On the Hamiltonian replica exchange method for efficient sampling of biomolecular systems: application to protein structure prediction", *Journal of Chemical Physics* **116**, 9058–9067 (2002).
6. P. Liu, B. Kim, R. A. Friesner and B. J. Berne, "Replica exchange with solute tempering: a method for sampling biological systems in explicit water", *Proceedings of the National Academy of Sciences* **102**, 13749–13754 (2005).
7. L. Wang, R. A. Friesner and B. J. Berne, "Replica exchange with solute scaling: a more efficient version of replica exchange with solute tempering (REST2)", *Journal of Physical Chemistry B* **115**, 9431–9438 (2011).
8. E. Marinari and G. Parisi, "Simulated tempering: a new Monte Carlo scheme", *Europhysics Letters* **19**, 451–458 (1992).
9. G. Bussi, F. L. Gervasio, A. Laio and M. Parrinello, "Free-energy landscape for β hairpin folding from combined parallel tempering and metadynamics", *Journal of the American Chemical Society* **128**, 13435–13441 (2006).
10. D. Hamelberg, J. Mongan and J. A. McCammon, "Accelerated molecular dynamics: a promising and efficient simulation method for biomolecules", *Journal of Chemical Physics* **120**, 11919–11929 (2004).
11. Y. Miao, V. A. Feher and J. A. McCammon, "Gaussian accelerated molecular dynamics: unconstrained enhanced sampling and free energy calculation", *Journal of Chemical Theory and Computation* **11**, 3584–3595 (2015).

</div>
