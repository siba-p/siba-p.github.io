---
title: "Training data and validation"
description: "The practice that decides whether an MLIP works: designing and sampling the training set, consistent reference calculations, the loss and its weights, learning curves and data efficiency, ensemble and Gaussian-process uncertainty, validation by physical properties and stable dynamics rather than test errors alone, and the common ways potentials fail."
hook: "A potential can reproduce its test set to a few tens of meV/Å and still crash after 50 picoseconds of molecular dynamics. What it was shown in training, and how it is tested, decide whether it can be trusted."
objectives:
  - "Design a training set covering phases, strains, defects, surfaces, liquids and close contacts"
  - "Choose loss weights for energies, forces and stresses to suit the application"
  - "Interpret learning curves and ensemble uncertainty, including the limits of calibration"
  - "Validate a potential with stable dynamics, elastic constants, phonons and defect energies"
  - "Diagnose common failures such as repulsive-wall holes, extrapolation and data leakage"
cover: "cover.svg"
milestones:
  - year: 2015
    text: "Li, Kermode and De Vita learn quantum forces on the fly during molecular dynamics"
  - year: 2018
    text: "Bartók, Kermode, Bernstein and Csányi publish the GAP-18 silicon database"
  - year: 2020
    text: "Zhang and colleagues release DP-GEN for concurrent learning of Deep Potentials"
  - year: 2023
    text: "Morrow, Gardner and Deringer set out how to validate machine-learned potentials"
track: practice
weight: 1
level: Advanced
prereqs: ["mlip-foundations", "neural-network-potentials", "generalisation"]
lab: "Fit an ensemble of networks to a bond curve, with and without forces, and watch it extrapolate"
---

## The training set is the model

An MLIP knows only what its training data show it. Within the region of configuration space covered by the data it interpolates, and its errors are typically a few meV per atom; outside that region it extrapolates, and its predictions can be wrong by electronvolts. The architecture decides how efficiently the model learns from data, but the data decide **what** it can describe. Most of the effort in building a reliable potential, and most of the expertise, goes into the training set.

A good training set covers every kind of configuration the intended simulations will visit, and some margin beyond. For a material, this usually means the relevant crystal phases at their equilibrium volumes and under compression and tension; distorted cells with randomly displaced ("rattled") atoms; snapshots of molecular dynamics at and above the target temperatures, including the liquid; point defects, surfaces and, where relevant, grain boundaries and interfaces; and configurations with atoms closer together than they ever are at equilibrium, which teach the model the repulsive wall. For chemistry in solution or at interfaces, it includes the molecules, the solvent, and configurations along the reaction paths of interest. The GAP-18 silicon potential, for example, was trained on a database assembled by hand from 18 kinds of structures, from crystal phases and vacancies to surfaces, liquid and amorphous silicon.

Molecular dynamics snapshots are the commonest source of configurations, but consecutive frames are almost identical and add little information, as [the chapter on generalisation](../generalisation/) explains. Data are therefore **selected for diversity**: frames are compared in descriptor space and chosen by farthest-point sampling or by CUR decomposition, so that each new structure differs as much as possible from those already chosen. Random structure searching, normal-mode sampling for molecules, and high-temperature or biased sampling extend coverage to configurations that equilibrium dynamics rarely visits.

The figure shows the effect on a toy problem. Overdamped Langevin dynamics on a two-dimensional double well, with barrier height 2.5 $k_BT$, produces 10 000 frames that visit both basins about equally. Thirty consecutive frames all lie in the starting basin: the largest distance from any frame of the trajectory to its nearest selected frame is 2.37 in the units of the plot, comparable to the size of the whole explored region. Thirty frames chosen at random do better, with a largest gap of 1.15 averaged over 20 draws. Thirty frames chosen by farthest-point sampling bring the largest gap down to 0.45. Note where farthest-point sampling puts its frames: on the rim of the explored region, among rare and high-energy configurations, with only a few in the basins. That is deliberate (the basins are easy to interpolate, the rim is where extrapolation begins), but it also means that a set selected purely for diversity under-represents the typical configurations whose properties will be averaged. Practical pipelines mix the two: farthest-point or CUR selection for coverage, plus a random subset for the bulk of the distribution.

