"""Figures for content/learn/numpy-arrays.md.  Run: python3 tools/figures/numpy-arrays.py"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle, Circle
import style
plt = style.setup()
SLUG = "numpy-arrays"


def box(ax, x, y, w, h, fc, ec, lw=1.0, r=0.6):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}", fc=fc, ec=ec, lw=lw))


# ---------------------------------------------------------------------------------------------
# 1. A list of floats against an ndarray in memory
# ---------------------------------------------------------------------------------------------
def memory():
    fig, ax = plt.subplots(figsize=(7.2, 3.7))
    ax.set_xlim(0, 72); ax.set_ylim(0, 37); ax.axis("off"); ax.set_aspect("equal")
    vals = ["2.5", "0.1", "7.0", "3.3", "1.8"]
    # ---- list
    ax.text(1, 35.3, "Python list of 5 floats", fontsize=10.5, fontweight="semibold", color=style.INK)
    box(ax, 1, 26.6, 9.5, 5.6, style.TINT[style.BLUE], style.BLUE)
    ax.text(5.75, 30.4, "list object", ha="center", fontsize=8.5, fontweight="semibold", color=style.BLUE)
    ax.text(5.75, 28.2, "56 bytes", ha="center", fontsize=8, color=style.INK2)
    px, py, pw = 14, 27.8, 3.4
    for i in range(8):
        used = i < 5
        ax.add_patch(Rectangle((px + i * pw, py), pw, 3.2, fc=style.TINT[style.BLUE] if used else style.BG2,
                               ec=style.INK3, lw=0.8))
        if used:
            ax.add_patch(Circle((px + i * pw + pw / 2, py + 1.6), 0.45, color=style.BLUE))
    ax.text(px, py + 4.2, "8-byte pointers, 3 spare slots", fontsize=8, color=style.INK3)
    ax.add_patch(FancyArrowPatch((10.7, 29.4), (px - 0.1, 29.4), arrowstyle="-|>", mutation_scale=9,
                                 color=style.BLUE, lw=1.1))
    # float objects on the heap: each is refcount | type pointer | value, 8 bytes each
    heap = [(18, 15.5), (31, 9), (2.5, 9.5), (25.5, 2.5), (7, 2.5)]
    order = [2, 0, 4, 1, 3]                      # slot i points to heap object order[i]
    ax.add_patch(Rectangle((0.5, 0.8), 43, 21.6, fc=style.BG2, ec="none"))
    ax.text(42.8, 20.9, "heap", fontsize=8.5, color=style.INK3, ha="right")
    ax.text(1.5, 20.9, "float objects, 24 bytes each", fontsize=8, color=style.VIOLET)
    for i, (x, y) in enumerate(heap):
        for c, t in enumerate(["ref", "type", vals[order.index(i)]]):
            ax.add_patch(Rectangle((x + c * 3.6, y), 3.6, 3.0, fc="white" if c < 2 else style.TINT[style.VIOLET],
                                   ec=style.VIOLET, lw=0.9))
            ax.text(x + c * 3.6 + 1.8, y + 1.5, t, ha="center", va="center", fontsize=8,
                    color=style.INK3 if c < 2 else style.INK)
    for i in range(5):
        x, y = heap[order[i]]
        ax.add_patch(FancyArrowPatch((px + i * pw + pw / 2, py - 0.1), (x + 5.4, y + 3.1), arrowstyle="-|>",
                                     mutation_scale=8, color=style.BLUE, lw=0.9, alpha=0.85, shrinkA=0,
                                     shrinkB=0))
    # ---- ndarray
    ax.text(48, 35.3, "NumPy array of 5 float64", fontsize=10.5, fontweight="semibold", color=style.INK)
    box(ax, 48, 21.5, 22, 11.3, style.TINT[style.TEAL], style.TEAL)
    ax.text(49.2, 31.2, "ndarray header", fontsize=9, fontweight="semibold", color=style.TEAL)
    for k, t in enumerate(["data pointer", "dtype  float64", "shape  (5,)", "strides  (8,)"]):
        ax.text(49.2, 28.9 - k * 1.95, t, fontsize=8.5, color=style.INK2)
    bx, by, bw = 48, 10.5, 4.4
    for i, v in enumerate(vals):
        ax.add_patch(Rectangle((bx + i * bw, by), bw, 3.6, fc="white", ec=style.TEAL, lw=1.0))
        ax.text(bx + i * bw + bw / 2, by + 1.8, v, ha="center", va="center", fontsize=9, color=style.INK)
        ax.text(bx + i * bw + bw / 2, by - 1.3, f"{8 * i}", ha="center", va="center", fontsize=8, color=style.INK3)
    ax.text(bx, by - 3.4, "byte offset", fontsize=8, color=style.INK3)
    ax.text(bx + 5, by + 5.0, "data buffer: 40 bytes, contiguous", fontsize=8, color=style.INK3)
    ax.add_patch(FancyArrowPatch((52, 22.6), (bx + 2.2, by + 3.7), arrowstyle="-|>", mutation_scale=9,
                                 color=style.TEAL, lw=1.1, connectionstyle="arc3,rad=0.3"))
    ax.text(48, 2.6, "for 10⁶ numbers:  array 8 MB,\nlist 8.4 MB of pointers + 24 MB of floats",
            fontsize=8.5, color=style.INK2, va="center")
    style.save(fig, SLUG, "memory")


# ---------------------------------------------------------------------------------------------
# 2. Broadcasting in three dimensions: all pair vectors r_i - r_j
# ---------------------------------------------------------------------------------------------
def broadcast3d():
    N = 4
    a = np.zeros((N, 3))
    s1 = np.broadcast_to(a[:, None, :], (N, N, 3)).strides
    s2 = np.broadcast_to(a[None, :, :], (N, N, 3)).strides
    cols = [style.BLUE, style.ORANGE, style.TEAL, style.VIOLET]
    fig, ax = plt.subplots(figsize=(7.2, 2.95))
    ax.set_xlim(0, 72); ax.set_ylim(5.5, 35); ax.axis("off"); ax.set_aspect("equal")
    cw, ch = 1.25, 2.6            # one coordinate cell
    vw = 3 * cw                   # one 3-vector

    def vec(x, y, c, real=True, label=None):
        for k in range(3):
            ax.add_patch(Rectangle((x + k * cw, y), cw, ch, fc=style.TINT[c] if real else "white", ec=c,
                                   lw=1.0 if real else 0.8, ls="-" if real else (0, (2, 2))))
        if label:
            ax.text(x + vw / 2, y + ch / 2, label, ha="center", va="center", fontsize=8.5, color=style.INK)

    # A: pos[:, None, :]  shape (N, 1, 3), stretched along axis 1
    xa, ytop = 1.5, 25.6
    ax.text(xa, 33.6, "pos[:, None, :]", fontsize=9.5, color=style.INK, family="DejaVu Sans Mono")
    ax.text(xa, 30.8, f"(4, 1, 3) → (4, 4, 3)\nstrides {s1}", fontsize=8, va="center", color=style.INK3)
    for i in range(N):
        for j in range(N):
            vec(xa + j * (vw + 0.5), ytop - i * (ch + 0.6), cols[i], real=(j == 0), label=f"r{i}" if j == 0 else None)
    # B: pos[None, :, :]  shape (1, N, 3), stretched along axis 0
    xb = 25
    ax.text(xb, 33.6, "pos[None, :, :]", fontsize=9.5, color=style.INK, family="DejaVu Sans Mono")
    ax.text(xb, 30.8, f"(1, 4, 3) → (4, 4, 3)\nstrides {s2}", fontsize=8, va="center", color=style.INK3)
    for i in range(N):
        for j in range(N):
            vec(xb + j * (vw + 0.5), ytop - i * (ch + 0.6), cols[j], real=(i == 0), label=f"r{j}" if i == 0 else None)
    # minus and equals signs
    ax.text(xa + 4 * (vw + 0.5) + 0.9, 19.5, "−", fontsize=16, color=style.INK2, va="center")
    ax.text(xb + 4 * (vw + 0.5) + 0.6, 19.5, "=", fontsize=16, color=style.INK2, va="center")
    # C: result (N, N, 3), real data
    xc = 49.5
    ax.text(xc, 33.6, "d[i, j] = r_i − r_j", fontsize=9.5, color=style.INK, family="DejaVu Sans Mono")
    ax.text(xc, 30.8, "(4, 4, 3): a new buffer\nof 4 × 4 × 3 × 8 bytes", fontsize=8, va="center", color=style.INK3)
    for i in range(N):
        for j in range(N):
            x, y = xc + j * (vw + 0.5), ytop - i * (ch + 0.6)
            for k in range(3):
                ax.add_patch(Rectangle((x + k * cw, y), cw, ch, fc="white" if i != j else style.BG2,
                                       ec=style.INK2, lw=0.9))
            ax.add_patch(Rectangle((x, y), vw / 2, ch, fc=style.TINT[cols[i]], ec="none", alpha=0.9))
            ax.add_patch(Rectangle((x + vw / 2, y), vw / 2, ch, fc=style.TINT[cols[j]], ec="none", alpha=0.9))
            ax.add_patch(Rectangle((x, y), vw, ch, fc="none", ec=style.INK2, lw=0.9))
            ax.text(x + vw / 2, y + ch / 2, f"{i}{j}", ha="center", va="center", fontsize=8, color=style.INK)
    # legend line underneath
    ax.text(1.5, 11.8, "solid cells: real data in memory     dashed cells: virtual repeats, read again through a zero stride",
            fontsize=8.5, color=style.INK2)
    ax.text(1.5, 9.3, "the diagonal (i = j) holds the zero vector of each atom with itself; the upper triangle"
            " holds every pair once", fontsize=8.5, color=style.INK2)
    ax.text(1.5, 6.8, "for N = 500 atoms: (500, 500, 3) × 8 bytes = 6 MB of pair vectors; for N = 50 000 it would be 60 GB",
            fontsize=8.5, color=style.INK2)
    style.save(fig, SLUG, "broadcast3d")
    return s1, s2


# ---------------------------------------------------------------------------------------------
# 3. Accumulating a sum: float32 against float64, sequential against pairwise
# ---------------------------------------------------------------------------------------------
def float32():
    rng = np.random.default_rng(3)
    N = 10**7
    x64 = rng.random(N)
    x32 = x64.astype(np.float32)
    seq32 = np.cumsum(x32)             # np.cumsum adds strictly in order
    seq64 = np.cumsum(x64)
    ns = np.unique(np.geomspace(10, N, 31).astype(int))
    rows = []
    for n in ns:
        ex32 = math.fsum(x32[:n].astype(np.float64))    # exact sum of the float32 values
        ex64 = math.fsum(x64[:n])
        rows.append((n, abs(float(seq32[n - 1]) - ex32) / ex32, abs(float(x32[:n].sum()) - ex32) / ex32,
                     abs(seq64[n - 1] - ex64) / ex64, abs(x64[:n].sum() - ex64) / ex64))
    R = np.array(rows)
    R[R == 0] = np.nan
    fig, ax = plt.subplots(figsize=style.WIDE)
    spec = [(1, style.PINK, "float32, one by one", "o-"), (2, style.ORANGE, "float32, np.sum (pairwise)", "s-"),
            (3, style.VIOLET, "float64, one by one", "o-"), (4, style.TEAL, "float64, np.sum (pairwise)", "s-")]
    for col, c, lab, mk in spec:
        ax.loglog(R[:, 0], R[:, col], mk, color=c, ms=3.2, lw=1.4)
        last = np.where(np.isfinite(R[:, col]))[0][-1]
        dy = {1: 0, 2: 0, 3: 8, 4: -8}[col]
        ax.annotate(lab, (N, R[last, col]), xytext=(7, dy), textcoords="offset points", fontsize=9,
                    color=c, va="center", fontweight="semibold")
    for e in (np.finfo(np.float32).eps, np.finfo(np.float64).eps):
        ax.axhline(e, color=style.INK3, lw=0.8, ls=":")
    ax.set_xlim(10, N); ax.set_ylim(1e-17, 1e-3)
    ax.set_xlabel("number of values summed, n  (uniform in [0, 1))")
    ax.set_ylabel("relative error of the sum")
    fig.subplots_adjust(right=0.7)
    style.save(fig, SLUG, "float32")
    return R[-1]


# ---------------------------------------------------------------------------------------------
# 4. The worked example: pair distances of 500 random atoms in a periodic box
# ---------------------------------------------------------------------------------------------
def pairs():
    rng = np.random.default_rng(0)
    L = 10.0
    pos = rng.uniform(0.0, L, size=(500, 3))
    d = pos[:, None, :] - pos[None, :, :]
    d -= L * np.round(d / L)
    r = np.sqrt((d ** 2).sum(axis=-1))
    iu = np.triu_indices(len(pos), k=1)
    p = r[iu]
    npairs = len(p)
    dr = 0.1
    edges = np.arange(0, 8.7 + dr, dr)
    h, _ = np.histogram(p, bins=edges)
    mid = 0.5 * (edges[1:] + edges[:-1])
    shell = 4 / 3 * np.pi * (edges[1:]**3 - edges[:-1]**3)
    g = h / (npairs * shell / L**3)
    fig, (a1, a2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw={"wspace": 0.38})
    a1.bar(mid, h, width=dr, color=style.TINT[style.BLUE], ec=style.BLUE, lw=0.4)
    rr = np.linspace(0, L / 2, 200)
    a1.plot(rr, npairs * 4 * np.pi * rr**2 * dr / L**3, color=style.ORANGE, lw=1.8)
    a1.axvline(L / 2, color=style.INK3, lw=0.8, ls="--")
    a1.text(L / 2 + 0.15, 4050, "L/2", ha="left", fontsize=9, color=style.INK3)
    a1.text(0.3, 4050, "ideal gas:\nN(N−1)/2 · 4πr² Δr / L³", fontsize=8.5, color=style.ORANGE, va="top")
    a1.annotate("corners\nof the cube", (7.6, 650), xytext=(8.7, 2500), fontsize=8.5,
                color=style.INK2, ha="right", arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    a1.set_xlabel("pair distance r (box length L = 10)"); a1.set_ylabel("pairs per bin (Δr = 0.1)")
    a1.set_title("(a) 124 750 distances", fontsize=10)
    a1.set_xlim(0, 8.8); a1.set_ylim(0, 4400)
    m = (mid < L / 2) & (mid > 0.3)
    a2.axhline(1, color=style.ORANGE, lw=1.4)
    a2.plot(mid[m], g[m], "o-", color=style.BLUE, ms=3, lw=1.0)
    a2.set_xlabel("r"); a2.set_ylabel("g(r) = observed / ideal")
    a2.set_title("(b) radial distribution, r < L/2", fontsize=10)
    a2.set_xlim(0, 5); a2.set_ylim(0, 2.2)
    a2.text(2.5, 1.85, "no structure: random atoms give g(r) ≈ 1;\nnoisy at small r, where few pairs fall",
            fontsize=8.5, color=style.INK2, ha="center")
    style.save(fig, SLUG, "pairs")
    return npairs, p.min(), p.mean(), (p < 1.5).sum(), npairs * 4 / 3 * np.pi * 1.5**3 / L**3


# ---------------------------------------------------------------------------------------------
# Cover: a grid of values above the single strip of memory that holds them, with a stride jump
# ---------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        cols = [style.BLUE, style.TEAL, style.ORANGE]
        s = 0.42
        x0, y0 = 1.37, 1.55
        for i in range(3):
            for j in range(3):
                ax.add_patch(FancyBboxPatch((x0 + j * s + 0.025, y0 + (2 - i) * s + 0.025), s - 0.05, s - 0.05,
                                            boxstyle="round,pad=0,rounding_size=0.04", fc=cols[i], ec=style.INK,
                                            lw=2.0))
        bx, by = 0.11, 0.45
        for k in range(9):
            ax.add_patch(FancyBboxPatch((bx + k * s + 0.025, by), s - 0.05, s - 0.05,
                                        boxstyle="round,pad=0,rounding_size=0.04", fc=cols[k // 3], ec=style.INK,
                                        lw=2.0))
        # a stride: jump from element 1 to element 4 (one row down)
        for a, b in [(1, 4), (4, 7)]:
            ax.add_patch(FancyArrowPatch((bx + a * s + s / 2, by + s), (bx + b * s + s / 2, by + s),
                                         arrowstyle="-|>", mutation_scale=15, color=style.PINK, lw=2.6,
                                         connectionstyle="arc3,rad=-0.55"))
        ax.add_patch(FancyBboxPatch((x0 + s + 0.0, y0 - 0.02), s, 3 * s + 0.04,
                                    boxstyle="round,pad=0,rounding_size=0.06", fc="none", ec=style.PINK, lw=3.0))
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    memory()
    print("broadcast strides:", broadcast3d())
    print("float32 at 1e7 (n, seq32, pw32, seq64, pw64):", float32())
    print("pairs:", pairs())
    cover()
