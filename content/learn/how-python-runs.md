---
title: "How Python runs"
description: "What happens between typing a Python program and the processor doing the work: interpreters and compilers, the CPython implementation, tokenising, parsing into a syntax tree, compiling to bytecode, the stack-based virtual machine and its frames, objects on the heap, and why this design makes Python flexible but slower than C or Fortran."
hook: "A missing bracket on line 40 means that line 1 of a Python script never runs. The reason is that Python is compiled after all, into bytecode for a machine that exists only in software."
objectives:
  - "Explain how CPython combines compilation to bytecode with interpretation by a virtual machine"
  - "Trace source code through tokens, a syntax tree and bytecode with tokenize, ast and dis"
  - "Distinguish syntax errors caught before running from errors raised during execution"
  - "Interpret stack-machine bytecode, frames and the call stack behind a traceback"
  - "Explain why each Python operation costs far more than its compiled equivalent"
cover: "cover.svg"
milestones:
  - year: 1991
    text: "Guido van Rossum posts the first public Python release, 0.9.0, to alt.sources"
  - year: 2022
    text: "Python 3.11 ships Mark Shannon's specialising adaptive interpreter, described in PEP 659"
  - year: 2024
    text: "Python 3.13 adds Brandt Bucher's experimental JIT and Sam Gross's free-threaded build"
track: pycore
weight: 1
level: Foundation
prereqs: ["inside-a-computer"]
lab: "Watch real CPython tokenise, parse and compile your code, then step through its virtual machine"
---

## The processor only understands machine code

A processor executes **machine code**: sequences of very simple binary instructions such as "load the 8 bytes at this memory address into register 3", "add register 3 to register 5" or "if the last result was zero, continue at that address". [The chapter on computer architecture](../inside-a-computer/) shows a toy processor doing exactly this. Every program that runs on a computer, whether it was written in Python, Fortran or JavaScript, must in the end be turned into such instructions, because nothing else can drive the hardware.

There are two broad strategies for getting from a human-readable language to machine code. A **compiler** translates the whole program into machine code before it runs. Fortran and C work this way: you run `gfortran md.f90 -o md`, the compiler produces a file of machine code called an executable, and when you run `./md` the processor executes that file directly. Compilation takes time, but the result runs fast, because the compiler has studied the whole program and chosen efficient instructions for it.

An **interpreter** takes the other approach. It is itself a program, already compiled to machine code, that reads your program and carries out what it says, step by step, while it runs. Nothing in your program is ever turned into machine code of its own; instead the interpreter's machine code examines your instructions one at a time and performs them. This is slower, since the interpreter has to work out what each step means every time it reaches it, but it is enormously flexible: you can type a line and see the result immediately, change a program while it runs, and inspect anything at any moment.

Python, as it is normally used, sits between the two. The program that runs Python code is called **CPython**, because it is written in C. It is the reference implementation, distributed from python.org and by Anaconda, Homebrew and every Linux distribution. CPython first *compiles* your program, not into machine code but into a compact intermediate form called **bytecode**, and then *interprets* the bytecode with a loop written in C called the **virtual machine**. The rest of this chapter follows a small program through each stage.

Other implementations of the same language exist. PyPy compiles frequently executed parts of a program into machine code while it runs (just-in-time compilation) and is often several times faster on pure-Python loops. The Python inside this page is **Pyodide**: CPython itself, compiled to WebAssembly, the portable machine code that web browsers can run. When you press a run button on this site, it is the genuine CPython 3.12 interpreter that executes your code, just running inside the browser rather than directly on your operating system.

{{< fig src="routes.svg" alt="Three lanes ending at one processor box. Fortran source is compiled to machine code before execution and runs directly. Python source is compiled to bytecode, which a virtual machine written in C carries out one instruction at a time. In the third lane an interpreter watches for hot loops and compiles them to machine code while the program runs." caption="Every route ends in machine code on the processor. The routes differ in when the translation happens and in what the processor actually executes: your program itself, or an interpreter acting on its behalf." >}}

