"""Figures for content/learn/liquids-and-structure.md.  Run: python3 tools/figures/liquids-and-structure.py
Hard spheres of diameter σ = 1; packing fraction η = πρσ³/6 (3D) or φ = πρσ²/4 (2D)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import Circle, Wedge, Rectangle
plt = style.setup()
SLUG = "liquids-and-structure"


def py_hard_spheres(eta, rmax=6.0, nr=1500, qmax=120.0, nq=8000):
    """Percus–Yevick hard spheres. The direct correlation function c(r) inside the core is known in closed form
    (Wertheim 1963, Thiele 1963); S(q) = 1/(1 − ρĉ(q)); g(r) = 1 + γ(r) outside the core, with γ = h − c
    obtained by a numerical Fourier transform of ργ̂ = ρ²ĉ²/(1 − ρĉ)·(1/ρ), which decays fast."""
    rho = 6 * eta / np.pi
    l1 = (1 + 2 * eta) ** 2 / (1 - eta) ** 4; l2 = -(1 + eta / 2) ** 2 / (1 - eta) ** 4
    x = np.linspace(0, 1, 4001)
    c = -l1 - 6 * eta * l2 * x - 0.5 * eta * l1 * x ** 3
    q = np.linspace(1e-4, qmax, nq)
    ck = 4 * np.pi * np.trapezoid(x[None, :] ** 2 * c[None, :] * np.sinc(q[:, None] * x[None, :] / np.pi), x, axis=1)
    S = 1 / (1 - rho * ck)
    gk = rho * ck ** 2 / (1 - rho * ck)
    r = np.linspace(1.0, rmax, nr)
    gam = np.trapezoid((q ** 2 * gk)[None, :] * np.sinc(q[None, :] * r[:, None] / np.pi), q, axis=1) / (2 * np.pi ** 2)
    return r, 1 + gam, q, S


def hard_disks(N=196, phi=0.6, sweeps=400, seed=5):
    """Metropolis MC of 2D hard disks in a periodic square box; returns box length and a list of frames."""
    L = np.sqrt(N * np.pi / 4 / phi)
    n = int(np.ceil(np.sqrt(N))); a = L / n
    pos = np.array([[(i + 0.5 * (j % 2)) * a, j * a] for j in range(n) for i in range(n)])[:N] + 0.01
    rng = np.random.default_rng(seed); frames = []
    for sw in range(sweeps):
        for k in rng.permutation(N):
            new = (pos[k] + rng.uniform(-0.12, 0.12, 2)) % L
            d = pos - new; d -= L * np.round(d / L)
            r2 = (d ** 2).sum(1); r2[k] = 10
            if r2.min() >= 1.0: pos[k] = new
        if sw >= 100 and sw % 3 == 0: frames.append(pos.copy())
    return L, frames


def counting_shells():
    L, frames = hard_disks()
    N = frames[0].shape[0]; rho = N / L ** 2
    dr = 0.1; edges = np.arange(0, L / 2 + 1e-9, dr); mid = 0.5 * (edges[1:] + edges[:-1])
    H = np.zeros(mid.size)
    for p in frames:
        d = p[:, None, :] - p[None, :, :]; d -= L * np.round(d / L); r = np.sqrt((d ** 2).sum(-1))
        H += np.histogram(r[np.triu_indices(N, 1)], edges)[0] * 2.0
    per = H / (len(frames) * N)                      # neighbours per particle in each shell
    ideal = rho * 2 * np.pi * mid * dr
    g = per / ideal
    rmin = mid[(mid > 1.2) & (mid < 1.8)][np.argmin(g[(mid > 1.2) & (mid < 1.8)])]
    fig = plt.figure(figsize=(7.2, 3.7))
    a = fig.add_axes([0.0, 0.03, 0.47, 0.94]); b = fig.add_axes([0.6, 0.63, 0.39, 0.33]); c = fig.add_axes([0.6, 0.1, 0.39, 0.33])
    p = frames[-1]
    t = np.argmin(((p - L / 2) ** 2).sum(1)); p = (p - p[t] + L / 2) % L       # centre the tagged particle
    a.set_xlim(0, L); a.set_ylim(0, L); a.set_aspect("equal"); a.axis("off")
    a.add_patch(Rectangle((0, 0), L, L, fill=False, ec=style.INK3, lw=1))
    c0 = np.array([L / 2, L / 2]); rr = np.sqrt(((p - c0) ** 2).sum(1))
    r_shell = 3.0
    a.add_patch(Wedge(c0, r_shell + 0.25, 0, 360, width=0.5, color=style.TINT[style.GOLD], zorder=0))
    for k in range(N):
        if k == t: col = style.PINK
        elif rr[k] < rmin: col = style.TEAL
        elif abs(rr[k] - r_shell) < 0.25: col = style.GOLD
        else: col = "#d5dae4"
        a.add_patch(Circle(p[k], 0.5, color=col, lw=0, zorder=2))
    a.add_patch(Circle(c0, rmin, fill=False, ec=style.TEAL, lw=1.2, ls=(0, (3, 2)), zorder=3))
    a.add_patch(Circle(c0, L / 2, fill=False, ec=style.INK3, lw=1, ls=(0, (4, 3)), zorder=3))
    a.text(L / 2, L + 0.35, "tagged disk (pink); first shell inside the first minimum (teal);\na thin shell at r = 3σ (gold); dashed outer circle: r = L/2",
           ha="center", va="bottom", fontsize=8.5, color=style.INK2)
    b.bar(mid, per, width=dr * 0.9, color=style.GOLD, lw=0)
    b.plot(mid, ideal, color=style.INK2, lw=1.4)
    b.text(0.3, per.max() * 1.0, "line: ideal gas, $\\rho\\,2\\pi r\\,\\Delta r$", ha="left", va="top", fontsize=8.5, color=style.INK2)
    b.set_xlim(0, L / 2); b.set_ylim(0, per.max() * 1.1); b.set_ylabel("neighbours\nper shell")
    b.set_title("1. Count neighbours in each shell", fontsize=9.5)
    c.plot(mid, g, color=style.TEAL, lw=1.6); c.axhline(1, color=style.INK3, lw=0.9, ls=(0, (4, 3)))
    c.set_xlim(0, L / 2); c.set_ylim(0, g.max() * 1.1); c.set_xlabel("r / σ"); c.set_ylabel("g(r)")
    c.set_title("2. Divide by the ideal-gas count", fontsize=9.5)
    style.save(fig, SLUG, "counting-shells")
    n1 = rho * np.sum(g[mid < rmin] * 2 * np.pi * mid[mid < rmin] * dr)
    return rmin, n1, L


def hard_sphere_structure():
    fig, (a, b) = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.3))
    out = {}
    for eta, col in [(0.2, style.BLUE), (0.35, style.VIOLET), (0.49, style.PINK)]:
        r, g, q, S = py_hard_spheres(eta)
        out[eta] = (g[0], S[0], S.max(), q[S.argmax()])
        a.plot(np.r_[0, 1, r], np.r_[0, 0, g], color=col, lw=1.6)
        b.plot(q, S, color=col, lw=1.6)
        a.text(2.9, {0.2: 3.6, 0.35: 4.1, 0.49: 4.6}[eta], f"η = {eta:.2f}", color=col, fontsize=9, weight="semibold", va="center", ha="left")
    a.axhline(1, color=style.INK3, lw=0.9, ls=(0, (4, 3)))
    a.set_xlim(0, 4); a.set_ylim(0, 5.2); a.set_xlabel("r / σ"); a.set_ylabel("g(r)")
    a.set_title("Radial distribution function", fontsize=10)
    b.axhline(1, color=style.INK3, lw=0.9, ls=(0, (4, 3)))
    b.set_xlim(0, 20); b.set_ylim(0, 3.3); b.set_xlabel("qσ"); b.set_ylabel("S(q)")
    b.annotate(f"S(0) = {out[0.49][1]:.3f}", (0.2, out[0.49][1]), xytext=(9, 0.3), textcoords="data", fontsize=8.5, color=style.PINK,
               arrowprops=dict(arrowstyle="-", color=style.PINK, lw=0.8))
    b.annotate(f"peak {out[0.49][2]:.2f} at qσ = {out[0.49][3]:.1f}", (out[0.49][3], out[0.49][2]), xytext=(12, -2), textcoords="offset points",
               fontsize=8.5, color=style.PINK, va="center")
    b.set_title("Structure factor", fontsize=10)
    style.save(fig, SLUG, "hard-sphere-structure")
    return out


def hard_sphere_pmf():
    fig, ax = plt.subplots(figsize=(7.2, 3.2))
    r, g, _, _ = py_hard_spheres(0.45)
    w = -np.log(g)
    ax.add_patch(Rectangle((0, -2), 1, 4, color=style.TINT[style.BLUE], lw=0))
    ax.text(0.5, 1.15, "pair potential:\ninfinite for r < σ,\nzero beyond", ha="center", va="center", fontsize=8.5, color=style.BLUE)
    ax.plot([1, 1], [-2, 2], color=style.BLUE, lw=1.6); ax.plot([1, 4], [0, 0], color=style.BLUE, lw=1.6)
    ax.plot(r, w, color=style.ORANGE, lw=2)
    i1 = 0; ib = np.argmax(w[(r < 1.8)]); i2 = np.argmin(np.where((r > 1.8) & (r < 2.3), w, 9))
    ax.annotate(f"contact well, {w[i1]:.2f} $k_BT$", (r[i1], w[i1]), xytext=(25, -6), textcoords="offset points", fontsize=8.5, color=style.INK2, va="center",
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    ax.annotate(f"barrier, +{w[ib]:.2f} $k_BT$", (r[ib], w[ib]), xytext=(0, 22), textcoords="offset points", fontsize=8.5, color=style.INK2, ha="center",
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    ax.annotate(f"second well at {r[i2]:.2f}σ", (r[i2], w[i2]), xytext=(10, -22), textcoords="offset points", fontsize=8.5, color=style.INK2,
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    ax.text(3.95, 1.45, "w(r) = −$k_BT$ ln g(r), hard spheres at η = 0.45", color=style.ORANGE, fontsize=9, ha="right", va="bottom", weight="semibold")
    ax.set_xlim(0, 4); ax.set_ylim(-1.7, 1.8); ax.set_xlabel("r / σ"); ax.set_ylabel("energy ($k_BT$)")
    style.save(fig, SLUG, "hard-sphere-pmf")
    return w[i1], w[ib], r[i2]


def eos_routes():
    eta = np.linspace(0, 0.55, 300)
    zv = (1 + 2 * eta + 3 * eta ** 2) / (1 - eta) ** 2
    zc = (1 + eta + eta ** 2) / (1 - eta) ** 3
    zcs = (1 + eta + eta ** 2 - eta ** 3) / (1 - eta) ** 3
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    ax.axvspan(0.494, 0.545, color=style.TINT[style.GOLD], lw=0)
    ax.text(0.5195, 2.2, "fluid–solid\ncoexistence", fontsize=8.5, color=style.INK2, ha="center", rotation=90, va="bottom")
    ax.plot(eta, zc, color=style.VIOLET); ax.plot(eta, zcs, color=style.INK, lw=1.4, ls=(0, (4, 2))); ax.plot(eta, zv, color=style.TEAL)
    pts = np.array([0.1, 0.2, 0.3, 0.4, 0.45])
    gc = np.array([py_hard_spheres(e, nr=2, nq=4000)[1][0] for e in pts])
    ax.plot(pts, 1 + 4 * pts * gc, "o", color=style.TEAL, mec="white", mew=1.2, ms=6.5, zorder=5)
    ax.text(0.43, 15.2, "PY, compressibility route", color=style.VIOLET, fontsize=9, ha="right", weight="semibold")
    ax.text(0.47, 11.5, "Carnahan–Starling", color=style.INK, fontsize=9, ha="right")
    ax.text(0.12, 8.0, "PY, virial route; dots: 1 + 4η g(σ⁺)\nfrom the computed g(r)", color=style.TEAL, fontsize=9, ha="left", va="top", weight="semibold")
    ax.set_xlim(0, 0.55); ax.set_ylim(0, 20); ax.set_xlabel("packing fraction η"); ax.set_ylabel("compressibility factor $\\beta P/\\rho$")
    style.save(fig, SLUG, "eos-routes")
    return dict(zv=(1 + 2 * .49 + 3 * .49 ** 2) / (.51) ** 2, zc=(1 + .49 + .49 ** 2) / .51 ** 3, zcs=(1 + .49 + .49 ** 2 - .49 ** 3) / .51 ** 3)


def cover():
    def draw(ax):
        c0 = np.array([2.0, 1.5]); R = 0.21; rng = np.random.default_rng(3)
        for rad in (0.72, 1.22):
            ax.add_patch(Circle(c0, rad, fill=False, ec=style.INK3, lw=1.6, ls=(0, (4, 3)), zorder=1))
        ax.add_patch(Circle(c0, R, color=style.PINK, zorder=3))
        for k in range(6):
            a = k * np.pi / 3 + 0.1 + rng.normal(0, 0.06)
            ax.add_patch(Circle(c0 + 0.5 * np.array([np.cos(a), np.sin(a)]) * (1 + rng.normal(0, 0.03)), R, color=style.TEAL, zorder=3))
        for k in range(12):
            a = k * np.pi / 6 + 0.25 + rng.normal(0, 0.03)
            ax.add_patch(Circle(c0 + (0.95 + rng.normal(0, 0.03)) * np.array([np.cos(a), np.sin(a)]), R, color=style.BLUE, zorder=3, alpha=0.85))
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    print("2D disks: first minimum, n1, L =", counting_shells())
    print("PY structure:", hard_sphere_structure())
    print("PMF:", hard_sphere_pmf())
    print("EOS at 0.49:", eos_routes())
    cover()
