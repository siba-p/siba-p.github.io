"""Static figures for content/learn/history-of-interatomic-potentials.md.

Run from the repository root:  python3 tools/figures/history-of-interatomic-potentials.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import Circle, FancyBboxPatch, FancyArrowPatch
import style
plt = style.setup()
SLUG = "history-of-interatomic-potentials"

# Argon, the textbook Lennard-Jones liquid: eps/kB = 119.8 K, sigma = 3.405 Angstrom
EPS = 119.8 * 0.0861733          # well depth in meV (10.32 meV)
SIG = 3.405                      # Angstrom
RM = 2 ** (1 / 6) * SIG          # position of the minimum, 3.82 Angstrom
A_MORSE = 6 / RM                 # Morse range matched to the LJ curvature at the minimum
ALPHA = (19 + np.sqrt(73)) / 2   # exp-6 steepness matched to the same curvature (13.77)


def lj(r):
    return 4 * EPS * ((SIG / r) ** 12 - (SIG / r) ** 6)


def morse(r):
    return EPS * ((1 - np.exp(-A_MORSE * (r - RM))) ** 2 - 1)


def buck(r):
    return EPS / (1 - 6 / ALPHA) * (6 / ALPHA * np.exp(ALPHA * (1 - r / RM)) - (RM / r) ** 6)


def pairwells():
    """Three pair potentials with the same well: depth, position and curvature all matched."""
    fig, axs = plt.subplots(1, 3, figsize=(7.2, 3.0), gridspec_kw=dict(wspace=0.42))
    curves = [(lj, "Lennard-Jones", style.BLUE, "-"), (buck, "Buckingham", style.TEAL, (0, (4, 2))), (morse, "Morse", style.ORANGE, "-")]

    ax = axs[0]
    r = np.linspace(3.2, 7.0, 400)
    for f, name, c, ls in curves:
        ax.plot(r, f(r), color=c, lw=2, ls=ls)
    ax.axhline(0, color=style.LINE, lw=0.8, zorder=0)
    ax.set_xlim(3.2, 7.0); ax.set_ylim(-12, 8)
    ax.set_xlabel("distance r (Å)"); ax.set_ylabel("V(r) (meV)")
    ax.set_title("The well", fontsize=10)
    ax.annotate("depth 10.3 meV\nat 3.82 Å", xy=(RM, -EPS), xytext=(4.6, -9.5), fontsize=8, color=style.INK2,
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))

    ax = axs[1]
    r = np.linspace(2.6, 3.4, 300)
    for f, name, c, ls in curves:
        ax.plot(r, f(r), color=c, lw=2, ls=ls)
    ax.axhline(25.85, color=style.INK3, lw=0.8, ls=(0, (3, 3)))
    ax.text(3.4, 300, "dashed:\nthermal energy\nat 300 K", fontsize=8, color=style.INK3, ha="right")
    ax.set_xlim(2.6, 3.4); ax.set_ylim(-20, 900)
    ax.set_xlabel("distance r (Å)")
    ax.set_title("The wall", fontsize=10)
    ax.text(2.63, lj(2.6) - 30, "Lennard-Jones", color=style.BLUE, fontsize=8, va="top")
    ax.text(2.69, 520, "Buckingham", color=style.TEAL, fontsize=8)
    ax.text(2.62, 95, "Morse", color=style.ORANGE, fontsize=8)

    ax = axs[2]
    r = np.linspace(4.0, 10.0, 300)
    for f, name, c, ls in curves:
        ax.semilogy(r, -f(r), color=c, lw=2, ls=ls)
    ax.set_xlim(4, 10); ax.set_ylim(1e-3, 20)
    ax.set_xlabel("distance r (Å)"); ax.set_ylabel("attraction −V(r) (meV)")
    ax.set_title("The tail", fontsize=10)
    ax.text(6.9, 1.6, "Lennard-Jones and\nBuckingham: r⁻⁶", fontsize=8, color=style.BLUE)
    ax.text(4.3, 3e-3, "Morse:\nexponential", fontsize=8, color=style.ORANGE)
    style.save(fig, SLUG, "pairwells")


def bondcount():
    """Pair potential (energy linear in coordination) against a square-root embedding (Finnis-Sinclair, EAM)."""
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(width_ratios=[1.15, 1], wspace=0.38))
    ax = axs[0]
    Z = np.linspace(0, 12, 200)
    ax.plot(Z, -Z / 12, color=style.BLUE)
    ax.plot(Z, -np.sqrt(Z / 12), color=style.ORANGE)
    marks = [(1, "dimer"), (4, "diamond"), (6, "sc"), (8, "bcc"), (12, "fcc")]
    for z, name in marks:
        ax.plot([z, z], [-1.08, -np.sqrt(z / 12)], color=style.LINE, lw=0.8, zorder=0)
        ax.plot(z, -z / 12, "o", color=style.BLUE, ms=4.5)
        ax.plot(z, -np.sqrt(z / 12), "o", color=style.ORANGE, ms=4.5)
        ax.text(z, 0.06, name, ha="center", va="bottom", fontsize=8, color=style.INK2)
    ax.text(6.3, -0.24, "pair potential:\nevery bond is\nworth the same", color=style.BLUE, fontsize=8, va="top")
    ax.text(1.4, -0.98, "square-root embedding:\nthe first bonds count most", color=style.ORANGE, fontsize=8)
    ax.set_xlim(0, 12.6); ax.set_ylim(-1.08, 0.34)
    ax.set_yticks([-1, -0.5, 0])
    ax.set_xlabel("number of neighbours Z")
    ax.set_ylabel("energy per atom (fcc = −1)")

    ax = axs[1]
    names = ["pair", "root", "Al", "Pt", "Au", "Cu", "Ag", "Ni"]
    # approximate measured vacancy formation and cohesive energies (eV)
    expt = {"Al": (0.67, 3.39), "Pt": (1.35, 5.84), "Au": (0.93, 3.81), "Cu": (1.28, 3.49), "Ag": (1.11, 2.95), "Ni": (1.79, 4.44)}
    vals = [1.0, 12 * (np.sqrt(12) - np.sqrt(11)) / np.sqrt(12)] + [expt[k][0] / expt[k][1] for k in names[2:]]
    cols = [style.BLUE, style.ORANGE] + [style.INK3] * 6
    x = np.array([0, 1.3, 2.7, 3.5, 4.3, 5.1, 5.9, 6.7])
    ax.bar(x, vals, width=0.62, color=cols)
    for xi, v in zip(x[:2], vals[:2]):
        ax.text(xi, v + 0.03, f"{v:.2f}", ha="center", fontsize=8, color=style.INK2)
    ax.text(4.7, 0.52, "measured", ha="center", fontsize=8, color=style.INK2)
    ax.set_xticks(x[2:]); ax.set_xticklabels(names[2:], fontsize=8)
    ax.text(0, -0.05, "pair\npotential", ha="center", va="top", fontsize=8, color=style.BLUE)
    ax.text(1.3, -0.05, "square\nroot", ha="center", va="top", fontsize=8, color=style.ORANGE)
    ax.set_ylim(0, 1.12); ax.set_yticks([0, 0.5, 1])
    ax.set_ylabel("vacancy energy ÷ cohesive energy")
    style.save(fig, SLUG, "bondcount")


def _env(ax, x0, y0, s, rng_seed=3):
    """A small 2D atomic environment: central atom, neighbours, cutoff circle."""
    rng = np.random.default_rng(rng_seed)
    ax.add_patch(Circle((x0, y0), 1.0 * s, fill=True, fc=style.TINT[style.TEAL], ec=style.TEAL, lw=1.2, ls=(0, (3, 2))))
    ang = np.array([0.3, 1.25, 2.2, 3.0, 3.9, 4.7, 5.6]) + rng.normal(0, 0.08, 7)
    rad = np.array([0.55, 0.62, 0.5, 0.7, 0.58, 0.66, 0.52])
    for a, rr in zip(ang, rad):
        px, py = x0 + rr * s * np.cos(a), y0 + rr * s * np.sin(a)
        ax.plot([x0, px], [y0, py], color=style.INK3, lw=0.8, zorder=1)
        ax.add_patch(Circle((px, py), 0.11 * s, fc=style.BLUE, ec="white", lw=0.8, zorder=2))
    for a, rr in [(0.8, 1.25), (2.6, 1.3), (4.3, 1.22), (5.9, 1.28)]:
        ax.add_patch(Circle((x0 + rr * s * np.cos(a), y0 + rr * s * np.sin(a)), 0.11 * s, fc=style.LINE, ec="white", lw=0.8))
    ax.add_patch(Circle((x0, y0), 0.14 * s, fc=style.ORANGE, ec="white", lw=1, zorder=3))


def _box(ax, x, y, w, h, color):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.02,rounding_size=0.12",
                                fc=style.TINT[color], ec=color, lw=1.2))


def _arrow(ax, x1, x2, y):
    ax.add_patch(FancyArrowPatch((x1, y), (x2, y), arrowstyle="-|>", mutation_scale=12, color=style.INK3, lw=1.2))


def skeleton():
    """EAM (1984) and Behler-Parrinello (2007) drawn as the same pipeline."""
    fig, ax = plt.subplots(figsize=(7.2, 4.3))
    ax.set_xlim(0, 10.6); ax.set_ylim(0, 6.2); ax.set_aspect("equal"); ax.axis("off")
    cols = [0.95, 3.2, 5.75, 8.0, 9.85]
    heads = ["neighbours of\natom i within rc", "descriptor", "function", "atomic\nenergy", "total"]
    for x, h in zip(cols, heads):
        ax.text(x, 6.15, h, ha="center", va="top", fontsize=8.5, color=style.INK2, fontweight="semibold")
    rows = [(3.75, "Embedded atom method (1984)"), (1.15, "Behler–Parrinello network (2007)")]
    for y, label in rows:
        ax.text(0.0, y + 1.25, label, fontsize=9, color=style.INK, fontweight="semibold", va="bottom")
        _env(ax, cols[0], y, 0.82)
        _arrow(ax, 1.85, 2.3, y)
        _arrow(ax, 4.1, 4.65, y)
        _arrow(ax, 6.85, 7.4, y)
        _arrow(ax, 8.6, 9.25, y)
        _box(ax, cols[3], y, 1.0, 0.7, style.ORANGE)
        ax.text(cols[3], y, "$E_i$", ha="center", va="center", fontsize=11, color=style.INK)
        ax.text(cols[4], y, "$\\sum_i E_i$", ha="center", va="center", fontsize=11, color=style.INK)

    y = rows[0][0]
    _box(ax, cols[1], y, 1.7, 0.95, style.TEAL)
    ax.text(cols[1], y + 0.14, "one number", ha="center", fontsize=8, color=style.INK2)
    ax.text(cols[1], y - 0.2, "$\\bar\\rho_i = \\sum_j \\rho(r_{ij})$", ha="center", fontsize=9, color=style.INK)
    _box(ax, cols[2], y, 2.1, 1.25, style.VIOLET)
    xx = np.linspace(0.02, 1, 50)
    ax.plot(cols[2] - 0.85 + 1.0 * xx, y + 0.3 - 0.5 * np.sqrt(xx), color=style.VIOLET, lw=2)
    ax.text(cols[2] + 0.3, y + 0.08, "$F(\\bar\\rho)$", fontsize=9, color=style.INK, va="center")
    ax.text(cols[2], y - 0.48, "fixed formula", ha="center", fontsize=8, color=style.INK2)

    y = rows[1][0]
    _box(ax, cols[1], y, 1.7, 0.95, style.TEAL)
    hts = np.array([0.5, 0.8, 0.35, 0.65, 0.9, 0.3, 0.55, 0.75, 0.4, 0.6])
    for k, h in enumerate(hts):
        ax.add_patch(plt.Rectangle((cols[1] - 0.68 + 0.137 * k, y - 0.38), 0.1, 0.36 * h, color=style.TEAL))
    ax.text(cols[1], y + 0.13, "~50 numbers", ha="center", fontsize=8, color=style.INK2)
    _box(ax, cols[2], y, 2.1, 1.25, style.VIOLET)
    layers = [np.linspace(-0.4, 0.4, 4), np.linspace(-0.45, 0.45, 5), np.linspace(-0.45, 0.45, 5), [0.0]]
    xs = cols[2] + np.array([-0.75, -0.25, 0.25, 0.75])
    for a in range(3):
        for p in layers[a]:
            for q in layers[a + 1]:
                ax.plot([xs[a], xs[a + 1]], [y + p, y + q], color=style.VIOLET, lw=0.4, alpha=0.5)
    for a in range(4):
        for p in layers[a]:
            ax.add_patch(Circle((xs[a], y + p), 0.07, fc="white", ec=style.VIOLET, lw=1.1, zorder=3))
    ax.text(cols[2], y - 0.72, "neural network, learned", ha="center", va="top", fontsize=8, color=style.INK2)
    style.save(fig, SLUG, "skeleton")


def cover():
    def draw(ax):
        r = np.linspace(0.955, 3.2, 400)                  # in units of sigma
        v = 4 * (r ** -12 - r ** -6)                      # Lennard-Jones, well depth 1
        x, y = 0.35 + (r - 0.95) * 1.5, 1.55 + 1.05 * v
        keep = y < 3.3
        ax.plot(x[keep], y[keep], color=style.BLUE, lw=8, solid_capstyle="round")
        xm = 0.35 + (2 ** (1 / 6) - 0.95) * 1.5
        ax.add_patch(Circle((xm, 1.55 - 1.05 + 0.26), 0.22, fc=style.ORANGE, ec="none", zorder=3))
        nodes = np.array([[2.35, 2.55], [2.85, 2.75], [3.4, 2.55], [2.6, 2.1], [3.15, 2.1], [3.7, 2.05]])
        edges = [(0, 1), (1, 2), (0, 3), (1, 3), (1, 4), (2, 4), (2, 5), (3, 4), (4, 5)]
        for i, j in edges:
            ax.plot(*zip(nodes[i], nodes[j]), color=style.VIOLET, lw=3.5, alpha=0.7)
        for (px, py) in nodes:
            ax.add_patch(Circle((px, py), 0.13, fc=style.VIOLET, ec="white", lw=1.5))
    style.cover(SLUG, draw, bg=style.TINT[style.GOLD])


if __name__ == "__main__":
    pairwells(); bondcount(); skeleton(); cover()
