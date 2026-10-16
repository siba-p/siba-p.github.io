---
title: "Motion: position, momentum, force and energy"
description: "The classical mechanics every simulation rests on: velocity and momentum, Newton's second law, forces as slopes of a potential, conservation of energy, and phase space, the map in which a whole motion becomes a single curve. Hamilton's equations included."
track: physics
weight: 1
level: Foundation
minutes: 50
lab: "Roll a particle in a potential and draw its phase portrait"
---

## Why start with a ball on a hill

A molecular dynamics simulation of a protein or a crystal follows millions of atoms, but each atom obeys the same laws as a single ball rolling in a valley. If you understand one particle moving in one dimension, its position, velocity, momentum, force and energy, and the picture called phase space, you understand what every MD code computes, and why its results can be trusted. This chapter builds that picture.

## Describing motion

The **position** $x(t)$ says where the particle is at time $t$. Its rate of change is the **velocity**, and the rate of change of velocity is the **acceleration**:

$$
v = \frac{\mathrm dx}{\mathrm dt} = \dot x, \qquad a = \frac{\mathrm dv}{\mathrm dt} = \ddot x .
$$

Newton recognised that the quantity a force changes is not velocity alone but velocity weighted by how much matter is moving, the **momentum**:

{{< eq title="Momentum and Newton's second law" say="A force is whatever changes momentum; the bigger the mass, the smaller the change in velocity for the same push." >}}
$$ \textcolor{#12a594}{p} = \textcolor{#845ef7}{m}\,\textcolor{#4c6ef5}{v}, \qquad \frac{\mathrm d\textcolor{#12a594}{p}}{\mathrm dt} = \textcolor{#f08c2e}{F} \quad\Longleftrightarrow\quad \textcolor{#845ef7}{m}\,\ddot x = \textcolor{#f08c2e}{F} $$
- $\textcolor{#12a594}{p}$: momentum, kg m s⁻¹
- $\textcolor{#845ef7}{m}$: mass, the resistance to changes of motion
- $\textcolor{#4c6ef5}{v}$: velocity
- $\textcolor{#f08c2e}{F}$: the force acting on the particle
{{< /eq >}}

The second law is a **differential equation**: given the position and velocity now, and the force as a function of position, it determines the entire future and past. This determinism is what lets a computer predict motion step by step.

## Forces from a landscape

For atoms, forces are not arbitrary: they come from a **potential energy** $V(x)$, a landscape that depends on where the particles are ([the chapter on potential energy surfaces](../potential-energy-surfaces/) shows where atomic landscapes come from). The force is the downhill slope:

{{< eq title="Force as a slope" say="The force points downhill, and is strongest where the landscape is steepest." >}}
$$ \textcolor{#f08c2e}{F}(x) = -\frac{\mathrm d\textcolor{#4c6ef5}{V}}{\mathrm dx} $$
- the minus sign: a ball on a slope rising to the right is pushed to the left
- at a minimum or maximum of $V$ the force is zero (equilibrium)
{{< /eq >}}

Three landscapes appear in the lab. A **spring**, $V = \tfrac12 kx^2$, gives a force $F = -kx$ that always pulls back towards the centre (Hooke's law), the model of a chemical bond near equilibrium. A **double well** has two valleys separated by a barrier, the simplest model of a chemical reaction, a conformational change or a phase transition. A **pendulum**, $V = 1 - \cos x$, is a model of a rotating chemical group with a periodic barrier.

{{< widget name="phasespace" title="A particle in a potential, and its path in phase space" caption="Left: the landscape V(x), the particle, its force (orange arrow) and velocity (teal arrow), and a bar showing kinetic (K) and potential (V) energy. Right: phase space, momentum against position. Click in the phase plane to start a new motion; add friction and watch the trajectory spiral inwards." >}}

## Energy, and why it is conserved

Watch the energy bar while the particle moves. As it rolls downhill, potential energy turns into **kinetic energy** $K = \tfrac12 mv^2 = p^2/2m$; as it climbs, kinetic turns back into potential; and without friction their sum never changes.

{{< eq title="Conservation of energy" say="Kinetic plus potential energy is constant when the force comes from a potential." >}}
$$ \textcolor{#d4a017}{E} = \underbrace{\frac{\textcolor{#12a594}{p}^2}{2\textcolor{#845ef7}{m}}}_{\text{kinetic}} + \underbrace{\textcolor{#4c6ef5}{V}(x)}_{\text{potential}} = \text{constant} $$
- proof: $\dfrac{\mathrm dE}{\mathrm dt} = \dfrac{p}{m}\dot p + V'(x)\,\dot x = v\,F - F\,v = 0$
{{< /eq >}}

Conservation gives a lot for free. The particle can only be where $V(x) \le E$; the points where $V(x) = E$ are **turning points**, where it momentarily stops and reverses. With $E$ below the barrier of the double well, it is trapped in one valley forever; above it, it crosses back and forth. In molecular dynamics, the fact that a correct integrator keeps the total energy constant is the first and most important test of a simulation ([the MD chapter](../molecular-dynamics/)).

Add friction in the lab: energy now leaks away, and the particle settles into a minimum. That is what an energy minimisation does to a structure, and what a thermostat has to counteract when it adds the right amount of random kicks back.

## Phase space

Here is the central picture of this volume. The state of the particle at any instant is not its position alone, because two particles at the same place moving in opposite directions have different futures. The complete state is the pair $(x, p)$, a point in a plane called **phase space**. Newton's law moves that point along a curve, the **trajectory**, and because the state determines the future uniquely, **trajectories never cross**.

Since energy is conserved, the trajectory stays on a curve of constant $E$: the **energy contour** $p = \pm\sqrt{2m(E - V(x))}$. In the lab:

- the **spring** gives ellipses: the particle oscillates forever around the centre;
- the **double well** shows two families of loops, one inside each valley, enclosed by a figure-of-eight called the **separatrix**; outside it, large loops circle both valleys;
- the **pendulum** shows closed loops (swinging) inside wavy open curves (rotating all the way round);
- **friction** turns closed loops into spirals that end at a minimum.

For $N$ atoms in three dimensions phase space has $6N$ dimensions, three positions and three momenta per atom, and a molecular dynamics run traces one trajectory through it. Statistical mechanics, the subject of [the chapters after next](../entropy-and-temperature/), is the art of saying what fraction of that enormous space a system visits.

## Hamilton's formulation

Writing the energy as a function of position and momentum, $H(x, p) = p^2/2m + V(x)$, called the **Hamiltonian**, puts Newton's law in a beautifully symmetric form:

{{< eq title="Hamilton's equations" say="The motion runs along the contours of H, at a speed set by how steep H is." >}}
$$ \dot x = \frac{\partial \textcolor{#d4a017}{H}}{\partial \textcolor{#12a594}{p}} = \frac{p}{m}, \qquad \dot p = -\frac{\partial \textcolor{#d4a017}{H}}{\partial x} = -V'(x) = \textcolor{#f08c2e}{F} $$
- $\textcolor{#d4a017}{H}(x, p)$: the total energy expressed in phase-space coordinates
- the velocity in phase space, $(\dot x, \dot p)$, is always perpendicular to $\nabla H$, which is why it follows the contours
{{< /eq >}}

Hamiltonian flow has a deep property, **Liouville's theorem**: a small blob of initial conditions changes shape as it flows but never changes its area (volume, in many dimensions). This is why the integrators used in molecular dynamics are built to be **symplectic**, preserving phase-space volume exactly, and it is the foundation on which statistical mechanics builds its probabilities.

{{< note type="key" >}}
- The state of a classical particle is its position and momentum; Newton's law $\dot p = F$ with $F = -\mathrm dV/\mathrm dx$ determines how that state evolves.
- Without friction the energy $p^2/2m + V(x)$ is conserved, so the motion follows a contour of constant energy in phase space.
- Phase space, $(x, p)$ for one particle and $6N$ dimensions for $N$ atoms, is the stage on which molecular dynamics and statistical mechanics are played.
{{< /note >}}

{{< quiz >}}
- q: "A particle sits at a point where $V(x)$ has its minimum. What is the force on it?"
  options: ["Maximal", "Zero, because the slope of V is zero there", "It depends on the mass"]
  answer: 1
  why: "$F = -\\mathrm dV/\\mathrm dx$ vanishes at any minimum or maximum of the potential."
- q: "In the harmonic potential, what shape is a trajectory in phase space?"
  options: ["A straight line", "An ellipse", "A spiral"]
  answer: 1
  why: "$p^2/2m + \\tfrac12 kx^2 = E$ is the equation of an ellipse. With friction it becomes a spiral."
- q: "Why can two different phase-space trajectories never cross?"
  options: ["Because energy is conserved", "Because the state (x, p) determines the future uniquely, so two trajectories through the same point must be the same trajectory", "Because particles repel each other"]
  answer: 1
  why: "Newton's equations are first order in phase space: one state, one future."
- q: "In the double well, the particle's energy is just below the barrier top. What happens?"
  options: ["It crosses back and forth between the wells", "It stays in one well forever, oscillating between two turning points", "It stops at the barrier top"]
  answer: 1
  why: "It can only reach positions where $V(x) \\le E$. In real molecules thermal kicks occasionally lift it over the barrier: that is a rare event, the subject of rate theory and enhanced sampling."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. L. D. Landau and E. M. Lifshitz, *Mechanics*, 3rd ed., Course of Theoretical Physics vol. 1, Butterworth-Heinemann (1976), chapters 1–2 and 7.
2. J. R. Taylor, *Classical Mechanics*, University Science Books (2005), chapters 1–4 and 13 (Hamiltonian mechanics).
3. H. Goldstein, C. P. Poole and J. L. Safko, *Classical Mechanics*, 3rd ed., Addison-Wesley (2002), chapters 8–9.
4. M. E. Tuckerman, *Statistical Mechanics: Theory and Molecular Simulation*, 2nd ed., Oxford University Press (2023), chapter 1 (classical mechanics, phase space and Liouville's theorem).
5. R. P. Feynman, R. B. Leighton and M. Sands, *The Feynman Lectures on Physics*, vol. I, chapters 9 and 14 (Newton's laws, work and potential energy), free online at feynmanlectures.caltech.edu.

</div>
