"""Figures for content/learn/dimensionality-reduction-and-clustering.md.
Run: python3 tools/figures/dimensionality-reduction-and-clustering.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import Ellipse, FancyArrowPatch, Circle
import style
plt = style.setup()
SLUG = "dimensionality-reduction-and-clustering"
COLS = [style.BLUE, style.ORANGE, style.TEAL, style.VIOLET, style.PINK, style.GOLD]


# ---------------------------------------------------------------------------------------------------------------
def pca_geometry():
    """The worked example C = [[3, 2], [2, 3]]: axes, one projection, and the variance as the direction turns."""
    C = np.array([[3.0, 2.0], [2.0, 3.0]])
    lam, V = np.linalg.eigh(C); lam, V = lam[::-1], V[:, ::-1]
    rng = np.random.default_rng(4)
    X = rng.multivariate_normal([0, 0], C, size=300)
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.4), gridspec_kw=dict(wspace=0.3, width_ratios=[1, 1.1]))
    ax = axs[0]
    ax.scatter(X[:, 0], X[:, 1], s=7, color=style.INK3, alpha=0.45, lw=0, rasterized=True)
    for k, c in [(0, style.BLUE), (1, style.ORANGE)]:
        v = V[:, k] * 2 * np.sqrt(lam[k]) * (1 if V[0, k] > 0 else -1)
        ax.add_patch(FancyArrowPatch((0, 0), tuple(v), arrowstyle="-|>", mutation_scale=14, lw=2.4, color=c, zorder=4))
    ax.text(3.4, 3.4, "PC1, $\\lambda_1 = 5$", color=style.BLUE, fontsize=9, ha="center", va="bottom")
    ax.text(1.9, -2.2, "PC2, $\\lambda_2 = 1$", color=style.ORANGE, fontsize=9, ha="left", va="top")
    # one point, its projection onto PC1 and the residual
    p = np.array([-1.0, 2.6]); u = V[:, 0] * np.sign(V[0, 0]); q = (p @ u) * u
    ax.plot(*p, "o", color=style.PINK, ms=6, zorder=6)
    ax.plot(*q, "o", color=style.BLUE, ms=5, zorder=6, mfc="white", mew=1.5)
    ax.plot([p[0], q[0]], [p[1], q[1]], color=style.PINK, lw=1.4, ls=(0, (3, 2)), zorder=5)
    ax.annotate("residual: what one\ncomponent cannot keep", ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2), xytext=(-5.3, 4.4),
                fontsize=8.5, color=style.PINK, va="center", arrowprops=dict(arrowstyle="-", color=style.PINK, lw=0.7, shrinkB=3))
    ax.set_xlim(-5.5, 5.5); ax.set_ylim(-5.5, 5.5); ax.set_aspect("equal")
    ax.set_xticks([-4, 0, 4]); ax.set_yticks([-4, 0, 4])
    ax.set_xlabel("feature 1"); ax.set_ylabel("feature 2")
    ax.set_title("Covariance [[3, 2], [2, 3]]")

    ax = axs[1]
    th = np.linspace(0, 180, 361)
    t = np.deg2rad(th)
    var = 3 + 2 * np.sin(2 * t)                      # v(θ)ᵀ C v(θ) for v = (cos θ, sin θ)
    total = np.trace(C)
    ax.fill_between(th, var, total, color=style.TINT[style.PINK])
    ax.fill_between(th, 0, var, color=style.TINT[style.BLUE])
    ax.plot(th, var, color=style.BLUE)
    ax.axhline(total, color=style.INK3, lw=0.8)
    ax.text(178, total + 0.12, "total variance 6", color=style.INK2, fontsize=8.5, ha="right", va="bottom")
    ax.text(150, 4.9, "mean squared\nresidual", color=style.PINK, fontsize=8.5, ha="center", va="center")
    ax.text(22, 1.3, "variance kept", color=style.BLUE, fontsize=8.5, ha="center")
    ax.plot([45], [5], "o", color=style.BLUE, ms=6); ax.plot([135], [1], "o", color=style.ORANGE, ms=6)
    ax.text(45, 5.25, "45°: PC1 keeps 5 of 6", fontsize=8.5, color=style.BLUE, ha="center", va="bottom")
    ax.text(135, 0.72, "135°: PC2 keeps 1", fontsize=8.5, color=style.ORANGE, ha="center", va="top")
    ax.set_xlim(0, 180); ax.set_ylim(0, 7)
    ax.set_xticks([0, 45, 90, 135, 180]); ax.set_xticklabels(["0°", "45°", "90°", "135°", "180°"])
    ax.set_xlabel("direction θ of the projection axis"); ax.set_ylabel("variance (feature units²)")
    ax.set_title("Most variance kept = least residual")
    style.save(fig, SLUG, "pca-geometry")


# ---------------------------------------------------------------------------------------------------------------
def cell_data():
    """Exactly the chapter's Python cell (seed 1): returns the explained variance, PC scores, labels, centres, truth."""
    rng = np.random.default_rng(1)
    centres = np.array([[0.0, 0.0], [4.0, 0.0], [2.0, 3.0]])
    truth = np.repeat([0, 1, 2], 200)
    Z = np.hstack([centres[truth] + rng.normal(0, 0.7, (600, 2)), rng.normal(0, 0.3, (600, 8))])
    Q, _ = np.linalg.qr(rng.normal(size=(10, 10)))
    X = Z @ Q.T
    Xc = X - X.mean(axis=0)
    U, s, Vt = np.linalg.svd(Xc, full_matrices=False)
    P = Xc @ Vt[:2].T
    C = P[rng.choice(600, 3, replace=False)]
    for it in range(6):
        d2 = ((P[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
        a = d2.argmin(axis=1)
        C = np.array([P[a == k].mean(axis=0) for k in range(3)])
    return s ** 2 / np.sum(s ** 2), P, a, C, truth


def scree_and_clusters():
    evr, P, a, C, truth = cell_data()
    major = np.array([np.bincount(truth[a == k]).argmax() for k in range(3)])
    print(f"  explained variance {np.round(evr, 3)}; agreement {np.mean(major[a] == truth):.3f}")
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.32, width_ratios=[1, 1.15]))
    ax = axs[0]
    k = np.arange(1, 11)
    ax.bar(k, evr, color=[style.BLUE, style.BLUE] + [style.INK3] * 8, width=0.7)
    for i in range(2):
        ax.text(k[i], evr[i] + 0.012, f"{evr[i]:.2f}", ha="center", va="bottom", fontsize=8.5, color=style.BLUE)
    ax.annotate("noise floor:\neight components\nof about 0.015 each", (6.5, 0.02), xytext=(5.2, 0.24), fontsize=8.5,
                color=style.INK2, ha="center", arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.7, shrinkB=3))
    ax.set_xticks(k); ax.set_ylim(0, 0.58)
    ax.set_xlabel("principal component"); ax.set_ylabel("explained variance ratio")
    ax.set_title("Scree plot")
    ax = axs[1]
    wrong = major[a] != truth
    for j in range(3):
        m = (a == j)
        ax.scatter(P[m, 0], P[m, 1], s=9, color=COLS[j], alpha=0.55, lw=0, rasterized=True)
    ax.scatter(P[wrong, 0], P[wrong, 1], s=26, facecolor="none", edgecolor=style.INK, lw=0.8)
    for j in range(3):
        ax.plot(*C[j], marker="X", ms=11, color=COLS[j], mec="white", mew=1.4, zorder=5)
    ax.text(0.03, 0.04, f"{wrong.sum()} of 600 points (ringed)\ndisagree with the hidden states", transform=ax.transAxes,
            fontsize=8.5, color=style.INK2, va="bottom")
    ax.set_xlabel("PC1 score"); ax.set_ylabel("PC2 score"); ax.set_aspect("equal", adjustable="datalim")
    ax.set_title("k-means (k = 3) on PC1 and PC2")
    style.save(fig, SLUG, "scree-and-clusters")


