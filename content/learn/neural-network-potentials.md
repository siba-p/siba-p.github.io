---
title: "Atomic neural-network potentials"
description: "The high-dimensional neural-network potential in full: atomic decomposition, atom-centred symmetry functions, element-specific networks, forces by the chain rule, training on energies and forces, many-element systems, the ANI family and transfer learning to coupled-cluster accuracy, the Deep Potential embedding and DP-GEN, and the four generations of network potentials that add electrostatics and charge transfer."
hook: "In 2007 Behler and Parrinello let one small neural network assign an energy to each silicon atom from a description of its neighbours, then added the results. Almost every machine-learned potential since is a variation on that idea."
objectives:
  - "Write the Behler–Parrinello energy as a sum of element-specific atomic networks"
  - "Compute forces by the chain rule through symmetry-function descriptors"
  - "Explain why training on forces gives far better potentials than energies alone"
  - "Compare ANI's transfer learning with Deep Potential's learned descriptors and DP-GEN"
  - "Recognise when third- or fourth-generation networks are needed for long-range electrostatics"
cover: "cover.svg"
milestones:
  - year: 2007
    text: "Behler and Parrinello publish the high-dimensional neural-network potential for silicon"
  - year: 2017
    text: "Smith, Isayev and Roitberg release ANI-1 for organic molecules"
  - year: 2018
    text: "Zhang, Han, Wang, Car and E introduce Deep Potential molecular dynamics"
  - year: 2021
    text: "Ko, Finkler, Goedecker and Behler add global charge equilibration"
track: mlmodels
weight: 2
level: Advanced
prereqs: ["kernel-and-linear-potentials", "backpropagation"]
lab: "Trace the Behler–Parrinello architecture live, and train a small atomic network in the browser"
---

## The high-dimensional neural network potential

The neural-network potential of Jörg Behler and Michele Parrinello (2007) is the template from which most of the field grew, and it is worth understanding completely. Its three ingredients, introduced in [the history](../history-of-interatomic-potentials/) and justified in [the chapter on what an MLIP must learn](../mlip-foundations/), are the atomic decomposition of the energy, a symmetric description of each atom's neighbourhood, and one feed-forward neural network per chemical element that maps that description to an atomic energy. Behler called it a **high-dimensional neural network potential** (HDNNP) because, unlike the networks of the 1990s, it describes systems with any number of atoms and therefore any number of dimensions.

The figure follows a configuration through the model. Each atom's neighbours within the cutoff are summarised in a descriptor vector; the same network turns every descriptor into an atomic energy; the atomic energies add up to the total.

{{< widget name="bpnnarch" title="The Behler–Parrinello architecture" caption="1: atoms and the cutoff sphere of the selected atom (rose). 2: its descriptor, smooth radial functions summed over neighbours. 3: the atomic network, shared by all atoms of the element. 4: the atomic energies and their sum. Drag atoms and watch the descriptor, the atomic energies and the total change smoothly." >}}

### Why a sum of atomic energies is allowed

The decomposition $E = \sum_i E_i$ is an approximation, and it is worth knowing what justifies it. The total energy of a DFT calculation is not a sum of atomic contributions in any unique way; nothing in the Kohn–Sham equations assigns energy to atoms. What the decomposition needs is weaker: that the energy change caused by moving one atom depends, to good accuracy, only on the atoms near it. Walter Kohn called this property the **nearsightedness of electronic matter** (1996): in systems with a band gap the one-particle density matrix decays exponentially with distance, and in metals at finite temperature it also decays, more slowly. Local perturbations have local consequences, so a sum of local terms can represent the energy to within an error that falls as the cutoff grows. Electrostatics of net charges and dipoles is the main exception, which is why the last section of this chapter exists.

The decomposition buys three things at once. The energy is **extensive**: two copies of a system far apart have twice the energy, because no term couples them. The cost is **linear in the number of atoms**, because each atom sees a bounded number of neighbours. And a model trained on 64-atom cells can be applied to cells of 10 000 atoms, because a 10 000-atom cell is, to the network, just 10 000 local environments of the kind it has already seen. The atomic energies themselves are not observables, and two equally accurate potentials can partition the same total energy differently between atoms; only their sum, and its derivatives, are fitted to anything.

