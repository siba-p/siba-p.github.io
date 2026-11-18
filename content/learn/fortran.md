---
title: "Fortran"
description: "Modern Fortran from a first program to modules, array syntax, memory layout and performance, compiler flags for debugging and speed, Makefiles, OpenMP, MPI, LAPACK, and calling Fortran from Python. Every program here was compiled and run."
hook: "VASP, Quantum ESPRESSO and CP2K are written largely in a language first released in 1957. It is still there because it is fast, if you respect its memory layout: here, one swapped pair of loops makes the same arithmetic 4.5 times slower."
objectives:
  - "Write, compile and run modern Fortran organised in modules"
  - "Avoid the literal-precision and integer-division traps with kind parameters"
  - "Explain column-major storage and order loops for contiguous memory access"
  - "Choose compiler flags for debugging and for speed, and build with a Makefile"
  - "Parallelise loops with OpenMP and call LAPACK and Fortran routines from Python"
cover: "cover.svg"
milestones:
  - year: 1957
    text: "John Backus's team at IBM delivers the first FORTRAN compiler, for the IBM 704"
  - year: 1979
    text: "Lawson, Hanson, Kincaid and Krogh publish the BLAS, written in Fortran"
  - year: 1991
    text: "Fortran 90 brings free-form source, modules and whole-array syntax"
  - year: 1997
    text: "The OpenMP Architecture Review Board releases OpenMP 1.0 for Fortran"
track: code
weight: 4
level: Core
minutes: 70
lab: "See column-major memory and loop order"
prereqs: ["linux-shell"]
---

## Why learn Fortran now?

Fortran (FORmula TRANslation, 1957) is the oldest language still in heavy scientific use, and for a good reason: it was designed for one job, fast numerical work on arrays, and compilers have had seventy years to get good at it. Much of the code a computational materials scientist runs every day is written in it: VASP, Quantum ESPRESSO, CP2K, CASTEP, SIESTA and ABINIT for electronic structure, and many weather, climate and engineering codes. Reading, modifying and compiling Fortran is part of the job, even if your own analysis is in Python.

{{< note type="story" title="A compiler nobody believed in" >}}
In 1953 John Backus proposed to his managers at IBM that a program could translate algebraic formulas into machine code for the IBM 704 as efficient as code written by hand. Programmers of the time were sceptical, because every earlier automatic coding system had produced code several times slower. Backus's small team delivered the FORTRAN compiler in April 1957, and its optimiser, which analysed loops and index expressions in detail, generated code that held its own against experts. That design priority, numerical speed first, has carried through every revision of the language since.
{{< /note >}}

The language you will meet is **modern Fortran** (Fortran 90 and later; the current standard is Fortran 2023). It has modules, dynamic arrays, whole-array arithmetic, derived types and built-in parallelism, and it bears little resemblance to the fixed-column FORTRAN 77 of punched cards, which you will still find in older libraries (files ending `.f` or `.F` instead of `.f90`).

## A first program

Save this as `hello.f90`, then compile and run it:

```fortran
program hello
   implicit none
   print *, "Hello from Fortran"
end program hello
```

```bash
gfortran hello.f90 -o hello     # compile and link into an executable called hello
./hello
```

```text
 Hello from Fortran
```

`implicit none` belongs in every program and module. Without it, Fortran silently declares any undeclared variable whose name starts with `i`–`n` as an integer and anything else as a real, so a typo creates a new variable instead of an error.

## Types, kinds and the precision trap

Numerical code needs to say how many bits a number has. The portable way is to take kind parameters from the standard module `iso_fortran_env`:

```fortran
program basics
   use, intrinsic :: iso_fortran_env, only: dp => real64
   implicit none
   real(dp), parameter :: kB = 1.380649e-23_dp     ! J/K, exact since 2019
   real(dp) :: T, E, a, b
   integer  :: ndof
   character(len=*), parameter :: name = "argon"

   T = 300.0_dp
   ndof = 3
   E = 0.5_dp * ndof * kB * T                      ! equipartition: (3/2) kB T
   print '(a, es12.5, a)', "mean kinetic energy of one " // name // " atom: ", E, " J"

   a = 0.1                                         ! a single-precision literal...
   b = 0.1_dp                                      ! ...and a double-precision one
   print '(a, f20.17)', "0.1     stored in a real(dp): ", a
   print '(a, f20.17)', "0.1_dp  stored in a real(dp): ", b
   print '(a, i0)', "integer division 7/2 = ", 7 / 2
end program basics
```

```text
basics.f90:18:48:
   18 |    print '(a, i0)', "integer division 7/2 = ", 7 / 2
      |                                                1
Warning: Integer division truncated to constant '3' at (1) [-Winteger-division]

mean kinetic energy of one argon atom:  6.21292E-21 J
0.1     stored in a real(dp):  0.10000000149011612
0.1_dp  stored in a real(dp):  0.10000000000000001
integer division 7/2 = 3
```

Two classic bugs are visible here.

