"""Figures for content/learn/mlip.md.  Run: python3 tools/figures/mlip.py"""
import os, sys
os.environ.setdefault("OPENBLAS_NUM_THREADS", "4")       # small dense solves are slower with many threads
os.environ.setdefault("OMP_NUM_THREADS", "4")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
plt = style.setup()
SLUG = "mlip"


def V(x, y):
    """A two-dimensional double well standing in for a potential energy surface (units of kBT)."""
    return 2.5 * (x ** 2 - 1) ** 2 + 3.0 * (y - 0.3 * x ** 2) ** 2


def gradV(x, y):
    gx = 10.0 * x * (x ** 2 - 1) - 3.6 * x * (y - 0.3 * x ** 2)
    gy = 6.0 * (y - 0.3 * x ** 2)
    return gx, gy


def trajectory(n_steps=200_000, dt=2e-3, every=20, seed=1):
    """Overdamped Langevin dynamics at kBT = 1; one frame saved every 20 steps."""
    rng = np.random.default_rng(seed)
    x, y = -1.0, 0.3
    out = []
    noise = rng.normal(size=(n_steps, 2)) * np.sqrt(2 * dt)
    for k in range(n_steps):
        gx, gy = gradV(x, y)
        x += -gx * dt + noise[k, 0]
        y += -gy * dt + noise[k, 1]
        if k % every == 0:
            out.append((x, y))
    return np.array(out)


def fps(X, n, start=0):
    """Farthest-point sampling: each new point is the one farthest from all points chosen so far."""
    chosen = [start]
    d = np.linalg.norm(X - X[start], axis=1)
    for _ in range(n - 1):
        k = int(np.argmax(d)); chosen.append(k)
        d = np.minimum(d, np.linalg.norm(X - X[k], axis=1))
    return np.array(chosen)


def coverage(X, idx):
    """Largest distance from any frame to its nearest selected frame (smaller is better)."""
    d = np.min(np.linalg.norm(X[:, None, :] - X[idx][None], axis=2), axis=1)
    return d.max()


def selection():
    X = trajectory()
    n = 30
    consecutive = np.arange(n)                           # the first 30 saved frames
    rng = np.random.default_rng(0)
    random_pick = rng.choice(len(X), n, replace=False)
    far = fps(X, n)
    rc, rr, rf = coverage(X, consecutive), np.mean([coverage(X, rng.choice(len(X), n, replace=False)) for _ in range(20)]), coverage(X, far)
    print(f"{len(X)} frames; coverage radius: consecutive {rc:.2f}, random (mean of 20) {rr:.2f}, FPS {rf:.2f}")
    print(f"fraction of frames with x > 0: {np.mean(X[:, 0] > 0):.2f}")
    gx, gy = np.meshgrid(np.linspace(-2.0, 2.0, 200), np.linspace(-1.2, 1.9, 160))
    fig, axes = plt.subplots(1, 2, figsize=(7.2, 3.8), sharey=True, gridspec_kw={"wspace": 0.08})
    for ax, idx, title, col, r in ((axes[0], consecutive, "30 consecutive frames", style.ORANGE, rc),
                                   (axes[1], far, "30 frames by farthest-point sampling", style.TEAL, rf)):
        ax.contour(gx, gy, V(gx, gy), levels=[0.5, 1.5, 3, 5, 8], colors=style.INK3, linewidths=0.6, alpha=0.6)
        ax.scatter(X[::2, 0], X[::2, 1], s=1.5, color=style.BLUE, alpha=0.18, lw=0, rasterized=True)
        ax.scatter(X[idx, 0], X[idx, 1], s=26, color=col, edgecolor="white", lw=0.8, zorder=3)
        ax.set_title(title, fontsize=10)
        ax.text(0.5, 0.03, f"largest gap: {r:.2f}", transform=ax.transAxes, fontsize=8.5, color=col, ha="center")
        ax.set_xlim(-2.0, 2.0); ax.set_ylim(-1.75, 1.95)
        ax.set_xlabel("coordinate 1 (descriptor space)")
    axes[0].set_ylabel("coordinate 2")
    style.save(fig, SLUG, "selection")