The three lanes of the figure differ in one respect that decides speed. In the first lane the processor executes instructions derived from *your* program, chosen by a compiler that knew every type in advance. In the second it executes the instructions of the CPython virtual machine, which reads your bytecode as data. In the third, a just-in-time compiler observes which loops run often and with which types, and only then emits machine code for them; Java's HotSpot virtual machine, the V8 JavaScript engine and PyPy all work this way. CPython 3.13 has taken a first step into the third lane, described at the end of the chapter.

{{< note type="story" >}}
Guido van Rossum started writing Python over the Christmas holidays of 1989 at the Centrum Wiskunde & Informatica (CWI) in Amsterdam, as a successor to ABC, a teaching language he had worked on there, and named it after the BBC series *Monty Python's Flying Circus*. He posted version 0.9.0 to the Usenet group alt.sources in February 1991. The source files that hold the evaluation loop, `ceval.c`, and the bytecode compiler, `compile.c`, already existed in that release; three decades of work have rewritten what is inside them more than once without changing the division of labour.
{{< /note >}}

## Starting the interpreter

When you type `python3 analyse.py` in a terminal, the shell asks the operating system to start a new process running the CPython executable, a file of machine code typically found at `/usr/bin/python3` or inside a conda environment, and passes it the argument `analyse.py` ([the chapter on how bash works](../how-bash-works/) describes this in detail). CPython initialises itself: it sets up its memory allocator, creates the built-in objects such as `int`, `print` and `None`, and imports a few essential modules. Then it reads your file and the pipeline below begins.

There are other ways to give CPython code. Typing `python3` with no file starts the **interactive interpreter**, or REPL (read–evaluate–print loop), which compiles and runs each statement as you enter it and prints the value of each expression. A **Jupyter notebook** sends cells of code to a long-running Python process called a kernel, which compiles and runs each cell when you execute it and keeps all names alive between cells. The cells on this site behave the same way: cells on one page share an interpreter, so a name defined in one cell can be used in the next.

Whichever way the code arrives, it passes through the same stages, summarised in the figure below and taken one at a time in the sections that follow.

{{< fig src="pipeline.svg" alt="Five boxes in a row: source text, tokens, syntax tree, code object and running program, joined by arrows labelled tokenizer, parser, compiler and virtual machine. A dashed path from source text to code object marks the pyc cache. Arrows below mark SyntaxError leaving from the tokenizer and parser, and run-time exceptions leaving from the running program." caption="The CPython pipeline for one line of code. A syntax error stops the pipeline before the virtual machine starts, so no line of the file runs; an exception raised while running arrives after every earlier line has already done its work, including any files it wrote." >}}

## From characters to tokens

To the computer, a program file is just a sequence of bytes. Python source files are encoded in UTF-8, in which every ordinary English letter, digit and symbol is one byte, the same value as in the old ASCII code, while characters such as `π`, `Å` or Chinese characters take two to four bytes. Python allows such characters in names and strings, so `Δx = 0.1` is a legal statement.

The first stage, the **tokenizer**, reads these characters and groups them into the words of the language, called **tokens**. In `y = 2 * (x + 4)` there are nine: the name `y`, the operator `=`, the number `2`, the operator `*`, an opening bracket, the name `x`, the operator `+`, the number `4` and a closing bracket. Spaces between tokens are discarded. Line structure is not: the tokenizer emits a `NEWLINE` token at the end of every logical line, and an `INDENT` or `DEDENT` token whenever the indentation increases or decreases. This is how Python's indentation becomes part of the grammar. Where C and Fortran use braces or `end do` to close a block, Python uses a `DEDENT` token generated from the whitespace.

The figure below runs the real CPython pipeline on any code you type. Press the button, then click through the stages.

{{< widget name="pypipeline" title="Source text, tokens, syntax tree, bytecode and result" caption="Every stage is produced by CPython 3.12 running in this page: the tokenize, ast and dis modules expose the interpreter's own internal steps. Edit the code and compile again; try adding a loop, a function or a deliberate mistake." >}}

## From tokens to a syntax tree

