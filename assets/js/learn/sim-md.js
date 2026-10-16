/* 3.2 Molecular dynamics from scratch: a 2D Lennard-Jones fluid in reduced units with a choice of
   integrator and thermostat, live energies and the radial distribution function. */
(function () {
  "use strict";
  LW.register("md2d", function (root, opts) {
    const side = 10, N = side * side, rc = 2.5, rc2 = rc * rc, ec = 4 * (Math.pow(rc, -12) - Math.pow(rc, -6));
    let rho = opts.rho || 0.6, T0 = opts.T || 1.0, dt = 0.005, integ = "verlet", thermo = "none", L, x, y, vx, vy, fx, fy, pe = 0, t = 0;
    let hist = [], E0 = null, view = "energy", gr = null, grN = 0, rng = LW.rng(9);
    const row = LW.h("div", { class: "lw-row" }); root.append(row);
    const left = LW.h("div"), right = LW.h("div"); row.append(left, right);
    const P = LW.canvas(left, { height: w => Math.min(w, 420) });
    const Q = LW.canvas(right, { aspect: 0.82, minH: 220, maxH: 320 });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Integrator", options: [["verlet", "Velocity Verlet"], ["euler", "Euler"]], value: integ, onChange: v => { integ = v; E0 = null; hist = []; } });
    LW.seg(ctl, { label: "Thermostat", options: [["none", "None (NVE)"], ["ber", "Berendsen"], ["lan", "Langevin"]], value: thermo, onChange: v => { thermo = v; E0 = null; hist = []; } });
    LW.seg(ctl, { label: "Plot", options: [["energy", "Energies"], ["gr", "g(r)"]], value: view, onChange: v => { view = v; draw(); } });
    const c2 = LW.controls(root);
    LW.slider(c2, { label: "Time step Δt (τ)", min: 0.001, max: 0.03, value: dt, log: true, fmt: v => v.toFixed(4), onInput: v => { dt = v; E0 = null; hist = []; } });
    LW.slider(c2, { label: "Target temperature T*", min: 0.2, max: 3, step: 0.05, value: T0, fmt: v => v.toFixed(2), onInput: v => { T0 = v; gr = null; grN = 0; } });
    LW.slider(c2, { label: "Density ρ*", min: 0.2, max: 0.85, step: 0.01, value: rho, fmt: v => v.toFixed(2), onInput: v => { rho = v; init(); } });
    const c3 = LW.controls(root);
    const runB = LW.button(c3, "Pause", () => { runB.textContent = loop.toggle() ? "Pause" : "Run"; }, { primary: true });
    LW.button(c3, "Restart", () => init());
    LW.button(c3, "Kick: heat by 50%", () => { const s = Math.sqrt(1.5); for (let i = 0; i < N; i++) { vx[i] *= s; vy[i] *= s; } E0 = null; hist = []; });
    const S = LW.stats(root, [["t", "time t*"], ["T", "temperature T*"], ["E", "total energy / N"], ["dE", "drift of E / N since start"]]);
    LW.note(root, "Reduced Lennard-Jones units: lengths in σ, energies in ε, time in τ = σ√(m/ε) (2.2 ps for argon). 100 atoms in a periodic box.");

    function forces() {
      fx.fill(0); fy.fill(0); pe = 0; const hL = L / 2;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let dx = x[i] - x[j], dy = y[i] - y[j];
        if (dx > hL) dx -= L; else if (dx < -hL) dx += L; if (dy > hL) dy -= L; else if (dy < -hL) dy += L;
        const r2 = dx * dx + dy * dy; if (r2 > rc2) continue;
        const i2 = 1 / r2, i6 = i2 * i2 * i2, f = 24 * i2 * i6 * (2 * i6 - 1);
        fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy; pe += 4 * i6 * (i6 - 1) - ec;
      }
    }
    const ke = () => { let k = 0; for (let i = 0; i < N; i++) k += vx[i] * vx[i] + vy[i] * vy[i]; return 0.5 * k; };
    const temp = () => 2 * ke() / (2 * N - 2);
    function init() {
      L = Math.sqrt(N / rho); x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N); fx = new Float64Array(N); fy = new Float64Array(N);
      for (let i = 0; i < N; i++) { x[i] = ((i % side) + 0.5 + (Math.floor(i / side) % 2) * 0.25) * L / side; y[i] = (Math.floor(i / side) + 0.5) * L / side; vx[i] = rng.normal(); vy[i] = rng.normal(); }
      let mx = 0, my = 0; for (let i = 0; i < N; i++) { mx += vx[i] / N; my += vy[i] / N; } for (let i = 0; i < N; i++) { vx[i] -= mx; vy[i] -= my; }
      const s = Math.sqrt(T0 / temp()); for (let i = 0; i < N; i++) { vx[i] *= s; vy[i] *= s; }
      forces(); t = 0; hist = []; E0 = null; gr = null; grN = 0; draw();
    }
    function step() {
      if (integ === "verlet") {
        for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; x[i] += dt * vx[i]; y[i] += dt * vy[i]; }
        wrap(); forces();
        for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; }
      } else {
        for (let i = 0; i < N; i++) { x[i] += dt * vx[i]; y[i] += dt * vy[i]; vx[i] += dt * fx[i]; vy[i] += dt * fy[i]; }
        wrap(); forces();
      }
      if (thermo === "ber") { const lam = Math.sqrt(Math.max(0.5, 1 + (dt / 0.1) * (T0 / Math.max(temp(), 1e-6) - 1))); for (let i = 0; i < N; i++) { vx[i] *= lam; vy[i] *= lam; } }
      else if (thermo === "lan") { const g = 1, c1 = Math.exp(-g * dt), c2 = Math.sqrt((1 - c1 * c1) * T0); for (let i = 0; i < N; i++) { vx[i] = c1 * vx[i] + c2 * rng.normal(); vy[i] = c1 * vy[i] + c2 * rng.normal(); } }
      t += dt;
    }
    function wrap() { for (let i = 0; i < N; i++) { x[i] -= L * Math.floor(x[i] / L); y[i] -= L * Math.floor(y[i] / L); } }
    function sampleGr() {
      const nb = 60, rmax = Math.min(L / 2, 4), dr = rmax / nb; if (!gr) { gr = new Float64Array(nb); grN = 0; } const hL = L / 2;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { let dx = x[i] - x[j], dy = y[i] - y[j]; if (dx > hL) dx -= L; else if (dx < -hL) dx += L; if (dy > hL) dy -= L; else if (dy < -hL) dy += L; const r = Math.sqrt(dx * dx + dy * dy); if (r < rmax) gr[Math.floor(r / dr)] += 2; }
      grN++; gr.rmax = rmax; gr.dr = dr;
    }
    let frame = 0;
    const loop = LW.loop(root, () => {
      const nsub = Math.max(2, Math.round(0.04 / dt));
      for (let k = 0; k < Math.min(nsub, 20); k++) {
        step();
        if (!isFinite(pe) || Math.abs(pe) > 1e9) { init(); break; }
      }
      const k = ke(), E = (k + pe) / N; if (E0 === null) E0 = E;
      hist.push([t, k / N, pe / N, E]); if (hist.length > 500) hist.shift();
      if (++frame % 3 === 0) sampleGr();
      draw();
    });
    function draw() {
      const C = LW.colors();
      { const { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
        const s = Math.min(W, H) - 4, ox = (W - s) / 2, oy = 2, sc = s / L;
        ctx.fillStyle = C.bg2; ctx.fillRect(ox, oy, s, s); ctx.strokeStyle = C.line2; ctx.strokeRect(ox + .5, oy + .5, s - 1, s - 1);
        ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, s, s); ctx.clip();
        const vmax = 3 * Math.sqrt(Math.max(T0, 0.2));
        for (let i = 0; i < N; i++) { const sp = Math.hypot(vx[i], vy[i]); for (const dxs of [-1, 0, 1]) for (const dys of [-1, 0, 1]) { const px = ox + (x[i] + dxs * L) * sc, py = oy + (y[i] + dys * L) * sc; if (px < ox - sc || px > ox + s + sc || py < oy - sc || py > oy + s + sc) continue; LW.dot(ctx, px, py, 0.5 * sc, LW.ramp(0.15 + 0.85 * sp / vmax, C), C.dark ? "rgba(0,0,0,.4)" : "rgba(255,255,255,.7)", 1); } }
        ctx.restore();
      }
      { const { ctx, W, H } = Q; ctx.clearRect(0, 0, W, H);
        if (view === "energy") {
          const ts = hist.map(h => h[0]), all = hist.flatMap(h => [h[1], h[2], h[3]]);
          let lo = all.length ? Math.min(...all) : -3, hi = all.length ? Math.max(...all) : 2; const pad = (hi - lo) * 0.1 + 0.05; lo -= pad; hi += pad;
          const B = LW.axes(ctx, { x: 58, y: 22, w: W - 70, h: H - 62 }, { xr: [ts[0] || 0, Math.max((ts[0] || 0) + 1, ts[ts.length - 1] || 1)], yr: [lo, hi], xlabel: "time t*", ylabel: "energy per atom (ε)", title: "Kinetic, potential and total energy", colors: C });
          B.clip(); LW.path(ctx, ts, hist.map(h => h[1]), B, { color: C.orange, width: 1.8 }); LW.path(ctx, ts, hist.map(h => h[2]), B, { color: C.teal, width: 1.8 }); LW.path(ctx, ts, hist.map(h => h[3]), B, { color: C.ink, width: 2.4 }); ctx.restore();
          LW.text(ctx, "total", B.box.x + B.box.w - 4, B.sy(hist.length ? hist[hist.length - 1][3] : 0) - 6, { color: C.ink, size: 11, align: "right" });
          LW.text(ctx, "kinetic", B.box.x + B.box.w - 4, B.sy(hist.length ? hist[hist.length - 1][1] : 0) - 6, { color: C.orange, size: 11, align: "right" });
          LW.text(ctx, "potential", B.box.x + B.box.w - 4, B.sy(hist.length ? hist[hist.length - 1][2] : 0) + 14, { color: C.teal, size: 11, align: "right" });
        } else {
          const nb = gr ? gr.length : 60, dr = gr ? gr.dr : 0.066, rs = Array.from({ length: nb }, (_, i) => (i + 0.5) * dr);
          const g = rs.map((r, i) => (gr && grN ? gr[i] / (grN * N * rho * Math.PI * ((r + dr / 2) ** 2 - (r - dr / 2) ** 2)) : 0));
          const B = LW.axes(ctx, { x: 58, y: 22, w: W - 70, h: H - 62 }, { xr: [0, gr ? gr.rmax : 4], yr: [0, Math.max(3, ...g) * 1.08], xlabel: "r (σ)", ylabel: "g(r)", title: "Radial distribution function (" + grN + " frames)", colors: C });
          B.clip(); ctx.strokeStyle = C.line2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(B.box.x, B.sy(1)); ctx.lineTo(B.box.x + B.box.w, B.sy(1)); ctx.stroke(); ctx.setLineDash([]);
          LW.path(ctx, rs, g, B, { color: C.accent, width: 2.2 }); ctx.restore();
        }
      }
      const last = hist[hist.length - 1];
      S.set("t", t.toFixed(2)); S.set("T", LW.fmt(temp(), 3)); S.set("E", last ? LW.fmt(last[3], 4) : "–");
      S.set("dE", last && E0 !== null ? (thermo === "none" ? (last[3] - E0 >= 0 ? "+" : "") + LW.fmt(last[3] - E0, 4) + " ε" : "not conserved") : "–");
    }
    P.draw = Q.draw = draw;
    init(); loop.start();
  });
})();
