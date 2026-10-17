---
title: "Fluctuations and response"
description: "Why thermodynamic quantities fluctuate, how large the fluctuations are, and what they measure: energy fluctuations and the heat capacity, the 1/√N law and the thermodynamic limit, density fluctuations and compressibility, volume and enthalpy fluctuations at constant pressure, the fluctuation–dissipation theorem and linear response, and what all this means for simulations of small systems."
track: statmech
weight: 4
level: Core
prereqs: ["ensembles-and-free-energy"]
lab: "Sample energy and particle-number fluctuations and recover the heat capacity and compressibility from them"
---

## Averages are not the whole story

Thermodynamics treats the energy of a beaker of water in a thermostat, or the number of molecules in a cubic millimetre of air, as definite numbers. Statistical mechanics says they are not. A system in contact with a heat bath constantly exchanges energy with it, so its energy fluctuates about its average; a region of a gas constantly exchanges molecules with its surroundings, so the number inside it fluctuates too. For a macroscopic sample these fluctuations are far too small to notice, which is why thermodynamics works. For the systems studied in molecular simulation, a few thousand atoms, and for the nanoparticles, single molecules and small droplets of modern experiments, they are large enough to see and to matter.

Fluctuations are not merely noise. Their size is fixed by the same statistical mechanics that fixes the averages, and it turns out to be directly related to how the system **responds** when it is disturbed. The heat capacity, the compressibility and the magnetic susceptibility can all be written as the size of a spontaneous fluctuation. This is one of the most useful results in statistical physics, because it means that response functions can be computed from an equilibrium simulation simply by recording the fluctuations, without ever disturbing the system.

## Energy fluctuations and the heat capacity

In the canonical ensemble, the mean energy is $U = -\partial \ln Z/\partial\beta$, as [the topic on ensembles](../ensembles-and-free-energy/) showed. Differentiating once more with respect to $\beta$ gives the variance of the energy, and since $\partial/\partial\beta = -k_BT^2\,\partial/\partial T$, the variance is proportional to the temperature derivative of the energy, which is the heat capacity:

{{< eq title="Heat capacity from energy fluctuations" say="A system that can soak up heat is one whose energy wanders: both need accessible states at nearby energies." >}}
$$ \langle (\delta E)^2 \rangle = \langle E^2\rangle - \langle E\rangle^2 = \frac{\partial^2 \ln Z}{\partial\beta^2} = k_B T^2\,\textcolor{#e64980}{C_V} $$
- $\delta E = E - \langle E\rangle$: the deviation from the mean
- the left side is measured in an equilibrium simulation at one temperature; the right side is a response to changing the temperature
{{< /eq >}}

The figure below samples the total energy of $N$ independent two-level units, each with an excited level at energy $\Delta$, in contact with a heat bath. Each unit is excited with probability $p = 1/(1 + e^{\Delta/k_BT})$, so the number of excited units fluctuates from moment to moment. The readout computes the heat capacity from nothing but the variance of the sampled energies and compares it with the exact result. Change the temperature: the fluctuations, and the heat capacity, are largest at intermediate temperatures where the units are most uncertain about their state, the Schottky peak seen in the ensembles topic.

{{< widget name="fluct" title="Fluctuations shrink as 1/√N, and measure the response" caption="Left: the system. Right: the distribution of the fluctuating quantity divided by its mean, on a fixed axis, with the Gaussian predicted by theory. Increase N from 10 to 10 000 and watch the distribution narrow; the readout recovers the heat capacity (or the compressibility) from the sampled variance alone." >}}

The formula also explains why heat capacities are always positive: a variance cannot be negative. A system with a negative heat capacity would heat up when it lost energy, which cannot happen in a stable system in contact with a bath. (Isolated, self-gravitating systems such as stars can have negative heat capacities, and small isolated clusters near a melting transition can show them in the microcanonical ensemble, a reminder that the equivalence of ensembles holds only for large systems.)

## The thermodynamic limit

How large are these fluctuations? For $N$ independent units, the energies add, and so do the variances ([the topic on probability](../probability/)), so the mean grows as $N$ and the standard deviation as $\sqrt N$. The **relative** fluctuation therefore shrinks:

{{< eq title="Relative fluctuations" say="The bigger the system, the less its total wanders compared with its size." >}}
$$ \frac{\sqrt{\langle(\delta E)^2\rangle}}{\langle E\rangle} = \frac{\sqrt{k_BT^2 C_V}}{U} \;\propto\; \frac{\sqrt{N}}{N} = \frac{1}{\sqrt{\textcolor{#4c6ef5}{N}}} $$
{{< /eq >}}

This holds well beyond independent units: whenever correlations between parts of a system extend over a finite distance, the system behaves like many independent blocks, and the same $1/\sqrt N$ law applies. In the figure, increasing $N$ by a factor of 100 narrows the distribution tenfold. For a mole of matter, $N \approx 6 \times 10^{23}$, the relative fluctuation is about $10^{-12}$, utterly negligible: this is the **thermodynamic limit**, in which averages become sharp and thermodynamics becomes exact. The exception is near a **critical point**, where correlations extend over macroscopic distances, the parts of the system cease to be independent, and fluctuations grow enormously; [the topic on phase transitions](../phase-transitions-ising/) shows this.

For a simulation of 1000 atoms, by contrast, the relative energy fluctuation is a few per cent, which is easily visible in a plot of the energy against time. That is not a malfunction of the thermostat; it is the canonical ensemble behaving as it should.

## Density fluctuations and compressibility

The same reasoning applies to other quantities. Consider a small region inside a fluid, open to the rest. Molecules wander in and out, so the number $n$ inside fluctuates. In the grand canonical ensemble, where the region exchanges particles with a reservoir at fixed chemical potential, differentiating the grand partition function twice with respect to $\mu$ gives the variance of $n$, and thermodynamic identities relate it to the **isothermal compressibility** $\kappa_T = -\frac1V(\partial V/\partial P)_T$:

{{< eq title="Compressibility from density fluctuations" say="A fluid that is easy to squeeze is one in which the number of molecules in a small region wanders a lot." >}}
$$ \frac{\langle(\delta n)^2\rangle}{\langle n\rangle} = \rho\,k_BT\,\textcolor{#12a594}{\kappa_T} $$
- $\rho = \langle n\rangle/V$: the number density
- for an ideal gas, $\kappa_T = 1/P$ and $\rho k_BT = P$, so the right-hand side is exactly 1: the count is Poisson-distributed
{{< /eq >}}

Switch the figure to the gas. Molecules are scattered at random through a box, and the shaded sub-volume holds a fraction of them. The ratio of the variance to the mean of the count comes out close to 1, as the formula predicts for an ideal gas, reduced by the sub-volume fraction because the total number in the whole box is fixed. In a liquid, molecules repel each other at short range, so they cannot crowd into one region, the count fluctuates much less than for a gas, and $\rho k_BT\kappa_T$ is small; for water at room temperature it is about 0.06. Liquids are nearly incompressible precisely because their density fluctuations are suppressed.

Density fluctuations are directly observable. They scatter light, X-rays and neutrons: the intensity scattered at small angles is proportional to $\langle(\delta n)^2\rangle/\langle n\rangle$, which is the structure factor $S(q)$ at $q \to 0$ discussed in [the topic on liquids](../liquids-and-structure/). Near the liquid–gas critical point the compressibility diverges, density fluctuations grow to the size of the wavelength of light, and an otherwise transparent fluid turns milky, the phenomenon of **critical opalescence** explained by Einstein and Smoluchowski in 1908–1910.

## Fluctuations at constant pressure

In the isothermal–isobaric ensemble, the volume of the system is not fixed but fluctuates, and the corresponding formulas are the ones used in most molecular dynamics simulations, which run at constant temperature and pressure:

$$
\langle(\delta V)^2\rangle = k_BT\,\langle V\rangle\,\kappa_T, \qquad
\langle(\delta H)^2\rangle = k_BT^2\,C_P ,
$$

where $H = E + PV$ is the enthalpy. Recording the box volume and the enthalpy during a simulation therefore gives the compressibility and the constant-pressure heat capacity without any additional calculation. A further formula of the same kind gives the thermal expansion coefficient from the correlation between volume and enthalpy fluctuations. These estimators are widely used to validate force fields against experiment, and their accuracy depends on long simulations, because the variance of a fluctuation converges more slowly than the mean.

The fluctuations of a quantity depend on the ensemble even when its average does not. In a microcanonical (NVE) simulation the total energy does not fluctuate at all, while the kinetic and potential energies fluctuate against each other; in a canonical simulation the total energy fluctuates as above. A thermostat or barostat that gets the average temperature or pressure right but the fluctuations wrong produces the wrong ensemble and wrong response functions. The Berendsen thermostat is the classic example, discussed in [the topic on thermostats](../thermostats-and-barostats/).

## The fluctuation–dissipation theorem

The formulas above are special cases of a general principle. Suppose a small external field $h$ is applied that couples to some quantity $A$ of the system, adding $-hA$ to the energy: a magnetic field coupling to the magnetisation, an electric field coupling to the dipole moment, a pressure coupling to the volume. The system responds by shifting the average of $A$. To first order in $h$, statistical mechanics gives

{{< eq title="Static linear response" say="How strongly a system responds to a push is set by how much the pushed quantity wanders on its own." >}}
$$ \chi = \frac{\partial\langle A\rangle}{\partial h}\bigg|_{h=0} = \beta\left(\langle A^2\rangle - \langle A\rangle^2\right) $$
- $\chi$: the **susceptibility**, the static response of $A$ to the field $h$
- examples: magnetic susceptibility from magnetisation fluctuations, dielectric constant from dipole fluctuations, compressibility from volume fluctuations
{{< /eq >}}

The proof is two lines: $\langle A\rangle = \sum_s A_s e^{-\beta(E_s - hA_s)}/Z$, and differentiating with respect to $h$ brings down $\beta A_s$ in each term, giving $\beta(\langle A^2\rangle - \langle A\rangle^2)$. The dielectric constant of water in simulations is computed exactly this way, from the fluctuations of the total dipole moment of the box.

The dynamic version of this result is the **fluctuation–dissipation theorem**, formulated by Callen and Welton in 1951 and by Kubo in 1957. It states that the way a system relaxes back to equilibrium after a small disturbance is the same as the way its spontaneous fluctuations decay, a principle Onsager had stated in 1931 as the **regression hypothesis**. Quantitatively, transport coefficients, which measure dissipation, are integrals of equilibrium time-correlation functions, which measure fluctuations. The diffusion coefficient is the time integral of the velocity autocorrelation function, the viscosity is the integral of the autocorrelation of the stress, and the electrical conductivity is the integral of the autocorrelation of the current. These **Green–Kubo relations** are how transport coefficients are computed from equilibrium simulations, and [the topic on transport coefficients](../transport-coefficients/) develops them. Einstein's 1905 relation between the diffusion coefficient of a Brownian particle and the friction it feels, $D = k_BT/\zeta$, was the first example of the theorem: the same molecular collisions that make the particle jiggle also slow it down when it is pushed.

## Consequences for simulations

Several practical lessons follow. Fluctuations in a small simulation are real and expected: a 1000-atom canonical simulation at 300 K shows temperature fluctuations of about 3 %, and a pressure that fluctuates by hundreds of bar is normal for a small box of liquid. Response functions computed from fluctuations need long runs, since a variance converges more slowly than a mean and correlated samples count less than they seem ([the topic on probability](../probability/) explains effective sample sizes). Fluctuation formulas are only valid if the simulation samples the correct ensemble, so the choice of thermostat and barostat matters. And finite-size effects are themselves a kind of fluctuation effect: quantities that depend on long-wavelength fluctuations, such as the compressibility near a critical point, converge slowly with system size and should be checked by repeating the calculation in a larger box.

{{< note type="key" >}}
- Energy fluctuations give the heat capacity, $\langle\delta E^2\rangle = k_BT^2C_V$; density fluctuations give the compressibility, $\langle\delta n^2\rangle/\langle n\rangle = \rho k_BT\kappa_T$; volume and enthalpy fluctuations give $\kappa_T$ and $C_P$.
- Relative fluctuations scale as $1/\sqrt N$; they vanish in the thermodynamic limit except near critical points.
- Static susceptibilities equal $\beta$ times equilibrium variances; dynamic response and transport coefficients are integrals of time-correlation functions (fluctuation–dissipation, Green–Kubo).
- Fluctuations depend on the ensemble: use thermostats and barostats that sample it correctly, and run long enough for variances to converge.
{{< /note >}}

{{< quiz >}}
- q: "In a canonical simulation the energy variance is 4 (kJ/mol)² at 300 K. What determines the heat capacity?"
  options: ["The average energy", "C_V = variance / (k_B T²)", "The kinetic energy alone"]
  answer: 1
  why: "The canonical fluctuation formula relates the variance of the total energy to C_V."
- q: "System size grows from 1 000 to 100 000 atoms. The relative energy fluctuation…"
  options: ["is unchanged", "falls by a factor of 10", "falls by a factor of 100"]
  answer: 1
  why: "Relative fluctuations scale as 1/√N; √100 = 10."
- q: "For an ideal gas, the number of molecules in a small open sub-volume follows…"
  options: ["a Poisson distribution, variance equal to the mean", "a fixed value", "a uniform distribution"]
  answer: 0
  why: "ρk_BTκ_T = 1 for an ideal gas, so ⟨δn²⟩ = ⟨n⟩."
- q: "Why are liquids nearly incompressible, in the language of fluctuations?"
  options: ["Their molecules do not move", "Short-range repulsion suppresses density fluctuations, so ρk_BTκ_T is small", "Their temperature is low"]
  answer: 1
  why: "Compressibility is proportional to the size of density fluctuations."
- q: "A thermostat reproduces the correct average temperature but suppresses energy fluctuations. What goes wrong?"
  options: ["Nothing", "Fluctuation-based properties such as C_V come out wrong, because the ensemble is not canonical", "The simulation crashes"]
  answer: 1
  why: "Averages may be fine while variances, and hence response functions, are wrong."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. D. Chandler, *Introduction to Modern Statistical Mechanics*, Oxford University Press (1987), chapters 3 and 8 (fluctuations, linear response).
2. M. P. Allen and D. J. Tildesley, *Computer Simulation of Liquids*, 2nd ed., Oxford University Press (2017), section 2.5 (fluctuations) and chapter 2 on estimators.
3. H. B. Callen and T. A. Welton, "Irreversibility and generalized noise", *Physical Review* **83**, 34–40 (1951).
4. R. Kubo, "Statistical-mechanical theory of irreversible processes. I", *Journal of the Physical Society of Japan* **12**, 570–586 (1957).
5. L. Onsager, "Reciprocal relations in irreversible processes. I", *Physical Review* **37**, 405–426 (1931).
6. A. Einstein, "Über die von der molekularkinetischen Theorie der Wärme geforderte Bewegung von in ruhenden Flüssigkeiten suspendierten Teilchen", *Annalen der Physik* **17**, 549–560 (1905).
7. A. Einstein, "Theorie der Opaleszenz von homogenen Flüssigkeiten und Flüssigkeitsgemischen in der Nähe des kritischen Zustandes", *Annalen der Physik* **33**, 1275–1298 (1910).

</div>
