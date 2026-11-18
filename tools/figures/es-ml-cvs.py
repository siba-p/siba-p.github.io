"""Figures for content/learn/es-ml-cvs.md.  Run: python3 tools/figures/es-ml-cvs.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Polygon
from matplotlib.colors import LinearSegmentedColormap
import style
plt = style.setup()
SLUG = "es-ml-cvs"

# Model system used by figures 2 and 3: a double well along x coupled to a soft, wide coordinate
Eb, K2, A = 3.0, 0.35, 0.8                    # U = Eb (x^2 - 1)^2 + K2 (y - A x)^2, kT = 1, D = 1
def U(x, y): return Eb * (x * x - 1) ** 2 + K2 * (y - A * x) ** 2
def force(x, y):
    s = y - A * x
    return -(4 * Eb * x * (x * x - 1) - 2 * K2 * A * s), -(2 * K2 * s)


def simulate(x0, nw, ns, dt, rng, every=25, stop_at_crossing=False):
    x = np.full(nw, x0) if np.ndim(x0) == 0 else x0.copy(); y = A * x
    alive = np.ones(nw, bool); X, Y, M = [], [], []
    for i in range(ns):
        fx, fy = force(x, y)
        x = x + fx * dt + np.sqrt(2 * dt) * rng.standard_normal(nw)
        y = y + fy * dt + np.sqrt(2 * dt) * rng.standard_normal(nw)
        if stop_at_crossing:
            alive &= np.sign(x) == np.sign(x0)
        if i % every == 0:
            X.append(x.copy()); Y.append(y.copy()); M.append(alive.copy())
    return np.array(X), np.array(Y), np.array(M)


def directions():
    """PCA and TICA from a long multi-walker run; mean difference and LDA from short runs in each state."""
    rng = np.random.default_rng(4)
    X, Y, _ = simulate(np.where(rng.random(400) < 0.5, -1.0, 1.0), 400, 20000, 2e-3, rng)
    Z = np.stack([X, Y], -1); Z = Z - Z.reshape(-1, 2).mean(0)
    nt, nw = Z.shape[:2]
    C0 = np.einsum("tni,tnj->ij", Z, Z) / (nt * nw)
    ev, vec = np.linalg.eigh(C0); pca = vec[:, -1]
    lag = 40                                                     # frames: 40 x 25 x 0.002 = 2 time units
    Ct = np.einsum("tni,tnj->ij", Z[:-lag], Z[lag:]) / ((nt - lag) * nw); Ct = (Ct + Ct.T) / 2
    C0b = 0.5 * (np.einsum("tni,tnj->ij", Z[:-lag], Z[:-lag]) + np.einsum("tni,tnj->ij", Z[lag:], Z[lag:])) / ((nt - lag) * nw)
    w, v = np.linalg.eig(np.linalg.solve(C0b, Ct)); o = np.argsort(-w.real)
    tica = v[:, o[0]].real; tica /= np.linalg.norm(tica)
    tts = -lag * 25 * 2e-3 / np.log(w.real[o])
    # short runs in each state, stopped at the first crossing of x = 0
    St = {}
    for x0 in (-1.0, 1.0):
        Xs, Ys, Ms = simulate(x0, 200, 1000, 2e-3, rng, every=10, stop_at_crossing=True)
        St[x0] = np.c_[Xs[Ms], Ys[Ms]]
    mA, mB = St[-1.0].mean(0), St[1.0].mean(0)
    Sw = np.cov(St[-1.0].T) + np.cov(St[1.0].T)
    lda = np.linalg.solve(Sw, mB - mA); lda /= np.linalg.norm(lda)
    md = (mB - mA) / np.linalg.norm(mB - mA)
    fisher = lambda u: (u @ (mB - mA)) ** 2 / (u @ Sw @ u)
    for name, u in (("PCA", pca), ("TICA", tica), ("mean difference", md), ("LDA", lda)):
        u = u * np.sign(u[0])
        print(f"{name:16s} direction ({u[0]:+.2f}, {u[1]:+.2f})  angle to x {np.degrees(np.arctan2(u[1], u[0])):5.1f} deg  "
              f"Fisher ratio {fisher(u):6.1f}")
    print(f"PCA variances {ev.round(2)}, TICA timescales {tts.round(2)}; state samples {len(St[-1.0])}, {len(St[1.0])};"
          f" means {mA.round(2)}, {mB.round(2)}")
    return dict(pca=pca * np.sign(pca[0]), tica=tica * np.sign(tica[0]), md=md, lda=lda * np.sign(lda[0]),
                SA=St[-1.0], SB=St[1.0], mA=mA, mB=mB, Sw=Sw, fisher=fisher)


def committor_grid(n=(65, 49), xr=(-2.0, 2.0), yr=(-3.0, 3.0)):
    """Committor of overdamped dynamics from a square-root-approximation rate matrix on a grid."""
    xs = np.linspace(*xr, n[0]); ys = np.linspace(*yr, n[1]); h = xs[1] - xs[0]
    GX, GY = np.meshgrid(xs, ys, indexing="ij"); u = U(GX, GY); N = GX.size
    idx = np.arange(N).reshape(n)
    Q = np.zeros((N, N))
    for (a, b) in ((idx[:-1, :], idx[1:, :]), (idx[:, :-1], idx[:, 1:])):
        a, b = a.ravel(), b.ravel()
        Q[a, b] = np.exp(-(u.ravel()[b] - u.ravel()[a]) / 2); Q[b, a] = np.exp(-(u.ravel()[a] - u.ravel()[b]) / 2)
    Q[np.diag_indices(N)] = -Q.sum(1)
    inA = (GX.ravel() < -0.9) & (np.abs(GY.ravel() + A) < 1.2)
    inB = (GX.ravel() > 0.9) & (np.abs(GY.ravel() - A) < 1.2)
    free = ~(inA | inB)
    q = np.zeros(N); q[inB] = 1
    rhs = -Q[np.ix_(free, inB)].sum(1)
    q[free] = np.linalg.solve(Q[np.ix_(free, free)], rhs)
    return GX, GY, q.reshape(n)


# ---------------------------------------------------------------------------------------------
# 1. The iterative loop: features -> train -> bias -> new data
# ---------------------------------------------------------------------------------------------
def loop():
    fig, ax = plt.subplots(figsize=(7.2, 4.0))
    ax.set_xlim(0, 10); ax.set_ylim(0, 6.1); ax.set_aspect("equal"); ax.axis("off")
    boxes = [
        ((0.2, 3.45), "1  Features", "distances, contacts,\ndihedrals, Q6, SOAP", style.BLUE),
        ((5.6, 3.45), "2  Train a model", "Deep-LDA, Deep-TICA,\nSPIB, committor net", style.VIOLET),
        ((5.6, 0.35), "3  Biased simulation", "OPES or metadynamics\non the learned s(x)", style.ORANGE),
        ((0.2, 0.35), "4  New data", "reweight by the bias;\nnew states and paths", style.TEAL),
    ]
    W, H = 4.2, 1.75
    for (x, y), head, body, col in boxes:
        ax.add_patch(FancyBboxPatch((x, y), W, H, boxstyle="round,pad=0,rounding_size=0.25", fc=style.TINT[col], ec=col, lw=1.4))
        ax.text(x + 0.3, y + H - 0.42, head, fontsize=10.5, fontweight="semibold", color=col, va="center")
        ax.text(x + 0.3, y + H - 0.85, body, fontsize=9, color=style.INK2, va="top", linespacing=1.35)
    arrow = dict(arrowstyle="-|>", mutation_scale=14, color=style.INK2, lw=1.4)
    ax.add_patch(FancyArrowPatch((4.45, 4.32), (5.55, 4.32), **arrow))
    ax.add_patch(FancyArrowPatch((7.7, 3.4), (7.7, 2.15), **arrow))
    ax.add_patch(FancyArrowPatch((5.55, 1.22), (4.45, 1.22), **arrow))
    ax.add_patch(FancyArrowPatch((2.3, 2.15), (2.3, 3.4), **arrow))
    ax.text(5.0, 2.78, "repeat until the free\nenergy stops changing", ha="center", va="center", fontsize=9.5, color=style.INK,
            fontweight="semibold", linespacing=1.3)
    ax.text(7.85, 2.78, "export with\nPYTORCH_MODEL", fontsize=8.5, color=style.INK3, va="center", linespacing=1.3)
    ax.text(2.15, 2.78, "retrain on\nall data", fontsize=8.5, color=style.INK3, va="center", ha="right", linespacing=1.3)
    ax.text(5.0, 5.7, "check every round: does s(x) separate the states it should,\n"
                        "and do the biasing forces stay bounded on new data?", ha="center", va="center", fontsize=8.5,
            color=style.INK3, linespacing=1.3)
    style.save(fig, SLUG, "loop")


# ---------------------------------------------------------------------------------------------
# 2. Linear discriminant analysis: mean difference versus the Fisher direction
# ---------------------------------------------------------------------------------------------
def lda(d):
    fig, (a1, a2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw=dict(width_ratios=[1, 1.15], wspace=0.3))
    rng = np.random.default_rng(0)
    for S, col in ((d["SA"], style.TEAL), (d["SB"], style.BLUE)):
        i = rng.choice(len(S), 600, replace=False)
        a1.scatter(S[i, 0], S[i, 1], s=4, color=col, alpha=0.45, lw=0, rasterized=True)
    c = (d["mA"] + d["mB"]) / 2
    for u, col, name, pos in ((d["md"], style.GOLD, "mean\ndifference", (1.75, 0.75)),
                              (d["lda"], style.VIOLET, "LDA", (1.75, -0.25))):
        a1.annotate("", xy=c + 1.5 * u, xytext=c, arrowprops=dict(arrowstyle="-|>", color=col, lw=2, mutation_scale=12))
        a1.text(*pos, name, color=col, fontsize=9, fontweight="semibold", linespacing=1.2)
    a1.text(-1.0, -3.0, "state A", color=style.TEAL, fontsize=9, fontweight="semibold", ha="center")
    a1.text(1.0, 2.75, "state B", color=style.BLUE, fontsize=9, fontweight="semibold", ha="center")
    a1.set_xlim(-2.0, 3.2); a1.set_ylim(-3.4, 3.4); a1.set_aspect("equal")
    a1.set_xlabel("x"); a1.set_ylabel("y")
    a1.set_title("Short runs in each state", fontsize=10)
    bins = np.linspace(-7, 7, 71)
    for k, (u, col, name) in enumerate(((d["md"], style.GOLD, "mean difference"), (d["lda"], style.VIOLET, "LDA"))):
        pA, pB = d["SA"] @ u, d["SB"] @ u
        sd = np.sqrt(0.5 * (pA.var() + pB.var())); m0 = 0.5 * (pA.mean() + pB.mean())
        off = 1.15 * (1 - k)
        for p, ls in ((pA, "-"), (pB, "-")):
            h, e = np.histogram((p - m0) / sd, bins=bins, density=True)
            a2.fill_between(0.5 * (e[1:] + e[:-1]), off, off + h, color=col, alpha=0.35 if p is pA else 0.6, lw=0)
        a2.text(-6.9, off + 0.62, f"{name}\nFisher ratio {d['fisher'](u):.0f}", color=col, fontsize=9, fontweight="semibold",
                va="bottom", linespacing=1.3)
    a2.set_yticks([]); a2.spines["left"].set_visible(False)
    a2.set_xlabel("projection (units of within-state s.d.)")
    a2.set_xlim(-7, 7); a2.set_ylim(0, 2.3)
    a2.set_title("Projected distributions of A and B", fontsize=10)
    style.save(fig, SLUG, "lda")


# ---------------------------------------------------------------------------------------------
# 3. Where each linear CV puts the transition state, against the committor
# ---------------------------------------------------------------------------------------------
def committor_map(d):
    GX, GY, q = committor_grid()
    fig, ax = plt.subplots(figsize=(5.6, 4.6))
    cm = LinearSegmentedColormap.from_list("q", [style.TEAL, "#f4f6f9", style.BLUE])
    mesh = ax.pcolormesh(GX, GY, q, cmap=cm, vmin=0, vmax=1, shading="auto", rasterized=True)
    uu = U(GX, GY)
    ax.contour(GX, GY, uu, levels=np.arange(0.5, 12, 1.5), colors=style.INK3, linewidths=0.5, alpha=0.6)
    ax.contour(GX, GY, q, levels=[0.5], colors=style.INK, linewidths=2.2)
    t = np.linspace(-4, 4, 2)
    lines = (("pca", style.ORANGE, "PCA"), ("md", style.GOLD, "mean difference"), ("lda", style.VIOLET, "LDA"),
             ("tica", style.PINK, "TICA"))
    for key, col, name in lines:
        u = d[key]; perp = np.array([-u[1], u[0]])
        ax.plot(t * perp[0], t * perp[1], color=col, lw=1.8, ls=(0, (5, 2)) if key != "md" else (0, (1.5, 1.5)))
    box = dict(fc="white", ec="none", pad=1.2, alpha=0.9)
    ax.text(-1.92, 0.62, "PCA", color=style.ORANGE, fontsize=9, fontweight="semibold", bbox=box)
    ax.text(-1.92, 2.45, "mean difference", color=style.GOLD, fontsize=9, fontweight="semibold", bbox=box)
    ax.text(0.78, -2.8, "TICA", color=style.PINK, fontsize=9, fontweight="semibold", bbox=box)
    ax.text(-0.72, -2.8, "LDA", color=style.VIOLET, fontsize=9, fontweight="semibold", bbox=box)
    ax.text(0.12, 2.65, "q = ½", color=style.INK, fontsize=9.5, fontweight="semibold", bbox=box)
    ax.text(-1.0, -1.2, "A", color="white", fontsize=14, fontweight="semibold", ha="center", va="center")
    ax.text(1.0, 1.0, "B", color="white", fontsize=14, fontweight="semibold", ha="center", va="center")
    ax.set_xlim(-2, 2); ax.set_ylim(-3, 3); ax.set_aspect("equal")
    ax.set_xlabel("x"); ax.set_ylabel("y")
    cb = fig.colorbar(mesh, ax=ax, shrink=0.75, pad=0.03); cb.set_label("committor q(x, y)"); cb.outline.set_visible(False)
    style.save(fig, SLUG, "committor-map")
    # where does the q = 1/2 line cross y = +-2?
    for yv in (-2.0, 2.0):
        j = np.argmin(np.abs(GY[0] - yv)); xi = np.interp(0.5, q[:, j], GX[:, 0])
        print(f"committor 1/2 isoline crosses y = {yv:+.0f} at x = {xi:+.3f}")


# ---------------------------------------------------------------------------------------------
# Cover: many tangled input features funnelled into one clean coordinate
# ---------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        rng = np.random.default_rng(11)
        cols = [style.BLUE, style.VIOLET, style.TEAL, style.PINK, style.GOLD]
        for k in range(14):
            y0 = 0.35 + 2.3 * k / 13
            t = np.linspace(0, 1, 100)
            xx = 0.25 + 1.75 * t
            yy = y0 + (1.5 - y0) * t ** 1.6 + 0.12 * np.sin(2 * np.pi * (2 + k % 3) * t + k) * (1 - t)
            ax.plot(xx, yy, color=cols[k % 5], lw=2.6, alpha=0.9, solid_capstyle="round")
        ax.add_patch(Polygon([[1.85, 1.0], [2.25, 1.3], [2.25, 1.7], [1.85, 2.0]], color=style.INK, zorder=3))
        ax.plot([2.25, 3.75], [1.5, 1.5], color=style.ORANGE, lw=9, solid_capstyle="round", zorder=2)
        for xx, r in ((2.75, 0.17), (3.55, 0.17)):
            ax.add_patch(Circle((xx, 1.5), r, color="white", zorder=4))
        ax.add_patch(Circle((2.75, 1.5), 0.1, color=style.TEAL, zorder=5))
        ax.add_patch(Circle((3.55, 1.5), 0.1, color=style.BLUE, zorder=5))
    style.cover(SLUG, draw, bg=style.TINT[style.VIOLET])


if __name__ == "__main__":
    loop()
    d = directions()
    lda(d); committor_map(d); cover()
