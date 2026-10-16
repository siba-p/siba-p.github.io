/* 2.1 Learning from data: drag points, compare least squares, least absolute deviations and
   your own line. */
(function () {
  "use strict";
  LW.register("regression", function (root) {
    const r = LW.rng(7);
    const base = () => Array.from({ length: 12 }, (_, i) => { const x = 0.6 + i * 0.78 + r() * 0.3; return { x, y: 1.4 + 0.62 * x + r.normal() * 0.55 }; });
    let pts = base(), mode = "ls", w = 0.4, b = 2.5, dragging = -1;
    const P = LW.canvas(root, { aspect: 0.56, minH: 260, maxH: 420 });
    const ctl = LW.controls(root);
    const seg = LW.seg(ctl, { label: "Line", options: [["ls", "Least squares"], ["lad", "Least absolute deviation"], ["hand", "Fit it yourself"]], value: mode, onChange: v => { mode = v; hand.style.display = v === "hand" ? "" : "none"; draw(); } });
    const hand = LW.h("div", { class: "lw-ctl", style: { display: "none", flex: "1 1 320px" } }); ctl.append(hand);
    const sw = LW.slider(hand, { label: "Slope w", min: -1, max: 2, step: 0.01, value: w, onInput: v => { w = v; draw(); } });
    const sb = LW.slider(hand, { label: "Intercept b", min: -2, max: 6, step: 0.01, value: b, onInput: v => { b = v; draw(); } });
    const bt = LW.controls(root);
    LW.button(bt, "Add an outlier", () => { pts.push({ x: 8.6, y: 1.2 }); draw(); });
    LW.button(bt, "New data", () => { pts = base(); draw(); });
    LW.button(bt, "Clear", () => { pts = []; draw(); });
    const S = LW.stats(root, [["w", "slope w"], ["b", "intercept b"], ["mse", "mean squared error"], ["mae", "mean absolute error"], ["r2", "R²"]]);
    LW.note(root, "Click empty space to add a point, drag a point to move it, and double-click a point to delete it.");

    function lsq() { // closed-form least squares
      const n = pts.length; if (n < 2) return null;
      let sx = 0, sy = 0; pts.forEach(p => { sx += p.x; sy += p.y; }); const mx = sx / n, my = sy / n;
      let sxx = 0, sxy = 0; pts.forEach(p => { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); });
      if (sxx < 1e-12) return null; const ww = sxy / sxx; return { w: ww, b: my - ww * mx };
    }
    function lad() { // least absolute deviations by iteratively reweighted least squares
      let f = lsq(); if (!f) return null;
      for (let it = 0; it < 80; it++) {
        let s0 = 0, s1 = 0, s2 = 0, t0 = 0, t1 = 0;
        pts.forEach(p => { const q = 1 / Math.max(Math.abs(p.y - f.w * p.x - f.b), 1e-4); s0 += q; s1 += q * p.x; s2 += q * p.x * p.x; t0 += q * p.y; t1 += q * p.x * p.y; });
        const det = s0 * s2 - s1 * s1; if (Math.abs(det) < 1e-12) break;
        f = { w: (s0 * t1 - s1 * t0) / det, b: (s2 * t0 - s1 * t1) / det };
      }
      return f;
    }
    const xr = [0, 10], yr = [-1, 10];
    let A = null;
    function draw() {
      const { ctx, W, H } = P, C = LW.colors(); ctx.clearRect(0, 0, W, H);
      A = LW.axes(ctx, { x: 58, y: 14, w: W - 72, h: H - 54 }, { xr, yr, xlabel: "x (e.g. 1000/T)", ylabel: "y (e.g. ln k)", colors: C });
      const fit = mode === "ls" ? lsq() : mode === "lad" ? lad() : { w, b };
      const best = lsq();
      A.clip();
      if (mode === "hand" && best) LW.path(ctx, xr, xr.map(x => best.w * x + best.b), A, { color: C.ink3, width: 1.5, dash: [5, 5] });
      if (fit) {
        pts.forEach(p => { const yh = fit.w * p.x + fit.b; ctx.strokeStyle = C.rose; ctx.globalAlpha = .55; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(A.sx(p.x), A.sy(p.y)); ctx.lineTo(A.sx(p.x), A.sy(yh)); ctx.stroke(); ctx.globalAlpha = 1; });
        LW.path(ctx, xr, xr.map(x => fit.w * x + fit.b), A, { color: C.accent, width: 2.5 });
      }
      pts.forEach((p, i) => LW.dot(ctx, A.sx(p.x), A.sy(p.y), i === dragging ? 7 : 5.5, C.card, C.ink, 2));
      ctx.restore();
      if (mode === "hand" && best) LW.text(ctx, "dashed: least-squares answer", W - 18, 28, { color: C.ink3, size: 11, align: "right" });
      if (fit && pts.length) {
        const n = pts.length; let se = 0, ae = 0, my = 0; pts.forEach(p => { my += p.y / n; });
        let st = 0; pts.forEach(p => { const e = p.y - fit.w * p.x - fit.b; se += e * e; ae += Math.abs(e); st += (p.y - my) ** 2; });
        S.set("w", LW.fmt(fit.w, 3)); S.set("b", LW.fmt(fit.b, 3)); S.set("mse", LW.fmt(se / n, 3)); S.set("mae", LW.fmt(ae / n, 3)); S.set("r2", st > 0 ? LW.fmt(1 - se / st, 3) : "–");
        if (mode === "hand" && best) { let sb2 = 0; pts.forEach(p => { sb2 += (p.y - best.w * p.x - best.b) ** 2; }); S.set("mse", `${LW.fmt(se / n, 3)} <small style="color:var(--ink-3)">best ${LW.fmt(sb2 / n, 3)}</small>`); }
      } else ["w", "b", "mse", "mae", "r2"].forEach(k => S.set(k, "–"));
    }
    P.draw = draw;
    const hit = p => pts.findIndex(q => Math.hypot(A.sx(q.x) - p.x, A.sy(q.y) - p.y) < 11);
    LW.drag(P.cv, {
      down: p => { if (!A) return false; let i = hit(p); if (i < 0) { pts.push({ x: LW.clamp(A.ix(p.x), xr[0], xr[1]), y: LW.clamp(A.iy(p.y), yr[0], yr[1]) }); i = pts.length - 1; } dragging = i; draw(); },
      move: p => { if (dragging < 0) return; pts[dragging] = { x: LW.clamp(A.ix(p.x), xr[0], xr[1]), y: LW.clamp(A.iy(p.y), yr[0], yr[1]) }; draw(); },
      up: () => { dragging = -1; draw(); },
      hover: p => { P.cv.style.cursor = p && hit(p) >= 0 ? "grab" : "crosshair"; }
    });
    P.cv.addEventListener("dblclick", e => { const rc = P.cv.getBoundingClientRect(); const i = hit({ x: e.clientX - rc.left, y: e.clientY - rc.top }); if (i >= 0) { pts.splice(i, 1); draw(); } });
    draw();
  });
})();
