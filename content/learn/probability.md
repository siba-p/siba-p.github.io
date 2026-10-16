---
title: "Probability, distributions and statistical error"
description: "Probability as long-run frequency and as degree of belief; the sum and product rules; random variables, binomial, normal, Poisson and exponential distributions; expectation and variance; the central limit theorem and error bars; Bayes' theorem; and estimating averages and their uncertainty from correlated simulation data."
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

Probability has a second interpretation, as a **degree of belief** given the available information. "The probability that this candidate material is stable is 30 %" is not a statement about repeated trials, since the material either is or is not stable; it expresses uncertainty. This Bayesian interpretation obeys exactly the same mathematical rules, and it is the natural language for inference from data, for uncertainty in machine-learning predictions ([Gaussian processes](../uncertainty-gaussian-processes/)) and for deciding which experiment to do next ([active learning](../active-learning/)).

## The rules of probability

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

## Random variables and distributions

A **random variable** is a number whose value is determined by chance: the number of heads in ten tosses, the speed of a randomly chosen molecule, the error in a measurement. Its behaviour is described by its **distribution**, which says how probable each value is.

For a random variable that takes separate values, the distribution is a list of probabilities $P(k)$ that add up to 1. The most important example is the **binomial distribution**: the number of successes $k$ in $n$ independent trials, each succeeding with probability $p$, has

