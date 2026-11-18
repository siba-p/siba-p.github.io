"""Static figures for content/learn/boltzmann-and-maxwell.md.  Run: python3 tools/figures/boltzmann-and-maxwell.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from math import lgamma
from matplotlib.patches import Rectangle, FancyBboxPatch, FancyArrowPatch, Circle
import style
plt = style.setup()
SLUG = "boltzmann-and-maxwell"

kB, u = 1.380649e-23, 1.66053906660e-27


def ln_omega(N, q):
    return lgamma(q + N) - lgamma(q + 1) - lgamma(N)


def reservoir():
    """Left: a small system exchanging energy with a big reservoir. Right: exact counting against the Boltzmann factor."""
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.5), gridspec_kw=dict(width_ratios=[1.1, 1], wspace=0.22))
    a1.set_xlim(0, 4); a1.set_ylim(0, 3.4); a1.set_aspect("equal"); a1.axis("off")
    a1.add_patch(FancyBboxPatch((0.05, 0.75), 3.9, 2.5, boxstyle="round,pad=0.02,rounding_size=0.15",
                                facecolor=style.TINT[style.TEAL], edgecolor=style.TEAL, lw=1.5))
    a1.add_patch(FancyBboxPatch((1.1, 1.05), 1.8, 1.1, boxstyle="round,pad=0.02,rounding_size=0.08",
                                facecolor=style.TINT[style.ORANGE], edgecolor=style.ORANGE, lw=1.8))
    a1.text(2.0, 1.6, "system in\nstate s, energy $E_s$", ha="center", va="center", fontsize=9, color=style.INK, linespacing=1.4)
    a1.text(2.0, 2.85, "reservoir, energy $E_\\mathrm{tot} - E_s$", ha="center", fontsize=9, color=style.TEAL)
    a1.add_patch(FancyArrowPatch((3.0, 1.6), (3.8, 1.6), arrowstyle="<|-|>", mutation_scale=10, color=style.INK3, lw=1.2))
    a1.add_patch(FancyArrowPatch((0.2, 1.6), (1.0, 1.6), arrowstyle="<|-|>", mutation_scale=10, color=style.INK3, lw=1.2))
    a1.text(3.4, 1.72, "energy", ha="center", fontsize=8.5, color=style.INK3)
    a1.text(2.0, 0.3, "$P(s) \\propto \\Omega_R(E_\\mathrm{tot} - E_s) \\propto e^{-E_s/k_\\mathrm{B}T}$", ha="center", fontsize=10, color=style.INK)
    a1.set_title("System and reservoir", fontsize=10.5)
    # exact: one oscillator plus a reservoir of N oscillators, q quanta in total
    N, q = 1000, 1000
    n = np.arange(0, 9)
    lw = np.array([ln_omega(N, q - k) for k in n])
    lw_all = np.array([ln_omega(N, q - k) for k in range(q + 1)])
    P = np.exp(lw - lw_all.max()) / np.exp(lw_all - lw_all.max()).sum()
    r = q / (q + N)
    a2.bar(n, P, width=0.6, color=style.ORANGE, label="exact count")
    nn = np.linspace(0, 8, 200)
    a2.plot(nn, (1 - r) * r**nn, color=style.BLUE, lw=1.6)
    a2.text(2.3, 0.33, f"Boltzmann factor $e^{{-n\\varepsilon/k_\\mathrm{{B}}T}}$\nwith $e^{{-\\varepsilon/k_\\mathrm{{B}}T}}$ = {q/(q+N-1):.4f}",
            color=style.BLUE, fontsize=9)
    a2.text(0.55, 0.48, "bars: exact count of reservoir microstates", color=style.ORANGE, fontsize=8.5)
    a2.set_xlabel("quanta n held by the small oscillator"); a2.set_ylabel("probability")
    a2.set_xlim(-0.6, 8.6); a2.set_ylim(0, 0.56)
    a2.set_title("1000 + 1 oscillators, 1000 quanta", fontsize=10.5)
    print("  P(n) exact:", np.round(P[:4], 4))
    style.save(fig, SLUG, "reservoir")


def speeds():
    """Maxwell-Boltzmann for N2 at 300 K as room x cost, and N2 against Ar with the tails above 1000 m/s."""
    T = 300.0
    v = np.linspace(0, 1600, 800)

    def f(v, m):
        a = m / (2 * np.pi * kB * T)
        return 4 * np.pi * a**1.5 * v**2 * np.exp(-m * v**2 / (2 * kB * T))

    mN, mA = 28.014 * u, 39.948 * u
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.6), gridspec_kw=dict(wspace=0.32))
    room = v**2 / (v**2).max()
    cost = np.exp(-mN * v**2 / (2 * kB * T))
    fN = f(v, mN)
    a1.plot(v, room, color=style.TEAL, lw=1.6, ls="--")
    a1.plot(v, cost, color=style.PINK, lw=1.6, ls="--")
    a1.plot(v, fN / fN.max(), color=style.BLUE, lw=2.4)
    a1.text(1080, 0.56, "room: $v^2$", color=style.TEAL, fontsize=9)
    a1.annotate("cost: $e^{-mv^2/2k_\\mathrm{B}T}$", xy=(560, np.exp(-(560 / np.sqrt(2 * kB * T / mN)) ** 2)), xytext=(1000, 0.2),
                color=style.PINK, fontsize=9, arrowprops=dict(arrowstyle="-", color=style.PINK, lw=0.8))
    vp, vm, vr = np.sqrt(2 * kB * T / mN), np.sqrt(8 * kB * T / (np.pi * mN)), np.sqrt(3 * kB * T / mN)
    for val, lab, dy in [(vp, "$v_\\mathrm{p}$", 0), (vm, "mean", 0), (vr, "$v_\\mathrm{rms}$", 0)]:
        a1.plot([val, val], [0, f(val, mN) / fN.max()], color=style.INK3, lw=0.9, ls=":")
    a1.text(740, 1.0, f"$v_\\mathrm{{p}}$ = {vp:.0f} m/s\nmean = {vm:.0f} m/s\n$v_\\mathrm{{rms}}$ = {vr:.0f} m/s", va="top",
            fontsize=8.5, color=style.INK2, linespacing=1.5)
    a1.text(25, 1.06, "product: N₂, 300 K", color=style.BLUE, fontsize=9)
    a1.set_xlim(0, 1600); a1.set_ylim(0, 1.13)
    a1.set_xlabel("speed v (m/s)"); a1.set_ylabel("relative value")
    a1.set_title("Room times cost", fontsize=10.5)
    fA = f(v, mA)
    for ff, col, name, m in [(fN, style.BLUE, "N₂", mN), (fA, style.ORANGE, "Ar", mA)]:
        a2.plot(v, ff * 1e3, color=col)
        tail = v >= 1000
        a2.fill_between(v[tail], 0, ff[tail] * 1e3, color=col, alpha=0.35, lw=0)
    # tail fractions by numerical integration on a fine grid
    vv = np.linspace(1000, 5000, 20001)
    tN, tA = np.trapezoid(f(vv, mN), vv), np.trapezoid(f(vv, mA), vv)
    a2.text(1080, 0.42, f"faster than 1000 m/s:\nN₂ {100 * tN:.2f} %, Ar {100 * tA:.2f} %", fontsize=8.5, color=style.INK2)
    a2.annotate("", xy=(1060, 0.08), xytext=(1150, 0.38), arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    a2.text(30, 2.45, "Ar, 40 u", color=style.ORANGE, fontsize=9)
    a2.text(640, 1.6, "N₂, 28 u", color=style.BLUE, fontsize=9)
    a2.set_xlim(0, 1600); a2.set_ylim(0, 2.6)
    a2.set_xlabel("speed v (m/s)"); a2.set_ylabel("f(v) (10⁻³ s/m)")
    a2.set_title("Two gases at 300 K", fontsize=10.5)
    print(f"  N2: vp {vp:.0f}, mean {vm:.0f}, rms {vr:.0f}; tails N2 {100*tN:.3f} %, Ar {100*tA:.3f} %")
    style.save(fig, SLUG, "speeds")


def twolevel():
    """A two-level system: populations and the Schottky heat capacity, all from Z = 1 + exp(-eps/kT)."""
    t = np.linspace(0.02, 3, 600)                                 # kT / eps
    x = 1 / t
    p1 = np.exp(-x) / (1 + np.exp(-x)); p0 = 1 - p1
    C = x**2 * np.exp(x) / (1 + np.exp(x)) ** 2
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.4), gridspec_kw=dict(wspace=0.32))
    a1.plot(t, p0, color=style.BLUE); a1.plot(t, p1, color=style.ORANGE)
    a1.axhline(0.5, color=style.INK3, lw=0.8, ls=":")
    a1.text(1.7, 0.72, "lower level", color=style.BLUE, fontsize=9)
    a1.text(1.7, 0.24, "upper level", color=style.ORANGE, fontsize=9)
    a1.text(0.1, 0.53, "both tend to 1/2, never beyond", color=style.INK3, fontsize=8.5)
    a1.set_xlim(0, 3); a1.set_ylim(0, 1.03)
    a1.set_xlabel("temperature $k_\\mathrm{B}T$ / ε"); a1.set_ylabel("population")
    a1.set_title("Populations", fontsize=10.5)
    a2.plot(t, C, color=style.VIOLET)
    i = np.argmax(C)
    a2.plot([t[i]], [C[i]], "o", color=style.VIOLET, ms=5)
    a2.annotate(f"peak {C[i]:.2f} $k_\\mathrm{{B}}$ at $k_\\mathrm{{B}}T$ = {t[i]:.2f} ε", xy=(t[i], C[i]), xytext=(0.9, 0.4),
                fontsize=9, color=style.VIOLET, arrowprops=dict(arrowstyle="-", color=style.VIOLET, lw=0.8))
    a2.text(1.35, 0.13, "falls as 1/T²: the upper\nlevel is already half full", color=style.INK2, fontsize=8.5)
    a2.set_xlim(0, 3); a2.set_ylim(0, 0.5)
    a2.set_xlabel("temperature $k_\\mathrm{B}T$ / ε"); a2.set_ylabel("heat capacity C / $k_\\mathrm{B}$")
    a2.set_title("Schottky heat capacity", fontsize=10.5)
    print(f"  Schottky peak C = {C[i]:.3f} kB at kT = {t[i]:.3f} eps")
    style.save(fig, SLUG, "twolevel")


def cover():
    def draw(ax):
        v = np.linspace(0, 4, 300)
        s = 1.05
        f = (v / s) ** 2 * np.exp(-(v / s) ** 2)
        y = 0.35 + 2.3 * f / f.max()
        ax.fill_between(v, 0.35, y, color=style.BLUE, lw=0)
        ax.plot(v, y, color=style.INK, lw=0)
        ax.add_patch(Rectangle((0, 0), 4, 0.35, color=style.TINT[style.BLUE]))
        for sp, yy in [(0.55, 0.75), (0.85, 1.55), (1.05, 2.15), (1.25, 1.1), (1.6, 1.75), (1.95, 0.95), (2.35, 0.7)]:
            L = 0.12 + 0.16 * sp
            ax.plot([sp - L, sp], [yy, yy], color="white", lw=3.5, alpha=0.7, solid_capstyle="round")
            ax.add_patch(Circle((sp, yy), 0.085, color=style.GOLD, zorder=4))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    reservoir(); speeds(); twolevel(); cover()
