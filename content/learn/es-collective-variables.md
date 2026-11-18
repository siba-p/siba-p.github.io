---
title: "Collective variables"
description: "The coordinates in which rare events are described: what a collective variable is, common choices (distances, angles, coordination numbers, dihedrals, RMSD, path variables, Steinhardt order parameters), the free-energy surface as a marginal probability, Jacobian terms, the mean force and the blue-moon ensemble, what makes a collective variable good, the committor test, and how PLUMED implements them."
hook: "Look along the wrong direction and a free-energy barrier vanishes from the profile, although nothing in the system has changed. Choosing that direction, the collective variable, is the most consequential decision in a rare-event study."
objectives:
  - "Recognise common collective variables, from distances and dihedrals to path variables and Steinhardt parameters"
  - "Explain why a free-energy profile depends on the chosen variable, including Jacobian terms"
  - "Diagnose hidden barriers in degrees of freedom orthogonal to a collective variable"
  - "Interpret a committor histogram to judge whether a variable is a good reaction coordinate"
  - "Relate the mean force along a variable to the slope of its free-energy profile"
cover: "cover.svg"
milestones:
  - year: 1983
    text: "Steinhardt, Nelson and Ronchetti introduce bond-orientational order parameters"
  - year: 1989
    text: "Carter, Ciccotti, Hynes and Kapral derive the blue-moon ensemble for constrained variables"
  - year: 2007
    text: "Branduardi, Gervasio and Parrinello introduce path collective variables"
  - year: 2014
    text: "Tribello and colleagues release PLUMED 2"
track: rl-land
weight: 3
level: Core
prereqs: ["es-rates", "ensembles-and-free-energy"]
lab: "Rotate a collective variable across a two-state landscape and watch the barrier appear and vanish"
---

## Describing a transition with a few numbers

A transition in a system of thousands of atoms involves, in principle, all $3N$ coordinates. Yet chemists describe a reaction by a bond that forms and another that breaks, a biophysicist describes folding by how many native contacts have formed, and a materials scientist describes crystallisation by the size of the largest crystalline cluster. Each of these is a **collective variable** (CV): a function $\xi(\mathbf x)$ of the atomic coordinates, chosen to capture the progress of the process while ignoring the irrelevant details.

Collective variables are the language of almost every enhanced-sampling method. Free energies are computed as functions of them; biases are applied along them; and the quality of the result depends on how well they describe the transition. Choosing them is the most important, and often the most difficult, decision in a rare-event study.

Three related terms are used loosely in the literature and are worth separating. A **collective variable** is any function of the coordinates that one chooses to monitor or bias. An **order parameter** is a CV that distinguishes the states, as a crystallinity measure distinguishes solid from liquid. A **reaction coordinate** is a CV that also describes the progress of the transition, in the sense that its value predicts what happens next; the ideal reaction coordinate is the committor discussed below. Every reaction coordinate is an order parameter, but many good order parameters are poor reaction coordinates, and confusing the two is the origin of most failed enhanced-sampling studies.

A useful picture is a shadow on a wall. A free-energy profile is the shadow cast by the full $3N$-dimensional distribution onto one or two chosen directions. From the right angle, two separate objects cast two separate shadows with a gap between them. From the wrong angle, the shadows overlap and the gap, which still exists in the full space, disappears from view.

## A catalogue of collective variables

The simplest CVs are geometric. A **distance** between two atoms or centres of mass describes binding, dissociation and bond breaking; an **angle** or **dihedral** describes conformational change, as the backbone dihedrals $\phi$ and $\psi$ do for the classic test system alanine dipeptide. A **coordination number** counts how many atoms of one group are within a cutoff of another, made smooth and differentiable with a switching function,

$$
s = \sum_{i \in A}\sum_{j \in B} \frac{1 - (r_{ij}/r_0)^n}{1 - (r_{ij}/r_0)^m},
$$

and describes solvation, adsorption and the number of bonds an atom has. The **root-mean-square deviation** (RMSD) from a reference structure measures how far a molecule is from, say, its folded state.

