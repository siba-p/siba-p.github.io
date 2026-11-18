---
title: "Kernels and Gaussian processes"
description: "A prediction without an error bar cannot guide an experiment. Gaussian processes give principled uncertainties: the prior over functions, the posterior in closed form, kernels, marginal likelihood, and how uncertainty is estimated for neural networks."
hook: "A predicted formation energy of −0.21 eV/atom means little until you know whether it is good to 0.01 or to 0.3. Gaussian processes give that error bar in closed form, and it widens wherever you have not measured."
objectives:
  - "Distinguish aleatoric from epistemic uncertainty and say which one more data removes"
  - "Derive the Gaussian process posterior mean and variance by conditioning a joint Gaussian"
  - "Interpret how the kernel length-scale controls smoothness and the growth of uncertainty"
  - "Fit kernel hyperparameters by maximising the log marginal likelihood"
  - "Compare deep ensembles, Monte Carlo dropout and conformal prediction for neural networks"
cover: "cover.svg"
milestones:
  - year: 1951
    text: "Krige estimates gold grades between boreholes on the Witwatersrand, the origin of kriging"
  - year: 1996
    text: "Neal shows that infinitely wide random neural networks become Gaussian processes"
  - year: 2006
    text: "Rasmussen and Williams publish Gaussian Processes for Machine Learning"
  - year: 2010
    text: "Bartók, Payne, Kondor and Csányi introduce Gaussian approximation potentials"
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

For a model trained on DFT data the split is concrete. Numerical noise from incomplete k-point sampling or smearing, typically a few meV/atom in a converged high-throughput workflow, is aleatoric from the model's point of view: a better model cannot remove it, only better calculations can. The model's ignorance of chemistries absent from the training set is epistemic and is reduced by adding those chemistries. A third error sits outside both: the reference itself is approximate, and semilocal functionals such as PBE miss experimental formation energies by of order 0.1 eV/atom on average. No uncertainty estimate learned from DFT data can see that error, because every training label shares it.

Gaussian processes (GPs) model both, in closed form, and are the reference against which other uncertainty methods are judged.

{{< note type="story" title="From gold mines to materials" >}}
The mathematics of this lesson was first put to work underground. In 1951 Danie Krige, a mining engineer on the Witwatersrand gold fields of South Africa, published a statistical method for estimating the gold grade of ore between sampled boreholes, weighting nearby samples by how strongly grades were correlated over distance. Georges Matheron at the École des Mines in Paris formalised the method in the early 1960s and named it *kriging* after Krige. Kriging is Gaussian-process regression with a covariance estimated from the data; geostatisticians used it for decades before machine learning adopted it under its present name.
{{< /note >}}

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

{{< fig src="kernels.svg" alt="Three panels of three random functions each: smooth wandering curves from the squared-exponential kernel, jagged curves from the Matérn 3/2 kernel, and curves that repeat every two units from the periodic kernel" caption="Random functions drawn from three priors with the same length-scale. The kernel decides more than the length-scale: how rough the function is, and whether it repeats." >}}

### Choosing a kernel

The squared-exponential kernel produces functions with derivatives of every order, a strong assumption that Michael Stein, in his 1999 monograph on interpolating spatial data, argued is unrealistic for most physical processes. The **Matérn** family, introduced by Bertil Matérn in 1960, adds a smoothness parameter $\nu$: $\nu = 1/2$ gives the exponential kernel $e^{-r/\ell}$, whose samples are continuous but nowhere differentiable, like an Ornstein–Uhlenbeck process; $\nu = 3/2$ and $5/2$ give functions that are once and twice differentiable; and $\nu \to \infty$ recovers the squared exponential. Matérn 5/2 is the default in many Bayesian-optimisation packages because it is smooth enough to model and rough enough to be honest. A **periodic** kernel, $\exp\!\big(-2\sin^2(\pi r/p)/\ell^2\big)$, builds in an exact period $p$ and suits functions of a torsion angle, where $p = 360°$, or of a fractional coordinate in a crystal.

