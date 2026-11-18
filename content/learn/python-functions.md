---
title: "Functions and modules"
description: "Writing and calling functions; positional, keyword, default and variable arguments and the mutable-default trap; local, enclosing, global and built-in scope; frames, the call stack, recursion and tracebacks; functions as values, lambdas, closures and decorators; and organising code into modules and packages, with environments and the standard library."
hook: "Give a Python function an empty list as its default argument and the list can come back already holding items from earlier calls. It was created once, when def ran, and every call since has shared it."
objectives:
  - "Write functions with positional, keyword, default and keyword-only arguments and clear docstrings"
  - "Diagnose the mutable-default trap and UnboundLocalError using the LEGB scope rule"
  - "Trace frames on the call stack through recursion and read a traceback from the bottom up"
  - "Pass functions as values with lambdas, closures and decorators"
  - "Organise code into modules and environments, and test functions against known answers"
cover: "cover.svg"
milestones:
  - year: 1936
    text: "Alonzo Church uses his lambda calculus to settle Hilbert's decision problem"
  - year: 1960
    text: "John McCarthy's LISP paper makes recursive functions central to programming"
  - year: 2001
    text: "Jeremy Hylton's PEP 227 gives Python nested scopes and true closures"
track: pycore
weight: 4
level: Foundation
prereqs: ["python-control-flow"]
lab: "Watch frames appear and disappear on the call stack, including recursion"
---

## Why functions

A **function** packages a computation under a name so that it can be used without thinking about how it works. A function that returns the Lennard-Jones energy of two atoms can be called a million times inside a simulation loop, tested once on its own, and replaced by a faster or more accurate version without touching the code that calls it. Functions are the main tool for controlling complexity in a program, in the same way that lemmas control complexity in a proof: each one does one clearly stated job, and larger results are built from them.

A function is defined with `def`:

```python
def lennard_jones(r, epsilon=1.0, sigma=1.0):
    """Pair energy of two atoms at distance r (same length units as sigma)."""
    sr6 = (sigma / r) ** 6
    return 4 * epsilon * (sr6 * sr6 - sr6)
```

The header names the function and its **parameters**; the indented body runs each time the function is **called**; `return` hands a value back to the caller and ends the call. A function that reaches the end of its body without `return` returns `None`. The string in triple quotes on the first line of the body is the **docstring**: it documents what the function does, and `help(lennard_jones)` displays it. Good docstrings state the meaning and units of each argument and of the result, which in scientific code are the things most often misunderstood.

As [the chapter on how Python runs](../how-python-runs/) showed, `def` is an executable statement. The body is compiled once, together with the rest of the module, into a code object; when the `def` line is executed, `MAKE_FUNCTION` wraps that code object in a function object and binds the name to it. A function is therefore an ordinary object, like an integer or a list: it can be bound to another name, stored in a list or passed to another function, possibilities used later in this topic.

## Arguments

When a function is called, its parameters are bound to the **arguments** supplied. Arguments can be given by position, `lennard_jones(1.5)`, or by name, `lennard_jones(r=1.5, sigma=1.2)`. Parameters with **default values** may be omitted. Keyword arguments make calls self-documenting: `run(steps=10000, dt=0.002, temperature=300)` can be understood without looking up the order of the parameters, and Python rejects a misspelt keyword immediately.

Two special forms collect a variable number of arguments. A parameter written `*values` gathers all extra positional arguments into a tuple, and `**options` gathers extra keyword arguments into a dictionary. Parameters placed after a bare `*` must be given by keyword, which is a good way to force clarity for options that are easily confused:

```python
def mean(*values):
    return sum(values) / len(values)

def integrate(f, a, b, *, n=1000, method="simpson"):   # n and method keyword-only
    ...
```

Binding parameters to arguments is ordinary assignment, so the rules of [objects and names](../python-objects-and-names/) apply. The function's parameter and the caller's variable refer to the same object. A function that appends to a list it was given modifies the caller's list; a function that rebinds its parameter, `values = values + [x]`, does not.