{{< fig src="catalogue.svg" alt="Four cartoons: two atoms joined by a distance arrow r; a chain of four atoms with a dihedral angle φ; a central atom with four neighbours inside a dashed cutoff circle of radius r0 and three outside; and a four-atom chain overlaid on an open-circle reference copy of itself" caption="The four geometric collective variables used most often: a distance, a dihedral angle, a coordination number and an RMSD from a reference structure. Each maps the full set of coordinates to a single number." >}}

For more complex transitions, CVs are built from many atoms. **Path collective variables** (Davide Branduardi, Francesco Gervasio and Michele Parrinello, 2007) describe progress along a reference path of frames, $s$, and distance from that path, $z$. **Steinhardt bond-order parameters** (Paul Steinhardt, David Nelson and Marco Ronchetti, 1983), built from spherical harmonics of the bond directions around each atom, distinguish liquid-like from crystal-like environments and different crystal structures; averaged or counted over atoms, they track nucleation and growth. **Coordination-based order parameters**, the number of hydrogen bonds, the electric dipole of a region, the volume of a cavity, and many others are in use. The PLUMED library, a plugin that adds CVs and enhanced-sampling methods to most major MD codes (GROMACS, LAMMPS, AMBER, CP2K, OpenMM and others), implements hundreds of them.

### Coordination numbers and switching functions

A hard count of neighbours inside a cutoff is a step function of the distances. Its derivative is zero almost everywhere and infinite at the cutoff, so a bias applied to it would exert no force until an atom crossed the cutoff and then an infinite one. The rational switching function above replaces the step with a smooth decay. With $n = 6$ and $m = 12$ it simplifies to $s(r) = 1/[1 + (r/r_0)^6]$: an atom at $r_0$ counts one half, one at $1.2\,r_0$ counts 0.25, and one at $2\,r_0$ counts 0.015. Larger exponents sharpen the switch but concentrate the bias force in a narrower shell. The choice of $r_0$ is usually the first minimum of the radial distribution function, around 0.3 nm for the first solvation shell of a small ion in water; for a metal–oxygen bond it is set slightly beyond the bond length so that bound and unbound states give clearly different counts.

{{< fig src="switching.svg" alt="Left: the switching function s(r) against r over r0 for n = 6, m = 12 and for n = 12, m = 24, compared with a dashed hard step at r0; a point marks s = 0.25 at r = 1.2 r0. Right: the negative derivative of each, a peak centred near r0, taller and narrower for the larger exponents" caption="A coordination number counts neighbours smoothly. The slope of the switching function, right, is what converts a bias on the coordination number into forces on atoms; a hard cutoff would concentrate all of it in an infinitely thin shell." >}}

In PLUMED, the definitions are a few lines of input. The following file defines a distance, a coordination number and a dihedral, and writes them every 100 steps; distances are in nm for GROMACS.

```text
# plumed.dat
d:   DISTANCE ATOMS=1,10
cn:  COORDINATION GROUPA=1 GROUPB=20-100 R_0=0.3 NN=6 MM=12
phi: TORSION ATOMS=5,7,9,15
PRINT ARG=d,cn,phi STRIDE=100 FILE=COLVAR
```

### Steinhardt order parameters in numbers

Steinhardt's parameters rest on a simple idea. Expand the directions of the bonds from an atom to its neighbours in spherical harmonics $Y_{lm}$, average over the bonds, and combine the $2l + 1$ components into a rotationally invariant length, $Q_l = \big[\tfrac{4\pi}{2l+1}\sum_m |\bar q_{lm}|^2\big]^{1/2}$. Each crystal structure has a characteristic fingerprint, and a disordered environment gives small values. By the addition theorem of spherical harmonics, $Q_l^2$ equals the average of the Legendre polynomial $P_l(\cos\theta_{ij})$ over all pairs of bonds, which the cell below uses to compute the fingerprints with nothing but NumPy.

{{< py title="Steinhardt Q4 and Q6 for perfect neighbour shells" >}}
import numpy as np
from numpy.polynomial import legendre as L

def Q(l, bonds):
    # Steinhardt Q_l via the addition theorem: Q_l^2 = average of P_l(cos angle) over all bond pairs
    u = bonds / np.linalg.norm(bonds, axis=1, keepdims=True)
    return np.sqrt(max(np.mean(L.legval(u @ u.T, [0] * l + [1])), 0.0))

