---
title: "Symmetry and atomic descriptors"
description: "Why a model of atoms must respect translation, rotation, reflection and permutation; invariance against equivariance; locality; and the descriptors (Coulomb matrices, symmetry functions, SOAP, ACE) that build these symmetries in."
hook: "The 64 atoms of a small silicon cell can be listed in more than 10⁸⁹ orders and turned in infinitely many ways, all with the same energy. A good descriptor gives one answer for every one of them."
objectives:
  - "Explain why raw Cartesian coordinates are a poor input for learning energies"
  - "Distinguish invariance from equivariance and show why forces from an invariant energy rotate correctly"
  - "Compute radial and angular symmetry functions and verify their invariance numerically"
  - "Explain why angular information is needed to separate environments with identical distances"
  - "Compare symmetry functions, SOAP and ACE by cost, length and completeness"
track: found
weight: 3
level: Core
minutes: 45
lab: "Rotate, renumber and mirror a cluster"
prereqs: ["neural-networks", "potential-energy-surfaces"]
---

## The input problem

A neural network takes a vector of numbers. A configuration of atoms is a list of positions $\mathbf r_i$ and element types $Z_i$. The obvious encoding, concatenating the Cartesian coordinates $(x_1, y_1, z_1, x_2, \dots)$, is a bad one, for a reason that has nothing to do with machine learning: the energy of a molecule does not change when you move it, turn it round or relabel its atoms, but the coordinate vector changes completely. A model fed raw coordinates would have to learn, from data, that millions of different input vectors describe the same physical object. With finite data it never quite does.

"Millions" is an understatement. Translations and rotations are continuous, so a single configuration already has infinitely many coordinate vectors before anyone relabels an atom. Permutations then multiply that by a finite but enormous factor: $N$ identical atoms can be listed in $N!$ orders. A 64-atom silicon supercell, small by the standards of a training set, can be written down in $64! \approx 1.3\times10^{89}$ orders, every one a different input vector with the same energy. No data set can show a model even a vanishing fraction of them. The symmetry has to be built in.

{{< note type="fun" >}}
The number of ways to list the atoms of that 64-atom cell is about a billion times larger than the usual estimate of the number of atoms in the observable universe, around $10^{80}$. A permutation-invariant descriptor collapses all of them to a single point.
{{< /note >}}

{{< widget name="symmetry" title="Which descriptions survive a symmetry operation?" caption="Each row shows a descriptor of the same six-atom cluster. Rotate, translate, renumber or mirror it: the physics is unchanged, and so are the distance-based descriptors, but the raw coordinates are not. Drag an atom to change the structure itself, and every descriptor responds." >}}

{{< note type="try" >}}
Rotate the cluster, slide it along $x$, renumber atoms 1 and 4 and press *Mirror image*, in any order you like: only the raw-coordinate row ever reports a change. Then press *Reset* and drag one atom by a fraction of an ångström. Now every row changes, and the fingerprint bars move smoothly with the atom. That combination is what a regression model needs: blind to relabelling and orientation, sensitive to every real change of structure.
{{< /note >}}

## The symmetries of physics

For an isolated system of atoms, the potential energy $E(\mathbf r_1, \dots, \mathbf r_N)$ is unchanged by:

- **translation**, $\mathbf r_i \to \mathbf r_i + \mathbf t$;
- **rotation and reflection**, $\mathbf r_i \to \mathbf R\mathbf r_i$ with $\mathbf R$ orthogonal (the group O(3); together with translations, E(3));
- **permutation of identical atoms**, swapping the labels of two atoms of the same element.

A function with $f(g\cdot x) = f(x)$ for every operation $g$ of a group is **invariant**. The forces are not invariant: rotate the molecule and the force vectors rotate with it. A function with $f(g\cdot x) = \rho(g)\,f(x)$, where $\rho(g)$ is the corresponding transformation of the output, is **equivariant**. Forces, dipole moments and stress tensors are equivariant. The good news is that if the energy model is invariant, forces computed as $\mathbf F_i = -\nabla_{\mathbf r_i}E$ are automatically equivariant.