{{< fig src="selection.svg" alt="Two panels of the same scattered trajectory over a double-well contour map. Left: thirty orange points clustered in the left basin. Right: thirty teal points spread over both basins and the rim of the explored region." caption="Choosing 30 training frames from a 10 000-frame trajectory in a double well. Consecutive frames (left) cover one basin; farthest-point sampling in descriptor space (right) covers the whole explored region and its edges. The largest gap is the greatest distance from any frame to its nearest chosen frame." >}}

{{< note type="practice" title="Back of the envelope: what a training set costs" >}}
A training set of 2 000 periodic cells of 100 atoms, computed with a GGA functional in a plane-wave code, needs of order one to a few node-hours per cell for a metal with dense k-point sampling, so a few thousand node-hours in total: a realistic allocation on a university cluster, and the dominant cost of the whole project. Training a neural-network potential on those 2 000 structures takes hours on one GPU, and a nanosecond of molecular dynamics for 10 000 atoms with the trained model takes hours to days. The arithmetic explains why so much effort goes into choosing configurations: every structure that teaches the model nothing new costs as much as one that does.
{{< /note >}}

## Consistent reference calculations

Every label in the training set must come from the same electronic-structure method with the same settings: the same functional and dispersion correction, pseudopotentials or projector-augmented-wave data sets, plane-wave cutoff, density of k-points, smearing and spin treatment. Differences that seem minor, such as a k-point mesh that is converged for one cell size but not another, introduce noise of several meV per atom that no model can fit. Total energies from DFT also contain an arbitrary constant that depends on the pseudopotentials; MLIPs handle it by subtracting a reference energy for each element, either the energy of an isolated atom computed with the same settings or a per-element average fitted by linear regression, and learning only the remaining interaction energy.

The scale of the problem is easy to underestimate. In an all-electron calculation the total energy of one copper atom is about −1 640 hartree, some −44 600 eV, while the quantity a potential must resolve, the energy of a vacancy or the difference between two crystal structures, is of order 0.01 to 1 eV per atom. Differences of $10^{-6}$ in relative terms matter. Pseudopotential codes shift the zero but do not change the conclusion: two data sets computed with different pseudopotentials, or with different codes, differ by a constant per element that can be several eV per atom, and they cannot be mixed without refitting those constants. Inconsistent settings that change with the structure, rather than by a constant, are worse, because no offset removes them. Their effect on a learning curve is shown in the section on learning curves below: the error stops falling once it reaches the level of the label noise.

{{< note type="practice" title="From the lab: a settings checklist" >}}
Before generating training data, converge the plane-wave cutoff and k-point density on the largest and the smallest cells in the planned set, to about 1 meV per atom in energy differences and a few meV/Å in forces, and then use a k-point *density* (spacing in reciprocal space), not a fixed mesh, so that cells of different sizes are treated alike. Keep the smearing method and width fixed. Decide on spin polarisation once, from the chemistry: iron, cobalt, nickel and many oxides need it, and mixing spin-polarised and non-polarised calculations in one set is a common source of unexplained errors. Fix the dispersion correction and, for DFT+U, the U values. Record all of it with the data.
{{< /note >}}

Data are stored in formats that keep positions, cell, energy, forces and stress together. The extended XYZ format, read and written by ASE, is the common choice: one block per structure, with the energy and stress in the comment line and the forces as extra columns.

## The loss and how it is weighted

As [the chapter on what an MLIP must learn](../mlip-foundations/) set out, the loss combines squared errors in energies per atom, forces and stresses, each with a weight. The weights decide the balance between them, and the right balance depends on the application: molecular dynamics depends on forces, phase stability on energy differences, and constant-pressure simulations on stresses. Typical schemes weight forces heavily at first, so that the overall shape of the surface is learned quickly from the abundant force labels, and increase the energy weight towards the end of training, so that energy differences between structures are accurate. Training uses mini-batches of structures, the Adam optimiser with a decaying learning rate, and early stopping on the validation error; many codes also keep an exponential moving average of the weights, which gives smoother and slightly more accurate final models.

{{< note type="practice" title="Back of the envelope: balancing the loss" >}}
Take a 32-atom cell, one energy and 96 force components, and a model with typical errors of 2 meV/atom in energy and 50 meV/Å in force. In eV units the squared errors are $(0.002)^2 = 4 \times 10^{-6}$ and $(0.05)^2 = 2.5 \times 10^{-3}$. With equal weights, the force term is more than 600 times larger than the energy term, and gradient descent spends almost all its effort on forces. An energy weight of order 100 to 1 000 relative to the forces is needed for energies to influence training at all, which is why the second stage of MACE training raises the energy weight to 1 000 while the force weight stays at 100, as [the tutorial on building a potential](../build-your-own-mlip/) describes. Forces alone also cannot fix the energy–volume curve: under uniform strain of a perfect crystal every force is zero by symmetry, and only energies and stresses carry the information.
{{< /note >}}

