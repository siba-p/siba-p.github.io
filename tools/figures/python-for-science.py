"""Figures for content/learn/python-for-science.md.  Run: python3 tools/figures/python-for-science.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Ellipse
from scipy.optimize import curve_fit
import style
plt = style.setup()
SLUG = "python-for-science"
MONO = "DejaVu Sans Mono"


def box(ax, x, y, w, h, fc, ec, lw=1.0, r=0.6):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}", fc=fc, ec=ec, lw=lw))


# ---------------------------------------------------------------------------------------------
# 1. The analysis pipeline, with the tools used at each step
# ---------------------------------------------------------------------------------------------
def pipeline():
    steps = [("read", style.BLUE, ["open, pathlib", "np.loadtxt", "ase.io.read"]),
             ("check", style.TEAL, ["shapes, units", "np.isfinite", "drop transient"]),
             ("compute", style.VIOLET, ["NumPy", "np.polyfit", "curve_fit"]),
             ("error bar", style.ORANGE, ["covariance", "block average", "bootstrap"]),
             ("plot", style.PINK, ["Matplotlib", "residuals", "PDF / SVG"]),
             ("record", style.GOLD, ["git commit", ".npz, HDF5", "environment"])]
    fig, ax = plt.subplots(figsize=(7.2, 2.6))
    ax.set_xlim(0, 72); ax.set_ylim(0, 26); ax.axis("off"); ax.set_aspect("equal")
    w, gap, y0 = 10.2, 2.0, 12.5
    xs = [0.6 + i * (w + gap) for i in range(len(steps))]
    for (name, c, tools), x in zip(steps, xs):
        box(ax, x, y0, w, 5.2, c, c, r=0.8)
        ax.text(x + w / 2, y0 + 2.6, name, ha="center", va="center", fontsize=10, fontweight="semibold",
                color="white")
        for k, t in enumerate(tools):
            ax.text(x + w / 2, y0 - 2.0 - k * 2.3, t, ha="center", va="center", fontsize=8, color=style.INK2)
    for x in xs[:-1]:
        ax.add_patch(FancyArrowPatch((x + w + 0.1, y0 + 2.6), (x + w + gap - 0.1, y0 + 2.6), arrowstyle="-|>",
                                     mutation_scale=10, color=style.INK2, lw=1.3, shrinkA=0, shrinkB=0))
    # feedback loop: residuals send you back to checking
    ax.add_patch(FancyArrowPatch((xs[4] + w / 2, y0 + 5.4), (xs[1] + w / 2, y0 + 5.4), arrowstyle="-|>",
                                 mutation_scale=10, color=style.PINK, lw=1.3, connectionstyle="arc3,rad=0.28"))
    ax.text((xs[1] + xs[4] + w) / 2, 24.6, "structured residuals or outliers: go back and check", ha="center",
            fontsize=8.5, color=style.PINK)
    # synthetic input
    ax.text(xs[0] + w / 2, 1.0, "test first on synthetic data with a known answer", ha="left", fontsize=8.5,
            color=style.BLUE)
    style.save(fig, SLUG, "pipeline")


# ---------------------------------------------------------------------------------------------
# 2. Residuals reveal a wrong model that R² hides: a two-exponential decay fitted with one exponential
# ---------------------------------------------------------------------------------------------
def one_exp(t, a, tau, c):
    return a * np.exp(-t / tau) + c


def two_exp(t, a1, t1, a2, t2, c):
    return a1 * np.exp(-t / t1) + a2 * np.exp(-t / t2) + c


def residuals():
    rng = np.random.default_rng(11)
    t = np.linspace(0, 30, 61)                                  # ps
    y = two_exp(t, 0.6, 1.0, 0.4, 8.0, 0.0) + rng.normal(0, 0.01, t.size)
    p1, _ = curve_fit(one_exp, t, y, p0=[1, 3, 0])
    p2, _ = curve_fit(two_exp, t, y, p0=[0.5, 0.5, 0.5, 5, 0])
    r1, r2 = y - one_exp(t, *p1), y - two_exp(t, *p2)
    R2 = 1 - (r1**2).sum() / ((y - y.mean())**2).sum()
    fig, axs = plt.subplots(1, 3, figsize=(7.2, 2.9), gridspec_kw={"wspace": 0.5, "width_ratios": [1.25, 1, 1]})
    a, b, c = axs
    tt = np.linspace(0, 30, 300)
    a.plot(t, y, "o", color=style.INK3, ms=2.8, mfc="white", mew=0.8)
    a.plot(tt, one_exp(tt, *p1), color=style.PINK, lw=1.6)
    a.plot(tt, two_exp(tt, *p2), color=style.TEAL, lw=1.6, ls="--")
    a.text(9, 0.6, f"one exponential\nR² = {R2:.3f}", color=style.PINK, fontsize=8.5)
    a.text(9, 0.33, "two exponentials", color=style.TEAL, fontsize=8.5)
    a.set_xlabel("time (ps)"); a.set_ylabel("correlation C(t)")
    a.set_title("(a) data and fits", fontsize=10)
    for ax_, r, col, title in [(b, r1, style.PINK, "(b) one exponential"), (c, r2, style.TEAL, "(c) two exponentials")]:
        ax_.axhline(0, color=style.INK3, lw=0.8)
        ax_.plot(t, r * 100, "o", color=col, ms=3)
        ax_.set_ylim(-6, 6); ax_.set_xlabel("time (ps)")
        ax_.set_title(title, fontsize=10)
    b.set_ylabel("residual (× 10⁻²)")
    b.text(15, -5.3, "systematic wave", ha="center", fontsize=8.5, color=style.PINK)
    c.text(15, -5.3, "noise only", ha="center", fontsize=8.5, color=style.TEAL)
    style.save(fig, SLUG, "residuals")
    return p1, p2, R2, r1.std(), r2.std()


# ---------------------------------------------------------------------------------------------
# 3. Correlated parameters in the Arrhenius fit, and how centring 1/T removes the correlation
# ---------------------------------------------------------------------------------------------
def ellipse():
    R = 8.314462618
    T = np.array([300., 310., 320., 330., 340., 350.])
    k = np.array([1.2e-3, 2.4e-3, 4.6e-3, 8.5e-3, 1.5e-2, 2.6e-2])
    x = 1 / T
    (m, b), C = np.polyfit(x, np.log(k), 1, cov=True)
    xm = x.mean(); Tm = 1 / xm
    (mc, bc), Cc = np.polyfit(x - xm, np.log(k), 1, cov=True)
    # parameters in physical units: Ea = -m R (kJ/mol), ln A = b; and ln k(Tm) = bc
    J = np.array([[-R / 1000, 0], [0, 1]])
    S1 = J @ C @ J.T
    S2 = J @ Cc @ J.T
    P1 = np.array([-m * R / 1000, b]); P2 = np.array([-mc * R / 1000, bc])
    rho1 = S1[0, 1] / np.sqrt(S1[0, 0] * S1[1, 1]); rho2 = S2[0, 1] / np.sqrt(S2[0, 0] * S2[1, 1])

    def draw(ax, P, S, col, nsig=(1, 2)):
        vals, vecs = np.linalg.eigh(S)
        ang = np.degrees(np.arctan2(vecs[1, 1], vecs[0, 1]))
        for n_, alpha in zip(nsig, (0.55, 0.25)):
            # 2D confidence regions: 1 and 2 standard deviations along each principal axis
            ax.add_patch(Ellipse(P, 2 * n_ * np.sqrt(vals[1]), 2 * n_ * np.sqrt(vals[0]), angle=ang,
                                 fc=style.TINT[col], ec=col, lw=1.3, alpha=1 if n_ == 1 else 0.9,
                                 zorder=3 - n_))
        ax.plot(*P, "o", color=col, ms=4, zorder=5)
        sx, sy = np.sqrt(S[0, 0]), np.sqrt(S[1, 1])
        ax.set_xlim(P[0] - 3 * sx, P[0] + 3 * sx); ax.set_ylim(P[1] - 3 * sy, P[1] + 3 * sy)
        return sx, sy

    fig, (a1, a2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw={"wspace": 0.45})
    draw(a1, P1, S1, style.PINK)
    draw(a2, P2, S2, style.TEAL)
    a1.set_xlabel("Eₐ (kJ/mol)"); a1.set_ylabel("ln A  (A in 1/s)")
    a1.set_title(f"(a) ln k = ln A − Eₐ/RT:  ρ = {rho1:+.4f}", fontsize=10)
    a2.set_xlabel("Eₐ (kJ/mol)"); a2.set_ylabel(f"ln k at {Tm:.0f} K")
    a2.set_title(f"(b) 1/T centred at {Tm:.0f} K:  ρ = {abs(rho2):.0f}", fontsize=10)
    for ax_ in (a1, a2):
        ax_.ticklabel_format(useOffset=False)
        ax_.locator_params(nbins=5)
    a1.text(0.05, 0.92, "1σ and 2σ ellipses; axes span\n±3σ of each parameter alone", transform=a1.transAxes, fontsize=8.5,
            color=style.INK2, va="top")
    style.save(fig, SLUG, "ellipse")
    return P1, np.sqrt(np.diag(S1)), rho1, P2, np.sqrt(np.diag(S2)), rho2, Tm


# ---------------------------------------------------------------------------------------------
# 4. Anatomy of a Matplotlib figure
# ---------------------------------------------------------------------------------------------
def anatomy():
    rng = np.random.default_rng(42)
    fig = plt.figure(figsize=(7.2, 3.6))
    fig.patch.set_facecolor(style.BG2)
    ax = fig.add_axes([0.30, 0.2, 0.42, 0.62])
    t = np.linspace(0.05, 1, 20)
    msd = 6 * t + rng.normal(0, 0.18, t.size)
    ax.plot(t, msd, "o", color=style.BLUE, ms=4, label="simulation")
    ax.plot(t, 6 * t, "-", color=style.ORANGE, label="6Dt, D = 1")
    ax.set_xlabel("lag time t (ps)"); ax.set_ylabel("MSD (Å²)")
    ax.set_title("Self-diffusion", fontsize=10)
    ax.legend(loc="upper left")
    ax.set_xlim(0, 1.05); ax.set_ylim(0, 7)
    ax.set_facecolor("white")
    ann = dict(fontsize=8.5, color=style.PINK, textcoords="figure fraction", annotation_clip=False,
               arrowprops=dict(arrowstyle="-", color=style.PINK, lw=0.9, shrinkA=2, shrinkB=2))
    D, A = "data", "axes fraction"
    ax.annotate("Axes title\nax.set_title", (0.0, 1.07), xycoords=A, xytext=(0.13, 0.885), ha="center", va="center", **ann)
    ax.annotate("legend\nax.legend", (0.02, 0.86), xycoords=A, xytext=(0.13, 0.75), ha="center", va="center", **ann)
    ax.annotate("line\nax.plot(x, y, '-')", (0.95, 5.7), xycoords=D, xytext=(0.87, 0.74), ha="center", va="center", **ann)
    ax.annotate("markers\nax.plot(x, y, 'o')", (t[16], msd[16]), xycoords=D, xytext=(0.87, 0.48), ha="center",
                va="center", **ann)
    ax.annotate("spine", (0.0, 0.62), xycoords=A, xytext=(0.13, 0.64), ha="center", va="center", **ann)
    ax.annotate("y-axis label\nax.set_ylabel", (-0.12, 0.42), xycoords=A, xytext=(0.13, 0.42), ha="center",
                va="center", **ann)
    ax.annotate("tick and tick label\nax.set_xticks", (0.19, -0.07), xycoords=A, xytext=(0.13, 0.12), ha="center",
                va="center", **ann)
    ax.annotate("x-axis label\nax.set_xlabel", (0.72, -0.19), xycoords=A, xytext=(0.87, 0.16), ha="center",
                va="center", **ann)
    fig.text(0.985, 0.96, "Figure: the whole canvas  (fig, ax = plt.subplots())", ha="right", fontsize=8.5,
             color=style.INK2)
    fig.text(0.985, 0.90, "Axes: one plot with its own coordinates", ha="right", fontsize=8.5, color=style.INK2)
    style.save(fig, SLUG, "anatomy", pad=0.05)


# ---------------------------------------------------------------------------------------------
# Cover: scattered data points, a fitted line through them and an error band
# ---------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        rng = np.random.default_rng(5)
        x = np.linspace(0.5, 3.5, 9)
        y = 0.6 + 0.55 * x + rng.normal(0, 0.12, x.size)
        m, b = np.polyfit(x, y, 1)
        xx = np.linspace(0.25, 3.75, 50)
        ax.fill_between(xx, m * xx + b - 0.28, m * xx + b + 0.28, color=style.TEAL, alpha=0.25, lw=0)
        ax.plot(xx, m * xx + b, color=style.TEAL, lw=5, solid_capstyle="round")
        for xi, yi in zip(x, y):
            ax.add_patch(plt.Circle((xi, yi), 0.14, fc=style.ORANGE, ec=style.INK, lw=2.0, zorder=5))
            ax.plot([xi, xi], [yi, m * xi + b], color=style.PINK, lw=2.4, zorder=4)
        ax.plot([0.25, 3.75], [0.3, 0.3], color=style.INK, lw=3)
        ax.plot([0.25, 0.25], [0.3, 2.85], color=style.INK, lw=3)
    style.cover(SLUG, draw, bg=style.TINT[style.GOLD])


if __name__ == "__main__":
    pipeline()
    print("residuals:", residuals())
    print("ellipse:", ellipse())
    anatomy()
    cover()
