"""Figures for content/learn/python-control-flow.md.

forloop      what a for loop does: iter, next, StopIteration, break, continue and the loop else (diagram)
convergence  Newton's method and bisection from the chapter's code: error against iteration (plot)
pairs        measured cost of a pure-Python double loop over atom pairs against a NumPy version (plot)
cover        a loop with a decision on it
"""
import os, sys, math, time, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Polygon, Circle, Arc
plt = style.setup()
SLUG = "python-control-flow"
MONO = "DejaVu Sans Mono"


def box(ax, x, y, w, h, text="", fc="white", ec=style.INK3, tc=style.INK, fs=8.5, mono=False, r=0.12, lw=1.1, z=2):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}", fc=fc, ec=ec, lw=lw,
                                zorder=z))
    if text:
        ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs, color=tc,
                family=MONO if mono else None, zorder=z + 1, linespacing=1.25)


def arrow(ax, pts, color=style.INK2, lw=1.3, ms=10, z=1):
    """Polyline through pts with an arrowhead at the end."""
    pts = list(pts)
    if len(pts) > 2:
        xs, ys = zip(*pts[:-1])
        ax.plot(xs, ys, color=color, lw=lw, zorder=z, solid_joinstyle="round")
    ax.add_patch(FancyArrowPatch(pts[-2], pts[-1], arrowstyle="-|>", mutation_scale=ms, color=color, lw=lw,
                                 shrinkA=0, shrinkB=0, zorder=z))


def label(ax, x, y, t, c=style.INK2, ha="center", fs=8.5, **kw):
    ax.text(x, y, t, ha=ha, va="center", fontsize=fs, color=c, **kw)


# ----------------------------------------------------------------------------------------------------------
def forloop():
    fig, ax = plt.subplots(figsize=(7.2, 4.2))
    ax.set_xlim(-0.2, 16.6); ax.set_ylim(-0.1, 8.6); ax.set_aspect("equal"); ax.axis("off")
    cx, hw = 7.9, 1.55
    code = ("for x in data:\n    if skip(x):\n        continue\n    if found(x):\n        break\n    work(x)\n"
            "else:\n    nothing_found()\nafter()")
    ax.text(-0.1, 8.3, code, ha="left", va="top", fontsize=8.5, family=MONO, color=style.INK, linespacing=1.45)

    box(ax, cx - hw, 7.35, 2 * hw, 0.75, "it = iter(data)", fc=style.TINT[style.BLUE], ec=style.BLUE, mono=True,
        fs=8)
    box(ax, cx - hw, 5.85, 2 * hw, 0.75, "x = next(it)", fc=style.TINT[style.BLUE], ec=style.BLUE, mono=True, fs=8)
    arrow(ax, [(cx, 7.35), (cx, 6.6)], color=style.INK)
    box(ax, cx - hw, 2.9, 2 * hw, 2.2, "", fc=style.BG2, ec=style.INK3)
    label(ax, cx, 4.8, "loop body", c=style.INK2)
    box(ax, cx - 1.1, 3.75, 2.2, 0.6, "work(x)", fc="white", ec=style.INK3, mono=True, fs=8)
    arrow(ax, [(cx, 5.85), (cx, 5.1)], color=style.INK)
    # normal end of the body: go round again (outer left edge)
    xo = cx - hw - 1.0
    arrow(ax, [(cx, 2.9), (cx, 2.4), (xo, 2.4), (xo, 6.05), (cx - hw, 6.05)], color=style.INK)
    label(ax, xo - 0.15, 3.0, "next\npass", ha="right", c=style.INK, linespacing=1.15)
    # continue: dashed shortcut (inner left edge)
    xi = cx - hw - 0.45
    ax.plot([cx - hw, xi, xi], [4.45, 4.45, 6.4], color=style.ORANGE, lw=1.3, ls=(0, (3, 2)))
    arrow(ax, [(xi, 6.4), (cx - hw, 6.4)], color=style.ORANGE)
    label(ax, xo - 0.15, 4.85, "continue", ha="right", c=style.ORANGE)
    # StopIteration -> else -> after
    ex = 13.1
    arrow(ax, [(cx + hw, 6.3), (ex, 6.3), (ex, 5.45)], color=style.TEAL)
    label(ax, (cx + hw + ex) / 2, 6.72, "next() raises StopIteration", c=style.TEAL)
    box(ax, ex - 1.75, 4.35, 3.5, 1.1, "else block:\nruns only if no break", fc=style.TINT[style.TEAL],
        ec=style.TEAL, fs=8.5)
    arrow(ax, [(ex, 4.35), (ex, 1.35)], color=style.TEAL)
    box(ax, ex - 1.75, 0.35, 3.5, 1.0, "after()", fc="white", ec=style.INK, mono=True, fs=8.5)
    # break: jumps past the else
    arrow(ax, [(cx + hw, 3.4), (ex - 2.6, 3.4), (ex - 2.6, 0.85), (ex - 1.75, 0.85)], color=style.PINK)
    label(ax, (cx + hw + ex - 2.6) / 2, 3.75, "break", c=style.PINK)
    label(ax, ex - 2.75, 1.9, "skips\nthe else", ha="right", c=style.PINK, linespacing=1.15)
    ax.text(ex + 0.15, 3.0, "searched everything,\nfound nothing", ha="left", va="center", fontsize=8,
            color=style.INK3, linespacing=1.2)
    style.save(fig, SLUG, "forloop")


