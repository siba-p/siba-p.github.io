"""Static figures for content/learn/derivatives.md.  Run: python3 tools/figures/derivatives.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import matplotlib.patches as mp
import style
plt = style.setup()
SLUG = "derivatives"

# Lennard-Jones potential in reduced units (energy in epsilon, distance in sigma), as in the chapter
V = lambda r: 4 * (r ** -12 - r ** -6)
dV = lambda r: 4 * (-12 * r ** -13 + 6 * r ** -7)
d2V = lambda r: 4 * (156 * r ** -14 - 42 * r ** -8)
R0 = 2 ** (1 / 6)
K = d2V(R0)                                     # 72 / 2^(1/3) = 57.1


def chain():
    """Forward and reverse pass through y = exp(-x^2/2) at x = 1.5, as automatic differentiation does it."""
    x = 1.5
    u = x * x; v = -0.5 * u; y = np.exp(v)
    loc = [2 * x, -0.5, y]                       # du/dx, dv/du, dy/dv
    adj = [1.0]                                  # dy/dy, dy/dv, dy/du, dy/dx
    for d in loc[::-1]:
        adj.append(adj[-1] * d)
    adj = adj[::-1]                              # dy/dx, dy/du, dy/dv, dy/dy
    fig, ax = plt.subplots(figsize=(7.2, 3.1))
    ax.set_xlim(-0.2, 10.4); ax.set_ylim(-0.45, 4.1); ax.axis("off")
    xs = [0.9, 3.75, 6.6, 9.45]
    names = ["x", "u", "v", "y"]
    vals = [x, u, v, y]
    ops = ["square", "× (−½)", "exp"]
    locs = ["2x = 3", "−0.5", f"eᵛ = {y:.3f}"]
    for i, (cx, n, val) in enumerate(zip(xs, names, vals)):
        ax.add_patch(mp.Circle((cx, 2.0), 0.48, fc=style.TINT[style.BLUE], ec=style.BLUE, lw=1.6, zorder=3))
        ax.text(cx, 2.0, n, ha="center", va="center", fontsize=13, fontweight="semibold", color=style.INK, zorder=4)
        ax.text(cx, 2.78, f"{n} = {val:.4g}".replace("-", "−"), ha="center", fontsize=9.5, color=style.BLUE, fontweight="semibold")
        ax.text(cx, 0.72, f"dy/d{n} = {adj[i]:.4g}".replace("-", "−"), ha="center", va="top", fontsize=9.5,
                color=style.ORANGE, fontweight="semibold")
    for i in range(3):
        a, b = xs[i] + 0.55, xs[i + 1] - 0.55
        ax.annotate("", xy=(b, 2.12), xytext=(a, 2.12), arrowprops=dict(arrowstyle="-|>", color=style.BLUE, lw=1.6))
        ax.annotate("", xy=(a, 1.6), xytext=(b, 1.6), arrowprops=dict(arrowstyle="-|>", color=style.ORANGE, lw=1.6,
                                                                       connectionstyle="arc3,rad=-0.25"))
        ax.text(0.5 * (a + b), 2.32, ops[i], ha="center", fontsize=9, color=style.INK2)
        ax.text(0.5 * (a + b), 1.2, "× " + locs[i], ha="center", va="top", fontsize=9, color=style.INK2)
    ax.text(-0.15, 3.65, "forward pass: compute and store each value", fontsize=9.5, color=style.BLUE, fontweight="semibold")
    ax.text(-0.15, -0.3, "reverse pass: multiply local slopes from the output back to the input (the chain rule)",
            fontsize=9.5, color=style.ORANGE, fontweight="semibold")
    style.save(fig, SLUG, "chain")
    return adj[0]


def newton():
    """Newton's method and gradient descent minimising the Lennard-Jones potential from r = 1.15."""
    r_start, eta = 1.15, 0.01
    gd = [r_start]
    for _ in range(30):
        gd.append(gd[-1] - eta * dV(gd[-1]))
    nt = [r_start]
    for _ in range(6):
        nt.append(nt[-1] - dV(nt[-1]) / d2V(nt[-1]))
    gd_err = np.abs(np.array(gd) - R0); nt_err = np.abs(np.array(nt) - R0)
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.4), gridspec_kw=dict(wspace=0.38, width_ratios=[1.05, 1]))
    r = np.linspace(1.02, 1.42, 400)
    a1.plot(r, V(r), color=style.INK, lw=2.2)
    q = lambda z: V(r_start) + dV(r_start) * (z - r_start) + 0.5 * d2V(r_start) * (z - r_start) ** 2
    rq = np.linspace(1.06, 1.24, 200)
    a1.plot(rq, q(rq), color=style.VIOLET, lw=1.8, ls="--")
    r1 = nt[1]
    a1.plot(r_start, V(r_start), "o", color=style.ORANGE, ms=8, mec="white", mew=1.2, zorder=5)
    a1.plot(r1, q(r1), "o", color=style.VIOLET, ms=7, mec="white", mew=1.2, zorder=5)
    a1.annotate("", xy=(r1, -1.075), xytext=(r_start, -1.075),
                arrowprops=dict(arrowstyle="-|>", color=style.VIOLET, lw=1.4))
    a1.plot([r_start, r_start], [V(r_start), -1.075], color=style.INK3, lw=0.8, ls=":")
    a1.plot([r1, r1], [q(r1), -1.075], color=style.INK3, lw=0.8, ls=":")
    a1.text(1.165, -1.11, "Newton step", fontsize=9, color=style.VIOLET, va="top")
    a1.annotate("start, r = 1.15", xy=(r_start, V(r_start)), xytext=(1.2, -0.55), fontsize=9, color=style.ORANGE,
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=5))
    a1.annotate("parabola matching value,\nslope and curvature", xy=(1.215, q(1.215)), xytext=(1.245, -1.06),
                fontsize=9, color=style.VIOLET, arrowprops=dict(arrowstyle="-", color=style.VIOLET, lw=0.8, shrinkB=3))
    a1.text(1.37, -0.68, "V(r)", fontsize=10, color=style.INK, fontweight="semibold")
    a1.set_xlim(1.02, 1.42); a1.set_ylim(-1.16, -0.4)
    a1.set_xlabel("separation r (units of σ)"); a1.set_ylabel("energy V (units of ε)")
    a1.set_title("One Newton step")
    it = np.arange(len(gd_err))
    a2.semilogy(it, gd_err, "o-", color=style.BLUE, ms=4, lw=1.4)
    m = nt_err > 0
    a2.semilogy(np.arange(len(nt_err))[m], nt_err[m], "o-", color=style.VIOLET, ms=6, lw=1.8)
    a2.axhline(2.2e-16, color=style.INK3, lw=0.8, ls="--")
    a2.text(30, 4e-16, "double-precision limit", fontsize=8.5, color=style.INK2, ha="right")
    a2.text(9.5, 3e-4, f"gradient descent, η = {eta}\nerror × {abs(1 - eta * K):.2f} per step", fontsize=9, color=style.BLUE)
    a2.text(4.8, 3e-14, "Newton: correct digits\nroughly double each step", fontsize=9, color=style.VIOLET)
    a2.set_xlim(-0.8, 30.8); a2.set_ylim(1e-17, 1)
    a2.set_xlabel("iteration"); a2.set_ylabel("error |r − r₀|")
    a2.set_title("Distance from the minimum")
    a2.grid(True, axis="y", which="major")
    style.save(fig, SLUG, "newton")
    return nt, gd_err


