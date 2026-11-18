---
title: "Transport coefficients"
description: "Computing how matter, momentum and charge move from equilibrium molecular dynamics: Brownian motion and Einstein's relation, the mean-squared displacement, time-correlation functions and the velocity autocorrelation, the Green–Kubo relations for diffusion, viscosity, thermal and electrical conductivity, the cage effect and long-time tails, finite-size corrections, and practical error estimation."
hook: "A liquid in equilibrium has no net flow and no gradients, yet its viscosity, diffusion coefficient and conductivities can all be read from it: Green and Kubo showed they are written in how its spontaneous fluctuations fade."
objectives:
  - "Extract a diffusion coefficient from the linear regime of the mean-squared displacement"
  - "Connect the Einstein relation to the Green–Kubo integral of the velocity autocorrelation"
  - "Identify the flux whose autocorrelation gives viscosity, thermal or electrical conductivity"
  - "Interpret the cage effect and hydrodynamic long-time tails in the velocity autocorrelation"
  - "Correct diffusion coefficients for the finite size of a periodic box"
cover: "cover.svg"
milestones:
  - year: 1905
    text: "Einstein links Brownian motion to the diffusion coefficient and molecular friction"
  - year: 1957
    text: "Kubo publishes linear-response theory, generalising Green's flux-correlation formulas"
  - year: 1964
    text: "Rahman simulates 864 argon atoms and finds a negative velocity autocorrelation"
  - year: 1970
    text: "Alder and Wainwright report hydrodynamic long-time tails in hard-sphere simulations"
track: analysis
weight: 2
level: Core
prereqs: ["trajectory-analysis", "fluctuations-and-response", "thermostats-and-barostats"]
lab: "Measure the diffusion coefficient of a Lennard-Jones fluid two ways, from the mean-squared displacement and from the velocity autocorrelation"
---

## From fluctuations to transport