p = [-1, 1]
fcc = np.array([(i, j, 0) for i in p for j in p] + [(i, 0, j) for i in p for j in p]
               + [(0, i, j) for i in p for j in p], float)
ring = [(np.cos(t), np.sin(t), 0) for t in np.arange(6) * np.pi / 3]
tri = [(np.cos(t) / 3**0.5, np.sin(t) / 3**0.5, z) for t in np.pi / 6 + np.arange(3) * 2 * np.pi / 3
       for z in (2 / 3) ** 0.5 * np.array(p)]
hcp = np.array(ring + tri)                       # same triangle above and below: ABA stacking
bcc = np.array([(i, j, k) for i in p for j in p for k in p] + list(2 * np.eye(3)) + list(-2 * np.eye(3)))
g = (1 + 5 ** 0.5) / 2
ico = np.array([(0, s, t * g) for s in p for t in p], float)
ico = np.vstack([ico, np.roll(ico, 1, axis=1), np.roll(ico, 2, axis=1)])
gas = np.random.default_rng(1).normal(size=(12, 3))
for name, b in [("fcc", fcc), ("hcp", hcp), ("bcc (14)", bcc), ("icosahedron", ico), ("12 random", gas)]:
    print(f"{name:12s} Q4 = {Q(4, b):.3f}   Q6 = {Q(6, b):.3f}")
{{< /py >}}

The output reproduces the values in Steinhardt, Nelson and Ronchetti's paper: fcc gives $Q_6 = 0.575$, hcp 0.485, bcc (with its 14 first- and second-shell neighbours) 0.511, and an icosahedron 0.663 with $Q_4 = 0$. Twelve random bond directions give values near $1/\sqrt{12} \approx 0.29$, the size of a random-walk sum. In a real liquid, thermal disorder smears the crystalline values, and per-atom $Q_6$ distributions of liquid and solid overlap. Pieter Rein ten Wolde, Maria Ruiz-Montero and Daan Frenkel (1995) solved this by calling two neighbours "connected" when the normalised dot product of their $q_{6m}$ vectors exceeds a threshold (0.5 is common), calling an atom solid-like when it has enough connections (typically 7 or 8 of its 12), and using the size of the largest cluster of solid-like atoms as the CV for nucleation. Wolfgang Lechner and Christoph Dellago (2008) showed that averaging $q_{lm}$ over the first neighbour shell before forming the invariant sharpens the separation between fcc, hcp, bcc and liquid enough to classify individual atoms reliably.

### Path collective variables

When a plausible transition path is known, for example from a steered simulation or an NEB calculation, Branduardi, Gervasio and Parrinello's path variables measure progress along it. Given $N$ reference frames $\mathbf X_1, \ldots, \mathbf X_N$ ordered from A to B and a distance $d_i = \|\mathbf X - \mathbf X_i\|^2$, usually a mean-square deviation over a subset of atoms,

$$
s(\mathbf X) = \frac{1}{N-1}\,\frac{\sum_i (i-1)\,e^{-\lambda d_i}}{\sum_i e^{-\lambda d_i}}, \qquad z(\mathbf X) = -\frac{1}{\lambda}\ln\sum_i e^{-\lambda d_i}.
$$

The variable $s$ runs from 0 at the first frame to 1 at the last, as a soft-weighted index of the nearest frame; $z$ measures the distance from the path. The smoothing parameter $\lambda$ is set so that $\lambda$ times the typical distance between neighbouring frames is about 2.3, which makes the weights of neighbouring frames differ by a factor of ten. A large $z$ during a biased run is informative in its own right: the system has found a route that the reference path did not anticipate, and the path can be updated and the calculation repeated.

## The free-energy surface

Once a CV is chosen, the free-energy surface along it is defined from the probability distribution of the CV in equilibrium, as introduced in [the chapter on ensembles](../ensembles-and-free-energy/):

