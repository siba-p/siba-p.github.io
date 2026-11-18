"""Figures for content/learn/es-landscapes.md (energy landscapes and transition states)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy.optimize import root
from matplotlib.patches import FancyArrowPatch, Polygon, Circle
import style
plt = style.setup()
SLUG = "es-landscapes"
KB = 8.617333e-5          # Boltzmann constant in eV/K

# ---------------------------------------------------------------- Muller-Brown surface (same as the widget)
MA = np.array([-200, -100, -170, 15.]); Ma = np.array([-1, -1, -6.5, 0.7]); Mb = np.array([0, 0, 11, 0.6])
Mc = np.array([-10, -10, -6.5, 0.7]); MX = np.array([1, 0, -0.5, -1.]); MY = np.array([0, 0.5, 1.5, 1.])


def mb(x, y):
    x = np.asarray(x)[..., None]; y = np.asarray(y)[..., None]
    dx, dy = x - MX, y - MY
    return np.sum(MA * np.exp(Ma * dx * dx + Mb * dx * dy + Mc * dy * dy), axis=-1)


def mb_grad(p):
    dx, dy = p[0] - MX, p[1] - MY
    e = MA * np.exp(Ma * dx * dx + Mb * dx * dy + Mc * dy * dy)
    return np.array([np.sum(e * (2 * Ma * dx + Mb * dy)), np.sum(e * (Mb * dx + 2 * Mc * dy))])


def mb_hess(p, h=1e-5):
    return np.array([(mb_grad(p + h * e) - mb_grad(p - h * e)) / (2 * h) for e in np.eye(2)])


def arrow(ax, p, q, color, lw=2.0, ms=11, ls="-", z=5):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=ms, color=color, lw=lw, linestyle=ls,
                                 shrinkA=0, shrinkB=0, zorder=z))


# ---------------------------------------------------------------- 1. waiting time against barrier height
def waiting():
    nu = 1e13                                              # attempt frequency, s^-1
    E = np.linspace(0, 1.3, 400)
    fig, ax = plt.subplots(figsize=style.WIDE)
    refs = [(1e-15, "one MD time step (1 fs)"), (1e-6, "a long MD run (1 μs)"), (1.0, "one second"),
            (86400.0, "one day"), (3.156e7, "one year")]
    for t, lab in refs:
        ax.axhline(np.log10(t), color=style.LINE, lw=1.0, zorder=0)
        ax.text(0.012, np.log10(t) + 0.25, lab, ha="left", va="bottom", fontsize=8.5, color=style.INK3)
    for T, col, xl in [(300, style.BLUE, 0.80), (600, style.ORANGE, 1.08)]:
        tau = np.exp(E / (KB * T)) / nu
        ax.plot(E, np.log10(tau), color=col, lw=2.2)
        yl = np.log10(np.exp(xl / (KB * T)) / nu)
        ax.text(xl + 0.025, yl - 0.2, f"{T} K", color=col, fontsize=10, fontweight="semibold", va="top")
    # MD reach at 300 K
    Ereach = KB * 300 * np.log(1e-6 * nu)
    ax.axvspan(0, Ereach, color=style.TINT[style.TEAL], zorder=-1, lw=0)
    ax.annotate(f"at 300 K a 1 μs run can expect to see\nbarriers up to about {Ereach:.2f} eV", (Ereach, -6),
                xytext=(0.62, -12.2), ha="left", va="center", fontsize=9, color=style.TEAL,
                arrowprops=dict(arrowstyle="-|>", color=style.TEAL, lw=1.2, shrinkA=2, shrinkB=3))
    for e0 in (0.5, 1.0):
        t0 = np.log10(np.exp(e0 / (KB * 300)) / nu)
        ax.plot([e0], [t0], "o", ms=6, color=style.BLUE, mec="white", mew=1.2, zorder=6)
        lab = {0.5: "0.5 eV: 25 μs", 1.0: "1 eV: 1.7 hours"}[e0]
        ax.annotate(lab, (e0, t0), xytext=(-12, 10), textcoords="offset points", ha="right", fontsize=9,
                    color=style.INK2)
    ax.set_xlim(0, 1.3); ax.set_ylim(-15.5, 9.2)
    ax.set_xlabel("barrier height ΔE (eV)")
    ax.set_ylabel("mean waiting time (log₁₀ s)")
    ax.set_yticks([-15, -12, -9, -6, -3, 0, 3, 6, 9])
    ax.set_title("Mean waiting time for one crossing, attempt frequency 10¹³ s⁻¹")
    style.save(fig, SLUG, "waiting")
    print(f"  MD reach (1 us) at 300 K: {Ereach:.3f} eV; decade per {KB*300*np.log(10):.4f} eV")
    for e0 in (0.5, 0.78, 1.0):
        print(f"  tau({e0} eV, 300 K) = {np.exp(e0/(KB*300))/nu:.3g} s; 600 K: {np.exp(e0/(KB*600))/nu:.3g} s")


# ---------------------------------------------------------------- 2. stationary points and the Hessian
def stationary():
    guesses = [(-0.56, 1.44), (0.62, 0.03), (-0.05, 0.47), (-0.82, 0.62), (0.21, 0.29)]
    pts = []
    for g in guesses:
        s = root(mb_grad, g, jac=mb_hess).x
        w, v = np.linalg.eigh(mb_hess(s))
        pts.append((s, float(mb(s[0], s[1])), w, v))
    fig = plt.figure(figsize=(7.2, 3.7))
    ax = fig.add_axes([0.0, 0.0, 0.54, 0.88])
    bx = fig.add_axes([0.66, 0.13, 0.33, 0.72])
    xs = np.linspace(-1.5, 1.1, 130); ys = np.linspace(-0.4, 2.0, 120)
    X, Y = np.meshgrid(xs, ys); Z = mb(X, Y)
    lev = np.arange(-150, 60, 15)
    cf = ax.contourf(X, Y, np.minimum(Z, 60), levels=lev, cmap=plt.matplotlib.colors.LinearSegmentedColormap.from_list(
        "t", [style.TINT[style.BLUE], "white"]), extend="max")
    cf.set_rasterized(True)
    ax.contour(X, Y, np.minimum(Z, 60), levels=lev, colors=style.INK3, linewidths=0.5, alpha=0.6)
    ax.set_xlim(-1.5, 1.1); ax.set_ylim(-0.4, 2.0); ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("Müller–Brown surface: five stationary points", loc="left", pad=6)
    offs = {0: (10, 4, "left"), 1: (8, -14, "left"), 2: (8, 9, "left"), 3: (-10, -18, "right"), 4: (10, -16, "left")}
    for i, (s, e, w, v) in enumerate(pts):
        is_saddle = w[0] < 0
        if is_saddle:
            ax.plot(*s, marker="D", ms=8, color=style.GOLD, mec="white", mew=1.2, zorder=6)
            for sign in (1, -1):
                arrow(ax, s, s + sign * 0.24 * v[:, 0], style.PINK, lw=1.8, ms=9)
                arrow(ax, s, s + sign * 0.13 * v[:, 1], style.BLUE, lw=1.8, ms=9)
        else:
            ax.plot(*s, marker="o", ms=8, color=style.TEAL, mec="white", mew=1.2, zorder=6)
        sig = "(−, +)" if is_saddle else "(+, +)"
        dxo, dyo, ha = offs[i]
        ax.annotate(f"−{abs(e):.1f}  {sig}", s, xytext=(dxo, dyo), textcoords="offset points", ha=ha, fontsize=8.5,
                    color=style.INK, zorder=7, bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none", alpha=0.85))
    ax.text(-1.45, -0.35, "(signs of the two Hessian eigenvalues)", fontsize=8, color=style.INK3)
    s, e, w, v = pts[3]
    t = np.linspace(-0.22, 0.22, 200)
    cut1 = np.array([mb(*(s + ti * v[:, 0])) for ti in t]) - e
    cut2 = np.array([mb(*(s + ti * v[:, 1])) for ti in t]) - e
    bx.axhline(0, color=style.LINE, lw=1)
    bx.plot(t, cut1, color=style.PINK); bx.plot(t, cut2, color=style.BLUE)
    bx.text(0.0, -13, "along v₁: a maximum\n(λ₁ < 0, downhill both ways)", color=style.PINK, fontsize=8.5, ha="center",
            va="top")
    bx.text(0.0, 17, "along v₂: a minimum\n(λ₂ > 0)", color=style.BLUE, fontsize=8.5, ha="center", va="bottom")
    bx.set_xlim(-0.22, 0.22); bx.set_ylim(-34, 34)
    bx.set_xlabel("displacement from the saddle")
    bx.set_ylabel("U − U(saddle)")
    bx.set_title("Two cuts through the saddle at −40.7", fontsize=10)
    plt.rcParams["savefig.dpi"] = 200
    style.save(fig, SLUG, "stationary")
    for s, e, w, v in pts:
        print(f"  stationary point {np.round(s, 3)}  U = {e:.2f}  Hessian eigenvalues {np.round(w, 0)}")


# ---------------------------------------------------------------- 3. forces on a band (computed on a toy surface)
def toy(p):        # a curved valley y = 0.3 x^2 with a barrier at x = 0
    x, y = p
    return 6 * (y - 0.3 * x * x) ** 2 + 1.2 * np.exp(-x * x / 0.6)


def toy_grad(p, h=1e-6):
    return np.array([(toy(p + h * e) - toy(p - h * e)) / (2 * h) for e in np.eye(2)])


def nebforces():
    """Zoom on one image of an unrelaxed band and decompose the forces it feels."""
    xs = np.linspace(-0.4, 2.6, 160); ys = np.linspace(-0.2, 2.6, 150)
    X, Y = np.meshgrid(xs, ys); Z = toy(np.array([X, Y]))
    bx_ = np.array([-0.3, 0.45, 1.05, 1.85, 2.5])               # uneven spacing on purpose
    band = np.array([bx_, 0.12 * bx_ * bx_ + 0.78]).T
    i, k = 2, 16.0
    Ri = band[i]
    tau = band[i + 1] - band[i - 1]; tau /= np.linalg.norm(tau)
    nrm = np.array([-tau[1], tau[0]])
    F = -toy_grad(Ri)
    Fpar = (F @ tau) * tau; Fperp = F - Fpar
    Fs = k * (band[i + 1] - Ri) + k * (band[i - 1] - Ri)
    Fs_par = (Fs @ tau) * tau; Fs_perp = Fs - Fs_par
    Fs_neb = k * (np.linalg.norm(band[i + 1] - Ri) - np.linalg.norm(Ri - band[i - 1])) * tau
    sc = 0.075
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.9))
    for ax in axs:
        ax.contour(X, Y, Z, levels=np.linspace(0.3, 9, 11), colors=style.INK3, linewidths=0.5, alpha=0.5)
        ax.plot(xs, 0.3 * xs * xs, color=style.TEAL, lw=1.6, ls=(0, (4, 3)))
        ax.plot(band[:, 0], band[:, 1], color=style.INK3, lw=1.0, zorder=3)
        ax.plot(band[:, 0], band[:, 1], "o", ms=7, color=style.INK2, mec="white", mew=1.0, zorder=4)
        ax.plot(*Ri, "o", ms=9, color=style.INK, mec="white", mew=1.2, zorder=6)
        ax.set_xlim(-0.35, 2.55); ax.set_ylim(-0.15, 2.45); ax.set_aspect("equal"); ax.axis("off")
        ax.text(2.5, 1.0, "valley floor\n(the MEP)", fontsize=8.5, color=style.TEAL, ha="right", va="top")
    a0, a1 = axs
    a0.set_title("Plain elastic band: full forces", loc="left", pad=4)
    a1.set_title("Nudged elastic band: projected forces", loc="left", pad=4)
    lab = dict(fontsize=8.5, va="center")
    arrow(a0, Ri, Ri + sc * F, style.BLUE, lw=2.2)
    a0.text(*(Ri + sc * F + [0.06, 0.0]), r"true force $-\nabla U$", color=style.BLUE, **lab)
    arrow(a0, Ri, Ri + sc * Fs, style.ORANGE, lw=2.2)
    a0.text(*(Ri + sc * Fs + [-0.06, 0.06]), "spring force", color=style.ORANGE, ha="right", **lab)
    a0.text(-0.3, 2.3, "springs pull the band straight\nand the potential drags images\ndownhill along it",
            fontsize=8.5, color=style.INK2, va="top")
    # NEB
    arrow(a1, Ri, Ri + sc * F, style.INK3, lw=1.2, ls=(0, (2, 2)), ms=8, z=4)
    arrow(a1, Ri, Ri + sc * Fs, style.INK3, lw=1.2, ls=(0, (2, 2)), ms=8, z=4)
    arrow(a1, Ri, Ri + sc * Fperp, style.BLUE, lw=2.4)
    a1.text(*(Ri + sc * Fperp + [0.07, -0.02]), r"$-\nabla U$, perpendicular" + "\npart: bends the band", color=style.BLUE, **lab)
    arrow(a1, Ri, Ri + sc * Fs_neb, style.ORANGE, lw=2.4)
    a1.text(*(Ri + sc * Fs_neb + [-0.25, 0.42]), "spring, parallel part:\nspaces the images", color=style.ORANGE,
            ha="center", **lab)
    a1.annotate("", Ri - 0.42 * tau, Ri + 0.42 * tau,
                arrowprops=dict(arrowstyle="-", color=style.VIOLET, lw=1.4, shrinkA=0, shrinkB=0))
    a1.text(*(Ri - 0.45 * tau + [0.0, -0.1]), r"$\hat{\tau}$", color=style.VIOLET, fontsize=10, ha="center", va="top")
    a1.text(-0.3, 2.3, "grey dotted: the parts NEB throws away", fontsize=8.5, color=style.INK2, va="top")
    fig.subplots_adjust(wspace=0.06)
    style.save(fig, SLUG, "nebforces")
    print("  F =", np.round(F, 2), " F_perp =", np.round(Fperp, 2), " spring =", np.round(Fs, 2),
          " NEB spring =", np.round(Fs_neb, 2))


# ---------------------------------------------------------------- 4. narrow pass versus wide pass
def entropy():
    """U = E0 (x^2-1)^2 + k(x) y^2 / 2, with k = kw in the wells and kb at the pass.
    Integrating out y gives F(x) = U(x, 0) + (kT/2) ln(k(x)/kw); with ln k(x) interpolated by b(x) = (1-x^2)^2
    the barrier becomes E0 + (kT/2) ln(kb/kw) exactly."""
    E0, kw = 5.0, 4.0
    cases = [("narrow pass", 40.0, style.PINK), ("wide pass", 0.4, style.TEAL)]
    bump = lambda x: np.where(np.abs(x) < 1, (1 - x * x) ** 2, 0.0)
    kx = lambda x, kb: kw * (kb / kw) ** bump(x)
    fig = plt.figure(figsize=(7.2, 5.0))
    gs = fig.add_gridspec(2, 2, height_ratios=[1.0, 1.15], hspace=0.38, wspace=0.12)
    xs = np.linspace(-1.6, 1.6, 90); ys = np.linspace(-2.2, 2.2, 80)
    X, Y = np.meshgrid(xs, ys)
    cm = plt.matplotlib.colors.LinearSegmentedColormap.from_list("t", [style.TINT[style.BLUE], "white"])
    for j, (name, kb, col) in enumerate(cases):
        ax = fig.add_subplot(gs[0, j])
        Z = E0 * (X * X - 1) ** 2 + 0.5 * kx(X, kb) * Y * Y
        lev = np.arange(0, 12.1, 1.0)
        cf = ax.contourf(X, Y, np.minimum(Z, 12), levels=lev, cmap=cm); cf.set_rasterized(True)
        ax.contour(X, Y, Z, levels=lev, colors=style.INK3, linewidths=0.5, alpha=0.6)
        ax.contour(X, Y, Z, levels=[E0 + 1.0], colors=col, linewidths=1.8)
        ax.plot([0], [0], marker="D", ms=7, color=style.GOLD, mec="white", mew=1.0)
        ax.set_aspect("equal"); ax.set_xticks([]); ax.set_yticks([])
        for sp in ax.spines.values(): sp.set_visible(False)
        ax.set_title(f"{name}: saddle at {E0:.0f} kT", loc="left", fontsize=10, color=col, pad=4)
    ax = fig.add_subplot(gs[1, :])
    xp = np.linspace(-1.6, 1.6, 400)
    ax.plot(xp, E0 * (xp * xp - 1) ** 2, color=style.INK3, lw=1.6, ls=(0, (5, 3)))
    ax.annotate("energy along the valley floor (the same for both)", (0.3, E0 * (0.09 - 1) ** 2),
                xytext=(0.62, 5.5), fontsize=8.5, color=style.INK3, va="center",
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    out = []
    for name, kb, col in cases:
        F = E0 * (xp * xp - 1) ** 2 + 0.5 * np.log(kx(xp, kb) / kw)
        ax.plot(xp, F, color=col, lw=2.2)
        fb = float(F[np.argmin(np.abs(xp))]); out.append(fb)
        xy = (0.0, fb) if fb > 5 else (0.25, fb * (1 - 0.0625) ** 2)
        ax.annotate(f"{name}: ΔF‡ = {fb:.2f} kT", xy, xytext=(0.62, 6.6 if fb > 5 else 4.4),
                    color=col, fontsize=9, fontweight="semibold", va="center",
                    arrowprops=dict(arrowstyle="-", color=col, lw=0.8))
    ax.set_xlim(-1.6, 1.6); ax.set_ylim(-0.3, 7.4)
    ax.set_xlabel("position along the reaction, x")
    ax.set_ylabel("free energy F(x) (kT)")
    ax.set_title("Same energy barrier, different free-energy barriers", loc="left", fontsize=10)
    style.save(fig, SLUG, "entropy")
    print(f"  narrow dF = {out[0]:.3f} kT, wide dF = {out[1]:.3f} kT, rate ratio = {np.exp(out[0]-out[1]):.2f}")


# ---------------------------------------------------------------- cover
def cover():
    def draw(ax):
        xs = np.linspace(0, 4, 160); ys = np.linspace(0, 3, 120)
        X, Y = np.meshgrid(xs, ys)
        u, w = (X - 2.0) / 1.15, (Y - 1.5) - 0.32 * (X - 2.0) ** 2 + 0.35
        Z = 1.6 * (u * u - 1) ** 2 + 2.4 * w * w - 0.25 * u
        cols = [style.BLUE, "#6c86f7", "#93a6fa", "#bac7fc", style.TINT[style.BLUE]]
        ax.contourf(X, Y, Z, levels=[-1, 0.15, 0.6, 1.2, 2.0, 3.0], colors=cols, zorder=0)
        ax.contour(X, Y, Z, levels=[0.15, 0.6, 1.2, 2.0, 3.0], colors="white", linewidths=1.2, zorder=1)
        t = np.linspace(-1.02, 1.0, 11)
        px = 2.0 + 1.15 * t; py = 1.5 - 0.35 + 0.32 * (px - 2.0) ** 2
        ax.plot(px, py, color=style.INK, lw=2.4, zorder=2, solid_capstyle="round")
        for x, y in zip(px, py):
            if abs(x - 2.0) > 0.1:
                ax.add_patch(Circle((x, y), 0.085, fc="white", ec=style.INK, lw=2.2, zorder=3))
        ax.add_patch(Polygon([[2.0, 1.15 + 0.2], [2.2, 1.15], [2.0, 1.15 - 0.2], [1.8, 1.15]], closed=True,
                             fc=style.GOLD, ec=style.INK, lw=2.2, zorder=4))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    waiting(); stationary(); nebforces(); entropy(); cover()
