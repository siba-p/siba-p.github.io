---
title: "Fluctuations and response"
description: "Why thermodynamic quantities fluctuate, how large the fluctuations are, and what they measure: energy fluctuations and the heat capacity, the 1/√N law and the thermodynamic limit, density fluctuations and compressibility, volume and enthalpy fluctuations at constant pressure, the fluctuation–dissipation theorem and linear response, and what all this means for simulations of small systems."
hook: "Watch how much a system's energy jitters and you know its heat capacity without ever heating it. Fluctuations are not noise to be averaged away: they measure how matter responds when it is pushed."
objectives:
  - "Compute heat capacity and compressibility from energy and particle-number fluctuations"
  - "Explain why relative fluctuations shrink as 1/√N, and why critical points are the exception"
  - "Derive a static susceptibility as β times an equilibrium variance"
  - "Relate transport coefficients to time-correlation functions through the fluctuation–dissipation theorem"
  - "Diagnose thermostats and barostats that give the right averages but the wrong fluctuations"
cover: "cover.svg"
milestones:
  - year: 1905
    text: "Albert Einstein links Brownian diffusion to friction through D = kBT/ζ"
  - year: 1928
    text: "John Johnson measures thermal noise in resistors and Harry Nyquist explains it"
  - year: 1951
    text: "Herbert Callen and Theodore Welton prove the general fluctuation–dissipation theorem"
  - year: 1957
    text: "Ryogo Kubo derives transport coefficients from equilibrium time-correlation functions"
track: statmech
weight: 4
level: Core
prereqs: ["ensembles-and-free-energy"]
lab: "Sample energy and particle-number fluctuations and recover the heat capacity and compressibility from them"
---

## Averages are not the whole story

Thermodynamics treats the energy of a beaker of water in a thermostat, or the number of molecules in a cubic millimetre of air, as definite numbers. Statistical mechanics says they are not. A system in contact with a heat bath constantly exchanges energy with it, so its energy fluctuates about its average; a region of a gas constantly exchanges molecules with its surroundings, so the number inside it fluctuates too. For a macroscopic sample these fluctuations are far too small to notice, which is why thermodynamics works. For the systems studied in molecular simulation, a few thousand atoms, and for the nanoparticles, single molecules and small droplets of modern experiments, they are large enough to see and to matter.

Fluctuations are not merely noise. Their size is fixed by the same statistical mechanics that fixes the averages, and it turns out to be directly related to how the system **responds** when it is disturbed. The heat capacity, the compressibility and the magnetic susceptibility can all be written as the size of a spontaneous fluctuation. This is one of the most useful results in statistical physics, because it means that response functions can be computed from an equilibrium simulation simply by recording the fluctuations, without ever disturbing the system.

{{< fig src="two-routes.svg" alt="Left: an isolated sample with a heater and a thermometer, labelled C equals delta Q over delta T. Right: a sample in a heat bath with a fluctuating energy trace and its Gaussian histogram, labelled C equals the energy variance over kB T squared" caption="Two experiments, one number. A calorimeter heats the sample and records the temperature rise; a simulation in a heat bath records how widely the energy wanders. The canonical ensemble guarantees that both give the same heat capacity." >}}

## Energy fluctuations and the heat capacity

In the canonical ensemble, the mean energy is $U = -\partial \ln Z/\partial\beta$, as [the chapter on ensembles](../ensembles-and-free-energy/) showed. Differentiating once more with respect to $\beta$ gives the variance of the energy, and since $\partial/\partial\beta = -k_BT^2\,\partial/\partial T$, the variance is proportional to the temperature derivative of the energy, which is the heat capacity:

{{< eq title="Heat capacity from energy fluctuations" say="A system that can soak up heat is one whose energy wanders: both need accessible states at nearby energies." >}}
$$ \langle (\delta E)^2 \rangle = \langle E^2\rangle - \langle E\rangle^2 = \frac{\partial^2 \ln Z}{\partial\beta^2} = k_B T^2\,\textcolor{#e64980}{C_V} $$
- $\delta E = E - \langle E\rangle$: the deviation from the mean
- the left side is measured in an equilibrium simulation at one temperature; the right side is a response to changing the temperature
{{< /eq >}}

The figure below samples the total energy of $N$ independent two-level units, each with an excited level at energy $\Delta$, in contact with a heat bath. Each unit is excited with probability $p = 1/(1 + e^{\Delta/k_BT})$, so the number of excited units fluctuates from moment to moment. The readout computes the heat capacity from nothing but the variance of the sampled energies and compares it with the exact result. Change the temperature: the fluctuations, and the heat capacity, are largest at intermediate temperatures where the units are most uncertain about their state, the Schottky peak seen in the ensembles topic.

{{< widget name="fluct" title="Fluctuations shrink as 1/√N, and measure the response" caption="Left: the system. Right: the distribution of the fluctuating quantity divided by its mean, on a fixed axis, with the Gaussian predicted by theory. Increase N from 10 to 10 000 and watch the distribution narrow; the readout recovers the heat capacity (or the compressibility) from the sampled variance alone." >}}

The formula also explains why heat capacities are always positive: a variance cannot be negative. A system with a negative heat capacity would heat up when it lost energy, which cannot happen in a stable system in contact with a bath. (Isolated, self-gravitating systems such as stars can have negative heat capacities, and small isolated clusters near a melting transition can show them in the microcanonical ensemble, a reminder that the equivalence of ensembles holds only for large systems.)

{{< note type="warn" title="Myth" >}}
**In a canonical simulation the temperature should stay fixed, so fluctuations in it mean the thermostat is failing.** The temperature printed by an MD code is the instantaneous kinetic temperature, $T_{\text{inst}} = 2K/(N_fk_B)$ for $N_f$ degrees of freedom, an estimator built from the kinetic energy $K$. In the canonical ensemble $K$ fluctuates, with relative standard deviation $\sqrt{2/N_f}$. For 1000 atoms ($N_f \approx 3000$) that is 2.6 %, or ±7.7 K at 300 K. The bath temperature is fixed; the kinetic temperature is not. The warning sign is the opposite: a trace that is much smoother than $\sqrt{2/N_f}$, which is what the Berendsen thermostat produces.
{{< /note >}}

## The thermodynamic limit

How large are these fluctuations? For $N$ independent units, the energies add, and so do the variances ([the chapter on probability](../probability/)), so the mean grows as $N$ and the standard deviation as $\sqrt N$. The **relative** fluctuation therefore shrinks:

{{< eq title="Relative fluctuations" say="The bigger the system, the less its total wanders compared with its size." >}}
$$ \frac{\sqrt{\langle(\delta E)^2\rangle}}{\langle E\rangle} = \frac{\sqrt{k_BT^2 C_V}}{U} \;\propto\; \frac{\sqrt{N}}{N} = \frac{1}{\sqrt{\textcolor{#4c6ef5}{N}}} $$
{{< /eq >}}

This holds well beyond independent units: whenever correlations between parts of a system extend over a finite distance, the system behaves like many independent blocks, and the same $1/\sqrt N$ law applies. In the figure, increasing $N$ by a factor of 100 narrows the distribution tenfold. For a mole of matter, $N \approx 6 \times 10^{23}$, the relative fluctuation is about $10^{-12}$, utterly negligible: this is the **thermodynamic limit**, in which averages become sharp and thermodynamics becomes exact. The exception is near a **critical point**, where correlations extend over macroscopic distances, the parts of the system cease to be independent, and fluctuations grow enormously; [the chapter on phase transitions](../phase-transitions-ising/) shows this.

{{< note type="try" title="Pause and predict" >}}
A 1000-atom canonical simulation of a liquid shows a relative energy fluctuation of 3 %. What will a million-atom simulation of the same liquid show, and what will a 1000-atom simulation show at the liquid–gas critical point? Predict before reading on. Away from critical points the answer follows from $1/\sqrt N$: a factor of 1000 in $N$ gives a factor of $\sqrt{1000} \approx 32$, so about 0.1 %. At the critical point the parts of the system are no longer independent, the $1/\sqrt N$ law fails, and the fluctuations stay large and depend strongly on the box size.
{{< /note >}}

For a simulation of 1000 atoms, by contrast, the relative energy fluctuation is a few per cent, which is easily visible in a plot of the energy against time. That is not a malfunction of the thermostat; it is the canonical ensemble behaving as it should.

{{< note type="practice" title="Back of the envelope: how small is small?" >}}
Air at 20 °C and 1 atm holds $2.5\times10^{25}$ molecules per cubic metre. A cube 1 µm on a side contains $2.5\times10^7$ of them on average, and the count fluctuates by $1/\sqrt{2.5\times10^7} = 0.02$ %. A cube 10 nm on a side, the size of a large protein, contains 25 molecules on average, and the count fluctuates by 20 %. The same arithmetic applies inside cells. A protein present at 10 copies per bacterium varies from cell to cell by about 30 % from Poisson statistics alone, before any regulation. Elowitz, Levine, Siggia and Swain measured this kind of noise in *E. coli* in 2002 by expressing two fluorescent reporters from identical promoters in the same cell and comparing their levels.
{{< /note >}}

## Density fluctuations and compressibility

The same reasoning applies to other quantities. Consider a small region inside a fluid, open to the rest. Molecules wander in and out, so the number $n$ inside fluctuates. In the grand canonical ensemble, where the region exchanges particles with a reservoir at fixed chemical potential, differentiating the grand partition function twice with respect to $\mu$ gives the variance of $n$, and thermodynamic identities relate it to the **isothermal compressibility** $\kappa_T = -\frac1V(\partial V/\partial P)_T$:

{{< eq title="Compressibility from density fluctuations" say="A fluid that is easy to squeeze is one in which the number of molecules in a small region wanders a lot." >}}
$$ \frac{\langle(\delta n)^2\rangle}{\langle n\rangle} = \rho\,k_BT\,\textcolor{#12a594}{\kappa_T} $$
- $\rho = \langle n\rangle/V$: the number density
- for an ideal gas, $\kappa_T = 1/P$ and $\rho k_BT = P$, so the right-hand side is exactly 1: the count is Poisson-distributed
{{< /eq >}}

The derivation the equation card skips takes three lines. In the grand canonical ensemble, $\langle n\rangle = k_BT\,\partial\ln\Xi/\partial\mu$, and differentiating once more gives $\langle(\delta n)^2\rangle = k_BT\,(\partial\langle n\rangle/\partial\mu)_{T,V}$, in the same way that differentiating $\ln Z$ twice gave the energy variance. At constant temperature, the Gibbs–Duhem relation gives $\mathrm d\mu = \mathrm dP/\rho$, so $(\partial\rho/\partial\mu)_T = \rho\,(\partial\rho/\partial P)_T = \rho^2\kappa_T$. Multiplying by $V$ gives $\langle(\delta n)^2\rangle = k_BT\,V\rho^2\kappa_T = \langle n\rangle\,\rho k_BT\kappa_T$.

Switch the figure to the gas. Molecules are scattered at random through a box, and the shaded sub-volume holds a fraction of them. The ratio of the variance to the mean of the count comes out close to 1, as the formula predicts for an ideal gas, reduced by the sub-volume fraction because the total number in the whole box is fixed. In a liquid, molecules repel each other at short range, so they cannot crowd into one region, the count fluctuates much less than for a gas, and $\rho k_BT\kappa_T$ is small; for water at room temperature it is about 0.06. Liquids are nearly incompressible precisely because their density fluctuations are suppressed.

Density fluctuations are directly observable. They scatter light, X-rays and neutrons: the intensity scattered at small angles is proportional to $\langle(\delta n)^2\rangle/\langle n\rangle$, which is the structure factor $S(q)$ at $q \to 0$ discussed in [the chapter on liquids](../liquids-and-structure/). Near the liquid–gas critical point the compressibility diverges, density fluctuations grow to the size of the wavelength of light, and an otherwise transparent fluid turns milky, the phenomenon of **critical opalescence** explained by Einstein and Smoluchowski in 1908–1910.

The van der Waals equation shows how fast this happens. Writing its pressure as $P = k_BT/(v - b) - a/v^2$, with $v$ the volume per molecule, and differentiating gives $\rho k_BT\kappa_T = [\,v^2/(v-b)^2 - 2a/(vk_BT)\,]^{-1}$. At the critical volume $v_c = 3b$ and with $k_BT_c = 8a/27b$, this simplifies to

$$
\rho k_BT\kappa_T = \frac49\,\frac{T}{T - T_c},
$$

which diverges as $(T - T_c)^{-1}$. One per cent above the critical temperature the density fluctuations are 45 times larger than in an ideal gas, and 700 times larger than in liquid water at room temperature.

{{< fig src="critical-compressibility.svg" alt="Left: log-log plot of rho kB T kappa T against reduced temperature distance from the critical point, a straight line of slope minus one, with dashed reference lines for the ideal gas at 1 and liquid water at 0.062. Right: rho kB T kappa T against reduced density for three van der Waals isotherms, with a tall peak near the critical density at 1.03 Tc" caption="Density fluctuations of the van der Waals fluid, $S(0) = \rho k_BT\kappa_T$. Near $T_c$ they exceed the ideal-gas value by orders of magnitude, and the peak is centred near the critical density. Real fluids diverge faster, with exponent $\gamma \approx 1.24$ instead of the mean-field 1 ([the chapter on phase transitions](../phase-transitions-ising/))." >}}

For mixtures, the same idea becomes **Kirkwood–Buff theory** (1951). The covariances of the numbers of molecules of each species in an open sub-volume, $\langle\delta n_\alpha\,\delta n_\beta\rangle$, are related to integrals of the pair correlation functions $g_{\alpha\beta}(r)$ and determine the compressibility, the partial molar volumes and the derivatives of the activity coefficients with composition. The theory is exact and needs no assumption about pair potentials, which makes it a practical bridge between simulation and solution thermodynamics. Kirkwood–Buff integrals are measured from experimental activity data and used as targets when parametrising force fields for cosolvent solutions such as aqueous urea. A simulation in a closed box needs a correction: when the total $N$ is fixed, a sub-volume holding a fraction $f$ of the box has its number variance reduced by a factor of about $1 - f$, as the figure's gas mode shows.

## Fluctuations at constant pressure

In the isothermal–isobaric ensemble, the volume of the system is not fixed but fluctuates, and the corresponding formulas are the ones used in most molecular dynamics simulations, which run at constant temperature and pressure:

$$
\langle(\delta V)^2\rangle = k_BT\,\langle V\rangle\,\kappa_T, \qquad
\langle(\delta H)^2\rangle = k_BT^2\,C_P ,
$$

where $H = E + PV$ is the enthalpy. Recording the box volume and the enthalpy during a simulation therefore gives the compressibility and the constant-pressure heat capacity without any additional calculation. A further formula of the same kind gives the thermal expansion coefficient from the correlation between volume and enthalpy fluctuations. These estimators are widely used to validate force fields against experiment, and their accuracy depends on long simulations, because the variance of a fluctuation converges more slowly than the mean.

{{< note type="practice" title="Back of the envelope: what the energy file should show" >}}
Liquid water at 298 K has $C_P = 75.3$ J mol⁻¹ K⁻¹. For a box of 1000 molecules, $\langle(\delta H)^2\rangle = k_BT^2C_P$ with the box's total heat capacity gives, in the molar units an MD code prints, a standard deviation of $\sqrt{1000\,RT^2C_P} \approx 236$ kJ/mol in the total enthalpy. The total potential energy of such a box is about −41 000 kJ/mol, so the relative fluctuation is about 0.6 %. Running the formula in reverse is the measurement: record the enthalpy every few hundred femtoseconds in an NPT run, compute its variance, and divide by $k_BT^2$. The thermal expansion coefficient comes from the cross-correlation $\langle\delta V\,\delta H\rangle = k_BT^2\langle V\rangle\alpha_P$, the third member of the family.
{{< /note >}}

The fluctuations of a quantity depend on the ensemble even when its average does not. In a microcanonical (NVE) simulation the total energy does not fluctuate at all, while the kinetic and potential energies fluctuate against each other; in a canonical simulation the total energy fluctuates as above. A thermostat or barostat that gets the average temperature or pressure right but the fluctuations wrong produces the wrong ensemble and wrong response functions. The Berendsen thermostat is the classic example, discussed in [the chapter on thermostats](../thermostats-and-barostats/).

The heat capacity is not lost in the microcanonical ensemble; it moves into the partition of energy between kinetic and potential terms. Lebowitz, Percus and Verlet showed in 1967 that for $N$ atoms at fixed total energy,

$$
\langle(\delta K)^2\rangle_{NVE} = \frac32 N k_B^2T^2\left(1 - \frac{3Nk_B}{2C_V}\right),
$$

so the kinetic-energy fluctuations of an NVE run give $C_V$. The formula carries its own sanity check: the bracket must lie between 0 and 1, so the measured kinetic fluctuations must be smaller than the canonical value $\tfrac32Nk_B^2T^2$. If they are not, the run is not conserving energy, typically because the time step is too long or the potential is truncated without smoothing.

## The fluctuation–dissipation theorem

The formulas above are special cases of a general principle. Suppose a small external field $h$ is applied that couples to some quantity $A$ of the system, adding $-hA$ to the energy: a magnetic field coupling to the magnetisation, an electric field coupling to the dipole moment, a pressure coupling to the volume. The system responds by shifting the average of $A$. To first order in $h$, statistical mechanics gives

{{< eq title="Static linear response" say="How strongly a system responds to a push is set by how much the pushed quantity wanders on its own." >}}
$$ \chi = \frac{\partial\langle A\rangle}{\partial h}\bigg|_{h=0} = \beta\left(\langle A^2\rangle - \langle A\rangle^2\right) $$
- $\chi$: the **susceptibility**, the static response of $A$ to the field $h$
- examples: magnetic susceptibility from magnetisation fluctuations, dielectric constant from dipole fluctuations, compressibility from volume fluctuations
{{< /eq >}}

The proof is two lines: $\langle A\rangle = \sum_s A_s e^{-\beta(E_s - hA_s)}/Z$, and differentiating with respect to $h$ brings down $\beta A_s$ in each term, giving $\beta(\langle A^2\rangle - \langle A\rangle^2)$. The dielectric constant of water in simulations is computed exactly this way, from the fluctuations of the total dipole moment of the box.

{{< note type="practice" title="From the lab: the dielectric constant of a water model" >}}
For a periodic box summed with Ewald's method and conducting ('tin-foil') boundary conditions, the static dielectric constant is $\varepsilon = 1 + (\langle M^2\rangle - \langle M\rangle^2)/(3\varepsilon_0Vk_BT)$, where $\mathbf M$ is the total dipole moment of the box. It is a demanding test of a water model, and many models fail it: TIP4P/2005 gives about 60 and SPC/E about 70, against the experimental 78.4 at 25 °C, because a fixed-charge model cannot polarise in response to its environment. The estimate also converges slowly. $\mathbf M$ is a single collective quantity with a relaxation time of about 10 ps (the Debye time of water is 8.3 ps), so a 1 ns run supplies only about 50 independent samples of it, and runs of tens of nanoseconds are needed for an error of a few per cent.
{{< /note >}}

The dynamic version of this result is the **fluctuation–dissipation theorem**, formulated by Callen and Welton in 1951 and by Kubo in 1957. It states that the way a system relaxes back to equilibrium after a small disturbance is the same as the way its spontaneous fluctuations decay, a principle Onsager had stated in 1931 as the **regression hypothesis**. Quantitatively, transport coefficients, which measure dissipation, are integrals of equilibrium time-correlation functions, which measure fluctuations. The diffusion coefficient is the time integral of the velocity autocorrelation function, the viscosity is the integral of the autocorrelation of the stress, and the electrical conductivity is the integral of the autocorrelation of the current. These **Green–Kubo relations** are how transport coefficients are computed from equilibrium simulations, and [the chapter on transport coefficients](../transport-coefficients/) develops them. Einstein's 1905 relation between the diffusion coefficient of a Brownian particle and the friction it feels, $D = k_BT/\zeta$, was the first example of the theorem: the same molecular collisions that make the particle jiggle also slow it down when it is pushed.

### Watching the regression: a bead in an optical trap

Onsager's hypothesis can be seen directly in one of the most common instruments in biophysics. An optical trap holds a 1 µm polystyrene bead in a focused laser beam, which acts as a harmonic spring of stiffness $k$, typically 0.01–0.1 pN/nm. The bead is buffeted by water molecules, and its position $x$ fluctuates. Define the **time-correlation function** $C(t) = \langle\delta x(0)\,\delta x(t)\rangle$, which measures how long a fluctuation is remembered. For an overdamped bead with friction coefficient $\zeta = 6\pi\eta a$, it decays as $C(t) = (k_BT/k)\,e^{-t/\tau}$, with $\tau = \zeta/k$.

Now do the response experiment. Apply a small constant force $f$, for example by moving the trap or with a flow; the bead shifts to $\langle x\rangle = f/k$. Switch the force off and the mean position relaxes back. The regression hypothesis says it does so as $\langle x(t)\rangle = (f/k)\,C(t)/C(0)$: the relaxation from a small push has the same time course as the decay of a spontaneous fluctuation.

{{< fig src="optical-trap.svg" alt="Left: a noisy bead position trace over 5 milliseconds fluctuating within about plus or minus 9 nanometres. Right: the normalised autocorrelation of the trajectory (blue dots) and the mean relaxation after a 0.5 piconewton force is removed (orange line), both falling on an exponential with time constant 0.17 ms" caption="A simulated 1 µm bead in water, trap stiffness 0.05 pN/nm, 298 K. Left: equilibrium fluctuations with $\sigma = \sqrt{k_BT/k} = 9.1$ nm. Right: the equilibrium autocorrelation and the average relaxation after a push coincide, with $\tau = \zeta/k = 0.17$ ms. That coincidence is Onsager's regression hypothesis." >}}

The numbers in the figure are those of a real experiment. With $\eta = 0.89$ mPa s and $a = 0.5$ µm, $\zeta = 8.4\times10^{-9}$ N s/m, so $\tau = 0.17$ ms, a corner frequency $k/2\pi\zeta$ of 950 Hz in the power spectrum of $x$. The static susceptibility is the compliance $\chi = 1/k = 20$ nm/pN, and the fluctuation formula gives the same value, $\beta\langle x^2\rangle = 82\ \text{nm}^2/(4.12\ \text{pN nm}) = 20$ nm/pN. That is exactly how traps are calibrated before force measurements on motor proteins or DNA. The **equipartition method** records the bead position for a few seconds and sets $k = k_BT/\langle x^2\rangle$. The **power-spectrum method** fits a Lorentzian to the spectrum of $x$ and reads off the corner frequency. Both use nothing but equilibrium fluctuations, and both fail in the same ways: position-detector drift adds spurious variance, and low-pass filtering by the detector removes real variance.

{{< note type="fun" >}}
Every resistor is a fluctuation–dissipation experiment. In 1928 John Johnson at Bell Labs measured a voltage noise across resistors that was proportional to resistance and temperature, and Harry Nyquist derived it in the same issue of *Physical Review*: $\langle V^2\rangle = 4k_BTR\,\Delta f$ in a bandwidth $\Delta f$. A 1 MΩ resistor at 300 K measured over 10 kHz shows 13 µV of noise, which sets the floor for any amplifier connected to it. The resistance that dissipates current as heat is the same quantity that sets the size of the voltage fluctuations.
{{< /note >}}

## Consequences for simulations

Several practical lessons follow. Fluctuations in a small simulation are real and expected: a 1000-atom canonical simulation at 300 K shows temperature fluctuations of about 3 %, and a pressure that fluctuates by hundreds of bar is normal for a small box of liquid. Response functions computed from fluctuations need long runs, since a variance converges more slowly than a mean and correlated samples count less than they seem ([the chapter on probability](../probability/) explains effective sample sizes). Fluctuation formulas are only valid if the simulation samples the correct ensemble, so the choice of thermostat and barostat matters. And finite-size effects are themselves a kind of fluctuation effect: quantities that depend on long-wavelength fluctuations, such as the compressibility near a critical point, converge slowly with system size and should be checked by repeating the calculation in a larger box.

{{< note type="practice" title="Back of the envelope: how long is long enough?" >}}
For $n$ independent Gaussian samples, the relative standard error of the sample variance is $\sqrt{2/(n-1)}$. A heat capacity or compressibility to 5 % therefore needs about 800 independent samples, and to 1 % about 20 000. Successive MD frames are not independent: if the quantity has a correlation time $\tau$, samples separated by about $2\tau$ count as independent. For a total energy with $\tau = 1$ ps, 800 independent samples need about 2 ns. For the box volume of an NPT run with a Parrinello–Rahman barostat, whose period is often set to several picoseconds, the same 5 % precision on $\kappa_T$ takes several times longer. Estimate the error by block averaging ([the chapter on probability](../probability/)), and report the run length alongside the result.
{{< /note >}}

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
- q: "A trapped bead at 298 K (kBT = 4.1 pN nm) has a position variance of 41 nm². What is the trap stiffness?"
  options: ["0.01 pN/nm", "0.1 pN/nm", "10 pN/nm"]
  answer: 1
  why: "Equipartition, the static fluctuation–response relation, gives k = kBT/⟨x²⟩ = 4.1/41 = 0.1 pN/nm."
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
8. J. B. Johnson, "Thermal agitation of electricity in conductors", *Physical Review* **32**, 97–109 (1928); H. Nyquist, "Thermal agitation of electric charge in conductors", *Physical Review* **32**, 110–113 (1928).
9. J. L. Lebowitz, J. K. Percus and L. Verlet, "Ensemble dependence of fluctuations with application to machine computations", *Physical Review* **153**, 250–254 (1967).
10. M. B. Elowitz, A. J. Levine, E. D. Siggia and P. S. Swain, "Stochastic gene expression in a single cell", *Science* **297**, 1183–1186 (2002).
11. J. G. Kirkwood and F. P. Buff, "The statistical mechanical theory of solutions. I", *Journal of Chemical Physics* **19**, 774–777 (1951).

</div>
