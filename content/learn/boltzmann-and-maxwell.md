---
title: "The Boltzmann distribution"
description: "From counting microstates to the most useful formula in statistical mechanics: the Boltzmann factor and the partition function, the Maxwell–Boltzmann distribution of speeds, equipartition of energy, and pressure from molecular collisions, all watched emerging in a simulated gas."
hook: "The nitrogen molecules you are breathing average about 1,700 kilometres an hour, faster than the sound they carry. A single exponential, the Boltzmann factor, sets that speed, how energy is shared, and how simulations measure temperature."
objectives:
  - "Derive the Boltzmann factor by counting the microstates of a large reservoir"
  - "Compute energy, free energy and heat capacity from the partition function"
  - "Compute most probable, mean and rms molecular speeds for any gas at any temperature"
  - "Explain equipartition and use it to define and measure temperature in molecular dynamics"
  - "Derive the ideal gas law from momentum transfer and recognise the virial correction"
cover: "cover.svg"
milestones:
  - year: 1860
    text: "Maxwell derives the distribution of molecular speeds in a gas"
  - year: 1872
    text: "Boltzmann proves the H-theorem: collisions drive any gas to Maxwell's distribution"
  - year: 1902
    text: "Gibbs introduces the canonical ensemble in his Elementary Principles"
  - year: 1955
    text: "Miller and Kusch confirm Maxwell's distribution with a slotted rotating cylinder"
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

### A check by counting

The derivation can be checked against the exact counts of [the previous chapter](../entropy-and-temperature/). Let the small system be one oscillator, and the reservoir an Einstein solid of $N$ oscillators holding $q$ quanta. Every quantum the small oscillator takes away reduces the reservoir's multiplicity by the factor

$$
\frac{\Omega(N, q-1)}{\Omega(N, q)} = \frac{q}{q + N - 1} \approx \frac{q}{q + N},
$$

and because the reservoir is large, this factor hardly changes from one quantum to the next. The probability of finding $n$ quanta in the small oscillator therefore falls geometrically, $P(n) \propto \left(q/(q+N)\right)^n$, an exponential in its energy $n\varepsilon$. The previous chapter found $k_BT = \varepsilon/\ln(1 + N/q)$ for the Einstein solid, so $q/(q+N) = e^{-\varepsilon/k_BT}$: the factor is exactly the Boltzmann factor for one quantum. With $N = q = 1000$, for example, it is 0.5003, so the small oscillator is empty half of the time, holds one quantum a quarter of the time, two an eighth of the time, and so on.

{{< fig src="reservoir.svg" alt="Left: a diagram of a small orange system inside a large teal reservoir, with arrows showing energy exchange and the formula P of s proportional to the reservoir multiplicity, proportional to the Boltzmann factor. Right: orange bars of the exact probability that one oscillator holds 0 to 8 quanta, following a blue exponential curve" caption="Left: the derivation in one picture; the system's probability is the reservoir's number of microstates. Right: one oscillator in contact with 1000 others sharing 1000 quanta. The exact counts (bars), 0.500, 0.250, 0.125, 0.063, lie on the Boltzmann factor with $e^{-\varepsilon/k_BT} = 0.5003$ (curve); no Taylor expansion was used." >}}

### The Boltzmann factor at work

{{< note type="try" title="Pause and predict" >}}
A reaction has an activation energy of 50 kJ/mol, typical of enzyme-catalysed and many solution reactions. Warming it from 300 K to 310 K, a 3 % rise in absolute temperature, changes its rate by how much: 3 %, 30 % or a factor of two?
{{< /note >}}

The Arrhenius rate is proportional to the Boltzmann factor of the barrier, so the ratio of rates is $\exp[(E_a/R)(1/300 - 1/310)] = \exp(6014\ \text{K} \times 1.075 \times 10^{-4}\ \text{K}^{-1}) = e^{0.647} = 1.91$. A 3 % change in $T$ almost doubles the rate, because the exponent $E_a/RT = 20$ amplifies every fractional change in temperature twentyfold. This is the origin of the chemist's rule of thumb that rates double for every 10 K near room temperature, and it is why a simulation thermostat that runs a few kelvin hot or cold biases computed rates by tens of per cent.

