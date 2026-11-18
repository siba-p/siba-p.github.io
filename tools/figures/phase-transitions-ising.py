"""Figures for content/learn/phase-transitions-ising.md.  Run: python3 tools/figures/phase-transitions-ising.py
Units: J = k_B = 1 for the Ising figures; reduced units (P_c, v_c, T_c) for van der Waals."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy.special import ellipk
from scipy.optimize import brentq, fsolve
import style
from matplotlib.patches import Rectangle, Circle, FancyArrowPatch
plt = style.setup()
SLUG = "phase-transitions-ising"
TC = 2 / np.log(1 + np.sqrt(2))
UP, DOWN = style.BLUE, style.ORANGE


def config6():
    """A fixed 6 x 6 pattern with one down-spin domain, shared by the three panels."""
    s = np.ones((6, 6), int)
    for i, j in [(1, 1), (1, 2), (2, 1), (2, 2), (2, 3), (3, 2), (3, 3), (4, 3), (0, 5), (5, 0), (4, 5)]:
        s[i, j] = -1
    return s


def three_systems():
    s = config6()
    fig, axs = plt.subplots(1, 3, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.12))
    titles = ["Magnet", "Lattice gas", "Binary alloy"]
    notes = [["up or down spin", "J: exchange coupling", "h: magnetic field"],
             ["site occupied or empty", "J: attraction between molecules", "h: set by the chemical potential"],
             ["atom A or atom B", "J > 0: like neighbours, separation", "J < 0: unlike neighbours, ordering"]]
    for k, ax in enumerate(axs):
        ax.set_xlim(-0.6, 5.6); ax.set_ylim(-3.3, 5.9); ax.set_aspect("equal"); ax.axis("off")
        for i in range(6):
            ax.plot([-0.4, 5.4], [i, i], color=style.LINE, lw=0.8, zorder=0); ax.plot([i, i], [-0.4, 5.4], color=style.LINE, lw=0.8, zorder=0)
        for i in range(6):
            for j in range(6):
                x, y, v = j, 5 - i, s[i, j]
                if k == 0:
                    dy = 0.34 * v
                    ax.add_patch(FancyArrowPatch((x, y - dy), (x, y + dy), arrowstyle="-|>", mutation_scale=9, lw=1.8, color=UP if v > 0 else DOWN, zorder=2))
                elif k == 1:
                    if v < 0: ax.add_patch(Circle((x, y), 0.36, color=style.TEAL, zorder=2))
                    else: ax.add_patch(Circle((x, y), 0.08, color=style.INK3, zorder=2))
                else:
                    ax.add_patch(Circle((x, y), 0.36, color=style.GOLD if v > 0 else style.VIOLET, zorder=2))
        ax.text(2.5, 5.75, titles[k], ha="center", va="center", fontsize=10.5, weight="semibold", color=style.INK)
        for n, line in enumerate(notes[k]):
            ax.text(2.5, -1.05 - 0.72 * n, line, ha="center", va="center", fontsize=8.5, color=style.INK2 if n == 0 else style.INK3)
    style.save(fig, SLUG, "three-systems")


def domain_walls():
    fig = plt.figure(figsize=(7.2, 3.6))
    a = fig.add_axes([0.0, 0.62, 1.0, 0.36]); b = fig.add_axes([0.0, 0.0, 0.42, 0.6]); c = fig.add_axes([0.45, 0.0, 0.55, 0.6])
    # 1D chain with one wall
    a.set_xlim(-0.5, 20.5); a.set_ylim(-1.6, 1.3); a.set_aspect("equal"); a.axis("off")
    n = 16
    for i in range(n):
        v = 1 if i < 9 else -1
        a.add_patch(Rectangle((i + 0.08, -0.42), 0.84, 0.84, color=UP if v > 0 else DOWN))
    a.plot([9, 9], [-0.75, 0.75], color=style.PINK, lw=2.4)
    a.text(9, -1.15, "one broken bond: energy +2J", ha="center", fontsize=8.5, color=style.PINK)
    a.text(16.4, 0.15, "1D chain: the wall can sit\nin any of N − 1 bonds,\nso ΔF = 2J − kT ln N < 0", fontsize=8.5, color=style.INK2, va="center")
    # 2D lattice with an island
    b.set_xlim(-0.3, 10.3); b.set_ylim(-0.3, 8.3); b.set_aspect("equal"); b.axis("off")
    L1, L2 = 10, 8
    s = np.ones((L2, L1), int)
    island = [(2, 3), (2, 4), (3, 2), (3, 3), (3, 4), (3, 5), (4, 3), (4, 4), (4, 5), (4, 6), (5, 4), (5, 5)]
    for (i, j) in island: s[i, j] = -1
    for i in range(L2):
        for j in range(L1):
            b.add_patch(Rectangle((j + 0.06, i + 0.06), 0.88, 0.88, color=UP if s[i, j] > 0 else DOWN))
    per = 0
    for i in range(L2):
        for j in range(L1):
            if j + 1 < L1 and s[i, j] != s[i, j + 1]: b.plot([j + 1, j + 1], [i, i + 1], color=style.PINK, lw=2.4, solid_capstyle="round"); per += 1
            if i + 1 < L2 and s[i, j] != s[i + 1, j]: b.plot([j, j + 1], [i + 1, i + 1], color=style.PINK, lw=2.4, solid_capstyle="round"); per += 1
    c.set_xlim(0, 10); c.set_ylim(0, 6); c.axis("off")
    c.text(0.2, 4.6, f"2D: an island bounded by a wall of length L\n(here L = {per}) costs energy 2JL = {2 * per}J", fontsize=8.5, color=style.INK2, va="center")
    c.text(0.2, 2.9, "a closed wall has at most 3 choices per step,\nso about $3^L$ walls of length L: entropy ≈ $k_B L\\ln 3$", fontsize=8.5, color=style.INK2, va="center")
    c.text(0.2, 1.2, "ΔF ≈ (2J − $k_B$T ln 3) L > 0 when $k_B$T < 2J/ln 3 = 1.82J:\nlarge islands are suppressed and order survives", fontsize=8.5, color=style.INK, va="center")
    style.save(fig, SLUG, "domain-walls")
    return per


def onsager_u(T):
    K = 1 / T; k = 2 * np.sinh(2 * K) / np.cosh(2 * K) ** 2
    return -1 / np.tanh(2 * K) * (1 + 2 / np.pi * (2 * np.tanh(2 * K) ** 2 - 1) * ellipk(k * k))


def mf_m(T, z=4):
    if T >= z: return 0.0
    return brentq(lambda m: m - np.tanh(z * m / T), 1e-9, 1.0)


def exact_vs_meanfield():
    T = np.linspace(0.05, 5.5, 3000)
    m_ex = np.where(T < TC, np.abs(1 - np.sinh(2 / np.clip(T, 1e-9, None)) ** -4.0) ** 0.125, 0.0)
    m_mf = np.array([mf_m(t) for t in T])
    u_ex = onsager_u(T); c_ex = np.gradient(u_ex, T)
    # C = d(-2 m^2)/dT = -4 m dm/dT, with dm/dT from differentiating m = tanh(4m/T)
    sech2 = 1 - m_mf ** 2
    dmdT = np.where(m_mf > 0, -sech2 * 4 * m_mf / T ** 2 / np.where(m_mf > 0, 1 - sech2 * 4 / T, 1), 0.0)
    c_mf = -4 * m_mf * dmdT
    fig, (a, b) = plt.subplots(1, 2, figsize=(7.2, 3.2), gridspec_kw=dict(wspace=0.3))
    a.plot(T, m_ex, color=style.BLUE); a.plot(T, m_mf, color=style.ORANGE)
    a.text(1.0, 0.3, "exact\n(Onsager, Yang)\n$k_BT_c$ = 2.269 J", color=style.BLUE, fontsize=8.5, ha="center", va="center")
    a.text(4.15, 0.45, "mean field,\nz = 4\n$k_BT_c$ = 4 J", color=style.ORANGE, fontsize=8.5, ha="left", va="center")
    a.set_xlim(0, 5.5); a.set_ylim(0, 1.08); a.set_xlabel("$k_BT/J$"); a.set_ylabel("spontaneous magnetisation m")
    b.plot(T[T < TC - 0.002], c_ex[T < TC - 0.002], color=style.BLUE); b.plot(T[T > TC + 0.002], c_ex[T > TC + 0.002], color=style.BLUE)
    b.plot(T[T < 4], c_mf[T < 4], color=style.ORANGE); b.plot(T[T > 4], c_mf[T > 4], color=style.ORANGE)
    b.plot([4, 4], [0, c_mf[T < 4][-1]], color=style.ORANGE, lw=1, ls=(0, (2, 2)))
    b.text(TC + 0.15, 2.6, "logarithmic\ndivergence", color=style.BLUE, fontsize=8.5, va="center")
    b.text(4.1, 1.5, "jump of\n1.5 $k_B$", color=style.ORANGE, fontsize=8.5, va="center")
    b.set_xlim(0, 5.5); b.set_ylim(0, 3.2); b.set_xlabel("$k_BT/J$"); b.set_ylabel("heat capacity per spin ($k_B$)")
    style.save(fig, SLUG, "exact-vs-meanfield")
    return c_mf[T < 4][-1]


def vdw_coexistence(t):
    """Reduced vdW liquid and gas densities at reduced temperature t < 1 by Maxwell's equal-area rule."""
    def roots(p):   # volumes where P(v) = p: 3p v^3 - (p + 8t) v^2 + 9v - 3 = 0
        r = np.roots([3 * p, -(p + 8 * t), 9, -3]); r = np.sort(r[np.abs(r.imag) < 1e-9].real)
        return r[0], r[-1]
    dP = lambda v: -24 * t / (3 * v - 1) ** 2 + 6 / v ** 3
    v1 = brentq(dP, 1 / 3 + 1e-9, 1.0); v2 = brentq(dP, 1.0, 1e3)
    P = lambda v: 8 * t / (3 * v - 1) - 3 / v ** 2
    def g(p):
        vl, vg = roots(p)
        return 8 * t / 3 * np.log((3 * vg - 1) / (3 * vl - 1)) + 3 / vg - 3 / vl - p * (vg - vl)
    lo, hi = max(P(v1), 1e-12) + 1e-12, P(v2) - 1e-12
    p = brentq(g, lo, hi, xtol=1e-14)
    vl, vg = roots(p)
    return 1 / vl, 1 / vg


