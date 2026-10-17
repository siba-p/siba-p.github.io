---
title: "Free-energy perturbation, thermodynamic integration and non-equilibrium work"
description: "Computing free-energy differences between two states: Zwanzig's free-energy perturbation and why phase-space overlap matters, Kirkwood's thermodynamic integration, alchemical transformations and thermodynamic cycles, Bennett's acceptance ratio and MBAR as optimal estimators, and Jarzynski's equality and Crooks' theorem, which extract equilibrium free energies from irreversible pulling."
track: rl-free
weight: 1
level: Advanced
prereqs: ["es-collective-variables", "probability"]
lab: "Compare forward, reverse and BAR estimates as samples accumulate, and pull a particle out of a well to test Jarzynski's equality"
---

## The problem: a ratio of partition functions

Free energies are not averages of anything a simulation records. The free energy of a state is $-k_BT\ln Z$, and the partition function $Z$ is an integral over all of configuration space, which a simulation never samples completely. What can be computed are **free-energy differences** between two states, A and B, defined by two potential energy functions $U_A$ and $U_B$ on the same configuration space, because their ratio of partition functions can be written as an average:

$$
\Delta F = F_B - F_A = -k_BT\ln\frac{Z_B}{Z_A}.
$$

The states can be two conformations, a molecule in water and in vacuum, a ligand bound and unbound, or two different molecules altogether in an **alchemical** calculation, where atoms are gradually switched from one element to another or made to disappear. These calculations are the basis of solvation free energies, binding affinities in drug design, the relative stability of crystal polymorphs and the chemical potentials of solids and liquids.

## Free-energy perturbation

In 1954 Robert Zwanzig noticed that the ratio of partition functions is an equilibrium average over state A:

{{< eq title="Free-energy perturbation (Zwanzig)" say="Sample state A, and ask how much more or less likely each configuration would be in state B; the average of that factor gives the free-energy difference." >}}
$$ \Delta F = -k_BT \ln \Big\langle e^{-\beta\,\textcolor{#f08c2e}{\Delta U}} \Big\rangle_{\textcolor{#4c6ef5}{A}}, \qquad \textcolor{#f08c2e}{\Delta U}(\mathbf x) = U_B(\mathbf x) - U_A(\mathbf x) $$
- exact for any two states, in the limit of infinite sampling
- proof: $\frac{Z_B}{Z_A} = \frac{\int e^{-\beta U_B}}{\int e^{-\beta U_A}} = \frac{\int e^{-\beta \Delta U}e^{-\beta U_A}}{\int e^{-\beta U_A}} = \langle e^{-\beta\Delta U}\rangle_A$
{{< /eq >}}

The formula is exact but treacherous. The exponential average is dominated by configurations with low $\Delta U$, which are the configurations typical of state B. If those configurations are rare in state A, the average depends on a few samples in the tail of the distribution and converges extremely slowly, with a large bias for any finite sample. The method works well only when the two states **overlap** in configuration space: when the configurations important for B are also visited, at least occasionally, by A. The same formula applied in the reverse direction, sampling B, gives a second estimate, $\Delta F = k_BT\ln\langle e^{\beta\Delta U}\rangle_B$, and the two usually disagree when overlap is poor.

The figure below makes this concrete with two harmonic wells, for which the exact answer is known. Each frame draws samples from both states and plots the distributions of $\Delta U$ seen in A and in B. With the states close together, the two histograms overlap and all estimates converge quickly to the exact value. Move them apart and the histograms separate: the forward and reverse estimates converge slowly from opposite sides, with large systematic errors at any feasible number of samples.

{{< widget name="fep" title="Overlap decides whether perturbation works" caption="Left: the distribution of ΔU = U_B − U_A sampled in state A (blue) and in state B (teal); gold marks the exact ΔF. Right: the forward (blue), reverse (teal) and BAR (rose) estimates as the number of samples grows. Increase the shift between the states and watch the overlap vanish and the one-sided estimates struggle." >}}

The practical remedy is to break a large change into many small ones. Introduce a coupling parameter $\lambda$ that mixes the two potentials, for example $U(\lambda) = (1 - \lambda)U_A + \lambda U_B$, run simulations at a series of intermediate values $\lambda_1, \lambda_2, \ldots$, and add up the small free-energy differences between neighbours, each of which has good overlap. This **staging** is used in essentially every alchemical calculation.

## Thermodynamic integration

An alternative, older than perturbation, was given by John Kirkwood in 1935. Differentiating $F(\lambda) = -k_BT\ln Z(\lambda)$ with respect to $\lambda$ gives an equilibrium average, and integrating it gives the free-energy difference:

{{< eq title="Thermodynamic integration (Kirkwood)" say="The slope of the free energy with respect to the coupling parameter is the average slope of the energy; integrate it from one state to the other." >}}
$$ \Delta F = \int_0^1 \left\langle \frac{\partial U(\lambda)}{\partial \lambda} \right\rangle_{\lambda} \mathrm d\lambda $$
- each $\langle \partial U/\partial\lambda\rangle_\lambda$ is an ordinary average from an equilibrium simulation at fixed $\lambda$
- the integral is evaluated by quadrature (for example Gaussian quadrature) over a handful of $\lambda$ values
{{< /eq >}}

Thermodynamic integration avoids exponential averages, so it does not suffer from the same bias, but its accuracy depends on the integrand being smooth enough for quadrature. For alchemical transformations in which atoms appear or disappear, the integrand can diverge near the endpoints, because a nascent atom with a tiny interaction can overlap other atoms; **soft-core potentials**, which cap the interaction at short range when the atom is partly decoupled, remove this problem and are standard in GROMACS, AMBER and OpenMM.

Free-energy calculations are almost always organised in **thermodynamic cycles**. Free energy is a state function, so the sum of free-energy changes around a closed cycle is zero, and an unphysical but computable path can replace a physical but intractable one. The relative binding free energy of two ligands to a protein, for example, is computed by alchemically transforming ligand 1 into ligand 2 once in the binding site and once in water, rather than by simulating the slow physical binding and unbinding of each: $\Delta\Delta G_{\text{bind}} = \Delta G_{1\to2}^{\text{site}} - \Delta G_{1\to2}^{\text{water}}$. Calculations of this kind, run routinely in pharmaceutical research, typically reach errors of about 1 kcal/mol (4 kJ/mol) relative to experiment.

## Optimal estimators: BAR and MBAR

Using samples from both states together gives a much better estimator than either one-sided average. Charles Bennett derived in 1976 the estimator that minimises the variance for given samples from A and B, the **Bennett acceptance ratio** (BAR). With $n_A$ forward values $w_F = \Delta U$ sampled in A and $n_B$ reverse values $w_R = -\Delta U$ sampled in B, the free-energy difference solves

{{< eq title="Bennett's acceptance ratio" say="Choose ΔF so that the forward and reverse samples, each passed through a Fermi function, balance exactly." >}}
$$ \sum_{i=1}^{n_A} \frac{1}{1 + e^{\beta(M + w_F^{(i)} - \Delta F)}} = \sum_{j=1}^{n_B} \frac{1}{1 + e^{\beta(-M + w_R^{(j)} + \Delta F)}}, \qquad M = k_BT\ln\frac{n_A}{n_B} $$
- solved numerically for $\Delta F$; uses both directions and weights most heavily the samples in the overlap region
{{< /eq >}}

In the figure, the BAR estimate (rose) converges fastest and most reliably, even when the one-sided estimates disagree. BAR is still limited by overlap, but it extracts the most information from whatever overlap there is. The **multistate Bennett acceptance ratio** (MBAR) of Michael Shirts and John Chodera (2008) generalises BAR to any number of states sampled at once, such as all the $\lambda$ windows of an alchemical calculation or the windows of umbrella sampling, and it reduces to the WHAM equations of [the next topic](../es-umbrella/) when the data are histogrammed. MBAR, available in the pymbar library and its successors, is the standard analysis tool for multi-state free-energy calculations.

## Non-equilibrium work: Jarzynski and Crooks

All the methods above require equilibrium sampling at each state. In 1997 Christopher Jarzynski proved a remarkable result: free-energy differences can be extracted from **irreversible**, non-equilibrium processes. Start the system in equilibrium in state A, then change the parameter $\lambda$ from A to B at a finite rate, for example by pulling a molecule with a moving harmonic trap, and record the work $W = \int (\partial H/\partial\lambda)\,\mathrm d\lambda$ done on the system. Repeat many times. The second law says that the average work is at least the free-energy difference, $\langle W\rangle \ge \Delta F$, with equality only for infinitely slow (reversible) changes. Jarzynski showed that an exponential average of the work gives $\Delta F$ exactly, at any speed:

{{< eq title="Jarzynski's equality" say="Pull as fast as you like: the exponential average of the work done still gives the equilibrium free-energy difference." >}}
$$ \Big\langle e^{-\beta \textcolor{#f08c2e}{W}} \Big\rangle = e^{-\beta\,\Delta F}, \qquad \langle \textcolor{#f08c2e}{W} \rangle \ge \Delta F $$
- the average is over repeated realisations of the same protocol, each starting from equilibrium in A
- the inequality, which follows from the equality by Jensen's inequality, is the second law; $\langle W\rangle - \Delta F$ is the dissipated work
{{< /eq >}}

Gavin Crooks extended the result in 1999 to a fluctuation theorem relating the work distributions of the forward process and of its time reverse: $P_F(W)/P_R(-W) = e^{\beta(W - \Delta F)}$, so the two distributions cross exactly at $W = \Delta F$. Both results were confirmed experimentally by stretching single RNA molecules with optical tweezers (Liphardt and colleagues, 2002; Collin and colleagues, 2005).

The figure pulls a particle through a double-welled landscape with a moving harmonic trap, many times over, and histograms the work. At low speed the work distribution is narrow and centred near $\Delta F$. At high speed it shifts to larger values and broadens: much of the work is dissipated as heat. The Jarzynski estimate remains close to the exact $\Delta F$, but only because a few rare trajectories with unusually low work dominate the exponential average; at very high speeds those trajectories become so rare that a feasible number of pulls cannot find them, and the estimate is biased upwards. This is the same overlap problem as in free-energy perturbation, which is indeed the instantaneous-switching limit of Jarzynski's equality.

{{< widget name="jarzynski" title="Free energy from irreversible pulling" caption="Left: a particle (rose) dragged across a double-well landscape (blue) by a moving harmonic trap (violet). Right: the distribution of work over repeated pulls, with the exact ΔF (gold) and the mean work (rose). Compare the mean work and the Jarzynski estimate at slow and fast pulling." >}}

In molecular simulation, Jarzynski's equality underlies **steered molecular dynamics** calculations of unbinding and unfolding free energies, and non-equilibrium switching is used in alchemical calculations as an alternative to equilibrium staging. Its practical limit is always the same: the rarer the low-work trajectories, the more realisations are needed.

{{< note type="key" >}}
- Free-energy differences are ratios of partition functions: $\Delta F = -k_BT\ln(Z_B/Z_A)$.
- Zwanzig's FEP: $\Delta F = -k_BT\ln\langle e^{-\beta\Delta U}\rangle_A$, exact but requiring phase-space overlap; staging over intermediate $\lambda$ restores it.
- Kirkwood's TI: $\Delta F = \int_0^1 \langle\partial U/\partial\lambda\rangle_\lambda\,\mathrm d\lambda$; soft-core potentials keep alchemical integrands finite; thermodynamic cycles replace physical paths with computable ones.
- BAR (two states) and MBAR (many states) are minimum-variance estimators using samples from all states.
- Jarzynski: $\langle e^{-\beta W}\rangle = e^{-\beta\Delta F}$ for any protocol; Crooks relates forward and reverse work distributions; both are limited by rare low-work trajectories.
{{< /note >}}

{{< quiz >}}
- q: "Why does free-energy perturbation fail when two states do not overlap?"
  options: ["The formula is wrong", "The exponential average is dominated by configurations important for B that are almost never sampled in A", "Free energies cannot be negative"]
  answer: 1
  why: "Without overlap the average depends on unsampled tails; staging restores overlap."
- q: "In thermodynamic integration, what is averaged at each λ?"
  options: ["The total energy", "∂U/∂λ, the derivative of the potential with respect to the coupling parameter", "The temperature"]
  answer: 1
  why: "dF/dλ = ⟨∂U/∂λ⟩_λ; integrate over λ."
- q: "Pulling faster, the mean work ⟨W⟩…"
  options: ["decreases below ΔF", "increases above ΔF as more work is dissipated", "equals ΔF exactly"]
  answer: 1
  why: "⟨W⟩ ≥ ΔF (second law), with dissipation growing with speed."
- q: "Why can the relative binding free energy of two ligands be computed without simulating binding?"
  options: ["Binding is fast", "Free energy is a state function, so an alchemical transformation in the site and in water closes a thermodynamic cycle", "Proteins are rigid"]
  answer: 1
  why: "ΔΔG_bind = ΔG(site, 1→2) − ΔG(water, 1→2)."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. R. W. Zwanzig, "High-temperature equation of state by a perturbation method. I. Nonpolar gases", *Journal of Chemical Physics* **22**, 1420–1426 (1954).
2. J. G. Kirkwood, "Statistical mechanics of fluid mixtures", *Journal of Chemical Physics* **3**, 300–313 (1935).
3. C. H. Bennett, "Efficient estimation of free energy differences from Monte Carlo data", *Journal of Computational Physics* **22**, 245–268 (1976).
4. M. R. Shirts and J. D. Chodera, "Statistically optimal analysis of samples from multiple equilibrium states", *Journal of Chemical Physics* **129**, 124105 (2008).
5. C. Jarzynski, "Nonequilibrium equality for free energy differences", *Physical Review Letters* **78**, 2690–2693 (1997).
6. G. E. Crooks, "Entropy production fluctuation theorem and the nonequilibrium work relation for free energy differences", *Physical Review E* **60**, 2721–2726 (1999).
7. J. Liphardt, S. Dumont, S. B. Smith, I. Tinoco Jr. and C. Bustamante, "Equilibrium information from nonequilibrium measurements in an experimental test of Jarzynski's equality", *Science* **296**, 1832–1835 (2002).
8. D. Collin, F. Ritort, C. Jarzynski, S. B. Smith, I. Tinoco Jr. and C. Bustamante, "Verification of the Crooks fluctuation theorem and recovery of RNA folding free energies", *Nature* **437**, 231–234 (2005).
9. C. Chipot and A. Pohorille (eds.), *Free Energy Calculations: Theory and Applications in Chemistry and Biology*, Springer (2007).
10. A. S. J. S. Mey et al., "Best practices for alchemical free energy calculations", *Living Journal of Computational Molecular Science* **2**, 18378 (2020).
11. L. Wang et al., "Accurate and reliable prediction of relative ligand binding potency in prospective drug discovery by way of a modern free-energy calculation protocol and force field", *Journal of the American Chemical Society* **137**, 2695–2703 (2015).

</div>
