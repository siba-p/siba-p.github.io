---
title: "Learning a potential energy surface"
description: "The physics an MLIP has to respect before any architecture is chosen: the electronic-structure reference and its errors, energies, forces and stresses as targets, locality and the nearsightedness of electronic matter, translation, rotation, reflection and permutation symmetry, invariance versus equivariance, smoothness at the cutoff, and body order and completeness of descriptions."
hook: "A perfect machine-learned copy of PBE water would still freeze well above 0 °C, because PBE water does. Before choosing any architecture, you need to know what a potential learns and which symmetries it must never break."
objectives:
  - "Explain why a potential inherits the accuracy and the errors of its reference method"
  - "Derive forces and stresses from a learned energy and explain why they conserve energy"
  - "Justify the local atomic decomposition and recognise where locality fails"
  - "Distinguish invariant from equivariant outputs under rotation, reflection and permutation"
  - "Explain body order and why low-order descriptions of environments are incomplete"
cover: "cover.svg"
milestones:
  - year: 1964
    text: "Hohenberg and Kohn show the ground-state density fixes every ground-state property"
  - year: 1996
    text: "Kohn names the nearsightedness of electronic matter"
  - year: 2020
    text: "Pozdnyakov and colleagues find environments that three-body descriptors cannot separate"
track: found
weight: 2
level: Core
prereqs: ["history-of-interatomic-potentials", "gradients"]
lab: "Rotate a molecule and see why a model must respect symmetry; explore invariants of an angular expansion"
---

## The quantity being learned

A machine-learned interatomic potential is a regression model. Its input is a set of atoms, each with a chemical element $Z_i$ and a position $\mathbf r_i$, plus the periodic cell for a crystal. Its output is the potential energy $E$, and, by differentiation, the forces on every atom and the stress on the cell. It is trained on examples whose energies and forces were computed by an electronic-structure method, and its purpose is to reproduce that method at a cost lower by a factor of a thousand to a million.

The reference method fixes the best accuracy the model can ever reach. For materials it is almost always **density-functional theory** (DFT), founded on the Hohenberg–Kohn theorems (1964) and the Kohn–Sham equations (1965), with an approximate **exchange–correlation functional**. The generalised-gradient functional PBE (Perdew, Burke and Ernzerhof, 1996) is the most common choice in materials databases; it describes metals and many oxides reasonably, but overbinds or underbinds certain bonds, misses dispersion unless a correction such as D3 is added, and underestimates band gaps and reaction barriers. Meta-GGA functionals such as r²SCAN and hybrid functionals are more accurate and more expensive; for small molecules, coupled-cluster theory, CCSD(T), serves as the "gold standard". An MLIP trained on PBE reproduces PBE, including its errors: a perfect PBE potential for water predicts water that is overstructured and freezes well above 0 °C, because PBE water does. Choosing the reference is therefore the first modelling decision, and it should be made with the property of interest in mind.

{{< note type="practice" title="Back of the envelope" >}}
Keep three energy scales in mind. The thermal energy $k_BT$ is 25.9 meV at 300 K. "Chemical accuracy", 1 kcal/mol, is 43.4 meV. A well-trained single-system MLIP typically reaches energy errors of 1–5 meV/atom and force errors of 30–100 meV/Å against its own reference. The reference itself can be much further from experiment: PBE overestimates lattice constants of many solids by 1–2 %, and it typically underestimates reaction barriers by 0.1–0.3 eV. For most properties, therefore, the choice of functional sets the error budget and the fitting error is the smaller term; the exceptions are properties that depend on small energy differences, such as the ordering of competing polymorphs, where a few meV/atom of fitting error can already reorder the phases.
{{< /note >}}

The reference energies must also be **consistent**. Every structure in a training set must be computed with the same functional, pseudopotentials, plane-wave cutoff, smearing and convergence criteria, otherwise the model is asked to learn noise. Two large databases computed with different settings cannot simply be merged, a practical problem that the builders of universal potentials face constantly ([the chapter on universal potentials](../universal-potentials/)).

