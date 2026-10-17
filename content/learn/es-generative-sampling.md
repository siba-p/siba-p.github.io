---
title: "Generative models for sampling: Boltzmann generators and diffusion"
description: "Drawing independent equilibrium samples instead of following dynamics: importance sampling and the effective sample size, normalizing flows and the change-of-variables formula, Boltzmann generators trained by energy and by data, mode collapse, equivariant and transferable flows, flow matching, diffusion models for molecular conformations, and how generated samples are made exactly correct by reweighting."
track: rl-ml
weight: 2
level: Advanced
prereqs: ["es-ml-cvs", "diffusion-models", "probability"]
lab: "Reweight samples from a learned proposal to the Boltzmann distribution, and see what mode collapse does to the effective sample size"
---

## Independent samples in one shot

Molecular dynamics and Monte Carlo produce samples of the Boltzmann distribution one after another, each a small step from the last. Consecutive samples are correlated, and moving between metastable states requires waiting for rare events. A **generative model** offers a radically different route: learn a probability distribution $q(\mathbf x)$ that approximates the Boltzmann distribution $p(\mathbf x) \propto e^{-\beta U(\mathbf x)}$, and then draw independent samples from it directly, each one in a single evaluation of the model, wherever in configuration space it falls. If $q$ were exactly $p$, the sampling problem would be solved. It never is exactly, but if $q$ can be evaluated, its errors can be corrected.

## Importance sampling and the effective sample size

Samples drawn from a proposal $q$ can be used to compute averages under $p$ by weighting each one by the ratio of the two densities:

{{< eq title="Importance reweighting" say="Draw from the generator, then weight each sample by how much more or less likely it is under the Boltzmann distribution than under the generator." >}}
$$ \langle A\rangle_p = \frac{\sum_i w_i\, A(\mathbf x_i)}{\sum_i w_i}, \qquad w_i = \frac{e^{-\beta U(\mathbf x_i)}}{q(\mathbf x_i)}, \qquad n_{\text{eff}} = \frac{\left(\sum_i w_i\right)^2}{\sum_i w_i^2} $$
- the unknown normalisation of $p$ cancels in the ratio of sums
- $n_{\text{eff}}$, Kish's **effective sample size**, measures how many equally weighted samples the weighted set is worth
{{< /eq >}}

The estimator is unbiased (asymptotically) for any proposal that is non-zero wherever $p$ is, but its efficiency depends entirely on how well $q$ matches $p$. If a few samples carry most of the weight, the effective sample size collapses and the estimate is noisy. If $q$ misses a region where $p$ is large, no finite number of samples reveals it, and the estimate is wrong without warning.

The figure illustrates both cases with a two-dimensional double well. A learned proposal, here a mixture of Gaussians standing in for a trained network, generates samples (dot size shows the weight), which are histogrammed before and after reweighting. When the generator has learned both states with roughly the right widths, reweighting recovers the exact distribution with a high effective sample size. Narrow the modes and a few samples in the tails carry huge weights. Switch to mode collapse, where the generator has learned only state A, and the reweighted estimate of the population of B is zero: the weights cannot correct for samples that were never drawn.

{{< widget name="bgen" title="Reweighting a generator to the Boltzmann distribution" caption="Left: samples from the generator; dot size is the importance weight. Right: the density along x from raw samples (blue), after reweighting (orange) and exact (rose). Change the width of the learned modes and switch to mode collapse; watch the effective sample size and the estimated population of state B." >}}

## Normalizing flows and Boltzmann generators

Importance weights require evaluating $q(\mathbf x)$, so the generator must have a tractable density. **Normalizing flows** provide one. A flow maps a simple base distribution, such as a standard Gaussian $p_z(\mathbf z)$, through an invertible neural network $\mathbf x = f(\mathbf z)$, and the density of the result follows from the change-of-variables formula:

{{< eq title="The density of a normalizing flow" say="Push simple Gaussian noise through an invertible network; the density of the result is the noise density corrected by how much the network stretches or squeezes volume." >}}
$$ \ln q(\mathbf x) = \ln p_z\big(f^{-1}(\mathbf x)\big) + \ln\left|\det \frac{\partial f^{-1}(\mathbf x)}{\partial \mathbf x}\right| $$
- the network is built from layers whose Jacobian determinant is cheap, such as the affine coupling layers of RealNVP (Laurent Dinh, Jascha Sohl-Dickstein and Samy Bengio, 2017)
{{< /eq >}}

In 2019 Frank Noé, Simon Olsson, Jonas Köhler and Hao Wu introduced **Boltzmann generators**: normalizing flows trained to sample Boltzmann distributions of molecular systems. They can be trained in two complementary ways. **Training by energy** minimises the reverse Kullback–Leibler divergence $\mathrm{KL}(q\|p) = \langle \beta U(\mathbf x) + \ln q(\mathbf x)\rangle_q + \text{const}$, which needs only the potential energy, no data; but it tends to **mode collapse**, concentrating on one deep minimum, because it is not penalised for missing other states. **Training by example** maximises the likelihood of configurations from simulations (the forward divergence $\mathrm{KL}(p\|q)$), which covers all states present in the data but cannot discover unseen ones. Combining both, and reweighting the generated samples, Noé and colleagues sampled condensed-phase systems and small proteins and computed free-energy differences between states directly.

Later work addressed the main limitations. **Equivariant flows** (Köhler, Leon Klein and Noé, 2020) respect rotation and permutation symmetry, which flows on raw Cartesian coordinates do not. Coordinate transformations to internal coordinates make molecular flows easier to train. **Transferable** generators such as Timewarp (Klein and colleagues, 2023), which learns large time steps of molecular dynamics for many peptides and uses Metropolis acceptance to keep sampling exact, aim to work for molecules not seen in training. And **flow matching** (Yaron Lipman and colleagues, 2023) trains continuous flows by regression on simple interpolation paths, making training more stable and scalable.

