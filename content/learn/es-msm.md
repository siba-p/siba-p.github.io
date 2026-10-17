---
title: "Markov state models"
description: "Building long-time kinetics from many short simulations: the Markov approximation, discretisation into microstates, transition matrices at a lag time, eigenvalues and implied timescales, stationary distributions, metastable states and spectral clustering, validation by implied-timescale and Chapman–Kolmogorov tests, the variational principle (VAC, TICA, VAMP), transition path theory for fluxes and committors, and the software used in practice."
track: rl-path
weight: 2
level: Advanced
prereqs: ["es-path-sampling", "vectors-and-matrices", "probability"]
lab: "Build a Markov state model from a trajectory on a three-state landscape and choose a lag time from implied timescales"
---

## Long kinetics from short trajectories

Enhanced-sampling methods change the dynamics to obtain thermodynamics; path sampling targets particular transitions. **Markov state models** (MSMs) take a third approach that has become central in biomolecular simulation: run many ordinary, unbiased simulations, each much shorter than the processes of interest, and stitch their statistics together into a model of the long-time dynamics. Because the simulations can be run independently and in parallel, on many GPUs or on distributed computing projects such as Folding@home, MSMs reach timescales of milliseconds and beyond from simulations of microseconds.

The idea is to divide configuration space into many small regions, **microstates**, and to model the dynamics as jumps between them, observed at a fixed time interval $\tau$, the **lag time**. If $\tau$ is long enough that the system forgets where within a microstate it came from, the jumps are memoryless, and the whole dynamics is described by a matrix of transition probabilities.

## The transition matrix

Let $c_{ij}(\tau)$ count how often a trajectory in microstate $i$ at time $t$ was in microstate $j$ at time $t + \tau$, summed over all trajectories and all times. The maximum-likelihood transition matrix is the row-normalised count matrix, often symmetrised (or estimated with a reversibility constraint) to respect detailed balance in equilibrium:

{{< eq title="A Markov state model" say="The probability of being in each microstate after one lag time is the current probability vector multiplied by the matrix of jump probabilities." >}}
$$ T_{ij}(\tau) = \frac{c_{ij}(\tau)}{\sum_k c_{ik}(\tau)}, \qquad \mathbf p(t + \tau) = \mathbf p(t)\,\mathbf T(\tau), \qquad \mathbf p(n\tau) = \mathbf p(0)\,\mathbf T(\tau)^n $$
- $T_{ij}(\tau)$: the probability of jumping from microstate $i$ to $j$ in one lag time; each row sums to 1
- the stationary distribution $\boldsymbol\pi$, with $\boldsymbol\pi\mathbf T = \boldsymbol\pi$, is the equilibrium population of each microstate
{{< /eq >}}

The power of the model is that it can be propagated far beyond the length of any single trajectory: $\mathbf T(\tau)^n$ predicts the evolution after $n$ lag times. Everything about the long-time dynamics is contained in the eigenvalues and eigenvectors of $\mathbf T$.

## Eigenvalues and implied timescales

The largest eigenvalue of a transition matrix is exactly 1, and its left eigenvector is the stationary distribution. The other eigenvalues $\lambda_2 \ge \lambda_3 \ge \ldots$ are smaller than 1, and each describes a **relaxation process**: a pattern of population flowing between groups of microstates that decays by a factor $\lambda_k$ every lag time. Writing $\lambda_k = e^{-\tau/t_k}$ defines the **implied timescale** of that process:

{{< eq title="Implied timescales" say="Each eigenvalue below one describes a process that relaxes exponentially; its timescale follows from the eigenvalue and the lag time." >}}
$$ t_k = -\frac{\tau}{\ln \lambda_k(\tau)}, \qquad k = 2, 3, \ldots $$
- $t_2$ is the slowest relaxation time, usually the transition between the two most stable groups of states
- the sign pattern of the corresponding right eigenvector $\boldsymbol\psi_2$ shows which microstates exchange population: positive on one side, negative on the other
{{< /eq >}}

The eigenvectors give a natural way to find **metastable states**: groups of microstates that exchange population quickly among themselves and slowly with other groups. Clustering microstates by their values in the slowest eigenvectors, as the PCCA+ algorithm of Peter Deuflhard and Marcus Weber does, lumps hundreds of microstates into a few macrostates with a clear physical meaning.

