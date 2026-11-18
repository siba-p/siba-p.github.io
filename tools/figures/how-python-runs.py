"""Figures for content/learn/how-python-runs.md.

routes    three ways to get from source code to the processor (diagram)
pipeline  CPython's pipeline, with the .pyc shortcut and where errors appear (diagram)
treestack the syntax tree of y = 2 * (x + 4) and the value stack as its bytecode runs (diagram)
overhead  measured cost per element of a Python loop, sum() and NumPy, and of module-level code (plot)
cover     characters become a tree, the tree becomes a stack
"""
import os, sys, timeit
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
plt = style.setup()
SLUG = "how-python-runs"
MONO = "DejaVu Sans Mono"


def box(ax, x, y, w, h, text="", fc="white", ec=style.INK3, tc=style.INK, fs=9, mono=False, weight="normal",
        r=0.12, lw=1.1, z=2):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}", fc=fc, ec=ec, lw=lw,
                                zorder=z))
    if text:
        ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs, color=tc,
                family=MONO if mono else None, weight=weight, zorder=z + 1, linespacing=1.25)


def arrow(ax, p, q, color=style.INK2, lw=1.3, rad=0.0, ls="-", ms=11, z=1):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=ms, color=color, lw=lw, linestyle=ls,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=0, shrinkB=0, zorder=z))


def right_end(ax, t):
    """x (data units) of the right edge of text artist t."""
    fig = ax.figure
    fig.canvas.draw()
    bb = t.get_window_extent(renderer=fig.canvas.get_renderer())
    return ax.transData.inverted().transform((bb.x1, bb.y0))[0]


def canvas(figsize, xlim, ylim):
    fig, ax = plt.subplots(figsize=figsize)
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.set_aspect("equal"); ax.axis("off")
    return fig, ax


# ----------------------------------------------------------------------------------------------------------
def routes():
    fig, ax = canvas((7.2, 4.1), (-0.1, 14.4), (-0.75, 7.6))
    SRC, BC, MC = style.GOLD, style.VIOLET, style.BLUE
    divider = 5.8
    for y_lo, y_hi in [(-0.1, 1.45), (2.3, 3.75), (4.6, 6.05), (6.95, 7.6)]:
        ax.plot([divider, divider], [y_lo, y_hi], color=style.INK3, lw=1, ls=(0, (4, 3)), zorder=0)
    ax.text(divider - 0.2, 7.3, "before execution starts", ha="right", va="center", fontsize=8.5, color=style.INK2)
    ax.text(divider + 0.2, 7.3, "while the program runs", ha="left", va="center", fontsize=8.5, color=style.INK2)

    h = 1.15
    lanes = [(5.25, "Compiled ahead of time", "Fortran, C, C++"),
             (2.95, "CPython", "the standard Python"),
             (0.65, "Just-in-time compiled", "PyPy, Java, JavaScript engines")]
    for y, title, sub in lanes:
        t = ax.text(0.0, y + h / 2 + 0.38, title, ha="left", va="center", fontsize=9, weight="semibold",
                    color=style.INK)
        ax.text(right_end(ax, t) + 0.25, y + h / 2 + 0.38, sub, ha="left", va="center", fontsize=8.5,
                color=style.INK3)

    px = 12.35
    box(ax, px, -0.1, 2.0, 6.95, "", fc=style.INK, ec=style.INK, r=0.18)
    ax.text(px + 1.0, 4.0, "processor", ha="center", va="center", fontsize=9.5, color="white", weight="semibold")
    ax.text(px + 1.0, 2.9, "runs only\nmachine\ncode", ha="center", va="center", fontsize=8.5,
            color="#d7dbe4", linespacing=1.25)

    def lane(y, src, mid, mid_c, right=None):
        box(ax, 0.0, y - h / 2, 2.0, h, src, fc=style.TINT[SRC], ec=SRC, fs=8)
        arrow(ax, (2.0, y), (3.45, y))
        ax.text(2.72, y + 0.12, "compile", ha="center", va="bottom", fontsize=8, color=style.INK2)
        box(ax, 3.45, y - h / 2, 2.1, h, mid, fc=style.TINT[mid_c], ec=mid_c, fs=8)
        if right is None:
            arrow(ax, (5.55, y), (px, y))
            ax.text(9.0, y + 0.12, "runs directly", ha="center", va="bottom", fontsize=8, color=style.INK2)
        else:
            arrow(ax, (5.55, y), (6.05, y))
            box(ax, 6.05, y - h / 2, 5.75, h, right, fc=style.TINT[MC], ec=MC, fs=8)
            arrow(ax, (11.8, y), (px, y))

    lane(lanes[0][0], "source\nmd.f90", "machine code\n./md", MC)
    lane(lanes[1][0], "source\nanalyse.py", "bytecode\n(.pyc file)", BC,
         "virtual machine: a C program that\ncarries out one instruction at a time")
    lane(lanes[2][0], "source\nsim.py", "bytecode", BC,
         "interpreter that watches for hot loops\nand compiles them to machine code")

    kx = 0.0
    for c, t in [(SRC, "text you write"), (BC, "instructions for a software machine"),
                 (MC, "machine code, or a program made of it")]:
        ax.add_patch(FancyBboxPatch((kx, -0.62), 0.3, 0.3, boxstyle="round,pad=0,rounding_size=0.06",
                                    fc=style.TINT[c], ec=c, lw=1.1))
        tt = ax.text(kx + 0.45, -0.47, t, ha="left", va="center", fontsize=8, color=style.INK2)
        kx = right_end(ax, tt) + 0.5
    style.save(fig, SLUG, "routes")


