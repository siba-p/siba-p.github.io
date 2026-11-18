---
title: "Collections"
description: "Python's built-in collections and how they are implemented: lists as over-allocated dynamic arrays of references, slicing and the cost of each operation, tuples and unpacking, dictionaries and sets as hash tables with constant-time lookup, Counter and defaultdict, nested data and JSON, and how to choose the right structure using the idea of algorithmic complexity."
hook: "Asking whether a value is in a list of 100 000 numbers can take thousands of times longer than asking a set. The difference is a hash table, and picking the right container can turn an hour-long script into a one-second one."
objectives:
  - "Estimate how the cost of an operation scales with size using big-O notation"
  - "Explain why list appends are amortised constant time while front insertions are linear"
  - "Explain how dictionaries and sets use hashing, and why their keys must be immutable"
  - "Use tuples, unpacking, Counter and defaultdict to write shorter, clearer code"
  - "Choose a list, tuple, dictionary, set or NumPy array to match the question asked"
cover: "cover.svg"
milestones:
  - year: 1953
    text: "Hans Peter Luhn proposes hashing with chained buckets in an internal IBM memorandum"
  - year: 1991
    text: "Guido van Rossum releases Python 0.9.0 with lists, dictionaries and strings built in"
  - year: 2002
    text: "Tim Peters writes Timsort for the sort method of CPython lists"
  - year: 2012
    text: "Raymond Hettinger proposes the compact dictionary layout that CPython 3.6 adopts"
track: pycore
weight: 5
level: Foundation
prereqs: ["python-objects-and-names"]
lab: "Watch a list over-allocate as it grows, and insert and look up keys in a hash table"
---

## Containers and the cost of operations

Most programs spend their time manipulating collections of things: the atoms of a structure, the frames of a trajectory, the lines of a file, the energies of a set of candidate materials. Python has four general-purpose built-in **containers**: the list, the tuple, the dictionary and the set. Each is good at some operations and poor at others, and choosing well can make the difference between a script that runs in a second and one that runs for an hour.

The language used to compare them is **algorithmic complexity**, written with "big-O" notation. An operation is $O(1)$, or **constant time**, if its cost does not depend on the size $n$ of the container: reading the 5th element of a list takes the same time whether the list has ten elements or ten million. It is $O(n)$, **linear time**, if the cost grows in proportion to $n$: checking whether a value occurs in an unsorted list may require looking at every element. Sorting is $O(n \log n)$. The notation ignores constant factors and describes how the cost *scales*, which is what matters when data grow. An $O(n)$ operation inside a loop that runs $n$ times is $O(n^2)$ in total; for $n = 10^5$, that is $10^{10}$ steps, which is why an innocent-looking `if x in big_list:` inside a loop can bring a program to a halt.

{{< note type="practice" title="Back of the envelope" >}}
Measured with CPython 3.13 on a current x86 laptop: an empty `for` loop runs at about 13 ns per iteration, `x in some_list` compares about one element every 7 ns (0.7 ms to reach the end of a list of 100 000 integers), and a set or dictionary lookup takes 30 to 40 ns regardless of size. Now deduplicate 100 000 candidate structures from a high-throughput screen by checking each new fingerprint against a list of fingerprints already seen. A new fingerprint is compared with every earlier one, so the job costs about $n^2/2 = 5 \times 10^9$ comparisons, roughly 35 s. With a set it costs $10^5$ lookups, about 4 ms. At $n = 10^6$ the list version needs about an hour and the set version still under a tenth of a second.
{{< /note >}}

## Lists

A **list** is an ordered, mutable sequence of references to objects, written in square brackets: `masses = [1.008, 12.011, 15.999]`. The elements may be of any types, mixed freely, since each slot holds only a pointer. Lists are indexed from zero, accept negative indices counted from the end, and support slicing exactly as strings do: `masses[1:]` is a new list of all but the first element, and `masses[::-1]` is the list reversed. Unlike strings, lists can be changed: `masses[0] = 1.00794` replaces an element, `masses[1:3] = []` deletes a slice, and the methods `append`, `extend`, `insert`, `pop`, `remove`, `sort` and `reverse` modify the list in place.

