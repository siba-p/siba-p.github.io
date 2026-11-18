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
cover: "cover.svg"
milestones:
  - year: 1958
    text: "Rosenblatt's perceptron learns its weights on an IBM 704 at the Cornell Aeronautical Laboratory"
  - year: 1960
    text: "Widrow and Hoff train ADALINE with the least-mean-squares delta rule"
  - year: 1962
    text: "Novikoff bounds the number of mistakes the perceptron rule can make"
  - year: 2018
    text: "Soudry and co-workers show gradient descent drifts towards the maximum-margin boundary"
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

### Reading a loss value

The name comes from information theory. Claude Shannon measured the information in an event of probability $p$ as $-\log p$, the **surprise**: certain events carry none, rare ones a lot. Cross-entropy is the average surprise of the true labels under the model's probabilities, in nats when the logarithm is natural; divide by $\ln 2 = 0.693$ to get bits. A loss of exactly $\ln 2$ is therefore one bit per example, the surprise of a fair coin.

{{< note type="practice" title="Back of the envelope" >}}
Exponentiate a cross-entropy and it becomes readable: $e^{-\mathcal L}$ is the geometric mean of the probabilities the model assigns to the correct labels. A loss of 0.381 means the model gives the true label 0.68 on a typical example; 0.256 means 0.77; 0.05 means 0.95. The baseline to beat is not always $\ln 2$. A model that knows only the base rate $p$ of the positive class, and predicts $p$ for every example, scores $-[p\ln p + (1-p)\ln(1-p)]$, the entropy of the labels. With 5% positives that is 0.199, so on such data a training loss of 0.2 means the descriptors have contributed nothing yet.
{{< /note >}}

## The gradient, in one line

To go downhill we need the slope of $\mathcal L$ with respect to every weight. Here the sigmoid and the logarithm cancel in a way that is almost too neat. Use the chain rule on one example, with $z = \mathbf w\cdot\mathbf x + b$:

{{< eq title="The cross-entropy gradient for one neuron" say="Each weight moves in proportion to the prediction error times its own input." >}}
$$ \frac{\partial\,\textcolor{#e64980}{\ell}}{\partial \textcolor{#12a594}{w_j}} = \underbrace{\frac{\partial \textcolor{#e64980}{\ell}}{\partial \textcolor{#f08c2e}{\hat y}}\,\frac{\partial \textcolor{#f08c2e}{\hat y}}{\partial \textcolor{#d4a017}{z}}}_{=\ \textcolor{#f08c2e}{\hat y} - \textcolor{#4c6ef5}{y}}\;\frac{\partial \textcolor{#d4a017}{z}}{\partial \textcolor{#12a594}{w_j}} = (\textcolor{#f08c2e}{\hat y} - \textcolor{#4c6ef5}{y})\, x_j, \qquad \frac{\partial\,\textcolor{#e64980}{\ell}}{\partial \textcolor{#845ef7}{b}} = \textcolor{#f08c2e}{\hat y} - \textcolor{#4c6ef5}{y} $$
- $\partial\ell/\partial\hat y = -y/\hat y + (1-y)/(1-\hat y)$ and $\partial\hat y/\partial z = \hat y(1-\hat y)$; their product simplifies to $\hat y - y$
- $x_j$: the input that weight $w_j$ multiplies
{{< /eq >}}

The meaning is intuitive. If the neuron says 0.9 for an example that is really 0, the error $\hat y - y = 0.9$ is large and positive, so every weight whose input was positive is pushed down. If the prediction is right, the error is near zero and nothing changes. Learning is driven by mistakes.

The cancellation behind the one-line formula takes one line to check:

$$
\frac{\partial\ell}{\partial\hat y}\,\frac{\partial\hat y}{\partial z} = \Big[-\frac{y}{\hat y} + \frac{1-y}{1-\hat y}\Big]\,\hat y(1-\hat y) = -y(1-\hat y) + (1-y)\,\hat y = \hat y - y .
$$

It is not a coincidence. Linear regression with squared error has the same gradient, $(\hat y - y)\,x_j$, and so does a softmax output trained with multi-class cross-entropy. In the language of generalised linear models, each pairs an output function with the negative log-likelihood of the matching noise model (Gaussian for a linear output, Bernoulli for the sigmoid, categorical for the softmax), a pairing statisticians call the **canonical link**, and for every such pair the gradient reduces to prediction minus observation, times input.

The bias gradient carries a useful consequence. At the minimum of the unregularised loss, $\partial\mathcal L/\partial b = \frac1N\sum_i(\hat y_i - y_i) = 0$, so the average predicted probability equals the fraction of positive labels in the training set. A logistic model trained on a library in which 5% of compounds are stable predicts, averaged over that library, exactly 5%. If the model is applied where the base rate differs, say $p' = 30\%$ instead of $p = 5\%$, while the descriptors within each class are distributed as before, its probabilities are off by a constant in the log-odds, and only the bias term needs correcting: adding $\ln[p'/(1-p')] - \ln[p/(1-p)]$ to $b$ moves the prior from $p$ to $p'$.

## Why not squared error?

Squared error served [linear regression](../learning-from-data/) well, so why not use it here? Try it. With $\ell = \tfrac12(\hat y - y)^2$ the same chain rule gives

{{< eq title="The squared-error gradient for a sigmoid neuron" say="The error is multiplied by the slope of the sigmoid, which vanishes exactly when the neuron is confident." >}}
$$ \frac{\partial \textcolor{#e64980}{\ell}}{\partial \textcolor{#d4a017}{z}} = (\textcolor{#f08c2e}{\hat y} - \textcolor{#4c6ef5}{y})\;\textcolor{#f08c2e}{\hat y}\,(1-\textcolor{#f08c2e}{\hat y}) $$
- $\textcolor{#f08c2e}{\hat y}(1-\textcolor{#f08c2e}{\hat y})$: the slope of the sigmoid, at most 0.25 and close to zero whenever $\hat y$ is near 0 or 1
{{< /eq >}}

The extra factor $\hat y(1-\hat y)$ is the trouble. Take an example labelled 1 that the neuron gets badly wrong, with $z = -5$ and so $\hat y = 0.0067$. The cross-entropy slope with respect to $z$ is $\hat y - y = -0.993$, almost as large as it can be. The squared-error slope is $-0.993 \times 0.0067 \times 0.993 = -0.0066$, about 150 times smaller. A neuron trained with squared error learns most slowly from exactly the examples it gets most wrong, the opposite of what a good student, or a good classifier, should do. The logarithm in cross-entropy cancels the flat tails of the sigmoid precisely. There is a second problem: the squared error of a sigmoid is not a convex function of the weights, and its landscape has flat plateaus where gradient descent stalls, whereas cross-entropy gives a single bowl.

{{< fig src="ce-vs-se.svg" alt="Left, the loss of one example labelled 1 against the weighted sum z, for cross-entropy, which rises steadily for negative z, and for squared error, which flattens at 0.5. Right, the magnitude of each loss's slope on a logarithmic axis, with values 0.993 and 0.0066 marked at z equal to minus 5" caption="One example with label 1. Left: squared error saturates at 0.5 on the wrong side ($z < 0$, shaded), so a badly wrong prediction costs little more than a mildly wrong one, while cross-entropy keeps rising. Right: at $z = -5$ the cross-entropy slope is 0.993 and the squared-error slope 0.0066, 150 times smaller." >}}

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

{{< fig src="training-curves.svg" alt="Two panels on a logarithmic step axis. Left, the weight w over 1000 steps: under cross-entropy it rises from minus 4 past zero within a few steps; under squared error it stays near minus 4 for about 200 steps and then jumps. Right, accuracy: cross-entropy reaches 95 percent at step 6, squared error at step 272" caption="The experiment of the cell above, recorded at every step. Under squared error the weight sits on a plateau near its starting value of $-4$ for some 200 steps, because almost every point is confidently misclassified and contributes a slope near zero; under cross-entropy those same points drive the fastest learning." >}}

## Walking downhill

**Gradient descent** repeats one update: compute the average gradient over the data and step against it,

$$
\textcolor{#12a594}{\mathbf w} \leftarrow \textcolor{#12a594}{\mathbf w} - \eta\, \frac1N\sum_i (\hat y_i - y_i)\,\mathbf x_i, \qquad \textcolor{#845ef7}{b} \leftarrow \textcolor{#845ef7}{b} - \eta\,\frac1N\sum_i (\hat y_i - y_i),
$$

where $\eta$, the **learning rate**, sets the step size. With millions of examples, averaging over all of them for every step is wasteful, and practical training estimates the gradient from a small random **mini-batch** instead; [the gradient-descent chapter](../gradient-descent/) covers that and the optimisers built on it.

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

### How large a step is safe?

For one neuron the safe learning rate can be estimated before training. The curvature of the cross-entropy is its matrix of second derivatives, $\mathbf H = \frac1N\sum_i \hat y_i(1-\hat y_i)\,\tilde{\mathbf x}_i\tilde{\mathbf x}_i^{\top}$, where $\tilde{\mathbf x} = (1, x_1, x_2, \dots)$ includes the constant input that multiplies the bias. Since $\hat y(1-\hat y) \le 1/4$, the curvature never exceeds a quarter of the largest eigenvalue $\lambda_{\max}$ of the input second-moment matrix $\frac1N\sum_i\tilde{\mathbf x}_i\tilde{\mathbf x}_i^{\top}$, and gradient descent on a convex bowl is stable for any step below 2 divided by the largest curvature. Hence

$$
\eta < \frac{8}{\lambda_{\max}} .
$$

The bound is tight at the start of training, when every prediction is 0.5. For the four compounds above, $\lambda_{\max} = 1.82$, so any $\eta$ up to 4.4 is safe and the step of 1 used there is comfortably inside. For standardised, uncorrelated inputs, $\lambda_{\max} = 1$ and $\eta$ up to 8 is safe.

Now leave one descriptor unscaled: a synthesis temperature in kelvin with mean 1000 K and standard deviation 200 K. Its second moment is about $1.04\times10^{6}$, the bound falls to $\eta < 8\times10^{-6}$, and along a standardised descriptor, where the curvature is at most $1/4$, each step now removes only about $2\times10^{-6}$ of the remaining error. Reaching the minimum takes of order a million steps instead of tens. This is the long thin valley described in the next section, put into numbers, and standardisation removes it in one line of code.

## Two things that go wrong already

- **Perfectly separable data.** If a straight line separates the classes exactly, the loss can always be lowered by making the weights larger and the boundary sharper, so they grow forever. In the lab, whenever the readout shows every point classified correctly, keep training and watch $\lVert\mathbf w\rVert$ keep increasing. The cure is **regularisation**, a penalty on large weights, discussed in [the generalisation chapter](../generalisation/).
- **Unscaled inputs.** If one input is in nanometres and another in kelvin, the landscape becomes a long thin valley and gradient descent zig-zags across it. Standardising inputs (subtract the mean, divide by the standard deviation) makes the bowl round.

{{< note type="practice" >}}
- On a balanced two-class problem, a training loss stuck at $\ln 2 \approx 0.693$ usually means the model is predicting 0.5 for everything. Check the labels, the input scaling and the learning rate before anything more elaborate.
- Watch accuracy alongside the loss. Accuracy can stay flat while the loss keeps improving, because it ignores how confident the predictions are.
- In scikit-learn, `LogisticRegression` applies an L2 penalty by default (`C=1.0`, where a smaller `C` means a stronger penalty), so its weights are not pure maximum-likelihood estimates. That is usually what you want, and it is the cure for separable data described above.
- For a few features and a few thousand examples, use a library solver such as the default `lbfgs`, which needs no learning rate. Hand-written gradient descent is for understanding, and for networks.
{{< /note >}}

{{< note type="warn" title="Myth" >}}
**Myth:** a well-trained classifier drives the loss to zero. **Reality:** when the classes overlap, the lowest achievable cross-entropy is well above zero. Take the two clusters of the Python cell above: one-dimensional Gaussians centred at $\pm1.5$ with standard deviation 0.7. Even the best possible classifier, which is itself a sigmoid neuron with $w = 2 \times 1.5/0.7^2 = 6.1$ and $b = 0$, misclassifies 1.6% of new points and has an expected cross-entropy of 0.043. The cell's own run, at 3,000 steps, reaches a training loss of 0.022, below that floor, because its sample of 100 points happens to overlap less than the population does; in a network with enough parameters, a training loss far below the floor usually means the model has memorised its training set. The number to watch is the loss on held-out data, the subject of [the generalisation chapter](../generalisation/).
{{< /note >}}

{{< note type="practice" title="From the lab: a stability classifier on imbalanced data" >}}
A typical screening task labels hypothetical compounds stable if their DFT energy above the convex hull is below some tolerance, such as 25 meV per atom, roughly the thermal energy at room temperature, and unstable otherwise. In such libraries stable compounds are often a small minority; take 5%. Three consequences follow from this chapter. A neuron that calls everything unstable is 95% accurate, so accuracy is useless as a headline number; report precision and recall for the stable class instead. The know-nothing loss is 0.199, not 0.693, so a training loss of 0.2 is no achievement. And the optimiser starts more sensibly from a bias of $\ln(0.05/0.95) = -2.94$ than from zero, which avoids spending the first hundred steps learning only the base rate. If missing a stable compound costs more than testing an unstable one, weight the positive examples more heavily in the loss, or lower the decision threshold below 0.5, rather than discarding unstable examples.
{{< /note >}}

## The perceptron rule

Rosenblatt's original perceptron used a step function and an even simpler update: for each misclassified example, add $\eta\,\mathbf x_i$ to the weights if it should have fired, and subtract it if it should not. He proved that if the classes can be separated by a line at all, this rule finds one in a finite number of steps (the **perceptron convergence theorem**). Logistic regression replaces the hard step by a smooth sigmoid so that *every* example, not only misclassified ones, contributes a gradient, and the output becomes a calibrated probability.

The rule is itself gradient descent, applied one example at a time to a different loss. Write the labels as $t = 2y - 1 = \pm1$ and define the **perceptron criterion**, $E = -\sum_{\text{misclassified}} t_i\, z_i$, which is positive and falls as misclassified points move towards the right side. Its gradient for one misclassified example is $-t_i\,\mathbf x_i$, and a stochastic step of size $\eta$ adds $\eta\, t_i\,\mathbf x_i$: Rosenblatt's update. Two years after the perceptron, Bernard Widrow and Ted Hoff at Stanford trained ADALINE, a neuron whose weights were adjusted, example by example, to reduce the squared error between its linear output $z$ and a target of $\pm1$, before any threshold was applied. Their **delta rule**, $\mathbf w \leftarrow \mathbf w - \eta\,(z - t)\,\mathbf x$, also called least mean squares, is stochastic gradient descent on squared error for a linear model, and it still adapts the filters of echo cancellers and channel equalisers.

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

{{< fig src="perceptron-steps.svg" alt="Three panels of the unit square with four spectra S1 to S4. In the first the whole square is orange and S2 is ringed; in the second the whole square is blue and S3 is ringed; in the third a diagonal line separates S1 and S3 below it from S2 and S4 above it, with the weight vector drawn as an arrow" caption="The trace in the table, drawn. Orange shading marks where the neuron outputs 1 (anatase). With $\mathbf w = 0$ it calls everything anatase and S2 is wrong; subtracting S2 overshoots, and everything is called rutile; adding S3 puts the boundary on the diagonal $x_1 = x_2$, where it stops with S4 only 0.15 from the line in $z$." >}}

After two mistakes and two corrections, a full pass makes no errors and learning stops. The learned rule, $0.5x_1 - 0.5x_2 \ge 0$, reads “anatase if the 144 cm⁻¹ band is at least as strong as the 447 cm⁻¹ band”: the same boundary as the hand-built neuron of the previous chapter, whose weights were 4 and −4. Novikoff's 1962 proof even puts a number on “finite”: if every input vector has length at most $R$ and some unit-length weight vector separates the classes with every point at least a distance $\gamma$ from the boundary, the rule makes at most $(R/\gamma)^2$ mistakes, however many examples there are.

Notice also what the perceptron does *not* do. Once every point is on the right side it stops, however close a point sits to the line; S4 has $z = -0.15$, barely on the rutile side. Logistic regression keeps working on every point. On separable data its weights grow without limit, as described above, but their direction turns, ever more slowly, towards the boundary with the widest possible margin between the classes (Soudry et al., 2018).

{{< note type="key" >}}
- A loss function turns prediction quality into one number; cross-entropy is the negative log-likelihood of the labels under the neuron's probabilities.
- For a sigmoid neuron its gradient is simply (prediction − label) × input.
- Gradient descent steps the weights downhill on the loss landscape; for one neuron that landscape is a convex bowl.
- Squared error multiplies the error by the sigmoid's slope, so a confidently wrong neuron barely learns; cross-entropy removes that factor.
- The perceptron rule updates only on mistakes and stops at the first separating line it finds; logistic regression keeps improving every margin.
- Read losses against the right baseline: $e^{-\mathcal L}$ is the typical probability given to the true label, and a model that knows only the base rate already scores the entropy of the labels.
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
- q: "Inputs are standardised and uncorrelated. Using the bound $\\eta < 8/\\lambda_{\\max}$, what is the largest safe learning rate for a sigmoid neuron with cross-entropy?"
  options: ["About 0.01", "About 8", "Any value, because the loss is convex"]
  answer: 1
  why: "The second-moment matrix of $(1, x_1, x_2, \\dots)$ is the identity, so $\\lambda_{\\max} = 1$. The curvature is at most a quarter of that, and gradient descent is stable for steps below 2 divided by the curvature. Convexity alone does not prevent overshooting."
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
8. B. Widrow and M. E. Hoff, “Adaptive switching circuits,” *IRE WESCON Convention Record*, part 4, 96–104 (1960).
9. C. E. Shannon, “A mathematical theory of communication,” *Bell System Technical Journal* **27**, 379–423 and 623–656 (1948).

</div>
