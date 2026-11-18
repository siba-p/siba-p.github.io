---
title: "Energy landscapes and transition states"
description: "The geometry of rare events: the timescale gap between molecular vibrations and the processes we care about, basins and stationary points of the potential energy surface, transition states as first-order saddles, minimum energy paths and the intrinsic reaction coordinate, double-ended methods (elastic band, NEB, climbing-image NEB, string method) and single-ended methods (eigenvector following, dimer, activation–relaxation), with an ASE example, and the step from energy to free-energy landscapes."
hook: "Molecular dynamics advances a femtosecond at a time, yet a protein may take a second to fold: fifteen orders of magnitude apart. This chapter maps the mountain passes that make such events rare, and finds them without waiting."
objectives:
  - "Estimate how strongly a barrier suppresses crossings from its height and the thermal energy"
  - "Classify stationary points as minima or transition states from their Hessian eigenvalues"
  - "Explain how NEB, climbing-image NEB and the string method converge onto the minimum energy path"
  - "Run a climbing-image NEB calculation in ASE for a vacancy hop in copper"
  - "Choose a single-ended saddle search, such as the dimer method, when the final state is unknown"
cover: "cover.svg"
milestones:
  - year: 1970
    text: "Kenichi Fukui defines the intrinsic reaction coordinate"
  - year: 1999
    text: "Graeme Henkelman and Hannes Jónsson introduce the dimer method for saddle searches"
  - year: 2000
    text: "Henkelman, Uberuaga and Jónsson add the climbing image to the nudged elastic band"
  - year: 2002
    text: "Weinan E, Weiqing Ren and Eric Vanden-Eijnden introduce the string method"
track: rl-land
weight: 1
level: Core
prereqs: ["gradients", "potential-energy-surfaces"]
lab: "Relax elastic bands, NEB, climbing-image NEB and string paths on the Müller–Brown surface"
---

## The timescale gap

A molecular dynamics simulation advances in steps of about one femtosecond, $10^{-15}$ s, because it must resolve the fastest motions of atoms, bond vibrations with periods of 10 to 100 fs. With a good GPU code and a few hundred thousand atoms, a day of computing yields perhaps a few hundred nanoseconds. Many of the processes that matter in chemistry and materials science are vastly slower. A vacancy in a metal at room temperature hops roughly once every millisecond to every few seconds; a small protein folds in microseconds to seconds; a crystal nucleates from a supercooled liquid after seconds to years; a catalytic turnover takes milliseconds; ions in a battery cathode move between sites on timescales from nanoseconds to hours. Between the femtosecond time step and these events lie nine to fifteen orders of magnitude.

The reason is not that these processes are intrinsically complicated. It is that they are **rare**. The system spends almost all its time vibrating inside a basin of the energy landscape, a stable or metastable state, and only very occasionally gathers enough energy in the right coordinates to cross the barrier into another basin. The crossing itself is fast, typically picoseconds; the waiting time before it is long, because the probability of reaching the top of a barrier of height $\Delta E$ is proportional to $e^{-\Delta E/k_BT}$. At room temperature, $k_BT \approx 0.026$ eV, so a barrier of 0.5 eV suppresses the crossing probability by a factor of about $10^{-8}$, and 1 eV by about $10^{-17}$. A brute-force simulation spends nearly all its effort re-sampling the same basin and almost never sees the event of interest.

{{< note type="practice" title="Back of the envelope" >}}
Write the mean waiting time as $\tau \approx \nu^{-1} e^{\Delta E/k_BT}$, with an attempt frequency $\nu \approx 10^{13}$ s⁻¹, roughly one vibration. At 300 K, $k_BT \ln 10 = 0.060$ eV, so every additional 0.06 eV of barrier makes the wait ten times longer. A 1 μs trajectory covers $10^7$ vibrational periods, which buys $\ln(10^7)\,k_BT = 16\,k_BT \approx 0.42$ eV. Barriers below about 0.4 eV can be watched directly at room temperature; barriers above it need the methods of this subject.
{{< /note >}}

