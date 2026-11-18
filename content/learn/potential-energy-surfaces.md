---
title: "Potential energy surfaces and force fields"
description: "The Born–Oppenheimer picture, forces as gradients, pair potentials, the anatomy of a classical force field, and why their limits motivate machine-learned potentials."
hook: "Nuclei are at least 1836 times heavier than electrons, so they crawl across an energy landscape that the electrons redraw instantly beneath them. Every classical simulation, from liquid argon to a folding protein, is an approximation to that landscape."
objectives:
  - "Explain why the electron–nucleus mass ratio justifies the Born–Oppenheimer approximation"
  - "Compute the well depth, strongest pull and vibrational frequency of Lennard-Jones argon"
  - "Recognise the terms of a classical force field and estimate their sizes at 300 K"
  - "Explain where fixed-charge force fields fail and which models replace them"
  - "Verify analytic forces against finite differences using a well-chosen step size"
cover: "cover.svg"
milestones:
  - year: 1924
    text: "John Lennard-Jones (then J. E. Jones) fits inverse-power potentials to gas data"
  - year: 1927
    text: "Max Born and J. Robert Oppenheimer separate electronic and nuclear motion"
  - year: 1984
    text: "Murray Daw and Michael Baskes introduce the embedded-atom method for metals"
  - year: 1995
    text: "Cornell, Kollman and co-workers publish the AMBER ff94 protein force field"
track: models
weight: 1
level: Foundation
prereqs: ["motion-and-phase-space"]
minutes: 45
lab: "Pull two atoms apart and read the force"
---

## Atoms move on a landscape

Almost every atomistic simulation, classical or machine-learned, rests on one approximation. Nuclei are thousands of times heavier than electrons, so on the timescale of nuclear motion the electrons relax instantly to their ground state. This **Born–Oppenheimer approximation** separates the problem: for each fixed arrangement of nuclei $\mathbf R = (\mathbf r_1, \dots, \mathbf r_N)$, solving the electronic Schrödinger equation gives one number, the energy $E(\mathbf R)$. As the nuclei move, that number traces out a $3N$-dimensional landscape, the **potential energy surface** (PES).

The force on atom $i$ is the downhill slope of the landscape:

$$
\mathbf F_i = -\nabla_{\mathbf r_i} E(\mathbf R) = -\frac{\partial E}{\partial \mathbf r_i}.
$$

Everything else follows from $E(\mathbf R)$. **Minima** are stable structures: molecules, crystals, adsorption geometries. **First-order saddle points** connect minima and are transition states; their height sets reaction rates. The **curvature** at a minimum, the Hessian $\partial^2 E/\partial\mathbf r_i\partial\mathbf r_j$, gives vibrational frequencies and phonons. Molecular dynamics moves the atoms across the surface under these forces.

The smallest system with a landscape worth drawing is three argon atoms. Hold two of them at their equilibrium separation, 3.82 Å, and move the third through the plane: the energy is then a function of two coordinates and can be drawn as a contour map. With the Lennard-Jones parameters used later in this chapter it has two minima, the equilateral triangles above and below the pair, each at $E = -3\varepsilon = -2.99$ kJ/mol, three bonds' worth of attraction. Between them lie two first-order saddles, the linear chains at 5.73 Å from the centre of the pair, at $-2.03\varepsilon = -2.02$ kJ/mol: the two bonds of the chain plus the weak attraction ($-0.03\varepsilon$) between its end atoms.

{{< fig src="landscape.svg" alt="Contour map of the energy of a third argon atom moving in the plane of a fixed argon pair, with two deep minima above and below the pair, saddle points at both ends, white repulsive cores around the pair, an orange minimum energy path curling round one end and pink arrows pointing downhill" caption="The landscape of an argon trimer, seen by the third atom while the other two are held 3.82 Å apart. The equilateral minima lie 0.97 kJ/mol below the linear saddles; the minimum energy path (orange) is the route a slow, cold atom would take from one minimum to the other." >}}

The Hessian classifies every stationary point. At the equilateral minimum both of its eigenvalues are positive, 2.46 and 7.37 kJ mol⁻¹ Å⁻²: the energy rises in every direction. At the linear saddle one eigenvalue is positive (5.0 kJ mol⁻¹ Å⁻², along the chain) and one is negative, but only just: −0.003 kJ mol⁻¹ Å⁻² for swinging the end atom sideways. The saddle is a broad, almost flat plateau, because the end atom's only lever on the far atom is the 3 % tail of a Lennard-Jones well. Flat saddles of this kind are common in clusters and soft matter, and they are why saddle searches converge slowly there. The line of steepest descent connecting minima through a saddle is the **minimum energy path**; the figure shows one computed with the string method of Weinan E, Weiqing Ren and Eric Vanden-Eijnden (2002), and [the chapter on energy landscapes](../es-landscapes/) treats it and the nudged elastic band in detail. In a real system the same objects live in $3N - 6$ dimensions, and their number grows roughly exponentially with $N$: even small Lennard-Jones clusters of a few dozen atoms have many thousands of distinct minima.

