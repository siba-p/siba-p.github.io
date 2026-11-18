---
title: "The structure of liquids"
description: "How disordered matter is described statistically: the radial distribution function and what its peaks mean, coordination numbers, energy, pressure and compressibility from g(r), the potential of mean force and why it differs from the pair potential, the structure factor measured by X-ray and neutron scattering, the hard-sphere picture of liquids, and how g(r) is computed correctly from simulations."
hook: "A liquid has no lattice, yet stand on any atom of a simple liquid and you will count about a dozen neighbours at nearly the same distance. One curve, g(r), captures this hidden order, and X-ray scattering measures it."
objectives:
  - "Interpret the peaks of g(r) and compute coordination numbers from them"
  - "Compute energy, pressure and compressibility from g(r) for pair potentials"
  - "Explain why the potential of mean force differs from the pair potential"
  - "Relate g(r) to the structure factor measured by X-ray and neutron scattering"
  - "Compute g(r) correctly from a periodic simulation, with the ideal-gas normalisation"
cover: "cover.svg"
milestones:
  - year: 1914
    text: "Leonard Ornstein and Frits Zernike introduce the direct correlation function"
  - year: 1957
    text: "Berni Alder and Thomas Wainwright find that hard spheres crystallise in simulations"
  - year: 1964
    text: "Aneesur Rahman simulates liquid argon by molecular dynamics and computes its g(r)"
  - year: 1971
    text: "Weeks, Chandler and Andersen show that repulsive forces fix liquid structure"
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

### Reading a g(r)

Each feature of $g(r)$ has a physical reading. The onset of the first peak marks the distance of closest approach, set by the steep repulsive wall of the pair potential; for argon it lies at about 3.4 Å and the peak at about 3.7 Å. The height of the first peak measures how tightly the first shell is packed, and it falls as the temperature rises at fixed density. The width of the peaks reflects thermal motion and disorder in the neighbour distances. The decay of the oscillations gives the range over which positions are correlated, typically three to five molecular diameters in a simple liquid away from any critical point.

Departures from this pattern are diagnostic. In a crystal, the peaks sit at the lattice distances; for a face-centred cubic crystal the second and third neighbours lie at $\sqrt2$ and $\sqrt3$ times the first. In metallic glasses and deeply supercooled liquids the second peak splits in two, a signature of local icosahedral and other dense clusters that is used to follow vitrification in simulations. In amorphous silicon, the first peak sits at nearly the crystalline bond length of 2.35 Å and integrates to close to 4 neighbours, while the second shell is broadened because the tetrahedral bond angles vary from atom to atom. A small pre-peak below the main first peak usually signals a defect population, such as short Si–Si contacts or broken bonds in an amorphous model generated too quickly.

{{< note type="try" title="Pause and predict" >}}
Sketch $g(r)$ for an ideal gas, and then predict what happens to the $g(r)$ of a dense liquid when it is heated at constant density. Commit to an answer before reading on. For the ideal gas, positions are uncorrelated and $g(r) = 1$ at every distance, including $r = 0$. For the heated liquid, the particles collide harder and approach more closely, so the first peak moves slightly inward, becomes lower and broadens, and the oscillations die out sooner. Packing still dominates, however, so the peaks do not disappear: at liquid densities the structure is set mainly by the density and only weakly by the temperature, which is the van der Waals picture described below.
{{< /note >}}

## Coordination numbers and thermodynamics from g(r)

Integrating $\rho g(r)$ over the first peak gives the **coordination number**, the average number of nearest neighbours,

$$
n_1 = \rho\int_0^{r_{\min}} g(r)\,4\pi r^2\,\mathrm dr ,
$$

with the integral stopped at the first minimum $r_{\min}$. Simple liquids near their triple point have about 12 neighbours in three dimensions, close to the 12 of a close-packed crystal, which is why melting changes the density of simple substances by only around 10 %; water has only about 4.5 neighbours, the signature of its open, hydrogen-bonded network. In two dimensions, as in the figure, the dense liquid has close to 6 neighbours.

