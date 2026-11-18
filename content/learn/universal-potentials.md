---
title: "Universal potentials"
description: "Interatomic potentials that cover most of the periodic table: the data sets that made them possible (Materials Project trajectories, Alexandria, OMat24, SPICE), the main models from M3GNet and CHGNet to MACE-MP-0, GNoME, MatterSim, SevenNet, ORB and EquiformerV2, how they are benchmarked, their systematic errors such as potential-energy-surface softening, and how to use and fine-tune them in practice."
hook: "A single model trained on about 1.6 million DFT structures relaxes copper to a lattice constant 0.3 per cent from experiment, with no copper-specific training. Knowing where such universal potentials can be trusted, and where they soften, is the skill this chapter builds."
objectives:
  - "Explain how large DFT data sets and element embeddings made universal potentials possible"
  - "Compare M3GNet, CHGNet, MACE-MP-0, MatterSim, ORB and EquiformerV2 by data and design"
  - "Interpret Matbench Discovery results and their limits as a guide to dynamics"
  - "Recognise energy-surface softening and errors inherited from the reference functional"
  - "Run a universal potential through ASE and decide when to fine-tune it"
cover: "cover.svg"
milestones:
  - year: 2011
    text: "Kristin Persson and Gerbrand Ceder's Materials Project opens its DFT database"
  - year: 2022
    text: "Chi Chen and Shyue Ping Ong publish M3GNet, a graph potential for 89 elements"
  - year: 2023
    text: "Bowen Deng, Gerbrand Ceder and colleagues release CHGNet and the MPtrj data set"
  - year: 2024
    text: "Barroso-Luque and colleagues at Meta release OMat24, about 110 million DFT calculations"
track: practice
weight: 3
level: Advanced
prereqs: ["message-passing-potentials", "mlip"]
lab: "Run a universal potential on copper and compare with a reference"
---

## From one material to the periodic table

Until about 2021, every machine-learned potential was a specialist. A potential for silicon knew nothing about oxygen; a potential for water could not describe a salt solution unless salt had been in its training set. Building one took months of DFT calculations, training and validation, and the result applied to one chemical system. This made MLIPs useful tools for groups studying a particular material in depth, but useless for the broad questions of materials discovery: which of ten thousand candidate compounds are stable, which conduct lithium ions quickly, which might catalyse a reaction.

Two developments changed this. High-throughput DFT projects had accumulated enormous numbers of calculations across inorganic chemistry, most importantly the **Materials Project**, which since 2011 has computed the structures and energies of well over a hundred thousand compounds with consistent settings. And message-passing networks with learned element embeddings ([the previous chapters](../message-passing-potentials/)) scale gracefully to many elements, because adding an element adds one embedding vector rather than a new set of descriptors and a new network. Training such a network on a large fraction of the Materials Project's data produced the first **universal interatomic potentials**: models that give reasonable energies and forces for almost any inorganic material out of the box. Their role is often compared to that of foundation models in language processing: a large model pre-trained on broad data, used directly for many tasks or adapted to a specific one with little additional data.

{{< note type="practice" title="Back of the envelope" >}}
Count the chemical systems a materials-discovery campaign might touch. With 89 elements there are $\binom{89}{2} = 3{,}916$ binary systems and $\binom{89}{3} = 113{,}564$ ternary ones. If a bespoke potential for one ternary system costs three months of a researcher's time, covering the ternaries alone would take about 28,000 person-years. One model that covers them all, even at a few tens of meV per atom, changes the question from "which system can we afford to model?" to "which predictions do we need to check?".
{{< /note >}}

### Why a graph network scales across elements

In a descriptor-based potential the number of input channels grows with the number of species. The SOAP power spectrum has one block for every pair of species, so 89 elements give $89 \times 90/2 = 4{,}005$ blocks, most of which are empty for any given structure; ACE grows faster still with the body order. A message-passing network instead maps each element to a learned vector of a few dozen to a few hundred numbers, and all elements share the same message, update and readout functions. Chemically similar elements end up with similar vectors because they appear in similar environments with similar energies: Chen and colleagues showed in 2019 that the element embeddings learned by MEGNet, projected to two dimensions, recover periodic-table trends without being told about them. This sharing is what lets a model trained on a few thousand structures containing scandium borrow from what it learned about yttrium and lutetium.