def learning_curve():
    """Kernel ridge regression of the energy of a Lennard-Jones argon trimer, with clean and with noisy labels."""
    rng = np.random.default_rng(0)
    eps, sig = 10.3, 3.4                                  # meV, angstrom
    def sample(n):
        P1 = rng.uniform(3.2, 6.5, 12 * n)
        P2 = np.c_[rng.uniform(-3, 8, 12 * n), rng.uniform(0, 6.5, 12 * n)]
        d = np.c_[P1, np.hypot(P2[:, 0], P2[:, 1]), np.hypot(P2[:, 0] - P1, P2[:, 1])]
        return d[(d.min(1) > 3.2) & (d.max(1) < 6.5)][:n]
    lj = lambda r: 4 * eps * ((sig / r) ** 12 - (sig / r) ** 6)
    feat = lambda D: np.sort(1 / D, axis=1)               # invariant to permutations of the atoms
    Dtr, Dte = sample(2048), sample(1000)
    Etr, Ete = lj(Dtr).sum(1), lj(Dte).sum(1)
    Xtr, Xte = feat(Dtr), feat(Dte)
    sq = lambda A, B: (A ** 2).sum(1)[:, None] + (B ** 2).sum(1)[None] - 2 * A @ B.T
    def krr(X, y, Xt, ell=0.06, lam=1e-6):
        K, Kt = np.exp(-sq(X, X) / (2 * ell ** 2)), np.exp(-sq(Xt, X) / (2 * ell ** 2))
        m = y.mean()
        return Kt @ np.linalg.solve(K + lam * np.eye(len(X)), y - m) + m
    N = np.array([16, 32, 64, 128, 256, 512, 1024, 2048])
    fig, ax = plt.subplots(figsize=style.WIDE)
    r2 = np.random.default_rng(1)
    curves = {}
    for noise, col in ((0.0, style.BLUE), (0.3, style.ORANGE)):
        ytr, yte = Etr + noise * r2.normal(size=len(Etr)), Ete + noise * r2.normal(size=len(Ete))
        lam = max(noise ** 2, 1e-6) / Etr.var()
        err = np.array([np.sqrt(np.mean((krr(Xtr[:n], ytr[:n], Xte, lam=lam) - yte) ** 2)) for n in N])
        curves[noise] = err
        ax.loglog(N, err, color=col, marker="o", ms=5)
        print(f"noise {noise} meV: test RMSE", np.round(err, 3))
    slope = np.polyfit(np.log(N[1:6]), np.log(curves[0.0][1:6]), 1)[0]
    print(f"clean slope between N = 32 and 512: {slope:.2f}; energy spread (std) {Ete.std():.1f} meV")
    ax.axhline(0.3, color=style.ORANGE, lw=1, ls="--")
    ax.text(17, 0.33, "noise in the reference labels: 0.3 meV", color=style.ORANGE, fontsize=9, va="bottom")
    ax.text(300, 0.012, "clean labels", color=style.BLUE, fontsize=9, ha="right")
    ax.text(1400, 1.3, "labels with 0.3 meV noise", color=style.ORANGE, fontsize=9, ha="right", va="bottom")
    ax.set_xlabel("training structures N")
    ax.set_ylabel("test RMSE (meV per trimer)")
    ax.set_xticks(N, [str(n) for n in N])
    ax.minorticks_off()
    ax.set_ylim(0.003, 12)
    style.save(fig, SLUG, "learning-curve")


def box(ax, x, y, w, h, title, body, col):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.02,rounding_size=0.12",
                                fc=style.TINT[col], ec=col, lw=1.3))
    ax.text(x, y + h / 2 - 0.2, title, ha="center", va="top", fontsize=9.5, fontweight="semibold", color=style.INK)
    ax.text(x, y + h / 2 - 0.62, body, ha="center", va="top", fontsize=8, color=style.INK2, linespacing=1.25)


def arrow(ax, p, q, rad=0.0, col=style.INK3, ls="-"):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=12, color=col, lw=1.5, linestyle=ls,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=3, shrinkB=3))