- **Literal precision.** `0.1` is a *single-precision* constant, accurate to about 7 digits, even when assigned to a double-precision variable. Write `0.1_dp`. A force field parameter typed without its kind suffix silently loses half its digits.
- **Integer division.** `7/2` is 3. Write `7.0_dp/2` when you mean 3.5. The compiler warned us because `-Wall` was on, one of many reasons to always compile with warnings.

{{< note type="try" title="Pause and predict" >}}
The series $\sum 1/i^2$ converges to $\pi^2/6 = 1.6449341$. Add its terms one at a time in a default `real` (single precision, 24-bit significand). How many terms can you add before the sum stops changing?

Once the running sum is about 1.64, its neighbouring representable numbers are $2^{-23} \approx 1.19 \times 10^{-7}$ apart, so any term smaller than half of that, $5.96 \times 10^{-8}$, rounds away to nothing. That happens when $1/i^2 < 2^{-24}$, that is for $i > 2^{12} = 4096$. Compiled with gfortran 12, the loop reports that the sum stops changing at $i = 4097$, at 1.6447253, and adding the next ten million terms leaves it there, with an error of $2.1 \times 10^{-4}$. In double precision the same loop keeps converging until the error is about $1/n$, the neglected tail of the series.
{{< /note >}}

{{< fig src="summation.svg" alt="Log-log plot of the error of the partial sums of 1 over i squared against the number of terms, from 1 to ten million. Both single and double precision fall as 1 over n until n equals 4097, where the single-precision error levels off at about 2 times ten to the minus 4 while double precision continues down to ten to the minus 7." caption="Partial sums of $\sum 1/i^2$ accumulated in single and double precision. From $n = 4097$ each new term is smaller than half the spacing of single-precision numbers near 1.64, so the single-precision sum never changes again. The double-precision error falls as $1/n$, the size of the omitted tail." >}}

The same arithmetic applies to any long accumulation: an energy summed over a million pairs, a mean over a hundred thousand frames, a running time in a long MD run. Accumulate in `real(dp)` even when the data are stored in single precision, as GROMACS does in its default mixed-precision build, which stores most data in single precision but keeps a few critical accumulations in double.

## Arrays: the reason Fortran exists

Arrays are first-class. Whole-array expressions, slices and a large library of intrinsic functions replace most explicit loops:

```fortran
program arrays
   use, intrinsic :: iso_fortran_env, only: dp => real64
   implicit none
   real(dp), allocatable :: x(:), y(:), A(:, :)
   integer :: i, n

   n = 5
   allocate(x(n), y(n), A(3, 3))
   x = [(real(i, dp), i = 1, n)]                   ! array constructor: 1, 2, ..., 5
   y = x**2                                        ! element-wise: no loop needed
   print '(a, 5f8.2)', "x            =", x
   print '(a, 5f8.2)', "x**2         =", y
   print '(a, f8.2)',  "sum(x**2)    =", sum(y)
   print '(a, f8.2)',  "dot(x, x)    =", dot_product(x, x)
   print '(a, 3f8.2)', "x(2:4)       =", x(2:4)    ! a slice

   A = reshape([(real(i, dp), i = 1, 9)], [3, 3])  ! filled column by column
   print '(a)', "A, printed row by row:"
   do i = 1, 3
      print '(3f6.1)', A(i, :)
   end do
   print '(a, 3f8.2)', "A @ [1,1,1]  =", matmul(A, [1.0_dp, 1.0_dp, 1.0_dp])

   where (y > 10.0_dp) y = 10.0_dp                 ! masked assignment
   print '(a, 5f8.2)', "capped at 10 =", y
   deallocate(x, y, A)
end program arrays
```

```text
x            =    1.00    2.00    3.00    4.00    5.00
x**2         =    1.00    4.00    9.00   16.00   25.00
sum(x**2)    =   55.00
dot(x, x)    =   55.00
x(2:4)       =    2.00    3.00    4.00
A, printed row by row:
   1.0   4.0   7.0
   2.0   5.0   8.0
   3.0   6.0   9.0
A @ [1,1,1]  =   12.00   15.00   18.00
capped at 10 =    1.00    4.00    9.00   10.00   10.00
```

Notice two things about `A`. Indices start at **1** by default (you can declare other bounds, such as `real :: psi(-10:10)`). And `reshape` filled it **column by column**: the numbers 1, 2, 3 went down the first column. That is not a quirk of `reshape`; it is how Fortran stores every multidimensional array.

## Memory layout and loop order

Memory is one-dimensional, so a 2D array must be flattened. Fortran stores arrays in **column-major** order: `A(1,1), A(2,1), A(3,1), …, A(1,2), …`, so the *first* index varies fastest. C, C++ and NumPy (by default) use **row-major** order, where the *last* index varies fastest.

This matters for speed. The processor never fetches a single number; it loads a whole **cache line** (64 bytes, eight doubles) at once, and it is fastest when consecutive iterations touch consecutive addresses. The lab shows which loop order does that.