To understand what these operations cost, it helps to know how CPython stores a list. The list object holds a pointer to a separate contiguous **array of slots**, each slot an 8-byte pointer to an element object (on a 64-bit build). Reading or writing `a[i]` computes the address of slot `i` directly, which is why indexing is $O(1)$. Inserting at the front, `a.insert(0, x)`, must shift every existing pointer one slot along, so it is $O(n)$; so is `a.pop(0)`. For a queue that grows at one end and shrinks at the other, `collections.deque` does both ends in $O(1)$.

Appending is the interesting case. If the slot array were exactly as long as the list, every `append` would have to allocate a new array one slot longer and copy all the pointers into it, making a sequence of $n$ appends cost $O(n^2)$. Instead, when the array is full, CPython allocates a larger one with spare room, roughly one-eighth more than needed plus a little. The figure shows the real growth pattern of a CPython 3.12 list, measured with `sys.getsizeof`.

{{< widget name="listgrow" title="How a list grows" caption="Top: the slot array; blue slots hold elements, grey ones are allocated but unused. Bottom: allocated capacity against length, a staircase above the diagonal. The readouts count how often the array had to be moved and how many element copies that cost per append on average." >}}

The capacity runs 0, 4, 8, 16, 24, 32, 40, 52, 64, 76, …: each reallocation adds about 12.5 % plus a constant. Most appends therefore find a free slot and cost almost nothing; occasionally one triggers a move. Press "append 10 times" repeatedly and watch the last readout: the average number of element copies per append stays bounded by a small constant as the list grows. Appending is therefore **amortised** $O(1)$: cheap on average, even though an individual append is occasionally expensive. The memory cost of the spare slots is modest, and growing by a fixed fraction rather than a fixed amount is what makes the total copying linear.

### Why growing by a fraction works

Suppose the slot array is enlarged by a factor $g > 1$ each time it fills. When the list reaches $n$ elements, the most recent reallocation copied about $n/g$ pointers, the one before it $n/g^2$, and so on back to the start. The total is a geometric series,

$$ \text{copies} \approx \frac{n}{g} + \frac{n}{g^2} + \frac{n}{g^3} + \dots = \frac{n}{g - 1}, $$

so the number of copies per append is about $1/(g-1)$, independent of $n$. For doubling ($g = 2$) that is about one copy per append; for CPython's $g \approx 9/8$ it is about eight. Growth by a fixed number of slots $c$ behaves differently: reallocations happen at $c, 2c, 3c, \dots$, the copies add up to about $n^2/(2c)$, and the cost per append rises in proportion to $n$. Replaying a million appends under each rule makes the difference concrete. The CPython rule reallocates 86 times and copies 8.4 million pointers in total; doubling reallocates 21 times and copies 1.05 million; adding 64 slots at a time reallocates 15 625 times and copies 7.8 billion.

{{< fig src="growth.svg" alt="Log–log plot of average element copies per append against the number of appends, for four growth rules" caption="Average pointer copies per append, replayed for $10^6$ appends under four growth rules, assuming every reallocation copies the whole array. Geometric growth (CPython's one-eighth, or doubling) keeps the cost bounded; growth by a fixed number of slots makes it rise in proportion to $n$." >}}

Doubling copies less, so why does CPython choose one-eighth? Memory. Just after a doubling the array is half empty, whereas CPython's array is never more than about 11 % spare, and lists are by far the most common container in Python programs. Other runtimes strike the balance differently: Java's `ArrayList` grows by a factor of 1.5, and C++ standard libraries use 1.5 or 2 depending on the implementation. The figure counts copies as if every reallocation moved the data; in practice the C library's `realloc` can often extend a block in place, so the real cost is lower still.

