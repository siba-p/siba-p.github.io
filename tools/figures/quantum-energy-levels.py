"""Static figures for content/learn/quantum-energy-levels.md.  Run: python3 tools/figures/quantum-energy-levels.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyArrowPatch, Polygon
import style
plt = style.setup()
SLUG = "quantum-energy-levels"

h, kB, u, eV = 6.62607015e-34, 1.380649e-23, 1.66053906660e-27, 1.602176634e-19
hbar, c, NA = h / (2 * np.pi), 2.99792458e10, 6.02214076e23
me = 9.1093837015e-31


def kie():
    """Kinetic isotope effect: the same barrier, different zero-point levels."""
    s = np.linspace(-1.95, 0.6, 400)
    V = 50 * (s**2 - 1) ** 2 - 12 * s                 # kJ/mol, an illustrative reaction profile
    fig, ax = plt.subplots(figsize=(7.2, 3.9))
    ax.plot(s, V, color=style.INK2, lw=2.2)
    i0 = np.argmin(np.where(s < 0, V, 1e9)); smin, Vmin = s[i0], V[i0]
    its = np.argmax(np.where(np.abs(s) < 0.6, V, -1e9)); sts, Vts = s[its], V[its]
    print(f"  barrier of the illustrative profile: {Vts - Vmin:.1f} kJ/mol")
    zh = 1500 * h * c * NA / 1000; zd = 1100 * h * c * NA / 1000          # zero-point energies, kJ/mol
    for z, col in [(zh, style.ORANGE), (zd, style.BLUE)]:
        y = Vmin + z
        inside = s[(V <= y) & (s < sts)]                     # the well between its walls at this energy
        ax.plot([inside.min(), inside.max()], [y, y], color=col, lw=2.4, solid_capstyle="butt")
    ax.text(smin - 0.4, Vmin + zh, f"C–H zero-point level, {zh:.1f} kJ/mol", color=style.ORANGE, fontsize=8.5, ha="right", va="center")
    ax.text(smin - 0.4, Vmin + zd, f"C–D zero-point level, {zd:.1f} kJ/mol", color=style.BLUE, fontsize=8.5, ha="right", va="center")
    ax.plot([smin - 0.25, sts + 0.35], [Vts, Vts], color=style.INK3, lw=1.0, ls="--")
    ax.text(sts + 0.12, Vts + 2.0, "transition state: the stretch has become the\nreaction path and holds no zero-point energy",
            fontsize=8.5, color=style.INK2, va="bottom")
    for z, col, x in [(zh, style.ORANGE, smin + 0.1), (zd, style.BLUE, smin - 0.1)]:
        ax.add_patch(FancyArrowPatch((x, Vmin + z), (x, Vts), arrowstyle="-|>", mutation_scale=11, color=col, lw=1.6, shrinkA=0, shrinkB=0))
    ax.text(0.72, 18, "barrier for D (blue arrow) is higher than\nthe barrier for H (orange) by ΔZPE = 4.8 kJ/mol", fontsize=8.5, color=style.INK2)
    ax.text(0.72, 9, r"$k_\mathrm{H}/k_\mathrm{D}$ ≈ exp(400 / 208.5) ≈ 6.8 at 300 K", fontsize=9.5, color=style.INK, fontweight="semibold")
    ax.set_xlim(-3.45, 2.95); ax.set_ylim(Vmin - 4, Vts + 14)
    ax.set_xlabel("reaction coordinate (the C–H stretch turns into the reaction path)")
    ax.set_ylabel("energy (kJ/mol)")
    ax.set_yticks([Vmin, Vmin + 20, Vmin + 40]); ax.set_yticklabels(["0", "20", "40"])
    ax.set_xticks([])
    ax.spines["bottom"].set_bounds(-3.45, 2.95)
    ax.set_title("One potential, two isotopes: the zero-point energy sets the barrier")
    style.save(fig, SLUG, "kie")


def diamond():
    """Einstein's 1907 heat capacity of diamond with one frequency, hbar*omega/kB = 1300 K."""
    R, th = 8.314462618, 1300.0
    T = np.linspace(5, 2000, 800)
    x = th / T
    C = 3 * R * x**2 * np.exp(x) / np.expm1(x) ** 2
    fig, ax = plt.subplots(figsize=style.WIDE)
    ax.plot(T, C, color=style.VIOLET)
    ax.axhline(3 * R, color=style.TEAL, lw=1.5, ls="--")
    ax.text(1990, 3 * R + 0.8, "classical: Dulong–Petit, 3R = 24.9 J mol⁻¹ K⁻¹", ha="right", color=style.TEAL, fontsize=9)
    x0 = th / 298.15; C0 = 3 * R * x0**2 * np.exp(x0) / np.expm1(x0) ** 2
    ax.plot([298.15], [C0], "o", color=style.VIOLET, ms=6)
    ax.plot([298.15], [6.1], "s", color=style.ORANGE, ms=5)
    ax.annotate(f"Einstein model at 298 K: {C0:.1f}", xy=(298, C0), xytext=(420, 3.0), color=style.VIOLET, fontsize=9,
                arrowprops=dict(arrowstyle="-", color=style.VIOLET, lw=0.8))
    ax.annotate("measured: about 6.1", xy=(298, 6.1), xytext=(470, 9.0), color=style.ORANGE, fontsize=9,
                arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.8))
    ax.text(1150, 15.0, "Einstein model of diamond,\none frequency with ħω/$k_\\mathrm{B}$ = 1300 K", color=style.VIOLET, fontsize=9)
    ax.set_xlim(0, 2000); ax.set_ylim(0, 28)
    ax.set_xlabel("temperature (K)"); ax.set_ylabel("molar heat capacity (J mol⁻¹ K⁻¹)")
    ax.set_title("Diamond at room temperature holds a quarter of its classical heat capacity")
    print(f"  diamond C(298 K) = {C0:.2f}")
    style.save(fig, SLUG, "diamond")


