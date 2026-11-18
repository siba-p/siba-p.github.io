---
title: "Backpropagation"
description: "How a network learns which of its weights to blame: computational graphs, the chain rule as a relay of local derivatives, a full forward and backward pass with numbers, why reverse mode costs the same as one extra forward pass, and the history of the idea."
hook: "A network with a billion weights needs a billion derivatives at every training step. Backpropagation delivers all of them for about the cost of two or three forward passes, using nothing but the chain rule applied from the output backwards."
objectives:
  - "Write a calculation as a computational graph of forward rules and local derivatives"
  - "Compute every gradient of a small network by hand with a backward pass"
  - "Verify backpropagated gradients against central finite differences"
  - "Explain why reverse mode delivers all gradients for the cost of a few forward passes"
  - "Diagnose vanishing and exploding gradients and choose the standard cures"
cover: "cover.svg"
milestones:
  - year: 1960
    text: "Kelley computes optimal-control gradients by sweeping backwards in time"
  - year: 1970
    text: "Linnainmaa describes reverse-mode automatic differentiation in his master's thesis"
  - year: 1974
    text: "Werbos applies reverse-mode differentiation to neural networks in his PhD thesis"
  - year: 1986
    text: "Rumelhart, Hinton and Williams show backpropagation learns useful hidden representations"
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

A chain of currency exchanges is a good picture. If one euro buys 1.1 dollars and one dollar buys 80 rupees, then one euro buys $1.1 \times 80 = 88$ rupees: rates along a chain multiply. Each local derivative is an exchange rate between neighbouring nodes, quoting how much change in a node's output one unit of change in its input buys, and the gradient of the loss with respect to a weight is the rate along the whole chain from that weight to the loss.

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

## When paths branch, gradients add

The graph above is a single chain, but in a real network values are reused. Each input feeds every neuron of the first layer, and each hidden neuron feeds every neuron of the next. When a value influences the loss along several paths, the multivariable chain rule says that its gradient is the **sum** of the contributions sent back along each one:

{{< eq title="The chain rule at a branch" say="A value used in several places collects the gradient sent back by each of its uses and adds them up." >}}
$$ \bar{\textcolor{#4c6ef5}{u}} = \sum_{k} \bar{\textcolor{#f08c2e}{v}}_{\textcolor{#f08c2e}{k}}\;\frac{\partial \textcolor{#f08c2e}{v_k}}{\partial \textcolor{#4c6ef5}{u}} $$
- $\textcolor{#4c6ef5}{u}$: a value read by several later nodes
- $\textcolor{#f08c2e}{v_k}$: the nodes that read $u$ directly
- $\bar v_k = \partial L/\partial v_k$: the gradient already computed at each of them
{{< /eq >}}

A two-line check: let $u = 2$, $v_1 = u^2$, $v_2 = 3u$ and $L = v_1 + v_2$. The first path sends back $1 \times 2u = 4$, the second $1 \times 3 = 3$, and $\bar u = 7$, which is indeed $dL/du = 2u + 3$ at $u = 2$.

The sum rule has two everyday consequences. It is why the backward rule for a whole layer, below, contains the transposed weight matrix: input $x_j$ reaches neuron $i$ through weight $W_{ij}$, so $\bar x_j = \sum_i W_{ij}\,\bar z_i$, one term per path. And it is why a parameter used in many places, such as a convolution filter applied at every pixel or a [neural-network potential](../neural-network-potentials/) applied to every atom, simply collects the gradient from all of its uses.

{{< note type="warn" title="Gradients accumulate" >}}
Frameworks implement the sum rule literally: every backward pass **adds** into each parameter's `.grad` instead of overwriting it. That is what makes shared weights work, and it is why a PyTorch training loop calls `optimizer.zero_grad()` before every `loss.backward()`. Forget it and each step uses the sum of all the gradients computed so far, a bug that raises no error and shows up only as a model that trains strangely or diverges. Accumulating on purpose over several small batches, then stepping once, is a legitimate way to imitate a larger batch.
{{< /note >}}

## Why it is cheap: reverse mode

Notice what the backward pass did. Each node was visited once going forward and once coming back, and every parameter's gradient was produced along the way. **The cost of all the gradients together is a small multiple (typically two to three times) of the cost of computing the loss once**, whether the network has seven parameters or seventy billion.

Compare the obvious alternative: nudge each weight in turn and re-run the network to see how the loss changes (finite differences). That needs one extra forward pass *per parameter*, a million passes for a million weights. Backpropagation is a special case of **reverse-mode automatic differentiation**: for a function with many inputs (the weights) and one output (the loss), sweeping derivatives backwards from the output is the efficient direction. Forward-mode differentiation, which carries derivatives along with the values from the inputs, is efficient in the opposite situation, few inputs and many outputs; you will meet it in [differentiable molecular dynamics](../differentiable-md/).

In a real network each node is a whole layer, the values are vectors and the local derivatives are matrices, but nothing else changes. For a layer $\mathbf h = \sigma(\mathbf W\mathbf x + \mathbf b)$ the backward rules are:

{{< eq title="Backpropagation through a layer" say="Gradients flow back through the transpose of the same weights that carried the signal forward." >}}
$$ \bar{\mathbf z} = \bar{\mathbf h} \odot \sigma'(\mathbf z), \qquad \bar{\textcolor{#12a594}{\mathbf W}} = \bar{\mathbf z}\,\mathbf x^{\top}, \qquad \bar{\textcolor{#845ef7}{\mathbf b}} = \bar{\mathbf z}, \qquad \bar{\mathbf x} = \textcolor{#12a594}{\mathbf W}^{\top}\bar{\mathbf z} $$
- $\odot$: element-wise product
- $\bar{\mathbf x}$: the gradient handed back to the previous layer
{{< /eq >}}

{{< note type="practice" title="Back of the envelope" >}}
Count the multiply-adds of one dense layer with $n_{\text{in}}$ inputs, $n_{\text{out}}$ neurons and a batch of $B$ examples. The forward product $\mathbf W\mathbf x$ costs $B\,n_{\text{in}}\,n_{\text{out}}$. The backward pass needs two products of the same size, $\bar{\mathbf x} = \mathbf W^{\top}\bar{\mathbf z}$ and $\bar{\mathbf W} = \bar{\mathbf z}\,\mathbf x^{\top}$, so a training step costs about three forward passes, the origin of the “two to three times” above. In floating-point operations, two per multiply-add, training a network of $N$ parameters on $D$ examples (tokens, for a language model) therefore costs about $6ND$, the estimate Jared Kaplan and co-workers used in their 2020 scaling laws. For GPT-3, with 175 billion parameters trained on 300 billion tokens, that is $3\times10^{23}$ operations. Finite differences would multiply the forward cost by $2N$ instead of 3.
{{< /note >}}

The price of reverse mode is paid in memory rather than time. The backward rules need values from the forward pass, such as $h(1-h)$ and the $\mathbf x$ in $\bar{\mathbf W} = \bar{\mathbf z}\,\mathbf x^{\top}$, so every intermediate activation must be kept until the backward sweep reaches it. For large networks trained on large batches, these stored activations, not the weights, often fill the memory of the GPU. **Gradient checkpointing**, an old idea from the automatic-differentiation literature, trades some of that memory back for time: keep the activations of only some layers and recompute the others during the backward pass.

## A worked example: two inputs, two hidden neurons, one output

Here is the smallest network with every ingredient of a real one: two inputs, a hidden layer of two sigmoid neurons and a linear output, trained on a single example with $\mathbf x = (1, 0.5)$ and target $y = 1$. Its nine parameters start at

$$
\mathbf W = \begin{pmatrix} 0.5 & -0.3 \\ 0.8 & 0.2 \end{pmatrix}, \qquad \mathbf b = \begin{pmatrix} 0.1 \\ -0.1 \end{pmatrix}, \qquad \mathbf v = (1.2,\ -0.7), \qquad c = 0.2,
$$

with $\mathbf h = \sigma(\mathbf W\mathbf x + \mathbf b)$, $\hat y = \mathbf v\cdot\mathbf h + c$ and $L = (\hat y - y)^2$.

**Forward.** $z_1 = 0.5 - 0.15 + 0.1 = 0.45$ and $z_2 = 0.8 + 0.1 - 0.1 = 0.8$, so $h_1 = \sigma(0.45) = 0.6106$ and $h_2 = \sigma(0.8) = 0.6900$. Then $\hat y = 1.2 \times 0.6106 - 0.7 \times 0.6900 + 0.2 = 0.4498$, and $L = (0.4498 - 1)^2 = 0.3027$.

{{< note type="try" title="Pause and predict" >}}
Before reading the backward pass, predict the sign of $\partial L/\partial W_{21}$, the gradient for the weight from $x_1$ into hidden neuron 2. The prediction, 0.45, is too low for a target of 1, and neuron 2 reaches the output through $v_2 = -0.7$. The answer is in the table below.
{{< /note >}}

**Backward.** Start at the output, $\bar{\hat y} = 2(\hat y - y) = -1.1004$. The output parameters follow at once: $\bar c = -1.1004$, $\bar v_1 = \bar{\hat y}\,h_1 = -0.6720$ and $\bar v_2 = \bar{\hat y}\,h_2 = -0.7593$. Each hidden neuron receives $\bar h_i = \bar{\hat y}\,v_i$, multiplies it by its own sigmoid slope, and hands the result to its weights and bias:

| Hidden neuron | $\bar h_i$ | $h_i(1-h_i)$ | $\bar z_i = \bar b_i$ | $\bar W_{i1} = \bar z_i\,x_1$ | $\bar W_{i2} = \bar z_i\,x_2$ |
|---|---|---|---|---|---|
| 1 | −1.3205 | 0.2378 | −0.3140 | −0.3140 | −0.1570 |
| 2 | +0.7703 | 0.2139 | +0.1648 | +0.1648 | +0.0824 |

The signs tell a story. The prediction is too low, so every parameter should move to raise $\hat y$. Neuron 1 has a positive output weight, so it should become *more* active: its gradients are negative, and gradient descent, which subtracts them, increases its weights. Neuron 2 has a negative output weight, so it should become *less* active, and its gradients have the opposite sign. Nobody wrote that logic down; it falls out of the chain rule. Notice also that $\bar W_{i2}$ is half of $\bar W_{i1}$, because $x_2$ is half of $x_1$: a weight attached to a larger input gets more of the blame.

{{< fig src="worked-network.svg" alt="Diagram of a network with inputs x1 and x2, hidden neurons h1 and h2, output y-hat and loss L. Blue labels give forward values such as z equal 0.45 and h equal 0.6106; pink labels give backward gradients such as dL/dz equal minus 0.3140; edges are labelled with their weights" caption="The worked example as a graph. Blue: values computed left to right in the forward pass. Pink: gradients $\partial L/\partial(\cdot)$ computed right to left, each from its right-hand neighbour times a local derivative. A weight's gradient is the $\partial L/\partial z$ of the neuron it enters times the input it carries; for example $\partial L/\partial W_{12} = -0.3140 \times 0.5 = -0.1570$." >}}

### Gradients with respect to the inputs

The backward pass need not stop at the weights. The last rule for a layer, $\bar{\mathbf x} = \mathbf W^{\top}\bar{\mathbf z}$, gives the gradient of the loss with respect to the network's inputs for one more matrix product. In the worked example, $\bar x_1 = 0.5\times(-0.3140) + 0.8\times0.1648 = -0.0252$ and $\bar x_2 = -0.3\times(-0.3140) + 0.2\times0.1648 = +0.1271$, the values at the left of the figure. Raising $x_1$ would lower the loss slightly; raising $x_2$ would raise it five times as fast. Each input reaches the loss along two paths, one through each hidden neuron, and for $x_1$ the two contributions, $-0.157$ and $+0.132$, nearly cancel: the sum rule at work.

Input gradients have three uses in science. For a classifier they form a **sensitivity map**, showing which channels of a spectrum or pixels of a micrograph the prediction depends on, which is a quick test of whether the model looks at the physics or at an artefact. For a property model they point to the change of input that would improve the property most, the first step of gradient-based inverse design ([differentiable simulation](../differentiable-md/)). And for an interatomic potential they are the forces.

{{< note type="practice" title="From the lab: forces for free" >}}
An interatomic potential maps the $3N$ coordinates of $N$ atoms to one number, the energy. Forces, $\mathbf F = -\partial E/\partial \mathbf r$, are the gradient of one output with respect to many inputs, exactly the case reverse mode is built for: one backward pass after the energy delivers all $3N$ components, whether the system has 10 atoms or 100,000. SchNet, NequIP, MACE and most modern [message-passing potentials](../message-passing-potentials/) obtain forces this way, which guarantees that they are the exact gradient of the energy and that molecular dynamics with them conserves energy. Training on forces adds a twist: the loss now contains a gradient, so the parameter update needs the derivative of a derivative. Frameworks support this “double backpropagation” (in PyTorch, `create_graph=True` when computing the forces), and it makes a force-trained step noticeably more expensive than an energy-only one. A common bug is to compute forces under `torch.no_grad()` or from a detached graph during training: the force error then cannot reach the weights, the force loss stays flat, and no error is raised.
{{< /note >}}

One step of gradient descent with learning rate 0.2 moves all nine parameters at once and lowers the loss from 0.3027 to 0.0082. The cell below repeats the whole calculation and checks each of the nine gradients against a **central finite difference**, $[L(\theta_k + \epsilon) - L(\theta_k - \epsilon)]/2\epsilon$ with $\epsilon = 10^{-6}$, which costs two extra evaluations of the loss per parameter. The two agree to about one part in $10^9$. Set `eta = 0.5` and the same step overshoots: the loss rises to 0.364.

{{< py title="Backpropagation checked by finite differences" >}}
import numpy as np
x = np.array([1.0, 0.5]); y = 1.0                   # one training example
sig = lambda z: 1 / (1 + np.exp(-z))

def loss_and_grad(t):                               # t holds all 9 parameters
    W, b, v, c = t[:4].reshape(2, 2), t[4:6], t[6:8], t[8]
    z = W @ x + b; h = sig(z); yhat = v @ h + c     # forward pass
    g_yhat = 2 * (yhat - y)                         # backward pass
    g_z = g_yhat * v * h * (1 - h)
    grad = np.concatenate([np.outer(g_z, x).ravel(), g_z, g_yhat * h, [g_yhat]])
    return (yhat - y) ** 2, grad

t = np.array([0.5, -0.3, 0.8, 0.2, 0.1, -0.1, 1.2, -0.7, 0.2])
L, g = loss_and_grad(t)
eps = 1e-6                                          # central finite differences
fd = np.array([(loss_and_grad(t + eps * e)[0] - loss_and_grad(t - eps * e)[0]) / (2 * eps)
               for e in np.eye(9)])
print(f"loss {L:.4f}")
for n, a, b in zip(["W11", "W12", "W21", "W22", "b1", "b2", "v1", "v2", "c"], g, fd):
    print(f"{n:3s}  backprop {a:+.6f}   finite difference {b:+.6f}")
print("largest relative difference", np.max(np.abs(g - fd) / np.abs(g)))
eta = 0.2                                           # learning rate for one gradient-descent step
print(f"loss after one step with learning rate {eta}: {loss_and_grad(t - eta * g)[0]:.4f}")
{{< /py >}}

{{< note type="practice" title="Checking gradients" >}}
- Use **central** differences, whose error shrinks as $\epsilon^2$, not one-sided ones, whose error shrinks only as $\epsilon$.
- Work in double precision with $\epsilon$ between about $10^{-6}$ and $10^{-4}$. Smaller is not better: the rounding error in $L(\theta + \epsilon) - L(\theta - \epsilon)$ grows as $\epsilon$ shrinks.
- Compare **relative** errors, $|g_{\text{bp}} - g_{\text{fd}}| / \max(|g_{\text{bp}}|, |g_{\text{fd}}|)$. Values near $10^{-7}$ or below mean the gradient is right; for a smooth loss in double precision, $10^{-3}$ or more almost always means a bug.
- Check a tiny network on a few data points, switch off randomness such as dropout, and remember that a kink (ReLU at zero) between $\theta - \epsilon$ and $\theta + \epsilon$ can make a correct gradient fail the test.
{{< /note >}}

{{< fig src="fd-error.svg" alt="Log-log plot of relative error against step size epsilon for one-sided and central finite differences of dL/dW11. Both errors fall as epsilon shrinks until rounding error takes over, below about 10 to the minus 5 for central and 10 to the minus 8 for one-sided differences; a band from 10 to the minus 6 to 10 to the minus 4 is shaded" caption="Relative error of finite-difference estimates of $\partial L/\partial W_{11}$ in the worked example. Truncation error falls as $\epsilon$ for one-sided and $\epsilon^2$ for central differences, until rounding error, growing as $1/\epsilon$, takes over. Central differences reach $2\times10^{-12}$ near $\epsilon = 10^{-5}$ and are better than $10^{-9}$ everywhere in the recommended band; one-sided differences never do better than about $10^{-8}$." >}}

## Vanishing and exploding gradients

The backward pass multiplies many factors together, one per layer. If they are typically smaller than 1, the gradient shrinks exponentially with depth and early layers stop learning (**vanishing gradients**); if larger than 1, it grows exponentially (**exploding gradients**). The sigmoid's derivative is at most 0.25, so deep sigmoid networks suffered badly. The cures are now standard: activations whose slope does not shrink (ReLU and its relatives), careful initialisation of the weights ([the practical chapter](../neural-networks/)), normalisation layers, and **residual connections** $\mathbf h^{(l+1)} = \mathbf h^{(l)} + f(\mathbf h^{(l)})$, which give the gradient a direct path backwards through every layer.

### How fast is exponential?

Take the most favourable case for a sigmoid network: a chain of single neurons, every weight equal to 1, every neuron sitting at $z = 0$ where the sigmoid is steepest. Each layer multiplies the backward signal by $1 \times 0.25$. After 10 layers the gradient reaching the first weight is $0.25^{10} \approx 9.5\times10^{-7}$ of the gradient at the output; after 20 layers it is $0.25^{20} \approx 9.1\times10^{-13}$. An update that small, added to a weight of order 1, vanishes completely in single-precision arithmetic, which resolves only about seven significant figures. In a real network the factor per layer involves a whole weight matrix and the slopes of many neurons, so it can be larger or smaller than 0.25, but the exponential dependence on depth is the same.

The figure below measures the effect in a network rather than a chain: 30 layers of 100 neurons, random weights with variance $1/100$ for sigmoid and tanh (the scaling recommended by Xavier Glorot and Yoshua Bengio in 2010) and $2/100$ for ReLU (the scaling of Kaiming He and co-workers, 2015), and a batch of 64 random inputs. By the first layer the sigmoid network's gradient has shrunk by a factor of about $2\times10^{18}$, or 0.23 per layer, close to the idealised 0.25. With tanh, whose slope at zero is 1, the gradient loses a factor of only about 8 over the 30 layers, and with ReLU and He's scaling it stays within a factor of 1.3 of its value at the top. The activation and the initialisation, chosen together, decide whether a deep network can be trained at all.

{{< fig src="vanishing.svg" alt="Two log-scale panels. Left, gradient relative to the output against number of layers for factors of 0.25, 1 and 1.5 per layer, with a dashed line at the float32 precision of 1.2 times 10 to the minus 7. Right, measured gradient norms in a 30-layer network: sigmoid falls to about 10 to the minus 18 at the first layer while tanh and ReLU stay near 1" caption="Left: the idealised chain of the text, with factors of 0.25, 1 and 1.5 per layer; the dots mark $0.25^{10} \approx 10^{-6}$ and $0.25^{20} \approx 10^{-12}$, and below the dashed line an update is lost against a weight of order 1 in single precision. Right: gradient norms measured layer by layer in a random 30-layer network of width 100. Sigmoid loses about 0.23 per layer; tanh and ReLU with variance-preserving initialisation lose a factor of 8 and 1.3 in total." >}}

Exploding gradients are the mirror image: if each layer multiplies the signal by 1.5, twenty layers amplify it by $1.5^{20} \approx 3300$, and a single update can throw the weights so far that the loss becomes `NaN`. Sepp Hochreiter analysed the problem in his 1991 diploma thesis in Munich, and Yoshua Bengio, Patrice Simard and Paolo Frasconi showed in 1994 why it makes long-range dependencies so hard to learn in recurrent networks, which are effectively very deep in time.

Each standard cure attacks one factor of the product. A ReLU has slope exactly 1 wherever it is active, so it passes the gradient back undiminished, although a neuron stuck in its flat region passes back nothing at all (a "dead" ReLU). A residual block has local derivative $\mathbf I + \partial f/\partial\mathbf h$, so even when $f$'s own slope is tiny the identity carries the gradient straight through. Careful initialisation keeps each weight matrix close to preserving the size of the signal. And exploding gradients are commonly tamed by **gradient clipping**, used by Razvan Pascanu, Tomas Mikolov and Bengio for recurrent networks in 2013: if the norm of the gradient exceeds a threshold, it is scaled down to that threshold before the update.

{{< note type="try" >}}
Vanishing gradients appear even in the lab's single hidden neuron. Set the input $x$ to 3 and the weight $w_1$ to 3, so that $z = 8.6$ and the sigmoid is saturated, with slope $h(1-h) \approx 1.8\times10^{-4}$. The backpropagated $\partial L/\partial w_1$ drops from 0.665 to about 0.0017, roughly 1400 times smaller than $\partial L/\partial w_2$. Press **Update the weights** a few times: $w_2$ and $b_2$ move at once, while $w_1$ barely changes.
{{< /note >}}

## A short history

Reverse-mode differentiation was described by Seppo Linnainmaa in his 1970 master's thesis, applied to neural networks by Paul Werbos in his 1974 doctoral thesis, and popularised by David Rumelhart, Geoffrey Hinton and Ronald Williams in a 1986 *Nature* paper, which showed that hidden layers trained this way learn useful internal representations. The same backward recursion had already appeared in optimal control, where Henry Kelley (1960) and Arthur Bryson (1961) computed gradients for problems such as optimal flight paths by sweeping backwards in time; engineers and weather forecasters know it as the **adjoint method**. Today every deep-learning framework (PyTorch, JAX, TensorFlow) builds the computational graph as your code runs and performs the backward pass automatically when you call `loss.backward()`.

{{< note type="warn" title="Myth" >}}
**Myth:** backpropagation is a learning algorithm. **Reality:** it computes derivatives and knows nothing about learning. The update that uses them is a separate choice, plain gradient descent, momentum or Adam, and the same backward pass also computes forces in a potential, sensitivities in inverse design and adjoint gradients in weather forecasting. Whether the brain does anything similar is an open question. A biological synapse has no known way to read the forward weights of the neurons downstream of it, which reverse mode needs in every $\mathbf W^{\top}$, the so-called weight-transport problem. In 2016 Timothy Lillicrap and co-workers showed that networks still learn when the backward pass uses fixed random matrices in place of $\mathbf W^{\top}$, an effect they called feedback alignment.
{{< /note >}}

{{< note type="key" >}}
- A network is a computational graph; each node needs only its forward rule and its local derivative.
- Backpropagation sends $\partial L/\partial(\text{node})$ from the loss back to the inputs, multiplying by local derivatives: the chain rule, evaluated from the right.
- All gradients together cost about as much as a couple of forward passes, which is why networks with billions of parameters can be trained at all. The price is memory: forward values must be stored for the backward sweep.
- Where a value feeds several nodes, the gradients from each path add. This is why gradients flow back through $\mathbf W^{\top}$ and why frameworks accumulate `.grad`.
- Verify a hand-written backward pass against central finite differences; relative errors near $10^{-7}$ mean it is right.
- The same backward pass gives gradients with respect to the inputs: sensitivity maps for classifiers and forces for interatomic potentials, at the cost of one more matrix product per layer.
- Gradients are products of one factor per layer, so they vanish or explode exponentially with depth; ReLU, residual connections, careful initialisation and clipping keep the factors near 1.
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
- q: "An input $x$ feeds two hidden neurons. The backward pass sends back $0.3$ along one path and $-0.1$ along the other. What is $\\partial L/\\partial x$?"
  options: ["0.3, the larger contribution", "0.2, the sum", "−0.03, the product"]
  answer: 1
  why: "When a value influences the loss along several paths, the multivariable chain rule adds the contributions from each path."
- q: "In a chain of 10 sigmoid layers, every weight 1 and every neuron at its steepest point, by what factor is the gradient at the first layer smaller than at the output?"
  options: ["About 4", "About 1000", "About a million"]
  answer: 2
  why: "Each layer contributes a factor $\\sigma'(0) = 0.25$, and $0.25^{10} \\approx 10^{-6}$. Away from the steepest point the factors are even smaller."
- q: "A PyTorch training loop calls `loss.backward()` and `optimizer.step()` but never `optimizer.zero_grad()`. What happens?"
  options: ["PyTorch raises an error", "Each step uses the sum of all gradients computed so far, so training behaves strangely", "The gradients are zero and nothing is learned"]
  answer: 1
  why: "Backward passes add into `.grad`, which is what makes shared weights work. Without zeroing, gradients from earlier steps pile up silently."
- q: "An interatomic potential computes the energy of 10,000 atoms. How many backward passes does reverse mode need to give all the forces?"
  options: ["One", "30,000, one per coordinate", "10,000, one per atom"]
  answer: 0
  why: "The energy is one output and the $3N$ coordinates are inputs. Reverse mode delivers the gradient of one output with respect to all inputs in a single backward sweep."
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
9. Y. Bengio, P. Simard and P. Frasconi, “Learning long-term dependencies with gradient descent is difficult,” *IEEE Transactions on Neural Networks* **5**, 157–166 (1994).
10. R. Pascanu, T. Mikolov and Y. Bengio, “On the difficulty of training recurrent neural networks,” *Proceedings of ICML*, PMLR 28, 1310–1318 (2013).
11. A. Griewank and A. Walther, *Evaluating Derivatives: Principles and Techniques of Algorithmic Differentiation*, 2nd ed., SIAM (2008), including checkpointing.
12. J. Kaplan *et al.*, “Scaling laws for neural language models,” arXiv:2001.08361 (2020).
13. X. Glorot and Y. Bengio, “Understanding the difficulty of training deep feedforward neural networks,” *Proceedings of AISTATS*, PMLR 9, 249–256 (2010).
14. K. He, X. Zhang, S. Ren and J. Sun, “Delving deep into rectifiers: surpassing human-level performance on ImageNet classification,” *Proceedings of ICCV*, 1026–1034 (2015).
15. T. P. Lillicrap, D. Cownden, D. B. Tweed and C. J. Akerman, “Random synaptic feedback weights support error backpropagation for deep learning,” *Nature Communications* **7**, 13276 (2016).

</div>
