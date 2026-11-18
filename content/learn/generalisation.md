---
title: "Generalisation and regularisation"
description: "Why a model that fits your data perfectly can be useless, the bias–variance trade-off, how penalties tame flexible models, and how to measure performance honestly, including the traps specific to materials data."
hook: "A degree-11 polynomial can pass exactly through twelve noisy points and still predict nonsense between them. Flexibility is not the same as understanding, and a random split of materials data can hide the difference."
objectives:
  - "Diagnose underfitting and overfitting from training and validation error curves"
  - "Derive the bias–variance decomposition of the expected squared error"
  - "Explain ridge regression as a penalty on large weights and as a Gaussian prior"
  - "Run k-fold cross-validation with the penalty chosen inside each training fold"
  - "Choose data splits that avoid leakage from near-duplicates and trajectory frames"
cover: "cover.svg"
milestones:
  - year: 1970
    text: "Hoerl and Kennard introduce ridge regression for nearly collinear predictors"
  - year: 1974
    text: "Stone sets out cross-validation for choosing and assessing statistical predictions"
  - year: 1996
    text: "Tibshirani introduces the lasso, which shrinks and selects variables at once"
  - year: 2019
    text: "Belkin, Hsu, Ma and Mandal describe double descent in over-parameterised models"
track: ml
weight: 3
level: Foundation
minutes: 45
lab: "Push a polynomial from underfitting to overfitting"
prereqs: ["learning-from-data"]
---

## Fitting is not the goal

A model is useful only if it predicts data it has not seen. With enough parameters any data set can be fitted exactly: a polynomial of degree $N-1$ passes through $N$ points, noise included. Such a model has **memorised** the training set rather than learned the relationship behind it. The difference between error on the training data and error on new data is the **generalisation gap**, and controlling it is the central practical problem of machine learning.

In the lab, the dashed curve is the true function and each point carries Gaussian noise. Filled points are used for fitting; open points are held back for **validation**. Raise the polynomial degree from 0 and watch the two error curves on the right.

{{< widget name="polyfit" title="From underfitting to overfitting" caption="Left: data, the true function (dashed) and the fitted polynomial. Right: root-mean-square error on training and validation points for every degree at the current penalty λ. Try degree 11 with λ = 0, then raise λ; then increase the number of training points." >}}

You should see three regimes:

- **Underfitting** (degree 0–2). The model is too rigid to follow the curve. Training and validation errors are both high and similar.
- **A good fit** (around degree 4–8 here). The validation error reaches its minimum, close to the noise level $\sigma$.
- **Overfitting** (high degree, $\lambda = 0$). The training error keeps falling towards zero, but the curve develops wild oscillations between the points and the validation error rises. Notice how large the weights $\lVert\mathbf w\rVert$ become: the model cancels huge positive and negative terms to thread through the noise.

{{< fig src="fan.svg" alt="Three panels, each with twenty thin fitted curves, their average in black and the true function dashed: straight lines that all miss the curve; degree-5 polynomials that cluster around the truth; degree-11 polynomials that scatter wildly, especially near the ends" caption="Twenty independent data sets of 14 noisy points, each fitted by the same model. Bias is the gap between the black average and the dashed truth; variance is the spread of the thin curves around the black one. The lab shows one of these curves at a time." >}}

The lab shows one fit; the figure shows twenty, each from a fresh draw of the 14 training points and their noise. The straight lines agree with one another and are all wrong in the same way. The degree-11 fits are right on average in the middle of the range and wildly different from one another, most of all near the ends, where a polynomial is pinned by the fewest points. That end effect has a name.

{{< note type="story" title="Runge's warning, 1901" >}}
Carl Runge showed in 1901 that interpolating the innocent-looking function $1/(1+25x^2)$ at equally spaced points on $[-1, 1]$ gets *worse* as the degree rises. The largest error of the interpolating polynomial is 0.43 at degree 5, 1.9 at degree 10 and about 60 at degree 20, with all the damage in wild oscillations near the ends. There is no noise at all in this example: the problem is purely the flexibility of high-degree polynomials on equally spaced points. Placing the points at the Chebyshev nodes, which crowd towards the ends, cures it, bringing the degree-20 error down to 0.015. The lesson carries over to learning: a flexible model is only as good as the data near where you use it.
{{< /note >}}