Computing $E(\mathbf R)$ from quantum mechanics, typically with density functional theory (DFT), is accurate but expensive: the cost grows roughly as $N^3$ with the number of electrons, which limits routine DFT molecular dynamics to a few hundred atoms for tens of picoseconds. A **force field** or **interatomic potential** replaces the quantum calculation with a cheap analytic function of the positions. This lesson is about the classical forms; [the lesson on interatomic potentials](../mlip/) replaces them with machine-learned ones.

## Why the electrons can be left behind

Every method in this book inherits the Born–Oppenheimer approximation, and its justification is a mass ratio. A proton is 1836 times heavier than an electron, and a carbon nucleus about 21,900 times. Electrons and nuclei feel Coulomb forces of similar size, so the light electrons respond far faster. In Bohr's semiclassical picture the electron of a hydrogen atom circles its nucleus in about 150 attoseconds, while the fastest nuclear motion in organic matter, a C–H stretch near 3000 cm⁻¹, takes about 11 femtoseconds. The electrons complete some seventy "orbits" per vibration: to them the nuclei look frozen.

{{< fig src="timescales.svg" alt="A logarithmic time axis from 10 attoseconds to 10 picoseconds marking the electron's orbital period in hydrogen at 152 as, a 1 fs MD time step, the 11 fs C–H stretch period, the 200 fs retinal isomerisation and the 1.3 ps Ar₂ vibration" caption="Electrons and nuclei live on different clocks. Seventy-three Bohr orbits fit into one C–H vibration, so the electrons follow the nuclei adiabatically; MD time steps of about 1 fs are set by the fastest nuclear motion, not the electronic one." >}}

Max Born and J. Robert Oppenheimer made this quantitative in 1927 by expanding the energy of a molecule in powers of $\kappa = (m/M)^{1/4}$, the fourth root of the electron-to-nucleus mass ratio. Electronic energies appear at zeroth order, vibrational energies at order $\kappa^2$ (about 0.02 for hydrogen) and rotational energies at order $\kappa^4$. That is why electronic excitations cost electronvolts, vibrational quanta tenths of an electronvolt and rotational quanta millielectronvolts.

The approximation fails where two electronic states come close in energy, as at the **conical intersections** through which photochemistry runs. The first step of vision, the light-driven twist of retinal inside rhodopsin, is over in about 200 fs and needs several surfaces to describe, as in John Tully's surface-hopping method (1990). Ground-state chemistry stays on one surface.

Classical simulation adds a second, separate approximation: the nuclei move as classical particles. That is safe when a nucleus's quantum wave packet is much smaller than the spacing between atoms.