Kernels on structured inputs follow the same logic. A kernel for compositions compares element fractions; the SOAP kernel compares smoothed neighbour densities of atomic environments; a kernel for a whole structure can be the average of the kernels between its atoms. Whatever the input, the kernel must be positive semi-definite, so that every covariance matrix it produces is a valid one, and sums and products of valid kernels are valid.

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

{{< fig src="conditioning.svg" alt="Left: the squared-exponential correlation falling from 1 with distance, with values 0.88, 0.61 and 0.14 marked at 0.5, 1 and 2 length-scales. Right: elliptical contours of the joint Gaussian of an observation at x = 0 and the function at x = 1, cut by a vertical line at y = 1, with the resulting conditional bell curve drawn along the line" caption="How a GP learns, for two points one length-scale apart. The kernel makes $y(0)$ and $f(1)$ correlated (0.60); observing $y(0) = 1$ slices the joint distribution, and the slice is a narrower Gaussian centred at 0.60 with standard deviation 0.80." >}}

{{< note type="math" title="Conditioning a Gaussian in two dimensions" >}}
Take two zero-mean Gaussian variables with unit variances and correlation $\rho$. Their joint density is proportional to $\exp\!\big[-(a^2 - 2\rho ab + b^2)/2(1-\rho^2)\big]$. Fix $a$ and complete the square in $b$: the exponent becomes $-(b-\rho a)^2/2(1-\rho^2)$ plus a term without $b$. So $b \mid a$ is Gaussian with mean $\rho a$ and variance $1-\rho^2$. The general formula above is the same calculation with matrices: $\mathbf k_*^\top(\mathbf K + \sigma_n^2\mathbf I)^{-1}$ plays the role of $\rho$, and the variance reduction $\mathbf k_*^\top(\mathbf K + \sigma_n^2\mathbf I)^{-1}\mathbf k_*$ plays the role of $\rho^2$.
{{< /note >}}

### A Gaussian process by hand

Take $\sigma_f = 1$, $\ell = 1$, $\sigma_n = 0.1$ and a single measurement $y = 1$ at $x = 0$. Then $\mathbf K + \sigma_n^2\mathbf I$ is the number $1.01$, and $k_* = e^{-x_*^2/2}$, so $\mu_* = k_*/1.01$ and $\sigma_*^2 = 1 - k_*^2/1.01$:

| $x_*$ | 0 | 0.5 | 1 | 2 | 3 |
|---|---|---|---|---|---|
| $k_*$ | 1 | 0.8825 | 0.6065 | 0.1353 | 0.0111 |
| mean $\mu_*$ | 0.990 | 0.874 | 0.601 | 0.134 | 0.011 |
| standard deviation $\sigma_*$ | 0.100 | 0.478 | 0.797 | 0.991 | 1.000 |

At the measurement the GP returns almost the measured value with the noise level as its uncertainty. Half a length-scale away it still trusts the measurement, at 0.874 ± 0.478; two length-scales away it has almost forgotten it. Add a second measurement, $y = -0.5$ at $x = 2$, and the prediction at $x = 1$ becomes $0.265 \pm 0.598$: the mean is pulled between the two values and the uncertainty shrinks from 0.797, because $x = 1$ is now within one length-scale of two data points.

{{< note type="try" title="Pause and predict" >}}
Instead of measuring at $x = 2$, repeat the measurement at $x = 0$ and get $y = 1$ again. What happens to the posterior standard deviation of $f(0)$, which was 0.100?
{{< /note >}}

It falls to 0.071, a factor of $\sqrt 2$: two independent measurements of the same quantity average down the noise exactly as repeated laboratory measurements do. Nothing changes at $x = 3$, which is still three length-scales from any data. Repeating a measurement fights aleatoric noise; moving to a new location fights epistemic ignorance, and the posterior variance tells you which one is limiting.

In code, $(\mathbf K + \sigma_n^2\mathbf I)$ is factorised once by Cholesky decomposition, $\mathbf L\mathbf L^\top$, and both formulas follow by triangular solves. The cost is $\mathcal O(N^3)$ for $N$ training points, comfortable up to a few thousand points and the main limitation of exact GPs. Sparse approximations that summarise the data with $M \ll N$ inducing points reduce it to $\mathcal O(NM^2)$.

