---
title: "Machine-learned collective variables"
description: "Learning the coordinates that matter from simulation data: unsupervised methods (PCA, diffusion maps, sketch-map, autoencoders), supervised discriminants (LDA, HLDA, Deep-LDA), dynamical methods (TICA, Deep-TICA, VAMPnets, state-free reversible VAMPnets), information-bottleneck methods (RAVE and the state predictive information bottleneck, SPIB), committor learning, and how learned variables are used to drive enhanced sampling iteratively with PLUMED and mlcolvar."
track: rl-ml
weight: 1
level: Advanced
prereqs: ["es-collective-variables", "es-msm", "neural-networks"]
lab: "Compare the direction of largest variance with the slowest direction in a two-state trajectory"
---

## Learning the coordinates

Every collective-variable method depends on choosing the right variables, and [the chapter on collective variables](../es-collective-variables/) showed how a poor choice hides barriers. For simple processes, physical intuition suffices: a distance, a dihedral, a coordination number. For complex ones, such as the folding of a protein, the nucleation of a crystal or a reaction in a disordered solvent, the relevant combination of hundreds of possible coordinates is not obvious. Since about 2010, a family of methods has learned collective variables from simulation data instead. They differ in what they ask the variable to capture: the largest fluctuations, the difference between known states, the slowest dynamics, or the ability to predict the future.

All of them share a practical pattern. Choose a large set of physically meaningful input **features**, such as distances, contacts, dihedral angles or symmetry functions; collect data, from unbiased simulations, from short simulations in each known state, or from a first round of enhanced sampling; train a model that maps features to a few collective variables; use those variables to bias a new simulation, which samples transitions and produces better data; and repeat until the results converge.

## Variance is not slowness

The oldest and simplest approach is **principal component analysis** (PCA): find the linear combinations of features with the largest variance. Its weakness is fundamental. Large fluctuations are often fast and irrelevant, like the floppy motion of a loop or the vibration of a side chain, while the rare transition that matters may involve small, slow changes. Nonlinear unsupervised methods, such as **diffusion maps** (applied to molecules by Mary Rohrdanz, Cecilia Clementi and colleagues, 2011), **sketch-map** (Michele Ceriotti, Gareth Tribello and Michele Parrinello, 2011) and **autoencoders** (used for enhanced sampling by Wei Chen and Andrew Ferguson, 2018), capture more complex shapes of the data but share the same blind spot when trained on static configurations: they see where the system is, not how slowly it moves.

**Time-lagged independent component analysis** (TICA) uses time information instead. It seeks the linear combination of features $\mathbf v^{\mathsf T}\boldsymbol\chi(\mathbf x)$ whose autocorrelation after a lag time $\tau$ is largest, that is, the coordinate that changes most slowly:

{{< eq title="TICA: the slowest linear coordinate" say="Among all linear combinations of the features, find the one that is most correlated with itself one lag time later." >}}
$$ \mathbf C(\tau)\,\mathbf v = \lambda\,\mathbf C(0)\,\mathbf v, \qquad C_{ij}(\tau) = \big\langle \delta\chi_i(t)\,\delta\chi_j(t + \tau) \big\rangle, \qquad t_{\text{relax}} = -\frac{\tau}{\ln\lambda} $$
- $\mathbf C(0)$: the covariance matrix of the features; $\mathbf C(\tau)$: their time-lagged covariance
- the eigenvectors with the largest eigenvalues are the slowest coordinates; TICA is the linear case of the variational principle for slow processes
{{< /eq >}}

The figure runs a two-dimensional system with two basins separated along a narrow direction, with large but fast fluctuations across it. PCA picks the direction of the large fluctuations; TICA picks the direction along which the system jumps between the basins. The time series on the right make the difference plain: the projection on the PCA direction is noise, while the projection on the TICA direction shows clean switching between two states.

{{< widget name="tica" title="Largest variance or slowest motion?" caption="Left: points of a trajectory in two dimensions, with the PCA (orange) and TICA (teal) directions. Right: the trajectory projected onto each direction over time. The slow switching between basins appears only in the TICA projection. Vary the lag time." >}}

**Deep-TICA** (Luigi Bonati, GiovanniMaria Piccini and Parrinello, 2021) replaces the linear features with a neural network trained to maximise the TICA eigenvalues of its outputs, giving nonlinear slow variables. The same objective, in its general variational form, drives **VAMPnets** (Andreas Mardt, Luca Pasquali, Hao Wu and Frank Noé, 2018) and **state-free reversible VAMPnets** (Wei Chen, Hythem Sidky and Andrew Ferguson, 2019), which learn slow coordinates or soft metastable-state assignments directly from trajectories. Deep-TICA was designed to be trained on data from a first metadynamics or OPES run, with the bias reweighted so that the learned variables describe the unbiased dynamics, and then used as collective variables in a second, better-targeted run.

## Discriminating known states

When the metastable states are known but the path between them is not, a **supervised** approach trains a variable that separates them. **Linear discriminant analysis** finds the linear combination of features that best separates two or more labelled sets of configurations relative to their internal spread; its harmonic variant, HLDA (Dan Mendels, GiovanniMaria Piccini and Parrinello, 2018), was proposed specifically for enhanced sampling. **Deep-LDA** (Bonati, Valerio Rizzi and Parrinello, 2020) applies the same criterion to the output of a neural network. Training needs only short unbiased simulations in each state, which are cheap, and the learned variable can then drive metadynamics or OPES between them. Its limitation is that separating the states is not the same as describing the transition between them: the variable can be excellent at telling A from B and still poor at the transition state.

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

## Using learned variables in practice

Learned collective variables are only useful if they can be differentiated and evaluated inside a simulation. The **mlcolvar** library (Bonati, Enrico Trizio, Andrea Rizzi and Parrinello, 2023) provides PyTorch implementations of autoencoders, Deep-LDA, Deep-TICA, committor models and others, and exports trained models in a form that PLUMED loads (through its `PYTORCH_MODEL` collective variable) to drive metadynamics or OPES in any supported MD engine. SPIB and VAMPnet implementations are available from their authors and in the deeptime library.

Three cautions apply. A learned variable can only describe processes present in its training data: if a transition has never been observed, no amount of learning will find it, which is why iterative schemes are standard. Neural-network variables can behave unpredictably outside the region where they were trained, producing large biasing forces in unexplored regions, so it is wise to check them on new data and to cap biases. And interpretability matters: a variable that works but cannot be understood teaches less than one that can, so it is worth analysing which input features a learned variable depends on most.

{{< note type="key" >}}
- Learned CVs map many physical features to a few variables, trained on simulation data and refined iteratively with enhanced sampling.
- PCA and other static unsupervised methods find large fluctuations, which are often fast; TICA ($\mathbf C(\tau)\mathbf v = \lambda\mathbf C(0)\mathbf v$) finds the slowest linear coordinates.
- Deep-TICA, VAMPnets and SRV learn nonlinear slow coordinates by the variational principle; LDA, HLDA and Deep-LDA learn variables that separate known states.
- RAVE and SPIB compress the present into a latent variable that predicts the future (SPIB: the future state label), learning states and coordinates together.
- Committor-learning methods target the ideal reaction coordinate; mlcolvar and PLUMED make learned CVs usable in biased simulations.
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
