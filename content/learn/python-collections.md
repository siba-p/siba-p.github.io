---
title: "Lists, tuples, dictionaries and sets"
description: "Python's built-in collections and how they are implemented: lists as over-allocated dynamic arrays of references, slicing and the cost of each operation, tuples and unpacking, dictionaries and sets as hash tables with constant-time lookup, Counter and defaultdict, nested data and JSON, and how to choose the right structure using the idea of algorithmic complexity."
track: pycore
weight: 5
level: Foundation
prereqs: ["python-objects-and-names"]
lab: "Watch a list over-allocate as it grows, and insert and look up keys in a hash table"
---

## Containers and the cost of operations

Most programs spend their time manipulating collections of things: the atoms of a structure, the frames of a trajectory, the lines of a file, the energies of a set of candidate materials. Python has four general-purpose built-in **containers**: the list, the tuple, the dictionary and the set. Each is good at some operations and poor at others, and choosing well can make the difference between a script that runs in a second and one that runs for an hour.

The language used to compare them is **algorithmic complexity**, written with "big-O" notation. An operation is $O(1)$, or **constant time**, if its cost does not depend on the size $n$ of the container: reading the 5th element of a list takes the same time whether the list has ten elements or ten million. It is $O(n)$, **linear time**, if the cost grows in proportion to $n$: checking whether a value occurs in an unsorted list may require looking at every element. Sorting is $O(n \log n)$. The notation ignores constant factors and describes how the cost *scales*, which is what matters when data grow. An $O(n)$ operation inside a loop that runs $n$ times is $O(n^2)$ in total; for $n = 10^5$, that is $10^{10}$ steps, which is why an innocent-looking `if x in big_list:` inside a loop can bring a program to a halt.

## Lists

A **list** is an ordered, mutable sequence of references to objects, written in square brackets: `masses = [1.008, 12.011, 15.999]`. The elements may be of any types, mixed freely, since each slot holds only a pointer. Lists are indexed from zero, accept negative indices counted from the end, and support slicing exactly as strings do: `masses[1:]` is a new list of all but the first element, and `masses[::-1]` is the list reversed. Unlike strings, lists can be changed: `masses[0] = 1.00794` replaces an element, `masses[1:3] = []` deletes a slice, and the methods `append`, `extend`, `insert`, `pop`, `remove`, `sort` and `reverse` modify the list in place.

To understand what these operations cost, it helps to know how CPython stores a list. The list object holds a pointer to a separate contiguous **array of slots**, each slot an 8-byte pointer to an element object (on a 64-bit build). Reading or writing `a[i]` computes the address of slot `i` directly, which is why indexing is $O(1)$. Inserting at the front, `a.insert(0, x)`, must shift every existing pointer one slot along, so it is $O(n)$; so is `a.pop(0)`. For a queue that grows at one end and shrinks at the other, `collections.deque` does both ends in $O(1)$.

Appending is the interesting case. If the slot array were exactly as long as the list, every `append` would have to allocate a new array one slot longer and copy all the pointers into it, making a sequence of $n$ appends cost $O(n^2)$. Instead, when the array is full, CPython allocates a larger one with spare room, roughly one-eighth more than needed plus a little. The figure shows the real growth pattern of a CPython 3.12 list, measured with `sys.getsizeof`.

{{< widget name="listgrow" title="How a list grows" caption="Top: the slot array; blue slots hold elements, grey ones are allocated but unused. Bottom: allocated capacity against length, a staircase above the diagonal. The readouts count how often the array had to be moved and how many element copies that cost per append on average." >}}

The capacity runs 0, 4, 8, 16, 24, 32, 40, 52, 64, 76, …: each reallocation adds about 12.5 % plus a constant. Most appends therefore find a free slot and cost almost nothing; occasionally one triggers a move. Press "append 10 times" repeatedly and watch the last readout: the average number of element copies per append stays bounded by a small constant as the list grows. Appending is therefore **amortised** $O(1)$: cheap on average, even though an individual append is occasionally expensive. The memory cost of the spare slots is modest, and growing by a fixed fraction rather than a fixed amount is what makes the total copying linear.

Lists are sorted in place with `a.sort()` or copied in sorted order with `sorted(a)`, both using **Timsort**, an $O(n \log n)$ algorithm designed by Tim Peters for CPython that is especially fast on data that are already partly ordered. Both accept a `key` function, as in `sorted(atoms, key=lambda a: a.mass)`. Checking membership with `x in a`, finding a position with `a.index(x)` and counting with `a.count(x)` scan the list and are $O(n)$.

## Tuples and unpacking

A **tuple** is an immutable sequence, written with commas and usually parentheses: `point = (0.0, 1.5, -2.0)`. Being immutable, a tuple can be a dictionary key or a set element, and it signals to a reader that its contents form a fixed record rather than a growing collection. Tuples are slightly smaller and faster to create than lists.

The commas, not the parentheses, make a tuple, and the reverse operation, **unpacking**, binds several names at once:

