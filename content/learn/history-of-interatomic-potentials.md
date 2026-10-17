---
title: "A history of interatomic potentials"
description: "How the problem of computing forces between atoms has been attacked for a century: pair potentials from Mie and Lennard-Jones, many-body potentials for metals and covalent solids, reactive force fields, ab initio molecular dynamics, and the arrival of machine learning, from the first neural-network surfaces of the 1990s through Behler–Parrinello, Gaussian approximation potentials, message passing, equivariant networks and universal models."
track: found
weight: 1
level: Foundation
prereqs: ["potential-energy-surfaces"]
lab: "A filterable timeline of interatomic potentials from 1924 to today"
---

## The problem every simulation must solve

Every atomistic simulation rests on one function: the potential energy $E(\mathbf r_1, \dots, \mathbf r_N)$ of a set of atoms as a function of their positions. Its negative gradient gives the forces, the forces give the motion, and the motion, sampled over time, gives every property a simulation can predict, from the melting point of a metal to the binding free energy of a drug. [The topic on potential energy surfaces](../potential-energy-surfaces/) explains where this function comes from: in the Born–Oppenheimer approximation, it is the ground-state energy of the electrons for fixed nuclei, a solution of the Schrödinger equation.

The difficulty is cost. Solving the electronic problem accurately, even with the approximations of density-functional theory (DFT), takes minutes to hours of computer time for a few hundred atoms, and the cost grows roughly as the cube of the number of electrons. A molecular dynamics simulation needs the forces millions of times. Since the 1920s, physicists and chemists have therefore tried to replace the quantum-mechanical calculation by a cheap formula that reproduces its results: an **interatomic potential**, also called a **force field**. The history of the field is a history of increasingly flexible formulas, each built to capture physics that its predecessors missed, culminating in machine-learned potentials that are flexible enough to learn the quantum-mechanical energy surface directly from data. Knowing this history explains why modern machine-learned interatomic potentials (MLIPs) look the way they do, because almost every design decision in them answers a lesson learned by an earlier generation.

The figure below is a timeline of the models discussed in this topic. Filter by family and click an entry to highlight it.

{{< widget name="mlipzoo" title="A century of interatomic potentials" caption="Each dot is a model, coloured by family; the list below gives its key idea and the original publication. The time axis is compressed before 2000. Filter to follow one line of development." >}}

## Pair potentials: Mie, Lennard-Jones and Morse

The earliest potentials described the energy as a sum over pairs of atoms, each pair contributing a function of its separation alone:

