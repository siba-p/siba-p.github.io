---
title: "Gradient descent"
description: "How models with thousands to billions of parameters are fitted: follow the slope downhill, choose the step size, and why momentum and Adam help on badly shaped surfaces."
hook: "Cauchy proposed walking downhill in 1847, and the idea still trains almost every neural network. On a loss surface with a condition number of ten thousand, though, even the best fixed step removes only 0.02 percent of the error per iteration."
objectives:
  - "Derive the stability limit η < 2/λmax from the quadratic model of a minimum"
  - "Explain how the condition number of the Hessian sets the speed of gradient descent"
  - "Compare momentum, stochastic gradients and Adam on badly conditioned loss surfaces"
  - "Diagnose a learning rate that is too large or too small from the loss curve"
  - "Choose Levenberg–Marquardt or L-BFGS when a problem has only a few parameters"
cover: "cover.svg"
milestones:
  - year: 1847
    text: "Cauchy proposes steepest descent for solving systems of equations"
  - year: 1951
    text: "Robbins and Monro prove that noisy gradient steps can still converge"
  - year: 1964
    text: "Polyak introduces the heavy-ball momentum method"
  - year: 2015
    text: "Kingma and Ba present the Adam optimiser at ICLR"
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

{{< note type="warn" title="Myth" >}}
*The negative gradient points towards the minimum.* It points perpendicular to the contour line through the current point, and on a stretched bowl that is a different direction. For a quadratic with condition number $\kappa$ (defined below), the angle between $-\nabla L$ and the straight line to the minimum can reach $\arccos\big(2\sqrt\kappa/(\kappa+1)\big)$: 55° for $\kappa = 10$, 79° for $\kappa = 100$ and 88.9° for $\kappa = 10^4$. In a badly conditioned problem the steepest direction is almost at right angles to the useful one, which is why gradient descent zig-zags.
{{< /note >}}

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

{{< fig src="steps.svg" alt="Three copies of the parabola 3 theta squared with gradient-descent iterates from theta = -1: small teal steps creeping down one side, blue steps alternating sides and shrinking, pink steps alternating sides and growing" caption="One stiff direction of the lab's stretched bowl, curvature $\lambda = 6$, started from $\theta = -1$. Each step multiplies the error by $1 - \eta\lambda$: a positive factor creeps in from one side, a factor between $-1$ and 0 overshoots and converges, and a factor below $-1$ overshoots further every time." >}}

1. **Stability.** Every factor must satisfy $|1-\eta\lambda_i| < 1$, so the iteration converges only if
   $$ \eta < \frac{2}{\lambda_{\max}} . $$
   The stretched bowl in the lab has curvatures 0.6 and 6, so it diverges for $\eta > 1/3$. Above that threshold each step overshoots the valley floor by more than it started with.
2. **Speed.** The slowest component shrinks by $|1-\eta\lambda_{\min}|$ per step. With the best fixed step, $\eta = 2/(\lambda_{\max}+\lambda_{\min})$, the error contracts by
   $$ \frac{\kappa - 1}{\kappa + 1}, \qquad \kappa = \frac{\lambda_{\max}}{\lambda_{\min}}, $$
   per iteration. The **condition number** $\kappa$ measures how stretched the bowl is. For $\kappa = 10$ this is 0.82 per step; for $\kappa = 10^4$, common in real problems, it is 0.9998, and gradient descent crawls.

{{< fig src="rate.svg" alt="Plot of the per-step error factor against learning rate for the lab's bowl: a slowly falling teal line for curvature 0.6, an orange V for curvature 6, and their maximum in thick blue with a minimum of 0.818 at eta 0.303; a pink band beyond eta 1/3 marks divergence" caption="The worse of the two directions sets the speed (thick blue). Raising η helps the soft direction until the stiff one starts to overshoot; the best compromise, η = 0.303 for the lab's bowl, keeps 81.8 percent of the error per step, and anything beyond η = 1/3 diverges." >}}

