---
title: "Classes"
description: "Defining your own types: the class statement, instances, attributes and the self parameter; how attribute lookup works; class versus instance attributes; special methods for operators, printing, comparison and iteration; inheritance, polymorphism and composition illustrated with interatomic potentials; data classes and properties; and a small object-oriented simulation."
hook: "Write a + b with two NumPy arrays and Python quietly asks the first array what plus should mean. Your own classes can answer that question too, so vectors, atoms and potentials can behave like built-in types."
objectives:
  - "Define a class with an initialiser, attributes and methods, and explain what self is"
  - "Predict attribute lookup through instance, class and base classes, including shared class attributes"
  - "Implement special methods so that your objects work with operators, printing and loops"
  - "Use inheritance and polymorphism to build interchangeable families such as interatomic potentials"
  - "Write data classes, properties and a small object-oriented simulation"
cover: "cover.svg"
milestones:
  - year: 1967
    text: "Ole-Johan Dahl and Kristen Nygaard introduce classes and inheritance in Simula 67"
  - year: 1994
    text: "Gamma, Helm, Johnson and Vlissides publish Design Patterns, favouring composition over inheritance"
  - year: 2002
    text: "Bahn and Jacobsen wrap a plane-wave DFT code in Python objects, seeding ASE"
  - year: 2018
    text: "Python 3.7 adds data classes, designed by Eric V. Smith in PEP 557"
track: pycore
weight: 6
level: Core
prereqs: ["python-functions", "python-collections"]
lab: "See instances and their attributes in memory, and run an object-oriented oscillator"
---

## Types of your own

Every object belongs to a type, and the built-in types, `int`, `str`, `list`, `dict` and the rest, cover a great deal. But the things a scientific program reasons about are atoms, molecules, crystal structures, potentials, trajectories and simulations. A **class** lets you define a new type whose objects bundle together the data describing such a thing (its **attributes**) and the operations that make sense on it (its **methods**). An `Atom` object might carry an element symbol, a mass and a position; a `Potential` object might know how to compute an energy and a force. Code that uses them can then speak the language of the problem, `atom.mass` and `potential.force(r)`, rather than juggling parallel lists and remembering that index 3 means the mass.

This style, organising a program around objects that combine data and behaviour, is called **object-oriented programming**. Python supports it fully but does not force it: a short analysis script is often clearest as a handful of functions, and the decision to write a class should be made because it simplifies the code, not by habit. Classes earn their keep when several pieces of data always travel together and several functions always operate on them, when a family of related things should be interchangeable (several kinds of potential, several kinds of thermostat), or when you want your objects to work with Python's own syntax, such as `+` for vectors.

## Defining a class

A class is defined with the `class` statement:

```python
class Particle:
    """A point particle in one dimension."""

    def __init__(self, mass, x, v=0.0):
        self.mass = mass
        self.x = x
        self.v = v

    def kinetic_energy(self):
        return 0.5 * self.mass * self.v ** 2

p = Particle(mass=2.0, x=0.0, v=3.0)
print(p.kinetic_energy())     # 9.0
```

Executing the `class` statement creates a **class object**, here bound to the name `Particle`, which holds the functions defined in its body. Calling the class, `Particle(2.0, 0.0, 3.0)`, creates a new **instance**: an object of type `Particle` with its own empty set of attributes. Python then calls the special method `__init__` on the new instance to initialise it, passing the instance as the first argument, conventionally named `self`, followed by the arguments of the call. The assignments `self.mass = mass` attach attributes to that particular instance. Every instance has its own attributes, so two particles can have different positions.

Methods are functions defined in the class body. When you call `p.kinetic_energy()`, Python finds the function `kinetic_energy` on the class and calls it with `p` as the first argument: `p.kinetic_energy()` is exactly `Particle.kinetic_energy(p)`. That is all `self` is: the instance on which the method was called, passed explicitly. Unlike C++ or Java, Python requires you to write `self.x` inside methods to reach the instance's attributes; a bare `x` would be a local variable.

