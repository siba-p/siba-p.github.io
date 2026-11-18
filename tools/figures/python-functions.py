"""Figures for content/learn/python-functions.md.

legb        where Python looks for a name: Local, Enclosing, Global, Built-in (diagram)
traceback   a real traceback next to the call stack that produced it (diagram)
stepsize    error of the chapter's derivative() against the step h, central and forward differences (plot)
memo        number of calls made by recursive Fibonacci, with and without functools.lru_cache (plot)
cover       a function inside a function inside a function
"""
import os, sys, math, traceback, functools
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Polygon
plt = style.setup()
SLUG = "python-functions"
MONO = "DejaVu Sans Mono"


def box(ax, x, y, w, h, text="", fc="white", ec=style.INK3, tc=style.INK, fs=8.5, mono=False, r=0.12, lw=1.1, z=2):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}", fc=fc, ec=ec, lw=lw,
                                zorder=z))
    if text:
        ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs, color=tc,
                family=MONO if mono else None, zorder=z + 1, linespacing=1.25)


def canvas(figsize, xlim, ylim):
    fig, ax = plt.subplots(figsize=figsize)
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.set_aspect("equal"); ax.axis("off")
    return fig, ax


# ----------------------------------------------------------------------------------------------------------
def legb():
    fig, ax = canvas((7.2, 3.9), (0, 15.0), (0, 8.1))
    levels = [("Built-in", "print, len, range, sum, ValueError, …", style.GOLD),
              ("Global", "top-level names of the module: x, data", style.BLUE),
              ("Enclosing", "names of make_counter: count", style.VIOLET),
              ("Local", "names assigned inside increment", style.TEAL)]
    tops = []
    for i, (name, desc, c) in enumerate(levels):
        m = 0.35 * i
        top = 7.9 - 1.25 * i
        tops.append(top)
        box(ax, m, 0.15 + m, 15.0 - 2 * m, top - 0.15 - m, fc=style.TINT[c], ec=c, r=0.2, z=1 + i)
        ax.text(m + 0.3, top - 0.45, name, ha="left", va="center", fontsize=9.5, weight="semibold", color=c, zorder=10)
        ax.text(3.1, top - 0.45, desc, ha="left", va="center", fontsize=8.5, color=style.INK2, zorder=10)
    found = [("count", 2, 9.9), ("x", 1, 11.5), ("len", 0, 13.1)]
    y0 = 1.75
    ax.text(1.5, 3.0, "inside increment:", ha="left", va="center", fontsize=8.5, color=style.INK, zorder=10)
    ax.text(1.5, 2.35, "return count + x + len(data)", ha="left", va="center", fontsize=8.5, family=MONO,
            color=style.INK, zorder=10)
    ax.text(1.5, 1.7, "each lookup starts here and moves outward", ha="left", va="center", fontsize=8,
            color=style.INK2, zorder=10)
    for name, lev, x in found:
        c = levels[lev][2]
        yt = tops[lev] - 0.45
        ax.add_patch(Circle((x, y0), 0.13, color=style.INK, zorder=11))
        ax.add_patch(FancyArrowPatch((x, y0 + 0.13), (x, yt - 0.27), arrowstyle="-|>", mutation_scale=10,
                                     color=style.INK, lw=1.3, shrinkA=0, shrinkB=0, zorder=11))
        box(ax, x - 0.65, yt - 0.27, 1.3, 0.54, name, fc="white", ec=c, mono=True, fs=8.5, z=12, lw=1.4)
    style.save(fig, SLUG, "legb")


# ----------------------------------------------------------------------------------------------------------
PROGRAM = '''\
def lennard_jones(r, epsilon=1.0, sigma=1.0):
    sr6 = (sigma / r) ** 6
    return 4 * epsilon * (sr6 * sr6 - sr6)

def total_energy(positions):
    e = 0.0
    for i in range(len(positions)):
        for j in range(i + 1, len(positions)):
            r = abs(positions[i] - positions[j])
            e += lennard_jones(r)
    return e

def run_md(positions, steps):
    for step in range(steps):
        e = total_energy(positions)

positions = [0.0, 1.12, 0.0]     # atoms 0 and 2 overlap
run_md(positions, steps=1000)
'''


def real_traceback():
    """Run PROGRAM as if it were the file run.py and return the traceback Python prints."""
    import linecache
    linecache.cache["run.py"] = (len(PROGRAM), None, PROGRAM.splitlines(True), "run.py")
    code = compile(PROGRAM, "run.py", "exec")
    try:
        exec(code, {"__name__": "__main__"})
    except ZeroDivisionError as err:
        tb = "".join(traceback.format_exception(type(err), err, err.__traceback__.tb_next))  # drop this exec frame
    return [line for line in tb.splitlines() if not (line.strip() and set(line.strip()) <= set("^~ "))]


