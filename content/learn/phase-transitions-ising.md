---
title: "Phase transitions and the Ising model"
description: "How collective order appears: order parameters and the classification of transitions, the Ising model and its lattice-gas and alloy interpretations, Onsager's exact solution, Monte Carlo simulation of the model, mean-field theory solved graphically, Landau theory of continuous and first-order transitions, critical exponents, universality and finite-size effects in simulations."
hook: "Give every site of a grid one rule, agree with your neighbours, and below a sharp temperature the whole grid picks a side. The same toy model describes magnets, alloys and the critical point of a fluid."
objectives:
  - "Classify transitions as first-order or continuous using order parameters, latent heat and fluctuations"
  - "Run Metropolis simulations of the 2D Ising model and interpret finite-size rounding"
  - "Solve mean-field theory graphically and explain why it overestimates the critical temperature"
  - "Explain metastability, hysteresis and nucleation with Landau free-energy curves"
  - "Explain universality and how finite-size scaling extracts critical behaviour from simulations"
cover: "cover.svg"
milestones:
  - year: 1907
    text: "Pierre Weiss explains ferromagnetism with a molecular field, the first mean-field theory"
  - year: 1925
    text: "Ernst Ising solves the one-dimensional model and finds no phase transition"
  - year: 1944
    text: "Lars Onsager solves the two-dimensional Ising model exactly"
  - year: 1971
    text: "Kenneth Wilson formulates the renormalisation group for critical phenomena"
track: statmech
weight: 5
level: Core
prereqs: ["ensembles-and-free-energy", "fluctuations-and-response"]
lab: "Simulate the 2D Ising model and rebuild Onsager's curve, solve mean-field theory by drawing, and reshape a Landau free energy"
---

## Phases and order parameters

Water freezes at 0 °C, iron loses its magnetism above 770 °C, and the copper and zinc atoms of β-brass, arranged in an ordered alternating pattern at room temperature, mix randomly on the same lattice above about 460 °C. These are **phase transitions**: changes in the collective organisation of matter that happen abruptly as a control parameter, usually temperature or pressure, passes a definite value. They are the most dramatic consequence of the competition between energy and entropy described in [the chapter on free energy](../ensembles-and-free-energy/). Below the transition, the ordered arrangement has the lower free energy because its energy is lower; above it, the disordered arrangement wins because its entropy, multiplied by the temperature, outweighs the energy cost.

A phase transition is described by an **order parameter**, a quantity that is zero in the disordered phase and non-zero in the ordered one. For a magnet it is the magnetisation; for an alloy, the excess of one kind of atom on one sublattice; for the liquid–gas transition, the difference between the liquid and gas densities; for a nematic liquid crystal, the average alignment of the molecules. Transitions fall into two broad classes. In a **first-order** or discontinuous transition, such as melting or boiling, the order parameter jumps, the two phases coexist at the transition, a latent heat is absorbed, and the system can be superheated or supercooled. In a **continuous** or second-order transition, such as the loss of ferromagnetism at the Curie temperature, the order parameter falls smoothly to zero, there is no latent heat, but the heat capacity, the susceptibility and the size of fluctuations become very large near the **critical point**.

## The Ising model

The simplest model that shows a phase transition was proposed by Wilhelm Lenz and solved in one dimension by his student Ernst Ising in 1925. Each site $i$ of a lattice carries a **spin** $s_i$ that can point up ($+1$) or down ($-1$). Neighbouring spins prefer to align, and an external field $h$ favours one direction:

{{< eq title="The Ising model" say="Aligned neighbours lower the energy by J, anti-aligned ones raise it; the field rewards spins pointing its way." >}}
$$ E = -\textcolor{#12a594}{J}\sum_{\langle i j\rangle} \textcolor{#4c6ef5}{s_i}\textcolor{#4c6ef5}{s_j} - \textcolor{#f08c2e}{h}\sum_i \textcolor{#4c6ef5}{s_i}, \qquad \textcolor{#4c6ef5}{s_i} = \pm 1, \qquad m = \frac1N\sum_i s_i $$
- $\langle ij\rangle$: each pair of nearest neighbours counted once
- $\textcolor{#12a594}{J} > 0$: ferromagnetic coupling; $m$ is the order parameter
{{< /eq >}}

Its simplicity is deceptive, because the same mathematics describes very different physical systems. Reading "up" as "site occupied by a molecule" and "down" as "empty site" turns the Ising model into a **lattice gas**, with $J$ an attraction between neighbouring molecules and $h$ related to the chemical potential; its transition is then the condensation of a gas into a liquid. Reading "up" and "down" as two kinds of atom turns it into a **binary alloy**, whose transition is ordering or phase separation. Lattice models of this kind, with $J$ fitted to first-principles calculations through a **cluster expansion**, are used today to predict the ordering of real alloys and of ions in battery electrodes.

{{< fig src="three-systems.svg" alt="The same six by six pattern of plus and minus values drawn three ways: as up and down arrows, as occupied and empty lattice sites, and as gold and violet atoms of two species" caption="One configuration, three readings. The energy function is the same in each case; only the meaning of $J$ and $h$ changes. In the alloy, a positive $J$ favours like neighbours and leads to phase separation, while a negative $J$ favours unlike neighbours and leads to an ordered compound such as β-brass." >}}

{{< note type="practice" title="From the lab: cluster expansions for battery cathodes" >}}
In a layered cathode such as Li$_x$CoO₂, lithium ions and vacancies share one sublattice, so each site is a binary variable exactly like an Ising spin. The cluster-expansion workflow, used by Van der Ven, Ceder and co-workers for Li$_x$CoO₂ in 1998 and automated today in codes such as ATAT, CLEASE and ICET, has four steps. Compute DFT energies for several dozen to a few hundred lithium–vacancy orderings in small supercells. Fit effective pair, triplet and quadruplet interactions, the generalised $J$s, with cross-validation to choose which clusters to keep. Run Monte Carlo on large lattices in the semi-grand-canonical ensemble, where the lithium chemical potential plays the role of $h$. Read off the voltage curve, since the voltage equals minus the lithium chemical potential, measured relative to lithium metal, divided by the electron charge, together with the ordering transitions, which appear as steps and plateaus. The usual failure mode is a fit that reproduces the training energies but predicts spurious ground states, which is why every new ground state found by Monte Carlo is checked with DFT and added to the training set.
{{< /note >}}

Ising found that the one-dimensional chain has no transition at any non-zero temperature: a single break in an aligned chain costs a fixed energy $2J$ but can be placed anywhere, so its entropy always wins. He wrongly concluded that the model was useless in higher dimensions too. In 1944 Lars Onsager solved the two-dimensional square-lattice model exactly, a celebrated feat of mathematical physics, and showed that it orders spontaneously below a critical temperature

$$
k_BT_c = \frac{2J}{\ln(1 + \sqrt 2)} \approx 2.269\,J .
$$

The spontaneous magnetisation below $T_c$, published by Chen Ning Yang in 1952, is $m = [1 - \sinh^{-4}(2J/k_BT)]^{1/8}$. These exact results make the 2D Ising model the standard test of approximate theories and of simulation methods.

### Why one dimension is different: the domain-wall argument

The difference between one and two dimensions comes down to how a domain wall's energy and entropy grow with its size. In a chain of $N$ spins, a single wall breaks one bond and costs $2J$, but it can sit in any of $N - 1$ places, so it adds entropy $k_B\ln(N-1)$ and changes the free energy by $\Delta F = 2J - k_BT\ln N$. For any $T > 0$ this is negative once $N > e^{2J/k_BT}$; at $k_BT = 0.5J$ a chain of 55 spins already gains free energy by breaking. Walls proliferate, and the correlation between two spins a distance $r$ apart decays as $\tanh(J/k_BT)^r$, with a correlation length of 27 sites at $k_BT = 0.5J$ that is finite at every non-zero temperature.

In two dimensions, an island of reversed spins is bounded by a closed wall of length $L$, which costs $2JL$, and the energy now grows with the island's size. So does the entropy: a closed wall can take at most three directions at each step, so there are at most about $3^L$ walls of length $L$, and the entropy is at most $k_BL\ln3$. The free energy of a wall is therefore at least $(2J - k_BT\ln3)L$, which is positive and growing with $L$ when $k_BT < 2J/\ln3 = 1.82J$. Large islands are suppressed, and the majority orientation survives. Rudolf Peierls made this argument rigorous in 1936, eight years before Onsager's solution, and it gives a lower bound on $T_c$ that is consistent with the exact 2.269J.

{{< fig src="domain-walls.svg" alt="Top: a row of sixteen squares, nine blue then seven orange, with one pink wall between them. Bottom: a ten by eight grid of blue squares containing an orange island of twelve squares outlined by a pink wall of eighteen segments" caption="In 1D a wall is a point: fixed energy cost $2J$, entropy growing as $\ln N$, so walls always win. In 2D a wall is a line: both its energy and its entropy grow with its length $L$, and below about $2J/(k_B\ln 3)$ the energy wins." >}}

The argument generalises. Long-range order at finite temperature needs walls whose energy grows faster than their entropy, which is why it is absent in one-dimensional systems with short-range interactions. Real quasi-one-dimensional magnets, such as chain compounds in which the coupling along the chains is much stronger than between them, do order eventually, but only at a temperature set by the weak interchain coupling.

## Simulating the model

The model is easily simulated with the Metropolis Monte Carlo method ([its own chapter](../monte-carlo/) explains why it samples the canonical ensemble). Repeatedly pick a spin, compute the energy change $\Delta E$ that flipping it would cause, which depends only on its four neighbours, and accept the flip with probability $\min(1, e^{-\Delta E/k_BT})$. One attempted flip per spin is called a **sweep**.

{{< widget name="ising" title="The two-dimensional Ising model" caption="Left: the lattice, blue spins up and orange spins down, with periodic boundaries. Right, top: the magnetisation per spin over time. Right, bottom: the average |m| you record at different temperatures against Onsager's exact curve (gold); point colours mark the lattice size. The readouts give the susceptibility and heat capacity estimated from fluctuations." >}}

Start at a temperature well below $T_c$, say $k_BT = 1.5J$, with random spins. The lattice does not order all at once. Small aligned **domains** of each sign form, and their boundaries move and smooth out, so that domains coarsen over time; eventually one sign usually takes over, although stripes spanning the periodic box can survive for a long time. Above $T_c$, at $k_BT = 3J$, the spins remain a fine-grained mixture and the magnetisation fluctuates around zero. Close to $T_c$, the picture is different again: clusters of every size, from single spins to the size of the lattice, coexist and fluctuate, and the magnetisation wanders widely. This is the **critical state**, in which the system has no characteristic length scale.

To rebuild the phase diagram, set a temperature, wait until the magnetisation has settled, and press **Record**. Points well below and well above $T_c$ fall on Onsager's curve. Near $T_c$ they do not: a finite lattice cannot have a sharp transition, so the recorded $\langle|m|\rangle$ is rounded off and stays above zero slightly beyond $T_c$, and the rounding shrinks as the lattice grows. Recording the same temperatures on 32, 64 and 128 spin lattices shows this **finite-size effect** directly. Close to $T_c$ the simulation also slows down dramatically, because large clusters take many sweeps to change, a phenomenon called **critical slowing down**. Cluster algorithms such as those of Swendsen and Wang or Wolff, which flip whole correlated clusters at once, were invented to overcome it.

{{< note type="practice" title="Back of the envelope: the cost of critical slowing down" >}}
At $T_c$ the number of Metropolis sweeps needed to produce an independent configuration grows as $L^z$, with a dynamic exponent $z \approx 2.17$ for the 2D Ising model. For $L = 128$ that is $128^{2.17} \approx 4\times10^4$ sweeps per independent sample, each sweep costing 16 384 spin updates. Measuring a susceptibility to 5 % needs about 800 independent samples (see [the chapter on fluctuations](../fluctuations-and-response/)), so about $3\times10^7$ sweeps, or $5\times10^{11}$ spin updates. The Wolff algorithm builds clusters with bond probability $1 - e^{-2J/k_BT}$ and flips each whole cluster, and its dynamic exponent in 2D is only about 0.25, which turns the same calculation from days into minutes. Cluster algorithms do not work for every model; for off-lattice fluids the equivalent tools are histogram reweighting and biased sampling.
{{< /note >}}

The readouts show the susceptibility and heat capacity estimated from the fluctuations of the magnetisation and energy, using the formulas of [the chapter on fluctuations](../fluctuations-and-response/). Both peak near $T_c$, where fluctuations are largest.

## Mean-field theory

Onsager's solution is a mathematical tour de force that does not generalise to three dimensions or to other models. A simple approximate theory that works in any dimension is **mean-field theory**, introduced by Pierre Weiss in 1907 for ferromagnets. Its idea is to replace the fluctuating neighbours of each spin by their average. Each spin then feels an effective field, the external field plus $J$ times the sum of its $z$ neighbours' average values, $h_{\text{eff}} = h + zJm$. A single spin in a field $h_{\text{eff}}$ has average value $\tanh(\beta h_{\text{eff}})$, and since every spin is equivalent, this average must equal $m$ itself:

{{< eq title="The mean-field self-consistency equation" say="Each spin aligns with the average field of its neighbours, which is made of spins aligning in the same way." >}}
$$ \textcolor{#845ef7}{m} = \tanh\!\left(\frac{z\textcolor{#12a594}{J}\,\textcolor{#845ef7}{m} + \textcolor{#f08c2e}{h}}{k_BT}\right) $$
- $z$: the number of nearest neighbours (4 on the square lattice)
- with $h = 0$, a non-zero solution exists only when the slope of the right side at $m = 0$ exceeds 1, that is when $k_BT < zJ$
{{< /eq >}}

The equation cannot be solved in closed form, but it can be solved by drawing. Plot the straight line $y = m$ and the curve $y = \tanh((zJm + h)/k_BT)$; the solutions are where they cross.

{{< widget name="meanfield" title="Mean-field theory solved graphically" caption="Blue: y = m. Orange: y = tanh((zJm + h)/kT). Their intersections are the self-consistent magnetisations; filled dots are stable, open dots unstable. Lower the temperature through zJ/k_B with h = 0 and watch two new solutions split off from m = 0." >}}

At high temperature the tanh curve is shallow and crosses the line only at $m = 0$: the disordered phase. As the temperature falls, the curve steepens, and when its slope at the origin, $zJ/k_BT$, exceeds 1, it crosses the line at two more points, $\pm m_0$; the solution $m = 0$ becomes unstable and the system orders spontaneously. Mean-field theory thus predicts a transition at $k_BT_c = zJ$, which for the square lattice is $4J$, well above the exact $2.269J$. It overestimates $T_c$ because it ignores fluctuations, which disrupt order; it even predicts a transition in the one-dimensional chain, where there is none. It improves as the number of neighbours grows, and becomes exact when every spin interacts with every other.

{{< fig src="exact-vs-meanfield.svg" alt="Left: spontaneous magnetisation against temperature, the exact curve falling vertically to zero at 2.269 and the mean-field curve falling more gradually to zero at 4. Right: heat capacity per spin, the exact curve with a sharp spike at 2.269 and the mean-field curve rising to 1.5 then dropping to zero at 4" caption="Square-lattice Ising model, exact against mean field. The exact magnetisation vanishes as $(T_c - T)^{1/8}$, almost vertically; mean field gives $(T_c - T)^{1/2}$ at a temperature 76 % too high. The exact heat capacity diverges logarithmically; mean field gives only a finite jump of $\tfrac32k_B$, and no heat capacity above $T_c$ because it ignores short-range order." >}}

The two panels show where mean-field theory goes wrong. Above $T_c$ it predicts $m = 0$ and a nearest-neighbour correlation of exactly zero, so it predicts zero energy and zero heat capacity: it misses the short-range order that persists above the transition and carries much of the entropy change. Better approximations keep some correlations. The Bethe approximation (1935) treats a spin and its $z$ neighbours exactly and the rest in mean field; it gives $k_BT_c = 2J/\ln[z/(z-2)] = 2.885J$ for the square lattice, closer to 2.269J but still with mean-field exponents. Mean-field exponents are only exact in four or more dimensions, the **upper critical dimension** of the Ising model, where fluctuations are too weak to change the critical behaviour.

## Landau theory

Lev Landau generalised the mean-field idea in 1937 into a theory that applies to any transition, by writing the free energy as a function of the order parameter and expanding it in powers of $m$ near the transition, keeping only terms allowed by the symmetry of the problem. For the Ising magnet, flipping every spin leaves the energy unchanged when $h = 0$, so only even powers can appear:

{{< eq title="The Landau free energy" say="Above T_c the free energy has one valley at zero order; below it the valley splits in two." >}}
$$ F(m) = F_0 + \textcolor{#845ef7}{a}\,(T - T_c)\,m^2 + \textcolor{#12a594}{b}\,m^4 - h\,m, \qquad \textcolor{#845ef7}{a}, \textcolor{#12a594}{b} > 0 $$
- minimising with $h = 0$ gives $m = 0$ above $T_c$ and $m = \pm\sqrt{a(T_c - T)/2b}$ below
- adding a negative $m^4$ term and a positive $m^6$ term produces a first-order transition
{{< /eq >}}

The figure plots this free energy. For the continuous transition, as the temperature passes $T_c$ the single minimum at $m = 0$ flattens and splits into two symmetric minima that move apart continuously; a small field tilts the curve and selects one. The predicted magnetisation grows as $(T_c - T)^{1/2}$ below the transition. Switch to the first-order form: now, over a range of temperatures, the free energy has three minima, one at $m = 0$ and two at large $\pm m$. The equilibrium state jumps from one to the other when their depths cross, which is the discontinuous transition, while the shallower minimum remains as a **metastable** state that the system can be trapped in. That is the origin of supercooling, superheating and **hysteresis**, and escaping a metastable minimum requires crossing a free-energy barrier, which is what **nucleation** of a new phase means.

{{< widget name="landau" title="Landau free-energy curves" caption="The free energy as a function of the order parameter. Teal: the global minimum (equilibrium). Orange: metastable minima. Compare how the minimum moves through the continuous transition with how it jumps in the first-order one." >}}

## Critical phenomena and universality

Near a continuous transition, many quantities follow power laws in the distance from the critical temperature, $t = (T - T_c)/T_c$, characterised by **critical exponents**: the order parameter vanishes as $m \propto (-t)^\beta$, the susceptibility diverges as $\chi \propto |t|^{-\gamma}$, the heat capacity as $C \propto |t|^{-\alpha}$, and the **correlation length** $\xi$, the typical size of correlated regions, diverges as $\xi \propto |t|^{-\nu}$. The divergence of $\xi$ is the heart of the matter: at the critical point fluctuations are correlated over all length scales, which is what the simulation shows as clusters of every size.

| exponent | mean field / Landau | 2D Ising (exact) | 3D Ising (numerical) |
|---|---|---|---|
| order parameter $\beta$ | 1/2 | 1/8 | 0.326 |
| susceptibility $\gamma$ | 1 | 7/4 | 1.237 |
| correlation length $\nu$ | 1/2 | 1 | 0.630 |

Mean-field theory gets the exponents wrong in two and three dimensions because it neglects exactly these long-range fluctuations. The most striking discovery about critical exponents is **universality**: they do not depend on the details of a system, only on its dimension and the symmetry of its order parameter. The liquid–gas critical point of carbon dioxide, the critical point of a binary liquid mixture and the Curie point of a uniaxial magnet all have the exponents of the 3D Ising model, even though the forces involved are completely different. The explanation came from the **renormalisation group** developed by Kenneth Wilson in the early 1970s, for which he received the 1982 Nobel Prize in Physics: near a critical point, as the system is viewed on longer and longer length scales, microscopic details become irrelevant and only symmetry and dimension survive.

The liquid–gas transition gives the clearest picture of both failure and universality. The van der Waals equation of 1873 is the mean-field theory of the liquid–gas transition, in the same sense that Weiss's is for magnets: each molecule feels the average attraction of the others. Below $T_c$ its isotherms have a loop, and Maxwell's equal-area construction turns the loop into a coexistence line between liquid and gas densities. Near $T_c$ the density difference vanishes as $(T_c - T)^{1/2}$. In 1945 Edward Guggenheim plotted the measured coexistence curves of eight simple substances, from neon to methane, in units of their critical temperature and density. They fell on a single curve, which he fitted with $\rho_{l,g}/\rho_c = 1 + \tfrac34(1 - T/T_c) \pm \tfrac74(1 - T/T_c)^{1/3}$, a cube-root law.

{{< fig src="coexistence-curves.svg" alt="Coexistence curves in reduced temperature against reduced density: a narrower orange dome for van der Waals and a broader, flatter-topped blue dome for real simple fluids, both meeting at the critical point" caption="The liquid–gas coexistence curve. Van der Waals (orange, by Maxwell's construction) closes with a rounded top, $\beta = 1/2$. Real simple fluids (blue, Guggenheim's 1945 fit) have a flatter top, $\beta \approx 1/3$, close to the 3D Ising value 0.326." >}}

Guggenheim's exponent of 1/3 was the first clear experimental sign that mean-field exponents are wrong for real fluids, decades before the renormalisation group explained why. Later measurements close to the critical point give $\beta = 0.326$, the same value as for a 3D Ising magnet, which is universality in practice.

## Phase transitions in simulations

Simulations of phase transitions must contend with the finite size of the simulated system. A box of $N$ particles cannot show true singularities, so transitions are rounded and shifted, and the critical properties of the infinite system are obtained by **finite-size scaling**: repeating the simulation for several sizes and extrapolating using the known way in which quantities scale with $L/\xi$. A practical tool is the Binder cumulant of the order parameter, whose curves for different system sizes cross near $T_c$.

In detail, the **Binder cumulant** $U_L = 1 - \langle m^4\rangle/3\langle m^2\rangle^2$ tends to $2/3$ in the ordered phase and to 0 in the disordered phase, where $m$ is Gaussian. At $T_c$ it takes a universal value that does not depend on $L$, about 0.61 for the 2D Ising model on a periodic square lattice, so the curves for $L = 16, 32, 64$ cross at a single temperature with very small corrections. Once $T_c$ is fixed, the exponents follow from how the peaks scale. The susceptibility maximum grows as $L^{\gamma/\nu}$, which is $L^{7/4}$ in 2D, and the position of the peak shifts from $T_c$ by an amount proportional to $L^{-1/\nu}$. A common error is to read $T_c$ off the heat-capacity or susceptibility peak of a single lattice size. That peak is shifted from the true $T_c$ by an amount of order $T_c/L$, which on a 32 × 32 lattice is of order one per cent: larger than the statistical error of a good simulation.

First-order transitions pose the opposite problem. The two phases are separated by a free-energy barrier that grows with system size, so a simulation started in one phase can remain there far beyond the true transition temperature: a simulated crystal heated at constant rate often melts well above its melting point, because there is no surface from which melting can start. Locating first-order transitions reliably therefore requires free-energy calculations that compare the two phases directly, coexistence simulations in which both phases share a box with an interface, or biased sampling methods that drive the system over the barrier, described in [the subject on enhanced sampling](../es-umbrella/).

{{< note type="practice" title="From the lab: the melting point of a water model" >}}
The direct-coexistence method locates a first-order transition without free-energy calculations. Build a box that is half ice and half liquid water, with the interface perpendicular to the long axis, and run NPT simulations at a series of temperatures, letting the box length fluctuate along the long axis only so that the interface area matches the crystal lattice. Above the melting point the ice front retreats and the potential energy rises; below it the liquid freezes onto the crystal and the energy falls. Bracketing the temperature at which neither happens locates $T_m$ to within a few kelvin with runs of tens of nanoseconds. Applied to common water models, this and free-energy methods give melting points of about 250 K for TIP4P/2005 and 272 K for TIP4P/Ice, against 273.15 K for real water. That is a reminder that a model fitted to room-temperature liquid properties can be 20 K off at a phase boundary.
{{< /note >}}

{{< note type="key" >}}
- A phase transition is a change of collective order marked by an order parameter; first-order transitions have jumps, latent heat and hysteresis, continuous ones have diverging fluctuations at a critical point.
- The Ising model describes magnets, lattice gases and alloys; it has no transition in 1D and orders below $k_BT_c = 2.269J$ on the square lattice (Onsager).
- Metropolis simulation reproduces the transition, with domain coarsening, critical clusters, finite-size rounding and critical slowing down.
- Mean-field theory, $m = \tanh(\beta(zJm + h))$, captures the transition qualitatively but overestimates $T_c$; Landau theory expands $F(m)$ by symmetry and explains continuous and first-order transitions, metastability and hysteresis.
- Critical exponents are universal, depending only on dimension and symmetry; finite-size scaling extracts them from simulations.
{{< /note >}}

{{< quiz >}}
- q: "Why does the one-dimensional Ising chain have no phase transition at T > 0?"
  options: ["Its spins do not interact", "A domain wall costs a fixed energy but can sit anywhere, so its entropy always outweighs the cost", "It is too short"]
  answer: 1
  why: "Free energy per wall ≈ 2J − k_BT ln N becomes negative for large N at any T > 0, so walls proliferate and destroy order."
- q: "Mean-field theory predicts T_c = 4J/k_B for the square lattice; the exact value is 2.269J/k_B. Why the overestimate?"
  options: ["A numerical error", "It replaces fluctuating neighbours by their average and so ignores the fluctuations that destroy order", "It uses the wrong lattice"]
  answer: 1
  why: "Neglecting fluctuations makes order look more robust than it is."
- q: "In a Landau free energy with three minima, the system is in the minimum at m = 0 while a deeper minimum exists at m = 0.9. The m = 0 state is…"
  options: ["unstable", "metastable: it persists until a barrier is crossed", "the equilibrium state"]
  answer: 1
  why: "It is a local minimum; escaping it requires nucleation over a free-energy barrier."
- q: "The liquid–gas critical point of CO₂ and the Curie point of a uniaxial magnet share critical exponents because…"
  options: ["they have the same forces", "of universality: exponents depend only on dimension and order-parameter symmetry", "both are first order"]
  answer: 1
  why: "Both belong to the 3D Ising universality class."
- q: "A simulated crystal heated steadily melts 20 % above its experimental melting point. The most likely reason is…"
  options: ["The force field is wrong", "Superheating: without a surface the crystal stays in a metastable state because melting requires crossing a nucleation barrier", "The thermostat failed"]
  answer: 1
  why: "First-order transitions show hysteresis in simulations; use coexistence or free-energy methods to locate them."
- q: "Why can a two-dimensional Ising magnet stay ordered at low temperature when a one-dimensional chain cannot?"
  options: ["2D spins interact more strongly", "In 2D the energy of a domain wall grows with its length as fast as its entropy, so large islands are suppressed below about 2J/(kB ln 3)", "2D lattices have no domain walls"]
  answer: 1
  why: "Peierls' argument: a 1D wall costs a fixed 2J but has entropy kB ln N; a 2D wall of length L costs 2JL against entropy at most kB L ln 3."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. E. Ising, "Beitrag zur Theorie des Ferromagnetismus", *Zeitschrift für Physik* **31**, 253–258 (1925).
2. L. Onsager, "Crystal statistics. I. A two-dimensional model with an order-disorder transition", *Physical Review* **65**, 117–149 (1944).
3. C. N. Yang, "The spontaneous magnetization of a two-dimensional Ising model", *Physical Review* **85**, 808–816 (1952).
4. K. G. Wilson, "Renormalization group and critical phenomena. I", *Physical Review B* **4**, 3174–3183 (1971).
5. N. Goldenfeld, *Lectures on Phase Transitions and the Renormalization Group*, Addison-Wesley (1992).
6. J. M. Yeomans, *Statistical Mechanics of Phase Transitions*, Oxford University Press (1992).
7. D. P. Landau and K. Binder, *A Guide to Monte Carlo Simulations in Statistical Physics*, 5th ed., Cambridge University Press (2021).
8. U. Wolff, "Collective Monte Carlo updating for spin systems", *Physical Review Letters* **62**, 361–364 (1989).
9. R. Peierls, "On Ising's model of ferromagnetism", *Mathematical Proceedings of the Cambridge Philosophical Society* **32**, 477–481 (1936).
10. E. A. Guggenheim, "The principle of corresponding states", *Journal of Chemical Physics* **13**, 253–261 (1945).
11. K. Binder, "Finite size scaling analysis of Ising model block distribution functions", *Zeitschrift für Physik B* **43**, 119–140 (1981).
12. A. Van der Ven, M. K. Aydinol, G. Ceder, G. Kresse and J. Hafner, "First-principles investigation of phase stability in Li$_x$CoO$_2$", *Physical Review B* **58**, 2975–2987 (1998).

</div>
