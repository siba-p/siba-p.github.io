"""Figures for content/learn/message-passing-potentials.md.  Run: python3 tools/figures/message-passing-potentials.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import Circle, FancyArrowPatch, Rectangle
plt = style.setup()
SLUG = "message-passing-potentials"


def arrow(ax, p, q, col=style.INK3, lw=1.4, head=10, rad=0.0, z=2):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=head, color=col, lw=lw,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=0, shrinkB=0, zorder=z))


def equivariance():
    """Rotate-then-predict equals predict-then-rotate, for forces from a simple bonded model of a bent triatomic."""
    # a stretched, bent triatomic; forces from harmonic bonds (k = 1, r0 = 1) and a harmonic angle (theta0 = 104.5 deg)
    X = np.array([[0.0, 0.0], [1.25, 0.0], [-0.2, 1.1]])
    def forces(X, h=1e-6):
        def E(X):
            d1, d2 = X[1] - X[0], X[2] - X[0]
            r1, r2 = np.linalg.norm(d1), np.linalg.norm(d2)
            th = np.arccos(d1 @ d2 / (r1 * r2))
            return 0.5 * (r1 - 1) ** 2 + 0.5 * (r2 - 1) ** 2 + 0.5 * (th - np.radians(104.5)) ** 2
        F = np.zeros_like(X)
        for k, a in np.ndindex(X.shape):
            dX = np.zeros_like(X); dX[k, a] = h
            F[k, a] = -(E(X + dX) - E(X - dX)) / (2 * h)
        return F
    ang = np.radians(60)
    R = np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]])
    F = forces(X)
    XR = X @ R.T
    FR_model = forces(XR)
    print("equivariance check, max |F(Rx) - R F(x)| =", np.abs(FR_model - F @ R.T).max())
    fig, ax = plt.subplots(figsize=(7.2, 4.6))
    ax.set_xlim(0, 12); ax.set_ylim(0, 7.6); ax.set_aspect("equal"); ax.axis("off")
    scenes = {(0, 1): (X, None), (1, 1): (X, F), (0, 0): (XR, None), (1, 0): (XR, FR_model)}
    centres = {(0, 1): (2.2, 5.6), (1, 1): (9.0, 5.6), (0, 0): (2.2, 1.6), (1, 0): (9.0, 1.6)}
    for key, (P, Fk) in scenes.items():
        c = np.array(centres[key]); P = (P - P.mean(0)) * 1.0 + c
        ax.add_patch(Rectangle(c - 1.5, 3.0, 3.0, fc=style.BG2, ec=style.LINE, lw=1.0, zorder=0))
        for b in (1, 2):
            ax.plot(*zip(P[0], P[b]), color=style.INK3, lw=2.5, zorder=1)
        for k, p in enumerate(P):
            ax.add_patch(Circle(p, 0.26 if k == 0 else 0.19, fc=style.PINK if k == 0 else style.BLUE, ec="white", lw=1.2, zorder=3))
        if Fk is not None:
            for p, f in zip(P, Fk):
                arrow(ax, p, p + 3.2 * f, col=style.ORANGE, lw=2.0, head=11, z=4)
    arrow(ax, (4.0, 5.6), (7.2, 5.6), col=style.INK2)
    ax.text(5.6, 5.85, "model", ha="center", va="bottom", fontsize=9.5, color=style.INK2)
    arrow(ax, (4.0, 1.6), (7.2, 1.6), col=style.INK2)
    ax.text(5.6, 1.85, "model", ha="center", va="bottom", fontsize=9.5, color=style.INK2)
    ax.annotate("", xy=(2.2, 3.2), xytext=(2.2, 4.0), arrowprops=dict(arrowstyle="-|>", color=style.INK2, lw=1.4))
    ax.annotate("", xy=(9.0, 3.2), xytext=(9.0, 4.0), arrowprops=dict(arrowstyle="-|>", color=style.INK2, lw=1.4))
    ax.text(2.45, 3.6, "rotate by 60°", ha="left", va="center", fontsize=9.5, color=style.INK2)
    ax.text(9.25, 3.6, "rotate the forces by 60°", ha="left", va="center", fontsize=9.5, color=style.INK2)
    ax.text(2.2, 7.45, "input structure", ha="center", va="top", fontsize=9.5, fontweight="semibold", color=style.INK)
    ax.text(9.0, 7.45, "predicted forces", ha="center", va="top", fontsize=9.5, fontweight="semibold", color=style.ORANGE)
    style.save(fig, SLUG, "equivariance")


def outer_product():
    """The 3 x 3 outer product of two vectors splits into l = 0 (1 number), l = 1 (3) and l = 2 (5)."""
    a, b = np.array([1.0, 2.0, 0.0]), np.array([0.0, 1.0, 1.0])
    M = np.outer(a, b)
    iso = (a @ b) / 3 * np.eye(3)
    anti = (M - M.T) / 2
    sym = (M + M.T) / 2 - iso
    assert np.allclose(iso + anti + sym, M)
    print("a.b =", a @ b, " a x b =", np.cross(a, b), " trace of sym =", np.trace(sym))
    fig, ax = plt.subplots(figsize=(7.2, 2.9))
    ax.set_xlim(0, 17.6); ax.set_ylim(-1.9, 4.1); ax.set_aspect("equal"); ax.axis("off")
    mats = [(M, r"$a\,b^{\mathsf{T}}$", "9 numbers", style.INK2), (iso, "l = 0", "1 number: a·b = 2", style.BLUE),
            (anti, "l = 1", "3 numbers: ½ a×b", style.ORANGE), (sym, "l = 2", "5 numbers", style.VIOLET)]
    x0 = 0.2
    for k, (A, title, sub, col) in enumerate(mats):
        vmax = 2.0
        for i in range(3):
            for j in range(3):
                v = A[i, j]
                fc = style.TINT[col] if (col != style.INK2 and abs(v) > 1e-9) else ("white" if abs(v) < 1e-9 else style.BG2)
                ax.add_patch(Rectangle((x0 + j, 2 - i), 1, 1, fc=fc, ec=style.LINE, lw=1.0))
                txt = "0" if abs(v) < 1e-9 else (f"{v:.2f}".rstrip("0").rstrip(".") if abs(v - round(v)) > 1e-9 else f"{v:.0f}")
                if txt.startswith("-"): txt = "−" + txt[1:]
                ax.text(x0 + j + 0.5, 2 - i + 0.5, txt, ha="center", va="center", fontsize=8.5,
                        color=style.INK if abs(v) > 1e-9 else style.INK3)
        ax.text(x0 + 1.5, 3.35, title, ha="center", va="bottom", fontsize=10, fontweight="semibold", color=col if col != style.INK2 else style.INK)
        ax.text(x0 + 1.5, -0.35, sub, ha="center", va="top", fontsize=8.5, color=col if col != style.INK2 else style.INK2)
        if k < 3:
            ax.text(x0 + 3.65, 1.5, "=" if k == 0 else "+", ha="center", va="center", fontsize=16, color=style.INK2)
        x0 += 4.4
    ax.text(8.8, -1.35, "a = (1, 2, 0),  b = (0, 1, 1):  the 3 × 3 = 9 products of two vectors are 1 + 3 + 5 numbers of types l = 0, 1, 2",
            ha="center", va="center", fontsize=8.5, color=style.INK2)
    style.save(fig, SLUG, "outer-product")


def ghosts():
    """Atoms in the receptive field, and ghost atoms per owned atom in a spatially decomposed simulation."""
    T = np.arange(1, 7)
    rc, rho = 5.0, 0.1                                     # cutoff (A), atoms per A^3 (liquid water)
    n_field = 4 / 3 * np.pi * (T * rc) ** 3 * rho
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw={"wspace": 0.38})
    ax1.semilogy(T, n_field, color=style.BLUE, marker="o", ms=5)
    for t in (1, 2, 5):
        ax1.text(t + 0.15, n_field[t - 1] * 0.62, f"{n_field[t - 1]:,.0f}", fontsize=8.5, color=style.INK2, ha="left", va="top")
    ax1.set_xlabel("message-passing layers T")
    ax1.set_ylabel("atoms within T × 5 Å")
    ax1.set_title("Receptive field in water", fontsize=10)
    ax1.set_xticks(T); ax1.set_ylim(20, 3e5)
    L = 40.0
    for Lb, col in ((20.0, style.ORANGE), (40.0, style.TEAL), (80.0, style.VIOLET)):
        ratio = ((Lb + 2 * T * rc) ** 3 - Lb ** 3) / Lb ** 3
        ax2.semilogy(T, ratio, color=col, marker="o", ms=4)
        ax2.text(6.15, ratio[-1], f"{Lb:.0f} Å", color=col, fontsize=9, va="center", ha="left")
        if Lb == 40.0:
            print("ghost/owned for 40 A domain:", np.round(ratio, 2))
    ax2.axhline(1, color=style.LINE, lw=1)
    ax2.text(6.9, 0.88, "as many ghosts\nas owned atoms", fontsize=8, color=style.INK3, va="top", ha="right")
    ax2.set_xlabel("message-passing layers T")
    ax2.set_ylabel("ghost atoms per owned atom")
    ax2.set_title("Cost of a domain of side L", fontsize=10)
    ax2.set_xticks(T); ax2.set_xlim(0.7, 7.1)
    print("receptive field atoms:", np.round(n_field))
    style.save(fig, SLUG, "ghosts")


def cover():
    def draw(ax):
        # a triangular lattice of atoms coloured by graph distance (hops) from the centre
        cols = [style.PINK, style.ORANGE, style.GOLD, style.TEAL, style.BLUE]
        c = np.array([2.0, 1.5]); s = 0.42
        pts = []
        for i in range(-7, 8):
            for j in range(-6, 7):
                p = c + s * np.array([i + 0.5 * j, j * np.sqrt(3) / 2])
                if -0.3 < p[0] < 4.3 and -0.3 < p[1] < 3.3:
                    hop = int(max(abs(i), abs(j), abs(i + j)))
                    pts.append((p, hop))
        for p, hop in pts:
            col = cols[min(hop, 4)]
            ax.add_patch(Circle(p, 0.15 if hop else 0.2, fc=col, ec="white", lw=1.2, zorder=3, alpha=1.0 if hop < 4 else 0.35))
        for p, hop in pts:
            if hop == 1:
                ax.add_patch(FancyArrowPatch(p, c, arrowstyle="-|>", mutation_scale=12, color=style.INK2, lw=2.0,
                                             shrinkA=9, shrinkB=11, zorder=4))
    style.cover(SLUG, draw, bg=style.TINT[style.VIOLET])


if __name__ == "__main__":
    equivariance(); outer_product(); ghosts(); cover()
