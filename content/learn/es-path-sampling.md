---
title: "Path sampling"
description: "Sampling the rare transitions themselves instead of the states: the transition path ensemble, transition path sampling with shooting and shifting moves, rate constants from transition interface sampling and forward-flux sampling, milestoning, weighted-ensemble simulation, finite-temperature and swarms-of-trajectories string methods, transition path theory, and how path ensembles reveal mechanisms and reaction coordinates."
hook: "If a transition takes picoseconds but happens once a second, a simulation spends almost all its time waiting. Path sampling skips the wait and samples the rare reactive trajectories themselves, mechanisms and rates included."
objectives:
  - "Explain the transition path ensemble and why sampling it needs no reaction coordinate"
  - "Implement the logic of a TPS shooting move and its acceptance rule"
  - "Compute a rate as an outgoing flux times a product of interface-crossing probabilities"
  - "Compare TIS, forward-flux sampling, milestoning and weighted ensemble for a given problem"
  - "Relate finite-temperature strings and transition path theory to the committor"
cover: "cover.svg"
milestones:
  - year: 1986
    text: "Pratt proposes sampling chains of states that link reactants to products"
  - year: 1998
    text: "Dellago, Bolhuis, Csajka and Chandler introduce transition path sampling"
  - year: 2003
    text: "van Erp, Moroni and Bolhuis compute rates with transition interface sampling"
  - year: 2005
    text: "Allen, Warren and ten Wolde introduce forward-flux sampling for biochemical switches"
track: rl-path
weight: 1
level: Advanced
prereqs: ["es-rates", "monte-carlo"]
lab: "Run transition path sampling with shooting moves on a two-dimensional landscape"
---

## Sampling paths instead of states

The methods of the previous part bias the dynamics along a chosen collective variable and then correct for the bias. They work well when a good collective variable is known. When it is not, when the mechanism itself is the question, a different philosophy is attractive: leave the dynamics unbiased and instead sample **trajectories**, concentrating effort on the rare trajectories that actually make a transition. Path-sampling methods do this. Because the trajectories they produce are true dynamical trajectories, they give rates and mechanisms directly, without assuming a reaction coordinate.

The numbers behind this are stark. The figure follows overdamped Langevin dynamics in the double well $U(x) = 5\,k_BT\,(x^2 - 1)^2$, in reduced units in which the diffusion coefficient and the well position are 1. Over 400 time units the particle crosses 8 times. Each crossing, measured from the last exit from one state to the first entry into the other, lasts 0.15 time units on average, so the trajectory spends 0.31 % of its time on transition paths and 99.7 % rattling inside the wells. Kramers' formula for this barrier predicts a mean residence time of 33 time units per well; the run gives about 50, because eight events are too few to fix a rate to better than roughly 35 %. A 5 $k_BT$ barrier is a small one. At 15 $k_BT$ the residence time grows by $e^{10} \approx 2\times10^4$ while the duration of a crossing barely changes, since it depends on the barrier only logarithmically.

{{< fig src="waiting.svg" alt="Left: a 400-time-unit trajectory of a particle in a double well, mostly in state A or state B, with eight short orange vertical transitions. Right: a zoom on one transition path lasting 0.22 time units." caption="Brute-force dynamics in a 5 $k_BT$ double well. The orange transition paths occupy 0.31 % of the run; the rest is waiting. Path sampling generates only the orange segments." >}}

{{< note type="practice" title="Back of the envelope" >}}
A conformational change with a rate of 10 s⁻¹ and transition paths about 1 ns long is typical of an enzyme loop or a ligand leaving a buried pocket. Brute-force MD with a 2 fs step needs $5\times10^{13}$ steps per event. At a throughput of 1 µs per day on a GPU, a 50 000-atom system would need about 270 years to show one transition. A transition path sampling run of 1000 accepted paths of 2 ns, with an acceptance rate of 30 %, costs about 7 µs of MD, a week of the same GPU. Each accepted path costs about 7 ns of MD against 0.1 s of waiting: the saving is the ratio of waiting time to path length, here $10^8$, reduced by the acceptance rate.
{{< /note >}}

