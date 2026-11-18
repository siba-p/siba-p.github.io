---
title: "The artificial neuron"
description: "The smallest piece of every neural network: inputs, weights, a bias and an activation function. What a neuron computes, what it looks like geometrically, where the idea came from, and what one neuron alone can and cannot do."
hook: "In 1943 two scientists reduced a brain cell to one line of arithmetic: add up the inputs and compare the total with a threshold. Give the inputs adjustable weights, and that line is still the building block of every neural network."
objectives:
  - "Compute a neuron's weighted sum and output for given inputs, weights and bias"
  - "Explain why a single neuron always divides input space with a flat boundary"
  - "Choose an activation function for an output or a hidden neuron"
  - "Interpret a sigmoid neuron's weights as changes in the log-odds of its prediction"
  - "Recognise problems, such as XOR or a stability window, that no single neuron can solve"
cover: "cover.svg"
milestones:
  - year: 1943
    text: "McCulloch and Pitts model a neuron as a threshold logic unit"
  - year: 1958
    text: "Rosenblatt's perceptron gives every input a weight learned from examples"
  - year: 1969
    text: "Minsky and Papert's Perceptrons sets out what one-layer perceptrons cannot compute"
track: neuron
weight: 1
level: Foundation
minutes: 35
lab: "Steer a neuron and watch its decision"
---

## Where the idea came from

In 1943 the neurophysiologist Warren McCulloch and the logician Walter Pitts asked a bold question: could a brain cell be described as a tiny logical device? A biological neuron receives signals from thousands of others through **synapses**, some exciting it and some inhibiting it; if the combined stimulation crosses a threshold, it **fires** a pulse down its axon. McCulloch and Pitts wrote this as arithmetic: count the active excitatory inputs, let any active inhibitory input veto the cell outright, and output 1 if the count reaches a threshold, 0 otherwise. Their units were wired by hand. Giving every input its own adjustable strength, a **weight**, came later: in 1958 Frank Rosenblatt introduced the **perceptron**, a machine that could *learn* those weights from examples.

{{< fig src="bio-to-artificial.svg" alt="A stylised biological neuron with dendrites, synapses, a cell body and an axon, beside an artificial neuron with three weighted inputs, a summing node, a bias and a sigmoid activation" caption="The correspondence McCulloch and Pitts drew in 1943: synaptic strengths become weights, the firing threshold becomes the bias, and the all-or-nothing spike becomes the activation function. Edge thickness on the right shows the size of each weight; teal is positive, pink negative." >}}

Modern artificial neurons are only loosely inspired by biology, but the arithmetic has hardly changed. Everything in this volume, up to graph networks and transformers, is built from millions of copies of the unit in this chapter.

{{< note type="warn" title="Myth" >}}
**Myth:** an artificial neuron is a simplified model of a brain cell. **Reality:** it models one idea about brain cells, threshold summation, and the resemblance ends there. A cortical neuron signals with spikes whose timing carries information, its dendrites perform nonlinear computations of their own, and its synapses change on time scales from milliseconds to days. In 2021 David Beniaguev, Idan Segev and Michael London trained artificial networks to reproduce, millisecond by millisecond, the output of a detailed biophysical model of a layer-5 cortical pyramidal neuron. They needed a temporal convolutional network five to eight layers deep; with the NMDA receptors removed from the model's dendrites, a single hidden layer sufficed. One biological neuron is closer to a whole network than to one unit of this chapter.
{{< /note >}}

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

It is often convenient to treat the bias as one more weight. Append a constant input $x_0 = 1$ to every input vector and call the bias $w_0$; then $z = \sum_{j=0}^{n} w_j x_j$ is a single dot product, and any rule that updates the weights updates the bias too. Software libraries keep $b$ separate, but derivations, including the perceptron rule traced in [the next chapter](../how-a-neuron-learns/), often use this trick.

{{< note type="practice" title="Back of the envelope" >}}
A neuron that reads a whole Raman spectrum of 1,000 channels performs 1,000 multiplications, 1,000 additions and one exponential, about 2,000 floating-point operations. One CPU core sustaining $10^{10}$ operations per second evaluates it five million times a second, far faster than any spectrometer records spectra. Speed is never the constraint for one neuron; the parameter count is. Such a neuron has 1,001 numbers to fit, and a library of 200 labelled spectra cannot determine them: many weight vectors fit the training set perfectly and disagree on new spectra. That is the problem of [generalisation and regularisation](../generalisation/), and it starts with the first neuron.
{{< /note >}}

