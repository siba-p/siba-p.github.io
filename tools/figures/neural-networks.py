"""Figures for content/learn/neural-networks.md.  Run: python3 tools/figures/neural-networks.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
import style
plt = style.setup()
SLUG = "neural-networks"


# ---------------------------------------------------------------------------------------------------------------
def init_scale():
    """Ten tanh layers of 200 neurons, as in the chapter's Python cell: spread per layer and where activations sit."""
    rng = np.random.default_rng(0)
    d, depth = 200, 10
    x = rng.normal(size=(1000, d))
    runs = {}
    for name, std in [("big", 1.0), ("small", 0.01), ("glorot", 1 / np.sqrt(d))]:   # same order as the cell
        a = x; spread = [x.std()]; acts = {}
        for layer in range(1, depth + 1):
            a = np.tanh(a @ rng.normal(0, std, size=(d, d)))
            spread.append(a.std()); acts[layer] = a.ravel()
        runs[name] = (np.array(spread), acts)
    rng2 = np.random.default_rng(1)                       # the tanh gain 5/3 recommended by PyTorch
    a = x; spread = [x.std()]; acts = {}
    for layer in range(1, depth + 1):
        a = np.tanh(a @ rng2.normal(0, 5 / 3 / np.sqrt(d), size=(d, d)))
        spread.append(a.std()); acts[layer] = a.ravel()
    runs["gain"] = (np.array(spread), acts)
    for k, (s, acts) in runs.items():
        print(f"  {k:7s} spread layer 1 {s[1]:.3g}, layer 10 {s[10]:.3g}, saturated layer 5 {np.mean(np.abs(acts[5]) > 0.99):.0%}")

    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.85, width_ratios=[1.3, 1]))
    ax = axs[0]
    L = np.arange(depth + 1)
    spec = [("big", style.PINK, "std 1", 5.0), ("gain", style.TEAL, "× 5/3", 0.55),
            ("glorot", style.BLUE, "Glorot", 0.055), ("small", style.ORANGE, "std 0.01", 3.1e-9)]
    for k, c, lab, ylab in spec:
        s_ = runs[k][0]
        ax.semilogy(L, s_, "-o", color=c, ms=3.5, lw=1.8, clip_on=False)
        val = f"{s_[10]:.2f}" if s_[10] > 1e-3 else "3×10$^{-9}$"
        ax.annotate(f"{lab}   {val}", (10, s_[10]), xytext=(10.7, ylab), fontsize=8.5, color=c, va="center", ha="left",
                    linespacing=1.2, annotation_clip=False,
                    arrowprops=dict(arrowstyle="-", color=c, lw=0.7, shrinkA=0, shrinkB=4))
    ax.set_ylim(1e-9, 3); ax.set_xlim(-0.3, 10.2)
    ax.set_xticks([0, 2, 4, 6, 8, 10]); ax.set_yticks([1e-8, 1e-6, 1e-4, 1e-2, 1])
    ax.set_xlabel("layer"); ax.set_ylabel("spread of activations (std)")
    ax.set_title("Signal size through ten tanh layers")

    ax = axs[1]
    bins = np.linspace(-1, 1, 41)
    for k, c in [("big", style.PINK), ("glorot", style.BLUE)]:
        h, _ = np.histogram(runs[k][1][5], bins=bins, density=True)
        ax.stairs(h, bins, color=c, fill=True, alpha=0.18)
        ax.stairs(h, bins, color=c, lw=1.6)
    ax.set_xlim(-1.08, 1.08); ax.set_ylim(0, 3.2)
    ax.text(0.0, 2.95, "std 1: 85 % of neurons\nbeyond |a| = 0.99,\nwhere tanh is flat;\nspikes run off scale",
            fontsize=8.5, color=style.PINK, ha="center", va="top", linespacing=1.35)
    ax.annotate("", (0.95, 2.0), xytext=(0.55, 1.85),
                arrowprops=dict(arrowstyle="-|>", color=style.PINK, lw=0.9, mutation_scale=8))
    ax.annotate("", (-0.95, 2.0), xytext=(-0.55, 1.85),
                arrowprops=dict(arrowstyle="-|>", color=style.PINK, lw=0.9, mutation_scale=8))
    ax.text(0.0, 1.22, "Glorot: spread 0.32", color=style.BLUE, fontsize=8.5, ha="center", va="bottom")
    ax.set_xlabel("activation $a$ in layer 5"); ax.set_ylabel("probability density")
    ax.set_title("Where the neurons sit")
    style.save(fig, SLUG, "init-scale")


