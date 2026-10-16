/* 5.4 Diffusion models: forward noising and reverse generation for a 2D "crystal motif" data
   distribution (a mixture of Gaussians), using its exact score, with a stochastic (DDPM) or
   deterministic (probability-flow ODE) sampler, conditioning, and a deliberately imperfect model. */
(function () {
  "use strict";
  const MOTIF = (() => { const m = [[0, 0]]; for (let k = 0; k < 6; k++) m.push([Math.cos(k * Math.PI / 3), Math.sin(k * Math.PI / 3)]); for (let k = 0; k < 6; k++) m.push([1.732 * Math.cos(k * Math.PI / 3 + Math.PI / 6), 1.732 * Math.sin(k * Math.PI / 3 + Math.PI / 6)]); return m.map(p => [p[0] * 0.95, p[1] * 0.95]); })();
  const S0 = 0.07, NS = 500;
  const abar = t => Math.max(1e-3, Math.cos((t + 0.008) / 1.008 * Math.PI / 2) ** 2);   // cosine schedule (Nichol & Dhariwal), floored at 1e-3
  LW.register("diffusion", function (root) {
    let t = 0, cond = "all", sampler = "ddpm", err = 0, pts = [], mode = "forward", gen = null, showField = true, seed = 1;
    const P = LW.canvas(root, { height: w => Math.min(w * 0.62, 460) });
    const ctl = LW.controls(root);
    const ts = LW.slider(ctl, { label: "Diffusion time t (0 = data, 1 = pure noise)", min: 0, max: 1, step: 0.005, value: 0, fmt: v => v.toFixed(3), onInput: v => { t = v; mode = "forward"; loop.stop(); makeForward(); draw(); } });
    const c2 = LW.controls(root);
    LW.seg(c2, { label: "Sampler", options: [["ddpm", "Stochastic (DDPM)"], ["ode", "Deterministic (probability-flow ODE)"]], value: sampler, onChange: v => { sampler = v; } });
    LW.seg(c2, { label: "Condition", options: [["all", "None"], ["centre", "Centre + inner shell"], ["outer", "Outer shell only"]], value: cond, onChange: v => { cond = v; } });
    const c3 = LW.controls(root);
    LW.slider(c3, { label: "Model error (how badly the score is learned)", min: 0, max: 1, step: 0.01, value: 0, fmt: v => (v === 0 ? "exact" : v.toFixed(2)), onInput: v => { err = v; } });
    LW.button(c3, "Generate from noise", () => start(), { primary: true });
    LW.check(c3, { label: "Show the score field", value: true, onChange: v => { showField = v; draw(); } });
    const S = LW.stats(root, [["ab", "signal kept √ᾱ(t)"], ["nz", "noise √(1 − ᾱ(t))"], ["q", "samples within 0.2 of a site"]]);
    const msg = LW.note(root, "Drag the time slider to watch the data dissolve into noise. Then press Generate: 500 points start as pure noise and are denoised step by step using the score.");
    const comps = c => (c === "all" ? MOTIF.map((_, i) => i) : c === "centre" ? [0, 1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12]);
    /* score of p_t: a Gaussian mixture with means √ᾱ μ_k and variance ᾱ s0² + (1 − ᾱ) */
    function score(x, y, tt, ks, extra) {
      const ab = abar(tt), sa = Math.sqrt(ab), s0 = S0 + extra, v = ab * s0 * s0 + (1 - ab);
      let wsum = 0, gx = 0, gy = 0, lmax = -Infinity; const ls = [];
      for (const k of ks) { const mx = sa * MOTIF[k][0], my = sa * MOTIF[k][1], l = -((x - mx) ** 2 + (y - my) ** 2) / (2 * v); ls.push([l, mx, my]); if (l > lmax) lmax = l; }
      for (const [l, mx, my] of ls) { const w = Math.exp(l - lmax); wsum += w; gx += w * (mx - x) / v; gy += w * (my - y) / v; }
      return [gx / wsum, gy / wsum];
    }
    function makeForward() {
      const r = LW.rng(seed), ab = abar(t), ks = comps("all");
      pts = Array.from({ length: NS }, () => { const k = ks[Math.floor(r() * ks.length)], x0 = MOTIF[k][0] + S0 * r.normal(), y0 = MOTIF[k][1] + S0 * r.normal(); return [Math.sqrt(ab) * x0 + Math.sqrt(1 - ab) * r.normal(), Math.sqrt(ab) * y0 + Math.sqrt(1 - ab) * r.normal()]; });
    }
    function start() { seed++; const r = LW.rng(seed * 7); pts = Array.from({ length: NS }, () => [r.normal(), r.normal()]); gen = { k: 0, K: 200, r, ks: comps(cond), extra: err * 0.45 }; t = 1; mode = "reverse"; loop.start(); }
    const loop = LW.loop(root, () => {
      if (!gen) return;
      for (let rep = 0; rep < 4 && gen.k < gen.K; rep++) {
        const t1 = 1 - gen.k / gen.K, t0 = 1 - (gen.k + 1) / gen.K, a1 = abar(t1), a0 = abar(t0), alpha = a1 / a0, beta = 1 - alpha;
        pts = pts.map(([x, y]) => {
          const [sx, sy] = score(x, y, t1, gen.ks, gen.extra);
          if (sampler === "ddpm") { // ancestral step: x0-mean of the posterior q(x_{t-1} | x_t)
            const mx = (x + beta * sx) / Math.sqrt(alpha), my = (y + beta * sy) / Math.sqrt(alpha), sd = Math.sqrt(beta * (1 - a0) / (1 - a1));
            return gen.k === gen.K - 1 ? [mx, my] : [mx + sd * gen.r.normal(), my + sd * gen.r.normal()];
          }
          // DDIM (η = 0): deterministic, equivalent to integrating the probability-flow ODE
          const e = Math.sqrt(1 - a1), ex = -e * sx, ey = -e * sy, x0x = (x - e * ex) / Math.sqrt(a1), x0y = (y - e * ey) / Math.sqrt(a1);
          return [Math.sqrt(a0) * x0x + Math.sqrt(1 - a0) * ex, Math.sqrt(a0) * x0y + Math.sqrt(1 - a0) * ey];
        });
        gen.k++; t = 1 - gen.k / gen.K;
      }
      ts.set(t); draw();
      if (gen.k >= gen.K) { loop.stop(); gen = null; t = 0; ts.set(0); draw(); }
    });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const half = 2.9, sc = Math.min(W, H) / (2 * half), X = v => W / 2 + v * sc, Y = v => H / 2 - v * sc;
      ctx.fillStyle = C.bg2; ctx.fillRect(0, 0, W, H);
      const ab = abar(t);
      MOTIF.forEach((m, k) => { const on = comps(mode === "reverse" && gen ? cond : "all").includes(k); ctx.strokeStyle = on ? C.ink3 : C.line2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(X(m[0]), Y(m[1]), 0.2 * sc, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]); });
      if (showField && t > 0.004) {
        const ks = mode === "reverse" && gen ? gen.ks : comps("all"), ex = mode === "reverse" && gen ? gen.extra : 0, step = 0.42, sd = Math.sqrt(1 - ab + ab * S0 * S0);
        for (let gx = -half + step / 2; gx < half; gx += step) for (let gy = -half * H / W * 1.6; gy < half; gy += step) {
          const [sx, sy] = score(gx, gy, t, ks, ex), m = Math.hypot(sx, sy) * sd; if (m < 1e-6) continue;
          const len = Math.min(0.32, 0.12 * m) * sc, ux = sx / Math.hypot(sx, sy), uy = sy / Math.hypot(sx, sy);
          LW.arrow(ctx, X(gx), Y(gy), X(gx) + ux * len, Y(gy) - uy * len, C.dark ? "rgba(169,147,255,.55)" : "rgba(109,79,224,.45)", 1.2, 4);
        }
      }
      pts.forEach(([x, y]) => LW.dot(ctx, X(x), Y(y), 2.4, mode === "reverse" ? C.orange : C.accent, null));
      LW.text(ctx, mode === "reverse" ? "reverse process: denoising" : "forward process: adding noise", 10, 18, { color: C.ink2, size: 12, weight: 600 });
      const near = pts.filter(([x, y]) => MOTIF.some(m => Math.hypot(x - m[0], y - m[1]) < 0.2)).length;
      S.set("ab", Math.sqrt(ab).toFixed(3)); S.set("nz", Math.sqrt(1 - ab).toFixed(3)); S.set("q", Math.round(100 * near / pts.length) + " %");
      if (mode === "reverse" && !gen && err > 0.3) msg.set("With a poorly learned score the samples land near the right sites but are smeared out: the model has learned the rough shape of the distribution, not its sharp details. Real generative models fail in the same way when undertrained.");
    }
    P.draw = draw;
    makeForward(); draw();
  });
})();
