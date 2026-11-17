---
title: "How a neuron learns"
description: "Learning as walking downhill: measuring error with a loss function, deriving cross-entropy from probability, computing its gradient in one line, and watching a neuron find its boundary on a loss landscape."
hook: "A sigmoid neuron trained with squared error can be 99 percent sure of the wrong answer and barely notice. Cross-entropy fixes that, and its gradient collapses to one line: prediction minus label, times input."
objectives:
  - "Derive the cross-entropy loss as the negative log-likelihood of binary labels"
  - "Compute the cross-entropy gradient for a sigmoid neuron and take one descent step by hand"
  - "Explain why squared error learns slowly from confident mistakes in a sigmoid neuron"
  - "Trace Rosenblatt's perceptron rule by hand on a small data set"
  - "Diagnose runaway weights on separable data and slow training from unscaled inputs"
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

## Why not squared error?

Squared error served [linear regression](../learning-from-data/) well, so why not use it here? Try it. With $\ell = \tfrac12(\hat y - y)^2$ the same chain rule gives

{{< eq title="The squared-error gradient for a sigmoid neuron" say="The error is multiplied by the slope of the sigmoid, which vanishes exactly when the neuron is confident." >}}
$$ \frac{\partial \textcolor{#e64980}{\ell}}{\partial \textcolor{#d4a017}{z}} = (\textcolor{#f08c2e}{\hat y} - \textcolor{#4c6ef5}{y})\;\textcolor{#f08c2e}{\hat y}\,(1-\textcolor{#f08c2e}{\hat y}) $$
- $\textcolor{#f08c2e}{\hat y}(1-\textcolor{#f08c2e}{\hat y})$: the slope of the sigmoid, at most 0.25 and close to zero whenever $\hat y$ is near 0 or 1
{{< /eq >}}

The extra factor $\hat y(1-\hat y)$ is the trouble. Take an example labelled 1 that the neuron gets badly wrong, with $z = -5$ and so $\hat y = 0.0067$. The cross-entropy slope with respect to $z$ is $\hat y - y = -0.993$, almost as large as it can be. The squared-error slope is $-0.993 \times 0.0067 \times 0.993 = -0.0066$, about 150 times smaller. A neuron trained with squared error learns most slowly from exactly the examples it gets most wrong, the opposite of what a good student, or a good classifier, should do. The logarithm in cross-entropy cancels the flat tails of the sigmoid precisely. There is a second problem: the squared error of a sigmoid is not a convex function of the weights, and its landscape has flat plateaus where gradient descent stalls, whereas cross-entropy gives a single bowl.

The cell below makes the comparison concrete. It prints both slopes for an example labelled 1 at several values of $z$, then trains a one-input neuron on two overlapping clusters, starting from a weight of −4 that makes it confidently wrong about almost every point, and counts the gradient-descent steps each loss needs to classify 95% of the points correctly.

{{< py title="cross-entropy against squared error" >}}
import numpy as np
sig = lambda z: 1 / (1 + np.exp(-z))

print("one example with label y = 1: slope of each loss with respect to z")
for z in [2.0, 0.0, -2.0, -5.0]:
    p = sig(z)
    print(f"  z = {z:4.1f}  y_hat = {p:.4f}  cross-entropy {p - 1:+.4f}  squared {(p - 1) * p * (1 - p):+.5f}")

rng = np.random.default_rng(0)                    # two classes on one input
x = np.concatenate([rng.normal(1.5, 0.7, 50), rng.normal(-1.5, 0.7, 50)])
y = np.concatenate([np.ones(50), np.zeros(50)])
for loss in ["cross-entropy", "squared"]:
    w, b = -4.0, 0.0                              # start confident and wrong
    for step in range(1, 5001):
        p = sig(w * x + b)
        e = p - y if loss == "cross-entropy" else (p - y) * p * (1 - p)
        w, b = w - 0.5 * np.mean(e * x), b - 0.5 * np.mean(e)
        if np.mean((sig(w * x + b) > 0.5) == y) >= 0.95:
            break
    print(f"{loss:13s}: 95% correct after {step} steps")
{{< /py >}}

With the same learning rate, cross-entropy recovers in 6 steps and squared error needs 272. The squared-error neuron is not stuck for ever, but it spends most of its time crawling off a plateau of its own making. In a network, where many neurons can saturate at once, the effect compounds, which is why classifiers are almost always trained with cross-entropy.

## Walking downhill

**Gradient descent** repeats one update: compute the average gradient over the data and step against it,

$$
\textcolor{#12a594}{\mathbf w} \leftarrow \textcolor{#12a594}{\mathbf w} - \eta\, \frac1N\sum_i (\hat y_i - y_i)\,\mathbf x_i, \qquad \textcolor{#845ef7}{b} \leftarrow \textcolor{#845ef7}{b} - \eta\,\frac1N\sum_i (\hat y_i - y_i),
$$

where $\eta$, the **learning rate**, sets the step size.

{{< widget name="neuronlearn" title="A neuron learning to separate two classes" caption="Left: the data and the neuron's current boundary and probabilities. Right: the loss for every pair of weights (darker is lower, at the current bias), with the path the weights have taken. Press Train. Then add points of either class by clicking, or try a learning rate of 3." >}}

The right-hand panel is the most important picture in machine learning. Every pair of weights is a point on the **loss landscape**; training is a walk downhill on it. Watch the path: it starts steep and fast, then slows down as the slope flattens near the bottom. With a large learning rate the walk overshoots and zig-zags. For a single sigmoid neuron with cross-entropy, the landscape is **convex** (bowl-shaped, with no false valleys), so gradient descent always reaches the best weights. That stops being true once neurons are stacked into networks, which is why [the optimisation chapter](../gradient-descent/) is needed later.

{{< note type="try" >}}
Press **New data**, set the learning rate to 0.05 and press **One step** a few times: the white dot on the landscape creeps. Set it to 3 and train again: the path overshoots and zig-zags before it settles. Then set **Clicking adds** to the blue class and click a few points deep inside the orange cloud. The boundary tilts to accommodate them, the loss jumps, and no amount of training can now make every point come out correct.
{{< /note >}}

### One step by hand

Each press of **One step** in the lab applies the update above once. It is worth doing one with a pencil. Four compounds, each described by two standardised descriptors, are labelled stable (1) or unstable (0) with respect to decomposition into competing phases:

| compound | $x_1$ | $x_2$ | label $y$ |
|---|---|---|---|
| A | 1 | 1 | 1 |
| B | 2 | 0 | 1 |
| C | −1 | 0 | 0 |
| D | 0 | −2 | 0 |

Start from $\mathbf w = (0, 0)$ and $b = 0$. Every $z$ is zero, every prediction is $\hat y = 0.5$, and the loss is $\ln 2 = 0.693$ whatever the labels: the loss of a model that knows nothing. The errors $\hat y - y$ are $-0.5, -0.5, +0.5, +0.5$, and averaging error times input gives the gradient

$$
\frac{\partial\mathcal L}{\partial w_1} = \tfrac14\big[(-0.5)(1) + (-0.5)(2) + (0.5)(-1) + (0.5)(0)\big] = -0.5, \qquad
\frac{\partial\mathcal L}{\partial w_2} = \tfrac14\big[(-0.5)(1) + 0 + 0 + (0.5)(-2)\big] = -0.375,
$$

with $\partial\mathcal L/\partial b = 0$ because the four errors cancel. One step with $\eta = 1$ moves the weights to $\mathbf w = (0.5, 0.375)$. The new predictions are 0.71 and 0.73 for the stable compounds and 0.38 and 0.32 for the unstable ones, all on the correct side of 0.5, and the loss falls from 0.693 to 0.381. A second step brings it to 0.256. Each step is smaller than the one before, because the errors that drive it shrink as the predictions improve.

## Two things that go wrong already

- **Perfectly separable data.** If a straight line separates the classes exactly, the loss can always be lowered by making the weights larger and the boundary sharper, so they grow forever. In the lab, whenever the readout shows every point classified correctly, keep training and watch $\lVert\mathbf w\rVert$ keep increasing. The cure is **regularisation**, a penalty on large weights, discussed in [the generalisation chapter](../generalisation/).
- **Unscaled inputs.** If one input is in nanometres and another in kelvin, the landscape becomes a long thin valley and gradient descent zig-zags across it. Standardising inputs (subtract the mean, divide by the standard deviation) makes the bowl round.

{{< note type="practice" >}}
- On a balanced two-class problem, a training loss stuck at $\ln 2 \approx 0.693$ usually means the model is predicting 0.5 for everything. Check the labels, the input scaling and the learning rate before anything more elaborate.
- Watch accuracy alongside the loss. Accuracy can stay flat while the loss keeps improving, because it ignores how confident the predictions are.
- In scikit-learn, `LogisticRegression` applies an L2 penalty by default (`C=1.0`, where a smaller `C` means a stronger penalty), so its weights are not pure maximum-likelihood estimates. That is usually what you want, and it is the cure for separable data described above.
- For a few features and a few thousand examples, use a library solver such as the default `lbfgs`, which needs no learning rate. Hand-written gradient descent is for understanding, and for networks.
{{< /note >}}

## The perceptron rule

Rosenblatt's original perceptron used a step function and an even simpler update: for each misclassified example, add $\eta\,\mathbf x_i$ to the weights if it should have fired, and subtract it if it should not. He proved that if the classes can be separated by a line at all, this rule finds one in a finite number of steps (the **perceptron convergence theorem**). Logistic regression replaces the hard step by a smooth sigmoid so that *every* example, not only misclassified ones, contributes a gradient, and the output becomes a calibrated probability.

{{< note type="story" >}}
Rosenblatt's perceptron first ran as a program on an IBM 704 at the Cornell Aeronautical Laboratory, and the press took it very seriously: in July 1958 *The New York Times* reported that the Navy expected the machine to “walk, talk, see, write, reproduce itself and be conscious of its existence”. The purpose-built Mark I Perceptron that followed had a 20 × 20 grid of photocells for an eye, and its adjustable weights were potentiometers turned by electric motors. Learning, in that machine, was literally the turning of knobs.
{{< /note >}}

### The perceptron rule by hand

The rule is simple enough to run with a pencil. Return to the TiO₂ spectra of [the previous chapter](../the-neuron/), with $x_1$ the intensity of the anatase band near 144 cm⁻¹ and $x_2$ the intensity of the rutile band near 447 cm⁻¹, and four training spectra: S1 = (0.9, 0.1) and S3 = (0.7, 0.3) are anatase, labelled 1; S2 = (0.2, 0.8) and S4 = (0.3, 0.6) are rutile, labelled 0. Fold the bias into the weights by prepending a constant input 1, so that $\mathbf w = (b, w_1, w_2)$; start from $\mathbf w = (0, 0, 0)$, take $\eta = 1$, and let the neuron output 1 when $z \ge 0$. A mistake triggers $\mathbf w \leftarrow \mathbf w + (y - \hat y)\,\mathbf x$.

| pass | spectrum | $\mathbf x$ | label | $z$ | output | update | new $\mathbf w$ |
|---|---|---|---|---|---|---|---|
| 1 | S1 | (1, 0.9, 0.1) | 1 | 0 | 1 | none | (0, 0, 0) |
| 1 | S2 | (1, 0.2, 0.8) | 0 | 0 | 1 | subtract $\mathbf x$ | (−1, −0.2, −0.8) |
| 1 | S3 | (1, 0.7, 0.3) | 1 | −1.38 | 0 | add $\mathbf x$ | (0, 0.5, −0.5) |
| 1 | S4 | (1, 0.3, 0.6) | 0 | −0.15 | 0 | none | (0, 0.5, −0.5) |
| 2 | S1 to S4 | | | 0.4, −0.3, 0.2, −0.15 | 1, 0, 1, 0 | none | (0, 0.5, −0.5) |

After two mistakes and two corrections, a full pass makes no errors and learning stops. The learned rule, $0.5x_1 - 0.5x_2 \ge 0$, reads “anatase if the 144 cm⁻¹ band is at least as strong as the 447 cm⁻¹ band”: the same boundary as the hand-built neuron of the previous chapter, whose weights were 4 and −4. Novikoff's 1962 proof even puts a number on “finite”: if every input vector has length at most $R$ and some unit-length weight vector separates the classes with every point at least a distance $\gamma$ from the boundary, the rule makes at most $(R/\gamma)^2$ mistakes, however many examples there are.

Notice also what the perceptron does *not* do. Once every point is on the right side it stops, however close a point sits to the line; S4 has $z = -0.15$, barely on the rutile side. Logistic regression keeps working on every point. On separable data its weights grow without limit, as described above, but their direction turns, ever more slowly, towards the boundary with the widest possible margin between the classes (Soudry et al., 2018).

{{< note type="key" >}}
- A loss function turns prediction quality into one number; cross-entropy is the negative log-likelihood of the labels under the neuron's probabilities.
- For a sigmoid neuron its gradient is simply (prediction − label) × input.
- Gradient descent steps the weights downhill on the loss landscape; for one neuron that landscape is a convex bowl.
- Squared error multiplies the error by the sigmoid's slope, so a confidently wrong neuron barely learns; cross-entropy removes that factor.
- The perceptron rule updates only on mistakes and stops at the first separating line it finds; logistic regression keeps improving every margin.
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
- q: "A sigmoid neuron starts with all its weights and its bias at zero. What is its initial cross-entropy loss?"
  options: ["0", "$\\ln 2 \\approx 0.693$", "1"]
  answer: 1
  why: "Every prediction is $\\sigma(0) = 0.5$, so each example costs $-\\ln 0.5 = \\ln 2$, whatever its label. A loss that never moves from this value means the model has learned nothing."
- q: "Why does a sigmoid neuron trained with squared error learn slowly from an example it gets confidently wrong?"
  options: ["Because the squared error of a confident mistake is small", "Because the gradient contains the sigmoid's slope $\\hat y(1-\\hat y)$, which is nearly zero when the output is close to 0 or 1", "Because the learning rate is automatically reduced"]
  answer: 1
  why: "With squared error, $\\partial\\ell/\\partial z = (\\hat y - y)\\,\\hat y(1-\\hat y)$. At $\\hat y = 0.0067$ and $y = 1$ this is $-0.0066$, against $-0.993$ for cross-entropy. The squared error itself is close to its maximum, 0.5."
- q: "The perceptron rule meets an example labelled 0 that it classified as 1. What does it do?"
  options: ["Adds $\\eta\\,\\mathbf x$ to the weights", "Subtracts $\\eta\\,\\mathbf x$ from the weights", "Nothing, because only examples labelled 1 cause updates"]
  answer: 1
  why: "The update is $\\mathbf w \\leftarrow \\mathbf w + \\eta\\,(y - \\hat y)\\,\\mathbf x$ with $y - \\hat y = -1$, so $\\mathbf x$ is subtracted, which lowers $z$ for that example and for inputs like it."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. C. M. Bishop, *Pattern Recognition and Machine Learning*, Springer (2006), §4.3 (probabilistic discriminative models, logistic regression).
2. I. Goodfellow, Y. Bengio and A. Courville, *Deep Learning*, MIT Press (2016), §5.5 (maximum likelihood) and §6.2.2 (output units and cross-entropy).
3. F. Rosenblatt, *Principles of Neurodynamics: Perceptrons and the Theory of Brain Mechanisms*, Spartan Books (1962).
4. A. B. J. Novikoff, “On convergence proofs on perceptrons,” *Proceedings of the Symposium on the Mathematical Theory of Automata* **12**, 615–622 (1962).
5. G. Sanderson (3Blue1Brown), *Neural networks*, chapter 2, “Gradient descent, how neural networks learn” (2017).
6. M. A. Nielsen, *Neural Networks and Deep Learning*, Determination Press (2015), chapter 3, on the learning slowdown of the quadratic cost and how cross-entropy cures it; free online.
7. D. Soudry, E. Hoffer, M. S. Nacson, S. Gunasekar and N. Srebro, “The implicit bias of gradient descent on separable data,” *Journal of Machine Learning Research* **19**, 1–57 (2018).

</div>
