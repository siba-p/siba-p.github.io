---
title: "Dimensionality reduction and clustering"
description: "Finding structure in data that nobody has labelled: why simulation data need it; principal component analysis from the covariance matrix and by singular value decomposition, explained variance and how many components to keep; essential dynamics of proteins; kernel PCA; t-SNE and UMAP maps and what their distances do and do not mean; k-means and choosing the number of clusters with the elbow and the silhouette; Gaussian mixtures and the EM algorithm; density-based and hierarchical clustering; and clustering conformations into microstates for Markov state models."
hook: "A microsecond of a small protein's motion fills a hundred thousand frames of three thousand coordinates each, and nobody has labelled any of them. Principal components and clustering find the few motions and states hidden inside."
objectives:
  - "Compute principal components from the covariance matrix and by singular value decomposition"
  - "Choose how many components to keep from the explained variance"
  - "Interpret t-SNE and UMAP maps without over-reading distances or cluster sizes"
  - "Run k-means and choose the number of clusters with the elbow and the silhouette"
  - "Compare Gaussian mixtures, density-based and hierarchical clustering for grouping conformations"
track: unsup
weight: 1
level: Core
minutes: 50
lab: "Run PCA by singular value decomposition, then k-means, on synthetic data in the browser"
prereqs: ["vectors-and-matrices", "probability", "learning-from-data"]
---

## Structure without labels

Every model so far has been **supervised**: each input came with an answer, an energy or a class, and the model learned to reproduce it ([learning from data](../learning-from-data/)). Much scientific data has no answers attached. A molecular-dynamics run of a small protein, saved every 10 ps for a microsecond, produces 100,000 frames of about 3000 Cartesian coordinates each, and nobody has said which frames are folded. **Unsupervised learning** asks what structure the data have on their own, and two questions cover most of it.

- **Dimensionality reduction.** Do a few combinations of the variables capture most of the variation? Bonds and packing tie a protein's coordinates together, so the motions that matter may live in a handful of dimensions.
- **Clustering.** Do the samples fall into groups, such as the conformational states a molecule visits?

Both depend on the features and the distance you choose. Frames must first be aligned to a reference structure, removing overall translation and rotation, or the largest "motion" found will be the molecule tumbling in its box. Features in different units must be brought to a common scale, and angles are best represented by their sine and cosine, so that 359° and 1° come out close together.

## Principal component analysis

### Directions of largest variance

**Principal component analysis** (PCA) finds the perpendicular directions along which the data vary most. Karl Pearson posed it in 1901 as a problem in geometry, finding the plane that passes closest to a cloud of points; Harold Hotelling developed it in 1933, in educational psychology, to summarise many correlated measurements by a few "components". The two views agree: the closest plane, in the least-squares sense, is the one that keeps the most variance.

Stack $N$ samples of $d$ features as the rows of a matrix and subtract the mean of each column, giving $\mathbf X_c$. The variance of the data projected onto a unit vector $\mathbf v$ is $\mathbf v^{\top}\mathbf C\mathbf v$, where $\mathbf C$ is the covariance matrix. Maximising it subject to $\lVert\mathbf v\rVert = 1$ with a Lagrange multiplier gives $\mathbf C\mathbf v = \lambda\mathbf v$: the best direction is an eigenvector of $\mathbf C$, and the variance along it is the eigenvalue.

