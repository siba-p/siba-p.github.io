"""Figures for content/learn/fortran.md.  Run: python3 tools/figures/fortran.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle, Polygon
plt = style.setup()
SLUG = "fortran"
MONO = "DejaVu Sans Mono"


def box(ax, x, y, w, h, fc, ec=None, r=0.08, lw=1.0, z=2, ls="-"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}",
                                fc=fc, ec=ec or fc, lw=lw, zorder=z, ls=ls))


def arrow(ax, p, q, color=style.INK2, lw=1.4, rad=0.0, ls="-"):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=10, color=color, lw=lw, ls=ls,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=3, shrinkB=3, zorder=4))


# ---------------------------------------------------------------------------------------------
# 1. From source files to an executable: compile, module files, link
# ---------------------------------------------------------------------------------------------
def build():
    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    ax.set_xlim(0, 12); ax.set_ylim(0, 6); ax.axis("off")
    for x, t in [(0.9, "source"), (4.45, "compile  (-c)"), (8.0, "link"), (10.9, "run")]:
        ax.text(x, 5.65, t, ha="center", fontsize=9, color=style.INK3, weight="semibold")

    def file(x, y, name, fc, ec, w=1.8):
        box(ax, x, y, w, 0.62, fc, ec, r=0.06)
        ax.text(x + w / 2, y + 0.31, name, ha="center", va="center", fontsize=9, family=MONO, color=style.INK)

    file(0.0, 4.3, "lj_mod.f90", style.TINT[style.BLUE], style.BLUE)
    file(0.0, 1.6, "lj_main.f90", style.TINT[style.BLUE], style.BLUE)
    file(3.55, 4.75, "lj_mod.o", style.TINT[style.TEAL], style.TEAL)
    file(3.55, 3.85, "lj_mod.mod", style.TINT[style.GOLD], style.GOLD)
    file(3.55, 1.6, "lj_main.o", style.TINT[style.TEAL], style.TEAL)
    arrow(ax, (1.82, 4.68), (3.53, 5.06))
    arrow(ax, (1.82, 4.55), (3.53, 4.16))
    arrow(ax, (1.82, 1.91), (3.53, 1.91))
    # .mod is read when compiling the main program
    arrow(ax, (4.45, 3.83), (2.4, 2.25), color=style.GOLD, lw=1.4, rad=0.0, ls=(0, (3, 2)))
    ax.text(2.55, 3.35, "use lj_mod  reads\nthe .mod file", ha="right", va="center", fontsize=8.5,
            color="#9a7a10", linespacing=1.25)
    # linker
    box(ax, 7.1, 2.55, 1.8, 1.9, style.ORANGE, r=0.1)
    ax.text(8.0, 3.5, "linker", ha="center", va="center", fontsize=10, color="white", weight="semibold")
    arrow(ax, (5.37, 5.06), (7.08, 4.1))
    arrow(ax, (5.37, 1.91), (7.08, 2.9))
    # libraries
    file(6.35, 0.35, "-llapack  -lgfortran", style.BG2, style.INK3, w=3.3)
    arrow(ax, (8.0, 0.99), (8.0, 2.53))
    ax.text(8.12, 1.72, "libraries", ha="left", va="center", fontsize=8.5, color=style.INK2)
    # executable
    box(ax, 10.0, 3.15, 1.8, 0.7, style.INK, r=0.08)
    ax.text(10.9, 3.5, "./lj", ha="center", va="center", fontsize=10, family=MONO, color="white")
    arrow(ax, (8.92, 3.5), (9.98, 3.5))
    # notes
    ax.text(4.45, 1.2, "machine code with unresolved\ncalls such as lj_energy_forces", ha="center", va="top",
            fontsize=8.5, color=style.INK2, linespacing=1.3)
    ax.text(10.9, 2.95, "every call resolved;\nruns on its own", ha="center", va="top", fontsize=8.5,
            color=style.INK2, linespacing=1.3)
    style.save(fig, SLUG, "build")


# ---------------------------------------------------------------------------------------------
# 2. Summing 1/i^2 in single and double precision
# ---------------------------------------------------------------------------------------------
def summation(nmax=10_000_000):
    i32 = np.arange(1, nmax + 1, dtype=np.float32)
    s32 = np.cumsum(np.float32(1.0) / (i32 * i32), dtype=np.float32)        # sequential float32 sum
    i64 = np.arange(1, nmax + 1, dtype=np.float64)
    s64 = np.cumsum(1.0 / (i64 * i64))
    exact = np.pi ** 2 / 6
    stall = int(np.argmax(np.diff(s32) == 0)) + 2                           # first i that adds nothing
    n = np.unique(np.logspace(0, np.log10(nmax), 400).astype(int))
    e32 = np.abs(exact - s32[n - 1].astype(np.float64)); e64 = np.abs(exact - s64[n - 1])
    fig, ax = plt.subplots(figsize=style.WIDE)
    ax.loglog(n, e64, color=style.BLUE, lw=2.2)
    ax.loglog(n, e32, color=style.PINK, lw=2.2)
    ax.set_xlim(1, nmax); ax.set_ylim(5e-8, 1.5)
    ax.set_xlabel("number of terms $n$"); ax.set_ylabel(r"error  $|\pi^2/6 - S_n|$")
    ax.text(3e5, 2.3e-6, "real(dp): error falls as 1/n", color=style.BLUE, fontsize=9, rotation=-17,
            ha="center", va="bottom")
    ax.text(2e5, 3.2e-4, f"real(sp): the sum stops changing at n = {stall}", color=style.PINK, fontsize=9,
            ha="center", va="bottom")
    ax.axvline(stall, color=style.PINK, lw=0.8, ls=(0, (2, 2)), zorder=0)
    ax.text(2.5, 1e-5, "Both sums follow the neglected tail,\nabout 1/n, until single precision\ncan no longer add a term of 1/n²", fontsize=8.5,
            color=style.INK2, va="center", linespacing=1.3)
    style.save(fig, SLUG, "summation")
    return stall, float(s32[-1]), float(exact - s32[-1])


# ---------------------------------------------------------------------------------------------
# 3. NumPy (n, 3) in C order and Fortran x(3, n) share the same bytes
# ---------------------------------------------------------------------------------------------
def interop():
    n = 4
    cols = [style.BLUE, style.TEAL, style.ORANGE, style.VIOLET]
    fig, ax = plt.subplots(figsize=(7.2, 3.7))
    ax.set_xlim(0, 12); ax.set_ylim(0, 6.7); ax.axis("off")
    c = 0.62
    # memory strip in the middle
    x0, ym = 2.25, 3.0
    for k in range(3 * n):
        atom, comp = divmod(k, 3)
        ax.add_patch(Rectangle((x0 + k * c, ym), c, c, fc=style.TINT[cols[atom]], ec=cols[atom], lw=1.2, zorder=2))
        ax.text(x0 + k * c + c / 2, ym + c / 2, "xyz"[comp] + str(atom + 1), ha="center", va="center", fontsize=8.5,
                color=style.INK)
    ax.text(x0 - 0.15, ym + c / 2, "memory", ha="right", va="center", fontsize=9, color=style.INK2)
    ax.annotate("", (x0 + 3 * n * c + 0.5, ym - 0.18), (x0, ym - 0.18),
                arrowprops=dict(arrowstyle="-|>", color=style.INK3, lw=1))
    ax.text(x0 + 3 * n * c + 0.55, ym - 0.18, "address", fontsize=8.5, color=style.INK3, va="center")
    # NumPy grid (rows = atoms), left
    gx, gy = 0.2, 4.0
    ax.text(gx, 6.6, "NumPy  pos.shape == (4, 3)", fontsize=9.5, family=MONO, color=style.INK, va="top")
    for a in range(n):
        for k in range(3):
            ax.add_patch(Rectangle((gx + k * 0.42 * 1.0, gy + (n - 1 - a) * 0.42 - 0.75 + 1.0), 0.42, 0.42,
                                   fc=style.TINT[cols[a]], ec=cols[a], lw=1.0))
    ax.text(gx + 1.45, gy + 1.0, "row a = atom a\n(last index fastest)", fontsize=8.5, color=style.INK2, va="center",
            linespacing=1.3)
    # Fortran grid (columns = atoms), right
    fx, fy = 7.3, 4.25
    ax.text(fx, 6.6, "Fortran  x(3, 4)", fontsize=9.5, family=MONO, color=style.INK, va="top")
    for a in range(n):
        for k in range(3):
            ax.add_patch(Rectangle((fx + a * 0.42, fy + (2 - k) * 0.42 - 0.3), 0.42, 0.42,
                                   fc=style.TINT[cols[a]], ec=cols[a], lw=1.0))
    ax.text(fx + 1.85, fy + 0.33, "column a = atom a\n(first index fastest)", fontsize=8.5, color=style.INK2,
            va="center", linespacing=1.3)
    arrow(ax, (1.0, 3.95), (2.5, 3.66), rad=0.15)
    arrow(ax, (7.9, 3.92), (7.2, 3.66), rad=-0.15)
    # the wrong declaration, below
    ax.text(6.0, 2.2, "Declared as  x(4, 3)  instead, Fortran reads the same 12 numbers down its columns:",
            ha="center", fontsize=9, color=style.PINK)
    wx, wy = 4.6, 0.25
    for k in range(3 * n):
        atom = k // 3
        col_, row_ = divmod(k, 4)
        ax.add_patch(Rectangle((wx + col_ * 0.5, wy + (3 - row_) * 0.42), 0.5, 0.42, fc=style.TINT[cols[atom]],
                               ec=cols[atom], lw=1.0))
        ax.text(wx + col_ * 0.5 + 0.25, wy + (3 - row_) * 0.42 + 0.21, "xyz"[k % 3] + str(atom + 1), ha="center",
                va="center", fontsize=8, color=style.INK)
    ax.text(wx + 1.75, wy + 0.84, "row 1 is  x1, y2, z3, x4 :\nno longer one atom", fontsize=8.5,
            color=style.INK2, va="center", linespacing=1.3)
    style.save(fig, SLUG, "interop")


# ---------------------------------------------------------------------------------------------
# Cover: an 80-column punched card
# ---------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        card = Polygon([(0.45, 0.55), (3.55, 0.55), (3.55, 2.45), (0.75, 2.45), (0.45, 2.15)], closed=True,
                       fc="#fbf6e6", ec=style.GOLD, lw=2.0, zorder=1)
        ax.add_patch(card)
        rng = np.random.default_rng(1957)
        ncol, nrow = 26, 10
        for c in range(ncol):
            x = 0.62 + c * 0.112
            k = rng.integers(1, 3)
            rows = rng.choice(nrow, size=k, replace=False)
            for r in rows:
                y = 0.72 + r * 0.155
                if x < 0.75 and y > 2.1:
                    continue
                col = style.INK if c < 6 or c > 20 else [style.BLUE, style.TEAL, style.ORANGE, style.PINK][c % 4]
                ax.add_patch(Rectangle((x, y), 0.055, 0.1, color=col, zorder=2))
        ax.add_patch(Rectangle((0.45, 2.27), 3.1, 0.04, color=style.GOLD, zorder=2))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    build()
    print("   float32 sum stops at n = %d, S = %.7f, error %.3e" % summation())
    interop(); cover()