# ---------------------------------------------------------------------------------------------------------------
def kmeans(X, k, rng, restarts=10, iters=100):
    best = (np.inf, None, None)
    for _ in range(restarts):
        C = [X[rng.integers(len(X))]]                      # k-means++ seeding
        for _ in range(k - 1):
            d2 = np.min(((X[:, None] - np.array(C)[None]) ** 2).sum(2), axis=1)
            C.append(X[rng.choice(len(X), p=d2 / d2.sum())])
        C = np.array(C)
        for _ in range(iters):
            a = ((X[:, None] - C[None]) ** 2).sum(2).argmin(1)
            Cn = np.array([X[a == j].mean(0) if np.any(a == j) else C[j] for j in range(k)])
            if np.allclose(Cn, C): break
            C = Cn
        J = ((X - C[a]) ** 2).sum()
        if J < best[0]: best = (J, a, C)
    return best


def silhouette(X, a):
    D = np.sqrt(((X[:, None] - X[None]) ** 2).sum(2))
    ks = np.unique(a); s = np.zeros(len(X))
    for i in range(len(X)):
        own = (a == a[i]); n = own.sum()
        ai = D[i, own].sum() / max(n - 1, 1)
        bi = min(D[i, a == k].mean() for k in ks if k != a[i])
        s[i] = 0 if n == 1 else (bi - ai) / max(ai, bi)
    return s.mean()