def modes():
    """Thermal energy and heat capacity of a harmonic mode at 300 K, as fractions of the classical value."""
    nu = np.logspace(0.7, np.log10(4200), 500)
    x = h * c * nu / (kB * 300)
    Eth = x / np.expm1(x)
    C = x**2 * np.exp(x) / np.expm1(x) ** 2
    fig, ax = plt.subplots(figsize=style.WIDE)
    ax.axhline(1, color=style.INK3, lw=1.0, ls="--")
    ax.text(5.5, 1.04, "classical MD gives every mode the full value", color=style.INK3, fontsize=8.5, va="bottom")
    ax.plot(nu, C, color=style.BLUE)
    ax.plot(nu, Eth, color=style.ORANGE)
    ax.text(330, 0.80, "heat capacity / $k_\\mathrm{B}$", color=style.BLUE, fontsize=9)
    ax.text(9, 0.45, "thermal energy above\nthe zero point / $k_\\mathrm{B}T$", color=style.ORANGE, fontsize=9)
    for name, w in [("lattice", 100), ("torsion", 200), ("C–C", 1000), ("C=O", 1700), ("C–H", 3000)]:
        xx = h * c * w / (kB * 300)
        e = xx / np.expm1(xx)
        ax.plot([w], [e], "o", color=style.ORANGE, ms=4.5)
        ax.plot([w, w], [-0.02, 0.06], color=style.INK2, lw=1.0)
        ax.text(w, -0.09, name, ha="center", va="top", fontsize=8.5, color=style.INK2)
    ax.set_xscale("log"); ax.set_xlim(5, 4200); ax.set_ylim(-0.2, 1.15)
    ax.set_xlabel("vibrational wavenumber (cm⁻¹)", labelpad=4)
    ax.set_ylabel("fraction of the classical value")
    ax.set_title("At 300 K, vibrations above about 1000 cm⁻¹ are frozen")
    style.save(fig, SLUG, "modes")


def tunnelling():
    """Tunnelling factor exp(-2 kappa a) through a barrier 0.2 eV high and 0.5 Å wide."""
    parts = [("electron", me, style.VIOLET), ("H", 1.00783 * u, style.ORANGE), ("D", 2.01410 * u, style.BLUE), ("C", 12.0 * u, style.TEAL)]
    fig, ax = plt.subplots(figsize=style.WIDE)
    for i, (name, m, col) in enumerate(parts):
        k = np.sqrt(2 * m * 0.2 * eV) / hbar
        T = np.exp(-2 * k * 0.5e-10)
        ax.barh(i, np.log10(T), color=col, height=0.6)
        mant, ex = f"{T:.1e}".split("e")
        sup = str(int(ex)).translate(str.maketrans("-0123456789", "⁻⁰¹²³⁴⁵⁶⁷⁸⁹"))
        ax.text(np.log10(T) - 0.3, i, f"{mant} × 10{sup}",
                va="center", ha="right", fontsize=9, color=style.INK2)
        print(f"  {name}: 2 kappa a = {2 * k * 0.5e-10:.2f}, factor {T:.2e}")
    ax.set_yticks(range(len(parts))); ax.set_yticklabels([p[0] for p in parts])
    ax.invert_yaxis()
    ax.set_xlim(-19, 0.5)
    ax.set_xticks([-15, -10, -5, 0]); ax.set_xticklabels(["10⁻¹⁵", "10⁻¹⁰", "10⁻⁵", "1"])
    ax.set_xlabel("tunnelling factor exp(−2κa), barrier 0.2 eV above the energy, 0.5 Å wide")
    ax.set_title("The same barrier is transparent to an electron and opaque to carbon")
    style.save(fig, SLUG, "tunnelling")


def cover():
    def draw(ax):
        x = np.linspace(0.35, 3.65, 300)
        V = 0.35 + 2.3 * ((x - 2.0) / 1.5) ** 2
        ax.fill_between(x, V, 3.2, color=style.TINT[style.BLUE], zorder=0)
        ax.plot(x, V, color=style.BLUE, lw=6, solid_capstyle="round")
        cols = [style.ORANGE, style.GOLD, style.TEAL, style.VIOLET, style.PINK]
        for n in range(5):
            E = 0.35 + 0.5 * (n + 0.5)
            a = 1.5 * np.sqrt((E - 0.35) / 2.3)
            ax.plot([2.0 - a, 2.0 + a], [E, E], color=cols[n], lw=5, solid_capstyle="round")
        E0 = 0.35 + 0.25; a0 = 1.5 * np.sqrt(0.25 / 2.3)
        xs = np.linspace(2.0 - 2.2 * a0, 2.0 + 2.2 * a0, 120)
        ax.fill_between(xs, E0, E0 + 0.32 * np.exp(-((xs - 2.0) / a0) ** 2 * 1.2), color=style.ORANGE, alpha=0.45, lw=0)
    style.cover(SLUG, draw, bg="white")


if __name__ == "__main__":
    kie(); diamond(); modes(); tunnelling(); cover()