{{< note type="warn" title="Myth" >}}
**Myth:** `__init__` constructs the object. **Reality:** when `__init__` runs, the object already exists. `Particle(2.0, 0.0)` first calls `Particle.__new__(Particle)`, which allocates an empty instance, and then `__init__(instance, 2.0, 0.0)`, which fills it in. That is why `__init__` must return `None` and why the instance is already available as `self`. Overriding `__new__` is needed only for immutable types, such as a subclass of `tuple` or `float`, whose value must be fixed at the moment of allocation.
{{< /note >}}

The figure shows instances in memory. Each instance is a separate object with its own attributes, and the class itself is an object too, holding the methods.

{{< widget name="pytutor" title="Classes and instances in memory" caption="Step through and watch the class object appear, then two independent instances, each with its own attributes. In the second example, a class attribute is shared by every instance until one instance shadows it with an attribute of its own." opts=`{"presets":[["inst","Two instances","class Particle:\n    def __init__(self, mass, x):\n        self.mass = mass\n        self.x = x\n\n    def move(self, dx):\n        self.x = self.x + dx\n\na = Particle(1.0, 0.0)\nb = Particle(4.0, 2.0)\na.move(0.5)\nprint(a.x, b.x)\n"],["classattr","Class and instance attributes","class Atom:\n    unit = 'amu'\n    def __init__(self, el, mass):\n        self.el = el\n        self.mass = mass\n\nh = Atom('H', 1.008)\no = Atom('O', 15.999)\no.unit = 'g/mol'\nprint(h.unit, o.unit, Atom.unit)\n"],["compose","Objects containing objects","class Atom:\n    def __init__(self, el, x):\n        self.el = el\n        self.x = x\n\nclass Molecule:\n    def __init__(self, name):\n        self.name = name\n        self.atoms = []\n    def add(self, atom):\n        self.atoms.append(atom)\n\nwater = Molecule('water')\nwater.add(Atom('O', 0.0))\nwater.add(Atom('H', 0.96))\nprint(len(water.atoms))\n"]]}` >}}

## How attribute lookup works

When you write `obj.name`, Python searches in a definite order. It looks first in the instance's own attribute dictionary (`obj.__dict__`), then in the class, then in the class's base classes. The first match wins. This rule explains several behaviours at once. Methods are found on the class because instances do not normally store them. Data stored on the class rather than on `self`, a **class attribute**, is shared by all instances: in the second example of the figure, every `Atom` sees `unit = 'amu'` through its class. Assigning `o.unit = 'g/mol'` does not change the class attribute; it creates a new attribute on the instance `o` that **shadows** the class one, so only `o` sees the new value.

The same rule produces a trap analogous to the mutable default argument of [the chapter on functions](../python-functions/). A mutable class attribute, such as `atoms = []` written in the class body, is a single list shared by every instance; appending to it through one instance appends for all. Per-instance containers must be created in `__init__`, as the `Molecule` class in the third example does with `self.atoms = []`.

The figure traces four lookups on `lj = LennardJones()`, an instance of the potential classes defined later in this chapter. `lj.sigma` stops at the instance's own dictionary. `lj.energy` is found on `LennardJones`. `lj.force` is found one level further up, on `Potential`, and `Potential.energy` is never reached because the subclass's version is found first. `lj.mass` is searched for all the way to `object`, the root of every class, before Python raises `AttributeError`. The order in which classes are searched is the **method resolution order** (MRO), stored as `LennardJones.__mro__`: here `(LennardJones, Potential, object)`. With multiple inheritance the order is computed by the **C3 linearisation**, introduced for the Dylan language by Kim Barrett and co-workers in 1996 and adopted by Python 2.3, which guarantees that every class is searched before its own bases and that the order of bases in each `class` statement is respected.

{{< fig src="lookup.svg" alt="Four stacked boxes, instance, LennardJones, Potential and object, with four attribute lookups pointing to the box where each is found" caption="Attribute lookup on an instance of `LennardJones` searches the instance dictionary, then each class in the method resolution order. The first match wins, so the subclass's `energy` shadows the base-class version, and a name found nowhere raises `AttributeError`." >}}

