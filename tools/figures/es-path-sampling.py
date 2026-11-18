"""Figures for content/learn/es-path-sampling.md.  Run: python3 tools/figures/es-path-sampling.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import FancyBboxPatch, Polygon, Circle, Ellipse
import style
plt = style.setup()
SLUG = "es-path-sampling"


def overdamped(force, x0, nsteps, dt, rng):
    """Overdamped Langevin dynamics with D = kT = 1 (reduced units)."""
    x = np.empty(nsteps); x[0] = x0; xc = x0
    kick = rng.standard_normal(nsteps) * np.sqrt(2 * dt)
    for i in range(1, nsteps):
        xc = xc + force(xc) * dt + kick[i]
        x[i] = xc
    return x


# ---------------------------------------------------------------------------------------------
# 1. Waiting versus crossing: a long trajectory in a 5 kT double well and one transition path
# ---------------------------------------------------------------------------------------------
def waiting():
    Eb, dt, n = 5.0, 1e-3, 400_000
    rng = np.random.default_rng(1)
    x = overdamped(lambda x: -4 * Eb * x * (x * x - 1), -1.0, n, dt, rng)
    t = np.arange(n) * dt
    lab = np.where(x < -0.7, -1, np.where(x > 0.7, 1, 0))
    paths, state, last_in = [], -1, 0           # transition path = last exit from one state to first entry in the other
    for i in range(n):
        if lab[i] != 0:
            if lab[i] != state:
                paths.append((last_in, i)); state = lab[i]
            last_in = i
    dur = np.array([(b - a) * dt for a, b in paths])
    print(f"waiting: {len(paths)} transitions in {n*dt:.0f} time units; mean path duration {dur.mean():.3f}; "
          f"fraction of time on transition paths {dur.sum()/(n*dt)*100:.2f} %; Kramers mean wait "
          f"{2*np.pi/np.sqrt(32*Eb*Eb)*np.exp(Eb):.1f}")

    fig, (a1, a2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw=dict(width_ratios=[2.3, 1], wspace=0.28))
    k = 100                                         # thin the long trace for the overview
    for ax in (a1, a2):
        ax.axhspan(-1.6, -0.7, color=style.TINT[style.TEAL], zorder=0)
        ax.axhspan(0.7, 1.6, color=style.TINT[style.BLUE], zorder=0)
    a1.plot(t[::k], x[::k], color=style.INK3, lw=0.6, rasterized=False)
    for a, b in paths:
        a1.plot(t[a:b + 1:5], x[a:b + 1:5], color=style.ORANGE, lw=1.6)
    a1.set_xlim(0, n * dt); a1.set_ylim(-1.6, 1.6)
    a1.set_xlabel("time (reduced units, a²/D)"); a1.set_ylabel("position x (a)")
    for yy, txt, col in ((-1.42, "state A", style.TEAL), (1.3, "state B", style.BLUE)):
        a1.text(6, yy, txt, color=col, fontsize=9, fontweight="semibold",
                bbox=dict(fc="white", ec="none", pad=1.5, alpha=0.9), zorder=5)
    a1.set_title(f"{len(paths)} transitions in {n*dt:.0f} time units", fontsize=10)
    # zoom on the fourth transition
    a, b = paths[3]
    lo, hi = a - 400, b + 400
    a2.plot(t[lo:hi] - t[a], x[lo:hi], color=style.INK3, lw=0.8)
    a2.plot(t[a:b + 1] - t[a], x[a:b + 1], color=style.ORANGE, lw=1.8)
    a2.set_xlim(t[lo] - t[a], t[hi - 1] - t[a]); a2.set_ylim(-1.6, 1.6)
    a2.set_xlabel("time from last exit (a²/D)")
    a2.set_title("one transition path", fontsize=10)
    a2.text(0.98, 0.42, f"lasts {(b-a)*dt:.2f}", transform=a2.transAxes, ha="right", fontsize=9,
            color=style.ORANGE, fontweight="semibold")
    a1.annotate("", xy=(t[a] - 2, -0.2), xytext=(t[a] - 30, -0.2),
                arrowprops=dict(arrowstyle="->", color=style.INK2, lw=0.8))
    a1.text(t[a] - 31, -0.2, "zoom", ha="right", va="center", fontsize=8.5, color=style.INK2)
    style.save(fig, SLUG, "waiting")


# ---------------------------------------------------------------------------------------------
# 2. Interfaces: a forward-flux tree (schematic, real Brownian paths) and the product of probabilities
# ---------------------------------------------------------------------------------------------
def interfaces():
    # exact conditional probabilities for U = 12 (x^2 - 1)^2, state A: x < -0.9, B: x > 0.9
    Eb, lA, lB = 12.0, -0.9, 0.9
    xs = np.linspace(lA, lB, 400_001); dx = xs[1] - xs[0]
    e = np.exp(Eb * (xs ** 2 - 1) ** 2)
    I = np.concatenate([[0], np.cumsum((e[1:] + e[:-1]) / 2 * dx)])      # splitting probabilities in 1D
    lam = [-0.8]
    while np.interp(lam[-1], xs, I) / 0.2 < I[-1]:
        lam.append(float(np.interp(np.interp(lam[-1], xs, I) / 0.2, I, xs)))
    lam = np.array(lam + [lB])
    Il = np.interp(lam, xs, I); P = Il[:-1] / Il[1:]; cum = np.concatenate([[1], np.cumprod(P)])
    print("interfaces:", np.round(lam, 2), "P:", np.round(P, 3), f"product {cum[-1]:.3g}")

    fig, (a1, a2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw=dict(width_ratios=[1.25, 1], wspace=0.3))
    # left: schematic tree of trial trajectories between four interfaces, uphill drift
    rng = np.random.default_rng(7)
    L = [0.0, 1.0, 2.0, 3.0]                           # interface positions in the sketch
    a1.add_patch(FancyBboxPatch((-1.05, -1.25), 0.75, 2.5, boxstyle="round,pad=0,rounding_size=0.25",
                                fc=style.TINT[style.TEAL], ec=style.TEAL, lw=1.2))
    a1.text(-0.68, 0, "A", ha="center", va="center", fontsize=14, fontweight="semibold", color=style.TEAL)
    a1.add_patch(FancyBboxPatch((4.0, -1.25), 0.75, 2.5, boxstyle="round,pad=0,rounding_size=0.25",
                                fc=style.TINT[style.BLUE], ec=style.BLUE, lw=1.2))
    a1.text(4.38, 0, "B", ha="center", va="center", fontsize=14, fontweight="semibold", color=style.BLUE)
    for i, l in enumerate(L):
        a1.plot([l, l], [-1.3, 1.3], color=style.VIOLET, lw=1.0, ls=(0, (4, 3)))
        a1.text(l, 1.42, f"λ{chr(0x2080 + i)}", ha="center", fontsize=9, color=style.VIOLET)

    def curve(p0, p1, bulge, wig, n=120):
        """A smooth wiggly curve from p0 to p1 (schematic trajectory)."""
        t = np.linspace(0, 1, n)
        x = p0[0] + (p1[0] - p0[0]) * t
        y = p0[1] + (p1[1] - p0[1]) * t + bulge * np.sin(np.pi * t)
        ph = rng.uniform(0, 6.3, 3)
        w = sum(wig / (j + 1) * np.sin((j + 2) * 2.3 * np.pi * t + ph[j]) for j in range(3)) * np.sin(np.pi * t)
        return x + 0.35 * w, y + w

    def fail(p0, reach, dy):
        """Goes out towards the next interface, turns round and heads back to A (arrow)."""
        t = np.linspace(0, 1, 120)
        x = p0[0] + reach * np.sin(np.pi * t) - 0.45 * t
        y = p0[1] + dy * t
        ph = rng.uniform(0, 6.3)
        y = y + 0.05 * np.sin(5 * np.pi * t + ph) * np.sin(np.pi * t)
        a1.plot(x, y, color=style.INK3, lw=0.9, zorder=2)
        a1.annotate("", xy=(x[-1], y[-1]), xytext=(x[-6], y[-6]),
                    arrowprops=dict(arrowstyle="-|>", color=style.INK3, lw=0.9, mutation_scale=7))

    tree = {0: [(0.25, [0.45, -0.35])], 1: [(0.45, [0.6]), (-0.35, [-0.55])], 2: [(0.6, [0.85]), (-0.55, [-0.3])]}
    for i in range(3):
        for y0, ends in tree[i]:
            for y1 in ends:
                x, y = curve((L[i], y0), (L[i + 1], y1), 0.15 * np.sign(y1 - y0 + 1e-9), 0.07)
                a1.plot(x, y, color=style.ORANGE, lw=1.5, zorder=3)
                a1.plot(L[i + 1], y1, "o", ms=4, color=style.ORANGE, zorder=4)
            for j, (reach, dy) in enumerate([(0.55, 0.25), (0.75, -0.25)][: 2 if i < 2 else 1]):
                fail((L[i], y0), reach, dy if y0 < 0.5 else -abs(dy))
    for y in (0.6, 0.85, -0.3, -0.55):
        x, yy = curve((L[3], y), (4.0, 0.5 * y), 0.05, 0.03)
        a1.plot(x, yy, color=style.ORANGE, lw=1.5, zorder=3, alpha=0.55)
    a1.plot(0.0, 0.25, "o", ms=4, color=style.TEAL, zorder=4)
    a1.set_xlim(-1.15, 4.85); a1.set_ylim(-1.35, 1.65); a1.axis("off")
    a1.set_title("Trials launched from each interface", fontsize=10)
    a1.text(1.5, -1.55, "orange: reach the next interface   grey: turn back to A", ha="center", fontsize=8.5,
            color=style.INK2)
    # right: cumulative probability of the worked example
    idx = np.arange(len(cum))
    a2.semilogy(idx, cum, "-o", color=style.ORANGE, ms=4.5, lw=1.6)
    a2.set_xticks(idx)
    a2.set_xticklabels([f"{i}" for i in idx[:-1]] + ["B"])
    a2.set_xlabel("interface reached")
    a2.set_ylabel("P(reach interface | left λ₀)")
    a2.set_ylim(1e-6, 3)
    for i in (1, 4):
        a2.annotate(f"× {P[i-1]:.1f}", xy=(i - 0.5, np.sqrt(cum[i - 1] * cum[i])), xytext=(i - 0.15, cum[i - 1] * 1.5),
                    fontsize=8.5, color=style.INK2)
    a2.annotate(f"× {P[-1]:.2f}", xy=(len(cum) - 1.5, cum[-2]), xytext=(len(cum) - 2.4, cum[-2] * 4),
                fontsize=8.5, color=style.INK2)
    a2.text(len(cum) - 1, cum[-1] * 0.32, "$%.1f\\times10^{%d}$" % (cum[-1] / 10 ** np.floor(np.log10(cum[-1])), np.floor(np.log10(cum[-1]))), ha="right", fontsize=9,
            color=style.ORANGE, fontweight="semibold")
    a2.set_title("12 $k_BT$ barrier, interfaces at P = 0.2", fontsize=10)
    a2.grid(axis="y", which="major")
    style.save(fig, SLUG, "interfaces")


# ---------------------------------------------------------------------------------------------
# 3. The committor histogram test on a tilted double well
# ---------------------------------------------------------------------------------------------
def committor_test():
    Eb, kap, th = 5.0, 6.0, np.deg2rad(30)
    c, s = np.cos(th), np.sin(th)
    rng = np.random.default_rng(2)

    def rs(x, y): return x * c + y * s, -x * s + y * c
    def U(x, y):
        r, q = rs(x, y); return Eb * (r * r - 1) ** 2 + 0.5 * kap * q * q
    def force(x, y):
        r, q = rs(x, y); dr = 4 * Eb * r * (r * r - 1); dq = kap * q
        return -(dr * c - dq * s), -(dr * s + dq * c)
    def on_line(kind, n):
        u = np.linspace(-3, 3, 6001)
        x, y = (np.zeros_like(u), u) if kind == "x" else (-u * s, u * c)
        p = np.exp(-(U(x, y) - U(x, y).min())); p /= p.sum()
        i = rng.choice(len(u), n, p=p); return x[i], y[i]
    def committor(x0, y0, nshot=100, dt=1e-3):
        X, Y = np.repeat(x0, nshot), np.repeat(y0, nshot)
        hitB, alive = np.zeros(len(X)), np.ones(len(X), bool)
        for _ in range(20000):
            fx, fy = force(X, Y)
            X = X + fx * dt + np.sqrt(2 * dt) * rng.standard_normal(len(X))
            Y = Y + fy * dt + np.sqrt(2 * dt) * rng.standard_normal(len(X))
            r, _ = rs(X, Y)
            b, a = alive & (r > 0.8), alive & (r < -0.8)
            hitB[b] = 1; alive &= ~(a | b)
            if not alive.any(): break
        return hitB.reshape(-1, nshot).mean(1)
    xa, ya = on_line("x", 200); qa = committor(xa, ya)
    xb, yb = on_line("r", 200); qb = committor(xb, yb)
    for name, q in (("x = 0", qa), ("r = 0", qb)):
        print(f"committor test {name}: fraction within 0.4-0.6: {np.mean((q>0.4)&(q<0.6)):.2f}; "
              f"below 0.1 or above 0.9: {np.mean((q<0.1)|(q>0.9)):.2f}; sd {q.std():.3f}")

    fig, (a1, a2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw=dict(width_ratios=[1.15, 1], wspace=0.32))
    gx, gy = np.meshgrid(np.linspace(-2, 2, 161), np.linspace(-1.8, 1.8, 145))
    gx, gy = np.meshgrid(np.linspace(-2, 2, 81), np.linspace(-1.8, 1.8, 73))
    cf = a1.contourf(gx, gy, U(gx, gy), levels=np.arange(0, 14, 1.5), cmap=LinearSegmentedColormap.from_list(
        "u", ["#ffffff", style.TINT[style.BLUE], "#c5d0fb"]), extend="max")
    cf.set_rasterized(True)
    a1.contour(gx, gy, U(gx, gy), levels=np.arange(0, 14, 1.5), colors="#d3d8e2", linewidths=0.6)
    cm = LinearSegmentedColormap.from_list("q", [style.TEAL, "#e9ecf2", style.BLUE])
    a1.plot([0, 0], [-1.8, 1.8], color=style.ORANGE, lw=1.4, ls=(0, (4, 2)))
    u = np.linspace(-2.1, 2.1, 2)
    a1.plot(-u * s, u * c, color=style.VIOLET, lw=1.4)
    a1.scatter(xa, ya, c=qa, cmap=cm, vmin=0, vmax=1, s=9, edgecolor=style.INK2, linewidth=0.3, zorder=3)
    a1.scatter(xb, yb, c=qb, cmap=cm, vmin=0, vmax=1, s=9, edgecolor=style.INK2, linewidth=0.3, zorder=3)
    a1.text(-1.0, -0.95, "A", fontsize=13, fontweight="semibold", color=style.TEAL, ha="center")
    a1.text(1.0, 0.85, "B", fontsize=13, fontweight="semibold", color=style.BLUE, ha="center")
    a1.text(0.07, -1.7, "x = 0", color=style.ORANGE, fontsize=9, fontweight="semibold")
    a1.text(-0.98, 1.45, "true dividing\nsurface", color=style.VIOLET, fontsize=9, fontweight="semibold", ha="center")
    a1.set_xlim(-2, 2); a1.set_ylim(-1.8, 1.8); a1.set_aspect("equal")
    a1.set_xlabel("x (reduced units)"); a1.set_ylabel("y (reduced units)")
    a1.set_title("Configurations on two surfaces", fontsize=10)
    bins = np.linspace(0, 1, 11)
    a2.hist(qb, bins=bins, color=style.VIOLET, alpha=0.85, rwidth=0.86, zorder=2)
    a2.hist(qa, bins=bins, histtype="step", color=style.ORANGE, lw=1.8, zorder=3)
    a2.set_xlabel("estimated committor (100 shots each)"); a2.set_ylabel("configurations")
    a2.text(0.62, np.histogram(qb, bins)[0].max() * 0.9, "true dividing surface:\npeaked at ½", color=style.VIOLET,
            fontsize=9)
    a2.text(0.05, np.histogram(qa, bins)[0][0] + 8, "x = 0: spread\nfrom 0 to 1", color=style.ORANGE, fontsize=9)
    a2.set_xlim(0, 1)
    a2.set_title("Committor histograms", fontsize=10)
    style.save(fig, SLUG, "committor-test")


# ---------------------------------------------------------------------------------------------
# Cover: ropes thrown over a mountain pass, in the dark
# ---------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        rng = np.random.default_rng(3)
        for _ in range(40):                                   # a few stars
            ax.add_patch(Circle((rng.uniform(0, 4), rng.uniform(1.9, 3)), rng.uniform(0.008, 0.02), color="#ffffff",
                                alpha=rng.uniform(0.3, 0.8)))
        X = np.linspace(0, 4, 400)
        ridge = 0.55 + 1.15 * np.exp(-((X - 2) / 0.62) ** 2) + 0.25 * np.exp(-((X - 1.15) / 0.3) ** 2) \
            + 0.3 * np.exp(-((X - 2.95) / 0.35) ** 2)
        far = 0.9 + 0.9 * np.exp(-((X - 1.5) / 0.7) ** 2) + 0.7 * np.exp(-((X - 2.9) / 0.6) ** 2)
        ax.add_patch(Polygon(np.c_[np.r_[X, 4, 0], np.r_[far, 0, 0]], color="#1f2a44"))
        ax.add_patch(Polygon(np.c_[np.r_[X, 4, 0], np.r_[ridge, 0, 0]], color="#2c3a5c"))
        ax.add_patch(Ellipse((0.55, 0.42), 0.95, 0.42, color=style.TEAL))
        ax.add_patch(Ellipse((3.45, 0.42), 0.95, 0.42, color=style.BLUE))
        for k, (h, col, lw) in enumerate([(1.85, style.ORANGE, 3.2), (1.98, style.GOLD, 2.4), (1.75, style.PINK, 2.0),
                                          (2.1, style.ORANGE, 1.6)]):
            t = np.linspace(0, 1, 200)
            xs = 0.55 + 2.9 * t
            ys = 0.48 + (h - 0.48) * np.sin(np.pi * t) ** 1.3 + 0.05 * np.sin(9 * np.pi * t + k) * np.sin(np.pi * t)
            ax.plot(xs, ys, color=col, lw=lw, solid_capstyle="round")
    style.cover(SLUG, draw, bg=style.INK)


if __name__ == "__main__":
    waiting(); interfaces(); committor_test(); cover()
