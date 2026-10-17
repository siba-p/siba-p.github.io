---
title: "The structure of liquids"
description: "How disordered matter is described statistically: the radial distribution function and what its peaks mean, coordination numbers, energy, pressure and compressibility from g(r), the potential of mean force and why it differs from the pair potential, the structure factor measured by X-ray and neutron scattering, the hard-sphere picture of liquids, and how g(r) is computed correctly from simulations."
track: statmech
weight: 6
level: Core
prereqs: ["phase-transitions-ising", "fluctuations-and-response"]
lab: "Run a 2D Lennard-Jones fluid from gas to liquid to solid and watch g(r) and the potential of mean force build up"
---

## Order without a lattice

A crystal is easy to describe: give the lattice and the contents of one unit cell, and every atomic position follows. A gas is easy too: the atoms are almost independent. Liquids, glasses, amorphous solids and dense fluids lie in between. They have no long-range order, yet they are far from random: each atom is surrounded by a well-defined first shell of neighbours at nearly fixed distance, a less sharply defined second shell, and so on, with order fading over a few molecular diameters. The theory of liquids, developed from the 1930s by John Kirkwood, Joseph Mayer, Jean-Pierre Hansen, John Barker, Douglas Henderson and many others, and tested at every stage by computer simulation, describes this statistical order with a few correlation functions. The most important is the radial distribution function.

## The radial distribution function

The **radial distribution function** $g(r)$ measures how the density of particles around a given particle varies with distance, relative to the average density:

