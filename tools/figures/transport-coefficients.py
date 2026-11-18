"""Figures for content/learn/transport-coefficients.md.  Run: python3 tools/figures/transport-coefficients.py

The VACF and MSD figure comes from a small 3D Lennard-Jones simulation of liquid argon at the state point of
Aneesur Rahman's 1964 study (94.4 K, 1.374 g/cm3; sigma = 0.34 nm, epsilon/kB = 120 K), with 256 atoms instead
of his 864 so that it runs in about 20 seconds."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Rectangle, Polygon
import style
plt = style.setup()
SLUG = "transport-coefficients"

# Argon in Lennard-Jones units
SIG_NM, EPS_K, MASS_U = 0.34, 120.0, 39.948
KB, AMU = 1.380649e-23, 1.66053907e-27
TAU_PS = SIG_NM * 1e-9 * np.sqrt(MASS_U * AMU / (EPS_K * KB)) * 1e12      # 2.151 ps
D_UNIT = (SIG_NM * 1e-9) ** 2 / (TAU_PS * 1e-12)                          # m^2/s per sigma^2/tau


# ---------------------------------------------------------------- a small Lennard-Jones engine
def fcc(nc, L):
    a = L / nc
    b = np.array([[0, 0, 0], [.5, .5, 0], [.5, 0, .5], [0, .5, .5]])
    g = np.array([[i, j, k] for i in range(nc) for j in range(nc) for k in range(nc)], float)
    return ((g[:, None, :] + b[None]) * a).reshape(-1, 3)


class LJ:
    """Truncated-and-shifted LJ forces with a Verlet neighbour list (reduced units)."""
    def __init__(s, x, L, rc=2.5, skin=0.3):
        s.L, s.rc, s.skin, s.N = L, rc, skin, len(x)
        s.build(x)

    def build(s, x):
        d = x[:, None, :] - x[None, :, :]
        d -= s.L * np.round(d / s.L)
        s.i, s.j = np.nonzero(np.triu((d * d).sum(-1) < (s.rc + s.skin) ** 2, 1))
        s.x0 = x.copy()

    def forces(s, x):
        dx = x - s.x0
        dx -= s.L * np.round(dx / s.L)
        if np.max((dx * dx).sum(1)) > (0.5 * s.skin) ** 2:
            s.build(x)
        d = x[s.i] - x[s.j]
        d -= s.L * np.round(d / s.L)
        r2 = (d * d).sum(1)
        m = r2 < s.rc ** 2
        d, r2, i, j = d[m], r2[m], s.i[m], s.j[m]
        ir2 = 1 / r2
        s6 = ir2 ** 3
        ff = (24 * ir2 * s6 * (2 * s6 - 1))[:, None] * d
        f = np.zeros((s.N, 3))
        for k in range(3):
            f[:, k] = np.bincount(i, ff[:, k], s.N) - np.bincount(j, ff[:, k], s.N)
        return f


def argon_run(n_equil=3000, n_prod=12000, every=2, seed=11):
    """NVE production after velocity-rescaled equilibration. Returns unwrapped positions and velocities."""
    rho = 1.374e3 / (MASS_U * AMU) * (SIG_NM * 1e-9) ** 3      # 0.814
    T = 94.4 / EPS_K                                            # 0.787
    N, dt = 256, 0.005
    L = (N / rho) ** (1 / 3)
    rng = np.random.default_rng(seed)
    x = fcc(4, L)
    v = rng.normal(0, np.sqrt(T), (N, 3))
    v -= v.mean(0)
    P = LJ(x, L)
    f = P.forces(x)
    xu = x.copy()
    X, V = [], []
    for s in range(n_equil + n_prod):
        v += 0.5 * dt * f
        x += dt * v
        xu += dt * v
        x %= L
        f = P.forces(x)
        v += 0.5 * dt * f
        if s < n_equil and s % 20 == 0:                         # equilibration only: crude rescaling
            v *= np.sqrt(T * 3 * (N - 1) / (v * v).sum())
        if s >= n_equil and (s - n_equil) % every == 0:
            X.append(xu.copy())
            V.append(v.copy())
    Tm = np.mean([(u * u).sum() / (3 * (N - 1)) for u in V])
    return np.array(X), np.array(V), dt * every, Tm, rho


def vacf_fft(V, nlag):
    """<v(0).v(t)> averaged over atoms and time origins, by FFT."""
    n = len(V)
    F = np.fft.rfft(V, n=2 * n, axis=0)
    c = np.fft.irfft(F * np.conj(F), axis=0)[:nlag].sum(axis=(1, 2)) / V.shape[1]
    return c / (n - np.arange(nlag))


def regimes():
    X, V, dts, Tm, rho = argon_run()
    nlag = int(round(2.0 / dts)) + 1                 # VACF to 2 tau
    C = vacf_fft(V, nlag)
    t = np.arange(nlag) * dts
    I = np.concatenate([[0], np.cumsum(0.5 * (C[1:] + C[:-1]) * dts)]) / 3
    D_gk = I[-1]
    lags = np.unique(np.round(np.logspace(0, np.log10(len(X) // 3), 60)).astype(int))
    msd = np.array([np.mean(np.sum((X[l:] - X[:-l]) ** 2, -1)) for l in lags])
    tl = lags * dts
    fit = (tl > 2.0) & (tl < 15.0)
    slope, icpt = np.polyfit(tl[fit], msd[fit], 1)
    D_msd = slope / 6
    # to argon units
    tps = t * TAU_PS
    tlps = tl * TAU_PS
    msd_nm = msd * SIG_NM ** 2
    i0 = np.argmax(C < 0)
    imin = np.argmin(C)
    out = dict(T=Tm * EPS_K, rho=rho, D_gk=D_gk * D_UNIT, D_msd=D_msd * D_UNIT, t0=tps[i0], tmin=tps[imin],
               cmin=C[imin] / C[0], D_cut0=I[i0] * D_UNIT, icpt=icpt * SIG_NM ** 2)

    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.4), gridspec_kw=dict(wspace=0.36))
    a = axs[0]
    a.axhline(0, color=style.LINE, lw=1, zorder=0)
    a.plot(tps, C / C[0], color=style.ORANGE)
    a.fill_between(tps, 0, C / C[0], where=C < 0, color=style.TINT[style.PINK], lw=0)
    a.set_xlim(0, 2.0 * TAU_PS)
    a.set_ylim(-0.25, 1.05)
    a.set_xlabel("time $t$ (ps)")
    a.set_ylabel("$C_v(t)\\,/\\,C_v(0)$")
    a.set_title("velocity autocorrelation")
    a.annotate("free flight: velocity\nremembered", (0.18, 0.80), xytext=(0.75, 0.82), fontsize=8.5, color=style.INK2,
               va="center", arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=3))
    a.annotate(f"rebound from the cage:\nnegative from {out['t0']:.2f} ps", (tps[imin], C[imin] / C[0]),
               xytext=(1.0, 0.3), fontsize=8.5, color=style.PINK, va="center",
               arrowprops=dict(arrowstyle="-", color=style.PINK, lw=0.8, shrinkB=3))
    a = axs[1]
    a.loglog(tlps, msd_nm, color=style.TEAL)
    tb = np.array([tlps[0] * 0.8, 0.35])
    a.loglog(tb, 4 * 3 * Tm * (SIG_NM / TAU_PS) ** 2 * tb ** 2, color=style.INK3, lw=1, ls=(0, (3, 2)))
    td = np.array([1.0, tlps[-1] * 1.1])
    a.loglog(td, 0.25 * 6 * out["D_msd"] * 1e6 * td, color=style.INK3, lw=1, ls=(0, (3, 2)))
    a.text(0.13, 1.2e-4, "ballistic:\nslope 2", fontsize=8.5, color=style.INK2, ha="left")
    a.text(2.5, 1.6e-3, "diffusive: slope 1,\nMSD = 6$Dt$", fontsize=8.5, color=style.INK2, ha="left", va="top")
    a.annotate("caged", (0.6, np.interp(0.6, tlps, msd_nm)), xytext=(0.12, 0.09), fontsize=8.5,
               color=style.INK2, ha="center", arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=3))
    a.set_xlabel("time $t$ (ps)")
    a.set_ylabel("MSD (nm$^2$)")
    a.set_title("mean-squared displacement")
    a.set_xlim(tlps[0] * 0.8, tlps[-1] * 1.2)
    style.save(fig, SLUG, "regimes")
    return out


def gk_noise(nrun=10, n=40000, dt=0.05, seed=4):
    """Running Green-Kubo integrals of a flux with exponential memory (correlation time 1), from 10 runs."""
    rng = np.random.default_rng(seed)
    phi = np.exp(-dt)
    nlag = int(30 / dt) + 1
    t = np.arange(nlag) * dt
    runs = []
    for _ in range(nrun):
        e = rng.normal(size=n) * np.sqrt(1 - phi ** 2)
        J = np.empty(n)
        J[0] = rng.normal()
        for k in range(1, n):
            J[k] = phi * J[k - 1] + e[k]
        F = np.fft.rfft(J, 2 * n)
        c = np.fft.irfft(F * np.conj(F))[:nlag] / (n - np.arange(nlag))
        runs.append(np.concatenate([[0], np.cumsum(0.5 * (c[1:] + c[:-1]) * dt)]))
    runs = np.array(runs)
    mean, sd = runs.mean(0), runs.std(0, ddof=1)
    print("mean at t=5:", mean[int(5 / dt)])
    fig, ax = plt.subplots(figsize=(7.2, 3.3))
    for r in runs:
        ax.plot(t, r, color=style.BLUE, lw=0.8, alpha=0.35)
    ax.plot(t, mean, color=style.BLUE, lw=2.2)
    ax.axhline(1, color=style.INK3, lw=1, ls=(0, (4, 3)))
    ax.axvspan(3, 6, color=style.TINT[style.TEAL], lw=0, zorder=0)
    ax.text(4.5, 1.62, "stop here:\nplateau reached,\nnoise still small", fontsize=8.5, color=style.TEAL, ha="center",
            va="top")
    ax.text(29.5, 1.04, "exact integral", fontsize=8.5, color=style.INK2, ha="right", va="bottom")
    k = int(25 / dt)
    ax.annotate("past the plateau the integral\nonly accumulates noise", (25, runs[:, k].max()), xytext=(15.5, 1.55),
                fontsize=8.5, color=style.INK2, va="center",
                arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=3))
    ax.annotate("mean of 10 runs", (12, mean[int(12 / dt)]), xytext=(9.5, 0.55), fontsize=8.5, color=style.BLUE,
                arrowprops=dict(arrowstyle="-", color=style.BLUE, lw=0.8, shrinkB=3))
    ax.set_xlim(0, 30)
    ax.set_ylim(0, 1.7)
    ax.set_xlabel("upper limit of the integral $t$ (in units of the correlation time)")
    ax.set_ylabel("running integral\n(units of the exact value)")
    style.save(fig, SLUG, "gk-noise")
    i5, i25 = int(5 / dt), int(25 / dt)
    return dict(sd5=sd[i5], sd25=sd[i25], n=n * dt)


def finite_size():
    """Yeh-Hummer correction for water at 298 K, D_inf = 2.30e-9 m^2/s, eta = 0.89 mPa s."""
    kT = KB * 298.15
    eta, xi, Dinf = 0.89e-3, 2.837297, 2.30
    Ls = np.array([2, 3, 4, 6, 10.0])
    corr = xi * kT / (6 * np.pi * eta * Ls * 1e-9) * 1e9           # 1e-9 m^2/s
    Dp = Dinf - corr
    nw = 33.4 * Ls ** 3
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    xx = np.linspace(0, 0.55, 50)
    ax.plot(xx, Dinf - xi * kT / (6 * np.pi * eta) * 1e18 * xx, color=style.BLUE, lw=1.6, ls=(0, (4, 3)))
    ax.plot(1 / Ls, Dp, "o", ms=8, color=style.BLUE, zorder=3)
    ax.plot(0, Dinf, "o", ms=9, mfc="white", mec=style.ORANGE, mew=2, zorder=4)
    ax.annotate("infinite system:\n$D_\\infty$ = 2.30 × 10$^{-9}$ m$^2$/s", (0, Dinf), xytext=(0.01, 1.97),
                fontsize=8.5, color=style.ORANGE, va="top",
                arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.8, shrinkB=5))
    for L, d, n in zip(Ls, Dp, nw):
        if L in (2, 3, 6):
            lab = f"{L:.0f} nm box, ≈ {n:,.0f} waters\n{100 * (Dinf - d) / Dinf:.0f} % too slow"
            ax.text(1 / L - 0.012, d - 0.025, lab, fontsize=8, color=style.INK2, va="top", ha="right", linespacing=1.35)
    ax.text(0.35, 2.3, "slope $= -\\xi k_BT/6\\pi\\eta$:\nthe line also gives the viscosity", fontsize=8.5,
            color=style.BLUE, va="top")
    ax.set_xlim(-0.02, 0.62)
    ax.set_ylim(1.8, 2.42)
    ax.set_xlabel("inverse box length $1/L$ (nm$^{-1}$)")
    ax.set_ylabel("$D_{\\mathrm{PBC}}$ (10$^{-9}$ m$^2$/s)")
    style.save(fig, SLUG, "finite-size")
    return dict(zip(Ls, Dp))


def fluxes():
    """Four gradients, four fluxes, four Green-Kubo integrals."""
    fig, ax = plt.subplots(figsize=(7.2, 3.9))
    ax.set_xlim(0, 8)
    ax.set_ylim(0, 4.3)
    ax.axis("off")
    cols = [style.TEAL, style.BLUE, style.ORANGE, style.VIOLET]
    rng = np.random.default_rng(2)
    heads = ["diffusion", "shear viscosity", "thermal conduction", "electrical conduction"]
    laws = ["Fick:  $J = -D\\,\\nabla c$", "Newton:  $\\tau_{xy} = \\eta\\,\\partial u_x/\\partial y$",
            "Fourier:  $J_q = -\\kappa\\,\\nabla T$", "Ohm:  $J_e = \\sigma E$"]
    gk = ["velocity  $\\mathbf{v}_i$", "shear stress  $P_{xy}$", "heat current  $\\mathbf{J}_q$",
          "charge current  $\\mathbf{J}_e$"]
    for k in range(4):
        x0 = 0.1 + 2.0 * k
        c = cols[k]
        ax.add_patch(FancyBboxPatch((x0, 1.55), 1.8, 1.75, boxstyle="round,pad=0,rounding_size=0.12",
                                    fc=style.TINT[c], ec="none"))
        ax.text(x0 + 0.9, 4.05, heads[k], ha="center", va="center", fontsize=9, color=style.INK,
                fontweight="semibold")
        ax.text(x0 + 0.9, 3.62, laws[k], ha="center", va="center", fontsize=8.5, color=style.INK2)
        bx, by, bw, bh = x0 + 0.15, 1.7, 1.5, 1.45
        if k == 0:      # concentration gradient: dense on the left
            pts = []
            while len(pts) < 26:
                p = rng.uniform([0, 0], [1, 1])
                if rng.uniform() < (1 - p[0]) ** 1.3:
                    pts.append(p)
            for p in pts:
                ax.add_patch(Circle((bx + 0.08 + p[0] * (bw - 0.16), by + 0.08 + p[1] * (bh - 0.16)), 0.045,
                                    color=c, lw=0))
            ax.add_patch(FancyArrowPatch((bx + 0.35, by + bh / 2), (bx + bw - 0.1, by + bh / 2),
                                         arrowstyle="-|>,head_width=4,head_length=6", lw=2.2, color=style.INK))
        elif k == 1:    # shear flow: velocity grows with height
            for yy in np.linspace(0.15, 1.3, 6):
                ln = 0.15 + 0.9 * (yy - 0.15) / 1.15
                ax.add_patch(FancyArrowPatch((bx + 0.2, by + yy), (bx + 0.2 + ln, by + yy),
                                             arrowstyle="-|>,head_width=2.5,head_length=4", lw=1.6, color=c))
            ax.plot([bx + 0.2, bx + 0.2], [by + 0.05, by + bh - 0.05], color=style.INK3, lw=1)
            ax.plot([bx + 0.35, bx + 1.25], [by + 0.15, by + 1.3], color=style.INK2, lw=1, ls=(0, (2, 2)))
        elif k == 2:    # temperature gradient: hot left, cold right
            n = 40
            for i in range(n):
                f = i / (n - 1)
                col = np.array([0xf0, 0x8c, 0x2e]) * (1 - f) + np.array([0x4c, 0x6e, 0xf5]) * f
                ax.add_patch(Rectangle((bx + f * bw * (n - 1) / n, by + 0.25), bw / n + 0.002, bh - 0.5,
                                       color="#%02x%02x%02x" % tuple(col.astype(int)), lw=0, alpha=0.55))
            ax.text(bx + 0.02, by + 0.2, "hot", fontsize=8, color=style.INK2, va="top")
            ax.text(bx + bw - 0.02, by + 0.2, "cold", fontsize=8, color=style.INK2, va="top", ha="right")
            ax.add_patch(FancyArrowPatch((bx + 0.25, by + bh / 2), (bx + bw - 0.2, by + bh / 2),
                                         arrowstyle="-|>,head_width=4,head_length=6", lw=2.2, color=style.INK))
        else:           # electric field: cations right, anions left
            ax.add_patch(Rectangle((bx, by + 0.05), 0.08, bh - 0.1, color=style.INK3, lw=0))
            ax.add_patch(Rectangle((bx + bw - 0.08, by + 0.05), 0.08, bh - 0.1, color=style.INK3, lw=0))
            ax.text(bx + 0.04, by + bh + 0.02, "+", ha="center", va="bottom", fontsize=9, color=style.INK2)
            ax.text(bx + bw - 0.04, by + bh + 0.02, "−", ha="center", va="bottom", fontsize=9, color=style.INK2)
            for i, (px, py) in enumerate([(0.35, 0.3), (0.8, 0.55), (0.45, 0.95), (1.05, 1.2), (1.15, 0.25),
                                          (0.6, 0.15)]):
                cat = i % 2 == 0
                cc = style.PINK if cat else style.VIOLET
                ax.add_patch(Circle((bx + px, by + py), 0.075, color=cc, lw=0))
                ax.text(bx + px, by + py, "+" if cat else "−", ha="center", va="center", fontsize=8, color="white",
                        fontweight="semibold")
                dxa = 0.22 if cat else -0.22
                ax.add_patch(FancyArrowPatch((bx + px + 0.09 * np.sign(dxa), by + py),
                                             (bx + px + dxa + 0.09 * np.sign(dxa), by + py),
                                             arrowstyle="-|>,head_width=2,head_length=3", lw=1.2, color=cc))
        # what Green-Kubo correlates
        ax.annotate("", (x0 + 0.9, 1.0), (x0 + 0.9, 1.5),
                    arrowprops=dict(arrowstyle="-|>,head_width=0.25,head_length=0.4", color=style.INK3, lw=1))
        ax.text(x0 + 0.9, 0.78, gk[k], ha="center", va="center", fontsize=9, color=style.INK)
    ax.text(4.0, 0.25, "in equilibrium, integrate the autocorrelation of the flux:   "
            "coefficient  $\\propto\\;\\int_0^\\infty \\langle J(0)\\,J(t)\\rangle\\,\\mathrm{d}t$",
            ha="center", va="center", fontsize=9.5, color=style.INK2)
    style.save(fig, SLUG, "fluxes")


COVER_SEED = 19


def cover():
    def draw(ax):
        rng = np.random.default_rng(COVER_SEED)
        c = np.array([2.0, 1.5])
        for r, a in [(1.25, 0.18), (0.88, 0.32), (0.5, 0.55)]:
            ax.add_patch(Circle(c, r, fc="none", ec=style.TEAL, lw=3.2, alpha=a + 0.25))
        steps = rng.normal(0, 0.11, (110, 2))
        path = c + np.cumsum(steps, 0)
        path = np.vstack([c, path])
        ax.plot(path[:, 0], path[:, 1], color=style.BLUE, lw=3, solid_joinstyle="round")
        ax.add_patch(Circle(c, 0.12, color=style.ORANGE, zorder=5))
        ax.add_patch(Circle(path[-1], 0.1, color=style.PINK, zorder=5))
    style.cover(SLUG, draw, bg=style.TINT[style.TEAL])


if __name__ == "__main__":
    only = set(sys.argv[1:])                 # optional: names of figures to redraw
    run = lambda name: not only or name in only
    if run("fluxes"): fluxes()
    if run("regimes"): print("argon:", {k: f"{v:.4g}" for k, v in regimes().items()})
    if run("gk-noise"): print("gk-noise:", gk_noise())
    if run("finite-size"): print("finite-size:", finite_size())
    if run("cover"): cover()