## Validating the model

The Markov assumption is never exact; it is a good approximation only when the lag time is long enough. The standard test, introduced by William Swope, Jed Pitera and Fred Suits in 2004, plots the implied timescales as a function of $\tau$. If the dynamics between microstates is Markovian, the timescales are independent of $\tau$; if not, they increase with $\tau$, because memory makes the short-lag model look faster than the real dynamics. One chooses the smallest lag time at which the slowest timescales have levelled off. A stricter test is the **Chapman–Kolmogorov test**: compare the populations predicted by $\mathbf T(\tau)^n$ with those estimated directly at lag $n\tau$.

The figure builds an MSM live. A particle diffuses on a landscape with three wells; the plane is divided into a grid of microstates; as the trajectory grows, the count matrix and its eigenvalues are recomputed. The left panel colours each microstate by the slowest eigenvector, whose sign separates the two groups of states that exchange most slowly. The right panel shows the implied timescales against lag time.

{{< widget name="msm" title="A Markov state model from a growing trajectory" caption="Left: the trajectory (rose) over a grid of microstates coloured by the slowest eigenvector (blue negative, orange positive). Right: the two slowest implied timescales against lag time; the shaded triangle marks timescales shorter than the lag, which cannot be resolved. Let the trajectory grow, then choose the lag time where the timescales become flat." >}}

At short lag times the implied timescales are too small: the coarse grid of microstates hides fast motions within each cell, the model has memory, and the transitions look faster than they are. As the lag increases, the timescales rise and level off, the sign that the model has become Markovian. Once the lag approaches the timescale itself, statistics run out. A good MSM is built at the smallest lag on the plateau, and the plateau values are its predictions for the slow relaxation times.

## Better microstates: TICA and the variational principle

The quality of an MSM depends on how well the microstates resolve the slow processes. Microstates are usually defined by clustering conformations, but clustering in raw coordinates such as atomic positions emphasises large, fast fluctuations and may split slow processes across many clusters. Since 2013, the standard practice has been to first project the data onto slow collective coordinates found by **time-lagged independent component analysis** (TICA, introduced to molecular simulation by Guillermo Pérez-Hernández and colleagues and by Christian Schwantes and Vijay Pande), which finds linear combinations of input features with maximal autocorrelation at a lag time, the coordinates that change most slowly. [The chapter on learned collective variables](../es-ml-cvs/) shows TICA finding a slow direction that principal component analysis misses.

TICA is a special case of a general **variational principle**. Frank Noé and Feliks Nüske showed in 2013 that, for reversible dynamics, the eigenvalues of the transfer operator are bounded from above by those estimated with any finite set of basis functions, just as the Rayleigh–Ritz principle bounds energies in quantum mechanics. Better features give higher eigenvalues and longer timescales, so models can be compared and optimised by a score: the **variational approach to conformational dynamics** (VAC), and its generalisation to non-reversible processes, the **variational approach for Markov processes** (VAMP, Hao Wu and Noé). These scores turned MSM construction into an optimisation problem and led directly to **VAMPnets** (Andreas Mardt, Luca Pasquali, Hao Wu and Noé, 2018), neural networks that learn the optimal soft assignment to metastable states end to end.

## Fluxes, committors and pathways

An MSM also gives the mechanisms of transitions through **transition path theory** (Weinan E and Eric Vanden-Eijnden, applied to MSMs by Philipp Metzner, Christof Schütte and Vanden-Eijnden, and by Noé and colleagues for protein folding in 2009). The forward committor $q_i$ of each microstate, the probability of reaching B before A, solves a linear system built from $\mathbf T$; from it follow the reactive flux between microstates, the dominant transition pathways, and the rate $k_{AB}$. MSM studies of protein folding, ligand binding and conformational change in kinases and receptors have used these tools to show how multiple parallel pathways contribute to a single observed process.

## In practice