{{< eq title="Thermal de Broglie wavelength" say="The quantum blur of a nucleus of mass m at temperature T; when it is much smaller than the spacing between atoms, the nucleus behaves classically." >}}
$$ \textcolor{#4c6ef5}{\Lambda} = \frac{h}{\sqrt{2\pi\,\textcolor{#12a594}{m}\,k_B\textcolor{#f08c2e}{T}}} $$
- $\textcolor{#4c6ef5}{\Lambda}$: the thermal wavelength, the spatial extent of the nucleus's wave packet
- $\textcolor{#12a594}{m}$: the mass of the nucleus; heavier means more classical
- $\textcolor{#f08c2e}{T}$: the temperature; colder means more quantum
{{< /eq >}}

For argon at 300 K, $\Lambda = 0.16$ Å, tiny next to its 3.4 Å diameter. For hydrogen $\Lambda \approx 1.0$ Å, as long as a bond: an O–H stretch carries a zero-point energy of about 22 kJ/mol, nearly $9\,k_BT$, which classical dynamics ignores. Path-integral molecular dynamics restores such quantum effects when they matter.

## Pair potentials

The simplest model assumes the energy is a sum over pairs that depends only on distance, $E = \sum_{i<j} u(r_{ij})$. The force between a pair is then directed along the line joining them, with magnitude $F(r) = -\mathrm du/\mathrm dr$.

**Lennard-Jones.** For closed-shell atoms such as argon,

$$
u_{\text{LJ}}(r) = 4\varepsilon\left[\left(\frac{\sigma}{r}\right)^{12} - \left(\frac{\sigma}{r}\right)^{6}\right], \qquad
F_{\text{LJ}}(r) = \frac{24\varepsilon}{r}\left[2\left(\frac{\sigma}{r}\right)^{12} - \left(\frac{\sigma}{r}\right)^{6}\right].
$$

The $r^{-6}$ attraction has a physical origin: it is the London dispersion interaction between fluctuating dipoles. The $r^{-12}$ repulsion, standing in for Pauli repulsion between overlapping electron clouds, was chosen mainly because it is the square of $r^{-6}$ and cheap to compute; the true repulsion is closer to exponential. The minimum lies at $r_{\min} = 2^{1/6}\sigma \approx 1.12\,\sigma$ with depth $-\varepsilon$, and the potential crosses zero at $r = \sigma$.

{{< note type="story" >}}
John Edward Jones (1894–1954) took the surname Lennard-Jones when he married Kathleen Lennard in 1925, which is why his 1924 papers on intermolecular forces, fitted to gas viscosities and equations of state, appeared under the name J. E. Jones. The inverse-sixth-power attraction was explained only in 1930, when Fritz London derived the dispersion interaction from quantum mechanics.
{{< /note >}}

**Morse.** For a chemical bond that can dissociate,

$$
u_{\text{M}}(r) = D_e\left[1 - e^{-a(r - r_0)}\right]^2 - D_e ,
$$

with dissociation energy $D_e$, equilibrium length $r_0$ and width parameter $a$. Unlike a spring, it levels off at large $r$: bonds break.

{{< widget name="pes" title="Energy, force and the harmonic approximation" caption="Drag to change the separation. Upper panel: energy; lower panel: force, the negative slope of the energy. The dashed teal curves are the harmonic approximation at the minimum. The vibrational wavenumber uses the reduced mass of Ar₂, H₂ or a C–H bond." >}}

In the lab, notice three things. The force is zero exactly at the energy minimum and largest in magnitude where the energy curve is steepest. Repulsion at short range is far steeper than attraction at long range. And the harmonic approximation (dashed) is good only near the minimum: real bonds are **anharmonic**, softer when stretched and stiffer when compressed, which is why thermal expansion exists.

### Two argon atoms, in numbers

For argon take $\varepsilon = 0.997$ kJ/mol ($\varepsilon/k_B \approx 120$ K) and $\sigma = 3.405$ Å, essentially the values Aneesur Rahman used in his 1964 simulation of liquid argon.

**The well.** The minimum lies at $2^{1/6}\sigma = 3.822$ Å with a depth of 0.997 kJ/mol, or 0.0103 eV. At 300 K the thermal energy $k_BT$ is 2.494 kJ/mol, so the well is only $0.40\,k_BT$ deep. A typical collision carries more than twice the energy needed to separate the pair, which is why argon is a gas at room temperature. It boils at 87 K, where $k_BT \approx 0.73\,\varepsilon$; the liquid holds together because each atom sits in the wells of about a dozen neighbours at once.

**The wall.** At $0.9\sigma$ the energy is already $+6.6\,\varepsilon$, about $9\,k_BT$ in liquid argon near 85 K, so neighbours almost never come closer and $\sigma$ acts as an effective atomic diameter.

**The force.** The pull is strongest not at the minimum but at the inflection point, $r = (26/7)^{1/6}\sigma \approx 1.24\sigma = 4.24$ Å, where $F = -2.40\,\varepsilon/\sigma = -0.70$ kJ mol⁻¹ Å⁻¹. Per pair of atoms rather than per mole, that is 11.7 pN (1 kJ mol⁻¹ Å⁻¹ = 16.6 pN).

{{< note type="fun" >}}
The strongest pull between two argon atoms, about 12 pN, is of the same order as the few piconewtons with which a single kinesin motor protein hauls its cargo along a microtubule, and as the forces that optical tweezers apply to single molecules.
{{< /note >}}

**The spring.** The curvature at the minimum is $k = 72\varepsilon/(2^{1/3}\sigma^2) \approx 57.1\,\varepsilon/\sigma^2 = 4.91$ kJ mol⁻¹ Å⁻², or 0.82 N/m. With the reduced mass of Ar₂, 19.97 u, the harmonic wavenumber is 26 cm⁻¹ and the period 1.3 ps, more than a hundred times slower than a C–H stretch, which is why argon tolerates a 5 fs time step.

**The tail.** At $2.5\sigma$, the usual cut-off, the energy is $-0.016\,\varepsilon$, 1.6 % of the well depth: small enough to truncate and correct for analytically.

{{< note type="try" >}}
In the figure, choose Lennard-Jones (argon) and drag the atom out to about 4.24 Å: the force readout reaches its most negative value, close to −0.70 kJ mol⁻¹ Å⁻¹. Check that the vibrational wavenumber reads 26 cm⁻¹. Then halve ε: the minimum stays at 3.822 Å, but the curvature halves and the wavenumber falls by a factor of √2, to about 19 cm⁻¹.
{{< /note >}}

## The harmonic approximation and vibrations

Expanding any potential to second order about its minimum gives a spring,

$$
u(r) \approx u(r_0) + \tfrac12 k\,(r-r_0)^2, \qquad k = \left.\frac{\mathrm d^2u}{\mathrm dr^2}\right|_{r_0},
$$

and a diatomic of reduced mass $\mu = m_1m_2/(m_1+m_2)$ vibrates with angular frequency $\omega = \sqrt{k/\mu}$, usually quoted as a wavenumber $\tilde\nu = \omega/(2\pi c)$. For the Morse potential, $k = 2D_e a^2$. The H₂ parameters in the lab give about 4400 cm⁻¹, close to the measured harmonic frequency; the C–H bond gives about 2900 cm⁻¹, the familiar C–H stretch region of an infrared spectrum. These numbers matter for simulation: the fastest vibration in a system sets the largest stable time step ([the molecular dynamics lesson](../molecular-dynamics/)).

## Anatomy of a classical force field

Biomolecular and soft-matter force fields such as AMBER, CHARMM, OPLS-AA and GROMOS write the energy as a sum of simple terms:

$$
\begin{aligned}
E = &\sum_{\text{bonds}} \tfrac12 k_b (b - b_0)^2 + \sum_{\text{angles}} \tfrac12 k_\theta(\theta - \theta_0)^2 + \sum_{\text{dihedrals}} k_\phi\big[1 + \cos(n\phi - \delta)\big] \\
&+ \sum_{i<j}\left\{ 4\varepsilon_{ij}\left[\left(\frac{\sigma_{ij}}{r_{ij}}\right)^{12} - \left(\frac{\sigma_{ij}}{r_{ij}}\right)^{6}\right] + \frac{q_iq_j}{4\pi\varepsilon_0 r_{ij}} \right\}.
\end{aligned}
$$

The first line, the **bonded** terms, holds the covalent skeleton together. The second, the **non-bonded** terms, acts between all atoms not closely bonded: van der Waals interactions and electrostatics between fixed partial charges. Parameters for unlike pairs usually come from **combining rules**, for example Lorentz–Berthelot: $\sigma_{ij} = (\sigma_i + \sigma_j)/2$, $\varepsilon_{ij} = \sqrt{\varepsilon_i\varepsilon_j}$.

{{< fig src="forcefield.svg" alt="Schematic of a four-site butane chain next to a water molecule: a spring on the first bond for bond stretching, an arc at the second site for angle bending, a curved arrow around the central bond for torsion, and a dashed line from the chain to the water for non-bonded Lennard-Jones and Coulomb interactions with partial charges on the water" caption="The four kinds of term in a class I force field, drawn on united-atom butane beside a water molecule. Bonded terms act along the covalent skeleton; non-bonded terms act between molecules and between atoms at least three bonds apart, with the 1–4 pair scaled." >}}

Non-bonded terms are not applied to every pair. Atoms joined by a bond (1–2 pairs) or by a common neighbour (1–3 pairs) are **excluded**, because the bond and angle terms already describe their interaction. Pairs at the two ends of a dihedral (1–4 pairs) feel scaled non-bonded interactions, with factors that differ between families: AMBER divides 1–4 electrostatics by 1.2 and 1–4 Lennard-Jones by 2, OPLS-AA halves both, and CHARMM leaves the electrostatics unscaled. The torsion parameters were fitted together with these factors, so neither can be changed on its own.

### A sense of scale

The terms differ in stiffness by orders of magnitude. The table gives typical values for an AMBER-family description of sp³ carbon, measured against the thermal energy $k_BT = 2.49$ kJ/mol at 300 K.

| Term | Typical parameters | Size at 300 K |
|---|---|---|
| C–C bond stretch | $b_0 = 0.153$ nm, $k_b \approx 2.6\times10^5$ kJ mol⁻¹ nm⁻² | fluctuates by about 0.003 nm |
| C–C–C angle bend | $\theta_0 = 109.5°$, $k_\theta \approx 335$ kJ mol⁻¹ rad⁻² | fluctuates by about 5° |
| Torsion | barriers of 0–15 kJ/mol; ethane 12 kJ/mol | a few $k_BT$: crossed routinely |
| Lennard-Jones, per pair | $\varepsilon \approx 0.05$–1 kJ/mol, $\sigma \approx 0.25$–0.40 nm | below $k_BT$ |
| Coulomb, per pair of sites | partial charges of a few tenths of $e$ | up to hundreds of kJ/mol, largely cancelling |

Equipartition turns force constants into fluctuations. Each harmonic term holds on average $\tfrac12 k_BT$, so the root-mean-square deviation is $\sqrt{k_BT/k}$: about 0.003 nm for the C–C bond, 2 % of its length, and about 5° for the angle. Bonds and angles are stiff. They fix the shape of a molecule but carry almost none of its conformational freedom.

The soft terms decide everything else. Torsions, with barriers of a few $k_BT$, set which conformers are populated, from the trans and gauche states of butane to the backbone of a protein. A single Lennard-Jones pair is bound by less than $k_BT$, but an atom in a liquid has hundreds of neighbours within the cut-off, and these small terms add up to heats of vaporisation. Coulomb terms between individual sites are large (two unit charges 0.3 nm apart in vacuum interact with 463 kJ/mol) but largely cancel within neutral molecules, leaving net interactions such as the roughly 20 kJ/mol of a hydrogen bond between two water molecules. This is where force-field developers spend most of their effort: an error of 1 kJ/mol, less than half of $k_BT$, shifts a conformational equilibrium by a factor of 1.5.

### Worked example: the butane torsion

Butane, CH₃–CH₂–CH₂–CH₃, is the textbook case of a torsional equilibrium and the shortest alkane with one. In the united-atom model of Jean-Paul Ryckaert and André Bellemans, each CH₂ or CH₃ group is a single site and the rotation about the central bond is governed by a cosine series in $\psi = \phi - 180°$,

$$
V(\psi) = \sum_{n=0}^{5} C_n \cos^n\psi ,
$$

with $C_0, \dots, C_5 = 9.28,\ 12.16,\ -13.12,\ -3.06,\ 26.24,\ -31.5$ kJ/mol, the values tabulated in the GROMACS manual. Evaluating it at a few angles gives the whole conformational story. The trans state ($\phi = 180°$) is the zero of energy. The two gauche states ($\phi = 60°$ and $300°$) lie 2.93 kJ/mol higher, $1.17\,k_BT$ at 300 K. The trans–gauche barriers at $120°$ and $240°$ are 12.35 kJ/mol, about $5\,k_BT$, and the eclipsed cis state is 44.8 kJ/mol up, $18\,k_BT$, and essentially never visited.

{{< fig src="butane.svg" alt="Top: the Ryckaert–Bellemans torsion energy of butane against dihedral angle, with the trans minimum at 180 degrees, gauche minima at 60 and 300 degrees, barriers of 12.4 kJ/mol and a cis maximum of 44.8 kJ/mol. Bottom: the Boltzmann probability at 300 K with a tall trans peak holding 65 percent and two gauche peaks holding 17.5 percent each" caption="The butane torsion and the populations it produces at 300 K. The gauche wells are only 1.2 $k_BT$ above trans, so a third of the molecules are gauche at any instant; the trans well is also wider, which adds a little entropy in its favour." >}}

A first estimate of the populations treats each well as a single state: the trans fraction is $1/(1 + 2e^{-2.93/2.494}) = 0.62$. Integrating the Boltzmann factor $e^{-V(\phi)/k_BT}$ over the whole circle instead gives 0.65 trans and 0.175 for each gauche well. The difference is entropic. The curvature of the trans well, 76 kJ mol⁻¹ rad⁻², is smaller than that of a gauche well, 105 kJ mol⁻¹ rad⁻², so the trans well is wider (an rms spread of 10.4° against 8.8°) and holds more states. Cooling to 200 K raises the trans fraction to 0.77; heating to 400 K lowers it to 0.58. The barrier of $5\,k_BT$ also sets the time scale: with an attempt frequency of order $10^{12}$ s⁻¹ and a Boltzmann factor $e^{-4.95} \approx 0.007$, a given molecule leaves the trans well roughly once every 100 ps, which is why a nanosecond of MD samples butane's torsion thoroughly while a protein backbone, with many coupled torsions, needs microseconds or more.

{{< note type="warn" title="Myth" >}}
**Myth:** the torsion parameter $k_\phi$ is the barrier to rotation. **Reality:** the barrier you would measure is the sum of the torsion term, the scaled 1–4 Lennard-Jones and Coulomb terms, and the relaxation of bonds and angles as the molecule turns. Torsion parameters are fitted last, as the difference between a quantum-chemical scan and everything else in the force field, so they absorb the errors of the other terms. That is the reason a torsion cannot be transplanted from one force field into another.
{{< /note >}}

### Domains of validity

Every parameter is fitted, to quantum-chemical calculations (geometries, torsion scans, electrostatic potentials) and to experiments (densities, heats of vaporisation, hydration free energies). A force field is therefore a model with a domain of validity, and it can fail outside it. Two failures recur.

- **Fixed charges cannot polarise.** A molecule next to a metal surface or an ion has its electron density distorted; fixed point charges cannot respond. **Polarisable** force fields add induced dipoles or Drude oscillators, at a cost. For gold surfaces, for example, the GolP-CHARMM force field adds a mobile image charge to every gold atom.
- **Combining rules are approximations.** In concentrated solutions, the default cross-interactions between unlike groups can be wrong enough to cause artificial aggregation. Pair-specific corrections (NBFIX in CHARMM) are fitted to experimental osmotic coefficients to fix them.

Other material classes need other functional forms. Metals are poorly described by pair potentials because metallic bonding depends on the local electron density; the **embedded-atom method** (EAM) adds a many-body embedding term $F_i(\bar\rho_i)$ for each atom. Covalent solids such as silicon need angle-dependent terms (Stillinger–Weber, Tersoff). Reactive force fields such as **ReaxFF** let bond orders change continuously so that bonds can form and break.

{{< note type="warn" title="Force fields are fitted as a package" >}}
Charges, Lennard-Jones parameters, water model, combining rule, 1–4 factors and cut-off treatment were fitted together, and they only work together. Common errors are pairing a force field with a water model it was not parameterised with, taking ligand parameters from another family (GAFF belongs with AMBER, CGenFF with CHARMM), and changing the published cut-off scheme. In GROMACS, check the `[ defaults ]` section of the topology against the family your parameters came from.
{{< /note >}}

{{< note type="key" >}}
- A potential energy surface $E(\mathbf R)$ is the central object of atomistic modelling; forces are its negative gradient.
- The Born–Oppenheimer approximation rests on the electron–nucleus mass ratio; classical simulation adds classical nuclei, good for argon and questionable for hydrogen.
- Stiff bonds and angles fix the geometry, while torsions and non-bonded terms of order $k_BT$ decide conformations and phases.
- Classical force fields are fast, physically motivated sums of simple terms, but have fixed functional forms and fixed charges, so they transfer poorly to chemistry they were not fitted for.
- Machine-learned interatomic potentials keep the speed and drop the fixed functional form: they learn $E(\mathbf R)$ directly from quantum-mechanical data.
{{< /note >}}

## In practice

Check any potential you implement against a finite-difference derivative. For Lennard-Jones argon:

```python
import numpy as np

eps, sig = 0.997, 3.405                    # argon: kJ/mol, Å
def U(r):                                  # Lennard-Jones energy
    s6 = (sig / r) ** 6
    return 4 * eps * (s6 * s6 - s6)
def F(r):                                  # force = -dU/dr (positive = repulsive)
    s6 = (sig / r) ** 6
    return 24 * eps * (2 * s6 * s6 - s6) / r

r = np.linspace(3.2, 8.0, 2001)
rmin = r[np.argmin(U(r))]
print(f"minimum at r = {rmin:.3f} Å   (2^(1/6) σ = {2**(1/6)*sig:.3f} Å)")
print(f"U(rmin) = {U(rmin):.3f} kJ/mol (= -ε)")

h = 1e-5                                   # check the analytic force by finite differences
print(f"F(4.0) analytic {F(4.0):.6f}, numerical {-(U(4.0+h)-U(4.0-h))/(2*h):.6f}")
```

```text
minimum at r = 3.822 Å   (2^(1/6) σ = 3.822 Å)
U(rmin) = -0.997 kJ/mol (= -ε)
F(4.0) analytic -0.544033, numerical -0.544033
```

A check at a single step size can mislead. The cell below compares the analytic forces on all twelve coordinates of a distorted four-atom argon cluster with central differences, for steps from 0.1 Å down to $10^{-10}$ Å.

{{< py title="checking forces on a cluster" >}}
import numpy as np
eps, sig = 0.997, 3.405                       # argon: kJ/mol, Å
def energy(x):                                # total LJ energy of a cluster, x of shape (N, 3)
    r = np.linalg.norm(x[:, None] - x[None], axis=-1)[np.triu_indices(len(x), 1)]
    return np.sum(4 * eps * ((sig / r) ** 12 - (sig / r) ** 6))
def forces(x):                                # analytic forces F_i = -dE/dx_i, kJ/mol/Å
    d = x[:, None] - x[None]
    r2 = (d ** 2).sum(-1); np.fill_diagonal(r2, np.inf)
    s6 = (sig ** 2 / r2) ** 3
    return ((24 * eps * (2 * s6 ** 2 - s6) / r2)[:, :, None] * d).sum(1)
rng = np.random.default_rng(1)                # a distorted tetrahedron of four atoms
x = 3.8 / np.sqrt(8) * np.array([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1.]])
x += rng.normal(scale=0.2, size=x.shape)
F = forces(x)
print(f"E = {energy(x):.4f} kJ/mol, largest |F| = {np.abs(F).max():.2f} kJ/mol/Å, sum of forces = {np.abs(F.sum(0)).max():.0e}")
for h in [1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-8, 1e-10]:
    num = np.zeros_like(x)
    for i, a in np.ndindex(*x.shape):         # central difference for every coordinate
        e = np.zeros_like(x); e[i, a] = h
        num[i, a] = -(energy(x + e) - energy(x - e)) / (2 * h)
    print(f"h = {h:.0e} Å   largest error = {np.abs(num - F).max():.1e} kJ/mol/Å")
{{< /py >}}

The forces sum to zero to round-off, as Newton's third law requires of an energy that depends only on relative positions. The error falls a hundredfold for every tenfold reduction in $h$, the $h^2$ truncation error of a central difference, down to about $h = 10^{-5}$ Å. Below that, round-off in subtracting two nearly equal energies takes over and the error grows again. The best step lies near the cube root of machine precision, about $6\times10^{-6}$, times the length scale of the problem. There, analytic and numerical forces agree to eight or more significant figures; a disagreement in the third or fourth figure points to a bug, such as a sign error or a missing term.

{{< note type="warn" title="Units" >}}
Codes disagree on units, and silent unit errors are the commonest bug in simulation set-up. GROMACS uses nm, ps and kJ/mol; LAMMPS `real` units use Å, fs and kcal/mol, while `metal` units use Å, ps and eV; ASE uses Å and eV. Useful conversions: 1 eV = 96.485 kJ/mol = 23.061 kcal/mol; 1 kcal = 4.184 kJ; $k_BT$ at 298 K = 2.479 kJ/mol = 0.0257 eV. GROMACS and AMBER also differ by a factor of 2 in how they write harmonic force constants ($\tfrac12k$ against $k$).
{{< /note >}}

{{< quiz >}}
- q: "At the minimum of a pair potential, what is the force between the two atoms?"
  options: ["Maximally attractive", "Zero", "Maximally repulsive"]
  answer: 1
  why: "Force is the negative derivative of the energy, and the derivative vanishes at a minimum. The largest attractive force occurs further out, at the inflection point of the curve."
- q: "Where is the minimum of the Lennard-Jones potential?"
  options: ["At $r = \\sigma$", "At $r = 2^{1/6}\\sigma \\approx 1.12\\sigma$", "At $r = 2\\sigma$"]
  answer: 1
  why: "Setting $\\mathrm du/\\mathrm dr = 0$ gives $(\\sigma/r)^6 = 1/2$, so $r = 2^{1/6}\\sigma$. At $r = \\sigma$ the potential is zero, not minimal."
- q: "Why do classical fixed-charge force fields struggle to describe a molecule adsorbing on a metal surface?"
  options: ["Because metals have no van der Waals interactions", "Because the metal's electrons respond to the molecule's charges (image charges and polarisation), which fixed charges cannot represent", "Because metals are too heavy to simulate"]
  answer: 1
  why: "A conductor screens nearby charges through induced image charges. Fixed point charges have no way to respond; polarisable models such as Drude oscillators or image-charge schemes add that physics."
- q: "The harmonic frequency of a bond is $\\omega = \\sqrt{k/\\mu}$. Replacing H by D roughly doubles the reduced mass of an X–H bond with a heavy X. What happens to the vibrational frequency?"
  options: ["It doubles", "It falls by a factor of about $\\sqrt2$", "It does not change, because the potential is the same"]
  answer: 1
  why: "The Born–Oppenheimer surface, and so $k$, is unchanged by isotopic substitution, but $\\omega \\propto 1/\\sqrt\\mu$. An X–H stretch near 2900 cm⁻¹ moves to about 2100 cm⁻¹ for X–D."
- q: "Why can the electrons be assumed to adjust instantly as the nuclei move?"
  options: ["Electrons are at least 1836 times lighter, so their motion is far faster than any nuclear vibration", "Electrons and nuclei do not exert forces on each other", "Nuclei are classical particles, while electrons are quantum particles"]
  answer: 0
  why: "Electronic motion takes a few hundred attoseconds or less; the fastest nuclear vibration, a C–H stretch, takes about 11 fs."
- q: "The Lennard-Jones well depth of argon is 0.997 kJ/mol, and $k_BT$ at 300 K is 2.49 kJ/mol. What follows?"
  options: ["Argon pairs are tightly bound at room temperature", "A typical thermal collision carries more than enough energy to separate a pair, so argon is a gas at room temperature", "Argon must be a solid at room temperature"]
  answer: 1
  why: "The well is only $0.4\\,k_BT$ deep at 300 K. Argon condenses near 87 K, where the wells of a dozen neighbours together hold each atom."
- q: "A C–C bond has $k_b \\approx 2.6\\times10^5$ kJ mol⁻¹ nm⁻². By equipartition, by how much does its length typically fluctuate at 300 K?"
  options: ["About 0.003 nm", "About 0.03 nm", "About 0.3 nm"]
  answer: 0
  why: "$\\delta_{\\text{rms}} = \\sqrt{k_BT/k_b} = \\sqrt{2.49/2.6\\times10^5}$ nm $\\approx 0.003$ nm, about 2 % of the bond length."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. M. Born and R. Oppenheimer, “Zur Quantentheorie der Molekeln,” *Annalen der Physik* **389**, 457–484 (1927).
2. J. E. Lennard-Jones, “On the determination of molecular fields. II. From the equation of state of a gas,” *Proceedings of the Royal Society A* **106**, 463–477 (1924).
3. P. M. Morse, “Diatomic molecules according to the wave mechanics. II. Vibrational levels,” *Physical Review* **34**, 57–64 (1929).
4. A. R. Leach, *Molecular Modelling: Principles and Applications*, 2nd ed., Pearson (2001), chapter 4 (empirical force field models).
5. M. P. Allen and D. J. Tildesley, *Computer Simulation of Liquids*, 2nd ed., Oxford University Press (2017), chapter 1.
6. W. D. Cornell, P. Cieplak, C. I. Bayly, I. R. Gould, K. M. Merz, D. M. Ferguson, D. C. Spellmeyer, T. Fox, J. W. Caldwell and P. A. Kollman, “A second generation force field for the simulation of proteins, nucleic acids, and organic molecules,” *Journal of the American Chemical Society* **117**, 5179–5197 (1995).
7. A. D. MacKerell Jr. et al., “All-atom empirical potential for molecular modeling and dynamics studies of proteins,” *Journal of Physical Chemistry B* **102**, 3586–3616 (1998).
8. W. L. Jorgensen, D. S. Maxwell and J. Tirado-Rives, “Development and testing of the OPLS all-atom force field on conformational energetics and properties of organic liquids,” *Journal of the American Chemical Society* **118**, 11225–11236 (1996).
9. M. S. Daw and M. I. Baskes, “Embedded-atom method: derivation and application to impurities, surfaces, and other defects in metals,” *Physical Review B* **29**, 6443–6453 (1984).
10. A. C. T. van Duin, S. Dasgupta, F. Lorant and W. A. Goddard III, “ReaxFF: a reactive force field for hydrocarbons,” *Journal of Physical Chemistry A* **105**, 9396–9409 (2001).
11. L. B. Wright, P. M. Rodger, S. Corni and T. R. Walsh, “GolP-CHARMM: first-principles based force fields for the interaction of proteins with Au(111) and Au(100),” *Journal of Chemical Theory and Computation* **9**, 1616–1630 (2013).
12. S. Panigrahy, R. Sahu, S. K. Reddy and D. Nayar, “Structure, energetics and dynamics in crowded amino acid solutions: a molecular dynamics study,” *Physical Chemistry Chemical Physics* **25**, 5430–5442 (2023), an example of NBFIX corrections fitted to osmotic coefficients.
13. J. C. Tully, “Molecular dynamics with electronic transitions,” *Journal of Chemical Physics* **93**, 1061–1071 (1990).
14. T. E. Markland and M. Ceriotti, “Nuclear quantum effects enter the mainstream,” *Nature Reviews Chemistry* **2**, 0109 (2018).
15. A. Rahman, “Correlations in the motion of atoms in liquid argon,” *Physical Review* **136**, A405–A411 (1964).

</div>
