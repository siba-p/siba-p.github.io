---
title: "Metadynamics"
description: "History-dependent biasing that fills free-energy wells: the origins in local elevation and conformational flooding, the metadynamics algorithm of Laio and Parrinello, its parameters and convergence problems, well-tempered metadynamics and the bias factor, reweighting to unbiased averages, infrequent metadynamics for rates, multiple-walker, bias-exchange, parallel-bias and funnel variants, and a PLUMED input."
hook: "Pour sand into every valley you have already visited and sooner or later you are pushed over the mountain pass. That is metadynamics, and the sand it leaves behind is a map of the free energy."
objectives:
  - "Explain how Gaussian hills deposited along a collective variable fill free-energy wells"
  - "Compare plain and well-tempered metadynamics and the role of the bias factor γ"
  - "Compute a free-energy surface from a converged well-tempered bias"
  - "Write a PLUMED input for well-tempered metadynamics with sensible hill parameters"
  - "Recognise when reweighting, infrequent metadynamics or multiple walkers are the right extension"
cover: "cover.svg"
milestones:
  - year: 1994
    text: "Huber, Torda and van Gunsteren penalise visited conformations with local elevation"
  - year: 2002
    text: "Laio and Parrinello introduce metadynamics in 'Escaping free-energy minima'"
  - year: 2008
    text: "Barducci, Bussi and Parrinello publish well-tempered metadynamics"
  - year: 2013
    text: "Tiwary and Parrinello obtain rates from infrequent metadynamics"
track: rl-bias
weight: 1
level: Advanced
prereqs: ["es-umbrella"]
lab: "Watch a metadynamics bias fill the wells of a free-energy profile, and compare plain and well-tempered runs"
---

## Filling the wells

### A bias built from history

Umbrella sampling needs the bias to be designed in advance. A more adaptive idea is to let the simulation build its own bias from its history: wherever the system has already been, add a little repulsive potential, so that it is gradually pushed to explore somewhere new. Once the bias has filled the well the system started in, it spills over the barrier into the next well, fills that too, and eventually the whole free-energy landscape is levelled. The accumulated bias is then a mirror image of the free energy.

{{< fig src="loop.svg" alt="Four boxes in a cycle: atoms move by MD, the collective variable is computed, a Gaussian hill is added to the bias every PACE steps, and the bias pushes the atoms through the chain rule" caption="The metadynamics loop. The bias lives in the space of the collective variable, a few numbers, while the force it produces acts on every atom that the variable depends on, through $\nabla_i s$. That is why the bias stays cheap however large the system is, and why the result can be no better than the variable." >}}

Two consequences follow from the loop. The cost of the bias is set by the number of hills, not by the number of atoms: after $10^5$ depositions, summing every Gaussian at every step would be slow, so codes accumulate the bias on a grid, which PLUMED does when `GRID_MIN`, `GRID_MAX` and `GRID_BIN` are given. And the bias is felt only along $s$: a slow motion that $s$ does not describe is not accelerated at all, however much bias is added.

### Origins

Versions of this idea appeared several times. Thomas Huber, Andrew Torda and Wilfred van Gunsteren's **local elevation** (1994) penalised conformations already visited in conformational searches; Helmut Grubmüller's **conformational flooding** (1995) filled a potential-energy well with a Gaussian to accelerate escape; and the **Wang–Landau** algorithm (Fugao Wang and David Landau, 2001) built up a flat histogram in energy by adaptively modifying the density of states in Monte Carlo. In 2002 Alessandro Laio and Michele Parrinello formulated **metadynamics** for collective variables in molecular dynamics, in a form that has since become one of the most widely used enhanced-sampling methods in chemistry, biophysics and materials science. The method is often pictured as filling the free-energy wells with computational sand.

## The algorithm

### Depositing Gaussian hills

At regular intervals $\tau_G$, metadynamics adds a small Gaussian hill to a bias potential at the current value of the collective variable:

{{< eq title="The metadynamics bias" say="Every few steps, drop a small Gaussian hill where the system is now; the hills pile up and push it away from places it has already visited." >}}
$$ \textcolor{#845ef7}{V}(s, t) = \sum_{t' = \tau_G, 2\tau_G, \ldots < t} \textcolor{#f08c2e}{w}\, \exp\!\left(-\frac{\big(s - s(t')\big)^2}{2\textcolor{#12a594}{\sigma}^2}\right), \qquad \lim_{t\to\infty} \textcolor{#845ef7}{V}(s, t) \approx -F(s) + C $$
- $\textcolor{#f08c2e}{w}$: the height of each hill; $\textcolor{#12a594}{\sigma}$: its width; $\tau_G$: the deposition interval
- the force on the atoms is $-\partial V/\partial \mathbf x = -(\partial V/\partial s)(\partial s/\partial\mathbf x)$, so the bias acts through the collective variable
{{< /eq >}}

### Metadynamics on a one-dimensional profile

The figure is a laboratory for all the adaptive methods of this part. A single collective variable diffuses by Langevin dynamics on a free-energy profile (blue). With plain MD it stays in its starting well. With metadynamics, hills accumulate (violet fill, the profile plus the bias), the system escapes, and the negative of the bias (orange dashed) approaches the true profile.

{{< widget name="eslab" title="Metadynamics filling a free-energy landscape" caption="Top: the free-energy profile (blue), the profile plus the accumulated bias (violet fill), and the free-energy estimate from the bias (orange dashed); the rose dot is the system. Bottom: the collective variable over time. Switch between plain MD, metadynamics and well-tempered metadynamics, and change the hill height and width." opts=`{"method":"metad","land":"double"}` >}}

Watch the first well fill: the system rattles in its starting basin while the violet region rises; when the bias reaches the barrier height, the system crosses, and the time series shows the first transition. Thereafter it moves back and forth freely while both wells continue to fill. The estimate converges to the true profile, but not exactly. Because hills keep being added at full height forever, the bias never stops changing: it fluctuates around $-F(s)$ with an error that depends on the hill height and the deposition rate, and it overfills regions where the dynamics is slow to respond. Increase the hill height and the errors grow; make it small and convergence takes longer. Laio, Rodriguez-Fortea, Gervasio, Ceccarelli and Parrinello analysed this error in 2005, showing that it scales as the square root of the deposition rate.

### Why the bias mirrors the free energy

The argument is a self-correcting feedback. Suppose that at some moment $F(s) + V(s,t)$ is flat over the explored range. The variable then samples that range uniformly, hills land everywhere at the same rate, and the bias grows by the same amount everywhere: its shape no longer changes, and a constant offset has no effect on the forces. Now suppose that $F + V$ has a dip somewhere. The variable spends extra time in the dip, more hills land there, and the dip fills; a bump is visited less, receives fewer hills and is overtaken by its surroundings. The flat state is therefore the attractor of the dynamics, and at that state $V = -F + C$. The argument also shows where it fails: it assumes that the variable samples $F + V$ in equilibrium between depositions. If hills are added faster than the system relaxes, the bias piles up where the system happens to be rather than where the free energy is low, which is the overfilling that the 2005 error analysis quantifies.

{{< note type="practice" title="Back of the envelope" >}}
How many hills fill a well? Take the PLUMED input at the end of this chapter: `HEIGHT=1.2` kJ/mol, `SIGMA=0.05` nm, `PACE=500` steps of 2 fs, one hill per picosecond. One Gaussian has volume $w\sigma\sqrt{2\pi} = 0.150$ kJ mol⁻¹ nm. A parabolic well 20 kJ/mol deep and 0.6 nm wide at the rim holds $\tfrac23 \times 20 \times 0.6 = 8.0$ kJ mol⁻¹ nm, so about 53 hills, or 53 ps, fill it, if every hill were spent usefully. With two variables and the same well radius, the bowl holds $\tfrac12\times 20\times\pi(0.3)^2 = 2.8$ kJ mol⁻¹ nm², each hill $w\cdot2\pi\sigma^2 = 0.019$ of it, and about 150 hills are needed; with three, about 380. The count grows roughly as $(R/\sigma)^d$ for a well of radius $R$ in $d$ variables, which is why metadynamics is used with one to three variables, and why a narrow σ in many dimensions never finishes.
{{< /note >}}

## Well-tempered metadynamics

### Shrinking hills

In 2008 Alessandro Barducci, Giovanni Bussi and Michele Parrinello solved the convergence problem with **well-tempered metadynamics** (WTMetaD). The height of each new hill is reduced according to how much bias has already accumulated at that point:

{{< eq title="Well-tempered metadynamics" say="Hills shrink where the bias is already high, so the bias converges smoothly to a known fraction of the free energy." >}}
$$ \textcolor{#f08c2e}{w}(t) = w_0\, \exp\!\left(-\frac{\textcolor{#845ef7}{V}\big(s(t), t\big)}{k_B\Delta T}\right), \qquad \lim_{t\to\infty} \textcolor{#845ef7}{V}(s, t) = -\left(1 - \frac{1}{\gamma}\right) F(s) + C, \qquad \gamma = \frac{T + \Delta T}{T} $$
- $\gamma$: the **bias factor**; the sampled distribution of $s$ tends to $P(s)^{1/\gamma}$, a smoothed version of the equilibrium one
- $\gamma \to 1$ is unbiased MD; $\gamma \to \infty$ recovers plain metadynamics
{{< /eq >}}

### The bias factor

The well-tempered bias does not flatten the landscape completely. It flattens it to a fraction $1/\gamma$ of its original height, as if the collective variable were at an effective temperature $T + \Delta T$ while all other degrees of freedom stay at $T$. The free energy is recovered as $F(s) = -\frac{\gamma}{\gamma - 1}V(s)$.

Where the factor $1 - 1/\gamma$ comes from follows from the same steady-state argument as before. Hills are now added at a rate proportional to the time spent at $s$, $e^{-\beta[F(s) + V(s)]}$, times their height, $e^{-V(s)/k_B\Delta T}$. The bias keeps its shape when this product is the same everywhere, so that the bias grows uniformly. Taking the logarithm, $-\beta(F + V) - V/k_B\Delta T$ must be a constant, and solving for $V$ gives $V = -\frac{\Delta T}{T + \Delta T}F + C = -(1 - 1/\gamma)F + C$. The sampled distribution is then $e^{-\beta(F + V)} \propto e^{-\beta F/\gamma} = P(s)^{1/\gamma}$.

{{< fig src="biasfactor.svg" alt="Left: a double-well free energy with a 30 kBT barrier, and the same curve divided by 3, by 10, and flattened completely. Right: the corresponding sampled densities on a logarithmic axis, from two sharp peaks for plain MD to a nearly flat line" caption="The bias factor, computed for a double well with a 30 $k_BT$ barrier and a right basin 4 $k_BT$ higher. With $\gamma$ = 3 the variable feels a 10 $k_BT$ barrier, with $\gamma$ = 10 a 3 $k_BT$ barrier, and with $\gamma \to \infty$ none. Unbiased, the barrier top is $e^{-30} \approx 10^{-13}$ times less likely than the well bottom." >}}

{{< note type="try" title="Pause and predict" >}}
A well-tempered run at 300 K uses `BIASFACTOR=10`. What temperature does the collective variable effectively feel? Since $\gamma = (T + \Delta T)/T$, $\Delta T = (\gamma - 1)T = 2700$ K, so the variable behaves as if it were at 3000 K while every other degree of freedom, solvent included, stays at 300 K. Heating the whole system to 3000 K would vaporise the solvent; heating one variable does not.
{{< /note >}}
 The bias factor sets the compromise: large enough that barriers of a few tens of $k_BT$ become crossable (a bias factor of 10 turns a 20 $k_BT$ barrier into 2 $k_BT$), small enough not to waste time sampling extremely high free energies. Select well-tempered metadynamics in the figure and compare with the plain version: the hills shrink as the profile fills, the violet surface converges to a tilted copy of the profile rather than a flat line, and the estimate stops fluctuating.

{{< fig src="filling.svg" alt="Left: a double well filled by coloured layers of bias deposited after 100, 250, 500, 1500 and 6000 hills. Right: the estimated free-energy difference against time for plain metadynamics, fluctuating widely, and for well-tempered metadynamics, settling near the exact value of 1.30" caption="A seeded one-dimensional run, Brownian dynamics on a 10 $k_BT$ double well. Left: the first 100 hills fill the starting well, later hills spread over both, and with $\gamma$ = 6 the layers thin out as the hills shrink from 0.3 to 0.014 $k_BT$. Right: over the last third of the run, plain metadynamics with full 0.3 $k_BT$ hills still swings by ±0.9 $k_BT$ around the exact 1.30 $k_BT$; the well-tempered estimate swings by ±0.27 $k_BT$ and keeps narrowing." >}}

## Setting up and checking a run

### Choosing the parameters

Four numbers define a well-tempered run, and each has a physical meaning that gives a starting value.

- **SIGMA**, the hill width, should resolve the features of $F(s)$ without being so small that filling takes forever. The usual recipe is to run a few hundred picoseconds unbiased in the starting basin and take a third to a half of the standard deviation of $s$. For a distance in a ligand pocket that is often 0.02 to 0.05 nm; for a coordination number, 0.1 to 0.3.
- **HEIGHT**, the initial hill height, is typically 0.5 to 2 kJ/mol for biomolecular systems at 300 K, comparable to $k_BT/2$. Larger hills fill faster but leave larger errors early on; in the well-tempered scheme they shrink anyway.
- **PACE**, the deposition interval, should be longer than the time $s$ takes to relax in its basin, so that each hill is placed by a system that has felt the previous one. 500 steps, 1 ps with a 2 fs time step, is a common value; slow variables need more.
- **BIASFACTOR** follows from the expected barrier: choose γ so that the barrier divided by γ is 2 to 3 $k_BT$. A 60 kJ/mol barrier at 300 K is 24 $k_BT$, which suggests γ between 8 and 12. A γ that is too large wastes time in high free-energy regions such as unfolded or dissociated states; one that is too small leaves the barrier rare.

Set a grid for the bias, and add walls, for example PLUMED's `UPPER_WALLS`, to stop the variable drifting into regions that do not matter, such as a ligand wandering into bulk water. A wall adds its own bias, so frames in the wall region are excluded or reweighted.

### Is it converged?

No single test proves convergence, but four together are convincing. The time series of $s$ should show many transitions back and forth between every basin, not one escape; a well-tempered run that has crossed a barrier three times has not sampled it. The free-energy difference between basins, recomputed from the bias at regular intervals with `plumed sum_hills --stride`, should flatten with time, as in the right panel of the figure above. Reweighted estimates from blocks of the trajectory should agree within their error bars, with block lengths longer than the time between transitions. And runs started from different basins should converge to the same profile. A drift in the free-energy difference that never stops, while $s$ crosses back and forth freely, is the signature of a hidden slow variable.

## Metadynamics of a real cluster

### Two collective variables for seven atoms

The one-dimensional profile hides the hardest part of a real calculation: choosing collective variables and watching the bias act on actual atoms. The [two-dimensional Lennard-Jones heptamer](../es-replica-exchange/) has four stable shapes. The hexagon, a ring of six atoms around a central one, is the ground state at $E = -12.53\,\varepsilon$; three other isomers, here called B, C and D, lie at $-11.50$, $-11.48$ and $-11.40\,\varepsilon$. A good pair of collective variables, introduced for this system in the PLUMED tutorials, describes how the coordination numbers of the atoms are distributed. Each atom's coordination number is a smooth count of its neighbours,

{{< eq title="Coordination-number moments" say="Count each atom's neighbours smoothly, then ask how spread out and how lopsided those counts are: a hexagon has one atom with six neighbours and six with three, a very lopsided distribution." >}}
$$ c_i = \sum_{j\ne i}\frac{1 - (r_{ij}/r_0)^8}{1 - (r_{ij}/r_0)^{16}}, \qquad \textcolor{#12a594}{\mu_2} = \frac1N\sum_i (c_i - \bar c)^2, \qquad \textcolor{#e64980}{\mu_3} = \frac1N\sum_i (c_i - \bar c)^3 $$
- $r_0 = 1.5\,\sigma$; the switching function falls smoothly from 1 to 0 around $r_0$, so $c_i$ and its derivatives are continuous
- $\mu_2$ is the variance and $\mu_3$ the third central moment of the coordination numbers; the four isomers sit at distinct points in the $(\mu_2, \mu_3)$ plane
{{< /eq >}}

The bias acts on the atoms through the chain rule. Writing $\partial\mu_2/\partial c_i = 2(c_i - \bar c)/N$ and $\partial\mu_3/\partial c_i = 3[(c_i - \bar c)^2 - \mu_2]/N$, and differentiating each switching function with respect to the distance it depends on, gives the force of the bias on every atom. The figure computes exactly this at every step, and the implementation was checked against finite differences to six significant figures.

### Watching the bias work

{{< widget name="metadbox" title="Well-tempered metadynamics of the LJ7 cluster" caption="Left: the cluster, each atom coloured and labelled by its coordination number. Right: the free-energy estimate in the plane of the two collective variables, built from the deposited Gaussians, with the recent trajectory and the four minima marked by their energies. Bottom: the free energy of isomers B, C and D relative to the hexagon as the simulation proceeds; dashed lines are reference values." >}}

The simulation starts in the hexagon at $k_BT = 0.12\,\varepsilon$. Turn the bias off first: the cluster vibrates, the point on the map rattles around the hexagon minimum, and in long unbiased runs the cluster spends about 98 % of its time there. Turn the bias on and the map begins to colour from the hexagon outwards. Within a few hundred $\tau$ the bias has filled the hexagon basin enough to push the cluster into one of the other isomers, and the atoms rearrange in front of you: the central atom is squeezed out, its coordination number drops from six to four or five, and $\mu_3$ falls. The point then wanders between B, C and D, the basins fill in turn, and the free-energy estimates in the lower plot settle.

How accurate are they? Four independent simulations were run to check. Two long well-tempered runs ($4\times10^4\,\tau$ each) gave free energies relative to the hexagon of $0.57$, $0.54$ and $0.71\,\varepsilon$ for B, C and D, agreeing with each other to $0.02\,\varepsilon$. Three unbiased runs of $2\times10^5\,\tau$ each, five times longer still, gave $0.54$–$0.56\,\varepsilon$ for B and $0.52$–$0.56\,\varepsilon$ for C, in agreement, but for D anything from $0.62$ to $0.99\,\varepsilon$: even $2\times10^5\,\tau$ of plain molecular dynamics visits isomer D too rarely to measure its free energy, while metadynamics converged all three in a fifth of that time. That is the case for enhanced sampling in one sentence.

### The same calculation in PLUMED

The PLUMED input for this calculation, with the MD engine running the Lennard-Jones cluster in reduced units, is

```text
# plumed.dat (reduced Lennard-Jones units)
UNITS NATURAL
c1: COORDINATIONNUMBER SPECIES=1-7 MOMENTS=2-3 SWITCH={RATIONAL R_0=1.5 NN=8 MM=16}
metad: METAD ARG=c1.moment-2,c1.moment-3 SIGMA=0.04,0.04 HEIGHT=0.012 PACE=250 BIASFACTOR=10 TEMP=0.12 FILE=HILLS
PRINT ARG=c1.moment-2,c1.moment-3,metad.bias STRIDE=100 FILE=COLVAR
```

`COORDINATIONNUMBER` with `MOMENTS=2-3` computes the central moments of the coordination numbers, and the rational switching function with `NN=8` and `MM=16` is the one in the equation above.

## Reweighting and rates

### Unbiased averages

The bias distorts the sampled distribution, so ordinary averages from a metadynamics run are biased averages. Because the bias is known, they can be **reweighted**. For well-tempered metadynamics in its quasi-stationary regime, each frame receives a weight $e^{\beta(V(s(t), t) - c(t))}$, where $c(t)$ is a time-dependent offset that accounts for the growth of the bias; Pratyush Tiwary and Michele Parrinello gave a practical estimator for it in 2015. The offset is

$$
c(t) = \frac{1}{\beta}\ln\frac{\int \mathrm ds\; e^{\frac{\gamma}{\gamma - 1}\beta V(s,t)}}{\int \mathrm ds\; e^{\frac{1}{\gamma - 1}\beta V(s,t)}},
$$

which uses the well-tempered relation between bias and free energy to express the normalisation of the biased distribution through the bias alone. In practice the first part of the run, before the bias has taken its final shape, is discarded, and $c(t)$ is evaluated on the bias grid at each output time. A simpler alternative, used when the bias has stopped changing, is to weight every frame by the final bias, $e^{\beta V(s, t_{\text{end}})}$.

Reweighting allows free energies along variables that were not biased to be computed from the same simulation, for example the free energy as a function of a second order parameter in a nucleation study.

### Rates from infrequent metadynamics

Metadynamics can also give **rates**. In **infrequent metadynamics** (Tiwary and Parrinello, 2013), hills are deposited slowly enough that the transition state region is never biased. The system then escapes from a well faster than in an unbiased simulation, but by passing through the same unbiased transition states. Each escape time can be rescaled by the **acceleration factor** $\langle e^{\beta V}\rangle$, accumulated while waiting in the well, to give an unbiased escape time, and the distribution of rescaled times should be exponential if the assumptions hold, which provides a statistical check. This approach has been used to compute residence times of drugs bound to proteins on timescales of seconds.

The test of the assumptions is quantitative. Collect 20 or more rescaled escape times from independent runs, and compare their empirical cumulative distribution with $1 - e^{-t/\tau}$; Matteo Salvalaglio, Tiwary and Parrinello proposed in 2014 a Kolmogorov–Smirnov test of this comparison, with p-values above 0.05 taken as consistent with a Poisson process. A deposition interval that is too short, or a variable that does not describe the transition state, shows up as rescaled times that depend on the deposition rate and fail the test.

## Variants and software

### Variants

Several variants address the limitations of the basic method. **Multiple-walker** metadynamics (Paolo Raiteri, Laio, Gervasio, Cristian Micheletti and Parrinello, 2006) runs many replicas that deposit hills into a shared bias, parallelising the filling. **Bias-exchange** metadynamics (Stefano Piana and Laio, 2007) runs several replicas, each biasing a different collective variable, and exchanges configurations between them, which allows many CVs to be used without the cost of a high-dimensional bias. **Parallel-bias** metadynamics (Jim Pfaendtner and Massimiliano Bonomi, 2015) applies several one-dimensional biases simultaneously in a single simulation. **Funnel** metadynamics (Vittorio Limongelli, Bonomi and Parrinello, 2013) adds a funnel-shaped restraint for ligand-binding calculations, so that the unbound state is sampled in a finite volume and the standard binding free energy can be computed.

### Running metadynamics with PLUMED

Metadynamics is implemented in PLUMED, which works with most major MD and ab initio codes. A well-tempered run biasing the distance between two atoms needs only a few lines:

```text
# plumed.dat
d1: DISTANCE ATOMS=1,10
metad: METAD ARG=d1 SIGMA=0.05 HEIGHT=1.2 PACE=500 BIASFACTOR=10 TEMP=300 FILE=HILLS
PRINT ARG=d1,metad.bias STRIDE=100 FILE=COLVAR
```

`HEIGHT` is in the energy units of the MD engine (kJ/mol in GROMACS), `PACE` in MD steps and `SIGMA` in the units of the CV. After the run, `plumed sum_hills --hills HILLS` reconstructs the bias on a grid, and from it the free energy.

## When to use metadynamics

{{< note type="practice" title="From the lab" >}}
- **Chemical reactions.** Marcella Iannuzzi, Laio and Parrinello (2003) combined metadynamics with Car–Parrinello molecular dynamics, biasing coordination numbers between reacting atoms, so that bonds break and form on an ab initio surface without a predefined reaction path. Coordination numbers and their differences remain the standard variables for reactions in solution and at catalytic surfaces.
- **Ligand binding.** Funnel metadynamics, biasing the position of the ligand along the funnel axis and its distance from it, gives binding free energies that can be compared with experiment once the funnel's standard-state correction is applied.
- **Nucleation and phase transitions.** Biasing order parameters such as averaged Steinhardt parameters, or the enthalpy and a structural fingerprint, drives liquids to crystallise and solids to transform within nanoseconds; the challenge is that the variable must distinguish the polymorphs that compete.
{{< /note >}}

Metadynamics is at its best when one or two good collective variables are known and the free-energy landscape along them is to be explored without prior knowledge of where the minima and barriers are. It discovers unexpected intermediate states, it is easy to set up, and its well-tempered form converges to a well-defined answer. Its weaknesses are those of every CV-based method: a poor collective variable leaves hidden barriers, and the cost grows steeply with the number of biased variables, since hills must fill a space of growing dimension. The next chapter describes [OPES](../es-opes-abf/), which reformulates the same goal in a way that converges faster, together with variationally enhanced sampling and the adaptive biasing force.

{{< note type="warn" title="Myth" >}}
**Myth:** given enough time, metadynamics converges whatever variable is biased. **Reality:** with a variable that misses a slow motion, the bias keeps filling a basin that the system cannot leave by the route the variable describes. The run shows hysteresis: the variable crosses back and forth, but the free-energy difference drifts from block to block, and two runs from different basins disagree. More time only makes the bias larger. The cure is a better variable, often found by examining the structures at the two ends of the drift, or one of the machine-learned variables of [the chapter on learned collective variables](../es-ml-cvs/).
{{< /note >}}

{{< note type="key" >}}
- Metadynamics (Laio and Parrinello, 2002) deposits Gaussian hills at the current CV value; the accumulated bias tends to $-F(s)$, levelling the landscape.
- Plain metadynamics keeps adding full hills, so the bias fluctuates and overfills; errors grow with hill height and deposition rate.
- Well-tempered metadynamics scales hill heights by $e^{-V/k_B\Delta T}$; the bias converges to $-(1 - 1/\gamma)F(s)$ and the CV samples $P(s)^{1/\gamma}$.
- Reweighting with $e^{\beta(V - c(t))}$ gives unbiased averages; infrequent metadynamics gives rates through an acceleration factor.
- Variants: multiple walkers, bias exchange, parallel bias, funnel metadynamics; PLUMED implements them all.
{{< /note >}}

{{< quiz >}}
- q: "In the long-time limit of plain metadynamics, the bias potential approaches…"
  options: ["zero", "the negative of the free energy, up to a constant (with fluctuations)", "the potential energy"]
  answer: 1
  why: "The bias fills the wells until the landscape is flat."
- q: "Well-tempered metadynamics with bias factor γ = 10 is applied across a 30 k_BT barrier. Roughly what barrier does the system then experience along the CV?"
  options: ["30 k_BT", "3 k_BT", "0"]
  answer: 1
  why: "The biased landscape is F(s)/γ."
- q: "How is the free energy obtained from a converged well-tempered bias V(s)?"
  options: ["F = −V", "F = −γ/(γ − 1) · V", "F = V/γ"]
  answer: 1
  why: "V → −(1 − 1/γ) F."
- q: "A well-tempered run at 300 K uses a bias factor of 10. At what effective temperature is the collective variable sampled?"
  options: ["300 K", "3000 K", "30 K"]
  answer: 1
  why: "γ = (T + ΔT)/T, so T + ΔT = γT = 3000 K for the CV, while all other degrees of freedom stay at 300 K."
- q: "In a well-tempered run the CV crosses between basins many times, but the free-energy difference keeps drifting from block to block. What is the most likely cause?"
  options: ["The hills are too small", "A slow degree of freedom that the CV does not describe", "The bias factor is too large"]
  answer: 1
  why: "Free recrossing with a drifting estimate is the signature of a hidden barrier orthogonal to the CV."
- q: "What is the key requirement of infrequent metadynamics for computing rates?"
  options: ["Very tall hills", "Hills deposited slowly enough that the transition-state region is never biased", "Multiple walkers"]
  answer: 1
  why: "Then escapes occur through unbiased transition states and times can be rescaled."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. A. Laio and M. Parrinello, "Escaping free-energy minima", *Proceedings of the National Academy of Sciences* **99**, 12562–12566 (2002).
2. T. Huber, A. E. Torda and W. F. van Gunsteren, "Local elevation: a method for improving the searching properties of molecular dynamics simulation", *Journal of Computer-Aided Molecular Design* **8**, 695–708 (1994).
3. H. Grubmüller, "Predicting slow structural transitions in macromolecular systems: conformational flooding", *Physical Review E* **52**, 2893–2906 (1995).
4. F. Wang and D. P. Landau, "Efficient, multiple-range random walk algorithm to calculate the density of states", *Physical Review Letters* **86**, 2050–2053 (2001).
5. A. Laio, A. Rodriguez-Fortea, F. L. Gervasio, M. Ceccarelli and M. Parrinello, "Assessing the accuracy of metadynamics", *Journal of Physical Chemistry B* **109**, 6714–6721 (2005).
6. A. Barducci, G. Bussi and M. Parrinello, "Well-tempered metadynamics: a smoothly converging and tunable free-energy method", *Physical Review Letters* **100**, 020603 (2008).
7. P. Tiwary and M. Parrinello, "From metadynamics to dynamics", *Physical Review Letters* **111**, 230602 (2013).
8. P. Tiwary and M. Parrinello, "A time-independent free energy estimator for metadynamics", *Journal of Physical Chemistry B* **119**, 736–742 (2015).
9. P. Raiteri, A. Laio, F. L. Gervasio, C. Micheletti and M. Parrinello, "Efficient reconstruction of complex free energy landscapes by multiple walkers metadynamics", *Journal of Physical Chemistry B* **110**, 3533–3539 (2006).
10. S. Piana and A. Laio, "A bias-exchange approach to protein folding", *Journal of Physical Chemistry B* **111**, 4553–4559 (2007).
11. J. Pfaendtner and M. Bonomi, "Efficient sampling of high-dimensional free-energy landscapes with parallel bias metadynamics", *Journal of Chemical Theory and Computation* **11**, 5062–5067 (2015).
12. V. Limongelli, M. Bonomi and M. Parrinello, "Funnel metadynamics as accurate binding free-energy method", *Proceedings of the National Academy of Sciences* **110**, 6358–6363 (2013).
13. G. Bussi and A. Laio, "Using metadynamics to explore complex free-energy landscapes", *Nature Reviews Physics* **2**, 200–212 (2020).
14. M. Iannuzzi, A. Laio and M. Parrinello, "Efficient exploration of reactive potential energy surfaces using Car–Parrinello molecular dynamics", *Physical Review Letters* **90**, 238302 (2003).
15. M. Salvalaglio, P. Tiwary and M. Parrinello, "Assessing the reliability of the dynamics reconstructed from metadynamics", *Journal of Chemical Theory and Computation* **10**, 1420–1425 (2014).

</div>