There are three ways to give a model these symmetries:

1. **Data augmentation**: show it many rotated copies and hope it learns. Approximate, and wasteful.
2. **Invariant descriptors**: transform the structure into features that are invariant by construction, then use any regressor (this lesson).
3. **Equivariant architectures**: build networks whose internal features transform correctly under rotation at every layer ([the lesson on graph neural networks](../graph-neural-networks/) and [the lesson on interatomic potentials](../mlip/)).

## Locality and extensivity

A second physical principle shapes almost every model. Electronic structure is **nearsighted** (Kohn, 1996): in insulators and in metals at finite temperature, the local electronic properties depend only weakly on atoms far away. This justifies writing the total energy as a sum of atomic contributions, each depending only on the atom's neighbourhood within a cut-off radius $r_c$ (typically 4–6 Å):

$$
E = \sum_{i=1}^{N} \varepsilon\big(\mathcal N_i\big), \qquad \mathcal N_i = \{(Z_j, \mathbf r_j - \mathbf r_i) : \lvert\mathbf r_j - \mathbf r_i\rvert < r_c\}.
$$

The decomposition makes the energy **extensive** (twice the system, twice the energy), makes the cost linear in $N$, and lets a model trained on small cells be applied to systems of millions of atoms. It is also an approximation: long-range electrostatics and dispersion need separate treatment, which modern potentials add explicitly.

## Descriptors, from simple to complete

**Pair distances.** All interatomic distances are invariant to rotation and translation; sorting them makes them invariant to permutation. But a sorted list does not say which distances belong to which atom, and its length changes with the number of atoms. It is a useful teaching example rather than a practical descriptor.

**Coulomb matrix.** Rupp et al. (2012) described a molecule by the matrix $M_{ij} = Z_iZ_j/\lvert\mathbf r_i - \mathbf r_j\rvert$ (with $M_{ii} = 0.5Z_i^{2.4}$), using its sorted eigenvalues as an invariant fingerprint. Used with kernel ridge regression and cross-validated over more than seven thousand small organic molecules, it predicted atomisation energies of unseen molecules with a mean absolute error of about 10 kcal/mol. Simple and historically important, but global, so it does not decompose into atomic contributions.

**Atom-centred symmetry functions.** Behler and Parrinello (2007) described each atom's environment by a fixed set of invariant functions. The radial functions

$$
G_i^{2} = \sum_{j \ne i} e^{-\eta(r_{ij} - r_s)^2} f_c(r_{ij}), \qquad f_c(r) = \tfrac12\left[\cos\frac{\pi r}{r_c} + 1\right] \ (r < r_c),
$$

count neighbours in soft shells centred at $r_s$; angular functions $G_i^{4}$ add three-body information through $\cos\theta_{ijk}$. The cut-off function $f_c$ goes smoothly to zero so that the energy, and its derivative the force, stay continuous as atoms enter and leave the sphere. Each atom gets a vector of perhaps 50–100 such numbers, fed to an element-specific neural network that outputs $\varepsilon_i$. This was the first machine-learned potential that scaled to condensed phases. The third row of the lab is a two-dimensional version of $G^2$, summed over atoms.

A useful picture is a census of the neighbourhood. Each radial function asks atom $i$ one question: how many neighbours live at about distance $r_s$, counted softly with a Gaussian of width set by $\eta$? A set of such questions is a smoothed histogram of neighbour distances, a private radial distribution function for every atom, and the answers do not depend on which way the map is drawn or what the neighbours are called. Angular functions ask a second kind of question: how many *pairs* of neighbours sit at a given angle, as seen from the centre? In the notation of Behler's 2011 paper, the standard angular function is

