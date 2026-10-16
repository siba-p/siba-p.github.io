/* 4.1 Symmetry and descriptors: rotate, translate, renumber, reflect or distort a cluster and see
   which descriptors change. */
(function () {
  "use strict";
  const BASE = [[0, 0, "A"], [1.45, 0.35, "A"], [0.55, 1.4, "B"], [-0.95, 1.05, "A"], [-1.25, -0.55, "B"], [0.35, -1.35, "A"]];
  LW.register("symmetry", function (root) {
    let atoms, theta = 0, tx = 0, ty = 0, mirror = 1, order, ref = null, drag = -1;
    const row = LW.h("div", { class: "lw-row", style: { gridTemplateColumns: "minmax(0,0.9fr) minmax(0,1.1fr)" } }); root.append(row);
    const left = LW.h("div"), right = LW.h("div"); row.append(left, right);
    const P = LW.canvas(left, { height: w => Math.min(w, 380) });
    const Q = LW.canvas(right, { height: 380 });
    const ctl = LW.controls(root);
    const rot = LW.slider(ctl, { label: "Rotate the whole cluster", min: 0, max: 360, step: 1, value: 0, fmt: v => v.toFixed(0) + "°", onInput: v => { theta = v * Math.PI / 180; draw(); } });
    LW.slider(ctl, { label: "Translate along x", min: -1.5, max: 1.5, step: 0.01, value: 0, fmt: v => v.toFixed(2) + " Å", onInput: v => { tx = v; draw(); } });
    const c2 = LW.controls(root);
    LW.button(c2, "Renumber atoms 1 ↔ 4", () => { [order[0], order[3]] = [order[3], order[0]]; draw(); });
    LW.button(c2, "Mirror image", () => { mirror *= -1; draw(); });
    LW.button(c2, "Reset", () => reset(), { primary: true });
    LW.note(root, "Drag an atom to change the structure itself; every symmetry operation above leaves the physics unchanged.");
    function reset() { atoms = BASE.map(a => ({ x: a[0], y: a[1], s: a[2] })); order = atoms.map((_, i) => i); theta = 0; tx = 0; ty = 0; mirror = 1; rot.set(0); ref = null; draw(); }
    function world() { // apply mirror, rotation, translation; return in the current numbering
      const c = Math.cos(theta), s = Math.sin(theta);
      return order.map(i => { const a = atoms[i], x = mirror * a.x; return { x: c * x - s * a.y + tx, y: s * x + c * a.y + ty, s: a.s, id: i }; });
    }
    function descriptors(W) {
      const raw = W.flatMap(a => [a.x, a.y]);
      const dist = []; for (let i = 0; i < W.length; i++) for (let j = i + 1; j < W.length; j++) dist.push(Math.hypot(W[i].x - W[j].x, W[i].y - W[j].y));
      dist.sort((a, b) => a - b);
      const rs = [1.0, 1.5, 2.0, 2.5, 3.0], eta = 4, fp = [];   // radial fingerprint of every atom, summed by species
      for (const sp of ["A", "B"]) for (const r0 of rs) { let g = 0; for (let i = 0; i < W.length; i++) for (let j = 0; j < W.length; j++) { if (i === j || W[j].s !== sp) continue; const r = Math.hypot(W[i].x - W[j].x, W[i].y - W[j].y); g += Math.exp(-eta * (r - r0) ** 2) * 0.5 * (Math.cos(Math.PI * Math.min(r, 3.5) / 3.5) + 1); } fp.push(g); }
      return { raw, dist, fp };
    }
    let D = null;
    function draw() {
      const C = LW.colors(), W = world(); D = descriptors(W); if (!ref) ref = JSON.parse(JSON.stringify(D));
      { const { ctx, W: w, H } = P; ctx.clearRect(0, 0, w, H);
        const sc = Math.min(w, H) / 7.2, cx = w / 2, cy = H / 2;
        ctx.strokeStyle = C.grid; for (let g = -4; g <= 4; g++) { ctx.beginPath(); ctx.moveTo(cx + g * sc, 0); ctx.lineTo(cx + g * sc, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, cy + g * sc); ctx.lineTo(w, cy + g * sc); ctx.stroke(); }
        LW.arrow(ctx, 14, H - 14, 54, H - 14, C.ink3, 1.4, 6); LW.arrow(ctx, 14, H - 14, 14, H - 54, C.ink3, 1.4, 6);
        LW.text(ctx, "x", 58, H - 10, { color: C.ink3, size: 11 }); LW.text(ctx, "y", 10, H - 60, { color: C.ink3, size: 11 });
        for (let i = 0; i < W.length; i++) for (let j = i + 1; j < W.length; j++) { const r = Math.hypot(W[i].x - W[j].x, W[i].y - W[j].y); if (r < 1.75) { ctx.strokeStyle = C.line2; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + W[i].x * sc, cy - W[i].y * sc); ctx.lineTo(cx + W[j].x * sc, cy - W[j].y * sc); ctx.stroke(); } }
        W.forEach((a, k) => { const X = cx + a.x * sc, Y = cy - a.y * sc; LW.dot(ctx, X, Y, a.s === "A" ? 15 : 18, a.s === "A" ? C.atomA : C.atomB, k === drag ? C.ink : null, 2); LW.text(ctx, String(k + 1), X, Y + 1, { color: "#fff", size: 12, weight: 700, align: "center", base: "middle" }); });
        P.map = { sc, cx, cy, W };
      }
      { const { ctx, W: w, H } = Q; ctx.clearRect(0, 0, w, H);
        const rows = [["Raw coordinates (x₁, y₁, x₂, …)", D.raw, ref.raw, true], ["Sorted pair distances", D.dist, ref.dist, false], ["Radial fingerprint (sum over atoms)", D.fp, ref.fp, false]];
        const hRow = (H - 12) / 3;
        rows.forEach(([title, v, r0, signed], k) => {
          const y0 = 6 + k * hRow, bh = hRow - 46, x0 = 8, ww = w - 16, n = v.length, bw = ww / n;
          const diff = Math.max(...v.map((x, i) => Math.abs(x - r0[i])));
          const same = diff < 1e-6;
          LW.text(ctx, title, x0, y0 + 13, { color: C.ink, size: 12, weight: 600 });
          LW.text(ctx, same ? "✓ unchanged" : "✗ changed", w - 8, y0 + 13, { color: same ? C.teal : C.rose, size: 12, weight: 600, align: "right" });
          const mx = Math.max(...v.map(Math.abs), ...r0.map(Math.abs), 1e-9), base = signed ? y0 + 22 + bh / 2 : y0 + 22 + bh;
          ctx.strokeStyle = C.line2; ctx.beginPath(); ctx.moveTo(x0, base + .5); ctx.lineTo(x0 + ww, base + .5); ctx.stroke();
          v.forEach((x, i) => {
            const hh = (signed ? bh / 2 : bh) * x / mx, rh = (signed ? bh / 2 : bh) * r0[i] / mx;
            ctx.fillStyle = C.band; ctx.fillRect(x0 + i * bw + bw * 0.12, base - rh, bw * 0.76, rh);
            ctx.fillStyle = signed ? C.accent : k === 1 ? C.teal : C.violet; ctx.fillRect(x0 + i * bw + bw * 0.22, base - hh, bw * 0.56, hh);
          });
        });
        LW.text(ctx, "pale bars: values at the start; solid bars: now", w - 8, H - 2, { color: C.ink3, size: 10.5, align: "right", base: "bottom" });
      }
    }
    P.draw = Q.draw = draw;
    const hit = p => { const m = P.map; if (!m) return -1; return m.W.findIndex(a => Math.hypot(m.cx + a.x * m.sc - p.x, m.cy - a.y * m.sc - p.y) < 18); };
    LW.drag(P.cv, {
      down: p => { const k = hit(p); if (k < 0) return false; drag = k; draw(); },
      move: p => { if (drag < 0) return; const m = P.map, wx = (p.x - m.cx) / m.sc - tx, wy = (m.cy - p.y) / m.sc - ty, c = Math.cos(-theta), s = Math.sin(-theta); const ax = c * wx - s * wy, ay = s * wx + c * wy; const a = atoms[order[drag]]; a.x = mirror * ax; a.y = ay; draw(); },
      up: () => { drag = -1; draw(); },
      hover: p => { P.cv.style.cursor = p && hit(p) >= 0 ? "grab" : "default"; }
    });
    reset();
  });
})();