{{< widget name="colmajor" title="Column-major against row-major, and why loop order matters" caption="Top: a 4 × 6 array. Bottom: the same elements in memory order, grouped into cache lines of four elements. Play each loop order: red arcs mark jumps in memory, and the counter shows how many cache lines had to be loaded with a two-line cache." >}}

The rule: **in Fortran, make the innermost loop run over the first index.** On a real machine the effect is large. This program performs exactly the same arithmetic twice, on a 4000 × 4000 array:

```fortran
program loop_order
   use, intrinsic :: iso_fortran_env, only: dp => real64, int64
   implicit none
   integer, parameter :: n = 4000
   real(dp), allocatable :: a(:, :)
   integer :: i, j, rep
   integer(int64) :: t0, t1, rate

   allocate(a(n, n))
   a = 1.0_dp

   call system_clock(t0, rate)
   do rep = 1, 5
      do j = 1, n                  ! outer loop over columns
         do i = 1, n               ! inner loop over rows: consecutive addresses
            a(i, j) = a(i, j) * 1.000001_dp
         end do
      end do
   end do
   call system_clock(t1)
   print '(a, f7.3, a)', "inner loop over i (contiguous): ", real(t1 - t0, dp) / rate, " s"

   call system_clock(t0)
   do rep = 1, 5
      do i = 1, n                  ! outer loop over rows
         do j = 1, n               ! inner loop over columns: jumps of n*8 bytes
            a(i, j) = a(i, j) * 1.000001_dp
         end do
      end do
   end do
   call system_clock(t1)
   print '(a, f7.3, a)', "inner loop over j (strided):    ", real(t1 - t0, dp) / rate, " s"
   print '(a, f12.6)', "checksum: ", sum(a) / n**2
end program loop_order
```

```bash
gfortran -O2 loop_order.f90 -o loop_order && ./loop_order
```

```text
inner loop over i (contiguous):   0.083 s
inner loop over j (strided):      0.390 s
checksum:     1.000010
```

The strided version is about 4.5 times slower on this laptop (an Apple M1), only because of the order in which memory is touched. Whole-array syntax (`a = a * 1.000001_dp`) lets the compiler pick the right order for you.

{{< note type="practice" title="Back of the envelope" >}}
The array holds $4000^2$ doubles, 128 MB, far more than any cache, so every pass streams it from main memory. The contiguous loop reads and writes 128 MB five times, 1.28 GB in 0.083 s: 15 GB/s, close to what one core of the laptop can draw from memory. It is limited by bandwidth, not arithmetic. In the strided loop, consecutive iterations are $4000 \times 8$ bytes = 32 kB apart, so each 64-byte cache line delivers one useful number instead of eight; the processor's prefetchers recover part of the loss by spotting the regular stride. How much they recover depends on the chip: on the AMD EPYC server used to check this chapter, the same program takes 0.059 s and 0.15 s, a factor of 2.6. The ranking never reverses.
{{< /note >}}

{{< note type="warn" title="Passing arrays between Fortran and C or NumPy" >}}
A NumPy array of shape `(n, 3)` in the default (C) order has the same bytes as a Fortran array `x(3, n)`. Either transpose the shape when you declare it in Fortran, or create the array with `order="F"` / `np.asfortranarray`. Mixing this up gives no error, just wrong numbers.
{{< /note >}}

{{< fig src="interop.svg" alt="Top: a NumPy array of shape 4 by 3, one row per atom, and a Fortran array x of shape 3 by 4, one column per atom, both mapping onto the same row of twelve memory cells x1 y1 z1 x2 y2 z2 and so on. Bottom: the same memory declared in Fortran as x of shape 4 by 3 scrambles the atoms, so that its first row reads x1, y2, z3, x4." caption="A C-ordered NumPy array of shape $(n, 3)$ and a Fortran array `x(3, n)` describe the same bytes in memory. Declaring the Fortran array as `x(n, 3)` instead reads those bytes down the wrong columns and mixes coordinates of different atoms, with no error message." >}}

## Procedures and modules

Real programs are split into **subroutines** (which act through their arguments) and **functions** (which return a value), placed inside **modules**. A module gives the compiler an *explicit interface*: it can check every call for the right number, type and shape of arguments. The `intent` attribute documents and enforces which arguments are inputs and outputs.

Here is a Lennard-Jones energy and force routine with periodic boundaries, in a module, the same physics as [the molecular dynamics lesson](../molecular-dynamics/):