The central object is the **transition path ensemble**: the set of all trajectories of a fixed length $L$ that start in state A and end in state B, each weighted by its probability under the true dynamics. For a trajectory $\mathbf X = (\mathbf x_0, \mathbf x_1, \ldots, \mathbf x_L)$,

{{< eq title="The transition path ensemble" say="Weight every trajectory by how likely the dynamics makes it, and keep only those that start in A and end in B." >}}
$$ \mathcal P_{AB}[\mathbf X] = \frac{1}{Z_{AB}}\; h_A(\mathbf x_0)\, \rho(\mathbf x_0) \prod_{t=0}^{L-1} p(\mathbf x_t \to \mathbf x_{t+1})\; h_B(\mathbf x_L) $$
- $\rho(\mathbf x_0)$: the equilibrium distribution of starting points; $p$: the short-time transition probability of the dynamics
- $h_A$, $h_B$: indicator functions, 1 inside the state and 0 outside
{{< /eq >}}

### What the path weight contains

The ensemble is defined by the dynamics, so its weight depends on which dynamics are used. For deterministic Newtonian dynamics the whole trajectory is fixed by its initial phase-space point, the product of transition probabilities is a product of delta functions, and $\mathcal P_{AB}[\mathbf X]$ reduces to $\rho(\mathbf x_0)\,h_A(\mathbf x_0)\,h_B(\mathbf x_L)$: equilibrium initial conditions, filtered by where they end up. For overdamped Langevin dynamics with time step $\Delta t$ and diffusion coefficient $D$, each step is Gaussian,

$$
p(\mathbf x_t \to \mathbf x_{t+1}) \propto \exp\!\left[-\frac{\big|\mathbf x_{t+1} - \mathbf x_t - \beta D\,\mathbf F(\mathbf x_t)\,\Delta t\big|^2}{4D\,\Delta t}\right],
$$

and the product over a path is the exponential of a discretised Onsager–Machlup action. Paths that move against the force, as every barrier crossing must, pay for it in this action. Path sampling never needs the normalisation $Z_{AB}$, for the same reason that Metropolis Monte Carlo never needs the partition function: only ratios of path weights enter.

### Choosing the path length

$L$ must be long enough to contain a complete transition and short compared with the waiting time. Dellago and colleagues made this precise with the time-correlation function

$$
C(t) = \frac{\langle h_A(\mathbf x_0)\,h_B(\mathbf x_t)\rangle}{\langle h_A\rangle},
$$

the probability of being in B at time $t$ given a start in A. After a short molecular time $\tau_{\text{mol}}$, the duration of a transition path, $C(t)$ grows linearly, $C(t) \approx k_{AB}\,t$, until $t$ approaches the reaction time $1/k_{AB}$. TPS can compute $C(t)$ by a sequence of umbrella-like path ensembles and read the rate off its slope; in practice one checks that the path length used lies in the linear regime. For the double well above, $\tau_{\text{mol}} \approx 0.2$ and $1/k_{AB} \approx 33$, so any length between about 1 and 5 time units would do. A path that is too short excludes slow transitions through intermediates; a path that is too long wastes most of its frames in the stable states.

## Transition path sampling

**Transition path sampling** (TPS), developed by Christoph Dellago, Peter Bolhuis, Félix Csajka and David Chandler in 1998, samples this ensemble by a Monte Carlo random walk in the space of trajectories. The most important move is the **shooting move**: choose a time slice of the current path at random, perturb its momenta slightly (or draw new ones from the Maxwell–Boltzmann distribution), and integrate the equations of motion forwards to the end and backwards (with reversed momenta) to the beginning, creating a new trajectory that shares one point with the old one. With symmetric generation of the perturbation and equilibrium momenta, the new path is accepted simply if it still connects A and B; otherwise the old path is kept. **Shifting** moves, which translate a path in time, improve sampling of the endpoints.