The figure makes a practical point. The best learning rate sits just below the divergence threshold, at $2/(\lambda_{\max}+\lambda_{\min})$, and is limited entirely by the stiffest direction, while the speed is limited entirely by the softest. The lab's default, $\eta = 0.12$, keeps 92.8 percent of the error per step and needs about 185 iterations for a millionfold reduction; $\eta = 0.30$ needs 69. Raising the learning rate until training becomes unstable and then backing off by a factor of two or three is a rule of thumb with this curve behind it.

This is why the scale of input features matters. If one descriptor is in ångströms and another in electronvolts per atom, the loss surface is stretched along one axis, $\kappa$ is large, and training is slow. **Standardising features** (subtracting the mean and dividing by the standard deviation) is the cheapest optimisation trick there is.

{{< note type="practice" title="Back of the envelope" >}}
Fit the Arrhenius data of the [previous lesson](../learning-from-data/) by gradient descent on the mean squared error, with features $(1, 1/T)$ and six temperatures from 300 to 350 K. The Hessian is $2\mathbf X^\top\mathbf X/N$. One feature is 1, the other is about 0.003 K⁻¹ and varies by only $4.8\times10^{-4}$ K⁻¹ across the data, so the eigenvalues are about 2 and $5.3\times10^{-8}$, and $\kappa \approx 3.8\times10^7$. At the best fixed step the slow component shrinks by $1 - 2/\kappa$ per iteration, so a millionfold reduction takes $\ln(10^6)\,\kappa/2 \approx 2.6\times10^8$ iterations. After standardising $1/T$, the two columns are orthogonal with equal norms, $\kappa = 1$, and a single step lands on the answer.
{{< /note >}}

{{< py title="gradient descent on an Arrhenius fit, raw and standardised" >}}
import numpy as np
T = np.array([300., 310., 320., 330., 340., 350.])
k = np.array([1.2e-3, 2.4e-3, 4.6e-3, 8.5e-3, 1.5e-2, 2.6e-2])
R, y = 8.314462618e-3, np.log(k)                  # kJ/(mol K)

def descend(X, steps):
    H = 2 * X.T @ X / len(y)                      # Hessian of the mean squared error
    lam = np.linalg.eigvalsh(H)
    eta = 2 / (lam[0] + lam[-1])                  # best fixed step
    th = np.zeros(X.shape[1])
    for _ in range(steps):
        th -= eta * 2 * X.T @ (X @ th - y) / len(y)
    return th, lam[-1] / lam[0]

x = 1 / T
raw = np.column_stack([np.ones(6), x])
std = np.column_stack([np.ones(6), (x - x.mean()) / x.std()])
for name, X, scale in [("raw 1/T", raw, 1.0), ("standardised", std, x.std())]:
    for steps in (10, 1000, 100000):
        th, kappa = descend(X, steps)
        print(f"{name:13s} kappa = {kappa:9.3g}  {steps:6d} steps:  Ea = {-th[1] / scale * R:7.2f} kJ/mol")
{{< /py >}}

With the raw feature, 100,000 iterations at the best possible fixed step move the activation energy from 0 to 0.28 kJ/mol, half a percent of the way to the answer of 53.66 kJ/mol; the loss has fallen, because the stiff intercept direction converged at once, but the slope has barely started. With the standardised feature, ten iterations are already exact. Nothing about the data or the model changed, only the coordinates in which the optimiser walks.

## Momentum

In a long, narrow valley, gradient descent zig-zags across the steep walls while making little progress along the floor. **Polyak's heavy-ball method** adds a velocity that accumulates past gradients:

$$
\mathbf v_{t+1} = \beta\,\mathbf v_t - \eta\,\nabla L(\boldsymbol\theta_t), \qquad \boldsymbol\theta_{t+1} = \boldsymbol\theta_t + \mathbf v_{t+1}.
$$

