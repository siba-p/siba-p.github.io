---
title: "Foundations of computational materials science"
lead: "Long-form notes on the mathematics, programming, physics, simulation methods and machine learning that modern atomistic research is built on. Each subject is written as a single book: it starts from first principles, follows the ideas through the people and papers that introduced them, and works through them with models that run in the browser."
description: "Long-form notes with interactive figures on mathematics, computing and Python, machine learning, statistical mechanics, molecular simulation, enhanced sampling and machine learning for materials, written from first principles with references to the original literature."
covers: |
  The notes run from the foundations to current research methods, in eight subjects.

  **Mathematics, computing and Python** provide the working tools: calculus, linear algebra and probability; how a processor, the Linux shell and compiled code work; and Python from the interpreter and its object model up to NumPy and performance.

  **Machine learning** and **physics and statistical mechanics** provide the two theories that everything else depends on. The first covers learning from data, from a single artificial neuron to deep networks. The second covers microstates and entropy, the Boltzmann distribution, ensembles, free energy, fluctuations, phase transitions and the structure of liquids.

  **Molecular simulation** and **enhanced sampling** turn the physics into practice: molecular dynamics and Monte Carlo, thermostats and barostats, transport coefficients and trajectory analysis, then energy landscapes and rate theory, free-energy perturbation, umbrella sampling, metadynamics, OPES, replica exchange, path sampling and Markov state models.

  **Machine learning for materials** brings the threads together: symmetry and descriptors, the history and theory of machine-learned interatomic potentials from Behler–Parrinello networks to MACE and the universal models, generative models for crystals and differentiable simulation. It includes a complete tutorial that builds, trains and validates an interatomic potential.
author_note: |
  These chapters began as my own working notes. Moving from materials engineering into molecular simulation and then machine learning, I kept rebuilding the same foundations, the statistical mechanics behind a free-energy calculation, the integrator behind an MD run, the symmetry behind an interatomic potential, from sources that each assumed something different.

  Here they are written down once, in one notation and in the order I wish I had learned them, for students starting in computational science and early-career researchers who want to see inside the methods they run.

  Each chapter starts from first principles and the original papers. Every figure is a small simulation rather than an animation: molecular dynamics, Monte Carlo, metadynamics and neural networks written in JavaScript and run in your browser, with Python cells executed by Pyodide. Code examples were run with NumPy, PyTorch, ASE and MACE before publication, and the numbers in the text come from those runs. Corrections are welcome through the [about page](/about/).
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
