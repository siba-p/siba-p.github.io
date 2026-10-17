---
title: "Quantum energy levels"
description: "Why energy comes in steps: the Schrödinger equation, the particle in a box, the harmonic oscillator and zero-point energy, how quantum turns into classical at high energy, and how temperature populates the levels. The bridge from quantum mechanics to statistical mechanics."
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

In 1924 de Broglie proposed that every particle with momentum $p$ behaves like a wave of wavelength $\lambda = h/p$, where $h = 6.626 \times 10^{-34}$ J s is Planck's constant. For a cricket ball the wavelength is absurdly small; for an electron in an atom it is about the size of the atom, and wave behaviour dominates. The state of a quantum particle is described by a **wavefunction** $\psi(x)$, and the probability of finding the particle near $x$ is $|\psi(x)|^2\,\mathrm dx$ (Born's rule).

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

## The harmonic oscillator

Near the bottom of any valley the potential is a parabola, $V = \tfrac12 m\omega^2 x^2$, so the harmonic oscillator describes every chemical bond vibration and every phonon in a crystal. Its levels are equally spaced:

{{< eq title="Quantum harmonic oscillator" say="A ladder of evenly spaced rungs that starts half a rung above the floor." >}}
$$ \textcolor{#d4a017}{E_n} = \left(n + \tfrac12\right)\hbar\textcolor{#12a594}{\omega}, \qquad n = 0, 1, 2, \dots $$
- $\textcolor{#12a594}{\omega}$: the classical angular frequency $\sqrt{k/m}$
- $\tfrac12\hbar\omega$: the **zero-point energy**, which a quantum oscillator keeps even at absolute zero
- the wavefunctions are Gaussians times Hermite polynomials, $\psi_n \propto H_n(\xi)\,e^{-\xi^2/2}$ with $\xi = x\sqrt{m\omega/\hbar}$
{{< /eq >}}

{{< widget name="quantum" title="Energy levels, wavefunctions and thermal populations" caption="Left: the potential (blue), the levels (dashed) and each level's wavefunction drawn at its energy; the highlighted level is orange. Switch to |ψ|² and turn on the classical overlay to compare with where a classical particle of the same energy spends its time. The bars show how temperature shares the system among the levels (units with ħ = m = 1)." >}}

Zero-point energy is measurable and important. It is why liquid helium does not freeze at normal pressure, it shifts reaction barriers and bond lengths, and it makes deuterated molecules react more slowly than ordinary ones (the kinetic isotope effect), because the heavier isotope has a lower $\tfrac12\hbar\omega$.

## From quantum to classical

Highlight a high level in the lab and switch to $|\psi|^2$. The quantum probability oscillates rapidly, but its average follows the teal dashed curve, the **classical** probability density: a classical oscillator moves fastest through the centre and slowest near the turning points, so it spends most of its time near the edges,

$$
\rho_{\text{cl}}(x) = \frac{1}{\pi\sqrt{a^2 - x^2}}, \qquad a = \text{amplitude}.
$$

At high quantum number the two agree, as Bohr's **correspondence principle** demands. Quantum effects matter when the level spacing is comparable to the energy available, and that brings temperature in.

## Temperature populates the levels

At temperature $T$ a system in contact with its surroundings occupies level $n$ with a probability given by the **Boltzmann distribution**, derived in [the chapter on Boltzmann and Maxwell](../boltzmann-and-maxwell/):

{{< eq title="Thermal populations" say="Each extra kT of energy costs a factor e in probability." >}}
$$ p_n = \frac{e^{-\textcolor{#d4a017}{E_n}/k_B\textcolor{#e64980}{T}}}{Z}, \qquad Z = \sum_n e^{-E_n/k_BT} $$
- $k_B = 1.381 \times 10^{-23}$ J K⁻¹: Boltzmann's constant; at 300 K, $k_BT = 25.9$ meV $= 208$ cm⁻¹
- $Z$: the partition function, which just normalises the probabilities
{{< /eq >}}

Slide the temperature in the lab. When $k_BT \ll \hbar\omega$ almost everything sits in the ground state, and the oscillator is **frozen**: it cannot absorb heat, and its thermal energy is pinned at the zero-point value. When $k_BT \gg \hbar\omega$ many levels are populated, and the mean energy approaches the classical value $k_BT$ (for the box, $k_BT/2$), as the statistics row shows.

The numbers for real molecules are revealing. A C–H stretch vibrates at about 3000 cm⁻¹, so $\hbar\omega/k_BT \approx 14$ at room temperature and the ground state holds 99.9999 % of the molecules: that vibration is completely quantum. A soft torsion or lattice mode at 200 cm⁻¹ has $\hbar\omega/k_BT \approx 1$, and is close to classical. Einstein used exactly this freezing-out to explain in 1907 why the heat capacity of solids falls at low temperature.

## Is classical molecular dynamics allowed?

Classical MD treats nuclei as points obeying Newton's laws, so it gives each vibration $k_BT$ of energy whether or not it should. A useful yardstick is the **thermal de Broglie wavelength**, the typical quantum blur of a particle at temperature $T$:

{{< eq title="Thermal de Broglie wavelength" say="If the quantum blur is much smaller than the gap between atoms, treat the atoms as classical." >}}
$$ \Lambda = \frac{h}{\sqrt{2\pi\,\textcolor{#845ef7}{m}\,k_B\textcolor{#e64980}{T}}} $$
- argon at 300 K: $\Lambda \approx 0.16$ Å, far below its 3.4 Å atomic size, so classical is excellent
- a hydrogen atom at 300 K: $\Lambda \approx 1.0$ Å, comparable to bond lengths, so quantum effects can matter
{{< /eq >}}

The verdict is that classical dynamics of nuclei is accurate for heavy atoms and for structure, diffusion and most thermodynamics at room temperature. It fails for light atoms (hydrogen, lithium), for high-frequency vibrations, for low temperatures and for heat capacities. The remedies are to constrain stiff bonds (as most biomolecular force fields do with bonds to hydrogen), to apply quantum corrections afterwards, or to use path-integral MD, which represents each quantum nucleus as a ring of classical beads.

{{< note type="key" >}}
- Confinement quantises energy: a wave must fit its boundary conditions. The box gives levels spaced as $n^2$, the oscillator gives evenly spaced levels starting at the zero-point energy $\tfrac12\hbar\omega$.
- At high energy quantum probability averages to the classical one (the correspondence principle).
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
