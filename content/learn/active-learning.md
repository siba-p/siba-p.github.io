---
title: "Active learning and Bayesian optimisation"
description: "Closing the loop between model and experiment: choosing the next calculation or measurement with a surrogate model and an acquisition function, exploration against exploitation, batches, many objectives, and self-driving laboratories."
track: ai4mat
weight: 5
level: Advanced
minutes: 50
lab: "Find the best composition in a dozen experiments"
prereqs: ["uncertainty-gaussian-processes"]
---

## The question every lab faces

You can afford twenty more syntheses, or two hundred more DFT calculations. Which ones? Choosing by intuition, on a grid or at random wastes most of the budget. **Sequential experimental design** uses everything measured so far to choose the next experiment, so that each one is as informative or as promising as possible. Two closely related goals use the same machinery.

- **Active learning** chooses data to make a *model* good everywhere it will be used, for example DFT calculations to train an interatomic potential ([the lesson on interatomic potentials](../mlip/)).
- **Bayesian optimisation** (BO) chooses experiments to find the *best* material, the composition or process conditions that maximise a property, in as few trials as possible.

## The loop

Both are a loop of four steps:

1. Fit a **surrogate model** to all data so far, one that predicts both a mean $\mu(\mathbf x)$ and an uncertainty $\sigma(\mathbf x)$. Gaussian processes ([the lesson on Gaussian processes](../uncertainty-gaussian-processes/)) are the classic choice for small data; ensembles of networks or of trees for larger data.
2. Compute an **acquisition function** $a(\mathbf x)$ that scores how useful it would be to measure at $\mathbf x$.
3. Run the experiment (or calculation) at $\mathbf x_{\text{next}} = \arg\max_{\mathbf x} a(\mathbf x)$.
4. Add the result to the data and repeat.

{{< widget name="bo" title="Bayesian optimisation of a hidden property" caption="Top: the Gaussian-process surrogate (mean and 95% band) fitted to the experiments so far; the newest is orange. Bottom: the acquisition function; its peak is where the next experiment goes. Run experiments one at a time, compare expected improvement with UCB at κ = 0 and κ = 4, and compare both with random choice." >}}

## Acquisition functions: exploration against exploitation

Every acquisition function balances two motives: **exploit** regions where the model already predicts high values, and **explore** regions where it is uncertain and something better may hide.

**Upper confidence bound (UCB).** Optimism in the face of uncertainty:

$$
a_{\text{UCB}}(\mathbf x) = \mu(\mathbf x) + \kappa\,\sigma(\mathbf x).
$$

With $\kappa = 0$ it is pure exploitation and tends to get stuck on the first good peak it finds (try it in the lab: the broad peak near $x = 0.28$ captures it). Large $\kappa$ explores widely. Srinivas et al. (2010) proved convergence guarantees for suitably growing $\kappa$.

**Expected improvement (EI).** Let $y^*$ be the best value measured so far. The improvement at $\mathbf x$ is $\max(0, f(\mathbf x) - y^*)$, and its expectation under the Gaussian prediction has a closed form:

$$
a_{\text{EI}}(\mathbf x) = \big(\mu - y^* - \xi\big)\,\Phi(z) + \sigma\,\phi(z), \qquad z = \frac{\mu - y^* - \xi}{\sigma},
$$

with $\Phi$ and $\phi$ the standard normal distribution and density, and a small margin $\xi$. The first term rewards a high mean, the second a large uncertainty; EI balances them automatically and has no exploration parameter to tune, which is why it is the most common default.

**For active learning**, the simplest acquisition is the uncertainty itself, $a(\mathbf x) = \sigma(\mathbf x)$, or for an ensemble of potentials, the disagreement between members on a candidate configuration. Configurations that maximise it are sent to DFT.

In the lab, notice that the narrow global peak near $x = 0.72$ is invisible to the model until an experiment happens to land near it; EI finds it because, after the obvious peak is mapped, the remaining uncertainty elsewhere becomes worth exploring. The readout compares the gap to the true optimum with the average gap reached by **random search** after the same number of experiments.

