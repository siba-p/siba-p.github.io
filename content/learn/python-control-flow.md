---
title: "Control flow: conditions, loops and iteration"
description: "How a Python program decides and repeats: blocks and indentation, comparisons and Boolean logic with short-circuit evaluation, if/elif/else, while loops for iterating to convergence, for loops and the iterator protocol, range, enumerate and zip, break, continue and the loop else clause, comprehensions and generators, and exceptions as a form of control flow."
track: pycore
weight: 3
level: Foundation
prereqs: ["python-objects-and-names"]
lab: "Trace loops and branches line by line, and run convergence loops in the browser"
---

## Statements, blocks and indentation

A Python program is a sequence of **statements** executed one after another, top to bottom. Assignments, function calls and `import` are simple statements that occupy a line. **Compound statements**, such as `if`, `while`, `for`, `def` and `try`, control the execution of other statements: they consist of a header line ending in a colon, followed by an indented **block** of statements that belong to it.

```python
if temperature > melting_point:
    phase = "liquid"          # inside the if block
    print("melted")           # also inside
print("done")                 # after the block: always runs
```

Indentation is not decoration. As [the topic on how Python runs](../how-python-runs/) showed, the tokenizer turns increases and decreases of indentation into `INDENT` and `DEDENT` tokens, and the parser uses them exactly as C uses braces or Fortran uses `end if`. All lines of a block must be indented by the same amount; four spaces per level is the universal convention (PEP 8). Mixing tabs and spaces is a classic source of `IndentationError`, which is why editors are usually set to insert spaces when the tab key is pressed.

Underneath, every control structure in this topic compiles to the same two primitives seen in the virtual-machine figure of that topic: **conditional jumps**, which skip to another instruction if a value is false, and **unconditional jumps**, which go back to repeat a block. Everything else is convenience built on top.

## Conditions and Boolean logic

A condition is any expression whose truth value can be tested. Most conditions are **comparisons**: `==` (equal), `!=` (not equal), `<`, `<=`, `>`, `>=`, together with `in` (membership, as in `"Fe" in elements`) and `is` (identity). Comparisons can be **chained** in the mathematical way: `0 <= x < L` means `0 <= x and x < L`, which is exactly how one checks that a coordinate lies inside a periodic box.

Conditions are combined with `and`, `or` and `not`. The first two use **short-circuit evaluation**: in `a and b`, if `a` is false the result is already known and `b` is never evaluated; in `a or b`, if `a` is true, `b` is skipped. This is not merely an optimisation, it is relied upon for safety, as in `if n > 0 and total / n > threshold:`, where the division is attempted only when it is safe. (The same idea in the shell, `make && ./run`, is described in [the topic on bash](../how-bash-works/).) Strictly, `and` and `or` return one of their operands rather than `True` or `False`: `x or default` gives `x` if it is truthy and `default` otherwise, an idiom you will meet in other people's code.

The `if` statement chooses between blocks:

```python
if energy < e_min:
    status = "below range"
elif energy > e_max:
    status = "above range"
else:
    status = "ok"
```

The conditions are tested in order, and only the block of the first true one runs; `elif` and `else` are optional. For a choice between two values there is a one-line **conditional expression**, `status = "ok" if e_min <= energy <= e_max else "out of range"`. Python 3.10 added the `match` statement for structural pattern matching, useful for dispatching on the shape of data, but a chain of `if`/`elif` covers most scientific needs.

{{< widget name="pytutor" title="Branches and loops, one line at a time" caption="Step through each example and watch which lines run, how many times, and how the names change. Notice that the loop variable and every name created inside a loop survive after it ends." opts=`{"presets":[["branch","A decision","T = 300\nif T < 273:\n    phase = 'solid'\nelif T < 373:\n    phase = 'liquid'\nelse:\n    phase = 'gas'\nprint(phase)\n"],["newton","Iterate to convergence","a = 2.0\nx = 1.0\nn = 0\nwhile abs(x * x - a) > 1e-12:\n    x = 0.5 * (x + a / x)\n    n = n + 1\nprint(x, n)\n"],["for","Loop over data","masses = [1.008, 4.0026, 6.94]\ntotal = 0.0\nfor i, m in enumerate(masses):\n    total = total + m\nmean = total / len(masses)\nprint(mean)\n"],["primes","Nested loops and break","primes = []\nfor n in range(2, 12):\n    for d in range(2, n):\n        if n % d == 0:\n            break\n    else:\n        primes.append(n)\nprint(primes)\n"]]}` >}}

