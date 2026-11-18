"""Figures for content/learn/neural-network-potentials.md.  Run: python3 tools/figures/neural-network-potentials.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import Circle, FancyBboxPatch, FancyArrowPatch
plt = style.setup()
SLUG = "neural-network-potentials"
R_C = 5.0


def fc(r):
    """Behler's cosine cutoff."""
    return 0.5 * (np.cos(np.pi * r / R_C) + 1.0) * (r < R_C)


def shells(kind, a, rmax=R_C):
    """Distances from one atom to all its neighbours in a perfect fcc or bcc crystal."""
    basis = {"fcc": [[0, 0, 0], [.5, .5, 0], [.5, 0, .5], [0, .5, .5]], "bcc": [[0, 0, 0], [.5, .5, .5]]}[kind]
    n = int(np.ceil(rmax / a)) + 1
    g = np.array([[i, j, k] for i in range(-n, n + 1) for j in range(-n, n + 1) for k in range(-n, n + 1)])
    P = (g[:, None, :] + np.array(basis)[None]).reshape(-1, 3) * a
    r = np.linalg.norm(P, axis=1)
    return r[(r > 1e-6) & (r < rmax)]


def angular():
    """The angular factor of G4 against the bond angle, for several zeta and both lambda."""
    th = np.linspace(0, 180, 721)
    c = np.cos(np.radians(th))
    fig, ax = plt.subplots(figsize=style.WIDE)
    for lam, col in ((1, style.BLUE), (-1, style.ORANGE)):
        for zeta, lw, alpha in ((1, 1.4, 0.55), (4, 1.8, 0.8), (16, 2.2, 1.0)):
            y = 2 ** (1 - zeta) * (1 + lam * c) ** zeta
            ax.plot(th, y, color=col, lw=lw, alpha=alpha)
    for x, lab in ((60, "60°"), (90, "90°"), (109.47, "109.5°"), (120, "120°"), (180, "180°")):
        ax.axvline(x, color=style.LINE, lw=1.0, zorder=0)
        ax.text(x, 2.33, lab, ha="center", va="bottom", fontsize=8.5, color=style.INK2)
    ax.text(108.2, 1.47, "tetrahedral", rotation=90, ha="right", va="bottom", fontsize=8.5, color=style.VIOLET)
    for lam, col, ths in ((1, style.BLUE, (33, 62, 40)), (-1, style.ORANGE, (147, 118, 140))):
        for zeta, th0 in zip((16, 4, 1), ths):
            y0 = 2 ** (1 - zeta) * (1 + lam * np.cos(np.radians(th0))) ** zeta
            ax.text(th0 + (3 if lam > 0 else -3), y0 + 0.06, f"ζ = {zeta}", color=col, fontsize=9,
                    ha="left" if lam > 0 else "right", va="bottom",
                    bbox=dict(fc="white", ec="none", pad=0.6, alpha=0.9))
    ax.text(3, 2.12, "λ = +1: peaks at 0°", color=style.BLUE, fontsize=9, ha="left", va="center", fontweight="semibold")
    ax.text(177, 2.12, "λ = −1: peaks at 180°", color=style.ORANGE, fontsize=9, ha="right", va="center", fontweight="semibold")
    ax.set_xlim(0, 180); ax.set_ylim(0, 2.3)
    ax.set_xticks([0, 30, 60, 90, 120, 150, 180])
    ax.set_xlabel("bond angle θ between neighbours j and k at atom i (degrees)")
    ax.set_ylabel(r"angular factor  $2^{1-\zeta}(1+\lambda\cos\theta)^\zeta$")
    style.save(fig, SLUG, "angular")


