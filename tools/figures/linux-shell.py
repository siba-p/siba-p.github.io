"""Figures for content/learn/linux-shell.md: the practice project as a tree with an absolute and a relative path,
permission bits and their octal digits, a three-process pipeline, and the block means of a synthetic energy.xvg
(the worked example's data: seed 7, 1001 frames, the same numbers the awk one-liners in the text print)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, FancyArrowPatch, Polygon
plt = style.setup()
SLUG = "linux-shell"


def box(ax, x, y, w, h, fc, ec=None, r=0.08, lw=1.0, z=1):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}", fc=fc, ec=ec or fc, lw=lw, zorder=z))


def energy_data():
    """The worked example's energy.xvg: 1 ns, one frame per ps, relaxing from +2400 kJ/mol above the plateau."""
    rng = np.random.default_rng(7)
    t = np.arange(0, 1001) * 1.0
    E = -412000 + 2400 * np.exp(-t / 80) + 380 * rng.standard_normal(t.size)
    return t, np.round(E, 3)


def file_tree():
    tree = [(0, "/", "d"), (1, "home/", "d"), (2, "student/", "d"), (3, "notes.txt", "f"), (3, "project/", "d"),
            (4, "README.md", "f"), (4, "input/", "d"), (5, "md.mdp", "f"), (5, "topol.top", "f"), (5, "conf.gro", "f"),
            (4, "runs/", "d"), (5, "T300/", "d"), (5, "T320/", "d"), (5, "T340/", "d"), (4, "scripts/", "d")]
    fig, ax = plt.subplots(figsize=(7.2, 4.3))
    dy, dx = 0.42, 0.62
    n = len(tree)
    ax.set_xlim(-0.3, 10.5); ax.set_ylim(-(n - 1) * dy - 0.4, 0.4); ax.axis("off")
    pos = {}
    parents = []
    for i, (lev, name, kind) in enumerate(tree):
        x, y = lev * dx, -i * dy
        pos[i] = (x, y)
        while parents and tree[parents[-1]][0] >= lev:
            parents.pop()
        if parents:
            px, py = pos[parents[-1]]
            ax.plot([px + 0.12, px + 0.12, x - 0.05], [py - 0.14, y, y], color=style.LINE, lw=1.2, zorder=0)
        if kind == "d":
            parents.append(i)
        col = style.INK if kind == "d" else style.INK2
        ax.text(x, y, name, va="center", fontsize=9, color=col, fontweight="semibold" if kind == "d" else "normal")
    idx = {name: i for i, (_, name, _) in enumerate(tree)}
    # where you are
    rx, ry = pos[idx["runs/"]]
    box(ax, rx - 0.1, ry - 0.17, 0.75, 0.34, "none", style.ORANGE, r=0.06, lw=1.4)
    ax.text(rx + 0.8, ry, "you are here:  pwd  prints /home/student/project/runs", fontsize=8.5, color=style.ORANGE, va="center")
    # relative path ../input/md.mdp : up to project, down to input, down to md.mdp
    px, py = pos[idx["project/"]]
    ix, iy = pos[idx["input/"]]
    mx, my = pos[idx["md.mdp"]]
    path = [(rx - 0.15, ry), (px - 0.25, ry), (px - 0.25, py), (px - 0.05, py)]
    ax.plot(*zip(*path), color=style.TEAL, lw=1.8, zorder=2)
    ax.annotate("", xy=(mx - 0.05, my), xytext=(ix + 0.1, iy - 0.12),
                arrowprops=dict(arrowstyle="-|>,head_length=0.4,head_width=0.25", color=style.TEAL, lw=1.8,
                                connectionstyle="angle,angleA=-90,angleB=180,rad=0"))
    ax.plot([px + 0.1, px + 0.1, ix - 0.05], [py - 0.15, iy, iy], color=style.TEAL, lw=1.8, zorder=2)
    ax.text(px - 0.38, (py + ry) / 2, "..", color=style.TEAL, fontsize=10, fontweight="semibold", ha="right", va="center")
    ax.text(4.3, my, "relative:   ../input/md.mdp", fontsize=9, color=style.TEAL, va="center", fontweight="semibold")
    ax.text(4.3, my - 0.42, "absolute:  /home/student/project/input/md.mdp", fontsize=9, color=style.BLUE, va="center", fontweight="semibold")
    ax.plot([mx + 0.95, 4.2], [my, my], color=style.LINE, lw=1.0, ls=(0, (2, 2)))
    hx, hy = pos[idx["student/"]]
    ax.text(hx + 1.1, hy, "~  (your home directory)", fontsize=8.5, color=style.INK3, va="center")
    style.save(fig, SLUG, "file-tree")


