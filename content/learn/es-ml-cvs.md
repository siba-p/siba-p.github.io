---
title: "Machine-learned collective variables"
description: "Learning the coordinates that matter from simulation data: unsupervised methods (PCA, diffusion maps, sketch-map, autoencoders), supervised discriminants (LDA, HLDA, Deep-LDA), dynamical methods (TICA, Deep-TICA, VAMPnets, state-free reversible VAMPnets), information-bottleneck methods (RAVE and the state predictive information bottleneck, SPIB), committor learning, and how learned variables are used to drive enhanced sampling iteratively with PLUMED and mlcolvar."
hook: "The largest motion in a trajectory is often the least interesting: a floppy loop, a rattling side chain. Learned collective variables look instead for what is slow, what separates states, or what predicts the future."
objectives:
  - "Explain why variance-based methods such as PCA can miss the slow transition"
  - "Compute TICA directions from instantaneous and time-lagged covariance matrices"
  - "Compare supervised (Deep-LDA), dynamical (Deep-TICA, VAMPnets) and information-bottleneck (SPIB) variables"
  - "Recognise why committor-learning schemes alternate between training and biased sampling"
  - "Run biased simulations on learned variables with mlcolvar and PLUMED, checking for extrapolation"
cover: "cover.svg"
milestones:
  - year: 2005
    text: "Ma and Dinner fit neural networks to committor data to find reaction coordinates"
  - year: 2013
    text: "Pérez-Hernández, Noé and colleagues bring TICA to molecular simulation"
  - year: 2020
    text: "Bonati, Rizzi and Parrinello train Deep-LDA collective variables from short state runs"
  - year: 2021
    text: "Wang and Tiwary introduce the state predictive information bottleneck"
track: rl-ml
weight: 1
level: Advanced
prereqs: ["es-collective-variables", "es-msm", "neural-networks"]
lab: "Compare the direction of largest variance with the slowest direction in a two-state trajectory"
---

## Learning the coordinates

Every collective-variable method depends on choosing the right variables, and [the chapter on collective variables](../es-collective-variables/) showed how a poor choice hides barriers. For simple processes, physical intuition suffices: a distance, a dihedral, a coordination number. For complex ones, such as the folding of a protein, the nucleation of a crystal or a reaction in a disordered solvent, the relevant combination of hundreds of possible coordinates is not obvious. Since about 2010, a family of methods has learned collective variables from simulation data instead. They differ in what they ask the variable to capture: the largest fluctuations, the difference between known states, the slowest dynamics, or the ability to predict the future.

All of them share a practical pattern. Choose a large set of physically meaningful input **features**, such as distances, contacts, dihedral angles or symmetry functions; collect data, from unbiased simulations, from short simulations in each known state, or from a first round of enhanced sampling; train a model that maps features to a few collective variables; use those variables to bias a new simulation, which samples transitions and produces better data; and repeat until the results converge.

{{< fig src="loop.svg" alt="Cycle diagram of four boxes: features, train a model, biased simulation, new data, connected by arrows, with the instruction to repeat until the free energy stops changing." caption="The common workflow. Each round enlarges the region the data cover; the learned variable is trusted only inside that region, which is why the loop is repeated until the free-energy surface and the set of observed states stop changing." >}}

### Choosing input features

The model can only combine what it is given, so the features decide what can be learned. They should be invariant to global translation and rotation, which rules out raw Cartesian coordinates unless the structure is first aligned to a reference; they should be smooth, because their derivatives become the biasing forces; and they should be cheap, because they are evaluated at every MD step. Standard choices are interatomic distances between selected atoms, the sine and cosine of backbone dihedral angles, which avoid the discontinuity at ±180°, and coordination numbers built with a switching function. PLUMED's default rational switching function, $s(r) = [1 - (r/r_0)^6]/[1 - (r/r_0)^{12}]$, goes smoothly from 1 to 0 around $r_0$, typically 0.4 to 0.8 nm for contacts between residues. For crystallisation and other condensed-phase transitions, where atoms are indistinguishable, per-atom environment descriptors are used instead: Steinhardt bond-order parameters such as $Q_6$, which distinguish ordered from liquid-like neighbourhoods, symmetry functions of the Behler–Parrinello type, or SOAP vectors, averaged or histogrammed over the system.

