"""Figures for content/learn/es-msm.md.  Run: python3 tools/figures/es-msm.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyBboxPatch, Circle, FancyArrowPatch, Rectangle
import style
plt = style.setup()
SLUG = "es-msm"
STATE_COL = {1: style.TEAL, 2: style.GOLD, 3: style.BLUE}


# ---------------------------------------------------------------------------------------------
# 1. From a discrete trajectory to a count matrix and a transition matrix (schematic, real counts)
# ---------------------------------------------------------------------------------------------
def counting():
    seq = [1, 1, 1, 2, 1, 1, 2, 2, 2, 3, 3, 3, 3, 2, 3, 3]
    lag = 3
    C = np.zeros((3, 3), int)
    for a, b in zip(seq[:-lag], seq[lag:]):
        C[a - 1, b - 1] += 1
    T = C / C.sum(1, keepdims=True)
    print("counting: C =", C.tolist(), " T =", np.round(T, 2).tolist())

    fig, ax = plt.subplots(figsize=(7.2, 3.9))
    ax.set_xlim(-0.3, 16.3); ax.set_ylim(-5.6, 2.6); ax.set_aspect("equal"); ax.axis("off")
    w = 0.86
    for i, sidx in enumerate(seq):
        ax.add_patch(FancyBboxPatch((i + (1 - w) / 2, 0), w, w, boxstyle="round,pad=0,rounding_size=0.12",
                                    fc=STATE_COL[sidx], ec="none"))
        ax.text(i + 0.5, w / 2, str(sidx), ha="center", va="center", color="white", fontsize=10,
                fontweight="semibold")
    ax.text(-0.1, -0.35, "frame 0", fontsize=8.5, color=style.INK3)
    ax.text(16.1, -0.35, "frame 15", fontsize=8.5, color=style.INK3, ha="right")
    for i in (0, 3, 6, 10):                        # a few counted pairs
        a, b = seq[i], seq[i + lag]
        ax.add_patch(FancyArrowPatch((i + 0.5, w + 0.05), (i + lag + 0.5, w + 0.05), connectionstyle="arc3,rad=-0.45",
                                     arrowstyle="-|>", mutation_scale=8, color=style.VIOLET, lw=1.1))
        ax.text(i + 0.5 + lag / 2, w + 0.95, f"{a}→{b}", ha="center", fontsize=8.5, color=style.VIOLET)
    ax.text(0, 2.35, f"Discrete trajectory: every pair of frames {lag} apart (one lag time τ) adds one count",
            fontsize=9.5, color=style.INK2)

    def matrix(x0, y0, M, fmt, title, shade):
        cs = 0.95
        ax.text(x0 + 1.5 * cs, y0 + 0.45, title, ha="center", fontsize=9.5, color=style.INK2, fontweight="semibold")
        for i in range(3):
            for (cx, cy) in ((x0 - 0.45, y0 - (i + 0.5) * cs), (x0 + (i + 0.5) * cs, y0 - 3 * cs - 0.42)):
                ax.add_patch(Circle((cx, cy), 0.25, color=STATE_COL[i + 1]))
                ax.text(cx, cy, str(i + 1), ha="center", va="center", color="white", fontsize=8.5, fontweight="semibold")
            for j in range(3):
                v = M[i, j]
                ax.add_patch(Rectangle((x0 + j * cs, y0 - (i + 1) * cs), cs, cs,
                                       fc=shade(v), ec="white", lw=1.5))
                ax.text(x0 + (j + 0.5) * cs, y0 - (i + 0.5) * cs, fmt(v), ha="center", va="center", fontsize=9.5,
                        color=style.INK if v < 0.9 * M.max() else "white")
        ax.text(x0 - 1.1, y0 - 1.5 * cs, "from", rotation=90, ha="center", va="center", fontsize=8.5, color=style.INK3)
        ax.text(x0 + 1.5 * cs, y0 - 3 * cs - 0.95, "to", ha="center", fontsize=8.5, color=style.INK3)

    from matplotlib.colors import LinearSegmentedColormap
    cm = LinearSegmentedColormap.from_list("v", ["#ffffff", style.TINT[style.VIOLET], style.VIOLET])
    matrix(2.2, -1.2, C.astype(float), lambda v: f"{int(v)}", "counts  c(τ)", lambda v: cm(v / C.max()))
    ax.add_patch(FancyArrowPatch((6.0, -2.6), (8.6, -2.6), arrowstyle="-|>", mutation_scale=12, color=style.INK2, lw=1.2))
    ax.text(7.3, -2.35, "divide each row\nby its sum", ha="center", va="bottom", fontsize=8.5, color=style.INK2)
    matrix(10.3, -1.2, T, lambda v: f"{v:.2f}", "transition matrix  T(τ)", lambda v: cm(v))
    style.save(fig, SLUG, "counting")


# ---------------------------------------------------------------------------------------------
# 2. The three-state worked example: eigenvectors and relaxation of populations
# ---------------------------------------------------------------------------------------------
def three_state():
    C = np.array([[1960., 40., 0.], [40., 900., 60.], [0., 60., 6940.]])
    T = C / C.sum(1, keepdims=True)
    w, vr = np.linalg.eig(T); o = np.argsort(-w.real); w = w.real[o]; vr = vr.real[:, o]
    pi = C.sum(1) / C.sum()
    t = -1.0 / np.log(w[1:])
    print("three-state: pi", np.round(pi, 3), "t2, t3 (ns)", np.round(t, 1))
    psi = vr / np.sqrt((pi[:, None] * vr ** 2).sum(0))          # pi-normalised right eigenvectors
    psi[:, 1] *= np.sign(psi[0, 1]); psi[:, 2] *= np.sign(psi[1, 2])

    fig, (a1, a2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw=dict(width_ratios=[1, 1.35], wspace=0.35))
    names = ["U", "I", "F"]; xs = np.arange(3)
    for k, (col, lab) in enumerate([(style.VIOLET, f"ψ₂  (t₂ = {t[0]:.0f} ns)"), (style.ORANGE, f"ψ₃  (t₃ = {t[1]:.1f} ns)")]):
        a1.bar(xs + (k - 0.5) * 0.36, psi[:, k + 1], 0.34, color=col)
        a1.text(0.02, 0.97 - 0.09 * k, lab, transform=a1.transAxes, color=col, fontsize=9, fontweight="semibold", va="top")
    a1.axhline(0, color=style.INK3, lw=0.8)
    a1.set_xticks(xs); a1.set_xticklabels(names)
    a1.set_ylabel("eigenvector component")
    a1.set_ylim(-1.2, 3.6)
    a1.set_title("Slow processes", fontsize=10)
    n = np.unique(np.round(np.logspace(0, 3.2, 120)).astype(int))
    P = np.array([np.array([1., 0, 0]) @ np.linalg.matrix_power(T, k) for k in n])
    for j, col in enumerate([style.TEAL, style.GOLD, style.BLUE]):
        a2.semilogx(n, P[:, j], color=col)
        a2.text(n[-1] * 1.08, pi[j], names[j], color=col, fontsize=10, fontweight="semibold", va="center")
    for tk, lab in zip(t, ("t₂", "t₃")):
        a2.axvline(tk, color=style.INK3, lw=0.8, ls=(0, (3, 3)))
        a2.text(tk * 1.07, 0.93, f"{lab} = {tk:.1f} ns" if tk < 10 else f"{lab} = {tk:.0f} ns", fontsize=8.5, color=style.INK2)
    a2.set_xlim(1, n[-1]); a2.set_ylim(0, 1.0)
    a2.set_xlabel("time (ns), lag τ = 1 ns"); a2.set_ylabel("population")
    a2.set_title("Relaxation from the unfolded state", fontsize=10)
    style.save(fig, SLUG, "three-state")


# ---------------------------------------------------------------------------------------------
# 3. The Chapman–Kolmogorov test for a two-state model of a 4 kT double well
# ---------------------------------------------------------------------------------------------
def ck_test():
    Eb, dt, nw, ns = 4.0, 5e-3, 200, 40000
    rng = np.random.default_rng(5)
    x = np.where(rng.random(nw) < 0.5, -1.0, 1.0)
    lab = np.empty((ns, nw), np.int8); keep = np.empty(4000)
    for i in range(ns):
        x = x - 4 * Eb * x * (x * x - 1) * dt + np.sqrt(2 * dt) * rng.standard_normal(nw)
        lab[i] = x > 0
        if i < 4000: keep[i] = x[0]
    hA = lab == 0; piA = hA.mean()
    def paa(n): return (hA[:-n] & hA[n:]).mean() / hA[:-n].mean()
    t_direct = np.unique(np.round(np.linspace(1, 6000, 40)).astype(int))
    p_direct = np.array([paa(n) for n in t_direct])
    tt = np.linspace(0, 30, 300)
    models = []
    for tau_steps, col, name in ((4, style.PINK, "τ = 0.02"), (400, style.TEAL, "τ = 2")):
        lam = (paa(tau_steps) - piA) / (1 - piA)
        t2 = -tau_steps * dt / np.log(lam)
        models.append((tt, piA + (1 - piA) * np.exp(-tt / t2), col, name, t2))
        print(f"CK test: lag {tau_steps*dt:g}: implied timescale {t2:.2f}")
    kr = np.sqrt(32 * Eb * Eb) / (2 * np.pi) * np.exp(-Eb)
    print(f"CK test: Kramers relaxation time 1/(2k) = {1/(2*kr):.2f}; pi_A = {piA:.3f}")

    fig, (a1, a2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw=dict(width_ratios=[1, 1.3], wspace=0.3))
    # left: a stretch of trajectory near a crossing, coloured by the two-state label
    cross = np.where(np.diff(np.sign(keep)) != 0)[0][0]
    lo, hi = max(cross - 150, 0), cross + 250
    tt0 = np.arange(lo, hi) * dt
    a1.axhspan(-1.7, 0, color=style.TINT[style.TEAL]); a1.axhspan(0, 1.7, color=style.TINT[style.BLUE])
    a1.plot(tt0, keep[lo:hi], color=style.INK2, lw=0.9)
    a1.axhline(0, color=style.INK3, lw=0.8, ls=(0, (3, 3)))
    nflip = int(np.sum(np.diff(np.sign(keep[lo:hi])) != 0))
    a1.text(0.03, 0.06, "state A  (x < 0)", transform=a1.transAxes, color=style.TEAL, fontsize=9, fontweight="semibold")
    a1.text(0.03, 0.9, "state B  (x > 0)", transform=a1.transAxes, color=style.BLUE, fontsize=9, fontweight="semibold")
    a1.set_ylim(-1.7, 1.7); a1.set_xlim(tt0[0], tt0[-1])
    a1.set_xlabel("time (reduced units)"); a1.set_ylabel("position x")
    a1.set_title(f"One crossing, {nflip} label changes", fontsize=10)
    # right: CK test
    a2.plot(t_direct * dt, p_direct, "o", ms=4, color=style.INK, zorder=3)
    for tt_, pp, col, name, t2 in models:
        a2.plot(tt_, pp, color=col, lw=1.8)
    a2.text(3.0, 0.425, f"model at τ = 0.02  (t₂ = {models[0][4]:.1f})", color=style.PINK, fontsize=9)
    a2.text(13, 0.83, f"model at τ = 2  (t₂ = {models[1][4]:.1f})", color=style.TEAL, fontsize=9)
    a2.text(13.5, 0.63, "dots: direct estimate", fontsize=9, color=style.INK)
    a2.axhline(piA, color=style.INK3, lw=0.8, ls=(0, (3, 3)))
    a2.set_xlim(0, 30); a2.set_ylim(0.4, 1.01)
    a2.set_xlabel("time t (reduced units)"); a2.set_ylabel("P(in A at t | in A at 0)")
    a2.set_title("Chapman–Kolmogorov test", fontsize=10)
    style.save(fig, SLUG, "ck-test")


# ---------------------------------------------------------------------------------------------
# Cover: a network of microstates that falls into two metastable groups
# ---------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        L = [(0.7, 1.9), (1.25, 2.35), (1.05, 1.15), (1.55, 1.65), (0.55, 0.95)]
        R = [(2.55, 1.5), (3.05, 2.05), (3.35, 1.25), (2.85, 0.75), (3.55, 2.45)]
        def edges(P):
            out = []
            for i in range(len(P)):
                for j in range(i + 1, len(P)):
                    if np.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]) < 0.9:
                        out.append((P[i], P[j]))
            return out
        for (a, b) in edges(L) + edges(R):
            ax.plot([a[0], b[0]], [a[1], b[1]], color=style.INK3, lw=4.5, solid_capstyle="round", zorder=1)
        ax.plot([L[3][0], R[0][0]], [L[3][1], R[0][1]], color=style.INK3, lw=1.6, ls=(0, (2, 2)), zorder=1)
        for P, col, r in ((L, style.TEAL, 0.2), (R, style.ORANGE, 0.2)):
            for k, (x, y) in enumerate(P):
                ax.add_patch(Circle((x, y), r * (1.25 if k == 0 else 1.0), color=col, zorder=2))
                ax.add_patch(Circle((x, y), r * (1.25 if k == 0 else 1.0), fc="none", ec="white", lw=2.5, zorder=3))
    style.cover(SLUG, draw, bg=style.TINT[style.GOLD])


if __name__ == "__main__":
    counting(); three_state(); ck_test(); cover()
