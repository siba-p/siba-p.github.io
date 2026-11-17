---
title: "Umbrella sampling"
description: "Sampling a free-energy profile across a barrier by restraining the system in overlapping windows: the umbrella bias and why it works, unbiasing a single window, combining windows with the weighted histogram analysis method (WHAM), MBAR and umbrella integration, choosing windows and spring constants with a worked example, diagnosing and repairing poor overlap, error bars that account for autocorrelation, GROMACS and PLUMED input, and common pitfalls."
hook: "A barrier of 20 kBT means its top is visited about 500 million times less often than the bottom of the well. Umbrella sampling holds the system up there with springs, then subtracts the springs back out."
objectives:
  - "Explain how harmonic windows make barrier tops probable and how each window is unbiased"
  - "Choose window spacing and spring constant for a 1.5 nm pulling coordinate"
  - "Diagnose gaps in histogram overlap and repair them with extra windows"
  - "Compare WHAM, MBAR and umbrella integration for joining windows into one profile"
  - "Estimate error bars that account for autocorrelation, using bootstrapping over histograms"
track: rl-free
weight: 2
level: Advanced
prereqs: ["es-fep-ti"]
lab: "Run a row of umbrella windows across a barrier and reconstruct the free-energy profile with WHAM, live"
---

## The idea: make the improbable probable

A free-energy profile $F(s) = -k_BT\ln P(s)$ along a collective variable can be computed from a histogram of $s$, but only where the simulation goes. Across a barrier of 10 or 20 $k_BT$, the probability density at the top is $e^{-10}$ to $e^{-20}$ times that in the well, so an unbiased simulation never samples it. In 1977 Glenn Torrie and John Valleau proposed adding a **bias potential** that makes the improbable regions probable, and then removing the effect of the bias analytically. They called the bias an *umbrella* because it spreads sampling over a region that the natural distribution would leave uncovered.

The commonest form today uses a series of **windows**: separate simulations, each with a harmonic restraint that holds the collective variable near a different centre $s_k$,