Components of the gradient that keep the same sign (along the valley floor) add up; components that flip sign from step to step (across the valley) cancel. With $\beta = 0.9$ the effective step along a consistent direction is up to $1/(1-\beta) = 10$ times larger. For quadratics, well-tuned momentum improves the convergence factor from about $1 - 1/\kappa$ to about $1 - 1/\sqrt\kappa$, a dramatic gain when $\kappa$ is large. Nesterov's accelerated gradient, which evaluates the gradient at the look-ahead point $\boldsymbol\theta_t + \beta\mathbf v_t$, achieves this rate provably for convex problems.

For a quadratic the best settings are known exactly: $\eta = 4/(\sqrt{\lambda_{\max}}+\sqrt{\lambda_{\min}})^2$ and $\beta = \big((\sqrt\kappa-1)/(\sqrt\kappa+1)\big)^2$, which give a contraction of $(\sqrt\kappa-1)/(\sqrt\kappa+1)$ per step. On the lab's bowl that means $\eta = 0.385$, larger than plain gradient descent could survive, and a modest $\beta = 0.27$.

{{< note type="try" title="Pause and predict" >}}
Plain gradient descent at its best step needs 69 iterations to shrink the error on the lab's bowl a millionfold. How many does tuned heavy-ball momentum need: about 60, about 20, or about 2? Then try $\eta = 0.385$, $\beta = 0.27$ in the lab.
{{< /note >}}

{{< fig src="kappa.svg" alt="Log–log plot of iterations needed for a millionfold error reduction against condition number: an orange line for gradient descent rising in proportion to kappa and a teal line for heavy-ball momentum rising as its square root, with marked points at kappa 10 and kappa 3.8 times ten to the seven" caption="Momentum turns a cost proportional to $\kappa$ into one proportional to $\sqrt\kappa$. At the lab's $\kappa = 10$ that saves a factor of three (69 against 21 iterations); for the raw Arrhenius fit, with $\kappa = 3.8\times10^7$, it is the difference between $2.6\times10^8$ and $4.2\times10^4$ iterations." >}}

The answer is 21. The gain grows with $\kappa$: for the raw Arrhenius problem, momentum would need about 42,000 iterations instead of 260 million. Two cautions apply. The heavy-ball guarantee is for quadratics; on strongly convex functions that are not quadratic, Polyak's method with these settings can fail to converge, while Nesterov's variant keeps the $\sqrt\kappa$ rate. And momentum is no substitute for rescaling: 42,000 iterations is still 42,000 more than a standardised problem needs.

## Stochastic gradients

For a data set of $N$ points the gradient is a sum, $\nabla L = \frac1N\sum_i \nabla \ell_i$. When $N$ is a million training structures, computing it exactly for every step is wasteful. **Stochastic gradient descent** (SGD) estimates it from a random **mini-batch** $\mathcal B$ of, say, 32 points:

$$
\boldsymbol\theta_{t+1} = \boldsymbol\theta_t - \eta\,\frac{1}{|\mathcal B|}\sum_{i\in\mathcal B}\nabla \ell_i(\boldsymbol\theta_t).
$$

The estimate is unbiased but noisy. Robbins and Monro showed in 1951 that such a noisy iteration still converges if the learning rate decays so that $\sum_t \eta_t = \infty$ and $\sum_t \eta_t^2 < \infty$ (for example $\eta_t \propto 1/t$). In practice the learning rate follows a **schedule**: a short warm-up, then a cosine or step decay. A full pass through the data is called an **epoch**.

{{< fig src="sgd.svg" alt="Log–log plot of excess loss against iteration for mini-batch SGD with three learning-rate rules: constant 0.05 levels off near 3 times ten to the minus 3, constant 0.01 levels off five times lower but later, and a decaying rate keeps falling to 2 times ten to the minus 5" caption="Mini-batch SGD on a four-parameter least-squares problem with 2,000 points and batches of 16. With a constant step the loss stalls at a noise floor roughly proportional to η; the decaying schedule converges fast at first and then keeps improving." >}}

