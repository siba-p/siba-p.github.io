/* Mathematics: vectors, matrices as movements of the plane, and gradients of landscapes. */
(function () {
  "use strict";
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const n2 = v => (Math.abs(v) < 5e-3 ? "0" : v.toFixed(2).replace("-", "−"));
  const vec = (a, b) => "(" + n2(a) + ", " + n2(b) + ")";
  /* a square world view centred on the origin, fitted to the canvas */
  function view(W, H, R) { const s = Math.min(W, H) / (2 * R), cx = W / 2, cy = H / 2; return { s, X: x => cx + x * s, Y: y => cy - y * s, ix: px => (px - cx) / s, iy: py => (cy - py) / s, R: R * Math.max(W, H) / Math.min(W, H) }; }
  function gridLines(ctx, V, C, M, { strong, faint } = {}) {
    const R = Math.ceil(V.R) + 1;
    const map = (x, y) => (M ? [M[0] * x + M[1] * y, M[2] * x + M[3] * y] : [x, y]);
    for (let k = -R; k <= R; k++) for (const dir of [0, 1]) {
      ctx.strokeStyle = k === 0 ? (strong || C.ink3) : (faint || C.line2); ctx.lineWidth = k === 0 ? 1.6 : 1;
      const a = dir ? map(k, -R) : map(-R, k), b = dir ? map(k, R) : map(R, k);
      ctx.beginPath(); ctx.moveTo(V.X(a[0]), V.Y(a[1])); ctx.lineTo(V.X(b[0]), V.Y(b[1])); ctx.stroke();
    }
  }
  const arrowW = (ctx, V, x0, y0, x1, y1, color, w = 3) => LW.arrow(ctx, V.X(x0), V.Y(y0), V.X(x1), V.Y(y1), color, w, 10);

  /* ---------------- 1. vectors: add, subtract, scale, dot ---------------- */
  LW.register("vecplay", function (root) {
    let a = [3, 1], b = [1, 2.5], mode = "add", c = 1.5, drag = null;
    const P = LW.canvas(root, { height: w => Math.min(440, Math.max(320, w * 0.6)) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Operation", options: [["add", "a + b"], ["sub", "a − b"], ["scale", "c · a"], ["dot", "a · b (dot product)"]], value: mode, onChange: v => { mode = v; draw(); } });
    LW.slider(ctl, { label: "Scale factor c", min: -2, max: 3, step: 0.05, value: c, fmt: v => v.toFixed(2), onInput: v => { c = v; draw(); } });
    const S = LW.stats(root, [["a", "a"], ["b", "b"], ["r", "result"], ["la", "length |a|"], ["ang", "angle between a and b"], ["dot", "a · b"]]);
    LW.note(root, "Drag the tips of <b style='color:#4c6ef5'>a</b> and <b style='color:#f08c2e'>b</b>. Every vector is both an arrow and a list of numbers; each operation below is done to the numbers and seen in the arrows.");
    let V;
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); V = view(W, H, 5);
      gridLines(ctx, V, C);
      let r;
      if (mode === "add") { r = [a[0] + b[0], a[1] + b[1]]; ctx.setLineDash([5, 4]); arrowW(ctx, V, a[0], a[1], r[0], r[1], rgba(ORANGE, 0.6), 2); arrowW(ctx, V, b[0], b[1], r[0], r[1], rgba(BLUE, 0.6), 2); ctx.setLineDash([]); ctx.fillStyle = rgba(VIOLET, 0.08); ctx.beginPath(); ctx.moveTo(V.X(0), V.Y(0)); ctx.lineTo(V.X(a[0]), V.Y(a[1])); ctx.lineTo(V.X(r[0]), V.Y(r[1])); ctx.lineTo(V.X(b[0]), V.Y(b[1])); ctx.closePath(); ctx.fill(); }
      if (mode === "sub") { r = [a[0] - b[0], a[1] - b[1]]; ctx.setLineDash([5, 4]); arrowW(ctx, V, b[0], b[1], a[0], a[1], rgba(VIOLET, 0.7), 2); ctx.setLineDash([]); }
      if (mode === "scale") { r = [c * a[0], c * a[1]]; ctx.strokeStyle = rgba(VIOLET, 0.35); ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.moveTo(V.X(-a[0] * 3), V.Y(-a[1] * 3)); ctx.lineTo(V.X(a[0] * 3), V.Y(a[1] * 3)); ctx.stroke(); ctx.setLineDash([]); }
      const la = Math.hypot(...a), lb = Math.hypot(...b), dot = a[0] * b[0] + a[1] * b[1], cos = dot / (la * lb || 1), ang = Math.acos(LW.clamp(cos, -1, 1));
      if (mode === "dot") { // projection of b onto a
        const t = dot / (la * la || 1), p = [a[0] * t, a[1] * t];
        ctx.strokeStyle = rgba(ORANGE, 0.7); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(V.X(b[0]), V.Y(b[1])); ctx.lineTo(V.X(p[0]), V.Y(p[1])); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = rgba(VIOLET, 0.35); ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.moveTo(V.X(-a[0] * 3), V.Y(-a[1] * 3)); ctx.lineTo(V.X(a[0] * 3), V.Y(a[1] * 3)); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = dot >= 0 ? TEAL : ROSE; ctx.lineWidth = 6; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.moveTo(V.X(0), V.Y(0)); ctx.lineTo(V.X(p[0]), V.Y(p[1])); ctx.stroke(); ctx.globalAlpha = 1;
        const a0 = Math.atan2(a[1], a[0]), b0 = Math.atan2(b[1], b[0]); ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(V.X(0), V.Y(0), 30, -a0, -b0, ((b0 - a0 + 4 * Math.PI) % (2 * Math.PI)) < Math.PI); ctx.stroke();
        LW.text(ctx, "θ", V.X(0) + 38 * Math.cos(-(a0 + b0) / 2), V.Y(0) + 38 * Math.sin(-(a0 + b0) / 2), { color: GOLD, size: 13, weight: 700, align: "center" });
        r = null;
      }
      arrowW(ctx, V, 0, 0, a[0], a[1], BLUE, 3.2); arrowW(ctx, V, 0, 0, b[0], b[1], mode === "scale" ? rgba(ORANGE, 0.3) : ORANGE, 3.2);
      if (r) arrowW(ctx, V, 0, 0, r[0], r[1], VIOLET, 3.6);
      LW.text(ctx, "a", V.X(a[0]) + 8, V.Y(a[1]) - 6, { color: BLUE, size: 14, weight: 700 }); LW.text(ctx, "b", V.X(b[0]) + 8, V.Y(b[1]) - 6, { color: ORANGE, size: 14, weight: 700 });
      if (r) LW.text(ctx, { add: "a + b", sub: "a − b", scale: "c·a" }[mode], V.X(r[0]) + 8, V.Y(r[1]) + 14, { color: VIOLET, size: 13, weight: 700 });
      S.set("a", vec(...a)); S.set("b", vec(...b)); S.set("r", r ? vec(...r) : "a number, not a vector"); S.set("la", la.toFixed(3)); S.set("ang", (ang * 180 / Math.PI).toFixed(1) + "°"); S.set("dot", n2(dot) + " = |a||b|cos θ");
    }
    P.draw = draw;
    const snap = v => Math.round(v * 10) / 10;
    LW.drag(P.cv, { down: q => { const x = V.ix(q.x), y = V.iy(q.y); const da = Math.hypot(x - a[0], y - a[1]), db = Math.hypot(x - b[0], y - b[1]); drag = da < db ? (da < 0.8 ? a : null) : (db < 0.8 ? b : null); return !!drag; }, move: q => { drag[0] = snap(LW.clamp(V.ix(q.x), -6, 6)); drag[1] = snap(LW.clamp(V.iy(q.y), -6, 6)); draw(); } });
    draw();
  });

  /* ---------------- 2. a matrix is a movement of the whole plane ---------------- */
  const PRE = {
    id: ["Identity", [1, 0, 0, 1]], rot: ["Rotate 90°", [0, -1, 1, 0]], rot30: ["Rotate 30°", [0.866, -0.5, 0.5, 0.866]], shear: ["Shear", [1, 1, 0, 1]],
    stretch: ["Stretch", [2, 0, 0, 0.5]], sym: ["Symmetric", [2, 1, 1, 2]], refl: ["Reflect", [1, 0, 0, -1]], proj: ["Squash flat", [1, 0.5, 2, 1]]
  };
  function eig2(M) { const [a, b, c, d] = M, tr = a + d, det = a * d - b * c, disc = tr * tr / 4 - det; if (disc < -1e-12) return null; const s = Math.sqrt(Math.max(0, disc)), ls = [tr / 2 + s, tr / 2 - s];
    return ls.map(l => { let v = Math.abs(b) > 1e-9 ? [b, l - a] : Math.abs(c) > 1e-9 ? [l - d, c] : (Math.abs(a - l) < 1e-9 ? [1, 0] : [0, 1]); const n = Math.hypot(...v) || 1; return { l, v: [v[0] / n, v[1] / n] }; }); }
  LW.register("lintrans", function (root, opts) {
    let M = (opts && opts.m) || [1, 1, 0, 1], t = 1, v = [1, 1.5], showEig = !!(opts && opts.eig), showCircle = false, drag = null;
    const P = LW.canvas(root, { height: w => Math.min(500, Math.max(340, w * 0.66)) });
    const ctl = LW.controls(root);
    const seg = LW.seg(ctl, { label: "Try a matrix", options: Object.keys(PRE).map(k => [k, PRE[k][0]]), value: "", onChange: k => { M = PRE[k][1].slice(); t = 0; anim.start(); } });
    const c2 = LW.controls(root);
    const ts = LW.slider(c2, { label: "Morph from the identity (0) to the matrix (1)", min: 0, max: 1, step: 0.01, value: t, fmt: v => v.toFixed(2), onInput: x => { t = x; draw(); } });
    LW.button(c2, "Play the transformation", () => { t = 0; anim.start(); }, { primary: true });
    const c3 = LW.controls(root);
    LW.check(c3, { label: "Show eigenvectors (directions that only stretch)", value: showEig, onChange: x => { showEig = x; draw(); } });
    LW.check(c3, { label: "Show what happens to a circle", value: showCircle, onChange: x => { showCircle = x; draw(); } });
    const S = LW.stats(root, [["m", "matrix [ î′ ĵ′ ]"], ["v", "v → M v"], ["det", "determinant (area factor)"], ["eig", "eigenvalues"]]);
    LW.note(root, "Drag the tips of the <b style='color:#12a594'>green î</b> and <b style='color:#e64980'>red ĵ</b> arrows: the two columns of the matrix are simply where the unit arrows land. Every other point follows, because M v = x·î′ + y·ĵ′. Drag the <b style='color:#4c6ef5'>blue v</b> to see one vector transformed (orange).");
    const anim = LW.loop(root, dt => { t = Math.min(1, t + dt * 0.7); ts.set(t); draw(); if (t >= 1) anim.stop(); });
    let V;
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); V = view(W, H, 4.4);
      const e = tt => tt * tt * (3 - 2 * tt), s = e(t), Mt = [1 + (M[0] - 1) * s, M[1] * s, M[2] * s, 1 + (M[3] - 1) * s];
      gridLines(ctx, V, C, null, { faint: C.dark ? "rgba(255,255,255,.05)" : "rgba(12,18,34,.05)", strong: C.line2 });
      gridLines(ctx, V, C, Mt, { faint: rgba(BLUE, C.dark ? 0.35 : 0.28), strong: rgba(BLUE, 0.8) });
      // unit square → parallelogram
      const det = Mt[0] * Mt[3] - Mt[1] * Mt[2];
      ctx.fillStyle = rgba(GOLD, 0.28); ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(V.X(0), V.Y(0)); ctx.lineTo(V.X(Mt[0]), V.Y(Mt[2])); ctx.lineTo(V.X(Mt[0] + Mt[1]), V.Y(Mt[2] + Mt[3])); ctx.lineTo(V.X(Mt[1]), V.Y(Mt[3])); ctx.closePath(); ctx.fill(); ctx.stroke();
      LW.text(ctx, "area " + det.toFixed(2), V.X((Mt[0] + Mt[1]) / 2), V.Y((Mt[2] + Mt[3]) / 2) + 4, { color: C.ink, size: 11, weight: 700, align: "center" });
      if (showCircle) { ctx.strokeStyle = VIOLET; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k <= 120; k++) { const a = k / 120 * 2 * Math.PI, x = Math.cos(a), y = Math.sin(a), px = Mt[0] * x + Mt[1] * y, py = Mt[2] * x + Mt[3] * y; k ? ctx.lineTo(V.X(px), V.Y(py)) : ctx.moveTo(V.X(px), V.Y(py)); } ctx.stroke(); }
      if (showEig) { const E = eig2(M); if (E) E.forEach((q, i) => { ctx.strokeStyle = rgba(VIOLET, 0.7); ctx.lineWidth = 2; ctx.setLineDash([8, 5]); ctx.beginPath(); ctx.moveTo(V.X(-q.v[0] * 9), V.Y(-q.v[1] * 9)); ctx.lineTo(V.X(q.v[0] * 9), V.Y(q.v[1] * 9)); ctx.stroke(); ctx.setLineDash([]);
          const lam = 1 + (q.l - 1) * s; arrowW(ctx, V, 0, 0, q.v[0] * lam, q.v[1] * lam, VIOLET, 3); LW.text(ctx, "λ" + (i + 1) + " = " + q.l.toFixed(2), V.X(q.v[0] * lam) + 8, V.Y(q.v[1] * lam) - 8, { color: VIOLET, size: 12, weight: 700 }); });
        else LW.text(ctx, "no real eigenvectors: every direction is turned", 12, 22, { color: VIOLET, size: 12, weight: 600 }); }
      // v and Mv with the column construction
      const mv = [Mt[0] * v[0] + Mt[1] * v[1], Mt[2] * v[0] + Mt[3] * v[1]];
      ctx.setLineDash([4, 4]); arrowW(ctx, V, 0, 0, Mt[0] * v[0], Mt[2] * v[0], rgba(TEAL, 0.55), 1.8); arrowW(ctx, V, Mt[0] * v[0], Mt[2] * v[0], mv[0], mv[1], rgba(ROSE, 0.55), 1.8); ctx.setLineDash([]);
      arrowW(ctx, V, 0, 0, v[0], v[1], rgba(BLUE, 0.9), 2.4); arrowW(ctx, V, 0, 0, mv[0], mv[1], ORANGE, 3.4);
      arrowW(ctx, V, 0, 0, Mt[0], Mt[2], TEAL, 3.6); arrowW(ctx, V, 0, 0, Mt[1], Mt[3], ROSE, 3.6);
      LW.text(ctx, "î′", V.X(Mt[0]) + 8, V.Y(Mt[2]) + 4, { color: TEAL, size: 14, weight: 700 }); LW.text(ctx, "ĵ′", V.X(Mt[1]) + 8, V.Y(Mt[3]) - 4, { color: ROSE, size: 14, weight: 700 });
      LW.text(ctx, "v", V.X(v[0]) + 7, V.Y(v[1]) - 6, { color: BLUE, size: 13, weight: 700 }); LW.text(ctx, "Mv", V.X(mv[0]) + 7, V.Y(mv[1]) - 6, { color: ORANGE, size: 13, weight: 700 });
      const E = eig2(M), D = M[0] * M[3] - M[1] * M[2];
      S.set("m", "[" + n2(M[0]) + "  " + n2(M[1]) + " ; " + n2(M[2]) + "  " + n2(M[3]) + "]");
      S.set("v", vec(...v) + " → " + vec(M[0] * v[0] + M[1] * v[1], M[2] * v[0] + M[3] * v[1]));
      S.set("det", n2(D) + (D < -1e-9 ? "  (flipped)" : Math.abs(D) < 1e-9 ? "  (flattened)" : ""));
      S.set("eig", E ? E.map(q => n2(q.l)).join(", ") : "complex (a rotation)");
    }
    P.draw = draw;
    const snap = x => Math.round(x * 10) / 10;
    LW.drag(P.cv, { down: q => { if (t < 1) { t = 1; ts.set(1); } const x = V.ix(q.x), y = V.iy(q.y), c = [[M[0], M[2], "i"], [M[1], M[3], "j"], [v[0], v[1], "v"]].map(p => [Math.hypot(x - p[0], y - p[1]), p[2]]).sort((a, b) => a[0] - b[0])[0]; drag = c[0] < 0.7 ? c[1] : null; return !!drag; },
      move: q => { const x = snap(LW.clamp(V.ix(q.x), -5, 5)), y = snap(LW.clamp(V.iy(q.y), -5, 5)); if (drag === "i") { M[0] = x; M[2] = y; } else if (drag === "j") { M[1] = x; M[3] = y; } else { v = [x, y]; } seg.set(""); draw(); } });
    draw();
  });

  /* ---------------- 3. landscapes: contours, gradients, slices, curvature ---------------- */
  const LS = {
    bowl: { name: "Bowl", f: (x, y) => 0.5 * x * x + 1.5 * y * y, r: 3 },
    valley: { name: "Long curved valley", f: (x, y) => 0.25 * (1 - x) ** 2 + 2 * (y - 0.3 * x * x) ** 2, r: 3 },
    pass: { name: "Two valleys and a mountain pass", f: (x, y) => (x * x - 2) ** 2 / 2 + 1.2 * y * y, r: 2.6 },
    mb: { name: "Three basins (a molecular landscape)", f: (x, y) => { const g = (a, b, A, s) => A * Math.exp(-((x - a) ** 2 + (y - b) ** 2) / (2 * s * s)); return 4 - g(-1.3, 1, 3.2, 0.7) - g(1.3, 0.9, 2.6, 0.6) - g(0.2, -1.2, 3.6, 0.75) + 0.08 * (x * x + y * y); }, r: 3 }
  };
  const grad = (f, x, y, e = 1e-4) => [(f(x + e, y) - f(x - e, y)) / (2 * e), (f(x, y + e) - f(x, y - e)) / (2 * e)];
  const hess = (f, x, y, e = 1e-3) => [(f(x + e, y) - 2 * f(x, y) + f(x - e, y)) / (e * e), (f(x + e, y + e) - f(x + e, y - e) - f(x - e, y + e) + f(x - e, y - e)) / (4 * e * e), (f(x, y + e) - 2 * f(x, y) + f(x, y - e)) / (e * e)];
  LW.register("landscape", function (root, opts) {
    let key = (opts && opts.land) || "pass", p = [-0.6, 1.2], dir = 0.6, field = false, slices = !!(opts && opts.slices), curv = !!(opts && opts.curv), trail = [], rolling = false;
    const P = LW.canvas(root, { height: w => (slices ? (w < 640 ? 640 : 470) : Math.min(470, Math.max(320, w * 0.62))) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Landscape f(x, y)", options: Object.keys(LS).map(k => [k, LS[k].name]), value: key, onChange: v => { key = v; img = null; trail = []; draw(); } });
    const c2 = LW.controls(root);
    LW.slider(c2, { label: "Compass direction u", min: -3.14, max: 3.14, step: 0.01, value: dir, fmt: v => Math.round(v * 180 / Math.PI) + "°", onInput: v => { dir = v; draw(); } });
    const rb = LW.button(c2, "Roll downhill from here", () => { trail = [p.slice()]; rolling = true; loop.start(); }, { primary: true });
    const c3 = LW.controls(root);
    LW.check(c3, { label: "Arrow field: −∇f everywhere", value: field, onChange: v => { field = v; draw(); } });
    LW.check(c3, { label: "Slices along x and y", value: slices, onChange: v => { slices = v; P.refit(); } });
    LW.check(c3, { label: "Curvature (Hessian) at the point", value: curv, onChange: v => { curv = v; draw(); } });
    const S = LW.stats(root, [["p", "point (x, y)"], ["f", "height f"], ["g", "gradient ∇f = (∂f/∂x, ∂f/∂y)"], ["du", "slope in direction u: ∇f · u"], ["k", "kind of point"]]);
    LW.note(root, "Drag the walker anywhere on the map. Contour lines join points of equal height, like a hiking map. The <b style='color:#12a594'>teal arrow</b> is the gradient, pointing straight uphill; the <b style='color:#f08c2e'>orange arrow</b> is −∇f, the way a ball would roll (and, for atoms, the direction of the force).");
    let img = null, imgKey = "", V = null, box = null;
    const loop = LW.loop(root, () => { if (!rolling) return loop.stop(); const F = LS[key].f; for (let k = 0; k < 6; k++) { const g = grad(F, p[0], p[1]), gn = Math.hypot(...g); if (gn < 2e-3) { rolling = false; break; } const h = Math.min(0.02, 0.08 / gn); p = [p[0] - h * g[0], p[1] - h * g[1]]; } trail.push(p.slice()); if (trail.length > 2000) rolling = false; draw(); });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P, F = LS[key].f, R = LS[key].r; ctx.clearRect(0, 0, W, H);
      const narrow = W < 640, mh = slices ? (narrow ? H - 250 : H) : H, mw = slices && !narrow ? W * 0.6 : W;
      box = { x: 0, y: 0, w: mw, h: mh };
      const s = Math.min(mw, mh * 1.3) / (2 * R), cx = mw / 2, cy = mh / 2;
      V = { X: x => cx + x * s, Y: y => cy - y * s, ix: px => (px - cx) / s, iy: py => (cy - py) / s };
      // heat map with contours, cached
      const k2 = key + mw + "x" + mh + C.dark;
      if (imgKey !== k2) { const st = 2, cw = Math.ceil(mw / st), ch = Math.ceil(mh / st), vals = new Float64Array(cw * ch); let lo = Infinity, hi = -Infinity;
        for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const v = F(V.ix(i * st), V.iy(j * st)); vals[j * cw + i] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
        const cap = lo + (hi - lo) * 0.45, lev = (cap - lo) / 16, off = document.createElement("canvas"); off.width = cw; off.height = ch; const oc = off.getContext("2d"), id = oc.createImageData(cw, ch);
        for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const v = Math.min(vals[j * cw + i], cap), t = (v - lo) / (cap - lo), col = LW.ramp(0.08 + 0.85 * Math.sqrt(t), C).match(/\d+/g).map(Number);
          const band = Math.floor((v - lo) / lev), edge = (i + 1 < cw && Math.floor((Math.min(vals[j * cw + i + 1], cap) - lo) / lev) !== band) || (j + 1 < ch && Math.floor((Math.min(vals[(j + 1) * cw + i], cap) - lo) / lev) !== band);
          const o = 4 * (j * cw + i), dk = edge ? (C.dark ? 1.6 : 0.7) : 1; id.data[o] = Math.min(255, col[0] * dk); id.data[o + 1] = Math.min(255, col[1] * dk); id.data[o + 2] = Math.min(255, col[2] * dk); id.data[o + 3] = 255; }
        oc.putImageData(id, 0, 0); img = off; imgKey = k2; }
      ctx.imageSmoothingEnabled = true; ctx.drawImage(img, 0, 0, Math.ceil(mw / 2) * 2, Math.ceil(mh / 2) * 2);
      if (field) { const step = Math.max(26, mw / 18); for (let py = step / 2; py < mh; py += step) for (let px = step / 2; px < mw; px += step) { const x = V.ix(px), y = V.iy(py), g = grad(F, x, y), gn = Math.hypot(...g); if (gn < 1e-6) continue; const L = Math.min(step * 0.45, 4 + gn * 5); LW.arrow(ctx, px, py, px - g[0] / gn * L, py + g[1] / gn * L, rgba(C.dark ? "#ffffff" : "#0c1222", 0.45), 1.1, 4); } }
      if (trail.length > 1) { ctx.strokeStyle = ORANGE; ctx.lineWidth = 2.4; ctx.beginPath(); trail.forEach((q, i) => (i ? ctx.lineTo(V.X(q[0]), V.Y(q[1])) : ctx.moveTo(V.X(q[0]), V.Y(q[1])))); ctx.stroke(); }
      const g = grad(F, p[0], p[1]), gn = Math.hypot(...g), u = [Math.cos(dir), Math.sin(dir)], X0 = V.X(p[0]), Y0 = V.Y(p[1]);
      const sc = Math.min(90, 26 + gn * 18) / (gn || 1);
      if (gn > 1e-3) { LW.arrow(ctx, X0, Y0, X0 + g[0] * sc, Y0 - g[1] * sc, TEAL, 3, 10); LW.arrow(ctx, X0, Y0, X0 - g[0] * sc, Y0 + g[1] * sc, ORANGE, 3, 10); }
      LW.arrow(ctx, X0, Y0, X0 + u[0] * 50, Y0 - u[1] * 50, VIOLET, 2.2, 8); LW.text(ctx, "u", X0 + u[0] * 60, Y0 - u[1] * 60 + 4, { color: VIOLET, size: 12, weight: 700, align: "center" });
      const Hs = hess(F, p[0], p[1]), tr = Hs[0] + Hs[2], det = Hs[0] * Hs[2] - Hs[1] * Hs[1], disc = Math.sqrt(Math.max(0, tr * tr / 4 - det)), l1 = tr / 2 + disc, l2 = tr / 2 - disc;
      if (curv) [l1, l2].forEach((l, i) => { let ev = Math.abs(Hs[1]) > 1e-9 ? [Hs[1], l - Hs[0]] : (i === 0 ? (Hs[0] >= Hs[2] ? [1, 0] : [0, 1]) : (Hs[0] >= Hs[2] ? [0, 1] : [1, 0])); const n = Math.hypot(...ev); ev = [ev[0] / n, ev[1] / n]; const L = 46; ctx.strokeStyle = l > 0 ? GOLD : ROSE; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X0 - ev[0] * L, Y0 + ev[1] * L); ctx.lineTo(X0 + ev[0] * L, Y0 - ev[1] * L); ctx.stroke(); LW.text(ctx, "λ=" + l.toFixed(1), X0 + ev[0] * (L + 16), Y0 - ev[1] * (L + 16) + 4, { color: l > 0 ? GOLD : ROSE, size: 11, weight: 700, align: "center" }); });
      LW.dot(ctx, X0, Y0, 8, BLUE, "#fff", 2.4);
      if (slices) { const bx = narrow ? 46 : mw + 54, bw = narrow ? W - 60 : W - mw - 66, bh = narrow ? 92 : (H - 110) / 2, by1 = narrow ? mh + 22 : 22, by2 = narrow ? mh + 22 + bh + 42 : 22 + bh + 56;
        const xs = LW.linspace(-R, R, 200), fx = xs.map(x => F(x, p[1])), fy = xs.map(y => F(p[0], y)), yr = [Math.min(...fx, ...fy), Math.min(Math.max(...fx, ...fy), F(p[0], p[1]) + 6)];
        [[by1, fx, p[0], g[0], "slice along x (y fixed): slope ∂f/∂x", TEAL, "x"], [by2, fy, p[1], g[1], "slice along y (x fixed): slope ∂f/∂y", ROSE, "y"]].forEach(([by, ys, c0, sl, title, col, xl]) => {
          const A = LW.axes(ctx, { x: bx, y: by, w: bw, h: bh }, { xr: [-R, R], yr, colors: C, title, xlabel: xl, ny: 3 }); A.clip();
          LW.path(ctx, xs, ys, A, { color: C.ink2, width: 2 }); const y0 = F(p[0], p[1]); LW.path(ctx, [c0 - 0.8, c0 + 0.8], [y0 - sl * 0.8, y0 + sl * 0.8], A, { color: col, width: 2.6 }); LW.dot(ctx, A.sx(c0), A.sy(y0), 5, BLUE, C.card, 1.5); ctx.restore(); }); }
      const kind = gn > 0.05 ? "a slope" : det < 0 ? "a saddle (a mountain pass)" : l1 > 0 && l2 > 0 ? "a minimum (valley floor)" : "a maximum (summit)";
      S.set("p", vec(...p)); S.set("f", F(p[0], p[1]).toFixed(3)); S.set("g", vec(...g) + ", |∇f| = " + gn.toFixed(2)); S.set("du", (g[0] * u[0] + g[1] * u[1]).toFixed(3)); S.set("k", kind + (curv ? ";  Hessian eigenvalues " + l1.toFixed(2) + ", " + l2.toFixed(2) : ""));
    }
    P.draw = draw;
    const set = q => { if (q.x > box.w || q.y > box.h) return false; p = [LW.clamp(V.ix(q.x), -LS[key].r, LS[key].r), LW.clamp(V.iy(q.y), -LS[key].r, LS[key].r)]; rolling = false; trail = []; draw(); };
    LW.drag(P.cv, { down: set, move: set }); draw(); void rb;
  });
})();
