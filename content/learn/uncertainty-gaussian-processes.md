---
title: "Kernels and Gaussian processes"
description: "A prediction without an error bar cannot guide an experiment. Gaussian processes give principled uncertainties: the prior over functions, the posterior in closed form, kernels, marginal likelihood, and how uncertainty is estimated for neural networks."
track: ml
weight: 4
level: Core
minutes: 55
lab: "Measure, update and sample a Gaussian process"
prereqs: ["generalisation"]
---

## Why uncertainty is not optional

A model predicts that a new alloy has a formation energy of −0.21 eV/atom. Should you synthesise it? That depends entirely on whether the prediction is good to ±0.01 or ±0.3 eV/atom, and on whether the alloy resembles anything in the training data. Scientific uses of machine learning, such as choosing the next experiment, flagging an MD configuration the potential has never seen, or deciding when to stop a screening campaign, all need the model to say **how sure it is**.

It helps to separate two kinds of uncertainty.

- **Aleatoric** uncertainty is noise in the data themselves: measurement error, or the variance of a property across nominally identical samples. More data does not remove it.
- **Epistemic** uncertainty is the model's ignorance: it grows away from the training data and shrinks as data are added. This is the kind that tells you where to measure next.

Gaussian processes (GPs) model both, in closed form, and are the reference against which other uncertainty methods are judged.

## A distribution over functions

A **Gaussian process** is a probability distribution over functions $f(x)$ such that the values at any finite set of inputs are jointly Gaussian. It is specified by a mean function (often zero) and a **covariance function**, or **kernel**, $k(x, x')$, which says how strongly the function values at two inputs are correlated:

$$
f \sim \mathcal{GP}\big(0, k\big), \qquad \operatorname{cov}\big(f(x), f(x')\big) = k(x, x').
$$

The most common choice is the **squared-exponential** (RBF) kernel

$$
k(x,x') = \sigma_f^2 \exp\!\left(-\frac{(x-x')^2}{2\ell^2}\right).
$$

It encodes a belief about smoothness: points closer than about one **length-scale** $\ell$ have nearly equal function values, while points much further apart are nearly independent. $\sigma_f$ sets the typical amplitude. Press **Clear**, then **Draw 3 functions** in the lab: before any data, these are samples from the prior. Change $\ell$ and draw again to see what the kernel assumes.

{{< widget name="gp" title="A Gaussian process, one measurement at a time" caption="Click to measure the hidden function at any x. The band is the 95% credible interval; the orange line marks the point of highest uncertainty. Try “Observe where most uncertain” several times, and compare a length-scale of 0.2 with one of 3." >}}

## Conditioning on data

Suppose we have noisy observations $y_i = f(x_i) + \varepsilon_i$, $\varepsilon_i \sim \mathcal N(0,\sigma_n^2)$, collected in a vector $\mathbf y$. By the definition of a GP, the observations and the unknown value $f_* = f(x_*)$ at a new input are jointly Gaussian:

$$
\begin{pmatrix}\mathbf y\\ f_*\end{pmatrix} \sim \mathcal N\!\left(\mathbf 0,\;
\begin{pmatrix} \mathbf K + \sigma_n^2\mathbf I & \mathbf k_*\\ \mathbf k_*^{\top} & k_{**}\end{pmatrix}\right),
$$

where $K_{ij} = k(x_i,x_j)$, $(\mathbf k_*)_i = k(x_i, x_*)$ and $k_{**} = k(x_*,x_*)$. Conditioning a multivariate Gaussian on some of its components is a standard identity, and it gives the **posterior predictive distribution** in closed form:

$$
\mu_* = \mathbf k_*^{\top}\big(\mathbf K + \sigma_n^2\mathbf I\big)^{-1}\mathbf y,
\qquad
\sigma_*^2 = k_{**} - \mathbf k_*^{\top}\big(\mathbf K + \sigma_n^2\mathbf I\big)^{-1}\mathbf k_* .
$$

Read these two lines carefully, because they explain everything the lab shows.

- The mean $\mu_*$ is a weighted sum of kernel functions centred on the data points, $\mu_* = \sum_i \alpha_i\,k(x_i, x_*)$ with $\boldsymbol\alpha = (\mathbf K + \sigma_n^2\mathbf I)^{-1}\mathbf y$. Far from all data the kernel vanishes and the mean returns to the prior mean, zero.
- The variance starts at the prior variance $k_{**} = \sigma_f^2$ and is reduced by an amount that depends **only on where the data are, not on their values**. Uncertainty shrinks near observations and grows back over a distance of about $\ell$.
- Near an observation the variance does not go to zero but to about $\sigma_n^2$: the model knows the measurement is noisy.

