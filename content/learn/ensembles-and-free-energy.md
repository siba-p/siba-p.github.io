---
title: "Ensembles and free energy"
description: "The canonical ensemble in depth: the partition function as a sum of Boltzmann weights and the generator of all thermodynamics; energy, entropy, heat capacity and the Gibbs entropy formula; free energy as the competition between energy and entropy; free-energy profiles and the potential of mean force; the classical partition function, the ideal gas and the Sackur–Tetrode entropy; and the isothermal–isobaric and grand canonical ensembles."
hook: "Rubber pulls harder when you heat it, and oil and water separate, for the same reason a broad, shallow valley can beat a deep, narrow one: free energy counts room as well as depth."
objectives:
  - "Explain what an ensemble is and why ensembles agree for large systems"
  - "Compute energy, entropy, free energy and heat capacity from a partition function"
  - "Predict state populations from free-energy differences and turn histograms into free-energy profiles"
  - "Derive the ideal gas law and the Sackur–Tetrode entropy from the classical partition function"
  - "Choose between canonical, isothermal–isobaric and grand canonical ensembles for a given problem"
cover: "cover.svg"
milestones:
  - year: 1877
    text: "Ludwig Boltzmann relates the entropy of a gas to its number of microstates"
  - year: 1902
    text: "Josiah Willard Gibbs defines ensembles in Elementary Principles in Statistical Mechanics"
  - year: 1912
    text: "Hugo Tetrode, independently of Otto Sackur, derives the absolute entropy of a gas"
track: statmech
weight: 3
level: Core
prereqs: ["boltzmann-and-maxwell", "integrals"]
lab: "Watch Boltzmann weights add up to Z, and sample a two-well system to see entropy beat energy"
---

## Ensembles

An experiment never controls the microscopic state of a sample. It controls a few macroscopic quantities, such as the temperature, the pressure or the number of molecules, and the sample explores all the microstates compatible with those constraints. Statistical mechanics describes this exploration with an **ensemble**: an imagined collection of infinitely many copies of the system, each in a different microstate, with the copies distributed according to the probability of each microstate under the given conditions. The average of any quantity over the ensemble is what an experiment measures.

[The chapter on entropy](../entropy-and-temperature/) used the **microcanonical ensemble**, which describes an isolated system with fixed number of particles $N$, volume $V$ and energy $E$, and in which every accessible microstate is equally likely. [The chapter on the Boltzmann distribution](../boltzmann-and-maxwell/) derived the **canonical ensemble** for a system at fixed $N$, $V$ and temperature $T$, in contact with a heat bath, and showed that a microstate of energy $E_s$ occurs with probability proportional to $e^{-E_s/k_BT}$. This chapter develops the canonical ensemble fully, because it is the ensemble of most experiments and of most simulations, and then introduces the ensembles at constant pressure and at constant chemical potential.

Different ensembles describe different experimental conditions, but for large systems they give the same thermodynamics, because the fluctuations that distinguish them are tiny compared with the averages; this is called the **equivalence of ensembles**. The choice is therefore a matter of convenience: one picks the ensemble in which the calculation is easiest or the simulation most natural.

A simulation does not generate an ensemble of copies. Molecular dynamics and Monte Carlo produce one long sequence of microstates, and using it in place of the ensemble assumes **ergodicity**: that a single trajectory, run long enough, visits microstates with the ensemble's probabilities, so that time averages equal ensemble averages. The assumption fails whenever the trajectory is trapped. A glass below its glass transition, a protein that does not unfold within a 100 ns run, and a crystal that never meets its competing polymorph all give averages over the basin they started in. The error bars are then misleadingly small, because the trajectory has sampled that one basin well. Running from several independent starting structures and comparing the averages is the cheapest test; [enhanced-sampling methods](../es-umbrella/) are the remedy when the averages disagree.

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