def permissions():
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    ax.set_xlim(-0.2, 15.2); ax.set_ylim(-5.2, 2.3); ax.set_aspect("equal"); ax.axis("off")
    chars = "-rwxr-x---"
    groups = [("type", style.INK3, 0, 1), ("owner", style.BLUE, 1, 4), ("group", style.TEAL, 4, 7), ("others", style.ORANGE, 7, 10)]
    w, x0 = 0.8, 0.4
    for name, col, a, b in groups:
        for k in range(a, b):
            x = x0 + k * w + (0.25 if k >= 1 else 0) + (0.25 if k >= 4 else 0) + (0.25 if k >= 7 else 0)
            on = chars[k] != "-"
            box(ax, x, 0, w - 0.08, 0.9, style.TINT[col] if col != style.INK3 else style.BG2, col, r=0.08, lw=1.2)
            ax.text(x + (w - 0.08) / 2, 0.45, chars[k], ha="center", va="center", fontsize=13, family="DejaVu Sans Mono",
                    color=col if on else style.INK3, fontweight="bold")
            if k >= 1:
                bit = 1 if on else 0
                weight = [4, 2, 1][(k - 1) % 3]
                ax.text(x + (w - 0.08) / 2, -0.4, str(bit), ha="center", va="center", fontsize=10, color=style.INK)
                ax.text(x + (w - 0.08) / 2, -0.85, f"×{weight}", ha="center", va="center", fontsize=8, color=style.INK3)
        xa = x0 + a * w + (0.25 if a >= 1 else 0) + (0.25 if a >= 4 else 0) + (0.25 if a >= 7 else 0)
        xb = xa + (b - a) * w - 0.08
        ax.text((xa + xb) / 2, 1.25, name, ha="center", va="center", fontsize=9, color=col, fontweight="semibold")
        if a >= 1:
            digit = sum([4, 2, 1][j] for j in range(3) if chars[a + j] != "-")
            ax.plot([xa, xb], [-1.2, -1.2], color=col, lw=1.2)
            ax.text((xa + xb) / 2, -1.65, str(digit), ha="center", va="center", fontsize=16, color=col, fontweight="semibold")
    ax.text(x0, -1.65, "octal", fontsize=9, color=style.INK3, va="center")
    ax.text(x0, -0.4, "bit", fontsize=8.5, color=style.INK3, va="center")
    ax.text(9.3, 1.25, "chmod 750 run.sh", fontsize=10, color=style.INK, fontweight="semibold", family="DejaVu Sans Mono", va="center")
    ax.text(9.3, 0.7, "r = 4, w = 2, x = 1; add them per class", fontsize=8.5, color=style.INK2, va="center")
    rows = [("644", "rw-r--r--", "data and input files"), ("755", "rwxr-xr-x", "scripts and programs others may run"),
            ("750", "rwxr-x---", "shared with your group only"), ("700", "rwx------", "your ~/.ssh directory"),
            ("600", "rw-------", "a private SSH key")]
    for i, (o, r, use) in enumerate(rows):
        y = -2.65 - 0.5 * i
        ax.text(0.4, y, o, fontsize=9.5, color=style.INK, family="DejaVu Sans Mono", va="center", fontweight="bold")
        ax.text(1.6, y, r, fontsize=9.5, color=style.INK2, family="DejaVu Sans Mono", va="center")
        ax.text(4.4, y, use, fontsize=9, color=style.INK2, va="center")
    style.save(fig, SLUG, "permissions")