The figure shows why the decay is needed. With a constant learning rate, SGD does not converge to the minimum but rattles around it: each step is a deterministic pull towards $\boldsymbol\theta^*$ plus a random kick from the mini-batch noise, and the two balance in a cloud whose size grows with $\eta$. Here the excess loss settles at $3.0\times10^{-3}$ for $\eta = 0.05$ and $6.3\times10^{-4}$ for $\eta = 0.01$, about five times lower, as a proportional rule predicts, but the smaller step takes ten times longer to get there. A schedule gets the best of both: large steps while far away, small steps once the noise dominates. The decaying run reaches $2\times10^{-5}$ after 20,000 steps and is still improving.

The batch size enters the same balance. The variance of a mini-batch gradient falls as $1/|\mathcal B|$, so doubling the batch halves the noise, roughly as halving $\eta$ would, but costs twice as much per step. Goyal and colleagues (2017) turned this into the **linear scaling rule** for large-scale training: when the batch is multiplied by $k$, multiply the learning rate by $k$ as well, after a warm-up period. For a materials data set of 50,000 DFT structures and batches of 16, one epoch is about 3,100 steps, and training an interatomic potential typically runs for hundreds of epochs.

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

A two-line calculation shows what the normalisation does. At the first step both averages are bias-corrected to the current gradient, $\hat{\mathbf m}_1 = \mathbf g_1$ and $\hat{\mathbf s}_1 = \mathbf g_1^2$, so the update is $-\eta\,\mathbf g_1/|\mathbf g_1|$: a step of exactly $\eta$ in every coordinate, in the downhill direction, whether that coordinate's gradient is $10^{-6}$ or $10^{3}$. Adam is therefore insensitive to the scale of the loss and of each parameter, which is why one default learning rate works across very different networks. The price is that it no longer follows the gradient: near a minimum, where gradients are small but consistent in sign, it still takes steps of order $\eta$, and the iterate can circle the minimum until the learning rate is reduced.

{{< note type="practice" title="From the lab: training an interatomic potential" >}}
Training a machine-learned interatomic potential minimises a weighted sum of energy and force errors over tens of thousands of DFT structures. Common recipes, such as those published with the NequIP and MACE codes, use Adam (often in its AMSGrad form), learning rates of $10^{-3}$ to $10^{-2}$, a scheduler that cuts the learning rate by a constant factor when the validation loss stops improving, and an exponential moving average of the weights for evaluation. The averaged weights play the role of the decaying learning rate in the SGD figure: they smooth out the mini-batch noise that a constant step leaves behind. A loss curve that drops by a factor of ten each time the scheduler fires is a sign that the learning rate was the bottleneck all along.
{{< /note >}}

## Second-order methods

If you can afford the Hessian, **Newton's method** jumps straight to the minimum of the local quadratic model, $\boldsymbol\theta_{t+1} = \boldsymbol\theta_t - \mathbf H^{-1}\nabla L$, which removes the dependence on $\kappa$ entirely and converges quadratically near the minimum. For least-squares problems the **Gauss–Newton** approximation $\mathbf H \approx 2\mathbf J^\top\mathbf J$ (with $\mathbf J$ the Jacobian of the residuals) needs only first derivatives; adding a damping term that interpolates towards gradient descent gives **Levenberg–Marquardt**, the algorithm behind `scipy.optimize.curve_fit` and most curve-fitting software. Each Levenberg–Marquardt step solves $(\mathbf J^\top\mathbf J + \mu\,\mathbf D)\,\boldsymbol\delta = -\mathbf J^\top\mathbf r$ for the residual vector $\mathbf r$, with $\mathbf D$ the diagonal of $\mathbf J^\top\mathbf J$. A large damping $\mu$ makes it a short, rescaled gradient-descent step; a small $\mu$ makes it a Gauss–Newton step. The algorithm lowers $\mu$ after every successful step and raises it after every failed one, so it behaves like cautious gradient descent far from the solution and like Newton's method close to it. **L-BFGS** builds a low-rank approximation of $\mathbf H^{-1}$ from recent gradients and is the standard for geometry optimisation of molecules and crystals. For networks with millions of parameters and noisy mini-batch gradients, first-order methods remain the practical choice.

### Line searches: choosing the step at every iteration