{{< widget name="neuron" title="One neuron, two inputs" caption="Left: the neuron as a diagram, with edge thickness showing the size of each weight (teal positive, pink negative). Right: its output for every input in the plane. Move the sliders and drag the white input point." >}}

### A worked example: anatase or rutile?

Titanium dioxide crystallises as anatase or as rutile, and Raman spectroscopy tells the two polymorphs apart at a glance: anatase has a very strong band near 144 cm⁻¹, while the strongest rutile bands lie near 447 and 612 cm⁻¹. Take two inputs, $x_1$, the normalised intensity near 144 cm⁻¹, and $x_2$, the normalised intensity near 447 cm⁻¹, and build a neuron whose output is the probability that a sample is anatase. Intensity at 144 cm⁻¹ is evidence for anatase and intensity at 447 cm⁻¹ is evidence against it, so choose $w_1 = 4$, $w_2 = -4$, $b = 0$ and a sigmoid activation.

| spectrum | $x_1$ | $x_2$ | $z = 4x_1 - 4x_2$ | $y = \sigma(z)$ | verdict |
|---|---|---|---|---|---|
| clearly anatase | 0.9 | 0.1 | 3.2 | 0.961 | anatase |
| clearly rutile | 0.2 | 0.7 | −2.0 | 0.119 | rutile |
| equal intensities | 0.5 | 0.5 | 0 | 0.500 | undecided |
| mostly anatase | 0.6 | 0.3 | 1.2 | 0.769 | probably anatase |

Three design decisions hide in those numbers. The **signs** of the weights encode the spectroscopy: which band is evidence for which phase. Their **size** sets how quickly the neuron becomes sure of itself; with weights of ±40 every spectrum except a near-tie would be called with near certainty, which is overconfident for noisy data. The **zero bias** says that, with equal intensities, neither phase is favoured; a negative bias would encode a prior expectation that most samples are rutile. Here a person who knows the spectroscopy chose the weights. The point of [the next chapter](../how-a-neuron-learns/) is to let the data choose them.

## Seeing a neuron as geometry

With two inputs, every possible input is a point in a plane, and the neuron gives each point a value: the colours in the lab. Three facts are visible there and are worth understanding exactly.

**The boundary is a straight line.** The output is halfway (for the sigmoid, $y = 0.5$) where $z = 0$, that is where $w_1x_1 + w_2x_2 + b = 0$. That equation describes a straight line; with three inputs it is a flat plane, and in $n$ dimensions a **hyperplane**. Whatever activation you choose, a single neuron divides input space with a flat cut.

**The weights point across the line.** The weight vector $\mathbf w = (w_1, w_2)$ is perpendicular to the boundary and points towards higher output. Moving the input in the direction of $\mathbf w$ raises $z$ fastest; moving along the boundary does not change it at all. Rotating $\mathbf w$ in the lab rotates the boundary.

**The bias slides the line; the size of the weights sets its sharpness.** The distance from the origin to the boundary is $|b|/\lVert\mathbf w\rVert$. Doubling both weights and the bias leaves the boundary where it is but makes the transition from blue to orange twice as abrupt.

