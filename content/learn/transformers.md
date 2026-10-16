---
title: "Attention and transformers"
description: "Scaled dot-product attention derived step by step, why it is divided by √d, multi-head attention, positional encodings including rotary ones, the transformer block, and where transformers appear in chemistry and materials science."
track: arch
weight: 3
level: Core
minutes: 55
lab: "Steer attention with query and key projections"
prereqs: ["neural-networks"]
---

## Attention as a soft lookup

In a sequence, a protein, a SMILES string, a sentence, the meaning of one element depends on others, sometimes far away. Recurrent networks pass information along the sequence one step at a time and struggle with long distances. **Attention** lets every element look directly at every other element and decide how much each matters.

Think of it as a soft dictionary lookup. Each position $i$ emits a **query** $\mathbf q_i$ ("what am I looking for?"); every position $j$ offers a **key** $\mathbf k_j$ ("what do I contain?") and a **value** $\mathbf v_j$ ("what do I pass on?"). Position $i$ compares its query with every key, turns the similarities into weights that sum to one, and takes the weighted average of the values:

$$
\alpha_{ij} = \frac{\exp\!\big(\mathbf q_i\cdot\mathbf k_j/\sqrt{d_k}\big)}{\sum_{j'}\exp\!\big(\mathbf q_i\cdot\mathbf k_{j'}/\sqrt{d_k}\big)}, \qquad \mathbf o_i = \sum_j \alpha_{ij}\,\mathbf v_j .
$$

The queries, keys and values are learned linear projections of the input vectors $\mathbf x_i$: $\mathbf q_i = \mathbf W_Q\mathbf x_i$, $\mathbf k_i = \mathbf W_K\mathbf x_i$, $\mathbf v_i = \mathbf W_V\mathbf x_i$. Stacking all positions into matrices gives the form in which attention is always written (Vaswani et al., 2017):

$$
\operatorname{Attention}(\mathbf Q,\mathbf K,\mathbf V) = \operatorname{softmax}\!\left(\frac{\mathbf Q\mathbf K^{\top}}{\sqrt{d_k}}\right)\mathbf V .
$$

