---
title: "The Boltzmann distribution"
description: "From counting microstates to the most useful formula in statistical mechanics: the Boltzmann factor and the partition function, the Maxwell–Boltzmann distribution of speeds, equipartition of energy, and pressure from molecular collisions, all watched emerging in a simulated gas."
track: statmech
weight: 2
level: Core
minutes: 55
prereqs: ["entropy-and-temperature"]
lab: "A gas of hard disks finds the Maxwell–Boltzmann distribution by itself"
---

## From an isolated system to one at a temperature

[The previous chapter](../entropy-and-temperature/) treated an isolated system: fixed energy, every microstate equally likely. Real samples, and most simulations, are instead in contact with surroundings at a fixed temperature, which can lend and borrow energy. What is the probability of finding a small system in a particular microstate then? The answer, the Boltzmann distribution, is used in every corner of chemistry and materials science.

## Deriving the Boltzmann factor

Let a small system share energy with a huge **reservoir**, with total energy $E_{\text{tot}}$ fixed. When the system is in a particular microstate $s$ with energy $E_s$, the reservoir has energy $E_{\text{tot}} - E_s$, and the combined system is still isolated, so every joint microstate is equally likely. The probability of $s$ is therefore proportional to the number of reservoir microstates compatible with it:

$$
P(s) \propto \Omega_R(E_{\text{tot}} - E_s) = e^{S_R(E_{\text{tot}} - E_s)/k_B}.
$$

Because the reservoir is huge, $E_s$ is a tiny change for it, and a first-order Taylor expansion is exact in the limit: $S_R(E_{\text{tot}} - E_s) \approx S_R(E_{\text{tot}}) - E_s\,\partial S_R/\partial E = S_R(E_{\text{tot}}) - E_s/T$. The constant first term cancels on normalising, which leaves one of the great results of physics:

