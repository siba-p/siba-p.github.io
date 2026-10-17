/* Rare events II: replica exchange, transition path sampling, Markov state models, slow coordinates
   (TICA versus PCA), and Boltzmann-generator style importance reweighting. Units: k_B T_min = 1. */
(function () {
  "use strict";
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const tempCol = f => `rgb(${Math.round(76 + (230 - 76) * f)},${Math.round(110 + (73 - 110) * f)},${Math.round(245 + (128 - 245) * f)})`;

  /* ---------------- 1. replica exchange ---------------- */
  LW.register("remd", function (root) {
    let M = 6, Tmax = 6, swaps = true, reps, hist, acc = [0, 0], r = LW.rng(2), tlog = [];
    const U = x => 2.2 * (1 - Math.cos(3 * Math.PI * x)) + 1.2 * x * x * x * x + 0.8 * x, X0 = -2, X1 = 2, NB = 100, DX = (X1 - X0) / NB;
    const P = LW.canvas(root, { height: w => (w < 640 ? 640 : 440) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Replicas", min: 2, max: 10, step: 1, value: M, fmt: v => String(v), onInput: v => { M = v; reset(); } });
    LW.slider(ctl, { label: "Highest temperature T<sub>max</sub>", min: 1.5, max: 15, step: 0.5, value: Tmax, fmt: v => v.toFixed(1), onInput: v => { Tmax = v; reset(); } });
    LW.check(ctl, { label: "Attempt swaps between neighbouring temperatures", value: swaps, onChange: v => { swaps = v; reset(); } });
    const S = LW.stats(root, [["acc", "swap acceptance"], ["wells", "wells visited at T = 1"], ["err", "error of the T = 1 histogram"]]);
    const temps = () => Array.from({ length: M }, (_, i) => Math.pow(Tmax, i / Math.max(1, M - 1)));
    function reset() { reps = temps().map(() => ({ x: -1.35 })); hist = new Float64Array(NB); acc = [0, 0]; tlog = []; draw(); }
    const loop = LW.loop(root, () => { const T = temps(); for (let sweep = 0; sweep < 30; sweep++) { reps.forEach((rp, i) => { for (let k = 0; k < 10; k++) { const xn = rp.x + 0.12 * r.normal(); if (xn > X0 && xn < X1 && r() < Math.exp(-(U(xn) - U(rp.x)) / T[i])) rp.x = xn; } });
        if (swaps) { const i = Math.floor(r() * (M - 1)); const d = (1 / T[i] - 1 / T[i + 1]) * (U(reps[i].x) - U(reps[i + 1].x)); acc[1]++; if (d >= 0 || r() < Math.exp(d)) { acc[0]++; [reps[i], reps[i + 1]] = [reps[i + 1], reps[i]]; } }
        hist[Math.min(NB - 1, Math.max(0, Math.floor((reps[0].x - X0) / DX)))]++; }
      tlog.push(reps.map(rp => rp.x)); if (tlog.length > 300) tlog.shift(); draw(); });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const T = temps(), hh = (H - 100) / 2, xs = LW.linspace(X0, X1, 300);
      const A = LW.axes(ctx, { x: 52, y: 22, w: W - 66, h: hh }, { xr: [X0, X1], yr: [0, 14], ylabel: "U(x) / kT_min", colors: C, xlabels: false, title: "one walker per temperature (blue: T = 1 … red: T_max)", ny: 4 });
      A.clip(); LW.path(ctx, xs, xs.map(U), A, { color: C.ink2, width: 2 }); reps.forEach((rp, i) => LW.dot(ctx, A.sx(rp.x), A.sy(U(rp.x)) - 5, i === 0 ? 7 : 5, tempCol(i / Math.max(1, M - 1)), C.card, 1.5)); ctx.restore();
      const B = LW.axes(ctx, { x: 52, y: 22 + hh + 40, w: W - 66, h: hh - 10 }, { xr: [X0, X1], yr: [0, 1.05], xlabel: "x", colors: C, ylabels: false, title: "histogram of the T = 1 replica (bars) against the exact Boltzmann distribution (line)", ny: 2 });
      const Z = xs.reduce((s, x) => s + Math.exp(-U(x)), 0) * (xs[1] - xs[0]), pe = xs.map(x => Math.exp(-U(x)) / Z), tot = hist.reduce((a, b) => a + b, 0) || 1, dens = Array.from(hist, h => h / tot / DX), m = Math.max(...pe, ...dens);
      B.clip(); dens.forEach((d, i) => { ctx.fillStyle = rgba(BLUE, 0.55); ctx.fillRect(B.sx(X0 + i * DX), B.sy(d / m), B.sx(DX) - B.sx(0) - 1, B.sy(0) - B.sy(d / m)); }); LW.path(ctx, xs, pe.map(v => v / m), B, { color: ROSE, width: 2 }); ctx.restore();
      const wells = new Set(); for (let i = 0; i < NB; i++) if (hist[i] > 3) wells.add(Math.round((X0 + (i + 0.5) * DX) * 1.5)); let err = 0, n = 0; for (let i = 0; i < NB; i++) { const x = X0 + (i + 0.5) * DX, p = Math.exp(-U(x)) / Z; if (p * DX > 0.002) { err += Math.abs(dens[i] - p) * DX; n++; } }
      S.set("acc", acc[1] ? (100 * acc[0] / acc[1]).toFixed(0) + " %" : "–"); S.set("wells", String(wells.size)); S.set("err", (100 * err / 2).toFixed(1) + " % of the probability misplaced");
    }
    P.draw = draw; reset(); loop.start();
  });

  /* ---------------- 2. transition path sampling ---------------- */
  LW.register("tps", function (root) {
    let path = null, trial = null, nAcc = 0, nTry = 0, ens = [], r = LW.rng(21), beta = 1;
    const U = (x, y) => 5 * (x * x - 1) ** 2 + 3 * (y - 0.6 * Math.sin(1.6 * x)) ** 2, g = (x, y) => [20 * x * (x * x - 1) - 6 * (y - 0.6 * Math.sin(1.6 * x)) * 0.96 * Math.cos(1.6 * x), 6 * (y - 0.6 * Math.sin(1.6 * x))];
    const inA = p => p[0] < -0.8, inB = p => p[0] > 0.8, dt = 0.01, gam = 2.5, L = 220;
    const P = LW.canvas(root, { height: w => (w < 640 ? 560 : 400) });
    const ctl = LW.controls(root);
    const runB = LW.button(ctl, "Pause shooting", () => { runB.textContent = loop.toggle() ? "Pause shooting" : "Resume shooting"; }, { primary: true });
    LW.button(ctl, "Restart from a straight path", () => init());
    LW.slider(ctl, { label: "Temperature k<sub>B</sub>T", min: 0.5, max: 2, step: 0.05, value: 1, fmt: v => v.toFixed(2), onInput: v => { beta = 1 / v; init(); } });
    const S = LW.stats(root, [["acc", "accepted shooting moves"], ["rate", "acceptance"], ["len", "frames in the transition region"]]);
    function langevin(p, v, n) { const out = [p.slice()], c1 = Math.exp(-gam * dt), c2 = Math.sqrt((1 - c1 * c1) / beta); let x = p.slice(), u = v.slice();
      for (let k = 0; k < n; k++) { let f = g(...x); u = [u[0] - 0.5 * dt * f[0], u[1] - 0.5 * dt * f[1]]; x = [x[0] + 0.5 * dt * u[0], x[1] + 0.5 * dt * u[1]]; u = [c1 * u[0] + c2 * r.normal(), c1 * u[1] + c2 * r.normal()]; x = [x[0] + 0.5 * dt * u[0], x[1] + 0.5 * dt * u[1]]; f = g(...x); u = [u[0] - 0.5 * dt * f[0], u[1] - 0.5 * dt * f[1]]; out.push(x.slice()); }
      return out; }
    function init() { // initial (non-dynamical) straight path; the first accepted shots replace it with real dynamics
      path = Array.from({ length: L + 1 }, (_, i) => { const t = i / L; return [-1 + 2 * t, 0.6 * Math.sin(1.6 * (-1 + 2 * t))]; }); nAcc = 0; nTry = 0; ens = []; draw(); }
    function shoot() { const i = 1 + Math.floor(r() * (L - 1)), p = path[i], v = [r.normal() / Math.sqrt(beta), r.normal() / Math.sqrt(beta)];
      const fwd = langevin(p, v, L - i), bwd = langevin(p, [-v[0], -v[1]], i).reverse(), np = bwd.concat(fwd.slice(1)); nTry++;
      const ok = inA(np[0]) && inB(np[np.length - 1]); trial = np; if (ok) { path = np; nAcc++; ens.push(np); if (ens.length > 25) ens.shift(); } }
    const loop = LW.loop(root, () => { shoot(); draw(); });
    let img = null, key = "";
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const xr = [-1.7, 1.7], yr = [-1.4, 1.6], sx = W / (xr[1] - xr[0]), sy = (H - 20) / (yr[1] - yr[0]), s2 = Math.min(sx, sy), ox = (W - s2 * (xr[1] - xr[0])) / 2;
      const X = x => ox + (x - xr[0]) * s2, Y = y => 10 + (yr[1] - y) * s2;
      const k2 = W + "x" + H + C.dark; if (key !== k2) { const st = 4, cw = Math.ceil(W / st), ch = Math.ceil(H / st), off = document.createElement("canvas"); off.width = cw; off.height = ch; const oc = off.getContext("2d"), id = oc.createImageData(cw, ch);
        for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const x = xr[0] + (i * st - ox) / s2, y = yr[1] - (j * st - 10) / s2, v = Math.min(U(x, y), 12), col = LW.ramp(0.08 + 0.85 * Math.sqrt(v / 12), C).match(/\d+/g).map(Number), o = 4 * (j * cw + i); id.data[o] = col[0]; id.data[o + 1] = col[1]; id.data[o + 2] = col[2]; id.data[o + 3] = 255; }
        oc.putImageData(id, 0, 0); img = off; key = k2; }
      ctx.drawImage(img, 0, 0, Math.ceil(W / 4) * 4, Math.ceil(H / 4) * 4);
      ctx.fillStyle = rgba(TEAL, 0.15); ctx.fillRect(X(xr[0]), 0, X(-0.8) - X(xr[0]), H); ctx.fillRect(X(0.8), 0, X(xr[1]) - X(0.8), H);
      LW.text(ctx, "A", X(-1.35), 30, { color: C.ink, size: 14, weight: 700 }); LW.text(ctx, "B", X(1.3), 30, { color: C.ink, size: 14, weight: 700 });
      ens.forEach(p => { ctx.strokeStyle = rgba(ORANGE, 0.18); ctx.lineWidth = 1.2; ctx.beginPath(); p.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1])))); ctx.stroke(); });
      if (trial && trial !== path) { ctx.strokeStyle = rgba("#888888", 0.6); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); trial.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1])))); ctx.stroke(); ctx.setLineDash([]); }
      ctx.strokeStyle = ORANGE; ctx.lineWidth = 2.4; ctx.beginPath(); path.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1])))); ctx.stroke();
      LW.text(ctx, "orange: current transition path   faint: recent accepted paths   dashed grey: last trial", 10, H - 8, { color: C.ink3, size: 10.5 });
      const inT = path.filter(q => q[0] > -0.8 && q[0] < 0.8).length;
      S.set("acc", String(nAcc)); S.set("rate", nTry ? (100 * nAcc / nTry).toFixed(0) + " %" : "–"); S.set("len", String(inT) + " of " + path.length);
    }
    P.draw = draw; init(); loop.start();
  });

  /* ---------------- 3. Markov state model from a long trajectory ---------------- */
  function jacobi(A) { const n = A.length, a = A.map(r => r.slice()), V = A.map((_, i) => A.map((_, j) => (i === j ? 1 : 0)));
    for (let sweep = 0; sweep < 60; sweep++) { let off = 0; for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] ** 2; if (off < 1e-14) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) { if (Math.abs(a[p][q]) < 1e-15) continue; const th = (a[q][q] - a[p][p]) / (2 * a[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; } for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; } for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; } } }
    const ev = a.map((r, i) => r[i]), order = ev.map((_, i) => i).sort((i, j) => ev[j] - ev[i]); return { vals: order.map(i => ev[i]), vecs: order.map(i => V.map(r => r[i])) }; }
  LW.register("msm", function (root) {
    let traj = [], cur = [-1, -0.6], lag = 20, r = LW.rng(31);
    const G = 7, U = (x, y) => { const g1 = Math.exp(-((x + 1) ** 2 + (y + 0.6) ** 2) / 0.18), g2 = Math.exp(-((x - 1) ** 2 + (y + 0.6) ** 2) / 0.18), g3 = Math.exp(-(x ** 2 + (y - 0.9) ** 2) / 0.18); return -4 * g1 - 4 * g2 - 4.6 * g3 + 0.6 * (x ** 4 + y ** 4); };
    const grad = (x, y) => { const h = 1e-4; return [(U(x + h, y) - U(x - h, y)) / (2 * h), (U(x, y + h) - U(x, y - h)) / (2 * h)]; };
    const lo = -1.8, hi = 1.8, cell = p => { const i = Math.min(G - 1, Math.max(0, Math.floor((p[0] - lo) / (hi - lo) * G))), j = Math.min(G - 1, Math.max(0, Math.floor((p[1] - lo) / (hi - lo) * G))); return j * G + i; };
    const P = LW.canvas(root, { height: w => (w < 640 ? 700 : 420) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Lag time τ (saved steps)", min: 1, max: 80, step: 1, value: lag, fmt: v => String(v), onInput: v => { lag = v; draw(); } });
    const runB = LW.button(ctl, "Pause the trajectory", () => { runB.textContent = loop.toggle() ? "Pause the trajectory" : "Continue"; }, { primary: true });
    const S = LW.stats(root, [["n", "saved frames"], ["t2", "slowest implied timescale t₂"], ["t3", "second t₃"], ["states", "microstates visited"]]);
    const loop = LW.loop(root, () => { const dt = 0.01; for (let k = 0; k < 400; k++) { const g = grad(...cur); cur = [cur[0] - dt * g[0] + Math.sqrt(2 * dt / 1.2) * r.normal(), cur[1] - dt * g[1] + Math.sqrt(2 * dt / 1.2) * r.normal()]; if (k % 10 === 0) traj.push(cur.slice()); } if (traj.length > 60000) loop.stop(); draw(); });
    function model(tau) { const n = G * G, Cm = Array.from({ length: n }, () => new Float64Array(n)), d = traj.map(cell); for (let t = 0; t + tau < d.length; t++) Cm[d[t]][d[t + tau]]++;
      const vis = []; for (let i = 0; i < n; i++) if (Cm[i].reduce((a, b) => a + b, 0) > 5) vis.push(i); if (vis.length < 3) return null;
      const Cs = vis.map(i => vis.map(j => Cm[i][j] + Cm[j][i])), pi = Cs.map(r2 => r2.reduce((a, b) => a + b, 0)), tot = pi.reduce((a, b) => a + b, 0);
      const Ssym = Cs.map((r2, i) => r2.map((c, j) => c / Math.sqrt(pi[i] * pi[j]))), E = jacobi(Ssym); return { vis, E, pi: pi.map(p => p / tot) }; }
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640, mw = narrow ? W : W * 0.45, mh = narrow ? 330 : H, sc = Math.min(mw - 20, mh - 20) / (hi - lo), ox = (mw - sc * (hi - lo)) / 2, oy = (mh - sc * (hi - lo)) / 2;
      const X = x => ox + (x - lo) * sc, Y = y => oy + (hi - y) * sc, M = traj.length > 200 ? model(lag) : null;
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const x = lo + (i + 0.5) * (hi - lo) / G, y = lo + (j + 0.5) * (hi - lo) / G; let col = C.bg2;
        if (M) { const k = M.vis.indexOf(j * G + i); if (k >= 0) { const v2 = M.E.vecs[1][k] / Math.sqrt(M.pi[k] || 1e-12), mx = Math.max(...M.E.vecs[1].map((v, q) => Math.abs(v / Math.sqrt(M.pi[q] || 1e-12)))); col = LW.diverge(v2 / (mx || 1), C); } }
        ctx.fillStyle = col; ctx.fillRect(X(lo + i * (hi - lo) / G) + 1, Y(lo + (j + 1) * (hi - lo) / G) + 1, sc * (hi - lo) / G - 2, sc * (hi - lo) / G - 2); void x; void y; }
      ctx.strokeStyle = rgba(ROSE, 0.5); ctx.lineWidth = 0.8; ctx.beginPath(); traj.slice(-600).forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1])))); ctx.stroke();
      LW.text(ctx, "cells: microstates coloured by the slowest eigenvector (its sign splits the states)", 6, mh - 4, { color: C.ink3, size: 10 });
      const gx = narrow ? 50 : mw + 54, gy = narrow ? mh + 30 : 26, gw = narrow ? W - 64 : W - mw - 66, gh = narrow ? H - gy - 40 : H - 66, taus = [1, 2, 4, 6, 10, 15, 20, 30, 40, 60, 80];
      const its = traj.length > 2000 ? taus.map(t => { const m = model(t); if (!m) return [NaN, NaN]; return [1, 2].map(k => (m.E.vals[k] > 0 && m.E.vals[k] < 1 ? -t / Math.log(m.E.vals[k] / m.E.vals[0]) : NaN)); }) : taus.map(() => [NaN, NaN]);
      const ymax = Math.max(100, ...its.flat().filter(isFinite)) * 1.2;
      const A = LW.axes(ctx, { x: gx, y: gy, w: gw, h: gh }, { xr: [0, 80], yr: [0, ymax], xlabel: "lag time τ", ylabel: "implied timescale", colors: C, title: "implied timescales: a good model gives flat lines", ny: 4 });
      A.clip(); LW.path(ctx, taus, its.map(v => v[0]), A, { color: VIOLET, width: 2.2 }); LW.path(ctx, taus, its.map(v => v[1]), A, { color: TEAL, width: 2.2 }); LW.band(ctx, [0, 80], [0, 0], [0, 80], A, rgba(C.dark ? "#ffffff" : "#000000", 0.06));
      ctx.strokeStyle = C.ink3; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(A.sx(lag), A.box.y); ctx.lineTo(A.sx(lag), A.box.y + A.box.h); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      LW.text(ctx, "violet t₂, teal t₃; shaded: timescales shorter than τ cannot be resolved", A.box.x + 6, A.box.y + 14, { color: C.ink3, size: 10.5 });
      const cur2 = M ? [1, 2].map(k => (M.E.vals[k] > 0 && M.E.vals[k] < 1 ? -lag / Math.log(M.E.vals[k] / M.E.vals[0]) : NaN)) : [NaN, NaN];
      S.set("n", String(traj.length)); S.set("t2", isFinite(cur2[0]) ? cur2[0].toFixed(0) + " frames" : "–"); S.set("t3", isFinite(cur2[1]) ? cur2[1].toFixed(0) + " frames" : "–"); S.set("states", M ? String(M.vis.length) : "–");
    }
    P.draw = draw; loop.start(); draw();
  });

  /* ---------------- 4. slow coordinates: TICA versus PCA ---------------- */
  LW.register("tica", function (root) {
    let traj = [], cur = [-0.5, 0], r = LW.rng(41), lag = 10;
    const phi = 0.5, U = (x, y) => { const u = x * Math.cos(phi) + y * Math.sin(phi), w = -x * Math.sin(phi) + y * Math.cos(phi); return 6 * ((u / 0.6) ** 2 - 1) ** 2 + 0.25 * w * w; }; // slow: barrier crossing along u; fast but wide: harmonic w
    const grad = (x, y) => { const h = 1e-4; return [(U(x + h, y) - U(x - h, y)) / (2 * h), (U(x, y + h) - U(x, y - h)) / (2 * h)]; };
    const P = LW.canvas(root, { height: w => (w < 640 ? 640 : 400) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "TICA lag time", min: 1, max: 100, step: 1, value: lag, fmt: v => String(v), onInput: v => { lag = v; draw(); } });
    const S = LW.stats(root, [["pca", "PCA direction (most variance)"], ["tica", "TICA direction (slowest)"], ["true", "true slow direction"], ["n", "frames"]]);
    const loop = LW.loop(root, () => { const dt = 0.004; for (let k = 0; k < 600; k++) { const g = grad(...cur); cur = [cur[0] - dt * g[0] + Math.sqrt(2 * dt) * r.normal(), cur[1] - dt * g[1] + Math.sqrt(2 * dt) * r.normal()]; if (k % 10 === 0) traj.push(cur.slice()); } if (traj.length > 20000) traj.splice(0, 60); draw(); });
    function eig2(a, b, c) { const tr = a + c, det = a * c - b * b, d = Math.sqrt(Math.max(0, tr * tr / 4 - det)), l = tr / 2 + d; let v = Math.abs(b) > 1e-12 ? [b, l - a] : (a >= c ? [1, 0] : [0, 1]); const n = Math.hypot(...v); return [v[0] / n, v[1] / n]; }
    function dirs() { const n = traj.length; if (n < lag + 50) return null; let mx = 0, my = 0; traj.forEach(p => { mx += p[0]; my += p[1]; }); mx /= n; my /= n; let cxx = 0, cxy = 0, cyy = 0; traj.forEach(p => { const a = p[0] - mx, b = p[1] - my; cxx += a * a; cxy += a * b; cyy += b * b; }); cxx /= n; cxy /= n; cyy /= n;
      let kxx = 0, kxy = 0, kyy = 0; for (let t = 0; t + lag < n; t++) { const a = traj[t][0] - mx, b = traj[t][1] - my, a2 = traj[t + lag][0] - mx, b2 = traj[t + lag][1] - my; kxx += a * a2; kxy += 0.5 * (a * b2 + b * a2); kyy += b * b2; } const m = n - lag; kxx /= m; kxy /= m; kyy /= m;
      // generalized eigenproblem K v = λ C v: whiten with C^(-1/2)
      const [e1, e2] = [eig2(cxx, cxy, cyy), [0, 0]]; e2[0] = -e1[1]; e2[1] = e1[0]; const l1 = e1[0] * (cxx * e1[0] + cxy * e1[1]) + e1[1] * (cxy * e1[0] + cyy * e1[1]), l2 = e2[0] * (cxx * e2[0] + cxy * e2[1]) + e2[1] * (cxy * e2[0] + cyy * e2[1]);
      const Wm = [[e1[0] / Math.sqrt(l1), e2[0] / Math.sqrt(l2)], [e1[1] / Math.sqrt(l1), e2[1] / Math.sqrt(l2)]]; // columns: whitening vectors
      const Kw = [[0, 0], [0, 0]]; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const wi = [Wm[0][i], Wm[1][i]], wj = [Wm[0][j], Wm[1][j]]; Kw[i][j] = wi[0] * (kxx * wj[0] + kxy * wj[1]) + wi[1] * (kxy * wj[0] + kyy * wj[1]); }
      const v = eig2(Kw[0][0], Kw[0][1], Kw[1][1]), t = [Wm[0][0] * v[0] + Wm[0][1] * v[1], Wm[1][0] * v[0] + Wm[1][1] * v[1]], tn = Math.hypot(...t);
      return { pca: e1, tica: [t[0] / tn, t[1] / tn], mx, my }; }
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640, mw = narrow ? W : W * 0.45, mh = narrow ? 330 : H, R = 3.5, sc = Math.min(mw, mh) / (2 * R), cx = mw / 2, cy = mh / 2, X = x => cx + x * sc, Y = y => cy - y * sc;
      ctx.fillStyle = C.bg2; ctx.fillRect(0, 0, mw, mh); traj.slice(-4000).forEach(p => { ctx.fillStyle = rgba(BLUE, 0.15); ctx.fillRect(X(p[0]) - 1, Y(p[1]) - 1, 2, 2); });
      const D = dirs(); if (D) { [[D.pca, ORANGE, "PCA"], [D.tica, TEAL, "TICA"]].forEach(([d, col, lab]) => { LW.arrow(ctx, X(D.mx - 2.6 * d[0]), Y(D.my - 2.6 * d[1]), X(D.mx + 2.6 * d[0]), Y(D.my + 2.6 * d[1]), col, 3, 10); LW.text(ctx, lab, X(D.mx + 2.9 * d[0]), Y(D.my + 2.9 * d[1]) + 4, { color: col, size: 12, weight: 700, align: "center" }); }); }
      LW.text(ctx, "two basins along a narrow direction; large but fast fluctuations across it", 6, mh - 6, { color: C.ink3, size: 10 });
      const gx = narrow ? 50 : mw + 54, gw = narrow ? W - 64 : W - mw - 66, gy = narrow ? mh + 30 : 22, gh = narrow ? (H - mh - 90) / 2 : (H - 80) / 2, tail = traj.slice(-800);
      [[D ? D.pca : null, ORANGE, "projection on the PCA direction"], [D ? D.tica : null, TEAL, "projection on the TICA direction"]].forEach(([d, col, title], k) => {
        const A = LW.axes(ctx, { x: gx, y: gy + k * (gh + 40), w: gw, h: gh }, { xr: [0, 800], yr: [-3.5, 3.5], colors: C, xlabels: false, title, ny: 3 }); if (!d) return; A.clip(); LW.path(ctx, tail.map((_, i) => i), tail.map(p => (p[0] - D.mx) * d[0] + (p[1] - D.my) * d[1]), A, { color: col, width: 1.3 }); ctx.restore(); });
      const ang = d => ((Math.atan2(d[1], d[0]) * 180 / Math.PI) % 180 + 180) % 180;
      S.set("pca", D ? ang(D.pca).toFixed(0) + "°" : "–"); S.set("tica", D ? ang(D.tica).toFixed(0) + "°" : "–"); S.set("true", (phi * 180 / Math.PI).toFixed(0) + "°"); S.set("n", String(traj.length));
    }
    P.draw = draw; loop.start(); draw();
  });

  /* ---------------- 5. Boltzmann generators: sample a proposal, reweight to the target ---------------- */
  LW.register("bgen", function (root) {
    let cover = 1, width = 0.45, N = 2000, samples = [], r = LW.rng(5);
    const U = (x, y) => 3 * (x * x - 1) ** 2 + 2 * y * y, X0 = -2.2, X1 = 2.2;
    const P = LW.canvas(root, { height: w => (w < 640 ? 640 : 380) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "The generator has learned", options: [["1", "both states"], ["0", "only state A (mode collapse)"]], value: "1", onChange: v => { cover = +v; draw(); } });
    LW.slider(ctl, { label: "Width of the learned modes", min: 0.15, max: 1.0, step: 0.01, value: width, fmt: v => v.toFixed(2), onInput: v => { width = v; draw(); } });
    LW.button(ctl, "Draw new samples", () => { r = LW.rng(Math.floor(Math.random() * 1e6)); draw(); }, { primary: true });
    const S = LW.stats(root, [["ess", "effective sample size"], ["pB", "P(state B): reweighted"], ["ex", "P(state B): exact"]]);
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640;
      const modes = cover ? [[-1, 0, 0.5], [1, 0, 0.5]] : [[-1, 0, 1]], q = (x, y) => modes.reduce((s, [mx, my, w]) => s + w * Math.exp(-((x - mx) ** 2 + (y - my) ** 2) / (2 * width * width)) / (2 * Math.PI * width * width), 0);
      samples = []; for (let i = 0; i < N; i++) { let u = r(), k = 0; while (k < modes.length - 1 && u > modes[k][2]) { u -= modes[k][2]; k++; } const x = modes[k][0] + width * r.normal(), y = modes[k][1] + width * r.normal(); samples.push([x, y, -U(x, y) - Math.log(q(x, y))]); }
      const m = Math.max(...samples.map(s => s[2])), ws = samples.map(s => Math.exp(s[2] - m)), sw = ws.reduce((a, b) => a + b, 0), ess = sw * sw / ws.reduce((a, b) => a + b * b, 0);
      const pB = samples.reduce((a, s, i) => a + (s[0] > 0 ? ws[i] : 0), 0) / sw;
      const mw = narrow ? W : W * 0.5, mh = narrow ? 300 : H, R = 2.2, sc = Math.min(mw, mh) / (2 * R), cx = mw / 2, cy = mh / 2, Xs = x => cx + x * sc, Ys = y => cy - y * sc;
      ctx.fillStyle = C.bg2; ctx.fillRect(0, 0, mw, mh);
      const wm = Math.max(...ws); samples.forEach((s, i) => LW.dot(ctx, Xs(s[0]), Ys(s[1]), 1.2 + 4 * Math.sqrt(ws[i] / wm), rgba(ws[i] / wm > 0.05 ? ORANGE : BLUE, 0.45), null));
      LW.text(ctx, "samples from the generator; dot size = importance weight p/q", 6, mh - 6, { color: C.ink3, size: 10 });
      const gx = narrow ? 50 : mw + 54, gy = narrow ? mh + 30 : 26, gw = narrow ? W - 64 : W - mw - 66, gh = narrow ? H - gy - 40 : H - 66, nb = 40, dx = (X1 - X0) / nb, hr = new Float64Array(nb), hw = new Float64Array(nb);
      samples.forEach((s, i) => { const b = Math.floor((s[0] - X0) / dx); if (b >= 0 && b < nb) { hr[b]++; hw[b] += ws[i]; } });
      const xs = LW.linspace(X0, X1, 200), pe = xs.map(x => Math.exp(-3 * (x * x - 1) ** 2)), Ze = pe.reduce((a, b) => a + b, 0) * (xs[1] - xs[0]), dr = Array.from(hr, h => h / N / dx), dw = Array.from(hw, h => h / sw / dx), mm = Math.max(...pe.map(p => p / Ze), ...dr, ...dw);
      const A = LW.axes(ctx, { x: gx, y: gy, w: gw, h: gh }, { xr: [X0, X1], yr: [0, mm * 1.1], xlabel: "x", colors: C, ylabels: false, title: "density along x: raw samples (blue), reweighted (orange), exact Boltzmann (line)", ny: 2 });
      A.clip(); for (let i = 0; i < nb; i++) { ctx.fillStyle = rgba(BLUE, 0.35); ctx.fillRect(A.sx(X0 + i * dx), A.sy(dr[i]), A.sx(dx) - A.sx(0) - 1, A.sy(0) - A.sy(dr[i])); ctx.fillStyle = rgba(ORANGE, 0.55); ctx.fillRect(A.sx(X0 + i * dx) + 2, A.sy(dw[i]), A.sx(dx) - A.sx(0) - 5, A.sy(0) - A.sy(dw[i])); }
      LW.path(ctx, xs, pe.map(p => p / Ze), A, { color: ROSE, width: 2 }); ctx.restore();
      S.set("ess", ess.toFixed(0) + " of " + N + " (" + (100 * ess / N).toFixed(0) + " %)"); S.set("pB", pB.toFixed(3)); S.set("ex", "0.500");
    }
    P.draw = draw; draw();
  });
})();
