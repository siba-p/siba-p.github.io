/* Mathematics: functions, derivatives and integrals, as pictures you can push and pull.
   Colours follow the equation palette: blue = input x, orange = output / f(x), teal = slope,
   gold = area / accumulated quantity, rose = error, violet = parameters. */
(function () {
  "use strict";
  const SUP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", ".": "·" };
  const p10 = v => "10" + String(Math.round(v * 100) / 100).split("").map(c => SUP[c] || c).join("");
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const f3 = v => (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(2) : v.toFixed(3)).replace("-", "−");
  const range = (ys, pad = 0.12) => { const f = ys.filter(isFinite); let lo = Math.min(...f), hi = Math.max(...f); if (hi - lo < 1e-9) { lo -= 1; hi += 1; } const d = (hi - lo) * pad; return [lo - d, hi + d]; };
  const roundRect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };

  /* ---------------- 1. the function machine ---------------- */
  const RULES = {
    lin: { name: "2x + 1", f: x => 2 * x + 1, d: [-3, 3], say: "double it, then add one" },
    sq: { name: "x²", f: x => x * x, d: [-3, 3], say: "multiply it by itself" },
    temp: { name: "1.8x + 32", f: x => 1.8 * x + 32, d: [-40, 100], say: "°C in, °F out" },
    half: { name: "100 × 0.5ˣ", f: x => 100 * Math.pow(0.5, x), d: [0, 6], say: "what is left after x half-lives" },
    sin: { name: "sin x", f: x => Math.sin(x), d: [-6.3, 6.3], say: "height of a point going round a circle" }
  };
  LW.register("fnmachine", function (root) {
    let key = "lin", x = 1, pts = [], anim = null, queue = [];
    const P = LW.canvas(root, { height: w => (w < 640 ? 470 : 320) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "The rule inside the machine", options: Object.keys(RULES).map(k => [k, RULES[k].name]), value: key, onChange: v => { key = v; pts = []; queue = []; anim = null; const d = RULES[v].d; x = +(d[0] + (d[1] - d[0]) * 0.6).toFixed(1); xs.input.min = d[0]; xs.input.max = d[1]; xs.input.step = (d[1] - d[0]) / 120; xs.set(x); draw(); } });
    const c2 = LW.controls(root);
    const xs = LW.slider(c2, { label: "Input x", min: -3, max: 3, step: 0.05, value: x, fmt: v => f3(v), onInput: v => { x = v; draw(); } });
    LW.button(c2, "Feed x into the machine", () => feed(x), { primary: true });
    LW.button(c2, "Feed 40 inputs", () => { const d = RULES[key].d; queue = LW.linspace(d[0], d[1], 40); });
    LW.button(c2, "Clear the graph", () => { pts = []; queue = []; anim = null; draw(); });
    const S = LW.stats(root, [["in", "input x"], ["out", "output f(x)"], ["n", "points on the graph"]]);
    function feed(v) { if (!anim) anim = { x: v, t: 0 }; else queue.push(v); }
    const loop = LW.loop(root, dt => { if (!anim && queue.length) anim = { x: queue.shift(), t: 0 }; if (anim) { anim.t += dt * (queue.length ? 5 : 1.4); if (anim.t >= 1) { pts.push([anim.x, RULES[key].f(anim.x)]); anim = null; } } draw(); });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P, R = RULES[key]; ctx.clearRect(0, 0, W, H);
      const narrow = W < 640, mw = narrow ? W : W * 0.42, mh = narrow ? 170 : H;
      // the machine
      const bx = mw / 2 - 70, by = mh / 2 - 46, bw = 140, bh = 92, glow = anim && anim.t > 0.38 && anim.t < 0.62;
      ctx.fillStyle = glow ? rgba(VIOLET, 0.22) : rgba(VIOLET, 0.1); ctx.strokeStyle = VIOLET; ctx.lineWidth = 2; roundRect(ctx, bx, by, bw, bh, 14); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx - 26, by + 18); ctx.lineTo(bx, by + 34); ctx.lineTo(bx, by + 58); ctx.lineTo(bx - 26, by + 74); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + bw + 26, by + 30); ctx.lineTo(bx + bw, by + 38); ctx.lineTo(bx + bw, by + 54); ctx.lineTo(bx + bw + 26, by + 62); ctx.stroke();
      LW.text(ctx, "f", mw / 2, by + 34, { color: VIOLET, size: 22, weight: 700, align: "center" });
      LW.text(ctx, R.name, mw / 2, by + 58, { color: C.ink, size: 14, weight: 600, align: "center", mono: true });
      LW.text(ctx, R.say, mw / 2, by + bh + 22, { color: C.ink3, size: 11, align: "center" });
      const cur = anim ? anim.x : x, y = R.f(cur);
      let ix = 30, ox = mw - 30, cy = mh / 2, inX = ix, outShow = !anim;
      if (anim) { const t = anim.t; inX = t < 0.4 ? LW.lerp(ix, bx + 20, t / 0.4) : null; outShow = t > 0.6; if (outShow) ox = LW.lerp(bx + bw - 10, mw - 30, (t - 0.6) / 0.4); }
      if (inX != null) { LW.dot(ctx, inX, cy, 19, rgba(BLUE, 0.16), BLUE, 2); LW.text(ctx, f3(cur).replace(/\.?0+$/, ""), inX, cy + 4, { color: BLUE, size: 11, weight: 700, align: "center", mono: true }); }
      if (outShow) { LW.dot(ctx, ox, cy, 19, rgba(ORANGE, 0.16), ORANGE, 2); LW.text(ctx, f3(y).replace(/\.?0+$/, ""), ox, cy + 4, { color: ORANGE, size: 11, weight: 700, align: "center", mono: true }); }
      LW.text(ctx, "in: x", 30, cy - 28, { color: BLUE, size: 11, weight: 600, align: "center" }); LW.text(ctx, "out: f(x)", mw - 30, cy - 28, { color: ORANGE, size: 11, weight: 600, align: "center" });
      // the graph being built
      const gx = narrow ? 46 : mw + 50, gy = narrow ? mh + 14 : 14, gw = narrow ? W - 60 : W - mw - 64, gh = narrow ? H - mh - 58 : H - 58;
      const d = R.d, all = LW.linspace(d[0], d[1], 200).map(R.f), yr = range(all);
      const A = LW.axes(ctx, { x: gx, y: gy, w: gw, h: gh }, { xr: d, yr, xlabel: "input x", ylabel: "output f(x)", colors: C });
      A.clip();
      if (pts.length > 1) { const s = pts.slice().sort((a, b) => a[0] - b[0]); LW.path(ctx, s.map(p => p[0]), s.map(p => p[1]), A, { color: ORANGE, width: 1.6, alpha: Math.min(1, pts.length / 30) }); }
      pts.forEach((p, i) => LW.dot(ctx, A.sx(p[0]), A.sy(p[1]), i === pts.length - 1 ? 5.5 : 3.6, ORANGE, C.card, 1.2));
      if (!anim) { ctx.strokeStyle = BLUE; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(A.sx(x), A.box.y + A.box.h); ctx.lineTo(A.sx(x), A.sy(R.f(x))); ctx.lineTo(A.box.x, A.sy(R.f(x))); ctx.stroke(); ctx.setLineDash([]); LW.dot(ctx, A.sx(x), A.sy(R.f(x)), 5, null, ORANGE, 2); }
      ctx.restore();
      S.set("in", f3(cur)); S.set("out", f3(y)); S.set("n", String(pts.length));
    }
    P.draw = draw; draw(); loop.start();
  });

  /* ---------------- 2. families of functions and their parameters ---------------- */
  const FAM = {
    line: { name: "Straight line", eq: "y = m·x + c", ps: [["m", "slope m", -3, 3, 1], ["c", "intercept c", -3, 3, 0.5]], f: (x, p) => p.m * x + p.c, xr: [-4, 4], yr: [-8, 8] },
    power: { name: "Power", eq: "y = a·xⁿ", ps: [["a", "scale a", -2, 2, 1], ["n", "power n", -2, 4, 2, 1]], f: (x, p) => (x === 0 && p.n < 0 ? NaN : p.a * Math.pow(x, p.n)), xr: [-3, 3], yr: [-8, 8] },
    exp: { name: "Exponential", eq: "y = A·e^(k·x)", ps: [["A", "start value A", 0.2, 5, 1], ["k", "rate k", -2, 2, 0.5]], f: (x, p) => p.A * Math.exp(p.k * x), xr: [-3, 5], yr: [0, 12] },
    log: { name: "Logarithm", eq: "y = a·ln(x) + c", ps: [["a", "scale a", -3, 3, 1], ["c", "shift c", -3, 3, 0]], f: (x, p) => (x > 0 ? p.a * Math.log(x) + p.c : NaN), xr: [-1, 8], yr: [-5, 5] },
    sine: { name: "Wave", eq: "y = A·sin(ω·x + φ)", ps: [["A", "amplitude A", 0, 3, 1], ["w", "angular frequency ω", 0.2, 4, 1], ["ph", "phase φ", -3.14, 3.14, 0]], f: (x, p) => p.A * Math.sin(p.w * x + p.ph), xr: [-7, 7], yr: [-3.5, 3.5] },
    gauss: { name: "Bell curve", eq: "y = A·exp(−(x−μ)²/2σ²)", ps: [["A", "height A", 0.2, 3, 1], ["mu", "centre μ", -3, 3, 0], ["s", "width σ", 0.2, 3, 1]], f: (x, p) => p.A * Math.exp(-((x - p.mu) ** 2) / (2 * p.s * p.s)), xr: [-6, 6], yr: [-0.2, 3.3] }
  };
  LW.register("fnfamily", function (root, opts) {
    let key = (opts && opts.family) || "exp", p = {}, logy = false, ghost = true;
    const P = LW.canvas(root, { height: w => Math.min(380, Math.max(280, w * 0.5)) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Family", options: Object.keys(FAM).map(k => [k, FAM[k].name]), value: key, onChange: v => { key = v; build(); } });
    const box = LW.controls(root);
    const c3 = LW.controls(root);
    const lc = LW.check(c3, { label: "Logarithmic y axis", value: logy, onChange: v => { logy = v; draw(); } });
    LW.check(c3, { label: "Show the plain curve for comparison", value: ghost, onChange: v => { ghost = v; draw(); } });
    const S = LW.stats(root, [["eq", "equation"], ["k1", ""], ["k2", ""]]);
    function build() { box.innerHTML = ""; p = {}; FAM[key].ps.forEach(([id, label, lo, hi, v0, step]) => { p[id] = v0; LW.slider(box, { label, min: lo, max: hi, step: step || 0.01, value: v0, fmt: v => v.toFixed(2), onInput: v => { p[id] = v; draw(); } }); }); draw(); }
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P, F = FAM[key]; ctx.clearRect(0, 0, W, H);
      const xs = LW.linspace(F.xr[0], F.xr[1], 600), ys = xs.map(x => F.f(x, p));
      const base = {}; F.ps.forEach(([id, , , , v0]) => { base[id] = v0; });
      const gy = xs.map(x => F.f(x, base));
      const T = v => (logy ? (v > 0 ? Math.log10(v) : NaN) : v);
      const yr = logy ? [-3, 3] : F.yr;
      const A = LW.axes(ctx, { x: 52, y: 14, w: W - 66, h: H - 52 }, { xr: F.xr, yr, xlabel: "x", ylabel: logy ? "y (log scale)" : "y", colors: C, yfmt: logy ? (v => (Number.isInteger(v) ? p10(v) : "")) : null });
      A.clip();
      ctx.strokeStyle = C.ink3; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(A.sx(0), A.box.y); ctx.lineTo(A.sx(0), A.box.y + A.box.h); if (!logy) { ctx.moveTo(A.box.x, A.sy(0)); ctx.lineTo(A.box.x + A.box.w, A.sy(0)); } ctx.stroke(); ctx.globalAlpha = 1;
      if (ghost) LW.path(ctx, xs, gy.map(T), A, { color: C.ink3, width: 1.5, dash: [5, 5] });
      // annotations per family
      let k1 = ["", ""], k2 = ["", ""];
      if (key === "line") { LW.dot(ctx, A.sx(0), A.sy(T(p.c)), 5, VIOLET, C.card, 2); const x0 = 1, y0 = p.m * x0 + p.c; ctx.strokeStyle = TEAL; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(A.sx(x0), A.sy(T(y0))); ctx.lineTo(A.sx(x0 + 1), A.sy(T(y0))); ctx.lineTo(A.sx(x0 + 1), A.sy(T(y0 + p.m))); ctx.stroke(); k1 = ["rise per unit run", p.m.toFixed(2)]; k2 = ["crosses the y axis at", p.c.toFixed(2)]; }
      if (key === "exp") { const th = Math.log(2) / Math.abs(p.k || 1e-9); if (Math.abs(p.k) > 0.05 && th < 8) { for (let j = 0; j < 4; j++) { const xa = j * th, ya = p.A * Math.exp(p.k * xa); if (xa < F.xr[0] || xa > F.xr[1]) continue; LW.dot(ctx, A.sx(xa), A.sy(T(ya)), 4.5, GOLD, C.card, 1.5); } }
        k1 = [p.k >= 0 ? "doubling time ln2 / k" : "half-life ln2 / |k|", Math.abs(p.k) < 1e-3 ? "∞" : th.toFixed(3)]; k2 = ["value at x = 0", p.A.toFixed(2)]; }
      if (key === "log") { const x1 = Math.exp((0 - p.c) / (p.a || 1e-9)); if (isFinite(x1) && x1 < F.xr[1]) LW.dot(ctx, A.sx(x1), A.sy(0), 5, VIOLET, C.card, 2); k1 = ["crosses zero at x", isFinite(x1) ? f3(x1) : "–"]; k2 = ["each ×e in x adds", p.a.toFixed(2)]; }
      if (key === "sine") { const T0 = 2 * Math.PI / p.w; k1 = ["period 2π / ω", T0.toFixed(3)]; k2 = ["frequency ω / 2π", (1 / T0).toFixed(3)]; const xa = -p.ph / p.w; ctx.strokeStyle = TEAL; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(A.sx(xa), A.sy(T(-p.A - 0.25))); ctx.lineTo(A.sx(xa), A.sy(T(-p.A - 0.45))); ctx.lineTo(A.sx(xa + T0), A.sy(T(-p.A - 0.45))); ctx.lineTo(A.sx(xa + T0), A.sy(T(-p.A - 0.25))); ctx.stroke(); }
      if (key === "gauss") { const hm = p.A / 2, fw = 2 * Math.sqrt(2 * Math.log(2)) * p.s; ctx.strokeStyle = TEAL; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(A.sx(p.mu - fw / 2), A.sy(T(hm))); ctx.lineTo(A.sx(p.mu + fw / 2), A.sy(T(hm))); ctx.stroke(); LW.band(ctx, LW.linspace(p.mu - p.s, p.mu + p.s, 60), LW.linspace(p.mu - p.s, p.mu + p.s, 60).map(() => (logy ? -3 : 0)), LW.linspace(p.mu - p.s, p.mu + p.s, 60).map(x => T(F.f(x, p))), A, rgba(GOLD, 0.22)); k1 = ["full width at half maximum", fw.toFixed(3)]; k2 = ["area under the curve", (p.A * p.s * Math.sqrt(2 * Math.PI)).toFixed(3)]; }
      if (key === "power") { k1 = ["value at x = 1", p.a.toFixed(2)]; k2 = ["value at x = 2", f3(p.a * Math.pow(2, p.n))]; }
      LW.path(ctx, xs, ys.map(T), A, { color: ORANGE, width: 2.8 });
      ctx.restore();
      LW.text(ctx, F.eq, A.box.x + A.box.w - 8, A.box.y + 16, { color: C.ink2, size: 13, weight: 600, align: "right", mono: true });
      S.set("eq", F.eq); const lab = S.el.querySelectorAll("small"); lab[1].textContent = k1[0]; lab[2].textContent = k2[0]; S.set("k1", k1[1]); S.set("k2", k2[1]);
      lc.el.disabled = false;
    }
    P.draw = draw; build();
  });

  /* ---------------- 3. straight lines hiding in curved data: log axes ---------------- */
  const DATA = {
    kepler: { name: "Planets: period against orbit size", xl: "semi-major axis a (AU)", yl: "orbital period T (years)", pts: [[0.387, 0.241, "Mercury"], [0.723, 0.615, "Venus"], [1, 1, "Earth"], [1.524, 1.881, "Mars"], [5.203, 11.86, "Jupiter"], [9.537, 29.46, "Saturn"], [19.19, 84.01, "Uranus"], [30.07, 164.8, "Neptune"]], best: "loglog", law: "T ∝ a^1.5 (Kepler's third law)" },
    decay: { name: "A decaying sample (simulated counts)", xl: "time t (hours)", yl: "counts per minute", pts: null, best: "semilog", law: "N = N₀ e^(−t/τ): a straight line on a semi-log plot" },
    lj: { name: "Repulsive wall of an atom pair", xl: "distance r (σ)", yl: "repulsive energy 4ε(σ/r)¹² (ε)", pts: LW.linspace(0.8, 1.6, 9).map(r => [r, 4 * Math.pow(r, -12)]), best: "loglog", law: "E ∝ r⁻¹²: slope −12 on log–log axes" }
  };
  (function () { const r = LW.rng(42), pts = []; for (let t = 0; t <= 20; t += 1.25) pts.push([t, Math.max(1, Math.round(2000 * Math.exp(-t / 4.3) + Math.sqrt(2000 * Math.exp(-t / 4.3)) * r.normal()))]); DATA.decay.pts = pts; })();
  LW.register("loglog", function (root) {
    let key = "kepler", mode = "lin";
    const P = LW.canvas(root, { height: w => Math.min(380, Math.max(280, w * 0.5)) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Data", options: Object.keys(DATA).map(k => [k, DATA[k].name]), value: key, onChange: v => { key = v; draw(); } });
    LW.seg(ctl, { label: "Axes", options: [["lin", "Linear"], ["semilog", "Semi-log (log y)"], ["loglog", "Log–log"]], value: mode, onChange: v => { mode = v; draw(); } });
    const S = LW.stats(root, [["fit", "straight-line fit in these axes"], ["r2", "how straight (R²)"], ["law", "what the slope means"]]);
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P, D = DATA[key]; ctx.clearRect(0, 0, W, H);
      const lx = mode === "loglog", ly = mode !== "lin";
      const X = v => (lx ? Math.log10(v) : v), Y = v => (ly ? Math.log10(v) : v);
      const px = D.pts.map(p => X(p[0])), py = D.pts.map(p => Y(p[1]));
      const xr = range(px, 0.08), yr = range(py, 0.1);
      const fmt = l => (l ? (v => { const r = Math.pow(10, v); return r >= 100 || r < 0.1 ? r.toExponential(0) : +r.toPrecision(2) + ""; }) : null);
      const A = LW.axes(ctx, { x: 58, y: 14, w: W - 74, h: H - 54 }, { xr, yr, xlabel: D.xl + (lx ? ", log scale" : ""), ylabel: D.yl + (ly ? ", log" : ""), colors: C, xfmt: fmt(lx), yfmt: fmt(ly) });
      // least squares in the displayed coordinates
      const n = px.length, mx = px.reduce((a, b) => a + b) / n, my = py.reduce((a, b) => a + b) / n;
      let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (px[i] - mx) * (py[i] - my); sxx += (px[i] - mx) ** 2; syy += (py[i] - my) ** 2; }
      const b = sxy / sxx, a = my - b * mx, r2 = sxy * sxy / (sxx * syy);
      A.clip(); LW.path(ctx, [xr[0], xr[1]], [a + b * xr[0], a + b * xr[1]], A, { color: r2 > 0.995 ? TEAL : ROSE, width: 2, dash: [6, 4] });
      let lastL = null; D.pts.forEach((p, i) => { const X = A.sx(px[i]), Y = A.sy(py[i]); LW.dot(ctx, X, Y, 5.5, ORANGE, C.card, 1.5); if (p[2] && W > 520 && (!lastL || Math.hypot(X - lastL[0], Y - lastL[1]) > 46)) { const right = X > A.box.x + A.box.w - 70; LW.text(ctx, p[2], X + (right ? -8 : 8), Y + (right ? 16 : 4), { color: C.ink3, size: 10.5, align: right ? 'right' : 'left' }); lastL = [X, Y]; } });
      ctx.restore();
      S.set("fit", "slope " + b.toFixed(3) + (lx ? "" : ly ? "  (per unit x, in log₁₀)" : ""));
      S.set("r2", r2.toFixed(4) + (r2 > 0.995 ? "  straight" : "  curved"));
      S.set("law", mode === D.best ? D.law : "try the " + (D.best === "loglog" ? "log–log" : "semi-log") + " axes");
    }
    P.draw = draw; draw();
  });

  /* ---------------- 4. zoom in until the curve looks straight ---------------- */
  const fz = x => Math.sin(1.3 * x) + 0.15 * x * x, dfz = x => 1.3 * Math.cos(1.3 * x) + 0.3 * x;
  LW.register("zoomslope", function (root) {
    let x0 = 0.6, mag = 6, h = 0.8;
    const P = LW.canvas(root, { height: w => (w < 640 ? 560 : 320) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Magnification of the right panel", min: 1, max: 2000, value: mag, log: true, fmt: v => "×" + (v < 10 ? v.toFixed(1) : Math.round(v)), onInput: v => { mag = v; draw(); } });
    LW.slider(ctl, { label: "Step h for the secant line", min: 0.001, max: 2, value: h, log: true, fmt: v => v.toPrecision(2), onInput: v => { h = v; draw(); } });
    const S = LW.stats(root, [["sec", "secant slope [f(x+h) − f(x)] / h"], ["tan", "true slope f′(x)"], ["err", "difference"]]);
    LW.note(root, "Drag the point along the curve on the left. On the right the same neighbourhood is magnified: a smooth curve, seen close enough, is a straight line, and the slope of that line is the derivative.");
    let A1 = null;
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const narrow = W < 640, pw = narrow ? W - 60 : (W - 110) / 2, ph = narrow ? (H - 100) / 2 : H - 52;
      const xr = [-3, 3], xs = LW.linspace(xr[0], xr[1], 400), y0 = fz(x0), s = dfz(x0);
      A1 = LW.axes(ctx, { x: 46, y: 14, w: pw, h: ph }, { xr, yr: [-1.6, 2.6], xlabel: "x", ylabel: "f(x)", colors: C, title: "" });
      A1.clip();
      const half = 3 / mag; ctx.fillStyle = rgba(VIOLET, 0.12); ctx.strokeStyle = VIOLET; ctx.lineWidth = 1.2; const bxw = A1.sx(x0 + half) - A1.sx(x0 - half), byh = A1.sy(y0 - half * 0.7) - A1.sy(y0 + half * 0.7); ctx.fillRect(A1.sx(x0 - half), A1.sy(y0 + half * 0.7), Math.max(2, bxw), Math.max(2, byh)); ctx.strokeRect(A1.sx(x0 - half), A1.sy(y0 + half * 0.7), Math.max(2, bxw), Math.max(2, byh));
      LW.path(ctx, xs, xs.map(fz), A1, { color: ORANGE, width: 2.6 });
      LW.path(ctx, [x0 - 3, x0 + 3], [y0 - 3 * (fz(x0 + h) - y0) / h, y0 + 3 * (fz(x0 + h) - y0) / h], A1, { color: ROSE, width: 1.6, dash: [5, 4] });
      LW.dot(ctx, A1.sx(x0 + h), A1.sy(fz(x0 + h)), 4.5, ROSE, C.card, 1.5);
      LW.dot(ctx, A1.sx(x0), A1.sy(y0), 7, BLUE, C.card, 2);
      ctx.restore();
      // zoomed panel
      const zx = narrow ? 46 : 46 + pw + 56, zy = narrow ? 14 + ph + 56 : 14;
      const zr = [x0 - half, x0 + half], zyr = [y0 - half * 0.7, y0 + half * 0.7];
      const A2 = LW.axes(ctx, { x: zx, y: zy, w: pw, h: ph }, { xr: zr, yr: zyr, xlabel: "x (zoomed ×" + (mag < 10 ? mag.toFixed(1) : Math.round(mag)) + ")", colors: C, xfmt: v => v.toPrecision(4), yfmt: v => v.toPrecision(4) });
      A2.clip(); ctx.fillStyle = rgba(VIOLET, 0.05); ctx.fillRect(A2.box.x, A2.box.y, A2.box.w, A2.box.h);
      const zs = LW.linspace(zr[0], zr[1], 200);
      LW.path(ctx, zr, [y0 - s * half, y0 + s * half], A2, { color: TEAL, width: 2, dash: [7, 5] });
      LW.path(ctx, zs, zs.map(fz), A2, { color: ORANGE, width: 3 });
      LW.dot(ctx, A2.sx(x0), A2.sy(y0), 7, BLUE, C.card, 2); ctx.restore();
      LW.text(ctx, "dashed teal: the tangent line, slope f′(x)", A2.box.x + 6, A2.box.y + A2.box.h - 8, { color: TEAL, size: 10.5 });
      const sec = (fz(x0 + h) - y0) / h; S.set("sec", f3(sec)); S.set("tan", f3(s)); S.set("err", f3(sec - s));
    }
    P.draw = draw;
    LW.drag(P.cv, { down: q => { if (!A1 || q.x > A1.box.x + A1.box.w + 10 || q.y > A1.box.y + A1.box.h + 10) return false; x0 = LW.clamp(A1.ix(q.x), -2.8, 2.8); draw(); }, move: q => { x0 = LW.clamp(A1.ix(q.x), -2.8, 2.8); draw(); } });
    draw();
  });

  /* ---------------- 5. a function and its derivative, side by side ---------------- */
  const DF = {
    sq: { name: "x²", f: x => x * x, xr: [-3, 3] },
    cubic: { name: "x³ − 3x", f: x => x ** 3 - 3 * x, xr: [-2.2, 2.2] },
    sin: { name: "sin x", f: Math.sin, xr: [-6.3, 6.3] },
    exp: { name: "eˣ", f: Math.exp, xr: [-3, 2] },
    lj: { name: "Atom-pair energy V(r)", f: r => 4 * (Math.pow(r, -12) - Math.pow(r, -6)), xr: [0.92, 2.6], yclip: [-1.4, 2] }
  };
  const d1 = (f, x, e = 1e-4) => (f(x + e) - f(x - e)) / (2 * e), d2 = (f, x, e = 1e-3) => (f(x + e) - 2 * f(x) + f(x - e)) / (e * e);
  LW.register("derivplot", function (root, opts) {
    let key = (opts && opts.fn) || "cubic", x0 = 0.4, second = false, trace = false;
    const P = LW.canvas(root, { height: w => (w < 640 ? 520 : 460) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Function", options: Object.keys(DF).map(k => [k, DF[k].name]), value: key, onChange: v => { key = v; const r = DF[v].xr; x0 = r[0] + (r[1] - r[0]) * 0.55; draw(); } });
    const c2 = LW.controls(root);
    LW.check(c2, { label: "Also draw the second derivative f″", value: second, onChange: v => { second = v; draw(); } });
    LW.check(c2, { label: "Only reveal f′ up to the point (trace it)", value: trace, onChange: v => { trace = v; draw(); } });
    const play = LW.button(c2, "Sweep the point", () => { sweep = DF[key].xr[0]; loop.start(); });
    const S = LW.stats(root, [["x", "x"], ["f", "f(x)"], ["d", "slope f′(x)"], ["dd", "curvature f″(x)"], ["what", "here the curve is"]]);
    let A, B, sweep = null;
    const loop = LW.loop(root, dt => { if (sweep == null) { loop.stop(); return; } const r = DF[key].xr; sweep += dt * (r[1] - r[0]) / 5; if (sweep >= r[1]) { sweep = null; loop.stop(); } else x0 = sweep; draw(); });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P, F = DF[key]; ctx.clearRect(0, 0, W, H);
      const xs = LW.linspace(F.xr[0], F.xr[1], 500), ys = xs.map(F.f), ds = xs.map(x => d1(F.f, x)), dds = xs.map(x => d2(F.f, x));
      const yr = F.yclip || range(ys), dr = F.yclip ? [-8, 8] : range(second ? ds.concat(dds) : ds);
      const hh = (H - 92) / 2;
      A = LW.axes(ctx, { x: 52, y: 22, w: W - 66, h: hh }, { xr: F.xr, yr, ylabel: "f(x)", colors: C, xlabels: false, title: "the function f" });
      A.clip(); LW.path(ctx, xs, ys, A, { color: ORANGE, width: 2.6 });
      // stationary points
      for (let i = 1; i < xs.length; i++) if (ds[i - 1] * ds[i] < 0) LW.dot(ctx, A.sx(xs[i]), A.sy(ys[i]), 4.5, VIOLET, C.card, 1.5);
      const y0 = F.f(x0), s = d1(F.f, x0), span = (F.xr[1] - F.xr[0]) * 0.18;
      LW.path(ctx, [x0 - span, x0 + span], [y0 - s * span, y0 + s * span], A, { color: TEAL, width: 2.2 });
      // slope triangle with run = span/2
      const run = span * 0.6; ctx.strokeStyle = TEAL; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(A.sx(x0), A.sy(y0)); ctx.lineTo(A.sx(x0 + run), A.sy(y0)); ctx.lineTo(A.sx(x0 + run), A.sy(y0 + s * run)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      LW.dot(ctx, A.sx(x0), A.sy(y0), 7, BLUE, C.card, 2); ctx.restore();
      B = LW.axes(ctx, { x: 52, y: 22 + hh + 34, w: W - 66, h: hh }, { xr: F.xr, yr: dr, xlabel: key === "lj" ? "distance r" : "x", ylabel: "slope", colors: C, title: second ? "its derivative f′ (teal) and second derivative f″ (violet)" : "its derivative f′: the slope of f at every x" });
      B.clip(); ctx.strokeStyle = C.ink3; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(B.box.x, B.sy(0)); ctx.lineTo(B.box.x + B.box.w, B.sy(0)); ctx.stroke(); ctx.globalAlpha = 1;
      const vis = trace ? xs.map((x, i) => (x <= x0 ? ds[i] : NaN)) : ds;
      if (second) LW.path(ctx, xs, trace ? xs.map((x, i) => (x <= x0 ? dds[i] : NaN)) : dds, B, { color: VIOLET, width: 1.8, dash: [6, 4] });
      LW.path(ctx, xs, vis, B, { color: TEAL, width: 2.6 });
      ctx.strokeStyle = BLUE; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(B.sx(x0), B.box.y); ctx.lineTo(B.sx(x0), B.box.y + B.box.h); ctx.stroke(); ctx.setLineDash([]);
      LW.dot(ctx, B.sx(x0), B.sy(s), 6.5, TEAL, C.card, 2); ctx.restore();
      const cv = d2(F.f, x0);
      S.set("x", f3(x0)); S.set("f", f3(y0)); S.set("d", f3(s)); S.set("dd", f3(cv));
      S.set("what", Math.abs(s) < 0.03 ? (cv > 0 ? "flat: a minimum" : cv < 0 ? "flat: a maximum" : "flat") : (s > 0 ? "rising" : "falling") + (Math.abs(cv) < 0.05 ? ", nearly straight" : cv > 0 ? ", bending upwards" : ", bending downwards"));
    }
    P.draw = draw;
    const set = q => { const a = q.y > A.box.y + A.box.h + 20 ? B : A; x0 = LW.clamp(a.ix(q.x), DF[key].xr[0], DF[key].xr[1]); draw(); };
    LW.drag(P.cv, { down: q => { set(q); }, move: set });
    draw(); void play;
  });

  /* ---------------- 6. Taylor polynomials ---------------- */
  const TF = {
    sin: { name: "sin x", f: Math.sin, dn: (n, a) => [Math.sin(a), Math.cos(a), -Math.sin(a), -Math.cos(a)][n % 4], xr: [-8, 8], yr: [-2.5, 2.5], a: [-6, 6, 0] },
    exp: { name: "eˣ", f: Math.exp, dn: (n, a) => Math.exp(a), xr: [-5, 3], yr: [-2, 12], a: [-3, 2, 0] },
    ln: { name: "ln(1 + x)", f: x => (x > -1 ? Math.log(1 + x) : NaN), dn: (n, a) => (n === 0 ? Math.log(1 + a) : Math.pow(-1, n - 1) * fact(n - 1) / Math.pow(1 + a, n)), xr: [-1.5, 3.5], yr: [-3, 2.5], a: [-0.5, 2, 0], sing: -1 },
    lj: { name: "bond energy near its minimum", f: r => 4 * (Math.pow(r, -12) - Math.pow(r, -6)), dn: (n, a) => ljd(n, a), xr: [0.9, 2.2], yr: [-1.3, 1.2], a: [1.0, 1.6, Math.pow(2, 1 / 6)] }
  };
  function fact(n) { let p = 1; for (let i = 2; i <= n; i++) p *= i; return p; }
  function rising(a, n) { let p = 1; for (let i = 0; i < n; i++) p *= a + i; return p; }
  function ljd(n, r) { const s = n % 2 ? -1 : 1; return 4 * s * (rising(12, n) * Math.pow(r, -12 - n) - rising(6, n) * Math.pow(r, -6 - n)); }
  LW.register("taylor", function (root, opts) {
    let key = (opts && opts.fn) || "sin", N = 3, a = TF[key].a[2];
    const P = LW.canvas(root, { height: w => Math.min(380, Math.max(280, w * 0.5)) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Function", options: Object.keys(TF).map(k => [k, TF[k].name]), value: key, onChange: v => { key = v; a = TF[v].a[2]; as.input.min = TF[v].a[0]; as.input.max = TF[v].a[1]; as.set(a); draw(); } });
    const c2 = LW.controls(root);
    LW.slider(c2, { label: "Number of terms (polynomial order N)", min: 0, max: 15, step: 1, value: N, fmt: v => String(v), onInput: v => { N = v; draw(); } });
    const as = LW.slider(c2, { label: "Expansion point a", min: -6, max: 6, step: 0.01, value: a, fmt: v => v.toFixed(2), onInput: v => { a = v; draw(); } });
    const play = LW.button(c2, "Add terms one by one", () => { N = 0; t = 0; loop.start(); });
    const S = LW.stats(root, [["poly", "the polynomial"], ["good", "range where error < 0.01"]]);
    let t = 0;
    const loop = LW.loop(root, dt => { t += dt; if (t > 0.7) { t = 0; N++; if (N >= 15) loop.stop(); draw(); } });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P, F = TF[key]; ctx.clearRect(0, 0, W, H);
      const c = []; for (let n = 0; n <= N; n++) c.push(F.dn(n, a) / fact(n));
      const T = x => { let s = 0, p = 1; for (let n = 0; n <= N; n++) { s += c[n] * p; p *= x - a; } return s; };
      const xs = LW.linspace(F.xr[0], F.xr[1], 600);
      const A = LW.axes(ctx, { x: 48, y: 14, w: W - 62, h: H - 52 }, { xr: F.xr, yr: F.yr, xlabel: key === "lj" ? "distance r" : "x", ylabel: "y", colors: C });
      A.clip();
      // region of agreement
      let lo = a, hi = a; const tol = 0.01; for (let x = a; x <= F.xr[1]; x += (F.xr[1] - F.xr[0]) / 600) { if (Math.abs(T(x) - F.f(x)) < tol) hi = x; else break; } for (let x = a; x >= F.xr[0]; x -= (F.xr[1] - F.xr[0]) / 600) { if (Math.abs(T(x) - F.f(x)) < tol) lo = x; else break; }
      ctx.fillStyle = rgba(TEAL, 0.1); ctx.fillRect(A.sx(lo), A.box.y, A.sx(hi) - A.sx(lo), A.box.h);
      if (F.sing != null) { ctx.strokeStyle = ROSE; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(A.sx(F.sing), A.box.y); ctx.lineTo(A.sx(F.sing), A.box.y + A.box.h); ctx.stroke(); ctx.setLineDash([]); const R = Math.abs(a - F.sing); ctx.strokeStyle = rgba(ROSE, 0.6); ctx.beginPath(); ctx.moveTo(A.sx(a - R), A.box.y + 6); ctx.lineTo(A.sx(a + R), A.box.y + 6); ctx.stroke(); LW.text(ctx, "radius of convergence", A.sx(a), A.box.y + 18, { color: ROSE, size: 10.5, align: "center" }); }
      LW.path(ctx, xs, xs.map(F.f), A, { color: ORANGE, width: 3 });
      LW.path(ctx, xs, xs.map(T), A, { color: VIOLET, width: 2.2, dash: [7, 4] });
      LW.dot(ctx, A.sx(a), A.sy(F.f(a)), 6, BLUE, C.card, 2); ctx.restore();
      const names = ["constant", "straight line", "parabola", "cubic"]; const term = (k, v) => (Math.abs(v) < 1e-12 ? "" : (v < 0 ? " − " : " + ") + Math.abs(v).toPrecision(3) + (k === 0 ? "" : k === 1 ? "·u" : "·u" + ["", "", "²", "³", "⁴", "⁵"][k]));
      let poly = c.slice(0, 4).map((v, k) => term(k, v)).join("").replace(/^ \+ /, "").replace(/^ − /, "−"); if (N > 3) poly += " + …";
      S.set("poly", (poly || "0") + (N <= 3 ? "  (" + names[N] + ", u = x − a)" : "  (u = x − a)"));
      S.set("good", lo.toFixed(2) + " to " + hi.toFixed(2));
    }
    P.draw = draw; draw(); void play;
  });

  /* ---------------- 7. how small should h be? finite-difference error ---------------- */
  LW.register("fderr", function (root) {
    let single = false, h0 = 1e-5;
    const P = LW.canvas(root, { height: w => Math.min(360, Math.max(260, w * 0.46)) });
    const ctl = LW.controls(root);
    LW.check(ctl, { label: "Compute in single precision (float32), as on many GPUs", value: single, onChange: v => { single = v; draw(); } });
    const S = LW.stats(root, [["h", "step h"], ["fw", "forward-difference error"], ["ce", "central-difference error"]]);
    LW.note(root, "Drag across the plot to choose h. The derivative of sin x at x = 1 is cos 1 = 0.5403…; the plot shows how far each formula is from it. Large h: the formula's own approximation error dominates. Tiny h: subtracting two almost equal rounded numbers destroys the digits.");
    let A = null;
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const R = single ? Math.fround : (v => v), x = 1, ex = Math.cos(1);
      const fwd = h => { const hh = R(h); return Math.abs(R(R(R(Math.sin(R(x + hh))) - R(Math.sin(x))) / hh) - ex); };
      const cen = h => { const hh = R(h); return Math.abs(R(R(R(Math.sin(R(x + hh))) - R(Math.sin(R(x - hh)))) / R(2 * hh)) - ex); };
      const L = LW.linspace(-16, 0, 400), lg = v => Math.log10(Math.max(v, 1e-17));
      A = LW.axes(ctx, { x: 58, y: 14, w: W - 74, h: H - 54 }, { xr: [-16, 0], yr: [-17, 1], xlabel: "step size h (log scale)", ylabel: "error (log scale)", colors: C, xfmt: p10, yfmt: p10 });
      A.clip();
      LW.path(ctx, L, L.map(l => lg(fwd(Math.pow(10, l)))), A, { color: ORANGE, width: 1.8 });
      LW.path(ctx, L, L.map(l => lg(cen(Math.pow(10, l)))), A, { color: TEAL, width: 1.8 });
      ctx.strokeStyle = BLUE; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(A.sx(Math.log10(h0)), A.box.y); ctx.lineTo(A.sx(Math.log10(h0)), A.box.y + A.box.h); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      LW.text(ctx, "forward [f(x+h) − f(x)] / h", A.box.x + A.box.w - 8, A.box.y + 16, { color: ORANGE, size: 11, align: "right", weight: 600 });
      LW.text(ctx, "central [f(x+h) − f(x−h)] / 2h", A.box.x + A.box.w - 8, A.box.y + 32, { color: TEAL, size: 11, align: "right", weight: 600 });
      S.set("h", h0.toExponential(1)); S.set("fw", fwd(h0).toExponential(2)); S.set("ce", cen(h0).toExponential(2));
    }
    P.draw = draw;
    const set = q => { if (!A) return; h0 = Math.pow(10, LW.clamp(A.ix(q.x), -16, 0)); draw(); };
    LW.drag(P.cv, { down: set, move: set }); draw();
  });

  /* ---------------- 8. Riemann sums: area as many thin rectangles ---------------- */
  const IF = {
    speed: { name: "Speed of a car (m/s)", f: t => 12 * (1 - Math.exp(-t / 3)) * (t < 14 ? 1 : Math.max(0, 1 - (t - 14) / 4)), r: [0, 18], xl: "time t (s)", unit: "m travelled" },
    sq: { name: "x²", f: x => x * x, r: [0, 3], xl: "x", unit: "" },
    sin: { name: "sin x", f: Math.sin, r: [0, 2 * Math.PI], xl: "x", unit: "" },
    gauss: { name: "e^(−x²)", f: x => Math.exp(-x * x), r: [-3, 3], xl: "x", unit: "" }
  };
  function simpson(f, a, b, n = 2000) { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return s * h / 3; }
  LW.register("riemann", function (root) {
    let key = "speed", n = 6, rule = "left";
    const P = LW.canvas(root, { height: w => Math.min(360, Math.max(260, w * 0.46)) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Function", options: Object.keys(IF).map(k => [k, IF[k].name]), value: key, onChange: v => { key = v; draw(); } });
    LW.seg(ctl, { label: "Height of each strip", options: [["left", "Left edge"], ["right", "Right edge"], ["mid", "Midpoint"], ["trap", "Trapezoid"]], value: rule, onChange: v => { rule = v; draw(); } });
    const c2 = LW.controls(root);
    const ns = LW.slider(c2, { label: "Number of strips n", min: 1, max: 400, value: n, log: true, fmt: v => String(Math.round(v)), onInput: v => { n = Math.round(v); draw(); } });
    LW.button(c2, "Double n", () => { n = Math.min(400, n * 2); ns.set(n); draw(); }, { primary: true });
    const S = LW.stats(root, [["est", "sum of strips"], ["ex", "exact area"], ["err", "error"]]);
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P, F = IF[key]; ctx.clearRect(0, 0, W, H);
      const [a, b] = F.r, xs = LW.linspace(a, b, 500), ys = xs.map(F.f), yr = range(ys.concat([0]), 0.1);
      const A = LW.axes(ctx, { x: 52, y: 14, w: W - 66, h: H - 52 }, { xr: [a, b], yr, xlabel: F.xl, ylabel: "f", colors: C });
      A.clip(); const dx = (b - a) / n; let sum = 0;
      for (let i = 0; i < n; i++) { const x0 = a + i * dx, x1 = x0 + dx; let hgt;
        if (rule === "left") hgt = F.f(x0); else if (rule === "right") hgt = F.f(x1); else if (rule === "mid") hgt = F.f((x0 + x1) / 2); else hgt = (F.f(x0) + F.f(x1)) / 2;
        sum += hgt * dx; const pos = rule === "trap" ? (F.f(x0) + F.f(x1)) >= 0 : hgt >= 0;
        ctx.fillStyle = rgba(pos ? GOLD : ROSE, 0.32); ctx.strokeStyle = rgba(pos ? GOLD : ROSE, 0.9); ctx.lineWidth = n > 120 ? 0.3 : 1;
        ctx.beginPath(); if (rule === "trap") { ctx.moveTo(A.sx(x0), A.sy(0)); ctx.lineTo(A.sx(x0), A.sy(F.f(x0))); ctx.lineTo(A.sx(x1), A.sy(F.f(x1))); ctx.lineTo(A.sx(x1), A.sy(0)); } else ctx.rect(A.sx(x0), A.sy(Math.max(0, hgt)), A.sx(x1) - A.sx(x0), Math.abs(A.sy(hgt) - A.sy(0))); ctx.closePath(); ctx.fill(); if (n <= 120) ctx.stroke(); }
      ctx.strokeStyle = C.ink3; ctx.beginPath(); ctx.moveTo(A.box.x, A.sy(0)); ctx.lineTo(A.box.x + A.box.w, A.sy(0)); ctx.stroke();
      LW.path(ctx, xs, ys, A, { color: ORANGE, width: 2.6 }); ctx.restore();
      const ex = simpson(F.f, a, b); S.set("est", f3(sum) + (F.unit ? " " + F.unit : "")); S.set("ex", f3(ex)); S.set("err", f3(sum - ex));
    }
    P.draw = draw; draw();
  });

  /* ---------------- 9. accumulation: the integral as a function, and its slope ---------------- */
  const AF = {
    wave: { name: "sin x", f: Math.sin, r: [0, 4 * Math.PI], xl: "x" },
    force: { name: "Force of a spring, F = −kx", f: x => -2 * x, r: [-2, 2], xl: "position x", say: "accumulated work W(x) = −(potential energy change)" },
    rate: { name: "Rate of a reaction (slowing down)", f: t => 3 * Math.exp(-t / 2), r: [0, 10], xl: "time t", say: "product formed so far" },
    tri: { name: "x − 1", f: x => x - 1, r: [0, 3], xl: "x" }
  };
  LW.register("accum", function (root) {
    let key = "wave", x = 2;
    const P = LW.canvas(root, { height: w => (w < 640 ? 520 : 460) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Rate f", options: Object.keys(AF).map(k => [k, AF[k].name]), value: key, onChange: v => { key = v; const r = AF[v].r; x = r[0] + (r[1] - r[0]) * 0.5; draw(); } });
    const play = LW.button(ctl, "Sweep", () => { sw = AF[key].r[0]; loop.start(); }, { primary: true });
    const S = LW.stats(root, [["x", "upper limit x"], ["F", "accumulated A(x) = ∫ f"], ["f", "f(x)"], ["s", "slope of A at x"]]);
    let A1, A2, sw = null;
    const loop = LW.loop(root, dt => { if (sw == null) return loop.stop(); const r = AF[key].r; sw += dt * (r[1] - r[0]) / 5; if (sw >= r[1]) { sw = null; loop.stop(); } else x = sw; draw(); });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P, F = AF[key]; ctx.clearRect(0, 0, W, H);
      const [a, b] = F.r, xs = LW.linspace(a, b, 500), ys = xs.map(F.f), hh = (H - 92) / 2;
      const acc = [0]; for (let i = 1; i < xs.length; i++) acc.push(acc[i - 1] + (ys[i] + ys[i - 1]) / 2 * (xs[i] - xs[i - 1]));
      const Ax = t => { let s = 0; const m = 400, h = (t - a) / m; for (let i = 0; i < m; i++) s += F.f(a + (i + 0.5) * h) * h; return s; };
      A1 = LW.axes(ctx, { x: 52, y: 22, w: W - 66, h: hh }, { xr: [a, b], yr: range(ys.concat([0])), ylabel: "f", colors: C, xlabels: false, title: "the rate f: shaded area from the start up to x" });
      A1.clip(); const sub = xs.filter(t => t <= x);
      LW.band(ctx, sub, sub.map(() => 0), sub.map(t => Math.max(0, F.f(t))), A1, rgba(GOLD, 0.35)); LW.band(ctx, sub, sub.map(t => Math.min(0, F.f(t))), sub.map(() => 0), A1, rgba(ROSE, 0.3));
      ctx.strokeStyle = C.ink3; ctx.beginPath(); ctx.moveTo(A1.box.x, A1.sy(0)); ctx.lineTo(A1.box.x + A1.box.w, A1.sy(0)); ctx.stroke();
      LW.path(ctx, xs, ys, A1, { color: ORANGE, width: 2.6 }); LW.dot(ctx, A1.sx(x), A1.sy(F.f(x)), 6, BLUE, C.card, 2); ctx.restore();
      A2 = LW.axes(ctx, { x: 52, y: 22 + hh + 34, w: W - 66, h: hh }, { xr: [a, b], yr: range(acc.concat([0])), xlabel: F.xl, ylabel: "A(x)", colors: C, title: F.say ? "A(x): " + F.say : "A(x): the area accumulated so far" });
      A2.clip(); ctx.strokeStyle = C.ink3; ctx.beginPath(); ctx.moveTo(A2.box.x, A2.sy(0)); ctx.lineTo(A2.box.x + A2.box.w, A2.sy(0)); ctx.stroke();
      LW.path(ctx, xs, acc, A2, { color: GOLD, width: 1.4, alpha: 0.35 });
      LW.path(ctx, xs, xs.map((t, i) => (t <= x ? acc[i] : NaN)), A2, { color: GOLD, width: 2.8 });
      const Av = Ax(x), sl = F.f(x), sp = (b - a) * 0.12; LW.path(ctx, [x - sp, x + sp], [Av - sl * sp, Av + sl * sp], A2, { color: TEAL, width: 2.2 });
      LW.dot(ctx, A2.sx(x), A2.sy(Av), 6, GOLD, C.card, 2); ctx.restore();
      S.set("x", f3(x)); S.set("F", f3(Av)); S.set("f", f3(sl)); S.set("s", f3((Ax(x + 1e-3) - Ax(x - 1e-3)) / 2e-3));
    }
    P.draw = draw;
    const set = q => { const ax = q.y > A1.box.y + A1.box.h + 20 ? A2 : A1; x = LW.clamp(ax.ix(q.x), AF[key].r[0], AF[key].r[1]); draw(); };
    LW.drag(P.cv, { down: set, move: set }); draw(); void play;
  });

  /* ---------------- 10. Monte Carlo integration: throwing darts at π ---------------- */
  LW.register("mcint", function (root) {
    let pts = [], hits = 0, hist = [], seed = 1, r = LW.rng(1);
    const P = LW.canvas(root, { height: w => (w < 640 ? 640 : 340) });
    const ctl = LW.controls(root);
    const runB = LW.button(ctl, "Throw continuously", () => { runB.textContent = loop.toggle() ? "Pause" : "Throw continuously"; }, { primary: true });
    LW.button(ctl, "Throw 100", () => { throwN(100); draw(); });
    LW.button(ctl, "Throw 10 000", () => { throwN(10000); draw(); });
    LW.button(ctl, "Start again", () => { seed++; r = LW.rng(seed); pts = []; hits = 0; hist = []; draw(); });
    const S = LW.stats(root, [["n", "darts thrown N"], ["h", "inside the quarter circle"], ["pi", "estimate 4 × inside / N"], ["e", "error"], ["sd", "expected error ≈ 1.64/√N"]]);
    let total = 0;
    function throwN(k) { for (let i = 0; i < k; i++) { const x = r(), y = r(), inside = x * x + y * y <= 1; if (inside) hits++; total++; if (pts.length < 6000) pts.push([x, y, inside]); const lg = Math.log10(total); if (!hist.length || lg - hist[hist.length - 1][0] > 0.01) hist.push([lg, Math.abs(4 * hits / total - Math.PI)]); } }
    const loop = LW.loop(root, () => { throwN(Math.max(5, Math.round(total * 0.02))); draw(); if (total > 2e6) { loop.stop(); runB.textContent = "Throw continuously"; } });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const narrow = W < 640, s = narrow ? Math.min(W - 40, 300) : Math.min(H - 30, W * 0.42), ox = narrow ? (W - s) / 2 : 20, oy = 12;
      ctx.fillStyle = C.bg2; ctx.fillRect(ox, oy, s, s); ctx.strokeStyle = C.line2; ctx.strokeRect(ox + 0.5, oy + 0.5, s, s);
      ctx.fillStyle = rgba(GOLD, 0.1); ctx.beginPath(); ctx.moveTo(ox, oy + s); ctx.arc(ox, oy + s, s, -Math.PI / 2, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ox, oy + s, s, -Math.PI / 2, 0); ctx.stroke();
      pts.forEach(p => { ctx.fillStyle = p[2] ? TEAL : ROSE; ctx.fillRect(ox + p[0] * s - 1, oy + (1 - p[1]) * s - 1, 2, 2); });
      const gx = narrow ? 58 : ox + s + 70, gy = narrow ? oy + s + 30 : 14, gw = narrow ? W - 72 : W - gx - 14, gh = narrow ? H - gy - 42 : H - 54;
      const A = LW.axes(ctx, { x: gx, y: gy, w: gw, h: gh }, { xr: [0, 6.5], yr: [-5, 0.5], xlabel: "darts thrown N (log scale)", ylabel: "error (log)", colors: C, xfmt: p10, yfmt: p10 });
      A.clip(); LW.path(ctx, [0, 6.5], [Math.log10(1.64), Math.log10(1.64) - 3.25], A, { color: VIOLET, width: 1.6, dash: [6, 4] });
      LW.path(ctx, hist.map(h => h[0]), hist.map(h => Math.log10(Math.max(h[1], 1e-6))), A, { color: ROSE, width: 1.6 }); ctx.restore();
      LW.text(ctx, "dashed: 1/√N", A.box.x + A.box.w - 6, A.box.y + 14, { color: VIOLET, size: 11, align: "right" });
      const est = total ? 4 * hits / total : NaN; S.set("n", total.toLocaleString()); S.set("h", hits.toLocaleString()); S.set("pi", total ? est.toFixed(5) : "–"); S.set("e", total ? f3(est - Math.PI) : "–"); S.set("sd", total ? f3(1.642 / Math.sqrt(total)) : "–");
    }
    P.draw = draw; throwN(300); draw();
  });
})();
