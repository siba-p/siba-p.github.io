"""Figures for content/learn/learning-from-data.md.  Run: python3 tools/figures/learning-from-data.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
plt = style.setup()
SLUG = "learning-from-data"


def zigzag(x, y0, y1, coils=6, amp=0.07, lead=0.18):
    """Points of a vertical coil spring from (x, y0) to (x, y1)."""
    L = y1 - y0
    a, b = y0 + lead * L, y1 - lead * L
    ys = np.linspace(a, b, 2 * coils + 1)
    xs = x + amp * np.array([0] + [(-1) ** i for i in range(1, 2 * coils)] + [0])
    return np.r_[x, xs, x], np.r_[y0, ys, y1]


def springs():
    """The mechanical picture of least squares: a rod held by vertical springs."""
    x = np.array([0.6, 1.4, 2.2, 3.0, 3.8, 4.6])
    y = np.array([1.05, 2.35, 1.35, 2.95, 1.95, 3.25])
    X = np.column_stack([np.ones_like(x), x])
    b, w = np.linalg.lstsq(X, y, rcond=None)[0]
    r = y - (w * x + b)
    fig, ax = plt.subplots(figsize=(7.2, 3.7))
    xx = np.array([0.15, 5.05])
    ax.plot(xx, w * xx + b, color=style.BLUE, lw=5, solid_capstyle="round", zorder=3)
    for xi, yi, ri in zip(x, y, r):
        yl = w * xi + b
        sx, sy = zigzag(xi, yl, yi, coils=max(2, int(round(abs(ri) * 7))), amp=0.06, lead=0.12)
        ax.plot(sx, sy, color=style.TEAL, lw=1.6, zorder=2)
        ax.plot(xi, yl, "o", ms=7, mfc="white", mec=style.INK2, mew=1.2, zorder=4)   # frictionless ring
        ax.plot(xi, yi, "o", ms=9, color=style.ORANGE, zorder=5)
    xm, ym = x.mean(), y.mean()
    ax.plot(xm, ym, marker="D", ms=8, color=style.VIOLET, zorder=6)
    ax.annotate("centroid $(\\bar x, \\bar y)$: the line\nalways passes through it", (xm, ym), xytext=(2.85, 0.75),
                fontsize=9, color=style.VIOLET, ha="left", va="center",
                arrowprops=dict(arrowstyle="-", color=style.VIOLET, lw=0.8, shrinkA=2, shrinkB=6))
    i = 3  # label one spring
    ax.annotate("spring stretched by the residual $r_i$\nstores energy $k\\,r_i^2/2$", (x[i] + 0.07, (y[i] + w * x[i] + b) / 2),
                xytext=(3.4, 3.55), fontsize=9, color=style.INK2, va="center",
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=3))
    ax.annotate("data point", (x[0], y[0]), xytext=(0.2, 1.75), fontsize=9, color=style.ORANGE, ha="left",
                arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.8, shrinkB=5))
    ax.annotate("ring slides freely,\nspring stays vertical", (x[4], w * x[4] + b), xytext=(4.25, 1.25), fontsize=9,
                color=style.INK2, ha="left", va="center",
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=5))
    ax.text(0.15, 3.85, "rod at rest  =  least-squares line", fontsize=10.5, color=style.INK, fontweight="semibold")
    ax.text(0.15, 3.55, "no net force:     $\\Sigma_i\\, r_i = 0$\nno net torque:   $\\Sigma_i\\, x_i r_i = 0$", fontsize=9.5,
            color=style.INK2, va="top", linespacing=1.7)
    ax.set_xlim(0, 5.6); ax.set_ylim(0.45, 4.05)
    ax.set_xlabel("input $x$"); ax.set_ylabel("output $y$")
    ax.set_xticks([]); ax.set_yticks([])
    style.save(fig, SLUG, "springs")


def losses():
    """Noise model -> loss -> pull of one point on the fit, for Gaussian, Laplace and Huber."""
    r = np.linspace(-5, 5, 801)
    bL = 1 / np.sqrt(2)                       # Laplace scale with unit variance, like the Gaussian
    gauss = lambda u: np.exp(-u ** 2 / 2) / np.sqrt(2 * np.pi)
    lap = lambda u: np.exp(-np.abs(u) / bL) / (2 * bL)
    d = 2.0                                   # Huber threshold, in units of sigma
    hub = np.where(np.abs(r) <= d, 0.5 * r ** 2, d * (np.abs(r) - 0.5 * d))
    fig, axs = plt.subplots(1, 3, figsize=(7.2, 2.9), gridspec_kw=dict(wspace=0.42))
    arrow = dict(arrowstyle="-", lw=0.8, shrinkB=2)
    a = axs[0]
    a.semilogy(r, gauss(r), color=style.BLUE); a.semilogy(r, lap(r), color=style.ORANGE)
    a.set_ylim(1e-6, 3); a.set_xlim(-5, 5)
    a.set_title("noise model $p(r)$")
    a.set_xlabel("residual $r/\\sigma$"); a.set_ylabel("probability density")
    a.annotate("Laplace", (-4.0, lap(-4.0)), xytext=(-4.8, 0.35), fontsize=9, color=style.ORANGE,
               arrowprops=dict(arrow, color=style.ORANGE))
    a.annotate("Gaussian", (-4.25, gauss(-4.25)), xytext=(-4.8, 2.2e-6), fontsize=9, color=style.BLUE,
               arrowprops=dict(arrow, color=style.BLUE))
    ratio = lap(4.0) / gauss(4.0)
    a.plot([4, 4], [gauss(4.0), lap(4.0)], color=style.INK3, lw=1.0)
    a.annotate(f"{ratio:.0f}× likelier\nat $4\\sigma$", (4, np.sqrt(gauss(4.0) * lap(4.0))), xytext=(-0.2, 2.2e-6),
               fontsize=8.5, color=style.INK2, ha="left", arrowprops=dict(arrow, color=style.INK3))
    a = axs[1]
    a.plot(r, 0.5 * r ** 2, color=style.BLUE); a.plot(r, np.abs(r), color=style.ORANGE)
    a.plot(r, hub, color=style.GOLD, ls=(0, (4, 2)))
    a.set_ylim(0, 6); a.set_xlim(-4, 4)
    a.set_title("loss $\\ell(r) = -\\ln p$")
    a.set_xlabel("residual $r/\\sigma$")
    a.annotate("squared", (-3.0, 4.5), xytext=(-0.3, 5.3), fontsize=9, color=style.BLUE, ha="right",
               arrowprops=dict(arrow, color=style.BLUE))
    a.annotate("Huber", (3.4, 0.5 * 3.4 * 0 + d * (3.4 - 0.5 * d)), xytext=(0.3, 5.3), fontsize=9, color=style.GOLD,
               ha="left", arrowprops=dict(arrow, color=style.GOLD))
    a.text(3.95, 0.45, "absolute", color=style.ORANGE, fontsize=9, ha="right")
    a = axs[2]
    a.plot(r, r, color=style.BLUE); a.plot(r, np.sign(r), color=style.ORANGE)
    a.plot(r, np.clip(r, -d, d), color=style.GOLD, ls=(0, (4, 2)))
    a.axhline(0, color=style.LINE, lw=0.8, zorder=0)
    a.set_ylim(-4, 4); a.set_xlim(-4, 4)
    a.set_title("pull on the line $\\ell'(r)$")
    a.set_xlabel("residual $r/\\sigma$")
    a.text(0.5, 3.4, "squared", color=style.BLUE, fontsize=9)
    a.text(-4.3, -1.55, "absolute", color=style.ORANGE, fontsize=9)
    a.text(-4.3, -2.6, "Huber", color=style.GOLD, fontsize=9)
    style.save(fig, SLUG, "losses")
    return ratio


def compensation():
    """Correlated Arrhenius parameters, and the same uncertainty after centring the feature."""
    T = np.array([300., 310., 320., 330., 340., 350.])
    k = np.array([1.2e-3, 2.4e-3, 4.6e-3, 8.5e-3, 1.5e-2, 2.6e-2])
    R = 8.314462618e-3                                    # kJ/(mol K)
    X = np.column_stack([np.ones_like(T), 1 / T])
    lnA, slope = np.linalg.lstsq(X, np.log(k), rcond=None)[0]
    sig = 0.05                                            # 5 percent error in each k
    cov = sig ** 2 * np.linalg.inv(X.T @ X)
    rng = np.random.default_rng(7)
    th = rng.multivariate_normal([lnA, slope], cov, size=400)
    Ea = -th[:, 1] * R
    xbar = np.mean(1 / T)
    lnk_mid = th[:, 0] + th[:, 1] * xbar                  # ln k at the centre of the data
    c_raw = cov[0, 1] / np.sqrt(cov[0, 0] * cov[1, 1])
    Xc = np.column_stack([np.ones_like(T), 1 / T - xbar]); covc = sig ** 2 * np.linalg.inv(Xc.T @ Xc)
    c_cen = covc[0, 1] / np.sqrt(covc[0, 0] * covc[1, 1])
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.38))
    a = axs[0]
    a.scatter(Ea, th[:, 0], s=9, color=style.ORANGE, alpha=0.55, lw=0)
    a.set_xlabel("activation energy $E_a$ (kJ/mol)"); a.set_ylabel("$\\ln A$  ($A$ in s$^{-1}$)")
    a.set_title("raw feature $1/T$")
    a.text(0.04, 0.95, f"correlation {c_raw:.4f}", transform=a.transAxes, fontsize=9, color=style.INK2, va="top")
    a = axs[1]
    a.scatter(Ea, lnk_mid, s=9, color=style.TEAL, alpha=0.55, lw=0)
    a.set_xlabel("activation energy $E_a$ (kJ/mol)"); a.set_ylabel(f"$\\ln k$ at $T$ = {1 / xbar:.0f} K")
    a.set_title("centred feature $1/T - \\overline{1/T}$")
    a.text(0.04, 0.95, f"correlation {abs(c_cen):.2f}", transform=a.transAxes, fontsize=9, color=style.INK2, va="top")
    lo, hi = np.percentile(Ea, [0.5, 99.5])
    for a in axs: a.set_xlim(lo - 0.6, hi + 0.6)
    style.save(fig, SLUG, "compensation")
    return c_raw, np.sqrt(cov[1, 1]) * R, np.sqrt(cov[0, 0]), 1 / xbar


def cover():
    def draw(ax):
        x = np.array([0.55, 1.15, 1.75, 2.35, 2.95, 3.5])
        y = np.array([0.95, 1.65, 1.2, 2.15, 1.75, 2.45])
        w, b = np.polyfit(x, y, 1)
        xx = np.array([0.2, 3.85])
        for xi, yi in zip(x, y):
            yl = w * xi + b
            sx, sy = zigzag(xi, yl, yi, coils=3, amp=0.09, lead=0.12)
            ax.plot(sx, sy, color=style.TEAL, lw=3.2, solid_joinstyle="round", zorder=2)
        ax.plot(xx, w * xx + b, color=style.BLUE, lw=9, solid_capstyle="round", zorder=3)
        ax.scatter(x, y, s=260, color=style.ORANGE, zorder=4, lw=0)
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    springs()
    print("4-sigma Laplace/Gauss density ratio:", round(losses(), 1))
    print("raw correlation, sigma(Ea) kJ/mol, sigma(lnA), centre T:", compensation())
    cover()