The same rule produces a notorious trap. Default values are evaluated **once**, when the `def` statement runs, not each time the function is called. A mutable default is therefore shared by every call that uses it:

```python
def append_to(item, bucket=[]):    # one list, created when the def runs
    bucket.append(item)
    return bucket

append_to(1)    # [1]
append_to(2)    # [1, 2]  -- the same list again
```

The figure below shows the shared list sitting in memory between calls. The standard fix is to use `None` as the default and create the list inside the function: `if bucket is None: bucket = []`.

{{< widget name="pytutor" title="Frames on the call stack" caption="Each call creates a frame (left) holding the function's local names; the frame disappears when the function returns. The recursive factorial builds a tower of frames that all exist at once. The mutable-default example shows the default list surviving between calls." opts=`{"presets":[["call","Calling a function","def kinetic(m, v):\n    e = 0.5 * m * v * v\n    return e\n\nk1 = kinetic(2.0, 3.0)\nk2 = kinetic(1.0, 4.0)\nprint(k1, k2)\n"],["rec","Recursion","def factorial(n):\n    if n == 0:\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(4))\n"],["default","The mutable default","def append_to(item, bucket=[]):\n    bucket.append(item)\n    return bucket\n\na = append_to(1)\nb = append_to(2)\nprint(a, b, a is b)\n"],["closure","A closure","def make_counter():\n    count = 0\n    def increment():\n        nonlocal count\n        count += 1\n        return count\n    return increment\n\ntick = make_counter()\ntick()\ntick()\nprint(tick())\n"]]}` >}}

## Scope

Every name lives in a **namespace**, and the region of code in which a name is visible is its **scope**. Names assigned inside a function are **local** to that function: they are created in the function's frame when it runs and vanish when it returns, and a local name hides any name of the same spelling outside. This is what makes functions safe to combine: a variable `i` inside one function cannot clash with an `i` in another.

When Python looks up a name, it searches four scopes in order, known as the **LEGB rule**: the **L**ocal scope of the current function, then the scopes of any **E**nclosing functions (for functions defined inside other functions), then the **G**lobal scope of the module, and finally the **B**uilt-in scope, which holds names such as `print`, `len` and `range`. The first match wins. This is why you can accidentally hide a built-in by naming a variable `sum` or `list`, after which `sum(...)` no longer works in that scope.

{{< fig src="legb.svg" alt="Four nested rounded boxes labelled Built-in, Global, Enclosing and Local, from the outside in. From three dots inside the Local box, arrows rise to the name count in the Enclosing box, the name x in the Global box and the name len in the Built-in box." caption="Name lookup inside the closure increment from the counter example in the figure above. Each lookup starts in the local scope and moves outwards until it finds the name; a name bound in an inner scope hides the same name further out." >}}

The compiler decides at compile time which names are local: any name that is **assigned** anywhere in a function is local throughout that function. This leads to a surprising error:

```python
x = 10
def g():
    print(x)     # UnboundLocalError: x is local to g, because of the next line
    x = 5
```

Because `x` is assigned in `g`, every use of `x` in `g` refers to the local variable, which does not yet exist when `print` runs. To rebind a module-level name from inside a function, declare it with `global x`; to rebind a name of an enclosing function, use `nonlocal`. Both should be rare. A function that reads and writes global state is hard to test and hard to reason about; passing values in as arguments and returning results is almost always better.

## The call stack and recursion

When one function calls another, the caller's frame stays alive, waiting, while a new frame is created for the callee. The frames form a **stack**: the most recent call is on top, and returning pops it off and resumes the frame below. The figure shows this directly. Step through the factorial example: `factorial(4)` calls `factorial(3)`, which calls `factorial(2)`, and so on, until five frames for the same function exist at once, each with its own value of `n`. Then the calls return one by one, each multiplying the value returned from below.

