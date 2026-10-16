---
title: "Vectors, matrices and eigenvectors"
description: "Vectors as arrows and as lists of numbers, linear combinations and bases, length and the dot product, matrices as linear transformations of space, matrix multiplication as composition, the determinant as an area factor, linear systems, and eigenvectors and eigenvalues with their uses in vibrations, PCA and neural networks."
track: linalg
weight: 1
level: Foundation
prereqs: ["functions-and-graphs"]
lab: "Add and project vectors, and watch a matrix move the whole plane"
---

## Vectors

Some quantities are fully described by a single number: a temperature, a mass, an energy. These are **scalars**. Others need a direction as well as a size. A displacement of 3 m means nothing until you say which way; a force of 10 N pushes in some particular direction; the velocity of an atom has a speed and a heading. Such quantities are **vectors**.

A vector can be pictured as an arrow. Its length is the vector's size, or **magnitude**, and its direction is where it points. Two arrows with the same length and direction represent the same vector wherever they are drawn. The same vector can also be written as a list of numbers. Draw the arrow starting at the origin of a coordinate system; the coordinates of its tip are the vector's **components**. In two dimensions,

$$
\mathbf v = \begin{pmatrix} v_x \\ v_y \end{pmatrix},
$$

and in three dimensions a third component $v_z$ is added. Vectors are written in bold, $\mathbf v$, or with an arrow, $\vec v$.

The two pictures, arrow and list, are equally important. The arrow is how we think about vectors geometrically; the list is how we compute with them, and how a computer stores them. The power of linear algebra comes from moving freely between the two.

The list picture also frees vectors from the three dimensions of physical space. The positions of all $N$ atoms in a molecule form a single vector with $3N$ components, a point in a $3N$-dimensional configuration space. A material can be described by a vector of features: its composition, density, band gap and so on. An image of $28 \times 28$ pixels is a vector with 784 components. We cannot draw arrows in 784 dimensions, but every rule in this topic works in any number of dimensions, and the two-dimensional pictures are faithful guides to what happens there.

## Adding and scaling vectors

Two operations define what a vector is. **Addition** is done component by component, $\mathbf a + \mathbf b = (a_x + b_x,\, a_y + b_y)$, and geometrically it means placing the arrows tip to tail: walk along $\mathbf a$, then along $\mathbf b$, and the sum is the arrow from start to finish. Because it does not matter which arrow is walked first, the two routes form a parallelogram whose diagonal is the sum. Forces combine this way: the net force on an atom is the vector sum of the forces from all its neighbours.

**Scalar multiplication** multiplies every component by the same number, $c\,\mathbf a = (c\,a_x,\, c\,a_y)$. Geometrically it stretches the arrow by the factor $c$, and a negative $c$ also reverses its direction. Subtraction combines the two: $\mathbf a - \mathbf b = \mathbf a + (-1)\mathbf b$, the arrow from the tip of $\mathbf b$ to the tip of $\mathbf a$. The vector from atom $i$ to atom $j$ is $\mathbf r_j - \mathbf r_i$, and its length is the interatomic distance.

{{< widget name="vecplay" title="Vectors as arrows and as numbers" caption="Drag the tips of a and b. Choose an operation and compare the arrow construction with the components listed below. In dot-product mode the thick bar is the projection of b onto a's direction: teal when it points along a, rose when it points against it." >}}

A sum of scaled vectors, $c_1\mathbf a + c_2\mathbf b$, is called a **linear combination**. Every vector in the plane can be written as a linear combination of the two **unit vectors** $\hat{\mathbf i} = (1, 0)$ and $\hat{\mathbf j} = (0, 1)$: the components of a vector are simply the coefficients, $\mathbf v = v_x\hat{\mathbf i} + v_y\hat{\mathbf j}$. A set of vectors from which every vector can be built in exactly one way is a **basis**, and the number of vectors in a basis is the **dimension** of the space. The pair $\hat{\mathbf i}, \hat{\mathbf j}$ is the standard basis, but any two vectors that do not point along the same line also form a basis of the plane. Crystallographers use the three lattice vectors of a unit cell as a basis, so that atomic positions are given as fractional coordinates along the cell edges.

## Length and the dot product

The length of a vector follows from Pythagoras' theorem: $|\mathbf v| = \sqrt{v_x^2 + v_y^2}$, with a third term $v_z^2$ in three dimensions and $n$ terms in $n$ dimensions. A vector of length 1 is a **unit vector**, and any non-zero vector can be turned into one by dividing it by its length.