## Repeating while a condition holds

A `while` loop repeats its block as long as its condition is true, testing the condition before each pass. It is the natural loop when the number of repetitions is not known in advance, which in numerical work usually means **iterating until convergence**. Newton's method for $\sqrt a$ improves a guess $x$ with the rule $x \leftarrow \tfrac12(x + a/x)$ ([the topic on derivatives](../derivatives/) derives it), and stops when $x^2$ is close enough to $a$:

{{< py title="iterate to convergence" >}}
a, x, n = 2.0, 1.0, 0
while abs(x * x - a) > 1e-12:
    x = 0.5 * (x + a / x)
    n += 1
print(f"sqrt(2) = {x:.15f} after {n} iterations")

# bisection: halve an interval that brackets a root of f
def f(x):
    return x**3 - 2*x - 5
lo, hi, steps = 2.0, 3.0, 0
while hi - lo > 1e-10:
    mid = 0.5 * (lo + hi)
    if f(lo) * f(mid) <= 0:
        hi = mid
    else:
        lo = mid
    steps += 1
print(f"root = {0.5 * (lo + hi):.10f} after {steps} halvings")
{{< /py >}}

Newton's method reaches full double precision in five iterations, roughly doubling the number of correct digits each time; bisection gains one binary digit per halving and needs 34 halvings to shrink the interval below $10^{-10}$. Step through the convergence example in the figure to see the same loop line by line.

Two precautions apply to every `while` loop. The condition must eventually become false, or the loop runs forever; in an iterative solver that may fail to converge, add a maximum number of iterations and raise an error if it is reached. And the tolerance must be achievable: asking for $|x^2 - a| < 10^{-20}$ can never succeed in double precision, because the rounding error of $x^2$ itself is larger than that. `x += 1` is shorthand for `x = x + 1`; the same augmented form exists for every operator (`-=`, `*=`, `/=`).

## For loops and the iterator protocol

The `for` loop is Python's main loop, and it works differently from the counting loops of C and Fortran. It does not count; it **iterates**: it takes any **iterable** object, a collection or a stream of values, and runs its block once for each value, binding the loop variable to each in turn.

```python
for element in ["H", "He", "Li"]:      # a list
    print(element)
for line in open("traj.xyz"):          # the lines of a file, read one at a time
    ...
for k in range(10):                    # the integers 0, 1, ..., 9
    ...
```

The machinery behind this is the **iterator protocol**, and it is worth understanding because it explains why so many things can be looped over. A `for` loop first calls `iter()` on the object, which returns an **iterator**: an object that remembers a position and has a `__next__` method. The loop then calls `next()` on the iterator repeatedly, binding each result to the loop variable, until `next()` signals that there are no more values by raising the `StopIteration` exception, which the loop catches quietly. In bytecode, these are exactly the `GET_ITER` and `FOR_ITER` instructions seen in the virtual-machine figure.

{{< py title="the iterator protocol by hand" >}}
it = iter([10, 20])
print(next(it), next(it))
try:
    next(it)
except StopIteration:
    print("the iterator is exhausted")
{{< /py >}}

`range(start, stop, step)` produces integers on demand, half-open like slices: `range(10)` gives 0 to 9, `range(2, 10, 2)` gives 2, 4, 6, 8. It does not build a list, so `range(10**9)` takes no memory. Two built-ins combine iterables in ways that remove most of the need for indices. `enumerate(seq)` yields pairs `(index, item)`, and `zip(a, b)` walks two sequences in step, yielding pairs `(a[i], b[i])` and stopping at the shorter one:

{{< py title="enumerate and zip" >}}
elements = ["H", "He", "Li"]
masses = [1.008, 4.0026, 6.94]
for i, (el, m) in enumerate(zip(elements, masses), start=1):
    print(i, el, m)
{{< /py >}}

