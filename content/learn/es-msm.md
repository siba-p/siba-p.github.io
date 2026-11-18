---
title: "Markov state models"
description: "Building long-time kinetics from many short simulations: the Markov approximation, discretisation into microstates, transition matrices at a lag time, eigenvalues and implied timescales, stationary distributions, metastable states and spectral clustering, validation by implied-timescale and Chapman–Kolmogorov tests, the variational principle (VAC, TICA, VAMP), transition path theory for fluxes and committors, and the software used in practice."
hook: "Thousands of simulations, none longer than a few microseconds, can together predict kinetics on milliseconds. A Markov state model stitches them into one transition matrix, whose eigenvalues read out the slowest processes in the system."
objectives:
  - "Build a transition matrix from microstate counts at a chosen lag time"
  - "Compute implied timescales from eigenvalues and choose the lag time from their plateau"
  - "Validate a Markov model with implied-timescale and Chapman–Kolmogorov tests"
  - "Explain why TICA and VAMP scores give better microstates than raw coordinates"
  - "Interpret committors, reactive fluxes and pathways from transition path theory"
cover: "cover.svg"
milestones:
  - year: 1999
    text: "Schütte, Fischer, Huisinga and Deuflhard model conformational dynamics with transfer operators"
  - year: 2004
    text: "Swope, Pitera and Suits introduce the implied-timescale test of Markovian behaviour"
  - year: 2013
    text: "Noé and Nüske prove a variational principle for slow processes"
  - year: 2018
    text: "Mardt, Pasquali, Wu and Noé learn Markov models end to end with VAMPnets"
track: rl-path
weight: 2
level: Advanced
prereqs: ["es-path-sampling", "vectors-and-matrices", "probability"]
lab: "Build a Markov state model from a trajectory on a three-state landscape and choose a lag time from implied timescales"
---

## Long kinetics from short trajectories

Enhanced-sampling methods change the dynamics to obtain thermodynamics; path sampling targets particular transitions. **Markov state models** (MSMs) take a third approach that has become central in biomolecular simulation: run many ordinary, unbiased simulations, each much shorter than the processes of interest, and stitch their statistics together into a model of the long-time dynamics. Because the simulations can be run independently and in parallel, on many GPUs or on distributed computing projects such as Folding@home, MSMs reach timescales of milliseconds and beyond from simulations of microseconds.

{{< note type="practice" title="Back of the envelope" >}}
Five thousand trajectories of 1 µs each add up to 5 ms of aggregate sampling, but none of them is long enough to show a 1 ms folding event from start to finish. What they do contain is many short-range moves: if the system jumps between neighbouring microstates every few nanoseconds, each trajectory records hundreds of such jumps, and the whole data set records about $10^6$. A transition matrix over 300 microstates has at most $9\times10^4$ non-zero entries, and in practice far fewer, because each microstate connects to a handful of neighbours. The MSM turns many local observations into a global prediction, in the same way that a road map assembled from many short drives predicts the time of a journey nobody has driven end to end.
{{< /note >}}

{{< note type="story" >}}
The mathematics came from Berlin. In 1999 Christof Schütte, Alexander Fischer, Wilhelm Huisinga and Peter Deuflhard, at the Zuse Institute and the Free University, formulated conformational dynamics through the transfer operator, whose dominant eigenfunctions identify metastable sets. The practical recipe came from simulation groups with large computers: William Swope, Jed Pitera and Fred Suits at IBM, working in the context of the Blue Gene project, introduced the implied-timescale test in 2004, and Vijay Pande's group at Stanford, which had launched the Folding@home distributed-computing project in 2000, turned MSMs into a routine tool for analysing thousands of independent trajectories.
{{< /note >}}

The idea is to divide configuration space into many small regions, **microstates**, and to model the dynamics as jumps between them, observed at a fixed time interval $\tau$, the **lag time**. If $\tau$ is long enough that the system forgets where within a microstate it came from, the jumps are memoryless, and the whole dynamics is described by a matrix of transition probabilities.

