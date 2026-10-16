---
title: "Objects, types and names"
description: "Python's data model from the ground up: every value is an object with an identity, a type and a value; names are references bound to objects; integers of unlimited size, IEEE floats, strings, Booleans and None; mutable and immutable objects, aliasing and copying; identity versus equality; reference counting and garbage collection; and dynamic typing with optional type hints."
track: pycore
weight: 2
level: Foundation
prereqs: ["how-python-runs", "numbers-in-a-computer"]
lab: "Trace a program and see every name and object in memory"
---

## Every value is an object

[The previous topic](../how-python-runs/) ended with a fact about CPython's machinery: every value lives in memory as an **object**. This topic builds the whole of Python's data model on that fact, because nearly everything that confuses newcomers about the language, and a good deal that confuses experienced programmers, follows from it.

Every object has three properties. Its **identity** is a number that is unique among the objects alive at the same time; in CPython it is the object's memory address, returned by the built-in function `id()`. Its **type** determines what the object is and what can be done with it: the integer `300` has type `int`, the text `"argon"` has type `str`, a list has type `list`, and `type(x)` returns the type of any object. Its **value** is the data it carries. Identity and type never change during an object's lifetime. Whether the value can change depends on the type: some objects, such as lists, can be modified in place, and others, such as integers and strings, cannot.

The type decides which operations are allowed and what they mean. `+` adds two integers, concatenates two strings and joins two lists, because each type defines its own addition; `3 + "4"` fails with a `TypeError` because neither type knows how to add itself to the other. Types are themselves objects, of type `type`, and they can be created by your own code with the `class` statement ([the topic on classes](../python-classes/)).

## Names are references

An assignment such as `x = 300` does two things. It evaluates the right-hand side, creating (or finding) an object, and then it **binds** the name `x` to that object. The name is not a box that contains 300; it is a label that refers to an object elsewhere in memory. A name has no type of its own and can be rebound at any time to an object of any type.

The consequences become clear only when they can be seen. The figure below runs a program with real Python, pausing before each line, and draws every name on the left and every object on the right, with an arrow for each reference.

{{< widget name="pytutor" title="Names and objects in memory" caption="Choose an example and press Visualise, then step forwards and backwards. Names live in frames (left); objects live on the heap (right); each arrow is a reference. The highlighted line is the one about to run. Simple values stored inside a list or dictionary are drawn in place to keep the picture readable." opts=`{"presets":[["names","Names and objects","x = 300\ny = x\nx = x + 1\nname = 'argon'\nmass = 39.948\n"],["alias","Two names, one list","a = [1, 2, 3]\nb = a\nb.append(4)\nc = a.copy()\nc.append(5)\nprint(a, b, c)\n"],["immut","Immutable strings","s = 'Ar'\nt = s\ns = s + 'gon'\nprint(s, t)\n"],["nest","A list of lists","row = [0, 0]\ngrid = [row, row]\ngrid[0][0] = 9\nprint(grid)\nsafe = [[0, 0] for _ in range(2)]\nsafe[0][0] = 9\nprint(safe)\n"]]}` >}}

Step through the first example. After `y = x`, there are two names and one object: the assignment copied the *reference*, not the integer. Then `x = x + 1` computes a new integer object, 301, and rebinds `x` to it; `y` still refers to 300. Nothing was modified. Integers cannot be changed, so "changing x" always means pointing `x` at a different object.

The second example shows the same rule with a list, and the result is the one that surprises people. `b = a` binds a second name to the *same* list. `b.append(4)` does not rebind anything: it modifies the list object in place, so the change is visible through both names. Two names referring to one mutable object are called **aliases**. `a.copy()` creates a new list object with the same elements, so appending to `c` leaves `a` alone.

The last example shows the most common bug that aliasing causes. `[row, row]` is a list containing two references to one list, so setting `grid[0][0]` changes "both rows". A list comprehension, `[[0, 0] for _ in range(2)]`, evaluates `[0, 0]` afresh on each pass and creates two independent rows. The same trap catches people who write `[[0] * n] * m` to make a matrix; a NumPy array, `np.zeros((m, n))`, avoids it entirely.

