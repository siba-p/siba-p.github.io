"""Figures for content/learn/numbers-in-a-computer.md: the two's-complement wheel, the bit layouts of four
floating-point formats, a ruler of every number in a toy float format, and the anatomy of the float32 running sum."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, Wedge, FancyArrowPatch
plt = style.setup()
SLUG = "numbers-in-a-computer"


def twos_wheel():
    fig, ax = plt.subplots(figsize=(7.2, 3.9))
    ax.set_xlim(-3.3, 6.9); ax.set_ylim(-2.75, 2.75); ax.set_aspect("equal"); ax.axis("off")
    R_out, R_in = 2.25, 1.35
    for k in range(16):
        ang = 90 - k * 22.5                   # pattern k at angle, clockwise from the top
        neg = k >= 8
        col = style.PINK if neg else style.BLUE
        ax.add_patch(Wedge((0, 0), 2.6, ang - 11.25, ang + 11.25, width=0.9, fc=style.TINT[col], ec="white", lw=1.5))
        th = np.radians(ang)
        bits = format(k, "04b")
        ax.text(2.15 * np.cos(th), 2.15 * np.sin(th), bits, ha="center", va="center", fontsize=8.5, color=style.INK2,
                rotation=0)
        val = k - 16 if neg else k
        ax.text(R_in * np.cos(th), R_in * np.sin(th), f"{val:+d}" if val else "0", ha="center", va="center",
                fontsize=9.5, fontweight="semibold", color=col)
    # the overflow seam between 0111 (+7) and 1000 (-8)
    th = np.radians(90 - 7.5 * 22.5)
    ax.plot([1.72 * np.cos(th), 2.75 * np.cos(th)], [1.72 * np.sin(th), 2.75 * np.sin(th)], color=style.ORANGE, lw=2.2)
    ax.text(0, 0, "4 bits", ha="center", va="center", fontsize=9, color=style.INK3)
    # explanation on the right
    x = 3.3
    ax.text(x, 2.2, "Four-bit two's complement", fontsize=10.5, fontweight="semibold", color=style.INK, va="center")
    lines = [("Adding 1 moves one step clockwise.", style.INK2),
             ("The leftmost bit is worth −8, so the", style.INK2),
             ("patterns 1000 to 1111 read as −8 to −1.", style.INK2),
             ("", style.INK2),
             ("Crossing the orange seam is overflow:", style.ORANGE),
             ("0111 + 1 = 1000, so 7 + 1 gives −8.", style.ORANGE),
             ("", style.INK2),
             ("Crossing the top is not: 1111 + 1 = 0000,", style.INK2),
             ("so −1 + 1 = 0, exactly as it should.", style.INK2),
             ("", style.INK2),
             ("Eight bits make the same wheel with 256", style.INK3),
             ("steps: 127 + 1 gives −128.", style.INK3)]
    for i, (t, c) in enumerate(lines):
        ax.text(x, 1.6 - 0.36 * i, t, fontsize=8.5, color=c, va="center")
    style.save(fig, SLUG, "twos-wheel")


def formats():
    fmts = [("double (FP64)", 1, 11, 52), ("single (FP32)", 1, 8, 23), ("bfloat16", 1, 8, 7), ("half (FP16)", 1, 5, 10)]
    fig, ax = plt.subplots(figsize=(7.2, 2.9))
    scale = 0.085                                   # width per bit
    x0 = 0
    for i, (name, s, e, f) in enumerate(fmts):
        y = -i * 1.0
        ax.text(x0 - 0.15, y + 0.3, name, ha="right", va="center", fontsize=9, color=style.INK)
        x = x0
        for n, col, lab in [(s, style.PINK, "sign"), (e, style.BLUE, "exponent"), (f, style.TEAL, "fraction")]:
            ax.add_patch(Rectangle((x, y), n * scale, 0.6, fc=col, ec="white", lw=1.0))
            for b in range(1, n):
                ax.plot([x + b * scale] * 2, [y + 0.04, y + 0.56], color="white", lw=0.35, alpha=0.6)
            if n >= 5:
                ax.text(x + n * scale / 2, y + 0.3, f"{n}", ha="center", va="center", fontsize=8.5, color="white", fontweight="semibold")
            x += n * scale
        p = f + 1
        ax.text(x + 0.12, y + 0.3, f"{s + e + f} bits · {p} significant bits", ha="left", va="center", fontsize=8.5, color=style.INK2)
    # bracket showing bfloat16 = top half of FP32
    yb = -1.0 - 0.12
    ax.plot([0, 0], [-2.0 + 0.6, -1.0], color=style.INK3, lw=0.8, ls=(0, (2, 2)))
    ax.plot([16 * scale] * 2, [-2.0 + 0.6, -1.0], color=style.INK3, lw=0.8, ls=(0, (2, 2)))
    ax.text(16 * scale + 0.1, -1.2, "bfloat16 is the top 16 bits of FP32", fontsize=8, color=style.INK3, va="center")
    # legend
    for k, (col, lab) in enumerate([(style.PINK, "sign: 1 bit"), (style.BLUE, "exponent: sets the range"), (style.TEAL, "fraction: sets the precision")]):
        ax.add_patch(Rectangle(([0, 1.5, 5.2][k], 1.0), 0.18, 0.18, fc=col, ec="none"))
        ax.text([0, 1.5, 5.2][k] + 0.27, 1.09, lab, fontsize=8.5, color=style.INK2, va="center")
    ax.set_xlim(-1.6, 64 * scale + 2.6); ax.set_ylim(-3.2, 1.4); ax.axis("off"); ax.set_aspect("equal")
    style.save(fig, SLUG, "formats")


def ruler():
    """Every non-negative number of a toy format with 3 fraction bits (4 significant bits) and exponents -2..3."""
    p = 4
    vals = [0.0]
    emin, emax = -2, 3
    for k in range(1, 8):                        # subnormals: 0.f x 2^emin
        vals.append(k / 8 * 2.0 ** emin)
    for e in range(emin, emax + 1):
        for m in range(8):
            vals.append((1 + m / 8) * 2.0 ** e)
    vals = np.array(vals)
    fig, axes = plt.subplots(2, 1, figsize=(7.2, 3.3), gridspec_kw=dict(height_ratios=[1, 1], hspace=0.9))
    cols = {-2: style.GOLD, -1: style.PINK, 0: style.BLUE, 1: style.TEAL, 2: style.VIOLET, 3: style.ORANGE}
    def colour(v):
        if v < 2.0 ** emin: return style.INK3
        return cols[min(int(np.floor(np.log2(v))), emax)]
    for ax, (lo, hi) in zip(axes, [(0, 16), (0, 2)]):
        sel = vals[(vals >= lo) & (vals <= hi)]
        ax.axhline(0, color=style.INK3, lw=0.8)
        for v in sel:
            ax.plot([v, v], [0, 1], color=colour(v), lw=1.6, solid_capstyle="butt")
        ax.set_xlim(lo - (hi - lo) * 0.01, hi + (hi - lo) * 0.01); ax.set_ylim(-0.1, 1.9)
        ax.set_yticks([]); ax.spines["left"].set_visible(False)
    a, b = axes
    a.set_xticks([0, 1, 2, 4, 8, 16])
    for e, x0, x1 in [(1, 2, 4), (2, 4, 8), (3, 8, 16)]:
        a.text((x0 + x1) / 2, 1.3, f"gap {2.0 ** (e - 3):g}", ha="center", fontsize=8.5, color=cols[e])
    a.set_title("All 56 non-negative numbers of a toy format with 4 significant bits; the largest is 15", fontsize=10)
    b.set_xticks([0, 0.25, 0.5, 1, 2])
    b.set_xticklabels(["0", "0.25", "0.5", "1", "2"])
    b.text(0.125, 1.3, "subnormals\ngap 1/32", ha="center", fontsize=8, color=style.INK2, va="bottom")
    b.text(0.375, 1.3, "gap 1/32", ha="center", fontsize=8, color=cols[-2], va="bottom")
    b.text(0.75, 1.3, "gap 1/16", ha="center", fontsize=8, color=cols[-1], va="bottom")
    b.text(1.5, 1.3, "gap 1/8 = ε", ha="center", fontsize=8, color=cols[0], va="bottom")
    b.set_title("The same ruler from 0 to 2: every doubling halves the gap", fontsize=10)
    b.set_xlabel("value")
    style.save(fig, SLUG, "ruler")
    return len(vals)


def running_sum():
    n = 10_000_000
    x = np.full(n, 0.1, dtype=np.float32)
    run = np.cumsum(x, dtype=np.float32)            # sequential float32 accumulation
    k = np.arange(1, n + 1)
    final = float(run[-1])
    fig, axes = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.38))
    ax = axes[0]
    idx = np.unique(np.concatenate([np.arange(0, n, 20000), [n - 1]]))
    ax.plot(k[idx] / 1e6, run[idx] / 1e6, color=style.PINK, lw=2.0)
    ax.plot([0, n / 1e6], [0, 1.0], color=style.INK3, lw=1.2, ls=(0, (3, 2)))
    ax.text(0.3, 1.13, f"float32 running sum: {final:,.0f}", color=style.PINK, ha="left", va="center", fontsize=8.5)
    ax.text(0.3, 1.03, "exact: 1,000,000", color=style.INK3, ha="left", va="center", fontsize=8.5)
    for p2 in [2 ** 17, 2 ** 19]:
        i = int(np.searchsorted(run, p2))
        ax.plot([k[i] / 1e6], [p2 / 1e6], "o", ms=4, color=style.INK2)
    ax.text(1.45, 0.14, "$2^{17}$", fontsize=8.5, color=style.INK2)
    ax.text(5.65, 0.47, "$2^{19}$", fontsize=8.5, color=style.INK2)
    ax.set_xlabel("additions of 0.1  (millions)"); ax.set_ylabel("running total  (millions)")
    ax.set_xlim(0, 10.2); ax.set_ylim(0, 1.2)
    ax.set_title("Ten million additions of 0.1", fontsize=10)
    # right: the amount actually added per step, as a function of the running total
    ax = axes[1]
    steps = np.diff(run[:: 1].astype(np.float64))
    tot = run[:-1].astype(np.float64)
    # sample one value per binade region for a clean staircase
    sel = np.unique(np.concatenate([np.searchsorted(tot, np.logspace(0, np.log10(tot[-1]), 3000)) .clip(0, n - 2)]))
    ax.step(tot[sel], steps[sel], where="post", color=style.BLUE, lw=1.8)
    ax.axhline(0.1, color=style.INK3, lw=1.0, ls=(0, (3, 2)))
    ax.set_xscale("log")
    ax.set_xlim(10, 2e6); ax.set_ylim(0.08, 0.135)
    ax.set_xticks([10, 1e2, 1e3, 1e4, 1e5, 1e6]); ax.set_xticklabels(["10", "100", "1,000", "$10^4$", "$10^5$", "$10^6$"])
    ax.minorticks_off()
    ax.text(12, 0.1025, "0.1", color=style.INK3, fontsize=8.5, va="bottom")
    ax.text(2.0e5, 0.0905, "0.09375", color=style.BLUE, fontsize=8.5, ha="center", va="top")
    ax.text(1.1e6, 0.1285, "0.125", color=style.BLUE, fontsize=8.5, ha="center", va="bottom")
    ax.set_xlabel("running total"); ax.set_ylabel("amount actually added")
    ax.set_title("What each + 0.1 really adds", fontsize=10)
    style.save(fig, SLUG, "running-sum")
    return final


def cover():
    def draw(ax):
        # a 16-bit pattern: sign, exponent, fraction
        cols = [style.PINK] + [style.BLUE] * 5 + [style.TEAL] * 10
        on = [1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1]
        w, gap, x0, y0 = 0.19, 0.03, 0.26, 1.85
        for i, (c, b) in enumerate(zip(cols, on)):
            x = x0 + i * (w + gap)
            ax.add_patch(FancyBboxPatch((x, y0), w, 0.62, boxstyle="round,pad=0,rounding_size=0.04",
                                        fc=c if b else "white", ec=c, lw=2.2))
        # a ruler whose marks spread out
        ax.add_patch(Rectangle((0.25, 0.55), 3.5, 0.06, color=style.INK, lw=0))
        x, g = 0.28, 0.025
        cyc = [style.GOLD, style.PINK, style.BLUE, style.TEAL, style.VIOLET, style.ORANGE]
        b = 0
        while x < 3.75:
            for m in range(4):
                if x > 3.75: break
                h = 0.62 if m == 0 else 0.4
                ax.add_patch(Rectangle((x - 0.02, 0.61), 0.04, h, color=cyc[b % 6], lw=0))
                x += g
            g *= 2; b += 1
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    twos_wheel(); formats(); n = ruler(); f = running_sum(); cover()
    print("toy format values:", n, " float32 running sum:", f)
