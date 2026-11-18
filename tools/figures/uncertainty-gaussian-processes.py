"""Figures for content/learn/uncertainty-gaussian-processes.md.
Run: python3 tools/figures/uncertainty-gaussian-processes.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from math import erf
import style
plt = style.setup()
SLUG = "uncertainty-gaussian-processes"


def rbf(a, b, ell=1.0, sf=1.0):
    return sf ** 2 * np.exp(-0.5 * (a[:, None] - b[None, :]) ** 2 / ell ** 2)


def conditioning():
    """Kernel correlation against distance, and conditioning a two-point joint Gaussian on one observation."""
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.4), gridspec_kw=dict(wspace=0.35, width_ratios=[1, 1]))
    a = axs[0]
    r = np.linspace(0, 3.5, 300)
    a.plot(r, np.exp(-r ** 2 / 2), color=style.VIOLET)
    for d in (0.5, 1.0, 2.0):
        c = np.exp(-d ** 2 / 2)
        a.plot([d, d], [0, c], color=style.INK3, lw=0.8, ls=(0, (2, 2)))
        a.plot(d, c, "o", color=style.VIOLET, ms=6)
        a.text(d + 0.08, c + 0.04, f"{c:.2f}", fontsize=9, color=style.INK2)
    a.set_xlim(0, 3.5); a.set_ylim(0, 1.1)
    a.set_xlabel("distance $|x - x'|$ in units of ℓ"); a.set_ylabel("correlation of $f(x)$ and $f(x')$")
    a.set_title("what the RBF kernel assumes")
    a = axs[1]
    sn2 = 0.01; rho = np.exp(-0.5)                       # observation at x = 0, prediction at x = 1, l = 1
    C = np.array([[1 + sn2, rho], [rho, 1.0]])
    g = np.linspace(-3, 3, 120); Y, F = np.meshgrid(g, g)
    Ci = np.linalg.inv(C)
    Q = Ci[0, 0] * Y ** 2 + 2 * Ci[0, 1] * Y * F + Ci[1, 1] * F ** 2
    a.contourf(Y, F, Q, levels=[0, 1, 4, 9], colors=[style.TINT[style.VIOLET], "#e2d8fd", "#f6f2ff"])
    a.contour(Y, F, Q, levels=[1, 4, 9], colors=[style.VIOLET], linewidths=0.8)
    y1 = 1.0
    mu = rho / (1 + sn2) * y1; sd = np.sqrt(1 - rho ** 2 / (1 + sn2))
    a.axvline(y1, color=style.ORANGE, lw=1.6)
    ff = np.linspace(-3, 3, 300)
    dens = np.exp(-0.5 * (ff - mu) ** 2 / sd ** 2)
    a.fill_betweenx(ff, y1, y1 + 0.9 * dens, color=style.ORANGE, alpha=0.25, lw=0)
    a.plot(y1 + 0.9 * dens, ff, color=style.ORANGE, lw=1.4)
    a.plot([y1, y1 + 0.9], [mu, mu], color=style.ORANGE, lw=1.0)
    box = dict(fc="white", ec="none", pad=1.2, alpha=0.9)
    a.text(y1 + 0.95, mu - 0.75, f"mean {mu:.2f}\nsd {sd:.2f}", fontsize=9, color=style.ORANGE, va="center", bbox=box)
    a.text(y1 - 0.12, -2.7, "observe $y(0) = 1$", fontsize=9, color=style.ORANGE, ha="right", bbox=box)
    a.text(-2.85, 2.6, f"prior correlation {rho / np.sqrt(1 + sn2):.2f}", fontsize=9, color=style.VIOLET)
    a.set_xlim(-3, 3); a.set_ylim(-3, 3); a.set_aspect("equal")
    a.set_xlabel("observation $y$ at $x = 0$"); a.set_ylabel("$f$ at $x = 1$")
    a.set_title("conditioning = slicing")
    style.save(fig, SLUG, "conditioning")
    return mu, sd


def kernels():
    """Samples from three kernels with the same length-scale."""
    x = np.linspace(0, 6, 400)
    d = np.abs(x[:, None] - x[None, :])
    K = {"squared exponential (RBF)": np.exp(-0.5 * d ** 2),
         "Matérn 3/2": (1 + np.sqrt(3) * d) * np.exp(-np.sqrt(3) * d),
         "periodic, period 2": np.exp(-2 * np.sin(np.pi * d / 2) ** 2)}
    words = ["infinitely smooth", "rough: once differentiable", "repeats exactly"]
    fig, axs = plt.subplots(1, 3, figsize=(7.2, 2.7), sharey=True, gridspec_kw=dict(wspace=0.08))
    rng = np.random.default_rng(4)
    z = rng.normal(size=(len(x), 3))
    for ax, (name, k), w in zip(axs, K.items(), words):
        Lc = np.linalg.cholesky(k + 1e-8 * np.eye(len(x)))
        for j, c in enumerate([style.VIOLET, style.TEAL, style.ORANGE]):
            ax.plot(x, Lc @ z[:, j], color=c, lw=1.4)
        ax.set_title(name, fontsize=9.5)
        ax.text(0.03, 0.04, w, transform=ax.transAxes, fontsize=8.5, color=style.INK2)
        ax.set_xlim(0, 6); ax.set_ylim(-3.2, 3.2); ax.set_xlabel("input $x$ (length-scale 1)")
    axs[0].set_ylabel("sample $f(x)$")
    style.save(fig, SLUG, "kernels")


def evidence():
    """Log marginal likelihood of the chapter's 12-point example against the length-scale."""
    rng = np.random.default_rng(1)
    X = rng.uniform(0, 10, 12)
    y = np.sin(1.1 * X) + 0.35 * np.cos(2.7 * X) + 0.08 * X + 0.05 * rng.normal(size=12)
    yn = (y - y.mean()) / y.std()                       # normalize_y=True in scikit-learn
    sf2, sn2 = 1.08 ** 2, 0.00489                       # fitted values printed in the chapter
    ells = np.logspace(np.log10(0.05), np.log10(20), 400)
    fit, comp = [], []
    for ell in ells:
        Ky = rbf(X, X, ell, np.sqrt(sf2)) + sn2 * np.eye(12)
        Lc = np.linalg.cholesky(Ky)
        al = np.linalg.solve(Lc.T, np.linalg.solve(Lc, yn))
        fit.append(-0.5 * yn @ al); comp.append(-np.sum(np.log(np.diag(Lc))))
    fit, comp = np.array(fit), np.array(comp)
    tot = fit + comp - 6 * np.log(2 * np.pi)
    i = np.argmax(tot)
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    ax.semilogx(ells, fit, color=style.ORANGE)
    ax.semilogx(ells, comp, color=style.TEAL)
    ax.semilogx(ells, tot, color=style.VIOLET, lw=3)
    ax.plot(ells[i], tot[i], "o", color=style.VIOLET, ms=7)
    ax.annotate(f"maximum at ℓ = {ells[i]:.2f}", (ells[i], tot[i]), xytext=(ells[i] * 0.3, tot[i] - 22),
                fontsize=9, color=style.VIOLET, ha="center",
                arrowprops=dict(arrowstyle="-", color=style.VIOLET, lw=0.8, shrinkB=5))
    ax.text(0.06, 22, "complexity penalty $-\\frac{1}{2}\\ln|\\mathbf{K}_y|$\nrewards long length-scales", color=style.TEAL, fontsize=9)
    j = np.argmin(abs(fit + 30))
    ax.annotate("data fit $-\\frac{1}{2}\\mathbf{y}^{\\top}\\mathbf{K}_y^{-1}\\mathbf{y}$\npunishes long length-scales",
                (ells[j], fit[j]), xytext=(3.0, -40), color=style.ORANGE, fontsize=9, ha="left",
                arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.8, shrinkB=3))
    ax.text(0.06, -12, "log marginal likelihood", color=style.VIOLET, fontsize=9)
    ax.axhline(0, color=style.LINE, lw=0.8, zorder=0)
    ax.set_ylim(-60, 40); ax.set_xlim(0.05, 20)
    ax.set_xlabel("length-scale ℓ (σ$_f$ and σ$_n$ held at their fitted values)")
    ax.set_ylabel("log probability (nats)")
    style.save(fig, SLUG, "evidence")
    return ells[i], tot[i]


