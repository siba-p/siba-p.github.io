---
title: "Free-energy perturbation and thermodynamic integration"
description: "Computing free-energy differences between two states: Zwanzig's free-energy perturbation and why phase-space overlap matters, Kirkwood's thermodynamic integration, alchemical transformations and thermodynamic cycles, Bennett's acceptance ratio and MBAR as optimal estimators, and Jarzynski's equality and Crooks' theorem, which extract equilibrium free energies from irreversible pulling."
hook: "Free energy is not an average of anything a simulation records, yet it can be computed exactly, even from molecules pulled apart far from equilibrium. In every method the deciding factor is the overlap between two states."
objectives:
  - "Derive Zwanzig's free-energy perturbation formula and explain why it needs phase-space overlap"
  - "Compute a free-energy difference by thermodynamic integration over a coupling parameter λ"
  - "Design a thermodynamic cycle for the relative binding free energy of two ligands"
  - "Explain why BAR and MBAR outperform one-sided exponential averages"
  - "Interpret Jarzynski's equality and Crooks' theorem for irreversible pulling"
cover: "cover.svg"
milestones:
  - year: 1935
    text: "John Kirkwood introduces thermodynamic integration over a coupling parameter"
  - year: 1954
    text: "Robert Zwanzig derives the free-energy perturbation formula"
  - year: 1976
    text: "Charles Bennett derives the acceptance-ratio estimator"
  - year: 1997
    text: "Christopher Jarzynski proves his non-equilibrium work equality"
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

Why can the free energy itself not be averaged? Formally one can write $1/Z = \langle e^{\beta U}\rangle / V^N$, an equilibrium average over the configurational ensemble, but the weight $e^{\beta U}$ is largest for high-energy configurations that the simulation almost never visits, so the estimate never converges. Free energy measures the volume of configuration space accessible at a given temperature, the entropy, and a trajectory that explores one basin carries almost no information about the volume of the space it does not visit. A ratio of two such volumes, however, can be estimated from the regions where the two states overlap, which is what every method in this chapter exploits.

The quantities involved are small compared with the total energies of the system. The hydration free energy of methane is about +2.0 kcal/mol (8.4 kJ/mol) and that of a water molecule about −6.3 kcal/mol, in a simulation box whose potential energy is of order $-10^4$ kcal/mol and fluctuates by tens of kcal/mol. Computing the difference directly from total energies is hopeless; computing it as an average of the energy *difference* $\Delta U$, which involves only the interactions of the solute, is feasible.

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

### How much overlap is enough

If $\Delta U$ sampled in A is Gaussian with mean $\mu$ and standard deviation $\sigma$, the exponential average can be done exactly:

$$
\Delta F = \mu - \frac{\beta\sigma^2}{2}.
$$

The integrand $e^{-\beta\Delta U}P_A(\Delta U)$ is itself a Gaussian, centred at $\mu - \beta\sigma^2$, which lies $\beta\sigma$ standard deviations below the mean of the sampled distribution. The samples that determine the answer are therefore the ones in the lower tail, at a distance set by the width of the distribution measured in $k_BT$. For $\sigma = 1\,k_BT$ they are one standard deviation out, and 16% of samples contribute usefully. For $\sigma = 2\,k_BT$ the fraction is 2.3%, for $3\,k_BT$ 0.13%, and for $4\,k_BT$ 0.003%, so tens of thousands of uncorrelated samples are needed just to see the important region once. This gives the standard rule of thumb, discussed by Andrew Pohorille, Christopher Jarzynski and Christophe Chipot (2010): choose the $\lambda$ spacing so that the standard deviation of $\Delta U$ between neighbouring windows is no more than 1 to 2 $k_BT$.

{{< note type="practice" title="From the lab" >}}
Benjamin Widom's test-particle insertion (1963) is free-energy perturbation in its simplest form. To compute the excess chemical potential of a fluid, insert a ghost particle at a random position, compute its interaction energy $\Delta U$ with the real particles, and average: $\mu_{\text{ex}} = -k_BT\ln\langle e^{-\beta\Delta U}\rangle$. For a Lennard-Jones gas or a moderately dense liquid it works well and costs almost nothing. For a dense liquid of strongly interacting molecules, such as water inserted into water, it converges poorly, because random insertions almost always overlap an existing molecule and the rare cavities large enough to accept the ghost dominate the average: an overlap problem in its plainest form. Staged insertion through soft-core intermediates is the standard remedy.
{{< /note >}}