{{< note type="practice" title="From the lab" >}}
A typical reference protocol for a periodic solid fixes the plane-wave cutoff and the k-point density by converging *forces*, not only total energies, because a total energy can converge to 1 meV/atom while individual force components still change by 10–20 meV/Å. Spin polarisation, the treatment of semicore states in the pseudopotentials and the electronic smearing are fixed once for the whole data set. The energy of each isolated atom, computed with the same settings, is stored as the one-body reference $E_0(Z)$; most codes (MACE and NequIP among them) subtract $\sum_i E_0(Z_i)$ before training, so that the network learns only the binding energy, which is smaller and smoother. Data computed with a different functional or Hubbard $U$ are kept in a separate set, or used only after a correction is fitted between the two.
{{< /note >}}

## Energies, forces and stresses

An electronic-structure calculation on a structure of $N$ atoms yields one total energy, but also $3N$ force components, by the Hellmann–Feynman theorem, at almost no extra cost, and for a periodic cell the six independent components of the stress tensor. Forces are by far the richest source of information: a single 100-atom structure provides 300 force labels and one energy. They are local, each describing the slope of the energy surface at one atom, which matches the local structure of MLIPs. Training on forces is what makes modern potentials data-efficient. A modest training set of 1000 structures of 100 atoms each holds 1000 energies, 300,000 force components and, for periodic cells, 6000 independent stress components. The forces outnumber the energies by a factor of 300, and because each force describes the environment of one atom, they constrain the atomic energies far more directly than a total energy that mixes 100 of them.

