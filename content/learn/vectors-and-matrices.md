---
title: "Vectors and matrices"
description: "Vectors as arrows and as lists of numbers, linear combinations and bases, length and the dot product, matrices as linear transformations of space, matrix multiplication as composition, the determinant as an area factor, linear systems, and eigenvectors and eigenvalues with their uses in vibrations, PCA and neural networks."
hook: "A matrix looks like a table of numbers, but it is better read as a machine that moves space. Its columns say where the basis arrows land, and that alone fixes where every other point goes."
objectives:
  - "Compute dot products and use them to find lengths, angles and projections"
  - "Build the matrix of a rotation, stretch or shear from the images of the basis vectors"
  - "Explain why matrix multiplication composes transformations and does not commute"
  - "Interpret the determinant as an area or volume factor and spot matrices that cannot be inverted"
  - "Find eigenvectors and eigenvalues, and relate them to normal modes and principal components"
cover: "cover.svg"
milestones:
  - year: 1844
    text: "Hermann Grassmann publishes his Ausdehnungslehre, an algebra of vectors in any dimension"
  - year: 1858
    text: "Arthur Cayley's memoir defines matrix multiplication as composition of linear substitutions"
  - year: 1925
    text: "Max Born and Pascual Jordan recast Heisenberg's quantum mechanics as matrix algebra"
  - year: 1961
    text: "John Francis publishes the QR algorithm for computing eigenvalues"
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

The list picture also frees vectors from the three dimensions of physical space. The positions of all $N$ atoms in a molecule form a single vector with $3N$ components, a point in a $3N$-dimensional configuration space. A material can be described by a vector of features: its composition, density, band gap and so on. An image of $28 \times 28$ pixels is a vector with 784 components. We cannot draw arrows in 784 dimensions, but every rule in this chapter works in any number of dimensions, and the two-dimensional pictures are faithful guides to what happens there.

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

The derivation takes two lines. The algebraic dot product distributes over addition like ordinary multiplication, so $|\mathbf a - \mathbf b|^2 = (\mathbf a - \mathbf b)\cdot(\mathbf a - \mathbf b) = |\mathbf a|^2 + |\mathbf b|^2 - 2\,\mathbf a\cdot\mathbf b$. The law of cosines, applied to the triangle with sides $\mathbf a$, $\mathbf b$ and $\mathbf a - \mathbf b$, says that the same squared length is $|\mathbf a|^2 + |\mathbf b|^2 - 2|\mathbf a||\mathbf b|\cos\theta$. Comparing the two expressions gives $\mathbf a\cdot\mathbf b = |\mathbf a||\mathbf b|\cos\theta$.

As a worked example, take the gas-phase geometry of water with the oxygen at the origin and the hydrogens at $(0.757, 0.586, 0)$ and $(-0.757, 0.586, 0)$ Å. The two O–H vectors have dot product $-0.757^2 + 0.586^2 = -0.2297$ Å², and each has length $\sqrt{0.757^2 + 0.586^2} = 0.9573$ Å, so $\cos\theta = -0.2297/0.9164 = -0.2506$ and $\theta = 104.5°$, the experimental H–O–H angle. Analysis tools such as MDAnalysis and VMD compute every angle in a trajectory this way, and the same formula with four atoms and two cross products gives dihedral angles.

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

To see non-commutativity in numbers, take the 90° rotation $\mathbf R = \begin{pmatrix}0&-1\\1&0\end{pmatrix}$ and the shear $\mathbf S = \begin{pmatrix}1&1\\0&1\end{pmatrix}$. Rotating first and shearing second gives $\mathbf S\mathbf R = \begin{pmatrix}1&-1\\1&0\end{pmatrix}$; shearing first gives $\mathbf R\mathbf S = \begin{pmatrix}0&-1\\1&1\end{pmatrix}$. The first sends $\hat{\mathbf i}$ to $(1, 1)$, the second to $(0, 1)$. Both products have determinant 1, as they must, since neither factor changes areas, but the shapes they produce point in different directions.