## The bias–variance decomposition

Why does a U-shape appear? Imagine repeating the whole experiment many times: new noise, new training set, new fit $\hat f$. At a fixed input $x$, with $y = f(x) + \varepsilon$ and noise variance $\sigma^2$, the expected squared error of the prediction splits exactly into three terms:

$$
\mathbb E\big[(y - \hat f(x))^2\big] = \underbrace{\sigma^2}_{\text{noise}} + \underbrace{\big(f(x) - \mathbb E[\hat f(x)]\big)^2}_{\text{bias}^2} + \underbrace{\mathbb E\big[(\hat f(x) - \mathbb E[\hat f(x)])^2\big]}_{\text{variance}} .
$$

{{< note type="math" title="Derivation in three lines" >}}
Write $\bar f = \mathbb E[\hat f(x)]$. Then $y - \hat f = \varepsilon + (f - \bar f) + (\bar f - \hat f)$. Square and take the expectation. The noise $\varepsilon$ is independent of the fit and has zero mean, and $\mathbb E[\bar f - \hat f] = 0$ by definition of $\bar f$, so every cross term vanishes and only the three squares remain.
{{< /note >}}

- **Bias** is systematic error: what the model gets wrong *on average*, because its family of functions cannot represent the truth. Rigid models have high bias.
- **Variance** is how much the fit changes from one training sample to the next. Flexible models fitted to few points have high variance; press **New noisy sample** at degree 11 and watch the curve jump about.
- **Noise** $\sigma^2$ is irreducible: no model can predict it. A validation RMSE well below $\sigma$ means something is wrong, usually leakage between training and test data.

Adding parameters lowers bias and raises variance. Adding data lowers variance without raising bias, which is why the overfitting at degree 11 largely disappears when you move the training-points slider to 60. More data is the most reliable regulariser.

{{< fig src="tradeoff.svg" alt="Log–log plot against the ridge penalty of variance falling, bias squared rising, and their sum plus noise forming a U-shaped expected test error with a minimum near lambda 0.02; a dashed horizontal line marks the noise variance" caption="The decomposition computed from 600 independent training sets for the degree-11 polynomial of the lab. Without a penalty the variance dominates and the expected test error is 2.2, nearly seventy times the noise; at the best penalty, λ ≈ 0.02, it falls to 0.053, a root-mean-square error of 0.23 against a noise level of 0.18." >}}

The figure makes three points that one fit cannot. First, without a penalty the degree-11 model has almost no bias, $4\times10^{-3}$, because a polynomial of that degree can represent the true curve well; its whole problem is variance, 2.2. Second, the optimum is not where bias vanishes: at λ ≈ 0.02 the model accepts a bias of $4\times10^{-3}$ and a variance of $1.6\times10^{-2}$ in return for a total forty times smaller. Third, the best achievable error, 0.053, is still above the noise floor of 0.032, because 14 noisy points do not pin down a curve with three turning points.

{{< note type="practice" title="Back of the envelope" >}}
Biased estimates can beat unbiased ones even for the simplest problem, estimating a mean. Take $N$ measurements with noise $\sigma$ and report $c\,\bar x$ instead of $\bar x$. The bias is $(1-c)\mu$ and the variance $c^2\sigma^2/N$, so the mean squared error is $(1-c)^2\mu^2 + c^2\sigma^2/N$, smallest at $c = \mu^2/(\mu^2 + \sigma^2/N)$. With $\mu = 1$ and $\sigma^2/N = 0.25$, the best $c$ is 0.8 and the error falls from 0.25 to $0.04 + 0.16 = 0.20$, 20 percent lower, by shrinking every estimate towards zero. The catch is that the best $c$ depends on the unknown $\mu$; ridge regression and cross-validation are a practical answer to that catch. Charles Stein proved in 1956 that, for three or more means estimated together, shrinkage beats the unbiased estimate whatever the true values.
{{< /note >}}

