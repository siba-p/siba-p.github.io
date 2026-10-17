/* Well-tempered metadynamics of the LJ7 cluster on two collective variables, the second and
   third moments of the coordination-number distribution (mu2, mu3). The box shows the cluster with
   atoms coloured by coordination number; the map shows the free-energy estimate building up from
   deposited Gaussians; the lower plot shows the basin free energies converging.
   Reference values (kT = 0.12 eps): long well-tempered runs, 4e4 tau, B 0.57, C 0.54, D 0.71 eps;
   unbiased MD, 2e5 tau, B 0.54-0.56, C 0.52-0.56 eps. */
(function () {
  "use strict";
  const N = 7, R0 = 1.5, X0 = 0.2, X1 = 1.4, Y0 = -1.0, Y1 = 2.0, G = 120, dx = (X1 - X0) / G, dy = (Y1 - Y0) / G, WK = 50;
  const BAS = [["hexagon", 0.747, 1.318, -12.53], ["B", 0.958, 0.299, -11.50], ["C", 0.76, 0.35, -11.48], ["D", 0.59, -0.12, -11.40]];
  const REF = { B: 0.57, C: 0.54, D: 0.71 };
  const BCOL = { B: "#e8792b", C: "#ae3ec9", D: "#1c7ed6" };
  const basin = (m2, m3) => (m3 > 0.9 ? "hexagon" : m2 > 0.87 ? "B" : m3 > 0.12 ? "C" : "D");
  function cvs(p, grad) { const c = new Array(N).fill(0), pairs = [];
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const ddx = p[i][0] - p[j][0], ddy = p[i][1] - p[j][1], r = Math.hypot(ddx, ddy), u = (r / R0) ** 8, s = 1 / (1 + u); c[i] += s; c[j] += s; if (grad) pairs.push([i, j, ddx, ddy, r, -8 * u / (r * (1 + u) ** 2)]); }
    const cb = c.reduce((a, b) => a + b) / N, d = c.map(x => x - cb), mu2 = d.reduce((a, x) => a + x * x, 0) / N, mu3 = d.reduce((a, x) => a + x * x * x, 0) / N;
    if (!grad) return { mu2, mu3, c };
    const d2 = d.map(x => 2 * x / N), d3 = d.map(x => 3 * (x * x - mu2) / N), g2 = p.map(() => [0, 0]), g3 = p.map(() => [0, 0]);
    pairs.forEach(([i, j, ddx, ddy, r, ds]) => { const a2 = (d2[i] + d2[j]) * ds / r, a3 = (d3[i] + d3[j]) * ds / r; g2[i][0] += a2 * ddx; g2[i][1] += a2 * ddy; g2[j][0] -= a2 * ddx; g2[j][1] -= a2 * ddy; g3[i][0] += a3 * ddx; g3[i][1] += a3 * ddy; g3[j][0] -= a3 * ddx; g3[j][1] -= a3 * ddy; });
    return { mu2, mu3, c, g2, g3 }; }
  const ccol = c => { const t = LW.clamp((c - 1.5) / 4.5, 0, 1), a = [18, 165, 148], b = [214, 51, 108], m = a.map((v, i) => Math.round(v + (b[i] - v) * t)); return `rgb(${m[0]},${m[1]},${m[2]})`; };

  LW.register("metadbox", function (root) {
    const L = LW.lj7, kT = 0.12, dt = 0.005, h0 = 0.012, sig = 0.04, pace = 250;
    let gam = 10, biasOn = true, spf = 800, nst = 0, s, V, t, ng, trail, hist, cur, img, imgAge, R;
    const P = LW.canvas(root, { height: w => (w < 640 ? 880 : 520) });
    const ctl = LW.controls(root);
    LW.check(ctl, { label: "Bias on (well-tempered metadynamics)", value: biasOn, onChange: v => { biasOn = v; } });
    LW.slider(ctl, { label: "Bias factor γ", min: 3, max: 30, step: 1, value: gam, fmt: v => v.toFixed(0), onInput: v => { gam = v; reset(); } });
    LW.slider(ctl, { label: "Simulation speed (MD steps per frame)", min: 20, max: 2000, value: spf, log: true, fmt: v => Math.round(v).toString(), onInput: v => { spf = Math.round(v); } });
    const ctl2 = LW.controls(root);
    const bRun = LW.button(ctl2, "Pause", () => { loop.toggle(); bRun.textContent = loop.running ? "Pause" : "Run"; }, { primary: true });
    LW.button(ctl2, "Restart", () => reset());
    const S = LW.stats(root, [["t", "simulated time (τ)"], ["g", "Gaussians deposited"], ["b", "current isomer"], ["f", "ΔF from the hexagon: B, C, D (ε)"]]);
    LW.note(root, "k<sub>B</sub>T = 0.12 ε. Each atom is coloured by its coordination number c<sub>i</sub>, from teal (few neighbours) to rose (six); μ<sub>2</sub> and μ<sub>3</sub> are the variance and the skewness of the c<sub>i</sub>. Every 250 steps a Gaussian of height 0.012 ε × exp(−V/(γ−1)k<sub>B</sub>T) and width 0.04 is added to the bias at the current point. Grey regions of the map have not been visited yet. Dashed lines in the lower plot are reference values from runs of 4 × 10<sup>4</sup> τ.");

    function reset() { R = L.rng(3); s = L.make(5, kT, "hexagon"); V = new Float64Array((G + 1) * (G + 1)); t = 0; nst = 0; ng = 0; trail = []; hist = []; imgAge = 1e9; s.E = L.force(s.p, s.f); cur = biasForce(); if (loop) { loop.start(); bRun.textContent = "Pause"; } draw(); }
    function Vat(x, y) { const i = Math.min(G - 1, Math.max(0, Math.floor((x - X0) / dx))), j = Math.min(G - 1, Math.max(0, Math.floor((y - Y0) / dy))), a = LW.clamp((x - X0) / dx - i, 0, 1), b = LW.clamp((y - Y0) / dy - j, 0, 1);
      const v00 = V[j * (G + 1) + i], v10 = V[j * (G + 1) + i + 1], v01 = V[(j + 1) * (G + 1) + i], v11 = V[(j + 1) * (G + 1) + i + 1];
      return [v00 * (1 - a) * (1 - b) + v10 * a * (1 - b) + v01 * (1 - a) * b + v11 * a * b, ((v10 - v00) * (1 - b) + (v11 - v01) * b) / dx, ((v01 - v00) * (1 - a) + (v11 - v10) * a) / dy]; }
    function biasForce() { const q = cvs(s.p, true); if (!biasOn) return q; let [vb, d2, d3] = Vat(q.mu2, q.mu3); q.vb = vb;
      if (q.mu2 < X0 + 0.05) d2 -= WK * (X0 + 0.05 - q.mu2); if (q.mu2 > X1 - 0.05) d2 += WK * (q.mu2 - X1 + 0.05); if (q.mu3 < Y0 + 0.05) d3 -= WK * (Y0 + 0.05 - q.mu3); if (q.mu3 > Y1 - 0.05) d3 += WK * (q.mu3 - Y1 + 0.05);
      for (let i = 0; i < N; i++) { s.f[i][0] -= d2 * q.g2[i][0] + d3 * q.g3[i][0]; s.f[i][1] -= d2 * q.g2[i][1] + d3 * q.g3[i][1]; } return q; }
    function mdstep() { const { p, v, f } = s, c1 = Math.exp(-dt), c2 = Math.sqrt((1 - c1 * c1) * kT);
      for (let i = 0; i < N; i++) { v[i][0] += 0.5 * dt * f[i][0]; v[i][1] += 0.5 * dt * f[i][1]; p[i][0] += 0.5 * dt * v[i][0]; p[i][1] += 0.5 * dt * v[i][1]; v[i][0] = c1 * v[i][0] + c2 * s.R.normal(); v[i][1] = c1 * v[i][1] + c2 * s.R.normal(); p[i][0] += 0.5 * dt * v[i][0]; p[i][1] += 0.5 * dt * v[i][1]; }
      s.E = L.force(p, f); cur = biasForce(); for (let i = 0; i < N; i++) { v[i][0] += 0.5 * dt * f[i][0]; v[i][1] += 0.5 * dt * f[i][1]; } t += dt; nst++;
      if (biasOn && nst % pace === 0) { const h = h0 * Math.exp(-(cur.vb || 0) / ((gam - 1) * kT)), i0 = Math.round((cur.mu2 - X0) / dx), j0 = Math.round((cur.mu3 - Y0) / dy), w = Math.ceil(4 * sig / dx);
        for (let j = Math.max(0, j0 - w); j <= Math.min(G, j0 + w); j++) for (let i = Math.max(0, i0 - w); i <= Math.min(G, i0 + w); i++) { const ax = X0 + i * dx - cur.mu2, ay = Y0 + j * dy - cur.mu3; V[j * (G + 1) + i] += h * Math.exp(-(ax * ax + ay * ay) / (2 * sig * sig)); } ng++; imgAge++; } }
    function basinF() { const z = {}; let vmax = 0; for (let k = 0; k < V.length; k++) vmax = Math.max(vmax, V[k]); if (!vmax) return null;
      for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) { const F = -gam / (gam - 1) * V[j * (G + 1) + i], b = basin(X0 + i * dx, Y0 + j * dy); z[b] = (z[b] || 0) + Math.exp(-(F + gam / (gam - 1) * vmax) / kT); }
      if (!z.hexagon) return null; const out = {}; ["B", "C", "D"].forEach(b => (out[b] = z[b] ? -kT * Math.log(z[b] / z.hexagon) : null)); return out; }
    let frame = 0;
    const loop = LW.loop(root, () => { for (let k = 0; k < spf; k++) mdstep(); trail.push([cur.mu2, cur.mu3]); if (trail.length > 300) trail.shift();
      if (++frame % 10 === 0 && biasOn) { const f = basinF(); if (f) hist.push([t, f]); if (hist.length > 600) hist = hist.filter((_, i) => i % 2 === 0); } draw(); });

    function heat(C, box) { const st = 3, cw = Math.ceil(box.w / st), ch = Math.ceil(box.h / st), off = document.createElement("canvas"); off.width = cw; off.height = ch;
      const oc = off.getContext("2d"), id = oc.createImageData(cw, ch); let vmax = 0; for (let k = 0; k < V.length; k++) vmax = Math.max(vmax, V[k]); const fac = gam / (gam - 1), top = Math.max(0.3, fac * vmax);
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const x = X0 + (i * st / box.w) * (X1 - X0), y = Y1 - (j * st / box.h) * (Y1 - Y0), F = fac * (vmax - Vat(x, y)[0]), tt = vmax ? LW.clamp(F / top, 0, 1) : 1;
        const raw = Vat(x, y)[0], col = (raw < 1e-4 ? (C.dark ? [24, 30, 46] : [238, 240, 246]) : LW.ramp(0.05 + 0.85 * Math.sqrt(tt), C).match(/\d+/g).map(Number)), band = vmax && Math.floor(F / 0.05) !== Math.floor(fac * (vmax - Vat(x + (X1 - X0) / box.w * st, y)[0]) / 0.05), dk = band && F < top * 0.95 ? (C.dark ? 1.35 : 0.85) : 1, o = 4 * (j * cw + i);
        id.data[o] = Math.min(255, col[0] * dk); id.data[o + 1] = Math.min(255, col[1] * dk); id.data[o + 2] = Math.min(255, col[2] * dk); id.data[o + 3] = 255; }
      oc.putImageData(id, 0, 0); return off; }

    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640;
      const bs = narrow ? Math.min(W - 20, 260) : Math.min(260, W * 0.34), box = { x: narrow ? (W - bs) / 2 : 10, y: 24, w: bs, h: bs };
      const map = narrow ? { x: 48, y: box.y + bs + 50, w: W - 58, h: Math.min(300, W * 0.75) } : { x: box.x + bs + 64, y: 24, w: W - (box.x + bs + 64) - 10, h: bs };
      // simulation box
      ctx.fillStyle = C.bg2; ctx.fillRect(box.x, box.y, box.w, box.h); ctx.strokeStyle = C.line2; ctx.lineWidth = 1; ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w, box.h);
      LW.text(ctx, "simulation", box.x, box.y - 8, { color: C.ink2, size: 11.5, weight: 600 });
      let cx = 0, cy = 0; s.p.forEach(q => { cx += q[0] / N; cy += q[1] / N; }); const sc = box.w / 6.2, BX = x => box.x + box.w / 2 + (x - cx) * sc, BY = y => box.y + box.h / 2 - (y - cy) * sc;
      ctx.strokeStyle = C.line2; ctx.lineWidth = 1.4; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (Math.hypot(s.p[i][0] - s.p[j][0], s.p[i][1] - s.p[j][1]) < 1.38) { ctx.beginPath(); ctx.moveTo(BX(s.p[i][0]), BY(s.p[i][1])); ctx.lineTo(BX(s.p[j][0]), BY(s.p[j][1])); ctx.stroke(); }
      s.p.forEach((q, i) => { ctx.beginPath(); ctx.arc(BX(q[0]), BY(q[1]), Math.max(1, 0.42 * sc), 0, 7); ctx.fillStyle = ccol(cur.c[i]); ctx.fill(); LW.text(ctx, cur.c[i].toFixed(1), BX(q[0]), BY(q[1]) + 4, { color: "#fff", size: 10, weight: 600, align: "center" }); });
      const b = basin(cur.mu2, cur.mu3); LW.text(ctx, b === "hexagon" ? "hexagon (ground state)" : "isomer " + b, box.x + 8, box.y + box.h - 10, { color: C.ink2, size: 11 });
      // CV map
      if (imgAge > 3 || !img || img.w !== Math.round(map.w)) { img = heat(C, map); img.w = Math.round(map.w); imgAge = 0; }
      ctx.drawImage(img, map.x, map.y, Math.ceil(map.w / 3) * 3, Math.ceil(map.h / 3) * 3);
      const A = LW.axes(ctx, map, { xr: [X0, X1], yr: [Y0, Y1], xlabel: "μ₂  (variance of coordination numbers)", ylabel: "μ₃  (skewness)", title: "free energy F(μ₂, μ₃) = −γ/(γ−1) · bias", grid: false, colors: C });
      ctx.save(); ctx.beginPath(); ctx.rect(map.x, map.y, map.w, map.h); ctx.clip();
      ctx.strokeStyle = C.dark ? "rgba(255,255,255,.3)" : "rgba(20,24,40,.28)"; ctx.lineWidth = 1; ctx.beginPath(); trail.forEach((q, i) => (i ? ctx.lineTo(A.sx(q[0]), A.sy(q[1])) : ctx.moveTo(A.sx(q[0]), A.sy(q[1])))); ctx.stroke();
      BAS.forEach(([nm, m2, m3, E]) => { ctx.fillStyle = C.ink; LW.text(ctx, nm + " (" + E.toFixed(2) + ")", A.sx(m2) + 7, A.sy(m3) - 6, { color: C.ink, size: 10.5, weight: 600 }); ctx.beginPath(); ctx.arc(A.sx(m2), A.sy(m3), 3, 0, 7); ctx.fill(); });
      ctx.beginPath(); ctx.arc(A.sx(cur.mu2), A.sy(cur.mu3), 6, 0, 7); ctx.fillStyle = C.rose; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      // convergence
      const cv = { x: 48, y: (narrow ? map.y + map.h : box.y + bs) + 62, w: W - 58, h: 0 }; cv.h = H - cv.y - 36;
      const tmax = Math.max(50, t), A2 = LW.axes(ctx, cv, { xr: [0, tmax], yr: [0, 1.4], xlabel: "time (τ)", ylabel: "ΔF (ε)", title: "free energy of each isomer relative to the hexagon", colors: C });
      ["B", "C", "D"].forEach(k => { ctx.strokeStyle = BCOL[k]; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cv.x, A2.sy(REF[k])); ctx.lineTo(cv.x + cv.w, A2.sy(REF[k])); ctx.stroke(); ctx.setLineDash([]);
        ctx.lineWidth = 2.2; ctx.beginPath(); let pen = false; hist.forEach(([tt, f]) => { if (f[k] == null || f[k] > 1.4) { pen = false; return; } pen ? ctx.lineTo(A2.sx(tt), A2.sy(f[k])) : ctx.moveTo(A2.sx(tt), A2.sy(f[k])); pen = true; }); ctx.stroke();
        LW.text(ctx, k, cv.x + cv.w - 12, A2.sy(REF[k]) - 4, { color: BCOL[k], size: 11, weight: 700 }); });
      const last = hist.length ? hist[hist.length - 1][1] : null;
      S.set("t", t.toFixed(0)); S.set("g", ng.toString()); S.set("b", b === "hexagon" ? "hexagon" : b);
      S.set("f", last ? ["B", "C", "D"].map(k => (last[k] == null ? "–" : last[k].toFixed(2))).join(", ") + "  (ref. 0.57, 0.54, 0.71)" : biasOn ? "–" : "bias off");
    }
    P.draw = draw; LW.onTheme(() => { imgAge = 1e9; draw(); }); reset();
  });
})();