{{< fig src="composition.svg" alt="An F-shaped figure on a grid, its image after rotating by 90 degrees then shearing, and its image after shearing then rotating; the two results differ" caption="The same two matrices applied in opposite orders. Dashed outlines show the shape after the first step; teal and pink arrows are the columns of the product, the images of $\hat{\mathbf i}$ and $\hat{\mathbf j}$." >}}

Two rules follow from reading products as compositions. Undoing a sequence of steps means undoing them in reverse order, like taking off shoes before socks, so $(\mathbf A\mathbf B)^{-1} = \mathbf B^{-1}\mathbf A^{-1}$; the transpose obeys the same reversal, $(\mathbf A\mathbf B)^{\mathsf T} = \mathbf B^{\mathsf T}\mathbf A^{\mathsf T}$. And because area factors multiply, $\det(\mathbf A\mathbf B) = \det\mathbf A\,\det\mathbf B$, a fact the next section uses.

{{< note type="story" >}}
The word *matrix* was introduced by James Joseph Sylvester in 1850, and Arthur Cayley's memoir of 1858 defined the product of two matrices as the matrix of two linear substitutions performed in succession, which is the definition used here. Matrices entered physics in 1925. Werner Heisenberg's first paper on quantum mechanics multiplied arrays of transition amplitudes by a rule whose order mattered, which troubled him; Max Born recognised the rule as matrix multiplication, and with Pascual Jordan rewrote the theory in matrix form later that year. The non-commutativity Heisenberg worried about is the root of the uncertainty principle he derived in 1927.
{{< /note >}}

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

### Nearly singular systems

A determinant that is not zero but small causes trouble of its own. Consider $x + y = 2$ and $x + 1.001\,y = 2.001$, whose solution is $x = y = 1$. Change the second right-hand side by one part in two thousand, to 2.002, and the solution jumps to $x = 0$, $y = 2$. Geometrically, each equation is a line in the plane and the solution is where the lines cross. When the lines are nearly parallel, a small shift of either moves the crossing point a long way along them.

The amplification factor is the **condition number** $\kappa(\mathbf M)$, the ratio of the largest to the smallest singular value (for a symmetric matrix, of the largest to the smallest eigenvalue magnitude). A relative error $\epsilon$ in $\mathbf b$ can become a relative error of up to $\kappa\epsilon$ in $\mathbf x$. The system above has $\kappa = 4002$. In double precision, with $\epsilon \approx 10^{-16}$, a condition number of $10^{10}$ leaves about six trustworthy digits, and one near $10^{16}$ leaves none.

{{< fig src="conditioning.svg" alt="Two panels of lines in the plane: perpendicular lines whose uncertainty bands cross in a small square, and nearly parallel lines whose bands overlap in a long thin region" caption="The same uncertainty of ±0.1 in each entry of $\mathbf b$ gives a solution uncertainty of ±0.1 when the lines cross at right angles and ±1.1 when they are nearly parallel ($\kappa = 22$). The determinant shrinks from −2 to 0.2." >}}

Ill-conditioning is common in practice. Fitting a polynomial of degree 10 to data on $[0, 1]$ by least squares gives a design matrix $\mathbf X$ with a condition number near $2 \times 10^7$ and normal equations near $4 \times 10^{14}$ (for 50 evenly spaced points), because the columns $x^9$ and $x^{10}$ are almost parallel vectors, and forming $\mathbf X^{\mathsf T}\mathbf X$ squares the condition number of $\mathbf X$. Descriptor sets for materials, in which density, molar volume and lattice parameter all carry the same information, behave the same way. The standard remedies are to standardise each feature to zero mean and unit variance, to solve least-squares problems by QR factorisation or the singular value decomposition rather than the normal equations (`numpy.linalg.lstsq` uses the SVD), and to add a ridge term $\lambda\mathbf I$, which raises every eigenvalue of $\mathbf X^{\mathsf T}\mathbf X$ by $\lambda$ and caps the condition number.

{{< note type="warn" title="Myth" >}}
"To solve $\mathbf M\mathbf x = \mathbf b$, compute $\mathbf M^{-1}$ and multiply." For an $n \times n$ matrix, an LU factorisation costs about $\tfrac23 n^3$ operations and forming the inverse from it about $\tfrac43 n^3$ more, so the inverse is roughly three times as expensive and also less accurate. `numpy.linalg.solve` and `scipy.linalg.cho_solve` factorise and back-substitute. Compute an inverse only when its entries are themselves the answer, as for the covariance matrix of fitted parameters.
{{< /note >}}

