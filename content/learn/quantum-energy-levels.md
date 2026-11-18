---
title: "Quantum energy levels"
description: "Why energy comes in steps: the Schrödinger equation, the particle in a box, the harmonic oscillator and zero-point energy, how quantum turns into classical at high energy, and how temperature populates the levels. The bridge from quantum mechanics to statistical mechanics."
hook: "At room temperature fewer than one C–H bond in a million is vibrationally excited, yet a classical simulation gives each one a full kBT of energy. Energy comes in steps, and this chapter shows when the steps matter."
objectives:
  - "Explain how boundary conditions quantise energy in a box and in an oscillator"
  - "Compute level spacings for real motions and compare them with the thermal energy kBT"
  - "Estimate thermal populations, zero-point energies and the kinetic isotope effect of a bond"
  - "Explain the correspondence principle by comparing quantum and classical probability densities"
  - "Choose between classical and quantum nuclei using ħω/kBT and the thermal wavelength"
cover: "cover.svg"
milestones:
  - year: 1900
    text: "Planck introduces energy quanta to explain black-body radiation"
  - year: 1907
    text: "Einstein explains the falling heat capacity of solids with quantised oscillators"
  - year: 1924
    text: "De Broglie proposes that every particle has a wavelength h/p"
  - year: 1926
    text: "Schrödinger publishes his wave equation and solves the hydrogen atom"
track: physics
weight: 2
level: Foundation
minutes: 55
prereqs: ["motion-and-phase-space"]
lab: "Explore energy levels, wavefunctions and thermal populations"
---

## Why a simulation chapter needs quantum mechanics

Molecular dynamics moves nuclei with Newton's laws, as in [the previous chapter](../motion-and-phase-space/). Yet the forces between atoms come from electrons, which obey quantum mechanics, and even the nuclei are quantum particles. This chapter answers two questions every simulator should be able to answer. Where does quantisation come from? And when is it safe to forget about it?

## Waves of matter

In 1924 de Broglie proposed that every particle with momentum $p$ behaves like a wave of wavelength $\lambda = h/p$, where $h = 6.626 \times 10^{-34}$ J s is Planck's constant. For a cricket ball of 160 g bowled at 40 m s⁻¹ the wavelength is about $10^{-34}$ m, absurdly small; for the electron in a hydrogen atom, with its kinetic energy of 13.6 eV, it is 3.3 Å, exactly the circumference of the first Bohr orbit and about the size of the atom, and wave behaviour dominates. The state of a quantum particle is described by a **wavefunction** $\psi(x)$, and the probability of finding the particle near $x$ is $|\psi(x)|^2\,\mathrm dx$ (Born's rule).

States of definite energy satisfy the time-independent **Schrödinger equation**, in which the classical energy $p^2/2m + V$ becomes an operator:

{{< eq title="The time-independent Schrödinger equation" say="Kinetic energy measures how sharply the wave curves; a wave fits the potential only at special energies." >}}
$$ \underbrace{-\frac{\hbar^2}{2\textcolor{#845ef7}{m}}\frac{\mathrm d^2\psi}{\mathrm dx^2}}_{\text{kinetic: curvature}} + \textcolor{#4c6ef5}{V}(x)\,\psi = \textcolor{#d4a017}{E}\,\psi $$
- $\hbar = h/2\pi$: the reduced Planck constant
- $\psi(x)$: the wavefunction; $|\psi|^2$ is a probability density, so $\int |\psi|^2 \mathrm dx = 1$
- $\textcolor{#d4a017}{E}$: only certain values allow a solution that stays finite, and those are the energy levels
{{< /eq >}}

The equation itself is not mysterious: it says that a wave curves more sharply where the kinetic energy $E - V$ is larger. What creates quantisation is the **boundary condition**. A confined wave has to fit inside its container, like the standing wave on a guitar string, and only a discrete set of wavelengths do.

## The particle in a box

Trap a particle between two impenetrable walls, $V = 0$ for $0 < x < L$ and $V = \infty$ outside. The wavefunction must vanish at both walls, so it must be a sine wave with a whole number of half-wavelengths in the box:

{{< eq title="Particle in a box" say="Halve the box and every level rises fourfold: confinement costs energy." >}}
$$ \psi_n(x) = \sqrt{\tfrac{2}{L}}\,\sin\frac{n\pi x}{L}, \qquad \textcolor{#d4a017}{E_n} = \frac{n^2 \pi^2 \hbar^2}{2\textcolor{#845ef7}{m}\,\textcolor{#4c6ef5}{L}^2}, \qquad n = 1, 2, 3, \dots $$
- $n$: the number of half-wavelengths, which is also the number of bumps in $|\psi|^2$
- the levels spread apart as $n^2$; there is no $n = 0$, so even the lowest state moves
{{< /eq >}}

Three consequences matter for materials. Energy is **quantised**. The lowest energy is **not zero**: squeezing a particle into a small space forces short wavelengths and therefore kinetic energy, the reason electrons do not collapse into the nucleus. And the spacing falls as $1/L^2$, so in a big box the levels are so close that the energy looks continuous. Quantum dots exploit the $1/L^2$ law: the smaller the nanocrystal, the larger its gap and the bluer its light.

{{< note type="practice" title="From the lab" >}}
Colloidal CdSe nanocrystals are the standard example. Bulk CdSe has a band gap of about 1.7 eV and emits at the red edge of the visible, near 710 nm; crystals a few nanometres across emit anywhere from blue to red, set by their diameter alone. Louis Brus wrote the quantitative model in 1984 by adding the particle-in-a-sphere confinement energies of the electron and the hole, $\hbar^2\pi^2/2R^2$ divided by each carrier's effective mass, to the bulk gap and subtracting their Coulomb attraction, which scales only as $1/R$. Because the effective masses in semiconductors are fractions of the free-electron mass, confinement in a 2 nm dot raises the gap by tenths of an electronvolt, enough to move the emission across the visible spectrum. Alexei Ekimov, who first observed size-dependent colours in glass-embedded nanocrystals, Brus, and Moungi Bawendi, whose 1993 hot-injection synthesis made monodisperse dots routine, shared the 2023 Nobel Prize in Chemistry. In practice the measured absorption onset is used in reverse, through empirical sizing curves, to determine the diameter of a batch of dots.
{{< /note >}}

### How big are the steps?

Two numbers show why the same formula describes very different physics. For an electron confined to a box 1 nm wide, a typical quantum-dot size, $E_1 = h^2/8mL^2 = 0.38$ eV, and the first gap is $E_2 - E_1 = 3E_1 = 1.1$ eV, the energy of a near-infrared photon and more than 40 times the thermal energy $k_BT$ (25.9 meV at room temperature). Electrons in nanostructures are quantum through and through.

Now put a nitrogen molecule, of mass $4.65 \times 10^{-26}$ kg, in a box 1 cm wide, a fair model of translation in a gas. Its ground level is $E_1 = 1.2 \times 10^{-38}$ J, about $3 \times 10^{-18}\,k_BT$ at 300 K. Thermal energy reaches levels up to $n \approx \sqrt{k_BT/E_1} \approx 6 \times 10^8$, and there neighbouring rungs are separated by $2nE_1 \approx 3 \times 10^{-9}\,k_BT$. No experiment could resolve steps that fine: the translation of molecules in a gas is classical to an excellent approximation. The vibrations of chemical bonds turn out to be the opposite case.

{{< note type="practice" title="Back of the envelope" >}}
Shrink the box to 1 Å, the size of an atom or a bond, and compare three particles. For an electron $E_1 = h^2/8mL^2 = 37.6$ eV, nearly 1,500 times $k_BT$ at 300 K: electrons in molecules are always in their quantum ground state, which is why electronic structure methods such as density functional theory usually solve for the electronic ground state and let temperature enter through the motion of the nuclei. A proton, 1,836 times heavier, has $E_1 = 0.020$ eV, or 0.79 $k_BT$: borderline. A carbon atom has $E_1 = 0.0017$ eV, or 0.07 $k_BT$, and moves classically. One formula with three masses explains the standard division of labour in simulation: quantum electrons, mostly classical nuclei, and special care for hydrogen.
{{< /note >}}

## The harmonic oscillator

Near the bottom of any valley the potential is a parabola, $V = \tfrac12 m\omega^2 x^2$, so the harmonic oscillator describes every chemical bond vibration and every phonon in a crystal. Its levels are equally spaced:

{{< eq title="Quantum harmonic oscillator" say="A ladder of evenly spaced rungs that starts half a rung above the floor." >}}
$$ \textcolor{#d4a017}{E_n} = \left(n + \tfrac12\right)\hbar\textcolor{#12a594}{\omega}, \qquad n = 0, 1, 2, \dots $$
- $\textcolor{#12a594}{\omega}$: the classical angular frequency $\sqrt{k/m}$
- $\tfrac12\hbar\omega$: the **zero-point energy**, which a quantum oscillator keeps even at absolute zero
- the wavefunctions are Gaussians times Hermite polynomials, $\psi_n \propto H_n(\xi)\,e^{-\xi^2/2}$ with $\xi = x\sqrt{m\omega/\hbar}$
{{< /eq >}}

{{< widget name="quantum" title="Energy levels, wavefunctions and thermal populations" caption="Left: the potential (blue), the levels (dashed) and each level's wavefunction drawn at its energy; the highlighted level is orange. Switch to |ψ|² and turn on the classical overlay to compare with where a classical particle of the same energy spends its time. The bars show how temperature shares the system among the levels (units with ħ = m = 1)." >}}

{{< note type="try" >}}
Choose the harmonic oscillator with $\omega = 1$ and set $k_BT = 0.1$: the ground state holds essentially all of the population, and the thermal mean energy sits at the zero-point value 0.5, five times the classical prediction of 0.1. Raise $k_BT$ to 5 and the mean energy, 5.02, is within half a per cent of the classical $k_BT$. Then switch to the particle in a box and drag $L$ from 4 down to 1: every level climbs sixteenfold.
{{< /note >}}

Zero-point energy is measurable and important. It is why liquid helium does not freeze at normal pressure, it shifts reaction barriers and bond lengths, and it makes deuterated molecules react more slowly than ordinary ones (the kinetic isotope effect), because the heavier isotope has a lower $\tfrac12\hbar\omega$.

{{< note type="warn" title="Myth" >}}
**Myth:** at absolute zero the atoms stand still. **Reality:** a ground-state oscillator has a Gaussian spread of positions with standard deviation $\sqrt{\hbar/2\mu\omega}$, and half of its zero-point energy is kinetic. For a C–H stretch at 3000 cm⁻¹, with $\mu = 0.930$ u, the spread is 0.078 Å, 7 % of the 1.09 Å bond length, at any temperature up to several hundred kelvin. Bond lengths from diffraction are averages over this motion, and an optimised geometry from a quantum chemistry code, which sits at the bottom of the well, is not the same quantity as a measured one.
{{< /note >}}

### Worked example: the kinetic isotope effect

Replace the hydrogen of a C–H bond by deuterium. The force constant, set by the electrons, stays the same, but the reduced mass rises from $\mu_{\mathrm{CH}} = (12 \times 1.008)/13.008 = 0.930$ u to $\mu_{\mathrm{CD}} = (12 \times 2.014)/14.014 = 1.725$ u. Since $\omega = \sqrt{k/\mu}$, the stretch frequency falls by a factor $\sqrt{1.725/0.930} = 1.36$, from about 3000 cm⁻¹ to about 2200 cm⁻¹. The zero-point energies are then about 1500 and 1100 cm⁻¹, a difference of 400 cm⁻¹, or 4.8 kJ/mol.

Now suppose a reaction breaks this bond, and that at the transition state the stretch has turned into the motion along the reaction path, so it no longer holds zero-point energy. The C–D bond starts 4.8 kJ/mol lower in its well but must reach the same transition state, so its barrier is higher by that amount. With $k_BT$ equal to 208.5 cm⁻¹ at 300 K, its rate is lower by

$$
\frac{k_{\mathrm H}}{k_{\mathrm D}} \approx e^{\Delta\mathrm{ZPE}/k_BT} = e^{400/208.5} \approx 6.8 \quad \text{at 300 K.}
$$

Measured primary isotope effects for breaking C–H bonds at room temperature are indeed a few, up to about 7. They are smaller when the transition state keeps part of the zero-point energy, and much larger values are taken as evidence that the hydrogen tunnels through the barrier, a still more quantum effect. Classical statistical mechanics predicts that equilibrium structures and populations do not depend on isotopic mass at all, and that rates change only through the speed of crossing the barrier, by at most about $\sqrt 2$ for hydrogen against deuterium.

{{< fig src="kie.svg" alt="A reaction energy profile with a well and a barrier of about 38 kilojoules per mole; inside the well an orange C–H zero-point level at 17.9 and a blue C–D level at 13.2 kilojoules per mole, with arrows from each level up to the transition-state energy" caption="The isotopes share one potential energy surface, but the C–D bond sits 4.8 kJ/mol lower in the well because of its smaller zero-point energy. If the transition state keeps no zero-point energy in this mode, deuterium faces a barrier higher by that amount, and $k_\mathrm{H}/k_\mathrm{D} \approx 6.8$ at 300 K. The profile is illustrative; the zero-point energies are those of the worked example." >}}

### Tunnelling

{{< note type="try" title="Pause and predict" >}}
A classical oscillator with the ground-state energy $\tfrac12\hbar\omega$ never moves beyond its turning points. What fraction of the time does the quantum ground state spend outside them: none, about 1 %, or about 16 %?
{{< /note >}}

The answer is 15.7 %, the value of $\operatorname{erfc}(1)$ for the Gaussian ground state. A wavefunction does not stop at a turning point; inside a barrier it decays as $e^{-\kappa x}$ with $\kappa = \sqrt{2m(V - E)}/\hbar$, and if the barrier is thin enough some amplitude emerges on the other side. For a barrier of width $a$ the transmission probability is approximately $e^{-2\kappa a}$, exponential in both the width and the square root of the mass.

Take a barrier 0.2 eV above the particle's energy and 0.5 Å wide, the scale of a hydrogen transfer between two oxygen or carbon atoms. The exponent $2\kappa a$ is 0.23 for an electron, 9.8 for a proton, 13.9 for a deuteron and 33.9 for a carbon atom, so the tunnelling factors are 0.80, $5 \times 10^{-5}$, $9 \times 10^{-7}$ and $2 \times 10^{-15}$. Hydrogen tunnels about 60 times more readily than deuterium through the same barrier, far more than the zero-point effect alone, and heavier atoms essentially never tunnel at room temperature. This is why kinetic isotope effects well above 7 are read as a signature of tunnelling: in the enzyme soybean lipoxygenase-1, Judith Klinman's group measured $k_\mathrm{H}/k_\mathrm{D} \approx 80$ for the hydrogen transfer at room temperature.

{{< fig src="tunnelling.svg" alt="Horizontal bar chart on a logarithmic axis of the tunnelling factor for an electron, a proton, a deuteron and a carbon atom through the same barrier; the factors are 0.8, 5.4 times ten to the minus 5, 9.4 times ten to the minus 7 and 1.9 times ten to the minus 15" caption="The tunnelling factor $e^{-2\kappa a}$ through a barrier 0.2 eV high and 0.5 Å wide. Doubling the mass from H to D lowers it 58-fold; carbon, twelve times heavier than H, is ten orders of magnitude further down." >}}

In simulations, nuclear tunnelling is captured by path-integral methods such as ring-polymer molecular dynamics and instanton rate theory, or added to transition-state theory as a multiplicative correction such as the Wigner factor $1 + (\hbar\omega_b/k_BT)^2/24$, where $\omega_b$ is the imaginary frequency at the barrier top; the Wigner factor is accurate only when the correction is small.

## From quantum to classical

Highlight a high level in the lab and switch to $|\psi|^2$. The quantum probability oscillates rapidly, but its average follows the teal dashed curve, the **classical** probability density: a classical oscillator moves fastest through the centre and slowest near the turning points, so it spends most of its time near the edges,

$$
\rho_{\text{cl}}(x) = \frac{1}{\pi\sqrt{a^2 - x^2}}, \qquad a = \text{amplitude}.
$$

At high quantum number the two agree, as Bohr's **correspondence principle** demands. There is also a geometric bridge. The classical orbit of an oscillator with energy $E_n = (n + \tfrac12)\hbar\omega$ encloses an area $2\pi E_n/\omega = (n + \tfrac12)h$ in phase space, so successive quantum states are separated by exactly one cell of area $h$, the yardstick used in [the worked example on a CO bond](../motion-and-phase-space/). Statistical mechanics uses the same rule when it counts classical states as phase-space volume divided by $h^{3N}$. Quantum effects matter when the level spacing is comparable to the energy available, and that brings temperature in.

## Temperature populates the levels

At temperature $T$ a system in contact with its surroundings occupies level $n$ with a probability given by the **Boltzmann distribution**, derived in [the chapter on Boltzmann and Maxwell](../boltzmann-and-maxwell/):

{{< eq title="Thermal populations" say="Each extra kT of energy costs a factor e in probability." >}}
$$ p_n = \frac{e^{-\textcolor{#d4a017}{E_n}/k_B\textcolor{#e64980}{T}}}{Z}, \qquad Z = \sum_n e^{-E_n/k_BT} $$
- $k_B = 1.381 \times 10^{-23}$ J K⁻¹: Boltzmann's constant; at 300 K, $k_BT = 25.9$ meV $= 208$ cm⁻¹
- $Z$: the partition function, which just normalises the probabilities
{{< /eq >}}

Slide the temperature in the lab. When $k_BT \ll \hbar\omega$ almost everything sits in the ground state, and the oscillator is **frozen**: it cannot absorb heat, and its thermal energy is pinned at the zero-point value. When $k_BT \gg \hbar\omega$ many levels are populated, and the mean energy approaches the classical value $k_BT$ (for the box, $k_BT/2$), as the statistics row shows.

The numbers for real molecules are revealing. A C–H stretch vibrates at about 3000 cm⁻¹, so $\hbar\omega/k_BT \approx 14$ at room temperature and the ground state holds 99.9999 % of the molecules: that vibration is completely quantum. A soft torsion or lattice mode at 200 cm⁻¹ has $\hbar\omega/k_BT \approx 1$, and is close to classical. Einstein used exactly this freezing-out to explain in 1907 why the heat capacity of solids falls at low temperature.

{{< note type="story" >}}
Diamond was a known exception to the Dulong–Petit rule long before quantum theory: at room temperature its molar heat capacity is about 6.1 J mol⁻¹ K⁻¹, a quarter of the classical $3R = 24.9$ J mol⁻¹ K⁻¹, and H. F. Weber had measured it falling further on cooling. In 1907 Einstein treated each atom as three oscillators with Planck's quantised energies. With a single frequency corresponding to $\hbar\omega/k_B \approx 1300$ K, his formula gives 6.2 J mol⁻¹ K⁻¹ at room temperature and follows the trend of Weber's data, one of the first applications of quantum ideas to matter rather than to light.
{{< /note >}}

{{< fig src="diamond.svg" alt="Molar heat capacity of diamond against temperature from 0 to 2000 kelvin in the Einstein model; the curve rises from zero, passes 6.2 at 298 kelvin next to a measured point near 6.1, and approaches the dashed Dulong–Petit line at 24.9" caption="Einstein's model with a single frequency, ħω/$k_B$ = 1300 K, reproduces the room-temperature heat capacity of diamond (6.2 against about 6.1 J mol⁻¹ K⁻¹ measured) and reaches the classical 3R only above about 1500 K. At low temperature the model falls exponentially, too steeply; the real solid has a spread of frequencies, and Debye's 1912 model gives the observed $T^3$ law." >}}

### Translation, rotation and vibration side by side

The ratio of a level spacing to $k_BT$ sorts the motions of molecules at room temperature into classical and quantum. At 300 K, $k_BT$ corresponds to 208.5 cm⁻¹:

| motion | example | level spacing | spacing / $k_BT$ | at 300 K |
|---|---|---|---|---|
| translation | N₂ in a 1 cm box | $7 \times 10^{-7}$ cm⁻¹ near thermal energies | $3 \times 10^{-9}$ | classical |
| rotation | N₂, first gap $2B$ | 4.0 cm⁻¹ | 0.02 | classical |
| rotation | H₂, first gap $2B$ | 122 cm⁻¹ | 0.58 | mildly quantum |
| soft vibration | torsion or lattice mode | 100–200 cm⁻¹ | 0.5–1 | nearly classical |
| bond stretch | C=O | 1700 cm⁻¹ | 8.2 | frozen |
| bond stretch | C–H | 3000 cm⁻¹ | 14.4 | frozen |

### Worked example: one C–H stretch at 300 K

Follow a single C–H stretch through the numbers. Its quantum is $\hbar\omega = hc\tilde\nu = (6.626 \times 10^{-34}\ \text{J s})(2.998 \times 10^{10}\ \text{cm s}^{-1})(3000\ \text{cm}^{-1}) = 5.96 \times 10^{-20}$ J, which is 0.372 eV or 35.9 kJ/mol. At 300 K, $k_BT = 4.14 \times 10^{-21}$ J, so $x = \hbar\omega/k_BT = 14.4$.

- The fraction of oscillators above the ground state is $e^{-x} = 5.6 \times 10^{-7}$, about one in 1.8 million.
- The thermal energy above the zero point is $\hbar\omega/(e^{x} - 1) = 2.1 \times 10^{-7}$ eV. Classical MD gives the mode $k_BT = 0.026$ eV, about $10^5$ times too much.
- The zero-point energy, $\tfrac12\hbar\omega = 0.19$ eV or 17.9 kJ/mol, is seven times $k_BT$, and classical MD leaves it out entirely.
- The mode's heat capacity is $k_B x^2 e^x/(e^x - 1)^2 = 1.2 \times 10^{-4}\,k_B$, against the classical $k_B$.

Classical mechanics therefore gets this mode wrong in two opposite ways: far too much thermal energy, and no zero-point energy at all. The cell below repeats the calculation for a range of modes.

{{< py title="Which vibrations are frozen at 300 K?" >}}
import numpy as np
h, c, kB = 6.62607015e-34, 2.99792458e10, 1.380649e-23   # SI, but c in cm/s
T = 300.0
modes = {"lattice mode": 100, "torsion": 200, "C-C stretch": 1000,
         "C=O stretch": 1700, "C-H stretch": 3000}        # wavenumbers, cm^-1
print(f"{'mode':13s}{'x':>7s}{'excited':>10s}{'E_th/kBT':>10s}{'C/kB':>9s}{'ZPE/kBT':>9s}")
for name, nu in modes.items():
    x = h * c * nu / (kB * T)              # level spacing in units of kB*T
    excited = np.exp(-x)                   # fraction of oscillators above n = 0
    E_th = x / np.expm1(x)                 # thermal energy above zero point / kB*T
    C = x**2 * np.exp(x) / np.expm1(x)**2  # heat capacity / kB
    print(f"{name:13s}{x:7.2f}{excited:10.1e}{E_th:10.2g}{C:9.2g}{x / 2:9.2f}")
print("classical MD: E_th/kBT = 1 and C/kB = 1 for every mode, ZPE = 0")
{{< /py >}}

The output shows the crossover. Modes below about 200 cm⁻¹ keep most of their classical thermal energy and heat capacity; a C–C stretch near 1000 cm⁻¹ already holds only 4 % of its classical thermal energy; and stiffer bonds are frozen while carrying zero-point energies of several $k_BT$.

{{< fig src="modes.svg" alt="Two curves against vibrational wavenumber on a logarithmic axis from 5 to 4200 inverse centimetres: heat capacity over kB in blue and thermal energy over kBT in orange, both near 1 at low wavenumber and falling to zero above about 1500; markers for lattice, torsion, C–C, C=O and C–H modes" caption="The fraction of its classical heat capacity (blue) and thermal energy (orange) that a harmonic mode keeps at 300 K. The heat capacity survives to higher frequency than the energy, but both have vanished by 1700 cm⁻¹, where classical MD still assigns each mode the full $k_B$ and $k_BT$." >}}

## Is classical molecular dynamics allowed?

Classical MD treats nuclei as points obeying Newton's laws, so it gives each vibration $k_BT$ of energy whether or not it should. A useful yardstick is the **thermal de Broglie wavelength**, the typical quantum blur of a particle at temperature $T$:

{{< eq title="Thermal de Broglie wavelength" say="If the quantum blur is much smaller than the gap between atoms, treat the atoms as classical." >}}
$$ \Lambda = \frac{h}{\sqrt{2\pi\,\textcolor{#845ef7}{m}\,k_B\textcolor{#e64980}{T}}} $$
- argon at 300 K: $\Lambda \approx 0.16$ Å, far below its 3.4 Å atomic size, so classical is excellent
- a hydrogen atom at 300 K: $\Lambda \approx 1.0$ Å, comparable to bond lengths, so quantum effects can matter
{{< /eq >}}

The same yardstick separates ordinary liquids from quantum ones. Helium at 4 K has $\Lambda = 4.4$ Å, larger than the 3.6 Å spacing between atoms in the liquid, and liquid helium is the textbook quantum liquid: it stays liquid down to absolute zero at normal pressure and becomes superfluid below 2.17 K. Conduction electrons at 300 K have $\Lambda = 43$ Å, more than ten times the spacing between them in a metal, which is why electrons in solids always need quantum statistics ([the chapter on the Boltzmann distribution](../boltzmann-and-maxwell/) returns to this).

The verdict is that classical dynamics of nuclei is accurate for heavy atoms and for structure, diffusion and most thermodynamics at room temperature. It fails for light atoms (hydrogen, lithium), for high-frequency vibrations, for low temperatures and for heat capacities. The remedies are to constrain stiff bonds (as most biomolecular force fields do with bonds to hydrogen), to apply quantum corrections afterwards, or to use path-integral MD, which represents each quantum nucleus as a ring of classical beads.

{{< note type="warn" >}}
Flexible classical water is the standard trap. Each water molecule has three internal vibrations, a bend near 1600 cm⁻¹ and two stretches near 3700 cm⁻¹, all frozen at room temperature. A classical simulation gives each of them $k_B$ of heat capacity, adding $3R \approx 25$ J mol⁻¹ K⁻¹ to a quantity whose measured value for the liquid is 75 J mol⁻¹ K⁻¹. This is one reason why widely used water models such as SPC/E and TIP4P are rigid, and why heat capacities from classical simulations are often corrected with quantum harmonic factors before they are compared with experiment.
{{< /note >}}

{{< note type="practice" >}}
A quick test before trusting classical nuclei: compute $\hbar\omega/k_BT$ for the highest frequencies that matter to the property you want. Below about 1, a classical oscillator's heat capacity is within 10 % of the quantum value; above about 5, the mode holds less than 4 % of its classical thermal energy and should be constrained, corrected or treated quantum mechanically. Path-integral MD needs a number of beads comfortably larger than the largest $\hbar\omega/k_BT$ in the system, about 17 for the O–H stretch of water at 300 K, so around 32 beads are typical there.
{{< /note >}}

{{< note type="practice" title="From the lab" >}}
Isotope substitution is the cleanest experimental test for nuclear quantum effects, because classical statistical mechanics predicts that equilibrium properties do not depend on the masses at all: with the same potential, classical H₂O and D₂O have identical structure, densities and melting points. Real heavy water melts at 3.8 °C and has its density maximum at 11.2 °C, against 0 °C and 4 °C for ordinary water. A simulation study of nuclear quantum effects therefore runs path-integral MD with both isotopes (codes such as i-PI drive the beads, with the forces from a force field, a machine-learned potential or DFT) and compares the isotope shifts, not the absolute values, with experiment, since the shifts are insensitive to small errors in the potential. Ring-polymer contraction, which evaluates the expensive long-range forces on fewer beads, and generalised Langevin thermostats such as PIGLET reduce the bead count to a handful and make such studies affordable with ab initio forces.
{{< /note >}}

{{< note type="key" >}}
- Confinement quantises energy: a wave must fit its boundary conditions. The box gives levels spaced as $n^2$, the oscillator gives evenly spaced levels starting at the zero-point energy $\tfrac12\hbar\omega$.
- At high energy quantum probability averages to the classical one (the correspondence principle).
- Translation and the rotation of heavy molecules are classical at room temperature; bond stretches are frozen and carry zero-point energies of several $k_BT$, which explain the kinetic isotope effect.
- Temperature populates the levels as $e^{-E/k_BT}$; a mode with $\hbar\omega \gg k_BT$ is frozen, and classical MD, which gives every mode $k_BT$, is accurate only when $\hbar\omega \lesssim k_BT$ and the thermal wavelength is small.
{{< /note >}}

{{< quiz >}}
- q: "You halve the length of a box. What happens to its energy levels?"
  options: ["They halve", "They double", "They quadruple"]
  answer: 2
  why: "$E_n \\propto 1/L^2$, so halving $L$ multiplies every level by 4. This is why small quantum dots emit bluer light."
- q: "What is the lowest energy of a quantum harmonic oscillator?"
  options: ["Zero", "$\\tfrac12\\hbar\\omega$", "$\\hbar\\omega$"]
  answer: 1
  why: "The zero-point energy $\\tfrac12\\hbar\\omega$ survives even at absolute zero."
- q: "A vibration has $\\hbar\\omega = 10\\,k_BT$. Which statement is right?"
  options: ["It behaves classically, with mean energy $k_BT$", "It is frozen in its ground state, and classical MD overestimates its thermal energy", "It has equal population in all levels"]
  answer: 1
  why: "The first excited level is populated with relative weight $e^{-10} \\approx 5 \\times 10^{-5}$; classical mechanics would wrongly assign it $k_BT$."
- q: "For which system is classical MD of the nuclei most questionable at room temperature?"
  options: ["Liquid argon", "Proton transfer in water", "Diffusion of gold atoms on a surface"]
  answer: 1
  why: "Hydrogen is light, so its thermal wavelength is about an ångström and tunnelling and zero-point energy matter. Path-integral methods are used for such problems."
- q: "Why does a C–D bond usually break more slowly than the corresponding C–H bond?"
  options: ["Deuterium forms a stronger electronic bond", "The heavier C–D bond has a lower zero-point energy, so it needs more energy to reach the transition state", "Deuterium is more electronegative than hydrogen"]
  answer: 1
  why: "The potential is the same for both isotopes; only the zero-point energy differs, by about 4.8 kJ/mol, giving a rate ratio of up to about 7 at room temperature."
- q: "A nitrogen molecule moves in a 1 cm box at 300 K. How does the translational level spacing near its thermal energy compare with $k_BT$?"
  options: ["It is comparable to $k_BT$", "It is a few per cent of $k_BT$", "It is a few billionths of $k_BT$, so translation is classical"]
  answer: 2
  why: "Near level $n \\approx \\sqrt{k_BT/E_1} \\approx 6 \\times 10^8$ the spacing is $2nE_1 \\approx 3 \\times 10^{-9}\\,k_BT$."
- q: "Through the same thin barrier, how does the tunnelling factor of a deuteron compare with that of a proton?"
  options: ["The same, because the barrier is the same", "Lower by a factor of about 60, because the decay constant grows as the square root of the mass", "Higher, because deuterium is heavier"]
  answer: 1
  why: "$e^{-2\\kappa a}$ with $\\kappa \\propto \\sqrt{m}$: for a 0.2 eV, 0.5 Å barrier the exponent rises from 9.8 to 13.9, a 58-fold drop. Isotope effects far above 7 point to tunnelling."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. D. J. Griffiths and D. F. Schroeter, *Introduction to Quantum Mechanics*, 3rd ed., Cambridge University Press (2018), chapter 2 (infinite square well, harmonic oscillator).
2. P. Atkins and R. Friedman, *Molecular Quantum Mechanics*, 5th ed., Oxford University Press (2011), chapters 2–3.
3. D. V. Schroeder, *An Introduction to Thermal Physics*, Addison-Wesley (2000), chapter 6 (Boltzmann statistics, equipartition and its failure).
4. A. Einstein, "Die Plancksche Theorie der Strahlung und die Theorie der spezifischen Wärme", *Annalen der Physik* **22**, 180 (1907).
5. L. de Broglie, *Recherches sur la théorie des quanta*, thesis, Paris (1924); *Annales de Physique* **3**, 22 (1925).
6. M. E. Tuckerman, *Statistical Mechanics: Theory and Molecular Simulation*, 2nd ed., Oxford University Press (2023), chapter on quantum statistical mechanics and path integrals.
7. T. E. Markland and M. Ceriotti, "Nuclear quantum effects enter the mainstream", *Nature Reviews Chemistry* **2**, 0109 (2018).

</div>