def tracebackfig():
    lines = real_traceback()
    print("  " + "\n  ".join(lines))
    fig, ax = canvas((7.2, 4.0), (0, 15.4), (-0.2, 8.4))
    # the stack, newest on top
    frames = [("lennard_jones", "r = 0.0  sigma = 1.0  …", style.PINK),
              ("total_energy", "i = 0  j = 2  r = 0.0", style.VIOLET),
              ("run_md", "step = 0  steps = 1000", style.BLUE),
              ("<module>", "positions  run_md  …", style.INK3)]
    ax.text(0, 8.1, "call stack (newest on top)", ha="left", va="center", fontsize=8.5, color=style.INK2)
    for k, (name, loc, c) in enumerate(frames):
        y = 6.2 - 1.75 * k
        box(ax, 0, y, 6.5, 1.4, "", fc=style.TINT.get(c, style.BG2), ec=c)
        ax.text(0.3, y + 1.0, name, ha="left", va="center", fontsize=8.5, family=MONO, color=style.INK)
        ax.text(0.3, y + 0.42, loc, ha="left", va="center", fontsize=8, family=MONO, color=style.INK2)
        n = 4 - k
        ax.add_patch(Circle((6.5, y + 1.4), 0.25, fc=c, ec="white", lw=1, zorder=5))
        ax.text(6.5, y + 1.4, str(n), ha="center", va="center", fontsize=8, color="white", weight="semibold",
                zorder=6)
    # the traceback text
    x0, y = 7.4, 8.1
    ax.text(x0, y, "what Python prints (oldest call first)", ha="left", va="center", fontsize=8.5,
            color=style.INK2)
    y -= 0.75
    num = 0
    cols = {1: style.INK3, 2: style.BLUE, 3: style.VIOLET, 4: style.PINK}
    for line in lines:
        is_file = line.lstrip().startswith("File")
        is_err = not line.startswith(" ") and "Error" in line
        if is_file:
            num += 1
            ax.add_patch(Circle((x0 + 0.05, y), 0.22, fc=cols[num], ec="none", zorder=5))
            ax.text(x0 + 0.05, y, str(num), ha="center", va="center", fontsize=8, color="white",
                    weight="semibold", zorder=6)
        txt = line.replace('File "run.py", ', "run.py, ")
        ax.text(x0 + 0.45, y, txt.strip() if is_file or is_err or line.startswith("Trace") else "   " + txt.strip(),
                ha="left", va="center", fontsize=8, family=MONO,
                color=style.PINK if is_err else (style.INK if is_file else style.INK2))
        y -= 0.62 if not is_file else 0.55
        if not is_file and not line.startswith("Trace") and not is_err:
            y -= 0.12
    ax.text(x0, -0.05, "read from the bottom: the error, then the line that raised it, then who called it",
            ha="left", va="center", fontsize=8, color=style.INK2)
    style.save(fig, SLUG, "traceback")


# ----------------------------------------------------------------------------------------------------------
def derivative(f, x, h=1e-5):
    """The chapter's central difference."""
    return (f(x + h) - f(x - h)) / (2 * h)


def stepsize():
    hs = np.logspace(-13, -0.5, 121)
    x, exact = 1.0, math.cos(1.0)
    central = np.array([abs(derivative(math.sin, x, h) - exact) for h in hs])
    forward = np.array([abs((math.sin(x + h) - math.sin(x)) / h - exact) for h in hs])
    central = np.maximum(central, 1e-17); forward = np.maximum(forward, 1e-17)
    e5 = abs(derivative(math.sin, x, 1e-5) - exact)
    eps = np.finfo(float).eps
    hopt_c = (3 * eps) ** (1 / 3); hopt_f = 2 * math.sqrt(eps)
    print(f"  error at h = 1e-5: {e5:.1e}; best central {central.min():.1e} at h = {hs[central.argmin()]:.0e};"
          f" best forward {forward.min():.1e} at h = {hs[forward.argmin()]:.0e}; rule-of-thumb h: central "
          f"{hopt_c:.1e}, forward {hopt_f:.1e}")
    fig, ax = plt.subplots(figsize=(7.2, 3.5))
    ax.loglog(hs, forward, color=style.ORANGE, lw=1.4)
    ax.loglog(hs, central, color=style.BLUE, lw=1.8)
    model = math.sin(1.0) / 6 * hs ** 2           # truncation term of the central difference, h^2 |f'''| / 6
    ax.loglog(hs[hs > 3e-6], model[hs > 3e-6], color=style.INK3, lw=1, ls=(0, (4, 3)))
    ax.loglog(hs[hs < 3e-4], (eps / hs)[hs < 3e-4], color=style.INK3, lw=1, ls=(0, (4, 3)))
    ax.axvline(1e-5, color=style.TEAL, lw=1, ls=(0, (2, 2)))
    ax.text(1.25e-5, 3e-1, "default h = 1e-5", ha="left", va="center", fontsize=8.5, color=style.TEAL)
    ax.text(3e-12, 3e-3, "rounding error ≈ ε / h\n(cancellation in f(x + h) − f(x − h))", ha="left", va="center",
            fontsize=8.5, color=style.INK2, linespacing=1.2)
    ax.text(1.5e-3, 1e-10, "truncation\nerror ≈ h²|f‴| / 6", ha="left", va="center", fontsize=8.5,
            color=style.INK2, linespacing=1.2)
    ax.text(1.5e-6, 2e-3, "forward\ndifference", ha="center", va="center", fontsize=8.5, color=style.ORANGE,
            linespacing=1.2)
    ax.text(2.5e-2, 2e-7, "central\ndifference", ha="center", va="center", fontsize=8.5, color=style.BLUE,
            linespacing=1.2)
    ax.set_xlabel("step h")
    ax.set_ylabel("|error| in d/dx sin x at x = 1")
    ax.set_ylim(1e-13, 3)
    ax.set_xlim(1e-13, 0.6)
    style.save(fig, SLUG, "stepsize")


