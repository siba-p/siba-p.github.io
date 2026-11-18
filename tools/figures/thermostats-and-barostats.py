"""Figures for content/learn/thermostats-and-barostats.md.  Run: python3 tools/figures/thermostats-and-barostats.py [names]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Rectangle, Polygon, Wedge
import style
plt = style.setup()
SLUG = "thermostats-and-barostats"


def arrow(ax, p, q, color, lw=1.6, hw=3, hl=5, z=3):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle=f"-|>,head_width={hw},head_length={hl}", lw=lw, color=color,
                                 zorder=z, shrinkA=0, shrinkB=0))


# ---------------------------------------------------------------- 1. how each thermostat touches the system
def mechanisms():
    fig, ax = plt.subplots(figsize=(7.2, 3.3))
    ax.set_xlim(0, 8)
    ax.set_ylim(0, 3.6)
    ax.set_aspect("equal")
    ax.axis("off")
    rng = np.random.default_rng(4)
    pos = np.array([[0.35, 0.4], [1.05, 0.3], [0.7, 0.85], [1.25, 1.05], [0.35, 1.25]])
    vel = np.array([[0.32, 0.1], [-0.12, 0.3], [0.28, -0.2], [-0.3, -0.1], [0.15, 0.28]])
    titles = ["velocity rescaling\nBerendsen, CSVR", "Andersen\nrandom collisions", "Langevin\nfriction + noise",
              "Nosé–Hoover\nextended system"]
    notes = ["every velocity × the\nsame factor λ", "one atom at a time gets\na fresh Maxwell velocity",
             "every atom: drag −γmv\nplus a random kick", "one extra variable ξ\nspeeds up or slows all"]
    for k in range(4):
        x0, y0 = 0.15 + 2.0 * k, 0.95
        ax.add_patch(FancyBboxPatch((x0, y0), 1.6, 1.6, boxstyle="round,pad=0,rounding_size=0.1", fc=style.BG2,
                                    ec=style.INK3, lw=1))
        ax.text(x0 + 0.8, 3.18, titles[k], ha="center", va="center", fontsize=9, color=style.INK, linespacing=1.3,
                fontweight="semibold")
        ax.text(x0 + 0.8, 0.5, notes[k], ha="center", va="center", fontsize=8.5, color=style.INK2, linespacing=1.3)
        for i, (p, v) in enumerate(zip(pos, vel)):
            if k == 3 and i == 3:
                continue                            # leave room for the thermostat gauge
            c = np.array([x0, y0]) + 0.05 + p
            if k == 0:
                arrow(ax, c, c + v * 1.0, style.INK3, lw=1.0, hw=2, hl=3)
                arrow(ax, c, c + v * 0.65, style.BLUE, lw=1.8)
            elif k == 1:
                if i == 2:
                    nv = np.array([-0.05, 0.36])
                    arrow(ax, c, c + v, style.INK3, lw=1.0, hw=2, hl=3)
                    arrow(ax, c, c + nv, style.ORANGE, lw=1.8)
                    b = c + np.array([0.33, 0.05])
                    ax.add_patch(Circle(b, 0.07, fc="white", ec=style.ORANGE, lw=1.4, zorder=4))
                    for ang in np.linspace(0, 2 * np.pi, 7)[:-1]:
                        d = np.array([np.cos(ang), np.sin(ang)])
                        ax.plot(*np.c_[c + 0.14 * d + [0.16, 0.03], c + 0.2 * d + [0.16, 0.03]], color=style.ORANGE,
                                lw=1, zorder=2)
                else:
                    arrow(ax, c, c + v, style.BLUE, lw=1.8)
            elif k == 2:
                arrow(ax, c, c + v, style.BLUE, lw=1.8)
                arrow(ax, c, c - 0.45 * v, style.VIOLET, lw=1.4, hw=2.5, hl=4)
                kick = rng.normal(0, 0.16, 2)
                arrow(ax, c, c + kick, style.PINK, lw=1.4, hw=2.5, hl=4)
            else:
                arrow(ax, c, c + v * 0.8, style.BLUE, lw=1.8)
            ax.add_patch(Circle(c, 0.07, fc=style.INK2, ec="white", lw=0.8, zorder=5))
    # Nose-Hoover: a gauge in the corner of the last box stands for the extra variable xi with mass Q
    x0, y0 = 6.15, 0.95
    g = np.array([x0 + 1.32, y0 + 1.32])
    ax.add_patch(Circle(g, 0.2, fc="white", ec=style.TEAL, lw=1.6, zorder=6))
    ax.plot([g[0], g[0] + 0.13], [g[1], g[1] + 0.09], color=style.TEAL, lw=1.8, zorder=7)
    ax.text(g[0], g[1] - 0.3, "ξ, Q", ha="center", va="center", fontsize=8.5, color=style.TEAL, zorder=7)
    style.save(fig, SLUG, "mechanisms")


# ---------------------------------------------------------------- 2. how big are temperature fluctuations
def fluctuations():
    T0 = 300.0
    N = np.logspace(1.5, 6.3, 200)
    sig = T0 * np.sqrt(2 / (3 * N))
    fig, ax = plt.subplots(figsize=(7.2, 3.3))
    ax.loglog(N, sig, color=style.ORANGE)
    marks = [(100, "100-atom cluster"), (1000, "1,000-atom\nLennard-Jones fluid"),
             (30000, "protein in water,\n30,000 atoms"), (1e6, "membrane patch,\n1 million atoms")]
    out = {}
    for n, lab in marks:
        s = T0 * np.sqrt(2 / (3 * n))
        out[n] = s
        ax.plot(n, s, "o", ms=7, color=style.ORANGE, zorder=3)
        ax.text(n * 1.25, s * 1.12, f"{lab}\n±{s:.2g} K" if s < 10 else f"{lab}\n±{s:.0f} K", fontsize=8.5,
                color=style.INK2, va="bottom", ha="left", linespacing=1.3)
    ax.set_xlabel("number of atoms $N$  ($N_{\\mathrm{df}} \\approx 3N$)")
    ax.set_ylabel("σ of the kinetic temperature (K)")
    ax.set_title("canonical fluctuations at 300 K:  $\\sigma_T = T_0\\,(2/N_{\\mathrm{df}})^{1/2}$")
    ax.set_xlim(30, 1e7)
    ax.set_ylim(0.1, 100)
    style.save(fig, SLUG, "fluctuations")
    return out


# ---------------------------------------------------------------- 3. Nose-Hoover on a harmonic oscillator
def nh_rhs(t, y, M):
    """Nose-Hoover chain of length M for a 1D oscillator, m = k = kT = Q = 1. y = (x, p, xi_1..xi_M)."""
    x, p = y[0], y[1]
    d = [p, -x - y[2] * p]
    G = p * p - 1.0
    for j in range(M):
        xi = y[2 + j]
        d.append(G - (y[3 + j] * xi if j + 1 < M else 0.0))
        G = xi * xi - 1.0
    return d


def integrate(M, y0, tmax=6000.0, npts=60000):
    """Integrate with an adaptive 8th-order Runge-Kutta method; returns (x, p) at npts equally spaced times."""
    from scipy.integrate import solve_ivp
    t = np.linspace(0, tmax, npts)
    sol = solve_ivp(nh_rhs, (0, tmax), list(y0) + [0.0] * M, args=(M,), method="DOP853", t_eval=t,
                    rtol=1e-9, atol=1e-9)
    return sol.y[:2].T


def nh_oscillator():
    a1 = integrate(1, [1.0, 0.0])
    a3 = integrate(3, [1.0, 0.0])
    fig, axs = plt.subplots(1, 3, figsize=(7.2, 2.9), gridspec_kw=dict(wspace=0.42, width_ratios=[1, 1, 1.1]))
    for a, d, col, t in [(axs[0], a1, style.BLUE, "single Nosé–Hoover"), (axs[1], a3, style.TEAL, "chain of three")]:
        a.scatter(d[:, 0], d[:, 1], s=0.4, color=col, alpha=0.35, lw=0, rasterized=True)
        a.set_xlim(-3.6, 3.6)
        a.set_ylim(-3.6, 3.6)
        a.set_aspect("equal")
        a.set_xlabel("position $x$")
        a.set_title(t, fontsize=10)
        a.set_xticks([-3, 0, 3])
        a.set_yticks([-3, 0, 3])
    axs[0].set_ylabel("momentum $p$")
    axs[0].annotate("never visited", (0, 0), xytext=(0, -3.2), ha="center", fontsize=8.5, color=style.INK2,
                    arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    a = axs[2]
    xx = np.linspace(-4, 4, 200)
    bins = np.linspace(-4, 4, 41)
    h1, _ = np.histogram(a1[:, 0], bins, density=True)
    h3, _ = np.histogram(a3[:, 0], bins, density=True)
    c = 0.5 * (bins[1:] + bins[:-1])
    a.plot(xx, np.exp(-xx ** 2 / 2) / np.sqrt(2 * np.pi), color=style.INK3, lw=1.2, ls=(0, (4, 3)))
    a.step(c, h1, where="mid", color=style.BLUE, lw=1.4)
    a.step(c, h3, where="mid", color=style.TEAL, lw=1.4)
    a.set_xlim(-4, 4)
    a.set_ylim(0, max(h1.max(), 0.45) * 1.15)
    a.set_xlabel("position $x$")
    a.set_ylabel("probability density")
    a.set_title("distribution of $x$", fontsize=10)
    a.text(2.0, 0.36, "canonical\n(Gaussian)", fontsize=8, color=style.INK2, ha="left")
    a.text(-3.9, h1.max() * 1.02, "single", fontsize=8, color=style.BLUE, ha="left")
    a.text(1.6, 0.18, "chain", fontsize=8, color=style.TEAL, ha="left")
    style.save(fig, SLUG, "nh-oscillator")
    var = lambda d: (d[:, 0].var(), d[:, 1].var(), np.mean(d[:, 0] ** 4) / d[:, 0].var() ** 2)
    return dict(single=var(a1), chain=var(a3), hole=np.min(np.hypot(a1[:, 0], a1[:, 1])),
                hole3=np.min(np.hypot(a3[:, 0], a3[:, 1])))


# ---------------------------------------------------------------- 4. barostat coupling modes
def cells():
    fig, ax = plt.subplots(figsize=(7.2, 3.0))
    ax.set_xlim(0, 9)
    ax.set_ylim(0, 3.5)
    ax.set_aspect("equal")
    ax.axis("off")
    heads = ["isotropic", "semi-isotropic", "fully anisotropic"]
    subs = ["one scale factor for all edges:\nliquids, solutions", "x and y together, z alone:\nmembranes, interfaces",
            "all six cell parameters:\ncrystals, phase transitions"]
    for k in range(3):
        cx = 1.5 + 3.0 * k
        ax.text(cx, 3.3, heads[k], ha="center", va="center", fontsize=9.5, fontweight="semibold", color=style.INK)
        ax.text(cx, 0.32, subs[k], ha="center", va="center", fontsize=8.5, color=style.INK2, linespacing=1.3)
    # isotropic: two nested squares
    c = np.array([1.5, 1.85])
    for s, ls, col in [(1.0, (0, (3, 2)), style.INK3), (1.3, "-", style.BLUE)]:
        ax.add_patch(Rectangle(c - s / 2, s, s, fc="none", ec=col, lw=1.6 if ls == "-" else 1.0, ls=ls))
    for d in [(1, 1), (-1, 1), (1, -1), (-1, -1)]:
        d = np.array(d)
        arrow(ax, c + 0.38 * d, c + 0.62 * d, style.BLUE, lw=1.4)
    # semi-isotropic: bilayer slab in a box stretched in x
    c = np.array([4.5, 1.85])
    ax.add_patch(Rectangle(c - [0.5, 0.75], 1.0, 1.5, fc="none", ec=style.INK3, lw=1.0, ls=(0, (3, 2))))
    W, H = 1.5, 1.3
    ax.add_patch(Rectangle(c - [W / 2, H / 2], W, H, fc="none", ec=style.TEAL, lw=1.6))
    for xx in np.linspace(c[0] - W / 2 + 0.1, c[0] + W / 2 - 0.1, 9):
        for sgn in (1, -1):
            head = np.array([xx, c[1] + sgn * 0.22])
            ax.add_patch(Circle(head, 0.06, fc=style.TEAL, ec="none"))
            ax.plot([xx - 0.02, xx - 0.02], [head[1] - sgn * 0.06, c[1] + sgn * 0.02], color=style.TEAL, lw=0.8)
            ax.plot([xx + 0.02, xx + 0.02], [head[1] - sgn * 0.06, c[1] + sgn * 0.02], color=style.TEAL, lw=0.8)
    arrow(ax, c + [W / 2 - 0.05, -0.5], c + [W / 2 + 0.25, -0.5], style.TEAL, lw=1.4)
    arrow(ax, c + [-W / 2 + 0.05, -0.5], c + [-W / 2 - 0.25, -0.5], style.TEAL, lw=1.4)
    arrow(ax, c + [0.55, H / 2 - 0.02], c + [0.55, H / 2 - 0.22], style.ORANGE, lw=1.4)
    ax.text(c[0] + W / 2 + 0.12, c[1] - 0.3, "$x, y$", fontsize=8.5, color=style.TEAL, ha="left")
    ax.text(c[0] + 0.45, c[1] + H / 2 - 0.12, "$z$", fontsize=8.5, color=style.ORANGE, ha="right")
    # anisotropic: a square sheared and stretched into a triclinic cell
    c = np.array([7.5, 1.85])
    o = c - [0.6, 0.6]
    ax.add_patch(Polygon([o, o + [1.2, 0], o + [1.2, 1.2], o + [0, 1.2]], closed=True, fc="none", ec=style.INK3, lw=1.0,
                         ls=(0, (3, 2))))
    a, b = np.array([1.35, 0.0]), np.array([0.45, 1.15])
    o2 = o + [-0.15, 0.0]
    ax.add_patch(Polygon([o2, o2 + a, o2 + a + b, o2 + b], closed=True, fc="none", ec=style.VIOLET, lw=1.6))
    arrow(ax, o2, o2 + a, style.VIOLET, lw=1.8)
    arrow(ax, o2, o2 + b, style.VIOLET, lw=1.8)
    ax.text(*(o2 + a / 2 + [0, -0.15]), "$\\mathbf{a}$", fontsize=9, color=style.VIOLET, ha="center", va="top")
    ax.text(*(o2 + b / 2 + [-0.12, 0.05]), "$\\mathbf{b}$", fontsize=9, color=style.VIOLET, ha="right")
    ax.text(*(o2 + a + b + [0.05, 0.05]), "$h = (\\mathbf{a}, \\mathbf{b}, \\mathbf{c})$", fontsize=8.5,
            color=style.VIOLET, ha="left", va="bottom")
    style.save(fig, SLUG, "cells")


def cover():
    def draw(ax):
        rng = np.random.default_rng(6)
        # cylinder with a piston
        x0, x1, yb, yt = 0.75, 2.55, 0.35, 2.05
        ax.add_patch(Rectangle((x0, yb), x1 - x0, yt - yb, fc="white", ec="none"))
        ax.plot([x0, x0, x1, x1], [2.55, yb, yb, 2.55], color=style.INK, lw=5, solid_capstyle="round",
                solid_joinstyle="round")
        ax.add_patch(Rectangle((x0 + 0.06, yt), x1 - x0 - 0.12, 0.22, fc=style.BLUE, ec="none"))
        ax.add_patch(Rectangle(((x0 + x1) / 2 - 0.08, yt + 0.22), 0.16, 0.6, fc=style.BLUE, ec="none"))
        pts = []
        for _ in range(5000):                       # random sequential placement, at most 9 particles
            p = rng.uniform([x0 + 0.25, yb + 0.25], [x1 - 0.25, yt - 0.25])
            if all(np.hypot(*(p - q)) > 0.4 for q in pts):
                pts.append(p)
            if len(pts) == 9:
                break
        for p in pts:
            ax.add_patch(Circle(p, 0.13, fc=style.ORANGE, ec="none"))
        # thermometer
        tx = 3.25
        ax.add_patch(FancyBboxPatch((tx - 0.1, 0.75), 0.2, 1.75, boxstyle="round,pad=0,rounding_size=0.1",
                                    fc="white", ec=style.INK, lw=3))
        ax.add_patch(Rectangle((tx - 0.045, 0.75), 0.09, 1.05, fc=style.PINK, ec="none"))
        ax.add_patch(Circle((tx, 0.62), 0.24, fc=style.PINK, ec=style.INK, lw=3))
    style.cover(SLUG, draw, bg=style.TINT[style.ORANGE])


if __name__ == "__main__":
    only = set(sys.argv[1:])
    run = lambda name: not only or name in only
    if run("mechanisms"): mechanisms()
    if run("fluctuations"): print("fluctuations:", fluctuations())
    if run("nh-oscillator"): print("nh-oscillator:", nh_oscillator())
    if run("cells"): cells()
    if run("cover"): cover()