def pipeline():
    fig, ax = plt.subplots(figsize=(7.2, 3.3))
    ax.set_xlim(-0.3, 17.6); ax.set_ylim(-3.6, 2.6); ax.set_aspect("equal"); ax.axis("off")
    fx, fy = 0.0, -0.55
    ax.add_patch(Polygon([(fx, fy), (fx + 1.3, fy), (fx + 1.3, fy + 1.0), (fx + 1.0, fy + 1.3), (fx, fy + 1.3)], closed=True,
                         fc=style.TINT[style.GOLD], ec=style.GOLD, lw=1.2))
    ax.text(fx + 0.65, fy + 0.55, "energy\n.xvg", ha="center", va="center", fontsize=8.5, color=style.INK, linespacing=1.1)
    pw, ph = 3.4, 1.3
    procs = [("grep -v '^[#@]'", 2.3, style.BLUE), ("sort -k2 -g", 7.3, style.TEAL), ("head -n 1", 12.3, style.VIOLET)]
    for name, x, col in procs:
        box(ax, x, -0.55, pw, ph, style.TINT[col], col, r=0.15, lw=1.4)
        ax.text(x + pw / 2, 0.15, name, ha="center", va="center", fontsize=8, family="DejaVu Sans Mono", color=style.INK)
        ax.text(x + 0.12, -0.33, "0", fontsize=8, color=col, ha="left", va="center")
        ax.text(x + pw - 0.12, -0.33, "1", fontsize=8, color=col, ha="right", va="center")
        ax.annotate("", xy=(x + pw / 2, -1.95), xytext=(x + pw / 2, -0.55),
                    arrowprops=dict(arrowstyle="-|>,head_length=0.35,head_width=0.2", color=style.PINK, lw=1.0, ls=(0, (2, 2))))
        ax.text(x + pw / 2 + 0.12, -1.25, "2", fontsize=8, color=style.PINK, va="center")
    box(ax, 2.3, -2.75, 14.9, 0.8, style.INK, style.INK, r=0.12)
    ax.text(2.55, -2.35, "terminal", fontsize=8.5, color="white", va="center")
    ax.text(17.0, -2.35, "250.0   -413130.098", fontsize=9, color=style.TEAL, family="DejaVu Sans Mono", va="center", ha="right")
    ax.text(9.75, -3.2, "error messages (descriptor 2) bypass the pipes and still reach the screen", fontsize=8, color=style.PINK,
            va="center", ha="center")
    flows = [(1.3, 2.3, "1,009 lines", False), (5.6, 7.3, "1,001 lines", True), (10.6, 12.3, "1,001, sorted", True)]
    for a, b, lab, pipe in flows:
        y = 0.1
        if pipe:
            ax.add_patch(FancyBboxPatch((a + 0.05, y - 0.22), b - a - 0.1, 0.44, boxstyle="round,pad=0,rounding_size=0.2",
                                        fc=style.BG2, ec=style.INK3, lw=1.0))
            ax.text((a + b) / 2, 1.6, "pipe", ha="center", fontsize=8.5, color=style.INK3, va="center", fontweight="semibold")
        ax.annotate("", xy=(b, y), xytext=(a, y), arrowprops=dict(arrowstyle="-|>,head_length=0.35,head_width=0.2", color=style.INK2, lw=1.4))
        ax.text((a + b) / 2, 1.1, lab, ha="center", va="center", fontsize=8.5, color=style.INK2)
    ax.annotate("", xy=(16.4, -1.95), xytext=(15.6, 0.1), arrowprops=dict(arrowstyle="-|>,head_length=0.35,head_width=0.2",
                color=style.INK2, lw=1.4, connectionstyle="angle,angleA=0,angleB=90,rad=0.2"))
    ax.text(16.6, 0.6, "1 line", ha="center", fontsize=8.5, color=style.INK2)
    ax.text(8.7, 2.3, "All three processes run at the same time; each pipe is a 64 KB buffer in the kernel",
            ha="center", fontsize=8.5, color=style.INK3)
    style.save(fig, SLUG, "pipeline")