A function that calls itself is **recursive**. Recursion is natural for problems that contain smaller copies of themselves: traversing a tree, a nested data structure or a directory hierarchy, or dividing a problem in two repeatedly. Every recursion needs a **base case** that returns without recursing, here `n == 0`; without it the stack grows until Python stops it with a `RecursionError`, by default after 1000 nested calls. Because each call costs a frame and Python does not optimise tail calls, deep recursion is better written as a loop in Python.

The call stack is also what a **traceback** shows. When an exception goes unhandled, Python prints each frame that was active, from the outermost call to the one where the error occurred, with the file, line and source text of each. Reading a traceback from the bottom up tells you what failed and then, frame by frame, how the program got there.

### Reading a real traceback

The figure below shows a traceback from a small script, `run.py`, whose input placed two atoms at the same position. `run_md` calls `total_energy`, which loops over pairs and calls `lennard_jones` with the distance between atoms 0 and 2, which is zero. The division `sigma / r` raises `ZeroDivisionError`, nothing catches it, and Python prints the four frames that were on the stack at that moment. Read from the bottom: the last line names the exception and its message; above it is the line that raised it, `sr6 = (sigma / r) ** 6` in `lennard_jones`; above that, line 10 of `total_energy` made the call with `r = 0.0`; and so on outwards to the module.

{{< fig src="traceback.svg" alt="Left: four stacked frames, newest on top: lennard_jones with r = 0.0, total_energy with i = 0, j = 2 and r = 0.0, run_md with step = 0, and the module. Right: the traceback Python prints, listing the same frames oldest first, numbered 1 to 4 to match the frames, and ending in ZeroDivisionError: float division by zero." caption="A traceback is the call stack printed upside down: oldest call first, most recent call last. The text on the right is produced by running the script each time the figure is drawn." >}}

The bug is not where the exception was raised. `lennard_jones` did the right thing with the number it was given; the useful question, frame by frame, is where the bad value came from, and here the answer lies outside every frame, in the input structure. A debugger lets you stop in the failing frame and inspect the local variables drawn in the left column: `python -m pdb -c continue run.py` runs the script and stops at the uncaught exception, `breakpoint()` placed in the code stops there, and in Jupyter the `%debug` magic opens the debugger on the most recent traceback. Commands such as `up` and `down` then move between frames, and `p r` prints a variable. A guard at the boundary, such as checking the minimum interatomic distance when a structure is read and raising a `ValueError` that names the two atoms, turns a confusing failure three calls deep into a clear message at the point where the data entered the program.

## Functions as values

Because functions are objects, they can be passed to other functions. A numerical derivative can be written once for any function:

{{< py title="functions that take functions" >}}
import math

def derivative(f, x, h=1e-5):
    """Central-difference estimate of f'(x)."""
    return (f(x + h) - f(x - h)) / (2 * h)

print(derivative(math.sin, 0.0))          # cos(0) = 1
print(derivative(lambda x: x**3, 2.0))    # 3 * 2**2 = 12

atoms = [("O", 15.999), ("H", 1.008), ("C", 12.011)]
print(sorted(atoms, key=lambda a: a[1]))  # sort by mass
{{< /py >}}

A **lambda** is a small anonymous function written as an expression, `lambda x: x**3`, useful for one-off functions such as sort keys. Functions that take or return other functions are called **higher-order functions**. They are everywhere in scientific Python: `scipy.optimize.minimize(f, x0)` minimises any function you give it, `scipy.integrate.solve_ivp(rhs, ...)` integrates any system of differential equations, and machine-learning frameworks take loss functions as arguments.

{{< note type="warn" title="Myth" >}}
**Myth:** a `lambda` is a lighter, faster kind of function. **Reality:** `lambda x: x**3` and `def cube(x): return x**3` compile to the same kind of code object and produce the same kind of function object, and calling them costs the same. A lambda is an expression, can contain only a single expression, and has no name of its own: its `__name__` is `'<lambda>'`, which makes tracebacks less informative. Binding a lambda to a name, `cube = lambda x: x**3`, has the cost of a `def` without its readability, and PEP 8 recommends `def` in that case.
{{< /note >}}

