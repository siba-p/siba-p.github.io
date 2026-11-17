---
title: "Classical mechanics and phase space"
description: "The classical mechanics every simulation rests on: velocity and momentum, Newton's second law, forces as slopes of a potential, conservation of energy, and phase space, the map in which a whole motion becomes a single curve. Hamilton's equations included."
hook: "Know an atom's position, its momentum and the landscape it moves in, and Newton's law fixes its whole future. Plot position against momentum and every motion becomes a curve, and a cloud of such curves flows like a liquid that cannot be compressed."
objectives:
  - "Derive forces from a potential and use Newton's law to predict motion"
  - "Explain energy conservation and how turning points trap a particle in a valley"
  - "Draw and interpret phase portraits for the spring, the double well and the pendulum"
  - "Explain Liouville's theorem and why MD integrators are built to be symplectic"
  - "Estimate a bond's vibration period, amplitude and phase-space area from spectroscopic data"
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

{{< note type="try" >}}
Choose the double well and click inside one of the small loops on the right: the particle rocks back and forth in its own valley and never visits the other. Now press **Kick: add momentum** a few times. As soon as the gold energy line rises above the central barrier, the orbit jumps to a large loop that encloses both valleys. Then switch to the spring and raise the mass from 1 to 4: the contours stretch along the momentum axis and the motion slows, because the period $2\pi\sqrt{m/k}$ doubles.
{{< /note >}}

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

## A worked example: one chemical bond in phase space

Numbers make the phase portrait concrete. Take a carbon monoxide molecule and treat its bond as a spring. Two atoms vibrating against each other behave like a single particle with the **reduced mass** $\mu = m_\mathrm{C} m_\mathrm{O}/(m_\mathrm{C} + m_\mathrm{O}) = 6.86$ u $= 1.14 \times 10^{-26}$ kg, moving in the potential $\tfrac12 kx^2$, where $x$ is the stretch of the bond. Infrared spectroscopy gives the vibration's wavenumber, about 2170 cm⁻¹, and that fixes everything else.

1. The frequency is $\nu = c\tilde\nu = (3.00 \times 10^{10}\ \text{cm s}^{-1})(2170\ \text{cm}^{-1}) = 6.5 \times 10^{13}$ Hz, so one oscillation takes $1/\nu = 15.4$ fs, and the angular frequency is $\omega = 2\pi\nu = 4.09 \times 10^{14}$ s⁻¹.
2. The force constant is $k = \mu\omega^2 = 1.90 \times 10^{3}$ N m⁻¹, a very stiff spring: stretching the bond by 1 pm takes a force of 1.9 nN.
3. At room temperature a classical oscillator holds on average $E = k_BT = 4.14 \times 10^{-21}$ J, half of it kinetic and half potential ([the chapter on the Boltzmann distribution](../boltzmann-and-maxwell/) explains why). An orbit of that energy turns at $x = \pm\sqrt{2E/k} = \pm 2.1$ pm, under 2 % of the 113 pm bond length, and reaches a peak momentum $\sqrt{2\mu E} = 9.7 \times 10^{-24}$ kg m s⁻¹, a relative speed of about 850 m s⁻¹.
4. The orbit in phase space is an ellipse with these two semi-axes, so it encloses an area $\pi x_{\max} p_{\max} = 2\pi E/\omega = 6.4 \times 10^{-35}$ J s.

The last number has the units of Planck's constant, $h = 6.63 \times 10^{-34}$ J s, and is about a tenth of it. That comparison is decisive. In quantum mechanics the levels of an oscillator correspond to orbits enclosing areas of exactly $(n + \tfrac12)h$, so even the ground state occupies half of $h$. A thermal orbit of a tenth of $h$ is smaller than the smallest one nature allows: the CO vibration cannot be described classically at room temperature, as [the next chapter](../quantum-energy-levels/) shows. By contrast, an argon atom crossing a 1 nm cage at 400 m s⁻¹, close to its mean thermal speed, has a product of distance and momentum of $2.65 \times 10^{-32}$ J s, forty times $h$, and classical mechanics describes it very well.

{{< note type="practice" >}}
The period of the fastest motion sets the time step of a molecular dynamics run. Bonds to hydrogen are the fastest: a C–H stretch near 3000 cm⁻¹ has a period of about 11 fs, and an integrator needs ten or more steps per period to follow it stably. Hence the standard choices: 0.5 to 1 fs when every bond is flexible, 2 fs when bonds to hydrogen are held rigid by constraint algorithms such as SHAKE or LINCS, and up to 4 fs with hydrogen mass repartitioning, which makes each hydrogen heavier at the expense of the atom it is bonded to.
{{< /note >}}

## Hamilton's formulation

Writing the energy as a function of position and momentum, $H(x, p) = p^2/2m + V(x)$, called the **Hamiltonian**, puts Newton's law in a beautifully symmetric form:

{{< eq title="Hamilton's equations" say="The motion runs along the contours of H, at a speed set by how steep H is." >}}
$$ \dot x = \frac{\partial \textcolor{#d4a017}{H}}{\partial \textcolor{#12a594}{p}} = \frac{p}{m}, \qquad \dot p = -\frac{\partial \textcolor{#d4a017}{H}}{\partial x} = -V'(x) = \textcolor{#f08c2e}{F} $$
- $\textcolor{#d4a017}{H}(x, p)$: the total energy expressed in phase-space coordinates
- the velocity in phase space, $(\dot x, \dot p)$, is always perpendicular to $\nabla H$, which is why it follows the contours
{{< /eq >}}

Hamiltonian flow has a deep property, **Liouville's theorem**: a small blob of initial conditions changes shape as it flows but never changes its area (volume, in many dimensions). This is why the integrators used in molecular dynamics are built to be **symplectic**, preserving phase-space volume exactly, and it is the foundation on which statistical mechanics builds its probabilities.

### Liouville's theorem: an incompressible fluid of states

A picture makes the theorem intuitive. Instead of one particle, imagine a thousand copies of the system started from slightly different positions and momenta: a little cloud of points in phase space. Each point moves with the phase-space velocity $(\dot x, \dot p)$ that Hamilton's equations assign to it, so the cloud is carried along like a drop of dye in a current. Liouville's theorem says that this current is **incompressible**, like water rather than air. The dye can be stretched, sheared and folded, but its area never changes.

{{< eq title="Liouville's theorem" say="The flow of states through phase space has no sources and no sinks, so a cloud of states keeps its area, and its density, as it moves." >}}
$$ \frac{\partial \dot x}{\partial x} + \frac{\partial \dot p}{\partial p} = \frac{\partial^2 \textcolor{#d4a017}{H}}{\partial x\,\partial p} - \frac{\partial^2 \textcolor{#d4a017}{H}}{\partial p\,\partial x} = 0 \quad\Longrightarrow\quad \frac{\mathrm d\textcolor{#e64980}{\rho}}{\mathrm dt} = 0 $$
- the left side is the divergence of the phase-space velocity, the rate at which a small area grows; Hamilton's equations make it vanish identically
- $\textcolor{#e64980}{\rho}(x, p, t)$: the density of the cloud, which stays constant as you ride along with any of its points
- with a friction force $-\gamma v$ the divergence becomes $-\gamma/m$, and areas shrink as $e^{-\gamma t/m}$
{{< /eq >}}

Three consequences run through the rest of this volume. First, a density that depends on position and momentum only through the energy, $\rho = f(H)$, does not change in time at all: every point slides along its own energy contour, and the density it brings is the same as the density it replaces. That is why the equilibrium distributions of statistical mechanics, from the uniform microcanonical one to Boltzmann's $e^{-H/k_BT}$, are all functions of the energy. Second, an incompressible flow has no attractors: a cloud of states cannot shrink onto a point. In a system of many interacting atoms the motion is chaotic, and the cloud is drawn out into ever finer filaments that wind through the whole energy surface, like cream stirred into coffee. Its area is unchanged, yet on any coarse scale it looks evenly spread, and this is how a system obeying reversible laws comes to look as if it has reached equilibrium. Third, friction is exactly what breaks the theorem, which is why the friction slider in the figure turns closed loops into spirals that crowd into the minimum.

The theorem is also why molecular dynamics uses the integrators it does. A numerical method replaces the exact flow by a sequence of finite steps, and nothing guarantees that those steps preserve area. The cell below follows a small disc of 400 initial conditions of a harmonic oscillator for about ten periods with two methods: the explicit Euler method, which updates position and momentum from their old values, and velocity Verlet, the workhorse of [molecular dynamics](../molecular-dynamics/), which splits each step into a half kick, a drift and a half kick.

{{< py title="Euler against velocity Verlet" >}}
import numpy as np
# Harmonic oscillator with m = k = 1: H = (x**2 + p**2)/2, period 2*pi
def euler(x, p, dt):                  # explicit Euler: both updates use old values
    return x + dt * p, p - dt * x
def verlet(x, p, dt):                 # velocity Verlet: half kick, drift, half kick
    p = p - 0.5 * dt * x
    x = x + dt * p
    return x, p - 0.5 * dt * x
def area(x, p):                       # shoelace formula for the polygon of states
    return 0.5 * abs(np.dot(x, np.roll(p, 1)) - np.dot(p, np.roll(x, 1)))
theta = np.linspace(0, 2 * np.pi, 400, endpoint=False)
x0, p0 = 1 + 0.1 * np.cos(theta), 0.1 * np.sin(theta)   # a small disc of states
dt, nsteps = 0.1, 630                                   # about ten periods
for name, step in [("Euler", euler), ("Verlet", verlet)]:
    x, p = x0.copy(), p0.copy()
    for _ in range(nsteps):
        x, p = step(x, p, dt)
    E0, E = 0.5 * (x0**2 + p0**2).mean(), 0.5 * (x**2 + p**2).mean()
    print(f"{name:6s} mean energy {E0:.4f} -> {E:.4f}   "
          f"area of the disc {area(x0, p0):.5f} -> {area(x, p):.5f}")
{{< /py >}}

For this oscillator each Euler step multiplies every area in phase space by exactly $1 + \Delta t^2$, so after 630 steps with $\Delta t = 0.1$ the disc is 528 times larger, and so is its energy: the orbit spirals outwards. Velocity Verlet is **symplectic**. Each of its three sub-steps is a shear of phase space with determinant one, so the area comes back unchanged to the last printed digit, and the mean energy of the disc stays at 0.505.

{{< note type="warn" >}}
A symplectic integrator does not conserve the energy exactly. It conserves a slightly different “shadow” energy, so the total energy in a constant-energy (NVE) run fluctuates around a fixed value, with an amplitude that grows as $\Delta t^2$, but does not drift. A steady drift is therefore a symptom, not a feature of the method. The usual culprits are a time step too long for the fastest vibration, forces that are not the exact derivative of the energy (an abruptly truncated cut-off, or loosely converged electronic structure in ab initio MD), and round-off accumulated in single precision over very long runs.
{{< /note >}}

{{< note type="story" >}}
William Rowan Hamilton published his reformulation of mechanics in two essays in 1834 and 1835, carrying over the mathematics he had developed for light rays in optics. Joseph Liouville proved the volume-preserving property in 1838, in a short note on differential equations. It was Josiah Willard Gibbs, in his *Elementary Principles in Statistical Mechanics* of 1902, who made the theorem the foundation of statistical mechanics, calling it the conservation of “extension in phase”.
{{< /note >}}

{{< note type="fun" >}}
Liouville's theorem has a startling consequence, proved by Henri Poincaré in 1890: an isolated system confined to a finite region of phase space returns, for almost every starting state, arbitrarily close to where it began. A gas that has spread through a box will one day gather itself back into the corner it came from. The catch is the waiting time, which grows exponentially with the number of particles; for any macroscopic sample it exceeds the age of the universe by a factor no ordinary notation can express.
{{< /note >}}

{{< note type="key" >}}
- The state of a classical particle is its position and momentum; Newton's law $\dot p = F$ with $F = -\mathrm dV/\mathrm dx$ determines how that state evolves.
- Without friction the energy $p^2/2m + V(x)$ is conserved, so the motion follows a contour of constant energy in phase space.
- Phase space, $(x, p)$ for one particle and $6N$ dimensions for $N$ atoms, is the stage on which molecular dynamics and statistical mechanics are played.
- Hamiltonian flow is incompressible (Liouville's theorem): a cloud of states keeps its phase-space area. Symplectic integrators such as velocity Verlet inherit this property, which is why their energy fluctuates but does not drift.
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
- q: "A cloud of initial conditions of a frictionless system covers an area A in phase space. What is its area much later?"
  options: ["Larger, because the cloud spreads out", "Exactly A, although the cloud may be stretched and folded into thin filaments", "Smaller, because the trajectories converge"]
  answer: 1
  why: "Liouville's theorem: Hamiltonian flow has zero divergence, so phase-space area (volume, in many dimensions) is conserved."
- q: "The fastest vibration in a flexible molecule is a C–H stretch with a period of about 11 fs. Which time step is a sensible choice?"
  options: ["0.5 to 1 fs", "5 fs", "20 fs"]
  answer: 0
  why: "An integrator needs ten or more steps per period of the fastest motion. Constraining bonds to hydrogen removes that motion and allows about 2 fs."
- q: "You integrate a harmonic oscillator with the explicit Euler method. What happens to its energy?"
  options: ["It stays exactly constant", "It grows steadily, because each step enlarges phase-space areas by a factor $1 + \\Delta t^2$", "It fluctuates without drifting"]
  answer: 1
  why: "Euler is not symplectic. Velocity Verlet preserves area, and its energy fluctuates without drifting."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. L. D. Landau and E. M. Lifshitz, *Mechanics*, 3rd ed., Course of Theoretical Physics vol. 1, Butterworth-Heinemann (1976), chapters 1–2 and 7.
2. J. R. Taylor, *Classical Mechanics*, University Science Books (2005), chapters 1–4 and 13 (Hamiltonian mechanics).
3. H. Goldstein, C. P. Poole and J. L. Safko, *Classical Mechanics*, 3rd ed., Addison-Wesley (2002), chapters 8–9.
4. M. E. Tuckerman, *Statistical Mechanics: Theory and Molecular Simulation*, 2nd ed., Oxford University Press (2023), chapter 1 (classical mechanics, phase space and Liouville's theorem).
5. R. P. Feynman, R. B. Leighton and M. Sands, *The Feynman Lectures on Physics*, vol. I, chapters 9 and 14 (Newton's laws, work and potential energy), free online at feynmanlectures.caltech.edu.
6. J. W. Gibbs, *Elementary Principles in Statistical Mechanics*, Charles Scribner's Sons, New York (1902), chapter 1 (conservation of extension in phase).
7. B. Leimkuhler and S. Reich, *Simulating Hamiltonian Dynamics*, Cambridge University Press (2004): symplectic integrators and shadow Hamiltonians.

</div>