def coexistence():
    ts = np.concatenate([np.linspace(0.5, 0.98, 60), 1 - np.logspace(-2, -5, 30)])
    vdw = np.array([vdw_coexistence(t) for t in ts])
    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    ax.plot(np.r_[vdw[:, 1], 1, vdw[::-1, 0]], np.r_[ts, 1, ts[::-1]], color=style.ORANGE)
    tg = np.linspace(0.5, 1, 400); d = 1 - tg
    ax.plot(np.r_[np.clip(1 + 0.75 * d - 1.75 * d ** (1 / 3), 0, None), (1 + 0.75 * d + 1.75 * d ** (1 / 3))[::-1]], np.r_[tg, tg[::-1]], color=style.BLUE)
    ax.text(2.72, 0.62, "real simple fluids\n(Guggenheim's fit to Ne, Ar, Kr, Xe,\nN₂, O₂, CO, CH₄): $\\beta \\approx 1/3$", color=style.BLUE, fontsize=8.5, ha="left", va="center")
    i = np.argmin(np.abs(ts - 0.85))
    ax.annotate("van der Waals\n(mean field): $\\beta = 1/2$", (vdw[i, 0], ts[i]), xytext=(2.72, 0.9), color=style.ORANGE, fontsize=8.5, ha="left", va="center",
                arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.8, shrinkA=2, shrinkB=2))
    ax.plot(1, 1, "o", color=style.INK, ms=5)
    ax.annotate("critical point", (1, 1), xytext=(14, 6), textcoords="offset points", fontsize=8.5, color=style.INK2)
    ax.text(0.5, 0.75, "gas + liquid\ncoexist", fontsize=9, color=style.INK3, ha="center", va="center") if False else None
    ax.text(1.0, 0.7, "two phases\ncoexist", fontsize=9, color=style.INK3, ha="center", va="center")
    ax.set_xlim(0, 3.6); ax.set_ylim(0.5, 1.06)
    ax.set_xlabel("reduced density $\\rho/\\rho_c$"); ax.set_ylabel("reduced temperature $T/T_c$")
    style.save(fig, SLUG, "coexistence-curves")
    return vdw


def cover():
    rng = np.random.default_rng(20)
    H, W = 30, 40
    s = rng.choice([-1, 1], size=(H, W))
    ii, jj = np.indices((H, W)); masks = [((ii + jj) % 2) == p for p in (0, 1)]
    T = 2.32
    for sweep in range(400):
        for m in masks:
            nb = np.roll(s, 1, 0) + np.roll(s, -1, 0) + np.roll(s, 1, 1) + np.roll(s, -1, 1)
            dE = 2 * s * nb
            flip = m & (rng.random((H, W)) < np.exp(-dE / T))
            s[flip] *= -1
    from matplotlib.colors import ListedColormap
    def draw(ax):
        ax.imshow(s, cmap=ListedColormap([DOWN, UP]), extent=(0, 4, 0, 3), interpolation="nearest", zorder=1)
    style.cover(SLUG, draw)


if __name__ == "__main__":
    three_systems()
    per = domain_walls(); print("island perimeter", per)
    print("mean-field C jump", exact_vs_meanfield())
    v = coexistence(); print("vdW at t=0.55:", vdw_coexistence(0.55), "t=0.9:", vdw_coexistence(0.9))
    cover()
