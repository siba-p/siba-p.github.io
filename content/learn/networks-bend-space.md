---
title: "Layers: how networks bend space"
description: "Why stacking neurons into layers creates power that one neuron lacks: each layer is a linear transformation followed by a bend, a network untangles data until a straight line can separate it, and topology sets the limits of how narrow a layer can be."
track: neuron
weight: 3
level: Foundation
minutes: 40
lab: "Watch a network straighten out two moons and XOR"
prereqs: ["how-a-neuron-learns"]
---

## Many neurons side by side

A single neuron draws one straight cut ([chapter on the neuron](../the-neuron/)). Put several neurons side by side, all reading the same inputs, and you have a **layer**: each neuron computes its own weighted sum and activation, so a layer of $m$ neurons turns an input vector into an output vector of $m$ numbers. In matrix form, a whole layer is one line:

{{< eq title="A layer of neurons" say="Multiply by a matrix, shift, then bend every coordinate." >}}
$$ \textcolor{#f08c2e}{\mathbf h} = \sigma\big(\textcolor{#12a594}{\mathbf W}\,\textcolor{#4c6ef5}{\mathbf x} + \textcolor{#845ef7}{\mathbf b}\big), \qquad \textcolor{#12a594}{\mathbf W} = \begin{pmatrix} \textcolor{#12a594}{\mathbf w_1}^{\!\top} \\ \textcolor{#12a594}{\mathbf w_2}^{\!\top} \\ \vdots \end{pmatrix} $$
- $\textcolor{#4c6ef5}{\mathbf x}$: the input vector
- $\textcolor{#12a594}{\mathbf W}$: one row of weights per neuron
- $\textcolor{#845ef7}{\mathbf b}$: one bias per neuron
- $\sigma$: applied separately to every component
- $\textcolor{#f08c2e}{\mathbf h}$: the layer's output, a new **representation** of the input
{{< /eq >}}

A **network** feeds the output of one layer into the next, $\mathbf h^{(1)} = \sigma(\mathbf W^{(1)}\mathbf x + \mathbf b^{(1)})$, $\mathbf h^{(2)} = \sigma(\mathbf W^{(2)}\mathbf h^{(1)} + \mathbf b^{(2)})$, and so on, and a final neuron reads the last representation. The layers between input and output are **hidden layers**: nobody tells them what to compute; they discover it during training.

## A layer is a transformation of space

There are two ways to look at a network. The first, from the last chapter, asks what boundary each neuron draws in input space. The second, made famous by Christopher Olah and by 3Blue1Brown's videos, is more revealing: **a layer moves every point of space somewhere else**. Think of the input plane as a rubber sheet with a grid drawn on it.

1. The matrix $\mathbf W$ is a **linear transformation**: it rotates, stretches, shears or reflects the sheet. Straight grid lines stay straight and parallel, and the origin stays put.
2. Adding $\mathbf b$ **translates** the whole sheet.
3. The activation $\tanh$ **bends** it: it squashes each coordinate into $(-1, 1)$, pulling far-away regions in towards the edges of a square while leaving the middle almost unchanged. Grid lines now curve.

The final neuron then draws a single straight line through the transformed sheet. The whole network succeeds if the hidden layers have deformed the sheet so that the two classes end up on opposite sides of some straight line.

{{< widget name="warp" title="A network with two neurons per hidden layer, seen as a transformation of the plane" caption="Each dot is a training example and the grid is the original input plane, carried along by the network. Train, then drag “View the data after…” from the input to the final layer, or press Play. The dashed line is the output neuron's boundary in the final space." >}}

Train the network on **two moons**, then play the transformation. The first linear map tilts and stretches the plane; the first tanh squeezes it so that the tips of the moons fold inwards; the second pair finishes the job, and in the final space a straight line separates the classes cleanly. Nothing about the classifier is curved. The curved boundary you would see in input space is a straight line in a bent space.

**XOR**, impossible for one neuron, falls to the same trick: the hidden layer folds the plane so that opposite corners land on the same side.

## What layers cannot do: a lesson from topology

Now try the **circle inside a ring** with two neurons per layer. However long you train, the accuracy stalls. This is not a failure of the optimiser. Each layer here maps the plane continuously into the plane (the linear map and tanh are both continuous, and with two neurons the output is two-dimensional, and for these invertible weights, one-to-one). A continuous, one-to-one map of the plane can stretch and fold the rubber sheet but never **tear** it, and there is no way to get the inner disc outside the ring without tearing. The two classes stay linked, so no straight line in the final space can separate them.

The fix is a third neuron, a third dimension: with room to move upwards, a layer can lift the centre of the sheet out of the plane like a tent, and a flat plane can then slice between the tent's peak and the ring. The general lesson, which Olah set out with pictures, is that **width gives a network room to untangle; depth gives it more folds**. Real networks use tens to thousands of neurons per layer for exactly this reason.

## How expressive are layered networks?

The **universal approximation theorem** (Cybenko 1989; Hornik, Stinchcombe and White 1989) says that a network with one hidden layer of enough neurons and a non-polynomial activation can approximate any continuous function on a bounded region as closely as you like. The intuition is visible in [the practical neural-network chapter](../neural-networks/): pairs of sigmoid neurons make "bumps", and enough bumps can trace any curve.

The theorem says nothing about how many neurons are needed, and the answer can be astronomically many for one layer. **Depth** is what makes networks practical. A function made of repeated simple pieces, such as a sum over many atoms, or the layered structure of images, can need exponentially fewer neurons when represented by several layers each building on the last. Early layers learn simple features; later layers combine them into complex ones.

## Why the nonlinearity is essential

Remove the activations and every layer is $\mathbf h = \mathbf W\mathbf x + \mathbf b$. Composing two such layers gives

$$
\mathbf W^{(2)}\big(\mathbf W^{(1)}\mathbf x + \mathbf b^{(1)}\big) + \mathbf b^{(2)} = \underbrace{\mathbf W^{(2)}\mathbf W^{(1)}}_{\text{one matrix}}\,\mathbf x + \underbrace{\mathbf W^{(2)}\mathbf b^{(1)} + \mathbf b^{(2)}}_{\text{one vector}},
$$

a single linear layer again. A hundred linear layers are no more powerful than one: they can only rotate and stretch the sheet, never bend it. The bend is the whole point.

{{< note type="key" >}}
- A layer is a matrix multiplication, a shift and an element-wise bend: $\mathbf h = \sigma(\mathbf W\mathbf x + \mathbf b)$.
- Hidden layers transform the data until the output neuron's single straight cut is enough.
- Width gives room to untangle (a two-neuron layer cannot separate a disc from a surrounding ring); depth gives repeated folds; nonlinearity makes both matter.
{{< /note >}}

{{< quiz >}}
- q: "In the transformation view, what does the matrix $\\mathbf W$ of a layer do to the grid?"
  options: ["Bends grid lines into curves", "Rotates, stretches or shears it, keeping straight lines straight", "Tears it apart"]
  answer: 1
  why: "Matrix multiplication is a linear map: lines stay lines and parallel lines stay parallel. The curving comes from the activation."
- q: "Why can a network with two neurons in every hidden layer not separate a disc from a surrounding ring, however long it trains?"
  options: ["Its learning rate is too small", "Each layer maps the plane continuously into a plane, which cannot pull the disc out of the ring without tearing it", "tanh is the wrong activation"]
  answer: 1
  why: "The obstruction is topological. A wider layer adds a dimension that lets the network lift the disc out."
- q: "A network has ten layers but no activation functions. What can it represent?"
  options: ["Any continuous function", "Only linear (affine) functions, exactly like one layer", "Only XOR"]
  answer: 1
  why: "Composing affine maps gives an affine map. Without nonlinearities depth adds nothing."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. C. Olah, “Neural networks, manifolds, and topology,” colah.github.io (2014), the source of the transformation picture used in this chapter.
2. G. Sanderson (3Blue1Brown), *Neural networks*, chapter 1 (2017), and *Essence of Linear Algebra*, chapter 3, “Linear transformations and matrices” (2016).
3. G. Cybenko, “Approximation by superpositions of a sigmoidal function,” *Mathematics of Control, Signals and Systems* **2**, 303–314 (1989).
4. K. Hornik, M. Stinchcombe and H. White, “Multilayer feedforward networks are universal approximators,” *Neural Networks* **2**, 359–366 (1989).
5. I. Goodfellow, Y. Bengio and A. Courville, *Deep Learning*, MIT Press (2016), §6.1 (learning XOR) and §6.4 (architecture design, depth).
6. M. Telgarsky, “Benefits of depth in neural networks,” *Proceedings of COLT*, PMLR 49, 1517–1539 (2016).

</div>