A function defined inside another function can use the enclosing function's variables, and it keeps them alive after the outer function has returned. The combination of a function and the variables it captured is a **closure**. In the last example of the figure, `make_counter` returns the inner function `increment`, which carries the variable `count` with it; each call of `tick()` increments that private count. Closures are a lightweight alternative to classes for attaching state to a function.

{{< note type="try" title="Pause and predict" >}}
`fs = [lambda: i for i in range(3)]` builds three functions. What does `[f() for f in fs]` return? Not `[0, 1, 2]` but `[2, 2, 2]`. Each lambda captures the *variable* `i`, not its value at the moment the lambda was created, and by the time the functions are called the loop has finished with `i` equal to 2. This **late binding** follows directly from how closures refer to enclosing variables. The standard fix freezes the current value as a default argument, `lambda i=i: i`, which is evaluated once when the lambda is created: the same rule that makes mutable defaults dangerous, here put to use.
{{< /note >}}

A **decorator** is a function that takes a function and returns a modified version, applied with the `@` syntax above a `def`. `@functools.lru_cache` remembers previous results so that an expensive function is not recomputed for the same arguments; `@numba.njit` compiles a numerical function to machine code; `@property` turns a method into an attribute. You will use decorators long before you need to write one.

The effect of `@functools.lru_cache` is easiest to see on the recursive Fibonacci function, `fib(n) = fib(n - 1) + fib(n - 2)` with `fib(0) = 0` and `fib(1) = 1`. Written directly, every call makes two more and the same values are recomputed over and over: the number of calls obeys $C(n) = 1 + C(n - 1) + C(n - 2)$, which grows like the Fibonacci numbers themselves, by the golden ratio, 1.618, for each step in $n$. `fib(30)` makes 2 692 537 calls and `fib(40)` 331 160 281, tens of seconds of CPython time. With `@functools.lru_cache(maxsize=None)` above the `def`, each value is computed once and afterwards looked up, and `fib(30)` makes 31 calls.

{{< fig src="memo.svg" alt="Semi-log plot of the number of calls against n for fib(n). Plain recursion rises along a straight line to about 3e8 calls at n = 40, with 2,692,537 calls marked at n = 30. With lru_cache the count is n + 1, marked as 31 calls at n = 30." caption="Calls made by recursive Fibonacci, counted by running it up to n = 25 and from the recurrence C(n) = 1 + C(n − 1) + C(n − 2) beyond. Memoisation turns exponential work into linear work." >}}

The same decorator pays off in research code whenever an expensive pure function is called repeatedly with the same arguments, such as a tabulated pair parameter looked up for every pair of element symbols, or a structure factor evaluated at a fixed set of wavevectors. It is wrong for functions whose result depends on anything besides their arguments, such as a file that may change, and its arguments must be hashable, which rules out lists and NumPy arrays.

{{< note type="practice" title="From the lab" >}}
Fitting an equation of state is a higher-order function call. To get the equilibrium volume and bulk modulus of a crystal, one computes the DFT energy at seven to eleven volumes within a few per cent of the expected minimum and fits the third-order Birch–Murnaghan form with `scipy.optimize.curve_fit(birch_murnaghan, volumes, energies, p0=guess)`, where `birch_murnaghan(V, E0, V0, B0, B0p)` is an ordinary Python function that `curve_fit` calls many times with trial parameters. Two practical points follow. The starting guess `p0` matters, because the fit is a local optimisation that can wander off from a poor guess; taking `V0` and `E0` from the lowest computed point is usually enough. And the function must accept a whole NumPy array of volumes, because `curve_fit` passes the array in one call. ASE packages the same procedure as `ase.eos.EquationOfState`.
{{< /note >}}

### Choosing the step h

