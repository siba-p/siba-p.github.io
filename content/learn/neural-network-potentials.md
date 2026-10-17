---
title: "Atomic neural-network potentials: Behler–Parrinello, ANI and Deep Potential"
description: "The high-dimensional neural-network potential in full: atomic decomposition, atom-centred symmetry functions, element-specific networks, forces by the chain rule, training on energies and forces, many-element systems, the ANI family and transfer learning to coupled-cluster accuracy, the Deep Potential embedding and DP-GEN, and the four generations of network potentials that add electrostatics and charge transfer."
track: mlmodels
weight: 2
level: Advanced
prereqs: ["kernel-and-linear-potentials", "backpropagation"]
lab: "Trace the Behler–Parrinello architecture live, and train a small atomic network in the browser"
---

## The high-dimensional neural network potential

The neural-network potential of Jörg Behler and Michele Parrinello (2007) is the template from which most of the field grew, and it is worth understanding completely. Its three ingredients, introduced in [the history](../history-of-interatomic-potentials/) and justified in [the topic on what an MLIP must learn](../mlip-foundations/), are the atomic decomposition of the energy, a symmetric description of each atom's neighbourhood, and one feed-forward neural network per chemical element that maps that description to an atomic energy. Behler called it a **high-dimensional neural network potential** (HDNNP) because, unlike the networks of the 1990s, it describes systems with any number of atoms and therefore any number of dimensions.

The figure follows a configuration through the model. Each atom's neighbours within the cutoff are summarised in a descriptor vector; the same network turns every descriptor into an atomic energy; the atomic energies add up to the total.

{{< widget name="bpnnarch" title="The Behler–Parrinello architecture" caption="1: atoms and the cutoff sphere of the selected atom (rose). 2: its descriptor, smooth radial functions summed over neighbours. 3: the atomic network, shared by all atoms of the element. 4: the atomic energies and their sum. Drag atoms and watch the descriptor, the atomic energies and the total change smoothly." >}}

## Atom-centred symmetry functions

The descriptors Behler used, systematised in his 2011 paper, are **atom-centred symmetry functions** (ACSFs). Every function is a sum over neighbours, so it does not depend on their order, and it uses only distances and angles, so it does not depend on rotation or translation. A smooth cutoff function $f_c(r)$, equal to 1 at short range and falling smoothly to zero at $r_c$, multiplies every term.

