---
title: "Analysing trajectories"
description: "Turning a trajectory into numbers you can trust: ensemble averages, equilibration, correlated errors and block averaging, radial distribution functions, diffusion coefficients and a first look at free energies."
hook: "A 10 ns run saved every picosecond holds 10,000 frames but perhaps only 100 independent samples. Treat them all as independent and your error bar shrinks tenfold, without the answer becoming any more accurate."
objectives:
  - "Estimate the integrated autocorrelation time and effective sample size of a time series"
  - "Compute honest error bars by block averaging and spot runs too short to trust"
  - "Remove equilibration bias by discarding the initial transient of a trajectory"
  - "Compute radial distribution functions and coordination numbers from particle positions"
  - "Extract diffusion coefficients from mean-squared displacements, with finite-size corrections"
cover: "cover.svg"
milestones:
  - year: 1951
    text: "Kirkwood and Buff connect integrals of g(r) to solution thermodynamics"
  - year: 1989
    text: "Flyvbjerg and Petersen publish block averaging for errors of correlated data"
  - year: 2008
    text: "Shirts and Chodera introduce MBAR for combining samples from many states"
  - year: 2016
    text: "Chodera automates equilibration detection by maximising the effective sample size"
track: analysis
weight: 1
level: Core
minutes: 50
lab: "Estimate an honest error bar from a correlated signal"
prereqs: ["molecular-dynamics"]
---

## Averages, and why the error bar is the hard part

Statistical mechanics says an equilibrium property is an ensemble average, $\langle A\rangle = \int A(\mathbf x)\,p(\mathbf x)\,\mathrm d\mathbf x$, over all microstates $\mathbf x$ weighted by their Boltzmann probability. A simulation replaces this with a time average over $N$ saved frames,

$$
\bar A = \frac1N\sum_{t=1}^{N} A(\mathbf x_t),
$$

which converges to $\langle A\rangle$ if the trajectory is long enough to visit the relevant states (ergodicity). Computing $\bar A$ is trivial. Knowing **how wrong it is** is not, because successive frames are correlated: a frame saved 10 fs after the last one is nearly the same configuration. Treating $N$ correlated frames as independent gives an error bar that is too small, sometimes by an order of magnitude.

Two different things can go wrong, and they need different tools. **Statistical error** comes from the finite number of independent samples; it shrinks as the run gets longer, and the rest of this chapter shows how to estimate it. **Systematic error** does not shrink with run length: an unconverged starting structure, a force field that is wrong for the property, a box that is too small, a thermostat that distorts the ensemble ([thermostats and barostats](../thermostats-and-barostats/)), or a state that the trajectory never visits. An error bar computed from the trajectory says nothing about the second kind.

### What a time average cannot see

The time average converges to the ensemble average only if the trajectory visits all relevant states in proportion to their Boltzmann weight. The rate of crossing a barrier of height $\Delta F$ scales as $e^{-\Delta F/k_BT}$ ([rates and barriers](../es-rates/)), so each additional 2.3 $k_BT$ of barrier makes transitions ten times rarer. A ligand that switches between two binding poses every few microseconds will be seen in one pose throughout a 100 ns run. The average of any property over that run can have a small, well-converged statistical error and still be wrong, because it describes one pose rather than the mixture.

{{< note type="warn" title="Myth" >}}
**Myth:** a clean plateau in the block-averaging plot shows that the simulation has converged. **Reality:** it shows that the fluctuations the trajectory actually visited have been averaged correctly. States separated by barriers that were never crossed are invisible to every error estimate computed from a single trajectory. The practical defences are independent replicas started from different structures (different poses, conformations, or crystal and melt), checking that they agree within their error bars, and [enhanced sampling](../es-replica-exchange/) when they do not.
{{< /note >}}

## Correlation time and effective sample size

The **autocorrelation function** of the fluctuations $\delta A_t = A_t - \bar A$ measures how long the signal remembers itself:

$$
C(k) = \frac{\langle \delta A_t\,\delta A_{t+k}\rangle}{\langle \delta A^2\rangle}, \qquad C(0) = 1 .
$$

For a correlated series of variance $\sigma^2$, the variance of the mean is

$$
\operatorname{Var}(\bar A) = \frac{\sigma^2}{N}\,2\tau_{\text{int}}, \qquad \tau_{\text{int}} = \frac12 + \sum_{k=1}^{\infty} C(k),
$$

with the **integrated autocorrelation time** $\tau_{\text{int}}$ in units of the sampling interval ($\tau_{\text{int}} = \tfrac12$ for independent samples). Equivalently, the data contain only

$$
N_{\text{eff}} = \frac{N}{2\tau_{\text{int}}}
$$

independent samples. Saving frames more often does not help once the interval is shorter than the correlation time; it only adds disk space.

{{< note type="math" title="Where the factor 2τ_int comes from" >}}
Write the variance of the mean as a double sum over covariances, $\operatorname{Var}(\bar A) = \frac{1}{N^2}\sum_{t,s}\operatorname{Cov}(A_t, A_s)$. For a stationary series the covariance depends only on the lag $k = |t - s|$, and there are $N - k$ pairs at each lag, so
$$ \operatorname{Var}(\bar A) = \frac{\sigma^2}{N}\Big[1 + 2\sum_{k=1}^{N-1}\Big(1 - \frac kN\Big)C(k)\Big] \;\approx\; \frac{\sigma^2}{N}\,2\tau_{\text{int}} $$
when $N$ is much longer than the correlation time. For the exponential memory $C(k) = \varphi^k$ of a first-order autoregressive process, the geometric series sums to $\tau_{\text{int}} = (1 + \varphi)/[2(1 - \varphi)]$; with $\varphi = e^{-1/50}$ this is 50.0 frames, and $2\tau_{\text{int}} = 100$.
{{< /note >}}

{{< fig src="neff.svg" alt="A noisy blue time series of 2,000 frames with 20 orange dots placed every 100 frames, and beside it an exponentially decaying autocorrelation function with the area under it shaded" caption="A series with $\tau_{\text{int}}$ = 50 frames. Its 2,000 frames carry the information of about 20 independent samples, one per $2\tau_{\text{int}}$ (orange). The integrated autocorrelation time is the area under $C(k)$, counting $C(0)$ with weight one half." >}}

{{< note type="try" title="Pause and predict" >}}
A colleague reruns your 10 ns simulation and saves a frame every 10 fs instead of every 1 ps, 100 times more data. The observable has $\tau_{\text{int}}$ = 50 ps. By how much does the error bar of its mean shrink? Decide before reading on.

Hardly at all. The number of independent samples is set by the run length divided by $2\tau_{\text{int}}$, about 100 in both cases. Frames 10 fs apart are almost identical, so they add disk space and analysis time but not information. What shrinks the error is a longer run, or more independent runs.
{{< /note >}}

### Typical correlation times, and estimating them

Different observables of the same trajectory decorrelate on very different time scales. The total potential energy of a box of liquid water forgets its value within a picosecond or so; the volume of the box under a barostat with a coupling time of 2 ps takes tens of picoseconds; the radius of gyration of a polymer chain, a protein's side-chain rotamers, or the pose of a bound ligand can take nanoseconds to microseconds. The error bar must be estimated separately for every quantity reported, and the slowest one sets the length of the run.

Estimating $\tau_{\text{int}}$ by summing the measured $C(k)$ is unstable, because at long lags $C(k)$ is mostly noise and the sum of noise grows without bound. Practical estimators truncate the sum. Alan Sokal's self-consistent window stops at the smallest lag $W$ with $W \ge c\,\tau_{\text{int}}(W)$, with $c$ around 5; `pymbar` stops at the first lag where the estimated $C(k)$ falls below zero. Both underestimate $\tau_{\text{int}}$ slightly when the run is only a few hundred correlation times long, which is one reason to cross-check with block averaging.