Writing `for i in range(len(elements)):` and then `elements[i]` works, but it is slower, longer and invites off-by-one errors; iterating directly over the items is the idiomatic style. Dictionaries are iterated with `.items()` for key–value pairs, `.keys()` or `.values()`.

## Changing the course of a loop

Three statements alter a loop from inside. `break` leaves the innermost loop immediately. `continue` abandons the rest of the current pass and goes on to the next one, which is handy for skipping comment lines when reading a file:

```python
for line in open("data.txt"):
    if line.startswith("#"):
        continue                 # skip comments
    x, y = map(float, line.split())
```

The third is unusual: a loop may have an `else` clause, which runs if the loop finished normally, without a `break`. It reads awkwardly but expresses "searched everything and found nothing" exactly. In the prime-number example in the figure, the inner loop looks for a divisor of `n`; if it finds one it breaks, and if it finishes without breaking, the `else` block records `n` as prime. Step through it and notice how many times the inner loop runs for each `n`.

Nested loops multiply their costs: a double loop over all pairs of $N$ atoms executes its body $N^2$ times, or $N(N - 1)/2$ if each pair is visited once with `for j in range(i + 1, N)`. In pure Python, where each pass costs many bytecode instructions, a double loop over 10 000 atoms (50 million pairs) takes tens of seconds; the same calculation done with NumPy arrays, or with a cell list that only visits nearby pairs ([the topic on neighbour lists](../molecular-dynamics/)), takes a fraction of a second.

## Comprehensions and generators

Building a list with a loop is so common that Python has a compact expression for it, the **list comprehension**:

```python
squares = [k * k for k in range(6)]                 # [0, 1, 4, 9, 16, 25]
even_squares = [k * k for k in range(6) if k % 2 == 0]   # [0, 4, 16]
distances = [abs(x - x0) for x in positions]
```

The comprehension reads like set-builder notation in mathematics, $\{k^2 : k \in \{0, \dots, 5\}, k \text{ even}\}$, and runs somewhat faster than the equivalent loop with `append`. The same syntax with braces builds a set or a dictionary: `{el: m for el, m in zip(elements, masses)}`.

Replacing the brackets with parentheses gives a **generator expression**, which produces the values one at a time on demand instead of storing them all. `sum(k * k for k in range(1_000_000))` adds a million squares without ever holding a million-element list in memory. More generally, a function containing the keyword `yield` is a **generator function**: each `yield` hands one value to the caller and pauses the function, with all its local variables intact, until the next value is requested. Generators are the natural way to write a reader that streams frames from a trajectory file too large to load at once:

```python
def frames(path):
    with open(path) as f:
        while True:
            header = f.readline()
            if not header:
                return                       # end of file: stop the iteration
            n = int(header)
            f.readline()                     # comment line
            yield [f.readline().split() for _ in range(n)]

for atoms in frames("traj.xyz"):             # one frame in memory at a time
    ...
```

## Exceptions

Not every change of course is planned. When an operation cannot be carried out, such as opening a file that does not exist, converting `"abc"` to a float or dividing by zero, Python **raises an exception**. Raising abandons the current block and every enclosing block and function call, unwinding the call stack frame by frame, until a matching handler is found. If none is found, the program stops and prints a **traceback** listing the frames that were active, most recent call last, which is the first thing to read when debugging.

Exceptions are handled with `try`:

```python
try:
    value = float(field)
except ValueError:
    value = float("nan")          # mark unreadable entries instead of crashing
else:
    n_good += 1                   # runs only if no exception occurred
finally:
    n_seen += 1                   # runs in every case
```

Catch the specific exception you expect, never a bare `except:`, which also swallows typing mistakes and keyboard interrupts. Your own code should **raise** exceptions when it is given impossible input, such as `raise ValueError(f"temperature must be positive, got {T}")`: failing loudly at the point of the error is far better than producing a plausible-looking wrong number hours later. The common built-in exceptions are worth recognising: `TypeError` (wrong type of object), `ValueError` (right type, bad value), `IndexError` and `KeyError` (missing position or key), `FileNotFoundError`, `ZeroDivisionError`, and `NameError` (a name that was never bound, often a misspelling).

## A complete loop: a random walk