## The transition matrix

Let $c_{ij}(\tau)$ count how often a trajectory in microstate $i$ at time $t$ was in microstate $j$ at time $t + \tau$, summed over all trajectories and all times. The maximum-likelihood transition matrix is the row-normalised count matrix, often symmetrised (or estimated with a reversibility constraint) to respect detailed balance in equilibrium:

{{< eq title="A Markov state model" say="The probability of being in each microstate after one lag time is the current probability vector multiplied by the matrix of jump probabilities." >}}
$$ T_{ij}(\tau) = \frac{c_{ij}(\tau)}{\sum_k c_{ik}(\tau)}, \qquad \mathbf p(t + \tau) = \mathbf p(t)\,\mathbf T(\tau), \qquad \mathbf p(n\tau) = \mathbf p(0)\,\mathbf T(\tau)^n $$
- $T_{ij}(\tau)$: the probability of jumping from microstate $i$ to $j$ in one lag time; each row sums to 1
- the stationary distribution $\boldsymbol\pi$, with $\boldsymbol\pi\mathbf T = \boldsymbol\pi$, is the equilibrium population of each microstate
{{< /eq >}}

{{< fig src="counting.svg" alt="A row of sixteen coloured squares labelled 1, 2 or 3, with arcs joining frames three apart, above a 3 by 3 count matrix and the transition matrix obtained by dividing each row by its sum." caption="Counting transitions at lag $\tau$ = 3 frames. Every frame is an origin, so the 16 frames give 13 overlapping pairs; dividing each row of the count matrix by its sum gives the maximum-likelihood transition matrix. With so few counts the estimate is crude: microstate 1 receives no counts from 2 or 3, so the model can never return to it." >}}

Counting with a sliding window, as in the figure, uses every frame as a time origin. The counts are then correlated, which does not bias the estimate of $\mathbf T$ but does make naive error estimates too small; the number of statistically independent transitions is closer to the number counted with a stride of $\tau$. In practice trajectories are saved every 10 to 100 ps, and lag times of 1 to 50 ns are typical for proteins in explicit solvent.

### Detailed balance and the reversible estimate

In equilibrium the flux from $i$ to $j$ equals the flux from $j$ to $i$, $\pi_i T_{ij} = \pi_j T_{ji}$, and an estimated matrix should respect this. The row-normalised count matrix does not, because finite trajectories contain unequal numbers of forward and backward jumps. Symmetrising the counts, $c_{ij} \to (c_{ij} + c_{ji})/2$, enforces detailed balance but sets the stationary distribution proportional to the row sums of the counts, that is, to where the trajectories happened to spend their time. If trajectories were started from an unfolded ensemble and are short compared with folding, the symmetrised model inherits that unfolded bias. The **reversible maximum-likelihood estimator** instead maximises the likelihood $\prod_{ij} T_{ij}^{c_{ij}}$ subject to detailed balance, by a fixed-point iteration described by Bowman, Beauchamp, Boxer and Pande (2009) and by Prinz and colleagues (2011); it uses the observed transitions without assuming that the starting points were in equilibrium. PyEMMA and deeptime use it by default.

The power of the model is that it can be propagated far beyond the length of any single trajectory: $\mathbf T(\tau)^n$ predicts the evolution after $n$ lag times. Everything about the long-time dynamics is contained in the eigenvalues and eigenvectors of $\mathbf T$.

## Eigenvalues and implied timescales

The largest eigenvalue of a transition matrix is exactly 1, and its left eigenvector is the stationary distribution. The other eigenvalues $\lambda_2 \ge \lambda_3 \ge \ldots$ are smaller than 1, and each describes a **relaxation process**: a pattern of population flowing between groups of microstates that decays by a factor $\lambda_k$ every lag time. Writing $\lambda_k = e^{-\tau/t_k}$ defines the **implied timescale** of that process:

{{< eq title="Implied timescales" say="Each eigenvalue below one describes a process that relaxes exponentially; its timescale follows from the eigenvalue and the lag time." >}}
$$ t_k = -\frac{\tau}{\ln \lambda_k(\tau)}, \qquad k = 2, 3, \ldots $$
- $t_2$ is the slowest relaxation time, usually the transition between the two most stable groups of states
- the sign pattern of the corresponding right eigenvector $\boldsymbol\psi_2$ shows which microstates exchange population: positive on one side, negative on the other
{{< /eq >}}

The eigenvectors give a natural way to find **metastable states**: groups of microstates that exchange population quickly among themselves and slowly with other groups. Clustering microstates by their values in the slowest eigenvectors, as the PCCA+ algorithm of Peter Deuflhard and Marcus Weber does, lumps hundreds of microstates into a few macrostates with a clear physical meaning.

The eigenvectors also give the whole time evolution in one formula. For a reversible matrix with right eigenvectors $\boldsymbol\psi_k$ and left eigenvectors $\boldsymbol\phi_k$ normalised so that $\boldsymbol\phi_k\cdot\boldsymbol\psi_l = \delta_{kl}$,

$$
\mathbf p(n\tau) = \boldsymbol\pi + \sum_{k\ge2} \big(\mathbf p(0)\cdot\boldsymbol\psi_k\big)\, e^{-n\tau/t_k}\, \boldsymbol\phi_k .
$$

Any initial distribution relaxes to equilibrium as a sum of exponentials, one per eigenvalue, and the amplitude of each is the overlap of the starting distribution with the corresponding right eigenvector. An experiment that starts from a non-equilibrium state, such as a temperature jump or a mixing experiment, excites these processes with different amplitudes, and observables that are sensitive to different microstates see different combinations of the same timescales. This is the basis of the comparison of MSMs with relaxation kinetics measured by fluorescence or infrared spectroscopy.

## A worked example: three states

Take a small protein with an unfolded state U, an intermediate I and a folded state F, already lumped into three states, with symmetric counts at a lag time of 1 ns of 1960, 40 and 0 from U; 40, 900 and 60 from I; and 0, 60 and 6940 from F. Dividing each row by its sum gives

$$
\mathbf T(1\,\text{ns}) = \begin{pmatrix} 0.98 & 0.02 & 0 \\ 0.04 & 0.90 & 0.06 \\ 0 & 0.0086 & 0.9914 \end{pmatrix}.
$$

Because the counts are symmetric, the stationary distribution is proportional to the row sums: $\boldsymbol\pi = (0.2, 0.1, 0.7)$, a folding free energy of $-k_BT\ln(0.7/0.2) = -1.25\,k_BT$. The eigenvalues are 1, 0.9849 and 0.8865, so the implied timescales are $t_2 = -1/\ln 0.9849 = 65.7$ ns and $t_3 = 8.3$ ns. Two other quantities follow from linear equations. The **mean first-passage time** $m_i$ to F satisfies $m_i = \tau + \sum_j T_{ij}\,m_j$ for $i \ne$ F, with $m_{\text{F}} = 0$, giving 100 ns from U and 50 ns from I. The **committor** $q_i$, the probability of reaching F before U, satisfies $q_i = \sum_j T_{ij}\,q_j$ with $q_{\text{U}} = 0$ and $q_{\text{F}} = 1$; for I this gives $q_{\text{I}} = T_{\text{IF}}/(T_{\text{IU}} + T_{\text{IF}}) = 0.6$.