def choosing_k():
    _, P, _, _, _ = cell_data()
    rng = np.random.default_rng(0)
    ks = np.arange(1, 9); J = []; S = []
    for k in ks:
        Jk, a, _ = kmeans(P, k, rng)
        J.append(Jk); S.append(silhouette(P, a) if k > 1 else np.nan)
    J = np.array(J); S = np.array(S)
    print("  J:", np.round(J, 1)); print("  silhouette:", np.round(S, 3))
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.1), gridspec_kw=dict(wspace=0.38))
    ax = axs[0]
    ax.plot(ks, J, "-o", color=style.BLUE, ms=5)
    ax.plot(3, J[2], "o", ms=12, mfc="none", mec=style.ORANGE, mew=1.8)
    ax.annotate(f"elbow at k = 3\nJ = {J[2]:.0f}", (3, J[2]), xytext=(4.3, J[0] * 0.55), fontsize=8.5, color=style.ORANGE,
                arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.7, shrinkB=7))
    ax.set_xticks(ks); ax.set_ylim(0, J[0] * 1.08)
    ax.set_xlabel("number of clusters k"); ax.set_ylabel("within-cluster sum of squares J")
    ax.set_title("Elbow")
    ax = axs[1]
    ax.plot(ks[1:], S[1:], "-o", color=style.TEAL, ms=5)
    i = np.nanargmax(S)
    ax.plot(ks[i], S[i], "o", ms=12, mfc="none", mec=style.ORANGE, mew=1.8)
    ax.annotate(f"maximum {S[i]:.2f}\nat k = {ks[i]}", (ks[i], S[i]), xytext=(5.0, S[i] - 0.03), fontsize=8.5,
                color=style.ORANGE, va="top", arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.7, shrinkB=7))
    ax.set_xticks(ks[1:]); ax.set_xlim(1.5, 8.5); ax.set_ylim(0, 0.75)
    ax.set_xlabel("number of clusters k"); ax.set_ylabel("mean silhouette")
    ax.set_title("Silhouette")
    style.save(fig, SLUG, "choosing-k")


# ---------------------------------------------------------------------------------------------------------------
def moons_data(rng):
    n = 150
    t = rng.uniform(0, np.pi, n)
    A = np.c_[np.cos(t), np.sin(t)] + rng.normal(0, 0.07, (n, 2))
    t = rng.uniform(0, np.pi, n)
    B = np.c_[1 - np.cos(t), 0.45 - np.sin(t)] + rng.normal(0, 0.07, (n, 2))
    R = np.array([[np.cos(0.2), -np.sin(0.2)], [np.sin(0.2), np.cos(0.2)]])
    E = (rng.normal(0, 1, (150, 2)) * [0.8, 0.09]) @ R.T + [0.5, -1.45]
    noise = np.c_[rng.uniform(-1.4, 2.4, 30), rng.uniform(-2.3, 1.4, 30)]
    return np.vstack([A, B, E, noise])


def gmm(X, K, rng, iters=300):
    n, d = X.shape
    _, a, mu = kmeans(X, K, rng, restarts=5)
    S = np.array([np.cov(X[a == k].T) + 1e-3 * np.eye(d) for k in range(K)]); pi = np.bincount(a, minlength=K) / n
    for _ in range(iters):
        logp = np.empty((n, K))
        for k in range(K):
            Si = np.linalg.inv(S[k]); dx = X - mu[k]
            logp[:, k] = np.log(pi[k]) - 0.5 * np.einsum("ij,jk,ik->i", dx, Si, dx) - 0.5 * np.log(np.linalg.det(2 * np.pi * S[k]))
        r = np.exp(logp - logp.max(1, keepdims=True)); r /= r.sum(1, keepdims=True)     # E-step
        Nk = r.sum(0); pi = Nk / n; mu = (r.T @ X) / Nk[:, None]                          # M-step
        S = np.array([((r[:, k, None] * (X - mu[k])).T @ (X - mu[k])) / Nk[k] + 1e-4 * np.eye(d) for k in range(K)])
    return r.argmax(1), mu, S


