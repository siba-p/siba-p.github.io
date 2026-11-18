"""Figures for content/learn/convolutional-networks.md.  Run: python3 tools/figures/convolutional-networks.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import Rectangle, FancyArrowPatch, Polygon
import style
plt = style.setup()
SLUG = "convolutional-networks"


def conv2d(X, K):
    k = K.shape[0]
    out = np.zeros((X.shape[0] - k + 1, X.shape[1] - k + 1))
    for i in range(out.shape[0]):
        for j in range(out.shape[1]):
            out[i, j] = np.sum(K * X[i:i + k, j:j + k])
    return out


def grid(ax, A, x0, y0, cell, colour_fn, text_fn=None, fs=8.5, lw=0.8):
    """Draw matrix A with its top-left corner at (x0, y0); row 0 at the top."""
    n, m = A.shape
    for i in range(n):
        for j in range(m):
            fc, tc = colour_fn(A[i, j])
            ax.add_patch(Rectangle((x0 + j * cell, y0 - (i + 1) * cell), cell, cell, fc=fc, ec="white", lw=lw))
            if text_fn:
                ax.text(x0 + (j + 0.5) * cell, y0 - (i + 0.5) * cell, text_fn(A[i, j]), ha="center", va="center",
                        fontsize=fs, color=tc)


# ---------------------------------------------------------------------------------------------------------------
def sliding_kernel():
    """The chapter's Python cell as a picture: image, Sobel kernel at one position, feature map."""
    img = np.zeros((7, 8)); img[2:5, 2:5] = 1.0
    K = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
    Y = conv2d(img, K)
    fig, ax = plt.subplots(figsize=(7.2, 3.3))
    ax.set_xlim(0, 21.6); ax.set_ylim(-0.6, 9.9); ax.set_aspect("equal"); ax.axis("off")
    c = 1.0
    # input
    X0, Y0 = 0.3, 8.3
    grid(ax, img, X0, Y0, c, lambda v: ((style.GOLD, style.INK) if v > 0 else (style.BG2, style.INK3)),
         lambda v: f"{int(v)}")
    ax.text(X0, Y0 + 0.55, "input: a bright 3 × 3 particle (7 × 8)", fontsize=9, color=style.INK, fontweight="semibold")
    # highlight the window at output position (1, 1): rows 1-3, cols 1-3
    pi, pj = 2, 1
    ax.add_patch(Rectangle((X0 + pj * c, Y0 - (pi + 3) * c), 3 * c, 3 * c, fc="none", ec=style.TEAL, lw=2.6, zorder=5))
    # kernel
    KX, KY = 10.0, 7.4
    grid(ax, K, KX, KY, c, lambda v: (style.TINT[style.TEAL], style.INK), lambda v: f"{int(v)}", fs=9.5)
    ax.add_patch(Rectangle((KX, KY - 3 * c), 3 * c, 3 * c, fc="none", ec=style.TEAL, lw=2.6))
    ax.text(KX + 1.5, KY + 0.55, "Sobel kernel", fontsize=9, color=style.TEAL, fontweight="semibold", ha="center")
    ax.add_patch(FancyArrowPatch((X0 + (pj + 3) * c + 0.1, Y0 - (pi + 1.5) * c), (KX - 0.15, KY - 1.5),
                                 arrowstyle="-|>", mutation_scale=12, color=style.TEAL, lw=1.4,
                                 connectionstyle="arc3,rad=-0.2"))
    v = Y[pi, pj]
    ax.text(KX + 1.5, KY - 3.6, "multiply element by\nelement and add up:\n$1\\cdot1 + 2\\cdot1 + 1\\cdot1 = 4$",
            fontsize=8.5, color=style.INK2, ha="center", va="top", linespacing=1.35)
    # output
    OX, OY = 15.0, 7.8
    vmax = 4.0
    def col(v):
        if v > 0: return (style.BLUE if v >= 3 else style.TINT[style.BLUE], "white" if v >= 3 else style.INK)
        if v < 0: return (style.PINK if v <= -3 else style.TINT[style.PINK], "white" if v <= -3 else style.INK)
        return (style.BG2, style.INK3)
    grid(ax, Y, OX, OY, c, col, lambda v: f"{int(v)}")
    ax.add_patch(Rectangle((OX + pj * c, OY - (pi + 1) * c), c, c, fc="none", ec=style.TEAL, lw=2.6, zorder=5))
    ax.text(OX, OY + 0.55, "feature map (5 × 6)", fontsize=9, color=style.INK, fontweight="semibold")
    ax.add_patch(FancyArrowPatch((KX + 3.15, KY - 1.5), (OX + pj * c - 0.1, OY - (pi + 0.5) * c), arrowstyle="-|>",
                                 mutation_scale=12, color=style.TEAL, lw=1.4, connectionstyle="arc3,rad=0.15"))
    ax.text(OX + 3, OY - 5.45, "+4 on the left edge, −4 on the right;\ntop and bottom edges give 0",
            fontsize=8.5, color=style.INK2, ha="center", va="top", linespacing=1.35)
    print(f"  feature map:\n{Y.astype(int)}")
    style.save(fig, SLUG, "sliding-kernel")