## Eigenvectors and eigenvalues

Most vectors are knocked off their line by a transformation: in the figure, the blue vector $\mathbf v$ and its image $\mathbf M\mathbf v$ usually point in different directions. But for many matrices there are special directions that are only stretched or shrunk, never turned. A vector $\mathbf u$ along such a direction satisfies

{{< eq title="Eigenvectors and eigenvalues" say="The directions a transformation only stretches, and by how much." >}}
$$ \mathbf M\,\textcolor{#845ef7}{\mathbf u} = \textcolor{#d4a017}{\lambda}\,\textcolor{#845ef7}{\mathbf u} $$
- $\textcolor{#845ef7}{\mathbf u}$: an **eigenvector** (from the German *eigen*, "own"), a non-zero vector whose direction is unchanged
- $\textcolor{#d4a017}{\lambda}$: its **eigenvalue**, the stretch factor; negative $\lambda$ reverses the vector, zero squashes it to the origin
- the eigenvalues solve the characteristic equation $\det(\mathbf M - \lambda\mathbf I) = 0$; for $2 \times 2$ matrices, $\lambda^2 - (a + d)\lambda + (ad - bc) = 0$
{{< /eq >}}

For the symmetric matrix $\begin{pmatrix}2&1\\1&2\end{pmatrix}$ the characteristic equation is $\lambda^2 - 4\lambda + 3 = 0$, with roots $\lambda = 3$ and $\lambda = 1$. Substituting $\lambda = 3$ into $(\mathbf M - 3\mathbf I)\mathbf u = 0$ gives $-u_x + u_y = 0$, so $\mathbf u \propto (1, 1)$; $\lambda = 1$ gives $u_x + u_y = 0$, so $\mathbf u \propto (1, -1)$. Two checks are always available: the eigenvalues add up to the trace, $3 + 1 = 2 + 2$, and multiply to the determinant, $3 \times 1 = 4 - 1$.

Tick "show eigenvectors" in the transformation figure. For the symmetric matrix $\begin{pmatrix}2&1\\1&2\end{pmatrix}$, the two dashed purple lines along the diagonals are the eigen-directions: vectors on the line $y = x$ are stretched by 3, vectors on the line $y = -x$ are left alone (eigenvalue 1), and every other vector is a mixture and gets turned. The shear has only one eigen-direction, the horizontal axis. A rotation by 90° has none at all: every direction is turned, and the eigenvalues are complex numbers. Tick "what happens to a circle" as well, and you will see the unit circle become an ellipse whose axes, for a symmetric matrix, lie exactly along the eigenvectors, with semi-axes equal to the absolute values of the eigenvalues.

**Symmetric matrices**, those equal to their own transpose ($M_{ij} = M_{ji}$), are especially well behaved, and they are the ones that matter most in science. Their eigenvalues are always real, and their eigenvectors can always be chosen to be mutually perpendicular. Using the eigenvectors as a new basis, the matrix becomes diagonal: the transformation is just a stretch along each eigen-direction. This **spectral decomposition**, $\mathbf M = \mathbf Q\boldsymbol\Lambda\mathbf Q^{\mathsf T}$ with $\mathbf Q$ the matrix of eigenvectors and $\boldsymbol\Lambda$ the diagonal matrix of eigenvalues, appears across the sciences:

The **normal modes** of a molecule are the eigenvectors of its Hessian, the matrix of second derivatives of the energy with respect to atomic positions (mass-weighted), and the eigenvalues give the squared vibrational frequencies. A negative eigenvalue signals a saddle point rather than a minimum, which is how transition states are recognised, as [the chapter on gradients](../gradients/) shows.

**Principal component analysis** finds the eigenvectors of the covariance matrix of a data set. The first eigenvector is the direction in which the data vary most, and projecting onto the first few eigenvectors gives the best low-dimensional summary of high-dimensional data, whether those are atomic trajectories or materials properties.

In **quantum mechanics** the allowed energies of a system are the eigenvalues of its Hamiltonian matrix, and the stationary states are its eigenvectors. Every electronic-structure calculation, from a Hückel model of benzene to density-functional theory, is at its heart a large symmetric eigenvalue problem.

### Worked example: the stretching modes of CO₂

Model carbon dioxide as three masses on a line, O–C–O, joined by two springs of stiffness $k$, and let $x_1, x_2, x_3$ be the displacements of the atoms along the axis. The energy is $V = \tfrac12 k(x_2 - x_1)^2 + \tfrac12 k(x_3 - x_2)^2$, and its Hessian is

$$
\mathbf K = k\begin{pmatrix} 1 & -1 & 0 \\ -1 & 2 & -1 \\ 0 & -1 & 1 \end{pmatrix}.
$$

Newton's equations $m_i\ddot x_i = -\sum_j K_{ij}x_j$ mix masses and stiffnesses, so the matrix to diagonalise is the mass-weighted Hessian $\mathbf M^{-1/2}\mathbf K\mathbf M^{-1/2}$, with $\mathbf M$ the diagonal matrix of masses. Its three eigenvalues are $\omega^2 = 0$, $k/m_{\mathrm O}$ and $(k/m_{\mathrm O})(1 + 2m_{\mathrm O}/m_{\mathrm C})$. The zero eigenvalue is a rigid translation: moving the whole molecule costs no energy. The second is the symmetric stretch, in which the carbon does not move at all. The third is the asymmetric stretch, in which both oxygens move one way and the carbon moves the other with $2m_{\mathrm O}/m_{\mathrm C} = 2.67$ times their amplitude, so that the centre of mass stays put.

{{< fig src="co2-modes.svg" alt="Three rows showing the atoms O, C, O with displacement arrows for the translation, the symmetric stretch and the asymmetric stretch, with model and observed wavenumbers" caption="The eigenvectors of the mass-weighted Hessian of the spring model, converted to atomic displacements. Fixing $k$ from the symmetric stretch, the model puts the asymmetric stretch at 2566 cm⁻¹, 9 % above the observed 2349 cm⁻¹." >}}

With the symmetric stretch at about 1340 cm⁻¹ (in the Raman spectrum it appears as a pair of bands at 1285 and 1388 cm⁻¹, split by a resonance with the overtone of the bending mode), the spring constant is $k = m_{\mathrm O}(2\pi c\tilde\nu)^2 \approx 1690$ N/m. The model then predicts the asymmetric stretch at $1340 \times \sqrt{1 + 2 \times 16/12} = 1340 \times 1.915 = 2566$ cm⁻¹; infrared spectroscopy finds it at 2349 cm⁻¹. The 9 % discrepancy is real physics: stretching one C=O bond changes the stiffness of the other, a coupling that adds off-diagonal terms to the Hessian. A stretch–stretch interaction constant of about 9 % of $k$ reproduces both frequencies.

{{< note type="try" title="Pause and predict" >}}
Replace carbon-12 by carbon-13. Which band shifts, and by how much? Decide before reading on.

Only the asymmetric stretch moves. The carbon is stationary in the symmetric stretch, so its mass cannot enter that frequency. The ratio of the asymmetric frequencies is $\sqrt{(1 + 2 \times 15.995/13.003)/(1 + 2 \times 15.995/12.000)} = 0.9715$, which turns the observed 2349 cm⁻¹ into a predicted 2282 cm⁻¹. The ¹³CO₂ band is observed at 2283 cm⁻¹. The coupling constant cancels in the ratio, which is why the simple model does so well here. Isotope-ratio infrared spectrometers that measure ¹³C/¹²C in breath or in atmospheric CO₂ rely on this separation of about 66 cm⁻¹.
{{< /note >}}

{{< note type="practice" title="From the lab" >}}
A frequency calculation in a quantum-chemistry or DFT code follows the same steps for $3N$ coordinates: optimise the geometry, build the Hessian (analytically, or by displacing each atom by about 0.01 Å in each direction and differencing the forces, which costs $6N$ force calculations), mass-weight it, diagonalise, and convert $\sqrt{\lambda}$ to wavenumbers. Six eigenvalues (five for a linear molecule) should be close to zero: three translations and three rotations. Values of 20 to 50 cm⁻¹ in their place, or small imaginary frequencies, usually mean the geometry was not optimised tightly enough or the integration grid is too coarse, and are fixed by re-optimising with tighter criteria before trusting the spectrum. The phonons of a crystal come from the same procedure applied to the dynamical matrix, as implemented in Phonopy.
{{< /note >}}

## Matrices in machine learning and simulation

A single layer of a neural network takes an input vector $\mathbf x$, multiplies it by a weight matrix $\mathbf W$, adds a bias vector and applies a nonlinear function to each component: $\mathbf h = \sigma(\mathbf W\mathbf x + \mathbf b)$. The matrix rotates, stretches and shears the input space; the nonlinearity bends it. Stacking such layers lets a network reshape space until classes that were tangled become separable, as [the chapter on how networks bend space](../networks-bend-space/) shows with the same kind of grid picture used above. Training a network means adjusting the entries of these matrices, and running one means doing matrix multiplications, which is why graphics processors, built to multiply matrices quickly, became the engines of deep learning.

{{< note type="practice" title="Back of the envelope" >}}
Multiplying two $n \times n$ matrices takes $n^3$ multiply–add pairs, $2n^3$ floating-point operations. For $n = 4096$ that is $1.4 \times 10^{11}$. A single CPU core sustaining a few times $10^{10}$ operations per second needs several seconds; a data-centre GPU running at $10^{14}$ operations per second in the reduced precision used for training needs about a millisecond. Dense diagonalisation also scales as $n^3$, so doubling the number of atoms in a conventional DFT calculation, whose Hamiltonian grows linearly with system size, makes the eigenvalue problem eight times more expensive. That cubic wall is the main reason DFT stops at a few thousand atoms, and the main motivation for [machine-learned potentials](../mlip/), whose cost grows linearly.
{{< /note >}}

In molecular simulation, the simulation box is described by a $3 \times 3$ cell matrix whose columns are the box vectors; converting between Cartesian and fractional coordinates is multiplication by this matrix or its inverse, and the box volume is its determinant. In two dimensions, a cell with edges $\mathbf a = (4, 0)$ Å and $\mathbf b = (1, 3)$ Å has cell matrix $\mathbf h = \begin{pmatrix}4&1\\0&3\end{pmatrix}$ and area $\det\mathbf h = 12$ Å². The fractional position $(0.5, 0.25)$ lies at $\mathbf h\,(0.5, 0.25)^{\mathsf T} = (2.25, 0.75)$ Å, and the Cartesian point $(4.5, 2.4)$ Å has fractional coordinates $\mathbf h^{-1}(4.5, 2.4)^{\mathsf T} = (0.925, 0.8)$, so it lies inside the cell. Periodic wrapping and the minimum-image convention are applied to fractional coordinates, by subtracting the nearest integer, and the result is mapped back with $\mathbf h$. For strongly tilted cells that rounding no longer guarantees the nearest image, which is why LAMMPS and GROMACS restrict how far a triclinic box may be tilted. Rotation matrices orient molecules, the stress and strain of a material are $3 \times 3$ symmetric matrices whose eigenvectors are the principal axes, and the moment of inertia tensor, diagonalised, gives a molecule's principal axes of rotation. In all of these the same few ideas recur: a matrix is a transformation, its columns are the images of the basis, its determinant scales volume, and its eigenvectors are the directions it leaves unturned.

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
- q: "The system x + y = 2, x + 1.001y = 2.001 has condition number about 4000. What does that mean in practice?"
  options: ["It has no solution", "A small relative error in the right-hand side can be amplified up to about 4000 times in the solution", "Gaussian elimination needs 4000 steps"]
  answer: 1
  why: "The lines are nearly parallel, so a tiny shift of one moves their crossing point far along them: changing 2.001 to 2.002 moves the solution from (1, 1) to (0, 2)."
- q: "In ¹³CO₂, which stretching band shifts relative to ¹²CO₂?"
  options: ["Only the symmetric stretch", "Only the asymmetric stretch", "Both, by the same factor"]
  answer: 1
  why: "The carbon atom does not move in the symmetric stretch, so its mass does not enter that frequency."
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
