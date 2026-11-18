"""Figures for content/learn/monte-carlo.md.  Run: python3 tools/figures/monte-carlo.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import Circle, FancyArrowPatch, Rectangle, FancyBboxPatch
plt = style.setup()
SLUG = "monte-carlo"


# ---------------------------------------------------------------- a three-state Markov chain converging
def three_state_matrix(E):
    """Metropolis transition matrix: propose one of the other states with probability 1/2 each."""
    n = len(E); P = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            if i != j:
                P[i, j] = 0.5 * min(1.0, np.exp(-(E[j] - E[i])))
        P[i, i] = 1 - P[i].sum()
    return P


def three_state():
    E = np.array([0.0, 1.0, 2.0])                             # energies in units of kBT
    P = three_state_matrix(E)
    w = np.exp(-E); w /= w.sum()
    cols = [style.BLUE, style.TEAL, style.ORANGE]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(width_ratios=[1, 1.25], wspace=0.32))
    p = np.array([0.0, 0.0, 1.0]); hist = [p]
    for _ in range(10):
        p = p @ P; hist.append(p)
    hist = np.array(hist)
    for k in range(3):
        a1.axhline(w[k], color=cols[k], lw=0.9, ls=(0, (3, 3)), alpha=0.8)
        a1.plot(range(11), hist[:, k], "o-", color=cols[k], ms=4.5, lw=1.6)
    a1.set_xticks(range(0, 11, 2)); a1.set_xlabel("step t"); a1.set_ylabel("probability of each state"); a1.set_ylim(-0.03, 1.05)
    a1.set_title("Exact: the distribution", fontsize=10)
    for k, lab in enumerate(["$E = 0$", "$E = k_BT$", "$E = 2k_BT$"]):
        a1.text(10.3, w[k] + (0.035 if k != 2 else -0.045), lab, color=cols[k], fontsize=9, ha="right", va="center")
    # one stochastic chain: running fraction of time in each state
    rng = np.random.default_rng(7); n = 20000; s = 2; counts = np.zeros(3); frac = np.zeros((n, 3))
    for t in range(n):
        u = rng.random(); s = int(np.searchsorted(np.cumsum(P[s]), u, side="right")); s = min(s, 2)
        counts[s] += 1; frac[t] = counts / (t + 1)
    t = np.unique(np.r_[np.arange(1, 60), np.geomspace(60, n, 400).astype(int)])
    for k in range(3):
        a2.axhline(w[k], color=cols[k], lw=0.9, ls=(0, (3, 3)), alpha=0.8)
        a2.plot(t, frac[t - 1, k], color=cols[k], lw=1.4)
    a2.set_xscale("log"); a2.set_xlim(1, n); a2.set_ylim(-0.03, 1.05)
    a2.set_xlabel("number of steps (log scale)"); a2.set_ylabel("fraction of steps in each state")
    a2.set_title("Sampled: one chain's time averages", fontsize=10)
    a2.text(150, 0.47, "dashed: Boltzmann\n0.665, 0.245, 0.090", fontsize=9, color=style.INK2, va="top")
    style.save(fig, SLUG, "three-state")
    return P, w, frac[-1]


# ---------------------------------------------------------------- the cost of discarding rejected moves
def rejections(D=4.0, N=400000):
    rng = np.random.default_rng(3)
    steps = rng.uniform(-D, D, N); us = rng.random(N)
    x = 0.0; xs = np.empty(N); acc = []
    for k in range(N):
        y = x + steps[k]
        if us[k] < np.exp(-(y * y - x * x) / 2):
            x = y; acc.append(x)
        xs[k] = x
    acc = np.array(acc)
    g = np.linspace(-4.5, 4.5, 721); d = np.linspace(-D, D, 801)
    a = np.array([np.mean(np.minimum(1, np.exp(-((xx + d) ** 2 - xx ** 2) / 2))) for xx in g])
    p = np.exp(-g * g / 2); p /= np.trapezoid(p, g)
    q = p * a; q /= np.trapezoid(q, g)
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    bins = np.linspace(-4.5, 4.5, 46)
    ax.hist(xs, bins=bins, density=True, color=style.TINT[style.BLUE], ec="white", lw=0.6)
    ax.hist(acc, bins=bins, density=True, histtype="step", color=style.PINK, lw=1.6)
    ax.plot(g, p, color=style.BLUE, lw=2.0)
    ax.plot(g, q, color=style.PINK, lw=1.2, ls=(0, (3, 2)))
    ax.annotate(f"every step counted\n$\\langle x^2\\rangle$ = {np.mean(xs ** 2):.3f}  (exact 1)", xy=(0.25, p[np.argmin(abs(g - 0.25))]),
                xytext=(1.25, 0.42), fontsize=9, color=style.BLUE, va="center",
                arrowprops=dict(arrowstyle="-", color=style.BLUE, lw=0.8))
    ax.annotate(f"only accepted moves counted\n$\\langle x^2\\rangle$ = {np.mean(acc ** 2):.3f}", xy=(-1.6, q[np.argmin(abs(g + 1.6))]),
                xytext=(-4.4, 0.36), fontsize=9, color=style.PINK, va="center",
                arrowprops=dict(arrowstyle="-", color=style.PINK, lw=0.8))
    ax.set_xlabel("$x$ (harmonic well $U = x^2/2$, energies in units of $k_BT$)"); ax.set_ylabel("probability density")
    ax.set_xlim(-4.5, 4.5); ax.set_ylim(0, 0.47)
    style.save(fig, SLUG, "rejections")
    return len(acc) / N, np.mean(xs ** 2), np.mean(acc ** 2), np.trapezoid(q * g * g, g), a[np.argmin(abs(g))], a[np.argmin(abs(g - 2))]


# ---------------------------------------------------------------- the moves that define each ensemble
def moves():
    fig, ax = plt.subplots(figsize=(7.7, 2.75))
    ax.set_xlim(0, 7.7); ax.set_ylim(0, 2.75); ax.set_aspect("equal"); ax.axis("off")
    rng = np.random.default_rng(11)
    pos = np.array([[0.25, 0.3], [0.7, 0.22], [0.5, 0.62], [0.2, 0.78], [0.78, 0.75], [0.45, 0.4]])

    def box(x0, y0, L, col=style.INK2, ls="-", lw=1.4):
        ax.add_patch(Rectangle((x0, y0), L, L, fill=False, ec=col, lw=lw, ls=ls))

    def atoms(x0, y0, L, pts, col=style.BLUE, r=0.075, skip=()):
        for i, (u, v) in enumerate(pts):
            if i not in skip:
                ax.add_patch(Circle((x0 + u * L, y0 + v * L), r, color=col, zorder=3))

    y0, L = 0.95, 1.3
    # 1 displacement
    x0 = 0.15; box(x0, y0, L); atoms(x0, y0, L, pos, skip=(2,))
    o = np.array([x0 + 0.5 * L, y0 + 0.62 * L]); n_ = o + (0.28, -0.12)
    ax.add_patch(Circle(o, 0.075, fc="white", ec=style.BLUE, lw=1.2, ls=(0, (2, 1.5)), zorder=3))
    ax.add_patch(Circle(n_, 0.075, color=style.ORANGE, zorder=4))
    ax.add_patch(FancyArrowPatch(o, n_, arrowstyle="-|>", mutation_scale=9, color=style.ORANGE, lw=1.3, shrinkA=5, shrinkB=5, zorder=5))
    # 2 volume change
    x0 = 2.0; L2 = 1.12; box(x0, y0, L2); atoms(x0, y0, L2, pos)
    box(x0, y0, L, col=style.ORANGE, ls=(0, (3, 2)))
    ax.add_patch(FancyArrowPatch((x0 + L2 - 0.02, y0 + L2 - 0.02), (x0 + L - 0.02, y0 + L - 0.02), arrowstyle="-|>",
                                 mutation_scale=9, color=style.ORANGE, lw=1.3, zorder=5))
    # 3 insertion and deletion
    x0 = 3.85; box(x0, y0, L); atoms(x0, y0, L, pos, skip=(4,))
    ins = np.array([x0 + 0.78 * L, y0 + 0.75 * L])
    ax.add_patch(Circle(ins, 0.075, color=style.TEAL, zorder=4))
    ax.text(ins[0] + 0.13, ins[1] + 0.12, "+", color=style.TEAL, fontsize=12, fontweight="semibold", ha="center", va="center")
    dl = np.array([x0 + 0.25 * L, y0 + 0.3 * L])
    ax.plot([dl[0] - 0.1, dl[0] + 0.1], [dl[1] - 0.1, dl[1] + 0.1], color=style.PINK, lw=2, zorder=5)
    ax.plot([dl[0] - 0.1, dl[0] + 0.1], [dl[1] + 0.1, dl[1] - 0.1], color=style.PINK, lw=2, zorder=5)
    # 4 Gibbs ensemble: two boxes exchanging a particle and volume
    xa, La, xb, Lb = 5.55, 0.9, 6.9, 0.62
    ya, yb = y0 + (L - La) / 2, y0 + (L - Lb) / 2
    box(xa, ya, La); box(xb, yb, Lb)
    liq = np.array([[0.2, 0.2], [0.5, 0.15], [0.8, 0.22], [0.25, 0.5], [0.55, 0.48], [0.8, 0.55], [0.3, 0.8], [0.62, 0.8]])
    atoms(xa, ya, La, liq, r=0.055)
    atoms(xb, yb, Lb, np.array([[0.3, 0.3], [0.72, 0.65]]), r=0.055)
    ax.add_patch(FancyArrowPatch((xa + La + 0.04, ya + 0.68 * La), (xb - 0.04, ya + 0.68 * La), arrowstyle="-|>",
                                 mutation_scale=11, color=style.ORANGE, lw=1.6, zorder=5))
    ax.add_patch(FancyArrowPatch((xb - 0.04, ya + 0.3 * La), (xa + La + 0.04, ya + 0.3 * La), arrowstyle="-|>",
                                 mutation_scale=11, color=style.VIOLET, lw=1.6, zorder=5))
    labels = [(0.15 + L / 2, "Displacement", "NVT\nmove one particle"),
              (2.0 + L / 2, "Volume change", "NPT\nrescale box and positions"),
              (3.85 + L / 2, "Insert or delete", "μVT\nchange N at fixed μ"),
              (6.73, "Gibbs ensemble", "two phases, no interface\nswap particles and volume")]
    for x, t1, t2 in labels:
        ax.text(x, 0.72, t1, ha="center", va="center", fontsize=9.5, fontweight="semibold", color=style.INK)
        ax.text(x, 0.48, t2, ha="center", va="top", fontsize=9, color=style.INK2, linespacing=1.3)
    ax.text(xa + La / 2, y0 + L + 0.08, "liquid", ha="center", va="bottom", fontsize=9, color=style.INK2)
    ax.text(xb + Lb / 2, y0 + L + 0.08, "vapour", ha="center", va="bottom", fontsize=9, color=style.INK2)
    style.save(fig, SLUG, "moves")


# ---------------------------------------------------------------- cover: a die resting in an energy well, histogram below
def cover():
    def draw(ax):
        x = np.linspace(0, 4, 300)
        U = 0.55 + 1.6 * ((x - 2) / 1.6) ** 2
        p = np.exp(-((x - 2) / 0.55) ** 2 / 2)
        edges = np.linspace(0.6, 3.4, 15); mids = (edges[:-1] + edges[1:]) / 2
        for m in mids:
            h = 1.15 * np.exp(-((m - 2) / 0.55) ** 2 / 2)
            ax.add_patch(Rectangle((m - 0.085, 0.25), 0.17, h, color=style.TEAL, alpha=0.85, lw=0))
        ax.plot(x, np.minimum(U, 3.2), color=style.BLUE, lw=6, solid_capstyle="round")
        # the die
        c = np.array([2.85, 1.55]); s = 0.62; ang = np.radians(-18)
        R = np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]])
        die = FancyBboxPatch((-s / 2, -s / 2), s, s, boxstyle="round,pad=0,rounding_size=0.11", fc="white",
                             ec=style.ORANGE, lw=4)
        import matplotlib.transforms as mt
        die.set_transform(mt.Affine2D().rotate(ang).translate(*c) + ax.transData)
        ax.add_patch(die)
        for u, v in [(-0.17, -0.17), (0.17, 0.17), (0, 0), (-0.17, 0.17), (0.17, -0.17)]:
            q = c + R @ np.array([u, v])
            ax.add_patch(Circle(q, 0.055, color=style.ORANGE, zorder=5))
        ax.add_patch(Circle((1.05, 2.2), 0.13, color=style.PINK))
        ax.add_patch(FancyArrowPatch((1.18, 2.28), (1.75, 2.62), arrowstyle="-|>", mutation_scale=16, color=style.PINK, lw=3,
                                     connectionstyle="arc3,rad=-0.3"))
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    P, w, f = three_state()
    print("  transition matrix\n", P.round(4), "\n  Boltzmann", w.round(4), "  chain after 20000 steps", f.round(4))
    print("  eigenvalues", np.sort(np.linalg.eigvals(P).real).round(4))
    r = rejections()
    print("  acceptance %.3f  <x2> correct %.3f  wrong %.3f  predicted wrong %.3f  a(0) %.3f  a(2) %.3f" % r)
    moves()
    cover()