The second stage, the **parser**, checks that the sequence of tokens obeys Python's grammar and builds an **abstract syntax tree** (AST) that records the structure of the program. Look at the syntax tree in the figure for `y = 2 * (x + 4)`. At the top is an `Assign` node with a target, the name `y` in "store" context, and a value. The value is a `BinOp` node for the multiplication, whose left operand is the constant 2 and whose right operand is another `BinOp` for the addition of `x` and 4. The brackets have disappeared, because the tree's shape already says that the addition happens first. Remove the brackets and compile again: now the multiplication `2 * x` is nested inside the addition, because `*` binds more tightly than `+`. Operator precedence is not a separate rule applied at run time; it is decided once, by the shape of the tree.

If the tokens do not form a valid program, parsing fails and Python reports a `SyntaxError` **before running anything at all**. Type `y = 2 * (x + 4` with the closing bracket missing and compile: there is no partial output, because no bytecode was ever produced. This is different from an error such as dividing by zero, which can only be discovered while the program runs. Distinguishing errors found while *reading* a program from errors found while *running* it is a useful habit when debugging.

## From the tree to bytecode

The third stage, the **compiler**, walks the syntax tree and emits bytecode. Bytecode is a list of simple instructions, each two bytes long (some followed by a few bytes of cache space), for an imaginary machine that does not exist in hardware: the CPython virtual machine. Open the bytecode stage of the figure. The assignment `x = 3` becomes two instructions, `LOAD_CONST 3` and `STORE_NAME x`; the expression `2 * (x + 4)` becomes "load 2, load x, load 4, add, multiply" in exactly the order the tree prescribes, so that the addition happens before the multiplication.

The order follows from how the compiler walks the tree: **depth first, children before parents**, a post-order traversal. To emit code for a `BinOp` node it first emits the code for its left operand, then for its right operand, then the operator. A stack machine needs exactly this order, because an operator can only run once both of its operands are on the stack. The figure numbers the nodes of the tree in the order the compiler visits them and shows the value stack after each of the six resulting instructions, with `x` bound to 3. The stack never holds more than three values for this statement. The compiler works out that maximum for every code object, stores it as `co_stacksize` (3 here), and each frame reserves exactly that much stack space when it is created, so the virtual machine never has to check for or grow a full stack while it runs.

{{< fig src="treestack.svg" alt="Top: the syntax tree of y = 2 * (x + 4), with an Assign node at the root, the target Name y, and nested BinOp nodes for multiplication and addition; the nodes are numbered 1 to 6 in post-order. Bottom: six snapshots of the value stack: [2], [2, 3], [2, 3, 4], [2, 7], [14], and finally empty with y bound to 14." caption="Bytecode is the syntax tree read children first. With x = 3 the stack peaks at three values; the addition and the multiplication then collapse it to 14, which STORE_NAME binds to y." >}}

The compiled result is a **code object**, containing the bytecode, the table of constants it uses (here 3, 2, 4 and `None`), the names it refers to, and a table mapping each instruction back to a line of the source, which is how error messages can tell you the line where something went wrong. Every function has a code object of its own, compiled once when the module is compiled.

Compiling is fast, but not free, so CPython caches the bytecode of imported modules. The first time you `import mymodule`, CPython writes the compiled code to a file such as `__pycache__/mymodule.cpython-312.pyc`, and later imports load the `.pyc` file directly if the source has not changed. That is the origin of the `__pycache__` directories that appear next to your code. You can look at any bytecode yourself with the standard `dis` module:

{{< py title="disassemble an expression" >}}
import dis
dis.dis("y = 2 * (x + 4)")
{{< /py >}}

{{< note type="warn" title="Myth" >}}
**Myth:** keeping `__pycache__`, or distributing `.pyc` files, makes a program run faster. **Reality:** a `.pyc` file holds exactly the bytecode the compiler would have produced anyway, so the virtual machine executes it at the same speed. The saving is only the tokenise, parse and compile work at import time, typically milliseconds per module; the Python tutorial says the same in its section on compiled files. The script named on the command line is never cached at all, only the modules it imports. A slow program is slow in the evaluation loop or in the libraries it calls.
{{< /note >}}

## The virtual machine

The bytecode is executed by the **evaluation loop**, a large function in CPython's C source (`Python/ceval.c`, with the instruction bodies defined in `Python/bytecodes.c` since version 3.12). In essence it is a loop that fetches the next instruction, looks at its opcode, jumps to the C code that implements that opcode, runs it, and repeats: a software imitation of a processor's fetch–decode–execute cycle.