The `derivative` function above has a default step `h=1e-5`, and the value is not arbitrary. Two errors compete. Expanding $f(x \pm h)$ in a Taylor series shows that the central difference differs from $f'(x)$ by $h^2 f'''(x)/6$ plus higher-order terms, so a smaller $h$ reduces this **truncation error**. But $f(x + h)$ and $f(x - h)$ are each rounded to about 16 significant digits, and subtracting two nearly equal numbers cancels the leading digits they share. The rounding error of the difference, divided by $2h$, grows roughly as $\varepsilon |f| / h$, where $\varepsilon \approx 2.2 \times 10^{-16}$ is the machine epsilon of [double precision](../numbers-in-a-computer/). Setting the derivative of the sum of the two terms to zero puts the best step at $h \approx (3\varepsilon |f / f'''|)^{1/3}$, which for $\sin x$ at $x = 1$ is $1.0 \times 10^{-5}$. The figure shows both regimes. At the default step the error is about $10^{-11}$; at $h = 10^{-10}$ it is of order $10^{-7}$, some four orders of magnitude worse, not better. The one-sided forward difference $(f(x + h) - f(x))/h$ has a truncation error proportional to $h$ rather than $h^2$, its best step is near $\sqrt\varepsilon \approx 10^{-8}$, and the best accuracy it reaches is two to three orders of magnitude worse than that of the central difference. Automatic differentiation, used by JAX and PyTorch and described in [the chapter on derivatives](../derivatives/), avoids the trade-off entirely by applying the chain rule to the program itself.

{{< fig src="stepsize.svg" alt="Log-log plot of the absolute error of numerical derivatives of sin x at x = 1 against the step h, from 1e-13 to 0.5. The central-difference error follows a dashed line of slope minus one at small h, reaches a minimum near 1e-12 around h = 1e-5, then rises along a dashed line of slope two. The forward-difference error has its minimum near h = 1e-8 and rises with slope one." caption="Error of the chapter's derivative function against its step. Left of each minimum, rounding error in the difference of two nearly equal numbers dominates; right of it, truncation error. The default h = 1e-5 sits near the bottom of the central-difference valley." >}}

## Modules and packages

A **module** is a file of Python code, and `import` makes its contents available. `import math` finds the module, executes it once (later imports reuse the already-loaded module object), and binds the name `math` to the module object, whose attributes are the names the module defined: `math.sqrt`, `math.pi`. Variants bind other names: `from math import sqrt, pi` binds just those names, and `import numpy as np` binds a shorter alias, a convention so universal that `np`, `plt` for `matplotlib.pyplot` and `pd` for `pandas` are understood by every reader. Avoid `from module import *`, which floods your namespace with unknown names.

Your own code becomes a module simply by saving it as a `.py` file. Python finds modules by searching the directories listed in `sys.path`: the directory of the script being run, the standard library and the `site-packages` directory of the active environment. A directory of modules with an `__init__.py` file is a **package**, imported as `import mypackage.analysis`.

When a file is run as a script, Python sets the module variable `__name__` to `"__main__"`; when it is imported, `__name__` is the module's name. The idiom

```python
if __name__ == "__main__":
    main()
```

at the bottom of a file therefore runs `main()` only when the file is executed directly, so the same file can serve both as a script and as a library of functions for other scripts and for tests.

Python's **standard library** is large, and knowing what is in it saves writing code. Among the modules most used in scientific work are `math` and `cmath`, `random`, `statistics`, `itertools` (combinations, permutations and other iteration tools), `collections` (`Counter`, `defaultdict`, `deque`), `pathlib` (file paths), `json` and `csv`, `time` and `datetime`, `subprocess` (running other programs, such as a simulation engine), `argparse` (command-line options) and `multiprocessing`. Third-party packages, above all NumPy, SciPy, Matplotlib, pandas, ASE and PyTorch, are installed with `pip install` or `conda install` into an **environment**: an isolated directory with its own interpreter and packages, created with `python -m venv` or `conda create`. Keeping one environment per project, with the package versions recorded in a `requirements.txt` or `environment.yml` file, is what makes a computational result reproducible on another machine or a cluster ([the chapter on Linux for simulation](../linux-for-simulation/) covers the cluster side).

## Writing good scientific functions

A few habits make functions in scientific code much more trustworthy. Prefer **pure functions**, whose result depends only on their arguments and which change nothing outside themselves: they can be tested in isolation and called from anywhere, including in parallel. Keep each function to one task that can be described in a sentence. State units in the docstring, or better, choose a consistent unit system for the whole program and say so once.

Above all, **test** functions against cases where the answer is known. The Lennard-Jones energy at its minimum, $r = 2^{1/6}\sigma$, must be exactly $-\varepsilon$; a derivative of $\sin$ at zero must be 1; a function that computes kinetic energy must give zero for zero velocity. Such checks can be written as `assert` statements and collected into test files that a tool such as `pytest` runs automatically:

```python
def test_lj_minimum():
    r_min = 2 ** (1 / 6)
    assert abs(lennard_jones(r_min) - (-1.0)) < 1e-12
```

A few minutes spent on tests like this routinely catches the sign errors and unit mistakes that would otherwise invalidate weeks of simulation.

{{< note type="key" >}}
- `def` builds a function object at run time; parameters are bound to arguments by assignment, so mutable arguments can be modified by the function.
- Defaults are evaluated once; use `None` instead of a mutable default. Keyword and keyword-only arguments make calls clear.
- Names are looked up Local, Enclosing, Global, Built-in; any name assigned in a function is local throughout it.
- Each call gets a frame on the call stack; recursion needs a base case and is limited to about 1000 levels; tracebacks list the frames.
- Functions are values: pass them to other functions, write lambdas, closures and decorators. Modules and packages organise code; environments make it reproducible; tests make it trustworthy.
{{< /note >}}

{{< quiz >}}
- q: "def f(a, b=2, *, c=3): ... Which call is invalid?"
  options: ["f(1)", "f(1, 5, c=7)", "f(1, 5, 7)"]
  answer: 2
  why: "c is keyword-only because it follows the bare *; it cannot be passed by position."
- q: "Why does `def add(x, seen=[])` cause bugs?"
  options: ["Lists are not allowed as defaults", "The default list is created once when def runs and shared by every call that omits the argument", "It makes the function recursive"]
  answer: 1
  why: "Use seen=None and create a new list inside the function."
- q: "A function assigns `total = 0` and later reads `total`. A global named total also exists. Which is used inside the function?"
  options: ["The global", "The local one, everywhere in the function", "Python raises a NameError"]
  answer: 1
  why: "Assignment anywhere in a function makes the name local throughout that function."
- q: "What does `if __name__ == '__main__':` achieve?"
  options: ["It makes the file run faster", "The guarded code runs only when the file is executed as a script, not when it is imported", "It is required in every Python file"]
  answer: 1
  why: "Imported modules have __name__ set to their module name, so their main code does not run on import."
- q: "factorial(4) is computed recursively. How many factorial frames exist at the deepest point?"
  options: ["1", "4", "5"]
  answer: 2
  why: "factorial(4), (3), (2), (1) and (0) are all on the stack when the base case is reached."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. The Python Tutorial, sections 4.7–4.9 (defining functions) and 6 (modules), docs.python.org/3/tutorial.
2. The Python Language Reference, section 4.2 (naming and binding), on scopes and name resolution.
3. L. Ramalho, *Fluent Python*, 2nd ed., O'Reilly (2022), chapters 7 and 9 (functions as objects, decorators and closures).
4. G. Wilson et al., "Best practices for scientific computing", *PLOS Biology* **12**, e1001745 (2014).
5. G. Wilson et al., "Good enough practices in scientific computing", *PLOS Computational Biology* **13**, e1005510 (2017).
6. The pytest documentation, docs.pytest.org; the Python Packaging User Guide, packaging.python.org, on environments and installing packages.

</div>
