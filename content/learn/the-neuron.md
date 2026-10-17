---
title: "The artificial neuron"
description: "The smallest piece of every neural network: inputs, weights, a bias and an activation function. What a neuron computes, what it looks like geometrically, where the idea came from, and what one neuron alone can and cannot do."
track: neuron
weight: 1
level: Foundation
minutes: 35
lab: "Steer a neuron and watch its decision"
---

## Where the idea came from

In 1943 the neurophysiologist Warren McCulloch and the logician Walter Pitts asked a bold question: could a brain cell be described as a tiny logical device? A biological neuron receives signals from thousands of others through **synapses**, some exciting it and some inhibiting it; if the combined stimulation crosses a threshold, it **fires** a pulse down its axon. McCulloch and Pitts wrote this as arithmetic: add up the inputs, each multiplied by a strength, and output 1 if the total exceeds a threshold, 0 otherwise. In 1958 Frank Rosenblatt built a machine, the **perceptron**, that could *learn* those strengths from examples.

Modern artificial neurons are only loosely inspired by biology, but the arithmetic has hardly changed. Everything in this volume, up to graph networks and transformers, is built from millions of copies of the unit in this chapter.

## What a neuron computes

A neuron takes several numbers in, $x_1, x_2, \dots, x_n$, and gives one number out. It does two things.