# ----------------------------------------------------------------------------------------------------------
def pipeline():
    fig, ax = canvas((7.2, 3.8), (-0.1, 14.8), (-0.75, 7.0))
    w, h, y0, gap = 2.6, 2.2, 2.0, 0.42
    xs = [i * (w + gap) for i in range(5)]
    cols = [style.GOLD, style.TEAL, style.TEAL, style.VIOLET, style.BLUE]
    names = ["source text", "tokens", "syntax tree", "code object", "running"]
    for x, c, n in zip(xs, cols, names):
        box(ax, x, y0, w, h, "", fc=style.TINT[c], ec=c)
        ax.text(x + w / 2, y0 + h - 0.38, n, ha="center", va="center", fontsize=9, weight="semibold",
                color=style.INK)
    cy = y0 + 0.8
    ax.text(xs[0] + w / 2, cy, "y = 2*(x + 4)", ha="center", va="center", fontsize=8, family=MONO,
            color=style.INK)
    # tokens as chips, two rows
    chips = [["y", "=", "2", "*", "("], ["x", "+", "4", ")"]]
    for r, row in enumerate(chips):
        cw, cg = 0.32, 0.08
        x = xs[1] + w / 2 - (len(row) * cw + (len(row) - 1) * cg) / 2
        for t in row:
            box(ax, x, cy + 0.12 - r * 0.55, cw, 0.42, t, fc="white", ec=style.TEAL, fs=8, mono=True, r=0.05,
                lw=0.9)
            x += cw + cg
    # a small tree
    tx, ty = xs[2] + w / 2, cy
    pts = {"r": (tx, ty + 0.38), "a": (tx - 0.45, ty - 0.08), "b": (tx + 0.45, ty - 0.08),
           "c": (tx + 0.12, ty - 0.52), "d": (tx + 0.78, ty - 0.52)}
    for p, q in [("r", "a"), ("r", "b"), ("b", "c"), ("b", "d")]:
        ax.plot(*zip(pts[p], pts[q]), color=style.TEAL, lw=1.3, zorder=3)
    for k, (px, py) in pts.items():
        ax.add_patch(Circle((px, py), 0.11, fc="white", ec=style.TEAL, lw=1.3, zorder=4))
    ax.text(xs[3] + w / 2, cy, "LOAD_CONST 2\nLOAD_NAME  x\nLOAD_CONST 4\n…", ha="center", va="center",
            fontsize=8, family=MONO, color=style.INK, linespacing=1.25)
    ax.text(xs[4] + w / 2, cy, "y  →  14", ha="center", va="center", fontsize=8.5, family=MONO, color=style.INK)

    stages = ["tokenizer", "parser", "compiler", "virtual\nmachine"]
    for i, s_ in enumerate(stages):
        a_, b_ = xs[i] + w, xs[i + 1]
        arrow(ax, (a_ + 0.04, y0 + h / 2), (b_ - 0.04, y0 + h / 2), color=style.INK, lw=1.5)
        ax.text((a_ + b_) / 2, y0 + h + 0.2, s_, ha="center", va="bottom", fontsize=8.5, color=style.INK2,
                linespacing=1.1)

    # the .pyc shortcut, drawn above
    yc = 6.1
    dash = (0, (4, 2.5))
    x_a, x_b = xs[0] + w / 2, xs[3] + w / 2
    ax.plot([x_a, x_a, x_b], [y0 + h + 0.05, yc, yc], color=style.VIOLET, lw=1.3, ls=dash)
    arrow(ax, (x_b, yc), (x_b, y0 + h + 0.05), color=style.VIOLET, ls=dash)
    ax.text((x_a + x_b) / 2, yc + 0.18, "import with an up-to-date  __pycache__/*.pyc  file: skip three stages",
            ha="center", va="bottom", fontsize=8.5, color=style.VIOLET)

    # where errors appear, drawn below
    yl = 0.95
    xm0, xm1 = xs[0] + w + gap / 2, xs[1] + w + gap / 2
    for xm in (xm0, xm1):
        ax.plot([xm, xm], [y0 + h / 2 - 0.1, yl], color=style.PINK, lw=1.2, zorder=0)
    ax.plot([xm0, xm1], [yl, yl], color=style.PINK, lw=1.2)
    arrow(ax, ((xm0 + xm1) / 2, yl), ((xm0 + xm1) / 2, 0.3), color=style.PINK)
    ax.text((xm0 + xm1) / 2, 0.0, "SyntaxError: nothing has run yet", ha="center", va="center", fontsize=8.5,
            color=style.PINK)
    xm = xs[4] + w / 2
    arrow(ax, (xm, y0 - 0.02), (xm, 0.3), color=style.ORANGE)
    ax.text(xm - 0.3, -0.15, "exceptions while running:\nearlier lines have already run", ha="center",
            va="center", fontsize=8.5, color=style.ORANGE, linespacing=1.2)
    style.save(fig, SLUG, "pipeline")


