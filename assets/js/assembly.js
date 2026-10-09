/*
 * Live 2D self-assembly: overdamped Langevin (Brownian) dynamics of Lennard-Jones
 * particles in a periodic box, reduced units (sigma = epsilon = gamma = 1).
 * Particles are coloured by coordination number; bonded crystalline neighbours are drawn
 * as a graph, and an "attention head" overlay shows softmax weights from a query particle
 * to its neighbours.
 */
(function () {
  "use strict";

  const RC = 2.5, RC2 = RC * RC, BOND2 = 1.32 * 1.32, MAXSTEP = 0.08;

  function sprite(size, stops, glow) {
    const c = document.createElement("canvas");
    const pad = Math.ceil(size * 0.35);
    c.width = c.height = size + pad * 2;
    const g = c.getContext("2d");
    const cx = c.width / 2, r = size / 2;
    if (glow) {
      const halo = g.createRadialGradient(cx, cx, r * 0.8, cx, cx, r + pad);
      halo.addColorStop(0, glow);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = halo;
      g.fillRect(0, 0, c.width, c.height);
    }
    const grad = g.createRadialGradient(cx - r * 0.38, cx - r * 0.42, r * 0.05, cx, cx, r);
    stops.forEach(([o, col]) => grad.addColorStop(o, col));
    g.fillStyle = grad;
    g.beginPath(); g.arc(cx, cx, r, 0, Math.PI * 2); g.fill();
    return { img: c, off: c.width / 2 };
  }

  function AssemblySim(canvas, opts) {
    opts = Object.assign({
      sigmaPx: 22, phi: 0.22, maxN: 720, T: 0.36, startT: 1.25, anneal: true,
      tau: 1.0, bonds: true, attention: true, onStats: null, interactive: true
    }, opts || {});

    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, Lx = 0, Ly = 0, N = 0, sPx = opts.sigmaPx;
    let x, y, coord, head, next, ncx, ncy, cw, ch;
    let bonds = new Float32Array(0), nb = 0;
    let T = opts.anneal ? opts.startT : opts.T, targetT = opts.T, annealing = opts.anneal;
    let running = false, visible = true, raf = 0, frame = 0;
    let sprites = null;
    const pointer = { x: 0, y: 0, px: 0, py: 0, in: false, down: false, t: 0 };
    let autoQuery = -1, autoTimer = 0;
    const history = [];

    function makeSprites() {
      const d = Math.max(6, Math.round(sPx * 1.02 * dpr));
      sprites = [
        sprite(d, [[0, "#f4f7ff"], [0.35, "#9fb0cf"], [1, "#2c3954"]]),
        sprite(d, [[0, "#fff6d8"], [0.35, "#d9c27e"], [1, "#5b4a1d"]]),
        sprite(d, [[0, "#fffbe6"], [0.3, "#f3c64e"], [0.75, "#b07d0d"], [1, "#4a3203"]], "rgba(226,177,60,0.22)")
      ];
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      sPx = W < 640 ? opts.sigmaPx * 0.82 : opts.sigmaPx;
      Lx = W / sPx; Ly = H / sPx;
      N = Math.min(opts.maxN, Math.floor(opts.phi * Lx * Ly * 4 / Math.PI));
      ncx = Math.max(3, Math.floor(Lx / RC)); ncy = Math.max(3, Math.floor(Ly / RC));
      cw = Lx / ncx; ch = Ly / ncy;
      head = new Int32Array(ncx * ncy); next = new Int32Array(N);
      x = new Float32Array(N); y = new Float32Array(N); coord = new Uint8Array(N);
      bonds = new Float32Array(N * 4 * 4);
      for (let i = 0; i < N; i++) {
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

    const fx = [], fy = [];
    function step(dt, record) {
      build();
      if (fx.length !== N) { fx.length = fy.length = N; }
      for (let i = 0; i < N; i++) { fx[i] = 0; fy[i] = 0; }
      if (record) { coord.fill(0); nb = 0; }
      for (let cy = 0; cy < ncy; cy++) for (let cx = 0; cx < ncx; cx++) {
        for (let i = head[cy * ncx + cx]; i >= 0; i = next[i]) {
          for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
            const nx = (cx + ox + ncx) % ncx, ny = (cy + oy + ncy) % ncy;
            for (let j = head[ny * ncx + nx]; j >= 0; j = next[j]) {
              if (j <= i) continue;
              let dx = x[j] - x[i], dy = y[j] - y[i];
              dx -= Lx * Math.round(dx / Lx); dy -= Ly * Math.round(dy / Ly);
              const r2 = dx * dx + dy * dy;
              if (r2 >= RC2) continue;
              const inv2 = 1 / Math.max(r2, 0.64), inv6 = inv2 * inv2 * inv2;
              const f = 24 * inv2 * inv6 * (2 * inv6 - 1);
              fx[i] -= f * dx; fy[i] -= f * dy; fx[j] += f * dx; fy[j] += f * dy;
              if (record && r2 < BOND2) {
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
      const amp = Math.sqrt(2 * T * dt) * 2; // uniform-sum gaussian has unit variance after *2
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

    function attentionFor(q) {
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
      // Score: closeness plus a bonus for crystalline neighbours, a stand-in for learned relevance.
      let z = 0;
      top.forEach(o => { o.s = Math.exp((-o.d + 0.35 * coord[o.j]) / opts.tau); z += o.s; });
      top.forEach(o => { o.w = o.s / z; });
      return top;
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (opts.bonds && nb) {
        ctx.strokeStyle = "rgba(226,177,60,0.28)";
        ctx.lineWidth = 1;
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
        const c = coord[i], s = sprites[c >= 5 ? 2 : c >= 2 ? 1 : 0];
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

    function drawAttention(q) {
      const top = attentionFor(q);
      const qx = x[q] * sPx, qy = y[q] * sPx;
      top.forEach((o, idx) => {
        const tx = qx + o.dx * sPx, ty = qy + o.dy * sPx;
        ctx.strokeStyle = `rgba(70,194,204,${0.18 + 0.82 * Math.min(1, o.w * 4)})`;
        ctx.lineWidth = 0.6 + 6 * o.w;
        ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.beginPath(); ctx.arc(tx, ty, sPx * 0.62, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(70,194,204,${0.25 + 0.75 * Math.min(1, o.w * 4)})`;
        ctx.lineWidth = 1; ctx.stroke();
        if (idx < 3) {
          ctx.font = "500 10px 'JetBrains Mono', monospace";
          ctx.fillStyle = "rgba(200,240,244,0.95)";
          ctx.fillText(o.w.toFixed(2), tx + sPx * 0.6, ty - sPx * 0.55);
        }
      });
      ctx.beginPath(); ctx.arc(qx, qy, sPx * 0.85, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(70,194,204,1)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = "500 10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(200,240,244,0.9)";
      ctx.fillText("query · attention head", qx + sPx, qy + sPx * 1.3);
    }

    function stats() {
      let solid = 0, sum = 0;
      for (let i = 0; i < N; i++) { sum += coord[i]; if (coord[i] >= 5) solid++; }
      const s = { T, N, solid: N ? solid / N : 0, z: N ? sum / N : 0 };
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
      if (!pointer.in) {
        autoTimer--;
        if (autoTimer <= 0) {
          autoTimer = 170;
          const cands = [];
          for (let i = 0; i < N; i++) if (coord[i] >= 4) cands.push(i);
          autoQuery = cands.length ? cands[(Math.random() * cands.length) | 0] : (Math.random() * N) | 0;
        }
      }
      draw();
      if (frame % 8 === 0) stats();
      raf = requestAnimationFrame(tick);
    }

    function start() { running = true; if (!raf) raf = requestAnimationFrame(tick); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    function local(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
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

    const io = new IntersectionObserver(es => {
      visible = es[0].isIntersecting;
      if (visible && running && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", () => {
      visible = !document.hidden;
      if (visible && running && !raf) raf = requestAnimationFrame(tick);
    });
    let rt = 0;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const r = canvas.getBoundingClientRect();
        if (Math.abs(r.width - W) > 40 || Math.abs(r.height - H) > 120) { resize(); if (!running) { warm(); draw(); } }
      }, 200);
    });

    function warm() {
      T = targetT; annealing = false;
      for (let s = 0; s < 1600; s++) step(0.003, s === 1599);
      autoQuery = -1; stats();
    }

    resize();
    if (reduce) { warm(); draw(); } else { step(0.0025, true); draw(); start(); }

    return {
      get running() { return running; },
      start, stop,
      setT(v) { targetT = v; T = v; annealing = false; },
      anneal(to) { targetT = to; annealing = true; if (!running) start(); },
      heat() { T = 1.6; targetT = opts.T; annealing = false; if (!running) start(); },
      setDensity(phi) { opts.phi = phi; resize(); if (!running) { warm(); draw(); } },
      setTau(v) { opts.tau = v; if (!running) draw(); },
      toggle(key, v) { opts[key] = v; if (!running) draw(); },
      reset() { resize(); T = opts.startT; targetT = opts.T; annealing = true; start(); },
      reduced: reduce
    };
  }

  window.AssemblySim = AssemblySim;
})();