CPython's virtual machine is a **stack machine**. It has no registers. Instead, each instruction takes its inputs from the top of a **value stack** and leaves its result there. `LOAD_CONST` pushes a constant. `LOAD_NAME` looks up a name and pushes the object it refers to. `BINARY_OP +` pops two values, adds them and pushes the sum. `STORE_NAME` pops the top value and binds a name to it. The figure below executes real CPython 3.12 bytecode for four short programs, one instruction at a time, and explains each instruction as it goes.

{{< widget name="stackvm" title="Inside CPython's virtual machine" caption="Left: the source, with the line being executed highlighted. Middle: the bytecode, with the next instruction highlighted. Right: the frames, each with its own value stack (top at the top) and its names. The bytecode is exactly what CPython 3.12 produces for these programs." >}}

Step through the four programs and some important facts about Python become visible. An `if` statement compiles to a comparison followed by a conditional jump, `POP_JUMP_IF_FALSE`: a decision is just a jump to a different instruction. A `for` loop compiles to `GET_ITER`, which creates an iterator object, then a `FOR_ITER` instruction that asks the iterator for the next value, the loop body, and a `JUMP_BACKWARD` that goes round again until the iterator is exhausted. `range(4)` produces numbers on demand rather than building a list of them.

The function-call program shows **frames**. A function definition, `def square(a)`, is not a declaration but an action performed at run time: `MAKE_FUNCTION` wraps the precompiled code of `square` in a new function object and `STORE_NAME` binds the name `square` to it. When `square(5)` is called, `CALL` creates a new frame, a block of memory holding the function's own value stack, its local variables and a pointer to where execution is in its bytecode. Execution continues in the new frame until `RETURN_VALUE` destroys it and hands the result back to the caller. The chain of frames waiting for each other is the **call stack**, which is what a traceback lists when an error occurs. Local variables are read with `LOAD_FAST`, which fetches them from a numbered slot in the frame, rather than `LOAD_NAME`, which searches dictionaries; this is why code inside functions runs noticeably faster than the same code at the top level of a script.

## Why Python is slower than C, and what has been done about it

Each bytecode instruction is carried out by C code that typically executes dozens to hundreds of machine instructions. The work is not only the arithmetic itself. To execute `BINARY_OP +` the interpreter must fetch and decode the instruction, check the types of both operands (they could be integers, floats, strings, lists or objects of a class you defined), find the right addition routine for those types, check whether the result fits, create a new object to hold it, and adjust reference counts. A compiled Fortran loop adding two arrays of numbers spends perhaps one or two machine instructions per element, because the compiler knew in advance that every element is a 64-bit float. The flexibility of Python, where any name may refer to any type of object at any moment, is paid for at every step.

### Measuring the overhead

{{< note type="try" title="Pause and predict" >}}
A script runs `for x in xs: s = s + x * x` over 200 000 floats at its top level. You indent the same lines into `def main():` and call `main()`. Does the loop get faster, slower, or stay the same, and by roughly how much? The right panel of the next figure has the measurement and the paragraph after it the reason.
{{< /note >}}

The cost can be measured directly. The left panel of the figure below times three ways of adding up N floats with CPython 3.13 on a Linux workstation: an explicit `for` loop, the built-in `sum()`, and NumPy's `a.sum()` on an array. The `for` loop costs about 20 ns per element at every size. At a 3 GHz clock that is some 60 processor cycles for one addition, spent dispatching the six instructions of each pass (`FOR_ITER`, `STORE_FAST`, a combined load of `s` and `x`, `BINARY_OP`, `STORE_FAST` and `JUMP_BACKWARD`), checking types, and allocating a new float object for every partial sum. `sum()` runs the same loop in C without dispatching any bytecode and needs about 7 ns per element; it still has to follow a pointer to each element and unpack a float object. NumPy works on a contiguous buffer of raw doubles and reaches 0.2 to 0.3 ns per element for large arrays, nearly a hundred times faster than the loop. For short inputs the order reverses: each NumPy call carries roughly a microsecond of fixed cost for argument parsing, type dispatch and creating the result, so below about a hundred elements `sum()` on a list is as fast or faster.

