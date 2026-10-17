---
title: "Transport coefficients: diffusion, viscosity and conductivity"
description: "Computing how matter, momentum and charge move from equilibrium molecular dynamics: Brownian motion and Einstein's relation, the mean-squared displacement, time-correlation functions and the velocity autocorrelation, the Green–Kubo relations for diffusion, viscosity, thermal and electrical conductivity, the cage effect and long-time tails, finite-size corrections, and practical error estimation."
track: analysis
weight: 2
level: Core
prereqs: ["trajectory-analysis", "fluctuations-and-response", "thermostats-and-barostats"]
lab: "Measure the diffusion coefficient of a Lennard-Jones fluid two ways, from the mean-squared displacement and from the velocity autocorrelation"
---

## From fluctuations to transport

Transport coefficients describe how a system responds to gradients: the diffusion coefficient relates a flux of particles to a concentration gradient (Fick's law), the shear viscosity relates a momentum flux to a velocity gradient, the thermal conductivity relates a heat flux to a temperature gradient, and the electrical conductivity relates a current to an electric field. They can be measured in simulations by imposing a gradient and measuring the flux, but [the fluctuation–dissipation theorem](../fluctuations-and-response/) offers a more elegant route: in equilibrium, the spontaneous fluctuations of the fluxes already contain the transport coefficients. This topic shows how, starting with the oldest example, diffusion.

## Brownian motion and the mean-squared displacement

In 1827 the botanist Robert Brown observed pollen particles in water moving erratically, a motion he could not explain. In 1905 Albert Einstein showed that such motion is caused by collisions with the molecules of the liquid and that, although each trajectory is random, its statistics are precise: the mean-squared displacement grows linearly in time, with a slope set by the diffusion coefficient, and the diffusion coefficient is related to the friction the particle feels, $D = k_BT/\zeta$. Jean Perrin's measurements of this growth in 1908–1909 confirmed Einstein's theory and gave one of the first accurate values of Avogadro's number, settling the long debate about the reality of atoms.

For a particle in a simulation the same law holds once its motion has become diffusive:

{{< eq title="The Einstein relation" say="At long times, the average squared distance travelled grows in proportion to time, and the slope is 2d times the diffusion coefficient." >}}
$$ \text{MSD}(t) = \Big\langle \big|\mathbf r_i(t_0 + t) - \mathbf r_i(t_0)\big|^2 \Big\rangle_{i,\,t_0} \;\xrightarrow{\;t\to\infty\;}\; 2\,d\,\textcolor{#12a594}{D}\,t $$
- $d$: the dimension (6Dt in three dimensions, 4Dt in two)
- the average runs over all particles and over many time origins $t_0$
- positions must be **unwrapped**: periodic boundary jumps must be removed before computing displacements
{{< /eq >}}

At short times the motion is **ballistic**, $\text{MSD} \approx \langle v^2\rangle t^2$, because a particle moves freely between collisions. In a dense liquid there is an intermediate regime where each particle rattles in a cage formed by its neighbours before escaping. Only at times long compared with these processes does the MSD become linear, and the diffusion coefficient is read from the slope in that regime, typically on a log–log plot to check that the exponent has reached 1.

## Time-correlation functions and Green–Kubo

The displacement is the time integral of the velocity, so the MSD can be rewritten in terms of the **velocity autocorrelation function** (VACF), $C_v(t) = \langle \mathbf v_i(0)\cdot\mathbf v_i(t)\rangle$, the average product of a particle's velocity now with its velocity a time $t$ later. Differentiating the Einstein relation twice gives the **Green–Kubo** formula for diffusion:

{{< eq title="Diffusion from the velocity autocorrelation" say="A particle diffuses far if its velocity stays correlated with itself for a long time: the diffusion coefficient is the area under the velocity autocorrelation function." >}}
$$ \textcolor{#12a594}{D} = \frac{1}{d}\int_0^\infty \big\langle \mathbf v_i(0)\cdot\mathbf v_i(t)\big\rangle\,\mathrm dt $$
- $C_v(0) = d\,k_BT/m$ by equipartition
- a rapid decay means rapid loss of memory and slow diffusion; a slow decay means persistent motion and fast diffusion
{{< /eq >}}

Melville Green (1952, 1954) and Ryogo Kubo (1957) showed that every transport coefficient has such a representation: the integral over time of the equilibrium autocorrelation function of the corresponding microscopic flux. The general pattern is

$$
\gamma = \frac{1}{\text{normalisation}}\int_0^\infty \big\langle J(0)\,J(t)\big\rangle\,\mathrm dt ,
$$

with $J$ the particle velocity for diffusion, an off-diagonal component of the pressure tensor for shear viscosity, $\eta = \frac{V}{k_BT}\int_0^\infty\langle P_{xy}(0)P_{xy}(t)\rangle\mathrm dt$, the heat current for thermal conductivity, and the electric current for electrical conductivity.

The figure runs a two-dimensional Lennard-Jones fluid and computes both estimates of the diffusion coefficient from the same trajectory, averaging over particles and over many time origins.

{{< widget name="transport" title="Diffusion two ways" caption="Left: the mean-squared displacement with a straight-line fit to its long-time part (slope 4D in two dimensions). Right: the normalised velocity autocorrelation function (orange) and its running integral (teal, scaled). The readouts compare D from the Einstein relation and from the Green–Kubo integral. Raise the density to see the cage effect." >}}

At low density the VACF decays smoothly and monotonically: a particle keeps moving in roughly the same direction until a collision randomises it. At high liquid densities it develops a negative dip: a particle moving into its cage of neighbours rebounds, so its velocity a short time later is anticorrelated with its initial velocity. This **cage effect** reduces the diffusion coefficient, because the negative part of the VACF subtracts from its integral. The two estimates agree within statistical error, as they must, but they converge differently: the Einstein estimate needs the MSD to be clearly linear, and the Green–Kubo integral needs the VACF to have decayed to zero, with noise in its tail accumulating in the integral.

## Long-time tails and finite-size effects

In 1967–1970 Berni Alder and Thomas Wainwright, simulating hard spheres, discovered that the VACF does not decay exponentially at long times, as kinetic theory had assumed, but as a power law, $t^{-d/2}$. A moving particle sets up a vortex flow in the surrounding fluid that pushes it from behind, a hydrodynamic memory effect. This **long-time tail** was one of the first major discoveries made by computer simulation. In two dimensions the $t^{-1}$ tail makes the Green–Kubo integral diverge logarithmically, so a strictly defined diffusion coefficient does not exist in two-dimensional fluids, which is worth remembering when interpreting the figure; in three dimensions the $t^{-3/2}$ tail is integrable.

The same hydrodynamic interactions cause a systematic **finite-size effect** in periodic simulations: a particle interacts with the flows set up by its own periodic images, which lowers its diffusion coefficient. In three dimensions the correction derived by In-Chul Yeh and Gerhard Hummer (2004) is $D_\infty = D_{\text{PBC}} + \frac{\xi\,k_BT}{6\pi\eta L}$, with $\xi \approx 2.837$ for a cubic box of side $L$ and $\eta$ the shear viscosity. For water in a box of a few nanometres the correction is about 10–20 %, comparable to many of the differences between force fields that simulations try to resolve, so it should always be applied or checked by varying the box size.

## Practical transport calculations

Several practical points determine whether a transport calculation is reliable. Use thermostats that do not disturb the dynamics, or measure in NVE after equilibration, as [the topic on thermostats](../thermostats-and-barostats/) explains; strong Langevin friction lowers diffusion coefficients directly. Unwrap trajectories and remove any drift of the centre of mass. Average over many time origins, but remember that overlapping windows are correlated, so estimate errors by splitting the trajectory into independent blocks or running independent replicas. For collective properties such as viscosity and conductivity, which involve a single flux for the whole system rather than one per particle, statistics are much poorer than for self-diffusion, and long runs, several independent simulations or the Einstein–Helfand (integrated) forms of the Green–Kubo relations are needed. Non-equilibrium methods, such as imposing shear flow (Lees–Edwards boundaries, or the reverse non-equilibrium method of Florian Müller-Plathe, 1999), are often more efficient for viscosity and thermal conductivity.

{{< note type="key" >}}
- Einstein: $\text{MSD}(t) \to 2dDt$ at long times (unwrapped positions, averaged over particles and time origins); ballistic at short times, caged in dense liquids.
- Green–Kubo: $D = \frac1d\int_0^\infty\langle\mathbf v(0)\cdot\mathbf v(t)\rangle\mathrm dt$; every transport coefficient is the time integral of a flux autocorrelation (viscosity from $P_{xy}$, conductivities from heat and charge currents).
- The cage effect makes the VACF negative at short times in dense liquids; hydrodynamic long-time tails decay as $t^{-d/2}$.
- Periodic boxes lower $D$ by $\xi k_BT/6\pi\eta L$ (Yeh–Hummer); use dynamics-preserving thermostats and honest error estimates.
{{< /note >}}

{{< quiz >}}
- q: "A 3D MSD has slope 6 × 10⁻⁹ m²/s at long times. What is D?"
  options: ["6 × 10⁻⁹ m²/s", "1 × 10⁻⁹ m²/s", "3 × 10⁻⁹ m²/s"]
  answer: 1
  why: "MSD = 6Dt in three dimensions."
- q: "Why does the VACF of a dense liquid become negative at short times?"
  options: ["Numerical error", "Particles rebound off the cage of neighbours, reversing their velocity", "The thermostat"]
  answer: 1
  why: "The cage effect produces anticorrelation and reduces diffusion."
- q: "Two simulations of water in boxes of 2 nm and 6 nm give different self-diffusion coefficients. Which is closer to the infinite-system value, and why?"
  options: ["The 2 nm box, because it is cheaper", "The 6 nm box, because the hydrodynamic finite-size correction scales as 1/L", "They should be identical"]
  answer: 1
  why: "Yeh–Hummer: D_PBC is lowered by ξk_BT/6πηL."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. A. Einstein, "Über die von der molekularkinetischen Theorie der Wärme geforderte Bewegung von in ruhenden Flüssigkeiten suspendierten Teilchen", *Annalen der Physik* **17**, 549–560 (1905).
2. J. Perrin, "Mouvement brownien et réalité moléculaire", *Annales de Chimie et de Physique* **18**, 5–114 (1909).
3. M. S. Green, "Markoff random processes and the statistical mechanics of time-dependent phenomena. II. Irreversible processes in fluids", *Journal of Chemical Physics* **22**, 398–413 (1954).
4. R. Kubo, "Statistical-mechanical theory of irreversible processes. I", *Journal of the Physical Society of Japan* **12**, 570–586 (1957).
5. B. J. Alder and T. E. Wainwright, "Decay of the velocity autocorrelation function", *Physical Review A* **1**, 18–21 (1970).
6. I.-C. Yeh and G. Hummer, "System-size dependence of diffusion coefficients and viscosities from molecular dynamics simulations with periodic boundary conditions", *Journal of Physical Chemistry B* **108**, 15873–15879 (2004).
7. F. Müller-Plathe, "Reversing the perturbation in nonequilibrium molecular dynamics: an easy way to calculate the shear viscosity of fluids", *Physical Review E* **59**, 4894–4898 (1999).
8. J.-P. Hansen and I. R. McDonald, *Theory of Simple Liquids*, 4th ed., Academic Press (2013), chapters 7–8.
9. E. J. Maginn, R. A. Messerly, D. J. Carlson, D. R. Roe and J. R. Elliott, "Best practices for computing transport properties 1. Self-diffusivity and viscosity from equilibrium molecular dynamics", *Living Journal of Computational Molecular Science* **1**, 6324 (2019).

</div>
