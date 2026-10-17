---
title: "Gradients and the Hessian"
description: "Calculus for functions of many variables: contour maps, partial derivatives as slopes of slices, the gradient vector and directional derivatives, forces as negative gradients of the energy, the Hessian and the classification of minima, maxima and saddle points, steepest-descent paths, and the multivariable chain rule."
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

## Partial derivatives

The ordinary derivative measures how a function changes when its single input changes. With two inputs, there are many directions in which to move. The simplest are along the coordinate axes. Hold $y$ fixed and let only $x$ vary: the function becomes an ordinary function of one variable, whose graph is a **slice** through the landscape along the $x$ direction. Its slope is the **partial derivative** with respect to $x$:

{{< eq title="Partial derivatives" say="The slope of the landscape along one axis, with every other coordinate held fixed." >}}
$$ \frac{\partial f}{\partial \textcolor{#12a594}{x}} = \lim_{h\to 0}\frac{f(x + h, y) - f(x, y)}{h}, \qquad \frac{\partial f}{\partial \textcolor{#e64980}{y}} = \lim_{h\to 0}\frac{f(x, y + h) - f(x, y)}{h} $$
- the curly $\partial$ warns that other variables exist and are held constant
- computed with the ordinary rules of differentiation, treating the other variables as constants
{{< /eq >}}

For example, if $f(x, y) = x^2 y + 3y^2$, then treating $y$ as a constant gives $\partial f/\partial x = 2xy$, and treating $x$ as a constant gives $\partial f/\partial y = x^2 + 6y$. Tick "slices" in the figure: the two small panels show the landscape cut along $x$ and along $y$ through the walker, each with its tangent line. The slopes of those tangents are the two partial derivatives.

Partial derivatives can themselves be differentiated, giving second partial derivatives such as $\partial^2 f/\partial x^2$, $\partial^2 f/\partial y^2$ and the mixed derivative $\partial^2 f/\partial x\,\partial y$. For any smooth function the mixed derivatives do not depend on the order of differentiation, $\partial^2 f/\partial x\,\partial y = \partial^2 f/\partial y\,\partial x$. This innocent-looking fact, Schwarz's theorem, is the origin of the Maxwell relations of thermodynamics, which relate measurable quantities such as $(\partial S/\partial V)_T = (\partial P/\partial T)_V$.

## The gradient

Collect the partial derivatives into a vector and something remarkable appears. The **gradient** of $f$ is

{{< eq title="The gradient" say="An arrow that points straight uphill, with a length equal to the steepness." >}}
$$ \nabla f = \begin{pmatrix} \partial f/\partial \textcolor{#12a594}{x} \\ \partial f/\partial \textcolor{#e64980}{y} \end{pmatrix}, \qquad \frac{\mathrm d f}{\mathrm d s}\bigg|_{\textcolor{#845ef7}{\mathbf u}} = \nabla f \cdot \textcolor{#845ef7}{\mathbf u} = |\nabla f|\cos\theta $$
- $\nabla$ ("nabla" or "del"): the vector of partial-derivative operators
- $\textcolor{#845ef7}{\mathbf u}$: any unit vector; $\nabla f\cdot\mathbf u$ is the **directional derivative**, the slope when walking in direction $\mathbf u$
- in $n$ dimensions, $\nabla f$ has $n$ components, one per input
{{< /eq >}}

The directional derivative formula comes from the linear approximation. Near a point, a smooth landscape looks like a tilted plane: moving by a small displacement $(\Delta x, \Delta y)$ changes $f$ by approximately $\frac{\partial f}{\partial x}\Delta x + \frac{\partial f}{\partial y}\Delta y = \nabla f \cdot \Delta\mathbf r$. Walking a distance $s$ in the direction $\mathbf u$ means $\Delta\mathbf r = s\,\mathbf u$, so the slope is $\nabla f \cdot \mathbf u$.

Three geometric facts follow from $\nabla f \cdot \mathbf u = |\nabla f|\cos\theta$, and you can verify each in the figure by turning the violet compass arrow. The slope is largest when $\mathbf u$ points along $\nabla f$ ($\theta = 0$): **the gradient points in the direction of steepest ascent**, and its length $|\nabla f|$ is that steepest slope. The slope is most negative in the opposite direction, $-\nabla f$, the direction of steepest descent. And the slope is zero when $\mathbf u$ is perpendicular to $\nabla f$: walking at right angles to the gradient keeps you at constant height, so **the gradient is perpendicular to the contour lines**. Tick "arrow field" to see $-\nabla f$ drawn across the whole map: the arrows cut every contour at right angles and grow longer where the contours crowd together.

## Forces as gradients

For a system of atoms with potential energy $V(\mathbf r_1, \dots, \mathbf r_N)$, the force on atom $i$ is the negative gradient of the energy with respect to that atom's position:

{{< eq title="Force from the energy landscape" say="Each atom is pushed in the direction that lowers the total energy fastest." >}}
$$ \textcolor{#f08c2e}{\mathbf F_i} = -\nabla_{\mathbf r_i} \textcolor{#d4a017}{V} = -\begin{pmatrix} \partial V/\partial x_i \\ \partial V/\partial y_i \\ \partial V/\partial z_i \end{pmatrix} $$
- the full set of forces is $-\nabla V$ in the $3N$-dimensional configuration space
- at equilibrium every force vanishes: $\nabla V = \mathbf 0$
{{< /eq >}}

This is the many-dimensional version of $F = -\mathrm dV/\mathrm dx$, and it is the single most important formula in molecular simulation: every MD step computes it. For a pair potential that depends only on the distance $r_{ij} = |\mathbf r_j - \mathbf r_i|$ between two atoms, the chain rule gives $\mathbf F_i = V'(r_{ij})\,(\mathbf r_j - \mathbf r_i)/r_{ij}$, a force along the line joining the atoms, and the force on atom $j$ is exactly opposite: Newton's third law follows automatically from the energy depending only on distances. It is also why machine-learned interatomic potentials are built to predict an energy and then obtain forces by differentiating it, which guarantees that the forces are consistent with energy conservation, as [the chapter on MLIPs](../mlip/) explains.

## Stationary points and the Hessian

Points where the gradient vanishes are **stationary points**. In one dimension they are minima or maxima. In two or more dimensions there is a third possibility, the **saddle point**: a minimum along one direction and a maximum along another, like the middle of a horse's saddle or the highest point of a mountain pass on the lowest route between two valleys. Drag the walker to the middle of the two-valley landscape, at the origin: the gradient arrows disappear, yet the point is clearly neither a summit nor a valley floor.

To tell these apart one needs the second derivatives, arranged in a symmetric matrix called the **Hessian**:

{{< eq title="The Hessian matrix" say="The curvature of the landscape in every direction, packed into a matrix whose eigenvalues are the principal curvatures." >}}
$$ \mathbf H = \begin{pmatrix} \dfrac{\partial^2 f}{\partial x^2} & \dfrac{\partial^2 f}{\partial x\,\partial y} \\[2mm] \dfrac{\partial^2 f}{\partial y\,\partial x} & \dfrac{\partial^2 f}{\partial y^2} \end{pmatrix}, \qquad f(\mathbf r_0 + \Delta\mathbf r) \approx f(\mathbf r_0) + \nabla f\cdot\Delta\mathbf r + \tfrac12\,\Delta\mathbf r^{\mathsf T}\mathbf H\,\Delta\mathbf r $$
- all eigenvalues positive: a **minimum**; all negative: a **maximum**; mixed signs: a **saddle point**
- the eigenvectors give the directions of greatest and least curvature
{{< /eq >}}

The second formula is the Taylor series in several variables. At a stationary point the gradient term vanishes and the landscape is locally a quadratic bowl, dome or saddle described by $\mathbf H$. Because $\mathbf H$ is symmetric, it has real eigenvalues and perpendicular eigenvectors ([the chapter on matrices](../vectors-and-matrices/) explains why). Tick "curvature" in the figure: the walker now carries two perpendicular bars along the Hessian's eigenvectors, gold for positive curvature and rose for negative. At the bottom of either valley of the two-valley landscape both bars are gold, with eigenvalues 8 and 2.4. At the pass the bar across the valley is rose with eigenvalue $-4$ and the bar along it is gold: one downhill direction, the signature of a saddle.

In chemistry these ideas have direct physical meaning. Minima of the potential energy surface are stable or metastable structures. The eigenvalues of the mass-weighted Hessian at a minimum are the squares of the vibrational frequencies, and the eigenvectors are the normal modes. A **first-order saddle point**, with exactly one negative eigenvalue, is a **transition state**: the highest point on the lowest-energy path between two minima. Its energy above the reactant minimum is the activation barrier that enters the Arrhenius law, and the eigenvector of its negative eigenvalue points along the reaction coordinate.

## Following the gradient downhill

A ball released on a landscape, with enough friction that it never builds up speed, follows the steepest-descent direction $-\nabla f$ at every moment. Its path is a **steepest-descent path**, and it ends at a minimum (or, if released exactly on a ridge, at a saddle). Press "roll downhill" in the figure from several starting points. Every start on one side of the pass ends in one valley and every start on the other side ends in the other: the set of starting points that drain into a minimum is that minimum's **basin of attraction**, and the boundary between basins runs through the saddle.

Turning this into an algorithm gives **gradient descent**: repeat $\mathbf r \leftarrow \mathbf r - \eta\,\nabla f(\mathbf r)$ with a small step $\eta$. It is the method used to minimise the energy of a structure before a simulation, and, with the energy replaced by a loss function, the method by which every neural network is trained ([the chapter on gradient descent](../gradient-descent/)). Its weakness shows on the long curved valley. There the gradient points mostly across the valley rather than along it, because the walls are much steeper than the floor, so steepest descent zigzags from wall to wall and crawls along the floor. The cause is visible in the Hessian: its eigenvalues differ by a large factor, a situation called **ill-conditioning**. Better methods either rescale the directions (Newton's method uses $\mathbf H^{-1}\nabla f$, and quasi-Newton methods such as L-BFGS build up an approximation to it) or add momentum, which averages out the zigzag.

The steepest-descent path from a transition state down into the two minima it connects is the **minimum energy path**, also called the intrinsic reaction coordinate. Methods such as the nudged elastic band find it by relaxing a chain of images of the system towards the path, and it provides the reaction coordinate for many rate calculations.

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
- Gradient descent follows $-\nabla f$; it struggles in ill-conditioned valleys. The multivariable chain rule multiplies Jacobians and underlies backpropagation.
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
{{< /quiz >}}

## References and further reading

<div class="refs">

1. J. Stewart, *Calculus: Early Transcendentals*, 8th ed., Cengage Learning (2015), chapter 14 (partial derivatives, gradients, directional derivatives, extrema).
2. K. F. Riley, M. P. Hobson and S. J. Bence, *Mathematical Methods for Physics and Engineering*, 3rd ed., Cambridge University Press (2006), chapters 5 and 10.
3. D. J. Wales, *Energy Landscapes: Applications to Clusters, Biomolecules and Glasses*, Cambridge University Press (2003). Stationary points, basins and pathways on potential energy surfaces.
4. K. Müller and L. D. Brown, "Location of saddle points and minimum energy paths by a constrained simplex optimization procedure", *Theoretica Chimica Acta* **53**, 75–93 (1979).
5. G. Henkelman, B. P. Uberuaga and H. Jónsson, "A climbing image nudged elastic band method for finding saddle points and minimum energy paths", *Journal of Chemical Physics* **113**, 9901–9904 (2000).
6. J. Nocedal and S. J. Wright, *Numerical Optimization*, 2nd ed., Springer (2006), chapters 2–3 and 6–7 (line search, Newton and quasi-Newton methods, L-BFGS).

</div>
