---
title: "Learning from data"
description: "What it means for a model to learn, why least squares is the default, where it comes from in probability, and what changes when you pick a different loss."
hook: "Why square the errors rather than take their absolute values? Gauss's answer, in 1809, was a statement about noise, and the same recipe of model, loss and optimiser trains every network in this book."
objectives:
  - "Derive the least-squares line and the normal equations by setting gradients to zero"
  - "Explain why least squares is maximum likelihood under Gaussian noise"
  - "Compute a straight-line fit, its R² and parameter error bars by hand and in NumPy"
  - "Choose between squared, absolute and weighted losses for noisy or outlier-prone data"
  - "Recognise correlated parameters and extrapolation as the commonest ways to misread a fit"
cover: "cover.svg"
milestones:
  - year: 1805
    text: "Legendre publishes the method of least squares in a work on comet orbits"
  - year: 1809
    text: "Gauss derives least squares from the normal law of errors"
  - year: 1886
    text: "Galton describes regression towards the mean in the heights of children"
  - year: 1964
    text: "Huber introduces robust estimation, capping the pull of outlying points"
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

### A physical picture: springs

There is a mechanical way to see this result. Join each data point to a rigid rod with a vertical spring of stiffness $k$, attached through a frictionless ring so that it stays vertical however the rod tilts. A spring stretched by the residual $r_i = y_i - wx_i - b$ stores energy $\tfrac12 k r_i^2$, so the total stored energy is $\tfrac12 k\,L(w,b)$, and a rod released among the springs settles exactly on the least-squares line. The two equations above are the two conditions of mechanical equilibrium: $\sum_i r_i = 0$ says the net vertical force on the rod vanishes, and $\sum_i x_i r_i = 0$ says the net torque vanishes.

The picture also explains what the outlier did in the lab. A spring stretched four times as far pulls four times as hard, so one distant point can drag the whole rod. The absolute loss corresponds to strange springs that pull with the same force however far they are stretched, because the slope of $|r|$ is $\pm 1$ everywhere, and then one distant point cannot dominate.

{{< fig src="springs.svg" alt="Six orange data points joined to a thick blue rod by vertical teal springs, each ending in a white ring on the rod; a violet diamond marks the centroid on the rod" caption="Least squares as mechanics. Each spring stores energy proportional to the squared residual, so the rod comes to rest on the least-squares line. Force balance puts the centroid on the line; torque balance fixes the slope." >}}

