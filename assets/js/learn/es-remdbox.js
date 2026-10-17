/* Replica exchange on the LJ7 cluster, shown as a row of simulation boxes.
   Boxes are fixed temperatures; configurations carry an identity colour and slide between boxes
   when a swap is accepted. Below: the temperature walk of each replica and the potential-energy
   distributions whose overlap sets the acceptance. A plain MD box at the lowest temperature runs alongside. */
(function () {
  "use strict";
  const IDC = ["#12a594", "#3b5bdb", "#ae3ec9", "#e8590c", "#d6336c", "#f08c00", "#1c7ed6"];
  const tcol = t => { const a = [28, 126, 214], b = [224, 49, 49], c = a.map((v, i) => Math.round(v + (b[i] - v) * t)); return `rgb(${c[0]},${c[1]},${c[2]})`; };

  LW.register("remdbox", function (root) {
    const L = LW.lj7, dt = 0.005, gamma = 1, SPF = 30;
    let n = 5, Tmax = 0.30, Tmin = 0.06, every = 100, swaps = true, reps, Ts, ctrl, time, nstep, acc, att, walk, hist, events, anim, foundR, foundC, R;
    const P = LW.canvas(root, { height: w => (w < 640 ? 760 : 520) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Replicas", min: 3, max: 7, step: 1, value: n, fmt: v => v.toFixed(0), onInput: v => { n = v; reset(); } });
    LW.slider(ctl, { label: "Highest temperature k<sub>B</sub>T / ε", min: 0.12, max: 0.5, value: Tmax, fmt: v => v.toFixed(2), onInput: v => { Tmax = v; reset(); } });
    LW.slider(ctl, { label: "MD steps between swap attempts", min: 10, max: 1000, value: every, log: true, fmt: v => Math.round(v).toString(), onInput: v => { every = Math.round(v); } });
    const ctl2 = LW.controls(root);
    LW.check(ctl2, { label: "Exchanges on", value: swaps, onChange: v => { swaps = v; } });
    const bRun = LW.button(ctl2, "Pause", () => { loop.toggle(); bRun.textContent = loop.running ? "Pause" : "Run"; }, { primary: true });
    LW.button(ctl2, "Restart", () => reset());
    const S = LW.stats(root, [["t", "simulated time (τ)"], ["acc", "swap acceptance, neighbouring pairs"], ["md", "plain MD at the lowest T"], ["re", "replica exchange, lowest-T box"]]);
    LW.note(root, "All replicas start in the same higher-energy isomer (E = −11.50 ε). The ground state is the hexagon around a central six-coordinated atom (outlined), 1.03 ε lower. Each box is a fixed temperature; the colour of the atoms identifies a replica, so you can follow one configuration as it is passed up and down the ladder.");

    function reset() {
      R = LW.lj7.rng(7); Ts = Array.from({ length: n }, (_, i) => Tmin * Math.pow(Tmax / Tmin, i / (n - 1)));
      reps = Ts.map((kT, i) => Object.assign(L.make(20 + i, kT, "trap"), { id: i }));
      ctrl = L.make(99, Tmin, "trap"); time = 0; nstep = 0; acc = new Array(n).fill(0); att = new Array(n).fill(0);
      walk = Ts.map(() => []); hist = Ts.map(() => new Array(50).fill(0)); events = []; anim = []; foundR = -1; foundC = -1;
      if (loop) { loop.start(); bRun.textContent = "Pause"; } draw();
    }
    function attempt() { const par = (nstep / every) % 2;
      for (let k = par; k < n - 1; k += 2) { const a = reps[k], b = reps[k + 1], d = (1 / a.kT - 1 / b.kT) * (a.E - b.E); att[k]++;
        const ok = d >= 0 || R() < Math.exp(d); events.push({ k, ok, t: performance.now() });
        if (ok) { acc[k]++; const s = Math.sqrt(b.kT / a.kT); a.v.forEach(v => { v[0] *= s; v[1] *= s; }); b.v.forEach(v => { v[0] /= s; v[1] /= s; }); const ta = a.kT; a.kT = b.kT; b.kT = ta; reps[k] = b; reps[k + 1] = a; anim.push({ k, t0: performance.now() }); } } }
    const loop = LW.loop(root, () => {
      for (let s = 0; s < SPF; s++) { reps.forEach(r => L.step(r, dt, gamma)); L.step(ctrl, dt, gamma); nstep++; time += dt; if (swaps && nstep % every === 0) attempt(); }
      reps.forEach((r, k) => { const b = Math.floor((r.E + 12.8) / 0.12); if (b >= 0 && b < 50) hist[k][b]++; });
      if (walk[0].length >= 4000) walk.forEach(w => w.shift()); reps.forEach((r, k) => walk[r.id].push(k));
      if (foundR < 0 && L.isHexagon(reps[0].p)) foundR = time; if (foundC < 0 && L.isHexagon(ctrl.p)) foundC = time;
      draw();
    });

    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); const narrow = W < 640, now = performance.now();
      // boxes: control + ladder
      const cols = narrow ? Math.ceil((n + 1) / 2) : n + 1, rows = narrow ? 2 : 1, gap = narrow ? 10 : 14, bw = Math.min(150, (W - 20 - gap * (cols - 1)) / cols), x0 = (W - (cols * bw + gap * (cols - 1))) / 2, y0 = 26;
      const slot = i => { const r = Math.floor(i / cols), c = i % cols; return { x: x0 + c * (bw + gap), y: y0 + r * (bw + 46), w: bw, h: bw }; };
      // control box
      const cb = slot(0); ctx.fillStyle = C.bg2; ctx.fillRect(cb.x, cb.y, cb.w, cb.h); ctx.strokeStyle = C.ink3; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.strokeRect(cb.x + 0.5, cb.y + 0.5, cb.w, cb.h); ctx.setLineDash([]);
      L.drawCluster(ctx, C, ctrl, cb, C.ink3);
      LW.text(ctx, "plain MD", cb.x, cb.y - 8, { color: C.ink2, size: 11, weight: 600 }); LW.text(ctx, "kT = " + Tmin.toFixed(2) + (L.isHexagon(ctrl.p) ? " · hexagon" : " · trapped"), cb.x, cb.y + cb.h + 14, { color: C.ink3, size: 10.5 });
      // ladder boxes
      const boxes = Ts.map((_, k) => slot(k + 1));
      boxes.forEach((b, k) => { const tc = tcol(k / (n - 1)); ctx.fillStyle = C.bg2; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeStyle = tc; ctx.lineWidth = 3; ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
        LW.text(ctx, "kT = " + Ts[k].toFixed(3), b.x, b.y - 8, { color: tc, size: 11, weight: 600 });
        LW.text(ctx, "E = " + reps[k].E.toFixed(2) + (L.isHexagon(reps[k].p) ? " · hexagon" : ""), b.x, b.y + b.h + 14, { color: C.ink3, size: 10.5 }); });
      // clusters, with sliding animation for accepted swaps
      anim = anim.filter(a => now - a.t0 < 600);
      const moving = new Map(); anim.forEach(a => { const f = Math.min(1, (now - a.t0) / 600), e = f < 0.5 ? 2 * f * f : 1 - 2 * (1 - f) * (1 - f); moving.set(a.k, { from: boxes[a.k + 1], e, up: -1 }); moving.set(a.k + 1, { from: boxes[a.k], e, up: 1 }); });
      reps.forEach((r, k) => { let b = boxes[k]; const m = moving.get(k); if (m) { const lift = Math.sin(Math.PI * m.e) * bw * 0.35 * m.up; b = { x: m.from.x + (boxes[k].x - m.from.x) * m.e, y: m.from.y + (boxes[k].y - m.from.y) * m.e + lift, w: bw, h: bw }; }
        L.drawCluster(ctx, C, r, b, IDC[r.id % IDC.length]); });
      // swap attempt indicators between neighbouring boxes
      events = events.filter(e => now - e.t < 500);
      events.forEach(e => { const a = boxes[e.k], b = boxes[e.k + 1]; if (Math.abs(a.y - b.y) > 1) return; const x = (a.x + a.w + b.x) / 2, y = a.y + a.h / 2, al = 1 - (now - e.t) / 500;
        ctx.globalAlpha = al; ctx.fillStyle = e.ok ? C.teal : C.rose; ctx.beginPath(); ctx.arc(x, y, Math.max(1, gap * 0.45 + 2), 0, 7); ctx.fill(); ctx.globalAlpha = 1; });
      // temperature walk
      const top = y0 + rows * (bw + 46) + 16, ph = H - top - 34, wk = { x: 46, y: top, w: narrow ? W - 56 : (W - 56) * 0.58, h: narrow ? ph * 0.5 - 40 : ph };
      const span = Math.max(600, walk[0].length), A1 = LW.axes(ctx, wk, { xr: [0, span], yr: [-0.5, n - 0.5], yticks: Ts.map((_, k) => k), yfmt: k => Ts[Math.round(k)] ? Ts[Math.round(k)].toFixed(2) : "", xlabels: false, xlabel: "time →", ylabel: "kT", title: "temperature of each replica over time (bold: the replica now in the coldest box)", colors: C });
      const cold = reps[0].id; walk.forEach((w, id) => { ctx.strokeStyle = IDC[id % IDC.length]; ctx.globalAlpha = id === cold ? 1 : 0.28; ctx.lineWidth = id === cold ? 2.6 : 1.2; ctx.beginPath(); w.forEach((k, i) => { const X = A1.sx(i), Y = A1.sy(k + (id - (n - 1) / 2) * 0.06); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke(); }); ctx.globalAlpha = 1;
      // energy distributions
      const eh = narrow ? { x: 46, y: wk.y + wk.h + 70, w: W - 56, h: ph * 0.5 - 30 } : { x: wk.x + wk.w + 50, y: top, w: W - (wk.x + wk.w + 50) - 10, h: ph };
      const A2 = LW.axes(ctx, eh, { xr: [-12.8, -6.8], yr: [0, 1.05], ylabels: false, xlabel: "potential energy E / ε", title: "energy distributions at each T", colors: C });
      hist.forEach((hh, k) => { const mx = Math.max(...hh); if (!mx) return; const tc = tcol(k / (n - 1)); ctx.fillStyle = tc; ctx.globalAlpha = 0.16; ctx.strokeStyle = tc; ctx.beginPath(); ctx.moveTo(A2.sx(-12.8), A2.sy(0)); hh.forEach((c, i) => ctx.lineTo(A2.sx(-12.8 + (i + 0.5) * 0.12), A2.sy(c / mx))); ctx.lineTo(A2.sx(-12.8 + 50 * 0.12), A2.sy(0)); ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 1.6; ctx.stroke(); });
      const accs = acc.slice(0, n - 1).map((a, k) => (att[k] ? (a / att[k]).toFixed(2) : "–"));
      S.set("t", time.toFixed(1)); S.set("acc", accs.join("  ")); S.set("md", foundC >= 0 ? "reached the hexagon at t = " + foundC.toFixed(1) : "still trapped"); S.set("re", foundR >= 0 ? "reached the hexagon at t = " + foundR.toFixed(1) : "still trapped");
    }
    P.draw = draw; LW.onTheme(draw); reset();
  });
})();
