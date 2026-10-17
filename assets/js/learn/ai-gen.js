/* Generative models for crystals: a reverse-diffusion animation in which several 2D periodic cells
   start as noise (fractional coordinates, lattice and element types) and are denoised into crystals.
   The denoiser is the exact one for a small training set of 2D crystals (what a trained network
   approximates), with symmetry handled by searching over permutations and periodic translations. */
(function () {
  "use strict";
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  // four atoms per cell: fractional coords, types (0 = A, 1 = B), lattice (a, b in Å, gamma in degrees)
  const TRAIN = [
    { name: "square A", comp: "A", lat: [4.0, 4.0, 90], f: [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]], t: [0, 0, 0, 0] },
    { name: "checkerboard AB", comp: "AB", lat: [4.0, 4.0, 90], f: [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]], t: [0, 1, 1, 0] },
    { name: "triangular A", comp: "A", lat: [4.0, 4.0, 60], f: [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]], t: [0, 0, 0, 0] },
    { name: "honeycomb AB", comp: "AB", lat: [5.0, 2.5, 120], f: [[1 / 6, 2 / 3], [1 / 3, 1 / 3], [2 / 3, 2 / 3], [5 / 6, 1 / 3]], t: [0, 1, 0, 1] },
    { name: "rectangular AB stripes", comp: "AB", lat: [4.6, 3.2, 90], f: [[0, 0], [0.5, 0], [0.25, 0.5], [0.75, 0.5]], t: [0, 0, 1, 1] }
  ];
  const PERMS = (function () { const out = [], a = [0, 1, 2, 3]; (function p(k) { if (k === 4) { out.push(a.slice()); return; } for (let i = k; i < 4; i++) { [a[k], a[i]] = [a[i], a[k]]; p(k + 1); [a[k], a[i]] = [a[i], a[k]]; } })(0); return out; })();
  const wrapd = d => d - Math.round(d);
  const LSCALE = [1, 1, 1 / 30]; // lattice coordinates rescaled so that 30° of angle counts like 1 Å
  function align(x, T) { // best permutation and translation of template T onto state x (wrapped distances)
    let best = null;
    for (const P of PERMS) {
      const sh = [wrapd(x.f[0][0] - T.f[P[0]][0]), wrapd(x.f[0][1] - T.f[P[0]][1])]; // translate so that atom 0 matches site P[0]
      // refine the shift as the mean wrapped offset over all four atoms
      let mx = 0, my = 0; for (let i = 0; i < 4; i++) { mx += wrapd(x.f[i][0] - T.f[P[i]][0] - sh[0]); my += wrapd(x.f[i][1] - T.f[P[i]][1] - sh[1]); }
      const shift = [sh[0] + mx / 4, sh[1] + my / 4];
      let d2 = 0; const f = [];
      for (let i = 0; i < 4; i++) { const tx = T.f[P[i]][0] + shift[0], ty = T.f[P[i]][1] + shift[1], dx = wrapd(x.f[i][0] - tx), dy = wrapd(x.f[i][1] - ty); d2 += (dx * dx + dy * dy) * 16; f.push([x.f[i][0] - dx, x.f[i][1] - dy]); }
      for (let i = 0; i < 4; i++) d2 += (x.t[i] - T.t[P[i]]) ** 2;
      for (let k = 0; k < 3; k++) d2 += ((x.lat[k] - T.lat[k]) * LSCALE[k]) ** 2;
      if (!best || d2 < best.d2) best = { d2, f, t: P.map(j => T.t[j]), lat: T.lat.slice() };
    }
    return best;
  }
  function denoise(x, sig, allowed) { // posterior mean over training crystals (an ideal denoiser)
    const cand = TRAIN.filter(T => allowed(T)).map(T => align(x, T)); const m = Math.min(...cand.map(c => c.d2));
    const w = cand.map(c => Math.exp(-(c.d2 - m) / (2 * sig * sig))), W = w.reduce((a, b) => a + b, 0);
    const out = { f: [[0, 0], [0, 0], [0, 0], [0, 0]], t: [0, 0, 0, 0], lat: [0, 0, 0], w: w.map(v => v / W) };
    cand.forEach((c, k) => { const q = w[k] / W; for (let i = 0; i < 4; i++) { out.f[i][0] += q * c.f[i][0]; out.f[i][1] += q * c.f[i][1]; out.t[i] += q * c.t[i]; } for (let j = 0; j < 3; j++) out.lat[j] += q * c.lat[j]; });
    return out;
  }
  LW.register("crystaldiff", function (root) {
    let nS = 6, steps = 60, k = 0, tick = 0, running = false, samples = [], cond = "any", seed = 1, mode = "reverse", fwdT = 0;
    const SMAX = 3.0, SMIN = 0.01, sigma = i => SMAX * Math.pow(SMIN / SMAX, i / steps); // geometric noise schedule
    const P = LW.canvas(root, { height: w => (w < 640 ? 760 : 470) });
    const ctl = LW.controls(root);
    const genB = LW.button(ctl, "Generate crystals from noise", () => start(), { primary: true });
    LW.seg(ctl, { label: "Condition on composition", options: [["any", "Any"], ["A", "Element A only"], ["AB", "A and B"]], value: cond, onChange: v => { cond = v; } });
    const c2 = LW.controls(root);
    LW.slider(c2, { label: "Denoising steps", min: 10, max: 150, step: 1, value: steps, fmt: v => String(v), onInput: v => { steps = v; } });
    LW.button(c2, "Show the forward process (crystal → noise)", () => { mode = "forward"; fwdT = 0; samples = Array.from({ length: nS }, (_, i) => { const T = TRAIN[i % TRAIN.length]; return { x: { f: T.f.map(p => p.slice()), t: T.t.slice(), lat: T.lat.slice() }, x0: T, done: false }; }); running = true; loop.start(); });
    const S = LW.stats(root, [["s", "step"], ["sig", "noise level σ"], ["what", "what is happening"]]);
    const r = LW.rng(1);
    function start() { seed++; const rr = LW.rng(seed * 13); mode = "reverse"; k = 0;
      samples = Array.from({ length: nS }, () => ({ x: { f: Array.from({ length: 4 }, () => [rr(), rr()]), t: Array.from({ length: 4 }, () => 0.5 + SMAX * 0.3 * rr.normal()), lat: [4.2 + SMAX * rr.normal() * 0.5, 4.0 + SMAX * rr.normal() * 0.5, 90 + SMAX * 12 * rr.normal()] }, w: null, done: false }));
      running = true; genB.disabled = true; loop.start(); }
    const allowed = () => (cond === "any" ? () => true : T => T.comp === cond);
    const loop = LW.loop(root, () => {
      if (!running) return loop.stop();
      if (mode === "forward") { fwdT += 1; const sg = SMAX * Math.min(1, fwdT / 70); samples.forEach((s, i) => { const T = s.x0, rr = LW.rng(i * 101 + 7); s.x = { f: T.f.map(p => [p[0] + sg * 0.15 * rr.normal(), p[1] + sg * 0.15 * rr.normal()].map(v => v - Math.floor(v))), t: T.t.map(v => v + sg * 0.3 * rr.normal()), lat: [T.lat[0] + sg * 0.5 * rr.normal(), T.lat[1] + sg * 0.5 * rr.normal(), T.lat[2] + sg * 12 * rr.normal()] }; }); if (fwdT >= 70) { running = false; } draw(sg); return; }
      tick++; if (tick % Math.max(1, Math.round(180 / steps)) !== 0) { draw(sigma(Math.min(k, steps - 1))); return; } // about 3 s per run
      for (let rep = 0; rep < 1; rep++) {
        if (k >= steps) { running = false; genB.disabled = false; samples.forEach(s => { s.done = true; }); break; }
        const s0 = sigma(k), s1 = k + 1 >= steps ? 0 : sigma(k + 1);
        samples.forEach(s => { const x0 = denoise(s.x, s0, allowed()); s.w = x0.w; const a = (s0 * s0 - s1 * s1) / (s0 * s0), nz = Math.sqrt(Math.max(0, s1 * s1 * (s0 * s0 - s1 * s1) / (s0 * s0)));
          for (let i = 0; i < 4; i++) { for (let d = 0; d < 2; d++) { const diff = wrapd(x0.f[i][d] - s.x.f[i][d]); let v = s.x.f[i][d] + a * diff + nz * 0.25 * r.normal(); s.x.f[i][d] = v - Math.floor(v); } s.x.t[i] += a * (x0.t[i] - s.x.t[i]) + nz * 0.3 * r.normal(); }
          for (let j = 0; j < 3; j++) s.x.lat[j] += a * (x0.lat[j] - s.x.lat[j]) + nz * (j === 2 ? 12 : 0.5) * r.normal(); });
        k++;
      }
      draw(sigma(Math.min(k, steps - 1)));
    });
    function name(s) { const c = TRAIN.filter(allowed()).map(T => [T.name, align(s.x, T).d2]).sort((a, b) => a[1] - b[1])[0]; return c ? c[0] : ""; }
    function drawCell(ctx, C, cx, cy, size, s, faded) {
      const [a, b, g] = s.x.lat, gr = LW.clamp(g, 20, 160) * Math.PI / 180, A = Math.max(1.5, Math.min(7, a)), B = Math.max(1.5, Math.min(7, b));
      const sc = size / 12, va = [A * sc, 0], vb = [B * sc * Math.cos(gr), -B * sc * Math.sin(gr)], o = [cx - (va[0] + vb[0]) / 2, cy - (va[1] + vb[1]) / 2];
      const P2 = (u, v) => [o[0] + u * va[0] + v * vb[0], o[1] + u * va[1] + v * vb[1]];
      ctx.save(); ctx.beginPath(); ctx.rect(cx - size / 2, cy - size / 2, size, size); ctx.clip();
      for (let iu = -2; iu <= 2; iu++) for (let iv = -2; iv <= 2; iv++) { const home = iu === 0 && iv === 0;
        if (home) { ctx.strokeStyle = C.ink3; ctx.lineWidth = 1.2; ctx.beginPath(); [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([u, v], q) => { const p = P2(u, v); q ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.stroke(); }
        s.x.f.forEach((f, i) => { const p = P2(f[0] + iu, f[1] + iv), tt = LW.clamp(s.x.t[i], 0, 1); ctx.globalAlpha = (home ? 1 : 0.28) * (faded ? 0.8 : 1);
          const col = `rgb(${Math.round(76 + (240 - 76) * tt)},${Math.round(110 + (140 - 110) * tt)},${Math.round(245 + (46 - 245) * tt)})`; LW.dot(ctx, p[0], p[1], Math.max(3, size / 26), col, home ? C.card : null, 1.2); });
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    function draw(sg) {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const cols = W < 640 ? 2 : 3, rows = Math.ceil(nS / cols), cw = W / cols, ch = (H - 40) / rows, size = Math.min(cw, ch) - 26;
      samples.forEach((s, i) => { const cx = (i % cols + 0.5) * cw, cy = 34 + Math.floor(i / cols) * ch + ch / 2 - 6;
        ctx.fillStyle = C.bg2; ctx.fillRect(cx - size / 2, cy - size / 2, size, size); drawCell(ctx, C, cx, cy, size, s, false);
        const label = mode === "forward" ? (sg > 1.5 ? "noise" : s.x0.name) : s.done ? name(s) : "denoising…";
        LW.text(ctx, label, cx, cy + size / 2 + 15, { color: s.done ? C.ink : C.ink3, size: 11.5, weight: 600, align: "center" }); });
      // noise bar
      const frac = Math.min(1, (sg || 0) / SMAX); ctx.fillStyle = C.line; ctx.fillRect(14, 10, W - 28, 8); ctx.fillStyle = rgba(VIOLET, 0.8); ctx.fillRect(14, 10, (W - 28) * frac, 8);
      LW.text(ctx, "noise level", W - 14, 30, { color: C.ink3, size: 10, align: "right" });
      LW.text(ctx, "blue = element A   orange = element B   faint copies = periodic images", 14, 32, { color: C.ink3, size: 10 });
      S.set("s", mode === "forward" ? fwdT + " / 70" : k + " / " + steps); S.set("sig", (sg || 0).toFixed(3));
      S.set("what", mode === "forward" ? "the forward process adds noise until nothing of the crystal remains" : !samples.length ? "press Generate" : running ? "each step: predict the clean crystal, then move part of the way towards it and add a little fresh noise" : "done: every cell has become a crystal; generate again for new samples");
    }
    P.draw = () => draw(running ? sigma(Math.min(k, steps - 1)) : 0);
    start(); running = false; genB.disabled = false; samples.forEach(s => { s.done = false; }); draw(SMAX);
  });
})();
