---
title: "Learning from data"
description: "What it means for a model to learn, why least squares is the default, where it comes from in probability, and what changes when you pick a different loss."
track: ml
weight: 1
level: Foundation
minutes: 35
lab: "Fit a line by hand, then by least squares"
---

## The question

You measured a rate constant at six temperatures and want the activation energy. You computed the adsorption energy of a molecule on twenty surfaces and want to predict it for a twenty-first. In both cases you have pairs $(x_i, y_i)$ and want a rule $f$ that turns a new $x$ into a good guess of $y$. That is **supervised learning**, and almost everything in this course is a version of it: the rule gets more flexible (a line, a neural network, an interatomic potential), but the recipe stays the same.

The recipe has three ingredients:

1. a **model** $f(x;\boldsymbol\theta)$, a family of functions indexed by parameters $\boldsymbol\theta$;
2. a **loss** $\ell(y, \hat y)$ that says how bad a prediction $\hat y$ is when the truth is $y$;
3. an **optimiser** that searches for the parameters with the smallest average loss on the data.

Minimising the average loss over a data set $\mathcal D = \{(x_i,y_i)\}_{i=1}^N$ is called **empirical risk minimisation**:

$$
\hat{\boldsymbol\theta} = \arg\min_{\boldsymbol\theta}\; \frac{1}{N}\sum_{i=1}^{N} \ell\big(y_i, f(x_i;\boldsymbol\theta)\big).
$$

The word *empirical* matters. What we really want is a small error on data we have *not* seen, the expected loss over the whole population. We can only measure it on the sample we have, which is why the lesson on [generalisation](../generalisation/) exists.

## The simplest model: a straight line

Take $f(x; w, b) = wx + b$ and the squared loss $\ell = (y - \hat y)^2$. The objective is the **sum of squared residuals**

$$
L(w,b) = \sum_{i=1}^{N} \big(y_i - w x_i - b\big)^2 .
$$

$L$ is a smooth bowl in $(w,b)$, so the minimum is where both partial derivatives vanish:

$$
\frac{\partial L}{\partial b} = -2\sum_i (y_i - w x_i - b) = 0, \qquad
\frac{\partial L}{\partial w} = -2\sum_i x_i\,(y_i - w x_i - b) = 0 .
$$

The first equation says the residuals sum to zero, so the line passes through the centroid $(\bar x, \bar y)$. Substituting $b = \bar y - w\bar x$ into the second gives the familiar result

$$
\hat w = \frac{\sum_i (x_i-\bar x)(y_i-\bar y)}{\sum_i (x_i-\bar x)^2}, \qquad \hat b = \bar y - \hat w\,\bar x .
$$

{{< widget name="regression" title="Fit a line by hand, then let least squares do it" caption="Red segments are residuals. In “Fit it yourself” mode the dashed line is the least-squares answer: try to get your mean squared error down to it. Then add an outlier and compare the two automatic fits." >}}

Try three things in the lab. First, fit the line yourself with the sliders and notice how hard it is to beat least squares; no other line has a smaller mean squared error, by construction. Second, press **Add an outlier** and watch the least-squares line swing towards it. Third, switch to **least absolute deviation** with the outlier still there. The squared loss punishes a residual of 4 sixteen times more than a residual of 1, so a single bad point can dominate; the absolute loss punishes it only four times more.

## The matrix form, which every later model reuses

Stack the inputs into a **design matrix** $\mathbf X$ whose rows are feature vectors, here $(1, x_i)$, and the targets into $\mathbf y$. Then $\hat{\mathbf y} = \mathbf X\boldsymbol\theta$ and

$$
L(\boldsymbol\theta) = \lVert \mathbf y - \mathbf X\boldsymbol\theta \rVert^2 .
$$

Setting the gradient $\nabla_{\boldsymbol\theta} L = -2\mathbf X^{\top}(\mathbf y - \mathbf X\boldsymbol\theta)$ to zero gives the **normal equations**

$$
\mathbf X^{\top}\mathbf X\,\hat{\boldsymbol\theta} = \mathbf X^{\top}\mathbf y .
$$