{{< note type="practice" title="Back of the envelope" >}}
A Cholesky factorisation costs about $N^3/3$ floating-point operations and the matrix needs $8N^2$ bytes in double precision. For $N = 10^4$ that is $3\times10^{11}$ operations, seconds on a workstation, and 0.8 GB. For $N = 10^5$ it is $3\times10^{14}$ operations and 80 GB, beyond a single node's memory for many groups. An interatomic-potential training set of 1,000 structures with 100 atoms each has $10^5$ atomic environments, which is why Gaussian approximation potentials select a few thousand representative environments as sparse points rather than using them all.
{{< /note >}}

## Choosing the kernel's hyperparameters

$\ell$, $\sigma_f$ and $\sigma_n$ are not fitted by the formulas above; they are chosen by maximising the **log marginal likelihood**, the probability of the observed data under the GP prior with all possible functions integrated out:

$$
\ln p(\mathbf y \mid \mathbf X, \boldsymbol\theta) = \underbrace{-\tfrac12\,\mathbf y^{\top}\mathbf K_y^{-1}\mathbf y}_{\text{data fit}} \;\underbrace{-\;\tfrac12\ln\lvert\mathbf K_y\rvert}_{\text{complexity penalty}} \;-\; \tfrac N2\ln 2\pi,
\qquad \mathbf K_y = \mathbf K + \sigma_n^2\mathbf I .
$$

The first term rewards fitting the data; the second penalises kernels that could explain *too many* different data sets (a very short length-scale can fit anything). The balance is an automatic Occam's razor, and it is why GPs rarely overfit badly. Press **Fit hyperparameters** in the lab after adding six or eight points; the readout shows the log marginal likelihood for whatever settings you choose by hand, and you can try to beat the optimiser.

{{< fig src="evidence.svg" alt="Plot against the length-scale on a log axis of the complexity term rising, the data-fit term flat and then plunging beyond a length-scale of about 1, and their sum, the log marginal likelihood, peaking at 0.84" caption="The two terms of the log marginal likelihood for the 12-point example of the In practice section below. Short length-scales fit the data but pay a complexity penalty; long ones cannot fit the data at all. The maximum, at ℓ = 0.84, matches the 0.846 found by scikit-learn." >}}

The figure shows the trade-off for the 12-point example used in the code below, with $\sigma_f$ and $\sigma_n$ held at their fitted values. The data-fit term is nearly flat for short length-scales, because a flexible enough GP can fit twelve points almost exactly, and collapses beyond $\ell \approx 1.2$, where the GP is too stiff to follow the oscillations. The complexity term rises steadily with $\ell$, because a stiffer prior concentrates its probability on fewer data sets. The sum peaks at $\ell = 0.84$.

{{< note type="warn" title="Common mistakes when fitting hyperparameters" >}}
- **Several maxima.** The marginal likelihood is often multimodal. A common pair is a short length-scale with small noise, which treats wiggles as signal, and a long length-scale with large noise, which treats them as noise. Restart the optimiser from several initial values (`n_restarts_optimizer` in scikit-learn) and compare the maxima, not just the first one found.
- **Unscaled inputs.** A single length-scale for inputs in ångströms and in kelvin cannot be right. Scale inputs, or use one length-scale per input dimension (automatic relevance determination); a fitted length-scale far larger than the input range says that input hardly matters.
- **Too few points for the hyperparameters.** With five or six points the marginal likelihood is too flat to pin down three hyperparameters. Fix the noise level from what you know about the measurement and fit only $\ell$ and $\sigma_f$.
{{< /note >}}

{{< note type="warn" title="Myth" >}}
*A GP's error bar accounts for everything the model does not know.* It accounts for what the model does not know *given that the kernel is right*. The posterior variance does not depend on the measured values at all, only on where they are, so a GP with fixed hyperparameters reports the same uncertainty whether the data agree with its prior or contradict it violently. If the true function has a sharp step, an RBF kernel will smooth it and report confident error bars on both sides. Refitting the hyperparameters partly repairs this, and checking calibration on held-out data is the only way to know.
{{< /note >}}

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

