/* Science 1: a particle in a 1D potential — position, velocity, momentum, force, energy —
   and its trajectory in phase space with the energy contours of the Hamiltonian. */
(function () {
  "use strict";
  const POT = {
    spring: { name: "Spring (harmonic)", V: x => 0.5 * x * x, dV: x => x, xr: [-3, 3], E0: [1.8, 0], ytop: 4.5 },
    well: { name: "Double well", V: x => 0.6 * (x * x - 1.6) ** 2, dV: x => 2.4 * x * (x * x - 1.6), xr: [-2.4, 2.4], E0: [1.6, 0], ytop: 3.2 },
    pend: { name: "Pendulum", V: x => 1 - Math.cos(x), dV: x => Math.sin(x), xr: [-Math.PI, Math.PI], E0: [2.2, 0], ytop: 2.6 }
  };
  const BLUE = "#4c6ef5", ORANGE = "#f08c2e", GOLD = "#d4a017", TEAL = "#12a594";
  LW.register("phasespace", function (root) {
    let key = "spring", m = 1, gamma = 0, x, p, t = 0, trail = [], E0;
    const row = LW.h("div", { class: "lw-row", style: { gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" } }); root.append(row);
    const L = LW.h("div"), R = LW.h("div"); row.append(L, R);
    const P = LW.canvas(L, { height: w => Math.min(340, w * 0.9) });
    const Q = LW.canvas(R, { height: w => Math.min(340, w * 0.9) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Potential V(x)", options: Object.keys(POT).map(k => [k, POT[k].name]), value: key, onChange: v => { key = v; reset(POT[v].E0[0], POT[v].E0[1]); } });
    LW.slider(ctl, { label: "Mass m", min: 0.3, max: 4, step: 0.05, value: m, fmt: v => v.toFixed(2), onInput: v => { m = v; trail = []; } });
    LW.slider(ctl, { label: "Friction γ", min: 0, max: 0.6, step: 0.01, value: gamma, fmt: v => v.toFixed(2), onInput: v => { gamma = v; } });
    const c2 = LW.controls(root);
    const runB = LW.button(c2, "Pause", () => { runB.textContent = loop.toggle() ? "Pause" : "Run"; }, { primary: true });
    LW.button(c2, "Kick: add momentum", () => { p += 0.6 * Math.sign(p || 1); trail = []; });
    const S = LW.stats(root, [["x", "position x"], ["v", "velocity v = p/m"], ["p", "momentum p"], ["F", "force F = −dV/dx"], ["K", "kinetic p²/2m"], ["U", "potential V(x)"], ["E", "total energy"]]);
    LW.note(root, "Click anywhere in the phase plane (right) to start the particle from that position and momentum. Each closed curve is a path of constant energy.");
    const H = (xx, pp) => pp * pp / (2 * m) + POT[key].V(xx);
    function reset(x0, p0) { x = x0; p = p0; t = 0; trail = []; E0 = H(x, p); }
    function step(dt) {
      const T = POT[key], wrap = key === "pend";
      for (let k = 0; k < 8; k++) { const h = dt / 8;
        p += 0.5 * h * (-T.dV(x) - gamma * p); x += h * p / m; if (wrap) x = ((x + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; p += 0.5 * h * (-T.dV(x) - gamma * p); }
      t += dt; trail.push([x, p]); if (trail.length > 900) trail.shift();
    }
    const loop = LW.loop(root, dt => { step(Math.min(dt, 0.03) * 1.6); draw(); });
    let B = null;
    function draw() {
      const C = LW.colors(), T = POT[key], E = H(x, p), F = -T.dV(x), K = p * p / (2 * m), U = T.V(x);
      { const { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH);
        const A = LW.axes(ctx, { x: 46, y: 10, w: W - 92, h: HH - 46 }, { xr: T.xr, yr: [0, T.ytop], xlabel: "position x", ylabel: "energy", colors: C, ny: 4 });
        const xs = LW.linspace(T.xr[0], T.xr[1], 200); A.clip();
        LW.path(ctx, xs, xs.map(T.V), A, { color: BLUE, width: 2.6 });
        ctx.strokeStyle = GOLD; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(A.box.x, A.sy(E)); ctx.lineTo(A.box.x + A.box.w, A.sy(E)); ctx.stroke(); ctx.setLineDash([]);
        const bx = A.sx(x), by = A.sy(U); LW.dot(ctx, bx, by - 9, 9, ORANGE, C.card, 2);
        if (Math.abs(F) > 0.02) LW.arrow(ctx, bx, by - 30, bx + LW.clamp(F, -3, 3) * 18, by - 30, ORANGE, 2.4, 8);
        if (Math.abs(p) > 0.02) LW.arrow(ctx, bx, by + 12, bx + LW.clamp(p / m, -3, 3) * 18, by + 12, TEAL, 2.4, 8);
        ctx.restore();
        LW.text(ctx, "total energy E", bx > A.box.x + A.box.w * 0.6 ? A.box.x + 6 : A.box.x + A.box.w - 6, A.sy(E) - 6, { color: GOLD, size: 11, weight: 600, align: bx > A.box.x + A.box.w * 0.6 ? "left" : "right" });
        // energy bar
        const bxr = W - 34, top = A.box.y, hh = A.box.h, sc = hh / T.ytop;
        ctx.fillStyle = BLUE; ctx.fillRect(bxr, top + hh - U * sc, 18, U * sc); ctx.fillStyle = ORANGE; ctx.fillRect(bxr, top + hh - (U + K) * sc, 18, K * sc);
        ctx.strokeStyle = C.line2; ctx.strokeRect(bxr + .5, top, 18, hh);
        if (K * sc > 14) LW.text(ctx, "K", bxr + 9, top + hh - (U + K / 2) * sc + 4, { color: "#fff", size: 10, weight: 700, align: "center" }); if (U * sc > 14) LW.text(ctx, "V", bxr + 9, top + hh - U / 2 * sc + 4, { color: "#fff", size: 10, weight: 700, align: "center" });
      }
      { const { ctx, W, H: HH } = Q; ctx.clearRect(0, 0, W, HH);
        const pm = Math.sqrt(2 * m * T.ytop) * 1.05;
        B = LW.axes(ctx, { x: 46, y: 10, w: W - 56, h: HH - 46 }, { xr: T.xr, yr: [-pm, pm], xlabel: "position x", ylabel: "momentum p", colors: C, ny: 4 });
        B.clip(); const xs = LW.linspace(T.xr[0], T.xr[1], 240);
        for (let k = 1; k <= 9; k++) { const Ek = T.ytop * k / 9.5; [1, -1].forEach(sgn => { LW.path(ctx, xs, xs.map(xx => { const d = Ek - T.V(xx); return d >= 0 ? sgn * Math.sqrt(2 * m * d) : NaN; }), B, { color: C.line2, width: 1 }); }); }
        [1, -1].forEach(sgn => LW.path(ctx, xs, xs.map(xx => { const d = E - T.V(xx); return d >= 0 ? sgn * Math.sqrt(2 * m * d) : NaN; }), B, { color: GOLD, width: 1.6, dash: [5, 4] }));
        ctx.strokeStyle = ORANGE; ctx.lineWidth = 2; ctx.beginPath(); let prev = null; trail.forEach(q => { const X = B.sx(q[0]), Y = B.sy(q[1]); if (!prev || Math.abs(X - prev) > 40) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); prev = X; }); ctx.stroke();
        LW.dot(ctx, B.sx(x), B.sy(p), 6.5, ORANGE, C.card, 2); ctx.restore();
      }
      const f = v => (v < 0 ? "−" : "") + Math.abs(v).toFixed(3);
      S.set("x", f(x)); S.set("v", f(p / m)); S.set("p", f(p)); S.set("F", f(F)); S.set("K", f(K)); S.set("U", f(U)); S.set("E", f(E) + (gamma === 0 ? "" : " ↓"));
    }
    P.draw = Q.draw = draw;
    LW.drag(Q.cv, { down: q => { if (!B) return false; reset(LW.clamp(B.ix(q.x), POT[key].xr[0], POT[key].xr[1]), B.iy(q.y)); draw(); return false; } });
    reset(...POT[key].E0); draw(); loop.start();
  });
})();
