/* Enhanced sampling laboratory: Langevin dynamics of one collective variable on a rugged free-energy
   profile, with unbiased MD, metadynamics, well-tempered metadynamics, OPES and adaptive biasing
   force (ABF), showing the bias as it builds and the free-energy estimate against the truth.
   Units: k_B T = 1, mass = 1. */
(function () {
  "use strict";
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const LAND = {
    double: { name: "Double well (barrier 8 kT)", F: s => 8 * (s * s - 1) ** 2 },
    asym: { name: "Asymmetric wells", F: s => 8 * (s * s - 1) ** 2 + 2.5 * s },
    triple: { name: "Three states", F: s => 4.5 * (1 - Math.cos(2.4 * Math.PI * s * 0.9)) * 0.9 + 1.5 * s * s * s * s - 0.4 * s }
  };
  const X0 = -2, X1 = 2, NG = 200, GRID = Array.from({ length: NG }, (_, i) => X0 + (i + 0.5) * (X1 - X0) / NG), DX = (X1 - X0) / NG;
  LW.register("eslab", function (root, opts) {
    let land = (opts && opts.land) || "double", method = (opts && opts.method) || "metad", s, v, t, bias, hist, traj, nCross, side, r, run = 0;
    let wHeight = 0.4, sigma = 0.1, gamma = 10, pace = 100, opes = null, abf = null;
    const P = LW.canvas(root, { height: w => (w < 640 ? 560 : 440) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Method", options: [["md", "Plain MD"], ["metad", "Metadynamics"], ["wtmetad", "Well-tempered metaD"], ["opes", "OPES"], ["abf", "ABF"]], value: method, onChange: v2 => { method = v2; reset(); } });
    LW.seg(ctl, { label: "Landscape", options: Object.keys(LAND).map(k => [k, LAND[k].name]), value: land, onChange: v2 => { land = v2; reset(); } });
    const c2 = LW.controls(root);
    LW.slider(c2, { label: "Gaussian height w (metaD) / k<sub>B</sub>T", min: 0.05, max: 1.5, step: 0.05, value: wHeight, fmt: x => x.toFixed(2), onInput: x => { wHeight = x; } });
    LW.slider(c2, { label: "Gaussian width σ", min: 0.03, max: 0.3, step: 0.01, value: sigma, fmt: x => x.toFixed(2), onInput: x => { sigma = x; } });
    LW.slider(c2, { label: "Bias factor γ (well-tempered, OPES)", min: 2, max: 40, step: 1, value: gamma, fmt: x => String(x), onInput: x => { gamma = x; } });
    const c3 = LW.controls(root);
    const runB = LW.button(c3, "Pause", () => { runB.textContent = loop.toggle() ? "Pause" : "Run"; }, { primary: true });
    LW.button(c3, "Restart", () => reset());
    const S = LW.stats(root, [["t", "simulated time"], ["x", "barrier crossings"], ["err", "error of the free-energy estimate"], ["bmax", "largest bias"]]);
    const F = s2 => LAND[land].F(s2), dF = s2 => (F(s2 + 1e-4) - F(s2 - 1e-4)) / 2e-4;
    function reset() { r = LW.rng(7 + run++); s = land === "triple" ? -1.0 : -1; v = 0; t = 0; bias = new Float64Array(NG); hist = new Float64Array(NG); traj = []; nCross = 0; side = Math.sign(s); opes = { ks: [], kw: [] }; abf = { sum: new Float64Array(NG), n: new Float64Array(NG) }; draw(); }
    const idx = x => Math.max(0, Math.min(NG - 1, Math.floor((x - X0) / DX)));
    const biasAt = x => { const i = (x - X0) / DX - 0.5, i0 = Math.max(0, Math.min(NG - 2, Math.floor(i))), f = LW.clamp(i - i0, 0, 1); return bias[i0] * (1 - f) + bias[i0 + 1] * f; };
    const biasForce = x => -(biasAt(x + 1e-3) - biasAt(x - 1e-3)) / 2e-3;
    function opesUpdate() { // KDE of reweighted samples, bias V = (1 - 1/γ) kT log(P/Z + ε)
      const w = Math.exp(biasAt(s)); opes.ks.push(s); opes.kw.push(w); if (opes.ks.length > 600) { opes.ks.shift(); opes.kw.shift(); }
      const W = opes.kw.reduce((a, b) => a + b, 0), P2 = GRID.map(g => opes.ks.reduce((a, k, j) => a + opes.kw[j] * Math.exp(-((g - k) ** 2) / (2 * sigma * sigma)), 0) / W / (sigma * Math.sqrt(2 * Math.PI)));
      const explored = P2.filter(p => p > 1e-3), Z = explored.length ? explored.reduce((a, b) => a + b, 0) / explored.length : 1, pref = 1 - 1 / gamma, barrier = 20, eps = Math.exp(-barrier / pref);
      for (let i = 0; i < NG; i++) bias[i] = pref * Math.log(P2[i] / Z + eps); const m = Math.max(...bias); for (let i = 0; i < NG; i++) bias[i] -= m; opes.P = P2;
    }
    function step(n) {
      const dt = 0.002, g = 4, c1 = Math.exp(-g * dt), c2 = Math.sqrt(1 - c1 * c1);
      for (let k = 0; k < n; k++) {
        let f = -dF(s) + (method === "md" ? 0 : method === "abf" ? 0 : biasForce(s));
        if (method === "abf") { const i = idx(s); abf.sum[i] += -dF(s); abf.n[i] += 1; const ramp = Math.min(1, abf.n[i] / 200); f += -ramp * abf.sum[i] / abf.n[i]; }
        v += 0.5 * dt * f; s += 0.5 * dt * v; v = c1 * v + c2 * r.normal(); s += 0.5 * dt * v;
        if (s < X0) { s = 2 * X0 - s; v = -v; } if (s > X1) { s = 2 * X1 - s; v = -v; }
        f = -dF(s) + (method === "md" || method === "abf" ? 0 : biasForce(s)); if (method === "abf") { const i = idx(s), ramp = Math.min(1, abf.n[i] / 200); if (abf.n[i]) f += -ramp * abf.sum[i] / abf.n[i]; }
        v += 0.5 * dt * f; t += dt; hist[idx(s)]++;
        if (land !== "triple" && Math.abs(s) > 0.9 && Math.sign(s) !== side) { nCross++; side = Math.sign(s); }
        if (land === "triple") { const st = s < -0.45 ? -1 : s > 0.45 ? 1 : 0; if (Math.abs(s) > 0.6 || Math.abs(s) < 0.15) { if (st !== side) { nCross++; side = st; } } }
        if ((method === "metad" || method === "wtmetad") && Math.round(t / dt) % pace === 0) {
          const h = method === "metad" ? wHeight : wHeight * Math.exp(-biasAt(s) / (gamma - 1));
          for (let i = 0; i < NG; i++) bias[i] += h * Math.exp(-((GRID[i] - s) ** 2) / (2 * sigma * sigma));
        }
        if (method === "opes" && Math.round(t / dt) % (pace * 2) === 0) opesUpdate();
      }
      traj.push(s); if (traj.length > 700) traj.shift();
    }
    const loop = LW.loop(root, () => { step(250); draw(); });
    function estimate() {
      let est;
      if (method === "metad") est = GRID.map((_, i) => -bias[i]);
      else if (method === "wtmetad") est = GRID.map((_, i) => -gamma / (gamma - 1) * bias[i]);
      else if (method === "opes") est = opes.P ? opes.P.map(p => (p > 1e-6 ? -Math.log(p) : NaN)) : GRID.map(() => NaN);
      else if (method === "abf") { est = []; let acc = 0; for (let i = 0; i < NG; i++) { const mf = abf.n[i] > 5 ? abf.sum[i] / abf.n[i] : NaN; acc += isFinite(mf) ? -mf * DX : 0; est.push(abf.n[i] > 5 ? acc : NaN); } }
      else { const tot = hist.reduce((a, b) => a + b, 0) || 1; est = Array.from(hist, h => (h > 0 ? -Math.log(h / tot / DX) : NaN)); }
      const fs = GRID.map(F), ok = est.map((e, i) => isFinite(e) && fs[i] < Math.min(...fs) + 12);
      const n = ok.filter(Boolean).length; if (!n) return { est, err: NaN };
      const shift = ok.reduce((a, o, i) => a + (o ? fs[i] - est[i] : 0), 0) / n, e2 = est.map(e => e + shift);
      const err = Math.sqrt(ok.reduce((a, o, i) => a + (o ? (e2[i] - fs[i]) ** 2 : 0), 0) / n);
      return { est: e2, err, cover: n / ok.length };
    }
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640;
      const fs = GRID.map(F), fmin = Math.min(...fs), top = fmin + 16, h1 = narrow ? H * 0.58 : H * 0.62;
      const A = LW.axes(ctx, { x: 52, y: 22, w: W - 66, h: h1 - 40 }, { xr: [X0, X1], yr: [fmin - 1, top], xlabel: "collective variable s", ylabel: "energy / k_BT", colors: C, title: "free energy F(s) (blue), F + bias (violet fill), estimate from the simulation (orange)" });
      A.clip();
      const tot = GRID.map((g, i) => fs[i] + (method === "abf" ? 0 : bias[i] - (method === "md" ? 0 : Math.min(...bias))));
      if (method !== "md" && method !== "abf") LW.band(ctx, GRID, fs, tot, A, rgba(VIOLET, 0.22));
      if (method === "abf") { const cum = []; let acc = 0; for (let i = 0; i < NG; i++) { const mf = abf.n[i] ? Math.min(1, abf.n[i] / 200) * abf.sum[i] / abf.n[i] : 0; acc += mf * DX; cum.push(fs[i] + acc); } const m0 = Math.min(...cum); LW.band(ctx, GRID, fs, cum.map(c => c - m0 + fmin), A, rgba(VIOLET, 0.22)); }
      LW.path(ctx, GRID, fs, A, { color: BLUE, width: 2.6 });
      const E = estimate(); LW.path(ctx, GRID, E.est, A, { color: ORANGE, width: 2.2, dash: [6, 3] });
      LW.dot(ctx, A.sx(s), A.sy(F(s) + (method === "md" || method === "abf" ? 0 : biasAt(s) - Math.min(...bias))), 7, ROSE, C.card, 2); ctx.restore();
      const B = LW.axes(ctx, { x: 52, y: h1 + 16, w: W - 66, h: H - h1 - 50 }, { xr: [0, 700], yr: [X0, X1], ylabel: "s(t)", colors: C, xlabels: false, ny: 3, title: "the collective variable over time (most recent at the right)" });
      B.clip(); LW.path(ctx, traj.map((_, i) => i), traj, B, { color: ROSE, width: 1.3 }); ctx.restore();
      S.set("t", t.toFixed(0) + " τ"); S.set("x", String(nCross)); S.set("err", isFinite(E.err) ? E.err.toFixed(2) + " k_BT over " + Math.round(100 * E.cover) + " % of the profile" : "–");
      S.set("bmax", method === "md" ? "none" : method === "abf" ? "force-based" : (Math.max(...bias) - Math.min(...bias)).toFixed(1) + " k_BT");
    }
    P.draw = draw; reset(); loop.start();
  });
})();
