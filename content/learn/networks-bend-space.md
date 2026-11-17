---
title: "Layers and representations"
description: "Why stacking neurons into layers creates power that one neuron lacks: each layer is a linear transformation followed by a bend, a network untangles data until a straight line can separate it, and topology sets the limits of how narrow a layer can be."
hook: "The last neuron of a classifier can only draw a straight line. The layers before it stretch, shift and bend space like a rubber sheet until that line is enough, and topology decides when no amount of training can succeed."
objectives:
  - "Write a layer of neurons as a matrix product, a shift and an element-wise bend"
  - "Explain how hidden layers deform space until one straight line separates the classes"
  - "Compute the hidden representation that lets two neurons solve XOR"
  - "Recognise when a layer is too narrow to untangle the data, whatever the depth"
  - "Compare width and depth using a sawtooth that ten narrow layers draw with twenty neurons"
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

Counting parameters is a good habit. A layer that reads $d$ inputs with $m$ neurons has an $m \times d$ weight matrix and $m$ biases, $m(d+1)$ numbers in all. The network in the figure below, with two inputs, two hidden layers of two neurons and one output, has $6 + 6 + 3 = 15$ parameters. A classic network for handwritten digits, which reads the 784 pixels of a $28\times28$ image into two hidden layers of 100 neurons and ends in ten outputs, already has 89,610, almost nine in ten of them in the first layer.

### Following one point through a layer

Take a layer of two tanh neurons with weights $\mathbf w_1 = (1, -1)$ and $\mathbf w_2 = (0.5, 0.5)$ and biases $\mathbf b = (0, -1)$. The point $\mathbf x = (2, 1)$ goes through three steps:

$$
\mathbf W\mathbf x = (1,\ 1.5), \qquad \mathbf W\mathbf x + \mathbf b = (1,\ 0.5), \qquad \mathbf h = \tanh(1,\ 0.5) = (0.762,\ 0.462).
$$

Now send in a point ten times farther out, $\mathbf x = (20, 10)$. The linear step gives $(10, 15)$, the shift $(10, 14)$, and tanh returns two numbers within $10^{-8}$ of 1. In the input plane the two points are about 20 units apart; after the layer they are about 0.6 apart, and every point far out in that direction is crushed into the corner $(1, 1)$. That uneven squeezing, gentle near the middle and severe at the edges, is what lets a layer reshape data rather than merely rotate it.

## A layer is a transformation of space

There are two ways to look at a network. The first, from the last chapter, asks what boundary each neuron draws in input space. The second, made famous by Christopher Olah and by 3Blue1Brown's videos, is more revealing: **a layer moves every point of space somewhere else**. Think of the input plane as a rubber sheet with a grid drawn on it.

1. The matrix $\mathbf W$ is a **linear transformation**: it rotates, stretches, shears or reflects the sheet. Straight grid lines stay straight and parallel, and the origin stays put.
2. Adding $\mathbf b$ **translates** the whole sheet.
3. The activation $\tanh$ **bends** it: it squashes each coordinate into $(-1, 1)$, pulling far-away regions in towards the edges of a square while leaving the middle almost unchanged. Grid lines now curve.

The final neuron then draws a single straight line through the transformed sheet. The whole network succeeds if the hidden layers have deformed the sheet so that the two classes end up on opposite sides of some straight line.

{{< widget name="warp" title="A network with two neurons per hidden layer, seen as a transformation of the plane" caption="Each dot is a training example and the grid is the original input plane, carried along by the network. Train, then drag “View the data after…” from the input to the final layer, or press Play. The dashed line is the output neuron's boundary in the final space." >}}

Train the network on **two moons**, then play the transformation. The first linear map tilts and stretches the plane; the first tanh squeezes it so that the tips of the moons fold inwards; the second pair finishes the job, and in the final space a straight line separates the classes cleanly. Nothing about the classifier is curved. The curved boundary you would see in input space is a straight line in a bent space.

**XOR**, impossible for one neuron, falls to the same trick: the hidden layer folds the plane so that opposite corners land on the same side.

### XOR, worked by hand

The fold can be built by hand. Take the corners $(0,0)$, $(0,1)$, $(1,0)$ and $(1,1)$ and two sigmoid neurons with steep weights:

- $h_1 = \sigma(20x_1 + 20x_2 - 10)$ switches on when at least one input is 1: it computes OR;
- $h_2 = \sigma(20x_1 + 20x_2 - 30)$ switches on only when both inputs are 1: it computes AND.

Since $\sigma(10) = 0.99995$ and $\sigma(-10) = 0.00005$, the four corners land, to four decimal places, at

| Input $(x_1, x_2)$ | Hidden $(h_1, h_2)$ | XOR |
|---|---|---|
| (0, 0) | (0, 0) | 0 |
| (0, 1) | (1, 0) | 1 |
| (1, 0) | (1, 0) | 1 |
| (1, 1) | (1, 1) | 0 |

The two corners that XOR labels 1 have been sent to the **same point**, while the two it labels 0 both land on the diagonal $h_1 = h_2$. The output neuron $\sigma(20h_1 - 20h_2 - 10)$ draws the straight line $h_1 - h_2 = 0.5$ in hidden space, which separates them. Pulled back into the input plane, that single line becomes, very nearly, the pair of parallel lines $x_1 + x_2 = 0.5$ and $x_1 + x_2 = 1.5$, with the corners labelled 1 in the band between them: two cuts, exactly what [one neuron](../the-neuron/) could not make. The network in the figure, with tanh neurons and corners at $\pm 1$, finds an equivalent fold by gradient descent, with less tidy numbers.

{{< note type="try" >}}
Choose **XOR**, train until the accuracy stops changing, and drag the slider through the layers. Then press **New initial weights** and train again, three or four times. Each run folds the plane differently, yet each successful run ends with the classes on opposite sides of a straight line: the same task has many equally good internal representations. Finally, on any data set, set the slider to **layer 1: linear** and check that every grid line is still straight; the bending only begins at the tanh.
{{< /note >}}

## What layers cannot do: a lesson from topology

Now try the **circle inside a ring** with two neurons per layer. However long you train, the accuracy stalls. This is not a failure of the optimiser. Each layer here maps the plane continuously into the plane (the linear map and tanh are both continuous, and with two neurons the output is two-dimensional, and for these invertible weights, one-to-one). A continuous, one-to-one map of the plane can stretch and fold the rubber sheet but never **tear** it, and there is no way to get the inner disc outside the ring without tearing. The two classes stay linked, so no straight line in the final space can separate them.

The fix is a third neuron, a third dimension: with room to move upwards, a layer can lift the centre of the sheet out of the plane like a tent, and a flat plane can then slice between the tent's peak and the ring. The general lesson, which Olah set out with pictures, is that **width gives a network room to untangle; depth gives it more folds**. Real networks use tens to thousands of neurons per layer for exactly this reason.

Could more layers do the job instead of a wider one? No. Each extra two-neuron layer is one more continuous map of the plane into the plane, and a chain of maps that cannot tear cannot tear either. Jesse Johnson proved a general version in 2019: for a broad family of activations that includes the sigmoid and tanh, a network whose hidden layers are all no wider than its input cannot approximate a classifier whose positive region is a bounded island, such as a disc inside a ring, however many layers it has. Below a certain width, depth cannot help.

{{< note type="warn" title="Accidental bottlenecks" >}}
A layer narrower than the number of independent directions the data need is a bottleneck, and no later layer can recover what it throws away: two points it maps to the same output stay together forever after. When a network trains poorly, check the narrowest layer before adding depth. Bottlenecks used on purpose are a different matter; an autoencoder squeezes data through a narrow layer precisely to find a compact description, as in [learned collective variables](../es-ml-cvs/).
{{< /note >}}

## How expressive are layered networks?

The **universal approximation theorem** (Cybenko 1989; Hornik, Stinchcombe and White 1989) says that a network with one hidden layer of enough neurons and a non-polynomial activation can approximate any continuous function on a bounded region as closely as you like. The intuition is visible in [the practical neural-network chapter](../neural-networks/): pairs of sigmoid neurons make "bumps", and enough bumps can trace any curve.

The theorem says nothing about how many neurons are needed, and the answer can be astronomically many for one layer. **Depth** is what makes networks practical. A function made of repeated simple pieces, such as a sum over many atoms, or the layered structure of images, can need exponentially fewer neurons when represented by several layers each building on the last. Early layers learn simple features; later layers combine them into complex ones.

