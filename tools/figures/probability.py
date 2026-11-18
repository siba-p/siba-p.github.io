"""Figures for content/learn/probability.md.

family      : how the Bernoulli, binomial, Poisson, exponential and normal distributions arise from one another
base-rate   : the precision of a screen against the fraction of good candidates, for three screens
blocks      : block averaging of a correlated series (AR(1), phi = 0.95): block means and the error against block length
heavy-tails : running means of Gaussian and Cauchy (Lorentzian) samples; only the first settles down
cover       : a Galton board
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from math import comb, factorial
import style
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Rectangle
plt = style.setup()
SLUG = "probability"


def family():
    fig = plt.figure(figsize=(7.2, 4.6))
    W, H = 0.25, 0.32
    boxes = {"bern": (0.02, 0.6), "bin": (0.375, 0.6), "norm": (0.73, 0.6), "exp": (0.02, 0.08), "pois": (0.375, 0.08)}
    info = {"bern": ("Bernoulli", "one yes-or-no trial, P(yes) = p", style.BLUE),
            "bin": ("Binomial", "successes in n trials", style.BLUE),
            "norm": ("Normal", "sums of many small effects", style.PINK),
            "pois": ("Poisson", "counts of rare events, rate λ", style.TEAL),
            "exp": ("Exponential", "waiting time to the next event", style.ORANGE)}
    for k, (x, y) in boxes.items():
        fig.add_artist(FancyBboxPatch((x, y), W, H, boxstyle="round,pad=0,rounding_size=0.015", transform=fig.transFigure,
                                      fc=style.BG2, ec=style.LINE, lw=1.0, zorder=-5))
        name, sub, col = info[k]
        fig.text(x + 0.012, y + H - 0.03, name, fontsize=10, fontweight="semibold", color=style.INK, va="top")
        fig.text(x + 0.012, y + H - 0.085, sub, fontsize=8, color=style.INK2, va="top")
        ax = fig.add_axes([x + 0.02, y + 0.065, W - 0.04, H - 0.18]); ax.patch.set_alpha(0)
        ax.set_yticks([]); ax.spines["left"].set_visible(False); ax.tick_params(labelsize=8)
        if k == "bern":
            ax.bar([0, 1], [0.7, 0.3], width=0.5, color=col); ax.set_xticks([0, 1]); ax.set_xlim(-0.8, 1.8)
            ax.set_xticklabels(["no", "yes"])
        elif k == "bin":
            n, p = 20, 0.3; kk = np.arange(n + 1)
            ax.bar(kk, [comb(n, i) * p ** i * (1 - p) ** (n - i) for i in kk], width=0.75, color=col)
            ax.set_xticks([0, 6, 12, 18]); ax.text(0.98, 0.95, "n = 20, p = 0.3", transform=ax.transAxes, ha="right", va="top", fontsize=8, color=style.INK2)
        elif k == "pois":
            lam = 3; kk = np.arange(12)
            ax.bar(kk, [lam ** i * np.exp(-lam) / factorial(i) for i in kk], width=0.75, color=col)
            ax.set_xticks([0, 3, 6, 9]); ax.text(0.98, 0.95, "λ = 3", transform=ax.transAxes, ha="right", va="top", fontsize=8, color=style.INK2)
        elif k == "exp":
            t = np.linspace(0, 4, 200); ax.fill_between(t, np.exp(-t), color=style.TINT[col]); ax.plot(t, np.exp(-t), color=col)
            ax.set_xticks([0, 1, 2, 3, 4]); ax.set_xlim(0, 4); ax.set_ylim(0, 1.1)
            ax.text(0.98, 0.95, "λ = 1", transform=ax.transAxes, ha="right", va="top", fontsize=8, color=style.INK2)
        else:
            z = np.linspace(-3.5, 3.5, 200); g = np.exp(-z * z / 2)
            ax.fill_between(z, g, color=style.TINT[col]); ax.plot(z, g, color=col); ax.set_xlim(-3.5, 3.5); ax.set_ylim(0, 1.15)
            ax.set_xticks([-2, 0, 2]); ax.set_xticklabels(["μ − 2σ", "μ", "μ + 2σ"])

    def link(p, q, text, tx, ty, ha="center"):
        fig.add_artist(FancyArrowPatch(p, q, transform=fig.transFigure, arrowstyle="-|>", mutation_scale=13,
                                       color=style.INK2, lw=1.4, shrinkA=0, shrinkB=0))
        fig.text(tx, ty, text, fontsize=8.5, color=style.INK2, ha=ha, va="center")
    link((0.28, 0.76), (0.365, 0.76), "add up\nn trials", 0.322, 0.86)
    link((0.635, 0.76), (0.72, 0.76), "n large\n(CLT)", 0.677, 0.86)
    link((0.5, 0.59), (0.5, 0.41), "n → ∞, p → 0,\nnp = λ fixed", 0.515, 0.5, ha="left")
    link((0.365, 0.24), (0.28, 0.24), "time\nbetween\nevents", 0.322, 0.335)
    link((0.635, 0.3), (0.80, 0.585), "λ large", 0.735, 0.4, ha="left")
    fig.text(0.73, 0.2, "Arrows read ‘becomes’ or\n‘gives rise to’; each limit\nis exact only as the stated\nquantity grows without bound.",
             fontsize=8.5, color=style.INK3, va="center")
    style.save(fig, SLUG, "family")


def base_rate():
    prior = np.logspace(-3, np.log10(0.5), 300)
    def prec(p, sens, fpr): return sens * p / (sens * p + fpr * (1 - p))
    screens = [(0.90, 0.10, style.BLUE, "sensitivity 90 %, false positives 10 %"),
               (0.99, 0.10, style.TEAL, "sensitivity 99 %, false positives 10 %"),
               (0.90, 0.01, style.ORANGE, "sensitivity 90 %, false positives 1 %")]
    fig, ax = plt.subplots(figsize=(7.2, 3.8))
    for sens, fpr, col, lab in screens:
        ax.plot(100 * prior, 100 * prec(prior, sens, fpr), color=col, lw=2.0 if col != style.TEAL else 1.5,
                ls="-" if col != style.TEAL else (0, (4, 2)))
    ax.axvline(5, color=style.INK3, lw=0.8, ls=(0, (2, 2)))
    for sens, fpr, col, lab in screens:
        v = 100 * prec(0.05, sens, fpr)
        ax.plot(5, v, "o", color=col, ms=6, zorder=5)
    ax.text(5.6, 100 * prec(0.05, .9, .01), f"{100 * prec(0.05, .9, .01):.0f} %", color=style.ORANGE, fontsize=9, va="top")
    ax.text(5.6, 100 * prec(0.05, .9, .1) - 1, f"{100 * prec(0.05, .9, .1):.0f} % and {100 * prec(0.05, .99, .1):.0f} %",
            color=style.BLUE, fontsize=9, va="top")
    ax.text(0.13, 72, "false positives 1 %", color=style.ORANGE, fontsize=9, ha="left")
    ax.text(7, 9, "false positives 10 %:\nsensitivity 90 % (solid)\nor 99 % (dashed)", color=style.BLUE, fontsize=9, ha="left")
    ax.text(5.4, 97, "base rate 5 %", color=style.INK3, fontsize=8.5, va="top")
    ax.set_xscale("log"); ax.set_xlim(0.1, 50); ax.set_ylim(0, 100)
    ax.set_xticks([0.1, 0.3, 1, 3, 10, 30]); ax.set_xticklabels(["0.1", "0.3", "1", "3", "10", "30"])
    ax.set_xlabel("fraction of candidates that are truly good (%)")
    ax.set_ylabel("flagged candidates that are good (%)")
    ax.grid(True, axis="y")
    style.save(fig, SLUG, "base-rate")


def ar1(n, phi, rng):
    e = rng.standard_normal(n) * np.sqrt(1 - phi ** 2)
    x = np.empty(n); x[0] = rng.standard_normal()
    for i in range(1, n): x[i] = phi * x[i - 1] + e[i]
    return x


def blocks():
    rng = np.random.default_rng(7)
    n, phi = 2 ** 16, 0.95
    x = ar1(n, phi, rng)
    tau = (1 + phi) / (2 * (1 - phi))                    # integrated autocorrelation time, 19.5 steps
    exact = np.sqrt(2 * tau / n)                         # unit variance series
    bs = 2 ** np.arange(0, 12); se = []; dse = []
    for b in bs:
        m = x[: n // b * b].reshape(-1, b).mean(axis=1); M = len(m)
        s = m.std(ddof=1) / np.sqrt(M); se.append(s); dse.append(s / np.sqrt(2 * (M - 1)))
    se = np.array(se); dse = np.array(dse)
    fig, (ax, bx) = plt.subplots(1, 2, figsize=(7.2, 3.4), gridspec_kw=dict(width_ratios=[1.25, 1]))
    show, b = 1024, 128
    t = np.arange(show)
    for k in range(show // b):
        if k % 2 == 0: ax.axvspan(k * b, (k + 1) * b, color=style.BG2, lw=0)
    ax.plot(t, x[:show], color=style.BLUE, lw=0.9)
    for k in range(show // b):
        mk = x[k * b:(k + 1) * b].mean()
        ax.plot([k * b + 4, (k + 1) * b - 4], [mk, mk], color=style.ORANGE, lw=3, solid_capstyle="butt")
    ax.set_xlim(0, show); ax.set_xlabel("step"); ax.set_ylabel("observable (units of σ)")
    ax.set_title("Blocks of 128 steps and their means", fontsize=10)
    bx.errorbar(bs, se / exact, yerr=dse / exact, fmt="o-", color=style.BLUE, ms=4, lw=1.4, capsize=2)
    bx.axhline(1, color=style.ORANGE, lw=1.4, ls=(0, (4, 2)))
    bx.text(1.3, 0.9, "exact error, $\\sqrt{2\\tau/n}$", color=style.ORANGE, fontsize=8.5)
    bx.annotate(f"naive $s/\\sqrt{{n}}$:\n{se[0] / exact:.2f} of the true error", xy=(1, se[0] / exact), xytext=(24, 0.14),
                fontsize=8.5, color=style.INK2, arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    bx.text(10, 1.2, "plateau once blocks are longer than 2τ", fontsize=8.5, color=style.INK2, ha="left")
    bx.set_xscale("log", base=2); bx.set_xticks([1, 4, 16, 64, 256, 1024]); bx.set_xticklabels(["1", "4", "16", "64", "256", "1024"])
    bx.set_ylim(0, 1.35); bx.set_xlabel("block length (steps)"); bx.set_ylabel("estimated / exact error of the mean")
    bx.set_title("Error estimate against block length", fontsize=10)
    fig.subplots_adjust(wspace=0.35)
    style.save(fig, SLUG, "blocks")
    return tau, exact, se[0], se[-4:]


def heavy_tails():
    rng = np.random.default_rng(11)
    n = 100000
    idx = np.unique(np.logspace(0, 5, 400).astype(int))
    fig, ax = plt.subplots(figsize=(7.2, 3.5))
    nn = np.arange(1, n + 1)
    ax.fill_between(nn[idx - 1], -2 / np.sqrt(nn[idx - 1]), 2 / np.sqrt(nn[idx - 1]), color=style.TINT[style.BLUE], lw=0)
    for r in range(3):
        g = np.cumsum(rng.standard_normal(n)) / nn
        c = np.cumsum(rng.standard_cauchy(n)) / nn
        ax.plot(nn[idx - 1], c[idx - 1], color=style.ORANGE, lw=1.3, alpha=0.95)
        ax.plot(nn[idx - 1], g[idx - 1], color=style.BLUE, lw=1.3)
    ax.axhline(0, color=style.INK3, lw=0.8)
    ax.set_xscale("log"); ax.set_xlim(1, n); ax.set_ylim(-4, 4)
    ax.set_xlabel("number of samples averaged, $n$"); ax.set_ylabel("running mean")
    ax.text(1.4, 3.4, "Cauchy (Lorentzian), width 1: three runs", color=style.ORANGE, fontsize=9, bbox=dict(fc="white", ec="none", pad=1.5))
    ax.text(1.4, -3.55, "Gaussian, σ = 1: three runs inside the ±2/√n band", color=style.BLUE, fontsize=9, bbox=dict(fc="white", ec="none", pad=1.5))
    style.save(fig, SLUG, "heavy-tails")


def cover():
    def draw(ax):
        rows, dx, dy, top = 7, 0.36, 0.25, 2.72
        rng = np.random.default_rng(3)
        # one ball's path through the pegs
        pos = 0.0; path = [(2.0, top + 0.18)]
        for r in range(rows):
            path.append((2.0 + pos * dx, top - r * dy))
            pos += 0.5 if rng.random() < 0.5 else -0.5
        path.append((2.0 + pos * dx, top - rows * dy))
        for r in range(rows):
            for j in range(r + 1):
                ax.add_patch(Circle((2.0 + (j - r / 2) * dx, top - r * dy), 0.055, color=style.INK2, zorder=2))
        P = np.array(path)
        ax.plot(P[:, 0], P[:, 1], color=style.ORANGE, lw=4, zorder=3, solid_joinstyle="round")
        ax.add_patch(Circle(tuple(P[-1]), 0.1, color=style.ORANGE, zorder=4))
        n = rows; base = 0.18; scale = 2.9
        for k in range(n + 1):
            h = scale * comb(n, k) / 2 ** n
            ax.add_patch(Rectangle((2.0 + (k - n / 2) * dx - 0.15, base), 0.3, h, color=style.TEAL, zorder=2))
        xs = np.linspace(0.3, 3.7, 200); mu = 2.0; sd = dx * np.sqrt(n) / 2
        ax.plot(xs, base + scale * dx / (sd * np.sqrt(2 * np.pi)) * np.exp(-(xs - mu) ** 2 / (2 * sd * sd)),
                color=style.GOLD, lw=4.5, zorder=5)
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    family(); base_rate(); print(blocks()); heavy_tails(); cover()
