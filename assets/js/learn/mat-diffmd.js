/* 5.3 Differentiable molecular dynamics: forward-mode differentiation (tangent propagation)
   through a whole Lennard-Jones trajectory to get d(observable)/d(sigma), checked against
   finite differences and used to fit sigma to a target. */
(function () {
  "use strict";
  const N = 7;
  function initial(seed) {
    const r = LW.rng(seed), pos = [[0, 0]];
    for (let k = 0; k < 6; k++) pos.push([1.15 * Math.cos(k * Math.PI / 3) + 0.08 * r.normal(), 1.15 * Math.sin(k * Math.PI / 3) + 0.08 * r.normal()]);
    const vel = pos.map(() => [0.55 * r.normal(), 0.55 * r.normal()]);
    let mx = 0, my = 0; vel.forEach(v => { mx += v[0] / N; my += v[1] / N; }); vel.forEach(v => { v[0] -= mx; v[1] -= my; });
    return { pos, vel };
  }
  /* run T steps; every quantity carries its derivative with respect to sigma */
  function simulate(sigma, T, gamma, init, keepPath) {
    const dt = 0.005, x = new Float64Array(N), y = new Float64Array(N), vx = new Float64Array(N), vy = new Float64Array(N);
    const dx = new Float64Array(N), dy = new Float64Array(N), dvx = new Float64Array(N), dvy = new Float64Array(N);
    const fx = new Float64Array(N), fy = new Float64Array(N), dfx = new Float64Array(N), dfy = new Float64Array(N);
    init.pos.forEach((p, i) => { x[i] = p[0] * sigma; y[i] = p[1] * sigma; dx[i] = p[0]; dy[i] = p[1]; vx[i] = init.vel[i][0]; vy[i] = init.vel[i][1]; });
    const s6 = sigma ** 6, s12 = s6 * s6, ds6 = 6 * sigma ** 5, ds12 = 12 * sigma ** 11;
    function forces() {
      fx.fill(0); fy.fill(0); dfx.fill(0); dfy.fill(0);
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const rx = x[i] - x[j], ry = y[i] - y[j], drx = dx[i] - dx[j], dry = dy[i] - dy[j];
        const q = rx * rx + ry * ry, dq = 2 * (rx * drx + ry * dry);
        const q4 = q ** -4, q7 = q ** -7;
        const g = 24 * (2 * s12 * q7 - s6 * q4);
        const dg = 24 * (2 * ds12 * q7 - ds6 * q4) + 24 * (-14 * s12 * q7 / q + 4 * s6 * q4 / q) * dq;
        fx[i] += g * rx; fy[i] += g * ry; fx[j] -= g * rx; fy[j] -= g * ry;
        const ddx = dg * rx + g * drx, ddy = dg * ry + g * dry;
        dfx[i] += ddx; dfy[i] += ddy; dfx[j] -= ddx; dfy[j] -= ddy;
      }
    }
    forces();
    const damp = Math.exp(-gamma * dt), path = keepPath ? [] : null;
    for (let t = 0; t < T; t++) {
      for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; dvx[i] += 0.5 * dt * dfx[i]; dvy[i] += 0.5 * dt * dfy[i];
        x[i] += dt * vx[i]; y[i] += dt * vy[i]; dx[i] += dt * dvx[i]; dy[i] += dt * dvy[i]; }
      forces();
      for (let i = 0; i < N; i++) { vx[i] = damp * (vx[i] + 0.5 * dt * fx[i]); vy[i] = damp * (vy[i] + 0.5 * dt * fy[i]); dvx[i] = damp * (dvx[i] + 0.5 * dt * dfx[i]); dvy[i] = damp * (dvy[i] + 0.5 * dt * dfy[i]); }
      if (path && t % 10 === 0) path.push(Array.from(x).map((v, i) => [v, y[i]]));
      if (!isFinite(x[0])) break;
    }
    let cx = 0, cy = 0, dcx = 0, dcy = 0; for (let i = 0; i < N; i++) { cx += x[i] / N; cy += y[i] / N; dcx += dx[i] / N; dcy += dy[i] / N; }
    let s = 0, ds = 0; for (let i = 0; i < N; i++) { const ux = x[i] - cx, uy = y[i] - cy; s += (ux * ux + uy * uy) / N; ds += 2 * (ux * (dx[i] - dcx) + uy * (dy[i] - dcy)) / N; }
    const rg = Math.sqrt(s);
    return { rg, drg: ds / (2 * rg), pos: Array.from(x).map((v, i) => [v, y[i]]), path };
  }
  LW.register("diffmd", function (root) {
    let sigma = 1.2, target = 1.0, T = 600, mode = "damped", scan = null, busy = false, history = [];
    const init = initial(4);
    const row = LW.h("div", { class: "lw-row" }); root.append(row);
    const left = LW.h("div"), right = LW.h("div"); row.append(left, right);
    const P = LW.canvas(left, { height: w => Math.min(w * 0.82, 360) });
    const Q = LW.canvas(right, { aspect: 0.82, minH: 240, maxH: 340 });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Dynamics", options: [["damped", "Damped relaxation"], ["nve", "Energy-conserving MD"]], value: mode, onChange: v => { mode = v; scan = null; draw(); } });
    LW.slider(ctl, { label: "Trajectory length (steps)", min: 50, max: 4000, step: 50, value: T, fmt: v => String(v), onInput: v => { T = v; scan = null; draw(); } });
    const c2 = LW.controls(root);
    const sS = LW.slider(c2, { label: "Parameter σ", min: 0.8, max: 1.4, step: 0.001, value: sigma, fmt: v => v.toFixed(3), onInput: v => { sigma = v; history = []; draw(); } });
    LW.slider(c2, { label: "Target radius of gyration", min: 0.8, max: 1.5, step: 0.01, value: target, fmt: v => v.toFixed(2), onInput: v => { target = v; scan = null; draw(); } });
    const c3 = LW.controls(root);
    LW.button(c3, "One gradient step", () => gstep(), { primary: true });
    LW.button(c3, "Optimise (20 steps)", () => { let k = 0; const go = () => { if (k++ < 20 && gstep()) setTimeout(go, 60); }; go(); });
    const S = LW.stats(root, [["rg", "R<sub>g</sub> at the end"], ["L", "loss (R<sub>g</sub> − target)²"], ["ad", "dL/dσ, forward-mode AD"], ["fd", "dL/dσ, finite difference"], ["agree", "agreement"]]);
    const msg = LW.note(root, "");
    const lossOf = s => { const r = simulate(s, T, mode === "damped" ? 3 : 0, init); return { L: (r.rg - target) ** 2, dL: 2 * (r.rg - target) * r.drg, r }; };
    function gstep() { const { L, dL } = lossOf(sigma); if (!isFinite(dL)) return false; const stepv = LW.clamp(-0.5 * dL / Math.max(1e-3, Math.abs(dL) ** 0.5), -0.03, 0.03); sigma = LW.clamp(sigma + stepv, 0.8, 1.4); history.push(sigma); sS.set(sigma); draw(); return Math.abs(stepv) > 1e-5 && L > 1e-10; }
    function draw() {
      const C = LW.colors(), cur = lossOf(sigma), h = 1e-5, fd = (lossOf(sigma + h).L - lossOf(sigma - h).L) / (2 * h);
      if (!scan) { const ss = LW.linspace(0.8, 1.4, 121); scan = { ss, L: ss.map(s => lossOf(s).L) }; }
      { const { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
        const path = simulate(sigma, T, mode === "damped" ? 3 : 0, init, true).path, sc = Math.min(W, H) / 5.2, X = v => W / 2 + v * sc, Y = v => H / 2 - v * sc;
        const cx = cur.r.pos.reduce((s, p) => s + p[0] / N, 0), cy = cur.r.pos.reduce((s, p) => s + p[1] / N, 0);
        ctx.strokeStyle = C.ink3; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(X(cx), Y(cy), target * sc, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = C.accent; ctx.beginPath(); ctx.arc(X(cx), Y(cy), cur.r.rg * sc, 0, 2 * Math.PI); ctx.stroke();
        for (let i = 0; i < N; i++) { ctx.strokeStyle = C.band; ctx.lineWidth = 1.5; ctx.beginPath(); path.forEach((fr, k) => (k ? ctx.lineTo(X(fr[i][0]), Y(fr[i][1])) : ctx.moveTo(X(fr[i][0]), Y(fr[i][1])))); ctx.stroke(); }
        cur.r.pos.forEach((p, i) => LW.dot(ctx, X(p[0]), Y(p[1]), sigma * sc * 0.5, i ? C.atomA : C.violet, C.card, 1.5));
        LW.text(ctx, "final frame; faint lines: trajectories", 8, 16, { color: C.ink3, size: 11 });
        LW.text(ctx, "solid circle: R_g   dashed: target", 8, H - 8, { color: C.ink3, size: 11 });
      }
      { const { ctx, W, H } = Q; ctx.clearRect(0, 0, W, H);
        const fin = scan.L.filter(isFinite), hi = Math.max(...fin) * 1.1 || 1;
        const B = LW.axes(ctx, { x: 60, y: 22, w: W - 72, h: H - 62 }, { xr: [0.8, 1.4], yr: [0, hi], xlabel: "σ", ylabel: "loss", title: "Loss against σ (each point = one simulation)", colors: C, yfmt: v => (v === 0 ? "0" : v.toPrecision(2)) });
        B.clip(); LW.path(ctx, scan.ss, scan.L, B, { color: C.violet, width: 2 });
        const d = 0.06; LW.path(ctx, [sigma - d, sigma + d], [cur.L - cur.dL * d, cur.L + cur.dL * d], B, { color: C.orange, width: 2.4 });
        history.forEach((s, k) => LW.dot(ctx, B.sx(s), B.sy(lossOf(s).L), 2.5, C.ink3));
        LW.dot(ctx, B.sx(sigma), B.sy(cur.L), 5.5, C.card, C.orange, 2.5); ctx.restore();
        LW.text(ctx, "orange: tangent from AD", B.box.x + B.box.w - 4, B.box.y + 14, { color: C.orange, size: 11, align: "right" });
      }
      const rel = Math.abs(cur.dL - fd) / Math.max(1e-12, Math.abs(fd));
      S.set("rg", LW.fmt(cur.r.rg, 4)); S.set("L", LW.fmt(cur.L, 3)); S.set("ad", LW.fmt(cur.dL, 4)); S.set("fd", LW.fmt(fd, 4)); S.set("agree", rel < 1e-3 ? "✓ " + LW.fmt(rel, 1) : LW.fmt(rel, 2));
      msg.set(mode === "nve" && T > 1500 ? "<b>Chaos.</b> In energy-conserving dynamics nearby trajectories separate exponentially, so the loss becomes rugged and the exact gradient becomes huge and erratic: it is correct, but useless for optimisation. Shorten the trajectory or add damping." : "The derivative is propagated alongside the positions at every step, so it is exact (up to rounding) whatever the trajectory length.");
    }
    P.draw = Q.draw = draw;
    draw();
  });
})();
