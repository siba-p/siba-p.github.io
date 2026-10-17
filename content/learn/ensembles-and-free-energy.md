---
title: "Ensembles, the partition function and free energy"
description: "The canonical ensemble in depth: the partition function as a sum of Boltzmann weights and the generator of all thermodynamics; energy, entropy, heat capacity and the Gibbs entropy formula; free energy as the competition between energy and entropy; free-energy profiles and the potential of mean force; the classical partition function, the ideal gas and the Sackur–Tetrode entropy; and the isothermal–isobaric and grand canonical ensembles."
track: statmech
weight: 3
level: Core
prereqs: ["boltzmann-and-maxwell", "integrals"]
lab: "Watch Boltzmann weights add up to Z, and sample a two-well system to see entropy beat energy"
---

## Ensembles

An experiment never controls the microscopic state of a sample. It controls a few macroscopic quantities, such as the temperature, the pressure or the number of molecules, and the sample explores all the microstates compatible with those constraints. Statistical mechanics describes this exploration with an **ensemble**: an imagined collection of infinitely many copies of the system, each in a different microstate, with the copies distributed according to the probability of each microstate under the given conditions. The average of any quantity over the ensemble is what an experiment measures.

[The topic on entropy](../entropy-and-temperature/) used the **microcanonical ensemble**, which describes an isolated system with fixed number of particles $N$, volume $V$ and energy $E$, and in which every accessible microstate is equally likely. [The topic on the Boltzmann distribution](../boltzmann-and-maxwell/) derived the **canonical ensemble** for a system at fixed $N$, $V$ and temperature $T$, in contact with a heat bath, and showed that a microstate of energy $E_s$ occurs with probability proportional to $e^{-E_s/k_BT}$. This topic develops the canonical ensemble fully, because it is the ensemble of most experiments and of most simulations, and then introduces the ensembles at constant pressure and at constant chemical potential.

Different ensembles describe different experimental conditions, but for large systems they give the same thermodynamics, because the fluctuations that distinguish them are tiny compared with the averages; this is called the **equivalence of ensembles**. The choice is therefore a matter of convenience: one picks the ensemble in which the calculation is easiest or the simulation most natural.

## The partition function

In the canonical ensemble the probability of microstate $s$ is