Python has no private attributes. A single leading underscore, `self._cache`, is a convention meaning internal: other code should not rely on it. Two leading underscores, `self.__cache`, trigger **name mangling**: inside class `Particle` the name is rewritten to `_Particle__cache`, which prevents accidental clashes with attributes of subclasses but hides nothing, since `p._Particle__cache` still works. Because instance attributes live in a dictionary-like store, `vars(p)` lists them and `setattr(p, "dt", 0.002)` sets one by name, which is how many codes map the keys of an input file onto the attributes of a settings object.

## Special methods

Python's syntax is defined in terms of methods with double-underscore names, called **special** or "dunder" methods. When the virtual machine executes `BINARY_OP +` on `a + b`, it calls `a.__add__(b)`; `len(x)` calls `x.__len__()`; `x[i]` calls `x.__getitem__(i)`; `for item in x` calls `x.__iter__()`; `print(x)` uses `x.__str__()` or `x.__repr__()`; `a == b` calls `a.__eq__(b)`. By defining these methods, your own classes work with the language's operators and built-in functions exactly like the built-in types. A small vector class shows the idea:

{{< py title="operator overloading" >}}
import math

class Vector:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __add__(self, other):            # a + b
        return Vector(self.x + other.x, self.y + other.y)
    def __mul__(self, c):                # a * 2
        return Vector(c * self.x, c * self.y)
    __rmul__ = __mul__                   # 2 * a
    def __abs__(self):                   # abs(a)
        return math.hypot(self.x, self.y)
    def __repr__(self):                  # how it prints
        return f"Vector({self.x}, {self.y})"

a, b = Vector(1, 2), Vector(3, 4)
print(a + b, 2 * a, abs(b))
{{< /py >}}

`__repr__` deserves a special word: a class without one prints as something like `<__main__.Vector object at 0x10a3f2e50>`, which is useless in a debugging session. A good `__repr__` returns a string that looks like the code that would recreate the object.

Equality and hashing are linked. If a class defines `__eq__` but not `__hash__`, Python sets `__hash__` to `None` and instances become unhashable: putting one in a set raises `TypeError: unhashable type`. The reason is the rule from [the chapter on collections](../python-collections/): objects that compare equal must have equal hashes, and the default hash, derived from the object's identity, would break it. To use instances as dictionary keys, define `__hash__` from the same fields that `__eq__` compares, for example `return hash((self.x, self.y))`, and never change those fields afterwards. Binary operators also have a protocol for mixed types. If `a.__add__(b)` does not know how to handle `b`, it should `return NotImplemented` rather than raise an error; Python then tries `b.__radd__(a)` and raises `TypeError` only if both decline. That is how `2 * a` reached `__rmul__` in the cell above, and how NumPy arrays and your own classes can be combined in either order.

Container behaviour needs only two methods. A class that defines `__len__` and `__getitem__` already supports `len()`, indexing and `for` loops, because Python's fallback iteration calls `__getitem__(0)`, `__getitem__(1)`, and so on until `IndexError`. A trajectory class whose `__getitem__` seeks to frame `i` in a file and reads only that frame can therefore be looped over like a list without loading gigabytes into memory; the trajectory readers of MDAnalysis work on this principle, reading one frame at a time as the loop advances.

Special methods also explain why Python cares so little about the declared type of an object. A function that loops over its argument works with a list, a tuple, a file, a generator or any object of yours that defines `__iter__`. This is called **duck typing**: if it iterates like a sequence, it can be used as one. NumPy arrays, pandas data frames and PyTorch tensors all plug into Python's syntax this way, which is why `a + b` adds two arrays element by element: the array type's `__add__` method runs a compiled loop.

## Inheritance and polymorphism

A class can be defined as a specialisation of another, its **base class**, by naming the base in parentheses. The new class **inherits** every method of the base and can add methods or **override** existing ones. In simulation code this is a natural way to express a family of interchangeable models. Every pair potential provides an energy, and the force can be derived from any energy by differentiation:

{{< py title="a family of potentials" >}}
class Potential:
    """Base class: a pair potential of distance r."""
    def energy(self, r):
        raise NotImplementedError
    def force(self, r, h=1e-6):
        """Force along r from a central difference of the energy."""
        return -(self.energy(r + h) - self.energy(r - h)) / (2 * h)

class Harmonic(Potential):
    def __init__(self, k, r0):
        self.k, self.r0 = k, r0
    def energy(self, r):
        return 0.5 * self.k * (r - self.r0) ** 2

class LennardJones(Potential):
    def __init__(self, epsilon=1.0, sigma=1.0):
        self.epsilon, self.sigma = epsilon, sigma
    def energy(self, r):
        sr6 = (self.sigma / r) ** 6
        return 4 * self.epsilon * (sr6 * sr6 - sr6)

for p in (Harmonic(k=500.0, r0=1.0), LennardJones()):
    print(type(p).__name__, round(p.energy(1.1), 4), round(p.force(1.1), 4))
{{< /py >}}

The loop at the end treats both objects identically, calling `energy` and `force` without knowing which kind of potential it has: this is **polymorphism**, and it is what lets a simulation engine accept any potential, any thermostat or any integrator through a common interface. `Harmonic` and `LennardJones` define only `energy`; the finite-difference `force` is inherited from `Potential` (a real code would override it with the analytical derivative, which is faster and exact). Inside an overriding method, `super().method(...)` calls the base class's version, which is the usual way for a subclass's `__init__` to run its parent's initialisation before adding its own.

### How accurate is the inherited force?

The base class differentiates numerically, $F(r) \approx -[U(r+h) - U(r-h)]/2h$, with $h = 10^{-6}$ by default. Two errors compete in that formula. A Taylor expansion shows that the central difference differs from the true derivative by $h^2 U^{\prime\prime\prime}(r)/6$, the **truncation error**, which shrinks as $h$ decreases. But $U(r+h)$ and $U(r-h)$ each carry a relative rounding error of about $\epsilon = 2.2 \times 10^{-16}$ ([numbers in a computer](../numbers-in-a-computer/)), and dividing their small difference by $2h$ amplifies it to about $\epsilon|U|/h$, which grows as $h$ decreases. The sum is smallest where the two are comparable, at $h^* \approx (3\epsilon|U|/|U^{\prime\prime\prime}|)^{1/3}$. For the Lennard-Jones potential at $r = 1.1\sigma$, $U = -0.983\,\epsilon_{\text{LJ}}$ and $U^{\prime\prime\prime} = -1521\,\epsilon_{\text{LJ}}/\sigma^3$, which gives $h^* \approx 8 \times 10^{-7}\sigma$. The default step sits close to the optimum: the inherited force is $1.588\,\epsilon_{\text{LJ}}/\sigma$, wrong by $4 \times 10^{-11}$.

{{< fig src="fd-error.svg" alt="Log–log plot of force error against finite-difference step, V-shaped with a minimum near ten to the minus six" caption="Error of the inherited central-difference force of `LennardJones` at $r = 1.1\sigma$. Right of the minimum the truncation error $|U^{\prime\prime\prime}|h^2/6$ dominates; left of it, rounding error $\epsilon|U|/h$, which is why the points scatter. The default $h = 10^{-6}$ is near the optimum $h^* \approx 8 \times 10^{-7}$." >}}

Two practical lessons follow. A step of $10^{-3}$, a tempting round number, gives an error of $2.5 \times 10^{-4}$, large enough to spoil energy conservation in a molecular dynamics run; a step of $10^{-10}$ is worse again, because rounding now dominates. And a finite-difference force costs two energy evaluations per Cartesian component, $6N$ evaluations for $N$ atoms, so production potentials override `force` with the analytical derivative. Finite differences then become the standard unit test for that override: comparing analytical and central-difference forces at $h$ between $10^{-6}$ and $10^{-4}$ catches sign errors, missing factors of two and forgotten chain-rule terms before they reach a production run.

