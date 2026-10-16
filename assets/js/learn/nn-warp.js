/* Machine learning, part 1: how a network with 2-neuron hidden layers bends the plane until the
   classes become separable by a straight line. Each layer = linear map, then tanh. */
(function () {
  "use strict";
  const SETS = {
    moons: { name: "Two moons", gen: r => { const p = []; for (let i = 0; i < 70; i++) { const t = Math.PI * r(); p.push({ x: Math.cos(t) * 1.4 - 0.5 + 0.12 * r.normal(), y: Math.sin(t) * 1.4 - 0.35 + 0.12 * r.normal(), c: 0 }); p.push({ x: 1.4 - Math.cos(t) * 1.4 - 0.5 + 0.12 * r.normal(), y: -Math.sin(t) * 1.4 + 0.75 + 0.12 * r.normal(), c: 1 }); } return p; } },
    xor: { name: "XOR (four corners)", gen: r => { const p = []; for (let i = 0; i < 40; i++) [[1, 1, 0], [-1, -1, 0], [1, -1, 1], [-1, 1, 1]].forEach(([a, bb, c]) => p.push({ x: a * 1.2 + 0.35 * r.normal(), y: bb * 1.2 + 0.35 * r.normal(), c })); return p; } },
    circles: { name: "Circle inside a ring", gen: r => { const p = []; for (let i = 0; i < 80; i++) { const t = 2 * Math.PI * r(), q = 2 * Math.PI * r(); p.push({ x: 0.6 * Math.cos(t) * r(), y: 0.6 * Math.sin(t) * r(), c: 0 }); p.push({ x: 1.9 * Math.cos(q) + 0.12 * r.normal(), y: 1.9 * Math.sin(q) + 0.12 * r.normal(), c: 1 }); } return p; } }
  };
  LW.register("warp", function (root) {
    let key = "moons", data, net, adam, stage = 4, epoch = 0, seed = 1;
    const P = LW.canvas(root, { height: w => Math.min(460, w * 0.62) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Data", options: Object.keys(SETS).map(k => [k, SETS[k].name]), value: key, onChange: v => { key = v; init(); } });
    const runB = LW.button(ctl, "Train", () => { runB.textContent = loop.toggle() ? "Pause" : "Train"; }, { primary: true });
    LW.button(ctl, "New initial weights", () => { seed++; init(); });
    const c2 = LW.controls(root);
    const st = LW.slider(c2, { label: "View the data after…", min: 0, max: 4, step: 0.01, value: stage, fmt: v => ["input", "layer 1: linear", "layer 1: tanh", "layer 2: linear", "layer 2: tanh"][Math.round(v)] || v.toFixed(2), onInput: v => { stage = v; draw(); } });
    const playB = LW.button(c2, "Play the transformation", () => { stage = 0; morph.start(); });
    const S = LW.stats(root, [["ep", "training steps"], ["acc", "accuracy"], ["loss", "loss"]]);
    const msg = LW.note(root, "");
    function init() {
      const r = LW.rng(seed * 17 + 3); data = SETS[key].gen(LW.rng(11));
      const m = () => [[r.normal() * 2, r.normal() * 2], [r.normal() * 2, r.normal() * 2]];
      net = { W1: m(), b1: [0, 0], W2: m(), b2: [0, 0], v: [r.normal(), r.normal()], c: 0 };
      adam = {}; epoch = 0; stage = 4; st.set(4); draw();
    }
    const lin = (W, bb, p) => [W[0][0] * p[0] + W[0][1] * p[1] + bb[0], W[1][0] * p[0] + W[1][1] * p[1] + bb[1]];
    const th = p => [Math.tanh(p[0]), Math.tanh(p[1])];
    function forward(p) { const a1 = lin(net.W1, net.b1, p), h1 = th(a1), a2 = lin(net.W2, net.b2, h1), h2 = th(a2), z = net.v[0] * h2[0] + net.v[1] * h2[1] + net.c; return { a1, h1, a2, h2, z }; }
    function at(p, s) { // continuous interpolation between consecutive representations
      const f = forward(p), reps = [p, f.a1, f.h1, f.a2, f.h2], k = Math.min(3, Math.floor(s)), t = s - k;
      if (s >= 4) return f.h2; const A = reps[k], B = reps[k + 1], e = t * t * (3 - 2 * t); return [A[0] + (B[0] - A[0]) * e, A[1] + (B[1] - A[1]) * e];
    }
    const sig = z => 1 / (1 + Math.exp(-z));
    function trainStep() {
      const g = { W1: [[0, 0], [0, 0]], b1: [0, 0], W2: [[0, 0], [0, 0]], b2: [0, 0], v: [0, 0], c: 0 }, n = data.length;
      data.forEach(pt => { const p = [pt.x, pt.y], f = forward(p), e = (sig(f.z) - pt.c) / n;
        g.v[0] += e * f.h2[0]; g.v[1] += e * f.h2[1]; g.c += e;
        const d2 = [e * net.v[0] * (1 - f.h2[0] ** 2), e * net.v[1] * (1 - f.h2[1] ** 2)];
        for (let i = 0; i < 2; i++) { g.b2[i] += d2[i]; for (let j = 0; j < 2; j++) g.W2[i][j] += d2[i] * f.h1[j]; }
        const d1 = [0, 1].map(j => (d2[0] * net.W2[0][j] + d2[1] * net.W2[1][j]) * (1 - f.h1[j] ** 2));
        for (let i = 0; i < 2; i++) { g.b1[i] += d1[i]; for (let j = 0; j < 2; j++) g.W1[i][j] += d1[i] * p[j]; } });
      const upd = (path, grad, get, set) => { const key2 = path; const s = adam[key2] || (adam[key2] = { m: 0, v: 0 }); s.m = 0.9 * s.m + 0.1 * grad; s.v = 0.999 * s.v + 0.001 * grad * grad; const t = epoch + 1; set(get() - 0.03 * (s.m / (1 - 0.9 ** t)) / (Math.sqrt(s.v / (1 - 0.999 ** t)) + 1e-8)); };
      for (const M of ["W1", "W2"]) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) upd(M + i + j, g[M][i][j], () => net[M][i][j], x => { net[M][i][j] = x; });
      for (const B of ["b1", "b2", "v"]) for (let i = 0; i < 2; i++) upd(B + i, g[B][i], () => net[B][i], x => { net[B][i] = x; });
      upd("c", g.c, () => net.c, x => { net.c = x; });
      epoch++;
    }
    const loop = LW.loop(root, () => { for (let k = 0; k < 10; k++) trainStep(); draw(); if (epoch > 6000) { loop.stop(); runB.textContent = "Train"; } });
    const morph = LW.loop(root, dt => { stage = Math.min(4, stage + dt * 0.8); st.set(stage); draw(); if (stage >= 4) morph.stop(); });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const pts = data.map(d => ({ q: at([d.x, d.y], stage), c: d.c }));
      // view box: fit the transformed data (and the grid) smoothly
      let xs = pts.map(p => p.q[0]), ys = pts.map(p => p.q[1]); const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1.2) * 0.62 + 0.2;
      const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2, sc = Math.min(W, H) / (2 * span) * 0.92;
      const X = p => W / 2 + (p[0] - cx) * sc, Y = p => H / 2 - (p[1] - cy) * sc;
      ctx.fillStyle = C.bg2; ctx.fillRect(0, 0, W, H);
      // the input grid, carried along by the network
      ctx.lineWidth = 1;
      for (let g = -3; g <= 3.001; g += 0.5) for (const dir of [0, 1]) {
        ctx.strokeStyle = Math.abs(g) < 1e-9 ? C.ink3 : C.line2; ctx.beginPath();
        for (let k = 0; k <= 60; k++) { const s = -3 + k * 0.1, p = at(dir ? [g, s] : [s, g], stage), x = X(p), y = Y(p); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke(); }
      // decision line in the final space
      if (stage > 3.98 && (Math.abs(net.v[0]) + Math.abs(net.v[1])) > 1e-6) { const v = net.v, c0 = net.c, ptsL = Math.abs(v[1]) > Math.abs(v[0]) ? [[-2, (-c0 + 2 * v[0]) / v[1]], [2, (-c0 - 2 * v[0]) / v[1]]] : [[(-c0 + 2 * v[1]) / v[0], -2], [(-c0 - 2 * v[1]) / v[0], 2]];
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(X(ptsL[0]), Y(ptsL[0])); ctx.lineTo(X(ptsL[1]), Y(ptsL[1])); ctx.stroke(); ctx.setLineDash([]); }
      pts.forEach(p => LW.dot(ctx, X(p.q), Y(p.q), 4.2, p.c ? "#f08c2e" : "#4c6ef5", C.card, 1.2));
      const names = ["the input plane", "after the first linear map (rotate, stretch, shift)", "after tanh: the plane is squashed into a square", "after the second linear map", "after the second tanh: the final representation"];
      LW.text(ctx, names[Math.round(stage)] || "", 10, 18, { color: C.ink2, size: 12, weight: 600 });
      let correct = 0, loss = 0; data.forEach(d => { const q = sig(forward([d.x, d.y]).z); if ((q > 0.5) === !!d.c) correct++; loss -= d.c ? Math.log(Math.max(q, 1e-9)) : Math.log(Math.max(1 - q, 1e-9)); });
      S.set("ep", String(epoch)); S.set("acc", Math.round(100 * correct / data.length) + " %"); S.set("loss", LW.fmt(loss / data.length, 3));
      msg.set(key === "circles" && epoch > 1500 && correct / data.length < 0.95 ? "<b>It cannot succeed.</b> With only two neurons per layer every layer maps the plane continuously onto a plane, and no such map can pull the inner circle out of the ring without tearing. A third neuron (a third dimension) would let it lift the centre out; this is a question of topology, not of training." : "Press Train, then drag the view slider from “input” to “layer 2: tanh” (or press Play) to watch the network straighten the classes out. The dashed line is the final neuron's decision boundary.");
    }
    P.draw = draw; init();
  });
})();