{{< eq title="The binomial distribution" say="The number of ways to arrange k successes among n trials, times the probability of any one such arrangement." >}}
$$ P(\textcolor{#4c6ef5}{k}) = \binom{\textcolor{#845ef7}{n}}{\textcolor{#4c6ef5}{k}}\,\textcolor{#845ef7}{p}^{\textcolor{#4c6ef5}{k}}\,(1 - \textcolor{#845ef7}{p})^{\textcolor{#845ef7}{n} - \textcolor{#4c6ef5}{k}}, \qquad \text{mean } np, \qquad \text{variance } np(1 - p) $$
{{< /eq >}}

A Galton board makes the binomial distribution physical. Balls fall through rows of pegs; at each peg a ball bounces left or right at random. The bin a ball lands in is the number of rightward bounces, a binomial random variable with $n$ equal to the number of rows. Each individual path is unpredictable, yet the bins fill into a precise shape.

{{< widget name="galton" title="A Galton board" caption="Each ball makes one left-or-right choice per row. The histogram shows the fraction of balls in each bin; the gold line is the binomial prediction and the dashed rose curve a bell curve with the same mean and spread. Change the bias p and the number of rows." >}}

As the number of rows grows, the binomial histogram approaches a smooth bell curve, even when $p \neq 1/2$ and the histogram is lopsided at first. This is a first glimpse of the central limit theorem, discussed below.

Many random variables are **continuous**: a speed or a position can take any value in a range. The probability of any one exact value is then zero, and the distribution is described by a **probability density** $p(x)$, defined so that the probability of a value between $x$ and $x + \mathrm dx$ is $p(x)\,\mathrm dx$. Probabilities become areas under the density, $P(a \le X \le b) = \int_a^b p(x)\,\mathrm dx$, and the total area is 1, as described in [the topic on integrals](../integrals/). A density can exceed 1, since it is a probability per unit of $x$; only its integral is bounded.

## Expectation and variance

Two numbers summarise most distributions. The **expectation** or mean is the probability-weighted average of the values, and the **variance** is the expected squared distance from the mean:

{{< eq title="Mean and variance" say="Where the distribution is centred, and how widely it is spread around that centre." >}}
$$ \textcolor{#d4a017}{\mu} = \langle X \rangle = \sum_k k\,P(k) \;\;\text{or}\;\; \int x\,p(x)\,\mathrm dx, \qquad \textcolor{#e64980}{\sigma}^2 = \big\langle (X - \mu)^2 \big\rangle = \langle X^2\rangle - \langle X\rangle^2 $$
- $\textcolor{#e64980}{\sigma}$: the **standard deviation**, in the same units as $X$
- the angle brackets $\langle\cdot\rangle$ are the physicist's notation for an average over the distribution
{{< /eq >}}

The mean is **linear**: $\langle aX + bY\rangle = a\langle X\rangle + b\langle Y\rangle$ for any random variables, independent or not. The variance is not linear, but for **independent** variables the variances add: $\mathrm{Var}(X + Y) = \mathrm{Var}(X) + \mathrm{Var}(Y)$. This one rule explains the $1/\sqrt n$ law. The sum of $n$ independent copies of a variable with variance $\sigma^2$ has variance $n\sigma^2$, so their average, which is the sum divided by $n$, has variance $n\sigma^2/n^2 = \sigma^2/n$ and standard deviation $\sigma/\sqrt n$. Check this against the Galton board: the observed spread of the bins converges to $\sqrt{np(1-p)}$, the square root of the summed variances of $n$ independent bounces.

In statistical mechanics, means are the observable quantities and variances carry physics too. The average energy of a system in contact with a heat bath is its internal energy, and the variance of the energy is proportional to its heat capacity, $\langle E^2\rangle - \langle E\rangle^2 = k_BT^2 C_V$. Fluctuations measured in a simulation are therefore a route to thermodynamic response functions, explored in [the topic on fluctuations](../boltzmann-and-maxwell/).

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

## Other distributions in science

A few other distributions appear so often that they are worth recognising.

The **Poisson distribution**, $P(k) = \lambda^k e^{-\lambda}/k!$, describes the number of independent random events in a fixed interval when they occur at an average rate $\lambda$ per interval: radioactive decays per minute, photons arriving at a detector, defects in a length of wire. Its mean and variance are both $\lambda$, so the relative uncertainty of a count is $1/\sqrt\lambda$. A detector that registers 10 000 counts has a statistical uncertainty of 1 %.

The **exponential distribution**, $p(t) = \lambda e^{-\lambda t}$ for $t \ge 0$, describes the waiting time until the next such event. It is memoryless: having waited a long time does not make the event more imminent. Kinetic Monte Carlo simulations draw the waiting time between rare events from this distribution.

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

Bayes' theorem is also the foundation of a whole approach to inference. To fit a model to data, one treats the model's parameters as the hypothesis, specifies a prior, and computes the posterior distribution of the parameters given the data. The posterior says not only which parameters fit best but how uncertain they are. Gaussian processes, Bayesian optimisation and Bayesian neural networks are all applications of this idea.

## Estimating averages from data

Every simulation ends with the same task: estimate an average from a finite number of samples and say how uncertain the estimate is. The sample mean $\bar x = \frac1n\sum x_i$ estimates $\mu$, and the sample variance $s^2 = \frac{1}{n - 1}\sum (x_i - \bar x)^2$ estimates $\sigma^2$ (the $n - 1$ corrects for having used the data to locate the mean). If the samples are independent, the standard error of $\bar x$ is $s/\sqrt n$.

Simulation data, however, are almost never independent. Consecutive frames of a molecular dynamics trajectory are separated by a few femtoseconds and are nearly identical; consecutive configurations in a Markov chain Monte Carlo run differ by a single move. Treating them as independent grossly underestimates the error. The correct statement replaces $n$ by an **effective number of independent samples**, $n_{\text{eff}} = n/(2\tau)$, where $\tau$ is the integrated autocorrelation time in units of the sampling interval: roughly the number of steps it takes for the system to forget its past. A practical way of measuring the true error without computing $\tau$ explicitly is **block averaging**: divide the trajectory into blocks, average within each block, and treat the block averages as independent samples. As the blocks are made longer than the correlation time, the estimated error rises and then levels off at the correct value. [The topic on trajectory analysis](../trajectory-analysis/) develops this in detail.

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
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. K. Blitzstein and J. Hwang, *Introduction to Probability*, 2nd ed., CRC Press (2019). Free online.
2. D. S. Sivia and J. Skilling, *Data Analysis: A Bayesian Tutorial*, 2nd ed., Oxford University Press (2006).
3. W. Feller, *An Introduction to Probability Theory and Its Applications*, vol. 1, 3rd ed., Wiley (1968).
4. F. Galton, *Natural Inheritance*, Macmillan (1889), where the quincunx (Galton board) is described.
5. H. Flyvbjerg and H. G. Petersen, "Error estimates on averages of correlated data", *Journal of Chemical Physics* **91**, 461–466 (1989). The block-averaging method.
6. A. Grossfield, P. N. Patrone, D. R. Roe, A. J. Schultz, D. W. Siderius and D. M. Zuckerman, "Best practices for quantification of uncertainty and sampling quality in molecular simulations", *Living Journal of Computational Molecular Science* **1**, 5067 (2019).

</div>