{{< eq title="Principal components" say="The principal axes are the eigenvectors of the covariance matrix, and each eigenvalue is the variance of the data along its axis." >}}
$$ \textcolor{#12a594}{\mathbf C} = \frac{1}{N-1}\,\mathbf X_c^{\top}\mathbf X_c, \qquad \textcolor{#12a594}{\mathbf C}\,\textcolor{#4c6ef5}{\mathbf v_k} = \textcolor{#f08c2e}{\lambda_k}\,\textcolor{#4c6ef5}{\mathbf v_k}, \qquad \textcolor{#845ef7}{y_{ik}} = \textcolor{#4c6ef5}{\mathbf v_k}^{\top}(\mathbf x_i - \bar{\mathbf x}) $$
- $\textcolor{#12a594}{\mathbf C}$: the $d\times d$ covariance matrix of the features
- $\textcolor{#4c6ef5}{\mathbf v_k}$: the $k$-th principal axis, with $\lambda_1 \ge \lambda_2 \ge \dots$
- $\textcolor{#f08c2e}{\lambda_k}$: the variance of the data along that axis
- $\textcolor{#845ef7}{y_{ik}}$: the $k$-th principal component, or score, of sample $i$
{{< /eq >}}

Because $\mathbf C$ is symmetric, its eigenvectors are perpendicular ([vectors and matrices](../vectors-and-matrices/)) and the components are uncorrelated. The fraction of the total variance carried by the first $m$ components, $\sum_{k\le m}\lambda_k / \sum_k \lambda_k$, is the **explained variance**, and projecting onto those $m$ axes gives the best $m$-dimensional linear summary of the data.

### PCA by singular value decomposition

In practice PCA is computed without forming $\mathbf C$ at all. The **singular value decomposition** (SVD) factorises the centred data matrix itself:

{{< eq title="PCA via the singular value decomposition" say="Any data matrix is a rotation, a stretch along the axes and another rotation; the second rotation holds the principal axes." >}}
$$ \mathbf X_c = \textcolor{#e64980}{\mathbf U}\,\textcolor{#f08c2e}{\mathbf S}\,\textcolor{#4c6ef5}{\mathbf V}^{\top}, \qquad \textcolor{#f08c2e}{\lambda_k} = \frac{\textcolor{#f08c2e}{s_k}^2}{N-1}, \qquad \text{scores} = \textcolor{#e64980}{\mathbf U}\,\textcolor{#f08c2e}{\mathbf S} = \mathbf X_c\,\textcolor{#4c6ef5}{\mathbf V} $$
- $\textcolor{#4c6ef5}{\mathbf V}$: its columns are the principal axes $\mathbf v_k$
- $\textcolor{#f08c2e}{\mathbf S}$: diagonal, holding the singular values $s_1 \ge s_2 \ge \dots \ge 0$
- $\textcolor{#e64980}{\mathbf U}$: orthonormal columns, giving the scores up to scale
{{< /eq >}}

Substituting shows why: $\mathbf X_c^{\top}\mathbf X_c = \mathbf V\mathbf S^2\mathbf V^{\top}$, the eigendecomposition of $(N-1)\mathbf C$. The SVD is preferred for the reason least squares avoids the normal equations ([learning from data](../learning-from-data/)): forming $\mathbf X^{\top}\mathbf X$ squares the condition number. Carl Eckart and Gale Young proved in 1936 that truncating the SVD after $m$ terms gives the best rank-$m$ approximation of the matrix, which is the reconstruction view of PCA in a single theorem.

### How many components?

Plot the eigenvalues in decreasing order, a **scree plot**, and look for where they stop falling steeply and flatten into a floor of small, similar values; that floor is usually noise. A common rule keeps 80 to 90 % of the variance, but with noisy features a fixed percentage can demand far more components than the signal needs.

{{< note type="warn" title="Units decide the answer" >}}
PCA maximises variance, and variance depends on units. Mix a distance in ångström with an energy in kJ/mol and whichever has the larger numbers wins. Standardise features measured in different units. Do *not* standardise features that share units and whose sizes are meaningful, such as aligned Cartesian coordinates: inflating the tiny fluctuations of a nearly rigid atom to unit variance turns noise into a principal component.
{{< /note >}}

### Essential dynamics

PCA of a molecular-dynamics trajectory has a name of its own. Andrea Amadei, Antonius Linssen and Herman Berendsen showed in 1993, from simulations of lysozyme, that configurational space separates into an **essential subspace** of a few collective coordinates, which carry most of the positional fluctuation and the large anharmonic motions, and a remainder of narrow, nearly Gaussian vibration. Projecting onto the first two or three components reveals hinge bending or domain closure that no single atom shows. GROMACS (`gmx covar`, `gmx anaeig`) and MDAnalysis implement the analysis.

Two cautions come with it. A short trajectory that is merely diffusing also produces a few dominant components, whose projections look like half and whole cosine waves in time; Berk Hess showed in 2000 that this "cosine content" signals unconverged sampling, not genuine collective motion. And large variance does not mean slow or important motion: a floppy loop can dominate the first component while the rare transition that matters hides in a later one. Methods that seek slowness instead, such as TICA, are the subject of [learned collective variables](../es-ml-cvs/).

### Kernel PCA

PCA projects onto flat subspaces, which squash data lying on a curved surface. **Kernel PCA** (Bernhard Schölkopf, Alexander Smola and Klaus-Robert Müller, 1998) replaces the covariance matrix by the centred $N\times N$ matrix of kernel values $k(\mathbf x_i, \mathbf x_j)$, the similarity functions of [Gaussian processes](../uncertainty-gaussian-processes/), whose leading eigenvectors give nonlinear components. The price is a matrix that grows as $N^2$ and components that are harder to interpret.

## Maps for the eye: t-SNE and UMAP

PCA preserves large distances at the expense of local detail. **t-distributed stochastic neighbour embedding** (t-SNE, Laurens van der Maaten and Geoffrey Hinton, 2008) does the opposite. It turns distances into probabilities that two samples are neighbours, using a Gaussian around each point whose width gives every point roughly the same effective number of neighbours, the **perplexity** (typically 5 to 50). It then places the points on a page so that neighbour probabilities computed there, with a heavy-tailed Student-t distribution, match the original ones:

{{< eq title="The t-SNE objective" say="Arrange the points on a page so that who is near whom on the page matches who is near whom in the original space." >}}
$$ \textcolor{#4c6ef5}{p_{ij}} \propto \exp\!\left(-\frac{\lVert\mathbf x_i - \mathbf x_j\rVert^2}{2\sigma_i^2}\right), \qquad \textcolor{#f08c2e}{q_{ij}} \propto \big(1 + \lVert\mathbf y_i - \mathbf y_j\rVert^2\big)^{-1}, \qquad \min_{\{\mathbf y_i\}}\ \sum_{i\ne j} \textcolor{#4c6ef5}{p_{ij}}\ln\frac{\textcolor{#4c6ef5}{p_{ij}}}{\textcolor{#f08c2e}{q_{ij}}} $$
- $\textcolor{#4c6ef5}{p_{ij}}$: neighbour probability in the original space (symmetrised), with widths $\sigma_i$ set by the perplexity
- $\textcolor{#f08c2e}{q_{ij}}$: the same on the map, where point $i$ sits at $\mathbf y_i$
- the sum is the Kullback–Leibler divergence, minimised by gradient descent
{{< /eq >}}

The divergence punishes placing true neighbours far apart much more than placing strangers close together, so neighbourhoods survive, and the heavy tail lets moderately distant points spread out instead of crowding. **UMAP** (Leland McInnes, John Healy and James Melville, 2018) builds a weighted graph of each point's nearest neighbours, 15 by default, and optimises a layout of that graph. It is much faster on large data sets, can place new points onto an existing map, and often keeps more of the large-scale arrangement, though how much is debated.

{{< note type="warn" title="What a t-SNE or UMAP map does not tell you" >}}
- **Cluster sizes mean little.** t-SNE adapts to local density, so a tight cluster and a diffuse one can come out the same size.
- **Distances between clusters mean little.** The gaps change with the perplexity and the random seed.
- **Apparent clusters can be artefacts.** At low perplexity even random noise can break into clumps.
- **The axes have no meaning**, and the map is not a smooth function of the features that a simulation could bias.

Try several perplexities and seeds, check any cluster you care about in the original features, and never read free energies from such a map. *How to use t-SNE effectively*, by Martin Wattenberg, Fernanda Viégas and Ian Johnson (2016), demonstrates each pitfall.
{{< /note >}}

## Clustering

### k-means

**k-means** divides $N$ points into $k$ clusters, each represented by its centre, so as to minimise the total squared distance from points to their own centres:

{{< eq title="The k-means objective" say="Choose k centres, and an assignment of points to them, so that every point sits as close as possible to its own centre." >}}
$$ J = \sum_{i=1}^{N} \big\lVert \mathbf x_i - \textcolor{#f08c2e}{\boldsymbol\mu}_{\textcolor{#4c6ef5}{c_i}} \big\rVert^2, \qquad \textcolor{#f08c2e}{\boldsymbol\mu_j} = \frac{1}{N_j}\sum_{i:\,c_i = j}\mathbf x_i $$
- $\textcolor{#4c6ef5}{c_i}$: the cluster to which point $i$ is assigned
- $\textcolor{#f08c2e}{\boldsymbol\mu_j}$: the centre of cluster $j$, the mean of its $N_j$ points
- $J$: the within-cluster sum of squares, or inertia
{{< /eq >}}

**Lloyd's algorithm** alternates two steps from a guess of the centres: assign every point to its nearest centre, then move every centre to the mean of its points. Neither step can increase $J$, so the algorithm converges, but only to a local minimum that depends on the start. Two habits fix most of the trouble: **k-means++** seeding (David Arthur and Sergei Vassilvitskii, 2007), which picks each starting centre at random with probability proportional to its squared distance from those already chosen, and several restarts, keeping the lowest $J$. Because each point joins its nearest centre, the boundaries between clusters are straight, and k-means works best for compact, roughly spherical clusters of similar spread.

{{< note type="fun" >}}
Stuart Lloyd devised the algorithm at Bell Labs in 1957 to choose the quantisation levels for pulse-code modulation, a problem in digitising signals rather than in analysing data. His memo circulated for 25 years before it was formally published, in 1982.
{{< /note >}}

### PCA and k-means in a few lines

The cell hides three "states", which differ along two directions, among eight directions of pure noise, then rotates everything at random. PCA by SVD recovers the two informative directions, and k-means finds the states in their plane.

{{< py title="PCA by SVD, then k-means" >}}
import numpy as np
rng = np.random.default_rng(1)
# three 'states' that differ in 2 directions, hidden in 10 noisy dimensions
centres = np.array([[0.0, 0.0], [4.0, 0.0], [2.0, 3.0]])
truth = np.repeat([0, 1, 2], 200)
Z = np.hstack([centres[truth] + rng.normal(0, 0.7, (600, 2)), rng.normal(0, 0.3, (600, 8))])
Q, _ = np.linalg.qr(rng.normal(size=(10, 10)))      # a random rotation of 10-D space
X = Z @ Q.T                                         # 600 samples, 10 features each

Xc = X - X.mean(axis=0)                             # PCA: centre, then SVD
U, s, Vt = np.linalg.svd(Xc, full_matrices=False)
print("explained variance ratio", np.round(s**2 / np.sum(s**2), 3))
print("same as covariance eigenvalues:", np.allclose(np.linalg.eigvalsh(np.cov(X.T))[::-1], s**2 / 599))
P = Xc @ Vt[:2].T                                   # coordinates on PC1 and PC2

C = P[rng.choice(600, 3, replace=False)]            # k-means (Lloyd) with k = 3
for it in range(6):
    d2 = ((P[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    a = d2.argmin(axis=1)                           # assign each point to its nearest centre
    print(f"iteration {it}: sum of squared distances {d2.min(axis=1).sum():7.1f}")
    C = np.array([P[a == k].mean(axis=0) for k in range(3)])   # move centres to the means
major = np.array([np.bincount(truth[a == k]).argmax() for k in range(3)])
print("cluster sizes", np.bincount(a), " agreement with the true states", np.mean(major[a] == truth))
{{< /py >}}

The first two explained-variance ratios, 0.50 and 0.39, stand far above a floor of about 0.015 for each of the others, and the covariance route gives the same eigenvalues. k-means cuts the sum of squared distances from 1093 to 573 with its first update and settles at 567.5, with clusters that match the hidden states for 98.5 % of the samples. Change the seed in the second line to 2: after six iterations one centre still straddles two states, and the sum, about 1810, is three times what 15 iterations reach, which is why k-means++ and restarts matter.

### Choosing k

$J$ always falls as $k$ grows, reaching zero at $k = N$, so it cannot choose $k$ by itself. The **elbow method** plots $J$ against $k$ and looks for the point beyond which extra clusters buy little; on real data the elbow is often a gentle curve. The **silhouette** (Peter Rousseeuw, 1987) asks whether each point sits more comfortably in its own cluster than in the next best. With $a_i$ the mean distance from point $i$ to the rest of its cluster and $b_i$ the mean distance to the nearest other cluster,

$$
s_i = \frac{b_i - a_i}{\max(a_i, b_i)}, \qquad -1 \le s_i \le 1 .
$$

Values near 1 mean well separated, near 0 on a boundary, negative probably misassigned; choose the $k$ with the largest mean silhouette. For probabilistic models, such as the mixtures below, an information criterion such as the BIC does the same job.

### Gaussian mixtures and the EM algorithm

k-means makes hard assignments and treats every cluster as a sphere of the same size. A **Gaussian mixture model** treats the data as drawn from $K$ Gaussians, each with its own mean, covariance and weight ([probability](../probability/)):

{{< eq title="A Gaussian mixture and its responsibilities" say="The data are a weighted blend of Gaussians, and each point is shared among them in proportion to how well each one explains it." >}}
$$ p(\mathbf x) = \sum_{k=1}^{K} \textcolor{#d4a017}{\pi_k}\,\mathcal N\big(\mathbf x \mid \textcolor{#f08c2e}{\boldsymbol\mu_k}, \textcolor{#12a594}{\boldsymbol\Sigma_k}\big), \qquad \textcolor{#e64980}{r_{ik}} = \frac{\textcolor{#d4a017}{\pi_k}\,\mathcal N\big(\mathbf x_i \mid \textcolor{#f08c2e}{\boldsymbol\mu_k}, \textcolor{#12a594}{\boldsymbol\Sigma_k}\big)}{\sum_{j}\textcolor{#d4a017}{\pi_j}\,\mathcal N\big(\mathbf x_i \mid \textcolor{#f08c2e}{\boldsymbol\mu_j}, \textcolor{#12a594}{\boldsymbol\Sigma_j}\big)} $$
- $\textcolor{#d4a017}{\pi_k}$: the weight of component $k$, with $\sum_k \pi_k = 1$
- $\textcolor{#f08c2e}{\boldsymbol\mu_k}$, $\textcolor{#12a594}{\boldsymbol\Sigma_k}$: its mean and covariance matrix
- $\textcolor{#e64980}{r_{ik}}$: the **responsibility**, the probability that point $i$ came from component $k$
{{< /eq >}}

The parameters are fitted by maximum likelihood with the **expectation–maximisation** (EM) algorithm, set out in general form by Arthur Dempster, Nan Laird and Donald Rubin in 1977. The E-step computes responsibilities from the current parameters; the M-step re-estimates each weight, mean and covariance as averages weighted by them. No cycle can decrease the likelihood. The resemblance to Lloyd's algorithm is no coincidence: k-means is the limit of EM for components sharing a spherical covariance $\sigma^2\mathbf I$ as $\sigma \to 0$, when every responsibility hardens to 0 or 1. Mixtures give soft assignments, elliptical clusters of different sizes, and a density that says how unusual a new sample is.

### Density-based and hierarchical clustering

**DBSCAN** (Martin Ester, Hans-Peter Kriegel, Jörg Sander and Xiaowei Xu, 1996) defines clusters as dense regions. A point with at least a minimum number of neighbours within a radius $\varepsilon$ is a core point; a cluster is a chain of core points within $\varepsilon$ of each other plus the points on its fringe, and everything else is **noise**. DBSCAN needs no $k$, finds clusters of any shape, and sets sparse points aside rather than forcing them into a cluster, which suits conformational data, where frames caught mid-transition belong to no state. HDBSCAN avoids its single global density threshold by considering all thresholds at once. **Density-peak clustering** (Alex Rodriguez and Alessandro Laio, 2014) takes as centres points that are dense and far from any denser point.

**Hierarchical clustering** starts with every point in a cluster of its own and repeatedly merges the two closest clusters, with "closest" defined by a **linkage**: single (nearest members), complete (farthest members), average, or Ward's criterion (Joe Ward, 1963), which merges the pair that increases the within-cluster sum of squares least. The history of merges is a tree, the **dendrogram**, and cutting it at any height gives a clustering. Storing every pairwise distance between 100,000 frames takes about 40 GB, so the method is usually applied to a subsample or to centres found by a faster method.

## From clusters to microstates

Clustering conformations is the first step in building a [Markov state model](../es-msm/), with an unusual goal. An MSM needs **microstates** small enough that, within the lag time, the system forgets where inside one it started; they need not be meaningful states. Models therefore use far more clusters than there are metastable states, often a few hundred, found by k-means or k-centres in slow coordinates from TICA rather than raw positions. More microstates resolve barriers better but leave fewer observed transitions per state, so the number is a trade-off. Meaningful **macrostates** come afterwards, by lumping microstates that interconvert quickly: a clustering of the kinetics, not the geometry.

When the natural distance is the root-mean-square deviation (RMSD) after optimal superposition, there is no meaningful average conformation to serve as a centre. Methods whose centres are actual samples, such as k-medoids or the algorithm of Xavier Daura and colleagues (1999), available as `gmx cluster -method gromos` in GROMACS, are then the right choice. Whatever the method, a geometric cluster is not automatically a free-energy basin: two structures can look alike yet be separated by a high barrier. Kinetics has the final word, as [learned collective variables](../es-ml-cvs/) also show.

{{< note type="key" >}}
- PCA diagonalises the covariance matrix; compute it by SVD of the centred data, $\lambda_k = s_k^2/(N-1)$, and keep components down to the scree plot's noise floor.
- In a trajectory a few components carry most of the fluctuation, but variance is not slowness.
- t-SNE and UMAP preserve neighbourhoods, not cluster sizes or the gaps between clusters.
- k-means finds local minima, so use k-means++ and restarts; choose $k$ by elbow and silhouette. Mixtures fitted by EM give soft clusters; DBSCAN labels noise; hierarchical clustering gives a dendrogram.
- For Markov state models, cluster into many small microstates in slow coordinates, then lump them by kinetics.
{{< /note >}}

{{< quiz >}}
- q: "A centred data matrix with $N$ rows has singular values $s_k$. What is the variance along the $k$-th principal axis?"
  options: ["$s_k$", "$s_k^2/(N-1)$", "$1/s_k$"]
  answer: 1
  why: "$\\mathbf X_c^{\\top}\\mathbf X_c = \\mathbf V\\mathbf S^2\\mathbf V^{\\top}$ is $(N-1)$ times the covariance matrix."
- q: "The first principal component of an aligned protein trajectory carries 40 % of the variance. What can you safely conclude?"
  options: ["It is the slowest process", "It is the direction of largest fluctuation, which may or may not be slow or important", "The protein has two states"]
  answer: 1
  why: "PCA ranks directions by variance; a fast, floppy motion can dominate it. TICA looks for slowness instead."
- q: "On a t-SNE map, a large cluster lies far from a small one. Which conclusion is safe?"
  options: ["The large cluster is more varied", "The clusters are far apart in the data", "Neither, without checking the original features"]
  answer: 2
  why: "t-SNE preserves neighbourhoods, not sizes or global distances, which change with perplexity and seed."
- q: "Why is k-means run several times from different starting centres?"
  options: ["Lloyd's algorithm can increase the objective", "It converges to a local minimum that depends on the start", "Each run needs a different k"]
  answer: 1
  why: "Each step lowers the objective, but which minimum it reaches depends on the initial centres."
- q: "Why does a Markov state model use hundreds of microstates for a molecule with only a few metastable states?"
  options: ["A lower k-means objective is the aim", "Microstates must be small enough for memory to be lost within the lag time; metastable states come later, by lumping", "Clustering cannot produce fewer clusters"]
  answer: 1
  why: "Fine microstates keep the Markov approximation accurate; too many leave too few transitions per state."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. K. Pearson, “On lines and planes of closest fit to systems of points in space,” *Philosophical Magazine* **2**, 559–572 (1901).
2. H. Hotelling, “Analysis of a complex of statistical variables into principal components,” *Journal of Educational Psychology* **24**, 417–441 and 498–520 (1933).
3. C. Eckart and G. Young, “The approximation of one matrix by another of lower rank,” *Psychometrika* **1**, 211–218 (1936).
4. A. Amadei, A. B. M. Linssen and H. J. C. Berendsen, “Essential dynamics of proteins,” *Proteins* **17**, 412–425 (1993).
5. B. Hess, “Similarities between principal components of protein dynamics and random diffusion,” *Physical Review E* **62**, 8438–8448 (2000).
6. B. Schölkopf, A. Smola and K.-R. Müller, “Nonlinear component analysis as a kernel eigenvalue problem,” *Neural Computation* **10**, 1299–1319 (1998).
7. L. van der Maaten and G. Hinton, “Visualizing data using t-SNE,” *Journal of Machine Learning Research* **9**, 2579–2605 (2008).
8. L. McInnes, J. Healy and J. Melville, “UMAP: uniform manifold approximation and projection for dimension reduction,” arXiv:1802.03426 (2018).
9. M. Wattenberg, F. Viégas and I. Johnson, “How to use t-SNE effectively,” *Distill* (2016).
10. S. P. Lloyd, “Least squares quantization in PCM,” *IEEE Transactions on Information Theory* **28**, 129–137 (1982).
11. D. Arthur and S. Vassilvitskii, “k-means++: the advantages of careful seeding,” *Proceedings of the 18th Annual ACM–SIAM Symposium on Discrete Algorithms*, 1027–1035 (2007).
12. P. J. Rousseeuw, “Silhouettes: a graphical aid to the interpretation and validation of cluster analysis,” *Journal of Computational and Applied Mathematics* **20**, 53–65 (1987).
13. A. P. Dempster, N. M. Laird and D. B. Rubin, “Maximum likelihood from incomplete data via the EM algorithm,” *Journal of the Royal Statistical Society B* **39**, 1–38 (1977).
14. M. Ester, H.-P. Kriegel, J. Sander and X. Xu, “A density-based algorithm for discovering clusters in large spatial databases with noise,” *Proceedings of KDD-96*, 226–231 (1996).
15. A. Rodriguez and A. Laio, “Clustering by fast search and find of density peaks,” *Science* **344**, 1492–1496 (2014).
16. J. H. Ward, “Hierarchical grouping to optimize an objective function,” *Journal of the American Statistical Association* **58**, 236–244 (1963).
17. X. Daura, K. Gademann, B. Jaun, D. Seebach, W. F. van Gunsteren and A. E. Mark, “Peptide folding: when simulation meets experiment,” *Angewandte Chemie International Edition* **38**, 236–240 (1999).
18. C. M. Bishop, *Pattern Recognition and Machine Learning*, Springer (2006), chapters 9 (mixture models and EM) and 12 (principal component analysis).
19. T. Hastie, R. Tibshirani and J. Friedman, *The Elements of Statistical Learning*, 2nd ed., Springer (2009), chapter 14 (unsupervised learning).

</div>