{{< note type="practice" title="Back of the envelope" >}}
A 50-residue protein has $50\times49/2 = 1225$ pairwise Cα distances. A covariance matrix over them has about $7.5\times10^5$ independent entries, and a time-lagged one as many again. A 1 µs trajectory saved every 100 ps provides $10^4$ frames, of which perhaps a few hundred are statistically independent at the timescale of a slow conformational change. The covariance estimates are then dominated by noise, and TICA or LDA on all 1225 features will find spurious slow or discriminating directions. Practical remedies: keep only contacts that change between states (often a few dozen), regularise the covariance matrix by adding a small multiple of the identity, or reduce dimension first with a short PCA that keeps 95 % of the variance. Neural-network variables face the same arithmetic in another form: a network with 1225 inputs and two hidden layers of 30 neurons has about $3.8\times10^4$ weights, so early stopping on a validation set is not optional.
{{< /note >}}

## Variance is not slowness

The oldest and simplest approach is **principal component analysis** (PCA): find the linear combinations of features with the largest variance. Its weakness is fundamental. Large fluctuations are often fast and irrelevant, like the floppy motion of a loop or the vibration of a side chain, while the rare transition that matters may involve small, slow changes. Nonlinear unsupervised methods, such as **diffusion maps** (applied to molecules by Mary Rohrdanz, Cecilia Clementi and colleagues, 2011), **sketch-map** (Michele Ceriotti, Gareth Tribello and Michele Parrinello, 2011) and **autoencoders** (used for enhanced sampling by Wei Chen and Andrew Ferguson, 2018), capture more complex shapes of the data but share the same blind spot when trained on static configurations: they see where the system is, not how slowly it moves.

**Time-lagged independent component analysis** (TICA) uses time information instead. It seeks the linear combination of features $\mathbf v^{\mathsf T}\boldsymbol\chi(\mathbf x)$ whose autocorrelation after a lag time $\tau$ is largest, that is, the coordinate that changes most slowly:

{{< eq title="TICA: the slowest linear coordinate" say="Among all linear combinations of the features, find the one that is most correlated with itself one lag time later." >}}
$$ \mathbf C(\tau)\,\mathbf v = \lambda\,\mathbf C(0)\,\mathbf v, \qquad C_{ij}(\tau) = \big\langle \delta\chi_i(t)\,\delta\chi_j(t + \tau) \big\rangle, \qquad t_{\text{relax}} = -\frac{\tau}{\ln\lambda} $$
- $\mathbf C(0)$: the covariance matrix of the features; $\mathbf C(\tau)$: their time-lagged covariance
- the eigenvectors with the largest eigenvalues are the slowest coordinates; TICA is the linear case of the variational principle for slow processes
{{< /eq >}}

The figure runs a two-dimensional system with two basins separated along a narrow direction, with large but fast fluctuations across it. PCA picks the direction of the large fluctuations; TICA picks the direction along which the system jumps between the basins. The time series on the right make the difference plain: the projection on the PCA direction is noise, while the projection on the TICA direction shows clean switching between two states.

### Why TICA is an eigenvalue problem

The autocorrelation of the projection $s(t) = \mathbf v^{\mathsf T}\delta\boldsymbol\chi(t)$ at lag $\tau$ is a ratio of two quadratic forms,

$$
\rho(\tau) = \frac{\langle s(t)\,s(t+\tau)\rangle}{\langle s(t)^2\rangle} = \frac{\mathbf v^{\mathsf T}\mathbf C(\tau)\,\mathbf v}{\mathbf v^{\mathsf T}\mathbf C(0)\,\mathbf v},
$$

a generalised Rayleigh quotient. Setting its gradient with respect to $\mathbf v$ to zero gives $\mathbf C(\tau)\mathbf v = \rho\,\mathbf C(0)\mathbf v$, the TICA equation: the stationary points of the autocorrelation are the generalised eigenvectors, and the maximum is the largest eigenvalue. PCA solves the same problem with $\mathbf C(\tau)$ replaced by $\mathbf C(0)$ and $\mathbf C(0)$ by the identity. Two numerical details matter. $\mathbf C(\tau)$ estimated from a finite trajectory is not exactly symmetric, and the usual estimator symmetrises it, which assumes reversible dynamics; and $\mathbf C(0)$ is often nearly singular when features are redundant, so it is whitened with a cutoff on its smallest eigenvalues before the problem is solved.

