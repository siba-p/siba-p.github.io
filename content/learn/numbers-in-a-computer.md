---
title: "Numbers in a computer"
description: "Bits and bytes, integers and their overflow, and floating-point numbers bit by bit: why 0.1 + 0.2 is not 0.3, what machine epsilon means, and the rounding traps that bite real simulations and neural networks."
hook: "Add 0.1 to a running total ten million times in single precision and you get 1,087,937, not one million. The error is no accident, and by the end of this chapter you can predict it."
objectives:
  - "Read integers in binary and two's complement, and predict when they overflow"
  - "Decode an IEEE 754 float into its sign, exponent and fraction bits"
  - "Explain machine epsilon and why the gaps between floats grow with their size"
  - "Recognise catastrophic cancellation and summation error, and rewrite formulas to avoid them"
  - "Explain why GPU simulation and training codes use mixed precision"
track: machine
weight: 2
level: Foundation
minutes: 40
lab: "Flip the bits of an integer and a float"
prereqs: ["inside-a-computer"]
---

## Everything is bits

Memory stores only two states per cell, written 0 and 1: a **bit**. Eight bits make a **byte**. Every number, letter, image and instruction is a pattern of bits, and the *meaning* of a pattern depends entirely on how a program agrees to read it. The same 32 bits can be an integer, a floating-point number, four letters of text or an instruction. Most of the numerical surprises in scientific computing come from forgetting how these patterns work.

## Integers

Bits read as an ordinary binary number weigh powers of two, exactly as decimal digits weigh powers of ten:

{{< eq title="Binary place value" say="Each bit is worth twice the one to its right." >}}
$$ \textcolor{#4c6ef5}{n} = \sum_{k=0}^{N-1} \textcolor{#12a594}{b_k}\,\textcolor{#f08c2e}{2^{k}}, \qquad 101010_2 = 32 + 8 + 2 = 42 $$
- $\textcolor{#12a594}{b_k}$: the bit in position $k$, 0 or 1
- $\textcolor{#f08c2e}{2^{k}}$: its weight
- $N$: number of bits; $N$ bits give $2^{N}$ different patterns
{{< /eq >}}

To represent negative numbers, computers use **two's complement**: the leftmost bit counts as $-2^{N-1}$ instead of $+2^{N-1}$. In 8 bits it is worth $-128$, so the range runs from $-128$ to $+127$. The beauty of the scheme is that the hardware adds signed and unsigned numbers with exactly the same circuit. The price is that arithmetic **wraps around** silently when it leaves the range: $127 + 1$ gives $-128$.

{{< widget name="floatbits" title="Bits, integers and floating-point numbers" caption="Click any bit to flip it, or type a number. In integer mode, try 127 and 128, and 100 + 100. In floating-point mode, try 0.1, 16777217 and the smallest number." >}}

{{< note type="try" >}}
In integer mode, set all eight bits to 1: unsigned, that is 255; in two's complement, −1. In floating-point mode, start from **1** and flip the leftmost exponent bit: all eight exponent bits become 1 and the number turns into infinity. Then press **smallest**: 1e-45 is stored as 1.4 × 10⁻⁴⁵, a 40 percent error, because a subnormal this small has a single significant bit.
{{< /note >}}

Real programs use 32-bit integers (up to about $2.1\times10^9$) or 64-bit ones (up to $9.2\times10^{18}$). The 32-bit limit is not academic: a simulation of more than two billion atoms, or a counter of steps × atoms, overflows it, and codes such as LAMMPS have build options for 64-bit indices for exactly this reason.

{{< note type="story" >}}
On 4 June 1996 the first Ariane 5 rocket broke up less than forty seconds after lift-off. Its inertial reference software, reused from Ariane 4, converted a 64-bit floating-point value related to the horizontal velocity into a 16-bit signed integer. On Ariane 5's faster trajectory the value exceeded 32,767, the conversion failed, and the main and backup units, running identical code, both shut down. On Ariane 4 the value could never grow that large, so the conversion had been left unprotected.
{{< /note >}}

## Floating-point numbers

Scientific quantities span enormous ranges, from $10^{-23}$ J for $k_B$ to $10^{23}$ for Avogadro's number, so computers store real numbers in a binary form of **scientific notation**: a sign, a few significant digits, and an exponent. The universal standard is **IEEE 754** (first published 1985). Before it, each manufacturer had its own formats and rounding rules, and the same program could give different answers on different machines. The standard's principal architect, William Kahan, received the 1989 Turing Award. A 32-bit single-precision number is three fields:

{{< eq title="An IEEE 754 single-precision number" say="Sign, times one point something in binary, times two to a power." >}}
$$ x = (-1)^{\textcolor{#e64980}{s}} \times \big(1.\textcolor{#12a594}{f_1 f_2 \dots f_{23}}\big)_2 \times 2^{\,\textcolor{#4c6ef5}{e} - 127} $$
- $\textcolor{#e64980}{s}$: 1 sign bit
- $\textcolor{#4c6ef5}{e}$: 8 exponent bits, stored with an offset (bias) of 127
- $\textcolor{#12a594}{f}$: 23 fraction bits; the leading 1 is implied, giving 24 significant bits
{{< /eq >}}

Two patterns of the exponent are reserved: all zeros encode zero and the **subnormal** numbers that fill the gap near zero, and all ones encode $\pm\infty$ and **NaN** (not a number, the result of $0/0$ or $\sqrt{-1}$). The 64-bit double precision used for most scientific work has the same structure with 11 exponent bits and 52 fraction bits:

| Format | Bits (sign, exponent, fraction) | Significant decimal digits | Largest value | Typical use |
|---|---|---|---|---|
| half (FP16) | 1, 5, 10 | about 3 | 65504 | neural-network training and inference |
| bfloat16 | 1, 8, 7 | about 2 | $3\times10^{38}$ | neural-network training |
| single (FP32) | 1, 8, 23 | about 7 | $3.4\times10^{38}$ | GPU molecular dynamics (mixed with double), graphics |
| double (FP64) | 1, 11, 52 | about 16 | $1.8\times10^{308}$ | most scientific computing |

### Decoding a float by hand

Take −6.25. In binary, 6 is $110_2$ and a quarter is $0.01_2$, so $6.25 = 110.01_2$. Normalise it by moving the binary point two places to the left, exactly as you would write 625 as $6.25\times10^2$: $110.01_2 = 1.1001_2 \times 2^2$. Now read off the three fields.

- **Sign.** The number is negative, so the sign bit is 1.
- **Exponent.** The power is 2, stored with the bias as $2 + 127 = 129 = 10000001_2$.
- **Fraction.** The digits after the point, 1001, padded with zeros to 23 bits. The leading 1 is not stored.

Together the 32 bits read `1 10000001 10010000000000000000000`, or `C0C80000` in hexadecimal. Type −6.25 into the lab to check. Because 6.25 is a sum of powers of two, it is stored exactly; most decimal fractions are not, as the next section shows.

## Why 0.1 is not exactly 0.1

Only fractions whose denominator is a power of two can be written exactly in binary. One tenth is $0.000110011001100\ldots_2$, repeating forever, so it is **rounded** to the nearest representable number. In the lab, type 0.1 in floating-point mode: the stored value is 0.100000001490116…, a relative error of about $1.5\times10^{-8}$.

The spacing between neighbouring floats grows with their size. The key number is **machine epsilon**, the gap between 1 and the next larger number:

{{< eq title="Machine epsilon and relative precision" say="Every operation can be wrong by about half an epsilon, relative to its result." >}}
$$ \textcolor{#845ef7}{\varepsilon_{\text{mach}}} = 2^{-p+1}, \qquad \operatorname{fl}(a \circ b) = (a \circ b)(1 + \textcolor{#e64980}{\delta}), \quad |\textcolor{#e64980}{\delta}| \le \tfrac12\textcolor{#845ef7}{\varepsilon_{\text{mach}}} $$
- $\textcolor{#845ef7}{\varepsilon_{\text{mach}}}$: $1.19\times10^{-7}$ in single, $2.22\times10^{-16}$ in double
- $p$: significant bits (24 or 53)
- $\textcolor{#e64980}{\delta}$: the rounding error of one operation $\circ$ (+, −, ×, ÷)
{{< /eq >}}

So above $2^{24} = 16\,777\,216$, single precision cannot even represent every integer: type 16777217 in the lab and it becomes 16777216.

### A ruler whose marks spread out

Picture the floats as marks on a ruler. Between 1 and 2 there are $2^{23}$, about 8.4 million, evenly spaced single-precision marks, $1.19\times10^{-7}$ apart. Between 2 and 4 there are exactly as many, so they are twice as far apart, and every further doubling in size doubles the gap again. The *relative* spacing stays roughly constant, which is the point of floating point, but the *absolute* spacing grows without limit:

| Value | Gap to the next float32 | Gap to the next float64 |
|---|---|---|
| 1 | $1.2\times10^{-7}$ | $2.2\times10^{-16}$ |
| 1,000 | $6.1\times10^{-5}$ | $1.1\times10^{-13}$ |
| $10^{6}$ | 0.0625 | $1.2\times10^{-10}$ |
| $10^{8}$ | 8 | $1.5\times10^{-8}$ |

A running total can therefore only move in steps of the local gap: once it is large, small increments are rounded heavily or lost entirely.

{{< note type="fun" >}}
Floats are spent lavishly on small numbers. Almost exactly half of all 32-bit patterns encode numbers between −1 and 1, and a full quarter encode magnitudes below $2^{-63} \approx 10^{-19}$. Meanwhile, above 16,777,216 only every second integer has a pattern of its own, and above 33,554,432 only every fourth.
{{< /note >}}

## Where rounding bites

Each single error is tiny; the trouble is how they combine. Run this in [the Python chapter](../python-for-science/) or on your machine:

```python
import numpy as np

print(0.1 + 0.2 == 0.3, 0.1 + 0.2)                 # the most famous surprise
print(f"{0.1:.20f}")                               # what is really stored
print(np.finfo(np.float64).eps, np.finfo(np.float32).eps)   # machine epsilon

big, small = 1.0e16, 1.0
print((big + small) - big)                         # small is lost entirely: catastrophic cancellation

x = np.full(10_000_000, 0.1, dtype=np.float32)
print("float32 running sum:", np.cumsum(x)[-1], "  pairwise sum:", x.sum(), "  exact: 1000000")

print(np.isclose(0.1 + 0.2, 0.3))                  # compare floats with a tolerance
print(np.int32(2**31 - 1) + np.int32(1))           # integer overflow wraps around
```

```text
False 0.30000000000000004
0.10000000000000000555
2.220446049250313e-16 1.1920929e-07
0.0
float32 running sum: 1.087937e+06   pairwise sum: 1.0000001e+06   exact: 1000000
True
-2147483648
```

Four lessons are hiding in that output.

1. **Never test floats for equality.** Compare with a tolerance: `abs(a - b) < tol` or `np.isclose`.
2. **Subtracting nearly equal numbers destroys digits** (catastrophic cancellation). $10^{16} + 1 - 10^{16}$ gives 0 because the 1 was rounded away before the subtraction. Rewrite formulas to avoid it: for example, compute $\ln(1+x)$ for small $x$ with `log1p`, not `log(1 + x)`.
3. **Summation order matters.** Adding ten million single-precision 0.1s one after another gives 1,087,937, an error of 9%: once the running total is large, each small addition is rounded badly. NumPy's `sum` adds in pairs, a tree, and is accurate to $10^{-7}$. Kahan's compensated summation does better still. This is also why parallel sums give slightly different answers from serial ones (see [the Fortran chapter](../fortran/)): addition in floating point is **not associative**, $(a+b)+c \ne a+(b+c)$.
4. **Integers overflow silently**, and the sign can flip.

### Anatomy of a 9 percent error

The error in the running sum of 0.1s is not random noise; the ruler predicts it. Between 131,072 ($2^{17}$) and 524,288 ($2^{19}$) the gap is 1/64 and then 1/32, and 0.1 rounds down to 0.09375 every time, so the total falls behind: it reaches 524,288 after 5.49 million additions instead of 5.24 million. Above $2^{19}$ the gap is 0.0625. Now 0.1 is 1.6 gaps, which rounds *up* to two gaps, and every addition adds 0.125. Above $2^{20}$ the gap is 0.125 itself and the step stays the same. The remaining 4.51 million additions therefore contribute 563,649 instead of 450,919, and the total ends at 1,087,937.

A steady bias of 25 percent per step is the signature of an accumulator grown too large for its increments. Pairwise summation avoids it by keeping partial sums of similar size, Kahan's algorithm by carrying the lost low-order part in a second variable, and a double-precision accumulator by making the gap $2^{29}$ times smaller.

## Worked example: the variance of an energy

Fluctuations carry physics. In a canonical (NVT) simulation the heat capacity follows from the variance of the total energy, $C_V = (\langle E^2\rangle - \langle E\rangle^2)/k_BT^2$, and in a constant-energy (NVE) run the steadiness of the conserved energy tests the integrator and time step. Both need the variance of numbers that are huge compared with their spread. A box of about 30,000 water molecules at 300 K has a total energy near $-10^{6}$ kJ/mol with a standard deviation σ of roughly 1,300 kJ/mol; the conserved energy of a good NVE run wanders by much less, say 20 kJ/mol.

The formula invites a **one-pass** computation: accumulate the means of $E^2$ and of $E$, then subtract. Both terms are about $10^{12}$ and agree in their leading digits, which is catastrophic cancellation in its purest form. The number of digits lost is roughly $\log_{10}(\langle E\rangle^2/\sigma^2)$: about 6 for σ = 1,300 kJ/mol, more than 9 for σ = 20 kJ/mol. Single precision carries about 7. The cell measures each method against the double-precision two-pass result.

{{< py title="one-pass against two-pass variance" >}}
import numpy as np
rng = np.random.default_rng(0)

def one_pass(x):    # mean of the squares minus the square of the mean
    return np.mean(x * x) - np.mean(x) ** 2

def two_pass(x):    # subtract the mean first, then square
    d = x - np.mean(x)
    return np.mean(d * d)

# 100,000 total energies in kJ/mol, mean -1.0e6, spread sigma:
# 1300 ~ NVT fluctuations of a box of 30,000 waters at 300 K,
#   20 ~ the wobble of the conserved energy in a constant-energy run
for sigma in (1300.0, 20.0):
    E = rng.normal(-1.0e6, sigma, 100_000)
    exact = two_pass(E)
    print(f"sigma = {sigma:.0f} kJ/mol, variance = {exact:.6g}")
    for dt in (np.float64, np.float32):
        x = E.astype(dt)
        for f in (one_pass, two_pass):
            v = f(x)
            print(f"  {dt.__name__:8s} {f.__name__}: {v:14.6g}"
                  f"   relative error {(v - exact) / exact:8.1e}")
{{< /py >}}

The estimate holds. With σ = 1,300 kJ/mol the single-precision one-pass variance is off by about 5 percent, enough to spoil a heat capacity. With σ = 20 kJ/mol it comes out as 262,144 instead of 402: a multiple of 65,536, the gap between single-precision numbers near $10^{12}$, with no relation to the data (the exact wrong value may differ in your browser). Even double precision loses about ten of its sixteen digits here. The **two-pass** form, which subtracts the mean first and squares only the small deviations, is good to a few parts in $10^{5}$ even in single precision. Welford's algorithm (1962) reaches the same accuracy in one pass by updating the mean and the sum of squared deviations as each value arrives, which is what an MD code needs for averages computed on the fly.

{{< note type="warn" title="Single-precision data in your own analysis" >}}
Trajectory readers such as MDAnalysis and MDTraj hand you **float32** coordinates, and NumPy accumulates means of float32 arrays in float32. Convert with `.astype(np.float64)` before computing variances, correlation functions or long cumulative sums, and never write a variance as `np.mean(x**2) - np.mean(x)**2`: `np.var` subtracts the mean first.
{{< /note >}}

## Why GPUs compute in mixed precision

If double precision is safer, why not use it everywhere? Because it costs. A double takes twice the memory and bandwidth of a single, and [the memory wall](../inside-a-computer/) makes bandwidth the usual limit. On GPUs the arithmetic gap is wider still: recent consumer cards run double precision at 1/32 or 1/64 of their single-precision rate, and even data-centre GPUs such as the A100 and H100 halve their throughput in double, while their tensor cores multiply FP16 or bfloat16 matrices more than ten times faster than ordinary FP32 arithmetic.

The art is to spend precision only where errors accumulate. In molecular dynamics that means two places. **Sums**: near $10^{6}$ kJ/mol the gap between single-precision numbers is 0.0625 kJ/mol, larger than many individual pair energies. **State carried from step to step**: a position near 64 nm is stored in single precision only to the nearest $7.6\times10^{-6}$ nm, while an atom moves about $10^{-3}$ nm in a 2 fs step, so each update can be rounded by up to 0.4 percent, millions of times over. Forces, recomputed from scratch at every step, tolerate single precision well.

GROMACS is built by default in "mixed precision", mostly single with selected accumulations in double; a double-precision build exists for jobs such as normal-mode analysis. OpenMM's mixed mode computes forces in single precision and integrates in double. AMBER's GPU engine (Le Grand, Götz and Walker, 2013) accumulates forces in **64-bit fixed-point integers**. Integer addition is exact and associative, so the total no longer depends on the order in which thousands of GPU threads add their contributions, and a run repeated on the same hardware reproduces itself bit for bit.

Machine learning goes further, because neural networks tolerate noisy arithmetic remarkably well: training runs in FP16 or bfloat16 with FP32 master weights. FP16 cannot represent anything below $6\times10^{-8}$, and many gradients are smaller, hence loss scaling. bfloat16, designed at Google for its TPU accelerators, keeps all eight exponent bits of FP32 and gives up fraction bits instead, so it has FP32's range and rarely needs loss scaling.

{{< note type="practice" title="Precision in simulation and machine learning" >}}
Molecular dynamics on GPUs typically uses **mixed precision**: forces in single precision, but accumulated energies and positions in double or fixed point, so that energy is still conserved over millions of steps. Neural networks are trained in FP16 or bfloat16 with FP32 master weights and **loss scaling**, because small gradients would otherwise underflow to zero in FP16. In both fields, a NaN appearing mid-run is usually an overflow or a division by zero somewhere upstream; compilers and frameworks have options (`-ffpe-trap`, `torch.autograd.detect_anomaly`) to stop at the first one.
{{< /note >}}

{{< note type="key" >}}
- Integers are exact but wrap around silently when they leave their range.
- A float keeps a fixed number of significant bits (about 7 digits in single, 16 in double), so the gap between neighbours grows with size.
- Errors come from how roundings combine: subtracting nearly equal numbers and adding small terms to large totals are the classic traps, and both can be rewritten away.
- Mixed precision spends double precision only where errors accumulate: sums and state carried from step to step.
{{< /note >}}

{{< quiz >}}
- q: "What is 127 + 1 in a signed 8-bit integer?"
  options: ["128", "−128", "An error is raised"]
  answer: 1
  why: "127 is 01111111; adding 1 gives 10000000, whose leftmost bit counts −128. The hardware does not signal the overflow."
- q: "Why does `0.1 + 0.2 == 0.3` evaluate to False?"
  options: ["Python has a bug", "None of the three numbers is exactly representable in binary, and the rounded sum differs from the rounded 0.3 in the last bit", "Addition is done in single precision"]
  answer: 1
  why: "Each decimal fraction is rounded to the nearest binary fraction. The two rounding errors in 0.1 and 0.2 do not cancel the one in 0.3."
- q: "Single precision has about 7 significant digits. What happens when you add 1 to 100,000,000 stored as float32?"
  options: ["You get 100,000,001", "You get 100,000,000: the 1 is below the spacing between neighbouring floats at that size", "The result is NaN"]
  answer: 1
  why: "At 10⁸ the gap between adjacent float32 values is 8, so adding 1 rounds back to the same number."
- q: "Which change makes a long sum of small numbers more accurate?"
  options: ["Adding them in a random order", "Pairwise (tree) or compensated (Kahan) summation, or accumulating in higher precision", "Using integers"]
  answer: 1
  why: "Keeping partial sums of similar size, or carrying the lost low-order part, prevents small terms from being swamped by a large running total."
- q: "You compute the variance of 100,000 energies with mean −10⁶ kJ/mol and spread 20 kJ/mol as `np.mean(x**2) - np.mean(x)**2` on a float32 array. What should you expect?"
  options: ["The right answer to about 7 digits", "Nonsense: the two terms agree in more digits than single precision holds, so their difference is rounding error", "An overflow to infinity"]
  answer: 1
  why: "Both terms are about 10¹² and differ only around the tenth digit. Subtract the mean first, as `np.var` does, or convert to float64."
- q: "Why does AMBER's GPU code accumulate forces in 64-bit fixed-point integers?"
  options: ["Integer multiplication is faster than floating-point multiplication", "Integer addition is exact and associative, so the total does not depend on the order in which thousands of threads add their contributions", "GPUs cannot store floating-point numbers"]
  answer: 1
  why: "Floating-point addition is not associative, so a parallel sum in floats changes with the order of the additions. Fixed-point sums do not, which makes runs reproducible."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. D. Goldberg, “What every computer scientist should know about floating-point arithmetic,” *ACM Computing Surveys* **23**(1), 5–48 (1991).
2. N. J. Higham, *Accuracy and Stability of Numerical Algorithms*, 2nd ed., SIAM (2002), chapters 1–4.
3. IEEE Computer Society, *IEEE Standard for Floating-Point Arithmetic*, IEEE Std 754-2019 (2019).
4. W. Kahan, “Further remarks on reducing truncation errors,” *Communications of the ACM* **8**(1), 40 (1965).
5. P. Micikevicius et al., “Mixed precision training,” *International Conference on Learning Representations* (2018).
6. R. E. Bryant and D. R. O'Hallaron, *Computer Systems: A Programmer's Perspective*, 3rd ed., Pearson (2016), chapter 2 (representing and manipulating information).
7. B. P. Welford, “Note on a method for calculating corrected sums of squares and products,” *Technometrics* **4**(3), 419–420 (1962).
8. S. Le Grand, A. W. Götz and R. C. Walker, “SPFP: Speed without compromise—A mixed precision model for GPU accelerated molecular dynamics simulations,” *Computer Physics Communications* **184**(2), 374–380 (2013).

</div>