{{< note type="practice" title="Back of the envelope" >}}
How long must you run to know the density of a water model to 0.1 %? In a 3 nm box (about 900 molecules) at 300 K the volume fluctuates by $\sigma_V/V = \sqrt{k_BT\kappa_T/V} \approx 0.8$ %, with $\kappa_T = 4.5\times10^{-10}$ Pa⁻¹. Reaching a standard error of 0.1 % needs $(0.8/0.1)^2 \approx 64$ independent samples. If the volume's integrated autocorrelation time under the barostat is 20 ps, each sample costs $2\tau_{\text{int}}$ = 40 ps, so the production run must be at least 2.6 ns, before any equilibration is discarded. A tenfold smaller error needs a hundredfold longer run.
{{< /note >}}

## Block averaging

Summing $C(k)$ directly is noisy at long lags. The **block-averaging** method of Flyvbjerg and Petersen (1989) avoids it. Divide the series into $M$ blocks of length $b$, average within each block, and treat the block means as samples:

$$
\sigma_{\bar A}(b) = \sqrt{\frac{1}{M(M-1)}\sum_{j=1}^{M}\big(\bar A_j - \bar A\big)^2}.
$$

For $b = 1$ this is the naive standard error. As $b$ grows beyond the correlation time, the block means become independent and $\sigma_{\bar A}(b)$ rises to a **plateau**, the honest error. If no plateau appears before the number of blocks becomes small, the simulation is too short to estimate its own error.

{{< widget name="blockavg" title="Block averaging a correlated MD observable" caption="Top: a synthetic observable with a tunable correlation time; the orange line is the mean of the retained part. Left: block-averaged error against block size, compared with the exact answer (dashed). Right: the autocorrelation function. Increase τ and watch the gap between naive and honest errors grow; turn on the far-from-equilibrium start and discard the transient." >}}

Use the lab to see three lessons.

1. **The naive error is wrong by $\sqrt{2\tau_{\text{int}}}$.** At $\tau = 40$ steps it is about 9 times too small; the block-averaged plateau matches the exact value.
2. **The plateau needs many correlation times.** At $\tau = 400$ steps there are only about 10 independent samples in 8192 steps, the plateau is noisy and the error itself is uncertain.
3. **Equilibration bias is not a statistical error.** With the far-from-equilibrium start, the mean is biased however carefully you compute its error bar. Discarding the first stretch removes the bias. Chodera's (2016) method chooses the cut-off automatically by maximising the number of effectively independent samples that remain.

### Detecting equilibration automatically

Chodera's method turns the choice of cut-off into an optimisation. For each candidate start $t_0$, compute the statistical inefficiency $g(t_0) = 2\tau_{\text{int}}$ of the data after $t_0$ and the number of effectively independent samples that remain,

$$
N_{\text{eff}}(t_0) = \frac{N - t_0}{g(t_0)} ,
$$

and choose the $t_0$ that maximises it. The logic is a bias–variance trade-off. Keeping the transient makes the series look more strongly correlated, because a slow drift inflates $g$; discarding far too much throws data away. The maximum sits where the transient has decayed enough that its remaining bias is small compared with the statistical error.

{{< fig src="equilibration.svg" alt="Top: a time series starting near 2.5 and decaying onto a mean of 1, with the first 650 steps shaded as discarded. Bottom: the effective number of independent samples against the number of discarded steps, rising steeply to a maximum of 225 at 650 steps and then falling slowly" caption="A series with a correlation time of 20 steps and an initial transient that decays over 300 steps. Keeping every frame gives a mean of 1.060 and only 26 effective samples. Discarding the first 650 steps, where $N_{\text{eff}}$ peaks at 225, gives 1.003 against the true value 1.000." >}}

