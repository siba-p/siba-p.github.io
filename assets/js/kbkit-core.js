/* KBkit core (JS port of the Python package github.com/siba-p/kbkit). Pure functions; browser + Node. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.KBK = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const NA = 602.214076, PU_GPA = 1.66053907e-3, KB = { "kJ/mol": 0.0083144626, "kcal/mol": 0.0019872043 };

  function cumtrapz(y, x) {
    const out = new Float64Array(y.length);
    for (let i = 1; i < y.length; i++) out[i] = out[i - 1] + 0.5 * (y[i] + y[i - 1]) * (x[i] - x[i - 1]);
    return out;
  }
  function runningKbi(r, g) {
    return cumtrapz(Array.from(g, (v, i) => 4 * Math.PI * (v - 1) * r[i] * r[i]), r);
  }
  function gvdv(r, g, nj, V, same) {
    const rho = nj / V, G = runningKbi(r, g);
    return Array.from(g, (v, i) => {
      const vr = 4 / 3 * Math.PI * r[i] ** 3, bulk = nj * (1 - vr / V);
      const den = bulk - rho * G[i] - (same ? 1 : 0);
      return den > 0 ? v * bulk / den : NaN;
    });
  }
  function kvIntegral(r, g, L) {
    let s = 0;
    for (let i = 1; i < r.length && r[i] <= L; i++) {
      const f = j => { const x = r[j] / L; return 4 * Math.PI * (g[j] - 1) * r[j] * r[j] * (1 - 1.5 * x + 0.5 * x ** 3); };
      s += 0.5 * (f(i) + f(i - 1)) * (r[i] - r[i - 1]);
    }
    return s;
  }
  function plateau(r, G, lo, hi) {
    const v = [];
    for (let i = 0; i < r.length; i++) if (r[i] >= lo && r[i] <= hi && Number.isFinite(G[i])) v.push(G[i]);
    if (v.length < 3) return [NaN, NaN];
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    return [m, Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1))];
  }
  function linfit(x, y) {
    const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
    let sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); }
    const b = sxy / sxx, a = my - b * mx;
    let ss = 0; for (let i = 0; i < n; i++) ss += (y[i] - a - b * x[i]) ** 2;
    return { slope: b, intercept: a, se: Math.sqrt(ss / Math.max(1, n - 2) / sxx) };
  }
  function kbi(r0, g0, o) {
    o = o || {};
    let r = Array.from(r0), g = Array.from(g0);
    if (r[0] > 0) { r = [0].concat(r); g = [0].concat(g); }
    const rmax = r[r.length - 1];
    const pl = o.plateau || [0.7 * rmax, rmax], fit = o.fit || [0.4 * rmax, 0.9 * rmax];
    const Graw = runningKbi(r, g);
    let gc = null, Ggv = null;
    if (o.nj > 0 && o.V > 0) { gc = gvdv(r, g, o.nj, o.V, !!o.same); Ggv = runningKbi(r, gc.map(v => (Number.isFinite(v) ? v : 1))); }
    const src = gc ? gc.map(v => (Number.isFinite(v) ? v : 1)) : g;
    const L = Array.from({ length: 120 }, (_, i) => rmax * 0.1 + (rmax - rmax * 0.1) * i / 119);
    const GV = L.map(l => kvIntegral(r, src, l));
    const fx = [], fy = [];
    L.forEach((l, i) => { if (l >= fit[0] && l <= fit[1]) { fx.push(l); fy.push(l * GV[i]); } });
    const lf = linfit(fx, fy);
    const res = { r, g, gc, Graw, Ggv, L, GV, fit, kv: [lf.slope, lf.se], kvIntercept: lf.intercept,
      plateauRaw: plateau(r, Graw, pl[0], pl[1]), plateauGv: Ggv ? plateau(r, Ggv, pl[0], pl[1]) : null, plateauRange: pl };
    res.best = res.plateauGv && Number.isFinite(res.kv[1]) && res.kv[1] > 3 * Math.max(res.plateauGv[1], 1e-12) ? res.plateauGv : res.kv;
    return res;
  }
  function binaryThermo(Gww, Gcc, Gcw, rw, rc, T, unit) {
    const rho = rw + rc, xc = rc / rho, xw = rw / rho, d = Gcc + Gww - 2 * Gcw;
    const eta = rw + rc + rw * rc * d, zeta = 1 + rw * Gww + rc * Gcc + rw * rc * (Gww * Gcc - Gcw * Gcw);
    const kt = KB[unit || "kJ/mol"] * (T || 298.15);
    return { eta, zeta, v_c: (1 + rw * (Gww - Gcw)) / eta, v_w: (1 + rc * (Gcc - Gcw)) / eta, kTkappa: zeta / eta,
      x_c: xc, Delta: d, dlna_dlnx: 1 / (1 + rho * xw * d), dlna_dlnrho: 1 / (1 + rc * (Gcc - Gcw)),
      V_c: (1 + rw * (Gww - Gcw)) / eta * NA, V_w: (1 + rc * (Gcc - Gcw)) / eta * NA,
      kappa: zeta / (eta * kt) / PU_GPA, N_cc: rc * Gcc, N_cw: rw * Gcw, N_ww: rw * Gww };
  }
  function parseRdf(text, col) {
    col = col || 1;
    const r = [], g = [];
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || "#@&".includes(t[0])) continue;
      const p = t.split(/[\s,]+/), a = parseFloat(p[0]), b = parseFloat(p[col]);
      if (Number.isFinite(a) && Number.isFinite(b)) { r.push(a); g.push(b); }
    }
    return { r, g };
  }
  const csS0 = e => (1 - e) ** 4 / (1 + 4 * e + 4 * e * e - 4 * e ** 3 + e ** 4);
  const hardSphereG = e => (csS0(e) - 1) / (6 * e / Math.PI);
  return { NA, kbi, runningKbi, gvdv, kvIntegral, binaryThermo, parseRdf, preferentialBinding: (Gpc, Gpw, rc) => rc * (Gpc - Gpw), hardSphereG };
});
