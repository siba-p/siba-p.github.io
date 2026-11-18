"""Figures for content/learn/es-rates.md (reaction rates). Units of the double well follow the chapter's
interactive figure: U(x) = 5 (x^2 - 1)^2, mass 1, k_B T = 1."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyArrowPatch, Rectangle, Circle, FancyBboxPatch
import style
plt = style.setup()
SLUG = "es-rates"
KB = 8.617333e-5
DV = 5.0
U = lambda x: DV * (x * x - 1) ** 2
dU = lambda x: 4 * DV * x * (x * x - 1)
WA, WB = np.sqrt(8 * DV), np.sqrt(4 * DV)


def arrow(ax, p, q, color, lw=2.0, ms=11, ls="-", z=5, style_="-|>"):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle=style_, mutation_scale=ms, color=color, lw=lw, linestyle=ls,
                                 shrinkA=0, shrinkB=0, zorder=z))


# ---------------------------------------------------------------- 1. TST as a flux through a dividing surface
def flux():
    x = np.linspace(-1.7, 1.7, 500)
    p = np.exp(-U(x)); dx = x[1] - x[0]
    ZA = p[x < 0].sum() * dx
    kTST = np.sqrt(1 / (2 * np.pi)) * np.exp(-U(0.0)) / ZA
    fig, (ax, bx) = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(width_ratios=[1.35, 1], wspace=0.35))
    ax.plot(x, U(x), color=style.BLUE)
    sc = 3.2 / p.max()
    left = x <= 0
    ax.fill_between(x[left], 0, sc * p[left], color=style.TINT[style.ORANGE], lw=0)
    ax.plot(x[left], sc * p[left], color=style.ORANGE, lw=1.4)
    ax.axvline(0, color=style.VIOLET, lw=1.6, ls=(0, (4, 3)))
    arrow(ax, (-0.05, 5.6), (0.45, 5.6), style.VIOLET, lw=2.0)
    ax.text(0.08, 6.1, "forward flux\nthrough x‡", color=style.VIOLET, fontsize=9, ha="left", va="bottom")
    ax.text(-0.95, 3.45, "reactant\npopulation", color=style.ORANGE, fontsize=9, ha="center", va="bottom")
    ax.text(1.0, 1.2, "U(x)", color=style.BLUE, fontsize=9.5, ha="center")
    ax.set_xlim(-1.7, 1.7); ax.set_ylim(0, 7.6)
    ax.set_xlabel("reaction coordinate x"); ax.set_ylabel("energy (kT)")
    ax.set_title("Numerator over denominator", loc="left")
    v = np.linspace(-3.5, 3.5, 400); f = np.exp(-v * v / 2) / np.sqrt(2 * np.pi)
    bx.plot(v, f, color=style.INK3, lw=1.4)
    bx.fill_between(v[v >= 0], 0, f[v >= 0], color=style.TINT[style.VIOLET], lw=0)
    bx.plot(v[v >= 0], f[v >= 0], color=style.VIOLET)
    m = np.sqrt(1 / (2 * np.pi))
    bx.annotate("mean forward speed\n" + r"$\langle v\,\theta(v)\rangle$" + f" = √(kT/2πm) = {m:.3f}", (1.3, 0.1),
                xytext=(0.25, 0.5), color=style.VIOLET, fontsize=9, ha="left", va="center",
                arrowprops=dict(arrowstyle="-|>", color=style.VIOLET, lw=1))
    bx.text(-2.3, 0.2, "left-movers\nnot counted", color=style.INK3, fontsize=8.5, ha="center")
    bx.set_xlim(-3.5, 3.5); bx.set_ylim(0, 0.58); bx.set_yticks([0, 0.2, 0.4])
    bx.set_xlabel("velocity at x‡ (units of √(kT/m))"); bx.set_ylabel("probability density")
    bx.set_title("Only forward velocities count", loc="left")
    style.save(fig, SLUG, "flux")
    print(f"  k_TST (1D numerical) = {kTST:.5f};  harmonic wa/2pi e^-5 = {WA/(2*np.pi)*np.exp(-DV):.5f}")


# ---------------------------------------------------------------- 2. recrossing and the transmission coefficient
def langevin_from_top(gam, n, tmax, dt=0.002, seed=1, keep=0):
    rng = np.random.default_rng(seed)
    x = np.zeros(n); v = rng.standard_normal(n); v0 = v.copy()
    c1 = np.exp(-gam * dt); c2 = np.sqrt(1 - c1 * c1)
    steps = int(round(tmax / dt)); ts = np.arange(steps + 1) * dt
    kap = np.empty(steps + 1); kap[0] = 1.0
    norm = np.mean(v0 * (v0 > 0))
    traj = np.empty((steps + 1, keep)); traj[0] = x[:keep]
    for s in range(1, steps + 1):          # BAOAB
        v -= 0.5 * dt * dU(x); x += 0.5 * dt * v
        v = c1 * v + c2 * rng.standard_normal(n)
        x += 0.5 * dt * v; v -= 0.5 * dt * dU(x)
        kap[s] = np.mean(v0 * (x > 0)) / norm
        if keep: traj[s] = x[:keep]
    return ts, kap, traj, v0


def recrossing():
    fig, (ax, bx) = plt.subplots(1, 2, figsize=(7.2, 3.4), gridspec_kw=dict(wspace=0.32))
    ts, kap10, traj, v0 = langevin_from_top(10.0, 20000, 2.0, keep=24, seed=4)
    for j in range(traj.shape[1]):
        end = traj[-1, j]
        ax.plot(ts, traj[:, j], color=style.TEAL if end > 0 else style.ORANGE, lw=1.0, alpha=0.85)
    ax.axhline(0, color=style.VIOLET, lw=1.2, ls=(0, (4, 3)))
    ax.text(0.04, 1.62, "violet dashed: dividing surface x‡", color=style.VIOLET, fontsize=8.5, ha="left", va="top")
    ax.text(1.98, 1.25, "ends in B", color=style.TEAL, fontsize=9, ha="right", fontweight="semibold")
    ax.text(1.98, -1.55, "ends in A", color=style.ORANGE, fontsize=9, ha="right", fontweight="semibold", va="top")
    ax.set_xlim(0, 2); ax.set_ylim(-1.75, 1.75)
    ax.set_xlabel("time (units of √(m/kT))"); ax.set_ylabel("x(t)")
    ax.set_title("24 trajectories launched from x‡, γ = 10", loc="left", fontsize=10)
    res = {}
    for gam, col in [(2.0, style.BLUE), (10.0, style.PINK)]:
        if gam == 10.0: t, kap = ts, kap10
        else: t, kap, _, _ = langevin_from_top(gam, 20000, 2.0, seed=7)
        kr = (np.sqrt(gam * gam / 4 + WB * WB) - gam / 2) / WB
        bx.plot(t, kap, color=col)
        bx.axhline(kr, color=col, lw=1.0, ls=(0, (4, 3)))
        plateau = kap[(t > 1.0) & (t < 2.0)].mean()
        res[gam] = (plateau, kr)
        bx.text(1.95, kap[-1] + 0.04, f"γ = {gam:g}: κ = {plateau:.2f}\n(Kramers {kr:.2f})", color=col, fontsize=9,
                ha="right", va="bottom")
    bx.set_xlim(0, 2); bx.set_ylim(0, 1.08)
    bx.set_xlabel("time (units of √(m/kT))"); bx.set_ylabel("κ(t)")
    bx.set_title("Bennett–Chandler transmission coefficient", loc="left", fontsize=10)
    style.save(fig, SLUG, "recrossing")
    for g, (pl, kr) in res.items():
        print(f"  gamma {g}: plateau kappa = {pl:.3f}, Kramers = {kr:.3f}")


# ---------------------------------------------------------------- 3. harmonic TST rates of a vacancy hop in copper
def vacancy():
    Ea, nu = 0.78, 5e12
    T = np.linspace(200, 1100, 400)
    k = nu * np.exp(-Ea / (KB * T))
    fig, ax = plt.subplots(figsize=style.WIDE)
    for val, lab in [(1.0, "one hop per second"), (1e6, "one hop per microsecond:\nwithin reach of direct MD")]:
        ax.axhline(np.log10(val), color=style.LINE, lw=1.0, zorder=0)
        ax.text(1095, np.log10(val) - 0.3, lab, fontsize=8.5, color=style.INK3, va="top", ha="right")
    ax.plot(T, np.log10(k), color=style.BLUE, lw=2.2)
    for T0 in (300, 600, 900):
        k0 = nu * np.exp(-Ea / (KB * T0))
        ax.plot([T0], [np.log10(k0)], "o", ms=7, color=style.ORANGE, mec="white", mew=1.2, zorder=6)
        lab = f"{k0:.1f} s⁻¹" if k0 < 10 else f"{k0:.1e} s⁻¹".replace("e+0", " × 10^").replace("e+", " × 10^")
        lab = lab.replace("^6", "⁶").replace("^8", "⁸")
        ax.annotate(f"{T0} K: {lab}", (T0, np.log10(k0)), xytext=(10, -4), textcoords="offset points", fontsize=9,
                    color=style.INK, va="top")
        print(f"  k({T0} K) = {k0:.3g} s^-1")
    ax.set_xlim(200, 1100); ax.set_ylim(-8, 10.5)
    ax.set_xlabel("temperature (K)"); ax.set_ylabel("hops per second (log₁₀)")
    ax.set_title("Vacancy hop in copper: ΔE = 0.78 eV (EMT), prefactor 5 × 10¹² s⁻¹", loc="left")
    style.save(fig, SLUG, "vacancy")


# ---------------------------------------------------------------- 4. kinetic Monte Carlo, one step
def kmc():
    rates = [("a", 4.0, style.BLUE), ("b", 1.0, style.TEAL), ("c", 2.5, style.VIOLET), ("d", 0.5, style.GOLD)]
    ktot = sum(r for _, r, _ in rates)
    fig = plt.figure(figsize=(7.2, 3.3))
    ax = fig.add_axes([0.0, 0.0, 0.36, 1.0]); ax.set_xlim(-0.6, 4.6); ax.set_ylim(-0.6, 4.6)
    ax.set_aspect("equal"); ax.axis("off")
    for i in range(5):
        for j in range(5):
            if (i, j) == (2, 2):
                ax.add_patch(Circle((i, j), 0.3, fc="white", ec=style.INK3, lw=1.4, ls=(0, (3, 2))))
            else:
                ax.add_patch(Circle((i, j), 0.3, fc=style.TINT[style.BLUE], ec=style.INK3, lw=0.8))
    nb = {"a": (3, 2), "b": (2, 3), "c": (1, 2), "d": (2, 1)}
    for name, r, col in rates:
        p = np.array(nb[name], float); q = np.array((2, 2), float); d = (q - p) / np.linalg.norm(q - p)
        ax.add_patch(Circle(p, 0.3, fc=col, ec="white", lw=1.2, zorder=3))
        arrow(ax, p + 0.33 * d, q - 0.33 * d, col, lw=1.0 + 0.7 * r, ms=8 + 2 * r, z=4)
        ax.text(*p, name, color="white", fontsize=10, fontweight="semibold", ha="center", va="center", zorder=5)
    ax.text(2, -0.55, "a vacancy and four possible hops", ha="center", fontsize=9, color=style.INK2)
    bx = fig.add_axes([0.42, 0.22, 0.56, 0.6]); bx.set_xlim(-0.2, ktot + 0.3); bx.set_ylim(-1.6, 2.2); bx.axis("off")
    x0 = 0.0
    for name, r, col in rates:
        bx.add_patch(Rectangle((x0, 0), r, 0.7, fc=col, ec="white", lw=1.5))
        bx.text(x0 + r / 2, 0.35, f"{name}", color="white", fontsize=10, fontweight="semibold", ha="center",
                va="center")
        bx.text(x0 + r / 2, -0.12, f"{r:g}", color=style.INK2, fontsize=8.5, ha="center", va="top")
        x0 += r
    u1 = 0.53; xp = u1 * ktot
    arrow(bx, (xp, 1.55), (xp, 0.75), style.INK, lw=1.6, ms=10)
    bx.text(xp, 1.62, f"u₁ k_tot = {u1:.2f} × {ktot:g} = {xp:.2f}: choose b", ha="center", va="bottom", fontsize=9,
            color=style.INK)
    bx.text(0, -0.75, f"rates (s⁻¹) stacked end to end; k_tot = {ktot:g} s⁻¹", fontsize=9, color=style.INK2,
            va="top")
    bx.text(0, -1.25, f"then advance the clock by Δt = −ln(u₂) / k_tot, mean {1/ktot:.3f} s", fontsize=9,
            color=style.INK2, va="top")
    bx.set_title("One kinetic Monte Carlo step", loc="left", fontsize=11, pad=2)
    style.save(fig, SLUG, "kmc")


# ---------------------------------------------------------------- cover
def cover():
    def draw(ax):
        xs = np.linspace(0, 4, 300)
        u = (xs - 2) / 1.1
        y = 0.55 + 0.75 * (u * u - 1) ** 2
        y = np.minimum(y, 2.5)
        ax.fill_between(xs, 0, y, color=style.BLUE, lw=0, zorder=1)
        rng = np.random.default_rng(3)
        for _ in range(16):
            px = 2 - 1.1 + np.clip(rng.normal(0, 0.2), -0.32, 0.32); uu = (px - 2) / 1.1
            py = 0.55 + 0.75 * (uu * uu - 1) ** 2 + 0.1 + rng.uniform(0, 0.25)
            ax.add_patch(Circle((px, py), 0.075, fc=style.ORANGE, ec="white", lw=1.2, zorder=3))
        t = np.linspace(0, 1, 50)
        ax.plot(1.25 + 0.75 * t, 0.9 + 0.55 * np.sin(np.pi * t * 0.9) + 0.0 * t, color=style.PINK, lw=2.2,
                ls=(0, (2, 2.5)), zorder=2)
        ax.add_patch(Circle((2.0, 1.44), 0.13, fc=style.PINK, ec="white", lw=1.8, zorder=4))
        ax.add_patch(Circle((2.95, 0.72), 0.075, fc=style.TEAL, ec="white", lw=1.2, zorder=3))
    style.cover(SLUG, draw, bg=style.TINT[style.ORANGE])


if __name__ == "__main__":
    flux(); recrossing(); vacancy(); kmc(); cover()
