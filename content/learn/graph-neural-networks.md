---
title: "Graph neural networks"
description: "Molecules and crystals as graphs; the message-passing framework that learns its own descriptors; why sum aggregation gives permutation invariance; receptive fields; and the line from SchNet to equivariant networks."
hook: "Aspirin's 13 heavy atoms can be numbered in over six billion ways, and a model must give the same answer for every one. Graph networks guarantee it: every atom adds up messages from its neighbours, using rules shared by all atoms."
objectives:
  - "Compute one round of message passing by hand on a four-atom molecule"
  - "Explain why sum aggregation makes predictions independent of how atoms are numbered"
  - "Estimate a network's receptive field from its depth and cut-off radius"
  - "Compare distance-only networks such as SchNet with equivariant ones such as NequIP and MACE"
  - "Recognise where graph networks are used for property prediction, potentials and materials discovery"
cover: "cover.svg"
milestones:
  - year: 2009
    text: "Scarselli, Gori and colleagues publish the graph neural network model"
  - year: 2017
    text: "Gilmer and colleagues unify chemical graph networks as message passing"
  - year: 2018
    text: "Xie and Grossman introduce crystal graph convolutional networks"
  - year: 2022
    text: "Batzner and colleagues publish NequIP, an E(3)-equivariant interatomic potential"
track: arch
weight: 2
level: Core
minutes: 50
lab: "Pass messages across aspirin"
prereqs: ["symmetry-descriptors", "convolutional-networks"]
---

## From hand-made descriptors to learned ones

The descriptors of [the lesson on symmetry descriptors](../symmetry-descriptors/) are designed by hand and then fixed. **Graph neural networks** (GNNs) keep the same symmetries but *learn* the description of each atom's environment, end to end, from the training data. Since about 2017 they have become the dominant architecture for molecular and materials property prediction and for machine-learned interatomic potentials.

Graph networks are also the natural sequel to [convolutional networks](../convolutional-networks/). A convolutional layer applies one small set of shared weights to every pixel and its fixed ring of neighbours on a grid; a graph network applies one small set of shared weights to every atom and its neighbours, however many there are and wherever they sit. Locality and weight sharing survive the move from pixels to atoms; the grid does not.

A **graph** $\mathcal G = (\mathcal V, \mathcal E)$ has nodes and edges. A molecule is a graph with atoms as nodes and bonds as edges; for 3D models the edges usually connect every pair of atoms closer than a cut-off radius, labelled with their distance (and, in periodic crystals, connecting atoms to periodic images of their neighbours, see [the lesson on crystal graphs](../materials-representations/)). Each node $i$ carries a feature vector $\mathbf h_i$, initially an embedding of the element, and each edge may carry features $\mathbf e_{ij}$ such as the distance expanded in radial basis functions.

{{< note type="warn" title="Myth" >}}
"A graph network needs a list of chemical bonds." Only models of the 2D molecular graph do. Models of 3D structure build their edges from a distance cut-off, typically 4 to 6 Å, and rebuild them at every step of a simulation: an edge appears when two atoms come within $r_c$ and disappears when they separate. That is why SchNet, NequIP and MACE can describe bond breaking, liquids, melts and amorphous solids, where no fixed bond list exists, and why the same architecture serves a protein, a molten salt and a grain boundary.
{{< /note >}}

{{< note type="story" >}}
Graph networks are older than their fame. Franco Scarselli, Marco Gori and colleagues described a "graph neural network model" in 2009, in which node states were updated repeatedly until they stopped changing. In chemistry the closest relative is the extended-connectivity fingerprint (ECFP; Rogers and Hahn, 2010), which repeatedly replaces each atom's identifier by a hash of its own and its neighbours' identifiers: message passing with a fixed hash in place of learned functions. David Duvenaud and colleagues (2015) swapped the hash for a small neural network and called the result neural fingerprints. Kipf and Welling's graph convolutional network and the message-passing framework of Gilmer et al. followed in 2017.
{{< /note >}}

## The message-passing framework

Gilmer et al. (2017) showed that most graph networks for chemistry share one template. Each layer $t$ performs three steps for every node $i$:

$$
\begin{aligned}
\mathbf m_{ij}^{(t)} &= M_t\big(\mathbf h_i^{(t)}, \mathbf h_j^{(t)}, \mathbf e_{ij}\big) && \text{(compute a message along each edge)}\\
\mathbf m_i^{(t)} &= \sum_{j \in \mathcal N(i)} \mathbf m_{ij}^{(t)} && \text{(aggregate the incoming messages)}\\
\mathbf h_i^{(t+1)} &= U_t\big(\mathbf h_i^{(t)}, \mathbf m_i^{(t)}\big) && \text{(update the node's state)}
\end{aligned}
$$

where $M_t$ and $U_t$ are small neural networks shared by all nodes and edges. After $T$ layers a **readout** combines the node states into a prediction for the whole graph, for example $\hat y = R\big(\sum_i \mathbf h_i^{(T)}\big)$, or, for an energy, $E = \sum_i \varepsilon\big(\mathbf h_i^{(T)}\big)$.

Published architectures differ mainly in their choice of $M_t$ and $U_t$. Kipf and Welling's graph convolution uses a linear message normalised by the degrees of both atoms, $\mathbf m_{ij} = \mathbf W\mathbf h_j/\sqrt{\tilde d_i\tilde d_j}$, where $\tilde d$ counts the neighbours plus the atom itself, and an update that is a nonlinearity applied to the sum. SchNet multiplies the neighbour's state component by component by a filter generated from the distance. Gilmer's own *edge network* generates a whole matrix from the edge features, $\mathbf m_{ij} = \mathbf A(\mathbf e_{ij})\,\mathbf h_j$, and updates with a gated recurrent unit; on QM9, a set of about 134,000 small organic molecules with up to nine heavy atoms and 13 DFT properties each, it reached chemical accuracy on 11 of the 13 targets. Whatever the choice, the functions are applied with the same weights on every edge and every atom, so the number of parameters does not depend on the size of the molecule: one trained model handles methane and a 500-atom protein fragment.

{{< widget name="mpnn" title="Message passing on aspirin" caption="The heavy-atom graph of aspirin. Select an atom and step through the layers: the shaded receptive field grows by one bond per layer, and the feature strips change as information flows in. Renumbering the atoms changes nothing in the computed readout." >}}

{{< note type="try" >}}
Click one of the two oxygens of the carboxylic acid group and step the layers from 0 to 4. After four layers, nine of the thirteen atoms can influence it; the ring carbon opposite the acid group and the three atoms of the acetyl group are five or six bonds away and stay outside its receptive field. Then press *Renumber the atoms* a few times and watch the two readout values stay equal.
{{< /note >}}

## One round of message passing, by hand

Formaldehyde, H₂C=O, is small enough to follow every number. Its graph has four nodes, a carbon, an oxygen and two hydrogens, and three edges labelled by bond order: 2 for C=O and 1 for each C–H. Give each element a two-number embedding, as if training had already chosen them: $\mathbf h_{\mathrm C} = (0, 1)$, $\mathbf h_{\mathrm O} = (1, 1)$, $\mathbf h_{\mathrm H} = (1, 0)$. Take the simplest message that still uses the edge, the neighbour's state times the bond order, $\mathbf m_{ij} = b_{ij}\,\mathbf h_j$, and the update $\mathbf h_i' = \operatorname{ReLU}(\mathbf h_i + \mathbf A\,\mathbf m_i)$ with the "learned" matrix

$$
\mathbf A = \begin{pmatrix} 0 & 1 \\ -1 & 1 \end{pmatrix}.
$$

**Aggregate.** Carbon hears from all three neighbours: $\mathbf m_{\mathrm C} = 2(1,1) + (1,0) + (1,0) = (4,2)$. Oxygen hears only from carbon, through the double bond: $\mathbf m_{\mathrm O} = 2(0,1) = (0,2)$. Each hydrogen hears only from carbon: $\mathbf m_{\mathrm H} = (0,1)$.

**Update.** For carbon, $\mathbf A\,\mathbf m_{\mathrm C} = (2,-2)$, so $\mathbf h_{\mathrm C}' = \operatorname{ReLU}\big((0,1) + (2,-2)\big) = \operatorname{ReLU}(2,-1) = (2,0)$: the ReLU cuts the negative component to zero. For oxygen, $\mathbf h_{\mathrm O}' = \operatorname{ReLU}\big((1,1) + (2,2)\big) = (3,3)$, and for each hydrogen, $\mathbf h_{\mathrm H}' = \operatorname{ReLU}\big((1,0) + (1,1)\big) = (2,1)$.

**Read out.** Summing the four states gives $(2,0) + (3,3) + (2,1) + (2,1) = (9,5)$, the molecule's representation after one layer.

{{< fig src="layer-by-hand.svg" alt="Formaldehyde drawn three times: with element embeddings, with orange message arrows converging on the carbon atom, and with the updated states and the summed readout (9, 5)" caption="The worked example in one picture. Carbon collects $2(1,1) + (1,0) + (1,0) = (4,2)$; after the update the two hydrogens still carry identical states, and the readout is the sum of the four new states." >}}

These few numbers show the whole architecture at work. The two hydrogens end up with identical states, because they have the same element and the same surroundings; the network cannot tell them apart, and should not. Carbon's new state depends on all three neighbours, but each hydrogen's depends only on carbon: after one layer, a hydrogen knows nothing about the oxygen. Numbering the atoms differently only reorders the terms of each sum, so the readout stays (9, 5). And the edge label matters: the double bond doubles oxygen's contribution to carbon's message.

Think of message passing as gossip in a village where people talk only to their neighbours. After one round you know what your neighbours knew; after two, what their neighbours knew. The cell below repeats the calculation, renumbers the atoms, and then changes only the oxygen's embedding. The hydrogen's state does not move after one layer and changes after the second, once the news has passed through the carbon.

{{< py title="message passing on formaldehyde" >}}
import numpy as np
# formaldehyde, H2C=O: atom 0 = C, 1 = O, 2 = H, 3 = H
h0 = np.array([[0, 1], [1, 1], [1, 0], [1, 0]], dtype=float)   # element embeddings
bonds = [(0, 1, 2), (0, 2, 1), (0, 3, 1)]                    # (i, j, bond order)
A = np.array([[0, 1], [-1, 1]], dtype=float)                 # the 'learned' update matrix

def layer(h, bonds):
    m = np.zeros_like(h)
    for i, j, b in bonds:              # a message flows each way along every bond
        m[i] += b * h[j]
        m[j] += b * h[i]
    return np.maximum(0, h + m @ A.T)  # update: ReLU(h_i + A m_i)

h1 = layer(h0, bonds)
print("states after one layer:\n", h1, "\nreadout:", h1.sum(0))
new = [2, 3, 1, 0]                     # renumber: old atom k becomes atom new[k]
h0p = np.zeros_like(h0); h0p[new] = h0
bonds_p = [(new[i], new[j], b) for i, j, b in bonds]
print("readout after renumbering:", layer(h0p, bonds_p).sum(0))
h0x = h0.copy(); h0x[1] = [3, 0]       # change only the oxygen's embedding
a, b = h0, h0x
for T in (1, 2):
    a, b = layer(a, bonds), layer(b, bonds)
    print(f"after {T} layer(s), hydrogen: {a[2]} versus {b[2]}")
{{< /py >}}

## Why it respects permutation symmetry

Every operation above is either applied identically to each node or edge, or is a **sum over neighbours**, and a sum does not depend on the order of its terms. Renumbering the atoms therefore renumbers the node states in exactly the same way (the layer is **permutation-equivariant**), and summing over nodes in the readout makes the prediction **permutation-invariant**. The lab recomputes the whole network in the new atom order when you press *Renumber the atoms*; the readout agrees to machine precision. Sum aggregation is also what makes an energy extensive. Mean or max aggregation also respect permutations but lose information about how many neighbours there are; Xu et al. (2019) showed that sum aggregation gives the most expressive networks of this family.

{{< note type="try" title="Pause and predict" >}}
The carbon of methane, CH₄, has four hydrogen neighbours; the carbon of methylene, CH₂, has two. All hydrogens start with the same embedding $\mathbf h_{\mathrm H}$. Which aggregations, mean, max or sum, give the two carbons different messages?
{{< /note >}}

Only the sum. The mean of four copies of $\mathbf h_{\mathrm H}$ is $\mathbf h_{\mathrm H}$, and so is the mean of two; the component-wise maximum is $\mathbf h_{\mathrm H}$ in both cases. The sum gives $4\mathbf h_{\mathrm H}$ against $2\mathbf h_{\mathrm H}$. A network built on mean or max aggregation cannot count the hydrogens on a carbon, or the neighbours of a metal ion, which is exactly the information that separates a fourfold from a sixfold coordination site. This is the multiset argument behind the result of Xu et al.: with suitable feature maps a sum is injective on multisets of neighbour states, while a mean only sees their proportions and a maximum only sees which states occur.

{{< note type="practice" title="Back of the envelope" >}}
Why not let a plain network learn the symmetry from data? Aspirin, C₉H₈O₄, has 21 atoms. Permuting identical elements among themselves gives $9!\,8!\,4! \approx 3.5\times10^{11}$ numberings of the same molecule, every one a different input vector for a multilayer perceptron that reads 63 Cartesian coordinates in a fixed order. A 64-atom silicon supercell has $64! \approx 1.3\times10^{89}$. Data augmentation can only sample a vanishing fraction of these, and the network would still need a new input layer for every system size. Sum aggregation builds the symmetry in exactly, at no cost, and removes the fixed input size.
{{< /note >}}

If the edge features depend only on distances, the network is also invariant to rotations and translations. That is the design of **SchNet** (Schütt et al., 2018), whose message uses a learned "continuous filter" of the interatomic distance, $\mathbf m_{ij} = \mathbf h_j \odot W\big(\text{rbf}(r_{ij})\big)$. **DimeNet** adds bond angles to the messages, gaining three-body information.

{{< note type="warn" title="Conformers and mirror images" >}}
Check that the representation can tell apart the structures your property tells apart. A model of the bond graph alone, with no coordinates, gives one prediction for every conformer of a molecule, and the same prediction for cis and trans isomers unless stereochemistry is added as a feature. A model built only on distances, like SchNet, sees conformers but not handedness: a molecule and its mirror image have identical sets of interatomic distances, so the two enantiomers get identical predictions. That is right for the energy of an isolated molecule and wrong for anything that depends on chirality, such as binding to a chiral receptor.
{{< /note >}}

## Receptive field and the cost of depth

After $T$ layers, a node's state can depend on atoms up to $T$ edges away: its **receptive field**, shaded in the lab. With a geometric cut-off $r_c$ the receptive field is roughly $T r_c$; four layers with $r_c = 5$ Å see 20 Å, which is useful for capturing longer-range effects but makes the energy less local (and harder to parallelise across processors in large MD runs). Very deep message passing also suffers from **over-smoothing**: repeated averaging makes all node states similar. Practical models use three to six layers, residual connections and, where long-range physics matters, explicit electrostatic or dispersion terms.

{{< note type="practice" title="Back of the envelope" >}}
Crystalline silicon has 8 atoms in a cubic cell of 5.431 Å, a density of 0.0499 atoms per Å³, so a 5 Å sphere holds about 26 atoms; the lattice places 28 neighbours inside it, in shells at 2.35, 3.84 and 4.50 Å. Four layers with this cut-off nominally see a 20 Å sphere of about 1,670 atoms. A breadth-first search on the actual radius graph finds 891. The longest edge is 4.50 Å, not 5 Å, and paths must zig-zag through lattice sites, so four hops reach at most 17.2 Å. $T r_c$ is an upper bound on the receptive field, and in a crystal the reachable set holds about half the atoms of the nominal sphere.
{{< /note >}}

{{< fig src="cost-of-depth.svg" alt="Left: atoms in the receptive field of a silicon atom against the number of layers, on a log scale, with a dashed sphere estimate above the computed points. Right: the spread of atom features on the aspirin graph against the number of averaging layers, falling towards zero for plain averaging and levelling off at 0.43 when the input is mixed back in." caption="Two costs of depth. (a) The receptive field grows roughly as $T^3$: 28 neighbours after one layer, 891 atoms after four. (b) Repeated averaging over neighbours erases the differences between atoms; mixing a fixed fraction of each atom's input back in at every layer stops the collapse." >}}

Panel (b) isolates the aggregation step. Each layer replaces every atom's features by the mean over itself and its neighbours, with no learned weights: multiplication by a row-stochastic matrix $\mathbf P$. Powers of $\mathbf P$ converge to a matrix with identical rows, so the differences between atoms decay as $|\lambda_2|^T$, where $\lambda_2$ is the second-largest eigenvalue of $\mathbf P$, 0.948 for the 13-atom aspirin graph. After 10 layers 22 per cent of the initial spread remains, after 30 layers 7 per cent. Learned weights and nonlinearities slow the collapse but do not reverse it in general. Mixing 20 per cent of each atom's input back in at every layer, the idea behind APPNP (Klicpera, Bojchevski and Günnemann, 2019), holds the spread at 43 per cent however deep the stack.

Depth has a second failure, **over-squashing** (Alon and Yahav, 2021). In a tree-like or chain-like graph the number of atoms within $T$ hops grows quickly, but everything they contribute must pass through a fixed-width feature vector at each intermediate atom. Information from distant atoms is compressed into a few numbers on the way, and gradients with respect to those atoms become small. For a long polymer or a protein backbone, the end-to-end coupling of a message-passing model is weak no matter how many layers it has, which is one argument for adding attention over all atom pairs ([transformers](../transformers/)) or explicit long-range terms.

The third cost is computational. In a domain-decomposed molecular dynamics run, as in LAMMPS, each processor must hold copies (ghost atoms) of every atom that can influence the atoms it owns. For a classical potential the ghost shell is one cut-off thick; for a $T$-layer message-passing model it is $T r_c$ thick, and the node features must be exchanged between processors after every layer. Allegro (Musaelian et al., 2023) was designed around this constraint: it stores its features on pairs of atoms within a single cut-off and never passes messages between atoms, so its receptive field stays at $r_c$ however many layers it has.

{{< note type="practice" >}}
Typical settings for molecular and materials models: a cut-off of 4 to 6 Å; the distance expanded in a handful of radial basis functions (Gaussians or Bessel functions) and multiplied by a smooth envelope that falls to zero at the cut-off; 64 to 256 features per atom; two to six message-passing layers. For potentials the smooth envelope is not optional: with a hard cut-off the energy jumps whenever an atom crosses it, and molecular dynamics stops conserving energy.
{{< /note >}}

## Equivariant message passing

Invariant networks throw away directional information early: once the messages see only distances, the network has to rebuild angular information indirectly. **Equivariant** networks carry vector and tensor features that rotate with the structure. Node features are organised by their angular momentum $l$ (scalars $l = 0$, vectors $l = 1$, rank-2 tensors $l = 2$, …), edge directions enter through spherical harmonics $Y_{lm}(\hat{\mathbf r}_{ij})$, and features are combined with Clebsch–Gordan tensor products, which are guaranteed to produce correctly rotating outputs. **NequIP** showed that such networks reach a given accuracy with one to three orders of magnitude less training data than invariant ones. **MACE** combines equivariant messages with the many-body structure of ACE, so that each layer captures high body-order correlations and only two layers are needed. **PaiNN** and **Allegro** are other widely used designs. These are the architectures behind most current interatomic potentials, the subject of [the lesson on interatomic potentials](../mlip/).

Two settings fix the cost of an equivariant model: the largest angular momentum $l_{\max}$ and the number of channels. A feature of order $l$ has $2l+1$ components, so one channel with $l_{\max} = 2$ carries $1 + 3 + 5 = 9$ numbers, and a full Clebsch–Gordan tensor product between two such features costs a number of operations that grows roughly as $l_{\max}^6$. Most production potentials therefore stop at $l_{\max} = 2$ or 3. MACE uses the budget differently: on each atom it forms products of up to three copies of the neighbour-density features (correlation order 3), so a single layer already contains four-body terms, and two layers with a 5 to 6 Å cut-off give a receptive field of 10 to 12 Å. The directional information has a concrete payoff. A force is a vector and a polarisability is a rank-2 tensor; an invariant network obtains forces correctly as the gradient of its energy, but predicting a dipole moment or a Born effective charge directly requires outputs that rotate with the structure, which equivariant features provide by construction.

## Graph networks in materials science

Graph networks have become the default model for structure–property problems in materials science, in three main roles.

- **Property prediction.** CGCNN (Xie and Grossman, 2018) built each crystal's graph from atoms and their periodic neighbours ([crystal graphs](../materials-representations/)) and learned formation energies, band gaps and elastic moduli from DFT data in the Materials Project. MEGNet (Chen et al., 2019) added a global state, such as temperature or pressure, updated alongside the nodes and edges; ALIGNN (Choudhary and DeCost, 2021) also passes messages on the line graph, whose nodes are bonds, so that bond angles enter explicitly. Such a model screens thousands of candidate structures in the time one DFT calculation takes.
- **Interatomic potentials.** The equivariant networks of the previous section, trained on the energies and forces of one chemical system, run molecular dynamics with close to DFT accuracy at a small fraction of the cost ([message-passing potentials](../message-passing-potentials/)).
- **Universal potentials.** Trained on the relaxation trajectories stored in the Materials Project, M3GNet (Chen and Ong, 2022), CHGNet (Deng et al., 2023) and MACE-MP-0 cover most of the periodic table with a single model ([universal potentials](../universal-potentials/)).

{{< note type="practice" title="From the lab" >}}
A screening campaign with a crystal-graph model typically runs in five steps. (1) Train on DFT formation energies, for example the roughly 130,000 Materials Project entries of the Matbench `matbench_mp_e_form` task, where current graph networks reach mean absolute errors of a few tens of meV per atom. (2) Generate candidates, often by substituting chemically similar ions into known structure prototypes. (3) Predict each candidate's energy, place it against the convex hull of known phases ([stability and the convex hull](../materials-representations/)), and keep those within about 50 meV/atom of the hull. (4) Relax the survivors with DFT, using the same functional, pseudopotentials and corrections as the training data. (5) Add the new calculations to the training set and repeat; this is [active learning](../active-learning/). Because most candidates are unstable, a model whose error is comparable to the 50 meV/atom window produces many false positives near the threshold, and the DFT step is what keeps the final list honest.
{{< /note >}}

{{< note type="fun" >}}
In 2023 a team at Google DeepMind used graph networks to rank enormous numbers of candidate crystals, checked the most promising with DFT, and fed the results back into training, round after round. The search produced about 2.2 million structures predicted to be stable relative to previously known materials, some 380,000 of them on the updated convex hull, which the authors described as an order-of-magnitude expansion of the stable materials known (Merchant et al., 2023). Predicted stability at zero kelvin is not the same as a material that can be made, and later analyses questioned how many of the structures are genuinely new, but a search on this scale would have been unthinkable with DFT alone.
{{< /note >}}

## In practice

A message-passing layer in PyTorch, with a numerical check of permutation equivariance. Libraries such as PyTorch Geometric, DGL and e3nn provide optimised layers, neighbour lists and equivariant operations.

```python
import torch

class MessagePassing(torch.nn.Module):
    """h_i' = h_i + MLP([h_i, sum_j MLP_msg(h_j, e_ij)])  (sum aggregation)."""
    def __init__(self, dim, edim):
        super().__init__()
        self.msg = torch.nn.Sequential(torch.nn.Linear(dim + edim, dim), torch.nn.SiLU(), torch.nn.Linear(dim, dim))
        self.upd = torch.nn.Sequential(torch.nn.Linear(2 * dim, dim), torch.nn.SiLU(), torch.nn.Linear(dim, dim))

    def forward(self, h, edge_index, e):
        src, dst = edge_index                              # messages flow src -> dst
        m = self.msg(torch.cat([h[src], e], dim=-1))       # one message per edge
        agg = torch.zeros_like(h).index_add_(0, dst, m)    # sum the messages arriving at each node
        return h + self.upd(torch.cat([h, agg], dim=-1))

torch.manual_seed(0)
n, dim = 6, 16
h = torch.randn(n, dim)
edges = torch.tensor([[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]]).T
edge_index = torch.cat([edges, edges.flip(0)], dim=1)     # undirected: both directions
e = torch.randn(edge_index.shape[1], 4)                    # e.g. expanded distances
layer = MessagePassing(dim, 4)
out = layer(h, edge_index, e)

perm = torch.randperm(n); inv = torch.argsort(perm)        # renumber the nodes
out_p = layer(h[perm], inv[edge_index], e)
print("node outputs permute with the nodes:", torch.allclose(out_p, out[perm], atol=1e-6))
print("summed readout unchanged:", torch.allclose(out_p.sum(0), out.sum(0), atol=1e-5))
```

```text
node outputs permute with the nodes: True
summed readout unchanged: True
```

{{< note type="tip" title="What GNNs cannot see" >}}
Message passing with sum aggregation is at most as powerful as the Weisfeiler–Lehman graph-isomorphism test: two different graphs that the test cannot distinguish (for example two six-rings against one twelve-ring, when all atoms look alike) get the same prediction from any such network. Geometric features (distances, angles) break most of these ties in practice, which is one reason 3D models outperform purely topological ones.
{{< /note >}}

Chemistry supplies a classic pair. Decalin (two fused six-membered rings) and bicyclopentyl (two five-membered rings joined by a single bond) are both C₁₀H₁₈; both have two carbons bonded to three other carbons and eight CH₂ groups. Run colour refinement, the test of Weisfeiler and Lehman (1968), on the two carbon skeletons: every carbon starts with the same colour, and in each round an atom's new colour is set by its old colour and the multiset of its neighbours' colours. The colours stop changing after two rounds, and both molecules end with two branch carbons, four carbons bonded to a branch carbon and four further away. Any message-passing network with sum aggregation on these bond graphs therefore gives the two molecules identical readouts, with or without the hydrogens. A 3D model separates them at once, because the distances to second and third neighbours across a five-membered ring differ from those across a six-membered ring.

{{< fig src="wl-test.svg" alt="Carbon skeletons of decalin and bicyclopentyl, with atoms coloured by their Weisfeiler–Lehman class: two teal branch carbons, four orange neighbours of the branch carbons and four violet outer carbons in each molecule" caption="Colour refinement assigns both molecules the same colour counts (4, 4 and 2), so a bond-graph network with sum aggregation cannot tell them apart. Coordinates, ring-size features or higher-order message passing break the tie." >}}

{{< note type="key" >}}
- A molecule or crystal is a graph; each message-passing layer updates every atom from its neighbours, with functions shared by all atoms.
- Sum aggregation and a summed readout make the prediction independent of atom numbering and extensive in system size.
- After $T$ layers an atom sees $T$ hops, roughly $T r_c$ in space; depth trades range against locality and over-smoothing.
- Distance-only networks are invariant to rotations; equivariant networks carry directional features and need far less data.
- Graph networks are now standard for materials property prediction, interatomic potentials and large-scale screening.
- Bond-graph message passing cannot separate graphs that the Weisfeiler–Lehman test confuses, such as decalin and bicyclopentyl; deep stacks over-smooth and over-squash.
{{< /note >}}

{{< quiz >}}
- q: "After three message-passing layers on a molecular graph with bonds as edges, which atoms can influence the state of atom $i$?"
  options: ["Only its direct neighbours", "Atoms up to three bonds away", "Every atom in the molecule"]
  answer: 1
  why: "Each layer propagates information one edge further, so after T layers the receptive field is the T-hop neighbourhood."
- q: "Why is sum aggregation over neighbours permutation-invariant?"
  options: ["Because sums are always positive", "Because the result of a sum does not depend on the order of its terms", "Because the neighbours are sorted first"]
  answer: 1
  why: "Addition is commutative, so relabelling the neighbours leaves the aggregated message unchanged. No sorting is needed."
- q: "What do equivariant networks such as NequIP and MACE carry that SchNet does not?"
  options: ["Element embeddings", "Directional (vector and tensor) features that rotate with the structure", "A cut-off radius"]
  answer: 1
  why: "SchNet's messages depend only on distances. Equivariant networks propagate features of higher angular momentum built from spherical harmonics of the bond directions, which makes them far more data-efficient."
- q: "A GNN predicts an energy as $E = \\sum_i \\varepsilon(\\mathbf h_i^{(T)})$. Doubling the system by placing two well-separated copies side by side gives what energy?"
  options: ["The same energy", "Twice the energy", "It depends on the node numbering"]
  answer: 1
  why: "Separated copies do not exchange messages, so each atom's state is unchanged and the sum doubles. The architecture is extensive by construction."
- q: "In the formaldehyde example, why do the two hydrogens have identical states after every layer?"
  options: ["Their embeddings were initialised to zero", "The ReLU removes the differences between them", "They have the same element and equivalent surroundings, so they receive identical messages"]
  answer: 2
  why: "Message passing sees only elements, edges and neighbours. Two atoms related by the molecule's symmetry receive the same messages and stay identical, which is the correct behaviour."
- q: "A crystal-graph network has three message-passing layers and a 5 Å cut-off. Roughly how far away can an atom be and still influence another atom's final state?"
  options: ["5 Å", "About 15 Å", "Any distance, because the crystal is periodic"]
  answer: 1
  why: "Each layer carries information one cut-off further, so the receptive field is about 3 × 5 Å = 15 Å."
- q: "A distance-only network such as SchNet predicts a property for both mirror-image forms of a chiral molecule. What does it predict?"
  options: ["Identical values, because mirror images have identical interatomic distances", "Different values, because the coordinates differ", "Nothing; it cannot handle chiral molecules"]
  answer: 0
  why: "Reflection preserves every distance, so a network that sees only distances cannot tell enantiomers apart. That is correct for the energy of an isolated molecule but not for chirality-dependent properties."
- q: "A model uses mean aggregation over neighbours. Which pair of carbon environments can it not distinguish?"
  options: ["The carbon of CH₄ and the carbon of CH₂", "A carbon bonded to O and a carbon bonded to N", "A carbon with one H and a carbon with one F"]
  answer: 0
  why: "The mean of four identical hydrogen states equals the mean of two. Sum aggregation gives 4h and 2h and separates them."
- q: "Why does a message-passing potential with four layers and a 5 Å cut-off need more communication in parallel MD than a classical potential with the same cut-off?"
  options: ["It has more parameters", "Each processor needs ghost atoms out to about four cut-offs and must exchange node features after every layer", "It cannot use neighbour lists"]
  answer: 1
  why: "The receptive field is up to T × r_c, so the ghost shell is thicker and intermediate features must be communicated between layers. Allegro avoids this by keeping its receptive field at one cut-off."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. Gilmer, S. S. Schoenholz, P. F. Riley, O. Vinyals and G. E. Dahl, “Neural message passing for quantum chemistry,” *Proceedings of ICML*, 1263–1272 (2017).
2. K. T. Schütt, H. E. Sauceda, P.-J. Kindermans, A. Tkatchenko and K.-R. Müller, “SchNet – a deep learning architecture for molecules and materials,” *Journal of Chemical Physics* **148**, 241722 (2018).
3. J. Gasteiger (Klicpera), J. Groß and S. Günnemann, “Directional message passing for molecular graphs,” *International Conference on Learning Representations* (2020) (DimeNet).
4. K. Xu, W. Hu, J. Leskovec and S. Jegelka, “How powerful are graph neural networks?,” *International Conference on Learning Representations* (2019).
5. T. N. Kipf and M. Welling, “Semi-supervised classification with graph convolutional networks,” *International Conference on Learning Representations* (2017).
6. K. T. Schütt, O. T. Unke and M. Gastegger, “Equivariant message passing for the prediction of tensorial properties and molecular spectra,” *Proceedings of ICML*, 9377–9388 (2021) (PaiNN).
7. S. Batzner, A. Musaelian, L. Sun, M. Geiger, J. P. Mailoa, M. Kornbluth, N. Molinari, T. E. Smidt and B. Kozinsky, “E(3)-equivariant graph neural networks for data-efficient and accurate interatomic potentials,” *Nature Communications* **13**, 2453 (2022) (NequIP).
8. I. Batatia, D. P. Kovács, G. N. C. Simm, C. Ortner and G. Csányi, “MACE: higher order equivariant message passing neural networks for fast and accurate force fields,” *Advances in Neural Information Processing Systems* **35** (2022).
9. M. Geiger and T. Smidt, “e3nn: Euclidean neural networks,” arXiv:2207.09453 (2022).
10. W. L. Hamilton, *Graph Representation Learning*, Morgan & Claypool (2020), free online.
11. P. Reiser, M. Neubert, A. Eberhard, L. Torresi, C. Zhou, C. Shao, H. Metni, C. van Hoesel, H. Schopmans, T. Sommer and P. Friederich, “Graph neural networks for materials science and chemistry,” *Communications Materials* **3**, 93 (2022).
12. F. Scarselli, M. Gori, A. C. Tsoi, M. Hagenbuchner and G. Monfardini, “The graph neural network model,” *IEEE Transactions on Neural Networks* **20**, 61–80 (2009).
13. D. Rogers and M. Hahn, “Extended-connectivity fingerprints,” *Journal of Chemical Information and Modeling* **50**, 742–754 (2010).
14. D. K. Duvenaud et al., “Convolutional networks on graphs for learning molecular fingerprints,” *Advances in Neural Information Processing Systems* **28** (2015).
15. T. Xie and J. C. Grossman, “Crystal graph convolutional neural networks for an accurate and interpretable prediction of material properties,” *Physical Review Letters* **120**, 145301 (2018).
16. C. Chen, W. Ye, Y. Zuo, C. Zheng and S. P. Ong, “Graph networks as a universal machine learning framework for molecules and crystals,” *Chemistry of Materials* **31**, 3564–3572 (2019).
17. K. Choudhary and B. DeCost, “Atomistic line graph neural network for improved materials property predictions,” *npj Computational Materials* **7**, 185 (2021).
18. C. Chen and S. P. Ong, “A universal graph deep learning interatomic potential for the periodic table,” *Nature Computational Science* **2**, 718–728 (2022).
19. B. Deng, P. Zhong, K. Jun, J. Riebesell, K. Han, C. J. Bartel and G. Ceder, “CHGNet as a pretrained universal neural network potential for charge-informed atomistic modelling,” *Nature Machine Intelligence* **5**, 1031–1041 (2023).
20. A. Merchant, S. Batzner, S. S. Schoenholz, M. Aykol, G. Cheon and E. D. Cubuk, “Scaling deep learning for materials discovery,” *Nature* **624**, 80–85 (2023).
21. U. Alon and E. Yahav, “On the bottleneck of graph neural networks and its practical implications,” *International Conference on Learning Representations* (2021).
22. J. Klicpera, A. Bojchevski and S. Günnemann, “Predict then propagate: graph neural networks meet personalized PageRank,” *International Conference on Learning Representations* (2019) (APPNP).
23. A. Musaelian, S. Batzner, A. Johansson, L. Sun, C. J. Owen, M. Kornbluth and B. Kozinsky, “Learning local equivariant representations for large-scale atomistic dynamics,” *Nature Communications* **14**, 579 (2023) (Allegro).
24. B. Weisfeiler and A. Leman, “The reduction of a graph to canonical form and the algebra which appears therein,” *Nauchno-Technicheskaya Informatsia*, Series 2, **9**, 12–16 (1968).

</div>
