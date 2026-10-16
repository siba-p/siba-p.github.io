/* Science 2: quantised energy levels — particle in a box and harmonic oscillator — their
   wavefunctions, the classical limit, and Boltzmann populations at temperature T (ħ = m = 1). */
(function () {
  "use strict";
  const GOLD = "#d4a017", ORANGE = "#f08c2e", BLUE = "#4c6ef5", ROSE = "#e64980", TEAL = "#12a594";
  function hoPsi(nMax, xi) { // normalised Hermite functions by stable recursion, in units with ω = 1
    const out = [Math.pow(Math.PI, -0.25) * Math.exp(-xi * xi / 2)];
    if (nMax >= 1) out.push(Math.sqrt(2) * xi * out[0]);
    for (let n = 1; n < nMax; n++) out.push(Math.sqrt(2 / (n + 1)) * xi * out[n] - Math.sqrt(n / (n + 1)) * out[n - 1]);
    return out;
  }
  LW.register("quantum", function (root) {
    let sys = "ho", n = 0, Lb = 2, w = 1, kT = 0.5, view = "psi", classical = true;
    const qn = k => (sys === "box" ? k + 1 : k); // the box counts from n = 1, the oscillator from n = 0
    const P = LW.canvas(root, { height: w0 => (w0 < 560 ? 580 : Math.min(420, Math.max(320, w0 * 0.5))) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "System", options: [["box", "Particle in a box"], ["ho", "Harmonic oscillator"]], value: sys, onChange: v => { sys = v; ns.set(n); draw(); } });
    LW.seg(ctl, { label: "Show", options: [["psi", "Wavefunction ψ"], ["prob", "Probability |ψ|²"]], value: view, onChange: v => { view = v; draw(); } });
    const c2 = LW.controls(root);
    const ns = LW.slider(c2, { label: "Highlighted level n", min: 0, max: 12, step: 1, value: n, fmt: v => String(qn(v)), onInput: v => { n = v; draw(); } });
    LW.slider(c2, { label: "Box length L", min: 1, max: 4, step: 0.05, value: Lb, fmt: v => v.toFixed(2), onInput: v => { Lb = v; draw(); } });
    LW.slider(c2, { label: "Oscillator frequency ω", min: 0.5, max: 2, step: 0.05, value: w, fmt: v => v.toFixed(2), onInput: v => { w = v; draw(); } });
    const c3 = LW.controls(root);
    LW.slider(c3, { label: "Temperature k<sub>B</sub>T", min: 0.05, max: 20, value: kT, log: true, fmt: v => v.toFixed(2), onInput: v => { kT = v; draw(); } });
    LW.check(c3, { label: "Overlay the classical probability (highlighted level)", value: classical, onChange: v => { classical = v; draw(); } });
    const S = LW.stats(root, [["En", "energy of level n"], ["gap", "spacing to the next level"], ["mean", "thermal mean energy ⟨E⟩"], ["cl", "classical prediction"], ["p0", "population of the ground state"]]);
    const levels = () => { const N = 400, E = []; for (let k = 0; k < N; k++) E.push(sys === "box" ? (k + 1) ** 2 * Math.PI ** 2 / (2 * Lb * Lb) : (k + 0.5) * w); return E; };
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const E = levels(), nShow = 13, Emax = E[nShow - 1] * 1.08 + 0.2;
      const narrow = W < 560, split = narrow ? W : W * 0.64, box = { x: 46, y: 10, w: split - 60, h: narrow ? 330 : H - 46 };
      const xr = sys === "box" ? [-0.15 * Lb, 1.15 * Lb] : [-Math.sqrt(2 * Emax / (w * w)) * 1.05, Math.sqrt(2 * Emax / (w * w)) * 1.05];
      const A = LW.axes(ctx, box, { xr, yr: [0, Emax], xlabel: "position x", ylabel: "energy", colors: C, ny: 5 });
      const xs = LW.linspace(xr[0], xr[1], 400); A.clip();
      if (sys === "box") { ctx.fillStyle = C.dark ? "rgba(255,255,255,.07)" : "rgba(12,18,34,.07)"; ctx.fillRect(A.box.x, A.box.y, A.sx(0) - A.box.x, A.box.h); ctx.fillRect(A.sx(Lb), A.box.y, A.box.x + A.box.w - A.sx(Lb), A.box.h); ctx.strokeStyle = BLUE; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(A.sx(0), A.box.y); ctx.lineTo(A.sx(0), A.sy(0)); ctx.lineTo(A.sx(Lb), A.sy(0)); ctx.lineTo(A.sx(Lb), A.box.y); ctx.stroke(); }
      else LW.path(ctx, xs, xs.map(x => 0.5 * w * w * x * x), A, { color: BLUE, width: 2.5 });
      const spacing = (E[1] - E[0]), amp = spacing * 0.42;
      for (let k = 0; k < nShow; k++) {
        const on = k === n, Ek = E[k];
        ctx.strokeStyle = on ? GOLD : C.line2; ctx.lineWidth = on ? 1.6 : 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(A.box.x, A.sy(Ek)); ctx.lineTo(A.box.x + A.box.w, A.sy(Ek)); ctx.stroke(); ctx.setLineDash([]);
        let ys;
        if (sys === "box") ys = xs.map(x => (x < 0 || x > Lb ? 0 : Math.sqrt(2 / Lb) * Math.sin((k + 1) * Math.PI * x / Lb)));
        else ys = xs.map(x => hoPsi(k, Math.sqrt(w) * x)[k] * Math.pow(w, 0.25));
        const peak = Math.max(...ys.map(Math.abs)) || 1, sc = (sys === "box" ? E[Math.min(k + 1, E.length - 1)] - Ek : spacing) * (on ? 0.8 : 0.42) / (view === "prob" ? peak * peak : peak);
        const yv = ys.map(y => Ek + (view === "prob" ? y * y : y) * sc);
        if (on && view === "prob") LW.band(ctx, xs, xs.map(() => Ek), yv, A, C.dark ? "rgba(224,178,74,.25)" : "rgba(212,160,23,.18)");
        LW.path(ctx, xs, yv, A, { color: on ? ORANGE : C.ink3, width: on ? 2.4 : 1.1, alpha: on ? 1 : 0.6 });
        if (on && classical && view === "prob") { // classical density for the same energy
          let cl; if (sys === "ho") { const a = Math.sqrt(2 * Ek) / w; cl = xs.map(x => (Math.abs(x) < a * 0.999 ? 1 / (Math.PI * Math.sqrt(a * a - x * x)) : NaN)); } else cl = xs.map(x => (x >= 0 && x <= Lb ? 1 / Lb : NaN));
          LW.path(ctx, xs, cl.map(v => Ek + Math.min(v, peak * peak * 1.4) * sc), A, { color: TEAL, width: 2, dash: [6, 4] });
        }
      }
      ctx.restore();
      LW.text(ctx, "n = " + qn(n), A.box.x + 6, A.sy(E[n]) - 6, { color: GOLD, size: 11, weight: 700 });
      // thermal populations
      const pTop = narrow ? 380 : 0, bx0 = narrow ? 10 : split + 16, bw = W - bx0 - 10, by = pTop + 30, bh = narrow ? H - by - 8 : H - 70;
      const ws = E.map(e => Math.exp(-(e - E[0]) / kT)), Z = ws.reduce((a, b) => a + b, 0), pop = ws.map(v => v / Z);
      LW.text(ctx, "Thermal populations p_n ∝ e^(−E_n / k_BT)", bx0, pTop + 18, { color: C.ink2, size: 11.5, weight: 600 });
      const rows = 12, rh = bh / rows;
      for (let k = 0; k < rows; k++) { const y = by + bh - (k + 1) * rh; ctx.fillStyle = k === n ? ORANGE : BLUE; ctx.globalAlpha = 0.85; ctx.fillRect(bx0 + 30, y + 2, Math.max(1, pop[k] * (bw - 80)), rh - 4); ctx.globalAlpha = 1;
        LW.text(ctx, "n=" + qn(k), bx0, y + rh / 2 + 4, { color: C.ink3, size: 10, mono: true }); LW.text(ctx, (pop[k] * 100).toFixed(pop[k] < 0.1 ? 1 : 0) + "%", bx0 + 34 + Math.max(1, pop[k] * (bw - 80)), y + rh / 2 + 4, { color: C.ink2, size: 10, mono: true }); }
      const mean = pop.reduce((s, q, k) => s + q * E[k], 0), cl = sys === "ho" ? kT : kT / 2;
      S.set("En", E[n].toFixed(3)); S.set("gap", (E[n + 1] - E[n]).toFixed(3)); S.set("mean", mean.toFixed(3)); S.set("cl", (sys === "ho" ? "k_BT = " : "k_BT/2 = ") + cl.toFixed(3)); S.set("p0", (pop[0] * 100).toFixed(1) + " %");
    }
    P.draw = draw; draw();
  });
})();
