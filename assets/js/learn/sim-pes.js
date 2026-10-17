/* 3.1 Potential energy surfaces: pair potentials, their forces and the harmonic approximation. */
(function () {
  "use strict";
  const POT = {
    lj: { name: "Lennard-Jones (argon)", unit: "kJ/mol", params: [["eps", "Well depth ε (kJ/mol)", 0.2, 3, 0.997], ["sig", "Size σ (Å)", 2.5, 4.5, 3.405]],
      U: (r, p) => { const s6 = (p.sig / r) ** 6; return 4 * p.eps * (s6 * s6 - s6); },
      F: (r, p) => { const s6 = (p.sig / r) ** 6; return 24 * p.eps * (2 * s6 * s6 - s6) / r; },
      range: p => [0.86 * p.sig, 2.6 * p.sig], rmin: p => Math.pow(2, 1 / 6) * p.sig, depth: p => p.eps },
    morse: { name: "Morse (H–H bond)", unit: "kJ/mol", params: [["D", "Dissociation energy D (kJ/mol)", 100, 600, 458], ["a", "Width a (1/Å)", 1, 3, 1.94], ["r0", "Bond length r₀ (Å)", 0.6, 1.6, 0.741]],
      U: (r, p) => p.D * (1 - Math.exp(-p.a * (r - p.r0))) ** 2 - p.D,
      F: (r, p) => { const e = Math.exp(-p.a * (r - p.r0)); return -2 * p.D * p.a * e * (1 - e); },
      range: p => [Math.max(0.3, p.r0 - 0.9 / p.a), p.r0 + 3.2 / p.a], rmin: p => p.r0, depth: p => p.D },
    harm: { name: "Harmonic bond (force field)", unit: "kJ/mol", params: [["k", "Force constant k (kJ mol⁻¹ Å⁻²)", 500, 5000, 2845], ["r0", "Bond length r₀ (Å)", 0.9, 1.6, 1.09]],
      U: (r, p) => 0.5 * p.k * (r - p.r0) ** 2,
      F: (r, p) => -p.k * (r - p.r0),
      range: p => [p.r0 - 0.35, p.r0 + 0.5], rmin: p => p.r0, depth: () => NaN }
  };
  LW.register("pes", function (root) {
    let key = "lj", p = {}, r = 0, showHarm = true;
    const P = LW.canvas(root, { aspect: 0.62, minH: 330, maxH: 500 });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Potential", options: Object.keys(POT).map(k => [k, POT[k].name]), value: key, onChange: v => { key = v; build(); } });
    const pc = LW.controls(root);
    const c3 = LW.controls(root);
    LW.check(c3, { label: "Show the harmonic approximation at the minimum", value: true, onChange: v => { showHarm = v; draw(); } });
    const S = LW.stats(root, [["r", "separation r"], ["U", "energy U(r)"], ["F", "force F = −dU/dr"], ["k", "curvature at minimum"], ["nu", "vibrational wavenumber"]]);
    LW.note(root, "Drag the right-hand atom (or anywhere on the plots) to change the separation. A positive force pushes the atoms apart; a negative force pulls them together.");
    function build() {
      pc.innerHTML = ""; p = {};
      POT[key].params.forEach(([k, label, lo, hi, v]) => { p[k] = v; LW.slider(pc, { label, min: lo, max: hi, step: (hi - lo) / 400, value: v, fmt: x => x.toPrecision(3), onInput: x => { p[k] = x; draw(); } }); });
      r = POT[key].rmin(p) * 1.12; draw();
    }
    let A = null, B = null, strip = null;
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P, T = POT[key]; ctx.clearRect(0, 0, W, H);
      const [r0, r1] = T.range(p); r = LW.clamp(r, r0, r1);
      const rs = LW.linspace(r0, r1, 300), Us = rs.map(x => T.U(x, p)), Fs = rs.map(x => T.F(x, p));
      const rm = T.rmin(p), Um = T.U(rm, p), hh = 1e-4 * rm, kk = (T.U(rm + hh, p) - 2 * Um + T.U(rm - hh, p)) / (hh * hh);
      const dep = T.depth(p), uLo = isFinite(dep) ? -1.25 * dep : -0.1 * Math.max(...Us), uHi = isFinite(dep) ? 1.6 * dep : Math.max(...Us) * 0.9 + 1;
      const fr = Math.max(...Fs.filter((f, i) => Us[i] < uHi).map(Math.abs)) * 1.15 || 1;
      const stripH = 58, gap = 28, ph = (H - stripH - 40 - gap) / 2;
      strip = { y: 6, h: stripH };
      A = LW.axes(ctx, { x: 62, y: stripH + 22, w: W - 76, h: ph }, { xr: [r0, r1], yr: [uLo, uHi], ylabel: "U (" + T.unit + ")", colors: C, xlabels: false, ny: 4 });
      A.clip();
      ctx.strokeStyle = C.line2; ctx.beginPath(); ctx.moveTo(A.box.x, A.sy(0)); ctx.lineTo(A.box.x + A.box.w, A.sy(0)); ctx.stroke();
      if (showHarm) LW.path(ctx, rs, rs.map(x => Um + 0.5 * kk * (x - rm) ** 2), A, { color: C.teal, width: 1.6, dash: [6, 4] });
      LW.path(ctx, rs, Us.map(u => (u > uHi * 3 ? NaN : u)), A, { color: C.accent, width: 2.6 });
      ctx.strokeStyle = C.ink3; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(A.sx(r), A.box.y); ctx.lineTo(A.sx(r), A.box.y + A.box.h); ctx.stroke(); ctx.setLineDash([]);
      LW.dot(ctx, A.sx(r), A.sy(T.U(r, p)), 5.5, C.card, C.accent, 2.5);
      LW.dot(ctx, A.sx(rm), A.sy(Um), 3.5, C.teal, null);
      ctx.restore();
      if (isFinite(dep)) LW.text(ctx, "minimum r = " + rm.toFixed(3) + " Å", A.sx(rm) + 8, A.sy(Um) + 16, { color: C.teal, size: 11 });
      B = LW.axes(ctx, { x: 62, y: stripH + 22 + ph + gap, w: W - 76, h: ph }, { xr: [r0, r1], yr: [-fr, fr], xlabel: "separation r (Å)", ylabel: "F (" + T.unit + "/Å)", colors: C, ny: 4 });
      B.clip();
      ctx.strokeStyle = C.line2; ctx.beginPath(); ctx.moveTo(B.box.x, B.sy(0)); ctx.lineTo(B.box.x + B.box.w, B.sy(0)); ctx.stroke();
      if (showHarm) LW.path(ctx, rs, rs.map(x => -kk * (x - rm)), B, { color: C.teal, width: 1.6, dash: [6, 4] });
      LW.path(ctx, rs, Fs, B, { color: C.orange, width: 2.4 });
      ctx.strokeStyle = C.ink3; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(B.sx(r), B.box.y); ctx.lineTo(B.sx(r), B.box.y + B.box.h); ctx.stroke(); ctx.setLineDash([]);
      LW.dot(ctx, B.sx(r), B.sy(T.F(r, p)), 5, C.card, C.orange, 2.5);
      ctx.restore();
      // the two atoms
      const ax = A.sx(r0) + 4, bx = A.sx(r), cy = strip.y + strip.h / 2, rad = LW.clamp((A.sx(rm) - A.sx(r0)) * 0.42 + 6, 5, 22);
      const F = T.F(r, p), fl = LW.clamp(F / fr, -1, 1) * 60;
      ctx.strokeStyle = C.line2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(ax, cy); ctx.lineTo(bx, cy); ctx.stroke(); ctx.setLineDash([]);
      LW.dot(ctx, ax, cy, rad, C.atomA, null); LW.dot(ctx, bx, cy, rad, C.atomB, null);
      if (Math.abs(fl) > 2) LW.arrow(ctx, bx + Math.sign(fl) * (rad + 3), cy, bx + Math.sign(fl) * (rad + 3) + fl, cy, C.ink, 2.2, 8);
      LW.text(ctx, "fixed", ax, cy + rad + 12, { color: C.ink3, size: 10, align: "center" });
      S.set("r", r.toFixed(3) + " Å"); S.set("U", LW.fmt(T.U(r, p), 2) + " " + T.unit); S.set("F", LW.fmt(F, 2));
      S.set("k", LW.fmt(kk, 1) + " kJ mol⁻¹ Å⁻²");
      // wavenumber for the homonuclear diatomic: reduced mass from the atom type
      const mu = key === "lj" ? 39.948 / 2 : key === "morse" ? 1.00794 / 2 : (12.011 * 1.00794) / (12.011 + 1.00794);
      const kSI = kk * 1000 / 6.02214076e23 * 1e20, muSI = mu * 1.66053907e-27, nu = Math.sqrt(kSI / muSI) / (2 * Math.PI * 2.99792458e10);
      S.set("nu", Math.round(nu) + " cm⁻¹");
    }
    P.draw = draw;
    const setR = x => { const T = POT[key], [r0, r1] = T.range(p); r = LW.clamp((A || B).ix(x), r0 + 1e-3, r1); draw(); };
    LW.drag(P.cv, { down: q => { if (!A) return false; setR(q.x); }, move: q => setR(q.x) });
    build();
  });
})();
