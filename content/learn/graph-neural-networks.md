---
title: "Graph neural networks"
description: "Molecules and crystals as graphs; the message-passing framework that learns its own descriptors; why sum aggregation gives permutation invariance; receptive fields; and the line from SchNet to equivariant networks."
track: arch
weight: 2
level: Core
minutes: 50
lab: "Pass messages across aspirin"
prereqs: ["symmetry-descriptors"]
---

## From hand-made descriptors to learned ones

The descriptors of the [previous lesson](../symmetry-descriptors/) are designed by hand and then fixed. **Graph neural networks** (GNNs) keep the same symmetries but *learn* the description of each atom's environment, end to end, from the training data. Since about 2017 they have become the dominant architecture for molecular and materials property prediction and for machine-learned interatomic potentials.

A **graph** $\mathcal G = (\mathcal V, \mathcal E)$ has nodes and edges. A molecule is a graph with atoms as nodes and bonds as edges; for 3D models the edges usually connect every pair of atoms closer than a cut-off radius, labelled with their distance (and, in periodic crystals, connecting atoms to periodic images of their neighbours, see [the lesson on crystal graphs](../materials-representations/)). Each node $i$ carries a feature vector $\mathbf h_i$, initially an embedding of the element, and each edge may carry features $\mathbf e_{ij}$ such as the distance expanded in radial basis functions.

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

{{< widget name="mpnn" title="Message passing on aspirin" caption="The heavy-atom graph of aspirin. Select an atom and step through the layers: the shaded receptive field grows by one bond per layer, and the feature strips change as information flows in. Renumbering the atoms changes nothing in the computed readout." >}}

## Why it respects permutation symmetry

Every operation above is either applied identically to each node or edge, or is a **sum over neighbours**, and a sum does not depend on the order of its terms. Renumbering the atoms therefore renumbers the node states in exactly the same way (the layer is **permutation-equivariant**), and summing over nodes in the readout makes the prediction **permutation-invariant**. The lab recomputes the whole network in the new atom order when you press *Renumber the atoms*; the readout agrees to machine precision. Sum aggregation is also what makes an energy extensive. Mean or max aggregation also respect permutations but lose information about how many neighbours there are; Xu et al. (2019) showed that sum aggregation gives the most expressive networks of this family.

If the edge features depend only on distances, the network is also invariant to rotations and translations. That is the design of **SchNet** (Schütt et al., 2018), whose message uses a learned "continuous filter" of the interatomic distance, $\mathbf m_{ij} = \mathbf h_j \odot W\big(\text{rbf}(r_{ij})\big)$. **DimeNet** adds bond angles to the messages, gaining three-body information.

## Receptive field and the cost of depth

After $T$ layers, a node's state can depend on atoms up to $T$ edges away: its **receptive field**, shaded in the lab. With a geometric cut-off $r_c$ the receptive field is roughly $T r_c$; four layers with $r_c = 5$ Å see 20 Å, which is useful for capturing longer-range effects but makes the energy less local (and harder to parallelise across processors in large MD runs). Very deep message passing also suffers from **over-smoothing**: repeated averaging makes all node states similar. Practical models use three to six layers, residual connections and, where long-range physics matters, explicit electrostatic or dispersion terms.

## Equivariant message passing

Invariant networks throw away directional information early: once the messages see only distances, the network has to rebuild angular information indirectly. **Equivariant** networks carry vector and tensor features that rotate with the structure. Node features are organised by their angular momentum $l$ (scalars $l = 0$, vectors $l = 1$, rank-2 tensors $l = 2$, …), edge directions enter through spherical harmonics $Y_{lm}(\hat{\mathbf r}_{ij})$, and features are combined with Clebsch–Gordan tensor products, which are guaranteed to produce correctly rotating outputs. **NequIP** showed that such networks reach a given accuracy with one to three orders of magnitude less training data than invariant ones. **MACE** combines equivariant messages with the many-body structure of ACE, so that each layer captures high body-order correlations and only two layers are needed. **PaiNN** and **Allegro** are other widely used designs. These are the architectures behind most current interatomic potentials, the subject of [the lesson on interatomic potentials](../mlip/).

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

</div>
