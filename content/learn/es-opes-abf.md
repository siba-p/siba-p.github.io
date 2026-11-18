---
title: "OPES and adaptive biasing force"
description: "Biasing towards a target distribution rather than filling with hills: on-the-fly probability enhanced sampling (OPES) and its explore, expanded-ensemble and flooding variants; variationally enhanced sampling (VES) as the minimisation of a convex functional; and the adaptive biasing force (ABF) method, which cancels the mean force instead of the free energy; with their equations, convergence behaviour, PLUMED and Colvars usage, and how to choose among adaptive methods."
hook: "Metadynamics keeps every hill it has ever dropped. OPES keeps a running estimate of the probability instead, and the adaptive biasing force measures the force holding the system back and cancels it."
objectives:
  - "Derive the bias that turns the unbiased distribution of a variable into a chosen target"
  - "Explain why OPES reaches a quasi-static bias faster than metadynamics"
  - "Write a minimal PLUMED input for OPES from an estimate of the barrier height"
  - "Explain how VES finds a bias by minimising a convex functional"
  - "Compute a free-energy profile from the ABF mean force, and choose among adaptive methods"
cover: "cover.svg"
milestones:
  - year: 2001
    text: "Darve and Pohorille introduce the adaptive biasing force method"
  - year: 2014
    text: "Valsson and Parrinello introduce variationally enhanced sampling"
  - year: 2017
    text: "Lesage, Lelièvre, Stoltz and Hénin publish extended-system ABF"
  - year: 2020
    text: "Invernizzi and Parrinello introduce OPES, rethinking metadynamics"
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

The relation is exact and needs only one line. Adding a bias $V(s)$ multiplies the Boltzmann weight of every configuration with collective variable $s$ by $e^{-\beta V(s)}$, so the biased distribution is $P_V(s) = P(s)\,e^{-\beta V(s)}/\langle e^{-\beta V}\rangle$; setting $P_V = p_{\text{tg}}$ and taking the logarithm gives the bias above, with the constant $C$ absorbing the normalisation. The choice of target is a choice of where to spend simulation time. A **uniform** target over a range spends equal time at the barrier top and at the bottom of the deepest well, and needs $V = -F$. A **well-tempered** target $P(s)^{1/\gamma}$ keeps the shape of the landscape but divides every free-energy difference by γ, so the system still spends most of its time in low free-energy regions, where the answer is needed most accurately, while crossing barriers of a few $k_BT$.

{{< fig src="ledgers.svg" alt="Three schematic panels: a pile of overlapping Gaussian hills; small weighted kernels summing to a smooth two-peaked probability curve; scattered force samples in bins with their averages marked" caption="What each method keeps. Metadynamics adds hills to the bias itself, so every early hill stays in it. OPES keeps reweighted kernels that estimate the unbiased probability, and recomputes the bias from that estimate at every step. ABF keeps a running average of the instantaneous force in each bin, cancels it, and integrates it for $F$." >}}

## OPES: on-the-fly probability enhanced sampling

Michele Invernizzi and Michele Parrinello introduced **OPES** in 2020. As the simulation runs, it builds a kernel density estimate $\tilde P_n(s)$ of the **unbiased** distribution, by depositing a Gaussian kernel at each sampled point weighted by $e^{\beta V}$ to undo the current bias, and it sets the bias at every step from that estimate:

{{< eq title="The OPES bias" say="Estimate the unbiased probability as you go, reweighting away the current bias; set the bias to push the sampling towards a flattened, well-tempered version of it." >}}
$$ \textcolor{#845ef7}{V_n}(s) = \left(1 - \frac{1}{\gamma}\right)\frac{1}{\beta}\,\ln\!\left(\frac{\textcolor{#4c6ef5}{\tilde P_n}(s)}{Z_n} + \textcolor{#e64980}{\epsilon}\right), \qquad \textcolor{#4c6ef5}{\tilde P_n}(s) = \frac{\sum_k w_k\, G(s, s_k)}{\sum_k w_k}, \quad w_k = e^{\beta V_{k-1}(s_k)} $$
- target: the well-tempered distribution $P(s)^{1/\gamma}$; $Z_n$ normalises $\tilde P_n$ over the explored region
- $\textcolor{#e64980}{\epsilon} = e^{-\beta\Delta E/(1 - 1/\gamma)}$ caps the bias at a user-set barrier height $\Delta E$, so unexplored regions are not over-biased
- the free energy is read off the estimate: $F(s) = -k_BT\ln\tilde P_n(s)$
{{< /eq >}}

The essential difference from metadynamics is what is accumulated. Metadynamics accumulates the bias itself, so every early mistake stays in the bias until later hills compensate. OPES accumulates an estimate of a probability distribution, which converges like any reweighted histogram, and computes the bias from it afresh at every step. As a result the bias becomes quasi-static quickly: after the first few transitions it hardly changes, which makes reweighting straightforward and convergence much faster. In practice OPES needs one main parameter, the expected barrier height `BARRIER`, from which sensible defaults for the bias factor and kernel width follow.

### How the estimate is built

Three details turn the equation into a working method. First, kernels are **compressed**: a new kernel that lands within a set distance of an existing one, by default one kernel width, is merged into it, so the number of kernels grows with the size of the explored region rather than with the length of the run, and evaluating the bias stays cheap. Second, the normalisation $Z_n$ is the average of $\tilde P_n$ over the kernel centres, which approximates its average over the region explored so far; the bias therefore compares each point with the typical probability of the region already visited, not with the whole, unknown space. Third, the kernel width starts from the fluctuation of the variable in the first stretch of the run, measured automatically unless `SIGMA` is given, and shrinks as the effective number of samples grows, as in any kernel density estimate.

The parameter `BARRIER`, written $\Delta E$, enters twice. By default the bias factor is $\gamma = \Delta E/k_BT$, so that a barrier of height $\Delta E$ becomes about $k_BT$ in the target. And $\epsilon$ caps the bias: where $\tilde P_n$ is zero, outside the explored region, $V = (1 - 1/\gamma)k_BT\ln\epsilon = -\Delta E$. Since $V$ inside the explored region is close to zero, the explored region is lifted by up to $\Delta E$ relative to everything unexplored, which is enough to push the system over any barrier lower than $\Delta E$.

{{< note type="practice" title="Back of the envelope" >}}
With `BARRIER=40` in GROMACS units at 300 K, $\Delta E/k_BT = 40/2.494 = 16.0$, so the default bias factor is 16. Then $\epsilon = e^{-\Delta E/[k_BT(1 - 1/\gamma)]} = e^{-17.1} = 3.7\times10^{-8}$: points whose estimated probability is below a few times $10^{-8}$ of the typical explored value all receive the same, capped bias. A real barrier of 35 kJ/mol becomes $35/16 = 2.2$ kJ/mol in the well-tempered target, less than $k_BT$, which the system crosses many times per nanosecond for a fast variable.
{{< /note >}}

{{< fig src="targets.svg" alt="Left: unbiased, well-tempered and uniform target densities on a log scale for a double well. Right: the free energy with a 35 kJ/mol barrier, the nearly flat converged OPES landscape, and the landscape before the first crossing, in which everything outside the starting basin lies up to 40 kJ/mol lower" caption="Left: three targets for the same double well; the unbiased density drops by $10^{-6}$ at the barrier, the well-tempered target with $\gamma$ = 16 by a factor of about 2. Right: what the variable feels. Before the first crossing, OPES knows only the left basin, so it lifts that basin by up to BARRIER = 40 kJ/mol relative to the unexplored rest, enough to spill over a 35 kJ/mol barrier; once both basins are known it converges to $F/\gamma$." >}}

{{< note type="warn" title="Myth" >}}
**Myth:** `BARRIER` must be known accurately in advance. **Reality:** it needs to be an upper estimate. If it is too low, the cap stops the bias from lifting the starting basin over the real barrier, and transitions stay rare. If it is too high, say 60 kJ/mol for a 35 kJ/mol barrier, the default target is flatter and the system spends more time in high free-energy regions, which costs some statistical efficiency but leaves the estimate correct. When in doubt, err on the high side, or set `BIASFACTOR` separately.
{{< /note >}}

Reweighting is simple because the bias becomes quasi-static. Once it has stopped changing appreciably, each frame is weighted by $e^{\beta V(s)}$ with the bias at that frame, and averages of any observable, or free energies along variables that were never biased, follow as in [umbrella sampling](../es-umbrella/). The free-energy difference between two basins can also be read directly from the estimate, $\Delta F_{AB} = -k_BT\ln\big(\int_B \tilde P\,\mathrm ds/\int_A \tilde P\,\mathrm ds\big)$, and plotting it against time is the standard convergence check: it should flatten after the first few transitions, while in metadynamics it keeps drifting until the hills have shrunk.

{{< widget name="eslab" title="OPES, ABF and metadynamics on the same landscape" caption="The same laboratory as in the metadynamics chapter, now starting with OPES. Compare how quickly each method crosses the barrier, how its bias evolves, and how fast its free-energy estimate (orange) converges, on the double-well, asymmetric and three-state profiles." opts=`{"method":"opes","land":"triple"}` >}}

In the figure, OPES typically makes its first crossing a little later than an aggressive metadynamics run, because the bias is capped and grows from a probability estimate rather than from a pile of hills, but once both states have been visited its bias settles and its estimate converges smoothly, without the persistent fluctuations of plain metadynamics.

Several variants extend the method. **OPES-explore** (2022) targets the well-tempered distribution of the biased rather than the unbiased simulation, which explores faster at the cost of slower convergence, a useful first step for mapping a landscape. **OPES expanded ensembles** (Invernizzi, Pablo Piaggi and Parrinello, 2020) apply the same idea to temperatures or Hamiltonians instead of collective variables, sampling several thermodynamic states at once in a single simulation, a CV-free alternative to replica exchange. **OPES flooding** (Dhiman Ray, Michele Parrinello and co-workers, 2022) builds the bias only in the reactant basin and keeps the transition state unbiased, giving rates in the same spirit as infrequent metadynamics. In PLUMED, a basic OPES run is

```text
d1: DISTANCE ATOMS=1,10
opes: OPES_METAD ARG=d1 PACE=500 BARRIER=40
PRINT ARG=d1,opes.bias STRIDE=100 FILE=COLVAR
```

with the barrier in the engine's energy units (kJ/mol in GROMACS).

The explore variant is the action `OPES_METAD_EXPLORE`, with the same `BARRIER` keyword. A common workflow runs it first, to find the basins and check that the variable separates them, and then switches to `OPES_METAD` for a converged estimate, because the explore variant's bias keeps changing for longer. Multithermal sampling uses `OPES_EXPANDED` driven by the potential energy through `ECV_MULTITHERMAL`, which takes a maximum temperature: a single simulation at 300 K then samples, and can be reweighted to, every temperature up to that maximum, with the cost of one replica rather than the dozens of [parallel tempering](../es-replica-exchange/). The price is that the range of potential energies between 300 K and the maximum grows in proportion to the number of atoms, so the random walk in energy that one run must complete gets longer as the system grows; the cost that parallel tempering pays in replicas, a single expanded-ensemble run pays in time.

## Variationally enhanced sampling

Omar Valsson and Michele Parrinello introduced **variationally enhanced sampling** (VES) in 2014. They showed that the bias producing a chosen target distribution minimises a convex functional:

{{< eq title="The VES functional" say="Among all possible biases, the one that makes the system sample the target distribution is the minimum of a convex functional, so it can be found by optimisation." >}}
$$ \Omega[V] = \frac{1}{\beta}\ln\frac{\int e^{-\beta(F(s) + V(s))}\,\mathrm ds}{\int e^{-\beta F(s)}\,\mathrm ds} + \int p_{\text{tg}}(s)\, V(s)\,\mathrm ds $$
- at the minimum, $V(s) = -F(s) - \frac{1}{\beta}\ln p_{\text{tg}}(s) + C$, so the free energy follows from the bias
- the gradient of $\Omega$ is the difference between averages in the biased simulation and in the target, both computable while the simulation runs
{{< /eq >}}

The bias is expanded in a basis set, for example Legendre polynomials, Chebyshev polynomials or wavelets, or represented by a neural network, and its coefficients are optimised by stochastic gradient descent during the simulation, using averages collected over short intervals. VES turned the construction of a bias into an optimisation problem, which opened the way to neural-network biases and to the machine-learning methods of the last part of this subject. Its practical difficulty is the noise of the stochastic optimisation, which is managed with averaged stochastic gradient schemes.

The gradient makes the method transparent. For a bias expanded as $V(s) = \sum_i \alpha_i f_i(s)$ with basis functions $f_i$,

$$
\frac{\partial\Omega}{\partial\alpha_i} = -\big\langle f_i\big\rangle_{V} + \big\langle f_i\big\rangle_{p_{\text{tg}}},
$$

the difference between the average of $f_i$ in the current biased simulation and its average over the target. If the simulation spends more time than the target in some region, the functions that are large there have biased averages that are too large, and the update raises the bias there. The second derivative is the covariance of the $f_i$ in the biased ensemble, a positive semi-definite matrix, which is why $\Omega$ is convex in the coefficients and why there are no false minima to get stuck in. Valsson and Parrinello used the averaged stochastic gradient descent of Francis Bach and Eric Moulines, updating the coefficients every few hundred steps from short-time averages, and later made the target itself adaptive, a well-tempered target updated from the current estimate of $F$ (2015). Replacing the basis expansion by a neural network, as Luigi Bonati, Yue-Yu Zhang and Parrinello did in 2019, keeps the same functional and allows several variables without a basis set that grows exponentially with their number.

## The adaptive biasing force

A different route, based on forces rather than energies, is the **adaptive biasing force** (ABF) method of Eric Darve and Andrew Pohorille (2001). It estimates the **mean force** along the collective variable, $-\mathrm dF/\mathrm ds$, by averaging the instantaneous force acting on the CV in bins of $s$, and applies a biasing force equal and opposite to the current estimate:

{{< eq title="The adaptive biasing force" say="Measure the average force pushing the collective variable in each bin, and push back with exactly that force; the CV then diffuses freely, and the integral of the measured force is the free energy." >}}
$$ \textcolor{#f08c2e}{F_{\text{ABF}}}(s) = -\Big\langle \textcolor{#12a594}{F_\xi} \Big\rangle_{s}, \qquad \frac{\mathrm dF}{\mathrm ds} = -\Big\langle \textcolor{#12a594}{F_\xi} \Big\rangle_{s}, \qquad F(s) = -\int^{s} \big\langle F_\xi \big\rangle_{s'}\,\mathrm ds' $$
- $\textcolor{#12a594}{F_\xi}$: the instantaneous force along the collective variable (with geometric corrections for curvilinear CVs)
- once the mean force is cancelled, the CV performs an unbiased random walk and samples uniformly
{{< /eq >}}

Because the mean force is a local quantity, ABF converges well once each bin has enough samples; a ramp that applies only a fraction of the estimate until a bin has a minimum number of samples avoids acting on noise. Select ABF in the figure: the CV diffuses across the whole range almost at once, and the free energy is built from the integrated mean force. {{< note type="try" title="Pause and predict" >}}
Once ABF has cancelled the mean force exactly, what histogram of $s$ does a long run produce, and how does the time to cross a 1 nm range scale? Think before reading on. The variable feels no average force, so it diffuses freely: the histogram becomes flat, and the time to cover a distance $L$ grows as $L^2/2D$, with $D$ the diffusion coefficient of $s$. Barriers no longer matter, but distance does; a variable that diffuses slowly needs ABF windows run in parallel rather than one long run.
{{< /note >}}

### Where the mean force comes from

The free energy along $\xi$ is $F(s) = -k_BT\ln\int \delta(\xi(\mathbf x) - s)\,e^{-\beta U(\mathbf x)}\,\mathrm d\mathbf x$. Differentiating with respect to $s$ gives the mean of a local force plus a geometric term, because the surface of constant $\xi$ changes size as $s$ changes. For the distance $r$ between two atoms, the surface is a sphere of area $4\pi r^2$, and

$$
\frac{\mathrm dF}{\mathrm dr} = \Big\langle \frac{\partial U}{\partial r}\Big\rangle_r - \frac{2k_BT}{r}.
$$

The second term is the entropic pull towards large separations, the same Jacobian that turns a distance profile into something different from a binding free energy in [the umbrella sampling chapter](../es-umbrella/). At 300 K and $r$ = 1 nm it is 5.0 kJ mol⁻¹ nm⁻¹, and integrated from 0.5 to 2.0 nm it contributes $2k_BT\ln 4 = 6.9$ kJ/mol. ABF implementations include such terms automatically for the variables they provide; for a new variable, Eric Darve, David Rodríguez-Gómez and Andrew Pohorille (2008) and the Colvars documentation give the general expression.

{{< fig src="abf.svg" alt="Three panels: mean-force estimates in bins after ten thousand and six hundred thousand steps against the exact curve; the integrated free energy against the exact double well; a nearly flat histogram of the variable compared with the sharply peaked unbiased distribution" caption="A seeded ABF run on a two-dimensional surface whose free energy along $x$ is exactly an 8 $k_BT$ double well, with an orthogonal coordinate that makes the instantaneous force noisy. After $10^4$ steps the binned mean force is already close; after $6\times10^5$ the integrated profile is within 0.8 $k_BT$ of the exact one, and the histogram of $x$ is nearly flat where unbiased sampling would leave the barrier empty." >}}

{{< note type="practice" title="Back of the envelope" >}}
How many samples does a bin need? Suppose the instantaneous force along a distance fluctuates with a standard deviation of 100 kJ mol⁻¹ nm⁻¹, and the profile is built from 100 bins of 0.01 nm. If each bin holds $n$ independent samples, its mean force has error $100/\sqrt n$, and the integrated profile, a sum of 100 independent bin errors each multiplied by the bin width, has error $0.01\times\sqrt{100}\times 100/\sqrt n = 10/\sqrt n$ kJ/mol at the far end. An error of 0.5 kJ/mol needs $n = 400$ independent samples per bin. With correlated frames, multiply by the statistical inefficiency, often 10 to 100, which is why ABF runs of tens of nanoseconds per nanometre of coordinate are common.
{{< /note >}}

The original form requires CVs whose instantaneous force can be computed, which restricts it; the **extended-system ABF** (eABF) of Adrien Lesage, Tony Lelièvre, Gabriel Stoltz and Jérôme Hénin (2017) couples the CV to a fictitious particle by a stiff spring and applies ABF to that particle, which works with any differentiable CV. ABF is implemented in the Colvars module of NAMD, LAMMPS and GROMACS, and in PLUMED.

In Colvars, a one-dimensional ABF run along a distance needs a variable with a grid and a biasing block:

```text
colvar {
  name d
  width 0.01                  # bin width, nm in GROMACS units
  lowerBoundary 0.3
  upperBoundary 1.5
  distance {
    group1 { atomNumbers 1 }
    group2 { atomNumbers 10 }
  }
}
abf {
  colvars d
  fullSamples 200             # ramp: full bias only after 200 samples in a bin
}
```

Harmonic walls at the two boundaries keep the variable in range. For long coordinates the range is usually split into several overlapping ABF windows run in parallel, a stratification that shortens the diffusion time in each; for two variables, the mean-force field is no longer guaranteed to be the gradient of a single function once it is noisy, and Colvars integrates it by solving a Poisson equation rather than by a path integral.

{{< note type="practice" title="From the lab" >}}
- **Ion channels and membranes.** ABF and eABF in NAMD are widely used for profiles of ions and small molecules through channels and across bilayers, where the coordinate is the position along the membrane normal and the long range is split into windows of a few ångströms each.
- **Conformational change.** Two-dimensional ABF on backbone dihedral angles maps the Ramachandran free-energy surface of small peptides; alanine dipeptide in water is the standard test, because its free energies are known well enough to compare.
- **Rare transitions with learned variables.** OPES is often paired with machine-learned collective variables, built from short unbiased runs in each basin, and then used both to sample the transition and to refine the variable from the new data.
{{< /note >}}

## Choosing an adaptive method

All of these methods, metadynamics, well-tempered metadynamics, OPES, VES and ABF, solve the same problem along the same kind of collective variables, and in their converged limits they give the same free-energy surface. They differ in how fast they explore, how fast and how smoothly they converge, and what they need from the user. Plain metadynamics explores aggressively but does not converge cleanly; well-tempered metadynamics converges and is the best documented; OPES converges fastest to a quasi-static bias with few parameters and is increasingly the default choice in PLUMED; VES is the most flexible in the form of the bias and the target; ABF is efficient for one or two CVs whose mean force can be estimated and makes no assumption about the shape of the free energy. Every one of them shares the fundamental weakness of collective-variable methods: if the CV misses a slow degree of freedom, the result is wrong in ways that may not be obvious. Methods that avoid collective variables altogether, replica exchange and its relatives, are the subject of [the next chapter](../es-replica-exchange/).

{{< note type="warn" title="Myth" >}}
**Myth:** ABF makes the variable diffuse freely, so the choice of variable matters less than in metadynamics. **Reality:** ABF cancels the mean force along $s$ only. If the system must cross a barrier in an orthogonal coordinate, for example a side chain that blocks a channel, the instantaneous force in the bins near that barrier depends on which side the system is on, the running average mixes the two, and the estimate converges slowly or to the wrong value. Every adaptive method of this chapter inherits the quality of its variable.
{{< /note >}}

A practical rule of thumb summarises the choice. For one or two variables and a profile with no idea of the barrier, start with OPES (`OPES_METAD` with `BARRIER` set above the expected barrier) or well-tempered metadynamics. For a long, well-defined coordinate such as a distance through a membrane, where a uniform profile is wanted, ABF or eABF in windows is efficient and needs no free-energy guess. For many variables, or when the target distribution itself should be designed, VES with a neural-network bias or [learned variables](../es-ml-cvs/) are the tools to try. And when no good variable is known at all, the next chapter's tempering methods sample everything a little rather than one direction a lot.

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
- q: "An OPES run at 300 K uses BARRIER=40 kJ/mol and default settings. What bias factor does it use?"
  options: ["γ = 10", "γ ≈ 16, i.e. ΔE/k_BT", "γ = 40"]
  answer: 1
  why: "By default γ = ΔE/k_BT = 40/2.494 ≈ 16, so a barrier of ΔE becomes about k_BT in the target."
- q: "What extra term enters the mean force along an interatomic distance r?"
  options: ["None", "−2k_BT/r, from the r² growth of the surface of constant distance", "+k_BT r"]
  answer: 1
  why: "dF/dr = ⟨∂U/∂r⟩ − 2k_BT/r; the Jacobian term favours large separations."
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
11. O. Valsson and M. Parrinello, "Well-tempered variational approach to enhanced sampling", *Journal of Chemical Theory and Computation* **11**, 1996–2002 (2015).
12. L. Bonati, Y.-Y. Zhang and M. Parrinello, "Neural networks-based variationally enhanced sampling", *Proceedings of the National Academy of Sciences* **116**, 17641–17647 (2019).
13. E. Darve, D. Rodríguez-Gómez and A. Pohorille, "Adaptive biasing force method for scalar and vector free energy calculations", *Journal of Chemical Physics* **128**, 144120 (2008).

</div>
