"""Figures for content/learn/vectors-and-matrices.md.

composition : rotating then shearing an asymmetric shape is not the same as shearing then rotating
conditioning: the row picture of a well- and an ill-conditioned 2 x 2 system with the same uncertainty in b
co2-modes   : normal modes of a linear O-C-O spring model from the eigenvectors of its mass-weighted Hessian
cover       : the plane carried along by a matrix
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import Polygon, FancyArrowPatch, Circle
plt = style.setup()
SLUG = "vectors-and-matrices"

# an asymmetric 'F' so that rotations and reflections are visible
F_SHAPE = np.array([[0.0, 0.0], [0.35, 0.0], [0.35, 0.65], [0.8, 0.65], [0.8, 0.95], [0.35, 0.95],
                    [0.35, 1.2], [1.0, 1.2], [1.0, 1.5], [0.0, 1.5]])


def arrow(ax, p, q, color, lw=2.2, z=5, ms=11):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=ms, color=color, lw=lw,
                                 shrinkA=0, shrinkB=0, zorder=z))


def grid(ax, M=np.eye(2), lim=4, color=style.LINE, lw=0.8, z=0):
    for k in range(-lim, lim + 1):
        for a, b in (((k, -lim), (k, lim)), ((-lim, k), (lim, k))):
            p, q = M @ np.array(a, float), M @ np.array(b, float)
            ax.plot([p[0], q[0]], [p[1], q[1]], color=color, lw=lw, zorder=z, solid_capstyle="butt")


def composition():
    R = np.array([[0, -1], [1, 0]])          # rotation by 90 degrees anticlockwise
    S = np.array([[1, 1], [0, 1]])           # horizontal shear
    shape = 0.75 * F_SHAPE
    panels = [("Original", np.eye(2), None, "î = (1, 0)", "ĵ = (0, 1)"),
              ("Rotate 90°, then shear: SR", S @ R, R, "î → (1, 1)", "ĵ → (−1, 0)"),
              ("Shear, then rotate 90°: RS", R @ S, S, "î → (0, 1)", "ĵ → (−1, 1)")]
    fig, axes = plt.subplots(1, 3, figsize=(7.2, 2.9))
    for ax, (title, M, first, li, lj) in zip(axes, panels):
        ax.set_xlim(-1.45, 2.0); ax.set_ylim(-0.25, 2.05); ax.set_aspect("equal")
        ax.set_xticks([]); ax.set_yticks([])
        for s in ax.spines.values(): s.set_visible(False)
        grid(ax)
        ax.axhline(0, color=style.INK3, lw=0.8, zorder=1); ax.axvline(0, color=style.INK3, lw=0.8, zorder=1)
        ax.add_patch(Polygon((M @ shape.T).T, closed=True, fc=style.TINT[style.GOLD], ec=style.GOLD, lw=1.6, zorder=3))
        if first is not None:  # the shape after the first step only, as a dashed ghost
            ax.add_patch(Polygon((first @ shape.T).T, closed=True, fc="none", ec=style.INK3, lw=1.0,
                                 ls=(0, (3, 2)), zorder=4))
        arrow(ax, (0, 0), tuple(M[:, 0]), style.TEAL, z=6)
        arrow(ax, (0, 0), tuple(M[:, 1]), style.PINK, z=6)
        ax.set_title(title, fontsize=9.5, loc="center", pad=4)
        ax.text(0.5, -0.03, li, transform=ax.transAxes, ha="center", va="top", fontsize=9, color=style.TEAL)
        ax.text(0.5, -0.13, lj, transform=ax.transAxes, ha="center", va="top", fontsize=9, color=style.PINK)
    fig.subplots_adjust(wspace=0.06, bottom=0.18)
    style.save(fig, SLUG, "composition")


def conditioning():
    systems = [("Well conditioned", np.array([[1.0, 1.0], [1.0, -1.0]]), np.array([2.0, 0.0]), (1.42, 0.95)),
               ("Ill conditioned", np.array([[1.0, 1.0], [1.0, 1.2]]), np.array([2.0, 2.2]), (1.2, 1.55))]
    db = 0.1                                  # the same uncertainty in each component of b
    fig, axes = plt.subplots(1, 2, figsize=(7.2, 3.6))
    xs = np.linspace(-1, 3, 2)
    for ax, (title, A, b, txt) in zip(axes, systems):
        x0 = np.linalg.solve(A, b)
        for row, bi, col in ((A[0], b[0], style.BLUE), (A[1], b[1], style.ORANGE)):
            # the band of points with row . x in [bi - db, bi + db]; rows here always have a non-zero y entry
            lo = (bi - db - row[0] * xs) / row[1]; hi = (bi + db - row[0] * xs) / row[1]
            ax.fill_between(xs, lo, hi, color=col, alpha=0.2, lw=0, zorder=1)
            ax.plot(xs, (bi - row[0] * xs) / row[1], color=col, lw=1.4, zorder=2)
        corners = [np.linalg.solve(A, b + np.array([s1, s2]) * db) for s1, s2 in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        ax.add_patch(Polygon(corners, closed=True, fc=style.GOLD, ec=style.GOLD, alpha=0.9, lw=1.0, zorder=3))
        ax.plot(*x0, "o", ms=4, color=style.INK, zorder=4)
        half = np.ptp(np.array(corners), axis=0) / 2
        ax.set_xlim(-0.3, 2.3); ax.set_ylim(-0.3, 2.3); ax.set_aspect("equal")
        ax.set_xlabel("$x$"); ax.set_ylabel("$y$")
        ax.set_title(title, fontsize=10)
        ax.text(0.5, 0.98, f"det = {np.linalg.det(A):.1f},  condition number = {np.linalg.cond(A):.0f}",
                transform=ax.transAxes, ha="center", va="top", fontsize=8.5, color=style.INK2)
        ax.annotate(f"gold: every solution\nallowed by b ± {db}\n$x$ = {x0[0]:.0f} ± {half[0]:.2f}", xy=x0, xytext=txt,
                    fontsize=8.5, color=style.INK2, arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=3))
    axes[0].text(1.75, 0.0, "$x+y=2$", color=style.BLUE, fontsize=9, ha="left", va="bottom")
    axes[0].text(1.55, 1.92, "$x-y=0$", color=style.ORANGE, fontsize=9, ha="right")
    axes[1].text(1.62, -0.12, "$x+y=2$", color=style.BLUE, fontsize=9, va="center")
    axes[1].text(0.95, 0.35, "$x+1.2y=2.2$", color=style.ORANGE, fontsize=9, ha="center", va="top")
    fig.subplots_adjust(wspace=0.32)
    style.save(fig, SLUG, "conditioning")


def co2_modes():
    mO, mC = 15.9949, 12.0000                 # atomic masses in u
    masses = np.array([mO, mC, mO])
    K = np.array([[1, -1, 0], [-1, 2, -1], [0, -1, 1.0]])   # Hessian of two equal C=O springs, in units of k
    Minv = np.diag(1 / np.sqrt(masses))
    lam, U = np.linalg.eigh(Minv @ K @ Minv)               # mass-weighted Hessian
    nu1_obs = 1340.0                                         # cm^-1, symmetric stretch, used to fix k
    wn = nu1_obs * np.sqrt(np.clip(lam, 0, None) / lam[1])   # wavenumber is proportional to sqrt(eigenvalue)
    names = ["Translation", "Symmetric stretch", "Asymmetric stretch"]
    observed = ["no restoring force", "about 1340 cm⁻¹ (used to fix k)", "2349 cm⁻¹ observed"]
    xs = np.array([-1.16, 0.0, 1.16])                        # C=O bond length 1.16 angstrom
    cols = [style.PINK, style.INK2, style.PINK]
    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    ax.set_xlim(-2.0, 6.4); ax.set_ylim(-0.6, 3.15); ax.axis("off")
    for row, i in enumerate([0, 1, 2]):
        y = 2.5 - 1.15 * row
        d = U[:, i] / np.sqrt(masses)                        # Cartesian displacement pattern
        d = d / np.max(np.abs(d)) * 0.62
        if d[np.argmax(np.abs(d))] < 0: d = -d
        ax.plot([xs[0], xs[2]], [y, y], color=style.INK3, lw=3, zorder=1, solid_capstyle="butt")
        for x, m, c, di in zip(xs, masses, cols, d):
            ax.add_patch(Circle((x, y), 0.17 if m > 13 else 0.14, fc=c, ec="white", lw=1.2, zorder=3))
            if abs(di) > 1e-3:
                arrow(ax, (x, y + 0.28), (x + di, y + 0.28), style.BLUE, lw=2.0, ms=10)
        ax.text(2.0, y + 0.13, names[row], fontsize=10, fontweight="semibold", va="center")
        ax.text(2.0, y - 0.22, f"eigenvalue {lam[i]:.3f} k/u", fontsize=8.5, color=style.INK2, va="center")
        label = f"model {wn[i]:.0f} cm⁻¹" if i > 0 else "model 0 cm⁻¹"
        ax.text(4.5, y + 0.13, label, fontsize=9, color=style.BLUE, va="center")
        ax.text(4.5, y - 0.22, observed[row], fontsize=8.5, color=style.ORANGE if i == 2 else style.INK2, va="center")
    ax.text(xs[0], -0.42, "O", ha="center", fontsize=9, color=style.PINK)
    ax.text(xs[1], -0.42, "C", ha="center", fontsize=9, color=style.INK2)
    ax.text(xs[2], -0.42, "O", ha="center", fontsize=9, color=style.PINK)
    ax.text(-2.0, 3.1, "Arrows: displacement of each atom in the mode (eigenvector divided by √mass)",
            fontsize=8.5, color=style.INK2, va="top")
    style.save(fig, SLUG, "co2-modes")
    return lam, wn


def cover():
    def draw(ax):
        M = np.array([[1.05, 0.45], [0.25, 0.9]])
        o = np.array([1.15, 0.75])
        # the original grid, faint
        for k in np.arange(-3, 6):
            ax.plot([o[0] + k * 0.75, o[0] + k * 0.75], [-1, 4], color="white", lw=2.2, zorder=0)
            ax.plot([-1, 5], [o[1] + k * 0.75, o[1] + k * 0.75], color="white", lw=2.2, zorder=0)
        # the transformed grid
        for k in range(-6, 7):
            for a, b in (((k, -6), (k, 6)), ((-6, k), (6, k))):
                p = o + 0.75 * M @ np.array(a, float); q = o + 0.75 * M @ np.array(b, float)
                ax.plot([p[0], q[0]], [p[1], q[1]], color=style.BLUE, lw=1.6, alpha=0.45, zorder=1)
        sq = np.array([[0, 0], [1, 0], [1, 1], [0, 1]], float) * 0.75 * 2
        ax.add_patch(Polygon(o + (M @ sq.T).T, closed=True, fc=style.GOLD, ec="none", alpha=0.9, zorder=2))
        e1 = o + 1.5 * M[:, 0]; e2 = o + 1.5 * M[:, 1]
        ax.add_patch(FancyArrowPatch(tuple(o), tuple(e1), arrowstyle="-|>", mutation_scale=34, color=style.TEAL, lw=7, shrinkA=0, shrinkB=0, zorder=4))
        ax.add_patch(FancyArrowPatch(tuple(o), tuple(e2), arrowstyle="-|>", mutation_scale=34, color=style.PINK, lw=7, shrinkA=0, shrinkB=0, zorder=4))
        ax.add_patch(Circle(tuple(o), 0.09, color=style.INK, zorder=5))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    composition(); conditioning(); co2_modes(); cover()
