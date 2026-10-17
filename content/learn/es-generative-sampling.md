---
title: "Generative models for equilibrium sampling"
description: "Sampling the Boltzmann distribution without following dynamics: importance sampling and the effective sample size, normalizing flows and the change-of-variables formula, coupling layers, Boltzmann generators trained by energy and by example, mode collapse, free energies by reweighting, exact sampling with a generator as a Monte Carlo proposal, equivariant and continuous flows, flow matching, and diffusion models for molecular ensembles."
track: rl-ml
weight: 2
level: Advanced
prereqs: ["es-ml-cvs", "diffusion-models", "probability"]
lab: "Train a Boltzmann generator in the browser, watch a Gaussian bend into a double well, and recover the exact free-energy difference by reweighting"
---

## Sampling without dynamics

### Why trajectories are slow

Every method in the previous chapters generates samples of the Boltzmann distribution $p(\mathbf x) \propto e^{-U(\mathbf x)/k_BT}$ by moving through configuration space one small step at a time. A molecular dynamics step changes positions by a fraction of an ångström; a Monte Carlo move is accepted only if it does not raise the energy too much. Consecutive samples are therefore strongly correlated, and the time needed to pass from one metastable state to another grows exponentially with the barrier between them, as [the chapter on rates](../es-rates/) showed. Enhanced sampling methods attack this by biasing the dynamics, heating the system or pulling it along a collective variable, but they all keep the basic picture of a walker moving through the landscape.

### A different question

In 2019 Frank Noé, Simon Olsson, Jonas Köhler and Hao Wu asked a different question. Suppose a neural network could be trained to produce configurations directly: feed it random numbers, and it returns a molecular configuration, independent of the previous one, drawn from a distribution $q(\mathbf x)$ close to the Boltzmann distribution. Configurations from distant metastable states would appear in the same batch, with no transitions to wait for. They called such a network a **Boltzmann generator**. Two problems must be solved before the idea is useful. A learned $q$ is never exactly $p$, so its errors must be corrected; and the network must be trainable when the very thing we lack is a good sample of $p$. This chapter develops both solutions, then trains a Boltzmann generator in front of you.

## Importance sampling

### Reweighting to the Boltzmann distribution

The errors of an approximate sampler can be removed exactly if its density can be evaluated. The idea is older than computers: Herman Kahn and others used it in the Monte Carlo neutron calculations of the early 1950s. Draw samples $\mathbf x_i$ from $q$, and give each a weight equal to the ratio of the target density to the proposal density:

{{< eq title="Importance reweighting" say="Draw from the generator, then count each sample by how much more likely it is under the Boltzmann distribution than under the generator." >}}
$$ \langle A\rangle_p \approx \frac{\sum_i \textcolor{#e8792b}{w_i}\, A(\mathbf x_i)}{\sum_i \textcolor{#e8792b}{w_i}}, \qquad \textcolor{#e8792b}{w_i} = \frac{e^{-U(\mathbf x_i)/k_BT}}{q(\mathbf x_i)} $$
- $q(\mathbf x_i)$: the density with which the generator produced $\mathbf x_i$
- the unknown normalisation of $p$, the partition function, cancels between numerator and denominator
{{< /eq >}}

The estimate converges to the exact Boltzmann average for any $q$ that is non-zero wherever $p$ is. A sample in a region the generator over-populates receives a small weight; a sample in a region it under-populates receives a large one.

### The effective sample size

How well $q$ matches $p$ decides how many samples are needed. If the weights are nearly equal, every sample counts; if one sample carries most of the total weight, the average is effectively computed from that single sample. Leslie Kish's **effective sample size**, introduced for survey statistics in 1965, measures this:

$$
n_{\text{eff}} = \frac{\left(\sum_i w_i\right)^2}{\sum_i w_i^2}, \qquad 1 \le n_{\text{eff}} \le n .
$$

The ratio $n_{\text{eff}}/n$ is the standard diagnostic of a Boltzmann generator: close to 1, the generator is nearly exact; close to 0, a few samples dominate and the estimates are noisy.

### What reweighting cannot fix

Reweighting has a blind spot. If $q$ is practically zero in a region where $p$ is large, samples from that region essentially never appear, and no weight can be attached to samples that do not exist. The estimate is then wrong, and, worse, the effective sample size can still look excellent, because it is computed only from the samples that were drawn. The figure shows this with a proposal built by hand from Gaussian modes: shrink the modes and a few samples carry enormous weights; switch to mode collapse and the population of the missing state is estimated as zero with no warning. This limitation will return when we train a real generator.

{{< widget name="bgen" title="Importance reweighting of a hand-built proposal" caption="Left: samples from a proposal made of two Gaussian modes; dot size is the importance weight. Right: the density along x from raw samples (blue), after reweighting (orange) and exact (rose). Narrow the modes to see the weights become uneven, and switch to mode collapse to see a state disappear from the estimate." >}}

## Normalizing flows

### Changing variables

To reweight, the generator must report the density $q(\mathbf x)$ of every configuration it produces. Most neural generators cannot do this, but one family can by construction. Start from random numbers $\mathbf z$ with a simple density, a standard Gaussian $p_z$, and transform them with an **invertible** function $\mathbf x = f(\mathbf z)$. Probability is conserved under the transformation: where $f$ stretches space, the same probability is spread over a larger volume and the density falls; where it compresses space, the density rises. The local stretching factor is the Jacobian determinant, and the result is the change-of-variables formula of calculus:

{{< eq title="The density of a normalizing flow" say="The density of a generated configuration is the Gaussian density of the noise it came from, corrected by how much the network stretched volume on the way." >}}
$$ \ln q(\mathbf x) = \ln p_z(\mathbf z) - \ln\left|\det \frac{\partial f(\mathbf z)}{\partial \mathbf z}\right|, \qquad \mathbf z = f^{-1}(\mathbf x) $$
- $\partial f/\partial\mathbf z$: the Jacobian matrix of the transformation, whose determinant is the factor by which a small volume element grows
{{< /eq >}}

A transformation built from a sequence of simple invertible steps that turns a simple density into a complicated one is called a **normalizing flow**: the density "flows" through the steps and stays normalised throughout. Esteban Tabak and Eric Vanden-Eijnden formulated density estimation this way in 2010; Danilo Rezende and Shakir Mohamed brought the name and the idea into deep learning in 2015.

### Coupling layers

A general neural network is neither invertible nor equipped with a cheap determinant: for $d$ coordinates the determinant costs of order $d^3$ operations. Laurent Dinh, David Krueger and Yoshua Bengio found a way around both problems in 2014 (NICE), extended by Dinh, Jascha Sohl-Dickstein and Samy Bengio in 2017 (RealNVP). Split the coordinates into two groups, $\mathbf x_a$ and $\mathbf x_b$. Leave the first group unchanged and transform the second by a scale and a shift computed from the first:

{{< eq title="The affine coupling layer" say="Half of the coordinates pass through untouched and decide how the other half is stretched and shifted." >}}
$$ \mathbf y_a = \mathbf x_a, \qquad \mathbf y_b = \mathbf x_b \odot e^{\textcolor{#12a594}{\mathbf s(\mathbf x_a)}} + \textcolor{#6d4fe0}{\mathbf t(\mathbf x_a)}, \qquad \ln\left|\det\frac{\partial \mathbf y}{\partial \mathbf x}\right| = \sum_j \textcolor{#12a594}{s_j(\mathbf x_a)} $$
- $\mathbf s$ and $\mathbf t$: arbitrary neural networks; they never need to be inverted
- inverse: $\mathbf x_b = (\mathbf y_b - \mathbf t(\mathbf y_a)) \odot e^{-\mathbf s(\mathbf y_a)}$, exact and as cheap as the forward pass
{{< /eq >}}

The Jacobian of this map is triangular, because $\mathbf y_a$ does not depend on $\mathbf x_b$, so its determinant is the product of the diagonal entries $e^{s_j}$. The networks $\mathbf s$ and $\mathbf t$ can be as expressive as we like; invertibility is guaranteed by the structure, not by the networks.

### Stacking layers

One coupling layer cannot do much, because half of the coordinates pass through it unchanged. Alternating which group is transformed, and stacking many layers, produces a flexible map whose log-determinant is simply the sum over layers. The figure below uses eight such layers on two coordinates. Its slider shows the samples after each layer: watch the Gaussian cloud being sheared one coordinate at a time, folded into a curved valley, and finally split into two separate states.

## Training a Boltzmann generator

### Training by energy

How should the flow be trained when no good samples of $p$ exist? The answer of Noé and colleagues was to minimise a distance between $q$ and $p$ that requires only the energy function. The Kullback–Leibler divergence of $q$ from $p$ is

{{< eq title="Training by energy: the reverse Kullback–Leibler divergence" say="Generate configurations, and penalise the generator for high energies and for being too concentrated; the balance between the two is exactly the Boltzmann distribution." >}}
$$ \mathrm{KL}(q\,\|\,p) = \Big\langle \frac{U(f(\mathbf z))}{k_BT} - \ln\left|\det\frac{\partial f}{\partial\mathbf z}\right| \Big\rangle_{\mathbf z\sim p_z} + \ln Z + \text{const} $$
- the first term pulls samples to low energy; the second, an entropy, stops them from collapsing onto the minimum
- $\ln Z$ does not depend on the network and drops out of the gradient
{{< /eq >}}

The average is over Gaussian noise, so its gradient with respect to the network parameters is computed by drawing $\mathbf z$, pushing it through the flow and backpropagating through the energy and the layers, the reparameterisation trick of Diederik Kingma and Max Welling (2014). The force $-\nabla U$ appears directly in this gradient: the generator is trained by the same forces that drive molecular dynamics.

### Training by example

The second way to train is by example, from configurations $\mathbf x_n$ produced by short simulations. Here the flow is used in reverse: each configuration is mapped back to noise, and its likelihood is maximised,

$$
\mathcal L_{\text{ML}} = -\frac1N\sum_n \ln q(\mathbf x_n) = \frac1N\sum_n\Big[\tfrac12\big|f^{-1}(\mathbf x_n)\big|^2 - \ln\left|\det\frac{\partial f^{-1}}{\partial\mathbf x}\right|_{\mathbf x_n}\Big] + \text{const},
$$

which minimises the opposite divergence, $\mathrm{KL}(p\,\|\,q)$, as far as the data represent $p$. The short simulations do not need the correct relative populations of the states, only reasonable coverage of each; the populations are corrected later by reweighting.

### Mode-seeking and mode-covering

The two divergences fail in opposite ways, and the difference is the most important practical fact about Boltzmann generators. The reverse divergence $\mathrm{KL}(q\|p) = \int q\ln(q/p)$ is an average over the generator's own samples, so it heavily penalises samples in high-energy regions but pays nothing for regions the generator never visits. Starting from a Gaussian, the flow finds one well, fits it well, and has no incentive to cross the barrier: it is **mode-seeking** and liable to **mode collapse**. The forward divergence $\mathrm{KL}(p\|q) = \int p\ln(p/q)$ is an average over the data, so it heavily penalises any data point the generator assigns low probability: it is **mode-covering**, but only for the modes the data contain. Noé and colleagues combined the two: likelihood on short simulations in each known state keeps all states in the generator, and the energy term sharpens the generator where data are sparse.

### A Boltzmann generator in your browser

The figure trains a real normalizing flow, eight affine coupling layers with 24 hidden units each, on a two-dimensional double well with a curved valley,

$$
U(x, y) = 8(x^2 - 1)^2 + 0.5\,x + 2\big(y - 0.6\sin 1.8x\big)^2 \quad (k_BT = 1),
$$

whose barrier of about $8\,k_BT$ keeps ordinary Langevin dynamics in the well where it starts. The right-hand state lies $0.97\,k_BT$ higher in free energy and holds 27.4 % of the population. All of it, the coupling networks, the backpropagation through every layer and the Adam optimiser, runs in JavaScript in this page, about a hundred training steps per second.

{{< widget name="bgflow" title="Training a Boltzmann generator" caption="Left: the Gaussian latent samples, coloured by the state they end up in. Centre: the same samples after the flow, over the energy landscape; dot size is the importance weight, grey dots are the training simulations. Right: the free energy along x, exact (rose), from the training data, from raw generated samples and after reweighting. The slider and the play button show the samples after each coupling layer." >}}

Work through the four training modes in order.

1. **Likelihood, one state.** The training data come from one simulation started in the left well, which never crosses the barrier. The flow learns the left well very well, the effective sample size is high, and the estimated population of the right state is zero. Nothing in the output signals that anything is missing.
2. **Energy only.** No data at all. The flow finds a well and collapses into it; which one depends on the random initial network. Again the effective sample size looks healthy and the free-energy difference is wrong.
3. **Likelihood, both states.** One short simulation in each well, equally long, so the data have the wrong ratio of 50 : 50. The raw samples inherit that ratio, but reweighting corrects it, and the free-energy difference converges to the exact $0.97\,k_BT$ within statistical error.
4. **Likelihood + energy.** The combination used by Noé and colleagues: the data hold both states in place and the energy term refines the shape of each well. The raw samples are already closer to the Boltzmann distribution, and the reweighted estimate is exact.

Press *Play the transformation* after training to see what the network has learned: the first layers shear and stretch the Gaussian, the middle layers bend it along the curved valley, and the final layers tear it into two pieces with a gap at the barrier, where the flow places almost no probability.

### The same model in PyTorch

The browser version is written by hand to show every step. In practice a flow is written in a framework with automatic differentiation. The program below trains the same model in PyTorch with both losses and reweights 200 000 samples; it runs in about two minutes on a laptop CPU.

```python
import math
import torch
from torch import nn

torch.manual_seed(0)
kT = 1.0

def energy(x):                                   # x: (n, 2)
    a, b = x[:, 0], x[:, 1]
    return 8 * (a**2 - 1)**2 + 0.5 * a + 2 * (b - 0.6 * torch.sin(1.8 * a))**2

class Coupling(nn.Module):
    """Affine coupling: keep x[:, keep], transform x[:, move] by a scale and shift
    computed from x[:, keep]. The Jacobian is triangular, so log|det J| = sum of s."""
    def __init__(self, keep, hidden=32):
        super().__init__()
        self.keep, self.move = keep, 1 - keep
        self.net = nn.Sequential(nn.Linear(1, hidden), nn.Tanh(),
                                 nn.Linear(hidden, hidden), nn.Tanh(),
                                 nn.Linear(hidden, 2))
        nn.init.zeros_(self.net[-1].weight); nn.init.zeros_(self.net[-1].bias)   # start as the identity

    def st(self, a):
        s, t = self.net(a).chunk(2, dim=1)
        return 2 * torch.tanh(s / 2), t                      # bounded scale for stability

    def forward(self, x):                                    # z -> x direction
        a, b = x[:, [self.keep]], x[:, [self.move]]
        s, t = self.st(a)
        out = torch.empty_like(x)
        out[:, [self.keep]], out[:, [self.move]] = a, b * torch.exp(s) + t
        return out, s.squeeze(1)

    def inverse(self, y):                                    # x -> z direction
        a, yb = y[:, [self.keep]], y[:, [self.move]]
        s, t = self.st(a)
        out = torch.empty_like(y)
        out[:, [self.keep]], out[:, [self.move]] = a, (yb - t) * torch.exp(-s)
        return out, -s.squeeze(1)

class Flow(nn.Module):
    def __init__(self, n_layers=8):
        super().__init__()
        self.layers = nn.ModuleList([Coupling(keep=k % 2) for k in range(n_layers)])

    def sample(self, n):                                     # returns x and log q(x)
        z = torch.randn(n, 2)
        logq = -0.5 * (z**2).sum(1) - math.log(2 * math.pi)
        x = z
        for layer in self.layers:
            x, ld = layer(x)
            logq = logq - ld
        return x, logq

    def log_prob(self, x):
        logdet = torch.zeros(len(x))
        for layer in reversed(self.layers):
            x, ld = layer.inverse(x)
            logdet = logdet + ld
        return -0.5 * (x**2).sum(1) - math.log(2 * math.pi) + logdet

def langevin(x0, steps=20000, dt=0.004, every=20):
    """Overdamped Langevin dynamics: the 'short simulations' that provide training data."""
    x = torch.tensor([[x0, 0.6 * math.sin(1.8 * x0)]])
    frames = []
    for i in range(steps):
        x.requires_grad_(True)
        f = -torch.autograd.grad(energy(x).sum(), x)[0]
        x = (x + f * dt + math.sqrt(2 * kT * dt) * torch.randn_like(x)).detach()
        if i % every == 0:
            frames.append(x)
    return torch.cat(frames)

data = torch.cat([langevin(-1.0), langevin(1.0)])           # one short run in each state
print(f"training frames: {len(data)}, fraction in right state: {(data[:, 0] > 0).float().mean():.2f}")

flow = Flow()
opt = torch.optim.Adam(flow.parameters(), lr=2e-3)
for step in range(3001):
    batch = data[torch.randint(len(data), (256,))]
    loss_ml = -flow.log_prob(batch).mean()                  # training by example
    x, logq = flow.sample(256)
    loss_kl = (energy(x) / kT + logq).mean()                # training by energy
    loss = loss_ml + loss_kl
    opt.zero_grad(); loss.backward(); opt.step()
    if step % 1000 == 0:
        print(f"step {step:5d}   NLL {loss_ml.item():7.3f}   KL {loss_kl.item():7.3f}")

with torch.no_grad():                                        # reweight to the Boltzmann distribution
    x, logq = flow.sample(200_000)
    logw = -energy(x) / kT - logq
    w = torch.exp(logw - logw.max())
    ess = w.sum()**2 / (w**2).sum() / len(w)
    right = x[:, 0] > 0
    p_raw = right.float().mean()
    p_rw = w[right].sum() / w.sum()
    dF = -kT * torch.log(p_rw / (1 - p_rw))

grid = torch.linspace(-3, 3, 200_001)
bz = torch.exp(-(8 * (grid**2 - 1)**2 + 0.5 * grid))
p_exact = bz[grid > 0].sum() / bz.sum()
print(f"effective sample size: {100 * ess:.1f} %")
print(f"P(right): raw {p_raw:.3f}, reweighted {p_rw:.3f}, exact {p_exact:.3f}")
print(f"dF(right - left): {dF:.3f} kT, exact {-math.log(p_exact / (1 - p_exact)):.3f} kT")
```

Its output:

```text
training frames: 2000, fraction in right state: 0.50
step     0   NLL   2.616   KL  13.500
step  1000   NLL   1.038   KL   0.179
step  2000   NLL   0.996   KL   0.135
step  3000   NLL   1.030   KL   0.140
effective sample size: 89.8 %
P(right): raw 0.357, reweighted 0.273, exact 0.274
dF(right - left): 0.980 kT, exact 0.973 kT
```

The training data hold the two states in equal amounts, the raw generator puts 35.7 % of its samples in the right state, and reweighting brings the population to 27.3 %, against the exact 27.4 %. The *KL* column is the reverse divergence minus the constant $\ln Z$. For this potential $\ln Z = -0.098$, so the final value of $0.140$ corresponds to a divergence of about $0.04$: the generator is close to, but not exactly, the Boltzmann distribution, and reweighting removes the remaining difference.

## Free energies and exact sampling

### Free-energy differences by reweighting

With weights in hand, the free-energy difference between two states $A$ and $B$ follows from their reweighted populations,

{{< eq title="Free-energy difference from a generator" say="Add up the weights of the samples in each state; the free-energy difference is the logarithm of the ratio." >}}
$$ \Delta F_{AB} = -k_BT\,\ln\frac{\sum_{i\in B} w_i}{\sum_{i\in A} w_i} $$
- each sample is independent, so the statistical error follows from the effective sample size in each state, with no correlation time
{{< /eq >}}

This is the calculation the figure performs. It needs no path between the states and no collective variable: the generator connects them through its latent space, where the two states are neighbouring regions of the same Gaussian. The same idea, mapping one ensemble onto another with a learned invertible transformation, underlies **targeted free-energy perturbation**, proposed by Christopher Jarzynski in 2002 and realised with normalizing flows by Peter Wirnsberger and colleagues in 2020.

### A generator as a Monte Carlo proposal

Reweighting is exact only in the limit of many samples. A generator can also be made exact sample by sample, by using it as the proposal of a Monte Carlo chain. In the **independence Metropolis sampler**, analysed by Luke Tierney in 1994, each new configuration $\mathbf x'$ is drawn from $q$ independently of the current one $\mathbf x$, and accepted with probability

$$
\alpha(\mathbf x \to \mathbf x') = \min\left(1,\ \frac{w(\mathbf x')}{w(\mathbf x)}\right),
$$

the ratio of importance weights. The chain samples the Boltzmann distribution exactly, and its acceptance rate is a direct measure of the quality of the generator. Generators can also propose local moves combined with molecular dynamics, the strategy of Timewarp below.

## Beyond the first Boltzmann generators

### Symmetry and coordinates

A molecule's energy does not change if it is rotated or translated or if identical atoms are exchanged; a flow on raw Cartesian coordinates must learn these symmetries from data, wastefully. Two remedies are used. The first transforms to internal coordinates, bond lengths, angles and torsions, in which rigid-body motion has been removed; the original Boltzmann generators did this for proteins. The second builds the symmetry into the network: the equivariant flows of Jonas Köhler, Leon Klein and Frank Noé (2020) give densities that are invariant under rotations and permutations by construction.

### Continuous flows and flow matching

Instead of a stack of discrete layers, the transformation can be a continuous flow defined by a learned velocity field, $\mathrm d\mathbf x/\mathrm dt = \mathbf v_\theta(\mathbf x, t)$, integrated from $t = 0$ to $1$. These continuous normalizing flows (Ricky Chen and colleagues, 2018) need no special layer structure, and the density follows from the divergence of the velocity field,

$$
\frac{\mathrm d\ln q(\mathbf x(t))}{\mathrm dt} = -\nabla\cdot\mathbf v_\theta(\mathbf x(t), t) .
$$

They were expensive to train until **flow matching** (Yaron Lipman and colleagues, 2023) replaced likelihood training by a simple regression of $\mathbf v_\theta$ onto the velocities of straight-line paths between noise and data. Equivariant flow matching (Klein, Andreas Krämer and Noé, 2023) applied this to molecules and is the basis of most current Boltzmann generators.

### Transferable generators

A Boltzmann generator trained for one molecule is useless for another. Timewarp (Leon Klein and colleagues, 2023) learns instead the distribution of configurations a long time step ahead in molecular dynamics, conditioned on the current configuration, across many small peptides, and uses Metropolis acceptance to keep sampling exact on peptides it was not trained on. Transferability across chemistry, rather than speed on one system, is now the main goal of the field.

## Diffusion models for molecular ensembles

### The score is the force

[Diffusion models](../diffusion-models/) generate samples by learning to reverse a gradual noising process; what they learn is the **score**, the gradient of the log-density, at every noise level. For the Boltzmann distribution the score has a familiar meaning:

{{< eq title="The score of the Boltzmann distribution" say="The direction in which the Boltzmann probability increases fastest is the direction of the force." >}}
$$ \nabla_{\mathbf x}\ln p(\mathbf x) = -\frac{\nabla U(\mathbf x)}{k_BT} = \frac{\mathbf F(\mathbf x)}{k_BT} $$
{{< /eq >}}

A diffusion model trained on equilibrium configurations therefore learns, at its lowest noise level, an approximation to the force field. Marloes Arts and colleagues (2023) used this to obtain coarse-grained force fields from diffusion models trained on simulation data.

### Conformers and proteins

Diffusion models are now the dominant generative architecture for molecular structures. GeoDiff (Minkai Xu and colleagues, 2022) and torsional diffusion (Bowen Jing and colleagues, 2022) generate conformer ensembles of small molecules; equivariant diffusion models generate new molecules and crystals; and models trained on protein structures and large amounts of simulation data, such as BioEmu (Sarah Lewis and colleagues, 2025), generate ensembles of protein conformations orders of magnitude faster than molecular dynamics.

### The density problem

Diffusion models do not provide the density of a generated sample cheaply. It can be computed by integrating the associated probability-flow ordinary differential equation, as for a continuous flow, but at considerable cost. Without it, a generated ensemble cannot be reweighted and must be validated against simulation or experiment. Whether a generated ensemble is the Boltzmann distribution, or only resembles it, is the central question of generative sampling.

## What generative sampling can and cannot do

Generative samplers deliver what enhanced sampling has always sought: independent configurations from widely separated states, without waiting for transitions. They are strongest when tied to physics, trained on simulation data, refined with the energy and corrected by reweighting or Metropolis acceptance. Their weaknesses are equally clear. A generator cannot be trusted in regions it has never been shown, and mode collapse can hide a state while every diagnostic looks healthy, as the first two modes of the figure demonstrate. Scaling is the open problem: the overlap between $q$ and $p$, and with it the effective sample size, falls roughly exponentially with the number of degrees of freedom, so the success on two dimensions here, or on small proteins in vacuum, does not carry over directly to a solvated system of ten thousand atoms. The practical frontier combines generative proposals with exact acceptance steps and with molecular dynamics, using the generator for speed and statistical mechanics for correctness.

{{< note type="key" >}}
- A generator with a tractable density $q(\mathbf x)$ yields exact Boltzmann averages through importance weights $w = e^{-U/k_BT}/q$; the effective sample size measures efficiency, but cannot detect states the generator never produces.
- Normalizing flows give exact densities through the change-of-variables formula; affine coupling layers make the inverse and the Jacobian determinant cheap.
- Training by energy (reverse KL) needs no data but is mode-seeking; training by example (likelihood) covers the states in the data; combining both and reweighting gives exact free-energy differences.
- An independence Metropolis sampler with the generator as proposal is exact sample by sample.
- Equivariant and continuous flows, flow matching and transferable models extend the idea; diffusion models learn the score, which for the Boltzmann distribution is the force divided by $k_BT$.
{{< /note >}}

{{< quiz >}}
- q: "1000 samples are reweighted; one sample carries 90 % of the total weight. The effective sample size is roughly…"
  options: ["1000", "about 1", "500"]
  answer: 1
  why: "n_eff = (Σw)²/Σw² is dominated by the single large weight."
- q: "A flow trained by likelihood on a simulation that stayed in state A reports an effective sample size of 95 %. What can you conclude about state B?"
  options: ["Its population is correctly estimated", "Nothing: the effective sample size is computed only from generated samples, and the flow may never generate B", "B does not exist"]
  answer: 1
  why: "Reweighting cannot correct for regions the generator never visits; the diagnostic is blind to them."
- q: "Why is the Jacobian determinant of an affine coupling layer cheap?"
  options: ["The networks s and t are linear", "The Jacobian is triangular, so its determinant is the product of the diagonal entries exp(s_j)", "It is always equal to one"]
  answer: 1
  why: "The untouched half does not depend on the transformed half."
- q: "What is the score of the Boltzmann distribution?"
  options: ["The energy", "The force divided by k_BT", "The entropy"]
  answer: 1
  why: "∇ ln e^{−U/k_BT} = −∇U/k_BT = F/k_BT."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. F. Noé, S. Olsson, J. Köhler and H. Wu, "Boltzmann generators: sampling equilibrium states of many-body systems with deep learning", *Science* **365**, eaaw1147 (2019).
2. E. G. Tabak and E. Vanden-Eijnden, "Density estimation by dual ascent of the log-likelihood", *Communications in Mathematical Sciences* **8**, 217–233 (2010).
3. D. J. Rezende and S. Mohamed, "Variational inference with normalizing flows", *Proceedings of the 32nd International Conference on Machine Learning*, 1530–1538 (2015).
4. L. Dinh, D. Krueger and Y. Bengio, "NICE: non-linear independent components estimation", arXiv:1410.8516 (2014).
5. L. Dinh, J. Sohl-Dickstein and S. Bengio, "Density estimation using Real NVP", *International Conference on Learning Representations* (2017).
6. D. P. Kingma and M. Welling, "Auto-encoding variational Bayes", *International Conference on Learning Representations* (2014).
7. L. Kish, *Survey Sampling*, Wiley (1965).
8. L. Tierney, "Markov chains for exploring posterior distributions", *Annals of Statistics* **22**, 1701–1728 (1994).
9. C. Jarzynski, "Targeted free energy perturbation", *Physical Review E* **65**, 046122 (2002).
10. P. Wirnsberger, A. J. Ballard, G. Papamakarios, S. Abercrombie, S. Racanière, A. Pritzel, D. Jimenez Rezende and C. Blundell, "Targeted free energy estimation via learned mappings", *Journal of Chemical Physics* **153**, 144112 (2020).
11. J. Köhler, L. Klein and F. Noé, "Equivariant flows: exact likelihood generative learning for symmetric densities", *Proceedings of the 37th International Conference on Machine Learning*, 5361–5370 (2020).
12. R. T. Q. Chen, Y. Rubanova, J. Bettencourt and D. Duvenaud, "Neural ordinary differential equations", *Advances in Neural Information Processing Systems* **31** (2018).
13. Y. Lipman, R. T. Q. Chen, H. Ben-Hamu, M. Nickel and M. Le, "Flow matching for generative modeling", *International Conference on Learning Representations* (2023).
14. L. Klein, A. Krämer and F. Noé, "Equivariant flow matching", *Advances in Neural Information Processing Systems* **36** (2023).
15. L. Klein et al., "Timewarp: transferable acceleration of molecular dynamics by learning time-coarsened dynamics", *Advances in Neural Information Processing Systems* **36** (2023).
16. M. Arts et al., "Two for one: diffusion models and force fields for coarse-grained molecular dynamics", *Journal of Chemical Theory and Computation* **19**, 6151–6159 (2023).
17. M. Xu, L. Yu, Y. Song, C. Shi, S. Ermon and J. Tang, "GeoDiff: a geometric diffusion model for molecular conformation generation", *International Conference on Learning Representations* (2022).
18. B. Jing, G. Corso, J. Chang, R. Barzilay and T. Jaakkola, "Torsional diffusion for molecular conformer generation", *Advances in Neural Information Processing Systems* **35** (2022).
19. S. Lewis et al., "Scalable emulation of protein equilibrium ensembles with generative deep learning", *Science* (2025).
20. G. Papamakarios, E. Nalisnick, D. J. Rezende, S. Mohamed and B. Lakshminarayanan, "Normalizing flows for probabilistic modeling and inference", *Journal of Machine Learning Research* **22**, 1–64 (2021). A thorough review.

</div>