The method needs no threshold and no visual judgement, so it can be applied consistently to hundreds of time series, such as the energies of every window of an [umbrella-sampling](../es-umbrella/) calculation. It is implemented as `detect_equilibration` in `pymbar` and in my tool [Converge](../../converge/). It assumes that the end of the series is equilibrated; if the observable is still drifting at the end of the run, no choice of $t_0$ helps.

{{< note type="practice" title="From the lab" >}}
For a protein–ligand complex, a common protocol is three to five independent replicas of 100 ns to 1 µs, each started from the same structure with new random velocities, or from different docked poses. Each replica gets its own equilibration cut-off and block-averaged error; the replicas are then compared. If their means differ by more than their combined error bars, a slow degree of freedom (a loop, a water molecule trapped in the pocket, a side-chain flip) has not been sampled, and the honest error bar is the spread between replicas, not the within-run estimate. Reports in the literature that quote the standard error of a single trajectory, computed from all frames as if they were independent, can understate the uncertainty by a factor of ten or more.
{{< /note >}}

The same calculation in NumPy, on a series with $\tau = 50$:

```python
import numpy as np

def block_average(x, min_blocks=8):
    """Standard error of the mean of a correlated series, for block sizes 1, 2, 4, ..."""
    x = np.asarray(x, float)
    out = []
    b = 1
    while len(x) // b >= min_blocks:
        m = len(x) // b
        means = x[: m * b].reshape(m, b).mean(axis=1)
        out.append((b, means.std(ddof=1) / np.sqrt(m)))
        b *= 2
    return out

# a correlated test series: AR(1) with correlation time tau = 50 steps
rng = np.random.default_rng(0)
tau, n = 50, 2 ** 15
phi = np.exp(-1 / tau)
x = np.empty(n); x[0] = rng.normal()
for i in range(1, n):
    x[i] = phi * x[i - 1] + np.sqrt(1 - phi ** 2) * rng.normal()

for b, se in block_average(x):
    print(f"block {b:5d}: SE = {se:.4f}")
tau_int = (1 + phi) / (2 * (1 - phi))
print(f"naive SE {x.std(ddof=1) / np.sqrt(n):.4f}, exact SE {np.sqrt(2 * tau_int / n):.4f}")
```

The block error climbs from 0.0056 (naive) to a plateau of about 0.053 at block sizes of 512–1024 steps, against an exact value of 0.055, then becomes noisy as the number of blocks falls. My browser tool [Converge](../../converge/) does this analysis, together with equilibration detection, for any GROMACS `.xvg` file.

## Structure: the radial distribution function

The **radial distribution function** $g(r)$ is the density of particles at distance $r$ from a reference particle, relative to the bulk density $\rho$:

$$
g(r) = \frac{1}{\rho N}\left\langle \sum_{i}\sum_{j\ne i}\delta\big(r - r_{ij}\big)\right\rangle \frac{1}{4\pi r^2}
\quad\text{(3D)} .
$$

In practice: histogram all pair distances (minimum image) in shells of width $\Delta r$, divide each bin by the number expected for an ideal gas at the same density, $\rho\,N\,4\pi r^2\Delta r$, and average over frames. $g(r) \to 1$ at large $r$ in a fluid. Its first peak marks the nearest-neighbour shell, and integrating to the first minimum $r_1$ gives the **coordination number**

$$
n_1 = 4\pi\rho\int_0^{r_1} g(r)\,r^2\,\mathrm dr .
$$

$g(r)$ is measurable: its Fourier transform is the structure factor $S(q)$ from X-ray or neutron scattering, which makes it a direct test of a force field against experiment. Integrals of $g(r) - 1$ over all space, the **Kirkwood–Buff integrals**

$$
G_{ij} = 4\pi\int_0^{\infty}\big[g_{ij}(r) - 1\big]r^2\,\mathrm dr,
$$

