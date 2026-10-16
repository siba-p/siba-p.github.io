---
title: "How a neuron learns"
description: "Learning as walking downhill: measuring error with a loss function, deriving cross-entropy from probability, computing its gradient in one line, and watching a neuron find its boundary on a loss landscape."
track: neuron
weight: 2
level: Foundation
minutes: 40
lab: "Train a neuron and follow it on its loss landscape"
prereqs: ["the-neuron"]
---

## From choosing weights to learning them

In [the previous chapter](../the-neuron/) you set the weights by hand. With two inputs that is a game; with two hundred it is impossible. **Learning** means letting the data choose the weights. The recipe has three parts, and every network in this volume uses the same three:

1. a **loss function** that turns "how wrong are we?" into a single number;
2. its **gradient**, which says how the loss changes when each weight is nudged;
3. a rule that **moves the weights a little way downhill**, repeated many times.

## Measuring error: from probability to cross-entropy

Suppose each training example is a point $\mathbf x_i$ with a label $y_i$ that is 1 (orange class) or 0 (blue class). A sigmoid neuron outputs a number between 0 and 1, and the natural reading is a **probability**: $\hat y_i = \sigma(\mathbf w\cdot\mathbf x_i + b)$ is the neuron's belief that example $i$ is orange.

How good is that belief? A principled answer is the probability the model assigns to the labels that actually occurred, the **likelihood**. For one example it is $\hat y_i$ if the label is 1 and $1 - \hat y_i$ if it is 0, which can be written in one expression as $\hat y_i^{\,y_i}(1-\hat y_i)^{1-y_i}$. Multiplying over all examples and taking the negative logarithm (so that products become sums and maximising becomes minimising) gives the **cross-entropy loss**:

{{< eq title="Binary cross-entropy" say="Pay a large penalty when you were confident and wrong, almost nothing when you were confident and right." >}}
$$ \textcolor{#e64980}{\mathcal L}(\textcolor{#12a594}{\mathbf w}, \textcolor{#845ef7}{b}) = -\frac{1}{N}\sum_{i=1}^{N}\Big[\, \textcolor{#4c6ef5}{y_i}\ln \textcolor{#f08c2e}{\hat y_i} + (1-\textcolor{#4c6ef5}{y_i})\ln(1-\textcolor{#f08c2e}{\hat y_i}) \,\Big] $$
- $\textcolor{#4c6ef5}{y_i}$: the true label, 0 or 1
- $\textcolor{#f08c2e}{\hat y_i}$: the neuron's predicted probability of label 1
- $\textcolor{#e64980}{\mathcal L}$: the average surprise; 0 for perfect, confident predictions
{{< /eq >}}

Look at what one term does. If the label is 1 and the neuron says $\hat y = 0.99$, the cost is $-\ln 0.99 \approx 0.01$. If it says $0.5$, the cost is $0.69$. If it confidently says $0.01$, the cost is $4.6$, and it grows without limit as the prediction approaches 0. Cross-entropy punishes confident mistakes severely, which is exactly what we want from a classifier.

## The gradient, in one line

To go downhill we need the slope of $\mathcal L$ with respect to every weight. Here the sigmoid and the logarithm cancel in a way that is almost too neat. Use the chain rule on one example, with $z = \mathbf w\cdot\mathbf x + b$:

{{< eq title="The cross-entropy gradient for one neuron" say="Each weight moves in proportion to the prediction error times its own input." >}}
$$ \frac{\partial\,\textcolor{#e64980}{\ell}}{\partial \textcolor{#12a594}{w_j}} = \underbrace{\frac{\partial \textcolor{#e64980}{\ell}}{\partial \textcolor{#f08c2e}{\hat y}}\,\frac{\partial \textcolor{#f08c2e}{\hat y}}{\partial \textcolor{#d4a017}{z}}}_{=\ \textcolor{#f08c2e}{\hat y} - \textcolor{#4c6ef5}{y}}\;\frac{\partial \textcolor{#d4a017}{z}}{\partial \textcolor{#12a594}{w_j}} = (\textcolor{#f08c2e}{\hat y} - \textcolor{#4c6ef5}{y})\, x_j, \qquad \frac{\partial\,\textcolor{#e64980}{\ell}}{\partial \textcolor{#845ef7}{b}} = \textcolor{#f08c2e}{\hat y} - \textcolor{#4c6ef5}{y} $$
- $\partial\ell/\partial\hat y = -y/\hat y + (1-y)/(1-\hat y)$ and $\partial\hat y/\partial z = \hat y(1-\hat y)$; their product simplifies to $\hat y - y$
- $x_j$: the input that weight $w_j$ multiplies
{{< /eq >}}

The meaning is intuitive. If the neuron says 0.9 for an example that is really 0, the error $\hat y - y = 0.9$ is large and positive, so every weight whose input was positive is pushed down. If the prediction is right, the error is near zero and nothing changes. Learning is driven by mistakes.

## Walking downhill

**Gradient descent** repeats one update: compute the average gradient over the data and step against it,

$$
\textcolor{#12a594}{\mathbf w} \leftarrow \textcolor{#12a594}{\mathbf w} - \eta\, \frac1N\sum_i (\hat y_i - y_i)\,\mathbf x_i, \qquad \textcolor{#845ef7}{b} \leftarrow \textcolor{#845ef7}{b} - \eta\,\frac1N\sum_i (\hat y_i - y_i),
$$

where $\eta$, the **learning rate**, sets the step size.

{{< widget name="neuronlearn" title="A neuron learning to separate two classes" caption="Left: the data and the neuron's current boundary and probabilities. Right: the loss for every pair of weights (darker is lower, at the current bias), with the path the weights have taken. Press Train. Then add points of either class by clicking, or try a learning rate of 3." >}}

The right-hand panel is the most important picture in machine learning. Every pair of weights is a point on the **loss landscape**; training is a walk downhill on it. Watch the path: it starts steep and fast, then slows down as the slope flattens near the bottom. With a large learning rate the walk overshoots and zig-zags. For a single sigmoid neuron with cross-entropy, the landscape is **convex** (bowl-shaped, with no false valleys), so gradient descent always reaches the best weights. That stops being true once neurons are stacked into networks, which is why [the optimisation chapter](../gradient-descent/) is needed later.

## Two things that go wrong already

- **Perfectly separable data.** If a straight line separates the classes exactly, the loss can always be lowered by making the weights larger and the boundary sharper, so they grow forever. In the lab, drag the classes apart and watch $\lVert\mathbf w\rVert$ keep increasing. The cure is **regularisation**, a penalty on large weights, discussed in [the generalisation chapter](../generalisation/).
- **Unscaled inputs.** If one input is in nanometres and another in kelvin, the landscape becomes a long thin valley and gradient descent zig-zags across it. Standardising inputs (subtract the mean, divide by the standard deviation) makes the bowl round.

## The perceptron rule

Rosenblatt's original perceptron used a step function and an even simpler update: for each misclassified example, add $\eta\,\mathbf x_i$ to the weights if it should have fired, and subtract it if it should not. He proved that if the classes can be separated by a line at all, this rule finds one in a finite number of steps (the **perceptron convergence theorem**). Logistic regression replaces the hard step by a smooth sigmoid so that *every* example, not only misclassified ones, contributes a gradient, and the output becomes a calibrated probability.

{{< note type="key" >}}
- A loss function turns prediction quality into one number; cross-entropy is the negative log-likelihood of the labels under the neuron's probabilities.
- For a sigmoid neuron its gradient is simply (prediction − label) × input.
- Gradient descent steps the weights downhill on the loss landscape; for one neuron that landscape is a convex bowl.
{{< /note >}}

{{< quiz >}}
- q: "A neuron predicts $\\hat y = 0.02$ for an example whose true label is 1. What is that example's cross-entropy cost?"
  options: ["0.02", "About 3.9", "About 0.98"]
  answer: 1
  why: "$-\\ln(0.02) \\approx 3.91$. Confident mistakes are expensive."
- q: "What is $\\partial\\ell/\\partial w_j$ for a sigmoid neuron with cross-entropy loss?"
  options: ["$(\\hat y - y)\\,x_j$", "$\\hat y(1-\\hat y)$", "$w_j x_j$"]
  answer: 0
  why: "The derivative of the log loss with respect to $\\hat y$ and the derivative of the sigmoid combine to $\\hat y - y$; the chain rule then multiplies by $x_j$."
- q: "Training on perfectly separable data, the loss keeps falling but the weights keep growing. Why?"
  options: ["The learning rate is too small", "Scaling up the weights makes every prediction more confident and correct, which always lowers cross-entropy", "The data are wrong"]
  answer: 1
  why: "With a separating line, larger weights push all probabilities towards 0 or 1 on the correct side. Regularisation stops the growth."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. C. M. Bishop, *Pattern Recognition and Machine Learning*, Springer (2006), §4.3 (probabilistic discriminative models, logistic regression).
2. I. Goodfellow, Y. Bengio and A. Courville, *Deep Learning*, MIT Press (2016), §5.5 (maximum likelihood) and §6.2.2 (output units and cross-entropy).
3. F. Rosenblatt, *Principles of Neurodynamics: Perceptrons and the Theory of Brain Mechanisms*, Spartan Books (1962).
4. A. B. J. Novikoff, “On convergence proofs on perceptrons,” *Proceedings of the Symposium on the Mathematical Theory of Automata* **12**, 615–622 (1962).
5. G. Sanderson (3Blue1Brown), *Neural networks*, chapter 2, “Gradient descent, how neural networks learn” (2017).

</div>
