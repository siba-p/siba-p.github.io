"""Figures for content/learn/how-a-neuron-learns.md.  Run: python3 tools/figures/how-a-neuron-learns.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import Circle, FancyArrowPatch
import style
plt = style.setup()
SLUG = "how-a-neuron-learns"
sig = lambda z: 1 / (1 + np.exp(-z))


def ce_vs_se():
    """Loss and slope of one example labelled 1, for cross-entropy and squared error."""
    fig, (a, b) = plt.subplots(1, 2, figsize=(7.2, 3.1), gridspec_kw=dict(wspace=0.32))
    z = np.linspace(-7, 5, 801)
    p = sig(z)
    for ax in (a, b):
        ax.axvspan(-7, 0, color=style.BG2, zorder=0)
    a.plot(z, np.log1p(np.exp(-z)), color=style.BLUE)
    a.plot(z, 0.5 * (1 - p) ** 2, color=style.ORANGE)
    a.text(-0.2, 6.35, "wrong side\n($\\hat y < 0.5$)", fontsize=8.5, color=style.INK3, va="top", ha="right")
    a.text(-2.6, 4.3, "cross-entropy\n$-\\ln \\hat y$", color=style.BLUE, fontsize=9, ha="left")
    a.text(-6.7, 1.0, "squared error $\\frac{1}{2}(1-\\hat y)^2$\nflattens at 0.5", color=style.ORANGE, fontsize=9, ha="left")
    a.set_xlim(-7, 5); a.set_ylim(-0.15, 6.6)
    a.set_xlabel("weighted sum $z$ (label $y = 1$)"); a.set_ylabel("loss of one example")
    a.set_title("loss")

    ce, se = 1 - p, (1 - p) * p * (1 - p)
    b.semilogy(z, ce, color=style.BLUE); b.semilogy(z, se, color=style.ORANGE)
    z5 = -5.0; c5, s5 = 1 - sig(z5), (1 - sig(z5)) ** 2 * sig(z5)
    b.plot([z5, z5], [c5, s5], color=style.INK2, lw=1, ls=(0, (2, 2)))
    b.plot([z5], [c5], "o", ms=5, color=style.BLUE); b.plot([z5], [s5], "o", ms=5, color=style.ORANGE)
    b.text(z5 + 0.3, np.sqrt(c5 * s5), f"{c5 / s5:.0f}× smaller", fontsize=9, color=style.INK2, va="center")
    b.text(z5 - 0.25, c5 * 1.6, f"{c5:.3f}", fontsize=8.5, color=style.BLUE, ha="center", va="bottom")
    b.text(z5 + 0.3, s5 / 1.4, f"{s5:.4f}", fontsize=8.5, color=style.ORANGE, ha="left", va="top")
    b.text(1.6, 0.25, "cross-entropy", color=style.BLUE, fontsize=9, ha="center")
    b.text(1.4, 2.2e-3, "squared error", color=style.ORANGE, fontsize=9, ha="center")
    b.set_xlim(-7, 5); b.set_ylim(1e-4, 3)
    b.set_xlabel("weighted sum $z$ (label $y = 1$)"); b.set_ylabel("$|\\partial \\ell / \\partial z|$, the learning signal")
    b.set_title("slope")
    style.save(fig, SLUG, "ce-vs-se")


def perceptron_steps():
    """The hand-traced perceptron run on four TiO2 spectra, one panel per weight vector."""
    S = {"S1": (0.9, 0.1, 1), "S2": (0.2, 0.8, 0), "S3": (0.7, 0.3, 1), "S4": (0.3, 0.6, 0)}
    states = [((0, 0, 0), "S2", "start: w = (0, 0, 0)", "S2 is wrong:\nsubtract (1, 0.2, 0.8)"),
              ((-1, -0.2, -0.8), "S3", "after S2: (−1, −0.2, −0.8)", "S3 is wrong:\nadd (1, 0.7, 0.3)"),
              ((0, 0.5, -0.5), None, "after S3: (0, 0.5, −0.5)", "all correct; S4 sits\nat z = −0.15")]
    fig, axs = plt.subplots(1, 3, figsize=(7.2, 2.95), gridspec_kw=dict(wspace=0.14))
    g = np.linspace(0, 1, 201)
    G1, G2 = np.meshgrid(g, g)
    for k, (ax, (w, bad, title, note)) in enumerate(zip(axs, states)):
        Z = w[0] + w[1] * G1 + w[2] * G2
        ax.contourf(G1, G2, (Z >= 0).astype(float), levels=[-0.5, 0.5, 1.5], colors=[style.TINT[style.BLUE], style.TINT[style.ORANGE]], zorder=0)
        if w[1] or w[2]:
            ax.contour(G1, G2, Z, levels=[0], colors=[style.INK2], linewidths=1.6)
        for name, (x1, x2, y) in S.items():
            ax.plot(x1, x2, "o", ms=10, color=style.ORANGE if y else style.BLUE, mec="white", mew=1.5, zorder=4)
            dx = 0.07 if name != "S1" else -0.07
            ax.text(x1 + dx, x2 + 0.075, name, fontsize=8.5, color=style.INK, ha="left" if dx > 0 else "right", zorder=5)
            if name == bad:
                ax.add_patch(Circle((x1, x2), 0.075, fill=False, ec=style.PINK, lw=2, zorder=5))
        if k == 2:
            p = np.array([0.5, 0.5]); u = np.array([0.5, -0.5]) / np.hypot(0.5, 0.5) * 0.22
            ax.add_patch(FancyArrowPatch(p, p + u, arrowstyle="-|>", mutation_scale=11, color=style.TEAL, lw=1.8, zorder=3))
        ax.text(0.03 if k != 2 else 0.97, 0.03 if k != 2 else 0.97, note, fontsize=8.5, color=style.PINK if bad else style.TEAL, va="bottom" if k != 2 else "top", ha="left" if k != 2 else "right",
                bbox=dict(fc="white", ec="none", alpha=0.8, pad=1.5))
        ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.set_aspect("equal")
        ax.set_xticks([0, 0.5, 1], ["0", "0.5", "1"]); ax.set_yticks([0, 0.5, 1], ["0", "0.5", "1"])
        ax.set_title(title, fontsize=9.5)
        ax.set_xlabel("$x_1$ (144 cm$^{-1}$ band)", fontsize=9)
        if k == 0:
            ax.set_ylabel("$x_2$ (447 cm$^{-1}$ band)", fontsize=9)
        else:
            ax.set_yticklabels([])
    style.save(fig, SLUG, "perceptron-steps")


def training_curves():
    """The experiment of the chapter's Python cell, run for 1000 steps and recorded at every step."""
    rng = np.random.default_rng(0)
    x = np.concatenate([rng.normal(1.5, 0.7, 50), rng.normal(-1.5, 0.7, 50)])
    y = np.concatenate([np.ones(50), np.zeros(50)])
    n = 1000
    rec = {}
    for loss in ["cross-entropy", "squared"]:
        w, b = -4.0, 0.0
        ws, acc = [w], [np.mean((sig(w * x + b) > 0.5) == y)]
        for step in range(1, n + 1):
            p = sig(w * x + b)
            e = p - y if loss == "cross-entropy" else (p - y) * p * (1 - p)
            w, b = w - 0.5 * np.mean(e * x), b - 0.5 * np.mean(e)
            ws.append(w); acc.append(np.mean((sig(w * x + b) > 0.5) == y))
        first = next(i for i, a_ in enumerate(acc) if a_ >= 0.95)
        rec[loss] = (np.array(ws), 100 * np.array(acc), first)
    steps = np.arange(n + 1)
    fig, (a, b) = plt.subplots(1, 2, figsize=(7.2, 3.0), gridspec_kw=dict(wspace=0.3))
    for loss, col in [("cross-entropy", style.BLUE), ("squared", style.ORANGE)]:
        ws, acc, first = rec[loss]
        a.plot(steps[1:], ws[1:], color=col)
        b.plot(steps[1:], acc[1:], color=col)
        b.plot([first], [acc[first]], "o", ms=5, color=col, zorder=5)
        b.annotate(f"95% at step {first}", (first, acc[first]), xytext=(first * (0.35 if loss == "squared" else 4), 70 if loss == "squared" else 45),
                   fontsize=8.5, color=col, ha="center", arrowprops=dict(arrowstyle="-", color=col, lw=0.8, shrinkB=4))
    a.axhline(0, color=style.LINE, lw=0.8, zorder=0)
    a.text(1.3, 1.6, "cross-entropy", color=style.BLUE, fontsize=9)
    a.text(1.3, -3.4, "squared error: stuck on\nthe plateau near $w = -4$", color=style.ORANGE, fontsize=9)
    for ax in (a, b):
        ax.set_xscale("log"); ax.set_xlim(1, n); ax.set_xlabel("gradient-descent step")
    a.set_ylabel("weight $w$"); a.set_title("the weight")
    b.set_ylabel("correctly classified (%)"); b.set_ylim(-3, 103); b.set_title("accuracy")
    style.save(fig, SLUG, "training-curves")
    return rec


def cover():
    def draw(ax):
        x = np.linspace(0.2, 3.8, 200)
        y = 0.3 + 0.36 * (x - 2.2) ** 2
        ax.fill_between(x, 0, y, color=style.TEAL, zorder=1)
        xs = np.array([0.45, 0.95, 1.38, 1.7, 1.93, 2.08, 2.17])
        ys = 0.3 + 0.36 * (xs - 2.2) ** 2
        for i, (a_, b_) in enumerate(zip(xs, ys)):
            ax.add_patch(Circle((a_, b_ + 0.12), 0.11 if i < len(xs) - 1 else 0.17,
                                color=style.ORANGE, alpha=0.35 + 0.65 * i / (len(xs) - 1), zorder=3))
        for (a0, b0), (a1, b1) in zip(zip(xs[:-1], ys[:-1]), zip(xs[1:], ys[1:])):
            ax.add_patch(FancyArrowPatch((a0, b0 + 0.38), (a1, b1 + 0.38), connectionstyle="arc3,rad=-0.4",
                                         arrowstyle="-", color=style.INK2, lw=2, zorder=2))
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    ce_vs_se(); perceptron_steps(); training_curves(); cover()