{{< fig src="overhead.svg" alt="Left: log-log plot of time per element against the number of floats N for a Python for loop, about 20 ns flat; built-in sum, about 7 ns; and NumPy sum, falling from about 100 ns at N = 10 to about 0.3 ns for large N. Right: bar chart of time per iteration for the loop s = s + x * x, about three times longer at module level than inside a function." caption="Measured with CPython 3.13 on a shared Linux workstation; absolute times vary between machines and runs, the ratios much less. NumPy pays about a microsecond per call and then a fraction of a nanosecond per element." >}}

The right panel tests a claim made earlier in this chapter. The same loop runs three to four times faster inside a function than at the top level of a script. At module level, every read and write of `s` and `x` is a `LOAD_NAME` or `STORE_NAME`, a dictionary lookup keyed by a string; inside a function the compiler has already assigned each local variable a numbered slot, and `LOAD_FAST` and `STORE_FAST` are array indexing. Wrapping the body of a script in a `main()` function is the cheapest optimisation available in Python.

{{< note type="practice" title="Back of the envelope" >}}
Write a Lennard-Jones molecular dynamics code in pure Python for 10 000 atoms with about 50 neighbours each inside the cutoff. One step evaluates 10 000 × 50 / 2 = 250 000 pairs. At roughly 0.5 µs per pair for the distance, the energy, three force components and their accumulation (merely visiting a pair costs 0.1 to 0.2 µs, as [the chapter on control flow](../python-control-flow/) measures), a step takes about 0.13 s, and 1 ns of trajectory at a 2 fs time step, 500 000 steps, takes about 63 000 s: 17 hours. LAMMPS needs of order a microsecond per atom per step on one core for a Lennard-Jones liquid, about 0.01 s per step here, and finishes the same run in under an hour and a half. A factor of ten to a hundred, on every step, is why the inner loops of every production MD and electronic-structure code are written in C, C++ or Fortran.
{{< /note >}}

This is not a reason to avoid Python; it is a reason to use it well. The usual pattern in scientific computing is to write the overall logic in Python and to hand the heavy numerical loops to compiled code: a NumPy operation on an array of a million numbers is a single Python-level instruction that runs a compiled C loop internally, so the interpreter's overhead is paid once rather than a million times ([the chapter on NumPy](../numpy-arrays/) explains how). Machine-learning frameworks such as PyTorch work the same way, with Python describing the computation and compiled kernels on the GPU doing it.

{{< note type="practice" title="From the lab" >}}
In a typical computational materials workflow, Python sits on top of compiled engines. ASE or pymatgen build the structures and write the input files, VASP or Quantum ESPRESSO (Fortran) or LAMMPS (C++) do the expensive work, and Python parses the output. Profiling such a workflow with `python -m cProfile -s cumtime workflow.py` usually shows nearly all of the wall time inside a call that waits for the external program or inside NumPy, and a few per cent in Python itself, so tuning the Python is wasted effort. The exceptions are analysis scripts that loop in pure Python over every atom of every frame of a long trajectory. Those loops are worth rewriting with NumPy array operations or compiling with Numba, whose `@njit` decorator translates a numerical Python function into machine code through the LLVM compiler the first time it is called.
{{< /note >}}

CPython itself has also become much faster. Since version 3.11 it has been a **specialising adaptive interpreter** (PEP 659): after an instruction has run a few times, CPython replaces it with a specialised version for the types it has actually seen, such as an addition that assumes two floats, guarded by a quick check. Version 3.13 added an experimental just-in-time compiler and an optional build without the global interpreter lock, which is discussed with parallelism in [the chapter on performance](../python-performance/).

## Every value is an object in memory

One more part of the machinery shapes everything else about the language. In CPython, every value, including every integer, float and string, is an **object**: a block of memory on the heap that begins with a header containing a **reference count** and a pointer to the object's **type**. The integer 1 is not a bare 8-byte number as it would be in Fortran; on a 64-bit build it is a 28-byte structure. Names, list slots and dictionary entries do not contain values; they contain *pointers* to objects.