{{< note type="practice" title="From the lab: choosing the next experiment" >}}
The posterior mean and variance are exactly what is needed to decide where to measure next. **Bayesian optimisation** fits a GP to the measurements so far and picks the next input by maximising an acquisition function that balances a good predicted value against high uncertainty. The **expected improvement**, popularised for expensive engineering simulations by Jones, Schonlau and Welch in 1998, is the expected amount by which a new measurement would beat the best value seen so far; the **upper confidence bound** is simply $\mu + \beta\sigma$ for a chosen $\beta$. With a few tens of measurements this routinely finds good synthesis conditions, alloy compositions or process parameters in far fewer experiments than a grid. The [lesson on active learning](../active-learning/) develops the idea.
{{< /note >}}

## Uncertainty for neural networks

Neural networks do not provide uncertainties by default, and a single network can be confidently wrong far from its training data. The practical options are:

- **Deep ensembles.** Train $M$ networks (typically 5) from different random initialisations and use the spread of their predictions as the uncertainty. Simple, robust and the usual choice for machine-learned interatomic potentials, where the disagreement between ensemble members flags configurations that need a new DFT calculation.
- **Monte Carlo dropout.** Keep dropout active at prediction time and average many stochastic forward passes; cheaper, but usually less reliable than ensembles.
- **Last-layer and Laplace approximations.** Treat only the final layer (or a local Gaussian around the trained weights) probabilistically.
- **Conformal prediction.** A distribution-free wrapper: use the errors on a held-out calibration set to turn any model's predictions into intervals with a guaranteed coverage, for example 90% of future values fall inside. It assumes only that calibration and future data are exchangeable, so it cannot rescue extrapolation.

The costs differ by orders of magnitude. An ensemble of five networks costs five times as much to train and to evaluate, which for an interatomic potential running $10^6$ MD steps is a real price; for this reason several codes train a single model with a few output heads, or ensemble only the last layer. Conformal prediction costs almost nothing. In its simplest, *split* form, hold out $n$ calibration points, compute the absolute residuals $|y_i - \hat y_i|$ of the trained model on them, and take as the half-width of every future interval the $\lceil (n+1)(1-\alpha)\rceil$-th smallest residual. With $n = 99$ calibration structures and $\alpha = 0.1$ that is the 90th smallest, and on exchangeable data at least 90 percent of future values fall inside. The interval has the same width everywhere unless the residuals are first scaled by a per-point difficulty estimate, such as an ensemble spread, which combines the coverage guarantee with the adaptivity of the other methods.

Whatever the method, **check the calibration**: on held-out data, about 95% of true values should fall inside the predicted 95% intervals. Over-confident uncertainties are worse than none, because they are trusted.

{{< fig src="calibration.svg" alt="Calibration plot of the fraction of test points inside the predicted interval against the nominal coverage: the curve for the true length-scale lies on the diagonal, a curve for a too-long length-scale lies far below it, reaching only about 0.5 at nominal 0.95, and a curve for a too-short length-scale lies above it" caption="Coverage of GP intervals on 300 random functions drawn with length-scale 1, each observed at 10 points. With the right length-scale the intervals mean what they say; a GP that assumes the function is three times smoother than it is puts only 48 percent of test points inside its nominal 95 percent intervals." >}}

A calibration curve is computed by counting, for each nominal level, the fraction of held-out points that fall inside the predicted intervals, using $|y - \mu|/\sigma$ for Gaussian predictions. In the figure, functions are drawn from a GP with $\ell = 1$ and predicted with three length-scales. The right one gives 95.3 percent coverage at nominal 95. Assuming $\ell = 3$ gives 48 percent: the model believes far-away data constrain the function and draws narrow bands where it should be uncertain. Assuming $\ell = 0.3$ gives 98.6 percent, with intervals wider than necessary. Over-confidence of the first kind is the common failure of neural-network ensembles far from training data. A single scale factor on all predicted standard deviations, fitted on a validation set, often fixes most of it, and the **negative log-likelihood** of held-out data, which punishes both over- and under-confidence, is a better single score for comparing uncertainty methods than RMSE.

