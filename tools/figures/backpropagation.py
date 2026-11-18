"""Figures for content/learn/backpropagation.md.  Run: python3 tools/figures/backpropagation.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import Circle, FancyArrowPatch
import style
plt = style.setup()
SLUG = "backpropagation"
sig = lambda z: 1 / (1 + np.exp(-z))

# the chapter's worked example: two inputs, two sigmoid hidden neurons, a linear output, squared error
X = np.array([1.0, 0.5]); Y = 1.0
W = np.array([[0.5, -0.3], [0.8, 0.2]]); B = np.array([0.1, -0.1]); V = np.array([1.2, -0.7]); C = 0.2


def worked_pass():
    z = W @ X + B; h = sig(z); yhat = V @ h + C; L = (yhat - Y) ** 2
    gy = 2 * (yhat - Y); gh = gy * V; gz = gh * h * (1 - h)
    return dict(z=z, h=h, yhat=yhat, L=L, gy=gy, gh=gh, gz=gz, gW=np.outer(gz, X), gv=gy * h, gx=W.T @ gz)


def loss_and_grad(t):
    Wt, bt, vt, ct = t[:4].reshape(2, 2), t[4:6], t[6:8], t[8]
    h = sig(Wt @ X + bt); yhat = vt @ h + ct; gy = 2 * (yhat - Y); gz = gy * vt * h * (1 - h)
    return (yhat - Y) ** 2, np.concatenate([np.outer(gz, X).ravel(), gz, gy * h, [gy]])


def worked_network():
    """The 2-2-1 network with every forward value (blue) and backward gradient (pink)."""
    r = worked_pass()
    f4 = lambda v: f"{v:+.4f}".replace("-", "−")
    fig, ax = plt.subplots(figsize=(7.2, 4.3))
    ax.set_xlim(0, 16); ax.set_ylim(-0.1, 10.0); ax.set_aspect("equal"); ax.axis("off")
    P = {"x1": (1.3, 6.6), "x2": (1.3, 2.4), "h1": (7.0, 6.6), "h2": (7.0, 2.4), "y": (11.6, 4.5), "L": (14.6, 4.5)}
    rad = 0.55
    box = dict(fc="white", ec="none", pad=1.0, alpha=0.95)
    lab = lambda xy, s_, col, **k: ax.text(*xy, s_, fontsize=8.5, color=col, ha="center", va="center", **k)

    def edge(a_, b_, w, frac, dy, name):
        (x0, y0), (x1, y1) = P[a_], P[b_]
        col = style.TEAL if w > 0 else style.PINK
        ax.add_patch(FancyArrowPatch((x0, y0), (x1, y1), arrowstyle="-", color=col, lw=1 + 2.2 * abs(w), alpha=0.7,
                                     shrinkA=16, shrinkB=16, zorder=1))
        ax.text(x0 + frac * (x1 - x0), y0 + frac * (y1 - y0) + dy, f"{name} = {w:g}".replace("-", "−"), fontsize=8.5, color=col,
                ha="center", va="center", bbox=box, zorder=3)

    edge("x1", "h1", W[0, 0], 0.5, 0.3, "W₁₁"); edge("x2", "h2", W[1, 1], 0.5, -0.3, "W₂₂")
    edge("x1", "h2", W[1, 0], 0.22, 0, "W₂₁"); edge("x2", "h1", W[0, 1], 0.22, 0, "W₁₂")
    edge("h1", "y", V[0], 0.45, 0.4, "v₁"); edge("h2", "y", V[1], 0.45, -0.4, "v₂")
    ax.add_patch(FancyArrowPatch(P["y"], P["L"], arrowstyle="-|>", mutation_scale=12, color=style.INK3, lw=1.4, shrinkA=16, shrinkB=16))

    for k, (x, y) in P.items():
        col = style.BLUE if k[0] == "x" else style.GOLD if k[0] == "h" else style.ORANGE if k == "y" else style.PINK
        ax.add_patch(Circle((x, y), rad, fc="white", ec=col, lw=2, zorder=4))
        name = {"x1": "$x_1$", "x2": "$x_2$", "h1": "$h_1$", "h2": "$h_2$", "y": "$\\hat y$", "L": "$L$"}[k]
        ax.text(x, y, name, ha="center", va="center", fontsize=11, color=col, zorder=5)
    # top row of nodes: labels above; bottom row: labels below
    for k, i, up in [("x1", 0, 1), ("x2", 1, -1)]:
        x, y = P[k]
        rows = [(f"{X[i]:g}", style.BLUE), (f"∂L/∂x = {f4(r['gx'][i])}", style.PINK)]
        for j, (t, c) in enumerate(rows if up < 0 else rows[::-1]):
            lab((x, y + up * (0.95 + 0.42 * j)), t, c)
    for k, i, up in [("h1", 0, 1), ("h2", 1, -1)]:
        x, y = P[k]
        rows = [(f"b = {B[i]:g}".replace("-", "−"), style.VIOLET), (f"z = {r['z'][i]:.2f},   h = {r['h'][i]:.4f}", style.BLUE),
                (f"∂L/∂h = {f4(r['gh'][i])}", style.PINK), (f"∂L/∂z = ∂L/∂b = {f4(r['gz'][i])}", style.PINK)]
        for j, (t, c) in enumerate(rows if up < 0 else rows[::-1]):
            lab((x, y + up * (0.95 + 0.42 * j)), t, c)
    x, y = P["y"]
    lab((x + 0.3, y + 0.95), f"ŷ = {r['yhat']:.4f}", style.BLUE); lab((x + 0.3, y + 1.37), "c = 0.2", style.VIOLET)
    lab((x + 0.3, y - 0.95), f"∂L/∂ŷ = ∂L/∂c", style.PINK); lab((x + 0.3, y - 1.37), f"= {f4(r['gy'])}", style.PINK)
    x, y = P["L"]
    lab((x, y + 0.95), f"L = {r['L']:.4f}", style.BLUE); lab((x, y + 1.37), "target y = 1", style.INK2)
    lab((x, y - 0.95), "∂L/∂L = 1", style.PINK)
    ax.text(0.1, 9.95, "forward values", fontsize=9, color=style.BLUE, fontweight="semibold", va="top")
    ax.text(4.3, 9.95, "backward gradients ∂L/∂(·)", fontsize=9, color=style.PINK, fontweight="semibold", va="top")
    ax.text(10.6, 9.95, "weights and biases", fontsize=9, color=style.TEAL, fontweight="semibold", va="top")
    ax.add_patch(FancyArrowPatch((15.2, 1.2), (11.2, 1.2), arrowstyle="-|>", mutation_scale=14, color=style.PINK, lw=1.8))
    ax.text(13.2, 1.55, "backward pass", fontsize=9, color=style.PINK, ha="center")
    ax.add_patch(FancyArrowPatch((11.2, 7.8), (15.2, 7.8), arrowstyle="-|>", mutation_scale=14, color=style.BLUE, lw=1.8))
    ax.text(13.2, 8.15, "forward pass", fontsize=9, color=style.BLUE, ha="center")
    style.save(fig, SLUG, "worked-network")
    return r


def fd_error():
    """Relative error of one-sided and central finite differences for dL/dW11 of the worked example."""
    L0, g = loss_and_grad(np.array([*W.ravel(), *B, *V, C]))
    t = np.array([*W.ravel(), *B, *V, C]); e = np.eye(9)[0]
    eps = np.logspace(-13, -0.5, 100)
    fwd = np.array([abs((loss_and_grad(t + h * e)[0] - L0) / h - g[0]) / abs(g[0]) for h in eps])
    cen = np.array([abs((loss_and_grad(t + h * e)[0] - loss_and_grad(t - h * e)[0]) / (2 * h) - g[0]) / abs(g[0]) for h in eps])
    fig, ax = plt.subplots(figsize=(7.2, 3.3))
    ax.axvspan(1e-6, 1e-4, color=style.TINT[style.TEAL], zorder=0)
    ax.text(1e-5, 3e-1, "recommended\n$10^{-6}$ to $10^{-4}$", ha="center", va="top", fontsize=8.5, color=style.TEAL)
    ax.loglog(eps, np.maximum(fwd, 1e-17), color=style.ORANGE, lw=1.6)
    ax.loglog(eps, np.maximum(cen, 1e-17), color=style.BLUE, lw=1.6)
    ax.text(1e-3, 2e-6, "one-sided: error $\\propto \\epsilon$", color=style.ORANGE, fontsize=9, ha="left")
    ax.text(3e-3, 3e-10, "central: error $\\propto \\epsilon^2$", color=style.BLUE, fontsize=9, ha="left")
    ax.text(2e-12, 2e-3, "rounding error $\\propto 1/\\epsilon$\ntakes over", color=style.INK2, fontsize=9, ha="left")
    i = np.argmin(cen)
    ax.plot(eps[i], cen[i], "o", ms=5, color=style.BLUE)
    m, ex = f"{cen[i]:.1e}".split("e")
    ax.annotate(f"best: {m}×10$^{{{int(ex)}}}$", (eps[i], cen[i]),
                xytext=(1e-9, 1e-11), fontsize=8.5, color=style.BLUE, va="center", ha="center",
                arrowprops=dict(arrowstyle="-", color=style.BLUE, lw=0.8, shrinkB=4))
    ax.set_xlim(1e-13, 0.3); ax.set_ylim(1e-12, 1)
    ax.set_xlabel("step size $\\epsilon$"); ax.set_ylabel("relative error in $\\partial L/\\partial W_{11}$")
    style.save(fig, SLUG, "fd-error")
    return eps[i], cen[i]


def vanishing():
    """(a) the idealised chain of the text; (b) a measured 30-layer network of width 100."""
    fig, (a, b) = plt.subplots(1, 2, figsize=(7.2, 3.2), gridspec_kw=dict(wspace=0.32))
    d = np.arange(0, 31)
    for f, col, txt, xx, yy in [(0.25, style.BLUE, "×0.25 per layer\n(sigmoid at best)", 1, 1e-15), (1.0, style.TEAL, "×1 (ReLU, residual)", 14, 8),
                                (1.5, style.PINK, "×1.5 per layer", 6, 3e3)]:
        a.semilogy(d, f ** d, color=col)
        a.text(xx, yy, txt, color=col, fontsize=8.5, ha="left", va="bottom")
    a.axhline(np.finfo(np.float32).eps, color=style.INK3, lw=0.8, ls=(0, (3, 2)))
    a.text(30, np.finfo(np.float32).eps * 3, "float32 precision, 1.2×10$^{-7}$", color=style.INK3, fontsize=8.5, ha="right")
    a.plot([10, 20], [0.25 ** 10, 0.25 ** 20], "o", ms=4.5, color=style.BLUE)
    a.set_xlim(0, 30); a.set_ylim(1e-19, 1e7)
    a.set_xlabel("layers the gradient passes back through"); a.set_ylabel("gradient relative to the output")
    a.set_title("idealised chain")

    rng = np.random.default_rng(0)
    n, depth, batch = 100, 30, 64
    acts = {"sigmoid": (sig, lambda z: sig(z) * (1 - sig(z)), 1.0, style.BLUE),
            "tanh": (np.tanh, lambda z: 1 - np.tanh(z) ** 2, 1.0, style.TEAL),
            "ReLU": (lambda z: np.maximum(z, 0), lambda z: (z > 0) * 1.0, 2.0, style.ORANGE)}
    out = {}
    for name, (f, df, gain, col) in acts.items():
        Ws = [rng.normal(0, np.sqrt(gain / n), (n, n)) for _ in range(depth)]
        h = rng.normal(size=(n, batch)); zs = []
        for Wl in Ws:
            z = Wl @ h; zs.append(z); h = f(z)
        g = rng.normal(size=(n, batch)); norms = []
        for Wl, z in zip(Ws[::-1], zs[::-1]):
            gz = g * df(z); norms.append(np.linalg.norm(gz)); g = Wl.T @ gz
        norms = np.array(norms[::-1]) / norms[0]
        out[name] = norms
        b.semilogy(np.arange(1, depth + 1), norms, color=col, marker="o", ms=3)
    b.text(15, out["sigmoid"][14] * 30, "sigmoid", color=style.BLUE, fontsize=9, ha="right")
    b.text(4, out["tanh"][3] / 40, "tanh", color=style.TEAL, fontsize=9)
    b.text(4, out["ReLU"][3] * 8, "ReLU, He initialisation", color=style.ORANGE, fontsize=9)
    b.set_xlim(0, 31); b.set_ylim(1e-19, 1e7)
    b.set_xlabel("layer (1 = nearest the input)"); b.set_ylabel("gradient norm relative to layer 30")
    b.set_title("measured: 30 layers × 100 neurons")
    style.save(fig, SLUG, "vanishing")
    return {k: v[0] for k, v in out.items()}


def cover():
    def draw(ax):
        xs = [0.6, 1.55, 2.5, 3.45]
        for x0, x1 in zip(xs[:-1], xs[1:]):
            ax.add_patch(FancyArrowPatch((x0, 1.85), (x1, 1.85), connectionstyle="arc3,rad=-0.55", arrowstyle="-|>",
                                         mutation_scale=20, color=style.BLUE, lw=5, shrinkA=6, shrinkB=6))
            ax.add_patch(FancyArrowPatch((x1, 1.15), (x0, 1.15), connectionstyle="arc3,rad=-0.55", arrowstyle="-|>",
                                         mutation_scale=20, color=style.PINK, lw=5, shrinkA=6, shrinkB=6))
        ax.plot(xs, [1.5] * 4, color=style.INK2, lw=4, zorder=2)
        for i, x in enumerate(xs):
            ax.add_patch(Circle((x, 1.5), 0.3, color=style.GOLD if i < 3 else style.PINK, zorder=3))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    r = worked_network()
    print("input gradient", r["gx"].round(4))
    print("best central difference: eps %.1e, rel. error %.1e" % fd_error())
    print("layer-1 gradient relative to layer 30:", {k: f"{v:.1e}" for k, v in vanishing().items()})
    cover()
