---
title: "Kernel and linear potentials"
description: "Machine-learned potentials built on regression with fixed descriptors: linear models in a basis of environment functions, Gaussian approximation potentials with sparse Gaussian-process regression and the SOAP kernel, the spectral neighbour analysis potential, moment tensor potentials, and the atomic cluster expansion that unifies them; with their equations, training, uncertainty, cost and a comparison of strengths."
hook: "Several widely used potentials are fitted by solving a single linear system, with no random initialisation, no learning-rate schedule and an uncertainty estimate thrown in. The catch is that each atom's description must be fixed before the data arrive."
objectives:
  - "Fit a linear potential in a basis of environment functions by ridge regression"
  - "Explain how GAP combines a SOAP kernel with sparse Gaussian-process regression"
  - "Compare SNAP, moment tensor potentials and ACE as linear many-body bases"
  - "Explain the density trick that makes high body-order ACE features affordable"
  - "Recognise extrapolation and use predictive variance or extrapolation grades to flag it"
cover: "cover.svg"
milestones:
  - year: 2010
    text: "Bartók, Payne, Kondor and Csányi introduce Gaussian approximation potentials"
  - year: 2015
    text: "Thompson and colleagues at Sandia introduce the spectral neighbour analysis potential"
  - year: 2016
    text: "Shapeev introduces moment tensor potentials, a systematically improvable linear basis"
  - year: 2019
    text: "Drautz introduces the atomic cluster expansion, unifying linear many-body descriptors"
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

with a diagonal weight matrix $\mathbf W$ that balances energies, forces and stresses.

{{< note type="practice" title="Back of the envelope" >}}
Take 1000 training structures of 100 atoms and a basis of $K = 500$ functions. The labels are 1000 energies and 300,000 force components, so $\mathbf X$ has 301,000 rows and 500 columns: $1.5\times10^8$ numbers, 1.2 GB in double precision. The normal-equations matrix $\mathbf X^{\mathsf T}\mathbf W\mathbf X$ is only $500\times500$, and forming it costs about $301{,}000\times500^2 \approx 7.5\times10^{10}$ multiply–adds, a few seconds on one modern core. Fitting a linear potential is therefore dominated by computing the descriptors and their derivatives, not by the regression, which is why hyperparameters such as the cutoff or the regularisation $\lambda$ can be scanned by refitting hundreds of times.
{{< /note >}}

The figure below shows the idea in its simplest form: the energy curve of a single bond fitted as a linear combination of smooth radial basis functions, each multiplied by a cutoff function. The grey curves are the basis functions scaled by their fitted coefficients; their sum is the orange fit.

{{< widget name="basisfit" title="Linear basis and kernel fits of a bond-energy curve" caption="Training energies (dots) are taken from a reference curve (dashed) only inside the teal band. In linear mode the fit is a weighted sum of radial basis functions (grey); in kernel mode it is a Gaussian-process interpolation with its ±2σ band. Vary the number of basis functions, the length scale, the regularisation and the amount of data, and compare the error inside and outside the training range." >}}

With too few basis functions the fit cannot follow the curve; with many functions and weak regularisation it can oscillate between data points; with adequate data and regularisation it is excellent inside the training range. Outside that range, at short bond lengths where no data were given, every setting fails, in different ways. That is the central fact about all machine-learned potentials: they **interpolate** well and **extrapolate** unreliably. Real potentials protect against the most dangerous case, atoms pushed too close together, by adding a physically motivated repulsive term (such as the ZBL screened-Coulomb potential used in radiation-damage simulations) or by making sure the training set contains close contacts.

### Worked example: forces as training data

Because forces are linear in the same coefficients as the energy, each force component adds one row to $\mathbf X$, and it is worth seeing how much they help. The cell below builds five-atom chains with random spacings between 2.1 and 3.6 Å, whose reference energy is a sum of Morse pair terms with a well depth of 1 eV at 2.5 Å. The model is a linear potential with twelve Gaussian radial basis functions, centred between 1.5 and 5.5 Å and multiplied by a cosine cutoff at 6 Å. It is fitted to eight structures, first with their eight energies alone, then with their energies and all 40 force components, and tested on 200 new chains.

