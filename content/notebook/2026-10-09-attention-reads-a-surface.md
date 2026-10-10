---
title: "Teaching attention to read a surface"
date: 2026-10-09T07:00:00+05:30
description: "Replacing umbrella sampling with a CNN–GRU–attention network, then running it backwards to design surfaces."
image: "img/ml-architecture.jpg"
tags: ["machine learning", "free energy", "inverse design"]
---

Umbrella sampling is the workhorse for computing how strongly a polymer sticks to a surface. You pull the chain away in windows, sample each one, and stitch them together into a potential of mean force (PMF). It is reliable, and it is slow. If you want to *screen* polymer sequences against surface patterns, the combinatorics quickly outrun any compute budget.

So we asked a simple question: if we simulate enough pairs, can a network learn the mapping
**(polymer sequence, surface pattern) → full PMF profile**?

{{< movie src="media/polymer-surface.mp4" poster="media/polymer-surface.jpg" caption="A coarse-grained copolymer on a chemically patterned surface. Red sites attract strongly." >}}

## Building the design space

Random patterns are a poor sample of what real surfaces look like. To cover the space from well-mixed to blocky, I generated both surfaces (2D) and sequences (1D) with a Monte Carlo **Ising model with Kawasaki exchange**. Swapping unlike neighbours keeps the fraction of strongly interacting sites *exactly* fixed while the coupling tunes how clustered they are. You can try the same sampler in the [playground](/playground/#ising).

The final dataset contained roughly half a million umbrella-sampling free-energy simulations.

## The architecture

Each input has its own structure, so each gets its own encoder:

| Input | Structure | Encoder |
|---|---|---|
| Surface pattern | 2D grid with local spatial correlations | CNN |
| Polymer sequence | 1D chain, order matters | GRU |
| Their interaction | Which sites matter for which beads | Transformer attention |

The attention block is what ties them together. Each polymer-side representation forms queries, the surface features form keys and values, and

$$
\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right) V
$$

lets the model learn *context-dependent* coupling between beads and surface sites, instead of averaging the surface into one number.

## How well does it work?

On held-out data the hybrid model reached **R² = 0.995** (mean absolute error ≈ 0.45) for the complete PMF profile. A plain deep neural network baseline reached R² = 0.980 (MAE ≈ 0.59). That sounds close, but the difference sits exactly where it matters: the depth of the free-energy minimum and the steepness of the adsorption barrier.

## Running it backwards

Prediction is useful. Design is the real goal. For the inverse problem (*given a polymer and a target PMF, which surface gives it?*) we trained a **tandem network**: a generator that proposes surface patterns, coupled to the frozen forward model so that gradients flow through a physically meaningful predictor.

The generated surfaces were checked with fresh MD. Their PMFs matched the targets, measured by the Jensen–Shannon divergence between target and generated distributions. The normalised Hamming distance showed the designs were diverse rather than copies of training patterns. A Boolean particle swarm optimiser gave an independent check on the same design problem.

## What I'd do differently

The training data are coarse-grained. The real test is whether these structure–property relationships carry over to all-atom DNA on realistic gold or SAM surfaces. That's the next experiment.

*Paper: S. Panigrahy, A. James, D. Nayar, NeurIPS AI4Mat Workshop 2025; extended version under review. Code: [ML_surfacepoly](https://github.com/siba-p/ML_surfacepoly).*