Function arguments follow the same rule. Calling `f(a)` binds the function's parameter to the same object that `a` refers to. If the function modifies that object in place, the caller sees the change; if it rebinds its parameter, the caller does not. Python's argument passing is therefore neither "by value" nor "by reference" in the C++ sense; it is sometimes called **call by sharing**, and it is just assignment.

## Numbers

Python has three built-in numeric types. **Integers** (`int`) have unlimited precision. Where a Fortran `integer(8)` overflows above $2^{63} - 1 \approx 9.2 \times 10^{18}$, a Python integer simply grows: `2**100` is `1267650600228229401496703205376`, exactly. CPython stores large integers as arrays of 30-bit "digits", so their size in memory grows with the number of digits, and arithmetic on them is correspondingly slower. This makes Python convenient for exact combinatorics, such as counting the microstates of [an Einstein solid](../entropy-and-temperature/), but it is not how numerical arrays are stored.

**Floats** (`float`) are IEEE 754 double-precision numbers, exactly the 64-bit format described in [the topic on numbers in a computer](../numbers-in-a-computer/), with about 16 significant decimal digits and a range up to about $1.8 \times 10^{308}$. Everything said there applies: `0.1 + 0.2` is `0.30000000000000004`, because none of the three numbers is exactly representable in binary, so floats should be compared with a tolerance using `math.isclose` rather than with `==`. Overflow gives `inf`, and undefined operations such as `inf - inf` give `nan`, which is not equal even to itself. **Complex numbers** (`complex`) are pairs of floats written as `2 + 3j`.