{{< py title="a three-state Markov model" >}}
import numpy as np
C = np.array([[1960., 40., 0.], [40., 900., 60.], [0., 60., 6940.]])   # U, I, F
tau = 1.0                                                             # ns
T = C / C.sum(1, keepdims=True)
w, v = np.linalg.eig(T.T)
o = np.argsort(-w.real); w = w.real[o]; v = v.real[:, o]
pi = v[:, 0] / v[:, 0].sum()
print("stationary distribution:", pi.round(3))
print("implied timescales (ns):", (-tau / np.log(w[1:])).round(1))
m = np.linalg.solve(np.eye(2) - T[:2, :2], tau * np.ones(2))
print("mean first-passage times to F from U and I (ns):", m.round(1))
mb = np.linalg.solve(np.eye(2) - T[1:, 1:], tau * np.ones(2))
print("mean first-passage time to U from F (ns):", mb[1].round(1))
q = np.array([0.0, T[1, 2] / (T[1, 0] + T[1, 2]), 1.0])
print("committors U, I, F:", q.round(2))
flux = pi[0] * T[0, 1] * q[1] / tau                # reactive flux out of U
k = flux / (pi * (1 - q)).sum()
print(f"TPT rate U->F: {k:.4f} per ns, 1/k = {1/k:.0f} ns")
p0 = np.array([1.0, 0.0, 0.0])
for n in (10, 100, 1000):
    print(f"populations after {n} ns:", (p0 @ np.linalg.matrix_power(T, n)).round(3))
{{< /py >}}

{{< fig src="three-state.svg" alt="Left: bar chart of the two slow eigenvectors over states U, I and F. Right: populations of U, I and F against time on a log axis, starting from U, with dashed lines at 8.3 and 66 ns." caption="The three-state example. $\psi_2$ is positive on U and I and negative on F: the slowest process, 66 ns, is folding. $\psi_3$ is dominated by I: the 8.3 ns process is the filling and emptying of the intermediate. Started in U, the intermediate peaks at 15 % near 27 ns before the folded population takes over." >}}

The output shows a point that often confuses: the slowest implied timescale, 65.7 ns, is not the folding time. The mean first-passage time from U to F is 100 ns and from F to U 317 ns, and for two-state kinetics the relaxation rate is the sum of the forward and backward rates, $1/100 + 1/317 = 1/76$ ns⁻¹, close to $1/t_2$; the remaining difference comes from the intermediate. Transition path theory gives the same 100 ns as the inverse rate, here because U is a single state, and the flux through I is the only path, since $T_{\text{UF}} = 0$.

{{< note type="warn" title="Myth" >}}
*The slowest implied timescale is the folding time.* It is a relaxation time, the inverse of the sum of forward and backward rates in the two-state limit, and it describes how fast populations approach equilibrium from any starting point. When the folded state is strongly favoured, the backward rate is small and $t_2$ approaches the folding time; when the two states are equally populated, $t_2$ is half of it. Report mean first-passage times or TPT rates when comparing with a measured folding or unbinding time.
{{< /note >}}

## Validating the model

The Markov assumption is never exact; it is a good approximation only when the lag time is long enough. The standard test, introduced by William Swope, Jed Pitera and Fred Suits in 2004, plots the implied timescales as a function of $\tau$. If the dynamics between microstates is Markovian, the timescales are independent of $\tau$; if not, they increase with $\tau$, because memory makes the short-lag model look faster than the real dynamics. One chooses the smallest lag time at which the slowest timescales have levelled off. A stricter test is the **Chapman–Kolmogorov test**: compare the populations predicted by $\mathbf T(\tau)^n$ with those estimated directly at lag $n\tau$.

### Why a plateau means Markovian

The argument for the test is one line. If the dynamics between microstates is exactly Markovian, then $\mathbf T(n\tau) = \mathbf T(\tau)^n$, so each eigenvalue obeys $\lambda_k(n\tau) = \lambda_k(\tau)^n$, and

$$
t_k(n\tau) = -\frac{n\tau}{\ln \lambda_k(\tau)^n} = -\frac{\tau}{\ln\lambda_k(\tau)} = t_k(\tau).
$$

A Markov model predicts timescales independent of the lag time; any dependence measures the failure of the Markov assumption. Marco Sarich, Frank Noé and Christof Schütte showed in 2010 that the error in an MSM's eigenvalues is bounded by two terms: how well the microstates resolve the slow eigenfunctions, which improves with finer or better-placed microstates, and a term that decays as the lag time grows. Both levers appear in practice: better features and more clusters, or a longer lag.

