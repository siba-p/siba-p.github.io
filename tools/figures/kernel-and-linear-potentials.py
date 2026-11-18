"""Static figures for content/learn/kernel-and-linear-potentials.md.

Run from the repository root:  python3 tools/figures/kernel-and-linear-potentials.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import Circle, FancyBboxPatch, FancyArrowPatch
import style
plt = style.setup()
SLUG = "kernel-and-linear-potentials"


def _box(ax, x, y, w, h, color):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.02,rounding_size=0.1",
                                fc=style.TINT[color], ec=color, lw=1.2))


def _arrow(ax, p, q):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=11, color=style.INK3, lw=1.1))


def densitytrick():
    fig = plt.figure(figsize=(7.2, 6.6))
    gs = fig.add_gridspec(2, 2, height_ratios=[1.35, 1], width_ratios=[1, 0.32], hspace=0.12)
    ax = fig.add_subplot(gs[0, :]); ax.set_xlim(0, 8.2); ax.set_ylim(0.1, 4.9); ax.set_aspect("equal"); ax.axis("off")
    # neighbours
    c0 = np.array([0.95, 2.5])
    ax.add_patch(Circle(c0, 0.85, fc=style.TINT[style.TEAL], ec=style.TEAL, lw=1.1, ls=(0, (3, 2))))
    for a, r in zip([0.2, 1.3, 2.3, 3.4, 4.4, 5.4], [0.6, 0.55, 0.65, 0.5, 0.62, 0.58]):
        p = c0 + r * np.array([np.cos(a), np.sin(a)])
        ax.add_patch(Circle(p, 0.09, fc=style.BLUE, ec="white", lw=0.6, zorder=3))
    ax.add_patch(Circle(c0, 0.12, fc=style.ORANGE, ec="white", lw=0.8, zorder=3))
    ax.text(0.95, 4.75, "n neighbours", ha="center", va="top", fontsize=8.5, color=style.INK2, fontweight="semibold")
    # atomic base
    _box(ax, 3.0, 2.5, 1.1, 3.0, style.BLUE)
    for k in range(7):
        ax.add_patch(plt.Rectangle((2.62, 1.3 + 0.35 * k), 0.76, 0.24, fc="white", ec=style.BLUE, lw=0.8))
    ax.text(3.0, 4.75, "atomic base A", ha="center", va="top", fontsize=8.5, color=style.INK2, fontweight="semibold")
    ax.text(3.0, 0.55, "one sum over\nneighbours", ha="center", va="center", fontsize=8, color=style.INK2)
    # products
    _box(ax, 5.15, 2.5, 1.45, 3.0, style.VIOLET)
    for k, t in enumerate(["A·A", "A·A·A", "A·A·A·A"]):
        ax.text(5.15, 3.45 - 0.9 * k, t, ha="center", va="center", fontsize=9, color=style.INK)
    ax.text(5.15, 4.75, "products → B", ha="center", va="top", fontsize=8.5, color=style.INK2, fontweight="semibold")
    ax.text(5.15, 0.55, "body order\n3, 4 and 5", ha="center", va="center", fontsize=8, color=style.INK2)
    # energy
    _box(ax, 7.4, 2.5, 1.1, 0.8, style.ORANGE)
    ax.text(7.4, 2.5, "εᵢ = Σ c·B", ha="center", va="center", fontsize=8.5, color=style.INK)
    ax.text(7.4, 4.75, "linear fit", ha="center", va="top", fontsize=8.5, color=style.INK2, fontweight="semibold")
    _arrow(ax, (1.85, 2.5), (2.4, 2.5)); _arrow(ax, (3.6, 2.5), (4.38, 2.5)); _arrow(ax, (5.92, 2.5), (6.8, 2.5))

    ax = fig.add_subplot(gs[1, 0])
    n = np.linspace(5, 100, 200)
    for nu, c in [(2, style.TEAL), (3, style.VIOLET), (4, style.PINK)]:
        ax.loglog(n, n ** nu, color=c)
        ax.text(102, 100 ** nu, f"{nu} neighbours\n(body order {nu + 1})", fontsize=8, color=c, va="center")
    ax.loglog(n, n, color=style.BLUE)
    ax.text(102, 100, "density trick", fontsize=8, color=style.BLUE, va="center")
    ax.axvline(77, color=style.LINE, lw=1, zorder=0)
    ax.text(70, 12, "77 neighbours:\nCu, rc = 6 Å", fontsize=8, color=style.INK3, ha="right", va="top")
    ax.set_xlim(5, 100); ax.set_ylim(3, 3e8)
    ax.set_xlabel("neighbours n"); ax.set_ylabel("terms per basis function")
    style.save(fig, SLUG, "densitytrick")


def _maxvol(X, iters=100):
    """Greedy maximum-volume selection of K rows of X (n x K)."""
    n, K = X.shape
    idx = list(np.linspace(0, n - 1, K).astype(int))
    for _ in range(iters):
        C = X @ np.linalg.inv(X[idx])
        i, j = np.unravel_index(np.argmax(np.abs(C)), C.shape)
        if abs(C[i, j]) <= 1 + 1e-9:
            break
        idx[j] = i
    return idx


def _basis(q):
    q1, q2 = q[..., 0], q[..., 1]
    return np.stack([np.ones_like(q1), q1, q2, q1 ** 2, q1 * q2, q2 ** 2], -1)


def dopt():
    rng = np.random.default_rng(3)
    t = rng.uniform(-1.1, 1.1, 300)
    train = np.c_[t, 0.55 * t ** 2 - 0.3] + rng.normal(0, 0.09, (300, 2))
    X = _basis(train)
    act = _maxvol(X)
    Ainv = np.linalg.inv(X[act])
    g1, g2 = np.meshgrid(np.linspace(-2, 2, 260), np.linspace(-1.5, 1.6, 220))
    G = np.abs(_basis(np.stack([g1, g2], -1)) @ Ainv).max(-1)

    fig, ax = plt.subplots(figsize=(7.2, 3.9))
    ax.contourf(g1, g2, G, levels=[0, 1, 2, 10, 1e9], colors=[style.TINT[style.TEAL], "#f0f7f6", style.TINT[style.ORANGE], style.TINT[style.PINK]])
    cs = ax.contour(g1, g2, G, levels=[1, 2, 10], colors=[style.TEAL, style.GOLD, style.PINK], linewidths=1.2)
    ax.clabel(cs, fmt={1: "γ = 1", 2: "γ = 2", 10: "γ = 10"}, fontsize=8)
    ax.scatter(train[:, 0], train[:, 1], s=6, color=style.INK3, lw=0, rasterized=True)
    ax.scatter(train[act, 0], train[act, 1], s=60, color=style.ORANGE, ec="white", lw=1, zorder=4)
    # a trajectory that wanders out of the training region
    s = np.linspace(0, 1, 60)
    path = np.c_[0.2 + 1.55 * s, -0.25 + 0.15 * np.sin(5 * s) - 1.0 * s ** 2]
    gp = np.abs(_basis(path) @ Ainv).max(-1)
    ax.plot(path[:, 0], path[:, 1], color=style.INK2, lw=1, zorder=3)
    first = np.argmax(gp > 2)
    ax.scatter(*path[first], s=70, marker="X", color=style.PINK, zorder=5, ec="white", lw=0.8)
    ax.annotate(f"first configuration with γ > 2:\nsent to DFT", xy=path[first], xytext=(-1.7, -1.2),
                fontsize=8, color=style.INK2, arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    ax.text(-1.95, 1.45, "grey: 300 training environments\norange: the 6 that span the largest volume",
            fontsize=8, color=style.INK2, va="top")
    ax.set_xlim(-2, 2); ax.set_ylim(-1.5, 1.6); ax.set_aspect("equal")
    ax.set_xlabel("descriptor component q₁"); ax.set_ylabel("descriptor component q₂")
    style.save(fig, SLUG, "dopt")
    return gp, first


def _power(theta, sigma=0.1, M=24):
    m = np.arange(M + 1)
    c = (np.exp(-0.5 * (m * sigma) ** 2)[:, None] * np.exp(-1j * np.outer(m, theta))).sum(1)
    p = np.abs(c) ** 2
    return p / np.linalg.norm(p)


def zeta():
    hexa = np.arange(6) * np.pi / 3
    p0 = _power(hexa)
    d = np.linspace(0, 30, 121)
    k = np.array([_power(np.r_[hexa[0] + np.radians(x), hexa[1:]]) @ p0 for x in d])
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.1), gridspec_kw=dict(width_ratios=[1, 2.2], wspace=0.15))
    ax = axs[0]; ax.set_aspect("equal"); ax.axis("off")
    for a in hexa:
        ax.add_patch(Circle((np.cos(a), np.sin(a)), 0.16, fc=style.BLUE if a > 0 else style.LINE, ec="white", lw=0.8))
        ax.plot([0, np.cos(a)], [0, np.sin(a)], color=style.LINE, lw=0.8, zorder=0)
    a = np.radians(20)
    ax.add_patch(Circle((np.cos(a), np.sin(a)), 0.16, fc=style.PINK, ec="white", lw=0.8))
    ax.plot([0, np.cos(a)], [0, np.sin(a)], color=style.PINK, lw=1.2, zorder=0)
    ax.text(0.1, -1.38, "pink: moved by δ = 20°", fontsize=8, color=style.PINK, ha="center", va="top")
    ax.add_patch(Circle((0, 0), 0.14, fc=style.ORANGE, ec="white", lw=0.8))
    ax.set_xlim(-1.4, 1.6); ax.set_ylim(-1.7, 1.4)
    ax.set_title("Move one neighbour by δ", fontsize=10)
    ax = axs[1]
    for z, c in [(1, style.GOLD), (2, style.TEAL), (4, style.BLUE), (16, style.VIOLET)]:
        ax.plot(d, k ** z, color=c)
        ax.text(30.6, k[-1] ** z, f"ζ = {z}", color=c, fontsize=8, va="center")
    ax.set_xlim(0, 30); ax.set_ylim(0.3, 1.02)
    ax.set_xlabel("rotation of one neighbour δ (degrees)"); ax.set_ylabel("kernel value")
    ax.set_title("Similarity to the perfect hexagon", fontsize=10)
    style.save(fig, SLUG, "zeta")
    return d, k


def cover():
    def draw(ax):
        x = np.linspace(0, 4, 400)
        centres, heights, cols = [0.9, 1.6, 2.3, 3.0], [0.9, 1.3, 0.7, 1.1], [style.TEAL, style.BLUE, style.VIOLET, style.TEAL]
        total = 0 * x
        for c, h, col in zip(centres, heights, cols):
            y = h * np.exp(-((x - c) / 0.33) ** 2)
            total += y
            ax.fill_between(x, 0.45, 0.45 + y, color=col, alpha=0.45, lw=0)
        ax.plot(x, 0.45 + total, color=style.ORANGE, lw=6, solid_capstyle="round")
    style.cover(SLUG, draw, bg=style.TINT[style.VIOLET])


if __name__ == "__main__":
    densitytrick()
    gp, first = dopt()
    d, k = zeta()
    print(f"dopt: first gamma>2 at path index {first}, gamma = {gp[first]:.2f}; max gamma on path {gp.max():.1f}")
    for x in (5, 10, 20, 30):
        i = np.argmin(abs(d - x)); print(f"zeta: delta={x} deg  k={k[i]:.4f}  k^4={k[i]**4:.4f}  k^16={k[i]**16:.4f}")
    cover()
