---
title: "Derivatives and Taylor series"
description: "The derivative as the slope of a curve seen up close: its definition as a limit, the derivative as a new function, the rules of differentiation, forces as derivatives of energy, optimisation, Taylor series and the harmonic approximation, and how derivatives are computed with finite differences."
track: calc
weight: 2
level: Foundation
prereqs: ["functions-and-graphs"]
lab: "Zoom into a curve until it is straight, trace a derivative, build Taylor polynomials, and find the best finite-difference step"
---

## Average rates of change

A car leaves at noon and has travelled 120 km by 2 pm. Its average speed was 60 km/h. That number is a ratio of two changes, the change in position divided by the change in time, and it says nothing about what happened in between: the car may have waited at traffic lights and then driven at 90 km/h on the motorway. The speedometer, by contrast, shows the speed *at this instant*. Making the idea of an instantaneous rate precise is the purpose of the derivative, and it is one of the most useful ideas in all of mathematics.

The average rate of change of a function $f$ between two inputs $x$ and $x + h$ is

$$
\frac{\Delta f}{\Delta x} = \frac{f(x + h) - f(x)}{h}.
$$

Geometrically this is the slope of the straight line joining the two points $(x, f(x))$ and $(x + h, f(x + h))$ on the graph, called a **secant** line. For a straight-line function the secant slope is the same for every pair of points, which is what makes a line straight. For a curve it depends on which two points you choose.

## The derivative as a limit

The way to get an instantaneous rate is to make the interval shorter and shorter. Take the secant line through $x$ and $x + h$ and slide the second point towards the first. As $h$ shrinks, the secant line swings round and settles towards a definite line that just grazes the curve at $x$: the **tangent** line. Its slope is the derivative.

