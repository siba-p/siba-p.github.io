---
title: "Inside a computer"
description: "What a processor actually does, one clock tick at a time: the stored-program idea, fetch–decode–execute, registers and memory, why caches exist, how fast a modern CPU or GPU can compute, and what limits real scientific codes."
hook: "A 64-core server chip can peak at 2.6 trillion floating-point operations a second, yet adding two long arrays reaches less than one percent of that. The bottleneck is not the arithmetic but fetching the numbers from memory."
objectives:
  - "Trace the fetch–decode–execute cycle of a stored-program computer"
  - "Estimate a processor's peak FLOP rate from its cores, clock and vector width"
  - "Explain how caches, cache lines and locality hide the cost of memory"
  - "Classify a calculation as memory-bound or compute-bound with the roofline model"
  - "Match each level of parallelism to its tool and bound its speed-up with Amdahl's law"
cover: "cover.svg"
milestones:
  - year: 1945
    text: "John von Neumann's EDVAC report describes the stored-program computer"
  - year: 1948
    text: "Williams, Kilburn and Tootill's Manchester Baby runs the first stored program"
  - year: 1971
    text: "Faggin, Hoff, Mazor and Shima's Intel 4004 puts a processor on one chip"
  - year: 1995
    text: "Wulf and McKee warn that memory speed will limit processors: the memory wall"
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

{{< note type="story" title="The first stored program" >}}
On 21 June 1948 the Manchester Small-Scale Experimental Machine, the "Baby" built by Frederic Williams, Tom Kilburn and Geoff Tootill, ran the first program held in electronic memory. Its store was a cathode-ray tube holding 32 words of 32 bits, and it had seven instructions; there was not even an add instruction, only load-negative and subtract. Kilburn's program found the highest proper factor of $2^{18} = 262\,144$ by trying every candidate downwards and dividing by repeated subtraction. It ran for 52 minutes, executed about 3.5 million instructions, and printed its answer, 131,072, as a pattern of dots on the tube.
{{< /note >}}

The split into memory and processor is also the source of the problem that dominates the rest of this chapter. Everything the processor computes must cross the connection between the two, and that connection has improved far more slowly than the processor. Backus called it the "von Neumann bottleneck" in his 1977 Turing Award lecture; today's caches, vector units and GPUs are largely elaborate ways of living with it.

## Watch one run

The machine below is a working computer with sixteen memory cells and six instructions. Its program, already in memory, adds up the numbers $1 + 2 + \dots + n$. Step through it one phase at a time and watch the three registers and the bus.

{{< widget name="cpu" title="A toy stored-program computer" caption="Violet cells hold instructions, orange cells hold data. The orange dashed line is the bus carrying a number. Each instruction takes three phases; count how many clock cycles the whole sum needs, then change n." >}}

Every instruction goes through the same three-phase cycle.

1. **Fetch.** The **program counter** (PC) holds the address of the next instruction. The control unit reads that memory cell into the **instruction register** and adds one to the PC.
2. **Decode.** The control unit works out what the instruction asks for and which address it refers to.
3. **Execute.** The ALU does the arithmetic, or a number moves between memory and the **accumulator** register, or (for a jump) the PC is overwritten so that the next fetch comes from somewhere else.

That last trick, the **conditional jump**, is what makes loops and `if` statements possible. In the program above, `JNZ 0` sends the machine back to address 0 as long as the counter is not zero. Every `for` loop in Python or `do` loop in Fortran becomes exactly this pattern after compilation.

Counting cycles makes the cost concrete. One pass through the loop executes seven instructions (`LOAD`, `ADD`, `STORE`, `LOAD`, `SUB`, `STORE`, `JNZ`), and the final `HALT` is one more, so summing up to $n$ takes $7n + 1$ instructions and $3(7n+1)$ cycles: 108 cycles for $n = 5$. Only one of the seven instructions in the loop, the `ADD`, does the arithmetic the program exists for. The rest move numbers between memory and the accumulator, count down and jump. Real compiled loops have the same overhead in smaller proportion, and removing it (keeping the running sum in a register, processing several elements per pass) is much of what an optimising compiler does.

