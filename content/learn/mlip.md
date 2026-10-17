---
title: "Training data, validation and uncertainty"
description: "The practice that decides whether an MLIP works: designing and sampling the training set, consistent reference calculations, the loss and its weights, learning curves and data efficiency, ensemble and Gaussian-process uncertainty, validation by physical properties and stable dynamics rather than test errors alone, and the common ways potentials fail."
track: practice
weight: 1
level: Advanced
prereqs: ["mlip-foundations", "neural-network-potentials", "generalisation"]
lab: "Fit an ensemble of networks to a bond curve, with and without forces, and watch it extrapolate"
---

## The training set is the model

An MLIP knows only what its training data show it. Within the region of configuration space covered by the data it interpolates, and its errors are typically a few meV per atom; outside that region it extrapolates, and its predictions can be wrong by electronvolts. The architecture decides how efficiently the model learns from data, but the data decide **what** it can describe. Most of the effort in building a reliable potential, and most of the expertise, goes into the training set.

A good training set covers every kind of configuration the intended simulations will visit, and some margin beyond. For a material, this usually means the relevant crystal phases at their equilibrium volumes and under compression and tension; distorted cells with randomly displaced ("rattled") atoms; snapshots of molecular dynamics at and above the target temperatures, including the liquid; point defects, surfaces and, where relevant, grain boundaries and interfaces; and configurations with atoms closer together than they ever are at equilibrium, which teach the model the repulsive wall. For chemistry in solution or at interfaces, it includes the molecules, the solvent, and configurations along the reaction paths of interest. The GAP-18 silicon potential, for example, was trained on a database assembled by hand from 18 kinds of structures, from crystal phases and vacancies to surfaces, liquid and amorphous silicon.

Molecular dynamics snapshots are the commonest source of configurations, but consecutive frames are almost identical and add little information, as [the topic on generalisation](../generalisation/) explains. Data are therefore **selected for diversity**: frames are compared in descriptor space and chosen by farthest-point sampling or by CUR decomposition, so that each new structure differs as much as possible from those already chosen. Random structure searching, normal-mode sampling for molecules, and high-temperature or biased sampling extend coverage to configurations that equilibrium dynamics rarely visits.

## Consistent reference calculations

Every label in the training set must come from the same electronic-structure method with the same settings: the same functional and dispersion correction, pseudopotentials or projector-augmented-wave data sets, plane-wave cutoff, density of k-points, smearing and spin treatment. Differences that seem minor, such as a k-point mesh that is converged for one cell size but not another, introduce noise of several meV per atom that no model can fit. Total energies from DFT also contain an arbitrary constant that depends on the pseudopotentials; MLIPs handle it by subtracting a reference energy for each element, either the energy of an isolated atom computed with the same settings or a per-element average fitted by linear regression, and learning only the remaining interaction energy.

Data are stored in formats that keep positions, cell, energy, forces and stress together. The extended XYZ format, read and written by ASE, is the common choice: one block per structure, with the energy and stress in the comment line and the forces as extra columns.

## The loss and how it is weighted

As [the topic on what an MLIP must learn](../mlip-foundations/) set out, the loss combines squared errors in energies per atom, forces and stresses, each with a weight. The weights decide the balance between them, and the right balance depends on the application: molecular dynamics depends on forces, phase stability on energy differences, and constant-pressure simulations on stresses. Typical schemes weight forces heavily at first, so that the overall shape of the surface is learned quickly from the abundant force labels, and increase the energy weight towards the end of training, so that energy differences between structures are accurate. Training uses mini-batches of structures, the Adam optimiser with a decaying learning rate, and early stopping on the validation error; many codes also keep an exponential moving average of the weights, which gives smoother and slightly more accurate final models.

The figure below shows why forces matter so much, on the smallest possible example: an ensemble of five small networks fitted to the energy of a diatomic molecule as a function of bond length.

{{< widget name="mlip" title="An ensemble of networks fitted to a bond curve" caption="The shaded band is the training range; outside it the networks extrapolate. Compare training on energies only with energies plus forces at a handful of points, then move the sampled range so that the repulsive wall or the long-range tail is missing, and watch the spread of the ensemble." >}}