def fingerprint():
    """Radial fingerprint of an atom in fcc and bcc copper at the same density: the 'soft RDF' that G2 measures."""
    a_fcc = 3.61
    a_bcc = a_fcc * 0.5 ** (1 / 3)                      # same volume per atom
    eta = 4.0                                           # 1/A^2: Gaussian width 1/sqrt(2 eta) = 0.35 A
    rs = np.linspace(1.5, 5.0, 400)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw={"width_ratios": [1.45, 1], "wspace": 0.32})
    data = {}
    for kind, a, col in (("fcc", a_fcc, style.BLUE), ("bcc", a_bcc, style.ORANGE)):
        r = shells(kind, a)
        G = np.array([(np.exp(-eta * (r - R) ** 2) * fc(r)).sum() for R in rs])
        ax1.plot(rs, G, color=col)
        grid = np.linspace(2.0, 4.8, 8)
        data[kind] = np.array([(np.exp(-eta * (r - R) ** 2) * fc(r)).sum() for R in grid])
    ax1.text(2.62, 5.95, "fcc: 12 at 2.55 Å", color=style.BLUE, fontsize=9, ha="left", va="bottom")
    ax1.text(3.05, 4.3, "bcc: 8 at 2.48 Å\nand 6 at 2.87 Å", color=style.ORANGE, fontsize=9, ha="left", va="center")
    ax1.text(4.48, 1.15, "24 at 4.42 Å,\nbut the cutoff\nhas shrunk them", color=style.BLUE, fontsize=8, ha="center", va="bottom")
    ax1.set_xlim(1.5, 5.0); ax1.set_ylim(0, 7.2)
    ax1.set_xlabel(r"shell centre $R_s$ (Å)")
    ax1.set_ylabel(r"$G^2_i(R_s)$, with η = 4 Å$^{-2}$")
    ax1.set_title("A soft count of neighbours", fontsize=10)
    x = np.arange(8)
    ax2.bar(x - 0.2, data["fcc"], width=0.4, color=style.BLUE, label="fcc")
    ax2.bar(x + 0.2, data["bcc"], width=0.4, color=style.ORANGE, label="bcc")
    ax2.set_xticks(x, [f"{v:.1f}" for v in np.linspace(2.0, 4.8, 8)], fontsize=8)
    ax2.set_xlabel(r"$R_s$ of each function (Å)")
    ax2.set_ylabel("descriptor value")
    ax2.set_title("What the network sees", fontsize=10)
    ax2.legend(loc="upper right", handlelength=1.0)
    style.save(fig, SLUG, "fingerprint")
    print("G2 fcc at Rs = 2.55, eta = 4:", round(float((np.exp(-eta * (shells('fcc', a_fcc) - 2.55) ** 2) * fc(shells('fcc', a_fcc))).sum()), 3))
    print("fcc 8-vector", np.round(data["fcc"], 2)); print("bcc 8-vector", np.round(data["bcc"], 2))


def box(ax, x, y, w, h, text, col, fs=9, tc=None):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.02,rounding_size=0.08",
                                fc=style.TINT[col], ec=col, lw=1.2))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=tc or style.INK)


def arrow(ax, p, q, col=style.INK3, lw=1.2, ls="-", rad=0.0, head=8):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=head, color=col, lw=lw, linestyle=ls,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=2, shrinkB=2))


def generations():
    """Second, third and fourth generations of high-dimensional neural network potentials, side by side."""
    fig, ax = plt.subplots(figsize=(7.2, 4.3))
    ax.set_xlim(0, 12); ax.set_ylim(0, 7.0); ax.set_aspect("equal"); ax.axis("off")
    base = np.array([[0.0, 0.0], [0.95, 0.15], [0.35, 0.85], [-0.75, 0.55], [-0.55, -0.7], [0.6, -0.8]])
    titles = ["2nd generation", "3rd generation", "4th generation"]
    subs = ["local energies only", "local energies\n+ electrostatics of local charges", "local energies\n+ globally equilibrated charges"]
    notes = ["nothing beyond the cutoff\ncan matter", "long-range Coulomb energy,\nbut no charge transfer", "charge can flow to\na distant dopant"]
    boxes = ["E = sum of atomic energies", "atomic energies\n+ Ewald electrostatics", "charges minimise a global\nenergy at fixed total charge"]
    under = ["", "each charge predicted from\nits own cutoff sphere", "networks predict an\nelectronegativity per atom"]
    cols = [style.BLUE, style.TEAL, style.VIOLET]
    for c, x0 in enumerate((2.0, 6.0, 10.0)):
        ax.text(x0, 6.95, titles[c], ha="center", va="top", fontsize=10.5, fontweight="semibold", color=style.INK)
        ax.text(x0, 6.5, subs[c], ha="center", va="top", fontsize=8, color=style.INK2, linespacing=1.2)
        cx, cy = x0, 4.0
        P = base * 0.8 + np.array([cx, cy])
        ax.add_patch(Circle(P[0], 1.15, fc="none", ec=style.PINK, lw=1.0, ls="--"))
        if c == 0:
            for k, p in enumerate(P):
                ax.add_patch(Circle(p, 0.19, fc=style.PINK if k == 0 else style.BLUE, ec="white", lw=1.0, zorder=3))
        else:
            q = np.array([0.0, 0.4, -0.3, 0.25, -0.35, 0.2])
            for k, p in enumerate(P):
                col = style.PINK if k == 0 else (style.TEAL if q[k] > 0 else style.VIOLET)
                ax.add_patch(Circle(p, 0.19, fc=col, ec="white", lw=1.0, zorder=3))
                if k:
                    ax.text(p[0], p[1] - 0.01, "+" if q[k] > 0 else "−", ha="center", va="center", color="white", fontsize=8.5, fontweight="semibold", zorder=4)
            far = np.array([cx + 1.45, cy + 1.05])
            ax.add_patch(Circle(far, 0.19, fc=style.GOLD, ec="white", lw=1.0, zorder=3))
            ax.text(far[0], far[1] - 0.01, "+", ha="center", va="center", color="white", fontsize=8.5, fontweight="semibold", zorder=4)
            arrow(ax, far + np.array([-0.14, -0.12]), P[1] + np.array([0.12, 0.14]), col=style.GOLD,
                  ls=(0, (2, 2)) if c == 1 else "-", rad=0.3, lw=1.2 if c == 1 else 1.8)
        ax.text(cx, 2.55, notes[c], ha="center", va="top", fontsize=8, color=style.PINK if c == 0 else style.GOLD, linespacing=1.2)
        arrow(ax, (cx, 1.85), (cx, 1.52))
        box(ax, cx, 1.08, 3.45, 0.78, boxes[c], cols[c], fs=8.5)
        if under[c]:
            ax.text(cx, 0.55, under[c], ha="center", va="top", fontsize=8, color=style.INK2, linespacing=1.2)
    style.save(fig, SLUG, "generations")