{{< eq title="The umbrella bias of window k" say="A spring pulls the collective variable towards the window's centre, so every part of the path, including the barrier top, is sampled by some window." >}}
$$ w_k(s) = \tfrac12\,\textcolor{#845ef7}{\kappa}\,\big(s - \textcolor{#4c6ef5}{s_k}\big)^2, \qquad U_k(\mathbf x) = U(\mathbf x) + w_k\big(\xi(\mathbf x)\big) $$
- $\textcolor{#4c6ef5}{s_k}$: the centre of window $k$; $\textcolor{#845ef7}{\kappa}$: the spring constant
- each window samples a narrow biased distribution $P_k^{\text{b}}(s)$ around $s_k$
{{< /eq >}}

## Unbiasing one window

In window $k$, the biased distribution of $s$ is related to the unbiased one by the Boltzmann factor of the known bias:

$$
P_k^{\text{b}}(s) = \frac{P(s)\,e^{-\beta w_k(s)}}{\langle e^{-\beta w_k}\rangle} \quad\Longrightarrow\quad
F(s) = -k_BT\ln P_k^{\text{b}}(s) - w_k(s) + f_k ,
$$

where $f_k = -k_BT\ln\langle e^{-\beta w_k}\rangle$ is an unknown constant, the free energy of switching on the bias. Each window therefore gives the free-energy profile over its own narrow range, but shifted by an unknown constant. The whole problem of analysis is to determine the constants $f_k$ so that the pieces join up, which is possible only where neighbouring windows **overlap**: where both sample the same values of $s$.

Think of a panorama stitched from photographs taken with unknown exposures. Each window photographs a narrow strip of the landscape: its shape is right, but its brightness, $f_k$, is arbitrary. Where two photographs share scenery, matching the shared part fixes their relative exposure, and a chain of such matches carries one level from end to end. Where two share nothing, no software can tell how the strips relate.

## The weighted histogram analysis method

The **weighted histogram analysis method** (WHAM), developed by Shankar Kumar, John Rosenberg, Peter Kollman and colleagues in 1992 from earlier work of Alan Ferrenberg and Robert Swendsen on combining Monte Carlo histograms, finds the best combination of all windows. It writes the unbiased distribution as a weighted combination of the windows' histograms, with weights chosen to minimise the statistical error, which leads to two equations that are solved by iteration:

{{< eq title="The WHAM equations" say="Combine all windows' histograms with weights that favour windows that sample a bin well; the window constants then follow from the combined distribution, and the two are iterated until they agree." >}}
$$ P(s) = \frac{\sum_{k=1}^{K} \textcolor{#12a594}{n_k(s)}}{\sum_{k=1}^{K} N_k\, e^{\beta(\textcolor{#e64980}{f_k} - w_k(s))}}, \qquad e^{-\beta \textcolor{#e64980}{f_k}} = \sum_{s} P(s)\, e^{-\beta w_k(s)} $$
- $\textcolor{#12a594}{n_k(s)}$: the histogram count of window $k$ in bin $s$; $N_k$: the total samples of window $k$
- start with all $f_k = 0$ and alternate the two equations until the $f_k$ stop changing
{{< /eq >}}

The figure runs thirteen windows across an asymmetric double-well profile in parallel, each sampling its biased distribution by Langevin dynamics. The bottom panel shows each window's histogram. As soon as every window has collected some samples, WHAM is solved and the reconstruction (orange) is drawn over the true profile (blue).

{{< widget name="umbrella" title="Umbrella windows and the WHAM reconstruction" caption="Top: the free-energy profile (blue), each window's biased potential (thin coloured parabolas) and walker, and the WHAM reconstruction (orange). Bottom: each window's histogram; neighbours must overlap. Reduce the number of windows or stiffen the springs until gaps appear, and watch the reconstruction fail." >}}

With enough windows and moderate springs, the histograms overlap, WHAM converges in a few hundred iterations, and the reconstruction matches the true profile within a fraction of $k_BT$ across the barrier. Remove windows or stiffen the springs and gaps open between histograms. WHAM then has no information to connect the pieces on either side of a gap: the reconstructed profile on one side can be shifted by any amount relative to the other, and the error grows. In the opposite direction, springs that are too soft cannot hold the windows on the steep parts of the profile, where the walkers slide down into the wells and the barrier region is undersampled. The spring constant must be large enough to overcome the local slope of $F(s)$, roughly $\kappa \gtrsim |\mathrm dF/\mathrm ds|/\Delta s$ for window spacing $\Delta s$, and small enough that neighbouring windows still overlap; a useful rule of thumb is that each window's distribution should have a width comparable to the window spacing.

{{< note type="try" >}}
At the default settings the worst overlap sits next to the barrier top, where neighbours slide apart down opposite slopes. Remove windows one at a time and watch the overlap readout and the error together. Then restore thirteen windows and lower κ to 10: the window on the crest now samples two humps with a hole between them, because its spring is weaker than the barrier's downward curvature, about $32\,k_BT$ per unit squared.
{{< /note >}}

**MBAR**, introduced in [the previous chapter](../es-fep-ti/), solves the same problem without histogramming: each sample is used individually, with no binning error, and the equations reduce to WHAM in the limit of fine bins. Modern analyses usually use MBAR, or WHAM implementations that provide bootstrap error estimates.

## Choosing windows and spring constants

### Where a window sits

The rule of thumb above becomes quantitative when the free energy is expanded to second order about a window's centre:

{{< eq title="Where a window sits and how wide it is" say="A window settles where its spring balances the local slope of the free energy, and the spring plus the local curvature set its width." >}}
$$ \langle s\rangle_k \approx s_k - \frac{\textcolor{#f08c2e}{F'(s_k)}}{\textcolor{#845ef7}{\kappa} + \textcolor{#12a594}{F''(s_k)}}, \qquad \sigma_k^2 \approx \frac{k_BT}{\textcolor{#845ef7}{\kappa} + \textcolor{#12a594}{F''(s_k)}} $$
- $\textcolor{#f08c2e}{F'}$: the local slope, which pushes the window downhill; $\textcolor{#12a594}{F''}$: the local curvature, negative near a barrier top
- on flat ground $\sigma = \sqrt{k_BT/\kappa}$; if $\kappa + F'' \le 0$ the window has no stable centre at all
{{< /eq >}}

Two Gaussian histograms of equal width $\sigma$ whose means are $d$ apart share a fraction $2\Phi(-d/2\sigma)$ of their area, where $\Phi$ is the standard normal cumulative distribution: 0.62 at $d = \sigma$, 0.32 at $2\sigma$, 0.13 at $3\sigma$ and 0.05 at $4\sigma$. A spacing of about $2\sigma$ is a comfortable working target.

### A worked example: 1.5 nm of pulling coordinate

Suppose a small molecule is pulled out of a binding pocket at 300 K, along the centre-of-mass distance $s$ from the bound minimum at 0.5 nm to bulk solvent at 2.0 nm. As a model, take a profile that rises by 30 kJ/mol to a plateau, with a desolvation barrier about 6 kJ/mol above the plateau at 1.08 nm; its steepest slope is 93 kJ mol⁻¹ nm⁻¹ and its curvature at the crest about −790 kJ mol⁻¹ nm⁻².

1. **Width.** With $k_BT = 2.494$ kJ/mol and $\kappa = 1000$ kJ mol⁻¹ nm⁻², a common choice for distances in GROMACS, $\sigma = \sqrt{2.494/1000} = 0.050$ nm on flat ground.
2. **Count.** A spacing of $2\sigma = 0.10$ nm gives an overlap of 0.32, and 0.5 to 2.0 nm takes 16 windows.
3. **Slope.** On the steep flank $F'/\kappa \approx 0.09$ nm: windows slide most of a spacing downhill, harmlessly, because neighbours slide together. $\kappa = 1000$ just meets the rule $\kappa \gtrsim |F'|/\Delta s = 930$.
4. **Curvature.** $\kappa$ exceeds the crest's 790, so every window has a stable centre, although near the crest $\kappa + F''$ is only about 210 and the window there is wider.
5. **Junctions.** Where the slope changes sign, neighbours slide apart: the window centred at 1.00 nm, on the rising side of the crest, slides back to 0.92 nm, while the one at 1.10 nm stays put, leaving their histograms 0.19 nm apart.

The cell computes each window's exact biased distribution for this profile and reports the worst neighbour overlap and the deepest valley of the summed histogram (its minimum over its median, for equal sampling in every window):

{{< py title="checking a window plan" >}}
import numpy as np
kT = 2.494                                       # kJ/mol at 300 K
s = np.linspace(0.2, 2.3, 21001); ds = s[1] - s[0]
F = 30*(1 - np.exp(-((s - 0.5)/0.35)**2)) + 8*np.exp(-((s - 1.05)/0.15)**2)

def plan(centres, kappa=1000.0):                 # kappa in kJ mol^-1 nm^-2
    P = []
    for c in centres:                            # exact biased distribution of each window
        u = F + 0.5*kappa*(s - c)**2
        p = np.exp(-(u - u.min())/kT); P.append(p/(p.sum()*ds))
    P = np.array(P)
    mean = (P*s).sum(1)*ds; sd = np.sqrt((P*s*s).sum(1)*ds - mean**2)
    ovl = np.minimum(P[:-1], P[1:]).sum(1)*ds    # overlap of neighbours, from 0 to 1
    tot = P.sum(0)[(s >= 0.5) & (s <= 2.0)]      # summed histogram, equal samples per window
    return mean, sd, ovl, tot.min()/np.median(tot)

c = np.round(np.arange(0.5, 2.0001, 0.1), 2)
mean, sd, ovl, valley = plan(c)
for k in range(len(c)):
    if 0.75 < c[k] < 1.25 or c[k] == 1.8:
        print(f"centre {c[k]:.2f}  mean {mean[k]:.3f}  shift {mean[k]-c[k]:+.3f}  width {sd[k]:.3f} nm")
k = ovl.argmin()
print(f"{len(c)} windows: worst overlap {ovl[k]:.2f} ({c[k]:.2f}-{c[k+1]:.2f} nm), valley {valley:.2f}")
c2 = np.sort(np.append(c, 1.05)); mean, sd, ovl, valley = plan(c2)
print(f"{len(c2)} windows: worst overlap {ovl.min():.2f}, valley {valley:.2f}")
{{< /py >}}

Sixteen windows leave one weak junction, between 1.00 and 1.10 nm, with an overlap of 0.15 and a valley at 35 % of the typical height. A seventeenth window centred at 1.05 nm, whose histogram settles at 0.995 nm in the middle of the gap, lifts these to 0.29 and 72 %. Stiffening the two windows beside the gap to 2000 kJ mol⁻¹ nm⁻² instead lowers their overlap to 0.08: narrower histograms need closer neighbours. Change `kappa=1000.0` to `500.0` and the overlap looks better (0.34), but the valley deepens to 19 % and the window at 1.10 nm spreads to 0.14 nm, sampling both sides of a crest whose curvature its spring no longer beats. At 20 ns per window, the 17-window plan costs about a third of a microsecond, run as 17 independent jobs.

### Setting up a window

In GROMACS each window is a separate run whose pull section restrains the coordinate with the potential $\tfrac12 k(s - s_k)^2$, the convention used here. The window at 1.10 nm is

```text
; pull section of the .mdp file for the window centred at 1.10 nm
pull                  = yes
pull-ngroups          = 2
pull-ncoords          = 1
pull-group1-name      = Pocket
pull-group2-name      = Ligand
pull-coord1-type      = umbrella        ; harmonic restraint, 1/2 k (s - init)^2
pull-coord1-geometry  = distance        ; centre-of-mass distance
pull-coord1-groups    = 1 2
pull-coord1-dim       = Y Y Y
pull-coord1-start     = no
pull-coord1-init      = 1.10            ; window centre, nm
pull-coord1-rate      = 0.0             ; the centre does not move
pull-coord1-k         = 1000            ; kJ mol^-1 nm^-2
pull-nstxout          = 50              ; pullx.xvg every 50 steps (0.1 ps at 2 fs)
pull-nstfout          = 50
```

The same restraint in PLUMED, which works with most MD engines, is

```text
# plumed.dat for the window centred at 1.10 nm (GROMACS units: nm, kJ/mol)
lig:    COM ATOMS=2001-2030
pocket: COM ATOMS=1500-1530
d:      DISTANCE ATOMS=lig,pocket
r:      RESTRAINT ARG=d AT=1.10 KAPPA=1000.0
PRINT ARG=d,r.bias STRIDE=50 FILE=COLVAR_110
```

{{< note type="warn" >}}
- **Double-counting the centre.** With `pull-coord1-start = yes`, GROMACS adds the distance at time zero to `pull-coord1-init`. Use `start = yes` with `init = 0` for windows started from frames already at their centres, or `start = no` with `init` set to the centre, never both.
- **Mixing force-constant conventions.** GROMACS and PLUMED write $\tfrac12\kappa(s - s_k)^2$; AMBER's restraints are $k(s - s_k)^2$ in kcal mol⁻¹ Å⁻², so 1000 kJ mol⁻¹ nm⁻² becomes about 1.2. WHAM given the wrong constant still converges, to the wrong profile.
- **Trusting a fast pull.** Frames from a fast steered-MD pull are strained: discard an equilibration period from every window.
- **Reading a distance profile as a binding free energy.** It contains the Jacobian term of [the chapter on collective variables](../es-collective-variables/), and a standard binding free energy also needs a standard-state correction.
{{< /note >}}

## Diagnosing and repairing poor overlap

Real histograms are noisy and real profiles unknown, but the same checks apply. Plot all the histograms with their sum: a valley in the sum marks a weak junction, and one near zero a gap; the overlap matrix that MBAR returns gives the same verdict in numbers. Plot each window's mean minus its centre: the curve traces $-F'/(\kappa + F'')$ and jumps where the slope changes sign, which is where gaps open. Compare each window's histogram from the two halves of its run: one that moves has not equilibrated, and one that is bimodal or unusually wide has a spring weaker than the local curvature, or a slow motion the coordinate misses.

The repair is almost always more windows, not different springs. Since a window's shift is about $-F'/\kappa$ where the curvature is small, the existing windows measure the local slope, $F' \approx \kappa\,(s_k - \langle s\rangle_k)$, and show where to centre a new one so that its histogram, not its centre, lands in the gap: on a rising stretch, uphill of the gap. Start it from a neighbouring window's frame near the target value. A window that keeps jumping between two values points to the hidden barriers discussed below.

{{< note type="practice" >}}
Typical starting values for a centre-of-mass distance are κ = 1000 kJ mol⁻¹ nm⁻², a spacing of 0.1 nm and, for a small solute, often 10 to 20 ns per window; expect to add windows near barrier tops. [WindowWise](/windowwise/), a browser tool written for this site, automates the loop: it designs spacing and force constants before you simulate, runs WHAM with bootstrap errors on GROMACS `pullx` files, flags gaps and drifting windows, and writes the repair windows as `.mdp` settings.
{{< /note >}}

## WHAM, MBAR or umbrella integration

All three estimators take the same samples and biases, and for well-sampled data they agree within statistical error; they differ in how they fail. WHAM bins the samples, so bins must be narrow compared with the windows, or the bias varies across a bin, yet well populated: 0.005 nm, a tenth of a window width, suits the plan above. GROMACS ships it as `gmx wham`, and Alan Grossfield's `wham` program is widely used with other codes. MBAR uses each sample individually, which needs every sample's bias energy in every window, $\beta w_j(s_n)$, cheap here because the bias depends only on $s$. It removes binning from the $f_k$, gives analytical uncertainties for uncorrelated samples and returns the overlap matrix used above; the pymbar library implements it.

**Umbrella integration**, introduced by Johannes Kästner and Walter Thiel in 2005, assumes that each window's histogram is nearly Gaussian, so that its mean and variance give the slope of the free energy wherever it samples; the slopes from all windows are averaged and integrated, as in thermodynamic integration:

{{< eq title="Umbrella integration" say="Each window's mean and width give the slope of the free energy where it samples; average the slopes from all windows, weighted by how densely each one samples there, and integrate." >}}
$$ \frac{\partial F}{\partial s}\bigg|_k = k_BT\,\frac{s - \textcolor{#12a594}{\bar s_k}}{\textcolor{#845ef7}{\sigma_k}^2} - \kappa\,(s - s_k), \qquad \frac{\partial F}{\partial s} = \sum_k \textcolor{#f08c2e}{p_k(s)}\,\frac{\partial F}{\partial s}\bigg|_k, \qquad \textcolor{#f08c2e}{p_k(s)} = \frac{N_k P_k^{\text{b}}(s)}{\sum_j N_j P_j^{\text{b}}(s)} $$
- $\textcolor{#12a594}{\bar s_k}$, $\textcolor{#845ef7}{\sigma_k}$: the mean and standard deviation of window $k$'s samples
- $\textcolor{#f08c2e}{p_k(s)}$: the share of all samples near $s$ that come from window $k$
{{< /eq >}}

It needs no iteration and no bin width, and because windows are joined through a smooth slope rather than matched offsets, it does not fail abruptly where overlap is thin, although the slope there is extrapolated from the neighbours' Gaussian fits. A skewed or bimodal window, like the crest window with too soft a spring, gives a wrong mean force. When the estimators disagree, it is usually the data that need attention.

## Error bars you can trust

No estimator returns an honest error bar by itself, because consecutive frames are correlated. With an integrated correlation time $\tau$ and frames every $\Delta t$, the **statistical inefficiency** is $g \approx 1 + 2\tau/\Delta t$, and $N$ frames are worth about $N/g$ independent samples. Frames every 0.1 ps with $\tau = 50$ ps give $g \approx 1000$: a 20 ns window of 200 000 frames holds about 200 independent samples, and treating the frames as independent shrinks the error bar by $\sqrt{1000}$, about 30. The correlation time is set by the slowest motion coupled to $s$, often a side chain or a water network, and tends to be longest near barrier tops.

Bootstrapping works only if the resampled units are independent, which frames are not. Valid choices are to resample whole windows' histograms (the Bayesian histogram bootstrap of Jochen Hub, Bert de Groot and David van der Spoel), blocks longer than $\tau$, or every $g$-th frame. In GROMACS,

```bash
gmx wham -it tpr-files.dat -ix pullx-files.dat -o profile.xvg -hist histo.xvg \
         -b 2000 -ac -nBootstrap 200 -bsres bsResult.xvg
```

discards the first 2 ns of every window, estimates each window's autocorrelation time and uses it in the analysis, and repeats the calculation on 200 bootstrap samples.

Errors also accumulate along the coordinate. Each junction between windows adds its own uncertainty, so with independent junctions the error grows roughly as the square root of the number crossed: about four times larger at the far end of a 16-window profile than across one junction, with weak junctions contributing most. Quote the difference you care about, such as bound state minus plateau, with its own error. And bootstrapping sees only statistical error: a window that has not equilibrated, or a slow orthogonal motion that no window crossed, needs the checks of the next section.

## Practical umbrella sampling

A typical umbrella-sampling study proceeds as follows. Generate starting configurations along the collective variable, usually from a short steered-MD pull or from an interpolated path. Run each window long enough for its distribution to converge, discarding an initial equilibration period. Check the overlap of neighbouring histograms and add windows where it is poor. Combine with WHAM or MBAR, and estimate errors by bootstrapping or by block averaging over time ([trajectory analysis](../trajectory-analysis/)), remembering that consecutive samples are correlated. Finally, check convergence by comparing profiles from the first and second halves of the data.

The most dangerous pitfall is not visible in the histograms: slow degrees of freedom orthogonal to the collective variable. If, at fixed $s$, the system has two configurations separated by a barrier the window never crosses, each window samples only one of them, every histogram looks fine, and the profile is wrong. This is the hidden-barrier problem of [the chapter on collective variables](../es-collective-variables/). Running windows from different starting configurations, or combining umbrella sampling with replica exchange between windows, helps detect and reduce it.

Umbrella sampling remains among the most widely used free-energy methods, because it is simple, robust and easy to parallelise: every window is an independent simulation. Its limitations are that the collective variable and the window placement must be chosen in advance, and that the cost grows quickly with the number of collective variables. The adaptive methods of the next chapters, metadynamics and its relatives, construct the bias on the fly instead.

{{< note type="key" >}}
- Umbrella sampling restrains the collective variable in windows with harmonic biases $\tfrac12\kappa(s - s_k)^2$, so that every region, including barrier tops, is sampled.
- Each window gives $F(s)$ over its range up to an unknown constant $f_k$; overlap between neighbours lets the pieces be joined.
- WHAM iterates $P(s) = \sum n_k / \sum N_k e^{\beta(f_k - w_k)}$ and $e^{-\beta f_k} = \sum P e^{-\beta w_k}$; MBAR does the same without binning.
- Choose spacing and spring constant so that each window's width matches the spacing; check overlap, convergence and hidden orthogonal barriers.
- A window settles at $\langle s\rangle_k \approx s_k - F'/(\kappa + F'')$ with $\sigma_k^2 \approx k_BT/(\kappa + F'')$: space windows about $2\sigma$ apart, keep $\kappa$ above every crest's downward curvature, and add windows where neighbours straddling a crest slide apart.
- Umbrella integration joins windows through Gaussian mean forces; honest error bars need autocorrelation-aware bootstrapping, and they grow along the coordinate.
{{< /note >}}

{{< quiz >}}
- q: "What does the unknown constant f_k of window k represent?"
  options: ["The temperature of the window", "The free energy of switching on that window's bias; it fixes the vertical offset of the window's piece of the profile", "The force constant"]
  answer: 1
  why: "WHAM or MBAR determine the f_k from the overlap between windows."
- q: "Neighbouring umbrella histograms do not overlap. What happens to the WHAM profile?"
  options: ["Nothing", "The pieces on either side of the gap cannot be connected reliably, so the relative free energy is undetermined and errors grow", "It becomes exact"]
  answer: 1
  why: "Add windows or soften the springs."
- q: "Why can springs that are too soft fail on the steep side of a barrier?"
  options: ["They are too expensive", "The local slope of F(s) overwhelms the restraint, so the walker slides away from the window centre and the steep region is undersampled", "They cause overlap"]
  answer: 1
  why: "κ must exceed the local free-energy gradient over the window spacing."
- q: "At 300 K (k_BT ≈ 2.5 kJ/mol), how wide is the histogram of a window with κ = 1000 kJ mol⁻¹ nm⁻² on a flat part of the profile?"
  options: ["About 0.005 nm", "About 0.05 nm", "About 0.5 nm"]
  answer: 1
  why: "σ = √(k_BT/κ) = √(2.5/1000) nm ≈ 0.05 nm, so a spacing of about 0.1 nm works."
- q: "Two neighbouring windows straddle a barrier top and their histograms barely overlap. Which repair works best?"
  options: ["Stiffen both springs", "Add a window between them, centred so that its histogram falls in the gap", "Run the same two windows ten times longer"]
  answer: 1
  why: "Neighbours of a crest slide apart down opposite slopes; stiffer springs narrow the histograms, and longer runs cannot close a gap."
- q: "Frames are saved every 0.1 ps and the correlation time of s in a window is 50 ps. Bootstrapping individual frames underestimates the error by roughly…"
  options: ["Not at all", "A factor of about 30", "A factor of 2"]
  answer: 1
  why: "The statistical inefficiency is g ≈ 1 + 2 × 50/0.1 ≈ 1000, so the true error is about √1000 ≈ 32 times the naive one."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. G. M. Torrie and J. P. Valleau, "Nonphysical sampling distributions in Monte Carlo free-energy estimation: umbrella sampling", *Journal of Computational Physics* **23**, 187–199 (1977).
2. A. M. Ferrenberg and R. H. Swendsen, "Optimized Monte Carlo data analysis", *Physical Review Letters* **63**, 1195–1198 (1989).
3. S. Kumar, J. M. Rosenberg, D. Bouzida, R. H. Swendsen and P. A. Kollman, "The weighted histogram analysis method for free-energy calculations on biomolecules. I. The method", *Journal of Computational Chemistry* **13**, 1011–1021 (1992).
4. B. Roux, "The calculation of the potential of mean force using computer simulations", *Computer Physics Communications* **91**, 275–282 (1995).
5. J. Kästner, "Umbrella sampling", *WIREs Computational Molecular Science* **1**, 932–942 (2011).
6. M. R. Shirts and J. D. Chodera, "Statistically optimal analysis of samples from multiple equilibrium states", *Journal of Chemical Physics* **129**, 124105 (2008).
7. J. S. Hub, B. L. de Groot and D. van der Spoel, "g_wham—a free weighted histogram analysis implementation including robust error and autocorrelation estimates", *Journal of Chemical Theory and Computation* **6**, 3713–3720 (2010).
8. J. Kästner and W. Thiel, "Bridging the gap between thermodynamic integration and umbrella sampling provides a novel analysis method: 'Umbrella integration'", *Journal of Chemical Physics* **123**, 144104 (2005).

</div>