def expansion():
    """Energy levels in the Lennard-Jones well: the centre of each oscillation moves outwards as energy rises."""
    Es = np.array([-0.9, -0.7, -0.5, -0.3, -0.1])
    sq = np.sqrt(1 + Es)
    r_in = ((1 + sq) / 2) ** (-1 / 6); r_out = ((1 - sq) / 2) ** (-1 / 6)     # 4(s^2 - s) = E with s = r^-6
    mid = 0.5 * (r_in + r_out)
    fig, ax = plt.subplots(figsize=(7.2, 3.9))
    r = np.linspace(0.97, 2.3, 600)
    ax.plot(r, V(r), color=style.INK, lw=2.4, zorder=3)
    rh = np.linspace(0.95, 1.3, 300)
    ax.plot(rh, -1 + 0.5 * K * (rh - R0) ** 2, color=style.TEAL, lw=1.8, ls="--", zorder=2)
    for E, a, b in zip(Es, r_in, r_out):
        ax.plot([a, b], [E, E], color=style.GOLD, lw=1.8, zorder=2)
    ax.plot(mid, Es, "o-", color=style.ORANGE, ms=7, lw=1.6, mec="white", mew=1.2, zorder=5)
    ax.plot([R0, R0], [-1.0, -0.02], color=style.TEAL, lw=1.2, ls=":", zorder=1)
    ax.annotate("centre of each oscillation\nmoves outwards as the energy rises:\nthe bond lengthens on heating",
                xy=(mid[2], Es[2]), xytext=(1.6, -0.8), fontsize=9, color=style.ORANGE,
                arrowprops=dict(arrowstyle="-|>", color=style.ORANGE, lw=1, shrinkB=5))
    ax.annotate("harmonic approximation (parabola):\nevery oscillation stays centred on r₀",
                xy=(1.235, -1 + 0.5 * K * (1.235 - R0) ** 2), xytext=(1.03, 0.12), fontsize=9, color=style.TEAL,
                arrowprops=dict(arrowstyle="-|>", color=style.TEAL, lw=1, shrinkB=3))
    ax.text(2.25, V(2.25) - 0.07, "Lennard-Jones V(r)", fontsize=9.5, color=style.INK, ha="right", va="top", fontweight="semibold")
    ax.text(R0 + 0.012, -1.07, f"r₀ = {R0:.3f}", fontsize=9, color=style.TEAL, va="top")
    ax.text(r_out[3] + 0.1, Es[3] - 0.03, "range of r allowed\nat one energy", fontsize=9, color=style.GOLD, va="center")
    ax.set_xlim(0.95, 2.3); ax.set_ylim(-1.15, 0.35)
    ax.set_xlabel("separation r (units of σ)"); ax.set_ylabel("energy (units of ε)")
    ax.axhline(0, color=style.LINE, lw=0.8, zorder=0)
    style.save(fig, SLUG, "expansion")
    return mid


