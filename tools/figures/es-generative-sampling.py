"""Figures for content/learn/es-generative-sampling.md.  Run: python3 tools/figures/es-generative-sampling.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Ellipse, Polygon
import style
plt = style.setup()
SLUG = "es-generative-sampling"


# ---------------------------------------------------------------------------------------------
# 1. The affine coupling layer as a block diagram
# ---------------------------------------------------------------------------------------------
def coupling():
    fig, ax = plt.subplots(figsize=(7.2, 3.3))
    ax.set_xlim(0, 10.6); ax.set_ylim(0, 4.6); ax.set_aspect("equal"); ax.axis("off")
    def box(x, y, w, h, txt, col, fs=11, weight="semibold", tc=None):
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=0.18", fc=style.TINT[col], ec=col, lw=1.4))
        ax.text(x + w / 2, y + h / 2, txt, ha="center", va="center", fontsize=fs, fontweight=weight, color=tc or col)
    arr = dict(arrowstyle="-|>", mutation_scale=12, color=style.INK2, lw=1.3)
    box(0.2, 3.0, 1.3, 0.9, "$x_a$", style.BLUE, 13)
    box(0.2, 0.6, 1.3, 0.9, "$x_b$", style.BLUE, 13)
    box(8.9, 3.0, 1.3, 0.9, "$y_a$", style.ORANGE, 13)
    box(8.9, 0.6, 1.3, 0.9, "$y_b$", style.ORANGE, 13)
    box(3.2, 1.85, 2.0, 1.0, "networks\n$s(x_a)$, $t(x_a)$", style.VIOLET, 10)
    ax.add_patch(Circle((6.6, 1.05), 0.42, fc="white", ec=style.TEAL, lw=1.6))
    ax.text(6.6, 1.05, "×", ha="center", va="center", fontsize=15, color=style.TEAL)
    ax.add_patch(Circle((7.85, 1.05), 0.42, fc="white", ec=style.TEAL, lw=1.6))
    ax.text(7.85, 1.05, "+", ha="center", va="center", fontsize=15, color=style.TEAL)
    ax.add_patch(FancyArrowPatch((1.55, 3.45), (8.85, 3.45), **arr))
    ax.text(5.2, 3.62, "copied unchanged", ha="center", fontsize=9, color=style.INK2)
    ax.add_patch(FancyArrowPatch((2.3, 3.42), (3.15, 2.45), connectionstyle="arc3,rad=0.25", **arr))
    ax.plot([2.3], [3.45], "o", ms=4, color=style.INK2)
    ax.add_patch(FancyArrowPatch((1.55, 1.05), (6.15, 1.05), **arr))
    ax.add_patch(FancyArrowPatch((7.03, 1.05), (7.42, 1.05), **arr))
    ax.add_patch(FancyArrowPatch((8.28, 1.05), (8.85, 1.05), **arr))
    ax.add_patch(FancyArrowPatch((5.25, 2.2), (6.45, 1.5), connectionstyle="arc3,rad=-0.15", **arr))
    ax.add_patch(FancyArrowPatch((5.25, 2.5), (7.75, 1.5), connectionstyle="arc3,rad=-0.3", **arr))
    ax.text(5.95, 1.95, "$e^{s}$", fontsize=11, color=style.INK2)
    ax.text(7.2, 2.25, "$t$", fontsize=11, color=style.INK2)
    ax.text(5.3, 0.15, "log |det J| = sum of s: no determinant is ever computed;  "
                       "inverse: $x_b = (y_b - t)\\,e^{-s}$", ha="center", fontsize=9, color=style.INK2)
    style.save(fig, SLUG, "coupling")


# ---------------------------------------------------------------------------------------------
# 2. Mode-seeking versus mode-covering: Gaussian fits to the double well of the chapter
# ---------------------------------------------------------------------------------------------
def kl_modes():
    x = np.linspace(-3, 3, 6001); dx = x[1] - x[0]
    lp = -(8 * (x ** 2 - 1) ** 2 + 0.5 * x)          # marginal along x of the chapter's U(x, y); kT = 1
    p = np.exp(lp - lp.max()); p /= p.sum() * dx; lp = np.log(p)
    def q(mu, s): return np.exp(-0.5 * ((x - mu) / s) ** 2) / (s * np.sqrt(2 * np.pi))
    def rkl(mu, s):
        qq = q(mu, s); m = qq > 1e-300; return (qq[m] * (np.log(qq[m]) - lp[m])).sum() * dx
    def fkl(mu, s): return (p * (lp - np.log(q(mu, s) + 1e-300))).sum() * dx
    mus = np.linspace(-1.5, 1.5, 301); ss = np.linspace(0.05, 1.5, 291)
    R = np.array([[rkl(m, s) for s in ss] for m in mus]); F = np.array([[fkl(m, s) for s in ss] for m in mus])
    i, j = np.unravel_index(R.argmin(), R.shape); mu_r, s_r = mus[i], ss[j]
    mu_f = (p * x).sum() * dx; s_f = np.sqrt((p * (x - mu_f) ** 2).sum() * dx)
    rng = np.random.default_rng(0); res = {}
    for name, (m, s) in (("reverse", (mu_r, s_r)), ("forward", (mu_f, s_f))):
        z = rng.normal(m, s, 10000)
        lw = -(8 * (z ** 2 - 1) ** 2 + 0.5 * z) + 0.5 * ((z - m) / s) ** 2 + np.log(s * np.sqrt(2 * np.pi))
        w = np.exp(lw - lw.max()); res[name] = (w.sum() ** 2 / (w ** 2).sum() / len(w), w[z > 0].sum() / w.sum())
        print(f"{name} KL fit: mu {m:+.2f}, sigma {s:.3f}; ESS {res[name][0]*100:.1f} %, P(right) {res[name][1]:.3f}")
    print(f"exact P(right) {p[x > 0].sum() * dx:.3f}; reverse-KL minima: left {R[mus < 0].min():.2f}, right {R[mus > 0].min():.2f}")

    fig, (a1, a2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw=dict(width_ratios=[1.25, 1], wspace=0.38))
    xp = x[::12]
    a1.fill_between(xp, p[::12], color=style.LINE, lw=0)
    a1.plot(xp, p[::12], color=style.INK3, lw=1.2)
    a1.plot(xp, q(mu_r, s_r)[::12], color=style.VIOLET, lw=1.8)
    a1.plot(xp, q(mu_f, s_f)[::12], color=style.ORANGE, lw=1.8)
    a1.text(-0.8, 2.9, f"reverse KL\nESS {res['reverse'][0]*100:.0f} %, P(right) = {res['reverse'][1]:.2f}",
            color=style.VIOLET, fontsize=9, fontweight="semibold", va="center", linespacing=1.3)
    a1.text(1.15, 2.05, f"forward KL\nESS {res['forward'][0]*100:.0f} %\nP(right) {res['forward'][1]:.2f}",
            color=style.ORANGE, fontsize=9, fontweight="semibold", va="center", linespacing=1.3)
    a1.text(0.45, 1.1, f"Boltzmann\nP(right) {p[x > 0].sum() * dx:.2f}", color=style.INK2, fontsize=9, linespacing=1.3)
    a1.set_xlim(-2.5, 2.5); a1.set_ylim(0, 3.4)
    a1.set_xlabel("x"); a1.set_ylabel("probability density")
    a1.set_title("Best single-Gaussian fits", fontsize=10)
    a2.plot(mus, R.min(1), color=style.VIOLET)
    a2.plot(mus, F.min(1), color=style.ORANGE)
    a2.set_xlabel("Gaussian mean μ (best σ for each)"); a2.set_ylabel("divergence (nats)")
    a2.set_ylim(0, 4.0); a2.set_xlim(-1.5, 1.5)
    a2.annotate("two minima:\ntraining stays\nin the first\nwell it finds", xy=(0.97, R[mus > 0].min()), xytext=(-0.36, 2.9),
                fontsize=8.5, color=style.VIOLET, arrowprops=dict(arrowstyle="-", color=style.VIOLET, lw=0.8), linespacing=1.2)
    a2.text(-0.25, 0.95, "one minimum", fontsize=8.5, color=style.ORANGE)
    a2.set_title("Divergence against the mean", fontsize=10)
    style.save(fig, SLUG, "kl-modes")


# ---------------------------------------------------------------------------------------------
# 3. Effective sample size against dimension for a slightly too wide Gaussian proposal
# ---------------------------------------------------------------------------------------------
def ess_dimension():
    d = np.logspace(0, 5, 400)
    fig, ax = plt.subplots(figsize=style.WIDE)
    for s, col in ((1.01, style.TEAL), (1.05, style.BLUE), (1.1, style.VIOLET), (1.2, style.PINK)):
        f = np.sqrt(2 * s * s - 1) / s ** 2                    # ESS fraction per dimension, n_eff/n = f^d
        y = f ** d
        ax.loglog(d, y, color=col)
        k = np.searchsorted(-y, -1e-3)
        ax.text(d[k] / 1.15, 1e-3, f"{s:g}", color=col, fontsize=9.5, fontweight="semibold", ha="right", va="center")
        print(f"ESS: sigma ratio {s}: per-dimension factor {f:.5f}; d at ESS 50 %: {np.log(0.5)/np.log(f):.0f}; "
              f"ESS at d = 66: {f**66:.3g}; at d = 9000: {f**9000:.3g}")
    ax.text(1.3, 1e-3, "width ratio $\\sigma_q/\\sigma_p$ =", fontsize=9, color=style.INK2, va="center")
    for dd, txt, xx, yy, ha in ((66, "alanine dipeptide\n(22 atoms)", 66 / 1.12, 1e-9, "right"),
                                (9000, "3000 atoms", 9000 * 1.12, 1e-5, "left")):
        ax.axvline(dd, color=style.INK3, lw=0.8, ls=(0, (3, 3)))
        ax.text(xx, yy, txt, fontsize=8.5, color=style.INK2, va="center", ha=ha, linespacing=1.2)
    ax.set_ylim(1e-12, 2); ax.set_xlim(1, 1e5)
    ax.set_xlabel("number of degrees of freedom d"); ax.set_ylabel("effective sample size, n_eff / n")
    ax.set_title("Gaussian target, Gaussian proposal slightly too wide in every direction", fontsize=10)
    ax.grid(axis="y", which="major")
    style.save(fig, SLUG, "ess-dimension")


# ---------------------------------------------------------------------------------------------
# Cover: a round Gaussian cloud flowing into two separate states
# ---------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        for r, a in ((0.78, 0.25), (0.58, 0.45), (0.38, 0.7), (0.2, 1.0)):
            ax.add_patch(Circle((0.95, 1.5), r, color=style.TEAL, alpha=a, lw=0))
        t = np.linspace(0, 1, 200)
        for y1, col in ((2.2, style.ORANGE), (0.8, style.BLUE)):
            for off, lw in ((-0.18, 2.5), (0.0, 4), (0.18, 2.5)):
                xs = 1.55 + 1.6 * t
                ys = 1.5 + off * (1 - 0.5 * t) + (y1 - 1.5) * (3 * t ** 2 - 2 * t ** 3)
                ax.plot(xs, ys, color=style.VIOLET, lw=lw, alpha=0.8, solid_capstyle="round")
        for y1, col in ((2.2, style.ORANGE), (0.8, style.BLUE)):
            for rx, a in ((0.42, 0.35), (0.3, 0.6), (0.18, 1.0)):
                ax.add_patch(Ellipse((3.3, y1), 2 * rx, 1.5 * rx, color=col, alpha=a, lw=0))
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    coupling(); kl_modes(); ess_dimension(); cover()