{{< note type="warn" title="Myth" >}}
**Myth:** a Python list is a linked list, so inserting in the middle is cheap. **Reality:** it is a contiguous array of pointers, and `a.insert(k, x)` shifts every pointer after position `k`. For a list of 100 000 integers, one `insert(0, x)` followed by `pop(0)` takes about 43 µs, while `appendleft` and `popleft` on a `collections.deque` take about 55 ns in total, nearly a thousand times less. A work queue for a breadth-first search over a bond graph, or a sliding window over trajectory frames, belongs in a `deque`.
{{< /note >}}

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

A tuple whose fields deserve names can be made into a **named tuple** with `collections.namedtuple`, or, more flexibly, a **data class** ([the chapter on classes](../python-classes/)), so that `atom.mass` replaces the cryptic `atom[1]`.

In simulation code, tuples are the natural keys for anything identified by several integers. A bond between atoms 12 and 40 can be stored as `bonds[(12, 40)] = 1.53`, a grid cell as `cells[(ix, iy, iz)]`, a k-point by its integer mesh coordinates. Because a tuple is hashed from its contents, `(12, 40)` built in two different places in a program finds the same entry. Order matters, though: `(40, 12)` is a different key, so store each bond as `(min(i, j), max(i, j))`, or use `frozenset({i, j})`, an immutable and hashable set. A tuple is hashable only if everything inside it is: `(1, [2, 3])` raises `TypeError: unhashable type: 'list'`.

## Dictionaries

A **dictionary** maps **keys** to **values**: `masses = {"H": 1.008, "C": 12.011, "O": 15.999}`. Looking up `masses["C"]` takes the same short time whether the dictionary has three entries or three million. That is not obvious: with a list of pairs, finding a key requires scanning until it is found. The trick is a **hash table**.

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

### Inside CPython's dictionary

Since CPython 3.6, a dictionary is stored as two arrays, following a design that Raymond Hettinger proposed in 2012 and that PyPy had already adopted. The **indices** array is the hash table proper: a power-of-two number of small integers, each either empty or the position of an entry. The **entries** array holds the hash, the key pointer and the value pointer of each item, 24 bytes per item, packed densely in insertion order. A lookup computes `hash(key) & (size - 1)`, reads the number stored in that slot, and compares the stored hash and then the key of that entry. The figure shows the real layout of `{8: 'O', 1: 'H', 6: 'C', 14: 'Si'}`, read directly from the memory of a CPython 3.13 process with `ctypes`. Small integers hash to themselves, so 8, 1 and 6 land in slots 0, 1 and 6. The key 14 also maps to slot 6; CPython then applies its probe recurrence, `i = (5*i + 1 + perturb) & mask`, where `perturb` starts as the full hash and is shifted right by 5 bits before each step. Here `perturb` becomes 0 and the probe moves to $(5 \times 6 + 1) \bmod 8 = 7$. Mixing in the high bits of the hash through `perturb` means that keys which agree in their last three bits still follow different probe paths.

{{< fig src="dict-layout.svg" alt="Four integer keys hashed into an eight-slot index array whose filled slots point into a dense table of entries" caption="The compact layout of `{8: 'O', 1: 'H', 6: 'C', 14: 'Si'}` in CPython 3.13, read from memory. The index array is the sparse hash table; the entries table is dense and in insertion order. Key 14 collides with key 6 in slot 6 and the probe sequence moves it to slot 7." >}}

Two consequences follow from this layout. Iteration walks the dense entries array, so it yields keys in insertion order and never visits empty slots. Ordering came for free with the new layout and became a language guarantee in Python 3.7. And an empty slot costs one byte in the index array (for tables of up to 128 slots; larger tables use 2-, 4- or 8-byte indices) instead of a whole 24-byte entry, which made dictionaries 20 to 25 % smaller than in Python 3.5. A table of 8 slots accepts 5 entries; the sixth insertion triggers a resize to the smallest power of two that is at least three times the number of entries, 16 slots here, and every key is placed again.

