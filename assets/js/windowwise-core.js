/*
 * WindowWise core: umbrella-sampling planning, WHAM, bootstrap errors, overlap diagnostics and
 * window suggestions. Pure functions, no DOM; runs in the browser (window.WW) and in Node (require).
 * Bias convention (GROMACS pull code, Grossfield WHAM): U_i(x) = 0.5 * k_i * (x - c_i)^2.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.WW = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const KB = { "kJ/mol": 0.0083144626, "kcal/mol": 0.0019872043 };
  const kT = (T, unit) => KB[unit] * T;

  /* ---------- small numerics ---------- */
  function logsumexp(arr, n) {
    let m = -Infinity;
    for (let i = 0; i < n; i++) if (arr[i] > m) m = arr[i];
    if (m === -Infinity) return -Infinity;
    let s = 0;
    for (let i = 0; i < n; i++) s += Math.exp(arr[i] - m);
    return m + Math.log(s);
  }
  // Acklam's inverse normal CDF (|rel err| < 1.2e-9).
  function invNorm(p) {
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425;
    if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  function erf(x) {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return x >= 0 ? y : -y;
  }
  const normCdf = x => 0.5 * (1 + erf(x / Math.SQRT2));
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------- parsing ---------- */
  // GROMACS .xvg / plain columns: skips '#' and '@' lines; returns values of column `col` (0-based).
  function parseSeries(text, col) {
    col = col == null ? 1 : col;
    const out = [];
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const t = line.trim();
      if (!t || t[0] === "#" || t[0] === "@" || t[0] === "&") continue;
      const parts = t.split(/[\s,]+/);
      const c = parts.length > col ? col : parts.length - 1;
      const v = parseFloat(parts[c]);
      if (Number.isFinite(v)) out.push(v);
    }
    return Float64Array.from(out);
  }
  // Grossfield-WHAM style metadata: "path center k [correlation_time]" per line.
  function parseMetadata(text) {
    const rows = [];
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t[0] === "#") continue;
      const p = t.split(/\s+/);
      if (p.length < 3 || Number.isFinite(parseFloat(p[0]))) return null;
      const c = parseFloat(p[1]), k = parseFloat(p[2]);
      if (!Number.isFinite(c) || !Number.isFinite(k)) return null;
      rows.push({ file: p[0].split(/[\\/]/).pop(), center: c, k });
    }
    return rows.length ? rows : null;
  }
  function numberFromName(name) {
    const base = name.replace(/\.[A-Za-z]+$/, "");
    const m = base.match(/(?<![A-Za-z0-9])-?\d+(?:\.\d+)?(?:[eE]-?\d+)?|\d+(?:\.\d+)?/g);
    return m ? parseFloat(m[m.length - 1]) : NaN;
  }

  /* ---------- planning ---------- */
  // Overlap coefficient of two equal-width Gaussians separated by d: 2*Phi(-d / (2 sigma)).
  const gaussOverlap = (d, sigma) => 2 * normCdf(-d / (2 * sigma));
  function plan(o) {
    const kt = kT(o.T, o.unit);
    const z = -invNorm(o.overlap / 2);           // spacing = 2 z sigma
    let k, d, rule;
    if (o.mode === "spacing") {
      d = o.spacing; k = kt * Math.pow(2 * z / d, 2); rule = "k from spacing and target overlap";
    } else if (o.mode === "k") {
      k = o.k; d = 2 * z * Math.sqrt(kt / k); rule = "spacing from k and target overlap";
    } else {
      // auto: stiff enough that the steepest slope shifts a window by at most half a spacing,
      // i.e. |F'|/k <= z sqrt(kT/k)  =>  k >= (|F'| / z)^2 / kT ; never below kMin.
      const kSlope = o.slope > 0 ? Math.pow(o.slope / z, 2) / kt : 0;
      k = Math.max(o.kMin || 0, kSlope);
      d = 2 * z * Math.sqrt(kt / k); rule = kSlope > (o.kMin || 0) ? "k set by the steepest expected slope" : "k set by the minimum force constant";
    }
    const sigma = Math.sqrt(kt / k);
    const n = Math.max(2, Math.ceil((o.xmax - o.xmin) / d - 1e-9) + 1);
    const step = (o.xmax - o.xmin) / (n - 1);
    const centers = Array.from({ length: n }, (_, i) => o.xmin + i * step);
    return {
      kT: kt, k, sigma, spacing: step, n, centers, rule,
      overlap: gaussOverlap(step, sigma),
      shift: o.slope > 0 ? o.slope / k : 0
    };
  }

  /* ---------- statistics on a window time series ---------- */
  function mean(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
  function std(a) { const m = mean(a); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - m) ** 2; return Math.sqrt(s / Math.max(1, a.length - 1)); }
  // Statistical inefficiency g = 1 + 2 sum rho(t), summed until rho first drops below zero.
  function inefficiency(a) {
    const stride = Math.max(1, Math.floor(a.length / 4000));
    const n = Math.floor(a.length / stride);
    if (n < 20) return 1;
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[i] = a[i * stride];
    const m = mean(x); let v = 0;
    for (let i = 0; i < n; i++) v += (x[i] - m) ** 2;
    v /= n; if (v === 0) return 1;
    let g = 1;
    for (let t = 1; t < Math.min(n / 4, 600); t++) {
      let c = 0;
      for (let i = 0; i + t < n; i++) c += (x[i] - m) * (x[i + t] - m);
      const rho = c / ((n - t) * v);
      if (rho <= 0) break;
      g += 2 * rho * (1 - t / n);
    }
    return Math.max(1, g * stride);
  }

  /* ---------- histograms & WHAM ---------- */
  function binning(windows, nbins, lo, hi) {
    if (lo == null || hi == null) {
      lo = Infinity; hi = -Infinity;
      for (const w of windows) for (let i = 0; i < w.data.length; i++) { const v = w.data[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      const pad = (hi - lo) * 1e-6; lo -= pad; hi += pad;
    }
    const width = (hi - lo) / nbins;
    const centers = Array.from({ length: nbins }, (_, b) => lo + (b + 0.5) * width);
    return { lo, hi, width, nbins, centers };
  }
  function histogram(data, bins, idx) {
    const h = new Float64Array(bins.nbins);
    const n = idx ? idx.length : data.length;
    for (let j = 0; j < n; j++) {
      const v = data[idx ? idx[j] : j];
      const b = Math.floor((v - bins.lo) / bins.width);
      if (b >= 0 && b < bins.nbins) h[b]++;
    }
    return h;
  }
  // 1D WHAM. hists[i][b] counts, windows[i] = {center, k}. Returns F per bin (NaN where unsampled).
  // Iterates in linear space with precomputed Boltzmann factors; falls back to log space if anything overflows.
  function wham(hists, windows, bins, kt, opts) {
    opts = opts || {};
    const W = windows.length, B = bins.nbins, tol = opts.tol || 1e-7, maxIter = opts.maxIter || 100000;
    const bias = windows.map(w => bins.centers.map(x => 0.5 * w.k * (x - w.center) ** 2 / kt));
    const N = hists.map(h => h.reduce((s, v) => s + v, 0));
    const num = new Float64Array(B);
    for (let b = 0; b < B; b++) for (let i = 0; i < W; i++) num[b] += hists[i][b];
    const lin = whamLinear(num, N, bias, W, B, tol, maxIter, opts.f0);
    const r = lin || whamLog(num, N, bias, W, B, tol, maxIter, opts.f0);
    const F = new Float64Array(B);
    let minF = Infinity;
    for (let b = 0; b < B; b++) { F[b] = Number.isFinite(r.lnP[b]) ? -kt * r.lnP[b] : NaN; if (F[b] < minF) minF = F[b]; }
    for (let b = 0; b < B; b++) F[b] -= minF;
    return { F, f: r.f, iter: r.iter, converged: r.converged };
  }
  function whamLinear(num, N, bias, W, B, tol, maxIter, f0) {
    const E = bias.map(row => Float64Array.from(row, v => Math.exp(-v)));
    let f = f0 ? Float64Array.from(f0) : new Float64Array(W);
    const P = new Float64Array(B), c = new Float64Array(W);
    let iter = 0, delta = Infinity;
    for (; iter < maxIter && delta > tol; iter++) {
      for (let i = 0; i < W; i++) c[i] = N[i] * Math.exp(f[i]);
      for (let b = 0; b < B; b++) {
        if (num[b] === 0) { P[b] = 0; continue; }
        let d = 0;
        for (let i = 0; i < W; i++) d += c[i] * E[i][b];
        P[b] = num[b] / d;
      }
      const fNew = new Float64Array(W);
      for (let i = 0; i < W; i++) {
        let z = 0;
        const Ei = E[i];
        for (let b = 0; b < B; b++) z += P[b] * Ei[b];
        fNew[i] = -Math.log(z);
      }
      const s = fNew[0];
      delta = 0;
      for (let i = 0; i < W; i++) {
        fNew[i] -= s;
        if (!Number.isFinite(fNew[i])) return null;
        delta = Math.max(delta, Math.abs(fNew[i] - f[i]));
      }
      f = fNew;
    }
    const lnP = Float64Array.from(P, v => (v > 0 ? Math.log(v) : -Infinity));
    for (let b = 0; b < B; b++) if (num[b] > 0 && !Number.isFinite(lnP[b])) return null;
    return { lnP, f, iter, converged: delta <= tol };
  }
  function whamLog(num, N, bias, W, B, tol, maxIter, f0) {
    const lnN = N.map(n => Math.log(Math.max(n, 1e-300)));
    let f = f0 ? Float64Array.from(f0) : new Float64Array(W);
    const lnP = new Float64Array(B), tmpW = new Float64Array(W), tmpB = new Float64Array(B);
    let iter = 0, delta = Infinity;
    for (; iter < maxIter && delta > tol; iter++) {
      for (let b = 0; b < B; b++) {
        if (num[b] === 0) { lnP[b] = -Infinity; continue; }
        for (let i = 0; i < W; i++) tmpW[i] = lnN[i] + f[i] - bias[i][b];
        lnP[b] = Math.log(num[b]) - logsumexp(tmpW, W);
      }
      const fNew = new Float64Array(W);
      for (let i = 0; i < W; i++) {
        for (let b = 0; b < B; b++) tmpB[b] = lnP[b] - bias[i][b];
        fNew[i] = -logsumexp(tmpB, B);
      }
      const s = fNew[0];
      delta = 0;
      for (let i = 0; i < W; i++) { fNew[i] -= s; delta = Math.max(delta, Math.abs(fNew[i] - f[i])); }
      f = fNew;
    }
    return { lnP, f, iter, converged: delta <= tol };
  }
  // Block bootstrap: resample contiguous blocks of each window's series (block ~ 2g), rerun WHAM.
  function bootstrap(windows, bins, kt, f0, nboot, seed) {
    const rand = mulberry32(seed || 7);
    const B = bins.nbins, sum = new Float64Array(B), sum2 = new Float64Array(B), cnt = new Float64Array(B);
    for (let r = 0; r < nboot; r++) {
      const hs = windows.map(w => {
        const n = w.data.length, L = Math.max(1, Math.min(n, Math.round(2 * w.g))), idx = new Int32Array(n);
        for (let j = 0; j < n; j += L) {
          const s = Math.floor(rand() * Math.max(1, n - L + 1));
          for (let t = 0; t < L && j + t < n; t++) idx[j + t] = s + t;
        }
        return histogram(w.data, bins, idx);
      });
      const res = wham(hs, windows, bins, kt, { f0, tol: 1e-5, maxIter: 40000 });
      for (let b = 0; b < B; b++) if (Number.isFinite(res.F[b])) { sum[b] += res.F[b]; sum2[b] += res.F[b] ** 2; cnt[b]++; }
    }
    return Array.from({ length: B }, (_, b) => cnt[b] > 1 ? Math.sqrt(Math.max(0, sum2[b] / cnt[b] - (sum[b] / cnt[b]) ** 2)) : NaN);
  }

  /* ---------- diagnostics ---------- */
  function overlapPairs(hists, order) {
    const out = [];
    for (let j = 0; j + 1 < order.length; j++) {
      const a = hists[order[j]], b = hists[order[j + 1]];
      const na = a.reduce((s, v) => s + v, 0) || 1, nb = b.reduce((s, v) => s + v, 0) || 1;
      let o = 0;
      for (let k = 0; k < a.length; k++) o += Math.min(a[k] / na, b[k] / nb);
      out.push({ i: order[j], j: order[j + 1], overlap: o });
    }
    return out;
  }
  function slopeAt(F, bins, x) {
    const b = Math.min(bins.nbins - 1, Math.max(0, Math.floor((x - bins.lo) / bins.width)));
    let lo = b, hi = b;
    while (lo > 0 && b - lo < 4 && Number.isFinite(F[lo - 1])) lo--;
    while (hi < bins.nbins - 1 && hi - b < 4 && Number.isFinite(F[hi + 1])) hi++;
    if (hi === lo || !Number.isFinite(F[lo]) || !Number.isFinite(F[hi])) return NaN;
    return (F[hi] - F[lo]) / ((hi - lo) * bins.width);
  }

  /*
   * Full analysis. input: { windows: [{name, data, center, k}], T, unit, nbins, nboot, overlapMin }
   */
  function analyze(input) {
    const kt = kT(input.T, input.unit), L = input.lunit || "nm", E = input.unit;
    const ws = input.windows.filter(w => w.data && w.data.length > 1).map(w => {
      const m = mean(w.data), s = std(w.data), g = inefficiency(w.data);
      return Object.assign({}, w, { mean: m, sd: s, g, neff: w.data.length / g, n: w.data.length });
    });
    if (ws.length < 2) throw new Error("Need at least two windows with data.");
    const bins = binning(ws, input.nbins || 100);
    const hists = ws.map(w => histogram(w.data, bins));
    const res = wham(hists, ws, bins, kt);
    const err = input.nboot > 0 ? bootstrap(ws, bins, kt, res.f, input.nboot, 11) : null;
    const order = ws.map((_, i) => i).sort((a, b) => ws[a].center - ws[b].center);
    const pairs = overlapPairs(hists, order);
    const omin = input.overlapMin == null ? 0.1 : input.overlapMin;
    const spacings = pairs.map(p => Math.abs(ws[p.j].center - ws[p.i].center));
    const medSpacing = spacings.slice().sort((a, b) => a - b)[Math.floor(spacings.length / 2)] || 0;

    const flags = [], suggestions = [];
    pairs.forEach(p => {
      if (p.overlap >= omin) return;
      const a = ws[p.i], b = ws[p.j];
      const xa = a.mean, xb = b.mean, gap = Math.abs(xb - xa);
      flags.push({ level: p.overlap < omin / 3 ? "critical" : "warning", kind: "overlap", x: (xa + xb) / 2,
        text: `Low overlap (${(p.overlap * 100).toFixed(1)}%) between windows at ${a.center.toFixed(3)} and ${b.center.toFixed(3)} ${L}.` });
      // Local slope from the PMF where available, otherwise from the bias balance k (c - <x>).
      let s = slopeAt(res.F, bins, (xa + xb) / 2);
      if (!Number.isFinite(s)) s = 0.5 * (a.k * (a.center - a.mean) + b.k * (b.center - b.mean));
      const kBase = Math.max(a.k, b.k);
      // New window stiff enough that slope-induced drift is under a quarter of the gap.
      const kNew = Math.max(kBase, 4 * Math.abs(s) / Math.max(gap, 1e-9));
      const sig = Math.sqrt(kt / kNew), z = -invNorm(Math.max(omin, 0.2) / 2);
      const nAdd = Math.max(1, Math.ceil(gap / (2 * z * sig)) - 1);
      for (let q = 1; q <= nAdd; q++) {
        const target = xa + (xb - xa) * q / (nAdd + 1);
        suggestions.push({ center: target + s / kNew, k: kNew, target, reason: "fill gap", slope: s });
      }
    });
    ws.forEach(w => {
      const drift = Math.abs(w.mean - w.center);
      if (medSpacing > 0 && drift > 0.5 * medSpacing) {
        // The mean-shift estimate k(c - <x>) underestimates a curved wall; use the PMF slope at the centre when known.
        const sShift = w.k * (w.center - w.mean), sPmf = slopeAt(res.F, bins, w.center);
        const s = Number.isFinite(sPmf) && Math.abs(sPmf) > Math.abs(sShift) ? sPmf : sShift;
        flags.push({ level: "warning", kind: "drift", x: w.mean,
          text: `Window at ${w.center.toFixed(3)} sits ${drift.toFixed(3)} ${L} from its centre: the spring is too soft for the local slope (~${Math.abs(s).toFixed(0)} ${E}/${L}).` });
        suggestions.push({ center: w.center, k: Math.max(w.k, Math.ceil(2 * Math.abs(s) / medSpacing)), target: w.center, reason: "stiffen", slope: s });
      }
      if (w.neff < 50) flags.push({ level: "warning", kind: "samples", x: w.mean, text: `Window at ${w.center.toFixed(3)} ${L} has only ~${Math.round(w.neff)} independent samples (statistical inefficiency ${w.g.toFixed(1)}).` });
    });
    if (!res.converged) flags.push({ level: "critical", kind: "wham", text: "WHAM did not converge; check window centres and force constants." });
    suggestions.sort((a, b) => a.target - b.target);
    return { kT: kt, windows: ws, bins, hists, F: res.F, f: res.f, iter: res.iter, converged: res.converged, err, pairs, flags, suggestions, medSpacing };
  }


  /* ---------- Gaussian-process umbrella integration + active learning ---------- */
  // Mean-force observations: <A'>_i = k_i (c_i - <x>_i), sd = k_i * sqrt(var * g / N).
  function meanForceObs(windows) {
    return windows.map(w => {
      const m = mean(w.data), sd = std(w.data), g = inefficiency(w.data);
      return { x: m, y: w.k * (w.center - m), sd: w.k * sd * Math.sqrt(g / w.data.length) };
    }).sort((a, b) => a.x - b.x);
  }
  function chol(A, n) {
    const L = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
      let s = A[i * n + j];
      for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
      if (i === j) { if (s <= 0) return null; L[i * n + i] = Math.sqrt(s); } else L[i * n + j] = s / L[j * n + j];
    }
    return L;
  }
  function fwd(L, b, n) { const y = new Float64Array(n); for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i * n + k] * y[k]; y[i] = s / L[i * n + i]; } return y; }
  function bwd(L, y, n) { const x = new Float64Array(n); for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= L[k * n + i] * x[k]; x[i] = s / L[i * n + i]; } return x; }
  const kdd = (d, ell, s2) => s2 * Math.exp(-0.5 * d * d / (ell * ell)) * (1 / (ell * ell) - d * d / ell ** 4);
  const kfd = (d, ell, s2) => s2 * Math.exp(-0.5 * d * d / (ell * ell)) * d / (ell * ell);
  const kff = (d, ell, s2) => s2 * Math.exp(-0.5 * d * d / (ell * ell));
  function gpFit(obs, ell, s2) {
    const n = obs.length, K = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) K[i * n + j] = kdd(obs[i].x - obs[j].x, ell, s2) + (i === j ? obs[i].sd ** 2 + 1e-10 * s2 / (ell * ell) : 0);
    const L = chol(K, n); if (!L) return null;
    const y = Float64Array.from(obs, o => o.y), z = fwd(L, y, n), alpha = bwd(L, z, n);
    let ld = 0; for (let i = 0; i < n; i++) ld += Math.log(L[i * n + i]);
    let q = 0; for (let i = 0; i < n; i++) q += y[i] * alpha[i];
    return { L, alpha, lml: -0.5 * q - ld - 0.5 * n * Math.log(2 * Math.PI) };
  }
  function gpPmf(windows, npts) {
    const obs = meanForceObs(windows), n = obs.length;
    const xs = obs.map(o => o.x), span = xs[n - 1] - xs[0];
    const diffs = xs.slice(1).map((v, i) => v - xs[i]).sort((a, b) => a - b), spacing = diffs[Math.floor(diffs.length / 2)] || span;
    const ys = obs.map(o => o.y), ym = ys.reduce((a, b) => a + b, 0) / n;
    const yscale = Math.max(Math.sqrt(ys.reduce((a, b) => a + (b - ym) ** 2, 0) / n), Math.max(...ys.map(Math.abs)) / 3, 1e-9);
    let best = null;
    const lo = Math.max(spacing, span / 200), hi = span / 1.5;
    for (let a = 0; a < 28; a++) {
      const ell = lo * Math.pow(hi / lo, a / 27);
      for (let b = 0; b < 15; b++) {
        const amp = yscale * ell * 0.1 * Math.pow(100, b / 14), f = gpFit(obs, ell, amp * amp);
        if (f && (!best || f.lml > best.fit.lml)) best = { ell, s2: amp * amp, fit: f };
      }
    }
    if (!best) return null;
    const { ell, s2, fit } = best, m = npts || 240;
    const grid = Array.from({ length: m }, (_, i) => xs[0] + span * i / (m - 1));
    const A = new Float64Array(m), dA = new Float64Array(m), dAsd = new Float64Array(m);
    const V = grid.map(g => fwd(fit.L, Float64Array.from(obs, o => kfd(g - o.x, ell, s2)), n));
    grid.forEach((g, i) => {
      let a = 0, d = 0; const kd = new Float64Array(n);
      for (let j = 0; j < n; j++) { a += kfd(g - obs[j].x, ell, s2) * fit.alpha[j]; kd[j] = kdd(g - obs[j].x, ell, s2); d += kd[j] * fit.alpha[j]; }
      A[i] = a; dA[i] = d;
      const vd = fwd(fit.L, kd, n); let q = 0; for (let j = 0; j < n; j++) q += vd[j] * vd[j];
      dAsd[i] = Math.sqrt(Math.max(0, s2 / (ell * ell) - q));
    });
    let imin = 0; for (let i = 1; i < m; i++) if (A[i] < A[imin]) imin = i;
    const Asd = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      let cii = kff(0, ell, s2), cmm = cii, cim = kff(grid[i] - grid[imin], ell, s2);
      for (let j = 0; j < n; j++) { cii -= V[i][j] ** 2; cmm -= V[imin][j] ** 2; cim -= V[i][j] * V[imin][j]; }
      Asd[i] = Math.sqrt(Math.max(0, cii + cmm - 2 * cim));
    }
    const Amin = A[imin]; for (let i = 0; i < m; i++) A[i] -= Amin;
    return { x: grid, A, Asd, dA, dAsd, obs, ell, s2, lml: fit.lml };
  }
  // Kriging-believer active learning: place windows where the posterior mean-force sd is largest.
  function suggestWindowsGP(windows, gp, nPick) {
    const obs = gp.obs.map(o => Object.assign({}, o)), xs0 = obs.map(o => o.x);
    const diffs = xs0.slice(1).map((v, i) => v - xs0[i]).sort((a, b) => a - b), sep = 0.5 * (diffs[Math.floor(diffs.length / 2)] || 0);
    const ks = windows.map(w => w.k).sort((a, b) => a - b), kk = ks[Math.floor(ks.length / 2)];
    const sds = obs.map(o => o.sd).sort((a, b) => a - b), typSd = sds[Math.floor(sds.length / 2)];
    const grid = Array.from({ length: 300 }, (_, i) => gp.x[0] + (gp.x[gp.x.length - 1] - gp.x[0]) * i / 299);
    const picks = [];
    for (let p = 0; p < (nPick || 3); p++) {
      const fit = gpFit(obs, gp.ell, gp.s2); if (!fit) break;
      const n = obs.length;
      let bestI = -1, bestS = -Infinity, bestF = 0;
      grid.forEach((g, i) => {
        if (Math.min(...obs.map(o => Math.abs(o.x - g))) < sep) return;
        const kd = Float64Array.from(obs, o => kdd(g - o.x, gp.ell, gp.s2));
        const v = fwd(fit.L, kd, n); let q = 0; for (let j = 0; j < n; j++) q += v[j] * v[j];
        const sd = Math.sqrt(Math.max(0, gp.s2 / (gp.ell * gp.ell) - q));
        if (sd > bestS) { bestS = sd; bestI = i; let f = 0; for (let j = 0; j < n; j++) f += kd[j] * fit.alpha[j]; bestF = f; }
      });
      if (bestI < 0) break;
      const target = grid[bestI];
      picks.push({ target, center: target + bestF / kk, k: kk, meanForce: bestF, sd: bestS });
      obs.push({ x: target, y: bestF, sd: typSd }); obs.sort((a, b) => a.x - b.x);
    }
    return picks;
  }

  /* ---------- synthetic data (for the demo and for tests) ---------- */
  function synthetic(o) {
    const rand = mulberry32(o.seed || 1);
    const kt = kT(o.T, o.unit);
    return o.centers.map((c, i) => {
      const k = Array.isArray(o.k) ? o.k[i] : o.k;
      const E = x => o.F(x) + 0.5 * k * (x - c) ** 2;
      let x = c, e = E(x);
      const data = new Float64Array(o.n), step = o.step || Math.sqrt(kt / k);
      for (let s = 0; s < o.burn + o.n * o.stride; s++) {
        const y = x + (rand() * 2 - 1) * step, ey = E(y);
        if (ey <= e || rand() < Math.exp(-(ey - e) / kt)) { x = y; e = ey; }
        if (s >= o.burn && (s - o.burn) % o.stride === 0) data[(s - o.burn) / o.stride] = x;
      }
      return { name: `window_${String(i).padStart(2, "0")}_${c.toFixed(3)}.xvg`, data, center: c, k };
    });
  }

  function mdpSnippet(centers, ks, opts) {
    opts = opts || {};
    const geom = opts.geometry || "distance";
    const lines = [
      "; WindowWise: umbrella windows (GROMACS pull code, U = 0.5 k (x - x0)^2)",
      "pull                 = yes",
      "pull-ncoords         = 1",
      "pull-ngroups         = 2",
      "pull-group1-name     = GROUP_A",
      "pull-group2-name     = GROUP_B",
      "pull-coord1-type     = umbrella",
      `pull-coord1-geometry = ${geom}`,
      "pull-coord1-groups   = 1 2",
      "pull-coord1-rate     = 0.0",
      "pull-nstxout         = 50",
      "pull-nstfout         = 50",
      "",
      "; per-window settings (one .mdp per window):"
    ];
    centers.forEach((c, i) => lines.push(`; window ${String(i).padStart(2, "0")}:  pull-coord1-init = ${c.toFixed(4)}   pull-coord1-k = ${Math.round(ks[i])}`));
    return lines.join("\n");
  }

  return { gpPmf, suggestWindowsGP, meanForceObs, KB, kT, invNorm, normCdf, gaussOverlap, parseSeries, parseMetadata, numberFromName, plan, mean, std, inefficiency, binning, histogram, wham, bootstrap, overlapPairs, analyze, synthetic, mdpSnippet };
});
