"""Figures for content/learn/active-learning.md.  Run: python3 tools/figures/active-learning.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Rectangle
import style
plt = style.setup()
SLUG = "active-learning"


def box(ax, x, y, w, h, title, sub, color):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0,rounding_size=0.12",
                                fc=style.TINT[color], ec=color, lw=1.3))
    ax.text(x, y + 0.3, title, ha="center", va="center", fontsize=10, weight="semibold", color=style.INK)
    ax.text(x, y - 0.16, sub, ha="center", va="center", fontsize=8.5, color=style.INK2, linespacing=1.25)


def arrow(ax, p, q, color=style.INK3, rad=0.0, lw=1.5):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=12, color=color, lw=lw,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=3, shrinkB=3))


# ---------------------------------------------------------------- 1. the committee loop for a potential
def loop():
    fig, ax = plt.subplots(figsize=(7.2, 4.6))
    ax.set_xlim(0, 10.6); ax.set_ylim(0, 6.4); ax.axis("off")
    W, H = 3.0, 1.25
    box(ax, 1.7, 5.4, W, H, "Seed", "about 100 DFT structures:\nstrained, rattled, short AIMD", style.TEAL)
    box(ax, 5.3, 5.4, W, H, "Train committee", "four models,\ndifferent random seeds", style.BLUE)
    box(ax, 8.9, 5.4, W, H, "Explore", "MD at many T and p\nwith the current model", style.BLUE)
    box(ax, 8.9, 3.3, W, H, "Score every frame", "force deviation εF,\nlargest over atoms", style.VIOLET)
    box(ax, 1.7, 1.2, W, H, "Label with DFT", "a diverse subset of\nat most a few hundred", style.ORANGE)
    arrow(ax, (3.2, 5.4), (3.8, 5.4)); arrow(ax, (6.8, 5.4), (7.4, 5.4))
    arrow(ax, (8.9, 4.77), (8.9, 3.93))
    arrow(ax, (1.7, 1.83), (4.3, 4.77), rad=-0.2, color=style.ORANGE)
    ax.text(2.5, 3.3, "add to the data\nand retrain", fontsize=8.5, color=style.ORANGE, ha="left")
    x0, x1, yb = 6.3, 10.5, 1.25
    arrow(ax, (8.9, 2.67), (8.9, yb + 0.6))
    segs = [(x0, 7.6, style.TEAL, "accurate", "skip"), (7.6, 9.3, style.ORANGE, "candidate", "send to DFT"),
            (9.3, x1, style.PINK, "failed", "skip")]
    for a_, b_, c, lab, act in segs:
        ax.add_patch(Rectangle((a_, yb - 0.18), b_ - a_, 0.36, color=c, alpha=0.85, lw=0))
        ax.text((a_ + b_) / 2, yb + 0.33, lab, fontsize=8.5, color=c, ha="center", weight="semibold")
        ax.text((a_ + b_) / 2, yb - 0.45, act, fontsize=8.5, color=style.INK2, ha="center")
    for xv, lab in ((7.6, "εlo"), (9.3, "εhi")):
        ax.plot([xv, xv], [yb - 0.62, yb - 0.2], color=style.INK3, lw=0.8)
        ax.text(xv, yb - 0.85, lab, fontsize=8.5, color=style.INK2, ha="center")
    arrow(ax, (6.2, yb), (3.25, yb), color=style.ORANGE)
    ax.text(4.75, yb + 0.12, "candidates only", fontsize=8.5, color=style.ORANGE, ha="center", va="bottom")
    ax.text(5.3, 0.0, "stop when about 99 per cent of frames are accurate for two or three rounds",
            fontsize=8.5, color=style.INK3, ha="center")
    style.save(fig, SLUG, "loop")


# ---------------------------------------------------------------- 2. the miniature campaign of the Python cell
def dft(r):
    return 2.0 * (1 - np.exp(-1.8 * (r - 1.2))) ** 2 - 2.0


CENTRES = np.linspace(0.6, 2.6, 21)


def predict(x, where):
    out = []
    for width in (0.15, 0.2, 0.25, 0.3, 0.35):
        A = lambda r: np.exp(-((r[:, None] - CENTRES) / width) ** 2)
        c = np.linalg.solve(A(x).T @ A(x) + 1e-3 * np.eye(len(CENTRES)), A(x).T @ dft(x))
        out.append(A(where) @ c)
    return np.array(out)


def campaign():
    rng = np.random.default_rng(0)                      # identical to the cell in the chapter
    grid = np.linspace(0.8, 2.4, 1601)
    w = np.exp(-(dft(grid) + 2) / 0.3)
    pool = rng.choice(grid, 2000, p=w / w.sum())
    x = np.array([1.15, 1.25, 1.35])
    hist = []
    while True:
        P = predict(x, pool)
        spread, err = P.std(0).max(), np.abs(P.mean(0) - dft(pool)).max()
        hist.append((len(x), spread, err))
        if spread <= 0.02:
            break
        x = np.append(x, pool[np.argmax(P.std(0))])
    hist = np.array(hist)
    rand = []
    for n in hist[:, 0].astype(int):
        rand.append(np.median([np.abs(predict(s, pool).mean(0) - dft(pool)).max()
                               for s in (rng.choice(pool, n, replace=False) for _ in range(50))]))
    print("committee picks", np.round(x[3:], 2), "n =", len(x))
    print("spread", np.round(hist[:, 1], 3)); print("error", np.round(hist[:, 2], 3)); print("random", np.round(rand, 3))

    fig = plt.figure(figsize=(7.2, 3.8))
    gs = fig.add_gridspec(2, 2, width_ratios=[1.25, 1], height_ratios=[3, 1], hspace=0.08, wspace=0.38)
    a1 = fig.add_subplot(gs[0, 0]); h1 = fig.add_subplot(gs[1, 0], sharex=a1); a2 = fig.add_subplot(gs[:, 1])
    rr = np.linspace(0.8, 2.42, 400)
    h1.hist(pool, bins=np.linspace(0.8, 2.4, 41), color=style.TINT[style.BLUE], ec=style.BLUE, lw=0.6)
    h1.set_yscale("log"); h1.set_ylabel("frames"); h1.set_xlabel("bond length (Å)")
    h1.set_yticks([1, 10, 100]); h1.set_ylim(0.8, 3000)
    h1.text(2.42, 400, "pool of 2,000 hot-MD frames", fontsize=8.5, color=style.BLUE, ha="right")
    for xi in x[3:]:
        h1.axvline(xi, color=style.ORANGE, lw=0.9, alpha=0.8)
    a1.tick_params(labelbottom=False)
    a1.plot(rr, dft(rr), color=style.INK2, lw=1.6)
    a1.plot(x[:3], dft(x[:3]), "o", color=style.INK3, ms=5)
    for k, xi in enumerate(x[3:]):
        a1.plot(xi, dft(xi), "o", color=style.ORANGE, ms=6.5, mec="white", mew=0.8, zorder=4)
        a1.text(xi, dft(xi) + 0.12, str(k + 1), fontsize=8.5, color=style.ORANGE, ha="center", va="bottom")
    a1.set_xlim(0.78, 2.45); a1.set_ylim(-2.45, 0.25)
    a1.set_ylabel("energy (eV)")
    a1.set_title("Where the committee asks")
    a1.text(1.3, -0.5, "numbers: order\nof the 8 queries", fontsize=8.5, color=style.ORANGE)
    a1.text(1.25, -2.38, "3 seed calculations", fontsize=8.5, color=style.INK2, ha="center", va="bottom")

    n = hist[:, 0]
    a2.semilogy(n, rand, "o-", color=style.INK3, ms=4, lw=1.5)
    a2.semilogy(n, hist[:, 2], "o-", color=style.ORANGE, ms=4)
    a2.semilogy(n, hist[:, 1], "o--", color=style.VIOLET, ms=3.5, lw=1.5)
    a2.axhline(0.02, color=style.VIOLET, lw=0.8, ls=":")
    a2.text(11.1, rand[-1] * 1.15, "random:\ntrue worst error", fontsize=8.5, color=style.INK2, ha="right", va="bottom")
    a2.text(9.0, 0.075, "committee:\ntrue worst error", fontsize=8.5, color=style.ORANGE, ha="left", va="bottom")
    a2.text(3.2, 0.014, "committee spread; stop below 0.02 eV", fontsize=8.5, color=style.VIOLET, va="top")
    a2.set_xlim(2.6, 11.4); a2.set_ylim(0.008, 3)
    a2.set_xticks(range(3, 12))
    a2.set_xlabel("DFT calculations"); a2.set_ylabel("largest error on the pool (eV)")
    a2.set_title("Error as the budget grows")
    style.save(fig, SLUG, "campaign")


# ---------------------------------------------------------------- 3. GP variance ignores the labels
def gp_labels():
    def k(a, b, ell=0.12):
        return np.exp(-0.5 * (a[:, None] - b[None, :]) ** 2 / ell ** 2)
    X = np.array([0.05, 0.22, 0.4, 0.62, 0.8, 0.95])
    xs = np.linspace(0, 1, 500)
    smooth = lambda x: 0.6 * np.sin(2 * np.pi * x)
    rough = lambda x: 0.6 * np.sin(2 * np.pi * x) + 0.35 * np.sin(23 * x)
    K = k(X, X) + 1e-6 * np.eye(len(X)); Ks = k(xs, X)
    var = 1 - np.einsum("ij,ji->i", Ks, np.linalg.solve(K, Ks.T))
    sd = np.sqrt(np.maximum(var, 0))
    fig, axes = plt.subplots(1, 2, figsize=style.WIDE, sharey=True, gridspec_kw={"wspace": 0.12})
    for ax, f, name, col in zip(axes, (smooth, rough), ("Smooth target", "Rough target, same inputs"),
                                (style.BLUE, style.PINK)):
        mu = Ks @ np.linalg.solve(K, f(X))
        ax.fill_between(xs, mu - 2 * sd, mu + 2 * sd, color=style.TINT[style.BLUE], lw=0)
        ax.plot(xs, f(xs), color=style.INK3, lw=1.3, ls=(0, (4, 3)))
        ax.plot(xs, mu, color=col, lw=2)
        ax.plot(X, f(X), "o", color=style.INK, ms=5)
        err = np.abs(mu - f(xs)).max()
        ax.set_title(name)
        ax.text(0.02, -1.42, f"band half-width at most {2 * sd.max():.2f}\nlargest true error {err:.2f}",
                fontsize=8.5, color=style.INK2, va="bottom")
        ax.set_xlabel("input $x$"); ax.set_xlim(0, 1); ax.set_ylim(-1.45, 1.35)
        print(name, "max 2sd", round(2 * sd.max(), 3), "max err", round(err, 3))
    axes[0].set_ylabel("property")
    axes[0].text(0.3, 1.1, "dashed: truth   solid: GP mean\nshaded: ±2σ", fontsize=8.5, color=style.INK2,
                 bbox=dict(fc="white", ec="none", alpha=0.85, pad=1.5))
    style.save(fig, SLUG, "gp-labels")


# ---------------------------------------------------------------- cover: a committee that disagrees
def cover():
    def draw(ax):
        x = np.linspace(0.3, 3.7, 300)
        base = 1.45 + 0.35 * np.sin(1.6 * x)
        spread = np.exp(-((x - 1.6) / 0.55) ** 2) * 0.12 + np.exp(-((x - 3.2) / 0.35) ** 2) * 0.95
        for k, c in zip((-2, -1, 0, 1, 2), (style.BLUE, style.TEAL, style.VIOLET, style.GOLD, style.PINK)):
            ax.plot(x, base + k * spread * 0.5, color=c, lw=5, solid_capstyle="round")
        ax.add_patch(Circle((3.2, 1.45 + 0.35 * np.sin(1.6 * 3.2)), 0.68, fill=False, ec=style.ORANGE, lw=6, zorder=5))
    style.cover(SLUG, draw, bg=style.TINT[style.ORANGE])


if __name__ == "__main__":
    loop(); campaign(); gp_labels(); cover()