## Thermodynamic integration

An alternative, older than perturbation, was given by John Kirkwood in 1935. Differentiating $F(\lambda) = -k_BT\ln Z(\lambda)$ with respect to $\lambda$ gives an equilibrium average, and integrating it gives the free-energy difference:

{{< eq title="Thermodynamic integration (Kirkwood)" say="The slope of the free energy with respect to the coupling parameter is the average slope of the energy; integrate it from one state to the other." >}}
$$ \Delta F = \int_0^1 \left\langle \frac{\partial U(\lambda)}{\partial \lambda} \right\rangle_{\lambda} \mathrm d\lambda $$
- each $\langle \partial U/\partial\lambda\rangle_\lambda$ is an ordinary average from an equilibrium simulation at fixed $\lambda$
- the integral is evaluated by quadrature (for example Gaussian quadrature) over a handful of $\lambda$ values
{{< /eq >}}

Thermodynamic integration avoids exponential averages, so it does not suffer from the same bias, but its accuracy depends on the integrand being smooth enough for quadrature. For alchemical transformations in which atoms appear or disappear, the integrand can diverge near the endpoints, because a nascent atom with a tiny interaction can overlap other atoms; **soft-core potentials**, which cap the interaction at short range when the atom is partly decoupled, remove this problem and are standard in GROMACS, AMBER and OpenMM.

{{< fig src="softcore.svg" alt="Thermodynamic-integration integrand against the coupling parameter from 0 to 1 for growing a repulsive particle in an ideal-gas solvent: with linear coupling it diverges near zero, with a soft-core potential it is a smooth hump of about 4.7 kT at small lambda falling to about 1 kT; points mark five Gauss–Legendre nodes" caption="The endpoint problem, computed exactly for a particle with repulsion $\varepsilon(\sigma/r)^{12}$ grown in an ideal-gas solvent at $\rho\sigma^3 = 0.5$ and $\varepsilon = k_BT$. Both curves enclose the same area, $\Delta F = 2.57\,k_BT$, but five-point Gauss–Legendre quadrature recovers it only for the soft-core path; with linear coupling it gives 1.79 $k_BT$." >}}

The model in the figure is simple enough to solve without simulation. The solvent particles do not interact with each other, so the free energy of inserting the solute is $\Delta F = k_BT\rho\int (1 - e^{-\beta u(r)})\,4\pi r^2\,\mathrm dr$, which for an $r^{-12}$ repulsion with $\varepsilon = k_BT$ equals $\tfrac{4\pi}{3}\Gamma(\tfrac34)\rho\sigma^3\,k_BT = 2.57\,k_BT$. With linear coupling $\lambda u(r)$, the integrand grows as $\lambda^{-3/4}$ as $\lambda \to 0$: a barely-switched-on particle is so weak that solvent particles sit almost on top of it, where $u$ is enormous. The singularity is integrable, so the area is finite, but no quadrature with a few points can capture it. The soft-core form used here, $u = \lambda\varepsilon\sigma^{12}/[\alpha\sigma^6(1-\lambda) + r^6]^2$ with $\alpha = 0.5$, caps the interaction at short range while $\lambda < 1$ and recovers the full potential at $\lambda = 1$; it keeps the repulsive term of the soft-core form introduced by Thomas Beutler and colleagues (1994).

In practice an alchemical decoupling of a charged or polar molecule is done in two stages: first the partial charges are switched off with the Lennard-Jones interactions still present, then the Lennard-Jones interactions are removed with a soft core. Switching both together lets opposite charges approach a weakly repulsive site and collapse onto each other, another endpoint catastrophe. Typical protocols use 5 to 10 windows for the electrostatic stage and 10 to 20 for the van der Waals stage, with the windows clustered where the integrand is steep.

