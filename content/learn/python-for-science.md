---
title: "Scientific data"
description: "The everyday work of computational science in Python: reading and writing text and binary files, parsing simulation output, loading tables with NumPy and pandas, fitting linear and nonlinear models with uncertainties, making publication-quality figures with Matplotlib, and organising an analysis so that it can be reproduced."
hook: "A fitted activation energy with a tiny error bar can still be wrong. Reading the files, fitting the model, plotting the residuals and keeping the whole chain reproducible are what make a number from a simulation worth trusting."
objectives:
  - "Read and parse text files, tables and structure files with open, pathlib and np.loadtxt"
  - "Choose between text, .npy and HDF5 files, and between NumPy arrays and pandas tables"
  - "Fit linear and nonlinear models and report parameter uncertainties from the covariance matrix"
  - "Diagnose a wrong model or underestimated errors by plotting the residuals"
  - "Make clear Matplotlib figures and organise an analysis so that it can be rerun"
cover: "cover.svg"
milestones:
  - year: 1805
    text: "Adrien-Marie Legendre publishes the method of least squares"
  - year: 2001
    text: "Eric Jones, Travis Oliphant and Pearu Peterson release SciPy"
  - year: 2003
    text: "John Hunter releases Matplotlib, first written to plot patients' brain recordings"
  - year: 2008
    text: "Wes McKinney begins writing pandas at AQR Capital Management"
track: pysci
weight: 2
level: Core
prereqs: ["numpy-arrays"]
lab: "Parse simulation output, fit models with error bars, and draw real Matplotlib figures in the page"
---

## From raw output to a result

A typical computational study produces files: trajectories, energy logs, structure files, tables of computed properties. Turning those files into a number with an error bar, or a figure in a paper, follows the same sequence almost every time. The files are **read and parsed** into arrays; the arrays are **cleaned and checked**; a quantity is **computed or fitted**; its **uncertainty** is estimated; and the result is **plotted** and written out. Each step is easy on its own. Doing all of them correctly, in a way that can be rerun next month on new data and give the same answer for the same input, is the real skill, and Python's scientific libraries make it straightforward. This chapter goes through the steps in order.

{{< fig src="pipeline.svg" alt="Six coloured boxes in a row, read, check, compute, error bar, plot and record, each with the Python tools used at that step, and a feedback arrow from plot back to check" caption="The analysis chain of this chapter and the tools used at each step. The feedback arrow is the important part: structured residuals or outliers in the plot send you back to check the data, not forward to the paper." >}}

## Files and paths

A file is opened with the built-in `open`, which returns a file object. The safest way to use it is inside a `with` block, which closes the file automatically when the block ends, even if an error occurs inside it:

```python
with open("energy.dat") as f:            # mode "r" (read, text) is the default
    for line in f:                       # a file is an iterator over its lines
        if line.startswith("#"):
            continue
        t, e = map(float, line.split())
```

The second argument of `open` selects the **mode**: `"r"` to read, `"w"` to write (erasing any existing file), `"a"` to append, and a `"b"` suffix for binary files, which return bytes instead of text. Text files are decoded with an **encoding**, almost always UTF-8; specifying `encoding="utf-8"` avoids surprises on systems with other defaults. Iterating over the file object reads one line at a time, so even a file of many gigabytes can be processed with constant memory, as the trajectory generator of [the chapter on control flow](../python-control-flow/) did.

Paths are best handled with `pathlib.Path`, which joins directory names portably, finds files by pattern and reads small files in one call:

```python
from pathlib import Path
runs = Path("simulations")
for log in sorted(runs.glob("T*/md.log")):      # every md.log in T300/, T310/, ...
    temperature = int(log.parent.name[1:])
    text = log.read_text()
```

Many structure formats are simple enough to parse by hand. An XYZ file contains the number of atoms, a comment line, and one line per atom with its element and coordinates:

{{< py title="parsing an XYZ structure" >}}
import numpy as np
xyz = """3
water
O 0.000 0.000 0.000
H 0.757 0.586 0.000
H -0.757 0.586 0.000
"""
lines = xyz.splitlines()
n = int(lines[0])
symbols = [l.split()[0] for l in lines[2:2 + n]]
coords = np.array([[float(v) for v in l.split()[1:4]] for l in lines[2:2 + n]])

