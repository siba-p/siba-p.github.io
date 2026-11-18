"""Figures for content/learn/molecular-dynamics.md.  Run: python3 tools/figures/molecular-dynamics.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import Circle, FancyArrowPatch, Rectangle
plt = style.setup()
SLUG = "molecular-dynamics"


def euler(x, v, w, dt, n):
    out = [(x, v)]
    for _ in range(n):
        x, v = x + dt * v, v - dt * w * w * x
        out.append((x, v))
    return np.array(out)


def verlet(x, v, w, dt, n):
    out = [(x, v)]
    for _ in range(n):
        v = v - 0.5 * dt * w * w * x
        x = x + dt * v
        v = v - 0.5 * dt * w * w * x
        out.append((x, v))
    return np.array(out)


# ---------------------------------------------------------------- phase space: Euler spirals out, Verlet stays on an ellipse
def phase_portrait():
    w, T = 1.0, 2 * np.pi
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.7), gridspec_kw=dict(wspace=0.35))
    th = np.linspace(0, 2 * np.pi, 400)
    tr = euler(1.0, 0.0, w, T / 20, 40)
    a1.plot(np.cos(th), np.sin(th), color=style.INK3, lw=1.0, ls=(0, (3, 3)))
    a1.plot(tr[:, 0], tr[:, 1], "-", color=style.PINK, lw=1.2)
    a1.plot(tr[:, 0], tr[:, 1], "o", color=style.PINK, ms=3.2)
    a1.plot(1, 0, "o", color=style.INK, ms=6, zorder=5)
    E = 0.5 * (tr[:, 1] ** 2 + tr[:, 0] ** 2)
    a1.set_title("Euler, 20 steps per period", fontsize=10)
    a1.text(0.03, 0.03, f"energy after 1 period: ×{E[20] / E[0]:.1f}\nafter 2 periods: ×{E[40] / E[0]:.0f}",
            transform=a1.transAxes, fontsize=9, color=style.PINK, va="bottom")
    lim1 = 7.2; a1.set_xlim(-lim1, lim1); a1.set_ylim(-lim1, lim1); a1.set_aspect("equal")
    a1.set_xlabel("position x"); a1.set_ylabel("velocity v")

    a2.plot(np.cos(th), np.sin(th), color=style.INK3, lw=1.0, ls=(0, (3, 3)))
    res = []
    for n_per, col, (lx, ly) in [(20, style.BLUE, (1.08, 1.6)), (6, style.TEAL, (1.08, 1.35)), (4, style.ORANGE, (1.08, 1.1))]:
        dt = T / n_per
        tr = verlet(1.0, 0.0, w, dt, 2000)
        k = 1 - (w * dt) ** 2 / 4                       # shadow energy: v^2/2 + k w^2 x^2/2 is conserved exactly
        Ht = 0.5 * (tr[:, 1] ** 2 + k * tr[:, 0] ** 2)
        res.append((n_per, dt, k, np.ptp(Ht), np.ptp(0.5 * (tr[:, 1] ** 2 + tr[:, 0] ** 2)) / 0.5))
        a2.plot(np.sqrt(2 * Ht[0] / k) * np.cos(th), np.sqrt(2 * Ht[0]) * np.sin(th), color=col, lw=1.3)
        a2.plot(tr[:60, 0], tr[:60, 1], "o", color=col, ms=3.2)
        a2.text(lx, ly, f"{n_per:g} steps/period", color=col, fontsize=9, ha="left", va="center")
    a2.set_title("Velocity Verlet, 2000 steps each", fontsize=10)
    a2.text(0.03, 0.03, "each orbit closes on an ellipse:\nthe shadow energy is conserved", transform=a2.transAxes,
            fontsize=9, color=style.INK2, va="bottom")
    a2.set_xlim(-1.9, 1.9); a2.set_ylim(-1.9, 1.9); a2.set_aspect("equal")
    a2.set_xlabel("position x"); a2.set_ylabel("velocity v")
    style.save(fig, SLUG, "phase-portrait")
    return res


# ---------------------------------------------------------------- the time step: energy error of a C–H stretch
def timestep():
    T = 1 / (2.99792458e10 * 3000) * 1e15                # C–H stretch period in fs (11.1 fs)
    w = 2 * np.pi / T
    dts = np.linspace(0.02, T / np.pi, 300)
    swing = (w * dts) ** 2 / 4                           # exact: energy oscillates between (1 - swing) E0 and E0
    sim = []
    for dt in np.arange(0.25, 3.51, 0.25):              # check against direct integration
        tr = verlet(1.0, 0.0, w, dt, int(2000 / dt))
        E = 0.5 * (tr[:, 1] ** 2 + w * w * tr[:, 0] ** 2)
        sim.append((dt, np.ptp(E) / E[0]))
    sim = np.array(sim); err = swing
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    ax.plot(dts, 100 * swing, color=style.BLUE)
    ax.plot(sim[:, 0], 100 * sim[:, 1], "o", ms=4, mfc="white", mec=style.BLUE, mew=1.2)
    ax.text(0.1, 100, "line: $(\\omega\\Delta t)^2/4$\ncircles: direct integration", fontsize=9, color=style.INK2, ha="left", va="top")
    ax.axvline(T / np.pi, color=style.PINK, lw=1.2, ls=(0, (3, 2)))
    ax.text(T / np.pi + 0.08, 50, f"stability limit\nΔt = T/π = {T / np.pi:.2f} fs", color=style.PINK, fontsize=9,
            ha="left", va="center")
    marks = {}
    for dt, lab in [(0.5, "0.5 fs"), (1.0, "1 fs"), (2.0, "2 fs")]:
        e = 100 * (w * dt) ** 2 / 4; marks[dt] = e
        ax.plot(dt, e, "o", color=style.ORANGE, ms=6, zorder=4)
        ax.annotate(f"{lab}: {e:.1f} %" if e < 10 else f"{lab}: {e:.0f} %", xy=(dt, e), xytext=(dt - 0.05, e + 14),
                    fontsize=9, color=style.INK, ha="center", va="bottom",
                    arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    ax.set_xlabel("time step Δt (fs)"); ax.set_ylabel("swing in the bond's energy (%)")
    ax.set_xlim(0, 4.75); ax.set_ylim(0, 110)
    ax.set_title(f"Velocity Verlet on a C–H stretch (period {T:.1f} fs)", fontsize=10)
    style.save(fig, SLUG, "timestep")
    return T, marks


# ---------------------------------------------------------------- periodic boundaries and the minimum image
def pbc():
    rng = np.random.default_rng(4)
    L = 1.0
    pts = np.array([[0.2, 0.25], [0.88, 0.62], [0.5, 0.5], [0.3, 0.75], [0.7, 0.2], [0.55, 0.88]])
    fig, ax = plt.subplots(figsize=(6.2, 5.0))
    ax.set_xlim(-1.05, 2.05); ax.set_ylim(-1.05, 2.05); ax.set_aspect("equal"); ax.axis("off")
    cols = [style.BLUE, style.ORANGE, style.TEAL, style.VIOLET, style.GOLD, style.INK3]
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            central = i == 0 and j == 0
            ax.add_patch(Rectangle((i, j), L, L, fill=central, fc="white" if central else None, ec=style.INK2 if central else style.INK3,
                                   lw=1.8 if central else 0.8, ls="-" if central else (0, (3, 3)), zorder=2 if central else 1))
            for k, p in enumerate(pts):
                ax.add_patch(Circle((p[0] + i, p[1] + j), 0.045, color=cols[k], alpha=1 if central else 0.28, zorder=3))
    ax.add_patch(Rectangle((-1.05, -1.05), 3.1, 3.1, color=style.BG2, zorder=0))
    # cut-off around particle 0 and the minimum image of particle 1
    p0 = pts[0]
    ax.add_patch(Circle(p0, 0.42, fill=False, ec=style.BLUE, lw=1.4, ls=(0, (4, 3)), zorder=4))
    img = pts[1] - (1, 0)
    ax.plot([p0[0], img[0]], [p0[1], img[1]], color=style.ORANGE, lw=1.6, zorder=4)
    ax.plot([p0[0], pts[1][0]], [p0[1], pts[1][1]], color=style.INK3, lw=1.0, ls=(0, (2, 2)), zorder=4)
    ax.annotate("minimum image:\nthe nearest copy of the\norange atom, through the\nleft face", xy=(img + p0) / 2,
                xytext=(-0.98, 1.45), fontsize=9, color=style.ORANGE, va="center", bbox=dict(fc="white", ec="none", pad=2, alpha=0.9),
                arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.8, shrinkB=2))
    ax.annotate("the copy inside the box\nis farther away: ignored", xy=(0.55, 0.45), xytext=(1.12, -0.55),
                fontsize=9, color=style.INK2, va="center", bbox=dict(fc="white", ec="none", pad=2, alpha=0.9),
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=2))
    ax.annotate("cut-off sphere,\nradius $r_c < L/2$", xy=(p0[0] - 0.3, p0[1] - 0.3), xytext=(-0.98, -0.65),
                fontsize=9, color=style.BLUE, va="center", bbox=dict(fc="white", ec="none", pad=2, alpha=0.9),
                arrowprops=dict(arrowstyle="-", color=style.BLUE, lw=0.8, shrinkB=2))
    # an atom leaving through the top and re-entering through the bottom
    q = pts[5]
    ax.add_patch(FancyArrowPatch((q[0], q[1]), (q[0] + 0.05, q[1] + 0.25), arrowstyle="-|>", mutation_scale=11,
                                 color=style.INK2, lw=1.4, zorder=5))
    ax.add_patch(FancyArrowPatch((q[0], q[1] - 1), (q[0] + 0.05, q[1] - 1 + 0.25), arrowstyle="-|>", mutation_scale=11,
                                 color=style.INK2, lw=1.4, zorder=5))
    ax.annotate("leaves through the top,\nits image enters\nthrough the bottom", xy=(q[0] + 0.05, q[1] + 0.2), xytext=(1.12, 1.6),
                fontsize=9, color=style.INK2, va="center", bbox=dict(fc="white", ec="none", pad=2, alpha=0.9),
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=2))
    ax.text(0.5, -0.04, "central box, side L", ha="center", va="top", bbox=dict(fc="white", ec="none", pad=2, alpha=0.9), fontsize=9.5, color=style.INK, fontweight="semibold", zorder=6)
    ax.text(-0.5, 2.0, "periodic images", ha="center", va="top", fontsize=9, color=style.INK3)
    style.save(fig, SLUG, "pbc")


# ---------------------------------------------------------------- cover: atoms with motion trails in a box
def cover():
    def draw(ax):
        ax.add_patch(Rectangle((0.35, 0.3), 3.3, 2.4, fill=False, ec=style.INK2, lw=3, ls=(0, (4, 2.5))))
        atoms = [((1.05, 1.95), (-1, 0.35), style.BLUE), ((2.15, 2.15), (0.6, -1), style.ORANGE),
                 ((3.0, 1.35), (-0.9, -0.5), style.TEAL), ((1.55, 0.95), (1, 0.6), style.PINK),
                 ((2.55, 0.8), (-0.4, 1), style.VIOLET), ((0.85, 0.75), (0.3, 1), style.GOLD)]
        for (x, y), (dx, dy), col in atoms:
            d = np.array([dx, dy]) / np.hypot(dx, dy)
            for k in range(6, 0, -1):
                c = np.array([x, y]) + 0.11 * k * d
                ax.add_patch(Circle(c, 0.19 * (1 - 0.1 * k), color=col, alpha=0.11 * (7 - k) / 2, lw=0))
            ax.add_patch(Circle((x, y), 0.21, color=col, ec="white", lw=2.5, zorder=4))
    style.cover(SLUG, draw, bg=style.TINT[style.ORANGE])


if __name__ == "__main__":
    for n_per, dt, k, dH, dE in phase_portrait():
        print(f"  Verlet {n_per:g} steps/period: k = {k:.3f}, shadow energy range {dH:.1e}, true energy swing {100 * dE:.1f} %")
    T, marks = timestep()
    print(f"  C–H period {T:.2f} fs, stability limit {T / np.pi:.2f} fs, energy swings", {k: round(v, 2) for k, v in marks.items()})
    pbc()
    cover()