connect structure to thermodynamics: preferential solvation, activity coefficients and partial molar volumes. They converge slowly and need finite-size corrections in a closed simulation box; my tool [KBkit](../../kbkit/) implements them. The g(r) view of the [MD lab](../molecular-dynamics/) builds the 2D version live.

### A worked example: liquid argon

The figure computes $g(r)$ for liquid argon at 94 K and 1.374 g/cm³, the state simulated by Aneesur Rahman in 1964, with the Lennard-Jones parameters $\sigma$ = 0.34 nm and $\varepsilon/k_B$ = 120 K, 108 atoms and 300 frames. The number density is $\rho = 20.7$ nm⁻³. In a shell of width 0.01 nm at the first peak, an ideal gas at this density would place $4\pi r^2\Delta r\,\rho = 0.34$ atoms; the liquid places 2.9 times as many.

{{< fig src="rdf.svg" alt="Left: a thin slice of liquid argon around one orange reference atom, with a highlighted thin shell and a dashed circle at the first minimum enclosing the nearest neighbours. Right: g(r) rising from zero at 0.32 nm to a sharp first peak of 2.9 at 0.364 nm, dipping to a minimum at 0.52 nm and rising to a second peak near 0.7 nm" caption="Left: counting neighbours in a shell around one atom (a slice 0.34 nm thick). Right: $g(r)$ of liquid argon at 94 K. No atom comes closer than about 0.32 nm; the first shell peaks at 0.364 nm, and integrating to the first minimum at 0.52 nm gives $n_1$ = 12.2 nearest neighbours." >}}

Twelve neighbours is the coordination of a close-packed solid, and simple liquids near their triple point keep most of it: the liquid is a slightly expanded, disordered close packing. Water is the opposite case. Its oxygen–oxygen $g(r)$ peaks at about 0.28 nm, and integrating to the first minimum near 0.33 nm gives about 4.5 neighbours, the signature of a tetrahedral hydrogen-bond network that is open rather than packed, which is also why ice floats. The [chapter on liquids](../liquids-and-structure/) develops these two pictures further.

Partial radial distribution functions between different species carry most of the chemistry. In lithium-ion battery electrolytes, the Li–O $g(r)$ between lithium and the carbonyl oxygens of the solvent, integrated to its first minimum, gives the solvation number of the lithium ion, about four in ethylene-carbonate-based electrolytes, and the Li–anion coordination number measures ion pairing. In aqueous protein simulations the protein–water $g(r)$ around specific groups identifies the hydration shell. The same normalisation applies, with $\rho$ replaced by the number density of the second species.

The comparison with experiment goes through the static structure factor,

$$
S(q) = 1 + 4\pi\rho\int_0^\infty \big[g(r) - 1\big]\,r^2\,\frac{\sin qr}{qr}\,\mathrm dr ,
$$

which X-ray and neutron diffraction measure directly. Because the transform runs over all $r$, truncating $g(r)$ at half the box length produces ripples at small $q$; in practice one either computes $S(q)$ directly from the particle positions on the reciprocal lattice of the box or applies a window function to $g(r)$ before transforming. For water and aqueous solutions, neutron diffraction with hydrogen–deuterium substitution separates the O–O, O–H and H–H partial structure factors, which makes it one of the most demanding tests of a water model. The choice of bin width is a small but real trade-off: bins of 0.002 to 0.01 nm resolve the first peak of a molecular liquid, but narrower bins hold fewer counts and need more frames for the same noise.

{{< note type="warn" >}}
Three normalisation errors are common in home-made $g(r)$ code. Using the number density of all atoms when computing a partial $g_{AB}(r)$ gives a curve that tends to the mole fraction instead of 1. Histogramming beyond half the box length counts pairs from incomplete shells and makes $g(r)$ fall at large $r$. And counting each pair once while normalising per atom halves the curve. Testing the code on an ideal gas (uniform random points), which must give $g(r) = 1$ within noise at every distance, catches all three.
{{< /note >}}

## Dynamics: diffusion

