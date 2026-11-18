---
title: "Representing materials"
description: "How a periodic crystal becomes model input: lattices and unit cells, composition-only models, crystal graphs with periodic images, the property databases models are trained on, and what stability on the convex hull really means."
hook: "The primitive cell of rock salt holds just two atoms, yet each has six neighbours and most of them live in other cells. Turning an endless crystal into model input, and judging whether it can exist at all, starts here."
objectives:
  - "Explain why a crystal representation must not depend on the choice of unit cell"
  - "Build a periodic crystal graph with image shifts from a neighbour list"
  - "Compare composition-only models with structure-based crystal graph networks"
  - "Recognise the functional and selection biases of high-throughput DFT databases"
  - "Interpret the energy above the convex hull as a measure of stability"
cover: "cover.svg"
milestones:
  - year: 1991
    text: "Hall, Allen and Brown introduce the Crystallographic Information File (CIF)"
  - year: 2013
    text: "Jain and colleagues describe the Materials Project database of DFT calculations"
  - year: 2018
    text: "Xie and Grossman build crystal graphs with periodic neighbours (CGCNN)"
  - year: 2023
    text: "Merchant and colleagues report GNoME, 2.2 million predicted stable crystals"
track: found
weight: 4
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

### Rock salt, two ways

Rock salt shows how much freedom a structure file has. The conventional cubic cell of NaCl has $a = 5.64$ Å, a volume of 179.4 Å³ and eight ions: Na at (0, 0, 0), (0, ½, ½), (½, 0, ½) and (½, ½, 0), and Cl at the same positions shifted by (½, 0, 0). The underlying lattice is face-centred cubic, whose primitive cell is spanned by $\mathbf a_1 = \tfrac a2(0,1,1)$, $\mathbf a_2 = \tfrac a2(1,0,1)$ and $\mathbf a_3 = \tfrac a2(1,1,0)$, vectors 3.99 Å long at 60° to each other. That cell has a volume of $a^3/4 = 44.9$ Å³ and holds two ions, Na at fractional coordinates (0, 0, 0) and Cl at (½, ½, ½). Both files describe the same infinite crystal, as does every other choice of three lattice vectors related to these by an integer matrix of determinant ±1, and every supercell: the 2 × 2 × 2 supercell of the conventional cell holds 64 ions.

{{< fig src="cells.svg" alt="A two-dimensional checkerboard of small blue cations and large orange anions with three cells outlined: a teal square rotated by 45 degrees, a violet parallelogram of the same area, and a dashed pink rectangle four times larger" caption="One crystal, three valid cells. The two primitive cells have the same area and two atoms each; the supercell has eight. A representation must give the same per-atom answer for all of them." >}}

A representation therefore has to be invariant to four things at once: the numbering of the atoms, rigid rotations and translations, the choice of cell, and the origin of the fractional coordinates. A model that sums per-atom contributions computed from neighbour lists satisfies all four automatically. A model that reads the cell parameters directly (the lengths $a$, $b$, $c$ and the angles) does not, unless every structure is first reduced to a standard cell, for example by Niggli reduction.

{{< note type="warn" title="Myth" >}}
"A CIF file identifies a crystal." Two CIFs of the same material can differ in cell choice, origin, space-group setting, atom order and in coordinate noise of a few thousandths of an ångström left by a relaxation. Databases and careful practitioners deduplicate with a structure matcher, such as pymatgen's `StructureMatcher`, which reduces both lattices and compares sites within tolerances, and determine space groups with spglib at an explicit symmetry tolerance (`symprec`, often 0.01 to 0.1 Å). Duplicates matter for machine learning: the same structure under two cells, one in the training set and one in the test set, makes the test error look better than it is.
{{< /note >}}

## Composition-only models

Sometimes the structure is not known, for example when screening hypothetical compositions before any structure has been predicted. Composition-based models describe a material by its formula alone: hand-crafted statistics of elemental properties weighted by stoichiometry (the Magpie feature set: mean, range and deviation of electronegativity, atomic radius, valence electrons and so on), or learned element embeddings combined by a network over the elements present (ElemNet, Roost). They are fast and useful for screening, but cannot distinguish polymorphs: diamond and graphite are both "C".

