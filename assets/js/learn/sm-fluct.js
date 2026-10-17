/* Statistical mechanics: fluctuations. Energy fluctuations of N two-level units in a heat bath
   (heat capacity from the variance), and particle-number fluctuations in a sub-volume of a gas
   (compressibility), both sampled live. */
(function () {
  "use strict";
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  function binom(r, n, p) { if (n < 60) { let k = 0; for (let i = 0; i < n; i++) if (r() < p) k++; return k; } const m = n * p, s = Math.sqrt(n * p * (1 - p)); return Math.max(0, Math.min(n, Math.round(m + s * r.normal()))); }
  LW.register("fluct", function (root) {
    let mode = "energy", N = 100, T = 0.6, f = 0.2, samples = [], r = LW.rng(8), parts = null;
    const P = LW.canvas(root, { height: w => (w < 640 ? 560 : 360) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "What fluctuates", options: [["energy", "Energy of N units in a heat bath"], ["number", "Number of gas molecules in a sub-volume"]], value: mode, onChange: v => { mode = v; reset(); } });
    const c2 = LW.controls(root);
    LW.seg(c2, { label: "System size N", options: [["10", "10"], ["100", "100"], ["1000", "1 000"], ["10000", "10 000"]], value: String(N), onChange: v => { N = +v; reset(); } });
    const tS = LW.slider(c2, { label: "Temperature k<sub>B</sub>T / Δ", min: 0.1, max: 3, step: 0.01, value: T, fmt: v => v.toFixed(2), onInput: v => { T = v; reset(); } });
    const fS = LW.slider(c2, { label: "Sub-volume fraction", min: 0.05, max: 0.9, step: 0.01, value: f, fmt: v => v.toFixed(2), onInput: v => { f = v; reset(); } });
    const S = LW.stats(root, [["mean", "mean"], ["sd", "standard deviation"], ["rel", "relative width σ/mean"], ["th", "theory"], ["k", "response from the fluctuation"]]);
    function reset() { samples = []; parts = null; tS.el.style.display = mode === "energy" ? "" : "none"; fS.el.style.display = mode === "number" ? "" : "none"; draw(); }
    const loop = LW.loop(root, () => { const p = 1 / (1 + Math.exp(1 / T)); for (let k = 0; k < 40; k++) samples.push(mode === "energy" ? binom(r, N, p) : binom(r, N, f)); if (samples.length > 20000) samples.splice(0, 40);
      if (mode === "number") { const M = Math.min(N, 400); parts = Array.from({ length: M }, () => [r(), r()]); } draw(); });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const narrow = W < 640, p = mode === "energy" ? 1 / (1 + Math.exp(1 / T)) : f, mu = N * p, sd = Math.sqrt(N * p * (1 - p));
      // left: picture of the system
      const pw = narrow ? W - 20 : W * 0.34, ph = narrow ? 200 : H - 40, px = 10, py = 26;
      if (mode === "energy") {
        LW.text(ctx, "N two-level units: lit = excited (energy Δ)", px, 16, { color: C.ink2, size: 11.5, weight: 600 });
        const M = Math.min(N, 400), cols = Math.ceil(Math.sqrt(M * pw / ph)), cs = Math.min(pw / cols, ph / Math.ceil(M / cols)), last = samples.length ? samples[samples.length - 1] : Math.round(mu), lit = Math.round(last / N * M);
        const order = Array.from({ length: M }, (_, i) => i); const rr = LW.rng(samples.length + 1); for (let i = M - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
        const on = new Set(order.slice(0, lit)); for (let i = 0; i < M; i++) { const x = px + (i % cols) * cs, y = py + Math.floor(i / cols) * cs; LW.dot(ctx, x + cs / 2, y + cs / 2, Math.max(1.5, cs * 0.35), on.has(i) ? GOLD : (C.dark ? "#2a3350" : "#dde2ee"), null); }
        if (N > M) LW.text(ctx, "(showing 400 of " + N.toLocaleString() + ")", px, py + ph + 10, { color: C.ink3, size: 10 });
      } else {
        LW.text(ctx, "ideal gas: count the molecules in the shaded region", px, 16, { color: C.ink2, size: 11.5, weight: 600 });
        const s = Math.min(pw, ph); ctx.strokeStyle = C.line2; ctx.strokeRect(px + 0.5, py + 0.5, s, s); ctx.fillStyle = rgba(TEAL, 0.14); ctx.fillRect(px, py, s * f, s);
        (parts || []).forEach(([a, b]) => LW.dot(ctx, px + a * s, py + b * s, 2.4, a < f ? TEAL : C.ink3, null));
        if (N > 400) LW.text(ctx, "(showing 400 of " + N.toLocaleString() + ")", px, py + s + 12, { color: C.ink3, size: 10 });
      }
      // right: histogram of the fluctuating quantity, in units of its mean
      const gx = narrow ? 50 : pw + 60, gy = narrow ? py + ph + 40 : 26, gw = narrow ? W - 64 : W - gx - 14, gh = narrow ? H - gy - 40 : H - 66;
      const lo = Math.max(0, mu - 4.5 * sd), hi = Math.min(N, mu + 4.5 * sd), nb = Math.min(60, Math.max(8, Math.round(hi - lo) + 1)), bw = (hi - lo) / nb || 1, hist = new Array(nb).fill(0);
      samples.forEach(v => { const b = Math.floor((v - lo) / bw); if (b >= 0 && b < nb) hist[b]++; });
      const dens = hist.map(h => h / ((samples.length || 1) * bw)), peak = 1 / (sd * Math.sqrt(2 * Math.PI) || 1);
      const xr = [0, 2]; // x axis: value / mean, fixed so the shrinking width is visible
      const A = LW.axes(ctx, { x: gx, y: gy, w: gw, h: gh }, { xr, yr: [0, 1.15], xlabel: mode === "energy" ? "energy / mean energy" : "count / mean count", colors: C, ylabels: false, title: "distribution of the " + (mode === "energy" ? "energy" : "count") + ", scaled by its mean (fixed axis: watch it narrow as N grows)" });
      A.clip(); const dm = Math.max(...dens, peak * 0.2);
      dens.forEach((d, k) => { const v0 = (lo + k * bw) / (mu || 1), v1 = (lo + (k + 1) * bw) / (mu || 1); ctx.fillStyle = rgba(mode === "energy" ? GOLD : TEAL, 0.6); ctx.fillRect(A.sx(v0), A.sy(d / dm), Math.max(1, A.sx(v1) - A.sx(v0) - 1), A.sy(0) - A.sy(d / dm)); });
      const xs = LW.linspace(0, 2, 300); LW.path(ctx, xs, xs.map(u => Math.exp(-((u * mu - mu) ** 2) / (2 * sd * sd)) * peak / dm), A, { color: ROSE, width: 2 });
      ctx.strokeStyle = C.ink3; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(A.sx(1), A.box.y); ctx.lineTo(A.sx(1), A.box.y + A.box.h); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      const m = samples.reduce((a, b) => a + b, 0) / (samples.length || 1), v = samples.reduce((a, b) => a + (b - m) ** 2, 0) / (samples.length || 1);
      S.set("mean", samples.length ? m.toFixed(2) + (mode === "energy" ? " Δ" : "") : "–"); S.set("sd", samples.length ? Math.sqrt(v).toFixed(2) : "–"); S.set("rel", samples.length ? (Math.sqrt(v) / m).toFixed(4) : "–");
      S.set("th", "σ/mean = " + (sd / mu).toFixed(4) + "  ∝ 1/√N");
      if (mode === "energy") S.set("k", samples.length ? "C = var/kT² = " + (v / (T * T)).toFixed(2) + " k_B  (exact " + (N * p * (1 - p) / (T * T)).toFixed(2) + ")" : "–");
      else S.set("k", samples.length ? "⟨δn²⟩/⟨n⟩ = " + (v / m).toFixed(3) + "  (expected 1 − f = " + (1 - f).toFixed(3) + ": an ideal gas gives ρkTκ_T = 1, reduced by f because the total N is fixed)" : "–");
    }
    P.draw = draw; reset(); loop.start();
  });
})();
