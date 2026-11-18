---
title: "Generative models for crystals and molecules"
description: "From predicting properties to proposing materials: the generative modelling problem, VAEs and autoregressive models in brief, then diffusion models in depth (forward noising, score matching, the reverse process, guidance) and how MatterGen-style models generate crystals."
hook: "Add noise to a crystal until nothing of it is left, then train a network to undo one small step of the damage at a time. Run it from pure noise and new structures appear, which is how models such as MatterGen propose materials."
objectives:
  - "Describe the forward noising process and sample it in closed form at any noise level"
  - "Explain why predicting the added noise is equivalent to learning the score"
  - "Implement denoising training and DDPM sampling for a two-dimensional point distribution"
  - "Interpret the guidance weight as a trade-off between adherence to a condition and diversity"
  - "Recognise what a crystal diffusion model must handle: discrete types, periodic coordinates, lattices"
cover: "cover.svg"
milestones:
  - year: 2015
    text: "Sohl-Dickstein and colleagues train generative models by reversing a diffusion process"
  - year: 2020
    text: "Ho, Jain and Abbeel's denoising diffusion models match the best image generators"
  - year: 2022
    text: "Xie and colleagues generate periodic crystals with the CDVAE model"
  - year: 2025
    text: "Zeni and colleagues publish MatterGen, steering crystal generation towards target properties"
track: ai4mat
weight: 1
level: Advanced
minutes: 65
lab: "Noise a crystal motif away and generate it back"
prereqs: ["neural-networks", "materials-representations"]
---

## From prediction to generation

Everything so far has been **discriminative**: given a structure, predict a property. Discovery asks the inverse question: which structures have the property I want? Screening a database answers it only among materials already listed. A **generative model** learns the probability distribution $p(\mathbf x)$ of known structures well enough to draw new samples from it, ideally conditioned on a target, $p(\mathbf x\mid y)$.

Three families dominate.

- **Variational autoencoders** (VAEs) compress a structure to a low-dimensional latent vector and decode it back; sampling latent vectors and decoding gives new structures. CDVAE (2022) combined a VAE with a diffusion-style decoder for crystals.
- **Autoregressive models** generate a structure token by token: a sequence of atoms, or the text of a CIF file ([the lesson on attention](../transformers/)).
- **Diffusion models** learn to reverse a gradual noising process. They now produce the most realistic images, molecules, protein backbones and crystals, and are the subject of the rest of this lesson.

{{< note type="practice" title="Back of the envelope" >}}
Why not simply enumerate? Choosing four elements from the 80 or so that are practical gives $\binom{80}{4} = 1{,}581{,}580$ quaternary systems. Each admits dozens of plausible stoichiometries, and each stoichiometry hundreds of structural prototypes and site orderings, so the candidate space runs to $10^{10}$ or more before a single atom is placed off a prototype site. The Materials Project, after more than a decade of high-throughput DFT, holds of the order of $10^5$ materials. Even at one second per candidate with a universal potential ([universal potentials](../universal-potentials/)), $10^{10}$ candidates would take over 300 years. A generative model replaces enumeration by sampling from the regions of structure space where real materials are dense.
{{< /note >}}

{{< note type="story" >}}
In 2015 Jascha Sohl-Dickstein and colleagues, borrowing ideas from non-equilibrium statistical physics, proposed to train a generative model by learning to reverse a slow diffusion that turns data into noise. Independently, Yang Song and Stefano Ermon showed in 2019 that a network trained to estimate the score of data blurred by several levels of noise could generate images by Langevin dynamics. In 2020 Jonathan Ho, Ajay Jain and Pieter Abbeel simplified the 2015 objective to predicting the added noise, and obtained image samples that rivalled generative adversarial networks. Song and colleagues then showed in 2021 that both lines are discretisations of one stochastic differential equation, the framework this lesson follows.
{{< /note >}}

## The forward process: destroying data, gently

Take a data point $\mathbf x_0$, for example atomic coordinates. Add a little Gaussian noise, then a little more, over many steps, until nothing of the original remains. With a variance-preserving schedule, the noisy sample at time $t$ can be written in closed form:

$$
\mathbf x_t = \sqrt{\bar\alpha_t}\,\mathbf x_0 + \sqrt{1-\bar\alpha_t}\,\boldsymbol\varepsilon, \qquad \boldsymbol\varepsilon\sim\mathcal N(\mathbf 0, \mathbf I),
$$