{{< eq title="Distance from the boundary" say="z measures how far, and on which side, the input sits from the line, in units of 1/‖w‖." >}}
$$ \frac{\textcolor{#d4a017}{z}}{\lVert \textcolor{#12a594}{\mathbf w} \rVert} = \frac{\textcolor{#12a594}{\mathbf w}\cdot\textcolor{#4c6ef5}{\mathbf x} + \textcolor{#845ef7}{b}}{\lVert \textcolor{#12a594}{\mathbf w} \rVert} = \text{signed distance of } \textcolor{#4c6ef5}{\mathbf x} \text{ from the line} $$
- $\lVert\mathbf w\rVert = \sqrt{w_1^2 + w_2^2}$: the length of the weight vector
{{< /eq >}}

Put numbers into the anatase neuron. Its weight vector $(4, -4)$ has length $\sqrt{32} = 5.66$, and its boundary is the diagonal $x_1 = x_2$. The clearly anatase spectrum $(0.9, 0.1)$, with $z = 3.2$, sits $3.2/5.66 = 0.57$ intensity units from that line on the anatase side; the mostly anatase spectrum $(0.6, 0.3)$ sits 0.21 units away. Scale the weights up to $\pm 40$ and these distances do not change, but every $z$ grows tenfold, so the second spectrum, which a spectroscopist would call probably anatase, receives a probability of $\sigma(12) = 0.999994$. The geometry fixes which side a spectrum falls on; $\lVert\mathbf w\rVert$ alone decides how loudly the neuron announces it.

{{< note type="try" title="Pause and predict" >}}
A cosmic ray strikes the detector during a measurement and puts a spike on the 144 cm⁻¹ channel, so the anatase neuron receives $x_1 = 5$, $x_2 = 0.1$, an intensity five times larger than anything in its library. Before reading on, guess the probability it reports.

It reports $z = 4 \times 5 - 4 \times 0.1 = 19.6$ and $y = \sigma(19.6) = 1 - 3\times10^{-9}$, more certain than it is about any genuine spectrum in its library. A sigmoid's confidence measures distance from the boundary, not closeness to the training data, and nothing inside $z$ can signal that an input is unlike anything the neuron has seen. Detecting that needs a separate check, such as the distance to the nearest training example or the disagreement within an ensemble of models (see [uncertainty and Gaussian processes](../uncertainty-gaussian-processes/)).
{{< /note >}}

### Many inputs: the weight vector as a template

With two inputs the geometry can be drawn; with a full spectrum of 1,000 intensities it cannot, but the algebra is the same and it suggests a more useful picture. The weighted sum is a dot product, $\mathbf w\cdot\mathbf x = \lVert\mathbf w\rVert\,\lVert\mathbf x\rVert\cos\theta$, where $\theta$ is the angle between the two vectors. Among inputs of a given length, $z$ is largest for the one that points along $\mathbf w$ (the Cauchy–Schwarz inequality). The weight vector is therefore a **template**: the input pattern that excites the neuron most, and $z$ measures how well an input matches it. A sigmoid neuron trained to separate anatase from rutile over the whole spectrum tends to learn weights that look like a difference spectrum: positive near the anatase bands at 144, 197, 399, 513 and 639 cm⁻¹, negative near the rutile bands at 447 and 612 cm⁻¹, and close to zero where neither phase scatters.

The template picture also explains a common failure. Suppose every anatase sample in the training library happened to be measured on one instrument whose spectra carry a sloping fluorescence background. The neuron cannot know that the slope is irrelevant; it learns the slope as part of the anatase template, and later calls any spectrum with a similar background anatase. The practical defence is to plot the learned weight vector as if it were a spectrum. Weight that sits on features with no physical origin, such as a smooth baseline, an edge of the detector or a single noisy channel, is a sign that the classifier has learned the measurement rather than the material. Baseline subtraction and normalisation before training remove the most common culprits.

## The activation function

The activation turns the weighted sum into a response. The common choices, all in the lab:

| Name | Formula | Shape | Used for |
|---|---|---|---|
| step | $1$ if $z \ge 0$, else $0$ | a cliff | the original perceptron; cannot be trained by gradients |
| sigmoid | $\dfrac{1}{1+e^{-z}}$ | smooth S from 0 to 1 | outputs that are probabilities |
| tanh | $\dfrac{e^{z}-e^{-z}}{e^{z}+e^{-z}}$ | smooth S from −1 to 1 | hidden layers; interatomic potentials |
| ReLU | $\max(0, z)$ | zero, then a ramp | hidden layers of most image models; smooth variants such as GELU in language models |

Why not leave the activation out? Then $y = \mathbf w\cdot\mathbf x + b$ is just linear regression ([the chapter on fitting](../learning-from-data/)), and, as later chapters show, stacking any number of linear neurons still gives only a linear function. The bend in the activation is what lets networks of neurons represent curved relationships. Why smooth curves rather than the step? Because learning, the subject of [the next chapter](../how-a-neuron-learns/), works by nudging the weights in the direction that improves the output, and a step function gives no hint of which direction that is: its slope is zero everywhere except at the cliff.

{{< fig src="activations.svg" alt="Left, the step, sigmoid, tanh and ReLU activation functions against the weighted sum z. Right, their slopes, with the regions where the sigmoid is saturated shaded grey and a point marking the sigmoid slope at z equal to 10" caption="Left: the four common activations. Right: their slopes, which carry the learning signal. A sigmoid's slope never exceeds 0.25 and is below 0.007 once $|z|$ exceeds 5 (shaded); at $z = 10$, the 1000 K example in the warning below, it is $4.5\times10^{-5}$. A ReLU passes a slope of exactly 1 whenever it is active and 0 otherwise." >}}

### Why the sigmoid's slope is so simple

Differentiate $\sigma(z) = (1 + e^{-z})^{-1}$ and rearrange:

$$
\sigma'(z) = \frac{e^{-z}}{(1+e^{-z})^2} = \frac{1}{1+e^{-z}}\cdot\frac{e^{-z}}{1+e^{-z}} = \sigma(z)\,\big[1-\sigma(z)\big].
$$

The slope is the output times its complement. It can be computed from the forward value with no further exponential, it peaks at $1/4$ at $z = 0$, and it falls as $e^{-|z|}$ in both tails, which is the saturation shown in the figure. The hyperbolic tangent is not a different idea: $\tanh(z) = 2\sigma(2z) - 1$, a sigmoid stretched to the range $(-1, 1)$ and made twice as steep, with slope $1 - \tanh^2 z$, at most 1. Because its output is centred on zero, a layer of tanh neurons hands roughly centred inputs to the next layer, which is why Yann LeCun and co-workers, in their 1998 guide *Efficient BackProp*, recommended it over the sigmoid for hidden layers.

{{< note type="practice" title="From the lab: choosing activations for a materials model" >}}
- **Probability output** (stable or unstable, phase A or B): sigmoid; for several classes, its generalisation, the softmax.
- **Unbounded output** (formation energy in eV per atom, a free-energy difference): no activation at all. A sigmoid output would cap every prediction at 1.
- **Positive output** (a band gap, a variance, a diffusion coefficient): softplus, $\ln(1 + e^{z})$, or predict the logarithm of the quantity.
- **Hidden layers of a property model or classifier**: ReLU or a smooth relative such as GELU.
- **Hidden layers of an interatomic potential**: smooth activations only. Behler and Parrinello used tanh in 2007; NequIP and MACE use SiLU, $z\,\sigma(z)$. Forces are $-\partial E/\partial \mathbf r$, so an energy with ReLU kinks gives forces that jump whenever a neuron switches on or off, which spoils energy conservation in [molecular dynamics](../molecular-dynamics/) and makes curvatures, needed for phonons, unreliable.
{{< /note >}}

{{< note type="warn" title="Saturated neurons" >}}
A sigmoid responds only in a window of roughly $-5 < z < 5$. Outside it the output is pinned near 0 or 1, and its slope, $\sigma(z)\,[1-\sigma(z)]$, is almost zero. Feed a neuron a raw temperature of 1000 K with a modest weight of 0.01 and $z = 10$: the output is 0.99995 and the slope is $4.5\times10^{-5}$, so the neuron cannot tell 1000 K from 1200 K, and any learning signal that must pass back through that slope, as it does in squared-error training and in the hidden layers of a network, is all but switched off. Standardise the inputs (subtract the mean, divide by the standard deviation) so that typical values of $z$ fall where the activation actually bends.
{{< /note >}}

## A neuron as a logic gate, and its limit

With suitable weights a single step-function neuron can compute simple logic. With inputs 0 or 1:

- **AND**: $w_1 = w_2 = 1$, $b = -1.5$. Only $(1, 1)$ gives $z > 0$.
- **OR**: $w_1 = w_2 = 1$, $b = -0.5$. Any single 1 suffices.
- **NOT** (one input): $w = -1$, $b = 0.5$.

{{< note type="try" >}}
Build the AND neuron in the lab. Choose the **Step** activation and set $w_1 = w_2 = 1$ and $b = -1.5$. Drag the white point to the four corners $(0,0)$, $(1,0)$, $(0,1)$ and $(1,1)$: only the last lands on the orange side. Raise the bias to $-0.5$ and the same neuron computes OR. Then spend a minute hunting for weights that give XOR.
{{< /note >}}

But no choice of weights computes **XOR** (output 1 when exactly one input is 1). Plot the four corners: $(0,1)$ and $(1,0)$ must be on one side of the line, $(0,0)$ and $(1,1)$ on the other, and no straight line does that. Minsky and Papert's 1969 book *Perceptrons* made this limitation famous, and it contributed to a long decline of interest in neural networks. The way out, layers of neurons, is the subject of the chapter after next, where you will watch a small network solve XOR by bending the plane.

{{< fig src="logic-gates.svg" alt="Three panels showing the four corners of the unit square. AND and OR are separated by straight lines with the weight vector drawn as an arrow; in the XOR panel the best straight line leaves one corner, ringed in pink, on the wrong side" caption="Step neurons on the four corners of the unit square, with orange shading where $z \ge 0$ and the weight vector as a teal arrow. AND and OR share the weights $(1, 1)$ and differ only in the bias, which slides the same line. For XOR, the best any line achieves is three corners out of four: OR's line misclassifies $(1, 1)$, ringed." >}}

The picture has a short algebraic counterpart. Suppose some $w_1$, $w_2$, $b$ computed XOR with a step activation. The corner $(0,0)$ must give 0, so $b < 0$; the corner $(1,1)$ must give 0, so $w_1 + w_2 + b < 0$; the corners $(1,0)$ and $(0,1)$ must give 1, so $w_1 + b \ge 0$ and $w_2 + b \ge 0$. Adding the last two inequalities gives $w_1 + w_2 + b \ge -b$, and $-b$ is positive, which contradicts the second. No activation function rescues the neuron, because every activation turns the same sign of $z$ into the same decision.

You need not trust the picture; you can search. The cell below tries every neuron whose two weights and bias lie on a grid from −3 to 3 in steps of 0.1, about 227,000 neurons in all, and counts how many reproduce each truth table.

{{< py title="search for an XOR neuron" >}}
import numpy as np
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])        # the four corners
targets = {"AND": [0, 0, 0, 1], "OR": [0, 1, 1, 1],
           "NAND": [1, 1, 1, 0], "XOR": [0, 1, 1, 0]}

