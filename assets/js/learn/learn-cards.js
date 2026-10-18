/* Living covers for the eight subjects: each canvas[data-art] draws a small animation of its
   subject in white on the cover gradient. Canvases animate only while visible, at about 30 fps,
   and draw a single still frame when the reader prefers reduced motion. */
(function () {
  "use strict";
  const W8 = a => `rgba(255,255,255,${a})`;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const dot = (c, x, y, r, f) => { c.beginPath(); c.arc(x, y, Math.max(0.5, r), 0, 7); c.fillStyle = f; c.fill(); };

  const ART = {
    // a tangent line gliding along a curve, with the derivative traced below
    math: () => { const f = x => 0.32 * Math.sin(2 * Math.PI * 1.15 * x + 0.4) + 0.1 * Math.sin(2 * Math.PI * 3 * x), df = x => 0.32 * 2 * Math.PI * 1.15 * Math.cos(2 * Math.PI * 1.15 * x + 0.4) + 0.1 * 2 * Math.PI * 3 * Math.cos(2 * Math.PI * 3 * x);
      return (c, W, H, t) => { const X = x => W * (0.06 + 0.88 * x), Y = y => H * 0.38 - y * H * 0.62, Yd = y => H * 0.78 - y * H * 0.05;
        c.strokeStyle = W8(0.12); c.lineWidth = 1; for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(W * i / 8, 0); c.lineTo(W * i / 8, H); c.stroke(); }
        c.strokeStyle = W8(0.95); c.lineWidth = 2.4; c.beginPath(); for (let i = 0; i <= 160; i++) { const x = i / 160; i ? c.lineTo(X(x), Y(f(x))) : c.moveTo(X(x), Y(f(x))); } c.stroke();
        const u = (t * 0.07) % 1; c.strokeStyle = W8(0.6); c.lineWidth = 1.6; c.setLineDash([4, 4]); c.beginPath(); for (let i = 0; i <= 160 * u; i++) { const x = i / 160; i ? c.lineTo(X(x), Yd(df(x))) : c.moveTo(X(x), Yd(df(x))); } c.stroke(); c.setLineDash([]);
        const s = df(u) * (-H * 0.62) / (W * 0.88), L = W * 0.2, x0 = X(u), y0 = Y(f(u)), n = Math.hypot(1, s);
        c.strokeStyle = W8(1); c.lineWidth = 2; c.beginPath(); c.moveTo(x0 - L / n, y0 - s * L / n); c.lineTo(x0 + L / n, y0 + s * L / n); c.stroke();
        dot(c, x0, y0, 5, W8(1)); dot(c, x0, Yd(df(u)), 3.5, W8(0.9)); c.strokeStyle = W8(0.3); c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, Yd(df(u))); c.stroke(); }; },
    // memory cells flipping, one byte being read
    computing: () => { const R = rng(3), cols = 8, rows = 7, bits = Array.from({ length: rows * cols }, () => (R() < 0.5 ? 1 : 0)); let last = 0;
      return (c, W, H, t) => { if (t - last > 0.09) { last = t; for (let k = 0; k < 3; k++) bits[Math.floor(R() * bits.length)] ^= 1; }
        const cw = W * 0.86 / cols, ch = H * 0.72 / rows, x0 = W * 0.07, y0 = H * 0.1, row = Math.floor(t * 1.6) % rows;
        c.fillStyle = W8(0.14); c.fillRect(x0 - 4, y0 + row * ch, cols * cw + 8, ch);
        c.font = `600 ${Math.round(ch * 0.62)}px ui-monospace, Menlo, monospace`; c.textAlign = "center"; c.textBaseline = "middle";
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const b = bits[j * cols + i]; c.fillStyle = W8(j === row ? 1 : b ? 0.55 : 0.22); c.fillText(String(b), x0 + (i + 0.5) * cw, y0 + (j + 0.5) * ch); }
        let v = 0; for (let i = 0; i < cols; i++) v = v * 2 + bits[row * cols + i];
        c.font = `600 ${Math.round(H * 0.06)}px ui-monospace, Menlo, monospace`; c.textAlign = "right"; c.fillStyle = W8(0.85); c.fillText("0x" + v.toString(16).toUpperCase().padStart(2, "0") + " = " + v, W * 0.93, H * 0.9); }; },
    // an execution pointer stepping through code, looping and calling
    python: () => { const lines = [[0, 0.55], [1, 0.42], [1, 0.62], [2, 0.5], [2, 0.36], [3, 0.3], [1, 0.48], [0, 0.0], [0, 0.4], [1, 0.52], [1, 0.33]];
      const trace = [8, 9, 0, 1, 2, 3, 4, 5, 2, 3, 4, 5, 2, 3, 4, 5, 6, 10];
      return (c, W, H, t) => { const k = Math.floor(t * 2.2) % trace.length, cur = trace[k], lh = H * 0.8 / lines.length, x0 = W * 0.12, y0 = H * 0.1;
        const inCall = k >= 2 && k <= 16;
        lines.forEach(([ind, w], i) => { if (!w) return; const y = y0 + i * lh; c.fillStyle = W8(i === cur ? 1 : 0.4); c.beginPath(); c.roundRect ? c.roundRect(x0 + ind * W * 0.06, y + lh * 0.3, W * w * 0.62, lh * 0.38, 3) : c.rect(x0 + ind * W * 0.06, y + lh * 0.3, W * w * 0.62, lh * 0.38); c.fill(); });
        const y = y0 + cur * lh + lh * 0.49; c.fillStyle = W8(1); c.beginPath(); c.moveTo(W * 0.04, y - 6); c.lineTo(W * 0.09, y); c.lineTo(W * 0.04, y + 6); c.fill();
        const fx = W * 0.72, fw = W * 0.2, fh = H * 0.1; c.strokeStyle = W8(0.7); c.lineWidth = 1.5; c.strokeRect(fx, H * 0.78, fw, fh); c.font = `600 ${Math.round(fh * 0.45)}px ui-monospace, Menlo, monospace`; c.fillStyle = W8(0.8); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("main", fx + fw / 2, H * 0.78 + fh / 2);
        if (inCall) { c.fillStyle = W8(0.25); c.fillRect(fx, H * 0.78 - fh - 4, fw, fh); c.strokeRect(fx, H * 0.78 - fh - 4, fw, fh); c.fillStyle = W8(1); c.fillText("f()", fx + fw / 2, H * 0.78 - fh / 2 - 4); } }; },
    // signals pulsing through a small network
    ml: () => { const L = [3, 5, 5, 2], R = rng(9); let pulses = [], last = -1;
      return (c, W, H, t) => { const P = (l, i) => [W * (0.14 + 0.72 * l / (L.length - 1)), H * (0.5 + (i - (L[l] - 1) / 2) * 0.17)];
        c.lineWidth = 1; for (let l = 0; l < L.length - 1; l++) for (let i = 0; i < L[l]; i++) for (let j = 0; j < L[l + 1]; j++) { const a = P(l, i), b = P(l + 1, j); c.strokeStyle = W8(0.16); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
        if (t - last > 0.25) { last = t; const i = Math.floor(R() * L[0]); pulses.push({ l: 0, i, j: Math.floor(R() * L[1]), t0: t }); }
        const glow = {}; pulses = pulses.filter(p => { const f = (t - p.t0) / 0.7; if (f >= 1) { glow[(p.l + 1) + ":" + p.j] = 1; if (p.l + 1 < L.length - 1) { pulses.push({ l: p.l + 1, i: p.j, j: Math.floor(R() * L[p.l + 2]), t0: t }); } return false; }
          const a = P(p.l, p.i), b = P(p.l + 1, p.j); c.strokeStyle = W8(0.7); c.lineWidth = 1.6; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); c.stroke(); dot(c, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 3.2, W8(1)); return true; });
        L.forEach((n, l) => { for (let i = 0; i < n; i++) { const p = P(l, i); dot(c, p[0], p[1], H * 0.045, W8(0.25)); dot(c, p[0], p[1], H * 0.03, W8(glow[l + ":" + i] ? 1 : 0.85)); } }); }; },
    // molecules of a gas colliding
    science: () => { const R = rng(4), N = 34, p = []; let w0 = 0, h0 = 0;
      return (c, W, H, t, dt) => { if (W !== w0 || H !== h0) { w0 = W; h0 = H; p.length = 0; for (let i = 0; i < N; i++) { const a = R() * 7, s = 40 + 60 * R(); p.push({ x: R() * W, y: R() * H, vx: s * Math.cos(a), vy: s * Math.sin(a), tr: [] }); } }
        const r = Math.max(3, W * 0.014);
        for (let k = 0; k < 2; k++) { const h = dt / 2; p.forEach(q => { q.x += q.vx * h; q.y += q.vy * h; if (q.x < r) { q.x = r; q.vx = Math.abs(q.vx); } if (q.x > W - r) { q.x = W - r; q.vx = -Math.abs(q.vx); } if (q.y < r) { q.y = r; q.vy = Math.abs(q.vy); } if (q.y > H - r) { q.y = H - r; q.vy = -Math.abs(q.vy); } });
          for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const a = p[i], b = p[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 2 * r && d > 0) { const nx = dx / d, ny = dy / d, rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv < 0) { a.vx += rv * nx; a.vy += rv * ny; b.vx -= rv * nx; b.vy -= rv * ny; } const o = (2 * r - d) / 2; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; } } }
        const q0 = p[0]; q0.tr.push([q0.x, q0.y]); if (q0.tr.length > 90) q0.tr.shift();
        c.strokeStyle = W8(0.5); c.lineWidth = 1.4; c.beginPath(); q0.tr.forEach((s, i) => (i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]))); c.stroke();
        p.forEach((q, i) => dot(c, q.x, q.y, r, W8(i === 0 ? 1 : 0.35 + 0.5 * Math.min(1, Math.hypot(q.vx, q.vy) / 110)))); }; },
    // Lennard-Jones atoms condensing and evaporating as the temperature cycles
    sim: () => { const R = rng(6), N = 26; let p = [], w0 = 0;
      const g = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * R()); };
      return (c, W, H, t) => { const Lx = 9.5, Ly = Lx * H / W; if (W !== w0) { w0 = W; p = []; while (p.length < N) { const x = R() * Lx, y = R() * Ly; if (p.every(q => Math.hypot(q.x - x, q.y - y) > 1.1)) p.push({ x, y, vx: 0, vy: 0 }); } }
        const kT = 0.32 + 0.26 * Math.sin(t / 5), dt = 0.006, gam = 2, c1 = Math.exp(-gam * dt), c2 = Math.sqrt((1 - c1 * c1) * kT);
        for (let s = 0; s < 5; s++) { const f = p.map(() => [0, 0]);
          for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { let dx = p[j].x - p[i].x, dy = p[j].y - p[i].y; dx -= Lx * Math.round(dx / Lx); dy -= Ly * Math.round(dy / Ly); const r2 = Math.max(0.64, dx * dx + dy * dy); if (r2 > 6.25) continue; const ir6 = 1 / (r2 * r2 * r2), ff = 24 * (2 * ir6 * ir6 - ir6) / r2; f[i][0] -= ff * dx; f[i][1] -= ff * dy; f[j][0] += ff * dx; f[j][1] += ff * dy; }
          p.forEach((q, i) => { q.vx = c1 * (q.vx + f[i][0] * dt) + c2 * g(); q.vy = c1 * (q.vy + f[i][1] * dt) + c2 * g(); q.x = (q.x + q.vx * dt + Lx) % Lx; q.y = (q.y + q.vy * dt + Ly) % Ly; }); }
        const sx = W / Lx, sy = H / Ly; c.strokeStyle = W8(0.45); c.lineWidth = 1.6;
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const dx = p[j].x - p[i].x, dy = p[j].y - p[i].y; if (Math.abs(dx) < 1.35 && Math.abs(dy) < 1.35 && dx * dx + dy * dy < 1.35 * 1.35) { c.beginPath(); c.moveTo(p[i].x * sx, p[i].y * sy); c.lineTo(p[j].x * sx, p[j].y * sy); c.stroke(); } }
        p.forEach(q => dot(c, q.x * sx, q.y * sy, sx * 0.36, W8(0.92))); }; },
    // metadynamics hills filling a double well
    rare: () => { const R = rng(8); let x = -1, V = [], tl = 0, start = 0;
      const F = s => 3.2 * (s * s - 1) ** 2 + 0.25 * s, dF = s => 12.8 * s * (s * s - 1) + 0.25, bias = s => V.reduce((a, c0) => a + 0.16 * Math.exp(-((s - c0) ** 2) / (2 * 0.09)), 0), dB = s => V.reduce((a, c0) => a - 0.16 * (s - c0) / 0.09 * Math.exp(-((s - c0) ** 2) / (2 * 0.09)), 0);
      const g = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * R()); };
      return (c, W, H, t) => { if (t - start > 26) { V = []; x = -1; start = t; }
        for (let k = 0; k < 6; k++) { x += -(dF(x) + dB(x)) * 0.004 + Math.sqrt(2 * 0.35 * 0.004) * g(); x = Math.max(-1.7, Math.min(1.7, x)); }
        if (t - tl > 0.22) { tl = t; V.push(x); }
        const X = s => W * (0.5 + s / 3.8), Y = e => H * 0.86 - e * H * 0.16;
        c.fillStyle = W8(0.22); c.beginPath(); c.moveTo(X(-1.75), H); for (let i = 0; i <= 140; i++) { const s = -1.75 + 3.5 * i / 140; c.lineTo(X(s), Y(Math.min(5, F(s) + bias(s)))); } c.lineTo(X(1.75), H); c.fill();
        c.strokeStyle = W8(0.95); c.lineWidth = 2.4; c.beginPath(); for (let i = 0; i <= 140; i++) { const s = -1.75 + 3.5 * i / 140; i ? c.lineTo(X(s), Y(Math.min(5, F(s)))) : c.moveTo(X(s), Y(Math.min(5, F(s)))); } c.stroke();
        dot(c, X(x), Y(Math.min(5, F(x) + bias(x))) - 7, 6.5, W8(1)); }; },
    // a crystal emerging from noise, as in a diffusion model
    ai4mat: () => { const R = rng(12); let pts = [], noise = [], w0 = 0, cyc = -1;
      return (c, W, H, t) => { if (W !== w0) { w0 = W; pts = []; const a = W / 6.2; for (let j = -1; j < H / (a * 0.866) + 1; j++) for (let i = -1; i < W / a + 1; i++) pts.push([i * a + (j % 2 ? a / 2 : 0), j * a * 0.866, (i + j) % 2]); }
        const T = 7, ph = (t % T) / T, k = Math.floor(t / T); if (k !== cyc) { cyc = k; noise = pts.map(() => [(R() - 0.5) * W * 0.9, (R() - 0.5) * H * 0.9]); }
        const s = ph < 0.55 ? 1 - ph / 0.55 : ph < 0.85 ? 0 : (ph - 0.85) / 0.15, e = s * s * (3 - 2 * s), a = W / 6.2;
        const q = pts.map((p, i) => [p[0] + noise[i][0] * e, p[1] + noise[i][1] * e, p[2]]);
        if (e < 0.35) { c.strokeStyle = W8(0.4 * (1 - e / 0.35)); c.lineWidth = 1.4; for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) { const d = Math.hypot(q[i][0] - q[j][0], q[i][1] - q[j][1]); if (d < a * 1.08) { c.beginPath(); c.moveTo(q[i][0], q[i][1]); c.lineTo(q[j][0], q[j][1]); c.stroke(); } } }
        q.forEach(p => dot(c, p[0], p[1], a * (p[2] ? 0.2 : 0.13), W8(p[2] ? 0.95 : 0.6))); }; },
  };

  function init() {
    const cvs = [...document.querySelectorAll("canvas[data-art]")]; if (!cvs.length) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = cvs.map(cv => ({ cv, draw: (ART[cv.dataset.art] || (() => () => {}))(), on: false, W: 0, H: 0 }));
    function fit(it) { const r = it.cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); if (!r.width) return false; if (Math.round(r.width) !== it.W || Math.round(r.height) !== it.H) { it.W = Math.round(r.width); it.H = Math.round(r.height); it.cv.width = it.W * d; it.cv.height = it.H * d; it.d = d; } return true; }
    function paint(it, t, dt) { if (!fit(it)) return; const c = it.cv.getContext("2d"); c.setTransform(it.d, 0, 0, it.d, 0, 0); c.clearRect(0, 0, it.W, it.H); it.draw(c, it.W, it.H, t, dt); }
    if (still) { items.forEach(it => { for (let k = 0; k < 200; k++) { if (!fit(it)) break; const c = it.cv.getContext("2d"); c.setTransform(it.d, 0, 0, it.d, 0, 0); c.clearRect(0, 0, it.W, it.H); it.draw(c, it.W, it.H, 3 + k * 0.05, 0.05); } }); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { const it = items.find(i => i.cv === e.target); if (it) it.on = e.isIntersecting; }), { rootMargin: "60px" });
    items.forEach(it => io.observe(it.cv));
    items.forEach(it => { for (let k = 0; k < 40; k++) paint(it, 2 + k * 0.05, 0.05); });
    let last = 0, t = 0;
    function frame(now) { const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.033; if (!last || now - last > 30) { last = now; t += dt; items.forEach(it => { if (it.on) paint(it, t, dt); }); } requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