where $\bar\alpha_t$ decreases from 1 (clean data) to nearly 0 (pure noise) according to a **noise schedule**; the lab uses the cosine schedule of Nichol and Dhariwal. The forward process needs no learning. Its endpoint, a standard Gaussian, is easy to sample.

### Where the closed form comes from

One step of the forward process shrinks the sample slightly and adds a little noise, $\mathbf x_t = \sqrt{1-\beta_t}\,\mathbf x_{t-1} + \sqrt{\beta_t}\,\boldsymbol\varepsilon_t$, with a small variance $\beta_t$. The shrinking is what makes the process *variance preserving*: if each component of $\mathbf x_{t-1}$ has unit variance, then $\mathbf x_t$ has variance $(1-\beta_t) + \beta_t = 1$, so the data never blow up. Two steps compose into one, because a sum of independent Gaussians is Gaussian: $\mathbf x_t = \sqrt{(1-\beta_t)(1-\beta_{t-1})}\,\mathbf x_{t-2} + (\text{noise of variance } 1 - (1-\beta_t)(1-\beta_{t-1}))$. Repeating the argument down to $\mathbf x_0$ gives the closed form with $\bar\alpha_t = \prod_{s\le t}(1-\beta_s)$. Training never runs the chain; it jumps straight to any $t$.

The schedule decides how the steps are spent. Ho and colleagues raised $\beta_t$ linearly from $10^{-4}$ to 0.02 over 1,000 steps. Halfway through, that leaves $\bar\alpha = 0.079$: the sample is already 92 per cent noise by variance, and the last few hundred steps change almost nothing. Nichol and Dhariwal's cosine schedule, used in the lab and in the code below, leaves $\bar\alpha = 0.494$ at the halfway point and reaches pure noise only near the end.

{{< note type="try" title="Pause and predict" >}}
In the lab's motif, neighbouring sites are 0.95 apart and each is blurred by a spread of 0.07. Two equal Gaussians stop looking like two peaks once their separation falls below about twice their standard deviation. At what fraction of the cosine schedule do neighbouring sites merge? The separation after noising is $0.95\sqrt{\bar\alpha}$ and the spread is $\sqrt{0.07^2\bar\alpha + 1 - \bar\alpha}$, so they merge when $\bar\alpha$ falls below 0.82, which the cosine schedule reaches at $t/T = 0.275$ and the linear schedule at 0.138. For almost three quarters of the cosine schedule, the sample is a featureless blob; the motif is decided in the last quarter of the reverse process.
{{< /note >}}

{{< fig src="schedule.svg" alt="Left: signal fraction against fraction of the schedule for the cosine and linear schedules, the linear one falling much faster, with a dashed line at 0.82 where neighbouring sites merge. Right: log10 signal-to-noise ratio for both, crossing zero near 0.27 for the linear and near 0.5 for the cosine schedule" caption="The linear schedule of Ho and colleagues destroys the data in its first half and spends the rest on nearly pure noise; the cosine schedule spreads the destruction evenly in signal-to-noise ratio. The dashed line marks $\bar\alpha = 0.82$, below which neighbouring sites of the lab's motif merge." >}}

{{< widget name="diffusion" title="Forward noising and reverse generation of a 2D crystal motif" caption="The data are points scattered around 13 sites of a hexagonal motif (dashed circles). Drag t to watch the forward process. Generate runs the reverse process from pure noise with the exact score of this distribution; the arrows show the score field, pointing towards higher probability. Try the two samplers, a condition, and a badly learned score." >}}

## Reversing it: the score

If we could run the process backwards we could turn Gaussian noise into data. For small steps the reverse of a diffusion is again a diffusion, and its drift depends on a single unknown function, the **score** of the noisy data distribution,

$$
\mathbf s(\mathbf x, t) = \nabla_{\mathbf x}\log p_t(\mathbf x),
$$

the vector field that points towards regions of higher probability at noise level $t$ (the arrows in the lab). Anderson (1982) showed that the time reversal of $\mathrm d\mathbf x = \mathbf f\,\mathrm dt + g\,\mathrm d\mathbf w$ is $\mathrm d\mathbf x = \big[\mathbf f - g^2\nabla\log p_t\big]\mathrm dt + g\,\mathrm d\bar{\mathbf w}$. Song et al. (2021) used this to unify diffusion models as stochastic differential equations. There is also a deterministic **probability-flow ODE** with the same marginal distributions at every $t$:

$$
\frac{\mathrm d\mathbf x}{\mathrm dt} = \mathbf f(\mathbf x, t) - \tfrac12 g(t)^2\,\nabla_{\mathbf x}\log p_t(\mathbf x).
$$

The two samplers in the lab correspond to these two equations: DDPM's stochastic steps and DDIM's deterministic steps.

**In the lab the score is exact.** The data are a mixture of narrow Gaussians, and adding Gaussian noise to a Gaussian mixture gives another Gaussian mixture, with means $\sqrt{\bar\alpha_t}\boldsymbol\mu_k$ and variance $\bar\alpha_t s_0^2 + (1-\bar\alpha_t)$. Its score is a softmax-weighted pull towards the shrunken centres:

$$
\nabla_{\mathbf x}\log p_t(\mathbf x) = \sum_k w_k(\mathbf x)\,\frac{\sqrt{\bar\alpha_t}\,\boldsymbol\mu_k - \mathbf x}{\bar\alpha_t s_0^2 + 1 - \bar\alpha_t}, \qquad w_k \propto \exp\!\left(-\frac{\lVert\mathbf x - \sqrt{\bar\alpha_t}\boldsymbol\mu_k\rVert^2}{2(\bar\alpha_t s_0^2 + 1-\bar\alpha_t)}\right).
$$

Real data have no such formula, so the score must be **learned**.

## Learning the score: denoising

The fact that makes diffusion models practical is that the score can be learned by solving a simple regression problem. Corrupt clean samples with known noise and train a network $\boldsymbol\varepsilon_\theta(\mathbf x_t, t)$ to predict that noise:

$$
\mathcal L(\theta) = \mathbb E_{\mathbf x_0,\,t,\,\boldsymbol\varepsilon}\Big\lVert \boldsymbol\varepsilon - \boldsymbol\varepsilon_\theta\big(\sqrt{\bar\alpha_t}\,\mathbf x_0 + \sqrt{1-\bar\alpha_t}\,\boldsymbol\varepsilon,\; t\big)\Big\rVert^2 .
$$

This **denoising score matching** objective (Vincent, 2011; Ho et al., 2020) has the score as its optimum: $\nabla_{\mathbf x}\log p_t(\mathbf x) = -\boldsymbol\varepsilon_\theta(\mathbf x, t)/\sqrt{1-\bar\alpha_t}$. No adversarial game, no likelihood to compute, just mean squared error, which is why diffusion models train so stably.

{{< fig src="pipeline.svg" alt="Top row: a clean hexagonal point motif, the same points blurred by noise, a box for the network, and the loss comparing drawn and predicted noise. Bottom row: four panels going from a Gaussian cloud through partly denoised clouds to a sharp motif" caption="Training (top) needs no simulation of the chain: draw a noise level and a noise vector, form $\mathbf x_t$ in closed form, and regress the network output on the noise just drawn. Sampling (bottom) is the only part that runs step by step, from pure noise to a sample." >}}

### Why predicting the noise gives the score

The equivalence follows from two facts. First, the noisy sample is Gaussian around the scaled clean one, so its conditional score is known exactly: $\nabla_{\mathbf x_t}\log q(\mathbf x_t\mid\mathbf x_0) = -(\mathbf x_t - \sqrt{\bar\alpha_t}\,\mathbf x_0)/(1-\bar\alpha_t) = -\boldsymbol\varepsilon/\sqrt{1-\bar\alpha_t}$. Second, a network trained by least squares learns the *conditional mean* of its target: the best possible $\boldsymbol\varepsilon_\theta(\mathbf x_t, t)$ is $\mathbb E[\boldsymbol\varepsilon\mid\mathbf x_t]$, the average of all the noise vectors that could have produced this $\mathbf x_t$. Averaging the conditional score over the clean samples consistent with $\mathbf x_t$ gives the score of the noisy marginal, which is Vincent's 2011 result:

$$
\nabla_{\mathbf x}\log p_t(\mathbf x_t) = -\frac{\mathbb E[\boldsymbol\varepsilon\mid\mathbf x_t]}{\sqrt{1-\bar\alpha_t}}, \qquad
\mathbb E[\mathbf x_0\mid\mathbf x_t] = \frac{\mathbf x_t + (1-\bar\alpha_t)\,\nabla_{\mathbf x}\log p_t(\mathbf x_t)}{\sqrt{\bar\alpha_t}}.
$$

The second form, Tweedie's formula, says that the score also gives the best estimate of the clean structure, which is what DDIM and the crystal figure below use at every step. The cell checks the first form on the simplest data set there is: two sites at $\pm1$, noised to $\bar\alpha = 0.5$. It averages the noise actually drawn over narrow bins of $\mathbf x_t$ and compares the averages with $-\sqrt{1-\bar\alpha}$ times the exact score.

{{< py title="the best denoiser is the score" >}}
import numpy as np
rng = np.random.default_rng(0)
abar, n = 0.5, 1_000_000                       # one noise level; a million training pairs
x0 = rng.choice([-1.0, 1.0], n)                # data: two 'sites' at -1 and +1
eps = rng.normal(size=n)
xt = np.sqrt(abar) * x0 + np.sqrt(1 - abar) * eps
def score(x):                                  # exact score of the noisy two-site mixture
    m = np.sqrt(abar)                          # (variance of each component is 1 - abar)
    w = 1 / (1 + np.exp(-2 * m * x / (1 - abar)))      # probability that x came from +1
    return (m * (2 * w - 1) - x) / (1 - abar)
print("  x_t   best guess of ε (bin average)   -sqrt(1-abar) * score")
for c in (-1.5, -0.75, 0.0, 0.75, 1.5):
    sel = np.abs(xt - c) < 0.02
    print(f"{c:+5.2f}   {eps[sel].mean():+8.3f}                    {-np.sqrt(1 - abar) * score(c):+8.3f}")
best = eps + np.sqrt(1 - abar) * score(xt)      # residual of the optimal denoiser
print(f"loss of predicting 0: {np.mean(eps**2):.3f}; loss of the optimal denoiser: {np.mean(best**2):.3f}")
{{< /py >}}

```text
  x_t   best guess of ε (bin average)   -sqrt(1-abar) * score
-1.50     -1.152                      -1.150
-0.75     -0.269                      -0.275
+0.00     +0.001                      -0.000
+0.75     +0.265                      +0.275
+1.50     +1.143                      +1.150
loss of predicting 0: 0.998; loss of the optimal denoiser: 0.450
```

The bin averages agree with the scaled score to within the sampling noise of each bin. At $x_t = 0$, exactly halfway between the scaled sites, either site is equally likely and the best guess of the noise is zero. The last line holds a lesson for anyone watching a training curve: even the perfect denoiser has a loss of 0.450 at this noise level, because the noise cannot be recovered from $\mathbf x_t$ alone. The training loss of a diffusion model has a floor well above zero. For the lab's 13-site motif and cosine schedule, a Monte Carlo estimate with the exact score puts the floor, averaged over noise levels, at about 0.36; the network in the code below ends with a minibatch loss of 0.426. The floor is highest, about 0.6, at intermediate noise levels where it is ambiguous which site a point came from, and lowest at high noise, where $\mathbf x_t$ is almost all noise and so almost determines $\boldsymbol\varepsilon$.

**Sampling (DDPM).** Start from $\mathbf x_T\sim\mathcal N(\mathbf 0,\mathbf I)$ and repeat, with $\alpha_t = \bar\alpha_t/\bar\alpha_{t-1}$:

$$
\mathbf x_{t-1} = \frac{1}{\sqrt{\alpha_t}}\left(\mathbf x_t - \frac{1-\alpha_t}{\sqrt{1-\bar\alpha_t}}\,\boldsymbol\varepsilon_\theta(\mathbf x_t, t)\right) + \sigma_t\,\mathbf z, \qquad \mathbf z\sim\mathcal N(\mathbf 0,\mathbf I).
$$

Each step removes a little predicted noise and adds back a smaller amount of fresh noise. In the lab, the **model error** slider replaces the exact score with one learned too coarsely; the samples still find the right regions but come out smeared, the typical failure of an under-trained model.

### Stochastic or deterministic sampling