### Why the table is kept two-thirds full

The threshold trades memory against probes. In the idealised model of **uniform hashing**, where every probe lands on a random slot, a lookup for an absent key at load factor $\alpha$ inspects on average $1/(1-\alpha)$ slots, and a lookup for a present key $\alpha^{-1}\ln[1/(1-\alpha)]$ (Knuth, *The Art of Computer Programming*, volume 3, section 6.4). At $\alpha = 2/3$ these are 3 and 1.65 slots. At $\alpha = 0.9$ they are 10 and 2.6, and both diverge as the table fills. The figure checks the model against CPython's probe recurrence, simulated on a table of 8192 slots filled with random 64-bit hashes: the perturbed sequence behaves like random probing.

{{< fig src="probes.svg" alt="Slots inspected per lookup against load factor: two theory curves with simulated points, rising steeply beyond two-thirds" caption="Average slots inspected per lookup at load factor $\alpha$. Lines: uniform-hashing theory; circles: CPython's perturbed probe sequence simulated on 8192 slots. Keeping $\alpha \le 2/3$ caps a miss at about 3 probes and a hit at about 1.65." >}}

The simplest alternative, **linear probing**, tries the next slot each time. It is cache friendly but builds long runs of occupied slots, and its expected cost for a miss is $\tfrac12[1 + 1/(1-\alpha)^2]$, already 5 slots at $\alpha = 2/3$. CPython's sets use a hybrid: they try up to nine adjacent slots linearly, which costs little because neighbouring slots usually share a cache line, and only then jump with the perturbed recurrence.

{{< note type="story" >}}
In December 2011, at the 28th Chaos Communication Congress in Berlin, Alexander Klink and Julian Wälde showed that the web frameworks of PHP, Java, Python and Ruby could be stalled by a single HTTP request whose parameter names all had the same hash. Each insertion into the server's dictionary then probes past every earlier key, and parsing the request becomes an $O(n^2)$ computation. Python's response was hash randomisation: since Python 3.3, string hashes are salted with a random key chosen when the interpreter starts, and PEP 456 (Christian Heimes, Python 3.4) replaced the string hash with SipHash, a keyed hash function designed by Jean-Philippe Aumasson and Daniel J. Bernstein. A visible side effect is that `hash("C")`, and therefore the iteration order of a set of strings, changes from run to run. A script that writes `for el in set(symbols):` produces its output in a different order each time; sort the set, or set the environment variable `PYTHONHASHSEED`, when output must be reproducible.
{{< /note >}}

### A dictionary of cells: neighbour search

Dictionaries keyed by tuples solve one of the central problems of molecular simulation: finding all pairs of atoms closer than a cut-off $r_c$ without testing all $N(N-1)/2$ pairs. Divide the box into cells at least $r_c$ wide and file each atom under the integer coordinates of its cell. Any partner within $r_c$ must then sit in the same cell or one of the 26 neighbouring cells, so each atom is compared with a few dozen candidates instead of with every other atom. The cell below builds such a **cell list** with a `defaultdict(list)` for 1000 random atoms in a periodic box of side 20 with $r_c = 2.5$, and checks the count against brute force.

{{< py title="a cell list from a dictionary" >}}
import numpy as np
from collections import defaultdict
from itertools import product