### Why the acceptance rule is so simple

The rule follows from detailed balance in path space. A new path $\mathbf X^{(n)}$ generated from an old path $\mathbf X^{(o)}$ must be accepted with a probability satisfying

$$
\mathcal P_{AB}[\mathbf X^{(o)}]\,P_{\text{gen}}(o\to n)\,P_{\text{acc}}(o\to n) = \mathcal P_{AB}[\mathbf X^{(n)}]\,P_{\text{gen}}(n\to o)\,P_{\text{acc}}(n\to o).
$$

For deterministic dynamics that conserve the equilibrium distribution along a trajectory, the weight of a path equals the weight $\rho$ of any of its points, so the ratio of path weights is $\rho(\mathbf x'_j)/\rho(\mathbf x_j)$ at the shooting slice $j$. If the shooting slice is chosen uniformly and the momentum perturbation is symmetric, the generation probabilities cancel and the Metropolis solution is

$$
P_{\text{acc}}(o\to n) = h_A(\mathbf x'_0)\,h_B(\mathbf x'_L)\,\min\!\left[1, \frac{\rho(\mathbf x'_j)}{\rho(\mathbf x_j)}\right].
$$

When the new momenta are drawn from the Maxwell–Boltzmann distribution, or a perturbation is rescaled to keep the energy fixed in the microcanonical ensemble, the bracket is 1 and only the endpoint test is left. Variants with flexible path length, used in TIS below, pick up an extra factor of the ratio of old and new path lengths, because the shooting slice is chosen uniformly along a path whose length changes. A useful estimate of efficiency: if forward and backward halves decorrelate quickly, a shot from a point with committor $q$ yields a reactive path with probability about $2q(1-q)$ when both orientations are accepted, at most one half at the barrier top and nearly zero deep in a basin. This is why shooting points are best drawn from the middle of the path, and why the **aimless shooting** variant of Peters and Trout (2006) keeps shooting points near the transition state.

{{< note type="practice" title="From the lab" >}}
A TPS study usually proceeds as follows. (1) Define A and B with order parameters from short unbiased runs in each state, wide enough to contain their equilibrium fluctuations. (2) Obtain one reactive path, from a high-temperature run, a steered MD pull or a string calculation; it may be unphysical. (3) Run a few hundred shooting moves and discard them as equilibration, checking that path observables, such as the transition path duration, no longer drift. (4) Harvest $10^3$ to $10^4$ paths, tuning the momentum perturbation so that a few tens of per cent of trials are accepted: tiny perturbations give highly correlated paths, large ones are nearly always rejected. (5) Analyse the ensemble with committors and likelihood maximisation. OpenPathSampling drives GROMACS and OpenMM for steps 3 and 4; PyRETIS implements the interface methods below.
{{< /note >}}

{{< note type="warn" title="Myth" >}}
*Path sampling needs no order parameters.* It needs no reaction coordinate, but it needs definitions of the stable states, and these are order parameters. If A is drawn too tightly, ordinary fluctuations leave it and return, and many sampled paths are not transitions at all. If A is drawn too generously, it reaches into the barrier region, and some paths start from configurations that are not committed to A. The standard check is to run unbiased MD in each state and confirm that it stays inside its definition, and to compute committors for configurations on the boundary of each state: they should be close to 0 for A and 1 for B.
{{< /note >}}

Because each new path shares a point with the previous one, TPS explores the transition path ensemble gradually, like a random walk; it never needs to find a transition from scratch. Starting from any connecting path, even an unphysical one such as a straight line between the states, the first accepted shooting moves replace it with a genuine dynamical trajectory, and the sampled paths soon forget the initial guess. In the figure, the initial path is a straight line; watch it relax into the dynamical channel through which transitions really occur, and watch accepted paths explore the width of that channel.

{{< widget name="tps" title="Shooting moves in transition path sampling" caption="States A and B are shaded. Orange: the current transition path; faint orange: recently accepted paths; dashed grey: the last trial, which is accepted only if it connects A to B. Each trial shoots from a random point of the current path with new random momenta, integrating Langevin dynamics forwards and backwards." >}}

The accepted paths constitute a sample of how the transition really happens: which degrees of freedom move first, through which bottleneck the system passes, how long the transition takes. Analysing the ensemble, for example by computing committors along the paths or by fitting a model that predicts the outcome of shooting moves from collective variables (the **likelihood maximisation** of Baron Peters and Bernhardt Trout, 2006), identifies reaction coordinates from data. TPS has been used to study the mechanisms of ion dissociation in water, autoionisation of water, nucleation, protein conformational changes and chemical reactions. The OpenPathSampling library implements TPS and the methods below.

### Testing a reaction coordinate with the committor histogram

A candidate reaction coordinate $r$ predicts a transition-state ensemble: the configurations at the maximum of the free energy $F(r)$. The **committor histogram** tests the prediction. Sample configurations on the surface $r = r^*$, launch from each about 100 short trajectories with fresh Maxwell–Boltzmann momenta, and record the fraction that reach B first. If $r$ is a good coordinate, every configuration on its barrier surface is genuinely undecided and the histogram of committors peaks at 1/2. If $r$ misses a slow degree of freedom, the surface contains configurations already committed to A or B and the histogram is broad or U-shaped.

{{< note type="story" >}}
Phillip Geissler, Christoph Dellago and David Chandler introduced the test in 1999 for the dissociation of a sodium chloride ion pair in water, the textbook example of a reaction whose obvious coordinate is the interionic distance. Configurations at the free-energy maximum along that distance were not transition states: their committor distribution was spread across the whole interval, because whether the ions separate also depends on how the surrounding water molecules are arranged. A good reaction coordinate had to include solvent degrees of freedom. Two years later Geissler, Dellago, Chandler, Jürg Hutter and Michele Parrinello applied TPS with ab initio MD to the autoionisation of water, finding that the newly formed hydronium and hydroxide ions recombine unless the hydrogen-bond wire connecting them breaks.
{{< /note >}}

{{< note type="try" title="Pause and predict" >}}
The figure below uses a double well whose valley runs at 30° to the $x$ axis: $U = 5\,k_BT\,(r^2 - 1)^2 + 3\,k_BT\,s^2$ in the rotated coordinates $r$ and $s$. The free energy along $x$ alone has its maximum at $x = 0$. Before looking, predict the shape of the committor histogram for configurations sampled on the line $x = 0$.
{{< /note >}}

{{< fig src="committor-test.svg" alt="Left: contour plot of a tilted double well with two lines of sampled configurations, the vertical line x = 0 and the tilted true dividing surface, dots coloured by committor. Right: committor histograms; violet bars peaked at one half for the true surface, an orange U-shaped outline for x = 0." caption="The committor histogram test, each committor estimated from 100 trajectories. On the true dividing surface $r = 0$, 95 % of configurations have committors between 0.4 and 0.6, a spread no larger than the binomial noise of 100 shots. On $x = 0$, 56 % are below 0.1 or above 0.9: the coordinate $x$ misses half of the transition." >}}

On the line $x = 0$, the Boltzmann distribution puts most configurations near the points where that line passes through the two wells, and those configurations are committed. Only 8 % of them have committors between 0.4 and 0.6. On the true dividing surface the standard deviation of the estimated committors is 0.047, close to the value $\sqrt{0.25/100} = 0.05$ expected from the finite number of shots alone. The test costs $N_{\text{conf}} \times N_{\text{shot}}$ short trajectories, here 20 000 for each surface, which is why it is used to check a coordinate rather than to search for one; the likelihood maximisation of Peters and Trout instead fits a coordinate to the outcomes of shooting moves that TPS has already performed.

## Rates from path sampling

TPS samples transitions but not, by itself, how often they happen. **Transition interface sampling** (TIS, Titus van Erp, Daniele Moroni and Peter Bolhuis, 2003) computes the rate by placing a series of interfaces $\lambda_0 < \lambda_1 < \cdots < \lambda_n$ between A and B, defined by an order parameter, and writing the rate as a product of the flux out of A through the first interface and a series of conditional probabilities:

{{< eq title="The rate as a product of crossing probabilities" say="Count how often the system leaves A, then multiply the probabilities of getting from each interface to the next, which are much larger than the probability of the whole journey." >}}
$$ k_{AB} = \Phi_{A,0}\;\prod_{i=0}^{n-1} P(\lambda_{i+1} \mid \lambda_i) $$
- $\Phi_{A,0}$: the flux of trajectories leaving A across the first interface, measured by ordinary MD in A
- $P(\lambda_{i+1}\mid\lambda_i)$: the probability that a trajectory crossing interface $i$ reaches interface $i+1$ before returning to A
{{< /eq >}}

Each conditional probability is moderate, say 0.1 to 0.3, even when their product is $10^{-20}$, so each can be estimated with a reasonable number of trajectories. The figure shows a worked example for a one-dimensional double well with a barrier of 12 $k_BT$, with state A at $x < -0.9$, the first interface at $\lambda_0 = -0.8$ and state B at $x > 0.9$. For diffusion in one dimension each conditional probability is known exactly, as a ratio of integrals of $e^{\beta U}$, so the interfaces can be placed to make every stage equally hard.

{{< fig src="interfaces.svg" alt="Left: schematic of interfaces lambda 0 to lambda 3 between states A and B, with orange trial trajectories reaching the next interface and grey ones turning back. Right: semi-log plot of the probability of reaching each interface, falling by a factor 0.2 per interface to 4.5 times 10 to the minus 6 at B." caption="Left: forward-flux sampling launches trials from the configurations stored at each interface; successful trials supply the starting points for the next stage. Right: for a 12 $k_BT$ barrier, interfaces at $x = -0.70, -0.61, -0.52, -0.43, -0.33, -0.22$ and $-0.05$ each pass 20 % of trials; the last stage reaches B with probability 0.36." >}}

The product is $4.5\times10^{-6}$. Suppose ordinary MD in A records 0.1 outward crossings of $\lambda_0$ per picosecond. The rate is then $k_{AB} = 0.1 \times 4.5\times10^{-6} = 4.5\times10^{-7}$ ps⁻¹, or $4.5\times10^5$ s⁻¹, and the mean waiting time is 2.2 µs. With 1000 trials per stage, eight stages and failed trials that return to A after about 5 ps, the calculation costs about 40 ns of MD; seeing ten events by brute force would cost 22 µs. The statistical error follows from the binomial distribution: a stage with success probability $p$ estimated from $N$ trials has relative error $\sqrt{(1-p)/(pN)}$, 6.3 % for $p = 0.2$ and $N = 1000$, and the errors of eight such stages add in quadrature to about 18 % on the rate. Interfaces placed so that the uphill stages have similar probabilities make the best use of a fixed budget. Most of the rarity accumulates on the uphill side of the barrier: once past the top, trajectories reach B with probability close to 1. Unlike a free-energy method, the order parameter only defines the interfaces; it does not have to be a good reaction coordinate, although a better one makes the calculation more efficient. **Replica-exchange TIS** swaps paths between interface ensembles to improve sampling.

TIS differs from fixed-length TPS in two practical ways. Its paths have flexible length: a trajectory is integrated only until it reaches A, B or, for interface ensemble $i$, until it has decided whether it crosses $\lambda_{i+1}$, so no time is spent in the stable states. And it is less sensitive to recrossings of a poor order parameter than transition state theory, because each path ensemble counts only trajectories that return to A or proceed, never the bare crossing of a surface. The replica-exchange variant, RETIS, introduced by van Erp in 2007, adds swaps between neighbouring ensembles and between the $[0^-]$ ensemble of paths inside A and the first interface, which also gives the flux without a separate MD run.

**Forward-flux sampling** (FFS, Rosalind Allen, Patrick Warren and Pieter Rein ten Wolde, 2005) uses the same factorisation but generates trajectories only forwards in time: launch many trajectories from the configurations that first crossed interface $i$, record those that reach interface $i+1$, and use their endpoints as starting points for the next stage. Because it never integrates backwards, FFS works for non-equilibrium systems without detailed balance, such as driven systems and biochemical networks, and it is widely used for crystal nucleation, where the order parameter is the size of the largest crystalline cluster.

{{< note type="practice" title="From the lab" >}}
Amir Haji-Akbari and Pablo Debenedetti used FFS in 2015 to compute the homogeneous nucleation rate of ice for the TIP4P/Ice water model, with the size of the largest ice-like cluster, identified from bond-orientational order parameters, as the order parameter. Such studies expose the method's main practical failure: **genealogy collapse**. All configurations at a late interface may descend from a handful of ancestors at $\lambda_0$, because the successful trials at each stage are a small fraction of those launched. The rate then rests on far fewer independent paths than the trial count suggests, and naive error bars are too small. The remedies are many configurations at $\lambda_0$ (several hundred, harvested from well-separated times of the MD run in A), tracing each final path back to its ancestor to count independent lineages, and repeating the whole calculation with independent seeds. A second failure is an order parameter that ignores a slow variable, such as the crystallinity inside a cluster as opposed to its size: the conditional probabilities are then still correct in principle, but each stage's starting configurations are unrepresentative and the variance grows sharply.
{{< /note >}}

## Milestoning and weighted ensemble

**Milestoning** (Anton Faradjian and Ron Elber, 2004) also places interfaces, called milestones, along the transition, but it runs only short trajectories between neighbouring milestones and records the times and probabilities of reaching each neighbour. Combining these local statistics, under the assumption that the system loses memory between milestones, gives the mean first-passage time over the whole path. Its strength is that the short trajectories are cheap and independent, which makes it efficient for very slow processes such as ligand unbinding.

The memory-loss assumption is the method's weak point: if a trajectory that reaches milestone $i$ from below behaves differently from one that arrives from above, combining them biases the result. Placing milestones farther apart restores memory loss at the cost of longer trajectories. **Exact milestoning**, by Juan Bello-Rivas and Elber in 2015, removes the assumption by iterating the distribution of first-hitting points on each milestone to self-consistency.

The **weighted-ensemble** method (Gary Huber and Sangtae Kim, 1996) runs many trajectories in parallel, each carrying a statistical weight. Configuration space is divided into bins along a progress coordinate, and at regular intervals trajectories in under-populated bins are split into several copies, sharing the parent's weight, while trajectories in crowded bins are merged. Splitting and merging keep the total weight exact, so the method is unbiased, yet it concentrates computing effort on the rare trajectories that advance towards B. Weighted ensemble gives rates and pathways and has been applied to large biomolecular processes such as protein–protein binding and viral capsid dynamics, notably with the WESTPA software.

The bookkeeping is simple enough to do by hand. A trajectory of weight 0.012 that enters an empty bin is split into four copies of weight 0.003, which then evolve with independent random forces. Two trajectories of weights $2\times10^{-5}$ and $6\times10^{-5}$ in an overcrowded bin are merged: one is kept with probability proportional to its weight, here the second with probability 0.75, and the survivor carries the combined weight $8\times10^{-5}$. Both operations leave the expected weight in every region unchanged, which is why the method is unbiased for any choice of bins. In the **steady-state** form, trajectories that reach B are returned to A with their weight; the probability flux into B then equals the inverse of the mean first-passage time, a relation due to Terrell Hill, so the rate is read off directly. A typical setup uses 4 to 8 trajectories per bin, a resampling interval of tens to hundreds of picoseconds and a few dozen bins along a progress coordinate such as a ligand–protein distance or an RMSD to the target. In 2021 Terra Sztain, Lillian Chong, Rommie Amaro and colleagues used WESTPA to simulate the opening of the SARS-CoV-2 spike protein's receptor-binding domain, a transition far beyond the reach of conventional MD for a system of that size.

{{< note type="warn" >}}
Weighted-ensemble rate estimates converge slowly because the steady state takes time to establish: early iterations reflect the transient from the initial conditions, not the stationary flux. Plot the flux into B against iteration and use only the plateau, and compare several independent runs; their spread, often an order of magnitude for complex systems, is a more honest error bar than the variance within one run.
{{< /note >}}

### Choosing a method

The methods trade generality against cost. TPS gives mechanisms with no reaction coordinate but needs a first path and gives rates only with extra work. TIS and RETIS give rates for equilibrium dynamics and are efficient when an order parameter for the interfaces is available; FFS gives rates for driven and non-equilibrium systems, at the cost of genealogy problems. Milestoning gives kinetics from many short independent trajectories but assumes memory loss between milestones. Weighted ensemble is unbiased, embarrassingly parallel and gives pathways and rates together, but needs bins along a progress coordinate and many iterations to reach steady state. When thousands of short trajectories are cheap and the goal is the full network of states, [Markov state models](../es-msm/) are often the better choice; transition path theory, below, applies to both.

## Strings at finite temperature and transition path theory

The string method of [the chapter on energy landscapes](../es-landscapes/) finds minimum energy paths at zero temperature. Its **finite-temperature** version (Weinan E, Weiqing Ren and Eric Vanden-Eijnden, 2005) evolves the string according to averages computed in restrained simulations around each image, so that it converges to the principal curve of the transition tube in collective-variable space, accounting for entropy. The **string method with swarms of trajectories** (Albert Pan, Deniz Sezer and Benoît Roux, 2008) moves each image by the average drift of many short unrestrained trajectories launched from it, which avoids the need for restraints and is popular for large conformational changes in proteins.

All these methods can be understood within **transition path theory** (E and Vanden-Eijnden, 2006), which describes the statistics of reactive trajectories in terms of the committor $q(\mathbf x)$, the probability of reaching B before A introduced in [the chapter on rates](../es-rates/). The density of reactive trajectories, the probability current of transitions and the rate can all be written in terms of $q$; the committor's isosurfaces are the natural interfaces, and the committor itself is the ideal reaction coordinate. Much of the recent work on machine-learned collective variables aims to learn $q$ from data ([the chapter on learned collective variables](../es-ml-cvs/)).

The connection to transition state theory is direct. Transition state theory counts every crossing of a dividing surface as a reaction; the true rate is smaller by the transmission coefficient $\kappa$, the fraction of crossings that are not followed by recrossing. A dividing surface that is an isosurface of the committor minimises recrossings, and path-sampling rate methods are, in effect, ways of computing $\kappa$ and the flux without having to know that surface. In the tilted double well of the committor figure, the surface $x = 0$ is crossed many times by trajectories that return to the state they came from, while the surface $r = 0$ is crossed by trajectories that are, by construction, undecided.

{{< note type="key" >}}
- Path sampling samples the transition path ensemble of trajectories from A to B, under the true dynamics, without needing a reaction coordinate.
- TPS shoots new trajectories from a random point of the current path with perturbed momenta and accepts them if they still connect A and B.
- TIS and FFS compute rates as an outgoing flux times a product of interface-crossing probabilities; FFS needs only forward dynamics and works out of equilibrium.
- Milestoning combines short trajectories between milestones; weighted ensemble splits and merges weighted trajectories to sample rare progress without bias.
- Finite-temperature and swarm string methods find transition tubes; transition path theory expresses everything through the committor.
- A reaction coordinate passes the committor histogram test if configurations at its barrier top have committors peaked at 1/2.
{{< /note >}}

{{< quiz >}}
- q: "What is the acceptance rule for a TPS shooting move with symmetric momentum perturbation in equilibrium?"
  options: ["Always accept", "Accept if the new trajectory still starts in A and ends in B", "Accept with probability e^(−ΔE/kT)"]
  answer: 1
  why: "Under these conditions the generation probabilities cancel and only the endpoint conditions remain."
- q: "Why does forward-flux sampling work for driven, non-equilibrium systems?"
  options: ["It uses a thermostat", "It only propagates trajectories forwards in time and does not rely on detailed balance or time reversal", "It uses replica exchange"]
  answer: 1
  why: "TPS and TIS use backward shooting, which assumes microscopic reversibility."
- q: "In TIS, a rate of 10⁻¹² s⁻¹ is computed from a flux and five interface probabilities. Why is this efficient?"
  options: ["Each conditional probability is moderate and easy to estimate, even though their product is tiny", "The flux is zero", "It uses a reaction coordinate"]
  answer: 0
  why: "Factorising a tiny probability into moderate ones avoids waiting for the whole rare event."
- q: "Configurations at the free-energy maximum of a candidate coordinate give a U-shaped committor histogram. What does this mean?"
  options: ["The coordinate is a good reaction coordinate", "The coordinate misses a slow degree of freedom: many configurations on its barrier top are already committed", "Too few shooting trajectories were used"]
  answer: 1
  why: "On a good coordinate's barrier top every configuration is undecided, so committors cluster at 1/2; finite shots only broaden that peak."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. C. Dellago, P. G. Bolhuis, F. S. Csajka and D. Chandler, "Transition path sampling and the calculation of rate constants", *Journal of Chemical Physics* **108**, 1964–1977 (1998).
2. P. G. Bolhuis, D. Chandler, C. Dellago and P. L. Geissler, "Transition path sampling: throwing ropes over rough mountain passes, in the dark", *Annual Review of Physical Chemistry* **53**, 291–318 (2002).
3. T. S. van Erp, D. Moroni and P. G. Bolhuis, "A novel path sampling method for the calculation of rate constants", *Journal of Chemical Physics* **118**, 7762–7774 (2003).
4. R. J. Allen, P. B. Warren and P. R. ten Wolde, "Sampling rare switching events in biochemical networks", *Physical Review Letters* **94**, 018104 (2005).
5. A. K. Faradjian and R. Elber, "Computing time scales from reaction coordinates by milestoning", *Journal of Chemical Physics* **120**, 10880–10889 (2004).
6. G. A. Huber and S. Kim, "Weighted-ensemble Brownian dynamics simulations for protein association reactions", *Biophysical Journal* **70**, 97–110 (1996).
7. B. Peters and B. L. Trout, "Obtaining reaction coordinates by likelihood maximization", *Journal of Chemical Physics* **125**, 054108 (2006).
8. W. E, W. Ren and E. Vanden-Eijnden, "Finite temperature string method for the study of rare events", *Journal of Physical Chemistry B* **109**, 6688–6693 (2005).
9. A. C. Pan, D. Sezer and B. Roux, "Finding transition pathways using the string method with swarms of trajectories", *Journal of Physical Chemistry B* **112**, 3432–3440 (2008).
10. W. E and E. Vanden-Eijnden, "Towards a theory of transition paths", *Journal of Statistical Physics* **123**, 503–523 (2006).
11. D. W. H. Swenson, J.-H. Prinz, F. Noé, J. D. Chodera and P. G. Bolhuis, "OpenPathSampling: a Python framework for path sampling simulations. 1. Basics", *Journal of Chemical Theory and Computation* **15**, 813–836 (2019).
12. D. M. Zuckerman and L. T. Chong, "Weighted ensemble simulation: review of methodology, applications, and software", *Annual Review of Biophysics* **46**, 43–57 (2017).

</div>