The **mean-squared displacement** of a particle grows linearly at long times in a fluid, and its slope gives the self-diffusion coefficient through the **Einstein relation**,

$$
\text{MSD}(t) = \big\langle\lvert\mathbf r(t_0 + t) - \mathbf r(t_0)\rvert^2\big\rangle \;\xrightarrow{t\to\infty}\; 2dDt ,
$$

with $d$ the dimension (6Dt in 3D). Two practical rules: use **unwrapped** coordinates (not folded back into the box), and fit only the linear regime, after the short-time ballistic region. The equivalent **Green–Kubo** formula integrates the velocity autocorrelation function, $D = \frac1d\int_0^\infty\langle\mathbf v(0)\cdot\mathbf v(t)\rangle\,\mathrm dt$; similar formulas give viscosity and conductivity from stress and current correlations. Diffusion coefficients in periodic boxes are systematically too small because of hydrodynamic self-interaction with the periodic images; Yeh and Hummer's correction adds $k_BT\xi/(6\pi\eta L)$ with $\xi \approx 2.837$ for a cubic box of side $L$.

```python
import numpy as np

def msd(pos, max_lag):
    """Mean-squared displacement from unwrapped positions of shape (frames, atoms, 3)."""
    return np.array([np.mean(np.sum((pos[lag:] - pos[:-lag]) ** 2, axis=-1)) if lag else 0.0
                     for lag in range(max_lag)])

# test on Brownian particles with a known diffusion coefficient
rng = np.random.default_rng(1)
D, dt, frames, atoms = 0.5, 0.01, 4000, 200           # nm^2/ns, ns
steps = rng.normal(scale=np.sqrt(2 * D * dt), size=(frames, atoms, 3))
pos = np.cumsum(steps, axis=0)
lags = np.arange(400)
m = msd(pos, 400)
slope = np.polyfit(lags[50:] * dt, m[50:], 1)[0]       # fit the linear regime
print(f"D from MSD = {slope / 6:.3f} nm^2/ns (true {D})")
```

This recovers $D = 0.509$ against a true value of 0.5. Testing analysis code on synthetic data with a known answer, as here, is good practice before trusting it on a real trajectory.

The unwrapping rule deserves a closer look, because the error it causes does not crash anything; it produces a plausible but wrong number. When an atom leaves through one face of a periodic box, most trajectory files store it re-entering through the opposite face, so its stored coordinate jumps by a box length.

{{< fig src="unwrap.svg" alt="Left: a path leaving a square periodic box through its right face, with the wrapped copy re-entering on the left. Right: two mean-squared displacement curves; the unwrapped one rises linearly to 30 square nanometres at 10 ns, the wrapped one levels off at 4.5 square nanometres" caption="Brownian particles with $D$ = 0.5 nm²/ns in a 3 nm periodic box. With unwrapped coordinates the MSD grows as $6Dt$; with wrapped coordinates it saturates at $L^2/2$ = 4.5 nm² after about a nanosecond, and a fit to its early part underestimates $D$." >}}

The plateau has a simple origin. Once a particle has had time to cross the box, its wrapped position is uniform and independent of where it started, and the mean squared difference of two independent uniform variables on $[0, L]$ is $L^2/6$ per dimension, $L^2/2$ in three. In GROMACS, `gmx trjconv -pbc nojump` produces unwrapped trajectories; MDAnalysis provides an on-the-fly unwrapping transformation. Under constant pressure the box size fluctuates, and naive unwrapping that multiplies box vectors by the number of crossings accumulates a small systematic error at long times; Sören von Bülow, Jakob Bullerjahn and Gerhard Hummer (2020) analysed this and recommended unwrapping schemes that use the box of each frame consistently. The physics of the MSD, the velocity autocorrelation and the corrections for box size are developed in the [chapter on transport coefficients](../transport-coefficients/).

## Free energies are not simple averages

