---
title: "Performance"
description: "A systematic approach to slow scientific Python: measure with timeit and cProfile, choose better algorithms, vectorise, cache, compile hot loops with Numba, Cython or Fortran, manage memory, and run in parallel with processes, MPI, threads and GPUs, with Amdahl's law and the global interpreter lock explained."
hook: "If 5 % of a program must run serially, no number of cores can make it more than 20 times faster, and 128 cores give only about 17. Fast Python starts with finding where the time really goes."
objectives:
  - "Profile a slow program with timeit and cProfile to find the code that dominates"
  - "Choose algorithmic fixes such as neighbour lists, sets and caching before tuning constants"
  - "Speed up hot loops by vectorising with NumPy or compiling with Numba"
  - "Estimate the limit on parallel speed-up with Amdahl's law"
  - "Choose between threads, processes, MPI and GPUs given the global interpreter lock"
cover: "cover.svg"
milestones:
  - year: 1967
    text: "Gene Amdahl argues that a serial fraction caps the speed-up of parallel machines"
  - year: 1974
    text: "Donald Knuth warns that premature optimisation is the root of much evil"
  - year: 1988
    text: "John Gustafson shows that speed-up keeps growing when the problem grows with the machine"
  - year: 2024
    text: "Python 3.13 ships an optional free-threaded build, following Sam Gross's PEP 703"
track: pysci
weight: 3
level: Core
prereqs: ["numpy-arrays", "how-python-runs"]
lab: "Profile code in the browser and explore how parallel speed-up saturates"
---

## Measure before optimising

Most code is fast enough, and most of the time spent in slow code is spent in a small part of it. Donald Knuth's warning that premature optimisation is the root of much evil is about exactly this: effort spent speeding up code that does not dominate the run time is wasted, and usually makes the code harder to read. The first step is therefore always to **measure**, both to find where the time goes and to know whether a change helped.

For timing a small piece of code, the `timeit` module runs it many times and reports the best time, which removes noise from other activity on the machine. In Jupyter the magic `%timeit expression` also runs the code many times, and reports the mean and standard deviation over several runs. For finding where time goes in a whole program, a **profiler** records how often each function is called and how long it takes. The standard library's `cProfile` does this with little overhead:

{{< py title="profiling a small program" >}}
import cProfile, pstats, io

def pair_energy(r):
    sr6 = (1.0 / r) ** 6
    return 4.0 * (sr6 * sr6 - sr6)