```python
x, y, z = point                       # unpack a 3-tuple
a, b = b, a                           # swap two names, no temporary needed
first, *rest = [1, 2, 3, 4]           # first = 1, rest = [2, 3, 4]
for element, mass in [("H", 1.008), ("C", 12.011)]:
    ...
def stats(values):
    return min(values), max(values), sum(values) / len(values)
lo, hi, mean = stats(energies)        # several results from one function
```

A tuple whose fields deserve names can be made into a **named tuple** with `collections.namedtuple`, or, more flexibly, a **data class** ([the topic on classes](../python-classes/)), so that `atom.mass` replaces the cryptic `atom[1]`.

## Dictionaries

A **dictionary** maps **keys** to **values**: `masses = {"H": 1.008, "C": 12.011, "O": 15.999}`. Looking up `masses["C"]` takes the same short time whether the dictionary has three entries or three million. That is remarkable: with a list of pairs, finding a key requires scanning until it is found. The trick is a **hash table**.

Every hashable object has a **hash**, an integer computed from its value by the function `hash()`, with the property that equal objects have equal hashes. A dictionary keeps an array of slots whose size is a power of two. To store a key, it computes the key's hash, takes the last few bits to choose a slot, and puts the key–value pair there. To find a key later, it repeats the calculation and goes straight to that slot. Different keys occasionally map to the same slot, a **collision**; the dictionary then probes further slots in a fixed sequence until it finds the key or an empty slot, which means the key is absent. The figure lets you build a table yourself.

{{< widget name="hashtable" title="A dictionary is a hash table" caption="Insert chemical symbols one at a time and look keys up. Orange outlines show the slots inspected. When the table becomes more than two-thirds full it doubles in size and every key is placed again. This is a simplified model: CPython uses a different hash function (SipHash for strings), a perturbed probe sequence and a separate compact array of entries, but the principle is the same." >}}

Because collisions are rare when the table has plenty of empty slots, the dictionary keeps its **load factor** below two-thirds by doubling when it fills, just as a list over-allocates. The average lookup, insertion and deletion are therefore $O(1)$. The rules about keys follow directly from the mechanism. A key must be **hashable**, and its hash must never change while it is in the table, otherwise it would be looked for in the wrong slot; that is why keys must be immutable, so strings, numbers and tuples work and lists do not. And two keys that are equal must have equal hashes, which is why `1`, `1.0` and `True` all count as the same key.

Since Python 3.7, dictionaries remember the order in which keys were inserted, and iterating over one yields keys in that order. The essential methods are `d.get(key, default)` (return a default instead of raising `KeyError` for a missing key), `d.items()`, `d.keys()` and `d.values()` for iteration, `key in d` for membership ($O(1)$), `d.pop(key)` and `d.update(other)`. Two specialised dictionaries in `collections` remove boilerplate: `defaultdict(list)` creates an empty list automatically the first time a key is used, ideal for grouping, and `Counter` counts things.

{{< py title="dictionaries in practice" >}}
from collections import Counter, defaultdict

symbols = "C H H H H O C C H".split()
masses = {"H": 1.008, "C": 12.011, "O": 15.999}

print(Counter(symbols))                        # composition
print(sum(masses[s] for s in symbols))         # total mass
print(masses.get("N", "unknown"))              # no KeyError

by_element = defaultdict(list)                 # group atom indices by element
for i, s in enumerate(symbols):
    by_element[s].append(i)
print(dict(by_element))
{{< /py >}}

## Sets

A **set** is an unordered collection of distinct hashable objects, `{"H", "C", "O"}`, stored in a hash table without values. Its two uses are removing duplicates, `set(symbols)`, and fast membership tests, `x in s`, which is $O(1)$ instead of the $O(n)$ of a list. Sets also support the operations of mathematics: union `a | b`, intersection `a & b`, difference `a - b` and symmetric difference `a ^ b`. Comparing the neighbour sets of an atom at two times, for example, shows which neighbours left and which arrived. An empty set is written `set()`, because `{}` is an empty dictionary.

The difference in membership cost is large enough to measure in the browser:

{{< py title="membership: list against set" >}}
import time
data = list(range(100_000))
s = set(data)
t = time.perf_counter()
for _ in range(100):
    99_999 in data
t_list = (time.perf_counter() - t) / 100
t = time.perf_counter()
for _ in range(100):
    99_999 in s
t_set = (time.perf_counter() - t) / 100
print(f"list: {t_list * 1e6:9.1f} µs per test")
print(f"set:  {t_set * 1e6:9.3f} µs per test   ({t_list / t_set:,.0f} times faster)")
{{< /py >}}

On a laptop running native Python the set is about ten thousand times faster for this test; in the browser the timer is coarser and the measured ratio is lower, but still in the thousands. The ratio grows in proportion to the size of the data.

## Nested data and JSON

