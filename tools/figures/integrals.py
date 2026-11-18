"""Static figures for content/learn/integrals.md.  Run: python3 tools/figures/integrals.py"""
import os, sys
from math import erfc, pi, sqrt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import matplotlib.patches as mp
import style
plt = style.setup()
SLUG = "integrals"


def parts():
    """Integration by parts as areas: the two shaded regions together make u2 v2 - u1 v1."""
    u1, u2 = 1.0, 3.0
    v = lambda u: 0.45 + 0.3 * u ** 2
    v1, v2 = v(u1), v(u2)
    uu = np.linspace(u1, u2, 200)
    fig, ax = plt.subplots(figsize=(5.6, 4.0))
    ax.fill_between(uu, 0, v(uu), color=style.TINT[style.GOLD], lw=0)
    ax.fill_betweenx(v(uu), 0, uu, color=style.TINT[style.BLUE], lw=0)
    ax.plot(uu, v(uu), color=style.INK, lw=2.4)
    ax.plot([0, u2, u2], [v2, v2, 0], color=style.INK2, lw=1, ls="--")
    ax.plot([0, u1, u1], [v1, v1, 0], color=style.INK2, lw=1, ls="--")
    for (pu, pv) in [(u1, v1), (u2, v2)]:
        ax.plot(pu, pv, "o", ms=7, color=style.INK, mec="white", mew=1.2, zorder=5)
    ax.text(2.25, 0.85, "∫ v du", fontsize=13, color="#9a7400", ha="center", fontweight="semibold")
    ax.text(0.95, 2.45, "∫ u dv", fontsize=13, color=style.BLUE, ha="center", fontweight="semibold")
    ax.text(u1 + 0.1, v1 - 0.12, "(u₁, v₁)", fontsize=9, color=style.INK, va="top")
    ax.text(u2 - 0.06, v2 + 0.1, "(u₂, v₂)", fontsize=9, color=style.INK, ha="right")
    ax.text(3.15, 1.6, "blue + gold\n= u₂v₂ − u₁v₁\n(big rectangle\nminus small one)", fontsize=9, color=style.INK2, va="center")
    ax.set_xlim(0, 4.3); ax.set_ylim(0, 3.6)
    ax.set_xticks([u1, u2]); ax.set_xticklabels(["u₁", "u₂"])
    ax.set_yticks([v1, v2]); ax.set_yticklabels(["v₁", "v₂"])
    ax.set_xlabel("u"); ax.set_ylabel("v")
    style.save(fig, SLUG, "parts")


def polar():
    """The Gaussian integral: rings of area 2 pi r dr turn exp(-r^2) into something with an antiderivative."""
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.4), gridspec_kw=dict(width_ratios=[1, 1.25], wspace=0.35))
    levels = np.linspace(0, 1, 9)
    g = np.linspace(-2.2, 2.2, 121)
    X, Y = np.meshgrid(g, g)
    from matplotlib.colors import LinearSegmentedColormap
    cmap = LinearSegmentedColormap.from_list("w2v", ["#ffffff", style.TINT[style.VIOLET], style.VIOLET])
    a1.contourf(X, Y, np.exp(-(X ** 2 + Y ** 2)), levels=levels, cmap=cmap)
    r, dr = 1.0, 0.16
    a1.add_patch(mp.Annulus((0, 0), r + dr / 2, dr, fc=style.ORANGE, ec="none", alpha=0.9))
    a1.annotate("ring of radius r,\nwidth dr: area 2πr dr", xy=(-0.72, 0.72), xytext=(-2.1, 1.55), fontsize=9,
                color=style.ORANGE,
                arrowprops=dict(arrowstyle="-|>", color=style.ORANGE, lw=1, shrinkB=2))
    a1.set_aspect("equal"); a1.set_xlim(-2.2, 2.2); a1.set_ylim(-2.2, 2.2)
    a1.set_xticks([-2, 0, 2]); a1.set_yticks([-2, 0, 2]); a1.set_xlabel("x"); a1.set_ylabel("y")
    a1.set_title("e^(−x²−y²) over the plane")
    rr = np.linspace(0, 3, 600)
    f = 2 * np.pi * rr * np.exp(-rr ** 2)
    a2.fill_between(rr, 0, f, color=style.TINT[style.ORANGE], lw=0)
    a2.plot(rr, f, color=style.ORANGE, lw=2.2)
    a2.plot(rr, np.pi * np.exp(-rr ** 2), color=style.INK3, lw=1.4, ls="--")
    area = np.trapezoid(f, rr)
    a2.annotate(f"area out to r = 3:\nπ(1 − e⁻⁹) = {area:.4f}", xy=(0.85, 0.9), xytext=(1.45, 1.6), fontsize=9,
                color=style.ORANGE, arrowprops=dict(arrowstyle="-|>", color=style.ORANGE, lw=1))
    a2.text(0.12, 3.25, "π e^(−r²): its slope is\nminus the orange curve", fontsize=9, color=style.INK2)
    a2.set_xlim(0, 3); a2.set_ylim(0, 3.6)
    a2.set_xlabel("radius r"); a2.set_ylabel("2πr e^(−r²)")
    a2.set_title("Ring by ring")
    style.save(fig, SLUG, "polar")
    return area