{{< eq title="How long does a program take?" say="Seconds per program = instructions per program × cycles per instruction × seconds per cycle.">}}
$$ \textcolor{#e64980}{t} = \textcolor{#4c6ef5}{N_{\text{instr}}} \times \textcolor{#12a594}{\text{CPI}} \times \frac{1}{\textcolor{#f08c2e}{f_{\text{clock}}}} $$
- $\textcolor{#e64980}{t}$: run time
- $\textcolor{#4c6ef5}{N_{\text{instr}}}$: instructions executed (better algorithms reduce it)
- $\textcolor{#12a594}{\text{CPI}}$: average clock cycles per instruction (better hardware reduces it)
- $\textcolor{#f08c2e}{f_{\text{clock}}}$: clock frequency, about $3\times10^{9}$ ticks per second
{{< /eq >}}

The toy machine needs 3 cycles per instruction. A modern core finishes **several instructions per cycle**, by overlapping their phases like an assembly line (**pipelining**), running several at once (**superscalar** execution) and reordering them to avoid waiting (**out-of-order** execution). Its instructions are also wider: one **SIMD** (vector) instruction can multiply eight double-precision numbers at once.

{{< fig src="pipeline.svg" alt="Two Gantt charts of five instructions, each split into fetch, decode and execute boxes. Without pipelining the boxes form a staircase ending at cycle 15; with pipelining they overlap and end at cycle 7." caption="The first five instructions of the toy program. Executed one at a time they need $5 \times 3 = 15$ cycles; in an ideal three-stage pipeline a new instruction enters every cycle, so $n$ instructions take $n + 2$ cycles and the CPI approaches 1." >}}

The pipeline in the figure is ideal, and real ones are not, for two reasons. The first is **dependences**: `STORE 14` cannot execute until `ADD 13` has produced the value to store, so hardware either forwards the result directly between stages or inserts a stall. The second is **branches**: when `JNZ 0` is fetched, the processor does not yet know whether the next instruction comes from address 7 or address 0. Modern cores guess, using a **branch predictor** that records what each branch did recently, and run ahead speculatively. A loop branch that is taken a million times and falls through once is predicted almost perfectly. A branch on random data, such as `if x[i] > 0.5` over random numbers, is wrong half the time, and each wrong guess throws away the speculative work, typically 15 to 20 cycles on a current core. Sorting the data first, or rewriting the test as arithmetic that the compiler can vectorise, can make such a loop several times faster without changing a single floating-point operation.

{{< note type="warn" title="Myth" >}}
**Myth: the clock frequency tells you how fast a processor is.** A 5 GHz desktop chip and a 2.5 GHz server chip can differ by a factor of ten in the other direction. The time equation above has three factors, and the clock is only one of them: the instructions completed per cycle (four or more on a current core), the width of each vector instruction (2, 4 or 8 doubles) and the number of cores all multiply it. Since about 2005, almost all the growth in speed has come from those factors, not from the clock.
{{< /note >}}

## From Python to machine code

Nobody writes these instructions by hand. A **compiler** (gfortran, gcc, nvcc) translates a whole program written in a high-level language into machine code before it runs; the statement `sum = sum + n` becomes something very like `LOAD`, `ADD`, `STORE`. An **interpreter** such as Python instead reads your program and acts on it statement by statement while it runs, which is flexible but far slower for arithmetic loops. That is why numerical Python hands its heavy work to compiled libraries such as NumPy, which you will see in [the Python chapter](../python-for-science/).

{{< note type="practice" title="Back of the envelope" >}}
On the machine used to write this chapter (an AMD EPYC server core at about 3 GHz), a pure-Python loop `for i in range(n): s += i` takes about 90 ns per iteration: some 270 clock cycles, because each `+=` makes the interpreter look up both objects' types, dispatch to the right addition routine and allocate a new integer object. NumPy's `a.sum()` over a float64 array of ten million elements takes about 0.45 ns per element, two hundred times less, and most of that is the time to stream the array from memory. The arithmetic itself is the same addition in both cases. [How Python runs](../how-python-runs/) explains where the interpreter's cycles go.
{{< /note >}}

## How fast can a computer calculate?

Scientific computing counts **floating-point operations per second** (FLOP/s): additions and multiplications of real numbers. The peak rate of a processor is a simple product:

{{< eq title="Peak arithmetic rate" say="Every core, every tick, doing the widest vector operation it can." >}}
$$ \textcolor{#f08c2e}{P_{\text{peak}}} = \textcolor{#4c6ef5}{N_{\text{cores}}} \times \textcolor{#12a594}{f_{\text{clock}}} \times \textcolor{#845ef7}{\text{FLOP per cycle per core}} $$
- $\textcolor{#4c6ef5}{N_{\text{cores}}}$: independent processors on the chip
- $\textcolor{#12a594}{f_{\text{clock}}}$: ticks per second
- $\textcolor{#845ef7}{\text{FLOP/cycle}}$: e.g. 16 for two 4-wide fused multiply–add units on doubles
{{< /eq >}}

The 16 in the last factor deserves unpacking, because it explains why peak numbers are hard to reach. A core with AVX2 has two vector units, each operating on 256-bit registers that hold four doubles. Each unit can issue one **fused multiply–add** (FMA), $a \leftarrow a + b \times c$, per cycle, and an FMA counts as two floating-point operations. Two units × four lanes × two operations gives 16. A loop that only adds, or that cannot be vectorised, or whose operands are not in registers, gets a fraction of that: a scalar addition loop on the same core peaks at 2 FLOP per cycle, an eighth of the advertised figure. Cores with AVX-512 double the width again to 32 FLOP per cycle.

A 64-core server processor at 2.5 GHz doing 16 double-precision operations per cycle peaks at $64 \times 2.5\times10^9 \times 16 \approx 2.6\times10^{12}$ FLOP/s, 2.6 teraflops. A data-centre GPU, with thousands of simpler cores, reaches tens of teraflops in double precision and hundreds in the lower precisions used for machine learning. That is why both molecular dynamics and neural-network training moved to GPUs. To take one concrete card, NVIDIA's A100 (2020) is rated at 9.7 TFLOP/s for ordinary double-precision arithmetic, 19.5 TFLOP/s for double-precision matrix products on its tensor cores, and 312 TFLOP/s for FP16 or bfloat16 matrix products. The factor of 32 between the first and last numbers is why [the next chapter](../numbers-in-a-computer/) spends so long on when lower precision is safe.

## The memory wall

Here is the catch. Arithmetic is cheap; **getting the numbers to the processor is not**. Over the last forty years processors became far faster than memory, so a modern core can wait hundreds of cycles for a single number from main memory. Hardware hides this with a hierarchy of ever larger, ever slower memories, and they are laid out on the chip roughly as the figure shows.

{{< fig src="chip.svg" alt="Schematic of a processor chip with four cores, each with registers, an L1 and an L2 cache, above a shared L3 cache, memory controllers connected to four DRAM modules, and a PCIe block for GPU, SSD and network." caption="Where the caches live. Each core has private L1 and L2 caches; all cores share the L3 and, through the memory controllers, the same few memory channels. The access times are typical orders of magnitude. The channels to DRAM are shared by every core, which is why memory-bound codes stop speeding up long before all cores are busy." >}}

{{< note type="practice" title="Back of the envelope" >}}
A load that misses every cache waits about 90 ns for DRAM. At 3 GHz that is 270 clock cycles, and a core that can do 16 floating-point operations per cycle could have done 4,320 of them in the same time. One cache miss per few thousand operations is therefore enough to halve the speed of a code that should be compute-bound.
{{< /note >}}

The latency of each level is only half of the story; the other half is bandwidth, how many bytes per second can flow once the data starts arriving. A single DDR4-3200 memory channel delivers $3200\times10^{6}$ transfers of 8 bytes per second, 25.6 GB/s, and a server chip with eight channels has at most 205 GB/s to share among all of its cores. John McCalpin's STREAM benchmark (1995), which times exactly the kind of long-vector loops discussed below, typically measures 70 to 80 percent of that theoretical figure, and it is the number to use when estimating how fast a memory-bound code can run.

{{< widget name="latency" title="How long it takes to fetch one piece of data" caption="Typical access times on a current machine (orders of magnitude, after the widely quoted figures popularised by Jeff Dean and Peter Norvig). Switch to the human scale: if one clock cycle lasted one second, a trip to main memory would take minutes and a hard-disk seek would take months." >}}

**Caches** work because programs are predictable. They tend to reuse what they used recently (**temporal locality**) and to use neighbouring addresses next (**spatial locality**). Memory therefore moves in **cache lines** of 64 bytes, eight doubles at a time. A loop that walks through an array in storage order gets seven of every eight numbers for free; a loop that jumps around wastes most of each line. [The Fortran chapter](../fortran/) measures this: the same arithmetic runs 4.5 times slower with the wrong loop order.

### Cache lines and loop order

A two-dimensional array is stored as one long run of numbers. C, C++ and NumPy (by default) store it **row by row**, so `a[i, j]` and `a[i, j+1]` are neighbours in memory; Fortran, MATLAB and Julia store it **column by column**, so `a(i, j)` and `a(i+1, j)` are neighbours. A loop whose innermost index follows the storage order walks through memory in steps of 8 bytes and uses every number in each 64-byte line it fetches. A loop whose innermost index runs the other way jumps by a whole row at each step.

{{< fig src="cache-lines.svg" alt="Two grids of six rows by eight cells, each row outlined as one cache line. On the left a path runs along the rows; on the right a path runs down the columns, crossing a different row at every step." caption="A 6 × 8 array of doubles stored row by row, as NumPy and C do. Walking along the rows (left) uses all 8 numbers of every line fetched. Walking down the columns (right) touches a new line at every step; if the array is larger than the cache, each line is evicted before its other seven numbers are used, and the memory traffic rises up to eightfold." >}}

For a small array the difference disappears, because every line stays in cache after its first use. It appears when the array is larger than the cache: a 4,000 × 4,000 double-precision matrix occupies 128 MB, more than any L3, so traversing it across the storage order fetches each line up to eight times. Two further pieces of hardware make the storage-order traversal even faster than the factor of eight suggests. A **hardware prefetcher** notices a constant stride and requests the next lines before the program asks for them, hiding most of the latency, and the compiler can only vectorise a loop when consecutive iterations touch consecutive addresses.

{{< note type="try" title="Pause and predict" >}}
Take a 4,000 × 4,000 float64 NumPy array `x` (128 MB, stored row by row) and add it up two ways: one row at a time, `sum(x[i, :].sum() for i in range(4000))`, and one column at a time, `sum(x[:, j].sum() for j in range(4000))`. The arithmetic is identical. Predict the ratio of the run times before reading on. On the machine used for this chapter the row version took 12 ms and the column version 31 ms, a factor of 2.6 rather than 8. The 4,000 lines touched by one column occupy 256 KB, which still sits in the L2 cache when the next column needs the neighbouring numbers, so the traffic from DRAM barely rises; what is lost is the prefetching and vectorisation of a unit-stride loop. Make the rows long enough that one column's lines no longer fit in cache and the penalty grows towards the full factor.
{{< /note >}}

Whether a calculation is limited by arithmetic or by memory depends on its **arithmetic intensity**, the number of operations it does per byte it moves. The **roofline model** puts it in one line:

{{< eq title="The roofline model" say="You get the peak only if you do enough arithmetic on each byte you fetch." >}}
$$ \textcolor{#e64980}{P_{\text{attainable}}} = \min\big(\, \textcolor{#f08c2e}{P_{\text{peak}}},\; \textcolor{#12a594}{I} \times \textcolor{#4c6ef5}{B_{\text{memory}}} \,\big) $$
- $\textcolor{#12a594}{I}$: arithmetic intensity, FLOP per byte moved
- $\textcolor{#4c6ef5}{B_{\text{memory}}}$: memory bandwidth, bytes per second
- $\textcolor{#f08c2e}{P_{\text{peak}}}$: peak FLOP/s from above
{{< /eq >}}

Adding two long vectors ($c_i = a_i + b_i$) does 1 operation per 24 bytes moved (two 8-byte numbers read, one written), so it runs at well under one percent of peak whatever the processor. Multiplying two large matrices reuses each number many times, has high intensity, and runs near peak. This one idea explains a great deal about scientific software: why libraries such as BLAS reorganise loops into blocks that fit in cache, why neighbour lists in molecular dynamics are sorted by space, and why neural networks are built from large matrix multiplications.

### A worked roofline

Put numbers into the formula for the 64-core server chip above: $P_{\text{peak}} = 2.56$ TFLOP/s and $B_{\text{memory}} = 204.8$ GB/s. The two terms of the minimum are equal at the **ridge point** $I^\ast = P_{\text{peak}}/B_{\text{memory}} = 12.5$ FLOP per byte. A kernel to the left of it is limited by memory, a kernel to the right by arithmetic.

- **Vector addition**, $I = 1/24$: attainable rate $204.8/24 = 8.5$ GFLOP/s, 0.33 percent of peak.
- **Dot product**, $\sum_i a_i b_i$: two operations (a multiply and an add) per two numbers read, $I = 2/16 = 1/8$, so 25.6 GFLOP/s, 1 percent of peak.
- **Matrix–vector product**, $y = Ax$: each matrix element is read once and used in one multiply–add, $I = 2/8 = 1/4$, so 51 GFLOP/s, 2 percent of peak. This is the kernel inside every iterative solver and every Krylov eigensolver.
- **Matrix–matrix product** of two $n \times n$ matrices: $2n^3$ operations on $3n^2$ numbers, so if each number crosses the memory bus only once, $I = 2n^3/(24n^2) = n/12$. For $n = 1000$ that is 83 FLOP per byte, far to the right of the ridge.

{{< fig src="roofline.svg" alt="Log–log plot of attainable GFLOP/s against arithmetic intensity, with a sloped then flat roof for a 64-core CPU and a higher one for an A100 GPU, and points for vector add, dot product, matrix–vector and matrix–matrix products." caption="Rooflines for the 64-core CPU of the text (2.56 TFLOP/s, 204.8 GB/s) and an NVIDIA A100 (9.7 TFLOP/s in FP64, 1,555 GB/s). The three vector and matrix–vector kernels sit on the sloped, memory-bound part; only the blocked matrix–matrix product reaches the flat roof. On the slope the GPU is faster by its bandwidth ratio, 7.6, not by its FLOP ratio." >}}

The condition "if each number crosses the memory bus only once" is what libraries work hard to meet. A naive triple loop for $C = AB$ re-reads a whole column of $B$ for every element of $C$ and runs memory-bound. Optimised BLAS libraries (OpenBLAS, Intel MKL, BLIS) cut the matrices into blocks sized to fit in L1, L2 and L3, so that each block is loaded once and used many times; the result is typically 80 to 90 percent of peak. The same picture explains the GPU comparison in the figure. Moving a memory-bound code from the CPU to the A100 speeds it up by the ratio of the bandwidths, $1555/204.8 = 7.6$, while a compute-bound one gains the ratio of the peaks, $9.7/2.56 = 3.8$ in double precision, and far more if it can use the tensor cores.

{{< note type="practice" title="From the lab" >}}
In a classical molecular dynamics step, the short-range pair forces dominate the cost. Each atom's coordinates are loaded once and used for the several hundred neighbours within a 1.0 to 1.2 nm cut-off in a dense liquid, with 20 or more floating-point operations per pair, so the kernel sits well to the right of the ridge when the neighbour data stays in cache. That is why GROMACS and LAMMPS sort atoms spatially (neighbours in space become neighbours in memory) and why non-bonded kernels ported well to GPUs. The long-range part, particle-mesh Ewald, relies on three-dimensional FFTs, whose intensity grows only as $\log n$; on many nodes it becomes communication-bound, and GROMACS can dedicate separate ranks to it for that reason. In plane-wave DFT the balance is similar: dense linear algebra for orthogonalisation and subspace diagonalisation runs near peak, while FFTs and wavefunction updates are bandwidth-limited.
{{< /note >}}

## Many processors at once

Clock frequencies stopped rising around 2005 because of heat, so performance now comes from **parallelism** at every level:

| Level | Example | How you use it |
|---|---|---|
| Vector (SIMD) | one instruction on 8 doubles | the compiler, with `-O2 -march=native` |
| Cores in a chip | 8–128 cores sharing memory | threads: OpenMP, NumPy's BLAS |
| GPU | thousands of cores, own memory | CUDA, PyTorch, GPU builds of GROMACS and LAMMPS |
| Nodes in a cluster | hundreds of machines on a network | processes: MPI, job schedulers |

Each level has a cost. Threads must not write to the same data at once; MPI processes must send messages over a network that is thousands of times slower than cache. Good parallel codes divide the work so that each processor mostly uses data it already has, a theme that returns in the chapters on [clusters](../linux-for-simulation/) and [molecular dynamics](../molecular-dynamics/).

### Amdahl's law: the part that does not parallelise

Gene Amdahl pointed out in 1967 that adding processors speeds up only the part of a program that can be divided among them. If a fraction $p$ of the single-core run time is perfectly parallel and the rest is serial, the speed-up on $N$ cores is bounded.

{{< eq title="Amdahl's law" say="The serial fraction sets a ceiling on the speed-up, however many cores you add." >}}
$$ \textcolor{#e64980}{S}(\textcolor{#4c6ef5}{N}) = \frac{1}{(1-\textcolor{#12a594}{p}) + \textcolor{#12a594}{p}/\textcolor{#4c6ef5}{N}} \;\xrightarrow{\;N\to\infty\;}\; \frac{1}{1-\textcolor{#12a594}{p}} $$
- $\textcolor{#e64980}{S}$: speed-up relative to one core
- $\textcolor{#4c6ef5}{N}$: number of cores or processes
- $\textcolor{#12a594}{p}$: fraction of the serial run time that parallelises
{{< /eq >}}

With $p = 0.95$, 64 cores give $1/(0.05 + 0.95/64) = 15.4$, not 64, and no number of cores can exceed 20. The serial 5 percent might be reading the input, writing a trajectory frame from a single process, or a Python analysis loop that runs between parallel steps. Real codes do worse than Amdahl's bound, because communication grows with $N$: in a domain-decomposed MD run, each process must exchange the atoms near its boundary at every step, and when the domains become small enough that most of their atoms are near a boundary, adding nodes makes the run slower. A **strong-scaling** test (fixed system, increasing $N$) finds the point where the efficiency $S/N$ drops below about 0.7, and that is a sensible size for production runs. John Gustafson's 1988 counterpoint is that scientists usually grow the problem with the machine; in **weak scaling** (work per core fixed) the serial fraction shrinks and the efficiency can stay near 1 to very large $N$.

{{< note type="key" >}}
- A computer repeatedly fetches, decodes and executes instructions stored in memory, alongside data.
- Speed comes from doing more per tick (pipelines, vectors) and from parallelism, not from faster clocks.
- Moving data is the real bottleneck: caches, locality and arithmetic intensity decide how close a code gets to peak.
- The roofline separates memory-bound from compute-bound kernels; Amdahl's law bounds what parallelism can gain.
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
- q: "Adding two large arrays element by element runs at less than one percent of the CPU's peak. Why?"
  options: ["Addition is a slow instruction", "Each addition needs 24 bytes from memory, so memory bandwidth, not arithmetic, limits the speed", "The compiler cannot vectorise it"]
  answer: 1
  why: "Its arithmetic intensity is about 1/24 FLOP per byte. The roofline model says the attainable rate is intensity times bandwidth, far below peak."
- q: "Why does the cache load 64 bytes when a program asks for one 8-byte number?"
  options: ["To waste memory", "Programs usually use neighbouring data next (spatial locality), so fetching the whole line pays off", "Because RAM cannot read 8 bytes"]
  answer: 1
  why: "Spatial locality makes it likely that the next accesses fall in the same line, which then costs almost nothing."
- q: "A code is 90% parallel. What is the largest speed-up it can reach on 1,000 cores?"
  options: ["About 900", "Just under 10", "About 100"]
  answer: 1
  why: "Amdahl's law gives 1/(0.1 + 0.9/1000) ≈ 9.9. The serial 10% sets a ceiling of 10 however many cores are added."
- q: "A memory-bound kernel runs at 8 GFLOP/s on a CPU with 205 GB/s of bandwidth. Roughly how fast will it run on a GPU with 1,555 GB/s?"
  options: ["About 8 GFLOP/s", "About 60 GFLOP/s", "At the GPU's peak of 9,700 GFLOP/s"]
  answer: 1
  why: "On the sloped part of the roofline the rate is intensity × bandwidth, so it scales with the bandwidth ratio, 1555/205 ≈ 7.6."
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
8. G. M. Amdahl, “Validity of the single processor approach to achieving large scale computing capabilities,” *AFIPS Conference Proceedings* **30**, 483–485 (1967).
9. J. L. Gustafson, “Reevaluating Amdahl's law,” *Communications of the ACM* **31**(5), 532–533 (1988).
10. W. A. Wulf and S. A. McKee, “Hitting the memory wall: implications of the obvious,” *ACM SIGARCH Computer Architecture News* **23**(1), 20–24 (1995).
11. J. Backus, “Can programming be liberated from the von Neumann style? A functional style and its algebra of programs,” *Communications of the ACM* **21**(8), 613–641 (1978).

</div>
