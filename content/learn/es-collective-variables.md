---
title: "Collective variables"
description: "The coordinates in which rare events are described: what a collective variable is, common choices (distances, angles, coordination numbers, dihedrals, RMSD, path variables, Steinhardt order parameters), the free-energy surface as a marginal probability, Jacobian terms, the mean force and the blue-moon ensemble, what makes a collective variable good, the committor test, and how PLUMED implements them."
track: rl-land
weight: 3
level: Core
prereqs: ["es-rates", "ensembles-and-free-energy"]
lab: "Rotate a collective variable across a two-state landscape and watch the barrier appear and vanish"
---

## Describing a transition with a few numbers

A transition in a system of thousands of atoms involves, in principle, all $3N$ coordinates. Yet chemists describe a reaction by a bond that forms and another that breaks, a biophysicist describes folding by how many native contacts have formed, and a materials scientist describes crystallisation by the size of the largest crystalline cluster. Each of these is a **collective variable** (CV): a function $\xi(\mathbf x)$ of the atomic coordinates, chosen to capture the progress of the process while ignoring the irrelevant details.

Collective variables are the language of almost every enhanced-sampling method. Free energies are computed as functions of them; biases are applied along them; and the quality of the result depends on how well they describe the transition. Choosing them is the most important, and often the most difficult, decision in a rare-event study.

## A catalogue of collective variables

The simplest CVs are geometric. A **distance** between two atoms or centres of mass describes binding, dissociation and bond breaking; an **angle** or **dihedral** describes conformational change, as the backbone dihedrals $\phi$ and $\psi$ do for the classic test system alanine dipeptide. A **coordination number** counts how many atoms of one group are within a cutoff of another, made smooth and differentiable with a switching function,

$$
s = \sum_{i \in A}\sum_{j \in B} \frac{1 - (r_{ij}/r_0)^n}{1 - (r_{ij}/r_0)^m},
$$

and describes solvation, adsorption and the number of bonds an atom has. The **root-mean-square deviation** (RMSD) from a reference structure measures how far a molecule is from, say, its folded state.

For more complex transitions, CVs are built from many atoms. **Path collective variables** (Davide Branduardi, Francesco Gervasio and Michele Parrinello, 2007) describe progress along a reference path of frames, $s$, and distance from that path, $z$. **Steinhardt bond-order parameters** (Paul Steinhardt, David Nelson and Marco Ronchetti, 1983), built from spherical harmonics of the bond directions around each atom, distinguish liquid-like from crystal-like environments and different crystal structures; averaged or counted over atoms, they track nucleation and growth. **Coordination-based order parameters**, the number of hydrogen bonds, the electric dipole of a region, the volume of a cavity, and many others are in use. The PLUMED library, a plugin that adds CVs and enhanced-sampling methods to most major MD codes (GROMACS, LAMMPS, AMBER, CP2K, OpenMM and others), implements hundreds of them.

## The free-energy surface

Once a CV is chosen, the free-energy surface along it is defined from the probability distribution of the CV in equilibrium, as introduced in [the chapter on ensembles](../ensembles-and-free-energy/):

