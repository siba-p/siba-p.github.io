---
title: "Differentiable molecular dynamics"
description: "Treating a whole simulation as a differentiable function: forward- and reverse-mode automatic differentiation through a trajectory, fitting force-field parameters to observables, the adjoint method, reweighting, and why chaos limits it all."
track: ai4mat
weight: 3
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

**Reverse mode (backpropagation through time).** Run the trajectory forward, store it, then propagate the sensitivity $\bar{\mathbf s}_n = \partial O/\partial\mathbf s_n$ backwards from the end:

$$
\bar{\mathbf s}_n = \bar{\mathbf s}_{n+1}\,\frac{\partial\Phi}{\partial\mathbf s_n}, \qquad
\frac{\mathrm dO}{\mathrm d\theta} = \sum_n \bar{\mathbf s}_{n+1}\,\frac{\partial\Phi}{\partial\theta}\Big|_{n}.
$$

One backward pass gives the gradient with respect to *all* parameters at once, which is what you need for a neural-network potential with a million weights. The price is memory proportional to the trajectory length (reduced by checkpointing). The continuous-time version is the **adjoint method**, familiar from optimal control and from neural ordinary differential equations.

{{< widget name="diffmd" title="Gradient of a whole trajectory with respect to σ" caption="Seven Lennard-Jones atoms evolve for the chosen number of steps; the observable is the radius of gyration of the final frame. The derivative is propagated through every step (forward mode) and checked against a finite difference. Press Optimise to fit σ to the target. Then switch to energy-conserving MD and lengthen the trajectory." >}}

## What to notice in the lab

- **The derivative is exact.** Forward-mode AD agrees with the finite difference to many digits. It is not an approximation like the finite difference, which needs a carefully chosen step and two extra simulations per parameter.
- **Fitting works.** With damped dynamics (a relaxation) the observable depends smoothly on $\sigma$, the loss is a clean parabola-like curve, and a few gradient steps find the $\sigma$ that gives the target size.
- **Chaos breaks it.** In energy-conserving MD, nearby trajectories separate exponentially, at a rate set by the largest **Lyapunov exponent** $\lambda$: a perturbation grows like $e^{\lambda t}$. So does the derivative. For long trajectories the loss curve becomes rugged and the exact gradient becomes enormous and erratic. It is the correct derivative of *that* trajectory, but useless for optimisation, because what we care about is the *ensemble average*, which is smooth. Metz et al. (2021) analysed this failure of naive gradients through chaotic dynamics in general.

## Differentiating ensemble averages properly

Since equilibrium observables are averages over the Boltzmann distribution, $\langle O\rangle_\theta = \int O(\mathbf x)\,e^{-\beta U_\theta(\mathbf x)}\,\mathrm d\mathbf x / Z_\theta$, their derivative can be written without differentiating any trajectory:

$$
\frac{\partial\langle O\rangle_\theta}{\partial\theta} = -\beta\left(\Big\langle O\,\frac{\partial U_\theta}{\partial\theta}\Big\rangle - \langle O\rangle\Big\langle\frac{\partial U_\theta}{\partial\theta}\Big\rangle\right),
$$

a covariance between the observable and the parameter derivative of the energy, evaluated on ordinary samples. Equivalently, **reweighting** estimates the average at nearby parameters from samples taken at $\theta$ with weights $w \propto e^{-\beta(U_{\theta'} - U_\theta)}$. **Differentiable trajectory reweighting** (Thaler and Zavadlav, 2021) uses this to train neural-network potentials directly against experimental observables such as radial distribution functions and pressures, avoiding backpropagation through long trajectories altogether. Short-trajectory differentiation remains useful for dynamical and non-equilibrium targets, such as transport over short times, relaxed geometries and controlled assembly protocols.

## What it is used for

- **Force-field parameterisation**: fitting Lennard-Jones parameters, charges or torsions to densities, enthalpies, RDFs and other experimental data (DMFF, OpenMM-based tools, JAX MD).
- **Training potentials on experiment**: combining DFT labels with experimental observables, so that the potential corrects systematic DFT errors.
- **Coarse-grained models**: learning effective potentials that reproduce the structure of a fine-grained simulation.
- **Inverse design**: optimising interaction parameters (for example, the DNA sequences controlling nanoparticle binding, or a surface pattern) so that a system self-assembles into a target structure. The same gradient that fits a parameter to data can steer a design towards a goal.
- **Structure relaxation and differentiable physics pipelines**: geometry optimisations, elastic constants and phonons as differentiable functions of model parameters.

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

</div>