In code, $(\mathbf K + \sigma_n^2\mathbf I)$ is factorised once by Cholesky decomposition, $\mathbf L\mathbf L^\top$, and both formulas follow by triangular solves. The cost is $\mathcal O(N^3)$ for $N$ training points, comfortable up to a few thousand points and the main limitation of exact GPs. Sparse approximations that summarise the data with $M \ll N$ inducing points reduce it to $\mathcal O(NM^2)$.

## Choosing the kernel's hyperparameters

$\ell$, $\sigma_f$ and $\sigma_n$ are not fitted by the formulas above; they are chosen by maximising the **log marginal likelihood**, the probability of the observed data under the GP prior with all possible functions integrated out:

$$
\ln p(\mathbf y \mid \mathbf X, \boldsymbol\theta) = \underbrace{-\tfrac12\,\mathbf y^{\top}\mathbf K_y^{-1}\mathbf y}_{\text{data fit}} \;\underbrace{-\;\tfrac12\ln\lvert\mathbf K_y\rvert}_{\text{complexity penalty}} \;-\; \tfrac N2\ln 2\pi,
\qquad \mathbf K_y = \mathbf K + \sigma_n^2\mathbf I .
$$

The first term rewards fitting the data; the second penalises kernels that could explain *too many* different data sets (a very short length-scale can fit anything). The balance is an automatic Occam's razor, and it is why GPs rarely overfit badly. Press **Fit hyperparameters** in the lab after adding six or eight points; the readout shows the log marginal likelihood for whatever settings you choose by hand, and you can try to beat the optimiser.

{{< note type="tip" title="Kernels encode physics" >}}
Kernels can be added and multiplied to build in prior knowledge: a periodic kernel for a function of a torsion angle, a linear plus RBF kernel for a trend with local wiggles, a kernel on composition vectors or atomic environments for materials. The **SOAP** kernel, which compares the smoothed neighbour densities of two atomic environments, underlies the Gaussian approximation potentials (GAP) discussed in [the lesson on interatomic potentials](../mlip/). Kernel ridge regression, widely used for molecular properties, gives exactly the GP posterior mean, without the variance.
{{< /note >}}

## In practice

scikit-learn's implementation maximises the marginal likelihood for you:

```python
import numpy as np
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import ConstantKernel, RBF, WhiteKernel

rng = np.random.default_rng(1)
X = rng.uniform(0, 10, 12)[:, None]
y = np.sin(1.1 * X[:, 0]) + 0.35 * np.cos(2.7 * X[:, 0]) + 0.08 * X[:, 0] + 0.05 * rng.normal(size=12)

kernel = ConstantKernel(1.0) * RBF(length_scale=1.0) + WhiteKernel(noise_level=0.01)
gp = GaussianProcessRegressor(kernel, normalize_y=True, n_restarts_optimizer=5, random_state=0)
gp.fit(X, y)                                   # maximises the log marginal likelihood
print(gp.kernel_)                              # fitted hyperparameters

Xq = np.array([[2.0], [5.0], [12.0]])
mu, sd = gp.predict(Xq, return_std=True)
for x, m, s in zip(Xq[:, 0], mu, sd):
    print(f"x = {x:5.1f}:  {m:6.3f} ± {2*s:.3f}")
```

The output shows the behaviour you want: ±0.13 at $x = 5$, inside the data; ±0.58 at $x = 2$, where samples are sparse; and ±1.3 at $x = 12$, outside the training range, where the model honestly falls back to its prior.

```text
1.08**2 * RBF(length_scale=0.846) + WhiteKernel(noise_level=0.00489)
x =   2.0:   0.705 ± 0.575
x =   5.0:  -0.152 ± 0.127
x =  12.0:   0.208 ± 1.295
```

## Uncertainty for neural networks

Neural networks do not provide uncertainties by default, and a single network can be confidently wrong far from its training data. The practical options are:

- **Deep ensembles.** Train $M$ networks (typically 5) from different random initialisations and use the spread of their predictions as the uncertainty. Simple, robust and the usual choice for machine-learned interatomic potentials, where the disagreement between ensemble members flags configurations that need a new DFT calculation.
- **Monte Carlo dropout.** Keep dropout active at prediction time and average many stochastic forward passes; cheaper, but usually less reliable than ensembles.
- **Last-layer and Laplace approximations.** Treat only the final layer (or a local Gaussian around the trained weights) probabilistically.
- **Conformal prediction.** A distribution-free wrapper: use the errors on a held-out calibration set to turn any model's predictions into intervals with a guaranteed coverage, for example 90% of future values fall inside. It assumes only that calibration and future data are exchangeable, so it cannot rescue extrapolation.

Whatever the method, **check the calibration**: on held-out data, about 95% of true values should fall inside the predicted 95% intervals. Over-confident uncertainties are worse than none, because they are trusted.

{{< quiz >}}
- q: "In a Gaussian process, what does the posterior variance at a new point depend on?"
  options: ["On the measured values $\\mathbf y$ near that point", "Only on the input locations of the data and the kernel, not on the measured values", "Only on the noise level"]
  answer: 1
  why: "$\\sigma_*^2 = k_{**} - \\mathbf k_*^\\top(\\mathbf K + \\sigma_n^2\\mathbf I)^{-1}\\mathbf k_*$ contains no $\\mathbf y$. (The hyperparameters, if fitted by marginal likelihood, do depend on $\\mathbf y$.)"
- q: "You set the length-scale ℓ much shorter than the spacing between data points. What happens between the points?"
  options: ["The mean interpolates smoothly between them", "The mean drops back towards the prior mean and the uncertainty returns almost to its prior value", "The uncertainty becomes zero everywhere"]
  answer: 1
  why: "With a short length-scale, function values a few ℓ apart are almost uncorrelated, so each observation informs only its immediate neighbourhood. In between, the GP reverts to its prior."
- q: "Which term of the log marginal likelihood stops the GP from choosing an absurdly short length-scale that fits the noise?"
  options: ["The data-fit term $-\\tfrac12\\mathbf y^\\top\\mathbf K_y^{-1}\\mathbf y$", "The complexity penalty $-\\tfrac12\\ln|\\mathbf K_y|$", "The constant $-\\tfrac N2\\ln 2\\pi$"]
  answer: 1
  why: "A very flexible kernel spreads its probability over many possible data sets, which shows up as a large determinant and a large penalty. This automatic Occam's razor balances fit against complexity."
- q: "An ensemble of five interatomic potentials agrees closely on most MD frames but disagrees strongly on a few. What is the sensible use of this signal?"
  options: ["Discard the frames where they disagree", "Compute those frames with DFT and add them to the training set", "Average the five predictions and trust the result"]
  answer: 1
  why: "Large ensemble disagreement indicates high epistemic uncertainty, typically configurations unlike the training data. Labelling them with the reference method is the core of active learning (see the active-learning lesson)."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. C. E. Rasmussen and C. K. I. Williams, *Gaussian Processes for Machine Learning*, MIT Press (2006), chapters 2 (regression), 4 (covariance functions) and 5 (model selection); free online at gaussianprocess.org/gpml.
2. V. L. Deringer, A. P. Bartók, N. Bernstein, D. M. Wilkins, M. Ceriotti and G. Csányi, “Gaussian process regression for materials and molecules,” *Chemical Reviews* **121**, 10073–10141 (2021).
3. A. P. Bartók, M. C. Payne, R. Kondor and G. Csányi, “Gaussian approximation potentials: the accuracy of quantum mechanics, without the electrons,” *Physical Review Letters* **104**, 136403 (2010).
4. B. Lakshminarayanan, A. Pritzel and C. Blundell, “Simple and scalable predictive uncertainty estimation using deep ensembles,” *Advances in Neural Information Processing Systems* **30** (2017).
5. Y. Gal and Z. Ghahramani, “Dropout as a Bayesian approximation: representing model uncertainty in deep learning,” *Proceedings of ICML*, 1050–1059 (2016).
6. A. N. Angelopoulos and S. Bates, “Conformal prediction: a gentle introduction,” *Foundations and Trends in Machine Learning* **16**, 494–591 (2023).
7. K. Tran, W. Neiswanger, J. Yoon, Q. Zhang, E. Xing and Z. W. Ulissi, “Methods for comparing uncertainty quantifications for material property predictions,” *Machine Learning: Science and Technology* **1**, 025006 (2020).
8. E. Snelson and Z. Ghahramani, “Sparse Gaussian processes using pseudo-inputs,” *Advances in Neural Information Processing Systems* **18** (2006).

</div>