## Beyond the textbook loop

- **Batches.** Laboratories and computing clusters run many experiments in parallel. Batch BO picks several points at once, for example by "fantasising" the outcome of each chosen point before choosing the next (the kriging-believer heuristic), or with batch acquisition functions such as q-EI.
- **Several objectives.** Materials usually trade properties against each other: conductivity against stability, strength against ductility. Multi-objective BO targets the **Pareto front** and uses acquisition functions such as expected hypervolume improvement.
- **Constraints and cost.** Some compositions cannot be made; some measurements cost more than others. Constrained and cost-aware acquisition functions account for both, and **multi-fidelity** BO mixes cheap, approximate evaluations (a coarse DFT setting, a quick screening measurement) with expensive accurate ones.
- **High dimensions.** GPs struggle beyond about 20 continuous variables. Trust-region methods (TuRBO), additive kernels and learned low-dimensional representations extend BO to larger design spaces.

## Self-driving laboratories

When synthesis and characterisation are robotic, the loop can close without a human: the BO algorithm chooses the next composition, robots prepare and measure it, and the result updates the model within minutes. Autonomous laboratories have optimised thin-film conductivity, photocatalyst formulations and perovskite compositions, discovering in days what would take months by hand. The algorithms are the ones in the lab above; the engineering challenge is reliable automation, and the scientific challenge is choosing a design space that contains something worth finding.

## In practice

The same loop with scikit-learn, a Matérn kernel and expected improvement:

```python
import numpy as np
from scipy.stats import norm
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import Matern, WhiteKernel, ConstantKernel

def experiment(x):                              # stand-in for a measurement or a DFT calculation
    return (0.9 * np.exp(-((x - 0.72) / 0.06) ** 2) + 0.55 * np.exp(-((x - 0.28) / 0.14) ** 2)
            + 0.15 * np.sin(9 * x) - 0.1 * x)

def expected_improvement(mu, sd, best, xi=0.01):
    z = (mu - best - xi) / sd
    return (mu - best - xi) * norm.cdf(z) + sd * norm.pdf(z)

rng = np.random.default_rng(3)
grid = np.linspace(0, 1, 1001)[:, None]
X = rng.uniform(0, 1, (3, 1)); y = experiment(X[:, 0])        # three initial experiments
kernel = ConstantKernel(0.5) * Matern(length_scale=0.1, nu=2.5) + WhiteKernel(1e-4)

for it in range(12):
    gp = GaussianProcessRegressor(kernel, normalize_y=True, n_restarts_optimizer=3, random_state=0).fit(X, y)
    mu, sd = gp.predict(grid, return_std=True)
    x_next = grid[np.argmax(expected_improvement(mu, np.maximum(sd, 1e-9), y.max()))]
    X = np.vstack([X, x_next]); y = np.append(y, experiment(x_next[0]))
    print(f"experiment {len(y):2d}: x = {x_next[0]:.3f}, y = {y[-1]:.3f}, best so far {y.max():.3f}")

print(f"true optimum {experiment(grid[:, 0]).max():.3f} at x = {grid[np.argmax(experiment(grid[:, 0])), 0]:.3f}")
```

```text
experiment  4: x = 0.227, y = 0.587, best so far 0.603
experiment  5: x = 0.338, y = 0.444, best so far 0.603
experiment  6: x = 0.542, y = -0.185, best so far 0.603
experiment  7: x = 1.000, y = -0.038, best so far 0.603
experiment  8: x = 0.265, y = 0.620, best so far 0.620
experiment  9: x = 0.000, y = 0.010, best so far 0.620
experiment 10: x = 0.696, y = 0.695, best so far 0.695
experiment 11: x = 0.672, y = 0.373, best so far 0.695
experiment 12: x = 0.718, y = 0.854, best so far 0.854
experiment 13: x = 0.731, y = 0.841, best so far 0.854
experiment 14: x = 0.425, y = 0.051, best so far 0.854
experiment 15: x = 0.158, y = 0.390, best so far 0.854
true optimum 0.859 at x = 0.722
```

