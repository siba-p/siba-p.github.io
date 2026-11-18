"""Figures for content/learn/potential-energy-surfaces.md.  Run: python3 tools/figures/potential-energy-surfaces.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import Circle, FancyArrowPatch, Arc, Rectangle
plt = style.setup()
SLUG = "potential-energy-surfaces"

# ---------------------------------------------------------------- argon trimer: the third atom's landscape
EPS, SIG = 0.997, 3.405                       # argon Lennard-Jones, kJ/mol and Å (as in the text)
RMIN = 2 ** (1 / 6) * SIG
FIXED = np.array([[-RMIN / 2, 0.0], [RMIN / 2, 0.0]])   # a pair held at its equilibrium distance


def u_lj(r):
    s6 = (SIG / r) ** 6
    return 4 * EPS * (s6 * s6 - s6)


def e3(x, y):
    """Total energy of the trimer with the third atom at (x, y) in the plane, kJ/mol."""
    return u_lj(RMIN) + sum(u_lj(np.hypot(x - fx, y - fy)) for fx, fy in FIXED)


def g3(p, h=1e-6):
    return np.array([(e3(p[0] + h, p[1]) - e3(p[0] - h, p[1])) / (2 * h), (e3(p[0], p[1] + h) - e3(p[0], p[1] - h)) / (2 * h)])


def h3(p, h=1e-4):
    H = np.zeros((2, 2))
    for i in range(2):
        d = np.zeros(2); d[i] = h
        H[:, i] = (g3(p + d) - g3(p - d)) / (2 * h)
    return H


def newton3(p):
    p = np.array(p, float)
    for _ in range(50):
        p = p - np.linalg.solve(h3(p), g3(p))
    return p


def string3(pts, n=50, steps=20000, dt=0.3):
    t = np.linspace(0, 1, len(pts)); tt = np.linspace(0, 1, n); pts = np.array(pts, float)
    path = np.stack([np.interp(tt, t, pts[:, 0]), np.interp(tt, t, pts[:, 1])], 1)
    for _ in range(steps):
        q = path[1:-1]; h = 1e-6
        gx = (e3(q[:, 0] + h, q[:, 1]) - e3(q[:, 0] - h, q[:, 1])) / (2 * h)
        gy = (e3(q[:, 0], q[:, 1] + h) - e3(q[:, 0], q[:, 1] - h)) / (2 * h)
        path[1:-1] -= dt * np.stack([gx, gy], 1)
        d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]; d /= d[-1]
        path = np.stack([np.interp(tt, d, path[:, 0]), np.interp(tt, d, path[:, 1])], 1)
    return path


def landscape():
    mins = [newton3((0, 3.3)), newton3((0, -3.3))]
    sads = [newton3((5.8, 0)), newton3((-5.8, 0))]
    arc = [(0, 3.3), (3.6, 3.4), (5.8, 0), (3.6, -3.4), (0, -3.3)]
    path = string3([mins[0]] + arc[1:-1] + [mins[1]])
    x = np.linspace(-9, 9, 151); y = np.linspace(-7, 7, 118)
    XX, YY = np.meshgrid(x, y); Z = np.minimum(e3(XX, YY), -0.5)
    cmap = LinearSegmentedColormap.from_list("pes", [style.BLUE, "#8fa5f9", style.TINT[style.BLUE], "#ffffff"])
    fig, ax = plt.subplots(figsize=(7.2, 5.0))
    levels = np.r_[np.arange(-3.0, -1.05, 0.15), -1.02, -0.5]
    cf = ax.contourf(XX, YY, Z, levels=levels, cmap=cmap, extend="min"); cf.set_rasterized(True)
    cl = ax.contour(XX, YY, Z, levels=levels[:-2], colors="white", linewidths=0.6, alpha=0.9, negative_linestyles="solid")
    cl.set_rasterized(True)
    ax.plot(path[:, 0], path[:, 1], color=style.ORANGE, lw=2.4, zorder=4)
    for fx, fy in FIXED:
        ax.add_patch(Circle((fx, fy), 0.55, color=style.INK2, zorder=6))
    ax.text(0, -0.95, "fixed Ar–Ar pair, 3.82 Å apart", ha="center", va="top", fontsize=9, color=style.INK, zorder=7)
    ax.text(0, 0.95, "repulsive cores", ha="center", va="bottom", fontsize=9, color=style.INK2, zorder=7)
    for p in [(-7.0, 3.3), (6.6, -4.4), (2.2, 5.2), (-3.0, -5.6), (-6.6, -2.2)]:
        g = g3(np.array(p)); f = -g / np.linalg.norm(g) * 1.0
        ax.add_patch(FancyArrowPatch(p, (p[0] + f[0], p[1] + f[1]), arrowstyle="-|>", mutation_scale=11,
                                     color=style.PINK, lw=1.8, zorder=5))
    ax.text(-8.7, 6.4, "force $= -\\nabla E$ on the third atom\npoints downhill, across the contours", fontsize=9,
            color=style.PINK, ha="left", va="top", linespacing=1.3)
    for p, dy in zip(mins, (1, -1)):
        ax.plot(*p, "o", ms=8, color=style.INK, mec="white", mew=1.2, zorder=6)
        ax.annotate(f"minimum: equilateral triangle\nE = {e3(*p):.2f} kJ/mol", xy=p, xytext=(-6.6, p[1] + 0.9 * dy),
                    fontsize=9, color=style.INK, ha="left", va="center",
                    arrowprops=dict(arrowstyle="-", color=style.INK2, lw=0.8, shrinkA=2, shrinkB=5))
    for p in sads:
        ax.plot(*p, marker="X", ms=10, color=style.ORANGE, mec="white", mew=1.2, zorder=6)
    ax.annotate(f"saddle: linear chain\nE = {e3(*sads[0]):.2f} kJ/mol", xy=sads[0], xytext=(5.0, 2.9), fontsize=9,
                color=style.INK, ha="left", va="center",
                arrowprops=dict(arrowstyle="-", color=style.INK2, lw=0.8, shrinkA=2, shrinkB=6))
    ax.annotate("minimum energy path", xy=path[12], xytext=(3.3, 5.6), fontsize=9.5, color=style.ORANGE,
                fontweight="semibold", ha="left", va="center",
                arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.9, shrinkB=3))
    ax.set_xlim(x[0], x[-1]); ax.set_ylim(y[0], y[-1]); ax.set_aspect("equal")
    ax.set_xlabel("x of the third atom (Å)"); ax.set_ylabel("y of the third atom (Å)")
    style.save(fig, SLUG, "landscape")
    return mins, sads, path


# ---------------------------------------------------------------- time scales behind Born–Oppenheimer
def timescales():
    fig, ax = plt.subplots(figsize=(7.2, 2.7))
    ax.set_xscale("log"); ax.set_xlim(2e-17, 2e-11); ax.set_ylim(-1.25, 1.35)
    ax.axhline(0, color=style.INK3, lw=1.0)
    ax.axvspan(2e-17, 6e-16, color=style.TINT[style.VIOLET], lw=0, zorder=0)
    ax.axvspan(6e-16, 2e-11, color=style.TINT[style.TEAL], lw=0, zorder=0)
    ax.text(2.6e-17, -1.1, "electrons", color=style.VIOLET, fontsize=9.5, fontweight="semibold", va="center")
    ax.text(1.6e-11, -1.1, "nuclei", color=style.TEAL, fontsize=9.5, fontweight="semibold", va="center", ha="right")
    T_bohr = 2 * np.pi * 5.29177e-11 / 2.18769e6           # Bohr period of the hydrogen electron, s
    T_CH = 1 / (2.99792458e10 * 3000)                        # C–H stretch at 3000 cm^-1, s
    T_Ar = 1 / (2.99792458e10 * 26)                          # Ar2 harmonic vibration at 26 cm^-1, s
    items = [(T_bohr, f"electron circles\na hydrogen nucleus\n{T_bohr * 1e18:.0f} as", style.VIOLET, 1),
             (1e-15, "MD time step\n1 fs", style.INK2, -1),
             (T_CH, f"C–H stretch\nperiod {T_CH * 1e15:.0f} fs", style.ORANGE, 1),
             (2e-13, "retinal twists\nin rhodopsin\n200 fs", style.PINK, -1),
             (T_Ar, f"Ar₂ vibration\nperiod {T_Ar * 1e12:.1f} ps", style.BLUE, 1)]
    for t, lab, col, side in items:
        ax.plot([t, t], [0, 0.42 * side], color=col, lw=1.4)
        ax.plot(t, 0, "o", ms=8, color=col, mec="white", mew=1.2, zorder=4)
        ax.text(t, 0.5 * side, lab, ha="center", va="bottom" if side > 0 else "top", fontsize=9, color=style.INK,
                linespacing=1.25)
    ticks = [1e-17, 1e-16, 1e-15, 1e-14, 1e-13, 1e-12, 1e-11]
    ax.set_xticks(ticks, ["10 as", "100 as", "1 fs", "10 fs", "100 fs", "1 ps", "10 ps"])
    ax.minorticks_off()
    ax.set_yticks([]); ax.spines["left"].set_visible(False)
    ax.set_xlabel("time (logarithmic scale)")
    style.save(fig, SLUG, "timescales")
    return T_bohr, T_CH, T_Ar


# ---------------------------------------------------------------- anatomy of a force field (schematic)
def spring(ax, p, q, n=7, w=0.07, **kw):
    p, q = np.array(p), np.array(q); d = q - p; L = np.linalg.norm(d); u = d / L; nrm = np.array([-u[1], u[0]])
    s = np.linspace(0.18, 0.82, 2 * n + 1); pts = [p + 0.18 * d]
    for i, si in enumerate(s[1:-1]):
        pts.append(p + si * d + (w if i % 2 == 0 else -w) * nrm)
    pts.append(p + 0.82 * d)
    pts = np.array([p] + pts + [q])
    ax.plot(pts[:, 0], pts[:, 1], **kw)


def forcefield():
    fig, ax = plt.subplots(figsize=(7.2, 3.7))
    ax.set_xlim(0, 7.2); ax.set_ylim(0, 3.7); ax.set_aspect("equal"); ax.axis("off")
    C = np.array([[0.9, 1.0], [1.9, 1.95], [3.1, 1.5], [4.05, 2.45]])   # four united-atom carbons of butane
    spring(ax, C[0], C[1], color=style.BLUE, lw=2.0, zorder=2)
    for i in (1, 2):
        ax.plot(*C[i:i + 2].T, color=style.INK3, lw=5, solid_capstyle="round", zorder=1)
    # angle at site 2, drawn on the inside of the C1-C2-C3 angle
    a1 = np.degrees(np.arctan2(*(C[0] - C[1])[::-1])) % 360
    a2 = np.degrees(np.arctan2(*(C[2] - C[1])[::-1])) % 360
    ax.add_patch(Arc(C[1], 0.85, 0.85, theta1=a1, theta2=a2, color=style.TEAL, lw=2.4, zorder=3))
    # torsion: an elliptical arrow wrapped around the 2-3 bond
    mid = (C[1] + C[2]) / 2; u = (C[2] - C[1]) / np.linalg.norm(C[2] - C[1]); n = np.array([-u[1], u[0]])
    t = np.radians(np.linspace(40, 320, 80))
    ring = mid + np.outer(0.13 * np.cos(t), u) + np.outer(0.42 * np.sin(t), n)
    ax.plot(ring[:-3, 0], ring[:-3, 1], color=style.VIOLET, lw=2.0, zorder=3)
    ax.add_patch(FancyArrowPatch(ring[-4], ring[-1], arrowstyle="-|>", mutation_scale=13, color=style.VIOLET, lw=2.0, zorder=3))
    for i, p in enumerate(C):
        ax.add_patch(Circle(p, 0.2, color=style.INK2, zorder=4))
        ax.text(*p, f"{i + 1}", color="white", ha="center", va="center", fontsize=9, fontweight="semibold", zorder=5)
    # a water molecule with partial charges
    O = np.array([6.2, 0.9]); H1 = O + (-0.55, 0.42); H2 = O + (0.55, 0.42)
    for h in (H1, H2):
        ax.plot(*np.array([O, h]).T, color=style.INK3, lw=4, zorder=1)
        ax.add_patch(Circle(h, 0.14, color="white", ec=style.INK2, lw=1.4, zorder=4))
        ax.text(h[0], h[1] + 0.22, "δ+", ha="center", va="bottom", fontsize=9, color=style.INK2)
    ax.add_patch(Circle(O, 0.22, color=style.PINK, zorder=4))
    ax.text(O[0], O[1] - 0.32, "δ−", ha="center", va="top", fontsize=9, color=style.INK2)
    ax.plot([C[3][0] + 0.22, O[0] - 0.24], [C[3][1] - 0.08, O[1] + 0.08], color=style.ORANGE, lw=1.8, ls=(0, (4, 3)), zorder=2)

    ttl = dict(fontsize=9.5, fontweight="semibold", va="center")
    sub = dict(fontsize=9.5, color=style.INK2, va="center")
    ax.text(1.25, 2.55, "bond stretch", color=style.BLUE, ha="right", **ttl)
    ax.text(1.25, 2.22, r"$\frac{1}{2}k_b(b-b_0)^2$", ha="right", **sub)
    ax.text(1.95, 0.85, "angle bend", color=style.TEAL, ha="center", **ttl)
    ax.text(1.95, 0.52, r"$\frac{1}{2}k_\theta(\theta-\theta_0)^2$", ha="center", **sub)
    ax.text(2.55, 3.05, "torsion about the 2–3 bond", color=style.VIOLET, ha="center", **ttl)
    ax.text(2.55, 2.72, r"$k_\phi[1+\cos(n\phi-\delta)]$", ha="center", **sub)
    ax.text(5.05, 3.35, "non-bonded", color=style.ORANGE, ha="left", **ttl)
    ax.text(5.05, 3.02, "Lennard-Jones + Coulomb", ha="left", **sub)
    ax.text(5.05, 2.78, "between molecules, and between\natoms three or more bonds apart", ha="left", fontsize=9,
            color=style.INK2, va="top", linespacing=1.3)
    ax.text(3.6, 0.12, "Exclusions: pairs 1–2 and 1–3 get no non-bonded terms; the 1–4 pair gets scaled ones",
            ha="center", va="center", fontsize=9, color=style.INK2)
    style.save(fig, SLUG, "forcefield")


# ---------------------------------------------------------------- the butane torsion (Ryckaert–Bellemans)
RB = [9.28, 12.16, -13.12, -3.06, 26.24, -31.5]            # kJ/mol, GROMACS manual values


def v_rb(phi_deg):
    c = np.cos(np.radians(phi_deg) - np.pi)                # polymer convention: psi = phi - 180°
    return sum(cn * c ** n for n, cn in enumerate(RB))


def butane():
    phi = np.linspace(0, 360, 721); v = v_rb(phi)
    kT = 0.0083144626 * 300
    p = np.exp(-v / kT); p /= np.trapezoid(p, phi)
    tr = (phi >= 120) & (phi <= 240)
    f_trans = np.trapezoid(p[tr], phi[tr])
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(7.2, 4.9), sharex=True, gridspec_kw=dict(height_ratios=[1.25, 1], hspace=0.12))
    a1.plot(phi, v, color=style.VIOLET)
    a1.axhline(kT, color=style.INK3, lw=0.9, ls=(0, (3, 3)))
    a1.text(8, kT - 0.9, "$k_BT$ at 300 K", fontsize=9, color=style.INK3, ha="left", va="top")
    for x, lab, dy in [(180, "trans\n0", 4), (60, "gauche\n{:.1f}".format(v_rb(60)), 4), (300, "gauche\n{:.1f}".format(v_rb(300)), 4)]:
        a1.text(x, v_rb(x) + dy, lab, ha="center", va="bottom", fontsize=9, color=style.INK, linespacing=1.2)
    a1.text(120, v_rb(120) + 2.5, f"barrier {v_rb(120):.1f}", ha="center", va="bottom", fontsize=9, color=style.INK2)
    a1.text(240, v_rb(240) + 2.5, f"barrier {v_rb(240):.1f}", ha="center", va="bottom", fontsize=9, color=style.INK2)
    a1.text(6, v_rb(0) + 1.5, f"cis {v_rb(0):.1f}", ha="left", va="bottom", fontsize=9, color=style.INK)
    a1.set_ylabel("torsion energy (kJ/mol)"); a1.set_ylim(-4, 55)
    a2.fill_between(phi, p, where=tr, color=style.TINT[style.BLUE], lw=0)
    a2.fill_between(phi, p, where=~tr, color=style.TINT[style.ORANGE], lw=0)
    a2.plot(phi, p, color=style.INK2, lw=1.6)
    a2.text(198, p.max() * 0.62, f"trans\n{100 * f_trans:.0f} %", ha="left", va="center", fontsize=10, color=style.BLUE,
            fontweight="semibold")
    for x in (60, 300):
        a2.text(x, p.max() * 0.62, f"gauche\n{50 * (1 - f_trans):.1f} %", ha="center", va="center", fontsize=9.5,
                color=style.ORANGE, fontweight="semibold")
    a2.set_ylabel("probability at 300 K\n(per degree)"); a2.set_ylim(0, p.max() * 1.12)
    a2.set_xlabel("dihedral angle φ (degrees)"); a2.set_xlim(0, 360); a2.set_xticks(range(0, 361, 60))
    style.save(fig, SLUG, "butane")
    return f_trans


# ---------------------------------------------------------------- cover: a contour map with two basins and a pass
def cover():
    def draw(ax):
        x = np.linspace(0, 4, 161); y = np.linspace(0, 3, 121); XX, YY = np.meshgrid(x, y)
        Z = (-1.0 * np.exp(-((XX - 1.15) ** 2 / 0.55 + (YY - 1.75) ** 2 / 0.45))
             - 0.8 * np.exp(-((XX - 2.85) ** 2 / 0.5 + (YY - 1.2) ** 2 / 0.5))
             + 0.05 * ((XX - 2) ** 2 + (YY - 1.5) ** 2) * 0.4)
        cols = ["#3653d6", style.BLUE, "#7d94f8", "#a6b7fa", "#ccd6fc", style.TINT[style.BLUE]]
        ax.contourf(XX, YY, Z, levels=[-2, -0.85, -0.65, -0.47, -0.3, -0.15, 2], colors=cols)
        ax.contour(XX, YY, Z, levels=[-0.85, -0.65, -0.47, -0.3, -0.15], colors="white", linewidths=1.6)
        t = np.linspace(0, 1, 200)
        px = 1.15 + 1.7 * t; py = 1.75 - 0.55 * t + 0.42 * np.sin(np.pi * t)
        ax.plot(px, py, color=style.ORANGE, lw=4, ls=(0, (1.2, 1.4)), solid_capstyle="round", dash_capstyle="round")
        ax.add_patch(Circle((px[100], py[100] + 0.02), 0.17, color=style.ORANGE, ec="white", lw=2.5, zorder=5))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    mins, sads, path = landscape()
    for p in mins + sads:
        print(f"  stationary point ({p[0]:.3f}, {p[1]:.3f})  E = {e3(*p):.3f} kJ/mol = {e3(*p) / EPS:.3f} eps"
              f"  Hessian eigenvalues {np.linalg.eigvalsh(h3(p)).round(3)} kJ/mol/A^2")
    print(f"  path maximum {e3(path[:, 0], path[:, 1]).max():.3f} kJ/mol")
    tb, tch, tar = timescales()
    print(f"  Bohr period {tb * 1e18:.0f} as, C–H period {tch * 1e15:.1f} fs, Ar2 period {tar * 1e12:.2f} ps, ratio {tch / tb:.0f}")
    forcefield()
    ft = butane()
    print(f"  butane: gauche {v_rb(60):.2f} kJ/mol, barrier {v_rb(120):.2f}, cis {v_rb(0):.1f}, trans fraction {ft:.3f}")
    cover()