{{< py title="a linear potential fitted with and without forces" >}}
import numpy as np
rng = np.random.default_rng(0)
mu, eta, rc = np.linspace(1.5, 5.5, 12), 2.0, 6.0               # 12 Gaussian radial basis functions
def g(r):                                                        # basis values and r-derivatives
    f = 0.5 * (np.cos(np.pi * r / rc) + 1) * (r < rc); df = -0.5 * np.pi / rc * np.sin(np.pi * r / rc) * (r < rc)
    G = np.exp(-eta * (r[:, None] - mu) ** 2)
    return G * f[:, None], (-2 * eta * (r[:, None] - mu) * f[:, None] + df[:, None]) * G
def morse(r): e = np.exp(-1.5 * (r - 2.5)); return (1 - e) ** 2 - 1, 3 * e * (1 - e)  # eV, eV/A
def sample(n_struct, n_at=5):
    XE, YE, XF, YF = [], [], [], []
    for _ in range(n_struct):
        x = np.cumsum(rng.uniform(2.1, 3.6, n_at)); i, j = np.triu_indices(n_at, 1)
        r = x[j] - x[i]; G, dG = g(r); V, dV = morse(r)
        XE.append(G.sum(0)); YE.append(V.sum())
        for a in range(n_at):                                     # F_a = -dE/dx_a, with dr/dx_a = -1 (a=i) or +1 (a=j)
            s = (j == a).astype(float) - (i == a)
            XF.append(-(s[:, None] * dG).sum(0)); YF.append(-(s * dV).sum())
    return np.array(XE), np.array(YE), np.array(XF), np.array(YF)
XE, YE, XF, YF = sample(8); tE, tYE, tF, tYF = sample(200)
for name, X, y in [("energies only", XE, YE), ("energies + forces", np.vstack([XE, XF]), np.r_[YE, YF])]:
    c = np.linalg.solve(X.T @ X + 1e-6 * np.eye(12), X.T @ y)
    print(f"{name:18s} {len(y):3d} labels   test RMSE: E {1000*np.sqrt(np.mean((tE@c-tYE)**2)/25):6.1f} meV/atom"
          f"   F {1000*np.sqrt(np.mean((tF@c-tYF)**2)):6.1f} meV/Å")
{{< /py >}}

```text
energies only        8 labels   test RMSE: E    6.1 meV/atom   F  171.8 meV/Å
energies + forces   48 labels   test RMSE: E    0.8 meV/atom   F   15.2 meV/Å
```

With energies alone the problem is underdetermined, eight equations for twelve coefficients, and only the small ridge penalty picks a solution; the energy error of 6.1 meV/atom looks tolerable, but the forces are wrong by 172 meV/Å, because many combinations of basis functions fit eight totals while having quite different slopes. Adding the 40 force components from the *same* eight calculations cuts the energy error by a factor of eight and the force error by a factor of eleven. No new DFT calculations were needed: the forces come with every calculation, which is why every production fitting code (gap_fit, the MLIP package, FitSNAP, pacemaker, ACEpotentials.jl) uses them.

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

Sparsification is not optional. A full Gaussian process on the 300,000 labels of the training set described above would need a $300{,}000\times300{,}000$ covariance matrix, 720 GB in double precision, and about $3\times10^{16}$ floating-point operations to factorise it. With $M = 5000$ representative environments, $\mathbf K_{MN}$ has $1.5\times10^9$ entries, 12 GB, and the linear system to solve is only $5000\times5000$. The price is that the model can only represent functions spanned by kernels centred on the $M$ chosen environments, so their selection matters: CUR decomposition, used in gap_fit, chooses environments that best reconstruct the full descriptor matrix, so that unusual environments such as surfaces and defects are represented even when they are a small fraction of the data.