The most useful way of combining two vectors into a number is the **dot product**:

{{< eq title="The dot product" say="Multiply matching components and add: the result measures how much two vectors point the same way." >}}
$$ \textcolor{#4c6ef5}{\mathbf a} \cdot \textcolor{#f08c2e}{\mathbf b} = a_x b_x + a_y b_y + a_z b_z = |\textcolor{#4c6ef5}{\mathbf a}|\,|\textcolor{#f08c2e}{\mathbf b}|\cos\textcolor{#d4a017}{\theta} $$
- $\textcolor{#d4a017}{\theta}$: the angle between the two arrows
- positive when the vectors point roughly the same way, zero when they are perpendicular (**orthogonal**), negative when they point roughly opposite ways
- $\mathbf a \cdot \mathbf a = |\mathbf a|^2$
{{< /eq >}}

The equality of the two formulas, one algebraic and one geometric, is the law of cosines in disguise. It means the angle between two vectors can be computed from their components: $\cos\theta = \mathbf a \cdot \mathbf b / (|\mathbf a||\mathbf b|)$. Bond angles in a molecule are computed exactly this way from atomic coordinates.

The geometric meaning is a **projection**. $\mathbf a \cdot \mathbf b / |\mathbf a|$ is the length of the shadow that $\mathbf b$ casts onto the line through $\mathbf a$. In the figure, select the dot product and rotate $\mathbf b$ around: the shadow is longest when the vectors are aligned, vanishes when they are perpendicular, and becomes negative when $\mathbf b$ points backwards. Physics uses this constantly. The work done by a force $\mathbf F$ over a displacement $\mathbf d$ is $\mathbf F \cdot \mathbf d$, since only the component of the force along the motion does work. Machine learning uses it as a measure of similarity: two feature vectors with a large positive dot product point in similar directions, and the **cosine similarity** $\cos\theta$ compares them regardless of their lengths. The attention mechanism of [transformers](../transformers/) decides how much one word should attend to another by taking dot products of vectors that represent them.

## Matrices as transformations

A **matrix** is a rectangular array of numbers. Matrices can be thought of as tables of data, but their real meaning is as **linear transformations**: functions that take a vector in and give a vector out, while keeping straight lines straight, keeping the origin fixed and keeping evenly spaced grid lines evenly spaced. Rotations, stretches, reflections and shears are all linear transformations.

The key observation is that a linear transformation is completely determined by what it does to the basis vectors. Since every vector is $\mathbf v = x\hat{\mathbf i} + y\hat{\mathbf j}$, and a linear transformation respects addition and scaling, the image of $\mathbf v$ must be $x$ times the image of $\hat{\mathbf i}$ plus $y$ times the image of $\hat{\mathbf j}$. Write the images of $\hat{\mathbf i}$ and $\hat{\mathbf j}$ as the two columns of a matrix, and the rule for multiplying a matrix by a vector follows:

{{< eq title="A matrix acting on a vector" say="The columns are where the basis arrows land; every other vector lands at the same combination of those columns." >}}
$$ \mathbf M\mathbf v = \begin{pmatrix} \textcolor{#12a594}{a} & \textcolor{#e64980}{b} \\ \textcolor{#12a594}{c} & \textcolor{#e64980}{d} \end{pmatrix} \begin{pmatrix} \textcolor{#4c6ef5}{x} \\ \textcolor{#4c6ef5}{y} \end{pmatrix} = \textcolor{#4c6ef5}{x}\begin{pmatrix} \textcolor{#12a594}{a} \\ \textcolor{#12a594}{c} \end{pmatrix} + \textcolor{#4c6ef5}{y}\begin{pmatrix} \textcolor{#e64980}{b} \\ \textcolor{#e64980}{d} \end{pmatrix} = \begin{pmatrix} ax + by \\ cx + dy \end{pmatrix} $$
- first column $(\textcolor{#12a594}{a}, \textcolor{#12a594}{c})$: where $\hat{\mathbf i}$ lands
- second column $(\textcolor{#e64980}{b}, \textcolor{#e64980}{d})$: where $\hat{\mathbf j}$ lands
- each output component is a dot product of a row of the matrix with $\mathbf v$
{{< /eq >}}

The figure below shows a matrix acting on the entire plane at once. The faint grey grid is the original plane; the blue grid is where every grid line goes. Drag the green and red arrows, which are the two columns of the matrix, and the whole grid follows. Try the presets and press play to watch the plane morph from its original state into the transformed one.

{{< widget name="lintrans" title="A matrix moves the whole plane" caption="Green î′ and red ĵ′ are the matrix columns; blue grid lines show where the original grid goes; the gold parallelogram is the image of the unit square, labelled with its area. The blue vector v and its image Mv (orange) show the column construction: x steps along î′ then y steps along ĵ′." >}}

Several transformations are worth recognising by their matrices. The identity $\begin{pmatrix}1&0\\0&1\end{pmatrix}$ does nothing. A rotation by an angle $\theta$ is $\begin{pmatrix}\cos\theta&-\sin\theta\\\sin\theta&\cos\theta\end{pmatrix}$, since it sends $\hat{\mathbf i}$ to $(\cos\theta, \sin\theta)$. A diagonal matrix $\begin{pmatrix}s_x&0\\0&s_y\end{pmatrix}$ stretches each axis separately. The shear $\begin{pmatrix}1&1\\0&1\end{pmatrix}$ slides each horizontal line sideways by an amount proportional to its height, as when a deck of cards is pushed; it is the transformation of a simulation box under shear flow. And a matrix whose two columns lie on the same line squashes the whole plane onto that line.

## Composition and matrix multiplication

Applying one transformation and then another is again a linear transformation, so it has a matrix of its own. That matrix is the **product** of the two. If $\mathbf A$ is applied first and $\mathbf B$ second, the combined transformation is $\mathbf B\mathbf A$ (read from right to left, like function composition $f(g(x))$). To find its columns, apply $\mathbf B$ to each column of $\mathbf A$; the familiar rule "row times column" for each entry follows directly.

Two consequences are important. Matrix multiplication is **not commutative**: in general $\mathbf A\mathbf B \ne \mathbf B\mathbf A$, because rotating and then shearing is not the same as shearing and then rotating. Try it with a book on a table. And a transformation that can be undone has an **inverse** matrix $\mathbf A^{-1}$ with $\mathbf A^{-1}\mathbf A = \mathbf I$, the identity. For a $2 \times 2$ matrix,

$$
\begin{pmatrix} a & b \\ c & d \end{pmatrix}^{-1} = \frac{1}{ad - bc}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix},
$$

which exists only when $ad - bc \ne 0$. That quantity has a geometric meaning of its own.

## The determinant

Watch the gold square in the transformation figure. It starts as the unit square with area 1, and the matrix turns it into a parallelogram. Every other region of the plane is scaled by the same factor, since the transformed grid cells are all identical parallelograms. That factor is the **determinant**:

{{< eq title="The determinant" say="By how much the transformation scales areas, and whether it flips the plane over." >}}
$$ \det\mathbf M = \det\begin{pmatrix} a & b \\ c & d \end{pmatrix} = ad - bc $$
- $|\det \mathbf M|$: the area of the image of the unit square (volume, in three dimensions)
- $\det \mathbf M < 0$: the transformation reverses orientation, like a mirror
- $\det \mathbf M = 0$: the plane is squashed onto a line or a point; the transformation cannot be undone
{{< /eq >}}

In the figure, the rotations have determinant 1 (areas are preserved), the stretch has determinant 1 because it doubles one axis and halves the other, the reflection has $-1$, and "squash flat" has 0: the parallelogram collapses to a line. In three dimensions the determinant of the matrix whose columns are the lattice vectors of a crystal is the volume of the unit cell, which is how simulation codes compute the volume of a triclinic box. In statistical mechanics, determinants appear whenever variables are changed in an integral, as the factor that accounts for how the change stretches volume elements.

## Linear systems

Many problems ask the reverse question: given the output $\mathbf b$, which input $\mathbf x$ produced it? That is, solve $\mathbf M\mathbf x = \mathbf b$. Written out, this is a set of simultaneous linear equations. If $\det\mathbf M \ne 0$ the transformation can be undone and there is exactly one solution, $\mathbf x = \mathbf M^{-1}\mathbf b$. If $\det\mathbf M = 0$, the plane has been squashed, so most $\mathbf b$ cannot be reached at all and those that can are reached by infinitely many $\mathbf x$.

In practice, inverses are rarely computed. Computers solve linear systems by **Gaussian elimination**, subtracting multiples of equations from one another until the system becomes triangular and can be solved from the bottom up; in matrix language this is a factorisation $\mathbf M = \mathbf L\mathbf U$ into lower- and upper-triangular pieces. Fitting a straight line or a polynomial to data by least squares, the first algorithm of [machine learning](../learning-from-data/), comes down to solving a linear system, the **normal equations** $\mathbf X^{\mathsf T}\mathbf X\,\mathbf w = \mathbf X^{\mathsf T}\mathbf y$. Gaussian processes, Kriging and kernel methods require solving systems with thousands of unknowns, and the Cholesky factorisation used for them is a specialised version of elimination for symmetric matrices.

## Eigenvectors and eigenvalues

Most vectors are knocked off their line by a transformation: in the figure, the blue vector $\mathbf v$ and its image $\mathbf M\mathbf v$ usually point in different directions. But for many matrices there are special directions that are only stretched or shrunk, never turned. A vector $\mathbf u$ along such a direction satisfies

{{< eq title="Eigenvectors and eigenvalues" say="The directions a transformation only stretches, and by how much." >}}
$$ \mathbf M\,\textcolor{#845ef7}{\mathbf u} = \textcolor{#d4a017}{\lambda}\,\textcolor{#845ef7}{\mathbf u} $$
- $\textcolor{#845ef7}{\mathbf u}$: an **eigenvector** (from the German *eigen*, "own"), a non-zero vector whose direction is unchanged
- $\textcolor{#d4a017}{\lambda}$: its **eigenvalue**, the stretch factor; negative $\lambda$ reverses the vector, zero squashes it to the origin
- the eigenvalues solve the characteristic equation $\det(\mathbf M - \lambda\mathbf I) = 0$; for $2 \times 2$ matrices, $\lambda^2 - (a + d)\lambda + (ad - bc) = 0$
{{< /eq >}}

Tick "show eigenvectors" in the transformation figure. For the symmetric matrix $\begin{pmatrix}2&1\\1&2\end{pmatrix}$, the two dashed purple lines along the diagonals are the eigen-directions: vectors on the line $y = x$ are stretched by 3, vectors on the line $y = -x$ are left alone (eigenvalue 1), and every other vector is a mixture and gets turned. The shear has only one eigen-direction, the horizontal axis. A rotation by 90° has none at all: every direction is turned, and the eigenvalues are complex numbers. Tick "what happens to a circle" as well, and you will see the unit circle become an ellipse whose axes, for a symmetric matrix, lie exactly along the eigenvectors, with semi-axes equal to the eigenvalues.

**Symmetric matrices**, those equal to their own transpose ($M_{ij} = M_{ji}$), are especially well behaved, and they are the ones that matter most in science. Their eigenvalues are always real, and their eigenvectors can always be chosen to be mutually perpendicular. Using the eigenvectors as a new basis, the matrix becomes diagonal: the transformation is just a stretch along each eigen-direction. This **spectral decomposition**, $\mathbf M = \mathbf Q\boldsymbol\Lambda\mathbf Q^{\mathsf T}$ with $\mathbf Q$ the matrix of eigenvectors and $\boldsymbol\Lambda$ the diagonal matrix of eigenvalues, appears across the sciences:

The **normal modes** of a molecule are the eigenvectors of its Hessian, the matrix of second derivatives of the energy with respect to atomic positions (mass-weighted), and the eigenvalues give the squared vibrational frequencies. A negative eigenvalue signals a saddle point rather than a minimum, which is how transition states are recognised, as [the topic on gradients](../gradients/) shows.

**Principal component analysis** finds the eigenvectors of the covariance matrix of a data set. The first eigenvector is the direction in which the data vary most, and projecting onto the first few eigenvectors gives the best low-dimensional summary of high-dimensional data, whether those are atomic trajectories or materials properties.

In **quantum mechanics** the allowed energies of a system are the eigenvalues of its Hamiltonian matrix, and the stationary states are its eigenvectors. Every electronic-structure calculation, from a Hückel model of benzene to density-functional theory, is at its heart a large symmetric eigenvalue problem.

## Matrices in machine learning and simulation

A single layer of a neural network takes an input vector $\mathbf x$, multiplies it by a weight matrix $\mathbf W$, adds a bias vector and applies a nonlinear function to each component: $\mathbf h = \sigma(\mathbf W\mathbf x + \mathbf b)$. The matrix rotates, stretches and shears the input space; the nonlinearity bends it. Stacking such layers lets a network reshape space until classes that were tangled become separable, as [the topic on how networks bend space](../networks-bend-space/) shows with the same kind of grid picture used above. Training a network means adjusting the entries of these matrices, and running one means doing matrix multiplications, which is why graphics processors, built to multiply matrices quickly, became the engines of deep learning.

In molecular simulation, the simulation box is described by a $3 \times 3$ cell matrix whose columns are the box vectors; converting between Cartesian and fractional coordinates is multiplication by this matrix or its inverse, and the box volume is its determinant. Rotation matrices orient molecules, the stress and strain of a material are $3 \times 3$ symmetric matrices whose eigenvectors are the principal axes, and the moment of inertia tensor, diagonalised, gives a molecule's principal axes of rotation. In all of these the same few ideas recur: a matrix is a transformation, its columns are the images of the basis, its determinant scales volume, and its eigenvectors are the directions it leaves unturned.

{{< note type="key" >}}
- A vector is both an arrow and a list of components. Vectors add tip to tail and scale by stretching; linear combinations of basis vectors build every vector in the space.
- The dot product $\mathbf a\cdot\mathbf b = \sum a_i b_i = |\mathbf a||\mathbf b|\cos\theta$ measures alignment and computes projections, angles, work and similarity.
- A matrix is a linear transformation whose columns are the images of the basis vectors. Matrix multiplication composes transformations and does not commute.
- The determinant is the factor by which areas or volumes are scaled; zero means the transformation cannot be undone.
- Eigenvectors are directions only stretched by the transformation, by factors equal to the eigenvalues. Symmetric matrices have real eigenvalues and perpendicular eigenvectors, which give normal modes, principal components and quantum energy levels.
{{< /note >}}

{{< quiz >}}
- q: "What is (1, 2, 3) · (4, −5, 6)?"
  options: ["12", "8", "(4, −10, 18)"]
  answer: 0
  why: "1·4 + 2·(−5) + 3·6 = 4 − 10 + 18 = 12. A dot product is a number, not a vector."
- q: "The matrix [[0, −1], [1, 0]] sends î = (1, 0) to…"
  options: ["(0, −1)", "(0, 1)", "(−1, 0)"]
  answer: 1
  why: "The first column is the image of î. This matrix is the 90° anticlockwise rotation."
- q: "A 2 × 2 matrix has determinant −2. What does it do to the unit square?"
  options: ["Maps it to a shape of area 2 and flips its orientation", "Shrinks it to area −2", "Squashes it onto a line"]
  answer: 0
  why: "|det| = 2 is the area factor; the negative sign means the plane is mirrored."
- q: "For M = [[3, 0], [0, 0.5]], which vectors are eigenvectors?"
  options: ["Only (1, 1)", "Vectors along the x axis (λ = 3) and along the y axis (λ = 0.5)", "None, because the matrix is diagonal"]
  answer: 1
  why: "A diagonal matrix stretches each axis by its diagonal entry and turns nothing along the axes."
- q: "Why must the vibrational frequencies from a Hessian be computed from its eigenvalues rather than its diagonal elements?"
  options: ["The diagonal elements are always zero", "Atoms are coupled: the independent vibrations are collective motions along the eigenvectors, and only in that basis is the Hessian diagonal", "Eigenvalues are always larger"]
  answer: 1
  why: "Normal modes are the eigenvectors; each oscillates independently with ω² equal to its (mass-weighted) eigenvalue."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. G. Strang, *Introduction to Linear Algebra*, 5th ed., Wellesley-Cambridge Press (2016). The standard introduction, built around the column picture of matrix–vector multiplication.
2. G. Sanderson (3Blue1Brown), *Essence of Linear Algebra*, video series (2016). The geometric picture of matrices as transformations used in this topic.
3. M. P. Deisenroth, A. A. Faisal and C. S. Ong, *Mathematics for Machine Learning*, Cambridge University Press (2020), chapters 2–4. Free online.
4. S. Axler, *Linear Algebra Done Right*, 3rd ed., Springer (2015). A rigorous treatment centred on linear maps and eigenvalues.
5. G. H. Golub and C. F. Van Loan, *Matrix Computations*, 4th ed., Johns Hopkins University Press (2013), on how linear systems and eigenvalue problems are solved numerically.
6. E. B. Wilson, J. C. Decius and P. C. Cross, *Molecular Vibrations: The Theory of Infrared and Raman Vibrational Spectra*, McGraw-Hill (1955); Dover reprint (1980), for normal modes as eigenvectors.

</div>