{{< note type="tip" title="A modern footnote: double descent" >}}
For very large models such as deep networks the picture is richer. Past the point where the model can interpolate the training data, the test error can fall again as parameters are added, because among all interpolating solutions the training algorithm tends to find smooth, small-norm ones. This **double descent** does not overturn the trade-off; it shows that the number of parameters is a poor measure of effective complexity. See Belkin et al. (2019) in the references.
{{< /note >}}

## Regularisation: preferring simple explanations

Instead of choosing the degree, keep a flexible model and penalise complexity. **Ridge regression** (Tikhonov regularisation) adds the squared size of the weights to the loss:

$$
L_\lambda(\mathbf w) = \lVert\mathbf y - \mathbf X\mathbf w\rVert^2 + \lambda\lVert\mathbf w\rVert^2,
\qquad
\hat{\mathbf w} = (\mathbf X^{\top}\mathbf X + \lambda\mathbf I)^{-1}\mathbf X^{\top}\mathbf y .
$$

The extra $\lambda\mathbf I$ also makes the matrix well-conditioned, which is why ridge solutions are numerically stable even when features are nearly collinear. In the lab, keep degree 11 and slide $\lambda$ upwards: the oscillations disappear, the weights shrink, and the validation error drops well below its unregularised value. Too large a $\lambda$ flattens the model towards zero and underfits again; $\lambda$ is a **hyperparameter** that trades bias against variance continuously.

**The Bayesian reading.** Ridge regression is the most probable weight vector (the *maximum a posteriori* estimate) if, before seeing data, you believed each weight was drawn from a Gaussian $\mathcal N(0, \tau^2)$, with $\lambda = \sigma^2/\tau^2$. A penalty is a prior belief that the function is simple. The **lasso** uses $\lambda\lVert\mathbf w\rVert_1$ instead (a Laplace prior); it drives many weights exactly to zero and so selects features, which is useful when you suspect only a few descriptors matter. Neural networks use the same idea under the name **weight decay**, along with other implicit regularisers: early stopping, dropout and data augmentation.

The Bayesian reading turns the best penalty into a statement about the world, and it can be checked. The lab penalises $\lambda N\lVert\mathbf w\rVert^2$ against the summed squared error, so the prior width implied by a penalty is $\tau^2 = \sigma^2/(N\lambda)$. With the noise variance $0.18^2 = 0.0324$, $N = 14$ and the best penalty of the degree-11 model, $\lambda \approx 0.018$ (from the bias–variance figure above), this gives $\tau \approx 0.36$. Expand the true function of the lab in the same Legendre polynomials and the root-mean-square size of its twelve coefficients is 0.35. The penalty that minimises the test error was found without any reference to priors, yet it encodes almost exactly the right belief about how large the weights should be.

{{< fig src="geometry.svg" alt="Two panels in the plane of two weights: elliptical loss contours around the least-squares point; on the left a blue disc touched by a contour at a point with both weights nonzero; on the right a violet diamond touched at its corner on the w1 axis, where w2 is zero" caption="Penalised least squares is equivalent to least squares inside a budget on the weights. The solution is where the smallest loss contour (orange) first touches the budget region. A disc is touched at a generic point, so ridge shrinks both weights; a diamond is usually touched at a corner, so the lasso sets $w_2$ exactly to zero." >}}

The geometry explains why the lasso selects features and ridge does not. Minimising $\lVert\mathbf y-\mathbf X\mathbf w\rVert^2 + \lambda\lVert\mathbf w\rVert^2$ gives the same answer as minimising the squared error subject to $\lVert\mathbf w\rVert^2 \le t^2$ for a suitable $t$, and likewise for the $\ell_1$ norm. In the figure, the unpenalised solution sits at $(1.6, 0.55)$. Ridge returns $(0.89, 0.46)$, both weights shrunk and neither zero. The lasso, whose budget region is a diamond with corners on the axes, returns $(1, 0)$: the second feature is dropped. In many dimensions the $\ell_1$ ball has corners and edges in every coordinate subspace, so the lasso typically returns a solution with many exact zeros. Sparse regression of this kind underlies descriptor selection in materials informatics. SISSO (Ouyang and colleagues, 2018) builds billions of candidate formulae from elemental properties, screens them by correlation with the target, and then solves an $\ell_0$-penalised problem, the exact sparsity count that the lasso approximates, to keep the two or three formulae that best explain a property such as the energy difference between crystal structures.

