"""Figures for content/learn/es-collective-variables.md."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla
from matplotlib.patches import FancyArrowPatch, Circle, Arc, Polygon
import style
plt = style.setup()
SLUG = "es-collective-variables"


def arrow(ax, p, q, color, lw=1.6, ms=10, z=5, st="-|>"):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle=st, mutation_scale=ms, color=color, lw=lw, shrinkA=0, shrinkB=0,
                                 zorder=z))


def atom(ax, p, col, r=0.17, z=4):
    ax.add_patch(Circle(p, r, fc=col, ec="white", lw=1.4, zorder=z))


# ---------------------------------------------------------------- 1. a catalogue of collective variables
def catalogue():
    fig, ax = plt.subplots(figsize=(7.2, 2.7))
    ax.set_xlim(0, 16.6); ax.set_ylim(-1.35, 3.2); ax.set_aspect("equal"); ax.axis("off")
    # distance
    a, b = np.array([0.6, 1.2]), np.array([3.0, 1.9])
    atom(ax, a, style.BLUE); atom(ax, b, style.BLUE)
    ax.annotate("", b, a, arrowprops=dict(arrowstyle="<->", color=style.INK2, lw=1.3, shrinkA=7, shrinkB=7))
    ax.text(1.7, 1.95, "r", fontsize=11, color=style.INK, style="italic")
    ax.text(1.8, -0.35, "distance", ha="center", fontsize=10, fontweight="semibold")
    ax.text(1.8, -0.95, "binding, bond breaking", ha="center", fontsize=8.5, color=style.INK2)
    # dihedral
    P = np.array([[4.6, 2.3], [5.3, 1.0], [6.5, 1.3], [7.1, 2.6]])
    ax.plot(P[:, 0], P[:, 1], color=style.INK3, lw=3, zorder=2, solid_capstyle="round")
    for i, p in enumerate(P): atom(ax, p, style.VIOLET if i in (1, 2) else style.TEAL)
    ax.add_patch(Arc((5.9, 1.15), 1.5, 1.5, theta1=20, theta2=160, color=style.ORANGE, lw=1.6, ls=(0, (3, 2))))
    ax.text(5.9, 2.05, "φ", fontsize=12, color=style.ORANGE, ha="center", style="italic")
    ax.text(5.85, -0.35, "dihedral angle", ha="center", fontsize=10, fontweight="semibold")
    ax.text(5.85, -0.95, "conformational change", ha="center", fontsize=8.5, color=style.INK2)
    # coordination number
    c = np.array([9.9, 1.2]); r0 = 1.15
    ax.add_patch(Circle(c, r0, fc=style.TINT[style.TEAL], ec=style.TEAL, lw=1.3, ls=(0, (4, 3)), zorder=1))
    for ang, rr in [(20, 0.75), (110, 0.8), (200, 0.7), (290, 0.85), (60, 1.5), (150, 1.5), (335, 1.5)]:
        t = np.radians(ang); p = c + rr * np.array([np.cos(t), np.sin(t)])
        atom(ax, p, style.TEAL if rr < r0 else style.INK3, r=0.14)
    atom(ax, c, style.PINK, r=0.19)
    ax.text(c[0] - 0.15, c[1] + 1.22, "r₀", fontsize=9.5, color=style.TEAL)
    ax.text(9.9, -0.35, "coordination number", ha="center", fontsize=10, fontweight="semibold")
    ax.text(9.9, -0.95, "4 neighbours inside r₀", ha="center", fontsize=8.5, color=style.INK2)
    # RMSD
    ref = np.array([[13.2, 0.7], [14.0, 1.6], [15.0, 1.3], [15.8, 2.2]])
    cur = ref + np.array([[0.0, 0.0], [0.15, 0.35], [0.35, 0.05], [0.25, 0.55]])
    ax.plot(ref[:, 0], ref[:, 1], color=style.INK3, lw=2.5, alpha=0.5, zorder=2)
    for p in ref: ax.add_patch(Circle(p, 0.16, fc="white", ec=style.INK3, lw=1.3, zorder=3))
    ax.plot(cur[:, 0], cur[:, 1], color=style.GOLD, lw=2.5, zorder=2)
    for p, q in zip(ref, cur):
        atom(ax, q, style.GOLD, r=0.15)
    ax.text(14.5, -0.35, "RMSD", ha="center", fontsize=10, fontweight="semibold")
    ax.text(14.5, -0.95, "distance from a reference", ha="center", fontsize=8.5, color=style.INK2)
    ax.text(12.7, 2.75, "open: reference", fontsize=8, color=style.INK3)
    style.save(fig, SLUG, "catalogue")


# ---------------------------------------------------------------- 2. switching functions
def switching():
    r = np.linspace(0.3, 2.5, 600)
    fig, (ax, bx) = plt.subplots(1, 2, figsize=style.WIDE, gridspec_kw=dict(wspace=0.32))
    ax.plot(r, (r < 1).astype(float), color=style.INK3, lw=1.4, ls=(0, (4, 3)))
    ax.text(1.06, 0.92, "hard cutoff", color=style.INK3, fontsize=9, va="top")
    for (n, m), col, lab in [((6, 12), style.BLUE, "n = 6, m = 12"), ((12, 24), style.ORANGE, "n = 12, m = 24")]:
        with np.errstate(invalid="ignore", divide="ignore"):
            s = (1 - r ** n) / (1 - r ** m)
        s[np.abs(r - 1) < 1e-9] = n / m
        ds = np.gradient(s, r)
        ax.plot(r, s, color=col); bx.plot(r, -ds, color=col)
        ax.text(1.5, 0.32 if n == 6 else 0.16, lab, color=col, fontsize=9, va="bottom")
    ax.plot([1.2], [1 / (1 + 1.2 ** 6)], "o", ms=6, color=style.BLUE, mec="white", mew=1.2)
    ax.annotate(f"r = 1.2 r₀: s = {1/(1+1.2**6):.2f}", (1.2, 1 / (1 + 1.2 ** 6)), xytext=(1.5, 0.6),
                fontsize=8.5, color=style.INK2, arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    ax.set_xlabel("distance r / r₀"); ax.set_ylabel("contribution s(r)")
    ax.set_title("A smooth count of one neighbour", loc="left", fontsize=10.5)
    ax.set_xlim(0.3, 2.5); ax.set_ylim(-0.03, 1.08)
    bx.set_xlabel("distance r / r₀"); bx.set_ylabel("−ds/dr  (per r₀)")
    bx.set_title("Its slope: what a bias pushes with", loc="left", fontsize=10.5)
    bx.set_xlim(0.3, 2.5); bx.set_ylim(0, 3.4)
    bx.text(1.55, 2.6, "the hard cutoff has an\ninfinite spike at r₀\nand zero force elsewhere", fontsize=8.5,
            color=style.INK3)
    style.save(fig, SLUG, "switching")


# ---------------------------------------------------------------- 3. Jacobian term in a distance profile
def jacobian():
    r = np.linspace(0.95, 3.5, 500)                   # r / sigma
    eps = 1.0                                         # epsilon in units of kT
    w = 4 * eps * (r ** -12 - r ** -6)
    rmin = 2 ** (1 / 6)
    J = -2 * np.log(r / rmin)
    F = w + J
    fig, ax = plt.subplots(figsize=style.WIDE)
    ax.axhline(0, color=style.LINE, lw=1)
    ax.plot(r, w, color=style.BLUE)
    ax.plot(r, J, color=style.INK3, lw=1.5, ls=(0, (4, 3)))
    ax.plot(r, F, color=style.ORANGE)
    ax.text(3.45, w[-1] + 0.12, "pair potential w(r) = U(r)", color=style.BLUE, ha="right", va="bottom", fontsize=9)
    ax.annotate("Jacobian only, −2kT ln r", (1.2, J[np.argmin(np.abs(r - 1.2))]), xytext=(1.3, 0.55),
                color=style.INK3, fontsize=9, arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    ax.text(3.45, F[-1] - 0.25, "F(r) = w(r) − 2kT ln r", color=style.ORANGE, ha="right", va="top", fontsize=9,
            fontweight="semibold")
    i1, i2 = np.argmin(np.abs(r - 1.5)), np.argmin(np.abs(r - 3.0))
    for ri in (1.5, 3.0):
        ax.plot([ri], [F[np.argmin(np.abs(r - ri))]], "o", ms=6, color=style.ORANGE, mec="white", mew=1.2, zorder=5)
    ax.text(1.03, -3.0, f"from 1.5σ to 3σ, w(r) rises by {w[i2]-w[i1]:.2f} kT but F(r) falls by "
            f"{F[i1]-F[i2]:.2f} kT:\nthe Jacobian term alone contributes −2kT ln 2 = −{2*np.log(2):.2f} kT",
            color=style.INK2, fontsize=8.5, va="center")
    ax.set_xlim(0.95, 3.5); ax.set_ylim(-3.6, 2.2)
    ax.set_xlabel("distance r / σ"); ax.set_ylabel("energy (kT)")
    ax.set_title("Lennard-Jones pair with ε = kT: the profile along r keeps falling", loc="left")
    style.save(fig, SLUG, "jacobian")


# ---------------------------------------------------------------- 4. committor test on a 2D landscape
def U2(x, y):
    return 3 * (x * x - 1) ** 2 + 2.5 * (y - 0.6 * x - 0.5 * (x * x - 1)) ** 2


def committor_grid(n=161, L=2.2):
    xs = np.linspace(-L, L, n); X, Y = np.meshgrid(xs, xs, indexing="ij")
    E = U2(X, Y)
    A = (X + 1) ** 2 + (Y - U2_valley(-1)) ** 2 < 0.25 ** 2
    B = (X - 1) ** 2 + (Y - U2_valley(1)) ** 2 < 0.25 ** 2
    idx = np.arange(n * n).reshape(n, n)
    rows, cols, vals = [], [], []
    diag = np.zeros(n * n)
    for (di, dj) in [(1, 0), (0, 1)]:
        i0 = idx[: n - di, : n - dj].ravel(); i1 = idx[di:, dj:].ravel()
        w = np.exp(-(E.ravel()[i0] + E.ravel()[i1]) / 2)
        rows += [i0, i1]; cols += [i1, i0]; vals += [w, w]
        np.add.at(diag, i0, w); np.add.at(diag, i1, w)
    M = sp.csr_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(n * n, n * n))
    M = M - sp.diags(diag)
    fixed = (A | B).ravel(); free = ~fixed
    qf = np.zeros(n * n); qf[B.ravel()] = 1.0
    rhs = -M[free][:, fixed] @ qf[fixed]
    q = qf.copy(); q[free] = spla.spsolve(M[free][:, free].tocsc(), rhs)
    return xs, X, Y, E, q.reshape(n, n), A, B


def U2_valley(x):
    return 0.6 * x + 0.5 * (x * x - 1)


def committor():
    xs, X, Y, E, q, A, B = committor_grid()
    p = np.exp(-E)
    cvs = [("s₁ = x", X, style.BLUE), ("s₂ = y", Y, style.PINK)]
    fig = plt.figure(figsize=(7.2, 3.6))
    ax = fig.add_axes([0.0, 0.08, 0.42, 0.82]); bx = fig.add_axes([0.56, 0.16, 0.42, 0.7])
    cm = plt.matplotlib.colors.LinearSegmentedColormap.from_list("t", [style.TINT[style.BLUE], "white"])
    cf = ax.contourf(X, Y, np.minimum(E, 10), levels=np.arange(0, 10.5, 1), cmap=cm); cf.set_rasterized(True)
    ax.contour(X, Y, E, levels=np.arange(0, 10.5, 1), colors=style.INK3, linewidths=0.4, alpha=0.5)
    ax.contour(X, Y, q, levels=[0.1, 0.5, 0.9], colors=[style.INK2], linewidths=[1.0, 2.2, 1.0])
    ax.text(2.15, -2.15, "black: committor 0.1, ½ (thick), 0.9", fontsize=8, color=style.INK2, ha="right")
    out = {}
    for name, S, col in cvs:
        H, sv = np.histogram(S, bins=80, weights=p)
        F = -np.log(H + 1e-300); sc = 0.5 * (sv[:-1] + sv[1:])
        # barrier top between the two basins
        sA, sB = S[A].mean(), S[B].mean()
        win = (sc > min(sA, sB)) & (sc < max(sA, sB))
        st = sc[win][np.argmax(F[win])]
        sl = np.abs(S - st) < 0.03
        hist, edges = np.histogram(q[sl], bins=20, range=(0, 1), weights=p[sl])
        hist = hist / hist.sum()
        out[name] = (st, hist, edges)
        if S is X:
            ax.plot([st, st], [-2.2, 2.2], color=col, lw=2.0)
            ax.text(st + 0.08, 1.85, name, color=col, fontsize=9.5, fontweight="semibold")
        else:
            ax.plot([-2.2, 2.2], [st, st], color=col, lw=2.0)
            ax.text(-2.1, st + 0.08, name, color=col, fontsize=9.5, fontweight="semibold")
    ax.text(-1.0, U2_valley(-1) - 0.45, "A", fontsize=11, fontweight="semibold", ha="center", color=style.INK)
    ax.text(1.0, U2_valley(1) + 0.3, "B", fontsize=11, fontweight="semibold", ha="center", color=style.INK)
    ax.set_xlim(-2.2, 2.2); ax.set_ylim(-2.2, 2.2); ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("Landscape, committor contours and two CVs", loc="left", fontsize=10, pad=2)
    w = 0.05
    for (name, S, col), off in zip(cvs, (-w / 2, w / 2)):
        st, hist, edges = out[name]
        c = 0.5 * (edges[:-1] + edges[1:])
        bx.bar(c + off, hist, width=w, color=col, alpha=0.9, lw=0)
        print(f"  {name}: s‡ = {st:.2f}; weight with 0.3<pB<0.7 = {hist[(c>0.3)&(c<0.7)].sum():.2f}")
    bx.text(0.42, max(out["s₁ = x"][1]) + 0.04, "s₁: peaked near ½", color=style.BLUE, fontsize=9, ha="center",
            va="bottom")
    bx.text(0.95, 0.62, "s₂: nearly all already\ncommitted to B", color=style.PINK, fontsize=9, ha="right",
            va="center")
    bx.set_xlim(-0.03, 1.03); bx.set_xlabel(r"committor $p_B$ of configurations at s = s‡")
    bx.set_ylabel("fraction of configurations")
    bx.set_title("The committor test", loc="left", fontsize=10)
    style.save(fig, SLUG, "committor")


# ---------------------------------------------------------------- cover: a 2D shape and its 1D shadow
def cover():
    def draw(ax):
        th = np.linspace(0, 2 * np.pi, 200)
        for cx, cy, col in [(1.35, 2.15, style.BLUE), (2.65, 1.75, style.TEAL)]:
            ax.add_patch(Polygon(np.c_[cx + 0.55 * np.cos(th), cy + 0.38 * np.sin(th)], fc=col, ec="white", lw=2.5,
                                 zorder=3))
        ax.plot([0.3, 3.7], [0.62, 0.62], color=style.INK, lw=3, solid_capstyle="round", zorder=2)
        xs = np.linspace(0.3, 3.7, 300)
        for cx, col in [(1.35, style.BLUE), (2.65, style.TEAL)]:
            prof = 0.42 * np.exp(-(xs - cx) ** 2 / (2 * 0.24 ** 2))
            ax.fill_between(xs, 0.62 - prof, 0.62, color=col, lw=0, zorder=1)
        for x in np.linspace(0.75, 3.25, 8):
            ax.plot([x, x], [2.85, 0.75], color=style.VIOLET, lw=1.6, ls=(0, (2, 3)), zorder=0, alpha=0.8)
    style.cover(SLUG, draw, bg=style.TINT[style.VIOLET])


if __name__ == "__main__":
    catalogue(); switching(); jacobian(); committor(); cover()