With four training points and energies only, the networks agree at the four points and disagree everywhere else. Adding the forces at the same four points, the slopes of the curve, pins the shape down between them. Remove the short distances from the training range and the repulsive wall vanishes from all five models: a real simulation with such a potential would let atoms fall onto each other, the commonest catastrophic failure of a new MLIP.

## Learning curves and data efficiency

The most informative single diagnostic of a model and a data set is the **learning curve**: the test error plotted against the number of training structures on log–log axes. For a well-behaved model it is a straight line, the error falling as a power of the data, $\epsilon \propto N^{-\beta}$, until it levels off at the noise floor of the reference data or the limit of the model's expressiveness. Comparing learning curves rather than single numbers separates two questions: how good a model can eventually become, and how much data it needs to get there. Equivariant message-passing models, as [the topic on message passing](../message-passing-potentials/) describes, have steeper learning curves than invariant ones, which is the precise meaning of their data efficiency. Learning curves also tell you whether more data would help: a curve still falling steeply means the model is data-limited.

## Uncertainty

A potential that knew when it was wrong would be far safer to use, and several methods provide an estimate of uncertainty. The simplest and most widely used is an **ensemble** (or committee): train several models that differ in their random initialisation or in the subset of data they see, and use the spread of their predictions as an uncertainty. Where the models agree they are usually right, and where they disagree they are usually wrong, as the figure shows outside the training range. Gaussian-process potentials such as GAP provide a predictive variance directly ([kernel and linear potentials](../kernel-and-linear-potentials/)), linear models provide extrapolation grades, and cheaper approximations exist for neural networks, such as estimating the variance from only the last layer.

Uncertainty estimates are rarely perfectly **calibrated**: an ensemble spread of 50 meV/Å does not mean that the error is 50 meV/Å, only that it is likely to be larger than where the spread is 10. They are best used as a ranking: to flag configurations in a simulation that need checking, and to choose which new structures to compute in [active learning](../active-learning/). Most modern training pipelines, such as DP-GEN, FLARE and the active-learning modes of MTP and ACE codes, are built around exactly this loop: simulate, detect uncertain configurations, compute them with DFT, add them, retrain.

## Validation beyond the test error

A low test error, a few meV per atom in energy and a few tens of meV/Å in force, is necessary but not sufficient. A random test set is drawn from the same distribution as the training set, so it says little about configurations that a long simulation will eventually reach and that the training set missed. A potential can have excellent average errors and still produce nonsense in dynamics. Fu and colleagues (2023) showed, across many models and systems, that force accuracy is only loosely correlated with simulation stability and with the accuracy of derived properties. Validation must therefore test **physics**, as Morrow, Gardner and Deringer (2023) set out:

**Stability and conservation.** Run long molecular dynamics at the highest temperature of interest, in the NVE ensemble to check energy conservation and in the thermostatted ensemble to check that structures do not collapse, explode or drift into unphysical states. A "hole" in the potential, a region where the predicted energy is spuriously low, is often found only this way.

**Static properties.** Compare equilibrium lattice constants, the energy–volume curve and bulk modulus, elastic constants, phonon dispersions, vacancy and interstitial formation energies, surface energies and stacking-fault energies with DFT. Phonons are a sensitive test of the second derivatives of the surface, which the training never fits directly.

**Dynamic and thermodynamic properties.** Compare radial distribution functions, densities and diffusion coefficients with ab initio molecular dynamics, and, where possible, with experiment for the target quantity: a melting point, a thermal expansion coefficient, a phase transition pressure.

**Processes of interest.** Compute energies along the processes the potential will be used for: migration barriers of vacancies and ions, reaction paths, the energy of a dislocation core. These are often outside the bulk of the training data and are where extrapolation errors hide.

The tutorial in [the topic on building an MLIP](../build-your-own-mlip/) applies the first three kinds of test to a small copper potential.

## Common failure modes

