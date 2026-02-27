---
title: "Software & Open Source"
description: "Core research software developed at the intersection of Molecular Dynamics and Deep Learning."
layout: "list"
showCards: true
---

# Engineering for Molecular Science

The following repositories represent the computational core of my doctoral research at **IIT Delhi**. These tools bridge the gap between high-fidelity atomistic simulations and predictive machine learning architectures, focused specifically on complex interfacial phenomena.

---

## ML-SurfacePoly: Hybrid Neural Architectures for Adhesion
This framework represents a paradigm shift from traditional enhanced sampling to predictive modeling for polymer-surface interactions. Rather than relying solely on computationally intensive Umbrella Sampling (US) to compute Potential of Mean Force (PMF) profiles, this tool utilizes a hybrid **CNN–GRU–Attention** network to predict full energy profiles directly.



The model architecture is specifically designed to handle the dual challenges of spatial heterogeneity on surfaces and the sequence dependence of polymers. To ensure physical relevance, the training pipeline utilizes a Monte Carlo Ising model to systematically explore the design space while maintaining exact fractional compositions. This enables the rapid screening of sequence-pattern combinations that would otherwise be infeasible through raw molecular dynamics.

{{< github repo="siba-p/ML_surfacepoly" >}}

---

## Nanobuilder: Geometric Simulation Construction
Structural accuracy is the foundation of molecular modeling. **Nanobuilder** is a suite of Jupyter-based workflows developed to streamline the generation of bare and polarized nanoparticle models. It is particularly specialized for high-symmetry Platonic geometries and includes integrated support for virtual sites, which are critical for capturing accurate polarization effects in metallic systems like gold nanoparticles.

{{< github repo="siba-p/nanobuilder" >}}

---

## Journal-Abbrev-Tool: Research Workflow Automation
Scientific communication requires precision in bibliography management. This Python-based CLI utility automates the standardization of BibTeX files for journal submissions. Beyond simple string replacement, it integrates a comprehensive database to manage journal abbreviations and cleaning unwanted metadata fields, ensuring that reference lists comply perfectly with varied publisher standards.

{{< github repo="siba-p/journal-abbrev-tool" >}}

---

## KLA Challenge: Applied Computer Vision
As part of the **KLA Image Restoration Challenge** at IIT Delhi, this project focused on developing robust denoising algorithms. The work applies advanced image processing and restoration techniques to high-fidelity datasets, demonstrating the transferability of data science skills to industrial imaging problems.

{{< github repo="siba-p/your-kla-repo-name" >}}