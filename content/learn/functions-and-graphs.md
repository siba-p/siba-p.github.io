---
title: "Functions and their graphs"
description: "What a function is, how a graph encodes one, and the families of functions that appear throughout physical science: linear, power, exponential, logarithmic, periodic and Gaussian. Includes logarithmic axes and how to read a law of nature from data."
hook: "Plot each planet's orbital period against the size of its orbit and you get an unremarkable curve. Put both axes on a logarithmic scale and the eight points fall on a straight line of slope 1.5: Kepler's third law."
objectives:
  - "Read intercepts, roots, extrema and asymptotes from a function's graph"
  - "Predict how shifting and stretching a formula moves and reshapes its graph"
  - "Compute half-lives and doubling times from an exponential rate constant"
  - "Extract a power-law exponent or rate constant by straightening data on logarithmic axes"
  - "Interpret the amplitude, period, centre and width parameters of sinusoids and Gaussians"
cover: "cover.svg"
milestones:
  - year: 1614
    text: "John Napier publishes the first table of logarithms"
  - year: 1637
    text: "René Descartes publishes La Géométrie, describing curves by algebraic equations"
  - year: 1748
    text: "Leonhard Euler's Introductio in analysin infinitorum builds analysis around functions"
  - year: 1822
    text: "Joseph Fourier's theory of heat writes functions as sums of sines"
track: calc
weight: 1
level: Foundation
lab: "Feed numbers through a function, reshape function families, and straighten data with log axes"
---

## Functions

Science is largely the study of how one quantity depends on another. The pressure of a gas depends on its temperature, the energy of two atoms depends on the distance between them, the number of undecayed nuclei in a sample depends on how long you have waited. The mathematical object that captures "depends on" is the **function**.

A function is a rule that takes an input and produces exactly one output. If the rule is called $f$ and the input is $x$, the output is written $f(x)$, read "f of x". The insistence on *exactly one* output is the whole point: if you know the input, the output is determined. The rule "square the number" is a function, because every number has one square. The rule "give me a number whose square is $x$" is not, because 4 has two square roots, $2$ and $-2$, and the rule does not say which to choose.

It helps to picture a function as a machine. A number goes in on one side, the machine does something to it, and a number comes out of the other side. The machine does not remember previous inputs and does not behave differently on different days. The figure below lets you feed numbers into such a machine. Each time a number comes out, the pair (input, output) is recorded as a point on a graph, and if you feed many inputs the points join up into a curve. That curve is the **graph** of the function, and it is nothing more than the record of every input–output pair.

{{< widget name="fnmachine" title="A function as a machine, and its graph as a record of what it did" caption="Choose a rule, move the input slider and feed values through the machine. Each output is plotted against its input. Feeding 40 inputs traces out the graph." >}}

Some vocabulary makes it possible to talk about functions precisely. The set of inputs a function accepts is its **domain**. The square root of a negative number is not a real number, so the domain of $\sqrt{x}$ is $x \ge 0$; the function $1/x$ accepts every number except zero. The set of outputs a function can produce is its **range**: $x^2$ never produces a negative number, so its range is $y \ge 0$. The input is often called the **independent variable** and the output the **dependent variable**, because the output depends on the input and not the other way round.

Functions can be described in four equivalent ways, and moving between them is a skill worth practising. A **formula** such as $f(x) = 1.8x + 32$ gives the rule symbolically. A **table** lists selected input–output pairs, which is how experimental data usually arrive. A **graph** shows every pair at once as a curve. And a **description in words** says what the rule does: "convert a temperature from degrees Celsius to degrees Fahrenheit". Each form is good for something different. The formula is good for calculation, the table for recording measurements, the graph for seeing behaviour at a glance, and the words for remembering what the function means.

Functions in science carry **units**. In $T_F = 1.8\,T_C + 32$ the input is in °C and the output in °F, so the number 1.8 has units of °F per °C and the 32 is in °F. Keeping track of units is the single most effective way to catch mistakes in a formula: if two terms that are added together have different units, the formula is wrong.

## Reading a graph

