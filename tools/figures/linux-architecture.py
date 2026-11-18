"""Figures for content/learn/linux-architecture.md: the life of a command (fork, exec, wait) across the
user/kernel boundary, two processes' virtual memory mapped onto physical RAM, and the cost of swapping."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, Wedge, FancyArrowPatch
plt = style.setup()
SLUG = "linux-architecture"

T_RAM = 90e-9      # main-memory access, as in the latency figure of inside-a-computer
T_SSD = 80e-6      # NVMe random read
T_HDD = 5e-3       # hard-disk seek


def box(ax, x, y, w, h, fc, ec=None, r=0.08, lw=1.0, z=1):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}", fc=fc, ec=ec or fc, lw=lw, zorder=z))


def fork_exec():
    fig, ax = plt.subplots(figsize=(7.2, 3.8))
    ax.set_xlim(-1.9, 12.0); ax.set_ylim(-0.3, 4.9); ax.axis("off")
    ax.add_patch(Rectangle((-1.9, -0.3), 13.9, 1.4, fc=style.TINT[style.VIOLET], ec="none", zorder=0))
    ax.plot([-1.9, 12.0], [1.1, 1.1], color=style.VIOLET, lw=1.0, ls=(0, (4, 3)))
    ax.text(-1.8, 4.55, "user mode", fontsize=9, fontweight="semibold", color=style.INK2, va="center")
    ax.text(-1.8, 0.75, "kernel mode", fontsize=9, fontweight="semibold", color=style.VIOLET, va="center")
    yP, yC, yK, yS = 3.55, 2.15, 0.6, 0.12
    ax.text(-1.8, yP, "bash\nPID 4120", fontsize=8.5, color=style.BLUE, va="center", linespacing=1.2)
    ax.text(-1.8, yC, "child\nPID 4121", fontsize=8.5, color=style.INK2, va="center", linespacing=1.2)
    lw = 3.2

    def seg(x0, x1, y, col):
        ax.plot([x0, x1], [y, y], color=col, lw=lw, solid_capstyle="round", zorder=3)

    def dip(x, y, col, w=0.24):
        ax.plot([x, x, x + w, x + w], [y, yK, yK, y], color=col, lw=1.6, zorder=2)
        ax.add_patch(Circle((x + w / 2, yK), 0.07, color=style.VIOLET, zorder=4))

    def call(x, lab, bold=False):
        ax.text(x, 1.5, lab, fontsize=9 if bold else 8, color=style.INK if bold else style.INK2, ha="center",
                fontweight="semibold" if bold else "normal")

    # parent: reads the line, forks, then waits
    seg(-0.4, 1.0, yP, style.BLUE)
    ax.text(0.3, yP + 0.32, "reads  ls > files.txt", fontsize=8.5, color=style.INK2, ha="center")
    dip(1.0, yP, style.BLUE)
    seg(1.24, 1.9, yP, style.BLUE)
    ax.plot([1.9, 1.9], [yP, yS], color=style.BLUE, lw=1.6, zorder=2)
    ax.plot([1.9, 10.35], [yS, yS], color=style.BLUE, lw=1.6, ls=(0, (2, 2)), zorder=2)
    ax.text(2.1, yS - 0.05, "bash asleep in wait4(), using no CPU", fontsize=8, color=style.BLUE, ha="left", va="top")
    ax.plot([10.35, 10.35], [yS, yP], color=style.BLUE, lw=1.6, zorder=2)
    seg(10.35, 11.7, yP, style.BLUE)
    ax.text(11.0, yP + 0.32, "status 0; prompt", fontsize=8.5, color=style.INK2, ha="center")
    ax.text(0.9, 1.5, "fork()", fontsize=9, color=style.INK, ha="right", fontweight="semibold")
    ax.text(2.0, 1.5, "wait4()", fontsize=8, color=style.INK2, ha="left")
    ax.add_patch(FancyArrowPatch((1.12, yK), (1.65, yC), connectionstyle="arc3,rad=-0.3",
                                 arrowstyle="-|>,head_length=4,head_width=2.5", color=style.INK2, lw=1.2, zorder=3))
    # child: a copy of bash, then exec
    seg(1.65, 3.3, yC, style.TEAL)
    ax.text(2.75, yC + 0.3, "copy of bash:\nfd 1 → files.txt", fontsize=8, color=style.TEAL, ha="center", va="bottom", linespacing=1.2)
    dip(3.3, yC, style.TEAL, w=0.32)
    ax.text(3.72, 1.5, "execve(\"/usr/bin/ls\")", fontsize=8.5, color=style.INK, ha="left", fontweight="semibold")
    seg(3.62, 9.85, yC, style.ORANGE)
    ax.text(4.6, yC + 0.3, "now ls: same PID, same fd 1, new program", fontsize=8.5, color=style.ORANGE, ha="left")
    for x, lab in [(6.0, "openat"), (7.3, "getdents64"), (8.6, "write(1, …)")]:
        dip(x - 0.1, yC, style.ORANGE, w=0.2)
    ax.text(9.55, 0.36, "ls's own system calls: openat, getdents64, write(1, …)", fontsize=8, color=style.INK2, ha="right", va="center")
    ax.plot([9.85, 9.85], [yC, yK], color=style.ORANGE, lw=1.6, zorder=2)
    ax.add_patch(Circle((9.85, yK), 0.07, color=style.VIOLET, zorder=4))
    call(9.85, "exit(0)", True)
    ax.add_patch(FancyArrowPatch((9.93, yK - 0.05), (10.3, yS + 0.06), connectionstyle="arc3,rad=0.3",
                                 arrowstyle="-|>,head_length=4,head_width=2.5", color=style.VIOLET, lw=1.2, zorder=3))
    ax.annotate("", xy=(11.9, 4.65), xytext=(9.6, 4.65), arrowprops=dict(arrowstyle="-|>", color=style.INK3, lw=0.8))
    ax.text(9.5, 4.65, "time", fontsize=8.5, color=style.INK3, ha="right", va="center")
    style.save(fig, SLUG, "fork-exec")


def virtual_memory():
    fig, ax = plt.subplots(figsize=(7.2, 4.1))
    ax.set_xlim(-0.4, 12.4); ax.set_ylim(-1.9, 6.6); ax.set_aspect("equal"); ax.axis("off")
    pages = ["0x400000  code", "0x401000  data", "heap", "heap, untouched", "libc code", "stack"]
    mapA = [2, 7, 4, None, 9, "swap"]
    mapB = [5, 0, 10, None, 9, 3]
    ph = 0.62
    yv = lambda i: 5.4 - i * 0.9
    nF, fh = 12, 0.42
    yf = lambda j: 5.65 - j * 0.48
    xA, xB, xR = -0.2, 9.45, 5.3
    wv, wr = 2.75, 1.6
    ax.text(xA + wv / 2, 6.35, "Process A: virtual", ha="center", fontsize=9.5, fontweight="semibold", color=style.BLUE)
    ax.text(xB + wv / 2, 6.35, "Process B: virtual", ha="center", fontsize=9.5, fontweight="semibold", color=style.ORANGE)
    ax.text(xR + wr / 2, 6.35, "Physical RAM", ha="center", fontsize=9.5, fontweight="semibold", color=style.INK)
    owner = {}
    for i, (a, b) in enumerate(zip(mapA, mapB)):
        if isinstance(a, int): owner[a] = "A"
        if isinstance(b, int): owner[b] = "shared" if owner.get(b) == "A" else "B"
    fill = {"A": style.TINT[style.BLUE], "B": style.TINT[style.ORANGE], "shared": style.TINT[style.VIOLET]}
    edge = {"A": style.BLUE, "B": style.ORANGE, "shared": style.VIOLET}
    for j in range(nF):
        o = owner.get(j)
        box(ax, xR, yf(j) - fh / 2, wr, fh, fill.get(o, "white"), edge.get(o, style.LINE), r=0.05, lw=1.0)
        ax.text(xR - 0.1, yf(j), f"frame {j}", ha="right", va="center", fontsize=8, color=style.INK3)
    # swap
    box(ax, xR - 0.2, -1.75, wr + 0.4, 0.75, style.BG2, style.INK3, r=0.1)
    ax.text(xR + wr / 2, -1.37, "swap on disk", ha="center", va="center", fontsize=8.5, color=style.INK2)
    for xs, mp, col, side in [(xA, mapA, style.BLUE, 1), (xB, mapB, style.ORANGE, -1)]:
        for i, (name, m) in enumerate(zip(pages, mp)):
            y = yv(i)
            grey = m is None
            box(ax, xs, y - ph / 2, wv, ph, style.BG2 if grey else "white", style.LINE if grey else col, r=0.06, lw=1.0)
            ax.text(xs + wv / 2, y, name, ha="center", va="center", fontsize=8.5, color=style.INK3 if grey else style.INK)
            x0 = xs + wv if side == 1 else xs
            if m is None:
                continue
            if m == "swap":
                tgt = (xR - 0.2 + 0.25, -1.0)
            else:
                tgt = (xR if side == 1 else xR + wr, yf(m))
            ax.add_patch(FancyArrowPatch((x0, y), tgt, arrowstyle="-|>,head_length=4,head_width=2.5",
                                         connectionstyle="arc3,rad=0.0", color=col, lw=1.1, alpha=0.9,
                                         ls="--" if m == "swap" else "-", zorder=0.5))
    ax.text(xA + wv / 2, yv(5) - 0.75, "a page not used for a while\ncan be moved to swap", ha="center", va="top", fontsize=8, color=style.INK2, linespacing=1.2)
    ax.text(xB + wv / 2, yv(5) - 0.75, "untouched pages\nuse no RAM at all", ha="center", va="top", fontsize=8, color=style.INK2, linespacing=1.2)
    ax.text(xR + wr / 2, yf(nF - 1) - 0.42, "one libc frame, shared", ha="center", va="top", fontsize=8, color=style.VIOLET)
    style.save(fig, SLUG, "virtual-memory")


def swap_slowdown():
    p = np.logspace(-7, -1, 300)
    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    for t, col, name in [(T_HDD, style.PINK, "hard disk, 5 ms per fault"), (T_SSD, style.TEAL, "NVMe SSD, 80 µs per fault")]:
        s = (1 - p) + p * t / T_RAM
        ax.loglog(p, s, color=col, lw=2.2)
        if t == T_HDD:
            ax.text(1.5e-6, 2.6, name, color=col, fontsize=9, va="bottom")
        else:
            ax.text(3e-3, 1.2, name, color=col, fontsize=9, va="bottom", ha="left")
    for pp in [1e-3, 1e-2]:
        s = (1 - pp) + pp * T_HDD / T_RAM
        ax.plot([pp], [s], "o", color=style.PINK, ms=5, zorder=5)
        ax.text(pp * 0.75, s * 1.3, f"{s:,.0f}× slower", color=style.INK2, fontsize=8.5, ha="right", va="bottom")
    ax.axhline(1, color=style.INK3, lw=0.8)
    ax.set_xlim(1e-7, 1e-1); ax.set_ylim(0.7, 1e4)
    ax.set_xticks([1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1])
    ax.set_xticklabels(["1 in 10 million", "", "1 in 100,000", "", "1 in 1,000", "", "1 in 10"])
    ax.set_yticks([1, 10, 100, 1000, 10000]); ax.set_yticklabels(["1", "10", "100", "1,000", "10,000"])
    ax.minorticks_off()
    ax.set_xlabel("fraction of memory accesses that must wait for swap")
    ax.set_ylabel("slowdown relative to RAM")
    ax.grid(True, color=style.LINE, lw=0.6); ax.set_axisbelow(True)
    style.save(fig, SLUG, "swap-slowdown")


def cover():
    def draw(ax):
        c = (2.0, 1.5)
        ax.add_patch(Circle(c, 1.38, color=style.TINT[style.BLUE], lw=0))
        # processes around the outside
        cols = [style.BLUE, style.ORANGE, style.TEAL, style.PINK, style.GOLD, style.BLUE, style.TEAL, style.ORANGE]
        for k, col in enumerate(cols):
            a = np.radians(90 + k * 45)
            ax.add_patch(Circle((c[0] + 1.17 * np.cos(a), c[1] + 1.17 * np.sin(a)), 0.17, color=col, lw=0))
        # kernel ring with one gate
        ax.add_patch(Wedge(c, 0.95, 90 + 14, 90 - 14 + 360, width=0.28, color=style.VIOLET, lw=0))
        # hardware core
        ax.add_patch(FancyBboxPatch((c[0] - 0.4, c[1] - 0.4), 0.8, 0.8, boxstyle="round,pad=0,rounding_size=0.08", fc=style.INK, ec="none"))
        for k in range(3):
            for side in (-1, 1):
                t = c[0] - 0.24 + 0.24 * k
                ax.add_patch(Rectangle((t - 0.04, c[1] + side * 0.4 + (0 if side > 0 else -0.1)), 0.08, 0.1, color=style.GOLD, lw=0))
                ax.add_patch(Rectangle((c[0] + side * 0.4 + (0 if side > 0 else -0.1), c[1] - 0.24 + 0.24 * k - 0.04), 0.1, 0.08, color=style.GOLD, lw=0))
        # a system call passing through the gate
        ax.add_patch(FancyArrowPatch((c[0], c[1] + 1.0), (c[0], c[1] + 0.47), arrowstyle="-|>,head_length=5,head_width=4",
                                     color=style.BLUE, lw=3))
    style.cover(SLUG, draw, bg=style.TINT[style.VIOLET])


if __name__ == "__main__":
    fork_exec(); virtual_memory(); swap_slowdown(); cover()
    for pp in (1e-5, 1e-3, 1e-2):
        print(pp, "HDD", (1 - pp) + pp * T_HDD / T_RAM, "SSD", (1 - pp) + pp * T_SSD / T_RAM)
