---
title: "Generative models and diffusion"
description: "From predicting properties to proposing materials: the generative modelling problem, VAEs and autoregressive models in brief, then diffusion models in depth (forward noising, score matching, the reverse process, guidance) and how MatterGen-style models generate crystals."
track: ai4mat
weight: 4
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

## The forward process: destroying data, gently

Take a data point $\mathbf x_0$, for example atomic coordinates. Add a little Gaussian noise, then a little more, over many steps, until nothing of the original remains. With a variance-preserving schedule, the noisy sample at time $t$ can be written in closed form:

$$
\mathbf x_t = \sqrt{\bar\alpha_t}\,\mathbf x_0 + \sqrt{1-\bar\alpha_t}\,\boldsymbol\varepsilon, \qquad \boldsymbol\varepsilon\sim\mathcal N(\mathbf 0, \mathbf I),
$$

where $\bar\alpha_t$ decreases from 1 (clean data) to nearly 0 (pure noise) according to a **noise schedule**; the lab uses the cosine schedule of Nichol and Dhariwal. The forward process needs no learning. Its endpoint, a standard Gaussian, is easy to sample.

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

The remarkable fact behind diffusion models is that the score can be learned by solving a simple regression problem. Corrupt clean samples with known noise and train a network $\boldsymbol\varepsilon_\theta(\mathbf x_t, t)$ to predict that noise:

$$
\mathcal L(\theta) = \mathbb E_{\mathbf x_0,\,t,\,\boldsymbol\varepsilon}\Big\lVert \boldsymbol\varepsilon - \boldsymbol\varepsilon_\theta\big(\sqrt{\bar\alpha_t}\,\mathbf x_0 + \sqrt{1-\bar\alpha_t}\,\boldsymbol\varepsilon,\; t\big)\Big\rVert^2 .
$$

This **denoising score matching** objective (Vincent, 2011; Ho et al., 2020) has the score as its optimum: $\nabla_{\mathbf x}\log p_t(\mathbf x) = -\boldsymbol\varepsilon_\theta(\mathbf x, t)/\sqrt{1-\bar\alpha_t}$. No adversarial game, no likelihood to compute, just mean squared error, which is why diffusion models train so stably.

**Sampling (DDPM).** Start from $\mathbf x_T\sim\mathcal N(\mathbf 0,\mathbf I)$ and repeat, with $\alpha_t = \bar\alpha_t/\bar\alpha_{t-1}$:

$$
\mathbf x_{t-1} = \frac{1}{\sqrt{\alpha_t}}\left(\mathbf x_t - \frac{1-\alpha_t}{\sqrt{1-\bar\alpha_t}}\,\boldsymbol\varepsilon_\theta(\mathbf x_t, t)\right) + \sigma_t\,\mathbf z, \qquad \mathbf z\sim\mathcal N(\mathbf 0,\mathbf I).
$$

Each step removes a little predicted noise and adds back a smaller amount of fresh noise. In the lab, the **model error** slider replaces the exact score with one learned too coarsely; the samples still find the right regions but come out smeared, the typical failure of an under-trained model.

## Guidance: generating what you asked for

To sample from $p(\mathbf x\mid y)$, use Bayes' rule on the score:

$$
\nabla_{\mathbf x}\log p_t(\mathbf x\mid y) = \nabla_{\mathbf x}\log p_t(\mathbf x) + \nabla_{\mathbf x}\log p_t(y\mid\mathbf x).
$$

**Classifier guidance** adds the gradient of a separately trained property predictor; **classifier-free guidance** trains one network both with and without the condition and extrapolates between the two predictions, $\tilde{\boldsymbol\varepsilon} = (1+w)\,\boldsymbol\varepsilon_\theta(\mathbf x_t, t, y) - w\,\boldsymbol\varepsilon_\theta(\mathbf x_t, t)$, with a guidance weight $w$ that trades diversity for adherence to the condition. In the lab, the *condition* control uses the exact conditional score: generation places points only on the selected shell.

## Diffusion for crystals

A crystal is not a cloud of points in a plane, and each part of it needs its own diffusion process:

- **Atom types** are discrete: they are diffused with discrete (categorical) noise, for example randomly masking or replacing elements.
- **Fractional coordinates** live on a torus (they wrap around at 0 and 1), so the noise is a **wrapped Gaussian** and the score is computed on the periodic domain.
- **The lattice** (three vectors) is diffused separately and must be generated consistently with the atoms.
- **The denoising network** must be equivariant to rotations, invariant to permutations and to the choice of unit cell, which is where the periodic equivariant graph networks of the [graph-network](../graph-neural-networks/) and [crystal-graph](../materials-representations/) lessons come in.

**DiffCSP** (Jiao et al., 2023) jointly diffuses lattices and fractional coordinates for crystal structure prediction. **MatterGen** (Zeni et al., 2025) diffuses atom types, coordinates and lattice together, then fine-tunes with adapter modules so that generation can be steered towards target chemistry, symmetry, magnetic density or bulk modulus. In both cases generated candidates are relaxed with an MLIP or DFT, checked for stability against the convex hull ([the lesson on crystal graphs](../materials-representations/)), screened for novelty against known databases, and only then proposed for synthesis. The generative model narrows the search; it does not replace the physics.

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
