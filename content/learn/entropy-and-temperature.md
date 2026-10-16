---
title: "Counting microstates: entropy and temperature"
description: "Statistical mechanics from scratch: microstates and macrostates, counting them in an Einstein solid, why energy flows from hot to cold, entropy as S = k ln Ω, and temperature defined as the rate at which entropy grows with energy."
track: statmech
weight: 1
level: Core
minutes: 55
prereqs: ["quantum-energy-levels"]
lab: "Two Einstein solids exchanging energy quanta"
---

## The question statistical mechanics answers

A glass of water contains about $10^{25}$ molecules. Following every one is hopeless, and also unnecessary: we want the temperature, the pressure, the heat capacity, whether ice melts. **Statistical mechanics** connects the microscopic world of [quantum levels](../quantum-energy-levels/) and [phase-space trajectories](../motion-and-phase-space/) to those few macroscopic numbers. The whole subject rests on a single idea, which this chapter makes concrete by counting.

## Microstates and macrostates

A **microstate** is a complete specification of the system: which quantum level every particle occupies, or every position and momentum. A **macrostate** is what we measure: total energy, volume, number of particles. One macrostate corresponds to an enormous number of microstates, written $\Omega$ (the **multiplicity**).

The single assumption of statistical mechanics, the **fundamental postulate**, is that an isolated system in equilibrium is equally likely to be found in any of its accessible microstates. Everything else, including the second law of thermodynamics, follows by counting.

## Counting energy in a solid

Einstein's model of a solid treats each atom's vibration as quantum harmonic oscillators with the same frequency, so energy comes in identical quanta $\varepsilon = \hbar\omega$. A microstate says how many quanta each oscillator holds. With $N$ oscillators and $q$ quanta, the number of microstates is the number of ways to drop $q$ identical balls into $N$ boxes:

{{< eq title="Multiplicity of an Einstein solid" say="Arrange q quanta and N − 1 dividers in a row: every arrangement is one microstate." >}}
$$ \textcolor{#d4a017}{\Omega}(\textcolor{#4c6ef5}{N}, \textcolor{#f08c2e}{q}) = \binom{\textcolor{#f08c2e}{q} + \textcolor{#4c6ef5}{N} - 1}{\textcolor{#f08c2e}{q}} = \frac{(q + N - 1)!}{q!\,(N - 1)!} $$
- $\textcolor{#4c6ef5}{N}$: number of oscillators
- $\textcolor{#f08c2e}{q}$: number of energy quanta, so the energy is $U = q\varepsilon$
- example: 3 oscillators sharing 3 quanta have $\Omega = \binom{5}{3} = 10$ microstates
{{< /eq >}}

The ten microstates of the example are easy to list: (3,0,0) in three arrangements, (2,1,0) in six, and (1,1,1) in one. Multiplicities grow at a ferocious rate: 100 oscillators sharing 100 quanta already have about $5 \times 10^{58}$ microstates.

## Two solids in contact

Now put two solids, A and B, in thermal contact so that quanta can hop between them while the total $q$ stays fixed. A macrostate is now "how many quanta are in A", and since every microstate of the whole is equally likely, the probability of a macrostate is proportional to its multiplicity,

$$
P(q_A) \propto \Omega_A(N_A, q_A)\;\Omega_B(N_B, q - q_A).
$$

{{< widget name="einstein" title="Two Einstein solids sharing energy" caption="Left: the probability of every way of splitting the quanta, computed exactly by counting; the orange line marks the current state. Right: the oscillators (blue borders belong to solid A, teal to solid B) and the history of q_A while quanta hop at random. Start with all the energy in A and let it go." >}}

Press the button and watch. Every hop moves one quantum from a random oscillator to another random oscillator, and nothing in the rule prefers either solid. Yet the energy flows out of A until A's share fluctuates around the peak of the probability curve, and it never comes back. For the default settings (60 and 40 oscillators, 100 quanta) the peak is at $q_A = 60$ with a spread of about $\pm 7$, while the probability of finding all 100 quanta back in A is about $5 \times 10^{-15}$.

That is the **second law of thermodynamics**, and nothing more: energy flows to the macrostate with overwhelmingly more microstates, simply because there are overwhelmingly more ways to be there. Increase the sizes in the lab and the peak becomes narrower in relative terms, its width falling as $1/\sqrt N$. For $10^{23}$ oscillators the fluctuations are invisible and the macrostate behaves as if it were exact.

## Entropy

Multiplicities multiply when systems are combined, $\Omega = \Omega_A\Omega_B$. It is more convenient to work with a quantity that adds, so Boltzmann defined the **entropy** as the logarithm of the multiplicity:

{{< eq title="Boltzmann's entropy" say="Entropy counts, on a logarithmic scale, how many ways the system can be arranged without anyone noticing." >}}
$$ \textcolor{#e64980}{S} = k_B \ln \textcolor{#d4a017}{\Omega} $$
- $k_B$ converts the pure number $\ln\Omega$ into thermodynamic units, J K⁻¹
- for two systems: $S = S_A + S_B$
- the second law: an isolated system evolves towards the macrostate of maximal $S$
{{< /eq >}}

This equation is carved on Boltzmann's tombstone in Vienna. Entropy is not a measure of "disorder" in any vague sense: it is the logarithm of a count.

## Temperature

What decides where the peak lies? At the maximum of $\ln\Omega_A + \ln\Omega_B$, moving one quantum from B to A leaves the total unchanged, so

$$
\frac{\partial \ln \Omega_A}{\partial U_A} = \frac{\partial \ln \Omega_B}{\partial U_B}.
$$

The two solids are in equilibrium when this quantity is the same for both. That shared quantity is what a thermometer measures, and it defines temperature:

{{< eq title="Temperature, defined by counting" say="A cold system gains a lot of entropy per unit of energy; a hot one hardly any. Energy flows to where it buys the most entropy." >}}
$$ \frac{1}{\textcolor{#e64980}{T}} = \frac{\partial S}{\partial U}\bigg|_{N, V} $$
- for the Einstein solid this gives $k_BT = \varepsilon \big/ \ln\!\left(1 + \dfrac{N}{q}\right)$ in the large-system limit
- high temperature ($q \gg N$): $k_BT \approx \varepsilon q/N$, so each oscillator holds $k_BT$, the classical value
{{< /eq >}}

The lab prints the temperature of each solid, computed from the exact counts. Start with all energy in A: A is hot and B is cold. As quanta flow, the two temperatures move towards each other and meet where the probability peaks. Energy flows from hot to cold because the cold body gains more entropy per quantum than the hot body loses; the total entropy rises until it can rise no further.

{{< note type="tip" >}}
The definition $1/T = \partial S/\partial U$ makes sense of things that otherwise seem arbitrary. Absolute zero is where adding energy would raise the entropy infinitely fast. Temperature is not "energy per particle", although for classical systems the two are proportional, as [the next chapter](../boltzmann-and-maxwell/) shows through equipartition.
{{< /note >}}

## From counting to thermodynamics

Everything in classical thermodynamics follows from $S(U, V, N)$. Differentiating with respect to volume and particle number gives pressure and chemical potential,

$$
\mathrm dS = \frac{1}{T}\,\mathrm dU + \frac{P}{T}\,\mathrm dV - \frac{\mu}{T}\,\mathrm dN,
$$

which is the thermodynamic identity $\mathrm dU = T\,\mathrm dS - P\,\mathrm dV + \mu\,\mathrm dN$. This isolated-system picture, fixed $N$, $V$ and $E$, is the **microcanonical ensemble**, and it is exactly what an MD simulation without a thermostat samples (the NVE ensemble). For classical particles, $\Omega$ becomes the volume of the shell of [phase space](../motion-and-phase-space/) with energy $E$, measured in units of $h^{3N}$.

{{< note type="key" >}}
- Statistical mechanics rests on one postulate: every accessible microstate of an isolated system is equally likely.
- The second law is counting: systems move to macrostates with more microstates, and for macroscopic systems the most probable macrostate is overwhelmingly so.
- $S = k_B\ln\Omega$, and temperature is defined by $1/T = \partial S/\partial U$. Two systems in contact reach equal temperature because that maximises their total entropy.
{{< /note >}}

{{< quiz >}}
- q: "How many microstates do 2 oscillators sharing 3 quanta have?"
  options: ["3", "4", "6"]
  answer: 1
  why: "$\\binom{3 + 2 - 1}{3} = \\binom{4}{3} = 4$: (3,0), (2,1), (1,2), (0,3)."
- q: "In the lab, why does energy not flow back into solid A?"
  options: ["The hopping rule pushes quanta towards B", "Macrostates with energy concentrated in A have vastly fewer microstates, so they are almost never visited", "Energy is not conserved"]
  answer: 1
  why: "The dynamics is unbiased; the asymmetry is entirely in the counting."
- q: "Two systems are in contact. System 1 gains more entropy per joule than system 2 loses. Which way does heat flow?"
  options: ["From 1 to 2", "From 2 to 1", "Neither"]
  answer: 1
  why: "Total entropy grows if energy moves into system 1, which therefore has the larger $\\partial S/\\partial U$, that is the lower temperature. Heat flows from hot to cold."
- q: "What happens to the relative width of the probability peak as the solids get larger?"
  options: ["It grows", "It shrinks, as about $1/\\sqrt N$", "It stays the same"]
  answer: 1
  why: "This is why thermodynamics works for macroscopic matter: fluctuations around the most probable macrostate become negligible."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. D. V. Schroeder, *An Introduction to Thermal Physics*, Addison-Wesley (2000), chapters 2–3. The two-solid example here follows his treatment.
2. T. A. Moore and D. V. Schroeder, "A different approach to introducing statistical mechanics", *American Journal of Physics* **65**, 26 (1997).
3. A. Einstein, "Die Plancksche Theorie der Strahlung und die Theorie der spezifischen Wärme", *Annalen der Physik* **22**, 180 (1907).
4. L. Boltzmann, "Über die Beziehung zwischen dem zweiten Hauptsatze der mechanischen Wärmetheorie und der Wahrscheinlichkeitsrechnung respektive den Sätzen über das Wärmegleichgewicht", *Wiener Berichte* **76**, 373 (1877).
5. F. Reif, *Fundamentals of Statistical and Thermal Physics*, McGraw-Hill (1965), chapters 2–3.
6. M. E. Tuckerman, *Statistical Mechanics: Theory and Molecular Simulation*, 2nd ed., Oxford University Press (2023), chapter 3 (the microcanonical ensemble).

</div>