```fortran
module lj_mod
   use, intrinsic :: iso_fortran_env, only: dp => real64
   implicit none
   private
   public :: dp, lj_energy_forces

contains

   subroutine lj_energy_forces(x, box, rc, energy, f)
      real(dp), intent(in)  :: x(:, :)       ! positions, shape (3, n), reduced units
      real(dp), intent(in)  :: box, rc       ! cubic box length and cut-off
      real(dp), intent(out) :: energy
      real(dp), intent(out) :: f(:, :)       ! forces, shape (3, n)
      integer  :: i, j, n
      real(dp) :: d(3), r2, ir6, ff, ec

      n = size(x, 2)
      energy = 0.0_dp
      f = 0.0_dp
      ec = 4.0_dp * (rc**(-12) - rc**(-6))   ! shift so that the energy is zero at rc
      do i = 1, n - 1
         do j = i + 1, n
            d = x(:, i) - x(:, j)
            d = d - box * anint(d / box)     ! minimum-image convention
            r2 = sum(d * d)
            if (r2 < rc * rc) then
               ir6 = 1.0_dp / r2**3
               energy = energy + 4.0_dp * ir6 * (ir6 - 1.0_dp) - ec
               ff = 24.0_dp * ir6 * (2.0_dp * ir6 - 1.0_dp) / r2
               f(:, i) = f(:, i) + ff * d
               f(:, j) = f(:, j) - ff * d
            end if
         end do
      end do
   end subroutine lj_energy_forces

end module lj_mod
```

and a main program that builds a 256-atom fcc crystal and calls it:

```fortran
program lj
   use lj_mod, only: dp, lj_energy_forces
   implicit none
   integer, parameter :: m = 4, n = 4 * m**3          ! 4 x 4 x 4 fcc cells: 256 atoms
   real(dp), parameter :: rho = 0.8442_dp
   real(dp), parameter :: basis(3, 4) = reshape([0.0_dp, 0.0_dp, 0.0_dp,  0.5_dp, 0.5_dp, 0.0_dp, &
                                                 0.5_dp, 0.0_dp, 0.5_dp,  0.0_dp, 0.5_dp, 0.5_dp], [3, 4])
   real(dp) :: x(3, n), f(3, n), a, box, e
   integer  :: i, j, k, b, p

   a = (4.0_dp / rho)**(1.0_dp / 3.0_dp)               ! lattice constant for this density
   box = m * a
   p = 0
   do k = 0, m - 1
      do j = 0, m - 1
         do i = 0, m - 1
            do b = 1, 4
               p = p + 1
               x(:, p) = a * ([real(i, dp), real(j, dp), real(k, dp)] + basis(:, b))
            end do
         end do
      end do
   end do

   call lj_energy_forces(x, box, 2.5_dp, e, f)
   print '(a, i0, a, f6.4)', "atoms: ", n, ", fcc lattice at density ", rho
   print '(a, f10.5)', "potential energy per atom: ", e / n
   print '(a, es10.2)', "largest force component (zero by symmetry): ", maxval(abs(f))
end program lj
```

```bash
gfortran -O2 -Wall -c lj_mod.f90      # produces lj_mod.o and lj_mod.mod
gfortran -O2 -Wall -c lj_main.f90     # needs lj_mod.mod, so compile the module first
gfortran -o lj lj_mod.o lj_main.o     # link
./lj
```

```text
atoms: 256, fcc lattice at density 0.8442
potential energy per atom:   -6.33281
largest force component (zero by symmetry):   2.42E-14
```

On a perfect lattice every atom's force cancels by symmetry, so the largest force is rounding noise: a free correctness test of the force code.

{{< note type="warn" title="Myth" >}}
**Myth:** Fortran is faster than C because the language itself is faster.
**Reality:** gfortran and gcc share the same optimiser and code generator, as do Intel's `ifx` and `icx`, which are both built on LLVM. The difference lies in what the compiler is allowed to assume. The Fortran standard forbids a procedure from modifying an argument through one name while reading it through another, so in `lj_energy_forces` the compiler may assume that `x` and `f` do not overlap and can keep values in registers and use vector instructions freely. In C, two pointer arguments might point into the same array, and the compiler must be conservative unless the programmer adds `restrict`. Add native multidimensional arrays with known shapes, and the same algorithm written plainly tends to optimise well in Fortran with less effort. A careful C or C++ programmer can match it.
{{< /note >}}

## Compiling: the flags that matter

| Purpose | gfortran | Intel (`ifx`) |
|---|---|---|
| Warnings | `-Wall -Wextra` | `-warn all` |
| Standard conformance | `-std=f2018` | `-stand f18` |
| Debugging symbols | `-g` | `-g` |
| Array bounds and other runtime checks | `-fcheck=all` (or `=bounds`) | `-check all` |
| Stack trace on a crash | `-fbacktrace` | `-traceback` |
| Stop at NaN, division by zero, overflow | `-ffpe-trap=invalid,zero,overflow` | `-fpe0` |
| Optimisation | `-O2`, `-O3` | `-O2`, `-O3` |
| Use every instruction of this CPU | `-march=native` | `-xHost` |
| OpenMP | `-fopenmp` | `-qopenmp` |
| Double-precision default reals (legacy codes) | `-fdefault-real-8` | `-r8` |

Develop with the debug set and run production with the optimised set. Most "the code gives garbage" problems in scientific Fortran are out-of-bounds array accesses that `-fcheck=all` turns into an immediate, located error message.