The figure below shows why forces matter so much, on the smallest possible example: an ensemble of five small networks fitted to the energy of a diatomic molecule as a function of bond length.

{{< widget name="mlip" title="An ensemble of networks fitted to a bond curve" caption="The shaded band is the training range; outside it the networks extrapolate. Compare training on energies only with energies plus forces at a handful of points, then move the sampled range so that the repulsive wall or the long-range tail is missing, and watch the spread of the ensemble." >}}

With four training points and energies only, the networks agree at the four points and disagree everywhere else. Adding the forces at the same four points, the slopes of the curve, pins the shape down between them. Remove the short distances from the training range and the repulsive wall vanishes from all five models: a real simulation with such a potential would let atoms fall onto each other, the commonest catastrophic failure of a new MLIP.

## Learning curves and data efficiency

The most informative single diagnostic of a model and a data set is the **learning curve**: the test error plotted against the number of training structures on log–log axes. For a well-behaved model it is a straight line, the error falling as a power of the data, $\epsilon \propto N^{-\beta}$, until it levels off at the noise floor of the reference data or the limit of the model's expressiveness. Comparing learning curves rather than single numbers separates two questions: how good a model can eventually become, and how much data it needs to get there. Equivariant message-passing models, as [the chapter on message passing](../message-passing-potentials/) describes, have steeper learning curves than invariant ones, which is the precise meaning of their data efficiency. Learning curves also tell you whether more data would help: a curve still falling steeply means the model is data-limited.

The figure shows a learning curve computed from scratch. The target is the energy of three argon atoms interacting by a Lennard-Jones potential ($\varepsilon$ = 10.3 meV, $\sigma$ = 3.4 Å), with all three distances between 3.2 and 6.5 Å; the model is kernel ridge regression on sorted inverse distances, which are invariant to relabelling the atoms. With exact labels, the test error falls from 5.5 meV with 16 training structures to 0.006 meV with 2 048, close to a straight line on log–log axes with slope about −1.2 between 32 and 512 structures. Adding Gaussian noise of 0.3 meV to every label, the stand-in for inconsistent reference calculations, changes the picture completely: the error is 1.1 meV at 256 structures and only 0.40 meV at 2 048, approaching the noise level instead of falling with more data. Beyond that point more data of the same quality buys almost nothing; only cleaner data or a better reference does.

{{< fig src="learning-curve.svg" alt="Log–log plot of test error against number of training structures from 16 to 2048 for a three-atom Lennard-Jones model. Clean labels fall steadily from about 5.5 to 0.006 meV; labels with 0.3 meV noise flatten towards a dashed line at 0.3 meV." caption="Learning curves of kernel ridge regression for the energy of a Lennard-Jones argon trimer, tested against labels of the same quality. Clean labels give a nearly straight power law; noisy labels approach the noise floor of 0.3 meV, beyond which more data cannot help." >}}

{{< note type="try" title="Pause and predict" >}}
A force error of 60 meV/Å from 500 structures falls to 42 meV/Å with 1 000 structures. How many structures would bring it to 20 meV/Å if the trend continues? The ratio 42/60 = 0.7 per doubling gives $\beta = -\log_2 0.7 \approx 0.51$. Reaching a factor of 3 below 60 needs $3^{1/\beta} \approx 8.4$ times more data, about 4 200 structures, provided the curve does not reach a noise floor first. Shallow learning curves make accuracy expensive, which is what makes the steeper curves of equivariant models valuable.
{{< /note >}}

## Uncertainty

A potential that knew when it was wrong would be far safer to use, and several methods provide an estimate of uncertainty. The simplest and most widely used is an **ensemble** (or committee): train several models that differ in their random initialisation or in the subset of data they see, and use the spread of their predictions as an uncertainty. Where the models agree they are usually right, and where they disagree they are usually wrong, as the figure shows outside the training range. Gaussian-process potentials such as GAP provide a predictive variance directly ([kernel and linear potentials](../kernel-and-linear-potentials/)), linear models provide extrapolation grades, and cheaper approximations exist for neural networks, such as estimating the variance from only the last layer.

