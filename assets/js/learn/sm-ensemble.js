/* Statistical mechanics: the partition function as a sum of Boltzmann weights, and free energy
   as the competition between energy and entropy (sampled live). Units: k_B = 1. */
(function () {
  "use strict";
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const SYS = {
    two: { name: "Two-level system", levels: [[0, 1], [1, 1]] },
    degen: { name: "Ground state + 3-fold excited level", levels: [[0, 1], [1, 3]] },
    ho: { name: "Harmonic oscillator (ħω = 1)", levels: Array.from({ length: 40 }, (_, n) => [n + 0.5, 1]) },
    rotor: { name: "Rigid rotor (B = 0.25)", levels: Array.from({ length: 30 }, (_, J) => [0.25 * J * (J + 1), 2 * J + 1]) },
    custom: { name: "Your own levels (drag them)", levels: [[0, 1], [0.6, 2], [1.5, 1], [2.2, 4]] }
  };
  function thermo(levels, T) { const b = 1 / T, e0 = Math.min(...levels.map(l => l[0])); let Z = 0, U = 0, U2 = 0;
    levels.forEach(([e, g]) => { const w = g * Math.exp(-b * (e - e0)); Z += w; U += w * e; U2 += w * e * e; });
    U /= Z; U2 /= Z; const lnZ = Math.log(Z) - b * e0, F = -T * lnZ, S = (U - F) / T, C = (U2 - U * U) / (T * T); return { Z: Math.exp(lnZ), lnZ, U, F, S, C }; }
  LW.register("zsum", function (root, opts) {
    let key = (opts && opts.sys) || "degen", T = 0.6, drag = -1;
    const P = LW.canvas(root, { height: w => (w < 640 ? 640 : 420) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "System", options: Object.keys(SYS).map(k => [k, SYS[k].name]), value: key, onChange: v => { key = v; draw(); } });
    LW.slider(ctl, { label: "Temperature k<sub>B</sub>T (in units of the level spacing)", min: 0.05, max: 10, value: T, log: true, fmt: v => v.toFixed(2), onInput: v => { T = v; draw(); } });
    const S = LW.stats(root, [["Z", "partition function Z = Σ g e^(−E/kT)"], ["U", "mean energy U"], ["F", "free energy F = −kT ln Z"], ["S", "entropy S = (U − F)/T"], ["C", "heat capacity C"]]);
    let lv = null;
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const L = SYS[key].levels, shown = L.slice(0, key === "ho" || key === "rotor" ? 9 : L.length), narrow = W < 640, th = thermo(L, T);
      const top = 26, hh = narrow ? 250 : H * 0.55, emax = Math.max(...shown.map(l => l[0])) * 1.1 + 0.2;
      const ex = 60, ew = narrow ? W * 0.38 : W * 0.22, Y = e => top + hh - (e / emax) * hh;
      LW.text(ctx, "energy levels (dots = degeneracy g)", ex - 40, 16, { color: C.ink2, size: 11.5, weight: 600 });
      lv = []; shown.forEach(([e, g], i) => { const y = Y(e); ctx.strokeStyle = BLUE; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ex, y); ctx.lineTo(ex + ew, y); ctx.stroke();
        for (let k = 0; k < Math.min(g, 9); k++) LW.dot(ctx, ex + 8 + k * 9, y - 6, 3, BLUE, null); if (g > 9) LW.text(ctx, "+" + (g - 9), ex + 92, y - 2, { color: BLUE, size: 10 });
        LW.text(ctx, "E=" + e.toFixed(2), ex - 6, y + 4, { color: C.ink3, size: 10, align: "right", mono: true }); lv.push({ y, i }); });
      // weights: g e^{-E/kT}, drawn as bars from the level to the right; and the stacked Z
      const e0 = Math.min(...L.map(l => l[0])), ws = L.map(([e, g]) => g * Math.exp(-(e - e0) / T)), Zr = ws.reduce((a, b) => a + b, 0), wmax = Math.max(...ws);
      const bx = ex + ew + 30, bw = narrow ? W - bx - 20 : W * 0.3;
      LW.text(ctx, "Boltzmann weight g·e^(−(E−E₀)/kT)", bx, 16, { color: C.ink2, size: 11.5, weight: 600 });
      shown.forEach(([e], i) => { const y = Y(e), w = ws[i] / Math.max(wmax, 1e-12) * bw; ctx.fillStyle = rgba(GOLD, 0.75); ctx.fillRect(bx, y - 7, w, 14); LW.text(ctx, ws[i] < 1e-3 ? ws[i].toExponential(1) : ws[i].toFixed(3), bx + w + 5, y + 4, { color: C.ink2, size: 10, mono: true }); });
      // stacked bar of probabilities
      const sx = narrow ? 20 : bx + bw + 80, sy = narrow ? top + hh + 30 : top, sw = narrow ? W - 40 : 38, sh = narrow ? 28 : hh;
      LW.text(ctx, "Z: the sum, and each level's share p = weight / Z", narrow ? sx : sx - 50, narrow ? sy - 8 : 16, { color: C.ink2, size: 11.5, weight: 600 });
      let acc = 0; const pal = [BLUE, TEAL, ORANGE, VIOLET, ROSE, GOLD];
      ws.forEach((w, i) => { const f = w / Zr; if (f < 1e-4) return; ctx.fillStyle = pal[i % pal.length]; ctx.globalAlpha = 0.8;
        if (narrow) ctx.fillRect(sx + acc * sw, sy, f * sw, sh); else ctx.fillRect(sx, sy + sh - (acc + f) * sh, sw, f * sh);
        ctx.globalAlpha = 1; if (f > 0.06) { if (narrow) LW.text(ctx, (100 * f).toFixed(0) + "%", sx + (acc + f / 2) * sw, sy + sh / 2 + 4, { color: "#fff", size: 10, weight: 700, align: "center" }); else LW.text(ctx, (100 * f).toFixed(0) + "%", sx + sw + 6, sy + sh - (acc + f / 2) * sh + 4, { color: C.ink2, size: 10, mono: true }); } acc += f; });
      // thermodynamic curves against T
      const gy = narrow ? sy + sh + 40 : top + hh + 46, gh = H - gy - 36, Ts = LW.linspace(Math.log10(0.05), 1, 120).map(v => Math.pow(10, v)), curves = Ts.map(t => thermo(L, t));
      const A = LW.axes(ctx, { x: 52, y: gy, w: W - 66, h: gh }, { xr: [Math.log10(0.05), 1], yr: [0, 1.08], xlabel: "temperature kT (log scale)", colors: C, xfmt: v => String(+Math.pow(10, v).toPrecision(1)), ny: 3, ylabels: false, title: "how U, S and C change with temperature (each scaled to its maximum)" });
      const norm = a => { const m = Math.max(...a.map(Math.abs)) || 1; return a.map(v => v / m); };
      A.clip(); const lx = Ts.map(Math.log10);
      LW.path(ctx, lx, norm(curves.map(c => c.U - Math.min(...L.map(l => l[0])))), A, { color: ORANGE, width: 2 });
      LW.path(ctx, lx, norm(curves.map(c => c.S)), A, { color: TEAL, width: 2 });
      LW.path(ctx, lx, norm(curves.map(c => c.C)), A, { color: ROSE, width: 2 });
      ctx.strokeStyle = C.ink3; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(A.sx(Math.log10(T)), A.box.y); ctx.lineTo(A.sx(Math.log10(T)), A.box.y + A.box.h); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      LW.text(ctx, "U", A.box.x + A.box.w - 40, A.box.y + 14, { color: ORANGE, size: 11, weight: 700 }); LW.text(ctx, "S", A.box.x + A.box.w - 26, A.box.y + 14, { color: TEAL, size: 11, weight: 700 }); LW.text(ctx, "C", A.box.x + A.box.w - 12, A.box.y + 14, { color: ROSE, size: 11, weight: 700 });
      S.set("Z", th.Z < 1e4 ? th.Z.toFixed(3) : th.Z.toExponential(2)); S.set("U", th.U.toFixed(3)); S.set("F", th.F.toFixed(3)); S.set("S", th.S.toFixed(3) + " k_B"); S.set("C", th.C.toFixed(3) + " k_B");
    }
    P.draw = draw;
    LW.drag(P.cv, { down: q => { if (key !== "custom" || !lv) return false; const c = lv.reduce((b, l) => (Math.abs(l.y - q.y) < Math.abs(b.y - q.y) ? l : b), lv[0]); if (Math.abs(c.y - q.y) > 12 || c.i === 0) return false; drag = c.i; return true; },
      move: q => { const L = SYS.custom.levels, top = 26, hh = P.W < 640 ? 250 : P.H * 0.55, emax = Math.max(...L.map(l => l[0])) * 1.1 + 0.2; L[drag][0] = LW.clamp((top + hh - q.y) / hh * emax, 0.02, 4); draw(); } });
    draw();
  });

  /* ---------------- free energy = energy versus entropy, sampled ---------------- */
  // two wells on x in [-3, 3]: A at -1.2 (deep, narrow), B at +1.3 (shallower, broad)
  LW.register("pmf", function (root) {
    let T = 0.35, wB = 0.9, dE = 0.6, x = -1.2, hist, nS = 0, r = LW.rng(5), flips = 0;
    const NB = 90, X0 = -3, X1 = 3;
    const V = xx => { const a = Math.exp(-((xx + 1.2) ** 2) / (2 * 0.22 * 0.22)), b = Math.exp(-((xx - 1.3) ** 2) / (2 * wB * wB)); return 1.6 - 1.6 * a - (1.6 - dE) * b + 0.05 * xx ** 4; };
    const P = LW.canvas(root, { height: w => (w < 640 ? 560 : 420) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Temperature k<sub>B</sub>T", min: 0.05, max: 1.2, step: 0.01, value: T, fmt: v => v.toFixed(2), onInput: v => { T = v; reset(); } });
    LW.slider(ctl, { label: "Width of well B", min: 0.25, max: 1.4, step: 0.01, value: wB, fmt: v => v.toFixed(2), onInput: v => { wB = v; reset(); } });
    LW.slider(ctl, { label: "Energy penalty of well B, ΔE", min: 0, max: 1.2, step: 0.01, value: dE, fmt: v => v.toFixed(2), onInput: v => { dE = v; reset(); } });
    const c2 = LW.controls(root); const runB = LW.button(c2, "Pause sampling", () => { runB.textContent = loop.toggle() ? "Pause sampling" : "Resume sampling"; }, { primary: true });
    const S = LW.stats(root, [["n", "samples"], ["pa", "time in A / time in B"], ["dF", "ΔF = F_B − F_A  (sampled)"], ["ex", "ΔF exact"], ["dec", "ΔF = ΔU − TΔS"]]);
    function reset() { hist = new Float64Array(NB); nS = 0; flips = 0; draw(); }
    const loop = LW.loop(root, () => { const step = 0.35; for (let k = 0; k < 4000; k++) { const xn = x + (r() * 2 - 1) * step; if (xn > X0 && xn < X1) { const d = V(xn) - V(x); if (d <= 0 || r() < Math.exp(-d / T)) { if ((xn > 0) !== (x > 0)) flips++; x = xn; } } hist[Math.min(NB - 1, Math.floor((x - X0) / (X1 - X0) * NB))]++; nS++; } draw(); });
    function exact() { const xs = LW.linspace(X0, X1, 2000), dx = xs[1] - xs[0]; let ZA = 0, ZB = 0, UA = 0, UB = 0; xs.forEach(xx => { const w = Math.exp(-V(xx) / T) * dx; if (xx < 0) { ZA += w; UA += w * V(xx); } else { ZB += w; UB += w * V(xx); } }); UA /= ZA; UB /= ZB; const dF = -T * Math.log(ZB / ZA), dU = UB - UA; return { dF, dU, TdS: dU - dF, ratio: ZA / ZB }; }
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const xs = LW.linspace(X0, X1, 300), narrow = W < 640, hh = (H - 100) / 2;
      const A = LW.axes(ctx, { x: 52, y: 24, w: W - 66, h: hh }, { xr: [X0, X1], yr: [-0.1, 2.2], ylabel: "energy", colors: C, xlabels: false, title: "potential energy U(x) (blue) and free energy F(x) = −kT ln P(x) from the samples (orange)" });
      A.clip(); ctx.fillStyle = rgba(BLUE, 0.06); ctx.fillRect(A.box.x, A.box.y, A.sx(0) - A.box.x, A.box.h); ctx.fillStyle = rgba(TEAL, 0.06); ctx.fillRect(A.sx(0), A.box.y, A.box.x + A.box.w - A.sx(0), A.box.h);
      LW.path(ctx, xs, xs.map(V), A, { color: BLUE, width: 2.6 });
      // kT ruler
      ctx.strokeStyle = VIOLET; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(A.box.x + 14, A.sy(0.05)); ctx.lineTo(A.box.x + 14, A.sy(0.05 + T)); ctx.stroke(); LW.text(ctx, "kT", A.box.x + 20, A.sy(0.05 + T / 2) + 4, { color: VIOLET, size: 11, weight: 700 });
      if (nS > 2000) { const dx = (X1 - X0) / NB, Fx = [], Xc = []; let fmin = Infinity; for (let i = 0; i < NB; i++) { if (hist[i] > 0) { const p = hist[i] / (nS * dx), f = -T * Math.log(p); Fx.push(f); Xc.push(X0 + (i + 0.5) * dx); fmin = Math.min(fmin, f); } }
        LW.path(ctx, Xc, Fx.map(f => f - fmin + Math.min(...xs.map(V))), A, { color: ORANGE, width: 2.2 }); }
      ctx.restore();
      LW.text(ctx, "A: deep, narrow", A.sx(-1.2), A.box.y + 14, { color: BLUE, size: 11, weight: 700, align: "center" }); LW.text(ctx, "B: shallow, broad", A.sx(1.3), A.box.y + 14, { color: TEAL, size: 11, weight: 700, align: "center" });
      // histogram
      const B = LW.axes(ctx, { x: 52, y: 24 + hh + 40, w: W - 66, h: hh - 10 }, { xr: [X0, X1], yr: [0, 1], xlabel: "coordinate x", colors: C, ylabels: false, title: "where the system spends its time: histogram of samples and the exact Boltzmann density e^(−U/kT)/Z" });
      B.clip(); const mx = Math.max(...hist, 1); for (let i = 0; i < NB; i++) { const x0 = X0 + i * (X1 - X0) / NB; ctx.fillStyle = x0 < 0 ? rgba(BLUE, 0.55) : rgba(TEAL, 0.55); ctx.fillRect(B.sx(x0) + 0.5, B.sy(hist[i] / mx * 0.95), B.sx(x0 + (X1 - X0) / NB) - B.sx(x0) - 1, B.sy(0) - B.sy(hist[i] / mx * 0.95)); }
      const pe = xs.map(xx => Math.exp(-V(xx) / T)), pm = Math.max(...pe); LW.path(ctx, xs, pe.map(v => v / pm * 0.95), B, { color: ROSE, width: 1.8, dash: [5, 4] });
      LW.dot(ctx, B.sx(x), B.box.y + B.box.h - 4, 5, ORANGE, C.card, 1.5); ctx.restore();
      const ex = exact(); let nA = 0, nB = 0; for (let i = 0; i < NB; i++) { if (X0 + (i + 0.5) * (X1 - X0) / NB < 0) nA += hist[i]; else nB += hist[i]; }
      S.set("n", nS.toLocaleString() + (flips < 5 && nS > 50000 ? "  (few crossings: barrier ≫ kT)" : ""));
      S.set("pa", nB ? (nA / nB).toFixed(2) : "–"); S.set("dF", nA && nB ? (-T * Math.log(nB / nA)).toFixed(3) : "–"); S.set("ex", ex.dF.toFixed(3) + (ex.dF < 0 ? "  (B favoured)" : "  (A favoured)"));
      S.set("dec", ex.dU.toFixed(3) + " − " + ex.TdS.toFixed(3));
    }
    P.draw = draw; reset(); loop.start();
  });
})();