A graph is drawn on two perpendicular axes. The horizontal axis carries the input, conventionally $x$, and the vertical axis the output, $y = f(x)$. The point where the axes cross is the **origin**, $(0, 0)$. Every point on the curve has coordinates $(x, f(x))$.

Several features of a function can be read directly from its graph. Where the curve crosses the vertical axis, the input is zero, so that height is $f(0)$, the **intercept**. Where the curve crosses the horizontal axis the output is zero; these inputs are the **roots** or **zeros** of the function and solving the equation $f(x) = 0$ means finding them. Where the curve rises from left to right the function is **increasing**, and where it falls it is **decreasing**. The highest and lowest points of a hump or a dip are **maxima** and **minima**, and they matter enormously in science: a stable arrangement of atoms is a minimum of the energy, and the barrier a chemical reaction must cross is a maximum along the reaction path. A curve may also approach a straight line without ever reaching it, as $1/x$ approaches the horizontal axis when $x$ becomes large; such a line is an **asymptote**.

{{< fig src="anatomy.svg" alt="Graph of f(x) = (x squared minus 1) times e to the minus x, with its intercept, two roots, a local minimum, a local maximum and a horizontal asymptote labelled" caption="Every feature named above on one curve. The roots are at $x = \pm 1$, the intercept is $f(0) = -1$, the stationary points satisfy $x^2 - 2x - 1 = 0$, so they sit at $x = 1 \pm \sqrt 2$, and the exponential factor drags the curve onto the asymptote $y = 0$ from above." >}}

The function in the figure, $f(x) = (x^2 - 1)\,e^{-x}$, shows how each feature comes from a different part of the formula. The roots belong to the polynomial factor, because $e^{-x}$ is never zero. The intercept is a single evaluation, $f(0) = (0 - 1) \times 1$. The asymptote is a contest between the two factors: for large $x$ the polynomial grows like $x^2$ but the exponential shrinks faster, so the product goes to zero (the section on growth rates below makes this precise). Locating the extrema exactly needs the derivative of [the next chapter](../derivatives/). Reading a formula factor by factor before plotting it is also the quickest way to catch a sign error in a potential or a misplaced bracket in an analysis script.

Graphs can be transformed in predictable ways, and recognising these transformations makes new functions look familiar. Replacing $f(x)$ by $f(x) + c$ moves the whole graph up by $c$. Replacing $f(x)$ by $f(x - h)$ moves it to the right by $h$, which surprises many people at first: the output that used to occur at $x = 0$ now occurs at $x = h$. Multiplying the output, $a\,f(x)$, stretches the graph vertically by the factor $a$, and a negative $a$ also flips it upside down. Multiplying the input, $f(kx)$, squeezes the graph horizontally by the factor $k$. A Gaussian peak centred at $\mu$ with width $\sigma$, for example, is just the standard bell curve shifted by $\mu$ and stretched by $\sigma$.

## Linear functions

The simplest non-trivial function is the straight line,