# ---------------------------------------------------------------------------------------------------------------
def box(ax, x, y, w, h, text, fc, ec, fs=9, weight="normal", color=None):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.02,rounding_size=0.12",
                                fc=fc, ec=ec, lw=1.2))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=color or style.INK, fontweight=weight,
            linespacing=1.35)


def arrow(ax, p, q, color=style.INK3, rad=0.0, lw=1.3, ls="-"):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=11, color=color, lw=lw, ls=ls,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=2, shrinkB=2))


def training_loop():
    """The recipe as one picture: split, inner loop over mini-batches, outer loop over epochs, test once."""
    fig, ax = plt.subplots(figsize=(7.2, 4.1))
    ax.set_xlim(0, 11.4); ax.set_ylim(0, 6.5); ax.axis("off")
    head = dict(fontsize=10, fontweight="semibold", color=style.INK, va="center")

    # 1: the data, split once
    ax.text(0.1, 6.2, "1  Split once", **head)
    x0, w, y0, h = 0.15, 2.4, 4.95, 0.55
    for a, b, c in [(0.0, 0.8, style.BLUE), (0.8, 0.9, style.ORANGE), (0.9, 1.0, style.PINK)]:
        ax.add_patch(plt.Rectangle((x0 + a * w, y0), (b - a) * w, h, fc=style.TINT[c], ec=c, lw=1.2))
    for i, (c, lab) in enumerate([(style.BLUE, "training  80 %"), (style.ORANGE, "validation  10 %"), (style.PINK, "test  10 %")]):
        yy = 4.55 - 0.36 * i
        ax.add_patch(plt.Rectangle((x0, yy - 0.1), 0.2, 0.2, fc=style.TINT[c], ec=c, lw=1.0))
        ax.text(x0 + 0.32, yy, lab, fontsize=8.5, color=c, va="center")
    ax.text(x0, 3.25, "Split by trajectory or\nstructure family if\nsamples are correlated.\nStandardise with\ntraining statistics.",
            fontsize=8.5, color=style.INK2, va="top", linespacing=1.45)

    # 2: the inner loop, one optimisation step per mini-batch
    ax.text(3.2, 6.2, "2  Every mini-batch", **head)
    cx, cy = 5.25, 3.45
    bw, bh = 1.6, 0.74
    P = {"top": (cx, cy + 1.5), "right": (cx + 1.6, cy), "bottom": (cx, cy - 1.5), "left": (cx - 1.6, cy)}
    labs = {"top": "mini-batch\nof 16–256", "right": "forward pass\n$\\hat y = f(x;\\theta)$",
            "bottom": "backward pass\n$\\partial L/\\partial\\theta$", "left": "update $\\theta$\nAdam, $\\eta\\approx 10^{-3}$"}
    for k, (px, py) in P.items():
        box(ax, px, py, bw, bh, labs[k], style.TINT[style.BLUE], style.BLUE, fs=8.5)
    arrow(ax, (P["top"][0] + bw / 2, P["top"][1]), (P["right"][0], P["right"][1] + bh / 2), style.BLUE, rad=-0.35)
    arrow(ax, (P["right"][0], P["right"][1] - bh / 2), (P["bottom"][0] + bw / 2, P["bottom"][1]), style.BLUE, rad=-0.35)
    arrow(ax, (P["bottom"][0] - bw / 2, P["bottom"][1]), (P["left"][0], P["left"][1] - bh / 2), style.BLUE, rad=-0.35)
    arrow(ax, (P["left"][0], P["left"][1] + bh / 2), (P["top"][0] - bw / 2, P["top"][1]), style.BLUE, rad=-0.35)
    ax.text(cx, cy, "loss $L$", ha="center", va="center", fontsize=9, color=style.INK2)

    # 3: the outer loop, once per epoch
    ax.text(7.85, 6.2, "3  Every epoch", **head)
    ex = 9.7; ew = 3.2
    ys = [4.95, 3.75, 2.55]
    labs = ["validation loss: keep\nthe best $\\theta$ seen so far", "schedule: cut $\\eta$ on a\nplateau, or follow a cosine",
            "stop when the patience\n(10–50 epochs) runs out"]
    for yy, lab in zip(ys, labs):
        box(ax, ex, yy, ew, 0.8, lab, style.TINT[style.ORANGE], style.ORANGE, fs=8.5)
    arrow(ax, (ex, ys[0] - 0.42), (ex, ys[1] + 0.42), style.ORANGE)
    arrow(ax, (ex, ys[1] - 0.42), (ex, ys[2] + 0.42), style.ORANGE)
    arrow(ax, (cx + 0.82, cy + 1.5), (ex - ew / 2, ys[0]), style.ORANGE, rad=-0.15)
    ax.text(7.1, 5.3, "end of epoch", fontsize=8, color=style.ORANGE, ha="center", va="center", linespacing=1.3)
    arrow(ax, (ex - ew / 2, ys[2]), (cx + 0.82, cy - 1.5), style.ORANGE, rad=-0.15, ls=(0, (3, 2)))
    ax.text(7.5, 1.7, "not yet: next epoch", fontsize=8, color=style.ORANGE, ha="center", va="center", linespacing=1.3)

    # 4: test once
    box(ax, ex, 0.95, ew, 0.72, "best $\\theta$  →  test set, once", style.TINT[style.PINK], style.PINK, fs=9, weight="semibold")
    arrow(ax, (ex, ys[2] - 0.42), (ex, 1.33), style.PINK)
    ax.text(0.15, 0.55, "Before all of this, overfit ten examples: if the training\nloss cannot reach almost zero, the bug is in the code.",
            fontsize=8.5, color=style.VIOLET, va="center", linespacing=1.4)
    style.save(fig, SLUG, "training-loop")