rng = np.random.default_rng(1)
L, rc, N = 20.0, 2.5, 1000
pos = rng.uniform(0.0, L, size=(N, 3))
m = int(L // rc)                                  # 8 cells per side, each 2.5 wide
cells = defaultdict(list)                         # (ix, iy, iz) -> atom indices
for i, p in enumerate(pos):
    cells[tuple(int(c) for c in p // (L / m))].append(i)

pairs = checked = 0
for (cx, cy, cz), members in cells.items():
    for dx, dy, dz in product((-1, 0, 1), repeat=3):
        for j in cells.get(((cx + dx) % m, (cy + dy) % m, (cz + dz) % m), []):
            for i in members:
                if i < j:
                    d = pos[i] - pos[j]
                    d -= L * np.round(d / L)
                    checked += 1
                    pairs += d @ d < rc * rc
print(len(cells), "occupied cells;", checked, "pairs checked;", pairs, "within rc")
d = pos[:, None] - pos[None]; d -= L * np.round(d / L)
print("brute force:", N * (N - 1) // 2, "pairs checked;", ((d**2).sum(-1)[np.triu_indices(N, 1)] < rc**2).sum(), "within rc")
{{< /py >}}

Both methods find the same 4050 pairs, close to the 4087 expected for an ideal gas at this density, but the cell list examines 26 263 candidate pairs instead of 499 500, nineteen times fewer, and the advantage grows in proportion to $N$ because the work per atom is fixed by the density and the cut-off. Only 432 of the 512 cells are occupied; a dictionary stores just those, which matters for sparse systems such as a gas-phase cluster in a large box. Production codes (the neighbour builders of LAMMPS and GROMACS, or `scipy.spatial.cKDTree`) use the same binning idea with flat integer arrays instead of a Python dictionary, which is faster by orders of magnitude but conceptually identical.

## Sets

A **set** is an unordered collection of distinct hashable objects, `{"H", "C", "O"}`, stored in a hash table without values. Its two uses are removing duplicates, `set(symbols)`, and fast membership tests, `x in s`, which is $O(1)$ instead of the $O(n)$ of a list. Sets also support the operations of mathematics: union `a | b`, intersection `a & b`, difference `a - b` and symmetric difference `a ^ b`. Comparing the neighbour sets of an atom at two times, for example, shows which neighbours left and which arrived. An empty set is written `set()`, because `{}` is an empty dictionary.

Set operations map directly onto trajectory analysis. Store the hydrogen bonds of a water frame as a set of `(donor, acceptor)` tuples; then `hb_t - hb_next` lists the bonds that broke between two frames, `hb_next - hb_t` those that formed, and `len(hb_t & hb_next) / len(hb_t)` is the fraction that survived, the first ingredient of a hydrogen-bond lifetime correlation function. With 3000 bonds per frame, each of these operations takes 30 to 100 µs, so they can run on every frame of a long trajectory.

{{< note type="warn" title="Myth" >}}
**Myth:** a set removes duplicate structures from a screening run if you key it on the energy. **Reality:** sets compare floats exactly, and two relaxations of the same structure rarely agree to the last bit: −3.74121 and −3.74123 eV/atom are different keys, and even `0.1 + 0.2 in {0.3}` is `False`. Rounding helps only partly, because two values on either side of a rounding boundary still land in different bins. Robust deduplication uses a structural fingerprint, such as reduced formula plus space group, as the key, and then compares the candidates within each group with a tolerance (pymatgen's `StructureMatcher` does exactly this).
{{< /note >}}

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

Real data are usually nested: a list of dictionaries, one per molecule, each holding a list of atoms, each atom a dictionary with an element and coordinates. Python's containers nest freely, and access chains naturally: `molecules[3]["atoms"][0]["xyz"][2]`. Remember that nesting stores references: a dictionary placed into two lists is one object, and changing it changes both, as [the chapter on objects and names](../python-objects-and-names/) showed. Use `copy.deepcopy` when independent copies are needed.

Nested dictionaries and lists of strings, numbers, Booleans and `None` map exactly onto **JSON**, the text format used by most web services and many materials databases. The `json` module converts in both directions:

```python
import json
mol = {"name": "water", "atoms": [{"el": "O", "xyz": [0, 0, 0]},
                                  {"el": "H", "xyz": [0.96, 0, 0]}]}
text = json.dumps(mol, indent=2)       # to a string (or json.dump(mol, file))
back = json.loads(text)                # and back
```

For large numerical arrays, JSON is slow and bulky, and binary formats such as NumPy's `.npy`, HDF5 or NetCDF are used instead.

The mapping between Python and JSON is not perfectly symmetric, and three differences cause real bugs. Dictionary keys become strings: `json.loads(json.dumps({1: 'H'}))` returns `{'1': 'H'}`, so a table indexed by atomic number comes back indexed by text. Tuples become lists, so a key such as `(12, 40)` cannot be written at all and must first be converted. And `float('nan')` is written as the bare token `NaN`, which Python reads back but which is not valid JSON, so strict parsers in other languages reject the file. Materials databases such as the Materials Project serve their documents as JSON, so these rules apply every time you download, cache and reload a query.

## Choosing a structure

The choice usually follows from the question the code will ask most often. If it asks "what is the *i*-th item?" or keeps items in order, use a list. If it asks "what is the value for this key?", use a dictionary. If it asks "have I seen this before?" or "which items are in both?", use a set. If the record is fixed and should not change, use a tuple or a data class. And if the items are numbers on which you will do arithmetic, use none of these: use a NumPy array, which stores raw numbers contiguously and operates on them in compiled code, as [the next subject's first topic](../numpy-arrays/) explains.

Memory is the second criterion, and it changes the answer for large data. A list of a million floats occupies about 8.4 MB of pointers plus 24 MB of float objects, 32 MB in total, while a NumPy array of the same numbers occupies 8 MB. A dictionary with a million integer keys needs about 42 MB for its index and entry arrays before counting the key and value objects. For millions of records the usual answer is therefore a set of parallel NumPy arrays, or a pandas table, with a dictionary used only as an index from labels to row numbers.

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
- CPython's dictionary is a sparse index array pointing into a dense, insertion-ordered entries array; at load factor $\alpha \le 2/3$ a miss costs about $1/(1-\alpha) \le 3$ probes.
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
- q: "Under uniform hashing, how many slots does a lookup for a missing key inspect on average at load factor 2/3?"
  options: ["1.5", "3", "9"]
  answer: 1
  why: "The expected number of probes for a miss is 1/(1 − α) = 1/(1/3) = 3."
- q: "What does json.loads(json.dumps({1: 'H'})) return?"
  options: ["{1: 'H'}", "{'1': 'H'}", "An error"]
  answer: 1
  why: "JSON object keys are always strings, so integer keys come back as text."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. The Python Tutorial, section 5 (data structures), docs.python.org/3/tutorial/datastructures.html.
2. Python Wiki, "TimeComplexity", wiki.python.org/moin/TimeComplexity: the cost of operations on built-in types in CPython.
3. T. H. Cormen, C. E. Leiserson, R. L. Rivest and C. Stein, *Introduction to Algorithms*, 4th ed., MIT Press (2022), chapters 3 (growth of functions), 11 (hash tables) and 16 (amortised analysis).
4. R. Hettinger, "Modern Python dictionaries: a confluence of a dozen great ideas", PyCon 2017 talk, on CPython's compact ordered dictionaries.
5. T. Peters, "listsort.txt", in the CPython source tree (Objects/listsort.txt), the design notes of Timsort.
6. The CPython source, Objects/listobject.c (`list_resize`) and Objects/dictobject.c, github.com/python/cpython.
7. D. E. Knuth, *The Art of Computer Programming*, vol. 3, *Sorting and Searching*, 2nd ed., Addison-Wesley (1998), section 6.4 (hashing), including the analysis of uniform and linear probing.
8. C. Heimes, "PEP 456 – Secure and interchangeable hash algorithm" (2013), peps.python.org/pep-0456.
9. J.-P. Aumasson and D. J. Bernstein, "SipHash: a fast short-input PRF", in *Progress in Cryptology – INDOCRYPT 2012*, Lecture Notes in Computer Science **7668**, Springer (2012), pp. 489–508.

</div>