Methods with few parameters and exact gradients do not need a learning rate at all. A **line search** picks the step along the chosen direction $\mathbf d$ at every iteration. The simplest version, **backtracking** under the Armijo (1966) condition, starts from a trial step $\alpha = 1$ and halves it until the loss falls by at least a small fraction of what the linear model predicts, $L(\boldsymbol\theta + \alpha\mathbf d) \le L(\boldsymbol\theta) + c\,\alpha\,\nabla L^{\top}\mathbf d$ with $c \approx 10^{-4}$. The Wolfe conditions add a requirement on the slope at the new point, and quasi-Newton methods such as L-BFGS rely on them to keep their Hessian estimate positive definite. A line search costs extra function evaluations per iteration but removes the most fragile hyperparameter, and it cannot diverge.

{{< note type="practice" title="From the lab: relaxing a structure" >}}
Geometry optimisation is gradient descent on the potential energy surface, with the forces supplying the gradient, $\mathbf F = -\nabla E$. VASP offers a quasi-Newton (RMM-DIIS) optimiser as `IBRION = 1`, conjugate gradients as `IBRION = 2` and damped molecular dynamics as `IBRION = 3`; ASE provides BFGS, L-BFGS and FIRE, a damped-dynamics method from Bitzek and colleagues (2006) that is robust far from the minimum. A typical stopping rule is a largest force component below 0.01 to 0.05 eV/Å. Conditioning matters here too. In a cell with a soft molecular rotation and a stiff covalent bond, $\kappa$ easily exceeds 100, and **preconditioned** optimisers (Packwood and colleagues, 2016) rescale the step with a cheap approximate Hessian built from the bonding topology, exactly as standardising features rescales a regression. For large or soft systems this can cut the number of force calls several-fold.
{{< /note >}}

## When the surface is not a bowl

The quadratic model describes the end of an optimisation. Far from a minimum, three other features of real loss surfaces matter.

**Several minima.** Gradient descent finds the minimum of the basin it starts in, as the two-minima surface in the lab shows: start at $x > 0.1$ and it ends in the shallower well. For fitting a model this is often acceptable, because the minima of large networks found from different random initialisations reach similar losses. For a structure it is the whole problem: relaxing a guessed crystal structure returns the nearest local minimum, not the ground state, which is why structure prediction wraps local relaxations inside a global search such as basin hopping (Wales and Doye, 1997), random structure searching or evolutionary algorithms. The [lesson on potential energy surfaces](../potential-energy-surfaces/) describes these landscapes.

**Saddle points.** At a stationary point the Hessian may have both positive and negative eigenvalues. In one dimension a stationary point is a minimum or a maximum; in a million dimensions a random stationary point is overwhelmingly likely to be a saddle, since it would take every one of a million curvatures to be positive to make a minimum. Dauphin and colleagues (2014) argued that saddle points and the long plateaus around them, not poor local minima, are the main obstacle in training large networks. Exact gradient descent started exactly on a saddle's stable manifold stays there; any noise, including mini-batch noise, pushes it off, but the escape is slow when the negative curvature is small.

**Plateaus and cliffs.** Saturated activation functions produce regions where the gradient is tiny for many steps, and products of many layers can produce sudden walls where the gradient is huge. A single step down a cliff can throw the parameters far away. **Gradient clipping**, which rescales any gradient whose norm exceeds a threshold, is the standard guard and costs nothing when gradients are well behaved.

{{< note type="practice" >}}
- Standardise inputs and targets before training anything.
- Start with Adam at $\eta = 10^{-3}$; if the loss explodes or oscillates, lower it by a factor of 3 to 10; if it falls very slowly, raise it.
- Plot the training loss on a logarithmic axis, as in the lab. A loss that jumps up by orders of magnitude means the step is too large; a long flat plateau usually means a poorly conditioned problem or a learning rate that has decayed too early.
- For a handful of parameters (a kinetic model, a curve fit), use Levenberg–Marquardt or L-BFGS instead: they are faster and need no learning rate.
{{< /note >}}

