---
title: "Gradient descent and optimisation"
description: "How models with thousands to billions of parameters are fitted: follow the slope downhill, choose the step size, and why momentum and Adam help on badly shaped surfaces."
track: ml
weight: 2
level: Foundation
minutes: 40
lab: "Race three optimisers across a loss surface"
prereqs: ["learning-from-data"]
---

## Why we need an iterative method

The straight line in the [previous lesson](../learning-from-data/) had a closed-form answer because its loss is quadratic in the parameters. Most models do not: a nonlinear curve fit, a neural network or an interatomic potential has a loss $L(\boldsymbol\theta)$ with no formula for its minimum. What we *can* compute cheaply is the **gradient** $\nabla L(\boldsymbol\theta)$, the vector of partial derivatives that points in the direction of steepest increase. Gradient descent takes repeated small steps the other way:

$$
\boldsymbol\theta_{t+1} = \boldsymbol\theta_t - \eta\,\nabla L(\boldsymbol\theta_t),
$$

where $\eta > 0$ is the **learning rate** (step size). The idea goes back to Cauchy in 1847, and with the improvements below it trains essentially every neural network in use today.

Why this direction? A first-order Taylor expansion around $\boldsymbol\theta$ gives $L(\boldsymbol\theta + \boldsymbol\delta) \approx L(\boldsymbol\theta) + \nabla L^{\top}\boldsymbol\delta$. Among all steps of a fixed length, the one that lowers $L$ most is the one anti-parallel to $\nabla L$ (by the Cauchy–Schwarz inequality). The expansion is only trustworthy for small $\boldsymbol\delta$, which is why the step size matters so much.

{{< widget name="gd" title="Three optimisers on three loss surfaces" caption="The colour bands are contours of the loss (logarithmic). Click to choose a start point, then Run. Try the stretched bowl with η = 0.12, then 0.30, then 0.35; try the banana valley with plain gradient descent before switching to momentum or Adam." >}}

## How large a step? The quadratic model

Near a minimum $\boldsymbol\theta^*$ every smooth loss looks like a quadratic bowl,

$$
L(\boldsymbol\theta) \approx L(\boldsymbol\theta^*) + \tfrac12(\boldsymbol\theta-\boldsymbol\theta^*)^{\top}\mathbf H\,(\boldsymbol\theta-\boldsymbol\theta^*),
$$

where $\mathbf H$ is the **Hessian**, the matrix of second derivatives. Write the error $\mathbf e_t = \boldsymbol\theta_t - \boldsymbol\theta^*$. Since $\nabla L = \mathbf H\mathbf e_t$, one gradient step gives

$$
\mathbf e_{t+1} = (\mathbf I - \eta\mathbf H)\,\mathbf e_t .
$$

Decompose $\mathbf e$ along the eigenvectors of $\mathbf H$, with eigenvalues $\lambda_1 \ge \dots \ge \lambda_n > 0$ (the curvatures along each principal direction). Each component is multiplied by $(1-\eta\lambda_i)$ at every step. Two consequences follow, and you can see both in the lab.

1. **Stability.** Every factor must satisfy $|1-\eta\lambda_i| < 1$, so the iteration converges only if
   $$ \eta < \frac{2}{\lambda_{\max}} . $$
   The stretched bowl in the lab has curvatures 0.6 and 6, so it diverges for $\eta > 1/3$. Above that threshold each step overshoots the valley floor by more than it started with.
2. **Speed.** The slowest component shrinks by $|1-\eta\lambda_{\min}|$ per step. With the best fixed step, $\eta = 2/(\lambda_{\max}+\lambda_{\min})$, the error contracts by
   $$ \frac{\kappa - 1}{\kappa + 1}, \qquad \kappa = \frac{\lambda_{\max}}{\lambda_{\min}}, $$
   per iteration. The **condition number** $\kappa$ measures how stretched the bowl is. For $\kappa = 10$ this is 0.82 per step; for $\kappa = 10^4$, common in real problems, it is 0.9998, and gradient descent crawls.

This is why the scale of input features matters. If one descriptor is in ångströms and another in electronvolts per atom, the loss surface is stretched along one axis, $\kappa$ is large, and training is slow. **Standardising features** (subtracting the mean and dividing by the standard deviation) is the cheapest optimisation trick there is.

## Momentum

