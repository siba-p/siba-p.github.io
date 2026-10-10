---
title: "Introducing WindowWise: plan, check and repair umbrella sampling"
date: 2026-10-09T10:30:00+05:30
description: "A free in-browser tool that designs umbrella windows before you simulate and tells you exactly which windows to add afterwards."
image: "media/polymer-surface.jpg"
tags: ["free energy", "umbrella sampling", "tools"]
---

During my PhD I ran a very large number of umbrella-sampling simulations. The two mistakes I made most often were spacing the windows too far apart and using springs too soft for a steep part of the free-energy profile. Both fail quietly: WHAM still returns a smooth-looking curve, and the problem only shows up later, if at all.

[**WindowWise**](/windowwise/) is the tool I wished I had. It runs entirely in the browser, so your files never leave your computer.

## Before you simulate: plan

A harmonic window of force constant $k$ samples a distribution of width

$$
\sigma = \sqrt{k_B T / k}
$$

on a locally flat PMF, and two neighbouring windows a distance $d$ apart overlap by $2\Phi(-d/2\sigma)$. A slope $F'$ shifts each window by $F'/k$. WindowWise chooses $k$ so that the steepest expected slope moves a window by at most half a spacing. It then spaces the windows for the overlap you ask for and writes the GROMACS pull settings.

## After you simulate: check

Drop in your `pullx.xvg` files, with an optional Grossfield-style metadata file. WindowWise then:

- runs WHAM on a common grid, with block-bootstrap error bars whose block length is set by each window's statistical inefficiency;
- plots every window's histogram and the overlap between neighbours;
- flags gaps, windows that drift from their centre, and windows with too few independent samples.

## Then repair

For every gap it proposes new windows. Their spacing follows your target overlap, their force constants are raised where the local slope is steep, and their centres are offset by $F'/k$ so they sample the middle of the gap rather than sliding off it. Windows that drift get a stiffer spring. The result is a short `.mdp` snippet you can paste straight into your next run.

## How I checked it

On synthetic data drawn from an analytic Morse-type adsorption profile (a 30 kJ/mol well), the WHAM profile matches the exact answer to 0.19 kJ/mol RMSE. Bootstrap errors are around 0.4 kJ/mol, and a deliberately removed block of windows is detected and repaired. The **Load demo dataset** button reproduces this test with two built-in mistakes, so you can see what a broken run looks like.

If you try it on your own system, I'd like to hear what works and what doesn't.