The models inherit the locality of their architecture. Each atom sees neighbours within a cutoff of typically 5 to 6 Å, extended by a few message-passing layers, and most of the models below have no explicit long-range electrostatics. For bulk metals and most oxides that is adequate. For charged defects, polar surfaces, electrode–electrolyte interfaces and ionic liquids, the missing long-range terms are a structural limitation, not a data problem, and more training data does not remove it.

## The data sets

A universal potential is only as broad as its training data, and the history of these models is in large part a history of data sets.

The **MPtrj** data set, assembled by the authors of CHGNet in 2023, collected the intermediate structures of the Materials Project's geometry relaxations: about 1.6 million structures from about 146 000 materials, with energies, forces, stresses and magnetic moments, mostly computed with the PBE and PBE+U functionals. Because relaxation trajectories start from reasonable guesses and move towards equilibrium, MPtrj is dominated by near-equilibrium structures. Most universal potentials up to 2024 were trained on it.

Larger and more diverse data followed. The **Alexandria** database (Schmidt, Marques and colleagues) provides millions of additional DFT calculations of hypothetical crystals. Google DeepMind's GNoME project generated DFT data for hundreds of thousands of newly predicted stable crystals and their relaxations. Meta's **OMat24** data set (2024) contains about 110 million DFT calculations, deliberately including structures far from equilibrium, rattled, strained and sampled from high-temperature molecular dynamics, precisely to cover the configurations that relaxation trajectories miss. The Open Catalyst data sets **OC20** and **OC22** cover adsorbates on catalytic surfaces. For organic and biomolecular chemistry, the **SPICE** data set provides about a million calculations at a higher level of DFT on drug-like molecules, peptides and their complexes.

Mixing these data sets is not trivial. They use different functionals (PBE, PBE+U, r²SCAN, ωB97M-D3), different pseudopotentials and different settings, so their energies are not directly comparable. Training on several at once requires either restricting to compatible subsets, learning separate output "heads" for each level of theory, or careful correction schemes.

The Materials Project shows how much care even one source needs. It applies a Hubbard $U$ to the $d$ states of Co, Cr, Fe, Mn, Mo, Ni, V and W in oxides and fluorides, and plain PBE everywhere else, so Fe metal and Fe$_2$O$_3$ are computed with different Hamiltonians. Formation energies that mix the two are made consistent by fitted energy corrections (Jain and colleagues, 2011). A universal model trained on raw MPtrj energies learns both Hamiltonians at once, keyed on whether oxygen or fluorine is nearby, and the switch shows up as small discontinuities in reaction energies between metals and their oxides.

## The models

**M3GNet** (Chi Chen and Shyue Ping Ong, 2022) was one of the first universal potentials: a graph network with explicit three-body interactions inside its message passing, trained on Materials Project relaxation data across 89 elements. It showed that a single model could relax structures and run dynamics across inorganic chemistry. **CHGNet** (Bowen Deng, Gerbrand Ceder and colleagues, 2023) was trained on MPtrj and also predicts magnetic moments, which act as a proxy for the charge states of transition-metal ions, important in battery materials where the oxidation state of a metal changes during cycling.

**GNoME** (Amil Merchant, Ekin Dogus Cubuk and colleagues at Google DeepMind, 2023) used graph networks in an active-learning loop: candidate structures were generated by substitution and random search, filtered by the network, computed with DFT, and added to the training data, over several rounds. The process proposed about 2.2 million structures predicted to lie on or near the convex hull of stability, of which roughly 380 000 were stable relative to all known materials, and the networks trained along the way became universal potentials themselves. The claim of novelty and stability for so many structures prompted discussion about how many are genuinely new and synthesisable, a useful reminder that computational stability is a necessary but not a sufficient condition for a real material.

**MACE-MP-0** (Ilyes Batatia, Gábor Csányi and a large collaboration, 2023) is a MACE model ([message-passing potentials](../message-passing-potentials/)) trained on MPtrj. Its paper demonstrated stable molecular dynamics, out of the box, across a wide range of systems, from water and ice to catalysis, batteries, metal–organic frameworks and high-entropy alloys. It is distributed in several sizes as an ASE calculator, and has become a common starting point for fine-tuning.