# ---------------------------------------------------------------------------------------------------------------
def early_stopping():
    """A real overfitting run: 24 noisy points, 40 tanh neurons, full-batch Adam; training vs validation loss."""
    rng = np.random.default_rng(0)
    f = lambda x: np.sin(3 * x)
    ntr, H, noise, steps, lr = 24, 40, 0.25, 15000, 3e-3
    xt = rng.uniform(-1, 1, (ntr, 1)); yt = f(xt) + rng.normal(0, noise, (ntr, 1))
    xv = rng.uniform(-1, 1, (200, 1)); yv = f(xv) + rng.normal(0, noise, (200, 1))
    P = [rng.normal(0, 2.0, (1, H)), rng.normal(0, 2.0, H) * 0.5, rng.normal(0, 1 / np.sqrt(H), (H, 1)), np.zeros(1)]
    m = [np.zeros_like(p) for p in P]; v = [np.zeros_like(p) for p in P]
    xg = np.linspace(-1, 1, 400)[:, None]
    net = lambda P, x: np.tanh(x @ P[0] + P[1]) @ P[2] + P[3]
    tr, va = np.empty(steps), np.empty(steps); best = (np.inf, 0, None)
    for t in range(1, steps + 1):
        W1, b1, W2, b2 = P
        a = np.tanh(xt @ W1 + b1); yh = a @ W2 + b2
        tr[t - 1] = np.mean((yh - yt) ** 2); va[t - 1] = np.mean((net(P, xv) - yv) ** 2)
        if va[t - 1] < best[0]: best = (va[t - 1], t, net(P, xg))
        dd = 2 * (yh - yt) / ntr
        dz = (dd @ W2.T) * (1 - a ** 2)
        G = [xt.T @ dz, dz.sum(0), a.T @ dd, dd.sum(0)]
        for i in range(4):
            m[i] = 0.9 * m[i] + 0.1 * G[i]; v[i] = 0.999 * v[i] + 0.001 * G[i] ** 2
            P[i] -= lr * (m[i] / (1 - 0.9 ** t)) / (np.sqrt(v[i] / (1 - 0.999 ** t)) + 1e-8)
    yfin = net(P, xg)
    print(f"  train loss {tr[0]:.3f} -> {tr[-1]:.4f}; validation best {best[0]:.4f} at step {best[1]}, "
          f"final {va[-1]:.3f}; noise variance {noise**2:.4f}; train at best {tr[best[1]-1]:.4f}")

    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.32, width_ratios=[1.15, 1]))
    ax = axs[0]
    s = np.arange(1, steps + 1)
    ax.loglog(s, tr, color=style.BLUE, lw=1.6)
    ax.loglog(s, va, color=style.ORANGE, lw=1.6)
    ax.axhline(noise ** 2, color=style.INK3, lw=0.8, ls=(0, (3, 3)))
    ax.text(1.2, noise ** 2 * 0.82, "noise variance 0.0625", fontsize=8, color=style.INK3, va="top")
    ax.axvline(best[1], color=style.TEAL, lw=1.0, ls=(0, (4, 2)))
    ax.plot(best[1], best[0], "o", color=style.TEAL, ms=6, zorder=5)
    ax.annotate(f"best validation\nstep {best[1]}: {best[0]:.3f}", (best[1], best[0]), xytext=(18, 0.32),
                fontsize=8.5, color=style.TEAL, ha="left",
                arrowprops=dict(arrowstyle="-", color=style.TEAL, lw=0.8, shrinkB=4))
    ax.text(2500, va[2499] * 2.0, "validation", color=style.ORANGE, fontsize=9, ha="center", va="bottom")
    ax.text(3000, tr[2999] * 0.6, "training", color=style.BLUE, fontsize=9, ha="center", va="top")
    ax.set_xlim(1, steps); ax.set_ylim(3e-3, 5)
    ax.set_xlabel("optimisation step (full batch)"); ax.set_ylabel("mean squared error")
    ax.set_title("The two losses part company")

    ax = axs[1]
    top = max(1.8, float(yfin.max()) + 0.1); bot = min(-1.75, float(yfin.min()) - 0.1)
    ax.plot(xg, f(xg), color=style.INK3, lw=1.2, ls=(0, (4, 3)))
    ax.plot(xg, best[2], color=style.TEAL, lw=2.0)
    ax.plot(xg, yfin, color=style.PINK, lw=1.4)
    ax.plot(xt, yt, "o", ms=5, color=style.BLUE, zorder=5)
    ax.text(-0.98, top - 0.2, f"step {best[1]} (kept)", color=style.TEAL, fontsize=8.5)
    ax.text(-0.98, top - 0.45, f"step {steps} (last)", color=style.PINK, fontsize=8.5)
    ax.text(-0.98, top - 0.7, "true $\\sin 3x$", color=style.INK3, fontsize=8.5)
    ax.set_ylim(bot, top); ax.set_xlim(-1.05, 1.05)
    ax.set_xlabel("input $x$"); ax.set_ylabel("output $y$")
    ax.set_title("24 noisy training points")
    style.save(fig, SLUG, "early-stopping")