{{< eq title="Behler's angular symmetry function" say="Count pairs of neighbours, weighted by the angle they make at the central atom and by how close all three atoms are to one another." >}}
$$ G_i^{4} = 2^{1-\textcolor{#12a594}{\zeta}} \sum_{j<k} \big(1 + \textcolor{#845ef7}{\lambda}\cos\theta_{ijk}\big)^{\textcolor{#12a594}{\zeta}}\, e^{-\textcolor{#4c6ef5}{\eta}\,(r_{ij}^2 + r_{ik}^2 + r_{jk}^2)}\, f_c(r_{ij})\, f_c(r_{ik})\, f_c(r_{jk}) $$
- $\theta_{ijk}$: the angle at atom $i$ between the bonds to $j$ and $k$
- $\textcolor{#845ef7}{\lambda} = +1$ makes the angular factor largest at $0°$, $\lambda = -1$ at $180°$
- $\textcolor{#12a594}{\zeta}$: how sharply the angular factor is peaked; the prefactor $2^{1-\zeta}$ keeps its maximum at 2
- $\textcolor{#4c6ef5}{\eta}$: how quickly triplets of widely separated atoms are suppressed
{{< /eq >}}

Behler's paper writes the sum over all neighbours $j$ and $k$, which counts every pair twice; many codes, the card above and the worked example below use pairs $j < k$. The factor of two vanishes once inputs are standardised, but matters when you compare numbers between codes. A common variant, $G^5$, drops $r_{jk}$ from the exponential and the third cut-off factor, so that neighbours far from each other still count as a pair; the copper potential in [the tutorial on building an MLIP](../build-your-own-mlip/) uses it.

**SOAP.** The smooth overlap of atomic positions (Bartók, Kondor and Csányi, 2013) places a Gaussian on every neighbour to form a smooth neighbour density $\rho_i(\mathbf r)$, expands it in radial functions and spherical harmonics, $\rho_i(\mathbf r) = \sum_{nlm} c^{i}_{nlm} g_n(r) Y_{lm}(\hat{\mathbf r})$, and forms the rotationally invariant **power spectrum** $p^i_{nn'l} = \sum_m c^{i}_{nlm}\,(c^{i}_{n'lm})^*$. The SOAP kernel, a normalised dot product of power spectra, underlies the GAP potentials and much of kernel-based materials ML.

SOAP, honestly assessed: it is smooth, it has a clear geometric meaning (two environments are similar if their smeared neighbour densities overlap well after the best rotation), and its kernel suits Gaussian-process regression. Its costs are equally real. The power spectrum is three-body, so it inherits the incompleteness described next, although raising the kernel to a power $\zeta > 1$, as GAP does, brings in higher-order correlations implicitly. Its length grows with the square of the number of elements, because every pair of element channels gets its own block: with eight radial functions and angular orders up to $l = 6$, it has $\tfrac{8\cdot 9}{2}\times 7 = 252$ components for one element and $\tfrac{32\cdot 33}{2}\times 7 = 3696$ for four. And its hyperparameters (the cut-off, the Gaussian width of each atom, commonly around 0.5 Å, and the two truncations) change the results and are usually chosen by trial and validation.

**Completeness and ACE.** A descriptor built from distances and angles (two- and three-body information) is not complete: Pozdnyakov et al. (2020) constructed distinct environments that such descriptors cannot tell apart. The **atomic cluster expansion** (ACE; Drautz, 2019) systematically includes correlations of any body order, from a basis that can be made complete, and connects symmetry functions, SOAP and modern equivariant networks in a single framework.

ACE, honestly assessed: completeness is a statement about a limit. The basis can represent any smooth symmetric function of the environment only if body order and radial and angular resolution all grow without bound. In practice they cannot grow far, because the number of basis functions rises combinatorially with body order, angular cut-off and number of elements. Every ACE potential therefore truncates the expansion, usually by a total polynomial degree, and regularises the fit so that the many remaining coefficients do not overfit. What ACE offers is a systematic dial: accuracy improves by adding basis functions in a known order, and the density trick of [kernel and linear potentials](../kernel-and-linear-potentials/) keeps high body orders affordable. It also clarifies what other models are: the SOAP power spectrum corresponds to the body-order-three part of ACE, and MACE builds ACE-like products from learned features.

{{< note type="warn" title="Reflections and chirality" >}}
Every descriptor in the lab is unchanged by the mirror operation, and so is the energy: an isolated molecule and its mirror image have the same energy. But some properties of chiral molecules, such as optical rotation, change sign under reflection, and such pairs must be distinguished. A model that needs to tell enantiomers apart must use SE(3)-equivariant features (rotations only) or include a pseudoscalar such as a signed volume.
{{< /note >}}

## Worked example: an angle that distances miss

Consider a central atom with four neighbours, all exactly 1 Å away, in two arrangements: a tetrahedron, with every bond angle 109.47°, and a square, with angles of 90° and 180°. These are chemically different environments, the carbon of methane against the metal of a square-planar complex, and an energy model must be able to tell them apart. The cell below computes one radial function $G^2$ and two angular functions $G^4$ for the central atom of each, with $\eta = 0.5$ Å⁻², $r_s = 1$ Å, $\zeta = 2$ and $r_c = 3$ Å. It then takes the tetrahedron, mirrors it, applies a random rotation, shifts it and renumbers its neighbours, and computes everything again.

{{< py title="radial and angular symmetry functions" >}}
import numpy as np
def fc(r, rc=3.0):                                     # Behler's smooth cut-off
    return np.where(r < rc, 0.5 * (np.cos(np.pi * r / rc) + 1), 0.0)
def acsf(pos, i, eta=0.5, rs=1.0, zeta=2.0):
    """Radial G2 and angular G4 (lambda = +1 and -1) of atom i, over pairs j < k."""
    d = np.delete(pos - pos[i], i, axis=0)             # vectors from atom i to the others
    r = np.linalg.norm(d, axis=1)
    g2 = np.sum(np.exp(-eta * (r - rs) ** 2) * fc(r))
    j, k = np.triu_indices(len(d), 1)                  # every pair of neighbours
    rjk = np.linalg.norm(d[j] - d[k], axis=1)
    cos = np.sum(d[j] * d[k], axis=1) / (r[j] * r[k])
    rad = np.exp(-eta * (r[j]**2 + r[k]**2 + rjk**2)) * fc(r[j]) * fc(r[k]) * fc(rjk)
    return (g2, *[2 ** (1 - zeta) * np.sum((1 + lam * cos) ** zeta * rad) for lam in (1, -1)])
tet = np.array([[0, 0, 0], [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]) / np.sqrt(3)
sq = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0]], float)
Q, _ = np.linalg.qr(np.random.default_rng(1).normal(size=(3, 3)))   # a random rotation
moved = (tet * [-1, 1, 1]) @ Q.T + [2.0, -1.0, 0.5]                 # mirror, rotate, shift...
moved = moved[[0, 3, 1, 4, 2]]                                       # ...and renumber
print("environment of atom 0     G2      G4(λ=+1)   G4(λ=−1)")
for name, p in [("tetrahedral", tet), ("square planar", sq), ("tetrahedral, moved", moved)]:
    print("%-22s %8.4f %10.5f %10.5f" % (name, *acsf(p, 0)))
{{< /py >}}

```text
environment of atom 0     G2      G4(λ=+1)   G4(λ=−1)
tetrahedral              3.0000    0.03132    0.12527
square planar            3.0000    0.08296    0.11096
tetrahedral, moved       3.0000    0.03132    0.12527
```

The output carries three lessons. First, $G^2$ is exactly 3.0000 for both arrangements: every neighbour sits at the centre of the Gaussian and contributes $e^{0}\,f_c(1\ \text{Å}) = \tfrac12[\cos(\pi/3) + 1] = 0.75$. Any descriptor built only from distances to the central atom is blind to the difference, however many radial functions it uses.

Second, the angular functions see it at once. With $\lambda = +1$, which favours small angles, the square scores 0.08296, more than two and a half times the tetrahedron's 0.03132. Each of its four 90° pairs has an angular factor $(1 + 0)^2 = 1$, against $(1 - \tfrac13)^2 = \tfrac49$ for each of the six tetrahedral pairs, and its neighbours are closer to one another (1.41 Å against 1.63 Å), so the Gaussian in $r_{jk}$ weights them more; its two 180° pairs add nothing, because $1 + \cos 180° = 0$. With $\lambda = -1$, which favours wide angles, the order reverses (0.12527 against 0.11096). Two numbers pin the geometry down better than one, which is why practical sets use both signs and several values of $\zeta$ and $\eta$.

Third, the mirrored, rotated, shifted and renumbered tetrahedron gives the same three numbers to every printed digit, although all its coordinates have changed: the invariance is exact by construction, not learned. Angles separate this pair of environments, but recall Pozdnyakov's examples: some different environments share all their distances and angles, and only higher body-order information separates those.

## In practice

The radial functions in NumPy, with a numerical check of all three symmetries:

```python
import numpy as np

def cutoff(r, rc):
    """Smooth cutoff: 1 at r = 0, 0 (with zero slope) at r = rc."""
    return np.where(r < rc, 0.5 * (np.cos(np.pi * r / rc) + 1), 0.0)

def g2(pos, etas=(4.0,), centres=(1.0, 1.5, 2.0, 2.5, 3.0), rc=4.0):
    """Behler-Parrinello radial symmetry functions, one row per atom."""
    d = np.linalg.norm(pos[:, None] - pos[None], axis=-1)
    np.fill_diagonal(d, 2 * rc)                      # an atom is not its own neighbour
    fc = cutoff(d, rc)
    return np.array([[np.sum(np.exp(-eta * (d[i] - rs) ** 2) * fc[i])
                      for eta in etas for rs in centres] for i in range(len(pos))])

rng = np.random.default_rng(0)
pos = rng.normal(scale=1.2, size=(8, 3))             # a random 8-atom cluster
G = g2(pos)

# a random rotation (QR of a Gaussian matrix), a translation and a permutation
Q, _ = np.linalg.qr(rng.normal(size=(3, 3)))
perm = rng.permutation(8)
pos2 = (pos @ Q.T + np.array([3.0, -1.0, 2.0]))[perm]
G2 = g2(pos2)

print("raw coordinates changed by up to", np.abs(pos2 - pos).max().round(3))
print("per-atom descriptors equal after undoing the permutation:", np.allclose(G2, G[perm]))
print("sum over atoms unchanged:", np.allclose(G2.sum(0), G.sum(0)))
```

```text
raw coordinates changed by up to 5.164
per-atom descriptors equal after undoing the permutation: True
sum over atoms unchanged: True
```

The per-atom descriptors are **equivariant** to permutation (renumbering the atoms renumbers the rows) and their sum is **invariant**: exactly the structure of $E = \sum_i\varepsilon_i$. For production work, libraries such as DScribe and librascal compute ACSF, SOAP and related descriptors for molecules and periodic crystals, and ACEpotentials.jl and pacemaker fit ACE potentials.

{{< note type="practice" title="Choosing a set of symmetry functions" >}}
- **Cut-off.** Start from the value used in published potentials for similar materials, usually 5–6 Å, and check that it contains at least the first two neighbour shells of every phase you care about.
- **Radial functions.** Spread the centres $r_s$ across the neighbour shells and make the Gaussians narrow enough to resolve them. In [the copper tutorial](../build-your-own-mlip/), radial functions 1.25–5 Å wide left the force error near 300 meV/Å after 25 epochs; functions 0.25–0.7 Å wide reached 34 meV/Å at the same point.
- **Angular functions.** Use both $\lambda = \pm1$, a few values of $\zeta$ (for example 1, 2 and 4) and two or three values of $\eta$.
- **Size and scaling.** Fifty to a hundred functions per element is typical. Standardise every function over the training set, and drop functions that are nearly constant or almost duplicate others; Imbalzano and colleagues (2018) showed how to select them automatically by CUR decomposition or farthest-point sampling.
{{< /note >}}

{{< note type="warn" title="Common mistakes with descriptors" >}}
- **Missing periodic images.** If the cut-off exceeds half the width of the simulation cell, an atom sees several images of the same neighbour. A minimum-image distance keeps only one of them and silently produces the wrong descriptor; use a proper neighbour list (ASE, matscipy, LAMMPS).
- **Unscaled inputs.** Different symmetry functions can differ in size by orders of magnitude. Fed raw to a network, they make training slow and unstable.
- **Ignoring the range of the training data.** A structure whose descriptors fall outside the range seen in training is outside what the model knows. Comparing each descriptor with the training minimum and maximum is a cheap first alarm; codes such as n2p2 report these extrapolation warnings during a simulation.
{{< /note >}}

{{< note type="key" >}}
- Energies are invariant, and forces equivariant, under translation, rotation, reflection and permutation; building these symmetries in beats hoping to learn them from data.
- Locality, $E = \sum_i \varepsilon(\mathcal N_i)$ within a cut-off, makes the energy extensive and the cost linear in the number of atoms; long-range physics needs explicit terms.
- Radial symmetry functions are soft neighbour counts in distance shells; angular functions are needed to separate environments with identical distance lists, such as tetrahedral and square-planar atoms.
- SOAP is a smooth three-body power spectrum whose length grows with the square of the number of elements; ACE is a complete, systematically truncated many-body basis. No finite descriptor is complete.
- Smooth cut-offs, standardised inputs and correct periodic neighbour lists are prerequisites for any descriptor-based model.
{{< /note >}}

{{< quiz >}}
- q: "A model predicts energies from raw Cartesian coordinates. Which failure do you expect?"
  options: ["It cannot be trained at all", "It gives different energies for the same molecule rotated or with its atoms listed in a different order", "It cannot represent forces"]
  answer: 1
  why: "Raw coordinates change under rotation, translation and permutation, so the model's output does too unless it has learned the symmetries perfectly from data, which finite data cannot guarantee."
- q: "The energy is invariant to rotation. How do the forces $\\mathbf F_i = -\\nabla_{\\mathbf r_i}E$ transform?"
  options: ["They are also invariant", "They are equivariant: they rotate with the structure", "They are unchanged in magnitude but random in direction"]
  answer: 1
  why: "Differentiating an invariant scalar with respect to positions gives a vector that rotates with the coordinates. This is why energy-conserving MLIPs get equivariant forces for free."
- q: "Why does the Behler–Parrinello cut-off function go smoothly to zero with zero slope at $r_c$?"
  options: ["To make the model faster", "So that energies and forces stay continuous when an atom crosses the cut-off sphere", "Because DFT energies vanish beyond $r_c$"]
  answer: 1
  why: "A step at $r_c$ would make the energy jump whenever a neighbour enters or leaves, creating infinite forces and breaking energy conservation in MD."
- q: "What does the decomposition $E = \\sum_i \\varepsilon(\\mathcal N_i)$ buy you?"
  options: ["Exact treatment of long-range electrostatics", "Extensivity, linear scaling with system size, and transferability from small training cells to large systems", "Invariance to reflection"]
  answer: 1
  why: "Summing local contributions makes the energy extensive and the cost proportional to N. Long-range interactions are the price: they need explicit terms."
- q: "A central atom has four neighbours at the same distance, arranged either as a tetrahedron or as a square. Which descriptor tells the two apart?"
  options: ["Any set of radial functions $G^2$, if there are enough of them", "An angular function $G^4$, which depends on the angles between pairs of neighbours", "Neither: the two environments must have the same energy"]
  answer: 1
  why: "All four neighbours are at the same distance in both, so every function of centre–neighbour distances takes the same value. The bond angles differ (109.5° against 90° and 180°), and $G^4$ is built from them."
- q: "How does the length of a SOAP power-spectrum vector grow with the number of elements $S$, all other settings fixed?"
  options: ["It does not depend on $S$", "Roughly linearly in $S$", "Roughly as $S^2$, because every pair of element channels gets its own block"]
  answer: 2
  why: "The power spectrum pairs every (element, radial) channel with every other, so the number of components grows roughly with the square of $S$: 252 for one element and 3696 for four, at eight radial functions and $l \\le 6$."
- q: "Your periodic training cell is 8 Å wide and your cut-off is 6 Å. What must the neighbour list do?"
  options: ["Include every periodic image within the cut-off, because an atom can see several images of the same neighbour", "Nothing special: the minimum-image convention is enough", "Reduce the cut-off to 4 Å, since larger cut-offs are not allowed"]
  answer: 0
  why: "The minimum-image convention is valid only for cut-offs up to half the cell width, here 4 Å. Beyond that, several images of one atom fall inside the sphere and all of them must be counted."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. F. Musil, A. Grisafi, A. P. Bartók, C. Ortner, G. Csányi and M. Ceriotti, “Physics-inspired structural representations for molecules and materials,” *Chemical Reviews* **121**, 9759–9815 (2021).
2. J. Behler and M. Parrinello, “Generalized neural-network representation of high-dimensional potential-energy surfaces,” *Physical Review Letters* **98**, 146401 (2007).
3. J. Behler, “Atom-centered symmetry functions for constructing high-dimensional neural network potentials,” *Journal of Chemical Physics* **134**, 074106 (2011).
4. M. Rupp, A. Tkatchenko, K.-R. Müller and O. A. von Lilienfeld, “Fast and accurate modeling of molecular atomization energies with machine learning,” *Physical Review Letters* **108**, 058301 (2012).
5. A. P. Bartók, R. Kondor and G. Csányi, “On representing chemical environments,” *Physical Review B* **87**, 184115 (2013).
6. R. Drautz, “Atomic cluster expansion for accurate and transferable interatomic potentials,” *Physical Review B* **99**, 014104 (2019).
7. S. N. Pozdnyakov, M. J. Willatt, A. P. Bartók, C. Ortner, G. Csányi and M. Ceriotti, “Incompleteness of atomic structure representations,” *Physical Review Letters* **125**, 166001 (2020).
8. W. Kohn, “Density functional and density matrix method scaling linearly with the number of atoms,” *Physical Review Letters* **76**, 3168–3171 (1996); E. Prodan and W. Kohn, “Nearsightedness of electronic matter,” *Proceedings of the National Academy of Sciences* **102**, 11635–11638 (2005).
9. L. Himanen, M. O. J. Jäger, E. V. Morooka, F. Federici Canova, Y. S. Ranawat, D. Z. Gao, P. Rinke and A. S. Foster, “DScribe: library of descriptors for machine learning in materials science,” *Computer Physics Communications* **247**, 106949 (2020).
10. M. M. Bronstein, J. Bruna, T. Cohen and P. Veličković, *Geometric Deep Learning: Grids, Groups, Graphs, Geodesics, and Gauges*, arXiv:2104.13478 (2021), chapters 3–5.
11. G. Imbalzano, A. Anelli, D. Giofré, S. Klees, J. Behler and M. Ceriotti, “Automatic selection of atomic fingerprints and reference configurations for machine-learning potentials,” *Journal of Chemical Physics* **148**, 241730 (2018).

</div>
