/* 3.3 From trajectories to properties: correlated time series, autocorrelation and block averaging. */
(function () {
  "use strict";
  LW.register("blockavg", function (root) {
    const n = 8192, mu = 1.0, sd = 0.25;
    let tau = 40, seed = 1, transient = false, discard = 0, series;
    const P = LW.canvas(root, { aspect: 0.26, minH: 170, maxH: 230 });
    const row = LW.h("div", { class: "lw-row", style: { gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" } }); root.append(row);
    const l = LW.h("div"), r = LW.h("div"); row.append(l, r);
    const Q = LW.canvas(l, { aspect: 0.72, minH: 210, maxH: 300 });
    const R = LW.canvas(r, { aspect: 0.72, minH: 210, maxH: 300 });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Correlation time τ (steps)", min: 1, max: 400, value: tau, log: true, fmt: v => v.toFixed(0), onInput: v => { tau = v; make(); draw(); } });
    LW.slider(ctl, { label: "Discard first (steps)", min: 0, max: 3000, step: 50, value: discard, fmt: v => v.toFixed(0), onInput: v => { discard = v; draw(); } });
    const c2 = LW.controls(root);
    LW.check(c2, { label: "Start far from equilibrium", value: transient, onChange: v => { transient = v; make(); draw(); } });
    LW.button(c2, "New trajectory", () => { seed++; make(); draw(); });
    const S = LW.stats(root, [["m", "mean"], ["naive", "naive error σ/√N", "bad"], ["block", "block-average error", "good"], ["true", "exact error (known τ)"], ["neff", "effective samples"]]);
    function make() {
      const r = LW.rng(seed * 7 + 3), phi = Math.exp(-1 / tau), s = Math.sqrt(1 - phi * phi);
      series = new Float64Array(n); let v = r.normal();
      for (let i = 0; i < n; i++) { v = phi * v + s * r.normal(); series[i] = mu + sd * v + (transient ? 1.2 * Math.exp(-i / 500) : 0); }
    }
    function stats() {
      const xs = series.subarray(Math.min(discard, n - 512)), N = xs.length;
      let m = 0; for (const v of xs) m += v; m /= N; let vv = 0; for (const v of xs) vv += (v - m) ** 2; vv /= N - 1;
      const blocks = [];
      for (let b = 1; b <= N / 8; b *= 2) { const M = Math.floor(N / b); let bm = []; for (let k = 0; k < M; k++) { let s = 0; for (let i = 0; i < b; i++) s += xs[k * b + i]; bm.push(s / b); } let bmu = bm.reduce((a, c) => a + c, 0) / M, bv = bm.reduce((a, c) => a + (c - bmu) ** 2, 0) / (M - 1); blocks.push([b, Math.sqrt(bv / M), Math.sqrt(bv / M) / Math.sqrt(2 * (M - 1))]); }
      const maxLag = Math.min(Math.floor(N / 4), Math.round(6 * tau) + 10), lags = [], acf = [];
      for (let j = 0; j <= 160; j++) { const k = Math.round(j * maxLag / 160); if (lags.length && k === lags[lags.length - 1]) continue; lags.push(k); let c = 0; for (let i = 0; i + k < N; i++) c += (xs[i] - m) * (xs[i + k] - m); acf.push(c / (N - k) / vv); }
      const phi = Math.exp(-1 / tau), tint = (1 + phi) / (2 * (1 - phi));
      const plateau = blocks.length > 3 ? Math.max(...blocks.slice(Math.floor(blocks.length * 0.6)).map(b => b[1])) : blocks[blocks.length - 1][1];
      return { xs, N, m, vv, blocks, acf, lags, maxLag, tint, plateau, trueSE: sd * Math.sqrt(2 * tint / N) };
    }
    function draw() {
      const C = LW.colors(), st = stats();
      { const { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
        const A = LW.axes(ctx, { x: 58, y: 10, w: W - 70, h: H - 50 }, { xr: [0, n], yr: [mu - 4 * sd, mu + 4 * sd + (transient ? 1.2 : 0)], xlabel: "MD step", ylabel: "observable", colors: C, ny: 3 });
        A.clip(); const step = Math.max(1, Math.floor(n / A.box.w / 2)), xs = [], ys = [];
        for (let i = 0; i < n; i += step) { xs.push(i); ys.push(series[i]); }
        if (discard > 0) { ctx.fillStyle = C.dark ? "rgba(255,122,165,.10)" : "rgba(214,51,108,.08)"; ctx.fillRect(A.box.x, A.box.y, A.sx(discard) - A.box.x, A.box.h); }
        LW.path(ctx, xs, ys, A, { color: C.accent, width: 1 });
        ctx.strokeStyle = C.orange; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(A.sx(discard), A.sy(st.m)); ctx.lineTo(A.box.x + A.box.w, A.sy(st.m)); ctx.stroke();
        ctx.restore();
        if (discard > 0) LW.text(ctx, "discarded", A.sx(discard / 2), A.box.y + 14, { color: C.rose, size: 11, align: "center" });
      }
      { const { ctx, W, H } = Q; ctx.clearRect(0, 0, W, H);
        const bs = st.blocks, hi = Math.max(...bs.map(b => b[1] + b[2]), st.trueSE) * 1.15;
        const B = LW.axes(ctx, { x: 64, y: 22, w: W - 76, h: H - 62 }, { xr: [0, Math.log2(bs[bs.length - 1][0])], yr: [0, hi], xlabel: "block size (steps)", ylabel: "error of the mean", title: "Block averaging", colors: C, xfmt: v => String(2 ** v), xticks: bs.map(b => Math.log2(b[0])).filter((v, i) => i % 2 === 0), yfmt: v => v.toExponential(0) });
        B.clip();
        ctx.strokeStyle = C.ink3; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(B.box.x, B.sy(st.trueSE)); ctx.lineTo(B.box.x + B.box.w, B.sy(st.trueSE)); ctx.stroke(); ctx.setLineDash([]);
        bs.forEach(b => { const X = B.sx(Math.log2(b[0])); ctx.strokeStyle = C.teal; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X, B.sy(b[1] - b[2])); ctx.lineTo(X, B.sy(b[1] + b[2])); ctx.stroke(); });
        LW.path(ctx, bs.map(b => Math.log2(b[0])), bs.map(b => b[1]), B, { color: C.teal, width: 2 });
        bs.forEach(b => LW.dot(ctx, B.sx(Math.log2(b[0])), B.sy(b[1]), 3.5, C.teal));
        ctx.restore();
        LW.text(ctx, "exact", B.box.x + B.box.w - 4, B.sy(st.trueSE) - 5, { color: C.ink3, size: 11, align: "right" });
        LW.text(ctx, "block size 1 = naive σ/√N", B.box.x + 6, B.sy(bs[0][1]) - 8, { color: C.rose, size: 11 });
      }
      { const { ctx, W, H } = R; ctx.clearRect(0, 0, W, H);
        const lags = st.lags;
        const B = LW.axes(ctx, { x: 58, y: 22, w: W - 70, h: H - 62 }, { xr: [0, st.maxLag], yr: [-0.2, 1.05], xlabel: "lag (steps)", ylabel: "C(lag)", title: "Autocorrelation function", colors: C });
        B.clip(); ctx.strokeStyle = C.line2; ctx.beginPath(); ctx.moveTo(B.box.x, B.sy(0)); ctx.lineTo(B.box.x + B.box.w, B.sy(0)); ctx.stroke();
        LW.path(ctx, lags, lags.map(k => Math.exp(-k / tau)), B, { color: C.ink3, width: 1.5, dash: [5, 4] });
        LW.path(ctx, lags, st.acf, B, { color: C.violet, width: 2 }); ctx.restore();
        LW.text(ctx, "dashed: e^(−lag/τ)", B.box.x + B.box.w - 4, B.box.y + 14, { color: C.ink3, size: 11, align: "right" });
      }
      S.set("m", LW.fmt(st.m, 4)); S.set("naive", LW.fmt(Math.sqrt(st.vv / st.N), 4)); S.set("block", LW.fmt(st.plateau, 4)); S.set("true", LW.fmt(st.trueSE, 4)); S.set("neff", Math.round(st.N / (2 * st.tint)) + " of " + st.N);
    }
    P.draw = Q.draw = R.draw = draw;
    make(); draw();
  });
})();
