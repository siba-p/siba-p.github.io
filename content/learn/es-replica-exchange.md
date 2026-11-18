---
title: "Replica exchange and tempering"
description: "Enhanced sampling without collective variables: heating to cross barriers, parallel tempering and replica-exchange MD, the exchange acceptance rule from detailed balance, designing temperature ladders, Hamiltonian replica exchange and REST2 solute tempering, simulated tempering, combinations with metadynamics, and boost-potential methods (accelerated MD and Gaussian-accelerated MD)."
hook: "Plain molecular dynamics of a seven-atom cluster stayed trapped for at least 1400 time units; with replica exchange, the coldest copy reached the ground state in 47. Swapping configurations between temperatures, done right, changes no ensemble at all."
objectives:
  - "Derive the replica-exchange acceptance rule from detailed balance in the extended ensemble"
  - "Design a temperature ladder with enough energy overlap between neighbouring replicas"
  - "Explain why the number of replicas grows as the square root of system size"
  - "Compare Hamiltonian exchange, REST2 and simulated tempering with temperature replica exchange"
  - "Recognise the uses and reweighting limits of accelerated and Gaussian-accelerated MD"
cover: "cover.svg"
milestones:
  - year: 1986
    text: "Swendsen and Wang introduce replica Monte Carlo for spin glasses"
  - year: 1992
    text: "Marinari and Parisi propose simulated tempering"
  - year: 1996
    text: "Hukushima and Nemoto publish exchange Monte Carlo, today's parallel tempering"
  - year: 1999
    text: "Sugita and Okamoto bring replica exchange to molecular dynamics"
track: rl-bias
weight: 3
level: Advanced
prereqs: ["es-opes-abf", "monte-carlo"]
lab: "Run a ladder of replicas on a rugged landscape, with and without exchanges, and compare the low-temperature sampling"
---

## Tempering

### Heating without losing the low-temperature ensemble

The collective-variable methods of the previous chapters accelerate sampling along chosen coordinates. A blunter but more general way to cross barriers is to raise the temperature: at high $T$, barriers that are many $k_BT$ high at room temperature become small, and the system explores freely. The difficulty is that the high-temperature ensemble is not the one we want. The idea of **tempering** is to run at high temperature to explore, and at low temperature to sample correctly, letting configurations move between the two in a way that preserves the correct distribution at every temperature.

{{< note type="practice" title="Back of the envelope" >}}
How much does heat buy? For a barrier that is purely enthalpic, with $\Delta H^\ddagger = 40$ kJ/mol, the Arrhenius factor between 300 and 450 K is $\exp\big[(\Delta H^\ddagger/R)(1/300 - 1/450)\big] = e^{5.35} \approx 210$, and for 80 kJ/mol it is about 44 000. A transition that takes a microsecond at 300 K takes a few nanoseconds at 450 K. The catch is entropy: if the barrier is mostly entropic, as when a chain must find one narrow folding route among many, heating does not lower the free-energy barrier and can raise it, and tempering gains little.
{{< /note >}}

## Parallel tempering

### The method

**Parallel tempering**, or replica exchange, runs $M$ copies (replicas) of the system simultaneously at temperatures $T_1 < T_2 < \cdots < T_M$, each sampling its own canonical ensemble. Periodically, a swap of configurations between two replicas is attempted and accepted with a probability that keeps every replica's ensemble exact. The method was introduced for spin glasses by Robert Swendsen and Jian-Sheng Wang (1986), generalised by Charles Geyer (1991) and by Koji Hukushima and Koji Nemoto (1996) as exchange Monte Carlo, and brought to molecular dynamics by Yuji Sugita and Yuko Okamoto in 1999 as **replica-exchange molecular dynamics** (REMD).

### The acceptance rule

The acceptance rule follows from detailed balance in the extended ensemble of all replicas, whose probability is a product of Boltzmann factors. Swapping configurations $\mathbf x_i$ and $\mathbf x_j$ between temperatures $T_i$ and $T_j$ changes that product by a factor that depends only on the two energies:

{{< eq title="Replica-exchange acceptance" say="A swap is always accepted if it moves the lower-energy configuration to the colder replica; otherwise it is accepted with a Boltzmann-like probability." >}}
$$ P_{\text{acc}}(i \leftrightarrow j) = \min\!\Big(1,\; \exp\big[(\beta_i - \beta_j)\big(U(\mathbf x_i) - U(\mathbf x_j)\big)\big]\Big) $$
- $\beta = 1/k_BT$; in molecular dynamics, velocities are rescaled by $\sqrt{T_{\text{new}}/T_{\text{old}}}$ after an accepted swap so that kinetic energies match
- every replica continues to sample its exact canonical ensemble
{{< /eq >}}

