"""Figures for content/learn/differentiable-md.md.  Run: python3 tools/figures/differentiable-md.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
import style
plt = style.setup()
SLUG = "differentiable-md"


def box(ax, x, y, w, h, text, fc, ec, size=10, color=style.INK):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0,rounding_size=0.08",
                                fc=fc, ec=ec, lw=1.2))
    ax.text(x, y, text, ha="center", va="center", fontsize=size, color=color)


def arrow(ax, p, q, color, lw=1.6, rad=0.0, ls="-"):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=11, color=color, lw=lw,
                                 connectionstyle=f"arc3,rad={rad}", linestyle=ls, shrinkA=2, shrinkB=2))


# ---------------------------------------------------------------- 1. forward and reverse mode, as a diagram
def modes():
    fig, ax = plt.subplots(figsize=(7.2, 4.3))
    ax.set_xlim(0, 10); ax.set_ylim(0, 6.2); ax.axis("off")
    xs = [1.0, 2.6, 4.2, 6.6, 8.3]
    labels = [r"$\mathbf{s}_0$", r"$\mathbf{s}_1$", r"$\mathbf{s}_2$", r"$\mathbf{s}_T$", r"$O$"]
    # ---- forward mode (top)
    ax.text(0.15, 5.95, "Forward mode: carry the tangent along", fontsize=11, weight="semibold", color=style.INK)
    yS, yT = 5.0, 4.0
    for k, (x, lab) in enumerate(zip(xs, labels)):
        box(ax, x, yS, 0.9, 0.62, lab, style.TINT[style.BLUE], style.BLUE)
        if k < 4:
            tl = [r"$\dot{\mathbf{s}}_0 = 0$", r"$\dot{\mathbf{s}}_1$", r"$\dot{\mathbf{s}}_2$", r"$\dot{\mathbf{s}}_T$"][k]
            box(ax, x, yT, 1.1 if k == 0 else 0.9, 0.62, tl, style.TINT[style.TEAL], style.TEAL)
    box(ax, xs[4], yT, 0.9, 0.62, r"$\mathrm{d}O/\mathrm{d}\theta$", style.TINT[style.TEAL], style.TEAL, size=9)
    for k in range(4):
        a, b = xs[k], xs[k + 1]
        dash = k == 2
        arrow(ax, (a + 0.47 + (0.1 if k == 0 else 0), yS), (b - 0.47, yS), style.BLUE, ls="--" if dash else "-")
        arrow(ax, (a + (0.57 if k == 0 else 0.47), yT), (b - 0.47, yT), style.TEAL, ls="--" if dash else "-")
    ax.text(5.4, yS + 0.42, "many steps", ha="center", fontsize=8.5, color=style.INK3)
    ax.text(9.0, 4.5, "memory: one state\nand one tangent\n\none pass gives the\nslope for one θ",
            fontsize=8.5, color=style.INK2, va="center", ha="left", linespacing=1.3)
    # ---- reverse mode (bottom)
    ax.text(0.15, 3.0, "Reverse mode: store the path, then send sensitivities back", fontsize=11, weight="semibold",
            color=style.INK)
    yS, yA = 2.05, 0.75
    for k, (x, lab) in enumerate(zip(xs, labels)):
        box(ax, x, yS, 0.9, 0.62, lab, style.TINT[style.BLUE], style.BLUE)
        if k < 4:
            box(ax, x, yA, 0.9, 0.62, [r"$\bar{\mathbf{s}}_0$", r"$\bar{\mathbf{s}}_1$", r"$\bar{\mathbf{s}}_2$",
                                       r"$\bar{\mathbf{s}}_T$"][k], style.TINT[style.ORANGE], style.ORANGE)
    box(ax, xs[4], yA, 0.9, 0.62, r"$1$", style.TINT[style.ORANGE], style.ORANGE)
    for k in range(4):
        a, b = xs[k], xs[k + 1]
        dash = k == 2
        arrow(ax, (a + 0.47, yS), (b - 0.47, yS), style.BLUE, ls="--" if dash else "-")
        arrow(ax, (b - 0.47, yA), (a + 0.47, yA), style.ORANGE, ls="--" if dash else "-")
        if k < 4:
            arrow(ax, (a, yS - 0.33), (a, yA + 0.33), style.INK3, lw=1.0)   # stored state is read on the way back
    ax.text(9.0, 1.4, "memory: every state\n(or √T with\ncheckpoints)\n\none backward pass\ngives every ∂O/∂θ",
            fontsize=8.5, color=style.INK2, va="center", ha="left", linespacing=1.3)
    ax.text(1.0, 0.1, "grey arrows: stored states are read again during the backward sweep",
            fontsize=8.5, color=style.INK3, ha="left")
    style.save(fig, SLUG, "modes")


# ---------------------------------------------------------------- 2. the worked example: LJ dimer, forward mode
def lj_force(r, s):
    a, b = s**12 / r**13, s**6 / r**7
    return 24 * (2 * a - b), 24 * (7 * b - 26 * a) / r, 24 * (24 * a - 6 * b) / s


def run_dimer(s, steps=500, dt=0.01, gamma=3.0, mu=0.5, record=False):
    r, v, dr, dv, damp = 1.6, 0.0, 0.0, 0.0, np.exp(-gamma * dt)
    F, Fr, Fs = lj_force(r, s)
    path = [(0, r, dr)]
    for n in range(steps):
        v, dv = v + 0.5 * dt * F / mu, dv + 0.5 * dt * (Fr * dr + Fs) / mu
        r, dr = r + dt * v, dr + dt * dv
        F, Fr, Fs = lj_force(r, s)
        v, dv = damp * (v + 0.5 * dt * F / mu), damp * (dv + 0.5 * dt * (Fr * dr + Fs) / mu)
        path.append((n + 1, r, dr))
    return (r, dr, np.array(path)) if record else (r, dr)


def dimer():
    r, g, path = run_dimer(1.0, record=True)
    s, target, hist = 1.0, 1.25, []
    for it in range(8):
        rr, gg = run_dimer(s)
        hist.append((it, (rr - target) ** 2))
        s -= 0.3 * 2 * (rr - target) * gg
    hist = np.array(hist)
    print(f"dimer: final r {r:.6f}, dr/dsigma {g:.6f}; losses {hist[:, 1]}")

    fig = plt.figure(figsize=(7.2, 4.4))
    gs = fig.add_gridspec(2, 2, width_ratios=[1.4, 1], hspace=0.18, wspace=0.42)
    a1 = fig.add_subplot(gs[0, 0]); a3 = fig.add_subplot(gs[1, 0], sharex=a1); a2 = fig.add_subplot(gs[:, 1])
    for ax in (a1, a3):
        ax.axhline(2 ** (1 / 6), color=style.INK3, lw=0.9, ls=(0, (4, 3)))
    a1.plot(path[:, 0], path[:, 1], color=style.BLUE)
    a1.set_ylim(1.0, 1.65); a1.set_yticks([1.0, 1.2, 1.4, 1.6]); a1.set_ylabel("bond length $r$")
    a1.tick_params(labelbottom=False)
    a1.set_title("Damped trajectory at $\\sigma$ = 1")
    a1.text(495, 1.16, f"$r_T$ = {r:.4f}", color=style.BLUE, fontsize=9, ha="right", va="bottom")
    a3.plot(path[:, 0], path[:, 2], color=style.ORANGE)
    a3.set_xlim(0, 500); a3.set_ylim(-3, 4); a3.set_yticks([-2, 0, 2, 4])
    a3.set_xlabel("integration step"); a3.set_ylabel(r"tangent $\mathrm{d}r/\mathrm{d}\sigma$")
    a3.text(495, 1.5, r"$\mathrm{d}r_T/\mathrm{d}\sigma$" + f" = {g:.4f}", color=style.ORANGE, fontsize=9, ha="right",
            va="bottom")
    a3.text(495, 0.75, r"dashed: $2^{1/6}$ = 1.1225", color=style.INK2, fontsize=8.5, ha="right", va="top")
    a2.semilogy(hist[:, 0], hist[:, 1], "o-", color=style.VIOLET, ms=4.5)
    a2.set_xlabel("gradient-descent iteration"); a2.set_ylabel(r"loss $(r_T - 1.25)^2$")
    a2.set_title(r"Fitting $\sigma$")
    a2.set_xticks(range(8)); a2.set_ylim(1e-11, 1e-1)
    a2.text(3.4, 2e-3, "loss falls about\n17-fold per step", fontsize=9, color=style.VIOLET)
    style.save(fig, SLUG, "dimer")


# ---------------------------------------------------------------- 3. why long trajectories are hard
N = 7
IU = np.triu_indices(N, 1)


def cluster(seed):
    rng = np.random.default_rng(seed)
    ring = [[1.15 * np.cos(k * np.pi / 3) + 0.08 * rng.normal(), 1.15 * np.sin(k * np.pi / 3) + 0.08 * rng.normal()]
            for k in range(6)]
    pos = np.array([[0.0, 0.0]] + ring)
    vel = 0.55 * rng.normal(size=(N, 2)); vel -= vel.mean(0)
    return pos, vel


def cluster_forces(x, dx, s):
    """LJ forces on a 2D cluster and their derivative along the tangent dx (forward mode, as in the lab)."""
    rij, drij = x[IU[0]] - x[IU[1]], dx[IU[0]] - dx[IU[1]]
    q, dq = (rij**2).sum(1), 2 * (rij * drij).sum(1)
    q4, q7 = q**-4, q**-7
    g = 24 * (2 * s**12 * q7 - s**6 * q4)
    dg = 24 * (24 * s**11 * q7 - 6 * s**5 * q4) + 24 * (-14 * s**12 * q7 / q + 4 * s**6 * q4 / q) * dq
    f, df = np.zeros((N, 2)), np.zeros((N, 2))
    fp, dfp = g[:, None] * rij, dg[:, None] * rij + g[:, None] * drij
    np.add.at(f, IU[0], fp); np.add.at(f, IU[1], -fp); np.add.at(df, IU[0], dfp); np.add.at(df, IU[1], -dfp)
    return f, df


def tangent_norm(seed, steps, gamma, sigma=1.2, dt=0.005, every=20):
    p, v = cluster(seed)
    x, dx, dv = p * sigma, p.copy(), np.zeros_like(v)
    f, df = cluster_forces(x, dx, sigma)
    damp, out = np.exp(-gamma * dt), []
    for n in range(1, steps + 1):
        v, dv = v + 0.5 * dt * f, dv + 0.5 * dt * df
        x, dx = x + dt * v, dx + dt * dv
        f, df = cluster_forces(x, dx, sigma)
        v, dv = damp * (v + 0.5 * dt * f), damp * (dv + 0.5 * dt * df)
        if n % every == 0:
            out.append((n, np.sqrt((dx**2).sum() + (dv**2).sum())))
    return np.array(out)


def chaos():
    steps = 16000
    fig, (a1, a2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw={"width_ratios": [1.45, 1], "wspace": 0.42})
    lams = []
    for seed in range(5):
        nve = tangent_norm(seed, steps, 0.0)
        a1.semilogy(nve[:, 0], nve[:, 1], color=style.ORANGE, lw=1.1, alpha=0.85)
        m = (nve[:, 0] >= 2000) & (nve[:, 0] <= 12000)
        lams.append(np.polyfit(nve[m, 0] * 0.005, np.log(nve[m, 1]), 1)[0])
        if seed < 3:
            dmp = tangent_norm(seed, 4000, 3.0)
            a1.semilogy(dmp[:, 0], dmp[:, 1], color=style.BLUE, lw=1.1)
    print("Lyapunov-like growth rates per reduced time unit:", np.round(lams, 2))
    a1.axhline(3.4e38, color=style.INK3, lw=0.9, ls=(0, (4, 3)))
    a1.text(300, 1.2e39, "largest single-precision number", fontsize=8.5, color=style.INK2, va="bottom")
    a1.text(500, 1e27, "energy-conserving MD\n(five starting points)", fontsize=9, color=style.ORANGE, ha="left")
    a1.text(4300, 3, "damped relaxation", fontsize=9, color=style.BLUE, va="center")
    a1.set_xlim(0, steps); a1.set_ylim(0.1, 1e45)
    a1.set_yticks([1e0, 1e10, 1e20, 1e30, 1e40])
    a1.set_xlabel(r"integration steps ($\Delta t$ = 0.005)")
    a1.set_ylabel(r"size of tangent $\|\partial\mathbf{s}/\partial\sigma\|$")
    a1.set_title("Exploding gradients")
    T = 100_000
    k = np.logspace(0, 5, 400)
    a2.loglog(k, T / k + k, color=style.TEAL)
    a2.plot([np.sqrt(T)], [2 * np.sqrt(T)], "o", color=style.TEAL, ms=5)
    a2.annotate(f"k = √T: {2 * np.sqrt(T):.0f} states", xy=(np.sqrt(T), 2 * np.sqrt(T)), xytext=(6, 330),
                fontsize=8.5, color=style.INK2, arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    a2.text(1.4, 1.6e5, "store every state", fontsize=8.5, color=style.INK2)
    a2.set_ylim(200, 1e6); a2.set_xlim(1, 1e5)
    a2.set_xlabel("checkpoint interval $k$ (steps)"); a2.set_ylabel("states held in memory")
    a2.set_title("Memory for $T$ = 100,000 steps")
    style.save(fig, SLUG, "chaos")


# ---------------------------------------------------------------- cover: states forward, gradients back
def cover():
    def draw(ax):
        x = np.linspace(0.45, 3.0, 200)
        y = 1.95 + 0.28 * np.sin(2.2 * x)
        ax.plot(x, y, color=style.BLUE, lw=9, solid_capstyle="round")
        ax.add_patch(FancyArrowPatch((x[-2], y[-2]), (x[-1] + 0.22, y[-1] - 0.06), arrowstyle="-|>", mutation_scale=40,
                                     color=style.BLUE, lw=0, shrinkA=0, shrinkB=0))
        for xk in (0.45, 1.4, 2.35):
            yk = 1.95 + 0.28 * np.sin(2.2 * xk)
            ax.add_patch(Circle((xk, yk), 0.22, color=style.BLUE, zorder=3))
            ax.add_patch(Circle((xk - 0.06, yk + 0.07), 0.06, color="white", alpha=0.6, zorder=4))
        ax.add_patch(Circle((3.55, 1.95 + 0.28 * np.sin(2.2 * 3.3)), 0.26, color=style.VIOLET, zorder=3))
        yb = y - 0.95
        ax.plot(x[15:], yb[15:], color=style.ORANGE, lw=9, solid_capstyle="round")
        ax.add_patch(FancyArrowPatch((x[16], yb[16]), (x[0] - 0.05, yb[0] - 0.03), arrowstyle="-|>", mutation_scale=40,
                                     color=style.ORANGE, lw=0, shrinkA=0, shrinkB=0))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    modes(); dimer(); chaos(); cover()
