"""Figures for content/learn/gradient-descent.md.  Run: python3 tools/figures/gradient-descent.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import Ellipse
import style
plt = style.setup()
SLUG = "gradient-descent"
LAM = (0.6, 6.0)          # curvatures of the stretched bowl in the chapter's lab


def steps():
    """Gradient descent on the stiff direction of the lab's bowl, L = 3 theta^2, for three step sizes."""
    lam = LAM[1]
    L = lambda t: 0.5 * lam * t ** 2
    cases = [(0.03, "η = 0.03: creeps", style.TEAL), (0.30, "η = 0.30: zig-zags in", style.BLUE),
             (0.35, "η = 0.35: diverges", style.PINK)]
    fig, axs = plt.subplots(1, 3, figsize=(7.2, 2.9), gridspec_kw=dict(wspace=0.12))
    tt = np.linspace(-1.75, 1.75, 300)
    for ax, (eta, title, c) in zip(axs, cases):
        ax.plot(tt, L(tt), color=style.INK3, lw=1.2)
        th = [-1.0]
        for _ in range(8 if eta < 0.34 else 6):
            th.append(th[-1] * (1 - eta * lam))
        th = np.array(th)
        for a, b in zip(th[:-1], th[1:]):
            ax.annotate("", (b, L(b)), (a, L(a)), arrowprops=dict(arrowstyle="-|>", color=c, lw=1.1,
                        shrinkA=3, shrinkB=3, mutation_scale=8))
        ax.plot(th, L(th), "o", color=c, ms=4.5, zorder=3)
        ax.plot(th[0], L(th[0]), "o", mfc="white", mec=c, ms=7, mew=1.5, zorder=4)
        ax.set_title(title, fontsize=9.5)
        ax.set_xlim(-1.8, 1.8); ax.set_ylim(-0.3, 10.5)
        ax.set_xlabel("parameter $\\theta$")
        ax.set_yticks([]) if ax is not axs[0] else ax.set_ylabel("loss $3\\theta^2$")
        ax.text(0.5, 0.9, f"factor $1-\\eta\\lambda$ = {1 - eta * lam:+.2f}", transform=ax.transAxes,
                ha="center", fontsize=8.5, color=style.INK2)
    style.save(fig, SLUG, "steps")


def rate():
    """Per-step contraction factor on the lab's bowl as a function of the learning rate."""
    eta = np.linspace(0, 0.42, 1000)
    f1, f2 = np.abs(1 - eta * LAM[0]), np.abs(1 - eta * LAM[1])
    worst = np.maximum(f1, f2)
    eopt = 2 / sum(LAM); ropt = (LAM[1] - LAM[0]) / (LAM[1] + LAM[0])
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    ax.axvspan(2 / LAM[1], 0.42, color=style.TINT[style.PINK], lw=0, zorder=0)
    ax.axhline(1, color=style.INK3, lw=0.8, ls=(0, (3, 3)))
    ax.plot(eta, f1, color=style.TEAL, lw=1.3)
    ax.plot(eta, f2, color=style.ORANGE, lw=1.3)
    ax.plot(eta, worst, color=style.BLUE, lw=3, zorder=3)
    ax.plot(eopt, ropt, "o", color=style.BLUE, ms=7, zorder=4)
    ax.annotate(f"best fixed step η = 2/(λ$_{{max}}$+λ$_{{min}}$) = {eopt:.3f}\nfactor ({LAM[1]/LAM[0]:.0f}−1)/({LAM[1]/LAM[0]:.0f}+1) = {ropt:.3f} per step",
                (eopt, ropt), xytext=(0.163, 1.33), fontsize=9, color=style.BLUE,
                arrowprops=dict(arrowstyle="-", color=style.BLUE, lw=0.8, shrinkB=5))
    ax.text(0.341, 0.62, "soft direction\nλ = 0.6", color=style.TEAL, fontsize=9)
    ax.text(0.205, 0.10, "stiff direction, λ = 6", color=style.ORANGE, fontsize=9)
    ax.text(0.341, 0.25, "diverges:\nη > 2/λ$_{max}$\n= 1/3", color=style.PINK, fontsize=9, va="center")
    e0 = 0.12; r0 = max(abs(1 - e0 * LAM[0]), abs(1 - e0 * LAM[1]))
    ax.plot(e0, r0, "o", mfc="white", mec=style.INK2, ms=6, zorder=4)
    ax.annotate(f"lab default η = 0.12: {r0:.3f}", (e0, r0), xytext=(0.01, 1.3), fontsize=9, color=style.INK2,
                va="center", arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=4))
    ax.set_xlim(0, 0.42); ax.set_ylim(0, 1.5)
    ax.set_xlabel("learning rate η"); ax.set_ylabel("error kept per step, $|1-\\eta\\lambda|$")
    style.save(fig, SLUG, "rate")