The commonest source of memory is a microstate boundary placed across a barrier top. The figure shows a two-state model of a particle in a $4\,k_BT$ double well, with the boundary at $x = 0$. Near the barrier the particle crosses the boundary several times before committing, so the label flickers, and a model built at a lag of 0.02 reduced time units counts every flicker as a transition. Its implied timescale is 3.0, against 7.75 at a lag of 2 and 7.58 from Kramers' formula for the relaxation time $1/(2k)$. The Chapman–Kolmogorov test makes the failure visible without any eigenvalues: the short-lag model predicts that a particle starting in A forgets its state almost three times faster than it does.

{{< fig src="ck-test.svg" alt="Left: a trajectory segment crossing x = 0 with three label changes. Right: probability of being in A at time t given A at time 0; black dots for the direct estimate, a teal curve from the lag-2 model that matches them, and a pink curve from the lag-0.02 model that decays too fast." caption="A Chapman–Kolmogorov test for a two-state model of a $4\,k_BT$ double well. Recrossings of the boundary at the barrier top make the short-lag model (pink, $t_2$ = 3.0) relax much too fast; at lag 2 (teal, $t_2$ = 7.8) the model reproduces the direct estimate at every time." >}}

{{< note type="warn" title="Myth" >}}
*A longer lag time is always safer.* A longer lag reduces memory, but the model then cannot describe anything faster than $\tau$, the number of independent transitions counted per trajectory falls, and statistical errors grow. Once $\tau$ approaches $t_k$ the eigenvalue $\lambda_k = e^{-\tau/t_k}$ becomes small and its logarithm noisy. The right lag is the shortest one on the plateau, and if no plateau appears before the timescales run into the line $t = \tau$, the remedy is better microstates, not a longer lag.
{{< /note >}}

The figure builds an MSM live. A particle diffuses on a landscape with three wells; the plane is divided into a grid of microstates; as the trajectory grows, the count matrix and its eigenvalues are recomputed. The left panel colours each microstate by the slowest eigenvector, whose sign separates the two groups of states that exchange most slowly. The right panel shows the implied timescales against lag time.

{{< widget name="msm" title="A Markov state model from a growing trajectory" caption="Left: the trajectory (rose) over a grid of microstates coloured by the slowest eigenvector (blue negative, orange positive). Right: the two slowest implied timescales against lag time; the shaded triangle marks timescales shorter than the lag, which cannot be resolved. Let the trajectory grow, then choose the lag time where the timescales become flat." >}}

At short lag times the implied timescales are too small: the coarse grid of microstates hides fast motions within each cell, the model has memory, and the transitions look faster than they are. As the lag increases, the timescales rise and level off, the sign that the model has become Markovian. Once the lag approaches the timescale itself, statistics run out. A good MSM is built at the smallest lag on the plateau, and the plateau values are its predictions for the slow relaxation times.

## Better microstates: TICA and the variational principle

The quality of an MSM depends on how well the microstates resolve the slow processes. Microstates are usually defined by clustering conformations, but clustering in raw coordinates such as atomic positions emphasises large, fast fluctuations and may split slow processes across many clusters. Since 2013, the standard practice has been to first project the data onto slow collective coordinates found by **time-lagged independent component analysis** (TICA, introduced to molecular simulation by Guillermo Pérez-Hernández and colleagues and by Christian Schwantes and Vijay Pande), which finds linear combinations of input features with maximal autocorrelation at a lag time, the coordinates that change most slowly. [The chapter on learned collective variables](../es-ml-cvs/) shows TICA finding a slow direction that principal component analysis misses.

