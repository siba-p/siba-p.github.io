"""Figures for content/learn/gradients.md.

surface       : the two-valley landscape f = (x^2 - 2)^2 / 2 + 1.2 y^2 as a surface and as a contour map
mueller-brown : stationary points and minimum energy path on the Mueller-Brown surface, with the energy profile
lagrange      : a constrained minimum, where the gradient of f is parallel to the gradient of the constraint
cover         : contour rings of a landscape crossed at right angles by a steepest-descent path
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import FancyArrowPatch
plt = style.setup()
SLUG = "gradients"
CMAP = LinearSegmentedColormap.from_list("land", ["#ffffff", style.TINT[style.VIOLET], "#b9a3f9", style.VIOLET])


def arrow(ax, p, q, color, lw=2.0, ms=11, z=6):
    ax.add_patch(FancyArrowPatch(tuple(p), tuple(q), arrowstyle="-|>", mutation_scale=ms, color=color, lw=lw,
                                 shrinkA=0, shrinkB=0, zorder=z))


# ---------------------------------------------------------------- the two-valley landscape of the widget
def f_pass(x, y):
    return (x * x - 2) ** 2 / 2 + 1.2 * y * y


def surface():
    fig = plt.figure(figsize=(7.2, 3.5))
    ax3 = fig.add_axes([0.0, 0.02, 0.5, 0.96], projection="3d")
    ax2 = fig.add_axes([0.58, 0.16, 0.4, 0.72])
    x = np.linspace(-2.2, 2.2, 45); y = np.linspace(-1.6, 1.6, 33); X, Y = np.meshgrid(x, y); Z = f_pass(X, Y)
    levels = [0.25, 0.75, 1.5, 2.0, 2.75, 3.75, 5.0]
    ax3.plot_surface(X, Y, Z, cmap=CMAP, vmin=-1, vmax=7, rstride=1, cstride=1, lw=0, antialiased=True,
                     alpha=0.95, rasterized=True)
    ax3.contour(X, Y, Z, levels=levels, offset=-2.5, colors=style.INK3, linewidths=0.8)
    ax3.contour(X, Y, Z, levels=[2.0], offset=-2.5, colors=style.ORANGE, linewidths=1.4)
    for (px, py, c) in ((-np.sqrt(2), 0, style.TEAL), (np.sqrt(2), 0, style.TEAL), (0, 0, style.ORANGE)):
        z = f_pass(px, py)
        ax3.plot([px, px], [py, py], [-2.5, z], color=c, lw=1.0, ls=(0, (2, 2)))
        ax3.scatter([px], [py], [z + 0.05], color=c, s=22, depthshade=False, zorder=10)
    ax3.set_zlim(-2.5, 7); ax3.view_init(elev=26, azim=-62)
    ax3.set_xlabel("$x$", labelpad=-8); ax3.set_ylabel("$y$", labelpad=-8); ax3.set_zlabel("$f$", labelpad=-10)
    ax3.set_xticks([-2, 0, 2]); ax3.set_yticks([-1, 0, 1]); ax3.set_zticks([0, 3, 6])
    ax3.tick_params(labelsize=8, pad=-3)
    for a in (ax3.xaxis, ax3.yaxis, ax3.zaxis):
        a.pane.set_facecolor("white"); a.pane.set_edgecolor(style.LINE); a._axinfo["grid"]["color"] = style.LINE
    ax2.contourf(X, Y, Z, levels=[-1] + levels + [12], cmap=CMAP, vmin=-1, vmax=7)
    ax2.contour(X, Y, Z, levels=levels, colors=style.INK3, linewidths=0.8)
    ax2.contour(X, Y, Z, levels=[2.0], colors=style.ORANGE, linewidths=1.4)
    for px, lab in ((-np.sqrt(2), "minimum"), (np.sqrt(2), "minimum")):
        ax2.plot(px, 0, "o", color=style.TEAL, ms=6)
        ax2.text(px, -0.3, lab, color=style.TEAL, ha="center", va="top", fontsize=8.5,
                 bbox=dict(fc="white", ec="none", alpha=0.85, pad=0.8))
    ax2.plot(0, 0, "o", color=style.ORANGE, ms=6)
    ax2.text(0, 0.3, "saddle", color=style.ORANGE, ha="center", fontsize=8.5,
             bbox=dict(fc="white", ec="none", alpha=0.85, pad=0.8))
    ax2.set_aspect("equal"); ax2.set_xlabel("$x$"); ax2.set_ylabel("$y$")
    ax2.set_title("Contour map: the view from above", fontsize=10)
    fig.text(0.03, 0.93, "Surface: height is $f(x, y)$", fontsize=10, fontweight="semibold", color=style.INK)
    style.save(fig, SLUG, "surface")


# ---------------------------------------------------------------- Mueller-Brown surface (Theor. Chim. Acta 53, 75, 1979)
MB_A = np.array([-200, -100, -170, 15.0]); MB_a = np.array([-1, -1, -6.5, 0.7]); MB_b = np.array([0, 0, 11, 0.6])
MB_c = np.array([-10, -10, -6.5, 0.7]); MB_x0 = np.array([1, 0, -0.5, -1.0]); MB_y0 = np.array([0, 0.5, 1.5, 1.0])


def mb(x, y):
    x = np.asarray(x, float)[..., None]; y = np.asarray(y, float)[..., None]
    dx, dy = x - MB_x0, y - MB_y0
    return np.sum(MB_A * np.exp(MB_a * dx * dx + MB_b * dx * dy + MB_c * dy * dy), axis=-1)


def mb_grad(p):
    dx, dy = p[0] - MB_x0, p[1] - MB_y0
    e = MB_A * np.exp(MB_a * dx * dx + MB_b * dx * dy + MB_c * dy * dy)
    return np.array([np.sum(e * (2 * MB_a * dx + MB_b * dy)), np.sum(e * (MB_b * dx + 2 * MB_c * dy))])


def mb_hess(p, h=1e-5):
    H = np.array([(mb_grad(p + [h, 0]) - mb_grad(p - [h, 0])) / (2 * h), (mb_grad(p + [0, h]) - mb_grad(p - [0, h])) / (2 * h)])
    return (H + H.T) / 2


def newton(p):
    p = np.array(p, float)
    for _ in range(50):
        p = p - np.linalg.solve(mb_hess(p), mb_grad(p))
    return p


def descend(p, ds=2e-3, nmax=20000):
    """Steepest-descent path with fixed arc-length steps, stopped on arrival at a minimum."""
    path = [p.copy()]
    for _ in range(nmax):
        g = mb_grad(p); n = np.linalg.norm(g)
        q = p - ds * g / n
        if mb(*q) >= mb(*p): break            # the next step would go uphill: we are at the valley floor
        p = q; path.append(p.copy())
    return np.array(path)


def mb_points():
    mins = {k: newton(g) for k, g in (("A", (-0.56, 1.44)), ("B", (0.62, 0.03)), ("C", (-0.05, 0.47)))}
    sads = {k: newton(g) for k, g in (("S1", (-0.82, 0.62)), ("S2", (0.21, 0.29)))}
    return mins, sads


def mueller_brown():
    mins, sads = mb_points()
    pieces = {}
    for k, s in sads.items():
        w, U = np.linalg.eigh(mb_hess(s)); v = U[:, 0]          # the downhill direction at the saddle
        pieces[k] = (descend(s + 2e-3 * v), descend(s - 2e-3 * v))
    def ends_near(path, m): return np.linalg.norm(path[-1] - m) < 0.02
    # orient: A <- S1 -> C and C <- S2 -> B
    p1a, p1b = pieces["S1"]; p1a, p1b = (p1a, p1b) if ends_near(p1a, mins["A"]) else (p1b, p1a)
    p2a, p2b = pieces["S2"]; p2a, p2b = (p2a, p2b) if ends_near(p2a, mins["C"]) else (p2b, p2a)
    full = np.vstack([p1a[::-1], p1b, p2a[::-1], p2b])
    s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(full, axis=0), axis=1))])
    E = mb(full[:, 0], full[:, 1])

    fig, (ax, bx) = plt.subplots(1, 2, figsize=(7.2, 3.5), gridspec_kw=dict(width_ratios=[1.05, 1]))
    x = np.linspace(-1.5, 1.2, 110); y = np.linspace(-0.4, 2.0, 100); X, Y = np.meshgrid(x, y); Z = np.minimum(mb(X, Y), 60)
    lv = np.arange(-150, 61, 20)
    cf = ax.contourf(X, Y, Z, levels=lv, cmap=CMAP, extend="max"); cf.set_rasterized(True)
    ax.contour(X, Y, Z, levels=lv, colors=style.INK3, linewidths=0.5, linestyles="solid")
    ax.plot(full[:, 0], full[:, 1], color=style.ORANGE, lw=2.2)
    for k, m in mins.items():
        ax.plot(*m, "o", color=style.INK, ms=5, zorder=5)
    for k, sp in sads.items():
        ax.plot(*sp, "D", color=style.GOLD, mec=style.INK, mew=0.6, ms=6, zorder=5)
    offs = {"A": (0.08, 0.06), "B": (0.07, 0.08), "C": (0.08, 0.06), "S1": (-0.1, -0.13), "S2": (0.09, 0.03)}
    for k, p in {**mins, **sads}.items():
        ax.text(p[0] + offs[k][0], p[1] + offs[k][1], k, fontsize=9.5, fontweight="semibold", color=style.INK,
                bbox=dict(fc="white", ec="none", alpha=0.7, pad=0.6))
    ax.set_aspect("equal"); ax.set_xlim(-1.5, 1.2); ax.set_ylim(-0.4, 2.0)
    ax.set_xlabel("$x$ (arb. units)"); ax.set_ylabel("$y$ (arb. units)")
    ax.set_title("Minimum energy path on the map", fontsize=10)

    bx.plot(s, E, color=style.ORANGE, lw=2.2)
    pts = [("A", mins["A"]), ("S1", sads["S1"]), ("C", mins["C"]), ("S2", sads["S2"]), ("B", mins["B"])]
    for k, p in pts:
        i = np.argmin(np.linalg.norm(full - p, axis=1)); e = mb(*p)
        bx.plot(s[i], e, "D" if k[0] == "S" else "o", color=style.GOLD if k[0] == "S" else style.INK,
                mec=style.INK, mew=0.6, ms=6 if k[0] == "S" else 5, zorder=5)
        if k == "A":
            bx.text(s[i] + 0.12, e, f"A  {e:.1f}", ha="left", va="center", fontsize=8.5, color=style.INK2)
        else:
            bx.text(s[i], e + (7 if k[0] == "S" else -8), f"{k}\n{e:.1f}" if k[0] == "S" else f"{k}  {e:.1f}",
                    ha="center", va="bottom" if k[0] == "S" else "top", fontsize=8.5, color=style.INK2)
    eA, e1, eC, e2, eB = (mb(*p) for _, p in pts)
    i1 = np.argmin(np.linalg.norm(full - sads["S1"], axis=1)); iA = 0
    bx.annotate("", xy=(s[iA] + 0.05, e1), xytext=(s[iA] + 0.05, eA), arrowprops=dict(arrowstyle="<->", color=style.VIOLET, lw=1.1))
    bx.plot([s[iA] + 0.05, s[i1]], [e1, e1], color=style.VIOLET, lw=0.8, ls=(0, (2, 2)))
    bx.text(s[iA] + 0.12, (eA + e1) / 2 + 10, f"barrier\n{e1 - eA:.1f}", color=style.VIOLET, fontsize=8.5, va="center")
    bx.set_ylim(-165, -10); bx.set_xlim(-0.05, s[-1] + 0.1)
    bx.set_xlabel("distance along the path (arb. units)"); bx.set_ylabel("energy (arb. units)")
    bx.set_title("Energy profile along the path", fontsize=10)
    fig.subplots_adjust(wspace=0.3)
    style.save(fig, SLUG, "mueller-brown")
    return {k: (np.round(v, 3), round(float(mb(*v)), 2)) for k, v in {**mins, **sads}.items()}


# ---------------------------------------------------------------- Lagrange multipliers
def lagrange():
    f = lambda x, y: x * x + 2 * y * y           # minimise f on the line g = x + y = 3
    P = np.array([2.0, 1.0]); lam = 4.0           # grad f = (4, 4) = 4 * grad g at the optimum
    Q = np.array([0.6, 2.4])                      # a non-optimal point on the line
    fig, ax = plt.subplots(figsize=(6.4, 4.3))
    x = np.linspace(-0.5, 3.6, 200); y = np.linspace(-0.5, 3.1, 200); X, Y = np.meshgrid(x, y)
    lv = [1, 2.5, 4, 6, 9, 12.32, 16]
    ax.contour(X, Y, f(X, Y), levels=[l for l in lv if l not in (6, 12.32)], colors=style.INK3, linewidths=0.8)
    ax.contour(X, Y, f(X, Y), levels=[6], colors=style.TEAL, linewidths=1.8)
    ax.contour(X, Y, f(X, Y), levels=[f(*Q)], colors=style.INK3, linewidths=0.8, linestyles="dashed")
    xs = np.linspace(-0.5, 3.6, 2); ax.plot(xs, 3 - xs, color=style.INK, lw=2.0)
    ax.text(3.2, 1.0, "constraint\n$x + y = 3$", fontsize=9, color=style.INK, va="center")
    gP = np.array([2 * P[0], 4 * P[1]]); sc = 0.18
    arrow(ax, P, P + sc * gP, style.TEAL, lw=2.2)
    arrow(ax, P, P + sc * np.array([1.0, 1.0]), style.VIOLET, lw=2.4, ms=12, z=7)
    ax.plot(*P, "o", color=style.INK, ms=6, zorder=8)
    ax.text(P[0] + 0.78, P[1] + 0.62, "$\\nabla f = (4, 4)$", color=style.TEAL, fontsize=9.5)
    ax.text(P[0] + 0.3, P[1] - 0.18, "$\\nabla g = (1, 1)$", color=style.VIOLET, fontsize=9.5,
            bbox=dict(fc="white", ec="none", alpha=0.85, pad=0.8))
    ax.text(P[0] - 0.12, P[1] - 0.32, "optimum (2, 1): $f = 6$,\n$\\nabla f = 4\\,\\nabla g$", fontsize=9, color=style.INK,
            ha="right", va="top")
    gQ = np.array([2 * Q[0], 4 * Q[1]]); t = np.array([1, -1]) / np.sqrt(2)
    arrow(ax, Q, Q + 0.07 * gQ, style.TEAL, lw=1.8)
    along = (gQ @ t) * t
    arrow(ax, Q, Q - 0.07 * along, style.ORANGE, lw=2.2, z=7)
    ax.plot(*Q, "o", color=style.INK, ms=5, zorder=8)
    ax.text(Q[0] + 0.32, Q[1] + 0.12, "at (0.6, 2.4), $f$ = 11.9: $\\nabla f$ has a component\nalong the line, so sliding along it lowers $f$",
            fontsize=8.5, color=style.INK2, va="bottom")
    ax.text(Q[0] - 0.12, Q[1] - 0.3, "downhill along\nthe constraint", fontsize=8.5, color=style.ORANGE, ha="right", va="top")
    ax.text(0.05, 0.1, "contours of\n$f = x^2 + 2y^2$", fontsize=9, color=style.INK3)
    ax.set_aspect("equal"); ax.set_xlim(-0.5, 3.9); ax.set_ylim(-0.5, 3.4)
    ax.set_xlabel("$x$"); ax.set_ylabel("$y$")
    style.save(fig, SLUG, "lagrange")


def cover():
    def draw(ax):
        x = np.linspace(0, 4, 100); y = np.linspace(0, 3, 75); X, Y = np.meshgrid(x, y)
        def F(x, y):
            return (-1.25 * np.exp(-((x - 1.05) ** 2 / 0.55 + (y - 1.15) ** 2 / 0.5))
                    - 1.0 * np.exp(-((x - 2.95) ** 2 / 0.6 + (y - 1.9) ** 2 / 0.45)) + 0.05 * ((x - 2) ** 2 + (y - 1.5) ** 2))
        Z = F(X, Y)
        cm = LinearSegmentedColormap.from_list("c", [style.VIOLET, "#b9a3f9", style.TINT[style.VIOLET], "#ffffff"])
        ax.contourf(X, Y, Z, levels=9, cmap=cm, zorder=0)
        ax.contour(X, Y, Z, levels=9, colors="white", linewidths=1.6, linestyles="solid", zorder=1)
        p = np.array([2.05, 2.75]); path = [p.copy()]; h = 1e-4
        for _ in range(4000):
            g = np.array([(F(p[0] + h, p[1]) - F(p[0] - h, p[1])) / (2 * h), (F(p[0], p[1] + h) - F(p[0], p[1] - h)) / (2 * h)])
            if np.linalg.norm(g) < 0.05: break
            p = p - 0.004 * g / np.linalg.norm(g); path.append(p.copy())
        path = np.array(path)
        ax.plot(path[:-12, 0], path[:-12, 1], color=style.ORANGE, lw=7, solid_capstyle="round", zorder=3)
        ax.add_patch(FancyArrowPatch(tuple(path[-40]), tuple(path[-1]), arrowstyle="-|>", mutation_scale=40,
                                     color=style.ORANGE, lw=0, zorder=4))
        ax.plot(*path[0], "o", color=style.GOLD, ms=16, mec="white", mew=2.5, zorder=5)
    style.cover(SLUG, draw, bg="#ffffff")


if __name__ == "__main__":
    surface()
    print(mueller_brown())
    lagrange(); cover()