def equilibration():
    t, E = energy_data()
    blocks = [(0, 200, style.ORANGE), (200, 600, style.BLUE), (600, 1001, style.BLUE)]
    fig, ax = plt.subplots(figsize=(7.2, 3.3))
    ax.plot(t, E / 1e3, color=style.INK3, lw=0.7, alpha=0.8)
    means = []
    for a, b, col in blocks:
        m = E[(t >= a) & (t < b)].mean()
        means.append(m)
        ax.plot([a, min(b, 1000)], [m / 1e3] * 2, color=col, lw=3.0, solid_capstyle="butt")
    ax.axvline(200, color=style.INK3, lw=0.9, ls=(0, (3, 2)))
    ax.text(8, -408.15, f"0–200 ps:  {means[0]:,.0f}", ha="left", fontsize=8.5, color=style.ORANGE,
            fontweight="semibold")
    ax.text(400, -408.15, f"200–600 ps:  {means[1]:,.0f}", ha="center", fontsize=8.5, color=style.BLUE, fontweight="semibold")
    ax.text(800, -408.15, f"600–1000 ps:  {means[2]:,.0f}", ha="center", fontsize=8.5, color=style.BLUE, fontweight="semibold")
    ax.text(8, -408.6, "discard: still relaxing", ha="left", fontsize=8.5, color=style.INK2, va="center")
    ax.set_xlim(0, 1000); ax.set_ylim(-413.6, -407.8)
    ax.set_xlabel("time  (ps)"); ax.set_ylabel("potential energy  (MJ/mol)")
    style.save(fig, SLUG, "equilibration")
    return means


def cover():
    def draw(ax):
        # terminal window
        ax.add_patch(FancyBboxPatch((0.45, 0.55), 3.1, 2.1, boxstyle="round,pad=0,rounding_size=0.16", fc=style.INK, ec="none"))
        ax.add_patch(FancyBboxPatch((0.45, 2.3), 3.1, 0.35, boxstyle="round,pad=0,rounding_size=0.16", fc="#273049", ec="none"))
        ax.add_patch(Rectangle((0.45, 2.3), 3.1, 0.12, color="#273049", lw=0))
        for k, col in enumerate([style.PINK, style.GOLD, style.TEAL]):
            ax.add_patch(Circle((0.7 + 0.22 * k, 2.475), 0.065, color=col, lw=0))
        # prompt chevron and cursor
        ax.plot([0.8, 1.15, 0.8], [1.95, 1.75, 1.55], color=style.TEAL, lw=7, solid_capstyle="round", solid_joinstyle="round")
        ax.add_patch(Rectangle((1.35, 1.52), 0.26, 0.46, color="white", lw=0))
        # a pipeline of three blocks joined by pipes
        cols = [style.BLUE, style.ORANGE, style.VIOLET]
        for k, col in enumerate(cols):
            x = 0.8 + 0.95 * k
            if k:
                ax.add_patch(Rectangle((x - 0.45, 0.93), 0.45, 0.14, color="#5a6480", lw=0))
            ax.add_patch(FancyBboxPatch((x, 0.78), 0.5, 0.44, boxstyle="round,pad=0,rounding_size=0.08", fc=col, ec="none"))
    style.cover(SLUG, draw, bg=style.TINT[style.ORANGE])


if __name__ == "__main__":
    file_tree(); permissions(); pipeline(); m = equilibration(); cover()
    print("block means:", [f"{x:.0f}" for x in m])