{{< eq title="The free-energy surface along a collective variable" say="Integrate the Boltzmann weight over every configuration that has a given value of the collective variable; minus k_BT times its logarithm is the free energy there." >}}
$$ \textcolor{#f08c2e}{F}(s) = -k_BT \ln \textcolor{#4c6ef5}{P}(s) + C, \qquad \textcolor{#4c6ef5}{P}(s) = \frac{1}{Z}\int \delta\big(\textcolor{#12a594}{\xi}(\mathbf x) - s\big)\, e^{-\beta U(\mathbf x)}\,\mathrm d\mathbf x $$
- $\textcolor{#12a594}{\xi}(\mathbf x)$: the collective variable; $s$: one of its values
- the integral runs over all other coordinates, so $F(s)$ includes their entropy
{{< /eq >}}

Because $F(s)$ is a marginal of the full distribution, it depends on the choice of CV in a way the energy does not. Two consequences are worth knowing. First, a coordinate transformation contributes a **Jacobian** term: the free energy as a function of the distance $r$ between two particles includes $-2k_BT\ln r$, because the volume of the shell at distance $r$ grows as $r^2$; even two non-interacting particles have a free energy that decreases with distance. Comparing free energies along different CVs, or converting a distance profile into a binding free energy, requires accounting for such terms. Second, free-energy differences between states are independent of the CV only when the states are defined by regions that do not depend on it; barrier heights depend on the CV and are physically meaningful only for good CVs.

{{< fig src="jacobian.svg" alt="Energy in kT against distance in units of sigma for a Lennard-Jones pair with well depth equal to kT: the pair potential approaches zero, the Jacobian term alone falls steadily, and their sum F(r) has a shallow minimum and then keeps decreasing" caption="For an isolated Lennard-Jones pair with $\varepsilon = k_BT$, the free energy along $r$ has no plateau. Between $1.5\sigma$ and $3\sigma$ the potential rises by 0.31 $k_BT$, but $F(r)$ falls by 1.07 $k_BT$ because of the $-2k_BT\ln r$ term." >}}

The Jacobian term is not an artefact to be discarded; it is the entropy of the orientations available at each distance. Its practical consequence appears whenever a distance profile is turned into a binding constant. For two molecules that interact through a potential of mean force $w(r)$, with $w \to 0$ at large separation, the association constant is the integral of the Boltzmann factor over the bound region including the $4\pi r^2$ factor, and the standard binding free energy refers it to the 1 M standard concentration $C^\circ = 1/1661$ Å⁻³:

$$
K = \int_{\text{bound}} 4\pi r^2 e^{-\beta w(r)}\,\mathrm dr, \qquad \Delta G^\circ = -k_BT\ln(K C^\circ).
$$

Reporting the depth of the minimum of $F(r)$ as "the binding free energy" mixes two different quantities and can be off by several $k_BT$, depending on how far out the profile was computed.

{{< note type="math" title="The mean force along a distance" >}}
For a pair separated by $r$, the free energy is $F(r) = w(r) - 2k_BT\ln r + C$, so the mean force has an extra term: $\mathrm dF/\mathrm dr = \langle \partial U/\partial r\rangle_r - 2k_BT/r$. A constrained simulation that measures only the average constraint force at fixed $r$ therefore misses $-2k_BT/r$, which is the simplest example of the geometric corrections of the blue-moon ensemble. In thermodynamic integration along a distance, omitting the correction gives a profile without the Jacobian term, which is $w(r)$, not $F(r)$.
{{< /note >}}

The derivative of the free energy is the **mean force**, the average force along the CV with all other coordinates in equilibrium. For a CV that is a combination of Cartesian coordinates it is simply the average of $-\partial U/\partial \xi$ at fixed $\xi$; in general, as Emily Carter, Giovanni Ciccotti, James Hynes and Raymond Kapral showed in 1989 for simulations with the CV held fixed by a constraint (the **blue-moon ensemble**), it contains geometric correction terms. Integrating the mean force along the CV gives $F(s)$: this is **thermodynamic integration** along a CV, and it is also the principle behind the adaptive biasing force method of [the chapter on adaptive biasing](../es-opes-abf/).

## What makes a collective variable good

A good CV must at least distinguish the states of interest: its values in the reactant, the product and the transition region must be different. But that is not enough. A good CV should also capture the **slow** degrees of freedom of the transition, so that once the CV is fixed, everything else relaxes quickly. If an important slow coordinate is left out, the free-energy surface along the CV will look smooth while the real barrier hides in the coordinate that was ignored, and biasing along the CV will fail to accelerate the transition, a problem known as **hidden barriers** or **orthogonal degrees of freedom**.

The figure shows this in two dimensions. Two states, A and B, are separated by a barrier along a diagonal direction. The collective variable $s$ is a projection onto a direction you choose. When $s$ points along the true reaction direction, the free-energy profile shows the barrier clearly and the two states project onto separate regions of $s$. Rotate $s$ away and the barrier shrinks and disappears, while the projections of A and B overlap until they become indistinguishable: a free-energy profile along that CV would suggest there is no barrier at all, although nothing about the system has changed.

{{< widget name="cvchoice" title="A collective variable can hide a barrier" caption="Left: the landscape with states A and B and the direction of the collective variable s (violet; thin lines are contours of constant s). Right, top: the free energy F(s). Right, bottom: how states A (blue) and B (teal) project onto s. Rotate s and watch the barrier and the separation of the states change." >}}

The rigorous test of a reaction coordinate uses the **committor** $p_B$ introduced in [the chapter on rates](../es-rates/). If $s$ is a good reaction coordinate, then all configurations with the value $s^\ddagger$ at the top of the barrier should have $p_B \approx \tfrac12$. The **committor test** (Peter Bolhuis, Christoph Dellago, Phillip Geissler and David Chandler, around 1999–2000) samples configurations at fixed $s^\ddagger$, shoots many trajectories from each, and histograms the resulting committor values: a histogram peaked at $\tfrac12$ means a good coordinate, a flat or bimodal one means that $s$ misses something important. The test is expensive but decisive, and it motivates the machine-learning methods of [the chapter on learned collective variables](../es-ml-cvs/) that approximate the committor or the slowest dynamical modes directly.

{{< fig src="committor.svg" alt="Left: contour map of a two-dimensional landscape with basins A and B, committor contours at 0.1, one half and 0.9, a vertical line for the variable x at its barrier top and a horizontal line for the variable y at its barrier top. Right: histograms of committor values for configurations on each line; for x they form a broad peak around one half, for y nearly all are at one" caption="The committor test computed exactly for overdamped dynamics on a two-dimensional landscape. Configurations at the free-energy maximum of $s_1 = x$ have committors spread around ½, with 88% between 0.3 and 0.7. At the apparent barrier of $s_2 = y$, almost every configuration is already committed to B: that profile’s ‘barrier’ is not the transition state at all." >}}

The figure shows the test without the sampling noise of a real study. The committor of each grid point was obtained by solving the backward Kolmogorov equation, $\nabla\cdot(e^{-\beta U}\nabla p_B) = 0$ with $p_B = 0$ in A and 1 in B, instead of by shooting trajectories. The isocommittor surfaces are curved, so no straight line can coincide with $p_B = \tfrac12$, and even the better variable $x$ gives a broad histogram. In a real application each committor value is estimated from 10 to 100 trajectories per configuration, which adds a binomial spread of $\sqrt{p(1-p)/n}$, up to 0.05 for $n = 100$; a histogram much broader than that is the signature of a missing coordinate.

### Lessons from well-studied systems

Three systems have shaped how the field thinks about CVs.

- **Alanine dipeptide.** The backbone dihedrals $\phi$ and $\psi$ describe its conformers so well that they became the default test case for enhanced sampling. Yet Peter Bolhuis, Christoph Dellago and David Chandler (2000) showed with committor tests that, in vacuum, configurations at the apparent transition state in $(\phi, \psi)$ are not committed to either side; a third backbone dihedral, $\theta$, is needed. In water, solvent coordinates enter as well.
- **Ion-pair dissociation.** For Na⁺ and Cl⁻ in water, the interionic distance looks like the obvious reaction coordinate. Phillip Geissler, Christoph Dellago and David Chandler (1999) found that configurations at the top of the distance profile have widely spread committors: whether the pair separates depends on the arrangement of the surrounding water, which has to reorganise to solvate the separated ions.
- **Crystal nucleation.** The size of the largest solid-like cluster is the standard CV, and its free-energy profile gives the critical nucleus size. Daniele Moroni, Pieter Rein ten Wolde and Peter Bolhuis (2005) showed that size alone is not a perfect reaction coordinate: compact, well-ordered clusters smaller than the critical size can be more likely to grow than larger but more disordered ones.

{{< note type="warn" title="Myth" >}}
**Myth:** a variable that cleanly separates the reactant and product basins is a good collective variable. **Reality:** separating the basins is necessary but not sufficient. The ion-pair distance separates contact and solvent-separated pairs perfectly, and still fails the committor test. What a reaction coordinate needs in addition is that configurations with the same value of the CV are at the same stage of the transition.
{{< /note >}}

## Practical choices

In practice, CVs are chosen from physical insight, tested, and refined. Start from the simplest coordinates that distinguish the states; check whether biased simulations along them actually produce transitions and whether the resulting free-energy surface converges; use two-dimensional surfaces when one CV is not enough; look at the transitions that occur for degrees of freedom that change but are not in the CV; and, where the transition is complex, use path CVs or data-driven CVs learned from simulations. The examples throughout the following chapters use one-dimensional CVs for clarity, but real applications often need two or more, and the cost of most methods grows quickly with the number of biased CVs.

{{< note type="practice" title="Back of the envelope" >}}
Suppose a free-energy surface needs a resolution of one twentieth of the range of each CV. One CV needs 20 bins to be filled, two need 400, three need 8,000 and four 160,000. If filling a bin takes about the same simulation time in each case, a converged 3D surface costs 400 times a 1D one. This is why most published metadynamics and umbrella-sampling studies use one or two biased CVs, and why methods that bias many CVs at once, such as bias-exchange metadynamics, bias each one separately in different replicas.
{{< /note >}}

### Diagnosing a poor collective variable

The committor test is decisive but expensive. Cheaper symptoms usually appear first:

- **Hysteresis.** A profile built by pulling forwards along $s$ differs from one built pulling backwards, or two umbrella windows started from different structures at the same $s$ give different averages.
- **Slow convergence.** A metadynamics or OPES profile keeps drifting long after the bias should have filled the basins, and transitions occur at irregular intervals instead of steadily.
- **Transitions at the wrong place.** In a biased run, the system crosses between states at values of $s$ far from the apparent barrier, or recrosses many times without committing.
- **Jumps in other variables.** Plotting a few candidate orthogonal variables (a side-chain dihedral, the number of water molecules in a pocket, the orientation of a ligand) against time shows slow, step-like changes that the bias does not control.

Each symptom points to the remedy: identify the slow variable that changes when the trouble occurs, and add it to the CV, either directly as a second dimension or through a path CV or a learned combination.

{{< note type="practice" title="From the lab" >}}
A typical workflow for a ligand unbinding study starts with a few hundred nanoseconds of unbiased MD to collect the fluctuations of 20 to 50 candidate descriptors: ligand–pocket distances, contact counts, the number of waters in the pocket, key side-chain dihedrals. Candidates that do not change between the bound state and partially unbound states seen in short exploratory runs are discarded. The remainder are reduced to one or two CVs, by physical judgement, by a path CV through a rough unbinding path, or by a learned method such as Deep-LDA or Deep-TICA from [the chapter on learned collective variables](../es-ml-cvs/). The final CV is validated by repeating the biased calculation from different starting structures and, when budget allows, by a committor test at the barrier.
{{< /note >}}

{{< note type="key" >}}
- A collective variable is a function of the coordinates that tracks a transition: distances, angles, dihedrals, coordination numbers, RMSD, path variables, Steinhardt order parameters and many more (PLUMED implements them for most MD codes).
- $F(s) = -k_BT\ln P(s)$ is a marginal free energy that includes the entropy of all other coordinates and Jacobian terms; its derivative is the mean force.
- A good CV distinguishes the states and captures the slow degrees of freedom; a poor one hides barriers in orthogonal coordinates.
- The committor test checks a reaction coordinate: configurations at the putative barrier top should have $p_B \approx \tfrac12$.
- Smooth definitions matter: switching functions make coordination numbers differentiable, and Steinhardt parameters fingerprint local crystal structure ($Q_6 = 0.575$ for fcc, 0.485 for hcp).
- Hysteresis, slow convergence and step-like jumps in unbiased variables are the everyday symptoms of a missing slow coordinate.
{{< /note >}}

{{< quiz >}}
- q: "The free energy as a function of the distance between two non-interacting particles in 3D…"
  options: ["is constant", "decreases as −2k_BT ln r, because larger distances have more volume", "increases with r"]
  answer: 1
  why: "The Jacobian of spherical coordinates contributes r², i.e. −2k_BT ln r in F."
- q: "Biasing along a CV produces no transitions even though the bias flattens F(s). What is the likely cause?"
  options: ["The temperature is too high", "A hidden barrier in a degree of freedom orthogonal to the CV", "The CV is too accurate"]
  answer: 1
  why: "The slow coordinate is missing from the CV."
- q: "In a committor test, configurations at the apparent barrier top have committors spread from 0 to 1. What does this mean?"
  options: ["The CV is a good reaction coordinate", "The CV does not capture the true transition state; configurations at the same s are at different stages of the reaction", "The simulation is too short"]
  answer: 1
  why: "A good reaction coordinate gives a committor histogram peaked at 1/2."
- q: "With n = 6 and m = 12, how much does a neighbour at exactly r = r₀ contribute to the coordination number?"
  options: ["0", "1/2", "1"]
  answer: 1
  why: "The limit of (1 − x⁶)/(1 − x¹²) = 1/(1 + x⁶) at x = 1 is 1/2."
- q: "A forward pulling profile along s and a backward one disagree by 8 kJ/mol at the barrier. What is the first suspect?"
  options: ["The temperature", "A slow degree of freedom not included in s", "The switching-function exponents"]
  answer: 1
  why: "Hysteresis means some other coordinate has not relaxed during the pull; it must be found and added to the CV."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. P. J. Steinhardt, D. R. Nelson and M. Ronchetti, "Bond-orientational order in liquids and glasses", *Physical Review B* **28**, 784–805 (1983).
2. D. Branduardi, F. L. Gervasio and M. Parrinello, "From A to B in free energy space", *Journal of Chemical Physics* **126**, 054103 (2007).
3. E. A. Carter, G. Ciccotti, J. T. Hynes and R. Kapral, "Constrained reaction coordinate dynamics for the simulation of rare events", *Chemical Physics Letters* **156**, 472–477 (1989).
4. P. G. Bolhuis, D. Chandler, C. Dellago and P. L. Geissler, "Transition path sampling: throwing ropes over rough mountain passes, in the dark", *Annual Review of Physical Chemistry* **53**, 291–318 (2002).
5. G. A. Tribello, M. Bonomi, D. Branduardi, C. Camilloni and G. Bussi, "PLUMED 2: new feathers for an old bird", *Computer Physics Communications* **185**, 604–613 (2014).
6. The PLUMED consortium, "Promoting transparency and reproducibility in enhanced molecular simulations", *Nature Methods* **16**, 670–673 (2019).
7. A. Laio and F. L. Gervasio, "Metadynamics: a method to simulate rare events and reconstruct the free energy in biophysics, chemistry and material science", *Reports on Progress in Physics* **71**, 126601 (2008).
8. M. E. Tuckerman, *Statistical Mechanics: Theory and Molecular Simulation*, 2nd ed., Oxford University Press (2023), chapter 8 (free-energy calculations).
9. P. R. ten Wolde, M. J. Ruiz-Montero and D. Frenkel, "Numerical evidence for bcc ordering at the surface of a critical fcc nucleus", *Physical Review Letters* **75**, 2714–2717 (1995).
10. W. Lechner and C. Dellago, "Accurate determination of crystal structures based on averaged local bond order parameters", *Journal of Chemical Physics* **129**, 114707 (2008).
11. P. G. Bolhuis, C. Dellago and D. Chandler, "Reaction coordinates of biomolecular isomerization", *Proceedings of the National Academy of Sciences USA* **97**, 5877–5882 (2000).
12. P. L. Geissler, C. Dellago and D. Chandler, "Kinetic pathways of ion pair dissociation in water", *Journal of Physical Chemistry B* **103**, 3706–3710 (1999).

</div>
