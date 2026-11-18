---
title: "Foundations of computational materials science"
lead: "Methods notes for atomistic simulation and machine learning in materials science, covering the material that sits in methods sections, supplementary information and software manuals rather than in textbooks: how WHAM stitches umbrella windows together and where its error bars come from, why a well-tempered bias converges and a plain one does not, what an equivariant message carries between atoms, and why universal potentials systematically soften the energy surface. Each method is followed from the paper that introduced it to current practice, with the derivation, typical parameter values, known failure modes and code that runs in the page."
description: "Methods notes for atomistic simulation and machine learning in materials science: statistical mechanics, molecular dynamics, free-energy and enhanced-sampling methods, and machine-learned interatomic potentials, each followed from the original paper to current practice with derivations, parameter choices, failure modes and runnable code."
covers: |
  Eight books, in three stages.

  **Mathematics, Computing and Python** are the tools: calculus, linear algebra and probability; processors, floating point, the Linux shell, Slurm and Fortran; and Python from its object model to NumPy and profiling.

  **Physics and statistical mechanics, Molecular simulation and Machine learning** are the theory. Entropy, ensembles, free energy and fluctuations; force fields, Monte Carlo, integrators, thermostats and error analysis; and learning from data from least squares to graph networks and transformers.

  **Enhanced sampling and Machine learning for materials** are current methods. Rate theory, FEP and TI, umbrella sampling, metadynamics, OPES, replica exchange, path sampling and Markov state models; and machine-learned interatomic potentials from Behler–Parrinello networks to MACE and the universal models, with a tutorial that builds, trains and validates one from scratch.
author_note: |
  I came to molecular simulation from materials engineering, and to machine learning through my PhD research. Almost every method here I first learned the hard way: from textbooks written for physicists, papers that skipped the steps I needed, and software manuals that assumed I already knew why a setting mattered.

  Preparing these chapters meant going back to the original papers, re-deriving the equations line by line, and rebuilding each method from scratch until it behaved. It was slow, and much of it failed first: descriptors too coarse to learn copper forces, free energies that refused to converge, a machine-learned potential that passed its test set and still got the lattice constant wrong. Those failures are in the chapters, because they teach as much as the successes. Every figure is a small simulation written from scratch, and every number in the text comes from code I ran.

  The notes are for students and early-career scientists who want to understand the methods they use, not only run them. If you find a mistake, an unclear passage or a missing topic, please write to me at [sibasankarpanigrahy08@gmail.com](mailto:sibasankarpanigrahy08@gmail.com).
---

## Core textbooks

The books below are the main references across the subjects. Each chapter also lists the papers and book chapters specific to its topic.

<div class="refs">

1. C. M. Bishop, *Pattern Recognition and Machine Learning*, Springer (2006). The standard treatment of probabilistic machine learning.
2. K. P. Murphy, *Probabilistic Machine Learning: An Introduction*, MIT Press (2022). Free online; modern and broad.
3. I. Goodfellow, Y. Bengio and A. Courville, *Deep Learning*, MIT Press (2016). Free online.
4. T. Hastie, R. Tibshirani and J. Friedman, *The Elements of Statistical Learning*, 2nd ed., Springer (2009). Free online.
5. C. E. Rasmussen and C. K. I. Williams, *Gaussian Processes for Machine Learning*, MIT Press (2006). Free online.
6. D. Frenkel and B. Smit, *Understanding Molecular Simulation*, 3rd ed., Academic Press (2023).
7. M. P. Allen and D. J. Tildesley, *Computer Simulation of Liquids*, 2nd ed., Oxford University Press (2017).
8. M. E. Tuckerman, *Statistical Mechanics: Theory and Molecular Simulation*, 2nd ed., Oxford University Press (2023).
9. M. M. Bronstein, J. Bruna, T. Cohen and P. Veličković, *Geometric Deep Learning: Grids, Groups, Graphs, Geodesics, and Gauges*, arXiv:2104.13478 (2021).

</div>