{{< note type="practice" title="Back of the envelope: where the first-shell atoms come from" >}}
Liquid argon near its triple point has a reduced density $\rho\sigma^3 \approx 0.84$, with $\sigma = 3.4$ Å. If the atoms were uncorrelated, a sphere of radius $1.5\sigma$, about where $g(r)$ has its first minimum, would hold $0.84\times\tfrac43\pi(1.5)^3 \approx 11.9$ atoms, of which $0.84\times\tfrac43\pi \approx 3.5$ would lie inside the core, $r < \sigma$. In the real liquid the core is empty, so those 3.5 atoms must sit somewhere else, and they pile up just outside it. The first peak is therefore mostly made of atoms excluded from the core. That is why the coordination number of a simple liquid, about 12, is close to the number of atoms an ideal gas at the same density would put within the first minimum.
{{< /note >}}

Coordination numbers are among the most quoted results of liquid-state simulations, and they depend on a convention. In aqueous Na⁺ the first minimum of the Na–O $g(r)$ is deep and the hydration number of about 5 to 6 is robust. For larger, weakly hydrated ions and for many molten salts the first minimum is shallow, and moving the cutoff by 0.2 Å changes the coordination number by one. Papers should state the cutoff, and comparisons between models or with experiment should use the same one.

For particles interacting through a pair potential $u(r)$, $g(r)$ determines the thermodynamics. The average potential energy per particle and the pressure are

{{< eq title="Energy and pressure from g(r)" say="With pair interactions, knowing how neighbours are distributed is enough to compute the energy and, through the virial, the pressure." >}}
$$ \frac{U}{N} = \frac{\rho}{2}\int_0^\infty u(r)\,g(r)\,4\pi r^2\,\mathrm dr, \qquad \frac{P}{\rho k_BT} = 1 - \frac{\rho}{6k_BT}\int_0^\infty r\,u'(r)\,g(r)\,4\pi r^2\,\mathrm dr $$
{{< /eq >}}

and the isothermal compressibility follows from the **compressibility route**, $\rho k_BT\kappa_T = 1 + \rho\int_0^\infty [g(r) - 1]\,4\pi r^2\,\mathrm dr$, which links $g(r)$ to the density fluctuations of [the chapter on fluctuations](../fluctuations-and-response/). Because these routes are exact only for the exact $g(r)$, comparing them is a sensitive test of approximate theories such as the Percus–Yevick and hypernetted-chain integral equations.

{{< note type="practice" title="Back of the envelope: the cohesive energy of liquid argon" >}}
Approximate the energy integral by counting only the first shell, with each of the roughly 12 neighbours at the bottom of the Lennard-Jones well, $u \approx -\varepsilon$. Each pair is shared by two atoms, so $U/N \approx -\tfrac12\times12\,\varepsilon = -6\varepsilon$. With $\varepsilon/k_B = 120$ K for argon this gives −6.0 kJ/mol, and the enthalpy of vaporisation, $-U/N + RT$ at the boiling point of 87 K, comes out at 6.7 kJ/mol against the measured 6.4 kJ/mol. The two errors partly cancel: first-shell neighbours are spread over the well rather than sitting at its bottom, and more distant shells add attraction.
{{< /note >}}

### Worked example: the pressure of hard spheres

For hard spheres of diameter $\sigma$, the virial integral involves $u'(r)$, which is zero everywhere except at contact, where it is infinite. The product $u'(r)\,g(r)$ is still finite in the limit, and the virial route reduces to a single number, the value of $g$ at contact:

$$
\frac{\beta P}{\rho} = 1 + \frac{2\pi}{3}\rho\sigma^3 g(\sigma^+) = 1 + 4\eta\, g(\sigma^+), \qquad \eta = \frac{\pi\rho\sigma^3}{6}.
$$

The pressure of a hard-sphere fluid is the ideal-gas pressure plus the momentum carried by collisions, and the collision rate is proportional to how often pairs are found touching. At a packing fraction $\eta = 0.49$, just below freezing, the Percus–Yevick theory described below gives $g(\sigma^+) = 4.79$ and hence $\beta P/\rho = 10.4$. Its compressibility route, $\rho k_BT\kappa_T$ integrated over density, gives 13.0 at the same packing fraction. Carnahan and Starling noticed in 1969 that the weighted average, two thirds of the compressibility result plus one third of the virial result, gives $\beta P/\rho = (1 + \eta + \eta^2 - \eta^3)/(1 - \eta)^3 = 12.2$. That formula agrees with computer simulations to within about 1 % across the whole fluid range.