# ---------------------------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        rng = np.random.default_rng(3)
        layers = [3, 5, 5, 1]
        xs = [0.75, 1.65, 2.55, 3.35]
        nodes = []
        for x, n in zip(xs, layers):
            ys = np.linspace(1.5 - 0.25 * (n - 1), 1.5 + 0.25 * (n - 1), n) - 0.15
            nodes.append([(x, y) for y in ys])
        for l in range(len(nodes) - 1):
            for p in nodes[l]:
                for q in nodes[l + 1]:
                    w = rng.normal()
                    ax.plot([p[0], q[0]], [p[1], q[1]], color=style.TEAL if w > 0 else style.VIOLET,
                            lw=0.6 + 2.2 * min(abs(w), 1.6), alpha=0.75, solid_capstyle="round", zorder=1)
        cols = [style.BLUE, style.BLUE, style.BLUE, style.ORANGE]
        for l, layer in enumerate(nodes):
            for (x, y) in layer:
                ax.add_patch(Circle((x, y), 0.15, fc="white", ec=cols[l], lw=3.2, zorder=3))
                ax.add_patch(Circle((x, y), 0.07, fc=cols[l], ec="none", zorder=4))
        # the error signal flowing back
        ax.add_patch(FancyArrowPatch((3.45, 2.15), (0.6, 2.55), arrowstyle="-|>", mutation_scale=22, lw=3.2,
                                     color=style.PINK, connectionstyle="arc3,rad=0.28", zorder=2))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    init_scale(); training_loop(); early_stopping(); cover()
