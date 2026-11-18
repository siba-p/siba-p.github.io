"""Shared look for the static figures of the Learn section.

Every chapter has one script, tools/figures/<slug>.py, that draws all of that chapter's figures:

    import style
    plt = style.setup()                       # fonts, colours, sizes
    fig, ax = plt.subplots()
    ax.plot(x, y, color=style.BLUE)
    style.save(fig, "es-umbrella", "windows")  # -> static/img/learn/es-umbrella/windows.svg

Run it from anywhere:  python3 tools/figures/<slug>.py
Figures are SVG with text converted to outlines, so they look the same in every browser.
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO, "static", "img", "learn")

# Site palette (the same colours the equation cards use)
BLUE, TEAL, VIOLET, ORANGE, PINK, GOLD = "#4c6ef5", "#12a594", "#845ef7", "#f08c2e", "#e64980", "#d4a017"
INK, INK2, INK3, LINE, BG2 = "#0c1222", "#48526a", "#828ca0", "#e6e9ef", "#f5f7fa"
CYCLE = [BLUE, ORANGE, TEAL, VIOLET, PINK, GOLD]
# Light tints for fills and backgrounds
TINT = {BLUE: "#e7ecfe", TEAL: "#e0f4f1", VIOLET: "#efe9fe", ORANGE: "#fdf0e3", PINK: "#fce6ee", GOLD: "#faf3dc"}

# Standard sizes in inches: the text column is about 7.2 in at 100 px per inch
WIDE = (7.2, 3.4)      # default: one wide panel or two side by side
TALL = (7.2, 4.8)
SQUARE = (4.8, 4.2)
COVER = (4.0, 3.0)     # chapter cover: 4:3, no text


def setup():
    for f in os.listdir(os.path.join(HERE, "fonts")):
        if f.endswith(".ttf"):
            font_manager.fontManager.addfont(os.path.join(HERE, "fonts", f))
    plt.rcParams.update({
        "font.family": "Inter", "font.size": 10,
        "mathtext.fontset": "custom", "mathtext.rm": "Inter", "mathtext.it": "Inter:italic", "mathtext.bf": "Inter:semibold", "mathtext.cal": "Inter",
        "mathtext.sf": "Inter", "mathtext.default": "it",
        "axes.titlesize": 11, "axes.titleweight": "semibold", "axes.titlelocation": "left", "axes.titlepad": 10,
        "axes.labelsize": 10, "axes.labelcolor": INK2, "axes.edgecolor": INK3, "axes.linewidth": 0.8,
        "axes.spines.top": False, "axes.spines.right": False,
        "axes.prop_cycle": matplotlib.cycler(color=CYCLE),
        "axes.grid": False, "grid.color": LINE, "grid.linewidth": 0.8,
        "xtick.color": INK3, "ytick.color": INK3, "xtick.labelcolor": INK2, "ytick.labelcolor": INK2,
        "xtick.labelsize": 9, "ytick.labelsize": 9, "xtick.major.size": 3, "ytick.major.size": 3,
        "lines.linewidth": 2.0, "lines.solid_capstyle": "round", "patch.linewidth": 0.8,
        "legend.frameon": False, "legend.fontsize": 9, "legend.labelcolor": INK2,
        "figure.figsize": WIDE, "figure.facecolor": "white", "savefig.facecolor": "white",
        "text.color": INK, "svg.fonttype": "path", "path.simplify": True,
    })
    return plt


def save(fig, slug, name, pad=0.12):
    """Write static/img/learn/<slug>/<name>.svg deterministically and close the figure."""
    os.makedirs(os.path.join(OUT, slug), exist_ok=True)
    path = os.path.join(OUT, slug, name + ".svg")
    plt.rcParams["svg.hashsalt"] = f"{slug}-{name}"
    fig.savefig(path, format="svg", bbox_inches="tight", pad_inches=pad, metadata={"Date": None, "Creator": None})
    plt.close(fig)
    kb = os.path.getsize(path) / 1024
    print(f"{path}  {kb:.0f} KB" + ("   <-- too large, simplify or use rasterized=True" if kb > 250 else ""))
    return path


def cover(slug, draw, name="cover", bg=None):
    """Chapter cover: a 4:3 illustration with no axes and no text. `draw(ax)` paints onto a 0..4 x 0..3 canvas.
    `bg` fills the canvas first, e.g. bg=TINT[BLUE]; bold shapes in the palette colours read best at thumbnail size."""
    fig = plt.figure(figsize=COVER)
    ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, 4); ax.set_ylim(0, 3); ax.set_aspect("equal"); ax.axis("off")
    if bg: ax.add_patch(plt.Rectangle((0, 0), 4, 3, color=bg, zorder=-10))
    draw(ax)
    return save(fig, slug, name, pad=0)