The integrand's shape also matters away from the endpoints. The cell below applies TI to a harmonic trap whose stiffness increases fiftyfold, $U(\lambda) = \tfrac12 k(\lambda)x^2$ with $k$ from 1 to 50, for which $\Delta F = \tfrac12 k_BT\ln 50 = 1.956\,k_BT$ exactly. The integrand $\langle\partial U/\partial\lambda\rangle = (k_B - k_A)\,k_BT/2k(\lambda)$ falls from 24.5 to 0.49, steeply near $\lambda = 0$.

{{< py title="Thermodynamic integration with a strongly curved integrand" >}}
import numpy as np
rng = np.random.default_rng(0)
kA, kB, n = 1.0, 50.0, 2000             # trap stiffness in states A and B (kT = 1), samples per window
k = lambda lam: (1 - lam) * kA + lam * kB
exact = 0.5 * np.log(kB / kA)

def dUdlam(lam):                        # sample x at this lambda, average dU/dlambda = (kB - kA) x^2 / 2
    x = rng.normal(0, 1 / np.sqrt(k(lam)), n)
    return np.mean(0.5 * (kB - kA) * x**2)

for m in (2, 3, 5):                      # Gauss-Legendre nodes mapped from [-1, 1] to [0, 1]
    z, w = np.polynomial.legendre.leggauss(m)
    lam, w = (z + 1) / 2, w / 2
    print(f"TI, {m} windows : {sum(wi * dUdlam(li) for li, wi in zip(lam, w)):.3f}")
lam = np.linspace(0, 1, 5)
vals = [dUdlam(l) for l in lam]
print(f"TI, trapezoid 5: {np.sum((np.array(vals[1:]) + vals[:-1]) / 2 * np.diff(lam)):.3f}")
xB = rng.normal(0, 1 / np.sqrt(kB), n)  # one-step FEP sampling B, same budget
print(f"FEP from B     : {np.log(np.mean(np.exp(0.5 * (kB - kA) * xB**2))):.3f}")
print(f"exact          : {exact:.3f}")
{{< /py >}}

With 2,000 samples per window, Gauss–Legendre quadrature gives about 1.39, 1.62 and 1.83 $k_BT$ with 2, 3 and 5 windows, converging slowly from below; the trapezoidal rule with 5 equally spaced windows gives 3.97, double the right answer, because it samples the steep end too coarsely. One-step FEP from the stiff state B, with the same total budget, gives 0.97, an error of a whole $k_BT$. Changing the integration variable to $\ln k$ makes the integrand flat, and a handful of windows then suffice: in a production calculation the analogous step is choosing the $\lambda$ schedule after a short pilot run has shown where the integrand varies.

{{< note type="warn" title="Myth" >}}
**Myth:** thermodynamic integration avoids the overlap problem. **Reality:** TI replaces one large exponential average with many ordinary averages, but each window must still sample its own ensemble, and the windows must be dense where the integrand changes quickly. Poor overlap between neighbouring windows in FEP and a jagged or undersampled integrand in TI are two faces of the same problem, and both are fixed by more windows in the right places.
{{< /note >}}

Free-energy calculations are almost always organised in **thermodynamic cycles**. Free energy is a state function, so the sum of free-energy changes around a closed cycle is zero, and an unphysical but computable path can replace a physical but intractable one. The relative binding free energy of two ligands to a protein, for example, is computed by alchemically transforming ligand 1 into ligand 2 once in the binding site and once in water, rather than by simulating the slow physical binding and unbinding of each: $\Delta\Delta G_{\text{bind}} = \Delta G_{1\to2}^{\text{site}} - \Delta G_{1\to2}^{\text{water}}$. Calculations of this kind, run routinely in pharmaceutical research, typically reach errors of about 1 kcal/mol (4 kJ/mol) relative to experiment.

{{< fig src="cycle.svg" alt="Thermodynamic cycle with four boxes: ligand 1 and ligand 2 in water at the top, the same ligands in a protein binding site at the bottom; dashed grey vertical arrows mark physical binding, solid teal horizontal arrows mark the alchemical transformation of ligand 1 into ligand 2 in water and in the site" caption="The relative binding free energy closes a cycle. The vertical legs, physical binding and unbinding, may take milliseconds to hours; the horizontal legs, in which a hydrogen is mutated into a chlorine, need only local equilibration and are computed with FEP or TI." >}}

