---
title: "Differentiable simulation"
description: "Treating a whole simulation as a differentiable function: forward- and reverse-mode automatic differentiation through a trajectory, fitting force-field parameters to observables, the adjoint method, reweighting, and why chaos limits it all."
hook: "Nudge σ in a Lennard-Jones simulation and the exact derivative of the outcome can be carried through every time step. Over a short run it fits parameters in a few iterations; over a long, chaotic one the same exact derivative becomes useless."
objectives:
  - "Compare forward- and reverse-mode differentiation through a trajectory by cost and memory"
  - "Implement tangent propagation to fit a Lennard-Jones parameter by gradient descent"
  - "Explain why chaos makes gradients of long trajectories explode, and how to cope"
  - "Estimate the memory of backpropagation through time and the saving from checkpointing"
  - "Write the derivative of an ensemble average as a covariance over Boltzmann samples"
cover: "cover.svg"
milestones:
  - year: 1970
    text: "Seppo Linnainmaa describes reverse-mode differentiation in his Helsinki master's thesis"
  - year: 1990
    text: "Paul Werbos publishes backpropagation through time for networks and dynamical systems"
  - year: 2020
    text: "Samuel Schoenholz and Ekin Cubuk present JAX MD, a framework for differentiable physics"
  - year: 2021
    text: "Thaler and Zavadlav train potentials against experiment by differentiable trajectory reweighting"
track: ai4mat
weight: 2
level: Advanced
minutes: 55
lab: "Differentiate a trajectory and fit σ"
prereqs: ["molecular-dynamics", "neural-networks"]
---

## A simulation is a function

A molecular dynamics run maps parameters to observables. Give it the Lennard-Jones $\sigma$ and $\varepsilon$, partial charges, or the weights of a neural-network potential, and after many integration steps it returns a density, a radial distribution function, a diffusion coefficient. Usually we evaluate that function and compare it with experiment by hand. **Differentiable simulation** also computes its derivatives, $\partial\langle O\rangle/\partial\boldsymbol\theta$, exactly and cheaply, so that parameters can be fitted to observables by gradient descent, just as network weights are fitted to labels ([the gradient-descent lesson](../gradient-descent/)).

What makes this possible is that every step of an MD integrator is a composition of differentiable operations: distances, pair forces, multiplications by $\Delta t$. The chain rule runs straight through all of them.

## Two ways to apply the chain rule

Let the state after step $n$ be $\mathbf s_n = (\mathbf x_n, \mathbf v_n)$, with one integrator step $\mathbf s_{n+1} = \Phi(\mathbf s_n; \theta)$ and an observable $O(\mathbf s_T)$ at the end.

**Forward mode (tangent propagation).** Carry the derivative of the state with respect to the parameter, $\dot{\mathbf s}_n = \partial\mathbf s_n/\partial\theta$, alongside the state itself:

$$
\dot{\mathbf s}_{n+1} = \frac{\partial\Phi}{\partial\mathbf s}\,\dot{\mathbf s}_n + \frac{\partial\Phi}{\partial\theta}, \qquad
\frac{\mathrm dO}{\mathrm d\theta} = \frac{\partial O}{\partial\mathbf s_T}\cdot\dot{\mathbf s}_T .
$$

Every number becomes a pair (value, derivative), a **dual number**, and each operation updates both by the ordinary rules of calculus. The memory cost is constant, but one pass gives the derivative with respect to *one* parameter. The lab below does exactly this, in a few dozen lines of JavaScript.

{{< note type="fun" >}}
Dual numbers were introduced by the mathematician William Kingdon Clifford in 1873. They have the form $a + b\varepsilon$, with a new symbol obeying $\varepsilon^2 = 0$, and their whole usefulness here is one line of Taylor series: $f(x + \varepsilon) = f(x) + f'(x)\,\varepsilon$ exactly, because every higher power of $\varepsilon$ vanishes. Run any program on $\sigma + \varepsilon$ and the coefficient of $\varepsilon$ in the answer is the derivative.
{{< /note >}}

**Reverse mode (backpropagation through time).** Run the trajectory forward, store it, then propagate the sensitivity $\bar{\mathbf s}_n = \partial O/\partial\mathbf s_n$ backwards from the end:

$$
\bar{\mathbf s}_n = \bar{\mathbf s}_{n+1}\,\frac{\partial\Phi}{\partial\mathbf s_n}, \qquad
\frac{\mathrm dO}{\mathrm d\theta} = \sum_n \bar{\mathbf s}_{n+1}\,\frac{\partial\Phi}{\partial\theta}\Big|_{n}.
$$

One backward pass gives the gradient with respect to *all* parameters at once, which is what you need for a neural-network potential with a million weights. The price is memory proportional to the trajectory length (reduced by checkpointing). The continuous-time version is the **adjoint method**, familiar from optimal control and from neural ordinary differential equations.