# ---------------------------------------------------------------------------------------------------------------
def field_rows(layers, n_in):
    """For a 1D stack [(k, s), ...] return, layer by layer, the index range feeding the central top neuron."""
    sizes = [n_in]
    for k, s in layers:
        sizes.append((sizes[-1] - k) // s + 1)
    lo = hi = sizes[-1] // 2                             # the top neuron
    ranges = [(lo, hi)]
    for (k, s) in reversed(layers):
        lo, hi = lo * s, hi * s + k - 1
        ranges.append((lo, hi))
    return sizes, ranges[::-1]


def receptive_field():
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.6), gridspec_kw=dict(wspace=0.08, width_ratios=[1, 2.1]))
    stacks = [([(3, 1), (3, 1), (3, 1)], ["input", "conv 3", "conv 3", "conv 3"], 9, "Three 3 × 3 convolutions"),
              ([(3, 1), (2, 2), (3, 1), (2, 2), (3, 1)], ["input", "conv 3", "pool 2", "conv 3", "pool 2", "conv 3"], 22,
               "The same, with a 2 × 2 pool after the first two")]
    for ax, (layers, names, n_in, title) in zip(axs, stacks):
        sizes, ranges = field_rows(layers, n_in)
        cell = 1.0; dy = 1.35
        for l, (n, (lo, hi)) in enumerate(zip(sizes, ranges)):
            # each neuron of layer l is centred over the input pixels it summarises
            span = n_in / n if l else 1.0
            jump = 1
            for (k, s) in layers[:l]: jump *= s
            r = 1
            jj = 1
            for (k, s) in layers[:l]:
                r += (k - 1) * jj; jj *= s
            offset = (r - 1) / 2
            for i in range(n):
                xc = offset + i * jump + 0.5
                inside = lo <= i <= hi
                w = 0.82 if l == 0 else 0.82
                col = style.ORANGE if inside else style.LINE
                if l == len(sizes) - 1 and inside: col = style.PINK
                ax.add_patch(Rectangle((xc - w / 2, -l * dy - 0.4), w, 0.8, fc=col, ec="none"))
            ax.text(-0.6, -l * dy, names[l], ha="right", va="center", fontsize=8.5, color=style.INK2)
            if l > 0:
                ax.text(n_in + 0.3, -l * dy, f"field {r}", ha="left", va="center", fontsize=8.5,
                        color=style.PINK if l == len(sizes) - 1 else style.INK3)
        n_field = ranges[0][1] - ranges[0][0] + 1
        ax.text(n_in / 2, 0.75, f"{n_field} input pixels", ha="center", va="bottom", fontsize=9, color=style.ORANGE,
                fontweight="semibold")
        ax.set_xlim(-3.2, n_in + 3.6); ax.set_ylim(-(len(sizes) - 1) * dy - 0.8, 1.6); ax.axis("off")
        ax.set_aspect("equal")
        ax.set_title(title, fontsize=9.5)
        print(f"  {title}: sizes {sizes}, input field {n_field}")
    style.save(fig, SLUG, "receptive-field")