v1, v2 = coords[1] - coords[0], coords[2] - coords[0]
r = np.linalg.norm(v1)
angle = np.degrees(np.arccos(v1 @ v2 / (np.linalg.norm(v1) * np.linalg.norm(v2))))
print(symbols, f"O–H = {r:.4f} Å, H–O–H = {angle:.1f}°")
{{< /py >}}

For anything more complicated, use a library that already handles the format's corner cases: ASE reads and writes dozens of structure formats (`ase.io.read("POSCAR")`), and MDAnalysis and MDTraj read trajectories from all the common simulation engines.

{{< note type="practice" title="Back of the envelope" >}}
A 100 000-atom simulation saved every picosecond for 10 ns produces 10 000 frames. Written as text, one atom per line with three coordinates in `%12.6f` format, each frame takes about 4 MB and the run 40 GB. As raw float32 the same data take 1.2 MB per frame, 12 GB in total, and GROMACS's XTC format, which stores coordinates as integers at a precision of 0.001 nm and compresses them, is smaller still. Reading speed differs even more than size: on a laptop, `np.loadtxt` parses a 39 MB text file of $10^6 \times 3$ coordinates in about 0.44 s, while `np.load` reads the 24 MB `.npy` file of the same array in under 10 ms.
{{< /note >}}

{{< note type="warn" title="Myth" >}}
**Myth:** text files are the safe, lossless choice. **Reality:** they are only as precise as the format string that wrote them. A DFT total energy of −52 345.678912 eV written with `%.6g` comes back as −52 345.7: the formation and adsorption energies computed from such numbers need meV precision, nine or more significant digits, and the rounding error of 0.02 eV is larger than many of the differences being studied. `np.savetxt` defaults to `%.18e`, which round-trips exactly at 25 bytes per number; `np.save` stores the raw 8 bytes and needs no parsing.
{{< /note >}}

## Tables of numbers

Most numerical output is a table: columns of numbers separated by spaces or commas, with some header lines. `np.loadtxt` reads such a file directly into an array. GROMACS writes its `.xvg` files with header lines beginning with `#` and `@`; telling `loadtxt` to treat both as comments is all that is needed:

{{< py title="reading a GROMACS .xvg file" >}}
import io
import numpy as np
xvg = """# This file was created by gmx energy
@    title "GROMACS Energies"
@ s0 legend "Temperature"
   0.0   297.81
  10.0   299.42
  20.0   301.07
  30.0   298.55
  40.0   300.93
  50.0   299.12
"""
data = np.loadtxt(io.StringIO(xvg), comments=["#", "@"])   # pass a file name for a real file
t, T = data[:, 0], data[:, 1]
print("shape:", data.shape)
print(f"mean T = {T.mean():.2f} K, standard deviation {T.std(ddof=1):.2f} K")
{{< /py >}}

`np.genfromtxt` does the same but tolerates missing values, and `np.savetxt` writes an array back out with a header. For arrays that only Python will read, the binary formats are far better: `np.save("traj.npy", positions)` writes the exact bytes of the buffer with a small header recording the dtype and shape, so loading is instant and lossless, and `np.savez_compressed` stores several named arrays in one file. Large simulation data sets are usually kept in HDF5 (via `h5py`) or NetCDF, which add compression, partial reading and metadata.

When a table has named columns of mixed types, such as a list of materials with their structure type and computed properties, **pandas** is the right tool. Its `DataFrame` is a table whose columns are NumPy arrays, with labels and a large set of operations for selecting, grouping, joining and summarising:

{{< py title="a table of metals with pandas" >}}
import pandas as pd
df = pd.DataFrame({
    "metal": ["Cu", "Ag", "Au", "Pt", "Pd", "Ni"],
    "a_angstrom": [3.615, 4.086, 4.078, 3.924, 3.891, 3.524],   # fcc lattice constant
    "Ecoh_eV": [3.49, 2.95, 3.81, 5.84, 3.89, 4.44],           # cohesive energy per atom
})
print(df.describe().loc[["mean", "std"]].round(3))
print(df.sort_values("Ecoh_eV", ascending=False).head(3).to_string(index=False))
print("larger cells:", df[df.a_angstrom > 3.9]["metal"].tolist())
{{< /py >}}

`pd.read_csv` reads comma- or space-separated files with headers, guessing column types, and `df.to_csv` writes them. A good rule is to use NumPy for homogeneous numerical arrays, such as coordinates, trajectories and grids, and pandas for heterogeneous tables of records, such as the results of a high-throughput screening.

