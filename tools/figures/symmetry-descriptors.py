"""Static figures for content/learn/symmetry-descriptors.md.

Run from the repository root:  python3 tools/figures/symmetry-descriptors.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import Circle, Wedge
import style
plt = style.setup()
SLUG = "symmetry-descriptors"


def fc(r, rc):
    return np.where(r < rc, 0.5 * (np.cos(np.pi * r / rc) + 1), 0.0)


def census():
    """Radial symmetry functions as soft shells: a schematic and the functions themselves."""
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.4), gridspec_kw=dict(width_ratios=[1, 1.35], wspace=0.25))
    rc, eta, centres = 4.0, 4.0, [1.0, 1.5, 2.0, 2.5, 3.0]
    cols = [style.BLUE, style.TEAL, style.VIOLET, style.ORANGE, style.PINK]

    ax = axs[0]; ax.set_aspect("equal"); ax.axis("off")
    for rs, c in zip(centres, cols):
        w = 2 / np.sqrt(eta) * 0.59        # full width at half maximum of the Gaussian
        ax.add_patch(Wedge((0, 0), rs + w / 2, 0, 360, width=w, fc=c, alpha=0.16, ec="none"))
    ax.add_patch(Circle((0, 0), rc, fill=False, ec=style.INK3, lw=1, ls=(0, (4, 3))))
    rng = np.random.default_rng(2)
    rr = np.array([1.05, 1.1, 1.5, 1.55, 2.4, 2.6, 2.95, 3.3, 3.6])
    th = rng.uniform(0, 2 * np.pi, len(rr))
    for r, t in zip(rr, th):
        ax.add_patch(Circle((r * np.cos(t), r * np.sin(t)), 0.18, fc=style.INK2, ec="white", lw=0.8, zorder=3))
    for r, t in [(4.4, 0.7), (4.6, 2.9), (4.3, 4.6)]:
        ax.add_patch(Circle((r * np.cos(t), r * np.sin(t)), 0.18, fc=style.LINE, ec="white", lw=0.8, zorder=3))
    ax.add_patch(Circle((0, 0), 0.22, fc=style.ORANGE, ec="white", lw=1, zorder=4))
    ax.text(0, -rc - 0.35, "cutoff rc = 4 Å", ha="center", va="top", fontsize=8, color=style.INK2)
    ax.set_xlim(-4.9, 4.9); ax.set_ylim(-5.0, 4.9)
    ax.set_title("Soft shells around atom i", fontsize=10)

    ax = axs[1]
    r = np.linspace(0, 4.4, 500)
    ax.fill_between(r, 0, fc(r, rc), color=style.BG2, zorder=0)
    ax.plot(r, fc(r, rc), color=style.INK3, lw=1.2, ls=(0, (4, 3)))
    ax.text(3.15, 0.33, "cutoff\nfunction", fontsize=8, color=style.INK3)
    for rs, c in zip(centres, cols):
        ax.plot(r, np.exp(-eta * (r - rs) ** 2) * fc(r, rc), color=c)
        ax.text(rs + 0.1, fc(np.array(rs), rc) + 0.02, f"{rs:g} Å", ha="left", fontsize=8, color=c)
    ax.set_xlim(0, 4.4); ax.set_ylim(0, 1.12)
    ax.set_xlabel("neighbour distance r (Å)")
    ax.set_ylabel("contribution to G²")
    ax.set_title("η = 4 Å⁻², centres 1–3 Å", fontsize=10)
    style.save(fig, SLUG, "census")


def angular():
    """Angular factor 2^(1-zeta) (1 + lambda cos theta)^zeta of Behler's G4."""
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.1), sharey=True, gridspec_kw=dict(wspace=0.12))
    th = np.linspace(0, 180, 361)
    zetas = [(1, style.GOLD), (2, style.TEAL), (4, style.BLUE), (16, style.VIOLET)]
    for ax, lam in zip(axs, (1, -1)):
        for ang, lab, ha, dx in [(90, "90°", "right", -1.5), (109.47, "109.5°", "left", 1.5), (180, "180°", "right", -1.5)]:
            ax.axvline(ang, color=style.LINE, lw=1, zorder=0)
            ax.text(ang + dx, 2.08, lab, ha=ha, fontsize=8, color=style.INK3)
        for z, c in zetas:
            y = 2 ** (1 - z) * (1 + lam * np.cos(np.radians(th))) ** z
            ax.plot(th, y, color=c)
        ax.set_xlim(0, 180); ax.set_ylim(0, 2.2); ax.set_xticks([0, 45, 90, 135, 180])
        ax.set_xlabel("bond angle θ (degrees)")
        ax.set_title(f"λ = {lam:+d}", fontsize=10)
    axs[0].set_ylabel("angular factor")
    for z, c, x, y in [(1, style.GOLD, 71, 1.45), (2, style.TEAL, 77, 0.95), (4, style.BLUE, 66, 0.7), (16, style.VIOLET, 50, 0.25)]:
        axs[0].text(x, y, f"ζ = {z}", fontsize=8, color=c)
    style.save(fig, SLUG, "angular")