{{< note type="practice" title="Back of the envelope: the states of a nitrogen molecule" >}}
Take N₂ at 298 K and 1 bar and evaluate each factor of $z$ for one molecule. **Translation**: each molecule has a volume $k_BT/P = 41\ \text{nm}^3$ to itself, and its thermal wavelength (defined below) is $\Lambda = 0.191$ Å, so there are $V/(N\Lambda^3) \approx 6\times10^6$ translational states per molecule. **Rotation**: the rotational temperature is $\theta_{\text{rot}} = 2.88$ K and the symmetry number of a homonuclear molecule is 2, so $z_{\text{rot}} \approx T/(2\theta_{\text{rot}}) \approx 52$. **Vibration**: the vibrational temperature is about 3400 K, so only a fraction $e^{-\theta_{\text{vib}}/T} \approx 10^{-5}$ of the molecules is in the first excited state, and $z_{\text{vib}} \approx 1$ when energy is counted from the ground state. **Electronic**: the first excited state lies more than 6 eV up, so $z_{\text{elec}} = 1$. Translation and rotation are classical and vibration is frozen, so the molar heat capacity at constant volume is $\tfrac32R + R = \tfrac52R = 20.8$ J mol⁻¹ K⁻¹, which is the measured value. The missing vibrational $R$ is the freezing-out of [the chapter on quantum energy levels](../quantum-energy-levels/).
{{< /note >}}

## Thermodynamics from the partition function

Every thermodynamic quantity follows from $\ln Z$ by differentiation. The derivations are short, and they explain what each quantity means.

