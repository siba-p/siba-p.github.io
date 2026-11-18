---
title: "Gradients and the Hessian"
description: "Calculus for functions of many variables: contour maps, partial derivatives as slopes of slices, the gradient vector and directional derivatives, forces as negative gradients of the energy, the Hessian and the classification of minima, maxima and saddle points, steepest-descent paths, and the multivariable chain rule."
hook: "A chemical reaction typically crosses its energy landscape at a mountain pass: a maximum along one direction and a minimum along all the others. The gradient and the Hessian are how such passes are found and told apart from valleys."
objectives:
  - "Compute partial derivatives and assemble them into the gradient vector"
  - "Explain why the gradient points straight uphill and is perpendicular to contour lines"
  - "Derive the forces on atoms as negative gradients of the potential energy"
  - "Classify stationary points as minima, maxima or saddles from the Hessian's eigenvalues"
  - "Diagnose why steepest descent zigzags in ill-conditioned valleys"
cover: "cover.svg"
milestones:
  - year: 1788
    text: "Joseph-Louis Lagrange's Mécanique analytique builds mechanics on energy and its derivatives"
  - year: 1847
    text: "Augustin-Louis Cauchy proposes steepest descent for solving systems of equations"
  - year: 1979
    text: "Klaus Müller and Leo Brown publish their two-dimensional test surface for reaction paths"
  - year: 2000
    text: "Henkelman, Uberuaga and Jónsson introduce the climbing-image nudged elastic band"
track: linalg
weight: 2
level: Foundation
prereqs: ["derivatives", "vectors-and-matrices"]
lab: "Walk on an energy landscape: read the gradient, roll downhill, and classify stationary points by their curvature"
---

## Functions of several variables

The energy of a diatomic molecule depends on one number, the bond length. The energy of a water molecule depends on two bond lengths and an angle, and the energy of a protein on the positions of thousands of atoms. The loss of a neural network depends on every one of its weights, often millions of them. Almost every function that matters in simulation and machine learning has many inputs, and this chapter extends the calculus of [derivatives](../derivatives/) to them.

A function of two variables, $f(x, y)$, assigns a number to each point of the plane. It can be drawn as a surface hovering over the plane, with height $f(x, y)$ above each point, which is why such functions are often called **landscapes**. A surface is hard to read on a flat page, so the more useful picture is a **contour map**, like the maps hikers use. Each contour line joins points of equal height, $f(x, y) = \text{constant}$. Where contours crowd together the ground is steep; where they are far apart it is nearly flat. Closed rings of contours surround summits and valley floors, and a figure-of-eight pattern marks a mountain pass.

{{< widget name="landscape" title="An energy landscape and its gradient" caption="Colour shows height (pale is low, intense is high) and dark lines are contours. Drag the blue walker. Teal: the gradient ∇f, pointing straight uphill. Orange: −∇f, the steepest way down. Violet: a compass direction u, whose slope is the dot product ∇f · u." opts=`{"land":"pass"}` >}}

The landscapes in the figure are chosen because they have the features found on real potential energy surfaces. The bowl has a single minimum. The long curved valley is gently sloped along its floor and very steep across it, a shape that defeats simple optimisation methods. The landscape with two valleys has two stable states separated by a pass, the simplest model of a chemical reaction or a structural transition. The three-basin landscape is a sum of Gaussian wells in the spirit of the Müller–Brown surface, a standard two-dimensional test problem for reaction-path methods.

{{< fig src="surface.svg" alt="A double-well surface drawn in three dimensions with its contour lines projected below, next to the same landscape as a flat contour map with two minima and a saddle marked" caption="The two-valley landscape $f = (x^2 - 2)^2/2 + 1.2y^2$ as a surface and as a contour map. The orange contour at $f = 2$ passes through the saddle and crosses itself there in the figure-of-eight that marks a pass." >}}

## Partial derivatives

The ordinary derivative measures how a function changes when its single input changes. With two inputs, there are many directions in which to move. The simplest are along the coordinate axes. Hold $y$ fixed and let only $x$ vary: the function becomes an ordinary function of one variable, whose graph is a **slice** through the landscape along the $x$ direction. Its slope is the **partial derivative** with respect to $x$:

{{< eq title="Partial derivatives" say="The slope of the landscape along one axis, with every other coordinate held fixed." >}}
$$ \frac{\partial f}{\partial \textcolor{#12a594}{x}} = \lim_{h\to 0}\frac{f(x + h, y) - f(x, y)}{h}, \qquad \frac{\partial f}{\partial \textcolor{#e64980}{y}} = \lim_{h\to 0}\frac{f(x, y + h) - f(x, y)}{h} $$
- the curly $\partial$ warns that other variables exist and are held constant
- computed with the ordinary rules of differentiation, treating the other variables as constants
{{< /eq >}}

For example, if $f(x, y) = x^2 y + 3y^2$, then treating $y$ as a constant gives $\partial f/\partial x = 2xy$, and treating $x$ as a constant gives $\partial f/\partial y = x^2 + 6y$. Tick "slices" in the figure: the two small panels show the landscape cut along $x$ and along $y$ through the walker, each with its tangent line. The slopes of those tangents are the two partial derivatives.

Partial derivatives can themselves be differentiated, giving second partial derivatives such as $\partial^2 f/\partial x^2$, $\partial^2 f/\partial y^2$ and the mixed derivative $\partial^2 f/\partial x\,\partial y$. For any smooth function the mixed derivatives do not depend on the order of differentiation, $\partial^2 f/\partial x\,\partial y = \partial^2 f/\partial y\,\partial x$. A physical example: for one mole of ideal gas, $P = RT/V$. At 300 K and 24.94 L, where $P = 100.0$ kPa, the partial derivatives are $\partial P/\partial T = R/V = 333$ Pa/K and $\partial P/\partial V = -RT/V^2 = -P/V = -4.01$ kPa per litre. Compressing the gas by one litre therefore raises the pressure twelve times more than heating it by one kelvin. Differentiating either partial derivative with respect to the other variable gives the same mixed derivative, $-R/V^2 = -13.4$ Pa per litre per kelvin.

This innocent-looking fact, Schwarz's theorem, is the origin of the Maxwell relations of thermodynamics, which relate measurable quantities such as $(\partial S/\partial V)_T = (\partial P/\partial T)_V$.

## The gradient

Collect the partial derivatives into a vector and you get the most useful object in this chapter. The **gradient** of $f$ is

{{< eq title="The gradient" say="An arrow that points straight uphill, with a length equal to the steepness." >}}
$$ \nabla f = \begin{pmatrix} \partial f/\partial \textcolor{#12a594}{x} \\ \partial f/\partial \textcolor{#e64980}{y} \end{pmatrix}, \qquad \frac{\mathrm d f}{\mathrm d s}\bigg|_{\textcolor{#845ef7}{\mathbf u}} = \nabla f \cdot \textcolor{#845ef7}{\mathbf u} = |\nabla f|\cos\theta $$
- $\nabla$ ("nabla" or "del"): the vector of partial-derivative operators
- $\textcolor{#845ef7}{\mathbf u}$: any unit vector; $\nabla f\cdot\mathbf u$ is the **directional derivative**, the slope when walking in direction $\mathbf u$
- in $n$ dimensions, $\nabla f$ has $n$ components, one per input
{{< /eq >}}

The directional derivative formula comes from the linear approximation. Near a point, a smooth landscape looks like a tilted plane: moving by a small displacement $(\Delta x, \Delta y)$ changes $f$ by approximately $\frac{\partial f}{\partial x}\Delta x + \frac{\partial f}{\partial y}\Delta y = \nabla f \cdot \Delta\mathbf r$. Walking a distance $s$ in the direction $\mathbf u$ means $\Delta\mathbf r = s\,\mathbf u$, so the slope is $\nabla f \cdot \mathbf u$.

Three geometric facts follow from $\nabla f \cdot \mathbf u = |\nabla f|\cos\theta$, and you can verify each in the figure by turning the violet compass arrow. The slope is largest when $\mathbf u$ points along $\nabla f$ ($\theta = 0$): **the gradient points in the direction of steepest ascent**, and its length $|\nabla f|$ is that steepest slope. The slope is most negative in the opposite direction, $-\nabla f$, the direction of steepest descent. And the slope is zero when $\mathbf u$ is perpendicular to $\nabla f$: walking at right angles to the gradient keeps you at constant height, so **the gradient is perpendicular to the contour lines**. Tick "arrow field" to see $-\nabla f$ drawn across the whole map: the arrows cut every contour at right angles and grow longer where the contours crowd together.

For the example $f = x^2y + 3y^2$, the gradient at $(1, 2)$ is $(2xy,\, x^2 + 6y) = (4, 13)$. The steepest slope there is $|\nabla f| = \sqrt{185} = 13.6$, almost entirely in the $y$ direction. Walking along the diagonal $\mathbf u = (1, 1)/\sqrt2$ gives a slope of $(4 + 13)/\sqrt2 = 12.0$, and walking along $\mathbf u = (13, -4)/\sqrt{185}$, perpendicular to the gradient, gives zero: that is the direction of the contour line through the point.

{{< note type="warn" title="Myth" >}}
"The negative gradient points towards the minimum." It points in the direction of fastest local descent, which is a different thing. On $f = \tfrac12(x^2 + 100y^2)$ at the point $(10, 1)$, the minimum lies in the direction $(-10, -1)$, but $-\nabla f = (-10, -100)$: the two directions are 79° apart. In a narrow valley the gradient points almost straight at the nearest wall. This is the geometric origin of the zigzag of steepest descent discussed below.
{{< /note >}}

## Forces as gradients

For a system of atoms with potential energy $V(\mathbf r_1, \dots, \mathbf r_N)$, the force on atom $i$ is the negative gradient of the energy with respect to that atom's position:

{{< eq title="Force from the energy landscape" say="Each atom is pushed in the direction that lowers the total energy fastest." >}}
$$ \textcolor{#f08c2e}{\mathbf F_i} = -\nabla_{\mathbf r_i} \textcolor{#d4a017}{V} = -\begin{pmatrix} \partial V/\partial x_i \\ \partial V/\partial y_i \\ \partial V/\partial z_i \end{pmatrix} $$
- the full set of forces is $-\nabla V$ in the $3N$-dimensional configuration space
- at equilibrium every force vanishes: $\nabla V = \mathbf 0$
{{< /eq >}}

This is the many-dimensional version of $F = -\mathrm dV/\mathrm dx$, and it is the single most important formula in molecular simulation: every MD step computes it. For a pair potential that depends only on the distance $r_{ij} = |\mathbf r_j - \mathbf r_i|$ between two atoms, the chain rule gives $\mathbf F_i = V'(r_{ij})\,(\mathbf r_j - \mathbf r_i)/r_{ij}$, a force along the line joining the atoms, and the force on atom $j$ is exactly opposite: Newton's third law follows automatically from the energy depending only on distances.

As a worked example, take two argon atoms with Lennard-Jones parameters $\varepsilon = 0.997$ kJ/mol and $\sigma = 3.405$ Å, at $\mathbf r_1 = (0, 0, 0)$ and $\mathbf r_2 = (2.4, 3.2, 0)$ Å, so $r_{12} = 4.0$ Å, slightly beyond the minimum at $2^{1/6}\sigma = 3.82$ Å. The derivative of $V = 4\varepsilon[(\sigma/r)^{12} - (\sigma/r)^6]$ at 4.0 Å is $V'(r) = +0.544$ kJ mol⁻¹ Å⁻¹; it is positive because the energy still rises as the atoms separate. The unit vector from atom 1 to atom 2 is $(0.6, 0.8, 0)$, so $\mathbf F_1 = 0.544 \times (0.6, 0.8, 0) = (0.326, 0.435, 0)$ kJ mol⁻¹ Å⁻¹, pointing towards atom 2, and $\mathbf F_2 = -\mathbf F_1$. The pair attracts, as it must beyond the minimum. [The chapter on potential energy surfaces](../potential-energy-surfaces/) checks such analytic forces against finite differences. It is also why machine-learned interatomic potentials are built to predict an energy and then obtain forces by differentiating it, which guarantees that the forces are consistent with energy conservation, as [the chapter on MLIPs](../mlip/) explains.

{{< note type="practice" title="Back of the envelope" >}}
A solvated protein of 30 000 atoms has 90 000 coordinates. Central finite differences need two energy evaluations per coordinate, 180 000 in all, for a single set of forces. Analytic differentiation, or reverse-mode automatic differentiation of the energy code, delivers all 90 000 components for a small constant multiple of one energy evaluation, typically two to four. At a nanosecond of MD, $5 \times 10^5$ steps of 2 fs, the difference is between a day of computing and about 160 years. Every production MD code and every MLIP framework computes forces analytically or by automatic differentiation for this reason.
{{< /note >}}

## Stationary points and the Hessian

Points where the gradient vanishes are **stationary points**. In one dimension they are minima or maxima. In two or more dimensions there is a third possibility, the **saddle point**: a minimum along one direction and a maximum along another, like the middle of a horse's saddle or the highest point of a mountain pass on the lowest route between two valleys. Drag the walker to the middle of the two-valley landscape, at the origin: the gradient arrows disappear, yet the point is clearly neither a summit nor a valley floor.

To tell these apart one needs the second derivatives, arranged in a symmetric matrix called the **Hessian**, named after the German mathematician Ludwig Otto Hesse:

{{< eq title="The Hessian matrix" say="The curvature of the landscape in every direction, packed into a matrix whose eigenvalues are the principal curvatures." >}}
$$ \mathbf H = \begin{pmatrix} \dfrac{\partial^2 f}{\partial x^2} & \dfrac{\partial^2 f}{\partial x\,\partial y} \\[2mm] \dfrac{\partial^2 f}{\partial y\,\partial x} & \dfrac{\partial^2 f}{\partial y^2} \end{pmatrix}, \qquad f(\mathbf r_0 + \Delta\mathbf r) \approx f(\mathbf r_0) + \nabla f\cdot\Delta\mathbf r + \tfrac12\,\Delta\mathbf r^{\mathsf T}\mathbf H\,\Delta\mathbf r $$
- all eigenvalues positive: a **minimum**; all negative: a **maximum**; mixed signs: a **saddle point**
- the eigenvectors give the directions of greatest and least curvature
{{< /eq >}}

The second formula is the Taylor series in several variables. At a stationary point the gradient term vanishes and the landscape is locally a quadratic bowl, dome or saddle described by $\mathbf H$. Because $\mathbf H$ is symmetric, it has real eigenvalues and perpendicular eigenvectors ([the chapter on matrices](../vectors-and-matrices/) explains why). Tick "curvature" in the figure: the walker now carries two perpendicular bars along the Hessian's eigenvectors, gold for positive curvature and rose for negative. At the bottom of either valley of the two-valley landscape both bars are gold, with eigenvalues 8 and 2.4. At the pass the bar across the valley is rose with eigenvalue $-4$ and the bar along it is gold: one downhill direction, the signature of a saddle.

These numbers follow from two lines of calculus. For $f = (x^2 - 2)^2/2 + 1.2y^2$, the first derivatives are $\partial f/\partial x = 2x(x^2 - 2)$ and $\partial f/\partial y = 2.4y$, which vanish at $(0, 0)$ and $(\pm\sqrt2, 0)$. The second derivatives are $\partial^2 f/\partial x^2 = 6x^2 - 4$, $\partial^2 f/\partial y^2 = 2.4$ and a mixed derivative of zero, so the Hessian is already diagonal. At the origin its entries are $-4$ and $2.4$; at $x = \pm\sqrt2$ they are $6 \times 2 - 4 = 8$ and $2.4$. In two dimensions a quick test avoids computing eigenvalues: $\det\mathbf H$, the product of the eigenvalues, is negative at a saddle and positive at a minimum or maximum, and the sign of the trace separates those two.

In chemistry these ideas have direct physical meaning. Minima of the potential energy surface are stable or metastable structures. The eigenvalues of the mass-weighted Hessian at a minimum are the squares of the vibrational frequencies, and the eigenvectors are the normal modes. A **first-order saddle point**, with exactly one negative eigenvalue, is a **transition state**: the highest point on the lowest-energy path between two minima. Its energy above the reactant minimum is the activation barrier that enters the Arrhenius law, and the eigenvector of its negative eigenvalue points along the reaction coordinate.

{{< note type="practice" title="From the lab" >}}
A negative eigenvalue of the mass-weighted Hessian gives an imaginary frequency, $\omega = \sqrt{\lambda}$, which Gaussian, ORCA and VASP print as a negative or "i"-marked wavenumber. After a transition-state optimisation the frequency calculation is the proof of success: exactly one imaginary frequency, whose displacement vector moves the atoms along the expected reaction (a proton between donor and acceptor, a bond forming), typically of several hundred to over a thousand i cm⁻¹ for bond-breaking steps. Two imaginary frequencies mean a higher-order saddle, and the search must continue. A single small imaginary frequency of 10 to 50 i cm⁻¹ at a supposed minimum is usually numerical noise from a loose optimisation or a coarse DFT integration grid, or a methyl rotor that has not settled; displacing along that mode and re-optimising with tighter thresholds removes it. A real imaginary frequency at a "minimum" means the structure is a saddle, as happens for a symmetric geometry imposed by the input that the molecule does not prefer.
{{< /note >}}

{{< note type="warn" title="Myth" >}}
"A point where the gradient vanishes is a minimum." In one dimension that is a reasonable first guess; in many dimensions it is usually wrong. A stationary point is a minimum only if all $n$ Hessian eigenvalues are positive, and on high-dimensional landscapes saddles far outnumber minima. Dauphin and co-workers (2014) argued that the plateaus slowing the training of neural networks are mostly saddle regions rather than poor local minima. In geometry optimisation, a structure built with too much symmetry can converge to a saddle because the gradient along every symmetry-breaking direction is exactly zero. The check is the same in both fields: inspect the Hessian, or nudge the structure and optimise again.
{{< /note >}}

## Following the gradient downhill

A ball released on a landscape, with enough friction that it never builds up speed, follows the steepest-descent direction $-\nabla f$ at every moment. Its path is a **steepest-descent path**, and it ends at a minimum (or, if released exactly on a ridge, at a saddle). Press "roll downhill" in the figure from several starting points. Every start on one side of the pass ends in one valley and every start on the other side ends in the other: the set of starting points that drain into a minimum is that minimum's **basin of attraction**, and the boundary between basins runs through the saddle.

Turning this into an algorithm gives **gradient descent**: repeat $\mathbf r \leftarrow \mathbf r - \eta\,\nabla f(\mathbf r)$ with a small step $\eta$. It is the method used to minimise the energy of a structure before a simulation, and, with the energy replaced by a loss function, the method by which every neural network is trained ([the chapter on gradient descent](../gradient-descent/)). Its weakness shows on the long curved valley. There the gradient points mostly across the valley rather than along it, because the walls are much steeper than the floor, so steepest descent zigzags from wall to wall and crawls along the floor. The cause is visible in the Hessian: its eigenvalues differ by a large factor, a situation called **ill-conditioning**. Better methods either rescale the directions (Newton's method uses $\mathbf H^{-1}\nabla f$, and quasi-Newton methods such as L-BFGS build up an approximation to it) or add momentum, which averages out the zigzag.

Why Newton's step works follows from the Taylor series. Near $\mathbf r_0$ the gradient is $\nabla f(\mathbf r_0 + \Delta\mathbf r) \approx \nabla f(\mathbf r_0) + \mathbf H\,\Delta\mathbf r$; setting this to zero gives $\Delta\mathbf r = -\mathbf H^{-1}\nabla f$. On an exactly quadratic landscape one Newton step lands on the minimum, however elongated the valley, because multiplying by $\mathbf H^{-1}$ undoes the stretching. For steepest descent with the best fixed step, the distance to the minimum of a quadratic shrinks by a factor $(\kappa - 1)/(\kappa + 1)$ per step, where $\kappa$ is the ratio of the largest to the smallest Hessian eigenvalue. At the valley floors of the two-valley landscape $\kappa = 8/2.4 = 3.3$, and each step removes nearly half of the remaining distance; for a molecular crystal with stiff bonds and soft intermolecular modes, $\kappa$ can reach $10^3$ to $10^4$ in Cartesian coordinates, and steepest descent needs thousands of steps. Geometry optimisers in quantum chemistry therefore use quasi-Newton updates, usually in internal coordinates whose Hessian is better conditioned, and [the chapter on gradient descent](../gradient-descent/) treats the machine-learning variants.

{{< note type="story" >}}
Steepest descent is older than the computers that use it. Augustin-Louis Cauchy described it in a short note to the Paris Academy of Sciences in 1847 as a general method for solving systems of simultaneous equations: write the problem as finding the zero of a positive function and step against its partial derivatives. The method waited a century for machines fast enough to take thousands of steps.
{{< /note >}}

The steepest-descent path from a transition state down into the two minima it connects is the **minimum energy path**, also called the intrinsic reaction coordinate. Methods such as the nudged elastic band find it by relaxing a chain of images of the system towards the path, and it provides the reaction coordinate for many rate calculations.

The Müller–Brown surface shows all of this on one map. It is a sum of four two-dimensional Gaussians, published in 1979 as a test for saddle-point searches, with three minima and two first-order saddles. Solving $\nabla V = 0$ with Newton's method gives the minima A at $(-0.558, 1.442)$ with energy $-146.7$, B at $(0.623, 0.028)$ with $-108.2$ and C at $(-0.050, 0.467)$ with $-80.8$, and saddles S1 at $(-0.822, 0.624)$ with $-40.7$ and S2 at $(0.212, 0.293)$ with $-72.2$, in the arbitrary units of the original paper. Each saddle has one negative Hessian eigenvalue, about $-750$ at S1 and $-735$ at S2. Stepping off each saddle along that eigenvector and following $-\nabla V$ downhill traces the minimum energy path A–S1–C–S2–B.

{{< fig src="mueller-brown.svg" alt="Contour map of the Müller–Brown surface with three minima, two saddle points and the minimum energy path, beside a plot of energy along the path showing two barriers" caption="Left: the minimum energy path (orange) through the three minima (A, B, C) and two saddles (S1, S2). Right: energy along the path. Leaving the deep basin A costs 106.0 units; from the shallow intermediate C, the hop over S2 to B costs only 8.5." >}}

The energy profile turns the map into kinetics. The barrier out of A over S1 is 106.0, from C back over S1 it is 40.1, from C over S2 it is 8.5, and from B back over S2 it is 35.9. Through the Arrhenius factor $e^{-\Delta E/k_BT}$ these differences become rates differing by many orders of magnitude, and C behaves as a short-lived intermediate, drained quickly towards B. Real reaction mechanisms are read from profiles of exactly this kind, computed with DFT on surfaces of hundreds of dimensions. [The chapter on reaction rates](../es-rates/) turns barriers into rate constants.

{{< note type="practice" title="From the lab" >}}
A typical climbing-image NEB calculation, as introduced by Henkelman, Uberuaga and Jónsson in 2000, starts from two fully optimised end points, for example a vacancy and its neighbouring atom before and after a hop in a metal. Five to fifteen images are interpolated between them, linearly or with the image-dependent pair potential method, and the band is relaxed with springs along the path and only the perpendicular component of $-\nabla V$ acting on each image. The highest image is then switched to climbing mode, often only after the band has partly relaxed: its force component along the path is reversed, so it climbs to the saddle. The run is considered converged when all perpendicular forces are below about 0.05 eV/Å, and the result is confirmed by a frequency calculation on the climbing image showing one imaginary mode. Interpolations that pass atoms through each other, and end points that were not relaxed with the same settings, are the usual causes of failure.
{{< /note >}}

## Constrained minima and Lagrange multipliers

Many optimisation problems carry a constraint. A bond length in a rigid water model is held fixed while the rest of the molecule moves; an entropy is maximised while the total energy is held fixed; a material composition must sum to one. The gradient gives a geometric answer. Suppose $f(x, y)$ is to be minimised on the curve $g(x, y) = c$. Walking along the constraint curve, $f$ changes at a rate equal to the component of $\nabla f$ along the curve. At a constrained minimum that component must vanish, so $\nabla f$ is perpendicular to the curve. But $\nabla g$ is also perpendicular to the curve, because the curve is a contour of $g$. The two gradients must therefore be parallel:

{{< eq title="Lagrange's condition" say="At a constrained optimum the gradient of the objective is a multiple of the gradient of the constraint." >}}
$$ \nabla \textcolor{#12a594}{f} = \textcolor{#d4a017}{\lambda}\,\nabla \textcolor{#845ef7}{g}, \qquad \textcolor{#845ef7}{g}(x, y) = c $$
- $\textcolor{#d4a017}{\lambda}$: the **Lagrange multiplier**, an extra unknown; it equals $\mathrm df_{\min}/\mathrm dc$, how fast the optimum moves as the constraint is relaxed
- equivalently, find the stationary points of $L = f - \lambda(g - c)$ with respect to $x$, $y$ and $\lambda$
{{< /eq >}}

Take $f = x^2 + 2y^2$ on the line $x + y = 3$. The condition $(2x, 4y) = \lambda(1, 1)$ gives $x = 2y$, and the constraint then gives $y = 1$, $x = 2$, with $f = 6$ and $\lambda = 4$. The multiplier has a meaning: moving the line to $x + y = 3.1$ raises the constrained minimum by about $4 \times 0.1 = 0.4$. In the figure the contour $f = 6$ just touches the line at $(2, 1)$; at any other point of the line a contour crosses it, and sliding along the line in one direction lowers $f$.

{{< fig src="lagrange.svg" alt="Elliptical contours of f, a straight constraint line, the contour tangent to the line at the optimum with parallel gradient arrows, and a second point where the gradient has a component along the line" caption="At the constrained minimum (2, 1) the contour of $f$ is tangent to the constraint and $\nabla f = 4\,\nabla g$. At (0.6, 2.4) the gradient has a component along the line (orange), so $f$ can still be lowered without leaving it." >}}

The method, from Lagrange's *Mécanique analytique* of 1788, appears throughout statistical mechanics and simulation. Maximising the entropy $S = -k_B\sum_i p_i\ln p_i$ subject to $\sum_i p_i = 1$ and a fixed mean energy $\sum_i p_i E_i = U$ gives, after setting the derivative with respect to each $p_i$ to zero, $p_i \propto e^{-\beta E_i}$: the multiplier of the energy constraint is $\beta = 1/k_BT$, and the [Boltzmann distribution](../boltzmann-and-maxwell/) follows. In molecular dynamics the SHAKE algorithm of Ryckaert, Ciccotti and Berendsen (1977) holds bond lengths fixed by adding constraint forces $\lambda_k\nabla g_k$ along the gradients of the constraints, with multipliers solved for at every step; constraining bonds to hydrogen this way is what allows a 2 fs time step instead of 0.5 to 1 fs.

## The multivariable chain rule

Suppose a quantity $f$ depends on $x$ and $y$, and both depend on time: $f(x(t), y(t))$. The rate of change of $f$ along the path collects a contribution from each input:

$$
\frac{\mathrm d f}{\mathrm d t} = \frac{\partial f}{\partial x}\frac{\mathrm dx}{\mathrm dt} + \frac{\partial f}{\partial y}\frac{\mathrm dy}{\mathrm dt} = \nabla f \cdot \frac{\mathrm d\mathbf r}{\mathrm dt}.
$$

The rate of change is the gradient dotted with the velocity. Applied to the potential energy of a moving system, $\mathrm dV/\mathrm dt = \nabla V\cdot\mathbf v = -\mathbf F\cdot\mathbf v$, the negative of the power delivered by the forces, which is half of the proof that total energy is conserved in [classical mechanics](../motion-and-phase-space/).

When many variables depend on many others, the partial derivatives of the outputs with respect to the inputs form a matrix, the **Jacobian**, and the chain rule becomes multiplication of Jacobians. A neural network is a long chain of such dependencies, layer by layer, and the gradient of its loss with respect to the weights of an early layer is a product of Jacobians of all the later layers. Computing that product efficiently from the output end backwards is **backpropagation**, developed in [its own chapter](../backpropagation/). Every gradient used in modern machine learning, and every force in a machine-learned potential, is computed this way.

{{< note type="key" >}}
- A function of several variables is a landscape, drawn as a contour map. Partial derivatives are slopes of slices along the coordinate axes.
- The gradient $\nabla f$ points in the direction of steepest ascent, has length equal to that slope, and is perpendicular to contours; the slope in direction $\mathbf u$ is $\nabla f\cdot\mathbf u$.
- Forces are negative gradients of the potential energy; equilibria are points where $\nabla V = \mathbf 0$.
- The Hessian's eigenvalues classify stationary points: all positive for a minimum, mixed for a saddle. A first-order saddle is a transition state.
- Gradient descent follows $-\nabla f$; it struggles in ill-conditioned valleys. The minimum energy path joins minima through first-order saddles, and its barriers set reaction rates.
- At a constrained optimum $\nabla f = \lambda\nabla g$; Lagrange multipliers give the Boltzmann distribution and bond constraints in MD.
- The multivariable chain rule multiplies Jacobians and underlies backpropagation.
{{< /note >}}

{{< quiz >}}
- q: "For f(x, y) = x²y + 3y², what is ∂f/∂y at (1, 2)?"
  options: ["4", "13", "14"]
  answer: 1
  why: "∂f/∂y = x² + 6y = 1 + 12 = 13."
- q: "On a contour map, in which direction does the gradient point?"
  options: ["Along the contour line", "Perpendicular to the contour line, towards higher values", "Towards the nearest minimum"]
  answer: 1
  why: "Moving along a contour leaves f unchanged, so the slope there is zero and the gradient must be perpendicular to it."
- q: "The gradient at a point is (3, 4). What is the slope in the direction u = (0, 1)?"
  options: ["3", "4", "5"]
  answer: 1
  why: "∇f · u = 3·0 + 4·1 = 4. The steepest slope, along the gradient itself, would be |∇f| = 5."
- q: "At a stationary point the Hessian has eigenvalues 5.2 and −1.3. The point is…"
  options: ["a minimum", "a maximum", "a saddle point, for example a transition state"]
  answer: 2
  why: "Curvature up in one direction and down in another is a saddle."
- q: "Why does steepest descent zigzag in a long narrow valley?"
  options: ["The gradient is zero there", "The walls are much steeper than the floor, so the gradient points mostly across the valley; the Hessian is ill-conditioned", "Random noise"]
  answer: 1
  why: "Large differences between Hessian eigenvalues make the steepest direction a poor guide to the minimum."
- q: "A transition-state optimisation converges and the frequency calculation shows two imaginary frequencies. What has been found?"
  options: ["A transition state", "A second-order saddle point, which is not the transition state sought", "A minimum with numerical noise"]
  answer: 1
  why: "A transition state has exactly one negative Hessian eigenvalue. Two mean the structure is a maximum along two directions."
- q: "Minimise f = x² + 2y² on the line x + y = 3. What is the Lagrange multiplier?"
  options: ["1", "4", "6"]
  answer: 1
  why: "∇f = (2x, 4y) = λ(1, 1) gives x = 2y; with x + y = 3, (x, y) = (2, 1) and λ = 4 = d(f_min)/dc."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. Stewart, *Calculus: Early Transcendentals*, 8th ed., Cengage Learning (2015), chapter 14 (partial derivatives, gradients, directional derivatives, extrema).
2. K. F. Riley, M. P. Hobson and S. J. Bence, *Mathematical Methods for Physics and Engineering*, 3rd ed., Cambridge University Press (2006), chapters 5 and 10.
3. D. J. Wales, *Energy Landscapes: Applications to Clusters, Biomolecules and Glasses*, Cambridge University Press (2003). Stationary points, basins and pathways on potential energy surfaces.
4. K. Müller and L. D. Brown, "Location of saddle points and minimum energy paths by a constrained simplex optimization procedure", *Theoretica Chimica Acta* **53**, 75–93 (1979).
5. G. Henkelman, B. P. Uberuaga and H. Jónsson, "A climbing image nudged elastic band method for finding saddle points and minimum energy paths", *Journal of Chemical Physics* **113**, 9901–9904 (2000).
6. J. Nocedal and S. J. Wright, *Numerical Optimization*, 2nd ed., Springer (2006), chapters 2–3 and 6–7 (line search, Newton and quasi-Newton methods, L-BFGS).
7. Y. N. Dauphin, R. Pascanu, C. Gulcehre, K. Cho, S. Ganguli and Y. Bengio, "Identifying and attacking the saddle point problem in high-dimensional non-convex optimization", *Advances in Neural Information Processing Systems* **27** (2014).
8. J.-P. Ryckaert, G. Ciccotti and H. J. C. Berendsen, "Numerical integration of the Cartesian equations of motion of a system with constraints: molecular dynamics of n-alkanes", *Journal of Computational Physics* **23**, 327–341 (1977).

</div>