{{< eq title="The free-energy surface along a collective variable" say="Integrate the Boltzmann weight over every configuration that has a given value of the collective variable; minus k_BT times its logarithm is the free energy there." >}}
$$ \textcolor{#f08c2e}{F}(s) = -k_BT \ln \textcolor{#4c6ef5}{P}(s) + C, \qquad \textcolor{#4c6ef5}{P}(s) = \frac{1}{Z}\int \delta\big(\textcolor{#12a594}{\xi}(\mathbf x) - s\big)\, e^{-\beta U(\mathbf x)}\,\mathrm d\mathbf x $$
- $\textcolor{#12a594}{\xi}(\mathbf x)$: the collective variable; $s$: one of its values
- the integral runs over all other coordinates, so $F(s)$ includes their entropy
{{< /eq >}}

Because $F(s)$ is a marginal of the full distribution, it depends on the choice of CV in a way the energy does not. Two consequences are worth knowing. First, a coordinate transformation contributes a **Jacobian** term: the free energy as a function of the distance $r$ between two particles includes $-2k_BT\ln r$, because the volume of the shell at distance $r$ grows as $r^2$; even two non-interacting particles have a free energy that decreases with distance. Comparing free energies along different CVs, or converting a distance profile into a binding free energy, requires accounting for such terms. Second, free-energy differences between states are independent of the CV only when the states are defined by regions that do not depend on it; barrier heights depend on the CV and are physically meaningful only for good CVs.

The derivative of the free energy is the **mean force**, the average force along the CV with all other coordinates in equilibrium. For a CV that is a combination of Cartesian coordinates it is simply the average of $-\partial U/\partial \xi$ at fixed $\xi$; in general, as Emily Carter, Giovanni Ciccotti, James Hynes and Raymond Kapral showed in 1989 for simulations with the CV held fixed by a constraint (the **blue-moon ensemble**), it contains geometric correction terms. Integrating the mean force along the CV gives $F(s)$: this is **thermodynamic integration** along a CV, and it is also the principle behind the adaptive biasing force method of [the chapter on adaptive biasing](../es-metadynamics/).

## What makes a collective variable good

A good CV must at least distinguish the states of interest: its values in the reactant, the product and the transition region must be different. But that is not enough. A good CV should also capture the **slow** degrees of freedom of the transition, so that once the CV is fixed, everything else relaxes quickly. If an important slow coordinate is left out, the free-energy surface along the CV will look smooth while the real barrier hides in the coordinate that was ignored, and biasing along the CV will fail to accelerate the transition, a problem known as **hidden barriers** or **orthogonal degrees of freedom**.

The figure shows this in two dimensions. Two states, A and B, are separated by a barrier along a diagonal direction. The collective variable $s$ is a projection onto a direction you choose. When $s$ points along the true reaction direction, the free-energy profile shows the barrier clearly and the two states project onto separate regions of $s$. Rotate $s$ away and the barrier shrinks and disappears, while the projections of A and B overlap until they become indistinguishable: a free-energy profile along that CV would suggest there is no barrier at all, although nothing about the system has changed.

{{< widget name="cvchoice" title="A collective variable can hide a barrier" caption="Left: the landscape with states A and B and the direction of the collective variable s (violet; thin lines are contours of constant s). Right, top: the free energy F(s). Right, bottom: how states A (blue) and B (teal) project onto s. Rotate s and watch the barrier and the separation of the states change." >}}

The rigorous test of a reaction coordinate uses the **committor** $p_B$ introduced in [the chapter on rates](../es-rates/). If $s$ is a good reaction coordinate, then all configurations with the value $s^\ddagger$ at the top of the barrier should have $p_B \approx \tfrac12$. The **committor test** (Peter Bolhuis, Christoph Dellago, Phillip Geissler and David Chandler, around 1999–2000) samples configurations at fixed $s^\ddagger$, shoots many trajectories from each, and histograms the resulting committor values: a histogram peaked at $\tfrac12$ means a good coordinate, a flat or bimodal one means that $s$ misses something important. The test is expensive but decisive, and it motivates the machine-learning methods of [the chapter on learned collective variables](../es-ml-cvs/) that approximate the committor or the slowest dynamical modes directly.

## Practical choices

In practice, CVs are chosen from physical insight, tested, and refined. Start from the simplest coordinates that distinguish the states; check whether biased simulations along them actually produce transitions and whether the resulting free-energy surface converges; use two-dimensional surfaces when one CV is not enough; look at the transitions that occur for degrees of freedom that change but are not in the CV; and, where the transition is complex, use path CVs or data-driven CVs learned from simulations. The examples throughout the following chapters use one-dimensional CVs for clarity, but real applications often need two or more, and the cost of most methods grows quickly with the number of biased CVs.

{{< note type="key" >}}
- A collective variable is a function of the coordinates that tracks a transition: distances, angles, dihedrals, coordination numbers, RMSD, path variables, Steinhardt order parameters and many more (PLUMED implements them for most MD codes).
- $F(s) = -k_BT\ln P(s)$ is a marginal free energy that includes the entropy of all other coordinates and Jacobian terms; its derivative is the mean force.
- A good CV distinguishes the states and captures the slow degrees of freedom; a poor one hides barriers in orthogonal coordinates.
- The committor test checks a reaction coordinate: configurations at the putative barrier top should have $p_B \approx \tfrac12$.
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

</div>
