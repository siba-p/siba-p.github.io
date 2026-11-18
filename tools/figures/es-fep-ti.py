"""Figures for content/learn/es-fep-ti.md (free-energy perturbation and thermodynamic integration)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Circle, Ellipse, Polygon, RegularPolygon
import style
plt = style.setup()
SLUG = "es-fep-ti"


def arrow(ax, p, q, color, lw=2.0, ms=13, ls="-", z=5):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=ms, color=color, lw=lw, linestyle=ls,
                                 shrinkA=0, shrinkB=0, zorder=z))


# ---------------------------------------------------------------- 1. thermodynamic cycle for relative binding
def ligand(ax, c, kind, s=0.32):
    ax.add_patch(RegularPolygon(c, 6, radius=s, orientation=0, fc=style.ORANGE, ec="white", lw=1.5, zorder=4))
    tip = np.array(c) + np.array([s * 1.55, 0])
    ax.plot([c[0] + s * 0.87, tip[0]], [c[1], c[1]], color=style.INK2, lw=2, zorder=3)
    if kind == 1:
        ax.add_patch(Circle(tip, 0.1, fc=style.INK3, ec="white", lw=1, zorder=4))       # -H, say
    else:
        ax.add_patch(Circle(tip + [0.06, 0], 0.17, fc=style.PINK, ec="white", lw=1.2, zorder=4))  # -Cl, say


def site(ax, c):
    x0, y0 = c
    pts = [(x0 - 1.0, y0 - 0.55), (x0 + 1.15, y0 - 0.55), (x0 + 1.15, y0 + 0.55), (x0 + 0.75, y0 + 0.55),
           (x0 + 0.75, y0 - 0.05), (x0 - 0.6, y0 - 0.05), (x0 - 0.6, y0 + 0.55), (x0 - 1.0, y0 + 0.55)]
    ax.add_patch(Polygon(pts, closed=True, fc=style.TINT[style.VIOLET], ec=style.VIOLET, lw=1.4, zorder=1,
                         joinstyle="round"))


def water(ax, c):
    ax.add_patch(FancyBboxPatch((c[0] - 1.0, c[1] - 0.55), 2.15, 1.1, boxstyle="round,pad=0.02,rounding_size=0.25",
                                fc=style.TINT[style.BLUE], ec=style.BLUE, lw=1.2, zorder=1))


def cycle():
    fig, ax = plt.subplots(figsize=(7.2, 4.3))
    ax.set_xlim(-0.6, 10.8); ax.set_ylim(-0.4, 6.0); ax.set_aspect("equal"); ax.axis("off")
    L, R, T, B = 1.2, 9.0, 4.7, 1.0
    for (x, y, kind, env) in [(L, T, 1, "w"), (R, T, 2, "w"), (L, B, 1, "s"), (R, B, 2, "s")]:
        (water if env == "w" else site)(ax, (x, y))
        ligand(ax, (x - 0.1, y + (0.0 if env == "w" else 0.22)), kind)
    ax.text(L, T + 0.75, "ligand 1 in water", ha="center", fontsize=9.5, color=style.INK)
    ax.text(R, T + 0.75, "ligand 2 in water", ha="center", fontsize=9.5, color=style.INK)
    ax.text(L, B - 0.85, "ligand 1 in the site", ha="center", fontsize=9.5, color=style.INK)
    ax.text(R, B - 0.85, "ligand 2 in the site", ha="center", fontsize=9.5, color=style.INK)
    # physical binding: vertical, hard
    for x, lab in [(L, "ΔG_bind(1)"), (R, "ΔG_bind(2)")]:
        arrow(ax, (x, T - 0.7), (x, B + 0.7), style.INK3, lw=1.6, ls=(0, (4, 3)))
        ax.text(x + (-0.2 if x == L else 0.2), (T + B) / 2, lab.replace("_bind", "") + "\nbinding:\nslow, hard",
                ha="right" if x == L else "left", va="center", fontsize=8.5, color=style.INK3)
    # alchemical: horizontal, computed
    arrow(ax, (L + 1.35, T), (R - 1.15, T), style.TEAL, lw=2.4)
    arrow(ax, (L + 1.35, B), (R - 1.15, B), style.TEAL, lw=2.4)
    ax.text((L + R) / 2 + 0.1, T + 0.2, "ΔG₁→₂ (water)", ha="center", fontsize=9.5, color=style.TEAL,
            fontweight="semibold")
    ax.text((L + R) / 2 + 0.1, B + 0.2, "ΔG₁→₂ (site)", ha="center", fontsize=9.5, color=style.TEAL,
            fontweight="semibold")
    ax.text((L + R) / 2 + 0.1, T - 0.3, "alchemical: H becomes Cl", ha="center", fontsize=8.5, color=style.TEAL,
            va="top")
    ax.text((L + R) / 2 + 0.1, (T + B) / 2 + 0.1, "around the closed cycle the changes sum to zero:",
            ha="center", fontsize=8.5, color=style.INK2)
    ax.text((L + R) / 2 + 0.1, (T + B) / 2 - 0.35, "ΔΔG = ΔG(2) − ΔG(1) = ΔG₁→₂(site) − ΔG₁→₂(water)",
            ha="center", fontsize=9, color=style.INK, fontweight="semibold")
    style.save(fig, SLUG, "cycle")


# ---------------------------------------------------------------- 2. TI integrand with and without soft core
RHO, ALPHA = 0.5, 0.5          # ideal-gas solvent density (per sigma^3); soft-core alpha; epsilon = kT, sigma = 1
R = np.linspace(1e-4, 6.0, 60001)


def ti_integrand(lam, soft):
    if soft:
        D = ALPHA * (1 - lam) + R ** 6
        u = lam / D ** 2
        du = 1 / D ** 2 + lam * 2 * ALPHA / D ** 3
    else:
        u = lam * R ** -12.0
        du = R ** -12.0
    with np.errstate(over="ignore"):
        f = du * np.exp(-u) * 4 * np.pi * R * R
    f[~np.isfinite(f)] = 0.0
    return RHO * np.trapezoid(f, R)


def softcore():
    from math import gamma, pi
    exact = RHO * 4 * pi * gamma(0.75) / 3
    lam = np.linspace(0.002, 1, 300)
    lin = np.array([ti_integrand(l, False) for l in lam])
    soft = np.array([ti_integrand(l, True) for l in lam])
    fig, ax = plt.subplots(figsize=style.WIDE)
    ax.fill_between(lam, 0, soft, color=style.TINT[style.TEAL], lw=0)
    ax.plot(lam, lin, color=style.PINK)
    ax.plot(lam, soft, color=style.TEAL)
    # quadrature
    xg, wg = np.polynomial.legendre.leggauss(5); lg = 0.5 * (xg + 1); wg = 0.5 * wg
    q_lin = sum(w * ti_integrand(l, False) for l, w in zip(lg, wg))
    q_soft = sum(w * ti_integrand(l, True) for l, w in zip(lg, wg))
    ax.plot(lg, [ti_integrand(l, True) for l in lg], "o", ms=6, color=style.TEAL, mec="white", mew=1.2, zorder=5)
    ax.plot(lg, [ti_integrand(l, False) for l in lg], "o", ms=6, color=style.PINK, mec="white", mew=1.2, zorder=5)
    ax.text(0.06, 13.5, r"linear coupling λ·u(r): diverges as $\lambda^{-3/4}$", color=style.PINK, fontsize=9,
            fontweight="semibold")
    ax.text(0.55, 4.6, "soft core: finite everywhere", color=style.TEAL, fontsize=9, fontweight="semibold")
    ax.text(0.98, 14.6, f"both areas = ΔF = {exact:.2f} kT\n5-point Gauss–Legendre:\nsoft core {q_soft:.2f} kT,"
            f" linear {q_lin:.2f} kT", ha="right", va="top", fontsize=9, color=style.INK2)
    ax.set_xlim(0, 1); ax.set_ylim(0, 15)
    ax.set_xlabel("coupling parameter λ")
    ax.set_ylabel("⟨∂U/∂λ⟩_λ  (kT)".replace("⟨∂U/∂λ⟩_λ", r"$\langle \partial U/\partial\lambda\rangle_\lambda$"))
    ax.set_title("Growing a repulsive particle in an ideal-gas solvent (ρσ³ = 0.5)", loc="left")
    style.save(fig, SLUG, "softcore")
    tl = np.trapezoid(lin, lam) + lin[0] * 0.002 * 4   # crude endpoint correction for display only
    print(f"  exact dF = {exact:.4f}; trapz soft = {np.trapezoid(soft, lam):.4f}; GL5 soft = {q_soft:.4f}; "
          f"GL5 linear = {q_lin:.4f}; lin(0.01) = {ti_integrand(0.01, False):.2f}")


# ---------------------------------------------------------------- 3. Crooks: forward and reverse work
def switch(k0, k1, tau, n, rng, dt=0.001):
    """Overdamped particle (D = kT = 1) in a harmonic trap whose stiffness changes linearly from k0 to k1."""
    x = rng.standard_normal(n) / np.sqrt(k0)
    steps = int(round(tau / dt)); dk = (k1 - k0) / steps
    W = np.zeros(n); k = k0
    for _ in range(steps):
        W += 0.5 * x * x * dk; k += dk
        x += -k * x * dt + np.sqrt(2 * dt) * rng.standard_normal(n)
    return W


def crooks():
    kA, kB, tau, n = 1.0, 8.0, 0.25, 40000
    rng = np.random.default_rng(11)
    dF = 0.5 * np.log(kB / kA)
    WF = switch(kA, kB, tau, n, rng); WR = switch(kB, kA, tau, n, rng)
    jzF = -np.log(np.mean(np.exp(-WF))); jzR = np.log(np.mean(np.exp(-WR)))
    bins = np.linspace(-2.5, 6, 70); c = 0.5 * (bins[1:] + bins[:-1])
    hF, _ = np.histogram(WF, bins, density=True); hR, _ = np.histogram(-WR, bins, density=True)
    fig, (ax, bx) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw=dict(width_ratios=[1.35, 1], wspace=0.32))
    ax.fill_between(c, 0, hF, step="mid", color=style.BLUE, alpha=0.35, lw=0)
    ax.fill_between(c, 0, hR, step="mid", color=style.TEAL, alpha=0.35, lw=0)
    ax.step(c, hF, where="mid", color=style.BLUE, lw=1.4); ax.step(c, hR, where="mid", color=style.TEAL, lw=1.4)
    ax.axvline(dF, color=style.GOLD, lw=1.8, ls=(0, (4, 3)))
    top = 1.08 * max(hF.max(), hR.max())
    ax.text(dF + 0.12, 0.5 * top, f"ΔF = ½ kT ln 8 = {dF:.2f} kT", color=style.GOLD, fontsize=9, va="top")
    ax.text(2.6, 0.22 * top, f"forward W, mean {WF.mean():.2f} kT", color=style.BLUE, fontsize=9)
    ax.text(dF + 0.12, 0.85 * top, f"reverse process, −W: mean {(-WR).mean():.2f} kT", color=style.TEAL, fontsize=9)
    ax.set_xlim(-0.5, 6); ax.set_ylim(0, top)
    ax.set_xlabel("work (kT)"); ax.set_ylabel("probability density")
    ax.set_title("Stiffening a trap eightfold in 0.25 time units", loc="left", fontsize=10)
    ok = (hF > 2e-3) & (hR > 2e-3)
    bx.plot(c, c - dF, color=style.INK3, lw=1.4, ls=(0, (4, 3)))
    bx.plot(c[ok], np.log(hF[ok] / hR[ok]), "o", ms=4.5, color=style.VIOLET)
    bx.axhline(0, color=style.LINE, lw=1); bx.axvline(dF, color=style.GOLD, lw=1.2, ls=(0, (4, 3)))
    bx.text(-0.4, 2.3, "Crooks: slope 1,\nzero at W = ΔF", color=style.INK3, fontsize=9, va="top")
    bx.set_xlim(-0.8, 3.2); bx.set_ylim(-2.2, 2.6)
    bx.set_xlabel("work W (kT)"); bx.set_ylabel(r"ln[$P_F(W)\,/\,P_R(-W)$]")
    bx.set_title("Test of the theorem", loc="left", fontsize=10)
    style.save(fig, SLUG, "crooks")
    print(f"  dF = {dF:.4f}; <W_F> = {WF.mean():.3f}; <W_R> = {WR.mean():.3f}; Jarzynski F = {jzF:.3f}, "
          f"R = {jzR:.3f}; frac W_F < dF = {np.mean(WF < dF):.3f}")


# ---------------------------------------------------------------- cover: stepping stones between two islands
def cover():
    def draw(ax):
        ax.add_patch(Ellipse((0.55, 1.5), 1.4, 2.3, fc=style.BLUE, ec="white", lw=3, zorder=2))
        ax.add_patch(Ellipse((3.45, 1.5), 1.4, 2.3, fc=style.TEAL, ec="white", lw=3, zorder=2))
        xs = np.linspace(1.35, 2.65, 5)
        for i, x in enumerate(xs):
            y = 1.5 + 0.28 * np.sin(np.pi * (i + 0.5) / 2.5)
            ax.add_patch(Ellipse((x, y), 0.36, 0.26, fc=style.GOLD, ec="white", lw=2.5, zorder=3))
        for y in (0.55, 0.85, 2.15, 2.45):
            t = np.linspace(1.15, 2.85, 60)
            ax.plot(t, y + 0.04 * np.sin(14 * t), color="white", lw=2, alpha=0.9, zorder=1)
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    cycle(); softcore(); crooks(); cover()