## Where the gradient comes from

Every method above needs $\nabla L$. For a model with a million parameters, finite differences would need a million extra loss evaluations per step. **Reverse-mode automatic differentiation** (backpropagation) computes the full gradient for about the cost of two or three evaluations of the loss, whatever the number of parameters. It is the subject of [the lesson on neural networks in practice](../neural-networks/), and its forward-mode cousin reappears in [differentiable molecular dynamics](../differentiable-md/).

{{< note type="practice" title="Back of the envelope" >}}
Take a network with 500,000 parameters whose loss over one mini-batch takes 50 ms to evaluate. A one-sided finite-difference gradient needs 500,001 evaluations, about 7 hours, for a single step, and its accuracy is limited by the choice of difference step. Reverse-mode differentiation returns the exact gradient in roughly 0.1 to 0.15 s. Every optimiser in this lesson assumes the second number.
{{< /note >}}

{{< note type="key" >}}
- Gradient descent steps against the gradient, $\boldsymbol\theta_{t+1} = \boldsymbol\theta_t - \eta\nabla L$; near a minimum each Hessian eigendirection shrinks by $1-\eta\lambda_i$ per step.
- Stability requires $\eta < 2/\lambda_{\max}$; speed is limited by $\lambda_{\min}$, so the cost grows in proportion to the condition number $\kappa$.
- Standardising features is the cheapest cure for a large $\kappa$; momentum reduces the cost from $\kappa$ to $\sqrt\kappa$; Adam rescales each coordinate by its own gradient size.
- Mini-batch gradients are unbiased but noisy, so a constant learning rate leaves a noise floor proportional to $\eta$; a decaying schedule removes it.
- For a few parameters and exact gradients, use Levenberg–Marquardt or L-BFGS with a line search instead of a hand-tuned learning rate.
{{< /note >}}

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
- q: "Training with SGD at a constant learning rate, the validation loss stops improving and fluctuates around a level. Halving the learning rate lowers that level by about half. What was limiting training?"
  options: ["Overfitting", "The noise floor of stochastic gradients, which scales with the learning rate", "A saddle point"]
  answer: 1
  why: "With a constant step, mini-batch noise keeps the iterate in a cloud around the minimum whose size grows with $\\eta$. A smaller step, a larger batch or a decaying schedule shrinks it."
- q: "At its first step, how far does Adam move each parameter?"
  options: ["In proportion to that parameter's gradient", "By about $\\eta$, whatever the size of that parameter's gradient", "Not at all, because the moment estimates start at zero"]
  answer: 1
  why: "After bias correction $\\hat{\\mathbf m}_1 = \\mathbf g_1$ and $\\hat{\\mathbf s}_1 = \\mathbf g_1^2$, so the update is $-\\eta\\,\\mathbf g_1/|\\mathbf g_1|$: a step of size $\\eta$ in every coordinate."
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
10. L. Armijo, “Minimization of functions having Lipschitz continuous first partial derivatives,” *Pacific Journal of Mathematics* **16**, 1–3 (1966).
11. E. Bitzek, P. Koskinen, F. Gähler, M. Moseler and P. Gumbsch, “Structural relaxation made simple,” *Physical Review Letters* **97**, 170201 (2006).
12. D. J. Wales and J. P. K. Doye, “Global optimization by basin-hopping and the lowest energy structures of Lennard-Jones clusters containing up to 110 atoms,” *Journal of Physical Chemistry A* **101**, 5111–5116 (1997).
13. Y. N. Dauphin, R. Pascanu, C. Gulcehre, K. Cho, S. Ganguli and Y. Bengio, “Identifying and attacking the saddle point problem in high-dimensional non-convex optimization,” *Advances in Neural Information Processing Systems* **27** (2014).
14. P. Goyal, P. Dollár, R. Girshick, P. Noordhuis, L. Wesolowski, A. Kyrola, A. Tulloch, Y. Jia and K. He, “Accurate, large minibatch SGD: training ImageNet in 1 hour,” arXiv:1706.02677 (2017).

</div>