## Diffusion models for molecules

Diffusion models, introduced in [the topic on diffusion models](../diffusion-models/) for crystal generation, are now the most common generative architecture for molecular conformations. A diffusion model learns the score of the data distribution at every noise level and generates samples by reversing a noising process. Models such as GeoDiff (Minkai Xu and colleagues, 2022) and torsional diffusion (Bowen Jing and colleagues, 2022) generate conformer ensembles of small molecules; equivariant diffusion models generate molecules and crystals from scratch; and large models trained on protein structures and simulation data generate ensembles of protein conformations far faster than MD.

There is a deep connection with physics here. The score of the Boltzmann distribution is $\nabla_{\mathbf x}\ln p(\mathbf x) = -\beta\nabla U(\mathbf x) = \beta\mathbf F(\mathbf x)$: the force. A diffusion model trained on equilibrium samples learns, at its lowest noise level, an approximation to the force field. Marloes Arts and colleagues (2023) exploited this to obtain coarse-grained force fields from diffusion models trained on simulation data, and generative models of this kind are increasingly combined with MLIPs, which supply exact energies for reweighting.

Unlike flows, diffusion models do not give the density $q(\mathbf x)$ of a generated sample cheaply, although it can be computed by integrating the associated probability-flow ordinary differential equation. Without it, generated ensembles cannot be reweighted exactly and must be validated against simulation or experiment. This is the central question for generative sampling: whether the generated distribution is the Boltzmann distribution or only resembles it.

## What generative sampling can and cannot do

Generative models are most powerful when trained on, or combined with, physics: data from simulations, energies from force fields or MLIPs, and exact reweighting where possible. They can produce independent samples from widely separated states without waiting for transitions, which is what enhanced sampling has always sought. They are least reliable where data are absent: a generator cannot be trusted in regions of configuration space it has never been shown, and mode collapse can hide entire states. Their scaling to large, condensed-phase systems remains an open problem, because the dimension of configuration space grows with the number of atoms and the overlap between $q$ and $p$ shrinks exponentially with it. The practical frontier combines generative proposals with Monte Carlo acceptance or MD refinement, so that the speed of generation is matched by the exactness of statistical mechanics.

{{< note type="key" >}}
- Generative samplers draw independent configurations from a learned $q(\mathbf x) \approx p(\mathbf x) \propto e^{-\beta U}$; importance weights $w = e^{-\beta U}/q$ make averages exact, with efficiency measured by the effective sample size.
- Normalizing flows give exact densities through the change-of-variables formula; Boltzmann generators train them by energy (reverse KL, prone to mode collapse) and by data (forward KL).
- Equivariant and transferable flows, Timewarp and flow matching extend the approach; diffusion models generate conformer and protein ensembles and their score relates to forces.
- Missing modes cannot be corrected by reweighting; scaling to large systems and guaranteeing Boltzmann statistics remain the main challenges.
{{< /note >}}

{{< quiz >}}
- q: "1000 samples are reweighted; one sample carries 90 % of the total weight. The effective sample size is roughly…"
  options: ["1000", "about 1", "500"]
  answer: 1
  why: "n_eff = (Σw)²/Σw² is dominated by the single large weight."
- q: "Why does training a flow only by energy (reverse KL) tend to mode collapse?"
  options: ["It needs too much data", "It is penalised for putting probability where p is small, but not for missing regions where p is large", "The flow is not invertible"]
  answer: 1
  why: "Reverse KL is 'mode-seeking'; forward KL from data is 'mode-covering'."
- q: "What is the score of the Boltzmann distribution?"
  options: ["The energy", "β times the force, −β∇U", "The entropy"]
  answer: 1
  why: "∇ ln e^{−βU} = −β∇U."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. F. Noé, S. Olsson, J. Köhler and H. Wu, "Boltzmann generators: sampling equilibrium states of many-body systems with deep learning", *Science* **365**, eaaw1147 (2019).
2. L. Dinh, J. Sohl-Dickstein and S. Bengio, "Density estimation using Real NVP", *International Conference on Learning Representations* (2017).
3. J. Köhler, L. Klein and F. Noé, "Equivariant flows: exact likelihood generative learning for symmetric densities", *Proceedings of the 37th International Conference on Machine Learning*, 5361–5370 (2020).
4. L. Klein et al., "Timewarp: transferable acceleration of molecular dynamics by learning time-coarsened dynamics", *Advances in Neural Information Processing Systems* **36** (2023).
5. Y. Lipman, R. T. Q. Chen, H. Ben-Hamu, M. Nickel and M. Le, "Flow matching for generative modeling", *International Conference on Learning Representations* (2023).
6. Y. Song, J. Sohl-Dickstein, D. P. Kingma, A. Kumar, S. Ermon and B. Poole, "Score-based generative modeling through stochastic differential equations", *International Conference on Learning Representations* (2021).
7. M. Xu, L. Yu, Y. Song, C. Shi, S. Ermon and J. Tang, "GeoDiff: a geometric diffusion model for molecular conformation generation", *International Conference on Learning Representations* (2022).
8. B. Jing, G. Corso, J. Chang, R. Barzilay and T. Jaakkola, "Torsional diffusion for molecular conformer generation", *Advances in Neural Information Processing Systems* **35** (2022).
9. M. Arts et al., "Two for one: diffusion models and force fields for coarse-grained molecular dynamics", *Journal of Chemical Theory and Computation* **19**, 6151–6159 (2023).
10. L. Kish, *Survey Sampling*, Wiley (1965), on the effective sample size.

</div>
