---
title: "How numbers live in a computer"
description: "Bits and bytes, integers and their overflow, and floating-point numbers bit by bit: why 0.1 + 0.2 is not 0.3, what machine epsilon means, and the rounding traps that bite real simulations and neural networks."
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

Real programs use 32-bit integers (up to about $2.1\times10^9$) or 64-bit ones (up to $9.2\times10^{18}$). The 32-bit limit is not academic: a simulation of more than two billion atoms, or a counter of steps × atoms, overflows it, and codes such as LAMMPS have build options for 64-bit indices for exactly this reason.

## Floating-point numbers

Scientific quantities span enormous ranges, from $10^{-23}$ J for $k_B$ to $10^{23}$ for Avogadro's number, so computers store real numbers in a binary form of **scientific notation**: a sign, a few significant digits, and an exponent. The universal standard is **IEEE 754** (first published 1985). A 32-bit single-precision number is three fields:

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

{{< note type="practice" title="Precision in simulation and machine learning" >}}
Molecular dynamics on GPUs typically uses **mixed precision**: forces in single precision, but accumulated energies and positions in double or fixed point, so that energy is still conserved over millions of steps. Neural networks are trained in FP16 or bfloat16 with FP32 master weights and **loss scaling**, because small gradients would otherwise underflow to zero in FP16. In both fields, a NaN appearing mid-run is usually an overflow or a division by zero somewhere upstream; compilers and frameworks have options (`-ffpe-trap`, `torch.autograd.detect_anomaly`) to stop at the first one.
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
{{< /quiz >}}

## References and further reading

<div class="refs">

1. D. Goldberg, “What every computer scientist should know about floating-point arithmetic,” *ACM Computing Surveys* **23**(1), 5–48 (1991).
2. N. J. Higham, *Accuracy and Stability of Numerical Algorithms*, 2nd ed., SIAM (2002), chapters 1–4.
3. IEEE Computer Society, *IEEE Standard for Floating-Point Arithmetic*, IEEE Std 754-2019 (2019).
4. W. Kahan, “Further remarks on reducing truncation errors,” *Communications of the ACM* **8**(1), 40 (1965).
5. P. Micikevicius et al., “Mixed precision training,” *International Conference on Learning Representations* (2018).
6. R. E. Bryant and D. R. O'Hallaron, *Computer Systems: A Programmer's Perspective*, 3rd ed., Pearson (2016), chapter 2 (representing and manipulating information).

</div>