{{< fig src="eos-routes.svg" alt="Compressibility factor against packing fraction from 0 to 0.55 for three hard-sphere equations of state: Percus–Yevick compressibility route highest, Carnahan–Starling in the middle, Percus–Yevick virial route lowest, with dots on the virial curve and a shaded fluid–solid coexistence band from 0.494 to 0.545" caption="Two routes from the same approximate $g(r)$ give different pressures, a measure of the error in the approximation. The dots are $1 + 4\eta g(\sigma^+)$ evaluated from the numerically computed Percus–Yevick $g(r)$ and fall on the virial curve. The Carnahan–Starling equation, close to simulation, lies between the two routes." >}}

## The potential of mean force

The probability of finding two particles at distance $r$, relative to an ideal gas, defines a free energy as a function of their separation:

{{< eq title="The potential of mean force" say="The free energy of holding two particles at distance r, averaged over everything else; it includes the effect of the surrounding medium." >}}
$$ w(r) = -k_BT\ln g(r), \qquad -\frac{\mathrm dw}{\mathrm dr} = \Big\langle F_{12} \Big\rangle_{r} $$
- the negative derivative of $w$ is the mean force between the two particles with all others averaged over, as Kirkwood showed in 1935
- at low density $w(r) \to u(r)$; at liquid density it differs, because the surrounding particles push and pull
{{< /eq >}}

Switch the figure to the potential of mean force. At low density the orange curve follows the blue pair potential. At liquid density it develops extra minima at the second and third neighbour distances and a barrier between the first two: there is no direct interaction at those distances, but the surrounding particles make some separations more probable than others. This is the same idea as the free-energy profiles of [the chapter on ensembles](../ensembles-and-free-energy/), applied to a distance. It is important in practice: the potential of mean force between two ions in water shows a contact minimum and a solvent-separated minimum, with a barrier between them corresponding to a water molecule entering or leaving the gap, and its depth determines ion pairing and the stability of colloids and nanoparticles in solution. Coarse-grained models are often built by matching potentials of mean force, by iterative Boltzmann inversion for example.

{{< note type="warn" title="Myth" >}}
**A minimum in the potential of mean force, or a peak in g(r), means the particles attract each other.** Hard spheres have no attraction at all, yet at a packing fraction of 0.45 their potential of mean force has a well of −1.4 $k_BT$ at contact, a barrier of +0.47 $k_BT$ at 1.5σ and a second well near 2σ. The surrounding spheres produce all three. A pair at contact excludes less volume to the others than a pair slightly apart, so the rest of the fluid gains entropy by pushing the pair together. Asakura and Oosawa described the same entropic attraction for colloids in a solution of non-adsorbing polymer in 1954, and it is now called the **depletion interaction**.
{{< /note >}}

{{< fig src="hard-sphere-pmf.svg" alt="The hard-sphere pair potential, a vertical wall at r equals sigma and zero beyond, compared with the potential of mean force at packing fraction 0.45, which has a well of minus 1.4 kBT at contact, a barrier of plus 0.47 kBT near 1.5 sigma and a second shallow well near 2.05 sigma" caption="The potential of mean force of the Percus–Yevick hard-sphere fluid at $\eta = 0.45$. All of its structure comes from the medium: the direct interaction is zero outside contact." >}}

For coarse-grained modelling, this distinction is the main difficulty. A potential obtained by iterative Boltzmann inversion reproduces $g(r)$ at the state point where it was fitted, by construction, but it absorbs the effect of the medium into the pair potential. It is therefore not transferable: the same effective potential gives the wrong structure at a different density, temperature or composition, and the wrong pressure even at the fitting state unless a pressure correction is added.

## Scattering and the structure factor

$g(r)$ is not only a simulation concept; it is measured. X-rays and neutrons scattered by a liquid produce an intensity pattern whose variation with the scattering vector $q$ is the **static structure factor**, related to $g(r)$ by a Fourier transform:

