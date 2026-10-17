---
title: "What a machine-learned potential must learn"
description: "The physics an MLIP has to respect before any architecture is chosen: the electronic-structure reference and its errors, energies, forces and stresses as targets, locality and the nearsightedness of electronic matter, translation, rotation, reflection and permutation symmetry, invariance versus equivariance, smoothness at the cutoff, and body order and completeness of descriptions."
track: found
weight: 2
level: Core
prereqs: ["history-of-interatomic-potentials", "gradients"]
lab: "Rotate a molecule and see why a model must respect symmetry; explore invariants of an angular expansion"
---

## The quantity being learned

A machine-learned interatomic potential is a regression model. Its input is a set of atoms, each with a chemical element $Z_i$ and a position $\mathbf r_i$, plus the periodic cell for a crystal. Its output is the potential energy $E$, and, by differentiation, the forces on every atom and the stress on the cell. It is trained on examples whose energies and forces were computed by an electronic-structure method, and its purpose is to reproduce that method at a cost lower by a factor of a thousand to a million.

The reference method fixes the best accuracy the model can ever reach. For materials it is almost always **density-functional theory** (DFT), founded on the Hohenberg–Kohn theorems (1964) and the Kohn–Sham equations (1965), with an approximate **exchange–correlation functional**. The generalised-gradient functional PBE (Perdew, Burke and Ernzerhof, 1996) is the most common choice in materials databases; it describes metals and many oxides reasonably, but overbinds or underbinds certain bonds, misses dispersion unless a correction such as D3 is added, and underestimates band gaps and reaction barriers. Meta-GGA functionals such as r²SCAN and hybrid functionals are more accurate and more expensive; for small molecules, coupled-cluster theory, CCSD(T), serves as the "gold standard". An MLIP trained on PBE reproduces PBE, including its errors: a perfect PBE potential for water predicts water that is overstructured and freezes well above 0 °C, because PBE water does. Choosing the reference is therefore the first modelling decision, and it should be made with the property of interest in mind.

The reference energies must also be **consistent**. Every structure in a training set must be computed with the same functional, pseudopotentials, plane-wave cutoff, smearing and convergence criteria, otherwise the model is asked to learn noise. Two large databases computed with different settings cannot simply be merged, a practical problem that the builders of universal potentials face constantly ([the topic on universal potentials](../universal-potentials/)).

## Energies, forces and stresses

An electronic-structure calculation on a structure of $N$ atoms yields one total energy, but also $3N$ force components, by the Hellmann–Feynman theorem, at almost no extra cost, and for a periodic cell the six independent components of the stress tensor. Forces are by far the richest source of information: a single 100-atom structure provides 300 force labels and one energy. They are local, each describing the slope of the energy surface at one atom, which matches the local structure of MLIPs. Training on forces is what makes modern potentials data-efficient.

