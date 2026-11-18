"""Static figures for content/learn/functions-and-graphs.md.  Run: python3 tools/figures/functions-and-graphs.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import matplotlib.patches as mp
import style
plt = style.setup()
SLUG = "functions-and-graphs"


def anatomy():
    """The features of a graph, all on one curve: f(x) = (x^2 - 1) e^(-x)."""
    f = lambda x: (x * x - 1) * np.exp(-x)
    x = np.linspace(-1.32, 9.5, 800)
    y = f(x)
    xmin, xmax = 1 - np.sqrt(2), 1 + np.sqrt(2)            # stationary points: x^2 - 2x - 1 = 0
    fig, ax = plt.subplots(figsize=(7.2, 3.9))
    ax.axhline(0, color=style.INK3, lw=0.8, zorder=1)
    ax.axvline(0, color=style.INK3, lw=0.8, zorder=1)
    # rising and falling stretches in two colours
    for lo, hi, c in [(-1.32, xmin, style.ORANGE), (xmin, xmax, style.BLUE), (xmax, 9.5, style.ORANGE)]:
        m = (x >= lo) & (x <= hi)
        ax.plot(x[m], y[m], color=c, lw=2.4, zorder=3)
    # asymptote: highlight y = 0 on the right
    ax.plot([4.2, 9.5], [0, 0], color=style.TEAL, lw=2.2, ls=(0, (4, 3)), zorder=2)
    ax.annotate("asymptote: the curve creeps towards y = 0\nbut never reaches it", xy=(7.6, 0.02), xytext=(5.6, 0.95),
                fontsize=9, color=style.TEAL, ha="left",
                arrowprops=dict(arrowstyle="-|>", color=style.TEAL, lw=1, shrinkB=2))
    pts = [
        (0, f(0), "intercept f(0) = −1", (0.35, -1.75), style.INK),
        (-1, 0, "root", (-1.15, 0.9), style.INK),
        (1, 0, "root", (0.55, 0.9), style.INK),
        (xmin, f(xmin), "local minimum", (-1.25, -2.35), style.VIOLET),
        (xmax, f(xmax), "local maximum", (2.0, 1.45), style.VIOLET),
    ]
    for px, py, lab, (tx, ty), c in pts:
        ax.plot(px, py, "o", ms=7, color=c, mec="white", mew=1.2, zorder=5)
        ax.annotate(lab, xy=(px, py), xytext=(tx, ty), fontsize=9, color=c,
                    arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkA=2, shrinkB=5))
    # horizontal tangents at the extrema
    for px in (xmin, xmax):
        ax.plot([px - 0.55, px + 0.55], [f(px)] * 2, color=style.VIOLET, lw=1.2, ls=":", zorder=4)
    ax.text(-0.95, 2.2, "falling", color=style.ORANGE, fontsize=9, fontweight="semibold")
    ax.text(0.9, -0.55, "rising", color=style.BLUE, fontsize=9, fontweight="semibold", rotation=38)
    ax.text(3.35, 0.47, "falling", color=style.ORANGE, fontsize=9, fontweight="semibold", rotation=-18)
    ax.text(9.3, 2.55, r"$f(x) = (x^2 - 1)\,e^{-x}$", fontsize=11, ha="right", color=style.INK)
    ax.set_xlim(-1.6, 9.6); ax.set_ylim(-2.6, 3.0)
    ax.set_xlabel("input x"); ax.set_ylabel("output f(x)")
    ax.set_xticks(range(-1, 10)); ax.set_yticks([-2, -1, 0, 1, 2, 3])
    style.save(fig, SLUG, "anatomy")


def unitcircle():
    """The point on the unit circle at angle theta, and its height traced out as sin(theta)."""
    from matplotlib.patches import ConnectionPatch
    th0 = 1.0                                      # one radian: the arc is as long as the radius
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(width_ratios=[1.75, 2.0], wspace=0.02))
    for a in (a1, a2):
        a.set_ylim(-1.35, 1.35); a.axis("off")
    a1.set_xlim(-1.25, 2.0); a1.set_aspect("equal")
    t = np.linspace(0, 2 * np.pi, 400)
    a1.plot(np.cos(t), np.sin(t), color=style.INK3, lw=1.2)
    a1.plot([-1.2, 1.2], [0, 0], color=style.INK3, lw=0.8)
    a1.plot([0, 0], [-1.2, 1.2], color=style.INK3, lw=0.8)
    ta = np.linspace(0, th0, 60)
    a1.plot(np.cos(ta), np.sin(ta), color=style.TEAL, lw=4.5, solid_capstyle="butt", zorder=3)
    px, py = np.cos(th0), np.sin(th0)
    a1.plot([0, px], [0, py], color=style.INK2, lw=1.4)                       # radius
    a1.plot([px, px], [0, py], color=style.ORANGE, lw=2.8, zorder=4)           # sin
    a1.plot([0, px], [0, 0], color=style.BLUE, lw=2.8, zorder=4)               # cos
    a1.plot(px, py, "o", ms=8, color=style.INK, mec="white", mew=1.2, zorder=6)
    am = 0.5 * th0
    a1.text(1.1 * np.cos(am), 1.1 * np.sin(am), "arc length θ", color=style.TEAL, fontsize=9, fontweight="semibold", va="center")
    a1.text(px + 0.1, 0.42 * py / 0.84, "sin θ", color=style.ORANGE, fontsize=9, fontweight="semibold",
            va="center", ha="center", rotation=90)
    a1.text(0.27, -0.16, "cos θ", color=style.BLUE, fontsize=9, fontweight="semibold", ha="center", va="center")
    a1.text(0.08, 0.66, "1", color=style.INK2, fontsize=9, ha="center")
    a1.annotate("", xy=(np.cos(2.35), np.sin(2.35)), xytext=(np.cos(1.75), np.sin(1.75)),
                arrowprops=dict(arrowstyle="-|>", color=style.INK3, lw=1.2, connectionstyle="arc3,rad=0.12"))
    # the sine graph
    a2.set_xlim(-0.25, 2 * np.pi + 1.25)
    a2.plot([0, 2 * np.pi + 0.3], [0, 0], color=style.INK3, lw=0.8)
    a2.plot([0, 0], [-1.15, 1.15], color=style.INK3, lw=0.8)
    a2.plot(t, np.sin(t), color=style.ORANGE, lw=2.2)
    a2.plot([th0] * 2, [0, py], color=style.ORANGE, lw=2.8)
    a2.plot(th0, py, "o", ms=8, color=style.INK, mec="white", mew=1.2, zorder=6)
    # give the sine panel exactly the height of the circle panel, so both share one vertical scale
    fig.canvas.draw()
    p1, p2 = a1.get_position(), a2.get_position()
    a2.set_position([p2.x0, p1.y0, p2.width, p1.height])
    fig.add_artist(ConnectionPatch(xyA=(px, py), coordsA=a1.transData, xyB=(th0, py), coordsB=a2.transData,
                                   color=style.INK3, lw=1, ls=(0, (3, 3))))
    for v, lab in [(np.pi, "π"), (1.5 * np.pi, "3π/2"), (2 * np.pi, "2π")]:
        a2.plot([v] * 2, [-0.05, 0.05], color=style.INK3, lw=0.8)
        a2.text(v, -0.14, lab, ha="center", va="top", fontsize=9, color=style.INK2)
    a2.plot([th0] * 2, [-0.05, 0.05], color=style.INK3, lw=0.8)
    a2.text(th0, -0.14, "θ = 1", ha="center", va="top", fontsize=9, color=style.INK)
    a2.text(2 * np.pi + 0.4, 0, "θ\n(radians)", va="center", fontsize=9, color=style.INK2)
    a2.text(2.0, 1.12, "sin θ = 0.84", color=style.ORANGE, fontsize=9, fontweight="semibold")
    a2.text(3.6, -1.18, "one full turn = 2π radians", fontsize=9, color=style.INK2)
    style.save(fig, SLUG, "unitcircle")


def race():
    """Logarithm, powers and the exponential on a logarithmic vertical axis."""
    x = np.linspace(1.5, 25, 500)
    fams = [(np.log(x), "ln x", style.GOLD), (np.sqrt(x), "√x", style.TEAL), (x, "x", style.BLUE),
            (x ** 2, "x²", style.VIOLET), (x ** 5, "x⁵", style.PINK), (np.exp(x), "eˣ", style.ORANGE)]
    fig, ax = plt.subplots(figsize=style.WIDE)
    for y, lab, c in fams:
        ax.plot(x, y, color=c, lw=2.2)
        nudge = {"ln x": 0.62, "√x": 1.6}.get(lab, 1.0)
        ax.text(25.4, y[-1] * nudge, lab, color=c, fontsize=10, fontweight="semibold", va="center")
    # where e^x finally overtakes x^5: e^x = x^5, i.e. x = 5 ln x
    g = lambda z: z - 5 * np.log(z)
    lo, hi = 5.0, 20.0
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        lo, hi = (mid, hi) if g(mid) < 0 else (lo, mid)
    xc = 0.5 * (lo + hi)
    ax.plot(xc, xc ** 5, "o", ms=8, color=style.INK, mec="white", mew=1.2, zorder=5)
    ax.annotate(f"eˣ overtakes x⁵ at x ≈ {xc:.1f}", xy=(xc, xc ** 5), xytext=(13.8, 6e1), fontsize=9, color=style.INK,
                arrowprops=dict(arrowstyle="-|>", color=style.INK3, lw=1, shrinkB=5))
    ax.set_yscale("log"); ax.set_xlim(1.5, 25); ax.set_ylim(0.3, 1e11)
    ax.set_xlabel("x"); ax.set_ylabel("value (logarithmic scale)")
    ax.grid(True, axis="y", which="major")
    style.save(fig, SLUG, "race")
    return xc


def arrhenius():
    """Simulated rate constants with Ea = 53 kJ/mol: curved against T, straight against 1/T."""
    R = 8.314462618e-3                      # kJ / (mol K)
    Ea, A = 53.0, 1.0e10                    # kJ/mol, 1/s
    rng = np.random.default_rng(7)
    T = np.arange(280.0, 361.0, 10.0)
    k = A * np.exp(-Ea / (R * T)) * np.exp(rng.normal(0, 0.06, T.size))      # 6 % scatter
    slope, icpt = np.polyfit(1000.0 / T, np.log(k), 1)
    Ea_fit = -slope * 1000.0 * R
    Tf = np.linspace(275, 365, 200)
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.42))
    a1.plot(Tf, A * np.exp(-Ea / (R * Tf)), color=style.INK3, lw=1.2, ls="--")
    a1.plot(T, k, "o", color=style.BLUE, ms=6, mec="white", mew=1)
    a1.set_xlabel("temperature T (K)"); a1.set_ylabel("rate constant k (s⁻¹)")
    a1.set_title("k against T: a curve")
    a1.set_ylim(0, None)
    xi = 1000.0 / Tf
    a2.plot(xi, slope * xi + icpt, color=style.TEAL, lw=2)
    a2.plot(1000.0 / T, np.log(k), "o", color=style.BLUE, ms=6, mec="white", mew=1, zorder=3)
    a2.set_xlabel("1000 / T (K⁻¹)"); a2.set_ylabel("ln k")
    a2.set_title("ln k against 1/T: a line")
    a2.text(0.97, 0.95, f"slope = {1000 * slope:.0f} K = −Ea / R\nEa = {Ea_fit:.1f} kJ/mol".replace("-", "−"),
            transform=a2.transAxes, ha="right", va="top", fontsize=9, color=style.TEAL)
    style.save(fig, SLUG, "arrhenius")
    return Ea_fit, slope, k


def cover():
    def draw(ax):
        # the function machine: inputs drop in, a rule turns them into outputs, outputs trace a curve
        ax.add_patch(mp.FancyBboxPatch((0.6, 0.75), 1.25, 1.2, boxstyle="round,pad=0.02,rounding_size=0.14",
                                       fc=style.BLUE, ec="none"))
        ax.add_patch(mp.Polygon([[0.77, 1.95], [1.68, 1.95], [1.95, 2.45], [0.5, 2.45]], closed=True, fc=style.VIOLET, ec="none"))
        # gear
        th = np.linspace(0, 2 * np.pi, 400)
        rr = 0.33 + 0.06 * (np.cos(8 * th) > 0)
        ax.add_patch(mp.Polygon(np.c_[1.225 + rr * np.cos(th), 1.35 + rr * np.sin(th)], fc="white", ec="none"))
        ax.add_patch(mp.Circle((1.225, 1.35), 0.12, fc=style.BLUE, ec="none"))
        # inputs falling into the hopper
        for (bx, by, c) in [(0.85, 2.72, style.GOLD), (1.27, 2.62, style.PINK), (1.6, 2.8, style.TEAL)]:
            ax.add_patch(mp.Circle((bx, by), 0.12, fc=c, ec="none"))
        # output chute and the graph it draws
        ax.add_patch(mp.Polygon([[1.85, 1.05], [2.2, 1.18], [2.2, 0.95], [1.85, 0.85]], closed=True, fc=style.BLUE, ec="none"))
        ax.plot([2.45, 3.55], [0.45, 0.45], color=style.INK2, lw=2.2, solid_capstyle="round")
        ax.plot([2.45, 2.45], [0.45, 2.6], color=style.INK2, lw=2.2, solid_capstyle="round")
        xs = np.linspace(0, 1, 7)
        for i, s in enumerate(xs):
            ax.add_patch(mp.Circle((2.6 + 0.85 * s, 0.6 + 1.75 * s ** 2.2), 0.075,
                                   fc=[style.GOLD, style.PINK, style.TEAL, style.ORANGE, style.GOLD, style.PINK, style.TEAL][i], ec="none"))
        sg = np.linspace(0, 1, 100)
        ax.plot(2.6 + 0.85 * sg, 0.6 + 1.75 * sg ** 2.2, color=style.ORANGE, lw=2.6, zorder=0, alpha=0.6)
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    anatomy(); unitcircle()
    xc = race(); print(f"e^x = x^5 at x = {xc:.4f}")
    Ea_fit, slope, k = arrhenius(); print(f"Arrhenius fit: slope {slope:.3f} kK, Ea = {Ea_fit:.2f} kJ/mol; k = {np.round(k, 2)}")
    cover()