{{< eq title="The structure factor" say="The pattern of scattered X-rays or neutrons is the Fourier transform of how neighbours are arranged." >}}
$$ S(q) = 1 + 4\pi\rho\int_0^\infty r^2\,\big[g(r) - 1\big]\,\frac{\sin qr}{qr}\,\mathrm dr $$
- the first peak of $S(q)$ lies near $q \approx 2\pi/r_1$, where $r_1$ is the nearest-neighbour distance
- $S(0) = \rho k_BT\kappa_T$: small-angle scattering measures compressibility and density fluctuations
{{< /eq >}}

Comparing simulated and measured structure factors is one of the main tests of force fields and MLIPs for liquids, glasses and amorphous materials. For multicomponent systems there are partial structure factors and partial $g_{\alpha\beta}(r)$ for each pair of species, and X-ray and neutron experiments, which weight the species differently, together constrain them; for water, the oxygen–oxygen $g(r)$ from X-ray diffraction is the standard benchmark.

The momentum transfer in a diffraction experiment is $q = 4\pi\sin\theta/\lambda$, so the largest $q$ available is $4\pi/\lambda$. That limit is 8.2 Å⁻¹ for a copper Kα laboratory source, 17.7 Å⁻¹ for molybdenum and 22.5 Å⁻¹ for silver. Transforming data cut off at $q_{\max}$ back to $g(r)$ produces termination ripples with a period of about $2\pi/q_{\max}$. For copper radiation that is 0.8 Å, comparable to the width of a first-neighbour peak. Pair-distribution-function (PDF) studies of liquids, glasses and nanoparticles therefore use molybdenum or silver sources, or high-energy synchrotron X-rays, which reach well beyond 20 Å⁻¹.

## Predicting g(r) without simulation: the Ornstein–Zernike equation

$g(r)$ can also be calculated from theory. In 1914 Leonard Ornstein and Frits Zernike, studying critical opalescence, split the total correlation $h(r) = g(r) - 1$ between two particles into a **direct** part $c(r)$, and an indirect part transmitted through all the other particles:

$$
h(r_{12}) = c(r_{12}) + \rho\int c(r_{13})\,h(r_{32})\,\mathrm d\mathbf r_3 , \qquad S(q) = \frac{1}{1 - \rho\,\hat c(q)} .
$$

The second form follows by Fourier transformation, because the convolution becomes a product. The Ornstein–Zernike equation is exact but has two unknowns, so it needs a second relation, a **closure**, connecting $h$, $c$ and the pair potential. The Percus–Yevick closure (1958) sets $c(r) = 0$ wherever $u(r) = 0$, and for hard spheres it gives $c(r)$ inside the core as a cubic polynomial in $r$. Wertheim and Thiele found that solution independently in 1963, and it gives the contact value $g(\sigma^+) = (1 + \eta/2)/(1 - \eta)^2$ and $S(0) = (1 - \eta)^4/(1 + 2\eta)^2$ in closed form. The hypernetted-chain closure is more accurate for long-range interactions such as those in ionic liquids and electrolytes. Its descendants, the reference interaction site model and 3D-RISM, compute solvation structure and free energies of molecules in solvent in seconds, against hours for an MD calculation.

{{< fig src="hard-sphere-structure.svg" alt="Left: radial distribution functions of hard spheres at packing fractions 0.20, 0.35 and 0.49, each zero inside r equals sigma with a contact peak that grows with density. Right: the corresponding structure factors, with a main peak growing to 3.07 at q sigma of 7.0 and S(0) falling to 0.017 at the highest density" caption="Percus–Yevick hard spheres, computed from the closed-form $c(r)$ and the Ornstein–Zernike equation. As the packing fraction approaches freezing (0.494), the contact value rises to 4.8, the oscillations extend to several diameters, $S(0)$ falls to 0.017 and the main peak of $S(q)$ grows to about 3." >}}

The structure factor in the figure illustrates two rules of thumb. The main peak of $S(q)$ at $\eta = 0.49$ lies at $q\sigma = 7.0$, about 11 % above $2\pi/\sigma$, so $2\pi/r_1$ locates it only roughly. And its height is about 3. Hansen and Verlet observed in 1969 that simple liquids freeze when the main peak of $S(q)$ reaches about 2.85, an empirical criterion that holds for Lennard-Jones and hard-sphere fluids and is still used as a quick check of whether a simulated liquid is close to crystallising. The Percus–Yevick value slightly exceeds it at the freezing density because the approximation overestimates the peak.

