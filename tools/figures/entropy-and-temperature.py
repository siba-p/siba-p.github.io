"""Static figures for content/learn/entropy-and-temperature.md.  Run: python3 tools/figures/entropy-and-temperature.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from itertools import product
from math import lgamma
from matplotlib.patches import Rectangle, Circle, FancyArrowPatch
import style
plt = style.setup()
SLUG = "entropy-and-temperature"


def ln_omega(N, q):
    """ln of the Einstein-solid multiplicity, (q + N - 1)! / (q! (N - 1)!)."""
    return lgamma(q + N) - lgamma(q + 1) - lgamma(N)


def microstates():
    """All ten microstates of 3 oscillators sharing 3 quanta, and the stars-and-bars code of one of them."""
    states = [s for s in product(range(4), repeat=3) if sum(s) == 3]
    groups = [[s for s in states if sorted(s) == g] for g in ([0, 0, 3], [0, 1, 2], [1, 1, 1])]
    fig, ax = plt.subplots(figsize=(7.2, 3.9))
    ax.set_aspect("equal"); ax.axis("off")
    cols = [style.BLUE, style.TEAL, style.VIOLET]
    titles = ["one oscillator holds all 3\n3 microstates", "pattern 2, 1, 0\n6 microstates", "one quantum each\n1 microstate"]
    x0s = [0.0, 3.2, 6.4]

    def osc(x, y, n, col):
        for j in range(3):
            ax.add_patch(Rectangle((x + j * 0.62, y), 0.52, 0.42, facecolor="white", edgecolor=col, lw=1.3))
            for k in range(n[j]):
                ax.add_patch(Circle((x + j * 0.62 + 0.12 + k * 0.14, y + 0.21), 0.055, color=style.GOLD))

    slots = [[(0.0, r) for r in range(3)], [(2.55 + 2.0 * (r // 3), r % 3) for r in range(6)], [(7.2, 0)]]
    centres = [0.9, 4.45, 8.1]
    for grp, col, title, sl, cx in zip(groups, cols, titles, slots, centres):
        ax.text(cx, 3.75, title, ha="center", va="bottom", fontsize=9, color=col, linespacing=1.35)
        for st, (x0, r) in zip(grp, sl):
            osc(x0, 3.2 - r * 0.58, st, col)
    # stars and bars: (2, 0, 1)
    y = 0.15
    ax.text(0.0, y + 0.75, "Stars and bars: write the quanta as dots and separate the oscillators with N − 1 = 2 bars", fontsize=9, color=style.INK2)
    osc(0.0, y, (2, 0, 1), style.TEAL)
    ax.add_patch(FancyArrowPatch((2.05, y + 0.21), (3.05, y + 0.21), arrowstyle="-|>", mutation_scale=11, color=style.INK3, lw=1.1))
    seq = ["q", "q", "b", "b", "q"]
    for i, t in enumerate(seq):
        x = 3.35 + i * 0.42
        if t == "q":
            ax.add_patch(Circle((x, y + 0.21), 0.09, color=style.GOLD))
        else:
            ax.plot([x, x], [y + 0.0, y + 0.42], color=style.INK, lw=2.2)
    ax.text(5.6, y + 0.21, "5 symbols, choose which 3 are dots:\n(3 + 2)! / (3! 2!) = 10", fontsize=9, color=style.INK2, va="center")
    ax.set_xlim(-0.1, 9.1); ax.set_ylim(-0.05, 4.45)
    style.save(fig, SLUG, "microstates")


def slopes():
    """ln Omega of two solids (60 and 40 oscillators, 100 quanta) and their slopes, which are 1/kT."""
    NA, NB, q = 60, 40, 100
    k = np.arange(q + 1)
    SA = np.array([ln_omega(NA, a) for a in k]); SB = np.array([ln_omega(NB, q - a) for a in k])
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.5), gridspec_kw=dict(wspace=0.38))
    a1.plot(k, SA, color=style.BLUE); a1.plot(k, SB, color=style.TEAL); a1.plot(k, SA + SB, color=style.PINK)
    i = int(np.argmax(SA + SB))
    a1.axvline(i, color=style.INK3, lw=0.9, ls=":")
    a1.text(70, 70, "solid A", color=style.BLUE, fontsize=9)
    a1.text(8, 62, "solid B", color=style.TEAL, fontsize=9)
    a1.text(3, 145, "total, maximal at $q_\\mathrm{A}$ = 60", color=style.PINK, fontsize=9)
    a1.set_xlim(0, 100); a1.set_ylim(0, 160)
    a1.set_xlabel("quanta in solid A, $q_\\mathrm{A}$"); a1.set_ylabel("entropy S / $k_\\mathrm{B}$ = ln Ω")
    a1.set_title("Entropies add", fontsize=10.5)
    kk = k[1:-1]
    bA = np.array([(ln_omega(NA, a + 1) - ln_omega(NA, a - 1)) / 2 for a in kk])            # d ln Omega_A / dq_A
    bB = np.array([(ln_omega(NB, q - a + 1) - ln_omega(NB, q - a - 1)) / 2 for a in kk])    # d ln Omega_B / dq_B
    a2.plot(kk, bA, color=style.BLUE); a2.plot(kk, bB, color=style.TEAL)
    a2.axvline(i, color=style.INK3, lw=0.9, ls=":")
    a2.plot([i], [bA[i - 1]], "o", color=style.PINK, ms=6)
    a2.annotate(f"equal slopes {bA[i - 1]:.2f}:\nequal temperatures", xy=(i, bA[i - 1]), xytext=(30, 1.85), fontsize=9, color=style.PINK,
                arrowprops=dict(arrowstyle="-", color=style.PINK, lw=0.8))
    a2.text(6, 3.3, "solid A", color=style.BLUE, fontsize=9)
    a2.text(74, 3.3, "solid B", color=style.TEAL, fontsize=9)
    a2.text(9, 2.75, "steep slope = few quanta = cold", color=style.INK2, fontsize=8.5)
    a2.set_xlim(0, 100); a2.set_ylim(0, 3.6)
    a2.set_xlabel("quanta in solid A, $q_\\mathrm{A}$"); a2.set_ylabel("slope ∂ ln Ω / ∂q = ε / $k_\\mathrm{B}T$")
    a2.set_title("Slopes are inverse temperatures", fontsize=10.5)
    print(f"  maximum at q_A = {i}; slopes {bA[i - 1]:.3f} and {bB[i - 1]:.3f}")
    style.save(fig, SLUG, "slopes")


def sharpening():
    """Distribution of the energy fraction in A for two equal solids, N oscillators each, q = 2N."""
    fig, ax = plt.subplots(figsize=style.WIDE)
    for N, col in [(3, style.GOLD), (30, style.ORANGE), (300, style.PINK), (3000, style.VIOLET)]:
        q = 2 * N; k = np.arange(q + 1)
        lw = np.array([ln_omega(N, a) + ln_omega(N, q - a) for a in k])
        P = np.exp(lw - lw.max()); P /= P.sum()
        m = (k * P).sum(); sd = np.sqrt(((k - m) ** 2 * P).sum())
        P = P / P.max()
        if N == 3:
            ax.plot(k / q, P, "o-", color=col, ms=4, lw=1.4)
        else:
            ax.plot(k / q, P, color=col)
        print(f"  N = {N}: sd {sd:.2f} quanta, relative {sd / N:.3f}")
        yl = {3: 1.04, 30: 0.95, 300: 0.86, 3000: 0.77}[N]
        ax.text(0.015, yl, f"N = {N}: ±{100 * sd / N:.{0 if N < 3000 else 1}f} %", color=col, fontsize=9, va="top")
    ax.set_xlim(0, 1); ax.set_ylim(0, 1.08)
    ax.set_xlabel("fraction of the energy in solid A, $q_\\mathrm{A}/q$")
    ax.set_ylabel("probability / its maximum")
    ax.set_title("Two equal solids sharing one quantum per oscillator: the peak narrows as 1/√N")
    style.save(fig, SLUG, "sharpening")


def temperature():
    """Einstein solid: energy per oscillator against temperature, quantum and classical."""
    t = np.logspace(-1, np.log10(20), 400)                       # k_B T / epsilon
    n = 1 / np.expm1(1 / t)
    fig, ax = plt.subplots(figsize=style.WIDE)
    ax.plot(t, t, color=style.TEAL, ls="--", lw=1.6)
    ax.plot(t, n, color=style.VIOLET)
    for qn in [0.1, 1.0, 10.0]:
        tt = 1 / np.log(1 + 1 / qn)
        ax.plot([tt], [qn], "o", color=style.ORANGE, ms=6)
        ax.annotate(f"q/N = {qn:g}:  $k_\\mathrm{{B}}T$ = {tt:.2f} ε", xy=(tt, qn), xytext=(tt * 1.25, qn * 0.32),
                    fontsize=8.5, color=style.ORANGE, arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.8))
    ax.text(0.2, 2.0, "classical: $k_\\mathrm{B}T$ per oscillator", color=style.TEAL, fontsize=9)
    ax.text(0.5, 0.0035, "Einstein solid:\nq/N = 1 / (exp(ε/$k_\\mathrm{B}T$) − 1)", color=style.VIOLET, fontsize=9)
    ax.set_xscale("log"); ax.set_yscale("log")
    ax.set_xlim(0.1, 20); ax.set_ylim(1e-4, 30)
    ax.set_xlabel("temperature $k_\\mathrm{B}T$ (units of the quantum ε)")
    ax.set_ylabel("quanta per oscillator q/N")
    ax.set_title("Temperature is not energy per oscillator, except at high temperature")
    style.save(fig, SLUG, "temperature")


def cover():
    def draw(ax):
        rng = np.random.default_rng(7)
        for x0, col, nq in [(0.35, style.ORANGE, 30), (2.25, style.BLUE, 4)]:
            ax.add_patch(Rectangle((x0, 0.55), 1.4, 1.4, facecolor=style.TINT[col], edgecolor=col, lw=4))
            cells = rng.choice(16, size=min(nq, 16), replace=False) if nq <= 16 else np.arange(16)
            for j in range(16):
                cx, cy = x0 + 0.175 + (j % 4) * 0.35, 0.725 + (j // 4) * 0.35
                ax.add_patch(Rectangle((cx - 0.13, cy - 0.13), 0.26, 0.26, facecolor="white", edgecolor=col, lw=1.2))
            counts = np.zeros(16, int)
            for _ in range(nq):
                counts[rng.integers(16)] += 1
            for j in range(16):
                cx, cy = x0 + 0.175 + (j % 4) * 0.35, 0.725 + (j // 4) * 0.35
                for kq in range(min(counts[j], 3)):
                    ax.add_patch(Circle((cx - 0.07 + kq * 0.07, cy), 0.045, color=style.GOLD, zorder=3))
        ax.add_patch(FancyArrowPatch((1.0, 2.15), (2.95, 2.15), connectionstyle="arc3,rad=-0.45", arrowstyle="-|>",
                                     mutation_scale=34, color=style.PINK, lw=6))
    style.cover(SLUG, draw, bg=style.BG2)


if __name__ == "__main__":
    microstates(); slopes(); sharpening(); temperature(); cover()
