"""Figures for content/learn/python-collections.md.  Run: python3 tools/figures/python-collections.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle, Circle, RegularPolygon, Polygon
import style
plt = style.setup()
SLUG = "python-collections"


# ---------------------------------------------------------------------------------------------
# 1. Growth strategies: average element copies per append, computed by replaying every append
# ---------------------------------------------------------------------------------------------
def replay(rule, N):
    """Average number of element copies per append after n appends, n = 1..N, if every
    reallocation copies all existing elements."""
    alloc = size = copies = 0
    avg = np.empty(N)
    for n in range(1, N + 1):
        if n > alloc:
            copies += size
            alloc = rule(n, alloc)
        size = n
        avg[n - 1] = copies / n
    return avg


def growth():
    N = 10**6
    rules = [
        ("grow by one slot", lambda n, a: a + 1, style.PINK),
        ("grow by 64 slots", lambda n, a: a + 64, style.ORANGE),
        ("CPython: about +1/8", lambda n, a: (n + (n >> 3) + 6) & ~3, style.BLUE),
        ("double", lambda n, a: max(1, 2 * a), style.TEAL),
    ]
    n = np.arange(1, N + 1)
    fig, ax = plt.subplots(figsize=style.WIDE)
    for label, rule, c in rules:
        avg = replay(rule, N)
        # keep the corners of the sawtooth (just before and at each jump) plus a sparse log grid
        jumps = np.nonzero(np.diff(avg) > 0)[0]
        keep = np.unique(np.concatenate([jumps, jumps + 1, np.geomspace(1, N, 120).astype(int) - 1, [N - 1]]))
        if len(jumps) > 400:                       # dense teeth are invisible on a log axis
            keep = np.unique(np.concatenate([np.geomspace(1, N, 160).astype(int) - 1, [N - 1]]))
        y = avg[keep].copy(); y[y <= 0] = np.nan
        ax.plot(n[keep], y, color=c, lw=1.8)
        ax.annotate(label, (N, avg[-1]), xytext=(6, 0), textcoords="offset points",
                    va="center", ha="left", color=c, fontsize=9, fontweight="semibold")
    ax.set_xscale("log"); ax.set_yscale("log")
    ax.set_xlim(10, N); ax.set_ylim(0.3, 1e6)
    ax.set_xlabel("number of appends, n")
    ax.set_ylabel("element copies per append\n(average over all n appends)")
    ax.axhspan(0.3, 12, color=style.TINT[style.TEAL], zorder=-5, lw=0)
    ax.text(3e3, 0.45, "bounded: amortised O(1) per append", color=style.TEAL, fontsize=9)
    ax.text(14, 2e3, "grows with n:\nO(n) per append,\nO(n²) in total", color=style.PINK, fontsize=9, va="center")
    fig.subplots_adjust(right=0.78)
    style.save(fig, SLUG, "growth")


# ---------------------------------------------------------------------------------------------
# 2. CPython's compact dictionary: sparse index array + dense entries, for int keys (hash(n) = n)
# ---------------------------------------------------------------------------------------------
def probe_insert(indices, h, mask):
    """CPython's find_empty_slot: returns the slot and the sequence of slots inspected."""
    i = h & mask
    seq = [i]
    perturb = h
    while indices[i] is not None:
        perturb >>= 5
        i = (i * 5 + perturb + 1) & mask
        seq.append(i)
    return i, seq