DDPM injects fresh noise at every step, so trajectories wander and two runs from the same starting point end at different samples. DDIM (Song, Meng and Ermon, 2021) instead follows the probability-flow ODE: each step forms the Tweedie estimate of $\mathbf x_0$ and moves to the noise level of the next step along the same predicted noise. The map from starting noise to sample is then deterministic and smooth, trajectories never cross, and because the ODE tolerates large steps, 50 to 100 steps often replace the 1,000 of the original DDPM. The price is that errors in the learned score are no longer partly washed out by the injected noise, so at very few steps sample quality degrades.

{{< fig src="trajectories.svg" alt="Two panels of coordinate against denoising step over a shaded density that narrows from one broad band into four lines. Left: 24 jagged stochastic trajectories that criss-cross before settling on the four sites. Right: 24 smooth deterministic trajectories that never cross and bend onto the sites near the end" caption="The same exact score drives both samplers for a one-dimensional ‘crystal’ of four sites. Stochastic paths (left) cross and change their minds until late; deterministic paths (right) keep their order from start to finish, so nearby starting noise maps to nearby samples. Both put all 24 samples within 0.25 of a site." >}}

For materials work the deterministic map has a practical use. Because each sample corresponds to one point of starting noise, small changes of that noise give small changes of the structure, which allows interpolation between generated crystals and repeated generation of the same candidate under a slightly different condition. The stochastic sampler is more forgiving of an imperfect score and is the usual default when only diversity matters.

## Guidance: generating what you asked for

To sample from $p(\mathbf x\mid y)$, use Bayes' rule on the score:

$$
\nabla_{\mathbf x}\log p_t(\mathbf x\mid y) = \nabla_{\mathbf x}\log p_t(\mathbf x) + \nabla_{\mathbf x}\log p_t(y\mid\mathbf x).
$$

**Classifier guidance** adds the gradient of a separately trained property predictor; **classifier-free guidance** trains one network both with and without the condition and extrapolates between the two predictions, $\tilde{\boldsymbol\varepsilon} = (1+w)\,\boldsymbol\varepsilon_\theta(\mathbf x_t, t, y) - w\,\boldsymbol\varepsilon_\theta(\mathbf x_t, t)$, with a guidance weight $w$ that trades diversity for adherence to the condition. In the lab, the *condition* control uses the exact conditional score: generation places points only on the selected shell.

In numbers: with $w = 2$ the sampler uses $3\,\boldsymbol\varepsilon_\theta(\mathbf x_t, t, y) - 2\,\boldsymbol\varepsilon_\theta(\mathbf x_t, t)$, three times the conditional prediction minus twice the unconditional one. At a single noise level this is the score of $p_t(\mathbf x)\,p_t(y\mid\mathbf x)^{1+w}$, the conditional density sharpened by raising the classifier term to the third power, so structures that only weakly satisfy the condition are suppressed. The same network serves every $w$: during training the condition is dropped at random, typically for 10 to 20 per cent of the examples, so that one set of weights learns both predictions. MatterGen's property-steered generation combines its adapter modules with classifier-free guidance of this kind, and the guidance weight is the knob that trades how many candidates meet the target against how varied they are.

## Diffusion for crystals

A crystal is not a cloud of points in a plane, and each part of it needs its own diffusion process:

- **Atom types** are discrete: they are diffused with discrete (categorical) noise, for example randomly masking or replacing elements.
- **Fractional coordinates** live on a torus (they wrap around at 0 and 1), so the noise is a **wrapped Gaussian** and the score is computed on the periodic domain.
- **The lattice** (three vectors) is diffused separately and must be generated consistently with the atoms.
- **The denoising network** must be equivariant to rotations, invariant to permutations and to the choice of unit cell, which is where the periodic equivariant graph networks of the [graph-network](../graph-neural-networks/) and [crystal-graph](../materials-representations/) lessons come in.

The figure below runs a reverse diffusion process for six two-dimensional periodic cells at once. Every cell starts as pure noise: random fractional coordinates for four atoms, element labels halfway between A and B, and a random lattice. At each step, a denoiser predicts the clean crystal from the noisy one, and the sample moves part of the way towards that prediction while fresh, smaller noise is added; coordinates wrap around the cell, and the lattice and the element labels are denoised alongside the positions. Here the denoiser is the exact one for a small training set of five 2D crystals (square, checkerboard, triangular, honeycomb and striped arrangements), handling the permutation and translation symmetry by searching over atom assignments; a trained network learns an approximation to exactly this function for millions of crystals. Watch structure emerge from noise in each cell, ending in different crystals, and condition on composition to restrict what can be generated, the two-dimensional analogue of MatterGen's property conditioning.