g = np.linspace(-3, 3, 61)                             # every weight and bias in steps of 0.1
w1, w2, b = np.meshgrid(g, g, g, indexing="ij")
z = w1[..., None] * X[:, 0] + w2[..., None] * X[:, 1] + b[..., None]
out = (z >= 0).astype(int)                            # step activation: one row per neuron
margin = np.abs(z).min(axis=-1) / np.hypot(w1, w2).clip(1e-9)   # distance of nearest corner

for name, t in targets.items():
    ok = np.all(out == np.array(t), axis=-1)
    line = f"{name:4s}: {ok.sum():5d} of {ok.size} neurons work"
    if ok.any():                                      # show the one with the widest margin
        i, j, k = np.unravel_index(np.argmax(np.where(ok, margin, -1)), ok.shape)
        line += f", widest margin at w = ({g[i]:.1f}, {g[j]:.1f}), b = {g[k]:.1f}"
    print(line)
{{< /py >}}

AND, OR and NAND each have thousands of solutions, and the widest-margin solution the search reports is the hand-picked neuron from the list above multiplied by a constant: 1 for AND, 3 for OR, and 2 for NAND with $w_1 = w_2 = -1$, $b = 1.5$. Multiplying every weight and the bias by a positive constant never changes a step neuron's output. XOR has no solutions at all, and no finer grid would find one, because the obstacle is geometric rather than numerical.