{{< eq title="Radial and angular symmetry functions" say="Count neighbours in soft shells of distance; count pairs of neighbours by the angle they make." >}}
$$ G^{2}_{i} = \sum_{j \ne i} e^{-\textcolor{#845ef7}{\eta}\,(r_{ij} - \textcolor{#845ef7}{R_s})^2} f_c(r_{ij}), \qquad G^{4}_{i} = 2^{1-\textcolor{#12a594}{\zeta}} \sum_{j,k \ne i} \big(1 + \textcolor{#12a594}{\lambda}\cos\theta_{ijk}\big)^{\textcolor{#12a594}{\zeta}}\, e^{-\textcolor{#845ef7}{\eta}(r_{ij}^2 + r_{ik}^2 + r_{jk}^2)}\, f_c(r_{ij}) f_c(r_{ik}) f_c(r_{jk}) $$
- $G^2$: a soft count of neighbours near distance $\textcolor{#845ef7}{R_s}$, with resolution set by $\textcolor{#845ef7}{\eta}$; a set of $(\eta, R_s)$ pairs is a radial histogram of the environment
- $G^4$: angular functions; $\textcolor{#12a594}{\lambda} = \pm 1$ centres them on $0°$ or $180°$, and $\textcolor{#12a594}{\zeta}$ sharpens them
- $f_c(r) = \tfrac12\left[\cos(\pi r / r_c) + 1\right]$ for $r < r_c$, and 0 beyond
{{< /eq >}}

A typical potential uses 30 to 100 symmetry functions per element. Their parameters are chosen so that the radial functions resolve the neighbour shells of the materials involved and the angular functions distinguish the relevant bond angles, and the inputs are standardised (shifted and scaled to zero mean and unit variance over the training set) before entering the network. Choosing them is partly an art, and a poor choice limits the accuracy of the whole potential; the tutorial in [the topic on building an MLIP](../build-your-own-mlip/) shows a set that is too smooth to resolve the neighbour shells of copper failing to fit forces, and a sharper set succeeding. [The topic on descriptors](../symmetry-descriptors/) compares ACSFs with SOAP and ACE.

## The atomic network and the chain rule for forces

The atomic network is a small multilayer perceptron, typically two or three hidden layers of 20 to 100 neurons with smooth activation functions such as tanh, softplus or SiLU (swish). With 50 inputs and two hidden layers of 30 neurons it has about 2500 weights per element, a tiny network by deep-learning standards, evaluated once per atom per time step.

Forces require the derivative of the total energy with respect to every atomic position. Each atomic energy depends on positions only through descriptors, so the chain rule splits the derivative into a network part and a descriptor part:

{{< eq title="Forces through the descriptors" say="How much the energy changes when an atom moves equals how much each descriptor changes times how much the energy cares about that descriptor, summed over every atom whose descriptors it affects." >}}
$$ \textcolor{#f08c2e}{\mathbf F_k} = -\frac{\partial E}{\partial \mathbf r_k} = -\sum_{i}\sum_{\mu} \underbrace{\frac{\partial E_i}{\partial G_{i\mu}}}_{\text{backpropagation}}\;\underbrace{\frac{\partial G_{i\mu}}{\partial \mathbf r_k}}_{\text{analytic}} $$
- the sum over $i$ runs over atom $k$ itself and every atom within the cutoff of $k$, because moving $k$ changes all their descriptors
- modern codes obtain the whole expression by automatic differentiation of the energy
{{< /eq >}}

The first factor comes from backpropagating through the network, exactly as in [the topic on backpropagation](../backpropagation/); the second is the derivative of the symmetry functions, which is analytic. Because forces are derived from a single energy function, they are conservative.

## Training

The network weights are fitted by minimising a loss combining energy and force errors, as in [the topic on what an MLIP must learn](../mlip-foundations/), with Adam or, in Behler's original work, a Kalman-filter optimiser. Including forces in the loss requires differentiating the force expression with respect to the weights, a second-order derivative that automatic-differentiation frameworks handle by keeping the computational graph of the first derivative (`create_graph=True` in PyTorch). The data are split into training, validation and test sets; the validation error decides when to stop training and which hyperparameters to keep, and the test error is reported.

The figure below trains a small atomic network in your browser. The system is a two-dimensional cluster of five atoms interacting through a smoothly truncated Lennard-Jones potential; each atom is described by eight radial symmetry functions; the network has two hidden layers. To keep the browser fast, it is trained on **energies only**. Watch the three panels: the learning curve, the parity plot of predicted against true energies for test structures, and the parity plot of the forces, computed exactly as the negative gradient of the trained network.

{{< widget name="mliptrain" title="Training an atomic neural network" caption="Left: training and test energy errors against training steps (log scale). Middle: predicted against true energies of test structures. Right: predicted against true force components, which the network was never trained on. Change the training-set size and the network width and train again." >}}

Two lessons appear quickly. With 30 training structures the network fits the training energies well but the test error stays high, a clear case of overfitting; with 480 structures training and test errors track each other. And even when the energies are learned well, the forces are noticeably worse, because a network trained only on energies is never told the slope of the surface. Real potentials are therefore trained on forces, which also supply $3N$ labels per structure instead of one.

## Many elements

For a system with several elements, each element has its own network, and the descriptors must distinguish neighbours by element: a radial function counting oxygen neighbours of a hydrogen atom is different from one counting hydrogen neighbours. With $S$ elements, radial functions grow with $S$ and angular functions with the number of element pairs, roughly $S^2/2$, so descriptor sets for five or more elements become unwieldy, and every network must be trained with data covering all the element combinations it will meet. Remedies include **element-weighted symmetry functions** that weight each neighbour by a property of its element instead of creating separate functions per element (Gastegger and colleagues, 2018), and learned element embeddings, the approach taken by message-passing networks and universal potentials.

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

{{< note type="key" >}}
- The HDNNP writes $E = \sum_i \mathrm{NN}_{Z_i}(\mathbf G_i)$ with one network per element and atom-centred symmetry functions as input.
- Radial $G^2$ functions are soft neighbour counts in distance shells; angular $G^4$ functions resolve bond angles; all are smooth, symmetric and cut off at $r_c$.
- Forces follow by the chain rule through the descriptors, computed today by automatic differentiation; training on forces is essential.
- Many-element systems need element-resolved or element-weighted descriptors; ANI showed transferability, active learning and transfer learning to CCSD(T).
- Deep Potential learns its descriptor with an embedding network and, with DP-GEN, automated large-scale potential building; third- and fourth-generation networks add learned charges and global charge equilibration.
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

</div>