### Deriving the rule

Write the state of the whole ladder as $X = (\mathbf x_1, \ldots, \mathbf x_M)$, with configuration $\mathbf x_m$ at temperature $T_m$. Because the replicas do not interact, the probability of $X$ is the product of their Boltzmann factors, $\Pi(X) \propto \prod_m e^{-\beta_m U(\mathbf x_m)}$. A swap of the configurations at rungs $i$ and $j$ is a Monte Carlo move in this extended space, and detailed balance requires that the ratio of forward and backward acceptance probabilities equal $\Pi(X')/\Pi(X)$. All factors except those of the two rungs cancel, leaving

$$
\frac{\Pi(X')}{\Pi(X)} = \frac{e^{-\beta_i U(\mathbf x_j) - \beta_j U(\mathbf x_i)}}{e^{-\beta_i U(\mathbf x_i) - \beta_j U(\mathbf x_j)}} = e^{(\beta_i - \beta_j)(U(\mathbf x_i) - U(\mathbf x_j))},
$$

and the Metropolis choice gives the rule in the card. In molecular dynamics the state also contains momenta. Rescaling the velocities of the configuration arriving at $T_i$ by $\sqrt{T_i/T_j}$ makes its kinetic energy typical of its new temperature, and the kinetic-energy factors then cancel exactly, so only potential energies enter the rule.

A worked number shows the scale. Take neighbours at 300 and 310 K, so $\beta_i - \beta_j = 0.4009 - 0.3880 = 0.0129$ mol/kJ. If the configuration at 300 K has a potential energy 100 kJ/mol below that at 310 K, which is typical of a system of a few thousand atoms, the exponent is $0.0129 \times (-100) = -1.29$ and the swap is accepted with probability 0.27. Halve the energy gap and the acceptance rises to 0.52; double it and it falls to 0.08. Because the typical gap grows with system size while the temperature step does not, larger systems need closer temperatures.

### A random walk in temperature

Each configuration therefore performs a random walk in temperature: it heats up, crosses barriers easily, cools down, and is sampled at the target temperature in a new basin. The figure runs a ladder of walkers by Metropolis Monte Carlo on a rugged one-dimensional landscape with several wells separated by barriers of several $k_BT$ at the lowest temperature.

{{< fig src="braid.svg" alt="Five horizontal temperature rungs from 300 to 440 K over twelve exchange rounds; coloured lines show configurations moving between rungs at accepted swaps, one bold line climbing from 300 K to 440 K and back down, and crosses marking rejected swaps" caption="Bookkeeping of a five-rung ladder over twelve exchange rounds, with attempts alternating between the pairs (1,2),(3,4) and (2,3),(4,5) and a seeded acceptance of 0.45 per attempt. The rungs keep their temperatures; the configurations move. The bold one needs eight rounds to climb from the coldest to the hottest rung, the round trip that brings barrier crossings made at high temperature down to 300 K." >}}

{{< widget name="remd" title="Parallel tempering on a rugged landscape" caption="Top: one walker per temperature, coloured from blue (T = 1) to red (T_max), on the landscape. Bottom: the histogram of the T = 1 replica against the exact Boltzmann distribution. Turn exchanges off and on, and vary the number of replicas and the highest temperature." >}}

Without exchanges, the lowest-temperature walker stays in its starting well, and its histogram covers one well only, a large error in the sampled distribution. With exchanges, configurations visited at high temperature flow down the ladder, and the lowest-temperature histogram converges to the full Boltzmann distribution across all wells. Reduce the number of replicas while keeping $T_{\max}$ fixed and the acceptance falls: neighbouring temperatures are now so different that their energy distributions do not overlap, and swaps are almost always rejected.

### Replica exchange in a simulation box

A one-dimensional landscape shows the principle; a real system shows what it looks like in a simulation. The figure below runs replica-exchange molecular dynamics on the **two-dimensional Lennard-Jones heptamer**, LJ7: seven atoms interacting through the Lennard-Jones potential, in reduced units ($\varepsilon = \sigma = m = 1$, time in $\tau = \sigma\sqrt{m/\varepsilon}$), with Langevin dynamics. Christoph Dellago, Peter Bolhuis and David Chandler used this cluster in 1998 to develop transition path sampling, and it has been a standard test of rare-event methods since. Its ground state is a hexagon around a central atom with six neighbours, at $E = -12.53\,\varepsilon$. Three other isomers lie about $1\,\varepsilon$ higher, separated from the hexagon by barriers that a cluster at $k_BT = 0.06\,\varepsilon$ crosses only rarely.

Every replica starts in the same higher isomer, a trapezoid at $E = -11.50\,\varepsilon$. A separate box on the left runs ordinary molecular dynamics at the lowest temperature as a control. The ladder boxes keep their temperatures; the atoms carry the colour of their replica, so when a swap is accepted you see the two configurations change places, and over time each colour wanders up and down the ladder. A green flash between two boxes is an accepted swap, a red one a rejected attempt.

{{< widget name="remdbox" title="Replica-exchange molecular dynamics of the LJ7 cluster" caption="Top: a plain MD control at the lowest temperature (dashed frame) and the replica ladder, coloured from cold (blue frame) to hot (red frame); atoms are coloured by replica identity and the six-coordinated central atom of the hexagon is outlined. Bottom left: the temperature of each replica over time. Bottom right: the potential-energy distribution at each temperature; swaps between neighbours are accepted in proportion to the overlap of their distributions." >}}

Watch three things. First, the hot boxes change shape constantly, the cold ones rarely; the coldest replica finds the hexagon only after a configuration that reached it at high temperature has walked down the ladder. In the runs used to prepare this chapter, five replicas from $k_BT = 0.06$ to $0.30\,\varepsilon$ with a swap attempt every 100 steps brought the hexagon into the coldest box after $47\,\tau$ (the figure, with a different random seed, typically does so within a few tens of $\tau$), while five independent plain MD runs at $k_BT = 0.06\,\varepsilon$ stayed in the trapezoid for between $1400\,\tau$ and more than $2000\,\tau$. Second, the energy distributions: neighbouring curves overlap, and the overlap is largest at the cold end, where the measured acceptances were 0.50 and 0.46, falling to 0.26 and 0.25 between the hotter pairs. Third, turn the exchanges off: every replica is then an independent simulation, and the coldest one is as trapped as the control. Reduce the number of replicas to three with the same highest temperature, and the gaps between the distributions open up; swaps are rejected, the colours stop moving and the method fails, which is the subject of the next section.

### Designing the ladder

The acceptance between neighbouring replicas depends on the overlap of their potential-energy distributions. For a system with $N$ degrees of freedom, the energy fluctuates by $\sim\sqrt N$ while its mean changes with temperature by $\sim N$, so the temperature spacing must shrink as $1/\sqrt N$ and the number of replicas needed to span a given range grows as $\sqrt N$, as David Kofke analysed in 2002. A solvated protein of tens of thousands of atoms needs dozens to hundreds of replicas to span 300–450 K, which is the main cost of the method. The scaling can be made quantitative. If the potential-energy distributions at neighbouring temperatures are nearly Gaussian, with a heat capacity $C$ (the potential-energy part), the average acceptance is

$$
\langle P_{\text{acc}}\rangle \approx \operatorname{erfc}\!\left(\frac{\Delta T}{T}\sqrt{\frac{C}{4k_B}}\right),
$$

because the mean energy shifts by $C\,\Delta T$ while each distribution has width $T\sqrt{k_BC}$. For a harmonic solid of $N$ atoms, $C = 3Nk_B/2$. A target acceptance of 0.25 then needs $\Delta T/T \approx 2.3/\sqrt{3N}$, and spanning 300 to 450 K takes 8 replicas for 500 atoms, 54 for 30 000 atoms and 98 for 100 000. Real liquids have larger heat capacities than this model, so these numbers are lower bounds; tools such as the temperature predictor of Alexandra Patriksson and David van der Spoel (2008) estimate a ladder from the composition of a solvated protein system.

{{< fig src="ladder.svg" alt="Left: eight overlapping bell-shaped energy distributions for temperatures from 300 to 450 K. Right: number of replicas against number of atoms on log-log axes, rising as a straight line of slope one half, with 500 atoms needing 8 and 30 000 atoms needing 54" caption="Computed for a harmonic model with potential-energy heat capacity $3Nk_B/2$. Left: for 500 atoms, eight replicas on a geometric ladder from 300 to 450 K give an acceptance of 0.26 between every pair; the exact acceptance from the energy distributions agrees with the erfc formula. Right: the replicas needed grow as $N^{1/2}$, from 8 at 500 atoms to 54 for a 30 000-atom solvated protein." >}}

{{< note type="try" title="Pause and predict" >}}
A ladder of 40 replicas works for a protein in a water box. The box is enlarged so that the system has twice as many atoms, and the temperature range stays the same. How many replicas are needed now? The temperature step must shrink by $\sqrt 2$, so the count grows to about $40\sqrt2 \approx 57$, and the total cost, replicas times atoms, grows by a factor of $2\sqrt2 \approx 2.8$ rather than 2. This is the strongest argument for keeping water boxes no larger than the solute requires.
{{< /note >}}

Temperatures are usually spaced geometrically, giving roughly uniform acceptance, with target acceptance rates around 20–30 %; the highest temperature must be high enough to cross the relevant barriers quickly, but not so high that the system spends its time in irrelevant high-energy states, such as an unfolded protein that takes long to refold.

{{< note type="warn" title="Myth" >}}
**Myth:** a ladder with 25 % acceptance between every pair of neighbours is efficient. **Reality:** acceptance measures how often swaps succeed, not how fast configurations travel. Near a folding or melting transition the energy distribution broadens, configurations at neighbouring temperatures belong to different states, and a replica can sit on one side of the transition for a long time even though individual swaps succeed. The better measure is the **round-trip time**, the time a configuration takes to go from the coldest to the hottest rung and back. Helmut Katzgraber, Simon Trebst, David Huse and Matthias Troyer (2006) proposed placing temperatures to maximise the flow of configurations up and down the ladder, which concentrates rungs near the transition.
{{< /note >}}

### Running and analysing a ladder

In GROMACS, each replica has its own directory and run input, and an MPI build runs them together: `gmx_mpi mdrun -multidir T300 T310 ... -replex 500` attempts exchanges every 500 steps, 1 ps at 2 fs, alternating between even and odd neighbour pairs. Attempting exchanges more often does not bias the ensembles and, as Daniel Sindhikara, Yilin Meng and Adrian Roitberg showed in 2008, tends to improve sampling, so intervals of 0.1 to 2 ps are common. The log file reports the acceptance of every pair and the replica-to-temperature mapping, from which the round trips can be counted.

Analysis is done per temperature, not per replica. The trajectory written at 300 K contains pieces of every configuration that passed through that rung and is a valid canonical sample; the continuous trajectory of one configuration, reassembled with the `demux.pl` script, wanders in temperature and is useful only for checking mixing. Because every rung samples a known ensemble, the data from all temperatures can also be combined by WHAM or MBAR, as in [umbrella sampling](../es-umbrella/), to give a melting curve or a heat-capacity peak as a continuous function of temperature.

{{< note type="warn" title="Myth" >}}
**Myth:** replica exchange accelerates the dynamics at 300 K, so the 300 K trajectory can give rates. **Reality:** the trajectory at a fixed temperature is stitched from different configurations at every accepted swap, so time correlations, and therefore rates and diffusion coefficients, are lost. Replica exchange gives equilibrium averages; rates need the methods of [the chapter on rates](../es-rates/).
{{< /note >}}

## Variants of tempering

### Hamiltonian replica exchange and REST

For large solvated systems, most of the energy fluctuation comes from the solvent, which is why so many replicas are needed. **Hamiltonian replica exchange** (Hiroaki Fukunishi, Osamu Watanabe and Shoji Takada, 2002) instead varies the Hamiltonian across replicas, for example by scaling particular interactions, while keeping the temperature fixed; the acceptance rule involves the energies of each configuration under both Hamiltonians:

$$
P_{\text{acc}} = \min\Big(1,\; e^{-\beta\left[U_i(\mathbf x_j) + U_j(\mathbf x_i) - U_i(\mathbf x_i) - U_j(\mathbf x_j)\right]}\Big),
$$

which reduces to the temperature rule when $U_m = (\beta_m/\beta)U$. **Replica exchange with solute tempering** (REST, Pu Liu, Byungchan Kim, Richard Friesner and Bruce Berne, 2005) and its improved form REST2 (Lingle Wang, Friesner and Berne, 2011) scale only the interactions involving a solute, which is equivalent to heating the solute while the solvent stays cold. In REST2, replica $m$ scales the solute–solute energy by $\lambda_m = \beta_m/\beta_0$, the solute–solvent energy by $\sqrt{\lambda_m}$ and leaves the solvent–solvent energy unchanged, so that a solute at effective temperature $T_0/\lambda_m$ sits in water at $T_0$. A ladder with $\lambda$ from 1 down to 0.5 heats the solute to an effective 600 K while the water stays at 300 K. Because only a small part of the system is effectively heated, far fewer replicas are needed: the energy that fluctuates is that of the solute and its contacts, whose heat capacity is a small fraction of the whole box. REST2 is widely used for protein–ligand binding and peptide conformations, and as a component of alchemical free-energy protocols.

### Simulated tempering and expanded ensembles

**Simulated tempering** (Enzo Marinari and Giorgio Parisi, 1992) achieves the same random walk in temperature with a single simulation, by treating the temperature as a dynamical variable that changes by Monte Carlo moves. To make the walk uniform it needs weights for each temperature, essentially the free energy at each temperature, which must be learned; adaptive schemes such as Wang–Landau-style updating or the OPES expanded-ensemble method of [the previous chapter](../es-opes-abf/) provide them. The single-simulation approach avoids running many replicas but is harder to tune.

The move itself is a Metropolis step in the temperature index. With dimensionless weights $g_m$ attached to each temperature, a jump from $T_m$ to a neighbour $T_{m'}$ at fixed configuration is accepted with probability $\min\big(1, e^{-(\beta_{m'} - \beta_m)U + (g_{m'} - g_m)}\big)$. The walk visits every temperature equally often when $g_m = \beta_m F_m$, with $F_m$ the free energy at $T_m$; with weights that are wrong by a few $k_BT$, the walk sticks at one end of the range, which is why the weights must be learned during the run. The acceptance depends on the energy fluctuations of one system rather than on the overlap of two, and for the same ladder it is usually higher than in parallel tempering, but every error in the weights shows up directly as uneven sampling.

## Combinations and boost potentials

### Parallel-tempering metadynamics

Tempering and collective-variable biasing are complementary: tempering helps all degrees of freedom a little, while CV biasing helps a few degrees of freedom a lot. **Parallel-tempering metadynamics** (Giovanni Bussi, Francesco Gervasio, Alessandro Laio and Michele Parrinello, 2006) combines them, and many protocols use replica exchange between umbrella windows to reduce hidden barriers in orthogonal coordinates.

In parallel-tempering metadynamics every replica carries its own bias along the same variables, and the acceptance rule includes the bias energies of both configurations in both replicas. Massimiliano Bonomi and Parrinello (2010) took the combination further with the **well-tempered ensemble**, in which the bias acts on the potential energy itself: with bias factor γ, the energy distribution of each replica widens by about $\sqrt\gamma$ while its mean barely moves, neighbouring distributions overlap more, and far fewer replicas span the same temperature range. Exchanging between umbrella windows rather than temperatures, the replica-exchange umbrella sampling of Yuji Sugita, Akio Kitao and Yuko Okamoto (2000), uses the Hamiltonian rule above with the window biases as the only difference between replicas, and lets a configuration that has crossed an orthogonal barrier in one window carry that progress to its neighbours.

### Accelerated molecular dynamics

A different CV-free strategy adds a **boost potential** that raises the energy of low-lying regions without changing the high ones, flattening the landscape everywhere at once. **Accelerated MD** (Donald Hamelberg, John Mongan and Andrew McCammon, 2004) adds, whenever the potential energy $U$ is below a threshold $E$, the boost $\Delta U = (E - U)^2/(\alpha + E - U)$. **Gaussian-accelerated MD** (GaMD, Yinglong Miao, Victoria Feher and McCammon, 2015) uses a harmonic boost $\Delta U = \tfrac12 k(E - U)^2$, chosen so that the distribution of boost energies is nearly Gaussian, which makes reweighting by a cumulant expansion accurate. Both are implemented in AMBER and other codes and are popular for exploring protein conformational changes, but reweighting becomes noisy for large boosts and large systems, which limits their use for accurate free energies.

{{< fig src="boost.svg" alt="Two panels showing a rugged one-dimensional energy curve and its boosted versions. Left, accelerated MD with two values of alpha lifts the low regions below a dashed threshold. Right, Gaussian-accelerated MD with two values of k0 raises low regions while keeping the order of the minima" caption="Boost potentials on the same rugged landscape. aMD (left) lifts everything below the threshold $E$; with small $\alpha$ the boosted surface becomes nearly flat at $E$, which erases the differences between the wells. GaMD (right), with $E$ at the maximum and $k = k_0/(U_{\max} - U_{\min})$, reduces barriers but keeps the order of the wells, and its boost varies smoothly, so its distribution stays close to Gaussian." >}}

The reweighting problem is easy to quantify. An unbiased average needs the weight $e^{\beta\Delta U}$ of every frame, and for a boost whose standard deviation over the trajectory is $\sigma_{\Delta U}$ the weights spread over a factor of about $e^{\beta\sigma_{\Delta U}}$ for a one-standard-deviation fluctuation; a few frames with the largest boost dominate. GaMD replaces the exponential average by its cumulant expansion to second order, $\ln\langle e^{\beta\Delta U}\rangle \approx \beta\langle\Delta U\rangle + \tfrac12\beta^2\sigma_{\Delta U}^2$, which is exact for a Gaussian distribution of boosts, and limits the boost so that $\sigma_{\Delta U}$ stays below a user-set bound, 6 $k_BT$ by default in AMBER. Even then, reweighting works best when it is done along one or two variables, where each bin collects enough frames.

{{< note type="practice" title="From the lab" >}}
- **Spin glasses and lattice models.** Parallel tempering began here, and it remains the standard for Monte Carlo of Ising spin glasses and of alloy models built from cluster expansions, where order–disorder transitions trap single-temperature runs.
- **Clusters.** The 38-atom Lennard-Jones cluster has a truncated-octahedral global minimum and a large family of icosahedral structures separated by a high barrier; Joseph Neirotti, Florent Calvo, David Freeman and Jimmie Doll used parallel tempering in 2000 to study its solid–solid transition, and it has been a hard test for sampling methods since.
- **Peptides and small proteins.** Temperature REMD with 300 to 500 K ladders is a common way to obtain folding free-energy landscapes and melting curves of peptides and mini-proteins, and REST2 the common way to sample the conformations of a ligand or a loop inside a solvated protein.
{{< /note >}}

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
- q: "Neighbouring replicas at 300 K and 310 K have potential energies differing by 100 kJ/mol, the colder one lower. Roughly what is the swap acceptance?"
  options: ["0.95", "0.27", "0.01"]
  answer: 1
  why: "β_i − β_j ≈ 0.0129 mol/kJ, so the exponent is −1.29 and e^{−1.29} ≈ 0.27."
- q: "Why can rates not be read from the 300 K trajectory of a replica-exchange run?"
  options: ["The force field is wrong at 300 K", "The trajectory at a fixed temperature is stitched from different configurations at every accepted swap, so time correlations are lost", "Exchanges change the 300 K ensemble"]
  answer: 1
  why: "The ensemble at each temperature is exact, but its time series is not a continuous dynamical trajectory."
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
12. C. Dellago, P. G. Bolhuis and D. Chandler, "Efficient transition path sampling: application to Lennard-Jones cluster rearrangements", *Journal of Chemical Physics* **108**, 9236–9245 (1998).
13. J. P. Neirotti, F. Calvo, D. L. Freeman and J. D. Doll, "Phase changes in 38-atom Lennard-Jones clusters. I. A parallel tempering study in the canonical ensemble", *Journal of Chemical Physics* **112**, 10340–10349 (2000).
14. Y. Sugita, A. Kitao and Y. Okamoto, "Multidimensional replica-exchange method for free-energy calculations", *Journal of Chemical Physics* **113**, 6042–6051 (2000).
15. H. G. Katzgraber, S. Trebst, D. A. Huse and M. Troyer, "Feedback-optimized parallel tempering Monte Carlo", *Journal of Statistical Mechanics* P03018 (2006).
16. A. Patriksson and D. van der Spoel, "A temperature predictor for parallel tempering simulations", *Physical Chemistry Chemical Physics* **10**, 2073–2077 (2008).
17. D. Sindhikara, Y. Meng and A. E. Roitberg, "Exchange frequency in replica exchange molecular dynamics", *Journal of Chemical Physics* **128**, 024103 (2008).
18. M. Bonomi and M. Parrinello, "Enhanced sampling in the well-tempered ensemble", *Physical Review Letters* **104**, 190601 (2010).

</div>