The same factor stratifies the atmosphere. A molecule at height $z$ has potential energy $mgz$, so in an isothermal atmosphere the density falls as $e^{-mgz/k_BT}$, by a factor $e$ over the scale height $k_BT/mg$. For nitrogen at 300 K this is $4.14 \times 10^{-21}\ \text{J}/(4.65 \times 10^{-26}\ \text{kg} \times 9.81\ \text{m s}^{-2}) = 9.1$ km. Heavier molecules have shorter scale heights, and Jean Perrin used the same law in 1908, with the heights of resin grains suspended in water in place of molecules in air, to measure Avogadro's number.

## The partition function knows everything

$Z$ looks like a mere normalising constant, but all of thermodynamics can be extracted from it by differentiation. With $\beta = 1/k_BT$:

{{< eq title="Thermodynamics from Z" say="Compute one sum, and energy, free energy, entropy and heat capacity follow by differentiation." >}}
$$ \langle \textcolor{#d4a017}{E} \rangle = -\frac{\partial \ln \textcolor{#12a594}{Z}}{\partial \beta}, \qquad \textcolor{#f08c2e}{F} = -k_BT \ln \textcolor{#12a594}{Z}, \qquad C_V = \frac{\partial \langle E\rangle}{\partial T} = \frac{\langle E^2\rangle - \langle E\rangle^2}{k_BT^2} $$
- $\textcolor{#f08c2e}{F} = U - TS$: the Helmholtz free energy, which is minimised at equilibrium at fixed $T$
- the last form says that heat capacity measures **energy fluctuations**, which is how it is computed from a simulation
{{< /eq >}}

For a classical particle the sum over states becomes an integral over [phase space](../motion-and-phase-space/), $Z = \frac{1}{h^{3N}N!}\int e^{-H(\mathbf r, \mathbf p)/k_BT}\,\mathrm d\mathbf r\,\mathrm d\mathbf p$. Because $H = K(\mathbf p) + V(\mathbf r)$, the integral splits into a momentum part, which can always be done exactly, and a configurational part, which is the hard part that MD and Monte Carlo exist to sample.

### Worked example: a two-level system

The simplest non-trivial partition function belongs to a system with two states separated by an energy $\varepsilon$: a nuclear spin in a magnetic field, a defect that can sit in two positions, a molecule with two conformers. With the lower state at zero energy,

$$
Z = 1 + e^{-\beta\varepsilon}, \qquad \langle E\rangle = -\frac{\partial\ln Z}{\partial\beta} = \frac{\varepsilon}{e^{\beta\varepsilon} + 1}, \qquad \frac{C}{k_B} = \frac{(\beta\varepsilon)^2 e^{\beta\varepsilon}}{(e^{\beta\varepsilon} + 1)^2} .
$$

Proton nuclear magnetic resonance at 400 MHz is a two-level system with $\varepsilon = h\nu = 2.65 \times 10^{-25}$ J, so $\beta\varepsilon = 6.4 \times 10^{-5}$ at 300 K. The excess population of the lower level, $\tanh(\beta\varepsilon/2)$, is $3.2 \times 10^{-5}$: of every million protons, only 32 contribute net signal. That is why NMR needs milligrams of sample, why spectrometers are built around ever stronger magnets, and why hyperpolarisation methods such as dynamic nuclear polarisation, which transfer the much larger polarisation of electron spins to the nuclei, can raise sensitivity by orders of magnitude.

The heat capacity shows a feature the oscillator lacks. It rises from zero as the upper level becomes accessible, peaks at $0.44\,k_B$ when $k_BT = 0.42\,\varepsilon$, and then falls as $1/T^2$, because once the two levels are almost equally populated, more heating cannot put more energy in. This **Schottky anomaly** is observed in paramagnetic salts and in crystals with tunnelling defects at low temperature, and its position gives the splitting $\varepsilon$ directly.

{{< fig src="twolevel.svg" alt="Left: populations of the lower and upper levels of a two-level system against kBT over epsilon, approaching one half from above and below. Right: heat capacity over kB against the same temperature axis, rising to a peak of 0.44 at 0.42 and then decaying" caption="A two-level system, everything computed from $Z = 1 + e^{-\varepsilon/k_BT}$. The upper population never exceeds one half at positive temperature, so the heat capacity peaks (0.44 $k_B$ at $k_BT = 0.42\,\varepsilon$) and then falls: the Schottky anomaly." >}}

{{< note type="practice" title="From the lab" >}}
Simulations almost never compute $Z$, because they do not need to. The Metropolis Monte Carlo algorithm (Metropolis, Rosenbluth, Rosenbluth, Teller and Teller, 1953) proposes a move from state $s$ to $s'$ and accepts it with probability $\min(1, e^{-(E_{s'} - E_s)/k_BT})$; the partition function cancels in the ratio, and the chain visits states with Boltzmann probabilities ([the Monte Carlo chapter](../monte-carlo/)). A molecular dynamics run with a canonical thermostat does the same implicitly. Quantities that depend on $Z$ itself, such as free energies and entropies, are obtained as differences between two states by thermodynamic integration or free-energy perturbation, the subject of [the chapter on free-energy methods](../es-fep-ti/).
{{< /note >}}

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