TICA is a special case of a general **variational principle**. Frank Noé and Feliks Nüske showed in 2013 that, for reversible dynamics, the eigenvalues of the transfer operator are bounded from above by those estimated with any finite set of basis functions, just as the Rayleigh–Ritz principle bounds energies in quantum mechanics. Better features give higher eigenvalues and longer timescales, so models can be compared and optimised by a score: the **variational approach to conformational dynamics** (VAC), and its generalisation to non-reversible processes, the **variational approach for Markov processes** (VAMP, Hao Wu and Noé). These scores turned MSM construction into an optimisation problem and led directly to **VAMPnets** (Andreas Mardt, Luca Pasquali, Hao Wu and Noé, 2018), neural networks that learn the optimal soft assignment to metastable states end to end.

The variational principle also gives a way to choose hyperparameters without looking at test results by eye. Robert McGibbon and Pande showed in 2015 that the sum of the leading eigenvalues, the generalised matrix Rayleigh quotient or GMRQ, can be cross-validated: estimate the model on half of the trajectories and score it on the other half. A model with too many microstates for the data scores well on its training set and badly on the test set, exactly as an overfitted regression does. Typical choices that survive this test for a small protein are a few hundred to a thousand microstates, 5 to 20 TICA components and a TICA lag of a few nanoseconds.

### Coarse-graining with care

Lumping microstates into macrostates with PCCA+ is useful for interpretation, but a model on four macrostates is usually less Markovian than the model on 400 microstates from which it came: the lumping reintroduces the boundary problem of the figure above. The recommended practice is to estimate and validate the model on microstates, then use PCCA+ memberships to describe and visualise it, and to report kinetics computed on the microstate model. When a few-state kinetic model is needed, **hidden Markov models**, introduced to this field by Noé, Hao Wu, Jan-Hendrik Prinz and Nuria Plattner in 2013, treat the metastable states as hidden and the microstates as noisy observations, which restores Markovian behaviour at much shorter lags.

## Fluxes, committors and pathways

An MSM also gives the mechanisms of transitions through **transition path theory** (Weinan E and Eric Vanden-Eijnden, applied to MSMs by Philipp Metzner, Christof Schütte and Vanden-Eijnden, and by Noé and colleagues for protein folding in 2009). The forward committor $q_i$ of each microstate, the probability of reaching B before A, solves a linear system built from $\mathbf T$; from it follow the reactive flux between microstates, the dominant transition pathways, and the rate $k_{AB}$. MSM studies of protein folding, ligand binding and conformational change in kinases and receptors have used these tools to show how multiple parallel pathways contribute to a single observed process.

The formulas are compact. With forward committor $q^+_i$ and, for reversible dynamics, backward committor $q^-_i = 1 - q^+_i$, the reactive flux from $i$ to $j$ is $f_{ij} = \pi_i\, q^-_i\, T_{ij}\, q^+_j$ for $i \ne j$, and the net flux $f^+_{ij} = \max(0, f_{ij} - f_{ji})$ removes back-and-forth traffic. The total flux $F$ out of A, divided by the probability $\sum_i \pi_i q^-_i$ that the system last came from A, gives the rate $k_{AB} = F/(\tau\sum_i\pi_i q^-_i)$. Decomposing the net flux into paths, each carrying the bottleneck flux of its weakest link, gives a ranked list of pathways. In the three-state example the flux out of U is $0.2 \times 0.02 \times 0.6 = 0.0024$ per lag time, the denominator is $0.2 + 0.1\times0.4 = 0.24$, and $k = 0.01$ ns⁻¹, the inverse of the 100 ns first-passage time.