A_CU = 2.556                   # nearest-neighbour distance in copper (Angstrom)


def _fcc(n=4):
    a0 = A_CU * np.sqrt(2)
    b = np.array([[0, 0, 0], [.5, .5, 0], [.5, 0, .5], [0, .5, .5]])
    g = np.arange(-n, n + 1)
    return np.array([(np.array([i, j, k]) + bb) * a0 for i in g for j in g for k in g for bb in b])


def _hcp(n=5):
    a, c = A_CU, A_CU * np.sqrt(8 / 3)            # ideal c/a ratio
    a1, a2, a3 = np.array([a, 0, 0]), np.array([a / 2, a * np.sqrt(3) / 2, 0]), np.array([0, 0, c])
    b = [np.zeros(3), (a1 + a2) / 3 + a3 / 2]
    g = np.arange(-n, n + 1)
    return np.array([i * a1 + j * a2 + k * a3 + bb for i in g for j in g for k in g for bb in b])


def shells(P, rmax=5.3):
    r = np.linalg.norm(P, axis=1); r = r[(r > 0.1) & (r < rmax)]
    return np.unique(np.round(r, 3), return_counts=True)


def first_shell_angles(P):
    r = np.linalg.norm(P, axis=1); P1 = P[(r > 0.1) & (r < A_CU + 0.1)]
    cos = (P1 @ P1.T) / A_CU ** 2
    iu = np.triu_indices(len(P1), 1)
    return np.unique(np.round(np.degrees(np.arccos(np.clip(cos[iu], -1, 1))), 2), return_counts=True)


def fcchcp():
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.3))
    data = [(_fcc(), "fcc", style.BLUE, -0.05), (_hcp(), "hcp", style.ORANGE, 0.05)]
    ax = axs[0]
    ax.axvspan(0, 4.0, color=style.BG2, zorder=0)
    ax.text(3.95, 25.5, "inside rc = 4 Å:\nidentical", ha="right", va="top", fontsize=8, color=style.INK2)
    for P, name, c, dx in data:
        r, n = shells(P)
        ax.vlines(r + dx, 0, n, color=c, lw=3)
    ax.annotate("hcp only:\n2 at 4.17 Å", xy=(4.2, 2.3), xytext=(3.0, 17.5), fontsize=8, color=style.ORANGE,
                arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.8))
    ax.set_xlim(2, 5.4); ax.set_ylim(0, 27)
    ax.set_xlabel("neighbour distance (Å)"); ax.set_ylabel("number of neighbours")
    ax.set_title("Radial shells", fontsize=10)
    ax.text(2.7, 13, "fcc", color=style.BLUE, fontsize=9, fontweight="semibold")
    ax.text(2.7, 10.5, "hcp", color=style.ORANGE, fontsize=9, fontweight="semibold")

    ax = axs[1]
    for P, name, c, dx in data:
        a, n = first_shell_angles(P)
        ax.vlines(a + 2.2 * np.sign(dx), 0, n, color=c, lw=3)
    for ang, lab, n in [(109.47, "109.5°", 3), (146.44, "146.4°", 6)]:
        ax.text(ang + 2.2, n + 0.8, lab, ha="center", fontsize=8, color=style.ORANGE)
    ax.set_xlim(45, 190); ax.set_ylim(0, 27); ax.set_xticks([60, 90, 120, 150, 180])
    ax.set_xlabel("bond angle (degrees)"); ax.set_ylabel("number of pairs")
    ax.set_title("Bond angles, 12 nearest neighbours", fontsize=10)
    style.save(fig, SLUG, "fcchcp")


def cover():
    def draw(ax):
        base = np.array([[0.0, 0.0], [0.55, 0.2], [0.15, 0.62], [-0.45, 0.35], [-0.35, -0.45], [0.4, -0.45]])
        cols = [style.BLUE, style.VIOLET, style.TEAL]
        for k, (ang, c) in enumerate(zip([0, 40, 80], cols)):
            t = np.radians(ang); R = np.array([[np.cos(t), -np.sin(t)], [np.sin(t), np.cos(t)]])
            P = base @ R.T * 1.25 + [1.25, 1.5]
            for p in P[1:]:
                ax.plot([P[0, 0], p[0]], [P[0, 1], p[1]], color=c, lw=2.5, alpha=0.55)
                ax.add_patch(Circle(p, 0.15, fc=c, ec="white", lw=1.2, alpha=0.85))
        ax.add_patch(Circle((1.25, 1.5), 0.2, fc=style.ORANGE, ec="white", lw=1.5, zorder=4))
        hs = [0.9, 1.6, 0.6, 1.3, 1.9, 0.8, 1.1]
        for k, h in enumerate(hs):
            ax.add_patch(plt.Rectangle((2.75 + 0.16 * k, 0.75), 0.11, h, color=style.INK2))
        ax.annotate("", xy=(2.6, 1.5), xytext=(2.2, 1.5),
                    arrowprops=dict(arrowstyle="-|>", color=style.INK3, lw=3, mutation_scale=22))
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    census(); angular(); fcchcp(); cover()
