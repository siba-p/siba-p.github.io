/* Machine learning, part 1: a single artificial neuron, and a neuron learning to classify. */
(function () {
  "use strict";
  const COL = { x: "#4c6ef5", w: "#12a594", b: "#845ef7", z: "#d4a017", y: "#f08c2e", neg: "#e64980" };
  const ACT = {
    step: { name: "Step", f: z => (z >= 0 ? 1 : 0), lo: 0 },
    sigmoid: { name: "Sigmoid", f: z => 1 / (1 + Math.exp(-z)), lo: 0 },
    tanh: { name: "tanh", f: Math.tanh, lo: -1 },
    relu: { name: "ReLU", f: z => Math.max(0, z), lo: 0 }
  };
  const f2 = v => (v < 0 ? "−" : "") + Math.abs(v).toFixed(2);

  LW.register("neuron", function (root) {
    let w1 = 1.2, w2 = -0.8, b = 0.3, x1 = 1.0, x2 = 0.5, act = "sigmoid";
    const row = LW.h("div", { class: "lw-row", style: { gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)" } }); root.append(row);
    const L = LW.h("div"), R = LW.h("div"); row.append(L, R);
    const D = LW.canvas(L, { height: w => Math.min(300, Math.max(240, w * 0.62)) });
    const Pl = LW.canvas(R, { height: w => Math.min(340, w) });
    const eq = LW.h("div", { class: "nn-eq" }); root.append(eq);
    const ctl = LW.controls(root);
    const s1 = LW.slider(ctl, { label: `<span style="color:${COL.w}">weight w₁</span>`, min: -3, max: 3, step: 0.01, value: w1, fmt: f2, onInput: v => { w1 = v; draw(); } });
    const s2 = LW.slider(ctl, { label: `<span style="color:${COL.w}">weight w₂</span>`, min: -3, max: 3, step: 0.01, value: w2, fmt: f2, onInput: v => { w2 = v; draw(); } });
    LW.slider(ctl, { label: `<span style="color:${COL.b}">bias b</span>`, min: -3, max: 3, step: 0.01, value: b, fmt: f2, onInput: v => { b = v; draw(); } });
    const c2 = LW.controls(root);
    LW.seg(c2, { label: "Activation function σ", options: Object.keys(ACT).map(k => [k, ACT[k].name]), value: act, onChange: v => { act = v; draw(); } });
    LW.note(root, "Drag the white point in the right-hand plane to change the inputs. The colour shows the neuron's output for every possible input; the line is where z = 0. The arrow is the weight vector: the neuron fires most strongly in the direction it points.");
    let A = null;
    function draw() {
      const C = LW.colors(), F = ACT[act].f, z = w1 * x1 + w2 * x2 + b, y = F(z);
      { const { ctx, W, H } = D; ctx.clearRect(0, 0, W, H);
        const xi = W * 0.12, xs = W * 0.52, xo = W * 0.88, yi1 = H * 0.3, yi2 = H * 0.7, ys = H * 0.5, rN = Math.min(30, W * 0.06);
        const edge = (x0, y0, x1_, y1_, w, label) => { ctx.strokeStyle = w >= 0 ? COL.w : COL.neg; ctx.lineWidth = 1 + Math.abs(w) * 3; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1_, y1_); ctx.stroke(); ctx.globalAlpha = 1; LW.text(ctx, label, (x0 + x1_) / 2, (y0 + y1_) / 2 - 10, { color: w >= 0 ? COL.w : COL.neg, size: 12, weight: 700, align: "center", mono: true }); };
        edge(xi + rN, yi1, xs - rN, ys, w1, "×" + f2(w1)); edge(xi + rN, yi2, xs - rN, ys, w2, "×" + f2(w2));
        ctx.strokeStyle = COL.b; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xs, ys - rN - 40); ctx.lineTo(xs, ys - rN); ctx.stroke(); ctx.setLineDash([]);
        LW.text(ctx, "+ b = " + f2(b), xs, ys - rN - 46, { color: COL.b, size: 12, weight: 700, align: "center", mono: true });
        ctx.strokeStyle = C.line2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xs + rN, ys); ctx.lineTo(xo - rN, ys); ctx.stroke();
        [[xi, yi1, "x₁", x1], [xi, yi2, "x₂", x2]].forEach(([x, yy, n, v]) => { LW.dot(ctx, x, yy, rN, C.card, COL.x, 2.5); LW.text(ctx, n, x, yy - 4, { color: COL.x, size: 13, weight: 700, align: "center" }); LW.text(ctx, f2(v), x, yy + 13, { color: C.ink2, size: 11, align: "center", mono: true }); });
        LW.dot(ctx, xs, ys, rN, C.card, COL.z, 2.5); LW.text(ctx, "Σ", xs, ys - 3, { color: COL.z, size: 17, weight: 700, align: "center" }); LW.text(ctx, "z=" + f2(z), xs, ys + 15, { color: C.ink2, size: 10.5, align: "center", mono: true });
        // activation inset
        const bx = (xs + xo) / 2 - 34, by = ys - 26, bw = 68, bh = 52; ctx.fillStyle = C.card; ctx.strokeStyle = C.line2; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = COL.y; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const zz = -4 + i * 0.2, v = F(zz), py = act === "relu" ? by + bh - 6 - Math.min(v, 4) / 4 * (bh - 12) : by + bh - 6 - (v - ACT[act].lo) / (1 - ACT[act].lo) * (bh - 12); i ? ctx.lineTo(bx + 4 + i / 40 * (bw - 8), py) : ctx.moveTo(bx + 4, py); } ctx.stroke();
        const mz = LW.clamp(z, -4, 4); LW.dot(ctx, bx + 4 + (mz + 4) / 8 * (bw - 8), act === "relu" ? by + bh - 6 - Math.min(F(mz), 4) / 4 * (bh - 12) : by + bh - 6 - (F(mz) - ACT[act].lo) / (1 - ACT[act].lo) * (bh - 12), 3.5, COL.z);
        LW.text(ctx, "σ", bx + bw / 2, by - 6, { color: C.ink2, size: 13, weight: 700, align: "center" });
        LW.dot(ctx, xo, ys, rN, COL.y, null); LW.text(ctx, "y", xo, ys - 3, { color: "#fff", size: 14, weight: 700, align: "center" }); LW.text(ctx, f2(y), xo, ys + 13, { color: "#fff", size: 11, align: "center", mono: true });
      }
      { const { ctx, W, H } = Pl; ctx.clearRect(0, 0, W, H);
        A = LW.axes(ctx, { x: 34, y: 8, w: W - 42, h: H - 40 }, { xr: [-3, 3], yr: [-3, 3], xlabel: "input x₁", colors: C, grid: false, nx: 6, ny: 6 });
        const n = 60, cw = A.box.w / n, ch = A.box.h / n, lo = ACT[act].lo, hiV = act === "relu" ? 4 : 1;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const px = -3 + (i + .5) * 6 / n, py = 3 - (j + .5) * 6 / n, v = (F(w1 * px + w2 * py + b) - lo) / (hiV - lo); ctx.fillStyle = LW.diverge(LW.clamp(v, 0, 1) * 2 - 1, C); ctx.fillRect(A.box.x + i * cw, A.box.y + j * ch, cw + 0.6, ch + 0.6); }
        A.clip();
        if (Math.abs(w2) > 1e-6 || Math.abs(w1) > 1e-6) { const pts = Math.abs(w2) > Math.abs(w1) ? [[-3, (-b + 3 * w1) / w2], [3, (-b - 3 * w1) / w2]] : [[(-b + 3 * w2) / w1, -3], [(-b - 3 * w2) / w1, 3]]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(A.sx(pts[0][0]), A.sy(pts[0][1])); ctx.lineTo(A.sx(pts[1][0]), A.sy(pts[1][1])); ctx.stroke(); ctx.setLineDash([]); }
        LW.arrow(ctx, A.sx(0), A.sy(0), A.sx(w1), A.sy(w2), COL.w, 3, 10);
        LW.dot(ctx, A.sx(x1), A.sy(x2), 7, "#fff", C.ink, 2.5);
        ctx.restore();
        LW.text(ctx, "x₂", 12, A.box.y + 10, { color: C.ink2, size: 12 });
      }
      eq.innerHTML = `<span style="color:${COL.z}">z</span> = <span style="color:${COL.w}">${f2(w1)}</span>·<span style="color:${COL.x}">${f2(x1)}</span> + <span style="color:${COL.w}">${f2(w2)}</span>·<span style="color:${COL.x}">${f2(x2)}</span> + <span style="color:${COL.b}">${f2(b)}</span> = <b style="color:${COL.z}">${f2(z)}</b> &nbsp;&nbsp;→&nbsp;&nbsp; <span style="color:${COL.y}">y</span> = σ(<span style="color:${COL.z}">z</span>) = <b style="color:${COL.y}">${f2(y)}</b>`;
    }
    D.draw = Pl.draw = draw;
    LW.drag(Pl.cv, { down: p => { if (!A) return false; x1 = LW.clamp(A.ix(p.x), -3, 3); x2 = LW.clamp(A.iy(p.y), -3, 3); draw(); }, move: p => { x1 = LW.clamp(A.ix(p.x), -3, 3); x2 = LW.clamp(A.iy(p.y), -3, 3); draw(); } });
    draw();
  });

  /* a neuron learning: logistic regression by gradient descent, with its loss landscape */
  LW.register("neuronlearn", function (root) {
    let w = [-1.5, 1.8], b = 0, lr = 0.5, pts = [], losses = [], trail = [], cls = 1, iter = 0, seed = 2;
    const row = LW.h("div", { class: "lw-row", style: { gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" } }); root.append(row);
    const L = LW.h("div"), R = LW.h("div"); row.append(L, R);
    const P = LW.canvas(L, { height: w0 => Math.min(360, w0) });
    const Q = LW.canvas(R, { height: w0 => Math.min(360, w0) });
    const ctl = LW.controls(root);
    const runB = LW.button(ctl, "Train", () => { runB.textContent = loop.toggle() ? "Pause" : "Train"; }, { primary: true });
    LW.button(ctl, "One step", () => { step(); draw(); });
    LW.button(ctl, "New data", () => { seed++; make(); });
    LW.slider(ctl, { label: "Learning rate η", min: 0.02, max: 3, value: lr, log: true, fmt: v => v.toFixed(2), onInput: v => { lr = v; } });
    LW.seg(ctl, { label: "Clicking adds", options: [["1", "orange class (y = 1)"], ["0", "blue class (y = 0)"]], value: "1", onChange: v => { cls = +v; } });
    const S = LW.stats(root, [["it", "steps"], ["loss", "cross-entropy loss"], ["acc", "classified correctly"], ["nw", "size of the weights ‖w‖"]]);
    function make() { const r = LW.rng(seed); pts = []; for (let i = 0; i < 18; i++) pts.push({ x: 1 + 0.8 * r.normal(), y: 1 + 0.8 * r.normal(), c: 1 }); for (let i = 0; i < 18; i++) pts.push({ x: -1 + 0.8 * r.normal(), y: -0.8 + 0.8 * r.normal(), c: 0 }); w = [-1.5, 1.8]; b = 0; losses = []; trail = []; iter = 0; draw(); }
    const sig = z => 1 / (1 + Math.exp(-z));
    const lossAt = (w1, w2, bb) => { let s = 0; pts.forEach(p => { const q = LW.clamp(sig(w1 * p.x + w2 * p.y + bb), 1e-9, 1 - 1e-9); s -= p.c ? Math.log(q) : Math.log(1 - q); }); return s / Math.max(1, pts.length); };
    function step() { if (!pts.length) return; let g1 = 0, g2 = 0, gb = 0; pts.forEach(p => { const e = sig(w[0] * p.x + w[1] * p.y + b) - p.c; g1 += e * p.x; g2 += e * p.y; gb += e; }); const n = pts.length; w = [w[0] - lr * g1 / n, w[1] - lr * g2 / n]; b -= lr * gb / n; iter++; losses.push(lossAt(w[0], w[1], b)); trail.push(w.slice()); if (trail.length > 400) trail.shift(); }
    const loop = LW.loop(root, () => { for (let k = 0; k < 2; k++) step(); draw(); if (iter > 3000) { loop.stop(); runB.textContent = "Train"; } });
    let A = null;
    function draw() {
      const C = LW.colors();
      { const { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
        A = LW.axes(ctx, { x: 30, y: 8, w: W - 38, h: H - 40 }, { xr: [-3.5, 3.5], yr: [-3.5, 3.5], xlabel: "feature x₁", colors: C, grid: false, nx: 6, ny: 6 });
        const n = 50, cw = A.box.w / n, ch = A.box.h / n;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const px = -3.5 + (i + .5) * 7 / n, py = 3.5 - (j + .5) * 7 / n; ctx.fillStyle = LW.diverge(sig(w[0] * px + w[1] * py + b) * 2 - 1, C); ctx.globalAlpha = 0.55; ctx.fillRect(A.box.x + i * cw, A.box.y + j * ch, cw + .6, ch + .6); } ctx.globalAlpha = 1;
        A.clip(); if (Math.abs(w[1]) > 1e-6) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(A.sx(-3.5), A.sy((-b + 3.5 * w[0]) / w[1])); ctx.lineTo(A.sx(3.5), A.sy((-b - 3.5 * w[0]) / w[1])); ctx.stroke(); }
        pts.forEach(p => LW.dot(ctx, A.sx(p.x), A.sy(p.y), 5, p.c ? COL.y : COL.x, C.card, 1.5)); ctx.restore();
      }
      { const { ctx, W, H } = Q; ctx.clearRect(0, 0, W, H);
        const B = LW.axes(ctx, { x: 36, y: 22, w: W - 44, h: H - 54 }, { xr: [-4, 4], yr: [-4, 4], xlabel: "weight w₁", title: "Loss landscape over (w₁, w₂) at the current b", colors: C, grid: false, nx: 4, ny: 4 });
        const n = 36, cw = B.box.w / n, ch = B.box.h / n, vals = []; let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = Math.log(lossAt(-4 + (i + .5) * 8 / n, 4 - (j + .5) * 8 / n, b) + 1e-3); vals.push(v); lo = Math.min(lo, v); hi = Math.max(hi, v); }
        vals.forEach((v, k) => { const i = Math.floor(k / n), j = k % n, t = (v - lo) / (hi - lo); ctx.fillStyle = LW.ramp(0.1 + 0.85 * Math.floor(t * 12) / 12, C); ctx.fillRect(B.box.x + i * cw, B.box.y + j * ch, cw + .6, ch + .6); });
        B.clip(); ctx.strokeStyle = COL.neg; ctx.lineWidth = 2; ctx.beginPath(); trail.forEach((q, k) => (k ? ctx.lineTo(B.sx(q[0]), B.sy(q[1])) : ctx.moveTo(B.sx(q[0]), B.sy(q[1])))); ctx.stroke();
        LW.dot(ctx, B.sx(w[0]), B.sy(w[1]), 6, "#fff", COL.neg, 2.5); ctx.restore();
      }
      const correct = pts.filter(p => (sig(w[0] * p.x + w[1] * p.y + b) > 0.5) === !!p.c).length;
      S.set("it", String(iter)); S.set("loss", LW.fmt(lossAt(w[0], w[1], b), 3)); S.set("acc", pts.length ? `${correct} of ${pts.length}` : "–"); S.set("nw", Math.hypot(w[0], w[1]).toFixed(2));
    }
    P.draw = Q.draw = draw;
    LW.drag(P.cv, { down: p => { if (!A) return false; pts.push({ x: A.ix(p.x), y: A.iy(p.y), c: cls }); draw(); return false; } });
    make();
  });
})();