{{< eq title="The derivative" say="The slope of the curve at a single point: the limit of secant slopes as the second point slides into the first." >}}
$$ \textcolor{#12a594}{f'(x)} = \frac{\mathrm d f}{\mathrm d x} = \lim_{h \to 0} \frac{f(\textcolor{#4c6ef5}{x} + h) - f(\textcolor{#4c6ef5}{x})}{h} $$
- $\textcolor{#12a594}{f'(x)}$ or $\mathrm df/\mathrm dx$: two common notations for the derivative; Newton wrote $\dot x$ for derivatives with respect to time
- $\lim_{h\to 0}$: the value the ratio approaches as $h$ becomes arbitrarily small, without ever setting $h = 0$ (which would give $0/0$)
{{< /eq >}}

There is a second way to see the same thing, and it is the more illuminating one. Zoom in on a smooth curve around a point. As the magnification increases, the curve looks less and less curved, until at high magnification it is indistinguishable from a straight line. The slope of that line is the derivative. A function that has this property at a point, of looking straight when magnified enough, is called **differentiable** there. Most functions in physics are differentiable almost everywhere; the exceptions are corners (like $|x|$ at zero), jumps and infinite spikes.

{{< widget name="zoomslope" title="A curve seen up close is a straight line" caption="Left: a curve with a draggable point and a secant line (rose) through the point and a second point at distance h. Right: the purple box magnified. Increase the magnification and the curve straightens onto its tangent (dashed teal); shrink h and the secant slope converges to the same number." >}}

Try it: with a magnification of a few hundred the orange curve in the right panel lies exactly on the dashed tangent, and as $h$ is reduced the secant slope agrees with the true derivative to more and more decimal places. Both views describe one fact. Over a small enough region, any smooth function behaves linearly, $f(x + h) \approx f(x) + f'(x)\,h$, and the derivative is the coefficient of that linear behaviour.

Let us compute one derivative from the definition. For $f(x) = x^2$,

$$
\frac{(x + h)^2 - x^2}{h} = \frac{x^2 + 2xh + h^2 - x^2}{h} = 2x + h \;\longrightarrow\; 2x \quad (h \to 0).
$$

So the slope of the parabola $x^2$ at any point $x$ is $2x$: zero at the bottom, positive on the right, negative on the left, and steeper the further you go from the centre.

## The derivative as a function

Since the derivative can be computed at every point, it is itself a function, $f'(x)$, and it has its own graph. Reading the two graphs together is one of the most important skills in applied mathematics. Where $f$ is rising, $f'$ is positive. Where $f$ is falling, $f'$ is negative. Where $f$ has a peak or a valley, its tangent is horizontal and $f'$ is zero. Such points are called **stationary points**, and finding them by solving $f'(x) = 0$ is how minima and maxima are located.

{{< widget name="derivplot" title="A function and its derivative" caption="Top: the function with a draggable point and its tangent line (teal) and slope triangle. Bottom: the derivative, the slope of the top curve at every x. Violet dots mark stationary points. Tick ‘trace’ and sweep to watch the derivative being drawn as the tangent rolls along the curve." opts=`{"fn":"cubic"}` >}}

The derivative of the derivative is the **second derivative**, $f''(x) = \mathrm d^2 f/\mathrm dx^2$. It measures how the slope itself changes, which is the **curvature** of the graph. Where $f'' > 0$ the slope is increasing and the curve bends upwards like a cup; where $f'' < 0$ it bends downwards like a cap. This gives a test for stationary points: if $f'(x) = 0$ and $f''(x) > 0$, the point is a minimum; if $f''(x) < 0$, it is a maximum. In the figure, tick the box for the second derivative and check that it is positive at the minimum of $x^3 - 3x$ and negative at the maximum.

When the variable is time, the derivatives have familiar names. The derivative of position $x(t)$ is the velocity $v = \mathrm dx/\mathrm dt$, and the derivative of velocity is the acceleration $a = \mathrm dv/\mathrm dt = \mathrm d^2x/\mathrm dt^2$. Newton's second law, $F = ma$, is therefore a statement about a second derivative, and [the chapter on motion](../motion-and-phase-space/) shows how it determines a trajectory.

## The rules of differentiation

Computing every derivative from the limit definition would be tedious. Instead, a small number of rules, each proved once from the definition, handle almost every function you will meet. The derivatives of the basic functions are:

| function $f(x)$ | derivative $f'(x)$ | comment |
|---|---|---|
| $c$ (a constant) | $0$ | a horizontal line has no slope |
| $x^n$ | $n x^{n-1}$ | any real power $n$ |
| $e^x$ | $e^x$ | the exponential is its own slope |
| $e^{kx}$ | $k e^{kx}$ | rate proportional to amount |
| $\ln x$ | $1/x$ | for $x > 0$ |
| $\sin x$ | $\cos x$ | $x$ in radians |
| $\cos x$ | $-\sin x$ | |

The power rule generalises the calculation done above for $x^2$. The rule for $e^x$ is the property that singles out the number $e$: of all exponentials $b^x$, only $e^x$ has a slope equal to its height everywhere. For a general base, the derivative of $b^x$ is $(\ln b)\,b^x$, and $\ln b = 1$ precisely when $b = e$.

Functions built from these pieces are handled by four combination rules:

{{< eq title="Combination rules" say="Derivatives of sums add; products and quotients mix; compositions multiply." >}}
$$ (a f + b g)' = a f' + b g', \qquad (f g)' = f' g + f g', \qquad \left(\frac{f}{g}\right)' = \frac{f' g - f g'}{g^2}, \qquad \frac{\mathrm d}{\mathrm dx} f\big(g(x)\big) = f'\big(g(x)\big)\,g'(x) $$
- the first is **linearity**: a derivative of a sum is the sum of derivatives
- the last is the **chain rule**: the rate of change of a composition is the product of the rates of change of its links
{{< /eq >}}

The chain rule deserves special emphasis because it is everywhere. If $y$ depends on $u$ and $u$ depends on $x$, then a small change in $x$ changes $u$ by $u'(x)$ times as much, and that change in $u$ changes $y$ by $y'(u)$ times as much, so $\mathrm dy/\mathrm dx = (\mathrm dy/\mathrm du)(\mathrm du/\mathrm dx)$. For example, the derivative of the Gaussian $e^{-x^2/2}$ is $e^{-x^2/2}$ times the derivative of $-x^2/2$, that is $-x\,e^{-x^2/2}$. The training of every neural network is one enormous application of the chain rule, carried out link by link through the network, which is what [backpropagation](../backpropagation/) means.

## Forces and equilibrium

In physics the most important derivative is the one connecting energy and force. For a particle moving along a line in a potential energy $V(x)$, the force is the negative slope of the potential:

{{< eq title="Force as the slope of energy" say="Things are pushed downhill on the energy landscape, harder where it is steeper." >}}
$$ \textcolor{#f08c2e}{F}(x) = -\frac{\mathrm d\textcolor{#d4a017}{V}}{\mathrm dx} $$
- equilibrium positions are stationary points of $V$, where the force vanishes
- a minimum of $V$ is a **stable** equilibrium ($V'' > 0$); a maximum is **unstable** ($V'' < 0$)
{{< /eq >}}

Select the atom-pair energy in the derivative figure above. It is the Lennard-Jones potential, in reduced units $V(r) = 4(r^{-12} - r^{-6})$, which models the interaction of two noble-gas atoms. Using the power rule,

$$
V'(r) = 4\left(-12\,r^{-13} + 6\,r^{-7}\right),
$$

and setting $V'(r) = 0$ gives $r^6 = 2$, so the equilibrium separation is $r_0 = 2^{1/6} \approx 1.122$ (in units of the atomic diameter $\sigma$), where the energy is $V(r_0) = -1$, the depth of the well. To the left of $r_0$ the slope is negative and the force $-V'$ is positive, pushing the atoms apart; to the right it pulls them together. The second derivative at the minimum, $V''(r_0) = 72/2^{1/3} \approx 57.1$, is the stiffness of the bond, its effective spring constant. This number sets the frequency at which the atoms vibrate about their equilibrium spacing, which is how derivatives of energy surfaces connect to measured vibrational spectra. The same reasoning in many dimensions gives forces as gradients, developed in [the chapter on gradients](../gradients/) and used throughout [molecular dynamics](../molecular-dynamics/).

## Optimisation

Finding the input that makes a function as small or as large as possible is called **optimisation**, and it is the central computational task of both chemistry (finding stable structures) and machine learning (finding the best parameters). The calculus answer is to solve $f'(x) = 0$ and check the sign of $f''$. This works beautifully when the derivative can be solved by hand, as for the Lennard-Jones minimum. When it cannot, the derivative still tells you which way to go: if $f'(x) > 0$, decreasing $x$ lowers $f$, and if $f'(x) < 0$, increasing $x$ does. Repeatedly stepping a little way in the downhill direction,

$$
x_{\text{new}} = x - \eta\, f'(x),
$$

with a small step size $\eta$, walks down to a minimum. This is **gradient descent**, the optimisation method behind nearly all of deep learning, studied in detail in [its own chapter](../gradient-descent/). A faster method for smooth functions is **Newton's method**, which uses the second derivative as well: it approximates the function near $x$ by a parabola and jumps straight to the parabola's minimum, $x_{\text{new}} = x - f'(x)/f''(x)$. Near a minimum it roughly doubles the number of correct digits at every step.

## Taylor series

The idea that a smooth function looks straight up close can be pushed further. A straight line matches a function's value and slope at a point. A parabola can also match its curvature, a cubic the rate of change of curvature, and so on. Matching all the derivatives at a point $a$ gives the **Taylor series**:

{{< eq title="Taylor series" say="Near a point, a smooth function is a polynomial whose coefficients are its derivatives there." >}}
$$ f(x) = f(a) + \textcolor{#12a594}{f'(a)}\,(x - a) + \frac{\textcolor{#845ef7}{f''(a)}}{2!}(x - a)^2 + \frac{f'''(a)}{3!}(x - a)^3 + \dots = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}\,(x - a)^n $$
- $f^{(n)}(a)$: the $n$-th derivative at the expansion point $a$; $n! = 1 \times 2 \times \dots \times n$
- truncating after the $(x-a)^N$ term gives the Taylor polynomial of order $N$, whose error shrinks like $(x - a)^{N+1}$ near $a$
{{< /eq >}}

To see why the coefficients must be $f^{(n)}(a)/n!$, differentiate the polynomial $n$ times and set $x = a$: every term except the $n$-th vanishes, and the $n$-th gives $n!$ times its coefficient, which must equal $f^{(n)}(a)$.

{{< widget name="taylor" title="Building a function out of polynomial pieces" caption="Orange: the function. Dashed violet: its Taylor polynomial of order N about the blue point a. The teal band marks where the two agree to within 0.01. Press ‘add terms one by one’ and watch the band grow; for ln(1 + x) the series can never reach beyond the singularity at x = −1, however many terms are used." opts=`{"fn":"sin"}` >}}

Some Taylor series are worth knowing by heart, all expanded about $a = 0$:

$$
e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots, \qquad
\sin x = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \cdots, \qquad
\ln(1 + x) = x - \frac{x^2}{2} + \frac{x^3}{3} - \cdots .
$$

The first two converge for every $x$: with enough terms the polynomial matches the function on any finite interval, as the figure shows. The third converges only for $-1 < x \le 1$. The distance from the expansion point within which a series converges is its **radius of convergence**, and it is limited by the nearest point where the function misbehaves, here the logarithm's singularity at $x = -1$.

Truncated Taylor series are behind a large fraction of physical approximations. The **small-angle approximation** $\sin\theta \approx \theta$ is the first-order series, and it turns the pendulum's nonlinear equation into the simple harmonic oscillator. The **harmonic approximation** of a chemical bond expands the potential energy about its minimum, where $V'(r_0) = 0$:

$$
V(r) \approx V(r_0) + \tfrac12 V''(r_0)\,(r - r_0)^2 ,
$$

a parabola with spring constant $k = V''(r_0)$. Choose the bond energy in the figure and set the order to 2: the parabola hugs the true curve near the minimum but misses the soft attractive tail and the steep wall. Adding the cubic term captures the asymmetry, which is what makes real crystals expand when heated. Normal-mode analysis of molecules, phonons in crystals and vibrational spectroscopy are all built on the second-order Taylor expansion of the energy.

## Derivatives on a computer

Simulations and data analysis often need derivatives of functions known only as numbers, or as code too complicated to differentiate by hand. The definition suggests an approximation: choose a small but finite $h$ and compute the **forward difference** $[f(x + h) - f(x)]/h$. Taylor's theorem tells us how accurate this is. Since $f(x + h) = f(x) + f'(x) h + \tfrac12 f''(x) h^2 + \dots$, the forward difference equals $f'(x) + \tfrac12 f''(x) h + \dots$, so its error is proportional to $h$. A cleverer formula, the **central difference** $[f(x + h) - f(x - h)]/2h$, cancels the $h^2$ terms of the two expansions and has an error proportional to $h^2$, which is far smaller for small $h$.

It would seem, then, that the best choice is the smallest possible $h$. The figure below shows why this is wrong. It plots the actual error of both formulas for the derivative of $\sin x$ at $x = 1$, computed in the same floating-point arithmetic a real program uses, against $h$ on log–log axes.

{{< widget name="fderr" title="The error of finite differences against the step size" caption="Each curve is computed live in your browser's double-precision arithmetic (or emulated single precision). Drag across the plot to read off the errors at a chosen h." >}}

For large $h$ the errors fall along straight lines of slope 1 (forward) and 2 (central): this is the truncation error predicted by the Taylor series. But below a certain $h$ the curves turn round and the error grows again, becoming erratic. The cause is rounding. A computer stores about 16 significant decimal digits in double precision ([the chapter on numbers in a computer](../numbers-in-a-computer/) explains why). When $h$ is tiny, $f(x + h)$ and $f(x)$ agree in almost all their digits, and subtracting them leaves only the few digits that differ, most of which are rounding noise. Dividing by the tiny $h$ then magnifies that noise. The **round-off error** grows like $\epsilon/h$, where $\epsilon \approx 2.2 \times 10^{-16}$ is the machine precision.

The best step balances the two errors. For the forward difference the optimum is near $h \approx \sqrt{\epsilon} \approx 10^{-8}$, giving an error around $10^{-8}$; for the central difference it is near $h \approx \epsilon^{1/3} \approx 10^{-5}$, giving an error of $10^{-10}$ or better. Tick the single-precision box, as used on many GPUs, and the optimum moves to much larger $h$ with an error of only around $10^{-4}$ to $10^{-7}$. Finite differences therefore never reach full machine precision, and they need two or more function evaluations per input variable, which is prohibitive for a function of a million variables.

Modern machine-learning software sidesteps both problems with **automatic differentiation**. Rather than approximating, it applies the chain rule exactly to every elementary operation the program performs, carrying derivatives along with values. The result is exact up to rounding, and in its reverse mode the full gradient of a function of any number of variables costs only a small multiple of one function evaluation. It is how neural networks are trained and how [differentiable molecular dynamics](../differentiable-md/) computes the derivatives of a whole simulation.

{{< note type="key" >}}
- The derivative $f'(x)$ is the slope of the tangent line, the limit of secant slopes, and equivalently the coefficient of the linear behaviour a smooth function shows when magnified.
- Stationary points satisfy $f'(x) = 0$; the sign of $f''(x)$ distinguishes minima from maxima. Force is $-\mathrm dV/\mathrm dx$, and the curvature $V''$ at a minimum is a spring constant.
- Five basic derivatives and four combination rules, above all the chain rule, differentiate almost any formula.
- The Taylor series rebuilds a function from its derivatives at a point; its second-order truncation is the harmonic approximation.
- Finite differences are limited by truncation error at large $h$ and round-off error at small $h$; automatic differentiation is exact.
{{< /note >}}

{{< quiz >}}
- q: "What is the derivative of f(x) = 3x⁴ − 2x + 7?"
  options: ["12x³ − 2", "12x³ − 2x", "3x³ − 2"]
  answer: 0
  why: "Power rule term by term: 3·4x³ = 12x³, the derivative of −2x is −2, and a constant has zero slope."
- q: "At a point, f′(x) = 0 and f″(x) = −4. What is the point?"
  options: ["A minimum", "A maximum", "Not a stationary point"]
  answer: 1
  why: "The slope is zero and the curve bends downwards, like the top of a hill."
- q: "Using the chain rule, what is the derivative of e^(−3x²)?"
  options: ["e^(−3x²)", "−6x e^(−3x²)", "−3x² e^(−3x²)"]
  answer: 1
  why: "The outer function e^u has derivative e^u; the inner u = −3x² has derivative −6x; multiply them."
- q: "The second-order Taylor expansion of a potential about its minimum gives…"
  options: ["a straight line whose slope is the force", "a parabola whose curvature is the spring constant", "the exact potential"]
  answer: 1
  why: "At a minimum V′ = 0, so V ≈ V(r₀) + ½V″(r₀)(r − r₀)²: the harmonic approximation."
- q: "Why does making h extremely small make a finite-difference derivative worse?"
  options: ["The Taylor series stops converging", "Subtracting two nearly equal rounded numbers leaves mostly rounding noise, which is then divided by the tiny h", "The function cannot be evaluated at x + h"]
  answer: 1
  why: "This round-off error grows like ε/h and eventually dominates the truncation error."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. Stewart, *Calculus: Early Transcendentals*, 8th ed., Cengage Learning (2015), chapters 2–4 (limits, derivatives, applications) and 11.10 (Taylor series).
2. S. P. Thompson, *Calculus Made Easy*, Macmillan (1910); revised edition with M. Gardner, St. Martin's Press (1998). Still one of the clearest introductions to differentiation.
3. K. F. Riley, M. P. Hobson and S. J. Bence, *Mathematical Methods for Physics and Engineering*, 3rd ed., Cambridge University Press (2006), chapters 2 and 4.
4. W. H. Press, S. A. Teukolsky, W. T. Vetterling and B. P. Flannery, *Numerical Recipes: The Art of Scientific Computing*, 3rd ed., Cambridge University Press (2007), section 5.7 (numerical derivatives and the choice of step size).
5. A. G. Baydin, B. A. Pearlmutter, A. A. Radul and J. M. Siskind, "Automatic differentiation in machine learning: a survey", *Journal of Machine Learning Research* **18**(153), 1–43 (2018).
6. G. Sanderson (3Blue1Brown), *Essence of Calculus*, video series (2017), on the derivative as a zoomed-in slope.

</div>