def quadrature():
    """Error of four rules on the integral of e^x from 0 to 1, and the cost of a grid as dimension grows."""
    exact = np.e - 1
    ns = 2 ** np.arange(1, 11)
    L, T, S = [], [], []
    for n in ns:
        h = 1.0 / n
        x = np.linspace(0, 1, n + 1); fx = np.exp(x)
        L.append(abs(h * fx[:-1].sum() - exact))
        T.append(abs(h * (fx.sum() - 0.5 * (fx[0] + fx[-1])) - exact))
        S.append(abs(h / 3 * (fx[0] + fx[-1] + 4 * fx[1:-1:2].sum() + 2 * fx[2:-1:2].sum()) - exact))
    rng = np.random.default_rng(1)
    MC = [np.sqrt(np.mean([(np.exp(rng.random(n)).mean() - exact) ** 2 for _ in range(400)])) for n in ns]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.5), gridspec_kw=dict(wspace=0.42))
    pos = {0.5: (1400, 0.05), 1: (1400, 6e-4), 2: (1400, 1.4e-7), 4: (2.2, 1e-12)}
    for err, lab, c, p in [(L, "left edge (h)", style.PINK, 1), (T, "trapezoid (h²)", style.BLUE, 2),
                           (S, "Simpson (h⁴)", style.TEAL, 4), (MC, "Monte Carlo (1/√n)", style.ORANGE, 0.5)]:
        a1.loglog(ns, err, "o-", color=c, ms=4, lw=1.6)
        a1.text(*pos[p], lab, color=c, fontsize=9, va="center", fontweight="semibold")
    a1.set_xlim(1.5, 2.2e4); a1.set_ylim(1e-15, 3)
    a1.set_xlabel("function evaluations n"); a1.set_ylabel("absolute error")
    a1.set_title("∫₀¹ eˣ dx in one dimension")
    a1.set_yticks([1e-12, 1e-9, 1e-6, 1e-3, 1])
    d = np.arange(1, 13)
    eps = 1e-4
    a2.semilogy(d, (1 / eps) ** (d / 2), "o-", color=style.BLUE, ms=4, lw=1.6)
    a2.semilogy(d, (1 / eps) ** (d / 4), "o-", color=style.TEAL, ms=4, lw=1.6)
    a2.semilogy(d, np.full(d.size, (1 / eps) ** 2), "o-", color=style.ORANGE, ms=4, lw=1.6)
    a2.text(1.6, 1e17, "trapezoid grid", color=style.BLUE, fontsize=9, fontweight="semibold")
    a2.text(9.2, 1e5, "Simpson grid", color=style.TEAL, fontsize=9, fontweight="semibold")
    a2.text(0.9, 1.5e10, "Monte Carlo", color=style.ORANGE, fontsize=9, fontweight="semibold")
    a2.set_xlabel("dimension d"); a2.set_ylabel("evaluations for error 10⁻⁴")
    a2.set_title("Cost against dimension")
    a2.set_xticks([1, 2, 4, 6, 8, 10, 12]); a2.set_ylim(1, 1e25); a2.set_yticks([1, 1e5, 1e10, 1e15, 1e20, 1e25])
    a2.axvline(4, color=style.INK3, lw=0.8, ls=":"); a2.axvline(8, color=style.INK3, lw=0.8, ls=":")
    style.save(fig, SLUG, "quadrature")
    return dict(L=L, T=T, S=S, MC=MC)


