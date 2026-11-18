---
title: "Integrals"
description: "The integral as an accumulated total: Riemann sums, signed area, the fundamental theorem of calculus that links integrals to derivatives, standard techniques and the Gaussian integral, integrals in physics such as work and averages, numerical quadrature, and Monte Carlo integration in many dimensions."
hook: "Throw random darts at a square and count how many land inside a quarter circle: four times that fraction approaches π. The same trick, sampling instead of slicing, is how integrals over thousands of dimensions are computed."
objectives:
  - "Interpret a definite integral as a signed area and as an accumulated total"
  - "Evaluate integrals with the fundamental theorem, substitution and integration by parts"
  - "Derive the Gaussian integral √π by switching to polar coordinates"
  - "Compare left-edge, trapezoid and Simpson rules by how their errors shrink with step size"
  - "Explain why Monte Carlo sampling beats grids for integrals in many dimensions"
cover: "cover.svg"
milestones:
  - year: 1635
    text: "Bonaventura Cavalieri publishes his geometry of indivisibles, computing areas from thin slices"
  - year: 1686
    text: "Gottfried Wilhelm Leibniz introduces the integral sign in print"
  - year: 1854
    text: "Bernhard Riemann defines the integral as a limit of sums, in his habilitation thesis"
  - year: 1949
    text: "Nicholas Metropolis and Stanisław Ulam publish The Monte Carlo Method"
track: calc
weight: 3
level: Foundation
prereqs: ["derivatives"]
lab: "Approximate areas with strips, watch an integral accumulate, and estimate π with random darts"
---

## Accumulation

The derivative answers the question "how fast is this changing?". The integral answers the reverse question: "if I know how fast something changes at every moment, how much has accumulated in total?". If a car travels at a constant 60 km/h for 2 hours, it covers $60 \times 2 = 120$ km. On a graph of speed against time, that product is the area of a rectangle 2 hours wide and 60 km/h tall. The units confirm it: (km/h) × h = km. Area under a rate curve is accumulated quantity.

When the speed varies, the region under the graph is no longer a rectangle, but the principle is the same. Over a short enough time interval the speed is nearly constant, so the distance covered in that interval is nearly speed × duration, the area of a thin vertical strip. Adding up the strips gives the total distance. The integral is the exact value this sum approaches as the strips become infinitely thin.

The same idea appears whenever a total is built from a varying rate or density. The mass of a rod whose density varies along its length is the integral of density over length. The charge that has flowed through a wire is the integral of the current over time. The amount of product formed in a chemical reaction is the integral of the reaction rate. The work done by a varying force is the integral of force over distance. And, as later chapters show, every average and every probability in statistical mechanics is an integral.

## Riemann sums and the definite integral

To make this precise, divide the interval from $a$ to $b$ into $n$ strips of equal width $\Delta x = (b - a)/n$. In each strip pick a sample point $x_i$, for instance its left edge, and form the sum of rectangle areas:

{{< eq title="The definite integral as a limit of sums" say="Chop the region into thin strips, add up height × width, and let the strips become infinitely thin." >}}
$$ \int_{\textcolor{#4c6ef5}{a}}^{\textcolor{#4c6ef5}{b}} \textcolor{#f08c2e}{f(x)}\,\mathrm dx = \lim_{n \to \infty} \sum_{i=1}^{n} \textcolor{#f08c2e}{f(x_i)}\,\Delta x $$
- the elongated S, $\int$, is a stretched "sum", introduced by Leibniz
- $\mathrm dx$ recalls the strip width $\Delta x$ in the limit; $a$ and $b$ are the limits of integration
- the result is a number, the **definite integral**, with units of $f$ times units of $x$
{{< /eq >}}

The figure below draws the sum. With a handful of strips the rectangles overshoot in some places and undershoot in others, and the total is visibly wrong. Press "Double n" a few times and the staircase hugs the curve ever more closely while the error shrinks. For any continuous function the sum converges to the same limit whichever sample points are used, which is why the integral is well defined. The choice still matters for a finite number of strips, as comparing the left-edge, right-edge, midpoint and trapezoid rules shows.

### Worked example: the area under a parabola

The limit can be taken exactly for $\int_0^1 x^2\,\mathrm dx$. With $n$ strips of width $1/n$ and left-edge sample points $x_i = i/n$ for $i = 0, \dots, n-1$, the sum is

$$
\sum_{i=0}^{n-1} \left(\frac{i}{n}\right)^2 \frac1n = \frac{1}{n^3} \sum_{i=0}^{n-1} i^2 = \frac{(n-1)\,n\,(2n-1)}{6n^3} = \frac{(n-1)(2n-1)}{6n^2},
$$

using the standard result $0^2 + 1^2 + \dots + (n-1)^2 = (n-1)n(2n-1)/6$. Four strips give $21/96 = 0.21875$, ten give $0.285$, a hundred give $0.32835$ and a thousand $0.33283$. Expanding the fraction, the sum equals $\tfrac13 - \tfrac{1}{2n} + \tfrac{1}{6n^2}$, so it approaches $\tfrac13$ with an error that shrinks like $1/n$: every left-edge strip on a rising curve misses a small triangle of area about $\tfrac12 \times (1/n) \times f'(x)/n$, and there are $n$ of them. The power rule run backwards, $x^3/3$ evaluated from 0 to 1, gives the same $\tfrac13$ in one line, which is the point of the next section.

{{< note type="story" >}}
The answer $\tfrac13$ is older than calculus by nearly two thousand years. In *Quadrature of the Parabola*, Archimedes showed in the third century BC that a parabolic segment has exactly $\tfrac43$ the area of the triangle inscribed in it, by filling the segment with ever smaller triangles and summing the geometric series $1 + \tfrac14 + \tfrac1{16} + \dots = \tfrac43$. His method of exhaustion is a Riemann sum in all but notation. What it lacked was generality: each new curve needed a new geometric construction, until the fundamental theorem of the 1660s and 1670s turned area problems into a lookup in a table of derivatives.
{{< /note >}}

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

The rule has a picture. Let $v$ be a function of $u$ along a curve from $(u_1, v_1)$ to $(u_2, v_2)$. The area under the curve is $\int v\,\mathrm du$; the area between the curve and the vertical axis is $\int u\,\mathrm dv$. Together they fill the large rectangle $u_2 v_2$ minus the small one $u_1 v_1$, so $\int v\,\mathrm du = [uv] - \int u\,\mathrm dv$, which is integration by parts.

{{< fig src="parts.svg" alt="A rising curve from (u1, v1) to (u2, v2); the region under it is shaded gold and labelled integral of v du, the region to its left is shaded blue and labelled integral of u dv" caption="Integration by parts as bookkeeping of areas. The gold area under the curve and the blue area beside it add up to $u_2v_2 - u_1v_1$, so knowing one gives the other: $\int v\,\mathrm du = [uv] - \int u\,\mathrm dv$." >}}

A worked example that appears whenever a lifetime or waiting time is averaged: the mean of the exponential distribution $p(t) = e^{-t}$ is $\int_0^\infty t\,e^{-t}\,\mathrm dt$. Take $u = t$ and $v' = e^{-t}$, so $u' = 1$ and $v = -e^{-t}$. Then $\int_0^\infty t\,e^{-t}\,\mathrm dt = [-t\,e^{-t}]_0^\infty + \int_0^\infty e^{-t}\,\mathrm dt = 0 + 1 = 1$. The boundary term vanishes at both ends, at $t = 0$ because of the factor $t$ and at infinity because the exponential beats the power, as in [the chapter on functions](../functions-and-graphs/). In units, a process with rate constant $k$ has mean waiting time $1/k$.

Not every integral has an antiderivative that can be written with elementary functions. The most important example in all of science is the **Gaussian integral**. The function $e^{-x^2}$ has no elementary antiderivative, yet its integral over the whole line has an exact value, found by a beautiful trick: square the integral, write the square as a double integral over the plane, and switch to polar coordinates, where the extra factor of $r$ makes the integrand the derivative of $-\tfrac12 e^{-r^2}$.

{{< eq title="The Gaussian integral" say="The total area under the bell curve is √π, which is why π appears in every normal distribution." >}}
$$ \int_{-\infty}^{\infty} e^{-x^2}\,\mathrm dx = \sqrt{\pi}, \qquad \int_{-\infty}^{\infty} e^{-\textcolor{#845ef7}{a} x^2}\,\mathrm dx = \sqrt{\frac{\pi}{\textcolor{#845ef7}{a}}} $$
- proof: $\left(\int e^{-x^2}\mathrm dx\right)^2 = \iint e^{-(x^2+y^2)}\,\mathrm dx\,\mathrm dy = \int_0^{2\pi}\!\!\int_0^\infty e^{-r^2}\,r\,\mathrm dr\,\mathrm d\theta = 2\pi \cdot \tfrac12 = \pi$
{{< /eq >}}

Where does the helpful factor $r$ come from? Instead of covering the plane with little squares $\mathrm dx\,\mathrm dy$, cover it with thin rings. A ring of radius $r$ and width $\mathrm dr$ has circumference $2\pi r$ and therefore area $2\pi r\,\mathrm dr$, and on it the integrand $e^{-(x^2 + y^2)} = e^{-r^2}$ is constant. The whole plane is then the sum of rings, $\int_0^\infty 2\pi r\,e^{-r^2}\,\mathrm dr$, and $2\pi r\,e^{-r^2}$ is exactly the derivative of $-\pi e^{-r^2}$. The fundamental theorem finishes the job: $[-\pi e^{-r^2}]_0^\infty = \pi$. The one-dimensional integral has no such factor and no elementary antiderivative; squaring it adds a dimension, and the extra dimension supplies the $r$.

{{< fig src="polar.svg" alt="Left: the two-dimensional Gaussian shown as violet shading over the plane, with an orange ring of radius 1. Right: the curve 2 pi r e to the minus r squared against r, its area shaded, with the dashed curve pi e to the minus r squared" caption="Summing the two-dimensional Gaussian ring by ring. Each ring contributes $2\pi r\,e^{-r^2}\,\mathrm dr$, a function with the antiderivative $-\pi e^{-r^2}$ (dashed), so the total area is $\pi$. Out to $r = 3$ it is already $\pi(1 - e^{-9}) = 3.1412$." >}}

The normalisation of the normal distribution, the partition function of an ideal gas, the momentum integrals that give the Maxwell–Boltzmann distribution and the zero-point properties of a harmonic oscillator all reduce to this one result. In the strips figure, choose $e^{-x^2}$: the area between $-3$ and $3$ is already $1.7724$, within $0.003\,\%$ of $\sqrt\pi = 1.77245$, because the tails beyond $|x| = 3$ are tiny.

## Integrals in physics

Several integrals recur so often in the physical sciences that they are worth recognising on sight.

{{< note type="practice" title="Back of the envelope" >}}
How much work does one mole of gas do when it doubles its volume at 300 K? For an ideal gas held at constant temperature the pressure is $p = RT/V$, so the work is an area under a $1/V$ curve:
$$
W = \int_{V_1}^{V_2} p\,\mathrm dV = RT \int_{V_1}^{V_2} \frac{\mathrm dV}{V} = RT \ln\frac{V_2}{V_1} = 8.314 \times 300 \times \ln 2\ \text{J} \approx 1.73\ \text{kJ}.
$$
The answer depends only on the ratio of volumes, because $\int \mathrm dV/V = \ln V$: expanding from 1 L to 2 L or from 10 m³ to 20 m³ gives the same work. It is also the free-energy change $-RT\ln 2$ of the gas, the entropic cost of halving the space available to each molecule, which reappears in [ensembles and free energy](../ensembles-and-free-energy/).
{{< /note >}}

The **work** done by a force $F(x)$ that moves an object from $a$ to $b$ is $W = \int_a^b F(x)\,\mathrm dx$. When the force comes from a potential, $F = -\mathrm dV/\mathrm dx$, the fundamental theorem gives $W = -[V(b) - V(a)]$: the work done by the force equals the drop in potential energy. This is the integral form of the statement that force is the slope of energy, and it is why energy is conserved for such forces. Choose the spring force in the accumulation figure: the accumulated work is a downward parabola, minus the familiar $\tfrac12 kx^2$.

The **average** of a function over an interval is its integral divided by the length of the interval, $\bar f = \frac{1}{b - a}\int_a^b f(x)\,\mathrm dx$: the height of the rectangle with the same area. A time average from a simulation is exactly this, with the integral replaced by a sum over saved frames.

A **probability density** $p(x)$ describes a continuous random quantity: the probability that it lies between $a$ and $b$ is $\int_a^b p(x)\,\mathrm dx$, and the total integral is 1. The average of any quantity $g(x)$ is then $\langle g \rangle = \int g(x)\,p(x)\,\mathrm dx$. [The chapter on probability](../probability/) develops this, and statistical mechanics is built on it: the average energy of a system is an integral of energy weighted by the Boltzmann probability over all positions and momenta.

### Worked example: the fast tail of the Maxwell distribution

The speeds of nitrogen molecules at temperature $T$ follow the [Maxwell distribution](../boltzmann-and-maxwell/), $p(v) = 4\pi\,(a/\pi)^{3/2}\,v^2 e^{-a v^2}$ with $a = m/2k_BT$. At 300 K its peak is at 422 m s⁻¹ and its mean at 476 m s⁻¹. What fraction of molecules move faster than 1000 m s⁻¹? The answer is the area of the tail, $\int_{1000}^\infty p(v)\,\mathrm dv$.

{{< note type="try" title="Pause and predict" >}}
Doubling the temperature to 600 K raises the typical speed by a factor of $\sqrt 2 \approx 1.41$. By roughly what factor does the fraction of molecules faster than 1000 m s⁻¹ grow: 1.4, 2, or more than 10? Decide, then read on.
{{< /note >}}

Substituting $t = \sqrt a\,v$ turns the tail into $(4/\sqrt\pi)\int_x^\infty t^2 e^{-t^2}\,\mathrm dt$ with $x = 1000\sqrt a$, the cut-off measured in units of the most probable speed: $x = 1000/422 = 2.37$. Integration by parts with $u = t$ and $v' = t\,e^{-t^2}$ moves one power of $t$ and leaves a Gaussian tail,

$$
P(v > v^*) = \operatorname{erfc}(x) + \frac{2x}{\sqrt\pi}\,e^{-x^2},
$$

where $\operatorname{erfc}(x) = (2/\sqrt\pi)\int_x^\infty e^{-t^2}\,\mathrm dt$ is the complementary error function, tabulated and available in every numerical library. At 300 K this gives 1.05 %. At 600 K, $x = 1.68$ and the fraction is 13.2 %, more than twelve times larger. The fast tail is dominated by $e^{-x^2}$, so a modest change in temperature changes it enormously, which is the same arithmetic that makes reaction rates so sensitive to temperature.

{{< fig src="maxwell.svg" alt="Maxwell speed distributions for nitrogen at 300 K, peaking at 422 metres per second, and at 600 K, peaking at 597 metres per second, with the area beyond 1000 metres per second shaded under each" caption="The fraction of molecules faster than 1000 m s⁻¹ is the shaded area under each curve: 1.1 % at 300 K and 13.2 % at 600 K. A 41 % rise in the typical speed multiplies the tail by twelve." >}}

The cell below computes the same tail three ways: by the trapezoid rule, by the formula from integration by parts, and by sampling a million molecules and counting.

{{< py title="Three ways to integrate a tail" >}}
import numpy as np
from math import erfc, sqrt, pi, exp

kB, m, T = 1.380649e-23, 28.0134 * 1.66054e-27, 300.0    # N2 at 300 K
a = m / (2 * kB * T)
x = 1000 * sqrt(a)                                       # 1000 m/s in units of the most probable speed
# 1. quadrature: trapezoid rule on the speed distribution from 1000 to 4000 m/s
v = np.linspace(1000, 4000, 3001)
f = 4 * pi * (a / pi) ** 1.5 * v**2 * np.exp(-a * v**2)
trap = np.sum((f[1:] + f[:-1]) / 2 * np.diff(v))

# 2. integration by parts: erfc(x) + (2x / sqrt(pi)) exp(-x^2)
formula = erfc(x) + 2 * x / sqrt(pi) * exp(-x * x)

# 3. Monte Carlo: sample velocity components from the Gaussian and count
rng = np.random.default_rng(0)
vel = rng.normal(0, sqrt(kB * T / m), size=(1_000_000, 3))
speeds = np.linalg.norm(vel, axis=1)
mc = np.mean(speeds > 1000)
err = sqrt(mc * (1 - mc) / speeds.size)
print(f"trapezoid    {trap:.5f}")
print(f"by parts     {formula:.5f}")
print(f"Monte Carlo  {mc:.5f} +/- {err:.5f}")
{{< /py >}}

The three agree to the precision each can offer. The quadrature and the formula agree to five decimal places; the Monte Carlo estimate, 0.01051, differs by about one statistical error bar, 0.0001, as it should. The Monte Carlo method used no calculus at all, only the ability to draw samples, and that property is what makes it the method of choice in the last section.

{{< note type="practice" title="From the lab" >}}
Two integrals of this kind are routine in simulation analysis. The **coordination number** of an atom in a liquid is the integral of the radial distribution function over the first shell, $n_1 = 4\pi\rho\int_0^{r_{\min}} r^2 g(r)\,\mathrm dr$, with $r_{\min}$ the first minimum of $g(r)$ (see [liquids and structure](../liquids-and-structure/)); for a simple dense liquid it comes out near twelve. **Thermodynamic integration**, introduced by Kirkwood in 1935, computes a free-energy difference as $\Delta F = \int_0^1 \langle \partial U/\partial\lambda\rangle_\lambda\,\mathrm d\lambda$, where each value of the integrand is the average from a separate simulation at fixed $\lambda$. Each point costs nanoseconds of sampling, so the number of quadrature points matters: typical alchemical calculations use 10 to 20 values of $\lambda$, with the trapezoid rule or Gauss–Legendre points, and the integrand must be smooth for the rule to be accurate, as [the FEP and TI chapter](../es-fep-ti/) explains.
{{< /note >}}

Integrals extend naturally to several dimensions. The volume under a surface $f(x, y)$ is the double integral $\iint f\,\mathrm dx\,\mathrm dy$, the limit of a sum of thin columns, and the mass of a three-dimensional object is the triple integral of its density over its volume. The **partition function** of $N$ classical atoms is an integral over all $3N$ position coordinates and $3N$ momentum coordinates, a $6N$-dimensional integral. Computing such integrals is the central difficulty of statistical mechanics, and it is the reason for the last section of this topic.

## Numerical integration

When an antiderivative is unavailable, or the integrand is known only as data, integrals are computed numerically by a **quadrature rule**: a weighted sum of function values. The rules in the strips figure are the simplest. Their accuracy can be read off from Taylor's theorem, just as for finite differences. With $n$ strips of width $h$, the left- and right-edge rules have errors proportional to $h$; the midpoint and trapezoid rules, which are symmetric within each strip, have errors proportional to $h^2$; and **Simpson's rule**, which fits a parabola through each pair of strips, has error proportional to $h^4$. Doubling $n$ therefore halves the error of the left-edge rule, quarters that of the trapezoid rule and divides that of Simpson's rule by sixteen. You can check the first two in the figure: compare the errors before and after pressing "Double n".

For $\int_0^1 e^x\,\mathrm dx = e - 1$ the numbers are as follows. Going from 4 to 8 strips, the left-edge error falls from $0.206$ to $0.105$, the trapezoid error from $8.9 \times 10^{-3}$ to $2.2 \times 10^{-3}$, and the Simpson error from $3.7 \times 10^{-5}$ to $2.3 \times 10^{-6}$: factors of 2, 4 and 16. With 1024 points Simpson's rule is within $10^{-14}$ of the exact value, close to the limit of double-precision arithmetic. Higher accuracy per function evaluation comes from **Gaussian quadrature**, which chooses the sample points as well as the weights: $n$ Gauss–Legendre points integrate any polynomial of degree up to $2n - 1$ exactly. For a smooth integrand in one or a few dimensions this is usually the most economical choice, which is why library routines such as SciPy's `quad` (built on the QUADPACK Gauss–Kronrod rules) use it rather than equal strips.

{{< fig src="quadrature.svg" alt="Left: absolute error against number of function evaluations on log-log axes for the left-edge, trapezoid, Simpson and Monte Carlo rules applied to the integral of e to the x from 0 to 1. Right: function evaluations needed for an error of 10 to the minus 4 against dimension, rising steeply for grids and flat for Monte Carlo" caption="Left: on log–log axes each rule is a line whose slope is its order: $-1$ for the left edge, $-2$ for the trapezoid, $-4$ for Simpson and $-\tfrac12$ for Monte Carlo (root-mean-square error over 400 runs). Right: the same orders turned into cost in $d$ dimensions, with all prefactors set to one; Monte Carlo is cheaper than a trapezoid grid beyond $d = 4$ and than a Simpson grid beyond $d = 8$." >}}

The same ideas, applied to the equations of motion, give the integrators of molecular dynamics. Advancing a trajectory by one time step means integrating the acceleration to update the velocity and integrating the velocity to update the position. The velocity Verlet algorithm used in nearly every MD code is a carefully symmetrised version of the midpoint idea, as [the chapter on integrators](../molecular-dynamics/) explains.

## Monte Carlo integration

Grid-based quadrature has a fatal weakness in many dimensions. A grid with 10 points along each axis needs $10^d$ function evaluations in $d$ dimensions: 100 in two dimensions, but $10^{30}$ in thirty, far beyond any computer. Phase-space integrals over hundreds of atoms are hopeless on a grid. This exponential cost is called the **curse of dimensionality**.

The orders of the last section make this precise. A grid with $n$ points per axis uses $N = n^d$ points in total, and its spacing is $h \propto 1/n = N^{-1/d}$. A rule of order $p$ in one dimension, with error proportional to $h^p$, therefore has error proportional to $N^{-p/d}$ in $d$ dimensions. For the trapezoid rule that is $N^{-2/d}$: as good as $N^{-2}$ on a line, but only $N^{-1/2}$ in four dimensions and $N^{-1/50}$ in a hundred.

The way out is to sample at random. To estimate the area of a region, enclose it in a box of known area, scatter $N$ random points uniformly in the box, and count the fraction that fall inside. That fraction times the box area estimates the region's area. The figure below estimates π this way: the quarter-circle of radius 1 has area $\pi/4$, so four times the fraction of random points inside it approaches π.

{{< widget name="mcint" title="Estimating π by throwing random darts" caption="Left: random points in the unit square, teal inside the quarter circle and rose outside. Right: the error of the estimate against the number of darts on log–log axes. The dashed line is the 1/√N law predicted by the central limit theorem." >}}

The error falls as $1/\sqrt N$: a hundred times more darts buys one more correct digit. That is slow compared with Simpson's rule in one dimension. The crucial point is that the $1/\sqrt N$ law does not depend on the dimension at all. The same number of random samples gives the same statistical error whether the integral is over two variables or six thousand. This is why the integrals of statistical mechanics are evaluated by sampling, either with [Monte Carlo methods](../monte-carlo/) that draw configurations at random with the right probabilities, or with molecular dynamics, which generates them by following the motion. The error bar on every simulated average is ultimately this $1/\sqrt N$ law, with $N$ the number of effectively independent samples, as [the chapter on probability](../probability/) explains.

Compare the two scalings directly. Monte Carlo error falls as $N^{-1/2}$ in any dimension, a grid rule of order $p$ as $N^{-p/d}$, so sampling wins once $d > 2p$: beyond four dimensions for the trapezoid rule and beyond eight for Simpson's rule. The right panel of the quadrature figure above shows the cost of reaching an error of $10^{-4}$: $10^8$ samples for Monte Carlo whatever the dimension, against $10^{2d}$ points for a trapezoid grid, already $10^{24}$ in twelve dimensions. A box of 100 argon atoms has a 300-dimensional configuration space.

{{< note type="warn" title="Myth" >}}
**Myth:** since Monte Carlo error does not depend on dimension, scattering points uniformly over configuration space is enough.
**Reality:** the $1/\sqrt N$ law carries a prefactor, the standard deviation of the integrand, and for Boltzmann-weighted integrals that prefactor explodes with dimension. Consider a $d$-dimensional Gaussian $e^{-|\mathbf x|^2/2}$ sampled uniformly in the box $[-5, 5]^d$. The region where the integrand is not negligible has a volume of roughly $(\sqrt{2\pi})^d$, a fraction $(\sqrt{2\pi}/10)^d \approx 0.25^d$ of the box: one point in four in one dimension, one in a million in ten, and $8 \times 10^{-61}$ in a hundred. Almost every uniform sample lands where the integrand is zero. In a dense liquid the situation is worse, because a random placement of atoms almost always overlaps two of them. The cure is **importance sampling**, drawing points with probability proportional to the Boltzmann factor itself, which Metropolis, the Rosenbluths and the Tellers achieved in 1953 with the algorithm described in [the Monte Carlo chapter](../monte-carlo/).
{{< /note >}}

{{< note type="key" >}}
- The definite integral is the limit of a sum of thin strips: a signed area, and physically an accumulated total of a rate or a density.
- The fundamental theorem of calculus states that accumulation and differentiation are inverse operations: $\int_a^b f\,\mathrm dx = F(b) - F(a)$ when $F' = f$.
- Substitution and integration by parts reverse the chain and product rules; the Gaussian integral $\int e^{-x^2}\mathrm dx = \sqrt\pi$ underlies every normal distribution and many partition functions.
- Quadrature rules have errors proportional to $h$, $h^2$ or $h^4$; in many dimensions grids become impossible and Monte Carlo sampling, with error $\propto 1/\sqrt N$ in any dimension, takes over.
- A grid rule of order $p$ has error $\propto N^{-p/d}$ in $d$ dimensions, so sampling wins once $d > 2p$; for Boltzmann-weighted integrals uniform sampling still fails, and importance sampling is required.
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
- q: "What is ∫₀^∞ t e^(−t) dt, the mean waiting time of a process with unit rate constant?"
  options: ["0", "1", "1/2"]
  answer: 1
  why: "By parts with u = t and v′ = e^(−t): the boundary term [−t e^(−t)] vanishes at both ends, leaving ∫₀^∞ e^(−t) dt = 1."
- q: "A grid rule of order p has error ∝ N^(−p/d) in d dimensions. Beyond which dimension does Monte Carlo (error ∝ N^(−1/2)) win against Simpson's rule (p = 4)?"
  options: ["d = 2", "d = 4", "d = 8"]
  answer: 2
  why: "Monte Carlo wins when 1/2 > p/d, that is d > 2p = 8."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. Stewart, *Calculus: Early Transcendentals*, 8th ed., Cengage Learning (2015), chapters 5 and 7 (integrals, the fundamental theorem, techniques and numerical integration).
2. M. L. Boas, *Mathematical Methods in the Physical Sciences*, 3rd ed., Wiley (2006), chapter 5 (multiple integrals) and chapter 11 (the gamma and error functions).
3. W. H. Press, S. A. Teukolsky, W. T. Vetterling and B. P. Flannery, *Numerical Recipes: The Art of Scientific Computing*, 3rd ed., Cambridge University Press (2007), chapter 4 (integration of functions) and chapter 7 (Monte Carlo integration).
4. J. G. Kirkwood, "Statistical mechanics of fluid mixtures", *Journal of Chemical Physics* **3**, 300–313 (1935).
5. N. Metropolis, A. W. Rosenbluth, M. N. Rosenbluth, A. H. Teller and E. Teller, "Equation of state calculations by fast computing machines", *Journal of Chemical Physics* **21**, 1087–1092 (1953).
6. N. Metropolis and S. Ulam, "The Monte Carlo method", *Journal of the American Statistical Association* **44**, 335–341 (1949).
7. D. Frenkel and B. Smit, *Understanding Molecular Simulation*, 3rd ed., Academic Press (2023), chapter 3, on why statistical-mechanical integrals require importance sampling.

</div>