### Early stopping is a penalty too

Stopping gradient descent before it converges also regularises, and for least squares the connection to ridge is exact enough to compute. Start from $\mathbf w = 0$ and run gradient descent with step $\eta$ on a loss whose Hessian has eigenvalues $\lambda_i$. From the [gradient-descent lesson](../gradient-descent/), the component of the solution along eigenvector $i$ after $t$ steps is the least-squares value multiplied by $1 - (1-\eta\lambda_i)^t$. Ridge multiplies the same component by $\lambda_i/(\lambda_i + \lambda)$. Both factors are close to 1 for stiff directions, which are well determined by the data, and close to 0 for soft directions, which are poorly determined and dominated by noise. Matching the two for small $\lambda_i$ gives $\lambda \approx 1/(\eta t)$: running twice as long halves the effective penalty. This is why the validation error of a network often has a minimum part-way through training, a curve shown in [the lesson on training neural networks](../neural-networks/), and why the iteration count is a hyperparameter like any other.

## Measuring generalisation honestly

**Hold-out validation.** Split the data into training, validation and test sets. Fit on the training set, choose hyperparameters (degree, $\lambda$, architecture, learning rate) on the validation set, and report performance on the test set *once*, at the very end. Using the test set to make choices turns it into a second validation set and makes the reported error optimistic.

**$k$-fold cross-validation.** With small data sets a single split is noisy. Divide the data into $k$ folds (5 or 10 is typical), train $k$ times, each time holding out one fold, and average the $k$ validation errors. Leave-one-out is the extreme case $k = N$.

{{< fig src="splits.svg" alt="Left: five rows of five boxes, with one orange validation box moving along the diagonal; right: four coloured rows of trajectory frames, split once at random with open test frames scattered among filled training frames, and once by run with an entire row held out" caption="Left: in 5-fold cross-validation every point is used for validation exactly once. Right: a random split of trajectory frames puts each test frame between near-identical training frames, while a split by run holds out a whole trajectory, which is what a new simulation looks like to the model." >}}

The $k$ validation errors also give a rough error bar. In the scikit-learn example below, five folds of the 40 points give a mean RMSE and a standard deviation across folds; two models whose cross-validated errors differ by less than that spread have not been shown to differ. With fewer than about a hundred points, repeat the whole procedure with several random fold assignments and average, because a single assignment can be lucky.

{{< note type="warn" title="Myth" >}}
*Any preprocessing done before cross-validation is harmless.* Anything that looks at the targets of the validation folds leaks information into the model. The most damaging case is feature selection. With thousands of candidate descriptors and tens of samples, some descriptors correlate with the target by chance, and if you pick them using all the data, cross-validation then confirms the chance correlation. Ambroise and McLachlan (2002) showed that published gene-expression classifiers had near-zero cross-validated error for exactly this reason. The cell below repeats the experiment with a target that is pure noise. Every step that learns from data, whether scaling, feature selection, imputation or hyperparameter tuning, must happen inside each training fold.
{{< /note >}}

{{< py title="feature selection leaks into cross-validation" >}}
import numpy as np
rng = np.random.default_rng(0)
N, P, K = 60, 2000, 10              # 60 samples, 2000 random descriptors, keep the best 10
X = rng.normal(size=(N, P))
y = rng.normal(size=N)              # the target is pure noise: nothing can be predicted

def top_k(X, y):                    # the K descriptors most correlated with y
    c = np.abs((X - X.mean(0)).T @ (y - y.mean()))
    return np.argsort(c)[-K:]

