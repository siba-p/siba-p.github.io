"""Static figures for content/learn/motion-and-phase-space.md.  Run: python3 tools/figures/motion-and-phase-space.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import Polygon, FancyArrowPatch, Ellipse, Rectangle
from scipy.special import ellipk
import style
plt = style.setup()
SLUG = "motion-and-phase-space"

h = 6.62607015e-34
u = 1.66053906660e-27
kB = 1.380649e-23


def shoelace(x, p):
    return 0.5 * abs(np.dot(x, np.roll(p, 1)) - np.dot(p, np.roll(x, 1)))


def thin(x, p, step=0.012):
    """Keep one boundary point per `step` of arc length, so the SVG stays small."""
    d = np.r_[0, np.cumsum(np.hypot(np.diff(x), np.diff(p)))]
    keep = np.r_[0, np.nonzero(np.diff(np.floor(d / step)))[0] + 1]
    return x[keep], p[keep]


def filament():
    """Liouville: a disc of pendulum states (V = 1 - cos x, m = 1) carried by the exact flow."""
    n = 6000
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    x0, p0, r = 0.0, 1.15, 0.4
    x, p = x0 + r * np.cos(th), p0 + r * np.sin(th)
    dt, snaps = 0.002, [0.0, 5.0, 30.0]
    shots, t = {0.0: (x.copy(), p.copy())}, 0.0
    for target in snaps[1:]:
        while t < target - 1e-9:                       # velocity Verlet with a tiny step: effectively exact
            p = p - 0.5 * dt * np.sin(x); x = x + dt * p; p = p - 0.5 * dt * np.sin(x); t += dt
        shots[target] = (x.copy(), p.copy())
    fig, ax = plt.subplots(figsize=(7.2, 4.0))
    X, P = np.meshgrid(np.linspace(-np.pi, np.pi, 160), np.linspace(-2.6, 2.6, 120))
    H = 0.5 * P**2 + 1 - np.cos(X)
    ax.contour(X, P, H, levels=[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.5, 3.0], colors=style.LINE, linewidths=0.8)
    ax.contour(X, P, H, levels=[2.0], colors=style.INK3, linewidths=1.0, linestyles="--")
    cols = {0.0: style.BLUE, 5.0: style.VIOLET, 30.0: style.ORANGE}
    for tt, (xs, ps) in shots.items():
        ax.add_patch(Polygon(np.c_[thin(xs, ps)], closed=True, facecolor=cols[tt], edgecolor=cols[tt], alpha=0.85, lw=0.6))
        print(f"  t = {tt:4.0f}: area {shoelace(xs, ps):.4f}, {len(thin(xs, ps)[0])} points drawn")
    a0 = shoelace(*shots[0.0])
    ax.annotate(f"t = 0\narea {a0:.3f}", xy=(0.38, 1.25), xytext=(0.75, 1.95), color=style.BLUE, fontsize=9,
                arrowprops=dict(arrowstyle="-", color=style.BLUE, lw=0.8))
    c5 = np.array(shots[5.0]).mean(axis=1)
    ax.annotate(f"t = 5\narea {shoelace(*shots[5.0]):.3f}", xy=c5, xytext=(-2.75, -1.75), color=style.VIOLET,
                fontsize=9, arrowprops=dict(arrowstyle="-", color=style.VIOLET, lw=0.8))
    x30, p30 = shots[30.0]
    i30 = np.argmin(np.hypot(x30 - 1.2, p30 + 0.9))
    ax.annotate(f"t = 30, area {shoelace(x30, p30):.3f}\nthe same area, wound into a filament", xy=(x30[i30], p30[i30]),
                xytext=(1.3, -1.9), va="top", color=style.ORANGE, fontsize=9,
                arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.8))
    ax.text(2.2, 2.25, "separatrix", color=style.INK3, fontsize=8.5, ha="center")
    ax.set_xlim(-np.pi, np.pi); ax.set_ylim(-2.6, 2.6)
    ax.set_xticks([-np.pi, -np.pi / 2, 0, np.pi / 2, np.pi]); ax.set_xticklabels(["−π", "−π/2", "0", "π/2", "π"])
    ax.set_xlabel("angle x (radians)"); ax.set_ylabel("momentum p (scaled units, m = 1)")
    ax.set_title("A disc of pendulum states keeps its area as the flow shears it")
    style.save(fig, SLUG, "filament")


def shears():
    """Velocity Verlet as three area-preserving shears, against one Euler step (harmonic oscillator, m = k = 1)."""
    dt = 0.8
    s = np.linspace(-0.5, 0.5, 41)
    edge = np.concatenate([np.c_[s, -0.5 + 0 * s], np.c_[0.5 + 0 * s, s], np.c_[s[::-1], 0.5 + 0 * s], np.c_[-0.5 + 0 * s, s[::-1]]])
    grid = [np.c_[0 * s + g, s] for g in (-0.25, 0, 0.25)] + [np.c_[s, 0 * s + g] for g in (-0.25, 0, 0.25)]
    base = np.array([1.0, 0.0])                     # the square of states is centred at x = 1, p = 0
    kick = lambda z: np.c_[z[:, 0], z[:, 1] - 0.5 * dt * z[:, 0]]
    drift = lambda z: np.c_[z[:, 0] + dt * z[:, 1], z[:, 1]]
    euler = lambda z: np.c_[z[:, 0] + dt * z[:, 1], z[:, 1] - dt * z[:, 0]]
    fig, ax = plt.subplots(figsize=(7.2, 4.1))
    ax.set_aspect("equal"); ax.axis("off")

    def draw(shape, lines, slot, color, label):
        c = shape.mean(axis=0)
        sh = shape - c + slot
        ax.add_patch(Polygon(sh, closed=True, facecolor=style.TINT[color], edgecolor=color, lw=1.6))
        for L in lines:
            ax.plot(*(L - c + slot).T, color=color, lw=0.7, alpha=0.6)
        ax.text(slot[0], slot[1] - 1.05, label, ha="center", va="top", fontsize=9, color=style.INK2)

    def arrow(a, b, text, y):
        ax.add_patch(FancyArrowPatch(a, b, arrowstyle="-|>", mutation_scale=12, color=style.INK3, lw=1.1))
        ax.text((a[0] + b[0]) / 2, y, text, ha="center", va="bottom", fontsize=8.5, color=style.INK2, linespacing=1.3)

    z, gl = edge + base, [g + base for g in grid]
    stages = [(z, gl)]
    for f in (kick, drift, kick):
        z, gl = f(z), [f(g) for g in gl]
        stages.append((z, gl))
    xs = [0.0, 3.3, 6.6, 9.9]
    for i, (zz, gg) in enumerate(stages):
        draw(zz, gg, np.array([xs[i], 0.0]), style.BLUE, f"area {shoelace(*zz.T):.2f}")
    for i, t in enumerate(["half kick\np += ½Δt F(x)", "drift\nx += Δt p/m", "half kick\np += ½Δt F(x)"]):
        arrow((xs[i] + 0.95, 0.0), (xs[i + 1] - 0.95, 0.0), t, 0.18)
    ze, ge = euler(edge + base), [euler(g + base) for g in grid]
    draw(edge + base, [g + base for g in grid], np.array([0.0, -3.0]), style.ORANGE, "area 1.00")
    draw(ze, ge, np.array([4.2, -3.0]), style.ORANGE, f"area {shoelace(*ze.T):.2f} = 1 + Δt²")
    arrow((0.95, -3.0), (3.05, -3.0), "Euler step\nboth from old values", -2.82)
    ax.text(-0.75, 1.0, "Velocity Verlet: three shears, each of determinant 1", fontsize=10, color=style.BLUE, fontweight="semibold")
    ax.text(-0.75, -2.0, "Explicit Euler: one step, determinant 1 + Δt²", fontsize=10, color=style.ORANGE, fontweight="semibold")
    # small phase-space axes key
    k0 = np.array([7.3, -3.55])
    ax.add_patch(FancyArrowPatch(k0, k0 + [0.8, 0], arrowstyle="-|>", mutation_scale=9, color=style.INK3, lw=0.9))
    ax.add_patch(FancyArrowPatch(k0, k0 + [0, 0.8], arrowstyle="-|>", mutation_scale=9, color=style.INK3, lw=0.9))
    ax.text(k0[0] + 0.9, k0[1], "x", va="center", fontsize=9, color=style.INK2)
    ax.text(k0[0], k0[1] + 0.92, "p", ha="center", fontsize=9, color=style.INK2)
    ax.text(k0[0] + 1.25, k0[1] + 0.45, "harmonic oscillator\nm = k = 1, Δt = 0.8", fontsize=8.5, color=style.INK3, va="center")
    ax.set_xlim(-0.9, 10.8); ax.set_ylim(-4.2, 1.3)
    style.save(fig, SLUG, "shears")


def co_orbit():
    """The CO worked example: thermal orbit against quantum orbits; argon in a 1 nm cage for contrast."""
    mu = 12.000 * 15.995 / (12.000 + 15.995) * u
    w = 2 * np.pi * 2.99792458e10 * 2170
    k = mu * w**2
    hbar = h / (2 * np.pi)
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.6), gridspec_kw=dict(wspace=0.42))
    E = kB * 300
    xm, pm = np.sqrt(2 * E / k) * 1e12, np.sqrt(2 * mu * E) * 1e24
    a1.add_patch(Ellipse((0, 0), 2 * xm, 2 * pm, facecolor=style.TEAL, edgecolor=style.TEAL, alpha=0.9))
    for n, col in [(0, style.ORANGE), (1, style.VIOLET)]:
        En = (n + 0.5) * hbar * w
        a1.add_patch(Ellipse((0, 0), 2 * np.sqrt(2 * En / k) * 1e12, 2 * np.sqrt(2 * mu * En) * 1e24,
                             fill=False, edgecolor=col, lw=1.8, ls="--" if n else "-"))
    a1.annotate(f"thermal orbit, 300 K\narea {2 * np.pi * E / w / h:.2f} h", xy=(1.3, -6.0), xytext=(4.0, -50),
                color=style.TEAL, fontsize=8.5, arrowprops=dict(arrowstyle="-", color=style.TEAL, lw=0.8))
    a1.text(0, 24.5, "n = 0, area h/2", ha="center", fontsize=8.5, color=style.ORANGE)
    a1.text(0, 40.5, "n = 1, area 3h/2", ha="center", fontsize=8.5, color=style.VIOLET)
    a1.set_xlim(-12, 12); a1.set_ylim(-52, 50)
    a1.set_xlabel("bond stretch x (pm)"); a1.set_ylabel("momentum p (10⁻²⁴ kg m s⁻¹)")
    a1.set_title("CO bond: quantum", fontsize=10.5)
    # argon in a 1 nm cage at 400 m/s: a rectangular orbit; quantum orbits sit at p_n = n h / 2L
    L, m = 1e-9, 39.948 * u
    p0 = m * 400
    nmax = int(2 * L * p0 / h)
    for n in range(1, nmax + 1):
        pn = n * h / (2 * L) * 1e24
        a2.plot([0, 1], [pn, pn], color=style.LINE, lw=0.6); a2.plot([0, 1], [-pn, -pn], color=style.LINE, lw=0.6)
    a2.add_patch(Rectangle((0, -p0 * 1e24), 1.0, 2 * p0 * 1e24, fill=False, edgecolor=style.BLUE, lw=2.0))
    a2.annotate(f"argon at 400 m s⁻¹\narea 2Lp = {2 * L * p0 / h:.0f} h", xy=(0.5, -p0 * 1e24), xytext=(0.5, -40),
                ha="center", color=style.BLUE, fontsize=8.5, arrowprops=dict(arrowstyle="-", color=style.BLUE, lw=0.8))
    a2.text(0.5, 30.5, "grey lines: quantum orbits,\none every h/2L in momentum", ha="center", fontsize=8.5, color=style.INK3)
    a2.set_xlim(-0.1, 1.1); a2.set_ylim(-50, 40)
    a2.set_xlabel("position in the cage x (nm)"); a2.set_ylabel("momentum p (10⁻²⁴ kg m s⁻¹)")
    a2.set_title("Argon in a 1 nm cage: classical", fontsize=10.5)
    print(f"  CO: x_max {xm:.2f} pm, p_max {pm:.2f}e-24; argon: {nmax} quantum orbits inside, area {2*L*p0/h:.1f} h")
    style.save(fig, SLUG, "co-orbit")


def period():
    """Pendulum period against energy: it grows without bound at the separatrix."""
    fig, ax = plt.subplots(figsize=style.WIDE)
    E1 = np.linspace(1e-4, 2 - 1e-6, 2000)
    E2 = np.linspace(2 + 1e-6, 4, 1500)
    T1 = 4 * ellipk(E1 / 2) / (2 * np.pi)
    T2 = 4 / np.sqrt(2 * E2) * ellipk(2 / E2) / (2 * np.pi)
    ax.plot(E1, T1, color=style.BLUE)
    ax.plot(E2, T2, color=style.ORANGE)
    ax.axhline(1, color=style.TEAL, lw=1.5, ls="--")
    ax.axvline(2, color=style.INK3, lw=0.9, ls=":")
    ax.text(0.15, 0.82, "spring: the same period at every energy", color=style.TEAL, fontsize=9)
    ax.text(0.55, 2.25, "swinging back and forth", color=style.BLUE, fontsize=9)
    ax.text(2.55, 1.35, "rotating all the way round", color=style.ORANGE, fontsize=9)
    ax.text(2.04, 3.6, "separatrix: the pendulum just\nreaches the top, and the period\nis infinite", color=style.INK2, fontsize=8.5, va="top")
    Ex = 1.0; Tx = 4 * ellipk(0.5) / (2 * np.pi)
    ax.plot([Ex], [Tx], "o", color=style.BLUE, ms=5)
    ax.annotate(f"90° swing: {Tx:.2f}×", xy=(Ex, Tx), xytext=(0.95, 1.65), fontsize=8.5, color=style.BLUE,
                arrowprops=dict(arrowstyle="-", color=style.BLUE, lw=0.8))
    ax.set_xlim(0, 4); ax.set_ylim(0, 3.8)
    ax.set_xlabel("energy E (scaled units: the top of the swing is at E = 2)")
    ax.set_ylabel("period / small-swing period")
    ax.set_title("Near a barrier top the motion slows to a crawl")
    print(f"  90 degree swing: T/T0 = {Tx:.4f}")
    style.save(fig, SLUG, "period")


def cover():
    def draw(ax):
        X, P = np.meshgrid(np.linspace(0, 4, 220), np.linspace(0, 3, 165))
        x, p = (X - 2.0) / 0.95, (P - 1.5) / 0.72
        H = 0.5 * p**2 + 1.6 * (x**2 - 1) ** 2
        ax.contourf(X, P, H, levels=[0, 0.4, 1.0, 1.6, 2.5], colors=[style.GOLD, style.ORANGE, style.PINK, style.VIOLET])
        ax.contour(X, P, H, levels=[1.6], colors="white", linewidths=3.2)
        ax.contour(X, P, H, levels=[0.4, 1.0, 2.5], colors="white", linewidths=1.3)
        ax.add_patch(plt.Circle((2.0, 1.5 + 0.72 * np.sqrt(2 * (2.5 - 1.6))), 0.14, color=style.INK, zorder=5))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    filament(); shears(); co_orbit(); period(); cover()
