---
title: "Probability and statistics"
description: "Probability as long-run frequency and as degree of belief; the sum and product rules; random variables, binomial, normal, Poisson and exponential distributions; expectation and variance; the central limit theorem and error bars; Bayes' theorem; and estimating averages and their uncertainty from correlated simulation data."
hook: "A computational screen catches 90 % of good materials and wrongly flags only 10 % of bad ones. If just 5 % of candidates are good, about two in three of the materials it flags are duds."
objectives:
  - "Apply the sum and product rules to compute probabilities of combined events"
  - "Compute means and variances and explain why error bars shrink as one over √n"
  - "Explain why averages of many independent variables follow the normal distribution"
  - "Use Bayes' theorem to update a belief and recognise the base-rate trap"
  - "Estimate honest error bars from correlated simulation data with block averaging"
cover: "cover.svg"
milestones:
  - year: 1654
    text: "Blaise Pascal and Pierre de Fermat found the mathematics of chance in letters"
  - year: 1713
    text: "Jacob Bernoulli's Ars Conjectandi proves the law of large numbers, published posthumously"
  - year: 1733
    text: "Abraham de Moivre approximates the binomial distribution by the normal curve"
  - year: 1763
    text: "Richard Price publishes Thomas Bayes's essay on inverse probability"
track: chance
weight: 1
level: Foundation
prereqs: ["integrals"]
lab: "Watch frequencies settle, run a Galton board, average strange distributions into bell curves, and see Bayes' theorem in a crowd"
---

## Chance and frequency

Toss a coin and you cannot say whether it will land heads. Toss it ten thousand times and you can say with great confidence that close to half the tosses will be heads. This combination, unpredictability in each case and regularity in the aggregate, is what probability theory describes, and it is everywhere in science. A single molecule in a gas moves erratically, but the pressure of $10^{23}$ molecules is steady. A single radioactive nucleus decays at an unpredictable moment, but a sample decays with a precise half-life. A single run of a stochastic training algorithm gives a slightly different network each time, but the distribution of results is reproducible.

The **probability** of an outcome is the fraction of times it occurs in a long sequence of identical, independent trials. This frequency interpretation is made precise by the **law of large numbers**: as the number of trials grows, the observed fraction converges to the probability. The convergence is not smooth. The figure below tracks the running fraction of heads, or of sixes, as trials accumulate. Early on it swings wildly; later it settles into a funnel that narrows steadily.

{{< widget name="lln" title="Frequencies settling down to probabilities" caption="Left: how often each outcome has occurred, with gold marks at the true probabilities. Right: the running fraction of the watched outcome against the number of trials on a logarithmic axis. The violet funnel is ±2 standard deviations, √(p(1 − p)/n), which narrows as 1/√n." >}}

The width of the funnel is the first appearance of a law that governs all statistical estimates: the typical deviation of an observed fraction from the true probability is $\sqrt{p(1 - p)/n}$, shrinking in proportion to $1/\sqrt n$. Ten times more data narrows the uncertainty by only a factor of $\sqrt{10} \approx 3.2$. The loaded die in the figure shows why this matters. After 30 rolls, the extra sixes may not yet be distinguishable from chance; after 1000 they are unmistakable.

{{< note type="warn" title="Myth" >}}
"After a run of heads, tails is due, because the law of large numbers has to even things out." The coin has no memory; each toss is heads with probability 1/2 whatever came before. The law of large numbers works by swamping, not by compensation. After 10 000 fair tosses the number of heads typically differs from 5000 by about $\sqrt{10\,000 \times 0.25} = 50$; after a million tosses it differs from 500 000 by about 500. The absolute excess grows like $\sqrt n$, while the fraction, $50/10\,000 = 0.005$ and then $500/10^6 = 0.0005$, shrinks like $1/\sqrt n$. The same misconception appears in simulation as the belief that a run which has spent too long in one basin will spend correspondingly longer in the other to make up for it.
{{< /note >}}

