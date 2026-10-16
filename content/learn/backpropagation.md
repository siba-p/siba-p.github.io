---
title: "Backpropagation, step by step"
description: "How a network learns which of its weights to blame: computational graphs, the chain rule as a relay of local derivatives, a full forward and backward pass with numbers, why reverse mode costs the same as one extra forward pass, and the history of the idea."
track: neuron
weight: 4
level: Foundation
minutes: 45
lab: "Run forward and backward passes by hand"
prereqs: ["networks-bend-space"]
---

## The credit-assignment problem

For one neuron, [the gradient was a single neat formula](../how-a-neuron-learns/). A network has layers of neurons, and a weight deep inside it affects the loss only through everything downstream of it. If the prediction is wrong, how much is each of a million weights to blame, and in which direction should each move? This is the **credit-assignment problem**, and its solution, **backpropagation**, is the algorithm that made deep learning possible.

The solution rests on one idea from school calculus, the **chain rule**, organised cleverly.

## Computations as graphs

Write any calculation as a **computational graph**: a chain (or more generally a network) of simple operations, each node computing one value from the values flowing into it. Here is the smallest interesting network, one input, one hidden sigmoid neuron and one output neuron, with a squared-error loss, as a graph of seven nodes:

$$
x \;\xrightarrow{\ \times \textcolor{#12a594}{w_1}\ }\; a \;\xrightarrow{\ +\textcolor{#845ef7}{b_1}\ }\; z \;\xrightarrow{\ \sigma\ }\; h \;\xrightarrow{\ \times \textcolor{#12a594}{w_2}\ }\; m \;\xrightarrow{\ +\textcolor{#845ef7}{b_2}\ }\; \hat y \;\xrightarrow{\ (\cdot - y)^2\ }\; \textcolor{#e64980}{L}
$$

Each node knows two things about itself: how to compute its output from its input (the **forward** rule) and how its output changes when its input changes (its **local derivative**). That is all backpropagation needs.

{{< widget name="backprop" title="A computational graph, forward and backward" caption="Press Forward pass to compute every value from left to right (blue). Then Backward pass sends the gradient ∂L/∂(node) from right to left (pink), multiplying by each local derivative on the way. Compare the backprop gradient with the finite-difference check, then press Update the weights a few times and watch the loss fall." >}}

## The chain rule as a relay

The chain rule says that if $L$ depends on $h$, which depends on $z$, then $\partial L/\partial z = (\partial L/\partial h)(\partial h/\partial z)$. Applied along the whole chain, the gradient with respect to the first weight is a product of local derivatives:

{{< eq title="The chain rule along the graph" say="The gradient at any node is the gradient arriving from its right, times its own local slope." >}}
$$ \frac{\partial \textcolor{#e64980}{L}}{\partial \textcolor{#12a594}{w_1}} = \underbrace{2(\hat y - y)}_{\partial L/\partial \hat y}\cdot\underbrace{1}_{\partial \hat y/\partial m}\cdot\underbrace{\textcolor{#12a594}{w_2}}_{\partial m/\partial h}\cdot\underbrace{h(1-h)}_{\partial h/\partial z}\cdot\underbrace{1}_{\partial z/\partial a}\cdot\underbrace{x}_{\partial a/\partial w_1} $$
- every factor is local: it depends only on one node and the values computed in the forward pass
- $h(1-h)$: the derivative of the sigmoid, $\sigma'(z) = \sigma(z)(1-\sigma(z))$
{{< /eq >}}

Backpropagation evaluates this product **from the right**. Call $\bar v = \partial L/\partial v$ the gradient arriving at node $v$. Start with $\bar L = 1$ and pass it leftwards, each node multiplying by its local derivative:

$$
\bar{\hat y} = 2(\hat y - y), \quad \bar m = \bar{\hat y}, \quad \bar h = \bar m\, w_2, \quad \bar z = \bar h\, h(1-h), \quad \bar a = \bar z, \quad \bar w_1 = \bar a\, x .
$$

The parameter gradients fall out along the way: $\bar b_2 = \bar{\hat y}$, $\bar w_2 = \bar m\, h$, $\bar b_1 = \bar z$. A worked example with the lab's starting values ($x = 1.5$, $y = 0.2$, $w_1 = 0.8$, $b_1 = -0.4$, $w_2 = 1.3$, $b_2 = 0.1$):

| Node | Forward value | Backward gradient $\partial L/\partial(\cdot)$ |
|---|---|---|
| $a = w_1x$ | 1.200 | 0.4432 |
| $z = a + b_1$ | 0.800 | 0.4432 |
| $h = \sigma(z)$ | 0.690 | 2.0721 |
| $m = w_2h$ | 0.897 | 1.5939 |
| $\hat y = m + b_2$ | 0.997 | 1.5939 |
| $L = (\hat y - y)^2$ | 0.635 | 1 |

so $\partial L/\partial w_1 = 0.4432 \times 1.5 = 0.665$, which the lab confirms against a finite difference.

## Why it is cheap: reverse mode

Notice what the backward pass did. Each node was visited once going forward and once coming back, and every parameter's gradient was produced along the way. **The cost of all the gradients together is a small multiple (typically two to three times) of the cost of computing the loss once**, whether the network has seven parameters or seventy billion.

Compare the obvious alternative: nudge each weight in turn and re-run the network to see how the loss changes (finite differences). That needs one extra forward pass *per parameter*, a million passes for a million weights. Backpropagation is a special case of **reverse-mode automatic differentiation**: for a function with many inputs (the weights) and one output (the loss), sweeping derivatives backwards from the output is the efficient direction. Forward-mode differentiation, which carries derivatives along with the values from the inputs, is efficient in the opposite situation, few inputs and many outputs; you will meet it in [differentiable molecular dynamics](../differentiable-md/).

In a real network each node is a whole layer, the values are vectors and the local derivatives are matrices, but nothing else changes. For a layer $\mathbf h = \sigma(\mathbf W\mathbf x + \mathbf b)$ the backward rules are:

{{< eq title="Backpropagation through a layer" say="Gradients flow back through the transpose of the same weights that carried the signal forward." >}}
$$ \bar{\mathbf z} = \bar{\mathbf h} \odot \sigma'(\mathbf z), \qquad \bar{\textcolor{#12a594}{\mathbf W}} = \bar{\mathbf z}\,\mathbf x^{\top}, \qquad \bar{\textcolor{#845ef7}{\mathbf b}} = \bar{\mathbf z}, \qquad \bar{\mathbf x} = \textcolor{#12a594}{\mathbf W}^{\top}\bar{\mathbf z} $$
- $\odot$: element-wise product
- $\bar{\mathbf x}$: the gradient handed back to the previous layer
{{< /eq >}}

## Vanishing and exploding gradients

The backward pass multiplies many factors together, one per layer. If they are typically smaller than 1, the gradient shrinks exponentially with depth and early layers stop learning (**vanishing gradients**); if larger than 1, it grows exponentially (**exploding gradients**). The sigmoid's derivative is at most 0.25, so deep sigmoid networks suffered badly. The cures are now standard: activations whose slope does not shrink (ReLU and its relatives), careful initialisation of the weights ([the practical chapter](../neural-networks/)), normalisation layers, and **residual connections** $\mathbf h^{(l+1)} = \mathbf h^{(l)} + f(\mathbf h^{(l)})$, which give the gradient a direct path backwards through every layer.

## A short history

Reverse-mode differentiation was described by Seppo Linnainmaa in his 1970 master's thesis, applied to neural networks by Paul Werbos in his 1974 doctoral thesis, and popularised by David Rumelhart, Geoffrey Hinton and Ronald Williams in a 1986 *Nature* paper, which showed that hidden layers trained this way learn useful internal representations. Today every deep-learning framework (PyTorch, JAX, TensorFlow) builds the computational graph as your code runs and performs the backward pass automatically when you call `loss.backward()`.

{{< note type="key" >}}
- A network is a computational graph; each node needs only its forward rule and its local derivative.
- Backpropagation sends $\partial L/\partial(\text{node})$ from the loss back to the inputs, multiplying by local derivatives: the chain rule, evaluated from the right.
- All gradients together cost about as much as a couple of forward passes, which is why networks with billions of parameters can be trained at all.
{{< /note >}}

{{< quiz >}}
- q: "In the backward pass, how is the gradient at a node computed?"
  options: ["From the inputs of the network only", "By multiplying the gradient arriving from the next node by this node's local derivative", "By finite differences"]
  answer: 1
  why: "That is the chain rule applied one node at a time, from the loss backwards."
- q: "A network has 10 million weights. Roughly how many forward passes would finite differences need to get all gradients, and how much does backpropagation cost?"
  options: ["10 million; about two to three forward passes", "Both about one pass", "One pass; 10 million passes"]
  answer: 0
  why: "Finite differences need a pass per parameter. Reverse-mode differentiation gets all of them in one backward sweep costing a small multiple of the forward pass."
- q: "Why did deep networks of sigmoid neurons train poorly before about 2010?"
  options: ["Sigmoids cannot represent functions well", "The sigmoid's slope is at most 0.25, so gradients shrank exponentially as they passed back through many layers", "Computers had too little memory"]
  answer: 1
  why: "Products of many small local derivatives vanish. ReLU-type activations, better initialisation and residual connections fixed this."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. D. E. Rumelhart, G. E. Hinton and R. J. Williams, “Learning representations by back-propagating errors,” *Nature* **323**, 533–536 (1986).
2. S. Linnainmaa, *The representation of the cumulative rounding error of an algorithm as a Taylor expansion of the local rounding errors*, master's thesis, University of Helsinki (1970).
3. P. J. Werbos, *Beyond Regression: New Tools for Prediction and Analysis in the Behavioral Sciences*, PhD thesis, Harvard University (1974).
4. A. G. Baydin, B. A. Pearlmutter, A. A. Radul and J. M. Siskind, “Automatic differentiation in machine learning: a survey,” *Journal of Machine Learning Research* **18**(153), 1–43 (2018).
5. G. Sanderson (3Blue1Brown), *Neural networks*, chapters 3 and 4, “What is backpropagation really doing?” and “Backpropagation calculus” (2017).
6. C. Olah, “Calculus on computational graphs: backpropagation,” colah.github.io (2015).
7. K. He, X. Zhang, S. Ren and J. Sun, “Deep residual learning for image recognition,” *Proceedings of CVPR*, 770–778 (2016).
8. I. Goodfellow, Y. Bengio and A. Courville, *Deep Learning*, MIT Press (2016), §6.5.

</div>