def workflow():
    """The loop that builds a potential, and the validation ladder that decides when to stop."""
    fig, ax = plt.subplots(figsize=(7.2, 4.6))
    ax.set_xlim(0, 15.6); ax.set_ylim(0.4, 9.2); ax.set_aspect("equal"); ax.axis("off")
    W, H = 4.3, 2.2
    box(ax, 2.3, 7.6, W, H, "1  Sample", "phases, strains,\nrattled and hot MD,\ndefects, surfaces", style.BLUE)
    box(ax, 7.4, 7.6, W, H, "2  Label", "one DFT setup:\nfunctional, cutoff,\nk-points, smearing", style.VIOLET)
    box(ax, 7.4, 4.25, W, H, "3  Train ensemble", "energies, forces,\nstresses; early\nstopping", style.TEAL)
    box(ax, 2.3, 4.25, W, H, "4  Simulate", "production-like MD;\nflag frames where\nmodels disagree", style.ORANGE)
    arrow(ax, (4.5, 7.6), (5.2, 7.6))
    arrow(ax, (7.4, 6.47), (7.4, 5.38))
    arrow(ax, (5.2, 4.25), (4.5, 4.25))
    arrow(ax, (2.3, 5.38), (2.3, 6.47))
    ax.text(2.05, 5.92, "uncertain\nframes", ha="right", va="center", fontsize=8, color=style.ORANGE)
    # validation ladder
    x0 = 13.2
    ax.text(x0, 8.85, "Validation ladder", ha="center", va="center", fontsize=10, fontweight="semibold", color=style.INK)
    rungs = [("test RMSE, independent runs", style.INK3), ("E–V curve, elastics, phonons", style.BLUE),
             ("defect, surface energies", style.VIOLET), ("NVE drift, hot NVT stability", style.TEAL),
             ("RDF, diffusion, melting", style.ORANGE), ("barriers of the target process", style.PINK)]
    for k, (txt, col) in enumerate(rungs):
        y = 1.2 + k * 1.22
        ax.add_patch(FancyBboxPatch((x0 - 2.25, y - 0.42), 4.5, 0.84, boxstyle="round,pad=0.01,rounding_size=0.1",
                                    fc="white", ec=col, lw=1.2))
        ax.text(x0, y, txt, ha="center", va="center", fontsize=8, color=style.INK)
    ax.add_patch(FancyArrowPatch((x0 - 2.6, 1.0), (x0 - 2.6, 7.6), arrowstyle="-|>", mutation_scale=12, color=style.INK3, lw=1.2))
    ax.text(x0 - 2.8, 4.3, "harder, closer to the science", rotation=90, ha="right", va="center", fontsize=8, color=style.INK3)
    arrow(ax, (7.4, 3.12), (10.9, 1.3), rad=0.3, col=style.TEAL, ls=(0, (3, 2)))
    ax.text(7.4, 1.95, "validate before\nproduction", ha="center", va="center", fontsize=8, color=style.TEAL)
    ax.text(2.3, 2.75, "repeat until the ensemble\nagrees everywhere the\nsimulation goes", ha="center", va="top", fontsize=8, color=style.INK2)
    style.save(fig, SLUG, "workflow")


def cover():
    def draw(ax):
        rng = np.random.default_rng(4)
        # a covered region (training data) and a trajectory that wanders out of it
        t = np.linspace(0, 2 * np.pi, 200)
        rx, ry = 1.25 + 0.12 * np.cos(3 * t), 0.95 + 0.1 * np.sin(2 * t)
        ax.fill(1.55 + rx * np.cos(t), 1.5 + ry * np.sin(t), color=style.TINT[style.TEAL], ec=style.TEAL, lw=2.5)
        pts = rng.uniform(-1, 1, (400, 2))
        pts = pts[(pts ** 2).sum(1) < 0.8]
        pts = pts[:60]
        ax.scatter(1.55 + 1.2 * pts[:, 0], 1.5 + 0.9 * pts[:, 1], s=34, color=style.TEAL, edgecolor="white", lw=0.8, zorder=3)
        s = np.linspace(0, 1, 120)
        x = 1.6 + 1.75 * s + 0.15 * np.sin(14 * s)
        y = 1.4 + 0.95 * s ** 2 + 0.18 * np.sin(11 * s + 1)
        ax.plot(x, y, color=style.INK2, lw=3, zorder=4, solid_capstyle="round")
        ax.add_patch(plt.Circle((x[-1], y[-1]), 0.2, color=style.ORANGE, zorder=5))
        ax.add_patch(plt.Circle((x[-1], y[-1]), 0.34, fc="none", ec=style.ORANGE, lw=2.5, zorder=5))
    style.cover(SLUG, draw, bg=style.BG2)


if __name__ == "__main__":
    selection(); learning_curve(); workflow(); cover()