## Checking data before trusting it

Most errors in published simulation numbers are not in the physics but in the bookkeeping between the output file and the fit. Four checks catch the common ones, and each takes a line or two.

**Shapes and values.** Assert what you expect, `assert data.shape[1] == 2`, and check `np.isfinite(data).all()`: a single `nan` from a crashed step propagates into every mean computed afterwards.

**Units.** Codes disagree. GROMACS works in nm, ps and kJ/mol; LAMMPS in Å and kcal/mol with `units real` but Å and eV with `units metal`; VASP in Å and eV. The conversions worth remembering are 1 eV = 96.485 kJ/mol, 1 kcal = 4.184 kJ, and the thermal energy at 300 K, $k_BT = 2.494$ kJ/mol = 0.02585 eV. Converting once, at the point of reading, and naming variables with their units (`E_kJmol`, `r_nm`) prevents most mistakes. The most expensive unit error on record is NASA's Mars Climate Orbiter, lost in 1999 because one team's software reported thruster impulse in pound-force seconds while the navigation software expected newton-seconds.

**Restarts.** Long simulations crash and are restarted from checkpoints, and concatenated log files then contain overlapping stretches of time. A run that wrote frames up to 12 ps before crashing and restarted from its 10 ps checkpoint produces two versions of 10 to 12 ps. Averages over such a file double-count those frames, and a fit to it sees time running backwards. The cell below detects the overlap and keeps the frames of the restarted run.

{{< py title="cleaning a log after a restart" >}}
import numpy as np
# energy log of a run that crashed at 12 ps and was restarted from its 10 ps checkpoint
t1 = np.arange(0.0, 12.5, 0.5);  e1 = -4520.0 + 0.8 * np.cos(t1)
t2 = np.arange(10.0, 20.5, 0.5); e2 = -4520.0 + 0.8 * np.cos(t2) + 0.05
t, e = np.concatenate([t1, t2]), np.concatenate([e1, e2])   # what cat run1.log run2.log gives

back = np.nonzero(np.diff(t) <= 0)[0]
print("rows:", len(t), " time goes backwards after row", back, "at t =", t[back])

# keep the LAST occurrence of every time stamp, i.e. the restarted run
_, first_in_reversed = np.unique(t[::-1], return_index=True)
keep = len(t) - 1 - first_in_reversed                 # sorted by time
t, e = t[keep], e[keep]
print("rows kept:", len(t), " strictly increasing:", bool((np.diff(t) > 0).all()))
print("E(11 ps) =", round(e[t == 11.0][0], 3), "kJ/mol, from the restarted run")
print("all finite:", bool(np.isfinite(e).all()), " mean E =", round(e.mean(), 2), "kJ/mol =",
      round(e.mean() / 96.485, 3), "eV")
{{< /py >}}

The 46 rows of the concatenated file shrink to 41 unique frames, and the value at 11 ps comes from the second run. Reversing the array before `np.unique` is the whole trick: `return_index` gives the first occurrence, and in the reversed array the first occurrence is the newest.

**Equilibration.** A simulation started from an artificial structure, such as a lattice of water molecules or a freshly built polymer, drifts before it fluctuates around equilibrium, and that transient biases every average. Plot the raw time series before averaging and discard the drifting start. John Chodera's automated method (2016), implemented in pymbar, chooses the cut-off that maximises the number of effectively independent samples left, which removes the guesswork for large numbers of runs.
## Fitting models to data

Fitting determines the parameters of a model that best describe some data, and it is how most physical constants are extracted from simulations. The commonest method is **least squares**: choose parameters that minimise the sum of squared differences between the data and the model's predictions. [The chapter on probability](../probability/) explains why this is the right choice when errors are independent and Gaussian, and [learning from data](../learning-from-data/) develops it as the first machine-learning method.

For a model that is linear in its parameters, such as a straight line or a polynomial, least squares has an exact solution, and `np.polyfit` computes it together with the **covariance matrix** of the parameters, whose diagonal gives their variances. The Arrhenius law, $k = A e^{-E_a/RT}$, becomes a straight line when plotted as $\ln k$ against $1/T$, with slope $-E_a/R$:

{{< py title="an Arrhenius fit with uncertainty" >}}
import numpy as np
R = 8.314462618                                   # J/(mol K)
T = np.array([300., 310., 320., 330., 340., 350.])
k = np.array([1.2e-3, 2.4e-3, 4.6e-3, 8.5e-3, 1.5e-2, 2.6e-2])

(slope, intercept), cov = np.polyfit(1 / T, np.log(k), 1, cov=True)
Ea, dEa = -slope * R / 1000, np.sqrt(cov[0, 0]) * R / 1000
print(f"Ea = {Ea:.1f} ± {dEa:.1f} kJ/mol,  A = {np.exp(intercept):.2e} 1/s")
{{< /py >}}

For a model that is nonlinear in its parameters, such as an exponential decay with an offset, `scipy.optimize.curve_fit` minimises the squared residuals iteratively from an initial guess and again returns parameters and their covariance:

```python
from scipy.optimize import curve_fit

def model(t, a, tau, c):
    return a * np.exp(-t / tau) + c

params, cov = curve_fit(model, t, y, p0=[1.0, 1.0, 0.0])
errors = np.sqrt(np.diag(cov))
```

Three cautions apply to every fit. The reported uncertainties assume that the residuals are independent and that the model is correct; for correlated simulation data, such as consecutive points of a time series, they are too small, and block averaging or bootstrapping gives honest errors ([trajectory analysis](../trajectory-analysis/)). Nonlinear fits can converge to a wrong local minimum if the initial guess is poor, so start from physically sensible values. And **always plot the residuals**: a systematic pattern in the differences between data and fit is the clearest sign that the model is wrong, which no error bar will reveal.

{{< fig src="residuals.svg" alt="Three panels: a decaying correlation function with one- and two-exponential fits, residuals of the one-exponential fit forming a wave, and residuals of the two-exponential fit scattered randomly" caption="A correlation function with two decay times, 1 ps and 8 ps, plus noise of standard deviation 0.01. (a) A single exponential looks acceptable and gives $R^2 = 0.961$. (b) Its residuals form a systematic wave four times larger than the noise. (c) Two exponentials leave only noise and recover $\tau_1 = 1.00$ ps and $\tau_2 = 7.6$ ps." >}}

The figure shows the third caution on a concrete case. Correlation functions in molecular simulation, such as the orientational correlation of water dipoles or the stress autocorrelation used for viscosity, often decay with more than one time constant. A single exponential fitted to such data gives a smooth curve through the points, $R^2 = 0.961$ and a time constant of 3.0 ps that corresponds to no physical process. The residuals give it away: they are positive at intermediate times and negative at long times, a wave with an amplitude of about 0.04, four times the noise. With two exponentials, the residuals scatter randomly with a standard deviation of 0.0085, consistent with the 0.01 noise that was added, and the fitted time constants, 1.00 ± 0.05 ps and 7.6 ± 0.4 ps, recover the true values of 1 and 8 ps within their errors.

### What the error bar means

For a model that is linear in its parameters, the least-squares estimate and its uncertainty have closed forms. Write the model as $\mathbf y \approx X\boldsymbol\beta$, where each row of the design matrix $X$ holds the regressors of one data point, $(1/T_i, 1)$ for the Arrhenius fit. Then

$$ \hat{\boldsymbol\beta} = (X^\top X)^{-1} X^\top \mathbf y, \qquad \operatorname{cov}(\hat{\boldsymbol\beta}) = s^2 (X^\top X)^{-1}, \qquad s^2 = \frac{\sum_i r_i^2}{n - p}, $$

where $r_i$ are the residuals, $n$ the number of points and $p$ the number of parameters. The residual variance $s^2$ estimates the noise from the scatter of the data themselves; dividing by $n - p$ rather than $n$ accounts for the $p$ parameters fitted to the same data. `np.polyfit(..., cov=True)` returns exactly this matrix. For the six rate constants above, $s = 0.0031$ in $\ln k$, a 0.3 % scatter, and the standard error of $E_a$ is 0.064 kJ/mol; the cell prints 0.1 only because it rounds to one decimal. For a 95 % confidence interval with $n - p = 4$ degrees of freedom, multiply by Student's $t$ value of 2.78, not by 1.96: $E_a = 53.66 \pm 0.18$ kJ/mol.