Many quantities that matter most, such as binding free energies, solubilities, the free-energy profile of a molecule crossing a membrane or adsorbing on a surface, are not averages of any instantaneous observable. A free-energy difference involves the ratio of partition functions, and states separated by high barriers are rarely visited in a plain simulation. **Umbrella sampling** adds harmonic bias potentials (windows) along a reaction coordinate so that every region is sampled, and the **weighted histogram analysis method** (WHAM) or **MBAR** recombines the biased windows into an unbiased potential of mean force. Window placement and overlap decide whether the result can be trusted; my tool [WindowWise](../../windowwise/) plans and checks them. These methods produced the roughly 470,000 free-energy profiles used to train the adhesion model described on the [research page](../../research/).

The error analysis of this chapter carries over with one change: each window is its own correlated time series, so its equilibration cut-off and statistical inefficiency must be determined separately before the windows are combined. MBAR then propagates the per-window uncertainties into the free-energy profile, provided it is given uncorrelated samples, typically obtained by keeping one frame per $g$ frames. Alchemical free-energy calculations ([free-energy perturbation and thermodynamic integration](../es-fep-ti/)) follow the same pattern, with the windows placed along a coupling parameter instead of a spatial coordinate.

{{< note type="practice" title="Tools" >}}
- **GROMACS** built-ins: `gmx energy` (thermodynamic time series), `gmx rdf`, `gmx msd`, `gmx analyze -ee` (block-averaging error estimates), `gmx wham`.
- **Python**: MDAnalysis and MDTraj read every common trajectory format and provide RDF, MSD, hydrogen-bond and contact analyses; `pymbar` implements MBAR and automated equilibration detection.
- Report every simulated number with an uncertainty, state how it was estimated (block averaging, independent replicas), and say how much of each trajectory was discarded as equilibration.
{{< /note >}}

{{< note type="key" >}}
- A simulated average needs an error bar, and correlated frames make the naive error too small by $\sqrt{2\tau_{\text{int}}}$; only $N/2\tau_{\text{int}}$ samples are independent.
- Block averaging gives the honest error at its plateau; no plateau means the run is too short to estimate its own error.
- Discard the equilibration transient, ideally by maximising $N_{\text{eff}}(t_0)$; check unvisited states with independent replicas.
- $g(r)$ is normalised by the ideal-gas count; integrating to its first minimum gives the coordination number (12 for liquid argon, about 4.5 for water).
- MSDs need unwrapped coordinates; wrapped ones saturate at $L^2/2$.
{{< /note >}}

{{< quiz >}}
- q: "You save a frame every 1 ps from a 10 ns run, and the observable's integrated autocorrelation time is 50 ps. About how many independent samples do you have?"
  options: ["10,000", "About 100", "About 200"]
  answer: 1
  why: "$N_{\\text{eff}} = N/(2\\tau_{\\text{int}}) = 10{,}000/(2 \\times 50) = 100$. The naive error bar would be $\\sqrt{100}$ = 10 times too small."
- q: "In a block-averaging plot the error keeps rising with block size and never reaches a plateau. What should you conclude?"
  options: ["The error is the value at the largest block size", "The simulation is too short compared with the correlation time; the error cannot be estimated reliably and the run should be extended", "Block averaging does not work for MD data"]
  answer: 1
  why: "A plateau appears only once blocks are much longer than the correlation time while there are still enough blocks. Without one, even the error bar is unreliable."
- q: "Why must mean-squared displacements be computed from unwrapped coordinates?"
  options: ["Wrapped coordinates use different units", "Folding atoms back into the periodic box creates artificial jumps of one box length, which corrupt displacements", "Unwrapped coordinates are more precise"]
  answer: 1
  why: "When an atom crosses a box face its wrapped coordinate jumps by L. Displacements must follow the continuous, unwrapped path."
