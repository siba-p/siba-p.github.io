/* 2.4 Neural networks from scratch: a small multilayer perceptron trained live with
   hand-written backpropagation and Adam. */
(function () {
  "use strict";
  const ACT = {
    tanh: { f: Math.tanh, d: (z, a) => 1 - a * a },
    relu: { f: z => (z > 0 ? z : 0), d: z => (z > 0 ? 1 : 0) },
    silu: { f: z => z / (1 + Math.exp(-z)), d: z => { const s = 1 / (1 + Math.exp(-z)); return s * (1 + z * (1 - s)); } }
  };
  const TARGETS = {
    morse: { name: "Bond energy curve", xr: [0.7, 3.2], f: r => 4 * (1 - Math.exp(-2.2 * (r - 1.1))) ** 2 - 4 },
    wave: { name: "Damped wave", xr: [0, 6], f: x => Math.sin(1.6 * x) * Math.exp(-0.15 * x) },
    step: { name: "Step", xr: [-3, 3], f: x => (x > 0.3 ? 1 : -0.6) }
  };
  /* a fully connected network 1 → H (→ H) → 1 */
  function Net(sizes, act, seed) {
    const r = LW.rng(seed), L = sizes.length - 1, W = [], b = [];
    for (let l = 0; l < L; l++) { const fi = sizes[l], fo = sizes[l + 1], sc = act === "relu" ? Math.sqrt(2 / fi) : Math.sqrt(1 / fi);
      W.push(Array.from({ length: fo }, () => Array.from({ length: fi }, () => r.normal() * sc * (l === 0 ? 1.6 : 1)))); b.push(Array.from({ length: fo }, () => (l === 0 ? r.normal() * 1.2 : 0))); }
    const params = () => { const out = []; for (let l = 0; l < L; l++) { W[l].forEach(row => row.forEach((_, j) => out.push([W, l, row, j]))); } return out; };
    const n = sizes.slice(1).reduce((s, fo, l) => s + fo * (sizes[l] + 1), 0);
    return { sizes, W, b, L, act, n, params };
  }
  function forward(net, x) {
    const A = ACT[net.act], as = [[x]], zs = [];
    for (let l = 0; l < net.L; l++) {
      const prev = as[l], z = net.W[l].map((row, i) => row.reduce((s, w, j) => s + w * prev[j], net.b[l][i]));
      zs.push(z); as.push(l === net.L - 1 ? z : z.map(A.f));
    }
    return { as, zs, y: as[net.L][0] };
  }
  LW.register("nn", function (root) {
    let view = "f", tKey = "morse", act = "tanh", H = 8, depth = 1, lr = 0.01, seed = 1, net, adam, data, xs01, losses = [], iter = 0;
    const row = LW.h("div", { class: "lw-row" }); root.append(row);
    const left = LW.h("div"), right = LW.h("div"); row.append(left, right);
    const P = LW.canvas(left, { aspect: 0.7, minH: 250, maxH: 400 });
    const Q = LW.canvas(right, { aspect: 0.8, minH: 210, maxH: 320 });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Target", options: Object.keys(TARGETS).map(k => [k, TARGETS[k].name]), value: tKey, onChange: v => { tKey = v; makeData(); init(); } });
    LW.seg(ctl, { label: "Activation", options: [["tanh", "tanh"], ["relu", "ReLU"], ["silu", "SiLU"]], value: act, onChange: v => { act = v; init(); } });
    LW.seg(ctl, { label: "Hidden layers", options: [["1", "1"], ["2", "2"]], value: "1", onChange: v => { depth = +v; init(); } });
    LW.seg(ctl, { label: "Show", options: [["f", "Output"], ["d", "Slope dy/dx (the “force”)"]], value: view, onChange: v => { view = v; draw(); } });
    const c2 = LW.controls(root);
    LW.slider(c2, { label: "Neurons per layer", min: 1, max: 32, step: 1, value: H, fmt: v => String(v), onInput: v => { H = v; init(); } });
    LW.slider(c2, { label: "Learning rate (Adam)", min: 0.0005, max: 0.1, value: lr, log: true, fmt: v => v.toPrecision(2), onInput: v => { lr = v; } });
    const runB = LW.button(c2, "Train", () => { runB.textContent = loop.toggle() ? "Pause" : "Train"; }, { primary: true });
    LW.button(c2, "New initial weights", () => { seed++; init(); });
    const S = LW.stats(root, [["it", "iterations"], ["loss", "training loss (MSE)"], ["np", "parameters"]]);
    LW.note(root, "With one hidden layer, the faint curves are the individual neurons’ contributions <i>v<sub>k</sub></i> σ(<i>w<sub>k</sub>x</i> + <i>b<sub>k</sub></i>); the network’s output is their sum plus a constant. Two neurons can make a bump; many bumps can make any curve.");

    function makeData() {
      const T = TARGETS[tKey], r = LW.rng(5);
      data = Array.from({ length: 40 }, (_, i) => { const x = T.xr[0] + (T.xr[1] - T.xr[0]) * (i + r()) / 40; return { x, y: T.f(x) + 0.04 * r.normal() }; });
    }
    const norm = x => { const T = TARGETS[tKey]; return 2 * (x - T.xr[0]) / (T.xr[1] - T.xr[0]) - 1; };
    function init() {
      net = Net(depth === 1 ? [1, H, 1] : [1, H, H, 1], act, seed * 31 + H);
      adam = { m: net.W.map(Wl => Wl.map(r => r.map(() => 0))), v: net.W.map(Wl => Wl.map(r => r.map(() => 0))), mb: net.b.map(bl => bl.map(() => 0)), vb: net.b.map(bl => bl.map(() => 0)), t: 0 };
      losses = []; iter = 0; xs01 = null; draw();
    }
    function trainStep() {
      const A = ACT[act], L = net.L, gW = net.W.map(Wl => Wl.map(r => r.map(() => 0))), gb = net.b.map(bl => bl.map(() => 0));
      let loss = 0; const n = data.length;
      for (const p of data) {
        const fw = forward(net, norm(p.x)), err = fw.y - p.y; loss += err * err / n;
        let delta = [2 * err / n];
        for (let l = L - 1; l >= 0; l--) {
          const prev = fw.as[l];
          for (let i = 0; i < delta.length; i++) { gb[l][i] += delta[i]; for (let j = 0; j < prev.length; j++) gW[l][i][j] += delta[i] * prev[j]; }
          if (l > 0) { const nd = new Array(prev.length).fill(0); for (let j = 0; j < prev.length; j++) { let s = 0; for (let i = 0; i < delta.length; i++) s += net.W[l][i][j] * delta[i]; nd[j] = s * A.d(fw.zs[l - 1][j], prev[j]); } delta = nd; }
        }
      }
      const b1 = 0.9, b2 = 0.999, eps = 1e-8; adam.t++; const c1 = 1 - b1 ** adam.t, c2 = 1 - b2 ** adam.t;
      for (let l = 0; l < L; l++) {
        for (let i = 0; i < net.W[l].length; i++) {
          for (let j = 0; j < net.W[l][i].length; j++) { const g = gW[l][i][j]; adam.m[l][i][j] = b1 * adam.m[l][i][j] + (1 - b1) * g; adam.v[l][i][j] = b2 * adam.v[l][i][j] + (1 - b2) * g * g; net.W[l][i][j] -= lr * (adam.m[l][i][j] / c1) / (Math.sqrt(adam.v[l][i][j] / c2) + eps); }
          const g = gb[l][i]; adam.mb[l][i] = b1 * adam.mb[l][i] + (1 - b1) * g; adam.vb[l][i] = b2 * adam.vb[l][i] + (1 - b2) * g * g; net.b[l][i] -= lr * (adam.mb[l][i] / c1) / (Math.sqrt(adam.vb[l][i] / c2) + eps);
        }
      }
      iter++; return loss;
    }
    const loop = LW.loop(root, () => { let l = 0; for (let k = 0; k < 25; k++) l = trainStep(); losses.push(l); if (losses.length > 4000) losses = losses.filter((_, i) => i % 2 === 0); draw(); });
    function draw() {
      const C = LW.colors(), T = TARGETS[tKey], xs = LW.linspace(T.xr[0], T.xr[1], 220);
      const out = x => forward(net, norm(x)).y, hstep = (T.xr[1] - T.xr[0]) * 1e-4;
      if (view === "d") {
        const dTrue = xs.map(x => (T.f(x + hstep) - T.f(x - hstep)) / (2 * hstep)), dNet = xs.map(x => (out(x + hstep) - out(x - hstep)) / (2 * hstep));
        const fin = dTrue.filter(v => isFinite(v) && Math.abs(v) < 1e3); let lo = Math.min(...fin), hi = Math.max(...fin); const pad = (hi - lo) * 0.2 + 0.2; lo -= pad; hi += pad;
        const { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH);
        const A = LW.axes(ctx, { x: 58, y: 10, w: W - 70, h: HH - 50 }, { xr: T.xr, yr: [lo, hi], xlabel: "input x", ylabel: "slope dy/dx", colors: C });
        A.clip(); LW.path(ctx, xs, dTrue.map(v => (Math.abs(v) < 1e3 ? v : NaN)), A, { color: C.ink3, width: 1.5, dash: [5, 5] }); LW.path(ctx, xs, dNet.map(v => LW.clamp(v, lo - 10, hi + 10)), A, { color: C.accent, width: 2.4 }); ctx.restore();
        LW.text(ctx, "dashed: true slope", W - 16, 24, { color: C.ink3, size: 11, align: "right" });
      } else {
      const ys = data.map(p => p.y), lo = Math.min(...ys), hi = Math.max(...ys), pad = (hi - lo) * 0.25;
      { const { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH);
        const A = LW.axes(ctx, { x: 58, y: 10, w: W - 70, h: HH - 50 }, { xr: T.xr, yr: [lo - pad, hi + pad], xlabel: "input x", ylabel: "output", colors: C });
        A.clip();
        if (net.L === 2) { const pal = [C.accent, C.teal, C.orange, C.violet, C.rose, C.gold];
          for (let k = 0; k < net.W[0].length; k++) { const v = net.W[1][0][k], w = net.W[0][k][0], bb = net.b[0][k], f = ACT[act].f;
            LW.path(ctx, xs, xs.map(x => v * f(w * norm(x) + bb) + net.b[1][0] / net.W[0].length), A, { color: pal[k % pal.length], width: 1.2, alpha: 0.35 }); } }
        data.forEach(p => LW.dot(ctx, A.sx(p.x), A.sy(p.y), 3.5, C.ink, null));
        LW.path(ctx, xs, xs.map(out), A, { color: C.accent, width: 2.6 });
        ctx.restore();
      }
      }
      { const { ctx, W, H: HH } = Q; ctx.clearRect(0, 0, W, HH);
        const ls = losses.map(v => Math.log10(Math.max(v, 1e-8)));
        const B = LW.axes(ctx, { x: 60, y: 22, w: W - 72, h: HH - 62 }, { xr: [0, Math.max(10, ls.length)], yr: [-5, 1], xlabel: "training progress (×25 iterations)", ylabel: "log₁₀ loss", title: "Training loss", colors: C });
        B.clip(); LW.path(ctx, ls.map((_, i) => i), ls, B, { color: C.accent, width: 2 }); ctx.restore();
      }
      S.set("it", String(iter)); S.set("loss", losses.length ? LW.fmt(losses[losses.length - 1], 4) : "–"); S.set("np", String(net.n));
    }
    P.draw = Q.draw = draw;
    makeData(); init();
  });
})();