{{< eq title="The artificial neuron" say="Weigh the evidence, add a bias, then decide how strongly to respond." >}}
$$ \textcolor{#d4a017}{z} = \textcolor{#12a594}{w_1}\textcolor{#4c6ef5}{x_1} + \textcolor{#12a594}{w_2}\textcolor{#4c6ef5}{x_2} + \dots + \textcolor{#12a594}{w_n}\textcolor{#4c6ef5}{x_n} + \textcolor{#845ef7}{b} = \textcolor{#12a594}{\mathbf w}\cdot\textcolor{#4c6ef5}{\mathbf x} + \textcolor{#845ef7}{b}, \qquad \textcolor{#f08c2e}{y} = \sigma(\textcolor{#d4a017}{z}) $$
- $\textcolor{#4c6ef5}{x_i}$: the inputs, for example features of a molecule
- $\textcolor{#12a594}{w_i}$: the weights, how much each input matters, and in which direction
- $\textcolor{#845ef7}{b}$: the bias, how easily the neuron fires at all
- $\textcolor{#d4a017}{z}$: the weighted sum, often called the pre-activation
- $\sigma$: the activation function, a fixed nonlinear curve
- $\textcolor{#f08c2e}{y}$: the output
{{< /eq >}}

A positive weight means "more of this input makes me fire more"; a negative weight means "more of this input makes me fire less"; a weight near zero means "I ignore this input". The bias shifts the threshold: a large positive bias makes the neuron fire even with weak input.

{{< widget name="neuron" title="One neuron, two inputs" caption="Left: the neuron as a diagram, with edge thickness showing the size of each weight (teal positive, pink negative). Right: its output for every input in the plane. Move the sliders and drag the white input point." >}}

## Seeing a neuron as geometry

With two inputs, every possible input is a point in a plane, and the neuron gives each point a value: the colours in the lab. Three facts are visible there and are worth understanding exactly.

**The boundary is a straight line.** The output is halfway (for the sigmoid, $y = 0.5$) where $z = 0$, that is where $w_1x_1 + w_2x_2 + b = 0$. That equation describes a straight line; with three inputs it is a flat plane, and in $n$ dimensions a **hyperplane**. Whatever activation you choose, a single neuron divides input space with a flat cut.

**The weights point across the line.** The weight vector $\mathbf w = (w_1, w_2)$ is perpendicular to the boundary and points towards higher output. Moving the input in the direction of $\mathbf w$ raises $z$ fastest; moving along the boundary does not change it at all. Rotating $\mathbf w$ in the lab rotates the boundary.

**The bias slides the line; the size of the weights sets its sharpness.** The distance from the origin to the boundary is $|b|/\lVert\mathbf w\rVert$. Doubling both weights and the bias leaves the boundary where it is but makes the transition from blue to orange twice as abrupt.

{{< eq title="Distance from the boundary" say="z measures how far, and on which side, the input sits from the line, in units of 1/‖w‖." >}}
$$ \frac{\textcolor{#d4a017}{z}}{\lVert \textcolor{#12a594}{\mathbf w} \rVert} = \frac{\textcolor{#12a594}{\mathbf w}\cdot\textcolor{#4c6ef5}{\mathbf x} + \textcolor{#845ef7}{b}}{\lVert \textcolor{#12a594}{\mathbf w} \rVert} = \text{signed distance of } \textcolor{#4c6ef5}{\mathbf x} \text{ from the line} $$
- $\lVert\mathbf w\rVert = \sqrt{w_1^2 + w_2^2}$: the length of the weight vector
{{< /eq >}}

## The activation function

The activation turns the weighted sum into a response. The common choices, all in the lab:

| Name | Formula | Shape | Used for |
|---|---|---|---|
| step | $1$ if $z \ge 0$, else $0$ | a cliff | the original perceptron; cannot be trained by gradients |
| sigmoid | $\dfrac{1}{1+e^{-z}}$ | smooth S from 0 to 1 | outputs that are probabilities |
| tanh | $\dfrac{e^{z}-e^{-z}}{e^{z}+e^{-z}}$ | smooth S from −1 to 1 | hidden layers; interatomic potentials |
| ReLU | $\max(0, z)$ | zero, then a ramp | hidden layers of most image and language models |

Why not leave the activation out? Then $y = \mathbf w\cdot\mathbf x + b$ is just linear regression ([the chapter on fitting](../learning-from-data/)), and, as later chapters show, stacking any number of linear neurons still gives only a linear function. The bend in the activation is what lets networks of neurons represent curved relationships. Why smooth curves rather than the step? Because learning, the subject of [the next chapter](../how-a-neuron-learns/), works by nudging the weights in the direction that improves the output, and a step function gives no hint of which direction that is: its slope is zero everywhere except at the cliff.

## A neuron as a logic gate, and its limit

With suitable weights a single step-function neuron can compute simple logic. With inputs 0 or 1:

- **AND**: $w_1 = w_2 = 1$, $b = -1.5$. Only $(1, 1)$ gives $z > 0$.
- **OR**: $w_1 = w_2 = 1$, $b = -0.5$. Any single 1 suffices.
- **NOT** (one input): $w = -1$, $b = 0.5$.

But no choice of weights computes **XOR** (output 1 when exactly one input is 1). Plot the four corners: $(0,1)$ and $(1,0)$ must be on one side of the line, $(0,0)$ and $(1,1)$ on the other, and no straight line does that. Minsky and Papert's 1969 book *Perceptrons* made this limitation famous, and it contributed to a long decline of interest in neural networks. The way out, layers of neurons, is the subject of the chapter after next, where you will watch a small network solve XOR by bending the plane.

## A neuron in science

A single neuron with a sigmoid output is exactly **logistic regression**, one of the most used models in science: will this compound be stable or not, is this spectrum from phase A or B. Its weights are directly interpretable as the influence of each feature. A neuron with no activation is linear regression. Everything more powerful is built by connecting many of them.

{{< note type="key" >}}
- A neuron computes a weighted sum of its inputs plus a bias, $z = \mathbf w\cdot\mathbf x + b$, and passes it through a nonlinear activation, $y = \sigma(z)$.
- Geometrically, it cuts input space with a flat boundary perpendicular to $\mathbf w$; the bias moves it and $\lVert\mathbf w\rVert$ sets its sharpness.
- One neuron can only separate classes that a straight cut can separate: XOR is impossible without layers.
{{< /note >}}

{{< quiz >}}
- q: "A neuron has weights $w_1 = 2$, $w_2 = -1$ and bias $b = 0.5$. What is $z$ for the input $(1, 3)$?"
  options: ["$-0.5$", "$5.5$", "$2.5$"]
  answer: 0
  why: "$z = 2\\times1 + (-1)\\times3 + 0.5 = -0.5$."
- q: "How is the weight vector $\\mathbf w$ oriented relative to the neuron's decision boundary?"
  options: ["Along the boundary", "Perpendicular to it, pointing towards higher output", "At 45° to it"]
  answer: 1
  why: "Along the boundary $z$ is constant, so the gradient of $z$, which is $\\mathbf w$, must be perpendicular to it."
- q: "Why can a single neuron not compute XOR?"
  options: ["Its activation function is not steep enough", "XOR's two classes cannot be separated by one straight line, and a neuron's boundary is always straight", "It needs a negative bias"]
  answer: 1
  why: "Whatever the activation, the boundary is where $\\mathbf w\\cdot\\mathbf x + b = 0$, a straight line. XOR needs two cuts."
- q: "You multiply both weights and the bias by 10. What changes?"
  options: ["The boundary moves", "Nothing at all", "The boundary stays in place but the transition from low to high output becomes much sharper"]
  answer: 2
  why: "The line $\\mathbf w\\cdot\\mathbf x + b = 0$ is unchanged by a common factor, but $z$ grows ten times faster away from it."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. W. S. McCulloch and W. Pitts, “A logical calculus of the ideas immanent in nervous activity,” *Bulletin of Mathematical Biophysics* **5**, 115–133 (1943).
2. F. Rosenblatt, “The perceptron: a probabilistic model for information storage and organization in the brain,” *Psychological Review* **65**, 386–408 (1958).
3. M. Minsky and S. Papert, *Perceptrons: An Introduction to Computational Geometry*, MIT Press (1969).
4. G. Sanderson (3Blue1Brown), *Neural networks*, video series (2017–2024), 3blue1brown.com: chapter 1, “But what is a neural network?”
5. M. A. Nielsen, *Neural Networks and Deep Learning*, Determination Press (2015), chapter 1, free online.
6. C. M. Bishop, *Pattern Recognition and Machine Learning*, Springer (2006), §4.1 (discriminant functions) and §4.3.2 (logistic regression).

</div>
