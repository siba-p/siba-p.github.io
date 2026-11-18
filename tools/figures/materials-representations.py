"""Figures for content/learn/materials-representations.md.  Run: python3 tools/figures/materials-representations.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import Circle, Polygon, FancyArrowPatch
plt = style.setup()
SLUG = "materials-representations"


# ---------------------------------------------------------------------------------------------------------------
# 1. One crystal, many unit cells: a two-dimensional rock-salt (checkerboard) lattice
# ---------------------------------------------------------------------------------------------------------------
def cells():
    s = 1.0                                            # nearest-neighbour spacing
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    ax.set_xlim(-0.6, 12.6); ax.set_ylim(-0.6, 5.6); ax.set_aspect("equal"); ax.axis("off")
    for i in range(0, 9):
        for j in range(0, 6):
            col = style.BLUE if (i + j) % 2 == 0 else style.ORANGE
            r = 0.17 if col == style.BLUE else 0.24
            ax.add_patch(Circle((i * s, j * s), r, color=col, zorder=3, ec="white", lw=1.0))

    def cell(origin, a1, a2, col, ls="-"):
        o = np.array(origin, float); a1 = np.array(a1, float); a2 = np.array(a2, float)
        P = np.array([o, o + a1, o + a1 + a2, o + a2])
        ax.add_patch(Polygon(P, closed=True, fc=style.TINT[col], ec=col, lw=2.2, ls=ls, zorder=1, alpha=0.9))
        return P

    # primitive cell: a 45-degree square spanned by (1, 1) and (-1, 1); area 2 s^2 -> one blue + one orange atom
    cell((1, 0), (1, 1), (-1, 1), style.TEAL)
    # another primitive cell: spanned by (1, 1) and (2, 0); same area 2 s^2
    cell((3, 3), (1, 1), (2, 0), style.VIOLET)
    # conventional square cell 2s x 2s doubled to a 4s x 2s supercell: area 8 s^2 -> 8 atoms
    cell((4, 0), (4, 0), (0, 2), style.PINK, ls=(0, (5, 3)))
    lab = dict(fontsize=9, va="center")
    for y, col, ls, txt in ((4.6, style.TEAL, "-", "primitive cell: 2 atoms"),
                            (3.8, style.VIOLET, "-", "another primitive cell:\n2 atoms, same area"),
                            (2.9, style.PINK, (0, (5, 3)), "supercell: 8 atoms")):
        ax.add_patch(Polygon([(9.0, y - 0.22), (9.5, y - 0.22), (9.5, y + 0.22), (9.0, y + 0.22)], closed=True,
                             fc=style.TINT[col], ec=col, lw=2.0, ls=ls))
        ax.text(9.75, y, txt, color=col, **lab)
    ax.add_patch(Circle((9.25, 1.6), 0.17, color=style.BLUE)); ax.text(9.75, 1.6, "cation", color=style.INK2, **lab)
    ax.add_patch(Circle((9.25, 0.9), 0.24, color=style.ORANGE)); ax.text(9.75, 0.9, "anion", color=style.INK2, **lab)
    style.save(fig, SLUG, "cells")


# ---------------------------------------------------------------------------------------------------------------
# 2. Neighbour shells of rock-salt NaCl: edges per atom against the cut-off radius
# ---------------------------------------------------------------------------------------------------------------
def nacl_shells(a=5.64, rmax=8.6):
    n = int(rmax / (a / 2)) + 2
    g = np.arange(-n, n + 1)
    I, J, K = np.meshgrid(g, g, g, indexing="ij")
    pts = np.stack([I.ravel(), J.ravel(), K.ravel()], 1)          # simple-cubic grid of spacing a/2
    species = pts.sum(1) % 2                                     # 0 = Na, 1 = Cl (checkerboard)
    d = np.linalg.norm(pts, axis=1) * a / 2
    keep = (d > 0) & (d <= rmax)
    d, species = d[keep], species[keep]
    shells = []
    for r in np.unique(d.round(4)):
        m = np.isclose(d, r, atol=1e-3)
        shells.append((r, int(m.sum()), "Cl" if species[m][0] == 1 else "Na"))
    return shells


def shells_fig():
    a = 5.64
    shells = nacl_shells(a)
    print("NaCl shells around Na (r, count, species):", [(round(r, 2), c, s) for r, c, s in shells])
    r = np.array([s[0] for s in shells]); c = np.cumsum([s[1] for s in shells])
    rho = 8 / a ** 3
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    rr = np.linspace(0, 8.5, 300)
    ax.plot(rr, 4 / 3 * np.pi * rr ** 3 * rho, color=style.INK3, lw=1.3, ls=(0, (4, 3)))
    xs = np.concatenate([[0], np.repeat(r, 2), [8.5]])
    ys = np.concatenate([[0, 0], np.repeat(c, 2)])
    ax.plot(xs, ys, color=style.BLUE, lw=2)
    for k in range(6):
        ri, ci, sp = shells[k]
        ax.text(ri + 0.05, c[k] + 2.5, f"+{ci} {sp}", fontsize=8.5,
                color=style.PINK if sp == "Cl" else style.TEAL, ha="left", va="bottom")
    for rc in (3.0, 6.0, 8.0):
        k = int((r <= rc).sum())
        ax.axvline(rc, color=style.LINE, lw=1.0, zorder=0)
        ax.text(rc - 0.06, 126, f"cut-off {rc:g} Å:\n{c[k - 1]} edges", fontsize=8.5, color=style.INK2, ha="right",
                va="top")
        print(f"cut-off {rc} A: {c[k - 1]} neighbours")
    ax.text(8.45, 30, "dashed: continuum\n(4/3)π r³ ρ", fontsize=8.5, color=style.INK2, ha="right", va="top")
    ax.set_xlim(0, 8.5); ax.set_ylim(0, 130)
    ax.set_xlabel("cut-off radius r_c (Å)"); ax.set_ylabel("neighbours of one Na ion")
    style.save(fig, SLUG, "nacl-shells")
    return shells


# ---------------------------------------------------------------------------------------------------------------
# 3. The convex hull of a hypothetical A-B system (the worked example in the text)
# ---------------------------------------------------------------------------------------------------------------
PHASES = [("A", 0.0, 0.0), ("A₃B", 0.25, -0.30), ("AB", 0.5, -0.50), ("A₂B₃", 0.6, -0.38), ("AB₂", 2 / 3, -0.35),
          ("AB₃", 0.75, -0.10), ("B", 1.0, 0.0)]


def lower_hull(x, e):
    idx = np.argsort(x); hull = []
    for i in idx:                                    # monotone-chain lower hull
        while len(hull) >= 2:
            (x1, e1), (x2, e2) = (x[hull[-2]], e[hull[-2]]), (x[hull[-1]], e[hull[-1]])
            if (x2 - x1) * (e[i] - e1) - (e2 - e1) * (x[i] - x1) <= 0:
                hull.pop()
            else:
                break
        hull.append(i)
    return hull


def hull_fig():
    names = [p[0] for p in PHASES]; x = np.array([p[1] for p in PHASES]); e = np.array([p[2] for p in PHASES])
    h = lower_hull(x, e)
    ehull = e - np.interp(x, x[h], e[h])
    for nm, xi, ei, eh in zip(names, x, e, ehull):
        print(f"{nm:5s} x_B={xi:.3f}  E_f={ei:+.3f}  E_hull={eh:.4f} eV/atom")
    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    ax.axhline(0, color=style.LINE, lw=1, zorder=0)
    ax.plot(x[h], e[h], color=style.BLUE, lw=2, zorder=1)
    for nm, xi, ei, eh in zip(names, x, e, ehull):
        on = eh < 1e-9
        ax.plot(xi, ei, "o", ms=8 if on else 7, color=style.BLUE if on else style.ORANGE, mec="white", mew=1.2,
                zorder=3)
        if nm in ("A", "B"):
            continue
        if on:
            ax.text(xi, ei - 0.035, nm, ha="center", va="top", fontsize=9, color=style.BLUE)
        else:
            base = ei - eh
            ax.annotate("", (xi, base), (xi, ei), arrowprops=dict(arrowstyle="-|>", color=style.ORANGE, lw=1.3,
                                                                  shrinkA=5, shrinkB=1))
            ax.text(xi - 0.02, ei + 0.03, f"{nm}\n{1000 * eh:.0f} meV/atom above", ha="right", va="bottom",
                    fontsize=8.5, color=style.ORANGE)
    ax.text(0.0, 0.03, "A", ha="center", va="bottom", fontsize=9, color=style.BLUE)
    ax.text(1.0, 0.03, "B", ha="center", va="bottom", fontsize=9, color=style.BLUE)
    ax.text(0.86, -0.27, "lower convex hull", color=style.BLUE, fontsize=8.5, ha="left")
    ax.set_xlim(-0.04, 1.04); ax.set_ylim(-0.6, 0.15)
    ax.set_xlabel("fraction of B atoms, x"); ax.set_ylabel("formation energy (eV/atom)")
    style.save(fig, SLUG, "hull")


# ---------------------------------------------------------------------------------------------------------------
# 4. How CGCNN-style models see a distance: a Gaussian expansion
# ---------------------------------------------------------------------------------------------------------------
def distance_features():
    mu = np.arange(0, 8.0001, 0.2); gamma = 0.2
    fig, ax = plt.subplots(figsize=(7.2, 3.0))
    rr = np.linspace(0, 8, 800)
    for m in mu:
        ax.plot(rr, np.exp(-(rr - m) ** 2 / gamma ** 2), color=style.LINE, lw=0.8, zorder=0)
    for d, col, dx in ((2.82, style.BLUE, -0.05), (3.99, style.ORANGE, 0.05)):
        f = np.exp(-(d - mu) ** 2 / gamma ** 2)
        big = f > 0.01
        ax.vlines(mu[big] + dx, 0, f[big], color=col, lw=2.4)
        ax.plot(mu[big] + dx, f[big], "o", color=col, ms=4)
        print(f"d = {d}: features above 0.01:", dict(zip(mu[big].round(1).tolist(), f[big].round(3).tolist())))
    ax.text(2.7, 1.08, "Na–Cl, 2.82 Å", color=style.BLUE, ha="right", fontsize=9)
    ax.text(4.1, 1.08, "Na–Na, 3.99 Å", color=style.ORANGE, ha="left", fontsize=9)
    ax.text(6.0, 0.6, f"{len(mu)} Gaussians, centres 0.2 Å apart,\nwidth γ = 0.2 Å", color=style.INK2,
            fontsize=8.5, ha="center")
    ax.set_xlim(0, 8); ax.set_ylim(0, 1.2)
    ax.set_xlabel("Gaussian centre μ_k (Å)"); ax.set_ylabel("edge feature e_k")
    style.save(fig, SLUG, "distance-features")


# ---------------------------------------------------------------------------------------------------------------
# Cover: a two-colour crystal with one unit cell drawn and bonds reaching into the neighbouring cells
# ---------------------------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        s = 0.62
        ox, oy = 2.0 - 3 * s, 1.5 - 2 * s
        pts = {}
        for i in range(-1, 8):
            for j in range(-1, 6):
                pts[(i, j)] = (ox + i * s, oy + j * s)
        ci, cj = 3, 2
        cell = np.array([[ox + 2.5 * s, oy + 1.5 * s], [ox + 4.5 * s, oy + 1.5 * s], [ox + 4.5 * s, oy + 3.5 * s],
                         [ox + 2.5 * s, oy + 3.5 * s]])
        ax.add_patch(Polygon(cell, closed=True, fc="white", ec=style.TEAL, lw=4, zorder=1))
        c = np.array(pts[(ci, cj)])
        for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1), (2, 0), (0, 2),
                       (-2, 0), (0, -2)):
            p = np.array(pts[(ci + di, cj + dj)])
            ax.plot(*np.array([c, p]).T, color=style.ORANGE, lw=3.6 if abs(di) + abs(dj) == 1 else 2.2,
                    alpha=1.0 if abs(di) + abs(dj) == 1 else 0.6, zorder=2, solid_capstyle="round")
        for (i, j), p in pts.items():
            blue = (i + j) % 2 == 0
            ax.add_patch(Circle(p, 0.15 if blue else 0.2, color=style.BLUE if blue else style.PINK, zorder=3,
                                ec="white", lw=1.8, alpha=1.0 if (2 <= i <= 4 and 1 <= j <= 3) else 0.55))
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    cells()
    shells_fig()
    hull_fig()
    distance_features()
    cover()