# ----------------------------------------------------------------------------------------------------------
def treestack():
    fig, ax = canvas((7.2, 5.1), (0, 14.4), (-0.75, 9.6))
    # --- top: the syntax tree with the order in which the compiler emits each node
    ax.text(0.0, 9.15, "y = 2 * (x + 4)    with x = 3", ha="left", va="center", fontsize=10, family=MONO,
            color=style.INK)
    ax.text(0.0, 8.45, "the syntax tree\n(numbers: order of\nthe bytecode)", ha="left", va="top", fontsize=8.5,
            color=style.INK2, linespacing=1.3)
    nodes = {"assign": (7.6, 8.6, "Assign", style.INK3), "y": (5.2, 7.1, "Name y\n(store)", style.PINK),
             "mul": (10.0, 7.1, "BinOp  *", style.VIOLET), "two": (8.2, 5.6, "Constant 2", style.BLUE),
             "add": (11.8, 5.6, "BinOp  +", style.VIOLET), "x": (10.3, 4.1, "Name x", style.BLUE),
             "four": (13.3, 4.1, "Constant 4", style.BLUE)}
    order = {"two": 1, "x": 2, "four": 3, "add": 4, "mul": 5, "y": 6}
    for p, q in [("assign", "y"), ("assign", "mul"), ("mul", "two"), ("mul", "add"), ("add", "x"), ("add", "four")]:
        ax.plot([nodes[p][0], nodes[q][0]], [nodes[p][1], nodes[q][1]], color=style.INK3, lw=1.1, zorder=1)
    for k, (x, y, t, c) in nodes.items():
        bw, bh = (1.9, 0.95) if "\n" in t else (1.9, 0.72)
        box(ax, x - bw / 2, y - bh / 2, bw, bh, t, fc=style.TINT.get(c, style.BG2), ec=c, fs=8.5, r=0.1)
        if k in order:
            ax.add_patch(Circle((x + bw / 2, y + bh / 2), 0.27, fc=c, ec="white", lw=1, zorder=5))
            ax.text(x + bw / 2, y + bh / 2, str(order[k]), ha="center", va="center", fontsize=8.5, color="white",
                    weight="semibold", zorder=6)
    ax.text(0.0, 5.3, "children before\nparents: a post-order\nwalk of the tree", ha="left", va="center",
            fontsize=8.5, color=style.INK2, linespacing=1.3)

    # --- bottom: the value stack after each instruction
    ax.plot([0, 14.4], [3.25, 3.25], color=style.LINE, lw=1)
    ax.text(0.0, 2.85, "the value stack after each instruction (top of the stack at the top)", ha="left",
            va="center", fontsize=8.5, color=style.INK2)
    steps = [("LOAD_CONST", "2", [2]), ("LOAD_NAME", "x", [2, 3]), ("LOAD_CONST", "4", [2, 3, 4]),
             ("BINARY_OP", "+", [2, 7]), ("BINARY_OP", "*", [14]), ("STORE_NAME", "y", [])]
    colw, x0, base = 2.35, 0.25, 0.65
    cols = [style.BLUE, style.BLUE, style.BLUE, style.VIOLET, style.VIOLET, style.PINK]
    for i, ((op, arg, stack), c) in enumerate(zip(steps, cols)):
        cx = x0 + i * colw + colw / 2 - 0.15
        ax.plot([cx - 0.75, cx + 0.75], [base - 0.05, base - 0.05], color=style.INK3, lw=1.2)
        for j, v in enumerate(stack):
            new = j == len(stack) - 1
            box(ax, cx - 0.62, base + j * 0.55, 1.24, 0.48, str(v), fc=style.TINT[c] if new else "white",
                ec=c if new else style.INK3, fs=9, mono=True, r=0.06)
        if not stack:
            ax.text(cx, base + 0.62, "y  →  14", ha="center", va="center", fontsize=9, family=MONO, color=style.PINK)
            ax.text(cx, base + 0.2, "(stack empty)", ha="center", va="center", fontsize=8, color=style.INK3)
        ax.add_patch(Circle((cx, base - 0.5), 0.21, fc=c, ec="none", zorder=5))
        ax.text(cx, base - 0.5, str(i + 1), ha="center", va="center", fontsize=8, color="white", weight="semibold",
                zorder=6)
        ax.text(cx, base - 1.05, f"{op} {arg}", ha="center", va="center", fontsize=8, family=MONO, color=style.INK)
        if i < len(steps) - 1:
            arrow(ax, (cx + 0.82, base + 0.5), (cx + colw - 0.82, base + 0.5), color=style.LINE, lw=1.2, ms=8)
    style.save(fig, SLUG, "treestack")


