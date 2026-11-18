"""Figures for content/learn/how-bash-works.md.  Run: python3 tools/figures/how-bash-works.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Polygon, Rectangle, Circle
plt = style.setup()
SLUG = "how-bash-works"
MONO = "DejaVu Sans Mono"          # bundled with matplotlib; used only for code


def box(ax, x, y, w, h, fc, ec=None, r=0.08, lw=1.0, z=2):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}",
                                fc=fc, ec=ec or fc, lw=lw, zorder=z))


def arrow(ax, p, q, color, lw=1.6, rad=0.0, z=3, style_="-|>", ms=10):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle=style_, mutation_scale=ms, color=color, lw=lw,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=2, shrinkB=2, zorder=z))


# ---------------------------------------------------------------------------------------------
# 1. Redirections are applied left to right: the descriptor table after each step
# ---------------------------------------------------------------------------------------------
def redirect():
    fig, ax = plt.subplots(figsize=(7.2, 4.6))
    ax.set_xlim(0, 12); ax.set_ylim(0, 7.7); ax.axis("off")
    FD = {0: style.BLUE, 1: style.TEAL, 2: style.PINK}
    TERM, LOG = "terminal", "log"

    def table(x0, y0, wiring, title):
        """A descriptor table at (x0, y0) with fds 1 and 2 pointing at 'terminal' or 'log'."""
        ax.text(x0 + 1.6, y0 + 2.45, title, ha="center", va="bottom", fontsize=8.5, color=style.INK2)
        box(ax, x0, y0, 3.2, 2.3, style.BG2, style.LINE, r=0.12, z=1)
        ty = {TERM: y0 + 1.55, LOG: y0 + 0.45}
        # targets
        box(ax, x0 + 2.0, ty[TERM] - 0.27, 1.0, 0.54, "white", style.INK3, r=0.06)
        ax.text(x0 + 2.5, ty[TERM], "screen", ha="center", va="center", fontsize=8.5, color=style.INK)
        box(ax, x0 + 2.0, ty[LOG] - 0.27, 1.0, 0.54, style.TINT[style.GOLD], style.GOLD, r=0.06)
        ax.text(x0 + 2.5, ty[LOG], "log", ha="center", va="center", fontsize=8.5, color=style.INK, family=MONO)
        # descriptors 1 and 2 (0 is untouched and omitted)
        for k, fd in enumerate((1, 2)):
            fy = y0 + 1.45 - 0.75 * k
            box(ax, x0 + 0.2, fy - 0.25, 0.55, 0.5, FD[fd], r=0.06)
            ax.text(x0 + 0.475, fy, str(fd), ha="center", va="center", fontsize=10, color="white", weight="semibold")
            tgt = wiring[fd]
            arrow(ax, (x0 + 0.78, fy), (x0 + 1.98, ty[tgt]), FD[fd], lw=1.5, rad=0.0)

    rows = [("cmd > log 2>&1", [("before", {1: TERM, 2: TERM}), ("after  > log", {1: LOG, 2: TERM}),
                                ("after  2>&1", {1: LOG, 2: LOG})],
             "both streams end up in the file", style.TEAL),
            ("cmd 2>&1 > log", [("before", {1: TERM, 2: TERM}), ("after  2>&1", {1: TERM, 2: TERM}),
                                ("after  > log", {1: LOG, 2: TERM})],
             "errors still reach the screen", style.PINK)]
    for r, (cmd, steps, verdict, vc) in enumerate(rows):
        y0 = 4.15 - 3.95 * r
        ax.text(0.0, y0 + 3.05, cmd, ha="left", va="center", fontsize=11, family=MONO, color=style.INK)
        ax.text(12.0, y0 + 3.05, verdict, ha="right", va="center", fontsize=9.5, color=vc, weight="semibold")
        for s, (title, wiring) in enumerate(steps):
            x0 = 0.0 + 4.4 * s
            table(x0, y0, wiring, title)
            if s < 2:
                arrow(ax, (x0 + 3.3, y0 + 1.15), (x0 + 4.3, y0 + 1.15), style.INK3, lw=1.2, ms=9)
    # explanation of the duplicate step
    ax.text(6.0, 3.85, "2>&1 copies whatever 1 points at now; it does not follow 1 later",
            ha="center", va="center", fontsize=8.5, color=style.INK2, style="italic")
    style.save(fig, SLUG, "redirect")


# ---------------------------------------------------------------------------------------------
# 2. fork, exec, wait: where the traced line actually runs
# ---------------------------------------------------------------------------------------------
def forkexec():
    fig, ax = plt.subplots(figsize=(7.2, 3.5))
    ax.set_xlim(0, 12); ax.set_ylim(0, 5.9); ax.axis("off")
    yS, yC = 4.1, 1.7            # lanes: the shell, the child
    ax.text(0.0, yS + 0.75, "bash  (PID 4100)", fontsize=9.5, color=style.BLUE, weight="semibold")
    ax.text(0.0, yC + 0.75, "child  (PID 4101)", fontsize=9.5, color=style.ORANGE, weight="semibold")
    # shell lane: active, waiting, active
    box(ax, 0.0, yS - 0.28, 2.4, 0.56, style.BLUE, r=0.1)
    ax.text(1.2, yS, "parse, expand", ha="center", va="center", fontsize=8.5, color="white")
    ax.plot([2.4, 9.0], [yS, yS], color=style.BLUE, lw=1.6, ls=(0, (2, 2)))
    ax.text(5.7, yS + 0.22, "wait()  : the shell sleeps", ha="center", va="bottom", fontsize=8.5, color=style.INK2)
    box(ax, 9.0, yS - 0.28, 3.0, 0.56, style.BLUE, r=0.1)
    ax.text(10.5, yS, r"\$? = 0,  then echo …", ha="center", va="center", fontsize=8.5, color="white")
    # fork arrow
    arrow(ax, (2.4, yS - 0.3), (2.75, yC + 0.32), style.INK2, lw=1.4, rad=0.0)
    ax.text(2.45, (yS + yC) / 2 + 0.05, "fork()", ha="right", va="center", fontsize=9, color=style.INK, family=MONO)
    # child lane: a copy of bash, then redirections, then exec into grep
    box(ax, 2.8, yC - 0.28, 1.7, 0.56, style.TINT[style.BLUE], style.BLUE, r=0.1)
    ax.text(3.65, yC, "copy of bash", ha="center", va="center", fontsize=8.5, color=style.INK)
    box(ax, 4.6, yC - 0.28, 1.9, 0.56, style.TINT[style.TEAL], style.TEAL, r=0.1)
    ax.text(5.55, yC, "open file, dup2", ha="center", va="center", fontsize=8.5, color=style.INK)
    box(ax, 6.6, yC - 0.28, 2.0, 0.56, style.ORANGE, r=0.1)
    ax.text(7.6, yC, "grep runs", ha="center", va="center", fontsize=8.5, color="white", weight="semibold")
    ax.annotate("execve()", (6.6, yC + 0.3), (6.15, yC + 0.95), fontsize=9, family=MONO, color=style.INK,
                ha="center", arrowprops=dict(arrowstyle="-|>", color=style.INK2, lw=1.1, shrinkB=1))
    # exit -> wait returns
    arrow(ax, (8.62, yC + 0.3), (9.0, yS - 0.32), style.INK2, lw=1.4)
    ax.text(8.7, (yS + yC) / 2 - 0.35, "exit(0)", ha="right", va="center", fontsize=9, color=style.INK, family=MONO)
    # what the child inherits / what never changes in the parent
    ax.text(3.65, yC - 0.55, "inherits copies: variables,\ncurrent directory, open files", ha="center", va="top",
            fontsize=8.5, color=style.INK2, linespacing=1.3)
    ax.text(7.6, yC - 0.55, "same PID, new program;\nnever returns to bash code", ha="center", va="top",
            fontsize=8.5, color=style.INK2, linespacing=1.3)
    ax.text(10.5, yS + 0.42, "a built-in runs here,\ninside the shell: no fork", ha="center", va="bottom",
            fontsize=8.5, color=style.INK2, linespacing=1.3)
    ax.annotate("", (12.0, 0.25), (0.0, 0.25), arrowprops=dict(arrowstyle="-|>", color=style.INK3, lw=1))
    ax.text(12.0, 0.4, "time", ha="right", va="bottom", fontsize=8.5, color=style.INK3)
    style.save(fig, SLUG, "fork-exec")


# ---------------------------------------------------------------------------------------------
# 3. What a loop iteration costs.  Medians of three runs of 10,000 iterations each, measured with
#    bash 5.2 on the Linux server used to test this chapter (see the Back-of-the-envelope note).
# ---------------------------------------------------------------------------------------------
COST_US = [(r"x=\$((i + 1))", "arithmetic, built-in", 4.6),
           ("( : )", "subshell: fork only", 0.98e3),
           (r"x=\$(echo \$i)", "command substitution", 1.06e3),
           ("/bin/true", "external program: fork + exec", 1.75e3),
           (r"x=\$(expr \$i + 1)", "substitution + external", 2.94e3)]


def cost():
    fig, ax = plt.subplots(figsize=(7.2, 3.1))
    names = [c[0] for c in COST_US][::-1]; vals = np.array([c[2] for c in COST_US])[::-1]
    notes = [c[1] for c in COST_US][::-1]
    cols = [style.ORANGE] * 4 + [style.TEAL]
    y = np.arange(len(vals))
    ax.barh(y, vals, height=0.58, color=cols, zorder=2)
    ax.set_xscale("log"); ax.set_xlim(1, 3e5)
    ax.set_yticks(y); ax.set_yticklabels(names, family=MONO, fontsize=9, color=style.INK)
    ax.tick_params(axis="y", length=0)
    ax.spines["left"].set_visible(False)
    ax.set_xticks([1, 10, 100, 1e3, 1e4])
    ax.set_xticklabels(["1 µs", "10 µs", "100 µs", "1 ms", "10 ms"])
    ax.set_xlabel("time per loop iteration (log scale)")
    ax.grid(axis="x", which="major", zorder=0)
    for yi, v, n in zip(y, vals, notes):
        lab = f"{v:.1f} µs" if v < 100 else f"{v / 1e3:.1f} ms"
        ax.text(v * 1.25, yi, f"{lab}   {n}", va="center", fontsize=8.5, color=style.INK2)
    ax.annotate("", (vals[0], 4.42), (vals[4], 4.42),
                arrowprops=dict(arrowstyle="<->", color=style.INK3, lw=1, shrinkA=0, shrinkB=0))
    ax.text(np.sqrt(vals[0] * vals[4]), 4.5, f"× {vals[0] / vals[4]:.0f}", ha="center", va="bottom",
            fontsize=9, color=style.INK, weight="semibold")
    ax.set_ylim(-0.6, 5.0)
    style.save(fig, SLUG, "loop-cost")


# ---------------------------------------------------------------------------------------------
# Cover: a line of text enters a prism and leaves as separate, coloured words
# ---------------------------------------------------------------------------------------------
def cover():
    from matplotlib.transforms import Affine2D
    def draw(ax):
        ax.add_patch(Rectangle((0.0, 1.35), 1.62, 0.3, color=style.INK2, zorder=1))      # one line of text
        ax.add_patch(Polygon([(1.25, 0.6), (2.35, 0.6), (1.8, 2.4)], closed=True, fc="white",
                             ec=style.INK, lw=3.0, zorder=3, joinstyle="round"))      # the shell
        cols = [style.BLUE, style.TEAL, style.GOLD, style.ORANGE, style.PINK]
        for k, c in enumerate(cols):                                                 # separate words
            ang = np.radians(32 - 16 * k)
            d = 1.25
            cx, cy = 2.2 + d * np.cos(ang), 1.5 + d * np.sin(ang)
            p = FancyBboxPatch((cx - 0.3, cy - 0.12), 0.6, 0.24, boxstyle="round,pad=0,rounding_size=0.08",
                               fc=c, ec=c, zorder=2)
            p.set_transform(Affine2D().rotate_around(cx, cy, ang) + ax.transData)
            ax.add_patch(p)
            ax.plot([2.08, cx - 0.3 * np.cos(ang)], [1.5, cy - 0.3 * np.sin(ang)], color=c, lw=2.5,
                    alpha=0.55, zorder=1, solid_capstyle="butt")
        ax.plot([0.3, 0.58, 0.3], [2.62, 2.4, 2.18], color=style.TEAL, lw=5, solid_capstyle="round",
                solid_joinstyle="round")                                             # prompt
        ax.add_patch(Rectangle((0.72, 2.15), 0.34, 0.08, color=style.TEAL))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    redirect(); forkexec(); cost(); cover()