Geometrically, $\mathbf X\hat{\boldsymbol\theta}$ is the orthogonal projection of $\mathbf y$ onto the column space of $\mathbf X$: the residual vector is perpendicular to every feature column. Numerically, never form $(\mathbf X^\top\mathbf X)^{-1}$ explicitly; squaring $\mathbf X$ squares its condition number. Libraries solve the problem with a QR or singular-value decomposition instead (`numpy.linalg.lstsq` uses the SVD).

{{< note type="key" title="Linear in the parameters, not in x" >}}
"Linear regression" means linear in $\boldsymbol\theta$. The columns of $\mathbf X$ can be any fixed functions of the input: $x^2$, $\sin x$, $1/T$, $\ln c$. The Arrhenius equation $k = A\,e^{-E_a/RT}$ becomes linear after a logarithm, $\ln k = \ln A - (E_a/R)(1/T)$, with features $(1, 1/T)$. Polynomial fits, Fourier fits and the descriptor-based potentials in [the lesson on interatomic potentials](../mlip/) are all linear models in this sense. Neural networks are the first models in the course that are *not*.
{{< /note >}}

## Where least squares comes from: maximum likelihood

Why squares and not absolute values or fourth powers? Suppose each measurement is the true line plus independent Gaussian noise of width $\sigma$:

$$
y_i = w x_i + b + \varepsilon_i, \qquad \varepsilon_i \sim \mathcal N(0, \sigma^2).
$$

The probability density of the whole data set, viewed as a function of the parameters, is the **likelihood**

$$
p(\mathbf y \mid \mathbf X, w, b) = \prod_{i=1}^N \frac{1}{\sqrt{2\pi\sigma^2}} \exp\!\left[-\frac{(y_i - wx_i - b)^2}{2\sigma^2}\right].
$$

Taking the negative logarithm,

$$
-\ln p = \frac{1}{2\sigma^2}\sum_i (y_i - wx_i - b)^2 + \frac{N}{2}\ln(2\pi\sigma^2),
$$

and the only part that depends on $w$ and $b$ is the sum of squares. **Least squares is maximum likelihood under Gaussian noise.** Every other loss corresponds to a different noise model: the absolute loss is maximum likelihood for Laplace (double-exponential) noise, whose heavier tails make outliers less surprising, which is why that fit ignored the outlier.

The same view tells you what to do when the error bars differ from point to point. If point $i$ has standard deviation $\sigma_i$, the likelihood gives **weighted least squares**, $\sum_i (y_i-\hat y_i)^2/\sigma_i^2$: precise points count more. Fitting $\ln k$ instead of $k$ silently changes the weights, because a constant relative error in $k$ is a constant absolute error in $\ln k$. That is usually what you want for rate constants, and it is worth knowing you chose it.

## How good is the fit?

Three numbers are worth reporting.

- The **root-mean-square error**, $\text{RMSE} = \sqrt{L/N}$, in the units of $y$. Compare it with the measurement uncertainty: a fit far better than your error bars is suspicious.
- The **coefficient of determination**, $R^2 = 1 - \sum_i (y_i - \hat y_i)^2 / \sum_i (y_i - \bar y)^2$, the fraction of the variance of $y$ the model explains. $R^2$ says nothing about whether the model is *right*: a straight line through curved data can still give $R^2 = 0.98$. Always look at the residuals; they should look like noise, with no trend.
- **Uncertainties on the parameters.** Under the Gaussian model the covariance of the estimate is $\operatorname{cov}(\hat{\boldsymbol\theta}) = \hat\sigma^2(\mathbf X^\top\mathbf X)^{-1}$ with $\hat\sigma^2 = L/(N-p)$ for $p$ parameters. An activation energy without an error bar is not a result.

## In practice

The calculation in NumPy, here for an Arrhenius plot (run it locally, or in the [Python lesson](../python-for-science/)):