The 1 kcal/mol figure should be read against the scale of the problem. At 298 K, $RT\ln 10 = 1.36$ kcal/mol, so an error of 1 kcal/mol is a factor of about 5 in the binding constant. Medicinal chemistry projects typically try to improve potency by orders of magnitude over a series of compounds, so a method that ranks compounds within a factor of 5 is useful for deciding which molecules to synthesise, even though it cannot replace measurement. The FEP+ benchmark of Lingle Wang and colleagues (2015) reported errors near this level for about 200 ligands on eight protein targets; the main sources of larger errors are force-field deficiencies, changes in protonation state or binding mode between ligands, and slow protein rearrangements that the windows do not sample.

The **absolute** binding free energy needs a different cycle: decouple the ligand from the solvent, decouple it from the site, and compute the difference, the double-decoupling method analysed by Michael Gilson, James Given, Bruce Bush and Andrew McCammon (1997). A fully decoupled ligand would wander out of the site, so restraints hold it in place during the decoupling; the free energy of releasing those restraints into the standard volume of 1661 Å³ (1 M) is computed analytically, for example with the orientational restraints of Stefan Boresch and colleagues (2003). Forgetting this standard-state term is a classic error worth several kcal/mol.

In materials science the same machinery computes phase diagrams. Daan Frenkel and Anthony Ladd (1984) obtained the absolute free energy of a solid by thermodynamic integration from an Einstein crystal, in which every atom is tied to its lattice site by a harmonic spring and the free energy is known analytically, to the real crystal. Combined with the free energy of the liquid, obtained by integration from the ideal gas or from a reference fluid, this gives the melting temperature as the point where the two Gibbs free energies cross. The same route compares polymorphs: careful free-energy calculations in the late 1990s showed that hard-sphere fcc is more stable than hcp by only about $10^{-3}\,k_BT$ per particle, a difference far too small to settle by direct simulation of the competing structures.

## Optimal estimators: BAR and MBAR

Using samples from both states together gives a much better estimator than either one-sided average. Charles Bennett derived in 1976 the estimator that minimises the variance for given samples from A and B, the **Bennett acceptance ratio** (BAR). With $n_A$ forward values $w_F = \Delta U$ sampled in A and $n_B$ reverse values $w_R = -\Delta U$ sampled in B, the free-energy difference solves

{{< eq title="Bennett's acceptance ratio" say="Choose ΔF so that the forward and reverse samples, each passed through a Fermi function, balance exactly." >}}
$$ \sum_{i=1}^{n_A} \frac{1}{1 + e^{\beta(M + w_F^{(i)} - \Delta F)}} = \sum_{j=1}^{n_B} \frac{1}{1 + e^{\beta(-M + w_R^{(j)} + \Delta F)}}, \qquad M = k_BT\ln\frac{n_A}{n_B} $$
- solved numerically for $\Delta F$; uses both directions and weights most heavily the samples in the overlap region
{{< /eq >}}

In the figure, the BAR estimate (rose) converges fastest and most reliably, even when the one-sided estimates disagree. BAR is still limited by overlap, but it extracts the most information from whatever overlap there is. The **multistate Bennett acceptance ratio** (MBAR) of Michael Shirts and John Chodera (2008) generalises BAR to any number of states sampled at once, such as all the $\lambda$ windows of an alchemical calculation or the windows of umbrella sampling, and it reduces to the WHAM equations of [the next chapter](../es-umbrella/) when the data are histogrammed. MBAR, available in the pymbar library and its successors, is the standard analysis tool for multi-state free-energy calculations.

For $K$ states with reduced potentials $u_k = \beta U_k$ and $N_k$ samples from each, the MBAR estimates of the reduced free energies $f_i = \beta F_i$ solve the self-consistent equations

$$
f_i = -\ln \sum_{j=1}^{K}\sum_{n=1}^{N_j} \frac{e^{-u_i(\mathbf x_{jn})}}{\sum_{k=1}^{K} N_k\, e^{f_k - u_k(\mathbf x_{jn})}},
$$

in which every sample, from whichever state it was drawn, contributes to every free energy with a weight that reflects how likely it would be in that state relative to the mixture of all sampled states. Beyond the free energies, MBAR gives an asymptotic error estimate and an **overlap matrix**, whose element $(i, j)$ is the probability that a sample from state $i$ would be attributed to state $j$. Neighbouring states with near-zero overlap, a block-diagonal overlap matrix, mean that the chain of windows is broken somewhere, and no estimator can repair it; more windows must be added there.