def kappa():
    """Iterations needed to shrink the error a millionfold, plain gradient descent against heavy-ball momentum."""
    k = np.logspace(0.05, 8, 400)
    n_gd = np.log(1e6) / -np.log((k - 1) / (k + 1))
    n_hb = np.log(1e6) / -np.log((np.sqrt(k) - 1) / (np.sqrt(k) + 1))
    fig, ax = plt.subplots(figsize=(7.2, 3.5))
    ax.loglog(k, n_gd, color=style.ORANGE)
    ax.loglog(k, n_hb, color=style.TEAL)
    ax.text(1e3, 1e6, "gradient descent, best fixed step:\ngrows as κ", color=style.ORANGE, fontsize=9, ha="center")
    ax.text(3e5, 9e1, "heavy-ball momentum, tuned:\ngrows as √κ", color=style.TEAL, fontsize=9, ha="center")
    marks = [(10, "lab bowl, κ = 10:"), (3.78e7, "Arrhenius fit, raw 1/T, κ = 3.8 × 10$^7$:")]
    out = []
    for kk, lab in marks:
        a = np.log(1e6) / -np.log((kk - 1) / (kk + 1)); b = np.log(1e6) / -np.log((np.sqrt(kk) - 1) / (np.sqrt(kk) + 1))
        out.append((kk, a, b))
        ax.plot([kk, kk], [b, a], color=style.INK3, lw=0.8, ls=(0, (2, 2)))
        ax.plot(kk, a, "o", color=style.ORANGE, ms=6); ax.plot(kk, b, "o", color=style.TEAL, ms=6)
        ax.text(kk * (1.4 if kk < 100 else 0.7), 6 if kk < 100 else 2.5e5, lab + f"\n{a:,.0f} vs {b:,.0f} steps",
                fontsize=8.5, color=style.INK2, ha="left" if kk < 100 else "right", va="center")
    ax.set_xlim(1, 1e8); ax.set_ylim(1, 1e9)
    ax.set_xlabel("condition number κ = λ$_{max}$/λ$_{min}$")
    ax.set_ylabel("iterations to reduce\nthe error 10$^6$-fold")
    style.save(fig, SLUG, "kappa")
    return out


def sgd():
    """Mini-batch SGD on a least-squares problem: a noise floor set by the learning rate, removed by decay."""
    rng = np.random.default_rng(3)
    N, B, R, T = 2000, 16, 24, 20000
    X = np.column_stack([np.ones(N), rng.normal(size=(N, 3))])
    y = X @ np.array([0.5, 1.0, -2.0, 0.7]) + 0.5 * rng.normal(size=N)
    th_star = np.linalg.lstsq(X, y, rcond=None)[0]
    H = X.T @ X / N
    runs = [("constant η = 0.05", lambda t: 0.05, style.ORANGE),
            ("constant η = 0.01", lambda t: 0.01, style.BLUE),
            ("η = 0.05/(1 + t/100)", lambda t: 0.05 / (1 + t / 100), style.TEAL)]
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    t_all = np.arange(1, T + 1)
    out = {}
    for name, sched, c in runs:
        r2 = np.random.default_rng(11)
        th = np.zeros((R, 4)); mean = np.empty(T); one = np.empty(T)
        for t in range(T):
            idx = r2.integers(0, N, (R, B))
            Xb, yb = X[idx], y[idx]                                   # R replicas, independent batches
            g = 2 * np.einsum("rbi,rb->ri", Xb, np.einsum("rbi,ri->rb", Xb, th) - yb) / B
            th -= sched(t) * g
            e = th - th_star
            ex = np.einsum("ri,ij,rj->r", e, H, e)                  # excess mean squared error
            mean[t], one[t] = ex.mean(), ex[0]
        keep = np.unique(np.logspace(0, np.log10(T), 600).astype(int)) - 1
        ax.loglog(t_all[keep], one[keep], color=c, lw=0.6, alpha=0.35, rasterized=True)
        ax.loglog(t_all[keep], mean[keep], color=c, lw=2.2)
        out[name] = mean[-1]
        ax.text(T * 1.25, mean[-1], name, color=c, fontsize=9, va="center", clip_on=False)
    ax.set_xlim(1, T); ax.set_ylim(1e-5, 30)
    ax.set_xlabel("iteration (mini-batches of 16 from 2,000 points)")
    ax.set_ylabel("excess loss $L(\\theta_t) - L(\\theta^*)$")
    ax.text(1.5, 2e-5, "thick: average of 24 independent runs;  thin: one run", color=style.INK2, fontsize=9)
    style.save(fig, SLUG, "sgd")
    return out


def cover():
    def draw(ax):
        c, s = np.cos(0.5), np.sin(0.5)
        cx, cy = 2.15, 1.5
        cols = [style.TINT[style.VIOLET], "#ddd2fd", "#c9b8fb", "#b39cf9", "#9f83f8"]
        for i, w in enumerate([3.9, 3.0, 2.15, 1.35, 0.6]):
            ax.add_patch(Ellipse((cx, cy), w, w / 3.2, angle=np.degrees(0.5), color=cols[i], lw=0))
        # gradient descent on 0.5*(0.6u^2 + 6v^2) in rotated coordinates, eta = 0.3
        u, v = -1.75, 0.27
        pts = []
        for _ in range(12):
            pts.append((cx + c * u - s * v, cy + s * u + c * v))
            u, v = u * (1 - 0.3 * 0.6), v * (1 - 0.3 * 6) * 1.0
        pts = np.array(pts)
        ax.plot(pts[:, 0], pts[:, 1], color=style.ORANGE, lw=4, solid_joinstyle="round", zorder=3)
        ax.scatter(pts[:, 0], pts[:, 1], s=60, color=style.ORANGE, zorder=4, lw=0)
        ax.scatter([pts[0, 0]], [pts[0, 1]], s=240, color=style.ORANGE, zorder=5, lw=0)
        ax.scatter([cx], [cy], s=170, color=style.INK, zorder=5, lw=0)
    style.cover(SLUG, draw, bg=style.TINT[style.ORANGE])


if __name__ == "__main__":
    steps(); rate()
    print("kappa marks (kappa, gd, heavy ball):", kappa())
    print("SGD floors:", sgd())
    cover()