def maxwell():
    """Speed distribution of N2 at 300 K and 600 K; the shaded tail is the fraction faster than 1000 m/s."""
    kB, u = 1.380649e-23, 1.66053907e-27
    m = 28.0134 * u
    v = np.linspace(0, 2000, 801)
    fig, ax = plt.subplots(figsize=style.WIDE)
    out = {}
    for T, c, ls in [(300, style.BLUE, "-"), (600, style.ORANGE, "-")]:
        a = m / (2 * kB * T)
        f = 4 * np.pi * (a / np.pi) ** 1.5 * v ** 2 * np.exp(-a * v ** 2)
        sel = v >= 1000
        tail = np.trapezoid(f[sel], v[sel])
        x = 1000 * sqrt(a)
        out[T] = (tail, erfc(x) + 2 * x / sqrt(pi) * np.exp(-x * x), sqrt(2 * kB * T / m), sqrt(8 * kB * T / (pi * m)))
        ax.fill_between(v[sel], 0, f[sel] * 1000, color=c, alpha=0.25, lw=0)
        ax.plot(v, f * 1000, color=c, lw=2.2, ls=ls)
    vp = out[300][2]
    ax.text(vp, 2.12, f"300 K: peak at {vp:.0f} m/s", color=style.BLUE, fontsize=9, ha="center")
    ax.text(out[600][2] + 60, 1.52, f"600 K: peak at {out[600][2]:.0f} m/s", color=style.ORANGE, fontsize=9)
    ax.annotate(f"faster than 1000 m/s:\n{100 * out[300][0]:.1f} % at 300 K,  {100 * out[600][0]:.1f} % at 600 K",
                xy=(1150, 0.22), xytext=(1250, 0.95), fontsize=9, color=style.INK,
                arrowprops=dict(arrowstyle="-|>", color=style.INK3, lw=1, shrinkB=3))
    ax.axvline(1000, color=style.INK3, lw=0.8, ls=":")
    ax.set_xlim(0, 2000); ax.set_ylim(0, 2.3)
    ax.set_xlabel("molecular speed v (m/s)"); ax.set_ylabel("probability density (per km/s)")
    style.save(fig, SLUG, "maxwell")
    return out


def cover():
    def draw(ax):
        # Riemann strips under a curve: area as a sum of thin rectangles
        f = lambda x: 0.55 + 1.55 * np.exp(-((x - 1.7) / 0.95) ** 2) + 0.25 * x
        xs = np.linspace(0.35, 3.65, 12)
        w = xs[1] - xs[0]
        cols = [style.GOLD, style.ORANGE]
        for i, x0 in enumerate(xs[:-1]):
            ax.add_patch(mp.Rectangle((x0, 0.35), w * 0.86, f(x0 + w / 2) - 0.35, fc=cols[i % 2], ec="none"))
        x = np.linspace(0.2, 3.8, 300)
        ax.plot(x, f(x), color=style.BLUE, lw=6, solid_capstyle="round")
        ax.plot([0.2, 3.8], [0.35, 0.35], color=style.INK2, lw=4, solid_capstyle="round")
    style.cover(SLUG, draw, bg=style.TINT[style.GOLD])


if __name__ == "__main__":
    parts()
    print("polar area:", polar())
    q = quadrature()
    for k, e in q.items():
        print(k, " ".join(f"{z:.2e}" for z in e))
    for T, (tail, an, vp, vm) in maxwell().items():
        print(f"N2 {T} K: tail {tail:.5f} (formula {an:.5f}), most probable {vp:.0f}, mean {vm:.0f} m/s")
    cover()