{{< fig src="build.svg" alt="Diagram of a Fortran build. lj_mod.f90 compiles to lj_mod.o and lj_mod.mod. Compiling lj_main.f90 reads lj_mod.mod and produces lj_main.o. The linker combines both object files with libraries such as liblapack and libgfortran into the executable lj." caption="Compiling and linking are separate steps. Compiling a module writes a `.mod` file that every file using the module needs, which fixes the build order; the linker then resolves calls between object files and libraries." >}}

The two stages fail in recognisably different ways. A compile error names a file and line: `Fatal Error: Cannot open module file ‘lj_mod.mod’ for reading` means a file that uses a module was compiled before the module itself. A link error names a missing symbol instead: compiling the LAPACK example without `-llapack` gives `undefined reference to 'dgesv_'`. The trailing underscore is gfortran's naming convention for external procedures, and the message means that no object file or library on the command line provides that routine. The fix is a library flag, and on a cluster usually a `module load` of the library first.

The optimisation levels deserve a sentence each. `-O2` turns on the standard optimisations: keeping variables in registers, removing redundant work, scheduling instructions; at `-O3`, gfortran also unrolls and vectorises loops more aggressively (gfortran 12 and later already vectorise at `-O2`, more cautiously). Vectorised code applies one instruction to several numbers at once: four doubles with AVX2, eight with AVX-512. `-march=native` allows every instruction of the machine you compile on, which brings two hazards. A binary built on a new login node may contain AVX-512 instructions that an older compute node lacks; it then dies with `Illegal instruction` and exit status 132 (128 + 4, SIGILL). Compile on the compute nodes, or name the target explicitly, for example `-march=znver3`. And `-Ofast` or `-ffast-math` lets the compiler reorder floating-point operations as if they were associative, which changes results in the last digits and can break code that tests for NaN. Use them only after comparing results with and without.

## Reading a crash

Here is the out-of-bounds bug in its most common form, from a radial distribution function code. Distances are binned into 50 bins up to $r_\text{max} = 5$, and one distance is exactly $r_\text{max}$:

```fortran
program histo
   use, intrinsic :: iso_fortran_env, only: dp => real64
   implicit none
   integer, parameter :: nbins = 50
   real(dp), parameter :: rmax = 5.0_dp, dr = rmax / nbins
   integer  :: hist(nbins), k, bin
   real(dp) :: r(4)

   r = [0.31_dp, 2.27_dp, 4.95_dp, 5.0_dp]    ! the last distance is exactly rmax
   hist = 0
   do k = 1, size(r)
      bin = int(r(k) / dr) + 1                ! r = rmax gives bin 51
      hist(bin) = hist(bin) + 1
   end do
   print '(a, i0)', "distances counted: ", sum(hist)
end program histo
```

Built with `-O2 -Wall`, it compiles without a warning, runs, exits with status 0 and prints `distances counted: 3`. The fourth count went into whatever memory follows `hist`. Rebuilt with `-g -fcheck=all -fbacktrace`, it stops at the faulty line:

```text
At line 13 of file histo.f90
Fortran runtime error: Index '51' of dimension 1 of array 'hist' above upper bound of 50

Error termination. Backtrace:
...
```

followed by a backtrace that names the same line and the calling routines, and an exit status of 2. The fix is a decision about the boundary, `bin = min(int(r(k) / dr) + 1, nbins)` or skipping `r >= rmax`, not a larger array.

Floating-point errors are trapped the same way. A squared distance that rounding has made slightly negative, say $-10^{-12}$, gives `NaN` from `sqrt`, and the NaN then spreads silently through every sum it touches. With `-ffpe-trap=invalid,zero,overflow` the program stops at the first invalid operation with `Program received signal SIGFPE: Floating-point exception - erroneous arithmetic operation.`, a backtrace, and exit status 136, which is 128 + 8, the signal number of SIGFPE; [the bash chapter](../how-bash-works/) explains the convention. For crashes that the runtime checks do not catch, `gdb ./program core` or `valgrind ./program` are the next tools.

A **Makefile** records how to build a program, rebuilds only what changed, and handles the module order. This one builds the Lennard-Jones example (the indented lines must start with a tab):

```makefile
# Makefile for the Lennard-Jones example. Usage: make, make debug, make clean
FC      = gfortran
FFLAGS  = -O2 -march=native -Wall
DEBUG   = -O0 -g -fcheck=all -fbacktrace -ffpe-trap=invalid,zero,overflow -Wall -Wextra
OBJ     = lj_mod.o lj_main.o

lj: $(OBJ)
	$(FC) $(FFLAGS) -o $@ $(OBJ)

# a module must be compiled before any file that uses it
lj_main.o: lj_mod.o

%.o: %.f90
	$(FC) $(FFLAGS) -c $<

debug: FFLAGS = $(DEBUG)
debug: clean lj

clean:
	rm -f *.o *.mod lj

.PHONY: debug clean
```

`make` builds an optimised `lj`; `make debug` rebuilds it with all runtime checks; `make clean` removes the build files. Larger projects use CMake or the Fortran Package Manager (`fpm`), which find dependencies and module order automatically.