{{< py title="integers and floats" >}}
print(2**100)                 # exact: integers never overflow
print(7 / 2, 7 // 2, 7 % 2)   # true division, floor division, remainder
print(-7 // 2, -7 % 2)        # floor division rounds towards minus infinity
print(0.1 + 0.2, 0.1 + 0.2 == 0.3)
import math
print(math.isclose(0.1 + 0.2, 0.3))
print(1e308 * 10, float("nan") == float("nan"))
{{< /py >}}

The arithmetic operators are `+`, `-`, `*`, `/` (true division, which always returns a float), `//` (floor division), `%` (remainder) and `**` (power). Floor division rounds towards minus infinity, so `-7 // 2` is `-4`, and the remainder takes the sign of the divisor, so that `(a // b) * b + a % b == a` always holds. This differs from Fortran and C, which truncate towards zero; it matters when wrapping coordinates into a periodic box, where Python's `x % L` conveniently always lands in $[0, L)$. Mixed arithmetic promotes integers to floats and floats to complex. The `math` module provides `sqrt`, `exp`, `log`, trigonometric functions and constants such as `math.pi` for single numbers; for arrays, NumPy provides vectorised versions of all of them.

**Booleans** (`bool`) are the two objects `True` and `False`, produced by comparisons such as `x > 0`. The type is a subclass of `int`, so `True + True == 2`, which is occasionally handy for counting how many conditions hold.

## Strings

A **string** (`str`) is an immutable sequence of Unicode characters. Strings are written in single or double quotes, or in triple quotes for text that spans several lines. Individual characters are reached by **indexing** from zero, `s[0]`, and from the end with negative indices, `s[-1]`. A **slice** `s[start:stop]` extracts the characters from `start` up to but not including `stop`, so `"argon"[1:3]` is `"rg"`. The half-open convention, inherited by lists and NumPy arrays, has two advantages: `s[:k]` and `s[k:]` split a sequence into two parts with no overlap, and `len(s[a:b]) == b - a`.

Strings come with many methods: `.upper()`, `.strip()` to remove surrounding whitespace, `.split()` to break a line of a data file into fields, `.replace()`, `.startswith()`, and `", ".join(items)` to glue a list of strings together. Because strings are immutable, every method returns a *new* string; `s.upper()` does not change `s`. The third example in the figure shows this: `s = s + 'gon'` creates a new string and rebinds `s`, while `t` still refers to the original `'Ar'`.

The most useful string tool in scientific work is the **f-string**, which inserts values into text with a format specification:

{{< py title="formatting numbers" >}}
N_A = 6.02214076e23
T, E = 300.0, -1234.56789
print(f"Avogadro's number is {N_A:.4e} per mole")
print(f"T = {T:.1f} K, E = {E:10.3f} kJ/mol")
print(f"{'step':>6} {'energy':>12}")
for step, e in [(0, -1234.5), (100, -1240.25)]:
    print(f"{step:>6d} {e:>12.4f}")
{{< /py >}}

The part after the colon controls the format: `.4e` means scientific notation with four digits after the point, `10.3f` a fixed-point number three decimals wide padded to ten characters, `>6d` a right-aligned integer six characters wide. Writing tables of results this way produces files that line up and can be read back reliably.

## None and truth

`None` is the single object of type `NoneType`. It represents the absence of a value: a function without a `return` statement returns `None`, and `None` is the conventional default for an optional argument. Test for it with `x is None`.

In a condition, every object counts as true or false. The false values are `False`, `None`, zero of any numeric type, and empty containers: `""`, `[]`, `()`, `{}` and `set()`. Everything else is true, including the string `"False"` and a list containing a zero, `[0]`. This allows idioms such as `if atoms:` meaning "if the list of atoms is not empty". It also allows bugs: `if x:` is false when `x` is `0.0`, which may be a perfectly valid coordinate, so test `if x is not None:` when that is what you mean.

## Mutability, identity and equality

Types divide into **immutable** ones, whose objects never change after creation (`int`, `float`, `complex`, `bool`, `str`, `tuple`, `frozenset`, `bytes`), and **mutable** ones, whose objects can be modified in place (`list`, `dict`, `set`, `bytearray`, NumPy arrays and most user-defined classes). For an immutable object, aliasing is harmless, since nothing can change it behind your back. For a mutable object, every alias is a window onto the same data.

Two different questions can be asked of two objects. `a == b` asks whether their **values** are equal, which each type defines for itself. `a is b` asks whether they are the **same object**, which compares identities. Two separately created lists `[1, 2]` and `[1, 2]` are equal but not identical. Use `is` only for singletons such as `None`, `True` and `False`. For numbers and strings its result depends on implementation details: CPython keeps a single shared object for each small integer from $-5$ to 256 and reuses identical string constants, so `7 is 7` happens to be true while two separately computed `1000`s may or may not be the same object. Never rely on it.

Mutability also determines what can be a **dictionary key** or set element. A dictionary finds a key by its **hash**, a number computed from the value, and that number must not change while the key is stored; so keys must be immutable. Tuples of numbers make good keys, for example a pair of atom indices, while lists cannot be used. [The topic on collections](../python-collections/) shows how hashing works.

**Copying** has two levels. A **shallow copy**, `a.copy()`, `list(a)` or `a[:]`, creates a new outer container whose slots refer to the *same* element objects. If the elements are themselves mutable, such as the rows of a list of lists, the copy and the original still share them. A **deep copy**, `copy.deepcopy(a)`, recursively copies everything reachable. In numerical work, NumPy's `arr.copy()` copies the whole numerical buffer, which is usually what you want.

## Memory management

CPython frees memory automatically using **reference counting**. Every object records how many references point to it. Binding a name, storing the object in a list or passing it to a function increments the count; rebinding the name, deleting it with `del`, removing it from the list or returning from the function decrements it. When the count reaches zero, the object is destroyed immediately and its memory returned. In the figure, every object that loses its last arrow disappears from the picture at the next step, because nothing can reach it any more.

Reference counting cannot free a group of objects that refer to each other in a cycle, such as two objects each holding a reference to the other, because their counts never fall to zero. CPython therefore also runs a **cyclic garbage collector** from time to time, which finds groups of objects reachable only from each other and frees them. In everyday code you never call it; in a long simulation that creates large cyclic structures, `import gc; gc.collect()` can be used to force a collection.

The object model has a memory cost that matters for scientific data. On a 64-bit build, each integer object occupies 28 bytes and each float 24, and a list adds an 8-byte pointer per element on top. A list of a million floats therefore uses about 32 MB, whereas a NumPy array of a million float64 values stores the bare numbers contiguously in exactly 8 MB, with no per-element objects at all. For large numerical data, NumPy is the right container, and [the topic on NumPy arrays](../numpy-arrays/) explains its memory layout.

## Dynamic typing and type hints

Python is **dynamically typed**: types belong to objects, not to names, and are checked only when an operation is attempted. `x = 1` and then `x = "one"` is perfectly legal. A mistake such as adding a number to a string is discovered only when that line runs, perhaps hours into a calculation. It is also **strongly typed**: it will not silently convert `"3"` into the number 3, unlike some languages.

Since Python 3.5, code can carry optional **type hints**, which state what types are expected without changing how the program runs:

```python
def kinetic_energy(mass: float, velocity: list[float]) -> float:
    return 0.5 * mass * sum(v * v for v in velocity)
```

The interpreter ignores these annotations, but editors use them to offer completion and to warn about mistakes, and static checkers such as mypy can analyse a whole code base for type errors before it runs. For scientific code that will be shared or maintained, type hints on function signatures are a cheap form of documentation that tools can verify.

{{< note type="key" >}}
- Every value is an object with an identity (`id`), a type (`type`) and a value. Names are references bound to objects by assignment; they have no type themselves.
- `y = x` copies a reference, never an object. Modifying a mutable object in place is visible through every alias; rebinding a name affects only that name.
- `int` has unlimited precision; `float` is IEEE double precision with all its rounding behaviour; compare floats with a tolerance. Strings are immutable, indexed from zero and sliced half-open.
- `==` compares values, `is` compares identity; use `is` only with `None`, `True` and `False`.
- Reference counting frees objects as soon as they become unreachable, with a cyclic collector for reference cycles. Per-object overhead makes lists of numbers bulky; NumPy stores raw numbers.
{{< /note >}}

{{< quiz >}}
- q: "After a = [1, 2]; b = a; a = a + [3], what is b?"
  options: ["[1, 2, 3]", "[1, 2]", "an error"]
  answer: 1
  why: "a + [3] creates a new list and rebinds a; b still refers to the original list, which was never modified."
- q: "After a = [1, 2]; b = a; a.append(3), what is b?"
  options: ["[1, 2, 3]", "[1, 2]", "None"]
  answer: 0
  why: "append modifies the shared list object in place, so the change is visible through both names."
- q: "What is -7 // 2 in Python?"
  options: ["-3", "-4", "-3.5"]
  answer: 1
  why: "Floor division rounds towards minus infinity; Fortran and C would give −3 by truncation."
- q: "Which of these can be a dictionary key?"
  options: ["[1, 2]", "(1, 2)", "{1: 2}"]
  answer: 1
  why: "Keys must be hashable, which requires immutability; a tuple of numbers qualifies, a list or dict does not."
- q: "Why does grid = [[0] * 3] * 3 behave strangely when you set grid[0][0] = 1?"
  options: ["Lists cannot hold zeros", "The outer list holds three references to one inner list, so all 'rows' change together", "Multiplication of lists is not allowed"]
  answer: 1
  why: "The * operator repeats references, not copies; build rows with a comprehension or use np.zeros((3, 3))."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. The Python Language Reference, section 3, "Data model", docs.python.org/3/reference/datamodel.html. The authoritative description of objects, values and types.
2. N. Batchelder, "Facts and myths about Python names and values", PyCon 2015 talk and article, nedbatchelder.com/text/names.html.
3. L. Ramalho, *Fluent Python*, 2nd ed., O'Reilly (2022), chapter 6 (object references, mutability and recycling).
4. P. J. Guo, "Online Python Tutor: embeddable web-based program visualization for CS education", *Proceedings of the 44th ACM Technical Symposium on Computer Science Education (SIGCSE)*, 579–584 (2013). The idea behind the tracing figure.
5. D. Goldberg, "What every computer scientist should know about floating-point arithmetic", *ACM Computing Surveys* **23**, 5–48 (1991).
6. G. van Rossum, J. Lehtosalo and Ł. Langa, "PEP 484 – Type Hints" (2014), peps.python.org/pep-0484.

</div>
