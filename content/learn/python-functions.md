---
title: "Functions, scope, the call stack and modules"
description: "Writing and calling functions; positional, keyword, default and variable arguments and the mutable-default trap; local, enclosing, global and built-in scope; frames, the call stack, recursion and tracebacks; functions as values, lambdas, closures and decorators; and organising code into modules and packages, with environments and the standard library."
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

As [the topic on how Python runs](../how-python-runs/) showed, `def` is an executable statement. The body is compiled once, together with the rest of the module, into a code object; when the `def` line is executed, `MAKE_FUNCTION` wraps that code object in a function object and binds the name to it. A function is therefore an ordinary object, like an integer or a list: it can be bound to another name, stored in a list or passed to another function, possibilities used later in this topic.

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

A function defined inside another function can use the enclosing function's variables, and it keeps them alive after the outer function has returned. The combination of a function and the variables it captured is a **closure**. In the last example of the figure, `make_counter` returns the inner function `increment`, which carries the variable `count` with it; each call of `tick()` increments that private count. Closures are a lightweight alternative to classes for attaching state to a function.

A **decorator** is a function that takes a function and returns a modified version, applied with the `@` syntax above a `def`. `@functools.lru_cache` remembers previous results so that an expensive function is not recomputed for the same arguments; `@numba.njit` compiles a numerical function to machine code; `@property` turns a method into an attribute. You will use decorators long before you need to write one.

## Modules and packages

A **module** is a file of Python code, and `import` makes its contents available. `import math` finds the module, executes it once (later imports reuse the already-loaded module object), and binds the name `math` to the module object, whose attributes are the names the module defined: `math.sqrt`, `math.pi`. Variants bind other names: `from math import sqrt, pi` binds just those names, and `import numpy as np` binds a shorter alias, a convention so universal that `np`, `plt` for `matplotlib.pyplot` and `pd` for `pandas` are understood by every reader. Avoid `from module import *`, which floods your namespace with unknown names.

Your own code becomes a module simply by saving it as a `.py` file. Python finds modules by searching the directories listed in `sys.path`: the directory of the script being run, the standard library and the `site-packages` directory of the active environment. A directory of modules with an `__init__.py` file is a **package**, imported as `import mypackage.analysis`.

When a file is run as a script, Python sets the module variable `__name__` to `"__main__"`; when it is imported, `__name__` is the module's name. The idiom

```python
if __name__ == "__main__":
    main()
```

at the bottom of a file therefore runs `main()` only when the file is executed directly, so the same file can serve both as a script and as a library of functions for other scripts and for tests.

Python's **standard library** is large, and knowing what is in it saves writing code. Among the modules most used in scientific work are `math` and `cmath`, `random`, `statistics`, `itertools` (combinations, permutations and other iteration tools), `collections` (`Counter`, `defaultdict`, `deque`), `pathlib` (file paths), `json` and `csv`, `time` and `datetime`, `subprocess` (running other programs, such as a simulation engine), `argparse` (command-line options) and `multiprocessing`. Third-party packages, above all NumPy, SciPy, Matplotlib, pandas, ASE and PyTorch, are installed with `pip install` or `conda install` into an **environment**: an isolated directory with its own interpreter and packages, created with `python -m venv` or `conda create`. Keeping one environment per project, with the package versions recorded in a `requirements.txt` or `environment.yml` file, is what makes a computational result reproducible on another machine or a cluster ([the topic on Linux for simulation](../linux-for-simulation/) covers the cluster side).

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
