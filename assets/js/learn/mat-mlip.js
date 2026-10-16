/* 5.2 Machine-learned interatomic potentials: fit an ensemble of small networks to reference
   energies (and optionally forces) of a dimer, and watch interpolation, extrapolation and the
   ensemble's uncertainty. */
(function () {
  "use strict";
  const D = 2.0, a = 1.6, r0 = 1.2;                      // "reference" curve: Morse, eV and Å
  const Eref = r => D * ((1 - Math.exp(-a * (r - r0))) ** 2 - 1) + 0.25 * Math.exp(-(((r - 2.4) / 0.35) ** 2));
  const Fref = r => { const h = 1e-5; return -(Eref(r + h) - Eref(r - h)) / (2 * h); };
  const RX = [0.75, 4.0], MID = 2.0, SC = 1.2;
  LW.register("mlip", function (root) {
    let lo = 0.95, hi = 2.3, npts = 7, useF = true, lamF = 0.1, H = 12, members = [], iter = 0, seed = 1, train = [];
    const P = LW.canvas(root, { aspect: 0.62, minH: 330, maxH: 480 });
    LW.legend(root, [[LW.colors().ink3, "reference (“DFT”)", true], [LW.colors().accent, "ensemble mean"], [LW.colors().band, "± 2 × ensemble spread"], [LW.colors().ink, "training points"]]);
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Training targets", options: [["e", "Energies only"], ["ef", "Energies + forces"]], value: "ef", onChange: v => { useF = v === "ef"; reset(); } });
    LW.slider(ctl, { label: "Training points", min: 2, max: 20, step: 1, value: npts, fmt: v => String(v), onInput: v => { npts = v; reset(); } });
    const c2 = LW.controls(root);
    LW.slider(c2, { label: "Sampled range: shortest r (Å)", min: 0.8, max: 2.0, step: 0.01, value: lo, fmt: v => v.toFixed(2), onInput: v => { lo = Math.min(v, hi - 0.1); reset(); } });
    LW.slider(c2, { label: "Sampled range: longest r (Å)", min: 1.3, max: 3.9, step: 0.01, value: hi, fmt: v => v.toFixed(2), onInput: v => { hi = Math.max(v, lo + 0.1); reset(); } });
    const c3 = LW.controls(root);
    const runB = LW.button(c3, "Pause training", () => { runB.textContent = loop.toggle() ? "Pause training" : "Train"; }, { primary: true });
    LW.button(c3, "New random initialisation", () => { seed++; reset(); });
    const S = LW.stats(root, [["it", "training steps"], ["ein", "energy error inside range", "good"], ["eout", "energy error outside range", "bad"], ["fin", "force error inside range"], ["np", "parameters per network"]]);
    LW.note(root, "Five networks (one hidden layer of 12 tanh neurons each) are trained on the same points from different random starts. Where they disagree, the model is guessing.");
    function net(r) { const w = [], b = [], v = []; for (let k = 0; k < H; k++) { w.push(r.normal() * 1.5); b.push(r.normal()); v.push(r.normal() * 0.3); } return { w, b, v, c: 0, m: new Float64Array(3 * H + 1), s: new Float64Array(3 * H + 1), t: 0 }; }
    function evalNet(n, r) { const x = (r - MID) / SC; let E = n.c, dE = 0; for (let k = 0; k < H; k++) { const t = Math.tanh(n.w[k] * x + n.b[k]); E += n.v[k] * t; dE += n.v[k] * n.w[k] * (1 - t * t); } return { E, F: -dE / SC }; }
    function reset() {
      train = Array.from({ length: npts }, (_, i) => { const r = npts === 1 ? lo : lo + (hi - lo) * i / (npts - 1); return { r, E: Eref(r), F: Fref(r) }; });
      const rr = LW.rng(seed * 101); members = Array.from({ length: 5 }, () => net(rr)); iter = 0; loop.start(); runB.textContent = "Pause training"; draw();
    }
    function step(n) {
      const g = new Float64Array(3 * H + 1), N = train.length;
      for (const p of train) {
        const x = (p.r - MID) / SC; let E = n.c, dE = 0; const ts = [];
        for (let k = 0; k < H; k++) { const t = Math.tanh(n.w[k] * x + n.b[k]); ts.push(t); E += n.v[k] * t; dE += n.v[k] * n.w[k] * (1 - t * t); }
        const eE = 2 * (E - p.E) / N, F = -dE / SC, eF = useF ? 2 * lamF * (F - p.F) / N : 0;
        for (let k = 0; k < H; k++) {
          const t = ts[k], s = 1 - t * t;
          g[k] += eE * t + eF * (-n.w[k] * s / SC);                                       // dv
          g[H + k] += eE * n.v[k] * s * x + eF * (-n.v[k] * s * (1 - 2 * n.w[k] * t * x) / SC); // dw
          g[2 * H + k] += eE * n.v[k] * s + eF * (2 * n.v[k] * n.w[k] * t * s / SC);       // db
        }
        g[3 * H] += eE;
      }
      const lr = 0.01, b1 = 0.9, b2 = 0.999; n.t++;
      const pr = [n.v, n.w, n.b];
      for (let q = 0; q <= 3 * H; q++) { n.m[q] = b1 * n.m[q] + (1 - b1) * g[q]; n.s[q] = b2 * n.s[q] + (1 - b2) * g[q] * g[q]; const d = lr * (n.m[q] / (1 - b1 ** n.t)) / (Math.sqrt(n.s[q] / (1 - b2 ** n.t)) + 1e-8); if (q === 3 * H) n.c -= d; else pr[Math.floor(q / H)][q % H] -= d; }
    }
    const loop = LW.loop(root, () => { for (let k = 0; k < 40; k++) members.forEach(step); iter += 40; if (iter >= 12000) { loop.stop(); runB.textContent = "Train"; } draw(); });
    function draw() {
      const C = LW.colors(), { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH);
      const rs = LW.linspace(RX[0], RX[1], 200), preds = rs.map(r => members.map(n => evalNet(n, r)));
      const stat = k => preds.map(ps => { const v = ps.map(p => p[k]), m = v.reduce((x, y) => x + y, 0) / v.length; return [m, Math.sqrt(v.reduce((x, y) => x + (y - m) ** 2, 0) / v.length)]; });
      const sE = stat("E"), sF = stat("F"), gap = 26, ph = (HH - 46 - gap) / 2;
      const A = LW.axes(ctx, { x: 58, y: 10, w: W - 70, h: ph }, { xr: RX, yr: [-2.6, 2.2], ylabel: "E (eV)", colors: C, xlabels: false, ny: 4 });
      const shade = (Ax) => { ctx.fillStyle = C.dark ? "rgba(60,201,189,.08)" : "rgba(14,149,139,.07)"; ctx.fillRect(Ax.sx(lo), Ax.box.y, Ax.sx(hi) - Ax.sx(lo), Ax.box.h); };
      A.clip(); shade(A);
      LW.band(ctx, rs, sE.map(s => s[0] - 2 * s[1]), sE.map(s => s[0] + 2 * s[1]), A, C.band);
      members.forEach((_, m) => LW.path(ctx, rs, preds.map(p => p[m].E), A, { color: C.accent, width: 1, alpha: 0.3 }));
      LW.path(ctx, rs, rs.map(Eref), A, { color: C.ink3, width: 1.6, dash: [5, 4] });
      LW.path(ctx, rs, sE.map(s => s[0]), A, { color: C.accent, width: 2.4 });
      train.forEach(p => LW.dot(ctx, A.sx(p.r), A.sy(p.E), 4.5, C.ink, null));
      ctx.restore();
      LW.text(ctx, "training range", A.sx((lo + hi) / 2), A.box.y + 14, { color: C.teal, size: 11, align: "center", weight: 600 });
      const B = LW.axes(ctx, { x: 58, y: 10 + ph + gap, w: W - 70, h: ph }, { xr: RX, yr: [-6, 6], xlabel: "interatomic distance r (Å)", ylabel: "F (eV/Å)", colors: C, ny: 4 });
      B.clip(); shade(B);
      LW.band(ctx, rs, sF.map(s => s[0] - 2 * s[1]), sF.map(s => s[0] + 2 * s[1]), B, C.band);
      LW.path(ctx, rs, rs.map(Fref), B, { color: C.ink3, width: 1.6, dash: [5, 4] });
      LW.path(ctx, rs, sF.map(s => s[0]), B, { color: C.orange, width: 2.4 });
      if (useF) train.forEach(p => LW.dot(ctx, B.sx(p.r), B.sy(p.F), 4, C.ink, null));
      ctx.restore();
      const rmse = (sel, k, ref) => { const ix = rs.map((r, i) => i).filter(i => sel(rs[i])); return ix.length ? Math.sqrt(ix.reduce((s, i) => s + ((k === "E" ? sE : sF)[i][0] - ref(rs[i])) ** 2, 0) / ix.length) : NaN; };
      const inR = r => r >= lo && r <= hi, outR = r => !inR(r) && r > 0.85;
      S.set("it", String(iter)); S.set("ein", LW.fmt(rmse(inR, "E", Eref), 3) + " eV"); S.set("eout", LW.fmt(rmse(outR, "E", Eref), 3) + " eV"); S.set("fin", LW.fmt(rmse(inR, "F", Fref), 3) + " eV/Å"); S.set("np", String(3 * H + 1));
    }
    P.draw = draw;
    reset();
  });
})();
