---
title: "Umbrella sampling"
description: "Sampling a free-energy profile across a barrier by restraining the system in overlapping windows: the umbrella bias and why it works, unbiasing a single window, combining windows with the weighted histogram analysis method (WHAM) and MBAR, choosing windows and spring constants, checking overlap and convergence, and common pitfalls."
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

## The weighted histogram analysis method

The **weighted histogram analysis method** (WHAM), developed by Shankar Kumar, John Rosenberg, Peter Kollman and colleagues in 1992 from earlier work of Alan Ferrenberg and Robert Swendsen on combining Monte Carlo histograms, finds the best combination of all windows. It writes the unbiased distribution as a weighted combination of the windows' histograms, with weights chosen to minimise the statistical error, which leads to two equations that are solved by iteration:

{{< eq title="The WHAM equations" say="Combine all windows' histograms with weights that favour windows that sample a bin well; the window constants then follow from the combined distribution, and the two are iterated until they agree." >}}
$$ P(s) = \frac{\sum_{k=1}^{K} \textcolor{#12a594}{n_k(s)}}{\sum_{k=1}^{K} N_k\, e^{\beta(\textcolor{#e64980}{f_k} - w_k(s))}}, \qquad e^{-\beta \textcolor{#e64980}{f_k}} = \sum_{s} P(s)\, e^{-\beta w_k(s)} $$
- $\textcolor{#12a594}{n_k(s)}$: the histogram count of window $k$ in bin $s$; $N_k$: the total samples of window $k$
- start with all $f_k = 0$ and alternate the two equations until the $f_k$ stop changing
{{< /eq >}}

The figure runs eleven windows across an asymmetric double-well profile in parallel, each sampling its biased distribution by Langevin dynamics. The bottom panel shows each window's histogram. As soon as every window has collected some samples, WHAM is solved and the reconstruction (orange) is drawn over the true profile (blue).

{{< widget name="umbrella" title="Umbrella windows and the WHAM reconstruction" caption="Top: the free-energy profile (blue), each window's biased potential (thin coloured parabolas) and walker, and the WHAM reconstruction (orange). Bottom: each window's histogram; neighbours must overlap. Reduce the number of windows or stiffen the springs until gaps appear, and watch the reconstruction fail." >}}

With enough windows and moderate springs, the histograms overlap, WHAM converges in a few hundred iterations, and the reconstruction matches the true profile within a fraction of $k_BT$ across the barrier. Remove windows or stiffen the springs and gaps open between histograms. WHAM then has no information to connect the pieces on either side of a gap: the reconstructed profile on one side can be shifted by any amount relative to the other, and the error grows. In the opposite direction, springs that are too soft cannot hold the windows on the steep parts of the profile, where the walkers slide down into the wells and the barrier region is undersampled. The spring constant must be large enough to overcome the local slope of $F(s)$, roughly $\kappa \gtrsim |\mathrm dF/\mathrm ds|/\Delta s$ for window spacing $\Delta s$, and small enough that neighbouring windows still overlap; a useful rule of thumb is that each window's distribution should have a width comparable to the window spacing.

**MBAR**, introduced in [the previous chapter](../es-fep-ti/), solves the same problem without histogramming: each sample is used individually, with no binning error, and the equations reduce to WHAM in the limit of fine bins. Modern analyses usually use MBAR, or WHAM implementations that provide bootstrap error estimates.

## Practical umbrella sampling

A typical umbrella-sampling study proceeds as follows. Generate starting configurations along the collective variable, usually from a short steered-MD pull or from an interpolated path. Run each window long enough for its distribution to converge, discarding an initial equilibration period. Check the overlap of neighbouring histograms and add windows where it is poor. Combine with WHAM or MBAR, and estimate errors by bootstrapping or by block averaging over time ([trajectory analysis](../trajectory-analysis/)), remembering that consecutive samples are correlated. Finally, check convergence by comparing profiles from the first and second halves of the data.

The most dangerous pitfall is not visible in the histograms: slow degrees of freedom orthogonal to the collective variable. If, at fixed $s$, the system has two configurations separated by a barrier the window never crosses, each window samples only one of them, every histogram looks fine, and the profile is wrong. This is the hidden-barrier problem of [the chapter on collective variables](../es-collective-variables/). Running windows from different starting configurations, or combining umbrella sampling with replica exchange between windows, helps detect and reduce it.

Umbrella sampling remains among the most widely used free-energy methods, because it is simple, robust and easy to parallelise: every window is an independent simulation. Its limitations are that the collective variable and the window placement must be chosen in advance, and that the cost grows quickly with the number of collective variables. The adaptive methods of the next chapters, metadynamics and its relatives, construct the bias on the fly instead.

{{< note type="key" >}}
- Umbrella sampling restrains the collective variable in windows with harmonic biases $\tfrac12\kappa(s - s_k)^2$, so that every region, including barrier tops, is sampled.
- Each window gives $F(s)$ over its range up to an unknown constant $f_k$; overlap between neighbours lets the pieces be joined.
- WHAM iterates $P(s) = \sum n_k / \sum N_k e^{\beta(f_k - w_k)}$ and $e^{-\beta f_k} = \sum P e^{-\beta w_k}$; MBAR does the same without binning.
- Choose spacing and spring constant so that each window's width matches the spacing; check overlap, convergence and hidden orthogonal barriers.
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

</div>