{{< fig src="waiting.svg" alt="Log of the mean waiting time against barrier height from 0 to 1.3 eV, as straight lines for 300 K and 600 K, with horizontal reference lines at one femtosecond, one microsecond, one second, one day and one year" caption="Each 0.06 eV of barrier costs a factor of ten in waiting time at 300 K. A 0.5 eV hop takes about 25 μs and a 1 eV hop about 1.7 hours; at 600 K the 1 eV hop takes 25 μs, the same as the 0.5 eV hop at 300 K." >}}

{{< note type="try" title="Pause and predict" >}}
A process with a 1 eV barrier waits about 1.7 hours per crossing at 300 K. Before reading on, guess the wait at 600 K: one hour, one minute, or something else. The answer is about 25 μs, a factor of $e^{19.3} \approx 2.5 \times 10^8$ shorter, because doubling $T$ halves the exponent. This is why accelerated-dynamics methods such as Arthur Voter's temperature-accelerated dynamics run at high temperature and extrapolate back.
{{< /note >}}

This subject is about the methods that overcome this problem. Some locate barriers and paths on the energy surface directly, without dynamics; some compute rates from the properties of the barrier; some compute free energies by sampling cleverly; some bias the dynamics so that barriers are crossed often, and then remove the effect of the bias; and some, more recently, use machine learning to find the right coordinates or to generate samples directly. All of them start from the geometry of the energy landscape, which is the subject of this topic.

## Basins and stationary points

The potential energy surface $U(\mathbf r_1, \dots, \mathbf r_N)$, introduced in [the chapter on potential energy surfaces](../potential-energy-surfaces/), is a function on a $3N$-dimensional configuration space. Its **minima** are the stable and metastable structures: a crystal, a vacancy at a particular site, a conformer of a molecule, a reactant or a product. Around each minimum lies its **basin of attraction**, the set of configurations from which steepest descent leads to that minimum. A dynamical trajectory at low temperature spends long periods inside one basin, rattling near its minimum, and occasionally passes into a neighbouring basin.

As [the chapter on gradients](../gradients/) showed, stationary points, where the gradient vanishes, are classified by the eigenvalues of the **Hessian** matrix of second derivatives $H_{ij} = \partial^2 U / \partial x_i \partial x_j$. At a minimum, all eigenvalues are positive (apart from zero eigenvalues associated with overall translation and rotation). At a **first-order saddle point**, exactly one eigenvalue is negative: the point is a maximum along one direction and a minimum along all others. Saddles of higher order, with several negative eigenvalues, are maxima in several directions and are not important for transitions, because there is always a lower route around them.

{{< eq title="A transition state" say="The highest point on the lowest pass between two valleys: zero slope, and curved downwards in exactly one direction." >}}
$$ \nabla U(\mathbf x^\ddagger) = \mathbf 0, \qquad \mathbf H(\mathbf x^\ddagger)\,\mathbf v_1 = \lambda_1 \mathbf v_1 \;\text{ with }\; \lambda_1 < 0 < \lambda_2 \le \lambda_3 \le \cdots $$
- $\mathbf x^\ddagger$: the transition state, a first-order saddle point connecting two minima
- $\mathbf v_1$: the unstable direction, along which the system falls towards one minimum or the other
- the energy barrier is $\Delta E^\ddagger = U(\mathbf x^\ddagger) - U(\mathbf x_{\text{min}})$
{{< /eq >}}

The first-order saddle connecting two basins is the **transition state** of the transition between them, the mountain pass in the hiking-map picture. Its energy above the starting minimum is the **activation energy** that enters the rate, and its vibrational frequencies (the positive Hessian eigenvalues) enter the prefactor, as [the chapter on reaction rates](../es-rates/) explains. Locating transition states is therefore the first quantitative task in studying a rare event.