The pieces of this topic combine into the inner loop of a stochastic simulation. A particle on a line takes a thousand steps, each one unit left or right at random; repeating the walk many times shows that the typical distance travelled grows as the square root of the number of steps, the signature of diffusion.

{{< py title="random walks" >}}
import random
random.seed(1)

def walk(n_steps):
    x = 0
    for _ in range(n_steps):
        x += random.choice((-1, 1))
    return x

for n in (100, 400, 1600):
    finals = [walk(n) for _ in range(2000)]
    rms = (sum(x * x for x in finals) / len(finals)) ** 0.5
    print(f"{n:5d} steps: rms distance {rms:6.2f}   sqrt(n) = {n ** 0.5:5.1f}")
{{< /py >}}

Quadrupling the number of steps doubles the root-mean-square distance, as the [central limit theorem](../probability/) predicts. The same law, measured from the mean-squared displacement of atoms, gives the diffusion coefficient in [trajectory analysis](../trajectory-analysis/). The program also illustrates the limits of pure-Python loops: it executes about 4.2 million passes of the inner loop and takes a second or two, where NumPy would generate all the steps as one array and finish almost instantly.

{{< note type="key" >}}
- Blocks are defined by indentation; every control structure compiles to conditional and unconditional jumps.
- Comparisons chain (`0 <= x < L`); `and` and `or` short-circuit, which makes guarded conditions safe.
- `while` loops repeat until a condition fails: use them for convergence, with a tolerance that is achievable and a maximum iteration count.
- `for` loops iterate over any iterable via `iter()` and `next()`; use `range`, `enumerate` and `zip` instead of manual indexing. `break`, `continue` and the loop `else` clause alter the flow.
- Comprehensions build lists, sets and dictionaries concisely; generators produce values lazily. Exceptions unwind the call stack until handled; catch specific exceptions and raise informative ones.
{{< /note >}}

{{< quiz >}}
- q: "In `if n > 0 and total / n > 1:`, what happens when n is 0?"
  options: ["ZeroDivisionError", "The condition is False and the division is never evaluated", "The condition is True"]
  answer: 1
  why: "`and` short-circuits: once `n > 0` is false, the right-hand side is skipped."
- q: "What does list(range(2, 11, 3)) give?"
  options: ["[2, 5, 8, 11]", "[2, 5, 8]", "[3, 6, 9]"]
  answer: 1
  why: "range is half-open: start at 2, step by 3, stop before 11."
- q: "When does the else block of a for loop run?"
  options: ["When the loop body raises an exception", "When the loop ends without executing break", "Never; it is a syntax error"]
  answer: 1
  why: "The loop else clause runs on normal completion, which makes it ideal for 'searched and not found'."
- q: "What is the main advantage of sum(x*x for x in data) over sum([x*x for x in data])?"
  options: ["It gives a more accurate result", "It never builds the intermediate list, so it uses constant memory", "It runs on the GPU"]
  answer: 1
  why: "A generator expression produces the values one at a time."
- q: "A while loop iterates until abs(x*x - a) < 1e-20 with float64 numbers. What is likely to happen?"
  options: ["It converges in a few iterations", "It may never stop, because rounding errors in x*x are larger than the tolerance", "Python raises an OverflowError"]
  answer: 1
  why: "Double precision has a relative accuracy of about 1e-16; the tolerance must be achievable, and a maximum iteration count is a sensible safeguard."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. The Python Tutorial, sections 4 (more control flow tools) and 8 (errors and exceptions), docs.python.org/3/tutorial.
2. The Python Language Reference, section 8 (compound statements), docs.python.org/3/reference/compound_stmts.html.
3. G. van Rossum, B. Warsaw and A. Coghlan, "PEP 8 – Style Guide for Python Code" (2001), peps.python.org/pep-0008.
4. L. Ramalho, *Fluent Python*, 2nd ed., O'Reilly (2022), chapter 17 (iterators, generators and classic coroutines).
5. W. H. Press, S. A. Teukolsky, W. T. Vetterling and B. P. Flannery, *Numerical Recipes*, 3rd ed., Cambridge University Press (2007), chapter 9 (root finding: bisection and Newton's method).

</div>