The trace reads like a scientist's notebook: refine the promising broad peak (experiments 4–8), check the unexplored edges (7 and 9), stumble on a rising signal near 0.7 (10), and close in on the narrow optimum at experiment 12, within 1% of the true maximum after fifteen experiments. For serious work, BoTorch (built on PyTorch) and Ax provide batch, multi-objective, constrained and multi-fidelity BO.

{{< quiz >}}
- q: "With UCB at κ = 0, what does Bayesian optimisation do?"
  options: ["Explores uniformly", "Always samples where the predicted mean is highest, so it can get stuck on the first good local optimum", "Samples at random"]
  answer: 1
  why: "κ = 0 removes the uncertainty term: the method trusts its current mean everywhere and never explores regions it believes are worse."
- q: "Why does expected improvement eventually explore regions with a low predicted mean?"
  options: ["Because it adds random noise", "Because a large uncertainty gives a non-negligible chance of beating the current best, which the $\\sigma\\phi(z)$ term rewards", "Because it ignores the mean"]
  answer: 1
  why: "EI integrates the improvement over the predictive distribution. Where σ is large, even a mediocre mean leaves a tail of possible values above $y^*$."
- q: "For training an interatomic potential by active learning, which configurations should be sent to DFT next?"
  options: ["Those where the ensemble of potentials agrees best", "Those where the ensemble disagrees most (highest predicted uncertainty)", "Random ones"]
  answer: 1
  why: "Disagreement marks epistemic uncertainty, the configurations whose labels would teach the model most."
- q: "Two properties must both be improved, and they conflict. What should the optimisation target?"
  options: ["The average of the two", "The Pareto front: designs where neither property can be improved without worsening the other", "Only the more important property"]
  answer: 1
  why: "Multi-objective optimisation maps the trade-off curve, leaving the final choice to the scientist, instead of fixing a weighting in advance."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. B. Shahriari, K. Swersky, Z. Wang, R. P. Adams and N. de Freitas, “Taking the human out of the loop: a review of Bayesian optimization,” *Proceedings of the IEEE* **104**, 148–175 (2016).
2. R. Garnett, *Bayesian Optimization*, Cambridge University Press (2023), free online at bayesoptbook.com.
3. D. R. Jones, M. Schonlau and W. J. Welch, “Efficient global optimization of expensive black-box functions,” *Journal of Global Optimization* **13**, 455–492 (1998) (expected improvement).
4. N. Srinivas, A. Krause, S. M. Kakade and M. Seeger, “Gaussian process optimization in the bandit setting: no regret and experimental design,” *Proceedings of ICML*, 1015–1022 (2010) (GP-UCB).
5. P. I. Frazier, “A tutorial on Bayesian optimization,” arXiv:1807.02811 (2018).
6. T. Lookman, P. V. Balachandran, D. Xue and R. Yuan, “Active learning in materials science with emphasis on adaptive sampling using uncertainties for targeted design,” *npj Computational Materials* **5**, 21 (2019).
7. M. Balandat, B. Karrer, D. R. Jiang, S. Daulton, B. Letham, A. G. Wilson and E. Bakshy, “BoTorch: a framework for efficient Monte-Carlo Bayesian optimization,” *Advances in Neural Information Processing Systems* **33** (2020).
8. B. P. MacLeod et al., “Self-driving laboratory for accelerated discovery of thin-film materials,” *Science Advances* **6**, eaaz8867 (2020).
9. B. Burger et al., “A mobile robotic chemist,” *Nature* **583**, 237–241 (2020).
10. J. Vandermause, S. B. Torrisi, S. Batzner, Y. Xie, L. Sun, A. M. Kolpak and B. Kozinsky, “On-the-fly active learning of interpretable Bayesian force fields for atomistic rare events,” *npj Computational Materials* **6**, 20 (2020) (FLARE).
11. Y. Zhang, H. Wang, W. Chen, J. Zeng, L. Zhang, H. Wang and W. E, “DP-GEN: a concurrent learning platform for the generation of reliable deep learning based potential energy models,” *Computer Physics Communications* **253**, 107206 (2020).

</div>
