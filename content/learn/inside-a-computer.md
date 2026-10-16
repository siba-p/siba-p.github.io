---
title: "Inside a computer"
description: "What a processor actually does, one clock tick at a time: the stored-program idea, fetch–decode–execute, registers and memory, why caches exist, how fast a modern CPU or GPU can compute, and what limits real scientific codes."
track: machine
weight: 1
level: Foundation
minutes: 45
lab: "Step a toy computer through a program"
---

## A machine that follows instructions

Every simulation, every neural network and every plot you will make runs on the same kind of machine, and it is simpler than it looks. A computer does exactly one thing, billions of times a second: it **reads an instruction from memory, carries it out, and moves on to the next one**. Everything else (operating systems, Python, GROMACS, PyTorch) is built from that.

The design almost every computer still follows was written down by John von Neumann in 1945, in a report on the EDVAC machine. Its central idea is the **stored program**: instructions are just numbers, kept in the same memory as the data they work on. A computer that can hold its own program can load a different program in seconds, which is what made general-purpose computing possible. The design has four parts:

- **Memory** holds numbers in numbered cells called **addresses**: both the program and its data.
- The **processor** (CPU) contains a **control unit** that steps through the program, an **arithmetic logic unit** (ALU) that adds, subtracts and compares, and a handful of very fast storage cells called **registers**.
- **Buses** carry addresses and numbers between them.
- **Input and output** connect it to disks, networks, screens and keyboards.

## Watch one run

The machine below is a working computer with sixteen memory cells and six instructions. Its program, already in memory, adds up the numbers $1 + 2 + \dots + n$. Step through it one phase at a time and watch the three registers and the bus.

{{< widget name="cpu" title="A toy stored-program computer" caption="Violet cells hold instructions, orange cells hold data. The orange dashed line is the bus carrying a number. Each instruction takes three phases; count how many clock cycles the whole sum needs, then change n." >}}

Every instruction goes through the same three-phase cycle.

1. **Fetch.** The **program counter** (PC) holds the address of the next instruction. The control unit reads that memory cell into the **instruction register** and adds one to the PC.
2. **Decode.** The control unit works out what the instruction asks for and which address it refers to.
3. **Execute.** The ALU does the arithmetic, or a number moves between memory and the **accumulator** register, or (for a jump) the PC is overwritten so that the next fetch comes from somewhere else.

That last trick, the **conditional jump**, is what makes loops and `if` statements possible. In the program above, `JNZ 0` sends the machine back to address 0 as long as the counter is not zero. Every `for` loop in Python or `do` loop in Fortran becomes exactly this pattern after compilation.