### Depth as repeated folding

Depth is easiest to see with ReLU neurons, $\max(0, z)$, whose networks are piecewise linear. Fold a strip of paper in half, then in half again: every fold doubles the number of sheets, and ten folds would give 1024. A layer of two ReLU neurons can fold the interval from 0 to 1 in the same way. The **tent map**

$$
T(x) = 2\,\mathrm{ReLU}(x) - 4\,\mathrm{ReLU}\big(x - \tfrac12\big)
$$

rises from 0 to 1 on the first half of the interval and falls back to 0 on the second, so it folds the interval onto itself. Feed its output into an identical layer and you get two tents; ten such layers give a sawtooth of $2^{10} = 1024$ straight pieces, built from only 20 neurons. A network with a single hidden layer of $n$ ReLU neurons and one input has at most $n$ kinks, hence at most $n + 1$ pieces, so it needs at least 1023 neurons to draw the same sawtooth. Matus Telgarsky turned this construction into a theorem in 2016: some functions computed by deep, narrow networks need exponentially many neurons in a shallow one. Depth does not invent new shapes; it reuses every fold many times over.

Both hand-built networks fit in a few lines of NumPy. Set `k = 5` to divide every weight and bias by five: the outputs soften to 0.74 and 0.18 but are still right. At `k = 10` the fold is too gentle: the corners labelled 1 land at $h_1 - h_2 = 0.46$, just short of the output neuron's line at 0.5, and XOR fails. Each extra layer in `n_layers` doubles the number of pieces, until at 17 layers they become narrower than the grid of sample points and the count breaks down.

{{< py title="XOR by hand, and a ten-layer sawtooth" >}}
import numpy as np
sig = lambda z: 1 / (1 + np.exp(-z))
k = 1                                               # try 5 or 10: divides every weight and bias
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])      # the four corners
W1 = np.array([[20, 20], [20, 20]]) / k; b1 = np.array([-10, -30]) / k   # 'OR' and 'AND'
w2 = np.array([20, -20]) / k; b2 = -10 / k          # output: OR and not AND

H = sig(X @ W1.T + b1)                              # hidden representation
out = sig(H @ w2 + b2)
for x, h, o in zip(X, H, out):
    print(f"input {x}  ->  hidden ({h[0]:.4f}, {h[1]:.4f})  ->  output {o:.4f}")

# the sawtooth: compose the tent map T(x) = 2 relu(x) - 4 relu(x - 1/2)
relu = lambda z: np.maximum(z, 0)
n_layers = 10
x = np.linspace(0, 1, 100001); y = x.copy()
for layer in range(n_layers):
    y = 2 * relu(y) - 4 * relu(y - 0.5)
slope = np.diff(y) / np.diff(x)
print(f"linear pieces after {n_layers} layers:", 1 + np.count_nonzero(np.diff(np.sign(slope))))
{{< /py >}}

## Why the nonlinearity is essential

Remove the activations and every layer is $\mathbf h = \mathbf W\mathbf x + \mathbf b$. Composing two such layers gives

$$
\mathbf W^{(2)}\big(\mathbf W^{(1)}\mathbf x + \mathbf b^{(1)}\big) + \mathbf b^{(2)} = \underbrace{\mathbf W^{(2)}\mathbf W^{(1)}}_{\text{one matrix}}\,\mathbf x + \underbrace{\mathbf W^{(2)}\mathbf b^{(1)} + \mathbf b^{(2)}}_{\text{one vector}},
$$

a single linear layer again. A hundred linear layers are no more powerful than one: they can only rotate and stretch the sheet, never bend it. The bend is the whole point.

## The last layer is a linear model on learned features

Read a trained network from the top down. The output neuron is the [single neuron](../the-neuron/) of the earlier chapters, logistic regression for a classifier or linear regression for a numerical output, applied not to the raw inputs but to the last hidden representation $\mathbf h^{(L)}$. Everything beneath it is a **feature map**, $\mathbf x \mapsto \mathbf h^{(L)}(\mathbf x)$, and training adjusts the features and the final linear model together. This is the precise sense in which networks learn **representations**. In a [linear model](../learning-from-data/) someone chooses the features by hand; in a network the data choose them.