def distance(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5

def total_energy(pos):
    e = 0.0
    for i in range(len(pos)):
        for j in range(i + 1, len(pos)):
            e += pair_energy(distance(pos[i], pos[j]))
    return e

import random
random.seed(0)                      # 392 atoms on a slightly jittered cubic lattice
pos = [[1.2 * i + random.uniform(-0.1, 0.1), 1.2 * j + random.uniform(-0.1, 0.1),
        1.2 * k + random.uniform(-0.1, 0.1)] for i in range(8) for j in range(7) for k in range(7)]

pr = cProfile.Profile()
pr.enable(); E = total_energy(pos); pr.disable()
s = io.StringIO()
pstats.Stats(pr, stream=s).sort_stats("tottime").print_stats(5)
print(f"E = {E:.3f}")
print("\n".join(s.getvalue().splitlines()[:16]))
{{< /py >}}

The report shows the number of calls to each function and the time spent inside it (`tottime`) and inside it plus everything it calls (`cumtime`). Here the 76 636 calls to `distance`, with its generator expression, dominate. For a line-by-line view, the third-party `line_profiler` package annotates every line of chosen functions with its time. Whatever tool is used, the result usually points to one loop, and that loop is where the techniques below should be applied.

{{< note type="practice" title="Back of the envelope" >}}
The pure-Python energy takes about 80 ms for 392 atoms, that is, for $392 \times 391 / 2 = 76\,636$ pairs: roughly 1 µs per pair, spent on two function calls, a generator, a `zip` and a dozen arithmetic operations on boxed floats. A compiled loop does the same pair in a few nanoseconds. Scale it up: 10,000 atoms have $5 \times 10^7$ pairs, so one energy evaluation costs about 50 s in pure Python, and a modest MD run of $10^6$ steps would take $5 \times 10^7$ s, a year and a half. That is why production MD codes are compiled, and why the Python layer around them should do work once per frame or once per run, never once per pair.
{{< /note >}}

{{< note type="practice" title="From the lab" >}}
A job that has been running on a cluster for six hours cannot be restarted under `cProfile`. The sampling profiler `py-spy` attaches to a running Python process from outside: `py-spy dump --pid 12345` prints the current call stack of every thread, and `py-spy record -o profile.svg --pid 12345` samples for as long as you let it and writes a flame graph, in which the width of each bar is the share of time spent in that function. Because it only samples, it slows the job by a negligible amount. A typical finding in analysis scripts for MD trajectories: most of the time goes into reading frames from a compressed file or into a per-frame Python loop over atoms, not into the NumPy arithmetic the author was worried about.
{{< /note >}}

## Better algorithms first

The largest speed-ups come from doing less work, not from doing the same work faster. Reducing an $O(n^2)$ algorithm to $O(n \log n)$ or $O(n)$ beats any constant-factor improvement once $n$ is large ([the chapter on collections](../python-collections/) introduced this notation). In simulation code the classic example is finding neighbours: checking every pair of $N$ atoms costs $O(N^2)$, but dividing the box into cells no smaller than the cut-off and only comparing atoms in neighbouring cells costs $O(N)$, a factor of a thousand for a million atoms. In Python, `scipy.spatial.cKDTree` provides fast neighbour searches of this kind.

{{< fig src="pairs.svg" alt="Log-log plot of the number of pair distances computed per step against the number of atoms, from 10 to ten million. The all-pairs curve rises as N squared; cell-list and Verlet-list costs rise linearly, at 178 and 39 pairs per atom. The all-pairs and cell-list lines cross near 357 atoms; at a million atoms all pairs costs 2,808 times more. A second axis converts pairs to seconds at one nanosecond per pair." caption="Pair distances per step for a Lennard-Jones liquid at density 0.8442 with cut-off 2.5 σ. Below a few hundred atoms checking all pairs is cheapest; beyond that, neighbour lists win by a margin that grows linearly with $N$. The right axis assumes a compiled loop at 1 ns per pair." >}}

The numbers behind the figure come from the density. At the Lennard-Jones liquid state point $\rho = 0.8442\,\sigma^{-3}$, a cube of cells with side $r_c = 2.5\,\sigma$ holds $\rho r_c^3 = 13.2$ atoms per cell, and each atom must be checked against the 27 cells around it, about 356 candidates, or 178 pairs per atom once each pair is counted once. All pairs costs $(N-1)/2$ per atom, so the two methods break even near $N = 357$, and at a million atoms the cell list does 2,800 times less work: the "factor of a thousand" above is, if anything, modest. A Verlet list, which stores for each atom the neighbours within $r_c$ plus a skin of $0.3\,\sigma$ and is rebuilt only every 10 to 20 steps, cuts the cost to 39 pairs per atom; GROMACS, LAMMPS and OpenMM all build Verlet-type lists with the help of a spatial grid of cells.

Smaller algorithmic changes matter too. Membership tests in a loop should use a set or dictionary, not a list. Repeated work can be cached: if an expensive function is called many times with the same arguments, decorating it with `@functools.lru_cache` stores previous results and returns them instantly. Quantities that do not change inside a loop should be computed once outside it. Sorted data can be searched in $O(\log n)$ with `bisect` or `np.searchsorted` instead of scanning.

## Vectorise

The next step is to move the loops out of the interpreter. As [the chapter on NumPy arrays](../numpy-arrays/) explained and measured, a vectorised NumPy expression runs a compiled, cache-friendly loop and is commonly tens to hundreds of times faster than the equivalent Python loop. The energy calculation above vectorises in a few lines:

{{< py title="the same energy, vectorised" >}}
import numpy as np, time, random
random.seed(0)
pos = np.array([[1.2 * i + random.uniform(-0.1, 0.1), 1.2 * j + random.uniform(-0.1, 0.1),
                 1.2 * k + random.uniform(-0.1, 0.1)] for i in range(8) for j in range(7) for k in range(7)])

t0 = time.perf_counter()
d = pos[:, None, :] - pos[None, :, :]
r = np.sqrt((d ** 2).sum(-1))[np.triu_indices(len(pos), 1)]
sr6 = r ** -6.0
E = (4.0 * (sr6 * sr6 - sr6)).sum()
print(f"E = {E:.3f} in {1e3 * (time.perf_counter() - t0):.2f} ms")
{{< /py >}}

The result agrees with the pure-Python version to twelve significant digits, and the time falls by about a factor of ten, from roughly 80 ms to under 10 ms on a laptop; the gap widens as the number of atoms grows. Vectorisation is limited by memory, since it creates temporary arrays, and by algorithms with sequential dependencies, such as time stepping, where each step needs the result of the previous one. For those cases the remaining loop must be compiled.

The memory limit arrives sooner than one might expect. The array `d` of all pair differences has $N \times N \times 3$ elements of 8 bytes: 3.7 MB for the 392 atoms here, 2.4 GB for 10,000 atoms, and 240 GB for 100,000, before counting the squared and summed temporaries made from it. The vectorised all-pairs code is therefore the right tool for a few thousand atoms and the wrong one for a production system, where it must be replaced by a neighbour list or by processing the pairs in blocks of rows that fit in memory.

{{< note type="warn" title="Myth" >}}
**Myth:** NumPy is always faster than plain Python.
**Reality:** every NumPy call pays a fixed overhead of a few hundred nanoseconds to inspect its arguments, choose a loop and allocate the result. On the machine used to check this chapter, `math.sqrt(x)` on a Python float took 42 ns and `np.sqrt(x)` on the same float 180 ns; `np.sqrt` on a 10-element array took 660 ns, while on a million elements it took 1.5 ns per element. NumPy wins when each call processes thousands of numbers. Code that calls NumPy functions on single coordinates inside a Python loop gets the overhead of both worlds and is often slower than pure Python.
{{< /note >}}

## Compile the hot loop

Several tools turn a Python-like loop into machine code, removing the interpreter's per-instruction cost entirely.

**Numba** is the least effort. Decorating a function that uses NumPy arrays and simple loops with `@numba.njit` makes Numba compile it, the first time it is called, into machine code specialised for the types of the arguments, using the LLVM compiler infrastructure. Inside, loops over array elements run at speeds close to C or Fortran:

```python
import numba
import numpy as np

@numba.njit(cache=True)
def total_energy(pos):
    n = pos.shape[0]
    e = 0.0
    for i in range(n):
        for j in range(i + 1, n):
            r2 = 0.0
            for k in range(3):
                d = pos[i, k] - pos[j, k]
                r2 += d * d
            sr6 = 1.0 / (r2 * r2 * r2)
            e += 4.0 * (sr6 * sr6 - sr6)
    return e
```

The explicit triple loop, which would be very slow in plain Python, is now fast, and it uses no temporary arrays at all. Numba also offers `parallel=True` with `numba.prange` to spread a loop over cores, and it can compile for GPUs. Its limitation is that it supports only a subset of Python: numbers, NumPy arrays and simple data structures, not arbitrary objects or most libraries.

**Cython** compiles a superset of Python with optional C type declarations into a C extension module; it is how much of SciPy and scikit-learn is written. **f2py**, part of NumPy, wraps Fortran subroutines so that they can be called from Python with NumPy arrays as arguments, which makes it easy to reuse existing Fortran kernels or to write new ones ([the chapter on Fortran](../fortran/) shows how). For maximum control, extensions can be written in C, C++ (with pybind11) or Rust (with PyO3). All of these follow the same design principle: keep the high-level logic, input and output in Python, and put the few loops that dominate the run time in compiled code.

The interpreter itself is getting faster, too. CPython 3.11 introduced the specialising adaptive interpreter described in [the chapter on how Python runs](../how-python-runs/), which made typical code around 25 % faster, and CPython 3.13 added an experimental just-in-time compiler. Alternative interpreters such as PyPy can run unmodified pure-Python loops several times faster, although they are less compatible with compiled extensions like NumPy.

## Memory

Speed and memory are linked, because moving data is often slower than computing with it. Choosing the smallest adequate dtype halves memory traffic when moving from `float64` to `float32`, which is why GPUs and machine-learning models often use single or even half precision, at the cost of the rounding issues discussed in [the chapter on numbers](../numbers-in-a-computer/). In-place operations (`a *= 2`, `np.add(a, b, out=a)`) avoid allocating temporaries. Generators and chunked processing keep the working set small: a trajectory too large for memory can be processed one frame at a time, or opened as a **memory-mapped** array with `np.load("traj.npy", mmap_mode="r")`, which reads only the parts that are actually touched. Access patterns matter as well: walking through an array in its memory order uses the cache efficiently, while jumping across it with large strides does not.

### Compute-bound or memory-bound?

Whether a kernel is limited by arithmetic or by memory traffic can be estimated before any profiling, with the **roofline model** of Samuel Williams, Andrew Waterman and David Patterson (2009). Count the floating-point operations a kernel performs and the bytes it must move from main memory; their ratio is its **arithmetic intensity** $I$. A machine with peak arithmetic rate $P$ and memory bandwidth $B$ can then sustain at most $\min(P, B\,I)$.

{{< fig src="roofline.svg" alt="Roofline plot on log-log axes: attainable GFLOP/s against arithmetic intensity. A sloped line at 100 GB/s times intensity meets a flat roof at 1000 GFLOP/s at 10 flop per byte. Element-wise addition sits at 0.042 flop per byte and 4.2 GFLOP/s, a dot product at 0.125 and 12.5 GFLOP/s, and a 1000 by 1000 matrix multiplication at 83 flop per byte on the flat roof." caption="The roofline for an illustrative machine with a peak of 1 TFLOP/s and 100 GB/s of memory bandwidth. Kernels left of the ridge are limited by memory traffic, whatever their arithmetic; only kernels that reuse data many times, like matrix multiplication, can reach the peak." >}}

Element-wise `c = a + b` on float64 arrays does one addition per 24 bytes (two reads and one write), $I = 0.042$, so on the machine in the figure it cannot exceed 4.2 GFLOP/s, less than half a per cent of peak. A dot product does two operations per 16 bytes, $I = 0.125$. Multiplying two $1000 \times 1000$ matrices does $2n^3 = 2 \times 10^9$ operations on 24 MB of data, $I \approx 83$, far right of the ridge; that is why BLAS reaches near-peak speed and why NumPy's `@` is the fastest thing most Python programs ever run. The model also explains a limit of vectorisation: a chain of NumPy expressions such as `np.sqrt((d ** 2).sum(-1))` makes a separate pass through memory for every operation, each at low intensity, while a compiled loop (Numba, Fortran) computes the whole expression per pair with the numbers still in registers. Converting float64 data to float32 halves the bytes and so doubles the ceiling of every memory-bound kernel.

## Parallelism

A modern workstation has 8 to 64 cores and a cluster node often more, so running work in parallel can multiply throughput. How much it helps is limited by the part of the work that cannot be parallelised, a fact captured by **Amdahl's law**:

{{< eq title="Amdahl's law" say="However many cores you add, the serial part of the work sets a hard ceiling on the speed-up." >}}
$$ \text{speed-up}(N) = \frac{1}{\textcolor{#e64980}{s} + \dfrac{1 - \textcolor{#e64980}{s}}{\textcolor{#4c6ef5}{N}}} \;\xrightarrow{N \to \infty}\; \frac{1}{\textcolor{#e64980}{s}} $$
- $\textcolor{#e64980}{s}$: the fraction of the run time that is inherently serial
- $\textcolor{#4c6ef5}{N}$: the number of cores
{{< /eq >}}

With 5 % serial work, no number of cores can give more than a 20-fold speed-up, and 128 cores give only about 17. Communication between cores adds a cost that grows with their number, so beyond some point adding cores makes a job *slower*. The figure lets you explore both effects.

{{< note type="story" title="An argument for one fast processor" >}}
Gene Amdahl, chief architect of the IBM System/360, presented his argument at the AFIPS Spring Joint Computer Conference in 1967 as a case *against* building machines from many processors: the serial bookkeeping of real programs, he estimated, would keep their speed-up small. The paper is three pages long and contains no equation; the formula that bears his name was written down by others afterwards from his reasoning.
{{< /note >}}

{{< widget name="amdahl" title="Parallel speed-up and its limits" caption="Speed-up against number of cores for a given serial fraction. Add a small communication cost per core and the curve develops a maximum: beyond it, more cores slow the job down. This is why scaling tests come before large cluster runs." >}}

Amdahl's law assumes a fixed problem. In practice, scientists given more cores usually run *bigger* problems: more atoms, more replicas, a finer grid. John Gustafson pointed out in 1988, from experiments on a 1024-processor hypercube at Sandia National Laboratories, that if the serial part stays roughly constant while the parallel part grows with the machine, the speed-up keeps growing:

{{< eq title="Gustafson's law (scaled speed-up)" say="If the problem grows with the machine, the speed-up grows almost in proportion to the number of cores." >}}
$$ \text{scaled speed-up}(N) = \textcolor{#e64980}{s} + (1 - \textcolor{#e64980}{s})\,\textcolor{#4c6ef5}{N} $$
- $\textcolor{#e64980}{s}$: the fraction of the *parallel* run's time spent in serial work
- $\textcolor{#4c6ef5}{N}$: the number of cores
{{< /eq >}}

With $s = 0.05$ and 128 cores, the scaled speed-up is $0.05 + 0.95 \times 128 = 121.7$, against Amdahl's 17.4 for a fixed problem. The two laws do not contradict each other; they answer different questions. **Strong scaling** (fixed problem, Amdahl) asks how much faster one simulation of a 50,000-atom protein gets. **Weak scaling** (problem grows with $N$, Gustafson) asks whether a 64-times-larger membrane runs in the same time on 64 times the cores. A scaling test for an allocation proposal usually reports both.

Python adds one complication of its own. In standard CPython, the **global interpreter lock** (GIL) allows only one thread at a time to execute Python bytecode. Threads therefore do not speed up pure-Python computation, although they are useful for waiting on input and output, and they do help when the work happens inside compiled code that releases the lock, as NumPy's large array operations and BLAS routines do. CPython 3.13 introduced an optional **free-threaded** build without the GIL (PEP 703), which is gradually becoming practical as libraries adapt to it.

{{< fig src="gil.svg" alt="Three timelines of four workers, each with 20 ms of work. Four Python threads take turns in 5 ms slices and finish after 80 ms. Four threads that spend most of their time in NumPy overlap their compiled parts and finish after 23 ms. Four processes run side by side and finish after 20 ms." caption="Four workers, each with 20 ms of CPU work. Pure-Python threads take turns holding the GIL (CPython's default switch interval is 5 ms) and gain nothing; threads that spend most of their time in compiled code that releases the lock run nearly in parallel; processes run fully in parallel, at the price of start-up time and copied data, not shown." >}}

For CPU-bound Python code, the standard approach is to use **processes** instead of threads. Each process has its own interpreter and memory, so there is no lock to share. `concurrent.futures.ProcessPoolExecutor`, `multiprocessing.Pool` and the `joblib` library make it easy to apply a function to many independent inputs in parallel:

```python
from concurrent.futures import ProcessPoolExecutor

def analyse(path):
    ...                                   # read one trajectory, return a number
    return result

if __name__ == "__main__":
    with ProcessPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(analyse, trajectory_files))
```

Many scientific workloads are **embarrassingly parallel** in exactly this way: independent simulations at different temperatures, analysis of separate trajectories, single-point calculations on thousands of structures. The best way to run them on a cluster is often not inside Python at all, but as many separate jobs submitted to the scheduler, for example as a Slurm job array ([the chapter on Linux for simulation](../linux-for-simulation/)). For tightly coupled parallel programs that span many nodes, the standard is **MPI**, available in Python through `mpi4py`, where each process works on part of the problem and they exchange data by passing messages.

Two practical points prevent common surprises. NumPy's linear algebra already uses several threads through its BLAS library; running eight such processes on an eight-core machine can oversubscribe it with 64 threads, which is slower than either alone. Setting `OMP_NUM_THREADS=1` (and the equivalents for OpenBLAS or MKL) in each worker avoids this. And **GPUs** offer another level of parallelism for array arithmetic: CuPy provides a NumPy-compatible array library on NVIDIA GPUs, and PyTorch and JAX run array computations and automatic differentiation on GPUs, which is how machine-learning potentials and [differentiable simulations](../differentiable-md/) reach their speed.

## A checklist

When a Python program is too slow, the following order of steps usually gives the most improvement for the least effort. Measure with a profiler to find the few functions that dominate. Look for a better algorithm or data structure for them: neighbour lists instead of all pairs, sets instead of lists, caching instead of recomputation. Vectorise the inner loops with NumPy. If a loop cannot be vectorised, compile it with Numba, or with Cython or f2py when Numba's subset is too restrictive. Reduce memory traffic with appropriate dtypes and in-place operations. Then parallelise: independent tasks across processes or cluster jobs, array arithmetic on GPUs, and tightly coupled computations with MPI, checking scaling with a small test before committing many cores. At each step, keep the original version and compare results, because a fast program that gives wrong answers is worse than a slow one.

{{< note type="key" >}}
- Measure first: `timeit` for snippets, `cProfile` or `line_profiler` for programs; most time is spent in a few loops.
- Algorithmic improvements (neighbour lists, hashing, caching) beat constant-factor tuning.
- Vectorise with NumPy; compile the remaining hot loops with Numba, Cython or f2py; keep logic in Python and arithmetic in compiled code.
- Amdahl's law: a serial fraction $s$ limits speed-up to $1/s$, and communication costs create an optimum core count.
- The GIL prevents threads from running Python bytecode in parallel; use processes, job arrays or MPI for CPU-bound work, and avoid oversubscribing BLAS threads.
- The roofline model: a kernel with few operations per byte is limited by memory bandwidth, not by arithmetic.
- Gustafson's law: when the problem grows with the machine, speed-up grows almost linearly with cores.
{{< /note >}}

{{< quiz >}}
- q: "What should be done first when a script is too slow?"
  options: ["Rewrite it in C", "Profile it to find where the time is spent", "Run it on more cores"]
  answer: 1
  why: "Without measurement, effort is likely to go into code that does not dominate the run time."
- q: "A job is 10 % serial. What is the largest possible parallel speed-up?"
  options: ["10×", "90×", "Unlimited"]
  answer: 0
  why: "Amdahl's limit is 1/s = 1/0.1 = 10."
- q: "Why do Python threads not speed up a pure-Python numerical loop in standard CPython?"
  options: ["Threads are not supported", "The global interpreter lock lets only one thread execute Python bytecode at a time", "Threads use too much memory"]
  answer: 1
  why: "Use processes (or compiled code that releases the GIL) for CPU-bound parallel work."
- q: "Which tool compiles a NumPy-based Python function with explicit loops to machine code with a single decorator?"
  options: ["cProfile", "Numba", "pandas"]
  answer: 1
  why: "@numba.njit compiles the function, specialised to its argument types, the first time it is called."
- q: "Eight worker processes each run NumPy linear algebra on an 8-core machine and the job is slower than expected. A likely cause is…"
  options: ["The GIL", "Oversubscription: each process's BLAS also starts 8 threads", "NumPy is single-threaded"]
  answer: 1
  why: "Set OMP_NUM_THREADS=1 (or the MKL/OpenBLAS equivalent) in the workers."
- q: "A machine has a peak of 1000 GFLOP/s and 100 GB/s of memory bandwidth. What is the most that `c = a + b` on large float64 arrays can reach?"
  options: ["About 1000 GFLOP/s", "About 4 GFLOP/s", "About 100 GFLOP/s"]
  answer: 1
  why: "One addition per 24 bytes moved gives an intensity of 1/24 flop/byte; 100 GB/s × 1/24 ≈ 4.2 GFLOP/s. The kernel is memory-bound."
- q: "A code is 5 % serial. You run a problem 128 times larger on 128 cores, and the serial part takes the same time as before. Which law describes the speed-up, and roughly what is it?"
  options: ["Amdahl's law, about 17", "Gustafson's law, about 122", "Neither: it is exactly 128"]
  answer: 1
  why: "When the problem grows with the machine, the scaled speed-up is s + (1 − s)N = 0.05 + 0.95 × 128 ≈ 122."
- q: "Why does the vectorised all-pairs NumPy energy become unusable for 100,000 atoms?"
  options: ["NumPy cannot handle more than 65,536 elements", "The N × N × 3 array of differences needs about 240 GB", "Python integers overflow"]
  answer: 1
  why: "100,000² × 3 × 8 bytes = 2.4 × 10¹¹ bytes. Large systems need neighbour lists or block-wise processing."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. M. Gorelick and I. Ozsvald, *High Performance Python*, 2nd ed., O'Reilly (2020).
2. S. K. Lam, A. Pitrou and S. Seibert, "Numba: a LLVM-based Python JIT compiler", *Proceedings of the Second Workshop on the LLVM Compiler Infrastructure in HPC*, 1–6 (2015).
3. S. Behnel, R. Bradshaw, C. Citro, L. Dalcín, D. S. Seljebotn and K. Smith, "Cython: the best of both worlds", *Computing in Science & Engineering* **13**, 31–39 (2011).
4. G. M. Amdahl, "Validity of the single processor approach to achieving large scale computing capabilities", *AFIPS Conference Proceedings* **30**, 483–485 (1967).
5. S. Gross, "PEP 703 – Making the Global Interpreter Lock Optional in CPython" (2023), peps.python.org/pep-0703.
6. L. Dalcín, R. Paz and M. Storti, "MPI for Python", *Journal of Parallel and Distributed Computing* **65**, 1108–1115 (2005).
7. D. E. Knuth, "Structured programming with go to statements", *ACM Computing Surveys* **6**, 261–301 (1974), source of the remark on premature optimisation.
8. J. L. Gustafson, "Reevaluating Amdahl's law", *Communications of the ACM* **31**, 532–533 (1988).
9. S. Williams, A. Waterman and D. Patterson, "Roofline: an insightful visual performance model for multicore architectures", *Communications of the ACM* **52**, 65–76 (2009).
10. M. P. Allen and D. J. Tildesley, *Computer Simulation of Liquids*, 2nd ed., Oxford University Press (2017), chapter 5 (neighbour lists and cell structures).

</div>
