---
title: "NumPy arrays: memory, vectorisation and broadcasting"
description: "Why NumPy exists and how it works: the ndarray as a typed, contiguous buffer described by a shape, a dtype and strides; views and copies; vectorised arithmetic that runs compiled loops; reductions along axes; indexing, slicing, fancy and Boolean indexing; broadcasting rules; fixed-width integer and float pitfalls; and vectorising a pairwise-distance calculation."
track: pysci
weight: 1
level: Core
prereqs: ["python-collections"]
lab: "Explore an array's buffer and strides, test broadcasting rules, and time NumPy against Python loops"
---

## Why NumPy exists

The Python data model is flexible, and [the topics on the language](../python-objects-and-names/) showed what that flexibility costs. A list of a million numbers is a million separate float objects scattered across memory, each 24 bytes with its own type pointer and reference count, plus a million 8-byte pointers in the list. Adding two such lists element by element runs a million iterations of the interpreter loop, each checking types, dispatching an addition and allocating a new object. For numerical work, that is hopelessly slow and wasteful.

**NumPy** solves the problem with a single new type, the **n-dimensional array** or `ndarray`. An array stores numbers the way Fortran and C do: as raw binary values of one fixed type, packed side by side in one contiguous block of memory. Operations on arrays are implemented in compiled C loops that run over this block without ever creating Python objects for the individual numbers. A Python program that uses NumPy well pays the interpreter's overhead once per *operation* rather than once per *element*. Almost the entire scientific Python ecosystem, SciPy, pandas, Matplotlib, scikit-learn, ASE and MDAnalysis among many others, is built on NumPy arrays, and the array interface of PyTorch and JAX was designed to imitate it.

The figure at the end of this topic measures the difference in your browser. Before that, this topic explains how an array is laid out in memory, because nearly every rule of NumPy, from which operations copy data to why some loops are faster than others, follows from it.

## An array is a buffer with a shape, a dtype and strides

An `ndarray` consists of two parts. The **data buffer** is a block of raw bytes. The **header** describes how to interpret those bytes as an array, with four pieces of information:

{{< eq title="How an array finds an element" say="The address of any element is the start of the buffer plus its index dotted with the strides." >}}
$$ \text{address}(a[\textcolor{#4c6ef5}{i}, \textcolor{#4c6ef5}{j}]) = \text{start} + \textcolor{#4c6ef5}{i}\,\textcolor{#f08c2e}{s_0} + \textcolor{#4c6ef5}{j}\,\textcolor{#f08c2e}{s_1} $$
- **dtype**: the type and size of each element, such as `float64` (8 bytes), `float32`, `int64`, `int8` or `complex128`
- **shape**: the number of elements along each axis, such as `(3, 4)` for 3 rows and 4 columns
- $\textcolor{#f08c2e}{s_0}, \textcolor{#f08c2e}{s_1}$: the **strides**, the number of bytes to step in memory to move one position along each axis
{{< /eq >}}

For a `(3, 4)` array of `float64` stored in the default **C order** (row-major), the twelve values are laid out row after row. Moving one column to the right moves 8 bytes; moving one row down skips a whole row of 4 elements, 32 bytes. The strides are therefore `(32, 8)`. In **Fortran order** (column-major), used by Fortran and by many linear-algebra libraries, the values are laid out column after column, and the strides are `(8, 24)`.

{{< widget name="ndarray" title="Inside an ndarray: the grid you see and the bytes underneath" caption="Top: the array or view your code sees, filled with the values 0, 1, 2, …. Bottom: the single buffer of bytes that holds them, with the byte offset of each element. Change the dtype and memory order, choose an expression, and click elements to see the stride arithmetic." >}}

Strides make it possible to represent many different arrays over the same buffer without copying anything. Choose `a[:, 2]` in the figure: the column is described by the same buffer, a starting offset of 16 bytes and a single stride of 32 bytes, jumping from row to row. Choose `a.T`: the transpose has the shape reversed and the strides swapped, `(8, 32)`, and not a single byte has moved. `a[::2, ::2]` doubles both strides. `a.reshape(4, 3)` on a C-ordered array just reinterprets the same bytes with a new shape. Such arrays are called **views**. They are created almost instantly, regardless of size, and they share memory with the original: writing to a view writes to the original array.

{{< py title="shape, dtype and strides" >}}
import numpy as np
a = np.arange(12, dtype=np.float64).reshape(3, 4)
print(a)
print("shape", a.shape, "dtype", a.dtype, "strides", a.strides)
print("transpose strides", a.T.strides, " column strides", a[:, 2].strides)

row = a[1]                     # a view: shares memory with a
row[0] = 100.0
print(a[1, 0], np.shares_memory(a, row))

picked = a[a > 5]              # Boolean indexing makes a copy
print(picked, np.shares_memory(a, picked))
{{< /py >}}

Not every selection can be expressed with strides. Choosing the elements where a condition holds, `a[a % 3 == 0]` in the figure, picks an irregular set of positions, so NumPy must **copy** the selected values into a new buffer. The same is true of indexing with a list of positions, `a[[0, 2]]`, called **fancy indexing**. Knowing which operations give views and which give copies avoids two kinds of bug: modifying an array through a view without meaning to, and modifying a copy and expecting the original to change. When in doubt, `np.shares_memory(x, y)` answers the question, and `.copy()` forces an independent array.

Memory layout also affects speed. Processors read memory in cache lines of 64 bytes, so a loop that walks through consecutive addresses uses every byte it fetches, while a loop that jumps by large strides wastes most of each fetch ([the topic on computer architecture](../inside-a-computer/) shows the memory hierarchy). Summing along the rows of a large C-ordered array is therefore faster than summing along its columns, and copying a transposed array before a long computation can pay for itself.

## Vectorised arithmetic

Arithmetic operators on arrays act **element by element**: `a + b`, `a * b`, `a ** 2`, `np.sqrt(a)` and `np.exp(-a / kT)` each produce a new array of results, computed by a compiled loop over the buffers. These element-wise functions are called **universal functions** or ufuncs. Writing a computation as whole-array operations instead of a Python loop is called **vectorisation**, and it is the central skill of numerical Python.

```python
x = np.linspace(0.0, 2.0 * np.pi, 1000)   # 1000 evenly spaced points
y = np.sin(x) * np.exp(-x / 3.0)          # 1000 values, no Python loop
```

**Reductions** combine many elements into fewer: `a.sum()`, `a.mean()`, `a.std()`, `a.min()`, `a.max()`, `a.argmax()`. With the `axis` argument they reduce along one axis only. For a trajectory stored as an array of shape `(n_frames, n_atoms, 3)`, `positions.mean(axis=0)` gives the average position of each atom over time, with shape `(n_atoms, 3)`, while `positions.mean(axis=1)` gives the centre of each frame, with shape `(n_frames, 3)`. A useful way to remember it: the axis you name is the one that disappears.

Linear algebra has its own operators. `a @ b` is matrix multiplication, which for large matrices calls an optimised BLAS library that uses vector instructions and multiple cores and can approach the processor's peak speed. `np.linalg` provides `solve`, `inv`, `eigh` (eigenvalues of symmetric matrices, as in [the topic on matrices](../vectors-and-matrices/)), `svd` and `norm`.

## Indexing and slicing

Arrays are indexed with one index per axis, separated by commas: `a[1, 2]` is the element in row 1, column 2. Slices work on every axis, `a[:, 1:3]` selecting all rows and columns 1 and 2, and an omitted trailing index means "everything", so `a[1]` is row 1. Negative indices count from the end. As explained above, basic slicing always returns a view.

Two kinds of advanced indexing return copies. **Boolean indexing** uses an array of `True`/`False` of the same shape as a mask: `energies[energies < cutoff]` selects the low energies, and `r[r < r_cut]` selects the distances inside a cut-off. Combined with assignment, a mask modifies selected elements in place: `v[np.abs(v) > vmax] = 0.0`. **Fancy indexing** uses arrays of integer positions: `positions[[0, 5, 9]]` picks three atoms, and `np.argsort(e)` returns the positions that would sort an array, so `structures[np.argsort(e)[:10]]` gives the ten lowest-energy structures.

## Broadcasting

Arithmetic between arrays of different shapes is allowed when the shapes are compatible according to the **broadcasting** rules, which let a smaller array act as if it were repeated to match a larger one without actually copying it.

{{< eq title="The broadcasting rule" say="Line the shapes up on the right; each pair of sizes must match or one of them must be 1." >}}
$$ \text{shapes aligned from the right:}\quad \begin{array}{rcc} \textcolor{#4c6ef5}{a}: & 3 & 4 \\ \textcolor{#f08c2e}{b}: & & 4 \\ \hline \textcolor{#845ef7}{a + b}: & 3 & 4 \end{array} $$
- missing leading axes are treated as size 1
- two sizes are compatible if they are equal or if one of them is 1; a size-1 axis is stretched to match
- otherwise NumPy raises `ValueError: operands could not be broadcast together`
{{< /eq >}}

The stretching is done with a **stride of zero**: a size-1 axis repeated $n$ times is described by stepping zero bytes along it, so the same value is read again and again. No memory is used for the virtual copies. The figure below applies the rules to any pair of shapes and draws the result for two-dimensional cases.

{{< widget name="broadcast" title="Broadcasting: which shapes combine, and how" caption="Choose an example or type two shapes. The table aligns the axes from the right and applies the rule axis by axis. In the picture, solid cells are real data and dashed cells are virtual repeats created by zero strides." >}}

Broadcasting turns many loops into single expressions. Subtracting the centre of a molecule from every atom is `positions - positions.mean(axis=0)`: shapes `(N, 3)` and `(3,)` broadcast to `(N, 3)`. An outer sum, `x[:, None] + y[None, :]`, uses `None` (also spelt `np.newaxis`) to insert size-1 axes, turning shapes `(n,)` and `(m,)` into `(n, 1)` and `(1, m)` and producing an `(n, m)` table. The same trick computes all pair vectors between atoms at once, which is the core of the example at the end of this topic.

## Fixed-width numbers

NumPy's numbers behave like those of C and Fortran, not like Python's. Integers have a fixed width and **overflow silently**: an `int8` holds values from −128 to 127, so multiplying 2 by 100 in `int8` gives −56, and even `int64` arithmetic wraps around above $2^{63} - 1$. Python's own integers never overflow, so this surprises people moving data between the two. Choose dtypes deliberately: `float64` for physical quantities unless memory or GPU speed demands `float32`, and integer types wide enough for the counts involved.

Floating-point types carry the rounding behaviour of [IEEE 754](../numbers-in-a-computer/). `float32` keeps about seven significant digits, which is enough to store coordinates but not to accumulate a sum of a million energies without visible error. NumPy's `sum` reduces this risk by adding in pairs (pairwise summation), but long accumulations, such as running averages over a simulation, should be done in `float64`. Division by zero produces `inf` or `nan` with a warning rather than an exception, and `nan` then propagates through every later calculation; `np.isfinite(a).all()` is a cheap sanity check after a long computation.

{{< py title="dtypes behave like C, not like Python" >}}
import numpy as np
print(np.array([1, 2, 3], dtype=np.int8) * 100)      # wraps around
print(2**63, "versus", np.int64(2)**63)              # Python grows, NumPy wraps
print(np.float32(1e8) + np.float32(1.0) - np.float32(1e8))   # 1 is lost in float32
print(np.float64(1e8) + 1.0 - 1e8)
{{< /py >}}

## How much faster, and why

The figure below times four ways of computing $\sum_i x_i^2$ for up to a million numbers, in this browser: a Python `for` loop over a list, the built-in `sum` of a generator, the NumPy expression `(a * a).sum()`, and the dot product `a @ a`, which hands the whole job to a single BLAS routine.

{{< widget name="pyspeed" title="Python loops against NumPy, timed live" caption="Real CPython and NumPy, compiled to WebAssembly, run each method three times and keep the fastest. Speed-ups in a native Python installation are similar or larger." >}}

On a laptop running native Python, the NumPy versions of this simple sum are about 15 to 100 times faster than the loop, and the advantage is larger for heavier arithmetic such as exponentials and square roots. In the browser, where NumPy runs as WebAssembly with fewer vector instructions, the gap is smaller, typically ten- to twenty-fold. Three effects add up. NumPy executes one interpreter-level operation instead of millions, so the per-bytecode overhead disappears. Its compiled loop reads raw doubles from consecutive addresses, which the processor's caches and prefetcher handle at full speed. And the compiled loops use **SIMD** (single instruction, multiple data) instructions that process two, four or eight numbers per machine instruction. The last line, the dot product, also avoids creating the temporary array `a * a`, which is why it is faster still.

Vectorisation has two costs to keep in mind. Temporary arrays use memory: `np.exp(-(r / sigma)**2)` creates three intermediate arrays the size of `r`. For very large arrays this can exhaust memory, and in-place operations (`r /= sigma`, `np.exp(r, out=r)`) or chunking help. And some algorithms are inherently sequential, such as a time-stepping loop where each step needs the previous one; for those, the loop over *time* stays in Python (or moves to compiled code, as in [the topic on performance](../python-performance/)), while the work over *atoms* inside each step is vectorised.

## A worked example: all pair distances

Computing the distances between all pairs of $N$ atoms is the first step of almost every structural analysis, from coordination numbers to radial distribution functions. With loops it is a double loop over pairs. With broadcasting, inserting a new axis in two different places turns the `(N, 3)` position array into shapes `(N, 1, 3)` and `(1, N, 3)`; their difference broadcasts to `(N, N, 3)`, every pair vector at once.

{{< py title="pair distances with broadcasting" >}}
import numpy as np
rng = np.random.default_rng(0)
L = 10.0                                   # cubic box length
pos = rng.uniform(0.0, L, size=(500, 3))   # 500 random atoms

d = pos[:, None, :] - pos[None, :, :]      # (500, 500, 3) pair vectors
d -= L * np.round(d / L)                   # minimum image in a periodic box
r = np.sqrt((d ** 2).sum(axis=-1))         # (500, 500) distances

iu = np.triu_indices(len(pos), k=1)        # each pair once
pairs = r[iu]
print(pairs.shape, "pairs; closest", pairs.min().round(3), "mean", pairs.mean().round(3))
print("neighbours within 1.5:", (pairs < 1.5).sum())
{{< /py >}}

The line `d -= L * np.round(d / L)` applies the **minimum-image convention** of periodic boundary conditions, explained in [the topic on molecular simulation](../molecular-dynamics/), to all 250 000 pair vectors in one expression. The approach uses $O(N^2)$ memory, which is fine for a few thousand atoms; beyond that, the pairs are found with neighbour lists or with `scipy.spatial.cKDTree`, which only examine nearby atoms.

{{< note type="key" >}}
- An ndarray is a typed contiguous buffer plus a header giving dtype, shape and strides; the address of element $(i, j)$ is start $+ i s_0 + j s_1$.
- Slicing, transposing and reshaping usually create views that share memory; Boolean and fancy indexing create copies.
- Vectorised ufuncs and reductions run compiled, cache-friendly SIMD loops, typically tens to hundreds of times faster than Python loops; `axis` selects the axis to reduce away.
- Broadcasting aligns shapes from the right and stretches size-1 axes with zero strides, without copying.
- NumPy integers overflow silently and `float32` loses precision quickly; choose dtypes deliberately and check results with `np.isfinite`.
{{< /note >}}

{{< quiz >}}
- q: "A C-ordered float64 array has shape (100, 50). What are its strides?"
  options: ["(50, 1)", "(400, 8)", "(8, 800)"]
  answer: 1
  why: "Moving one column steps 8 bytes; moving one row skips 50 elements of 8 bytes, 400 bytes."
- q: "Which of these creates a copy rather than a view?"
  options: ["a[2:5]", "a.T", "a[a > 0]"]
  answer: 2
  why: "Boolean indexing selects an irregular set of positions that strides cannot describe."
- q: "Can arrays of shapes (5, 3) and (5,) be added?"
  options: ["Yes, giving (5, 3)", "No: aligned from the right, 3 and 5 do not match and neither is 1", "Yes, giving (5, 5)"]
  answer: 1
  why: "Use b[:, None] to make b shape (5, 1), which broadcasts against (5, 3)."
- q: "For positions of shape (n_frames, n_atoms, 3), what shape does positions.mean(axis=1) have?"
  options: ["(n_atoms, 3)", "(n_frames, 3)", "(n_frames, n_atoms)"]
  answer: 1
  why: "The named axis, atoms, is reduced away: one centre per frame."
- q: "np.array([100], dtype=np.int8) * 2 gives…"
  options: ["200", "-56", "an OverflowError"]
  answer: 1
  why: "int8 holds −128 to 127; 200 wraps around to 200 − 256 = −56 without any error."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. C. R. Harris et al., "Array programming with NumPy", *Nature* **585**, 357–362 (2020).
2. S. van der Walt, S. C. Colbert and G. Varoquaux, "The NumPy array: a structure for efficient numerical computation", *Computing in Science & Engineering* **13**, 22–30 (2011).
3. The NumPy User Guide, numpy.org/doc/stable/user, in particular "The N-dimensional array", "Copies and views" and "Broadcasting".
4. J. VanderPlas, *Python Data Science Handbook*, 2nd ed., O’Reilly (2022), chapter on NumPy. Free online.
5. N. P. Rougier, *From Python to NumPy* (2017), free online book on vectorisation, labri.fr/perso/nrougier/from-python-to-numpy.
6. U. Drepper, "What every programmer should know about memory" (2007), on caches and why strided access is slow.

</div>