def dict_layout():
    items = [(8, "O"), (1, "H"), (6, "C"), (14, "Si")]
    size, mask = 8, 7
    indices = [None] * size
    seqs = []
    for e, (k, v) in enumerate(items):
        slot, seq = probe_insert(indices, hash(k), mask)
        indices[slot] = e
        seqs.append(seq)
    # indices == [0, 1, None, None, None, None, 2, 3], as read from CPython 3.13 memory with ctypes

    fig, ax = plt.subplots(figsize=(7.2, 3.75))
    ax.set_xlim(0, 72); ax.set_ylim(3.5, 41); ax.axis("off"); ax.set_aspect("equal")
    top = 34; h = 3.4                     # slot height
    head = top + 5.0
    # --- keys column
    ax.text(1, head, "key", fontsize=10, fontweight="semibold", color=style.INK)
    ax.text(8.5, head, "hash & 7", fontsize=10, fontweight="semibold", color=style.INK)
    ax.text(1, head - 2.2, "hash(n) = n for small integers", fontsize=8, color=style.INK3)
    key_y = {}
    for e, (k, v) in enumerate(items):
        y = top - 1.7 - e * 6.6
        key_y[e] = y
        ax.add_patch(FancyBboxPatch((1, y - 1.4), 5, 2.8, boxstyle="round,pad=0.2,rounding_size=0.6",
                                    fc=style.TINT[style.BLUE], ec=style.BLUE, lw=1))
        ax.text(3.5, y, str(k), ha="center", va="center", fontsize=10, color=style.INK, fontweight="semibold")
        ax.text(12, y, f"{k} & 7 = {k & 7}", ha="center", va="center", fontsize=9, color=style.INK2)
    # --- index array: slot number (grey, left) and stored entry number (violet, right) in each cell
    xi, wi = 23, 7
    ax.text(xi, head, "indices", fontsize=10, fontweight="semibold", color=style.INK)
    ax.text(xi, head - 2.2, "8 slots, 1 byte each", fontsize=8, color=style.INK3)
    slot_y = {}
    for s_ in range(size):
        y = top - s_ * h
        slot_y[s_] = y - h / 2
        filled = indices[s_] is not None
        ax.add_patch(Rectangle((xi, y - h), wi, h, fc=style.TINT[style.VIOLET] if filled else "white",
                               ec=style.INK3, lw=0.8))
        ax.text(xi + 1.0, y - h / 2, str(s_), ha="left", va="center", fontsize=8, color=style.INK3)
        ax.text(xi + 4.6, y - h / 2, str(indices[s_]) if filled else "–", ha="center", va="center",
                fontsize=10, color=style.VIOLET if filled else style.INK3, fontweight="semibold")
    # --- entries array
    xe = 46
    ax.text(xe, head, "entries", fontsize=10, fontweight="semibold", color=style.INK)
    ax.text(xe, head - 2.2, "dense, in insertion order", fontsize=8, color=style.INK3)
    cols = [("hash", 6), ("key", 6), ("value", 8)]
    ent_y = {}
    eh = 3.6
    for c, (name, w) in enumerate(cols):
        x0 = xe + sum(w_ for _, w_ in cols[:c])
        ax.text(x0 + w / 2, top + 0.9, name, ha="center", va="center", fontsize=8.5, color=style.INK3)
    for e in range(5):
        y = top - 0.4 - e * eh
        ent_y[e] = y - eh / 2
        ax.text(xe - 0.8, y - eh / 2, str(e), ha="right", va="center", fontsize=9, color=style.VIOLET)
        for c, (name, w) in enumerate(cols):
            x0 = xe + sum(w_ for _, w_ in cols[:c])
            used = e < len(items)
            ax.add_patch(Rectangle((x0, y - eh), w, eh, fc=style.TINT[style.TEAL] if used else style.BG2,
                                   ec=style.INK3, lw=0.8))
            if used:
                k, v = items[e]
                txt = {0: str(hash(k)), 1: str(k), 2: f"'{v}'"}[c]
                ax.text(x0 + w / 2, y - eh / 2, txt, ha="center", va="center", fontsize=10, color=style.INK)
    ax.add_patch(Rectangle((xe, ent_y[4] - eh / 2), 20, eh, fc=style.BG2, ec=style.INK3, lw=0.8))
    ax.text(xe + 10, ent_y[4], "room for one more key", ha="center", va="center", fontsize=8.5,
            color=style.INK3)
    ax.text(xe, ent_y[4] - eh / 2 - 2.4, "a sixth key triggers a resize to 16 slots",
            ha="left", va="center", fontsize=8.5, color=style.INK3)
    # --- arrows key -> first slot, and index slot -> entry
    for e, seq in enumerate(seqs):
        first = seq[0]
        col = style.ORANGE if len(seq) > 1 else style.BLUE
        ax.add_patch(FancyArrowPatch((16.3, key_y[e]), (xi - 0.3, slot_y[first]), arrowstyle="-|>",
                                     mutation_scale=9, color=col, lw=1.2, shrinkA=0, shrinkB=0))
        if len(seq) > 1:
            for a_, b_ in zip(seq[:-1], seq[1:]):
                ax.add_patch(FancyArrowPatch((xi + wi + 0.2, slot_y[a_]), (xi + wi + 0.2, slot_y[b_]),
                                             connectionstyle="arc3,rad=-0.9", arrowstyle="-|>",
                                             mutation_scale=9, color=style.ORANGE, lw=1.4))
            ax.text(xi + wi + 2.6, slot_y[seq[-1]] - 0.6, "slot 6 is taken:\nprobe on to slot 7",
                    fontsize=8.5, color=style.ORANGE, va="top", ha="left")
    for s_ in range(size):
        if indices[s_] is not None:
            e = indices[s_]
            ax.add_patch(FancyArrowPatch((xi + wi + 0.1, slot_y[s_]), (xe - 2.4, ent_y[e]), arrowstyle="-|>",
                                         mutation_scale=9, color=style.VIOLET, lw=1.0, alpha=0.8,
                                         shrinkA=0, shrinkB=0))
    style.save(fig, SLUG, "dict-layout")
    return indices


