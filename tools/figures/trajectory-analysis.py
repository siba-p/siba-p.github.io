"""Figures for content/learn/trajectory-analysis.md.  Run: python3 tools/figures/trajectory-analysis.py [names]

The g(r) figure comes from a small 3D Lennard-Jones simulation of liquid argon (sigma = 0.34 nm,
epsilon/kB = 120 K) at 94.4 K and 1.374 g/cm3, the state point of Rahman's 1964 study."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.patches import Circle, Wedge, Rectangle, FancyArrowPatch, FancyBboxPatch
import style
plt = style.setup()
SLUG = "trajectory-analysis"
SIG_NM, EPS_K, MASS_U, AMU = 0.34, 120.0, 39.948, 1.66053907e-27


def ar1(n, tau, rng):
    phi = np.exp(-1 / tau)
    e = rng.normal(size=n) * np.sqrt(1 - phi ** 2)
    x = np.empty(n)
    x[0] = rng.normal()
    for i in range(1, n):
        x[i] = phi * x[i - 1] + e[i]
    return x, phi


# ---------------------------------------------------------------- 1. effective sample size
def neff():
    rng = np.random.default_rng(3)
    tau, n = 50, 2000
    x, phi = ar1(n, tau, rng)
    tint = (1 + phi) / (2 * (1 - phi))
    every = int(round(2 * tint))
    fig = plt.figure(figsize=(7.2, 3.1))
    gs = fig.add_gridspec(1, 3, wspace=0.45)
    a = fig.add_subplot(gs[0, :2])
    a.plot(np.arange(n), x, color=style.BLUE, lw=0.9, alpha=0.75)
    idx = np.arange(every // 2, n, every)
    a.plot(idx, x[idx], "o", ms=6.5, color=style.ORANGE, zorder=3)
    a.set_xlim(0, n)
    a.set_ylim(-3.6, 3.6)
    a.set_xlabel("frame")
    a.set_ylabel("observable (units of σ)")
    a.set_title(f"{n:,} frames, {n // every} effectively independent")
    a.annotate("", (idx[3], 3.05), (idx[2], 3.05),
               arrowprops=dict(arrowstyle="<->,head_width=0.18,head_length=0.35", color=style.INK2, lw=0.9))
    a.text((idx[2] + idx[3]) / 2, 3.2, f"2τ$_{{\\mathrm{{int}}}}$ = {every} frames", ha="center", va="bottom",
           fontsize=8.5, color=style.INK2)
    b = fig.add_subplot(gs[0, 2])
    k = np.arange(0, 251)
    C = phi ** k
    b.fill_between(k, 0, C, color=style.TINT[style.ORANGE], lw=0)
    b.plot(k, C, color=style.ORANGE)
    b.set_xlim(0, 250)
    b.set_ylim(0, 1.05)
    b.set_xlabel("lag $k$ (frames)")
    b.set_ylabel("autocorrelation $C(k)$")
    b.set_title("memory")
    b.text(42, 0.5, f"shaded area\n≈ τ$_{{\\mathrm{{int}}}}$ = {tint:.0f}", fontsize=8.5, color=style.INK2)
    style.save(fig, SLUG, "neff")
    return dict(tint=tint, every=every, nind=n // every)


# ---------------------------------------------------------------- 2. equilibration detection
def stat_ineff(x):
    """Statistical inefficiency g = 2 tau_int, summing C(k) with (1 - k/N) weights until C first drops below 0."""
    n = len(x)
    dx = x - x.mean()
    F = np.fft.rfft(dx, 2 * n)
    c = np.fft.irfft(F * np.conj(F))[:n] / (n - np.arange(n))
    c /= c[0]
    g = 1.0
    for k in range(1, n - 1):
        if c[k] <= 0:
            break
        g += 2 * c[k] * (1 - k / n)
    return max(g, 1.0)


def equilibration():
    rng = np.random.default_rng(3)
    n, tau = 8192, 20
    z, _ = ar1(n, tau, rng)
    x = 1.0 + 0.25 * z + 1.5 * np.exp(-np.arange(n) / 300)       # equilibrium mean 1, decaying initial transient
    t0s = np.arange(0, 6001, 50)
    ne = np.array([(n - t) / stat_ineff(x[t:]) for t in t0s])
    best = t0s[np.argmax(ne)]
    fig, axs = plt.subplots(2, 1, figsize=(7.2, 4.6), sharex=True, gridspec_kw=dict(hspace=0.18, height_ratios=[1, 1]))
    a = axs[0]
    a.axvspan(0, best, color=style.BG2, lw=0)
    a.plot(np.arange(n), x, color=style.BLUE, lw=0.6)
    a.axhline(1.0, color=style.INK3, lw=1, ls=(0, (4, 3)))
    m_all, m_cut = x.mean(), x[best:].mean()
    a.annotate("discarded", (best * 0.6, 0.35), xytext=(best + 500, 0.3), fontsize=8.5, color=style.INK2,
               va="center", arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8))
    a.text(8100, 2.2, f"mean of all frames {m_all:.3f}\nmean after cut {m_cut:.3f}   (true 1.000)", ha="right",
           va="center", fontsize=8.5, color=style.INK2)
    a.set_ylabel("observable")
    a.set_ylim(0.1, 2.75)
    a = axs[1]
    a.plot(t0s, ne, color=style.TEAL)
    a.plot(best, ne.max(), "o", ms=7, color=style.TEAL)
    a.axvline(best, color=style.TEAL, lw=1, ls=(0, (2, 2)))
    a.annotate(f"maximum: discard the first {best:,} steps,\n{ne.max():.0f} effectively independent samples remain",
               (best, ne.max()), xytext=(best + 1200, ne.max() * 1.12), fontsize=8.5, color=style.INK2, va="center",
               arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=4))
    a.annotate("too little discarded:\nthe transient inflates the variance", (0, ne[0]), xytext=(900, ne.max() * 0.3),
               fontsize=8.5, color=style.INK2, va="center",
               arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=3))
    a.text(5950, ne[-1] + 0.3 * ne.max(), "too much discarded:\ndata thrown away", fontsize=8.5, color=style.INK2, ha="right",
           va="bottom")
    a.set_ylim(0, ne.max() * 1.3)
    a.set_xlim(0, n)
    a.set_xlabel("MD step")
    a.set_ylabel("$N_{\\mathrm{eff}}$ after discarding $t_0$")
    style.save(fig, SLUG, "equilibration")
    return dict(best=best, nemax=ne.max(), ne0=ne[0], m_all=m_all, m_cut=m_cut)


# ---------------------------------------------------------------- 3. radial distribution function
def fcc(nc, L):
    a = L / nc
    b = np.array([[0, 0, 0], [.5, .5, 0], [.5, 0, .5], [0, .5, .5]])
    g = np.array([[i, j, k] for i in range(nc) for j in range(nc) for k in range(nc)], float)
    return ((g[:, None, :] + b[None]) * a).reshape(-1, 3)


def lj_forces(x, L, rc=2.5):
    d = x[:, None, :] - x[None, :, :]
    d -= L * np.round(d / L)
    r2 = (d * d).sum(-1)
    np.fill_diagonal(r2, np.inf)
    ir2 = np.where(r2 < rc * rc, 1 / r2, 0.0)
    s6 = ir2 ** 3
    return ((24 * ir2 * s6 * (2 * s6 - 1))[..., None] * d).sum(1)


def argon_frames(n_equil=1500, n_prod=6000, every=20, seed=11):
    rho = 1.374e3 / (MASS_U * AMU) * (SIG_NM * 1e-9) ** 3
    T, N, dt = 94.4 / EPS_K, 108, 0.005
    L = (N / rho) ** (1 / 3)
    rng = np.random.default_rng(seed)
    x = fcc(3, L)
    v = rng.normal(0, np.sqrt(T), (N, 3))
    v -= v.mean(0)
    f = lj_forces(x, L)
    frames = []
    for s in range(n_equil + n_prod):
        v += 0.5 * dt * f
        x = (x + dt * v) % L
        f = lj_forces(x, L)
        v += 0.5 * dt * f
        if s < n_equil and s % 20 == 0:
            v *= np.sqrt(T * 3 * (N - 1) / (v * v).sum())
        if s >= n_equil and (s - n_equil) % every == 0:
            frames.append(x.copy())
    return np.array(frames), L, rho


def rdf():
    frames, L, rho = argon_frames()
    N = frames.shape[1]
    dr = 0.02
    edges = np.arange(0, L / 2 + 1e-9, dr)
    h = np.zeros(len(edges) - 1)
    for x in frames:
        d = x[:, None, :] - x[None, :, :]
        d -= L * np.round(d / L)
        r = np.sqrt((d * d).sum(-1))[np.triu_indices(N, 1)]
        h += np.histogram(r, edges)[0] * 2
    rc = 0.5 * (edges[1:] + edges[:-1])
    shell = 4 / 3 * np.pi * (edges[1:] ** 3 - edges[:-1] ** 3)
    g = h / (len(frames) * N * rho * shell)
    ip = np.argmax(g)
    imin = ip + np.argmin(g[ip:ip + int(0.8 / dr)])
    nrun = np.cumsum(4 * np.pi * rho * g * rc ** 2 * dr)
    n1 = nrun[imin]
    rn = rc * SIG_NM
    out = dict(rpk=rn[ip], gpk=g[ip], rmin=rn[imin], n1=n1, N=N, L=L * SIG_NM, frames=len(frames))

    fig = plt.figure(figsize=(7.2, 3.5))
    gs = fig.add_gridspec(1, 2, width_ratios=[1, 1.35], wspace=0.28)
    a = fig.add_subplot(gs[0, 0])
    # a slab through the last frame, centred on a reference atom, drawn in nm
    x = frames[-1]
    ref = x[0]
    d = x - ref
    d -= L * np.round(d / L)
    # include periodic images so the slab is full
    shifts = np.array([[i, j, 0] for i in (-1, 0, 1) for j in (-1, 0, 1)]) * L
    pts = (d[None, :, :] + shifts[:, None, :]).reshape(-1, 3)
    slab = np.abs(pts[:, 2]) < 0.5
    p = pts[slab] * SIG_NM
    R = 1.0
    r1, r2 = rn[ip] - 0.03, rn[ip] + 0.03
    a.add_patch(Wedge((0, 0), rn[imin], 0, 360, width=rn[imin] - 0.0, fc=style.TINT[style.TEAL], ec="none"))
    a.add_patch(Wedge((0, 0), r2, 0, 360, width=r2 - r1, fc=style.TINT[style.ORANGE], ec=style.ORANGE, lw=0.8))
    a.add_patch(Circle((0, 0), rn[imin], fc="none", ec=style.TEAL, lw=1.2, ls=(0, (3, 2))))
    for q in p:
        rr = np.hypot(q[0], q[1])
        if rr < 1e-6:
            continue
        if rr > R - 0.05:
            continue
        col = style.TEAL if rr < rn[imin] else style.INK3
        a.add_patch(Circle((q[0], q[1]), 0.06, fc=col, ec="white", lw=0.6, alpha=1 if rr < rn[imin] else 0.55))
    a.add_patch(Circle((0, 0), 0.07, fc=style.ORANGE, ec="white", lw=0.8, zorder=5))
    a.set_xlim(-R, R)
    a.set_ylim(-R, R)
    a.set_aspect("equal")
    a.axis("off")
    a.annotate("shell $r$ to $r + \\Delta r$", (r2 * np.cos(2.3), r2 * np.sin(2.3)), xytext=(-1.0, 1.05),
               fontsize=8.5, color=style.ORANGE, va="center",
               arrowprops=dict(arrowstyle="-", color=style.ORANGE, lw=0.8, shrinkB=2))
    a.annotate("first minimum:\nedge of the first shell", (rn[imin] * np.cos(-0.6), rn[imin] * np.sin(-0.6)),
               xytext=(0.05, -1.08), fontsize=8.5, color=style.TEAL, va="center",
               arrowprops=dict(arrowstyle="-", color=style.TEAL, lw=0.8, shrinkB=2))
    a.set_title("a 0.34 nm slice around one atom", fontsize=10)
    b = fig.add_subplot(gs[0, 1])
    b.axhline(1, color=style.LINE, lw=1, zorder=0)
    b.fill_between(rn[:imin + 1], 0, g[:imin + 1], color=style.TINT[style.TEAL], lw=0)
    b.plot(rn, g, color=style.BLUE)
    b.set_xlim(0, rn[-1])
    b.set_ylim(0, g[ip] * 1.15)
    b.set_xlabel("distance $r$ (nm)")
    b.set_ylabel("$g(r)$")
    b.set_title("radial distribution function")
    b.annotate(f"first peak {rn[ip]:.3f} nm,\nheight {g[ip]:.1f}", (rn[ip], g[ip]), xytext=(rn[ip] + 0.12, g[ip] * 0.93),
               fontsize=8.5, color=style.INK2, va="center",
               arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=3))
    b.annotate(f"first minimum {rn[imin]:.2f} nm", (rn[imin], g[imin]), xytext=(rn[imin] + 0.08, 0.25),
               fontsize=8.5, color=style.INK2, va="center",
               arrowprops=dict(arrowstyle="-", color=style.INK3, lw=0.8, shrinkB=3))
    b.text(0.445, 0.3, f"area:\n$n_1$ = {n1:.1f}", fontsize=8.5, color=style.TEAL, ha="center")
    style.save(fig, SLUG, "rdf")
    return out


# ---------------------------------------------------------------- 4. wrapped versus unwrapped MSD
def unwrap():
    rng = np.random.default_rng(1)
    D, dt, frames, atoms, L = 0.5, 0.01, 6000, 200, 3.0          # nm^2/ns, ns, nm
    steps = rng.normal(scale=np.sqrt(2 * D * dt), size=(frames, atoms, 3))
    pos = rng.uniform(0, L, (atoms, 3)) + np.cumsum(steps, axis=0)
    wrapped = pos % L
    lags = np.unique(np.round(np.logspace(0, np.log10(frames // 2), 50)).astype(int))
    mu = np.array([np.mean(np.sum((pos[l:] - pos[:-l]) ** 2, -1)) for l in lags])
    mw = np.array([np.mean(np.sum((wrapped[l:] - wrapped[:-l]) ** 2, -1)) for l in lags])
    t = lags * dt
    fig = plt.figure(figsize=(7.2, 3.3))
    gs = fig.add_gridspec(1, 2, width_ratios=[1, 1.5], wspace=0.25)
    a = fig.add_subplot(gs[0, 0])
    a.add_patch(Rectangle((0, 0), 1, 1, fc=style.BG2, ec=style.INK3, lw=1.2))
    # a path that leaves through the right face
    tt = np.linspace(0, 1, 60)
    px = 0.35 + 0.95 * tt
    py = 0.35 + 0.25 * np.sin(5 * tt) + 0.2 * tt
    a.plot(px, py, color=style.BLUE, lw=2, ls=(0, (1, 0)))
    inside = px <= 1
    a.plot(px[~inside] - 1, py[~inside], color=style.ORANGE, lw=2)
    a.plot(px[0], py[0], "o", ms=7, color=style.BLUE)
    a.plot(px[-1], py[-1], "o", ms=7, color=style.BLUE)
    a.plot(px[-1] - 1, py[-1], "o", ms=7, color=style.ORANGE)
    a.annotate("", (px[-1] - 1 + 0.03, py[-1] - 0.1), (px[-1] - 0.03, py[-1] - 0.1),
               arrowprops=dict(arrowstyle="-|>,head_width=0.2,head_length=0.4", color=style.ORANGE, lw=1))
    a.text(0.7, py[-1] - 0.17, "wrapped copy jumps\nback by $L$", fontsize=8.5, color=style.ORANGE, ha="center", va="top")
    a.text(1.28, py[-1] + 0.07, "true\nposition", fontsize=8.5, color=style.BLUE, ha="center", va="bottom")
    a.text(0.5, 1.04, "periodic box, side $L$", fontsize=8.5, color=style.INK2, ha="center", va="bottom")
    a.set_xlim(-0.05, 1.45)
    a.set_ylim(-0.05, 1.2)
    a.set_aspect("equal")
    a.axis("off")
    b = fig.add_subplot(gs[0, 1])
    b.plot(t, mu, color=style.BLUE)
    b.plot(t, mw, color=style.ORANGE)
    b.axhline(L ** 2 / 2, color=style.INK3, lw=1, ls=(0, (4, 3)))
    b.text(9.8, L ** 2 / 2 + 0.8, f"wrapped: saturates at $L^2/2$ = {L ** 2 / 2:.1f} nm$^2$", fontsize=8.5,
           color=style.ORANGE, ha="right")
    b.text(6.2, 6 * D * 6.2 + 1, f"unwrapped: 6$Dt$, slope gives\n$D$ = {np.polyfit(t[t > 1], mu[t > 1], 1)[0] / 6:.2f} nm$^2$/ns",
           fontsize=8.5, color=style.BLUE, ha="right", va="bottom")
    b.set_xlim(0, 10)
    b.set_ylim(0, 6 * D * 10 * 1.05)
    b.set_xlabel("lag time (ns)")
    b.set_ylabel("MSD (nm$^2$)")
    style.save(fig, SLUG, "unwrap")
    return dict(Dfit=np.polyfit(t[t > 1], mu[t > 1], 1)[0] / 6, plateau=mw[-1])


def cover():
    def draw(ax):
        rng = np.random.default_rng(4)
        n = 180
        x, _ = ar1(n, 5, rng)
        xs = np.linspace(0.25, 2.55, n)
        ax.plot(xs, 1.5 + 0.38 * x, color=style.BLUE, lw=3, solid_joinstyle="round")
        m = 1.5 + 0.38 * x.mean()
        ax.plot([2.55, 3.1], [1.5 + 0.38 * x[-1], m], color=style.INK3, lw=2, ls=(0, (2, 2)))
        ax.plot([3.35, 3.35], [m - 0.55, m + 0.55], color=style.ORANGE, lw=6, solid_capstyle="round")
        for yy in (m - 0.55, m + 0.55):
            ax.plot([3.15, 3.55], [yy, yy], color=style.ORANGE, lw=6, solid_capstyle="round")
        ax.add_patch(Circle((3.35, m), 0.2, color=style.PINK, zorder=5))
    style.cover(SLUG, draw, bg=style.TINT[style.BLUE])


if __name__ == "__main__":
    only = set(sys.argv[1:])
    run = lambda name: not only or name in only
    if run("neff"): print("neff:", neff())
    if run("equilibration"): print("equilibration:", equilibration())
    if run("rdf"): print("rdf:", rdf())
    if run("unwrap"): print("unwrap:", unwrap())
    if run("cover"): cover()