Several further models appeared in 2024. **MatterSim** (Han Yang and colleagues at Microsoft Research) was trained on structures sampled across elements, temperatures up to 5000 K and pressures up to 1000 GPa, aiming at finite-temperature and high-pressure properties. **SevenNet** is a NequIP-based universal model with a parallel algorithm for large-scale dynamics. **ORB** (Orbital Materials) is a fast model that is not built to be exactly equivariant but learns rotational symmetry approximately from rotated training data. **EquiformerV2** models trained on OMat24 (the eqV2 models of Meta's fairchem project) reached the top of the stability-prediction benchmarks at the time of their release. For organic molecules, **MACE-OFF** (trained on SPICE), **AIMNet2** and the **ANI** family play the same role. The field moves quickly, and newer models appear every few months; the principles below matter more than any ranking.

## How universal potentials are benchmarked

A natural test of a universal potential is whether it can do the job materials discovery needs: predict which hypothetical crystals are thermodynamically stable. **Matbench Discovery** (Janosh Riebesell, Rhys Goodall, Alpha Lee and colleagues) frames exactly this. Models are given about 250 000 unrelaxed hypothetical crystal structures from the WBM data set, generated by element substitution; they must relax each structure and predict its energy relative to the convex hull of known phases, and are scored on how well they classify structures as stable or unstable, with metrics such as the F1 score and the **discovery acceleration factor** (how much more often a model's predicted-stable structures are truly stable than random picks would be). Later versions added a test of thermal conductivity, which depends on third derivatives of the energy (anharmonic phonons) and probes the shape of the potential energy surface far more severely than energies do.

These benchmarks were valuable because they compared models on the same task with the same data, and they showed universal potentials outperforming one-shot property predictors at screening. But a good leaderboard score does not guarantee accurate dynamics for a particular system: the benchmark rewards energies near equilibrium for typical crystals, while a simulation of a liquid, an interface or a defect may depend on regions of the energy surface that the benchmark never tests. The validation principles of [the chapter on training and validation](../mlip/) still apply.

### Worked example: what an error of 50 meV per atom costs

The metrics are easy to compute and easy to misread, so it pays to work through a synthetic case. Take a population of candidate crystals whose true distances to the convex hull are normally distributed with mean 0.10 eV/atom and standard deviation 0.10 eV/atom. Then 15.9 per cent of them are stable (distance below zero), and random selection finds a stable crystal one time in 6.3.

{{< note type="try" title="Pause and predict" >}}
A model predicts each hull distance with a Gaussian error of standard deviation 50 meV/atom, and we call a crystal stable if the prediction is below zero. What fraction of the crystals it flags are truly stable, and what is its discovery acceleration factor? Guess before reading on.
{{< /note >}}

Simulating two million candidates gives a precision of 0.67 and a recall of 0.78, so the F1 score is 0.72 and the discovery acceleration factor is $0.67/0.159 = 4.2$, against a ceiling of 6.3 for a perfect model. The reason is visible in the figure: many candidates sit within 50 meV/atom of the hull on either side, and for them an error of that size is a coin toss. Doubling the error to 100 meV/atom lowers the factor to 2.8. Because real candidate sets also crowd near the hull, a model's mean absolute error on formation energies says little about its screening value on its own; what matters is the error for the structures near the decision boundary, which is why Matbench Discovery reports classification metrics alongside regression errors.

{{< fig src="screening.svg" alt="Left: scatter of predicted against true hull distance for 6,000 synthetic candidates with 50 meV per atom errors, coloured into found, false alarms, missed and correctly rejected quadrants. Right: discovery acceleration factor falling from 6.3 at zero error to 4.2 at 50 meV per atom and about 2.2 at 150 meV per atom" caption="Left: with errors of 50 meV/atom, almost all the false alarms (pink) and misses (gold) come from candidates within about 100 meV/atom of the hull. Right: the discovery acceleration factor of the same synthetic population as the model error grows; a perfect model reaches $1/0.159 = 6.3$." >}}

## Systematic errors

Universal potentials have characteristic errors that every user should know. The most widespread is **softening of the potential energy surface**. Models trained largely on near-equilibrium data, such as relaxation trajectories, systematically underestimate the curvature of the energy surface: predicted forces are too small, phonon frequencies too low, elastic constants and bulk moduli too small, and surface and defect energies often too low. Deng and colleagues showed in 2024 that this softening appears consistently across universal models and can be largely corrected by fine-tuning with a modest number of structures sampled away from equilibrium. Data sets such as OMat24, which deliberately include rattled and high-temperature structures, were built partly to address it.

{{< note type="practice" title="Back of the envelope" >}}
Suppose a model reproduces the shape of the energy surface but scales its curvature by $s = 0.8$. Forces at a given displacement fall by 20 per cent, as do the bulk modulus and the elastic constants. Phonon frequencies scale as $\sqrt s$, so they fall by 10.6 per cent, and the harmonic mean-square displacement at a given temperature, proportional to $1/s$, rises by 25 per cent. Kinetics suffer most, because barriers enter exponentially. A migration barrier underestimated by 50 meV raises an Arrhenius rate at 300 K by $e^{0.05/0.0259} \approx 6.9$; at 1000 K the same error costs only a factor of 1.8. Low-temperature diffusion coefficients and ionic conductivities extrapolated from such a model can be off by an order of magnitude even when every energy looks reasonable ([rate theory](../es-rates/) has the formulas).
{{< /note >}}

{{< fig src="softening.svg" alt="Left: phonon dispersion of a one-dimensional chain for a reference and for a model with 0.8 times the curvature, the softened branch lying 10.6 per cent lower at the zone boundary. Right: ratio of predicted to true rate against barrier underestimate, rising exponentially, steepest at 300 K and shallowest at 1000 K" caption="Left: scaling every force constant by 0.8 lowers the whole phonon branch by $1 - \sqrt{0.8} = 10.6$ per cent. Right: the cost of a soft barrier is a factor $e^{\Delta E/k_BT}$ in the rate, 6.9 for 50 meV at 300 K, so room-temperature kinetics are the most sensitive." >}}

Universal potentials also inherit the errors of their reference. A model trained on PBE overestimates lattice constants slightly and misses most dispersion, unless a dispersion correction is added (MACE-MP-0 can be combined with the D3 correction); PBE+U data mix two Hamiltonians, so energies of compounds of the same elements computed with and without $U$ must be reconciled. And coverage is uneven: chemistries, structures and conditions that are rare in the training data, such as molecular crystals, liquids, surfaces with adsorbates, very high pressures or radiation damage, may be described much less well than common oxides and intermetallics.

{{< note type="warn" title="Myth" >}}
**Myth:** a universal potential has been trained on everything, so it needs no validation. **Reality:** it is universal across *elements*, not across *configurations* or *levels of theory*. MPtrj contains relaxation snapshots of ordered crystals; it contains few liquids, few surfaces with adsorbates, few high-pressure phases and almost no isolated molecules. A model can therefore relax a new quaternary oxide well and still melt silicon at the wrong temperature. Ranking first on Matbench Discovery says the model sorts near-equilibrium crystals by stability; it says nothing direct about a liquid–solid interface at 1700 K.
{{< /note >}}

## Using and fine-tuning a universal potential

Most universal potentials are distributed as Python packages with an ASE calculator, so they slot into any ASE-based workflow: relaxation, molecular dynamics, nudged elastic band calculations, phonons. The following example relaxes face-centred cubic copper with MACE-MP-0 (it was run while writing this chapter; the first call downloads the model):

```python
from ase.build import bulk
from ase.filters import FrechetCellFilter
from ase.optimize import BFGS
from mace.calculators import mace_mp           # pip install mace-torch

calc = mace_mp(model="medium", default_dtype="float64", device="cpu")
atoms = bulk("Cu", "fcc", a=3.7, cubic=True)
atoms.calc = calc
BFGS(FrechetCellFilter(atoms), logfile=None).run(fmax=1e-3)   # relax positions and cell
print(atoms.cell[0, 0])                                       # 3.626 Å; experiment 3.615 Å
```

The predicted lattice constant of 3.626 Å is close to the PBE value for copper, about 0.3 % above experiment, exactly as expected for a model that reproduces PBE. The same `calc` object can drive molecular dynamics with ASE's integrators, or be used from LAMMPS through the MACE interface for larger systems.

### Checking a universal potential on your system

Before a universal model is used for anything quantitative, five checks against a few dozen DFT calculations with the same functional catch most problems.

1. **Equation of state.** Compute energies at seven volumes within ±6 per cent of equilibrium with DFT and with the model, and fit both to a Birch–Murnaghan form. A bulk modulus clearly below the DFT value is the usual signature of softening.
2. **Force parity on snapshots.** Run a short MD at the target temperature with the model, take 20 to 50 well-separated frames and recompute their forces with DFT. Fit predicted against reference forces: a slope clearly below one is softening, a large scatter at a slope near one is a coverage problem.
3. **Phonons.** Compute the phonon dispersion of a phase known to be stable. Imaginary modes mean the model has a spurious instability; uniformly low frequencies mean softening.
4. **Energy conservation.** A 10 ps NVE run should show no systematic drift. Drift points to a rough energy surface, often in configurations far from the training data.
5. **Visual inspection.** Watch the trajectory for atoms coming unphysically close, molecules dissociating or surfaces reconstructing in ways DFT would not support. Such events are rare in validation sets and common in long runs.

The configurations that fail these checks are exactly the ones to use for fine-tuning, and a committee of fine-tuned models can find more of them automatically ([active learning](../active-learning/)).

{{< note type="practice" title="From the lab" >}}
A typical screen for solid lithium-ion conductors runs as follows. Generate or collect a few hundred candidate structures (from databases, or from a [generative model](../diffusion-models/)), relax them with a universal potential and discard those more than about 50 meV/atom above the hull. Run 100 to 500 ps of MD for each survivor at four or five temperatures between 600 and 1200 K, extract lithium diffusion coefficients from the mean-square displacement, and fit an Arrhenius line to extrapolate to 300 K. Then recompute the barrier for the few best candidates with nudged-elastic-band DFT. The last step is not optional: an Arrhenius extrapolation from 600–1200 K down to 300 K amplifies any softening of the migration barrier exponentially, and fine-tuning on a few hundred DFT snapshots from the high-temperature runs is usually cheaper than chasing a wrong lead.
{{< /note >}}

For production work on a specific system, the recommended route is usually **fine-tuning**: start from the pre-trained universal model and continue training on a few hundred to a few thousand DFT calculations of the system of interest, computed with settings compatible with the foundation model's training data. The pre-trained model supplies a good description of chemistry in general, and the fine-tuning data correct its systematic errors for the configurations that matter. To avoid "catastrophic forgetting", in which fine-tuning degrades the model elsewhere, MACE offers a multi-head scheme that keeps training on a sample of the original data alongside the new data. Fine-tuned foundation models often match or exceed potentials trained from scratch on the same system with far less data.

In practice "compatible settings" means the same functional, the same Hubbard $U$ values, compatible pseudopotentials, and a plane-wave cutoff and $k$-point density at least as tight as those of the pre-training data; the Materials Project relaxations behind MPtrj used PAW PBE(+U) with a 520 eV cutoff. Fine-tuning data computed with r²SCAN, or with a different $U$ for iron, cannot be mixed into an MPtrj-trained model without a separate output head or a correction scheme. The learning rate is usually lowered relative to pre-training, and training stops early on a held-out set of the new data, because a few hundred structures are easily overfitted by a model with millions of parameters.

A sensible workflow for a new project is therefore: screen and explore with a universal potential; validate it on a handful of DFT calculations of configurations that matter; if the errors are too large, fine-tune on system-specific data, possibly selected by active learning; and validate the fine-tuned model with the property-based tests of the previous chapter before trusting long simulations.

{{< fig src="workflow.svg" alt="Flow diagram: four pre-training data sets (MPtrj, Alexandria, OMat24, SPICE) feed a universal potential, which is used directly or validated against 20 to 50 DFT calculations; if errors are too large it is fine-tuned on hundreds to thousands of compatible structures, with replay of original data, before production MD" caption="The working life of a foundation potential. Most projects pass through the validation box at least once; fine-tuning is triggered by the checks in the previous section, and replaying part of the original data keeps the model from forgetting the chemistry it is not being fine-tuned on." >}}

{{< note type="key" >}}
- Universal potentials, trained on hundreds of thousands to millions of DFT structures, describe most inorganic materials out of the box; message-passing models with learned element embeddings made them possible.
- Key data sets: MPtrj (Materials Project relaxations), Alexandria, GNoME, OMat24 (110 million, including far-from-equilibrium structures), OC20/OC22, SPICE for molecules; mixing levels of theory requires care.
- Key models: M3GNet, CHGNet, MACE-MP-0, GNoME, MatterSim, SevenNet, ORB, EquiformerV2 (eqV2), MACE-OFF, AIMNet2.
- Matbench Discovery tests stability prediction for hypothetical crystals; good scores do not guarantee accurate dynamics.
- Universal models soften the energy surface and inherit reference errors; fine-tuning on a few hundred system-specific calculations corrects much of this.
{{< /note >}}

{{< quiz >}}
- q: "Why did message-passing networks make universal potentials practical?"
  options: ["They are faster than all other models", "Adding an element adds one learned embedding instead of new descriptors and networks, so they scale to many elements", "They do not need training data"]
  answer: 1
  why: "Descriptor-based models grow combinatorially with the number of elements."
- q: "Universal potentials trained on relaxation trajectories tend to predict phonon frequencies that are…"
  options: ["too high", "too low, because the training data are mostly near equilibrium and the learned surface is too soft", "exact"]
  answer: 1
  why: "Softening is a systematic error, reduced by far-from-equilibrium data or fine-tuning."
- q: "A universal potential trained on PBE predicts a lattice constant 1 % larger than experiment for a metal. Most likely…"
  options: ["The model is broken", "It is reproducing the PBE functional's known tendency to overestimate lattice constants", "The temperature is wrong"]
  answer: 1
  why: "A universal MLIP inherits the systematic errors of its reference."
- q: "What is the main purpose of fine-tuning a foundation model?"
  options: ["To make it run faster", "To correct its errors for a specific system using a small amount of compatible DFT data", "To add new elements without data"]
  answer: 1
  why: "The pre-trained model supplies general chemistry; the fine-tuning data supply system-specific accuracy."
- q: "One candidate crystal in six is truly stable. What is the largest discovery acceleration factor any model can reach on this set?"
  options: ["1", "About 6", "There is no upper limit"]
  answer: 1
  why: "The discovery acceleration factor is precision divided by prevalence. A perfect model has precision 1, so the ceiling is 1 divided by 1/6, which is 6."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. A. Jain et al., "Commentary: The Materials Project: a materials genome approach to accelerating materials innovation", *APL Materials* **1**, 011002 (2013).
2. C. Chen and S. P. Ong, "A universal graph deep learning interatomic potential for the periodic table", *Nature Computational Science* **2**, 718–728 (2022).
3. B. Deng et al., "CHGNet as a pretrained universal neural network potential for charge-informed atomistic modelling", *Nature Machine Intelligence* **5**, 1031–1041 (2023).
4. A. Merchant, S. Batzner, S. S. Schoenholz, M. Aykol, G. Cheon and E. D. Cubuk, "Scaling deep learning for materials discovery", *Nature* **624**, 80–85 (2023).
5. I. Batatia et al., "A foundation model for atomistic materials chemistry", arXiv:2401.00096 (2023).
6. H. Yang et al., "MatterSim: a deep learning atomistic model across elements, temperatures and pressures", arXiv:2405.04967 (2024).
7. L. Barroso-Luque et al., "Open Materials 2024 (OMat24) inorganic materials dataset and models", arXiv:2410.12771 (2024).
8. L. Chanussot et al., "Open Catalyst 2020 (OC20) dataset and community challenges", *ACS Catalysis* **11**, 6059–6072 (2021).
9. P. Eastman et al., "SPICE, a dataset of drug-like molecules and peptides for training machine learning potentials", *Scientific Data* **10**, 11 (2023).
10. J. Riebesell et al., "Matbench Discovery – a framework to evaluate machine learning crystal stability predictions", arXiv:2308.14920 (2023).
11. B. Deng et al., "Overcoming systematic softening in universal machine learning interatomic potentials by fine-tuning", arXiv:2405.07105 (2024).
12. D. P. Kovács et al., "MACE-OFF: short-range transferable machine learning force fields for organic molecules", arXiv:2312.15211 (2023).
13. A. Jain, G. Hautier, S. P. Ong, C. J. Moore, C. C. Fischer, K. A. Persson and G. Ceder, "Formation enthalpies by mixing GGA and GGA+U calculations", *Physical Review B* **84**, 045115 (2011).
14. C. Chen, W. Ye, Y. Zuo, C. Zheng and S. P. Ong, "Graph networks as a universal machine learning framework for molecules and crystals", *Chemistry of Materials* **31**, 3564–3572 (2019).

</div>