Inheritance is easy to overuse. Deep hierarchies of classes, where behaviour is spread across five levels of parents, are hard to follow. Often **composition**, where an object holds other objects as attributes, is clearer: a `Simulation` *has* a potential, an integrator and a thermostat, rather than *being* a special kind of any of them. The third example in the figure, a `Molecule` holding a list of `Atom` objects, is composition.

{{< note type="practice" title="From the lab" >}}
ASE shows these ideas in one workflow. An `Atoms` object holds positions, atomic numbers, the cell and the periodic boundary conditions. A calculator, such as the built-in `EMT()` or a wrapper around VASP, Quantum ESPRESSO or a machine-learned potential, is attached with `atoms.calc = calc`, and `atoms.get_potential_energy()` delegates to it. An optimiser such as `BFGS(atoms)` or a dynamics object such as `VelocityVerlet(atoms, timestep=...)` drives the atoms through repeated calls to `get_forces()`. Every calculator implements the same small interface, so replacing DFT by a machine-learned potential in a relaxation script is a one-line change. That is polymorphism, combined with composition: atoms *have* a calculator; they are not a kind of calculator.
{{< /note >}}

## Data classes and properties

Many classes in scientific code are mostly records: an atom with an element, a mass and a position. Writing `__init__`, `__repr__` and `__eq__` by hand for each is tedious, and the `dataclasses` module generates them from annotated class attributes:

```python
from dataclasses import dataclass, field

@dataclass
class Atom:
    element: str
    mass: float
    position: list = field(default_factory=lambda: [0.0, 0.0, 0.0])

o = Atom("O", 15.999)
print(o)                         # Atom(element='O', mass=15.999, position=[0.0, 0.0, 0.0])
print(o == Atom("O", 15.999))    # True: equality compares the fields
```

Note `default_factory`: even here, a mutable default must be created afresh for each instance. `@dataclass(frozen=True)` makes instances immutable and therefore usable as dictionary keys.

A **property** makes a method look like an attribute. It suits quantities computed from other attributes, so that they can never go stale:

```python
class Box:
    def __init__(self, lx, ly, lz):
        self.lengths = (lx, ly, lz)

    @property
    def volume(self):
        lx, ly, lz = self.lengths
        return lx * ly * lz

box = Box(3.0, 3.0, 4.0)
box.volume          # 36.0, recomputed every time it is read
```

## Objects at scale

Objects carry overhead, and for atoms it adds up. In CPython 3.13, an instance of the `Atom` data class above, with its position stored as a list of three floats, occupies about 280 bytes once the instance, its attribute storage, the list and the three float objects are counted (measured with `tracemalloc` over 100 000 atoms). `@dataclass(slots=True)`, which replaces the per-instance attribute dictionary by fixed slots, brings this down to about 240 bytes. A NumPy representation needs 32 bytes per atom: 24 for the position and 8 for the mass. The speed difference is larger. On the same laptop, shifting 100 000 atoms by a vector takes about 13 ms as a Python loop over `Atom` objects and 0.07 ms as one in-place addition on an `(N, 3)` array, a factor of about 190.

{{< fig src="aos-soa.svg" alt="Left: a list pointing to four separate Atom objects; right: one Atoms object holding a symbols list, a mass array and a contiguous positions array" caption="Two ways to store atoms. One object per atom (left) scatters the data across the heap at about 280 bytes per atom; one object for the whole system holding NumPy arrays (right) packs it at 32 bytes per atom and allows vectorised operations." >}}

The design lesson is to let a class represent the whole collection: an *array of structures* becomes a *structure of arrays*. ASE's `Atoms` stores `positions` as one `(N, 3)` array and atomic numbers as one integer array, and `atoms[5]` returns a lightweight `Atom` proxy that reads from and writes to those arrays. Code loops over individual atoms only when it must, and everything else is a vectorised operation on whole arrays, as [the chapter on NumPy arrays](../numpy-arrays/) explains. The same reasoning explains why GPU codes such as JAX-MD and TorchMD store a system as a few large tensors rather than as objects per particle.

## A small object-oriented simulation