def calibration():
    """Coverage of GP credible intervals: right length-scale against too long and too short."""
    rng = np.random.default_rng(0)
    ell_true, sn = 1.0, 0.1
    xg = np.linspace(0, 8, 160)
    levels = np.linspace(0.05, 0.99, 30)
    zq = np.array([np.sqrt(2) * erfinv(p) for p in levels])
    cases = [(1.0, "ℓ = 1, the true value", style.VIOLET), (3.0, "ℓ = 3, too smooth", style.PINK),
             (0.3, "ℓ = 0.3, too wiggly", style.TEAL)]
    hits = {c[0]: np.zeros(len(levels)) for c in cases}; n = 0
    Kg = rbf(xg, xg, ell_true) + 1e-9 * np.eye(len(xg)); Lg = np.linalg.cholesky(Kg)
    for rep in range(300):
        f = Lg @ rng.normal(size=len(xg))
        tr = rng.choice(len(xg), 10, replace=False)
        te = np.setdiff1d(np.arange(len(xg)), tr)
        ytr = f[tr] + sn * rng.normal(size=10); yte = f[te] + sn * rng.normal(size=len(te))
        for ell, _, _ in cases:
            K = rbf(xg[tr], xg[tr], ell) + sn ** 2 * np.eye(10)
            ks = rbf(xg[tr], xg[te], ell)
            A = np.linalg.solve(K, ks)
            mu = A.T @ ytr; sd = np.sqrt(np.maximum(1 - np.sum(ks * A, 0), 0) + sn ** 2)
            z = np.abs(yte - mu) / sd
            hits[ell] += (z[:, None] <= zq[None, :]).sum(0)
        n += len(te)
    fig, ax = plt.subplots(figsize=(5.4, 4.0))
    ax.plot([0, 1], [0, 1], color=style.INK3, lw=1, ls=(0, (3, 3)))
    out = {}
    for ell, name, c in cases:
        cov = hits[ell] / n
        ax.plot(levels, cov, color=c, lw=2.2)
        out[ell] = cov[np.argmin(abs(levels - 0.95))] if False else np.interp(0.95, levels, cov)
    ax.text(0.5, 0.05, "ℓ = 3, over-confident:\ntoo few points inside", color=style.PINK, fontsize=9)
    ax.text(0.04, 0.82, "ℓ = 0.3, under-confident:\ntoo many points inside", color=style.TEAL, fontsize=9)
    ax.text(0.64, 0.5, "ℓ = 1, calibrated", color=style.VIOLET, fontsize=9)
    ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    ax.set_xlabel("nominal coverage of the interval"); ax.set_ylabel("fraction of test points inside")
    style.save(fig, SLUG, "calibration")
    return out