Real data are usually nested: a list of dictionaries, one per molecule, each holding a list of atoms, each atom a dictionary with an element and coordinates. Python's containers nest freely, and access chains naturally: `molecules[3]["atoms"][0]["xyz"][2]`. Remember that nesting stores references: a dictionary placed into two lists is one object, and changing it changes both, as [the topic on objects and names](../python-objects-and-names/) showed. Use `copy.deepcopy` when independent copies are needed.

Nested dictionaries and lists of strings, numbers, Booleans and `None` map exactly onto **JSON**, the text format used by most web services and many materials databases. The `json` module converts in both directions:

```python
import json
mol = {"name": "water", "atoms": [{"el": "O", "xyz": [0, 0, 0]},
                                  {"el": "H", "xyz": [0.96, 0, 0]}]}
text = json.dumps(mol, indent=2)       # to a string (or json.dump(mol, file))
back = json.loads(text)                # and back
```

For large numerical arrays, JSON is slow and bulky, and binary formats such as NumPy's `.npy`, HDF5 or NetCDF are used instead.

## Choosing a structure

The choice usually follows from the question the code will ask most often. If it asks "what is the *i*-th item?" or keeps items in order, use a list. If it asks "what is the value for this key?", use a dictionary. If it asks "have I seen this before?" or "which items are in both?", use a set. If the record is fixed and should not change, use a tuple or a data class. And if the items are numbers on which you will do arithmetic, use none of these: use a NumPy array, which stores raw numbers contiguously and operates on them in compiled code, as [the next subject's first topic](../numpy-arrays/) explains.

| operation | list | dict / set | tuple |
|---|---|---|---|
| index `a[i]` | $O(1)$ | — | $O(1)$ |
| `x in a` | $O(n)$ | $O(1)$ average | $O(n)$ |
| append / add | $O(1)$ amortised | $O(1)$ average | not possible |
| insert or delete at front | $O(n)$ | — | not possible |
| delete by key | — | $O(1)$ average | — |
| sort | $O(n \log n)$ | — | — |

{{< note type="key" >}}
- Complexity describes how cost scales with size: $O(1)$, $O(n)$, $O(n \log n)$. An $O(n)$ operation inside an $O(n)$ loop is $O(n^2)$.
- A list is a dynamic array of pointers: indexing is $O(1)$, front insertion $O(n)$, and append amortised $O(1)$ thanks to over-allocation by about 12.5 %.
- Tuples are immutable records; unpacking binds several names at once.
- Dictionaries and sets are hash tables kept under two-thirds full: lookup, insertion and membership are $O(1)$ on average; keys must be hashable and therefore immutable.
- Match the structure to the question the code asks; for numerical arrays use NumPy.
{{< /note >}}

{{< quiz >}}
- q: "Which operation on a Python list of a million elements is slowest?"
  options: ["a[500000]", "a.append(x)", "a.insert(0, x)"]
  answer: 2
  why: "Inserting at the front shifts every pointer, O(n); indexing and appending are O(1) (append amortised)."
- q: "Why can a tuple be a dictionary key but a list cannot?"
  options: ["Tuples are smaller", "Keys must be hashable, and a key's hash must not change; lists are mutable", "Lists are not ordered"]
  answer: 1
  why: "If a key could change after insertion, its hash would change and it would be looked for in the wrong slot."
- q: "A loop runs n times and each pass checks `x in seen_list`. As n grows, the total cost grows like…"
  options: ["n", "n log n", "n²"]
  answer: 2
  why: "Each membership test is O(n); doing it n times is O(n²). Using a set makes it O(n) overall."
- q: "After d = {}; d[1] = 'a'; d[1.0] = 'b'; d[True] = 'c', how many keys does d have?"
  options: ["3", "1", "2"]
  answer: 1
  why: "1, 1.0 and True are equal and have equal hashes, so they are the same key."
- q: "Why does a list grow its slot array by a fraction (about 1/8) rather than by one slot?"
  options: ["To save memory", "So that the total copying over n appends is proportional to n, making append amortised O(1)", "Because memory comes in blocks of 8"]
  answer: 1
  why: "Growing by one slot would make every append copy the whole array, O(n²) in total."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. The Python Tutorial, section 5 (data structures), docs.python.org/3/tutorial/datastructures.html.
2. Python Wiki, "TimeComplexity", wiki.python.org/moin/TimeComplexity: the cost of operations on built-in types in CPython.
3. T. H. Cormen, C. E. Leiserson, R. L. Rivest and C. Stein, *Introduction to Algorithms*, 4th ed., MIT Press (2022), chapters 3 (growth of functions), 11 (hash tables) and 16 (amortised analysis).
4. R. Hettinger, "Modern Python dictionaries: a confluence of a dozen great ideas", PyCon 2017 talk, on CPython's compact ordered dictionaries.
5. T. Peters, "listsort.txt", in the CPython source tree (Objects/listsort.txt), the design notes of Timsort.
6. The CPython source, Objects/listobject.c (`list_resize`) and Objects/dictobject.c, github.com/python/cpython.

</div>
