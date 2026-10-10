---
title: "Small crowders are not tiny PEG"
date: 2026-10-09T06:30:00+05:30
description: "What glycine and serine do to a DNA-coated gold nanoparticle, and why depletion isn't the right picture for them."
image: "img/dna-aunp-box.jpg"
tags: ["crowding", "gold nanoparticles", "Kirkwood–Buff"]
---

Ask someone how a crowded environment affects a nanoparticle and you'll usually hear about **depletion**. Big inert crowders such as PEG or dextran are excluded from a shell around the particle. That creates an osmotic push, and things compact or aggregate. It's an elegant picture, the Asakura–Oosawa picture, and for large polymer crowders it works well.

The inside of a cell, though, is also full of *small* molecules at high concentration. In my JCP paper ([Panigrahy & Nayar, 2024](https://doi.org/10.1063/5.0179238)) we asked what happens to a DNA-functionalised gold nanoparticle when the crowders are small amino acids.

{{< movie src="media/dna-aunp-solvated.mp4" poster="media/dna-aunp-solvated.jpg" caption="The system: a T10 ss-DNA-grafted Au₂₀₁ nanoparticle, solvated. Solvent is shown as a translucent volume." >}}

## The tool: Kirkwood–Buff integrals

To separate "crowder is excluded" from "crowder sticks", I used Kirkwood–Buff (KB) theory. The KB integral between species *i* and *j* is the excess number of *j* around *i*, relative to a uniform distribution:

$$
G_{ij} = 4\pi \int_0^{\infty} \left[ g_{ij}(r) - 1 \right] r^2 \, dr
$$

Comparing the nanoparticle–crowder integral with the nanoparticle–water integral gives the **preferential binding coefficient**:

$$
\nu_{c} = \rho_c \left( G_{pc} - G_{pw} \right)
$$

A positive $\nu_c$ means the crowder accumulates near the particle. A negative value means it's depleted. Depletion theory predicts that $\nu_c$ is negative for every crowder. The simulations didn't show that.

## What we found

The gold surface turns out to be a **third interaction site** that competes with the DNA:

- **Glycine** behaves like a surface glue. It accumulates near the gold core and pulls the alkyl linkers down towards the surface, giving the *smallest* effective radius of all the systems.
- **Serine** prefers the DNA chains themselves and helps extend the linkers.
- **Glycine + serine** together co-adsorb on the gold, sterically force all four linker chains perpendicular to the surface, and give the *largest* effective radius: **35.49 Å**.

Splitting the solvation free energy as $\Delta G_\text{solv} = \Delta U_\text{solv} - T\Delta S_\text{solv}$ showed that solvation becomes more favourable in the order water → Gly → Ser → Gly+Ser, with *both* the energetic and entropic terms contributing.

> Small amino acid crowders act through direct, soft interactions, not through depletion. The size and stability of a functionalised nanoparticle depend on crowder *chemistry*, and on how that chemistry divides between the metal surface and the ligand shell.

## Why it matters

If you design nanoparticles for intracellular sensing or delivery, the effective size of the particle (and so its diffusion, uptake and corona) depends on what's around it, not only on how crowded it is. A bulk depletion argument would get the direction of the effect wrong.

One caveat I'm keen to test next: these simulations used a non-polarizable gold model. For charged adsorbates, [polarizability changes where molecules bind](/research/#citrate-aunp), so repeating this study with a polarizable gold core is high on my list.