{{< eq title="A linear function" say="Every step of one unit in x changes y by the same amount, m." >}}
$$ \textcolor{#f08c2e}{y} = \textcolor{#845ef7}{m}\,\textcolor{#4c6ef5}{x} + \textcolor{#845ef7}{c} $$
- $\textcolor{#4c6ef5}{x}$: the input
- $\textcolor{#845ef7}{m}$: the slope, the change in $y$ for each unit increase in $x$
- $\textcolor{#845ef7}{c}$: the intercept, the value of $y$ at $x = 0$
{{< /eq >}}

The slope is the defining property of a straight line: between any two points $(x_1, y_1)$ and $(x_2, y_2)$ on it, the ratio $(y_2 - y_1)/(x_2 - x_1)$ is the same number $m$. "Rise over run" is the usual mnemonic. A positive slope means $y$ grows with $x$, a negative slope means it shrinks, and a zero slope gives a horizontal line. The slope has units, output units per input unit, and it often has a physical meaning of its own: in a graph of position against time the slope is a velocity, in a graph of charge against voltage it is a capacitance.

When $c = 0$ the line passes through the origin and $y$ is **proportional** to $x$, written $y \propto x$: doubling $x$ doubles $y$. Many laws of physics take this form near equilibrium. Hooke's law says the restoring force of a spring is proportional to its extension, $F = -kx$. Ohm's law says the current through a resistor is proportional to the voltage across it. Linear behaviour is so common because almost any smooth function looks like a straight line if you only look at a small enough piece of it, an idea that becomes the derivative in [the next chapter](../derivatives/).

Linear functions are also the workhorse of data analysis. Plotting data so that a law appears as a straight line, and then measuring the slope and intercept, is one of the oldest and most reliable ways of extracting physical constants from experiment. The next sections show how to do this even when the underlying law is not linear at all.

## Powers and polynomials

A **power function** has the form $y = a x^n$. For whole-number powers this is familiar: $x^2$ is a parabola, symmetric about the vertical axis, and $x^3$ rises steeply on the right and falls steeply on the left. Negative powers describe quantities that fall off with distance. The electrostatic energy of two charges varies as $1/r$, the gravitational force as $1/r^2$, and the repulsion between two atoms when their electron clouds overlap rises roughly as $1/r^{12}$ in the Lennard-Jones model. Fractional powers also appear: $x^{1/2} = \sqrt x$ describes, for instance, how far a diffusing molecule typically travels in time $x$.

Power functions have a scaling property that makes them special. If $y = a x^n$ and you multiply $x$ by a factor $\lambda$, then $y$ is multiplied by $\lambda^n$, whatever the starting value of $x$. Doubling the distance between two charges halves their energy, everywhere. This is why power laws describe phenomena that have no built-in length or time scale.

A sum of whole-number powers, $p(x) = a_0 + a_1 x + a_2 x^2 + \dots + a_N x^N$, is a **polynomial** of degree $N$. Polynomials are easy to evaluate, differentiate and integrate, and a polynomial of degree $N$ has at most $N$ real roots and at most $N - 1$ turning points. They are the raw material of approximation: [Taylor series](../derivatives/) build complicated functions from polynomials, and the harmonic approximation of a chemical bond replaces its true energy curve by a parabola near the minimum.

{{< widget name="fnfamily" title="Families of functions and what their parameters do" caption="Choose a family and move its parameters. The dashed curve is the family's plain member for comparison. The readouts name the feature each parameter controls: a slope, a half-life, a period, a width." opts=`{"family":"power"}` >}}

## Exponential functions

Suppose a quantity changes at a rate proportional to how much of it there is. A population of bacteria with plenty of food grows at a rate proportional to the number of bacteria; a sample of radioactive nuclei decays at a rate proportional to the number of nuclei left; the light passing through an absorbing liquid loses intensity at a rate proportional to the intensity. All of these are described by the **exponential function**:

{{< eq title="Exponential growth and decay" say="Equal steps in x multiply y by equal factors." >}}
$$ \textcolor{#f08c2e}{y} = \textcolor{#845ef7}{A}\,e^{\textcolor{#845ef7}{k}\textcolor{#4c6ef5}{x}} $$
- $\textcolor{#845ef7}{A}$: the value at $x = 0$
- $\textcolor{#845ef7}{k}$: the rate constant; $k > 0$ is growth and $k < 0$ is decay
- $e = 2.71828\ldots$: Euler's number, the base for which the rate of change of $e^x$ equals $e^x$ itself
{{< /eq >}}

The defining feature of an exponential is that adding a fixed amount to the input multiplies the output by a fixed factor. For a straight line, each step of one unit in $x$ *adds* $m$ to $y$; for an exponential, each step *multiplies* $y$ by $e^k$. As a result, an exponential always has a fixed **doubling time** (for growth) or **half-life** (for decay), equal to $\ln 2/|k|$. Carbon-14 has a half-life of about 5730 years: after 5730 years half of the original nuclei remain, after 11 460 years a quarter, after 17 190 years an eighth, and so on, regardless of how much you started with. The golden dots in the figure above mark these successive halvings when you select the exponential family.

Why the strange base $e$? Any base could be used, since $2^x$, $10^x$ and $e^x$ are all exponentials and each can be converted into the others. The number $e$ is chosen because it makes the mathematics of change simplest: the slope of $e^x$ at any point equals its height. This is proved in [the chapter on derivatives](../derivatives/), and it is why nature's exponentials, which arise from rates proportional to amounts, appear with base $e$.

Exponentials are the most important functions in statistical mechanics. The probability that a molecule has energy $E$ at temperature $T$ is proportional to the **Boltzmann factor** $e^{-E/k_BT}$, and the rate of a chemical reaction with activation energy $E_a$ follows the **Arrhenius law** $k = A\,e^{-E_a/k_BT}$. Both are decaying exponentials of energy: each additional $k_BT$ of energy makes a state $e \approx 2.7$ times less likely. These ideas are developed in [the Boltzmann distribution](../boltzmann-and-maxwell/).

## Logarithms

The **logarithm** undoes the exponential. If $y = e^x$, then $x = \ln y$, the natural logarithm of $y$. More generally, $\log_b y$ is the power to which the base $b$ must be raised to give $y$, so $\log_{10} 1000 = 3$ because $10^3 = 1000$. Since exponentials only produce positive numbers, logarithms are only defined for positive inputs.

Three rules follow directly from the rules for powers, and they are used constantly:

{{< eq title="The laws of logarithms" say="Logarithms turn multiplication into addition, and powers into multiplication." >}}
$$ \ln(\textcolor{#4c6ef5}{a}\textcolor{#f08c2e}{b}) = \ln \textcolor{#4c6ef5}{a} + \ln \textcolor{#f08c2e}{b}, \qquad \ln\frac{\textcolor{#4c6ef5}{a}}{\textcolor{#f08c2e}{b}} = \ln \textcolor{#4c6ef5}{a} - \ln \textcolor{#f08c2e}{b}, \qquad \ln \textcolor{#4c6ef5}{a}^{\textcolor{#845ef7}{n}} = \textcolor{#845ef7}{n} \ln \textcolor{#4c6ef5}{a} $$
- change of base: $\log_{10} x = \ln x / \ln 10 \approx 0.4343\,\ln x$
{{< /eq >}}

Before electronic calculators, these rules made logarithms the standard tool for multiplying large numbers: look up two logarithms, add them, and look up the number whose logarithm is the sum. Today their importance is different. Logarithms compress enormous ranges into manageable ones. The acidity of a solution spans more than fourteen orders of magnitude in hydrogen-ion concentration, and the pH scale, $\mathrm{pH} = -\log_{10}[\mathrm{H}^+]$, turns this into numbers between about 0 and 14. Sound intensity in decibels and earthquake magnitudes are logarithmic for the same reason. In statistical mechanics, the entropy $S = k_B \ln \Omega$ is the logarithm of a count of microstates that is itself astronomically large, and the free energy $F = -k_BT \ln Z$ is the logarithm of a sum of Boltzmann factors.

A logarithm grows without limit, but extraordinarily slowly: $\ln x$ reaches 10 only when $x$ exceeds 22 000, and 100 only when $x$ exceeds $10^{43}$. Each multiplication of $x$ by $e$ adds exactly one to $\ln x$, which is the logarithmic version of the exponential's constant doubling time.

### Which grows fastest

Logarithms, powers and exponentials form a strict hierarchy for large inputs: any positive power of $x$ eventually beats $\ln x$, and $e^x$ eventually beats any power of $x$. "Eventually" can take a while, which is why the hierarchy surprises people.

{{< note type="try" title="Pause and predict" >}}
Which is larger at $x = 10$: $x^5$ or $e^x$? And at $x = 20$? Decide before reading on.

At $x = 10$, $x^5 = 100\,000$ while $e^{10} \approx 22\,026$, so the power is ahead by a factor of 4.5. At $x = 20$, $x^5 = 3.2 \times 10^6$ while $e^{20} \approx 4.9 \times 10^8$, so the exponential is ahead by a factor of 150. The two cross at $x \approx 12.7$, the solution of $x = 5 \ln x$.
{{< /note >}}

{{< fig src="race.svg" alt="Six curves on a logarithmic vertical axis for x from 1.5 to 25: ln x, square root of x, x, x squared, x to the fifth and e to the x, with e to the x crossing x to the fifth near x = 12.7" caption="On a logarithmic vertical axis an exponential is a straight line and every power law bends over, so the exponential must cross every power eventually. Here $e^x$ passes $x^5$ at $x \approx 12.7$ and is ahead by a factor of $10^4$ at $x = 25$." >}}

The logarithmic vertical axis explains the result. Taking logarithms, $\ln e^x = x$ grows linearly while $\ln x^n = n \ln x$ grows only logarithmically, so the gap $x - n\ln x$ must eventually become positive whatever $n$ is. Two consequences recur later. A power-law prefactor such as the $v^2$ in the [Maxwell distribution](../boltzmann-and-maxwell/) cannot rescue a state from its Boltzmann factor $e^{-E/k_BT}$, so every such distribution has a tail that falls to zero. And an algorithm whose cost grows like $2^N$ is unusable for large $N$ even if it beats an $N^5$ algorithm for small $N$; grid integration in many dimensions, in [the integrals chapter](../integrals/), is the case that matters for simulation.

## Logarithmic axes and laws from data

The rules of logarithms give a powerful way of discovering laws in data. Take the logarithm of both sides of a power law, $y = A x^n$:

$$
\log y = \log A + n \log x .
$$

This is a straight line, not in $y$ against $x$ but in $\log y$ against $\log x$, with slope $n$. Plotting data on **log–log axes**, where both axes are spaced logarithmically, turns every power law into a straight line, and the slope of the line reveals the power. Similarly, taking the logarithm of an exponential, $y = A e^{kx}$, gives $\ln y = \ln A + kx$, which is a straight line on **semi-logarithmic axes** with only the vertical axis logarithmic.

The figure below contains real data on the orbits of the eight planets: the size of each orbit (its semi-major axis, in units of the Earth's) and the time it takes to go round the Sun (in years). On ordinary axes the points form a curve. Switch to log–log axes and they fall on a straight line with slope 1.5. This is Kepler's third law, $T \propto a^{3/2}$, found by Kepler in 1618 and published in 1619 by exactly this kind of search for a pattern in numbers, and explained seventy years later by Newton's law of gravitation. The second data set is a simulated radioactive sample, whose counts fall on a straight line only on semi-log axes, as an exponential should. The third is the repulsive part of the Lennard-Jones potential, a pure power law with slope $-12$.

{{< widget name="loglog" title="Straight lines hiding in curved data" caption="The dashed line is a least-squares straight-line fit in the axes currently shown; it turns teal when the data really are straight (R² above 0.995). Find the axes that straighten each data set, and read the law from the slope." >}}

This technique is routine in research. The decay of a correlation function is plotted on semi-log axes to extract a relaxation time; the mean-squared displacement of a diffusing particle is plotted on log–log axes to check that it grows linearly with time; the error of a numerical method is plotted against its step size on log–log axes to measure its order of accuracy, as you will see in [the chapter on derivatives](../derivatives/).

### Worked example: an activation energy from rate data

Not every law is straightened by logarithms alone. The Arrhenius law, $k = A\,e^{-E_a/RT}$, written here per mole with the gas constant $R = 8.314$ J mol⁻¹ K⁻¹, is an exponential in $1/T$, not in $T$. Taking logarithms gives

$$
\ln k = \ln A - \frac{E_a}{R}\,\frac{1}{T},
$$

a straight line when $\ln k$ is plotted against $1/T$, with slope $-E_a/R$ and intercept $\ln A$. Svante Arrhenius proposed the law in 1889 from measurements of the acid-catalysed inversion of sucrose, and this plot, now called an **Arrhenius plot**, has been the standard way of reporting temperature-dependent rates ever since.

The figure below uses nine simulated rate constants measured every 10 K from 280 to 360 K, generated from $E_a = 53$ kJ mol⁻¹ and $A = 10^{10}$ s⁻¹ with 6 % random scatter, roughly the precision of a good kinetic experiment. Against $T$ the points curve sharply upwards. Against $1000/T$ their logarithms fall on a line, and a least-squares fit gives a slope of $-6387$ K, so $E_a = 6387\ \text{K} \times 8.314$ J mol⁻¹ K⁻¹ $= 53.1$ kJ mol⁻¹, within 0.2 % of the value used to generate the data.

{{< fig src="arrhenius.svg" alt="Two panels: left, nine rate constants rising steeply with temperature from 280 to 360 K; right, the logarithm of the same rate constants against 1000 over T, falling on a straight line" caption="The same nine points on two sets of axes. Plotting $\ln k$ against $1/T$ straightens the Arrhenius law, and the slope, $-E_a/R$, returns $E_a = 53.1$ kJ mol⁻¹ from data generated with 53 kJ mol⁻¹." >}}

{{< note type="practice" title="Back of the envelope" >}}
A chemist's rule of thumb says that a reaction near room temperature runs about twice as fast for every 10 K rise. What activation energy does that imply? Two points on the Arrhenius line give $\ln(k_2/k_1) = (E_a/R)(1/T_1 - 1/T_2)$. With $k_2/k_1 = 2$, $T_1 = 298$ K and $T_2 = 308$ K,

$$
E_a = \frac{R \ln 2}{1/298 - 1/308} = \frac{8.314 \times 0.693}{1.09 \times 10^{-4}}\ \text{J mol}^{-1} \approx 53\ \text{kJ mol}^{-1},
$$

or 0.55 eV per molecule. The rule of thumb is therefore a statement about one particular barrier height, and it fails for reactions with much smaller or larger barriers: a process with $E_a = 100$ kJ mol⁻¹ speeds up by a factor of 3.7 over the same 10 K.
{{< /note >}}

{{< note type="practice" title="From the lab" >}}
In computational materials science the same plot is used for transport. The diffusion coefficient of lithium in a candidate solid electrolyte is computed from molecular dynamics at several temperatures, typically 600 to 1200 K because diffusion at room temperature is too slow to observe in nanoseconds, and $\ln D$ is plotted against $1/T$ to obtain the migration barrier. The room-temperature value is then an extrapolation along the line. With a barrier of 0.3 eV, going from 1000 K to 300 K lowers $D$ by a factor of $e^{(0.3\ \text{eV}/k_B)(1/300 - 1/1000)\,\text{K}^{-1}} \approx 3400$, so a small error in the slope becomes a large error in the prediction. The usual check is that the points lie on one straight line: a kink signals a change of mechanism or a phase transition, and extrapolating across it is not valid.
{{< /note >}}

{{< note type="warn" title="Myth" >}}
**Myth:** data that look straight on log–log axes follow a power law.
**Reality:** logarithmic axes compress curvature, and almost any smooth, monotonic data spanning less than one or two decades look roughly straight. Clauset, Shalizi and Newman (2009) re-examined two dozen data sets reported to follow power laws and found that for several of them a log-normal or a power law with an exponential cut-off fitted as well or better. Before trusting an exponent, check that the data span two or three decades, that the fit residuals show no systematic curvature, and that the slope is stable when the fit window moves. The mean-squared displacement of a diffusing atom is the routine example: at short times it grows as $t^2$ (ballistic motion) and only later as $t^1$, so a fit across the crossover gives an exponent between 1 and 2 that describes neither regime.
{{< /note >}}

## Periodic functions

Many phenomena repeat: vibrations of atoms, alternating currents, the seasons, waves of light. The basic repeating functions are the **sine** and **cosine**. Imagine a point moving anticlockwise at a steady rate around a circle of radius 1 centred on the origin. If the angle it has turned through, measured from the positive horizontal axis, is $\theta$, then its height is $\sin\theta$ and its horizontal position is $\cos\theta$. As the point goes round and round, its height rises and falls forever, repeating every full turn of $2\pi$ radians (360°).

{{< fig src="unitcircle.svg" alt="Left: a unit circle with a point at an angle of one radian, its height drawn as an orange vertical segment and its horizontal position as a blue segment. Right: the sine curve from 0 to 2 pi, with the same height marked at theta equals 1" caption="The height of a point on a circle of radius 1 is $\sin\theta$. At $\theta = 1$ radian the teal arc is exactly as long as the radius and the height is $\sin 1 = 0.84$; carrying that height across for every angle traces the sine curve, which repeats after one full turn, $2\pi$." >}}

A general oscillation has an amplitude, a frequency and a phase:

{{< eq title="A sinusoidal oscillation" say="A height that swings between −A and A, completing ω/2π cycles per unit of x." >}}
$$ \textcolor{#f08c2e}{y} = \textcolor{#845ef7}{A}\sin(\textcolor{#845ef7}{\omega}\,\textcolor{#4c6ef5}{x} + \textcolor{#845ef7}{\varphi}) $$
- $\textcolor{#845ef7}{A}$: the amplitude, the largest displacement from zero
- $\textcolor{#845ef7}{\omega}$: the angular frequency; the period is $T = 2\pi/\omega$ and the frequency $\nu = \omega/2\pi$
- $\textcolor{#845ef7}{\varphi}$: the phase, which shifts the wave sideways
{{< /eq >}}

Angles in science are measured in **radians**, defined so that an angle of $\theta$ radians cuts off an arc of length $\theta$ on a circle of radius 1. A full turn is $2\pi$ radians. Radians are not an arbitrary convention: as with the base $e$ for exponentials, they are the unit for which the derivative of $\sin\theta$ is exactly $\cos\theta$, with no awkward conversion factor.

Sinusoids describe any system that is pulled back towards equilibrium with a force proportional to its displacement, such as a mass on a spring or an atom vibrating in a molecule, as [the chapter on motion](../motion-and-phase-space/) shows. A theorem of Fourier says that essentially any periodic signal, however jagged, can be written as a sum of sines and cosines of different frequencies, which is why vibrational spectra, X-ray diffraction and much of signal processing are analysed in terms of sinusoids.

## The Gaussian

The last family in this chapter is the bell-shaped **Gaussian**,

{{< eq title="The Gaussian function" say="A peak at μ whose width is set by σ, falling off faster than any exponential." >}}
$$ \textcolor{#f08c2e}{y} = \textcolor{#845ef7}{A}\exp\!\left(-\frac{(\textcolor{#4c6ef5}{x} - \textcolor{#845ef7}{\mu})^2}{2\textcolor{#845ef7}{\sigma}^2}\right) $$
- $\textcolor{#845ef7}{\mu}$: the position of the peak
- $\textcolor{#845ef7}{\sigma}$: the width; the full width at half the maximum height is $2\sqrt{2\ln 2}\,\sigma \approx 2.355\,\sigma$
- the area under the curve is $A\sigma\sqrt{2\pi}$
{{< /eq >}}

Choose the bell curve in the families figure: the shaded band covers $\mu \pm \sigma$ and the teal bar marks the full width at half maximum. The Gaussian is an exponential of a negative square, so it falls to zero much faster than an ordinary exponential. It is the shape of the distribution of velocities of molecules in a gas, of the spread of random measurement errors, of a spectral line broadened by thermal motion, and of the smearing functions used to turn atomic positions into smooth densities in machine-learning descriptors. [The chapter on probability](../probability/) explains why it is so common: the sum of many small independent random effects always tends to a Gaussian.

## Combining functions

New functions are built from old ones in a few standard ways. They can be added, subtracted, multiplied and divided. They can also be **composed**: feeding the output of one function into another, written $(f \circ g)(x) = f(g(x))$. The Gaussian is a composition: first square the input, then multiply by $-1/2\sigma^2$, then exponentiate. The Lennard-Jones energy of two atoms, $V(r) = 4\varepsilon[(\sigma/r)^{12} - (\sigma/r)^6]$, is a difference of two power laws that together produce a potential well with a steep repulsive wall and a gentle attractive tail. Recognising how a complicated function is assembled from simple pieces is usually the key to understanding its graph.

A function that undoes another is its **inverse**, written $f^{-1}$. The logarithm is the inverse of the exponential, and the square root (on non-negative numbers) is the inverse of squaring. The graph of an inverse is the mirror image of the original graph in the diagonal line $y = x$, since inverting a function simply swaps the roles of input and output. A function only has an inverse if it never gives the same output for two different inputs.

Finally, many quantities depend on more than one input. The potential energy of a molecule depends on the positions of all its atoms, and the loss of a neural network on millions of weights. A function of two variables, $f(x, y)$, can be drawn as a surface or as a contour map, and most of the mathematics of this chapter carries over. [The chapter on gradients](../gradients/) develops these functions of many variables.

{{< note type="key" >}}
- A function assigns exactly one output to each input in its domain. A graph is the set of all input–output pairs.
- Linear functions add a constant amount per step; exponentials multiply by a constant factor per step and have fixed doubling times or half-lives; power laws scale by a fixed factor when the input is scaled.
- Logarithms invert exponentials and turn products into sums. On log–log axes power laws become straight lines with slope equal to the power; on semi-log axes exponentials become straight lines.
- The exponential eventually outgrows every power, and every power outgrows the logarithm. Choosing axes that turn a law into a line, such as $\ln k$ against $1/T$ for Arrhenius rates, reads its parameters from a slope and an intercept.
- Sinusoids describe oscillations, Gaussians describe peaks and random spreads, and complicated functions are usually compositions of these simple families.
{{< /note >}}

{{< quiz >}}
- q: "Which of these rules is not a function of x?"
  options: ["y = x³", "y is a number whose square is x", "y = the number of atoms in a sample of x moles"]
  answer: 1
  why: "For x = 4 there are two such numbers, 2 and −2, so the rule does not give exactly one output."
- q: "A sample has a half-life of 3 hours. What fraction remains after 12 hours?"
  options: ["1/4", "1/12", "1/16"]
  answer: 2
  why: "12 hours is four half-lives, so the sample is halved four times: (1/2)⁴ = 1/16."
- q: "Data plotted on log–log axes fall on a straight line of slope −2. What law do they follow?"
  options: ["y ∝ e^(−2x)", "y ∝ x^(−2)", "y = −2x + c"]
  answer: 1
  why: "log y = n log x + const is a power law y ∝ xⁿ, here with n = −2, like the inverse-square law of gravity."
- q: "The graph of f(x − 3) compared with f(x) is…"
  options: ["shifted 3 units to the left", "shifted 3 units to the right", "shifted 3 units up"]
  answer: 1
  why: "The output that f gave at x = 0 is now given at x = 3, so every feature moves 3 units to the right."
- q: "What is ln(e⁵ × e²)?"
  options: ["10", "7", "e⁷"]
  answer: 1
  why: "ln(ab) = ln a + ln b = 5 + 2 = 7."
- q: "Rate constants plotted as ln k against 1/T give a straight line of slope −6000 K. What is the activation energy? (R = 8.314 J mol⁻¹ K⁻¹)"
  options: ["About 6 kJ/mol", "About 50 kJ/mol", "About 720 kJ/mol"]
  answer: 1
  why: "The slope is −Ea/R, so Ea = 6000 K × 8.314 J mol⁻¹ K⁻¹ ≈ 49.9 kJ/mol."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. Stewart, *Calculus: Early Transcendentals*, 8th ed., Cengage Learning (2015), chapter 1 (functions and models) and chapter 6 (inverse functions, exponentials and logarithms).
2. K. F. Riley, M. P. Hobson and S. J. Bence, *Mathematical Methods for Physics and Engineering*, 3rd ed., Cambridge University Press (2006), chapter 1.
3. M. L. Boas, *Mathematical Methods in the Physical Sciences*, 3rd ed., Wiley (2006), chapters 1–2.
4. J. Kepler, *Harmonices Mundi*, Linz (1619), book V, where the third law is stated.
5. S. Arrhenius, "Über die Reaktionsgeschwindigkeit bei der Inversion von Rohrzucker durch Säuren", *Zeitschrift für physikalische Chemie* **4**, 226–248 (1889).
6. A. Clauset, C. R. Shalizi and M. E. J. Newman, "Power-law distributions in empirical data", *SIAM Review* **51**, 661–703 (2009).
7. S. Strogatz, *Infinite Powers: How Calculus Reveals the Secrets of the Universe*, Houghton Mifflin Harcourt (2019). A non-technical history of the ideas in this subject.

</div>