{{< widget name="crystaldiff" title="Crystals emerging from noise" caption="Six independent samples of a reverse diffusion process over fractional coordinates, element types (blue A, orange B) and lattice parameters, with periodic images shown faintly. The bar shows the noise level. Generate several times, try the composition condition, and run the forward process to see a crystal dissolve into noise." >}}

**DiffCSP** (Jiao et al., 2023) jointly diffuses lattices and fractional coordinates for crystal structure prediction. **MatterGen** (Zeni et al., 2025) diffuses atom types, coordinates and lattice together, then fine-tunes with adapter modules so that generation can be steered towards target chemistry, symmetry, magnetic density or bulk modulus. In both cases generated candidates are relaxed with an MLIP or DFT, checked for stability against the convex hull ([the lesson on crystal graphs](../materials-representations/)), screened for novelty against known databases, and only then proposed for synthesis. The generative model narrows the search; it does not replace the physics.

### Judging what comes out

A generative model for crystals is evaluated in stages, and each stage removes a large fraction of the output.

- **Validity.** No two atoms closer than a chemically sensible distance (CDVAE used 0.5 Å as a hard floor) and, for ionic compounds, an assignment of oxidation states that makes the cell charge-neutral.
- **Uniqueness and novelty.** Generated structures are compared with each other and with the training databases using a structure matcher (pymatgen's `StructureMatcher` is the usual tool), which tests whether two cells are the same crystal up to lattice choice, origin and a tolerance. A model that regenerates its training set is a database, not a discovery engine.
- **Stability.** After relaxation with DFT or a trusted MLIP, the distance to the convex hull of all known competing phases. MatterGen counts a structure as stable if it lies within 0.1 eV/atom of the hull, and reports the fraction of samples that are stable, unique and new.
- **Properties and synthesisability.** Phonons to check dynamic stability, the targeted property recomputed with DFT, and finally a judgement, still largely human, about whether the compound can be made.

{{< note type="warn" title="Myth" >}}
**Myth:** a generative model invents materials beyond human imagination. **Reality:** it samples from a smoothed version of its training distribution. Most of its output is near known chemistry: ordered variants of known compounds, substitutions of chemically similar elements, and familiar structure types. That is what makes the output plausible, and it is also why claimed novelty must be measured. Two recurring traps are structures that match a known compound only after a symmetry tolerance is loosened, and ordered cells that are supercell approximants of a compound already known in a disordered form. Neither is a new material, and neither is caught by an exact-match novelty check.
{{< /note >}}

{{< note type="practice" title="From the lab" >}}
A property-targeted campaign typically runs as a funnel. Generate 10,000 structures conditioned on the target, for example a bulk modulus above 200 GPa within one chemical system. Remove invalid and duplicate structures; a few thousand usually remain. Relax them with a universal potential and keep those within about 0.1 eV/atom of the hull, then recompute the survivors with DFT using the same settings as the reference hull, which leaves tens to hundreds. Compute the target property and phonons with DFT for these, and pass a handful to experimental collaborators. Failure rates at each step are informative: a high invalid fraction points to an undertrained model, many duplicates to too strong guidance, and many hull failures to a model that has learned the geometry of crystals better than their energetics.
{{< /note >}}

## In practice

A complete diffusion model for the 2D motif in the lab, trained on samples rather than given the exact score:

```python
import math, torch
torch.manual_seed(0)

# data: points scattered around 13 "atomic sites" of a 2D hexagonal motif
sites = [(0.0, 0.0)] + [(math.cos(k * math.pi / 3), math.sin(k * math.pi / 3)) for k in range(6)] \
      + [(1.732 * math.cos(k * math.pi / 3 + math.pi / 6), 1.732 * math.sin(k * math.pi / 3 + math.pi / 6)) for k in range(6)]
sites = 0.95 * torch.tensor(sites)
def sample_data(n):
    return sites[torch.randint(len(sites), (n,))] + 0.07 * torch.randn(n, 2)

T = 200                                               # noise schedule (cosine, as in Nichol & Dhariwal)
s = torch.linspace(0, 1, T + 1)
abar = torch.cos((s + 0.008) / 1.008 * math.pi / 2) ** 2
abar = (abar / abar[0]).clamp(min=1e-4)

class Denoiser(torch.nn.Module):                      # predicts the noise eps from (x_t, t)
    def __init__(self, h=128):
        super().__init__()
        self.net = torch.nn.Sequential(torch.nn.Linear(2 + 16, h), torch.nn.SiLU(),
                                       torch.nn.Linear(h, h), torch.nn.SiLU(),
                                       torch.nn.Linear(h, h), torch.nn.SiLU(), torch.nn.Linear(h, 2))
    def forward(self, x, t):                           # t in [0, 1], embedded with sinusoids
        freqs = torch.exp(torch.linspace(0, math.log(100.0), 8))
        emb = torch.cat([torch.sin(t[:, None] * freqs), torch.cos(t[:, None] * freqs)], dim=1)
        return self.net(torch.cat([x, emb], dim=1))

model = Denoiser()
opt = torch.optim.Adam(model.parameters(), lr=2e-3)
for step in range(6000):                               # the whole training objective is these 5 lines
    x0 = sample_data(512)
    t = torch.randint(1, T + 1, (512,))
    eps = torch.randn_like(x0)
    xt = abar[t].sqrt()[:, None] * x0 + (1 - abar[t]).sqrt()[:, None] * eps
    loss = ((model(xt, t / T) - eps) ** 2).mean()
    opt.zero_grad(); loss.backward(); opt.step()

with torch.no_grad():                                  # ancestral (DDPM) sampling, from noise to data
    x = torch.randn(2000, 2)
    for t in range(T, 0, -1):
        a_t = abar[t] / abar[t - 1]
        eps = model(x, torch.full((len(x),), t / T))
        mean = (x - (1 - a_t) / (1 - abar[t]).sqrt() * eps) / a_t.sqrt()
        sd = ((1 - a_t) * (1 - abar[t - 1]) / (1 - abar[t])).sqrt()
        x = mean + (sd * torch.randn_like(x) if t > 1 else 0)

d = torch.cdist(x, sites).min(dim=1).values
print(f"final training loss {loss.item():.3f}")
print(f"generated points within 0.2 of a site: {(d < 0.2).float().mean():.1%}")
print(f"(for comparison, the training data: {(torch.cdist(sample_data(2000), sites).min(1).values < 0.2).float().mean():.1%})")
```

```text
final training loss 0.426
generated points within 0.2 of a site: 86.7%
(for comparison, the training data: 97.8%)
```

The learned model places most samples on the sites, but fewer than the data do: the score near the sharp, narrow peaks is the hardest part to learn, exactly the smearing that the lab's model-error slider imitates. More training, a larger network or a schedule that spends more steps at low noise all close the gap.

{{< note type="key" >}}
- A diffusion model destroys data with Gaussian noise in closed form, $\mathbf x_t = \sqrt{\bar\alpha_t}\,\mathbf x_0 + \sqrt{1-\bar\alpha_t}\,\boldsymbol\varepsilon$, and learns to undo it step by step.
- Predicting the added noise by least squares gives the score of the noisy data, $-\mathbb E[\boldsymbol\varepsilon\mid\mathbf x_t]/\sqrt{1-\bar\alpha_t}$; the training loss has a floor well above zero.
- The schedule decides where the steps are spent; the cosine schedule keeps structure longer than the linear one.
- DDPM samples stochastically; DDIM follows the probability-flow ODE, deterministically and in fewer steps.
- Classifier-free guidance with weight $w$ sharpens the conditional distribution, trading diversity for adherence to the target.
- Crystal diffusion handles discrete types, periodic coordinates and the lattice; its output is a set of hypotheses to be relaxed, checked against the hull, matched against known structures and tested.
{{< /note >}}

{{< quiz >}}
- q: "What does a diffusion model's network learn to predict during training?"
  options: ["The clean data directly from pure noise in one step", "The noise that was added to a clean sample, given the noisy sample and the noise level", "The probability of each training sample"]
  answer: 1
  why: "The denoising objective trains $\\boldsymbol\\varepsilon_\\theta(\\mathbf x_t, t)$ to predict the added noise. That prediction is proportional to the score of the noisy distribution, which drives the reverse process."
- q: "Why are fractional coordinates of a crystal diffused with a wrapped (periodic) distribution?"
  options: ["To make training faster", "Because a fractional coordinate of 0.99 and one of 0.01 are neighbours on the periodic lattice; ordinary Gaussian noise would treat them as far apart", "Because DFT requires it"]
  answer: 1
  why: "Fractional coordinates live on a torus. Noise and scores must respect the periodicity so that atoms near a cell face are treated consistently with their images."
- q: "In classifier-free guidance, what happens as the guidance weight $w$ increases?"
  options: ["Samples become more diverse", "Samples match the condition more strongly but become less diverse", "Nothing changes"]
  answer: 1
  why: "Extrapolating away from the unconditional prediction sharpens the conditional distribution: adherence to the target increases at the cost of diversity and, for very large w, realism."
- q: "A generative model proposes 1000 new crystals. What must happen before any is called a discovery?"
  options: ["Nothing; the model was trained on real data", "Relaxation with an accurate method, a stability check against competing phases, a novelty check, and ultimately synthesis and characterisation", "Only a novelty check"]
  answer: 1
  why: "Generated structures are hypotheses. Their stability and novelty must be verified computationally, and only experiment confirms that a material can be made."
- q: "A diffusion model's training loss levels off at 0.4 instead of approaching zero. What is the most likely explanation?"
  options: ["The network is too small to learn anything", "The noise cannot be recovered exactly from the noisy sample, so even the optimal denoiser has a loss well above zero", "The learning rate is too high"]
  answer: 1
  why: "The best possible prediction is the conditional mean of the noise given $\\mathbf x_t$; the spread around that mean is irreducible. For the lab's motif the floor is about 0.36, so 0.4 may already be close to optimal."
- q: "Halfway through the linear schedule of Ho and colleagues, $\\bar\\alpha \\approx 0.08$; halfway through the cosine schedule, $\\bar\\alpha \\approx 0.49$. What does this mean for the linear schedule?"
  options: ["It keeps more signal for longer", "It destroys most of the signal early and spends many late steps on nearly pure noise", "The two are equivalent"]
  answer: 1
  why: "With $\\bar\\alpha = 0.08$ the sample is already 92 per cent noise by variance, so the second half of the chain carries little information. Nichol and Dhariwal introduced the cosine schedule to spread the destruction more evenly."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. Ho, A. Jain and P. Abbeel, “Denoising diffusion probabilistic models,” *Advances in Neural Information Processing Systems* **33** (2020).
2. Y. Song, J. Sohl-Dickstein, D. P. Kingma, A. Kumar, S. Ermon and B. Poole, “Score-based generative modeling through stochastic differential equations,” *International Conference on Learning Representations* (2021).
3. J. Sohl-Dickstein, E. Weiss, N. Maheswaranathan and S. Ganguli, “Deep unsupervised learning using nonequilibrium thermodynamics,” *Proceedings of ICML*, 2256–2265 (2015).
4. P. Vincent, “A connection between score matching and denoising autoencoders,” *Neural Computation* **23**, 1661–1674 (2011).
5. B. D. O. Anderson, “Reverse-time diffusion equation models,” *Stochastic Processes and their Applications* **12**, 313–326 (1982).
6. J. Song, C. Meng and S. Ermon, “Denoising diffusion implicit models,” *International Conference on Learning Representations* (2021).
7. A. Q. Nichol and P. Dhariwal, “Improved denoising diffusion probabilistic models,” *Proceedings of ICML*, 8162–8171 (2021).
8. J. Ho and T. Salimans, “Classifier-free diffusion guidance,” arXiv:2207.12598 (2022).
9. T. Xie, X. Fu, O.-E. Ganea, R. Barzilay and T. Jaakkola, “Crystal diffusion variational autoencoder for periodic material generation,” *International Conference on Learning Representations* (2022) (CDVAE).
10. R. Jiao, W. Huang, P. Lin, J. Han, P. Chen, Y. Lu and Y. Liu, “Crystal structure prediction by joint equivariant diffusion,” *Advances in Neural Information Processing Systems* **36** (2023) (DiffCSP).
11. C. Zeni et al., “A generative model for inorganic materials design,” *Nature* **639**, 624–632 (2025) (MatterGen).
12. C. Luo, “Understanding diffusion models: a unified perspective,” arXiv:2208.11970 (2022), a readable derivation of all the above.

</div>