{{< eq title="The canonical distribution and the partition function" say="Each state gets a weight that falls exponentially with its energy; Z is the total weight, so dividing by it turns weights into probabilities." >}}
$$ p_s = \frac{e^{-\beta \textcolor{#4c6ef5}{E_s}}}{\textcolor{#d4a017}{Z}}, \qquad \textcolor{#d4a017}{Z}(N, V, T) = \sum_s e^{-\beta \textcolor{#4c6ef5}{E_s}} = \sum_{\text{levels } i} \textcolor{#845ef7}{g_i}\, e^{-\beta \textcolor{#4c6ef5}{E_i}}, \qquad \beta = \frac{1}{k_B T} $$
- the first sum runs over every microstate; the second groups microstates into energy levels with degeneracy $\textcolor{#845ef7}{g_i}$
- $\textcolor{#d4a017}{Z}$ is dimensionless; the letter comes from the German *Zustandssumme*, "sum over states"
{{< /eq >}}

The **partition function** $Z$ looks like a mere normalising constant, but it is the central object of statistical mechanics. Its name is apt: it describes how the system's probability is *partitioned* among its states. At low temperature only the lowest states have appreciable weight and $Z$ is close to the degeneracy of the ground state. As the temperature rises, more states acquire weight and $Z$ grows; roughly, $Z$ counts the number of states the system can effectively reach at temperature $T$.

The figure below makes this concrete. Each energy level contributes a weight $g_i e^{-\beta E_i}$, drawn as a gold bar; the weights add up to $Z$, and each level's share of the total is its probability. Lower the temperature and the weights of the excited levels collapse exponentially; raise it and they approach their degeneracies.

{{< widget name="zsum" title="The partition function as a sum of Boltzmann weights" caption="Left: the energy levels, with dots for their degeneracy. Middle: each level's Boltzmann weight. Right: the weights stacked into Z, showing each level's probability. Bottom: the mean energy U, the entropy S and the heat capacity C as functions of temperature (each scaled to its maximum); the dashed line is the current temperature. With ‘your own levels’ you can drag the levels up and down." opts=`{"sys":"degen"}` >}}

Partition functions factorise in a way that makes them practical. If a system consists of independent parts, its energy is a sum of their energies, so each Boltzmann factor is a product and $Z = z_1 z_2 \cdots$. A molecule's partition function factorises approximately into translational, rotational, vibrational and electronic parts, $z = z_{\text{trans}}\,z_{\text{rot}}\,z_{\text{vib}}\,z_{\text{elec}}$, each computed separately; this is how thermodynamic tables of gases are calculated from spectroscopic data. For $N$ identical, non-interacting molecules, $Z = z^N/N!$, where the $N!$ corrects for the fact that exchanging identical molecules does not produce a new microstate.

## Thermodynamics from the partition function

Every thermodynamic quantity follows from $\ln Z$ by differentiation. The derivations are short, and they explain what each quantity means.

{{< eq title="Thermodynamics from ln Z" say="Free energy is −kT ln Z; energy is its β-derivative; heat capacity measures energy fluctuations; entropy is what is left over." >}}
$$ \textcolor{#f08c2e}{F} = -k_BT\ln Z, \qquad \textcolor{#4c6ef5}{U} = \langle E \rangle = -\frac{\partial \ln Z}{\partial \beta}, \qquad \textcolor{#12a594}{S} = \frac{U - F}{T} = -k_B \sum_s p_s \ln p_s, \qquad \textcolor{#e64980}{C_V} = \frac{\partial U}{\partial T} = \frac{\langle E^2\rangle - \langle E\rangle^2}{k_BT^2} $$
- $\textcolor{#f08c2e}{F}$: the Helmholtz free energy, minimised at equilibrium at fixed $N$, $V$, $T$
- pressure and chemical potential follow too: $P = k_BT\,\partial\ln Z/\partial V$, $\mu = -k_BT\,\partial\ln Z/\partial N$
{{< /eq >}}

The mean energy formula follows because differentiating $Z = \sum e^{-\beta E_s}$ with respect to $\beta$ brings down a factor $-E_s$ in each term, so $-\partial \ln Z/\partial\beta = \sum E_s e^{-\beta E_s}/Z = \langle E\rangle$. Differentiating again gives the variance of the energy, which is why the heat capacity equals the energy fluctuations divided by $k_BT^2$: a system can absorb heat only if it has states at nearby energies to move into, and the same states allow its energy to fluctuate. This fluctuation formula is how heat capacities are computed from simulations, and [the topic on fluctuations](../fluctuations-and-response/) develops it.

The entropy formula $S = -k_B\sum p_s \ln p_s$, the **Gibbs entropy**, generalises Boltzmann's $S = k_B \ln \Omega$. If all $\Omega$ accessible states are equally likely, each $p_s = 1/\Omega$ and the sum reduces to $k_B \ln\Omega$. If the probabilities are uneven, the entropy is lower, because the system is effectively confined to fewer states. The same expression, without $k_B$, is Shannon's measure of information, which is why entropy is often described as missing information about the microstate.

The figure's bottom panel shows these quantities for each system. For the two-level system, the heat capacity rises from zero, peaks and falls again. This **Schottky anomaly** occurs because at low temperature the excited level is out of reach, and at high temperature both levels are already equally populated, so further heating changes nothing; only in between can the system absorb energy. The peak lies at $k_BT \approx 0.42\,\Delta$ for a level spacing $\Delta$, and such peaks are measured in magnetic materials and used to determine their energy levels. For the harmonic oscillator, the heat capacity rises from zero to the classical value $k_B$, the freezing-out of vibrations described in [the topic on quantum energy levels](../quantum-energy-levels/).

## Free energy: energy against entropy

The Helmholtz free energy $F = U - TS$ is the quantity a system at constant temperature minimises. Its two terms pull in opposite directions. The energy term favours the states of lowest energy: atoms packed in a crystal, a protein in its folded form, a molecule in its deepest potential well. The entropy term, weighted by temperature, favours whatever has the most microstates: a gas filling its container, a disordered chain, a broad, shallow well rather than a narrow, deep one. Which wins depends on the temperature, and that competition is the origin of melting, boiling, unfolding and most other changes of state.

The cleanest way to see this is a system with two states, A and B. The probability of being in state A is the sum of the Boltzmann weights of all microstates belonging to A, so it is natural to define a partition function for each state, $Z_A$ and $Z_B$, and a free energy for each, $F_A = -k_BT\ln Z_A$. The ratio of probabilities then depends only on the free-energy difference:

{{< eq title="Populations from free energies" say="Every k_BT of free-energy difference changes the odds by a factor of e." >}}
$$ \frac{P_B}{P_A} = \frac{Z_B}{Z_A} = e^{-\beta\,\Delta F}, \qquad \Delta F = F_B - F_A = \underbrace{\Delta U}_{\text{energy}} - \underbrace{T\Delta S}_{\text{entropy}} $$
- a state can be favoured despite higher energy if its entropy is large enough
- at room temperature $k_BT \approx 2.5$ kJ/mol, so a free-energy difference of 5.7 kJ/mol shifts the population ratio tenfold
{{< /eq >}}

The figure below samples a particle moving in a one-dimensional potential with two wells by the Metropolis Monte Carlo method ([its own topic](../monte-carlo/)). Well A is deep and narrow; well B is shallower but much broader. At low temperature the particle stays almost entirely in A, the state of lower energy. Raise the temperature and B gains, until above some temperature the particle spends more time in the shallow well than in the deep one. Nothing about the energies has changed. B wins because it offers more room: its larger entropy, multiplied by the higher temperature, outweighs its energy penalty. The readout decomposes the exact free-energy difference into its energy and entropy parts.

{{< widget name="pmf" title="Energy against entropy in a two-well system" caption="Top: the potential energy (blue), and the free energy F(x) = −kT ln P(x) reconstructed from the sampled histogram (orange), with a violet bar showing the size of kT. Bottom: the histogram of positions visited and the exact Boltzmann density. Raise the temperature or widen well B and watch the population shift from A to B." >}}

This is not a toy effect. Rubber contracts when heated because a stretched polymer chain has fewer conformations than a coiled one, so the entropic force pulling it back grows with temperature. Water and oil separate largely because water molecules next to an oily surface lose orientational freedom, an entropic penalty; this hydrophobic effect drives protein folding and the self-assembly of surfactants and nanoparticle ligands. And every first-order phase transition, from ice melting to a crystal changing its structure, is the point where the free energies of two phases cross.

## Free-energy profiles and the potential of mean force

The same idea extends from two states to a continuous variable. Choose a **collective variable** $\xi$ that describes the progress of some process: the distance between two molecules, a dihedral angle, the number of atoms in a crystalline cluster. Its probability distribution $P(\xi)$, obtained by summing the Boltzmann weights of all microstates with a given value of $\xi$, defines a **free-energy profile**:

{{< eq title="The free-energy profile (potential of mean force)" say="Wherever the system spends a lot of time, the free energy is low; every factor of e less time costs one k_BT." >}}
$$ F(\textcolor{#4c6ef5}{\xi}) = -k_BT \ln P(\textcolor{#4c6ef5}{\xi}) + \text{constant} $$
- $F(\xi)$ includes the entropy of all the other degrees of freedom; it is not the potential energy along $\xi$
- its negative slope, $-\mathrm dF/\mathrm d\xi$, is the force along $\xi$ averaged over everything else: the **mean force**
{{< /eq >}}

In the two-well figure, the orange curve is exactly this: a histogram of where the particle has been, turned into a free energy. The difference between it and the blue potential-energy curve is entropy. Free-energy profiles are central to molecular simulation. The barrier height $\Delta F^\ddagger$ of a profile along a reaction coordinate controls the rate of the process through a factor $e^{-\beta\Delta F^\ddagger}$, and the depth of a minimum controls binding constants and solubilities. When the barrier is many $k_BT$ high, as in the figure at low temperature, an unbiased simulation almost never crosses it and the histogram cannot be measured on the far side; the readout warns when this happens. [The topic on free-energy methods](../es-umbrella/) describes umbrella sampling and metadynamics, which bias the simulation to overcome this.

## The classical partition function and the ideal gas

For a classical system of $N$ atoms, the sum over microstates becomes an integral over [phase space](../motion-and-phase-space/), the $3N$ positions and $3N$ momenta:

{{< eq title="The classical partition function" say="Integrate the Boltzmann factor over every position and momentum, counting one state per cell of volume h^{3N}." >}}
$$ Z = \frac{1}{N!\,h^{3N}} \int e^{-\beta H(\mathbf r^N, \mathbf p^N)}\,\mathrm d\mathbf r^N\,\mathrm d\mathbf p^N = \frac{1}{N!\,\textcolor{#845ef7}{\Lambda}^{3N}}\int e^{-\beta \textcolor{#4c6ef5}{U}(\mathbf r^N)}\,\mathrm d\mathbf r^N, \qquad \textcolor{#845ef7}{\Lambda} = \frac{h}{\sqrt{2\pi m k_BT}} $$
- $h^{3N}$: Planck's constant sets the size of one quantum state in phase space, making $Z$ dimensionless
- the momentum integrals are Gaussian and give the thermal wavelength $\textcolor{#845ef7}{\Lambda}$; only the configurational integral over $\textcolor{#4c6ef5}{U}$ remains
{{< /eq >}}

Because the kinetic energy is a sum of squares of momenta, the momentum integrals are products of [Gaussian integrals](../integrals/) and can always be done exactly. All the difficulty, and all the interesting physics of interacting matter, lies in the remaining **configurational integral** over the potential energy. It is a $3N$-dimensional integral that cannot be computed on a grid, which is why it is sampled by Monte Carlo or molecular dynamics.

For an **ideal gas**, $U = 0$ and the configurational integral is simply $V^N$, so $Z = V^N/(N!\,\Lambda^{3N})$. Everything follows from this one line. The pressure is $P = k_BT\,\partial\ln Z/\partial V = Nk_BT/V$, the ideal gas law. The entropy, using Stirling's approximation $\ln N! \approx N\ln N - N$, is the **Sackur–Tetrode equation**,

$$
S = N k_B \left[\ln\!\left(\frac{V}{N\Lambda^3}\right) + \frac52\right].
$$

For argon at 298.15 K and 1 bar, the thermal wavelength is 0.16 Å, $V/(N\Lambda^3) \approx 10^7$, and the formula gives a molar entropy of 154.8 J mol⁻¹ K⁻¹, which matches the value measured calorimetrically. That an absolute entropy can be calculated from Planck's constant and the mass of an atom, and agree with experiment, was one of the early triumphs of quantum statistical mechanics: the factor $h^{3N}$ and the $N!$ both matter.

## Other ensembles

Experiments are more often done at constant pressure than at constant volume. In the **isothermal–isobaric ensemble** (NPT), the volume fluctuates as the system exchanges work with a barostat, a microstate with energy $E_s$ and volume $V$ has weight $e^{-\beta(E_s + PV)}$, and the corresponding free energy is the **Gibbs free energy** $G = F + PV$, minimised at constant temperature and pressure. Phase equilibria, reaction equilibria and solubilities at ordinary conditions are governed by $G$. Molecular dynamics simulations of liquids and solids are usually run in this ensemble, with a thermostat and a barostat ([the topic on thermostats](../thermostats-and-barostats/)).

In the **grand canonical ensemble** ($\mu VT$), the system exchanges particles as well as energy with a reservoir at fixed **chemical potential** $\mu$, the free-energy cost of adding one particle. A microstate with $N$ particles and energy $E_s$ has weight $e^{-\beta(E_s - \mu N)}$, and the grand potential $\Omega = -k_BT\ln\Xi = -PV$ follows from the grand partition function $\Xi$. This is the natural ensemble for adsorption: grand canonical Monte Carlo simulations of gases in porous materials such as zeolites and metal–organic frameworks predict adsorption isotherms by letting molecules be inserted and deleted at a chemical potential fixed by the gas pressure.

The pattern is always the same. Each ensemble has a weight for each microstate, a partition function that normalises the weights, and a thermodynamic potential equal to $-k_BT$ times its logarithm. The potentials are related by **Legendre transforms**, $F = U - TS$, $G = F + PV$, $\Omega = F - \mu N$, each swapping a controlled extensive variable for its conjugate intensive one, and each minimised at equilibrium under its own constraints.

{{< note type="key" >}}
- An ensemble is the probability distribution over microstates for given macroscopic constraints; large systems give the same thermodynamics in every ensemble.
- The canonical partition function $Z = \sum g_i e^{-\beta E_i}$ counts the effectively accessible states; $F = -k_BT\ln Z$, $U = -\partial\ln Z/\partial\beta$, $C_V$ is the energy fluctuation over $k_BT^2$, and $S = -k_B\sum p\ln p$.
- Free energy $F = U - TS$ balances energy and entropy: populations satisfy $P_B/P_A = e^{-\beta\Delta F}$, and broad states can beat deep ones at high temperature.
- A free-energy profile $F(\xi) = -k_BT\ln P(\xi)$ along a collective variable includes the entropy of everything else; its barriers set rates.
- Classically, momenta integrate out to give $\Lambda$; the configurational integral is what simulations sample. The ideal gas gives $PV = Nk_BT$ and the Sackur–Tetrode entropy. NPT and grand canonical ensembles lead to $G$ and $\mu$.
{{< /note >}}

{{< quiz >}}
- q: "A system has levels E = 0 (g = 1) and E = Δ (g = 3). What is Z at very high temperature?"
  options: ["1", "4", "∞"]
  answer: 1
  why: "As kT ≫ Δ every Boltzmann factor tends to 1, so Z tends to the total number of states, 1 + 3."
- q: "How is the heat capacity usually computed from a canonical simulation?"
  options: ["From the mean kinetic energy", "From the variance of the total energy, C = (⟨E²⟩ − ⟨E⟩²)/k_BT²", "From the pressure"]
  answer: 1
  why: "Differentiating ln Z twice links the heat capacity to energy fluctuations."
- q: "State B has higher energy than A but is found more often at 400 K. Why?"
  options: ["Energy is not conserved", "B has larger entropy, so its free energy F = U − TS is lower at that temperature", "The simulation is wrong"]
  answer: 1
  why: "Populations follow free energy, not energy."
- q: "A histogram shows ξ = 1 visited 100 times more often than ξ = 2. What is F(2) − F(1)?"
  options: ["100 k_BT", "ln(100) k_BT ≈ 4.6 k_BT", "−4.6 k_BT"]
  answer: 1
  why: "F(ξ) = −k_BT ln P(ξ), so the difference is k_BT ln(100)."
- q: "Why can the momentum part of the classical partition function always be done exactly?"
  options: ["Momenta are always zero", "The kinetic energy is a sum of squares of momenta, so the integrals are Gaussian", "Because of the N! factor"]
  answer: 1
  why: "Each momentum component contributes a Gaussian integral, producing the thermal wavelength Λ."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. D. Chandler, *Introduction to Modern Statistical Mechanics*, Oxford University Press (1987), chapters 3 and 6.
2. M. E. Tuckerman, *Statistical Mechanics: Theory and Molecular Simulation*, 2nd ed., Oxford University Press (2023), chapters 3–6 (microcanonical, canonical, isothermal–isobaric and grand canonical ensembles).
3. D. A. McQuarrie, *Statistical Mechanics*, University Science Books (2000), chapters 2–8.
4. T. L. Hill, *An Introduction to Statistical Thermodynamics*, Addison-Wesley (1960); Dover reprint (1986).
5. D. V. Schroeder, *An Introduction to Thermal Physics*, Addison-Wesley (2000), chapters 6–7, including the Schottky anomaly and the Sackur–Tetrode equation.
6. O. Sackur, "Die Anwendung der kinetischen Theorie der Gase auf chemische Probleme", *Annalen der Physik* **36**, 958–980 (1911); H. Tetrode, "Die chemische Konstante der Gase und das elementare Wirkungsquantum", *Annalen der Physik* **38**, 434–442 (1912).
7. D. Chandler, "Interfaces and the driving force of hydrophobic assembly", *Nature* **437**, 640–647 (2005).

</div>
