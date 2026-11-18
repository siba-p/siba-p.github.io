"""Figures for content/learn/networks-bend-space.md.  Run: python3 tools/figures/networks-bend-space.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import Circle, Polygon
import style
plt = style.setup()
SLUG = "networks-bend-space"
ELEV, AZIM = 15, 20
sig = lambda z: 1 / (1 + np.exp(-z))
CMAP = LinearSegmentedColormap.from_list("bo", [style.TINT[style.BLUE], "white", style.TINT[style.ORANGE]])


def xor_fold():
    """The hand-built XOR network of the chapter: input plane, hidden plane, and the decision pulled back."""
    X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]]); T = [0, 1, 1, 0]
    hid = lambda x1, x2: (sig(20 * x1 + 20 * x2 - 10), sig(20 * x1 + 20 * x2 - 30))
    fig, axs = plt.subplots(1, 3, figsize=(7.2, 2.85), gridspec_kw=dict(wspace=0.32))
    lo, hi = -0.3, 1.3
    xs = np.array([lo, hi])

    a = axs[0]
    a.plot(xs, 0.5 - xs, color=style.TEAL, lw=1.8)
    a.plot(xs, 1.5 - xs, color=style.VIOLET, lw=1.8)
    a.text(-0.27, 0.3, "$h_1$: OR", color=style.TEAL, fontsize=9)
    a.text(1.33, -0.2, "$h_2$:\nAND", color=style.VIOLET, fontsize=9, ha="left", clip_on=False)
    a.set_title("input plane")

    b = axs[1]
    s = np.linspace(-1.5, 3, 2000)
    b.plot(sig(20 * s - 10), sig(20 * s - 30), color=style.INK3, lw=1.2, ls=(0, (3, 2)), zorder=1)
    hx = np.array([-0.15, 1.15])
    b.fill_between(hx, hx - 0.5, -0.3, color=style.TINT[style.ORANGE], zorder=0)
    b.fill_between(hx, hx - 0.5, 1.15, color=style.TINT[style.BLUE], zorder=0)
    b.plot(hx, hx - 0.5, color=style.INK2, lw=1.6)
    b.text(0.36, 0.95, "the whole plane\nlands on this curve", fontsize=8.5, color=style.INK3, ha="center", va="top")
    for (x1, x2), t in zip(X, T):
        h1, h2 = hid(x1, x2)
        b.plot(h1, h2, "o", ms=11, color=style.ORANGE if t else style.BLUE, mec="white", mew=1.5, zorder=4)
    b.text(1.0, -0.14, "(0,1), (1,0)", fontsize=8.5, color=style.ORANGE, ha="center", va="top")
    b.text(0.0, -0.14, "(0,0)", fontsize=8.5, color=style.BLUE, ha="center", va="top")
    b.text(0.93, 0.98, "(1,1)", fontsize=8.5, color=style.BLUE, ha="right", va="top")
    b.set_xlim(-0.15, 1.15); b.set_ylim(-0.3, 1.15); b.set_aspect("equal")
    b.set_xlabel("$h_1$"); b.set_ylabel("$h_2$", labelpad=1)
    b.set_xticks([0, 1]); b.set_yticks([0, 1])
    b.set_title("hidden plane")

    c = axs[2]
    g = np.linspace(lo, hi, 321)
    G1, G2 = np.meshgrid(g, g)
    H1, H2 = hid(G1, G2)
    P = sig(20 * H1 - 20 * H2 - 10)
    c.imshow(P, extent=(lo, hi, lo, hi), origin="lower", cmap=CMAP, vmin=0, vmax=1, interpolation="bilinear", zorder=0)
    c.contour(G1, G2, P, levels=[0.5], colors=[style.INK2], linewidths=1.6)
    c.text(0.5, 0.5, "output 1", fontsize=8.5, color=style.ORANGE, ha="center", va="center", rotation=-45, fontweight="semibold")
    c.set_title("decision, pulled back")

    for ax in (a, c):
        for (x1, x2), t in zip(X, T):
            ax.plot(x1, x2, "o", ms=11, color=style.ORANGE if t else style.BLUE, mec="white", mew=1.5, zorder=4)
        ax.set_xlim(lo, hi); ax.set_ylim(lo, hi); ax.set_aspect("equal")
        ax.set_xticks([0, 1]); ax.set_yticks([0, 1])
        ax.set_xlabel("$x_1$"); ax.set_ylabel("$x_2$", labelpad=1)
    style.save(fig, SLUG, "xor-fold")


def sawtooth():
    """Composing the tent map: pieces double with every layer; a single hidden layer adds one per neuron."""
    relu = lambda z: np.maximum(z, 0)
    T = lambda x: 2 * relu(x) - 4 * relu(x - 0.5)
    fig, (a, b) = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.62, width_ratios=[1, 1.05]))
    x = np.linspace(0, 1, 4001)
    y = x.copy()
    cols = [style.BLUE, style.TEAL, style.VIOLET, style.ORANGE]
    off = 0
    for L in range(1, 5):
        y = T(y)
        a.plot(x, y + off, color=cols[L - 1], lw=1.6)
        a.text(1.04, off + 0.5, f"{L} layer{'s' if L > 1 else ''}\n{2 ** L} pieces", fontsize=8.5, color=cols[L - 1], va="center")
        off += 1.35
    a.set_xlim(0, 1); a.set_ylim(-0.1, off - 0.2); a.set_yticks([])
    a.spines["left"].set_visible(False)
    a.set_xlabel("input $x$")
    a.set_title("tent map composed $L$ times")

    L = np.arange(1, 11)
    b.semilogy(2 * L, 2.0 ** L, "o-", color=style.ORANGE, ms=4.5, lw=1.8)
    n = np.arange(1, 2049)
    b.semilogy(n, n + 1, color=style.BLUE, lw=1.8)
    b.set_xscale("log")
    b.axhline(1024, color=style.INK3, lw=0.8, ls=(0, (3, 2)))
    b.plot([20], [1024], "o", ms=6, color=style.ORANGE, zorder=5)
    b.plot([1023], [1024], "o", ms=6, color=style.BLUE, zorder=5)
    b.text(20, 1700, "deep: 20 neurons", color=style.ORANGE, fontsize=8.5, ha="center")
    b.text(1023, 520, "shallow:\n1023 neurons", color=style.BLUE, fontsize=8.5, ha="center", va="top")
    b.text(1.15, 250, "two ReLU neurons\nper layer: $2^L$", color=style.ORANGE, fontsize=8.5)
    b.text(60, 12, "one hidden layer:\n$n + 1$", color=style.BLUE, fontsize=8.5)
    b.set_xlim(1, 3000); b.set_ylim(1.5, 6000)
    b.set_xlabel("ReLU neurons"); b.set_ylabel("linear pieces")
    b.set_title("pieces per neuron")
    style.save(fig, SLUG, "sawtooth")


def ring_lift():
    """Three tanh neurons, each cutting along one side of a triangle, lift the disc to a corner of the cube."""
    rng = np.random.default_rng(1)
    n = 120
    r = 0.6 * np.sqrt(rng.random(n)); t = 2 * np.pi * rng.random(n)
    D = np.c_[r * np.cos(t), r * np.sin(t)]
    q = 2 * np.pi * rng.random(n)
    Rg = np.c_[1.9 * np.cos(q), 1.9 * np.sin(q)] + 0.12 * rng.normal(size=(n, 2))
    ang = np.radians([90, 210, 330]); U = np.c_[np.cos(ang), np.sin(ang)]
    s, d = 5.0, 0.85
    HD, HR = np.tanh(s * (d - D @ U.T)), np.tanh(s * (d - Rg @ U.T))

    fig = plt.figure(figsize=(7.2, 3.4))
    a = fig.add_axes([0.02, 0.08, 0.42, 0.84])
    verts = np.array([-2 * d * u for u in U])       # the triangle whose sides are the three lines u_k . x = d
    a.add_patch(Polygon(verts, closed=True, fc=style.TINT[style.GOLD], ec="none", zorder=0))
    for k, (u, col) in enumerate(zip(U, [style.TEAL, style.VIOLET, style.PINK])):
        p0 = d * u; tdir = np.array([-u[1], u[0]])
        seg = np.array([p0 - 2.4 * tdir, p0 + 2.4 * tdir])
        a.plot(seg[:, 0], seg[:, 1], color=col, lw=1.6, zorder=1)
        a.text(*(p0 * 2.85 / d * 0.5 + 0.0), f"$h_{k + 1}$", color=col, fontsize=10, ha="center", va="center")
    a.scatter(D[:, 0], D[:, 1], s=9, color=style.ORANGE, zorder=3, lw=0)
    a.scatter(Rg[:, 0], Rg[:, 1], s=9, color=style.BLUE, zorder=3, lw=0)
    a.set_xlim(-2.5, 2.5); a.set_ylim(-2.4, 2.4); a.set_aspect("equal")
    a.set_xlabel("$x_1$"); a.set_ylabel("$x_2$", labelpad=1)
    a.set_title("input plane: three cuts")

    b = fig.add_axes([0.47, 0.12, 0.53, 0.88], projection="3d")
    b.scatter(*HR.T, s=9, color=style.BLUE, depthshade=False, lw=0)
    b.scatter(*HD.T, s=9, color=style.ORANGE, depthshade=False, lw=0)
    gg = np.linspace(-1, 1, 2)
    G1, G2 = np.meshgrid(gg, gg)
    G3 = 2 - G1 - G2
    G3 = np.where(G3 > 1.0, np.nan, G3)
    tri = np.array([[1, 1, 0], [1, 0, 1], [0, 1, 1]], float)
    from mpl_toolkits.mplot3d.art3d import Poly3DCollection
    b.add_collection3d(Poly3DCollection([tri], facecolor=style.GOLD, alpha=0.35, edgecolor=style.GOLD, lw=1.2))
    fig.text(0.53, 0.06, "disc: all three $h_k \\approx 1$, sum ≥ %.2f" % HD.sum(1).min(), color=style.ORANGE, fontsize=8.5)
    fig.text(0.53, 0.0, "ring: some $h_k \\approx -1$, sum ≤ %.2f" % HR.sum(1).max(), color=style.BLUE, fontsize=8.5)
    fig.text(0.53, 0.12, "gold: the plane $h_1 + h_2 + h_3 = 2$", color=style.GOLD, fontsize=8.5)
    for set_ in (b.set_xlim, b.set_ylim, b.set_zlim):
        set_(-1.05, 1.05)
    b.set_xticks([-1, 1]); b.set_yticks([-1, 1]); b.set_zticks([-1, 1])
    b.set_xlabel("$h_1$", labelpad=-8); b.set_ylabel("$h_2$", labelpad=-8); b.set_zlabel("$h_3$", labelpad=-8)
    b.tick_params(pad=-3, labelsize=8)
    b.view_init(elev=ELEV, azim=AZIM)
    for axis in (b.xaxis, b.yaxis, b.zaxis):
        axis.set_pane_color((0.96, 0.97, 0.98, 1.0))
    b.set_title("hidden space: one flat cut", pad=0, y=0.95)
    style.save(fig, SLUG, "ring-lift")
    return HD.sum(1).min(), HR.sum(1).max()


def cover():
    def draw(ax):
        f = lambda x, y: (2 + 1.75 * np.tanh(0.9 * x + 0.25 * y), 1.5 + 1.25 * np.tanh(0.8 * y - 0.35 * x + 0.15 * x * y))
        g = np.linspace(-2.6, 2.6, 300)
        for c in np.linspace(-2.0, 2.0, 8):
            ax.plot(*f(g, np.full_like(g, c)), color=style.BLUE, lw=2.2, alpha=0.55, solid_capstyle="round")
            ax.plot(*f(np.full_like(g, c), g), color=style.VIOLET, lw=2.2, alpha=0.55, solid_capstyle="round")
        rng = np.random.default_rng(4)
        P = rng.uniform([0.6, 0.4], [3.4, 2.6], size=(26, 2))
        for x, y in P:
            above = y - 1.5 > 0.55 * (x - 2)
            if abs((y - 1.5) - 0.55 * (x - 2)) < 0.22:
                continue
            ax.add_patch(Circle((x, y), 0.11, color=style.ORANGE if above else style.TEAL, zorder=4))
        xs = np.array([0.15, 3.85])
        ax.plot(xs, 1.5 + 0.55 * (xs - 2), color=style.INK, lw=4, ls=(0, (2.5, 1.5)), zorder=3)
    style.cover(SLUG, draw, bg=style.TINT[style.VIOLET])


if __name__ == "__main__":
    xor_fold(); sawtooth(); print("ring sums: disc min %.2f, ring max %.2f" % ring_lift()); cover()