In a long, narrow valley, gradient descent zig-zags across the steep walls while making little progress along the floor. **Polyak's heavy-ball method** adds a velocity that accumulates past gradients:

$$
\mathbf v_{t+1} = \beta\,\mathbf v_t - \eta\,\nabla L(\boldsymbol\theta_t), \qquad \boldsymbol\theta_{t+1} = \boldsymbol\theta_t + \mathbf v_{t+1}.
$$

Components of the gradient that keep the same sign (along the valley floor) add up; components that flip sign from step to step (across the valley) cancel. With $\beta = 0.9$ the effective step along a consistent direction is up to $1/(1-\beta) = 10$ times larger. For quadratics, well-tuned momentum improves the convergence factor from about $1 - 1/\kappa$ to about $1 - 1/\sqrt\kappa$, a dramatic gain when $\kappa$ is large. Nesterov's accelerated gradient, which evaluates the gradient at the look-ahead point $\boldsymbol\theta_t + \beta\mathbf v_t$, achieves this rate provably for convex problems.

## Stochastic gradients

For a data set of $N$ points the gradient is a sum, $\nabla L = \frac1N\sum_i \nabla \ell_i$. When $N$ is a million training structures, computing it exactly for every step is wasteful. **Stochastic gradient descent** (SGD) estimates it from a random **mini-batch** $\mathcal B$ of, say, 32 points:

$$
\boldsymbol\theta_{t+1} = \boldsymbol\theta_t - \eta\,\frac{1}{|\mathcal B|}\sum_{i\in\mathcal B}\nabla \ell_i(\boldsymbol\theta_t).
$$

The estimate is unbiased but noisy. Robbins and Monro showed in 1951 that such a noisy iteration still converges if the learning rate decays so that $\sum_t \eta_t = \infty$ and $\sum_t \eta_t^2 < \infty$ (for example $\eta_t \propto 1/t$). In practice the learning rate follows a **schedule**: a short warm-up, then a cosine or step decay. A full pass through the data is called an **epoch**.

## Adaptive methods: Adam

Different parameters often need different step sizes: weights feeding rare features see small, infrequent gradients. **Adam** (adaptive moment estimation) keeps running averages of the gradient and of its element-wise square,

$$
\mathbf m_t = \beta_1\mathbf m_{t-1} + (1-\beta_1)\,\mathbf g_t, \qquad \mathbf s_t = \beta_2\mathbf s_{t-1} + (1-\beta_2)\,\mathbf g_t^{2},
$$

corrects them for their initialisation at zero, $\hat{\mathbf m}_t = \mathbf m_t/(1-\beta_1^t)$ and $\hat{\mathbf s}_t = \mathbf s_t/(1-\beta_2^t)$, and steps by

$$
\boldsymbol\theta_{t+1} = \boldsymbol\theta_t - \eta\,\frac{\hat{\mathbf m}_t}{\sqrt{\hat{\mathbf s}_t}+\epsilon}.
$$

Dividing by the root-mean-square gradient makes the step size roughly $\eta$ in every coordinate, whatever the gradient's scale, which is a crude per-parameter correction for bad conditioning. The defaults $\beta_1 = 0.9$, $\beta_2 = 0.999$ work for most problems. In the lab, notice that Adam with $\eta = 0.1$ moves at a nearly constant speed even where the gradient is tiny, and how it can circle near the minimum. Most MLIP and GNN training scripts use Adam or its variant AdamW, which decouples weight decay from the adaptive step.

## Second-order methods

If you can afford the Hessian, **Newton's method** jumps straight to the minimum of the local quadratic model, $\boldsymbol\theta_{t+1} = \boldsymbol\theta_t - \mathbf H^{-1}\nabla L$, which removes the dependence on $\kappa$ entirely and converges quadratically near the minimum. For least-squares problems the **Gauss–Newton** approximation $\mathbf H \approx 2\mathbf J^\top\mathbf J$ (with $\mathbf J$ the Jacobian of the residuals) needs only first derivatives; adding a damping term that interpolates towards gradient descent gives **Levenberg–Marquardt**, the algorithm behind `scipy.optimize.curve_fit` and most curve-fitting software. **L-BFGS** builds a low-rank approximation of $\mathbf H^{-1}$ from recent gradients and is the standard for geometry optimisation of molecules and crystals. For networks with millions of parameters and noisy mini-batch gradients, first-order methods remain the practical choice.