{{< note type="warn" title="Myth" >}}
*The GAP predictive variance is the error of the prediction.* It is the error the model *expects* under its own assumptions: that the kernel describes how energies of similar environments are correlated and that the noise levels in $\boldsymbol\Lambda$ are right. It knows nothing about errors of the reference method and reflects distance from the training data, not the actual size of the energy change there. In practice the variance ranks configurations well, which is what active learning needs, but its absolute value has to be calibrated against held-out DFT calculations before it is quoted as an error bar.
{{< /note >}}

### Kernels and linear models are two views of one model

The two families are closer than they look. A ridge regression on features $\boldsymbol\phi(\mathbf q)$ makes exactly the same predictions as a Gaussian process whose kernel is the dot product $k(\mathbf q, \mathbf q') = \boldsymbol\phi(\mathbf q)\cdot\boldsymbol\phi(\mathbf q')$, with the regularisation $\lambda$ playing the role of the noise variance. The linear form works with $K$ coefficients, the kernel form with one weight per training environment; whichever is smaller is cheaper. Conversely, a kernel corresponds to an implicit set of features. The SOAP kernel with $\zeta = 1$ is linear in the power spectrum, a three-body descriptor; with $\zeta = 2$, $(\hat{\mathbf p}\cdot\hat{\mathbf p}')^2 = \sum_{ab} \hat p_a\hat p_b\,\hat p'_a\hat p'_b$ is linear in the *products* of pairs of power-spectrum components, which involve four neighbours and the central atom: a five-body model, obtained without ever computing a five-body feature. This is how GAP reaches body orders beyond its descriptor.

{{< fig src="zeta.svg" alt="Left: a hexagonal environment of six neighbours with one neighbour rotated by 20 degrees. Right: kernel similarity to the perfect hexagon against the rotation angle from 0 to 30 degrees, for zeta 1, 2, 4 and 16; higher zeta falls off faster, down to 0.41 at 30 degrees for zeta 16" caption="A two-dimensional power-spectrum kernel between a perfect hexagon and the same environment with one neighbour rotated by δ. With $ζ = 1$ the similarity stays above 0.94 even at 30°; raising it to the power $ζ = 4$ or 16 stretches the scale so that the regression can distinguish small distortions." >}}

The exponent also controls how sharply the kernel discriminates. In the two-dimensional example of the figure, rotating one of six neighbours by 20° lowers the normalised power-spectrum overlap only to 0.967, because the dot product is dominated by features the two environments share. Raised to $\zeta = 4$ the same pair scores 0.875, and with $\zeta = 16$ 0.585. A kernel that rates every pair of environments as nearly identical makes the regression ill conditioned and lets distant training environments influence the prediction; GAP potentials therefore usually use $\zeta = 2$ to 4 for SOAP.

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

The extrapolation grade has a simple geometric meaning. A linear potential with $K$ basis functions is fixed by any $K$ linearly independent training environments; the D-optimality criterion keeps the *active set* of $K$ environments whose rows of basis-function values $\mathbf A$ span the largest volume, found with the greedy maxvol algorithm. A new environment with basis values $\mathbf b$ is expressed in this set as $\mathbf c = \mathbf b\,\mathbf A^{-1}$, and its grade is $\gamma = \max_j |c_j|$. If $\gamma \le 1$, the environment lies inside the region the active set spans and the model interpolates; if $\gamma > 1$, at least one coefficient must be stretched beyond the training data, and the larger $\gamma$, the further the extrapolation. No DFT is needed to compute it, and the cost is one small matrix–vector product per atom.

{{< fig src="dopt.svg" alt="A two-dimensional descriptor plane with 300 grey training points along a curved band, six orange active-set points at its edges, and shaded regions bounded by contours of extrapolation grade 1, 2 and 10. A black trajectory leaves the band and is marked where its grade first exceeds 2" caption="Extrapolation grade for a toy linear model with six quadratic basis functions of a two-dimensional descriptor. The six orange environments span the largest volume (maxvol); inside the teal contour $γ ≤ 1$. A trajectory that drifts out of the training band crosses $γ = 2$ at the pink cross, where the configuration would be sent for a DFT calculation and added to the training set." >}}

{{< note type="practice" title="From the lab" >}}
An MTP active-learning run alternates between simulation and fitting. Molecular dynamics or structure relaxations run with the current potential while the grade of every configuration is evaluated; the MLIP package takes two user-set thresholds, a lower one (values around 2 are common) above which a configuration is saved as a candidate, and a higher one at which the simulation is stopped because its trajectory can no longer be trusted. The candidates are reduced to the few that most increase the volume of the active set, computed with DFT, added to the training set, and the potential is refitted; the cycle repeats until a full simulation finishes with no configuration above the lower threshold. The same logic, with the GAP predictive variance or the spread of an ensemble of neural networks in place of $\gamma$, drives most active-learning schemes ([active learning](../active-learning/)).
{{< /note >}}

## The atomic cluster expansion

In 2019 Ralf Drautz introduced the **atomic cluster expansion** (ACE), which put all these descriptors into a single framework. ACE starts from a one-particle basis, products of radial functions and spherical harmonics, and projects the neighbour density onto it:

{{< eq title="The atomic cluster expansion" say="Project the neighbours onto a basis once; then build many-body correlations by multiplying the projections, and make them rotation-invariant by contracting angular indices." >}}
$$ \textcolor{#4c6ef5}{A}_{nlm}(i) = \sum_{j\in\mathcal N(i)} R_{nl}(r_{ij})\,Y_{lm}(\hat{\mathbf r}_{ij}), \qquad \textcolor{#12a594}{B}_{\mathbf n\mathbf l}(i) = \sum_{\mathbf m} \textcolor{#845ef7}{C^{\mathbf l}_{\mathbf m}} \prod_{t=1}^{\nu} \textcolor{#4c6ef5}{A}_{n_t l_t m_t}(i), \qquad \varepsilon_i = \sum_{\mathbf n\mathbf l} c_{\mathbf n\mathbf l}\,\textcolor{#12a594}{B}_{\mathbf n\mathbf l}(i) $$
- $\textcolor{#4c6ef5}{A}$: the **atomic base**, one sum over neighbours per basis function
- a product of $\nu$ atomic-base functions describes correlations of $\nu$ neighbours with the centre: body order $\nu + 1$
- $\textcolor{#845ef7}{C}$: generalised Clebsch–Gordan coefficients that combine angular momenta into invariants
{{< /eq >}}

The key computational idea is the **density trick**. Writing an explicit sum over all triples or quadruples of neighbours would cost a power of the number of neighbours. ACE instead sums once over neighbours to form the atomic base, then multiplies base functions, so the cost of a high body-order basis function is the cost of a product, not of a sum over clusters. Exactly the same trick appears in the angular-expansion figure of [the chapter on what an MLIP must learn](../mlip-foundations/): the power spectrum $|c_m|^2$ is a two-neighbour (three-body) invariant computed from single sums.

{{< fig src="densitytrick.svg" alt="Top: diagram of the density trick: neighbours are projected once onto an atomic base A, products of two, three and four base functions give invariants B of body order 3, 4 and 5, and a linear fit gives the atomic energy. Bottom: log-log plot of the number of terms per basis function against number of neighbours, growing as n squared, cubed and to the fourth power for explicit cluster sums and linearly for the density trick" caption="The density trick. Top: neighbours are projected once onto the atomic base $A$; products of base functions give many-body invariants without any sum over clusters. Bottom: an explicit sum over $ν$-tuples of $n$ neighbours has $n^ν$ terms; for copper with a 6 Å cutoff ($n = 77$) that is $3.5×10^7$ terms for a body-order-5 function, against 77 for the density trick." >}}

The numbers make the point. With 77 neighbours, a body-order-5 basis function written as an explicit sum over ordered quadruples of neighbours has $77^4 \approx 3.5\times10^7$ terms, and a potential has hundreds of such functions per atom. Through the density trick, every function costs one pass over the 77 neighbours, shared among all functions that use the same atomic-base entries, plus three multiplications. The expanded product also contains terms in which the same neighbour appears more than once, so-called self-interactions; they are harmless in a linear fit, because they are absorbed into lower body-order terms, but they are why ACE basis functions are not literally sums over distinct clusters.

ACE is complete: as the radial and angular resolution and the body order grow, it can represent any smooth symmetric function of the environment. Symmetry functions, SOAP (body order 3), SNAP's bispectrum (body order 4) and MTP's contractions all correspond to particular choices or truncations within it. Linear ACE potentials are fitted like SNAP; nonlinear ACE, implemented in the pacemaker code, passes several linear ACE sums through an embedding function reminiscent of EAM, which improves accuracy for metals. Finally, ACE provided the theory for **MACE**, which builds ACE-like many-body features inside equivariant message passing ([the chapter on message-passing potentials](../message-passing-potentials/)).

## Choosing among them

Systematic comparisons, such as the 2020 study of Zuo, Ong and colleagues that trained GAP, MTP, neural-network, SNAP and quadratic SNAP potentials on the same data for six elements, found that the more flexible models (MTP, GAP, neural networks) reached lower errors, while SNAP was cheapest to evaluate and qSNAP sat between them. The broad trade-offs are these. Linear models (SNAP, MTP, linear ACE) are fast to fit and fast to run, have a convex training problem and well-defined extrapolation measures, and scale to enormous simulations; their accuracy is limited by the size of the basis, which grows quickly with the number of elements. Kernel models (GAP) are among the most accurate for a given amount of data and give calibrated uncertainty, at a higher evaluation cost that grows with the number of representative environments. Both are excellent for single- or few-element materials with carefully constructed training sets. For many-element chemistry and very large data sets, the learned representations of neural networks and message-passing models, discussed in the next chapters, have become the more common choice.

Concrete applications show where each family is used. The GAP-18 silicon potential has been used by Deringer and colleagues (2021) to compress amorphous silicon in simulations of 100,000 atoms, following its transformation to a high-density amorphous form and to crystalline phases, with DFT accuracy at a size no DFT calculation can reach. SNAP potentials for tungsten were developed for the plasma-facing walls of fusion reactors, where radiation damage and helium bubbles need millions of atoms, and the low cost of linear models on GPUs is what makes the billion-atom carbon simulations mentioned above possible. MTPs with active learning have been used to screen the stability of thousands of candidate alloy structures, each relaxed with the potential and only the uncertain ones checked with DFT. Nonlinear ACE potentials for copper and silicon, fitted with pacemaker, reach errors close to those of GAP at a small fraction of its evaluation cost (Lysogorskiy and colleagues, 2021).

{{< note type="key" >}}
- Kernel and linear MLIPs fit an atomic energy that is linear in its parameters on top of a fixed symmetric descriptor; training is a single linear solve.
- Linear models: $\varepsilon_i = \sum_k c_k B_k(i)$ with ridge regression over energies, forces and stresses (SNAP bispectrum, MTP moment tensors, ACE).
- GAP: $\varepsilon_i = \sum_m \alpha_m k(\mathbf q_i, \mathbf q_m)$ with a SOAP kernel and sparse GP regression over $M$ representative environments; predictive variance guides data collection.
- ACE is a complete, systematic many-body basis built with the density trick; it unifies earlier descriptors and inspired MACE.
- All MLIPs interpolate well and extrapolate poorly; uncertainty or extrapolation grades and repulsive baselines guard against failure.
- Forces add $3N$ rows per structure to the same linear system; a ridge model is a Gaussian process with a dot-product kernel, and a SOAP kernel with $\zeta = 2$ is a five-body linear model.
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
- q: "An MTP simulation reports an extrapolation grade γ = 0.8 for a configuration. What does it mean?"
  options: ["The configuration lies inside the region spanned by the active set: the model interpolates", "The prediction has an error of 0.8 eV", "The configuration must be computed with DFT"]
  answer: 0
  why: "γ ≤ 1 means the configuration's basis values can be written as a combination of the active set with coefficients no larger than 1."
- q: "A linear potential with 12 coefficients is fitted to eight five-atom structures. Why do the forces help so much?"
  options: ["They are more accurate than energies", "They add 40 independent equations from the same calculations, making the problem overdetermined", "They change the basis functions"]
  answer: 1
  why: "Eight energies cannot fix twelve coefficients; the 40 force components can, at no extra DFT cost."
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
