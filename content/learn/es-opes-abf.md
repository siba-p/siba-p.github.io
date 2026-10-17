---
title: "OPES and adaptive biasing force"
description: "Biasing towards a target distribution rather than filling with hills: on-the-fly probability enhanced sampling (OPES) and its explore, expanded-ensemble and flooding variants; variationally enhanced sampling (VES) as the minimisation of a convex functional; and the adaptive biasing force (ABF) method, which cancels the mean force instead of the free energy; with their equations, convergence behaviour, PLUMED and Colvars usage, and how to choose among adaptive methods."
track: rl-bias
weight: 2
level: Advanced
prereqs: ["es-metadynamics"]
lab: "Compare OPES and ABF with metadynamics on the same free-energy profile"
---

## Target distributions instead of hills

Well-tempered metadynamics, viewed from the end, drives the collective variable towards a definite **target distribution**, $P(s)^{1/\gamma}$, by depositing hills until it gets there. Two later methods start from that target and ask directly what bias produces it. If the unbiased distribution of the collective variable is $P(s)$ and we want the system to sample a target $p_{\text{tg}}(s)$, the required bias is

$$
V(s) = -\frac{1}{\beta}\ln\frac{p_{\text{tg}}(s)}{P(s)} + C,
$$

because adding $V$ multiplies the distribution by $e^{-\beta V}$. The difficulty is that $P(s)$ is unknown; it is what we want to compute. OPES estimates it on the fly from the simulation itself; VES finds the bias by minimising a functional that does not require knowing $P(s)$ in advance.

## OPES: on-the-fly probability enhanced sampling

Michele Invernizzi and Michele Parrinello introduced **OPES** in 2020. As the simulation runs, it builds a kernel density estimate $\tilde P_n(s)$ of the **unbiased** distribution, by depositing a Gaussian kernel at each sampled point weighted by $e^{\beta V}$ to undo the current bias, and it sets the bias at every step from that estimate:

{{< eq title="The OPES bias" say="Estimate the unbiased probability as you go, reweighting away the current bias; set the bias to push the sampling towards a flattened, well-tempered version of it." >}}
$$ \textcolor{#845ef7}{V_n}(s) = \left(1 - \frac{1}{\gamma}\right)\frac{1}{\beta}\,\ln\!\left(\frac{\textcolor{#4c6ef5}{\tilde P_n}(s)}{Z_n} + \textcolor{#e64980}{\epsilon}\right), \qquad \textcolor{#4c6ef5}{\tilde P_n}(s) = \frac{\sum_k w_k\, G(s, s_k)}{\sum_k w_k}, \quad w_k = e^{\beta V_{k-1}(s_k)} $$
- target: the well-tempered distribution $P(s)^{1/\gamma}$; $Z_n$ normalises $\tilde P_n$ over the explored region
- $\textcolor{#e64980}{\epsilon} = e^{-\beta\Delta E/(1 - 1/\gamma)}$ caps the bias at a user-set barrier height $\Delta E$, so unexplored regions are not over-biased
- the free energy is read off the estimate: $F(s) = -k_BT\ln\tilde P_n(s)$
{{< /eq >}}

The essential difference from metadynamics is what is accumulated. Metadynamics accumulates the bias itself, so every early mistake stays in the bias until later hills compensate. OPES accumulates an estimate of a probability distribution, which converges like any reweighted histogram, and computes the bias from it afresh at every step. As a result the bias becomes quasi-static quickly: after the first few transitions it hardly changes, which makes reweighting straightforward and convergence much faster. In practice OPES needs one main parameter, the expected barrier height `BARRIER`, from which sensible defaults for the bias factor and kernel width follow.

{{< widget name="eslab" title="OPES, ABF and metadynamics on the same landscape" caption="The same laboratory as in the metadynamics chapter, now starting with OPES. Compare how quickly each method crosses the barrier, how its bias evolves, and how fast its free-energy estimate (orange) converges, on the double-well, asymmetric and three-state profiles." opts=`{"method":"opes","land":"triple"}` >}}

In the figure, OPES typically makes its first crossing a little later than an aggressive metadynamics run, because the bias is capped and grows from a probability estimate rather than from a pile of hills, but once both states have been visited its bias settles and its estimate converges smoothly, without the persistent fluctuations of plain metadynamics.

Several variants extend the method. **OPES-explore** (2022) targets the well-tempered distribution of the biased rather than the unbiased simulation, which explores faster at the cost of slower convergence, a useful first step for mapping a landscape. **OPES expanded ensembles** (Invernizzi, Pablo Piaggi and Parrinello, 2020) apply the same idea to temperatures or Hamiltonians instead of collective variables, sampling several thermodynamic states at once in a single simulation, a CV-free alternative to replica exchange. **OPES flooding** (Dhiman Ray and Parrinello, 2023) builds the bias only in the reactant basin and keeps the transition state unbiased, giving rates in the same spirit as infrequent metadynamics. In PLUMED, a basic OPES run is

```text
d1: DISTANCE ATOMS=1,10
opes: OPES_METAD ARG=d1 PACE=500 BARRIER=40
PRINT ARG=d1,opes.bias STRIDE=100 FILE=COLVAR
```

with the barrier in the engine's energy units (kJ/mol in GROMACS).

## Variationally enhanced sampling

Omar Valsson and Michele Parrinello introduced **variationally enhanced sampling** (VES) in 2014. They showed that the bias producing a chosen target distribution minimises a convex functional:

{{< eq title="The VES functional" say="Among all possible biases, the one that makes the system sample the target distribution is the minimum of a convex functional, so it can be found by optimisation." >}}
$$ \Omega[V] = \frac{1}{\beta}\ln\frac{\int e^{-\beta(F(s) + V(s))}\,\mathrm ds}{\int e^{-\beta F(s)}\,\mathrm ds} + \int p_{\text{tg}}(s)\, V(s)\,\mathrm ds $$
- at the minimum, $V(s) = -F(s) - \frac{1}{\beta}\ln p_{\text{tg}}(s) + C$, so the free energy follows from the bias
- the gradient of $\Omega$ is the difference between averages in the biased simulation and in the target, both computable while the simulation runs
{{< /eq >}}

The bias is expanded in a basis set, for example Legendre polynomials, Chebyshev polynomials or wavelets, or represented by a neural network, and its coefficients are optimised by stochastic gradient descent during the simulation, using averages collected over short intervals. VES turned the construction of a bias into an optimisation problem, which opened the way to neural-network biases and to the machine-learning methods of the last part of this subject. Its practical difficulty is the noise of the stochastic optimisation, which is managed with averaged stochastic gradient schemes.

## The adaptive biasing force

A different route, based on forces rather than energies, is the **adaptive biasing force** (ABF) method of Eric Darve and Andrew Pohorille (2001). It estimates the **mean force** along the collective variable, $-\mathrm dF/\mathrm ds$, by averaging the instantaneous force acting on the CV in bins of $s$, and applies a biasing force equal and opposite to the current estimate:

{{< eq title="The adaptive biasing force" say="Measure the average force pushing the collective variable in each bin, and push back with exactly that force; the CV then diffuses freely, and the integral of the measured force is the free energy." >}}
$$ \textcolor{#f08c2e}{F_{\text{ABF}}}(s) = -\Big\langle \textcolor{#12a594}{F_\xi} \Big\rangle_{s}, \qquad \frac{\mathrm dF}{\mathrm ds} = -\Big\langle \textcolor{#12a594}{F_\xi} \Big\rangle_{s}, \qquad F(s) = -\int^{s} \big\langle F_\xi \big\rangle_{s'}\,\mathrm ds' $$
- $\textcolor{#12a594}{F_\xi}$: the instantaneous force along the collective variable (with geometric corrections for curvilinear CVs)
- once the mean force is cancelled, the CV performs an unbiased random walk and samples uniformly
{{< /eq >}}

Because the mean force is a local quantity, ABF converges well once each bin has enough samples; a ramp that applies only a fraction of the estimate until a bin has a minimum number of samples avoids acting on noise. Select ABF in the figure: the CV diffuses across the whole range almost at once, and the free energy is built from the integrated mean force. The original form requires CVs whose instantaneous force can be computed, which restricts it; the **extended-system ABF** (eABF) of Adrien Lesage, Tony Lelièvre, Gabriel Stoltz and Jérôme Hénin (2017) couples the CV to a fictitious particle by a stiff spring and applies ABF to that particle, which works with any differentiable CV. ABF is implemented in the Colvars module of NAMD, LAMMPS and GROMACS, and in PLUMED.

## Choosing an adaptive method

All of these methods, metadynamics, well-tempered metadynamics, OPES, VES and ABF, solve the same problem along the same kind of collective variables, and in their converged limits they give the same free-energy surface. They differ in how fast they explore, how fast and how smoothly they converge, and what they need from the user. Plain metadynamics explores aggressively but does not converge cleanly; well-tempered metadynamics converges and is the best documented; OPES converges fastest to a quasi-static bias with few parameters and is increasingly the default choice in PLUMED; VES is the most flexible in the form of the bias and the target; ABF is efficient for one or two CVs whose mean force can be estimated and makes no assumption about the shape of the free energy. Every one of them shares the fundamental weakness of collective-variable methods: if the CV misses a slow degree of freedom, the result is wrong in ways that may not be obvious. Methods that avoid collective variables altogether, replica exchange and its relatives, are the subject of [the next chapter](../es-replica-exchange/).

{{< note type="key" >}}
- OPES (2020) estimates the unbiased CV distribution on the fly by reweighted kernel density estimation and sets $V = (1 - 1/\gamma)k_BT\ln(\tilde P/Z + \epsilon)$; the bias quickly becomes quasi-static, and $F = -k_BT\ln\tilde P$.
- OPES variants: explore (faster exploration), expanded ensembles (temperatures or Hamiltonians, CV-free), flooding (rates).
- VES (2014) finds the bias that produces a target distribution by minimising a convex functional with stochastic gradients, with basis-set or neural-network biases.
- ABF (2001) cancels the estimated mean force along the CV; the CV then diffuses freely and $F$ is the integral of the mean force; eABF extends it to any CV.
{{< /note >}}

{{< quiz >}}
- q: "What does OPES accumulate during a simulation, as opposed to metadynamics?"
  options: ["Gaussian hills of bias", "A reweighted estimate of the unbiased probability distribution of the CV, from which the bias is computed", "Forces"]
  answer: 1
  why: "Accumulating a probability estimate makes the bias converge quickly and smoothly."
- q: "What quantity does ABF estimate and cancel?"
  options: ["The free energy", "The mean force along the collective variable", "The temperature"]
  answer: 1
  why: "Cancelling the mean force makes the CV diffuse freely; integrating it gives F."
- q: "Why is the VES functional being convex useful?"
  options: ["It makes the simulation faster", "It has a unique minimum, so the bias can be found reliably by gradient-based optimisation", "It removes the need for a CV"]
  answer: 1
  why: "Convexity guarantees that local optimisation finds the global minimum."
- q: "Which method samples several temperatures in one simulation without a collective variable?"
  options: ["Well-tempered metadynamics", "OPES expanded ensembles", "ABF"]
  answer: 1
  why: "It biases the energy to sample a range of temperatures, like replica exchange in one run."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. M. Invernizzi and M. Parrinello, "Rethinking metadynamics: from bias potentials to probability distributions", *Journal of Physical Chemistry Letters* **11**, 2731–2736 (2020).
2. M. Invernizzi, P. M. Piaggi and M. Parrinello, "Unified approach to enhanced sampling", *Physical Review X* **10**, 041034 (2020).
3. M. Invernizzi and M. Parrinello, "Exploration vs convergence speed in adaptive-bias enhanced sampling", *Journal of Chemical Theory and Computation* **18**, 3988–3996 (2022).
4. D. Ray and M. Parrinello, "Kinetics from metadynamics: principles, applications, and outlook", *Journal of Chemical Theory and Computation* **19**, 5649–5670 (2023).
5. O. Valsson and M. Parrinello, "Variational approach to enhanced sampling and free energy calculations", *Physical Review Letters* **113**, 090601 (2014).
6. E. Darve and A. Pohorille, "Calculating free energies using average force", *Journal of Chemical Physics* **115**, 9169–9183 (2001).
7. J. Comer, J. C. Gumbart, J. Hénin, T. Lelièvre, A. Pohorille and C. Chipot, "The adaptive biasing force method: everything you always wanted to know but were afraid to ask", *Journal of Physical Chemistry B* **119**, 1129–1151 (2015).
8. A. Lesage, T. Lelièvre, G. Stoltz and J. Hénin, "Smoothed biasing forces yield unbiased free energies with the extended-system adaptive biasing force method", *Journal of Physical Chemistry B* **121**, 3676–3685 (2017).
9. G. Fiorin, M. L. Klein and J. Hénin, "Using collective variables to drive molecular dynamics simulations", *Molecular Physics* **111**, 3345–3362 (2013).
10. J. Hénin, T. Lelièvre, M. R. Shirts, O. Valsson and L. Delemotte, "Enhanced sampling methods for molecular dynamics simulations", *Living Journal of Computational Molecular Science* **4**, 1583 (2022).

</div>
