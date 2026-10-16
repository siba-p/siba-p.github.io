---
title: "Python for scientists"
description: "Real Python, running in this page: numbers and units, lists and dictionaries, functions, NumPy arrays and why they are fast, reading simulation output, fitting, a small simulation, and the habits that keep scientific code correct."
track: pysci
weight: 3
level: Foundation
minutes: 60
lab: "Eight editable Python cells"
---

## Why Python, and how this page runs it

Python is the common language of scientific analysis and machine learning: readable, interactive, and backed by NumPy, SciPy, pandas, matplotlib, ASE, pymatgen, MDAnalysis, scikit-learn and PyTorch. It is slow when it loops over numbers one at a time, so the trick, which this lesson teaches, is to hand the heavy lifting to compiled libraries that operate on whole arrays.

The code cells below run **real Python** (CPython compiled to WebAssembly by the Pyodide project) inside your browser. The first time you press **Run**, the page downloads Python and NumPy, about 10 MB, which takes a few seconds; after that each cell runs instantly. Edit anything and run it again (**Shift + Enter** runs the cell you are typing in). All cells share one interpreter, so later cells can use names defined in earlier ones: run them in order. **Reset** restores a cell's original code.

To work on your own computer, install Python through Miniconda or Miniforge, create an environment (`conda create -n sci python numpy scipy matplotlib jupyter`), and use Jupyter notebooks for exploration and `.py` files in an editor such as VS Code for anything you will reuse.

## Numbers, variables and printing

{{< py >}}
# numbers, variables and formatted output
kB = 1.380649e-23        # J/K
NA = 6.02214076e23       # 1/mol
T = 298.15               # K