def elements():
    """How the number of element-resolved symmetry functions grows with the number of elements."""
    S = np.arange(1, 11)
    n_rad, n_ang = 8, 16
    total = n_rad * S + n_ang * S * (S + 1) // 2
    fig, ax = plt.subplots(figsize=style.WIDE)
    ax.plot(S, total, color=style.TEAL, marker="o", ms=5)
    ax.plot(S, n_rad * S, color=style.BLUE, marker="o", ms=4, lw=1.5)
    ax.plot(S, np.full_like(S, n_rad + n_ang), color=style.ORANGE, marker="o", ms=4, lw=1.5)
    for s in (1, 2, 3, 5, 10):
        ax.text(s - 0.12, total[s - 1] + 25, f"{total[s - 1]}", ha="right", va="bottom", fontsize=8.5, color=style.TEAL)
    ax.text(7.2, 640, "element-resolved: 8 radial per element\n+ 16 angular per pair of elements", color=style.TEAL, fontsize=9, ha="right", va="center")
    ax.text(10.2, 80 + 22, "radial part alone", color=style.BLUE, fontsize=9, ha="right", va="bottom")
    ax.text(10.2, 24 - 22, "element-weighted (wACSF): 24, whatever S", color=style.ORANGE, fontsize=9, ha="right", va="top")
    ax.set_xticks(S); ax.set_xlim(0.5, 10.5); ax.set_ylim(-80, 1050)
    ax.set_yticks([0, 200, 400, 600, 800, 1000])
    ax.spines["bottom"].set_bounds(1, 10); ax.spines["left"].set_bounds(0, 1000)
    ax.set_xlabel("number of chemical elements S")
    ax.set_ylabel("symmetry functions per atom")
    style.save(fig, SLUG, "elements")


def cover():
    def draw(ax):
        rng = np.random.default_rng(7)
        centre = np.array([1.15, 1.5])
        ax.add_patch(Circle(centre, 0.9, fc=style.TINT[style.PINK], ec=style.PINK, lw=2.2, ls=(0, (4, 3))))
        pts = [(1.15, 1.5), (0.55, 1.92), (1.7, 2.02), (0.5, 1.05), (1.35, 0.85), (1.75, 1.08), (0.25, 2.6), (2.2, 0.45), (0.3, 0.3)]
        for k, p in enumerate(pts):
            ax.add_patch(Circle(p, 0.2 if k else 0.24, fc=style.PINK if k == 0 else style.BLUE, ec="white", lw=1.5, zorder=3))
        # a small network: 4 -> 4 -> 1
        L = [np.array([[2.75, y] for y in (0.75, 1.25, 1.75, 2.25)]), np.array([[3.3, y] for y in (0.9, 1.35, 1.8)]), np.array([[3.75, 1.35]])]
        for A, B in zip(L[:-1], L[1:]):
            for p in A:
                for q in B:
                    ax.plot([p[0], q[0]], [p[1], q[1]], color=style.INK3, lw=1.0, zorder=1)
        for layer, col in zip(L, (style.VIOLET, style.TEAL, style.ORANGE)):
            for p in layer:
                ax.add_patch(Circle(p, 0.12 if col != style.ORANGE else 0.17, fc=col, ec="white", lw=1.2, zorder=3))
        ax.add_patch(FancyArrowPatch((1.42, 1.5), (2.55, 1.5), arrowstyle="-|>", mutation_scale=16, color=style.INK2, lw=2.2, zorder=2))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    angular(); fingerprint(); generations(); elements(); cover()