```python
import numpy as np

T = np.array([300., 310., 320., 330., 340., 350.])           # K
k = np.array([1.2e-3, 2.4e-3, 4.6e-3, 8.5e-3, 1.5e-2, 2.6e-2])  # 1/s
R = 8.314462618                                              # J/(mol K)

X = np.column_stack([np.ones_like(T), 1.0 / T])   # features (1, 1/T)
y = np.log(k)
theta, res, rank, sv = np.linalg.lstsq(X, y, rcond=None)
lnA, slope = theta

N, p = X.shape
s2 = res[0] / (N - p)                         # residual variance
cov = s2 * np.linalg.inv(X.T @ X)             # acceptable for a tiny 2×2 problem
Ea = -slope * R / 1000                        # kJ/mol
dEa = np.sqrt(cov[1, 1]) * R / 1000
print(f"Ea = {Ea:.1f} ± {dEa:.1f} kJ/mol,  A = {np.exp(lnA):.2e} 1/s")
```

This prints `Ea = 53.7 ± 0.1 kJ/mol,  A = 2.65e+06 1/s`. For nonlinear models, where no normal equations exist, `scipy.optimize.curve_fit` does the same job iteratively; the next lesson explains how such iterative optimisers work.

{{< note type="warn" >}}
**Extrapolation.** A model is only tested where you have data. A line fitted between 300 and 350 K says nothing reliable at 600 K, where a different mechanism may take over. This is the single most common failure of machine-learning models in science, and it gets worse, not better, as models become more flexible.
{{< /note >}}

{{< quiz >}}
- q: "You fit $\\ln k$ against $1/T$ with ordinary least squares. Which assumption about the measurement errors in $k$ are you implicitly making?"
  options: ["That the absolute error in $k$ is the same at every temperature", "That the relative error in $k$ is roughly the same at every temperature", "That there are no errors in $k$, only in $T$"]
  answer: 1
  why: "A constant relative error $\\delta k/k$ becomes a constant absolute error in $\\ln k$, because $\\delta(\\ln k) = \\delta k/k$. Ordinary least squares on $\\ln k$ weights all points equally, which matches that assumption."
- q: "Which of these models is a *linear* regression problem?"
  options: ["$y = a\\,e^{-bx}$ fitted directly for $a$ and $b$", "$y = a + b\\sin x + c\\,x^2$", "$y = a/(1 + e^{-b(x-c)})$"]
  answer: 1
  why: "Linear regression means linear in the parameters. $a + b\\sin x + c\\,x^2$ is a weighted sum of fixed features $(1, \\sin x, x^2)$. The other two have parameters inside a nonlinear function."
- q: "One data point is a gross outlier. Which fit is least affected by it?"
  options: ["Least squares", "Least absolute deviation", "Both are affected equally"]
  answer: 1
  why: "The squared loss grows quadratically with the residual, so one large residual dominates the sum. The absolute loss grows linearly; it corresponds to maximum likelihood under heavier-tailed Laplace noise."
- q: "A straight-line fit gives $R^2 = 0.97$. What does that tell you?"
  options: ["The relationship is linear", "The line explains 97% of the variance of $y$ in this data set, but the residuals must still be checked for a trend", "The parameters are known to 3%"]
  answer: 1
  why: "$R^2$ measures explained variance, not correctness. Curved data can give a high $R^2$ for a straight line; a systematic pattern in the residuals reveals it."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. C. M. Bishop, *Pattern Recognition and Machine Learning*, Springer (2006), §1.1–1.2 and chapter 3 (linear models for regression).
2. T. Hastie, R. Tibshirani and J. Friedman, *The Elements of Statistical Learning*, 2nd ed., Springer (2009), chapter 3.
3. K. P. Murphy, *Probabilistic Machine Learning: An Introduction*, MIT Press (2022), chapters 4 (statistics) and 11 (linear regression).
4. W. H. Press, S. A. Teukolsky, W. T. Vetterling and B. P. Flannery, *Numerical Recipes*, 3rd ed., Cambridge University Press (2007), chapter 15 (modelling of data), including why the SVD is preferred to the normal equations.
5. P. J. Huber, “Robust estimation of a location parameter,” *Annals of Mathematical Statistics* **35**, 73–101 (1964), the origin of robust losses.

</div>