The off-diagonal element of the covariance matrix matters as much as the diagonal. For this fit the correlation coefficient between $E_a$ and $\ln A$ is +0.9986. All the temperatures lie far from $1/T = 0$, where the intercept $\ln A$ is defined, so a small change in slope must be compensated by a large change in intercept, and the joint confidence region is a thin needle. Quoting $E_a$ and $A$ with independent error bars therefore misrepresents the result, and propagating them as independent into a rate at another temperature overestimates its error. Centring the regressor removes the problem: fitting $\ln k$ against $1/T - \overline{1/T}$ makes the intercept the rate at $\bar T = 324$ K, uncorrelated with the slope.

{{< fig src="ellipse.svg" alt="Left: a thin diagonal needle-shaped confidence ellipse for activation energy and ln A; right: an axis-aligned ellipse for activation energy and ln k at 324 K" caption="1σ and 2σ confidence ellipses of the Arrhenius fit of this section. (a) In the usual parameters, $E_a$ and $\ln A$ are almost perfectly correlated ($\rho = 0.9986$). (b) With $1/T$ centred at 324 K, the slope and the intercept, now $\ln k(324\,\text{K})$, are uncorrelated." >}}

The same covariance matrix gives the uncertainty of a prediction, $\sigma^2_{\ln k}(x) = \sigma^2_b + x^2\sigma^2_m + 2x\,\operatorname{cov}(m, b)$ at $x = 1/T$. It is smallest at the centre of the data, 0.0013 at 324 K, and grows on extrapolation: 0.0047 at 400 K and 0.0085 at 500 K. Krug, Hunter and Grieger showed in 1976 that this correlation alone can produce an apparent linear relation between fitted $\ln A$ and $E_a$ across a series of related reactions, the so-called compensation effect, even when no physical relation exists; a plot of fitted $\ln A$ against fitted $E_a$ from narrow temperature ranges should be read with that in mind.

## Plotting with Matplotlib

**Matplotlib** is the standard plotting library. Its object model has two main pieces: a **Figure**, the whole image, and one or more **Axes**, each a single plot with its own coordinate system. The recommended interface creates both explicitly and then calls methods on the axes:

```python
import matplotlib.pyplot as plt
fig, ax = plt.subplots(figsize=(4, 3))        # size in inches
ax.plot(x, y, "o", label="simulation")
ax.plot(x_fit, y_fit, "-", label="fit")
ax.set_xlabel("time (ps)")
ax.set_ylabel("energy (kJ/mol)")
ax.legend()
fig.savefig("energy.pdf", bbox_inches="tight")
```

{{< fig src="anatomy.svg" alt="A small plot of mean-squared displacement against lag time with its title, legend, line, markers, spine, axis labels and ticks labelled with the Matplotlib calls that create them" caption="The parts of a Matplotlib figure and the `Axes` methods that set them. Every element can be changed through the object returned by `plt.subplots`, which is why the explicit `fig, ax` interface scales from one panel to many." >}}

The figure below runs real Matplotlib in this page and shows the image it produces. Edit the code and run it again: change the colours, add a second panel with `plt.subplots(1, 2)`, or switch to logarithmic axes with `ax.set_yscale("log")`.

{{< widget name="pyfig" title="Matplotlib running in the page" caption="The code is executed by CPython with NumPy and Matplotlib (compiled to WebAssembly) and the resulting figure is displayed below it. The first run downloads the libraries." opts=`{"code":"import numpy as np\nimport matplotlib.pyplot as plt\n\nR = 8.314462618\nT = np.array([300., 310., 320., 330., 340., 350.])\nk = np.array([1.2e-3, 2.4e-3, 4.6e-3, 8.5e-3, 1.5e-2, 2.6e-2])\n(m, b) = np.polyfit(1 / T, np.log(k), 1)\nresid = np.log(k) - (m / T + b)\n\nfig, (ax, ax2) = plt.subplots(2, 1, figsize=(5, 4.6), sharex=True,\n                              gridspec_kw={'height_ratios': [3, 1]})\nax.plot(1000 / T, np.log(k), 'o', color='#4c6ef5', label='rate constants')\nx = np.linspace(1 / 355, 1 / 295, 50)\nax.plot(1000 * x, m * x + b, '-', color='#f08c2e', label=f'fit: Ea = {-m * R / 1000:.1f} kJ/mol')\nax.set_ylabel('ln k')\nax.legend(frameon=False)\nax2.axhline(0, color='0.6', lw=0.8)\nax2.plot(1000 / T, resid, 'o', color='#e64980')\nax2.set_xlabel('1000 / T  (1/K)')\nax2.set_ylabel('residual')\nfig.tight_layout()\n"}` >}}

