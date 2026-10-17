/* Liquids: a two-dimensional Lennard-Jones fluid run by molecular dynamics in a periodic box,
   with its radial distribution function g(r), running coordination number and potential of
   mean force w(r) = −kT ln g(r) accumulated live. Reduced units: σ = ε = m = k_B = 1. */
(function () {
  "use strict";
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const RC = 2.5, RC2 = RC * RC, ESH = 4 * (Math.pow(RC, -12) - Math.pow(RC, -6));
  LW.register("liquid2d", function (root, opts) {
    let N = 144, rho = 0.7, Tt = 0.9, L, x, y, vx, vy, fx, fy, NB = 120, RMAX, gh, gn = 0, steps = 0, pe = 0, vir = 0, view = "g";
    const P = LW.canvas(root, { height: w => (w < 640 ? 640 : 400) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Density ρσ²", min: 0.05, max: 0.95, step: 0.01, value: rho, fmt: v => v.toFixed(2), onInput: v => { rho = v; init(); } });
    LW.slider(ctl, { label: "Temperature k<sub>B</sub>T/ε", min: 0.3, max: 2.5, step: 0.01, value: Tt, fmt: v => v.toFixed(2), onInput: v => { Tt = v; gReset(); } });
    const c2 = LW.controls(root);
    LW.seg(c2, { label: "Right panel", options: [["g", "g(r) and coordination number"], ["w", "potential of mean force w(r) vs pair potential u(r)"]], value: view, onChange: v => { view = v; draw(); } });
    LW.button(c2, "Reset the histogram", () => gReset());
    const S = LW.stats(root, [["T", "kinetic temperature"], ["pe", "potential energy per atom"], ["P", "pressure (virial)"], ["cn", "coordination number (to first minimum)"], ["n", "frames in g(r)"]]);
    function init() {
      L = Math.sqrt(N / rho); RMAX = Math.min(L / 2, 4); x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N); fx = new Float64Array(N); fy = new Float64Array(N);
      const side = Math.ceil(Math.sqrt(N)), a = L / side, r = LW.rng(3); let sx = 0, sy = 0;
      for (let i = 0; i < N; i++) { x[i] = (i % side + 0.5 + (Math.floor(i / side) % 2) * 0.25) * a; y[i] = (Math.floor(i / side) + 0.5) * a; vx[i] = r.normal() * Math.sqrt(Tt); vy[i] = r.normal() * Math.sqrt(Tt); sx += vx[i]; sy += vy[i]; }
      for (let i = 0; i < N; i++) { vx[i] -= sx / N; vy[i] -= sy / N; }
      forces(); gReset(); steps = 0;
    }
    function gReset() { gh = new Float64Array(NB); gn = 0; draw(); }
    function forces() { fx.fill(0); fy.fill(0); pe = 0; vir = 0;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { let dx = x[j] - x[i], dy = y[j] - y[i]; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); const r2 = dx * dx + dy * dy; if (r2 < RC2) { const ir2 = 1 / r2, s6 = ir2 * ir2 * ir2, f = 24 * ir2 * s6 * (2 * s6 - 1); fx[i] -= f * dx; fy[i] -= f * dy; fx[j] += f * dx; fy[j] += f * dy; pe += 4 * s6 * (s6 - 1) - ESH; vir += f * r2; } } }
    function md(n) { const dt = 0.004;
      for (let s = 0; s < n; s++) { for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; x[i] += dt * vx[i]; y[i] += dt * vy[i]; x[i] -= L * Math.floor(x[i] / L); y[i] -= L * Math.floor(y[i] / L); }
        forces(); let ke = 0; for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; ke += 0.5 * (vx[i] * vx[i] + vy[i] * vy[i]); }
        const Tk = ke / (N - 1), lam = Math.sqrt(1 + 0.02 * (Tt / Tk - 1)); for (let i = 0; i < N; i++) { vx[i] *= lam; vy[i] *= lam; } steps++; } }
    function sampleG() { const dr = RMAX / NB; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { let dx = x[j] - x[i], dy = y[j] - y[i]; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); const r = Math.sqrt(dx * dx + dy * dy); if (r < RMAX) gh[Math.floor(r / dr)] += 2; } gn++; }
    const loop = LW.loop(root, () => { md(6); if (steps > 300) sampleG(); draw(); });
    function gr() { const dr = RMAX / NB, out = []; for (let k = 0; k < NB; k++) { const r0 = k * dr, r1 = r0 + dr, shell = Math.PI * (r1 * r1 - r0 * r0); out.push(gn ? gh[k] / (gn * N * rho * shell) : 0); } return out; }
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640;
      const side = narrow ? Math.min(W - 20, 320) : Math.min(H - 20, W * 0.42), ox = narrow ? (W - side) / 2 : 10, oy = 10, sc = side / L;
      ctx.fillStyle = C.bg2; ctx.fillRect(ox, oy, side, side); ctx.strokeStyle = C.line2; ctx.strokeRect(ox + 0.5, oy + 0.5, side, side);
      // highlight neighbours of atom 0 within first shell
      const g = gr(), dr = RMAX / NB; let rmin = 1.5; { let k0 = g.findIndex((v, k) => k * dr > 0.9 && v > 1.2); if (k0 > 0) { for (let k = k0 + 2; k < NB - 1; k++) if (g[k] <= g[k - 1] && g[k] <= g[k + 1] && k * dr > 1.15) { rmin = (k + 0.5) * dr; break; } } }
      ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, side, side); ctx.clip();
      for (let i = 0; i < N; i++) { let dx = x[i] - x[0], dy = y[i] - y[0]; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); const near = i > 0 && dx * dx + dy * dy < rmin * rmin;
        for (const sxs of [-1, 0, 1]) for (const sys of [-1, 0, 1]) { const px = ox + (x[i] + sxs * L) * sc, py = oy + (y[i] + sys * L) * sc; if (px < ox - sc || px > ox + side + sc || py < oy - sc || py > oy + side + sc) continue; LW.dot(ctx, px, py, Math.max(2, 0.5 * sc), i === 0 ? ROSE : near ? TEAL : BLUE, null); } }
      ctx.strokeStyle = ROSE; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(ox + x[0] * sc, oy + y[0] * sc, rmin * sc, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      LW.text(ctx, "rose: a tagged atom; teal: its first shell of neighbours", ox, oy + side + 14, { color: C.ink3, size: 10.5 });
      const gx = narrow ? 50 : ox + side + 58, gy = narrow ? oy + side + 44 : 22, gw = narrow ? W - 64 : W - gx - 14, gh2 = narrow ? H - gy - 40 : H - 58;
      const rs = g.map((_, k) => (k + 0.5) * dr);
      if (view === "g") {
        const A = LW.axes(ctx, { x: gx, y: gy, w: gw, h: gh2 }, { xr: [0, RMAX], yr: [0, Math.max(3, ...g) * 1.05], xlabel: "distance r / σ", ylabel: "g(r)", colors: C, title: "radial distribution function (teal) and running coordination number (violet)" });
        A.clip(); LW.path(ctx, [0, RMAX], [1, 1], A, { color: C.ink3, width: 1, dash: [4, 4] });
        LW.path(ctx, rs, g, A, { color: TEAL, width: 2.4 });
        let cum = 0; const nr = g.map((v, k) => { const r0 = k * dr, r1 = r0 + dr; cum += rho * v * Math.PI * (r1 * r1 - r0 * r0); return cum; }); const ymax = Math.max(3, ...g) * 1.05;
        LW.path(ctx, rs, nr.map(v => v / 12 * ymax), A, { color: VIOLET, width: 1.6, dash: [6, 3] });
        ctx.strokeStyle = ROSE; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(A.sx(rmin), A.box.y); ctx.lineTo(A.sx(rmin), A.box.y + A.box.h); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        LW.text(ctx, "violet: n(r), right scale 0–12", A.box.x + A.box.w - 6, A.box.y + 14, { color: VIOLET, size: 10.5, align: "right" });
        const k = Math.min(NB - 1, Math.floor(rmin / dr)); S.set("cn", gn > 5 ? nr[k].toFixed(2) + "  (to r = " + rmin.toFixed(2) + ")" : "–");
      } else {
        const A = LW.axes(ctx, { x: gx, y: gy, w: gw, h: gh2 }, { xr: [0.8, RMAX], yr: [-2, 2.5], xlabel: "distance r / σ", ylabel: "energy / ε", colors: C, title: "potential of mean force w(r) = −kT ln g(r) (orange) and bare pair potential u(r) (blue)" });
        A.clip(); LW.path(ctx, [0.8, RMAX], [0, 0], A, { color: C.ink3, width: 1, dash: [4, 4] }); const us = LW.linspace(0.85, RMAX, 200);
        LW.path(ctx, us, us.map(r => 4 * (Math.pow(r, -12) - Math.pow(r, -6))), A, { color: BLUE, width: 2.2 });
        LW.path(ctx, rs, g.map(v => (v > 0.02 ? -Tt * Math.log(v) : NaN)), A, { color: ORANGE, width: 2.4 }); ctx.restore();
        S.set("cn", "–");
      }
      let ke = 0; for (let i = 0; i < N; i++) ke += 0.5 * (vx[i] * vx[i] + vy[i] * vy[i]); const Tk = ke / (N - 1);
      S.set("T", Tk.toFixed(3)); S.set("pe", (pe / N).toFixed(3)); S.set("P", (rho * Tk + vir / (2 * L * L)).toFixed(3)); S.set("n", String(gn));
    }
    P.draw = draw; init(); loop.start();
  });
})();