Probability has a second interpretation, as a **degree of belief** given the available information. "The probability that this candidate material is stable is 30 %" is not a statement about repeated trials, since the material either is or is not stable; it expresses uncertainty. This Bayesian interpretation obeys exactly the same mathematical rules, and it is the natural language for inference from data, for uncertainty in machine-learning predictions ([Gaussian processes](../uncertainty-gaussian-processes/)) and for deciding which experiment to do next ([active learning](../active-learning/)).

## The rules of probability

{{< note type="story" >}}
Probability theory began with a gambling question. In 1654 Blaise Pascal and Pierre de Fermat exchanged letters about the problem of points: if a game of chance between two players is interrupted before either has won, how should the stakes be divided? The question had been put to Pascal by the Chevalier de Méré. Their answer, to divide the stakes in proportion to each player's probability of winning had the game continued, required counting the possible continuations, and it introduced the idea of an expected value.
{{< /note >}}

Probabilities are numbers between 0 (impossible) and 1 (certain). Two rules generate everything else.

{{< eq title="The sum and product rules" say="Probabilities of exclusive alternatives add; probabilities of joint events multiply, conditioned on what has already happened." >}}
$$ P(A \text{ or } B) = P(A) + P(B) - P(A \text{ and } B), \qquad P(A \text{ and } B) = P(A \mid B)\,P(B) $$
- $P(A \mid B)$: the **conditional probability** of $A$ given that $B$ is known to be true
- if $A$ and $B$ cannot both happen, $P(A \text{ or } B) = P(A) + P(B)$
- $A$ and $B$ are **independent** if $P(A \mid B) = P(A)$, in which case $P(A \text{ and } B) = P(A)\,P(B)$
{{< /eq >}}

For a fair die, the probability of rolling a 1 or a 2 is $1/6 + 1/6 = 1/3$, because the outcomes are exclusive. The probability of two sixes in two independent rolls is $1/6 \times 1/6 = 1/36$. The probability that a roll is even given that it is greater than 3 is $2/3$, because of the three outcomes 4, 5 and 6, two are even.

When all outcomes are equally likely, a probability is a count: the number of favourable outcomes divided by the total number. Counting is therefore central, and its basic tool is the number of ways of choosing $k$ items from $n$ without regard to order,

$$
\binom{n}{k} = \frac{n!}{k!\,(n - k)!}.
$$

There are $\binom{10}{3} = 120$ ways to choose which 3 of 10 coin tosses are heads. Statistical mechanics is built on this kind of counting: the entropy of [an Einstein solid](../entropy-and-temperature/) is the logarithm of the number of ways of distributing energy quanta among oscillators.

{{< note type="practice" title="Back of the envelope" >}}
What is the probability that all the molecules of a gas are found in the left half of their container at a given instant? Each molecule is in the left half with probability 1/2, independently, so for $N$ molecules the answer is $2^{-N}$. For $N = 100$ this is $7.9 \times 10^{-31}$. Inspecting the gas a billion times per second for the age of the universe, $4.4 \times 10^{17}$ s, gives $4.4 \times 10^{26}$ inspections and an expected $3 \times 10^{-4}$ sightings. For a mole, $N = 6 \times 10^{23}$, the exponent itself is astronomical. The second law of thermodynamics is, in this sense, a statement about counting: the spread-out arrangements are not forced, only overwhelmingly more numerous.
{{< /note >}}

## Random variables and distributions

A **random variable** is a number whose value is determined by chance: the number of heads in ten tosses, the speed of a randomly chosen molecule, the error in a measurement. Its behaviour is described by its **distribution**, which says how probable each value is.

For a random variable that takes separate values, the distribution is a list of probabilities $P(k)$ that add up to 1. The most important example is the **binomial distribution**: the number of successes $k$ in $n$ independent trials, each succeeding with probability $p$, has

