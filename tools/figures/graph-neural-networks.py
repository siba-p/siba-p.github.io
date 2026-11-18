"""Figures for content/learn/graph-neural-networks.md.  Run: python3 tools/figures/graph-neural-networks.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import Circle, FancyArrowPatch, Rectangle
plt = style.setup()
SLUG = "graph-neural-networks"

# ---------------------------------------------------------------------------------------------------------------
# 1. One layer of message passing on formaldehyde: the worked example of the chapter, drawn in three stages
# ---------------------------------------------------------------------------------------------------------------
H0 = np.array([[0, 1], [1, 1], [1, 0], [1, 0]], float)      # C, O, H, H  (embeddings from the text)
BONDS = [(0, 1, 2), (0, 2, 1), (0, 3, 1)]                    # (i, j, bond order)
A = np.array([[0, 1], [-1, 1]], float)                       # the 'learned' update matrix


def messages(h):
    m = np.zeros_like(h)
    for i, j, b in BONDS:
        m[i] += b * h[j]
        m[j] += b * h[i]
    return m


def vec(v):
    return "(" + ", ".join(f"{x:g}" for x in v) + ")"


def layer_by_hand():
    m = messages(H0)
    h1 = np.maximum(0, H0 + m @ A.T)
    assert vec(h1.sum(0)) == "(9, 5)" and vec(m[0]) == "(4, 2)"
    # geometry of one molecule drawing (C in the centre, O above, two H below)
    geo = 1.4 * np.array([[0, 0], [0, 1.1], [-0.95, -0.6], [0.95, -0.6]])
    col = [style.BLUE, style.PINK, style.TEAL, style.TEAL]
    lab = ["C", "O", "H", "H"]
    fig, ax = plt.subplots(figsize=(7.2, 3.5))
    ax.set_xlim(-0.3, 13.3); ax.set_ylim(-3.0, 2.85); ax.set_aspect("equal"); ax.axis("off")
    centres = [2.0, 6.5, 11.0]
    titles = ["1  Embed", "2  Message and sum", "3  Update and read out"]

    def molecule(cx, states=None):
        P = geo + [cx, 0]
        for i, j, b in BONDS:
            (x0, y0), (x1, y1) = P[i], P[j]
            for dx in ((-0.07, 0.07) if b == 2 else (0.0,)):
                ax.plot([x0 + dx, x1 + dx], [y0, y1], color=style.INK3, lw=1.6, zorder=1)
        for k in range(4):
            ax.add_patch(Circle(P[k], 0.34, color=col[k], zorder=3, ec="white", lw=1.5))
            ax.text(*P[k], lab[k], color="white", ha="center", va="center", fontsize=10, weight="semibold", zorder=4)
        if states is not None:
            off = {0: (0.48, 0.0, "left"), 1: (0.48, 0.0, "left"), 2: (0.0, -0.6, "center"), 3: (0.0, -0.6, "center")}
            for k in range(4):
                dx, dy, ha = off[k]
                ax.text(P[k][0] + dx, P[k][1] + dy, vec(states[k]), fontsize=9, color=style.INK, ha=ha, va="center")
        return P

    # stage 1: embeddings and bond orders
    P = molecule(centres[0], H0)
    ax.text(P[0][0] - 0.2, 0.7, "2", fontsize=8.5, color=style.INK2, ha="right", va="center")
    ax.text(P[0][0] - 0.5, -0.72, "1", fontsize=8.5, color=style.INK2, ha="center", va="center")
    ax.text(P[0][0] + 0.5, -0.72, "1", fontsize=8.5, color=style.INK2, ha="center", va="center")
    ax.text(centres[0], -2.15, "bond orders label the edges", fontsize=8.5, color=style.INK2, ha="center")

    # stage 2: the three messages that arrive at carbon, drawn beside the bonds
    P = molecule(centres[1])
    for j, txt, side, lpos, ha in ((1, "2·(1, 1)", -1, (-0.62, 0.95), "right"), (2, "(1, 0)", -1, (-0.42, -1.0), "center"),
                                   (3, "(1, 0)", 1, (0.42, -1.0), "center")):
        d = P[0] - P[j]; L = np.linalg.norm(d); u = d / L; nrm = side * np.array([-u[1], u[0]])
        a, b = P[j] + 0.42 * u + 0.3 * nrm, P[0] - 0.42 * u + 0.3 * nrm
        ax.add_patch(FancyArrowPatch(a, b, arrowstyle="-|>", mutation_scale=12, color=style.ORANGE, lw=2.2, zorder=5,
                                     shrinkA=0, shrinkB=0))
        ax.text(P[0][0] + lpos[0], lpos[1], txt, fontsize=8.5, color=style.ORANGE, ha=ha, va="center")
    ax.text(centres[1], -2.15, "carbon sums  m = " + vec(m[0]), fontsize=9, color=style.ORANGE, ha="center",
            weight="semibold")
    ax.text(centres[1], -2.65, f"oxygen gets {vec(m[1])}, each H gets {vec(m[2])}", fontsize=8.5, color=style.INK2,
            ha="center")

    # stage 3: new states and the readout
    P = molecule(centres[2], h1)
    ax.text(centres[2], -2.15, "readout  Σ h = " + vec(h1.sum(0)), fontsize=9.5, color=style.VIOLET,
            ha="center", weight="semibold")

    for cx, t in zip(centres, titles):
        ax.text(cx, 2.65, t, fontsize=10, weight="semibold", color=style.INK, ha="center", va="center")
    for x in (4.25, 8.75):
        ax.add_patch(FancyArrowPatch((x - 0.3, 0.3), (x + 0.3, 0.3), arrowstyle="-|>", mutation_scale=16,
                                     color=style.INK3, lw=1.6))
    style.save(fig, SLUG, "layer-by-hand")


# ---------------------------------------------------------------------------------------------------------------
# 2. Two costs of depth: the receptive field in crystalline silicon, and over-smoothing on aspirin
# ---------------------------------------------------------------------------------------------------------------
def silicon_receptive_field(rc=5.0, Tmax=6, R=35.0, a=5.431):
    """Breadth-first search on the radius graph of a silicon cluster: atoms reachable from the centre in T hops."""
    basis = np.array([[0, 0, 0], [0, .5, .5], [.5, 0, .5], [.5, .5, 0]])
    basis = np.vstack([basis, basis + 0.25])
    n = int(R / a) + 2
    g = np.arange(-n, n + 1)
    cells = np.array(np.meshgrid(g, g, g, indexing="ij")).reshape(3, -1).T
    pos = ((cells[:, None, :] + basis[None, :, :]).reshape(-1, 3) * a)
    pos = pos[np.linalg.norm(pos, axis=1) <= R]
    c = int(np.argmin(np.linalg.norm(pos, axis=1)))
    nb = []
    for s in range(0, len(pos), 800):
        d = np.linalg.norm(pos[s:s + 800, None, :] - pos[None, :, :], axis=2)
        nb += [np.nonzero((row < rc) & (row > 0))[0] for row in d]
    hop = np.full(len(pos), -1); hop[c] = 0; front = [c]
    for T in range(1, Tmax + 1):
        new = []
        for u in front:
            for v in nb[u]:
                if hop[v] < 0:
                    hop[v] = T; new.append(v)
        front = new
    reached = np.array([((hop >= 0) & (hop <= T)).sum() for T in range(Tmax + 1)])
    rho = 8 / a ** 3
    return reached, rho


ASPIRIN_EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6], [6, 7], [6, 8], [1, 9], [9, 10], [10, 11],
                 [10, 12]]


def oversmoothing(L=30, alpha=0.2):
    n = 13
    At = np.eye(n)
    for a, b in ASPIRIN_EDGES:
        At[a, b] = At[b, a] = 1
    P = At / At.sum(1, keepdims=True)            # mean over the atom itself and its neighbours
    h0 = np.random.default_rng(0).normal(size=(n, 16))
    spread = lambda h: np.linalg.norm(h - h.mean(0))
    h, g = h0.copy(), h0.copy()
    s_plain, s_mix = [], []
    for t in range(L + 1):
        s_plain.append(spread(h) / spread(h0)); s_mix.append(spread(g) / spread(h0))
        h = P @ h
        g = (1 - alpha) * P @ g + alpha * h0
    return np.array(s_plain), np.array(s_mix)


def cost_of_depth():
    reached, rho = silicon_receptive_field()
    T = np.arange(len(reached))
    Tf = np.linspace(0.6, 6, 200)
    print("silicon receptive field (atoms):", dict(zip(T.tolist(), reached.tolist())))
    s_plain, s_mix = oversmoothing()
    print("over-smoothing spread after 10/30 layers:", s_plain[10].round(3), s_plain[30].round(3), "mixed:", s_mix[30].round(3))

    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.42))
    sphere = 4 / 3 * np.pi * (Tf * 5.0) ** 3 * rho
    a1.plot(Tf, sphere, color=style.INK3, lw=1.4, ls=(0, (4, 3)))
    a1.plot(T[1:], reached[1:], "o-", color=style.BLUE, ms=5)
    a1.set_yscale("log"); a1.set_ylim(10, 1e4); a1.set_xlim(0.5, 6.4)
    a1.set_xlabel("message-passing layers, T"); a1.set_ylabel("atoms in the receptive field")
    a1.set_title("a  Silicon, cut-off 5 Å")
    a1.annotate(f"{reached[4]:,} atoms\nafter 4 layers", (4, reached[4]), xytext=(4.25, 120), fontsize=8.5,
                color=style.BLUE, arrowprops=dict(arrowstyle="-", color=style.BLUE, lw=0.8))
    a1.text(2.1, 1500, "sphere of radius\nT × 5 Å", fontsize=8.5, color=style.INK2, ha="center")
    a1.annotate(f"{reached[1] - 1} neighbours", (1, reached[1]), xytext=(1.25, 13), fontsize=8.5, color=style.INK2,
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    a1.set_xticks(range(1, 7))

    L = np.arange(len(s_plain))
    a2.plot(L, s_plain, color=style.ORANGE)
    a2.plot(L, s_mix, color=style.TEAL)
    a2.set_ylim(0, 1.05); a2.set_xlim(0, 30)
    a2.set_xlabel("averaging layers"); a2.set_ylabel("spread of atom features\n(relative to layer 0)")
    a2.set_title("b  Aspirin, repeated averaging")
    a2.text(13, 0.25, "mean over neighbours", fontsize=8.5, color=style.ORANGE, ha="left")
    a2.text(13, 0.5, "20% of the input mixed\nback in at every layer", fontsize=8.5, color=style.TEAL, ha="left")
    style.save(fig, SLUG, "cost-of-depth")
    return reached, s_plain, s_mix


# ---------------------------------------------------------------------------------------------------------------
# 3. The Weisfeiler-Lehman test cannot tell decalin from bicyclopentyl
# ---------------------------------------------------------------------------------------------------------------
def decalin():
    s = np.sqrt(3) / 2
    left = [(0, 0.5), (-s, 1), (-2 * s, 0.5), (-2 * s, -0.5), (-s, -1), (0, -0.5)]
    right = [(s, 1), (2 * s, 0.5), (2 * s, -0.5), (s, -1)]
    xy = np.array(left + right)
    E = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 0), (0, 6), (6, 7), (7, 8), (8, 9), (9, 5)]
    return xy, E


def bicyclopentyl():
    R = 1 / (2 * np.sin(np.pi / 5))
    ang = np.radians([0, 72, 144, 216, 288])
    lc = np.array([-0.5 - R, 0.0]); rcn = np.array([0.5 + R, 0.0])
    left = [lc + R * np.array([np.cos(t), np.sin(t)]) for t in ang]
    right = [rcn + R * np.array([np.cos(np.pi - t), np.sin(np.pi - t)]) for t in ang]
    xy = np.array(left + right)
    E = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 0), (5, 6), (6, 7), (7, 8), (8, 9), (9, 5), (0, 5)]
    return xy, E


def wl_colours(graphs, iters=10):
    """1-WL colour refinement run jointly on several graphs, so colour labels are comparable."""
    cols = [[0] * len(xy) for xy, E in graphs]
    nbs = []
    for xy, E in graphs:
        nb = [[] for _ in xy]
        for a, b in E:
            nb[a].append(b); nb[b].append(a)
        nbs.append(nb)
    for _ in range(iters):
        sig = [[(c[i], tuple(sorted(c[j] for j in nb[i]))) for i in range(len(c))] for c, nb in zip(cols, nbs)]
        table = {s: k for k, s in enumerate(sorted({s for g in sig for s in g}))}
        new = [[table[s] for s in g] for g in sig]
        if len(table) == len({x for c in cols for x in c}):
            break
        cols = new
    return cols


def wl_test():
    G = [decalin(), bicyclopentyl()]
    cols = wl_colours(G)
    hist = [np.bincount(c, minlength=3) for c in cols]
    print("WL colour histograms:", [h.tolist() for h in hist])
    assert all((hist[0] == hist[1])) and len(set(cols[0])) == 3
    palette = [style.VIOLET, style.ORANGE, style.TEAL]
    # order classes: degree-3 atoms first, then their neighbours, then the rest
    fig, axes = plt.subplots(1, 2, figsize=(7.2, 2.9), gridspec_kw=dict(wspace=0.12))
    names = ["decalin", "bicyclopentyl"]
    for ax, (xy, E), c, name in zip(axes, G, cols, names):
        for a, b in E:
            ax.plot(*xy[[a, b]].T, color=style.INK3, lw=2.2, zorder=1)
        for k, p in enumerate(xy):
            ax.add_patch(Circle(p, 0.2, color=palette[c[k]], zorder=3, ec="white", lw=1.4))
        ax.set_xlim(-2.45, 2.45); ax.set_ylim(-1.75, 1.45); ax.set_aspect("equal"); ax.axis("off")
        ax.text(0, 1.35, name + ",  C₁₀H₁₈", ha="center", fontsize=10, weight="semibold", color=style.INK)
        counts = np.bincount(c, minlength=3)
        x0 = -1.45
        for k in range(3):
            ax.add_patch(Circle((x0 + 1.1 * k, -1.55), 0.12, color=palette[k], zorder=3))
            ax.text(x0 + 1.1 * k + 0.2, -1.55, f"× {counts[k]}", va="center", fontsize=9, color=style.INK2)
    fig.text(0.5, 0.02, "the same colour counts after every round of refinement: the test, and any sum-aggregation "
             "network, sees no difference", ha="center", fontsize=8.5, color=style.INK2)
    style.save(fig, SLUG, "wl-test")


# ---------------------------------------------------------------------------------------------------------------
# Cover: messages flowing into one atom from its neighbours, with the receptive field as rings
# ---------------------------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        c = np.array([2.0, 1.5])
        for r, a in ((1.42, 0.45), (1.02, 0.6)):
            ax.add_patch(Circle(c, r, color="white", alpha=a, zorder=0))
        ink = style.INK2
        inner = [c + 0.86 * np.array([np.cos(t), np.sin(t)]) for t in np.radians(np.arange(0, 360, 60))]
        outer = [c + 1.3 * np.array([np.cos(t), np.sin(t)]) for t in np.radians(np.arange(30, 390, 60))]
        side = [c + np.array([s * 1.85, y]) for s in (-1, 1) for y in (-0.62, 0.62)]
        for k in range(6):
            for q in (inner[k], inner[(k + 1) % 6]):
                ax.plot(*np.array([outer[k], q]).T, color=ink, lw=3.0, alpha=0.45, zorder=1)
        for p, k in zip(side, (3, 2, 5, 0)):
            ax.plot(*np.array([p, outer[k]]).T, color=ink, lw=3.0, alpha=0.3, zorder=1)
        cols = [style.TEAL, style.BLUE, style.PINK, style.TEAL, style.GOLD, style.BLUE]
        for p, col in zip(inner, cols):
            ax.plot(*np.array([p, c]).T, color=ink, lw=3.0, alpha=0.25, zorder=1)
            u = (c - p) / np.linalg.norm(c - p)
            ax.add_patch(FancyArrowPatch(p + 0.2 * u, c - 0.33 * u, arrowstyle="-|>", mutation_scale=20,
                                         color=style.ORANGE, lw=4.5, shrinkA=0, shrinkB=0, zorder=2))
            ax.add_patch(Circle(p, 0.17, color=col, zorder=3, ec="white", lw=2.5))
        for p in outer:
            ax.add_patch(Circle(p, 0.13, color=style.BLUE, zorder=3, ec="white", lw=2.0, alpha=0.55))
        for p in side:
            ax.add_patch(Circle(p, 0.11, color=style.INK3, zorder=3, ec="white", lw=2.0, alpha=0.45))
        ax.add_patch(Circle(c, 0.3, color=style.VIOLET, zorder=4, ec="white", lw=3))
    style.cover(SLUG, draw, bg=style.TINT[style.VIOLET])


if __name__ == "__main__":
    layer_by_hand()
    cost_of_depth()
    wl_test()
    cover()
