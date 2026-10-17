---
title: "Kernel and linear potentials"
description: "Machine-learned potentials built on regression with fixed descriptors: linear models in a basis of environment functions, Gaussian approximation potentials with sparse Gaussian-process regression and the SOAP kernel, the spectral neighbour analysis potential, moment tensor potentials, and the atomic cluster expansion that unifies them; with their equations, training, uncertainty, cost and a comparison of strengths."
track: mlmodels
weight: 1
level: Advanced
prereqs: ["mlip-foundations", "symmetry-descriptors", "uncertainty-gaussian-processes"]
lab: "Fit a bond-energy curve with a linear basis and with a Gaussian-process kernel, and watch both extrapolate"
---

## Regression on fixed descriptors

The models in this chapter share a structure. Each atom's environment is first turned into a fixed vector of numbers, a **descriptor** $\mathbf q_i$, that respects the symmetries described in [the chapter on what an MLIP must learn](../mlip-foundations/). The atomic energy is then a function of that descriptor, chosen from a family whose parameters can be fitted reliably: either a **linear combination** of basis functions, or a **kernel expansion** that compares the environment with stored reference environments. Both families have a decisive practical property: the prediction is linear in the parameters being fitted, so training is a linear least-squares problem with a unique solution, no random initialisation and no learning-rate schedule. Both also come with principled uncertainty estimates. Their limitation is that the descriptor is fixed in advance, so the model can be no better than the description of the environment it is given.

## Linear models

In a linear MLIP, each atomic energy is a weighted sum of basis functions of the environment, $B_k(i)$, and the total energy is the sum over atoms:

{{< eq title="A linear interatomic potential" say="Describe each atom by a list of basis-function values; the energy is a weighted sum of them, summed over atoms." >}}
$$ E = \sum_{i=1}^{N} \sum_{k=1}^{K} \textcolor{#845ef7}{c_k}\, \textcolor{#12a594}{B_k}(i) = \sum_k \textcolor{#845ef7}{c_k} \underbrace{\sum_i \textcolor{#12a594}{B_k}(i)}_{\text{a structure-level feature}}, \qquad \mathbf F_j = -\sum_k \textcolor{#845ef7}{c_k} \sum_i \frac{\partial \textcolor{#12a594}{B_k}(i)}{\partial \mathbf r_j} $$
- $\textcolor{#845ef7}{c_k}$: the fitted coefficients, the same for every atom of a given element
- energies and forces are both linear in $\textcolor{#845ef7}{\mathbf c}$, so all labels enter one linear system
{{< /eq >}}

Stacking every energy and force label of the training set into a vector $\mathbf y$ and the corresponding features into a design matrix $\mathbf X$, the coefficients minimise a regularised squared error, exactly as in [the chapter on learning from data](../learning-from-data/):

$$
\mathbf c = \arg\min_{\mathbf c}\; \|\mathbf W^{1/2}(\mathbf X\mathbf c - \mathbf y)\|^2 + \lambda\|\mathbf c\|^2 = (\mathbf X^{\mathsf T}\mathbf W\mathbf X + \lambda\mathbf I)^{-1}\mathbf X^{\mathsf T}\mathbf W\mathbf y,
$$

with a diagonal weight matrix $\mathbf W$ that balances energies, forces and stresses. The figure below shows the idea in its simplest form: the energy curve of a single bond fitted as a linear combination of smooth radial basis functions, each multiplied by a cutoff function. The grey curves are the basis functions scaled by their fitted coefficients; their sum is the orange fit.

{{< widget name="basisfit" title="Linear basis and kernel fits of a bond-energy curve" caption="Training energies (dots) are taken from a reference curve (dashed) only inside the teal band. In linear mode the fit is a weighted sum of radial basis functions (grey); in kernel mode it is a Gaussian-process interpolation with its ±2σ band. Vary the number of basis functions, the length scale, the regularisation and the amount of data, and compare the error inside and outside the training range." >}}

With too few basis functions the fit cannot follow the curve; with many functions and weak regularisation it can oscillate between data points; with adequate data and regularisation it is excellent inside the training range. Outside that range, at short bond lengths where no data were given, every setting fails, in different ways. That is the central fact about all machine-learned potentials: they **interpolate** well and **extrapolate** unreliably. Real potentials protect against the most dangerous case, atoms pushed too close together, by adding a physically motivated repulsive term (such as the ZBL screened-Coulomb potential used in radiation-damage simulations) or by making sure the training set contains close contacts.

## Gaussian approximation potentials

Gaussian approximation potentials (GAP), introduced by Albert Bartók, Mike Payne, Risi Kondor and Gábor Csányi in 2010, replace the fixed basis by a **kernel**: a function $k(\mathbf q, \mathbf q')$ that measures how similar two atomic environments are. The atomic energy is a weighted sum of kernels between the environment and a set of $M$ representative environments $\mathbf q_m$ chosen from the training data:

{{< eq title="The GAP atomic energy" say="An atom's energy is a weighted vote of reference environments, each weighted by how similar it is." >}}
$$ \varepsilon(\mathbf q_i) = \sum_{m=1}^{M} \textcolor{#845ef7}{\alpha_m}\, \textcolor{#12a594}{k}(\mathbf q_i, \mathbf q_m), \qquad E = \sum_i \varepsilon(\mathbf q_i), \qquad \textcolor{#12a594}{k}_{\text{SOAP}}(\mathbf q, \mathbf q') = \left(\hat{\mathbf p}\cdot\hat{\mathbf p}'\right)^{\zeta} $$
- $\textcolor{#12a594}{k}$: the kernel; with SOAP, the normalised power spectra $\hat{\mathbf p}$ of the two environments dotted together and raised to a power $\zeta$, typically 2 or 4
- $\textcolor{#845ef7}{\alpha_m}$: weights found by sparse Gaussian-process regression; $M$ is typically a few thousand
{{< /eq >}}

The connection to Gaussian processes ([the chapter on uncertainty](../uncertainty-gaussian-processes/)) is that the kernel defines a prior over functions: it says how strongly the energies of two environments are correlated before any data are seen. Conditioning on the training data then gives a posterior mean, the prediction above, and a posterior variance, an estimate of the model's own uncertainty. The training labels are total energies, sums of atomic energies, and forces, derivatives of those sums, but because both are linear in the $\alpha_m$ they can be used directly in the regression.

A full Gaussian process with $N$ atomic environments needs to invert an $N\times N$ matrix, which becomes impossible for the hundreds of thousands of environments in a typical training set. GAP uses **sparse** Gaussian-process regression, in the projected-process form described by Snelson and Ghahramani: the function is represented through $M \ll N$ representative environments, chosen by clustering or by CUR matrix decomposition, and the weights solve

$$
\boldsymbol\alpha = \left(\mathbf K_{MM} + \mathbf K_{MN}\boldsymbol\Lambda^{-1}\mathbf K_{NM}\right)^{-1}\mathbf K_{MN}\boldsymbol\Lambda^{-1}\mathbf y ,
$$

where $\mathbf K_{MN}$ contains kernels (and their derivatives, for force labels) between representative environments and training data, and the diagonal matrix $\boldsymbol\Lambda$ holds the expected error of each label, which plays the role of the regularisation. Setting these noise levels per type of structure, smaller for crystals than for liquids for example, is how GAP users tell the fit which data to trust most.

Switch the figure to kernel mode to see a one-dimensional Gaussian process. Between training points the predictive band is narrow; beyond them it widens, honestly reporting that the model does not know. This uncertainty is the main attraction of kernel potentials for building training sets, because new structures can be chosen where the predicted variance is largest ([active learning](../active-learning/)).

GAP models have been built for many materials, often with combined descriptors: a two-body term, a three-body term and SOAP, each with its own kernel. The **GAP-18** potential for silicon, trained on a carefully designed database of crystal phases, surfaces, defects, liquid and amorphous structures, reproduces DFT across this whole range and was used to study the structure of amorphous silicon. GAP-17 for carbon describes amorphous carbon, graphite, diamond and their transformations, and GAP models of tungsten were developed for the dislocation and defect physics of fusion-reactor materials. The cost of prediction scales with $M$ and with the cost of computing SOAP, which makes GAP accurate but relatively slow, typically one to two orders of magnitude more expensive than an EAM potential.

## The spectral neighbour analysis potential

The spectral neighbour analysis potential (SNAP), developed by Aidan Thompson and colleagues at Sandia in 2015, takes the linear route with a powerful descriptor. The density of neighbours around each atom is mapped onto the surface of a four-dimensional sphere and expanded in **hyperspherical harmonics**; the **bispectrum** components, triple products of the expansion coefficients contracted with Clebsch–Gordan coefficients, are invariant to rotation and capture four-body correlations. The atomic energy is a linear combination of bispectrum components (or, in quadratic SNAP, of their products). Because the model is linear, fitting is fast and evaluation is cheap: SNAP was designed for and runs efficiently in the LAMMPS code, on GPUs and on the largest supercomputers, and has been used for tungsten, tantalum, indium phosphide and carbon at extreme conditions, including billion-atom simulations.

## Moment tensor potentials

Alexander Shapeev's moment tensor potentials (MTP, 2016) build the basis from **moment tensors** of the neighbourhood, tensors of increasing rank formed from the neighbour vectors weighted by radial functions:

{{< eq title="Moment tensors" say="Weighted sums of outer products of the neighbour vectors: rank 0 counts neighbours, rank 1 is like a dipole, rank 2 like a quadrupole of the environment." >}}
$$ \textcolor{#12a594}{M}_{\mu,\nu}(i) = \sum_{j} f_{\mu}(r_{ij})\; \underbrace{\mathbf r_{ij}\otimes\mathbf r_{ij}\otimes\cdots\otimes\mathbf r_{ij}}_{\nu\ \text{times}} $$
- contracting products of moment tensors over all their indices produces rotation-invariant scalars; the set of all such contractions up to a chosen **level** forms the basis
- the radial functions $f_\mu$ are themselves linear combinations of Chebyshev polynomials with fitted coefficients
{{< /eq >}}

Increasing the level systematically enlarges the basis, so accuracy can be improved in a controlled way, and the MTP family has a mathematical completeness result: any smooth, symmetric function of the environment can be approximated to arbitrary accuracy as the level grows. MTPs are usually trained with an **active-learning** scheme based on the D-optimality criterion: during a simulation, the "extrapolation grade" of each new configuration measures how far outside the span of the training set it lies, and configurations beyond a threshold are sent for DFT calculation and added to the training set. This scheme, implemented in the MLIP package by Podryabinkin and Shapeev (2017), made MTPs a popular choice for alloys and for crystal-structure prediction.

## The atomic cluster expansion

In 2019 Ralf Drautz introduced the **atomic cluster expansion** (ACE), which put all these descriptors into a single framework. ACE starts from a one-particle basis, products of radial functions and spherical harmonics, and projects the neighbour density onto it:

{{< eq title="The atomic cluster expansion" say="Project the neighbours onto a basis once; then build many-body correlations by multiplying the projections, and make them rotation-invariant by contracting angular indices." >}}
$$ \textcolor{#4c6ef5}{A}_{nlm}(i) = \sum_{j\in\mathcal N(i)} R_{nl}(r_{ij})\,Y_{lm}(\hat{\mathbf r}_{ij}), \qquad \textcolor{#12a594}{B}_{\mathbf n\mathbf l}(i) = \sum_{\mathbf m} \textcolor{#845ef7}{C^{\mathbf l}_{\mathbf m}} \prod_{t=1}^{\nu} \textcolor{#4c6ef5}{A}_{n_t l_t m_t}(i), \qquad \varepsilon_i = \sum_{\mathbf n\mathbf l} c_{\mathbf n\mathbf l}\,\textcolor{#12a594}{B}_{\mathbf n\mathbf l}(i) $$
- $\textcolor{#4c6ef5}{A}$: the **atomic base**, one sum over neighbours per basis function
- a product of $\nu$ atomic-base functions describes correlations of $\nu$ neighbours with the centre: body order $\nu + 1$
- $\textcolor{#845ef7}{C}$: generalised Clebsch–Gordan coefficients that combine angular momenta into invariants
{{< /eq >}}

The key computational idea is the **density trick**. Writing an explicit sum over all triples or quadruples of neighbours would cost a power of the number of neighbours. ACE instead sums once over neighbours to form the atomic base, then multiplies base functions, so the cost of a high body-order basis function is the cost of a product, not of a sum over clusters. Exactly the same trick appears in the angular-expansion figure of [the chapter on what an MLIP must learn](../mlip-foundations/): the power spectrum $|c_m|^2$ is a two-neighbour (three-body) invariant computed from single sums.

ACE is complete: as the radial and angular resolution and the body order grow, it can represent any smooth symmetric function of the environment. Symmetry functions, SOAP (body order 3), SNAP's bispectrum (body order 4) and MTP's contractions all correspond to particular choices or truncations within it. Linear ACE potentials are fitted like SNAP; nonlinear ACE, implemented in the pacemaker code, passes several linear ACE sums through an embedding function reminiscent of EAM, which improves accuracy for metals. Finally, ACE provided the theory for **MACE**, which builds ACE-like many-body features inside equivariant message passing ([the chapter on message-passing potentials](../message-passing-potentials/)).

## Choosing among them

Systematic comparisons, such as the 2020 study of Zuo, Ong and colleagues that trained GAP, MTP, neural-network, SNAP and quadratic SNAP potentials on the same data for six elements, found that the more flexible models (MTP, GAP, neural networks) reached lower errors, while SNAP was cheapest to evaluate and qSNAP sat between them. The broad trade-offs are these. Linear models (SNAP, MTP, linear ACE) are fast to fit and fast to run, have a convex training problem and well-defined extrapolation measures, and scale to enormous simulations; their accuracy is limited by the size of the basis, which grows quickly with the number of elements. Kernel models (GAP) are among the most accurate for a given amount of data and give calibrated uncertainty, at a higher evaluation cost that grows with the number of representative environments. Both are excellent for single- or few-element materials with carefully constructed training sets. For many-element chemistry and very large data sets, the learned representations of neural networks and message-passing models, discussed in the next chapters, have become the more common choice.

{{< note type="key" >}}
- Kernel and linear MLIPs fit an atomic energy that is linear in its parameters on top of a fixed symmetric descriptor; training is a single linear solve.
- Linear models: $\varepsilon_i = \sum_k c_k B_k(i)$ with ridge regression over energies, forces and stresses (SNAP bispectrum, MTP moment tensors, ACE).
- GAP: $\varepsilon_i = \sum_m \alpha_m k(\mathbf q_i, \mathbf q_m)$ with a SOAP kernel and sparse GP regression over $M$ representative environments; predictive variance guides data collection.
- ACE is a complete, systematic many-body basis built with the density trick; it unifies earlier descriptors and inspired MACE.
- All MLIPs interpolate well and extrapolate poorly; uncertainty or extrapolation grades and repulsive baselines guard against failure.
{{< /note >}}

{{< quiz >}}
- q: "Why is training a SNAP or linear ACE potential a single linear least-squares problem?"
  options: ["Because the descriptors are linear in positions", "Because energies and forces are linear in the coefficients c_k", "Because there are no forces"]
  answer: 1
  why: "The basis functions and their derivatives are fixed; only their weights are fitted."
- q: "What does GAP's predictive variance tell you about a new configuration?"
  options: ["Its exact DFT energy", "How far it lies from the representative environments, i.e. how uncertain the prediction is", "Its temperature"]
  answer: 1
  why: "Large variance flags configurations worth adding to the training set."
- q: "In ACE, a basis function built from the product of three atomic-base functions has body order…"
  options: ["3", "4", "2"]
  answer: 1
  why: "ν = 3 neighbours plus the central atom: body order ν + 1 = 4."
- q: "What is the 'density trick'?"
  options: ["Using DFT densities as input", "Summing over neighbours once to form a base, then forming many-body features as products rather than explicit sums over clusters", "Reducing the cutoff radius"]
  answer: 1
  why: "It makes high body-order features affordable."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. A. P. Bartók, M. C. Payne, R. Kondor and G. Csányi, "Gaussian approximation potentials: the accuracy of quantum mechanics, without the electrons", *Physical Review Letters* **104**, 136403 (2010).
2. A. P. Bartók, R. Kondor and G. Csányi, "On representing chemical environments", *Physical Review B* **87**, 184115 (2013).
3. V. L. Deringer, A. P. Bartók, N. Bernstein, D. M. Wilkins, M. Ceriotti and G. Csányi, "Gaussian process regression for materials and molecules", *Chemical Reviews* **121**, 10073–10141 (2021).
4. E. Snelson and Z. Ghahramani, "Sparse Gaussian processes using pseudo-inputs", *Advances in Neural Information Processing Systems* **18** (2006).
5. A. P. Bartók, J. Kermode, N. Bernstein and G. Csányi, "Machine learning a general-purpose interatomic potential for silicon", *Physical Review X* **8**, 041048 (2018).
6. V. L. Deringer and G. Csányi, "Machine learning based interatomic potential for amorphous carbon", *Physical Review B* **95**, 094203 (2017).
7. A. P. Thompson, L. P. Swiler, C. R. Trott, S. M. Foiles and G. J. Tucker, "Spectral neighbor analysis method for automated generation of quantum-accurate interatomic potentials", *Journal of Computational Physics* **285**, 316–330 (2015).
8. A. V. Shapeev, "Moment tensor potentials: a class of systematically improvable interatomic potentials", *Multiscale Modeling & Simulation* **14**, 1153–1173 (2016).
9. E. V. Podryabinkin and A. V. Shapeev, "Active learning of linearly parametrized interatomic potentials", *Computational Materials Science* **140**, 171–180 (2017).
10. R. Drautz, "Atomic cluster expansion for accurate and transferable interatomic potentials", *Physical Review B* **99**, 014104 (2019).
11. Y. Lysogorskiy et al., "Performant implementation of the atomic cluster expansion (PACE) and application to copper and silicon", *npj Computational Materials* **7**, 97 (2021).
12. Y. Zuo et al., "Performance and cost assessment of machine learning interatomic potentials", *Journal of Physical Chemistry A* **124**, 731–745 (2020).

</div>
