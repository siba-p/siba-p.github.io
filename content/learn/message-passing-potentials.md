---
title: "Message-passing and equivariant potentials: SchNet to MACE"
description: "Learned representations of atomic structure: the message-passing framework, SchNet's continuous-filter convolutions, receptive fields and locality, directional messages in DimeNet, the representation theory of rotations (spherical harmonics, irreducible representations, tensor products), equivariant networks PaiNN and NequIP, many-body messages in MACE, the strictly local Allegro, equivariant transformers, and how these models compare."
track: mlmodels
weight: 3
level: Advanced
prereqs: ["neural-network-potentials", "graph-neural-networks", "vectors-and-matrices"]
lab: "Watch messages spread over a molecule, measure the receptive field of stacked layers, and see equivariant features transform"
---

## From fixed descriptors to learned representations

The potentials of the previous two topics describe each atom with a descriptor chosen before training. Choosing it well requires expertise, its resolution is fixed, and for many elements it becomes very long. Deep learning's central lesson, learned on images and text, is that representations learned from data for the task at hand usually beat hand-designed ones. **Message-passing neural networks** bring this lesson to atoms. A structure is treated as a graph whose nodes are atoms and whose edges connect atoms closer than a cutoff; every atom carries a feature vector that starts as a learned embedding of its element and is refined, layer by layer, by exchanging messages with its neighbours. The final features are mapped to atomic energies and summed, so the atomic decomposition, locality within a finite range, and forces by differentiation all survive.

Justin Gilmer and colleagues described the general framework in 2017 as a sequence of message and update steps:

{{< eq title="The message-passing framework" say="Each atom collects messages from its neighbours, which depend on both atoms' current features and on their separation, and uses them to update its own features." >}}
$$ \textcolor{#f08c2e}{\mathbf m_i^{t+1}} = \sum_{j \in \mathcal N(i)} M_t\!\left(\textcolor{#4c6ef5}{\mathbf h_i^{t}}, \textcolor{#4c6ef5}{\mathbf h_j^{t}}, \mathbf r_{ij}\right), \qquad \textcolor{#4c6ef5}{\mathbf h_i^{t+1}} = U_t\!\left(\textcolor{#4c6ef5}{\mathbf h_i^{t}}, \textcolor{#f08c2e}{\mathbf m_i^{t+1}}\right), \qquad E = \sum_i R\!\left(\textcolor{#4c6ef5}{\mathbf h_i^{T}}\right) $$
- $\textcolor{#4c6ef5}{\mathbf h_i^{0}}$: a learned embedding of the element of atom $i$
- $M_t$, $U_t$, $R$: neural networks (message, update and readout functions); $T$ layers in total
- the sum over neighbours makes the result independent of their order
{{< /eq >}}

{{< widget name="mpnn" title="Messages spreading over a molecule" caption="Message passing on the heavy-atom graph of aspirin. Step through the layers and watch information from each atom reach its neighbours, then their neighbours. After a few layers every atom's features reflect a large part of the molecule." >}}

## SchNet: continuous-filter convolutions

**SchNet**, from Kristof Schütt, Klaus-Robert Müller, Alexandre Tkatchenko and colleagues (2017), was the first widely used message-passing potential. Graph networks for molecules had treated bonds as discrete edges, but in a potential energy surface interactions change continuously with distance. SchNet makes the message a **continuous-filter convolution**: each neighbour's features are multiplied, element by element, by a filter that is itself a neural-network function of the interatomic distance.

{{< eq title="SchNet's interaction" say="A neighbour's message is its features, reweighted by a learned function of how far away it is." >}}
$$ \textcolor{#f08c2e}{\mathbf m_i} = \sum_{j \in \mathcal N(i)} \textcolor{#4c6ef5}{\mathbf x_j} \odot \textcolor{#12a594}{\mathbf W}\!\left(r_{ij}\right), \qquad \textcolor{#12a594}{\mathbf W}(r) = \mathrm{MLP}\big(\exp(-\gamma (r - \mu_k)^2)_{k=1}^{K}\big)\, f_c(r) $$
- the distance is first expanded in $K$ Gaussian radial basis functions centred at $\mu_k$, then passed through a small network
- $\odot$: element-wise product; features are updated through residual connections over several interaction blocks
{{< /eq >}}

The radial basis expansion plays the same role as the radial symmetry functions of [Behler–Parrinello networks](../neural-network-potentials/), but what is done with it is learned. SchNet uses only distances, so all its features are rotation-invariant. Trained on energies and forces of molecular dynamics trajectories of small organic molecules (the MD17 benchmark of Chmiela and colleagues), it reached chemical accuracy and set a template that PhysNet (2019), with explicit charges and dispersion, and many later models followed.

## Receptive field and locality

Each layer lets an atom collect information from neighbours within the cutoff $r_c$. After $T$ layers, information can have travelled $T$ hops, so an atom's features, and hence its energy, depend on atoms up to about $T r_c$ away: its **receptive field**. With $r_c = 5$ Å and five layers, that is 25 Å, which can include thousands of atoms.

{{< widget name="receptive" title="The receptive field of stacked message-passing layers" caption="Atoms that can influence the centre (rose) after T layers are coloured by the layer at which their information arrives. The dashed circle is a single cutoff. Increase T and watch the region grow; click any atom to recentre." >}}

A large receptive field is a mixed blessing. It lets the model capture interactions somewhat beyond one cutoff and gives each layer a chance to refine the picture. But it makes the model less local, which hurts in two ways. Large simulations are parallelised by dividing space among processors, each needing copies of atoms within the interaction range of its region (ghost atoms); for a message-passing model that range is $T r_c$, so the ghost regions, and the communication, become very large. And a model whose energy depends on a 25 Å sphere needs training data that represent such large environments. These costs motivated the strictly local Allegro architecture described below.

## Beyond distances

An invariant network that uses only distances must reconstruct angles and other geometric information indirectly through several layers, and some arrangements are hard or impossible for it to distinguish. **DimeNet** (Johannes Gasteiger, Janek Groß and Stephan Günnemann, 2020) addressed this with **directional message passing**: messages are attached to bonds rather than atoms, and a message from bond $kj$ to bond $ji$ depends on the angle $\angle kji$, expanded in a spherical basis. Angles enter explicitly, at the cost of operating on all triplets of atoms. A more general and efficient solution is to let the features themselves carry direction, which requires understanding how quantities transform under rotation.

## How quantities transform under rotation

Physical quantities fall into types according to how they change when the system is rotated. A scalar, such as energy or charge, does not change. A vector, such as a force, a dipole or a bond direction, rotates with the system: $\mathbf v \mapsto \mathbf R\mathbf v$. A second-rank tensor, such as the stress or a quadrupole, transforms as $\mathbf T \mapsto \mathbf R\mathbf T\mathbf R^{\mathsf T}$. Group theory organises these types into **irreducible representations** of the rotation group SO(3), labelled by an integer $l = 0, 1, 2, \ldots$ and of dimension $2l + 1$. Type $l = 0$ is a scalar, $l = 1$ a vector, $l = 2$ the five independent components of a symmetric traceless tensor, and so on. Under a rotation $\mathbf R$, a type-$l$ quantity is multiplied by a $(2l+1)\times(2l+1)$ **Wigner D-matrix** $\mathbf D^{(l)}(\mathbf R)$.

The natural way to produce type-$l$ quantities from geometry is with **spherical harmonics** $Y_{lm}(\hat{\mathbf r})$, $m = -l, \dots, l$, evaluated on the unit vector between two atoms. They are the three-dimensional generalisation of the circular harmonics $e^{im\theta}$ in the figure of [the topic on what an MLIP must learn](../mlip-foundations/), and they transform exactly as type-$l$ objects. An **equivariant network** keeps, for each atom, features of several types, $\mathbf h_i = \bigoplus_l \mathbf h_i^{(l)}$, and uses only operations that commute with rotation, so that rotating the input rotates every feature by its own $\mathbf D^{(l)}$.

Two equivariant quantities are combined with the **tensor product**, the operation familiar from the addition of angular momenta in quantum mechanics:

{{< eq title="The equivariant tensor product" say="Combining a type-l₁ and a type-l₂ object gives objects of every type from |l₁ − l₂| to l₁ + l₂, with Clebsch–Gordan coefficients as the recipe." >}}
$$ \big(\mathbf a^{(\textcolor{#4c6ef5}{l_1})} \otimes \mathbf b^{(\textcolor{#f08c2e}{l_2})}\big)^{(\textcolor{#845ef7}{l})}_{m} = \sum_{m_1, m_2} \textcolor{#12a594}{C}^{\,l m}_{l_1 m_1, l_2 m_2}\, a^{(l_1)}_{m_1}\, b^{(l_2)}_{m_2}, \qquad |l_1 - l_2| \le \textcolor{#845ef7}{l} \le l_1 + l_2 $$
- $\textcolor{#12a594}{C}$: Clebsch–Gordan coefficients, fixed numbers that guarantee the result transforms as type $l$
- example: two vectors ($1\otimes 1$) give a scalar (their dot product, $l = 0$), a vector (their cross product, $l = 1$) and a symmetric traceless tensor ($l = 2$)
{{< /eq >}}

The example under the equation shows that this is not exotic: the dot and cross products of vectors are tensor products. Nonlinearities need care, because applying, say, a SiLU to each component of a vector would break its rotation behaviour; equivariant networks apply nonlinearities only to scalars, or use **gates**, multiplying each higher-$l$ feature by a nonlinear function of a scalar. Libraries such as e3nn implement these operations generally.

## PaiNN and NequIP

**PaiNN** (Schütt, Unke and Gastegger, 2021) is the simplest equivariant design: each atom carries scalar features and vector features ($l \le 1$), and messages update both, using the neighbour direction to create vectors from scalars and dot products to create scalars from vectors. Directional information flows through the network without needing angles explicitly.

**NequIP** (Simon Batzner, Albert Musaelian, Boris Kozinsky and colleagues; preprint 2021, published 2022) uses features of general $l$ and builds each message as a tensor product of the neighbour's features with the spherical harmonics of the bond direction, weighted by a learned radial function:

{{< eq title="An equivariant message (NequIP)" say="A neighbour's features are combined with the direction to it, in a way that rotates correctly, and scaled by a learned function of distance." >}}
$$ \textcolor{#f08c2e}{\mathbf m_i} = \sum_{j \in \mathcal N(i)} \textcolor{#12a594}{R}(r_{ij}) \; \Big( Y(\hat{\mathbf r}_{ij}) \otimes \textcolor{#4c6ef5}{\mathbf h_j} \Big) $$
- $Y(\hat{\mathbf r}_{ij})$: spherical harmonics of the bond direction up to some $l_{\max}$ (typically 2 or 3)
- $\textcolor{#12a594}{R}(r_{ij})$: a radial network giving separate weights for each combination of input, filter and output types
{{< /eq >}}

The most striking result was **data efficiency**. On molecular benchmarks, NequIP trained on a few hundred structures matched or exceeded invariant models trained on tens of thousands, and its learning curves, the test error against training-set size, were steeper. Physically, built-in directional information means the network does not have to discover geometry from distances, so every training example teaches more. The price is computational: tensor products with higher $l$ are expensive, and equivariant models are slower per atom than invariant ones of similar size.

## MACE: many-body messages

In a two-body message, each neighbour contributes separately and the messages are summed: the message is a sum of pair terms. Many-body correlations, such as the joint arrangement of three neighbours, must then be built up over several layers. **MACE** (Ilyes Batatia, Dávid Péter Kovács, Gregor Simm, Christoph Ortner and Gábor Csányi, 2022) instead makes each message many-body, using the construction of the [atomic cluster expansion](../kernel-and-linear-potentials/) on learned features. It first forms an equivariant atomic base by a single sum over neighbours, then takes tensor products of this base with itself up to a correlation order $\nu$, and finally forms a message from these products:

$$
\mathbf A_i = \sum_{j} R(r_{ij})\, Y(\hat{\mathbf r}_{ij}) \otimes \mathbf h_j, \qquad
\mathbf B_i = \big\{\mathbf A_i,\; \mathbf A_i \otimes \mathbf A_i,\; \mathbf A_i \otimes \mathbf A_i \otimes \mathbf A_i \big\}, \qquad
\mathbf m_i = \sum_\eta W_\eta\, \mathbf B_{i,\eta}.
$$

Because of the density trick, the products cost far less than explicit sums over triples or quadruples of neighbours, and with correlation order 3 each message already describes four-body correlations. As a result, MACE needs only **two message-passing layers** to reach high accuracy, which keeps its receptive field small (two cutoffs) and makes it fast for an equivariant model. MACE achieved state-of-the-art accuracy on standard benchmarks with modest cost, and it became the architecture of the MACE-MP-0 foundation model and of many system-specific potentials. Batatia and colleagues also showed that many earlier architectures, from Behler–Parrinello networks and ACE to NequIP, fit into a single "design space" of equivariant, atom-centred models differing in body order, symmetry type and number of layers.

## Allegro: strictly local and scalable

**Allegro** (Albert Musaelian, Simon Batzner and colleagues, 2023) takes the opposite approach to the receptive-field problem. It keeps equivariant features but attaches them to **pairs** of atoms $ij$ rather than to atoms, and updates them using only the neighbours of the central atom $i$, never passing messages between atoms. Every pair energy therefore depends only on the cutoff sphere of atom $i$: the model is strictly local, like a Behler–Parrinello network, but with learned equivariant features. Strict locality makes it straightforward to distribute a simulation over many GPUs with small ghost regions, and Allegro demonstrated simulations of protein–water systems with tens to hundreds of millions of atoms at high accuracy.

## Equivariant transformers and the trade-offs

Attention, the mechanism of [transformers](../transformers/), has also been made equivariant: in Equiformer and EquiformerV2 (Yi-Lun Liao, Tess Smidt and colleagues, 2023–2024), attention weights between neighbours are computed from invariant combinations of equivariant features, and the values being mixed are equivariant. EquiformerV2 used computational shortcuts (rotating each edge into a frame aligned with the bond so that tensor products become cheaper) to reach higher $l$, and it underlies several of the largest models trained on the Open Catalyst and OMat24 data sets. At the other extreme, some fast models, such as ORB, drop exact equivariance and learn approximate symmetry from rotated training data, trading guarantees for speed.

| model | features | messages | body order per layer | local? |
|---|---|---|---|---|
| Behler–Parrinello | fixed ACSF | none | 3 (angular functions) | strictly, one cutoff |
| SchNet | learned invariant | two-body, distances | 2 | $T$ cutoffs |
| DimeNet | invariant on bonds | directional (angles) | 3 | $T$ cutoffs |
| PaiNN | scalars and vectors | equivariant | 2 | $T$ cutoffs |
| NequIP | general $l$ | equivariant tensor products | 2 | $T$ cutoffs |
| MACE | general $l$ | equivariant, many-body | $\nu + 1$ (e.g. 4) | 2 cutoffs |
| Allegro | equivariant on pairs | none between atoms | many-body within the cutoff | strictly, one cutoff |

The practical choice depends on the task. For a single system with limited DFT data, the data efficiency of equivariant models (NequIP, MACE, Allegro) is decisive. For very large simulations, strictly local models (Allegro, Behler–Parrinello, ACE) parallelise best. For many-element chemistry, learned element embeddings make message-passing models scale gracefully with the number of elements, which is why universal potentials are almost all of this kind ([the topic on universal potentials](../universal-potentials/)). Mature open-source implementations exist for nearly all of them, including SchNetPack, NequIP and Allegro, MACE, DeePMD-kit, TorchANI and fairchem, most with LAMMPS or ASE interfaces.

{{< note type="key" >}}
- Message passing learns representations: element embeddings refined by messages from neighbours within a cutoff, read out as atomic energies and summed.
- SchNet uses continuous-filter convolutions on distances; $T$ layers give a receptive field of about $T r_c$, which helps accuracy but hurts parallel scaling.
- Rotations act on type-$l$ quantities (irreducible representations) through Wigner D-matrices; spherical harmonics produce them; tensor products with Clebsch–Gordan coefficients combine them equivariantly.
- PaiNN and NequIP carry equivariant features and are far more data-efficient; MACE builds many-body (ACE-like) messages so two layers suffice; Allegro is strictly local and scales to very large systems.
- Choose by data budget, system size and chemical diversity; equivariant transformers and non-equivariant fast models extend the range.
{{< /note >}}

{{< quiz >}}
- q: "A message-passing potential has 4 layers and a 5 Å cutoff. Roughly how far away can an atom influence another's energy?"
  options: ["5 Å", "20 Å", "Unlimited"]
  answer: 1
  why: "Information travels one cutoff per layer: about T × r_c."
- q: "Why is a strictly local model easier to run on many GPUs?"
  options: ["It has fewer parameters", "Each processor needs ghost atoms only within one cutoff of its region, not T cutoffs", "It does not need forces"]
  answer: 1
  why: "Communication and ghost regions scale with the interaction range."
- q: "The tensor product of two vectors (l = 1 ⊗ 1) contains which types?"
  options: ["Only l = 2", "l = 0, 1 and 2: the dot product, the cross product and a traceless symmetric tensor", "Only l = 0"]
  answer: 1
  why: "Angular-momentum addition: |1 − 1| to 1 + 1."
- q: "Why can MACE reach high accuracy with only two message-passing layers?"
  options: ["It uses a larger cutoff", "Each message is many-body (products of the atomic base), so high body order is reached without stacking many layers", "It is not equivariant"]
  answer: 1
  why: "ACE-style products give body order ν + 1 per layer."
- q: "What was the most notable advantage reported for NequIP over invariant networks?"
  options: ["Lower memory use", "Much higher data efficiency: similar accuracy from far fewer training structures", "No need for a cutoff"]
  answer: 1
  why: "Built-in directional information means each example teaches more."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. Gilmer, S. S. Schoenholz, P. F. Riley, O. Vinyals and G. E. Dahl, "Neural message passing for quantum chemistry", *Proceedings of the 34th International Conference on Machine Learning*, 1263–1272 (2017).
2. K. T. Schütt, H. E. Sauceda, P.-J. Kindermans, A. Tkatchenko and K.-R. Müller, "SchNet – a deep learning architecture for molecules and materials", *Journal of Chemical Physics* **148**, 241722 (2018).
3. S. Chmiela, A. Tkatchenko, H. E. Sauceda, I. Poltavsky, K. T. Schütt and K.-R. Müller, "Machine learning of accurate energy-conserving molecular force fields", *Science Advances* **3**, e1603015 (2017).
4. O. T. Unke and M. Meuwly, "PhysNet: a neural network for predicting energies, forces, dipole moments, and partial charges", *Journal of Chemical Theory and Computation* **15**, 3678–3693 (2019).
5. J. Gasteiger, J. Groß and S. Günnemann, "Directional message passing for molecular graphs", *International Conference on Learning Representations* (2020).
6. N. Thomas, T. Smidt, S. Kearnes, L. Yang, L. Li, K. Kohlhoff and P. Riley, "Tensor field networks: rotation- and translation-equivariant neural networks for 3D point clouds", arXiv:1802.08219 (2018).
7. K. T. Schütt, O. T. Unke and M. Gastegger, "Equivariant message passing for the prediction of tensorial properties and molecular spectra", *Proceedings of the 38th International Conference on Machine Learning*, 9377–9388 (2021).
8. S. Batzner et al., "E(3)-equivariant graph neural networks for data-efficient and accurate interatomic potentials", *Nature Communications* **13**, 2453 (2022).
9. I. Batatia, D. P. Kovács, G. N. C. Simm, C. Ortner and G. Csányi, "MACE: higher order equivariant message passing neural networks for fast and accurate force fields", *Advances in Neural Information Processing Systems* **35** (2022).
10. I. Batatia et al., "The design space of E(3)-equivariant atom-centered interatomic potentials", arXiv:2205.06643 (2022).
11. A. Musaelian et al., "Learning local equivariant representations for large-scale atomistic dynamics", *Nature Communications* **14**, 579 (2023).
12. M. Geiger and T. Smidt, "e3nn: Euclidean neural networks", arXiv:2207.09453 (2022).
13. Y.-L. Liao, B. Wood, A. Das and T. Smidt, "EquiformerV2: improved equivariant transformer for scaling to higher-degree representations", *International Conference on Learning Representations* (2024).
14. A. S. Christensen and O. A. von Lilienfeld, "On the role of gradients for machine learning of molecular energies and forces", *Machine Learning: Science and Technology* **1**, 045018 (2020).

</div>