{{< eq title="Thermodynamics from ln Z" say="Free energy is −kT ln Z; energy is its β-derivative; heat capacity measures energy fluctuations; entropy is what is left over." >}}
$$ \textcolor{#f08c2e}{F} = -k_BT\ln Z, \qquad \textcolor{#4c6ef5}{U} = \langle E \rangle = -\frac{\partial \ln Z}{\partial \beta}, \qquad \textcolor{#12a594}{S} = \frac{U - F}{T} = -k_B \sum_s p_s \ln p_s, \qquad \textcolor{#e64980}{C_V} = \frac{\partial U}{\partial T} = \frac{\langle E^2\rangle - \langle E\rangle^2}{k_BT^2} $$
- $\textcolor{#f08c2e}{F}$: the Helmholtz free energy, minimised at equilibrium at fixed $N$, $V$, $T$
- pressure and chemical potential follow too: $P = k_BT\,\partial\ln Z/\partial V$, $\mu = -k_BT\,\partial\ln Z/\partial N$
{{< /eq >}}

The mean energy formula follows because differentiating $Z = \sum e^{-\beta E_s}$ with respect to $\beta$ brings down a factor $-E_s$ in each term, so $-\partial \ln Z/\partial\beta = \sum E_s e^{-\beta E_s}/Z = \langle E\rangle$. Differentiating again gives the variance of the energy, which is why the heat capacity equals the energy fluctuations divided by $k_BT^2$: a system can absorb heat only if it has states at nearby energies to move into, and the same states allow its energy to fluctuate. This fluctuation formula is how heat capacities are computed from simulations, and [the chapter on fluctuations](../fluctuations-and-response/) develops it.

The entropy formula $S = -k_B\sum p_s \ln p_s$, the **Gibbs entropy**, generalises Boltzmann's $S = k_B \ln \Omega$. If all $\Omega$ accessible states are equally likely, each $p_s = 1/\Omega$ and the sum reduces to $k_B \ln\Omega$. If the probabilities are uneven, the entropy is lower, because the system is effectively confined to fewer states. The same expression, without $k_B$, is Shannon's measure of information, which is why entropy is often described as missing information about the microstate.

The Gibbs form is also the one used in practice whenever probabilities are known but states are not equally likely. The configurational entropy of a binary alloy with site fractions $x$ and $1-x$ randomly distributed is $-k_B[x\ln x + (1-x)\ln(1-x)]$ per site, the ideal entropy of mixing that appears in every CALPHAD phase diagram and in the high-entropy-alloy literature, where five equimolar components give $R\ln 5 = 13.4$ J mol⁻¹ K⁻¹. The same formula applied to the populations of conformers along a molecular dynamics trajectory gives a conformational entropy, with the caveat that it only counts the states the trajectory has visited.

The figure's bottom panel shows these quantities for each system. For the two-level system, the heat capacity rises from zero, peaks and falls again. This **Schottky anomaly** occurs because at low temperature the excited level is out of reach, and at high temperature both levels are already equally populated, so further heating changes nothing; only in between can the system absorb energy. The peak lies at $k_BT \approx 0.42\,\Delta$ for a level spacing $\Delta$, and such peaks are measured in magnetic materials and used to determine their energy levels. For the harmonic oscillator, the heat capacity rises from zero to the classical value $k_B$, the freezing-out of vibrations described in [the chapter on quantum energy levels](../quantum-energy-levels/).

## Free energy: energy against entropy

The Helmholtz free energy $F = U - TS$ is the quantity a system at constant temperature minimises. Its two terms pull in opposite directions. The energy term favours the states of lowest energy: atoms packed in a crystal, a protein in its folded form, a molecule in its deepest potential well. The entropy term, weighted by temperature, favours whatever has the most microstates: a gas filling its container, a disordered chain, a broad, shallow well rather than a narrow, deep one. Which wins depends on the temperature, and that competition is the origin of melting, boiling, unfolding and most other changes of state.

The cleanest way to see this is a system with two states, A and B. The probability of being in state A is the sum of the Boltzmann weights of all microstates belonging to A, so it is natural to define a partition function for each state, $Z_A$ and $Z_B$, and a free energy for each, $F_A = -k_BT\ln Z_A$. The ratio of probabilities then depends only on the free-energy difference:

{{< eq title="Populations from free energies" say="Every k_BT of free-energy difference changes the odds by a factor of e." >}}
$$ \frac{P_B}{P_A} = \frac{Z_B}{Z_A} = e^{-\beta\,\Delta F}, \qquad \Delta F = F_B - F_A = \underbrace{\Delta U}_{\text{energy}} - \underbrace{T\Delta S}_{\text{entropy}} $$
- a state can be favoured despite higher energy if its entropy is large enough
- at room temperature $k_BT \approx 2.5$ kJ/mol, so a free-energy difference of 5.7 kJ/mol shifts the population ratio tenfold

{{< /eq >}}

{{< note type="try" title="Pause and predict" >}}
State B lies 10 kJ/mol above state A in energy but has 40 J mol⁻¹ K⁻¹ more entropy. Below what temperature is A the majority state, and what is the ratio $P_B/P_A$ at 300 K? Decide before reading on. The populations are equal when $\Delta F = \Delta U - T\Delta S = 0$, at $T^* = \Delta U/\Delta S = 250$ K, so A dominates only below 250 K. At 300 K, $\Delta F = 10 - 300\times0.040 = -2$ kJ/mol, and $P_B/P_A = e^{2000/(8.314\times300)} = 2.2$: the higher-energy state holds about two thirds of the population.
{{< /note >}}

The figure below samples a particle moving in a one-dimensional potential with two wells by the Metropolis Monte Carlo method ([its own chapter](../monte-carlo/)). Well A is deep and narrow; well B is shallower but much broader. At low temperature the particle stays almost entirely in A, the state of lower energy. Raise the temperature and B gains, until above some temperature the particle spends more time in the shallow well than in the deep one. Nothing about the energies has changed. B wins because it offers more room: its larger entropy, multiplied by the higher temperature, outweighs its energy penalty. The readout decomposes the exact free-energy difference into its energy and entropy parts.

{{< widget name="pmf" title="Energy against entropy in a two-well system" caption="Top: the potential energy (blue), and the free energy F(x) = −kT ln P(x) reconstructed from the sampled histogram (orange), with a violet bar showing the size of kT. Bottom: the histogram of positions visited and the exact Boltzmann density. Raise the temperature or widen well B and watch the population shift from A to B." >}}

{{< note type="warn" title="Myth" >}}
**Entropy means disorder, so the ordered state always has the lower entropy.** Entropy counts microstates, and the ordered arrangement sometimes has more of them. Hard spheres, which have no energy at all apart from forbidding overlap, crystallise when compressed beyond a packing fraction of 0.494: at that density a sphere in a face-centred cubic lattice has more room to rattle than a sphere jammed in a disordered packing, so the crystal has the higher entropy ([the chapter on liquids](../liquids-and-structure/) returns to this). The depletion attraction between large colloids in a solution of small polymers, which drives colloidal crystallisation and is exploited in protein crystallography with polyethylene glycol, is entropic in the same way: pushing two large particles together frees volume for the small ones.
{{< /note >}}

This is not a toy effect. Rubber contracts when heated because a stretched polymer chain has fewer conformations than a coiled one, so the entropic force pulling it back grows with temperature. Water and oil separate largely because water molecules next to an oily surface lose orientational freedom, an entropic penalty; this hydrophobic effect drives protein folding and the self-assembly of surfactants and nanoparticle ligands. And every first-order phase transition, from ice melting to a crystal changing its structure, is the point where the free energies of two phases cross.

### Worked example: the entropic spring

The rubber example can be made quantitative. Model one strand of a rubber network as an ideal chain of $N$ freely jointed segments of length $b$, with no energy cost for bending. A random walk of $N$ steps ends at a displacement $\mathbf R$ from its start with a Gaussian probability, $P(\mathbf R) \propto \exp(-3R^2/2Nb^2)$, and since every conformation has the same energy, the number of conformations with end-to-end distance $R$ is proportional to $P(\mathbf R)$. The entropy is $S(R) = S_0 - 3k_BR^2/(2Nb^2)$, and because the energy does not depend on $R$, the free energy is purely entropic:

$$
F(R) = F_0 + \frac{3k_BT}{2Nb^2}R^2, \qquad f = \frac{\mathrm dF}{\mathrm dR} = \frac{3k_BT}{Nb^2}\,R .
$$

The chain is a Hookean spring whose stiffness is proportional to the absolute temperature. For $N = 100$ segments of $b = 1$ nm at 300 K the stiffness is $3k_BT/Nb^2 = 0.12$ pN/nm, so pulling the ends 10 nm apart takes 1.2 pN. At large extension the Gaussian form fails because the chain runs out of contour length, and the exact force–extension curve of the freely jointed chain is the inverse Langevin function, $x/Nb = \coth(fb/k_BT) - k_BT/fb$. At half the contour length the tension is 7.4 pN at 300 K; at 90 % it is 41 pN and rising steeply.

{{< fig src="rubber-chain.svg" alt="Left: a tangled teal chain and a nearly straight orange chain. Right: tension against extension for a 100-segment freely jointed chain at 280 K and 350 K, with the Gaussian straight-line approximation dashed" caption="A stretched chain has fewer conformations than a coiled one, so pulling it lowers its entropy and costs free energy. At every extension the tension scales with $T$: heating from 280 K to 350 K raises it by 25 %. The dashed line is the Gaussian approximation, valid at small extension." >}}

Two consequences follow. A rubber band held at fixed length pulls harder when heated, in proportion to $T$, and a band held at fixed load contracts. And stretching rubber quickly, so that no heat escapes, lowers its conformational entropy, which must be compensated by an increase in the thermal entropy of the vibrations: the band warms up. Single-molecule experiments test the same physics on one chain. Smith, Finzi and Bustamante stretched single DNA molecules with magnetic beads in 1992, and the force–extension curve below about 5 pN follows an entropic worm-like chain model with a persistence length of about 50 nm.

{{< note type="story" >}}
John Gough, a blind natural philosopher in Kendal, reported in 1805 that a strip of natural rubber warms when stretched quickly, which he detected by holding it against his lips, and that a stretched strip shortens when warmed. James Joule repeated the measurements with thermometers in 1859. The Gough–Joule effect was explained only in the 1930s, when Werner Kuhn, Eugene Guth and Herman Mark treated rubber as a network of randomly coiled chains whose elasticity is entropic.
{{< /note >}}

{{< note type="practice" title="From the lab: protein melting curves" >}}
Differential scanning calorimetry and thermal-shift assays measure the fraction of a protein that is unfolded as the temperature rises. For a two-state protein, $P_U/P_F = e^{-\Delta G/RT}$ with $\Delta G = \Delta H - T\Delta S$, and the melting temperature $T_m$ is where $\Delta G = 0$. Take a small protein with an unfolding enthalpy of 200 kJ/mol and $T_m = 60$ °C. Then $\Delta S = \Delta H/T_m = 600$ J mol⁻¹ K⁻¹; at 25 °C, $\Delta G = 21$ kJ/mol and only 2 molecules in 10 000 are unfolded; at 50 °C the fraction is 10 %; at 70 °C it is 89 %. The sharpness of the transition measures $\Delta H$, which is how the van 't Hoff enthalpy is extracted from a melting curve. Real proteins also raise their heat capacity on unfolding, so $\Delta H$ and $\Delta S$ themselves depend on temperature and $\Delta G(T)$ is curved; for some proteins it crosses zero again at low temperature, which is cold denaturation.
{{< /note >}}

## Free-energy profiles and the potential of mean force

The same idea extends from two states to a continuous variable. Choose a **collective variable** $\xi$ that describes the progress of some process: the distance between two molecules, a dihedral angle, the number of atoms in a crystalline cluster. Its probability distribution $P(\xi)$, obtained by summing the Boltzmann weights of all microstates with a given value of $\xi$, defines a **free-energy profile**:

{{< eq title="The free-energy profile (potential of mean force)" say="Wherever the system spends a lot of time, the free energy is low; every factor of e less time costs one k_BT." >}}
$$ F(\textcolor{#4c6ef5}{\xi}) = -k_BT \ln P(\textcolor{#4c6ef5}{\xi}) + \text{constant} $$
- $F(\xi)$ includes the entropy of all the other degrees of freedom; it is not the potential energy along $\xi$
- its negative slope, $-\mathrm dF/\mathrm d\xi$, is the force along $\xi$ averaged over everything else: the **mean force**
{{< /eq >}}

In the two-well figure, the orange curve is exactly this: a histogram of where the particle has been, turned into a free energy. The difference between it and the blue potential-energy curve is entropy. Free-energy profiles are central to molecular simulation. The barrier height $\Delta F^\ddagger$ of a profile along a reaction coordinate controls the rate of the process through a factor $e^{-\beta\Delta F^\ddagger}$, and the depth of a minimum controls binding constants and solubilities. When the barrier is many $k_BT$ high, as in the figure at low temperature, an unbiased simulation almost never crosses it and the histogram cannot be measured on the far side; the readout warns when this happens. [The chapter on free-energy methods](../es-umbrella/) describes umbrella sampling and metadynamics, which bias the simulation to overcome this.

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

### When is the classical partition function enough?

The classical integral replaces a sum over quantum states by an integral, and the replacement is accurate when the quantum states are closely spaced compared with $k_BT$. For translation the criterion has a direct geometric reading: the thermal wavelength $\Lambda$, the typical de Broglie wavelength of a particle at temperature $T$, must be short compared with the distances over which the potential changes, which in condensed matter is the spacing between neighbouring atoms, about 3 Å.

{{< fig src="thermal-wavelength.svg" alt="Log-log plot of thermal wavelength against temperature from 1 to 1000 K for hydrogen atoms, helium and argon, with a band at 3 to 4 angstrom for interatomic spacing and a rising dashed line for the mean spacing in a gas at 1 bar" caption="$\Lambda = h/\sqrt{2\pi mk_BT}$ falls as $T^{-1/2}$ and $m^{-1/2}$. Argon is classical everywhere it is liquid or gas; liquid helium at 4.2 K has $\Lambda$ longer than its interatomic spacing and is a quantum liquid; hydrogen nuclei in water at 300 K have $\Lambda \approx 1$ Å, comparable to the O–H bond." >}}

For argon, $\Lambda = 0.30$ Å at its boiling point of 87 K, a tenth of the interatomic spacing, so liquid argon is a classical liquid and classical molecular dynamics with a good pair potential reproduces its properties. For liquid helium at 4.2 K, $\Lambda = 4.3$ Å exceeds the 3.8 Å spacing between atoms: the wave packets overlap, the classical partition function is meaningless, and below 2.17 K helium-4 becomes a superfluid. Liquid hydrogen at 20 K ($\Lambda = 2.7$ Å) is similarly quantum.

The case that matters most in chemistry and materials science is the hydrogen atom at room temperature. Its thermal wavelength is 1.0 Å, about the length of an O–H bond, so the positions of protons in water, in hydrated oxides and in hydrogen-bonded crystals are delocalised by zero-point motion. These **nuclear quantum effects** shift hydrogen-bond lengths, raise proton-transfer rates, and cause isotope effects that classical statistical mechanics cannot produce: in a classical simulation, the equilibrium structure does not depend on atomic mass at all, yet heavy water melts at 3.8 °C rather than 0 °C. Path-integral molecular dynamics recovers them by replacing each quantum nucleus with a ring polymer of $P$ classical beads joined by harmonic springs; for water at 300 K, 16 to 32 beads are typically needed, at 16 to 32 times the cost of a classical run.

## Other ensembles

Experiments are more often done at constant pressure than at constant volume. In the **isothermal–isobaric ensemble** (NPT), the volume fluctuates as the system exchanges work with a barostat, a microstate with energy $E_s$ and volume $V$ has weight $e^{-\beta(E_s + PV)}$, and the corresponding free energy is the **Gibbs free energy** $G = F + PV$, minimised at constant temperature and pressure. Phase equilibria, reaction equilibria and solubilities at ordinary conditions are governed by $G$. Molecular dynamics simulations of liquids and solids are usually run in this ensemble, with a thermostat and a barostat ([the chapter on thermostats](../thermostats-and-barostats/)).

In the **grand canonical ensemble** ($\mu VT$), the system exchanges particles as well as energy with a reservoir at fixed **chemical potential** $\mu$, the free-energy cost of adding one particle. A microstate with $N$ particles and energy $E_s$ has weight $e^{-\beta(E_s - \mu N)}$, and the grand potential $\Omega = -k_BT\ln\Xi = -PV$ follows from the grand partition function $\Xi$. This is the natural ensemble for adsorption: grand canonical Monte Carlo simulations of gases in porous materials such as zeolites and metal–organic frameworks predict adsorption isotherms by letting molecules be inserted and deleted at a chemical potential fixed by the gas pressure.

{{< note type="practice" title="From the lab: adsorption isotherms by grand canonical Monte Carlo" >}}
To predict how much CO₂ a metal–organic framework takes up at 1 bar and 298 K, the framework is held rigid and grand canonical Monte Carlo attempts four kinds of move: translations, rotations, insertions at random positions and deletions of random molecules. The insertion and deletion acceptance probabilities contain $e^{\beta\mu}$, and $\mu$ is set from the gas-phase fugacity, computed from an equation of state such as Peng–Robinson rather than the ideal-gas pressure at high loading. Repeating at a series of pressures gives the isotherm, and codes such as RASPA automate the workflow. Two common sources of disagreement with experiment are the definition of uptake (experiments report the excess adsorbed amount, simulations the absolute amount) and the framework model: a rigid framework cannot capture gate-opening or breathing materials. At high loading, random insertions are almost always rejected because they overlap existing molecules, and configurational-bias or continuous fractional component moves are used to restore acceptance.
{{< /note >}}

{{< fig src="ensemble-family.svg" alt="Four boxes of particles: an isolated box, a box exchanging energy with a bath, a box with a piston, and a box with a dashed permeable wall, each labelled with what is fixed, what is exchanged, its Boltzmann weight and its thermodynamic potential" caption="The four standard ensembles. Each exchange with the surroundings adds a term to the Boltzmann weight, and the matching thermodynamic potential is minimised at equilibrium under that ensemble's constraints." >}}

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
- q: "At 300 K the thermal wavelength of a hydrogen atom is about 1 Å. What does this imply for a classical simulation of water?"
  options: ["Nothing; classical mechanics is exact at 300 K", "Proton positions are delocalised on the scale of an O–H bond, so nuclear quantum effects such as isotope shifts are missed", "Water must be treated as an ideal gas"]
  answer: 1
  why: "When Λ approaches the distance over which the potential varies, the classical configurational integral is inaccurate; path-integral MD corrects it."
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
8. S. B. Smith, L. Finzi and C. Bustamante, "Direct mechanical measurements of the elasticity of single DNA molecules by using magnetic beads", *Science* **258**, 1122–1126 (1992).

</div>