Building an MSM involves choosing features (distances, dihedrals, contacts), reducing them with TICA or a VAMP-trained network, clustering into a few hundred microstates with k-means, choosing the lag time from implied timescales, estimating a reversible transition matrix, validating with the Chapman–Kolmogorov test, and coarse-graining into macrostates with PCCA+. Errors are estimated by Bayesian sampling of transition matrices or by bootstrapping over trajectories. The PyEMMA and deeptime libraries, from the Noé group, and MSMBuilder, from the Pande group, implement this workflow. The main requirement is enough sampling: every transition the model describes must have been observed, in both directions, enough times in the short trajectories, which is often achieved by adaptive sampling, starting new trajectories from poorly sampled microstates.

{{< note type="key" >}}
- An MSM discretises configuration space into microstates and models the dynamics at lag time $\tau$ by a transition matrix $T_{ij}(\tau)$ estimated from counts in many short trajectories.
- Eigenvalue 1 gives the stationary distribution; the others give implied timescales $t_k = -\tau/\ln\lambda_k$, and their eigenvectors reveal the slow processes and metastable states.
- Choose the lag time where implied timescales become independent of $\tau$; validate with the Chapman–Kolmogorov test.
- TICA, VAC and VAMP provide slow features and variational scores; VAMPnets learn states end to end.
- Transition path theory on the MSM gives committors, fluxes, pathways and rates.
{{< /note >}}

{{< quiz >}}
- q: "An MSM's second eigenvalue at τ = 10 ns is 0.9. What is the slowest implied timescale?"
  options: ["9 ns", "about 95 ns", "1 μs"]
  answer: 1
  why: "t₂ = −τ/ln λ₂ = −10/ln 0.9 ≈ 94.9 ns."
- q: "Implied timescales keep rising as the lag time increases and never level off. What does this suggest?"
  options: ["The model is perfectly Markovian", "The microstates do not resolve the slow processes; the dynamics between them has memory", "The temperature is too low"]
  answer: 1
  why: "Better features (e.g. TICA) or more microstates are needed."
- q: "Why is TICA preferred to PCA for defining MSM microstates?"
  options: ["It is faster", "It finds the coordinates that change most slowly (maximal autocorrelation), not the ones with the largest variance", "It needs no lag time"]
  answer: 1
  why: "Slow processes, not large fluctuations, determine long-time kinetics."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. C. Schütte, A. Fischer, W. Huisinga and P. Deuflhard, "A direct approach to conformational dynamics based on hybrid Monte Carlo", *Journal of Computational Physics* **151**, 146–168 (1999).
2. W. C. Swope, J. W. Pitera and F. Suits, "Describing protein folding kinetics by molecular dynamics simulations. 1. Theory", *Journal of Physical Chemistry B* **108**, 6571–6581 (2004).
3. J. D. Chodera, N. Singhal, V. S. Pande, K. A. Dill and W. C. Swope, "Automatic discovery of metastable states for the construction of Markov models of macromolecular conformational dynamics", *Journal of Chemical Physics* **126**, 155101 (2007).
4. J.-H. Prinz et al., "Markov models of molecular kinetics: generation and validation", *Journal of Chemical Physics* **134**, 174105 (2011).
5. F. Noé, C. Schütte, E. Vanden-Eijnden, L. Reich and T. R. Weikl, "Constructing the equilibrium ensemble of folding pathways from short off-equilibrium simulations", *Proceedings of the National Academy of Sciences* **106**, 19011–19016 (2009).
6. G. Pérez-Hernández, F. Paul, T. Giorgino, G. De Fabritiis and F. Noé, "Identification of slow molecular order parameters for Markov model construction", *Journal of Chemical Physics* **139**, 015102 (2013).
7. F. Noé and F. Nüske, "A variational approach to modeling slow processes in stochastic dynamical systems", *Multiscale Modeling & Simulation* **11**, 635–655 (2013).
8. A. Mardt, L. Pasquali, H. Wu and F. Noé, "VAMPnets for deep learning of molecular kinetics", *Nature Communications* **9**, 5 (2018).
9. M. K. Scherer et al., "PyEMMA 2: a software package for estimation, validation, and analysis of Markov models", *Journal of Chemical Theory and Computation* **11**, 5525–5542 (2015).
10. G. R. Bowman, V. S. Pande and F. Noé (eds.), *An Introduction to Markov State Models and Their Application to Long Timescale Molecular Simulation*, Springer (2014).
11. B. E. Husic and V. S. Pande, "Markov state models: from an art to a science", *Journal of the American Chemical Society* **140**, 2386–2396 (2018).

</div>