{{< fig src="stationary.svg" alt="Contour map of the Müller–Brown surface with three minima marked as teal dots and two saddles as gold diamonds, each saddle carrying pink arrows along its unstable direction and blue arrows along its stable direction; a second panel shows energy cuts through the upper saddle along both eigenvectors" caption="The five stationary points of the Müller–Brown surface, labelled by energy and by the signs of the two Hessian eigenvalues. Through the saddle at −40.7 the energy is a maximum along the unstable eigenvector $\mathbf v_1$ ($\lambda_1 = -751$) and a minimum along $\mathbf v_2$ ($\lambda_2 = +490$)." >}}

### Reading the Hessian in practice

For a real system the Hessian is a $3N \times 3N$ matrix. In mass-weighted coordinates its eigenvalues are the squared angular frequencies of the normal modes, $\omega_i^2 = \lambda_i$, so a negative eigenvalue appears in a frequency calculation as an **imaginary frequency**. A DFT vibrational analysis of a converged transition state should therefore report exactly one imaginary mode (VASP marks it `f/i=` in its output, Gaussian lists it as a negative frequency), and animating that mode should show the atoms moving along the reaction: the hopping atom moving between sites, or the bond forming and breaking. A second imaginary mode means the structure is a higher-order saddle, usually because a symmetry constraint has held the system on a ridge; displacing the atoms along the extra mode and re-optimising removes it. Six eigenvalues (five for a linear molecule) are zero for an isolated molecule because of overall translation and rotation, and three are zero for a periodic crystal; a small spurious imaginary frequency of a few tens of cm⁻¹ is often numerical noise from a loose convergence or a coarse integration grid rather than a real instability.

The number of stationary points grows quickly with system size. Frank Stillinger and Thomas Weber argued in 1982 that the number of distinct minima, which they called **inherent structures**, grows exponentially with the number of atoms, and Martin Goldstein had proposed in 1969 that the slow dynamics of supercooled liquids is hopping between such minima over barriers. For a cluster of a few dozen atoms the minima already number in the thousands, and the number of saddles exceeds the number of minima. Exhaustive enumeration is out of the question for condensed matter; the methods below find the few saddles that matter for a given transition.

## Minimum energy paths

Between two minima connected by a transition state runs a **minimum energy path** (MEP): the path that, at every point, is a minimum of the energy in all directions perpendicular to it. Equivalently, the force on the path, $-\nabla U$, has no component perpendicular to the path:

{{< eq title="The minimum energy path" say="Along the minimum energy path the force points only along the path itself, never off it." >}}
$$ \nabla U(\boldsymbol\phi) - \big(\nabla U(\boldsymbol\phi)\cdot\hat{\boldsymbol\tau}\big)\,\hat{\boldsymbol\tau} = \mathbf 0 \quad\text{at every point } \boldsymbol\phi \text{ of the path} $$
- $\hat{\boldsymbol\tau}$: the unit tangent to the path
- the MEP passes through every saddle point on it; its maximum is the transition state
{{< /eq >}}

In mass-weighted coordinates, the steepest-descent path from the transition state down to the two minima is called the **intrinsic reaction coordinate** (IRC), a concept introduced by Kenichi Fukui in 1970 and central to computational chemistry. The MEP is the natural one-dimensional description of a transition at low temperature: the energy profile along it shows the barrier, any intermediate minima, and the shape of the reaction.

The Müller–Brown surface, a two-dimensional function introduced by Klaus Müller and Leo Brown in 1979 as a test case for path methods, makes these ideas concrete. It has three minima: a deep one at upper left (energy −146.7), a second at lower right (−108.2), and a shallow intermediate in between (−80.8), connected by two saddle points at −40.7 and −72.2. The MEP from the deepest minimum to the lower-right one is curved and passes through the intermediate; a straight line between the endpoints would climb high over a ridge.

The mass weighting in the IRC is not a detail. Steepest descent depends on the metric of the coordinate system: in Cartesian coordinates a hydrogen atom and a heavy atom are treated alike, whereas in mass-weighted coordinates $q_i = \sqrt{m_i}\,x_i$ the light atom moves further for the same force, as it does in the real dynamics. Paths computed in different coordinates pass through the same minima and saddles, but they differ in between. For solids with a single hopping species the distinction is usually ignored; for reactions that transfer hydrogen it changes the shape of the path noticeably.

