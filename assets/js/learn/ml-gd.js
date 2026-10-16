/* 2.2 Gradient descent: optimisers on 2D loss surfaces. */
(function () {
  "use strict";
  const SURF = {
    bowl: { name: "Stretched bowl", dom: [-3, 3, -2, 2], start: [-2.6, 1.5], min: [0, 0],
      f(x, y) { const c = Math.cos(0.5), s = Math.sin(0.5), u = c * x + s * y, v = -s * x + c * y; return 0.5 * (0.6 * u * u + 6 * v * v); },
      g(x, y) { const c = Math.cos(0.5), s = Math.sin(0.5), u = c * x + s * y, v = -s * x + c * y, gu = 0.6 * u, gv = 6 * v; return [c * gu - s * gv, s * gu + c * gv]; } },
    valley: { name: "Banana valley (Rosenbrock)", dom: [-2, 2, -1, 3], start: [-1.6, 2.6], min: [1, 1],
      f(x, y) { return (1 - x) ** 2 + 10 * (y - x * x) ** 2; },
      g(x, y) { return [-2 * (1 - x) - 40 * x * (y - x * x), 20 * (y - x * x)]; } },
    wells: { name: "Two minima", dom: [-2, 2, -1.6, 1.6], start: [0.15, 1.3], min: [-1.03, 0],
      f(x, y) { return (x * x - 1) ** 2 + 0.9 * y * y + 0.3 * x; },
      g(x, y) { return [4 * x * (x * x - 1) + 0.3, 1.8 * y]; } }
  };
  LW.register("gd", function (root) {
    let key = "bowl", opt = "gd", lr = 0.12, beta = 0.9, path = [], losses = [], state = null, img = null, imgKey = "";
    const row = LW.h("div", { class: "lw-row" }); root.append(row);
    const left = LW.h("div"), right = LW.h("div"); row.append(left, right);
    const P = LW.canvas(left, { aspect: 0.72, minH: 260, maxH: 420 });
    const Q = LW.canvas(right, { aspect: 0.75, minH: 200, maxH: 300 });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Loss surface", options: Object.keys(SURF).map(k => [k, SURF[k].name]), value: key, onChange: v => { key = v; reset(SURF[v].start); } });
    LW.seg(ctl, { label: "Optimiser", options: [["gd", "Gradient descent"], ["mom", "Momentum"], ["adam", "Adam"]], value: opt, onChange: v => { opt = v; reset(path[0]); } });
    const ctl2 = LW.controls(root);
    LW.slider(ctl2, { label: "Learning rate η", min: 0.001, max: 1, value: lr, log: true, fmt: v => v.toPrecision(2), onInput: v => { lr = v; reset(path[0]); } });
    LW.slider(ctl2, { label: "Momentum β", min: 0, max: 0.99, step: 0.01, value: beta, fmt: v => v.toFixed(2), onInput: v => { beta = v; reset(path[0]); } });
    const runB = LW.button(ctl2, "Run", () => { if (loop.toggle()) runB.textContent = "Pause"; else runB.textContent = "Run"; }, { primary: true });
    LW.button(ctl2, "Step", () => { step(1); draw(); });
    LW.button(ctl2, "Restart", () => reset(path[0]));
    const S = LW.stats(root, [["it", "iterations"], ["f", "loss"], ["g", "|gradient|"], ["d", "distance to minimum"]]);
    const msg = LW.note(root, "Click anywhere on the surface to choose a starting point.");

    function reset(p0) {
      const s = SURF[key]; path = [p0.slice()]; losses = [s.f(p0[0], p0[1])];
      state = { v: [0, 0], m: [0, 0], s: [0, 0], t: 0, dead: false };
      loop.stop(); runB.textContent = "Run"; draw();
    }
    function step(n) {
      const s = SURF[key];
      for (let k = 0; k < n && !state.dead && path.length < 2000; k++) {
        const [x, y] = path[path.length - 1], g = s.g(x, y);
        let dx, dy;
        if (opt === "gd") { dx = -lr * g[0]; dy = -lr * g[1]; }
        else if (opt === "mom") { state.v = [beta * state.v[0] - lr * g[0], beta * state.v[1] - lr * g[1]]; dx = state.v[0]; dy = state.v[1]; }
        else { const b1 = 0.9, b2 = 0.999, eps = 1e-8; state.t++; state.m = state.m.map((m, i) => b1 * m + (1 - b1) * g[i]); state.s = state.s.map((v, i) => b2 * v + (1 - b2) * g[i] * g[i]);
          const mh = state.m.map(m => m / (1 - b1 ** state.t)), vh = state.s.map(v => v / (1 - b2 ** state.t)); dx = -lr * mh[0] / (Math.sqrt(vh[0]) + eps); dy = -lr * mh[1] / (Math.sqrt(vh[1]) + eps); }
        const nx = x + dx, ny = y + dy, f = s.f(nx, ny);
        path.push([nx, ny]); losses.push(f);
        if (!isFinite(f) || f > 1e7 || Math.abs(nx) > 1e4 || Math.abs(ny) > 1e4) { state.dead = true; }
        if (Math.hypot(dx, dy) < 1e-7 && Math.hypot(g[0], g[1]) < 1e-6) { loop.stop(); runB.textContent = "Run"; break; }
      }
      if (state.dead || path.length >= 2000) { loop.stop(); runB.textContent = "Run"; }
    }
    const loop = LW.loop(root, () => { step(2); draw(); });

    function surface(W, H, A, s, C) { // cached heat map with banded contours
      const k = [key, W, H, C.dark].join();
      if (img && imgKey === k) return img;
      const off = document.createElement("canvas"), d = Math.min(devicePixelRatio || 1, 2); off.width = Math.round(A.box.w * d / 2); off.height = Math.round(A.box.h * d / 2);
      const o = off.getContext("2d"), id = o.createImageData(off.width, off.height);
      const [x0, x1, y0, y1] = s.dom; let lo = Infinity, hi = -Infinity; const vals = new Float64Array(off.width * off.height);
      for (let j = 0; j < off.height; j++) for (let i = 0; i < off.width; i++) { const x = x0 + (i + .5) / off.width * (x1 - x0), y = y1 - (j + .5) / off.height * (y1 - y0); const v = Math.log(s.f(x, y) - s.f(s.min[0], s.min[1]) + 0.02); vals[j * off.width + i] = v; lo = Math.min(lo, v); hi = Math.max(hi, v); }
      for (let p = 0; p < vals.length; p++) {
        const t = (vals[p] - lo) / (hi - lo), band = Math.floor(t * 14) / 14, edge = Math.abs(t * 14 - Math.round(t * 14)) < 0.06;
        const c = LW.ramp(0.08 + band * 0.8, C).match(/\d+/g).map(Number); const e = edge ? (C.dark ? 1.25 : 0.86) : 1;
        id.data[p * 4] = Math.min(255, c[0] * e); id.data[p * 4 + 1] = Math.min(255, c[1] * e); id.data[p * 4 + 2] = Math.min(255, c[2] * e); id.data[p * 4 + 3] = 255;
      }
      o.putImageData(id, 0, 0); img = off; imgKey = k; return img;
    }
    let A = null;
    function draw() {
      const s = SURF[key], C = LW.colors();
      { const { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
        A = LW.axes(ctx, { x: 58, y: 10, w: W - 70, h: H - 50 }, { xr: [s.dom[0], s.dom[1]], yr: [s.dom[2], s.dom[3]], xlabel: "parameter θ₁", ylabel: "parameter θ₂", colors: C, grid: false });
        ctx.imageSmoothingEnabled = true; ctx.drawImage(surface(W, H, A, s, C), A.box.x, A.box.y, A.box.w, A.box.h);
        A.clip();
        LW.dot(ctx, A.sx(s.min[0]), A.sy(s.min[1]), 5, null, C.teal, 2);
        ctx.strokeStyle = C.rose; ctx.lineWidth = 2; ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(A.sx(p[0]), A.sy(p[1])) : ctx.moveTo(A.sx(p[0]), A.sy(p[1])))); ctx.stroke();
        if (path.length < 400) path.forEach(p => LW.dot(ctx, A.sx(p[0]), A.sy(p[1]), 2.2, C.rose));
        const e = path[path.length - 1]; LW.dot(ctx, A.sx(e[0]), A.sy(e[1]), 6, C.card, C.rose, 2.5);
        LW.dot(ctx, A.sx(path[0][0]), A.sy(path[0][1]), 5, C.ink, null);
        ctx.restore();
      }
      { const { ctx, W, H } = Q; ctx.clearRect(0, 0, W, H);
        const fm = s.f(s.min[0], s.min[1]), ls = losses.map(f => Math.log10(Math.max(f - fm, 1e-12)));
        const fin = ls.filter(isFinite); const lo = Math.max(-12, Math.floor(Math.min(...fin, 0))), hi = Math.ceil(Math.max(...fin, 1));
        const B = LW.axes(ctx, { x: 60, y: 22, w: W - 72, h: H - 62 }, { xr: [0, Math.max(10, losses.length - 1)], yr: [lo, hi], xlabel: "iteration", ylabel: "log₁₀(loss − min)", title: "Convergence", colors: C });
        B.clip(); LW.path(ctx, ls.map((_, i) => i), ls.map(v => Math.min(v, hi)), B, { color: C.rose, width: 2 }); ctx.restore();
      }
      const e = path[path.length - 1], g = s.g(e[0], e[1]);
      S.set("it", String(path.length - 1)); S.set("f", LW.fmt(losses[losses.length - 1], 4)); S.set("g", LW.fmt(Math.hypot(g[0], g[1]), 3)); S.set("d", LW.fmt(Math.hypot(e[0] - s.min[0], e[1] - s.min[1]), 3));
      msg.set(state && state.dead ? "<b style=\"color:var(--rose)\">Diverged.</b> The step was too large for the curvature: each update overshot further than the last. Lower η." : path.length >= 2000 ? "Stopped after 2000 iterations." : "Click anywhere on the surface to choose a starting point. The teal ring marks the minimum.");
    }
    P.draw = Q.draw = draw;
    LW.drag(P.cv, { down: p => { if (!A) return false; const s = SURF[key]; reset([LW.clamp(A.ix(p.x), s.dom[0], s.dom[1]), LW.clamp(A.iy(p.y), s.dom[2], s.dom[3])]); return false; } });
    reset(SURF[key].start);
  });
})();
