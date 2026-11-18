"""Figures for content/learn/transformers.md.  Run: python3 tools/figures/transformers.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch
plt = style.setup()
SLUG = "transformers"


# ---------------------------------------------------------------------------------------------------------------
# 1. The pre-LN transformer block as a residual stream with two side branches
# ---------------------------------------------------------------------------------------------------------------
def block():
    fig, ax = plt.subplots(figsize=(7.2, 2.9))
    ax.set_xlim(0, 14.4); ax.set_ylim(0, 5.8); ax.set_aspect("equal"); ax.axis("off")
    y0 = 1.3                                          # the residual stream
    ax.add_patch(FancyArrowPatch((0.4, y0), (14.1, y0), arrowstyle="-|>", mutation_scale=16, color=style.INK2, lw=2.4))
    ax.text(0.4, y0 - 0.45, "X", fontsize=11, color=style.INK, va="top", weight="semibold")
    ax.text(14.1, y0 - 0.45, "X″", fontsize=11, color=style.INK, va="top", ha="right", weight="semibold")
    ax.text(7.25, 0.25, "residual stream: each token keeps a d-dimensional vector", fontsize=8.5, color=style.INK2,
            ha="center")

    def box(x, y, w, h, text, col, fs=9.5):
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.18", fc=style.TINT[col],
                                    ec=col, lw=1.6, zorder=3))
        ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs, color=style.INK, zorder=4,
                weight="semibold")

    def branch(xs, xe, col, title, sub, params, plus_x):
        yb = 3.3
        ax.plot([xs, xs], [y0, yb], color=style.INK3, lw=1.6, zorder=1)
        box(xs - 0.45, yb - 0.38, 0.9, 0.76, "LN", style.GOLD, fs=9)
        ax.add_patch(FancyArrowPatch((xs + 0.45, yb), (xs + 1.0, yb), arrowstyle="-|>", mutation_scale=11,
                                     color=style.INK3, lw=1.4))
        box(xs + 1.0, yb - 0.6, xe - xs - 1.0, 1.2, title, col)
        ax.text(xs + 0.5 + (xe - xs) / 2, yb + 0.95, sub, ha="center", fontsize=8.5, color=style.INK2)
        ax.text(xs + 0.5 + (xe - xs) / 2, yb - 0.95, params, ha="center", va="top", fontsize=8.5, color=col,
                weight="semibold")
        ax.plot([xe, plus_x], [yb, yb], color=style.INK3, lw=1.6, zorder=1)
        ax.add_patch(FancyArrowPatch((plus_x, yb), (plus_x, y0 + 0.3), arrowstyle="-|>", mutation_scale=11,
                                     color=style.INK3, lw=1.4))
        ax.add_patch(Circle((plus_x, y0), 0.3, fc="white", ec=style.INK2, lw=1.6, zorder=5))
        ax.text(plus_x, y0, "+", ha="center", va="center", fontsize=12, color=style.INK, zorder=6)

    branch(1.4, 5.2, style.BLUE, "Multi-head\nattention", "mixes information between tokens",
           "4d² parameters", 6.0)
    branch(7.6, 11.6, style.ORANGE, "MLP\nd → 4d → d", "acts on each token separately", "8d² parameters", 12.6)
    style.save(fig, SLUG, "block")


# ---------------------------------------------------------------------------------------------------------------
# 2. Why divide by sqrt(d_k): score spread and the effective number of keys attended
# ---------------------------------------------------------------------------------------------------------------
def softmax(s):
    w = np.exp(s - s.max(axis=-1, keepdims=True))
    return w / w.sum(axis=-1, keepdims=True)


def scaling(n_keys=16, trials=4000):
    rng = np.random.default_rng(1)
    dims = np.array([4, 8, 16, 32, 64, 128, 256, 512])
    eff_s, eff_u, top_s, top_u = [], [], [], []
    for d in dims:
        q = rng.normal(size=(trials, 1, d)); k = rng.normal(size=(trials, n_keys, d))
        s = (q * k).sum(-1)
        for scale, eff, top in ((np.sqrt(d), eff_s, top_s), (1.0, eff_u, top_u)):
            w = softmax(s / scale)
            H = -(w * np.log(np.clip(w, 1e-300, None))).sum(-1)
            eff.append(np.exp(H).mean()); top.append(w.max(-1).mean())
    q = rng.normal(size=(trials, 64)); k = rng.normal(size=(trials, 64))
    s64 = (q * k).sum(-1)
    print("d=64 score std unscaled %.2f, scaled %.2f" % (s64.std(), (s64 / 8).std()))
    for d, a, b, c, e in zip(dims, eff_s, eff_u, top_s, top_u):
        print(f"d={d:4d}  effective keys scaled {a:5.2f} unscaled {b:5.2f}   top weight scaled {c:.2f} unscaled {e:.2f}")

    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.2), gridspec_kw=dict(wspace=0.38))
    bins = np.linspace(-30, 30, 121)
    a1.hist(s64, bins=bins, histtype="stepfilled", color=style.TINT[style.ORANGE], ec=style.ORANGE, lw=1.4)
    a1.hist(s64 / 8, bins=bins, histtype="stepfilled", color=style.TINT[style.BLUE], ec=style.BLUE, lw=1.4, alpha=0.9)
    a1.set_xlim(-30, 30); a1.set_yticks([])
    a1.spines["left"].set_visible(False)
    a1.set_xlabel("score  q · k   (d = 64)")
    a1.set_title("a  Scores before the softmax")
    a1.text(3.5, a1.get_ylim()[1] * 0.7, "divided by √64:\nstd 1", color=style.BLUE, fontsize=8.5)
    a1.text(9.5, a1.get_ylim()[1] * 0.2, "raw: std 8", color=style.ORANGE, fontsize=8.5)

    a2.plot(dims, eff_s, "o-", color=style.BLUE, ms=4.5)
    a2.plot(dims, eff_u, "o-", color=style.ORANGE, ms=4.5)
    a2.set_xscale("log", base=2); a2.set_xticks(dims); a2.set_xticklabels([str(d) for d in dims])
    a2.set_ylim(0, 16.5); a2.set_yticks([1, 4, 8, 12, 16])
    a2.axhline(16, color=style.LINE, lw=1, zorder=0)
    a2.set_xlabel("key dimension, d"); a2.set_ylabel("effective number of keys\nattended (of 16)")
    a2.set_title("b  Attention spread")
    a2.text(16, eff_s[2] + 1.2, "scaled by 1/√d", color=style.BLUE, fontsize=8.5)
    a2.text(64, eff_u[4] + 1.6, "unscaled", color=style.ORANGE, fontsize=8.5)
    style.save(fig, SLUG, "scaling")
    return dims, eff_s, eff_u, top_s, top_u


# ---------------------------------------------------------------------------------------------------------------
# 3. Where the compute goes: weights (linear in n) against attention scores (quadratic in n)
# ---------------------------------------------------------------------------------------------------------------
def cost():
    n = np.logspace(1, 5.3, 300)
    d = 768
    w_flops = 24 * n * d ** 2                      # 12 d^2 weights, 2 FLOPs each, per token
    a_flops = 4 * n ** 2 * d                       # Q K^T and the weighted sum of V: n^2 d multiply-adds each
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.2), gridspec_kw=dict(wspace=0.36))
    a1.loglog(n, w_flops, color=style.VIOLET)
    a1.loglog(n, a_flops, color=style.PINK)
    nx = 6 * d
    a1.plot([nx], [24 * nx * d ** 2], "o", color=style.INK, ms=5)
    a1.annotate(f"equal at n = 6d = {nx:,}", (nx, 24 * nx * d ** 2), xytext=(25, 3e14), fontsize=8.5,
                color=style.INK, arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    a1.text(2e1, 1.0e12, "weights  24 n d²", color=style.VIOLET, fontsize=8.5)
    a1.text(3e2, 1.2e9, "attention scores  4 n² d", color=style.PINK, fontsize=8.5)
    a1.set_xlabel("sequence length n (tokens)"); a1.set_ylabel("FLOPs per layer")
    a1.set_title("a  One layer, width d = 768")
    a1.set_xlim(10, 2e5); a1.set_ylim(1e8, 1e17)

    for k, (dd, col) in enumerate(((256, style.TEAL), (768, style.BLUE), (2048, style.GOLD))):
        f = n / (n + 6 * dd)
        a2.semilogx(n, 100 * f, color=col)
        a2.text(14, 84 - 9 * k, f"width d = {dd:,}", color=col, fontsize=8.5, ha="left", va="center")
    a2.axhline(50, color=style.LINE, lw=1, zorder=0)
    for L, lab in ((512, "BERT\nlimit"), (1000, "1,000-residue\nprotein")):
        a2.axvline(L, color=style.INK3, lw=0.8, ls=(0, (3, 3)), zorder=0)
    a2.text(480, 97, "512", fontsize=8.5, color=style.INK2, ha="right", va="top")
    a2.text(1.08e3, 97, "1,000", fontsize=8.5, color=style.INK2, ha="left", va="top")
    a2.set_ylim(0, 100); a2.set_xlim(10, 2e5)
    a2.set_xlabel("sequence length n (tokens)"); a2.set_ylabel("share of FLOPs in attention (%)")
    a2.set_title("b  Attention's share")
    style.save(fig, SLUG, "cost")
    for L in (512, 1000, 4608, 32768):
        print(f"n={L}: attention share at d=768 = {100 * L / (L + 6 * 768):.0f}%")


# ---------------------------------------------------------------------------------------------------------------
# 4. A graph network with a cut-off against attention over a complete graph
# ---------------------------------------------------------------------------------------------------------------
def graphs():
    rng = np.random.default_rng(4)
    pts = []
    while len(pts) < 14:                                       # well-spaced random atoms in a box
        p = rng.uniform([0.3, 0.3], [4.7, 3.2])
        if all(np.linalg.norm(p - q) > 0.75 for q in pts):
            pts.append(p)
    X = np.array(pts)
    i0 = int(np.argmin(np.linalg.norm(X - [2.5, 1.75], axis=1)))
    D = np.linalg.norm(X[:, None] - X[None], axis=2)
    rc = 1.25
    # attention weights of atom i0 in a randomly initialised layer acting on random features
    F = rng.normal(size=(len(X), 8)); Wq, Wk = rng.normal(size=(2, 8, 8)) / np.sqrt(8)
    s = (F[i0] @ Wq) @ (F @ Wk).T / np.sqrt(8)
    w = softmax(1.6 * s)
    print("attention weights of the query atom: max %.2f, min %.3f" % (w.max(), w.min()))
    fig, axes = plt.subplots(1, 2, figsize=(7.2, 2.9), gridspec_kw=dict(wspace=0.08))
    for ax, title in zip(axes, ("a  Graph network: edges inside a cut-off", "b  Self-attention: every pair, weighted")):
        ax.set_xlim(0, 5); ax.set_ylim(0, 3.55); ax.set_aspect("equal"); ax.axis("off")
        ax.set_title(title, fontsize=10)
    a1, a2 = axes
    for i in range(len(X)):
        for j in range(i + 1, len(X)):
            if D[i, j] < rc:
                a1.plot(*X[[i, j]].T, color=style.INK3, lw=1.4, zorder=1)
    a1.add_patch(Circle(X[i0], rc, fc=style.TINT[style.TEAL], ec=style.TEAL, lw=1.2, ls=(0, (4, 3)), zorder=0))
    for j in range(len(X)):
        if D[i0, j] < rc and j != i0:
            a1.plot(*X[[i0, j]].T, color=style.TEAL, lw=2.6, zorder=2)
    for j in range(len(X)):
        if j != i0:
            a2.plot(*X[[i0, j]].T, color=style.PINK, lw=0.6 + 9 * w[j], alpha=0.85, zorder=1, solid_capstyle="round")
    for ax, col in ((a1, style.TEAL), (a2, style.PINK)):
        for k, p in enumerate(X):
            ax.add_patch(Circle(p, 0.13, color=col if k == i0 else style.BLUE, zorder=3, ec="white", lw=1.2))
    a1.text(X[i0][0], X[i0][1] - rc - 0.12, "cut-off", color=style.TEAL, fontsize=8.5, ha="center", va="top")
    a2.text(2.5, 0.0, "line width = attention weight", color=style.PINK, fontsize=8.5, ha="center", va="bottom")
    style.save(fig, SLUG, "graphs")


# ---------------------------------------------------------------------------------------------------------------
# Cover: one query token sending attention arcs of different strength to a row of tokens
# ---------------------------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        xs = np.linspace(0.45, 3.55, 7)
        yk, yq = 0.75, 2.25
        q = 2
        w = np.array([0.05, 0.12, 0.08, 0.40, 0.06, 0.24, 0.05])
        cols = [style.BLUE, style.TEAL, style.GOLD, style.PINK, style.BLUE, style.VIOLET, style.TEAL]
        for x, wk, col in zip(xs, w, cols):
            ax.add_patch(FancyArrowPatch((xs[q], yq - 0.28), (x, yk + 0.28), arrowstyle="-", color=style.ORANGE,
                                         lw=2 + 26 * wk, alpha=0.35 + 1.4 * wk if wk < 0.4 else 0.95,
                                         connectionstyle="arc3,rad=0.0", zorder=1, capstyle="round"))
        for x, col in zip(xs, cols):
            ax.add_patch(FancyBboxPatch((x - 0.18, yk - 0.24), 0.36, 0.48, boxstyle="round,pad=0,rounding_size=0.09",
                                        fc=col, ec="white", lw=2.2, zorder=3))
            ax.add_patch(FancyBboxPatch((x - 0.18, yq - 0.24), 0.36, 0.48, boxstyle="round,pad=0,rounding_size=0.09",
                                        fc=col, ec="white", lw=2.2, zorder=3, alpha=1.0 if x == xs[q] else 0.25))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    block()
    scaling()
    cost()
    graphs()
    cover()