# ---------------------------------------------------------------------------------------------
# 3. Probes against load factor: CPython's perturbed probing simulated, uniform-hashing theory
# ---------------------------------------------------------------------------------------------
def probes():
    rng = np.random.default_rng(7)
    size = 2**13
    mask = size - 1
    table = [False] * size
    hashes = [int(x) for x in rng.integers(0, 2**63, size=size, dtype=np.int64)]
    fresh = [int(x) for x in rng.integers(0, 2**63, size=3000, dtype=np.int64)]

    def count(h):
        i = h & mask; perturb = h; n = 1
        while table[i]:
            perturb >>= 5
            i = (i * 5 + perturb + 1) & mask
            n += 1
        return n, i

    targets = np.linspace(0.05, 0.9, 18)
    hit_costs = []
    pts = []
    inserted = 0
    for a in targets:
        while inserted < int(a * size):
            n, i = count(hashes[inserted])
            table[i] = True
            hit_costs.append(n)
            inserted += 1
        miss = np.mean([count(h)[0] for h in fresh])
        pts.append((inserted / size, np.mean(hit_costs), miss))
    pts = np.array(pts)

    al = np.linspace(0.001, 0.92, 300)
    miss_th = 1 / (1 - al)
    hit_th = np.log(1 / (1 - al)) / al
    fig, ax = plt.subplots(figsize=style.WIDE)
    ax.axvspan(2 / 3, 0.95, color=style.BG2, lw=0, zorder=-5)
    ax.text(0.81, 9.6, "CPython resizes\nbefore reaching\nthis region", ha="center", va="center",
            fontsize=8.5, color=style.INK3)
    ax.axvline(2 / 3, color=style.INK3, lw=0.8, ls="--")
    ax.plot(al, miss_th, color=style.ORANGE)
    ax.plot(al, hit_th, color=style.BLUE)
    ax.plot(pts[:, 0], pts[:, 2], "o", color=style.ORANGE, ms=5, mfc="white", mew=1.4)
    ax.plot(pts[:, 0], pts[:, 1], "o", color=style.BLUE, ms=5, mfc="white", mew=1.4)
    ax.text(0.815, 6.4, "key absent\n1 / (1 − α)", color=style.ORANGE, fontsize=9, fontweight="semibold",
            ha="right", va="center")
    ax.text(0.935, 1.45, "key present\n(1/α) ln[1 / (1 − α)]", color=style.BLUE, fontsize=9,
            fontweight="semibold", ha="right", va="center")
    ax.annotate("3 probes", (2 / 3, 3), xytext=(0.5, 4.3), fontsize=9, color=style.INK2,
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    ax.annotate("1.65 probes", (2 / 3, np.log(3) * 1.5), xytext=(0.47, 3.2), fontsize=9, color=style.INK2,
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    ax.plot([2 / 3, 2 / 3], [3, np.log(3) * 1.5], "o", color=style.INK2, ms=3.5)
    ax.text(0.03, 9.6, "lines: uniform-hashing theory\ncircles: CPython's probe sequence, 8192 slots",
            fontsize=8.5, color=style.INK2, va="top")
    ax.set_xlim(0, 0.95); ax.set_ylim(0.8, 10.5)
    ax.set_xlabel("load factor α  (fraction of slots in use)")
    ax.set_ylabel("slots inspected per lookup")
    style.save(fig, SLUG, "probes")
    i23 = np.argmin(abs(pts[:, 0] - 2 / 3))
    return pts


# ---------------------------------------------------------------------------------------------
# Cover: keys of different shapes dropping into the slots of a hash table
# ---------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        n, w, x0, y0 = 8, 0.42, 0.32, 0.55
        fills = {1: style.BLUE, 3: style.ORANGE, 4: style.ORANGE, 6: style.TEAL}
        for s in range(n):
            ax.add_patch(FancyBboxPatch((x0 + s * w + 0.03, y0), w - 0.06, 0.62,
                                        boxstyle="round,pad=0,rounding_size=0.06",
                                        fc=fills.get(s, "white"), ec=style.INK, lw=2.2))
        # three keys above, each dropping to its slot
        keys = [(0.95, 2.35, "circle", style.BLUE, 1), (2.05, 2.5, "square", style.ORANGE, 3),
                (3.15, 2.3, "triangle", style.TEAL, 6)]
        for x, y, shape, c, slot in keys:
            if shape == "circle":
                ax.add_patch(Circle((x, y), 0.26, fc=c, ec=style.INK, lw=2.2))
            elif shape == "square":
                ax.add_patch(FancyBboxPatch((x - 0.23, y - 0.23), 0.46, 0.46, boxstyle="round,pad=0,rounding_size=0.05",
                                            fc=c, ec=style.INK, lw=2.2))
            else:
                ax.add_patch(RegularPolygon((x, y - 0.03), 3, radius=0.32, fc=c, ec=style.INK, lw=2.2))
            tx = x0 + slot * w + w / 2
            ax.add_patch(FancyArrowPatch((x, y - 0.36), (tx, y0 + 0.75), arrowstyle="-|>", mutation_scale=16,
                                         color=style.INK, lw=2.2, connectionstyle="arc3,rad=0.15"))
        # the collision hop from slot 3 to slot 4
        ax.add_patch(FancyArrowPatch((x0 + 3 * w + w / 2, y0 - 0.08), (x0 + 4 * w + w / 2, y0 - 0.08),
                                     arrowstyle="-|>", mutation_scale=14, color=style.PINK, lw=2.4,
                                     connectionstyle="arc3,rad=0.9"))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    growth()
    idx = dict_layout()
    print("dict indices:", idx)
    pts = probes()
    np.set_printoptions(precision=3, suppress=True)
    print("load, hit, miss:\n", pts)
    cover()