{{< note type="practice" title="Back of the envelope: what one atom costs" >}}
In fcc copper, a 5 Å cutoff contains 42 neighbours (12 at 2.55 Å, 6 at 3.61 Å and 24 at 4.42 Å). Radial functions need one pass over 42 distances; angular functions need every pair of neighbours, 42 × 41 / 2 = 861 triplets, each requiring a cosine, a power and a radial factor for every angular function. With 16 angular functions that is roughly 14 000 angular terms per atom, against about 2 500 multiply-adds for a 50–30–30–1 network. The descriptor, not the network, dominates the cost of a Behler–Parrinello potential, which is why production codes such as n2p2 and RuNNer spend most of their optimisation effort on symmetry-function evaluation and caching of the cutoff function. A plane-wave DFT step for 100 copper atoms takes minutes on a multi-core node; the network evaluates the same 100 atoms in milliseconds on one core.
{{< /note >}}

## Atom-centred symmetry functions

The descriptors Behler used, systematised in his 2011 paper, are **atom-centred symmetry functions** (ACSFs). Every function is a sum over neighbours, so it does not depend on their order, and it uses only distances and angles, so it does not depend on rotation or translation. A smooth cutoff function $f_c(r)$, equal to 1 at short range and falling smoothly to zero at $r_c$, multiplies every term.

