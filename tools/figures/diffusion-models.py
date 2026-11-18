"""Figures for content/learn/diffusion-models.md.  Run: python3 tools/figures/diffusion-models.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
import style
plt = style.setup()
SLUG = "diffusion-models"

T = 200                                                    # the cosine schedule of the chapter's code


def cosine_abar(T=T):
    s = np.linspace(0, 1, T + 1)
    ab = np.cos((s + 0.008) / 1.008 * np.pi / 2) ** 2
    return np.clip(ab / ab[0], 1e-4, None)


def linear_abar(T=1000):
    return np.concatenate([[1.0], np.cumprod(1 - np.linspace(1e-4, 0.02, T))])


# hexagonal motif of the lab: 13 sites, spacing 0.95, spread 0.07
SITES = 0.95 * np.array([(0.0, 0.0)] + [(np.cos(k * np.pi / 3), np.sin(k * np.pi / 3)) for k in range(6)]
                        + [(1.732 * np.cos(k * np.pi / 3 + np.pi / 6), 1.732 * np.sin(k * np.pi / 3 + np.pi / 6))
                           for k in range(6)])


# ---------------------------------------------------------------- 1. training and sampling, as a diagram
def cloud(ax, cx, cy, abar, rng, scale=0.23, n=260, color=style.BLUE):
    x0 = SITES[rng.integers(len(SITES), size=n)] + 0.07 * rng.normal(size=(n, 2))
    xt = np.sqrt(abar) * x0 + np.sqrt(1 - abar) * rng.normal(size=(n, 2))
    ax.scatter(cx + scale * xt[:, 0], cy + scale * xt[:, 1], s=2.2, color=color, lw=0, alpha=0.8, rasterized=True)


def frame(ax, x, y, w, h, color):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0,rounding_size=0.1",
                                fc="white", ec=color, lw=1.2))


def arrow(ax, p, q, color=style.INK3, rad=0.0, ls="-"):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=12, color=color, lw=1.5, linestyle=ls,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=3, shrinkB=3))


def pipeline():
    rng = np.random.default_rng(1)
    fig, ax = plt.subplots(figsize=(7.2, 4.7))
    ax.set_xlim(0, 10.4); ax.set_ylim(0, 6.6); ax.axis("off"); ax.set_aspect("equal")
    # training row
    ax.text(0.1, 6.35, "Training: one regression step", fontsize=11, weight="semibold")
    yT = 4.85
    frame(ax, 1.0, yT, 1.6, 1.6, style.BLUE); cloud(ax, 1.0, yT, 1.0, rng)
    ax.text(1.0, yT - 1.05, r"data $\mathbf{x}_0$", ha="center", fontsize=9, color=style.INK2)
    frame(ax, 4.2, yT, 1.6, 1.6, style.VIOLET); cloud(ax, 4.2, yT, 0.75, rng, color=style.VIOLET)
    ax.text(4.2, yT - 1.05, r"noisy $\mathbf{x}_t$", ha="center", fontsize=9, color=style.INK2)
    arrow(ax, (1.85, yT), (3.35, yT))
    ax.text(2.6, yT + 0.25, "pick $t$, draw $\\boldsymbol{\\varepsilon}$", ha="center", fontsize=8.5, color=style.INK2)
    ax.text(2.6, yT - 0.35, "closed form", ha="center", fontsize=8.5, color=style.INK3)
    ax.add_patch(FancyBboxPatch((5.75, yT - 0.45), 1.9, 0.9, boxstyle="round,pad=0,rounding_size=0.1",
                                fc=style.TINT[style.ORANGE], ec=style.ORANGE, lw=1.2))
    ax.text(6.7, yT + 0.08, "network", ha="center", va="center", fontsize=10, weight="semibold")
    ax.text(6.7, yT - 0.22, r"$\boldsymbol{\varepsilon}_\theta(\mathbf{x}_t, t)$", ha="center", va="center",
            fontsize=9, color=style.INK2)
    arrow(ax, (5.05, yT), (5.7, yT))
    arrow(ax, (7.7, yT), (8.3, yT))
    ax.text(9.35, yT + 0.2, r"loss $\|\boldsymbol{\varepsilon} - \boldsymbol{\varepsilon}_\theta\|^2$",
            ha="center", va="center", fontsize=9.5)
    ax.text(9.35, yT - 0.25, "mean squared error", ha="center", va="center", fontsize=8.5, color=style.INK3)
    arrow(ax, (2.6, yT + 0.6), (9.2, yT + 0.5), color=style.INK3, rad=-0.15, ls=(0, (3, 2)))
    ax.text(5.9, 6.2, "the drawn noise is the target", fontsize=8.5, color=style.INK3, ha="center")
    # sampling row
    ax.text(0.1, 3.0, "Sampling: many small denoising steps", fontsize=11, weight="semibold")
    yS = 1.55
    abars = [0.0001, 0.6, 0.95, 1.0]
    xs = [1.0, 3.75, 6.5, 9.25]
    labels = [r"$\mathbf{x}_T \sim \mathcal{N}(\mathbf{0}, \mathbf{I})$", r"$\mathbf{x}_t$", r"$\mathbf{x}_s,\ s < t$",
              r"sample $\mathbf{x}_0$"]
    for x, ab, lab in zip(xs, abars, labels):
        frame(ax, x, yS, 1.6, 1.6, style.TEAL); cloud(ax, x, yS, ab, rng, color=style.TEAL)
        ax.text(x, yS - 1.05, lab, ha="center", fontsize=9, color=style.INK2)
    for a, b in zip(xs[:-1], xs[1:]):
        arrow(ax, (a + 0.85, yS), (b - 0.85, yS), color=style.ORANGE)
        ax.text((a + b) / 2, yS + 0.2, "×  many", ha="center", fontsize=8.5, color=style.ORANGE)
        ax.text((a + b) / 2, yS - 0.3, "steps", ha="center", fontsize=8.5, color=style.ORANGE)
    style.save(fig, SLUG, "pipeline")


# ---------------------------------------------------------------- 2. the noise schedule
def schedule():
    abc, abl = cosine_abar(), linear_abar()
    tc, tl = np.linspace(0, 1, T + 1), np.linspace(0, 1, 1001)
    fig, (a1, a2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw={"wspace": 0.38})
    a1.plot(tc, abc, color=style.BLUE); a1.plot(tl, abl, color=style.ORANGE)
    a1.axhline(0.819, color=style.INK3, lw=0.8, ls=(0, (4, 3)))
    a1.text(0.98, 0.84, "neighbouring sites merge", fontsize=8.5, color=style.INK2, ha="right")
    a1.text(0.53, 0.55, "cosine", color=style.BLUE, fontsize=9)
    a1.text(0.27, 0.25, "linear β", color=style.ORANGE, fontsize=9)
    a1.set_xlim(0, 1); a1.set_ylim(0, 1.05)
    a1.set_xlabel("fraction of the schedule $t/T$"); a1.set_ylabel(r"signal fraction $\bar\alpha_t$")
    a1.set_title("How fast the data are destroyed")
    snr = lambda ab: np.log10(ab / (1 - ab))
    a2.plot(tc[1:], snr(abc[1:]), color=style.BLUE); a2.plot(tl[1:], snr(abl[1:]), color=style.ORANGE)
    a2.axhline(0, color=style.INK3, lw=0.8, ls=(0, (4, 3)))
    a2.text(0.98, 0.15, "signal = noise", fontsize=8.5, color=style.INK2, va="bottom", ha="right")
    a2.set_xlim(0, 1); a2.set_ylim(-4.6, 4.6)
    a2.set_xlabel("fraction of the schedule $t/T$"); a2.set_ylabel(r"$\log_{10}$ signal-to-noise ratio")
    a2.set_title("Signal-to-noise ratio")
    a2.text(0.62, 0.9, "cosine", color=style.BLUE, fontsize=9)
    a2.text(0.3, -2.6, "linear β", color=style.ORANGE, fontsize=9)
    print(f"schedule: cosine abar(T/2) = {abc[100]:.3f}, linear abar(T/2) = {abl[500]:.3f}; "
          f"cosine crosses 0.819 at t/T = {np.argmax(abc < 0.819) / T:.3f}, linear at {np.argmax(abl < 0.819) / 1000:.3f}")
    style.save(fig, SLUG, "schedule")


# ---------------------------------------------------------------- 3. stochastic and deterministic samplers in 1D
MU = np.array([-1.5, -0.5, 0.5, 1.5]); W = np.array([0.2, 0.3, 0.3, 0.2]); S0 = 0.08


def score(x, ab):
    var = ab * S0 ** 2 + 1 - ab
    d = np.sqrt(ab) * MU[None, :] - x[:, None]
    logw = np.log(W)[None, :] - d ** 2 / (2 * var)
    w = np.exp(logw - logw.max(1, keepdims=True)); w /= w.sum(1, keepdims=True)
    return (w * d).sum(1) / var


def density(x, ab):
    var = ab * S0 ** 2 + 1 - ab
    return (W[None, :] * np.exp(-(x[:, None] - np.sqrt(ab) * MU[None, :]) ** 2 / (2 * var))).sum(1) / np.sqrt(2 * np.pi * var)


def trajectories():
    ab = cosine_abar()
    rng = np.random.default_rng(3)
    n = 24
    x_d = rng.normal(size=n); x_o = x_d.copy()
    path_d, path_o = [x_d.copy()], [x_o.copy()]
    for t in range(T, 0, -1):
        a_t = ab[t] / ab[t - 1]
        eps = -np.sqrt(1 - ab[t]) * score(x_d, ab[t])               # exact noise prediction
        mean = (x_d - (1 - a_t) / np.sqrt(1 - ab[t]) * eps) / np.sqrt(a_t)
        sd = np.sqrt((1 - a_t) * (1 - ab[t - 1]) / (1 - ab[t]))
        x_d = mean + (sd * rng.normal(size=n) if t > 1 else 0)
        eps_o = -np.sqrt(1 - ab[t]) * score(x_o, ab[t])            # DDIM, deterministic
        x0 = (x_o - np.sqrt(1 - ab[t]) * eps_o) / np.sqrt(ab[t])
        x_o = np.sqrt(ab[t - 1]) * x0 + np.sqrt(1 - ab[t - 1]) * eps_o
        path_d.append(x_d.copy()); path_o.append(x_o.copy())
    path_d, path_o = np.array(path_d), np.array(path_o)
    steps = np.arange(T + 1)                                         # 0 = pure noise, T = data
    xg = np.linspace(-3, 3, 241)
    dens = np.array([density(xg, ab[T - k]) for k in steps]).T
    fig, axes = plt.subplots(1, 2, figsize=style.WIDE, sharey=True, gridspec_kw={"wspace": 0.08})
    from matplotlib.colors import LinearSegmentedColormap
    cmap = LinearSegmentedColormap.from_list("tint", ["white", style.TINT[style.BLUE], "#b9c6fb"])
    for ax, P, title, col in zip(axes, (path_d, path_o), ("Stochastic sampler (DDPM)", "Deterministic sampler (DDIM)"),
                                 (style.ORANGE, style.VIOLET)):
        ax.imshow(np.sqrt(dens), origin="lower", aspect="auto", extent=(0, T, -3, 3), cmap=cmap, interpolation="bilinear")
        for j in range(n):
            ax.plot(steps, P[:, j], color=col, lw=0.9, alpha=0.85)
        ax.set_title(title); ax.set_xlabel("denoising step (noise → data)")
        ax.set_xlim(0, T); ax.set_xticks([0, 50, 100, 150, 200])
    axes[0].set_ylabel("coordinate $x$")
    axes[1].yaxis.set_tick_params(labelleft=False)
    for m in MU:
        axes[1].text(T + 4, m, "site", fontsize=8.5, color=style.INK2, va="center")
    fin_d, fin_o = path_d[-1], path_o[-1]
    near = lambda f: np.mean(np.min(np.abs(f[:, None] - MU[None, :]), 1) < 0.25)
    print(f"trajectories: fraction within 0.25 of a site, DDPM {near(fin_d):.2f}, DDIM {near(fin_o):.2f}")
    style.save(fig, SLUG, "trajectories")


# ---------------------------------------------------------------- cover: a crystal dissolving into noise
def cover():
    rng = np.random.default_rng(7)
    def draw(ax):
        nx, ny = 11, 7
        for i in range(nx):
            for j in range(ny):
                x, y = 0.3 + i * 0.34, 0.48 + j * 0.34
                amp = max(0.0, (x - 1.3) / 2.4) ** 1.4 * 0.55
                dx, dy = amp * rng.normal(), amp * rng.normal()
                c = style.BLUE if (i + j) % 2 == 0 else style.ORANGE
                r = 0.11 * (1 - 0.45 * min(1, amp / 0.5))
                ax.add_patch(Circle((min(3.85, x + dx), float(np.clip(y + dy, 0.18, 2.82))), r, color=c, lw=0, alpha=1 - 0.4 * min(1, amp / 0.5)))
    style.cover(SLUG, draw, bg=style.TINT[style.VIOLET])


if __name__ == "__main__":
    pipeline(); schedule(); trajectories(); cover()