def cv_r2(select_inside):
    folds, press = np.array_split(rng.permutation(N), 5), 0.0
    cols_all = top_k(X, y)          # selection that has seen every sample
    for f in folds:
        tr = np.setdiff1d(np.arange(N), f)
        cols = top_k(X[tr], y[tr]) if select_inside else cols_all
        A = np.column_stack([np.ones(len(tr)), X[tr][:, cols]])
        w = np.linalg.lstsq(A, y[tr], rcond=None)[0]
        press += np.sum((y[f] - np.column_stack([np.ones(len(f)), X[f][:, cols]]) @ w) ** 2)
    return 1 - press / np.sum((y - y.mean()) ** 2)

print(f"select on all data, then CV:  R² = {cv_r2(False):+.2f}")
print(f"select inside each fold:      R² = {cv_r2(True):+.2f}")
{{< /py >}}

Selecting 10 of 2,000 random descriptors on all 60 samples and then cross-validating reports $R^2 = +0.60$, a model that apparently explains 60 percent of the variance of pure noise. Repeating the selection inside each training fold gives $R^2 = -0.41$, worse than predicting the mean, which is the honest answer. When hyperparameters are tuned by cross-validation, the same logic calls for **nested cross-validation**: an inner loop chooses the hyperparameters on each outer training set, and the outer loop measures the error of the whole procedure. The Matbench benchmark (Dunn and colleagues, 2020) reports every result as the mean over five outer folds of a nested cross-validation for this reason.

### How large must the test set be?

A test error is itself an estimate with an error bar. If the prediction errors are roughly Gaussian, the relative standard error of an RMSE measured on $n$ independent test points is about $1/\sqrt{2n}$: 7 percent for 100 points, 2.2 percent for 1,000. A new model that beats the old one by 3 percent on a 100-point test set has not been shown to be better. Comparing the two models on the *same* test points, through the distribution of their paired differences, is far more sensitive than comparing two separate RMSEs, because most of the sampling noise is shared. The same reasoning gives the **one-standard-error rule** for choosing hyperparameters: among all settings whose cross-validated error lies within one standard error of the best, take the simplest, for instance the largest $\lambda$. The difference in error is not resolvable, and the simpler model is less likely to have been chosen by chance.


### Learning curves: will more data help?

A **learning curve** plots the validation error against the size of the training set. For most models used in chemistry and materials science it is close to a straight line on log–log axes, error $\propto N^{-a}$, over a wide range of $N$, and its slope and offset are the most useful numbers for planning a data campaign. A curve that has flattened says that the model, not the data, is the bottleneck; a curve still falling steeply says that more data will pay.

{{< note type="practice" title="Back of the envelope" >}}
Suppose a model of formation energies reaches a test error of 40 meV/atom with 1,000 training structures and 25 meV/atom with 4,000. The slope is $a = \ln(40/25)/\ln 4 = 0.34$. Reaching 10 meV/atom at the same slope needs $N = 4000 \times (25/10)^{1/0.34} \approx 4000 \times 15 \approx 60{,}000$ structures. At an hour of DFT per structure that is about seven CPU-years, a strong argument for a better representation, which changes the slope, rather than more data, which only moves along the line.
{{< /note >}}

{{< note type="warn" title="Leakage in materials and chemistry data" >}}
A random split assumes every data point is an independent draw. Materials data rarely are.

- **Near-duplicates.** Several DFT calculations of the same compound (different magnetic orderings, slightly different cells) can land in both training and test sets. The model then "predicts" a structure it has effectively seen.
- **Trajectory frames.** Consecutive frames of an MD run are almost identical. Splitting frames at random makes an interatomic potential look far better than it is; split by trajectory, temperature or composition instead.
- **Extrapolation is the real use case.** Discovery means predicting materials *unlike* the training set. Meredig et al. (2018) proposed **leave-one-cluster-out** cross-validation, which holds out a whole family of chemically similar materials at a time. Errors measured that way are usually much larger, and much more honest about what a discovery campaign can expect.

Choose the split that mimics how the model will be used.
{{< /note >}}