Two consequences matter in practice. First, a representation learned for one task is often useful for another. The early layers of image networks respond to edges and textures, which is why a trained network's lower layers can be kept and only the last few retrained for a new task, a practice called **transfer learning**. The same idea underlies fine-tuning a [universal interatomic potential](../universal-potentials/) on a few hundred to a few thousand new calculations. Second, representations are not unique. Different random starts fold the space differently and still end with the classes separated, and some differences are pure bookkeeping, as the box below shows. Looking at one hidden neuron in isolation is therefore rarely informative; what carries meaning is the geometry of the representation as a whole, which inputs it brings together and which it pulls apart.

{{< note type="fun" >}}
Swap two neurons of a hidden layer, together with their incoming and outgoing weights, and the network computes exactly the same function. A layer of 100 neurons can be relabelled in $100! \approx 9\times10^{157}$ ways, and because tanh is an odd function, flipping the signs of one neuron's incoming weights, bias and outgoing weight changes nothing either, which multiplies the count by another $2^{100} \approx 10^{30}$. Every minimum of a network's loss has an astronomical number of identical twins.
{{< /note >}}

{{< note type="key" >}}
- A layer is a matrix multiplication, a shift and an element-wise bend: $\mathbf h = \sigma(\mathbf W\mathbf x + \mathbf b)$.
- Hidden layers transform the data until the output neuron's single straight cut is enough. For XOR, the hidden layer sends both corners labelled 1 to the same point.
- Width gives room to untangle (a two-neuron layer cannot separate a disc from a surrounding ring, however deep the network); depth gives repeated folds; nonlinearity makes both matter.
- Depth multiplies folds: ten layers of two ReLU neurons draw a sawtooth of 1024 pieces, which a single hidden layer needs at least 1023 neurons to match.
- The output layer is a linear model on learned features; the network learns the features and the model together.
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
- q: "A layer reads 10 inputs and has 32 neurons. How many parameters does it have?"
  options: ["320", "352", "42"]
  answer: 1
  why: "The weight matrix is $32 \\times 10$, giving 320 weights, and each of the 32 neurons has a bias: $32 \\times (10 + 1) = 352$."
- q: "In the hand-built XOR network, where do the inputs $(0,1)$ and $(1,0)$ land in the hidden layer?"
  options: ["At opposite corners of the hidden square", "At the same point, $(1, 0)$", "At the origin"]
  answer: 1
  why: "The OR neuron fires for both and the AND neuron for neither, so both map to $(h_1, h_2) = (1, 0)$. Once the two corners labelled 1 coincide, a single straight line separates them from $(0,0)$ and $(1,1)$."
- q: "Ten layers of two ReLU neurons draw a sawtooth with 1024 straight pieces on one input. How many ReLU neurons does a network with a single hidden layer need to draw it?"
  options: ["20, the same number", "About 100", "At least 1023"]
  answer: 2
  why: "Each ReLU neuron in a single hidden layer adds at most one kink, so $n$ neurons give at most $n + 1$ pieces. Depth reuses each fold, which is why deep networks can be exponentially more economical."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. C. Olah, “Neural networks, manifolds, and topology,” colah.github.io (2014), the source of the transformation picture used in this chapter.
2. G. Sanderson (3Blue1Brown), *Neural networks*, chapter 1 (2017), and *Essence of Linear Algebra*, chapter 3, “Linear transformations and matrices” (2016).
3. G. Cybenko, “Approximation by superpositions of a sigmoidal function,” *Mathematics of Control, Signals and Systems* **2**, 303–314 (1989).
4. K. Hornik, M. Stinchcombe and H. White, “Multilayer feedforward networks are universal approximators,” *Neural Networks* **2**, 359–366 (1989).
5. I. Goodfellow, Y. Bengio and A. Courville, *Deep Learning*, MIT Press (2016), §6.1 (learning XOR) and §6.4 (architecture design, depth).
6. M. Telgarsky, “Benefits of depth in neural networks,” *Proceedings of COLT*, PMLR 49, 1517–1539 (2016).
7. J. Johnson, “Deep, skinny neural networks are not universal approximators,” *International Conference on Learning Representations* (ICLR) (2019).
8. M. D. Zeiler and R. Fergus, “Visualizing and understanding convolutional networks,” *Proceedings of ECCV*, 818–833 (2014).

</div>