# ----------------------------------------------------------------------------------------------------------
def newton(a, x, tol=1e-12, root=None):
    errs = [abs(x - root)]
    while abs(x * x - a) > tol:
        x = 0.5 * (x + a / x)
        errs.append(abs(x - root))
    return np.array(errs)


def convergence():
    r2 = math.sqrt(2.0)
    e1 = newton(2.0, 1.0, root=r2)
    e2 = newton(2.0, 1000.0, root=r2)
    f = lambda x: x ** 3 - 2 * x - 5
    lo, hi, widths = 2.0, 3.0, [1.0]
    while hi - lo > 1e-10:
        mid = 0.5 * (lo + hi)
        if f(lo) * f(mid) <= 0:
            hi = mid
        else:
            lo = mid
        widths.append(hi - lo)
    print(f"  Newton from 1: {len(e1) - 1} iterations; from 1000: {len(e2) - 1}; bisection: {len(widths) - 1}")
    print("  Newton errors from 1:", ", ".join(f"{e:.2g}" for e in e1))
    floor = 1e-17
    plot1 = np.maximum(e1, floor); plot2 = np.maximum(e2, floor)

    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    ax.axhspan(1e-18, 2.2e-16, color=style.BG2, zorder=0)
    ax.text(36.5, 4e-17, "below the spacing of doubles near 1.4: unreachable", ha="right", va="center",
            fontsize=8.5, color=style.INK3)
    ax.semilogy(np.arange(len(widths)), widths, "o-", ms=2.8, lw=1.5, color=style.ORANGE)
    ax.semilogy(np.arange(len(e2)), plot2, "o-", ms=3.2, lw=1.5, color=style.VIOLET)
    ax.semilogy(np.arange(len(e1)), plot1, "o-", ms=4, lw=2, color=style.BLUE)
    ax.set_xlabel("iteration")
    ax.set_ylabel("error")
    ax.set_ylim(1e-18, 3e3); ax.set_xlim(-0.8, 37)
    ax.set_yticks([1e-15, 1e-10, 1e-5, 1, 1e3])
    ax.text(5.6, 2e-13, "Newton from x = 1:\ndigits double each step", ha="left", va="center", fontsize=8.5,
            color=style.BLUE, linespacing=1.2)
    ax.text(9.5, 3e1, "Newton from x = 1000: error halves\nuntil x is close, then digits double", ha="left",
            va="center", fontsize=8.5, color=style.VIOLET, linespacing=1.2)
    ax.text(25.5, 3e-6, "bisection: one binary digit\nper step, 34 steps to 1e-10", ha="left", va="center",
            fontsize=8.5, color=style.ORANGE, linespacing=1.2)
    ax.axhline(1e-10, color=style.INK3, lw=0.8, ls=(0, (3, 3)), zorder=0)
    style.save(fig, SLUG, "convergence")


# ----------------------------------------------------------------------------------------------------------
def pairs_py(pos, rc2):
    n = len(pos); count = 0
    for i in range(n):
        xi, yi, zi = pos[i]
        for j in range(i + 1, n):
            xj, yj, zj = pos[j]
            dx = xi - xj; dy = yi - yj; dz = zi - zj
            if dx * dx + dy * dy + dz * dz < rc2:
                count += 1
    return count


def pairs_np(a, rc2):
    count = 0
    for i in range(len(a) - 1):
        d = a[i + 1:] - a[i]
        count += int(np.count_nonzero(np.einsum("ij,ij->i", d, d) < rc2))
    return count


def best_of(fn, *args, repeat=3):
    ts = []
    for _ in range(repeat):
        t0 = time.perf_counter(); out = fn(*args); ts.append(time.perf_counter() - t0)
    return min(ts), out