def dbscan(X, eps, minpts):
    D = np.sqrt(((X[:, None] - X[None]) ** 2).sum(2))
    nb = [np.flatnonzero(D[i] <= eps) for i in range(len(X))]
    core = np.array([len(x) >= minpts for x in nb])
    lab = -np.ones(len(X), int); c = 0
    for i in range(len(X)):
        if not core[i] or lab[i] >= 0: continue
        stack = [i]; lab[i] = c
        while stack:
            j = stack.pop()
            if not core[j]: continue
            for q in nb[j]:
                if lab[q] < 0:
                    lab[q] = c; stack.append(q)
        c += 1
    return lab


def three_clusterers():
    rng = np.random.default_rng(7)
    X = moons_data(rng)
    _, ak, Ck = kmeans(X, 3, np.random.default_rng(0))
    ag, mug, Sg = gmm(X, 3, np.random.default_rng(0))
    ad = dbscan(X, eps=0.25, minpts=8)
    print(f"  DBSCAN: {ad.max() + 1} clusters, {np.sum(ad < 0)} noise points")
    fig, axs = plt.subplots(1, 3, figsize=(7.2, 3.0), gridspec_kw=dict(wspace=0.06))
    titles = ["k-means, k = 3", "Gaussian mixture, K = 3", "DBSCAN, ε = 0.25, 8 points"]
    for ax, lab, ttl in zip(axs, [ak, ag, ad], titles):
        for j in range(lab.max() + 1):
            m = lab == j
            ax.scatter(X[m, 0], X[m, 1], s=8, color=COLS[j % 6], lw=0, alpha=0.8, rasterized=True)
        if np.any(lab < 0):
            ax.scatter(X[lab < 0, 0], X[lab < 0, 1], s=10, marker="x", color=style.INK3, lw=0.8, rasterized=True)
        ax.set_aspect("equal"); ax.set_xlim(-1.5, 2.5); ax.set_ylim(-2.75, 1.45)
        ax.set_xticks([]); ax.set_yticks([])
        for sp in ax.spines.values(): sp.set_visible(True); sp.set_color(style.LINE)
        ax.set_title(ttl, fontsize=9.5)
    for j in range(3):
        axs[0].plot(*Ck[j], marker="X", ms=9, color=COLS[j], mec="white", mew=1.2, zorder=5)
        w, v = np.linalg.eigh(Sg[j]); ang = np.degrees(np.arctan2(v[1, 1], v[0, 1]))
        axs[1].add_patch(Ellipse(mug[j], 4 * np.sqrt(w[1]), 4 * np.sqrt(w[0]), angle=ang, fc="none", ec=COLS[j], lw=1.4))
    axs[0].text(0.5, -2.68, "straight boundaries cut the moons", fontsize=8, color=style.INK2, ha="center", va="bottom")
    axs[1].text(0.5, -2.68, "ellipses fit the streak, not the arcs", fontsize=8, color=style.INK2, ha="center", va="bottom")
    axs[2].text(0.5, -2.68, "any shape; × marks noise", fontsize=8, color=style.INK2, ha="center", va="bottom")
    style.save(fig, SLUG, "three-clusterers")


# ---------------------------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        rng = np.random.default_rng(2)
        R = np.array([[np.cos(0.6), -np.sin(0.6)], [np.sin(0.6), np.cos(0.6)]])
        centres = [(1.05, 0.95), (2.0, 1.6), (2.95, 2.2)]
        for c, col in zip(centres, [style.BLUE, style.ORANGE, style.TEAL]):
            pts = (rng.normal(0, 1, (22, 2)) * [0.26, 0.16]) @ R.T + c
            for p in pts:
                ax.add_patch(Circle(p, 0.055, color=col, zorder=3))
            ax.add_patch(Circle(c, 0.12, fc="white", ec=col, lw=3, zorder=4))
        ax.add_patch(FancyArrowPatch((0.3, 0.5), (3.75, 2.62), arrowstyle="-|>", mutation_scale=24, lw=3.2,
                                     color=style.VIOLET, zorder=2))
        # the shadow: projections onto a line at the bottom
        ax.plot([0.35, 3.65], [0.22, 0.22], color=style.INK3, lw=1.5, zorder=1)
        for c, col in zip(centres, [style.BLUE, style.ORANGE, style.TEAL]):
            ax.add_patch(plt.Rectangle((c[0] - 0.28, 0.12), 0.56, 0.2, color=col, alpha=0.85, zorder=2))
    style.cover(SLUG, draw, bg=style.TINT[style.VIOLET])


if __name__ == "__main__":
    pca_geometry(); scree_and_clusters(); choosing_k(); three_clusterers(); cover()