{{< fig src="modes.svg" alt="Two rows of boxes. Top: states s0 to sT and the observable O, with a parallel row of tangents carried forward. Bottom: the same states, with sensitivities passed backwards from O to s0 and grey arrows showing stored states being read" caption="Forward mode moves the tangent $\dot{\mathbf s}_n$ in step with the state and forgets everything behind it. Reverse mode first records the whole path, then sweeps the sensitivity $\bar{\mathbf s}_n$ from the observable back to the start, reading each stored state on the way." >}}

{{< note type="practice" title="Back of the envelope" >}}
Take a neural-network potential with $10^6$ weights and a differentiable simulation of 1,000 steps that runs in one minute. Forward mode needs one pass per parameter, so one gradient costs $10^6$ minutes, about 1.9 years; central finite differences cost twice that. Reverse mode returns all $10^6$ derivatives from one forward and one backward pass, and the backward pass costs a small constant multiple of the forward one (at most about four or five in the operation count of Griewank and Walther), so the gradient takes a few minutes. The bill arrives as memory instead of time. For a force field with three Lennard-Jones parameters the arithmetic reverses: three forward-mode passes and no stored trajectory.
{{< /note >}}

{{< note type="story" >}}
Reverse-mode differentiation has been discovered more than once. Seppo Linnainmaa described it in his 1970 master's thesis in Helsinki, as a way to compute how rounding errors accumulate through a long calculation. The adjoint equations of optimal control, from Lev Pontryagin's school in the 1950s, are the same idea in continuous time. Paul Werbos applied it to neural networks and dynamical systems, and his 1990 paper *Backpropagation through time: what it does and how to do it* became the standard account of differentiating through many steps of a recurrence, which is exactly what an MD trajectory is.
{{< /note >}}

{{< widget name="diffmd" title="Gradient of a whole trajectory with respect to σ" caption="Seven Lennard-Jones atoms evolve for the chosen number of steps; the observable is the radius of gyration of the final frame. The derivative is propagated through every step (forward mode) and checked against a finite difference. Press Optimise to fit σ to the target. Then switch to energy-conserving MD and lengthen the trajectory." >}}

{{< note type="try" >}}
Start in *Damped relaxation* and press *Optimise*: σ walks steadily downhill along a smooth loss curve towards the target. Then switch to *Energy-conserving MD* and raise the trajectory length from 600 to 1500 steps, then to 4000. Watch the loss curve on the right turn from smooth to jagged and, at the longest lengths, the agreement readout fail. Which number is wrong? Neither: the forward-mode value is the exact slope at that σ, while the finite difference, with its step of 10⁻⁵, now straddles the wiggles of a jagged function.
{{< /note >}}

## What to notice in the lab

- **The derivative is exact.** Forward-mode AD agrees with the finite difference to many digits. It is not an approximation like the finite difference, which needs a carefully chosen step and two extra simulations per parameter.
- **Fitting works.** With damped dynamics (a relaxation) the observable depends smoothly on $\sigma$, the loss is a clean parabola-like curve, and a few gradient steps find the $\sigma$ that gives the target size.
- **Chaos breaks it.** In energy-conserving MD, nearby trajectories separate exponentially, at a rate set by the largest **Lyapunov exponent** $\lambda$: a perturbation grows like $e^{\lambda t}$. So does the derivative. For long trajectories the loss curve becomes rugged and the exact gradient becomes enormous and erratic. It is the correct derivative of *that* trajectory, but useless for optimisation, because what we care about is the *ensemble average*, which is smooth. Metz et al. (2021) analysed this failure of naive gradients through chaotic dynamics in general.