The pieces come together in a class that holds the state of a system and advances it in time. The `Oscillator` below is a particle on a spring, integrated with the velocity Verlet algorithm that [molecular dynamics](../molecular-dynamics/) uses for millions of atoms. The object stores the state, the `force` and `energy` methods describe the physics, and `step` advances the state by one time step.

{{< py title="an oscillator object" >}}
class Oscillator:
    """One particle on a spring, integrated with velocity Verlet."""
    def __init__(self, k=1.0, m=1.0, x=1.0, v=0.0):
        self.k, self.m, self.x, self.v = k, m, x, v
    def force(self):
        return -self.k * self.x
    def energy(self):
        return 0.5 * self.m * self.v**2 + 0.5 * self.k * self.x**2
    def step(self, dt):
        self.v += 0.5 * dt * self.force() / self.m    # half kick
        self.x += dt * self.v                         # drift
        self.v += 0.5 * dt * self.force() / self.m    # half kick

osc = Oscillator()
E0 = osc.energy()
for n in range(1, 10001):
    osc.step(0.05)
    if n % 2500 == 0:
        print(f"t = {n * 0.05:6.1f}  x = {osc.x:+.4f}  energy drift = {osc.energy() - E0:+.2e}")
{{< /py >}}

After 10 000 steps, about 80 oscillation periods, the energy still agrees with its initial value to a few parts in ten thousand (the largest deviation is $6.25 \times 10^{-4}$ of the initial energy), and the error oscillates rather than growing, a property of the Verlet algorithm explained in [the chapter on integrators](../molecular-dynamics/). Swapping the spring for another potential, or the integrator for another scheme, would mean changing one method, while all the code that runs and analyses the simulation stays the same. That separation of concerns is the real benefit of classes. Production codes such as ASE are organised exactly this way: an `Atoms` object holds positions, a `Calculator` object computes energies and forces, and a `Dynamics` object advances time.

The claim that only one method needs to change can be tested directly. Explicit Euler, the simplest integrator, updates the position with the old velocity and the velocity with the old force:

```python
class EulerOscillator(Oscillator):
    """Same physics, different integrator: only step() is overridden."""
    def step(self, dt):
        f = self.force()
        self.x += dt * self.v
        self.v += dt * f / self.m
```

The force, the energy and the loop that runs and prints are inherited unchanged.

{{< note type="try" title="Pause and predict" >}}
Both integrators make an error of order $\Delta t^2$ in each step. Before looking at the figure, predict what happens to the energy of each over 10 000 steps of $\Delta t = 0.05$.
{{< /note >}}

{{< fig src="integrators.svg" alt="Left: energy against time for explicit Euler rising exponentially and velocity Verlet flat; right: Verlet's tiny energy oscillation late in the run" caption="The `Oscillator` of this section (velocity Verlet) and its subclass `EulerOscillator`, $k = m = 1$, $\Delta t = 0.05$. Euler's energy grows by a factor $1 + \omega^2\Delta t^2$ every step. Verlet's energy oscillates within a fixed band, still between $-6.25 \times 10^{-4}$ and 0 after 9500 steps." >}}

For a harmonic oscillator, explicit Euler multiplies the energy by exactly $1 + \omega^2\Delta t^2$ in every step, 1.0025 here. After 400 steps the energy has grown by a factor $e \approx 2.7$; after 10 000 steps, by about $7 \times 10^{10}$, and the particle is at $x \approx -2.6 \times 10^{5}$. Velocity Verlet makes errors of the same order per step, but because it is **symplectic** they do not accumulate: the energy oscillates between $E_0[1 - (\omega\Delta t)^2/4]$ and $E_0$ for as long as the run continues. The difference lies in the structure of the update, not in its order of accuracy, and the object-oriented version exposes it by overriding one method of five lines.

