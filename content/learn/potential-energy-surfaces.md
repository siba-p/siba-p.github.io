---
title: "Potential energy surfaces and force fields"
description: "The Born–Oppenheimer picture, forces as gradients, pair potentials, the anatomy of a classical force field, and why their limits motivate machine-learned potentials."
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

Computing $E(\mathbf R)$ from quantum mechanics, typically with density functional theory (DFT), is accurate but expensive: the cost grows roughly as $N^3$ with the number of electrons, which limits routine DFT molecular dynamics to a few hundred atoms for tens of picoseconds. A **force field** or **interatomic potential** replaces the quantum calculation with a cheap analytic function of the positions. This lesson is about the classical forms; [the lesson on interatomic potentials](../mlip/) replaces them with machine-learned ones.

## Pair potentials

The simplest model assumes the energy is a sum over pairs that depends only on distance, $E = \sum_{i<j} u(r_{ij})$. The force between a pair is then directed along the line joining them, with magnitude $F(r) = -\mathrm du/\mathrm dr$.

**Lennard-Jones.** For closed-shell atoms such as argon,

$$
u_{\text{LJ}}(r) = 4\varepsilon\left[\left(\frac{\sigma}{r}\right)^{12} - \left(\frac{\sigma}{r}\right)^{6}\right], \qquad
F_{\text{LJ}}(r) = \frac{24\varepsilon}{r}\left[2\left(\frac{\sigma}{r}\right)^{12} - \left(\frac{\sigma}{r}\right)^{6}\right].
$$

The $r^{-6}$ attraction has a physical origin: it is the London dispersion interaction between fluctuating dipoles. The $r^{-12}$ repulsion, standing in for Pauli repulsion between overlapping electron clouds, was chosen mainly because it is the square of $r^{-6}$ and cheap to compute; the true repulsion is closer to exponential. The minimum lies at $r_{\min} = 2^{1/6}\sigma \approx 1.12\,\sigma$ with depth $-\varepsilon$, and the potential crosses zero at $r = \sigma$.

**Morse.** For a chemical bond that can dissociate,

$$
u_{\text{M}}(r) = D_e\left[1 - e^{-a(r - r_0)}\right]^2 - D_e ,
$$

with dissociation energy $D_e$, equilibrium length $r_0$ and width parameter $a$. Unlike a spring, it levels off at large $r$: bonds break.

{{< widget name="pes" title="Energy, force and the harmonic approximation" caption="Drag to change the separation. Upper panel: energy; lower panel: force, the negative slope of the energy. The dashed teal curves are the harmonic approximation at the minimum. The vibrational wavenumber uses the reduced mass of Ar₂, H₂ or a C–H bond." >}}

In the lab, notice three things. The force is zero exactly at the energy minimum and largest in magnitude where the energy curve is steepest. Repulsion at short range is far steeper than attraction at long range. And the harmonic approximation (dashed) is good only near the minimum: real bonds are **anharmonic**, softer when stretched and stiffer when compressed, which is why thermal expansion exists.

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

Every parameter is fitted, to quantum-chemical calculations (geometries, torsion scans, electrostatic potentials) and to experiments (densities, heats of vaporisation, hydration free energies). A force field is therefore a model with a domain of validity, and it can fail outside it. Two failures recur.

- **Fixed charges cannot polarise.** A molecule next to a metal surface or an ion has its electron density distorted; fixed point charges cannot respond. **Polarisable** force fields add induced dipoles or Drude oscillators, at a cost. For gold surfaces, for example, the GolP-CHARMM force field adds a mobile image charge to every gold atom.
- **Combining rules are approximations.** In concentrated solutions, the default cross-interactions between unlike groups can be wrong enough to cause artificial aggregation. Pair-specific corrections (NBFIX in CHARMM) are fitted to experimental osmotic coefficients to fix them.

Other material classes need other functional forms. Metals are poorly described by pair potentials because metallic bonding depends on the local electron density; the **embedded-atom method** (EAM) adds a many-body embedding term $F_i(\bar\rho_i)$ for each atom. Covalent solids such as silicon need angle-dependent terms (Stillinger–Weber, Tersoff). Reactive force fields such as **ReaxFF** let bond orders change continuously so that bonds can form and break.

{{< note type="key" >}}
- A potential energy surface $E(\mathbf R)$ is the central object of atomistic modelling; forces are its negative gradient.
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

</div>
