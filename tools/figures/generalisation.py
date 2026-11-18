"""Figures for content/learn/generalisation.md.  Run: python3 tools/figures/generalisation.py
The data model matches the chapter's lab: y = truth(x) + N(0, 0.18^2) on [0, 4], 14 training points,
Legendre polynomial features, ridge penalty lambda * N * |w|^2."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from numpy.polynomial import legendre
from matplotlib.patches import FancyBboxPatch, Polygon, Circle
import style
plt = style.setup()
SLUG = "generalisation"
SIG, NTR = 0.18, 14
truth = lambda x: 0.9 * np.sin(2.6 * x) * np.exp(-0.25 * x) + 0.15 * x
feat = lambda x, d: legendre.legvander(x / 2 - 1, d)


def sample(rng, n=NTR):
    x = 4 * (np.arange(n) + 0.5 + (rng.random(n) - 0.5) * 0.8) / n
    return x, truth(x) + SIG * rng.normal(size=n)


def fit(x, y, d, lam):
    X = feat(x, d)
    return np.linalg.solve(X.T @ X + lam * len(x) * np.eye(d + 1), X.T @ y)


def fan():
    """Twenty fits from twenty noisy samples, for a rigid, a moderate and a flexible model."""
    rng = np.random.default_rng(5)
    xs = np.linspace(0, 4, 300)
    cases = [(1, 0.0, "degree 1: high bias", style.ORANGE), (5, 0.0, "degree 5: about right", style.TEAL),
             (11, 0.0, "degree 11, λ = 0: high variance", style.PINK)]
    samples = [sample(rng) for _ in range(20)]
    fig, axs = plt.subplots(1, 3, figsize=(7.2, 2.9), sharey=True, gridspec_kw=dict(wspace=0.08))
    stats = []
    for ax, (d, lam, title, c) in zip(axs, cases):
        preds = np.array([feat(xs, d) @ fit(x, y, d, lam) for x, y in samples])
        for p in preds:
            ax.plot(xs, p, color=c, lw=0.8, alpha=0.45)
        ax.plot(xs, preds.mean(0), color=style.INK, lw=1.8)
        ax.plot(xs, truth(xs), color=style.INK3, lw=1.6, ls=(0, (4, 3)))
        ax.set_title(title, fontsize=9.5)
        ax.set_xlim(0, 4); ax.set_ylim(-1.4, 1.6); ax.set_xlabel("input $x$")
        stats.append((d, np.mean((preds.mean(0) - truth(xs)) ** 2), np.mean(preds.var(0))))
    axs[0].set_ylabel("output $y$")
    axs[0].text(0.15, -1.25, "dashed: truth   black: average fit", fontsize=8.5, color=style.INK2)
    style.save(fig, SLUG, "fan")
    return stats


def tradeoff():
    """Bias squared, variance and expected test error of a degree-11 ridge fit as the penalty changes."""
    rng = np.random.default_rng(1)
    xs = np.linspace(0.05, 3.95, 200)
    lams = np.logspace(-9, 1, 41)
    R = 600
    samples = [sample(rng) for _ in range(R)]
    b2, var = [], []
    for lam in lams:
        P = np.array([feat(xs, 11) @ fit(x, y, 11, lam) for x, y in samples])
        b2.append(np.mean((P.mean(0) - truth(xs)) ** 2)); var.append(np.mean(P.var(0)))
    b2, var = np.array(b2), np.array(var)
    tot = b2 + var + SIG ** 2
    i = np.argmin(tot)
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    ax.loglog(lams, var, color=style.PINK); ax.loglog(lams, b2, color=style.ORANGE)
    ax.loglog(lams, tot, color=style.BLUE, lw=3)
    ax.axhline(SIG ** 2, color=style.INK3, lw=1, ls=(0, (3, 3)))
    ax.plot(lams[i], tot[i], "o", color=style.BLUE, ms=7)
    ax.annotate(f"best λ ≈ {lams[i]:.0e}\nexpected error {tot[i]:.3f}\n(RMSE {np.sqrt(tot[i]):.2f})", (lams[i], tot[i]),
                xytext=(lams[i] * 0.12, 0.25), fontsize=9, color=style.BLUE, ha="center",
                arrowprops=dict(arrowstyle="-", color=style.BLUE, lw=0.8, shrinkB=5))
    ax.text(2e-9, var[0] * 1.35, "variance", color=style.PINK, fontsize=9)
    ax.text(2e-9, b2[0] * 0.5, "bias²", color=style.ORANGE, fontsize=9)
    ax.text(6, tot[-1] * 1.35, "expected test error", color=style.BLUE, fontsize=9, ha="right")
    ax.text(2e-9, SIG ** 2 * 1.25, f"noise σ² = {SIG ** 2:.4f}", color=style.INK2, fontsize=9)
    ax.set_xlim(1e-9, 10); ax.set_ylim(1e-4, 30)
    ax.set_xlabel("ridge penalty λ (degree-11 polynomial, 14 training points)")
    ax.set_ylabel("mean squared error")
    style.save(fig, SLUG, "tradeoff")
    return lams[i], tot[i], var[0] + b2[0] + SIG ** 2, b2[i], var[i]


def geometry():
    """Ridge and lasso as constrained least squares: why the lasso lands on a corner."""
    w0 = np.array([1.6, 0.55])                    # unpenalised least-squares solution
    A = np.array([[1.0, 0.45], [0.45, 0.7]])      # loss Hessian (elliptical contours)
    g = np.linspace(-1.6, 2.6, 400); W1, W2 = np.meshgrid(g, g)
    D = np.stack([W1 - w0[0], W2 - w0[1]])
    Q = np.einsum("i...,ij,j...->...", D, A, D)
    t = 1.0
    # constrained minima found numerically on the boundary
    ang = np.linspace(0, 2 * np.pi, 20001)
    circ = np.stack([t * np.cos(ang), t * np.sin(ang)])
    qc = np.einsum("in,ij,jn->n", circ - w0[:, None], A, circ - w0[:, None]); wr = circ[:, np.argmin(qc)]
    s = np.linspace(-1, 1, 20001)
    dia = np.concatenate([np.stack([1 - np.abs(s), s]), np.stack([-(1 - np.abs(s)), s])], axis=1) * t
    qd = np.einsum("in,ij,jn->n", dia - w0[:, None], A, dia - w0[:, None]); wl = dia[:, np.argmin(qd)]
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.4), gridspec_kw=dict(wspace=0.15))
    for ax, name, shape, wopt, c in [(axs[0], "ridge: $w_1^2 + w_2^2 \\leq t^2$", "circle", wr, style.BLUE),
                                     (axs[1], "lasso: $|w_1| + |w_2| \\leq t$", "diamond", wl, style.VIOLET)]:
        qmin = np.einsum("i,ij,j->", wopt - w0, A, wopt - w0)
        ax.contour(W1, W2, Q, levels=[qmin * f for f in (0.15, 0.45, 1.0)] + [qmin * 1.8, qmin * 2.8],
                   colors=[style.INK3] * 2 + [style.ORANGE] + [style.INK3] * 2, linewidths=[0.8, 0.8, 1.8, 0.8, 0.8])
        if shape == "circle":
            ax.add_patch(Circle((0, 0), t, color=style.TINT[c], ec=c, lw=1.8))
        else:
            ax.add_patch(Polygon([[t, 0], [0, t], [-t, 0], [0, -t]], closed=True, fc=style.TINT[c], ec=c, lw=1.8))
        ax.axhline(0, color=style.INK3, lw=0.8); ax.axvline(0, color=style.INK3, lw=0.8)
        ax.plot(*w0, "o", color=style.ORANGE, ms=7)
        ax.plot(*wopt, "o", color=c, ms=8, zorder=5)
        ax.text(w0[0] + 0.12, w0[1] + 0.12, "least squares", color=style.ORANGE, fontsize=9,
                bbox=dict(fc="white", ec="none", pad=1.0))
        lab = f"$w_2$ = {wopt[1]:.2f}" if shape == "circle" else "$w_2$ = 0 exactly"
        ax.annotate(lab, wopt, xytext=(0.9, -1.15), fontsize=9, color=c, bbox=dict(fc="white", ec="none", pad=1.0),
                    arrowprops=dict(arrowstyle="-", color=c, lw=0.8, shrinkB=5))
        ax.set_title(name, fontsize=10)
        ax.set_xlim(-1.5, 2.5); ax.set_ylim(-1.5, 2.0); ax.set_aspect("equal")
        ax.set_xlabel("weight $w_1$"); ax.set_xticks([]); ax.set_yticks([])
        for sp in ("left", "bottom"): ax.spines[sp].set_visible(False)
    axs[0].set_ylabel("weight $w_2$")
    style.save(fig, SLUG, "geometry")
    return wr, wl


def splits():
    """k-fold cross-validation, and random against grouped splits of MD trajectory frames."""
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.12, width_ratios=[1, 1.15]))
    ax = axs[0]
    k = 5
    for i in range(k):
        for j in range(k):
            val = i == j
            ax.add_patch(FancyBboxPatch((j * 1.0 + 0.06, (k - 1 - i) * 0.9 + 0.08), 0.88, 0.62,
                                        boxstyle="round,pad=0,rounding_size=0.08",
                                        fc=style.ORANGE if val else style.TINT[style.BLUE],
                                        ec=style.ORANGE if val else style.BLUE, lw=1.0))
        ax.text(-0.15, (k - 1 - i) * 0.9 + 0.39, f"fit {i + 1}", ha="right", va="center", fontsize=9, color=style.INK2)
    ax.text(2.5, 4.75, "5-fold cross-validation", ha="center", fontsize=10, fontweight="semibold", color=style.INK)
    ax.text(0.06, -0.3, "training folds", fontsize=9, color=style.BLUE, va="center")
    ax.text(4.94, -0.3, "validation fold", fontsize=9, color=style.ORANGE, va="center", ha="right")
    ax.set_xlim(-1.1, 5.1); ax.set_ylim(-0.6, 5.0); ax.axis("off")
    ax = axs[1]
    rng = np.random.default_rng(2)
    cols = [style.BLUE, style.TEAL, style.VIOLET, style.GOLD]
    nf = 14
    ax.text(0.0, 4.75, "trajectory frames: four MD runs", fontsize=10, fontweight="semibold", color=style.INK)
    for row, (label, y0) in enumerate([("random split", 3.2), ("split by run", 1.2)]):
        ax.text(0.0, y0 + 0.95, label, fontsize=9.5, color=style.INK2)
        test_run = 2
        for r in range(4):
            mask = rng.random(nf) < 0.25
            for f in range(nf):
                held = mask[f] if row == 0 else (r == test_run)
                x = f * 0.36; y = y0 + 0.55 - r * 0.25 - (0 if row == 0 else 0)
                ax.add_patch(plt.Rectangle((x, y0 + 0.62 - r * 0.22), 0.3, 0.16,
                                           fc=cols[r] if not held else "white", ec=cols[r], lw=1.2))
        ax.text(nf * 0.36 + 0.1, y0 + 0.3, "test frames sit between\nnear-identical training frames" if row == 0
                else "test run never seen\nin training", fontsize=8.5, color=style.PINK if row == 0 else style.TEAL,
                va="center")
    ax.text(0.0, 0.55, "filled: training     open: test", fontsize=8.5, color=style.INK2)
    ax.set_xlim(-0.1, 7.6); ax.set_ylim(0.3, 5.0); ax.axis("off")
    style.save(fig, SLUG, "splits")


def cover():
    def draw(ax):
        rng = np.random.default_rng(4)
        x = np.linspace(0.45, 3.55, 9)
        f = lambda u: 1.5 + 0.7 * np.sin(1.6 * u - 0.6)
        y = f(x) + 0.28 * rng.normal(size=x.size)
        xs = np.linspace(x[0] - 0.08, x[-1] + 0.08, 400)
        p = np.polyfit(x, y, 8)
        ax.plot(xs, np.clip(np.polyval(p, xs), 0.12, 2.88), color=style.PINK, lw=4, alpha=0.9)
        ax.plot(xs, f(xs), color=style.TEAL, lw=7, solid_capstyle="round")
        ax.scatter(x, y, s=150, color=style.INK, zorder=5, lw=0)
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    print("fan (degree, bias2, variance):", fan())
    print("tradeoff (best lam, best err, err at lam=1e-9, bias2, var at best):", tradeoff())
    print("geometry (ridge w, lasso w):", geometry())
    splits(); cover()
