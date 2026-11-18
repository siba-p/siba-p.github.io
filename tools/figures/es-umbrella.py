"""Figures for content/learn/es-umbrella.md.  Run: python3 tools/figures/es-umbrella.py

All curves use the worked example of the chapter: a ligand pulled from 0.5 to 2.0 nm at 300 K, with
F(s) = 30 (1 - exp(-((s - 0.5)/0.35)^2)) + 8 exp(-((s - 1.05)/0.15)^2) kJ/mol and kappa = 1000 kJ mol^-1 nm^-2.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from math import erf, sqrt
import matplotlib.patches as mpatches
import style
plt = style.setup()
SLUG = "es-umbrella"

KT = 2.494                                     # kJ/mol at 300 K
KAPPA = 1000.0                                 # kJ mol^-1 nm^-2
S = np.linspace(0.2, 2.3, 21001); DS = S[1] - S[0]


def F_of(s):
    return 30 * (1 - np.exp(-((s - 0.5) / 0.35) ** 2)) + 8 * np.exp(-((s - 1.05) / 0.15) ** 2)


F = F_of(S)


def biased(c, kappa=KAPPA):
    """Exact normalised biased distribution of the window centred at c."""
    u = F + 0.5 * kappa * (S - c) ** 2
    p = np.exp(-(u - u.min()) / KT)
    return p / (p.sum() * DS)


def moments(p):
    m = (p * S).sum() * DS
    return m, np.sqrt((p * S * S).sum() * DS - m * m)


# ---------------------------------------------------------------------------------------------------------------
def unbias():
    """From one window to a joined profile: spring, unbiased pieces with unknown offsets, pieces matched by WHAM."""
    rng = np.random.default_rng(7)
    centres = np.round(np.append(np.arange(0.5, 2.0001, 0.1), 1.05), 2); centres.sort()
    edges = np.arange(0.30, 2.20001, 0.01); mids = 0.5 * (edges[1:] + edges[:-1])
    n_per = 1500
    hists, pieces = [], []
    for c in centres:                           # draw samples from the exact biased distribution
        p = biased(c); cdf = np.cumsum(p) * DS
        x = np.interp(rng.random(n_per), cdf, S)
        h, _ = np.histogram(x, edges); hists.append(h)
    hists = np.array(hists, float)
    W = 0.5 * KAPPA * (mids[None, :] - centres[:, None]) ** 2      # bias of every window in every bin
    # WHAM on the sampled histograms
    f = np.zeros(len(centres)); N = hists.sum(1)
    for _ in range(4000):
        den = (N[:, None] * np.exp((f[:, None] - W) / KT)).sum(0)
        P = hists.sum(0) / den
        fn = -KT * np.log((P[None, :] * np.exp(-W / KT)).sum(1))
        fn -= fn[0]
        if np.abs(fn - f).max() < 1e-7: f = fn; break
        f = fn
    with np.errstate(divide="ignore"):
        Fw = -KT * np.log(P)
    ok = np.isfinite(Fw)
    Fw -= Fw[ok][np.argmin(np.abs(mids[ok] - 0.5))]
    fig, axs = plt.subplots(1, 3, figsize=(7.4, 3.0), gridspec_kw=dict(wspace=0.32))
    # panel 1: one window
    a = axs[0]; c = 0.80
    m = (S > 0.45) & (S < 1.35) & (np.arange(S.size) % 10 == 0)
    w = 0.5 * KAPPA * (S - c) ** 2
    a.plot(S[m], F[m], color=style.BLUE)
    mw = m & (w < 36)
    a.plot(S[mw], w[mw], color=style.VIOLET, lw=1.5)
    a.plot(S[mw], (F + w)[mw], color=style.INK, lw=1.2, ls=(0, (3, 2)))
    pb = biased(c); mu, sd = moments(pb)
    a.fill_between(S[m], 0, pb[m] * 1.6, color=style.TEAL, alpha=0.35, lw=0)
    a.plot(S[m], pb[m] * 1.6, color=style.TEAL, lw=1.2)
    a.annotate("", (mu, 26), (c, 26), arrowprops=dict(arrowstyle="-|>", color=style.ORANGE, lw=1.2, mutation_scale=9))
    a.plot([c, c], [24, 28], color=style.ORANGE, lw=1)
    a.text(0.69, 28.5, "slides\ndownhill", fontsize=8, color=style.ORANGE, ha="center", va="bottom", linespacing=1.1)
    a.text(1.22, 38.5, "$F(s)$", color=style.BLUE, fontsize=9)
    a.text(0.47, 39.5, "$F + w_k$", color=style.INK, fontsize=9)
    a.text(0.99, 13, "spring $w_k$", color=style.VIOLET, fontsize=8.5)
    a.text(0.94, 3.0, "biased\nhistogram", color=style.TEAL, fontsize=8.5, linespacing=1.1)
    a.set_title("1  Add a spring, sample")
    a.set_xlim(0.45, 1.38); a.set_ylim(0, 47)
    a.set_xlabel("$s$ (nm)"); a.set_ylabel("energy (kJ/mol)")
    # panel 2: pieces with unknown offsets
    a = axs[1]
    offs = rng.uniform(-9, 9, len(centres))
    cols = [style.BLUE, style.TEAL, style.VIOLET, style.ORANGE, style.PINK]
    for k, c in enumerate(centres):
        h = hists[k]; good = h >= 8
        piece = -KT * np.log(h[good] / (h.sum() * 0.01)) - W[k, good]
        piece += -piece.min() + F_of(mids[good]).min() + offs[k]
        a.plot(mids[good], piece, color=cols[k % 5], lw=1.6)
    a.set_title("2  Unbias each window")
    a.text(2.04, -11, "right shape,\nunknown\noffset $f_k$", fontsize=8.5, color=style.INK2,
           ha="right", va="bottom", linespacing=1.2)
    a.set_xlim(0.38, 2.08); a.set_ylim(-13, 47)
    a.set_xlabel("$s$ (nm)")
    # panel 3: pieces placed by WHAM
    a = axs[2]
    g = (S > 0.38) & (S < 2.08) & (np.arange(S.size) % 10 == 0)
    a.plot(S[g], F[g], color=style.LINE, lw=5, solid_capstyle="round")
    for k, c in enumerate(centres):
        h = hists[k]; good = h >= 8
        piece = -KT * np.log(h[good] / h.sum()) - W[k, good] + f[k]
        piece -= (-KT * np.log(P[np.argmin(np.abs(mids - 0.5))]))
        a.plot(mids[good], piece, color=cols[k % 5], lw=1.6)
    a.set_title("3  Match the overlaps")
    a.text(2.04, -11, "WHAM fixes each $f_k$\nfrom shared bins;\ngrey: true $F(s)$", fontsize=8.5,
           color=style.INK2, ha="right", va="bottom", linespacing=1.2)
    a.set_xlim(0.38, 2.08); a.set_ylim(-13, 47)
    a.set_xlabel("$s$ (nm)")
    style.save(fig, SLUG, "unbias")
    err = np.abs(Fw[ok & (mids > 0.5) & (mids < 2.0)] - F_of(mids[ok & (mids > 0.5) & (mids < 2.0)])).max()
    print(f"  unbias: {len(centres)} windows x {n_per} samples, WHAM max error {err:.2f} kJ/mol")


# ---------------------------------------------------------------------------------------------------------------
def plan():
    """The 16-window plan of the worked example and the 17th window that repairs its weak junction."""
    c16 = np.round(np.arange(0.5, 2.0001, 0.1), 2)
    P16 = np.array([biased(c) for c in c16]); p17 = biased(1.05)
    mom = np.array([moments(p) for p in P16])
    fig, axs = plt.subplots(3, 1, figsize=(7.2, 5.6), sharex=True,
                            gridspec_kw=dict(height_ratios=[1.25, 1.2, 0.8], hspace=0.16))
    m = (S >= 0.4) & (S <= 2.1) & (np.arange(S.size) % 35 == 0)
    a = axs[0]
    a.plot(S[m], F[m], color=style.BLUE)
    for c, (mu, sd) in zip(c16, mom):
        a.plot([c, c], [-4.5, -1.5], color=style.INK3, lw=1)
        if abs(mu - c) > 0.03:
            a.annotate("", (mu, F_of(mu) + 2.2), (c, F_of(c) + 2.2),
                       arrowprops=dict(arrowstyle="-|>", color=style.ORANGE, lw=1.1, mutation_scale=8, shrinkA=0, shrinkB=0))
    a.annotate("crest 1.08 nm, 5.8 kJ/mol\nabove the plateau", (1.077, 35.8), xytext=(1.30, 40.5), fontsize=8.5,
               color=style.INK2, va="center", arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=3))
    a.text(1.45, 14, "orange arrows: each window\nslides from its centre to its\nmean, downhill by $F'/\\kappa$",
           fontsize=8.5, color=style.ORANGE, va="center", linespacing=1.3)
    a.set_ylabel("$F$ (kJ/mol)"); a.set_ylim(-6, 46); a.set_yticks([0, 10, 20, 30, 40])
    a.set_title("Sixteen windows, $\\kappa$ = 1000 kJ mol$^{-1}$ nm$^{-2}$, 0.1 nm apart")
    a = axs[1]
    for k, p in enumerate(P16):
        col = style.BLUE if k % 2 == 0 else style.TEAL
        q = m & (p > 2e-3 * p.max())                  # draw each histogram only where it is visible
        a.fill_between(S[q], 0, p[q], color=col, alpha=0.18, lw=0)
        a.plot(S[q], p[q], color=col, lw=1.1)
    q = m & (p17 > 2e-3 * p17.max())
    a.fill_between(S[q], 0, p17[q], color=style.ORANGE, alpha=0.25, lw=0)
    a.plot(S[q], p17[q], color=style.ORANGE, lw=1.6)
    a.annotate("17th window, centred at 1.05 nm,\nsettles at 0.995 nm, in the gap", (1.0, 5.7), xytext=(1.12, 11.2),
               fontsize=8.5, color=style.ORANGE, va="center",
               arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.8, shrinkB=2))
    a.set_ylabel("density (nm$^{-1}$)"); a.set_ylim(0, 12.5); a.set_yticks([0, 4, 8])
    a = axs[2]
    tot16 = P16.sum(0); tot17 = tot16 + p17
    sel = (S >= 0.5) & (S <= 2.0)
    med16 = np.median(tot16[sel]); med17 = np.median(tot17[sel])
    a.plot(S[m], tot16[m] / med16, color=style.INK2, lw=1.4)
    a.plot(S[m], tot17[m] / med17, color=style.ORANGE, lw=1.4)
    v16 = tot16[sel].min() / med16; v17 = tot17[sel].min() / med17
    j = np.argmin(np.where(sel, tot16, np.inf))
    a.annotate(f"valley {v16:.0%} of the median\nwith 16 windows", (S[j], v16), xytext=(1.30, 0.35), fontsize=8.5,
               color=style.INK2, va="center", arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=2))
    a.text(1.12, 1.55, f"{v17:.0%} with 17", fontsize=8.5, color=style.ORANGE, va="center")
    a.set_ylabel("sum / median"); a.set_ylim(0, 1.9); a.set_yticks([0, 1])
    a.set_xlabel("pulling coordinate $s$ (nm)"); a.set_xlim(0.4, 2.1)
    style.save(fig, SLUG, "plan")
    print(f"  plan: valley {v16:.2f} -> {v17:.2f}; mean of 17th {moments(p17)[0]:.3f}")


# ---------------------------------------------------------------------------------------------------------------
def diagnose():
    """Overlap of two Gaussian windows against spacing, and the window shifts that reveal the local slope."""
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.1), gridspec_kw=dict(wspace=0.32))
    a = axs[0]
    d = np.linspace(0, 5, 401)
    ov = np.array([1 + erf(-x / 2 / sqrt(2)) for x in d])          # 2 Phi(-d / 2 sigma)
    a.axvspan(1.5, 2.5, color=style.TINT[style.TEAL], lw=0)
    a.plot(d, ov, color=style.BLUE)
    for x, dx, dy in [(1, 0.15, 0.04), (2, 0.15, 0.05), (3, 0.15, 0.06), (4, 0.0, 0.07)]:
        y = 1 + erf(-x / 2 / sqrt(2))
        a.plot(x, y, "o", ms=5, color=style.BLUE)
        a.text(x + dx, y + dy, f"{y:.2f}", fontsize=8.5, color=style.INK2, ha="left" if dx else "center")
    a.text(2.0, 0.93, "comfortable\ntarget", fontsize=8.5, color=style.TEAL, ha="center", va="top", linespacing=1.1)
    a.set_xlabel("spacing $d$ between window means ($\\sigma$)"); a.set_ylabel("shared area of neighbours")
    a.set_xlim(0, 5); a.set_ylim(0, 1.02)
    a.set_title("Overlap falls fast with spacing")
    a = axs[1]
    cs = np.round(np.arange(0.5, 2.0001, 0.05), 3)
    sh = np.array([moments(biased(c))[0] - c for c in cs])
    F1 = np.gradient(F, DS); F2 = np.gradient(F1, DS)
    cc = np.linspace(0.5, 2.0, 600)
    pred = -np.interp(cc, S, F1) / (KAPPA + np.interp(cc, S, F2))
    pred[(cc > 0.96) & (cc < 1.13)] = np.nan          # the expansion fails where kappa + F'' is small
    a.axhline(0, color=style.LINE, lw=1)
    a.plot(cc, pred, color=style.VIOLET, lw=1.4, ls=(0, (3, 2)))
    a.plot(cs, sh, "o", ms=4, color=style.ORANGE)
    a.annotate("windows on either side of the\ncrest slide apart: a gap opens", (1.075, -0.03), xytext=(1.25, -0.045),
               fontsize=8.5, color=style.INK2, va="center",
               arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=4))
    a.text(2.03, -0.117, "dots: exact window means\ndashed: $-F'/(\\kappa + F'')$", fontsize=8.5,
           color=style.INK2, va="bottom", ha="right", linespacing=1.3)
    a.set_xlabel("window centre $s_k$ (nm)"); a.set_ylabel("mean $-$ centre (nm)")
    a.set_xlim(0.45, 2.05); a.set_ylim(-0.12, 0.06)
    a.set_title("Shifts trace the slope")
    style.save(fig, SLUG, "diagnose")


# ---------------------------------------------------------------------------------------------------------------
def cover():
    def umbrella(ax, x, y, r, col, tilt=0.0):
        th = np.linspace(0, np.pi, 80)
        top_x = x + r * np.cos(th); top_y = y + 0.62 * r * np.sin(th)
        nsc = 4                                        # scalloped hem
        hx = np.linspace(x + r, x - r, 4 * nsc * 10 + 1)
        ph = (hx - (x - r)) / (2 * r) * nsc * np.pi
        hy = y - 0.09 * r * np.abs(np.sin(ph))
        px = np.r_[top_x, hx]; py = np.r_[top_y, hy]
        R = np.array([[np.cos(tilt), -np.sin(tilt)], [np.sin(tilt), np.cos(tilt)]])
        P = (R @ np.vstack([px - x, py - y])).T + [x, y]
        ax.add_patch(mpatches.Polygon(P, closed=True, color=col, zorder=4))
        for k in range(1, nsc):                        # ribs
            xr = x - r + 2 * r * k / nsc
            rib = np.array([[x, y + 0.62 * r], [xr, y - 0.02 * r]])
            Q = (R @ (rib - [x, y]).T).T + [x, y]
            ax.plot(Q[:, 0], Q[:, 1], color="white", lw=1.2, alpha=0.55, zorder=5)
        tip = (R @ np.array([0, 0.62 * r + 0.1 * r])) + [x, y]
        ax.plot([x + (tip[0] - x) * 0.0, tip[0]], [y + 0.62 * r, tip[1]], color=style.INK, lw=2.2, zorder=3)
        b = (R @ np.array([0, -1.05 * r])) + [x, y]
        ax.plot([x, b[0]], [y, b[1]], color=style.INK, lw=2.4, zorder=3, solid_capstyle="round")
        hk = np.linspace(np.pi, 2 * np.pi, 30)
        hxk = b[0] + 0.13 * r + 0.13 * r * np.cos(hk); hyk = b[1] + 0.13 * r * np.sin(hk)
        ax.plot(hxk, hyk, color=style.INK, lw=2.4, zorder=3, solid_capstyle="round")

    def draw(ax):
        x = np.linspace(0, 4, 400)
        hill = 0.35 + 1.25 * np.exp(-((x - 2.0) / 0.75) ** 2)
        ax.fill_between(x, 0, hill, color=style.BLUE, zorder=1)
        ax.fill_between(x, 0, hill - 0.12, color="#3f5fe0", zorder=1, alpha=0.0)
        xs = [0.55, 1.25, 2.0, 2.75, 3.45]
        cols = [style.TEAL, style.ORANGE, style.PINK, style.VIOLET, style.GOLD]
        for xi, col in zip(xs, cols):
            yi = 0.35 + 1.25 * np.exp(-((xi - 2.0) / 0.75) ** 2) + 0.62
            umbrella(ax, xi, yi, 0.42, col)
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    unbias(); plan(); diagnose(); cover()