{{< note type="practice" title="From the lab: validating an interatomic potential" >}}
A low force RMSE on held-out frames is necessary but far from sufficient for a machine-learned potential. Morrow, Gardner and Deringer (2023) recommend checking, in addition, quantities the potential was not trained on directly: lattice parameters and elastic constants, phonon dispersion curves against DFT, energies of defects and surfaces, energy–volume curves well outside the training density, and the stability of long molecular-dynamics runs at the highest temperature of interest. A potential with a force error of 50 meV/Å can still produce unphysical clustering after a nanosecond if a region of configuration space, such as two atoms at very short range, never appeared in training. Each such failure is a generalisation failure, and the cure is the one from this lesson: data where the model will actually be used, which is the subject of [active learning](../active-learning/).
{{< /note >}}

## In practice

With scikit-learn, a ridge model with a cross-validated penalty on standardised polynomial features takes a few lines:

```python
import numpy as np
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.linear_model import RidgeCV
from sklearn.model_selection import KFold, cross_val_score

rng = np.random.default_rng(0)
x = rng.uniform(0, 4, 40)[:, None]
y = 0.9*np.sin(2.6*x[:, 0])*np.exp(-0.25*x[:, 0]) + 0.15*x[:, 0] + 0.18*rng.normal(size=40)

model = make_pipeline(PolynomialFeatures(10), StandardScaler(),
                      RidgeCV(alphas=np.logspace(-8, 2, 41)))
cv = KFold(n_splits=5, shuffle=True, random_state=0)
scores = cross_val_score(model, x, y, cv=cv, scoring="neg_root_mean_squared_error")
print(f"5-fold RMSE: {-scores.mean():.3f} ± {scores.std():.3f}")
```

`RidgeCV` chooses $\lambda$ by an efficient leave-one-out estimate *inside* each training fold, so the outer cross-validation still measures an honest error. For grouped data, replace `KFold` with `GroupKFold` and pass a group label, such as the chemical system or the trajectory each sample came from.

{{< note type="key" >}}
- The quantity that matters is the error on new data; the training error always underestimates it, and the gap grows with model flexibility.
- Expected squared error splits into noise, bias squared and variance. Flexible models trade bias for variance; more data from the same distribution lowers variance alone.
- Ridge, lasso, weight decay and early stopping all shrink poorly determined directions; ridge is a Gaussian prior, the lasso a Laplace prior that selects features.
- Every step that learns from data, including feature selection and scaling, belongs inside the training fold of cross-validation; tune hyperparameters with nested cross-validation.
- Split materials data the way the model will be used: by compound family, trajectory or composition, not frame by frame.
{{< /note >}}

{{< quiz >}}
- q: "Training RMSE is 0.01 eV/atom and validation RMSE is 0.30 eV/atom. What is the most likely diagnosis?"
  options: ["Underfitting: the model is too simple", "Overfitting: the model has high variance and has memorised the training set", "The noise level of the data is 0.30 eV/atom"]
  answer: 1
  why: "A large gap between a very small training error and a large validation error is the signature of overfitting. Regularise, simplify the model or add data."
- q: "Which change reduces variance without increasing bias?"
  options: ["Using a lower-degree polynomial", "Increasing the ridge penalty λ", "Collecting more training data from the same distribution"]
  answer: 2
  why: "Simplifying the model or increasing λ trades variance for bias. More data from the same distribution reduces variance while leaving the model family, and so its bias, unchanged."
- q: "You train an interatomic potential on 10,000 frames from one MD trajectory, split randomly 80/20. The test error is excellent. Why should you be suspicious?"
  options: ["Random splits always overestimate error", "Neighbouring frames are nearly identical, so the test set is not independent of the training set", "MD frames cannot be used for training"]
  answer: 1
  why: "Frames a few femtoseconds apart are almost the same configuration. The test error then measures interpolation between near-duplicates, not performance on new configurations. Split by trajectory or condition."
- q: "Ridge regression with penalty λ is equivalent to which Bayesian estimate?"
  options: ["The maximum-likelihood estimate", "The maximum a posteriori estimate with a zero-mean Gaussian prior on the weights", "The posterior mean under a uniform prior"]
  answer: 1
  why: "Adding $\\lambda\\lVert\\mathbf w\\rVert^2$ to the squared loss is the negative log of a Gaussian likelihood times a Gaussian prior on $\\mathbf w$, so its minimiser is the MAP estimate."