A worked example shows what such features contain. Fe₂O₃ has atomic fractions 0.4 Fe and 0.6 O, and Pauling electronegativities 1.83 and 3.44. The stoichiometry-weighted mean is $0.4 \times 1.83 + 0.6 \times 3.44 = 2.80$, the range is 1.61, and the weighted mean absolute deviation from the mean is $0.4 \times 0.97 + 0.6 \times 0.64 = 0.77$. Fe₃O₄ gives 2.75, 1.61 and 0.79: close neighbours in feature space, as they should be, since both are iron oxides. SrTiO₃ gives a mean of 2.56 and a range of 2.49, which marks it as more ionic. The Magpie set repeats this for some twenty elemental properties (atomic number, Mendeleev number, covalent radius, valence-electron counts by orbital, melting temperature and others) takes six statistics of each (mean, mean absolute deviation, range, minimum, maximum and mode), and adds stoichiometric norms, valence-orbital fractions and ionic-character terms, for 145 features in all. Pure carbon gives a mean of 2.55 and a range of zero whatever the structure.

That last line is the limitation in numbers. Diamond lies only about 0.02 eV per atom above graphite (1.9 kJ/mol at standard conditions), yet diamond is an insulator with a band gap of about 5.5 eV and graphite is a semimetal. A composition model must give both one prediction. Learned composition models reduce but cannot remove this problem: Roost (Goodall and Lee, 2020) treats the formula as a dense graph of its elements, weighted by their fractions, and passes messages between them ([graph networks](../graph-neural-networks/)); CrabNet (Wang et al., 2021) applies self-attention to the element tokens ([transformers](../transformers/)). Composition models remain the right tool when structures do not exist: the Matbench task of experimental band gaps, about 4,600 compositions, comes with no structures at all, and a screening of hypothetical formulas has nothing else to work with.

## Crystal graphs

Xie and Grossman's **crystal graph convolutional neural network** (CGCNN, 2018) introduced the representation most structure-based models still use. Each atom in the unit cell is a node, and edges connect it to every atom, *including periodic images*, within a cut-off radius $r_c$ (or to its 12 nearest neighbours). Because an atom can be bonded to several images of the same atom, the result is a **multigraph** with several edges between the same pair of nodes, each with its own length. Edge features are the distances expanded in Gaussians, $e_{ij,k} = \exp\!\big[-(d_{ij} - \mu_k)^2/\gamma^2\big]$; node features are learned embeddings of the element.

{{< widget name="crystalgraph" title="The periodic graph of a 2D crystal" caption="Edges start on the bold atoms of the unit cell; teal edges stay inside the cell, dashed orange ones end on periodic images. Raise the cut-off to include second and third neighbours, switch lattices, and strain the cell to see coordination shells split." >}}

Things to notice in the lab:

- In the **triangular** lattice there is only one atom per cell, so *every* edge goes to a periodic image of itself: the graph is a single node with six self-loops of different image shifts. Without periodic images there would be no graph at all.
- Raising $r_c$ past each coordination shell adds a shell of edges at once; the histogram is the discrete version of the radial distribution function from [the lesson on trajectory analysis](../trajectory-analysis/).
- **Strain** splits shells that were degenerate: under uniaxial strain the six nearest neighbours of the triangular lattice become two plus four, and a cut-off placed between the new distances changes the coordination number abruptly. Smooth cut-off functions and distance expansions are what keep the model's output continuous under such changes.
- Supercells give the same per-atom environments, so the per-atom features and an extensive sum over atoms do not depend on the choice of cell.

### Turning distances into features

Take the Na–Cl bond in rock salt, 2.82 Å, and an expansion in 41 Gaussians centred every 0.2 Å from 0 to 8 Å with width $\gamma = 0.2$ Å. The Gaussians centred at 2.6, 2.8 and 3.0 Å return 0.30, 0.99 and 0.45; those at 2.4 and 3.2 Å return 0.01 and 0.03; all others are below 0.01. The distance becomes a soft one-hot vector. Stretching the bond by 0.01 Å changes the vector continuously, and the network can learn a separate response for each distance band, one for 2.8 Å Na–Cl contacts and another for the 3.99 Å Na–Na contacts of the second shell.

{{< fig src="distance-features.svg" alt="Forty-one faint Gaussian curves between 0 and 8 Å, with blue stems showing the features of a 2.82 Å distance peaking at the 2.8 Å centre and orange stems showing the features of a 3.99 Å distance peaking at 4.0 Å" caption="Each distance lights up three to five neighbouring Gaussians. Narrower Gaussians resolve distances more finely but need more of them and give less smooth interpolation between training distances." >}}