In the two-dimensional model used in the figures below, a double well along $x$ with a wide, soft valley along $y - 0.8x$, the variances of the data along the principal axes are 2.33 and 0.53. PCA picks the axis of variance 2.33, which points 64° away from $x$ and is dominated by fast motion along the valley floor. TICA at a lag of 2 reduced time units gives eigenvalues whose implied timescales are 4.8 and 1.2: the slow direction lies 13° from $x$, and the next process is four times faster.

TICA can be trained on biased data only after the time axis is corrected. James McCarty and Parrinello showed in 2017 that for a quasi-static metadynamics bias $V(s)$, each MD step of length $\Delta t$ corresponds to an unbiased time $\Delta t\,e^{\beta V(s)}$, so correlation functions can be computed in this rescaled time. Deep-TICA uses the same correction. The rescaled times are very uneven, because $e^{\beta V}$ varies by orders of magnitude, so only a few long rescaled intervals dominate the estimate; the method works best when the first biased run already samples the transition many times.

{{< widget name="tica" title="Largest variance or slowest motion?" caption="Left: points of a trajectory in two dimensions, with the PCA (orange) and TICA (teal) directions. Right: the trajectory projected onto each direction over time. The slow switching between basins appears only in the TICA projection. Vary the lag time." >}}

**Deep-TICA** (Luigi Bonati, GiovanniMaria Piccini and Parrinello, 2021) replaces the linear features with a neural network trained to maximise the TICA eigenvalues of its outputs, giving nonlinear slow variables. The same objective, in its general variational form, drives **VAMPnets** (Andreas Mardt, Luca Pasquali, Hao Wu and Frank Noé, 2018) and **state-free reversible VAMPnets** (Wei Chen, Hythem Sidky and Andrew Ferguson, 2019), which learn slow coordinates or soft metastable-state assignments directly from trajectories. Deep-TICA was designed to be trained on data from a first metadynamics or OPES run, with the bias reweighted so that the learned variables describe the unbiased dynamics, and then used as collective variables in a second, better-targeted run.

## Discriminating known states

When the metastable states are known but the path between them is not, a **supervised** approach trains a variable that separates them. **Linear discriminant analysis** finds the linear combination of features that best separates two or more labelled sets of configurations relative to their internal spread; its harmonic variant, HLDA (Dan Mendels, GiovanniMaria Piccini and Parrinello, 2018), was proposed specifically for enhanced sampling. **Deep-LDA** (Bonati, Valerio Rizzi and Parrinello, 2020) applies the same criterion to the output of a neural network. Training needs only short unbiased simulations in each state, which are cheap, and the learned variable can then drive metadynamics or OPES between them. Its limitation is that separating the states is not the same as describing the transition between them: the variable can be excellent at telling A from B and still poor at the transition state.

### The Fisher criterion

The criterion is due to Ronald Fisher (1936). For two states with means $\boldsymbol\mu_A$, $\boldsymbol\mu_B$ and covariance matrices $\boldsymbol\Sigma_A$, $\boldsymbol\Sigma_B$ in feature space, the projection $\mathbf w^{\mathsf T}\boldsymbol\chi$ should put the state means far apart compared with the spread inside each state:

{{< eq title="Fisher's linear discriminant" say="Choose the direction in which the gap between the state averages is largest compared with the fluctuations inside the states; it is the gap rotated by the inverse of the within-state covariance." >}}
$$ J(\mathbf w) = \frac{\big(\mathbf w^{\mathsf T}(\boldsymbol\mu_B - \boldsymbol\mu_A)\big)^2}{\mathbf w^{\mathsf T}\,\textcolor{#12a594}{\mathbf S_w}\,\mathbf w}, \qquad \mathbf w^\ast \propto \textcolor{#12a594}{\mathbf S_w}^{-1}(\boldsymbol\mu_B - \boldsymbol\mu_A) $$
- $\textcolor{#12a594}{\mathbf S_w} = \boldsymbol\Sigma_A + \boldsymbol\Sigma_B$: the within-state scatter; HLDA replaces this sum by the harmonic combination $(\boldsymbol\Sigma_A^{-1} + \boldsymbol\Sigma_B^{-1})^{-1}$, which weights the narrower state more
- $J$: the Fisher ratio; the separation of the projected means in units of the within-state standard deviation is $\sqrt{2J}$ for equal spreads
{{< /eq >}}

The inverse covariance is what makes the result differ from the obvious answer, the line joining the two means. In the model system, short unbiased runs in each well, stopped before they cross, give state means near $(-0.93, -0.90)$ and $(0.93, 0.79)$. The line joining them points 42° from $x$ and has a Fisher ratio of 6. The states, however, fluctuate widely along the soft valley, so moving along $y$ mostly adds noise; LDA turns away from that direction to within 1.4° of $x$, and its Fisher ratio rises to 32. Projected on the LDA direction, the two states are about 8 standard deviations apart instead of 3.6.

{{< fig src="lda.svg" alt="Left: scatter plots of samples from states A and B, elongated vertically, with arrows for the mean-difference direction at 42 degrees and the nearly horizontal LDA direction. Right: projected histograms; the two states overlap along the mean difference and are well separated along LDA." caption="Fisher's discriminant on short runs in each state. The mean-difference direction (gold, Fisher ratio 6) mixes in the wide fluctuations along $y$; the LDA direction (violet, Fisher ratio 32) discounts them and separates the states by about eight within-state standard deviations." >}}

Deep-LDA puts a neural network in front of this criterion: the network maps features to a hidden layer, and LDA is applied to the hidden layer's outputs, with the Fisher ratio, or the eigenvalues of the multi-class generalisation, as the training objective. With more than two states, the generalisation uses the between-class scatter matrix and gives up to $n_{\text{states}} - 1$ discriminant variables. A practical concern is that the Fisher ratio can be made arbitrarily large by a network that compresses each state to a point, which yields a nearly discontinuous variable with huge gradients near the boundary; Bonati and colleagues regularise the within-state scatter matrix to prevent this, and it is worth plotting the learned variable along a path between states before using it to bias.

## Predicting the future: RAVE and SPIB

Pratyush Tiwary and colleagues approached the problem through information theory. A good reaction coordinate should be a compressed description of the present that retains the information needed to predict the future, an **information bottleneck**. The reweighted autoencoded variational Bayes method (RAVE, João Marcelo Lamim Ribeiro, Pablo Bravo, Yihang Wang and Tiwary, 2018) trained a variational autoencoder to predict configurations a time $\Delta t$ ahead from a low-dimensional latent variable. Its successor, the **state predictive information bottleneck** (SPIB, Dedi Wang and Tiwary, 2021), predicts not the future configuration but the future **state label**, which is both easier and more relevant:

{{< eq title="The state predictive information bottleneck" say="Compress the present configuration into a few latent numbers that are just enough to predict which metastable state the system will be in a short time later." >}}
$$ \mathcal L = -\Big\langle \ln q_\theta\big(y_{t+\Delta t} \mid \mathbf z_t\big) \Big\rangle + \textcolor{#845ef7}{\beta}\; \Big\langle D_{\text{KL}}\big(p_\phi(\mathbf z_t \mid \mathbf x_t)\,\big\|\, r(\mathbf z)\big) \Big\rangle $$
- encoder $p_\phi(\mathbf z \mid \mathbf x)$: maps the configuration to a low-dimensional latent $\mathbf z$, the learned collective variable
- decoder $q_\theta(y \mid \mathbf z)$: predicts the state label $y$ at time $t + \Delta t$
- $\textcolor{#845ef7}{\beta}$: trades predictive power against compression; the KL term keeps the latent simple
{{< /eq >}}

The state labels are not fixed in advance. SPIB starts from an initial coarse labelling, for example by clustering, and iteratively relabels each configuration by the state its latent variable predicts, so that the number and definition of metastable states are learned along with the coordinate. The time delay $\Delta t$ sets the timescale of interest: short delays resolve fast processes, long delays keep only the slowest. The learned latent variable is a natural candidate for biasing with metadynamics, and SPIB has been used for protein conformational changes, ligand unbinding and crystal nucleation, often in iterative loops of biased sampling and retraining.

## Learning the committor

The ideal reaction coordinate is the committor $q(\mathbf x)$, the probability of reaching B before A. Several methods learn it directly. Ao Ma and Aaron Dinner (2005) fitted committors estimated from shooting trajectories with neural networks; more recent approaches train networks to satisfy the variational principle that the committor minimises a weighted average of $|\nabla q|^2$ subject to boundary conditions, using data from biased simulations, which gives the committor and a characterisation of the transition state ensemble without running large numbers of shooting trajectories. Committor-based variables are attractive because they measure progress through the transition itself, but learning them requires data from the transition region, which is exactly what is rare; most practical schemes therefore alternate between learning and biased sampling.

The variational principle is the following. For overdamped dynamics with an isotropic diffusion coefficient, the committor minimises

$$
\mathcal K[q] = \int |\nabla q(\mathbf x)|^2\, e^{-\beta U(\mathbf x)}\,\mathrm d\mathbf x \quad\text{subject to}\quad q = 0 \text{ in A},\; q = 1 \text{ in B},
$$

and the minimum value is proportional to the rate. The functional penalises steep changes of $q$ where the Boltzmann weight is large, so the minimiser stays flat inside the basins and changes rapidly in the barrier region, where $e^{-\beta U}$ is small. A neural network $q_\theta$ with a sigmoid output can be trained by minimising a sampled estimate of $\mathcal K$ plus penalties for the boundary conditions; the samples must cover the barrier region, which is why such schemes use data from biased simulations reweighted by the bias, and why they often use the learned $q$, or its logit $\ln[q/(1-q)]$, which is better behaved in the basins, as the variable to bias in the next round.

The figure compares the linear variables of this chapter with the exact committor of the model system, computed by solving the backward equation on a grid. Each line is the dividing surface that a variable places through the saddle point. The committor's $q = 1/2$ surface is nearly vertical, tilted by about 3° from the $y$ axis. LDA comes within 2° of it and TICA within 10°; the mean-difference direction is off by about 40° and PCA by about 60°, placing the putative transition state across the wells.

{{< fig src="committor-map.svg" alt="Map of the committor of a two-dimensional double well, teal for state A and blue for state B, with the black q = 1/2 line nearly vertical and dashed lines for the dividing surfaces of PCA, mean difference, LDA and TICA." caption="Four linear variables against the exact committor (colour; black line at $q = 1/2$). LDA and TICA place their dividing surfaces close to the true transition state; PCA and the mean-difference direction cut across the basins. In this simple system the best linear variables are nearly ideal; in a protein, no linear combination of features may come close, which is the case for nonlinear learned variables." >}}

{{< note type="try" title="Pause and predict" >}}
TICA was trained on dynamics, LDA only on static samples from the two states, yet LDA lands closer to the committor here. Before reading on, think about why. The answer: in this model the slow coordinate is tilted by the coupling to the soft valley, so the slowest linear combination includes some valley motion that relaxes along with the barrier crossing, while the committor near the saddle depends almost only on $x$. Neither criterion is the committor; each is a proxy that works when its assumption matches the system.
{{< /note >}}

## Using learned variables in practice

Learned collective variables are only useful if they can be differentiated and evaluated inside a simulation. The **mlcolvar** library (Bonati, Enrico Trizio, Andrea Rizzi and Parrinello, 2023) provides PyTorch implementations of autoencoders, Deep-LDA, Deep-TICA, committor models and others, and exports trained models in a form that PLUMED loads (through its `PYTORCH_MODEL` collective variable) to drive metadynamics or OPES in any supported MD engine. SPIB and VAMPnet implementations are available from their authors and in the deeptime library.

A minimal PLUMED input that biases a learned variable with OPES reads the model compiled with TorchScript and passes its output to the bias:

```text
# plumed.dat: OPES on a Deep-LDA variable of 12 contact distances
d1:   DISTANCE ATOMS=12,240
d2:   DISTANCE ATOMS=35,180
d3:   DISTANCE ATOMS=58,211
# ... d4 to d12 defined in the same way
cv:   PYTORCH_MODEL FILE=deeplda.ptc ARG=d1,d2,d3,d4,d5,d6,d7,d8,d9,d10,d11,d12
opes: OPES_METAD ARG=cv.node-0 PACE=500 BARRIER=40
PRINT ARG=cv.node-0,opes.bias STRIDE=500 FILE=COLVAR
```

`BARRIER` is the expected free-energy barrier in kJ/mol; OPES uses it to set default values of its bias factor and regularisation parameters. The learned variable's output is called `node-0` (and `node-1`, ... for multi-dimensional models). Because the network is evaluated with automatic differentiation at every step, a large model can slow a small simulation noticeably; networks with a few thousand weights cost little compared with the force field.

{{< note type="practice" title="From the lab" >}}
A Deep-LDA study of a ligand leaving a binding pocket might proceed like this. Run 50 ns of unbiased MD in the bound state and 50 ns with the ligand in solvent, saving every 10 ps. Use 20 to 40 ligand–residue distances as features, standardised to zero mean and unit variance on the training data. Train a network with two hidden layers of 20 to 30 neurons for a few hundred epochs, holding out 20 % of the frames for validation. Check that the learned variable separates the states in both training and held-out data, then run OPES on it with a barrier estimate of 40 to 60 kJ/mol. When the ligand has unbound and rebound several times, collect those frames, retrain with a Deep-TICA or committor objective that sees the transition, and run again. Convergence is judged by the free-energy difference between the bound and unbound states, which should stop drifting by more than about 1 kJ/mol over the last part of the run.
{{< /note >}}

Three cautions apply. A learned variable can only describe processes present in its training data: if a transition has never been observed, no amount of learning will find it, which is why iterative schemes are standard. Neural-network variables can behave unpredictably outside the region where they were trained, producing large biasing forces in unexplored regions, so it is wise to check them on new data and to cap biases. And interpretability matters: a variable that works but cannot be understood teaches less than one that can, so it is worth analysing which input features a learned variable depends on most.

{{< note type="warn" title="Myth" >}}
*A neural-network variable is always better than a hand-made one.* For many systems a single well-chosen distance, or a linear TICA or LDA combination of a dozen features, gives converged free energies, and it does so with fewer failure modes: no extrapolation, no overfitting, and a physical meaning that can be checked. Neural variables pay off when the transition genuinely involves a nonlinear combination of many features, as in crystal nucleation or the cooperative rearrangement of a binding site. A good test is to compare the linear and nonlinear variables on the same data with a cross-validated score, such as the VAMP-2 score for dynamical variables or the Fisher ratio on held-out frames for discriminants, before investing in the more complex one.
{{< /note >}}

### How to tell whether a learned variable is good

Several checks are used together. **Transitions**: in a biased run on a good variable the system moves back and forth between states many times; long residence at one value of $s$ while the bias grows is a sign of a hidden slow variable. **Hysteresis**: free-energy profiles from runs started in A and in B should agree within error once both have converged. **Committor test**: configurations at the barrier top of the variable should have committors peaked at 1/2, the same test described in [the chapter on path sampling](../es-path-sampling/). **Extrapolation**: the distribution of input features in new data should lie within the training distribution; a simple guard is to monitor the network's output and the norm of its gradient, and to stop or cap the bias when either leaves the range seen in training. **Interpretation**: the average magnitude of $\partial s/\partial\chi_i$ over the data ranks features by their influence; if the top features make no physical sense, the variable has probably learned an artefact of the training data, such as the slow drift of a solvent box or the orientation of an unaligned structure.

{{< note type="key" >}}
- Learned CVs map many physical features to a few variables, trained on simulation data and refined iteratively with enhanced sampling.
- PCA and other static unsupervised methods find large fluctuations, which are often fast; TICA ($\mathbf C(\tau)\mathbf v = \lambda\mathbf C(0)\mathbf v$) finds the slowest linear coordinates.
- Deep-TICA, VAMPnets and SRV learn nonlinear slow coordinates by the variational principle; LDA, HLDA and Deep-LDA learn variables that separate known states.
- RAVE and SPIB compress the present into a latent variable that predicts the future (SPIB: the future state label), learning states and coordinates together.
- Committor-learning methods target the ideal reaction coordinate; mlcolvar and PLUMED make learned CVs usable in biased simulations.
- Fisher's discriminant rotates the gap between state means by the inverse within-state covariance; check any learned variable with transitions, hysteresis, committors and extrapolation guards.
{{< /note >}}

{{< quiz >}}
- q: "Why can PCA give a poor collective variable for a rare transition?"
  options: ["It is nonlinear", "It finds the directions of largest variance, which are often fast fluctuations rather than the slow transition", "It needs labelled data"]
  answer: 1
  why: "Variance is not slowness; TICA uses time-lagged correlations instead."
- q: "What does SPIB's decoder predict?"
  options: ["The current configuration", "The metastable-state label a time Δt in the future", "The free energy"]
  answer: 1
  why: "The latent variable is trained to retain only the information needed to predict the future state."
- q: "Deep-LDA is trained on short simulations in states A and B only. What is its main limitation?"
  options: ["It cannot separate A and B", "Separating the states does not guarantee a good description of the transition region between them", "It needs very long simulations"]
  answer: 1
  why: "Discrimination and progress along the reaction are different requirements."
- q: "Two states differ mainly in x, but both fluctuate widely along y. Compared with the line joining the state means, the LDA direction…"
  options: ["points more along y", "points more along x, because it discounts directions with large within-state fluctuations", "is identical"]
  answer: 1
  why: "w ∝ S_w⁻¹(μ_B − μ_A): the inverse covariance shrinks components along noisy directions."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. M. A. Rohrdanz, W. Zheng, M. Maggioni and C. Clementi, "Determination of reaction coordinates via locally scaled diffusion map", *Journal of Chemical Physics* **134**, 124116 (2011).
2. M. Ceriotti, G. A. Tribello and M. Parrinello, "Simplifying the representation of complex free-energy landscapes using sketch-map", *Proceedings of the National Academy of Sciences* **108**, 13023–13028 (2011).
3. W. Chen and A. L. Ferguson, "Molecular enhanced sampling with autoencoders: on-the-fly collective variable discovery and accelerated free energy landscape exploration", *Journal of Computational Chemistry* **39**, 2079–2102 (2018).
4. G. Pérez-Hernández, F. Paul, T. Giorgino, G. De Fabritiis and F. Noé, "Identification of slow molecular order parameters for Markov model construction", *Journal of Chemical Physics* **139**, 015102 (2013).
5. D. Mendels, G. Piccini and M. Parrinello, "Collective variables from local fluctuations", *Journal of Physical Chemistry Letters* **9**, 2776–2781 (2018).
6. L. Bonati, V. Rizzi and M. Parrinello, "Data-driven collective variables for enhanced sampling", *Journal of Physical Chemistry Letters* **11**, 2998–3004 (2020).
7. L. Bonati, G. Piccini and M. Parrinello, "Deep learning the slow modes for rare events sampling", *Proceedings of the National Academy of Sciences* **118**, e2113533118 (2021).
8. A. Mardt, L. Pasquali, H. Wu and F. Noé, "VAMPnets for deep learning of molecular kinetics", *Nature Communications* **9**, 5 (2018).
9. W. Chen, H. Sidky and A. L. Ferguson, "Nonlinear discovery of slow molecular modes using state-free reversible VAMPnets", *Journal of Chemical Physics* **150**, 214114 (2019).
10. J. M. L. Ribeiro, P. Bravo, Y. Wang and P. Tiwary, "Reweighted autoencoded variational Bayes for enhanced sampling (RAVE)", *Journal of Chemical Physics* **149**, 072301 (2018).
11. D. Wang and P. Tiwary, "State predictive information bottleneck", *Journal of Chemical Physics* **154**, 134111 (2021).
12. A. Ma and A. R. Dinner, "Automatic method for identifying reaction coordinates in complex systems", *Journal of Physical Chemistry B* **109**, 6769–6779 (2005).
13. L. Bonati, E. Trizio, A. Rizzi and M. Parrinello, "A unified framework for machine learning collective variables for enhanced sampling simulations: mlcolvar", *Journal of Chemical Physics* **159**, 014801 (2023).

</div>