# ----------------------------------------------------------------------------------------------------------
def memo():
    calls = [0]

    def fib(n):
        calls[0] += 1
        return n if n < 2 else fib(n - 1) + fib(n - 2)

    @functools.lru_cache(maxsize=None)
    def fibc(n):
        calls[0] += 1
        return n if n < 2 else fibc(n - 1) + fibc(n - 2)

    ns = np.arange(0, 41)
    naive, cached = [], []
    for n in ns:
        if n <= 25:
            calls[0] = 0; fib(int(n)); naive.append(calls[0])
        else:                                    # same count from the recurrence C(n) = 1 + C(n-1) + C(n-2)
            naive.append(1 + naive[-1] + naive[-2])
        fibc.cache_clear(); calls[0] = 0; fibc(int(n)); cached.append(calls[0])
    naive, cached = np.array(naive, float), np.array(cached, float)
    print(f"  fib(30): {int(naive[30]):,} calls naive, {int(cached[30])} cached; fib(40): {int(naive[40]):,}")
    fig, ax = plt.subplots(figsize=(7.2, 3.3))
    ax.semilogy(ns, naive, "o-", ms=3, color=style.ORANGE)
    ax.semilogy(ns, cached, "o-", ms=3, color=style.TEAL)
    ax.plot([30], [naive[30]], "o", ms=7, mfc="white", mec=style.ORANGE, mew=1.6)
    ax.plot([30], [cached[30]], "o", ms=7, mfc="white", mec=style.TEAL, mew=1.6)
    ax.text(29, naive[30] * 3, f"fib(30): {int(naive[30]):,} calls", ha="right", va="bottom", fontsize=8.5,
            color=style.ORANGE)
    ax.text(30, cached[30] * 4, f"with @lru_cache: {int(cached[30])} calls", ha="center", va="bottom", fontsize=8.5,
            color=style.TEAL)
    ax.text(12, 2e5, "plain recursion:\ncalls grow as 1.618ⁿ", ha="center", va="center", fontsize=8.5,
            color=style.ORANGE, linespacing=1.2)
    ax.set_xlabel("n in fib(n)")
    ax.set_ylabel("number of calls")
    ax.set_xlim(-1, 41)
    ax.set_ylim(0.6, 1e10)
    ax.grid(True, which="major", axis="y")
    style.save(fig, SLUG, "memo")


# ----------------------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        cx, cy = 2.0, 1.5
        for i, (s, c) in enumerate([(2.1, style.BLUE), (1.45, style.VIOLET), (0.85, style.TEAL), (0.35, style.PINK)]):
            ax.add_patch(FancyBboxPatch((cx - s / 2, cy - s / 2), s, s,
                                        boxstyle=f"round,pad=0,rounding_size={0.12 * s + 0.03}",
                                        fc=c if i == 3 else "none", ec=c, lw=7 - i, zorder=2 + i))
        # arguments in, result out
        ax.plot([0.15, cx - 1.05 - 0.05], [cy, cy], color=style.INK, lw=5, solid_capstyle="round")
        ax.add_patch(Polygon([(cx - 1.05 + 0.02, cy), (cx - 1.05 - 0.3, cy + 0.2), (cx - 1.05 - 0.3, cy - 0.2)],
                             fc=style.INK, ec="none"))
        ax.plot([cx + 1.05, 3.55], [cy, cy], color=style.ORANGE, lw=5, solid_capstyle="round")
        ax.add_patch(Polygon([(3.85, cy), (3.55, cy + 0.2), (3.55, cy - 0.2)], fc=style.ORANGE, ec="none"))
    style.cover(SLUG, draw, bg=style.TINT[style.VIOLET])


if __name__ == "__main__":
    legb(); tracebackfig(); stepsize(); memo(); cover()
