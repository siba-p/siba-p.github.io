/* Rare events: minimum energy paths on the Müller–Brown surface (elastic band, NEB, climbing-image NEB,
   string method), the choice of collective variable, and rates measured from Langevin dynamics against
   transition-state and Kramers theory. */
(function () {
  "use strict";
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const MA = [-200, -100, -170, 15], Ma = [-1, -1, -6.5, 0.7], Mb = [0, 0, 11, 0.6], Mc = [-10, -10, -6.5, 0.7], MX = [1, 0, -0.5, -1], MY = [0, 0.5, 1.5, 1];
  const MB = (x, y) => { let v = 0; for (let k = 0; k < 4; k++) { const dx = x - MX[k], dy = y - MY[k]; v += MA[k] * Math.exp(Ma[k] * dx * dx + Mb[k] * dx * dy + Mc[k] * dy * dy); } return v; };
  const MBg = (x, y) => { let gx = 0, gy = 0; for (let k = 0; k < 4; k++) { const dx = x - MX[k], dy = y - MY[k], e = MA[k] * Math.exp(Ma[k] * dx * dx + Mb[k] * dx * dy + Mc[k] * dy * dy); gx += e * (2 * Ma[k] * dx + Mb[k] * dy); gy += e * (Mb[k] * dx + 2 * Mc[k] * dy); } return [gx, gy]; };
  const SAD = [[-0.822, 0.6243, -40.665], [0.2125, 0.293, -72.249]], MINS = [[-0.5582, 1.4417, -146.7], [0.6235, 0.028, -108.167], [-0.05, 0.4667, -80.768]];
  // shared heat map painter
  function heat(ctx, C, V, f, xr, yr, cap) { const W = V.W, H = V.H, st = 3, cw = Math.ceil(W / st), ch = Math.ceil(H / st), vals = new Float64Array(cw * ch); let lo = Infinity;
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const v = f(V.ix(i * st), V.iy(j * st)); vals[j * cw + i] = v; if (v < lo) lo = v; }
    const off = document.createElement("canvas"); off.width = cw; off.height = ch; const oc = off.getContext("2d"), id = oc.createImageData(cw, ch), lev = (cap - lo) / 15;
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const v = Math.min(vals[j * cw + i], cap), t = (v - lo) / (cap - lo), col = LW.ramp(0.08 + 0.85 * Math.sqrt(t), C).match(/\d+/g).map(Number), band = Math.floor((v - lo) / lev);
      const edge = (i + 1 < cw && Math.floor((Math.min(vals[j * cw + i + 1], cap) - lo) / lev) !== band) || (j + 1 < ch && Math.floor((Math.min(vals[(j + 1) * cw + i], cap) - lo) / lev) !== band), dk = edge ? (C.dark ? 1.5 : 0.72) : 1, o = 4 * (j * cw + i);
      id.data[o] = Math.min(255, col[0] * dk); id.data[o + 1] = Math.min(255, col[1] * dk); id.data[o + 2] = Math.min(255, col[2] * dk); id.data[o + 3] = 255; }
    oc.putImageData(id, 0, 0); return off; }

  /* ---------------- 1. minimum energy paths ---------------- */
  LW.register("neb", function (root) {
    let method = "cineb", N = 14, k = 60, path, iter = 0, img = null, imgKey = "";
    const P = LW.canvas(root, { height: w => (w < 640 ? 640 : 420) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Method", options: [["band", "Plain elastic band"], ["neb", "Nudged elastic band"], ["cineb", "Climbing-image NEB"], ["string", "String method"]], value: method, onChange: v => { method = v; init(); } });
    const c2 = LW.controls(root);
    LW.slider(c2, { label: "Images", min: 6, max: 30, step: 1, value: N, fmt: v => String(v), onInput: v => { N = v; init(); } });
    LW.slider(c2, { label: "Spring constant", min: 5, max: 400, step: 5, value: k, fmt: v => String(v), onInput: v => { k = v; } });
    const runB = LW.button(c2, "Relax the path", () => { runB.textContent = loop.toggle() ? "Pause" : "Relax the path"; }, { primary: true });
    LW.button(c2, "Straight-line start", () => init());
    const S = LW.stats(root, [["it", "iterations"], ["bar", "highest image above state A"], ["ex", "exact barrier (saddle at −40.67)"], ["fmax", "largest perpendicular force"]]);
    function init() { const A = MINS[0], B = MINS[1]; path = Array.from({ length: N }, (_, i) => { const t = i / (N - 1); return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]; }); iter = 0; draw(); }
    function tangents() { return path.map((p, i) => { if (i === 0 || i === N - 1) return [0, 0]; const ep = MB(...path[i + 1]), e0 = MB(...p), em = MB(...path[i - 1]); let t;
      const tp = [path[i + 1][0] - p[0], path[i + 1][1] - p[1]], tm = [p[0] - path[i - 1][0], p[1] - path[i - 1][1]];
      if (ep > e0 && e0 > em) t = tp; else if (ep < e0 && e0 < em) t = tm; else { const dmax = Math.max(Math.abs(ep - e0), Math.abs(em - e0)), dmin = Math.min(Math.abs(ep - e0), Math.abs(em - e0)); t = ep > em ? [tp[0] * dmax + tm[0] * dmin, tp[1] * dmax + tm[1] * dmin] : [tp[0] * dmin + tm[0] * dmax, tp[1] * dmin + tm[1] * dmax]; }
      const n = Math.hypot(...t) || 1; return [t[0] / n, t[1] / n]; }); }
    let fmaxLast = 0;
    function iterate(n) {
      for (let q = 0; q < n; q++) {
        const T = tangents(), E = path.map(p => MB(...p)); let imax = 1; for (let i = 1; i < N - 1; i++) if (E[i] > E[imax]) imax = i;
        const Fs = path.map((p, i) => { if (i === 0 || i === N - 1) return [0, 0]; const g = MBg(...p), F = [-g[0], -g[1]], t = T[i], fpar = F[0] * t[0] + F[1] * t[1];
          if (method === "band") { const s = [k * (path[i + 1][0] - 2 * p[0] + path[i - 1][0]), k * (path[i + 1][1] - 2 * p[1] + path[i - 1][1])]; return [F[0] + s[0], F[1] + s[1]]; }
          if (method === "string") return [F[0] - fpar * t[0], F[1] - fpar * t[1]];
          const perp = [F[0] - fpar * t[0], F[1] - fpar * t[1]];
          if (method === "cineb" && i === imax && iter > 150) return [F[0] - 2 * fpar * t[0], F[1] - 2 * fpar * t[1]];
          const dp = Math.hypot(path[i + 1][0] - p[0], path[i + 1][1] - p[1]), dm = Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]), sp = k * (dp - dm);
          return [perp[0] + sp * t[0], perp[1] + sp * t[1]]; });
        fmaxLast = 0; path = path.map((p, i) => { const f = Fs[i], fn = Math.hypot(...f); fmaxLast = Math.max(fmaxLast, i === imax && method === "cineb" ? fn : fn); const s = Math.min(2e-4 * fn, 0.01) / (fn || 1); return [p[0] + f[0] * s, p[1] + f[1] * s]; });
        if (method === "string") { // redistribute images at equal arc length along the current curve
          const L = [0]; for (let i = 1; i < N; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])); const tot = L[N - 1], np2 = [path[0]];
          for (let i = 1; i < N - 1; i++) { const target = tot * i / (N - 1); let j = 1; while (L[j] < target) j++; const f = (target - L[j - 1]) / (L[j] - L[j - 1]); np2.push([path[j - 1][0] + f * (path[j][0] - path[j - 1][0]), path[j - 1][1] + f * (path[j][1] - path[j - 1][1])]); }
          np2.push(path[N - 1]); path = np2; }
        iter++;
      }
    }
    const loop = LW.loop(root, () => { iterate(25); draw(); if (iter > 4000) { loop.stop(); runB.textContent = "Relax the path"; } });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640, mw = narrow ? W : W * 0.6, mh = narrow ? 380 : H;
      const xr = [-1.5, 1.2], yr = [-0.4, 2.0], sx = mw / (xr[1] - xr[0]), sy = mh / (yr[1] - yr[0]);
      const V = { W: mw, H: mh, X: x => (x - xr[0]) * sx, Y: y => mh - (y - yr[0]) * sy, ix: px => xr[0] + px / sx, iy: py => yr[0] + (mh - py) / sy };
      const key = mw + "x" + mh + C.dark; if (imgKey !== key) { img = heat(ctx, C, V, MB, xr, yr, 60); imgKey = key; } ctx.drawImage(img, 0, 0, Math.ceil(mw / 3) * 3, Math.ceil(mh / 3) * 3);
      MINS.forEach(m => LW.dot(ctx, V.X(m[0]), V.Y(m[1]), 5, TEAL, "#fff", 1.5)); SAD.forEach(m => { ctx.fillStyle = GOLD; ctx.save(); ctx.translate(V.X(m[0]), V.Y(m[1])); ctx.rotate(Math.PI / 4); ctx.fillRect(-5, -5, 10, 10); ctx.restore(); });
      ctx.strokeStyle = ORANGE; ctx.lineWidth = 2.4; ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(V.X(p[0]), V.Y(p[1])) : ctx.moveTo(V.X(p[0]), V.Y(p[1])))); ctx.stroke();
      const E = path.map(p => MB(...p)); let imax = 0; E.forEach((e, i) => { if (e > E[imax]) imax = i; });
      path.forEach((p, i) => LW.dot(ctx, V.X(p[0]), V.Y(p[1]), i === imax ? 7 : 5, i === imax ? ROSE : ORANGE, "#fff", 1.5));
      LW.text(ctx, "A", V.X(MINS[0][0]) - 16, V.Y(MINS[0][1]) + 4, { color: "#fff", size: 13, weight: 700 }); LW.text(ctx, "B", V.X(MINS[1][0]) + 8, V.Y(MINS[1][1]) + 4, { color: "#fff", size: 13, weight: 700 });
      // energy profile
      const gx = narrow ? 50 : mw + 54, gy = narrow ? mh + 30 : 26, gw = narrow ? W - 64 : W - mw - 66, gh = narrow ? H - gy - 40 : H - 66;
      const sArc = [0]; for (let i = 1; i < N; i++) sArc.push(sArc[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
      const A = LW.axes(ctx, { x: gx, y: gy, w: gw, h: gh }, { xr: [0, sArc[N - 1]], yr: [-160, 0], xlabel: "distance along the path", ylabel: "energy", colors: C, title: "energy of each image along the path", ny: 4 });
      A.clip(); LW.path(ctx, [0, sArc[N - 1]], [SAD[0][2], SAD[0][2]], A, { color: GOLD, width: 1.2, dash: [4, 4] }); LW.path(ctx, sArc, E, A, { color: ORANGE, width: 2 }); sArc.forEach((s, i) => LW.dot(ctx, A.sx(s), A.sy(E[i]), i === imax ? 5.5 : 4, i === imax ? ROSE : ORANGE, C.card, 1.2)); ctx.restore();
      LW.text(ctx, "gold: exact saddle", A.box.x + A.box.w - 4, A.sy(SAD[0][2]) - 5, { color: GOLD, size: 10, align: "right" });
      S.set("it", String(iter)); S.set("bar", (E[imax] - MINS[0][2]).toFixed(2)); S.set("ex", (SAD[0][2] - MINS[0][2]).toFixed(2)); S.set("fmax", fmaxLast.toFixed(1));
    }
    P.draw = draw; init();
  });

  /* ---------------- 2. what a collective variable hides ---------------- */
  LW.register("cvchoice", function (root) {
    let th = 0.61, kT = 1;
    const phi0 = 0.61, U = (x, y) => { const u = x * Math.cos(phi0) + y * Math.sin(phi0), w = -x * Math.sin(phi0) + y * Math.cos(phi0); return 3 * (u * u - 1.2) ** 2 + 2.5 * w * w + 0.6 * u; };
    const P = LW.canvas(root, { height: w => (w < 640 ? 640 : 380) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Direction of the collective variable s", min: 0, max: 3.14, step: 0.01, value: th, fmt: v => Math.round(v * 180 / Math.PI) + "°", onInput: v => { th = v; draw(); } });
    const S = LW.stats(root, [["bar", "apparent barrier in F(s)"], ["true", "true barrier (along the best direction)"], ["ov", "overlap of the two states in s"]]);
    let img = null, key = "";
    function prof(t) { const ss = LW.linspace(-2.6, 2.6, 120), FA = [], FB = [], Ft = []; ss.forEach(s => { let pa = 0, pb = 0; for (let q = -3; q <= 3; q += 0.04) { const x = s * Math.cos(t) - q * Math.sin(t), y = s * Math.sin(t) + q * Math.cos(t), p = Math.exp(-U(x, y) / kT), u = x * Math.cos(phi0) + y * Math.sin(phi0); if (u < 0) pa += p; else pb += p; } FA.push(pa); FB.push(pb); Ft.push(-kT * Math.log(pa + pb + 1e-300)); }); return { ss, FA, FB, Ft }; }
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640, mw = narrow ? W : W * 0.45, mh = narrow ? 300 : H, R = 2.6, sc = Math.min(mw, mh) / (2 * R), cx = mw / 2, cy = mh / 2;
      const V = { W: mw, H: mh, X: x => cx + x * sc, Y: y => cy - y * sc, ix: px => (px - cx) / sc, iy: py => (cy - py) / sc };
      const k2 = mw + "x" + mh + C.dark; if (key !== k2) { img = heat(ctx, C, V, U, [-R, R], [-R, R], 12); key = k2; } ctx.drawImage(img, 0, 0, Math.ceil(mw / 3) * 3, Math.ceil(mh / 3) * 3);
      ctx.strokeStyle = rgba(VIOLET, 0.35); ctx.lineWidth = 1; for (let s = -2.5; s <= 2.5; s += 0.5) { const px = s * Math.cos(th), py = s * Math.sin(th), L = 4; ctx.beginPath(); ctx.moveTo(V.X(px + L * Math.sin(th)), V.Y(py - L * Math.cos(th))); ctx.lineTo(V.X(px - L * Math.sin(th)), V.Y(py + L * Math.cos(th))); ctx.stroke(); }
      LW.arrow(ctx, V.X(-2 * Math.cos(th)), V.Y(-2 * Math.sin(th)), V.X(2 * Math.cos(th)), V.Y(2 * Math.sin(th)), VIOLET, 3, 10); LW.text(ctx, "s", V.X(2.2 * Math.cos(th)), V.Y(2.2 * Math.sin(th)) + 4, { color: VIOLET, size: 14, weight: 700, align: "center" });
      LW.text(ctx, "A", V.X(-1.1 * Math.cos(phi0)), V.Y(-1.1 * Math.sin(phi0)) + 4, { color: "#fff", size: 13, weight: 700, align: "center" }); LW.text(ctx, "B", V.X(1.1 * Math.cos(phi0)), V.Y(1.1 * Math.sin(phi0)) + 4, { color: "#fff", size: 13, weight: 700, align: "center" });
      const pr = prof(th), gx = narrow ? 50 : mw + 54, gy = narrow ? mh + 30 : 26, gw = narrow ? W - 64 : W - mw - 66, gh = narrow ? H - gy - 40 : H - 66;
      const fmin = Math.min(...pr.Ft), A = LW.axes(ctx, { x: gx, y: gy, w: gw, h: gh * 0.55 }, { xr: [-2.6, 2.6], yr: [0, 10], ylabel: "F(s) / kT", colors: C, xlabels: false, title: "free energy along s", ny: 3 });
      A.clip(); LW.path(ctx, pr.ss, pr.Ft.map(f => f - fmin), A, { color: ORANGE, width: 2.4 }); ctx.restore();
      const B = LW.axes(ctx, { x: gx, y: gy + gh * 0.55 + 30, w: gw, h: gh * 0.45 - 30 }, { xr: [-2.6, 2.6], yr: [0, 1.05], xlabel: "s", colors: C, ylabels: false, title: "where states A (blue) and B (teal) project onto s", ny: 2 });
      const mA = Math.max(...pr.FA), mB = Math.max(...pr.FB), mm = Math.max(mA, mB); B.clip(); LW.band(ctx, pr.ss, pr.ss.map(() => 0), pr.FA.map(v => v / mm), B, rgba(BLUE, 0.45)); LW.band(ctx, pr.ss, pr.ss.map(() => 0), pr.FB.map(v => v / mm), B, rgba(TEAL, 0.45)); ctx.restore();
      // apparent barrier: max between the two minima of F(s)
      const f = pr.Ft.map(v => v - fmin); let bar = 0; { const mins = []; for (let i = 1; i < f.length - 1; i++) if (f[i] <= f[i - 1] && f[i] <= f[i + 1]) mins.push(i); if (mins.length >= 2) { const a = mins[0], b = mins[mins.length - 1]; bar = Math.max(...f.slice(a, b + 1)) - f[a]; } }
      const ov = pr.ss.reduce((s2, _, i) => s2 + Math.min(pr.FA[i] / pr.FA.reduce((a, b) => a + b, 0), pr.FB[i] / pr.FB.reduce((a, b) => a + b, 0)), 0);
      const best = prof(phi0), fb = best.Ft.map(v => v - Math.min(...best.Ft)), mid = fb[Math.round(fb.length / 2)];
      S.set("bar", bar ? bar.toFixed(2) + " kT" : "no barrier visible"); S.set("true", mid.toFixed(2) + " kT (relative to the lower basin)"); S.set("ov", (100 * ov).toFixed(0) + " %" + (ov > 0.2 ? "  (states indistinguishable)" : ""));
    }
    P.draw = draw; draw();
  });

  /* ---------------- 3. rates from simulation against TST and Kramers ---------------- */
  LW.register("rates", function (root) {
    let dV = 5, T = 1, gam = 2, walkers, side, tA, nTr, t, pts = [], r = LW.rng(3);
    const NW = 300;
    const P = LW.canvas(root, { height: w => (w < 640 ? 600 : 380) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Temperature k<sub>B</sub>T (barrier height 5)", min: 0.5, max: 2.5, step: 0.05, value: T, fmt: v => v.toFixed(2), onInput: v => { T = v; reset(); } });
    LW.slider(ctl, { label: "Friction γ", min: 0.2, max: 20, value: gam, log: true, fmt: v => v.toFixed(2), onInput: v => { gam = v; reset(); } });
    const c2 = LW.controls(root);
    LW.button(c2, "Record this point", () => { if (nTr > 20) { pts.push([1 / T, Math.log(nTr / tA), gam]); draw(); } }, { primary: true });
    LW.button(c2, "Clear", () => { pts = []; draw(); });
    const S = LW.stats(root, [["n", "transitions A → B counted"], ["k", "measured rate k"], ["tst", "transition-state theory"], ["kr", "Kramers theory"]]);
    const U = x => dV * (x * x - 1) ** 2, dU = x => 4 * dV * x * (x * x - 1), wa = Math.sqrt(8 * dV), wb = Math.sqrt(4 * dV);
    const kTST = () => wa / (2 * Math.PI) * Math.exp(-dV / T), kKr = () => wa / (2 * Math.PI * wb) * (Math.sqrt(gam * gam / 4 + wb * wb) - gam / 2) * Math.exp(-dV / T);
    function reset() { walkers = Array.from({ length: NW }, () => ({ x: -1, v: r.normal() * Math.sqrt(T) })); side = new Int8Array(NW).fill(-1); tA = 0; nTr = 0; t = 0; draw(); }
    const loop = LW.loop(root, () => { const dt = 0.005, c1 = Math.exp(-gam * dt), c2 = Math.sqrt((1 - c1 * c1) * T);
      for (let s = 0; s < 40; s++) { walkers.forEach((w, i) => { w.v += -0.5 * dt * dU(w.x); w.x += 0.5 * dt * w.v; w.v = c1 * w.v + c2 * r.normal(); w.x += 0.5 * dt * w.v; w.v += -0.5 * dt * dU(w.x);
        if (side[i] === -1) { tA += dt; if (w.x > 0.8) { nTr++; side[i] = 1; } } else if (w.x < -0.8) side[i] = -1; }); t += dt; } draw(); });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640, pw = narrow ? W - 64 : (W - 140) / 2, ph = narrow ? (H - 110) / 2 : H - 60;
      const A = LW.axes(ctx, { x: 50, y: 22, w: pw, h: ph }, { xr: [-1.8, 1.8], yr: [0, 10], xlabel: "x", ylabel: "U(x)", colors: C, title: NW + " independent walkers", ny: 4 });
      A.clip(); const xs = LW.linspace(-1.8, 1.8, 200); LW.path(ctx, xs, xs.map(U), A, { color: BLUE, width: 2.4 });
      ctx.strokeStyle = VIOLET; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(A.box.x + 12, A.sy(0.2)); ctx.lineTo(A.box.x + 12, A.sy(0.2 + T)); ctx.stroke();
      walkers.forEach(w => LW.dot(ctx, A.sx(w.x), A.sy(U(w.x)) - 4, 2.6, w.x > 0 ? TEAL : ORANGE, null)); ctx.restore();
      LW.text(ctx, "kT", A.box.x + 18, A.sy(0.2 + T / 2) + 4, { color: VIOLET, size: 11, weight: 700 });
      const bx = narrow ? 50 : 50 + pw + 70, by = narrow ? 22 + ph + 60 : 22, invs = LW.linspace(0.4, 2.0, 60);
      const B = LW.axes(ctx, { x: bx, y: by, w: pw, h: ph }, { xr: [0.4, 2.0], yr: [-12, 0.5], xlabel: "1 / k_BT", ylabel: "ln k", colors: C, title: "Arrhenius plot: your measurements and theory", ny: 4 });
      B.clip(); LW.path(ctx, invs, invs.map(b => Math.log(wa / (2 * Math.PI)) - dV * b), B, { color: GOLD, width: 2, dash: [6, 4] });
      LW.path(ctx, invs, invs.map(b => Math.log(wa / (2 * Math.PI * wb) * (Math.sqrt(gam * gam / 4 + wb * wb) - gam / 2)) - dV * b), B, { color: ROSE, width: 2 });
      pts.forEach(([b, lk]) => LW.dot(ctx, B.sx(b), B.sy(lk), 5, TEAL, C.card, 1.5)); ctx.restore();
      LW.text(ctx, "gold dashed: TST   rose: Kramers (current γ)", B.box.x + B.box.w - 4, B.box.y + 14, { color: C.ink3, size: 10.5, align: "right" });
      S.set("n", String(nTr)); S.set("k", nTr ? (nTr / tA).toExponential(2) : "–"); S.set("tst", kTST().toExponential(2)); S.set("kr", kKr().toExponential(2) + "  (κ = " + (kKr() / kTST()).toFixed(2) + ")");
    }
    P.draw = draw; reset(); loop.start();
  });
})();