Uncertainty estimates are rarely perfectly **calibrated**: an ensemble spread of 50 meV/Å does not mean that the error is 50 meV/Å, only that it is likely to be larger than where the spread is 10. They are best used as a ranking: to flag configurations in a simulation that need checking, and to choose which new structures to compute in [active learning](../active-learning/). Most modern training pipelines, such as DP-GEN, FLARE and the active-learning modes of MTP and ACE codes, are built around exactly this loop: simulate, detect uncertain configurations, compute them with DFT, add them, retrain.

In DP-GEN the uncertainty is the **model deviation**, the largest standard deviation of the predicted force on any atom across an ensemble of four models, and two thresholds turn it into decisions. Frames below a lower trust level, a typical choice being 0.05 eV/Å, are considered already learned; frames above an upper level, typically 0.15 to 0.3 eV/Å, are considered too unphysical to be worth computing, often because the simulation has already gone wrong; only frames in between are sent to DFT. The thresholds encode the ranking use of uncertainty described above: nobody claims that the deviation is the error, only that frames in the middle band are the most useful to label next. [Uncertainty and Gaussian processes](../uncertainty-gaussian-processes/) treats the statistics in more depth.

## Validation beyond the test error

A low test error, a few meV per atom in energy and a few tens of meV/Å in force, is necessary but not sufficient. A random test set is drawn from the same distribution as the training set, so it says little about configurations that a long simulation will eventually reach and that the training set missed. A potential can have excellent average errors and still produce nonsense in dynamics. Fu and colleagues (2023) showed, across many models and systems, that force accuracy is only loosely correlated with simulation stability and with the accuracy of derived properties. Validation must therefore test **physics**, as Morrow, Gardner and Deringer (2023) set out:

**Stability and conservation.** Run long molecular dynamics at the highest temperature of interest, in the NVE ensemble to check energy conservation and in the thermostatted ensemble to check that structures do not collapse, explode or drift into unphysical states. A "hole" in the potential, a region where the predicted energy is spuriously low, is often found only this way.

**Static properties.** Compare equilibrium lattice constants, the energy–volume curve and bulk modulus, elastic constants, phonon dispersions, vacancy and interstitial formation energies, surface energies and stacking-fault energies with DFT. Phonons are a sensitive test of the second derivatives of the surface, which the training never fits directly.

**Dynamic and thermodynamic properties.** Compare radial distribution functions, densities and diffusion coefficients with ab initio molecular dynamics, and, where possible, with experiment for the target quantity: a melting point, a thermal expansion coefficient, a phase transition pressure.

**Processes of interest.** Compute energies along the processes the potential will be used for: migration barriers of vacancies and ions, reaction paths, the energy of a dislocation core. These are often outside the bulk of the training data and are where extrapolation errors hide.

{{< fig src="workflow.svg" alt="Flow diagram: Sample, Label, Train ensemble and Simulate boxes arranged in a loop, with uncertain frames returning from Simulate to Sample; a dashed arrow leads from training to a six-rung validation ladder from test RMSE at the bottom to barriers of the target process at the top." caption="The loop that builds a potential and the ladder that validates it. The loop repeats until the ensemble agrees wherever the simulations go; each rung of the ladder tests something closer to the research question and less directly constrained by the training data." >}}

{{< note type="practice" title="From the lab: six checks before production" >}}
1. **Dimer and trimer curves.** Plot the energy of every element pair from 0.5 Å to the cutoff. It must rise steeply at short range and approach zero smoothly at the cutoff; a dip or a plateau at short range is a hole.
2. **Energy–volume curve** of each relevant crystal, from −10 % to +10 % in volume, against DFT.
3. **Phonons** at a few points of the Brillouin zone, or the full dispersion, by finite displacements.
4. **NVE run** of at least tens of picoseconds: the total energy should fluctuate without systematic drift.
5. **Hot NVT run** at 1.2 to 1.5 times the highest target temperature, watching for collapse, explosion or atoms approaching closer than any training structure.
6. **Ensemble spread along the production trajectory**, so that frames needing new DFT are found before they matter.
{{< /note >}}

The tutorial in [the chapter on building an MLIP](../build-your-own-mlip/) applies the first three kinds of test to a small copper potential.

