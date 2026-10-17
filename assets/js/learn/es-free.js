/* Free-energy methods: umbrella sampling with WHAM, free-energy perturbation (Zwanzig) and BAR,
   and Jarzynski's equality from non-equilibrium pulling. Units: k_B T = 1. */
(function () {
  "use strict";
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const PAL = [BLUE, TEAL, ORANGE, VIOLET, ROSE, GOLD];
  const X0 = -2.2, X1 = 2.2, NB = 110, DX = (X1 - X0) / NB, GRID = Array.from({ length: NB }, (_, i) => X0 + (i + 0.5) * DX);

  /* ---------------- 1. umbrella sampling and WHAM ---------------- */
  LW.register("umbrella", function (root) {
    let K = 40, nWin = 13, walk, hist, Ntot, f, r = LW.rng(5), iters = 0;
    const F = s => 8 * (s * s - 1) ** 2 + 1.5 * s, dF = s => 32 * s * (s * s - 1) + 1.5;
    const P = LW.canvas(root, { height: w => (w < 640 ? 600 : 440) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Number of windows", min: 3, max: 25, step: 1, value: nWin, fmt: v => String(v), onInput: v => { nWin = v; reset(); } });
    LW.slider(ctl, { label: "Spring constant κ (k<sub>B</sub>T per unit²)", min: 1, max: 80, step: 1, value: K, fmt: v => String(v), onInput: v => { K = v; reset(); } });
    const runB = LW.button(ctl, "Pause", () => { runB.textContent = loop.toggle() ? "Pause" : "Run"; }, { primary: true });
    LW.button(ctl, "Restart", () => reset());
    const S = LW.stats(root, [["n", "samples per window"], ["ov", "worst overlap between neighbouring windows"], ["it", "WHAM iterations to converge"], ["err", "error of the reconstruction"]]);
    const centres = () => LW.linspace(-1.8, 1.8, nWin);
    function reset() { const c = centres(); walk = c.map(x => ({ x, v: 0 })); hist = c.map(() => new Float64Array(NB)); Ntot = c.map(() => 0); f = c.map(() => 0); draw(); }
    const loop = LW.loop(root, () => { const c = centres(), dt = 0.003, g = 5, c1 = Math.exp(-g * dt), c2 = Math.sqrt(1 - c1 * c1);
      walk.forEach((w, k) => { for (let s = 0; s < 120; s++) { const fo = x => -dF(x) - K * (x - c[k]); w.v += 0.5 * dt * fo(w.x); w.x += 0.5 * dt * w.v; w.v = c1 * w.v + c2 * r.normal(); w.x += 0.5 * dt * w.v; w.v += 0.5 * dt * fo(w.x); if (s % 4 === 0) { const b = Math.floor((w.x - X0) / DX); if (b >= 0 && b < NB) { hist[k][b]++; Ntot[k]++; } } } }); draw(); });
    function wham() { const c = centres(), bias = c.map(ck => GRID.map(x => 0.5 * K * (x - ck) ** 2)); let Pu = new Float64Array(NB); f = f.length === c.length ? f : c.map(() => 0); let it = 0;
      for (; it < 500; it++) { for (let i = 0; i < NB; i++) { let num = 0, den = 0; for (let k = 0; k < c.length; k++) { num += hist[k][i]; den += Ntot[k] * Math.exp(f[k] - bias[k][i]); } Pu[i] = den > 0 ? num / den : 0; }
        let dmax = 0; const fn = c.map((_, k) => { let z = 0; for (let i = 0; i < NB; i++) z += Pu[i] * Math.exp(-bias[k][i]); return -Math.log(z || 1e-300); }); const s0 = fn[0]; fn.forEach((v, k) => { dmax = Math.max(dmax, Math.abs(v - s0 - (f[k] - f[0]))); }); f = fn.map(v => v - s0); if (dmax < 1e-6) break; }
      iters = it; return Pu; }
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const c = centres(), hh = (H - 100) / 2;
      const fs = GRID.map(F), fmin = Math.min(...fs);
      const A = LW.axes(ctx, { x: 52, y: 22, w: W - 66, h: hh }, { xr: [X0, X1], yr: [fmin - 1, fmin + 14], ylabel: "energy / kT", colors: C, xlabels: false, title: "free energy (blue), the umbrella potentials (thin), and the WHAM reconstruction (orange)", ny: 4 });
      A.clip(); c.forEach((ck, k) => LW.path(ctx, GRID, GRID.map(x => F(ck) + 0.5 * K * (x - ck) ** 2), A, { color: PAL[k % PAL.length], width: 1, alpha: 0.5 }));
      LW.path(ctx, GRID, fs, A, { color: BLUE, width: 2.6 });
      const ready = Ntot.every(n => n > 50); let err = NaN;
      if (ready) { const Pu = wham(), est = Array.from(Pu, p => (p > 0 ? -Math.log(p) : NaN)), ok = est.map((e, i) => isFinite(e) && fs[i] < fmin + 13), n = ok.filter(Boolean).length, sh = ok.reduce((a, o, i) => a + (o ? fs[i] - est[i] : 0), 0) / n; LW.path(ctx, GRID, est.map(e => e + sh), A, { color: ORANGE, width: 2.4, dash: [6, 3] }); err = Math.sqrt(ok.reduce((a, o, i) => a + (o ? (est[i] + sh - fs[i]) ** 2 : 0), 0) / n); }
      walk.forEach((w, k) => LW.dot(ctx, A.sx(w.x), A.sy(F(w.x)), 4, PAL[k % PAL.length], C.card, 1)); ctx.restore();
      const B = LW.axes(ctx, { x: 52, y: 22 + hh + 40, w: W - 66, h: hh - 10 }, { xr: [X0, X1], yr: [0, 1.05], xlabel: "collective variable s", colors: C, ylabels: false, title: "the biased histogram of each window: neighbours must overlap", ny: 2 });
      B.clip(); hist.forEach((h, k) => { const m = Math.max(...h, 1); LW.band(ctx, GRID, GRID.map(() => 0), Array.from(h, v => v / m), B, rgba(PAL[k % PAL.length], 0.35)); }); ctx.restore();
      let ov = 1; for (let k = 0; k + 1 < hist.length; k++) { const a = hist[k], b = hist[k + 1], sa = a.reduce((x, y) => x + y, 0) || 1, sb = b.reduce((x, y) => x + y, 0) || 1; let o = 0; for (let i = 0; i < NB; i++) o += Math.min(a[i] / sa, b[i] / sb); ov = Math.min(ov, o); }
      S.set("n", String(Math.round(Ntot.reduce((a, b) => a + b, 0) / Ntot.length))); S.set("ov", (100 * ov).toFixed(0) + " %" + (ov < 0.05 ? "  (gap: WHAM cannot connect the windows)" : "")); S.set("it", ready ? String(iters) : "–"); S.set("err", isFinite(err) ? err.toFixed(2) + " kT" : "collecting…");
    }
    P.draw = draw; reset(); loop.start();
  });

  /* ---------------- 2. free-energy perturbation and BAR ---------------- */
  LW.register("fep", function (root) {
    let d = 1.0, ratio = 2.0, samp = { fw: [], bw: [] }, hist = [], r = LW.rng(9);
    const kA = 4;
    const P = LW.canvas(root, { height: w => (w < 640 ? 600 : 400) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Shift between states, b − a", min: 0, max: 3, step: 0.05, value: d, fmt: v => v.toFixed(2), onInput: v => { d = v; reset(); } });
    LW.slider(ctl, { label: "Stiffness ratio k<sub>B</sub>/k<sub>A</sub>", min: 0.25, max: 4, step: 0.05, value: ratio, fmt: v => v.toFixed(2), onInput: v => { ratio = v; reset(); } });
    const runB = LW.button(ctl, "Pause", () => { runB.textContent = loop.toggle() ? "Pause" : "Run"; }, { primary: true });
    const S = LW.stats(root, [["ex", "exact ΔF = ½ kT ln(k_B/k_A)"], ["fw", "Zwanzig from A"], ["bw", "Zwanzig from B"], ["bar", "BAR (both)"], ["n", "samples from each state"]]);
    const UA = x => 0.5 * kA * x * x, UB = x => 0.5 * kA * ratio * (x - d) ** 2;
    function reset() { samp = { fw: [], bw: [] }; hist = []; draw(); }
    const lse = a => { const m = Math.max(...a); return m + Math.log(a.reduce((s, v) => s + Math.exp(v - m), 0)); };
    function bar(fw, bw) { // solve Bennett's equation for ΔF by bisection
      const n0 = fw.length, n1 = bw.length; if (!n0 || !n1) return NaN; const M = Math.log(n0 / n1), g = x => 1 / (1 + Math.exp(x));
      const h = dF => fw.reduce((s, w) => s + g(M + w - dF), 0) - bw.reduce((s, w) => s + g(-M + w + dF), 0);
      let lo = -20, hi = 20; for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (h(lo) * h(mid) <= 0) hi = mid; else lo = mid; } return (lo + hi) / 2; }
    const est = () => { const fw = samp.fw, bw = samp.bw; return { fw: fw.length ? -(lse(fw.map(w => -w)) - Math.log(fw.length)) : NaN, bw: bw.length ? (lse(bw.map(w => -w)) - Math.log(bw.length)) : NaN, bar: bar(fw, bw) }; };
    const loop = LW.loop(root, () => { const sA = 1 / Math.sqrt(kA), sB = 1 / Math.sqrt(kA * ratio); for (let i = 0; i < 20; i++) { const xa = sA * r.normal(), xb = d + sB * r.normal(); samp.fw.push(UB(xa) - UA(xa)); samp.bw.push(UA(xb) - UB(xb)); }
      const N = samp.fw.length; if (N % 100 === 0 || N < 200) { const e = est(); hist.push([Math.log10(N), e.fw, e.bw, e.bar]); } if (N > 20000) { loop.stop(); runB.textContent = "Run"; } draw(); });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640, pw = narrow ? W - 64 : (W - 140) / 2, ph = narrow ? (H - 110) / 2 : H - 60, ex = 0.5 * Math.log(ratio);
      const lo = -6, hi = 14, nb = 60, dx = (hi - lo) / nb, hf = new Float64Array(nb), hb = new Float64Array(nb);
      samp.fw.forEach(w => { const b = Math.floor((w - lo) / dx); if (b >= 0 && b < nb) hf[b]++; }); samp.bw.forEach(w => { const b = Math.floor((-w - lo) / dx); if (b >= 0 && b < nb) hb[b]++; });
      const mx = Math.max(1, ...hf, ...hb), xs = Array.from({ length: nb }, (_, i) => lo + (i + 0.5) * dx);
      const A = LW.axes(ctx, { x: 50, y: 22, w: pw, h: ph }, { xr: [lo, hi], yr: [0, 1.05], xlabel: "ΔU = U_B − U_A  (kT)", colors: C, ylabels: false, title: "ΔU sampled in A (blue) and in B (teal)", ny: 2 });
      A.clip(); LW.band(ctx, xs, xs.map(() => 0), Array.from(hf, v => v / mx), A, rgba(BLUE, 0.4)); LW.band(ctx, xs, xs.map(() => 0), Array.from(hb, v => v / mx), A, rgba(TEAL, 0.4)); LW.path(ctx, [ex, ex], [0, 1.05], A, { color: GOLD, width: 2, dash: [5, 4] }); ctx.restore();
      LW.text(ctx, "gold: ΔF", A.sx(ex) + 4, A.box.y + 14, { color: GOLD, size: 10.5 });
      const bx = narrow ? 50 : 50 + pw + 70, by = narrow ? 22 + ph + 60 : 22;
      const B = LW.axes(ctx, { x: bx, y: by, w: pw, h: ph }, { xr: [0, 4.4], yr: [ex - 2, ex + 2], xlabel: "samples per state (log₁₀)", ylabel: "ΔF estimate (kT)", colors: C, title: "convergence of the three estimators", ny: 4 });
      B.clip(); LW.path(ctx, [0, 4.4], [ex, ex], B, { color: GOLD, width: 1.5, dash: [5, 4] }); [[1, BLUE], [2, TEAL], [3, ROSE]].forEach(([k, col]) => LW.path(ctx, hist.map(h => h[0]), hist.map(h => h[k]), B, { color: col, width: 2 })); ctx.restore();
      LW.text(ctx, "blue: from A   teal: from B   rose: BAR", B.box.x + B.box.w - 4, B.box.y + B.box.h - 8, { color: C.ink3, size: 10.5, align: "right" });
      const e = est(); S.set("ex", ex.toFixed(3)); S.set("fw", isFinite(e.fw) ? e.fw.toFixed(3) : "–"); S.set("bw", isFinite(e.bw) ? e.bw.toFixed(3) : "–"); S.set("bar", isFinite(e.bar) ? e.bar.toFixed(3) : "–"); S.set("n", String(samp.fw.length));
    }
    P.draw = draw; reset(); loop.start();
  });

  /* ---------------- 3. Jarzynski's equality ---------------- */
  LW.register("jarzynski", function (root) {
    let speed = 1, nTraj = 0, works = [], r = LW.rng(13), running = null;
    const Ksp = 20, L0 = -1, L1 = 1, U = x => 3 * (x * x - 1) ** 2 + 0.8 * x, dU = x => 12 * x * (x * x - 1) + 0.8;
    const lnZ = lam => { let z = 0; for (let x = -3; x <= 3; x += 0.002) z += Math.exp(-(U(x) + 0.5 * Ksp * (x - lam) ** 2)) * 0.002; return Math.log(z); };
    const dFex = -(lnZ(L1) - lnZ(L0));
    const P = LW.canvas(root, { height: w => (w < 640 ? 600 : 380) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Pulling speed", min: 0.05, max: 10, value: speed, log: true, fmt: v => v.toFixed(2), onInput: v => { speed = v; works = []; nTraj = 0; draw(); } });
    const runB = LW.button(ctl, "Pull repeatedly", () => { runB.textContent = loop.toggle() ? "Pause" : "Pull repeatedly"; }, { primary: true });
    const S = LW.stats(root, [["n", "pulls"], ["mw", "mean work ⟨W⟩"], ["jz", "Jarzynski −kT ln⟨e^(−W/kT)⟩"], ["ex", "exact ΔF"], ["dis", "dissipated work ⟨W⟩ − ΔF"]]);
    function pull() { // overdamped Langevin in the moving trap; work W = Σ ∂H/∂λ dλ
      let x = L0 + 0.15 * r.normal(); for (let k = 0; k < 400; k++) { x += 0.002 * (-dU(x) - Ksp * (x - L0)) + Math.sqrt(2 * 0.002) * r.normal(); }
      const dt = 0.002, T = (L1 - L0) / speed, n = Math.max(20, Math.round(T / dt)), dl = (L1 - L0) / n; let lam = L0, W = 0; const tr = [];
      for (let k = 0; k < n; k++) { W += -Ksp * (x - lam) * dl; lam += dl; x += dt * (-dU(x) - Ksp * (x - lam)) + Math.sqrt(2 * dt) * r.normal(); if (k % Math.max(1, Math.round(n / 80)) === 0) tr.push([lam, x]); }
      return { W, tr };
    }
    const loop = LW.loop(root, () => { const reps = speed > 2 ? 6 : speed > 0.5 ? 2 : 1; for (let i = 0; i < reps; i++) { const p = pull(); works.push(p.W); running = p.tr; nTraj++; } if (nTraj > 3000) { loop.stop(); runB.textContent = "Pull repeatedly"; } draw(); });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640, pw = narrow ? W - 64 : (W - 140) / 2, ph = narrow ? (H - 110) / 2 : H - 60;
      const A = LW.axes(ctx, { x: 50, y: 22, w: pw, h: ph }, { xr: [-2, 2], yr: [-2, 10], xlabel: "x", ylabel: "energy (kT)", colors: C, title: "a particle dragged by a moving trap", ny: 4 });
      A.clip(); const xs = LW.linspace(-2, 2, 200); LW.path(ctx, xs, xs.map(U), A, { color: BLUE, width: 2.2 });
      if (running) { const [lam, x] = running[running.length - 1]; LW.path(ctx, xs, xs.map(q => U(q) + 0.5 * Ksp * (q - lam) ** 2), A, { color: VIOLET, width: 1.4, dash: [4, 3] }); LW.dot(ctx, A.sx(x), A.sy(U(x)), 6, ROSE, C.card, 1.5); } ctx.restore();
      const bx = narrow ? 50 : 50 + pw + 70, by = narrow ? 22 + ph + 60 : 22, lo = dFex - 3, hi = dFex + 12, nb = 50, dx = (hi - lo) / nb, h = new Float64Array(nb); works.forEach(w => { const b = Math.floor((w - lo) / dx); if (b >= 0 && b < nb) h[b]++; });
      const B = LW.axes(ctx, { x: bx, y: by, w: pw, h: ph }, { xr: [lo, hi], yr: [0, 1.05], xlabel: "work W (kT)", colors: C, ylabels: false, title: "distribution of work over many pulls", ny: 2 });
      const m = Math.max(1, ...h), xsb = Array.from({ length: nb }, (_, i) => lo + (i + 0.5) * dx); B.clip(); LW.band(ctx, xsb, xsb.map(() => 0), Array.from(h, v => v / m), B, rgba(ORANGE, 0.45)); LW.path(ctx, [dFex, dFex], [0, 1.05], B, { color: GOLD, width: 2, dash: [5, 4] });
      const mw = works.reduce((a, b) => a + b, 0) / (works.length || 1); if (works.length) LW.path(ctx, [mw, mw], [0, 1.05], B, { color: ROSE, width: 2 }); ctx.restore();
      LW.text(ctx, "gold: ΔF   rose: ⟨W⟩", B.box.x + B.box.w - 4, B.box.y + 14, { color: C.ink3, size: 10.5, align: "right" });
      const mn = Math.min(...works), jz = works.length ? mn - Math.log(works.reduce((a, w) => a + Math.exp(-(w - mn)), 0) / works.length) : NaN;
      S.set("n", String(nTraj)); S.set("mw", works.length ? mw.toFixed(3) : "–"); S.set("jz", isFinite(jz) ? jz.toFixed(3) : "–"); S.set("ex", dFex.toFixed(3)); S.set("dis", works.length ? (mw - dFex).toFixed(3) : "–");
    }
    P.draw = draw; draw();
  });
})();
