---
title: "Phase transitions and the Ising model"
description: "How collective order appears: order parameters and the classification of transitions, the Ising model and its lattice-gas and alloy interpretations, Onsager's exact solution, Monte Carlo simulation of the model, mean-field theory solved graphically, Landau theory of continuous and first-order transitions, critical exponents, universality and finite-size effects in simulations."
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

Ising found that the one-dimensional chain has no transition at any non-zero temperature: a single break in an aligned chain costs a fixed energy $2J$ but can be placed anywhere, so its entropy always wins. He wrongly concluded that the model was useless in higher dimensions too. In 1944 Lars Onsager solved the two-dimensional square-lattice model exactly, a celebrated feat of mathematical physics, and showed that it orders spontaneously below a critical temperature

$$
k_BT_c = \frac{2J}{\ln(1 + \sqrt 2)} \approx 2.269\,J .
$$

The spontaneous magnetisation below $T_c$, published by Chen Ning Yang in 1952, is $m = [1 - \sinh^{-4}(2J/k_BT)]^{1/8}$. These exact results make the 2D Ising model the standard test of approximate theories and of simulation methods.

## Simulating the model

The model is easily simulated with the Metropolis Monte Carlo method ([its own chapter](../monte-carlo/) explains why it samples the canonical ensemble). Repeatedly pick a spin, compute the energy change $\Delta E$ that flipping it would cause, which depends only on its four neighbours, and accept the flip with probability $\min(1, e^{-\Delta E/k_BT})$. One attempted flip per spin is called a **sweep**.

{{< widget name="ising" title="The two-dimensional Ising model" caption="Left: the lattice, blue spins up and orange spins down, with periodic boundaries. Right, top: the magnetisation per spin over time. Right, bottom: the average |m| you record at different temperatures against Onsager's exact curve (gold); point colours mark the lattice size. The readouts give the susceptibility and heat capacity estimated from fluctuations." >}}

Start at a temperature well below $T_c$, say $k_BT = 1.5J$, with random spins. The lattice does not order all at once. Small aligned **domains** of each sign form, and their boundaries move and smooth out, so that domains coarsen over time; eventually one sign usually takes over, although stripes spanning the periodic box can survive for a long time. Above $T_c$, at $k_BT = 3J$, the spins remain a fine-grained mixture and the magnetisation fluctuates around zero. Close to $T_c$, the picture is remarkable: clusters of every size, from single spins to the size of the lattice, coexist and fluctuate, and the magnetisation wanders widely. This is the **critical state**, in which the system has no characteristic length scale.

To rebuild the phase diagram, set a temperature, wait until the magnetisation has settled, and press **Record**. Points well below and well above $T_c$ fall on Onsager's curve. Near $T_c$ they do not: a finite lattice cannot have a sharp transition, so the recorded $\langle|m|\rangle$ is rounded off and stays above zero slightly beyond $T_c$, and the rounding shrinks as the lattice grows. Recording the same temperatures on 32, 64 and 128 spin lattices shows this **finite-size effect** directly. Close to $T_c$ the simulation also slows down dramatically, because large clusters take many sweeps to change, a phenomenon called **critical slowing down**. Cluster algorithms such as those of Swendsen and Wang or Wolff, which flip whole correlated clusters at once, were invented to overcome it.

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

## Phase transitions in simulations

Simulations of phase transitions must contend with the finite size of the simulated system. A box of $N$ particles cannot show true singularities, so transitions are rounded and shifted, and the critical properties of the infinite system are obtained by **finite-size scaling**: repeating the simulation for several sizes and extrapolating using the known way in which quantities scale with $L/\xi$. A practical tool is the Binder cumulant of the order parameter, whose curves for different system sizes cross near $T_c$.

First-order transitions pose the opposite problem. The two phases are separated by a free-energy barrier that grows with system size, so a simulation started in one phase can remain there far beyond the true transition temperature: a simulated crystal heated at constant rate often melts well above its melting point, because there is no surface from which melting can start. Locating first-order transitions reliably therefore requires free-energy calculations that compare the two phases directly, coexistence simulations in which both phases share a box with an interface, or biased sampling methods that drive the system over the barrier, described in [the subject on enhanced sampling](../es-umbrella/).

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

</div>