A good scientific figure has labelled axes with units, symbols large enough to read when the figure is shrunk to one column of a journal page, a colour scheme that survives printing in greyscale and colour-blind readers (Matplotlib's default palette and the `viridis` colour map are designed for this), and no decoration that carries no information. Save figures for papers in a vector format, PDF or SVG, so that lines stay sharp at any size, and raster images (PNG) at 300 dpi or more for slides and web pages.

Size the figure for its destination rather than shrinking it afterwards. A single journal column is about 3.3 to 3.5 inches wide (89 mm for *Nature*, 3.25 inches for ACS journals), so `figsize=(3.4, 2.6)` with 8 to 9 pt fonts produces text that appears at its intended size in print; a figure drawn at 8 inches and scaled down ends up with 4 pt labels. Colour maps deserve the same care. The rainbow map `jet`, Matplotlib's default until 2017, varies non-uniformly in lightness, so it creates apparent boundaries in smooth data and hides real ones. Nathaniel Smith and Stéfan van der Walt designed `viridis` in 2015 to increase uniformly in perceived lightness and to remain readable for the roughly one man in twelve with red–green colour-vision deficiency; it became the default in Matplotlib 2.0. Use a sequential map such as `viridis` for quantities with a natural order, such as density or energy, and a diverging map such as `RdBu` for signed quantities around a meaningful zero, such as a charge-density difference.

## A complete small analysis

The steps combine into a complete analysis of a simulated system. Brownian particles take independent Gaussian steps; the [mean-squared displacement](../trajectory-analysis/) of a diffusing particle grows linearly in time, $\langle |\mathbf r(t) - \mathbf r(0)|^2\rangle = 6Dt$ in three dimensions, so a straight-line fit to it gives the diffusion coefficient $D$. Generating the trajectories, computing the MSD and fitting take a few lines of NumPy, and a known input value lets us check the whole pipeline:

{{< widget name="pyfig" title="Diffusion coefficient from a simulated trajectory" caption="Simulate 300 Brownian particles, compute their mean-squared displacement at many lag times, fit a straight line and compare with the true D. Change the number of particles or steps and run again to see how the statistical error of the estimate changes." opts=`{"code":"import numpy as np\nimport matplotlib.pyplot as plt\n\nrng = np.random.default_rng(42)\nD_true, dt, steps, n = 1.0, 0.01, 1000, 300\njumps = rng.normal(0.0, np.sqrt(2 * D_true * dt), size=(steps, n, 3))\nx = np.cumsum(jumps, axis=0)            # (steps, particles, 3)\n\nlags = np.arange(1, 100)\nmsd = np.array([np.mean(np.sum((x[l:] - x[:-l]) ** 2, axis=-1)) for l in lags])\nslope = np.polyfit(lags * dt, msd, 1)[0]\nprint(f'D from the fit = {slope / 6:.3f}   (true value {D_true})')\n\nfig, ax = plt.subplots(figsize=(5, 3.4))\nax.plot(lags * dt, msd, 'o', ms=3, color='#4c6ef5', label='simulation')\nax.plot(lags * dt, 6 * D_true * lags * dt, '-', color='#f08c2e', label='6 D t')\nax.set_xlabel('lag time t')\nax.set_ylabel('mean-squared displacement')\nax.legend(frameon=False)\nfig.tight_layout()\n"}` >}}

The estimate comes out within a couple of per cent of the true value of 1. Testing an analysis on synthetic data with a known answer in this way, before applying it to real simulation output, is the most effective guard against subtle mistakes in units, indexing or averaging.

## Organising an analysis

A few habits turn a collection of scripts into a reliable analysis. Keep each project in its own **environment** with the package versions recorded, so that it can be recreated. Explore in a Jupyter notebook if you like, but move code that works into functions in `.py` modules and import them, so that the same function is used everywhere and can be tested. Keep raw data read-only and separate from derived results, and write every derived file from a script rather than by hand, so that the whole chain from raw output to figure can be rerun with one command. Seed random-number generators, as the examples here do with `default_rng(42)`, so that stochastic results can be reproduced exactly. And put the code under version control with git, so that every figure can be traced back to the exact code that made it.

{{< note type="key" >}}
- Open files in `with` blocks, iterate over lines to stream large files, and use `pathlib` for paths; use ASE or MDAnalysis for structure and trajectory formats.
- `np.loadtxt` reads numerical tables; `.npy`, `.npz` and HDF5 store arrays losslessly and quickly; pandas handles labelled tables of mixed types.
- `np.polyfit` and `scipy.optimize.curve_fit` fit linear and nonlinear models and return covariances; check residuals, and do not trust naive errors from correlated data.
- Check shapes, units, restarts and equilibration before fitting; report confidence intervals with Student's $t$, and mind parameter correlations such as that between $E_a$ and $\ln A$.
- Matplotlib figures are built from a Figure and Axes; label axes with units, use colour-blind-safe palettes and save vector formats for papers.
- Test analyses on synthetic data with known answers; keep environments, scripts, raw data and results organised and under version control.
{{< /note >}}

{{< quiz >}}
- q: "Why open files with `with open(...) as f:`?"
  options: ["It reads files faster", "The file is closed automatically when the block ends, even if an error occurs", "It is required for text files"]
  answer: 1
  why: "The with statement guarantees clean-up."
- q: "Which format preserves a float64 array exactly and loads fastest?"
  options: ["A text file written with np.savetxt", "A .npy file written with np.save", "A CSV file"]
  answer: 1
  why: ".npy stores the raw buffer with its dtype and shape; text formats round numbers and must be parsed."
- q: "A fit to correlated time-series data reports a very small parameter error. What should you suspect?"
  options: ["The fit is excellent", "The error is underestimated, because the residuals are not independent", "The model is linear"]
  answer: 1
  why: "Standard fit errors assume independent residuals; block averaging or bootstrapping gives honest uncertainties."
- q: "What is the most direct way to see that a fitted model is systematically wrong?"
  options: ["A small parameter uncertainty", "A pattern in the residuals", "A large R²"]
  answer: 1
  why: "Structured residuals reveal model error that summary statistics can hide."
- q: "An Arrhenius fit gives Ea and ln A with a correlation coefficient of 0.9986. What does that imply?"
  options: ["The fit is excellent", "The two parameters cannot be varied independently; their joint uncertainty is a thin ellipse", "The temperatures were measured incorrectly"]
  answer: 1
  why: "Data far from 1/T = 0 make slope and intercept strongly correlated; centring 1/T removes the correlation."
- q: "A log made by concatenating a crashed run and its restart contains t = 10.0 twice. Which frame should you keep?"
  options: ["The first, from the original run", "The last, from the restarted run", "Their average"]
  answer: 1
  why: "The restarted run continues from the checkpoint and its frames are the ones that lead to the rest of the trajectory."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. VanderPlas, *Python Data Science Handbook*, 2nd ed., O'Reilly (2022), chapters on NumPy, pandas and Matplotlib. Free online.
2. W. McKinney, *Python for Data Analysis*, 3rd ed., O'Reilly (2022). Free online.
3. J. D. Hunter, "Matplotlib: a 2D graphics environment", *Computing in Science & Engineering* **9**, 90–95 (2007).
4. P. Virtanen et al., "SciPy 1.0: fundamental algorithms for scientific computing in Python", *Nature Methods* **17**, 261–272 (2020).
5. N. P. Rougier, M. Droettboom and P. E. Bourne, "Ten simple rules for better figures", *PLOS Computational Biology* **10**, e1003833 (2014).
6. C. Kittel, *Introduction to Solid State Physics*, 8th ed., Wiley (2005), chapters 1 and 3, for the lattice constants and cohesive energies in the table example.
7. G. Wilson et al., "Good enough practices in scientific computing", *PLOS Computational Biology* **13**, e1005510 (2017).
8. J. D. Chodera, "A simple method for automated equilibration detection in molecular simulations", *Journal of Chemical Theory and Computation* **12**, 1799–1805 (2016).
9. R. R. Krug, W. G. Hunter and R. A. Grieger, "Enthalpy-entropy compensation. 1. Some fundamental statistical problems associated with the analysis of van't Hoff and Arrhenius data", *Journal of Physical Chemistry* **80**, 2335–2341 (1976).
10. A.-M. Legendre, *Nouvelles méthodes pour la détermination des orbites des comètes*, Courcier, Paris (1805), whose appendix introduces the method of least squares.

</div>
