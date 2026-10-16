/* 4.3 Attention: scaled dot-product attention over a short token sequence with 2D embeddings,
   learnable query/key projections, a causal mask and rotary position encoding. */
(function () {
  "use strict";
  const TOK = ["Li", "Fe", "P", "O", "O", "O", "O"];
  LW.register("attention", function (root) {
    const emb = { Li: [-0.9, 0.55], Fe: [-0.55, 0.95], P: [0.35, 0.9], O: [0.95, -0.35] };
    let thq = 0, thk = 0, scale = 2, sel = 3, causal = false, rope = false, omega = 0.6, drag = null;
    const row = LW.h("div", { class: "lw-row", style: { gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" } }); root.append(row);
    const left = LW.h("div"), right = LW.h("div"); row.append(left, right);
    const P = LW.canvas(left, { height: w => Math.min(w, 360) });
    const Q = LW.canvas(right, { height: w => Math.min(w + 30, 390) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Query projection W<sub>Q</sub>: rotation", min: -180, max: 180, step: 1, value: 0, fmt: v => v.toFixed(0) + "°", onInput: v => { thq = v * Math.PI / 180; draw(); } });
    LW.slider(ctl, { label: "Key projection W<sub>K</sub>: rotation", min: -180, max: 180, step: 1, value: 0, fmt: v => v.toFixed(0) + "°", onInput: v => { thk = v * Math.PI / 180; draw(); } });
    LW.slider(ctl, { label: "Sharpness (scale of W<sub>Q</sub>)", min: 0.2, max: 8, value: scale, log: true, fmt: v => v.toFixed(2), onInput: v => { scale = v; draw(); } });
    const c2 = LW.controls(root);
    LW.check(c2, { label: "Causal mask (attend only to earlier tokens)", value: false, onChange: v => { causal = v; draw(); } });
    LW.check(c2, { label: "Rotary position encoding (RoPE)", value: false, onChange: v => { rope = v; draw(); } });
    LW.note(root, "Click a token in the matrix (or a row label) to make it the query. Drag the element points on the left to change their embeddings. Without position information, the four O tokens are indistinguishable: their rows are identical.");
    const rotv = (v, a) => [Math.cos(a) * v[0] - Math.sin(a) * v[1], Math.sin(a) * v[0] + Math.cos(a) * v[1]];
    function compute() {
      const q = TOK.map((t, i) => { let v = rotv(emb[t], thq).map(x => x * scale); if (rope) v = rotv(v, i * omega); return v; });
      const k = TOK.map((t, j) => { let v = rotv(emb[t], thk); if (rope) v = rotv(v, j * omega); return v; });
      const A = q.map((qi, i) => { const s = k.map((kj, j) => (causal && j > i ? -Infinity : (qi[0] * kj[0] + qi[1] * kj[1]) / Math.SQRT2)); const m = Math.max(...s); const e = s.map(x => Math.exp(x - m)); const z = e.reduce((a, b) => a + b, 0); return e.map(x => x / z); });
      const out = A.map(a => a.reduce((acc, w, j) => [acc[0] + w * emb[TOK[j]][0], acc[1] + w * emb[TOK[j]][1]], [0, 0]));
      return { q, k, A, out };
    }
    let geoP = null, geoQ = null;
    function draw() {
      const C = LW.colors(), R = compute();
      { const { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2, sc = Math.min(W, H) / 2.7; geoP = { cx, cy, sc };
        ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.arc(cx, cy, sc, 0, 2 * Math.PI); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - sc * 1.25, cy); ctx.lineTo(cx + sc * 1.25, cy); ctx.moveTo(cx, cy - sc * 1.25); ctx.lineTo(cx, cy + sc * 1.25); ctx.stroke();
        const a = R.A[sel];
        TOK.forEach((t, j) => { if (a[j] > 0.01) { const e = emb[t]; ctx.strokeStyle = C.accent; ctx.globalAlpha = Math.min(1, a[j] * 1.6); ctx.lineWidth = 1 + 7 * a[j]; ctx.beginPath(); ctx.moveTo(cx + R.out[sel][0] * sc, cy - R.out[sel][1] * sc); ctx.lineTo(cx + e[0] * sc, cy - e[1] * sc); ctx.stroke(); ctx.globalAlpha = 1; } });
        const qv = R.q[sel], qs = Math.min(1.15, Math.hypot(...qv)) / Math.hypot(...qv);
        LW.arrow(ctx, cx, cy, cx + qv[0] * qs * sc, cy - qv[1] * qs * sc, C.orange, 2.4, 9);
        LW.text(ctx, "query (direction)", cx + qv[0] * qs * sc + 6, cy - qv[1] * qs * sc - 6, { color: C.orange, size: 11, weight: 600 });
        Object.entries(emb).forEach(([t, e]) => { LW.dot(ctx, cx + e[0] * sc, cy - e[1] * sc, 16, t === "O" ? C.rose : t === "P" ? C.gold : C.atomA, C.card, 2); LW.text(ctx, t, cx + e[0] * sc, cy - e[1] * sc + 1, { color: "#fff", size: 11, weight: 700, align: "center", base: "middle" }); });
        LW.dot(ctx, cx + R.out[sel][0] * sc, cy - R.out[sel][1] * sc, 6, C.ink, C.card, 2);
        LW.text(ctx, "output for token " + (sel + 1), cx + R.out[sel][0] * sc + 9, cy - R.out[sel][1] * sc + 14, { color: C.ink2, size: 11 });
        LW.text(ctx, "embedding space (d = 2)", 8, 16, { color: C.ink3, size: 11 });
      }
      { const { ctx, W, H } = Q; ctx.clearRect(0, 0, W, H);
        const n = TOK.length, lab = 46, top = 46, cell = Math.min((W - lab - 8) / n, (H - top - 8) / n); geoQ = { lab, top, cell };
        LW.text(ctx, "attention weights (row = query, column = key)", 4, 14, { color: C.ink3, size: 11 });
        TOK.forEach((t, j) => LW.text(ctx, t + (j + 1), lab + (j + 0.5) * cell, top - 8, { color: C.ink2, size: 11, align: "center", mono: true }));
        R.A.forEach((rowA, i) => {
          LW.text(ctx, TOK[i] + (i + 1), lab - 8, top + (i + 0.5) * cell, { color: i === sel ? C.orange : C.ink2, size: 11, align: "right", base: "middle", mono: true, weight: i === sel ? 700 : 500 });
          rowA.forEach((w, j) => { const fill = causal && j > i ? (C.dark ? "#0b1020" : "#eceff4") : LW.ramp(w * 1.4, C); ctx.fillStyle = fill; ctx.fillRect(lab + j * cell + 1, top + i * cell + 1, cell - 2, cell - 2);
            if (!(causal && j > i) && cell > 30) LW.text(ctx, w.toFixed(2), lab + (j + 0.5) * cell, top + (i + 0.5) * cell + 1, { color: LW.onColor(fill), size: 10, align: "center", base: "middle", mono: true }); });
        });
        ctx.strokeStyle = C.orange; ctx.lineWidth = 2; ctx.strokeRect(lab, top + sel * cell, n * cell, cell);
      }
    }
    P.draw = Q.draw = draw;
    LW.drag(Q.cv, { down: p => { if (!geoQ) return false; const i = Math.floor((p.y - geoQ.top) / geoQ.cell); if (i >= 0 && i < TOK.length) { sel = i; draw(); } return false; } });
    LW.drag(P.cv, {
      down: p => { if (!geoP) return false; const hit = Object.keys(emb).find(t => Math.hypot(geoP.cx + emb[t][0] * geoP.sc - p.x, geoP.cy - emb[t][1] * geoP.sc - p.y) < 18); if (!hit) return false; drag = hit; },
      move: p => { if (!drag) return; emb[drag] = [LW.clamp((p.x - geoP.cx) / geoP.sc, -1.2, 1.2), LW.clamp((geoP.cy - p.y) / geoP.sc, -1.2, 1.2)]; draw(); },
      up: () => { drag = null; }
    });
    draw();
  });
})();