# ----------------------------------------------------------------------------------------------------------
def loop_sum(xs):
    s = 0.0
    for x in xs:
        s += x
    return s


def per_element(f, n_elem, target=2e5, repeat=5):
    number = max(1, int(target // n_elem))
    return min(timeit.repeat(f, number=number, repeat=repeat)) / number / n_elem * 1e9


def measure():
    Ns = np.unique(np.round(np.logspace(1, 6, 11)).astype(int))
    res = {"loop": [], "sum": [], "numpy": []}
    for N in Ns:
        xs = [float(i) for i in range(N)]
        a = np.array(xs)
        res["loop"].append(per_element(lambda: loop_sum(xs), N))
        res["sum"].append(per_element(lambda: sum(xs), N))
        res["numpy"].append(per_element(lambda: a.sum(), N, target=2e6))
    # the same loop at module level (names in a dictionary) and inside a function (names in frame slots)
    src = "s = 0.0\nfor x in xs:\n    s = s + x * x\n"
    xs = [float(i) for i in range(200_000)]
    g = {"xs": xs}
    code = compile(src, "<module>", "exec")
    ns = {}
    exec("def f(xs):\n    s = 0.0\n    for x in xs:\n        s = s + x * x\n    return s\n", ns)
    f = ns["f"]
    t_mod = min(timeit.repeat(lambda: exec(code, g), number=1, repeat=9)) / len(xs) * 1e9
    t_fun = min(timeit.repeat(lambda: f(xs), number=1, repeat=9)) / len(xs) * 1e9
    return Ns, {k: np.array(v) for k, v in res.items()}, t_mod, t_fun


def overhead():
    Ns, r, t_mod, t_fun = measure()
    for k in r:
        print(f"  {k:6s}" + " ".join(f"{v:7.2f}" for v in r[k]))
    print(f"  module level {t_mod:.1f} ns/iteration, inside a function {t_fun:.1f} ns/iteration")
    fig, (ax, bx) = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw={"width_ratios": [1.75, 1], "wspace": 0.45})
    for k, c in [("loop", style.ORANGE), ("sum", style.VIOLET), ("numpy", style.BLUE)]:
        ax.loglog(Ns, r[k], "o-", color=c, ms=3.5, lw=1.8)
    ax.set_xlabel("number of floats N")
    ax.set_ylabel("time per element (ns)")
    ax.set_ylim(0.08, 400)
    ax.set_xlim(7, 2.5e6)
    ax.grid(True, which="major", axis="y")
    ax.text(Ns[-1], r["loop"][-1] * 2.1, f"for loop in Python\n≈ {r['loop'][-3:].mean():.0f} ns", ha="right",
            va="bottom", fontsize=8.5, color=style.ORANGE, linespacing=1.2)
    ax.text(Ns[-1], r["sum"][-1] * 0.55, f"built-in sum()  ≈ {r['sum'][-3:].mean():.0f} ns", ha="right", va="top",
            fontsize=8.5, color=style.VIOLET)
    ax.text(Ns[-1], r["numpy"][-1] * 0.62, f"NumPy  ≈ {r['numpy'][-1]:.1f} ns", ha="right", va="top", fontsize=8.5,
            color=style.BLUE)
    ax.annotate("one call costs\nabout a microsecond", xy=(Ns[0], r["numpy"][0]), xytext=(30, 140), fontsize=8.5,
                color=style.INK2, ha="left", va="center",
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkA=2, shrinkB=4))
    ax.set_title("Adding up N floats", fontsize=10)

    labels = ["module\nlevel", "inside a\nfunction"]
    vals = [t_mod, t_fun]
    bx.bar([0, 1], vals, width=0.6, color=[style.TINT[style.ORANGE], style.TINT[style.TEAL]],
           edgecolor=[style.ORANGE, style.TEAL], lw=1.2)
    for i, v in enumerate(vals):
        bx.text(i, v + max(vals) * 0.03, f"{v:.0f} ns", ha="center", va="bottom", fontsize=9, color=style.INK)
    bx.set_xticks([0, 1], labels)
    bx.set_xlim(-0.6, 1.6)
    bx.set_ylim(0, max(vals) * 1.25)
    bx.set_ylabel("time per iteration (ns)")
    bx.set_title("s = s + x * x", fontsize=10, family=MONO)
    style.save(fig, SLUG, "overhead")


