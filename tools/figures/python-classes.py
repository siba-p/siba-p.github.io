"""Figures for content/learn/python-classes.md.  Run: python3 tools/figures/python-classes.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle, Circle
import style
plt = style.setup()
SLUG = "python-classes"


# The classes of the chapter, exactly as printed there
class Potential:
    def energy(self, r):
        raise NotImplementedError
    def force(self, r, h=1e-6):
        return -(self.energy(r + h) - self.energy(r - h)) / (2 * h)


class LennardJones(Potential):
    def __init__(self, epsilon=1.0, sigma=1.0):
        self.epsilon, self.sigma = epsilon, sigma
    def energy(self, r):
        sr6 = (self.sigma / r) ** 6
        return 4 * self.epsilon * (sr6 * sr6 - sr6)


class Oscillator:
    def __init__(self, k=1.0, m=1.0, x=1.0, v=0.0):
        self.k, self.m, self.x, self.v = k, m, x, v
    def force(self):
        return -self.k * self.x
    def energy(self):
        return 0.5 * self.m * self.v**2 + 0.5 * self.k * self.x**2
    def step(self, dt):
        self.v += 0.5 * dt * self.force() / self.m
        self.x += dt * self.v
        self.v += 0.5 * dt * self.force() / self.m


class EulerOscillator(Oscillator):
    """Same physics, different integrator: only step() is overridden."""
    def step(self, dt):
        f = self.force()
        self.x += dt * self.v
        self.v += dt * f / self.m


def box(ax, x, y, w, h, fc, ec, lw=1.0, r=0.8):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}", fc=fc, ec=ec, lw=lw))


# ---------------------------------------------------------------------------------------------
# 1. Attribute lookup: instance -> class -> base -> object
# ---------------------------------------------------------------------------------------------
def lookup():
    assert [c.__name__ for c in LennardJones.__mro__] == ["LennardJones", "Potential", "object"]
    fig, ax = plt.subplots(figsize=(7.2, 3.9))
    ax.set_xlim(0, 72); ax.set_ylim(0, 39); ax.axis("off"); ax.set_aspect("equal")
    levels = [
        ("instance lj", "lj.__dict__", ["epsilon = 1.0", "sigma = 1.0"], style.BLUE),
        ("class LennardJones", "LennardJones.__dict__", ["__init__", "energy"], style.VIOLET),
        ("class Potential", "Potential.__dict__", ["energy   (shadowed)", "force"], style.TEAL),
        ("class object", "object.__dict__", ["__repr__, __eq__, __hash__, …"], style.INK3),
    ]
    x0, w, hb, gap = 2, 30, 6.6, 2.6
    ys = []
    for i, (title, sub, names, c) in enumerate(levels):
        y = 37 - (i + 1) * hb - i * gap
        ys.append(y)
        box(ax, x0, y, w, hb, style.TINT.get(c, style.BG2), c, lw=1.2)
        ax.text(x0 + 1.2, y + hb - 1.6, title, fontsize=10, fontweight="semibold", color=style.INK, va="center")
        ax.text(x0 + 1.2, y + 2.0, "     ".join(names), fontsize=9, color=style.INK2, va="center",
                family="DejaVu Sans Mono")
        if i < len(levels) - 1:
            ax.add_patch(FancyArrowPatch((x0 + 4, y - 0.1), (x0 + 4, y - gap + 0.1), arrowstyle="-|>",
                                         mutation_scale=10, color=style.INK2, lw=1.4))
    ax.text(x0 + 5.5, ys[0] - gap / 2, "not found? look in the class", fontsize=8, color=style.INK3, va="center")
    ax.text(x0 + 5.5, ys[1] - gap / 2, "then its base classes, in MRO order", fontsize=8, color=style.INK3,
            va="center")
    # lookups on the right
    queries = [("lj.sigma", 0, style.BLUE, "found on the instance"),
               ("lj.energy(1.1)", 1, style.VIOLET, "LennardJones's own method"),
               ("lj.force(1.1)", 2, style.TEAL, "inherited from Potential"),
               ("lj.mass", 4, style.PINK, "AttributeError")]
    for j, (q, lvl, c, note) in enumerate(queries):
        yq = ys[lvl] + hb / 2 if lvl < 4 else ys[3] - 2.4
        xq = 44
        ax.text(xq, yq + 0.9, q, fontsize=10, color=c, fontweight="semibold", va="center",
                family="DejaVu Sans Mono")
        ax.text(xq, yq - 1.5, note, fontsize=8.5, color=style.INK2, va="center")
        if lvl < 4:
            ax.add_patch(FancyArrowPatch((xq - 0.8, yq + 0.9), (x0 + w + 0.3, yq), arrowstyle="-|>",
                                         mutation_scale=10, color=c, lw=1.4))
        else:
            ax.add_patch(FancyArrowPatch((xq - 0.8, yq + 0.9), (x0 + w - 3, ys[3] - 0.2), arrowstyle="-|>",
                                         mutation_scale=10, color=c, lw=1.4, connectionstyle="arc3,rad=-0.2"))
    style.save(fig, SLUG, "lookup")


# ---------------------------------------------------------------------------------------------
# 2. Error of the inherited finite-difference force against the step h
# ---------------------------------------------------------------------------------------------
def fd_error():
    lj = LennardJones()
    r = 1.1
    exact = 24 / r * (2 * r**-12 - r**-6)
    d3 = 4 * (-12 * 13 * 14 / r**15 + 6 * 7 * 8 / r**9)          # U'''(r)
    eps = np.finfo(float).eps
    hs = np.geomspace(1e-12, 1e-1, 67)
    err = np.array([abs(lj.force(r, h) - exact) for h in hs])
    err[err == 0] = np.nan
    trunc = abs(d3) * hs**2 / 6
    round_ = eps * abs(lj.energy(r)) / hs
    hopt = (3 * eps * abs(lj.energy(r)) / abs(d3)) ** (1 / 3)
    fig, ax = plt.subplots(figsize=style.WIDE)
    ax.loglog(hs, trunc, "--", color=style.ORANGE, lw=1.4)
    ax.loglog(hs, round_, "--", color=style.VIOLET, lw=1.4)
    ax.loglog(hs, err, "o-", color=style.BLUE, ms=3.5, lw=1.2)
    ax.text(2.5e-3, 2e-7, "truncation\n|U‴| h² / 6", color=style.ORANGE, fontsize=9, ha="left")
    ax.text(3e-12, 3e-10, "rounding\nε |U| / h", color=style.VIOLET, fontsize=9, ha="left")
    e6 = abs(lj.force(r, 1e-6) - exact)
    ax.annotate(f"default h = 10⁻⁶\nerror {e6:.0e}", (1e-6, e6), xytext=(3e-11, 1e-13), fontsize=9,
                color=style.INK2, arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    ax.axvline(hopt, color=style.INK3, lw=0.8, ls=":")
    ax.text(hopt * 0.8, 3e-1, f"best h ≈ (3ε|U|/|U‴|)^(1/3) ≈ {hopt:.0e}", fontsize=8.5, color=style.INK3,
            ha="right", va="center")
    ax.set_xlim(1e-12, 1e-1); ax.set_ylim(1e-14, 2)
    ax.set_xlabel("finite-difference step h (units of σ)")
    ax.set_ylabel("|force error|  (ε/σ)")
    style.save(fig, SLUG, "fd-error")
    return exact, e6, hopt


# ---------------------------------------------------------------------------------------------
# 3. Swapping the integrator: velocity Verlet against explicit Euler, same Oscillator physics
# ---------------------------------------------------------------------------------------------
def integrators():
    dt, nsteps = 0.05, 10000
    out = {}
    for cls in (Oscillator, EulerOscillator):
        o = cls(); E0 = o.energy(); E = np.empty(nsteps)
        for n in range(nsteps):
            o.step(dt); E[n] = o.energy()
        out[cls.__name__] = E / E0
    t = dt * np.arange(1, nsteps + 1)
    fig, (a1, a2) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw={"wspace": 0.42})
    m = t <= 40
    a1.plot(t[m], out["EulerOscillator"][m], color=style.PINK)
    a1.plot(t[m], out["Oscillator"][m], color=style.BLUE)
    a1.text(26, 4.4, "explicit Euler\nE grows as (1 + ω²Δt²)ⁿ", color=style.PINK, fontsize=9, ha="right")
    a1.text(39, 1.35, "velocity Verlet", color=style.BLUE, fontsize=9, ha="right")
    a1.set_xlabel("time (units of 1/ω)"); a1.set_ylabel("energy E(t) / E(0)")
    a1.set_title("(a) first 40 time units", fontsize=10)
    a1.set_xlim(0, 40); a1.set_ylim(0, 8)
    dv = (out["Oscillator"] - 1) * 1e4
    late = t >= 475
    a2.plot(t[late], dv[late], color=style.BLUE, lw=1.6)
    a2.axhline(-6.25, color=style.INK3, lw=0.8, ls="--")
    a2.text(487.5, -7.1, "bound −(ωΔt)²/4 = −6.25 × 10⁻⁴", ha="center", va="top", fontsize=8.5, color=style.INK3)
    a2.set_xlabel("time (units of 1/ω)"); a2.set_ylabel("Verlet: [E(t)/E(0) − 1] × 10⁴")
    a2.set_title("(b) Verlet after 9 500 steps", fontsize=10)
    a2.set_xlim(475, 500); a2.set_ylim(-8.5, 1)
    style.save(fig, SLUG, "integrators")
    return out["Oscillator"].min() - 1, out["EulerOscillator"][-1]


# ---------------------------------------------------------------------------------------------
# 4. A list of Atom objects against one Atoms object holding arrays
# ---------------------------------------------------------------------------------------------
def aos_soa():
    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    ax.set_xlim(0, 72); ax.set_ylim(0, 36); ax.axis("off"); ax.set_aspect("equal")
    ax.text(1, 34.5, "a list of Atom objects", fontsize=10.5, fontweight="semibold", color=style.INK)
    ax.text(1, 32.3, "about 280 bytes per atom, scattered", fontsize=8.5, color=style.INK3)
    ax.text(40, 34.5, "one Atoms object holding arrays", fontsize=10.5, fontweight="semibold", color=style.INK)
    ax.text(40, 32.3, "32 bytes per atom, contiguous", fontsize=8.5, color=style.INK3)
    # left: list of pointers
    for i in range(4):
        ax.add_patch(Rectangle((1.5, 26 - i * 3), 4, 3, fc=style.TINT[style.BLUE], ec=style.INK3, lw=0.8))
        ax.add_patch(Circle((3.5, 27.5 - i * 3), 0.45, color=style.BLUE))
    ax.text(3.5, 30, "list", ha="center", fontsize=8.5, color=style.INK2)
    objs = [(9, 24.5), (21, 18), (9, 4), (21, 10)]
    for i, (x, y) in enumerate(objs):
        box(ax, x, y, 11, 6.2, "white", style.VIOLET, lw=1.0, r=0.6)
        ax.text(x + 0.8, y + 5.0, f"Atom {i}", fontsize=8.5, fontweight="semibold", color=style.VIOLET)
        ax.text(x + 0.8, y + 3.2, "element  mass", fontsize=8, color=style.INK2)
        ax.text(x + 0.8, y + 1.4, "position → [x, y, z]", fontsize=8, color=style.INK2)
        ax.add_patch(FancyArrowPatch((3.9, 27.5 - i * 3), (x, y + 3.1), arrowstyle="-|>", mutation_scale=8,
                                     color=style.BLUE, lw=1.0, shrinkA=0, shrinkB=1))
    # right: one object, three arrays
    box(ax, 40, 3, 31, 27.5, style.TINT[style.TEAL], style.TEAL, lw=1.2)
    ax.text(41.2, 28.2, "Atoms", fontsize=9.5, fontweight="semibold", color=style.TEAL)
    rows = [("symbols", ["O", "H", "H", "O"], style.INK2, 1),
            ("masses   float64", ["16.0", "1.01", "1.01", "16.0"], style.ORANGE, 1),
            ("positions   float64, shape (4, 3)", None, style.BLUE, 3)]
    y = 23.5
    for name, vals, c, ncol in rows:
        ax.text(41.2, y + 2.6, name, fontsize=8.5, color=style.INK2)
        if vals:
            for i, v in enumerate(vals):
                ax.add_patch(Rectangle((41.2 + i * 4.2, y - 1.2), 4.2, 3, fc="white", ec=c, lw=0.9))
                ax.text(43.3 + i * 4.2, y + 0.3, v, ha="center", va="center", fontsize=8, color=style.INK)
            y -= 7.2
        else:
            for i in range(4):
                for j in range(3):
                    ax.add_patch(Rectangle((41.2 + (3 * i + j) * 2.4, y - 1.2), 2.4, 3,
                                           fc=style.TINT[style.BLUE] if i % 2 == 0 else "white", ec=c, lw=0.9))
                    ax.text(42.4 + (3 * i + j) * 2.4, y + 0.3, "xyz"[j], ha="center", va="center", fontsize=8,
                            color=style.INK2)
            ax.text(41.2, y - 3.6, "one block of 4 × 3 × 8 = 96 bytes", fontsize=8, color=style.INK3)
    style.save(fig, SLUG, "aos-soa")


# ---------------------------------------------------------------------------------------------
# Cover: one class (a stamp) printing several instances
# ---------------------------------------------------------------------------------------------
def cover():
    def draw(ax):
        # the class: a blueprint card with three bars (attributes) and a round handle
        box(ax, 0.3, 0.75, 1.2, 1.6, style.VIOLET, style.INK, lw=2.4, r=0.12)
        for k in range(3):
            ax.add_patch(FancyBboxPatch((0.48, 1.85 - k * 0.38), 0.84 - 0.2 * k, 0.16,
                                        boxstyle="round,pad=0,rounding_size=0.06", fc="white", ec="none"))
        # instances: three copies in different colours, slightly fanned
        cols = [style.BLUE, style.TEAL, style.ORANGE]
        for i, c in enumerate(cols):
            x, y = 1.95 + i * 0.5, 1.5 - i * 0.42
            box(ax, x, y, 0.95, 1.15, c, style.INK, lw=2.2, r=0.1)
            for k in range(3):
                ax.add_patch(FancyBboxPatch((x + 0.13, y + 0.8 - k * 0.27), 0.69 - 0.15 * k, 0.11,
                                            boxstyle="round,pad=0,rounding_size=0.04", fc="white", ec="none"))
        ax.add_patch(FancyArrowPatch((1.56, 1.55), (1.92, 1.55), arrowstyle="-|>", mutation_scale=18,
                                     color=style.INK, lw=2.4))
    style.cover(SLUG, draw, bg=style.TINT[style.VIOLET])


if __name__ == "__main__":
    lookup()
    print("fd:", fd_error())
    print("integrators:", integrators())
    aos_soa()
    cover()
