---
title: "Path sampling: TPS, TIS, forward flux, milestoning and weighted ensemble"
description: "Sampling the rare transitions themselves instead of the states: the transition path ensemble, transition path sampling with shooting and shifting moves, rate constants from transition interface sampling and forward-flux sampling, milestoning, weighted-ensemble simulation, finite-temperature and swarms-of-trajectories string methods, transition path theory, and how path ensembles reveal mechanisms and reaction coordinates."
track: rl-path
weight: 1
level: Advanced
prereqs: ["es-rates", "monte-carlo"]
lab: "Run transition path sampling with shooting moves on a two-dimensional landscape"
---

## Sampling paths instead of states

The methods of the previous part bias the dynamics along a chosen collective variable and then correct for the bias. They work well when a good collective variable is known. When it is not, when the mechanism itself is the question, a different philosophy is attractive: leave the dynamics unbiased and instead sample **trajectories**, concentrating effort on the rare trajectories that actually make a transition. Path-sampling methods do this. Because the trajectories they produce are true dynamical trajectories, they give rates and mechanisms directly, without assuming a reaction coordinate.

The central object is the **transition path ensemble**: the set of all trajectories of a fixed length $L$ that start in state A and end in state B, each weighted by its probability under the true dynamics. For a trajectory $\mathbf X = (\mathbf x_0, \mathbf x_1, \ldots, \mathbf x_L)$,

{{< eq title="The transition path ensemble" say="Weight every trajectory by how likely the dynamics makes it, and keep only those that start in A and end in B." >}}
$$ \mathcal P_{AB}[\mathbf X] = \frac{1}{Z_{AB}}\; h_A(\mathbf x_0)\, \rho(\mathbf x_0) \prod_{t=0}^{L-1} p(\mathbf x_t \to \mathbf x_{t+1})\; h_B(\mathbf x_L) $$
- $\rho(\mathbf x_0)$: the equilibrium distribution of starting points; $p$: the short-time transition probability of the dynamics
- $h_A$, $h_B$: indicator functions, 1 inside the state and 0 outside
{{< /eq >}}

## Transition path sampling

**Transition path sampling** (TPS), developed by Christoph Dellago, Peter Bolhuis, Félix Csajka and David Chandler in 1998, samples this ensemble by a Monte Carlo random walk in the space of trajectories. The most important move is the **shooting move**: choose a time slice of the current path at random, perturb its momenta slightly (or draw new ones from the Maxwell–Boltzmann distribution), and integrate the equations of motion forwards to the end and backwards (with reversed momenta) to the beginning, creating a new trajectory that shares one point with the old one. With symmetric generation of the perturbation and equilibrium momenta, the new path is accepted simply if it still connects A and B; otherwise the old path is kept. **Shifting** moves, which translate a path in time, improve sampling of the endpoints.

Because each new path shares a point with the previous one, TPS explores the transition path ensemble gradually, like a random walk; it never needs to find a transition from scratch. Starting from any connecting path, even an unphysical one such as a straight line between the states, the first accepted shooting moves replace it with a genuine dynamical trajectory, and the sampled paths soon forget the initial guess. In the figure, the initial path is a straight line; watch it relax into the dynamical channel through which transitions really occur, and watch accepted paths explore the width of that channel.

{{< widget name="tps" title="Shooting moves in transition path sampling" caption="States A and B are shaded. Orange: the current transition path; faint orange: recently accepted paths; dashed grey: the last trial, which is accepted only if it connects A to B. Each trial shoots from a random point of the current path with new random momenta, integrating Langevin dynamics forwards and backwards." >}}

The accepted paths constitute a sample of how the transition really happens: which degrees of freedom move first, through which bottleneck the system passes, how long the transition takes. Analysing the ensemble, for example by computing committors along the paths or by fitting a model that predicts the outcome of shooting moves from collective variables (the **likelihood maximisation** of Baron Peters and Bernhardt Trout, 2006), identifies reaction coordinates from data. TPS has been used to study the mechanisms of ion dissociation in water, autoionisation of water, nucleation, protein conformational changes and chemical reactions. The OpenPathSampling library implements TPS and the methods below.

## Rates from path sampling

TPS samples transitions but not, by itself, how often they happen. **Transition interface sampling** (TIS, Titus van Erp, Daniele Moroni and Peter Bolhuis, 2003) computes the rate by placing a series of interfaces $\lambda_0 < \lambda_1 < \cdots < \lambda_n$ between A and B, defined by an order parameter, and writing the rate as a product of the flux out of A through the first interface and a series of conditional probabilities:

{{< eq title="The rate as a product of crossing probabilities" say="Count how often the system leaves A, then multiply the probabilities of getting from each interface to the next, which are much larger than the probability of the whole journey." >}}
$$ k_{AB} = \Phi_{A,0}\;\prod_{i=0}^{n-1} P(\lambda_{i+1} \mid \lambda_i) $$
- $\Phi_{A,0}$: the flux of trajectories leaving A across the first interface, measured by ordinary MD in A
- $P(\lambda_{i+1}\mid\lambda_i)$: the probability that a trajectory crossing interface $i$ reaches interface $i+1$ before returning to A
{{< /eq >}}

Each conditional probability is moderate, say 0.1 to 0.3, even when their product is $10^{-20}$, so each can be estimated with a reasonable number of trajectories. Unlike a free-energy method, the order parameter only defines the interfaces; it does not have to be a good reaction coordinate, although a better one makes the calculation more efficient. **Replica-exchange TIS** swaps paths between interface ensembles to improve sampling.

**Forward-flux sampling** (FFS, Rosalind Allen, Patrick Warren and Pieter Rein ten Wolde, 2005) uses the same factorisation but generates trajectories only forwards in time: launch many trajectories from the configurations that first crossed interface $i$, record those that reach interface $i+1$, and use their endpoints as starting points for the next stage. Because it never integrates backwards, FFS works for non-equilibrium systems without detailed balance, such as driven systems and biochemical networks, and it is widely used for crystal nucleation, where the order parameter is the size of the largest crystalline cluster.

## Milestoning and weighted ensemble

**Milestoning** (Anton Faradjian and Ron Elber, 2004) also places interfaces, called milestones, along the transition, but it runs only short trajectories between neighbouring milestones and records the times and probabilities of reaching each neighbour. Combining these local statistics, under the assumption that the system loses memory between milestones, gives the mean first-passage time over the whole path. Its strength is that the short trajectories are cheap and independent, which makes it efficient for very slow processes such as ligand unbinding.

The **weighted-ensemble** method (Gary Huber and Sangtae Kim, 1996) runs many trajectories in parallel, each carrying a statistical weight. Configuration space is divided into bins along a progress coordinate, and at regular intervals trajectories in under-populated bins are split into several copies, sharing the parent's weight, while trajectories in crowded bins are merged. Splitting and merging keep the total weight exact, so the method is unbiased, yet it concentrates computing effort on the rare trajectories that advance towards B. Weighted ensemble gives rates and pathways and has been applied to large biomolecular processes such as protein–protein binding and viral capsid dynamics, notably with the WESTPA software.

## Strings at finite temperature and transition path theory

The string method of [the topic on energy landscapes](../es-landscapes/) finds minimum energy paths at zero temperature. Its **finite-temperature** version (Weinan E, Weiqing Ren and Eric Vanden-Eijnden, 2005) evolves the string according to averages computed in restrained simulations around each image, so that it converges to the principal curve of the transition tube in collective-variable space, accounting for entropy. The **string method with swarms of trajectories** (Albert Pan, Deniz Sezer and Benoît Roux, 2008) moves each image by the average drift of many short unrestrained trajectories launched from it, which avoids the need for restraints and is popular for large conformational changes in proteins.

All these methods can be understood within **transition path theory** (E and Vanden-Eijnden, 2006), which describes the statistics of reactive trajectories in terms of the committor $q(\mathbf x)$, the probability of reaching B before A introduced in [the topic on rates](../es-rates/). The density of reactive trajectories, the probability current of transitions and the rate can all be written in terms of $q$; the committor's isosurfaces are the natural interfaces, and the committor itself is the ideal reaction coordinate. Much of the recent work on machine-learned collective variables aims to learn $q$ from data ([the topic on learned collective variables](../es-ml-cvs/)).

{{< note type="key" >}}
- Path sampling samples the transition path ensemble of trajectories from A to B, under the true dynamics, without needing a reaction coordinate.
- TPS shoots new trajectories from a random point of the current path with perturbed momenta and accepts them if they still connect A and B.
- TIS and FFS compute rates as an outgoing flux times a product of interface-crossing probabilities; FFS needs only forward dynamics and works out of equilibrium.
- Milestoning combines short trajectories between milestones; weighted ensemble splits and merges weighted trajectories to sample rare progress without bias.
- Finite-temperature and swarm string methods find transition tubes; transition path theory expresses everything through the committor.
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
