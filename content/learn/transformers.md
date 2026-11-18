---
title: "Attention and transformers"
description: "Scaled dot-product attention derived step by step, why it is divided by √d, multi-head attention, positional encodings including rotary ones, the transformer block, and where transformers appear in chemistry and materials science."
hook: "In a transformer, every token asks every other token a question and takes a weighted average of the answers. Stacked a few dozen times with small networks in between, it predicts protein structures, writes crystal structures as text and reads the scientific literature."
objectives:
  - "Compute scaled dot-product attention weights by hand for a three-token sequence"
  - "Explain why attention scores are divided by the square root of the key dimension"
  - "Explain why self-attention needs positional encodings, and how rotary encodings work"
  - "Count the parameters of a transformer block and estimate how attention cost scales"
  - "Recognise transformers in protein, chemical-language and crystal-generation models"
cover: "cover.svg"
milestones:
  - year: 2015
    text: "Bahdanau, Cho and Bengio add learned attention to neural machine translation"
  - year: 2017
    text: "Vaswani and seven co-authors introduce the transformer, built on attention alone"
  - year: 2019
    text: "Devlin and colleagues publish BERT, a pre-trained transformer encoder"
  - year: 2021
    text: "Jumper and colleagues publish AlphaFold 2, built around the attention-based Evoformer"
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

## Attention by hand: three tokens

Three tokens are enough to see every step. Take the SMILES string of formaldehyde, `C=O`, split into the tokens C, = and O, and suppose the projections have already produced these queries, keys and values, with $d_k = 4$ so that $\sqrt{d_k} = 2$:

| Token | Query $\mathbf q$ | Key $\mathbf k$ | Value $\mathbf v$ |
|---|---|---|---|
| C | (1, 0, 1, 0) | (1, 0, 0, 0) | (2, 0) |
| = | (0, 1, 0, 1) | (0, 1, 0, 1) | (0, 2) |
| O | (1, 1, 0, 0) | (1, 0, 1, 1) | (1, 1) |

Follow the C token. Its query scores 1, 0 and 2 against the keys of C, = and O; divided by 2 these become 0.5, 0 and 1. The softmax exponentiates them, $e^{0.5} = 1.649$, $e^{0} = 1$ and $e^{1} = 2.718$, and divides by their sum, 5.367, giving the weights 0.307, 0.186 and 0.506. C attends most to O, whose key is most closely aligned with its query. Its output is the weighted average of the values, $0.307\,(2,0) + 0.186\,(0,2) + 0.506\,(1,1) = (1.12, 0.88)$.

The O token teaches something different. Its query scores 1 against every key, so all three weights are 1/3 and its output is the plain average of the values, (1, 1). When a query cannot tell the keys apart, attention reduces to averaging.

The cell computes all three rows at once, then repeats the calculation without the $1/\sqrt{d_k}$ scaling and with a causal mask.

{{< py title="attention for three tokens" >}}
import numpy as np
np.set_printoptions(precision=3, suppress=True)
# the three tokens of the SMILES string C=O, after projection
Q = np.array([[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 0, 0]], dtype=float)
K = np.array([[1, 0, 0, 0], [0, 1, 0, 1], [1, 0, 1, 1]], dtype=float)
V = np.array([[2, 0], [0, 2], [1, 1]], dtype=float)

def softmax(s):
    w = np.exp(s - s.max(axis=1, keepdims=True))
    return w / w.sum(axis=1, keepdims=True)

S = Q @ K.T / np.sqrt(K.shape[1])       # every query against every key, divided by sqrt(4) = 2
W = softmax(S)
print("scaled scores:\n", S)
print("attention weights (each row sums to 1):\n", W)
print("outputs, weighted averages of the values:\n", W @ V)
print("weights without the 1/sqrt(d) scaling:\n", softmax(Q @ K.T))
mask = np.tril(np.ones((3, 3)))          # causal mask: no looking at later tokens
print("weights with a causal mask:\n", softmax(np.where(mask == 1, S, -np.inf)))
{{< /py >}}

Without the scaling, C's weight on O rises from 0.51 to 0.67: the same scores, twice as large, make a sharper softmax. With $d_k = 4$ the effect is mild; the next section shows why it becomes severe at realistic widths. With the causal mask the first token can attend only to itself, so its weight is exactly 1, and the second token splits its attention 0.269 to 0.731 between C and itself.

