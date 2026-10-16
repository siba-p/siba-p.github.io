---
title: "Symmetry and atomic descriptors"
description: "Why a model of atoms must respect translation, rotation, reflection and permutation; invariance against equivariance; locality; and the descriptors (Coulomb matrices, symmetry functions, SOAP, ACE) that build these symmetries in."
track: arch
weight: 1
level: Core
minutes: 45
lab: "Rotate, renumber and mirror a cluster"
prereqs: ["neural-networks", "potential-energy-surfaces"]
---

## The input problem

A neural network takes a vector of numbers. A configuration of atoms is a list of positions $\mathbf r_i$ and element types $Z_i$. The obvious encoding, concatenating the Cartesian coordinates $(x_1, y_1, z_1, x_2, \dots)$, is a bad one, for a reason that has nothing to do with machine learning: the energy of a molecule does not change when you move it, turn it round or relabel its atoms, but the coordinate vector changes completely. A model fed raw coordinates would have to learn, from data, that millions of different input vectors describe the same physical object. With finite data it never quite does.

{{< widget name="symmetry" title="Which descriptions survive a symmetry operation?" caption="Each row shows a descriptor of the same six-atom cluster. Rotate, translate, renumber or mirror it: the physics is unchanged, and so are the distance-based descriptors, but the raw coordinates are not. Drag an atom to change the structure itself, and every descriptor responds." >}}

## The symmetries of physics

For an isolated system of atoms, the potential energy $E(\mathbf r_1, \dots, \mathbf r_N)$ is unchanged by:

- **translation**, $\mathbf r_i \to \mathbf r_i + \mathbf t$;
- **rotation and reflection**, $\mathbf r_i \to \mathbf R\mathbf r_i$ with $\mathbf R$ orthogonal (the group O(3); together with translations, E(3));
- **permutation of identical atoms**, swapping the labels of two atoms of the same element.

A function with $f(g\cdot x) = f(x)$ for every operation $g$ of a group is **invariant**. The forces are not invariant: rotate the molecule and the force vectors rotate with it. A function with $f(g\cdot x) = \rho(g)\,f(x)$, where $\rho(g)$ is the corresponding transformation of the output, is **equivariant**. Forces, dipole moments and stress tensors are equivariant. The good news is that if the energy model is invariant, forces computed as $\mathbf F_i = -\nabla_{\mathbf r_i}E$ are automatically equivariant.

There are three ways to give a model these symmetries:

1. **Data augmentation**: show it many rotated copies and hope it learns. Approximate, and wasteful.
2. **Invariant descriptors**: transform the structure into features that are invariant by construction, then use any regressor (this lesson).
3. **Equivariant architectures**: build networks whose internal features transform correctly under rotation at every layer ([lesson 4.2](../graph-neural-networks/) and [lesson 5.2](../mlip/)).

## Locality and extensivity

A second physical principle shapes almost every model. Electronic structure is **nearsighted** (Kohn, 1996): in insulators and in metals at finite temperature, the local electronic properties depend only weakly on atoms far away. This justifies writing the total energy as a sum of atomic contributions, each depending only on the atom's neighbourhood within a cut-off radius $r_c$ (typically 4–6 Å):

$$
E = \sum_{i=1}^{N} \varepsilon\big(\mathcal N_i\big), \qquad \mathcal N_i = \{(Z_j, \mathbf r_j - \mathbf r_i) : \lvert\mathbf r_j - \mathbf r_i\rvert < r_c\}.
$$

The decomposition makes the energy **extensive** (twice the system, twice the energy), makes the cost linear in $N$, and lets a model trained on small cells be applied to systems of millions of atoms. It is also an approximation: long-range electrostatics and dispersion need separate treatment, which modern potentials add explicitly.

## Descriptors, from simple to complete

**Pair distances.** All interatomic distances are invariant to rotation and translation; sorting them makes them invariant to permutation. But a sorted list does not say which distances belong to which atom, and its length changes with the number of atoms. It is a useful teaching example rather than a practical descriptor.

**Coulomb matrix.** Rupp et al. (2012) described a molecule by the matrix $M_{ij} = Z_iZ_j/\lvert\mathbf r_i - \mathbf r_j\rvert$ (with $M_{ii} = 0.5Z_i^{2.4}$), using its sorted eigenvalues as an invariant fingerprint. Simple and historically important, but global, so it does not decompose into atomic contributions.

**Atom-centred symmetry functions.** Behler and Parrinello (2007) described each atom's environment by a fixed set of invariant functions. The radial functions

$$
G_i^{2} = \sum_{j \ne i} e^{-\eta(r_{ij} - r_s)^2} f_c(r_{ij}), \qquad f_c(r) = \tfrac12\left[\cos\frac{\pi r}{r_c} + 1\right] \ (r < r_c),
$$

count neighbours in soft shells centred at $r_s$; angular functions $G_i^{4}$ add three-body information through $\cos\theta_{ijk}$. The cut-off function $f_c$ goes smoothly to zero so that the energy, and its derivative the force, stay continuous as atoms enter and leave the sphere. Each atom gets a vector of perhaps 50–100 such numbers, fed to an element-specific neural network that outputs $\varepsilon_i$. This was the first machine-learned potential that scaled to condensed phases. The third row of the lab is a two-dimensional version of $G^2$, summed over atoms.

**SOAP.** The smooth overlap of atomic positions (Bartók, Kondor and Csányi, 2013) places a Gaussian on every neighbour to form a smooth neighbour density $\rho_i(\mathbf r)$, expands it in radial functions and spherical harmonics, $\rho_i(\mathbf r) = \sum_{nlm} c^{i}_{nlm} g_n(r) Y_{lm}(\hat{\mathbf r})$, and forms the rotationally invariant **power spectrum** $p^i_{nn'l} = \sum_m c^{i}_{nlm}\,(c^{i}_{n'lm})^*$. The SOAP kernel, a normalised dot product of power spectra, underlies the GAP potentials and much of kernel-based materials ML.

**Completeness and ACE.** A descriptor built from distances and angles (two- and three-body information) is not complete: Pozdnyakov et al. (2020) constructed distinct environments that such descriptors cannot tell apart. The **atomic cluster expansion** (ACE; Drautz, 2019) systematically includes correlations of any body order, from a basis that can be made complete, and connects symmetry functions, SOAP and modern equivariant networks in a single framework.

{{< note type="warn" title="Reflections and chirality" >}}
Every descriptor in the lab is unchanged by the mirror operation, and so is the energy: an isolated molecule and its mirror image have the same energy. But some properties of chiral molecules, such as optical rotation, change sign under reflection, and such pairs must be distinguished. A model that needs to tell enantiomers apart must use SE(3)-equivariant features (rotations only) or include a pseudoscalar such as a signed volume.
{{< /note >}}

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

</div>