{{< note type="practice" title="From the lab: learning a potential on the fly" >}}
Uncertainty estimates are what make on-the-fly training of interatomic potentials possible. During a molecular-dynamics run, the potential predicts energies and forces together with their uncertainty; when the uncertainty for the current configuration exceeds a threshold, the run pauses, a DFT calculation is performed, the new data are added and the model is refitted. Jinnouchi, Kresse and colleagues (2019) developed this scheme with kernel-based Bayesian regression, now part of VASP, and used it to simulate phase transitions of hybrid perovskites; the FLARE code of Vandermause, Kozinsky and colleagues (2020) does the same with sparse GPs. Once the model has seen the relevant configurations, only a small fraction of MD steps need DFT, and the uncertainty threshold, not the user, decides which ones.
{{< /note >}}

{{< note type="fun" >}}
Gaussian processes and neural networks are closer relatives than they look. Radford Neal showed in his 1996 book that a network with one hidden layer and random weights becomes a Gaussian process as the number of hidden units goes to infinity, because the output is a sum of many independent contributions and the central limit theorem applies. The kernel is set by the activation function and the weight variances. The result was extended to deep networks in 2018, and it is one of the starting points of the theory of very wide networks.
{{< /note >}}

{{< note type="key" >}}
- Aleatoric uncertainty is noise in the data and survives more data; epistemic uncertainty is ignorance of the function and shrinks where data are added.
- A Gaussian process is a prior over functions set by a kernel; conditioning on noisy data gives the posterior mean and variance in closed form, at $\mathcal O(N^3)$ cost.
- The posterior variance depends only on where the data are and on the kernel; it returns to the prior far from the data and to about $\sigma_n^2$ at a measured point.
- Kernel hyperparameters are fitted by maximising the log marginal likelihood, which balances data fit against complexity; restart it from several initial values.
- Any uncertainty estimate, from a GP, an ensemble or conformal prediction, must be checked for calibration on held-out data.
{{< /note >}}

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
- q: "A GP with $\\sigma_f = 1$, $\\ell = 1$ and $\\sigma_n = 0.1$ has one measurement at $x = 0$. Roughly what is the posterior standard deviation of $f$ at $x = 3$?"
  options: ["About 0.1, the noise level", "About 0.5", "About 1, the prior value"]
  answer: 2
  why: "Three length-scales away the kernel is $e^{-4.5} \\approx 0.011$, so the measurement barely informs that point and the variance stays at its prior value, $\\sigma_f^2 = 1$."
- q: "On held-out data, only 60% of the true values fall inside a model's nominal 95% intervals. What does this mean?"
  options: ["The model is under-confident", "The model is over-confident: its intervals are too narrow", "The model's mean predictions must be biased"]
  answer: 1
  why: "Too few points inside the intervals means the predicted uncertainties are too small. A GP whose length-scale is too long, or an ensemble whose members agree too readily, behaves this way."
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
9. D. G. Krige, “A statistical approach to some basic mine valuation problems on the Witwatersrand,” *Journal of the Chemical, Metallurgical and Mining Society of South Africa* **52**, 119–139 (1951).
10. R. M. Neal, *Bayesian Learning for Neural Networks*, Lecture Notes in Statistics 118, Springer (1996).
11. M. L. Stein, *Interpolation of Spatial Data: Some Theory for Kriging*, Springer (1999).
12. D. R. Jones, M. Schonlau and W. J. Welch, “Efficient global optimization of expensive black-box functions,” *Journal of Global Optimization* **13**, 455–492 (1998).
13. R. Jinnouchi, J. Lahnsteiner, F. Karsai, G. Kresse and M. Bokdam, “Phase transitions of hybrid perovskites simulated by machine-learning force fields trained on the fly with Bayesian inference,” *Physical Review Letters* **122**, 225701 (2019).
14. J. Vandermause, S. B. Torrisi, S. Batzner, Y. Xie, L. Sun, A. M. Kolpak and B. Kozinsky, “On-the-fly active learning of interpretable Bayesian force fields for atomistic rare events,” *npj Computational Materials* **6**, 20 (2020).

</div>