## Non-equilibrium work: Jarzynski and Crooks

All the methods above require equilibrium sampling at each state. In 1997 Christopher Jarzynski proved that free-energy differences can be extracted from **irreversible**, non-equilibrium processes. Start the system in equilibrium in state A, then change the parameter $\lambda$ from A to B at a finite rate, for example by pulling a molecule with a moving harmonic trap, and record the work $W = \int (\partial H/\partial\lambda)\,\mathrm d\lambda$ done on the system. Repeat many times. The second law says that the average work is at least the free-energy difference, $\langle W\rangle \ge \Delta F$, with equality only for infinitely slow (reversible) changes. Jarzynski showed that an exponential average of the work gives $\Delta F$ exactly, at any speed:

{{< eq title="Jarzynski's equality" say="Pull as fast as you like: the exponential average of the work done still gives the equilibrium free-energy difference." >}}
$$ \Big\langle e^{-\beta \textcolor{#f08c2e}{W}} \Big\rangle = e^{-\beta\,\Delta F}, \qquad \langle \textcolor{#f08c2e}{W} \rangle \ge \Delta F $$
- the average is over repeated realisations of the same protocol, each starting from equilibrium in A
- the inequality, which follows from the equality by Jensen's inequality, is the second law; $\langle W\rangle - \Delta F$ is the dissipated work
{{< /eq >}}

Gavin Crooks extended the result in 1999 to a fluctuation theorem relating the work distributions of the forward process and of its time reverse: $P_F(W)/P_R(-W) = e^{\beta(W - \Delta F)}$, so the two distributions cross exactly at $W = \Delta F$. Both results were confirmed experimentally by stretching single RNA molecules with optical tweezers (Liphardt and colleagues, 2002; Collin and colleagues, 2005).

The figure pulls a particle through a double-welled landscape with a moving harmonic trap, many times over, and histograms the work. At low speed the work distribution is narrow and centred near $\Delta F$. At high speed it shifts to larger values and broadens: much of the work is dissipated as heat. The Jarzynski estimate remains close to the exact $\Delta F$, but only because a few rare trajectories with unusually low work dominate the exponential average; at very high speeds those trajectories become so rare that a feasible number of pulls cannot find them, and the estimate is biased upwards. This is the same overlap problem as in free-energy perturbation, which is indeed the instantaneous-switching limit of Jarzynski's equality.

{{< fig src="crooks.svg" alt="Left: histograms of the forward work and of minus the reverse work for an overdamped particle whose trap stiffness is switched between 1 and 8 in 0.25 time units, crossing at the dashed free-energy difference of 1.04 kT. Right: the log ratio of the two distributions against work, falling on a line of slope one through zero at the free-energy difference" caption="Crooks' theorem checked with 40,000 forward and 40,000 reverse switches. The distributions of $W_F$ and $-W_R$ cross at $\Delta F = \tfrac12 k_BT\ln 8 = 1.04\,k_BT$, and $\ln[P_F(W)/P_R(-W)]$ follows $W - \Delta F$, as the theorem requires." >}}

The process in the figure is chosen because its answer is known: an overdamped particle in a harmonic trap whose stiffness is raised from 1 to 8, or lowered back, over 0.25 time units. The mean forward work is 2.32 $k_BT$, so 1.28 $k_BT$ is dissipated; the mean of $-W_R$ is 0.61 $k_BT$, below $\Delta F$ by 0.43 $k_BT$, as the second law requires for the reverse process. The Jarzynski estimates from the two directions are 1.04 and 0.99 $k_BT$, both close to the exact 1.04. The crossing point of the two histograms reads $\Delta F$ without any exponential averaging, which is how Collin and colleagues extracted RNA folding free energies from optical-tweezer pulls in 2005; Bennett's acceptance ratio applied to forward and reverse work values is the statistically optimal way to locate that crossing.

{{< note type="warn" title="Myth" >}}
**Myth:** Jarzynski's equality violates the second law, because some trajectories have $W < \Delta F$. **Reality:** the second law constrains averages, not single trajectories of a small system. In the figure 46% of forward switches do less work than $\Delta F$, yet the mean exceeds it. Jarzynski's equality also limits how far below $\Delta F$ the work can go: the probability of $W < \Delta F - \zeta$ is at most $e^{-\beta\zeta}$, so a violation by $5\,k_BT$ occurs at most once in 150 trials, and violations by macroscopic amounts of energy never occur in practice.
{{< /note >}}

When the work distribution is close to Gaussian, the exponential average can be replaced by its second-order cumulant expansion, $\Delta F \approx \langle W\rangle - \beta\sigma_W^2/2$, the same formula as for Gaussian $\Delta U$ in free-energy perturbation. It converges much faster than the exponential average, but it is biased whenever the distribution has a long tail, as the forward work distribution in the figure does, so it is used for slow pulling with modest dissipation and checked against the exponential estimate.

{{< widget name="jarzynski" title="Free energy from irreversible pulling" caption="Left: a particle (rose) dragged across a double-well landscape (blue) by a moving harmonic trap (violet). Right: the distribution of work over repeated pulls, with the exact ΔF (gold) and the mean work (rose). Compare the mean work and the Jarzynski estimate at slow and fast pulling." >}}

In molecular simulation, Jarzynski's equality underlies **steered molecular dynamics** calculations of unbinding and unfolding free energies, and non-equilibrium switching is used in alchemical calculations as an alternative to equilibrium staging. Its practical limit is always the same: the rarer the low-work trajectories, the more realisations are needed.

{{< note type="key" >}}
- Free-energy differences are ratios of partition functions: $\Delta F = -k_BT\ln(Z_B/Z_A)$.
- Zwanzig's FEP: $\Delta F = -k_BT\ln\langle e^{-\beta\Delta U}\rangle_A$, exact but requiring phase-space overlap; staging over intermediate $\lambda$ restores it.
- Kirkwood's TI: $\Delta F = \int_0^1 \langle\partial U/\partial\lambda\rangle_\lambda\,\mathrm d\lambda$; soft-core potentials keep alchemical integrands finite; thermodynamic cycles replace physical paths with computable ones.
- BAR (two states) and MBAR (many states) are minimum-variance estimators using samples from all states.
- Jarzynski: $\langle e^{-\beta W}\rangle = e^{-\beta\Delta F}$ for any protocol; Crooks relates forward and reverse work distributions; both are limited by rare low-work trajectories.
- For Gaussian $\Delta U$, $\Delta F = \mu - \beta\sigma^2/2$ and the important samples lie $\beta\sigma$ standard deviations into the tail: keep $\sigma$ below 1 to 2 $k_BT$ per window.
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
- q: "Between two neighbouring λ windows, ΔU is roughly Gaussian with standard deviation 4 kT. What should you do?"
  options: ["Run the window longer", "Add intermediate windows until the spread is about 1–2 kT", "Switch from FEP to Jarzynski"]
  answer: 1
  why: "With σ = 4 kT the samples that dominate the average lie 4 standard deviations into the tail (about 3 in 100,000 samples)."
- q: "Why is the alchemical decoupling of a charged ligand usually done with charges removed first?"
  options: ["It is cheaper", "With weak Lennard-Jones repulsion but full charges, opposite charges can collapse onto each other", "Charges do not affect the free energy"]
  answer: 1
  why: "Keeping the repulsive core while the charges vanish prevents an electrostatic endpoint catastrophe."
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
12. A. Pohorille, C. Jarzynski and C. Chipot, "Good practices in free-energy calculations", *Journal of Physical Chemistry B* **114**, 10235–10253 (2010).
13. B. Widom, "Some topics in the theory of fluids", *Journal of Chemical Physics* **39**, 2808–2812 (1963).
14. D. Frenkel and A. J. C. Ladd, "New Monte Carlo method to compute the free energy of arbitrary solids. Application to the fcc and hcp phases of hard spheres", *Journal of Chemical Physics* **81**, 3188–3193 (1984).
15. M. K. Gilson, J. A. Given, B. L. Bush and J. A. McCammon, "The statistical-thermodynamic basis for computation of binding affinities: a critical review", *Biophysical Journal* **72**, 1047–1069 (1997).

</div>