The torque condition also says which points matter most for the slope. A point far from $\bar x$ has a long lever arm, so the same residual exerts a larger torque there than near the centroid. Such a point has high **leverage**: in a composition series measured at $x = 0, 0.1, 0.2, 0.3$ and $1.0$, the pure end member alone decides most of the slope. The standard diagnostic is to refit with each point left out in turn and see how far the parameters move (Cook's distance, R. D. Cook, 1977, formalises this).

### A worked example: Vegard's law by hand

Real numbers make the formulas concrete. **Vegard's law** (1921) says that the lattice parameter of a solid solution varies roughly linearly between those of its two end members. Nickel and copper are both face-centred cubic, with lattice parameters of 3.524 Å and 3.615 Å, they mix at every composition, and their alloys follow the law closely. Here are five illustrative measurements on Ni₁₋ₓCuₓ:

| copper fraction $x$ | 0 | 0.25 | 0.50 | 0.75 | 1.00 |
|---|---|---|---|---|---|
| lattice parameter $a$ (Å) | 3.525 | 3.546 | 3.572 | 3.593 | 3.614 |

1. **Means.** $\bar x = 0.5$ and $\bar a = 17.850/5 = 3.570$ Å.
2. **Deviations.** $x_i - \bar x = -0.5, -0.25, 0, 0.25, 0.5$ and $a_i - \bar a = -0.045, -0.024, 0.002, 0.023, 0.044$ Å.
3. **Sums.** $\sum_i (x_i-\bar x)^2 = 0.625$ and $\sum_i (x_i-\bar x)(a_i-\bar a) = 0.0225 + 0.0060 + 0 + 0.00575 + 0.0220 = 0.05625$ Å.
4. **Parameters.** $\hat w = 0.05625/0.625 = 0.0900$ Å and $\hat b = 3.570 - 0.090 \times 0.5 = 3.525$ Å.

The fitted line predicts 3.525 Å for pure nickel and 3.615 Å for pure copper, both within a thousandth of an ångström of the handbook values. The residuals are 0, −1.5, +2.0, +0.5 and −1.0 mÅ. They sum to zero, as the force balance demands, and they show no trend. That last check matters more than it seems: in real alloys the interesting physics often lives in the residuals, and a systematic bow away from the straight line signals that the solid solution is not an ideal mixture.

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

{{< note type="practice" title="From the lab: the equation of state" >}}
The first calculation most people run on a new crystal with density functional theory is an energy–volume curve: the energy at seven or so volumes within a few percent of equilibrium, fitted to an equation of state to obtain the equilibrium volume $V_0$ and the bulk modulus $B_0$. The third-order **Birch–Murnaghan** equation, from Francis Birch's 1947 analysis of finite strain, looks forbidding, but expanded it is a cubic polynomial in $V^{-2/3}$:

$$ E(V) = a + b\,V^{-2/3} + c\,V^{-4/3} + d\,V^{-2}. $$

The fit is therefore *linear* least squares with features $(1, V^{-2/3}, V^{-4/3}, V^{-2})$: one call to `lstsq`, no starting guess, no risk of converging to a spurious minimum. $V_0$ is the root of $dE/dV = 0$ near the lowest computed energy, and $B_0 = V_0\, d^2E/dV^2$ there. Most codes fit the same equation by nonlinear least squares in $(E_0, V_0, B_0, B_0')$; the linear form is a quick cross-check and a starting guess that cannot fail.
{{< /note >}}

The cell below repeats the Vegard fit through the design matrix, then tests the claim from the lab about outliers. It adds a sixth, bad sample, as if one alloy's composition had been recorded wrongly, and refits with both losses.

{{< note type="try" title="Pause and predict" >}}
The bad sample sits at $x = 0.9$ with a lattice parameter of 3.540 Å, about 0.065 Å below the line. Before running the cell, guess how much it changes the least-squares slope of 0.090 Å: by 3 percent, 30 percent or 300 percent? Then guess what the absolute loss does.
{{< /note >}}

{{< py title="least squares, then an outlier" >}}
import numpy as np
x = np.array([0.0, 0.25, 0.5, 0.75, 1.0])           # copper fraction x in Ni(1-x)Cu(x)
a = np.array([3.525, 3.546, 3.572, 3.593, 3.614])   # lattice parameter in Å

X = np.column_stack([np.ones_like(x), x])           # design matrix, columns (1, x)
theta = np.linalg.lstsq(X, a, rcond=None)[0]
r = a - X @ theta
print("b, w =", theta.round(4), "  residuals in mÅ:", (1000 * r).round(1))
print("R² =", round(1 - r @ r / np.sum((a - a.mean())**2), 4))

# one bad sample: an alloy whose composition was recorded wrongly
x2, a2 = np.append(x, 0.9), np.append(a, 3.540)
X2 = np.column_stack([np.ones_like(x2), x2])
ls = np.linalg.lstsq(X2, a2, rcond=None)[0]
lad = ls.copy()
for _ in range(200):          # least absolute deviation by iterative reweighting
    q = 1 / np.maximum(np.abs(a2 - X2 @ lad), 1e-9)
    lad = np.linalg.solve(X2.T @ (q[:, None] * X2), X2.T @ (q * a2))
print("with the outlier, squared loss  b, w =", ls.round(4))
print("with the outlier, absolute loss b, w =", lad.round(4))
{{< /py >}}

Least squares returns the hand-computed $b = 3.525$ Å and $w = 0.090$ Å. With the bad point included, the squared loss drags the slope down to 0.061 Å, an error of a third caused by one sample in six, while the absolute loss keeps it at 0.089 Å. The absolute-loss fit uses a trick worth knowing, **iteratively reweighted least squares**: give each point the weight $1/|r_i|$ from the previous fit, so that the weighted sum of squares $\sum_i r_i^2/|r_i|$ equals $\sum_i |r_i|$, solve, and repeat. The lab computes its least-absolute-deviation line the same way.

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

{{< fig src="losses.svg" alt="Three panels: Gaussian and Laplace probability densities on a logarithmic axis; the squared, absolute and Huber losses against the residual; and the derivative of each loss, which is linear, constant, or linear then capped" caption="Each loss is a noise model read backwards. With equal variance, Laplace noise makes a $4\sigma$ residual 18 times more probable than Gaussian noise, so its loss grows only linearly and the pull of a distant point (right, the derivative of the loss) stays constant. The Huber loss, drawn with threshold $2\sigma$, is squared near zero and linear beyond." >}}

The right-hand panel is the spring force of the previous section. The pull a point exerts on the fit is the derivative of its loss, $\ell'(r)$, which for the squared loss grows without limit. Peter Huber's 1964 compromise is a loss that is quadratic for $|r| < \delta$ and linear beyond: points inside the threshold are treated exactly as in least squares, and no single point can pull harder than $\delta$. With $\delta = 1.345\,\sigma$ the Huber estimate keeps 95 percent of the efficiency of least squares when the noise really is Gaussian, while a handful of gross errors barely moves it. It is computed with the same iterative reweighting as the absolute loss, and `scipy.optimize.least_squares(..., loss="huber", f_scale=delta)` provides it for nonlinear models.

{{< note type="warn" title="Myth" >}}
*Least squares is only valid if the noise is Gaussian.* If the errors have zero mean, equal variance and no correlation with one another, the least-squares estimate is unbiased and has the smallest variance of any estimator that is linear in the data, whatever the shape of the noise distribution. This is the **Gauss–Markov theorem**, which Gauss proved in the 1820s. Gaussian noise adds two things: the maximum-likelihood interpretation, and exact confidence intervals from the $t$ distribution. What least squares does not survive is heavy-tailed noise, where nonlinear estimators such as Huber's beat every linear one, and unequal or correlated errors, which need the weighting described next.
{{< /note >}}

{{< note type="story" >}}
Least squares was published first by Adrien-Marie Legendre, in an 1805 appendix to a work on the orbits of comets. Carl Friedrich Gauss, who had become famous in 1801 by computing from a few weeks of observations where the newly discovered Ceres would reappear from behind the Sun, published his own treatment in 1809 and claimed to have used the method since 1795, which started a long priority dispute. Gauss's lasting contribution was the justification. He asked which law of errors makes the arithmetic mean of repeated measurements the most probable value, found the bell curve that now carries his name, and showed that under it least squares gives the most probable parameters: the argument of this section. The word *regression* came later, from Francis Galton's 1886 study of how the heights of children regress towards the population average.
{{< /note >}}

The same view tells you what to do when the error bars differ from point to point. If point $i$ has standard deviation $\sigma_i$, the likelihood gives **weighted least squares**, $\sum_i (y_i-\hat y_i)^2/\sigma_i^2$: precise points count more. Fitting $\ln k$ instead of $k$ silently changes the weights, because a constant relative error in $k$ is a constant absolute error in $\ln k$. That is usually what you want for rate constants, and it is worth knowing you chose it.

### The same recipe for categories

The likelihood view also says what to do when $y$ is not a number but a category. Is this compound stable against decomposition or not? Is this diffraction pattern from the cubic or the tetragonal phase? With labels $y_i \in \{0, 1\}$, Gaussian noise makes no sense. The natural model outputs a probability $p_i$ that the label is 1 and treats each observed label as the outcome of a biased coin toss, a Bernoulli trial. The likelihood of all the labels is $\prod_i p_i^{\,y_i}(1-p_i)^{1-y_i}$, and its negative logarithm is the **cross-entropy** loss,

$$
-\sum_{i=1}^{N} \Big[\, y_i \ln p_i + (1-y_i)\ln(1-p_i) \,\Big].
$$

Supervised learning therefore splits into **regression**, for continuous targets, and **classification**, for categories, but the recipe does not change: choose a noise model, write down its likelihood, and minimise its negative logarithm. A straight line cannot serve as $p_i$, because its output runs off to plus and minus infinity. Classification needs a model whose output stays between 0 and 1, and the [artificial neuron](../the-neuron/) is exactly that; [the chapter on how it learns](../how-a-neuron-learns/) takes the gradient of this loss.

## How good is the fit?

Three numbers are worth reporting.

- The **root-mean-square error**, $\text{RMSE} = \sqrt{L/N}$, in the units of $y$. Compare it with the measurement uncertainty: a fit far better than your error bars is suspicious.
- The **coefficient of determination**, $R^2 = 1 - \sum_i (y_i - \hat y_i)^2 / \sum_i (y_i - \bar y)^2$, the fraction of the variance of $y$ the model explains. $R^2$ says nothing about whether the model is *right*: a straight line through curved data can still give $R^2 = 0.98$. Always look at the residuals; they should look like noise, with no trend.
- **Uncertainties on the parameters.** Under the Gaussian model the covariance of the estimate is $\operatorname{cov}(\hat{\boldsymbol\theta}) = \hat\sigma^2(\mathbf X^\top\mathbf X)^{-1}$ with $\hat\sigma^2 = L/(N-p)$ for $p$ parameters. An activation energy without an error bar is not a result.

For the Vegard fit above, the sum of squared residuals is $7.5\times10^{-6}$ Å², so the RMSE is 1.2 mÅ and $R^2 = 1 - 7.5\times10^{-6}/5.07\times10^{-3} = 0.9985$. With $N - p = 3$ degrees of freedom the noise estimate is $\hat\sigma = \sqrt{7.5\times10^{-6}/3} = 1.6$ mÅ. For a straight line the slope element of the covariance matrix reduces to $\hat\sigma^2/\sum_i (x_i-\bar x)^2$, so the standard error of the slope is $1.6/\sqrt{0.625} = 2.0$ mÅ, and the result to report is $w = 0.090 \pm 0.002$ Å per unit copper fraction.

{{< note type="warn" title="Correlated parameters" >}}
Parameter error bars are rarely independent. In the Arrhenius fit of the next section, the estimates of $\ln A$ and $E_a$ have a correlation coefficient of −0.9986. The data, between 300 and 350 K, pin down the slope and the height of the line in the middle of the range, but $\ln A$ is the intercept at $1/T = 0$, an infinite temperature far outside the data, so any error in the slope swings the intercept the opposite way. Quoting the two error bars as if they were independent misstates the uncertainty of every prediction made from them. Worse, plotting $\ln A$ against $E_a$ for a series of related fits can produce a convincing straight line that is nothing but this correlation, a spurious “compensation effect”. The cure is to centre the feature: fit against $1/T - \overline{1/T}$, and $\mathbf X^\top\mathbf X$ becomes diagonal, so the intercept and slope are uncorrelated. Otherwise, report the full covariance matrix.
{{< /note >}}

{{< fig src="compensation.svg" alt="Two scatter plots of 400 sampled parameter pairs: on the left activation energy against ln A falls on a thin straight line; on the right activation energy against ln k at 324 K forms a round, uncorrelated cloud" caption="Four hundred parameter sets consistent with the Arrhenius data of the next section if each rate constant carries a 5 percent error. In the raw form (left), $E_a$ and $\ln A$ lie on a line that looks like a compensation effect but is pure statistics. Expressed through $\ln k$ at the centre of the data, 324 K (right), the same uncertainty is uncorrelated." >}}

### How many measurements do you need?

The standard error of the slope, $\hat\sigma/\sqrt{\sum_i (x_i-\bar x)^2}$, answers a question that comes up whenever an experiment or a set of calculations is planned: how many points, and where? For $N$ points spread evenly over a range $\Delta$ of the input, $\sum_i (x_i-\bar x)^2 \approx N\Delta^2/12$, so

$$ \sigma_w \approx \frac{\sqrt{12}\,\sigma}{\sqrt N\,\Delta}. $$

{{< note type="practice" title="Back of the envelope" >}}
Rate constants measured to 5 percent give $\sigma \approx 0.05$ in $\ln k$. Six temperatures from 300 to 350 K span $\Delta(1/T) = 1/300 - 1/350 = 4.8\times10^{-4}$ K⁻¹. Then $\sigma_w \approx 3.46 \times 0.05/(2.45 \times 4.8\times10^{-4}) \approx 150$ K, and since $E_a = -Rw$, the activation energy is uncertain by $R\,\sigma_w \approx 8.3 \times 150 \approx 1.2$ kJ/mol. The exact sum over the six temperatures gives 1.0 kJ/mol.
{{< /note >}}

{{< note type="try" title="Pause and predict" >}}
You can afford six more measurements. Is it better to fill in the same range, giving twelve points between 300 and 350 K, or to keep six points and spread them from 300 to 400 K?
{{< /note >}}

Twelve points between 300 and 350 K bring the error bar on $E_a$ from 1.0 to 0.80 kJ/mol. Six points from 300 to 400 K bring it to 0.60 kJ/mol, with half the experiments. The error falls only as $1/\sqrt N$ but as $1/\Delta$, and $\Delta(1/T)$ grows from $4.8$ to $8.3\times10^{-4}$ K⁻¹. Widening the range is almost always the better buy, provided the same mechanism operates across it; a curved Arrhenius plot over the wider range is itself a finding.

### When $x$ is noisy too

Ordinary least squares assumes the inputs are exact and all the noise is in $y$. When the inputs are also uncertain (compositions from a quick EDX scan, temperatures from a thermocouple that lags the sample, descriptors that are themselves computed with error), the fitted slope is biased towards zero. If the measured $x$ scatters about the true values with variance $\sigma_x^2$ and the true inputs have variance $s_x^2$, the slope shrinks on average by the factor $s_x^2/(s_x^2 + \sigma_x^2)$, an effect called **attenuation** or regression dilution. Input noise with half the spread of the inputs underestimates the slope by 20 percent, and more data does not help, because the bias does not shrink with $N$. The remedies are to measure $x$ better or to fit a model with errors in both variables: orthogonal distance regression, or Deming regression for a straight line.

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

This prints `Ea = 53.7 ± 0.1 kJ/mol,  A = 2.65e+06 1/s`. The error bar is about fifteen times smaller than in the back-of-the-envelope estimate because these illustrative rate constants scatter about the line by only 0.3 percent, not 5 percent. For nonlinear models, where no normal equations exist, `scipy.optimize.curve_fit` does the same job iteratively; the next lesson explains how such iterative optimisers work.

{{< note type="practice" >}}
- Plot the residuals against $x$ and against the prediction before reporting anything. A curve, a funnel or one far-out point each tells you something the summary numbers hide.
- If the measurements have known, unequal error bars, give them to the fit: `numpy.polyfit(x, y, 1, w=1/sigma)`, or `scipy.optimize.curve_fit(f, x, y, sigma=sigma, absolute_sigma=True)` for a nonlinear model.
- Centre and scale the inputs before fitting. Centring decorrelates the intercept from the slopes; scaling to unit variance keeps $\mathbf X$ well conditioned.
- Quote the RMSE in physical units next to the known measurement or calculation error. That comparison says more than $R^2$ does.
{{< /note >}}

{{< note type="warn" >}}
**Extrapolation.** A model is only tested where you have data. A line fitted between 300 and 350 K says nothing reliable at 600 K, where a different mechanism may take over. This is the single most common failure of machine-learning models in science, and it gets worse, not better, as models become more flexible.
{{< /note >}}

{{< note type="key" >}}
- Supervised learning has three ingredients, a model, a loss and an optimiser; fitting minimises the average loss on the data, the empirical risk.
- For a model that is linear in its parameters, least squares has a closed-form answer, the normal equations, best solved by QR or the SVD.
- Every loss is a noise model in disguise: squared loss means Gaussian noise, absolute loss Laplace noise, weighted least squares unequal error bars, and cross-entropy a coin toss for each label.
- Report a fit with its residuals, its RMSE in physical units and its parameter uncertainties, including their correlations, and do not trust it outside the range of the data.
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
- q: "In the spring picture of least squares, which equilibrium condition makes the fitted line pass through the centroid $(\\bar x, \\bar y)$?"
  options: ["Zero net torque on the rod", "Zero net vertical force on the rod", "Minimum length of the rod"]
  answer: 1
  why: "Zero net force means $\\sum_i r_i = 0$, which is $\\partial L/\\partial b = 0$; it gives $b = \\bar y - w\\bar x$, so the line passes through the centroid. Zero net torque is the other normal equation, $\\sum_i x_i r_i = 0$."
- q: "An Arrhenius fit over 300–350 K gives estimates of $\\ln A$ and $E_a$ with a correlation of −0.999. What is the simplest fix?"
  options: ["Measure at more temperatures inside the same range", "Fit against the centred feature $1/T - \\overline{1/T}$, which makes the intercept and slope uncorrelated", "Switch to least absolute deviation"]
  answer: 1
  why: "The correlation arises because $\\ln A$ is an extrapolation to $1/T = 0$. With a centred feature the intercept is $\\ln k$ at the middle of the data, $\\mathbf X^\\top\\mathbf X$ becomes diagonal, and the two estimates are uncorrelated."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. C. M. Bishop, *Pattern Recognition and Machine Learning*, Springer (2006), §1.1–1.2 and chapter 3 (linear models for regression).
2. T. Hastie, R. Tibshirani and J. Friedman, *The Elements of Statistical Learning*, 2nd ed., Springer (2009), chapter 3.
3. K. P. Murphy, *Probabilistic Machine Learning: An Introduction*, MIT Press (2022), chapters 4 (statistics) and 11 (linear regression).
4. W. H. Press, S. A. Teukolsky, W. T. Vetterling and B. P. Flannery, *Numerical Recipes*, 3rd ed., Cambridge University Press (2007), chapter 15 (modelling of data), including why the SVD is preferred to the normal equations.
5. P. J. Huber, “Robust estimation of a location parameter,” *Annals of Mathematical Statistics* **35**, 73–101 (1964), the origin of robust losses.
6. A.-M. Legendre, *Nouvelles méthodes pour la détermination des orbites des comètes*, Paris (1805), with the appendix in which least squares was first published.
7. C. F. Gauss, *Theoria motus corporum coelestium in sectionibus conicis solem ambientium*, Hamburg (1809), where least squares is derived from the normal law of errors.
8. L. Vegard, “Die Konstitution der Mischkristalle und die Raumfüllung der Atome,” *Zeitschrift für Physik* **5**, 17–26 (1921).
9. F. Birch, “Finite elastic strain of cubic crystals,” *Physical Review* **71**, 809–824 (1947).
10. R. D. Cook, “Detection of influential observation in linear regression,” *Technometrics* **19**, 15–18 (1977).

</div>
