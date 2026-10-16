---
title: "Representing materials: compositions and crystal graphs"
description: "How a periodic crystal becomes model input: lattices and unit cells, composition-only models, crystal graphs with periodic images, the property databases models are trained on, and what stability on the convex hull really means."
track: ai4mat
weight: 1
level: Advanced
minutes: 50
lab: "Build a periodic crystal graph"
prereqs: ["graph-neural-networks"]
---

## What is special about crystals

A molecule is a finite set of atoms. A crystal is infinite: a **lattice** of translations $\mathbf T = n_1\mathbf a_1 + n_2\mathbf a_2 + n_3\mathbf a_3$ (integers $n_k$, lattice vectors $\mathbf a_k$) repeats a **basis** of atoms at fractional coordinates $\mathbf f_j$, so that every atom sits at $\mathbf r = \sum_k (f_{jk} + n_k)\mathbf a_k$. A crystal structure file (CIF, POSCAR) stores just one unit cell: the three lattice vectors, the species and fractional coordinates of the basis, and, implicitly, the rule that it repeats forever.

Two consequences matter for machine learning.

- **The unit cell is not unique.** Any supercell, or any other choice of lattice vectors spanning the same lattice, describes the same crystal. A representation must give the same answer for all of them: an extra symmetry beyond those of [the lesson on symmetry and descriptors](../symmetry-descriptors/).
- **Neighbours cross the cell boundary.** An atom near one face of the cell has neighbours that are periodic images of atoms near the opposite face. A model that only looks inside the cell sees the wrong environment.

## Composition-only models

Sometimes the structure is not known, for example when screening hypothetical compositions before any structure has been predicted. Composition-based models describe a material by its formula alone: hand-crafted statistics of elemental properties weighted by stoichiometry (the Magpie feature set: mean, range and deviation of electronegativity, atomic radius, valence electrons and so on), or learned element embeddings combined by a network over the elements present (ElemNet, Roost). They are fast and useful for screening, but cannot distinguish polymorphs: diamond and graphite are both "C".

## Crystal graphs

Xie and Grossman's **crystal graph convolutional neural network** (CGCNN, 2018) introduced the representation most structure-based models still use. Each atom in the unit cell is a node, and edges connect it to every atom, *including periodic images*, within a cut-off radius $r_c$ (or to its 12 nearest neighbours). Because an atom can be bonded to several images of the same atom, the result is a **multigraph** with several edges between the same pair of nodes, each with its own length. Edge features are the distances expanded in Gaussians, $e_{ij,k} = \exp\!\big[-(d_{ij} - \mu_k)^2/\gamma^2\big]$; node features are learned embeddings of the element.

{{< widget name="crystalgraph" title="The periodic graph of a 2D crystal" caption="Edges start on the bold atoms of the unit cell; teal edges stay inside the cell, dashed orange ones end on periodic images. Raise the cut-off to include second and third neighbours, switch lattices, and strain the cell to see coordination shells split." >}}

Things to notice in the lab:

- In the **triangular** lattice there is only one atom per cell, so *every* edge goes to a periodic image of itself: the graph is a single node with six self-loops of different image shifts. Without periodic images there would be no graph at all.
- Raising $r_c$ past each coordination shell adds a shell of edges at once; the histogram is the discrete version of the radial distribution function from [the lesson on trajectory analysis](../trajectory-analysis/).
- **Strain** splits shells that were degenerate: under uniaxial strain the six nearest neighbours of the triangular lattice become two plus four, and a cut-off placed between the new distances changes the coordination number abruptly. Smooth cut-off functions and distance expansions are what keep the model's output continuous under such changes.
- Supercells give the same per-atom environments, so the per-atom features and an extensive sum over atoms do not depend on the choice of cell.

Later models refine the idea. **MEGNet** adds a global state vector (temperature, pressure); **ALIGNN** adds a second "line graph" whose nodes are bonds, so that messages carry bond angles; **M3GNet** and **CHGNet** add three-body interactions and are trained on energies, forces and stresses from relaxation trajectories, so they serve as universal interatomic potentials ([the lesson on interatomic potentials](../mlip/)).

## Where the data come from

Structure-based models are trained on high-throughput DFT databases:

| Database | What it holds |
|---|---|
| Materials Project | about 150,000 inorganic materials with PBE(+U) energies, band gaps, elastic and other properties, and relaxation trajectories (MPtrj) |
| OQMD, AFLOW, JARVIS-DFT | hundreds of thousands to millions of DFT calculations with different settings and property coverage |
| Alexandria | millions of PBE and PBEsol calculations, largely of hypothetical compounds |
| Open Catalyst (OC20, OC22) | about a million adsorbate–surface relaxations for catalysis |
| Matbench | a curated benchmark of 13 tasks with fixed splits, for comparing models fairly |

Two cautions apply to all of them. First, they are **DFT** numbers, usually with the PBE functional: band gaps are systematically underestimated, and formation energies carry functional-dependent errors and empirical corrections. A model trained on them learns PBE, not experiment. Second, databases are **biased** towards known chemistry and towards structures that someone chose to compute, which is exactly the regime where a discovery model should be least trusted ([the lesson on generalisation](../generalisation/)).

## Stability: the convex hull

The most important property for materials discovery is whether a compound can exist. A negative formation energy is not enough: the compound must also be stable against decomposing into *other* compounds of the same elements. Plot the formation energy per atom of every known phase in a chemical system against composition and take the lower **convex hull**. Phases on the hull are thermodynamically stable (at 0 K, in DFT); a phase above it decomposes into the hull phases at its composition, and its **energy above hull** $E_{\text{hull}}$ measures by how much. Many metastable materials with $E_{\text{hull}}$ of a few tens of meV/atom can be synthesised, so $E_{\text{hull}}$ is a likelihood, not a verdict. Predicting $E_{\text{hull}}$ is harder than predicting formation energy, because small errors in the energies of competing phases shift the hull. Large-scale campaigns such as GNoME (2023) combined graph networks with DFT verification in active-learning loops to propose hundreds of thousands of new hull-stable crystals; how many of these can be made remains an open experimental question.

