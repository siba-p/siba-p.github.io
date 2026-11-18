"""Figures for content/learn/ensembles-and-free-energy.md.  Run: python3 tools/figures/ensembles-and-free-energy.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import Rectangle, FancyArrowPatch, FancyBboxPatch, Circle
plt = style.setup()
SLUG = "ensembles-and-free-energy"

# physical constants (SI, exact 2019 values) and atomic masses in u
H, KB, NA, U = 6.62607015e-34, 1.380649e-23, 6.02214076e23, 1.66053907e-27


def thermal_wavelength(m_u, T):
    """de Broglie thermal wavelength in angstrom, Λ = h / sqrt(2π m kB T)."""
    return H / np.sqrt(2 * np.pi * m_u * U * KB * T) * 1e10


def ensemble_family():
    """Four boxes: what each ensemble holds fixed, what it exchanges, its weight and its potential."""
    fig, ax = plt.subplots(figsize=(7.2, 3.7))
    ax.set_xlim(0, 16); ax.set_ylim(-3.6, 4.7); ax.set_aspect("equal"); ax.axis("off")
    rng = np.random.default_rng(3)
    cols = [
        ("Microcanonical", "N, V, E fixed", "nothing exchanged", "all states equal", r"$S = k_B\ln\Omega$", style.INK3, None),
        ("Canonical", "N, V, T fixed", "exchanges energy", r"$e^{-\beta E}$", r"$F = -k_BT\ln Z$", style.ORANGE, style.TINT[style.ORANGE]),
        ("Isothermal–isobaric", "N, P, T fixed", "energy and volume", r"$e^{-\beta (E + PV)}$", r"$G = F + PV$", style.BLUE, style.TINT[style.BLUE]),
        ("Grand canonical", r"$\mu$, V, T fixed", "energy and particles", r"$e^{-\beta (E - \mu N)}$", r"$\Omega = F - \mu N$", style.TEAL, style.TINT[style.TEAL]),
    ]
    for k, (name, fixed, exch, weight, pot, col, tint) in enumerate(cols):
        cx = 2 + 4 * k
        # reservoir
        if tint:
            ax.add_patch(FancyBboxPatch((cx - 1.75, 0.35), 3.5, 3.9, boxstyle="round,pad=0,rounding_size=0.25", fc=tint, ec="none"))
        # system box
        x0, y0, w, h = cx - 1.05, 1.0, 2.1, 2.1
        if k == 2:   # piston: the top wall is a movable bar
            h = 1.75
        ls = (0, (3, 2.2)) if k == 3 else "-"
        lw = 3.2 if k == 0 else 1.8
        ax.add_patch(Rectangle((x0, y0), w, h, fc="white", ec=style.INK2 if k else style.INK, lw=lw, ls=ls, zorder=2))
        # particles
        n = 9
        px = x0 + 0.25 + rng.random(n) * (w - 0.5); py = y0 + 0.25 + rng.random(n) * (h - 0.5)
        ax.scatter(px, py, s=34, color=col if k else style.INK2, zorder=3, lw=0)
        if k == 1:   # heat arrows through the walls
            for yy in (1.55, 2.55):
                ax.add_patch(FancyArrowPatch((x0 - 0.62, yy), (x0 + 0.05, yy), arrowstyle="<|-|>", mutation_scale=9, color=style.ORANGE, lw=1.6, zorder=4))
                ax.add_patch(FancyArrowPatch((x0 + w - 0.05, yy), (x0 + w + 0.62, yy), arrowstyle="<|-|>", mutation_scale=9, color=style.ORANGE, lw=1.6, zorder=4))
        if k == 2:   # piston rod and arrows
            ax.add_patch(Rectangle((x0 - 0.05, y0 + h), w + 0.1, 0.22, fc=style.BLUE, ec="none", zorder=4))
            ax.plot([cx, cx], [y0 + h + 0.22, y0 + h + 0.75], color=style.BLUE, lw=3, zorder=4, solid_capstyle="butt")
            ax.add_patch(FancyArrowPatch((cx + 0.55, y0 + h + 0.95), (cx + 0.55, y0 + h + 0.3), arrowstyle="<|-|>", mutation_scale=9, color=style.BLUE, lw=1.6, zorder=4))
            for yy in (1.4,):
                ax.add_patch(FancyArrowPatch((x0 - 0.62, yy), (x0 + 0.05, yy), arrowstyle="<|-|>", mutation_scale=9, color=style.ORANGE, lw=1.6, zorder=4))
        if k == 3:   # particles crossing the permeable wall
            ax.scatter([x0 - 0.35, x0 + w + 0.4, cx + 0.3], [2.6, 1.45, y0 + h + 0.45], s=34, color=style.TEAL, zorder=3, lw=0)
            ax.add_patch(FancyArrowPatch((x0 - 0.35, 2.35), (x0 + 0.3, 2.05), arrowstyle="-|>", mutation_scale=9, color=style.TEAL, lw=1.4, zorder=4))
            ax.add_patch(FancyArrowPatch((x0 + w - 0.2, 1.75), (x0 + w + 0.35, 1.65), arrowstyle="-|>", mutation_scale=9, color=style.TEAL, lw=1.4, zorder=4))
            ax.add_patch(FancyArrowPatch((x0 + 0.4, 1.0 + 0.2), (x0 + 0.4, 0.55), arrowstyle="-|>", mutation_scale=9, color=style.ORANGE, lw=1.4, zorder=4))
        # labels below
        ax.text(cx, 4.45, name, ha="center", va="center", fontsize=10, weight="semibold", color=style.INK)
        ax.text(cx, -0.05, fixed, ha="center", va="center", fontsize=9, color=style.INK2)
        ax.text(cx, -0.65, exch, ha="center", va="center", fontsize=9, color=style.INK2)
        ax.text(cx, -1.55, weight, ha="center", va="center", fontsize=11, color=col if k else style.INK)
        ax.text(cx, -2.45, pot, ha="center", va="center", fontsize=10, color=style.INK)
    ax.text(8, -3.3, r"Each potential is a Legendre transform of the one before:  $F = U - TS$,   $G = F + PV$,   $\Omega = F - \mu N$",
            ha="center", va="center", fontsize=9, color=style.INK2)
    style.save(fig, SLUG, "ensemble-family")


def thermal_wavelength_plot():
    """Λ(T) for light and heavy atoms against the spacing between neighbours."""
    fig, ax = plt.subplots(figsize=style.WIDE)
    T = np.logspace(0, 3, 200)
    lines = [("H atom", 1.008, style.PINK), ("He", 4.0026, style.VIOLET), ("Ar", 39.948, style.BLUE)]
    ax.axhspan(3.0, 4.0, color=style.TINT[style.GOLD], zorder=0)
    ax.text(40, 3.45, "nearest-neighbour spacing in liquids and solids, 3–4 Å", fontsize=8.5, color=style.INK2, va="center")
    gas = (KB * T / 1e5) ** (1 / 3) * 1e10
    ax.plot(T, gas, color=style.INK3, lw=1.4, ls=(0, (4, 3)))
    ax.text(150, 31, "mean spacing in a gas at 1 bar", fontsize=8.5, color=style.INK3, ha="right", va="bottom")
    for name, m, c in lines:
        ax.plot(T, thermal_wavelength(m, T), color=c)
    for name, m, c in lines:
        ax.text(1080, thermal_wavelength(m, 1000), {"H atom": "H atom", "He": "helium", "Ar": "argon"}[name], color=c, fontsize=9, weight="semibold", ha="left", va="center")
    pts = [(4.2, 4.0026, style.VIOLET, "liquid He, 4.2 K: Λ = 4.3 Å,\nlonger than the spacing", "left", (1.15, 38)),
           (87.3, 39.948, style.BLUE, "liquid Ar, 87 K: 0.30 Å", "left", (6, 4)),
           (298.15, 39.948, style.BLUE, "Ar gas, 298 K: 0.16 Å", "right", (-6, -14)),
           (300, 1.008, style.PINK, "H in water, 300 K: 1.0 Å", "left", (8, 2))]
    for TT, m, c, lab, ha, off in pts:
        lam = thermal_wavelength(m, TT)
        ax.plot(TT, lam, "o", ms=6.5, color=c, mec="white", mew=1.2, zorder=5)
        ax.annotate(lab, (TT, lam), xytext=off, textcoords="data" if TT == 4.2 else "offset points", fontsize=8.5, color=style.INK2, ha=ha, va="center",
                    arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkA=2, shrinkB=4) if TT == 4.2 else None)
    ax.set_xscale("log"); ax.set_yscale("log")
    ax.set_xlim(1, 1000); ax.set_ylim(0.04, 80)
    ax.set_xlabel("temperature (K)"); ax.set_ylabel("thermal wavelength Λ (Å)")
    ax.set_yticks([0.1, 1, 10]); ax.set_yticklabels(["0.1", "1", "10"])
    ax.set_xticks([1, 10, 100, 1000]); ax.set_xticklabels(["1", "10", "100", "1000"])
    style.save(fig, SLUG, "thermal-wavelength")


def rubber():
    """Ideal chain: coiled conformations outnumber stretched ones, so tension is entropic and grows with T."""
    fig = plt.figure(figsize=(7.2, 3.3))
    a = fig.add_axes([0.0, 0.08, 0.36, 0.84]); b = fig.add_axes([0.5, 0.17, 0.48, 0.73])
    a.set_xlim(0, 4.2); a.set_ylim(0, 4.0); a.set_aspect("equal"); a.axis("off")
    rng = np.random.default_rng(11)
    # a coiled chain: a 2D freely jointed walk of 60 links, rescaled to fit
    ang = rng.uniform(0, 2 * np.pi, 60); xy = np.cumsum(np.c_[np.cos(ang), np.sin(ang)], axis=0)
    xy = np.vstack([[0, 0], xy]); xy -= xy.mean(axis=0); xy *= 0.95 / np.abs(xy).max()
    a.plot(xy[:, 0] + 1.05, xy[:, 1] + 2.85, color=style.TEAL, lw=1.6)
    a.plot(*(xy[[0, -1]].T + np.array([[1.05], [2.85]])), "o", color=style.TEAL, ms=5)
    a.text(2.25, 3.25, "coiled: short end-to-end\ndistance, a vast number\nof conformations", fontsize=8.5, color=style.INK2, va="center")
    # a stretched chain: nearly straight, few ways to do it
    ang = rng.normal(0, 0.35, 30); xy2 = np.cumsum(np.c_[np.cos(ang), np.sin(ang)], axis=0)
    xy2 = np.vstack([[0, 0], xy2]) * (3.6 / 30)
    a.plot(xy2[:, 0] + 0.3, xy2[:, 1] + 1.0, color=style.ORANGE, lw=1.6)
    a.plot(*(xy2[[0, -1]].T + np.array([[0.3], [1.0]])), "o", color=style.ORANGE, ms=5)
    a.text(0.3, 0.42, "stretched: few conformations,\nlow entropy", fontsize=8.5, color=style.INK2, va="center")
    # force-extension of a freely jointed chain, 100 Kuhn segments of 1 nm (inverse Langevin)
    u = np.linspace(1e-4, 40, 4000); L = 1 / np.tanh(u) - 1 / u        # x/(N b) = L(f b / kT)
    for T, c in [(280, style.BLUE), (350, style.PINK)]:
        f = u * KB * T / 1e-9 * 1e12                                     # pN
        b.plot(L * 100, f, color=c)
        xl = np.interp(12.5, f, L) * 100
        b.text(xl + (-2 if T == 350 else 2), 12.5, f"{T} K", color=c, fontsize=9, weight="semibold", ha="right" if T == 350 else "left", va="center")
    xg = np.linspace(0, 55, 50)
    b.plot(xg, 3 * KB * 300 * xg * 1e-9 / (100 * 1e-18) * 1e12, color=style.INK3, lw=1.2, ls=(0, (4, 3)))
    b.text(60, 4.3, "dashed: Gaussian chain at 300 K,\n$f = 3k_BT\\,x/Nb^2$", fontsize=8.5, color=style.INK3, ha="left", va="center")
    x0 = 50; f280 = np.interp(0.5, L, u) * KB * 280 / 1e-9 * 1e12; f350 = np.interp(0.5, L, u) * KB * 350 / 1e-9 * 1e12
    b.annotate("", (x0, f350), (x0, f280), arrowprops=dict(arrowstyle="-|>", color=style.INK2, lw=1.1, shrinkA=0, shrinkB=1))
    b.text(x0 - 3, f350 + 1.0, "+25 %", ha="right", fontsize=8.5, color=style.INK2, va="center")
    b.set_xlim(0, 100); b.set_ylim(0, 14)
    b.set_xlabel("extension x (nm), contour length 100 nm"); b.set_ylabel("tension f (pN)")
    style.save(fig, SLUG, "rubber-chain")


def cover():
    def draw(ax):
        x = np.linspace(0, 4, 400)
        # a deep, narrow well (left) and a broad, shallow one (right)
        V = 2.55 - 1.75 * np.exp(-((x - 1.0) / 0.17) ** 2) - 1.05 * np.exp(-((x - 2.75) / 0.62) ** 2)
        ax.fill_between(x, 0, V, color=style.BLUE, lw=0, zorder=1)
        ax.plot(x, V, color=style.INK, lw=0, zorder=2)
        # many particles in the broad well (two rows), one in the narrow well
        for xx in np.linspace(2.05, 3.45, 6):
            ax.add_patch(Circle((xx, np.interp(xx, x, V) + 0.13), 0.12, color=style.GOLD, zorder=3))
        for xx in np.linspace(2.4, 3.1, 3):
            ax.add_patch(Circle((xx, np.interp(xx, x, V) + 0.38), 0.12, color=style.GOLD, zorder=3, alpha=0.8))
        ax.add_patch(Circle((1.0, np.interp(1.0, x, V) + 0.13), 0.12, color=style.ORANGE, zorder=3))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    ensemble_family(); thermal_wavelength_plot(); rubber(); cover()