## Parallel Fortran

**OpenMP** parallelises loops over the cores of one node with compiler directives, comment lines that start with `!$omp`:

```fortran
program omp_sum
   use, intrinsic :: iso_fortran_env, only: dp => real64
   use omp_lib
   implicit none
   integer, parameter :: n = 200000000
   integer  :: i
   real(dp) :: s, t0

   s = 0.0_dp
   t0 = omp_get_wtime()
   !$omp parallel do reduction(+:s)
   do i = 1, n
      s = s + 1.0_dp / real(i, dp)**2       ! each thread sums its share; reduction combines them
   end do
   !$omp end parallel do
   print '(a, i0, a, f6.3, a)', "threads: ", omp_get_max_threads(), ",  time: ", omp_get_wtime() - t0, " s"
   print '(a, f12.9, a, f12.9)', "sum 1/i^2 = ", s, "   pi^2/6 = ", acos(-1.0_dp)**2 / 6
end program omp_sum
```

```bash
gfortran -O2 -fopenmp omp_sum.f90 -o omp_sum
OMP_NUM_THREADS=1 ./omp_sum
OMP_NUM_THREADS=8 ./omp_sum
```

```text
threads: 1,  time:  0.569 s
sum 1/i^2 =  1.644934058   pi^2/6 =  1.644934067
threads: 8,  time:  0.091 s
sum 1/i^2 =  1.644934062   pi^2/6 =  1.644934067
```

OpenMP follows a fork–join model: at `!$omp parallel do` the master thread starts a team of threads, the loop's iterations are divided among them (with gfortran's default schedule, in equal contiguous chunks), and at the end of the loop the threads synchronise and only the master continues. Variables are shared between threads unless declared `private`; the loop index is private automatically.

Eight threads give a 6.2-fold speed-up. Look closely at the sums: they differ in the ninth digit. Each thread adds its own share and the partial sums are combined at the end, so the order of additions changes, and **floating-point addition is not associative**. Parallel results differing in the last digits from serial ones is normal; differing in the third digit is a bug, usually a variable that should have been `private` or a missing `reduction`.

Delete the `reduction(+:s)` clause and the program still compiles and runs, but all eight threads now update the one shared `s`. Three runs on eight threads printed sums of 0.000000001, 0.000000002 and 0.000000003; one thread gives the correct 1.644934058. With optimisation, each thread keeps its running total in a register and stores it at the end, so the printed value is roughly the partial sum of whichever thread stored last. Without optimisation, the threads overwrite each other's updates throughout, and the answer is a different wrong number every time. This is a **race condition**: the result depends on the timing of threads, which no compiler error or warning reveals. Two habits find them: write `default(none)` on every parallel region, which forces you to declare each variable `shared`, `private` or a reduction, and check that one thread and eight threads agree to within rounding.

**MPI** (message passing) parallelises across many nodes. Each process owns part of the data and exchanges messages explicitly; this is how VASP, Quantum ESPRESSO and CP2K run on thousands of cores. Programs are compiled with a wrapper and launched with `mpirun` or, inside a Slurm job, `srun`:

```bash
mpif90 -O2 my_mpi_code.f90 -o my_mpi_code
mpirun -np 64 ./my_mpi_code
```