A handful of problems account for most failures. **Missing short-range data** produces holes in the repulsive wall and atoms collapsing onto each other; it is fixed by adding compressed structures, dimers and close contacts, or a physical repulsive baseline. **Extrapolation** to unseen environments, such as a surface when only bulk was trained, or a new temperature range, gives silent errors; it is detected by uncertainty estimates and fixed by active learning. **An inadequate reference** method, such as PBE for dispersion-bound layered materials, gives a potential that is faithful to the wrong answer. **Missing long-range physics** affects ionic materials, polar interfaces and charged defects, and requires the long-range extensions of [neural-network potentials](../neural-network-potentials/). **Electronic degrees of freedom** that the model does not see, such as magnetic order, spin states or the charge state of a defect, make the same atomic configuration correspond to several different energies, which no function of positions alone can fit. And **data leakage**, testing on frames from the same trajectory as the training frames, makes errors look smaller than they are; test sets should come from independent simulations.

{{< note type="key" >}}
- The training set defines the domain of validity: cover phases, strains, rattled and high-temperature structures, defects, surfaces, liquids and short-range contacts, selected for diversity.
- All labels must come from consistent reference calculations; per-element reference energies remove arbitrary offsets.
- Forces dominate the information content; weight energies, forces and stresses for the intended use; learning curves reveal data efficiency.
- Ensembles and GP variances flag uncertain configurations and drive active learning, though they are rarely perfectly calibrated.
- Validate with physics, not just test RMSE: stable dynamics, energy conservation, elastic constants, phonons, defect energies, structure and transport, and barriers of the processes of interest.
{{< /note >}}

{{< quiz >}}
- q: "A potential trained on bulk copper is used to simulate a copper surface. What is the main risk?"
  options: ["None, copper is copper", "Surface environments lie outside the training data, so predictions are extrapolations and may be badly wrong", "The simulation will be slower"]
  answer: 1
  why: "MLIPs interpolate within their training data; include surfaces or use uncertainty to detect the problem."
- q: "Why are consecutive MD frames a poor training set?"
  options: ["They are too expensive", "They are nearly identical, so they add little new information; diverse selection is far more efficient", "They have no forces"]
  answer: 1
  why: "Farthest-point or CUR selection in descriptor space picks informative structures."
- q: "An ensemble of five potentials disagrees strongly on one configuration in a simulation. What does this suggest?"
  options: ["The configuration is in equilibrium", "It lies outside the training data; it is a good candidate for a new DFT calculation", "The thermostat is wrong"]
  answer: 1
  why: "Disagreement signals extrapolation; this is the trigger used in active learning."
- q: "A potential has a force RMSE of 30 meV/Å on a random test set but crashes after 50 ps of MD at high temperature. What does this show?"
  options: ["The RMSE is miscalculated", "Test errors do not guarantee stability; the simulation reached configurations missing from the data", "MD always crashes"]
  answer: 1
  why: "Validate with long simulations as well as test sets."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. D. Morrow, J. L. A. Gardner and V. L. Deringer, "How to validate machine-learned interatomic potentials", *Journal of Chemical Physics* **158**, 121501 (2023).
2. X. Fu et al., "Forces are not enough: benchmark and critical evaluation for machine learning force fields with molecular simulations", *Transactions on Machine Learning Research* (2023).
3. A. P. Bartók, J. Kermode, N. Bernstein and G. Csányi, "Machine learning a general-purpose interatomic potential for silicon", *Physical Review X* **8**, 041048 (2018).
4. J. Vandermause et al., "On-the-fly active learning of interpretable Bayesian force fields for atomistic rare events", *npj Computational Materials* **6**, 20 (2020).
5. Y. Zhang et al., "DP-GEN: a concurrent learning platform for the generation of reliable deep learning based potential energy models", *Computer Physics Communications* **253**, 107206 (2020).
6. A. R. Tan, S. Urata, S. Goldman, J. C. B. Dietschreit and R. Gómez-Bombarelli, "Single-model uncertainty quantification in neural network potentials does not consistently outperform model ensembles", *npj Computational Materials* **9**, 225 (2023).
7. V. L. Deringer, M. A. Caro and G. Csányi, "Machine learning interatomic potentials as emerging tools for materials science", *Advanced Materials* **31**, 1902765 (2019).

</div>
