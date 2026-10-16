---
title: "Neural networks in practice"
description: "Neurons, layers and activation functions; why networks can approximate any smooth function; backpropagation derived with the chain rule; and the choices that matter when the output is an energy whose derivative is a force."
track: ml
weight: 4
level: Core
minutes: 55
lab: "Train a network live and watch its neurons"
prereqs: ["backpropagation", "gradient-descent"]
---

## From fixed features to learned features

A linear model predicts with fixed features: $\hat y = \sum_k w_k\,\phi_k(x)$. Someone has to choose the $\phi_k$, and for a complex relationship (the energy of a configuration of 200 atoms, say) nobody knows the right ones. A **neural network** keeps the same form but makes the features themselves adjustable:

$$
\hat y(x) = \sum_{k=1}^{H} v_k\,\sigma\big(w_k x + b_k\big) + c .
$$

Each term is a **neuron**: it takes a weighted sum of its inputs, adds a bias, and passes the result through a fixed nonlinear **activation function** $\sigma$. The weights $w_k, b_k$ decide *where* and *how sharply* each neuron bends; the output weights $v_k$ decide how much each one contributes. Everything is fitted together by gradient descent. This is a network with one **hidden layer** of $H$ neurons, a *multilayer perceptron* (MLP).

{{< widget name="nn" title="Train a small network and watch what each neuron does" caption="Press Train. The thick curve is the network; the faint curves (one hidden layer only) are the contributions of individual neurons. Try 2 neurons, then 4, then 16 on the bond-energy curve; try ReLU on the same curve and switch the view to the slope; then try the step with tanh and with ReLU." >}}

With one tanh neuron the network can only draw one smooth step. Two neurons with opposite signs can draw a bump. Many bumps placed side by side can trace any curve, which is the intuition behind the theorem below. Watch the faint curves during training: the neurons move, stretch and flip until their sum matches the data.

## Layers, in matrix form

For a vector input $\mathbf x \in \mathbb R^{d}$, a layer with $H$ neurons computes

$$
\mathbf a = \sigma(\mathbf W\mathbf x + \mathbf b), \qquad \mathbf W \in \mathbb R^{H\times d},\ \mathbf b\in\mathbb R^{H},
$$

with $\sigma$ applied element-wise. A **deep** network stacks $L$ such layers, each feeding the next:

$$
\mathbf a^{(0)} = \mathbf x, \qquad \mathbf z^{(l)} = \mathbf W^{(l)}\mathbf a^{(l-1)} + \mathbf b^{(l)}, \qquad \mathbf a^{(l)} = \sigma\big(\mathbf z^{(l)}\big), \qquad \hat y = \mathbf W^{(L)}\mathbf a^{(L-1)} + \mathbf b^{(L)} .
$$

Without the nonlinearity the whole stack would collapse into a single linear map, $\mathbf W^{(L)}\cdots\mathbf W^{(1)}\mathbf x$, no more expressive than linear regression. The activation is what makes depth useful.

**Common activations.**

| Name | $\sigma(z)$ | Smooth? | Where it is used |
|---|---|---|---|
| tanh | $\tanh z$ | yes | classic MLPs; Behler–Parrinello potentials |
| ReLU | $\max(0, z)$ | no (kink at 0) | image and language models |
| SiLU (swish) | $z/(1+e^{-z})$ | yes | SchNet-style and equivariant interatomic potentials |
| softplus | $\ln(1+e^{z})$ | yes | some potentials and density models |

## Why networks can represent almost anything

The **universal approximation theorem** (Cybenko 1989; Hornik, Stinchcombe and White 1989) states that a network with a single hidden layer and a non-polynomial activation can approximate any continuous function on a bounded domain to any accuracy, given enough neurons. It is an existence result: it says nothing about how many neurons are needed, or whether gradient descent will find the weights. In practice, **depth** is far more efficient than width: functions with repeated structure, such as sums over many atoms, can need exponentially fewer neurons when represented by several layers.

## Backpropagation: the gradient for the price of one extra pass

Training needs $\partial L/\partial\theta$ for every weight. Consider a single data point and squared loss $L = (\hat y - y)^2$. The chain rule, applied from the output backwards, gives a recursion. Define the **error signal** of layer $l$ as $\boldsymbol\delta^{(l)} = \partial L/\partial\mathbf z^{(l)}$. Then

$$
\boldsymbol\delta^{(L)} = 2(\hat y - y), \qquad
\boldsymbol\delta^{(l)} = \Big(\mathbf W^{(l+1)\top}\boldsymbol\delta^{(l+1)}\Big) \odot \sigma'\big(\mathbf z^{(l)}\big),
$$

and the gradients with respect to the parameters of each layer are outer products of what flowed in and what flows back:

$$
\frac{\partial L}{\partial \mathbf W^{(l)}} = \boldsymbol\delta^{(l)}\,\mathbf a^{(l-1)\top}, \qquad \frac{\partial L}{\partial \mathbf b^{(l)}} = \boldsymbol\delta^{(l)} .
$$

{{< note type="math" title="Where the recursion comes from" >}}
$\mathbf z^{(l+1)} = \mathbf W^{(l+1)}\sigma(\mathbf z^{(l)}) + \mathbf b^{(l+1)}$, so $\partial z^{(l+1)}_i/\partial z^{(l)}_j = W^{(l+1)}_{ij}\,\sigma'(z^{(l)}_j)$. The chain rule gives $\delta^{(l)}_j = \sum_i \delta^{(l+1)}_i W^{(l+1)}_{ij}\sigma'(z^{(l)}_j)$, which is the matrix expression above. Likewise $\partial z^{(l)}_i/\partial W^{(l)}_{ij} = a^{(l-1)}_j$.
{{< /note >}}

The cost of the backward pass is about the same as the forward pass: each weight is touched once going forward and once coming back. So the gradient with respect to *all* parameters, whether there are ten or ten billion, costs roughly two to three forward evaluations. This is what made deep learning possible. The algorithm was popularised for neural networks by Rumelhart, Hinton and Williams (1986). It is a special case of **reverse-mode automatic differentiation**, which modern frameworks (PyTorch, JAX, TensorFlow) apply automatically to any program built from differentiable operations.

Here is the whole algorithm in NumPy, a one-hidden-layer network fitted to $\sin 3x$:

```python
import numpy as np

rng = np.random.default_rng(0)
x = np.linspace(-1, 1, 64)[:, None]               # inputs, shape (N, 1)
y = np.sin(3 * x)                                  # targets

H = 16                                             # hidden neurons
W1 = rng.normal(0, 1.0, (1, H)); b1 = np.zeros(H)
W2 = rng.normal(0, 1/np.sqrt(H), (H, 1)); b2 = np.zeros(1)
lr = 0.05

for step in range(5001):
    # forward pass
    z = x @ W1 + b1                    # (N, H) pre-activations
    a = np.tanh(z)                     # (N, H) activations
    yhat = a @ W2 + b2                 # (N, 1) output
    loss = np.mean((yhat - y) ** 2)
    # backward pass: chain rule, from the loss back to every weight
    d_yhat = 2 * (yhat - y) / len(x)   # dL/dyhat
    dW2 = a.T @ d_yhat;  db2 = d_yhat.sum(0)
    d_a = d_yhat @ W2.T                # dL/da
    d_z = d_a * (1 - a ** 2)           # tanh'(z) = 1 - tanh(z)^2
    dW1 = x.T @ d_z;     db1 = d_z.sum(0)
    # plain gradient-descent update
    W1 -= lr * dW1; b1 -= lr * db1; W2 -= lr * dW2; b2 -= lr * db2
    if step % 1000 == 0:
        print(f"step {step:5d}   loss {loss:.5f}")
```

The loss falls from 0.25 to 0.0044 in 5000 steps of plain gradient descent. The same network in PyTorch, where `loss.backward()` does the backward pass for you and Adam replaces the update, reaches $4\times10^{-6}$ in 2000 steps:

```python
import torch

torch.manual_seed(0)
x = torch.linspace(-1, 1, 64).unsqueeze(1)
y = torch.sin(3 * x)

model = torch.nn.Sequential(torch.nn.Linear(1, 16), torch.nn.Tanh(), torch.nn.Linear(16, 1))
opt = torch.optim.Adam(model.parameters(), lr=1e-2)

for step in range(2001):
    opt.zero_grad()
    loss = torch.mean((model(x) - y) ** 2)
    loss.backward()            # reverse-mode autodiff fills .grad for every parameter
    opt.step()
    if step % 500 == 0:
        print(f"step {step:5d}   loss {loss.item():.2e}")
```

## Initialisation and training in practice

- **Initial weights must be random**, or every neuron in a layer receives the same gradient and they stay identical forever. Their *scale* matters too: too large and tanh neurons saturate (their gradient vanishes); too small and the signal dies out through the layers. Glorot (Xavier) initialisation uses variance $1/d_{\text{in}}$ or $2/(d_{\text{in}}+d_{\text{out}})$ for tanh; He initialisation uses $2/d_{\text{in}}$ for ReLU. Press *New initial weights* in the lab: different starting points reach different, comparably good fits, a reminder that the loss surface of a network has many minima.
- **Standardise inputs and outputs**, for the conditioning reasons in [the gradient-descent lesson](../gradient-descent/).
- **Monitor a validation set** and stop or decay the learning rate when it stops improving ([the lesson on generalisation](../generalisation/)).

