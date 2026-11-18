---
title: "Entropy and temperature"
description: "Statistical mechanics from scratch: microstates and macrostates, counting them in an Einstein solid, why energy flows from hot to cold, entropy as S = k ln Ω, and temperature defined as the rate at which entropy grows with energy."
hook: "Let energy quanta hop at random between two blocks and energy flows from the hot one to the cold one every time, though no rule tells it to. The second law of thermodynamics turns out to be nothing more than counting."
objectives:
  - "Count the microstates of an Einstein solid by hand and with the binomial formula"
  - "Explain the second law as a consequence of overwhelmingly unequal multiplicities"
  - "Compute entropies with S = kB ln Ω and connect them to measured heats of melting"
  - "Derive temperature from 1/T = ∂S/∂U and explain why heat flows from hot to cold"
  - "Distinguish temperature from energy per particle using the Einstein solid"
cover: "cover.svg"
milestones:
  - year: 1865
    text: "Clausius coins the word entropy and states that it tends to a maximum"
  - year: 1877
    text: "Boltzmann relates entropy to the number of microscopic arrangements"
  - year: 1901
    text: "Planck writes S = k log W and obtains the first value of k"
  - year: 2019
    text: "The SI fixes Boltzmann's constant exactly, redefining the kelvin"
track: statmech
weight: 1
level: Core
minutes: 55
prereqs: ["quantum-energy-levels"]
lab: "Two Einstein solids exchanging energy quanta"
---

## The question statistical mechanics answers

A glass of water contains about $10^{25}$ molecules. Following every one is hopeless, and also unnecessary: we want the temperature, the pressure, the heat capacity, whether ice melts. **Statistical mechanics** connects the microscopic world of [quantum levels](../quantum-energy-levels/) and [phase-space trajectories](../motion-and-phase-space/) to those few macroscopic numbers. The whole subject rests on a single idea, which this chapter makes concrete by counting.

{{< note type="story" >}}
Rudolf Clausius introduced the word entropy in 1865, from the Greek τροπή, transformation, choosing a word that would sound like energy. He defined it through heat, $\mathrm dS = \delta Q_{\text{rev}}/T$, with no reference to atoms, and closed the paper with two sentences: the energy of the world is constant; the entropy of the world tends to a maximum. The microscopic meaning came twelve years later from Boltzmann, and it is the subject of this chapter.
{{< /note >}}

## Microstates and macrostates

A **microstate** is a complete specification of the system: which quantum level every particle occupies, or every position and momentum. A **macrostate** is what we measure: total energy, volume, number of particles. One macrostate corresponds to an enormous number of microstates, written $\Omega$ (the **multiplicity**).

In a simulation the distinction is concrete. A single frame of a molecular dynamics trajectory of 1,000 argon atoms is a microstate: 6,000 numbers, the positions and momenta. The macrostate of an NVE run is three numbers, $N = 1000$, the box volume and the total energy, and every frame of the run is a different microstate belonging to the same macrostate. Thermodynamic quantities such as the pressure are averages over those frames.

The single assumption of statistical mechanics, the **fundamental postulate**, is that an isolated system in equilibrium is equally likely to be found in any of its accessible microstates. Everything else, including the second law of thermodynamics, follows by counting.

## Counting energy in a solid

Einstein's model of a solid treats each atom as three quantum harmonic oscillators, one for each direction, all with the same frequency, so energy comes in identical quanta $\varepsilon = \hbar\omega$. A microstate says how many quanta each oscillator holds. With $N$ oscillators and $q$ quanta, the number of microstates is the number of ways to drop $q$ identical balls into $N$ boxes:

{{< eq title="Multiplicity of an Einstein solid" say="Arrange q quanta and N − 1 dividers in a row: every arrangement is one microstate." >}}
$$ \textcolor{#d4a017}{\Omega}(\textcolor{#4c6ef5}{N}, \textcolor{#f08c2e}{q}) = \binom{\textcolor{#f08c2e}{q} + \textcolor{#4c6ef5}{N} - 1}{\textcolor{#f08c2e}{q}} = \frac{(q + N - 1)!}{q!\,(N - 1)!} $$
- $\textcolor{#4c6ef5}{N}$: number of oscillators
- $\textcolor{#f08c2e}{q}$: number of energy quanta, so the energy is $U = q\varepsilon$
- example: 3 oscillators sharing 3 quanta have $\Omega = \binom{5}{3} = 10$ microstates
{{< /eq >}}

The ten microstates of the example are easy to list: (3,0,0) in three arrangements, (2,1,0) in six, and (1,1,1) in one. Multiplicities grow at a ferocious rate: 100 oscillators sharing 100 quanta already have about $5 \times 10^{58}$ microstates.

### Why the binomial coefficient counts microstates

The formula is not obvious, and the standard argument for it, called **stars and bars**, is worth seeing once. Write a microstate as a row of symbols: one dot for each quantum, and a bar wherever one oscillator ends and the next begins. Three oscillators need two bars, so the microstate (2, 0, 1) becomes ●●||●, and every arrangement of three dots and two bars corresponds to exactly one microstate. Counting microstates is therefore counting the ways to choose which 3 of the 5 positions hold dots, $\binom{5}{3} = 10$, and in general which $q$ of the $q + N - 1$ positions do. The argument treats quanta as indistinguishable, which they are: a microstate says how many quanta each oscillator holds, not which ones.

{{< fig src="microstates.svg" alt="All ten microstates of three oscillators sharing three quanta, drawn as rows of three boxes containing gold dots, grouped as three states with one full oscillator, six with the pattern two-one-zero and one with one quantum each; below, the state two-zero-one encoded as dot, dot, bar, bar, dot" caption="The ten microstates of three oscillators holding three quanta. All ten are equally likely, but the pattern 2, 1, 0 occurs in six of them, so a measurement of how unevenly the energy is spread finds it most often. Below, the stars-and-bars code that turns counting microstates into choosing 3 positions out of 5." >}}

## Two solids in contact

Now put two solids, A and B, in thermal contact so that quanta can hop between them while the total $q$ stays fixed. A macrostate is now "how many quanta are in A", and since every microstate of the whole is equally likely, the probability of a macrostate is proportional to its multiplicity,

$$
P(q_A) \propto \Omega_A(N_A, q_A)\;\Omega_B(N_B, q - q_A).
$$

{{< note type="try" title="Pause and predict" >}}
Two solids of three oscillators each share six quanta, and every microstate of the pair is equally likely. Is the chance that all six quanta sit in solid A one in seven (seven possible splits), about one in sixteen, or one in 462? Decide, then check against the table below.
{{< /note >}}

Before handing the counting to a computer, do the smallest interesting case by hand. Let solids A and B have three oscillators each and share $q = 6$ quanta. Three oscillators holding $n$ quanta have $\binom{n+2}{n}$ microstates, which gives 1, 3, 6, 10, 15, 21 and 28 for $n = 0$ to 6, and the table follows by multiplication:

| $q_A$ | $\Omega_A$ | $\Omega_B$ | $\Omega_A\Omega_B$ | probability |
|---|---|---|---|---|
| 0 | 1 | 28 | 28 | 0.061 |
| 1 | 3 | 21 | 63 | 0.136 |
| 2 | 6 | 15 | 90 | 0.195 |
| 3 | 10 | 10 | 100 | 0.216 |
| 4 | 15 | 6 | 90 | 0.195 |
| 5 | 21 | 3 | 63 | 0.136 |
| 6 | 28 | 1 | 28 | 0.061 |

The fourth column sums to 462, which is $\binom{11}{6}$, the multiplicity of six oscillators holding six quanta, as it must be: joined together, the two solids are one solid. Even this tiny system prefers an even split, but only mildly. The most probable macrostate has a probability of 22 %, and all the energy sits in A 6 % of the time. Nothing irreversible happens at this size; what matters is what happens as the numbers grow.

{{< widget name="einstein" title="Two Einstein solids sharing energy" caption="Left: the probability of every way of splitting the quanta, computed exactly by counting; the orange line marks the current state. Right: the oscillators (blue borders belong to solid A, teal to solid B) and the history of q_A while quanta hop at random. Start with all the energy in A and let it go." >}}

Press the button and watch. Every hop moves one quantum from a random oscillator to another random oscillator, and nothing in the rule prefers either solid. Yet the energy flows out of A until A's share fluctuates around the peak of the probability curve, and it never comes back. For the default settings (60 and 40 oscillators, 100 quanta) the peak is at $q_A = 60$ with a spread of about $\pm 7$, while the probability of finding all 100 quanta back in A is about $5 \times 10^{-15}$.

That is the **second law of thermodynamics**, and nothing more: energy flows to the macrostate with overwhelmingly more microstates, simply because there are overwhelmingly more ways to be there. Increase the sizes in the lab and the peak becomes narrower in relative terms, its width falling as $1/\sqrt N$. For $10^{23}$ oscillators the fluctuations are invisible and the macrostate behaves as if it were exact.

{{< fig src="sharpening.svg" alt="Probability of each energy split between two equal Einstein solids, scaled to a peak of one, plotted against the fraction of energy in solid A for 3, 30, 300 and 3000 oscillators per solid; the curves narrow from a broad tent to a sharp spike at one half" caption="Two equal solids of N oscillators sharing 2N quanta. The standard deviation of the share held by A, relative to its mean, falls from ±53 % for N = 3 to ±1.8 % for N = 3000, exactly as $1/\sqrt N$. The calculation uses exact counts, not an approximation." >}}

{{< note type="practice" title="Back of the envelope" >}}
How long would you wait to see heat flow measurably the wrong way? Expanding $\ln\Omega_A + \ln\Omega_B$ to second order around its peak gives a Gaussian whose variance, for two equal solids of $N$ oscillators each holding one quantum on average, is exactly $\sigma^2 = N$. For $N = 10^{23}$, roughly a gram-sized crystal, the relative fluctuation is $\sigma/N = 3 \times 10^{-12}$. A deviation of one part in $10^{10}$, still far too small for a calorimeter to notice, is 32 standard deviations, and its probability relative to the peak is $e^{-500} \approx 10^{-217}$. Sampling a new microstate every femtosecond for the age of the universe gives about $4 \times 10^{32}$ tries. The second law is statistical, but the statistics leave no room for exceptions in macroscopic matter. In a nanoscale system they do: the fluctuation theorems of Evans, Searles and others predict, and experiments on optically trapped beads have confirmed, short stretches of negative entropy production in systems of a few degrees of freedom.
{{< /note >}}

{{< note type="try" >}}
Set both solids to 5 oscillators and the total to 10 quanta, then let the quanta hop. The probability curve is broad and the history of $q_A$ wanders over most of the range; all ten quanta return to A about 1 % of the time. Now set 200 and 200 oscillators with 400 quanta: the spread is about ±14 quanta around 200, a relative width of 7 % instead of 43 %, and the chance of finding all the energy back in A has fallen to $10^{-75}$.
{{< /note >}}

The figure's numbers come from exact counting, and so can yours. The cell lists the microstates of the three-oscillator example by brute force, rebuilds the table above, and then evaluates the figure's default case with exact integer arithmetic.

{{< py title="Counting microstates exactly" >}}
import numpy as np
from itertools import product
from math import comb
def omega(N, q):                 # ways to share q quanta among N oscillators
    return comb(q + N - 1, q)
# Brute force: list every microstate of 3 oscillators holding 3 quanta
states = [s for s in product(range(4), repeat=3) if sum(s) == 3]
print(len(states), "microstates:", states)
# Two solids of 3 oscillators sharing 6 quanta: Omega_A * Omega_B for each q_A
print("3 + 3 oscillators, 6 quanta:", [omega(3, k) * omega(3, 6 - k) for k in range(7)])
# The lab's default: N_A = 60, N_B = 40, q = 100
NA, NB, q = 60, 40, 100
W = np.array([omega(NA, k) * omega(NB, q - k) for k in range(q + 1)], dtype=float)
P, k = W / W.sum(), np.arange(q + 1)
mean = (k * P).sum()
spread = np.sqrt(((k - mean)**2 * P).sum())
print(f"total microstates {W.sum():.3e}; most probable q_A = {P.argmax()}, spread {spread:.1f}")
print(f"P(all {q} quanta in A) = {P[q]:.1e};  P(q_A within 53..67) = {P[53:68].sum():.2f}")
{{< /py >}}

The total, $4.5 \times 10^{58}$, is the same as for 100 oscillators sharing 100 quanta, again because the two solids together form one solid. The most probable split is $q_A = 60$ with a standard deviation of 6.9 quanta, so $q_A$ lies between 53 and 67 for 72 % of the time, while all 100 quanta return to A with a probability of $5 \times 10^{-15}$.

## Entropy

Multiplicities multiply when systems are combined, $\Omega = \Omega_A\Omega_B$. It is more convenient to work with a quantity that adds, so Boltzmann defined the **entropy** as the logarithm of the multiplicity:

{{< eq title="Boltzmann's entropy" say="Entropy counts, on a logarithmic scale, how many ways the system can be arranged without anyone noticing." >}}
$$ \textcolor{#e64980}{S} = k_B \ln \textcolor{#d4a017}{\Omega} $$
- $k_B$ converts the pure number $\ln\Omega$ into thermodynamic units, J K⁻¹
- for two systems: $S = S_A + S_B$
- the second law: an isolated system evolves towards the macrostate of maximal $S$
{{< /eq >}}

This equation is carved on Boltzmann's tombstone in Vienna. Entropy is not a measure of "disorder" in any vague sense: it is the logarithm of a count.

{{< note type="story" >}}
Boltzmann's 1877 paper counted what he called complexions, but he never wrote $S = k\ln W$ in that form and never used the constant $k$. Max Planck did both in 1900–1901, while deriving his law of black-body radiation, and obtained the first good value of $k$ from radiation data. Since the 2019 redefinition of the SI units, $k_B$ is fixed at exactly $1.380649 \times 10^{-23}$ J K⁻¹, and the kelvin is defined through it.
{{< /note >}}

{{< note type="warn" >}}
Reading entropy as “disorder” leads people astray. Hard spheres, which have no attraction and no energy other than refusing to overlap, crystallise when they fill more than about half of the volume. The ordered crystal wins because each sphere has more room to rattle around its lattice site than it would have in a crowded disordered packing, so the crystal has more microstates ([the chapter on liquids](../liquids-and-structure/) returns to hard spheres). Long, thin rods line up into a liquid crystal for the same reason, as Onsager showed in 1949. When in doubt, count arrangements instead of judging how tidy the picture looks.
{{< /note >}}

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

{{< fig src="slopes.svg" alt="Left: entropy over kB of solid A rising and of solid B falling with the number of quanta in A, and their sum peaking at 60 quanta. Right: the slopes of the two entropies, a falling blue curve for A and a rising teal curve for B, crossing at 60 quanta at a value of 0.68" caption="Two solids of 60 and 40 oscillators sharing 100 quanta, the lab's default. The total entropy (pink) peaks at $q_\mathrm{A} = 60$, exactly where the slopes of the two entropies, which are their inverse temperatures $\varepsilon/k_BT$, are equal at 0.68. Left of the crossing, B has the smaller slope, so it is hotter, and energy flows into A." >}}

### From counting to a formula

The formula for the temperature of an Einstein solid quoted in the card follows from the multiplicity with one approximation. For large numbers, Stirling's formula $\ln n! \approx n\ln n - n$ turns the factorials into smooth functions. It is already good to 1 % at $n = 100$, where $\ln 100! = 363.7$ and $n\ln n - n = 360.5$, and adding the correction $\tfrac12\ln(2\pi n) = 3.2$ makes it exact to four digits. With $q$ and $N$ both large,

$$
\ln\Omega \approx (q + N)\ln(q + N) - q\ln q - N\ln N ,
$$

and differentiating with respect to $q$, with $U = q\varepsilon$, gives

$$
\frac{1}{k_BT} = \frac{\partial\ln\Omega}{\partial U} = \frac{1}{\varepsilon}\ln\frac{q + N}{q} \quad\Longrightarrow\quad k_BT = \frac{\varepsilon}{\ln(1 + N/q)} .
$$

Two limits check the result. When the solid holds many quanta per oscillator, $\ln(1 + N/q) \approx N/q$ and $U = q\varepsilon \approx Nk_BT$, the classical equipartition value. When it holds few, $k_BT$ is small, and adding one quantum multiplies the number of microstates by roughly $N/q$, a large factor: a cold body gains a great deal of entropy per unit of energy, which is why it absorbs heat so readily. The same three lines, applied to the multiplicity of an ideal gas, give the Sackur–Tetrode entropy and the ideal gas law, and applied to a lattice of spins they give the paramagnet treated in [the Ising chapter](../phase-transitions-ising/).

### Worked example: temperature is not energy per oscillator

The Einstein solid separates temperature from energy per particle with real numbers. Take a solid of $N = 60$ oscillators holding $q = 60$ quanta, one per oscillator on average. Adding one quantum multiplies its multiplicity by $\Omega(60, 61)/\Omega(60, 60) = 120/61$, so $\ln\Omega$ rises by $\ln(120/61) = 0.677$ for an energy step $\varepsilon$, and

$$
k_BT = \frac{\varepsilon}{\Delta\ln\Omega} = 1.48\,\varepsilon ,
$$

close to the large-system value $\varepsilon/\ln 2 = 1.44\,\varepsilon$. Each oscillator holds one quantum, yet $k_BT$ is about one and a half quanta. The large-system formula gives the same story at other fillings. At $q/N = 0.1$, $k_BT = \varepsilon/\ln 11 = 0.42\,\varepsilon$, four times the energy per oscillator; at $q/N = 10$, $k_BT = \varepsilon/\ln 1.1 = 10.5\,\varepsilon$, close to the energy per oscillator plus half a quantum. Only at high temperature does each oscillator hold $k_BT$, the classical result. Turned around, the formula gives the mean number of quanta per oscillator, $q/N = 1/(e^{\varepsilon/k_BT} - 1)$, exactly the thermal occupation of a quantum oscillator from [the chapter on quantum energy levels](../quantum-energy-levels/). Counting microstates and the Boltzmann distribution give the same answer.

{{< fig src="temperature.svg" alt="Log–log plot of quanta per oscillator against kBT in units of the quantum: a dashed classical line q over N equals kBT over epsilon, and a violet Einstein-solid curve that falls far below it at low temperature and joins it at high temperature; orange points at q over N of 0.1, 1 and 10" caption="Energy per oscillator against temperature for the Einstein solid (violet) and for a classical oscillator (dashed). The three points are the worked example: at q/N = 0.1, 1 and 10, $k_BT$ is 0.42, 1.44 and 10.49 quanta. The curves merge only once $k_BT$ is several quanta." >}}

{{< note type="tip" >}}
The definition $1/T = \partial S/\partial U$ makes sense of things that otherwise seem arbitrary. Absolute zero is where adding energy would raise the entropy infinitely fast. Temperature is not "energy per particle", although for classical systems the two are proportional, as [the next chapter](../boltzmann-and-maxwell/) shows through equipartition.
{{< /note >}}

{{< note type="fun" >}}
Because temperature is defined by $1/T = \partial S/\partial U$, it can be negative. In a system whose energy has a ceiling, such as nuclear spins in a magnetic field, each of which can only point with or against the field, the entropy is largest when half the spins are excited. Pushing in more energy beyond that point reduces the number of arrangements, so $\partial S/\partial U < 0$. Edward Purcell and Robert Pound prepared such a state with the nuclear spins of a lithium fluoride crystal in 1951. A negative-temperature system is hotter than any positive one: put it in contact with anything and energy flows out of it.
{{< /note >}}

## From counting to thermodynamics

Everything in classical thermodynamics follows from $S(U, V, N)$. Differentiating with respect to volume and particle number gives pressure and chemical potential,

$$
\mathrm dS = \frac{1}{T}\,\mathrm dU + \frac{P}{T}\,\mathrm dV - \frac{\mu}{T}\,\mathrm dN,
$$

which is the thermodynamic identity $\mathrm dU = T\,\mathrm dS - P\,\mathrm dV + \mu\,\mathrm dN$. This isolated-system picture, fixed $N$, $V$ and $E$, is the **microcanonical ensemble**, and it is exactly what an MD simulation without a thermostat samples (the NVE ensemble). For classical particles, $\Omega$ becomes the volume of the shell of [phase space](../motion-and-phase-space/) with energy $E$, measured in units of $h^{3N}$.

### Worked example: the entropy of argon by counting

Counting phase-space cells is not a formality: it predicts measured entropies. For $N$ identical atoms of an ideal gas, dividing the accessible phase-space volume by $h^{3N}$ and by $N!$, because swapping two identical atoms does not create a new microstate, gives the **Sackur–Tetrode equation**, found independently by Otto Sackur and Hugo Tetrode in 1912 and derived step by step in [the chapter on ensembles and free energy](../ensembles-and-free-energy/):

$$
S = Nk_B\left[\ln\frac{V}{N\Lambda^3} + \frac52\right], \qquad \Lambda = \frac{h}{\sqrt{2\pi m k_BT}} .
$$

For argon at 298.15 K and 1 bar, each atom has a volume $V/N = k_BT/P = 4.12 \times 10^{-26}$ m³, the thermal wavelength of [the quantum chapter](../quantum-energy-levels/) is $\Lambda = 0.160$ Å, and their ratio $V/N\Lambda^3$ is $1.01 \times 10^7$. Its logarithm is 16.12, so $S = 18.62\,R = 154.8$ J mol⁻¹ K⁻¹. The calorimetric value, obtained by integrating $C_P/T$ from a few kelvin through the solid, melting, the liquid and boiling, is 154.8 J mol⁻¹ K⁻¹ as well. Planck's constant, which sets the size of a cell, and the $N!$ both matter: without the $N!$ the formula would give 72.4 $R$, about 600 J mol⁻¹ K⁻¹, and would not even be proportional to the amount of gas, the inconsistency known as the Gibbs paradox. Agreement to four digits between a count of quantum states and a measurement of heat is among the strongest evidence that $S = k_B\ln\Omega$ is right.

{{< note type="practice" >}}
A simulation cannot measure entropy the way it measures energy. Energy is an average of something every snapshot has; $\ln\Omega$ belongs to the whole set of microstates, and no single snapshot carries it. Entropies and free energies are therefore obtained indirectly: by integrating the heat capacity, $S(T) = S(T_0) + \int_{T_0}^{T} C(T')/T'\,\mathrm dT'$; by thermodynamic integration from a reference system whose entropy is known, such as an ideal gas or a harmonic crystal; or with sampling methods that measure free-energy differences directly ([the chapter on free-energy methods](../es-fep-ti/)).
{{< /note >}}

### Worked example: what melting does to Ω

Heat added at constant temperature changes the entropy by $\Delta S = Q/T$, which follows from $1/T = \partial S/\partial U$ when $T$ stays fixed (at constant pressure the heat is the enthalpy change). Melting one mole of ice at 273.15 K absorbs 6.01 kJ, so

$$
\Delta S = \frac{6010\ \text{J mol}^{-1}}{273.15\ \text{K}} = 22.0\ \text{J mol}^{-1}\,\text{K}^{-1}.
$$

Per molecule this is $\Delta S/R = 2.65$ in units of $k_B$, as if each molecule gained about $e^{2.65} \approx 14$ times as many arrangements. For the whole mole, $\Omega_{\text{water}}/\Omega_{\text{ice}} = e^{\Delta S/k_B} = e^{2.65 \times 6.022 \times 10^{23}} \approx 10^{6.9 \times 10^{23}}$, a number that would take about $7 \times 10^{23}$ digits to write down. Entropy is a logarithm precisely so that nobody has to write such numbers: the calorimeter measures 22.0, and the count hides behind it.

{{< note type="warn" title="Myth" >}}
**Myth:** the entropy of anything can only increase. **Reality:** the second law constrains the total entropy of an isolated system. The entropy of a part can fall freely as long as more is exported. A mole of water freezing at 0 °C in a freezer loses 22.0 J K⁻¹, but the 6.01 kJ it releases enters the freezer's air at about 255 K, whose entropy rises by 6010/255 = 23.6 J K⁻¹; the total grows by 1.6 J K⁻¹. Crystallisation, protein folding and the self-assembly of lipid bilayers all lower the entropy of the molecules that order, and are paid for by heat released to, or water molecules freed into, the surroundings.
{{< /note >}}

{{< note type="practice" title="From the lab" >}}
Counting is a design tool in alloy development. Distributing $N$ atoms of $n$ elements with mole fractions $x_i$ over a lattice gives $\Omega = N!/\prod_i (x_iN)!$, and Stirling's formula turns this into the ideal configurational entropy of mixing, $\Delta S_{\text{mix}} = -R\sum_i x_i\ln x_i$ per mole. For an equimolar alloy of five elements this is $R\ln 5 = 13.4$ J mol⁻¹ K⁻¹, and at 1000 K it lowers the free energy of the random solid solution by $T\Delta S = 13.4$ kJ/mol relative to the separated elements. This argument motivated the **high-entropy alloys** introduced in 2004 by Brian Cantor's and Jien-Wei Yeh's groups, of which the face-centred cubic CoCrFeMnNi, the Cantor alloy, is the best studied. The ideal formula is an upper bound: short-range order, which Monte Carlo simulations with cluster-expansion or machine-learned energies predict and diffuse scattering detects, lowers the configurational entropy, and long anneals at intermediate temperatures precipitate secondary phases even in the Cantor alloy. Vibrational and electronic entropies, computed from phonon calculations, can shift phase stability by comparable amounts.
{{< /note >}}

{{< note type="key" >}}
- Statistical mechanics rests on one postulate: every accessible microstate of an isolated system is equally likely.
- The second law is counting: systems move to macrostates with more microstates, and for macroscopic systems the most probable macrostate is overwhelmingly so.
- $S = k_B\ln\Omega$, and temperature is defined by $1/T = \partial S/\partial U$. Two systems in contact reach equal temperature because that maximises their total entropy.
- Temperature is not energy per particle: only in the classical limit does each oscillator hold $k_BT$. Measured entropy changes are heats divided by temperature, and behind them lie multiplicities such as $10^{6.9 \times 10^{23}}$ for melting a mole of ice.
- Counting is quantitative: phase-space cells of size $h^{3N}$ and the $N!$ for identical atoms give the Sackur–Tetrode entropy of argon, 154.8 J mol⁻¹ K⁻¹, equal to the calorimetric value. Relative fluctuations fall as $1/\sqrt N$, which is why the second law holds without exception for macroscopic samples.
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
- q: "Two solids of 3 oscillators each share 6 quanta. What is the probability that all 6 quanta are in solid A?"
  options: ["1/7, since there are seven possible splits", "28/462, about 0.06", "1/462"]
  answer: 1
  why: "Microstates are equally likely, splits are not. A holding all 6 quanta has $\\binom{8}{6} = 28$ microstates and B has 1, out of $\\binom{11}{6} = 462$ in total."
- q: "Melting ice at 273.15 K absorbs 6.01 kJ/mol. What is the molar entropy of fusion?"
  options: ["6.01 J mol⁻¹ K⁻¹", "22.0 J mol⁻¹ K⁻¹", "1640 J mol⁻¹ K⁻¹"]
  answer: 1
  why: "At constant temperature $\\Delta S = Q/T = 6010/273.15 = 22.0$ J mol⁻¹ K⁻¹."
- q: "Two identical solids of N oscillators each share 2N quanta. How does the standard deviation of the energy held by one solid, relative to its mean, scale with N?"
  options: ["As 1/N", "As $1/\\sqrt N$", "It does not depend on N"]
  answer: 1
  why: "The variance of $q_A$ is exactly N, so the relative spread is $\\sqrt N/N = 1/\\sqrt N$: ±53 % for N = 3, ±1.8 % for N = 3000, and $3 \\times 10^{-12}$ for $10^{23}$ oscillators."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. D. V. Schroeder, *An Introduction to Thermal Physics*, Addison-Wesley (2000), chapters 2–3. The two-solid example here follows his treatment.
2. T. A. Moore and D. V. Schroeder, "A different approach to introducing statistical mechanics", *American Journal of Physics* **65**, 26 (1997).
3. A. Einstein, "Die Plancksche Theorie der Strahlung und die Theorie der spezifischen Wärme", *Annalen der Physik* **22**, 180 (1907).
4. L. Boltzmann, "Über die Beziehung zwischen dem zweiten Hauptsatze der mechanischen Wärmetheorie und der Wahrscheinlichkeitsrechnung respektive den Sätzen über das Wärmegleichgewicht", *Wiener Berichte* **76**, 373 (1877).
5. F. Reif, *Fundamentals of Statistical and Thermal Physics*, McGraw-Hill (1965), chapters 2–3.
6. M. E. Tuckerman, *Statistical Mechanics: Theory and Molecular Simulation*, 2nd ed., Oxford University Press (2023), chapter 3 (the microcanonical ensemble).
7. E. M. Purcell and R. V. Pound, "A nuclear spin system at negative temperature", *Physical Review* **81**, 279 (1951).

</div>