The usual pattern is **domain decomposition**. In a plane-wave DFT code the work is divided among processes by bands, $k$-points or slices of the Fourier grid, and in molecular dynamics each process owns the atoms in one region of the box and exchanges a thin layer of neighbouring atoms with adjacent regions each step. Communication grows with the surface of a domain and computation with its volume, so a domain must stay large enough for computation to dominate: that ratio sets how many processes a given system can use efficiently. OpenMP and MPI are often combined, with a few MPI processes per node and OpenMP threads inside each, which is what the `--ntasks` and `--cpus-per-task` settings of [a Slurm job script](../linux-for-simulation/#job-scripts) describe.

## Do not write your own linear algebra

BLAS (vector and matrix operations) and LAPACK (linear systems, eigenvalues, factorisations) are decades-tested and heavily optimised (OpenBLAS, Intel MKL, Apple Accelerate). Calling them is easy:

```fortran
program solve
   use, intrinsic :: iso_fortran_env, only: dp => real64
   implicit none
   integer, parameter :: n = 3
   real(dp) :: A(n, n), b(n)
   integer  :: ipiv(n), info
   external :: dgesv                                  ! from LAPACK

   A = reshape([4.0_dp, 1.0_dp, 2.0_dp,  1.0_dp, 5.0_dp, 1.0_dp,  2.0_dp, 1.0_dp, 6.0_dp], [n, n])
   b = [1.0_dp, 2.0_dp, 3.0_dp]
   call dgesv(n, 1, A, n, ipiv, b, n, info)           ! solves A x = b; b is overwritten by x
   if (info /= 0) error stop "dgesv failed"
   print '(a, 3f10.6)', "x = ", b
end program solve
```

```bash
gfortran -O2 solve.f90 -o solve -llapack     # on HPC systems often -lopenblas, or MKL flags
./solve
```

```text
x =  -0.063830  0.319149  0.468085
```

The same answer as `numpy.linalg.solve`, which calls the same LAPACK routine underneath.

## Calling Fortran from Python

`f2py`, part of NumPy, wraps Fortran routines as a Python module, the best of both worlds: Python for workflow and analysis, Fortran for the hot loop.

```fortran
! ljf.f90: a Fortran routine to call from Python
subroutine lj_energy(x, n, box, rc, energy)
   implicit none
   integer, intent(in) :: n
   double precision, intent(in) :: x(3, n), box, rc
   double precision, intent(out) :: energy
   integer :: i, j
   double precision :: d(3), r2, ir6
   energy = 0.0d0
   do i = 1, n - 1
      do j = i + 1, n
         d = x(:, i) - x(:, j)
         d = d - box * anint(d / box)
         r2 = sum(d * d)
         if (r2 < rc * rc) then
            ir6 = 1.0d0 / r2**3
            energy = energy + 4.0d0 * ir6 * (ir6 - 1.0d0)
         end if
      end do
   end do
end subroutine lj_energy
```

```bash
pip install meson ninja                 # f2py's build backend on Python >= 3.12
python -m numpy.f2py -c ljf.f90 -m ljf  # builds ljf.cpython-*.so
```

```python
import numpy as np
import ljf                                    # the extension module built by f2py

# 216 atoms on a simple cubic lattice (spacing 1.12) in a periodic box
g = np.arange(6) * 1.12
x = np.array(np.meshgrid(g, g, g, indexing="ij")).reshape(3, -1)   # shape (3, n), as Fortran expects
box, rc = 6 * 1.12, 2.5

e = ljf.lj_energy(np.asfortranarray(x), box, rc)   # n is inferred from the array shape

d = x[:, :, None] - x[:, None, :]                  # the same sum in NumPy, for comparison
d -= box * np.round(d / box)
r2 = (d ** 2).sum(0)[np.triu_indices(x.shape[1], 1)]
r2 = r2[r2 < rc ** 2]
print(f"Fortran: {e:.8f}   NumPy: {np.sum(4 * (r2 ** -6 - r2 ** -3)):.8f}")
print(ljf.lj_energy.__doc__.splitlines()[0])
```

```text
Fortran: -1039.38039581   NumPy: -1039.38039581
energy = lj_energy(x,box,rc,[n])
```

f2py inferred that `n` can be taken from the shape of `x`, so the Python call has one fewer argument; the docstring line shows the generated signature.

The standard route to C, and through C to Python's `ctypes`, Julia or Rust, is the `iso_c_binding` module of Fortran 2003. Declaring a procedure `bind(c, name="lj_energy")` with arguments of kinds such as `c_double` and `c_int` fixes its symbol name and calling convention, so no trailing-underscore guesswork is needed and any language with a C interface can call it. Arrays still cross the boundary as raw memory, so the layout rule of the figure above applies unchanged.

## Reading older Fortran

Much of LAPACK, many force-field and quantum chemistry libraries, and the oldest parts of large codes are in FORTRAN 77 fixed form (`.f` files). The format comes from 80-column punched cards. Column 1 holds `C` or `*` for a comment; columns 1 to 5 hold an optional numeric statement label; any character in column 6 marks a continuation of the previous line; statements live in columns 7 to 72; and columns 73 to 80, once used for card sequence numbers, are ignored. A statement that runs past column 72 is silently truncated, a classic source of bugs when such code is edited with a modern editor.

```fortran
C     Sum of squares, FORTRAN 77 fixed form
      DOUBLE PRECISION FUNCTION SUMSQ(X, N)
      INTEGER N, I
      DOUBLE PRECISION X(N)
      SUMSQ = 0.0D0
      DO 10 I = 1, N
         SUMSQ = SUMSQ + X(I)**2
   10 CONTINUE
      RETURN
      END
```

Other features to recognise: `REAL*8` and `DOUBLE PRECISION` for 64-bit reals; `D0` exponents in constants such as `1.0D0`; `COMMON` blocks, named areas of global memory shared between routines by position rather than by name, so that a change in one declaration silently misaligns every other; `EQUIVALENCE`, which overlays variables in memory; and implicit typing, since `IMPLICIT NONE` was not part of the 1977 standard. Modern compilers still accept all of it, and fixed-form and free-form files can be compiled and linked into the same program. When modifying such code, add `IMPLICIT NONE` routine by routine and compile with `-Wall -fcheck=all` before changing any numbers.

{{< note type="key" >}}
- Always `implicit none`, always kind suffixes (`1.0_dp`), always modules.
- Fortran is column-major and 1-based: the innermost loop should run over the first index.
- Develop with `-g -fcheck=all -fbacktrace -Wall`, run with `-O2 -march=native`.
- Use BLAS/LAPACK and whole-array syntax instead of hand-written loops where possible.
- Accumulate long sums in double precision: a single-precision sum of $1/i^2$ stops changing after 4096 terms.
- Compile errors name a line; link errors name a missing symbol and need a library flag.
- A missing `reduction` or `private` gives a race condition: a different wrong answer each run, with no warning.
{{< /note >}}

{{< quiz >}}
- q: "A Fortran loop nest updates `a(i, j)` with the outer loop over `i` and the inner loop over `j`. Why is it slow for large arrays?"
  options: ["Because Fortran loops are slow", "Because Fortran stores arrays column-major, so consecutive `j` values are a whole column apart in memory and each access may need a new cache line", "Because `j` is not declared"]
  answer: 1
  why: "In column-major storage, `a(i, j)` and `a(i, j+1)` are n elements apart. Swapping the loops makes consecutive iterations touch consecutive memory."
- q: "`real(dp) :: x = 0.1` prints 0.10000000149011612. Why?"
  options: ["Fortran cannot represent 0.1", "The literal 0.1 is single precision; it is rounded to about 7 digits before being stored in the double variable", "The print format is wrong"]
  answer: 1
  why: "Literals without a kind are default (single-precision) reals. Write `0.1_dp` to get the double-precision value."
- q: "Your program sometimes crashes with a segmentation fault and sometimes gives garbage. What should you try first?"
  options: ["Increase the optimisation level", "Recompile with `-g -fcheck=all -fbacktrace` to catch out-of-bounds accesses with a file and line number", "Rewrite it in Python"]
  answer: 1
  why: "Out-of-bounds array accesses are the most common cause of such symptoms in Fortran. Runtime checks turn them into a precise error message."
- q: "The OpenMP sum with 8 threads differs from the serial sum in the 9th significant digit. What does that indicate?"
  options: ["A race condition", "Nothing alarming: the additions happen in a different order, and floating-point addition is not associative", "The compiler is broken"]
  answer: 1
  why: "Reductions combine partial sums in a different order. Differences at the level of rounding error are expected; large differences would indicate a bug."
- q: "Linking fails with `undefined reference to 'dgesv_'`. What is missing?"
  options: ["The `implicit none` statement", "A library that provides `dgesv`, such as `-llapack` or `-lopenblas`", "The `.mod` file for LAPACK"]
  answer: 1
  why: "The linker could not find the routine in any object file or library on the command line. Compile errors would name a source line instead."
- q: "A program built with `-march=native` on a login node dies on a compute node with `Illegal instruction` (exit status 132). Why?"
  options: ["The compute node has less memory", "The binary uses instructions, such as AVX-512, that the compute node's processor lacks", "The program has an array out of bounds"]
  answer: 1
  why: "`-march=native` targets the processor that compiled the code. 132 = 128 + 4, SIGILL. Compile on the compute node or choose a target with `-march`."
- q: "In FORTRAN 77 fixed form, what happens to text in columns 73 to 80?"
  options: ["It continues the statement", "It is ignored, so a long statement is silently truncated", "It is treated as a comment only if it starts with C"]
  answer: 1
  why: "Columns 73 to 80 held card sequence numbers and are ignored by the compiler; code that spills into them is lost without an error."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. M. Metcalf, J. Reid and M. Cohen, *Modern Fortran Explained: Incorporating Fortran 2018*, Oxford University Press (2018).
2. M. Curcic, *Modern Fortran: Building Efficient Parallel Applications*, Manning (2020).
3. S. J. Chapman, *Fortran for Scientists and Engineers*, 4th ed., McGraw-Hill (2018).
4. fortran-lang.org: tutorials, the Fortran Package Manager (fpm) and the standard library project.
5. W. H. Press, S. A. Teukolsky, W. T. Vetterling and B. P. Flannery, *Numerical Recipes in Fortran 90*, Cambridge University Press (1996).
6. E. Anderson et al., *LAPACK Users' Guide*, 3rd ed., SIAM (1999).
7. R. Chandra, L. Dagum, D. Kohr, D. Maydan, J. McDonald and R. Menon, *Parallel Programming in OpenMP*, Morgan Kaufmann (2001).
8. W. Gropp, E. Lusk and A. Skjellum, *Using MPI*, 3rd ed., MIT Press (2014).
9. U. Drepper, “What every programmer should know about memory” (2007), the classic account of caches and memory access patterns.
10. P. Peterson, “F2PY: a tool for connecting Fortran and Python programs,” *International Journal of Computational Science and Engineering* **4**, 296–305 (2009).
11. J. W. Backus et al., “The FORTRAN automatic coding system,” *Proceedings of the Western Joint Computer Conference*, 188–198 (1957).
12. C. L. Lawson, R. J. Hanson, D. R. Kincaid and F. T. Krogh, “Basic Linear Algebra Subprograms for Fortran usage,” *ACM Transactions on Mathematical Software* **5**, 308–323 (1979).
13. D. Goldberg, “What every computer scientist should know about floating-point arithmetic,” *ACM Computing Surveys* **23**, 5–48 (1991).

</div>
