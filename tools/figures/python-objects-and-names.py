"""Figures for content/learn/python-objects-and-names.md.

copies   alias, shallow copy and deep copy of a list of lists, drawn as names, objects and references (diagram)
layout   a list of floats versus a NumPy array in memory, byte by byte (diagram)
sizes    measured memory of lists and arrays, and the size of an int as it grows (plot)
cover    two name tags tied to one object
"""
import os, sys, copy, tracemalloc
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
plt = style.setup()
SLUG = "python-objects-and-names"
MONO = "DejaVu Sans Mono"


def box(ax, x, y, w, h, text="", fc="white", ec=style.INK3, tc=style.INK, fs=8.5, mono=False, weight="normal",
        r=0.1, lw=1.1, z=2):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}", fc=fc, ec=ec, lw=lw,
                                zorder=z))
    if text:
        ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs, color=tc,
                family=MONO if mono else None, weight=weight, zorder=z + 1, linespacing=1.25)


def arrow(ax, p, q, color=style.INK2, lw=1.2, rad=0.0, ms=9, z=4):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=ms, color=color, lw=lw,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=0, shrinkB=0, zorder=z))


def canvas(figsize, xlim, ylim):
    fig, ax = plt.subplots(figsize=figsize)
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.set_aspect("equal"); ax.axis("off")
    return fig, ax


# ----------------------------------------------------------------------------------------------------------
def copies():
    """a = [[1, 2], [3, 4]] and three ways of making b."""
    a = [[1, 2], [3, 4]]
    cases = [("b = a", a), ("b = a.copy()", a.copy()), ("b = copy.deepcopy(a)", copy.deepcopy(a))]
    # check the truth table that the figure prints, from real Python
    table = []
    for _, b in cases:
        a2 = [[1, 2], [3, 4]]
        b2 = a2 if b is a else (a2.copy() if b[0] is a[0] else copy.deepcopy(a2))
        a2[0][0] = 9; inner = b2[0][0] == 9
        a2.append([5]); outer = len(b2) == 3
        table.append((outer, inner))
    print("  sees a.append / sees a[0][0] = 9:", table)

    fig, ax = canvas((7.2, 3.6), (0, 15.0), (-1.9, 6.0))
    OUT, IN = style.BLUE, style.TEAL
    for k, ((title, b), (sees_outer, sees_inner)) in enumerate(zip(cases, table)):
        x0 = k * 5.1
        ax.text(x0 + 2.25, 5.6, title, ha="center", va="center", fontsize=8.5, family=MONO, color=style.INK)
        # names
        box(ax, x0 + 0.0, 4.0, 0.62, 0.55, "a", fc=style.BG2, ec=style.INK3, fs=9, mono=True)
        box(ax, x0 + 0.0, 1.6, 0.62, 0.55, "b", fc=style.BG2, ec=style.INK3, fs=9, mono=True)

        def outer(y):
            box(ax, x0 + 1.2, y, 1.25, 0.6, "", fc=style.TINT[OUT], ec=OUT)
            ax.plot([x0 + 1.825, x0 + 1.825], [y, y + 0.6], color=OUT, lw=0.9, zorder=3)
            ax.add_patch(Circle((x0 + 1.51, y + 0.3), 0.07, color=OUT, zorder=4))
            ax.add_patch(Circle((x0 + 2.14, y + 0.3), 0.07, color=OUT, zorder=4))
            return [(x0 + 1.51, y + 0.3), (x0 + 2.14, y + 0.3)]

        def inner(y, vals, x=None):
            x = x0 + 3.05 if x is None else x
            box(ax, x, y, 1.3, 0.5, f"{vals[0]}  {vals[1]}", fc=style.TINT[IN], ec=IN, fs=8.5, mono=True)
            return (x, y + 0.25)

        ya, yb = 3.97, 1.57
        slots_a = outer(ya)
        arrow(ax, (x0 + 0.62, 4.275), (x0 + 1.2, ya + 0.3))
        rows_a = [inner(4.75, (1, 2)), inner(3.3, (3, 4))]
        for s, r in zip(slots_a, rows_a):
            arrow(ax, s, r, color=OUT)
        if k == 0:
            arrow(ax, (x0 + 0.62, 1.875), (x0 + 1.4, ya - 0.02), color=style.INK2, rad=0.25)
        else:
            slots_b = outer(yb)
            arrow(ax, (x0 + 0.62, 1.875), (x0 + 1.2, yb + 0.3))
            if k == 1:
                for s, r in zip(slots_b, rows_a):
                    arrow(ax, s, r, color=OUT, rad=0.0)
            else:
                rows_b = [inner(2.15, (1, 2)), inner(0.75, (3, 4))]
                for s, r in zip(slots_b, rows_b):
                    arrow(ax, s, r, color=OUT)
        # verdicts
        for j, (q, yes) in enumerate([("a.append(x) shows in b", sees_outer), ("a[0][0] = 9 shows in b", sees_inner)]):
            yy = -0.55 - j * 0.65
            c = style.PINK if yes else style.TEAL
            ax.text(x0 + 0.0, yy, q, ha="left", va="center", fontsize=8, color=style.INK2)
            ax.text(x0 + 4.35, yy, "yes" if yes else "no", ha="right", va="center", fontsize=8.5, color=c,
                    weight="semibold")
        if k < 2:
            ax.plot([x0 + 4.75, x0 + 4.75], [-1.8, 5.8], color=style.LINE, lw=1)
    style.save(fig, SLUG, "copies")