{{< eq title="Forces and stress from the learned energy" say="Differentiate the energy with respect to each atom's position to get its force, and with respect to a strain of the cell to get the stress." >}}
$$ \textcolor{#f08c2e}{\mathbf F_i} = -\frac{\partial \textcolor{#d4a017}{E}}{\partial \mathbf r_i}, \qquad \textcolor{#e64980}{\sigma_{\alpha\beta}} = \frac{1}{V}\,\frac{\partial \textcolor{#d4a017}{E}}{\partial \varepsilon_{\alpha\beta}}\bigg|_{\varepsilon = 0} $$
- $\textcolor{#d4a017}{E}$: the model's total energy; $\varepsilon_{\alpha\beta}$: a homogeneous strain applied to the cell and all positions
- computing forces as the exact gradient of one energy guarantees $\nabla \times \mathbf F = 0$: the forces are **conservative** and energy is conserved in dynamics
{{< /eq >}}

Almost all MLIPs obtain forces by differentiating their energy with automatic differentiation, exactly as the tutorial in [the topic on building an MLIP](../build-your-own-mlip/) does. Some recent models instead predict forces directly as an extra output, which is faster, but the predicted forces are then not the gradient of any energy: molecular dynamics with them does not conserve energy and can heat up or drift, and geometry optimisation can fail to converge. Studies of such **non-conservative** models have found that they can be useful for fast pre-screening but must be used with care in dynamics. The safe default remains: learn an energy, differentiate it.

The training loss usually combines all three kinds of label, each weighted to balance their very different magnitudes and numbers:

{{< eq title="A typical MLIP loss" say="Penalise errors in energy per atom, in every force component, and in stress, with weights that put them on a common footing." >}}
$$ \mathcal L = \frac{1}{M}\sum_{s=1}^{M}\left[\textcolor{#d4a017}{w_E}\left(\frac{\hat E_s - E_s}{N_s}\right)^2 + \frac{\textcolor{#f08c2e}{w_F}}{3N_s}\sum_{i=1}^{N_s}\big|\hat{\mathbf F}_i - \mathbf F_i\big|^2 + \frac{\textcolor{#e64980}{w_\sigma}}{9}\sum_{\alpha\beta}\big(\hat\sigma_{\alpha\beta} - \sigma_{\alpha\beta}\big)^2\right] $$
- hats denote model predictions; $M$ structures, structure $s$ with $N_s$ atoms
- energies are compared per atom so that large cells do not dominate
{{< /eq >}}

## Locality and nearsightedness

Every practical MLIP makes the same structural assumption as the Behler–Parrinello network and the embedded-atom method before it: the total energy is a sum of contributions from each atom, and each contribution depends only on the neighbours within a cutoff radius $r_c$, typically 5 to 6 Å.

{{< eq title="The local atomic decomposition" say="Each atom contributes an energy determined by its own neighbourhood; far-away atoms do not matter." >}}
$$ E \approx \sum_{i=1}^{N} \varepsilon\big(Z_i;\; \{(Z_j, \mathbf r_j - \mathbf r_i) : |\mathbf r_j - \mathbf r_i| < r_c\}\big) $$
- makes the energy **extensive** (twice the system, twice the energy) and the cost **linear** in $N$
- atomic energies are not physical observables: only their sum is fitted, so they are defined only up to how the model chooses to split it
{{< /eq >}}

The justification is a property of quantum mechanics that Walter Kohn called the **nearsightedness of electronic matter** (1996): for fixed chemical potential, the local electronic properties at one point depend only weakly on perturbations far away, with an influence that decays exponentially in insulators and, more slowly, in metals at finite temperature. A change of position of an atom 10 Å away hardly changes the forces here. The cutoff is a compromise between capturing as much of this influence as possible and keeping the number of neighbours, and hence the cost and the amount of data needed, manageable: a 6 Å sphere in a dense solid contains around 80 atoms.

Locality fails for some physics, and knowing where is essential. **Electrostatics** between charged or polar species decays as $1/r$ and is not local; neither is the response of charge to a distant perturbation, as in charge transfer between separated parts of a battery interface. **Dispersion** decays as $r^{-6}$, slowly enough that its sum beyond 6 Å contributes noticeably to cohesive and surface energies. And message-passing networks, whose effective range extends over several cutoffs, blur the strict notion of locality. These limits motivate MLIPs with explicit long-range terms, discussed in [the topic on neural-network potentials](../neural-network-potentials/).

## Symmetry

The energy of an isolated set of atoms does not change if the whole set is translated, rotated or reflected, or if two atoms of the same element exchange labels. These are exact symmetries of the Schrödinger equation, and a potential that violates them makes unphysical predictions: a molecule that spins up spontaneously, a crystal whose energy depends on how it is oriented relative to the coordinate axes. Together they form the Euclidean group E(3) of translations, rotations and reflections, plus the permutation group.

{{< eq title="Invariance and equivariance" say="Energy does not care how you rotate the system; forces turn with it." >}}
$$ E(\{\mathbf R\,\mathbf r_i + \mathbf t\}) = E(\{\mathbf r_i\}), \qquad \mathbf F_i(\{\mathbf R\,\mathbf r_j + \mathbf t\}) = \mathbf R\,\mathbf F_i(\{\mathbf r_j\}), \qquad E(\{\mathbf r_{\pi(i)}\}) = E(\{\mathbf r_i\}) $$
- $\mathbf R$: any rotation or reflection matrix; $\mathbf t$: any translation; $\pi$: any exchange of identical atoms
- scalar outputs such as energy are **invariant**; vector and tensor outputs such as forces, dipoles and stress are **equivariant**
{{< /eq >}}

Translation invariance is the easy part: models use only relative positions $\mathbf r_j - \mathbf r_i$. Permutation invariance follows from summing over neighbours with a shared function. Rotation is the hard part, and there are three ways to handle it. **Invariant descriptors**, such as distances, angles, symmetry functions and SOAP, contain only rotation-invariant quantities, so anything built on them is invariant. **Equivariant architectures** carry vectors and higher tensors internally and combine them only in ways that respect rotations, producing invariant energies at the end. **Data augmentation** feeds the model many randomly rotated copies of each structure and hopes it learns the symmetry approximately. The first two give exact symmetry; the third gives approximate symmetry and is used by a few fast models.

The figure below shows what happens without symmetry. On the left, forces are computed from an energy that depends only on distances, so when the molecule is rotated, every force rotates with it. On the right, a model that takes raw Cartesian coordinates as input, fitted (to first order) on the molecule in its original orientation, is given the rotated molecule. Its forces do not follow, and its energy changes, although nothing physical has changed.

{{< widget name="equivar" title="Why symmetry must be built in" caption="Left: forces from an invariant energy rotate rigidly with the molecule. Right: a model fitted on raw coordinates in one orientation only. Rotate the molecule and watch its forces and energy go wrong; the readout gives the force error." >}}

A model that has seen only one orientation has no way to know that a rotated copy is the same structure. Learning that fact from data would require training examples in every orientation, for every environment: a waste of data and, inevitably, an approximation. Building the symmetry in makes the model exact in this respect and lets all its capacity go into learning the chemistry.

## Smoothness and the cutoff

A potential used for molecular dynamics must be a smooth function of the positions. If the energy jumps, energy is not conserved when an atom crosses the discontinuity; if the force jumps, the integrator's error grows. Both happen at the cutoff if neighbours simply stop counting when they cross $r_c$. MLIPs therefore multiply every neighbour's contribution by a **cutoff function** that goes smoothly to zero at $r_c$ together with at least its first derivative, such as Behler's $f_c(r) = \tfrac12[\cos(\pi r/r_c) + 1]$ for $r < r_c$, or a polynomial envelope. Descriptors and network activations must also be differentiable: a network built from ReLU units, whose derivative jumps at zero, gives forces with kinks, which is why smooth activations such as tanh, SiLU (also called swish) or softplus are used.

## Body order and completeness

The classical way to organise an energy function is the **many-body expansion**, a sum of one-body (isolated atom) energies, two-body corrections for every pair, three-body corrections for every triple, and so on:

$$
E = \sum_i V_1(i) + \sum_{i<j} V_2(i, j) + \sum_{i<j<k} V_3(i, j, k) + \cdots
$$

A pair potential stops at $V_2$; Stillinger–Weber adds $V_3$. Each term is a function of the relative geometry of its atoms. The **body order** of a model is the highest number of atoms that appear together in one term. Many MLIP descriptors can be classified this way: radial symmetry functions are two-body, angular ones three-body, the SOAP power spectrum is three-body, and the bispectrum used by SNAP is four-body. The atomic cluster expansion makes body order an explicit, adjustable parameter, and MACE builds high body orders efficiently inside each message.

Body order matters because low-order descriptions are **incomplete**. Two different arrangements of neighbours can have identical lists of distances, and even identical lists of distances and angles; a model whose input is limited to these cannot tell them apart and must give them the same energy. Pozdnyakov and colleagues showed in 2020 that such degenerate pairs exist for three-body descriptors such as SOAP and that they cause real errors. Higher body orders, or equivariant message passing, remove these degeneracies.

The figure below gives a two-dimensional picture of how invariants are built. The angular arrangement of neighbours around a central atom is described by a density $n(\theta)$, which is expanded in circular harmonics $e^{im\theta}$ (the two-dimensional analogue of spherical harmonics). Rotating the environment by an angle $\alpha$ multiplies each coefficient $c_m$ by $e^{-im\alpha}$: its phase turns $m$ times as fast as the environment, but its magnitude $|c_m|$ does not change. The magnitudes form the **power spectrum**, a rotation-invariant fingerprint of the environment, and the analogous construction in three dimensions with spherical harmonics is the SOAP descriptor. Invariants of higher order, such as products $c_{m_1}c_{m_2}c^*_{m_1+m_2}$ (the **bispectrum**), retain information about the relative phases that the power spectrum discards.

{{< widget name="harmonics" title="Rotation-invariant fingerprints from an angular expansion" caption="Left: neighbours (blue) around a central atom and the angular density rebuilt from the first six harmonics (teal). Right: each coefficient c_m as a dial (phase) and a bar (magnitude). Rotate the environment: every phase turns, by m times the angle, while every magnitude stays exactly the same." >}}

## A general recipe

With these requirements in place, every MLIP in the following topics can be read as a variation on one recipe. Describe each atom's neighbourhood within a cutoff in a way that is smooth and respects symmetry, either with a fixed descriptor or with learned, equivariant features. Map that description to an atomic energy with a flexible regression model: a linear model, a kernel, a neural network. Sum the atomic energies. Differentiate the sum to obtain forces and stresses. Fit the parameters to reference energies and forces with a loss like the one above, and test on structures the model has not seen. The families differ in how they make each choice, and the next topics cover them in turn: [descriptors](../symmetry-descriptors/), [kernel and linear models](../kernel-and-linear-potentials/), [neural-network potentials](../neural-network-potentials/), and [message-passing and equivariant networks](../message-passing-potentials/).

{{< note type="key" >}}
- An MLIP learns the energy of an electronic-structure reference, usually DFT, and inherits its errors; consistent reference settings are essential.
- Forces ($3N$ labels per structure) and stresses are the gradient of the learned energy; this keeps them conservative. Losses weight energy per atom, forces and stress.
- Locality, justified by the nearsightedness of electronic matter, makes the energy a sum of atomic terms within a cutoff of 5–6 Å; long-range electrostatics and dispersion need extra treatment.
- Energies must be invariant and forces equivariant under translation, rotation, reflection and permutation; symmetry is built in through invariant descriptors or equivariant architectures.
- Cutoff functions and smooth activations keep the energy smooth; body order measures how many atoms interact in one term, and low-order descriptions are incomplete.
{{< /note >}}

{{< quiz >}}
- q: "A potential perfectly reproduces PBE. It predicts water's melting point well above 0 °C. Why?"
  options: ["The potential is overfitted", "PBE itself gives overstructured water; the potential faithfully reproduces its reference", "Water cannot be simulated"]
  answer: 1
  why: "An MLIP's accuracy is bounded by its reference method."
- q: "Why are forces such valuable training data?"
  options: ["They are more accurate than energies", "Each structure gives 3N local force labels at almost no extra cost, compared with one energy", "They do not depend on the functional"]
  answer: 1
  why: "Forces multiply the information per calculation and match the local structure of the model."
- q: "A model predicts forces directly instead of differentiating an energy. What can go wrong in molecular dynamics?"
  options: ["Nothing", "The forces are not conservative, so energy is not conserved and the system can drift or heat up", "The simulation runs slower"]
  answer: 1
  why: "Only gradients of a scalar energy guarantee energy conservation."
- q: "Which property must an MLIP's predicted forces have under rotation of the input structure?"
  options: ["They stay unchanged", "They rotate in the same way as the structure (equivariance)", "They become zero"]
  answer: 1
  why: "Energy is invariant; its gradient, the force, is equivariant."
- q: "Why do MLIPs multiply neighbour contributions by a smooth cutoff function?"
  options: ["To speed up training", "So that energy and forces vary smoothly as atoms cross the cutoff, preserving energy conservation in MD", "To make the model equivariant"]
  answer: 1
  why: "An abrupt cutoff makes the energy discontinuous."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. P. Hohenberg and W. Kohn, "Inhomogeneous electron gas", *Physical Review* **136**, B864–B871 (1964); W. Kohn and L. J. Sham, "Self-consistent equations including exchange and correlation effects", *Physical Review* **140**, A1133–A1138 (1965).
2. J. P. Perdew, K. Burke and M. Ernzerhof, "Generalized gradient approximation made simple", *Physical Review Letters* **77**, 3865–3868 (1996).
3. W. Kohn, "Density functional and density matrix method scaling linearly with the number of atoms", *Physical Review Letters* **76**, 3168–3171 (1996); E. Prodan and W. Kohn, "Nearsightedness of electronic matter", *PNAS* **102**, 11635–11638 (2005).
4. O. H. Nielsen and R. M. Martin, "First-principles calculation of stress", *Physical Review Letters* **50**, 697–700 (1983).
5. S. N. Pozdnyakov, M. J. Willatt, A. P. Bartók, C. Ortner, G. Csányi and M. Ceriotti, "Incompleteness of atomic structure representations", *Physical Review Letters* **125**, 166001 (2020).
6. F. Musil, A. Grisafi, A. P. Bartók, C. Ortner, G. Csányi and M. Ceriotti, "Physics-inspired structural representations for molecules and materials", *Chemical Reviews* **121**, 9759–9815 (2021).
7. M. F. Langer, A. Goeßmann and M. Rupp, "Representations of molecules and materials for interpolation of quantum-mechanical simulations via machine learning", *npj Computational Materials* **8**, 41 (2022).
8. F. Bigi, M. Langer and M. Ceriotti, "The dark side of the forces: assessing non-conservative force models for atomistic machine learning", arXiv:2412.11569 (2024).

</div>