- q: "From 2,000 candidate descriptors you keep the 10 most correlated with the target on all 60 samples, then run 5-fold cross-validation and get $R^2 = 0.6$. What is wrong?"
  options: ["Nothing; five folds are enough", "The selection used the validation targets, so the cross-validated score is optimistically biased", "$R^2$ cannot be used with cross-validation"]
  answer: 1
  why: "Chance correlations among thousands of descriptors survive a selection made on all the data, and cross-validation then confirms them. On a pure-noise target this procedure gives $R^2 \\approx 0.6$; selecting inside each fold gives a negative $R^2$."
- q: "Why does the lasso set some weights exactly to zero while ridge regression does not?"
  options: ["The lasso uses a larger penalty", "The $\\ell_1$ constraint region has corners on the coordinate axes, where the loss contours usually first touch it", "Ridge regression cannot shrink weights"]
  answer: 1
  why: "Penalised least squares equals least squares inside a budget region. The $\\ell_2$ ball is round, so the touching point is generic; the $\\ell_1$ ball is a diamond (a cross-polytope in many dimensions) whose corners lie on the axes."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. T. Hastie, R. Tibshirani and J. Friedman, *The Elements of Statistical Learning*, 2nd ed., Springer (2009), chapter 3.4 (shrinkage methods) and chapter 7 (model assessment and selection).
2. C. M. Bishop, *Pattern Recognition and Machine Learning*, Springer (2006), §1.1, §3.1.4 (regularised least squares) and §3.2 (the bias–variance decomposition).
3. S. Geman, E. Bienenstock and R. Doursat, “Neural networks and the bias/variance dilemma,” *Neural Computation* **4**, 1–58 (1992).
4. A. E. Hoerl and R. W. Kennard, “Ridge regression: biased estimation for nonorthogonal problems,” *Technometrics* **12**, 55–67 (1970).
5. R. Tibshirani, “Regression shrinkage and selection via the lasso,” *Journal of the Royal Statistical Society B* **58**, 267–288 (1996).
6. M. Belkin, D. Hsu, S. Ma and S. Mandal, “Reconciling modern machine-learning practice and the classical bias–variance trade-off,” *Proceedings of the National Academy of Sciences* **116**, 15849–15854 (2019).
7. B. Meredig, E. Antono, C. Church, M. Hutchinson, J. Ling, S. Paradiso, B. Blaiszik, I. Foster, B. Gibbons, J. Hattrick-Simpers, A. Mehta and L. Ward, “Can machine learning identify the next high-temperature superconductor? Examining extrapolation performance for materials discovery,” *Molecular Systems Design & Engineering* **3**, 819–825 (2018).
8. A. Dunn, Q. Wang, A. Ganose, D. Dopp and A. Jain, “Benchmarking materials property prediction methods: the Matbench test set and Automatminer reference algorithm,” *npj Computational Materials* **6**, 138 (2020).
9. M. Stone, “Cross-validatory choice and assessment of statistical predictions,” *Journal of the Royal Statistical Society B* **36**, 111–147 (1974).
10. C. Ambroise and G. J. McLachlan, “Selection bias in gene extraction on the basis of microarray gene-expression data,” *Proceedings of the National Academy of Sciences* **99**, 6562–6566 (2002).
11. C. Runge, “Über empirische Funktionen und die Interpolation zwischen äquidistanten Ordinaten,” *Zeitschrift für Mathematik und Physik* **46**, 224–243 (1901).
12. R. Ouyang, S. Curtarolo, E. Ahmetcik, M. Scheffler and L. M. Ghiringhelli, “SISSO: a compressed-sensing method for identifying the best low-dimensional descriptor in an immensity of offered candidates,” *Physical Review Materials* **2**, 083802 (2018).
13. J. D. Morrow, J. L. A. Gardner and V. L. Deringer, “How to validate machine-learned interatomic potentials,” *Journal of Chemical Physics* **158**, 121501 (2023).

</div>