# ---------------------------------------------------------------------------------------------------------------
def xrd_strain():
    lam, a0, eps = 1.5406, 3.615, 0.01                  # Cu K-alpha, fcc copper, 1 % tensile strain
    hkl = [(1, 1, 1), (2, 0, 0), (2, 2, 0), (3, 1, 1)]
    height = [100, 46, 20, 17]                          # approximate relative intensities of copper powder
    tt = np.arange(35, 95, 0.02)

    def pattern(a):
        y = np.zeros_like(tt); pos = []
        for (h, k, l), I in zip(hkl, height):
            d = a / np.sqrt(h * h + k * k + l * l)
            p = 2 * np.degrees(np.arcsin(lam / (2 * d))); pos.append(p)
            y += I * np.exp(-0.5 * ((tt - p) / 0.12) ** 2)
        return y, np.array(pos)
    y0, p0 = pattern(a0); y1, p1 = pattern(a0 * (1 + eps))
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.3, width_ratios=[1.45, 1]))
    ax = axs[0]
    ax.plot(tt, y0, color=style.BLUE, lw=1.4)
    ax.plot(tt, y1, color=style.ORANGE, lw=1.4)
    for (h, k, l), a, b, I in zip(hkl, p0, p1, height):
        ax.text(a + 0.6, I + 3, f"{h}{k}{l}", fontsize=8.5, color=style.INK2, ha="center", va="bottom")
        ax.text(a + 0.6, I + 12, f"{b - a:+.2f}°", fontsize=8.5, color=style.ORANGE, ha="center", va="bottom")
    ax.text(58, 95, "copper, Cu Kα, unstrained", fontsize=8.5, color=style.BLUE, ha="left", va="top")
    ax.text(58, 83, "same, 1 % tensile strain", fontsize=8.5, color=style.ORANGE, ha="left", va="top")
    ax.set_xlim(38, 94); ax.set_ylim(0, 128)
    ax.set_xlabel("2θ (degrees)"); ax.set_ylabel("intensity (relative)")
    ax.set_yticks([0, 50, 100])
    ax.set_title("Same pattern, peaks moved unevenly")
    ax = axs[1]
    t2 = np.linspace(5, 120, 300)
    shift = -2 * eps * np.tan(np.radians(t2 / 2))
    ax.plot(t2, -np.degrees(shift) / 0.02, color=style.ORANGE)
    for a, b in zip(p0, p1):
        ax.plot(a, (a - b) / 0.02, "o", color=style.ORANGE, ms=5)
    ax.set_xlabel("2θ (degrees)"); ax.set_ylabel("shift to lower angle\n(steps of 0.02°)")
    ax.set_xlim(0, 120); ax.set_ylim(0, 140)
    ax.text(10, 118, "$\\Delta(2\\theta) = -2\\varepsilon\\tan\\theta$,  ε = 0.01", fontsize=8.5, color=style.INK2)
    ax.set_title("A strain shift grows with angle")
    print("  peaks", np.round(p0, 2), "shifts", np.round(p1 - p0, 3), "steps", np.round((p0 - p1) / 0.02, 1))
    style.save(fig, SLUG, "xrd-strain")


