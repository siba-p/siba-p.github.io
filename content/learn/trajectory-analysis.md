---
title: "Analysing trajectories"
description: "Turning a trajectory into numbers you can trust: ensemble averages, equilibration, correlated errors and block averaging, radial distribution functions, diffusion coefficients and a first look at free energies."
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

## Free energies are not simple averages

Many quantities that matter most, such as binding free energies, solubilities, the free-energy profile of a molecule crossing a membrane or adsorbing on a surface, are not averages of any instantaneous observable. A free-energy difference involves the ratio of partition functions, and states separated by high barriers are rarely visited in a plain simulation. **Umbrella sampling** adds harmonic bias potentials (windows) along a reaction coordinate so that every region is sampled, and the **weighted histogram analysis method** (WHAM) or **MBAR** recombines the biased windows into an unbiased potential of mean force. Window placement and overlap decide whether the result can be trusted; my tool [WindowWise](../../windowwise/) plans and checks them. These methods produced the roughly 470,000 free-energy profiles used to train the adhesion model described on the [research page](../../research/).

{{< note type="practice" title="Tools" >}}
- **GROMACS** built-ins: `gmx energy` (thermodynamic time series), `gmx rdf`, `gmx msd`, `gmx analyze -ee` (block-averaging error estimates), `gmx wham`.
- **Python**: MDAnalysis and MDTraj read every common trajectory format and provide RDF, MSD, hydrogen-bond and contact analyses; `pymbar` implements MBAR and automated equilibration detection.
- Report every simulated number with an uncertainty, state how it was estimated (block averaging, independent replicas), and say how much of each trajectory was discarded as equilibration.
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

</div>
