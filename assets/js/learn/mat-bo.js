/* 5.5 Active learning and Bayesian optimisation: a Gaussian-process surrogate, expected
   improvement or upper confidence bound, and a comparison with random search. */
(function () {
  "use strict";
  const f = x => 0.9 * Math.exp(-(((x - 0.72) / 0.06) ** 2)) + 0.55 * Math.exp(-(((x - 0.28) / 0.14) ** 2)) + 0.15 * Math.sin(9 * x) - 0.1 * x;
  const XS = LW.linspace(0, 1, 201), FMAX = Math.max(...XS.map(f));
  LW.register("bo", function (root) {
    let acq = "ei", kappa = 2, noise = 0.02, obs = [], seed = 1, best = [], rnd = null;
    const P = LW.canvas(root, { aspect: 0.62, minH: 330, maxH: 470 });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Acquisition function", options: [["ei", "Expected improvement"], ["ucb", "Upper confidence bound"], ["rand", "Random choice"]], value: acq, onChange: v => { acq = v; draw(); } });
    LW.slider(ctl, { label: "UCB exploration κ", min: 0, max: 5, step: 0.1, value: kappa, fmt: v => v.toFixed(1), onInput: v => { kappa = v; draw(); } });
    const c2 = LW.controls(root);
    LW.button(c2, "Run the next experiment", () => next(), { primary: true });
    LW.button(c2, "Run 5", () => { for (let i = 0; i < 5; i++) next(true); draw(); });
    LW.button(c2, "Start over", () => { seed++; reset(); });
    const showTrue = LW.check(c2, { label: "Reveal the hidden property", value: false, onChange: () => draw() });
    const S = LW.stats(root, [["n", "experiments"], ["b", "best found"], ["g", "gap to true optimum"], ["r", "random search, same budget (average)"]]);
    LW.note(root, "x might be the fraction of a dopant and y a measured property to maximise. Each experiment is expensive; the goal is the best composition in as few experiments as possible.");
    const gpFit = () => LW.gp(obs.map(o => o.x), obs.map(o => o.y), { ell: 0.08, sf: 0.6, sn: Math.max(noise, 0.01), mean: obs.length ? obs.reduce((s, o) => s + o.y, 0) / obs.length : 0 });
    function acquisition(m, yb) {
      return XS.map(x => { const p = m.predict(x); if (acq === "ucb") return p.mu + kappa * p.sd; const z = (p.mu - yb - 0.01) / p.sd; return (p.mu - yb - 0.01) * LW.normCdf(z) + p.sd * LW.normPdf(z); });
    }
    function next(quiet) {
      const r = LW.rng(seed * 1000 + obs.length * 7 + 3); let x;
      if (acq === "rand" || obs.length < 2) x = r();
      else { const m = gpFit(), yb = Math.max(...obs.map(o => o.y)), a = acquisition(m, yb); let k = 0; a.forEach((v, i) => { if (v > a[k]) k = i; }); x = XS[k] + (r() - 0.5) * 0.002; }
      obs.push({ x, y: f(x) + noise * r.normal() }); best.push(Math.max(...obs.map(o => f(o.x))));
      if (!quiet) draw();
    }
    function randomBaseline() { // mean best-so-far of random search over 300 repetitions
      const r = LW.rng(99), R = 300, n = 30, acc = new Array(n).fill(0);
      for (let k = 0; k < R; k++) { let b = -Infinity; for (let i = 0; i < n; i++) { b = Math.max(b, f(r())); acc[i] += b / R; } }
      return acc;
    }
    function reset() { obs = []; best = []; const r = LW.rng(seed); for (let i = 0; i < 2; i++) { const x = r(); obs.push({ x, y: f(x) + noise * r.normal() }); best.push(Math.max(...obs.map(o => f(o.x)))); } draw(); }
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const m = gpFit(), pr = XS.map(x => m.predict(x)), yb = obs.length ? Math.max(...obs.map(o => o.y)) : 0;
      const top = (H - 46) * 0.62, gap = 24, bot = H - 46 - top - gap;
      const A = LW.axes(ctx, { x: 58, y: 10, w: W - 70, h: top }, { xr: [0, 1], yr: [-0.6, 1.4], ylabel: "property y", colors: C, xlabels: false, ny: 4 });
      A.clip();
      LW.band(ctx, XS, pr.map(p => p.mu - 2 * p.sd), pr.map(p => p.mu + 2 * p.sd), A, C.band);
      if (showTrue.value) LW.path(ctx, XS, XS.map(f), A, { color: C.ink3, width: 1.5, dash: [5, 4] });
      LW.path(ctx, XS, pr.map(p => p.mu), A, { color: C.accent, width: 2.4 });
      obs.forEach((o, i) => LW.dot(ctx, A.sx(o.x), A.sy(o.y), i === obs.length - 1 ? 6 : 4.5, i === obs.length - 1 ? C.orange : C.ink, i === obs.length - 1 ? C.card : null, 2));
      ctx.restore();
      const a = acq === "rand" ? XS.map(() => 1) : acquisition(m, yb), amax = Math.max(...a, 1e-12);
      const B = LW.axes(ctx, { x: 58, y: 10 + top + gap, w: W - 70, h: bot }, { xr: [0, 1], yr: [0, 1.05], xlabel: "composition x", ylabel: "acquisition", colors: C, ny: 2, yfmt: () => "" });
      B.clip(); LW.band(ctx, XS, XS.map(() => 0), a.map(v => v / amax), B, C.dark ? "rgba(255,159,90,.25)" : "rgba(224,112,28,.18)"); LW.path(ctx, XS, a.map(v => v / amax), B, { color: C.orange, width: 2 });
      if (acq !== "rand") { let k = 0; a.forEach((v, i) => { if (v > a[k]) k = i; }); ctx.strokeStyle = C.orange; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(B.sx(XS[k]), B.box.y); ctx.lineTo(B.sx(XS[k]), B.box.y + B.box.h); ctx.stroke(); ctx.setLineDash([]); }
      ctx.restore();
      if (acq !== "rand") LW.text(ctx, "next experiment ↓ at the peak", B.box.x + B.box.w - 4, B.box.y + 12, { color: C.orange, size: 11, align: "right" });
      if (!rnd) rnd = randomBaseline();
      const n = obs.length, bf = best[n - 1];
      S.set("n", String(n)); S.set("b", LW.fmt(bf, 3)); S.set("g", LW.fmt(FMAX - bf, 3)); S.set("r", n <= rnd.length ? LW.fmt(FMAX - rnd[n - 1], 3) + " gap" : "–");
    }
    P.draw = draw;
    reset();
  });
})();
