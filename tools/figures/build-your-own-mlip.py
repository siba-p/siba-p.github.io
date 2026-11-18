"""Figures for content/learn/build-your-own-mlip.md.  Run: python3 tools/figures/build-your-own-mlip.py
The numbers are the printed output of the chapter's scripts, copied from the text."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import style
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Polygon
plt = style.setup()
SLUG = "build-your-own-mlip"

# Step 4 output: test RMSE during training
EPOCH = np.array([1, 10, 25, 50, 80, 120])
E_RMSE = np.array([8.23, 10.21, 3.82, 1.62, 0.56, 0.29])      # meV/atom
F_RMSE = np.array([150.0, 67.4, 33.8, 21.6, 18.1, 16.6])       # meV/A
BROAD_F25 = 296.0                                               # broad radial functions, epoch 25
MACE_E, MACE_F = 3.3, 30.6                                      # MACE after 30 epochs
# Step 5 output: energy per atom of the perfect crystal
A = np.linspace(3.45, 3.80, 8)
E_EMT = np.array([0.0677, 0.0226, -0.0015, -0.0067, 0.0046, 0.0303, 0.0686, 0.1181])
E_NN = np.array([0.0724, 0.0227, -0.0012, -0.0066, 0.0038, 0.0298, 0.0677, 0.1137])
A_TRAIN = 3.61 * np.array([0.97, 1.0, 1.03])                   # the only three cell sizes in the data
A0_MACE = 3.727


def box(ax, x, y, w, h, title, body, col):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.02,rounding_size=0.12",
                                fc=style.TINT[col], ec=col, lw=1.3))
    ax.text(x, y + h / 2 - 0.22, title, ha="center", va="top", fontsize=9.5, fontweight="semibold", color=style.INK)
    ax.text(x, y + h / 2 - 0.66, body, ha="center", va="top", fontsize=8, color=style.INK2, linespacing=1.25)


def arrow(ax, p, q, col=style.INK3, rad=0.0, ls="-"):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=12, color=col, lw=1.5, linestyle=ls,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=2, shrinkB=2))


def pipeline():
    fig, ax = plt.subplots(figsize=(7.2, 4.4))
    ax.set_xlim(0, 16.6); ax.set_ylim(0.7, 9.0); ax.set_aspect("equal"); ax.axis("off")
    W, H = 4.4, 2.3
    top, bot = 7.5, 3.4
    box(ax, 2.5, top, W, H, "1  Reference data", "480 Cu cells × 32 atoms\nEMT labels: E and F\n400 train / 80 test", style.BLUE)
    box(ax, 7.8, top, W, H, "2  Descriptors", "24 radial + 12 angular\nper atom, r_c = 5 Å\ndifferentiable in r", style.VIOLET)
    box(ax, 13.1, top, W, H, "3  Atomic network", "36 → 32 → 32 → 1, SiLU\n2 273 weights\nE = sum over atoms", style.TEAL)
    box(ax, 13.1, bot, W, H, "4  Train", "F = −∂E/∂r by autograd\n10 ΔE² + ΔF²\ncreate_graph=True", style.ORANGE)
    box(ax, 7.8, bot, W, H, "5  ASE calculator", "energy and forces\nfor any ASE workflow", style.PINK)
    box(ax, 2.5, bot, W, H, "5  Physical tests", "E–V curve, lattice\nconstant, NVE in a\n108-atom cell", style.GOLD)
    arrow(ax, (4.75, top), (5.55, top)); arrow(ax, (10.05, top), (10.85, top))
    arrow(ax, (13.1, top - H / 2 - 0.05), (13.1, bot + H / 2 + 0.05))
    arrow(ax, (10.85, bot), (10.05, bot)); arrow(ax, (5.55, bot), (4.75, bot))
    # backpropagation loop from loss to weights
    arrow(ax, (15.6, bot + 0.3), (15.6, top - 0.3), col=style.ORANGE, rad=0.0, ls=(0, (3, 2)))
    ax.text(15.8, (top + bot) / 2, "backpropagate\nto the weights", rotation=90, ha="left", va="center", fontsize=8, color=style.ORANGE)
    ax.text(7.8, 1.25, "step 6 trains MACE on the same extended-XYZ files with mace_run_train", ha="center", va="center", fontsize=8.5, color=style.INK2)
    style.save(fig, SLUG, "pipeline")


def training():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw={"wspace": 0.38})
    ax1.semilogy(EPOCH, E_RMSE, color=style.BLUE, marker="o", ms=5)
    ax1.plot([30], [MACE_E], marker="D", ms=6, color=style.VIOLET, ls="none")
    ax1.annotate("MACE after 30 epochs", xy=(31.5, MACE_E * 1.05), xytext=(55, 5.0), fontsize=8.5, color=style.VIOLET, va="center", arrowprops=dict(arrowstyle="-", color=style.VIOLET, lw=0.8))
    ax1.annotate("rises while forces\ndominate the loss", xy=(10, 10.21), xytext=(30, 11.5), fontsize=8.5, color=style.INK2,
                 va="center", arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    ax1.text(118, 0.29 * 0.72, "0.29", ha="right", va="top", fontsize=8.5, color=style.BLUE)
    ax1.set_xlabel("epoch"); ax1.set_ylabel("test energy RMSE (meV/atom)")
    ax1.set_title("Energies", fontsize=10); ax1.set_xlim(0, 125); ax1.set_ylim(0.15, 25)
    ax2.semilogy(EPOCH, F_RMSE, color=style.TEAL, marker="o", ms=5)
    ax2.plot([25], [BROAD_F25], marker="o", ms=6, color=style.ORANGE, ls="none")
    ax2.text(30, BROAD_F25, "broad radial functions", color=style.ORANGE, fontsize=8.5, va="center")
    ax2.plot([30], [MACE_F], marker="D", ms=6, color=style.VIOLET, ls="none")
    ax2.text(34, MACE_F * 1.12, "MACE", color=style.VIOLET, fontsize=8.5, va="bottom")
    ax2.text(118, 16.6 * 0.8, "16.6", ha="right", va="top", fontsize=8.5, color=style.TEAL)
    ax2.set_xlabel("epoch"); ax2.set_ylabel("test force RMSE (meV/Å)")
    ax2.set_title("Forces", fontsize=10); ax2.set_xlim(0, 125); ax2.set_ylim(10, 500)
    style.save(fig, SLUG, "training")


def eos():
    aa = np.linspace(3.45, 3.80, 300)
    fit = {k: np.polyfit(A, E, 3) for k, E in (("EMT", E_EMT), ("NN", E_NN))}
    for k, p in fit.items():
        r = np.roots(np.polyder(p)); r = r[np.isreal(r)].real; print(k, "a0 =", np.round(r[(r > 3.4) & (r < 3.9)], 3))
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(7.2, 4.6), sharex=True, gridspec_kw={"height_ratios": [2.2, 1], "hspace": 0.12})
    for ax in (ax1, ax2):
        ax.axvspan(A_TRAIN[0], A_TRAIN[-1], color=style.TINT[style.TEAL], zorder=0, lw=0)
        for a in A_TRAIN:
            ax.axvline(a, color=style.TEAL, lw=1.0, ls=(0, (3, 2)), zorder=1)
    ax1.plot(aa, 1000 * np.polyval(fit["EMT"], aa), color=style.INK3, lw=1.5)
    ax1.plot(A, 1000 * E_EMT, "o", color=style.INK2, ms=6, label="EMT reference")
    ax1.plot(A, 1000 * E_NN, "o", color=style.BLUE, ms=4, label="hand-written network")
    ax1.legend(loc="upper center", ncol=2, handletextpad=0.3)
    ax1.text(3.61, 95, "the three cell sizes\nin the training data", ha="center", va="top", fontsize=8.5, color=style.TEAL)
    ax1.annotate("", xy=(A0_MACE, -12), xytext=(A0_MACE, 8), arrowprops=dict(arrowstyle="-|>", color=style.VIOLET, lw=1.3))
    ax1.text(A0_MACE + 0.005, 10, "MACE puts the\nminimum at 3.727 Å", color=style.VIOLET, fontsize=8.5, ha="left", va="bottom")
    ax1.annotate("", xy=(3.590, -12), xytext=(3.590, -30), arrowprops=dict(arrowstyle="-|>", color=style.BLUE, lw=1.3))
    ax1.text(3.590, -32, "EMT and network: 3.590 Å", color=style.BLUE, fontsize=8.5, ha="center", va="top")
    ax1.set_ylabel("energy (meV/atom)"); ax1.set_ylim(-48, 125)
    err = 1000 * (E_NN - E_EMT)
    ax2.bar(A, err, width=0.025, color=[style.ORANGE if abs(e) > 2 else style.BLUE for e in err])
    ax2.axhline(0, color=style.INK3, lw=0.8)
    for a, e in zip(A, err):
        ax2.text(a, e + (0.5 if e > 0 else -0.5), f"{e:+.1f}".replace("-", "−"), ha="center", va="bottom" if e > 0 else "top", fontsize=8, color=style.INK2)
    ax2.set_ylabel("network − EMT\n(meV/atom)"); ax2.set_ylim(-7.5, 7.5)
    ax2.set_xlabel("lattice constant a (Å)")
    style.save(fig, SLUG, "eos")


def cover():
    def draw(ax):
        # an fcc unit cell in oblique projection: copper-coloured atoms at corners and face centres
        o = np.array([1.15, 0.45]); ex, ey, ez = np.array([1.6, 0.0]), np.array([0.62, 0.48]), np.array([0.0, 1.6])
        P = lambda u, v, w: o + u * ex + v * ey + w * ez
        corners = [(u, v, w) for u in (0, 1) for v in (0, 1) for w in (0, 1)]
        faces = [(0.5, 0.5, 0), (0.5, 0.5, 1), (0.5, 0, 0.5), (0.5, 1, 0.5), (0, 0.5, 0.5), (1, 0.5, 0.5)]
        for a in corners:
            for b in corners:
                if sum(abs(np.array(a) - np.array(b))) == 1 and a < b:
                    back = (a[1] == 1 and b[1] == 1)
                    ax.plot(*zip(P(*a), P(*b)), color=style.INK3 if back else style.INK2, lw=2.0, zorder=1, alpha=0.6 if back else 1)
        atoms = [(c, 0.2) for c in corners] + [(f, 0.2) for f in faces]
        atoms.sort(key=lambda t: -t[0][1])                                       # draw back to front
        for (u, v, w), r in atoms:
            col = style.ORANGE if (u, v, w) in corners else style.GOLD
            ax.add_patch(Circle(P(u, v, w), r, fc=col, ec="white", lw=1.6, zorder=3 + (1 - v)))
        # a small network glyph beside the cell
        L = [np.array([[0.35, y] for y in (1.0, 1.5, 2.0)]), np.array([[0.75, y] for y in (1.25, 1.75)])]
        for p in L[0]:
            for q in L[1]:
                ax.plot([p[0], q[0]], [p[1], q[1]], color=style.INK3, lw=1.0, zorder=1)
        for layer, col in zip(L, (style.VIOLET, style.TEAL)):
            for p in layer:
                ax.add_patch(Circle(p, 0.1, fc=col, ec="white", lw=1.0, zorder=3))
    style.cover(SLUG, draw, bg=style.TINT[style.ORANGE])


if __name__ == "__main__":
    pipeline(); training(); eos(); cover()