- q: "What does the first minimum of $g(r)$ commonly define?"
  options: ["The cut-off for the Lennard-Jones potential", "The outer edge of the first coordination shell, used to count nearest neighbours", "The box length"]
  answer: 1
  why: "Integrating $4\\pi\\rho g(r) r^2$ up to the first minimum gives the coordination number, the average number of nearest neighbours."
- q: "Keeping all frames of a run that starts far from equilibrium gives $N_{\\text{eff}}$ = 26; discarding the first 650 steps gives $N_{\\text{eff}}$ = 225. Why can throwing data away increase the number of effective samples?"
  options: ["It cannot; this is a numerical error", "The decaying transient looks like a very slow correlation and inflates the statistical inefficiency; removing it lowers g far more than it shortens the series", "Discarding data always increases the effective sample size"]
  answer: 1
  why: "A drift is indistinguishable from long-lived correlation, so it inflates $g = 2\\tau_{\\text{int}}$. Beyond the optimum, discarding more only shortens the series."
- q: "Your liquid's $g(r)$ drifts steadily down towards 0.5 at large $r$. The most likely bug is…"
  options: ["The force field", "The normalisation: for example, the total density was used for a partial g(r), or pairs beyond half the box length were counted", "Too few frames"]
  answer: 1
  why: "A correctly normalised $g(r)$ tends to 1 at large $r$ in a fluid. Testing the code on uniform random points, which must give 1 everywhere, exposes such errors."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. A. Grossfield, P. N. Patrone, D. R. Roe, A. J. Schultz, D. W. Siderius and D. M. Zuckerman, “Best practices for quantification of uncertainty and sampling quality in molecular simulations,” *Living Journal of Computational Molecular Science* **1**, 5067 (2018).
2. H. Flyvbjerg and H. G. Petersen, “Error estimates on averages of correlated data,” *Journal of Chemical Physics* **91**, 461–466 (1989).
3. J. D. Chodera, “A simple method for automated equilibration detection in molecular simulations,” *Journal of Chemical Theory and Computation* **12**, 1799–1805 (2016).
4. M. P. Allen and D. J. Tildesley, *Computer Simulation of Liquids*, 2nd ed., Oxford University Press (2017), chapters 2 (statistical mechanics), 8 (how to analyse the results).
5. J. G. Kirkwood and F. P. Buff, “The statistical mechanical theory of solutions. I,” *Journal of Chemical Physics* **19**, 774–777 (1951).
6. I.-C. Yeh and G. Hummer, “System-size dependence of diffusion coefficients and viscosities from molecular dynamics simulations with periodic boundary conditions,” *Journal of Physical Chemistry B* **108**, 15873–15879 (2004).
7. G. M. Torrie and J. P. Valleau, “Nonphysical sampling distributions in Monte Carlo free-energy estimation: umbrella sampling,” *Journal of Computational Physics* **23**, 187–199 (1977).
8. S. Kumar, J. M. Rosenberg, D. Bouzida, R. H. Swendsen and P. A. Kollman, “The weighted histogram analysis method for free-energy calculations on biomolecules. I. The method,” *Journal of Computational Chemistry* **13**, 1011–1021 (1992).
9. M. R. Shirts and J. D. Chodera, “Statistically optimal analysis of samples from multiple equilibrium states,” *Journal of Chemical Physics* **129**, 124105 (2008).
10. N. Michaud-Agrawal, E. J. Denning, T. B. Woolf and O. Beckstein, “MDAnalysis: a toolkit for the analysis of molecular dynamics simulations,” *Journal of Computational Chemistry* **32**, 2319–2327 (2011).
11. R. T. McGibbon et al., “MDTraj: a modern open library for the analysis of molecular dynamics trajectories,” *Biophysical Journal* **109**, 1528–1532 (2015).
12. S. von Bülow, J. T. Bullerjahn and G. Hummer, “Systematic errors in diffusion coefficients from long-time molecular dynamics simulations at constant pressure,” *Journal of Chemical Physics* **153**, 021101 (2020).

</div>
