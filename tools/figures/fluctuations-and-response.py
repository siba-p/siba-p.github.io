"""Figures for content/learn/fluctuations-and-response.md.  Run: python3 tools/figures/fluctuations-and-response.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy.signal import lfilter
import style
from matplotlib.patches import Rectangle, FancyArrowPatch, FancyBboxPatch, Circle
plt = style.setup()
SLUG = "fluctuations-and-response"
KB = 1.380649e-23


def two_routes():
    """The same heat capacity from a response experiment and from equilibrium fluctuations."""
    fig, ax = plt.subplots(figsize=(7.2, 3.3))
    ax.set_xlim(0, 15); ax.set_ylim(0, 6.6); ax.set_aspect("equal"); ax.axis("off")
    # left: push and measure
    ax.text(3.3, 6.35, "Push and measure", ha="center", fontsize=10.5, weight="semibold", color=style.INK)
    ax.add_patch(Rectangle((1.3, 2.2), 3.0, 2.9, fc=style.TINT[style.ORANGE], ec=style.INK2, lw=1.6))
    zx = np.linspace(1.8, 3.8, 41); zy = 2.55 + 0.16 * np.sign(np.sin(np.linspace(0, 10 * np.pi, 41)))
    ax.plot(zx, zy, color=style.PINK, lw=1.6)
    ax.text(2.8, 3.05, "heater adds $\\delta Q$", ha="center", fontsize=9, color=style.INK2)
    ax.add_patch(Rectangle((4.75, 2.4), 0.22, 2.5, fc="white", ec=style.INK2, lw=1.2))
    ax.add_patch(Rectangle((4.77, 2.42), 0.18, 1.8, fc=style.PINK, ec="none"))
    ax.add_patch(Circle((4.86, 2.35), 0.2, fc=style.PINK, ec=style.INK2, lw=1.2))
    ax.text(5.15, 4.55, "$T \\to T + \\delta T$", fontsize=9, color=style.INK2, va="center")
    ax.text(2.8, 4.35, "isolated sample", ha="center", fontsize=9, color=style.INK2)
    ax.text(3.3, 1.2, "$C = \\delta Q/\\delta T$", ha="center", fontsize=12, color=style.INK)
    ax.text(3.3, 0.45, "disturb the system, record its response", ha="center", fontsize=8.5, color=style.INK3)
    # right: watch and wait
    ax.text(11.3, 6.35, "Watch and wait", ha="center", fontsize=10.5, weight="semibold", color=style.INK)
    ax.add_patch(FancyBboxPatch((8.3, 1.8), 6.2, 3.7, boxstyle="round,pad=0,rounding_size=0.25", fc=style.TINT[style.TEAL], ec="none"))
    ax.text(8.5, 5.2, "heat bath at fixed T", fontsize=8.5, color=style.TEAL, va="center")
    ax.add_patch(Rectangle((8.6, 2.2), 2.0, 2.5, fc="white", ec=style.INK2, lw=1.6))
    rng = np.random.default_rng(2)
    ax.scatter(8.85 + 1.5 * rng.random(10), 2.45 + 2.0 * rng.random(10), s=18, color=style.TEAL, lw=0)
    for yy in (2.8, 4.0):
        ax.add_patch(FancyArrowPatch((8.15, yy), (8.75, yy), arrowstyle="<|-|>", mutation_scale=8, color=style.ORANGE, lw=1.3))
    # energy trace (AR(1) noise) and its histogram
    e = lfilter([1], [1, -0.9], rng.normal(0, 1, 400))[100:]
    e = (e - e.mean()) / e.std()
    tx = np.linspace(11.0, 13.4, e.size)
    ax.plot(tx, 3.45 + 0.42 * e, color=style.BLUE, lw=0.8)
    ax.plot([11.0, 13.4], [3.45, 3.45], color=style.INK3, lw=0.8, ls=(0, (3, 2)))
    ax.text(12.2, 2.08, "energy E(t)", ha="center", fontsize=8.5, color=style.INK2)
    hy = np.linspace(-2.6, 2.6, 60); hx = np.exp(-hy ** 2 / 2)
    ax.fill_betweenx(3.45 + 0.42 * hy, 13.55, 13.55 + 0.75 * hx, color=style.BLUE, alpha=0.35, lw=0)
    ax.annotate("", (14.35, 3.45 + 0.42), (14.35, 3.45 - 0.42), arrowprops=dict(arrowstyle="<|-|>", color=style.INK2, lw=1, mutation_scale=7, shrinkA=0, shrinkB=0))
    ax.text(14.45, 3.45, "$\\sigma_E$", fontsize=9, color=style.INK2, va="center")
    ax.text(11.3, 1.2, "$C = \\langle \\delta E^2\\rangle / k_BT^2$", ha="center", fontsize=12, color=style.INK)
    ax.text(11.3, 0.45, "leave it alone, record how much it wanders", ha="center", fontsize=8.5, color=style.INK3)
    ax.text(7.15, 1.2, "=", ha="center", fontsize=16, color=style.INK3)
    style.save(fig, SLUG, "two-routes")


def vdw_compressibility():
    """ρ kT κ_T = S(0) for the van der Waals fluid, in reduced units."""
    s0 = lambda r, t: 1.0 / (9.0 / (3.0 - r) ** 2 - 9.0 * r / (4.0 * t))
    fig, (a, b) = plt.subplots(1, 2, figsize=(7.2, 3.3), gridspec_kw=dict(wspace=0.38))
    eps = np.logspace(-3, 0.3, 200)
    a.plot(eps, 4 / 9 * (1 + eps) / eps, color=style.VIOLET)
    a.axhline(1, color=style.INK3, lw=1, ls=(0, (4, 3)))
    a.text(0.0013, 1.25, "ideal gas", ha="left", fontsize=8.5, color=style.INK3)
    a.axhline(0.062, color=style.TEAL, lw=1, ls=(0, (4, 3)))
    a.text(1.9, 0.075, "liquid water, 25 °C", ha="right", fontsize=8.5, color=style.TEAL)
    a.plot(0.01, 4 / 9 * 1.01 / 0.01, "o", color=style.VIOLET, mec="white", mew=1.2, ms=6.5)
    a.annotate("1 % above $T_c$: 45", (0.01, 44.9), xytext=(10, 6), textcoords="offset points", fontsize=8.5, color=style.INK2)
    a.text(0.0015, 8, "slope −1:\nmean-field $\\gamma = 1$", fontsize=8.5, color=style.VIOLET, va="center")
    a.set_xscale("log"); a.set_yscale("log"); a.set_xlim(1e-3, 2); a.set_ylim(0.04, 1000)
    a.set_xlabel("$(T - T_c)/T_c$ at the critical density"); a.set_ylabel("$\\rho k_BT\\kappa_T = S(0)$")
    a.set_title("Approach to the critical point", fontsize=10)
    r = np.linspace(0.01, 2.6, 400)
    for t, c, xo in [(1.03, style.PINK, 0), (1.2, style.ORANGE, 0), (2.0, style.BLUE, 0)]:
        y = s0(r, t); b.plot(r, y, color=c)
        lab = f"$T = {t:g}\\,T_c$"
        if t == 1.03:
            i = np.argmax(y); b.text(r[i] + 0.12, y[i], lab, color=c, fontsize=9, weight="semibold", va="bottom")
        else:
            x0 = 1.2 if t == 1.2 else 1.45; tx = (1.55, 4.6) if t == 1.2 else (1.75, 3.0)
            b.annotate(lab, (x0, s0(x0, t)), xytext=tx, color=c, fontsize=9, weight="semibold", arrowprops=dict(arrowstyle="-", color=c, lw=0.8))
    b.axhline(1, color=style.INK3, lw=1, ls=(0, (4, 3)))
    b.set_xlim(0, 2.6); b.set_ylim(0, 16)
    b.set_xlabel("density $\\rho/\\rho_c$"); b.set_ylabel("$\\rho k_BT\\kappa_T$")
    b.set_title("Isotherms of the van der Waals fluid", fontsize=10)
    style.save(fig, SLUG, "critical-compressibility")


def optical_trap():
    """Overdamped bead in a harmonic trap: equilibrium fluctuations and relaxation after a force is removed."""
    T = 298.15; kT = KB * T * 1e21                 # pN nm
    k = 0.05                                       # pN/nm
    zeta = 6 * np.pi * 0.89e-3 * 0.5e-6            # N s/m for a 1 µm bead in water
    tau = zeta / (k * 1e-3) * 1e3                  # ms
    sig = np.sqrt(kT / k)                          # nm
    dt = 0.004                                     # ms
    c = np.exp(-dt / tau); s = sig * np.sqrt(1 - c * c)
    rng = np.random.default_rng(7)
    x = lfilter([s], [1, -c], rng.normal(0, 1, 500000))[2000:]
    # autocorrelation from the long equilibrium trajectory
    lags = np.arange(0, 251)
    acf = np.array([np.mean(x[:x.size - l] * x[l:]) for l in lags]) / np.var(x)
    # relaxation: 2000 beads equilibrated with f = 0.5 pN, force switched off at t = 0
    f0 = 0.5; nb = 2000
    xb = f0 / k + sig * rng.normal(0, 1, nb); mean = [xb.mean()]
    for _ in lags[1:]:
        xb = c * xb + s * rng.normal(0, 1, nb); mean.append(xb.mean())
    mean = np.array(mean)
    fig, (a, b) = plt.subplots(1, 2, figsize=(7.2, 3.2), gridspec_kw=dict(width_ratios=[1.25, 1], wspace=0.32))
    tt = np.arange(1250) * dt
    a.plot(tt, x[:1250], color=style.BLUE, lw=0.8)
    for sgn in (1, -1): a.axhline(sgn * sig, color=style.INK3, lw=1, ls=(0, (4, 3)))
    a.text(5.12, sig, "$+\\sigma$", fontsize=9, color=style.INK2, va="center"); a.text(5.12, -sig, "$-\\sigma$", fontsize=9, color=style.INK2, va="center")
    a.set_xlim(0, 5); a.set_ylim(-32, 32)
    a.set_xlabel("time (ms)"); a.set_ylabel("bead position x (nm)")
    a.set_title("Fluctuations at equilibrium", fontsize=10)
    tl = lags * dt
    b.plot(tl, np.exp(-tl / tau), color=style.INK3, lw=1, ls=(0, (4, 3)))
    b.plot(tl[::8], acf[::8], "o", color=style.BLUE, ms=4.5, mec="white", mew=0.8)
    b.plot(tl, mean / (f0 / k), color=style.ORANGE, lw=1.8)
    b.text(0.25, 0.62, "relaxation after a\n0.5 pN force is removed\n(mean of 2000 beads)", fontsize=8.5, color=style.ORANGE, va="center")
    b.text(0.45, 0.1, "dots: autocorrelation of\nthe equilibrium trajectory", fontsize=8.5, color=style.BLUE, va="bottom")
    b.annotate(f"$e^{{-t/\\tau}}$, $\\tau$ = {tau:.2f} ms", (tau, np.exp(-1)), xytext=(28, -4), textcoords="offset points", fontsize=8.5, color=style.INK2,
               arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    b.set_xlim(0, 1.0); b.set_ylim(-0.05, 1.05)
    b.set_xlabel("time t (ms)"); b.set_ylabel("normalised")
    b.set_title("Regression of fluctuations", fontsize=10)
    style.save(fig, SLUG, "optical-trap")
    return tau, sig


def cover():
    def draw(ax):
        rng = np.random.default_rng(12)
        e = lfilter([1], [1, -0.93], rng.normal(0, 1, 900))[200:]
        e = (e - e.mean()) / e.std()
        x = np.linspace(0.25, 2.85, e.size)
        ax.plot(x, 1.5 + 0.36 * e, color=style.BLUE, lw=1.6, solid_joinstyle="round")
        ax.plot([0.25, 3.75], [1.5, 1.5], color=style.INK, lw=2, alpha=0.35)
        y = np.linspace(-3, 3, 200); w = np.exp(-y ** 2 / 2)
        ax.fill_betweenx(1.5 + 0.36 * y, 3.0, 3.0 + 0.75 * w, color=style.GOLD, lw=0)
        ax.plot([3.0, 3.0], [1.5 - 1.1, 1.5 + 1.1], color=style.INK, lw=2.4)
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    two_routes(); vdw_compressibility(); tau, sig = optical_trap(); cover()
    print(f"tau = {tau:.3f} ms, sigma = {sig:.2f} nm")