## Why divide by √d?

If the components of $\mathbf q$ and $\mathbf k$ are independent with zero mean and unit variance, their dot product $\sum_{a=1}^{d_k} q_a k_a$ has variance $d_k$. For $d_k = 64$ the scores have a standard deviation of 8, the softmax saturates (one weight near 1, the rest near 0), and its gradients vanish. Dividing by $\sqrt{d_k}$ restores unit variance. It is a small detail with a large effect on trainability, and the same reasoning underlies careful weight initialisation ([the lesson on neural networks in practice](../neural-networks/)).

The variance follows in one line. Each product $q_a k_a$ of independent zero-mean components has mean zero and variance $\mathbb E[q_a^2]\,\mathbb E[k_a^2] = 1$, and the variances of $d_k$ independent terms add: $\operatorname{Var}(\mathbf q\cdot\mathbf k) = d_k$. The gradient problem follows from the derivative of the softmax, $\partial\alpha_j/\partial s_l = \alpha_j(\delta_{jl} - \alpha_l)$. When one weight is close to 1 and the rest close to 0, every entry of this Jacobian is close to zero, so the loss sends almost no signal back to the scores, and through them to $\mathbf W_Q$ and $\mathbf W_K$. Layer normalisation and standard initialisation keep the components of $\mathbf q$ and $\mathbf k$ near unit variance at the start of training; afterwards the model is free to grow the norms of its projections and sharpen a head deliberately.

{{< note type="try" title="Pause and predict" >}}
Take 16 keys and one query, all with independent unit-variance components, and $d_k = 64$. Without the $1/\sqrt{d_k}$ factor, how many of the 16 keys does a typical query effectively attend to? With it?
{{< /note >}}

Measure the spread of the weights by the effective number of keys, $\exp\!\big(-\sum_j \alpha_j\ln\alpha_j\big)$, which is 1 for a one-hot weight vector and 16 for uniform weights. Averaged over 4,000 random draws, the unscaled softmax attends to 1.6 keys and gives its largest weight 0.84 on average; the scaled one attends to 10.8 keys with a largest weight of 0.25. The scaled value hardly changes between $d_k = 4$ and $d_k = 512$, which is the point of the factor: the sharpness of a fresh attention head no longer depends on its width.

{{< fig src="scaling.svg" alt="Left: histograms of 64-dimensional query–key dot products, a wide orange one with standard deviation 8 and a narrow blue one with standard deviation 1 after division by 8. Right: effective number of keys attended out of 16 against key dimension, flat near 11 with scaling and falling from about 7 to about 1 without it." caption="Without the $1/\sqrt{d_k}$ factor the scores widen as $\sqrt{d_k}$ and the softmax collapses onto one key; with it, a randomly initialised head spreads its attention over about 11 of 16 keys at any width. Computed from 4,000 random queries per width." >}}

## Multi-head attention

A single attention pattern can capture one kind of relationship. **Multi-head attention** runs $H$ attention operations in parallel, each with its own projections of width $d_k = d_{\text{model}}/H$, concatenates their outputs and mixes them with a final linear map:

$$
\operatorname{MHA}(\mathbf X) = \big[\operatorname{head}_1, \dots, \operatorname{head}_H\big]\mathbf W_O, \qquad \operatorname{head}_h = \operatorname{Attention}\big(\mathbf X\mathbf W_Q^{h}, \mathbf X\mathbf W_K^{h}, \mathbf X\mathbf W_V^{h}\big).
$$

Different heads can specialise, for example on local neighbours, on chemically similar tokens or on long-range partners, at the same total cost as one wide head.

{{< note type="warn" title="Myth" >}}
"More heads mean a bigger model." With $d_k = d_{\text{model}}/H$, each head's $\mathbf W_Q^h$ is a $d_{\text{model}}\times d_k$ matrix, and the $H$ of them together form one $d_{\text{model}}\times d_{\text{model}}$ matrix. BERT-base, with $d_{\text{model}} = 768$ and 12 heads of width 64, has exactly as many attention parameters as a single head of width 768 would. The cost of the scores is also unchanged: $H$ matrices of $n^2 d_k$ multiply-adds sum to $n^2 d_{\text{model}}$. What changes is the number of distinct attention patterns per layer, 12 in BERT-base, and the rank of each: a head of width 64 can express only rank-64 score matrices.
{{< /note >}}