The cut-off sets the size of the graph. Around a Na ion in rock salt the shells come at 2.82 Å (6 Cl), 3.99 Å (12 Na), 4.88 Å (8 Cl), 5.64 Å (6 Na), 6.31 Å (24 Cl), 6.91 Å (24 Na) and 7.98 Å (12 Na). A 3 Å cut-off gives each ion 6 edges, 6 Å gives 32 and 8 Å gives 92. The count follows the continuum estimate $\tfrac43\pi r_c^3\rho$, with $\rho = 8/a^3 = 0.0446$ ions per Å³, so doubling the cut-off multiplies the edges, memory and cost of every message-passing layer by about eight.

{{< fig src="nacl-shells.svg" alt="Staircase plot of the cumulative number of neighbours of a sodium ion in rock salt against the cut-off radius, with steps at each coordination shell labelled by count and species, a dashed cubic continuum curve, and vertical lines at 3, 6 and 8 Å marking 6, 32 and 92 edges" caption="Neighbours of one Na ion in NaCl as the cut-off grows. The steps are the coordination shells; on average they follow the cubic continuum estimate, which sets how the cost of a crystal graph grows with $r_c$." >}}

{{< note type="warn" title="Nearest-neighbour caps in symmetric crystals" >}}
CGCNN's reference implementation searches within 8 Å and keeps the 12 nearest neighbours of each atom. In rock salt the 12 nearest neighbours of Na are the 6 Cl at 2.82 Å and 6 of the 12 equivalent Na at 3.99 Å, chosen by rounding noise and sort order. The model then sees an environment with lower symmetry than the crystal, and a strain of 0.1 per cent can change which six are kept. Prefer a pure radius cut-off with a smooth envelope, or cap at a complete shell.
{{< /note >}}

{{< note type="try" title="Pause and predict" >}}
Copper is face-centred cubic with $a = 3.615$ Å and one atom in its primitive cell. How many edges does its crystal graph have with a 3 Å cut-off, and with 4 Å? The nearest-neighbour distance is $a/\sqrt2 = 2.556$ Å and the second-neighbour distance is $a$. With 3 Å the graph has 12 edges, all self-loops to 12 different periodic images; with 4 Å it has 18, adding the 6 second neighbours at 3.615 Å.
{{< /note >}}

Later models refine the idea. **MEGNet** adds a global state vector (temperature, pressure); **ALIGNN** adds a second "line graph" whose nodes are bonds, so that messages carry bond angles; **M3GNet** and **CHGNet** add three-body interactions and are trained on energies, forces and stresses from relaxation trajectories, so they serve as universal interatomic potentials ([the lesson on interatomic potentials](../mlip/)).

## Representations for generation

Graph features describe a structure but cannot be turned back into one: no procedure recovers coordinates from a set of learned node vectors. Generative models therefore work on the raw ingredients, the lattice $(\mathbf a_1, \mathbf a_2, \mathbf a_3)$, the fractional coordinates and the species, and use a graph network only inside, as the denoiser or the scorer. The crystal diffusion variational autoencoder (CDVAE; Xie et al., 2022) and later diffusion models ([diffusion models](../diffusion-models/)) treat fractional coordinates as points on a torus, so that noise added near one face of the cell wraps around to the other instead of pushing atoms out of the crystal. Language models take the opposite route and treat the CIF file itself as text: CrystaLLM generates the lattice parameters, space group and coordinates token by token ([transformers](../transformers/)). Both routes inherit the non-uniqueness of the cell: the same crystal written in two settings is two different training examples, which is why such models usually standardise cells before training.

Simpler fixed-length representations also remain in use. The sine matrix of Faber and colleagues (2015) adapts the Coulomb matrix of molecules to periodic systems, and smooth overlap of atomic positions (SOAP) descriptors, averaged over the atoms of a cell, give a fixed-length vector suitable for kernel regression ([symmetry descriptors](../symmetry-descriptors/)). With a few hundred training structures, such descriptors combined with a Gaussian process are often more accurate than a graph network trained from scratch ([Gaussian processes](../uncertainty-gaussian-processes/)).

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

The functional error is not small. PBE gives silicon a band gap of about 0.6 eV against a measured 1.17 eV at low temperature, and many oxides fare worse. Formation energies of oxides, fluorides and other anion-rich compounds carry systematic errors that the Materials Project removes with fitted corrections per anion, and energies computed with GGA and with GGA+U for transition-metal compounds must be mixed with a further fitted scheme before they can sit on one convex hull. A model trained on corrected energies inherits those corrections; one trained on raw energies from a different database learns a different reference.