kT = kB * T
RT = kB * NA * T / 1000  # kJ/mol
print(f"kT at {T} K = {kT:.4e} J = {RT:.3f} kJ/mol")
print("7 / 2 =", 7 / 2, "   7 // 2 =", 7 // 2, "   7 % 2 =", 7 % 2, "   2**10 =", 2**10)
{{< /py >}}

A variable is a name for a value; Python works out its type. `f"…"` strings insert values with a format: `.4e` is scientific notation with four decimals, `.3f` fixed-point. In Python 3, `/` always gives a floating-point result; `//` is integer (floor) division and `%` the remainder. Try changing the temperature.

## Collections and loops

A **list** is an ordered sequence; a **dictionary** maps keys to values. A **comprehension** builds a new list or dictionary in one line.

{{< py >}}
# lists, dictionaries, loops and comprehensions
masses = {"H": 1.008, "C": 12.011, "N": 14.007, "O": 15.999}   # g/mol
glycine = ["N", "H", "H", "C", "H", "H", "C", "O", "O", "H"]    # C2H5NO2

M = sum(masses[el] for el in glycine)
print(f"molar mass of glycine: {M:.3f} g/mol")

counts = {el: glycine.count(el) for el in sorted(set(glycine))}
print("composition:", counts)

for el, n in counts.items():
    print(f"  {el}: {n} atoms, {100 * n * masses[el] / M:5.1f} % by mass")
{{< /py >}}

Indentation is part of the syntax: the body of a `for` loop, an `if` or a function is the indented block. Four spaces is the convention (the Tab key inserts them in these cells).

## Functions

Put anything you will do more than once in a **function**, with a docstring saying what it does and in which units:

{{< py >}}
# functions with documentation and default arguments
import math

def lj(r, eps=0.997, sigma=3.405):
    """Lennard-Jones energy in kJ/mol for a separation r in Å (argon by default)."""
    sr6 = (sigma / r) ** 6
    return 4 * eps * (sr6 * sr6 - sr6)

r_min = 2 ** (1 / 6) * 3.405
print(f"minimum at {r_min:.3f} Å, energy {lj(r_min):.3f} kJ/mol")
print(f"krypton-like parameters at 4.0 Å: {lj(4.0, eps=1.37, sigma=3.6):.3f} kJ/mol")
help(lj)
{{< /py >}}

Default arguments (`eps=0.997`) make common cases short; keyword arguments (`sigma=3.6`) make calls readable. Units belong in docstrings or variable names; Python will not check them for you.

## NumPy: thinking in arrays

The `lj` function from the previous cell works unchanged on a NumPy array, because NumPy applies `**`, `*` and `-` to every element in compiled code. Compare a Python loop with the array version:

{{< py >}}
# NumPy: whole-array arithmetic instead of Python loops
import time
import numpy as np

r = np.linspace(3.2, 10.0, 1_000_000)

t0 = time.perf_counter()
e_loop = [lj(x) for x in r]                 # one Python function call per element
t1 = time.perf_counter()
e_vec = lj(r)                               # the same function, applied to the whole array
t2 = time.perf_counter()

print(f"Python loop: {t1 - t0:.3f} s    NumPy: {t2 - t1:.4f} s    "
      f"speed-up ×{(t1 - t0) / (t2 - t1):.0f}")
print("same answer:", np.allclose(e_loop, e_vec))
print("minimum found at", r[np.argmin(e_vec)].round(3), "Å")
{{< /py >}}

The array version is typically one to two orders of magnitude faster (the exact factor depends on your machine and on running inside a browser). The habit to build is **vectorisation**: express calculations as operations on whole arrays (`r**2`, `np.exp(-x)`, `a @ b`, `arr.sum(axis=0)`, boolean masks such as `arr[arr > 0]`) and avoid explicit loops over elements. The [MD lesson](../molecular-dynamics/) computes all pair forces of a system this way.

## Reading simulation output

GROMACS `.xvg` files and most other text output can be read with `np.loadtxt`, telling it which lines are comments:

{{< py >}}
# reading a GROMACS .xvg file: skip the # and @ header lines
import io
xvg = """# This file was created by gmx energy
@    title "GROMACS Energies"
@    xaxis  label "Time (ps)"
@ s0 legend "Temperature"
   0.0   297.81
  10.0   299.42
  20.0   301.07
  30.0   298.55
  40.0   300.93
  50.0   299.12
"""
data = np.loadtxt(io.StringIO(xvg), comments=["#", "@"])   # use the file name for a real file
t, T = data[:, 0], data[:, 1]
print("shape:", data.shape)
print(f"mean T = {T.mean():.2f} K, standard deviation {T.std(ddof=1):.2f} K")
{{< /py >}}

For a real file, pass the file name: `np.loadtxt("energy.xvg", comments=["#", "@"])`. For tables with headers and mixed types, `pandas.read_csv` is the tool; for trajectories, MDAnalysis or MDTraj.

## Fitting

The Arrhenius fit from [the first fitting lesson](../learning-from-data/), now with `numpy.polyfit`, which also returns the covariance matrix of the parameters:

{{< py >}}
# fitting: an Arrhenius plot with numpy.polyfit
R = 8.314462618                                   # J/(mol K)
T = np.array([300., 310., 320., 330., 340., 350.])
k = np.array([1.2e-3, 2.4e-3, 4.6e-3, 8.5e-3, 1.5e-2, 2.6e-2])

(slope, intercept), cov = np.polyfit(1 / T, np.log(k), 1, cov=True)
Ea, dEa = -slope * R / 1000, np.sqrt(cov[0, 0]) * R / 1000
print(f"Ea = {Ea:.1f} ± {dEa:.1f} kJ/mol,  A = {np.exp(intercept):.2e} 1/s")
{{< /py >}}

For nonlinear models use `scipy.optimize.curve_fit`, which works the same way: a model function, data, initial guesses, and parameter covariances out.

## A small simulation

Brownian particles take random Gaussian steps; their mean-squared displacement grows as $6Dt$, so its slope gives the diffusion coefficient ([the lesson on trajectory analysis](../trajectory-analysis/)). The whole simulation is three array operations:

{{< py >}}
# a tiny simulation: Brownian particles and their diffusion coefficient
rng = np.random.default_rng(42)
D_true, dt, steps, n = 1.0, 0.01, 1000, 300
jumps = rng.normal(0.0, np.sqrt(2 * D_true * dt), size=(steps, n, 3))
x = np.cumsum(jumps, axis=0)                     # trajectories, shape (steps, particles, 3)

lags = np.arange(1, 100)
msd = np.array([np.mean(np.sum((x[l:] - x[:-l]) ** 2, axis=-1)) for l in lags])
D_fit = np.polyfit(lags * dt, msd, 1)[0] / 6
print(f"D from the mean-squared displacement: {D_fit:.3f}  (true value {D_true})")
{{< /py >}}

Change the number of particles and see how the estimate's scatter changes. Always seed the random generator (`default_rng(42)`) so that results can be reproduced.

## A trap worth knowing

{{< py >}}
# a classic surprise: slices of NumPy arrays are views, not copies
a = np.arange(6)
b = a[2:4]          # a view into the same memory
b[:] = -1
print("a after changing b:", a)

c = a[2:4].copy()   # an independent copy
c[:] = 99
print("a after changing c:", a)
{{< /py >}}

Slicing a NumPy array gives a **view** of the same memory, not a copy, so writing to the slice changes the original. This is efficient and usually what you want, until it is not. Use `.copy()` when you need an independent array. (Python lists behave differently: slicing a list does copy it.)

## Plotting and beyond

Plots are made with matplotlib. This page does not draw them, but on your own machine:

```python
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(4, 3))
ax.plot(lags * dt, msd, "o", ms=3, label="simulation")
ax.plot(lags * dt, 6 * D_true * lags * dt, label="6Dt")
ax.set_xlabel("time")
ax.set_ylabel("mean-squared displacement")
ax.legend()
fig.tight_layout()
fig.savefig("msd.pdf")          # vector format for papers; use .png for slides
```

{{< note type="practice" title="Habits for scientific Python" >}}
- One **environment** per project, with its package versions recorded (`environment.yml` or `requirements.txt`).
- Explore in notebooks, but move reusable code into functions in `.py` files, and import them.
- Use `pathlib.Path` for file paths and `argparse` for scripts that take options.
- **Test** analysis code on synthetic data with a known answer before trusting it on real data, as the diffusion cell does.
- Put everything under version control with git.
{{< /note >}}

{{< quiz >}}
- q: "Why is `lj(r)` on a NumPy array of a million values much faster than calling `lj` in a Python loop?"
  options: ["NumPy uses a different formula", "The arithmetic runs in compiled code over the whole array, instead of the Python interpreter handling each element separately", "NumPy uses the GPU"]
  answer: 1
  why: "Each Python-level operation carries interpreter overhead. Array operations do the same arithmetic in a single compiled loop."
- q: "After `b = a[2:4]; b[:] = 0` on a NumPy array `a`, what happens to `a`?"
  options: ["Nothing; b is a copy", "Elements 2 and 3 of a become 0, because b is a view of a's memory", "An error is raised"]
  answer: 1
  why: "Basic slicing returns a view. Use `a[2:4].copy()` for an independent array."
- q: "What is `7 // 2` in Python 3?"
  options: ["3.5", "3", "4"]
  answer: 1
  why: "`//` is floor division, giving 3; `/` gives 3.5."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. VanderPlas, *Python Data Science Handbook*, 2nd ed., O'Reilly (2023), free online.
2. W. McKinney, *Python for Data Analysis*, 3rd ed., O'Reilly (2022), free online.
3. C. R. Harris et al., “Array programming with NumPy,” *Nature* **585**, 357–362 (2020).
4. P. Virtanen et al., “SciPy 1.0: fundamental algorithms for scientific computing in Python,” *Nature Methods* **17**, 261–272 (2020).
5. J. D. Hunter, “Matplotlib: a 2D graphics environment,” *Computing in Science & Engineering* **9**, 90–95 (2007).
6. Software Carpentry, “Programming with Python,” swcarpentry.github.io/python-novice-inflammation.
7. Pyodide, “Python with the scientific stack, compiled to WebAssembly,” pyodide.org.

</div>