{{< note type="key" >}}
- A class defines a new type; calling it creates an instance, and `__init__` initialises the instance's attributes on `self`.
- `obj.method()` is `Class.method(obj)`. Attribute lookup searches the instance, then the class, then its bases; mutable class attributes are shared by all instances.
- Special methods (`__add__`, `__len__`, `__iter__`, `__repr__`, `__eq__`, …) connect your classes to Python's operators and built-ins; duck typing means any object with the right methods works.
- Inheritance shares and overrides behaviour across a family of types; polymorphism lets code use them interchangeably; composition is often simpler than deep inheritance.
- Data classes generate boilerplate for record-like classes; properties expose computed values as attributes.
- For many particles, prefer one object holding arrays (structure of arrays) over one object per particle: about 32 instead of 280 bytes per atom, and vectorised operations.
{{< /note >}}

{{< quiz >}}
- q: "Inside a method, what does `self` refer to?"
  options: ["The class", "The instance on which the method was called", "The module"]
  answer: 1
  why: "obj.m() is translated into Class.m(obj); self is simply the first argument."
- q: "A class has `atoms = []` in its body, and two instances each append an atom. How many atoms does each instance see?"
  options: ["1 each", "2 each, because the class attribute is one shared list", "0"]
  answer: 1
  why: "Create per-instance lists in __init__ with self.atoms = []."
- q: "Which special method does Python call to evaluate `a * 2` when a is your object?"
  options: ["a.__mul__(2)", "a.__times__(2)", "2.__mul__(a)"]
  answer: 0
  why: "The left operand's __mul__ is tried first; for 2 * a, Python falls back to a.__rmul__(2)."
- q: "Two potential classes inherit from Potential and both define energy(). A loop calls p.energy(r) on a mixture of both. This is an example of…"
  options: ["recursion", "polymorphism", "a closure"]
  answer: 1
  why: "The same call works on objects of different types, each using its own implementation."
- q: "Why give a class a __repr__ method?"
  options: ["It is required for the class to work", "So that printing an instance shows useful information instead of a memory address", "It makes the class faster"]
  answer: 1
  why: "A good repr makes debugging, logging and interactive work far easier."
- q: "A class defines __eq__ but not __hash__. What happens when you add an instance to a set?"
  options: ["It works, using the object's identity", "TypeError: the instance is unhashable", "The set compares instances with __eq__ only"]
  answer: 1
  why: "Defining __eq__ sets __hash__ to None, because equal objects must have equal hashes; define __hash__ from the same fields."
- q: "The inherited finite-difference force uses h = 1e-6. Why would h = 1e-12 give a worse force?"
  options: ["The Taylor truncation error grows", "Rounding error in U(r ± h) is amplified by 1/h", "Python cannot represent 1e-12"]
  answer: 1
  why: "The truncation error falls as h², but the rounding error grows as ε|U|/h; the optimum is near 1e-6 here."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. The Python Tutorial, section 9 (classes), docs.python.org/3/tutorial/classes.html.
2. The Python Language Reference, section 3.3 (special method names), docs.python.org/3/reference/datamodel.html.
3. L. Ramalho, *Fluent Python*, 2nd ed., O'Reilly (2022), chapters 1 (the Python data model), 5 (data class builders), 11–12 (Pythonic objects and special methods) and 14 (inheritance).
4. E. V. Smith, "PEP 557 – Data Classes" (2017), peps.python.org/pep-0557.
5. A. H. Larsen et al., "The atomic simulation environment—a Python library for working with atoms", *Journal of Physics: Condensed Matter* **29**, 273002 (2017).
6. E. Gamma, R. Helm, R. Johnson and J. Vlissides, *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley (1994), on favouring composition over inheritance.
7. S. R. Bahn and K. W. Jacobsen, "An object-oriented scripting interface to a legacy electronic structure code", *Computing in Science & Engineering* **4**, 56–66 (2002).
8. K. Barrett, B. Cassels, P. Haahr, D. A. Moon, K. Playford and P. T. Withington, "A monotonic superclass linearization for Dylan", *Proceedings of OOPSLA '96*, ACM (1996), the origin of the C3 method resolution order.
9. O.-J. Dahl and K. Nygaard, "SIMULA: an ALGOL-based simulation language", *Communications of the ACM* **9**, 671–678 (1966).

</div>