When queries, keys and values all come from the same sequence this is **self-attention**; when queries come from one sequence and keys and values from another (a decoder looking at an encoder's output, or a ligand attending to a protein) it is **cross-attention**.

{{< widget name="attention" title="Scaled dot-product attention in two dimensions" caption="Seven tokens of LiFePO₄ with two-dimensional embeddings. The matrix shows every query's weights over every key; the left panel shows the selected query, its weighted connections and its output (the weighted average). Rotate the projections, sharpen the softmax, add a causal mask, and switch on rotary position encoding to make the four O tokens distinguishable." >}}

In the lab, try:

1. **Rotate $\mathbf W_Q$ or $\mathbf W_K$.** The same embeddings now produce completely different attention patterns: learning the projections is how a transformer learns *what to look for*.
2. **Raise the sharpness.** The softmax becomes nearly a hard maximum: each query attends to one key. Low sharpness spreads attention evenly, and the output becomes the plain average.
3. **Look at the four O rows.** Without positional information they are identical, because identical inputs produce identical queries, keys and outputs. Self-attention is **permutation-equivariant**: it treats its input as a set. Switch on RoPE and the rows differ.

## Why divide by √d?

If the components of $\mathbf q$ and $\mathbf k$ are independent with zero mean and unit variance, their dot product $\sum_{a=1}^{d_k} q_a k_a$ has variance $d_k$. For $d_k = 64$ the scores have a standard deviation of 8, the softmax saturates (one weight near 1, the rest near 0), and its gradients vanish. Dividing by $\sqrt{d_k}$ restores unit variance. It is a small detail with a large effect on trainability, and the same reasoning underlies careful weight initialisation ([the lesson on neural networks in practice](../neural-networks/)).

## Multi-head attention

A single attention pattern can capture one kind of relationship. **Multi-head attention** runs $H$ attention operations in parallel, each with its own projections of width $d_k = d_{\text{model}}/H$, concatenates their outputs and mixes them with a final linear map:

$$
\operatorname{MHA}(\mathbf X) = \big[\operatorname{head}_1, \dots, \operatorname{head}_H\big]\mathbf W_O, \qquad \operatorname{head}_h = \operatorname{Attention}\big(\mathbf X\mathbf W_Q^{h}, \mathbf X\mathbf W_K^{h}, \mathbf X\mathbf W_V^{h}\big).
$$

Different heads can specialise, for example on local neighbours, on chemically similar tokens or on long-range partners, at the same total cost as one wide head.

## Where am I? Positional encoding

Because attention ignores order, position must be injected. The original transformer adds fixed sinusoids of different frequencies to the input embeddings,

$$
\text{PE}(p, 2a) = \sin\!\big(p/10000^{2a/d}\big), \qquad \text{PE}(p, 2a+1) = \cos\!\big(p/10000^{2a/d}\big).
$$

**Rotary position embedding** (RoPE; Su et al.), used in most current language models, instead rotates each two-dimensional pair of query and key components by an angle proportional to the position, $\mathbf q_i \to \mathbf R(i\omega)\mathbf q_i$, $\mathbf k_j \to \mathbf R(j\omega)\mathbf k_j$. Since $\mathbf R(i\omega)^\top\mathbf R(j\omega) = \mathbf R\big((j-i)\omega\big)$, the score depends only on the **relative** position $j - i$, a property that generalises better to sequences longer than those seen in training. The lab's RoPE switch implements exactly this in two dimensions.

For atoms in space the analogous information is geometry, not order: equivariant transformers (for example Equiformer) build attention weights from interatomic distances and directions instead of sequence positions.

## The transformer block

A transformer stacks identical blocks, each made of two sub-layers with residual connections and layer normalisation:

$$
\mathbf X' = \mathbf X + \operatorname{MHA}\big(\operatorname{LN}(\mathbf X)\big), \qquad \mathbf X'' = \mathbf X' + \operatorname{MLP}\big(\operatorname{LN}(\mathbf X')\big).
$$

Attention mixes information *between* positions; the position-wise MLP (typically four times wider than the model) transforms each position *independently*. Residual connections let gradients flow through dozens of layers. A **causal mask**, which sets scores to $-\infty$ for $j > i$ (try it in the lab), stops each position from seeing the future, and turns the model into an **autoregressive** generator trained to predict the next token. That one change separates encoder models (BERT-like, for representation and property prediction) from decoder models (GPT-like, for generation).

**A connection worth noticing.** Self-attention is message passing on a *complete* graph whose edge weights $\alpha_{ij}$ are computed on the fly from the node features. A transformer is a graph neural network that has not been told which atoms are neighbours and learns it instead. The price is the $\mathcal O(n^2)$ cost of comparing every pair, which limits sequence length; GNNs with a cut-off are $\mathcal O(n)$.

## Transformers in molecular and materials science

- **Protein structure and language models.** AlphaFold 2's Evoformer uses attention over multiple-sequence alignments and residue pairs; protein language models such as ESM-2 learn structure-aware representations from sequences alone.
- **Chemical language models** trained on SMILES or SELFIES strings predict properties and generate molecules autoregressively.
- **Crystal generation.** CrystaLLM trains a GPT-style model on millions of CIF files and generates plausible crystal structures as text.
- **Attention inside scientific models.** Attention layers are often combined with other architectures; the model I used to predict polymer–surface adhesion free energies combines a convolutional encoder for the surface pattern, a recurrent (GRU) encoder for the polymer sequence and a transformer-style attention module ([research](../../research/)).

## In practice

Attention in NumPy, checked against PyTorch's fused implementation:

```python
import numpy as np, torch

def attention(Q, K, V, causal=False):
    """Scaled dot-product attention. Q: (n, d), K: (m, d), V: (m, dv)."""
    s = Q @ K.T / np.sqrt(Q.shape[-1])                  # similarity of every query with every key
    if causal:
        s = np.where(np.tril(np.ones_like(s)) == 1, s, -np.inf)
    w = np.exp(s - s.max(axis=-1, keepdims=True))       # numerically stable softmax
    w /= w.sum(axis=-1, keepdims=True)
    return w @ V, w

rng = np.random.default_rng(0)
X = rng.normal(size=(5, 8))                              # 5 tokens, model width 8
Wq, Wk, Wv = (rng.normal(size=(8, 8)) / np.sqrt(8) for _ in range(3))
out, w = attention(X @ Wq, X @ Wk, X @ Wv, causal=True)
print("each row of weights sums to 1:", np.allclose(w.sum(1), 1))

ref = torch.nn.functional.scaled_dot_product_attention(
    *(torch.tensor(M, dtype=torch.float64) for M in (X @ Wq, X @ Wk, X @ Wv)), is_causal=True)
print("matches PyTorch:", np.allclose(out, ref.numpy()))
```

```text
each row of weights sums to 1: True
matches PyTorch: True
```

In real models use `torch.nn.MultiheadAttention` or `torch.nn.functional.scaled_dot_product_attention`, which dispatch to memory-efficient kernels (FlashAttention) on GPUs.

{{< quiz >}}
- q: "What happens to the attention weights if the $\\sqrt{d_k}$ scaling is removed and $d_k$ is large?"
  options: ["Nothing; it is only a convention", "The scores become large, the softmax saturates towards a one-hot vector, and gradients become very small", "The weights no longer sum to one"]
  answer: 1
  why: "Dot products of random $d_k$-dimensional vectors have variance $d_k$. Large scores push the softmax into saturation, where its gradient vanishes. The weights still sum to one."
- q: "A sequence contains the same token four times. Without positional encoding, how do their self-attention outputs compare?"
  options: ["They differ because they are at different positions", "They are identical, because self-attention treats the input as a set", "They are zero"]
  answer: 1
  why: "Identical inputs give identical queries, and every query is compared with the same set of keys, so the outputs are identical. Positional encodings break the tie."
- q: "With rotary position embeddings, the attention score between positions $i$ and $j$ depends on what?"
  options: ["The absolute positions $i$ and $j$ separately", "Only the relative offset $j - i$ (and the content)", "Only the token content"]
  answer: 1
  why: "Rotating queries by $i\\omega$ and keys by $j\\omega$ makes their dot product depend on the rotation by $(j-i)\\omega$, so only the relative position enters."
- q: "Why does a GPT-style generator use a causal mask during training?"
  options: ["To reduce memory", "So that predicting token $t$ cannot use tokens $t+1, t+2, \\dots$, which would not be available when generating", "To make attention symmetric"]
  answer: 1
  why: "Generation proceeds left to right. The mask makes training match generation: each position may only attend to itself and earlier positions."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, Ł. Kaiser and I. Polosukhin, “Attention is all you need,” *Advances in Neural Information Processing Systems* **30** (2017).
2. D. Bahdanau, K. Cho and Y. Bengio, “Neural machine translation by jointly learning to align and translate,” *International Conference on Learning Representations* (2015).
3. J. Su, M. Ahmed, Y. Lu, S. Pan, W. Bo and Y. Liu, “RoFormer: enhanced transformer with rotary position embedding,” *Neurocomputing* **568**, 127063 (2024); arXiv:2104.09864 (2021).
4. M. Phuong and M. Hutter, “Formal algorithms for transformers,” arXiv:2207.09238 (2022).
5. J. Jumper et al., “Highly accurate protein structure prediction with AlphaFold,” *Nature* **596**, 583–589 (2021).
6. Z. Lin et al., “Evolutionary-scale prediction of atomic-level protein structure with a language model,” *Science* **379**, 1123–1130 (2023).
7. L. M. Antunes, K. T. Butler and R. Grau-Crespo, “Crystal structure generation with autoregressive large language modeling,” *Nature Communications* **15**, 10570 (2024).
8. Y.-L. Liao and T. Smidt, “Equiformer: equivariant graph attention transformer for 3D atomistic graphs,” *International Conference on Learning Representations* (2023).
9. T. Dao, D. Y. Fu, S. Ermon, A. Rudra and C. Ré, “FlashAttention: fast and memory-efficient exact attention with IO-awareness,” *Advances in Neural Information Processing Systems* **35** (2022).

</div>
