---
title: "Integrals and accumulation"
description: "The integral as an accumulated total: Riemann sums, signed area, the fundamental theorem of calculus that links integrals to derivatives, standard techniques and the Gaussian integral, integrals in physics such as work and averages, numerical quadrature, and Monte Carlo integration in many dimensions."
track: calc
weight: 3
level: Foundation
prereqs: ["derivatives"]
lab: "Approximate areas with strips, watch an integral accumulate, and estimate π with random darts"
---

## Accumulation

The derivative answers the question "how fast is this changing?". The integral answers the reverse question: "if I know how fast something changes at every moment, how much has accumulated in total?". If a car travels at a constant 60 km/h for 2 hours, it covers $60 \times 2 = 120$ km. On a graph of speed against time, that product is the area of a rectangle 2 hours wide and 60 km/h tall. The units confirm it: (km/h) × h = km. Area under a rate curve is accumulated quantity.

When the speed varies, the region under the graph is no longer a rectangle, but the principle is the same. Over a short enough time interval the speed is nearly constant, so the distance covered in that interval is nearly speed × duration, the area of a thin vertical strip. Adding up the strips gives the total distance. The integral is the exact value this sum approaches as the strips become infinitely thin.

The same idea appears whenever a total is built from a varying rate or density. The mass of a rod whose density varies along its length is the integral of density over length. The charge that has flowed through a wire is the integral of the current over time. The amount of product formed in a chemical reaction is the integral of the reaction rate. The work done by a varying force is the integral of force over distance. And, as later topics show, every average and every probability in statistical mechanics is an integral.

## Riemann sums and the definite integral

To make this precise, divide the interval from $a$ to $b$ into $n$ strips of equal width $\Delta x = (b - a)/n$. In each strip pick a sample point $x_i$, for instance its left edge, and form the sum of rectangle areas:

{{< eq title="The definite integral as a limit of sums" say="Chop the region into thin strips, add up height × width, and let the strips become infinitely thin." >}}
$$ \int_{\textcolor{#4c6ef5}{a}}^{\textcolor{#4c6ef5}{b}} \textcolor{#f08c2e}{f(x)}\,\mathrm dx = \lim_{n \to \infty} \sum_{i=1}^{n} \textcolor{#f08c2e}{f(x_i)}\,\Delta x $$
- the elongated S, $\int$, is a stretched "sum", introduced by Leibniz
- $\mathrm dx$ recalls the strip width $\Delta x$ in the limit; $a$ and $b$ are the limits of integration
- the result is a number, the **definite integral**, with units of $f$ times units of $x$
{{< /eq >}}

The figure below draws the sum. With a handful of strips the rectangles overshoot in some places and undershoot in others, and the total is visibly wrong. Press "Double n" a few times and the staircase hugs the curve ever more closely while the error shrinks. For any continuous function the sum converges to the same limit whichever sample points are used, which is why the integral is well defined. The choice still matters for a finite number of strips, as comparing the left-edge, right-edge, midpoint and trapezoid rules shows.

{{< widget name="riemann" title="Area as a sum of thin strips" caption="Gold strips add positive area, rose strips (where the function is negative) subtract. The exact area is computed separately to high precision. Compare how quickly the error falls as n doubles for each rule." >}}

Notice that where the function is negative, the strips hang below the axis and contribute negative amounts. The definite integral is a **signed area**: area above the axis counts positively and area below counts negatively. For $\sin x$ over a full period from $0$ to $2\pi$ the positive and negative lobes cancel exactly and the integral is zero. Physically this is the right behaviour. If a velocity is negative, the object is moving backwards and the distance it covers should be subtracted from its net displacement.

## The fundamental theorem of calculus

Computing integrals as limits of sums is laborious. The great discovery of Newton and Leibniz in the 1660s and 1670s was that integration is the reverse of differentiation, which turns many integrals into a lookup in a table of derivatives.

Fix the lower limit $a$ and let the upper limit vary. The accumulated area up to $x$ is then a function of $x$,

$$
A(x) = \int_a^x f(t)\,\mathrm dt .
$$

How fast does $A$ grow as $x$ increases? Moving the upper limit from $x$ to $x + h$ adds a thin strip of width $h$ and height approximately $f(x)$, so $A(x + h) - A(x) \approx f(x)\,h$. Dividing by $h$ and letting $h \to 0$ gives the theorem:

{{< eq title="The fundamental theorem of calculus" say="The rate at which area accumulates is the height of the curve at the moving edge." >}}
$$ \frac{\mathrm d}{\mathrm dx}\int_a^x \textcolor{#f08c2e}{f(t)}\,\mathrm dt = \textcolor{#f08c2e}{f(x)}, \qquad \int_a^b \textcolor{#f08c2e}{f(x)}\,\mathrm dx = \textcolor{#d4a017}{F(b)} - \textcolor{#d4a017}{F(a)} \;\;\text{whenever}\;\; \textcolor{#d4a017}{F}' = \textcolor{#f08c2e}{f} $$
- $\textcolor{#d4a017}{F}$: an **antiderivative** of $f$, any function whose derivative is $f$
- antiderivatives are only defined up to an added constant, which cancels in $F(b) - F(a)$
{{< /eq >}}

The figure below makes the theorem visible. The upper panel shades the area under a rate curve up to a moving point $x$. The lower panel plots that accumulated area $A(x)$ as a function of $x$. Drag the point and compare the teal tangent to the lower curve with the height of the upper curve: they are always equal. Where the rate is large, $A$ climbs steeply; where the rate is zero, $A$ is momentarily flat; where the rate is negative, $A$ goes down.

{{< widget name="accum" title="An integral accumulating, and its slope" caption="Top: the rate f with the area accumulated from the left edge up to x (gold above the axis, rose below). Bottom: the accumulated total A(x); the teal line is its tangent. The readouts confirm that the slope of A at x equals f(x)." >}}

With the theorem, integrals become calculations. To find $\int_0^3 x^2\,\mathrm dx$, look for a function whose derivative is $x^2$: the power rule run backwards gives $F(x) = x^3/3$. The integral is $F(3) - F(0) = 9$. Every row of the table of derivatives, read from right to left, is an integral:

| integrand $f(x)$ | antiderivative $F(x)$ |
|---|---|
| $x^n$ ($n \ne -1$) | $x^{n+1}/(n + 1)$ |
| $1/x$ | $\ln \lvert x\rvert$ |
| $e^{kx}$ | $e^{kx}/k$ |
| $\sin x$ | $-\cos x$ |
| $\cos x$ | $\sin x$ |

## Techniques and the Gaussian integral

Two techniques extend the table a long way. **Substitution** is the chain rule in reverse: if the integrand has the form $f(g(x))\,g'(x)$, then it is the derivative of $F(g(x))$, so $\int f(g(x)) g'(x)\,\mathrm dx = F(g(x))$. For example, $\int x\,e^{-x^2/2}\,\mathrm dx = -e^{-x^2/2}$, because the factor $x$ is (up to sign) the derivative of the exponent. **Integration by parts** is the product rule in reverse: $\int u\,v'\,\mathrm dx = uv - \int u'\,v\,\mathrm dx$. It moves a derivative from one factor to the other and is used, among many other places, to derive the virial expression for pressure in molecular simulation.

Not every integral has an antiderivative that can be written with elementary functions. The most important example in all of science is the **Gaussian integral**. The function $e^{-x^2}$ has no elementary antiderivative, yet its integral over the whole line has an exact value, found by a beautiful trick: square the integral, write the square as a double integral over the plane, and switch to polar coordinates, where the extra factor of $r$ makes the integrand the derivative of $-\tfrac12 e^{-r^2}$.

{{< eq title="The Gaussian integral" say="The total area under the bell curve is √π, which is why π appears in every normal distribution." >}}
$$ \int_{-\infty}^{\infty} e^{-x^2}\,\mathrm dx = \sqrt{\pi}, \qquad \int_{-\infty}^{\infty} e^{-\textcolor{#845ef7}{a} x^2}\,\mathrm dx = \sqrt{\frac{\pi}{\textcolor{#845ef7}{a}}} $$
- proof: $\left(\int e^{-x^2}\mathrm dx\right)^2 = \iint e^{-(x^2+y^2)}\,\mathrm dx\,\mathrm dy = \int_0^{2\pi}\!\!\int_0^\infty e^{-r^2}\,r\,\mathrm dr\,\mathrm d\theta = 2\pi \cdot \tfrac12 = \pi$
{{< /eq >}}

The normalisation of the normal distribution, the partition function of an ideal gas, the momentum integrals that give the Maxwell–Boltzmann distribution and the zero-point properties of a harmonic oscillator all reduce to this one result. In the strips figure, choose $e^{-x^2}$: the area between $-3$ and $3$ is already $1.7724$, within $0.003\,\%$ of $\sqrt\pi = 1.77245$, because the tails beyond $|x| = 3$ are tiny.

## Integrals in physics

Several integrals recur so often in the physical sciences that they are worth recognising on sight.

The **work** done by a force $F(x)$ that moves an object from $a$ to $b$ is $W = \int_a^b F(x)\,\mathrm dx$. When the force comes from a potential, $F = -\mathrm dV/\mathrm dx$, the fundamental theorem gives $W = -[V(b) - V(a)]$: the work done by the force equals the drop in potential energy. This is the integral form of the statement that force is the slope of energy, and it is why energy is conserved for such forces. Choose the spring force in the accumulation figure: the accumulated work is a downward parabola, minus the familiar $\tfrac12 kx^2$.

The **average** of a function over an interval is its integral divided by the length of the interval, $\bar f = \frac{1}{b - a}\int_a^b f(x)\,\mathrm dx$: the height of the rectangle with the same area. A time average from a simulation is exactly this, with the integral replaced by a sum over saved frames.

A **probability density** $p(x)$ describes a continuous random quantity: the probability that it lies between $a$ and $b$ is $\int_a^b p(x)\,\mathrm dx$, and the total integral is 1. The average of any quantity $g(x)$ is then $\langle g \rangle = \int g(x)\,p(x)\,\mathrm dx$. [The topic on probability](../probability/) develops this, and statistical mechanics is built on it: the average energy of a system is an integral of energy weighted by the Boltzmann probability over all positions and momenta.

Integrals extend naturally to several dimensions. The volume under a surface $f(x, y)$ is the double integral $\iint f\,\mathrm dx\,\mathrm dy$, the limit of a sum of thin columns, and the mass of a three-dimensional object is the triple integral of its density over its volume. The **partition function** of $N$ classical atoms is an integral over all $3N$ position coordinates and $3N$ momentum coordinates, a $6N$-dimensional integral. Computing such integrals is the central difficulty of statistical mechanics, and it is the reason for the last section of this topic.

## Numerical integration

When an antiderivative is unavailable, or the integrand is known only as data, integrals are computed numerically by a **quadrature rule**: a weighted sum of function values. The rules in the strips figure are the simplest. Their accuracy can be read off from Taylor's theorem, just as for finite differences. With $n$ strips of width $h$, the left- and right-edge rules have errors proportional to $h$; the midpoint and trapezoid rules, which are symmetric within each strip, have errors proportional to $h^2$; and **Simpson's rule**, which fits a parabola through each pair of strips, has error proportional to $h^4$. Doubling $n$ therefore halves the error of the left-edge rule, quarters that of the trapezoid rule and divides that of Simpson's rule by sixteen. You can check the first two in the figure: compare the errors before and after pressing "Double n".

The same ideas, applied to the equations of motion, give the integrators of molecular dynamics. Advancing a trajectory by one time step means integrating the acceleration to update the velocity and integrating the velocity to update the position. The velocity Verlet algorithm used in nearly every MD code is a carefully symmetrised version of the midpoint idea, as [the topic on integrators](../molecular-dynamics/) explains.

## Monte Carlo integration

Grid-based quadrature has a fatal weakness in many dimensions. A grid with 10 points along each axis needs $10^d$ function evaluations in $d$ dimensions: 100 in two dimensions, but $10^{30}$ in thirty, far beyond any computer. Phase-space integrals over hundreds of atoms are hopeless on a grid. This exponential cost is called the **curse of dimensionality**.

The way out is to sample at random. To estimate the area of a region, enclose it in a box of known area, scatter $N$ random points uniformly in the box, and count the fraction that fall inside. That fraction times the box area estimates the region's area. The figure below estimates π this way: the quarter-circle of radius 1 has area $\pi/4$, so four times the fraction of random points inside it approaches π.

{{< widget name="mcint" title="Estimating π by throwing random darts" caption="Left: random points in the unit square, teal inside the quarter circle and rose outside. Right: the error of the estimate against the number of darts on log–log axes. The dashed line is the 1/√N law predicted by the central limit theorem." >}}

The error falls as $1/\sqrt N$: a hundred times more darts buys one more correct digit. That is slow compared with Simpson's rule in one dimension. The crucial point is that the $1/\sqrt N$ law does not depend on the dimension at all. The same number of random samples gives the same statistical error whether the integral is over two variables or six thousand. This is why the integrals of statistical mechanics are evaluated by sampling, either with [Monte Carlo methods](../monte-carlo/) that draw configurations at random with the right probabilities, or with molecular dynamics, which generates them by following the motion. The error bar on every simulated average is ultimately this $1/\sqrt N$ law, with $N$ the number of effectively independent samples, as [the topic on probability](../probability/) explains.

{{< note type="key" >}}
- The definite integral is the limit of a sum of thin strips: a signed area, and physically an accumulated total of a rate or a density.
- The fundamental theorem of calculus states that accumulation and differentiation are inverse operations: $\int_a^b f\,\mathrm dx = F(b) - F(a)$ when $F' = f$.
- Substitution and integration by parts reverse the chain and product rules; the Gaussian integral $\int e^{-x^2}\mathrm dx = \sqrt\pi$ underlies every normal distribution and many partition functions.
- Quadrature rules have errors proportional to $h$, $h^2$ or $h^4$; in many dimensions grids become impossible and Monte Carlo sampling, with error $\propto 1/\sqrt N$ in any dimension, takes over.
{{< /note >}}

{{< quiz >}}
- q: "A reaction produces product at a rate r(t) in mol/s. What does ∫₀¹⁰ r(t) dt represent?"
  options: ["The rate at t = 10 s", "The moles of product formed in the first 10 seconds", "The average rate in mol/s²"]
  answer: 1
  why: "Integrating a rate over time accumulates the total; (mol/s) × s = mol."
- q: "What is ∫₁³ 2x dx?"
  options: ["4", "8", "9"]
  answer: 1
  why: "An antiderivative is x², so the integral is 3² − 1² = 8."
- q: "∫₀^{2π} sin x dx equals…"
  options: ["2", "0", "π"]
  answer: 1
  why: "The positive lobe from 0 to π and the negative lobe from π to 2π have equal areas and cancel."
- q: "Doubling the number of strips in the trapezoid rule reduces the error by about…"
  options: ["a factor of 2", "a factor of 4", "a factor of 16"]
  answer: 1
  why: "The trapezoid rule's error is proportional to h², so halving h divides it by 4."
- q: "Why is Monte Carlo integration preferred for a 3000-dimensional phase-space integral?"
  options: ["It is exact", "Its statistical error falls as 1/√N regardless of dimension, while a grid would need astronomically many points", "It needs no random numbers"]
  answer: 1
  why: "Grid methods scale exponentially with dimension; sampling does not."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. Stewart, *Calculus: Early Transcendentals*, 8th ed., Cengage Learning (2015), chapters 5 and 7 (integrals, the fundamental theorem, techniques and numerical integration).
2. M. L. Boas, *Mathematical Methods in the Physical Sciences*, 3rd ed., Wiley (2006), chapter 5 (multiple integrals) and chapter 11 (the gamma and error functions).
3. W. H. Press, S. A. Teukolsky, W. T. Vetterling and B. P. Flannery, *Numerical Recipes: The Art of Scientific Computing*, 3rd ed., Cambridge University Press (2007), chapter 4 (integration of functions) and chapter 7 (Monte Carlo integration).
4. N. Metropolis and S. Ulam, "The Monte Carlo method", *Journal of the American Statistical Association* **44**, 335–341 (1949).
5. D. Frenkel and B. Smit, *Understanding Molecular Simulation*, 3rd ed., Academic Press (2023), chapter 3, on why statistical-mechanical integrals require importance sampling.

</div>
