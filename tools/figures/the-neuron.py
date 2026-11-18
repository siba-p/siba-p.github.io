"""Figures for content/learn/the-neuron.md.  Run: python3 tools/figures/the-neuron.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch
import style
plt = style.setup()
SLUG = "the-neuron"
sig = lambda z: 1 / (1 + np.exp(-z))


def bio_to_artificial():
    """A stylised biological neuron next to the artificial neuron, with the correspondences labelled."""
    fig, ax = plt.subplots(figsize=(7.2, 3.5))
    ax.set_xlim(0, 15); ax.set_ylim(0.3, 7.2); ax.set_aspect("equal"); ax.axis("off")

    # --- biological neuron (left) ---
    sx, sy, R = 3.1, 4.3, 0.62
    tips = []
    for k, ang in enumerate([128, 158, 188, 218, 248]):
        a = np.radians(ang)
        p0 = np.array([sx + R * np.cos(a), sy + R * np.sin(a)])
        p1 = p0 + 0.85 * np.array([np.cos(a), np.sin(a)])
        ax.plot(*zip(p0, p1), color=style.GOLD, lw=3.4, solid_capstyle="round", zorder=2)
        for da in (-17, 17):
            b = a + np.radians(da)
            p2 = p1 + 0.7 * np.array([np.cos(b), np.sin(b)])
            ax.plot(*zip(p1, p2), color=style.GOLD, lw=2.0, solid_capstyle="round", zorder=2)
            tips.append(p2 + 0.2 * np.array([np.cos(b), np.sin(b)]))
    for q, s_ in zip(tips, [1, 0, 1, 1, 0, 1, 1, 0, 1, 1]):      # synapses at the dendrite tips
        ax.add_patch(Circle(q, 0.15, color=style.TEAL if s_ else style.PINK, zorder=3))
    ax.add_patch(Circle((sx, sy), R, fc=style.TINT[style.GOLD], ec=style.GOLD, lw=2.2, zorder=4))
    ax.add_patch(Circle((sx + 0.08, sy + 0.05), 0.2, color=style.GOLD, alpha=0.55, zorder=5))
    # axon with myelin and terminals
    ax.plot([sx + R, 6.0], [sy, sy], color=style.ORANGE, lw=2.6, zorder=2)
    for x0 in (4.0, 4.65, 5.3):
        ax.add_patch(FancyBboxPatch((x0, sy - 0.13), 0.5, 0.26, boxstyle="round,pad=0,rounding_size=0.13",
                                    fc=style.TINT[style.ORANGE], ec=style.ORANGE, lw=1.2, zorder=3))
    for dy in (-0.45, 0, 0.45):
        ax.plot([6.0, 6.5], [sy, sy + dy], color=style.ORANGE, lw=1.8, zorder=2)
        ax.add_patch(Circle((6.55, sy + dy * 1.08), 0.12, color=style.ORANGE, zorder=3))

    lab = dict(fontsize=8.5, color=style.INK2, va="center")
    ax.text(0.15, 6.85, "biological neuron", fontsize=10.5, fontweight="semibold", color=style.INK)
    ax.annotate("synapses: each excites (teal) or\ninhibits (pink) by its own amount", tips[-1], xytext=(0.15, 1.25), ha="left",
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.7, shrinkB=5), **lab)
    ax.annotate("cell body adds\nup the stimulation", (sx + 0.3, sy + 0.55), xytext=(3.75, 6.0), ha="left",
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.7, shrinkB=2), **lab)
    ax.annotate("axon: fires a spike only\nif a threshold is crossed", (5.05, sy - 0.15), xytext=(3.95, 2.85), ha="left",
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.7, shrinkB=2), **lab)
    ax.text(0.15, 6.2, "dendrites", fontsize=8.5, color=style.GOLD, fontweight="semibold")

    # divider arrow
    ax.add_patch(FancyArrowPatch((6.95, 4.3), (7.85, 4.3), arrowstyle="-|>", mutation_scale=16, color=style.INK3, lw=1.6))
    ax.text(7.4, 4.75, "1943", ha="center", fontsize=8.5, color=style.INK3)

    # --- artificial neuron (right) ---
    ax.text(8.15, 6.85, "artificial neuron", fontsize=10.5, fontweight="semibold", color=style.INK)
    ins = [(8.75, 5.9), (8.75, 4.3), (8.75, 2.7)]
    ws = [1.6, -0.9, 0.5]
    zx, zy, rz = 11.35, 4.3, 0.55
    for i, ((x, y), w) in enumerate(zip(ins, ws)):
        col = style.TEAL if w > 0 else style.PINK
        ax.plot([x + 0.38, zx - rz], [y, zy], color=col, lw=1.2 + 2.6 * abs(w), solid_capstyle="round", zorder=2, alpha=0.9)
        ax.add_patch(Circle((x, y), 0.38, fc="white", ec=style.BLUE, lw=1.8, zorder=4))
        ax.text(x, y, f"$x_{i + 1}$", ha="center", va="center", fontsize=10, color=style.BLUE, zorder=5)
        mx, my = (x + 0.38 + zx - rz) / 2, (y + zy) / 2
        ax.text(mx - 0.05, my + (0.38 if i == 0 else 0.3 if i == 1 else -0.42), f"$w_{i + 1}$", ha="center", va="center",
                fontsize=9.5, color=col, fontweight="semibold")
    ax.plot([zx, zx], [zy + rz, zy + 1.35], color=style.VIOLET, lw=1.6, ls=(0, (3, 2)))
    ax.text(zx, zy + 1.6, "$+\\,b$", ha="center", fontsize=10, color=style.VIOLET)
    ax.add_patch(Circle((zx, zy), rz, fc=style.TINT[style.GOLD], ec=style.GOLD, lw=2.2, zorder=4))
    ax.text(zx, zy + 0.02, "Σ", ha="center", va="center", fontsize=14, color=style.GOLD, fontweight="semibold", zorder=5)
    bx, by, bw, bh = 12.55, 3.8, 1.05, 1.0
    ax.plot([zx + rz, bx], [zy, zy], color=style.INK3, lw=1.6)
    ax.text((zx + rz + bx) / 2, zy + 0.22, "$z$", ha="center", fontsize=9.5, color=style.GOLD)
    ax.add_patch(FancyBboxPatch((bx, by), bw, bh, boxstyle="round,pad=0,rounding_size=0.15", fc="white", ec=style.INK3, lw=1.2, zorder=3))
    zz = np.linspace(-6, 6, 60)
    ax.plot(bx + 0.12 + (zz + 6) / 12 * (bw - 0.24), by + 0.15 + sig(zz) * (bh - 0.3), color=style.ORANGE, lw=1.8, zorder=4)
    ax.text(bx + bw / 2, by - 0.3, "$\\sigma$", ha="center", fontsize=10, color=style.INK2)
    ax.add_patch(FancyArrowPatch((bx + bw, zy), (14.75, zy), arrowstyle="-|>", mutation_scale=12, color=style.ORANGE, lw=1.8))
    ax.text(14.45, zy + 0.25, "$y$", ha="center", fontsize=10.5, color=style.ORANGE)

    ax.text(8.15, 1.05, "synapse strength  →  weight $w_i$ (sign and size)\n"
                        "threshold  →  bias $b$\n"
                        "spike or no spike  →  activation $\\sigma(z)$", fontsize=8.5, color=style.INK2, va="center",
            linespacing=1.55)
    style.save(fig, SLUG, "bio-to-artificial")


def activations():
    """The four activations, and their slopes with the saturated region of the sigmoid."""
    fig, (a, b) = plt.subplots(1, 2, figsize=(7.2, 3.1), gridspec_kw=dict(wspace=0.3))
    z = np.linspace(-5, 5, 801)
    a.axhline(0, color=style.LINE, lw=0.8, zorder=0); a.axvline(0, color=style.LINE, lw=0.8, zorder=0)
    a.plot([-5, 0], [0, 0], color=style.GOLD, lw=2); a.plot([0, 5], [1, 1], color=style.GOLD, lw=2)
    a.plot([0, 0], [0, 1], color=style.GOLD, lw=1, ls=(0, (2, 2)))
    a.plot(z, sig(z), color=style.BLUE); a.plot(z, np.tanh(z), color=style.TEAL); a.plot(z, np.maximum(z, 0), color=style.ORANGE)
    a.text(-4.8, 0.12, "step", color=style.GOLD, fontsize=9)
    a.text(-1.05, 0.5, "sigmoid", color=style.BLUE, fontsize=9, ha="right")
    a.text(-4.8, -0.86, "tanh", color=style.TEAL, fontsize=9)
    a.text(2.25, 1.6, "ReLU", color=style.ORANGE, fontsize=9)
    a.set_xlim(-5, 5); a.set_ylim(-1.2, 2.3)
    a.set_xlabel("weighted sum $z$"); a.set_ylabel("output $\\sigma(z)$")
    a.set_title("activation")

    z = np.linspace(-11, 11, 1201)
    for side in (-1, 1):
        b.axvspan(5 * side, 11 * side, color=style.BG2, zorder=0)
    b.text(-8, 1.06, "sigmoid\nsaturated", ha="center", va="top", fontsize=8.5, color=style.INK3)
    b.text(8, 1.06, "sigmoid\nsaturated", ha="center", va="top", fontsize=8.5, color=style.INK3)
    s = sig(z)
    b.plot(z, s * (1 - s), color=style.BLUE)
    b.plot(z, 1 - np.tanh(z) ** 2, color=style.TEAL)
    b.plot([-11, 0], [0, 0], color=style.ORANGE, lw=2); b.plot([0, 11], [1, 1], color=style.ORANGE, lw=2)
    b.plot([0, 0], [0, 1], color=style.ORANGE, lw=1, ls=(0, (2, 2)))
    b.text(-1.2, 0.27, "sigmoid: at\nmost 0.25", color=style.BLUE, fontsize=8.5, ha="right")
    b.text(1.15, 0.62, "tanh", color=style.TEAL, fontsize=9)
    b.text(2.6, 0.92, "ReLU", color=style.ORANGE, fontsize=9, ha="center", va="top")
    v = sig(10) * (1 - sig(10))
    b.plot([10], [v], "o", ms=5, color=style.BLUE, zorder=5)
    b.annotate(f"$z = 10$: slope {v / 1e-5:.1f}×10$^{{-5}}$", (10, v), xytext=(8.0, 0.3), ha="center", fontsize=8.5,
               color=style.INK2, arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=4))
    b.set_xlim(-11, 11); b.set_ylim(-0.06, 1.1)
    b.set_xlabel("weighted sum $z$"); b.set_ylabel("slope $d\\sigma/dz$")
    b.set_title("slope (the learning signal)")
    style.save(fig, SLUG, "activations")


def logic_gates():
    """AND and OR as single step neurons on the four corners; XOR defeats every straight line."""
    fig, axs = plt.subplots(1, 3, figsize=(7.2, 2.75), gridspec_kw=dict(wspace=0.12))
    X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
    lo, hi = -0.45, 1.45
    gx, gy = np.meshgrid(np.linspace(lo, hi, 2), np.linspace(lo, hi, 2))
    cases = [("AND", (1, 1), -1.5, [0, 0, 0, 1]), ("OR", (1, 1), -0.5, [0, 1, 1, 1]), ("XOR", (1, 1), -0.5, [0, 1, 1, 0])]
    for ax, (name, w, b, t) in zip(axs, cases):
        ax.set_xlim(lo, hi); ax.set_ylim(lo, hi); ax.set_aspect("equal")
        ax.set_xticks([0, 1]); ax.set_yticks([0, 1])
        for sp in ("left", "bottom"):
            ax.spines[sp].set_color(style.LINE)
        xs = np.linspace(lo, hi, 2)
        line = (-b - w[0] * xs) / w[1]
        ax.fill_between(xs, line, hi, color=style.TINT[style.ORANGE], zorder=0)
        ax.fill_between(xs, lo, line, color=style.TINT[style.BLUE], zorder=0)
        ax.plot(xs, line, color=style.INK2 if name != "XOR" else style.INK3, lw=1.6, ls="-" if name != "XOR" else (0, (4, 2)))
        out = (X @ np.array(w) + b >= 0).astype(int)
        for (x1, x2), ti, oi in zip(X, t, out):
            ax.plot(x1, x2, "o", ms=11, color=style.ORANGE if ti else style.BLUE, mec="white", mew=1.5, zorder=4)
            if ti != oi:
                ax.add_patch(Circle((x1, x2), 0.17, fill=False, ec=style.PINK, lw=2, zorder=5))
        if name != "XOR":
            p = np.array([0.75, 0.75]) if name == "AND" else np.array([0.25, 0.25])
            u = np.array(w) / np.linalg.norm(w) * 0.42
            ax.add_patch(FancyArrowPatch(p, p + u, arrowstyle="-|>", mutation_scale=11, color=style.TEAL, lw=1.8, zorder=3))
            ax.set_title(f"{name}:  $b = {b}$".replace("-", "−"), fontsize=10.5)
        else:
            ax.set_title("XOR: no line works", fontsize=10.5)
        if ax is axs[0]:
            ax.set_xlabel("$x_1$"); ax.set_ylabel("$x_2$")
            ax.text(1.42, 1.35, "$\\mathbf{w} = (1, 1)$", ha="right", fontsize=8.5, color=style.TEAL)
        else:
            ax.set_yticklabels([]); ax.set_xlabel("$x_1$")
    style.save(fig, SLUG, "logic-gates")


def window():
    """One neuron per edge of the tolerance-factor window, combined by a third neuron."""
    fig, ax = plt.subplots(figsize=(7.2, 3.1))
    t = np.linspace(0.6, 1.2, 1201)
    hA, hB = sig(40 * (t - 0.8)), sig(40 * (1.0 - t))
    y = sig(20 * hA + 20 * hB - 30)
    ax.axvspan(0.8, 1.0, color=style.TINT[style.GOLD], zorder=0)
    ax.fill_between(t, 0, y, color=style.TINT[style.ORANGE], zorder=1)
    ax.plot(t, hA, color=style.TEAL, lw=1.8, ls=(0, (5, 2)))
    ax.plot(t, hB, color=style.VIOLET, lw=1.8, ls=(0, (5, 2)))
    ax.plot(t, y, color=style.ORANGE, lw=2.4)
    ax.text(1.115, 0.9, "neuron A:\n$\\sigma(40\\,(t - 0.8))$\n‘$t$ above 0.8’", color=style.TEAL, fontsize=8.5, ha="center", va="top")
    ax.text(0.685, 0.9, "neuron B:\n$\\sigma(40\\,(1.0 - t))$\n‘$t$ below 1.0’", color=style.VIOLET, fontsize=8.5, ha="center", va="top")
    ax.text(0.9, 0.5, "output:\nA and B", color=style.ORANGE, fontsize=9.5, ha="center", va="center", fontweight="semibold")
    ax.text(0.9, 1.1, "perovskite window", color=style.GOLD, fontsize=9, ha="center", fontweight="semibold")
    ax.set_xlim(0.6, 1.2); ax.set_ylim(-0.03, 1.17)
    ax.set_yticks([0, 0.5, 1])
    ax.set_xlabel("Goldschmidt tolerance factor $t$ (dimensionless)")
    ax.set_ylabel("neuron output")
    style.save(fig, SLUG, "window")


def cover():
    def draw(ax):
        zx, zy = 2.35, 1.5
        ins = [(0.6, 2.4), (0.6, 1.5), (0.6, 0.6)]
        for (x, y), col, lw in zip(ins, [style.TEAL, style.PINK, style.TEAL], [11, 6, 3.5]):
            ax.plot([x, zx], [y, zy], color=col, lw=lw, solid_capstyle="round", zorder=1)
            ax.add_patch(Circle((x, y), 0.27, color=style.BLUE, zorder=3))
        ax.plot([zx, 3.55], [zy, zy], color=style.ORANGE, lw=9, solid_capstyle="round", zorder=1)
        ax.add_patch(Circle((3.55, zy), 0.22, color=style.ORANGE, zorder=3))
        ax.add_patch(Circle((zx, zy), 0.72, color=style.GOLD, zorder=2))
        z = np.linspace(-6, 6, 80)
        ax.plot(zx - 0.42 + z / 12 * 0.84, zy - 0.36 + sig(z) * 0.72, color="white", lw=6, solid_capstyle="round", zorder=4)
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    bio_to_artificial(); activations(); logic_gates(); window(); cover()