# ---------------------------------------------------------------------------------------------------------------
def architecture():
    """The small classifier of the chapter's worked example: shapes, parameters and receptive field per stage."""
    blocks = [  # (label, size, channels, params, field)
        ("input", 64, 1, None, 1), ("conv\n3 × 3", 64, 16, 160, 3), ("max-pool\n2 × 2", 32, 16, 0, 4),
        ("conv\n3 × 3", 32, 32, 4640, 8), ("max-pool\n2 × 2", 16, 32, 0, 10), ("conv\n3 × 3", 16, 64, 18496, 18),
        ("global\naverage pool", 1, 64, 0, None), ("linear\n64 → 3", 1, 3, 195, None)]
    fig, ax = plt.subplots(figsize=(7.2, 3.3))
    ax.set_xlim(-2.9, 23.6); ax.set_ylim(-2.2, 6.6); ax.set_aspect("equal"); ax.axis("off")
    sk = 0.4; base = 1.2
    for i, (lab, n, C, P, r) in enumerate(blocks):
        xc = 1.2 + i * 2.95
        kind = lab.split("\n")[0]
        c = {"input": style.INK3, "conv": style.BLUE, "max-pool": style.TEAL, "global": style.VIOLET,
             "linear": style.PINK}[kind]
        tint = style.TINT.get(c, style.BG2)
        if n > 1:
            h = 0.9 + 2.7 * n / 64; d = 0.2 + 0.022 * C
        else:
            h = 0.25 * C ** 0.5 + 0.3 if kind == "global" else 0.9; d = 0.3
        x = xc - (d + sk) / 2
        ax.add_patch(Rectangle((x, base), d, h, fc=tint, ec=c, lw=1.2))
        ax.add_patch(Polygon([(x, base + h), (x + sk, base + h + sk), (x + d + sk, base + h + sk), (x + d, base + h)],
                             closed=True, fc="white", ec=c, lw=1.0))
        ax.add_patch(Polygon([(x + d, base), (x + d + sk, base + sk), (x + d + sk, base + h + sk), (x + d, base + h)],
                             closed=True, fc=tint, ec=c, lw=1.0))
        ax.text(xc, 5.6, lab, ha="center", va="bottom", fontsize=8.5, color=c, fontweight="semibold", linespacing=1.15)
        shape = f"{n}² × {C}" if n > 1 else f"{C}"
        ax.text(xc, 0.75, shape, ha="center", va="top", fontsize=8.5, color=style.INK2)
        ax.text(xc, -0.05, "–" if P is None else f"{P:,}", ha="center", va="top", fontsize=8.5, color=style.INK)
        ax.text(xc, -0.85, "" if r is None else f"{r}", ha="center", va="top", fontsize=8.5, color=style.ORANGE)
        if i:
            ax.add_patch(FancyArrowPatch((xc - 2.95 + 0.85, base - 0.15), (xc - 0.85, base - 0.15), arrowstyle="-|>",
                                         mutation_scale=8, color=style.LINE, lw=1.0))
    ax.text(-0.4, 0.75, "shape", ha="right", va="top", fontsize=8.5, color=style.INK2, fontweight="semibold")
    ax.text(-0.4, -0.05, "parameters", ha="right", va="top", fontsize=8.5, color=style.INK, fontweight="semibold")
    ax.text(-0.4, -0.85, "field (px)", ha="right", va="top", fontsize=8.5, color=style.ORANGE, fontweight="semibold")
    ax.text(23.4, -1.6, "total: 23,491 parameters", ha="right", va="top", fontsize=9, color=style.INK, fontweight="semibold")
    style.save(fig, SLUG, "architecture")


# ---------------------------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        n = 6; c = 0.36; x0, y0 = 0.3, 0.42
        rng = np.random.default_rng(5)
        vals = rng.uniform(0, 1, (n, n))
        for i in range(n):
            for j in range(n):
                ax.add_patch(Rectangle((x0 + j * c, y0 + i * c), c * 0.9, c * 0.9,
                                       fc=style.BLUE, alpha=0.25 + 0.6 * vals[i, j], ec="none"))
        ki, kj = 2, 3
        wx0, wy0, wx1, wy1 = x0 + kj * c - 0.04, y0 + ki * c - 0.04, x0 + (kj + 3) * c, y0 + (ki + 3) * c
        m = 4; fc_ = 0.27; fx, fy = 2.75, 0.95
        for i in range(m):
            for j in range(m):
                ax.add_patch(Rectangle((fx + j * fc_, fy + i * fc_), fc_ * 0.88, fc_ * 0.88, fc=style.TEAL,
                                       alpha=0.35 + 0.2 * ((i * 3 + j) % 3), ec="none", zorder=3))
        cx0, cy0 = fx, fy + 2 * fc_
        ax.add_patch(Rectangle((cx0, cy0), fc_ * 0.88, fc_ * 0.88, fc=style.ORANGE, ec="none", zorder=6))
        ax.add_patch(Polygon([(wx1, wy1), (cx0, cy0 + fc_ * 0.88), (cx0, cy0), (wx1, wy0)], closed=True,
                             fc=style.ORANGE, alpha=0.22, ec="none", zorder=2))
        ax.plot([wx1, cx0], [wy1, cy0 + fc_ * 0.88], color=style.ORANGE, lw=2.2, zorder=4)
        ax.plot([wx1, cx0], [wy0, cy0], color=style.ORANGE, lw=2.2, zorder=4)
        ax.add_patch(Rectangle((wx0, wy0), wx1 - wx0, wy1 - wy0, fc="none", ec=style.ORANGE, lw=4.5, zorder=5))
    style.cover(SLUG, draw, bg=style.TINT[style.ORANGE])


if __name__ == "__main__":
    sliding_kernel(); receptive_field(); xrd_strain(); architecture(); cover()
