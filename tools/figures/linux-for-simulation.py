"""Figures for content/learn/linux-for-simulation.md.  Run: python3 tools/figures/linux-for-simulation.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle, Circle
plt = style.setup()
SLUG = "linux-for-simulation"
MONO = "DejaVu Sans Mono"


def box(ax, x, y, w, h, fc, ec=None, r=0.08, lw=1.0, z=2, ls="-"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}",
                                fc=fc, ec=ec or fc, lw=lw, zorder=z, ls=ls))


def arrow(ax, p, q, color=style.INK2, lw=1.4, rad=0.0, txt=None, tx=None, ty=None, ha="center", **kw):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=10, color=color, lw=lw,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=2, shrinkB=2, zorder=4))
    if txt:
        ax.text(tx, ty, txt, ha=ha, va="center", fontsize=8.5, color=style.INK, **kw)


# ---------------------------------------------------------------------------------------------
# 1. How a cluster is organised
# ---------------------------------------------------------------------------------------------
def cluster():
    fig, ax = plt.subplots(figsize=(7.2, 4.4))
    ax.set_xlim(0, 12); ax.set_ylim(0, 7.3); ax.axis("off")
    # laptop
    box(ax, 0.0, 4.6, 1.6, 1.0, style.TINT[style.VIOLET], style.VIOLET, r=0.1)
    ax.text(0.8, 5.1, "your laptop", ha="center", va="center", fontsize=9, color=style.INK)
    # login nodes
    box(ax, 2.6, 4.25, 1.9, 1.7, style.BG2, style.LINE, r=0.12, z=1)
    ax.text(3.55, 6.12, "login nodes", ha="center", fontsize=9, color=style.INK, weight="semibold")
    for k in range(2):
        box(ax, 2.8, 5.15 - 0.75 * k, 1.5, 0.55, style.VIOLET, r=0.06)
        ax.text(3.55, 5.425 - 0.75 * k, f"login{k + 1}", ha="center", va="center", fontsize=8.5, color="white")
    arrow(ax, (1.62, 5.1), (2.58, 5.1), txt="ssh", tx=2.1, ty=5.35, family=MONO)
    # scheduler
    box(ax, 2.8, 2.55, 1.5, 0.75, style.ORANGE, r=0.08)
    ax.text(3.55, 2.925, "Slurm\ncontroller", ha="center", va="center", fontsize=8.5, color="white", linespacing=1.15)
    arrow(ax, (3.55, 4.23), (3.55, 3.33), txt="sbatch", tx=3.65, ty=3.78, ha="left", family=MONO)
    # compute nodes
    box(ax, 5.3, 1.95, 6.7, 4.25, style.BG2, style.LINE, r=0.12, z=1)
    ax.text(5.5, 5.92, "compute nodes  (reached only through the scheduler)", fontsize=9, color=style.INK,
            weight="semibold")
    for r in range(2):
        for c in range(5):
            x, y = 5.5 + 1.28 * c, 4.65 - 1.1 * r
            gpu = (r == 1 and c >= 3)
            box(ax, x, y, 1.1, 0.85, style.TINT[style.TEAL] if not gpu else style.TINT[style.GOLD],
                style.TEAL if not gpu else style.GOLD, r=0.06)
            for i in range(4):
                for j in range(2):
                    ax.add_patch(Rectangle((x + 0.1 + 0.22 * i, y + 0.42 + 0.2 * j), 0.16, 0.14,
                                           color=style.TEAL, zorder=3))
            if gpu:
                ax.add_patch(Rectangle((x + 0.1, y + 0.1), 0.88, 0.22, color=style.GOLD, zorder=3))
            else:
                ax.add_patch(Rectangle((x + 0.1, y + 0.1), 0.88, 0.22, color="white", ec=style.INK3, lw=0.6, zorder=3))
    ax.text(5.5, 3.2, "cores", fontsize=8.5, color=style.TEAL, va="center")
    ax.text(11.8, 3.2, "GPU nodes", fontsize=8.5, color="#9a7a10", va="center", ha="right")
    ax.annotate("node-local disk ($TMPDIR)".replace("$", r"\$"), (6.05, 3.7), (7.0, 3.2), fontsize=8.5,
                color=style.INK2, va="center", arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    # interconnect
    ax.add_patch(Rectangle((5.5, 2.25), 6.3, 0.16, color=style.INK2, zorder=2))
    ax.text(11.8, 2.55, "InfiniBand or similar interconnect", ha="right", fontsize=8.5, color=style.INK2)
    arrow(ax, (4.32, 2.925), (5.48, 2.925), txt="runs jobs", tx=4.8, ty=2.65)
    # shared file systems
    fs = [("$HOME", "small, backed up", style.BLUE), ("/scratch", "large, fast, purged", style.PINK),
          ("project", "shared, kept", style.BLUE)]
    ax.text(2.6, 1.55, "shared file systems, mounted on every node", fontsize=9, color=style.INK, weight="semibold")
    for k, (name, note, col) in enumerate(fs):
        x = 2.6 + 3.15 * k
        box(ax, x, 0.15, 2.9, 1.1, style.TINT[col], col, r=0.08)
        ax.text(x + 1.45, 0.86, name.replace("$", r"\$"), ha="center", va="center", fontsize=10, family=MONO,
                color=style.INK)
        ax.text(x + 1.45, 0.45, note, ha="center", va="center", fontsize=8.5, color=style.INK2)
    for x in (3.55, 8.6):
        ax.plot([x, x], [1.28, 1.95 if x > 5 else 2.53], color=style.INK3, lw=1.2, ls=(0, (2, 2)), zorder=0)
    style.save(fig, SLUG, "cluster")


# ---------------------------------------------------------------------------------------------
# 2. Backfilling: a small EASY-backfill simulation on 8 nodes
# ---------------------------------------------------------------------------------------------
NODES = 8
RUNNING = [("R1", 4, 0.0, 5.0), ("R2", 2, 0.0, 9.0)]            # name, nodes, start, end (already running)
QUEUE = [("J1", 8, 12.0), ("J2", 2, 24.0), ("J3", 2, 4.0), ("J4", 1, 3.0), ("J5", 3, 3.0)]  # priority order
# Walltime requests are assumed to equal the actual run times.


def easy_backfill(dt=0.25, tmax=60.0):
    free_at = np.zeros(NODES)
    placed = []
    for name, n, t0, t1 in RUNNING:
        idx = np.where(free_at <= t0)[0][:n]; free_at[idx] = t1; placed.append((name, idx, t0, t1))
    queue = list(QUEUE)
    t = 0.0
    while queue and t < tmax:
        started = True
        while started:
            started = False
            free = np.where(free_at <= t + 1e-9)[0]
            shadow, extra = None, 0
            for q, (name, n, req) in enumerate(queue):
                if shadow is None:                           # the highest-priority waiting job
                    if len(free) >= n:
                        idx = free[:n]; free_at[idx] = t + req; placed.append((name, idx, t, t + req))
                        queue.pop(q); started = True; break
                    ends = np.sort(np.maximum(free_at, t))
                    shadow = ends[n - 1]                     # when n nodes will be free: its reservation
                    extra = int(np.sum(ends <= shadow + 1e-9)) - n
                    continue
                if len(free) >= n and (t + req <= shadow + 1e-9 or n <= extra):
                    idx = free[:n]; free_at[idx] = t + req; placed.append((name, idx, t, t + req))
                    if t + req > shadow + 1e-9:
                        extra -= n
                    queue.pop(q); started = True; break
        t += dt
    return placed


def backfill():
    placed = easy_backfill()
    col = {"R1": style.INK3, "R2": style.INK3, "J1": style.BLUE, "J2": style.PINK, "J3": style.TEAL,
           "J4": style.TEAL, "J5": style.TEAL}
    fig, ax = plt.subplots(figsize=style.WIDE)
    for name, idx, t0, t1 in placed:
        for i in idx:
            ax.add_patch(Rectangle((t0, i + 0.08), t1 - t0, 0.84, color=col[name], ec="white", lw=1.2, zorder=2))
        ym = idx[len(idx) // 2] + 0.5
        lab = name if name != "J1" else "J1: 8 nodes, 12 h"
        if name == "J2":
            lab = "J2: 2 nodes, 24 h"
        ax.text((t0 + t1) / 2, ym, lab, ha="center", va="center", fontsize=8.5, color="white", weight="semibold",
                zorder=3)
    j1 = [p for p in placed if p[0] == "J1"][0]
    ax.plot([j1[2], j1[2]], [0, 8.75], color=style.BLUE, lw=1.2, ls=(0, (3, 2)), zorder=1)
    ax.text(j1[2] + 0.3, 8.2, f"reservation for J1 at {j1[2]:.0f} h", fontsize=8.5, color=style.BLUE, va="bottom")
    ax.text(0.2, 9.0, "backfilled: J3, J4, J5", fontsize=8.5, color=style.TEAL, va="bottom", weight="semibold")
    ax.set_xlim(0, 46); ax.set_ylim(0, 9.7)
    ax.set_yticks(np.arange(NODES) + 0.5); ax.set_yticklabels([f"n{i + 1}" for i in range(NODES)], fontsize=8.5)
    ax.tick_params(axis="y", length=0); ax.spines["left"].set_visible(False)
    ax.set_xlabel("time after J1 is submitted (hours)")
    ax.set_xticks(np.arange(0, 47, 6))
    style.save(fig, SLUG, "backfill")
    return placed


# ---------------------------------------------------------------------------------------------
# 3. The temperature series of the worked example: five chained segments per temperature
# ---------------------------------------------------------------------------------------------
NS_PER_DAY = 48.0
TARGET_NS = 200.0
SEG_H = 0.99 * 23.5                              # -maxh 23.5: mdrun stops after 99 % of it


def segments():
    rate = NS_PER_DAY / 24.0                     # ns per hour
    temps = [300, 310, 320, 330, 340]
    fig, ax = plt.subplots(figsize=(7.2, 3.3))
    for r, T in enumerate(temps):
        y = len(temps) - 1 - r
        t, ns = 0.0, 0.0
        for seg in range(5):
            dur = min(SEG_H, (TARGET_NS - ns) / rate)
            if T == 340 and seg == 0:
                fail_h = (3 * 60 + 41) / 3600
                ax.add_patch(Rectangle((0, y + 0.18), 1.0, 0.64, color=style.PINK, zorder=2))
                ns += SEG_H * rate
                ax.text(1.6, y + 0.5, "FAILED after 3 min 41 s, status 1", va="center", fontsize=8.5,
                        color=style.PINK, weight="semibold")
                t += SEG_H
                continue
            if T == 340:
                ns += dur * rate
                ax.add_patch(Rectangle((t + 0.4, y + 0.18), dur - 0.8, 0.64, fc="none", ec=style.INK3, lw=1.0,
                                       ls=(0, (3, 2)), zorder=2))
                if seg == 2:
                    ax.text(t + dur / 2, y + 0.5, "DependencyNeverSatisfied", ha="center", va="center",
                            fontsize=8.5, color=style.INK2, zorder=3,
                            bbox=dict(fc="white", ec="none", pad=1.5))
                t += dur
                continue
            ns += dur * rate
            ax.add_patch(Rectangle((t + 0.25, y + 0.18), dur - 0.5, 0.64, color=style.TEAL if seg < 4 else style.BLUE,
                                   zorder=2))
            ax.text(t + dur / 2, y + 0.5, f"{ns:.0f} ns" if seg < 4 else f"{ns:.0f}", ha="center", va="center", fontsize=8.5, color="white",
                    weight="semibold", zorder=3)
            t += dur
    ax.set_yticks(np.arange(5) + 0.5); ax.set_yticklabels([f"{T} K" for T in temps[::-1]], fontsize=9)
    ax.tick_params(axis="y", length=0); ax.spines["left"].set_visible(False)
    total = 4 * SEG_H + (TARGET_NS - 4 * SEG_H * rate) / rate
    ax.set_xlim(0, 104); ax.set_ylim(0, 5.5)
    ax.set_xticks([0, 24, 48, 72, 96]); ax.set_xlabel("wall-clock time if each segment starts at once (hours)")
    for k in range(1, 5):
        ax.axvline(k * SEG_H, color=style.LINE, lw=0.8, zorder=0)
    ax.text(total, 5.08, f"200 ns after {total:.0f} h", ha="right", fontsize=8.5, color=style.BLUE)
    style.save(fig, SLUG, "segments")
    return SEG_H, SEG_H * rate, total


# ---------------------------------------------------------------------------------------------
# Cover: a server rack whose slots are filled with jobs
# ---------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        box(ax, 1.25, 0.25, 1.5, 2.5, style.INK, r=0.1)
        cols = [style.BLUE, style.TEAL, style.ORANGE, style.TEAL, style.PINK, style.GOLD, style.BLUE]
        widths = [1.0, 0.6, 0.85, 1.0, 0.45, 0.75, 0.9]
        for k in range(7):
            y = 0.42 + 0.32 * k
            box(ax, 1.4, y, 1.2, 0.22, "#2a3348", r=0.04, z=3)
            box(ax, 1.45, y + 0.04, widths[k] * 1.0, 0.14, cols[k], r=0.04, z=4)
            ax.add_patch(Circle((2.5, y + 0.11), 0.035, color=style.TEAL if k % 3 else style.GOLD, zorder=5))
        # a queue of jobs waiting to go in
        for k, (c, w) in enumerate([(style.PINK, 0.42), (style.BLUE, 0.3), (style.ORANGE, 0.36)]):
            box(ax, 0.2 + 0.05 * k, 2.25 - 0.32 * k, w, 0.2, c, r=0.04)
        ax.add_patch(FancyArrowPatch((0.75, 1.75), (1.18, 1.5), arrowstyle="-|>", mutation_scale=14,
                                     color=style.INK2, lw=2.5))
        # scratch disk
        box(ax, 3.05, 0.25, 0.7, 0.5, style.TEAL, r=0.08)
        box(ax, 3.05, 0.85, 0.7, 0.5, style.TEAL, r=0.08)
        box(ax, 3.05, 1.45, 0.7, 0.5, style.TEAL, r=0.08)
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    cluster()
    placed = backfill()
    for p in placed:
        print(f"   {p[0]}: nodes {list(p[1] + 1)}, {p[2]:.2f}-{p[3]:.2f} h")
    print("   segment %.3f h = %.2f ns; 200 ns after %.1f h" % segments())
    cover()