## When the output is an energy

In molecular science a network often predicts an energy $E$, and the forces are its negative gradient with respect to atomic positions, $\mathbf F_i = -\partial E/\partial\mathbf r_i$, obtained by the same automatic differentiation. That has consequences you can see in the lab.

- **The activation must be smooth.** A ReLU network is piecewise linear, so its derivative is piecewise *constant* and jumps at every kink. Train ReLU on the bond-energy curve, then switch the lab to *Slope dy/dx*: the energy fit can look good, but its slope, the force, is a staircase, and molecular dynamics with such forces does not conserve energy. Interatomic potentials use tanh, SiLU or similar smooth activations.
- **Fitting forces as well as energies** gives far more information per calculation: one DFT run of $N$ atoms yields one energy but $3N$ force components. This is the subject of [the lesson on interatomic potentials](../mlip/).
- **The step function** is a warning in the other direction: smooth networks round off discontinuities, and a network asked to fit one will overshoot (try tanh on the step with few neurons).

{{< quiz >}}
- q: "What would a deep network be equivalent to if every activation function were removed?"
  options: ["A deeper, more powerful network", "A single linear model", "A Gaussian process"]
  answer: 1
  why: "A composition of affine maps is affine: $\\mathbf W^{(2)}(\\mathbf W^{(1)}\\mathbf x + \\mathbf b^{(1)}) + \\mathbf b^{(2)}$ is again of the form $\\mathbf A\\mathbf x + \\mathbf c$. Nonlinear activations are what give depth its expressive power."
- q: "A network has 10 million parameters. Roughly how expensive is it to compute the gradient of the loss with respect to all of them by backpropagation?"
  options: ["About 10 million forward passes", "About two to three forward passes", "It cannot be computed exactly"]
  answer: 1
  why: "Reverse-mode automatic differentiation computes the full gradient of a scalar with a single backward pass whose cost is a small constant multiple of the forward pass, independent of the number of parameters."
- q: "Why are ReLU activations a poor choice for a network that predicts potential energy for molecular dynamics?"
  options: ["ReLU networks cannot fit energies", "The forces, the derivative of the energy, would be discontinuous", "ReLU is too slow to evaluate"]
  answer: 1
  why: "A ReLU network is piecewise linear, so its gradient (the force) jumps between constant values. Discontinuous forces break energy conservation in MD. Smooth activations such as tanh or SiLU give smooth forces."
- q: "All weights of a hidden layer are initialised to the same value. What happens during training?"
  options: ["Nothing unusual; gradient descent breaks the symmetry", "All neurons in the layer receive identical gradients and remain identical, so the layer acts like a single neuron", "Training diverges immediately"]
  answer: 1
  why: "Identical neurons compute identical outputs and receive identical error signals, so their updates are identical forever. Random initialisation breaks this symmetry."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. I. Goodfellow, Y. Bengio and A. Courville, *Deep Learning*, MIT Press (2016), chapter 6 (deep feedforward networks) and §6.5 (back-propagation).
2. C. M. Bishop, *Pattern Recognition and Machine Learning*, Springer (2006), chapter 5 (neural networks).
3. M. A. Nielsen, *Neural Networks and Deep Learning*, Determination Press (2015), free online at neuralnetworksanddeeplearning.com; chapter 4 gives a visual proof of universal approximation.
4. G. Cybenko, “Approximation by superpositions of a sigmoidal function,” *Mathematics of Control, Signals and Systems* **2**, 303–314 (1989).
5. K. Hornik, M. Stinchcombe and H. White, “Multilayer feedforward networks are universal approximators,” *Neural Networks* **2**, 359–366 (1989).
6. D. E. Rumelhart, G. E. Hinton and R. J. Williams, “Learning representations by back-propagating errors,” *Nature* **323**, 533–536 (1986).
7. A. G. Baydin, B. A. Pearlmutter, A. A. Radul and J. M. Siskind, “Automatic differentiation in machine learning: a survey,” *Journal of Machine Learning Research* **18**(153), 1–43 (2018).
8. X. Glorot and Y. Bengio, “Understanding the difficulty of training deep feedforward neural networks,” *Proceedings of AISTATS*, 249–256 (2010).
9. K. He, X. Zhang, S. Ren and J. Sun, “Delving deep into rectifiers: surpassing human-level performance on ImageNet classification,” *Proceedings of ICCV*, 1026–1034 (2015).
10. S. Elfwing, E. Uchibe and K. Doya, “Sigmoid-weighted linear units for neural network function approximation in reinforcement learning,” *Neural Networks* **107**, 3–11 (2018) (SiLU).

</div>
