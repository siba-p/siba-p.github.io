/* Machine learning, part 1: backpropagation on a computational graph, forward values and
   backward gradients flowing node by node, checked against finite differences. */
(function () {
  "use strict";
  const C_F = "#4c6ef5", C_B = "#e64980", C_W = "#12a594";
  LW.register("backprop", function (root) {
    const p = { x: 1.5, y: 0.2, w1: 0.8, b1: -0.4, w2: 1.3, b2: 0.1 };
    let phase = 0, eta = 0.5, hist = [];   // phase 0 nothing, 1..6 forward, 7..12 backward
    const P = LW.canvas(root, { height: w => (w < 1100 ? 400 : 260) });
    const ctl = LW.controls(root);
    LW.button(ctl, "Forward pass ▶", () => { anim("f"); }, { primary: true });
    LW.button(ctl, "◀ Backward pass", () => { if (phase < 6) phase = 6; anim("b"); });
    LW.button(ctl, "Update the weights", () => { update(); });
    LW.slider(ctl, { label: "Learning rate η", min: 0.05, max: 2, step: 0.05, value: eta, fmt: v => v.toFixed(2), onInput: v => { eta = v; } });
    const c2 = LW.controls(root, "grid");
    const sl = {};
    [["x", "input x", -3, 3], ["y", "target y", -1, 1], ["w1", "weight w₁", -3, 3], ["b1", "bias b₁", -3, 3], ["w2", "weight w₂", -3, 3], ["b2", "bias b₂", -3, 3]].forEach(([k, l, lo, hi]) => { sl[k] = LW.slider(c2, { label: l, min: lo, max: hi, step: 0.01, value: p[k], fmt: v => v.toFixed(2), onInput: v => { p[k] = v; phase = 0; draw(); } }); });
    const S = LW.stats(root, [["L", "loss L"], ["g", "∂L/∂w₁ by backprop"], ["fd", "∂L/∂w₁ by finite difference"], ["steps", "updates"]]);
    const sig = z => 1 / (1 + Math.exp(-z));
    function compute(q) {
      const a = q.w1 * q.x, z1 = a + q.b1, h = sig(z1), m = q.w2 * h, yh = m + q.b2, e = yh - q.y, L = e * e;
      const dL = 1, de = 2 * e, dyh = de, dm = dyh, db2 = dyh, dw2 = dm * h, dh = dm * q.w2, dz1 = dh * h * (1 - h), db1 = dz1, da = dz1, dw1 = da * q.x;
      return { a, z1, h, m, yh, e, L, g: { L: dL, e: de, yh: dyh, m: dm, h: dh, z1: dz1, a: da, w1: dw1, b1: db1, w2: dw2, b2: db2 } };
    }
    function update() { const r = compute(p); ["w1", "b1", "w2", "b2"].forEach(k => { p[k] -= eta * r.g[k]; sl[k].set(p[k]); }); hist.push(compute(p).L); phase = 0; draw(); }
    let timer = null;
    function anim(dir) { clearInterval(timer); if (dir === "f") phase = 0; timer = setInterval(() => { if (dir === "f" && phase < 6) phase++; else if (dir === "b" && phase < 12) phase++; else clearInterval(timer); draw(); }, LW.reduced ? 10 : 380); }
    function draw() {
      const Cc = LW.colors(), { ctx, W, H } = P, r = compute(p); ctx.clearRect(0, 0, W, H);
      const two = W < 1100;
      const NODES = [
        ["x", "x", r && p.x, null], ["a", "× w₁", r.a, "a"], ["z1", "+ b₁", r.z1, "z1"], ["h", "σ", r.h, "h"], ["m", "× w₂", r.m, "m"], ["yh", "+ b₂", r.yh, "yh"], ["L", "(ŷ − y)²", r.L, "L"]];
      const pos = NODES.map((_, i) => { if (!two) return [40 + i * (W - 80) / 6, H * 0.5]; const row = i < 4 ? 0 : 1, col = row ? 6 - i : i; return [60 + col * (W - 120) / 3, row ? H * 0.74 : H * 0.3]; });
      const LOCAL = ["", "∂a/∂x = w₁", "∂z/∂a = 1", "∂h/∂z = σ(1−σ)", "∂m/∂h = w₂", "∂ŷ/∂m = 1", "∂L/∂ŷ = 2(ŷ−y)"];
      const PARAM = { a: ["w1", "w₁"], z1: ["b1", "b₁"], m: ["w2", "w₂"], yh: ["b2", "b₂"] };
      for (let i = 1; i < NODES.length; i++) {
        const [x0, y0] = pos[i - 1], [x1, y1] = pos[i], fOn = phase >= i, bOn = phase >= 12 - (i - 1) && phase > 6;
        ctx.strokeStyle = fOn ? C_F : Cc.line2; ctx.lineWidth = fOn ? 2.5 : 1.5; ctx.beginPath(); ctx.moveTo(x0 + 28, y0); ctx.lineTo(x1 - 28, y1); ctx.stroke();
        if (fOn) LW.arrow(ctx, x1 - 40, y1 + (y0 - y1) * 0.1, x1 - 28, y1, C_F, 2.5, 7);
        if (bOn) { ctx.strokeStyle = C_B; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x1 - 28, y1 + 12); ctx.lineTo(x0 + 28, y0 + 12); ctx.stroke(); ctx.setLineDash([]); LW.arrow(ctx, x0 + 40, y0 + 12, x0 + 28, y0 + 12, C_B, 2, 6); LW.text(ctx, LOCAL[i], (x0 + x1) / 2 + (Math.abs(y1 - y0) > 20 ? 70 : 0), (y0 + y1) / 2 + (Math.abs(y1 - y0) > 20 ? 0 : 30), { color: C_B, size: 10, align: "center", mono: true }); }
      }
      NODES.forEach(([id, label, val, gk], i) => {
        const [x, y] = pos[i], fOn = phase >= i, bOn = gk && phase > 6 && phase >= 12 - (i - 1) + (i === 6 ? 0 : 0);
        ctx.fillStyle = Cc.card; ctx.strokeStyle = fOn ? C_F : Cc.line2; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - 28, y - 22, 56, 44, 10); ctx.fill(); ctx.stroke();
        LW.text(ctx, label, x, y - 4, { color: Cc.ink, size: 12, weight: 700, align: "center" });
        LW.text(ctx, fOn ? val.toFixed(3) : "?", x, y + 13, { color: C_F, size: 11, align: "center", mono: true, weight: 600 });
        if (gk && phase > 6 && (i === 6 ? phase >= 7 : phase >= 13 - i)) LW.text(ctx, "∂L = " + r.g[gk].toFixed(3), x, y + 38, { color: C_B, size: 10.5, align: "center", mono: true, weight: 600 });
        if (PARAM[gk]) { const [pk, pn] = PARAM[gk]; LW.text(ctx, `${pn} = ${p[pk].toFixed(2)}`, x, y - 32, { color: C_W, size: 10.5, align: "center", mono: true, weight: 600 }); if (phase > 6 && phase >= 13 - i) LW.text(ctx, `∂L/∂${pn} = ${r.g[pk].toFixed(3)}`, x, y - 46, { color: C_B, size: 10, align: "center", mono: true }); }
      });
      if (!two) { LW.text(ctx, "forward: values", 10, 18, { color: C_F, size: 11, weight: 600 }); LW.text(ctx, "backward: gradients ∂L/∂(·)", W - 10, 18, { color: C_B, size: 11, weight: 600, align: "right" }); }
      const h = 1e-6, fd = (compute(Object.assign({}, p, { w1: p.w1 + h })).L - compute(Object.assign({}, p, { w1: p.w1 - h })).L) / (2 * h);
      S.set("L", r.L.toFixed(5)); S.set("g", r.g.w1.toFixed(6)); S.set("fd", fd.toFixed(6)); S.set("steps", hist.length ? `${hist.length} (loss ${hist[hist.length - 1].toFixed(4)})` : "0");
    }
    P.draw = draw; draw();
  });
})();