{{< note type="fun" >}}
One neuron cannot compute XOR, but it can compute NAND, “not both”, and NAND is *universal*: every digital circuit, including every processor, can be built from NAND gates alone. Networks of step-function neurons can therefore compute any Boolean function whatsoever. XOR itself needs only three: OR and NAND side by side, with AND on top. Representing a function was never the problem; finding the weights was.
{{< /note >}}

## A neuron in science

A single neuron with a sigmoid output is exactly **logistic regression**, one of the most used models in science: will this compound be stable or not, is this spectrum from phase A or B. Its weights are directly interpretable as the influence of each feature. A neuron with no activation is linear regression. Everything more powerful is built by connecting many of them.

{{< note type="practice" title="From the lab: labelling atoms as solid or liquid" >}}
Simulations of crystallisation need a label for every atom in every frame: crystal or melt? A common recipe computes for each atom a few local order parameters, such as the bond-orientational parameters $q_4$ and $q_6$ of Paul Steinhardt, David Nelson and Marco Ronchetti (1983), averaged over its neighbours. Short runs of the pure crystal and the pure liquid at the temperature of interest supply labelled examples, and a single sigmoid neuron fitted to them gives every atom a probability of being crystalline. Applied to a run in which a nucleus grows from the melt, atoms near 0.5 mark the interface, and counting atoms above 0.5 gives the nucleus size frame by frame, a standard reaction coordinate for nucleation. Two checks matter. The training runs must be at the production temperature, because thermal motion broadens both distributions and shifts the best boundary. And the error rate on held-out frames of pure liquid sets a floor: misclassifying 0.1% of liquid atoms in a box of 100,000 creates 100 phantom solid atoms per frame, enough to swamp a small nucleus. Where one cut is not enough, for example to tell fcc from hcp from bcc environments, small networks take over, as in the work of Philipp Geiger and Christoph Dellago (2013).
{{< /note >}}