## Common failure modes

A handful of problems account for most failures. **Missing short-range data** produces holes in the repulsive wall and atoms collapsing onto each other; it is fixed by adding compressed structures, dimers and close contacts, or a physical repulsive baseline. **Extrapolation** to unseen environments, such as a surface when only bulk was trained, or a new temperature range, gives silent errors; it is detected by uncertainty estimates and fixed by active learning. **An inadequate reference** method, such as PBE for dispersion-bound layered materials, gives a potential that is faithful to the wrong answer. **Missing long-range physics** affects ionic materials, polar interfaces and charged defects, and requires the long-range extensions of [neural-network potentials](../neural-network-potentials/). **Electronic degrees of freedom** that the model does not see, such as magnetic order, spin states or the charge state of a defect, make the same atomic configuration correspond to several different energies, which no function of positions alone can fit. And **data leakage**, testing on frames from the same trajectory as the training frames, makes errors look smaller than they are; test sets should come from independent simulations.

{{< note type="warn" title="Myth: a random test split measures generalisation" >}}
Splitting frames of the same trajectories at random into training and test sets is the default in many scripts, and it measures interpolation between near-duplicates. Frames saved every 10 or 20 femtoseconds are strongly correlated, because atomic velocities in a typical solid or liquid take tens to hundreds of femtoseconds to decorrelate, and slower motions far longer. A model that memorised the training frames would score well on their neighbours. Honest test sets come from separate simulations, other temperatures or compositions, or held-out classes of structure (for example, every surface orientation except one), and the gap between the random-split error and the held-out error is itself a useful measure of how far the model can be trusted beyond its data. [The chapter on generalisation](../generalisation/) discusses the same issue for machine learning in general.
{{< /note >}}

Holes deserve a closer look because they are the most dangerous failure. A neural network is a smooth but otherwise unconstrained function, and in a region with no data its value is set by the weights it acquired elsewhere. If that value happens to be lower than any physical configuration nearby, molecular dynamics will find it: thermal motion explores every accessible direction, and an energy sink attracts trajectories as surely as a real minimum does. The usual signature is a sudden fall in potential energy accompanied by a rise in temperature in an NVE run, or two atoms at a distance well below any bond length in the training data. Adding the offending configurations, labelled with DFT, fixes that hole and usually reveals the next one, which is why stability testing and active learning are one process rather than two.

{{< note type="key" >}}
- The training set defines the domain of validity: cover phases, strains, rattled and high-temperature structures, defects, surfaces, liquids and short-range contacts, selected for diversity.
- All labels must come from consistent reference calculations; per-element reference energies remove arbitrary offsets.
- Forces dominate the information content; weight energies, forces and stresses for the intended use; learning curves reveal data efficiency.
- Ensembles and GP variances flag uncertain configurations and drive active learning, though they are rarely perfectly calibrated.
- Validate with physics, not just test RMSE: stable dynamics, energy conservation, elastic constants, phonons, defect energies, structure and transport, and barriers of the processes of interest.
- Label noise from inconsistent settings sets a floor on the learning curve; energies need a large loss weight because forces dominate the squared error.
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
- q: "With equal loss weights, a model has errors of 2 meV/atom in energy and 50 meV/Å in force. Which term dominates the loss?"
  options: ["The energy term", "The force term, by a factor of several hundred", "They are about equal"]
  answer: 1
  why: "Squared errors in eV units are 4 × 10⁻⁶ against 2.5 × 10⁻³; energies need a weight of order 100 to 1 000 to matter."
- q: "A learning curve flattens at 30 meV/Å however much data is added. What is the most likely cause?"
  options: ["The training set is too small", "A noise floor: inconsistent reference calculations or degrees of freedom the model cannot see", "The learning rate is too low"]
  answer: 1
  why: "When more data of the same quality stops helping, the limit is the labels or the model's inputs, not the amount of data."
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
8. Z. Li, J. R. Kermode and A. De Vita, "Molecular dynamics with on-the-fly machine learning of quantum-mechanical forces", *Physical Review Letters* **114**, 096405 (2015).
9. G. Imbalzano, A. Anelli, D. Giofré, S. Klees, J. Behler and M. Ceriotti, "Automatic selection of atomic fingerprints and reference configurations for machine-learning potentials", *Journal of Chemical Physics* **148**, 241730 (2018).

</div>
