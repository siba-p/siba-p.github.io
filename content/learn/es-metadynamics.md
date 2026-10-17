---
title: "Metadynamics"
description: "History-dependent biasing that fills free-energy wells: the origins in local elevation and conformational flooding, the metadynamics algorithm of Laio and Parrinello, its parameters and convergence problems, well-tempered metadynamics and the bias factor, reweighting to unbiased averages, infrequent metadynamics for rates, multiple-walker, bias-exchange, parallel-bias and funnel variants, and a PLUMED input."
track: rl-bias
weight: 1
level: Advanced
prereqs: ["es-umbrella"]
lab: "Watch a metadynamics bias fill the wells of a free-energy profile, and compare plain and well-tempered runs"
---

## Filling the wells

Umbrella sampling needs the bias to be designed in advance. A more adaptive idea is to let the simulation build its own bias from its history: wherever the system has already been, add a little repulsive potential, so that it is gradually pushed to explore somewhere new. Once the bias has filled the well the system started in, it spills over the barrier into the next well, fills that too, and eventually the whole free-energy landscape is levelled. The accumulated bias is then a mirror image of the free energy.

Versions of this idea appeared several times. Thomas Huber, Andrew Torda and Wilfred van Gunsteren's **local elevation** (1994) penalised conformations already visited in conformational searches; Helmut Grubmüller's **conformational flooding** (1995) filled a potential-energy well with a Gaussian to accelerate escape; and the **Wang–Landau** algorithm (Fugao Wang and David Landau, 2001) built up a flat histogram in energy by adaptively modifying the density of states in Monte Carlo. In 2002 Alessandro Laio and Michele Parrinello formulated **metadynamics** for collective variables in molecular dynamics, in a form that has since become one of the most widely used enhanced-sampling methods in chemistry, biophysics and materials science. Laio and Parrinello described it as filling the free-energy wells with "computational sand".

## The algorithm

At regular intervals $\tau_G$, metadynamics adds a small Gaussian hill to a bias potential at the current value of the collective variable:

{{< eq title="The metadynamics bias" say="Every few steps, drop a small Gaussian hill where the system is now; the hills pile up and push it away from places it has already visited." >}}
$$ \textcolor{#845ef7}{V}(s, t) = \sum_{t' = \tau_G, 2\tau_G, \ldots < t} \textcolor{#f08c2e}{w}\, \exp\!\left(-\frac{\big(s - s(t')\big)^2}{2\textcolor{#12a594}{\sigma}^2}\right), \qquad \lim_{t\to\infty} \textcolor{#845ef7}{V}(s, t) \approx -F(s) + C $$
- $\textcolor{#f08c2e}{w}$: the height of each hill; $\textcolor{#12a594}{\sigma}$: its width; $\tau_G$: the deposition interval
- the force on the atoms is $-\partial V/\partial \mathbf x = -(\partial V/\partial s)(\partial s/\partial\mathbf x)$, so the bias acts through the collective variable
{{< /eq >}}

The figure is a laboratory for all the adaptive methods of this part. A single collective variable diffuses by Langevin dynamics on a free-energy profile (blue). With plain MD it stays in its starting well. With metadynamics, hills accumulate (violet fill, the profile plus the bias), the system escapes, and the negative of the bias (orange dashed) approaches the true profile.

{{< widget name="eslab" title="Metadynamics filling a free-energy landscape" caption="Top: the free-energy profile (blue), the profile plus the accumulated bias (violet fill), and the free-energy estimate from the bias (orange dashed); the rose dot is the system. Bottom: the collective variable over time. Switch between plain MD, metadynamics and well-tempered metadynamics, and change the hill height and width." opts=`{"method":"metad","land":"double"}` >}}

Watch the first well fill: the system rattles in its starting basin while the violet region rises; when the bias reaches the barrier height, the system crosses, and the time series shows the first transition. Thereafter it moves back and forth freely while both wells continue to fill. The estimate converges to the true profile, but not exactly. Because hills keep being added at full height forever, the bias never stops changing: it fluctuates around $-F(s)$ with an error that depends on the hill height and the deposition rate, and it overfills regions where the dynamics is slow to respond. Increase the hill height and the errors grow; make it small and convergence takes longer. Laio, Rodriguez-Fortea, Gervasio, Ceccarelli and Parrinello analysed this error in 2005, showing that it scales as the square root of the deposition rate.

## Well-tempered metadynamics

In 2008 Alessandro Barducci, Giovanni Bussi and Michele Parrinello solved the convergence problem with **well-tempered metadynamics** (WTMetaD). The height of each new hill is reduced according to how much bias has already accumulated at that point:

{{< eq title="Well-tempered metadynamics" say="Hills shrink where the bias is already high, so the bias converges smoothly to a known fraction of the free energy." >}}
$$ \textcolor{#f08c2e}{w}(t) = w_0\, \exp\!\left(-\frac{\textcolor{#845ef7}{V}\big(s(t), t\big)}{k_B\Delta T}\right), \qquad \lim_{t\to\infty} \textcolor{#845ef7}{V}(s, t) = -\left(1 - \frac{1}{\gamma}\right) F(s) + C, \qquad \gamma = \frac{T + \Delta T}{T} $$
- $\gamma$: the **bias factor**; the sampled distribution of $s$ tends to $P(s)^{1/\gamma}$, a smoothed version of the equilibrium one
- $\gamma \to 1$ is unbiased MD; $\gamma \to \infty$ recovers plain metadynamics
{{< /eq >}}

The well-tempered bias does not flatten the landscape completely. It flattens it to a fraction $1/\gamma$ of its original height, as if the collective variable were at an effective temperature $T + \Delta T$ while all other degrees of freedom stay at $T$. The free energy is recovered as $F(s) = -\frac{\gamma}{\gamma - 1}V(s)$. The bias factor sets the compromise: large enough that barriers of a few tens of $k_BT$ become crossable (a bias factor of 10 turns a 20 $k_BT$ barrier into 2 $k_BT$), small enough not to waste time sampling extremely high free energies. Select well-tempered metadynamics in the figure and compare with the plain version: the hills shrink as the profile fills, the violet surface converges to a tilted copy of the profile rather than a flat line, and the estimate stops fluctuating.

## Reweighting and rates

The bias distorts the sampled distribution, so ordinary averages from a metadynamics run are biased averages. Because the bias is known, they can be **reweighted**. For well-tempered metadynamics in its quasi-stationary regime, each frame receives a weight $e^{\beta(V(s(t), t) - c(t))}$, where $c(t)$ is a time-dependent offset that accounts for the growth of the bias; Pratyush Tiwary and Michele Parrinello gave a practical estimator for it in 2015. Reweighting allows free energies along variables that were not biased to be computed from the same simulation, for example the free energy as a function of a second order parameter in a nucleation study.

Metadynamics can also give **rates**. In **infrequent metadynamics** (Tiwary and Parrinello, 2013), hills are deposited slowly enough that the transition state region is never biased. The system then escapes from a well faster than in an unbiased simulation, but by passing through the same unbiased transition states. Each escape time can be rescaled by the **acceleration factor** $\langle e^{\beta V}\rangle$, accumulated while waiting in the well, to give an unbiased escape time, and the distribution of rescaled times should be exponential if the assumptions hold, which provides a statistical check. This approach has been used to compute residence times of drugs bound to proteins on timescales of seconds.

## Variants

Several variants address the limitations of the basic method. **Multiple-walker** metadynamics (Paolo Raiteri, Laio, Gervasio, Cristian Micheletti and Parrinello, 2006) runs many replicas that deposit hills into a shared bias, parallelising the filling. **Bias-exchange** metadynamics (Stefano Piana and Laio, 2007) runs several replicas, each biasing a different collective variable, and exchanges configurations between them, which allows many CVs to be used without the cost of a high-dimensional bias. **Parallel-bias** metadynamics (Jim Pfaendtner and Massimiliano Bonomi, 2015) applies several one-dimensional biases simultaneously in a single simulation. **Funnel** metadynamics (Vittorio Limongelli, Bonomi and Parrinello, 2013) adds a funnel-shaped restraint for ligand-binding calculations, so that the unbound state is sampled in a finite volume and the standard binding free energy can be computed.

Metadynamics is implemented in PLUMED, which works with most major MD and ab initio codes. A well-tempered run biasing the distance between two atoms needs only a few lines:

```text
# plumed.dat
d1: DISTANCE ATOMS=1,10
metad: METAD ARG=d1 SIGMA=0.05 HEIGHT=1.2 PACE=500 BIASFACTOR=10 TEMP=300 FILE=HILLS
PRINT ARG=d1,metad.bias STRIDE=100 FILE=COLVAR
```

`HEIGHT` is in the energy units of the MD engine (kJ/mol in GROMACS), `PACE` in MD steps and `SIGMA` in the units of the CV. After the run, `plumed sum_hills --hills HILLS` reconstructs the bias on a grid, and from it the free energy.

## When to use metadynamics

Metadynamics is at its best when one or two good collective variables are known and the free-energy landscape along them is to be explored without prior knowledge of where the minima and barriers are. It discovers unexpected intermediate states, it is easy to set up, and its well-tempered form converges to a well-defined answer. Its weaknesses are those of every CV-based method: a poor collective variable leaves hidden barriers, and the cost grows steeply with the number of biased variables, since hills must fill a space of growing dimension. The next chapter describes OPES, which reformulates the same goal in a way that converges faster, together with variationally enhanced sampling and the adaptive biasing force.

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

</div>