{{< eq title="How long does a program take?" say="Seconds per program = instructions per program × cycles per instruction × seconds per cycle.">}}
$$ \textcolor{#e64980}{t} = \textcolor{#4c6ef5}{N_{\text{instr}}} \times \textcolor{#12a594}{\text{CPI}} \times \frac{1}{\textcolor{#f08c2e}{f_{\text{clock}}}} $$
- $\textcolor{#e64980}{t}$: run time
- $\textcolor{#4c6ef5}{N_{\text{instr}}}$: instructions executed (better algorithms reduce it)
- $\textcolor{#12a594}{\text{CPI}}$: average clock cycles per instruction (better hardware reduces it)
- $\textcolor{#f08c2e}{f_{\text{clock}}}$: clock frequency, about $3\times10^{9}$ ticks per second
{{< /eq >}}

The toy machine needs 3 cycles per instruction. A modern core finishes **several instructions per cycle**, by overlapping their phases like an assembly line (**pipelining**), running several at once (**superscalar** execution) and reordering them to avoid waiting (**out-of-order** execution). Its instructions are also wider: one **SIMD** (vector) instruction can multiply eight double-precision numbers at once.

## From Python to machine code

Nobody writes these instructions by hand. A **compiler** (gfortran, gcc, nvcc) translates a whole program written in a high-level language into machine code before it runs; the statement `sum = sum + n` becomes something very like `LOAD`, `ADD`, `STORE`. An **interpreter** such as Python instead reads your program and acts on it statement by statement while it runs, which is flexible but far slower for arithmetic loops. That is why numerical Python hands its heavy work to compiled libraries such as NumPy, which you will see in [the Python chapter](../python-for-science/).

## How fast can a computer calculate?

Scientific computing counts **floating-point operations per second** (FLOP/s): additions and multiplications of real numbers. The peak rate of a processor is a simple product:

{{< eq title="Peak arithmetic rate" say="Every core, every tick, doing the widest vector operation it can." >}}
$$ \textcolor{#f08c2e}{P_{\text{peak}}} = \textcolor{#4c6ef5}{N_{\text{cores}}} \times \textcolor{#12a594}{f_{\text{clock}}} \times \textcolor{#845ef7}{\text{FLOP per cycle per core}} $$
- $\textcolor{#4c6ef5}{N_{\text{cores}}}$: independent processors on the chip
- $\textcolor{#12a594}{f_{\text{clock}}}$: ticks per second
- $\textcolor{#845ef7}{\text{FLOP/cycle}}$: e.g. 16 for two 4-wide fused multiply–add units on doubles
{{< /eq >}}

A 64-core server processor at 2.5 GHz doing 16 double-precision operations per cycle peaks at $64 \times 2.5\times10^9 \times 16 \approx 2.6\times10^{12}$ FLOP/s, 2.6 teraflops. A data-centre GPU, with thousands of simpler cores, reaches tens of teraflops in double precision and hundreds in the lower precisions used for machine learning. That is why both molecular dynamics and neural-network training moved to GPUs.

## The memory wall

Here is the catch. Arithmetic is cheap; **getting the numbers to the processor is not**. Over the last forty years processors became far faster than memory, so a modern core can wait hundreds of cycles for a single number from main memory. Hardware hides this with a hierarchy of ever larger, ever slower memories:

{{< widget name="latency" title="How long it takes to fetch one piece of data" caption="Typical access times on a current machine (orders of magnitude, after the widely quoted figures popularised by Jeff Dean and Peter Norvig). Switch to the human scale: if one clock cycle lasted one second, a trip to main memory would take minutes and a hard-disk seek would take months." >}}

**Caches** work because programs are predictable. They tend to reuse what they used recently (**temporal locality**) and to use neighbouring addresses next (**spatial locality**). Memory therefore moves in **cache lines** of 64 bytes, eight doubles at a time. A loop that walks through an array in storage order gets seven of every eight numbers for free; a loop that jumps around wastes most of each line. [The Fortran chapter](../fortran/) measures this: the same arithmetic runs 4.5 times slower with the wrong loop order.

Whether a calculation is limited by arithmetic or by memory depends on its **arithmetic intensity**, the number of operations it does per byte it moves. The **roofline model** puts it in one line:

{{< eq title="The roofline model" say="You get the peak only if you do enough arithmetic on each byte you fetch." >}}
$$ \textcolor{#e64980}{P_{\text{attainable}}} = \min\big(\, \textcolor{#f08c2e}{P_{\text{peak}}},\; \textcolor{#12a594}{I} \times \textcolor{#4c6ef5}{B_{\text{memory}}} \,\big) $$
- $\textcolor{#12a594}{I}$: arithmetic intensity, FLOP per byte moved
- $\textcolor{#4c6ef5}{B_{\text{memory}}}$: memory bandwidth, bytes per second
- $\textcolor{#f08c2e}{P_{\text{peak}}}$: peak FLOP/s from above
{{< /eq >}}

Adding two long vectors ($c_i = a_i + b_i$) does 1 operation per 24 bytes moved, so it runs at a few percent of peak whatever the processor. Multiplying two large matrices reuses each number many times, has high intensity, and runs near peak. This one idea explains a great deal about scientific software: why libraries such as BLAS reorganise loops into blocks that fit in cache, why neighbour lists in molecular dynamics are sorted by space, and why neural networks are built from large matrix multiplications.

## Many processors at once

Clock frequencies stopped rising around 2005 because of heat, so performance now comes from **parallelism** at every level:

| Level | Example | How you use it |
|---|---|---|
| Vector (SIMD) | one instruction on 8 doubles | the compiler, with `-O2 -march=native` |
| Cores in a chip | 8–128 cores sharing memory | threads: OpenMP, NumPy's BLAS |
| GPU | thousands of cores, own memory | CUDA, PyTorch, GPU builds of GROMACS and LAMMPS |
| Nodes in a cluster | hundreds of machines on a network | processes: MPI, job schedulers |

Each level has a cost. Threads must not write to the same data at once; MPI processes must send messages over a network that is thousands of times slower than cache. Good parallel codes divide the work so that each processor mostly uses data it already has, a theme that returns in the chapters on [clusters](../linux-for-simulation/) and [molecular dynamics](../molecular-dynamics/).

{{< note type="key" >}}
- A computer repeatedly fetches, decodes and executes instructions stored in memory, alongside data.
- Speed comes from doing more per tick (pipelines, vectors) and from parallelism, not from faster clocks.
- Moving data is the real bottleneck: caches, locality and arithmetic intensity decide how close a code gets to peak.
{{< /note >}}

{{< quiz >}}
- q: "In the toy computer, what makes the loop repeat?"
  options: ["The accumulator overflows", "The conditional jump `JNZ 0` overwrites the program counter with 0 while the counter is non-zero", "The memory is read twice"]
  answer: 1
  why: "A jump changes the program counter, so the next fetch comes from address 0 again. Conditional jumps are how every loop and if-statement is implemented."
- q: "A 32-core chip runs at 3 GHz and each core can do 16 double-precision FLOP per cycle. What is its peak?"
  options: ["96 GFLOP/s", "About 1.5 TFLOP/s", "About 48 TFLOP/s"]
  answer: 1
  why: "32 × 3×10⁹ × 16 = 1.536×10¹² FLOP/s."
- q: "Adding two large arrays element by element runs at a few percent of the CPU's peak. Why?"
  options: ["Addition is a slow instruction", "Each addition needs 24 bytes from memory, so memory bandwidth, not arithmetic, limits the speed", "The compiler cannot vectorise it"]
  answer: 1
  why: "Its arithmetic intensity is about 1/24 FLOP per byte. The roofline model says the attainable rate is intensity times bandwidth, far below peak."
- q: "Why does the cache load 64 bytes when a program asks for one 8-byte number?"
  options: ["To waste memory", "Programs usually use neighbouring data next (spatial locality), so fetching the whole line pays off", "Because RAM cannot read 8 bytes"]
  answer: 1
  why: "Spatial locality makes it likely that the next accesses fall in the same line, which then costs almost nothing."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. von Neumann, *First Draft of a Report on the EDVAC*, Moore School of Electrical Engineering, University of Pennsylvania (1945).
2. D. A. Patterson and J. L. Hennessy, *Computer Organization and Design: The Hardware/Software Interface*, RISC-V edition, 2nd ed., Morgan Kaufmann (2020).
3. R. E. Bryant and D. R. O'Hallaron, *Computer Systems: A Programmer's Perspective*, 3rd ed., Pearson (2016).
4. N. Nisan and S. Schocken, *The Elements of Computing Systems: Building a Modern Computer from First Principles*, 2nd ed., MIT Press (2021), the “Nand to Tetris” course.
5. C. Petzold, *Code: The Hidden Language of Computer Hardware and Software*, 2nd ed., Microsoft Press (2022).
6. S. Williams, A. Waterman and D. Patterson, “Roofline: an insightful visual performance model for multicore architectures,” *Communications of the ACM* **52**(4), 65–76 (2009).
7. U. Drepper, “What every programmer should know about memory” (2007).

</div>
