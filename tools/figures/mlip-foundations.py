"""Static figures for content/learn/mlip-foundations.md.

Run from the repository root:  python3 tools/figures/mlip-foundations.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import Circle, FancyBboxPatch, FancyArrowPatch, Arc
import style
plt = style.setup()
SLUG = "mlip-foundations"


def _box(ax, x, y, w, h, color, title, body=None):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.02,rounding_size=0.12",
                                fc=style.TINT[color], ec=color, lw=1.2))
    ax.text(x, y + h / 2 - 0.12, title, ha="center", va="top", fontsize=9, fontweight="semibold", color=style.INK)
    if body:
        ax.text(x, y - h / 2 + 0.12, body, ha="center", va="bottom", fontsize=8, color=style.INK2, linespacing=1.3)


def _arrow(ax, p, q, color=style.INK3, rad=0.0, ls="-"):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=12, color=color, lw=1.2,
                                 connectionstyle=f"arc3,rad={rad}", linestyle=ls))


def recipe():
    """The general recipe: describe, regress, sum, differentiate, fit."""
    fig, ax = plt.subplots(figsize=(7.2, 4.0))
    ax.set_xlim(0, 12); ax.set_ylim(0, 6.6); ax.set_aspect("equal"); ax.axis("off")
    rng = np.random.default_rng(4)
    pts = rng.uniform([0.15, 2.6], [2.45, 5.9], size=(26, 2))
    c0 = np.array([1.3, 4.25])
    ax.add_patch(Circle(c0, 0.95, fc=style.TINT[style.TEAL], ec=style.TEAL, lw=1.2, ls=(0, (3, 2))))
    for p in pts:
        inside = np.linalg.norm(p - c0) < 0.95
        ax.add_patch(Circle(p, 0.09, fc=style.BLUE if inside else style.LINE, ec="white", lw=0.6, zorder=2))
    ax.add_patch(Circle(c0, 0.12, fc=style.ORANGE, ec="white", lw=0.8, zorder=3))
    ax.text(1.3, 6.45, "structure", ha="center", va="top", fontsize=9, fontweight="semibold", color=style.INK)
    ax.text(1.3, 2.45, "atom i and its\nneighbours within rc", ha="center", va="top", fontsize=8, color=style.INK2)

    _box(ax, 4.0, 4.25, 2.3, 2.0, style.TEAL, "describe", "smooth, invariant\nto rotation and\nrelabelling")
    _box(ax, 6.75, 4.25, 2.3, 2.0, style.VIOLET, "regress", "linear, kernel or\nneural network:\natomic energy εᵢ")
    _box(ax, 9.55, 4.25, 2.0, 2.0, style.GOLD, "sum", "E = Σᵢ εᵢ\nextensive")
    _box(ax, 9.55, 1.0, 3.6, 1.15, style.ORANGE, "differentiate", "forces Fᵢ = −∂E/∂rᵢ, stress σ")
    _box(ax, 4.6, 1.0, 3.4, 1.15, style.PINK, "fit", "loss against DFT E, F, σ")
    _arrow(ax, (2.35, 4.25), (2.8, 4.25))
    _arrow(ax, (5.2, 4.25), (5.55, 4.25))
    _arrow(ax, (7.95, 4.25), (8.5, 4.25))
    _arrow(ax, (9.55, 3.2), (9.55, 1.62))
    _arrow(ax, (7.7, 1.0), (6.35, 1.0))
    _arrow(ax, (4.6, 1.62), (6.4, 3.2), color=style.PINK, rad=-0.3, ls=(0, (3, 2)))
    ax.text(6.55, 2.35, "update parameters", fontsize=8, color=style.PINK, ha="left", va="center")
    ax.text(9.75, 2.45, "automatic\ndifferentiation", fontsize=8, color=style.INK2, ha="left", va="center")
    style.save(fig, SLUG, "recipe")


def _lj_md(mode, n=8, rho=0.7, T=1.0, dt=0.004, steps=4000, rc=2.0, ron=1.5):
    """2D Lennard-Jones fluid, velocity Verlet, reduced units. mode = 'hard' or 'smooth'.
    Returns total energy per particle at every step."""
    rng = np.random.default_rng(1)
    N = n * n; L = np.sqrt(N / rho)
    g = (np.arange(n) + 0.5) * L / n
    x = np.array(np.meshgrid(g, g)).reshape(2, -1).T.copy()
    v = rng.normal(0, np.sqrt(T), (N, 2)); v -= v.mean(0)

    def energy_forces(x):
        d = x[:, None] - x[None]; d -= L * np.round(d / L)
        r2 = (d ** 2).sum(-1); np.fill_diagonal(r2, 1e9); r = np.sqrt(r2)
        ir6 = 1 / r2 ** 3
        V = 4 * (ir6 ** 2 - ir6); dV = (-48 * ir6 ** 2 + 24 * ir6) / r
        inside = r < rc
        if mode == "hard":
            S, dS = inside * 1.0, 0 * r
        else:
            t = np.clip((r - ron) / (rc - ron), 0, 1)
            S = np.where(r < ron, 1, 0.5 * (np.cos(np.pi * t) + 1)) * inside
            dS = np.where((r > ron) & inside, -0.5 * np.pi / (rc - ron) * np.sin(np.pi * t), 0)
        U = 0.5 * (V * S).sum()
        F = -((dV * S + V * dS) / r)[:, :, None] * d
        return U, F.sum(1)

    U, F = energy_forces(x); E = []
    for _ in range(steps):
        v += 0.5 * dt * F; x += dt * v; x %= L
        U, F = energy_forces(x); v += 0.5 * dt * F
        E.append((U + 0.5 * (v ** 2).sum()) / N)
    return np.array(E), dt


def cutoff():
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.2), gridspec_kw=dict(wspace=0.36))
    ax = axs[0]
    r = np.linspace(1.3, 2.3, 600)
    V = 4 * (r ** -12 - r ** -6)
    t = np.clip((r - 1.5) / 0.5, 0, 1)
    S = np.where(r < 1.5, 1, 0.5 * (np.cos(np.pi * t) + 1)) * (r < 2.0)
    hard = np.where(r < 2.0, V, np.nan)
    ax.plot(r, hard, color=style.PINK)
    ax.plot([2.0, 2.0], [V[np.searchsorted(r, 2.0) - 1], 0], color=style.PINK, lw=1.2, ls=(0, (2, 2)))
    ax.plot(r[r >= 2.0], 0 * r[r >= 2.0], color=style.PINK)
    ax.plot(r, V * S, color=style.TEAL)
    ax.axvline(2.0, color=style.LINE, lw=0.8, zorder=0)
    ax.text(1.62, -0.33, "hard cut: energy\njumps by 0.06 ε", color=style.PINK, fontsize=8)
    ax.text(1.33, -0.05, "smooth switch\nfrom 1.5σ to 2σ", color=style.TEAL, fontsize=8)
    ax.text(2.02, -0.4, "rc", color=style.INK3, fontsize=8)
    ax.set_xlim(1.3, 2.3); ax.set_ylim(-0.45, 0.02)
    ax.set_xlabel("pair distance r (σ)"); ax.set_ylabel("pair energy (ε)")
    ax.set_title("One pair near the cutoff", fontsize=10)

    ax = axs[1]
    for mode, col, lab in [("hard", style.PINK, "hard cut"), ("smooth", style.TEAL, "smooth switch")]:
        E, dt = _lj_md(mode)
        tt = np.arange(1, len(E) + 1) * dt
        ax.plot(tt, (E - E[0]) * 1000, color=col, lw=1.4)
    ax.text(8, 43, "hard cut", color=style.PINK, fontsize=8, ha="center")
    ax.text(9.5, 3.5, "smooth switch", color=style.TEAL, fontsize=8)
    ax.axhline(0, color=style.LINE, lw=0.8, zorder=0)
    ax.set_xlim(0, 16); ax.set_ylim(-3, 47)
    ax.set_xlabel("time (reduced units)"); ax.set_ylabel("energy change (10⁻³ ε per atom)")
    ax.set_title("Total energy in NVE dynamics", fontsize=10)
    style.save(fig, SLUG, "cutoff")


def _coeffs(theta, M=8):
    return np.array([np.exp(-1j * m * theta).sum() for m in range(M + 1)])


def homometric():
    A = np.array([0, 1, 2, 5]) * np.pi / 4
    B = np.array([0, 1, 3, 4]) * np.pi / 4
    fig = plt.figure(figsize=(7.2, 3.0))
    gs = fig.add_gridspec(1, 3, width_ratios=[1.6, 1, 1], wspace=0.42)
    ax = fig.add_subplot(gs[0]); ax.set_aspect("equal"); ax.axis("off")
    for x0, th, col, name in [(-1.25, A, style.BLUE, "A"), (1.25, B, style.ORANGE, "B")]:
        ax.add_patch(Circle((x0, 0), 1.0, fill=False, ec=style.LINE, lw=1))
        for k in range(8):
            a = k * np.pi / 4
            ax.plot(x0 + np.cos(a), np.sin(a), "o", ms=2.5, color=style.LINE)
        for a in th:
            ax.plot([x0, x0 + np.cos(a)], [0, np.sin(a)], color=style.INK3, lw=0.8)
            ax.add_patch(Circle((x0 + np.cos(a), np.sin(a)), 0.15, fc=col, ec="white", lw=0.8, zorder=3))
        ax.add_patch(Circle((x0, 0), 0.13, fc=style.INK2, ec="white", lw=0.8, zorder=3))
        ax.text(x0, -1.45, name, ha="center", va="top", fontsize=10, fontweight="semibold", color=col)
    ax.set_xlim(-2.4, 2.4); ax.set_ylim(-1.9, 1.3)
    ax.set_title("Two environments", fontsize=10)

    ca, cb = _coeffs(A), _coeffs(B)
    m = np.arange(1, 8)
    ax = fig.add_subplot(gs[1])
    ax.bar(m - 0.2, np.abs(ca[1:8]) ** 2, width=0.38, color=style.BLUE)
    ax.bar(m + 0.2, np.abs(cb[1:8]) ** 2, width=0.38, color=style.ORANGE)
    ax.set_xticks(m); ax.set_xlabel("m"); ax.set_ylabel("|cₘ|²")
    ax.set_ylim(0, 5); ax.set_title("Power spectrum", fontsize=10)
    ax.text(4, 4.4, "identical", ha="center", fontsize=8, color=style.INK2)

    ax = fig.add_subplot(gs[2])
    pairs = [(1, 1), (1, 2), (2, 3), (3, 3)]
    ba = [np.real(ca[p] * ca[q] * np.conj(ca[p + q])) for p, q in pairs]
    bb = [np.real(cb[p] * cb[q] * np.conj(cb[p + q])) for p, q in pairs]
    xx = np.arange(len(pairs))
    ax.bar(xx - 0.2, ba, width=0.38, color=style.BLUE)
    ax.bar(xx + 0.2, bb, width=0.38, color=style.ORANGE)
    ax.axhline(0, color=style.INK3, lw=0.8)
    ax.set_xticks(xx); ax.set_xticklabels([f"{p},{q}" for p, q in pairs], fontsize=8)
    ax.set_xlabel("(m₁, m₂)"); ax.set_ylabel("bispectrum")
    ax.set_ylim(-5.8, 5.2); ax.set_title("Bispectrum", fontsize=10)
    ax.text(1.5, -5.6, "opposite signs", ha="center", fontsize=8, color=style.INK2)
    style.save(fig, SLUG, "homometric")


def cover():
    def draw(ax):
        c = (2.0, 1.5)
        ax.add_patch(Circle(c, 1.15, fc="white", ec=style.TEAL, lw=4, ls=(0, (4, 2.5))))
        rng = np.random.default_rng(7)
        for a, r in zip(np.linspace(0, 2 * np.pi, 7)[:-1] + 0.3, [0.7, 0.75, 0.68, 0.72, 0.78, 0.7]):
            p = (c[0] + r * np.cos(a), c[1] + r * np.sin(a))
            ax.plot([c[0], p[0]], [c[1], p[1]], color=style.INK3, lw=2.5)
            ax.add_patch(Circle(p, 0.17, fc=style.BLUE, ec="white", lw=1.5, zorder=3))
        for p in [(0.35, 0.5), (0.45, 2.55), (3.6, 0.45), (3.55, 2.6), (0.3, 1.5), (3.7, 1.55)]:
            ax.add_patch(Circle(p, 0.15, fc=style.LINE, ec="none"))
        ax.add_patch(Circle(c, 0.24, fc=style.ORANGE, ec="white", lw=2, zorder=4))
        ax.add_patch(Arc(c, 2.85, 2.85, theta1=20, theta2=140, color=style.VIOLET, lw=5))
        a = np.deg2rad(20); tip = (c[0] + 1.425 * np.cos(a), c[1] + 1.425 * np.sin(a))
        ax.add_patch(FancyArrowPatch((tip[0] + 0.05, tip[1] + 0.12), (tip[0] + 0.12, tip[1] - 0.12),
                                     arrowstyle="-|>", mutation_scale=28, color=style.VIOLET, lw=0))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    recipe(); cutoff(); homometric(); cover()