{{< note type="try" >}}
Press **Heat ×1.5** a few times. Each press scales every velocity by $\sqrt{1.5}$, so $k_BT$ in the readout rises by half and the measured pressure climbs with it, as the ideal gas law below predicts. The histogram keeps its shape while the speed axis stretches, because the distribution depends on speed only through $v/\sqrt{k_BT/m}$: one curve, rescaled, fits every gas at every temperature.
{{< /note >}}

### Worked example: nitrogen and argon at 300 K

Three speeds summarise the distribution. Setting $\mathrm df/\mathrm dv = 0$ gives the peak, and averaging $v$ and $v^2$ over $f_{3\mathrm D}(v)$ gives the other two:

{{< eq title="Three characteristic speeds" say="The peak, the average and the root-mean-square speed all grow as the square root of temperature over mass, in fixed proportions." >}}
$$ \textcolor{#4c6ef5}{v_{\text p}} = \sqrt{\frac{2k_B\textcolor{#e64980}{T}}{\textcolor{#845ef7}{m}}}, \qquad \textcolor{#12a594}{\langle v\rangle} = \sqrt{\frac{8k_B\textcolor{#e64980}{T}}{\pi\textcolor{#845ef7}{m}}}, \qquad \textcolor{#f08c2e}{v_{\text{rms}}} = \sqrt{\langle v^2\rangle} = \sqrt{\frac{3k_B\textcolor{#e64980}{T}}{\textcolor{#845ef7}{m}}} $$
- $\textcolor{#4c6ef5}{v_{\text p}}$: the most probable speed, where $f_{3\mathrm D}(v)$ peaks
- $\textcolor{#12a594}{\langle v\rangle}$: the mean speed, which sets how often molecules collide
- $\textcolor{#f08c2e}{v_{\text{rms}}}$: fixes the mean kinetic energy, $\tfrac12 m v_{\text{rms}}^2 = \tfrac32 k_BT$
- in every three-dimensional gas they stand in the ratio $1 : 1.128 : 1.225$
{{< /eq >}}

Now put in numbers. At 300 K, $k_BT = (1.381 \times 10^{-23}\ \text{J K}^{-1})(300\ \text{K}) = 4.14 \times 10^{-21}$ J. A nitrogen molecule has a mass of $28.01\ \text{u} \times 1.661 \times 10^{-27}\ \text{kg u}^{-1} = 4.65 \times 10^{-26}$ kg, and an argon atom $39.95\ \text{u} = 6.63 \times 10^{-26}$ kg. For nitrogen, $v_{\text p} = \sqrt{2 \times 4.14 \times 10^{-21}\ \text{J}/4.65 \times 10^{-26}\ \text{kg}} = \sqrt{1.78 \times 10^{5}}\ \text{m s}^{-1} = 422$ m s⁻¹, and the other speeds follow from the fixed ratios:

| at 300 K | N₂ (28.01 u) | Ar (39.95 u) |
|---|---|---|
| most probable speed $v_{\text p}$ | 422 m s⁻¹ | 353 m s⁻¹ |
| mean speed $\langle v\rangle$ | 476 m s⁻¹ | 399 m s⁻¹ |
| root-mean-square speed $v_{\text{rms}}$ | 517 m s⁻¹ | 433 m s⁻¹ |
| fraction faster than 1000 m s⁻¹ | 1.05 % | 0.11 % |
| mean kinetic energy $\tfrac32 k_BT$ | $6.21 \times 10^{-21}$ J | $6.21 \times 10^{-21}$ J |

Argon is heavier by a factor 39.95/28.01 = 1.43, so all its speeds are smaller by $\sqrt{1.43} = 1.19$, but its mean kinetic energy, $6.21 \times 10^{-21}$ J or 38.8 meV, is identical. The fraction of very fast molecules is far more sensitive to mass than the averages are, because it lives in the exponential tail: it differs tenfold between two gases whose mean speeds differ by 19 %. For every gas, 4.6 % of the molecules move faster than twice the most probable speed, and only 0.04 % faster than three times it.

{{< fig src="speeds.svg" alt="Left: for nitrogen at 300 kelvin, a rising dashed v squared curve, a falling dashed exponential and their product, a peaked curve with the most probable, mean and rms speeds of 422, 476 and 517 metres per second. Right: speed distributions of argon and nitrogen at 300 kelvin, with the tails above 1000 metres per second shaded" caption="Left: the three-dimensional Maxwell–Boltzmann distribution is the product of a factor that counts velocity directions, $v^2$, and the Boltzmann factor of the kinetic energy. Right: argon peaks at a lower speed than nitrogen, and its tail above 1000 m s⁻¹ (shaded) holds 0.11 % of the atoms against 1.05 % for nitrogen." >}}

{{< note type="warn" title="Myth" >}}
**Myth:** at any temperature, the most likely energy of a system is its lowest one. **Reality:** the Boltzmann factor makes each lowest-energy *microstate* the most probable single microstate, but the probability of an *energy* is the Boltzmann factor times the number of microstates with that energy. For molecular speeds that number grows as $v^2$, so the most probable speed is 422 m s⁻¹, not zero. For a protein the same competition decides folding: the folded state has the lowest enthalpy, but the unfolded state has vastly more conformations, and the protein unfolds once $T\Delta S$ exceeds $\Delta H$. Comparing basins by their lowest energies alone, as a geometry optimisation does, misses this; comparing their free energies, $-k_BT\ln$ of the partition function restricted to each basin, does not.
{{< /note >}}

{{< note type="story" >}}
The first direct measurement of molecular speeds came in 1920, when Otto Stern sent a beam of silver atoms through a rotating apparatus and worked out their speed from how far the apparatus had turned while they were in flight. A precise test of the whole distribution came in 1955, when Robert Miller and Polykarp Kusch at Columbia University sorted potassium and thallium atoms by speed with a rapidly spinning cylinder cut with helical slots, and found the predicted shape in detail, 95 years after Maxwell had derived it.
{{< /note >}}

Sampling makes the same point. Each velocity component of a molecule in equilibrium is an independent Gaussian with variance $k_BT/m$, so drawing three Gaussian numbers per molecule produces a perfect Maxwell–Boltzmann gas. That is exactly how MD codes assign initial velocities.

{{< py title="Sampling molecular speeds" >}}
import numpy as np
kB, u, T = 1.380649e-23, 1.66053907e-27, 300.0
rng = np.random.default_rng(42)
for gas, M in [("N2", 28.014), ("Ar", 39.948)]:
    m = M * u                                   # molecular mass, kg
    sigma = np.sqrt(kB * T / m)                 # spread of each velocity component
    v = rng.normal(0.0, sigma, size=(200_000, 3))
    s = np.linalg.norm(v, axis=1)               # speeds
    ke = 0.5 * m * (v**2).sum(axis=1).mean() / (kB * T)
    print(f"{gas}: sampled mean {s.mean():5.1f}  rms {np.sqrt((s**2).mean()):5.1f} m/s,"
          f"  <KE> = {ke:.3f} kBT,  faster than 1000 m/s: {(s > 1000).mean():.2%}")
    print(f"    formula mean {np.sqrt(8*kB*T/(np.pi*m)):5.1f}  rms {np.sqrt(3*kB*T/m):5.1f} m/s,"
          f"  most probable {np.sqrt(2*kB*T/m):5.1f} m/s")
{{< /py >}}

With 200 000 molecules per gas, the sampled mean and rms speeds agree with the formulas to within a few tenths of a per cent, the mean kinetic energy comes out at 1.50 $k_BT$ for both gases, and the fractions above 1000 m s⁻¹ reproduce the table.

{{< note type="fun" >}}
Sound in nitrogen at 300 K travels at about 353 m s⁻¹, slower than the average molecule. That is no coincidence: sound is a pressure wave handed from molecule to molecule by collisions, so it cannot outrun the molecules that carry it. For an ideal gas the speed of sound is $\sqrt{\gamma k_BT/m}$, with $\gamma = C_P/C_V = 1.4$ for a diatomic gas, which is 68 % of the rms speed.
{{< /note >}}

## Equipartition

Now tick "two species". The orange particles are four times heavier but start with the same speed, so each carries four times the kinetic energy of a light particle. Watch the readout of mean kinetic energy: within a short time the two species have the **same** average kinetic energy, and the heavy particles move half as fast. This is the **equipartition theorem**:

{{< eq title="Equipartition of energy" say="Every quadratic term in the energy holds, on average, half of kT, whatever the mass or stiffness." >}}
$$ \left\langle \tfrac12 \textcolor{#845ef7}{m} v_x^2 \right\rangle = \tfrac12 k_B\textcolor{#e64980}{T} \quad\Longrightarrow\quad \langle K \rangle_{3\mathrm D} = \tfrac32 k_BT, \qquad \langle K \rangle_{2\mathrm D} = k_BT $$
- holds for every term of the form $a\,x^2$ in a classical Hamiltonian: each momentum component, and each harmonic spring
- a classical harmonic solid therefore stores $3k_BT$ per atom (the Dulong–Petit law), until [quantum freezing](../quantum-energy-levels/) sets in at low temperature
{{< /eq >}}

Equipartition is how MD codes **measure** temperature. They compute the instantaneous kinetic temperature $T = \frac{2\langle K \rangle}{N_{\text{df}}\,k_B}$, with $N_{\text{df}}$ the number of degrees of freedom (about $3N$, less any constraints), and a thermostat nudges velocities to keep it near the target. It also explains the classical-MD error discussed earlier: equipartition gives every vibration $k_BT$, even those that quantum mechanics would freeze.

{{< note type="practice" >}}
MD codes start a run by drawing every velocity component from a Gaussian of variance $k_BT/m$, and then usually subtract the centre-of-mass velocity so that the system does not drift. Both choices change the count of degrees of freedom in $T = 2K/(N_{\text{df}}k_B)$: removing the centre-of-mass motion takes away 3, and each holonomic constraint takes away 1. A rigid water molecule has 9 coordinates and 3 constraints, hence 6 degrees of freedom, so 50 rigid waters with the drift removed have $N_{\text{df}} = 50 \times 6 - 3 = 297$. Get the count wrong and the reported temperature is wrong by the same ratio, and a thermostat working from it holds the system at the wrong temperature.
{{< /note >}}

{{< note type="warn" >}}
Equipartition is a property of equilibrium, and a thermostat can quietly break it. Rescaling all velocities by a common factor to hit the target kinetic energy, as the simplest thermostats do, slowly drains energy from high-frequency vibrations into the slowest motions, the overall translation and rotation of the system. Run long enough and the molecules freeze internally while the whole system sails through the box, an artefact that Harvey, Tan and Cheatham named the **flying ice cube** in 1998. Removing the centre-of-mass motion and using a thermostat that samples the canonical ensemble properly, such as Langevin dynamics, Nosé–Hoover chains or the stochastic velocity rescaling of Bussi, Donadio and Parrinello (2007), avoids it ([the chapter on thermostats](../thermostats-and-barostats/)).
{{< /note >}}

## Pressure from collisions

Pressure is the momentum delivered to the walls per unit time per unit area. A particle bouncing off a wall reverses its normal velocity and delivers momentum $2m|v_x|$. Averaging over the Maxwell–Boltzmann distribution gives the **ideal gas law**:

{{< eq title="The ideal gas law from kinetic theory" say="Pressure is the momentum flux of molecules hitting the wall, and the average kinetic energy is set by T." >}}
$$ \textcolor{#f08c2e}{P}\,V = N\,k_B\textcolor{#e64980}{T} \qquad\text{(in 2D: } P\,A = N k_BT \text{, with } P \text{ a force per unit length)} $$
- per mole: $PV = nRT$, with $R = N_A k_B = 8.314$ J mol⁻¹ K⁻¹
{{< /eq >}}

The lab measures pressure by adding up the momentum transferred to the walls. Compare it with the ideal-gas value: the measured pressure is somewhat higher, because the disks have a finite size and the free area is smaller than the box. That is the excluded-volume correction in van der Waals's equation, and the starting point of the theory of real gases and liquids. In MD, pressure is computed from the **virial**, $PV = Nk_BT + \frac{1}{d}\left\langle \sum_i \mathbf r_i \cdot \mathbf F_i \right\rangle$ in $d$ dimensions, which adds the interparticle forces to the kinetic term ([the MD chapter](../molecular-dynamics/)).

## Where classical statistics stops

Everything above treats molecules as distinguishable classical particles, each state occupied independently with probability proportional to $e^{-E/k_BT}$. That is valid only when the average number of particles per single-particle quantum state is much less than one, so that two identical particles almost never compete for the same state. The test is the number of particles in a cube whose side is the thermal wavelength of [the quantum chapter](../quantum-energy-levels/), $n\Lambda^3$, where $n$ is the number density.

For nitrogen at 300 K and 1 atm, $n = P/k_BT = 2.45 \times 10^{25}$ m⁻³ and $\Lambda = 0.19$ Å, so $n\Lambda^3 = 1.7 \times 10^{-7}$: the gas is classical by seven orders of magnitude. For the conduction electrons of copper, $n = 8.47 \times 10^{28}$ m⁻³ and, with the electron mass, $\Lambda = 43$ Å at 300 K, so $n\Lambda^3 \approx 7 \times 10^3$. The electrons are crowded thousands to a state's worth of space, and the Pauli principle forces them into **Fermi–Dirac** statistics: they fill every level up to the Fermi energy, 7.0 eV for copper, equivalent to a temperature of 81,000 K.

The consequence was a famous failure of classical physics. Paul Drude's 1900 model of a metal treated the electrons as a classical gas, which by equipartition should add $\tfrac32 R = 12.5$ J mol⁻¹ K⁻¹ to the heat capacity. The measured electronic heat capacity of copper is $\gamma T$ with $\gamma = 0.695$ mJ mol⁻¹ K⁻², or 0.21 J mol⁻¹ K⁻¹ at 300 K, under 2 % of the classical value. Arnold Sommerfeld resolved the puzzle in 1928: only electrons within about $k_BT$ of the Fermi level have empty states to move into, a fraction of order $k_BT/E_F \approx 0.004$, and only they can absorb heat. Bosons go the other way. When $n\Lambda^3$ of an ideal Bose gas reaches 2.612, a macroscopic fraction of the particles drops into the single lowest state; Eric Cornell and Carl Wieman's group reached this Bose–Einstein condensate in 1995 in a dilute rubidium vapour at about 170 nK.

{{< note type="practice" title="From the lab" >}}
Both regimes appear in one ab initio MD run of a metal. The nuclei are classical and follow Maxwell–Boltzmann statistics, thermostatted at the target temperature. The electrons are treated with Fermi–Dirac occupations, and DFT codes smear the occupations near the Fermi level, with Fermi–Dirac, Gaussian, Methfessel–Paxton or Marzari–Vanderbilt functions of width typically 0.05 to 0.2 eV, so that the sum over the Brillouin zone converges with an affordable number of k-points. With Fermi–Dirac smearing the quantity minimised is Mermin's free energy, not the energy, and forces are consistent with that free energy; monitoring the energy instead of the free energy in an NVE run makes a correct simulation look as if it drifts. When the electronic temperature is meant to be physical, as in simulations of warm dense matter or laser-heated metals, the smearing is set to $k_BT$ itself.
{{< /note >}}

{{< note type="key" >}}
- A system at temperature $T$ visits microstate $s$ with probability $e^{-E_s/k_BT}/Z$; the partition function $Z$ yields energy, free energy, entropy and heat capacity.
- Speeds in a gas follow the Maxwell–Boltzmann distribution, which collisions produce from any starting point.
- The most probable, mean and rms speeds scale as $\sqrt{k_BT/m}$ in the ratio $1 : 1.128 : 1.225$; for N₂ at 300 K they are 422, 476 and 517 m s⁻¹.
- Classically every quadratic degree of freedom holds $\tfrac12 k_BT$ (equipartition). This is how MD defines its temperature, and pressure follows from the momentum flux and the virial.
- The Boltzmann factor is steep: with a 50 kJ/mol barrier a 10 K rise near room temperature doubles a rate. Classical statistics requires $n\Lambda^3 \ll 1$; it holds for molecules in a gas ($10^{-7}$) and fails for electrons in a metal ($10^{4}$), which obey Fermi–Dirac statistics.
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
- q: "The most probable speed of N₂ (28 u) at 300 K is 422 m/s. What is it for argon (40 u) at the same temperature?"
  options: ["422 m/s, because the temperature is the same", "About 353 m/s", "About 600 m/s"]
  answer: 1
  why: "Speeds scale as $1/\\sqrt m$: $422 \\times \\sqrt{28/40} \\approx 353$ m/s. The mean kinetic energy is the same for both gases."
- q: "A simulation holds 50 rigid water molecules, with the centre-of-mass motion removed. How many degrees of freedom enter the kinetic temperature?"
  options: ["450", "297", "300"]
  answer: 1
  why: "Each rigid water has 9 coordinates minus 3 constraints, so 6 degrees of freedom; removing the centre-of-mass motion subtracts 3 more: $50 \\times 6 - 3 = 297$."
- q: "Why does the classical equipartition value of $\\tfrac32 k_B$ per conduction electron fail for copper at room temperature?"
  options: ["The electrons are too light to move", "Their thermal wavelength is so large that $n\\Lambda^3 \\approx 10^4$; they obey Fermi–Dirac statistics and only those near the Fermi level can absorb heat", "Electrons have no kinetic energy in a metal"]
  answer: 1
  why: "With $E_F = 7.0$ eV, only a fraction of order $k_BT/E_F \\approx 0.004$ of the electrons can be excited, so the electronic heat capacity is under 2 % of the classical value."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. D. V. Schroeder, *An Introduction to Thermal Physics*, Addison-Wesley (2000), chapter 6 (Boltzmann factor, partition function, equipartition, the Maxwell speed distribution).
2. J. C. Maxwell, "Illustrations of the dynamical theory of gases", *Philosophical Magazine* **19**, 19 (1860).
3. L. Boltzmann, "Weitere Studien über das Wärmegleichgewicht unter Gasmolekülen", *Wiener Berichte* **66**, 275 (1872).
4. D. Chandler, *Introduction to Modern Statistical Mechanics*, Oxford University Press (1987), chapter 3.
5. D. Frenkel and B. Smit, *Understanding Molecular Simulation*, 3rd ed., Academic Press (2023), chapter 2 (statistical mechanics for simulation: temperature and pressure estimators).
6. M. P. Allen and D. J. Tildesley, *Computer Simulation of Liquids*, 2nd ed., Oxford University Press (2017), chapter 2.
7. R. C. Miller and P. Kusch, "Velocity distributions in potassium and thallium atomic beams", *Physical Review* **99**, 1314 (1955).
8. S. C. Harvey, R. K.-Z. Tan and T. E. Cheatham, "The flying ice cube: velocity rescaling in molecular dynamics leads to violation of energy equipartition", *Journal of Computational Chemistry* **19**, 726 (1998).
9. G. Bussi, D. Donadio and M. Parrinello, "Canonical sampling through velocity rescaling", *Journal of Chemical Physics* **126**, 014101 (2007).

</div>