{{< note type="warn" title="Myth" >}}
**Myth:** automatic differentiation is a cleverly organised finite difference. **Reality:** it applies the chain rule to every elementary operation the program performs, so it returns the exact derivative of the function actually computed, up to rounding. A central finite difference carries two errors that pull in opposite directions: truncation, of order $h^2 f'''/6$, and cancellation, of order $\epsilon_{\text{mach}} f/h$ with $\epsilon_{\text{mach}} \approx 2.2\times10^{-16}$ in double precision. Their sum is smallest near $h \approx \epsilon_{\text{mach}}^{1/3} \approx 6\times10^{-6}$, where the relative error is still of order $10^{-10}$. That is why the lab uses $h = 10^{-5}$, and why agreement to about ten digits, not sixteen, is the best a finite-difference check can show.
{{< /note >}}

## Worked example: fitting σ through a short trajectory

The smallest system that shows the whole idea is a Lennard-Jones dimer ($\varepsilon = 1$, two unit masses, so a reduced mass $\mu = \tfrac12$). Start the bond stretched to $r = 1.6$ at rest, and relax it with damped velocity Verlet: time step $\Delta t = 0.01$, friction $\gamma = 3$, 500 steps. The observable is the final bond length $r_T$, and the target property is a bond length of 1.25. A fully relaxed dimer sits at the minimum of the potential, $r_{\min} = 2^{1/6}\sigma$, so we know the answer in advance: $\mathrm dr_T/\mathrm d\sigma \to 2^{1/6} = 1.12246$, and the fitted $\sigma$ should be close to $1.25/2^{1/6}$. That is what makes it a good test.

Forward mode needs one extra line for every line of the integrator. Writing dots for derivatives with respect to $\sigma$, one step of velocity Verlet and its tangent read

$$
\begin{aligned}
v &\leftarrow v + \frac{\Delta t}{2\mu}F(r;\sigma), &\qquad \dot v &\leftarrow \dot v + \frac{\Delta t}{2\mu}\Big(\frac{\partial F}{\partial r}\,\dot r + \frac{\partial F}{\partial\sigma}\Big),\\
r &\leftarrow r + \Delta t\,v, &\qquad \dot r &\leftarrow \dot r + \Delta t\,\dot v,
\end{aligned}
$$

followed by a second half-kick of the same form, after which both $v$ and $\dot v$ are multiplied by the damping factor $e^{-\gamma\Delta t}$. The tangents start at zero, because the initial state does not depend on $\sigma$. The only physics needed beyond the force itself are its two partial derivatives, $\partial F/\partial r$ and $\partial F/\partial\sigma$, which for Lennard-Jones are one line each.

{{< py title="forward-mode fit of a Lennard-Jones parameter" >}}
import numpy as np
def force(r, s):              # F = -dV/dr for V = 4(s¹²/r¹² − s⁶/r⁶), with ∂F/∂r and ∂F/∂s
    a, b = s**12 / r**13, s**6 / r**7
    return 24 * (2*a - b), 24 * (7*b - 26*a) / r, 24 * (24*a - 6*b) / s
def run(s, steps=500, dt=0.01, gamma=3.0, mu=0.5):
    """Damped velocity Verlet for an LJ dimer; (dr, dv) carry d(state)/dσ alongside (r, v)."""
    r, v, dr, dv, damp = 1.6, 0.0, 0.0, 0.0, np.exp(-gamma * dt)
    F, Fr, Fs = force(r, s)
    for _ in range(steps):
        v, dv = v + 0.5*dt*F/mu, dv + 0.5*dt*(Fr*dr + Fs)/mu
        r, dr = r + dt*v, dr + dt*dv
        F, Fr, Fs = force(r, s)
        v, dv = damp * (v + 0.5*dt*F/mu), damp * (dv + 0.5*dt*(Fr*dr + Fs)/mu)
    return r, dr
r, g = run(1.0)
fd = (run(1.0 + 1e-6)[0] - run(1.0 - 1e-6)[0]) / 2e-6
print(f"σ = 1: final bond {r:.6f}, dr/dσ forward mode {g:.6f}, finite difference {fd:.6f}")
s, target = 1.0, 1.25
for it in range(8):
    r, g = run(s)
    print(f"step {it}: σ = {s:.6f}  bond = {r:.6f}  loss = {(r - target)**2:.2e}  gradient = {2*(r - target)*g:+.4f}")
    s -= 0.3 * 2 * (r - target) * g
print(f"fitted σ = {s:.6f}; a fully relaxed dimer would need target / 2^(1/6) = {target / 2**(1/6):.6f}")
{{< /py >}}

```text
σ = 1: final bond 1.122576, dr/dσ forward mode 1.123164, finite difference 1.123164
step 0: σ = 1.000000  bond = 1.122576  loss = 1.62e-02  gradient = -0.2862
step 1: σ = 1.085871  bond = 1.218996  loss = 9.61e-04  gradient = -0.0696
step 2: σ = 1.106738  bond = 1.242394  loss = 5.79e-05  gradient = -0.0171
step 3: σ = 1.111853  bond = 1.248128  loss = 3.51e-06  gradient = -0.0042
step 4: σ = 1.113112  bond = 1.249539  loss = 2.13e-07  gradient = -0.0010
step 5: σ = 1.113423  bond = 1.249886  loss = 1.29e-08  gradient = -0.0003
step 6: σ = 1.113499  bond = 1.249972  loss = 7.84e-10  gradient = -0.0001
step 7: σ = 1.113518  bond = 1.249993  loss = 4.76e-11  gradient = -0.0000
fitted σ = 1.113523; a fully relaxed dimer would need target / 2^(1/6) = 1.113623
```

Read it step by step. At $\sigma = 1$ the dimer ends at 1.122576, a hair above $2^{1/6} = 1.122462$ because 500 damped steps have not quite killed the vibration, and the derivative carried through all 500 steps is 1.123164, matching the central finite difference to every printed digit and close to the expected $2^{1/6}$. The loss is $(r_T - 1.25)^2$ and its gradient is $2(r_T - 1.25)\,\mathrm dr_T/\mathrm d\sigma = 2 \times (-0.1274) \times 1.1232 = -0.2862$, so a step with learning rate 0.3 raises $\sigma$ by 0.0859. Each step then shrinks the error by a factor of about $1 - 0.6\,(\mathrm dr_T/\mathrm d\sigma)^2 \approx 0.24$, so the loss falls by a factor of about 17 per step, exactly as the column shows.

{{< fig src="dimer.svg" alt="Left top: the bond length of a damped Lennard-Jones dimer relaxing from 1.6 to 1.1226 over 500 steps. Left bottom: the tangent dr/dσ swinging between minus 2.6 and 3.4 before settling at 1.1232. Right: the loss on a logarithmic axis falling in a straight line over eight gradient-descent iterations" caption="The tangent swings far more than the bond: near step 110 a small change in $\sigma$ shifts the phase of the vibration, so $\mathrm dr/\mathrm d\sigma$ reaches 3.4 while $r$ itself moves little. Once damping has removed the vibration both curves settle near $2^{1/6}$, and the fit converges linearly, about 17-fold per iteration." >}}

The last line holds the most useful lesson. The fitted $\sigma = 1.113523$ differs from the relaxed-dimer answer, 1.113623, by $10^{-4}$. That is not a bug: the gradient is exact for the simulation actually run, in which the dimer has not completely relaxed after 500 steps. Gradient-based fitting optimises the protocol you wrote down, including its length, time step and thermostat, not the physics you had in mind. Fitting to a property computed from too short a run builds the shortness into the parameters.

### A shortcut for relaxed structures: implicit differentiation

When the protocol is a relaxation to a minimum, the derivative of the end point can be had without differentiating the trajectory at all. A relaxed structure satisfies $\nabla_{\mathbf x} U(\mathbf x^*;\theta) = \mathbf 0$. Differentiating that condition with respect to $\theta$ (the implicit function theorem) gives

$$
\frac{\mathrm d\mathbf x^*}{\mathrm d\theta} = -\mathbf H^{-1}\,\frac{\partial^2 U}{\partial\mathbf x\,\partial\theta},
$$

with $\mathbf H$ the Hessian at the minimum. For the dimer, $V$ depends on $r$ only through $r/\sigma$, and the formula gives $\mathrm dr^*/\mathrm d\sigma = r^*/\sigma = 2^{1/6} = 1.122462$ exactly: the limit that the 500-step tangent, 1.123164, was approaching but had not reached. Fitting with this derivative lands on $\sigma = 1.25/2^{1/6} = 1.113623$, the fully relaxed answer. For a crystal with thousands of atoms the Hessian is never inverted. The linear system $\mathbf H\mathbf u = \mathbf b$ is solved by conjugate gradients, which needs only Hessian-vector products, and automatic differentiation supplies each one for a small multiple of the cost of one force evaluation. The memory is that of a single structure, however many optimiser steps it took to find it. The same algebra gives derivatives of relaxed lattice constants, defect geometries and elastic constants with respect to force-field parameters. It breaks down where the minimum is not unique or the Hessian is nearly singular, for example along a soft phonon mode near a displacive phase transition, where $\mathrm d\mathbf x^*/\mathrm d\theta$ really does diverge.

## Why long trajectories are hard

The dimer is the friendly case: one degree of freedom, strong damping and an observable that relaxes to a fixed point. Production problems differ in three ways, each of which gets worse as the trajectory grows.

**Exploding gradients.** In chaotic dynamics the tangent $\dot{\mathbf s}_n$ grows like $e^{\lambda t}$, and so does the gradient. To see what that means, suppose $\lambda = 1$ per unit of time, an illustrative value. After 10 time units the amplification is $e^{10} \approx 2\times10^{4}$; after 50 it is $e^{50} \approx 5\times10^{21}$; and single-precision numbers, whose largest value is about $3.4\times10^{38}$, overflow once $\lambda t$ passes about 88. Long before overflow, the gradient has stopped being informative. The usual remedies are to differentiate only through short windows (**truncated backpropagation**), to clip gradients, to average gradients over many short trajectories from different starting points, or to avoid differentiating the trajectory at all, as the next section explains.

{{< note type="try" title="Pause and predict" >}}
For a seven-atom cluster like the lab's, run with energy-conserving MD at $\sigma = 1.2$ and $\Delta t = 0.005$, the tangent grows at a rate between 1.1 and 1.5 per reduced time unit once the motion turns chaotic. Before looking at the figure below, estimate after how many steps a single-precision gradient overflows. With $\lambda \approx 1.3$, overflow needs $\lambda t \approx 88$, so $t \approx 68$ time units, about 13,500 steps. In the five computed trajectories, four cross $3.4\times10^{38}$ between 12,900 and 15,500 steps; the fifth, with the smallest rate, has not crossed by 16,000.
{{< /note >}}

**Memory.** Reverse mode must keep, or be able to recompute, every intermediate state. For 10,000 atoms, positions and velocities in double precision take $10^4 \times 6 \times 8$ bytes = 480 kB per step, so 100,000 steps need 48 GB, before counting the intermediate values of the potential at every step, which for a neural-network potential usually dominate. **Checkpointing** stores only every $k$-th state and recomputes the steps in between during the backward pass. The memory then scales as $T/k + k$ states, smallest at $k = \sqrt T$: for $T = 100{,}000$ steps, about 630 stored states instead of 100,000, roughly 300 MB in the example, for the price of one extra forward pass. Griewank's binomial checkpointing (1992) reduces the memory further, to a logarithmic growth, at a modest additional cost. It is tempting to avoid storage altogether by running the time-reversible Verlet integrator backwards, but in floating point a chaotic trajectory run backwards amplifies its own rounding errors at the same rate $e^{\lambda t}$, so this works only for short runs. Levesque and Verlet (1993) showed that an integrator written in integer arithmetic can be reversed bit for bit, but damping or a thermostat destroys reversibility anyway.

{{< fig src="chaos.svg" alt="Left: size of the tangent against integration step on a logarithmic axis; five energy-conserving trajectories rise in near-straight lines from about 1 to above 10 to the 40, crossing the single-precision limit, while damped trajectories stay near 3. Right: states held in memory against checkpoint interval, a V-shaped curve with its minimum of 632 states at k = 316" caption="Left: after a slow start over the first thousand or so steps, the tangent of every energy-conserving run grows exponentially, while damping holds it near 3. Right: a checkpoint every $k$ steps holds $T/k + k$ states, fewest at $k = \sqrt T$; for $T$ = 100,000 that is 632 states instead of 100,000." >}}

**Chaos and what the derivative means.** Picture a pinball machine. Over the first few centimetres, before the ball meets a bumper, its position depends smoothly on the launch speed. After a dozen bumpers, the final score jumps whenever the launch speed changes in the fifth decimal place: the derivative exists almost everywhere and is worthless. Yet the *average* score over many launches varies smoothly with the launch speed. A long MD trajectory is the pinball, and the equilibrium property we want is the average. The exact derivative of a single long trajectory answers a question nobody asked.

{{< note type="warn" title="Common mistakes in differentiable simulation" >}}
- **Forgetting that the force is a gradient.** In PyTorch, computing forces without `create_graph=True` cuts the path from the parameters through the forces into the dynamics. The code runs, and the gradient is silently wrong.
- **Re-seeding a stochastic thermostat.** A Langevin trajectory is a differentiable function of the parameters only if its random numbers are held fixed. A finite-difference check whose two runs use different noise compares two unrelated trajectories.
- **Wrapping coordinates inside the differentiated loop.** Putting atoms back into the box makes positions jump by a box length. Keep unwrapped positions and apply the minimum-image convention to distances only.
- **Fitting the endpoint of one long chaotic run.** The gradient is exact and useless. Shorten the window, average over trajectories, or reweight.
{{< /note >}}

## Differentiating ensemble averages properly

Since equilibrium observables are averages over the Boltzmann distribution, $\langle O\rangle_\theta = \int O(\mathbf x)\,e^{-\beta U_\theta(\mathbf x)}\,\mathrm d\mathbf x / Z_\theta$, their derivative can be written without differentiating any trajectory:

$$
\frac{\partial\langle O\rangle_\theta}{\partial\theta} = -\beta\left(\Big\langle O\,\frac{\partial U_\theta}{\partial\theta}\Big\rangle - \langle O\rangle\Big\langle\frac{\partial U_\theta}{\partial\theta}\Big\rangle\right),
$$

a covariance between the observable and the parameter derivative of the energy, evaluated on ordinary samples. Equivalently, **reweighting** estimates the average at nearby parameters from samples taken at $\theta$ with weights $w \propto e^{-\beta(U_{\theta'} - U_\theta)}$. **Differentiable trajectory reweighting** (Thaler and Zavadlav, 2021) uses this to train neural-network potentials directly against experimental observables such as radial distribution functions and pressures, avoiding backpropagation through long trajectories altogether. Short-trajectory differentiation remains useful for dynamical and non-equilibrium targets, such as transport over short times, relaxed geometries and controlled assembly protocols.

### Worked example: a harmonic spring

Take one coordinate in a harmonic well, $U = \tfrac12 k x^2$, and the observable $O = x^2$. Equipartition gives $\langle x^2\rangle = k_BT/k$, so the exact derivative is $-k_BT/k^2$. The covariance formula reaches the same answer from samples alone: $\partial U/\partial k = x^2/2$, and for a Gaussian of variance $s^2 = k_BT/k$, $\langle x^4\rangle = 3s^4$, so $\mathrm{cov}(x^2, x^2/2) = \tfrac12(3s^4 - s^4) = s^4$ and $-\beta s^4 = -k_BT/k^2$. The cell checks this on samples, then reweights the same samples to a stiffer spring, first for one coordinate and then for 300 independent ones, closer to the size of a real simulation box.

{{< py title="covariance gradient and reweighting" >}}
import numpy as np
rng = np.random.default_rng(1)
kT, k, M = 1.0, 2.0, 20000                       # thermal energy, spring constant, samples
for n in (1, 300):                               # one oscillator, then 300 independent ones
    x = rng.normal(0, np.sqrt(kT / k), (M, n))   # Boltzmann samples of U = k Σ x²/2
    O, dU = (x**2).mean(1), 0.5 * (x**2).sum(1)  # observable (mean x²) and ∂U/∂k
    grad = -(np.mean(O * dU) - O.mean() * dU.mean()) / kT
    print(f"n = {n}: d<x²>/dk from the covariance {grad:+.4f} (exact {-kT / k**2:+.4f})")
    for dk in (0.1, 0.5):                        # reuse the same samples at k + dk
        logw = -dk * dU / kT
        w = np.exp(logw - logw.max()); w /= w.sum()
        print(f"   reweighted to k = {k + dk}: <x²> = {np.sum(w * O):.4f} (exact {kT / (k + dk):.4f}),"
              f" effective samples {1 / np.sum(w**2) / M:.2%}")
{{< /py >}}

```text
n = 1: d<x²>/dk from the covariance -0.2448 (exact -0.2500)
   reweighted to k = 2.1: <x²> = 0.4708 (exact 0.4762), effective samples 99.89%
   reweighted to k = 2.5: <x²> = 0.3962 (exact 0.4000), effective samples 98.02%
n = 300: d<x²>/dk from the covariance -0.2479 (exact -0.2500)
   reweighted to k = 2.1: <x²> = 0.4763 (exact 0.4762), effective samples 71.73%
   reweighted to k = 2.5: <x²> = 0.4106 (exact 0.4000), effective samples 1.33%
```

The covariance estimates, −0.2448 and −0.2479, are within about 2 per cent of the exact −0.25 for both system sizes. Reweighting behaves very differently. For one oscillator, a 25 per cent stiffer spring keeps 98 per cent of the samples effective. For 300 coordinates the same change leaves 1.3 per cent, and the reweighted average, 0.4106, misses the exact 0.4000 by 2.6 per cent. For $n$ independent coordinates the effective fraction is $\big[(1+2\delta)^{1/2}/(1+\delta)\big]^n$ with $\delta = \Delta k/k$, which predicts 71 per cent for the 5 per cent change, as measured, and only 0.2 per cent for the 25 per cent change: with 20,000 samples even the estimate of 1.3 per cent is unreliable, a typical symptom of degenerate weights. The fraction falls exponentially with system size. Reweighting is Zwanzig's [free-energy perturbation](../es-fep-ti/) in another guise and fails in the same way, when the old and new parameters share too little of configuration space. Differentiable trajectory reweighting therefore re-runs the reference simulation whenever the effective sample size drops below a threshold, so each simulation serves only the few parameter updates for which its weights stay healthy.

## What it is used for

- **Force-field parameterisation**: fitting Lennard-Jones parameters, charges or torsions to densities, enthalpies, RDFs and other experimental data (DMFF, OpenMM-based tools, JAX MD).
- **Training potentials on experiment**: combining DFT labels with experimental observables, so that the potential corrects systematic DFT errors.
- **Coarse-grained models**: learning effective potentials that reproduce the structure of a fine-grained simulation.
- **Inverse design**: optimising interaction parameters (for example, the DNA sequences controlling nanoparticle binding, or a surface pattern) so that a system self-assembles into a target structure. The same gradient that fits a parameter to data can steer a design towards a goal.
- **Structure relaxation and differentiable physics pipelines**: geometry optimisations, elastic constants and phonons as differentiable functions of model parameters.

{{< note type="practice" title="From the lab" >}}
A reweighting fit of a coarse-grained water model to a target radial distribution function runs in five steps. (1) Simulate at the current parameters $\theta_0$ and store about 1,000 decorrelated frames. (2) For trial parameters $\theta$, compute the weights $w_i \propto e^{-\beta[U_\theta(\mathbf x_i) - U_{\theta_0}(\mathbf x_i)]}$ and the reweighted RDF, which is a weighted histogram. (3) Take the loss as the squared difference from the target summed over bins, and its gradient by automatic differentiation through the weights, which evaluates the covariance formula numerically. (4) Update $\theta$ with Adam. (5) When the effective sample size $1/\sum_i w_i^2$ of the normalised weights falls below a set fraction of the frames, simulate again at the new $\theta$. Thaler and Zavadlav demonstrated this scheme on a coarse-grained water model fitted to structural targets and on an atomistic diamond model fitted to its stress and elastic constants. No gradient passes through the integrator.
{{< /note >}}

## In practice

Reverse-mode differentiation through 400 steps of damped velocity Verlet in PyTorch, checked against finite differences and then used to fit σ, mirrors the lab:

```python
import torch
torch.set_default_dtype(torch.float64)

def energy(pos, sigma):                        # Lennard-Jones cluster, epsilon = 1
    iu = torch.triu_indices(len(pos), len(pos), 1)
    r = (pos[iu[0]] - pos[iu[1]]).norm(dim=-1)
    return torch.sum(4 * ((sigma / r) ** 12 - (sigma / r) ** 6))

def forces(x, sigma):                          # F = -dE/dx, kept in the graph (create_graph)
    if not x.requires_grad:
        x = x.requires_grad_()
    return -torch.autograd.grad(energy(x, sigma), x, create_graph=True)[0]

def simulate(sigma, x0, v0, steps=400, dt=0.005, gamma=3.0):
    """Damped velocity Verlet; every operation is recorded for reverse-mode autodiff."""
    x, v = x0 * sigma, v0.clone()              # start from a configuration scaled by sigma
    f = forces(x, sigma)
    damp = torch.exp(torch.tensor(-gamma * dt))
    for _ in range(steps):
        v = v + 0.5 * dt * f
        x = x + dt * v
        f = forces(x, sigma)
        v = (v + 0.5 * dt * f) * damp
    c = x.mean(0)
    return torch.sqrt(((x - c) ** 2).sum(-1).mean())      # radius of gyration

torch.manual_seed(0)
angles = torch.arange(6) * torch.pi / 3
ring = 1.15 * torch.stack([torch.cos(angles), torch.sin(angles)], dim=1)
x0 = torch.cat([torch.zeros(1, 2), ring]) + 0.05 * torch.randn(7, 2)   # a 7-atom cluster
v0 = 0.3 * torch.randn(7, 2)

sigma = torch.tensor(1.2, requires_grad=True)
rg = simulate(sigma, x0, v0)
(drg,) = torch.autograd.grad(rg, sigma)        # backpropagate through all 400 steps
h = 1e-5
fd = (simulate(torch.tensor(1.2 + h), x0, v0) - simulate(torch.tensor(1.2 - h), x0, v0)) / (2 * h)
print(f"Rg = {rg.item():.6f}")
print(f"dRg/dsigma: autodiff {drg.item():.6f}, finite difference {fd.item():.6f}")

target = 1.0                                    # fit sigma so that the relaxed cluster has Rg = 1
for it in range(30):
    loss = (simulate(sigma, x0, v0) - target) ** 2
    (g,) = torch.autograd.grad(loss, sigma)
    with torch.no_grad():
        sigma -= 0.5 * g
print(f"fitted sigma = {sigma.item():.4f}, Rg = {simulate(sigma, x0, v0).item():.4f}")
```

```text
Rg = 1.243806
dRg/dsigma: autodiff 1.057133, finite difference 1.057133
fitted sigma = 0.9652, Rg = 1.0000
```

Note the `create_graph=True` when computing the forces: the force is itself a gradient, and the outer gradient must flow through it. JAX MD expresses the same idea more compactly with `jax.grad` around a simulation loop, and TorchMD provides differentiable MD for neural-network potentials in PyTorch.

{{< note type="practice" title="Rules of thumb" >}}
- **Check before you trust.** Compare the automatic derivative with a central finite difference on a short trajectory in double precision, as the lab and the worked example do. Agreement to many digits means the code is right; it says nothing yet about whether the gradient is useful.
- **Keep windows short.** Differentiate through hundreds to a few thousand steps, not through a whole production run. In the lab, energy-conserving trajectories turn rugged somewhere between 600 and 1500 steps.
- **Save memory deliberately.** Use forward mode for a handful of parameters; for many parameters use reverse mode with checkpointing (`jax.checkpoint` in JAX, `torch.utils.checkpoint` in PyTorch).
- **Reweight for equilibrium targets.** Densities, radial distribution functions and pressures are ensemble averages: differentiate them with the covariance formula or with differentiable trajectory reweighting rather than through the dynamics.
{{< /note >}}

{{< note type="key" >}}
- A simulation is a differentiable function from parameters to observables; automatic differentiation gives exact derivatives of the trajectory actually computed.
- Forward mode carries tangents alongside the state at constant memory, one parameter per pass; reverse mode gives all parameter gradients in one backward pass, at a memory cost reduced by checkpointing.
- Through a short, damped trajectory the gradient fits parameters in a few steps, but it optimises the protocol as written, including its length and thermostat.
- In chaotic dynamics derivatives grow like $e^{\lambda t}$: exact, erratic and useless for long runs. Use short windows, averages over trajectories, or reweighting.
- For a relaxed structure, implicit differentiation gives $\mathrm d\mathbf x^*/\mathrm d\theta = -\mathbf H^{-1}\,\partial^2U/\partial\mathbf x\,\partial\theta$ without storing any trajectory.
- Equilibrium averages have derivatives $-\beta\,\mathrm{cov}(O, \partial U/\partial\theta)$ computable from ordinary samples, the basis of training potentials against experiment.
{{< /note >}}

{{< quiz >}}
- q: "When is forward-mode differentiation (dual numbers) the better choice over reverse mode?"
  options: ["When there are millions of parameters", "When there are only a few parameters and memory for storing the trajectory is limited", "Never; reverse mode is always better"]
  answer: 1
  why: "Forward mode costs one pass per parameter but needs no stored trajectory. Reverse mode gives all parameter gradients in one backward pass but must store (or recompute) the forward trajectory."
- q: "Why does the gradient of an observable taken at the end of a long, energy-conserving MD trajectory become huge and erratic?"
  options: ["Because of rounding errors in the integrator", "Because MD is chaotic: small parameter changes are amplified exponentially along the trajectory, and the exact derivative inherits that growth", "Because forces are not differentiable"]
  answer: 1
  why: "Sensitivity to perturbations grows like $e^{\\lambda t}$ with the Lyapunov exponent λ. The derivative of a single long chaotic trajectory is correct but not informative about the smooth ensemble average."
- q: "How can the derivative of an equilibrium average be obtained without differentiating through the trajectory?"
  options: ["It cannot", "As a covariance between the observable and $\\partial U/\\partial\\theta$ over Boltzmann samples, or equivalently by reweighting", "By finite differences only"]
  answer: 1
  why: "Differentiating the Boltzmann average gives $-\\beta\\,\\mathrm{cov}(O, \\partial U/\\partial\\theta)$. This underlies reweighting-based training of potentials against experimental data."
- q: "In the worked example, the fitted σ differs from the relaxed-dimer answer, target divided by $2^{1/6}$, by $10^{-4}$. Why?"
  options: ["Forward-mode differentiation is only approximate", "Rounding error in the finite-difference check", "The gradient is exact for the simulation actually run, in which the dimer has not fully relaxed after 500 steps"]
  answer: 2
  why: "Gradient-based fitting optimises the protocol as written. A slightly unrelaxed final bond length is part of that protocol, so the fitted parameter absorbs it."
- q: "Reverse-mode differentiation through $T$ steps with checkpoints every $\\sqrt T$ steps stores about how many states?"
  options: ["$T$", "About $2\\sqrt T$, for the price of roughly one extra forward pass", "One"]
  answer: 1
  why: "It keeps $T/k$ checkpoints plus the $k$ states of the segment being recomputed; with $k = \\sqrt T$ that is about $2\\sqrt T$, or about 630 states for 100,000 steps."
- q: "Why does a single-precision gradient through a long chaotic trajectory eventually overflow?"
  options: ["Because the tangent grows like $e^{\\lambda t}$, and single precision cannot represent numbers above about $3.4\\times10^{38}$", "Because the forces become infinite", "Because the time step is too small"]
  answer: 0
  why: "Overflow comes once $\\lambda t$ passes about 88. Long before that, the gradient has stopped carrying useful information about the ensemble average."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. S. S. Schoenholz and E. D. Cubuk, “JAX MD: a framework for differentiable physics,” *Advances in Neural Information Processing Systems* **33** (2020).
2. S. Doerr, M. Majewski, A. Pérez, A. Krämer, C. Clementi, F. Noé, T. Giorgino and G. De Fabritiis, “TorchMD: a deep learning framework for molecular simulations,” *Journal of Chemical Theory and Computation* **17**, 2355–2363 (2021).
3. S. Thaler and J. Zavadlav, “Learning neural network potentials from experimental data via Differentiable Trajectory Reweighting,” *Nature Communications* **12**, 6884 (2021).
4. J. G. Greener and D. T. Jones, “Differentiable molecular simulation can learn all the parameters in a coarse-grained force field for proteins,” *PLoS ONE* **16**, e0256990 (2021).
5. X. Wang et al., “DMFF: an open-source automatic differentiable platform for molecular force field development and molecular dynamics simulation,” *Journal of Chemical Theory and Computation* **19**, 5897–5909 (2023).
6. L. Metz, C. D. Freeman, S. S. Schoenholz and T. Kachman, “Gradients are not all you need,” arXiv:2111.05803 (2021).
7. R. T. Q. Chen, Y. Rubanova, J. Bettencourt and D. Duvenaud, “Neural ordinary differential equations,” *Advances in Neural Information Processing Systems* **31** (2018).
8. A. G. Baydin, B. A. Pearlmutter, A. A. Radul and J. M. Siskind, “Automatic differentiation in machine learning: a survey,” *Journal of Machine Learning Research* **18**(153), 1–43 (2018).
9. A. Griewank and A. Walther, *Evaluating Derivatives: Principles and Techniques of Algorithmic Differentiation*, 2nd ed., SIAM (2008).
10. M. Z. Miskin, G. Khaira, J. J. de Pablo and H. M. Jaeger, “Turning statistical physics models into materials design engines,” *Proceedings of the National Academy of Sciences* **113**, 34–39 (2016).
11. P. J. Werbos, “Backpropagation through time: what it does and how to do it,” *Proceedings of the IEEE* **78**, 1550–1560 (1990).
12. A. Griewank, “Achieving logarithmic growth of temporal and spatial complexity in reverse automatic differentiation,” *Optimization Methods and Software* **1**, 35–54 (1992).
13. T. Chen, B. Xu, C. Zhang and C. Guestrin, “Training deep nets with sublinear memory cost,” arXiv:1604.06174 (2016).

</div>