### Reading the output as odds

The sigmoid has a precise interpretation that explains why logistic regression is so popular in science. Invert it: if $y = \sigma(z)$, then

{{< eq title="The logit" say="The weighted sum is the logarithm of the odds that the label is 1." >}}
$$ \textcolor{#d4a017}{z} = \ln\frac{\textcolor{#f08c2e}{y}}{1-\textcolor{#f08c2e}{y}} = \textcolor{#12a594}{\mathbf w}\cdot\textcolor{#4c6ef5}{\mathbf x} + \textcolor{#845ef7}{b} $$
- $\textcolor{#f08c2e}{y}/(1-\textcolor{#f08c2e}{y})$: the odds, for example 3 when the probability is 0.75
- $\textcolor{#d4a017}{z}$: the log-odds, also called the logit
{{< /eq >}}

Each weight therefore has a direct meaning: raising $x_j$ by one unit adds $w_j$ to the log-odds, which multiplies the odds by $e^{w_j}$. A weight of 0.7 doubles the odds per unit of its feature ($e^{0.7} \approx 2.01$), and a weight of −0.7 halves them. In the anatase example, raising the 144 cm⁻¹ intensity by 0.1 adds 0.4 to the log-odds and multiplies the odds of anatase by $e^{0.4} \approx 1.49$. The bias is the log-odds when every input is zero, so with centred inputs it carries the base rate: if 90% of the samples in a library are rutile, a bias near $\ln(0.1/0.9) \approx -2.2$ is a sensible starting point.

### One cut, or two?

A single neuron is also a quick test of whether a classification problem is easy. Goldschmidt's tolerance factor (1926), $t = (r_A + r_O)/[\sqrt2\,(r_B + r_O)]$, computed from the ionic radii of a compound ABO₃, is a classic descriptor for perovskite formation: perovskites typically form when $t$ lies between about 0.8 and 1.0. Look at the shape of that rule. One neuron fed with $t$ can say “$t$ is above 0.8” or “$t$ is below 1.0”, but not both, because the perovskites sit in a window with non-perovskites on either side: one cut too few. Two neurons, one for each edge, combined by a third, solve it, which is the same move that solves XOR. Concretely, neuron A, $\sigma(40(t - 0.8))$, says “$t$ is above 0.8”; neuron B, $\sigma(40(1.0 - t))$, says “$t$ is below 1.0”; and an output neuron $\sigma(20A + 20B - 30)$ fires only when both do. At $t = 0.9$ both hidden neurons give 0.982 and the output is 0.9999; at $t = 1.1$ neuron B gives 0.018 and the output falls to $6.5\times10^{-5}$.

{{< fig src="window.svg" alt="Two dashed sigmoid curves along the tolerance factor, one rising at 0.8 and one falling at 1.0, and a solid orange curve that is high only between 0.8 and 1.0" caption="Two hidden neurons each make one cut along the tolerance factor; a third neuron that fires only when both do turns the two cuts into a window between $t = 0.8$ and $t = 1.0$. The weights are those given in the text." >}}

The rule that a good solar absorber needs a band gap neither too small nor too large has the same window shape. When a problem looks like this, a hidden layer is not a luxury.

{{< note type="warn" title="Reading weights as importance" >}}
It is tempting to read the largest weight as the most important feature. That is meaningful only if the features share a scale: the weight on a lattice constant measured in metres is $10^{10}$ times the weight on the same lattice constant in ångströms, for an identical model. Standardise the inputs first. Even then, strongly correlated features can share or trade their weight almost arbitrarily: two nearly identical descriptors may receive weights of +5 and −4 that mean nothing individually.
{{< /note >}}

{{< note type="key" >}}
- A neuron computes a weighted sum of its inputs plus a bias, $z = \mathbf w\cdot\mathbf x + b$, and passes it through a nonlinear activation, $y = \sigma(z)$.
- Geometrically, it cuts input space with a flat boundary perpendicular to $\mathbf w$; the bias moves it and $\lVert\mathbf w\rVert$ sets its sharpness.
- For a sigmoid neuron the weighted sum is the log-odds of its prediction, so each weight multiplies the odds by $e^{w_j}$ per unit of its input.
- The weight vector is a template: $z$ measures how well an input matches it, and its confidence grows with distance from the boundary, not with closeness to the training data.
- One neuron can only separate classes that a straight cut can separate: XOR, or any window-shaped rule, is impossible without layers.
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
- q: "A logistic-regression neuron has a weight of 1.1 on a standardised feature. Raising that feature by one standard deviation multiplies the odds of class 1 by about"
  options: ["1.1", "3", "0.33"]
  answer: 1
  why: "The weighted sum is the log-odds, so adding 1.1 to it multiplies the odds by $e^{1.1} \\approx 3.0$."
- q: "Which weights and bias make a step-function neuron compute NAND, which outputs 0 only when both inputs are 1?"
  options: ["$w_1 = w_2 = 1$, $b = -1.5$", "$w_1 = w_2 = -1$, $b = 1.5$", "$w_1 = 1$, $w_2 = -1$, $b = 0$"]
  answer: 1
  why: "With $w_1 = w_2 = -1$ and $b = 1.5$ the four corners give $z = 1.5, 0.5, 0.5, -0.5$, so only $(1,1)$ produces 0. The first option is AND."
- q: "The anatase neuron ($w_1 = 4$, $w_2 = -4$, $b = 0$) receives a corrupted spectrum $(5, 0.1)$, far outside its training data. What does it report?"
  options: ["About 0.5, because the input is unfamiliar", "A probability of anatase within $10^{-8}$ of 1", "An error"]
  answer: 1
  why: "$z = 19.6$ and $\\sigma(19.6) = 1 - 3\\times10^{-9}$. A sigmoid's confidence grows with distance from the boundary; it has no notion of distance from the data."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. W. S. McCulloch and W. Pitts, “A logical calculus of the ideas immanent in nervous activity,” *Bulletin of Mathematical Biophysics* **5**, 115–133 (1943).
2. F. Rosenblatt, “The perceptron: a probabilistic model for information storage and organization in the brain,” *Psychological Review* **65**, 386–408 (1958).
3. M. Minsky and S. Papert, *Perceptrons: An Introduction to Computational Geometry*, MIT Press (1969).
4. G. Sanderson (3Blue1Brown), *Neural networks*, video series (2017–2024), 3blue1brown.com: chapter 1, “But what is a neural network?”
5. M. A. Nielsen, *Neural Networks and Deep Learning*, Determination Press (2015), chapter 1, free online.
6. C. M. Bishop, *Pattern Recognition and Machine Learning*, Springer (2006), §4.1 (discriminant functions) and §4.3.2 (logistic regression).
7. D. Beniaguev, I. Segev and M. London, “Single cortical neurons as deep artificial neural networks,” *Neuron* **109**, 2727–2739 (2021).
8. Y. LeCun, L. Bottou, G. B. Orr and K.-R. Müller, “Efficient BackProp,” in *Neural Networks: Tricks of the Trade*, Springer (1998).
9. J. Behler and M. Parrinello, “Generalized neural-network representation of high-dimensional potential-energy surfaces,” *Physical Review Letters* **98**, 146401 (2007).
10. P. J. Steinhardt, D. R. Nelson and M. Ronchetti, “Bond-orientational order in liquids and glasses,” *Physical Review B* **28**, 784–805 (1983).
11. P. Geiger and C. Dellago, “Neural networks for local structure detection in polymorphic systems,” *Journal of Chemical Physics* **139**, 164105 (2013).

</div>