## In practice

ASE's neighbour list returns exactly the edges of a crystal graph: source atom, target atom, distance and the integer image shift:

```python
from ase.build import bulk
from ase.neighborlist import neighbor_list
import numpy as np

atoms = bulk("NaCl", "rocksalt", a=5.64)        # primitive cell: 1 Na + 1 Cl
i, j, d, S = neighbor_list("ijdS", atoms, cutoff=3.0)

print("atoms in cell:", len(atoms), " directed edges:", len(i))
for a in range(len(atoms)):
    nb = j[i == a]
    print(f"{atoms[a].symbol}: {len(nb)} neighbours at {np.unique(d[i == a].round(3))} Å, "
          f"all of them {set(atoms[nb].get_chemical_symbols())}")
print("distinct periodic-image shifts used:", len({tuple(s) for s in S}))
```

```text
atoms in cell: 2  directed edges: 12
Na: 6 neighbours at [2.82] Å, all of them {'Cl'}
Cl: 6 neighbours at [2.82] Å, all of them {'Na'}
distinct periodic-image shifts used: 11
```

The two-atom primitive cell of rock salt gives each ion its six octahedral neighbours of the other species, and almost every edge reaches a different periodic image. pymatgen (`Structure.get_neighbor_list`) and matminer (composition and structure featurisers) are the standard companions.

{{< quiz >}}
- q: "Why can a composition-only model not distinguish diamond from graphite?"
  options: ["Because carbon is too light", "Because both have the same formula, C; the difference is entirely in the structure", "Because DFT cannot compute graphite"]
  answer: 1
  why: "A composition model sees only the formula. Polymorphs share a formula and differ only in structure, which needs a structure-based representation."
- q: "A crystal has one atom per primitive cell. What does its crystal graph look like?"
  options: ["It has no edges", "One node whose edges all connect it to periodic images of itself", "It must be converted to a supercell first"]
  answer: 1
  why: "All neighbours of the single atom are its own periodic images, so every edge is a self-loop labelled by a different image shift and distance."
- q: "A predicted compound has a formation energy of −1.2 eV/atom and lies 0.15 eV/atom above the convex hull. What does that mean?"
  options: ["It is stable because its formation energy is negative", "In DFT at 0 K it would lower its energy by decomposing into competing phases, so it is probably difficult or impossible to make", "It is a good thermoelectric"]
  answer: 1
  why: "Stability is relative to all competing phases. 150 meV/atom above the hull is well beyond what metastable synthesis usually reaches, although the threshold depends on the chemistry."
- q: "A GNN uses a hard cut-off: atoms beyond $r_c$ are simply ignored. What happens under a small strain that moves a neighbour across $r_c$?"
  options: ["Nothing", "The predicted energy can jump discontinuously, making forces and stresses ill-defined", "The model refuses to predict"]
  answer: 1
  why: "A neighbour suddenly appearing or vanishing changes the input discontinuously. Smooth cut-off envelopes make contributions vanish gradually at $r_c$."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. T. Xie and J. C. Grossman, “Crystal graph convolutional neural networks for an accurate and interpretable prediction of material properties,” *Physical Review Letters* **120**, 145301 (2018).
2. C. Chen, W. Ye, Y. Zuo, C. Zheng and S. P. Ong, “Graph networks as a universal machine learning framework for molecules and crystals,” *Chemistry of Materials* **31**, 3564–3572 (2019) (MEGNet).
3. K. Choudhary and B. DeCost, “Atomistic line graph neural network for improved materials property predictions,” *npj Computational Materials* **7**, 185 (2021) (ALIGNN).
4. C. Chen and S. P. Ong, “A universal graph deep learning interatomic potential for the periodic table,” *Nature Computational Science* **2**, 718–728 (2022) (M3GNet).
5. L. Ward, A. Agrawal, A. Choudhary and C. Wolverton, “A general-purpose machine learning framework for predicting properties of inorganic materials,” *npj Computational Materials* **2**, 16028 (2016) (Magpie features).
6. R. E. A. Goodall and A. A. Lee, “Predicting materials properties without crystal structure: deep representation learning from stoichiometry,” *Nature Communications* **11**, 6280 (2020) (Roost).
7. A. Jain et al., “Commentary: The Materials Project: a materials genome approach to accelerating materials innovation,” *APL Materials* **1**, 011002 (2013).
8. L. Chanussot et al., “Open Catalyst 2020 (OC20) dataset and community challenges,” *ACS Catalysis* **11**, 6059–6072 (2021).
9. A. Dunn, Q. Wang, A. Ganose, D. Dopp and A. Jain, “Benchmarking materials property prediction methods: the Matbench test set and Automatminer reference algorithm,” *npj Computational Materials* **6**, 138 (2020).
10. W. Sun, S. T. Dacek, S. P. Ong, G. Hautier, A. Jain, W. D. Richards, A. C. Gamst, K. A. Persson and G. Ceder, “The thermodynamic scale of inorganic crystalline metastability,” *Science Advances* **2**, e1600225 (2016).
11. A. Merchant, S. Batzner, S. S. Schoenholz, M. Aykol, G. Cheon and E. D. Cubuk, “Scaling deep learning for materials discovery,” *Nature* **624**, 80–85 (2023) (GNoME).
12. S. P. Ong et al., “Python Materials Genomics (pymatgen): a robust, open-source python library for materials analysis,” *Computational Materials Science* **68**, 314–319 (2013).

</div>
