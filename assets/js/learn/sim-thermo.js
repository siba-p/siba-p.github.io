/* Molecular simulation: Metropolis Monte Carlo, thermostats compared on a 2D Lennard-Jones fluid, and
   transport coefficients (Einstein and Green–Kubo) from the same fluid. Reduced LJ units. */
(function () {
  "use strict";
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  /* ---------- a small 2D Lennard-Jones engine shared by the figures ---------- */
  function ljSystem(N, rho, T, seed) {
    const L = Math.sqrt(N / rho), x = new Float64Array(N), y = new Float64Array(N), vx = new Float64Array(N), vy = new Float64Array(N), fx = new Float64Array(N), fy = new Float64Array(N), r = LW.rng(seed || 1);
    const side = Math.ceil(Math.sqrt(N)), a = L / side; let sx = 0, sy = 0;
    for (let i = 0; i < N; i++) { x[i] = (i % side + 0.5) * a; y[i] = (Math.floor(i / side) + 0.5) * a; vx[i] = r.normal() * Math.sqrt(T); vy[i] = r.normal() * Math.sqrt(T); sx += vx[i]; sy += vy[i]; }
    for (let i = 0; i < N; i++) { vx[i] -= sx / N; vy[i] -= sy / N; }
    const S = { N, L, x, y, vx, vy, fx, fy, pe: 0, r, ux: new Float64Array(N), uy: new Float64Array(N) }; // ux, uy: unwrapped positions
    for (let i = 0; i < N; i++) { S.ux[i] = x[i]; S.uy[i] = y[i]; }
    S.forces = () => { fx.fill(0); fy.fill(0); let pe = 0; const rc2 = 6.25, esh = 4 * (Math.pow(2.5, -12) - Math.pow(2.5, -6));
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { let dx = x[j] - x[i], dy = y[j] - y[i]; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); const r2 = dx * dx + dy * dy; if (r2 < rc2) { const ir2 = 1 / r2, s6 = ir2 * ir2 * ir2, f = 24 * ir2 * s6 * (2 * s6 - 1); fx[i] -= f * dx; fy[i] -= f * dy; fx[j] += f * dx; fy[j] += f * dy; pe += 4 * s6 * (s6 - 1) - esh; } }
      S.pe = pe; };
    S.ke = () => { let k = 0; for (let i = 0; i < N; i++) k += 0.5 * (vx[i] * vx[i] + vy[i] * vy[i]); return k; };
    S.step = (dt, kick) => { for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; const dx = dt * vx[i], dy = dt * vy[i]; x[i] += dx; y[i] += dy; S.ux[i] += dx; S.uy[i] += dy; x[i] -= L * Math.floor(x[i] / L); y[i] -= L * Math.floor(y[i] / L); }
      S.forces(); for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; } if (kick) kick(S, dt); };
    S.forces(); return S;
  }

  /* ---------------- 1. Metropolis Monte Carlo ---------------- */
  LW.register("metropolis", function (root) {
    let step = 0.5, T = 1, x = -1, chain = [], hist, NB = 80, X0 = -2.2, X1 = 2.2, last = null, nAcc = 0, nTry = 0, r = LW.rng(4), slow = true;
    const U = s => 4 * (s * s - 1) ** 2 + 0.5 * s;
    const P = LW.canvas(root, { height: w => (w < 640 ? 600 : 420) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Maximum trial step Δ", min: 0.02, max: 3, value: step, log: true, fmt: v => v.toFixed(2), onInput: v => { step = v; reset(); } });
    LW.slider(ctl, { label: "Temperature k<sub>B</sub>T", min: 0.3, max: 3, step: 0.05, value: T, fmt: v => v.toFixed(2), onInput: v => { T = v; reset(); } });
    LW.check(ctl, { label: "Slow motion (show each trial)", value: slow, onChange: v => { slow = v; } });
    const S = LW.stats(root, [["acc", "acceptance rate"], ["n", "trials"], ["tau", "integrated autocorrelation time"], ["neff", "effective independent samples"]]);
    function reset() { x = -1; chain = []; hist = new Float64Array(NB); nAcc = 0; nTry = 0; last = null; draw(); }
    function trial() { const xn = x + (2 * r() - 1) * step, dU = U(xn) - U(x), acc = xn > X0 && xn < X1 && (dU <= 0 || r() < Math.exp(-dU / T)); nTry++; last = { from: x, to: xn, acc }; if (acc) { x = xn; nAcc++; } chain.push(x); if (chain.length > 20000) chain.shift(); hist[Math.max(0, Math.min(NB - 1, Math.floor((x - X0) / (X1 - X0) * NB)))]++; }
    let tick = 0; const loop = LW.loop(root, () => { tick++; if (slow) { if (tick % 12 === 0) trial(); } else for (let k = 0; k < 400; k++) trial(); draw(); });
    function tauInt() { const n = chain.length; if (n < 500) return NaN; const m = chain.reduce((a, b) => a + b, 0) / n, v = chain.reduce((a, b) => a + (b - m) ** 2, 0) / n; if (v === 0) return NaN; let tau = 0.5; for (let t = 1; t < Math.min(2000, n / 5); t++) { let c = 0; for (let i = 0; i + t < n; i += 2) c += (chain[i] - m) * (chain[i + t] - m); c /= Math.ceil((n - t) / 2) * v; if (c < 0.05) break; tau += c; } return tau; }
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const hh = (H - 100) / 2, xs = LW.linspace(X0, X1, 300);
      const A = LW.axes(ctx, { x: 52, y: 22, w: W - 66, h: hh }, { xr: [X0, X1], yr: [-0.5, 10], ylabel: "U(x)", colors: C, xlabels: false, title: "trial moves: green accepted, rose rejected", ny: 4 });
      A.clip(); LW.path(ctx, xs, xs.map(U), A, { color: BLUE, width: 2.4 });
      if (last) { const col = last.acc ? TEAL : ROSE; LW.arrow(ctx, A.sx(last.from), A.sy(U(last.from)) - 14, A.sx(LW.clamp(last.to, X0, X1)), A.sy(U(LW.clamp(last.to, X0, X1))) - 14, col, 2.2, 8); LW.dot(ctx, A.sx(LW.clamp(last.to, X0, X1)), A.sy(U(LW.clamp(last.to, X0, X1))), 5, null, col, 2); }
      LW.dot(ctx, A.sx(x), A.sy(U(x)), 7, ORANGE, C.card, 2); ctx.restore();
      const B = LW.axes(ctx, { x: 52, y: 22 + hh + 40, w: W - 66, h: hh - 10 }, { xr: [X0, X1], yr: [0, 1.05], xlabel: "x", colors: C, ylabels: false, title: "histogram of the chain against the Boltzmann distribution e^(−U/kT)", ny: 2 });
      const pe = xs.map(s => Math.exp(-U(s) / T)), Z = pe.reduce((a, b) => a + b, 0) * (xs[1] - xs[0]), dx = (X1 - X0) / NB, tot = hist.reduce((a, b) => a + b, 0) || 1, dens = Array.from(hist, h => h / tot / dx), m = Math.max(...pe.map(p => p / Z), ...dens);
      B.clip(); dens.forEach((d, i) => { ctx.fillStyle = rgba(ORANGE, 0.5); ctx.fillRect(B.sx(X0 + i * dx), B.sy(d / m), B.sx(dx) - B.sx(0) - 1, B.sy(0) - B.sy(d / m)); }); LW.path(ctx, xs, pe.map(p => p / Z / m), B, { color: ROSE, width: 2 }); ctx.restore();
      const tau = tauInt(); S.set("acc", nTry ? (100 * nAcc / nTry).toFixed(0) + " %" : "–"); S.set("n", String(nTry)); S.set("tau", isFinite(tau) ? tau.toFixed(1) + " trials" : "collecting…"); S.set("neff", isFinite(tau) ? String(Math.round(chain.length / (2 * tau))) : "–");
    }
    P.draw = draw; reset(); loop.start();
  });

  /* ---------------- 2. thermostats compared ---------------- */
  const THERMO = { nve: "NVE (no thermostat)", rescale: "Velocity rescaling", berendsen: "Berendsen", andersen: "Andersen", langevin: "Langevin", nh: "Nosé–Hoover", csvr: "Bussi (CSVR)" };
  LW.register("thermostats", function (root) {
    let kind = "csvr", sys, T0 = 1.0, tau = 0.5, Ks = [], Tlog = [], xi = 0, r = LW.rng(9);
    const N = 36, dt = 0.004, ndf = 2 * N - 2;
    const P = LW.canvas(root, { height: w => (w < 640 ? 620 : 380) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Thermostat", options: Object.keys(THERMO).map(k => [k, THERMO[k]]), value: kind, onChange: v => { kind = v; reset(); } });
    LW.slider(ctl, { label: "Coupling time τ (or 1/γ)", min: 0.05, max: 5, value: tau, log: true, fmt: v => v.toFixed(2), onInput: v => { tau = v; Ks = []; } });
    const S = LW.stats(root, [["T", "mean temperature"], ["sd", "relative fluctuation of K"], ["ex", "canonical value √(2/N_df)"], ["ok", "verdict"]]);
    function reset() { sys = ljSystem(N, 0.6, T0, 5); xi = 0; Ks = []; Tlog = []; for (let k = 0; k < 400; k++) sys.step(dt, therm); Ks = []; draw(); }
    function therm(s) { const K = s.ke(), Kt = 0.5 * ndf * T0;
      if (kind === "rescale") { const lam = Math.sqrt(Kt / K); for (let i = 0; i < N; i++) { s.vx[i] *= lam; s.vy[i] *= lam; } }
      else if (kind === "berendsen") { const lam = Math.sqrt(1 + dt / tau * (Kt / K - 1)); for (let i = 0; i < N; i++) { s.vx[i] *= lam; s.vy[i] *= lam; } }
      else if (kind === "andersen") { const p = dt / tau; for (let i = 0; i < N; i++) if (r() < p) { s.vx[i] = r.normal() * Math.sqrt(T0); s.vy[i] = r.normal() * Math.sqrt(T0); } }
      else if (kind === "langevin") { const c1 = Math.exp(-dt / tau), c2 = Math.sqrt((1 - c1 * c1) * T0); for (let i = 0; i < N; i++) { s.vx[i] = c1 * s.vx[i] + c2 * r.normal(); s.vy[i] = c1 * s.vy[i] + c2 * r.normal(); } }
      else if (kind === "nh") { const Q = ndf * T0 * tau * tau; xi += dt * (2 * K - ndf * T0) / Q; const lam = Math.exp(-xi * dt); for (let i = 0; i < N; i++) { s.vx[i] *= lam; s.vy[i] *= lam; } }
      else if (kind === "csvr") { // Bussi–Donadio–Parrinello stochastic velocity rescaling
        const c = Math.exp(-dt / tau), R1 = r.normal(); let sumR2 = 0; for (let k = 0; k < ndf - 1; k++) { const g = r.normal(); sumR2 += g * g; }
        const Knew = K + (1 - c) * (Kt * (R1 * R1 + sumR2) / ndf - K) + 2 * R1 * Math.sqrt(c * (1 - c) * K * Kt / ndf), lam = Math.sqrt(Math.max(Knew, 1e-12) / K); for (let i = 0; i < N; i++) { s.vx[i] *= lam; s.vy[i] *= lam; } } }
    const loop = LW.loop(root, () => { for (let k = 0; k < 20; k++) { sys.step(dt, therm); Ks.push(sys.ke()); } if (Ks.length > 30000) Ks.splice(0, 20); Tlog.push(2 * sys.ke() / ndf); if (Tlog.length > 400) Tlog.shift(); draw(); });
    function lgamma(z) { const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z); z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i); const t = z + g + 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x); }
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640, side = narrow ? Math.min(W - 20, 220) : Math.min(H - 30, W * 0.28), ox = 10, oy = 10, sc = side / sys.L;
      ctx.fillStyle = C.bg2; ctx.fillRect(ox, oy, side, side); for (let i = 0; i < N; i++) { const sp = Math.hypot(sys.vx[i], sys.vy[i]); LW.dot(ctx, ox + sys.x[i] * sc, oy + sys.y[i] * sc, Math.max(3, 0.5 * sc), LW.ramp(0.2 + 0.8 * Math.min(1, sp / 2.5), C), null); }
      const gx = narrow ? 50 : ox + side + 56, gw = narrow ? W - 64 : W - gx - 14, g1y = narrow ? oy + side + 30 : 22, g1h = narrow ? 120 : (H - 100) * 0.4, g2y = g1y + g1h + 44, g2h = narrow ? H - g2y - 40 : H - g2y - 36;
      const A = LW.axes(ctx, { x: gx, y: g1y, w: gw, h: g1h }, { xr: [0, 400], yr: [0, 2 * T0], ylabel: "T(t)", colors: C, xlabels: false, ny: 3, title: "instantaneous kinetic temperature" });
      A.clip(); LW.path(ctx, [0, 400], [T0, T0], A, { color: GOLD, width: 1.2, dash: [4, 4] }); LW.path(ctx, Tlog.map((_, i) => i), Tlog, A, { color: VIOLET, width: 1.5 }); ctx.restore();
      const Kt = 0.5 * ndf * T0, lo = 0, hi = 2.2 * Kt, nb = 50, dk = (hi - lo) / nb, h = new Float64Array(nb); Ks.forEach(k => { const b = Math.floor((k - lo) / dk); if (b >= 0 && b < nb) h[b]++; });
      const tot = Ks.length || 1, dens = Array.from(h, v => v / tot / dk), ks = LW.linspace(0.01, hi, 200), a = ndf / 2, can = ks.map(k => Math.exp((a - 1) * Math.log(k) - k / T0 - lgamma(a) - a * Math.log(T0))), m = Math.max(...can, ...dens.map(d => Math.min(d, Math.max(...can) * 3)));
      const B = LW.axes(ctx, { x: gx, y: g2y, w: gw, h: g2h }, { xr: [lo, hi], yr: [0, m * 1.05], xlabel: "kinetic energy K", colors: C, ylabels: false, ny: 2, title: "distribution of K against the canonical (gamma) distribution" });
      B.clip(); dens.forEach((d, i) => { ctx.fillStyle = rgba(BLUE, 0.5); ctx.fillRect(B.sx(lo + i * dk), B.sy(Math.min(d, m)), B.sx(dk) - B.sx(0) - 1, B.sy(0) - B.sy(Math.min(d, m))); }); LW.path(ctx, ks, can, B, { color: ROSE, width: 2 }); ctx.restore();
      const mK = Ks.reduce((p, q) => p + q, 0) / tot, sd = Math.sqrt(Ks.reduce((p, q) => p + (q - mK) ** 2, 0) / tot) / (mK || 1), ex = Math.sqrt(2 / ndf);
      S.set("T", (2 * mK / ndf).toFixed(3)); S.set("sd", sd.toFixed(3)); S.set("ex", ex.toFixed(3));
      S.set("ok", Ks.length < 3000 ? "collecting…" : kind === "rescale" ? "no fluctuations at all: not canonical" : kind === "berendsen" ? (sd < 0.75 * ex ? "fluctuations suppressed: not canonical" : "close, but Berendsen does not sample the canonical ensemble") : kind === "nve" ? "microcanonical: K exchanges with potential energy only" : Math.abs(sd / ex - 1) < 0.2 ? "canonical fluctuations ✓" : "converging…");
    }
    P.draw = draw; reset(); loop.start();
  });

  /* ---------------- 3. diffusion from MSD (Einstein) and from the VACF (Green–Kubo) ---------------- */
  LW.register("transport", function (root) {
    let rho = 0.6, T = 1.0, sys, frames = [], NT = 120, every = 5;
    const N = 49, dt = 0.004;
    const P = LW.canvas(root, { height: w => (w < 640 ? 640 : 400) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Density ρ", min: 0.1, max: 0.8, step: 0.01, value: rho, fmt: v => v.toFixed(2), onInput: v => { rho = v; reset(); } });
    LW.slider(ctl, { label: "Temperature T", min: 0.4, max: 2.5, step: 0.05, value: T, fmt: v => v.toFixed(2), onInput: v => { T = v; reset(); } });
    const S = LW.stats(root, [["de", "D from the mean-squared displacement (Einstein)"], ["dg", "D from the velocity autocorrelation (Green–Kubo)"], ["n", "time origins averaged"]]);
    function reset() { sys = ljSystem(N, rho, T, 3); frames = []; for (let k = 0; k < 300; k++) sys.step(dt, therm); draw(); }
    function therm(s) { const K = s.ke(), Kt = (N - 1) * T, c = Math.exp(-dt / 0.5); const lam = Math.sqrt(1 + (1 - c) * (Kt / K - 1)); for (let i = 0; i < N; i++) { s.vx[i] *= lam; s.vy[i] *= lam; } }
    const loop = LW.loop(root, () => { for (let k = 0; k < 10 * every; k++) { sys.step(dt, therm); if (k % every === 0) { frames.push({ ux: Float64Array.from(sys.ux), uy: Float64Array.from(sys.uy), vx: Float64Array.from(sys.vx), vy: Float64Array.from(sys.vy) }); } } if (frames.length > 1500) frames.splice(0, 10); draw(); });
    function corr() { const n = frames.length, msd = new Float64Array(NT), vacf = new Float64Array(NT), cnt = new Float64Array(NT);
      for (let t0 = 0; t0 + 1 < n; t0 += 4) for (let l = 0; l < NT && t0 + l < n; l++) { const a = frames[t0], b = frames[t0 + l]; let s1 = 0, s2 = 0; for (let i = 0; i < N; i++) { s1 += (b.ux[i] - a.ux[i]) ** 2 + (b.uy[i] - a.uy[i]) ** 2; s2 += a.vx[i] * b.vx[i] + a.vy[i] * b.vy[i]; } msd[l] += s1 / N; vacf[l] += s2 / N; cnt[l]++; }
      for (let l = 0; l < NT; l++) if (cnt[l]) { msd[l] /= cnt[l]; vacf[l] /= cnt[l]; } return { msd, vacf, cnt }; }
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640, pw = narrow ? W - 64 : (W - 140) / 2, ph = narrow ? (H - 110) / 2 : H - 60, tl = dt * every, ts = Array.from({ length: NT }, (_, l) => l * tl);
      if (frames.length < 50) { LW.text(ctx, "collecting the trajectory…", 20, 30, { color: C.ink3, size: 12 }); S.set("n", String(frames.length)); return; }
      const { msd, vacf, cnt } = corr(), lmax = cnt.findIndex(c => c < 3), L = lmax > 0 ? lmax : NT;
      const A = LW.axes(ctx, { x: 50, y: 22, w: pw, h: ph }, { xr: [0, ts[NT - 1]], yr: [0, Math.max(0.5, ...Array.from(msd).slice(0, L)) * 1.1], xlabel: "time t", ylabel: "MSD", colors: C, title: "mean-squared displacement: slope 4D in 2D", ny: 4 });
      const a0 = Math.floor(L / 2), xs2 = ts.slice(a0, L), ys2 = Array.from(msd).slice(a0, L), mx = xs2.reduce((p, q) => p + q, 0) / xs2.length, my = ys2.reduce((p, q) => p + q, 0) / ys2.length; let sxy = 0, sxx = 0; xs2.forEach((x, i) => { sxy += (x - mx) * (ys2[i] - my); sxx += (x - mx) ** 2; }); const slope = sxy / sxx, De = slope / 4;
      A.clip(); LW.path(ctx, ts.slice(0, L), Array.from(msd).slice(0, L), A, { color: BLUE, width: 2.4 }); LW.path(ctx, [0, ts[L - 1]], [my - slope * mx, my + slope * (ts[L - 1] - mx)], A, { color: GOLD, width: 1.5, dash: [5, 4] }); ctx.restore();
      const bx = narrow ? 50 : 50 + pw + 70, by = narrow ? 22 + ph + 60 : 22, v0 = vacf[0] || 1;
      const B = LW.axes(ctx, { x: bx, y: by, w: pw, h: ph }, { xr: [0, ts[NT - 1]], yr: [-0.3, 1.05], xlabel: "time t", ylabel: "C_v(t)/C_v(0)", colors: C, title: "velocity autocorrelation and its running integral", ny: 4 });
      let acc = 0; const run = []; for (let l = 0; l < L; l++) { acc += (l === 0 ? 0.5 : 1) * vacf[l] * tl; run.push(acc / 2); }
      B.clip(); LW.path(ctx, [0, ts[NT - 1]], [0, 0], B, { color: C.ink3, width: 1 }); LW.path(ctx, ts.slice(0, L), Array.from(vacf).slice(0, L).map(v => v / v0), B, { color: ORANGE, width: 2.4 });
      const rm = Math.max(...run.map(Math.abs), 1e-6); LW.path(ctx, ts.slice(0, L), run.map(v => v / rm), B, { color: TEAL, width: 1.6, dash: [6, 3] }); ctx.restore();
      LW.text(ctx, "teal: running Green–Kubo integral (scaled)", B.box.x + B.box.w - 4, B.box.y + 14, { color: TEAL, size: 10.5, align: "right" });
      S.set("de", De.toFixed(4)); S.set("dg", run[run.length - 1].toFixed(4)); S.set("n", String(cnt[0]));
    }
    P.draw = draw; reset(); loop.start();
  });
})();
