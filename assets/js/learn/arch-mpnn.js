/* 4.2 Graph neural networks: message passing on the heavy-atom graph of aspirin. */
(function () {
  "use strict";
  const NODES = [["C", 0.866, 0.5], ["C", 0, 1], ["C", -0.866, 0.5], ["C", -0.866, -0.5], ["C", 0, -1], ["C", 0.866, -0.5],
    ["C", 1.732, 1.0], ["O", 2.598, 0.5], ["O", 1.732, 2.0], ["O", 0, 2.0], ["C", -0.866, 2.5], ["O", -1.732, 2.0], ["C", -0.866, 3.5]];
  const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6], [6, 7], [6, 8], [1, 9], [9, 10], [10, 11], [10, 12]];
  const RING = new Set([0, 1, 2, 3, 4, 5]);
  const D = 6;
  LW.register("mpnn", function (root) {
    const n = NODES.length, nb = NODES.map(() => []); EDGES.forEach(([a, b]) => { nb[a].push(b); nb[b].push(a); });
    const r = LW.rng(2024), mat = (o, i) => Array.from({ length: o }, () => Array.from({ length: i }, () => r.normal() * 0.8 / Math.sqrt(i)));
    const W0 = { self: mat(D, 4), msg: mat(D, 4) }, Wk = { self: mat(D, D), msg: mat(D, D) }, wOut = Array.from({ length: D }, () => r.normal());
    const h0 = NODES.map(([el], i) => [el === "C" ? 1 : 0, el === "O" ? 1 : 0, nb[i].length / 3, RING.has(i) ? 1 : 0]);
    /* run the network on a graph given as features + neighbour lists, in whatever node order */
    function propagate(feat, nbrs) {
      const out = [feat];
      for (let k = 0; k < 4; k++) { const W = k === 0 ? W0 : Wk, prev = out[k]; out.push(prev.map((h, i) => W.self.map((row, o) => Math.tanh(row.reduce((s, w, q) => s + w * h[q], 0) + nbrs[i].reduce((s, j) => s + W.msg[o].reduce((t, w, q) => t + w * prev[j][q], 0), 0))))); }
      return out;
    }
    const readout = (Hs, k) => { const g = Array.from({ length: D }, (_, q) => Hs[k].reduce((s, h) => s + (h[q] || 0), 0)); return g.reduce((s, v, q) => s + v * wOut[q], 0) / n; };
    const H = propagate(h0, nb);
    let perm = NODES.map((_, i) => i);   // perm[newIndex] = oldIndex
    function permuted() { const inv = []; perm.forEach((old, nw) => { inv[old] = nw; }); return propagate(perm.map(o => h0[o]), perm.map(o => nb[o].map(j => inv[j]))); }
    let layer = 0, sel = 9, anim = 0, labels = NODES.map((_, i) => i + 1);
    const P = LW.canvas(root, { aspect: 0.62, minH: 300, maxH: 460 });
    const ctl = LW.controls(root);
    const ls = LW.slider(ctl, { label: "Message-passing layers k", min: 0, max: 4, step: 1, value: 0, fmt: v => String(v), onInput: v => { layer = v; draw(); } });
    LW.button(ctl, "Pass one round of messages", () => { if (layer >= 4) { layer = 0; ls.set(0); draw(); return; } anim = 0.0001; loop.start(); }, { primary: true });
    LW.button(ctl, "Renumber the atoms", () => { for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; } perm.forEach((old, nw) => { labels[old] = nw + 1; }); Hp = permuted(); draw(); });
    let Hp = H;
    const S = LW.stats(root, [["rf", "atoms that can influence the selected atom"], ["ro", "graph readout (sum, then a linear layer)"], ["inv", "readout recomputed in the new atom order"]]);
    LW.note(root, "Click an atom to select it. The shaded region is its receptive field after k layers: only these atoms can affect its features. The coloured strip next to each atom is its 6-number feature vector.");
    const loop = LW.loop(root, dt => { anim += dt / 0.9; if (anim >= 1) { anim = 0; layer = Math.min(4, layer + 1); ls.set(layer); loop.stop(); } draw(); });
    const hops = () => { const d = NODES.map(() => Infinity); d[sel] = 0; const q = [sel]; while (q.length) { const u = q.shift(); nb[u].forEach(v => { if (d[v] === Infinity) { d[v] = d[u] + 1; q.push(v); } }); } return d; };
    let geo = null;
    function draw() {
      const C = LW.colors(), { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH);
      const xs = NODES.map(a => a[1]), ys = NODES.map(a => a[2]), minx = Math.min(...xs) - 0.9, maxx = Math.max(...xs) + 1.6, miny = Math.min(...ys) - 0.6, maxy = Math.max(...ys) + 0.6;
      const sc = Math.min((W - 20) / (maxx - minx), (HH - 20) / (maxy - miny)), ox = (W - (maxx - minx) * sc) / 2 - minx * sc, oy = HH - ((HH - (maxy - miny) * sc) / 2) + miny * sc;
      const X = i => ox + NODES[i][1] * sc, Y = i => oy - NODES[i][2] * sc; geo = { X, Y, sc };
      const d = hops(), shown = Math.min(4, layer + (anim > 0 ? 1 : 0));
      NODES.forEach((_, i) => { if (d[i] <= layer) LW.dot(ctx, X(i), Y(i), sc * 0.62, C.dark ? "rgba(135,150,255,.13)" : "rgba(59,80,224,.09)", null); });
      EDGES.forEach(([a, b]) => { const on = d[a] <= layer && d[b] <= layer; ctx.strokeStyle = on ? C.accent : C.line2; ctx.lineWidth = on ? 3 : 2.4; ctx.beginPath(); ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b)); ctx.stroke(); });
      if (anim > 0) EDGES.forEach(([a, b]) => { for (const [u, v] of [[a, b], [b, a]]) { const t = anim; LW.dot(ctx, X(u) + (X(v) - X(u)) * t, Y(u) + (Y(v) - Y(u)) * t, 3.5, C.orange, null); } });
      const Hk = H[layer], mx = Math.max(...Hk.flat().map(Math.abs), 1e-9);
      NODES.forEach(([el], i) => {
        const isSel = i === sel, dim = d[i] > layer ? 0.45 : 1;
        ctx.globalAlpha = dim; LW.dot(ctx, X(i), Y(i), sc * 0.24, el === "O" ? C.rose : C.ink2, isSel ? C.accent : C.card, isSel ? 3.5 : 2); ctx.globalAlpha = 1;
        LW.text(ctx, el, X(i), Y(i) + 1, { color: "#fff", size: 12, weight: 700, align: "center", base: "middle" });
        LW.text(ctx, String(labels[i]), X(i) - sc * 0.3, Y(i) - sc * 0.22, { color: C.ink3, size: 10, align: "right", mono: true });
        const cw = Math.max(4, sc * 0.09), x0 = X(i) + sc * 0.3, y0 = Y(i) - cw * 1.6;
        Hk[i].forEach((v, q) => { ctx.fillStyle = LW.diverge(v / mx, C); ctx.fillRect(x0 + (q % 3) * cw, y0 + Math.floor(q / 3) * cw, cw - 1, cw - 1); });
      });
      LW.text(ctx, "layer k = " + layer + (shown > layer ? " → " + shown : ""), 10, 18, { color: C.ink2, size: 12, weight: 600 });
      const out = readout(H, layer), out2 = readout(Hp, layer);
      const rf = d.filter(v => v <= layer).length;
      S.set("rf", rf + " of " + n); S.set("ro", LW.fmt(out, 6)); S.set("inv", LW.fmt(out2, 6) + (Math.abs(out - out2) < 1e-12 ? " ✓ identical" : ""));
    }
    P.draw = draw;
    LW.drag(P.cv, { down: p => { if (!geo) return false; const i = NODES.findIndex((_, k) => Math.hypot(geo.X(k) - p.x, geo.Y(k) - p.y) < geo.sc * 0.32); if (i >= 0) { sel = i; draw(); } return false; }, hover: p => { if (!geo || !p) return; P.cv.style.cursor = NODES.some((_, k) => Math.hypot(geo.X(k) - p.x, geo.Y(k) - p.y) < geo.sc * 0.32) ? "pointer" : "default"; } });
    draw();
  });
})();
