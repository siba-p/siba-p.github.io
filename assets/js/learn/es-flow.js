/* A Boltzmann generator trained live in the browser.
   A RealNVP normalizing flow (8 affine coupling layers, 24 tanh units each) maps a 2D Gaussian
   to configurations of a double-well potential. It is trained by example (maximum likelihood on
   short simulations), by energy (reverse KL to exp(-u/kT)) or both, with hand-written backprop
   and Adam; samples are then reweighted to the Boltzmann distribution. */
(function () {
  "use strict";
  const U = (x, y) => 8 * (x * x - 1) ** 2 + 0.5 * x + 2 * (y - 0.6 * Math.sin(1.8 * x)) ** 2;
  const dU = (x, y) => { const c = y - 0.6 * Math.sin(1.8 * x); return [32 * x * (x * x - 1) + 0.5 - 4 * c * 0.6 * 1.8 * Math.cos(1.8 * x), 4 * c]; };
  const Fx = x => 8 * (x * x - 1) ** 2 + 0.5 * x;        // exact free energy along x (the y integral is a constant)
  const K = 8, H = 24, S = 2;
  const ia = k => k % 2, ib = k => 1 - (k % 2);
  const TEAL = "#12a594", ORANGE = "#e8792b";

  function rng(seed) { let s = seed >>> 0; const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    r.normal = () => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }; return r; }

  function makeFlow(R) { const L = []; for (let k = 0; k < K; k++) { const p = { W1: new Float64Array(H), b1: new Float64Array(H), Ws: new Float64Array(H), Wt: new Float64Array(H), bs: 0, bt: 0 }; for (let j = 0; j < H; j++) { p.W1[j] = R.normal(); p.b1[j] = 0.5 * R.normal(); p.Ws[j] = 0.01 * R.normal(); p.Wt[j] = 0.01 * R.normal(); } L.push(p); } return L; }
  const zeroLike = () => Array.from({ length: K }, () => ({ W1: new Float64Array(H), b1: new Float64Array(H), Ws: new Float64Array(H), Wt: new Float64Array(H), bs: 0, bt: 0 }));
  function mlp(p, a) { const h = new Float64Array(H); let sr = p.bs, t = p.bt; for (let j = 0; j < H; j++) { h[j] = Math.tanh(p.W1[j] * a + p.b1[j]); sr += p.Ws[j] * h[j]; t += p.Wt[j] * h[j]; } const th = Math.tanh(sr); return { h, th, s: S * th, t }; }
  function mlpBack(p, g, a, c, ds, dt) { const dsr = ds * S * (1 - c.th * c.th); g.bs += dsr; g.bt += dt; let da = 0;
    for (let j = 0; j < H; j++) { g.Ws[j] += dsr * c.h[j]; g.Wt[j] += dt * c.h[j]; const dpre = (dsr * p.Ws[j] + dt * p.Wt[j]) * (1 - c.h[j] * c.h[j]); g.W1[j] += dpre * a; g.b1[j] += dpre; da += dpre * p.W1[j]; } return da; }
  function forward(L, z, keep) { let v = [z[0], z[1]]; const cache = [], path = keep ? [v] : null; let ld = 0;
    for (let k = 0; k < K; k++) { const a = v[ia(k)], b = v[ib(k)], c = mlp(L[k], a), e = Math.exp(c.s), nv = [0, 0]; nv[ia(k)] = a; nv[ib(k)] = b * e + c.t; cache.push({ a, b, c, e }); ld += c.s; v = nv; if (keep) path.push(v); }
    return { x: v, ld, cache, path }; }
  function inverse(L, x) { let v = [x[0], x[1]]; const cache = []; let ld = 0;
    for (let k = K - 1; k >= 0; k--) { const a = v[ia(k)], yb = v[ib(k)], c = mlp(L[k], a), ei = Math.exp(-c.s), b = (yb - c.t) * ei, nv = [0, 0]; nv[ia(k)] = a; nv[ib(k)] = b; cache[k] = { a, b, c, ei }; ld -= c.s; v = nv; }
    return { z: v, ld, cache }; }
  function backKL(L, G, f, kT) { const d = dU(f.x[0], f.x[1]); let g = [d[0] / kT, d[1] / kT];
    for (let k = K - 1; k >= 0; k--) { const { a, b, c, e } = f.cache[k], gb = g[ib(k)], ga = g[ia(k)], da = mlpBack(L[k], G[k], a, c, gb * b * e - 1, gb), ng = [0, 0]; ng[ia(k)] = ga + da; ng[ib(k)] = gb * e; g = ng; } }
  function backML(L, G, r) { let g = [r.z[0], r.z[1]];
    for (let k = 0; k < K; k++) { const { a, b, c, ei } = r.cache[k], gb = g[ib(k)], ga = g[ia(k)], da = mlpBack(L[k], G[k], a, c, 1 - gb * b, -gb * ei), ng = [0, 0]; ng[ia(k)] = ga + da; ng[ib(k)] = gb * ei; g = ng; } }
  function adam(L, G, st, lr, n) { st.t++; const b1 = 0.9, b2 = 0.999, c1 = 1 - b1 ** st.t, c2 = 1 - b2 ** st.t, cl = g => Math.max(-50, Math.min(50, g / n));
    L.forEach((p, k) => { for (const key of ["W1", "b1", "Ws", "Wt"]) { const m = st.m[k][key], v = st.v[k][key], gg = G[k][key], w = p[key]; for (let j = 0; j < H; j++) { const gi = cl(gg[j]); m[j] = b1 * m[j] + (1 - b1) * gi; v[j] = b2 * v[j] + (1 - b2) * gi * gi; w[j] -= lr * (m[j] / c1) / (Math.sqrt(v[j] / c2) + 1e-8); } }
      for (const key of ["bs", "bt"]) { const gi = cl(G[k][key]); st.m[k][key] = b1 * st.m[k][key] + (1 - b1) * gi; st.v[k][key] = b2 * st.v[k][key] + (1 - b2) * gi * gi; p[key] -= lr * (st.m[k][key] / c1) / (Math.sqrt(st.v[k][key] / c2) + 1e-8); } }); }

  // exact population of the right-hand state and its free energy difference
  let zr = 0, zt = 0; for (let x = -3; x <= 3; x += 0.0005) { const w = Math.exp(-Fx(x)); zt += w; if (x > 0) zr += w; }
  const PR = zr / zt, DF = -Math.log(PR / (1 - PR));

  function heat(C, V, w, h) { const st = 3, cw = Math.ceil(w / st), ch = Math.ceil(h / st), off = document.createElement("canvas"); off.width = cw; off.height = ch;
    const oc = off.getContext("2d"), id = oc.createImageData(cw, ch), cap = 10, lev = 1;
    const val = (i, j) => Math.min(U(V.ix(i * st), V.iy(j * st)) - Fx(-1.0156) + 0.0, cap);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const v = Math.max(0, val(i, j)), col = LW.ramp(0.05 + 0.6 * Math.sqrt(v / cap), C).match(/\d+/g).map(Number), band = Math.floor(v / lev);
      const edge = (i + 1 < cw && Math.floor(Math.max(0, val(i + 1, j)) / lev) !== band) || (j + 1 < ch && Math.floor(Math.max(0, val(i, j + 1)) / lev) !== band), dk = edge ? (C.dark ? 1.4 : 0.8) : 1, o = 4 * (j * cw + i);
      id.data[o] = Math.min(255, col[0] * dk); id.data[o + 1] = Math.min(255, col[1] * dk); id.data[o + 2] = Math.min(255, col[2] * dk); id.data[o + 3] = 255; }
    oc.putImageData(id, 0, 0); return off; }

  LW.register("bgflow", function (root) {
    const MODES = [["left", "Likelihood, one state"], ["kl", "Energy only"], ["two", "Likelihood, both states"], ["both", "Likelihood + energy"]];
    let mode = "both", stage = K, iter = 0, L, st, R, data, Z, evalN = 2000, ess = 0, praw = 0, prw = 0, img = null, imgKey = "", anim = 0;
    const MAXIT = 2400, kT = 1;
    const P = LW.canvas(root, { height: w => (w < 560 ? 960 : Math.round(Math.min(280, w * 0.36)) + 310) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Training", options: MODES, value: mode, onChange: v => { mode = v; reset(); } });
    const sl = LW.slider(ctl, { label: "Show the samples after coupling layer", min: 0, max: K, step: 0.01, value: stage, fmt: v => v.toFixed(1) + " of " + K, onInput: v => { stage = v; anim = 0; draw(); } });
    const ctl2 = LW.controls(root);
    const bTrain = LW.button(ctl2, "Pause training", () => { loop.toggle(); bTrain.textContent = loop.running ? "Pause training" : "Resume training"; }, { primary: true });
    LW.button(ctl2, "Play the transformation", () => { anim = 1; stage = 0; if (!loop.running) loop.start(); });
    LW.button(ctl2, "Restart from scratch", () => reset());
    const S_ = LW.stats(root, [["it", "training steps"], ["ess", "effective sample size"], ["raw", "P(right state), raw samples"], ["rw", "P(right state), reweighted"], ["ex", "P(right state), exact"], ["df", "ΔF right − left (k<sub>B</sub>T), reweighted vs exact"]]);
    LW.note(root, "The flow starts as the identity, so its first samples are just the Gaussian. Each training step draws 64 samples, computes the loss and its gradient by backpropagation through all eight layers, and takes an Adam step. Likelihood training needs example configurations: here, 1000-frame Langevin simulations started in one or both wells (grey dots). Energy training needs only u(x).");

    function simulate(x0) { let x = x0, y = 0.6 * Math.sin(1.8 * x0); const out = [], dt = 0.004; for (let i = 0; i < 20000; i++) { const d = dU(x, y); x += -d[0] * dt + Math.sqrt(2 * kT * dt) * R.normal(); y += -d[1] * dt + Math.sqrt(2 * kT * dt) * R.normal(); if (i % 20 === 0) out.push([x, y]); } return out; }
    function reset() {
      R = rng(11); L = makeFlow(R); st = { t: 0, m: zeroLike(), v: zeroLike() }; iter = 0;
      data = mode === "kl" ? [] : mode === "left" ? simulate(-1) : simulate(-1).concat(simulate(1));
      const r2 = rng(5); Z = Array.from({ length: evalN }, () => [r2.normal(), r2.normal()]);
      evaluate(); loop.start(); bTrain.textContent = "Pause training"; draw();
    }
    function trainStep() { const G = zeroLike(), n = 64, useML = mode !== "kl", useKL = mode === "kl" || mode === "both";
      if (useKL) for (let i = 0; i < n; i++) backKL(L, G, forward(L, [R.normal(), R.normal()]), kT);
      if (useML) for (let i = 0; i < n; i++) backML(L, G, inverse(L, data[Math.floor(R() * data.length)]));
      adam(L, G, st, 2e-3, n); iter++; }
    let ev = [];
    function evaluate() { let sw = 0, sw2 = 0, swr = 0, nr = 0; const lw = [];
      ev = Z.map(z => { const f = forward(L, z, true), lq = -0.5 * (z[0] * z[0] + z[1] * z[1]) - f.ld, l = -U(f.x[0], f.x[1]) / kT - lq; lw.push(l); return { path: f.path, x: f.x, lw: l }; });
      const mx = Math.max(...lw); ev.forEach(e => { e.w = Math.exp(e.lw - mx); sw += e.w; sw2 += e.w * e.w; if (e.x[0] > 0) { swr += e.w; nr++; } });
      ess = (sw * sw / sw2) / evalN; praw = nr / evalN; prw = swr / sw; ev.forEach(e => (e.wn = e.w / sw * evalN)); }
    const loop = LW.loop(root, () => {
      if (iter < MAXIT) { for (let i = 0; i < 3; i++) trainStep(); evaluate(); }
      if (anim) { stage = Math.min(K, stage + 0.06); sl.set(stage); if (stage >= K) anim = 0; }
      if (iter >= MAXIT && !anim) { loop.stop(); bTrain.textContent = "Training finished"; }
      draw();
    });

    function at(e, s) { const k = Math.floor(s), f = s - k; if (k >= K) return e.path[K]; const a = e.path[k], b = e.path[k + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
    function draw() {
      const C = LW.colors(), { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH); const narrow = W < 560;
      // panel boxes
      let A, B, D; if (narrow) { const s = W - 20; A = { x: 10, y: 22, w: s, h: Math.min(s, 250) }; B = { x: 10, y: A.y + A.h + 34, w: s, h: Math.min(s * 0.82, 330) }; D = { x: 44, y: B.y + B.h + 70, w: W - 54, h: HH - (B.y + B.h + 70) - 36 }; }
      else { const s = Math.round(Math.min(280, W * 0.36)); A = { x: 10, y: 22, w: s, h: s }; B = { x: A.x + s + 22, y: 22, w: W - (A.x + s + 22) - 10, h: s }; D = { x: 52, y: 22 + s + 58, w: W - 62, h: HH - (22 + s + 58) - 38 }; }
      // 1. latent space
      const zr = 3.4, ZX = v => A.x + A.w / 2 + v / zr * A.w / 2, ZY = v => A.y + A.h / 2 - v / zr * A.h / 2;
      LW.text(ctx, "latent space: z ~ N(0, 1)", A.x, A.y - 8, { color: C.ink2, size: 11.5, weight: 600 });
      ctx.fillStyle = C.bg2; ctx.fillRect(A.x, A.y, A.w, A.h); ctx.strokeStyle = C.line; ctx.strokeRect(A.x + 0.5, A.y + 0.5, A.w, A.h);
      ctx.save(); ctx.beginPath(); ctx.rect(A.x, A.y, A.w, A.h); ctx.clip();
      [1, 2, 3].forEach(r => { ctx.strokeStyle = C.line2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.ellipse(ZX(0), ZY(0), Math.max(0, r / zr * A.w / 2), Math.max(0, r / zr * A.h / 2), 0, 0, 7); ctx.stroke(); }); ctx.setLineDash([]);
      ev.forEach((e, i) => { ctx.fillStyle = e.x[0] > 0 ? ORANGE : TEAL; ctx.globalAlpha = 0.75; ctx.fillRect(ZX(Z[i][0]) - 1.5, ZY(Z[i][1]) - 1.5, 3, 3); }); ctx.globalAlpha = 1; ctx.restore();
      // 2. configuration space
      const xr = [-2.1, 2.1], yr = [-1.7, 1.9], V = { ix: px => xr[0] + px / B.w * (xr[1] - xr[0]), iy: py => yr[1] - py / B.h * (yr[1] - yr[0]) };
      const X = v => B.x + (v - xr[0]) / (xr[1] - xr[0]) * B.w, Y = v => B.y + (yr[1] - v) / (yr[1] - yr[0]) * B.h;
      const key = Math.round(B.w) + "x" + Math.round(B.h) + C.dark; if (key !== imgKey) { img = heat(C, V, B.w, B.h); imgKey = key; }
      LW.text(ctx, stage >= K - 1e-9 ? "configurations x = f(z) on the energy landscape" : "samples after layer " + stage.toFixed(1) + " (not yet configurations)", B.x, B.y - 8, { color: C.ink2, size: 11.5, weight: 600 });
      ctx.save(); ctx.beginPath(); ctx.rect(B.x, B.y, B.w, B.h); ctx.clip();
      ctx.globalAlpha = stage >= K - 1e-9 ? 1 : 0.35; ctx.drawImage(img, B.x, B.y, Math.ceil(B.w / 3) * 3, Math.ceil(B.h / 3) * 3); ctx.globalAlpha = 1;
      ctx.fillStyle = C.dark ? "rgba(255,255,255,.55)" : "rgba(20,24,40,.45)"; data.forEach((p, i) => { if (i % 3 === 0) ctx.fillRect(X(p[0]) - 1, Y(p[1]) - 1, 2, 2); });
      ev.forEach(e => { const p = at(e, stage), r = stage >= K - 1e-9 ? LW.clamp(1.6 * Math.sqrt(e.wn), 1, 5) : 1.7; ctx.fillStyle = e.x[0] > 0 ? ORANGE : TEAL; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), r, 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1; ctx.restore(); ctx.strokeStyle = C.line; ctx.strokeRect(B.x + 0.5, B.y + 0.5, B.w, B.h);
      LW.text(ctx, "left state", X(-1) - 22, B.y + B.h - 8, { color: C.ink2, size: 10.5 }); LW.text(ctx, "right state", X(1) - 24, B.y + B.h - 8, { color: C.ink2, size: 10.5 });
      // 3. free energy along x
      const Ax = LW.axes(ctx, D, { xr: xr, yr: [0, 12], xlabel: "x", ylabel: "F(x) / kT", colors: C });
      
      const nb = 36, bw = (xr[1] - xr[0]) / nb, fmin = Math.min(...Array.from({ length: 400 }, (_, i) => Fx(xr[0] + i * (xr[1] - xr[0]) / 399)));
      const curve = (hist, cnt, minc, col, dash) => { const tot = hist.reduce((a, b) => a + b, 0); if (!tot) return; const F = hist.map((c, i) => (cnt[i] >= minc ? -Math.log(c / tot / bw) : null)); const fm = Math.min(...F.filter(v => v !== null)); const off = fm - (Fx(-1.0156) - fmin) ; ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.setLineDash(dash || []); ctx.beginPath(); let pen = false; F.forEach((v, i) => { if (v === null || v - off > 12) { pen = false; return; } const px = Ax.sx(xr[0] + (i + 0.5) * bw), py = Ax.sy(v - off); pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py); pen = true; }); ctx.stroke(); ctx.setLineDash([]); };
      ctx.save(); ctx.beginPath(); ctx.rect(D.x, D.y, D.w, D.h); ctx.clip(); ctx.strokeStyle = C.rose; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 200; i++) { const x = xr[0] + i * (xr[1] - xr[0]) / 200, f = Math.min(Fx(x) - fmin, 40); i ? ctx.lineTo(Ax.sx(x), Ax.sy(f)) : ctx.moveTo(Ax.sx(x), Ax.sy(f)); } ctx.stroke();
      const hd = new Array(nb).fill(0), hr = new Array(nb).fill(0), hw = new Array(nb).fill(0), bin = x => Math.floor((x - xr[0]) / bw);
      data.forEach(p => { const b = bin(p[0]); if (b >= 0 && b < nb) hd[b]++; }); ev.forEach(e => { const b = bin(e.x[0]); if (b >= 0 && b < nb) { hr[b]++; hw[b] += e.w; } });
      curve(hd, hd, 3, C.ink3, [2, 3]); curve(hr, hr, 5, C.accent); curve(hw, hr, 5, ORANGE); ctx.restore();
      const lg = [[C.rose, "exact"], [C.ink3, "simulation data"], [C.accent, "generator, raw"], [ORANGE, "generator, reweighted"]];
      let lx = D.x, ly = D.y - 10; lg.forEach(([c, t]) => { ctx.font = "10.5px sans-serif"; const tw = ctx.measureText(t).width + 34; if (lx + tw > D.x + D.w) { lx = D.x; ly -= 15; } ctx.strokeStyle = c; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(lx, ly - 4); ctx.lineTo(lx + 16, ly - 4); ctx.stroke(); LW.text(ctx, t, lx + 21, ly, { color: C.ink2, size: 10.5 }); lx += tw; });
      const vals = { it: iter + (iter >= MAXIT ? " (done)" : ""), ess: (100 * ess).toFixed(0) + " %", raw: praw.toFixed(3), rw: prw.toFixed(3), ex: PR.toFixed(3),
        df: (prw > 0 && prw < 1 ? (-Math.log(prw / (1 - prw))).toFixed(2) : "∞") + " vs " + DF.toFixed(2) };
      Object.keys(vals).forEach(k => S_.set(k, vals[k]));
    }
    P.draw = draw; LW.onTheme(() => { imgKey = ""; draw(); }); reset();
  });
})();