{{< eq title="Radial and angular symmetry functions" say="Count neighbours in soft shells of distance; count pairs of neighbours by the angle they make." >}}
$$ G^{2}_{i} = \sum_{j \ne i} e^{-\textcolor{#845ef7}{\eta}\,(r_{ij} - \textcolor{#845ef7}{R_s})^2} f_c(r_{ij}), \qquad G^{4}_{i} = 2^{1-\textcolor{#12a594}{\zeta}} \sum_{j,k \ne i} \big(1 + \textcolor{#12a594}{\lambda}\cos\theta_{ijk}\big)^{\textcolor{#12a594}{\zeta}}\, e^{-\textcolor{#845ef7}{\eta}(r_{ij}^2 + r_{ik}^2 + r_{jk}^2)}\, f_c(r_{ij}) f_c(r_{ik}) f_c(r_{jk}) $$
- $G^2$: a soft count of neighbours near distance $\textcolor{#845ef7}{R_s}$, with resolution set by $\textcolor{#845ef7}{\eta}$; a set of $(\eta, R_s)$ pairs is a radial histogram of the environment
- $G^4$: angular functions; $\textcolor{#12a594}{\lambda} = \pm 1$ centres them on $0°$ or $180°$, and $\textcolor{#12a594}{\zeta}$ sharpens them
- $f_c(r) = \tfrac12\left[\cos(\pi r / r_c) + 1\right]$ for $r < r_c$, and 0 beyond
{{< /eq >}}

A typical potential uses 30 to 100 symmetry functions per element. Their parameters are chosen so that the radial functions resolve the neighbour shells of the materials involved and the angular functions distinguish the relevant bond angles, and the inputs are standardised (shifted and scaled to zero mean and unit variance over the training set) before entering the network. Choosing them is partly an art, and a poor choice limits the accuracy of the whole potential; the tutorial in [the chapter on building an MLIP](../build-your-own-mlip/) shows a set that is too smooth to resolve the neighbour shells of copper failing to fit forces, and a sharper set succeeding. [The chapter on descriptors](../symmetry-descriptors/) compares ACSFs with SOAP and ACE.

### A worked example: the fingerprint of a copper atom

To see what a set of radial functions actually measures, take an atom in perfect fcc copper ($a = 3.61$ Å) and a single radial function with $\eta = 4$ Å$^{-2}$ (a Gaussian of width $1/\sqrt{2\eta} = 0.35$ Å) centred at $R_s = 2.55$ Å, the first-neighbour distance, with $r_c = 5$ Å. The 12 first neighbours sit exactly at the centre of the Gaussian, so each contributes $f_c(2.55) = \tfrac12[\cos(0.51\pi) + 1] = 0.484$, giving 5.81. The 6 second neighbours at 3.61 Å contribute $e^{-4 \times 1.06^2} f_c(3.61) = 0.011 \times 0.179$ each, about 0.012 in total, and the 24 third neighbours at 4.42 Å contribute less than $10^{-6}$. The function is, to two decimals, a count of first neighbours weighted by the cutoff: $G^2 = 5.81$.

Sweeping $R_s$ continuously turns the descriptor into a smoothed radial distribution function seen from one atom, and the figure compares it for fcc and bcc copper at the same density. The two crystals look alike to a single function at 2.5 Å, because bcc has 8 neighbours at 2.48 Å and 6 at 2.87 Å that merge into one broad peak of similar weight, but they differ clearly at 3.2 Å and 3.6 Å. Eight functions at evenly spaced $R_s$ produce the two eight-component vectors on the right, which is all the network ever sees of the radial structure. Note also how strongly the cosine cutoff suppresses the third shell: 24 atoms at 4.42 Å carry a weight of only 0.033 each.

{{< fig src="fingerprint.svg" alt="Left: radial symmetry function value against shell centre for an atom in fcc and in bcc copper at equal density; both peak near 2.55 angstrom and differ beyond 3 angstrom. Right: bar chart of the eight-component radial descriptor for fcc and bcc." caption="Radial symmetry functions with η = 4 Å$^{-2}$ and $r_c$ = 5 Å for one atom in perfect fcc ($a$ = 3.61 Å) and bcc copper of the same density. The descriptor is a smoothed neighbour count; the cutoff function shrinks distant shells, so the radial resolution is best at short range." >}}

The angular functions do the same for bond angles. The factor $2^{1-\zeta}(1 + \lambda\cos\theta)^\zeta$ equals 2 at $\theta = 0°$ for $\lambda = +1$ and at $180°$ for $\lambda = -1$, and $\zeta$ sets how sharply it falls away. With $\zeta = 1$ the function is a gentle cosine and responds to every angle; with $\zeta = 16$ it is essentially zero beyond 50° from its peak, so it detects only nearly linear or nearly overlapping arrangements. A set mixing small and large $\zeta$ with both signs of $\lambda$ distinguishes the 60°, 90°, 120° and 180° angles of close-packed metals from the 109.5° of tetrahedral silicon or carbon. Because each function is a sum over all neighbour pairs, these are smoothed angular distributions, not angle detectors for individual bonds.

{{< fig src="angular.svg" alt="Angular factor of the G4 symmetry function against bond angle from 0 to 180 degrees, for zeta 1, 4 and 16 with lambda plus one (blue, peaking at 0 degrees) and minus one (orange, peaking at 180 degrees); vertical lines at 60, 90, 109.5, 120 and 180 degrees." caption="The angular factor of $G^4$. Larger ζ narrows the function around 0° (λ = +1) or 180° (λ = −1). The first-neighbour angles of fcc metals are 60°, 90°, 120° and 180°; tetrahedral bonding gives 109.5°, where only the broad functions respond." >}}

{{< note type="try" title="Pause and predict" >}}
Double the cutoff from 5 Å to 10 Å for copper. By what factor do the number of neighbours and the number of angular triplets grow? Neighbours scale with volume, so expect $2^3 = 8$; triplets scale with the square of the neighbour count, so expect about 64. Counting the real lattice gives 368 neighbours instead of 42 (a factor 8.8) and 67 528 triplets instead of 861 (a factor 78). This is why angular functions usually have a shorter cutoff than radial ones, and why long cutoffs are expensive in every descriptor-based model.
{{< /note >}}

{{< note type="warn" title="Myth: more symmetry functions are always better" >}}
Adding functions adds inputs that are often nearly linear combinations of each other; strongly correlated inputs slow training and add noise without adding information. Giulio Imbalzano, Michele Ceriotti, Jörg Behler and colleagues (2018) showed that a few dozen functions chosen from a large pool by CUR decomposition or farthest-point sampling in feature space give the same accuracy as much larger hand-made sets. The useful check is the opposite one: if two structures with clearly different reference energies or forces have nearly identical descriptor vectors, the set is too poor, and no network can fix it.
{{< /note >}}

## The atomic network and the chain rule for forces

The atomic network is a small multilayer perceptron, typically two or three hidden layers of 20 to 100 neurons with smooth activation functions such as tanh, softplus or SiLU (swish). With 50 inputs and two hidden layers of 30 neurons it has about 2500 weights per element, a tiny network by deep-learning standards, evaluated once per atom per time step.

Forces require the derivative of the total energy with respect to every atomic position. Each atomic energy depends on positions only through descriptors, so the chain rule splits the derivative into a network part and a descriptor part:

{{< eq title="Forces through the descriptors" say="How much the energy changes when an atom moves equals how much each descriptor changes times how much the energy cares about that descriptor, summed over every atom whose descriptors it affects." >}}
$$ \textcolor{#f08c2e}{\mathbf F_k} = -\frac{\partial E}{\partial \mathbf r_k} = -\sum_{i}\sum_{\mu} \underbrace{\frac{\partial E_i}{\partial G_{i\mu}}}_{\text{backpropagation}}\;\underbrace{\frac{\partial G_{i\mu}}{\partial \mathbf r_k}}_{\text{analytic}} $$
- the sum over $i$ runs over atom $k$ itself and every atom within the cutoff of $k$, because moving $k$ changes all their descriptors
- modern codes obtain the whole expression by automatic differentiation of the energy
{{< /eq >}}

The first factor comes from backpropagating through the network, exactly as in [the chapter on backpropagation](../backpropagation/); the second is the derivative of the symmetry functions, which is analytic. Because forces are derived from a single energy function, they are conservative.

The cell below writes the chain rule out by hand for twelve atoms, eight radial functions and a network with one hidden layer of ten tanh neurons and random weights. It computes $\partial E_i / \partial G_{i\mu}$ by backpropagation through the network, $\partial G_{i\mu}/\partial r_{ij}$ from the derivatives of the Gaussian and the cutoff function, and compares the resulting forces with central finite differences of the total energy. It then nudges atom 0 and lists which atomic energies change.

{{< py title="forces by the chain rule, checked against finite differences" >}}
import numpy as np
rng = np.random.default_rng(0)
RC, ETA, RS = 5.0, 2.0, np.linspace(1.0, 4.5, 8)       # cutoff (Å), 1/Å², eight shell centres (Å)
W, b, v = rng.normal(0, 0.5, (8, 10)), rng.normal(0, 0.1, 10), rng.normal(0, 0.5, 10)
def parts(R):                                         # neighbour vectors, distances, G2 terms and their slopes
    d = R[None] - R[:, None]                          # d[i, j] = r_j - r_i
    r = np.linalg.norm(d, axis=-1) + 99 * np.eye(len(R))   # push self-pairs beyond the cutoff
    fc, dfc = 0.5 * (np.cos(np.pi * r / RC) + 1) * (r < RC), -0.5 * np.pi / RC * np.sin(np.pi * r / RC) * (r < RC)
    e = np.exp(-ETA * (r[..., None] - RS) ** 2)
    return d, r, e * fc[..., None], e * (dfc[..., None] - 2 * ETA * (r[..., None] - RS) * fc[..., None])
def atomic_energies(R):                               # E_i = NN(G_i), the same network for every atom
    return np.tanh(parts(R)[2].sum(1) @ W + b) @ v
def forces(R):                                        # chain rule: dE/dG by backpropagation, dG/dr analytic
    d, r, g, dg = parts(R)
    h = np.tanh(g.sum(1) @ W + b)
    c = (dg * (((1 - h ** 2) * v) @ W.T)[:, None, :]).sum(-1) / r   # dE/dr_ij divided by r_ij
    return (c[..., None] * d).sum(1) - (c[..., None] * d).sum(0)
R, h = rng.uniform(0, 9, (12, 3)), 1e-5               # twelve atoms scattered in a 9 Å box
fd = np.zeros_like(R)
for k, a in np.ndindex(R.shape):                      # finite differences, one coordinate at a time
    dR = np.zeros_like(R); dR[k, a] = h
    fd[k, a] = -(atomic_energies(R + dR).sum() - atomic_energies(R - dR).sum()) / (2 * h)
print(f"largest force component {np.abs(fd).max():.3f}; chain rule minus finite difference {np.abs(forces(R) - fd).max():.0e}")
changed = np.abs(atomic_energies(R + 0.05 * (np.arange(12) == 0)[:, None]) - atomic_energies(R)) > 1e-12
print("nudge atom 0: energies that change", np.flatnonzero(changed), "; atoms within 5 Å of it", np.flatnonzero(np.linalg.norm(R - R[0], axis=1) < RC))
{{< /py >}}

The two force calculations agree to $3 \times 10^{-10}$ in units where the largest component is 1.8, which is the rounding error of the finite difference. Moving atom 0 changes exactly three atomic energies: its own and those of atoms 10 and 11, the only atoms within 5 Å of it. This locality is what makes the force on an atom a sum over its neighbourhood only, and what lets molecular-dynamics codes split space among processors. It also explains a practical detail: the descriptor derivatives $\partial G_{i\mu}/\partial \mathbf r_k$ form a sparse array with one entry per symmetry function, per atom and per neighbour, which for 50 functions and 40 neighbours is 6 000 numbers per atom, and storing them for a whole training set is one of the main memory costs of training on forces.

## Training

The network weights are fitted by minimising a loss combining energy and force errors, as in [the chapter on what an MLIP must learn](../mlip-foundations/), with Adam or, in Behler's original work, a Kalman-filter optimiser. Including forces in the loss requires differentiating the force expression with respect to the weights, a second-order derivative that automatic-differentiation frameworks handle by keeping the computational graph of the first derivative (`create_graph=True` in PyTorch). The data are split into training, validation and test sets; the validation error decides when to stop training and which hyperparameters to keep, and the test error is reported.

The figure below trains a small atomic network in your browser. The system is a two-dimensional cluster of five atoms interacting through a smoothly truncated Lennard-Jones potential; each atom is described by eight radial symmetry functions; the network has two hidden layers. To keep the browser fast, it is trained on **energies only**. Watch the three panels: the learning curve, the parity plot of predicted against true energies for test structures, and the parity plot of the forces, computed exactly as the negative gradient of the trained network.

{{< widget name="mliptrain" title="Training an atomic neural network" caption="Left: training and test energy errors against training steps (log scale). Middle: predicted against true energies of test structures. Right: predicted against true force components, which the network was never trained on. Change the training-set size and the network width and train again." >}}

Two lessons appear quickly. With 30 training structures the network fits the training energies well but the test error stays high, a clear case of overfitting; with 480 structures training and test errors track each other. And even when the energies are learned well, the forces are noticeably worse, because a network trained only on energies is never told the slope of the surface. Real potentials are therefore trained on forces, which also supply $3N$ labels per structure instead of one.

{{< note type="practice" title="From the lab" >}}
A Behler–Parrinello potential for a condensed phase is typically trained with RuNNer, Behler's own code, or n2p2 (Andreas Singraber, Jörg Behler and Christoph Dellago, 2019), which also provides the LAMMPS interface used for production runs. A common recipe is a few thousand DFT structures of 50 to 200 atoms, two hidden layers of 15 to 30 neurons, and a few hundred epochs of Kalman-filter or Adam training, followed by long test simulations. Both codes record the minimum and maximum of every symmetry function over the training set and issue an **extrapolation warning** whenever a simulation produces a value outside that range. A run that triggers many warnings is reaching environments the network never saw: the frames that triggered them are the obvious candidates for new DFT calculations, the cheapest form of the [active learning](../active-learning/) loop.
{{< /note >}}

## Many elements

For a system with several elements, each element has its own network, and the descriptors must distinguish neighbours by element: a radial function counting oxygen neighbours of a hydrogen atom is different from one counting hydrogen neighbours. With $S$ elements, radial functions grow with $S$ and angular functions with the number of element pairs, roughly $S^2/2$, so descriptor sets for five or more elements become unwieldy, and every network must be trained with data covering all the element combinations it will meet. Remedies include **element-weighted symmetry functions** that weight each neighbour by a property of its element instead of creating separate functions per element (Gastegger and colleagues, 2018), and learned element embeddings, the approach taken by message-passing networks and universal potentials.

The figure counts the cost for a modest set of 8 radial functions per neighbour element and 16 angular functions per unordered pair of neighbour elements. A one-element potential needs 24 inputs; a binary oxide needs 64; a five-component high-entropy alloy needs 280; a ten-element system needs 960, and each of its ten element networks has an input layer that large. Training data must also contain every element pair in enough environments for the corresponding inputs to be informative, so the data requirement grows with the descriptor. Element-weighted functions keep the input size fixed at 24 by replacing the per-element counts with a single count weighted by, for example, the atomic number, at the price of no longer distinguishing a neighbour of one element at one distance from a neighbour of another element whose weight happens to compensate.

{{< fig src="elements.svg" alt="Line chart of symmetry functions per atom against number of elements from 1 to 10: element-resolved sets grow from 24 to 960, the radial part grows linearly from 8 to 80, and element-weighted functions stay at 24." caption="Input size of element-resolved symmetry functions, with 8 radial functions per element and 16 angular functions per element pair, against the number of elements S. The angular part grows as S(S+1)/2 and dominates beyond two elements; element-weighted functions keep the input fixed." >}}

## What second-generation networks have been used for

The local HDNNP has been applied to a wide range of materials, and a few studies show what it does well. The original 2007 paper fitted silicon to DFT energies and reproduced the energy–volume curves of several crystal phases and the radial distribution function of hot silicon from DFT molecular dynamics; a year later Behler, Roman Martoňák, Davide Donadio and Parrinello used the potential with metadynamics to follow the pressure-induced transitions between silicon's high-pressure phases. Gabriele Sosso, Marco Bernasconi, Behler and colleagues (2012) built a potential for the phase-change memory material GeTe and then used it to simulate the crystallisation of its supercooled liquid in cells of thousands of atoms over nanoseconds, a process central to how phase-change memory cells switch and out of reach of direct DFT. Tobias Morawietz, Behler and colleagues (2016) trained networks on water with dispersion-corrected functionals and showed that van der Waals interactions are needed to reproduce the density maximum of liquid water and the fact that ice floats. Bingqing Cheng, Behler, Christoph Dellago, Michele Ceriotti and colleagues (2019) combined such a potential with free-energy methods and path-integral simulations to compute the relative stability of ice phases and the melting of ice including nuclear quantum effects. Water at copper surfaces, zinc oxide and its surfaces, and lithium-ion battery materials followed. In each case the network replaced DFT only after it had been validated on properties close to the target, an approach described in [the chapter on training and validation](../mlip/).

## ANI: transferable potentials for organic molecules

Justin Smith, Olexandr Isayev and Adrian Roitberg's **ANI-1** (2017) applied the Behler–Parrinello architecture, with modified angular symmetry functions, to organic molecules containing H, C, N and O, trained on about 20 million DFT calculations of conformations of small molecules. It was among the first network potentials designed to transfer to molecules outside its training set. ANI-1x (2018) built its data set by **active learning**, adding only conformations on which an ensemble of networks disagreed, and reached similar accuracy with a fraction of the data. **ANI-1ccx** (2019) then used **transfer learning**: a network pre-trained on a large DFT data set was retrained on a much smaller set of coupled-cluster CCSD(T) energies, producing a potential that approaches coupled-cluster accuracy for reaction thermochemistry and torsion profiles at a cost billions of times smaller. ANI-2x (2020) extended the element set to S, F and Cl. The ANI models showed three ideas that are now standard: large chemically diverse data sets, active learning to build them, and transfer from cheap to expensive levels of theory.

## Deep Potential

The **Deep Potential** of Linfeng Zhang, Jiequn Han, Han Wang, Roberto Car and Weinan E (2018) keeps the atomic decomposition but replaces hand-chosen symmetry functions by a learned description. In the widely used DeepPot-SE ("smooth edition") form, each neighbour's relative position is encoded in a row of a matrix $\mathcal R_i$ (containing a smooth function of distance $s(r_{ij})$ and the scaled relative vector), and an **embedding network** maps $s(r_{ij})$ to a learned feature vector for each neighbour, forming a matrix $\mathcal G_i$. The descriptor

$$
\mathcal D_i = (\mathcal G_i^{1})^{\mathsf T}\,\mathcal R_i\,(\mathcal R_i)^{\mathsf T}\,\mathcal G_i^{2}
$$

is invariant to rotation (the products $\mathcal R_i\mathcal R_i^{\mathsf T}$ contain only dot products of neighbour vectors), to translation and to permutation (sums over neighbours), and its features are learned rather than chosen. A fitting network then maps $\mathcal D_i$ to the atomic energy.

Deep Potential's influence comes as much from its software as from its architecture. DeePMD-kit made training and running potentials straightforward and integrated them with LAMMPS and GPUs, and **DP-GEN** automated a concurrent-learning loop: train an ensemble of models, run molecular dynamics with them, select configurations where the models disagree, compute them with DFT, and repeat. With these tools Deep Potential models were built for water and ice, metals and alloys, and battery materials; a Deep Potential water model was used to compute the phase diagram of water over a wide range of temperatures and pressures, and a 2020 simulation of about 100 million atoms with ab initio accuracy on the Summit supercomputer won the Gordon Bell Prize.

## Four generations: adding long-range physics

Behler has classified network potentials into **generations**. The first generation were the low-dimensional networks of the 1990s. The second generation, the HDNNP described above, is local: each atomic energy depends only on the cutoff sphere. This is sufficient for many materials, but it misses electrostatics beyond the cutoff, which matters for ionic materials, interfaces and molecules in solution.

The **third generation** adds a second set of networks that predict an environment-dependent charge on each atom, also from symmetry functions; the electrostatic energy of these charges is computed exactly, with Ewald summation in periodic systems, and added to the short-range energy. Charges are learned from a reference such as Hirshfeld charges, or adjusted to reproduce DFT dipole moments. The charges are still local, however, and cannot respond to distant changes in the system. The **fourth generation** (4G-HDNNP, Ko, Finkler, Goedecker and Behler, 2021) determines the charges by a global **charge equilibration**: networks predict an electronegativity for each atom, and the charges are found by minimising a charge-dependent energy for the whole system subject to total charge. This captures non-local charge transfer, for example between a cluster and a distant dopant, which no local model can describe. Other approaches to long-range physics include explicit dispersion corrections, learned long-range descriptors, and the latent Ewald summation used in some message-passing models.

{{< fig src="generations.svg" alt="Three schematic panels of atom clusters with a dashed cutoff circle. Second generation: neutral atoms, local energy sum. Third generation: atoms carry plus and minus charges and a distant charged atom interacts through a dashed arrow. Fourth generation: the distant atom's charge flows into the cluster through a solid arrow; charges come from a global minimisation." caption="Three generations of high-dimensional network potentials. The second is strictly local; the third adds charges predicted from each atom's own environment and sums their Coulomb energy exactly; the fourth predicts electronegativities and finds all charges together, so charge can redistribute across the whole system." >}}

The charge equilibration step of the fourth generation is classical in form, going back to the QEq method of Anthony Rappé and William Goddard (1991). Each atom carries a Gaussian charge density of fixed width, and the charges $q_i$ minimise

$$
E_{\mathrm{Qeq}} = \sum_i \left( \textcolor{#845ef7}{\chi_i}\, q_i + \tfrac12 \textcolor{#12a594}{J_i}\, q_i^2 \right) + \tfrac12 \sum_{i \ne j} \frac{\operatorname{erf}(r_{ij}/\sqrt{2}\gamma_{ij})}{r_{ij}}\, q_i q_j \qquad \text{subject to}\quad \sum_i q_i = Q,
$$

where $\gamma_{ij} = (\sigma_i^2 + \sigma_j^2)^{1/2}$ combines the widths of the two Gaussian charges, the self-energy of each Gaussian is absorbed into the hardness $J_i$, a fitted element constant, and the electronegativity $\chi_i$ is the output of an element network acting on the atom's symmetry functions. Setting the derivatives with respect to every $q_i$ equal to a common Lagrange multiplier gives a linear system of $N + 1$ equations, solved at every time step. In this way a distant dopant changes the electronegativities only locally, but the linear solve spreads the consequence across the whole system. The cost is the price: the dense solve scales as $N^3$ unless iterative solvers are used, and the reference data must include structures in which charge transfer actually happens, with charges taken from the DFT density, so that the model learns more than the short-range energy.

{{< note type="warn" title="How to tell that a local potential is not enough" >}}
Three symptoms point to missing long-range physics. Errors that grow with the size of the training cell rather than with temperature suggest long-range electrostatics. Systematically wrong energies for structures that differ only far from a defect, such as two charge states of the same vacancy or a slab with different terminations on its two faces, suggest charge transfer. And interface or surface energies that refuse to converge as the cutoff is increased suggest that the interaction range exceeds any affordable cutoff. In those cases a third- or fourth-generation model, or a message-passing model with an explicit long-range term, is needed rather than more data.
{{< /note >}}

{{< note type="key" >}}
- The HDNNP writes $E = \sum_i \mathrm{NN}_{Z_i}(\mathbf G_i)$ with one network per element and atom-centred symmetry functions as input.
- Radial $G^2$ functions are soft neighbour counts in distance shells; angular $G^4$ functions resolve bond angles; all are smooth, symmetric and cut off at $r_c$.
- Forces follow by the chain rule through the descriptors, computed today by automatic differentiation; training on forces is essential.
- Many-element systems need element-resolved or element-weighted descriptors; ANI showed transferability, active learning and transfer learning to CCSD(T).
- Deep Potential learns its descriptor with an embedding network and, with DP-GEN, automated large-scale potential building; third- and fourth-generation networks add learned charges and global charge equilibration.
- The sum over atoms rests on the nearsightedness of electronic matter; the descriptor, not the network, dominates the cost of evaluation.
{{< /note >}}

{{< quiz >}}
- q: "Why does the Behler–Parrinello potential use one network per element rather than one per atom?"
  options: ["To save memory only", "Weight sharing makes the energy permutation-invariant among identical atoms and lets the model apply to any number of atoms", "Elements have different masses"]
  answer: 1
  why: "All atoms of an element are treated by the same function of their environment."
- q: "Moving atom k changes which atomic energies?"
  options: ["Only E_k", "E_k and the energies of all atoms within the cutoff of k", "All atomic energies in the system"]
  answer: 1
  why: "Atom k enters the descriptors of every neighbour within r_c."
- q: "A network trained only on energies predicts forces poorly. Why?"
  options: ["Forces cannot be computed from a network", "The loss never constrains the slope of the learned surface, only its values at the training structures", "The network is too large"]
  answer: 1
  why: "Force labels constrain derivatives directly and add 3N labels per structure."
- q: "What did ANI-1ccx demonstrate?"
  options: ["That DFT is unnecessary", "Transfer learning: pre-train on large DFT data, then retrain on a small CCSD(T) set to approach coupled-cluster accuracy", "That networks need no data"]
  answer: 1
  why: "The cheap data teach the general shape; the expensive data correct it."
- q: "What physics does a fourth-generation network potential add over a second-generation one?"
  options: ["Temperature", "Non-local charge transfer through global charge equilibration", "Quantum nuclear effects"]
  answer: 1
  why: "Charges are found by minimising a global energy, so they respond to distant changes."
- q: "Doubling the cutoff of a copper potential from 5 to 10 Å multiplies the number of angular triplets per atom by roughly what factor?"
  options: ["2", "8", "About 64 to 80"]
  answer: 2
  why: "Neighbours scale as the cube of the cutoff (42 to 368 in fcc copper), and triplets as the square of the neighbour count (861 to 67 528)."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. Behler and M. Parrinello, "Generalized neural-network representation of high-dimensional potential-energy surfaces", *Physical Review Letters* **98**, 146401 (2007).
2. J. Behler, "Atom-centered symmetry functions for constructing high-dimensional neural network potentials", *Journal of Chemical Physics* **134**, 074106 (2011).
3. J. Behler, "Four generations of high-dimensional neural network potentials", *Chemical Reviews* **121**, 10037–10072 (2021).
4. M. Gastegger, L. Schwiedrzik, M. Bittermann, F. Berzsenyi and P. Marquetand, "wACSF—weighted atom-centered symmetry functions as descriptors in machine learning potentials", *Journal of Chemical Physics* **148**, 241709 (2018).
5. J. S. Smith, O. Isayev and A. E. Roitberg, "ANI-1: an extensible neural network potential with DFT accuracy at force field computational cost", *Chemical Science* **8**, 3192–3203 (2017).
6. J. S. Smith, B. Nebgen, N. Lubbers, O. Isayev and A. E. Roitberg, "Less is more: sampling chemical space with active learning", *Journal of Chemical Physics* **148**, 241733 (2018).
7. J. S. Smith et al., "Approaching coupled cluster accuracy with a general-purpose neural network potential through transfer learning", *Nature Communications* **10**, 2903 (2019).
8. L. Zhang, J. Han, H. Wang, R. Car and W. E, "Deep potential molecular dynamics: a scalable model with the accuracy of quantum mechanics", *Physical Review Letters* **120**, 143001 (2018).
9. L. Zhang, J. Han, H. Wang, W. A. Saidi, R. Car and W. E, "End-to-end symmetry preserving inter-atomic potential energy model for finite and extended systems", *Advances in Neural Information Processing Systems* **31** (2018).
10. H. Wang, L. Zhang, J. Han and W. E, "DeePMD-kit: a deep learning package for many-body potential energy representation and molecular dynamics", *Computer Physics Communications* **228**, 178–184 (2018).
11. Y. Zhang et al., "DP-GEN: a concurrent learning platform for the generation of reliable deep learning based potential energy models", *Computer Physics Communications* **253**, 107206 (2020).
12. N. Artrith, T. Morawietz and J. Behler, "High-dimensional neural-network potentials for multicomponent systems: applications to zinc oxide", *Physical Review B* **83**, 153101 (2011).
13. T. W. Ko, J. A. Finkler, S. Goedecker and J. Behler, "A fourth-generation high-dimensional neural network potential with accurate electrostatics including non-local charge transfer", *Nature Communications* **12**, 398 (2021).
14. L. Zhang, H. Wang, R. Car and W. E, "Phase diagram of a deep potential water model", *Physical Review Letters* **126**, 236001 (2021).
15. W. Kohn, "Density functional and density matrix method scaling linearly with the number of atoms", *Physical Review Letters* **76**, 3168–3171 (1996).
16. J. Behler, R. Martoňák, D. Donadio and M. Parrinello, "Metadynamics simulations of the high-pressure phases of silicon employing a high-dimensional neural network potential", *Physical Review Letters* **100**, 185501 (2008).
17. G. Imbalzano, A. Anelli, D. Giofré, S. Klees, J. Behler and M. Ceriotti, "Automatic selection of atomic fingerprints and reference configurations for machine-learning potentials", *Journal of Chemical Physics* **148**, 241730 (2018).
18. A. Singraber, J. Behler and C. Dellago, "Library-based LAMMPS implementation of high-dimensional neural network potentials", *Journal of Chemical Theory and Computation* **15**, 1827–1840 (2019).
19. G. C. Sosso, G. Miceli, S. Caravati, J. Behler and M. Bernasconi, "Neural network interatomic potential for the phase change material GeTe", *Physical Review B* **85**, 174103 (2012).
20. T. Morawietz, A. Singraber, C. Dellago and J. Behler, "How van der Waals interactions determine the unique properties of water", *Proceedings of the National Academy of Sciences* **113**, 8368–8373 (2016).
21. B. Cheng, E. A. Engel, J. Behler, C. Dellago and M. Ceriotti, "Ab initio thermodynamics of liquid and solid water", *Proceedings of the National Academy of Sciences* **116**, 1110–1115 (2019).
22. A. K. Rappé and W. A. Goddard III, "Charge equilibration for molecular dynamics simulations", *Journal of Physical Chemistry* **95**, 3358–3363 (1991).

</div>