def pairs():
    random.seed(1)
    Ns = np.array([125, 250, 500, 1000, 2000])
    tp, tn = [], []
    for N in Ns:
        pos = [(random.uniform(0, 10), random.uniform(0, 10), random.uniform(0, 10)) for _ in range(N)]
        a = np.array(pos)
        t1, c1 = best_of(pairs_py, pos, 1.0)
        t2, c2 = best_of(pairs_np, a, 1.0)
        assert c1 == c2
        tp.append(t1); tn.append(t2)
    tp, tn = np.array(tp), np.array(tn)
    P = Ns * (Ns - 1) / 2
    ns_pair = np.median(tp[-3:] / P[-3:]) * 1e9
    t10k = ns_pair * 1e-9 * 1e4 * (1e4 - 1) / 2
    print(f"  pure Python: {ns_pair:.0f} ns per pair, so N = 10 000 needs about {t10k:.0f} s;"
          f" NumPy rows at N = 2000: {tn[-1] / P[-1] * 1e9:.0f} ns per pair")

    fig, ax = plt.subplots(figsize=(7.2, 3.5))
    Nx = np.logspace(2, 4.05, 50)
    ax.loglog(Nx, ns_pair * 1e-9 * Nx * (Nx - 1) / 2, color=style.ORANGE, lw=1, ls=(0, (4, 3)))
    ax.loglog(Ns, tp, "o-", color=style.ORANGE, ms=5)
    ax.loglog(Ns, tn, "o-", color=style.BLUE, ms=5)
    ax.plot([1e4], [t10k], "o", ms=7, mfc="white", mec=style.ORANGE, mew=1.8)
    ax.annotate(f"N = 10 000: about {t10k:.0f} s\n(50 million pairs, extrapolated)", xy=(1e4, t10k),
                xytext=(1.6e3, 25), fontsize=8.5, color=style.ORANGE, ha="center", va="center",
                arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.8, shrinkB=5))
    ax.text(Ns[2] * 1.15, tp[2] * 0.55, "double for loop in Python,\n" f"≈ {ns_pair:.0f} ns per pair", ha="left",
            va="top", fontsize=8.5, color=style.ORANGE, linespacing=1.2)
    ax.text(Ns[-1] * 1.12, tn[-1], "NumPy, one row\nof pairs at a time", ha="left", va="center", fontsize=8.5,
            color=style.BLUE, linespacing=1.2)
    ax.text(1.15e2, 3e1, "dashed: time grows as N(N − 1)/2", ha="left", va="center", fontsize=8.5, color=style.INK2)
    ax.set_xlabel("number of atoms N")
    ax.set_ylabel("time to visit every pair (s)")
    ax.set_xlim(90, 2e4); ax.set_ylim(5e-4, 100)
    ax.grid(True, which="major", axis="y")
    style.save(fig, SLUG, "pairs")


# ----------------------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        c, R = (2.0, 1.5), 0.95
        ax.add_patch(Arc(c, 2 * R, 2 * R, theta1=40, theta2=330, color=style.BLUE, lw=11, capstyle="round"))
        # arrowhead at the end of the arc (angle 40 deg, heading counter-clockwise: the arc runs 40 -> 330)
        t = math.radians(330)
        e = (c[0] + R * math.cos(t), c[1] + R * math.sin(t))
        dvec, perp = (-math.sin(t), math.cos(t)), (math.cos(t), math.sin(t))
        ax.add_patch(Polygon([(e[0] + 0.42 * dvec[0], e[1] + 0.42 * dvec[1]),
                              (e[0] + 0.3 * perp[0], e[1] + 0.3 * perp[1]),
                              (e[0] - 0.3 * perp[0], e[1] - 0.3 * perp[1])], closed=True, fc=style.BLUE, ec="none"))
        # decision diamond on the loop
        d = (c[0] - R, c[1])
        s = 0.42
        ax.add_patch(Polygon([(d[0], d[1] + s), (d[0] + s, d[1]), (d[0], d[1] - s), (d[0] - s, d[1])],
                             closed=True, fc=style.ORANGE, ec="white", lw=3, zorder=3))
        # exit path
        ax.plot([d[0] - s, 0.25], [d[1], d[1]], color=style.TEAL, lw=8, solid_capstyle="round", zorder=2)
        ax.add_patch(Polygon([(0.05, d[1]), (0.38, d[1] + 0.25), (0.38, d[1] - 0.25)], closed=True,
                             fc=style.TEAL, ec="none", zorder=2))
        # values flowing round the loop
        for ang, col in [(90, style.PINK), (165 + 90, style.VIOLET), (300 - 10, style.GOLD)]:
            a = math.radians(ang)
            ax.add_patch(Circle((c[0] + R * math.cos(a), c[1] + R * math.sin(a)), 0.17, fc=col, ec="white", lw=2.5,
                                zorder=4))
    style.cover(SLUG, draw, bg=style.TINT[style.ORANGE])


if __name__ == "__main__":
    forloop(); convergence(); pairs(); cover()