{{< py title="objects, types and sizes" >}}
import sys
x = 300
print(type(x), id(x))               # every object has a type and an identity
print(sys.getsizeof(x), "bytes")    # 28 on 64-bit CPython; this page runs a 32-bit build
print(sys.getsizeof(2**100), "bytes for a 101-bit integer")
print(sys.getsizeof(1.5), "bytes for a float")
{{< /py >}}

The reference count records how many references point to the object. Binding a new name to it increments the count; deleting the name, rebinding it or leaving a function decrements it; and when the count reaches zero the memory is freed immediately. A separate **garbage collector** occasionally searches for groups of objects that refer to each other in a cycle and are unreachable from anywhere else, which reference counting alone cannot free.

This model, in which names are labels attached to objects rather than boxes containing values, explains behaviour that surprises almost every newcomer, such as two names that change together when a list is modified through one of them. [The next chapter](../python-objects-and-names/) makes it visible with a tool that draws every name and object in memory as a program runs.

{{< note type="key" >}}
- The processor runs only machine code. Compiled languages translate a whole program to machine code in advance; CPython compiles source to bytecode and interprets the bytecode with a virtual machine written in C.
- The pipeline is: bytes → tokens (tokenizer, including indentation) → abstract syntax tree (parser; syntax errors stop here) → bytecode in code objects (compiler; cached in `__pycache__`) → execution (evaluation loop).
- The virtual machine is a stack machine. Branches are conditional jumps, loops are iterators plus backward jumps, and each function call gets a frame on the call stack.
- Each bytecode instruction costs many machine instructions because types are checked at run time and every value is a heap object with a type and a reference count. Heavy numerical work belongs in compiled libraries such as NumPy.
{{< /note >}}

{{< quiz >}}
- q: "A file contains a missing closing bracket on line 40 and a print statement on line 1. What is printed when it is run?"
  options: ["The output of line 1, then a SyntaxError", "Only a SyntaxError: parsing fails before any bytecode is executed", "Nothing, Python ignores the bracket"]
  answer: 1
  why: "The whole file is tokenised, parsed and compiled before execution starts; a syntax error anywhere prevents any of it from running."
- q: "Which bytecode does CPython produce for the expression a + b * c, in order?"
  options: ["load a, load b, add, load c, multiply", "load a, load b, load c, multiply, add", "load b, load c, load a, add, multiply"]
  answer: 1
  why: "The syntax tree nests b * c inside the addition, so the compiler emits the multiplication before the addition, using the value stack to hold a until it is needed."
- q: "What does the __pycache__ directory contain?"
  options: ["Copies of your data files", "Compiled bytecode (.pyc) of imported modules, reused when the source has not changed", "Machine code produced by a JIT compiler"]
  answer: 1
  why: "CPython caches the compiler's output so that the tokenise–parse–compile stages can be skipped on later imports."
- q: "Why is a loop that adds a million floats one by one in Python much slower than the same loop in Fortran?"
  options: ["Python uses lower-precision floats", "Each iteration runs several bytecode instructions, each needing type checks, dispatch and object creation, whereas compiled Fortran uses a couple of machine instructions per element", "Python cannot add floats directly"]
  answer: 1
  why: "The interpreter's per-instruction overhead dominates; NumPy avoids it by running the whole loop in compiled code."
- q: "In CPython, what does a variable name hold?"
  options: ["The value itself, in a fixed-size box", "A reference (pointer) to an object on the heap", "A copy of the object"]
  answer: 1
  why: "Names are bound to objects; several names can refer to the same object."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. The Python Language Reference, sections 2 (lexical analysis) and 10 (full grammar specification), docs.python.org/3/reference.
2. The Python Standard Library documentation for the `tokenize`, `ast` and `dis` modules, docs.python.org/3/library, which describe the stages shown in the figures.
3. A. Shaw, *CPython Internals: Your Guide to the Python 3 Interpreter*, Real Python (2021).
4. M. Shannon, "PEP 659 – Specializing Adaptive Interpreter" (2021), peps.python.org/pep-0659.
5. B. Warsaw, "PEP 3147 – PYC Repository Directories" (2009), peps.python.org/pep-3147.
6. The CPython source code, github.com/python/cpython, in particular `Python/ceval.c` and `Python/bytecodes.c`.
7. Pyodide: CPython compiled to WebAssembly, pyodide.org.

</div>
