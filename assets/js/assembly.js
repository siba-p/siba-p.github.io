/*
 * DNA-programmable nanoparticle assembly in 2D.
 * Overdamped Langevin (Brownian) dynamics in a periodic box, reduced units (sigma = epsilon = gamma = 1).
 * Two species, A and B, each carrying one DNA "strand". The program is a 2x2 matrix saying which pairs
 * hybridise: hybridising pairs feel a Lennard-Jones attraction, all other pairs are purely repulsive (WCA).
 *   complementary  A–B only     -> binary square (checkerboard) lattice
 *   self           A–A and B–B  -> demixing into two hexagonal crystals
 *   universal      all pairs    -> hexagonal substitutional alloy
 */
(function () {
  "use strict";

  const RC = 2.5, RC2 = RC * RC, WCA2 = Math.pow(2, 1 / 3), SL2 = 1.25 * 1.25, BOND2 = 1.32 * 1.32, MAXSTEP = 0.08;
  const PROGRAMS = {
    complementary: { m: [0, 1, 1, 0] },
    self: { m: [1, 0, 0, 1] },
    universal: { m: [1, 1, 1, 1] }
  };
  const SPECIES = [
    { corona: [96, 126, 255], name: "A" },
    { corona: [255, 159, 90], name: "B" }
  ];

  function particleSprite(d, rgb, bound) {
    const c = document.createElement("canvas");
    const pad = Math.ceil(d * 0.2);
    c.width = c.height = d + pad * 2;
    const g = c.getContext("2d"), cx = c.width / 2, R = d / 2, core = R * 0.5;
    const [r, gg, b] = rgb;
    const halo = g.createRadialGradient(cx, cx, core * 0.9, cx, cx, R);
    halo.addColorStop(0, `rgba(${r},${gg},${b},${bound ? 0.8 : 0.4})`);
    halo.addColorStop(1, `rgba(${r},${gg},${b},${bound ? 0.35 : 0.12})`);
    g.fillStyle = halo; g.beginPath(); g.arc(cx, cx, R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = `rgba(${r},${gg},${b},${bound ? 0.95 : 0.55})`;
    g.lineWidth = Math.max(1, d * 0.05);
    g.beginPath(); g.arc(cx, cx, R - g.lineWidth / 2, 0, Math.PI * 2); g.stroke();
    const grad = g.createRadialGradient(cx - core * 0.35, cx - core * 0.4, core * 0.08, cx, cx, core);
    if (bound) { grad.addColorStop(0, "#fff8dc"); grad.addColorStop(0.35, "#f2c75a"); grad.addColorStop(0.8, "#a8770e"); grad.addColorStop(1, "#4d3405"); }
    else { grad.addColorStop(0, "#f3e9cf"); grad.addColorStop(0.4, "#c9ab6a"); grad.addColorStop(1, "#5c4a22"); }
    g.fillStyle = grad; g.beginPath(); g.arc(cx, cx, core, 0, Math.PI * 2); g.fill();
    return { img: c, off: c.width / 2 };
  }

  function AssemblySim(canvas, opts) {
    opts = Object.assign({
      sigmaPx: 20, phi: 0.44, maxN: 620, T: 0.45, startT: 1.0, anneal: true, program: "complementary",
      xA: 0.5, tau: 1.0, bonds: true, attention: false, onStats: null, interactive: true, prewarm: 0
    }, opts || {});

    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, Lx = 0, Ly = 0, N = 0, sPx = opts.sigmaPx;
    let x, y, sp, coord, head, next, ncx, ncy, cw, ch, fx, fy;
    let bonds = new Float32Array(0), nb = 0;
    let prog = PROGRAMS[opts.program] || PROGRAMS.complementary;
    let T = opts.anneal ? opts.startT : opts.T, targetT = opts.T, annealing = opts.anneal;
    let running = false, visible = true, raf = 0, frame = 0, sprites = null;
    const pointer = { x: 0, y: 0, px: 0, py: 0, in: false, down: false };
    let autoQuery = -1, autoTimer = 0;
    const history = [];

    function makeSprites() {
      const d = Math.max(8, Math.round(sPx * 1.05 * dpr));
      sprites = SPECIES.map(s => [particleSprite(d, s.corona, false), particleSprite(d, s.corona, true)]);
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      sPx = W < 520 ? opts.sigmaPx * 0.85 : opts.sigmaPx;
      Lx = W / sPx; Ly = H / sPx;
      N = Math.min(opts.maxN, Math.floor(opts.phi * Lx * Ly * 4 / Math.PI));
      ncx = Math.max(3, Math.floor(Lx / RC)); ncy = Math.max(3, Math.floor(Ly / RC));
      cw = Lx / ncx; ch = Ly / ncy;
      head = new Int32Array(ncx * ncy); next = new Int32Array(N);
      x = new Float32Array(N); y = new Float32Array(N); sp = new Uint8Array(N); coord = new Uint8Array(N);
      fx = new Float32Array(N); fy = new Float32Array(N);
      bonds = new Float32Array(N * 4 * 4);
      const nA = Math.round(N * opts.xA);
      for (let i = 0; i < N; i++) {
        sp[i] = i < nA ? 0 : 1;
        let tries = 0, ok = false;
        while (!ok && tries++ < 40) {
          x[i] = Math.random() * Lx; y[i] = Math.random() * Ly; ok = true;
          for (let j = 0; j < i; j++) {
            let dx = x[i] - x[j], dy = y[i] - y[j];
            dx -= Lx * Math.round(dx / Lx); dy -= Ly * Math.round(dy / Ly);
            if (dx * dx + dy * dy < 1.1) { ok = false; break; }
          }
        }
      }
      makeSprites();
      history.length = 0;
    }

    function build() {
      head.fill(-1);
      for (let i = 0; i < N; i++) {
        let cx = (x[i] / cw) | 0, cy = (y[i] / ch) | 0;
        if (cx >= ncx) cx = ncx - 1; if (cy >= ncy) cy = ncy - 1;
        const c = cy * ncx + cx;
        next[i] = head[c]; head[c] = i;
      }
    }

    function step(dt, record) {
      build();
      fx.fill(0); fy.fill(0);
      if (record) { coord.fill(0); nb = 0; }
      const m = prog.m;
      for (let cy = 0; cy < ncy; cy++) for (let cx = 0; cx < ncx; cx++) {
        for (let i = head[cy * ncx + cx]; i >= 0; i = next[i]) {
          for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
            const nx = (cx + ox + ncx) % ncx, ny = (cy + oy + ncy) % ncy;
            for (let j = head[ny * ncx + nx]; j >= 0; j = next[j]) {
              if (j <= i) continue;
              let dx = x[j] - x[i], dy = y[j] - y[i];
              dx -= Lx * Math.round(dx / Lx); dy -= Ly * Math.round(dy / Ly);
              const r2 = dx * dx + dy * dy;
              const attract = m[sp[i] * 2 + sp[j]];
              if (r2 >= (attract ? RC2 : WCA2 * SL2)) continue;
              // Non-hybridising coronas repel over a slightly larger range (steric/electrostatic shell).
              const q2 = attract ? r2 : r2 / SL2;
              const inv2 = 1 / Math.max(q2, 0.64), inv6 = inv2 * inv2 * inv2;
              const f = 24 * inv2 * inv6 * (2 * inv6 - 1) / (attract ? 1 : SL2);
              fx[i] -= f * dx; fy[i] -= f * dy; fx[j] += f * dx; fy[j] += f * dy;
              if (record && attract && r2 < BOND2) {
                coord[i]++; coord[j]++;
                if (nb < bonds.length / 4) {
                  const k = nb * 4;
                  bonds[k] = x[i]; bonds[k + 1] = y[i]; bonds[k + 2] = x[i] + dx; bonds[k + 3] = y[i] + dy; nb++;
                }
              }
            }
          }
        }
      }
      const amp = Math.sqrt(2 * T * dt) * 2;
      for (let i = 0; i < N; i++) {
        let sx = fx[i] * dt + amp * (Math.random() + Math.random() + Math.random() - 1.5);
        let sy = fy[i] * dt + amp * (Math.random() + Math.random() + Math.random() - 1.5);
        if (sx > MAXSTEP) sx = MAXSTEP; else if (sx < -MAXSTEP) sx = -MAXSTEP;
        if (sy > MAXSTEP) sy = MAXSTEP; else if (sy < -MAXSTEP) sy = -MAXSTEP;
        x[i] += sx; y[i] += sy;
        if (x[i] < 0) x[i] += Lx; else if (x[i] >= Lx) x[i] -= Lx;
        if (y[i] < 0) y[i] += Ly; else if (y[i] >= Ly) y[i] -= Ly;
      }
    }

    function stir() {
      if (!pointer.down) return;
      const gx = pointer.x / sPx, gy = pointer.y / sPx;
      const ddx = (pointer.x - pointer.px) / sPx, ddy = (pointer.y - pointer.py) / sPx;
      pointer.px = pointer.x; pointer.py = pointer.y;
      if (!ddx && !ddy) return;
      for (let i = 0; i < N; i++) {
        let dx = x[i] - gx, dy = y[i] - gy;
        dx -= Lx * Math.round(dx / Lx); dy -= Ly * Math.round(dy / Ly);
        const d2 = dx * dx + dy * dy;
        if (d2 < 30) {
          const w = Math.exp(-d2 / 10) * 0.8;
          x[i] = (x[i] + ddx * w + Lx) % Lx; y[i] = (y[i] + ddy * w + Ly) % Ly;
        }
      }
    }

    function nearest(gx, gy) {
      let best = -1, bd = 1e9;
      for (let i = 0; i < N; i++) {
        let dx = x[i] - gx, dy = y[i] - gy;
        dx -= Lx * Math.round(dx / Lx); dy -= Ly * Math.round(dy / Ly);
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }

    function drawAttention(q) {
      const out = [];
      for (let j = 0; j < N; j++) {
        if (j === q) continue;
        let dx = x[j] - x[q], dy = y[j] - y[q];
        dx -= Lx * Math.round(dx / Lx); dy -= Ly * Math.round(dy / Ly);
        const d2 = dx * dx + dy * dy;
        if (d2 < 49) out.push({ dx, dy, d: Math.sqrt(d2), j });
      }
      out.sort((a, b) => a.d - b.d);
      const top = out.slice(0, 12);
      // Score: closeness, plus a bonus for partners the program lets this particle bind (a stand-in for learned relevance).
      let z = 0;
      top.forEach(o => { o.s = Math.exp((-o.d + 1.2 * prog.m[sp[q] * 2 + sp[o.j]]) / opts.tau); z += o.s; });
      top.forEach(o => { o.w = o.s / z; });
      const qx = x[q] * sPx, qy = y[q] * sPx;
      ctx.font = "500 10px 'JetBrains Mono', ui-monospace, monospace";
      top.forEach((o, idx) => {
        const tx = qx + o.dx * sPx, ty = qy + o.dy * sPx, a = 0.2 + 0.8 * Math.min(1, o.w * 4);
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = 0.6 + 6 * o.w;
        ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(tx, ty); ctx.stroke();
        if (idx < 3) { ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillText(o.w.toFixed(2), tx + sPx * 0.6, ty - sPx * 0.5); }
      });
      ctx.beginPath(); ctx.arc(qx, qy, sPx * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (opts.bonds && nb) {
        ctx.strokeStyle = "rgba(226,232,255,0.38)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let k = 0; k < nb; k++) {
          const b = k * 4;
          ctx.moveTo(bonds[b] * sPx, bonds[b + 1] * sPx);
          ctx.lineTo(bonds[b + 2] * sPx, bonds[b + 3] * sPx);
        }
        ctx.stroke();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < N; i++) {
        const s = sprites[sp[i]][coord[i] >= 2 ? 1 : 0];
        ctx.drawImage(s.img, x[i] * sPx * dpr - s.off, y[i] * sPx * dpr - s.off);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (opts.attention) {
        let q = -1;
        if (pointer.in) q = nearest(pointer.x / sPx, pointer.y / sPx);
        else if (autoQuery >= 0 && autoQuery < N) q = autoQuery;
        if (q >= 0) drawAttention(q);
      }
    }

    function stats() {
      let done = 0, sum = 0;
      for (let i = 0; i < N; i++) { sum += coord[i]; if (coord[i] >= 3) done++; }
      const s = { T, N, solid: N ? done / N : 0, z: N ? sum / N : 0, program: opts.program };
      history.push(s.solid); if (history.length > 160) history.shift();
      s.history = history;
      if (opts.onStats) opts.onStats(s);
    }

    function tick() {
      raf = 0;
      if (!running || !visible) return;
      frame++;
      if (annealing) {
        T += (targetT - T) * 0.02;
        if (Math.abs(T - targetT) < 0.004) { T = targetT; annealing = false; }
      }
      stir();
      for (let s = 0; s < 8; s++) step(0.003, s === 7);
      if (opts.attention && !pointer.in && --autoTimer <= 0) {
        autoTimer = 170;
        const c = [];
        for (let i = 0; i < N; i++) if (coord[i] >= 3) c.push(i);
        autoQuery = c.length ? c[(Math.random() * c.length) | 0] : (Math.random() * N) | 0;
      }
      draw();
      if (frame % 8 === 0) stats();
      raf = requestAnimationFrame(tick);
    }

    function start() { running = true; if (!raf) raf = requestAnimationFrame(tick); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    function warm() {
      T = targetT; annealing = false;
      for (let s = 0; s < 1800; s++) step(0.003, s === 1799);
      stats();
    }

    function local(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    if (opts.interactive) {
      canvas.addEventListener("pointermove", e => {
        const p = local(e); pointer.x = p.x; pointer.y = p.y; pointer.in = e.pointerType === "mouse" || pointer.down;
        if (!running) draw();
      });
      canvas.addEventListener("pointerleave", () => { pointer.in = false; pointer.down = false; if (!running) draw(); });
      canvas.addEventListener("pointerdown", e => {
        const p = local(e); pointer.x = pointer.px = p.x; pointer.y = pointer.py = p.y; pointer.down = true; pointer.in = true;
      });
      window.addEventListener("pointerup", () => { pointer.down = false; });
    }

    new IntersectionObserver(es => {
      visible = es[0].isIntersecting;
      if (visible && running && !raf) raf = requestAnimationFrame(tick);
    }).observe(canvas);
    document.addEventListener("visibilitychange", () => {
      visible = !document.hidden;
      if (visible && running && !raf) raf = requestAnimationFrame(tick);
    });
    let rt = 0;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const r = canvas.getBoundingClientRect();
        if (Math.abs(r.width - W) > 40 || Math.abs(r.height - H) > 80) { resize(); if (!running) { warm(); draw(); } }
      }, 200);
    });

    resize();
    if (reduce) { warm(); draw(); }
    else if (opts.prewarm) {
      T = targetT; annealing = false;
      for (let s = 0; s < opts.prewarm; s++) step(0.003, s === opts.prewarm - 1);
      stats(); draw(); start();
    } else { step(0.003, true); draw(); start(); }

    return {
      get running() { return running; },
      start, stop,
      setT(v) { targetT = v; T = v; annealing = false; },
      anneal(to) { targetT = to; annealing = true; if (!running) start(); },
      heat() { T = 1.4; targetT = opts.T; annealing = false; if (!running) start(); },
      setProgram(name) {
        if (!PROGRAMS[name]) return;
        opts.program = name; prog = PROGRAMS[name];
        T = Math.max(T, 0.9); targetT = opts.T; annealing = true;
        if (reduce) { warm(); draw(); } else start();
      },
      setDensity(phi) { opts.phi = phi; resize(); if (!running) { warm(); draw(); } },
      setTau(v) { opts.tau = v; if (!running) draw(); },
      toggle(key, v) { opts[key] = v; if (!running) draw(); },
      reset() { resize(); T = opts.startT; targetT = opts.T; annealing = true; start(); },
      reduced: reduce
    };
  }

  window.AssemblySim = AssemblySim;
})();
