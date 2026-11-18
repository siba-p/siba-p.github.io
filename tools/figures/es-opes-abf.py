"""Figures for content/learn/es-opes-abf.md.  Run: python3 tools/figures/es-opes-abf.py

ledgers  what metadynamics, OPES and ABF each accumulate (schematic, computed shapes)
targets  target distributions and the landscapes they produce, including the OPES bias before the first crossing
abf      a seeded two-dimensional ABF run: mean force, integrated free energy and the flattened histogram
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import matplotlib.patches as mpatches
import style
plt = style.setup()
SLUG = "es-opes-abf"
KT = 2.494                                          # kJ/mol at 300 K


def F_model(s):
    """Model double well in kJ/mol: barrier about 35 kJ/mol from the left basin, right basin 6 kJ/mol higher."""
    return 32 * (s ** 2 - 1) ** 2 + 3 * (s + 1)


# ---------------------------------------------------------------------------------------------------------------
def ledgers():
    rng = np.random.default_rng(3)
    s = np.linspace(-1.7, 1.7, 140)
    F = F_model(s) / KT; F -= F.min()                # in k_BT
    fig, axs = plt.subplots(1, 3, figsize=(7.4, 2.9), gridspec_kw=dict(wspace=0.12))
    for a in axs:
        a.set_xticks([]); a.set_yticks([]); a.spines["left"].set_visible(False)
        a.set_xlim(-1.7, 1.7); a.set_xlabel("collective variable $s$")
    # metadynamics: a pile of hills
    a = axs[0]
    centres = np.r_[rng.normal(-1.0, 0.18, 18), rng.normal(1.0, 0.18, 10), rng.normal(0, 0.25, 4)]
    base = np.zeros_like(s)
    for i, c in enumerate(centres):
        h = 0.6 * np.exp(-(s - c) ** 2 / (2 * 0.16 ** 2))
        q = h > 4e-3
        a.fill_between(s[q], base[q], (base + h)[q], color=style.VIOLET, alpha=0.18 + 0.22 * (i % 2), lw=0)
        base += h
    a.plot(s, base, color=style.VIOLET, lw=1.6)
    a.set_ylim(0, base.max() * 1.45)
    a.set_title("Metadynamics keeps hills")
    a.text(0, base.max() * 1.38, "the bias is the sum of every\nhill ever added; old errors stay",
           fontsize=8.5, color=style.INK2, ha="center", va="top", linespacing=1.3)
    # OPES: weighted kernels -> probability estimate
    a = axs[1]
    pts = np.r_[rng.normal(-1.0, 0.2, 9), rng.normal(1.0, 0.2, 6), [-0.45, 0.1, 0.5]]
    wts = np.exp(-0.94 * np.interp(pts, s, F) / 4)   # reweighting e^{beta V}: V is largest in the wells (milder landscape here)
    wts /= wts.max()
    tot = np.zeros_like(s)
    for p, w in zip(pts, wts):
        k = w * np.exp(-(s - p) ** 2 / (2 * 0.17 ** 2))
        q = k > 4e-3
        a.fill_between(s[q], 0, k[q], color=style.TEAL, alpha=0.18, lw=0); a.plot(s[q], k[q], color=style.TEAL, lw=0.8)
        tot += k
    P = np.exp(-F); P *= tot.max() / P.max() * 1.0
    a.plot(s, tot, color=style.BLUE, lw=1.6)
    a.set_ylim(0, tot.max() * 1.45)
    a.set_title("OPES keeps a probability")
    a.text(0, tot.max() * 1.38, "reweighted kernels build $\\tilde P(s)$;\nthe bias is recomputed from it",
           fontsize=8.5, color=style.INK2, ha="center", va="top", linespacing=1.3)
    # ABF: instantaneous forces in bins -> mean force
    a = axs[2]
    edges = np.linspace(-1.6, 1.6, 17); mids = 0.5 * (edges[1:] + edges[:-1])
    mf = -np.gradient(F_model(mids) / KT, mids)          # mean force in k_BT per unit s
    mf /= np.abs(mf).max()
    xs_ = np.repeat(mids, 25) + rng.uniform(-0.06, 0.06, 25 * len(mids))
    ys_ = np.repeat(mf, 25) + rng.normal(0, 0.35, 25 * len(mids))
    a.plot(xs_, ys_, "o", ms=1.8, color=style.INK3, alpha=0.6, rasterized=True)
    for m_, f_ in zip(mids, mf):
        a.plot([m_ - 0.09, m_ + 0.09], [f_, f_], color=style.ORANGE, lw=2.4)
    a.axhline(0, color=style.LINE, lw=1)
    a.set_ylim(-2.2, 3.1)
    a.set_title("ABF keeps forces")
    a.text(0, 2.95, "average the force in each bin,\npush back, integrate for $F$",
           fontsize=8.5, color=style.INK2, ha="center", va="top", linespacing=1.3)
    style.save(fig, SLUG, "ledgers")


# ---------------------------------------------------------------------------------------------------------------
def targets():
    s = np.linspace(-1.7, 1.7, 700); ds = s[1] - s[0]
    F = F_model(s); F -= F.min()
    barrier = F[np.abs(s) < 0.5].max()
    dE = 40.0                                         # BARRIER in kJ/mol
    gamma = dE / KT                                   # OPES default bias factor
    eps = np.exp(-dE / (KT * (1 - 1 / gamma)))
    P = np.exp(-F / KT); P /= P.sum() * ds
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.32))
    a = axs[0]
    wt = P ** (1 / gamma); wt /= wt.sum() * ds
    uni = np.ones_like(s) / (s[-1] - s[0])
    a.semilogy(s, P, color=style.BLUE)
    a.semilogy(s, wt, color=style.ORANGE)
    a.semilogy(s, uni, color=style.VIOLET, ls=(0, (4, 2)))
    a.set_ylim(1e-7, 20)
    a.text(-0.45, 2e-6, "unbiased $P(s)$", fontsize=8.5, color=style.BLUE, ha="right")
    a.text(0, 2.0, f"well-tempered, $\\gamma$ = {gamma:.0f}", fontsize=8.5, color=style.ORANGE, ha="center", va="bottom")
    a.text(0, 0.11, "uniform", fontsize=8.5, color=style.VIOLET, ha="center", va="top")
    a.set_xlabel("collective variable $s$"); a.set_ylabel("probability density")
    a.set_title("Three targets")
    a = axs[1]
    a.plot(s, F, color=style.BLUE)
    a.plot(s, F / gamma, color=style.ORANGE)
    # OPES before the first crossing: the estimate covers only the left basin
    explored = s < -0.55
    Pt = P * 0.5 * np.array([__import__("math").erfc((v + 0.55) / 0.08) for v in s])   # kernels cover s < -0.55
    Z = Pt[explored].mean()
    V = (1 - 1 / gamma) * KT * np.log(Pt / Z + eps)
    eff = F + V - (F + V)[explored].min()
    a.plot(s, eff, color=style.PINK, lw=1.8)
    a.text(0.1, barrier + 1.5, f"$F(s)$, barrier {barrier:.0f} kJ/mol", fontsize=8.5, color=style.BLUE, ha="center")
    a.text(-1.65, -14, "converged\nOPES: $F/\\gamma$", fontsize=8.5, color=style.ORANGE, ha="left", linespacing=1.2)
    a.text(0.25, -50, "OPES before the first crossing", fontsize=8.5, color=style.PINK, ha="center", va="bottom")
    a.set_ylim(-52, 45)
    a.axhline(0, color=style.LINE, lw=1, zorder=0)
    a.set_xlabel("collective variable $s$"); a.set_ylabel("$F + V$  (kJ/mol)")
    a.set_title("What the CV feels")
    style.save(fig, SLUG, "targets")
    print(f"  targets: barrier {barrier:.1f} kJ/mol, gamma {gamma:.2f}, eps {eps:.2e}, ln eps {np.log(eps):.2f},"
          f" OPES early min of F+V outside {eff[~explored].min():.1f}")


# ---------------------------------------------------------------------------------------------------------------
def abf():
    """Overdamped Langevin on U(x, y) = F0(x) + k/2 (y - 0.5 sin 2x)^2, k_BT = 1; ABF on x.
    The free energy along x is exactly F0(x), because the y integral does not depend on x."""
    rng = np.random.default_rng(5)
    F0 = lambda x: 8.0 * (x ** 2 - 1) ** 2
    dF0 = lambda x: 32.0 * x * (x ** 2 - 1)
    k = 20.0
    lo, hi, nb = -1.5, 1.5, 60
    edges = np.linspace(lo, hi, nb + 1); mids = 0.5 * (edges[1:] + edges[:-1]); w = edges[1] - edges[0]
    fsum = np.zeros(nb); cnt = np.zeros(nb)
    full = 200
    dt = 1e-3; amp = np.sqrt(2 * dt)
    x, y = -1.0, -0.5 * np.sin(2.0)
    nsteps = 600_000
    snaps = {}
    hist = np.zeros(nb)
    xtrace = np.empty(nsteps // 100)
    for blk in range(nsteps // 1000):
        noise = rng.standard_normal((1000, 2))
        for n in range(1000):
            g = 0.5 * np.sin(2 * x); dg = np.cos(2 * x)
            fx = -dF0(x) + k * (y - g) * dg                    # instantaneous force along x
            fy = -k * (y - g)
            b = int((x - lo) / w)
            bias = 0.0
            if 0 <= b < nb:
                fsum[b] += fx; cnt[b] += 1; hist[b] += 1
                bias = -fsum[b] / cnt[b] * min(1.0, cnt[b] / full)
            x += (fx + bias) * dt + amp * noise[n, 0]
            y += fy * dt + amp * noise[n, 1]
            if x < lo: x = 2 * lo - x
            if x > hi: x = 2 * hi - x
        step = (blk + 1) * 1000
        if step in (10_000, 600_000):
            snaps[step] = (fsum / np.maximum(cnt, 1)).copy(), cnt.copy()
    fig, axs = plt.subplots(1, 3, figsize=(7.4, 2.9), gridspec_kw=dict(wspace=0.42))
    a = axs[0]
    a.plot(mids, -dF0(mids), color=style.INK3, lw=4, alpha=0.35)
    m0, c0 = snaps[10_000]
    a.plot(mids[c0 > 0], m0[c0 > 0], "o", ms=3, color=style.ORANGE)
    a.plot(mids, snaps[600_000][0], color=style.BLUE, lw=1.4)
    a.text(-1.5, -38, "dots: $10^4$ steps", fontsize=8.5, color=style.ORANGE)
    a.text(-1.5, -50, "line: $6\\times10^5$", fontsize=8.5, color=style.BLUE)
    a.set_xlabel("$x$"); a.set_ylabel("mean force  ($k_BT$ per unit $x$)")
    a.set_title("Mean force")
    a = axs[1]
    Fest = -np.cumsum(snaps[600_000][0]) * w; Fest -= Fest.min()
    Ftrue = F0(mids); Ftrue -= Ftrue.min()
    a.plot(mids, Ftrue, color=style.INK3, lw=4, alpha=0.35)
    a.plot(mids, Fest, color=style.BLUE, lw=1.4)
    err = np.abs((Fest - Fest[np.argmin(np.abs(mids + 1))]) - (Ftrue - Ftrue[np.argmin(np.abs(mids + 1))]))[np.abs(mids) < 1.3].max()
    a.text(0, 9.6, "grey: exact $F_0(x)$\nblue: integrated ABF", fontsize=8.5, color=style.INK2, ha="center",
           va="top", linespacing=1.3)
    a.set_xlabel("$x$"); a.set_ylabel("$F$  ($k_BT$)"); a.set_ylim(-0.5, 10)
    a.set_title("Free energy")
    a = axs[2]
    dens = hist / hist.sum() / w
    Pb = np.exp(-F0(mids)); Pb /= Pb.sum() * w
    a.bar(mids, dens, width=w * 0.9, color=style.TEAL, alpha=0.8)
    a.plot(mids, Pb, color=style.INK3, lw=1.2, ls=(0, (3, 2)))
    a.text(0, 1.75, "unbiased $e^{-F_0}$\n(dashed)", fontsize=8.5, color=style.INK2, ha="center", va="top", linespacing=1.2)
    a.set_ylim(0, 1.85); a.set_xlabel("$x$"); a.set_ylabel("density of $x$")
    a.set_title("Sampling")
    style.save(fig, SLUG, "abf")
    print(f"  abf: max |F error| for |x|<1.3 = {err:.2f} kT; min/max counts {cnt.min():.0f}/{cnt.max():.0f};"
          f" barrier region density {dens[np.abs(mids) < 0.1].mean():.2f} vs mean {dens.mean():.2f}")


# ---------------------------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        x = np.linspace(0, 4, 400)
        slope = 0.35 + 1.9 / (1 + np.exp(-(x - 2.0) * 2.2))
        ax.fill_between(x, 0, slope, color=style.BLUE, lw=0, zorder=1)
        # a ball on the slope held by two equal and opposite forces
        x0 = 2.0; y0 = 0.35 + 1.9 / 2; t = np.arctan(1.9 * 2.2 / 4)
        n = np.array([-np.sin(t), np.cos(t)]); d = np.array([np.cos(t), np.sin(t)])
        c = np.array([x0, y0]) + 0.27 * n
        ax.add_patch(mpatches.Circle(c, 0.25, color=style.PINK, zorder=5))
        ax.annotate("", c - 0.95 * d, c - 0.3 * d, arrowprops=dict(arrowstyle="-|>", color=style.ORANGE, lw=5,
                                                                   mutation_scale=26), zorder=6)
        ax.annotate("", c + 0.95 * d, c + 0.3 * d, arrowprops=dict(arrowstyle="-|>", color=style.VIOLET, lw=5,
                                                                   mutation_scale=26), zorder=6)
    style.cover(SLUG, draw, bg=style.TINT[style.ORANGE])


if __name__ == "__main__":
    ledgers(); targets(); abf(); cover()
