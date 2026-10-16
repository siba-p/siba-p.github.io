/* 2.5 Uncertainty and Gaussian processes: click to observe, tune the kernel, sample functions. */
(function () {
  "use strict";
  const hidden = x => Math.sin(1.1 * x) + 0.35 * Math.cos(2.7 * x) + 0.08 * x;
  LW.register("gp", function (root) {
    let obs = [{ x: 1.5 }, { x: 3.1 }, { x: 6.8 }], ell = 1, sf = 1, sn = 0.05, samples = [], seed = 1;
    const noise = LW.rng(42);
    obs.forEach(o => { o.y = hidden(o.x) + sn * noise.normal(); });
    const P = LW.canvas(root, { aspect: 0.5, minH: 260, maxH: 400 });
    LW.legend(root, [[LW.colors().accent, "posterior mean"], [LW.colors().band, "± 2 standard deviations"], [LW.colors().ink3, "hidden true function", true], [LW.colors().orange, "where the model is least sure"]]);
    const ctl = LW.controls(root);
    const sl = LW.slider(ctl, { label: "Length-scale ℓ", min: 0.1, max: 5, value: ell, log: true, fmt: v => v.toFixed(2), onInput: v => { ell = v; samples = []; draw(); } });
    const ss = LW.slider(ctl, { label: "Signal amplitude σ<sub>f</sub>", min: 0.2, max: 3, value: sf, log: true, fmt: v => v.toFixed(2), onInput: v => { sf = v; samples = []; draw(); } });
    const sn_ = LW.slider(ctl, { label: "Noise σ<sub>n</sub>", min: 0.01, max: 1, value: sn, log: true, fmt: v => v.toFixed(3), onInput: v => { sn = v; samples = []; draw(); } });
    const c2 = LW.controls(root);
    LW.button(c2, "Draw 3 functions from the posterior", () => { seed++; samples = sample(3); draw(); }, { primary: true });
    LW.button(c2, "Observe where most uncertain", () => { const x = argmaxSd(); obs.push({ x, y: hidden(x) + 0.05 * noise.normal() }); samples = []; draw(); });
    LW.button(c2, "Fit hyperparameters (max. likelihood)", () => { if (obs.length < 5) { msg.set("<b>Add at least five measurements first.</b> With two or three points the marginal likelihood cannot tell a wiggly function from a noisy one, and the optimum is meaningless."); return; } optimise(); samples = []; draw(); msg.set(hint); });
    LW.button(c2, "Clear", () => { obs = []; samples = []; draw(); });
    const showTrue = LW.check(c2, { label: "Show hidden function", value: true, onChange: () => draw() });
    const S = LW.stats(root, [["n", "observations"], ["lml", "log marginal likelihood"], ["sd", "largest σ in the window"]]);
    const hint = "Click on the plot to make a (noisy) measurement at that x.", msg = LW.note(root, hint);
    const xr = [0, 10], grid = LW.linspace(xr[0], xr[1], 161);
    const model = () => LW.gp(obs.map(o => o.x), obs.map(o => o.y), { ell, sf, sn });
    function lml() {
      if (!obs.length) return NaN; const m = model(); if (!m.L) return NaN; const n = obs.length;
      let a = 0; obs.forEach((o, i) => { a += o.y * m.alpha[i]; }); let ld = 0; for (let i = 0; i < n; i++) ld += Math.log(m.L[i][i]);
      return -0.5 * a - ld - 0.5 * n * Math.log(2 * Math.PI);
    }
    function argmaxSd() { const m = model(); let best = grid[0], s = -1; grid.forEach(x => { const p = m.predict(x); if (p.sd > s) { s = p.sd; best = x; } }); return best; }
    function optimise() {
      if (obs.length < 2) return; let best = [ell, sf, sn], bv = -Infinity;
      for (const l of LW.linspace(Math.log(0.25), Math.log(5), 30)) for (const f of LW.linspace(Math.log(0.3), Math.log(3), 12)) for (const n of LW.linspace(Math.log(0.01), Math.log(0.6), 10)) {
        ell = Math.exp(l); sf = Math.exp(f); sn = Math.exp(n); const v = lml(); if (v > bv) { bv = v; best = [ell, sf, sn]; } }
      [ell, sf, sn] = best; sl.set(ell); ss.set(sf); sn_.set(sn);
    }
    function sample(k) { // joint samples on a coarse grid: posterior covariance, Cholesky, z ~ N(0, I)
      const g = LW.linspace(xr[0], xr[1], 150), kf = (a, b) => sf * sf * Math.exp(-0.5 * ((a - b) / ell) ** 2);
      let mu, cov;
      if (obs.length) {
        const m = model(), V = g.map(x => LW.forwardSub(m.L, obs.map(o => kf(x, o.x))));
        mu = g.map(x => m.predict(x).mu);
        cov = g.map((a, i) => g.map((b, j) => { let s = kf(a, b); for (let q = 0; q < obs.length; q++) s -= V[i][q] * V[j][q]; return s + (i === j ? 1e-6 * sf * sf : 0); }));
      } else { mu = g.map(() => 0); cov = g.map((a, i) => g.map((b, j) => kf(a, b) + (i === j ? 1e-6 * sf * sf : 0))); }
      const L = LW.chol(cov); if (!L) return [];
      const r = LW.rng(seed * 13);
      return Array.from({ length: k }, () => { const z = g.map(() => r.normal()); return { x: g, y: g.map((_, i) => { let s = mu[i]; for (let q = 0; q <= i; q++) s += L[i][q] * z[q]; return s; }) }; });
    }
    let A = null;
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      A = LW.axes(ctx, { x: 58, y: 10, w: W - 70, h: H - 50 }, { xr, yr: [-3.2, 3.2], xlabel: "input x (e.g. composition, temperature)", ylabel: "property", colors: C });
      const m = model(), pr = grid.map(x => m.predict(x));
      A.clip();
      LW.band(ctx, grid, pr.map(p => p.mu - 2 * p.sd), pr.map(p => p.mu + 2 * p.sd), A, C.band);
      if (showTrue.value) LW.path(ctx, grid, grid.map(hidden), A, { color: C.ink3, width: 1.5, dash: [5, 5] });
      const pal = [C.teal, C.violet, C.gold]; samples.forEach((s, i) => LW.path(ctx, s.x, s.y, A, { color: pal[i % 3], width: 1.4, alpha: 0.85 }));
      LW.path(ctx, grid, pr.map(p => p.mu), A, { color: C.accent, width: 2.5 });
      let bi = 0; pr.forEach((p, i) => { if (p.sd > pr[bi].sd) bi = i; });
      ctx.strokeStyle = C.orange; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(A.sx(grid[bi]), A.box.y); ctx.lineTo(A.sx(grid[bi]), A.box.y + A.box.h); ctx.stroke(); ctx.setLineDash([]);
      obs.forEach(o => LW.dot(ctx, A.sx(o.x), A.sy(o.y), 5, C.card, C.ink, 2));
      ctx.restore();
      S.set("n", String(obs.length)); S.set("lml", LW.fmt(lml(), 2)); S.set("sd", LW.fmt(pr[bi].sd, 3));
    }
    P.draw = draw;
    LW.drag(P.cv, { down: p => { if (!A) return false; const x = LW.clamp(A.ix(p.x), xr[0], xr[1]); obs.push({ x, y: hidden(x) + 0.05 * noise.normal() }); samples = []; draw(); return false; } });
    draw();
  });
})();
