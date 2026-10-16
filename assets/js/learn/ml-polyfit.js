/* 2.3 Generalisation: polynomial degree and ridge penalty against train and validation error. */
(function () {
  "use strict";
  const truth = x => 0.9 * Math.sin(2.6 * x) * Math.exp(-0.25 * x) + 0.15 * x;   // x in [0, 4]
  const legendre = (t, n) => { const P = [1, t]; for (let k = 1; k < n; k++) P.push(((2 * k + 1) * t * P[k] - k * P[k - 1]) / (k + 1)); return P.slice(0, n + 1); };
  LW.register("polyfit", function (root) {
    let deg = 3, lam = 1e-9, seed = 3, sigma = 0.18, nTrain = 14, data;
    const row = LW.h("div", { class: "lw-row" }); root.append(row);
    const left = LW.h("div"), right = LW.h("div"); row.append(left, right);
    const P = LW.canvas(left, { aspect: 0.68, minH: 250, maxH: 400 });
    const Q = LW.canvas(right, { aspect: 0.82, minH: 220, maxH: 330 });
    LW.legend(root, [[LW.colors().accent, "fitted model"], [LW.colors().ink3, "true function", true], [LW.colors().ink, "training points (filled)"], [LW.colors().orange, "validation points (open)"]]);
    const ctl = LW.controls(root);
    const sd = LW.slider(ctl, { label: "Polynomial degree", min: 0, max: 13, step: 1, value: deg, fmt: v => String(v), onInput: v => { deg = v; draw(); } });
    LW.slider(ctl, { label: "Ridge penalty λ", min: 1e-9, max: 10, value: lam, log: true, fmt: v => (v < 2e-9 ? "0" : v.toExponential(0)), onInput: v => { lam = v < 2e-9 ? 0 : v; draw(); } });
    LW.slider(ctl, { label: "Training points", min: 6, max: 60, step: 1, value: nTrain, fmt: v => String(v), onInput: v => { nTrain = v; make(); draw(); } });
    const c2 = LW.controls(root);
    LW.button(c2, "New noisy sample", () => { seed++; make(); draw(); });
    LW.slider(c2, { label: "Noise σ", min: 0.02, max: 0.5, step: 0.01, value: sigma, fmt: v => v.toFixed(2), onInput: v => { sigma = v; make(); draw(); } });
    const S = LW.stats(root, [["tr", "training RMSE"], ["va", "validation RMSE", "bad"], ["nw", "size of weights ‖w‖"], ["best", "best degree (validation)", "good"]]);

    function make() {
      const r = LW.rng(seed * 97 + 11);
      const tr = Array.from({ length: nTrain }, (_, i) => { const x = 4 * (i + 0.5 + (r() - 0.5) * 0.8) / nTrain; return { x, y: truth(x) + sigma * r.normal() }; });
      const va = Array.from({ length: 40 }, () => { const x = 4 * r(); return { x, y: truth(x) + sigma * r.normal() }; });
      data = { tr, va };
    }
    const feat = (x, d) => legendre(x / 2 - 1, d);
    function fit(d, l) { const X = data.tr.map(p => feat(p.x, d)), y = data.tr.map(p => p.y); return LW.ridge(X, y, l * data.tr.length); }
    const pred = (w, x) => { const f = feat(x, w.length - 1); let s = 0; for (let i = 0; i < w.length; i++) s += w[i] * f[i]; return s; };
    const rmse = (w, pts) => Math.sqrt(pts.reduce((s, p) => s + (p.y - pred(w, p.x)) ** 2, 0) / pts.length);
    function draw() {
      const C = LW.colors();
      const w = fit(deg, lam);
      const curve = [];
      for (let d = 0; d <= 13; d++) { const wd = fit(d, lam); curve.push(wd ? [rmse(wd, data.tr), rmse(wd, data.va)] : [NaN, NaN]); }
      { const { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
        const A = LW.axes(ctx, { x: 58, y: 10, w: W - 70, h: H - 50 }, { xr: [0, 4], yr: [-1.4, 1.6], xlabel: "x", ylabel: "y", colors: C });
        A.clip(); const xs = LW.linspace(0, 4, 300);
        LW.path(ctx, xs, xs.map(truth), A, { color: C.ink3, width: 1.5, dash: [5, 5] });
        if (w) LW.path(ctx, xs, xs.map(x => pred(w, x)), A, { color: C.accent, width: 2.5 });
        data.va.forEach(p => LW.dot(ctx, A.sx(p.x), A.sy(p.y), 3.5, null, C.orange, 1.5));
        data.tr.forEach(p => LW.dot(ctx, A.sx(p.x), A.sy(p.y), 4.5, C.ink, null));
        ctx.restore();
        if (deg >= data.tr.length - 1 && lam === 0) LW.text(ctx, "as many parameters as points: the curve interpolates the noise", 48, 24, { color: C.rose, size: 11 });
      }
      { const { ctx, W, H } = Q; ctx.clearRect(0, 0, W, H);
        const vals = curve.flat().filter(isFinite), hi = Math.min(1.2, Math.max(...vals) * 1.1);
        const B = LW.axes(ctx, { x: 60, y: 22, w: W - 72, h: H - 62 }, { xr: [0, 13], yr: [0, hi], xlabel: "polynomial degree", ylabel: "RMSE", title: "Error against model complexity", colors: C, nx: 7 });
        B.clip();
        const ds = curve.map((_, i) => i);
        LW.path(ctx, ds, curve.map(c => Math.min(c[0], hi * 1.5)), B, { color: C.ink, width: 2 });
        LW.path(ctx, ds, curve.map(c => Math.min(c[1], hi * 1.5)), B, { color: C.orange, width: 2 });
        ctx.strokeStyle = C.accent; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(B.sx(deg), B.box.y); ctx.lineTo(B.sx(deg), B.box.y + B.box.h); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
        LW.text(ctx, "training", B.sx(12.8), B.sy(Math.min(curve[13][0], hi * .95)) - 6, { color: C.ink2, size: 11, align: "right" });
        LW.text(ctx, "validation", B.sx(12.8), B.sy(Math.min(curve[12][1], hi * .95)) - 6, { color: C.orange, size: 11, align: "right" });
      }
      let best = 0; curve.forEach((c, i) => { if (c[1] < curve[best][1]) best = i; });
      S.set("tr", w ? LW.fmt(rmse(w, data.tr), 3) : "–"); S.set("va", w ? LW.fmt(rmse(w, data.va), 3) : "–");
      S.set("nw", w ? LW.fmt(Math.hypot(...w), 2) : "–"); S.set("best", String(best));
    }
    P.draw = Q.draw = draw;
    make(); draw();
  });
})();
