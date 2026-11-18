"""Figures for content/learn/universal-potentials.md.  Run: python3 tools/figures/universal-potentials.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
import style
plt = style.setup()
SLUG = "universal-potentials"


def box(ax, x, y, w, h, title, sub, color, tsize=10):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0,rounding_size=0.12",
                                fc=style.TINT[color], ec=color, lw=1.3))
    if sub:
        ax.text(x, y + 0.2, title, ha="center", va="center", fontsize=tsize, weight="semibold", color=style.INK)
        ax.text(x, y - 0.2, sub, ha="center", va="center", fontsize=8.5, color=style.INK2, linespacing=1.25)
    else:
        ax.text(x, y, title, ha="center", va="center", fontsize=tsize, weight="semibold", color=style.INK)


def arrow(ax, p, q, color=style.INK3, rad=0.0):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=12, color=color, lw=1.5,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=3, shrinkB=3))


# ---------------------------------------------------------------- 1. the foundation-model workflow
def workflow():
    fig, ax = plt.subplots(figsize=(7.2, 4.6))
    ax.set_xlim(0, 12.0); ax.set_ylim(0, 6.3); ax.axis("off")
    ax.text(0.1, 6.05, "Pre-training data (DFT)", fontsize=9, color=style.INK2, weight="semibold")
    data = [("MPtrj", "1.6 M structures, PBE(+U)"), ("Alexandria", "millions of crystals"),
            ("OMat24", "110 M, far from equilibrium"), ("SPICE", "1 M, drug-like molecules")]
    for k, (name, sub) in enumerate(data):
        y = 5.3 - 1.05 * k
        box(ax, 1.65, y, 3.2, 0.88, name, sub, style.TEAL)
        arrow(ax, (3.27, y), (4.15, 3.75), color=style.TEAL)
    box(ax, 5.1, 3.75, 1.8, 1.3, "Universal\npotential", "", style.BLUE, tsize=11)
    box(ax, 8.55, 5.3, 3.5, 0.95, "Use directly", "screening, relaxations,\nexploratory MD", style.BLUE)
    box(ax, 8.55, 3.75, 3.5, 0.95, "Validate", "20–50 DFT calculations of\nthe configurations that matter", style.VIOLET)
    box(ax, 8.55, 2.2, 3.5, 0.95, "Fine-tune", "hundreds to thousands of\ncompatible DFT structures", style.ORANGE)
    box(ax, 8.55, 0.65, 3.5, 0.85, "Production MD", "validated on properties", style.TEAL)
    arrow(ax, (6.02, 4.05), (6.78, 5.1)); arrow(ax, (6.02, 3.75), (6.78, 3.75))
    arrow(ax, (8.55, 3.27), (8.55, 2.68), color=style.ORANGE)
    ax.text(8.7, 2.98, "errors too large", fontsize=8.5, color=style.ORANGE, va="center")
    arrow(ax, (8.55, 1.72), (8.55, 1.08))
    arrow(ax, (10.32, 3.6), (10.32, 0.8), rad=-0.35, color=style.TEAL)
    ax.text(10.95, 2.2, "errors\nacceptable", fontsize=8.5, color=style.TEAL, ha="left", va="center")
    arrow(ax, (2.4, 1.38), (6.78, 2.05), rad=0.12, color=style.INK3)
    ax.text(0.6, 0.6, "replay a sample of the original data\nduring fine-tuning to avoid forgetting",
            fontsize=8.5, color=style.INK2)
    style.save(fig, SLUG, "workflow")


# ---------------------------------------------------------------- 2. softening and what it does
def softening():
    s = 0.8
    fig, (a1, a2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw={"wspace": 0.38})
    k = np.linspace(0, np.pi, 300)                       # wavevector times lattice spacing
    w_ref = np.abs(np.sin(k / 2))                         # in units of 2 sqrt(K/m)
    a1.plot(k / np.pi, w_ref, color=style.BLUE)
    a1.plot(k / np.pi, np.sqrt(s) * w_ref, color=style.PINK)
    a1.annotate("", xy=(1.0, np.sqrt(s)), xytext=(1.0, 1.0),
                arrowprops=dict(arrowstyle="-|>", color=style.INK3, lw=1))
    a1.text(0.96, 0.8, f"−{100 * (1 - np.sqrt(s)):.1f} %", fontsize=8.5, color=style.INK2, ha="right", va="top")
    a1.text(0.2, 0.86, "reference (DFT)", color=style.BLUE, fontsize=9, ha="left")
    a1.text(0.56, 0.48, "curvature × 0.8", color=style.PINK, fontsize=9)
    a1.set_xlim(0, 1.05); a1.set_ylim(0, 1.1)
    a1.set_xlabel(r"wavevector $ka/\pi$"); a1.set_ylabel("frequency ω / 2√(K/m)")
    a1.set_title("Phonons of a soft chain")
    dE = np.linspace(0, 0.15, 200)
    for T, c in ((300, style.ORANGE), (600, style.VIOLET), (1000, style.TEAL)):
        kT = 8.617e-5 * T
        a2.semilogy(dE * 1000, np.exp(dE / kT), color=c)
        a2.text(152, np.exp(0.15 / kT), f"{T} K", color=c, fontsize=9, va="center")
    a2.plot([50], [np.exp(0.05 / (8.617e-5 * 300))], "o", color=style.ORANGE, ms=5)
    a2.annotate(f"0.05 eV at 300 K:\nrate × {np.exp(0.05 / (8.617e-5 * 300)):.1f}", xy=(50, 6.9), xytext=(8, 60),
                fontsize=8.5, color=style.INK2, arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    a2.set_xlim(0, 170); a2.set_ylim(1, 1e3)
    a2.set_xlabel("barrier underestimated by (meV)"); a2.set_ylabel("predicted rate / true rate")
    a2.set_title("A soft barrier speeds up kinetics")
    print(f"softening s={s}: frequencies x{np.sqrt(s):.3f}; 50 meV at 300 K -> x{np.exp(0.05 / (8.617e-5 * 300)):.2f};"
          f" 100 meV at 300 K -> x{np.exp(0.1 / (8.617e-5 * 300)):.0f}; at 1000 K -> x{np.exp(0.1 / (8.617e-5 * 1000)):.2f}")
    style.save(fig, SLUG, "softening")


# ---------------------------------------------------------------- 3. why hull-energy errors matter for screening
def screening():
    rng = np.random.default_rng(0)
    m, s0, M = 0.10, 0.10, 2_000_000                       # synthetic candidates: E_hull ~ N(0.10, 0.10) eV/atom
    t = rng.normal(m, s0, M)
    noise = rng.normal(0, 1, M)
    prev = (t < 0).mean()
    sigs = np.linspace(0.0, 0.15, 31)
    daf, f1 = [], []
    for sg in sigs:
        p = t + sg * noise
        tp = ((p < 0) & (t < 0)).sum(); fp = ((p < 0) & (t >= 0)).sum(); fn = ((p >= 0) & (t < 0)).sum()
        prec, rec = tp / (tp + fp), tp / (tp + fn)
        daf.append(prec / prev); f1.append(2 * prec * rec / (prec + rec))
    i5 = np.argmin(np.abs(sigs - 0.05))
    print(f"prevalence {prev:.3f}, max DAF {1 / prev:.2f}; at 0.05 eV/atom: DAF {daf[i5]:.2f}, F1 {f1[i5]:.2f}")
    fig, (a1, a2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw={"wspace": 0.4, "width_ratios": [1, 1.1]})
    n = 6000
    tt, pp = t[:n], t[:n] + 0.05 * noise[:n]
    cols = np.where((pp < 0) & (tt < 0), style.TEAL, np.where((pp < 0) & (tt >= 0), style.PINK,
                                                             np.where(tt < 0, style.GOLD, style.INK3)))
    a1.scatter(tt * 1000, pp * 1000, s=2.5, c=cols, lw=0, alpha=0.7, rasterized=True)
    a1.axhline(0, color=style.INK2, lw=0.8); a1.axvline(0, color=style.INK2, lw=0.8)
    a1.set_xlim(-250, 400); a1.set_ylim(-250, 400)
    a1.set_xlabel("true distance to hull (meV/atom)"); a1.set_ylabel("predicted (meV/atom)")
    a1.set_title("Errors of 50 meV/atom")
    a1.text(-240, -240, "found", color=style.TEAL, fontsize=9, va="bottom", bbox=dict(fc="white", ec="none", alpha=0.85, pad=1.5))
    a1.text(15, -240, "false alarms", color=style.PINK, fontsize=9, va="bottom", bbox=dict(fc="white", ec="none", alpha=0.85, pad=1.5))
    a1.text(-240, 380, "missed", color=style.GOLD, fontsize=9, va="top", bbox=dict(fc="white", ec="none", alpha=0.85, pad=1.5))
    a1.text(390, 380, "correctly\nrejected", color=style.INK2, fontsize=9, va="top", ha="right", bbox=dict(fc="white", ec="none", alpha=0.85, pad=1.5))
    a2.plot(sigs * 1000, daf, color=style.BLUE)
    a2.axhline(1 / prev, color=style.INK3, lw=0.8, ls=(0, (4, 3)))
    a2.text(150, 1 / prev + 0.12, f"perfect model: {1 / prev:.1f}", fontsize=8.5, color=style.INK2, ha="right",
            va="bottom")
    a2.plot([50], [daf[i5]], "o", color=style.BLUE, ms=5)
    a2.text(55, daf[i5] + 0.15, f"{daf[i5]:.1f}", fontsize=9, color=style.BLUE)
    a2.set_xlim(0, 150); a2.set_ylim(0, 7.2)
    a2.set_xlabel("model error σ (meV/atom)"); a2.set_ylabel("discovery acceleration factor")
    a2.set_title("Screening yield against error")
    style.save(fig, SLUG, "screening")


# ---------------------------------------------------------------- cover: one model over the periodic table
def cover():
    # (row, columns) of the main-group and transition-metal blocks, plus the f-block rows
    rows = {0: [0, 17], 1: [0, 1] + list(range(12, 18)), 2: [0, 1] + list(range(12, 18)),
            3: list(range(18)), 4: list(range(18)), 5: list(range(18)), 6: list(range(18))}
    def draw(ax):
        sz, gap, x0, y0 = 0.17, 0.035, 0.23, 2.2
        palette = [style.BLUE, style.TEAL, style.VIOLET, style.ORANGE, style.PINK, style.GOLD]
        centres = {}
        for r, cols in rows.items():
            for c in cols:
                block = 0 if c < 2 else (1 if c < 12 else 2)
                col = [style.PINK, style.BLUE, style.TEAL][block] if r > 0 else style.GOLD
                x, y = x0 + c * (sz + gap), y0 - r * (sz + gap)
                ax.add_patch(Rectangle((x, y), sz, sz, color=col, lw=0))
                centres[(r, c)] = (x + sz / 2, y + sz / 2)
        for k in range(14):
            x, y = x0 + (k + 3) * (sz + gap), y0 - 7.6 * (sz + gap)
            ax.add_patch(Rectangle((x, y), sz, sz, color=style.VIOLET, lw=0))
        # a message-passing graph drawn across the table
        nodes = [(3, 1), (4, 5), (3, 9), (5, 13), (2, 16), (6, 3), (5, 8)]
        edges = [(0, 1), (1, 2), (2, 3), (3, 4), (1, 5), (1, 6), (6, 3), (2, 6)]
        for a, b in edges:
            (xa, ya), (xb, yb) = centres[nodes[a]], centres[nodes[b]]
            ax.plot([xa, xb], [ya, yb], color=style.INK, lw=3, solid_capstyle="round", zorder=4)
        for nd in nodes:
            x, y = centres[nd]
            ax.add_patch(plt.Circle((x, y), 0.1, color="white", zorder=5))
            ax.add_patch(plt.Circle((x, y), 0.065, color=style.INK, zorder=6))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    workflow(); softening(); screening(); cover()