Transport coefficients describe how a system responds to gradients: the diffusion coefficient relates a flux of particles to a concentration gradient (Fick's law), the shear viscosity relates a momentum flux to a velocity gradient, the thermal conductivity relates a heat flux to a temperature gradient, and the electrical conductivity relates a current to an electric field. They can be measured in simulations by imposing a gradient and measuring the flux, but [the fluctuation–dissipation theorem](../fluctuations-and-response/) offers a second route: in equilibrium, the spontaneous fluctuations of the fluxes already contain the transport coefficients. This chapter shows how, starting with the oldest example, diffusion.

### Four coefficients, four fluxes

Each coefficient is the proportionality constant of a linear law that was found empirically long before anyone could compute it: Adolf Fick's law of diffusion (1855), Isaac Newton's law of viscous stress, Joseph Fourier's law of heat conduction (1822) and Georg Ohm's law (1827). For liquid water at 25 °C the measured values are $D = 2.30\times10^{-9}$ m²/s for self-diffusion, $\eta = 0.89$ mPa s, $\kappa = 0.61$ W m⁻¹ K⁻¹, and, for a 0.1 M NaCl solution, an electrical conductivity of about 1.07 S/m. These are the numbers a force field is tested against, and they span very different microscopic mechanisms: the wandering of one molecule, the relaxation of stress carried by the whole hydrogen-bond network, the transfer of vibrational energy, and the drift of ions through a solvent that drags on them.

{{< fig src="fluxes.svg" alt="Four panels: a concentration gradient with a particle flux, a shear flow profile, a hot-to-cold temperature gradient with a heat flux, and cations and anions drifting between two electrodes; below each, the microscopic flux used in the Green–Kubo formula" caption="Each transport law links a gradient to a flux. In equilibrium the same coefficient is the time integral of the autocorrelation of the microscopic flux named underneath: the particle velocity, an off-diagonal stress, the heat current or the charge current." >}}

### Why equilibrium knows about transport

The link between fluctuations and transport rests on Lars Onsager's **regression hypothesis** (1931): a spontaneous fluctuation in an equilibrium system decays, on average, in the same way as a macroscopic perturbation of the same shape decays under the linear transport laws. A momentary excess of molecules in one corner of the box spreads out by diffusion with the same $D$ that governs a drop of ink, and a momentary shear stress relaxes with the same viscous dynamics as a stirred cup of tea. The equilibrium simulation therefore contains a continuous supply of small, random "experiments", and the transport coefficient can be read from how they relax. The price is statistical: the fluctuations are small, of order $1/\sqrt N$, so the signal must be averaged over long times. The practical question in every section below is how long.

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

{{< note type="practice" title="Back of the envelope" >}}
How far do things move in a simulation? A water molecule with $D = 2.3\times10^{-9}$ m²/s travels a root-mean-square distance $\sqrt{6Dt} = 3.7$ nm in 1 ns, so in a 100 ns run every molecule samples the whole of a 5 nm box many times. A lipid in a fluid bilayer diffuses laterally about 200 times more slowly, with $D \approx 10^{-11}$ m²/s; in 100 ns it moves $\sqrt{4Dt} = 2$ nm in the plane, two or three neighbour spacings. Lateral diffusion coefficients of lipids therefore need microsecond runs, and the drift of each leaflet's centre of mass must be removed before the MSD is computed. A globular protein of hydrodynamic radius 2 nm has, from the Stokes–Einstein relation $D = k_BT/6\pi\eta a$, $D = 1.2\times10^{-10}$ m²/s; crossing a 10 µm cell takes it $L^2/6D \approx 0.14$ s, far beyond any atomistic simulation.
{{< /note >}}

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

### From Einstein to Green–Kubo in three lines

The equivalence of the two formulas is short enough to write out, and it explains a detail that matters when fitting. In one dimension the displacement is $x(t) = \int_0^t v(t')\,\mathrm dt'$, so

$$
\big\langle x(t)^2\big\rangle = \int_0^t\!\!\int_0^t \big\langle v(t')\,v(t'')\big\rangle\,\mathrm dt'\,\mathrm dt'' = 2\int_0^t (t - s)\,C(s)\,\mathrm ds ,
$$

using stationarity, $\langle v(t')v(t'')\rangle = C(|t' - t''|)$. Differentiating once gives $\mathrm d\langle x^2\rangle/\mathrm dt = 2\int_0^t C(s)\,\mathrm ds$, which tends to $2D$ once $C$ has decayed: the Green–Kubo formula. Differentiating twice gives $\mathrm d^2\langle x^2\rangle/\mathrm dt^2 = 2C(t)$. Splitting the integral also shows what happens at long times:

$$
\big\langle x(t)^2\big\rangle \;\to\; 2Dt \;-\; 2\int_0^\infty s\,C(s)\,\mathrm ds .
$$

The asymptote is a straight line with slope $2D$ but a non-zero intercept, positive or negative depending on the shape of the VACF.

{{< note type="warn" title="Myth" >}}
**Myth:** the MSD must pass through the origin, so the fit should be forced through zero. **Reality:** the long-time line has an intercept set by the first moment of the VACF, plus any static offset from the ballistic and caged regimes. Forcing the fit through the origin biases the slope, and the bias is worst for short trajectories in which the fitted window starts close to the caging time. Fit slope and intercept together, over the window in which the local log–log slope is 1 within noise.
{{< /note >}}

The figure runs a two-dimensional Lennard-Jones fluid and computes both estimates of the diffusion coefficient from the same trajectory, averaging over particles and over many time origins.

{{< widget name="transport" title="Diffusion two ways" caption="Left: the mean-squared displacement with a straight-line fit to its long-time part (slope 4D in two dimensions). Right: the normalised velocity autocorrelation function (orange) and its running integral (teal, scaled). The readouts compare D from the Einstein relation and from the Green–Kubo integral. Raise the density to see the cage effect." >}}

At low density the VACF decays smoothly and monotonically: a particle keeps moving in roughly the same direction until a collision randomises it. At high liquid densities it develops a negative dip: a particle moving into its cage of neighbours rebounds, so its velocity a short time later is anticorrelated with its initial velocity. This **cage effect** reduces the diffusion coefficient, because the negative part of the VACF subtracts from its integral. The two estimates agree within statistical error, as they must, but they converge differently: the Einstein estimate needs the MSD to be clearly linear, and the Green–Kubo integral needs the VACF to have decayed to zero, with noise in its tail accumulating in the integral.

{{< note type="story" >}}
The negative dip was first seen in a computer. In 1964 Aneesur Rahman, at Argonne National Laboratory, integrated Newton's equations for 864 argon atoms interacting through a Lennard-Jones potential ($\sigma$ = 0.34 nm, $\varepsilon/k_B$ = 120 K) at 94.4 K and 1.374 g/cm³, a state close to the triple point. He computed the pair distribution function, the mean-squared displacement and the velocity autocorrelation function, and found that the VACF becomes negative after a fraction of a picosecond: the cage effect, observed before any theory predicted its shape. That paper is usually counted as the beginning of molecular dynamics of realistic liquids.
{{< /note >}}

The same calculation in three dimensions takes about twenty seconds in NumPy today. The figure below uses Rahman's state point and potential, with 256 atoms instead of 864, a time step of 10.8 fs, 32 ps of equilibration and 129 ps of production in the microcanonical ensemble.

{{< fig src="regimes.svg" alt="Left: the normalised velocity autocorrelation of liquid argon falling from 1 to a negative minimum near 0.4 ps and then decaying to zero. Right: the mean-squared displacement on log–log axes, rising with slope 2 at short times, bending through a caged region, then rising with slope 1" caption="Liquid argon at 94 K from a 256-atom simulation. The VACF turns negative at 0.32 ps and reaches −0.09 of its initial value at 0.43 ps as atoms rebound from their cages. The MSD changes from ballistic ($\propto t^2$) to diffusive ($\propto t$) over about a picosecond; the dashed guides have slopes 2 and 1." >}}

The two estimates from this run are $D = 2.26\times10^{-9}$ m²/s from a linear fit to the MSD between 4 and 32 ps, and $D = 2.29\times10^{-9}$ m²/s from the Green–Kubo integral to 4.3 ps, an agreement of about 1.5 %, well inside the statistical uncertainty of a run this short. The fitted line has a small positive intercept, 0.003 nm², as the derivation above allows.

{{< note type="try" title="Pause and predict" >}}
Suppose you stop the Green–Kubo integral at the first zero of the VACF, where it is easy to argue the "correlation has gone". Is the resulting $D$ too high or too low, and by how much? Think about which part of the curve you have dropped before reading on.

The negative lobe is dropped, and it subtracts from the integral, so the estimate is too high. For the argon run it gives $3.1\times10^{-9}$ m²/s, 36 % above the full integral. The rule is to integrate until the VACF has decayed to zero within noise, and in dense liquids that is several times the first zero crossing.
{{< /note >}}

### Viscosity and other collective coefficients

Self-diffusion is the easiest coefficient to compute because every particle provides its own velocity time series: a box of 1,000 water molecules gives 3,000 velocity components at every time origin. Shear viscosity uses a single flux for the whole box, the off-diagonal pressure tensor component $P_{xy}$, so the same simulation yields three off-diagonal components, or five independent components if the two traceless normal-stress differences such as $(P_{xx} - P_{yy})/2$ are added, as is allowed in an isotropic fluid. The statistics are therefore poorer by a factor of order $N$, and runs of tens of nanoseconds, repeated several times, are routine for the viscosity of a molecular liquid.

The difficulty shows up in the running integral. Its mean rises to a plateau within a few correlation times, but each run's integral then keeps wandering, because the integral of the noise in the tail of the correlation function grows like a random walk.

{{< fig src="gk-noise.svg" alt="Ten thin blue curves of running Green–Kubo integrals rising from zero to about 1 within five correlation times, then spreading apart; a thick curve shows their mean close to the exact value of 1" caption="Running Green–Kubo integrals from ten independent runs of a flux with exponential memory, each 2,000 correlation times long. At $t$ = 5 correlation times the runs scatter by 11 %; by $t$ = 25 the scatter has grown to 26 % with no gain in accuracy. Choosing the upper limit is part of the measurement." >}}

Three remedies are standard. The **Einstein–Helfand** form, introduced by Eugene Helfand in 1960, replaces the integral of a correlation function by the slope of a mean-squared integrated flux, $\eta = \lim_{t\to\infty}\frac{V}{2k_BT}\frac{\mathrm d}{\mathrm dt}\big\langle\big(\int_0^t P_{xy}\,\mathrm dt'\big)^2\big\rangle$, the analogue of the MSD for diffusion. The **time-decomposition method** of Yong Zhang, Akihito Otani and Edward Maginn (2015) runs many short independent trajectories, averages their running integrals, fits a double exponential, and truncates where the spread between runs becomes large relative to the mean. And **non-equilibrium** methods impose a shear rate and measure the stress directly; for viscous liquids such as ionic liquids or glycerol, whose stress correlations decay over nanoseconds, they are often the only affordable option, provided the shear rate is low enough to stay in the linear (Newtonian) regime.

### Charge transport and the Nernst–Einstein estimate

The electrical conductivity follows from the autocorrelation of the total charge current $\mathbf J_e = \sum_i q_i\mathbf v_i$, $\sigma = \frac{1}{3Vk_BT}\int_0^\infty\langle\mathbf J_e(0)\cdot\mathbf J_e(t)\rangle\,\mathrm dt$. Expanding the product splits it into self terms, one per ion, and cross terms between different ions. Dropping the cross terms gives the **Nernst–Einstein** estimate from self-diffusion coefficients alone,

$$
\sigma_{\text{NE}} = \frac{e^2}{V k_BT}\sum_i z_i^2 D_i ,
$$

which is much easier to converge because it inherits the good statistics of self-diffusion. For 0.1 M NaCl with the infinite-dilution coefficients $D_{\text{Na}^+} = 1.33\times10^{-9}$ and $D_{\text{Cl}^-} = 2.03\times10^{-9}$ m²/s it gives 1.26 S/m; the measured conductivity is about 1.07 S/m, roughly 15 % lower, because at finite concentration each ion is slowed by its oppositely charged atmosphere.

{{< py title="Nernst–Einstein conductivity of 0.1 M NaCl" >}}
import numpy as np
e, kB, NA, T = 1.602177e-19, 1.380649e-23, 6.022141e23, 298.15
c = 0.1 * 1000 * NA                 # ions of each kind per m^3 at 0.1 mol/L
D = {"Na+": 1.334e-9, "Cl-": 2.032e-9}  # m^2/s, infinite dilution, 25 C
sigma = e**2 / (kB * T) * c * sum(D.values())
print(f"Nernst-Einstein estimate: {sigma:.2f} S/m")
print(f"molar conductivity: {sigma / 100 * 1e4:.1f} S cm^2/mol")
{{< /py >}}

The cell prints 1.26 S/m and a molar conductivity of 126 S cm²/mol, the textbook limiting value for NaCl. In concentrated electrolytes the cross terms matter much more. In battery electrolytes and ionic liquids, cations and anions often move together as pairs or clusters that carry no net charge, so the true conductivity is well below the Nernst–Einstein value; the ratio $\sigma/\sigma_{\text{NE}}$, often between 0.5 and 0.8 in ionic liquids, is a direct measure of ion correlation. Reporting only $\sigma_{\text{NE}}$ for such systems overstates the conductivity, and computing the full collective $\sigma$ requires the long runs described for viscosity.

### Heat transport in solids

For thermal conductivity the flux is the heat current, $\mathbf J_q = \sum_i e_i\mathbf v_i + \tfrac12\sum_{i\ne j}(\mathbf F_{ij}\cdot\mathbf v_i)\,\mathbf r_{ij}$ for pair potentials, with $e_i$ the energy of atom $i$. For many-body potentials, for machine-learned potentials and for density-functional calculations the per-atom energy is not uniquely defined, and the correct heat current took decades to settle; Aris Marcolongo, Paolo Umari and Stefano Baroni showed in 2016 that the conductivity is independent of this choice and made Green–Kubo calculations from first principles possible. Two limitations are specific to solids. Phonon mean free paths in crystals such as silicon ($\kappa \approx 150$ W m⁻¹ K⁻¹ at room temperature) reach hundreds of nanometres, so both equilibrium boxes and the slab geometry of non-equilibrium methods, such as Florian Müller-Plathe's reverse scheme of 1997, must be checked for size convergence. And classical MD populates every vibrational mode with $k_BT$ of energy, which is wrong below the Debye temperature, where high-frequency modes are frozen out; classical conductivities of crystals at low temperature need quantum corrections or a lattice-dynamics treatment instead.

## Long-time tails and finite-size effects

In 1967–1970 Berni Alder and Thomas Wainwright, simulating hard spheres, discovered that the VACF does not decay exponentially at long times, as kinetic theory had assumed, but as a power law, $t^{-d/2}$. A moving particle sets up a vortex flow in the surrounding fluid that pushes it from behind, a hydrodynamic memory effect. This **long-time tail** was one of the first major discoveries made by computer simulation. In two dimensions the $t^{-1}$ tail makes the Green–Kubo integral diverge logarithmically, so a strictly defined diffusion coefficient does not exist in two-dimensional fluids, which is worth remembering when interpreting the figure; in three dimensions the $t^{-3/2}$ tail is integrable.

The same hydrodynamic interactions cause a systematic **finite-size effect** in periodic simulations: a particle interacts with the flows set up by its own periodic images, which lowers its diffusion coefficient. In three dimensions the correction derived by In-Chul Yeh and Gerhard Hummer (2004) is $D_\infty = D_{\text{PBC}} + \frac{\xi\,k_BT}{6\pi\eta L}$, with $\xi \approx 2.837$ for a cubic box of side $L$ and $\eta$ the shear viscosity. For water in a box of a few nanometres the correction is about 10–20 %, comparable to many of the differences between force fields that simulations try to resolve, so it should always be applied or checked by varying the box size.

{{< fig src="finite-size.svg" alt="Five points of the self-diffusion coefficient of water against inverse box length, falling on a straight line that extrapolates to 2.30 times ten to the minus nine square metres per second at infinite box size" caption="The Yeh–Hummer correction for water at 298 K ($\eta$ = 0.89 mPa s). A 2 nm box underestimates $D$ by 15 %, a 3 nm box by 10 %. Simulations at several box sizes fall on a line in $1/L$, whose intercept is $D_\infty$ and whose slope contains the viscosity." >}}

The correction is easiest to trust when it is tested rather than assumed. Simulating three or four box sizes and extrapolating linearly in $1/L$ gives $D_\infty$ without needing $\eta$, and the slope gives an independent estimate of the viscosity as a by-product. The shear viscosity itself shows no comparable $1/L$ dependence in Yeh and Hummer's simulations, so the correction applies to diffusion, not to $\eta$. For non-cubic boxes, such as the elongated slabs used for membranes and interfaces, $\xi$ is different and the correction becomes anisotropic.

## Practical transport calculations

Several practical points determine whether a transport calculation is reliable. Use thermostats that do not disturb the dynamics, or measure in NVE after equilibration, as [the chapter on thermostats](../thermostats-and-barostats/) explains; strong Langevin friction lowers diffusion coefficients directly. Unwrap trajectories and remove any drift of the centre of mass. Average over many time origins, but remember that overlapping windows are correlated, so estimate errors by splitting the trajectory into independent blocks or running independent replicas. For collective properties such as viscosity and conductivity, which involve a single flux for the whole system rather than one per particle, statistics are much poorer than for self-diffusion, and long runs, several independent simulations or the Einstein–Helfand (integrated) forms of the Green–Kubo relations are needed. Non-equilibrium methods, such as imposing shear flow (Lees–Edwards boundaries, or the reverse non-equilibrium method of Florian Müller-Plathe, 1999), are often more efficient for viscosity and thermal conductivity.

{{< note type="practice" title="From the lab" >}}
Lithium diffusion in solid electrolytes is a common target of ab initio MD. A typical workflow runs 50 to 200 ps of density-functional MD at four or five temperatures between 600 and 1200 K, computes the lithium MSD at each, fits $\ln D$ against $1/T$, and extrapolates the Arrhenius line to room temperature. Two numbers decide whether the result means anything. The first is the number of hops: in a crystal the MSD is flat apart from discrete jumps between sites, and the relative error of $D$ scales roughly as $1/\sqrt{n_{\text{hops}}}$, so a run with 20 hops carries an error of order 20 %. The second is the extrapolation: with an activation energy of 0.25 eV, $D$ falls by a factor of $\exp[(0.25\text{ eV}/k_B)(1/300 - 1/1000)\text{ K}^{-1}] \approx 870$ between 1000 and 300 K, so an error of 0.03 eV in the fitted slope changes the room-temperature value by a factor of about two. A phase change or a change of mechanism between the simulated and the extrapolated temperatures invalidates the line altogether.
{{< /note >}}

{{< note type="key" >}}
- Einstein: $\text{MSD}(t) \to 2dDt$ at long times (unwrapped positions, averaged over particles and time origins); ballistic at short times, caged in dense liquids.
- Green–Kubo: $D = \frac1d\int_0^\infty\langle\mathbf v(0)\cdot\mathbf v(t)\rangle\mathrm dt$; every transport coefficient is the time integral of a flux autocorrelation (viscosity from $P_{xy}$, conductivities from heat and charge currents).
- The cage effect makes the VACF negative at short times in dense liquids; hydrodynamic long-time tails decay as $t^{-d/2}$.
- Periodic boxes lower $D$ by $\xi k_BT/6\pi\eta L$ (Yeh–Hummer); use dynamics-preserving thermostats and honest error estimates.
- The long-time MSD has a non-zero intercept; fit slope and intercept together, and never stop the Green–Kubo integral at the first zero of the VACF.
- Collective coefficients (viscosity, conductivity) converge far more slowly than self-diffusion; use replicas, Einstein–Helfand forms or non-equilibrium methods, and remember that Nernst–Einstein ignores ion correlations.
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
- q: "In a dense liquid you stop the Green–Kubo integral for D at the first zero crossing of the VACF. The estimate is…"
  options: ["Too low", "Too high, because the negative lobe that follows is left out", "Unaffected"]
  answer: 1
  why: "The negative region subtracts from the integral. In the argon example, stopping at the first zero gives a value 36 % too high."
- q: "For a concentrated ionic liquid the Nernst–Einstein conductivity from ion self-diffusion is 2 S/m. The full collective calculation will most likely give…"
  options: ["About 2 S/m exactly", "Less than 2 S/m, because correlated cation–anion motion carries no net charge", "More than 2 S/m, because ions push each other"]
  answer: 1
  why: "Nernst–Einstein drops the cross-correlations between ions. In ionic liquids these are mostly from ions moving together, which lowers the true conductivity."
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
10. A. Rahman, "Correlations in the motion of atoms in liquid argon", *Physical Review* **136**, A405–A411 (1964).
11. Y. Zhang, A. Otani and E. J. Maginn, "Reliable viscosity calculation from equilibrium molecular dynamics simulations: a time decomposition method", *Journal of Chemical Theory and Computation* **11**, 3537–3546 (2015).

</div>
