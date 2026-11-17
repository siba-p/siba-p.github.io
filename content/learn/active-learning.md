---
title: "Active learning"
description: "Closing the loop between model and experiment: choosing the next calculation or measurement with a surrogate model and an acquisition function, exploration against exploitation, batches, many objectives, and self-driving laboratories."
hook: "Ask five models where they disagree and they point to exactly the stretched and squashed bonds that random sampling rarely draws. In this chapter's toy campaign, that makes the worst error ten times smaller for the same number of calculations."
objectives:
  - "Explain the surrogate-and-acquisition loop shared by active learning and Bayesian optimisation"
  - "Compare expected improvement and upper confidence bound as exploration–exploitation trade-offs"
  - "Run a query-by-committee campaign with trust levels and a stopping rule"
  - "Compare committee disagreement with Gaussian-process variance as measures of uncertainty"
  - "Estimate the DFT budget of an active-learning campaign against direct ab initio MD"
track: practice
weight: 4
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

{{< note type="try" >}}
Run eight experiments with expected improvement and keep the hidden property hidden. Before you tick *Reveal the hidden property*, guess where the optimum is from the surrogate alone. Then reveal it and check two things: does the true curve stay inside the shaded 95% band everywhere, and if not, where does it escape? The band is the model's own opinion of its ignorance, set by its kernel. It is useful only where that opinion is honest.
{{< /note >}}

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

## Active learning for an interatomic potential

Training a machine-learned potential ([training data and validation](../mlip/)) is active learning in its purest form. The candidates are configurations, produced by the thousand by running molecular dynamics with the current model; the expensive experiment is a DFT calculation; and the goal is not one best point but a model that is reliable everywhere the simulations will go. The pool is also badly skewed. A trajectory spends nearly all its time near equilibrium and rarely visits compressed bonds, transition states or hot liquid, which is exactly where a potential trained on random snapshots fails.

### Query by committee

Letting a committee of models choose the next question is an idea of Seung, Opper and Sompolinsky (1992), who called it **query by committee**. For potentials, the committee is an ensemble of typically four or five models trained on the same data from different random initialisations, sometimes on different subsets as well. Where the members agree, the configuration resembles something they have seen; where they disagree, at least some of them are extrapolating. DP-GEN (Zhang and colleagues, 2020) scores each configuration by the largest disagreement about any atom's force:

{{< eq title="Committee force deviation" say="Find the atom whose force the committee members disagree about most; that disagreement scores the whole configuration." >}}
$$ \textcolor{#f08c2e}{\epsilon_F} = \max_i \sqrt{\Big\langle \big\lVert \textcolor{#4c6ef5}{\mathbf F_i^{(m)}} - \langle \mathbf F_i \rangle_m \big\rVert^2 \Big\rangle_m} $$
- $\textcolor{#4c6ef5}{\mathbf F_i^{(m)}}$: the force on atom $i$ predicted by committee member $m$; $\langle\cdot\rangle_m$: the average over members
- the maximum over atoms, because one badly described atom is enough to derail a trajectory
{{< /eq >}}

Two thresholds turn the score into a decision. Below a lower trust level $\epsilon_{\text{lo}}$ a frame is **accurate** and skipped. Between the two levels it is a **candidate** for DFT. Above an upper level $\epsilon_{\text{hi}}$ it is **failed** and also skipped, because such frames usually come from a trajectory that has already gone astray, with atoms in unphysical positions, and computing them wastes DFT time or does not converge at all. Typical values are a few hundredths and a few tenths of an eV/Å, with $\epsilon_{\text{lo}}$ set a little above the committee's spread on held-out structures whose errors are acceptable.

### Gaussian-process variance

A Gaussian-process potential provides an uncertainty without a committee. FLARE (Vandermause and colleagues, 2020) runs molecular dynamics with a Gaussian-process force field and watches the predicted uncertainty of every atom's force. When it exceeds a threshold, the simulation pauses, DFT is called on the current frame, the most uncertain atomic environments are added to the model, and the run carries on: the training set is built by the very simulation it serves.

The two kinds of uncertainty behave differently. For fixed hyperparameters, the GP predictive variance is

$$
\sigma^2(\mathbf x) = k(\mathbf x, \mathbf x) - \mathbf k_*^{\mathsf T}\big(\mathbf K + \sigma_n^2\mathbf I\big)^{-1}\mathbf k_*,
$$

which depends on where the training data are (through the kernel matrix $\mathbf K$ and the kernels $\mathbf k_*$ between the new point and the data) but **not on their labels**. Variance-driven selection is therefore a space-filling design in the metric of the kernel: it goes where data are sparse, whether or not the energy surface there is difficult, until the hyperparameters are refitted. A committee's disagreement does depend on the labels, so it can notice that one region is harder than another. But it costs four or five times as much to train and evaluate, and members that share an architecture and a data set can agree confidently and be wrong together. Linear models offer a third measure, the D-optimality extrapolation grade of moment tensor potentials (Podryabinkin and Shapeev, 2017), which, like the GP variance, depends only on where the data are ([kernel and linear potentials](../kernel-and-linear-potentials/)). None of the three is guaranteed to be calibrated; all are best used to rank configurations.

### A realistic campaign

A typical campaign for one material, say an elemental metal near its melting point, has the following shape. The numbers are representative, not prescriptive.

1. **Seed.** Compute about 100 structures with DFT: strained and rattled crystals and a few snapshots of a short ab initio MD run. Train a committee of four models.
2. **Explore.** Run a few dozen short MD simulations with the current model, from room temperature to well above the melting point and at a few pressures. Each step costs a tiny fraction of a DFT calculation, so tens of thousands of frames are cheap.
3. **Select.** Score every frame with $\epsilon_F$. Early on, many frames are candidates or failures. Take at most a few hundred candidates, chosen for diversity (by farthest-point sampling in descriptor space, for example) rather than from the top of the ranking, which tends to hold consecutive frames of a single event.
4. **Label and retrain.** Compute the selected frames with DFT, add them, and retrain every member.
5. **Stop or extend.** When nearly all frames in every exploration condition, say 99 per cent, fall below $\epsilon_{\text{lo}}$ for two or three successive iterations, the potential has converged *for those conditions*. Extend the conditions (surfaces, vacancies, higher pressures) and repeat, or stop and validate.

The arithmetic shows why the loop is worth the trouble. Ten iterations of up to 200 frames plus the seed make about 2,000 DFT calculations. Ab initio MD covering the same conditions directly, say 20 runs of 10 ps with 2 fs steps, needs 100,000 DFT force evaluations, about fifty times more, and still oversamples the uninformative configurations near equilibrium. The committee certifies only that its members agree on what was explored, so the final potential still needs the physical validation of [the chapter on training and validation](../mlip/).

The cell below runs a miniature campaign. The "DFT" reference is a Morse bond curve. The pool is 2,000 bond lengths drawn as a hot MD simulation would visit them, crowded near equilibrium with rare compressed and stretched frames. The committee is five ridge-regression models that differ only in the width of their Gaussian basis functions. Starting from three calculations near equilibrium, it repeatedly sends the frame with the largest spread to "DFT", and stops when the largest spread anywhere in the pool falls below 0.02 eV.

{{< py title="query by committee on a bond curve" >}}
import numpy as np
rng = np.random.default_rng(0)
def dft(r):                                          # the 'expensive' reference: a Morse bond (eV)
    return 2.0 * (1 - np.exp(-1.8 * (r - 1.2))) ** 2 - 2.0
grid = np.linspace(0.8, 2.4, 1601)                   # hot 'MD' visits bond lengths with Boltzmann weight
w = np.exp(-(dft(grid) + 2) / 0.3)
pool = rng.choice(grid, 2000, p=w / w.sum())
centres = np.linspace(0.6, 2.6, 21)
def committee(x):                                    # five models that differ only in basis width
    out = []
    for width in (0.15, 0.2, 0.25, 0.3, 0.35):
        A = lambda r: np.exp(-((r[:, None] - centres) / width) ** 2)
        c = np.linalg.solve(A(x).T @ A(x) + 1e-3 * np.eye(len(centres)), A(x).T @ dft(x))
        out.append(A(pool) @ c)
    return np.array(out)
x = np.array([1.15, 1.25, 1.35])                     # three starting calculations near equilibrium
while (spread := committee(x).std(0)).max() > 0.02:  # stop when the committee agrees everywhere
    x = np.append(x, pool[np.argmax(spread)])        # the frame they disagree on most goes to DFT
worst = lambda x: np.abs(committee(x).mean(0) - dft(pool)).max()
print(f"pool of {len(pool)} frames, {pool.min():.2f} to {pool.max():.2f} Å")
print("committee chose", np.round(x[3:], 2))
print(f"stopped after {len(x)} DFT calls; worst error on the pool {worst(x):.3f} eV")
rand = [worst(rng.choice(pool, len(x), replace=False)) for _ in range(50)]
print(f"{len(x)} random frames instead: worst error {np.median(rand):.3f} eV (median of 50)")
{{< /py >}}

```text
pool of 2000 frames, 0.84 to 2.36 Å
committee chose [0.84 1.73 1.56 2.   2.36 0.96 2.19 1.86]
stopped after 11 DFT calls; worst error on the pool 0.052 eV
11 random frames instead: worst error 0.562 eV (median of 50)
```

The committee goes straight for the extremes: the most compressed frame in the pool (0.84 Å), then stretched bonds out to the tail at 2.36 Å, configurations that random picks rarely include. After eleven calculations its worst error anywhere in the pool is 0.052 eV. Eleven frames chosen at random leave a worst error of 0.56 eV, ten times larger, because the model must extrapolate to the rare frames. Notice too that the committee stopped with its largest spread below 0.02 eV while its true worst error was 0.052 eV: the spread ranked the frames correctly but underestimated the error by a factor of two and a half. It is a ranking, not an error bar.

{{< note type="warn" title="Common mistakes in active-learning campaigns" >}}
- **Thresholds chosen in a vacuum.** A lower trust level below the committee's spread on well-described structures spends DFT time on noise; one far above it lets real errors through. Calibrate it on a test set first.
- **Taking the top of the ranking.** The most uncertain frames are often consecutive snapshots of one event. Select a diverse subset.
- **Labelling exploded frames.** Frames with enormous disagreement are usually unphysical. They belong in the failed bin, not in the training set.
- **Stopping because the committee agrees.** Agreement certifies only the conditions explored. A potential converged for the bulk crystal knows nothing about its surface.
{{< /note >}}

## Beyond the textbook loop

- **Batches.** Laboratories and computing clusters run many experiments in parallel. Batch BO picks several points at once, for example by "fantasising" the outcome of each chosen point before choosing the next (the kriging-believer heuristic), or with batch acquisition functions such as q-EI.
- **Several objectives.** Materials usually trade properties against each other: conductivity against stability, strength against ductility. Multi-objective BO targets the **Pareto front** and uses acquisition functions such as expected hypervolume improvement.
- **Constraints and cost.** Some compositions cannot be made; some measurements cost more than others. Constrained and cost-aware acquisition functions account for both, and **multi-fidelity** BO mixes cheap, approximate evaluations (a coarse DFT setting, a quick screening measurement) with expensive accurate ones.
- **High dimensions.** GPs struggle beyond about 20 continuous variables. Trust-region methods (TuRBO), additive kernels and learned low-dimensional representations extend BO to larger design spaces.

{{< note type="story" >}}
The "kriging" in kriging believer is a word from mining. In the early 1950s the South African mining engineer Danie Krige estimated gold grades in the Witwatersrand from scattered borehole samples, weighting each sample by its statistical correlation with the point to be estimated. In the 1960s the French mathematician Georges Matheron put the method on a rigorous footing and named it after Krige. Kriging is, in essence, Gaussian-process regression, so every surrogate in this chapter descends from the problem of guessing ore grades between boreholes.
{{< /note >}}

## Self-driving laboratories

When synthesis and characterisation are robotic, the loop can close without a human: the BO algorithm chooses the next composition, robots prepare and measure it, and the result updates the model within minutes. Autonomous laboratories have optimised thin-film conductivity, photocatalyst formulations and perovskite compositions, discovering in days what would take months by hand. The algorithms are the ones in the lab above; the engineering challenge is reliable automation, and the scientific challenge is choosing a design space that contains something worth finding.

{{< note type="fun" >}}
The mobile robotic chemist of Burger and colleagues (2020) moved around an ordinary laboratory between instruments, ran 688 experiments in eight days in a ten-variable space chosen by a batched Bayesian optimiser, and found photocatalyst mixtures for hydrogen production six times more active than the formulations it started from.
{{< /note >}}

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

{{< note type="practice" title="Active-learning tools for potentials" >}}
- **DP-GEN** runs the committee loop for Deep Potential models, from training the ensemble and exploring with LAMMPS to submitting the DFT jobs; **FLARE** builds Gaussian-process force fields on the fly; the **MLIP** package (moment tensor potentials) and **pacemaker** (ACE) select configurations by their extrapolation grade during the simulation itself.
- For any other architecture, a committee of independently seeded models and a short script that scores frames and picks a diverse subset are enough to start.
{{< /note >}}

{{< note type="key" >}}
- Active learning chooses data to make a model good everywhere it will be used; Bayesian optimisation chooses experiments to find the best design. Both fit a surrogate with an uncertainty and maximise an acquisition function.
- UCB trades mean against uncertainty through κ; expected improvement balances them automatically and is the common default.
- For potentials, query by committee scores each frame by the largest force disagreement, and two trust levels sort frames into accurate, candidate and failed.
- GP variance depends only on where the data are, not on their labels; committee spread depends on labels but costs several models. Neither is a calibrated error bar, so use them to rank.
- Stop when nearly all explored frames are accurate, then extend the conditions or validate physically: agreement certifies only what was explored.
{{< /note >}}

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
- q: "For a Gaussian process with fixed hyperparameters, what does the predictive variance at a new point depend on?"
  options: ["The measured values (labels) of the training data", "The noise level only", "The positions of the training points and the kernel, but not their labels"]
  answer: 2
  why: "In $\\sigma^2(\\mathbf x) = k(\\mathbf x,\\mathbf x) - \\mathbf k_*^{\\mathsf T}(\\mathbf K + \\sigma_n^2\\mathbf I)^{-1}\\mathbf k_*$ no label appears. Variance-driven selection fills space in the kernel's metric until the hyperparameters are refitted."
- q: "In a committee-based campaign, why are frames whose force deviation exceeds the upper trust level not sent to DFT?"
  options: ["They usually come from a trajectory that has already gone astray, so their geometries are unphysical and waste DFT time or fail to converge", "They are already described accurately", "DFT cannot compute forces above a threshold"]
  answer: 0
  why: "Huge disagreement usually means the simulation has entered nonsense territory. The informative frames are the candidates between the two trust levels."
- q: "In the miniature campaign, the committee stopped with its largest spread below 0.02 eV, yet its worst true error was 0.052 eV. What does this show?"
  options: ["The committee was implemented wrongly", "Committee spread ranks configurations well but is not a calibrated error bar", "The reference curve was noisy"]
  answer: 1
  why: "The spread pointed at the right frames throughout but underestimated the size of the error, as uncertainty estimates for potentials usually do. Use it to rank and to trigger calculations, and validate separately."
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
12. H. S. Seung, M. Opper and H. Sompolinsky, “Query by committee,” *Proceedings of the Fifth Annual Workshop on Computational Learning Theory (COLT)*, 287–294 (1992).
13. E. V. Podryabinkin and A. V. Shapeev, “Active learning of linearly parametrized interatomic potentials,” *Computational Materials Science* **140**, 171–180 (2017).

</div>