{{< note type="practice" title="From the lab" >}}
Vincent Voelz, Gregory Bowman, Kyle Beauchamp and Pande (2010) built an MSM from Folding@home trajectories of the 39-residue protein NTL9, whose folding time is of order a millisecond, and predicted folding kinetics consistent with experiment without observing folding in any single trajectory. Ignasi Buch, Toni Giorgino and Gianni De Fabritiis (2011) observed the binding of benzamidine to trypsin in hundreds of 100 ns trajectories run on the GPUGRID network and reconstructed the binding pathway and its free energy. Plattner and Noé (2015) analysed the same system with MSMs and found several binding pathways and kinetically distinct bound conformations; in 2017 Plattner, Stefan Doerr, De Fabritiis and Noé applied MSMs and hidden Markov models to the association of the proteins barnase and barstar, recovering both association and dissociation, although dissociation is many orders of magnitude slower than any single trajectory. In materials simulation the same logic, a matrix of rates between states assembled from short simulations, underlies kinetic Monte Carlo with rate catalogues computed from transition-state searches.
{{< /note >}}

## In practice

Building an MSM involves choosing features (distances, dihedrals, contacts), reducing them with TICA or a VAMP-trained network, clustering into a few hundred microstates with k-means, choosing the lag time from implied timescales, estimating a reversible transition matrix, validating with the Chapman–Kolmogorov test, and coarse-graining into macrostates with PCCA+. Errors are estimated by Bayesian sampling of transition matrices or by bootstrapping over trajectories. The PyEMMA and deeptime libraries, from the Noé group, and MSMBuilder, from the Pande group, implement this workflow. The main requirement is enough sampling: every transition the model describes must have been observed, in both directions, enough times in the short trajectories, which is often achieved by adaptive sampling, starting new trajectories from poorly sampled microstates.

### Failure modes and diagnostics

Four problems account for most unreliable MSMs.

- **Disconnected states.** If transitions into a microstate are observed but none out of it, or the reverse, the count matrix is not strongly connected and the stationary distribution is undefined. Estimators restrict the model to the largest strongly connected set; check how much data was discarded, because a discarded microstate may be the folded state.
- **Too few transitions.** The relative error of a matrix element is roughly $1/\sqrt{c_{ij}}$. A barrier crossed ten times in each direction gives a slowest timescale with an error of order 30 %, however many frames were collected. Bayesian MSMs, which sample transition matrices consistent with the counts, report this honestly; bootstrapping over whole trajectories does the same.
- **Memory.** Timescales that rise with lag without levelling off mean that the features or the clustering miss a slow variable. Adding contacts or dihedrals that change in the slow process, or switching from RMSD clustering to TICA space, usually fixes it.
- **Non-equilibrium starting points.** Short trajectories all started from one crystal structure overweight that structure in any estimate that relies on how long trajectories stay in each microstate. The reversible estimator uses transition counts, which are correct conditional statistics, but every relevant transition must still have been seen.

Adaptive sampling attacks the second and fourth problems. After each round, new trajectories are seeded from the microstates with the fewest counts, or from those whose uncertainty contributes most to the slowest timescale; the counts remain valid because a Markov model uses only conditional transition statistics, not the distribution of starting points.

{{< note type="key" >}}
- An MSM discretises configuration space into microstates and models the dynamics at lag time $\tau$ by a transition matrix $T_{ij}(\tau)$ estimated from counts in many short trajectories.
- Eigenvalue 1 gives the stationary distribution; the others give implied timescales $t_k = -\tau/\ln\lambda_k$, and their eigenvectors reveal the slow processes and metastable states.
- Choose the lag time where implied timescales become independent of $\tau$; validate with the Chapman–Kolmogorov test.
- TICA, VAC and VAMP provide slow features and variational scores; VAMPnets learn states end to end.
- Transition path theory on the MSM gives committors, fluxes, pathways and rates.
- The slowest implied timescale is a relaxation time, the inverse of the sum of forward and backward rates; compare mean first-passage times or TPT rates with measured folding or binding times.
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
- q: "A two-state MSM gives a slowest implied timescale of 50 μs for two equally populated states. What is the mean time to go from one state to the other?"
  options: ["25 μs", "50 μs", "100 μs"]
  answer: 2
  why: "With equal populations the forward and backward rates are equal, so 1/t₂ = 2k and the first-passage time 1/k is 2t₂ = 100 μs."
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