def cover():
    def draw(ax):
        # a smooth curve, and a magnifying glass under which it is a straight line
        x = np.linspace(-0.1, 4.1, 300)
        y = 1.35 + 0.75 * np.sin(1.35 * x - 0.6) + 0.08 * x
        ax.plot(x, y, color=style.ORANGE, lw=6, solid_capstyle="round", zorder=1)
        x0 = 2.05
        y0 = 1.35 + 0.75 * np.sin(1.35 * x0 - 0.6) + 0.08 * x0
        s = 0.75 * 1.35 * np.cos(1.35 * x0 - 0.6) + 0.08
        R = 0.78
        # handle
        ang = -0.85
        hx0, hy0 = x0 + R * np.cos(ang) * 1.05, y0 + R * np.sin(ang) * 1.05
        ax.plot([hx0, hx0 + 0.8 * np.cos(ang)], [hy0, hy0 + 0.8 * np.sin(ang)], color=style.INK2, lw=14,
                solid_capstyle="round", zorder=2)
        ax.add_patch(mp.Circle((x0, y0), R, fc="white", ec=style.INK2, lw=7, zorder=3))
        # inside the lens: the magnified curve is straight
        t = np.linspace(-R * 0.93, R * 0.93, 2)
        dx = t / np.sqrt(1 + s * s)
        ax.plot(x0 + dx, y0 + s * dx, color=style.ORANGE, lw=10, solid_capstyle="butt", zorder=4)
        ax.add_patch(mp.Circle((x0, y0), 0.11, fc=style.BLUE, ec="white", lw=2, zorder=5))
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    print("dy/dx at x = 1.5:", chain(), " check -x exp(-x^2/2) =", -1.5 * np.exp(-1.125))
    nt, gd_err = newton()
    print("Newton iterates:", [f"{z:.10f}" for z in nt]); print("Newton errors:", [f"{abs(z - R0):.1e}" for z in nt])
    print("GD errors every 5:", [f"{e:.1e}" for e in gd_err[::5]], "factor", 1 - 0.01 * K)
    print("midpoints:", np.round(expansion(), 3), "r0 =", R0, "k =", K)
    cover()
