/* Mathematics: chance. Law of large numbers, the Galton board, the central limit theorem, Bayes. */
(function () {
  "use strict";
  const SUP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", ".": "·" };
  const p10 = v => "10" + String(Math.round(v * 100) / 100).split("").map(c => SUP[c] || c).join("");
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const lnC = (n, k) => { let s = 0; for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i); return s; };

  /* ---------------- 1. frequencies settle down: the law of large numbers ---------------- */
  LW.register("lln", function (root) {
    let kind = "coin", counts, n, hist, r = LW.rng(3), seed = 3;
    const P = LW.canvas(root, { height: w => (w < 640 ? 560 : 320) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Experiment", options: [["coin", "Toss a coin"], ["die", "Roll a die"], ["bias", "A loaded die (six comes up 1/3 of the time)"]], value: kind, onChange: v => { kind = v; reset(); } });
    const c2 = LW.controls(root);
    const runB = LW.button(c2, "Run", () => { runB.textContent = loop.toggle() ? "Pause" : "Run"; }, { primary: true });
    LW.button(c2, "One more", () => { trial(1); draw(); }); LW.button(c2, "+1000", () => { trial(1000); draw(); }); LW.button(c2, "Start again", () => { seed++; r = LW.rng(seed); reset(); });
    const S = LW.stats(root, [["n", "trials"], ["f", "fraction of the watched outcome"], ["p", "probability"], ["sd", "typical deviation √(p(1−p)/n)"]]);
    const probs = () => (kind === "coin" ? [0.5, 0.5] : kind === "die" ? Array(6).fill(1 / 6) : [2 / 15, 2 / 15, 2 / 15, 2 / 15, 2 / 15, 1 / 3]);
    function reset() { counts = new Array(probs().length).fill(0); n = 0; hist = []; trial(40); draw(); }
    function trial(k) { const p = probs(); for (let i = 0; i < k; i++) { let u = r(), j = 0; while (j < p.length - 1 && u > p[j]) { u -= p[j]; j++; } counts[j]++; n++; const w = counts[counts.length - 1] / n; if (n < 50 || n % Math.ceil(n / 200) === 0) hist.push([Math.log10(n), w]); } }
    const loop = LW.loop(root, () => { trial(Math.max(1, Math.round(n * 0.03))); draw(); if (n > 1e6) { loop.stop(); runB.textContent = "Run"; } });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const narrow = W < 640, p = probs(), watch = p[p.length - 1], lab = kind === "coin" ? ["heads", "tails"] : ["1", "2", "3", "4", "5", "6"];
      const bw = narrow ? W - 60 : W * 0.36, bh = narrow ? 200 : H - 54;
      const A = LW.axes(ctx, { x: 46, y: 18, w: bw, h: bh }, { xr: [-0.5, p.length - 0.5], yr: [0, Math.max(...p) * 1.9], ylabel: "fraction", colors: C, xlabels: false, title: "how often each outcome came up" });
      counts.forEach((c, i) => { const f = n ? c / n : 0, x0 = A.sx(i - 0.38), x1 = A.sx(i + 0.38); ctx.fillStyle = i === p.length - 1 ? ORANGE : BLUE; ctx.globalAlpha = 0.8; ctx.fillRect(x0, A.sy(f), x1 - x0, A.sy(0) - A.sy(f)); ctx.globalAlpha = 1;
        ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 - 3, A.sy(p[i])); ctx.lineTo(x1 + 3, A.sy(p[i])); ctx.stroke(); LW.text(ctx, lab[i], (x0 + x1) / 2, A.box.y + A.box.h + 15, { color: C.ink3, size: 11, align: "center" }); });
      const gx = narrow ? 46 : bw + 110, gy = narrow ? bh + 70 : 18, gw = narrow ? W - 60 : W - gx - 14, gh = narrow ? H - gy - 42 : H - 54;
      const B = LW.axes(ctx, { x: gx, y: gy, w: gw, h: gh }, { xr: [0, 6], yr: [0, 1], xlabel: "number of trials (log scale)", ylabel: "fraction of " + lab[lab.length - 1] + (kind === "coin" ? "" : "s"), colors: C, xfmt: p10, title: "the running fraction homes in on the probability" });
      B.clip(); const xs = LW.linspace(0, 6, 120);
      LW.band(ctx, xs, xs.map(l => watch - 2 * Math.sqrt(watch * (1 - watch) / Math.pow(10, l))), xs.map(l => watch + 2 * Math.sqrt(watch * (1 - watch) / Math.pow(10, l))), B, rgba(VIOLET, 0.13));
      LW.path(ctx, [0, 6], [watch, watch], B, { color: GOLD, width: 1.6, dash: [6, 4] });
      LW.path(ctx, hist.map(h => h[0]), hist.map(h => h[1]), B, { color: ORANGE, width: 1.8 }); ctx.restore();
      S.set("n", n.toLocaleString()); S.set("f", n ? (counts[counts.length - 1] / n).toFixed(4) : "–"); S.set("p", watch.toFixed(4)); S.set("sd", n ? Math.sqrt(watch * (1 - watch) / n).toFixed(4) : "–");
    }
    P.draw = draw; reset();
  });

  /* ---------------- 2. the Galton board ---------------- */
  LW.register("galton", function (root) {
    let rows = 12, pr = 0.5, balls = [], bins, total = 0, r = LW.rng(9), speed = 2.5;
    const P = LW.canvas(root, { height: w => Math.min(520, Math.max(400, w * 0.62)) });
    const ctl = LW.controls(root);
    const runB = LW.button(ctl, "Pause", () => { runB.textContent = loop.toggle() ? "Pause" : "Drop balls"; }, { primary: true });
    LW.button(ctl, "Empty the bins", () => { reset(); });
    LW.slider(ctl, { label: "Rows of pegs", min: 2, max: 20, step: 1, value: rows, fmt: v => String(v), onInput: v => { rows = v; reset(); } });
    LW.slider(ctl, { label: "Chance of bouncing right p", min: 0.1, max: 0.9, step: 0.01, value: pr, fmt: v => v.toFixed(2), onInput: v => { pr = v; reset(); } });
    LW.slider(ctl, { label: "Speed", min: 0.5, max: 8, step: 0.1, value: speed, fmt: v => "×" + v.toFixed(1), onInput: v => { speed = v; } });
    const S = LW.stats(root, [["n", "balls landed"], ["m", "mean bin (number of right bounces)"], ["mt", "theory n·p"], ["sd", "spread (standard deviation)"], ["st", "theory √(n p (1−p))"]]);
    function reset() { balls = []; bins = new Array(rows + 1).fill(0); total = 0; draw(); }
    let acc = 0;
    const loop = LW.loop(root, dt => { acc += dt * 14 * speed; while (acc > 1) { acc--; const path = [0]; for (let i = 0; i < rows; i++) path.push(path[i] + (r() < pr ? 1 : 0)); balls.push({ row: 0, t: 0, path }); }
      balls.forEach(b => { b.t += dt * 6 * speed; while (b.t >= 1) { b.t -= 1; b.row++; } }); balls = balls.filter(b => { if (b.row >= rows) { bins[b.path[rows]]++; total++; return false; } return true; }); draw(); });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const top = 20, boardH = H * 0.5, gap = Math.min((W - 40) / (rows + 2), boardH / (rows + 1)), cx = W / 2, rowY = i => top + i * boardH / (rows + 0.5);
      const pegX = (row, j) => cx + (j - row / 2) * gap;
      ctx.fillStyle = C.ink3; for (let i = 0; i < rows; i++) for (let j = 0; j <= i; j++) { ctx.beginPath(); ctx.arc(pegX(i, j), rowY(i) + 8, 2.6, 0, 7); ctx.fill(); }
      balls.forEach(b => { const i = b.row, t = b.t, x = LW.lerp(pegX(i, b.path[i]), pegX(i + 1, b.path[i + 1]), t), y = LW.lerp(rowY(i), rowY(i + 1), t) - Math.sin(Math.PI * t) * gap * 0.25; LW.dot(ctx, x, y, 3.6, ORANGE, null); });
      // bins
      const by = top + boardH + 18, bh = H - by - 36, bwid = gap * 0.86, mx = Math.max(1, ...bins), n = rows;
      const pmf = bins.map((_, k) => Math.exp(lnC(n, k) + k * Math.log(pr) + (n - k) * Math.log(1 - pr)));
      const scale = bh / Math.max(mx / Math.max(total, 1), Math.max(...pmf)) * 0.95;
      bins.forEach((c, k) => { const x = pegX(n, k) - bwid / 2, f = total ? c / total : 0; ctx.fillStyle = rgba(BLUE, 0.75); ctx.fillRect(x, by + bh - f * scale, bwid, f * scale); ctx.strokeStyle = C.line2; ctx.strokeRect(x + 0.5, by + 0.5, bwid, bh); });
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); pmf.forEach((q, k) => { const x = pegX(n, k), y = by + bh - q * scale; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      const mu = n * pr, sd = Math.sqrt(n * pr * (1 - pr)); ctx.strokeStyle = ROSE; ctx.setLineDash([5, 4]); ctx.beginPath(); for (let k = -0.5; k <= n + 0.5; k += 0.05) { const g = Math.exp(-((k - mu) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI)), x = pegX(n, k), y = by + bh - g * scale; k === -0.5 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
      LW.text(ctx, "gold: binomial prediction   dashed rose: bell curve with the same mean and spread", W / 2, H - 10, { color: C.ink3, size: 10.5, align: "center" });
      let m = 0, v = 0; bins.forEach((c, k) => { m += k * c; }); m /= total || 1; bins.forEach((c, k) => { v += c * (k - m) ** 2; }); v /= total || 1;
      S.set("n", total.toLocaleString()); S.set("m", total ? m.toFixed(3) : "–"); S.set("mt", mu.toFixed(3)); S.set("sd", total ? Math.sqrt(v).toFixed(3) : "–"); S.set("st", sd.toFixed(3));
    }
    P.draw = draw; reset(); loop.start();
  });

  /* ---------------- 3. the central limit theorem ---------------- */
  const SRC = {
    unif: { name: "Uniform", s: r => r(), pdf: x => (x >= 0 && x <= 1 ? 1 : 0), r: [-0.2, 1.2], mu: 0.5, sd: Math.sqrt(1 / 12) },
    expo: { name: "Exponential (waiting times)", s: r => -Math.log(1 - r()), pdf: x => (x >= 0 ? Math.exp(-x) : 0), r: [-0.2, 5], mu: 1, sd: 1 },
    coin: { name: "Coin: 0 or 1", s: r => (r() < 0.5 ? 0 : 1), pdf: null, r: [-0.3, 1.3], mu: 0.5, sd: 0.5 },
    bimod: { name: "Two humps", s: r => (r() < 0.5 ? -1.5 : 1.5) + 0.4 * r.normal(), pdf: x => 0.5 * (Math.exp(-((x + 1.5) ** 2) / 0.32) + Math.exp(-((x - 1.5) ** 2) / 0.32)) / Math.sqrt(0.32 * Math.PI), r: [-3, 3], mu: 0, sd: Math.sqrt(1.5 * 1.5 + 0.16) }
  };
  LW.register("clt", function (root) {
    let key = "expo", n = 1, means = [], r = LW.rng(21);
    const P = LW.canvas(root, { height: w => Math.min(460, Math.max(380, w * 0.58)) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Where single measurements come from", options: Object.keys(SRC).map(k => [k, SRC[k].name]), value: key, onChange: v => { key = v; means = []; draw(); } });
    const c2 = LW.controls(root);
    LW.slider(c2, { label: "Measurements averaged together, n", min: 1, max: 100, step: 1, value: n, fmt: v => String(v), onInput: v => { n = v; means = []; draw(); } });
    const runB = LW.button(c2, "Pause", () => { runB.textContent = loop.toggle() ? "Pause" : "Run"; }, { primary: true });
    const S = LW.stats(root, [["k", "averages collected"], ["m", "mean of the averages"], ["sd", "spread of the averages"], ["th", "theory σ/√n"]]);
    const loop = LW.loop(root, () => { const F = SRC[key]; for (let j = 0; j < 40; j++) { let s = 0; for (let i = 0; i < n; i++) s += F.s(r); means.push(s / n); } if (means.length > 40000) means.splice(0, 40); draw(); });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P, F = SRC[key]; ctx.clearRect(0, 0, W, H);
      const h1 = H * 0.3;
      const A = LW.axes(ctx, { x: 50, y: 20, w: W - 64, h: h1 - 30 }, { xr: F.r, yr: [0, F.pdf ? 1.25 * Math.max(...LW.linspace(F.r[0], F.r[1], 200).map(F.pdf)) : 0.7], colors: C, title: "one measurement: " + F.name.toLowerCase(), ny: 2 });
      A.clip(); if (F.pdf) { const xs = LW.linspace(F.r[0], F.r[1], 300); LW.band(ctx, xs, xs.map(() => 0), xs.map(F.pdf), A, rgba(VIOLET, 0.25)); LW.path(ctx, xs, xs.map(F.pdf), A, { color: VIOLET, width: 2 }); } else [0, 1].forEach(x => { ctx.fillStyle = rgba(VIOLET, 0.6); ctx.fillRect(A.sx(x) - 8, A.sy(0.5), 16, A.sy(0) - A.sy(0.5)); }); ctx.restore();
      const sdn = F.sd / Math.sqrt(n), lo = F.mu - 4.5 * sdn, hi = F.mu + 4.5 * sdn, nb = 50, bins = new Array(nb).fill(0), dx = (hi - lo) / nb;
      means.forEach(m => { const b = Math.floor((m - lo) / dx); if (b >= 0 && b < nb) bins[b]++; });
      const dens = bins.map(c => c / ((means.length || 1) * dx)), peak = 1 / (sdn * Math.sqrt(2 * Math.PI));
      const B = LW.axes(ctx, { x: 50, y: h1 + 26, w: W - 64, h: H - h1 - 64 }, { xr: [lo, hi], yr: [0, Math.max(peak, ...dens) * 1.15], xlabel: "average of n measurements", colors: C, title: "averages of " + n + ": histogram, and the bell curve predicted by the central limit theorem" });
      B.clip(); dens.forEach((d, k) => { ctx.fillStyle = rgba(BLUE, 0.6); ctx.fillRect(B.sx(lo + k * dx) + 0.5, B.sy(d), B.sx(dx) - B.sx(0) - 1, B.sy(0) - B.sy(d)); });
      const xs = LW.linspace(lo, hi, 300); LW.path(ctx, xs, xs.map(x => Math.exp(-((x - F.mu) ** 2) / (2 * sdn * sdn)) * peak), B, { color: ROSE, width: 2.4 }); ctx.restore();
      const m = means.reduce((a, b) => a + b, 0) / (means.length || 1), sd = Math.sqrt(means.reduce((a, b) => a + (b - m) ** 2, 0) / (means.length || 1));
      S.set("k", means.length.toLocaleString()); S.set("m", means.length ? m.toFixed(4) : "–"); S.set("sd", means.length ? sd.toFixed(4) : "–"); S.set("th", sdn.toFixed(4));
    }
    P.draw = draw; draw(); loop.start();
  });

  /* ---------------- 4. Bayes' theorem with a thousand samples ---------------- */
  LW.register("bayes", function (root) {
    let prev = 0.05, sens = 0.9, fpr = 0.1;
    const P = LW.canvas(root, { height: w => Math.min(380, Math.max(300, w * 0.5)) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Fraction of candidates that are truly good (prior)", min: 0.005, max: 0.5, value: prev, log: true, fmt: v => (100 * v).toFixed(1) + " %", onInput: v => { prev = v; draw(); } });
    LW.slider(ctl, { label: "Screen flags a good one (sensitivity)", min: 0.5, max: 1, step: 0.01, value: sens, fmt: v => (100 * v).toFixed(0) + " %", onInput: v => { sens = v; draw(); } });
    LW.slider(ctl, { label: "Screen wrongly flags a bad one (false-positive rate)", min: 0.001, max: 0.4, value: fpr, log: true, fmt: v => (100 * v).toFixed(1) + " %", onInput: v => { fpr = v; draw(); } });
    const S = LW.stats(root, [["tp", "good and flagged"], ["fp", "bad but flagged"], ["post", "P(good | flagged)"]]);
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const N = 1000, cols = 50, rws = 20, cell = Math.min((W - 20) / cols, (H - 40) / rws), ox = (W - cols * cell) / 2;
      const good = Math.round(N * prev), tp = Math.round(good * sens), fp = Math.round((N - good) * fpr);
      for (let i = 0; i < N; i++) { const c = i % cols, rr = Math.floor(i / cols), isGood = i < good, flagged = isGood ? i < tp : i - good < fp;
        const x = ox + c * cell + cell / 2, y = 10 + rr * cell + cell / 2, rad = cell * 0.36;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fillStyle = isGood ? TEAL : (C.dark ? "#3a4560" : "#cfd5e4"); ctx.fill();
        if (flagged) { ctx.lineWidth = Math.max(1.5, cell * 0.12); ctx.strokeStyle = ORANGE; ctx.beginPath(); ctx.arc(x, y, rad + cell * 0.1, 0, 7); ctx.stroke(); } }
      LW.text(ctx, "1000 candidates. Teal: truly good. Orange ring: flagged by the screen.", W / 2, H - 8, { color: C.ink3, size: 11, align: "center" });
      S.set("tp", String(tp)); S.set("fp", String(fp)); S.set("post", (tp + fp ? (100 * tp / (tp + fp)).toFixed(1) : "–") + " %  (exact " + (100 * prev * sens / (prev * sens + (1 - prev) * fpr)).toFixed(1) + " %)");
    }
    P.draw = draw; draw();
  });
})();