# ----------------------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        # a page of source code: lines of different lengths and indents
        ax.add_patch(FancyBboxPatch((0.25, 0.7), 1.05, 1.6, boxstyle="round,pad=0,rounding_size=0.08",
                                    fc="white", ec="none"))
        for i, (ind, ln, c) in enumerate([(0, 0.7, style.GOLD), (0.15, 0.55, style.GOLD), (0.15, 0.62, style.ORANGE),
                                         (0.3, 0.4, style.GOLD), (0, 0.5, style.ORANGE)]):
            ax.add_patch(FancyBboxPatch((0.4 + ind, 2.0 - i * 0.27), ln, 0.12,
                                        boxstyle="round,pad=0,rounding_size=0.06", fc=c, ec="none"))
        # chevrons
        for cx in (1.52, 2.62):
            ax.plot([cx, cx + 0.2, cx], [1.8, 1.5, 1.2], color=style.INK2, lw=5, solid_capstyle="round",
                    solid_joinstyle="round")
        # a syntax tree
        pts = [(2.08, 2.15), (1.85, 1.5), (2.31, 1.5), (2.12, 0.88), (2.5, 0.88)]
        for a, b in [(0, 1), (0, 2), (2, 3), (2, 4)]:
            ax.plot(*zip(pts[a], pts[b]), color=style.TEAL, lw=3.2, zorder=1)
        for i, p in enumerate(pts):
            ax.add_patch(Circle(p, 0.14, fc=style.TEAL if i in (0, 2) else "white", ec=style.TEAL, lw=3, zorder=2))
        # a stack of values
        for i, c in enumerate([style.BLUE, style.VIOLET, style.PINK]):
            ax.add_patch(FancyBboxPatch((3.0, 0.75 + i * 0.47), 0.82, 0.37, boxstyle="round,pad=0,rounding_size=0.07",
                                        fc=c, ec="none"))
        ax.plot([2.92, 3.9], [0.66, 0.66], color=style.INK, lw=3.5, solid_capstyle="round")
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    routes(); pipeline(); treestack(); overhead(); cover()