{{< eq title="The pair approximation" say="Every pair of atoms interacts as if the others were not there; the total energy is the sum over pairs." >}}
$$ E = \sum_{i<j} \textcolor{#4c6ef5}{V}(r_{ij}), \qquad r_{ij} = |\mathbf r_j - \mathbf r_i| $$
- simple, fast and physically transparent: one function per pair of elements
- exact for an ideal gas of point particles; an approximation for everything else
{{< /eq >}}

Gustav Mie proposed in 1903 that the force between molecules combines a short-range repulsion and a longer-range attraction, each an inverse power of distance. In 1924 John Lennard-Jones, then at Bristol, fitted such potentials to the measured equation of state and viscosity of gases, and the form with exponents 12 and 6 that carries his name became standard:

{{< eq title="The Lennard-Jones potential" say="A steep wall where electron clouds overlap, a gentle well from fluctuating dipoles." >}}
$$ V_{\text{LJ}}(r) = 4\textcolor{#d4a017}{\varepsilon}\left[\left(\frac{\textcolor{#845ef7}{\sigma}}{r}\right)^{12} - \left(\frac{\textcolor{#845ef7}{\sigma}}{r}\right)^{6}\right] $$
- $\textcolor{#d4a017}{\varepsilon}$: the depth of the well; $\textcolor{#845ef7}{\sigma}$: the distance at which $V = 0$; the minimum lies at $2^{1/6}\sigma$
- the $r^{-6}$ term has a physical basis, the London dispersion interaction (1930); the $r^{-12}$ term was chosen largely for convenience
{{< /eq >}}

The attractive term was justified a few years later by Fritz London's quantum-mechanical theory of dispersion forces, which showed that the correlated fluctuations of two atoms' electron clouds produce an attraction falling as $r^{-6}$. The repulsive exponent of 12 has no such basis; the true repulsion from overlapping electron clouds is closer to exponential, as in the Buckingham potential, but $r^{-12}$ is the square of $r^{-6}$ and was cheap to compute. For noble gases the Lennard-Jones potential is remarkably good, and it remains the model system of simulation, the "hydrogen atom" of liquid-state theory on which much of [statistical mechanics](../liquids-and-structure/) has been tested.

For chemical bonds, Philip Morse introduced in 1929 a potential, $V(r) = D[1 - e^{-a(r - r_0)}]^2$, whose quantum mechanics is exactly solvable and which, unlike a harmonic spring, allows a bond to dissociate. Pair potentials of these kinds, with harmonic terms for bonds and angles and Coulomb terms for partial charges, became the basis of the **classical biomolecular force fields** developed from the 1970s, such as AMBER, CHARMM, GROMOS and OPLS, which still dominate simulations of proteins and solutions.

Pair potentials, however, fail for most solids, and the failures are instructive. A pair potential predicts that the energy of a crystal varies linearly with the number of neighbours, so that removing an atom costs exactly as much energy as the bonds it had. For metals this is badly wrong: the measured energy to form a vacancy is only about a third of the cohesive energy per atom, whereas pair potentials make the two nearly equal. Pair potentials also force the **Cauchy relation** between elastic constants, $C_{12} = C_{44}$ for cubic crystals, which real metals violate (gold has $C_{12}$ about four times $C_{44}$). And they cannot explain why carbon, silicon and germanium prefer the open diamond structure with only four neighbours, when a pair potential always favours close packing. The lesson, repeated throughout this history, is that **the energy of a bond depends on its environment**. That requires many-body terms.

## Many-body potentials for metals and semiconductors

For metals, the decisive step was the **embedded atom method** (EAM) of Murray Daw and Michael Baskes at Sandia, published in 1983–1984 and inspired by density-functional ideas. Each atom is thought of as embedded in the electron density created by its neighbours, and its energy is a nonlinear function of that density:

{{< eq title="The embedded atom method" say="An atom's energy depends on how much electron density its neighbours supply, with diminishing returns." >}}
$$ E = \sum_i \textcolor{#f08c2e}{F}\Big(\underbrace{\textstyle\sum_{j\neq i} \textcolor{#12a594}{\rho}(r_{ij})}_{\bar\rho_i}\Big) + \frac12\sum_{i\neq j} \textcolor{#4c6ef5}{\phi}(r_{ij}) $$
- $\textcolor{#12a594}{\rho}(r)$: the density contributed by a neighbour at distance $r$; $\textcolor{#f08c2e}{F}$: the embedding energy, a concave function
- $\textcolor{#4c6ef5}{\phi}$: a pair repulsion between ion cores
{{< /eq >}}

Because $F$ is concave, roughly $-\sqrt{\bar\rho}$ in the related Finnis–Sinclair potential of 1984 (derived from the second-moment approximation of tight-binding theory), each additional neighbour adds less energy than the previous one. That single feature fixes the vacancy formation energy, breaks the Cauchy relation and gives realistic surface energies. EAM potentials are as cheap as pair potentials, and for forty years they have been the workhorse of simulations of metals and alloys, of dislocations, grain boundaries and radiation damage, with millions of atoms. Notice the form of the equation: **the total energy is a sum of atomic energies, each a function of a descriptor of the atom's local environment** (here the scalar $\bar\rho_i$). Twenty-four years later, the Behler–Parrinello network would generalise exactly this structure.

Covalent materials needed angles. Frank Stillinger and Thomas Weber added an explicit three-body term in 1985 that penalises bond angles deviating from the tetrahedral value, making diamond silicon stable. Jerry Tersoff took a different route in 1988 with a **bond-order potential**, inspired by Linus Pauling's idea that a bond weakens as an atom forms more of them: the attractive part of each pair interaction is multiplied by a bond order that decreases with the number and angles of competing neighbours. Donald Brenner's reactive empirical bond-order potential (REBO, 1990) extended this to hydrocarbons and became, with its successor AIREBO, the standard for carbon nanotubes and graphene. Michael Baskes's modified EAM (MEAM, 1992) added angular terms to the embedding density for directional bonding in metals and semiconductors.

The most ambitious classical potential is **ReaxFF**, introduced by Adri van Duin, William Goddard and colleagues in 2001. It computes bond orders continuously from distances, so bonds can form and break, combines them with valence-angle, torsion, van der Waals and Coulomb terms, and equilibrates atomic charges at every step. ReaxFF can simulate combustion, catalysis and corrosion, but at a price that foreshadows machine learning: dozens of functional terms and hundreds of parameters per chemical system, fitted by hand to quantum-mechanical data, with limited accuracy and transferability.

Each of these potentials encodes physical insight about a class of bonding in a functional form, and each is accurate only for the situations its form anticipates. Fitting a potential for a new material, or making an existing one more accurate, meant inventing new functional terms, a task that took experts years and often ended in compromises between properties.

## Ab initio molecular dynamics

A different solution to the problem was to stop approximating the energy at all. In 1985 Roberto Car and Michele Parrinello showed how to run molecular dynamics with forces computed from density-functional theory on the fly, by treating the electronic wavefunctions as extra dynamical variables that follow the nuclei adiabatically. **Ab initio molecular dynamics** (AIMD), in the Car–Parrinello form or the Born–Oppenheimer form in which the electronic problem is solved to convergence at every step, made it possible to simulate liquid water, chemical reactions and materials under extreme conditions without any empirical fitting, with the accuracy and transferability of DFT.

Its cost confines it to a few hundred atoms and tens of picoseconds even on large supercomputers. Many important phenomena, such as nucleation, diffusion in solids, the dynamics of interfaces and anything involving thousands of atoms or nanoseconds, are out of reach. By the 2000s the field faced a clear gap: classical potentials were fast but inaccurate and hard to build, ab initio dynamics was accurate but slow. Machine learning was proposed to close it, by learning a potential that reproduces DFT energies and forces at a cost close to that of a classical potential.

## The first neural-network potentials

The idea of fitting a potential energy surface with a neural network appeared in the mid-1990s. In 1995 Thomas Blank, Steven Brown, August Calhoun and Douglas Doren fitted a network to the energy of CO on a nickel surface, and over the following decade several groups used networks for low-dimensional surfaces of small molecules and of molecules interacting with surfaces. These early networks took a fixed list of coordinates as input. That made them useful for a single small system, but they could not describe a different number of atoms, they had to learn rotational and permutational symmetry from data, and they could not be applied to condensed phases.

## Behler–Parrinello: the atomic decomposition

The breakthrough came in 2007, when Jörg Behler and Michele Parrinello published a neural-network potential for bulk silicon that could describe systems of any size. Their construction rests on three ideas that are still at the heart of almost every MLIP:

{{< eq title="The Behler–Parrinello high-dimensional neural network potential" say="Split the energy into atomic contributions, describe each atom's surroundings by numbers that respect symmetry, and let one network per element map those numbers to the atom's energy." >}}
$$ E = \sum_{i=1}^{N} \textcolor{#f08c2e}{E_i}, \qquad \textcolor{#f08c2e}{E_i} = \textcolor{#845ef7}{\mathrm{NN}}_{Z_i}\big(\textcolor{#12a594}{\mathbf G_i}\big), \qquad \textcolor{#12a594}{\mathbf G_i} = \textcolor{#12a594}{\mathbf G}\big(\{\mathbf r_j - \mathbf r_i : r_{ij} < r_c\}\big) $$
- **locality**: each atomic energy depends only on neighbours within a cutoff $r_c$ (typically 5–6 Å)
- **symmetry**: the descriptor $\textcolor{#12a594}{\mathbf G_i}$ is invariant to translation, rotation and permutation of like atoms
- **weight sharing**: one network $\textcolor{#845ef7}{\mathrm{NN}}_{Z}$ per chemical element, applied to every atom of that element
{{< /eq >}}

The atomic decomposition makes the energy extensive and the model applicable to any number of atoms. Locality makes the cost grow linearly with system size. The symmetry functions, radial and angular functions summed over neighbours and refined in Behler's 2011 paper, guarantee the physical symmetries exactly, so the network does not have to learn them. Forces follow by differentiating the total energy, so they are consistent with it and energy is conserved in dynamics. The structure is that of EAM, with the single scalar density replaced by a vector of dozens of environment descriptors and the hand-chosen embedding function replaced by a flexible neural network. [The topic on neural-network potentials](../neural-network-potentials/) develops it in detail, and the figure there shows the architecture in action.

## Kernel methods and systematic descriptors

In 2010 Albert Bartók, Mike Payne, Risi Kondor and Gábor Csányi at Cambridge introduced **Gaussian approximation potentials** (GAP), which keep the atomic decomposition but replace the neural network by Gaussian-process regression ([the topic on Gaussian processes](../uncertainty-gaussian-processes/)). The atomic energy is a weighted sum of kernel functions that measure the similarity between the atom's environment and environments in the training set. The approach brings a principled uncertainty estimate, and with the **smooth overlap of atomic positions** (SOAP) descriptor of 2013 it gave a mathematically clean way of comparing environments: smear the neighbours into a density, expand it in radial functions and spherical harmonics, and form rotation-invariant combinations of the coefficients. GAP potentials for silicon, carbon, tungsten and many other materials, some built from thousands of carefully chosen structures, established that machine-learned potentials could match DFT across a wide range of configurations, including defects, surfaces and liquids.

Linear models followed: the **spectral neighbour analysis potential** (SNAP, Aidan Thompson and colleagues at Sandia, 2015), linear in bispectrum components and fast enough for very large LAMMPS simulations, and Alexander Shapeev's **moment tensor potentials** (MTP, 2016), systematically improvable and paired with active learning. In 2019 Ralf Drautz unified these approaches with the **atomic cluster expansion** (ACE), a complete basis for atomic environments built from products of one-particle functions, of which symmetry functions, SOAP, SNAP and MTP are special or truncated cases. The development is told in [the topics on descriptors](../symmetry-descriptors/) and [kernel and linear potentials](../kernel-and-linear-potentials/).

## Learned representations: message passing

Hand-designed descriptors have a fixed resolution and a fixed cutoff. An alternative, inspired by deep learning's success at learning features from raw images, is to let the network learn the representation from the atomic positions themselves. **Message-passing neural networks**, formalised for chemistry by Justin Gilmer and colleagues at Google in 2017, treat a structure as a graph whose nodes are atoms and whose edges connect atoms within a cutoff. Each atom carries a feature vector that is updated repeatedly by aggregating "messages" from its neighbours, which depend on the neighbours' features and the interatomic distances. Kristof Schütt and colleagues' **SchNet** (2017) made the messages continuous functions of distance through learned filters and trained the whole model end to end on energies and forces. Oliver Unke and Markus Meuwly's PhysNet (2019) added explicit electrostatics, and Johannes Gasteiger, Janek Groß and Stephan Günnemann's DimeNet (2020) passed messages along bonds using angles.

Message passing changes two things. The representation is learned for the task rather than fixed in advance. And information travels one cutoff per layer, so after $T$ layers an atom's energy depends on atoms up to $T$ cutoffs away. That enlarges the effective range, but it complicates parallel simulation of large systems, a trade-off discussed in [the topic on message-passing potentials](../message-passing-potentials/).

## Equivariance and the data-efficiency revolution

Invariant models, whose internal features are all rotation-invariant scalars, throw away directional information early and must recover it through many layers or many-body descriptors. **Equivariant** networks instead carry vectors and higher-order tensors through the network, transforming them correctly under rotations, and combine them with the tensor-product rules of angular momentum. Tensor field networks (Nathaniel Thomas and colleagues, 2018) and Cormorant (2019) introduced the idea; PaiNN (2021) added vector features efficiently; and **NequIP**, from Simon Batzner, Boris Kozinsky and colleagues at Harvard (published 2022), showed that an E(3)-equivariant message-passing potential could reach state-of-the-art accuracy with strikingly little data, sometimes a few hundred structures where invariant networks needed tens of thousands. **Allegro** (2023) made the equivariant approach strictly local, so it scales to hundreds of millions of atoms on many GPUs. **MACE**, by Ilyes Batatia, Dávid Péter Kovács, Gregor Simm, Christoph Ortner and Gábor Csányi (2022), combined equivariant message passing with ACE-style many-body messages, so that two layers suffice, giving a fast and accurate architecture that underlies several of today's foundation models.

## Universal potentials

Until about 2021, every MLIP was trained for one chemical system: silicon, water, a particular alloy. The large databases of DFT calculations assembled by high-throughput projects, above all the Materials Project, made a new goal conceivable: a single potential covering most of the periodic table. Chi Chen and Shyue Ping Ong's **M3GNet** (2022), trained on relaxation trajectories from the Materials Project, was among the first such **universal potentials**; it was followed by CHGNet (2023), by the graph networks behind Google DeepMind's GNoME project, which proposed hundreds of thousands of new stable crystals (2023), by MACE-MP-0 (2023), MatterSim, SevenNet, ORB and the EquiformerV2 models trained on the 110-million-calculation OMat24 data set (2024), among others. These models can relax structures, screen materials and run stable molecular dynamics for systems they were never specifically trained on, and they can be fine-tuned with a small amount of system-specific data for higher accuracy. Benchmarks such as Matbench Discovery compare them on the task of predicting crystal stability. Their strengths, limits and use are the subject of [the topic on universal potentials](../universal-potentials/).

## What the history teaches

Looking back, each generation added flexibility while keeping the lessons of the previous one. From pair potentials came the need for environment dependence; from EAM, the atomic energy as a function of a local descriptor; from bond-order potentials and Stillinger–Weber, the importance of angles; from ReaxFF, the cost of building flexibility by hand; from AIMD, the target accuracy; from Behler and Parrinello, the combination of locality, symmetry and learning that every modern MLIP inherits; from GAP and ACE, systematic and complete descriptions of environments and the value of uncertainty; from message passing and equivariance, learned representations and data efficiency; and from universal models, the power of very large data sets. The principles that recur throughout, and that the rest of this subject develops, are three: **physical symmetries must be built in exactly, locality makes potentials scalable, and forces must be the exact gradient of an energy**.

{{< note type="key" >}}
- An interatomic potential replaces the quantum-mechanical energy $E(\{\mathbf r\})$ by a cheap function; forces are its negative gradient.
- Pair potentials (Lennard-Jones 1924, Morse 1929) fail for solids because bond energies depend on the environment: vacancy energies, Cauchy relations and open structures expose this.
- Many-body potentials added environment dependence: EAM (1983) for metals, Stillinger–Weber (1985) and Tersoff (1988) for covalent solids, ReaxFF (2001) for reactions; ab initio MD (1985) offered accuracy at high cost.
- Behler–Parrinello (2007) introduced the atomic decomposition with symmetric local descriptors and neural networks; GAP (2010), SOAP (2013), SNAP, MTP and ACE (2019) gave kernel and linear alternatives and complete descriptors.
- Message passing (SchNet 2017) learned representations; equivariant networks (NequIP, Allegro, MACE) brought data efficiency; universal potentials (M3GNet, CHGNet, MACE-MP-0, and others) cover most of the periodic table.
{{< /note >}}

{{< quiz >}}
- q: "Why do pair potentials predict a vacancy formation energy close to the cohesive energy in metals, contrary to experiment?"
  options: ["They ignore temperature", "Each bond contributes a fixed energy regardless of environment, so removing an atom costs all its bonds; real metallic bonds strengthen when neighbours are removed", "They use the wrong units"]
  answer: 1
  why: "Environment-dependent bonding, captured by EAM's concave embedding function, is needed."
- q: "Which structural idea do EAM and the Behler–Parrinello network share?"
  options: ["Both use quantum mechanics at every step", "Both write the energy as a sum of atomic energies, each a function of a descriptor of the local environment", "Both are pair potentials"]
  answer: 1
  why: "Behler–Parrinello generalised the scalar embedding density to a vector of symmetry functions and the embedding function to a neural network."
- q: "What limited the neural-network potentials of the 1990s?"
  options: ["Computers could not train networks", "They took a fixed set of coordinates as input, so they could not handle different numbers of atoms or exploit symmetry", "They were too accurate"]
  answer: 1
  why: "The atomic decomposition with symmetric descriptors solved both problems."
- q: "What is the main practical advantage reported for equivariant networks such as NequIP?"
  options: ["They need no training data", "They reach high accuracy with much less training data", "They are always faster than classical potentials"]
  answer: 1
  why: "Built-in directional information makes learning far more data-efficient."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. G. Mie, "Zur kinetischen Theorie der einatomigen Körper", *Annalen der Physik* **11**, 657–697 (1903).
2. J. E. Lennard-Jones, "On the determination of molecular fields. II. From the equation of state of a gas", *Proceedings of the Royal Society A* **106**, 463–477 (1924).
3. P. M. Morse, "Diatomic molecules according to the wave mechanics. II. Vibrational levels", *Physical Review* **34**, 57–64 (1929).
4. M. S. Daw and M. I. Baskes, "Embedded-atom method: derivation and application to impurities, surfaces, and other defects in metals", *Physical Review B* **29**, 6443–6453 (1984).
5. M. W. Finnis and J. E. Sinclair, "A simple empirical N-body potential for transition metals", *Philosophical Magazine A* **50**, 45–55 (1984).
6. F. H. Stillinger and T. A. Weber, "Computer simulation of local order in condensed phases of silicon", *Physical Review B* **31**, 5262–5271 (1985).
7. J. Tersoff, "New empirical approach for the structure and energy of covalent systems", *Physical Review B* **37**, 6991–7000 (1988).
8. A. C. T. van Duin, S. Dasgupta, F. Lorant and W. A. Goddard III, "ReaxFF: a reactive force field for hydrocarbons", *Journal of Physical Chemistry A* **105**, 9396–9409 (2001).
9. R. Car and M. Parrinello, "Unified approach for molecular dynamics and density-functional theory", *Physical Review Letters* **55**, 2471–2474 (1985).
10. T. B. Blank, S. D. Brown, A. W. Calhoun and D. J. Doren, "Neural network models of potential energy surfaces", *Journal of Chemical Physics* **103**, 4129–4137 (1995).
11. J. Behler and M. Parrinello, "Generalized neural-network representation of high-dimensional potential-energy surfaces", *Physical Review Letters* **98**, 146401 (2007).
12. A. P. Bartók, M. C. Payne, R. Kondor and G. Csányi, "Gaussian approximation potentials: the accuracy of quantum mechanics, without the electrons", *Physical Review Letters* **104**, 136403 (2010).
13. R. Drautz, "Atomic cluster expansion for accurate and transferable interatomic potentials", *Physical Review B* **99**, 014104 (2019).
14. J. Gilmer, S. S. Schoenholz, P. F. Riley, O. Vinyals and G. E. Dahl, "Neural message passing for quantum chemistry", *Proceedings of the 34th International Conference on Machine Learning*, 1263–1272 (2017).
15. S. Batzner et al., "E(3)-equivariant graph neural networks for data-efficient and accurate interatomic potentials", *Nature Communications* **13**, 2453 (2022).
16. J. Behler, "Four generations of high-dimensional neural network potentials", *Chemical Reviews* **121**, 10037–10072 (2021).
17. V. L. Deringer, M. A. Caro and G. Csányi, "Machine learning interatomic potentials as emerging tools for materials science", *Advanced Materials* **31**, 1902765 (2019).
18. O. T. Unke et al., "Machine learning force fields", *Chemical Reviews* **121**, 10142–10186 (2021).

</div>