# ----------------------------------------------------------------------------------------------------------
def layout():
    fig, ax = canvas((7.2, 4.3), (0, 15.2), (-0.4, 9.2))
    W = 1.5   # width of one 8-byte field

    def cells(x, y, labels, c, h=0.6, fs=8):
        for lab in labels:
            box(ax, x, y, W, h, lab, fc=style.TINT[c], ec=c, fs=fs, r=0.04, lw=0.9)
            x += W
        return x

    ax.text(0, 8.75, "list of floats:  xs = [0.5, 1.5, 2.5]", ha="left", va="center", fontsize=9,
            weight="semibold")
    ax.text(15.2, 8.75, "≈ 32 bytes per number", ha="right", va="center", fontsize=9, color=style.ORANGE,
            weight="semibold")
    yh = 7.2
    ax.text(0, yh + 0.9, "list object: 56-byte header (main fields shown)", ha="left", va="center", fontsize=8,
            color=style.INK2)
    cells(0, yh, ["refcount", "type", "length", "items", "capacity"], style.BLUE)
    yp, xp = 4.6, 2.6
    ax.text(xp, yp - 0.4, "array of pointers, 8 bytes per item", ha="left", va="center", fontsize=8,
            color=style.INK2)
    cells(xp, yp, ["ptr", "ptr", "ptr"], style.VIOLET)
    arrow(ax, (3 * W + W / 2, yh), (xp + 0.35, yp + 0.6), color=style.BLUE)
    fx = 9.9
    fys = [6.55, 5.25, 3.95]
    for i, (v, fy) in enumerate(zip(["0.5", "1.5", "2.5"], fys)):
        cells(fx, fy, ["refcount", "type", v], style.ORANGE)
        arrow(ax, (xp + (i + 0.5) * W, yp + 0.6), (fx, fy + 0.3), color=style.VIOLET, rad=-0.1)
    ax.text(fx, 3.65, "three float objects, 24 bytes each,\nwherever the allocator put them", ha="left",
            va="top", fontsize=8, color=style.INK2, linespacing=1.25)

    ax.plot([0, 15.2], [2.7, 2.7], color=style.LINE, lw=1)
    ax.text(0, 2.2, "NumPy array:  a = np.array([0.5, 1.5, 2.5])", ha="left", va="center", fontsize=9,
            weight="semibold")
    ax.text(15.2, 2.2, "8 bytes per number", ha="right", va="center", fontsize=9, color=style.TEAL,
            weight="semibold")
    box(ax, 0, 0.55, 3.8, 0.95, "array object\nshape, dtype, strides", fc=style.TINT[style.BLUE], ec=style.BLUE,
        fs=8, r=0.06)
    cells(5.2, 0.55, ["0.5", "1.5", "2.5"], style.TEAL, h=0.95, fs=8.5)
    arrow(ax, (3.8, 1.02), (5.2, 1.02), color=style.BLUE)
    ax.text(5.2, 0.05, "one contiguous buffer of raw float64 values: no headers, no pointers", ha="left",
            va="center", fontsize=8, color=style.INK2)
    style.save(fig, SLUG, "layout")


