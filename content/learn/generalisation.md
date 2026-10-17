---
title: "Generalisation and regularisation"
description: "Why a model that fits your data perfectly can be useless, the bias–variance trade-off, how penalties tame flexible models, and how to measure performance honestly, including the traps specific to materials data."
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

## Measuring generalisation honestly

**Hold-out validation.** Split the data into training, validation and test sets. Fit on the training set, choose hyperparameters (degree, $\lambda$, architecture, learning rate) on the validation set, and report performance on the test set *once*, at the very end. Using the test set to make choices turns it into a second validation set and makes the reported error optimistic.

**$k$-fold cross-validation.** With small data sets a single split is noisy. Divide the data into $k$ folds (5 or 10 is typical), train $k$ times, each time holding out one fold, and average the $k$ validation errors. Leave-one-out is the extreme case $k = N$.

{{< note type="warn" title="Leakage in materials and chemistry data" >}}
A random split assumes every data point is an independent draw. Materials data rarely are.

- **Near-duplicates.** Several DFT calculations of the same compound (different magnetic orderings, slightly different cells) can land in both training and test sets. The model then "predicts" a structure it has effectively seen.
- **Trajectory frames.** Consecutive frames of an MD run are almost identical. Splitting frames at random makes an interatomic potential look far better than it is; split by trajectory, temperature or composition instead.
- **Extrapolation is the real use case.** Discovery means predicting materials *unlike* the training set. Meredig et al. (2018) proposed **leave-one-cluster-out** cross-validation, which holds out a whole family of chemically similar materials at a time. Errors measured that way are usually much larger, and much more honest about what a discovery campaign can expect.

Choose the split that mimics how the model will be used.
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

</div>
