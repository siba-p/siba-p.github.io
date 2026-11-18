"""Figures for content/learn/inside-a-computer.md: the anatomy of a multicore chip, an instruction pipeline,
cache lines and loop order, and the roofline model computed from the chapter's numbers."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, Wedge, FancyArrowPatch, Polygon
plt = style.setup()
SLUG = "inside-a-computer"

# Numbers used in the text
PEAK_CPU = 64 * 2.5e9 * 16          # 2.56e12 FLOP/s: 64 cores, 2.5 GHz, 16 FLOP per cycle
BW_CPU = 8 * 25.6e9                 # 204.8 GB/s: eight channels of DDR4-3200
PEAK_GPU = 9.7e12                   # NVIDIA A100 (40 GB), FP64 without tensor cores
BW_GPU = 1555e9                     # its HBM2 bandwidth


def box(ax, x, y, w, h, fc, ec=None, r=0.12, lw=1.0, z=1):
    p = FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}", fc=fc, ec=ec or fc, lw=lw, zorder=z)
    ax.add_patch(p)
    return p


def chip():
    fig, ax = plt.subplots(figsize=(7.2, 3.9))
    ax.set_xlim(0, 14); ax.set_ylim(0, 7.6); ax.set_aspect("equal"); ax.axis("off")
    # the chip
    box(ax, 0.2, 0.3, 9.2, 7.0, style.BG2, style.INK3, r=0.25, lw=1.2, z=0)
    ax.text(0.5, 6.9, "Processor chip", fontsize=10, fontweight="semibold", color=style.INK, va="center")
    ax.text(9.1, 6.9, "8 to 128 cores on a server chip", fontsize=8.5, color=style.INK3, va="center", ha="right")
    xs = [0.6, 2.8, 5.0, 7.2]
    for i, x0 in enumerate(xs):
        box(ax, x0, 3.55, 2.0, 2.95, "white", style.BLUE, r=0.12, lw=1.1)
        ax.text(x0 + 1.0, 6.18, f"Core {i}", ha="center", va="center", fontsize=9, fontweight="semibold", color=style.BLUE)
        box(ax, x0 + 0.15, 5.38, 1.7, 0.5, style.TINT[style.BLUE], r=0.08)
        ax.text(x0 + 1.0, 5.63, "registers", ha="center", va="center", fontsize=8, color=style.INK2)
        box(ax, x0 + 0.15, 4.62, 1.7, 0.6, style.TINT[style.TEAL], r=0.08)
        ax.text(x0 + 1.0, 4.92, "L1  32–64 KB", ha="center", va="center", fontsize=8, color=style.INK)
        box(ax, x0 + 0.15, 3.75, 1.7, 0.7, style.TINT[style.VIOLET], r=0.08)
        ax.text(x0 + 1.0, 4.1, "L2  0.5–2 MB", ha="center", va="center", fontsize=8, color=style.INK)
    box(ax, 0.6, 2.25, 8.6, 0.95, style.TINT[style.ORANGE], style.ORANGE, r=0.1, lw=1.0)
    ax.text(4.9, 2.72, "L3 cache  8–64 MB, shared by all cores", ha="center", va="center", fontsize=9, color=style.INK)
    box(ax, 0.6, 0.6, 4.2, 1.25, "white", style.INK3, r=0.1)
    ax.text(2.7, 1.22, "PCIe: GPU, SSD, network", ha="center", va="center", fontsize=8.5, color=style.INK2)
    box(ax, 5.0, 0.6, 4.2, 1.25, "white", style.INK3, r=0.1)
    ax.text(7.1, 1.22, "memory controllers", ha="center", va="center", fontsize=8.5, color=style.INK2)
    # latency tags
    tag = dict(fontsize=8.5, color=style.INK2, ha="left", va="center")
    ax.annotate("~1 ns", xy=(9.05, 4.92), xytext=(9.7, 5.3), arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.7), **tag)
    ax.annotate("~4 ns", xy=(9.05, 4.1), xytext=(9.7, 4.2), arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.7), **tag)
    ax.annotate("~15 ns", xy=(9.2, 2.72), xytext=(9.7, 3.1), arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.7), **tag)
    # DRAM
    ax.text(12.3, 7.0, "Main memory (DRAM)", ha="center", va="center", fontsize=9, fontweight="semibold", color=style.INK)
    ax.text(12.3, 6.55, "16 GB – 1 TB,  ~90 ns", ha="center", va="center", fontsize=8.5, color=style.INK2)
    for k in range(4):
        y = 5.75 - 0.55 * k
        box(ax, 10.9, y, 2.8, 0.38, style.TINT[style.GOLD], style.GOLD, r=0.05)
        for j in range(6):
            ax.add_patch(Rectangle((11.1 + 0.42 * j, y + 0.08), 0.3, 0.22, color=style.GOLD, lw=0))
    # memory channels: from the controllers to the DIMMs
    ax.plot([9.2, 12.3], [1.22, 1.22], color=style.GOLD, lw=3.2, solid_capstyle="butt", zorder=0.5)
    ax.annotate("", xy=(12.3, 4.0), xytext=(12.3, 1.06), arrowprops=dict(arrowstyle="-|>,head_length=0.6,head_width=0.35",
                color=style.GOLD, lw=3.2, shrinkA=0, shrinkB=0))
    ax.text(12.5, 2.4, "8 channels\n≈ 200 GB/s\nfor the\nwhole chip", ha="left", va="center", fontsize=8.5, color=style.INK2, linespacing=1.3)
    style.save(fig, SLUG, "chip")


def pipeline():
    instr = ["LOAD 14", "ADD 13", "STORE 14", "LOAD 13", "SUB 15"]
    stages = [("F", style.BLUE, "fetch"), ("D", style.VIOLET, "decode"), ("E", style.TEAL, "execute")]
    n, k = len(instr), len(stages)
    fig, axes = plt.subplots(2, 1, figsize=(7.2, 4.5), sharex=True, gridspec_kw=dict(hspace=0.55))
    for ax, piped in zip(axes, [False, True]):
        total = n + k - 1 if piped else n * k
        for i, name in enumerate(instr):
            start = i if piped else i * k
            for s, (lab, col, _) in enumerate(stages):
                c = start + s
                ax.add_patch(FancyBboxPatch((c + 0.06, i + 0.12), 0.88, 0.76, boxstyle="round,pad=0,rounding_size=0.12",
                                            fc=col, ec="none"))
                ax.text(c + 0.5, i + 0.5, lab, ha="center", va="center", fontsize=9, color="white", fontweight="semibold")
        ax.set_ylim(n, 0); ax.set_xlim(0, n * k)
        ax.set_yticks(np.arange(n) + 0.5); ax.set_yticklabels(instr, fontsize=8.5, family="monospace" if False else None)
        ax.tick_params(axis="y", length=0)
        ax.spines["left"].set_visible(False)
        ax.axvline(total, color=style.PINK, lw=1.2, ls=(0, (3, 2)))
        ax.text(total + 0.15, n - 0.3, f"done after {total} cycles", color=style.PINK, fontsize=9, va="center")
        title = ("One instruction at a time, as in the toy machine: 5 × 3 = 15 cycles" if not piped
                 else "Pipelined: a new instruction starts every cycle, 3 + 5 − 1 = 7 cycles")
        ax.set_title(title, fontsize=10)
    axes[1].set_xticks(np.arange(0, n * k + 1, 1)); axes[1].set_xticklabels([str(i) if i % 1 == 0 else "" for i in range(n * k + 1)])
    axes[1].set_xlabel("clock cycle")
    axes[0].tick_params(axis="x", labelbottom=True)
    # key for the three stages
    for s, (lab, col, word) in enumerate(stages):
        axes[1].text(9.5, 1.0 + 1.0 * s, f"{lab} = {word}", color=col, fontsize=9, fontweight="semibold", va="center")
    style.save(fig, SLUG, "pipeline")


def cache_lines():
    R, C = 6, 8
    fig, axes = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.12))
    for ax, by_row in zip(axes, [True, False]):
        ax.set_xlim(-0.3, C + 0.3); ax.set_ylim(R + 2.2, -0.75); ax.set_aspect("equal"); ax.axis("off")
        for r in range(R):
            tint = style.TINT[style.BLUE] if r % 2 == 0 else style.TINT[style.TEAL]
            ax.add_patch(FancyBboxPatch((0.04, r + 0.08), C - 0.08, 0.84, boxstyle="round,pad=0,rounding_size=0.12",
                                        fc=tint, ec=style.INK3, lw=0.6))
            for c in range(1, C):
                ax.plot([c, c], [r + 0.16, r + 0.84], color="white", lw=1.2)
        ax.text(C / 2, -0.2, "8 doubles per row: one row is one 64-byte cache line", ha="center", va="bottom", fontsize=8, color=style.INK2)
        if by_row:
            pts = [(c + 0.5, r + 0.5) for r in range(R) for c in range(C)]
            col = style.TEAL
        else:
            pts = [(c + 0.5, r + 0.5) for c in range(C) for r in range(R)]
            col = style.PINK
        xs, ys = zip(*pts[:3 * (C if by_row else R) + 2])
        xs_all, ys_all = zip(*pts)
        ax.plot(xs_all, ys_all, color=col, lw=1.0, alpha=0.35, zorder=3)
        ax.plot(xs, ys, color=col, lw=1.8, zorder=4)
        ax.scatter(xs, ys, s=9, color=col, zorder=5)
        ax.annotate("", xy=(xs[-1], ys[-1]), xytext=(xs[-2], ys[-2]),
                    arrowprops=dict(arrowstyle="-|>,head_length=0.5,head_width=0.3", color=col, lw=1.8, shrinkA=0, shrinkB=0), zorder=6)
        if by_row:
            ax.text(0, R + 0.55, "Storage order", fontsize=10, fontweight="semibold", color=style.TEAL, va="center")
            ax.text(0, R + 1.45, "each line fetched serves 8 numbers:\n6 line fetches for 48 numbers", fontsize=8.5, color=style.INK2, va="center")
        else:
            ax.text(0, R + 0.55, "Across the storage order", fontsize=10, fontweight="semibold", color=style.PINK, va="center")
            ax.text(0, R + 1.45, "each step lands on a different line:\nup to 48 line fetches for 48 numbers", fontsize=8.5, color=style.INK2, va="center")
    style.save(fig, SLUG, "cache-lines")


def roofline():
    I = np.logspace(np.log10(1 / 64), np.log10(512), 400)
    cpu = np.minimum(PEAK_CPU, I * BW_CPU) / 1e9
    gpu = np.minimum(PEAK_GPU, I * BW_GPU) / 1e9
    fig, ax = plt.subplots(figsize=(7.2, 4.0))
    ax.loglog(I, gpu, color=style.VIOLET, lw=2.2)
    ax.loglog(I, cpu, color=style.BLUE, lw=2.2)
    ax.text(200, PEAK_GPU / 1e9 * 1.18, "GPU (A100): 9.7 TFLOP/s, 1.6 TB/s", color=style.VIOLET, ha="right", fontsize=9)
    ax.text(200, PEAK_CPU / 1e9 * 1.18, "64-core CPU: 2.6 TFLOP/s, 205 GB/s", color=style.BLUE, ha="right", fontsize=9)
    for peak, bw, col in [(PEAK_CPU, BW_CPU, style.BLUE), (PEAK_GPU, BW_GPU, style.VIOLET)]:
        ridge = peak / bw
        ax.plot([ridge, ridge], [1, peak / 1e9], color=col, lw=0.8, ls=(0, (2, 2)))
        ax.text(ridge * 1.08, 1.5, f"ridge\n{ridge:.1f}", color=col, fontsize=8, va="bottom")
    kernels = [("vector add\n$c_i = a_i + b_i$", 1 / 24), ("dot product", 1 / 8), ("matrix × vector", 1 / 4),
               ("matrix × matrix\n$n = 1000$, blocked", 1000 / 12)]
    for name, Ik in kernels:
        pc = min(PEAK_CPU, Ik * BW_CPU) / 1e9
        pg = min(PEAK_GPU, Ik * BW_GPU) / 1e9
        ax.scatter([Ik, Ik], [pc, pg], s=30, color=[style.BLUE, style.VIOLET], zorder=5, edgecolor="white", linewidth=0.8)
        ax.plot([Ik, Ik], [pc, pg], color=style.INK3, lw=0.8, zorder=4)
    # labels
    ax.annotate("vector add, $c_i = a_i + b_i$\n1/24 FLOP/byte: 8.5 GFLOP/s,\n0.3% of the CPU's peak",
                xy=(1 / 24, BW_CPU / 24 / 1e9), xytext=(1 / 60, 420), fontsize=8.5, color=style.INK2,
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.7), ha="left")
    ax.text(1 / 8 * 1.12, BW_CPU / 8 / 1e9 * 0.62, "dot\nproduct", fontsize=8.5, color=style.INK2, va="top")
    ax.text(1 / 4 * 1.12, BW_CPU / 4 / 1e9 * 0.62, "matrix ×\nvector", fontsize=8.5, color=style.INK2, va="top")
    ax.annotate("matrix × matrix, $n$ = 1000\n83 FLOP/byte: at the peak", xy=(1000 / 12, PEAK_CPU / 1e9),
                xytext=(16, 70), fontsize=8.5, color=style.INK2, arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.7))
    ax.text(0.3, 1.6, "memory-bound:\nrate = intensity × bandwidth", fontsize=8.5, color=style.INK3, ha="left")
    ax.text(24, 1100, "compute-bound: rate = peak", fontsize=8.5, color=style.INK3, ha="left")
    ax.set_xlim(1 / 64, 512); ax.set_ylim(1, 30000)
    ax.set_xticks([1 / 64, 1 / 16, 1 / 4, 1, 4, 16, 64, 256])
    ax.set_xticklabels(["1/64", "1/16", "1/4", "1", "4", "16", "64", "256"])
    ax.set_yticks([1, 10, 100, 1000, 10000]); ax.set_yticklabels(["1", "10", "100", "1,000", "10,000"])
    ax.minorticks_off()
    ax.set_xlabel("arithmetic intensity  (FLOP per byte moved from memory)")
    ax.set_ylabel("attainable rate  (GFLOP/s)")
    ax.grid(True, which="major", color=style.LINE, lw=0.6); ax.set_axisbelow(True)
    style.save(fig, SLUG, "roofline")


def cover():
    def draw(ax):
        # pins
        for k in range(6):
            t = 0.95 + 0.42 * k
            for (x0, y0, w, h) in [(t - 0.07 + 0.0, 2.55, 0.14, 0.3), (t - 0.07, 0.15, 0.14, 0.3)]:
                ax.add_patch(Rectangle((x0 + 0.0, y0), w, h, color=style.GOLD, lw=0))
            for (x0, y0, w, h) in [(0.55, t - 0.47 - 0.07, 0.3, 0.14), (3.15, t - 0.47 - 0.07, 0.3, 0.14)]:
                ax.add_patch(Rectangle((x0, y0), w, h, color=style.GOLD, lw=0))
        # package and die
        ax.add_patch(FancyBboxPatch((0.82, 0.42), 2.36, 2.16, boxstyle="round,pad=0,rounding_size=0.18", fc=style.INK, ec="none"))
        ax.add_patch(FancyBboxPatch((1.17, 0.72), 1.66, 1.56, boxstyle="round,pad=0,rounding_size=0.1", fc="#1d2740", ec="none"))
        # the fetch-decode-execute cycle as a ring of three arcs with arrowheads
        cx, cy, R, wdt = 2.0, 1.5, 0.58, 0.17
        cols = [style.BLUE, style.VIOLET, style.TEAL]
        for i, col in enumerate(cols):
            a0 = 90 - 120 * i - 8
            a1 = a0 - 104
            ax.add_patch(Wedge((cx, cy), R + wdt / 2, a1 + 12, a0, width=wdt, color=col, lw=0))
            th = np.radians(a1 + 12)
            tip = np.radians(a1)
            r_in, r_out = R - 0.17, R + 0.17
            p1 = (cx + r_in * np.cos(th), cy + r_in * np.sin(th))
            p2 = (cx + r_out * np.cos(th), cy + r_out * np.sin(th))
            p3 = (cx + R * np.cos(tip), cy + R * np.sin(tip))
            ax.add_patch(Polygon([p1, p2, p3], closed=True, color=col, lw=0))
        ax.add_patch(Circle((cx, cy), 0.16, color=style.ORANGE, lw=0))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    chip(); pipeline(); cache_lines(); roofline(); cover()
