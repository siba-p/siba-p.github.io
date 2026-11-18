"""Figures for content/learn/es-replica-exchange.md.  Run: python3 tools/figures/es-replica-exchange.py

braid    how configurations move through a temperature ladder under alternating neighbour swaps (schematic, seeded)
ladder   energy overlap and acceptance in a harmonic model, and the number of replicas needed against system size
boost    the aMD and GaMD boost potentials applied to a one-dimensional landscape
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from math import erfc, sqrt, log, ceil
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import style
plt = style.setup()
SLUG = "es-replica-exchange"
R = 0.0083145                                     # kJ mol^-1 K^-1


def ramp(n):
    """Colours from cold (blue) to hot (pink) for n replicas."""
    stops = [style.BLUE, style.VIOLET, style.PINK]
    from matplotlib.colors import LinearSegmentedColormap
    cm = LinearSegmentedColormap.from_list("coldhot", stops)
    return [cm(i / max(n - 1, 1)) for i in range(n)]


# ---------------------------------------------------------------------------------------------------------------
def braid():
    rng = np.random.default_rng(28)
    M, rounds = 5, 12
    temps = [300, 330, 363, 400, 440]
    perm = list(range(M))                         # perm[rung] = configuration at that rung
    paths = {c: [c] for c in range(M)}
    events = []
    for r in range(rounds):
        start = r % 2
        for i in range(start, M - 1, 2):
            acc = rng.random() < 0.45
            events.append((r, i, acc))
            if acc:
                perm[i], perm[i + 1] = perm[i + 1], perm[i]
        for rung, c in enumerate(perm):
            paths[c].append(rung)
    fig, ax = plt.subplots(figsize=(7.2, 3.5))
    cols = [style.TEAL, style.GOLD, style.ORANGE, style.VIOLET, style.BLUE]
    rung_col = ramp(M)
    for rung in range(M):
        ax.add_patch(FancyBboxPatch((-0.45, rung - 0.32), rounds + 0.9, 0.64, boxstyle="round,pad=0,rounding_size=0.12",
                                    fc=rung_col[rung], ec="none", alpha=0.10, zorder=0))
        ax.text(-0.6, rung, f"{temps[rung]} K", ha="right", va="center", fontsize=9, color=rung_col[rung])
    hero = paths[0]
    for c, p in paths.items():
        lw, z, al = (3.2, 4, 1.0) if c == 0 else (1.6, 2, 0.55)
        ax.plot(np.arange(rounds + 1), p, color=cols[c], lw=lw, zorder=z, alpha=al, solid_joinstyle="round")
        ax.plot(np.arange(rounds + 1), p, "o", ms=6 if c == 0 else 4.5, color=cols[c], zorder=z + 1, alpha=1 if c == 0 else 0.8)
    for r, i, acc in events:
        if not acc:
            ax.plot(r + 0.5, i + 0.5, marker="x", ms=5, mew=1.4, color=style.INK3, zorder=6)
    ax.set_xlim(-1.6, rounds + 0.6); ax.set_ylim(-0.6, M + 0.15)
    ax.set_xticks(range(0, rounds + 1, 2)); ax.set_yticks([])
    ax.spines["left"].set_visible(False)
    ax.set_xlabel("exchange round (attempts alternate between even and odd neighbour pairs)")
    ax.text(rounds + 0.55, -0.55, "×  rejected swap", fontsize=8.5, color=style.INK3, ha="right", va="bottom")
    ax.annotate("one configuration (bold teal)\nclimbs to the hottest rung and comes back down", (paths[0].index(max(paths[0])), max(paths[0])),
                xytext=(0.0, 4.85), fontsize=8.5, color=style.TEAL, va="center", linespacing=1.25,
                arrowprops=dict(arrowstyle="-", color=style.TEAL, lw=0.8, shrinkB=5))
    style.save(fig, SLUG, "braid")
    print("  braid: hero path", paths[0], " accepted", sum(e[2] for e in events), "of", len(events))


# ---------------------------------------------------------------------------------------------------------------
def acc_harmonic(f, ratio):
    """Mean acceptance between neighbours T and ratio*T for f quadratic degrees of freedom (Gaussian limit)."""
    return erfc(sqrt(f / 8.0) * (ratio - 1) / sqrt(ratio))


def ratio_for(f, target):
    lo, hi = 1.0 + 1e-9, 3.0
    for _ in range(80):
        mid = 0.5 * (lo + hi)
        if acc_harmonic(f, mid) > target: lo = mid
        else: hi = mid
    return lo


def n_replicas(f, target, Tmin=300.0, Tmax=450.0):
    return 1 + ceil(log(Tmax / Tmin) / log(ratio_for(f, target)))


def ladder():
    rng = np.random.default_rng(8)
    natoms = 500; f = 3 * natoms
    M = n_replicas(f, 0.25)
    T = 300.0 * (1.5) ** (np.arange(M) / (M - 1))
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.32, width_ratios=[1.15, 1]))
    a = axs[0]
    cols = ramp(M)
    samples = [rng.gamma(f / 2, R * t, 400_000) for t in T]      # exact distribution of U for f quadratic terms
    grid = np.linspace(1700, 3150, 240)
    accs = []
    for i, t in enumerate(T):
        k = R * t
        logp = (f / 2 - 1) * np.log(grid / k) - grid / k
        p = np.exp(logp - logp.max()); p /= p.sum() * (grid[1] - grid[0])
        a.fill_between(grid, 0, p * 1000, color=cols[i], alpha=0.18, lw=0)
        a.plot(grid, p * 1000, color=cols[i], lw=1.4)
        if i + 1 < M:
            bi, bj = 1 / (R * T[i]), 1 / (R * T[i + 1])
            x = (bi - bj) * (samples[i] - samples[i + 1])
            accs.append(np.minimum(1, np.exp(np.minimum(x, 0))).mean())
    for i in range(M):
        a.text(f / 2 * R * T[i], 6.5 if i % 2 == 0 else 7.2, f"{T[i]:.0f}", fontsize=8, color=cols[i], ha="center")
    a.text(1700, 7.95, "T (K):", fontsize=8, color=style.INK2, va="bottom")
    a.set_ylim(0, 8.6)
    a.set_xlabel("potential energy above the minimum (kJ/mol)"); a.set_ylabel("density (per MJ/mol)")
    a.set_title(f"{natoms} atoms, {M} replicas, 300–450 K")
    a.text(3150, 7.95, f"acceptance {np.mean(accs):.2f}, every pair", fontsize=8, color=style.INK2,
           ha="right", va="bottom")
    a = axs[1]
    Ns = np.logspace(1, 5.3, 60)
    for tgt, col, yl in [(0.2, style.TEAL, 26), (0.3, style.ORANGE, 42)]:
        Ms = [n_replicas(3 * n, tgt) for n in Ns]
        a.loglog(Ns, Ms, color=col, lw=1.8)
        a.text(13, yl, f"acceptance {tgt:.0%}", fontsize=8.5, color=col, va="center")
    for n, lab, dx in [(500, "500 atoms", 1.0), (30000, "solvated protein,\n30 000 atoms", 1.0)]:
        m = n_replicas(3 * n, 0.25)
        a.plot(n, m, "o", ms=5, color=style.INK)
        a.text(n * 0.8, m * 1.3, f"{lab}: {m}", fontsize=8.5, color=style.INK, ha="right", va="bottom", linespacing=1.2)
    a.set_xlabel("atoms (harmonic model, $f = 3N$)"); a.set_ylabel("replicas for 300–450 K")
    a.set_title("Replicas grow as $N^{1/2}$")
    a.set_ylim(1.5, 300); a.set_xlim(10, 2e5)
    style.save(fig, SLUG, "ladder")
    print(f"  ladder: 500 atoms -> {M} replicas, ratio {ratio_for(f, 0.25):.4f}, acceptances {np.round(accs, 3)}")
    for n in (100, 500, 2000, 30000, 100000):
        print(f"     N={n}: M(20%)={n_replicas(3*n, 0.2)}  M(25%)={n_replicas(3*n, 0.25)}  M(30%)={n_replicas(3*n, 0.3)}")


# ---------------------------------------------------------------------------------------------------------------
def boost():
    x = np.linspace(0, 4, 800)
    U = 12 * np.sin(np.pi * x / 2) ** 2 + 6 * np.sin(1.5 * np.pi * x) ** 2 - 3 * x       # kJ/mol, rugged
    U -= U.min()
    Vmin, Vmax = U.min(), U.max()
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.1), gridspec_kw=dict(wspace=0.25), sharey=True)
    a = axs[0]
    E = 14.0
    a.plot(x, U, color=style.BLUE)
    for alpha, col, lab in [(20.0, style.TEAL, "$\\alpha$ = 20"), (3.0, style.ORANGE, "$\\alpha$ = 3")]:
        dU = np.where(U < E, (E - U) ** 2 / (alpha + E - U), 0.0)
        a.plot(x, U + dU, color=col, lw=1.6)
    a.axhline(E, color=style.INK3, lw=1, ls=(0, (3, 2)))
    a.text(3.98, E + 0.6, "threshold $E$", fontsize=8.5, color=style.INK3, ha="right")
    a.text(0.05, 26.5, "$U$", fontsize=9, color=style.BLUE)
    j = np.argmin(np.where((x > 2) & (x < 3), U, np.inf))
    for alpha, col, yt in [(20.0, style.TEAL, 2.0), (3.0, style.ORANGE, 5.5)]:
        yb = U[j] + (E - U[j]) ** 2 / (alpha + E - U[j])
        a.annotate(f"$\\alpha$ = {alpha:g}", (x[j], yb), xytext=(0.6, yt), fontsize=8.5, color=col, va="center",
                   arrowprops=dict(arrowstyle="-", color=col, lw=0.8, shrinkB=2))
    a.set_title("aMD: $\\Delta U = (E-U)^2/(\\alpha+E-U)$")
    a.set_xlabel("coordinate"); a.set_ylabel("energy (kJ/mol)")
    a = axs[1]
    E2 = Vmax
    a.plot(x, U, color=style.BLUE)
    for k0, col in [(1.0, style.TEAL), (0.5, style.ORANGE)]:
        k = k0 / (Vmax - Vmin)
        dU = np.where(U < E2, 0.5 * k * (E2 - U) ** 2, 0.0)
        a.plot(x, U + dU, color=col, lw=1.6)
        j = np.argmin(np.where((x > 2) & (x < 3), U, np.inf))
        a.annotate(f"$k_0$ = {k0:g}", (x[j], (U + dU)[j]), xytext=(0.6, 2.0 if k0 == 1.0 else 5.5), fontsize=8.5,
                   color=col, va="center", arrowprops=dict(arrowstyle="-", color=col, lw=0.8, shrinkB=2))
    a.axhline(E2, color=style.INK3, lw=1, ls=(0, (3, 2)))
    a.text(0.02, E2 + 0.6, "$E = U_{\\max}$", fontsize=8.5, color=style.INK3)
    a.set_title("GaMD: $\\Delta U = \\frac{1}{2}k(E-U)^2$")
    a.set_xlabel("coordinate")
    a.set_ylim(-1, 32)
    for a in axs: a.set_xticks([])
    style.save(fig, SLUG, "boost")
    print(f"  boost: Vmax {Vmax:.1f}")


# ---------------------------------------------------------------------------------------------------------------
def cover():
    def cluster(ax, cx, cy, r, col):
        pts = [(cx, cy)] + [(cx + r * np.cos(a), cy + r * np.sin(a)) for a in np.arange(6) * np.pi / 3 + 0.3]
        for (px, py) in pts:
            ax.add_patch(mpatches.Circle((px, py), r * 0.42, color=col, zorder=4))

    def draw(ax):
        n = 4
        cols = ramp(n)
        ys = [0.25, 0.95, 1.65, 2.35]
        for i, (y, col) in enumerate(zip(ys, cols)):
            ax.add_patch(FancyBboxPatch((1.05, y), 1.9, 0.5, boxstyle="round,pad=0,rounding_size=0.12",
                                        color=col, zorder=2))
            cluster(ax, 2.0, y + 0.25, 0.13, "white")
        for i in range(n - 1):
            side = 1 if i % 2 == 0 else -1
            xa = 3.1 if side > 0 else 0.9
            ax.annotate("", (xa, ys[i + 1] + 0.22), (xa, ys[i] + 0.28),
                        arrowprops=dict(arrowstyle="<|-|>", color=style.INK, lw=2.6, mutation_scale=16,
                                        connectionstyle=f"arc3,rad={-0.6 * side}"), zorder=5)
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    braid(); ladder(); boost(); cover()