{{< note type="practice" title="Back of the envelope" >}}
How much of chemical space do the databases cover? Restrict yourself to 80 usable elements. There are $\binom{80}{4} \approx 1.6$ million quaternary element combinations, each with dozens of plausible stoichiometries and several possible structures per stoichiometry: of order $10^7$ to $10^8$ candidate quaternary compounds before anything exotic is considered. The Materials Project holds about 150,000 materials. Every database is a thin, non-random sample, concentrated on oxides, intermetallics and compounds someone already found interesting.
{{< /note >}}

{{< note type="practice" title="From the lab" >}}
Split the data as the model will be used. A random split of Materials Project entries places close relatives, such as the same structure with Na in place of K or a slightly different stoichiometry, on both sides, and the test error measures interpolation. For discovery, hold out whole chemical systems (all compounds containing a given element pair, for example) or cluster compositions and hold out clusters; errors typically grow, sometimes by a factor of two or more. Matbench fixes five-fold nested cross-validation splits on 13 tasks, from a few hundred to about 130,000 entries, so that published numbers can be compared, but its random splits do not test extrapolation, and a model that leads the benchmark can still fail on a new chemistry.
{{< /note >}}

## Stability: the convex hull

The most important property for materials discovery is whether a compound can exist. A negative formation energy is not enough: the compound must also be stable against decomposing into *other* compounds of the same elements. Plot the formation energy per atom of every known phase in a chemical system against composition and take the lower **convex hull**. Phases on the hull are thermodynamically stable (at 0 K, in DFT); a phase above it decomposes into the hull phases at its composition, and its **energy above hull** $E_{\text{hull}}$ measures by how much. Many metastable materials with $E_{\text{hull}}$ of a few tens of meV/atom can be synthesised, so $E_{\text{hull}}$ is a likelihood, not a verdict. Predicting $E_{\text{hull}}$ is harder than predicting formation energy, because small errors in the energies of competing phases shift the hull. Large-scale campaigns such as GNoME (2023) combined graph networks with DFT verification in active-learning loops to propose hundreds of thousands of new hull-stable crystals; how many of these can be made remains an open experimental question.

### The hull, worked by hand

The formation energy per atom of a compound $\mathrm A_x\mathrm B_y$ is measured from the elements,

$$
\Delta E_f = \frac{E(\mathrm A_x\mathrm B_y) - x\,\mu_{\mathrm A} - y\,\mu_{\mathrm B}}{x + y},
$$

where $\mu_{\mathrm A}$ and $\mu_{\mathrm B}$ are the energies per atom of the elemental reference phases. Take a hypothetical A–B system with five compounds: A₃B at $-0.30$ eV/atom, AB at $-0.50$, A₂B₃ at $-0.38$, AB₂ at $-0.35$ and AB₃ at $-0.10$. All five have negative formation energies. A₃B, AB and AB₂ lie on the lower hull. A₂B₃, at a B fraction of 0.6, sits between AB and AB₂, and the reaction A₂B₃ → AB + AB₂ balances exactly; the products have an average energy of $\big(2\times(-0.50) + 3\times(-0.35)\big)/5 = -0.41$ eV/atom, so A₂B₃ lies 30 meV/atom above the hull. AB₃ decomposes into AB₂ and B: $(3\times(-0.35) + 0)/4 = -0.2625$ eV/atom, 162 meV/atom below AB₃. The cell below finds the hull for any list of phases.

{{< py title="convex hull of a binary system" >}}
import numpy as np
# hypothetical A-B system: (name, fraction of B atoms, formation energy in eV/atom)
phases = [("A", 0, 0), ("A3B", 0.25, -0.30), ("AB", 0.5, -0.50), ("A2B3", 0.6, -0.38),
          ("AB2", 2/3, -0.35), ("AB3", 0.75, -0.10), ("B", 1, 0)]
x = np.array([p[1] for p in phases]); e = np.array([p[2] for p in phases])

hull = []                                # lower convex hull, scanning left to right
for i in np.argsort(x):
    while len(hull) >= 2:
        a, b = hull[-2], hull[-1]        # drop b if it lies on or above the line a -> i
        if (x[b] - x[a]) * (e[i] - e[a]) - (e[b] - e[a]) * (x[i] - x[a]) <= 0:
            hull.pop()
        else:
            break
    hull.append(i)

