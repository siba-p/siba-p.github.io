/* Science 3–4: counting microstates (two Einstein solids exchanging energy) and a hard-disk gas
   relaxing to the Maxwell–Boltzmann distribution, with equipartition and pressure. */
(function () {
  "use strict";
  const BLUE = "#4c6ef5", ORANGE = "#f08c2e", GOLD = "#d4a017", TEAL = "#12a594", ROSE = "#e64980";
  function lgamma(z) { // Lanczos approximation
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
    z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i); const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  const lnOmega = (N, q) => lgamma(q + N) - lgamma(q + 1) - lgamma(N);   // ln C(q+N−1, q)

  LW.register("einstein", function (root) {
    let NA = 60, NB = 40, q = 100, osc = [], hist = [], running = false, seed = 1;
    const row = LW.h("div", { class: "lw-row", style: { gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" } }); root.append(row);
    const L = LW.h("div"), R = LW.h("div"); row.append(L, R);
    const P = LW.canvas(L, { height: w => Math.min(320, w * 0.85) });
    const Q = LW.canvas(R, { height: w => Math.min(320, w * 0.85) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Oscillators in solid A, N<sub>A</sub>", min: 5, max: 200, step: 1, value: NA, fmt: v => String(v), onInput: v => { NA = v; reset(); } });
    LW.slider(ctl, { label: "Oscillators in solid B, N<sub>B</sub>", min: 5, max: 200, step: 1, value: NB, fmt: v => String(v), onInput: v => { NB = v; reset(); } });
    LW.slider(ctl, { label: "Energy quanta in total, q", min: 4, max: 400, step: 1, value: q, fmt: v => String(v), onInput: v => { q = v; reset(); } });
    const c2 = LW.controls(root);
    const runB = LW.button(c2, "Let the quanta hop", () => { running = loop.toggle(); runB.textContent = running ? "Pause" : "Let the quanta hop"; }, { primary: true });
    LW.button(c2, "Put all energy in A", () => reset());
    const S = LW.stats(root, [["qa", "quanta in A now"], ["qs", "most probable q<sub>A</sub>"], ["om", "microstates of the whole, ln Ω"], ["ta", "temperature of A, k<sub>B</sub>T/ε"], ["tb", "temperature of B, k<sub>B</sub>T/ε"]]);
    function reset() { osc = new Int32Array(NA + NB); for (let i = 0; i < q; i++) osc[i % NA]++; hist = []; seed++; draw(); }
    const rng = () => (rng.r || (rng.r = LW.rng(77)))();
    function hop(k) { const n = NA + NB; for (let s = 0; s < k; s++) { const a = Math.floor(rng() * n); if (!osc[a]) continue; const b = Math.floor(rng() * n); osc[a]--; osc[b]++; } }
    const qA = () => { let s = 0; for (let i = 0; i < NA; i++) s += osc[i]; return s; };
    const loop = LW.loop(root, () => { hop(40); hist.push(qA()); if (hist.length > 400) hist.shift(); draw(); });
    const temp = (N, qq) => { const d = lnOmega(N, qq + 1) - lnOmega(N, qq); return d > 0 ? 1 / d : Infinity; };   // 1/kT = ∂lnΩ/∂(q ε)
    function draw() {
      const C = LW.colors(), qa = qA();
      const lp = []; let mx = -Infinity, best = 0;
      for (let k = 0; k <= q; k++) { const v = lnOmega(NA, k) + lnOmega(NB, q - k); lp.push(v); if (v > mx) { mx = v; best = k; } }
      const tot = Math.log(lp.reduce((s, v) => s + Math.exp(v - mx), 0)) + mx;
      { const { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
        const prob = lp.map(v => Math.exp(v - tot)), pmax = Math.max(...prob);
        const A = LW.axes(ctx, { x: 52, y: 22, w: W - 64, h: H - 60 }, { xr: [0, q], yr: [0, pmax * 1.12], xlabel: "quanta in solid A, q_A", ylabel: "probability", title: "Probability of each way to share the energy", colors: C, yfmt: v => (v === 0 ? "0" : v.toPrecision(1)) });
        A.clip(); LW.band(ctx, prob.map((_, k) => k), prob.map(() => 0), prob, A, C.band); LW.path(ctx, prob.map((_, k) => k), prob, A, { color: BLUE, width: 2 });
        ctx.strokeStyle = ORANGE; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(A.sx(qa), A.box.y); ctx.lineTo(A.sx(qa), A.box.y + A.box.h); ctx.stroke(); ctx.restore();
        LW.text(ctx, "now", A.sx(qa) + 4, A.box.y + 12, { color: ORANGE, size: 11, weight: 700 });
      }
      { const { ctx, W, H } = Q; ctx.clearRect(0, 0, W, H);
        const n = NA + NB, cols = Math.ceil(Math.sqrt(n * 2.2)), cw = (W - 20) / cols, rows = Math.ceil(n / cols), ch = Math.min(cw, (H * 0.55) / rows);
        for (let i = 0; i < n; i++) { const x = 10 + (i % cols) * cw, y = 10 + Math.floor(i / cols) * ch, e = osc[i]; ctx.fillStyle = e ? LW.ramp(Math.min(1, 0.25 + e / 8), C) : C.bg2; ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2); ctx.strokeStyle = i < NA ? BLUE : TEAL; ctx.lineWidth = 1; ctx.strokeRect(x + 1.5, y + 1.5, cw - 3, ch - 3); }
        LW.text(ctx, W > 420 ? "squares = oscillators (blue edge: A, teal edge: B); warmer = more quanta" : "blue edge: A · teal edge: B · warmer = more quanta", 10, 10 + rows * ch + 14, { color: C.ink3, size: 10.5 });
        const y0 = 10 + rows * ch + 26, B = LW.axes(ctx, { x: 52, y: y0, w: W - 64, h: H - y0 - 28 }, { xr: [0, 400], yr: [0, q], ylabel: "q_A", colors: C, xlabels: false, ny: 3 });
        B.clip(); ctx.strokeStyle = GOLD; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(B.box.x, B.sy(best)); ctx.lineTo(B.box.x + B.box.w, B.sy(best)); ctx.stroke(); ctx.setLineDash([]);
        LW.path(ctx, hist.map((_, k) => k), hist, B, { color: ORANGE, width: 1.8 }); ctx.restore();
      }
      S.set("qa", String(qa)); S.set("qs", String(best)); S.set("om", (lnOmega(NA, qa) + lnOmega(NB, q - qa)).toFixed(1) + " (max " + mx.toFixed(1) + ")");
      const ta = temp(NA, qa), tb = temp(NB, q - qa); S.set("ta", isFinite(ta) ? ta.toFixed(2) : "∞"); S.set("tb", isFinite(tb) ? tb.toFixed(2) : "∞");
    }
    P.draw = Q.draw = draw; reset();
  });

  LW.register("gas", function (root) {
    let N = 160, R = 0.012, mix = false, x, y, vx, vy, mass, wallImp = 0, wallT = 0, hist, frames = 0;
    const row = LW.h("div", { class: "lw-row", style: { gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" } }); root.append(row);
    const L = LW.h("div"), Rt = LW.h("div"); row.append(L, Rt);
    const P = LW.canvas(L, { height: w => Math.min(340, w) });
    const Q = LW.canvas(Rt, { height: w => Math.min(340, w * 0.95) });
    const ctl = LW.controls(root);
    LW.button(ctl, "Restart: every particle at the same speed", () => init(), { primary: true });
    LW.check(ctl, { label: "Two species (orange particles 4× heavier)", value: mix, onChange: v => { mix = v; init(); } });
    LW.button(ctl, "Heat ×1.5", () => { const s = Math.sqrt(1.5); for (let i = 0; i < N; i++) { vx[i] *= s; vy[i] *= s; } hist.fill(0); frames = 0; wallImp = 0; wallT = 0; });
    const S = LW.stats(root, [["kt", "k<sub>B</sub>T = ⟨½mv²⟩ (2D)"], ["ke", "mean ½mv², light / heavy"], ["p", "pressure measured"], ["pi", "ideal gas N k<sub>B</sub>T / A"]]);
    function init() {
      const r = LW.rng(5); x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N); mass = new Float64Array(N);
      const side = Math.ceil(Math.sqrt(N)); for (let i = 0; i < N; i++) { x[i] = (i % side + 0.5) / side; y[i] = (Math.floor(i / side) + 0.5) / side; const a = r() * 2 * Math.PI; mass[i] = mix && i % 2 ? 4 : 1; const sp = 0.5; vx[i] = sp * Math.cos(a); vy[i] = sp * Math.sin(a); }
      hist = new Float64Array(40); frames = 0; wallImp = 0; wallT = 0; draw();
    }
    function step(dt) {
      for (let i = 0; i < N; i++) { x[i] += vx[i] * dt; y[i] += vy[i] * dt;
        if (x[i] < R) { x[i] = 2 * R - x[i]; wallImp += 2 * mass[i] * Math.abs(vx[i]); vx[i] = Math.abs(vx[i]); } if (x[i] > 1 - R) { x[i] = 2 * (1 - R) - x[i]; wallImp += 2 * mass[i] * Math.abs(vx[i]); vx[i] = -Math.abs(vx[i]); }
        if (y[i] < R) { y[i] = 2 * R - y[i]; wallImp += 2 * mass[i] * Math.abs(vy[i]); vy[i] = Math.abs(vy[i]); } if (y[i] > 1 - R) { y[i] = 2 * (1 - R) - y[i]; wallImp += 2 * mass[i] * Math.abs(vy[i]); vy[i] = -Math.abs(vy[i]); } }
      const d2 = 4 * R * R;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const dx = x[j] - x[i], dy = y[j] - y[i], r2 = dx * dx + dy * dy; if (r2 < d2 && r2 > 0) { const dvx = vx[j] - vx[i], dvy = vy[j] - vy[i], dot = dx * dvx + dy * dvy; if (dot < 0) { const mi = mass[i], mj = mass[j], f = 2 * dot / ((mi + mj) * r2); vx[i] += f * mj * dx; vy[i] += f * mj * dy; vx[j] -= f * mi * dx; vy[j] -= f * mi * dy; } } }
      wallT += dt;
    }
    const kT = () => { let k = 0; for (let i = 0; i < N; i++) k += 0.5 * mass[i] * (vx[i] * vx[i] + vy[i] * vy[i]); return k / N; };   // 2D: ⟨½mv²⟩ = k_BT
    const loop = LW.loop(root, () => { for (let k = 0; k < 4; k++) step(0.004); frames++;
      const vmax = 3 * Math.sqrt(2 * kT()); for (let i = 0; i < N; i++) { if (mix && mass[i] !== 1) continue; const v = Math.hypot(vx[i], vy[i]), b = Math.floor(v / vmax * hist.length); if (b < hist.length) hist[b]++; } hist.vmax = vmax;
      if (frames % 400 === 0) { hist.fill(0); }
      draw(); });
    function draw() {
      const C = LW.colors();
      { const { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const s = Math.min(W, H) - 4, ox = (W - s) / 2;
        ctx.fillStyle = C.bg2; ctx.fillRect(ox, 2, s, s); ctx.strokeStyle = C.line2; ctx.strokeRect(ox + .5, 2.5, s - 1, s - 1);
        const t = kT();
        for (let i = 0; i < N; i++) { const sp = Math.hypot(vx[i], vy[i]); LW.dot(ctx, ox + x[i] * s, 2 + (1 - y[i]) * s, Math.max(2.5, R * s * (mass[i] > 1 ? 1.3 : 1)), mass[i] > 1 ? ORANGE : LW.ramp(0.2 + 0.8 * Math.min(1, sp / (2.5 * Math.sqrt(2 * t))), C), null); } }
      { const { ctx, W, H } = Q; ctx.clearRect(0, 0, W, H);
        const t = kT(), vmax = hist.vmax || 3 * Math.sqrt(2 * t), nb = hist.length, dv = vmax / nb, tot = hist.reduce((a, b) => a + b, 0) || 1;
        const dens = Array.from(hist, h => h / (tot * dv)), vs = LW.linspace(0, vmax, 120);
        const mb = vs.map(v => (v / t) * Math.exp(-v * v / (2 * t)));   // 2D Maxwell–Boltzmann for m = 1
        const A = LW.axes(ctx, { x: 52, y: 22, w: W - 64, h: H - 60 }, { xr: [0, vmax], yr: [0, Math.max(...mb, ...dens) * 1.15], xlabel: "speed v", ylabel: "probability density", title: W < 440 ? "Speeds vs Maxwell–Boltzmann" : (mix ? "Light particles: " : "") + "speed histogram vs Maxwell–Boltzmann", colors: C });
        A.clip(); dens.forEach((d, k) => { ctx.fillStyle = BLUE; ctx.globalAlpha = 0.55; ctx.fillRect(A.sx(k * dv) + 1, A.sy(d), A.sx(dv) - A.sx(0) - 2, A.sy(0) - A.sy(d)); }); ctx.globalAlpha = 1;
        LW.path(ctx, vs, mb, A, { color: ROSE, width: 2.5 }); ctx.restore();
        LW.text(ctx, "curve: f(v) = (mv/k_BT) e^(−mv²/2k_BT)", A.box.x + A.box.w - 4, A.box.y + 14, { color: ROSE, size: 11, align: "right" });
      }
      const t = kT(); let kl = 0, nl = 0, kh = 0, nh = 0; for (let i = 0; i < N; i++) { const e = 0.5 * mass[i] * (vx[i] ** 2 + vy[i] ** 2); if (mass[i] > 1) { kh += e; nh++; } else { kl += e; nl++; } }
      S.set("kt", t.toFixed(4)); S.set("ke", (kl / nl).toFixed(4) + (nh ? " / " + (kh / nh).toFixed(4) : ""));
      S.set("p", wallT > 0.2 ? (wallImp / (wallT * 4)).toFixed(3) : "measuring…"); S.set("pi", (N * t).toFixed(3));
    }
    P.draw = Q.draw = draw; init(); loop.start();
  });
})();
