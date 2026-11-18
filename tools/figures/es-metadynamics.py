"""Figures for content/learn/es-metadynamics.md.  Run: python3 tools/figures/es-metadynamics.py

loop       the feedback loop of metadynamics (schematic)
biasfactor what the well-tempered bias factor does to the landscape and to the sampled distribution (analytic)
filling    a seeded one-dimensional simulation: how the bias piles up, and how the free-energy estimate converges
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import style
plt = style.setup()
SLUG = "es-metadynamics"


# ---------------------------------------------------------------------------------------------------------------
def loop():
    fig, ax = plt.subplots(figsize=(7.2, 4.0))
    ax.set_xlim(0, 10); ax.set_ylim(0, 5.6); ax.set_aspect("equal"); ax.axis("off")
    boxes = {"atoms": (0.2, 3.0), "cv": (5.6, 3.0), "bias": (5.6, 0.2), "force": (0.2, 0.2)}
    W, H = 4.2, 2.4
    titles = {"atoms": "1  Atoms move by MD", "cv": "2  Compute the CV $s(\\mathbf{x})$",
              "bias": "3  Every PACE steps, add a hill", "force": "4  The bias pushes the atoms"}
    tint = {"atoms": style.TINT[style.BLUE], "cv": style.TINT[style.TEAL], "bias": style.TINT[style.VIOLET],
            "force": style.TINT[style.ORANGE]}
    for k, (x, y) in boxes.items():
        ax.add_patch(FancyBboxPatch((x, y), W, H, boxstyle="round,pad=0,rounding_size=0.18", fc=tint[k], ec="none"))
        ax.text(x + 0.18, y + H - 0.2, titles[k], fontsize=9.5, fontweight="semibold", va="top", color=style.INK)
    # 1: a seven-atom cluster
    cx, cy = 2.3, 3.95
    pts = [(cx, cy)] + [(cx + 0.42 * np.cos(a), cy + 0.42 * np.sin(a)) for a in np.arange(6) * np.pi / 3]
    for (px, py) in pts:
        ax.add_patch(mpatches.Circle((px, py), 0.17, fc=style.BLUE, ec="white", lw=1.2, zorder=3))
    ax.text(3.0, 3.25, "$\\mathbf{x}(t)$", fontsize=9, color=style.INK2)
    # 2: the CV axis with the current value
    ax.plot([6.0, 9.4], [3.7, 3.7], color=style.INK3, lw=1)
    for xt in np.linspace(6.0, 9.4, 6):
        ax.plot([xt, xt], [3.65, 3.75], color=style.INK3, lw=0.8)
    ax.plot(7.35, 3.7, "o", ms=8, color=style.PINK, zorder=4)
    ax.text(7.35, 3.95, "$s(t)$", fontsize=9, color=style.PINK, ha="center")
    ax.text(6.0, 3.25, "e.g. a distance, a coordination number", fontsize=8.5, color=style.INK2)
    # 3: stacked hills
    xs = np.linspace(5.9, 9.5, 300)
    centres = [6.9, 7.1, 7.3, 7.0, 7.25, 7.6, 7.45, 7.35]
    base = np.full_like(xs, 0.7)
    for i, c in enumerate(centres):
        h = 0.16 * np.exp(-(xs - c) ** 2 / (2 * 0.16 ** 2))
        ax.fill_between(xs, base, base + h, color=style.VIOLET, alpha=0.25 + 0.08 * (i % 3), lw=0)
        base = base + h
    ax.plot(xs, base, color=style.VIOLET, lw=1.6)
    ax.text(9.5, 1.15, "$V(s,t)$", fontsize=9, color=style.VIOLET, ha="right")
    ax.text(5.8, 1.62, "height $w$, width $\\sigma$", fontsize=8.5, color=style.INK2)
    ax.text(9.65, 0.33, "well-tempered: $w = w_0\\,e^{-V/k_B\\Delta T}$", fontsize=8.5, color=style.INK2, ha="right")
    # 4: atoms with forces
    cx, cy = 1.5, 1.1
    pts = [(cx, cy)] + [(cx + 0.42 * np.cos(a), cy + 0.42 * np.sin(a)) for a in np.arange(6) * np.pi / 3]
    for j, (px, py) in enumerate(pts):
        ax.add_patch(mpatches.Circle((px, py), 0.17, fc=style.BLUE, ec="white", lw=1.2, zorder=3))
        if j > 0:
            dx, dy = px - cx, py - cy
            ax.annotate("", (px + 0.75 * dx, py + 0.75 * dy), (px + 0.3 * dx, py + 0.3 * dy),
                        arrowprops=dict(arrowstyle="-|>", color=style.ORANGE, lw=1.3, mutation_scale=8))
    ax.text(2.55, 1.35, "force on atom $i$:", fontsize=8.5, color=style.INK2, va="center")
    ax.text(2.55, 0.85, "$-(\\partial V/\\partial s)\\,\\nabla_i s$", fontsize=10, color=style.ORANGE, va="center")
    # arrows between the boxes
    kw = dict(arrowstyle="-|>", mutation_scale=14, lw=1.8, color=style.INK2)
    ax.add_patch(FancyArrowPatch((4.45, 4.2), (5.55, 4.2), **kw))
    ax.add_patch(FancyArrowPatch((7.7, 2.95), (7.7, 2.65), **kw))
    ax.add_patch(FancyArrowPatch((5.55, 1.4), (4.45, 1.4), **kw))
    ax.add_patch(FancyArrowPatch((2.3, 2.65), (2.3, 2.95), **kw))
    style.save(fig, SLUG, "loop")


# ---------------------------------------------------------------------------------------------------------------
def model_F(s):
    """An asymmetric double well in units of k_BT: left basin, 30 k_BT barrier (28 + 2), right basin 4 k_BT higher."""
    return 28 * (s ** 2 - 1) ** 2 + 2 * (s + 1)


def biasfactor():
    s = np.linspace(-1.6, 1.6, 801); ds = s[1] - s[0]
    F = model_F(s); F -= F.min()
    top = F[np.abs(s) < 0.5].max()
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.2), gridspec_kw=dict(wspace=0.3))
    cases = [(1, style.BLUE, "$\\gamma$ = 1 (plain MD)"), (3, style.TEAL, "$\\gamma$ = 3"),
             (10, style.ORANGE, "$\\gamma$ = 10"), (np.inf, style.VIOLET, "$\\gamma \\to \\infty$")]
    a = axs[0]
    for g, col, lab in cases:
        Fe = F / g if np.isfinite(g) else np.zeros_like(F)
        a.plot(s, Fe, color=col, lw=1.8)
    a.text(-0.4, 27.5, f"barrier\n{top:.0f} $k_BT$", fontsize=8.5, color=style.BLUE, ha="right", linespacing=1.2)
    a.text(-0.02, top / 3 + 1.0, f"{top/3:.0f}", fontsize=8.5, color=style.TEAL, ha="center")
    a.text(0.0, top / 10 + 1.0, f"{top/10:.0f}", fontsize=8.5, color=style.ORANGE, ha="center")
    a.text(1.35, 1.4, "flat", fontsize=8.5, color=style.VIOLET, ha="center")
    for k, (g, col, lab) in enumerate(cases):
        a.text(0.42, 35.5 - 3.0 * k, lab.replace(" (plain MD)", ""), fontsize=8.5, color=col, va="center")
    a.set_xlim(-1.6, 1.6); a.set_ylim(-1, 38)
    a.set_xlabel("collective variable $s$"); a.set_ylabel("$F + V = F/\\gamma$  ($k_BT$)")
    a.set_title("What the CV feels")
    a = axs[1]
    for g, col, lab in cases:
        p = np.exp(-F / g) if np.isfinite(g) else np.ones_like(F)
        p /= p.sum() * ds
        a.semilogy(s, p, color=col, lw=1.8)
    a.set_ylim(1e-15, 20); a.set_xlim(-1.6, 1.6)
    a.set_xlabel("collective variable $s$"); a.set_ylabel("sampled density  $\\propto P(s)^{1/\\gamma}$")
    a.annotate("$e^{-30} \\approx 10^{-13}$", (0.0, np.exp(-30) / (np.exp(-F).sum() * ds) * 1.3), xytext=(0.18, 3e-15),
               fontsize=8.5, color=style.BLUE, va="center", arrowprops=dict(arrowstyle="-", color=style.BLUE, lw=0.8, shrinkB=2))
    a.set_title("What the CV samples")
    style.save(fig, SLUG, "biasfactor")
    print(f"  biasfactor: barrier {top:.2f} kT, right basin {F[s > 0.5].min():.2f} kT")


# ---------------------------------------------------------------------------------------------------------------
def run_metad(gamma, w0, seed, nhills=6000, pace=100, dt=2e-3, sigma=0.12):
    """Overdamped Langevin (D = 1, k_BT = 1) on model_F / 3 with metadynamics; returns grid, bias snapshots, dF(t)."""
    rng = np.random.default_rng(seed)
    g = np.linspace(-2.2, 2.2, 881); dg = g[1] - g[0]
    Fg = model_F(g) / 3.0; Fg -= Fg.min()                       # 10 k_BT barrier, right basin 0.67 k_BT higher
    dF = np.gradient(Fg, dg)
    V = np.zeros_like(g); dV = np.zeros_like(g)
    x = -1.0; amp = np.sqrt(2 * dt)
    left, right = (g > -1.6) & (g < 0), (g > 0) & (g < 1.6)
    ts, est, snaps, heights = [], [], [], []
    for n in range(nhills):
        noise = rng.standard_normal(pace)
        for k in range(pace):
            i = int((x - g[0]) / dg)
            if i < 1: i = 1
            if i > len(g) - 2: i = len(g) - 2
            x += -(dF[i] + dV[i]) * dt + amp * noise[k]
            if x < -2.0: x = -4.0 - x                           # reflecting walls well outside the basins
            if x > 2.0: x = 4.0 - x
        i = int(round((x - g[0]) / dg))
        w = w0 * np.exp(-V[i] / (gamma - 1)) if np.isfinite(gamma) else w0
        heights.append(w)
        hill = w * np.exp(-(g - x) ** 2 / (2 * sigma ** 2))
        V += hill; dV = np.gradient(V, dg)
        Fest = -V * (gamma / (gamma - 1) if np.isfinite(gamma) else 1.0)
        dFe = -np.log(np.exp(-Fest[right]).sum()) + np.log(np.exp(-Fest[left]).sum())
        ts.append((n + 1) * pace * dt); est.append(dFe)
        if n + 1 in (100, 250, 500, 1500, 6000):
            snaps.append((n + 1, V.copy()))
    true = -np.log(np.exp(-Fg[right]).sum()) + np.log(np.exp(-Fg[left]).sum())
    return g, Fg, snaps, np.array(ts), np.array(est), true, np.array(heights)


def filling():
    g, Fg, snaps, t_wt, e_wt, true, h_wt = run_metad(gamma=6, w0=0.3, seed=11)
    _, _, _, t_p, e_p, _, _ = run_metad(gamma=np.inf, w0=0.3, seed=11)
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.3, width_ratios=[1.0, 1.15]))
    a = axs[0]
    m = (np.abs(g) < 1.5) & (np.arange(g.size) % 3 == 0)
    cols = [style.BLUE, style.TEAL, style.GOLD, style.ORANGE, style.PINK]
    prev = Fg.copy(); j = np.argmin(np.abs(g + 1.0))
    for k, ((n, V), col) in enumerate(zip(snaps, cols)):
        a.fill_between(g[m], prev[m], (Fg + V)[m], color=col, alpha=0.55, lw=0)
        yy = 0.5 * (prev[j] + (Fg + V)[j])
        a.text(-1.0, yy, f"{n}", fontsize=8, color=style.INK, ha="center", va="center")
        prev = Fg + V
    a.plot(g[m], Fg[m], color=style.INK, lw=1.6)
    a.text(0.0, 1.2, "$F(s)$", fontsize=9, color=style.INK, ha="center")
    a.set_xlim(-1.5, 1.5); a.set_ylim(0, (Fg + snaps[-1][1])[np.abs(g) < 1.5].max() + 0.5)
    a.set_xlabel("collective variable $s$"); a.set_ylabel("$F + V$  ($k_BT$)")
    a.set_title("Layers of sand, $\\gamma$ = 6")
    a = axs[1]
    a.plot(t_p[::4], e_p[::4], color=style.PINK, lw=0.9, alpha=0.85)
    a.plot(t_wt[::4], e_wt[::4], color=style.BLUE, lw=1.6)
    a.axhline(true, color=style.INK, lw=1, ls=(0, (3, 2)))
    a.text(t_p[-1] * 0.98, 3.55, "plain, $w$ = 0.3 $k_BT$", fontsize=8.5, color=style.PINK, ha="right")
    a.text(t_wt[-1] * 0.98, -2.6, "well-tempered, $w_0$ = 0.3 $k_BT$, $\\gamma$ = 6", fontsize=8.5, color=style.BLUE, ha="right")
    a.text(t_wt[-1] * 1.01, true, f"exact\n{true:.2f}", fontsize=8.5, color=style.INK, ha="left", va="center", clip_on=False)
    a.set_ylim(-3, 4); a.set_xlim(0, t_wt[-1])
    a.set_xlabel("time (units of $L^2/D$)"); a.set_ylabel("$\\Delta F$ estimate, right $-$ left  ($k_BT$)")
    a.set_title("Does the estimate settle?")
    style.save(fig, SLUG, "filling")
    last = slice(-2000, None)
    print(f"  filling: exact dF {true:.3f}; last third mean/std  WT {e_wt[last].mean():.2f}/{e_wt[last].std():.2f}"
          f"  plain0.3 {e_p[last].mean():.2f}/{e_p[last].std():.2f}"
          f"  WT std hills 1000-2000 {e_wt[1000:2000].std():.2f}  plain {e_p[1000:2000].std():.2f}"
          f"  WT final height {h_wt[-1]:.4f}")


# ---------------------------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        x = np.linspace(0, 4, 600)
        u = (x - 2.0) / 1.15
        ground = 0.5 + 0.9 * (u ** 2 - 1) ** 2 + 0.15 * u
        prev = ground.copy()
        for lv, col in zip([0.78, 1.0, 1.2, 1.4], [style.ORANGE, style.GOLD, "#f0b45a", "#e8c766"]):
            top = np.where((x < 2.0) & (ground < lv), lv, prev)
            top = np.maximum(top, prev)
            ax.fill_between(x, prev, top, color=col, lw=0, zorder=2)
            prev = top
        ax.fill_between(x, 0, np.minimum(ground, 3.2), color=style.BLUE, lw=0, zorder=3)
        ax.add_patch(mpatches.Circle((1.98, 1.58), 0.18, color=style.PINK, zorder=5))
        ax.annotate("", (3.05, 0.95), (2.25, 1.85),
                    arrowprops=dict(arrowstyle="-|>", color=style.INK, lw=2.6, mutation_scale=18,
                                    connectionstyle="arc3,rad=-0.35"), zorder=6)
    style.cover(SLUG, draw, bg=style.TINT[style.VIOLET])


if __name__ == "__main__":
    loop(); biasfactor(); filling(); cover()