e_hull = e - np.interp(x, x[hull], e[hull])
for (name, xb, ef), eh in zip(phases, e_hull):
    status = "on the hull" if eh < 1e-9 else f"{1000 * eh:.0f} meV/atom above"
    print(f"{name:5s} x_B = {xb:.3f}  E_f = {ef:+.2f} eV/atom  {status}")
print("hull vertices:", [phases[i][0] for i in hull])
{{< /py >}}

{{< fig src="hull.svg" alt="Formation energy per atom against the fraction of B atoms for a hypothetical A–B system: a blue lower hull through A, A3B, AB, AB2 and B, with orange points for A2B3 30 meV/atom above the hull and AB3 162 meV/atom above it, each with an arrow down to the hull" caption="The hull of the worked example. A₂B₃ is metastable by 30 meV/atom and might be made; AB₃ is 162 meV/atom above and almost certainly will not be, although its formation energy is negative." >}}

The example also shows why $E_{\text{hull}}$ is harder to predict than $\Delta E_f$. A model with a 30 meV/atom error on each phase can put A₂B₃ on the hull or 60 meV/atom above it, and an error on AB or AB₂ moves the hull itself and changes the verdict for every compound nearby. Errors that are systematic across a chemical system partly cancel in $E_{\text{hull}}$; random errors do not.

{{< note type="practice" title="Back of the envelope" >}}
The hull is a zero-kelvin construction, and entropy can move it. Mixing two species at random on a lattice gives a configurational entropy of $k_B\ln 2$ per site, so at 1000 K it lowers the free energy by $k_B T\ln 2 = 60$ meV per site, enough to stabilise a solid solution that lies tens of meV/atom above the 0 K hull. Rost and colleagues (2015) used this deliberately: in (Mg,Co,Ni,Cu,Zn)O, five cations share one sublattice and $k_B T\ln 5$ at 1000 K is 139 meV per cation, about 69 meV per atom once the oxygens are counted. Vibrational entropy, magnetism and, for nanoparticles, surface energy shift the balance further.
{{< /note >}}

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

{{< note type="key" >}}
- A crystal is a lattice plus a basis; any cell that spans the lattice is valid, so representations must not depend on the cell, the origin or the atom order.
- Composition models need only the formula and are the tool when structures are unknown, but they give polymorphs one answer.
- Crystal graphs connect atoms to neighbours and their periodic images within a cut-off; edge counts grow as the cube of the cut-off.
- Database labels are DFT, usually PBE with fitted corrections, and the data are a biased sample of chemical space; split by chemistry to test discovery.
- Stability is the energy above the convex hull of competing phases, not the sign of the formation energy, and it is a 0 K, DFT-level estimate.
{{< /note >}}

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
- q: "In the worked A–B example, A₂B₃ (−0.38 eV/atom) decomposes into AB (−0.50) and AB₂ (−0.35). What is its energy above the hull?"
  options: ["0 meV/atom, because its formation energy is negative", "30 meV/atom", "120 meV/atom"]
  answer: 1
  why: "The products average $(2 \\times (-0.50) + 3 \\times (-0.35))/5 = -0.41$ eV/atom, 0.03 eV/atom below A₂B₃."
- q: "The conventional cubic cell of NaCl holds 8 ions and the primitive cell 2. A per-atom model sums atomic energies over the cell. What should it predict per formula unit for the two cells?"
  options: ["The same value, because both cells contain identical atomic environments", "Four times more for the conventional cell", "It depends on the cell angles"]
  answer: 0
  why: "Every ion has the same neighbours in both descriptions, so the per-atom energies agree; the cell total scales with the number of ions, and the energy per formula unit is unchanged."
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
13. S. R. Hall, F. H. Allen and I. D. Brown, “The Crystallographic Information File (CIF): a new standard archive file for crystallography,” *Acta Crystallographica A* **47**, 655–685 (1991).
14. A. Y.-T. Wang, S. K. Kauwe, R. J. Murdock and T. D. Sparks, “Compositionally restricted attention-based network for materials property predictions,” *npj Computational Materials* **7**, 77 (2021) (CrabNet).
15. T. Xie, X. Fu, O.-E. Ganea, R. Barzilay and T. Jaakkola, “Crystal diffusion variational autoencoder for periodic material generation,” *International Conference on Learning Representations* (2022).
16. C. M. Rost, E. Sachet, T. Borman, A. Moballegh, E. C. Dickey, D. Hou, J. L. Jones, S. Curtarolo and J.-P. Maria, “Entropy-stabilized oxides,” *Nature Communications* **6**, 8485 (2015).

</div>