def erfinv(p):
    lo, hi = 0.0, 6.0
    for _ in range(80):
        m = 0.5 * (lo + hi)
        lo, hi = (m, hi) if erf(m) < p else (lo, m)
    return 0.5 * (lo + hi)


def cover():
    def draw(ax):
        xd = np.array([0.6, 1.25, 2.3, 3.35])
        yd = np.array([1.75, 1.2, 1.85, 1.3]) - 1.5
        xs = np.linspace(0, 4, 300)
        ell, sn2 = 0.42, 0.002
        K = rbf(xd, xd, ell, 0.55) + sn2 * np.eye(4); ks = rbf(xd, xs, ell, 0.55)
        A = np.linalg.solve(K, ks)
        mu = A.T @ yd + 1.5; sd = np.sqrt(np.maximum(0.55 ** 2 - np.sum(ks * A, 0), 0) + sn2)
        ax.fill_between(xs, mu - 2 * sd, mu + 2 * sd, color=style.VIOLET, alpha=0.35, lw=0)
        ax.fill_between(xs, mu - sd, mu + sd, color=style.VIOLET, alpha=0.45, lw=0)
        ax.plot(xs, mu, color=style.VIOLET, lw=5)
        ax.scatter(xd, yd + 1.5, s=230, color=style.ORANGE, zorder=5, lw=0)
    style.cover(SLUG, draw, bg=style.TINT[style.VIOLET])


if __name__ == "__main__":
    print("conditioning mean, sd:", conditioning())
    kernels()
    print("evidence max (ell, logML):", evidence())
    print("coverage of nominal 95% intervals:", calibration())
    cover()