{{< note type="warn" title="Myth" >}}
**Myth:** the atoms follow the minimum energy path during a reaction. **Reality:** the MEP is a zero-temperature construction. At finite temperature the system carries kinetic energy, overshoots the valley floor and crosses the dividing surface at points spread around the saddle, sometimes far from it when the pass is broad or the reaction is fast compared with vibrational relaxation. The MEP identifies the saddle and its energy; the ensemble of real transition paths is the subject of [transition path sampling](../es-path-sampling/).
{{< /note >}}

## Finding the path: elastic bands and strings

**Double-ended** methods find the MEP between two known minima by optimising a discretised path, a chain of $N$ configurations called **images**. The simplest idea, the elastic band of Ron Elber and Martin Karplus (1987), minimises the sum of the image energies plus springs between neighbouring images. It fails in an instructive way: the spring forces have components perpendicular to the path that pull it off the MEP and make it cut corners, and the true forces have components along the path that drag images down into the minima, leaving the barrier region poorly resolved.

The **nudged elastic band** (NEB) method of Hannes Jónsson, Greg Mills and Karsten Jacobsen (1998) fixes both problems by projection. Each image feels only the perpendicular component of the true force, which moves it towards the MEP, and only the parallel component of the spring force, which keeps the images evenly spaced:

{{< eq title="Forces in the nudged elastic band" say="Let the potential pull images sideways onto the path, and let the springs only space them out along it." >}}
$$ \mathbf F_i^{\text{NEB}} = \underbrace{-\nabla U(\mathbf R_i) + \big(\nabla U(\mathbf R_i)\cdot\hat{\boldsymbol\tau}_i\big)\hat{\boldsymbol\tau}_i}_{\text{true force, perpendicular part}} + \underbrace{k\big(|\mathbf R_{i+1} - \mathbf R_i| - |\mathbf R_i - \mathbf R_{i-1}|\big)\hat{\boldsymbol\tau}_i}_{\text{spring force, parallel part}} $$
- $\mathbf R_i$: image $i$; $\hat{\boldsymbol\tau}_i$: its tangent, estimated from the neighbouring image of higher energy (Henkelman and Jónsson's improved tangent, 2000)
- **climbing image**: the highest image instead feels $-\nabla U + 2(\nabla U\cdot\hat{\boldsymbol\tau})\hat{\boldsymbol\tau}$, so it climbs uphill along the path and converges exactly onto the saddle
{{< /eq >}}

The **climbing-image NEB** of Graeme Henkelman, Blas Uberuaga and Hannes Jónsson (2000) adds one modification: the highest image is freed from the springs and has the parallel component of its force inverted, so that it moves uphill along the path and downhill in all other directions. It converges to the saddle point itself, giving the barrier exactly rather than interpolated between images.

{{< fig src="nebforces.svg" alt="Two zoomed views of an unrelaxed band of images on a curved valley. In the plain elastic band, one image carries a full true-force arrow and a full spring-force arrow. In the nudged elastic band, the same image carries only the perpendicular part of the true force and the parallel part of the spring force, with the discarded parts drawn dotted" caption="Force projection, computed for one image of a band lying off a curved valley. The perpendicular part of $-\nabla U$ moves the band onto the valley floor; the parallel part of the spring force keeps the images evenly spaced. Each force does one job, so neither can spoil the other." >}}

The **string method** of Weinan E, Weiqing Ren and Eric Vanden-Eijnden (2002) reaches the same goal differently. The images evolve by the perpendicular component of the force alone, with no springs, and after every step they are redistributed at equal arc length along the curve through them. The string is a curve in configuration space parametrised by arc length, and the reparametrisation keeps the images evenly spaced; its finite-temperature version extends the idea to free-energy landscapes.

{{< widget name="neb" title="Relaxing a path on the Müller–Brown surface" caption="The path starts as a straight line between the deepest minimum A and minimum B (teal dots; gold diamonds mark the saddles). Press Relax and compare the methods: the plain elastic band cuts the corner, NEB follows the valley floor, climbing-image NEB places its highest image (rose) exactly on the saddle, and the string method keeps its images evenly spaced without springs. The right panel shows the energy of every image along the path." >}}

Try the plain elastic band with a stiff spring: the path is pulled straight across the ridge and the predicted barrier is far too high. With a weak spring, images slide down into the minima. NEB, with the same number of images, settles onto the curved valley floor through the intermediate minimum. Climbing-image NEB then lifts its highest image onto the first saddle, reproducing the exact barrier of $−40.67 − (−146.70) = 106.0$ energy units.

In practice NEB calculations are run with codes such as ASE, VASP (with the VTST tools of the Henkelman group) or LAMMPS. The following ASE script computes the barrier for a vacancy hop in copper with the EMT potential, with five intermediate images and a climbing image:

```python
import numpy as np
from ase.build import bulk
from ase.calculators.emt import EMT
from ase.optimize import BFGS, FIRE
from ase.mep import NEB

base = bulk("Cu", "fcc", a=3.6, cubic=True).repeat((3, 3, 3))      # 108 atoms
d = base.get_distances(0, range(len(base)), mic=True)
j = int(np.argsort(d)[1])                     # a nearest neighbour of site 0
initial = base.copy(); del initial[0]         # vacancy at site 0
final = base.copy(); final.positions[j] = base.positions[0]; del final[0]   # neighbour has hopped in
for a in (initial, final):
    a.calc = EMT(); BFGS(a, logfile=None).run(fmax=0.01)

images = [initial] + [initial.copy() for _ in range(5)] + [final]
for im in images[1:-1]:
    im.calc = EMT()
neb = NEB(images, climb=True)
neb.interpolate(mic=True)                     # straight-line initial path
FIRE(neb, logfile=None).run(fmax=0.02)
E = [im.get_potential_energy() for im in images]
print(f"barrier: {max(E) - E[0]:.3f} eV")      # 0.776 eV with EMT
```

The result, 0.78 eV, is close to the measured migration energy of vacancies in copper, about 0.7 eV, although agreement at this level from a simple potential is partly fortunate. With DFT or an MLIP, the same script gives the corresponding barrier for that model; only the calculator changes.

### Making an NEB calculation work

Most failed NEB calculations fail for mundane reasons, and the same checks catch them.

- **Endpoints first.** Relax the initial and final states to tighter forces than the band (0.01 eV/Å against 0.03 to 0.05 eV/Å for the band in a typical DFT study). An unrelaxed endpoint adds its residual energy to the barrier.
- **Atom ordering.** Image $i$ is built by interpolating atom $k$ of the initial state to atom $k$ of the final state. If the final structure was built separately and its atoms are listed in a different order, the interpolation swaps atoms through each other and the "barrier" is meaningless. Periodic images cause the same problem when an atom is wrapped across the cell boundary; interpolating with the minimum-image convention (`mic=True` in ASE) avoids it.
- **A sensible starting path.** Linear interpolation can push atoms unphysically close together. The image-dependent pair potential (IDPP) of Søren Smidstrup, Andreas Pedersen, Kurt Stokbro and Hannes Jónsson (2014) builds a starting path that preserves interatomic distances, and is available as `neb.interpolate("idpp")` in ASE.
- **Images and springs.** Five to eight intermediate images suffice for a single hop; a path with an intermediate minimum needs more, or should be split into two calculations. The spring constant matters little within a broad range because only its parallel component acts; the VTST tools default to 5 eV/Å².
- **Climb late.** Switch on the climbing image after the band has roughly converged, otherwise it may climb towards the wrong local maximum.
- **Confirm the saddle.** A frequency calculation at the climbing image should give exactly one imaginary mode, pointing along the path.

The computed barrier is only as good as the energy model. DFT barriers for the same hop often differ by 0.1 eV or more between exchange–correlation functionals, which by the rule of the first section is a factor of about 50 in rate at room temperature, so a careful study states the functional and checks the sensitivity of its conclusions.

{{< note type="practice" title="From the lab" >}}
NEB is the standard tool for ionic transport in battery materials. Calculations on olivine LiFePO₄ by Dane Morgan, Anton Van der Ven and Gerbrand Ceder (2004) and by Saiful Islam and colleagues (2005) showed that lithium moves along one-dimensional channels parallel to the $b$ axis, and Islam's calculations predicted that the path between neighbouring sites is curved rather than straight. In 2008 Shin-ichi Nishimura and colleagues reconstructed the lithium density from neutron diffraction and saw the same curved channels. The one-dimensional character has a practical consequence the calculations also explained: an antisite defect, an iron ion sitting in a lithium channel, blocks the whole channel, which is why small particles with few defects perform best.
{{< /note >}}

## Finding saddles from one end

When only the starting minimum is known, as in exploring which transitions are possible from a given defect configuration, **single-ended** methods search for saddles without a final state. **Eigenvector following** and its relatives, such as the partitioned rational-function optimisation of Jon Baker (1986), use the Hessian: they climb uphill along the eigenvector of the lowest eigenvalue while minimising along all others. Computing the full Hessian is expensive for large systems, so the **dimer method** of Graeme Henkelman and Hannes Jónsson (1999) estimates the lowest-curvature direction using only forces, from a pair of closely spaced images (the dimer) that is rotated to minimise its energy; the dimer then translates uphill along that direction. The **activation–relaxation technique** (ART), introduced by Gerard Barkema and Normand Mousseau in 1996 and refined as ART nouveau by Rachid Malek and Mousseau in 2000, follows a similar strategy.

The dimer method shows how far one can get with forces alone. Two images, $\mathbf R_1$ and $\mathbf R_2 = \mathbf R_1 - 2\Delta R\,\hat{\mathbf N}$, straddle a midpoint with a small separation; the curvature along the dimer axis is estimated by finite differences as $C = (\mathbf F_2 - \mathbf F_1)\cdot\hat{\mathbf N}/(2\Delta R)$. Rotating the dimer to minimise $C$ aligns $\hat{\mathbf N}$ with the lowest-curvature mode without ever forming the Hessian. The midpoint is then translated with the modified force $\mathbf F^\dagger = \mathbf F - 2(\mathbf F\cdot\hat{\mathbf N})\hat{\mathbf N}$, the same inversion as in the climbing image: uphill along the soft mode, downhill in every other direction. Each iteration costs a few force calls instead of the $6N$ needed for a finite-difference Hessian, which is what makes saddle searches feasible with DFT for systems of hundreds of atoms. The price is that a single-ended search finds *a* saddle near its starting direction, not necessarily the lowest one, so many searches from different random initial displacements are needed to be confident that the important low barriers have been found.

Single-ended searches launched in many random directions from a minimum map out the possible transitions and their barriers. This is the basis of **adaptive kinetic Monte Carlo** (Henkelman and Jónsson, 2001), which finds saddles on the fly, computes rates from them, and advances a simulation event by event over timescales of seconds or longer. Global methods such as **basin hopping** (David Wales and Jonathan Doye, 1997), which alternate random perturbations with local minimisation, explore landscapes to find the lowest minima, and Wales's discrete path sampling builds networks of minima and saddles from which kinetics can be computed.

## From energy to free energy

The landscapes and paths of this chapter are properties of the potential energy, and they describe transitions at low temperature well. At finite temperature, a system does not follow the MEP exactly; it fluctuates around it, and the relevant barrier is a **free-energy barrier**, which includes the entropy of all the motions transverse to the path. A narrow pass and a wide valley of the same height are crossed at different rates, because the wide valley offers more ways through. In liquids, biomolecules and soft matter, where many configurations of similar energy coexist, entropy often dominates, and the energy landscape alone can be misleading: there may be no single saddle point at all, but a broad region of configuration space through which transitions pass.

A two-dimensional example makes the entropic contribution quantitative. Let the energy along the valley floor be a double well with a 5 $k_BT$ barrier, and let the valley have a transverse stiffness $k_\perp$ that differs between the wells and the pass. Integrating out the transverse coordinate $y$ adds $\tfrac12 k_BT\ln k_\perp$ to the free energy, so

$$
\Delta F^\ddagger = \Delta E^\ddagger + \tfrac12 k_BT \ln\frac{k_\perp^{\ddagger}}{k_\perp^{\text{well}}}.
$$

A pass ten times stiffer than the wells raises the free-energy barrier by $1.15\,k_BT$; a pass ten times softer lowers it by the same amount. The two landscapes have identical saddle-point energies, yet their rates differ by a factor of $e^{2.3} = 10$. This is the same physics as the frequency ratio in Vineyard's harmonic prefactor, discussed in [the chapter on rates](../es-rates/): soft modes at the saddle mean more ways through.

{{< fig src="entropy.svg" alt="Two contour maps of double-well landscapes with the saddle at the same energy, one with a narrow pass and one with a wide pass, above a plot of the free-energy profiles along the reaction coordinate: the narrow pass gives a barrier of 6.15 kT, the wide pass 3.85 kT, and the energy along the valley floor is 5 kT for both" caption="Free energy counts the width of the pass as well as its height. Both landscapes have a 5 $k_BT$ saddle; integrating out the transverse coordinate gives barriers of 6.15 and 3.85 $k_BT$, a factor of ten in rate." >}}

In protein folding the same idea appears as the **folding funnel** of Joseph Bryngelson, José Onuchic, Nicholas Socci and Peter Wolynes (1995). Cyrus Levinthal had pointed out in 1969 that a protein cannot find its native state by random search, since even a few conformations per residue give more states than could be sampled in the age of the universe. The resolution is that the landscape is biased: energy falls on average as native contacts form, while the conformational entropy falls too, and the folding barrier is a free-energy barrier between the two effects, not a single saddle on the energy surface.

The free-energy landscape is defined along chosen **collective variables**, as [the chapter on ensembles](../ensembles-and-free-energy/) introduced: $F(\xi) = -k_BT\ln P(\xi)$. Choosing collective variables that capture the slow, rare motion is one of the central problems of this subject, discussed in [the chapter on collective variables](../es-collective-variables/); computing free energies along them is the subject of the free-energy and enhanced-sampling chapters that follow.

{{< note type="key" >}}
- Rare events are slow because barrier crossing has probability $\propto e^{-\Delta E/k_BT}$; the crossing itself is fast but the waiting time is long, creating a gap of many orders of magnitude between MD time steps and the processes of interest.
- Minima are stable states; first-order saddle points (one negative Hessian eigenvalue) are transition states; the minimum energy path has no perpendicular force and passes through them.
- NEB projects true forces perpendicular and spring forces parallel to the path; climbing-image NEB converges the top image onto the saddle; the string method reparametrises at equal arc length instead of using springs.
- Single-ended methods (eigenvector following, dimer, ART) find saddles from one minimum and drive adaptive kinetic Monte Carlo.
- At 300 K each 0.06 eV of barrier multiplies the waiting time by ten; direct MD reaches barriers of roughly 0.4 eV.
- At finite temperature, transitions are governed by free-energy barriers along collective variables, which include entropy.
{{< /note >}}

{{< quiz >}}
- q: "At a stationary point the Hessian has eigenvalues −3.2, 1.5, 4.0, 7.1. What is it?"
  options: ["A minimum", "A first-order saddle point: a transition state", "A maximum"]
  answer: 1
  why: "Exactly one negative eigenvalue: downhill in one direction, uphill in all others."
- q: "Why does a plain elastic band cut corners?"
  options: ["Its images are too few", "The perpendicular component of the spring forces pulls the path straight, off the curved minimum energy path", "It uses the wrong potential"]
  answer: 1
  why: "NEB removes that component by projection."
- q: "What does the climbing image do?"
  options: ["It stays at the starting minimum", "It moves uphill along the path and downhill perpendicular to it, converging exactly onto the saddle point", "It adds a spring"]
  answer: 1
  why: "The parallel force is inverted and the springs are removed for that image."
- q: "A barrier of 0.5 eV at 300 K (k_BT ≈ 0.026 eV) suppresses the crossing probability relative to the bottom of the well by roughly…"
  options: ["10⁻²", "10⁻⁸", "10⁻²⁰"]
  answer: 1
  why: "e^(−0.5/0.026) ≈ e^(−19) ≈ 4 × 10⁻⁹."
- q: "A frequency calculation on a converged climbing image reports two imaginary frequencies. What does this mean?"
  options: ["The calculation found the transition state", "The structure is a second-order saddle; displace along the extra mode and re-optimise", "The barrier is twice as high"]
  answer: 1
  why: "A transition state has exactly one negative Hessian eigenvalue; a second one means the structure sits on a ridge, often held there by symmetry."
- q: "Two passes have the same saddle energy, but the transverse vibrations are ten times softer at one of them. Which is crossed faster?"
  options: ["The stiff one", "The soft (wide) one, by about a factor of ten", "Both equally"]
  answer: 1
  why: "The free-energy barrier includes ½ kT ln of the stiffness ratio, so the wide pass has the lower free-energy barrier."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. D. J. Wales, *Energy Landscapes: Applications to Clusters, Biomolecules and Glasses*, Cambridge University Press (2003).
2. K. Fukui, "Formulation of the reaction coordinate", *Journal of Physical Chemistry* **74**, 4161–4163 (1970).
3. K. Müller and L. D. Brown, "Location of saddle points and minimum energy paths by a constrained simplex optimization procedure", *Theoretica Chimica Acta* **53**, 75–93 (1979).
4. R. Elber and M. Karplus, "A method for determining reaction paths in large molecules: application to myoglobin", *Chemical Physics Letters* **139**, 375–380 (1987).
5. H. Jónsson, G. Mills and K. W. Jacobsen, "Nudged elastic band method for finding minimum energy paths of transitions", in *Classical and Quantum Dynamics in Condensed Phase Simulations*, eds. B. J. Berne, G. Ciccotti and D. F. Coker, World Scientific (1998), 385–404.
6. G. Henkelman and H. Jónsson, "Improved tangent estimate in the nudged elastic band method for finding minimum energy paths and saddle points", *Journal of Chemical Physics* **113**, 9978–9985 (2000).
7. G. Henkelman, B. P. Uberuaga and H. Jónsson, "A climbing image nudged elastic band method for finding saddle points and minimum energy paths", *Journal of Chemical Physics* **113**, 9901–9904 (2000).
8. W. E, W. Ren and E. Vanden-Eijnden, "String method for the study of rare events", *Physical Review B* **66**, 052301 (2002).
9. G. Henkelman and H. Jónsson, "A dimer method for finding saddle points on high dimensional potential surfaces using only first derivatives", *Journal of Chemical Physics* **111**, 7010–7022 (1999).
10. G. Henkelman and H. Jónsson, "Long time scale kinetic Monte Carlo simulations without lattice approximation and predefined event table", *Journal of Chemical Physics* **115**, 9657–9666 (2001).
11. D. J. Wales and J. P. K. Doye, "Global optimization by basin-hopping and the lowest energy structures of Lennard-Jones clusters containing up to 110 atoms", *Journal of Physical Chemistry A* **101**, 5111–5116 (1997).
12. J. Baker, "An algorithm for the location of transition states", *Journal of Computational Chemistry* **7**, 385–395 (1986).
13. S. Smidstrup, A. Pedersen, K. Stokbro and H. Jónsson, "Improved initial guess for minimum energy path calculations", *Journal of Chemical Physics* **140**, 214106 (2014).
14. F. H. Stillinger and T. A. Weber, "Hidden structure in liquids", *Physical Review A* **25**, 978–989 (1982).
15. M. Goldstein, "Viscous liquids and the glass transition: a potential energy barrier picture", *Journal of Chemical Physics* **51**, 3728–3739 (1969).
16. J. D. Bryngelson, J. N. Onuchic, N. D. Socci and P. G. Wolynes, "Funnels, pathways, and the energy landscape of protein folding: a synthesis", *Proteins* **21**, 167–195 (1995).

</div>