## Hard spheres and the van der Waals picture

The structure of simple dense liquids is dominated by repulsion. Simulations of **hard spheres** by Berni Alder and Thomas Wainwright (1957) and by William Wood and J. D. Jacobson showed that even particles with no attraction at all crystallise at high density, an entropy-driven transition, and that their liquid $g(r)$ looks very like that of real simple liquids. This led to the modern van der Waals picture of liquids, developed by John Weeks, David Chandler and Hans Andersen (1971) and by Barker and Henderson: the structure is fixed by packing of the repulsive cores, and the attraction mainly provides a uniform cohesive background that holds the liquid together. Perturbation theories built on this idea predict liquid thermodynamics accurately and underlie much of the theory of fluids.

The hard-sphere phase diagram has been measured as well as simulated. Hoover and Ree located the transition with free-energy calculations in 1968: a fluid with packing fraction 0.494 coexists with a face-centred cubic crystal at 0.545. Pusey and van Megen reproduced it in 1986 with suspensions of sterically stabilised PMMA colloids about 0.3 µm across, which behave almost as hard spheres. Crystals appeared in samples between those packing fractions within days and could be watched with a light microscope. Colloids have since become a standard experimental model for nucleation, glass formation and the structure of liquids, because particle positions can be tracked one by one with confocal microscopy and $g(r)$ computed directly from the images.

## Computing g(r) in a simulation

The recipe is simple, and the figure follows it: for every pair of particles compute the distance, applying the minimum-image convention in a periodic box; histogram the distances into bins of width $\Delta r$; average over many frames; and normalise each bin by the number of pairs an ideal gas would have in that shell, $\tfrac12 N\rho\cdot 4\pi r^2\Delta r$ (counting each pair once) or $N\rho\cdot 4\pi r^2\Delta r$ (counting both orders). Distances beyond half the box length are unreliable, because shells there are cut off by the periodic boundary. Bins must be fine enough to resolve the first peak but coarse enough to collect statistics, and the result should be averaged over frames separated by more than the correlation time. Analysis libraries such as MDAnalysis, MDTraj and OVITO compute $g(r)$, coordination numbers and structure factors directly from trajectories, as [the chapter on trajectory analysis](../trajectory-analysis/) describes.

{{< fig src="counting-shells.svg" alt="Left: a snapshot of about two hundred hard disks in a periodic square box, with a pink tagged disk at the centre, teal first-shell neighbours, gold disks in a thin shell at three diameters and a dashed circle of radius half the box. Right top: bar chart of neighbours per shell rising with r, with the straight ideal-gas line. Right bottom: their ratio, g(r), with a sharp first peak and oscillations decaying to one" caption="The g(r) recipe on a 2D hard-disk fluid at area fraction 0.6. Raw neighbour counts grow with $r$ only because shells get longer; dividing by the ideal-gas count $\rho\,2\pi r\Delta r$ leaves the correlations. The first minimum at $1.65\sigma$ encloses 5.5 neighbours on average." >}}

Several mistakes recur in practice, and each has a clear signature:

- **Wrong normalisation.** Normalising with $N$ instead of $N - 1$ partners per particle makes $g(r)$ tend to $1 - 1/N$ instead of 1. For $N = 256$ the error is 0.4 % in $g$, which is invisible in a plot but enormous in integrals of $g(r) - 1$, such as the compressibility route and Kirkwood–Buff integrals, because the error is multiplied by a volume that grows as $r^3$.
- **Going beyond half the box.** Beyond $L/2$ the shells are cut by the box faces and the counts drop. If $g(r)$ dips below 1 at large $r$, the range is too long.
- **A Fourier transform of a truncated g(r).** Transforming $g(r)$ cut off at $L/2$ produces spurious ripples in $S(q)$ at low $q$. Compute $S(q)$ directly instead, as $\langle|\sum_j e^{i\mathbf q\cdot\mathbf r_j}|^2\rangle/N$ on the wavevectors allowed by the box, $\mathbf q = 2\pi\mathbf n/L$. The smallest accessible $q$ is $2\pi/L$, so small-angle behaviour needs a large box.
- **A fluctuating box.** In an NPT run, normalise each frame with its own density, or the long-range limit drifts.