{{< eq title="The Boltzmann distribution" say="Every additional kT of energy makes a state e ≈ 2.7 times less likely." >}}
$$ P(s) = \frac{e^{-\textcolor{#d4a017}{E_s}/k_B\textcolor{#e64980}{T}}}{\textcolor{#12a594}{Z}}, \qquad \textcolor{#12a594}{Z} = \sum_{s} e^{-E_s/k_BT} $$
- $e^{-E_s/k_BT}$: the **Boltzmann factor**
- $\textcolor{#12a594}{Z}$: the **partition function**, a sum over microstates (not over energy levels: a level with $g$ states counts $g$ times)
- the temperature is that of the reservoir; the system simply inherits it
{{< /eq >}}

This is the **canonical ensemble** (fixed $N$, $V$, $T$), the ensemble a thermostatted MD run samples (NVT). Its consequences are everywhere: [vibrational populations](../quantum-energy-levels/), the Arrhenius law $k \propto e^{-E_a/k_BT}$ for reaction rates, vacancy concentrations in crystals, the exponential thinning of the atmosphere with height.

## The partition function knows everything

$Z$ looks like a mere normalising constant, but all of thermodynamics can be extracted from it by differentiation. With $\beta = 1/k_BT$:

{{< eq title="Thermodynamics from Z" say="Compute one sum, and energy, free energy, entropy and heat capacity follow by differentiation." >}}
$$ \langle \textcolor{#d4a017}{E} \rangle = -\frac{\partial \ln \textcolor{#12a594}{Z}}{\partial \beta}, \qquad \textcolor{#f08c2e}{F} = -k_BT \ln \textcolor{#12a594}{Z}, \qquad C_V = \frac{\partial \langle E\rangle}{\partial T} = \frac{\langle E^2\rangle - \langle E\rangle^2}{k_BT^2} $$
- $\textcolor{#f08c2e}{F} = U - TS$: the Helmholtz free energy, which is minimised at equilibrium at fixed $T$
- the last form says that heat capacity measures **energy fluctuations**, which is how it is computed from a simulation
{{< /eq >}}

For a classical particle the sum over states becomes an integral over [phase space](../motion-and-phase-space/), $Z = \frac{1}{h^{3N}N!}\int e^{-H(\mathbf r, \mathbf p)/k_BT}\,\mathrm d\mathbf r\,\mathrm d\mathbf p$. Because $H = K(\mathbf p) + V(\mathbf r)$, the integral splits into a momentum part, which can always be done exactly, and a configurational part, which is the hard part that MD and Monte Carlo exist to sample.

## The speeds of molecules

The momentum part gives a striking prediction. Each velocity component has a Boltzmann weight $e^{-mv_x^2/2k_BT}$, a Gaussian. Combining the components and counting how many velocity vectors have the same speed (a circle of circumference $2\pi v$ in 2D, a sphere of area $4\pi v^2$ in 3D) gives the **Maxwell–Boltzmann distribution** of speeds:

{{< eq title="Maxwell–Boltzmann speed distribution" say="Few molecules are slow because there are few ways to be slow; few are fast because fast costs energy." >}}
$$ f_{3\mathrm D}(v) = 4\pi \left(\frac{\textcolor{#845ef7}{m}}{2\pi k_B\textcolor{#e64980}{T}}\right)^{3/2} \underbrace{v^2}_{\text{room}}\;\underbrace{e^{-\textcolor{#845ef7}{m} v^2/2k_B\textcolor{#e64980}{T}}}_{\text{cost}}, \qquad f_{2\mathrm D}(v) = \frac{\textcolor{#845ef7}{m}v}{k_B\textcolor{#e64980}{T}}\,e^{-\textcolor{#845ef7}{m}v^2/2k_B\textcolor{#e64980}{T}} $$
- the rising factor ($v^2$ or $v$) counts the velocity directions with the same speed
- the falling factor is the Boltzmann factor for the kinetic energy
- N₂ at 300 K: most probable speed 422 m/s, mean 476 m/s, root-mean-square 517 m/s
{{< /eq >}}

Maxwell derived this in 1860 from symmetry arguments alone, before anyone could measure molecular speeds. The lab lets you watch it happen.

{{< widget name="gas" title="A gas of hard disks finds its own distribution" caption="Left: 160 disks in a box, coloured by speed, colliding elastically. Right: a histogram of their speeds against the 2D Maxwell–Boltzmann curve for the current temperature. Every particle starts with exactly the same speed; collisions alone produce the distribution. Tick “two species” to watch heavy and light particles share energy." >}}

Restart and look at the histogram. At first every particle has the same speed, a single spike. Within a few hundred collisions the spike spreads into exactly the Maxwell–Boltzmann shape, though nothing in the program knows that curve: collisions conserve energy and momentum, and the distribution is simply the one with the most microstates. This is the second law happening in front of you. Boltzmann's **H-theorem** (1872) proved that collisions drive any initial distribution towards this one.

## Equipartition

Now tick "two species". The orange particles are four times heavier but start with the same speed, so each carries four times the kinetic energy of a light particle. Watch the readout of mean kinetic energy: within a short time the two species have the **same** average kinetic energy, and the heavy particles move half as fast. This is the **equipartition theorem**:

{{< eq title="Equipartition of energy" say="Every quadratic term in the energy holds, on average, half of kT, whatever the mass or stiffness." >}}
$$ \left\langle \tfrac12 \textcolor{#845ef7}{m} v_x^2 \right\rangle = \tfrac12 k_B\textcolor{#e64980}{T} \quad\Longrightarrow\quad \langle K \rangle_{3\mathrm D} = \tfrac32 k_BT, \qquad \langle K \rangle_{2\mathrm D} = k_BT $$
- holds for every term of the form $a\,x^2$ in a classical Hamiltonian: each momentum component, and each harmonic spring
- a classical harmonic solid therefore stores $3k_BT$ per atom (the Dulong–Petit law), until [quantum freezing](../quantum-energy-levels/) sets in at low temperature
{{< /eq >}}

Equipartition is how MD codes **measure** temperature. They compute the instantaneous kinetic temperature $T = \frac{2\langle K \rangle}{N_{\text{df}}\,k_B}$, with $N_{\text{df}}$ the number of degrees of freedom (about $3N$, less any constraints), and a thermostat nudges velocities to keep it near the target. It also explains the classical-MD error discussed earlier: equipartition gives every vibration $k_BT$, even those that quantum mechanics would freeze.

## Pressure from collisions

Pressure is the momentum delivered to the walls per unit time per unit area. A particle bouncing off a wall reverses its normal velocity and delivers momentum $2m|v_x|$. Averaging over the Maxwell–Boltzmann distribution gives the **ideal gas law**:

{{< eq title="The ideal gas law from kinetic theory" say="Pressure is the momentum flux of molecules hitting the wall, and the average kinetic energy is set by T." >}}
$$ \textcolor{#f08c2e}{P}\,V = N\,k_B\textcolor{#e64980}{T} \qquad\text{(in 2D: } P\,A = N k_BT \text{, with } P \text{ a force per unit length)} $$
- per mole: $PV = nRT$, with $R = N_A k_B = 8.314$ J mol⁻¹ K⁻¹
{{< /eq >}}

The lab measures pressure by adding up the momentum transferred to the walls. Compare it with the ideal-gas value: the measured pressure is somewhat higher, because the disks have a finite size and the free area is smaller than the box. That is the excluded-volume correction in van der Waals's equation, and the starting point of the theory of real gases and liquids. In MD, pressure is computed from the **virial**, $PV = Nk_BT + \frac{1}{d}\left\langle \sum_i \mathbf r_i \cdot \mathbf F_i \right\rangle$ in $d$ dimensions, which adds the interparticle forces to the kinetic term ([the MD chapter](../molecular-dynamics/)).

{{< note type="key" >}}
- A system at temperature $T$ visits microstate $s$ with probability $e^{-E_s/k_BT}/Z$; the partition function $Z$ yields energy, free energy, entropy and heat capacity.
- Speeds in a gas follow the Maxwell–Boltzmann distribution, which collisions produce from any starting point.
- Classically every quadratic degree of freedom holds $\tfrac12 k_BT$ (equipartition). This is how MD defines its temperature, and pressure follows from the momentum flux and the virial.
{{< /note >}}

{{< quiz >}}
- q: "State A lies $2\\,k_BT$ above state B. What is the ratio of their probabilities $P_A/P_B$?"
  options: ["$1/2$", "$e^{-2} \\approx 0.14$", "$e^{2} \\approx 7.4$"]
  answer: 1
  why: "The Z cancels in the ratio: $P_A/P_B = e^{-(E_A - E_B)/k_BT} = e^{-2}$."
- q: "Why is the most probable speed in a 3D gas not zero, even though zero speed has the largest Boltzmann factor?"
  options: ["Because collisions prevent particles from stopping", "Because there are very few velocity vectors with nearly zero speed: the $4\\pi v^2$ factor vanishes at $v = 0$", "Because of quantum zero-point energy"]
  answer: 1
  why: "The density of velocity vectors with speed v grows as $v^2$ (as $v$ in 2D), so the distribution peaks at a finite speed."
- q: "Helium (4 u) and xenon (131 u) are mixed at the same temperature. Which statement is true?"
  options: ["They have the same mean speed", "They have the same mean kinetic energy; helium moves about 5.7 times faster", "Xenon has more kinetic energy because it is heavier"]
  answer: 1
  why: "Equipartition fixes $\\langle \\tfrac12 mv^2\\rangle$; speeds scale as $1/\\sqrt m$, and $\\sqrt{131/4} \\approx 5.7$."
- q: "How does an MD code compute the instantaneous temperature?"
  options: ["From the potential energy", "From the kinetic energy, $T = 2K/(N_{\\text{df}} k_B)$", "From the pressure"]
  answer: 1
  why: "Equipartition links the average kinetic energy to $T$, with $\\tfrac12 k_BT$ per degree of freedom."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. D. V. Schroeder, *An Introduction to Thermal Physics*, Addison-Wesley (2000), chapter 6 (Boltzmann factor, partition function, equipartition, the Maxwell speed distribution).
2. J. C. Maxwell, "Illustrations of the dynamical theory of gases", *Philosophical Magazine* **19**, 19 (1860).
3. L. Boltzmann, "Weitere Studien über das Wärmegleichgewicht unter Gasmolekülen", *Wiener Berichte* **66**, 275 (1872).
4. D. Chandler, *Introduction to Modern Statistical Mechanics*, Oxford University Press (1987), chapter 3.
5. D. Frenkel and B. Smit, *Understanding Molecular Simulation*, 3rd ed., Academic Press (2023), chapter 2 (statistical mechanics for simulation: temperature and pressure estimators).
6. M. P. Allen and D. J. Tildesley, *Computer Simulation of Liquids*, 2nd ed., Oxford University Press (2017), chapter 2.

</div>