{{< note type="practice" >}}
- Standardise inputs and targets before training anything.
- Start with Adam at $\eta = 10^{-3}$; if the loss explodes or oscillates, lower it by a factor of 3 to 10; if it falls very slowly, raise it.
- Plot the training loss on a logarithmic axis, as in the lab. A loss that jumps up by orders of magnitude means the step is too large; a long flat plateau usually means a poorly conditioned problem or a learning rate that has decayed too early.
- For a handful of parameters (a kinetic model, a curve fit), use Levenberg–Marquardt or L-BFGS instead: they are faster and need no learning rate.
{{< /note >}}

## Where the gradient comes from

Every method above needs $\nabla L$. For a model with a million parameters, finite differences would need a million extra loss evaluations per step. **Reverse-mode automatic differentiation** (backpropagation) computes the full gradient for about the cost of two or three evaluations of the loss, whatever the number of parameters. It is the subject of [the lesson on neural networks in practice](../neural-networks/), and its forward-mode cousin reappears in [differentiable molecular dynamics](../differentiable-md/).

{{< quiz >}}
- q: "The largest curvature (Hessian eigenvalue) of your loss near the minimum is 50. Which fixed learning rate keeps plain gradient descent stable?"
  options: ["Any $\\eta < 0.04$", "Any $\\eta < 0.1$", "Any $\\eta < 2$"]
  answer: 0
  why: "Gradient descent on a quadratic is stable only if $\\eta < 2/\\lambda_{\\max} = 2/50 = 0.04$. Larger steps overshoot along the stiffest direction and grow without bound."
- q: "One input feature is a lattice constant around 4 Å and another is a pressure around 10⁵ Pa. Why does that slow down gradient descent?"
  options: ["Because the gradient becomes zero", "Because the very different scales stretch the loss surface, giving a large condition number", "Because gradient descent cannot handle units"]
  answer: 1
  why: "The curvature along the pressure weight is about $(10^5/4)^2 \\approx 6\\times10^{8}$ times larger than along the lattice weight, so the stable step size is set by one direction while progress is limited by the other. Standardising the features fixes this."
- q: "What does momentum do in a long, narrow valley?"
  options: ["It increases the learning rate along all directions equally", "It lets consistent gradient components accumulate along the valley while oscillating components across it cancel", "It computes the Hessian"]
  answer: 1
  why: "The velocity is a running sum of past gradients. Along the floor the gradient keeps its sign and the steps grow; across the valley it alternates sign and averages out."
- q: "Why is stochastic (mini-batch) gradient descent used for large data sets?"
  options: ["Because it gives the exact gradient faster", "Because a small random batch gives an unbiased, cheap estimate of the gradient, so many more steps can be taken for the same cost", "Because it avoids the need for a learning rate"]
  answer: 1
  why: "The mini-batch gradient is noisy but correct on average. Taking many cheap, noisy steps beats taking a few exact, expensive ones, and the noise can even help escape poor regions."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. Nocedal and S. J. Wright, *Numerical Optimization*, 2nd ed., Springer (2006): chapters 2–3 (line search and steepest descent), 6–7 (quasi-Newton and L-BFGS), 10 (least squares and Levenberg–Marquardt).
2. I. Goodfellow, Y. Bengio and A. Courville, *Deep Learning*, MIT Press (2016), chapter 8 (optimisation for training deep models).
3. B. T. Polyak, “Some methods of speeding up the convergence of iteration methods,” *USSR Computational Mathematics and Mathematical Physics* **4**(5), 1–17 (1964).
4. Y. Nesterov, “A method for solving the convex programming problem with convergence rate O(1/k²),” *Soviet Mathematics Doklady* **27**, 372–376 (1983).
5. H. Robbins and S. Monro, “A stochastic approximation method,” *Annals of Mathematical Statistics* **22**, 400–407 (1951).
6. D. P. Kingma and J. Ba, “Adam: A method for stochastic optimization,” *International Conference on Learning Representations* (2015), arXiv:1412.6980.
7. I. Loshchilov and F. Hutter, “Decoupled weight decay regularization,” *International Conference on Learning Representations* (2019), arXiv:1711.05101 (AdamW).
8. D. C. Liu and J. Nocedal, “On the limited memory BFGS method for large scale optimization,” *Mathematical Programming* **45**, 503–528 (1989).
9. S. Ruder, “An overview of gradient descent optimization algorithms,” arXiv:1609.04747 (2016).

</div>
