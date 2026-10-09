/* Converge core (JS port of the Python package github.com/siba-p/converge). Pure functions; browser + Node. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CVG = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function fft(re, im, inverse) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (inverse ? 2 : -2) * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2;
          const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
          const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
    if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
  const mean = x => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i]; return s / x.length; };
  const variance = (x, ddof) => { const m = mean(x); let s = 0; for (let i = 0; i < x.length; i++) s += (x[i] - m) ** 2; return s / (x.length - (ddof || 0)); };

  function autocorrelation(x) {
    const n = x.length, m = mean(x);
    let size = 1; while (size < 2 * n) size <<= 1;
    const re = new Float64Array(size), im = new Float64Array(size);
    let nz = false;
    for (let i = 0; i < n; i++) { re[i] = x[i] - m; if (re[i] !== 0) nz = true; }
    if (n < 2 || !nz) return Float64Array.of(1);
    fft(re, im, false);
    for (let i = 0; i < size; i++) { re[i] = re[i] * re[i] + im[i] * im[i]; im[i] = 0; }
    fft(re, im, true);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = re[i] / re[0];
    return out;
  }
  function tauInt(x, c) {
    c = c || 5;
    const rho = autocorrelation(x);
    let tau = 0.5;
    for (let m = 1; m < rho.length; m++) {
      tau += rho[m];
      if (m >= c * tau) return [Math.max(0.5, tau), m];
    }
    return [Math.max(0.5, tau), rho.length - 1];
  }
  const statIneff = x => Math.max(1, 2 * tauInt(x)[0]);

  function blocking(x, minBlocks) {
    minBlocks = minBlocks || 16;
    let y = Float64Array.from(x), b = 1;
    const sizes = [], sems = [], errs = [];
    while (y.length >= minBlocks) {
      const n = y.length, s = Math.sqrt(variance(y, 1) / n);
      sizes.push(b); sems.push(s); errs.push(s / Math.sqrt(2 * (n - 1)));
      const m = Math.floor(n / 2), z = new Float64Array(m);
      for (let i = 0; i < m; i++) z[i] = 0.5 * (y[2 * i] + y[2 * i + 1]);
      y = z; b *= 2;
    }
    const smax = Math.max(...sems);
    let idx = sems.indexOf(smax);
    for (let k = 0; k < sems.length - 2; k++) {
      if (sems[k + 1] - sems[k] < errs[k] && sems[k + 2] - sems[k + 1] < errs[k + 1] && sems[k] > 0.6 * smax) { idx = k; break; }
    }
    return { sizes, sems, errs, idx, semPlateau: sems[idx] };
  }
  function detectEquilibration(x, nskip) {
    const n = x.length;
    nskip = nskip || Math.max(1, Math.floor(n / 200));
    const g0 = statIneff(x);
    let best = [0, g0, n / g0];
    const curve = { t0: [], neff: [] };
    for (let t0 = 0; t0 < Math.floor(n / 2); t0 += nskip) {
      const g = statIneff(x.subarray ? x.subarray(t0) : x.slice(t0)), neff = (n - t0) / g;
      curve.t0.push(t0); curve.neff.push(neff);
      if (neff > best[2]) best = [t0, g, neff];
    }
    best.curve = curve;
    return best;
  }
  function mser(x, batch) {
    batch = batch || 5;
    const nb = Math.floor(x.length / batch);
    if (nb < 10) return 0;
    const b = new Float64Array(nb);
    for (let i = 0; i < nb; i++) { let s = 0; for (let j = 0; j < batch; j++) s += x[i * batch + j]; b[i] = s / batch; }
    let bestD = 0, bestV = Infinity;
    for (let d = 0; d < Math.floor(nb / 2); d++) {
      const tail = b.subarray(d), v = variance(tail, 0) / tail.length;
      if (v < bestV) { bestV = v; bestD = d; }
    }
    return bestD * batch;
  }
  // opts: { method: "chodera" | "mser" | "manual", t0: index for manual, curve: cached detection }
  function analyze(x0, name, dt, opts) {
    opts = opts || {};
    const x = Float64Array.from(x0).filter(Number.isFinite);
    if (x.length < 50) throw new Error("need at least 50 samples");
    dt = dt || 1;
    const det = opts.det || detectEquilibration(x);
    const t0Mser = opts.t0Mser != null ? opts.t0Mser : mser(x);
    let t0 = det[0], g = det[1], neff = det[2];
    if (opts.method === "mser" || (opts.method === "manual" && opts.t0 != null)) {
      t0 = Math.max(0, Math.min(x.length - 50, opts.method === "mser" ? t0Mser : Math.round(opts.t0)));
      g = statIneff(x.subarray(t0)); neff = (x.length - t0) / g;
    }
    const prod = x.subarray(t0);
    const tau = tauInt(prod)[0];
    const m = mean(prod), sd = Math.sqrt(variance(prod, 1));
    const sem = sd * Math.sqrt(g / prod.length);
    const blk = blocking(prod);
    const h = Math.floor(prod.length / 2), a = prod.subarray(0, h), b = prod.subarray(h);
    const sa = Math.sqrt(variance(a, 1)) * Math.sqrt(statIneff(a) / a.length), sb = Math.sqrt(variance(b, 1)) * Math.sqrt(statIneff(b) / b.length);
    const driftZ = (mean(b) - mean(a)) / Math.max(Math.hypot(sa, sb), 1e-300);
    const n = prod.length, tm = (n - 1) / 2;
    let sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sxx += (i - tm) ** 2; sxy += (i - tm) * (prod[i] - m); }
    const slope = sxy / sxx;
    let ss = 0; for (let i = 0; i < n; i++) ss += (prod[i] - m - slope * (i - tm)) ** 2;
    const trendZ = slope / Math.max(Math.sqrt(ss / (n - 2) * g / sxx), 1e-300);
    const flags = [];
    if (Math.abs(driftZ) > 3) flags.push({ level: "critical", text: `Not stationary: the second half differs from the first by ${Math.abs(driftZ).toFixed(1)}σ.` });
    else if (Math.abs(trendZ) > 4) flags.push({ level: "warning", text: `Possible drift: linear trend at ${Math.abs(trendZ).toFixed(1)}σ.` });
    if (neff < 20) flags.push({ level: "warning", text: `Few independent samples (N_eff = ${neff.toFixed(0)}); error bars are unreliable.` });
    if (blk.semPlateau > 1.5 * sem) flags.push({ level: "warning", text: "Block averaging gives a larger error than the autocorrelation estimate: slow modes are likely." });
    if (t0 > 0.4 * x.length) flags.push({ level: "warning", text: "Equilibration took a large part of the run; consider a longer simulation." });
    const verdict = flags.some(f => f.level === "critical") ? "not converged" : flags.length ? "use with care" : "converged";
    const semBest = Math.max(sem, blk.semPlateau);
    return { det, name: name || "x", n: x.length, dt, t0, t0Mser, t0Auto: det[0], curve: det.curve, method: opts.method || "chodera", mean: m, sem, semBlocking: blk.semPlateau, semBest, g, tau: tau * dt, neff,
      driftZ, trendZ, blocking: blk, flags, verdict, acf: autocorrelation(prod),
      lengthFor: target => (x.length - t0) * dt * (semBest / target) ** 2 };
  }
  function parseXvg(text) {
    const names = {}, rows = [];
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      if (t[0] === "@") { const m = t.match(/^@\s*s(\d+)\s+legend\s+"(.*)"/); if (m) names[+m[1]] = m[2]; continue; }
      if ("#&".includes(t[0])) continue;
      const v = t.split(/[\s,]+/).map(Number);
      if (v.every(Number.isFinite)) rows.push(v);
    }
    if (!rows.length) throw new Error("no numeric data found");
    const w = Math.min(...rows.map(r => r.length));
    if (w === 1) return { t: rows.map((_, i) => i), cols: [rows.map(r => r[0])], names: [names[0] || "x"] };
    const cols = [];
    for (let c = 1; c < w; c++) cols.push(rows.map(r => r[c]));
    return { t: rows.map(r => r[0]), cols, names: cols.map((_, i) => names[i] || `column ${i + 1}`) };
  }
  return { autocorrelation, tauInt, statIneff, blocking, detectEquilibration, mser, analyze, parseXvg, mean };
});