{{< eq title="The binomial distribution" say="The number of ways to arrange k successes among n trials, times the probability of any one such arrangement." >}}
$$ P(\textcolor{#4c6ef5}{k}) = \binom{\textcolor{#845ef7}{n}}{\textcolor{#4c6ef5}{k}}\,\textcolor{#845ef7}{p}^{\textcolor{#4c6ef5}{k}}\,(1 - \textcolor{#845ef7}{p})^{\textcolor{#845ef7}{n} - \textcolor{#4c6ef5}{k}}, \qquad \text{mean } np, \qquad \text{variance } np(1 - p) $$
{{< /eq >}}

A Galton board makes the binomial distribution physical. Balls fall through rows of pegs; at each peg a ball bounces left or right at random. The bin a ball lands in is the number of rightward bounces, a binomial random variable with $n$ equal to the number of rows. Each individual path is unpredictable, yet the bins fill into a precise shape.

{{< widget name="galton" title="A Galton board" caption="Each ball makes one left-or-right choice per row. The histogram shows the fraction of balls in each bin; the gold line is the binomial prediction and the dashed rose curve a bell curve with the same mean and spread. Change the bias p and the number of rows." >}}

As the number of rows grows, the binomial histogram approaches a smooth bell curve, even when $p \neq 1/2$ and the histogram is lopsided at first. This is a first glimpse of the central limit theorem, discussed below.

Many random variables are **continuous**: a speed or a position can take any value in a range. The probability of any one exact value is then zero, and the distribution is described by a **probability density** $p(x)$, defined so that the probability of a value between $x$ and $x + \mathrm dx$ is $p(x)\,\mathrm dx$. Probabilities become areas under the density, $P(a \le X \le b) = \int_a^b p(x)\,\mathrm dx$, and the total area is 1, as described in [the chapter on integrals](../integrals/). A density can exceed 1, since it is a probability per unit of $x$; only its integral is bounded.

## Expectation and variance

Two numbers summarise most distributions. The **expectation** or mean is the probability-weighted average of the values, and the **variance** is the expected squared distance from the mean:

{{< eq title="Mean and variance" say="Where the distribution is centred, and how widely it is spread around that centre." >}}
$$ \textcolor{#d4a017}{\mu} = \langle X \rangle = \sum_k k\,P(k) \;\;\text{or}\;\; \int x\,p(x)\,\mathrm dx, \qquad \textcolor{#e64980}{\sigma}^2 = \big\langle (X - \mu)^2 \big\rangle = \langle X^2\rangle - \langle X\rangle^2 $$
- $\textcolor{#e64980}{\sigma}$: the **standard deviation**, in the same units as $X$
- the angle brackets $\langle\cdot\rangle$ are the physicist's notation for an average over the distribution
{{< /eq >}}

The mean is **linear**: $\langle aX + bY\rangle = a\langle X\rangle + b\langle Y\rangle$ for any random variables, independent or not. The variance is not linear, but for **independent** variables the variances add: $\mathrm{Var}(X + Y) = \mathrm{Var}(X) + \mathrm{Var}(Y)$. This one rule explains the $1/\sqrt n$ law. The sum of $n$ independent copies of a variable with variance $\sigma^2$ has variance $n\sigma^2$, so their average, which is the sum divided by $n$, has variance $n\sigma^2/n^2 = \sigma^2/n$ and standard deviation $\sigma/\sqrt n$. Check this against the Galton board: the observed spread of the bins converges to $\sqrt{np(1-p)}$, the square root of the summed variances of $n$ independent bounces.

In statistical mechanics, means are the observable quantities and variances carry physics too. The average energy of a system in contact with a heat bath is its internal energy, and the variance of the energy is proportional to its heat capacity, $\langle E^2\rangle - \langle E\rangle^2 = k_BT^2 C_V$. Fluctuations measured in a simulation are therefore a route to thermodynamic response functions, explored in [the chapter on fluctuations](../fluctuations-and-response/).

## The normal distribution and the central limit theorem

The bell curve, or **normal distribution**, has the density

{{< eq title="The normal (Gaussian) distribution" say="Values cluster around μ, with about 68 % within one σ and 95 % within two." >}}
$$ p(x) = \frac{1}{\textcolor{#e64980}{\sigma}\sqrt{2\pi}}\exp\!\left(-\frac{(x - \textcolor{#d4a017}{\mu})^2}{2\textcolor{#e64980}{\sigma}^2}\right) $$
- the factor $1/\sigma\sqrt{2\pi}$ makes the area 1, by the Gaussian integral
- $P(|X - \mu| < \sigma) \approx 0.683$, $P(|X - \mu| < 2\sigma) \approx 0.954$, $P(|X - \mu| < 3\sigma) \approx 0.997$
{{< /eq >}}

The normal distribution owes its ubiquity to the **central limit theorem**: the sum (or average) of many independent random variables with finite variance is approximately normally distributed, whatever the distribution of the individual variables. The figure below lets you test this. Choose a distribution for single measurements that looks nothing like a bell: flat, sharply skewed, two separate humps, or just 0 and 1. Then average $n$ of them, many times over, and histogram the averages.

{{< widget name="clt" title="Averages become bell-shaped" caption="Top: the distribution of a single measurement. Bottom: a histogram of averages of n measurements, collected continuously, with the normal curve of mean μ and standard deviation σ/√n predicted by the central limit theorem. Increase n and watch any starting shape turn into the same bell, narrowing as 1/√n." >}}

For $n = 1$ the histogram simply reproduces the original shape. By $n = 5$ the averages of uniform numbers already look Gaussian; the skewed exponential needs perhaps 30; the coin needs enough terms for its discrete steps to blur. In every case the width shrinks as $\sigma/\sqrt n$.

This theorem is why measurement errors, which are the sum of many small independent disturbances, are usually Gaussian; why the velocity of a heavy particle buffeted by many collisions is Gaussian; and why the bins of the Galton board fill into a bell. It is also the basis of every error bar. When you report the average of $n$ independent measurements as $\bar x \pm \sigma/\sqrt n$, the **standard error of the mean**, you are using the central limit theorem to say that the true mean lies within that range with about 68 % confidence, and within twice that range with about 95 %.

### When averaging fails

The theorem has a condition that is easy to forget: the variance must be finite. The Cauchy distribution, $p(x) = \gamma/[\pi(x^2 + \gamma^2)]$, violates it. Physicists know it as the Lorentzian, the line shape of a lifetime-broadened spectral line and the energy profile of a resonance. Its tails fall off so slowly, as $1/x^2$, that neither its variance nor even its mean exists, and the average of $n$ Cauchy samples has exactly the same Cauchy distribution as a single sample. Averaging a thousand values gives no improvement over taking one. Every so often a sample far out in the tail arrives and drags the running mean to a new value.

{{< fig src="heavy-tails.svg" alt="Running means against the number of samples on a logarithmic axis: three Gaussian runs converge to zero inside a narrowing band while three Cauchy runs keep jumping" caption="Three runs each of Gaussian (blue) and Cauchy (orange) samples of the same width. The Gaussian running means stay inside the ±2/√n band; the Cauchy running means never settle, because single extreme samples keep resetting them." >}}

Milder versions of the same problem appear in simulation. In Zwanzig's free-energy perturbation, $\Delta F = -k_BT\ln\langle e^{-\Delta U/k_BT}\rangle$, the exponential gives enormous weight to rare configurations with low $\Delta U$. The variance is finite, but the average is dominated by samples that may never appear in a run of practical length, and the estimate is then biased as well as noisy, which is why [free-energy calculations](../es-fep-ti/) split a large change into many small steps. Rare-event observables in general, such as the maximum stress in a fracture simulation, call for diagnostics beyond $\sigma/\sqrt n$: plot the running average, check whether it is dominated by a few samples, and compare independent runs.

## Other distributions in science

A few other distributions appear so often that they are worth recognising.

The **Poisson distribution**, $P(k) = \lambda^k e^{-\lambda}/k!$, describes the number of independent random events in a fixed interval when they occur at an average rate $\lambda$ per interval: radioactive decays per minute, photons arriving at a detector, defects in a length of wire. Its mean and variance are both $\lambda$, so the relative uncertainty of a count is $1/\sqrt\lambda$. A detector that registers 10 000 counts has a statistical uncertainty of 1 %.

The Poisson distribution is the binomial distribution in the limit of many trials, each very unlikely. Divide the interval into $n$ short pieces, each holding an event with probability $p = \lambda/n$. The binomial probability of $k$ events is $\binom{n}{k}(\lambda/n)^k(1 - \lambda/n)^{n-k}$. As $n \to \infty$ with $k$ fixed, $\binom{n}{k}/n^k \to 1/k!$ and $(1 - \lambda/n)^{n} \to e^{-\lambda}$, which leaves $\lambda^k e^{-\lambda}/k!$. This is why counts of vacancies in a crystal, mutations in a DNA strand of given length and X-ray photons in a detector pixel all follow Poisson statistics: each site or interval has a small, independent chance of an event.

The **exponential distribution**, $p(t) = \lambda e^{-\lambda t}$ for $t \ge 0$, describes the waiting time until the next such event. It is memoryless: having waited a long time does not make the event more imminent. Kinetic Monte Carlo simulations draw the waiting time between rare events from this distribution. It follows from the Poisson distribution in one line: the number of events in a time $t$ is Poisson with mean $\lambda t$, so the probability of none is $e^{-\lambda t}$. That is the probability that the waiting time exceeds $t$, and differentiating $1 - e^{-\lambda t}$ gives the density $\lambda e^{-\lambda t}$, with mean waiting time $1/\lambda$.

{{< fig src="family.svg" alt="Five boxes with small plots of the Bernoulli, binomial, normal, Poisson and exponential distributions, joined by arrows labelled with the limits that connect them" caption="How the distributions of this chapter arise from one another. Summing Bernoulli trials gives the binomial; many rare trials give the Poisson; waiting times between Poisson events are exponential; and large sums tend to the normal distribution." >}}

{{< note type="practice" title="From the lab" >}}
In kinetic Monte Carlo of diffusion in a crystal, each possible event $i$, such as a vacancy hop to one of its neighbours, has a rate from harmonic transition-state theory, $k_i = \nu\,e^{-E_i/k_BT}$. With an attempt frequency $\nu = 10^{13}$ s⁻¹ and a barrier of 0.5 eV at 300 K, where $k_BT = 0.02585$ eV, $k = 10^{13} \times e^{-19.34} = 4.0 \times 10^4$ s⁻¹, so the mean waiting time is 25 μs, or $2.5 \times 10^{10}$ MD steps of 1 fs. The residence-time algorithm of Bortz, Kalos and Lebowitz (1975), the same scheme Gillespie (1976) introduced for chemical reactions, uses two uniform random numbers per step: one chooses event $i$ with probability $k_i/k_{\text{tot}}$, the other advances the clock by $-\ln(u)/k_{\text{tot}}$, an exponential waiting time with the total rate. Every step is an event, which is how kMC reaches seconds or hours of simulated time. [Reaction rates](../es-rates/) covers where the $k_i$ come from.
{{< /note >}}

The **uniform distribution**, constant on an interval, is what random-number generators produce. Every other distribution used in a simulation is made from uniform random numbers by a transformation, such as $-\ln(1 - u)/\lambda$ for an exponential, or by an accept–reject scheme. [Monte Carlo methods](../monte-carlo/) are built on this.

The **Boltzmann distribution** $p(s) \propto e^{-E_s/k_BT}$ is the central distribution of statistical mechanics. Its consequence for velocities is the [Maxwell–Boltzmann distribution](../boltzmann-and-maxwell/), in which each velocity component is normally distributed with variance $k_BT/m$.

## Bayes' theorem

The product rule can be written in two ways, $P(A \text{ and } B) = P(A \mid B)P(B) = P(B \mid A)P(A)$. Equating them gives **Bayes' theorem**, which turns a conditional probability around:

{{< eq title="Bayes' theorem" say="Update a prior belief by how well each hypothesis predicts the data, then renormalise." >}}
$$ \underbrace{P(\textcolor{#12a594}{H} \mid \textcolor{#f08c2e}{D})}_{\text{posterior}} = \frac{\overbrace{P(\textcolor{#f08c2e}{D} \mid \textcolor{#12a594}{H})}^{\text{likelihood}}\;\overbrace{P(\textcolor{#12a594}{H})}^{\text{prior}}}{P(\textcolor{#f08c2e}{D})} $$
- $\textcolor{#12a594}{H}$: a hypothesis; $\textcolor{#f08c2e}{D}$: the observed data
- $P(D) = \sum_H P(D \mid H)P(H)$ normalises the result
{{< /eq >}}

The theorem is simple, but its consequences routinely surprise people. Suppose a fast computational screen is used to search a large set of candidate materials, of which only 5 % are truly good. The screen flags 90 % of the good ones and, wrongly, 10 % of the bad ones. If the screen flags a candidate, what is the probability that it is good? Intuition suggests something close to 90 %. The figure shows a thousand candidates.

{{< widget name="bayes" title="Bayes' theorem with a thousand candidates" caption="Teal dots are truly good candidates; orange rings mark those flagged by the screen. The posterior probability is the fraction of ringed dots that are teal. Lower the prior and watch false positives swamp the true ones." >}}

Of 1000 candidates, 50 are good and the screen flags 45 of them. Of the 950 bad ones it flags 95. So 140 are flagged, and only 45 of them, 32 %, are good. When the thing being looked for is rare, even a fairly accurate test produces mostly false positives, because the few true positives are outnumbered by the small fraction of a huge number of negatives. The lesson applies to high-throughput screening, to medical tests and to any classifier deployed on imbalanced data: the precision of a prediction depends on the base rate, not only on the accuracy of the test.

The same calculation is faster in **odds**, the ratio of the probabilities for and against. Bayes' theorem in odds form says that posterior odds equal prior odds times the **likelihood ratio** $P(D \mid H)/P(D \mid \text{not } H)$. Here the prior odds are 50 : 950, or 1 : 19, and a flag is $0.9/0.1 = 9$ times more likely for a good candidate than for a bad one, so the posterior odds are 9 : 19 and the probability is $9/28 = 32$ %. A second, independent screen with the same performance multiplies the odds by 9 again, to 81 : 19, or 81 %.

{{< note type="try" title="Pause and predict" >}}
The screen can be improved in one of two ways: raise its sensitivity from 90 % to 99 %, or cut its false-positive rate from 10 % to 1 %. Which helps more at a 5 % base rate?

Raising the sensitivity changes the likelihood ratio from 9 to 9.9 and the precision from 32 % to 34 %. Cutting false positives changes it from 9 to 90 and the precision to 83 %. When good candidates are rare, the false-positive rate controls the precision, as the figure shows across all base rates.
{{< /note >}}

{{< fig src="base-rate.svg" alt="Precision of a screen plotted against the base rate of good candidates on a logarithmic axis for three screens, with the values at a 5 percent base rate marked" caption="The fraction of flagged candidates that are truly good, as the base rate changes. At 5 % the original screen gives 32 % and the more sensitive one 34 %; cutting false positives tenfold gives 83 %. Below a base rate of about 1 % even the better screen flags mostly duds." >}}

Bayes' theorem is also the foundation of a whole approach to inference. To fit a model to data, one treats the model's parameters as the hypothesis, specifies a prior, and computes the posterior distribution of the parameters given the data. The posterior says not only which parameters fit best but how uncertain they are. Gaussian processes, Bayesian optimisation and Bayesian neural networks are all applications of this idea.

## Estimating averages from data

Every simulation ends with the same task: estimate an average from a finite number of samples and say how uncertain the estimate is. The sample mean $\bar x = \frac1n\sum x_i$ estimates $\mu$, and the sample variance $s^2 = \frac{1}{n - 1}\sum (x_i - \bar x)^2$ estimates $\sigma^2$ (the $n - 1$ corrects for having used the data to locate the mean). If the samples are independent, the standard error of $\bar x$ is $s/\sqrt n$.

Simulation data, however, are almost never independent. Consecutive frames of a molecular dynamics trajectory are separated by a few femtoseconds and are nearly identical; consecutive configurations in a Markov chain Monte Carlo run differ by a single move. Treating them as independent grossly underestimates the error. The correct statement replaces $n$ by an **effective number of independent samples**, $n_{\text{eff}} = n/(2\tau)$, where $\tau$ is the integrated autocorrelation time in units of the sampling interval: roughly the number of steps it takes for the system to forget its past. A practical way of measuring the true error without computing $\tau$ explicitly is **block averaging**: divide the trajectory into blocks, average within each block, and treat the block averages as independent samples. As the blocks are made longer than the correlation time, the estimated error rises and then levels off at the correct value. [The chapter on trajectory analysis](../trajectory-analysis/) develops this in detail.

The figure applies the method to a synthetic series with known statistics, $x_t = \phi\,x_{t-1} + \sqrt{1 - \phi^2}\,\varepsilon_t$ with $\phi = 0.95$ and unit variance, a standard model for a slowly decorrelating observable. Its autocorrelation function is $\phi^k$, so $\tau = \tfrac12 + \sum_{k \ge 1}\phi^k = (1 + \phi)/[2(1 - \phi)] = 19.5$ steps. A run of $n = 65\,536$ steps therefore holds about $65\,536/39 \approx 1700$ independent samples, and the exact standard error of the mean is $\sqrt{39/65\,536} = 0.024$. The naive formula $s/\sqrt n$ gives 0.0040, six times too small. Block lengths of 256 to 2048 steps give estimates between 0.022 and 0.026, scattered by the small number of blocks: with $M$ blocks the error estimate itself has a relative uncertainty of about $1/\sqrt{2(M - 1)}$, 18 % for 16 blocks.

{{< fig src="blocks.svg" alt="Left: a correlated time series with alternating shaded blocks of 128 steps and each block's mean drawn as a bar. Right: the block-averaged error estimate rising with block length to a plateau at the exact value" caption="Left: neighbouring block means of a correlated series ($\tau = 19.5$ steps) still differ far less than single steps do. Right: the error estimate, as a fraction of the exact value, rises from 0.17 for single steps to a plateau near 1 once the blocks are much longer than $2\tau$." >}}

{{< note type="warn" title="Myth" >}}
"Saving frames more often gives smaller error bars." Once the interval between saved frames is shorter than the correlation time, extra frames are near-copies of their neighbours and add almost no information. A 100 ns MD run of a protein whose observable decorrelates in 1 ns contains about 50 independent samples whether it is saved every 1 ps or every 100 ps; the naive error bar shrinks by a factor of 10 between the two, the true error not at all. To reduce the error, run longer or run independent replicas.
{{< /note >}}

Finally, the link between probability and fitting. If measurements scatter around a model's predictions with independent Gaussian errors of equal width, the probability of the data given the parameters, the **likelihood**, is a product of Gaussians. Maximising it is the same as minimising the sum of squared residuals. **Least squares** is therefore maximum-likelihood estimation under Gaussian noise, and the loss functions of machine learning can be read as negative log-likelihoods, an idea developed in [learning from data](../learning-from-data/).

{{< note type="key" >}}
- Probability is a long-run frequency or a degree of belief; both obey the sum rule and the product rule. Independent probabilities multiply.
- A distribution is described by its mean and variance; means add linearly, and variances of independent variables add, so the average of $n$ samples has standard deviation $\sigma/\sqrt n$.
- The central limit theorem makes sums and averages of many independent variables normally distributed, which is why Gaussians are everywhere and why error bars shrink as $1/\sqrt n$.
- Bayes' theorem updates a prior with a likelihood; with rare targets, most positives from an imperfect test are false.
- Correlated simulation data contain fewer independent samples than frames; block averaging gives honest error bars.
{{< /note >}}

{{< quiz >}}
- q: "Two independent events have probabilities 0.3 and 0.5. What is the probability that both occur?"
  options: ["0.8", "0.15", "0.65"]
  answer: 1
  why: "For independent events, P(A and B) = P(A)P(B) = 0.3 × 0.5."
- q: "A measurement has standard deviation 2.0. What is the standard error of the mean of 100 independent measurements?"
  options: ["0.02", "0.2", "2.0"]
  answer: 1
  why: "σ/√n = 2.0/10 = 0.2."
- q: "Averages of n = 50 exponential waiting times are histogrammed. Their distribution is…"
  options: ["exponential", "approximately normal", "uniform"]
  answer: 1
  why: "The central limit theorem: averages of many independent variables are approximately normal whatever the original distribution."
- q: "A test for a condition affecting 1 % of samples has sensitivity 99 % and false-positive rate 1 %. A sample tests positive. The probability it has the condition is about…"
  options: ["99 %", "50 %", "1 %"]
  answer: 1
  why: "Per 10 000 samples: 100 have it and 99 test positive; 9900 do not and 99 test positive. Half of the positives are true."
- q: "A trajectory of 100 000 frames has an integrated autocorrelation time of 500 frames. Roughly how many independent samples does it contain?"
  options: ["100 000", "100", "200"]
  answer: 1
  why: "n_eff = n/(2τ) = 100 000/1000 = 100."
- q: "You average 10 000 independent samples from a Lorentzian (Cauchy) line shape. How does the spread of the average compare with that of a single sample?"
  options: ["100 times narrower", "10 times narrower", "The same"]
  answer: 2
  why: "The Cauchy distribution has no finite variance, so the central limit theorem does not apply; the mean of n Cauchy samples has the same distribution as one sample."
- q: "Events occur at a rate of 4 × 10⁴ per second. What is the mean waiting time between them?"
  options: ["25 μs", "4 × 10⁴ s", "2.5 ms"]
  answer: 0
  why: "Waiting times are exponential with mean 1/λ = 1/(4 × 10⁴ s⁻¹) = 25 μs."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. K. Blitzstein and J. Hwang, *Introduction to Probability*, 2nd ed., CRC Press (2019). Free online.
2. D. S. Sivia and J. Skilling, *Data Analysis: A Bayesian Tutorial*, 2nd ed., Oxford University Press (2006).
3. W. Feller, *An Introduction to Probability Theory and Its Applications*, vol. 1, 3rd ed., Wiley (1968).
4. F. Galton, *Natural Inheritance*, Macmillan (1889), where the quincunx (Galton board) is described.
5. H. Flyvbjerg and H. G. Petersen, "Error estimates on averages of correlated data", *Journal of Chemical Physics* **91**, 461–466 (1989). The block-averaging method.
6. A. B. Bortz, M. H. Kalos and J. L. Lebowitz, "A new algorithm for Monte Carlo simulation of Ising spin systems", *Journal of Computational Physics* **17**, 10–18 (1975).
7. D. T. Gillespie, "A general method for numerically simulating the stochastic time evolution of coupled chemical reactions", *Journal of Computational Physics* **22**, 403–434 (1976).
8. A. Grossfield, P. N. Patrone, D. R. Roe, A. J. Schultz, D. W. Siderius and D. M. Zuckerman, "Best practices for quantification of uncertainty and sampling quality in molecular simulations", *Living Journal of Computational Molecular Science* **1**, 5067 (2019).

</div>
