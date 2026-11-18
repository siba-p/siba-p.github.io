"""Figures for content/learn/python-performance.md.  Run: python3 tools/figures/python-performance.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, Wedge
plt = style.setup()
SLUG = "python-performance"
MONO = "DejaVu Sans Mono"


# ---------------------------------------------------------------------------------------------
# 1. Threads, the GIL and processes: four workers, 20 ms of CPU work each
# ---------------------------------------------------------------------------------------------
SWITCH_MS = 5.0          # sys.getswitchinterval() default: 0.005 s
WORK_MS = 20.0


def gil():
    fig, axes = plt.subplots(3, 1, figsize=(7.2, 4.9), sharex=True, gridspec_kw=dict(hspace=0.75))
    titles = ["4 threads, pure Python: one holds the GIL at a time",
              "4 threads calling NumPy, which releases the GIL in compiled loops",
              "4 processes: one interpreter each, no shared lock"]
    ends = []
    for p, ax in enumerate(axes):
        segs = {w: [] for w in range(4)}           # (start, length, kind) kind: py or c
        if p == 0:                                 # round robin in 5 ms slices
            left = [WORK_MS] * 4; t = 0.0
            while max(left) > 0:
                for w in range(4):
                    if left[w] > 0:
                        d = min(SWITCH_MS, left[w]); segs[w].append((t, d, "py")); t += d; left[w] -= d
        elif p == 1:                               # 1 ms Python, 18 ms compiled, 1 ms Python
            gil_free = 0.0; finish = []
            starts = []
            for w in range(4):
                t0 = gil_free; segs[w].append((t0, 1.0, "py")); gil_free = t0 + 1.0
                segs[w].append((t0 + 1.0, 18.0, "c")); starts.append(t0 + 19.0)
            for w in np.argsort(starts):
                t0 = max(gil_free, starts[w]); segs[w].append((t0, 1.0, "py")); gil_free = t0 + 1.0
        else:
            for w in range(4):
                segs[w].append((0.0, WORK_MS, "py"))
        end = max(a + b for v in segs.values() for a, b, _ in v); ends.append(end)
        for w in range(4):
            y = 3 - w
            ax.add_patch(Rectangle((0, y + 0.2), end, 0.6, color=style.BG2, zorder=0))
            for a, b, kind in segs[w]:
                c = style.BLUE if kind == "py" else style.TEAL
                ax.add_patch(Rectangle((a, y + 0.2), b, 0.6, color=c, ec="white", lw=0.8, zorder=2))
        ax.set_ylim(0, 4); ax.set_yticks(np.arange(4) + 0.5)
        ax.set_yticklabels(["w4", "w3", "w2", "w1"], fontsize=8.5); ax.tick_params(axis="y", length=0)
        ax.spines["left"].set_visible(False)
        ax.set_title(titles[p], fontsize=9.5, loc="left", pad=6)
        ax.text(end + 1.0, 2.0, f"{end:.0f} ms", va="center", fontsize=9, color=style.INK, weight="semibold")
    axes[0].set_xlim(0, 92)
    axes[-1].set_xlabel("time (ms)")
    axes[1].text(40, 2.0, "blue: Python bytecode (needs the GIL)\nteal: compiled NumPy loop (GIL released)",
                 fontsize=8.5, color=style.INK2, va="center", linespacing=1.4)
    style.save(fig, SLUG, "gil")
    return ends


# ---------------------------------------------------------------------------------------------
# 2. Roofline for an illustrative machine
# ---------------------------------------------------------------------------------------------
PEAK = 1000.0            # GFLOP/s, double precision
BW = 100.0               # GB/s from main memory
KERNELS = [("c = a + b", 1 / 24), ("sum(a * b)", 2 / 16), ("C = A @ B,  n = 1000", 1000 / 12)]


def roofline():
    I = np.logspace(-2, 3, 400)
    perf = np.minimum(PEAK, BW * I)
    fig, ax = plt.subplots(figsize=style.WIDE)
    ax.loglog(I, perf, color=style.INK, lw=2.2)
    ax.fill_between(I, 0.3, perf, color=style.TINT[style.BLUE], zorder=0)
    ridge = PEAK / BW
    ax.axvline(ridge, color=style.INK3, lw=0.8, ls=(0, (3, 2)))
    ax.text(ridge * 1.12, 1.6, f"ridge: {ridge:.0f} flop/byte", fontsize=8.5, color=style.INK2)
    ax.text(0.25, BW * 0.25 * 1.9, f"memory-bound: {BW:.0f} GB/s × intensity", fontsize=9, color=style.INK2,
            rotation=33, rotation_mode="anchor")
    ax.text(150, PEAK * 1.5, f"compute-bound: peak {PEAK:.0f} GFLOP/s", fontsize=9, color=style.INK2, ha="center")
    cols = [style.PINK, style.ORANGE, style.TEAL]
    offs = [(1.25, 0.55), (1.25, 0.55), (1.0, 0.5)]
    for (name, i), c, (dx, dy) in zip(KERNELS, cols, offs):
        p = min(PEAK, BW * i)
        ax.plot(i, p, "o", color=c, ms=8, zorder=4)
        ha = "left" if dx > 1 else "center"
        ax.text(i * dx, p * dy, f"{name}\n{i:.3g} flop/B → {p:.3g} GFLOP/s".replace("1e+03", "1000"), fontsize=8.5,
                color=c, ha=ha, va="top", linespacing=1.3)
    ax.set_xlim(1e-2, 1e3); ax.set_ylim(0.3, 3000)
    ax.set_xlabel("arithmetic intensity (flop per byte moved from memory)")
    ax.set_ylabel("attainable GFLOP/s")
    style.save(fig, SLUG, "roofline")


# ---------------------------------------------------------------------------------------------
# 3. Pair evaluations per step: all pairs against cell and Verlet lists (Lennard-Jones liquid)
# ---------------------------------------------------------------------------------------------
RHO, RC, SKIN = 0.8442, 2.5, 0.3


def pairs():
    N = np.logspace(1, 7, 300)
    allp = N * (N - 1) / 2
    cell_per_atom = 27 * RHO * RC ** 3 / 2                     # 27 cells of side rc, each pair once
    verlet_per_atom = 4 / 3 * np.pi * (RC + SKIN) ** 3 * RHO / 2
    cell = N * cell_per_atom; verlet = N * verlet_per_atom
    cross = 2 * cell_per_atom + 1
    fig, ax = plt.subplots(figsize=style.WIDE)
    ax.loglog(N, allp, color=style.PINK, lw=2.2)
    ax.loglog(N, cell, color=style.BLUE, lw=2.2)
    ax.loglog(N, verlet, color=style.TEAL, lw=2.2)
    ax.text(1.2e4, 1.2e4 ** 2 / 2 * 1.5, r"all pairs  $N(N-1)/2$", color=style.PINK, fontsize=9, ha="right")
    ax.text(1e5, 1e5 * cell_per_atom * 6, f"cell list: {cell_per_atom:.0f} per atom", color=style.BLUE, fontsize=9,
            ha="center")
    ax.text(3e5, 3e5 * verlet_per_atom / 30, f"Verlet list: {verlet_per_atom:.0f} per atom", color=style.TEAL,
            fontsize=9, ha="center")
    ax.plot(cross, cross * cell_per_atom, "o", color=style.INK2, ms=5)
    ax.annotate(f"break-even near N = {cross:.0f}", (cross, cross * cell_per_atom), (40, 2e6), fontsize=8.5,
                color=style.INK2, arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    n6 = 1e6
    r = (n6 * (n6 - 1) / 2) / (n6 * cell_per_atom)
    ax.annotate("", (n6, n6 * cell_per_atom), (n6, n6 * (n6 - 1) / 2),
                arrowprops=dict(arrowstyle="<->", color=style.INK2, lw=1, shrinkA=2, shrinkB=2))
    ax.text(n6 * 1.3, np.sqrt(n6 * cell_per_atom * n6 * n6 / 2), f"× {r:,.0f}\nat a million\natoms",
            fontsize=8.5, color=style.INK, va="center", linespacing=1.3)
    ax.set_xlim(10, 1e7); ax.set_ylim(10, 1e14)
    ax.set_xlabel("number of atoms N"); ax.set_ylabel("pair distances per step")
    sec = ax.secondary_yaxis("right", functions=(lambda y: y * 1e-9, lambda t: t * 1e9))
    sec.set_ylabel("seconds per step at 1 ns per pair")
    style.save(fig, SLUG, "pairs")
    return cell_per_atom, verlet_per_atom, cross, r


# ---------------------------------------------------------------------------------------------
# Cover: a stopwatch whose face is a profile, one slice dominating
# ---------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        cx, cy, R = 2.0, 1.4, 1.1
        ax.add_patch(Rectangle((cx - 0.16, cy + R + 0.02), 0.32, 0.28, color=style.INK, zorder=1))
        ax.add_patch(FancyBboxPatch((cx - 0.3, cy + R + 0.28), 0.6, 0.16, boxstyle="round,pad=0,rounding_size=0.06",
                                    color=style.INK, zorder=1))
        ax.add_patch(Circle((cx, cy), R + 0.12, color=style.INK, zorder=1))
        ax.add_patch(Circle((cx, cy), R, color="white", zorder=2))
        shares = [0.68, 0.12, 0.09, 0.06, 0.05]
        cols = [style.PINK, style.BLUE, style.TEAL, style.GOLD, style.VIOLET]
        a = 90.0
        for f, c in zip(shares, cols):
            ax.add_patch(Wedge((cx, cy), R * 0.86, a - 360 * f, a, fc=c, ec="white", lw=2.5, zorder=3))
            a -= 360 * f
        ax.add_patch(Circle((cx, cy), 0.09, color=style.INK, zorder=5))
        ax.plot([cx, cx + 0.75 * np.cos(np.radians(-30))], [cy, cy + 0.75 * np.sin(np.radians(-30))],
                color=style.INK, lw=4, solid_capstyle="round", zorder=4)
    style.cover(SLUG, draw, bg=style.TINT[style.PINK])


if __name__ == "__main__":
    print("   GIL lanes end at", gil())
    roofline()
    print("   cell %.1f, verlet %.1f per atom, break-even N = %.0f, ratio at 1e6 = %.0f" % pairs())
    cover()
