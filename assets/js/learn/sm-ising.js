/* Phase transitions: the 2D Ising model by Metropolis Monte Carlo (with the user building the
   magnetisation curve against Onsager's exact result), mean-field theory solved graphically,
   and Landau free-energy curves. Units: J = k_B = 1. */
(function () {
  "use strict";
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const TC = 2 / Math.log(1 + Math.SQRT2);
  const onsager = T => (T < TC ? Math.pow(1 - Math.pow(Math.sinh(2 / T), -4), 1 / 8) : 0);
  LW.register("ising", function (root) {
    let L = 64, T = 2.0, h = 0, s, r = LW.rng(11), sweeps = 0, hist = [], acc = { n: 0, m: 0, m2: 0, e: 0, e2: 0 }, pts = [];
    const P = LW.canvas(root, { height: w => (w < 640 ? 640 : 380) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Temperature k<sub>B</sub>T / J", min: 1, max: 4, step: 0.01, value: T, fmt: v => v.toFixed(2) + (Math.abs(v - TC) < 0.03 ? " ≈ T_c" : ""), onInput: v => { T = v; resetAcc(); } });
    LW.slider(ctl, { label: "External field h / J", min: -0.3, max: 0.3, step: 0.005, value: h, fmt: v => v.toFixed(3), onInput: v => { h = v; resetAcc(); } });
    const c2 = LW.controls(root);
    LW.seg(c2, { label: "Lattice", options: [["32", "32 × 32"], ["64", "64 × 64"], ["128", "128 × 128"]], value: String(L), onChange: v => { L = +v; init(true); } });
    LW.button(c2, "Random spins (quench)", () => init(true)); LW.button(c2, "All spins up", () => init(false));
    LW.button(c2, "Record this temperature", () => { if (acc.n > 20) { pts.push([T, acc.m / acc.n, L]); draw(); } }, { primary: true });
    LW.button(c2, "Clear the points", () => { pts = []; draw(); });
    const S = LW.stats(root, [["m", "magnetisation per spin m"], ["am", "⟨|m|⟩ (this T)"], ["ex", "Onsager exact (L → ∞)"], ["chi", "susceptibility χ = N(⟨m²⟩ − ⟨|m|⟩²)/T"], ["c", "heat capacity per spin from ⟨δE²⟩"]]);
    LW.note(root, "Each frame performs Metropolis sweeps: every spin is offered a flip, accepted with probability min(1, e^(−ΔE/kT)). Settle at a temperature, then press <b>Record</b> to add a point to the curve on the right.");
    function init(random) { s = new Int8Array(L * L); for (let i = 0; i < L * L; i++) s[i] = random ? (r() < 0.5 ? 1 : -1) : 1; sweeps = 0; hist = []; resetAcc(); }
    function resetAcc() { acc = { n: 0, m: 0, m2: 0, e: 0, e2: 0, skip: 30 }; }
    function sweep() { const N = L * L; for (let k = 0; k < N; k++) { const i = (r() * N) | 0, x = i % L, y = (i / L) | 0, nb = s[y * L + (x + 1) % L] + s[y * L + (x + L - 1) % L] + s[((y + 1) % L) * L + x] + s[((y + L - 1) % L) * L + x], dE = 2 * s[i] * (nb + h); if (dE <= 0 || r() < Math.exp(-dE / T)) s[i] = -s[i]; } sweeps++; }
    function measure() { let M = 0, E = 0; for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) { const v = s[y * L + x]; M += v; E -= v * (s[y * L + (x + 1) % L] + s[((y + 1) % L) * L + x]) + h * v; } return [M / (L * L), E / (L * L)]; }
    const loop = LW.loop(root, () => { const n = L <= 32 ? 6 : L <= 64 ? 3 : 1; for (let k = 0; k < n; k++) sweep(); const [m, e] = measure(); hist.push(m); if (hist.length > 300) hist.shift(); if (acc.skip > 0) acc.skip--; else { acc.n++; acc.m += Math.abs(m); acc.m2 += m * m; acc.e += e; acc.e2 += e * e; } draw(m); });
    let img = null;
    function draw(mNow) {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640;
      const side = narrow ? Math.min(W - 20, 300) : Math.min(H - 20, W * 0.4), ox = narrow ? (W - side) / 2 : 10, oy = 10;
      if (!img || img.width !== L) { img = document.createElement("canvas"); img.width = img.height = L; }
      const ic = img.getContext("2d"), id = ic.createImageData(L, L), up = C.dark ? [135, 150, 255] : [59, 80, 224], dn = C.dark ? [255, 178, 107] : [240, 140, 46];
      for (let i = 0; i < L * L; i++) { const c = s[i] > 0 ? up : dn; id.data[4 * i] = c[0]; id.data[4 * i + 1] = c[1]; id.data[4 * i + 2] = c[2]; id.data[4 * i + 3] = 255; }
      ic.putImageData(id, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(img, ox, oy, side, side);
      // right: m(t) and the recorded curve against Onsager
      const gx = narrow ? 50 : ox + side + 60, gw = narrow ? W - 64 : W - gx - 14, g1y = narrow ? oy + side + 30 : 22, g1h = narrow ? 110 : (H - 100) * 0.38, g2y = g1y + g1h + 44, g2h = narrow ? H - g2y - 40 : H - g2y - 36;
      const A = LW.axes(ctx, { x: gx, y: g1y, w: gw, h: g1h }, { xr: [0, 300], yr: [-1.05, 1.05], ylabel: "m", colors: C, xlabels: false, ny: 3, title: "magnetisation per spin over the last 300 frames" });
      A.clip(); LW.path(ctx, [0, 300], [0, 0], A, { color: C.line2, width: 1 }); LW.path(ctx, hist.map((_, i) => i), hist, A, { color: VIOLET, width: 1.8 }); ctx.restore();
      const B = LW.axes(ctx, { x: gx, y: g2y, w: gw, h: g2h }, { xr: [1, 4], yr: [0, 1.05], xlabel: "temperature k_BT / J", ylabel: "⟨|m|⟩", colors: C, ny: 3, title: "your measurements against Onsager's exact solution (line)" });
      B.clip(); const ts = LW.linspace(1, 4, 300); LW.path(ctx, ts, ts.map(onsager), B, { color: GOLD, width: 2.2 });
      ctx.strokeStyle = ROSE; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(B.sx(TC), B.box.y); ctx.lineTo(B.sx(TC), B.box.y + B.box.h); ctx.stroke(); ctx.setLineDash([]);
      pts.forEach(([t, m, l]) => LW.dot(ctx, B.sx(t), B.sy(m), l === 128 ? 6 : l === 64 ? 5 : 4, l === 128 ? TEAL : l === 64 ? BLUE : ORANGE, C.card, 1.5));
      ctx.strokeStyle = C.ink3; ctx.beginPath(); ctx.moveTo(B.sx(T), B.box.y + B.box.h); ctx.lineTo(B.sx(T), B.box.y + B.box.h - 8); ctx.stroke(); ctx.restore();
      LW.text(ctx, "T_c = 2.269", B.sx(TC) + 4, B.box.y + 12, { color: ROSE, size: 10.5, weight: 600 });
      const N = L * L, n = acc.n || 1, am = acc.m / n, chi = N * (acc.m2 / n - am * am) / T, c = N * (acc.e2 / n - (acc.e / n) ** 2) / (T * T);
      S.set("m", mNow != null ? mNow.toFixed(3) : "–"); S.set("am", acc.n ? am.toFixed(3) : "settling…"); S.set("ex", onsager(T).toFixed(3)); S.set("chi", acc.n > 20 ? chi.toFixed(2) : "–"); S.set("c", acc.n > 20 ? c.toFixed(2) : "–");
    }
    P.draw = () => draw(); init(true); loop.start();
  });

  /* ---------------- mean-field theory solved graphically ---------------- */
  LW.register("meanfield", function (root) {
    let T = 3.0, h = 0, z = 4;
    const P = LW.canvas(root, { height: w => Math.min(380, Math.max(280, w * 0.5)) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Temperature k<sub>B</sub>T / J", min: 0.5, max: 7, step: 0.01, value: T, fmt: v => v.toFixed(2), onInput: v => { T = v; draw(); } });
    LW.slider(ctl, { label: "Field h / J", min: -1, max: 1, step: 0.01, value: h, fmt: v => v.toFixed(2), onInput: v => { h = v; draw(); } });
    LW.seg(ctl, { label: "Neighbours z", options: [["2", "2 (chain)"], ["4", "4 (square)"], ["6", "6 (cubic)"]], value: "4", onChange: v => { z = +v; draw(); } });
    const S = LW.stats(root, [["tc", "mean-field T_c = zJ/k_B"], ["sol", "self-consistent solutions m"], ["state", "state"]]);
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const A = LW.axes(ctx, { x: 52, y: 16, w: W - 66, h: H - 54 }, { xr: [-1.3, 1.3], yr: [-1.15, 1.15], xlabel: "trial magnetisation m", ylabel: "value", colors: C });
      const ms = LW.linspace(-1.3, 1.3, 400), f = m => Math.tanh((z * m + h) / T);
      A.clip(); LW.path(ctx, ms, ms, A, { color: BLUE, width: 2.2 }); LW.path(ctx, ms, ms.map(f), A, { color: ORANGE, width: 2.6 });
      const sols = []; for (let i = 1; i < ms.length; i++) { const a = f(ms[i - 1]) - ms[i - 1], b = f(ms[i]) - ms[i]; if (a === 0 || a * b < 0) { let lo = ms[i - 1], hi = ms[i]; for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if ((f(lo) - lo) * (f(mid) - mid) <= 0) hi = mid; else lo = mid; } const m = (lo + hi) / 2, slope = (f(m + 1e-5) - f(m - 1e-5)) / 2e-5; sols.push([m, slope < 1]); } }
      sols.forEach(([m, stable]) => LW.dot(ctx, A.sx(m), A.sy(m), 7, stable ? TEAL : C.card, stable ? TEAL : ROSE, 2.2)); ctx.restore();
      LW.text(ctx, "blue: m    orange: tanh((zJm + h)/kT)    filled: stable solution    open: unstable", A.box.x + 8, A.box.y + 14, { color: C.ink3, size: 10.5 });
      S.set("tc", (z).toFixed(1) + (z === 4 ? "  (exact 2D value: 2.269)" : "")); S.set("sol", sols.map(([m, st]) => m.toFixed(3) + (st ? "" : " (unstable)")).join(",  "));
      S.set("state", T < z && Math.abs(h) < 1e-9 ? "ordered: spontaneous magnetisation" : T < z ? "ordered, aligned with the field" : Math.abs(h) < 1e-9 ? "disordered: m = 0" : "paramagnet, induced m");
    }
    P.draw = draw; draw();
  });

  /* ---------------- Landau free energy ---------------- */
  LW.register("landau", function (root) {
    let t = 0.5, h = 0, order = "second";
    const P = LW.canvas(root, { height: w => Math.min(360, Math.max(260, w * 0.46)) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Transition", options: [["second", "Continuous (second order)"], ["first", "Discontinuous (first order)"]], value: order, onChange: v => { order = v; draw(); } });
    LW.slider(ctl, { label: "Reduced temperature (T − T_c)/T_c", min: -1, max: 1, step: 0.01, value: t, fmt: v => v.toFixed(2), onInput: v => { t = v; draw(); } });
    LW.slider(ctl, { label: "Field h", min: -0.3, max: 0.3, step: 0.005, value: h, fmt: v => v.toFixed(3), onInput: v => { h = v; draw(); } });
    const S = LW.stats(root, [["eq", "free energy F(m)"], ["min", "equilibrium order parameter"], ["kind", "what is happening"]]);
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const F = order === "second" ? m => t * m * m + 0.5 * m ** 4 - h * m : m => (t + 0.3) * m * m - 1.0 * m ** 4 + 0.75 * m ** 6 - h * m;
      const ms = LW.linspace(-1.5, 1.5, 400), fs = ms.map(F), lo = Math.min(...fs), A = LW.axes(ctx, { x: 52, y: 16, w: W - 66, h: H - 54 }, { xr: [-1.5, 1.5], yr: [lo - 0.08, Math.min(lo + 1.2, Math.max(...fs))], xlabel: "order parameter m", ylabel: "F(m)", colors: C });
      A.clip(); LW.path(ctx, ms, fs, A, { color: VIOLET, width: 2.6 });
      let best = 0; fs.forEach((f, i) => { if (f < fs[best]) best = i; }); const locs = []; for (let i = 1; i < ms.length - 1; i++) if (fs[i] < fs[i - 1] && fs[i] <= fs[i + 1]) locs.push(i);
      locs.forEach(i => LW.dot(ctx, A.sx(ms[i]), A.sy(fs[i]), i === best ? 7 : 5, i === best ? TEAL : C.card, i === best ? TEAL : ORANGE, 2)); ctx.restore();
      S.set("eq", order === "second" ? "a t m² + b m⁴ − h m" : "a (t + 0.3) m² − b m⁴ + c m⁶ − h m"); S.set("min", "m = " + ms[best].toFixed(3) + (locs.length > 1 ? "  (+ " + (locs.length - 1) + " metastable minimum" + (locs.length > 2 ? "a" : "") + ")" : ""));
      S.set("kind", order === "second" ? (t > 0 ? "single minimum at m = 0: disordered" : "minimum splits continuously into ±m: ordered") : (locs.length > 1 ? "coexisting minima: the order parameter jumps when they cross (hysteresis possible)" : Math.abs(ms[best]) < 0.05 ? "disordered" : "ordered"));
    }
    P.draw = draw; draw();
  });
})();