{{< eq title="The radial distribution function" say="Stand on one atom and count neighbours in a thin shell at distance r; divide by what an ideal gas of the same density would give." >}}
$$ \textcolor{#12a594}{g(r)} = \frac{\langle n(r)\rangle}{\rho\; 4\pi r^2\,\Delta r}, \qquad \rho\, \textcolor{#12a594}{g(r)}\,4\pi r^2\,\mathrm dr = \text{mean number of neighbours between } r \text{ and } r + \mathrm dr $$
- $\langle n(r)\rangle$: the average number of particles in a shell of thickness $\Delta r$ at distance $r$ (in 2D the shell area is $2\pi r\,\Delta r$)
- $g(r) = 0$ inside the repulsive core, peaks at neighbour shells, and tends to 1 at large distance
{{< /eq >}}

The figure runs a two-dimensional Lennard-Jones fluid by molecular dynamics and accumulates $g(r)$ as it goes. At low density, $g(r)$ shows a single weak peak just beyond the repulsive core, reflecting the attraction of neighbouring pairs, and is otherwise close to 1. In the liquid, it develops a strong first peak at about one particle diameter, a minimum, a second peak and weaker oscillations that decay within a few diameters. Compress further and the peaks sharpen and split as the system crystallises into a triangular lattice. The tagged atom (rose) and its first-shell neighbours (teal) show the shell that the first peak counts.

{{< widget name="liquid2d" title="Structure of a Lennard-Jones fluid" caption="Left: the fluid, with a tagged atom (rose) and its first-shell neighbours (teal) inside the dashed circle at the first minimum of g(r). Right: g(r) (teal) and the running coordination number (violet), or, in the second view, the potential of mean force against the pair potential. Vary density and temperature to move between gas, liquid and solid." >}}

## Coordination numbers and thermodynamics from g(r)

Integrating $\rho g(r)$ over the first peak gives the **coordination number**, the average number of nearest neighbours,

$$
n_1 = \rho\int_0^{r_{\min}} g(r)\,4\pi r^2\,\mathrm dr ,
$$

with the integral stopped at the first minimum $r_{\min}$. Simple liquids near their triple point have about 12 neighbours in three dimensions, close to the 12 of a close-packed crystal, which is why melting changes the density of simple substances by only around 10 %; water has only about 4.5 neighbours, the signature of its open, hydrogen-bonded network. In two dimensions, as in the figure, the dense liquid has close to 6 neighbours.

For particles interacting through a pair potential $u(r)$, $g(r)$ determines the thermodynamics. The average potential energy per particle and the pressure are

{{< eq title="Energy and pressure from g(r)" say="With pair interactions, knowing how neighbours are distributed is enough to compute the energy and, through the virial, the pressure." >}}
$$ \frac{U}{N} = \frac{\rho}{2}\int_0^\infty u(r)\,g(r)\,4\pi r^2\,\mathrm dr, \qquad \frac{P}{\rho k_BT} = 1 - \frac{\rho}{6k_BT}\int_0^\infty r\,u'(r)\,g(r)\,4\pi r^2\,\mathrm dr $$
{{< /eq >}}

and the isothermal compressibility follows from the **compressibility route**, $\rho k_BT\kappa_T = 1 + \rho\int_0^\infty [g(r) - 1]\,4\pi r^2\,\mathrm dr$, which links $g(r)$ to the density fluctuations of [the chapter on fluctuations](../fluctuations-and-response/). Because these routes are exact only for the exact $g(r)$, comparing them is a sensitive test of approximate theories such as the Percus–Yevick and hypernetted-chain integral equations.

## The potential of mean force

The probability of finding two particles at distance $r$, relative to an ideal gas, defines a free energy as a function of their separation:

{{< eq title="The potential of mean force" say="The free energy of holding two particles at distance r, averaged over everything else; it includes the effect of the surrounding medium." >}}
$$ w(r) = -k_BT\ln g(r), \qquad -\frac{\mathrm dw}{\mathrm dr} = \Big\langle F_{12} \Big\rangle_{r} $$
- the negative derivative of $w$ is the mean force between the two particles with all others averaged over, as Kirkwood showed in 1935
- at low density $w(r) \to u(r)$; at liquid density it differs, because the surrounding particles push and pull
{{< /eq >}}

Switch the figure to the potential of mean force. At low density the orange curve follows the blue pair potential. At liquid density it develops extra minima at the second and third neighbour distances and a barrier between the first two: there is no direct interaction at those distances, but the surrounding particles make some separations more probable than others. This is the same idea as the free-energy profiles of [the chapter on ensembles](../ensembles-and-free-energy/), applied to a distance. It is important in practice: the potential of mean force between two ions in water shows a contact minimum and a solvent-separated minimum, with a barrier between them corresponding to a water molecule entering or leaving the gap, and its depth determines ion pairing and the stability of colloids and nanoparticles in solution. Coarse-grained models are often built by matching potentials of mean force, by iterative Boltzmann inversion for example.

## Scattering and the structure factor

$g(r)$ is not only a simulation concept; it is measured. X-rays and neutrons scattered by a liquid produce an intensity pattern whose variation with the scattering vector $q$ is the **static structure factor**, related to $g(r)$ by a Fourier transform:

{{< eq title="The structure factor" say="The pattern of scattered X-rays or neutrons is the Fourier transform of how neighbours are arranged." >}}
$$ S(q) = 1 + 4\pi\rho\int_0^\infty r^2\,\big[g(r) - 1\big]\,\frac{\sin qr}{qr}\,\mathrm dr $$
- the first peak of $S(q)$ lies near $q \approx 2\pi/r_1$, where $r_1$ is the nearest-neighbour distance
- $S(0) = \rho k_BT\kappa_T$: small-angle scattering measures compressibility and density fluctuations
{{< /eq >}}

Comparing simulated and measured structure factors is one of the main tests of force fields and MLIPs for liquids, glasses and amorphous materials. For multicomponent systems there are partial structure factors and partial $g_{\alpha\beta}(r)$ for each pair of species, and X-ray and neutron experiments, which weight the species differently, together constrain them; for water, the oxygen–oxygen $g(r)$ from X-ray diffraction is the standard benchmark.

## Hard spheres and the van der Waals picture

The structure of simple dense liquids is dominated by repulsion. Simulations of **hard spheres** by Berni Alder and Thomas Wainwright (1957) and by William Wood and J. D. Jacobson showed that even particles with no attraction at all crystallise at high density, an entropy-driven transition, and that their liquid $g(r)$ looks remarkably like that of real simple liquids. This led to the modern van der Waals picture of liquids, developed by John Weeks, David Chandler and Hans Andersen (1971) and by Barker and Henderson: the structure is fixed by packing of the repulsive cores, and the attraction mainly provides a uniform cohesive background that holds the liquid together. Perturbation theories built on this idea predict liquid thermodynamics accurately and underlie much of the theory of fluids.

## Computing g(r) in a simulation

The recipe is simple, and the figure follows it: for every pair of particles compute the distance, applying the minimum-image convention in a periodic box; histogram the distances into bins of width $\Delta r$; average over many frames; and normalise each bin by the number of pairs an ideal gas would have in that shell, $\tfrac12 N\rho\cdot 4\pi r^2\Delta r$ (counting each pair once) or $N\rho\cdot 4\pi r^2\Delta r$ (counting both orders). Distances beyond half the box length are unreliable, because shells there are cut off by the periodic boundary. Bins must be fine enough to resolve the first peak but coarse enough to collect statistics, and the result should be averaged over frames separated by more than the correlation time. Analysis libraries such as MDAnalysis, MDTraj and OVITO compute $g(r)$, coordination numbers and structure factors directly from trajectories, as [the chapter on trajectory analysis](../trajectory-analysis/) describes.

{{< note type="key" >}}
- $g(r)$ is the local density at distance $r$ from a particle relative to the average: zero in the core, peaks at neighbour shells, 1 at large $r$.
- Integrating $\rho g$ over the first peak gives the coordination number; for pair potentials, energy, pressure and compressibility follow from $g(r)$.
- $w(r) = -k_BT\ln g(r)$ is the potential of mean force, a free energy including the effect of the surrounding medium.
- $S(q)$, the Fourier transform of $g(r) - 1$, is measured by X-ray and neutron scattering; $S(0) = \rho k_BT\kappa_T$.
- Liquid structure is dominated by repulsive packing; compute $g(r)$ with the minimum image up to half the box length, normalised by the ideal-gas shell count.
{{< /note >}}

{{< quiz >}}
- q: "What is g(r) at very large distances in a liquid?"
  options: ["0", "1", "It keeps oscillating with constant amplitude"]
  answer: 1
  why: "Far away, positions are uncorrelated and the local density equals the average."
- q: "The potential of mean force between two ions in water has two minima. What does the second represent?"
  options: ["A covalent bond", "A solvent-separated ion pair, with a water layer between the ions", "Numerical noise"]
  answer: 1
  why: "The medium creates free-energy minima where there is no direct interaction minimum."
- q: "What does S(q → 0) measure?"
  options: ["The nearest-neighbour distance", "The isothermal compressibility (density fluctuations)", "The viscosity"]
  answer: 1
  why: "S(0) = ρk_BTκ_T."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J.-P. Hansen and I. R. McDonald, *Theory of Simple Liquids: with Applications to Soft Matter*, 4th ed., Academic Press (2013), chapters 2–5.
2. J. G. Kirkwood, "Statistical mechanics of fluid mixtures", *Journal of Chemical Physics* **3**, 300–313 (1935).
3. B. J. Alder and T. E. Wainwright, "Phase transition for a hard sphere system", *Journal of Chemical Physics* **27**, 1208–1209 (1957).
4. J. D. Weeks, D. Chandler and H. C. Andersen, "Role of repulsive forces in determining the equilibrium structure of simple liquids", *Journal of Chemical Physics* **54**, 5237–5247 (1971).
5. J. A. Barker and D. Henderson, "What is 'liquid'? Understanding the states of matter", *Reviews of Modern Physics* **48**, 587–671 (1976).
6. D. Chandler, *Introduction to Modern Statistical Mechanics*, Oxford University Press (1987), chapter 7.
7. L. B. Skinner et al., "Benchmark oxygen–oxygen pair-distribution function of ambient water from x-ray diffraction measurements with a wide Q-range", *Journal of Chemical Physics* **138**, 074506 (2013).

</div>
