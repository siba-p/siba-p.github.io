---
title: "Scientific data"
description: "The everyday work of computational science in Python: reading and writing text and binary files, parsing simulation output, loading tables with NumPy and pandas, fitting linear and nonlinear models with uncertainties, making publication-quality figures with Matplotlib, and organising an analysis so that it can be reproduced."
track: pysci
weight: 2
level: Core
prereqs: ["numpy-arrays"]
lab: "Parse simulation output, fit models with error bars, and draw real Matplotlib figures in the page"
---

## From raw output to a result

A typical computational study produces files: trajectories, energy logs, structure files, tables of computed properties. Turning those files into a number with an error bar, or a figure in a paper, follows the same sequence almost every time. The files are **read and parsed** into arrays; the arrays are **cleaned and checked**; a quantity is **computed or fitted**; its **uncertainty** is estimated; and the result is **plotted** and written out. Each step is easy on its own. Doing all of them correctly, in a way that can be rerun next month on new data and give the same answer for the same input, is the real skill, and Python's scientific libraries make it straightforward. This chapter goes through the steps in order.

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

The figure below runs real Matplotlib in this page and shows the image it produces. Edit the code and run it again: change the colours, add a second panel with `plt.subplots(1, 2)`, or switch to logarithmic axes with `ax.set_yscale("log")`.

{{< widget name="pyfig" title="Matplotlib running in the page" caption="The code is executed by CPython with NumPy and Matplotlib (compiled to WebAssembly) and the resulting figure is displayed below it. The first run downloads the libraries." opts=`{"code":"import numpy as np\nimport matplotlib.pyplot as plt\n\nR = 8.314462618\nT = np.array([300., 310., 320., 330., 340., 350.])\nk = np.array([1.2e-3, 2.4e-3, 4.6e-3, 8.5e-3, 1.5e-2, 2.6e-2])\n(m, b) = np.polyfit(1 / T, np.log(k), 1)\nresid = np.log(k) - (m / T + b)\n\nfig, (ax, ax2) = plt.subplots(2, 1, figsize=(5, 4.6), sharex=True,\n                              gridspec_kw={'height_ratios': [3, 1]})\nax.plot(1000 / T, np.log(k), 'o', color='#4c6ef5', label='rate constants')\nx = np.linspace(1 / 355, 1 / 295, 50)\nax.plot(1000 * x, m * x + b, '-', color='#f08c2e', label=f'fit: Ea = {-m * R / 1000:.1f} kJ/mol')\nax.set_ylabel('ln k')\nax.legend(frameon=False)\nax2.axhline(0, color='0.6', lw=0.8)\nax2.plot(1000 / T, resid, 'o', color='#e64980')\nax2.set_xlabel('1000 / T  (1/K)')\nax2.set_ylabel('residual')\nfig.tight_layout()\n"}` >}}

A good scientific figure has labelled axes with units, symbols large enough to read when the figure is shrunk to one column of a journal page, a colour scheme that survives printing in greyscale and colour-blind readers (Matplotlib's default palette and the `viridis` colour map are designed for this), and no decoration that carries no information. Save figures for papers in a vector format, PDF or SVG, so that lines stay sharp at any size, and raster images (PNG) at 300 dpi or more for slides and web pages.

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

</div>