# ----------------------------------------------------------------------------------------------------------
def traced(make):
    tracemalloc.start()
    obj = make()
    size = tracemalloc.get_traced_memory()[0]
    tracemalloc.stop()
    del obj
    return size


def sizes():
    Ns = np.unique(np.round(np.logspace(2, 6, 9)).astype(int))
    lst = np.array([traced(lambda: [float(i) + 0.5 for i in range(N)]) for N in Ns]) / 1e6
    arr = np.array([traced(lambda: np.arange(N, dtype=np.float64)) for N in Ns]) / 1e6
    print("  N", Ns[-1], f"list {lst[-1]:.1f} MB  array {arr[-1]:.1f} MB")
    bits = np.arange(1, 301)
    isz = np.array([sys.getsizeof(2 ** int(b - 1)) for b in bits])
    print("  int sizes:", {b: int(isz[b - 1]) for b in (1, 30, 31, 60, 61, 101, 300)})

    fig, (ax, bx) = plt.subplots(1, 2, figsize=(7.2, 3.2), gridspec_kw={"wspace": 0.42})
    ax.plot(Ns / 1e6, lst, "o-", color=style.ORANGE, ms=3.5)
    ax.plot(Ns / 1e6, arr, "o-", color=style.TEAL, ms=3.5)
    ax.set_xlabel("number of floats (millions)")
    ax.set_ylabel("memory (MB)")
    ax.set_ylim(0, 38); ax.set_xlim(0, 1.08)
    ax.text(0.25, 31, f"list of floats\n{lst[-1]:.0f} MB", ha="left", va="top", fontsize=8.5,
            color=style.ORANGE, linespacing=1.2)
    ax.text(0.98, arr[-1] + 1.5, f"NumPy float64\narray, {arr[-1]:.0f} MB", ha="right", va="bottom", linespacing=1.2, fontsize=8.5,
            color=style.TEAL)
    ax.set_title("A million numbers", fontsize=10)

    bx.step(bits, isz, where="post", color=style.VIOLET)
    bx.set_xlabel("bits in the integer")
    bx.set_ylabel("sys.getsizeof (bytes)")
    bx.set_xlim(0, 300); bx.set_ylim(20, 72)
    bx.set_title("One int grows with its value", fontsize=10)
    bx.annotate("28 bytes up to\n30 bits", xy=(15, 28), xytext=(50, 57), fontsize=8.5, color=style.INK2,
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    bx.annotate("2**100: 40 bytes", xy=(101, 40), xytext=(150, 29), fontsize=8.5, color=style.INK2,
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    bx.text(8, 70, "+4 bytes per 30-bit digit", ha="left", va="top", fontsize=8.5, color=style.VIOLET,
            linespacing=1.2)
    style.save(fig, SLUG, "sizes")


# ----------------------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        ax.add_patch(Circle((2.85, 1.45), 0.78, fc=style.TEAL, ec="none"))
        ax.add_patch(Circle((2.62, 1.7), 0.16, fc="white", ec="none", alpha=0.45))
        for (x, y, ang, c) in [(0.95, 2.25, 12, style.BLUE), (0.95, 0.75, -12, style.ORANGE)]:
            # string from tag to ball
            ax.plot([x + 0.55, 2.2], [y, 1.45 + (y - 1.5) * 0.25], color=style.INK, lw=3, solid_capstyle="round",
                    zorder=1)
            t = FancyBboxPatch((x - 0.6, y - 0.28), 1.1, 0.56, boxstyle="round,pad=0,rounding_size=0.12", fc=c,
                               ec="none", zorder=2)
            ax.add_patch(t)
            ax.add_patch(Circle((x + 0.32, y), 0.08, fc="white", ec="none", zorder=3))
            ax.plot([x - 0.4, x + 0.05], [y, y], color="white", lw=3, solid_capstyle="round", zorder=3)
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    copies(); layout(); sizes(); cover()