{{< eq title="Forces and stress from the learned energy" say="Differentiate the energy with respect to each atom's position to get its force, and with respect to a strain of the cell to get the stress." >}}
$$ \textcolor{#f08c2e}{\mathbf F_i} = -\frac{\partial \textcolor{#d4a017}{E}}{\partial \mathbf r_i}, \qquad \textcolor{#e64980}{\sigma_{\alpha\beta}} = \frac{1}{V}\,\frac{\partial \textcolor{#d4a017}{E}}{\partial \varepsilon_{\alpha\beta}}\bigg|_{\varepsilon = 0} $$
- $\textcolor{#d4a017}{E}$: the model's total energy; $\varepsilon_{\alpha\beta}$: a homogeneous strain applied to the cell and all positions
- computing forces as the exact gradient of one energy guarantees $\nabla \times \mathbf F = 0$: the forces are **conservative** and energy is conserved in dynamics
{{< /eq >}}

Almost all MLIPs obtain forces by differentiating their energy with automatic differentiation, exactly as the tutorial in [the chapter on building an MLIP](../build-your-own-mlip/) does. Some recent models instead predict forces directly as an extra output, which is faster, but the predicted forces are then not the gradient of any energy: molecular dynamics with them does not conserve energy and can heat up or drift, and geometry optimisation can fail to converge. Studies of such **non-conservative** models have found that they can be useful for fast pre-screening but must be used with care in dynamics. The safe default remains: learn an energy, differentiate it.

{{< note type="warn" title="Myth" >}}
*The model with the lowest test-set force error is the best potential.* Test errors are measured on structures drawn from the same distribution as the training data, while a simulation visits configurations of its own choosing. Fu and colleagues (2023) benchmarked several MLIPs on molecular and condensed-phase systems and found that force error was a poor predictor of whether a molecular dynamics run stayed stable and reproduced observables such as radial distribution functions and diffusion coefficients; some models with low errors produced unphysical structures within nanoseconds. A potential is validated by running it: energy conservation in NVE dynamics, stable trajectories at the highest temperature of interest, and comparison of the target property with the reference method on independent structures.
{{< /note >}}

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

Locality fails for some physics, and knowing where is essential. **Electrostatics** between charged or polar species decays as $1/r$ and is not local; neither is the response of charge to a distant perturbation, as in charge transfer between separated parts of a battery interface. **Dispersion** decays as $r^{-6}$, slowly enough that its sum beyond 6 Å contributes noticeably to cohesive and surface energies. And message-passing networks, whose effective range extends over several cutoffs, blur the strict notion of locality. These limits motivate MLIPs with explicit long-range terms, discussed in [the chapter on neural-network potentials](../neural-network-potentials/). The fourth-generation neural-network potentials of Ko, Finkler, Goedecker and Behler (2021), for example, predict environment-dependent electronegativities, equilibrate atomic charges over the whole system and add the resulting Coulomb energy, which lets them describe charge transfer between distant parts of a structure that a strictly local model cannot see.

The cost of a larger cutoff is easy to estimate. The number of neighbours grows as $r_c^3$: copper has $n = 0.0847$ atoms per Å³, so a 5 Å sphere holds about 44 neighbours and a 6 Å sphere about 77. Raising the cutoff from 5 to 6 Å thus increases the cost of a descriptor or a message by 75 %, and the cost of an explicit sum over pairs of neighbours by a factor of three. In a message-passing network with two layers of 5 Å each, an atom's energy depends on everything within 10 Å, about 355 atoms in copper, even though each layer handles only its 44 nearest neighbours.

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

### What the symmetries guarantee

Exact symmetry also delivers conservation laws, which is a useful diagnostic in practice. If the energy does not change when every atom is moved by the same small vector $\mathbf t$, then $0 = E(\{\mathbf r_i + \mathbf t\}) - E(\{\mathbf r_i\}) = \sum_i \nabla_{\mathbf r_i}E \cdot \mathbf t = -\big(\sum_i \mathbf F_i\big)\cdot\mathbf t$ for every $\mathbf t$, so the forces sum to zero: Newton's third law holds for the whole system, and total momentum is conserved. The same argument with a small rotation $\delta\mathbf r_i = \boldsymbol\omega \times \mathbf r_i$ gives $\sum_i \mathbf r_i \times \mathbf F_i = 0$, so an isolated molecule feels no net torque and its angular momentum is conserved. A model built on relative positions and invariant descriptors satisfies both identities to machine precision. Checking them on a few random structures, together with a finite-difference comparison of $-\partial E/\partial \mathbf r_i$ against the predicted forces, is a five-minute test that catches most implementation errors in a new model or a new interface to a molecular dynamics code.

## Smoothness and the cutoff

A potential used for molecular dynamics must be a smooth function of the positions. If the energy jumps, energy is not conserved when an atom crosses the discontinuity; if the force jumps, the integrator's error grows. Both happen at the cutoff if neighbours simply stop counting when they cross $r_c$. MLIPs therefore multiply every neighbour's contribution by a **cutoff function** that goes smoothly to zero at $r_c$ together with at least its first derivative, such as Behler's $f_c(r) = \tfrac12[\cos(\pi r/r_c) + 1]$ for $r < r_c$, or a polynomial envelope. Descriptors and network activations must also be differentiable: a network built from ReLU units, whose derivative jumps at zero, gives forces with kinks, which is why smooth activations such as tanh, SiLU (also called swish) or softplus are used.

{{< note type="try" title="Pause and predict" >}}
A two-dimensional Lennard-Jones fluid of 64 atoms is simulated at constant energy with the potential simply truncated at $r_c = 2\sigma$, where it still has the value $-0.06\,\varepsilon$. Each time a pair crosses the cutoff the potential energy jumps by $0.06\,\varepsilon$ while the kinetic energy does not change. Pairs cross in both directions, so do you expect the jumps to cancel, or the total energy to wander?
{{< /note >}}

{{< fig src="cutoff.svg" alt="Left: the Lennard-Jones pair energy near the cutoff, truncated abruptly at two sigma and switched smoothly to zero between 1.5 and 2 sigma. Right: total energy against time in a constant-energy simulation, fluctuating by tens of thousandths of epsilon per atom with the hard cut and flat with the smooth switch" caption="Left: truncating a Lennard-Jones pair at $r_c = 2σ$ leaves a step of $0.06\,ε$; a cosine switch between $1.5σ$ and $2σ$ removes it. Right: velocity-Verlet dynamics of 64 atoms at density 0.7 and temperature 1.0 (reduced units, time step 0.004, 4000 steps). The hard cut makes the total energy jump and wander by up to $0.04\,ε$ per atom; with the switch it stays within $4×10^{-4}\,ε$ per atom." >}}

They cancel only on average. The truncated potential exerts no impulse at $r_c$, so the dynamics actually follows the force of the *shifted* potential $V(r) - V(r_c)$ and conserves that energy; the energy you measure with the truncated potential differs from it by $0.06\,\varepsilon$ times the number of pairs inside the cutoff. As that number fluctuates, so does the measured total energy. In the simulation shown in the figure it rises by 0.025 ε per atom within the first time unit, as the initial square lattice melts and some two dozen pairs leave the cutoff sphere, and then fluctuates with a standard deviation of $3.6\times10^{-3}\,\varepsilon$ per atom, with single-step jumps of up to $4.8\times10^{-3}\,\varepsilon$. With the smooth switch the energy is conserved to within $4\times10^{-4}\,\varepsilon$ per atom, the normal accuracy of velocity Verlet at this time step. Worse, the dynamics is no longer that of the potential you wrote down, so thermodynamic averages refer to an unknown mixture of the two. In an MLIP the same thing happens if any descriptor or message has a step at $r_c$, and it is one of the first things to rule out when a new potential fails to conserve energy in NVE dynamics.

## Body order and completeness

The classical way to organise an energy function is the **many-body expansion**, a sum of one-body (isolated atom) energies, two-body corrections for every pair, three-body corrections for every triple, and so on:

$$
E = \sum_i V_1(i) + \sum_{i<j} V_2(i, j) + \sum_{i<j<k} V_3(i, j, k) + \cdots
$$

A pair potential stops at $V_2$; Stillinger–Weber adds $V_3$. Each term is a function of the relative geometry of its atoms. The **body order** of a model is the highest number of atoms that appear together in one term. Many MLIP descriptors can be classified this way: radial symmetry functions are two-body, angular ones three-body, the SOAP power spectrum is three-body, and the bispectrum used by SNAP is four-body. The atomic cluster expansion makes body order an explicit, adjustable parameter, and MACE builds high body orders efficiently inside each message.

Body order matters because low-order descriptions are **incomplete**. Two different arrangements of neighbours can have identical lists of distances, and even identical lists of distances and angles; a model whose input is limited to these cannot tell them apart and must give them the same energy. Pozdnyakov and colleagues showed in 2020 that such degenerate pairs exist for three-body descriptors such as SOAP and that they cause real errors. Higher body orders, or equivariant message passing, remove these degeneracies.

The degeneracy is easiest to see in two dimensions. Place four neighbours on a circle around a central atom, at angles chosen from the eight directions $0°, 45°, \dots, 315°$: environment A uses $\{0°, 45°, 90°, 225°\}$ and environment B uses $\{0°, 45°, 135°, 180°\}$. No rotation or reflection turns one into the other: the gaps between neighbours going round the circle are 45°, 45°, 135°, 135° in A and 45°, 90°, 45°, 180° in B. Yet both contain exactly the same six angles between pairs of neighbours (45° twice, 90° once, 135° twice, 180° once), so every distance from the centre, every neighbour–neighbour distance and every bond angle is the same. Crystallographers call such sets **homometric**, because they give the same Patterson function and hence the same diffraction intensities. Any descriptor that depends only on pairs of neighbours, such as the power spectrum, gives them identical values, and only a three-neighbour (four-body) quantity such as the bispectrum separates them.

{{< fig src="homometric.svg" alt="Left: two arrangements of four neighbours on a circle around a central atom. Middle: their power spectra are identical bar for bar. Right: four bispectrum components, equal in magnitude but opposite in sign for the two environments" caption="Two environments that no rotation or reflection relates. Their circular-harmonic power spectra $|c_m|^2$ agree for every $m$, because both contain the same set of pair angles; the bispectrum $c_{m_1}c_{m_2}c^*_{m_1+m_2}$ takes values $+4$ and $-4$ and separates them." >}}

The figure below gives a two-dimensional picture of how invariants are built. The angular arrangement of neighbours around a central atom is described by a density $n(\theta)$, which is expanded in circular harmonics $e^{im\theta}$ (the two-dimensional analogue of spherical harmonics). Rotating the environment by an angle $\alpha$ multiplies each coefficient $c_m$ by $e^{-im\alpha}$: its phase turns $m$ times as fast as the environment, but its magnitude $|c_m|$ does not change. The magnitudes form the **power spectrum**, a rotation-invariant fingerprint of the environment, and the analogous construction in three dimensions with spherical harmonics is the SOAP descriptor. Invariants of higher order, such as products $c_{m_1}c_{m_2}c^*_{m_1+m_2}$ (the **bispectrum**), retain information about the relative phases that the power spectrum discards.

{{< widget name="harmonics" title="Rotation-invariant fingerprints from an angular expansion" caption="Left: neighbours (blue) around a central atom and the angular density rebuilt from the first six harmonics (teal). Right: each coefficient c_m as a dial (phase) and a bar (magnitude). Rotate the environment: every phase turns, by m times the angle, while every magnitude stays exactly the same." >}}

## A general recipe

With these requirements in place, every MLIP in the following chapters can be read as a variation on one recipe. Describe each atom's neighbourhood within a cutoff in a way that is smooth and respects symmetry, either with a fixed descriptor or with learned, equivariant features. Map that description to an atomic energy with a flexible regression model: a linear model, a kernel, a neural network. Sum the atomic energies. Differentiate the sum to obtain forces and stresses. Fit the parameters to reference energies and forces with a loss like the one above, and test on structures the model has not seen. {{< fig src="recipe.svg" alt="Flow diagram: a structure with one atom's cutoff sphere is described by a symmetric descriptor, a regression model maps it to an atomic energy, atomic energies are summed into the total energy, which is differentiated to give forces and stress; a fitting loss against DFT feeds back to the model parameters" caption="One recipe behind every model in the following chapters. Only the describe and regress steps differ between families; summation, differentiation and the loss against reference energies, forces and stresses are shared." >}}

The families differ in how they make each choice, and the next chapters cover them in turn: [descriptors](../symmetry-descriptors/), [kernel and linear models](../kernel-and-linear-potentials/), [neural-network potentials](../neural-network-potentials/), and [message-passing and equivariant networks](../message-passing-potentials/).

{{< note type="key" >}}
- An MLIP learns the energy of an electronic-structure reference, usually DFT, and inherits its errors; consistent reference settings are essential.
- Forces ($3N$ labels per structure) and stresses are the gradient of the learned energy; this keeps them conservative. Losses weight energy per atom, forces and stress.
- Locality, justified by the nearsightedness of electronic matter, makes the energy a sum of atomic terms within a cutoff of 5–6 Å; long-range electrostatics and dispersion need extra treatment.
- Energies must be invariant and forces equivariant under translation, rotation, reflection and permutation; symmetry is built in through invariant descriptors or equivariant architectures.
- Cutoff functions and smooth activations keep the energy smooth; body order measures how many atoms interact in one term, and low-order descriptions are incomplete.
- Translation and rotation invariance make the forces sum to zero and the net torque vanish; checking these identities and finite-difference forces catches most implementation errors.
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
- q: "A new model's predicted forces on an isolated molecule sum to 0.3 eV/Å. What does this tell you?"
  options: ["Nothing; forces need not sum to zero", "The model is not translation invariant, or its forces are not the gradient of its energy: an implementation error", "The reference DFT data were not converged"]
  answer: 1
  why: "Translation invariance of the energy implies that the forces sum to zero exactly."
- q: "Two environments contain exactly the same set of neighbour distances and bond angles but are not related by any rotation or reflection. Which descriptor can tell them apart?"
  options: ["The SOAP power spectrum", "A radial distribution of neighbour distances", "A four-body invariant such as the bispectrum"]
  answer: 2
  why: "Distances and angles are three-body information; the power spectrum carries the same information, so only higher body order separates such homometric environments."
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
8. X. Fu, Z. Wu, W. Wang, T. Xie, S. Keten, R. Gómez-Bombarelli and T. Jaakkola, "Forces are not enough: benchmark and critical evaluation for machine learning force fields with molecular simulations", *Transactions on Machine Learning Research* (2023).
9. T. W. Ko, J. A. Finkler, S. Goedecker and J. Behler, "A fourth-generation high-dimensional neural network potential with accurate electrostatics including non-local charge transfer", *Nature Communications* **12**, 398 (2021).
10. F. Bigi, M. Langer and M. Ceriotti, "The dark side of the forces: assessing non-conservative force models for atomistic machine learning", arXiv:2412.11569 (2024).

</div>