{{< note type="practice" title="From the lab: comparing with diffraction" >}}
An X-ray or neutron experiment does not measure $g(r)$ directly. It measures an intensity weighted by the X-ray form factors or neutron scattering lengths of the species present, so a simulation must be converted into the same weighted sum of partial structure factors before comparison, ideally in $q$-space where the data were taken. Neutron experiments on water use isotope substitution: H and D scatter neutrons very differently, so measuring H₂O, D₂O and their mixtures separates the O–O, O–H and H–H partial structure factors. When a machine-learned potential for an oxide glass or a molten salt is validated, matching the measured $S(q)$ to within its error bars is the standard test of structure, alongside the density.
{{< /note >}}

{{< note type="key" >}}
- $g(r)$ is the local density at distance $r$ from a particle relative to the average: zero in the core, peaks at neighbour shells, 1 at large $r$.
- Integrating $\rho g$ over the first peak gives the coordination number; for pair potentials, energy, pressure and compressibility follow from $g(r)$.
- $w(r) = -k_BT\ln g(r)$ is the potential of mean force, a free energy including the effect of the surrounding medium.
- $S(q)$, the Fourier transform of $g(r) - 1$, is measured by X-ray and neutron scattering; $S(0) = \rho k_BT\kappa_T$.
- The Ornstein–Zernike equation with a closure (Percus–Yevick for hard spheres) predicts $g(r)$ and $S(q)$ without simulation; for hard spheres the contact value $g(\sigma^+)$ fixes the pressure.
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
- q: "At packing fraction 0.45 the hard-sphere potential of mean force has a well at contact. Where does it come from?"
  options: ["A weak attraction in the hard-sphere potential", "The surrounding spheres: a touching pair excludes less volume, so the rest of the fluid gains entropy (a depletion effect)", "Numerical error in g(r)"]
  answer: 1
  why: "Hard spheres have zero interaction outside contact; every feature of w(r) comes from the medium."
- q: "For hard spheres, which property of g(r) fixes the pressure?"
  options: ["The position of the second peak", "The contact value g(σ⁺), through βP/ρ = 1 + 4η g(σ⁺)", "The large-r limit"]
  answer: 1
  why: "The virial involves u′(r), which for hard spheres is non-zero only at contact."
- q: "A g(r) computed from a 256-particle simulation tends to 0.996 at large r. The most likely cause is…"
  options: ["The liquid is compressible", "Normalising by N instead of N − 1 partners per particle", "Too short a run"]
  answer: 1
  why: "Each particle has N − 1 partners; dividing by N biases g by 1/N, which matters for integrals of g − 1."
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
8. L. S. Ornstein and F. Zernike, "Accidental deviations of density and opalescence at the critical point of a single substance", *Proceedings of the Royal Netherlands Academy of Arts and Sciences* **17**, 793–806 (1914).
9. J. K. Percus and G. J. Yevick, "Analysis of classical statistical mechanics by means of collective coordinates", *Physical Review* **110**, 1–13 (1958).
10. M. S. Wertheim, "Exact solution of the Percus–Yevick integral equation for hard spheres", *Physical Review Letters* **10**, 321–323 (1963); E. Thiele, "Equation of state for hard spheres", *Journal of Chemical Physics* **39**, 474–479 (1963).
11. N. F. Carnahan and K. E. Starling, "Equation of state for nonattracting rigid spheres", *Journal of Chemical Physics* **51**, 635–636 (1969).
12. J.-P. Hansen and L. Verlet, "Phase transitions of the Lennard-Jones system", *Physical Review* **184**, 151–161 (1969).
13. S. Asakura and F. Oosawa, "On interaction between two bodies immersed in a solution of macromolecules", *Journal of Chemical Physics* **22**, 1255–1256 (1954).
14. P. N. Pusey and W. van Megen, "Phase behaviour of concentrated suspensions of nearly hard colloidal spheres", *Nature* **320**, 340–342 (1986).
15. A. Rahman, "Correlations in the motion of atoms in liquid argon", *Physical Review* **136**, A405–A411 (1964).

</div>