## Where am I? Positional encoding

Because attention ignores order, position must be injected. The original transformer adds fixed sinusoids of different frequencies to the input embeddings,

$$
\text{PE}(p, 2a) = \sin\!\big(p/10000^{2a/d}\big), \qquad \text{PE}(p, 2a+1) = \cos\!\big(p/10000^{2a/d}\big).
$$

**Rotary position embedding** (RoPE; Su et al.), used in most current language models, instead rotates each two-dimensional pair of query and key components by an angle proportional to the position, $\mathbf q_i \to \mathbf R(i\omega)\mathbf q_i$, $\mathbf k_j \to \mathbf R(j\omega)\mathbf k_j$. Since $\mathbf R(i\omega)^\top\mathbf R(j\omega) = \mathbf R\big((j-i)\omega\big)$, the score depends only on the **relative** position $j - i$, a property that generalises better to sequences longer than those seen in training. The lab's RoPE switch implements exactly this in two dimensions.

The sinusoids are not arbitrary. Their wavelengths form a geometric progression from $2\pi$ to $10000\cdot2\pi$ positions; for $d = 512$ the fastest pair of components repeats every 6.3 tokens and the slowest every 62,800. Each (sin, cos) pair at frequency $\omega_a$ is a point on a circle, and moving $k$ positions along the sequence rotates it by the angle $k\omega_a$, a fixed linear map that does not depend on $p$. Vaswani and colleagues chose them for that property, which lets attention express relative offsets. RoPE uses the same frequencies, $\omega_a = 10000^{-2a/d}$, but applies the rotation to the queries and keys instead of adding it to the input, so that the relative offset appears directly in every score. BERT took a third route, a learned vector for each of 512 positions, which works well inside that range and has nothing to offer at position 513.

For atoms in space the analogous information is geometry, not order: equivariant transformers (for example Equiformer) build attention weights from interatomic distances and directions instead of sequence positions.

## The transformer block

A transformer stacks identical blocks, each made of two sub-layers with residual connections and layer normalisation:

$$
\mathbf X' = \mathbf X + \operatorname{MHA}\big(\operatorname{LN}(\mathbf X)\big), \qquad \mathbf X'' = \mathbf X' + \operatorname{MLP}\big(\operatorname{LN}(\mathbf X')\big).
$$

{{< fig src="block.svg" alt="Diagram of a pre-LN transformer block: a horizontal residual stream from X to X double-prime, with two branches, layer norm then multi-head attention (4d squared parameters) and layer norm then an MLP from d to 4d to d (8d squared parameters), each added back to the stream" caption="A pre-LN block reads from the residual stream, normalises, transforms and adds the result back. Attention moves information between tokens; the MLP, which holds two thirds of the parameters, works on each token alone." >}}

Attention mixes information *between* positions; the position-wise MLP (typically four times wider than the model) transforms each position *independently*. Residual connections let gradients flow through dozens of layers. A **causal mask**, which sets scores to $-\infty$ for $j > i$ (try it in the lab), stops each position from seeing the future, and turns the model into an **autoregressive** generator trained to predict the next token. That one change separates encoder models (BERT-like, for representation and property prediction) from decoder models (GPT-like, for generation).

Layer normalisation (Ba, Kiros and Hinton, 2016) acts on each token separately: it subtracts the mean of the token's $d$ features, divides by their standard deviation, and applies a learned scale and shift, $\operatorname{LN}(\mathbf x) = \boldsymbol\gamma\odot(\mathbf x-\mu)/\sigma + \boldsymbol\beta$. The original transformer normalised *after* each residual addition, $\mathbf X' = \operatorname{LN}\big(\mathbf X + \operatorname{MHA}(\mathbf X)\big)$; the pre-LN form above normalises only the input of each branch and leaves the residual stream untouched, so a clean identity path runs from the first block to the last. The two objectives differ as much as the masks. BERT is trained to recover 15 per cent of the tokens that have been hidden or replaced, using context on both sides; GPT-style models are trained to predict every next token. Both minimise a cross-entropy, and a useful sanity check follows: a chemical language model over a vocabulary of 40 SMILES tokens that guesses uniformly has a loss of $\ln 40 \approx 3.7$ nats per token, so a training curve that starts far from 3.7 points to a bug in the data pipeline or the initialisation.

{{< note type="story" >}}
Attention entered neural networks through machine translation. Dzmitry Bahdanau, Kyunghyun Cho and Yoshua Bengio (2015) let a recurrent translation model look back over all the words of the source sentence, with learned weights, at every step of writing the output, instead of squeezing the whole sentence into one fixed vector. Two years later Ashish Vaswani and seven co-authors, most of them at Google, removed the recurrence altogether, kept attention, MLPs and residual connections, and titled the paper accordingly: “Attention is all you need”. Their larger model trained in three and a half days on eight GPUs and set new records for English-to-German and English-to-French translation. Within two years its encoder and decoder had become the templates for BERT and GPT.
{{< /note >}}

**A connection worth noticing.** Self-attention is message passing on a *complete* graph whose edge weights $\alpha_{ij}$ are computed on the fly from the node features. A transformer is a graph neural network that has not been told which atoms are neighbours and learns it instead. The price is the $\mathcal O(n^2)$ cost of comparing every pair, which limits sequence length; GNNs with a cut-off are $\mathcal O(n)$.

{{< fig src="graphs.svg" alt="The same fourteen atoms drawn twice. Left: edges only between atoms closer than a cut-off, with the cut-off circle around one atom. Right: lines from one atom to all thirteen others, with widths proportional to its attention weights." caption="A graph network fixes its edges by distance before it sees any features (a). Self-attention connects every pair and computes each edge weight from the content (b); the widths shown are the weights of one query in a randomly initialised attention layer." >}}

### Counting parameters and cost

The parameters of a block are easy to count, and the count explains the sizes quoted for real models. Multi-head attention has four $d \times d$ matrices ($\mathbf W_Q$, $\mathbf W_K$, $\mathbf W_V$ for all heads together, and $\mathbf W_O$); the MLP maps $d \to 4d \to d$.

{{< eq title="Parameters of one transformer block" say="Four square matrices for attention and two four-times-wider ones for the MLP: twelve d-squared in all." >}}
$$ \textcolor{#f08c2e}{P}_{\text{block}} \approx \underbrace{4\textcolor{#4c6ef5}{d}^2}_{\text{attention}} + \underbrace{8\textcolor{#4c6ef5}{d}^2}_{\text{MLP}} = 12\,\textcolor{#4c6ef5}{d}^2 $$
- $\textcolor{#4c6ef5}{d}$: the model width, $d_{\text{model}}$
- biases and layer-norm parameters add only a few $d$ per block
- the count depends neither on the sequence length nor on the number of heads
{{< /eq >}}

BERT-base (Devlin et al., 2019) has 12 blocks of width 768: $12 \times 12 \times 768^2 \approx 85$ million parameters, and its embedding table (about 30,000 tokens, each a 768-number vector) adds 23 million, close to the published 110 million. The same formula for GPT-3 (96 blocks of width 12,288) gives 174 billion, against a published 175 billion.

Computation scales differently. The weights act on each token separately, so their cost grows linearly with the sequence length $n$, but the attention scores form an $n \times n$ matrix in every head of every layer: a million scores for 1,000 tokens, ten billion for 100,000. Doubling the length quadruples the attention cost, which is why long sequences need memory-efficient kernels such as FlashAttention (Dao et al., 2022), and why a protein of 1,000 residues costs about eleven times more attention than one of 300.

Which term dominates depends on the ratio of sequence length to width. Per layer and per token, the weights cost two floating-point operations per parameter, $24d^2$ in all; the scores $\mathbf Q\mathbf K^\top$ and the weighted sum of values each cost $n d$ multiply-adds, $4nd$ operations. The fraction of a layer's work spent on attention is therefore

$$
f = \frac{4n^2 d}{4n^2 d + 24 n d^2} = \frac{n}{n + 6d},
$$

which reaches one half at $n = 6d$: 4,608 tokens for a width of 768. At BERT's 512 tokens attention takes 10 per cent of the operations; for a 1,000-residue protein, 18 per cent; at 32,768 tokens, 88 per cent. Memory turns over sooner than arithmetic: one $32{,}768\times32{,}768$ score matrix in 16-bit numbers occupies 2.1 GB, for every head of every layer.

{{< fig src="cost.svg" alt="Left: log-log plot of operations per layer against sequence length for width 768, with a straight weight line of slope one and an attention line of slope two crossing at 4,608 tokens. Right: percentage of operations spent on attention against sequence length for widths 256, 768 and 2,048, each an S-shaped curve passing 50 per cent at six times the width." caption="For short sequences the projections and MLPs dominate; attention takes over beyond $n = 6d$. Dashed lines mark BERT's 512-token limit and a 1,000-residue protein, both well inside the weight-dominated regime for $d = 768$." >}}

{{< note type="warn" title="Myth" >}}
"FlashAttention makes attention linear." It computes exact attention, with the same $n^2 d$ multiply-adds. What it removes is the $n\times n$ score matrix in GPU main memory: it processes queries and keys in tiles that fit in on-chip memory and keeps running softmax statistics, so memory grows linearly in $n$ and far fewer bytes move between memory levels. The speed-up comes from that reduced memory traffic. Methods that change the scaling itself, by restricting attention to local windows or by approximating the softmax, compute a different function and must be validated as such.
{{< /note >}}

{{< note type="practice" title="Back of the envelope" >}}
Check $12d^2$ on a science model. ESM-2 with 650 million parameters has 33 blocks of width 1,280: $33 \times 12 \times 1280^2 = 6.49\times10^8$. Its vocabulary of amino-acid and special tokens has only a few dozen entries, so the embedding table adds almost nothing, and the formula accounts for essentially the whole model.
{{< /note >}}

## Transformers in molecular and materials science

- **Protein structure and language models.** AlphaFold 2's Evoformer uses attention over multiple-sequence alignments and residue pairs; protein language models such as ESM-2 learn structure-aware representations from sequences alone.
- **Chemical language models** trained on SMILES or SELFIES strings predict properties and generate molecules autoregressively. Tokenisation matters here: a SMILES tokeniser must keep `Cl` and `Br` as single tokens, treat bracket atoms such as `[nH]` or `[C@@H]` as units, and handle ring-closure digits, and a generated string can still be invalid, for example with an unclosed ring or a pentavalent carbon. SELFIES (Krenn et al., 2020) was designed so that every string decodes to a valid molecule.
- **Crystal generation.** CrystaLLM trains a GPT-style model on millions of CIF files and generates plausible crystal structures as text.
- **Text mining.** Language models pre-trained on the materials literature, such as MatSciBERT (Gupta et al., 2022), pull compositions, properties and processing conditions out of papers at a scale no human reader can match.
- **Attention inside scientific models.** Attention layers are often combined with other architectures; the model I used to predict polymer–surface adhesion free energies combines a convolutional encoder for the surface pattern, a recurrent (GRU) encoder for the polymer sequence and a transformer-style attention module ([research](../../research/)).

{{< note type="practice" title="From the lab" >}}
A common protein workflow uses a pretrained language model as a fixed feature extractor. Run each sequence through ESM-2 (650M), take the 1,280-number representation of every residue from the last layer, average over residues, and fit a ridge regression or a small MLP to a few hundred measured values, such as melting temperatures or expression levels. The decisive step is the split: homologous sequences in both training and test sets inflate the test score, so practitioners cluster sequences by identity, often at 30 to 50 per cent with tools such as MMseqs2, and keep whole clusters on one side of the split. The same logic applies to materials, where near-duplicate compositions leak across random splits ([generalisation](../generalisation/)).
{{< /note >}}

Transformers have weak built-in assumptions: no locality, no notion of distance, no symmetry beyond permutation. With millions of training sequences that is an advantage; with the few thousand labelled examples typical of a materials property, graph networks and kernel methods with the right symmetries usually match or beat them, and transformers earn their place through pretraining on large unlabelled corpora.

{{< note type="warn" title="Reading attention maps as explanations" >}}
It is tempting to plot a trained model's attention weights and read them as the chemistry the model has discovered: this residue attends to that one, so they must interact. Be careful. Jain and Wallace (2019) showed, for text classifiers, that very different attention patterns can give the same predictions, and that attention weights often disagree with other measures of which inputs matter. A model has many heads and layers, and the values and MLPs transform whatever attention mixes. Treat an attention map as a hypothesis to test, for example by perturbing the inputs it highlights, not as evidence.
{{< /note >}}

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

{{< note type="practice" >}}
- **Mask the padding.** Sequences in a batch are padded to a common length; pass a key-padding mask so that no query attends to the padding tokens.
- **Head width.** Most models keep $d_k = d_{\text{model}}/H$ near 64, so a width of 512 has 8 heads and a width of 768 has 12.
- **Learning-rate warm-up.** Transformers are usually trained with AdamW and a learning rate that rises linearly over the first few thousand steps before decaying. The original post-LN arrangement is particularly sensitive to skipping warm-up; the pre-LN block shown above trains more stably (Xiong et al., 2020).
{{< /note >}}

{{< note type="key" >}}
- Attention gives each query a softmax-weighted average of the values, weighted by query–key similarity.
- Dividing scores by $\sqrt{d_k}$ keeps them of order one, so the softmax does not saturate.
- Self-attention treats its input as a set; order enters only through positional encodings, such as sinusoids or rotary embeddings.
- A block is attention plus a position-wise MLP with residuals and layer norm, about $12d^2$ parameters; attention cost grows as $n^2$.
- Self-attention is message passing on a complete graph whose edge weights are computed from the content.
- Attention's share of a layer's work is n/(n + 6d): it dominates only beyond about six times the model width.
{{< /note >}}

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
- q: "In the three-token example, the query of O scores the same against every key. What does its output become?"
  options: ["Zero", "The value of O itself", "The plain average of the three values"]
  answer: 2
  why: "Equal scores give equal softmax weights of 1/3, so the output is the unweighted mean of the values, (1, 1)."
- q: "Roughly how many parameters does one transformer block of width $d = 512$ have?"
  options: ["About 3.1 million", "About 0.26 million", "It depends on the sequence length"]
  answer: 0
  why: "About $12d^2 = 12 \\times 512^2 \\approx 3.1$ million: $4d^2$ in the attention projections and $8d^2$ in the MLP, independent of the sequence length."
- q: "The sequence length doubles. By roughly what factor does the cost of computing the attention scores grow?"
  options: ["2", "4", "It does not change"]
  answer: 1
  why: "There is one score for every pair of positions, $n^2$ in all, so doubling $n$ multiplies the number of scores by four."
- q: "A model of width 768 switches from 12 attention heads to 24. What happens to the number of attention parameters?"
  options: ["It doubles", "It stays the same, because each head becomes half as wide", "It halves"]
  answer: 1
  why: "With $d_k = d/H$, the per-head projections together always form $d \\times d$ matrices, so the count stays $4d^2$."
- q: "For a model of width $d = 768$, at roughly what sequence length do the attention scores cost as many operations as all the weight matrices of a layer?"
  options: ["About 768 tokens", "About 4,600 tokens", "About 590,000 tokens"]
  answer: 1
  why: "The attention share is $n/(n + 6d)$, which equals one half at $n = 6d = 4{,}608$."
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
10. J. Devlin, M.-W. Chang, K. Lee and K. Toutanova, “BERT: pre-training of deep bidirectional transformers for language understanding,” *Proceedings of NAACL-HLT*, 4171–4186 (2019).
11. T. B. Brown et al., “Language models are few-shot learners,” *Advances in Neural Information Processing Systems* **33** (2020).
12. T. Gupta, M. Zaki, N. M. A. Krishnan and Mausam, “MatSciBERT: a materials domain language model for text mining and information extraction,” *npj Computational Materials* **8**, 102 (2022).
13. S. Jain and B. C. Wallace, “Attention is not explanation,” *Proceedings of NAACL-HLT* (2019).
14. R. Xiong et al., “On layer normalization in the transformer architecture,” *Proceedings of ICML* (2020).
15. J. L. Ba, J. R. Kiros and G. E. Hinton, “Layer normalization,” arXiv:1607.06450 (2016).
16. M. Krenn, F. Häse, A. Nigam, P. Friederich and A. Aspuru-Guzik, “Self-referencing embedded strings (SELFIES): a 100% robust molecular string representation,” *Machine Learning: Science and Technology* **1**, 045024 (2020).

</div>
