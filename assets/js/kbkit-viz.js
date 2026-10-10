/*
 * KBkit system view: a live 3D sketch of the simulation box and a radial map of g(r).
 * Box edge L = V^(1/3); particle counts, species and thermal motion follow the inputs;
 * the selected RDF's coordination shells and cutoff are drawn around a central particle.
 */
(function () {
  "use strict";
  const COLORS = {
    w: ["#e8f0ff", "#6f8fe8", "#2c4ca8"],
    c: ["#fff1df", "#f0a04b", "#a35a10"],
    p: ["#fff8dc", "#eec254", "#8a5f08"],
    i: ["#ffffff", "#9fb4ff", "#3b50e0"]
  };
  const MAX_DRAW = 700;

  function sprite(stops, px) {
    const d = Math.max(6, Math.round(px * 2)), c = document.createElement("canvas");
    c.width = c.height = d;
    const g = c.getContext("2d"), r = d / 2;
    const gr = g.createRadialGradient(r * 0.65, r * 0.6, r * 0.08, r, r, r);
    gr.addColorStop(0, stops[0]); gr.addColorStop(0.45, stops[1]); gr.addColorStop(1, stops[2]);
    g.fillStyle = gr; g.beginPath(); g.arc(r, r, r - 0.5, 0, Math.PI * 2); g.fill();
    return c;
  }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function peaks(r, g) {
    const out = [];
    for (let k = 2; k < g.length - 2; k++) {
      if (g[k] > 1.05 && g[k] >= g[k - 1] && g[k] >= g[k + 1] && g[k] >= g[k - 2] && g[k] >= g[k + 2]) {
        if (!out.length || r[k] - out[out.length - 1].r > 0.25 * r[k]) out.push({ r: r[k], g: g[k] });
      }
      if (out.length >= 2) break;
    }
    return out;
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  // Diverging map centred on g = 1: depletion (orange) <- neutral -> enhancement (blue).
  function cmap(g, gmax, dark) {
    const lo = (dark ? ["#c2531f", "#7a4a33", "#383835"] : ["#e2672f", "#f6c9ad", "#f0efec"]).map(hex);
    const hi = (dark ? ["#383835", "#3a5fb8", "#8fb0ff"] : ["#f0efec", "#7fa3ee", "#1d3c9c"]).map(hex);
    let st, t;
    if (g < 1) { st = lo; t = Math.max(0, g); } else { st = hi; t = Math.min(1, (g - 1) / Math.max(gmax - 1, 1e-6)); }
    const x = t * 2, i = Math.min(1, Math.floor(x)), f = x - i;
    return [0, 1, 2].map(k => Math.round(lerp(st[i][k], st[i + 1][k], f)));
  }
  function View(box, halo) {
    const ctx = box.getContext("2d"), hctx = halo.getContext("2d");
    const s = { L: 0, Lref: 0, rphys: 0, counts: { w: 0, c: 0 }, pts: [], theta: 0.6, phi: 0.38, T: 298, mode: "single", rdf: null, unit: "nm", pair: "", sprites: {}, spritePx: 0, visible: true, drag: false, last: 0 };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, dpr = 1, W = 0, H = 0;

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = box.getBoundingClientRect(); W = r.width; H = r.height;
      box.width = Math.round(W * dpr); box.height = Math.round(H * dpr);
      const h = halo.getBoundingClientRect();
      halo.width = Math.round(h.width * dpr); halo.height = Math.round(h.height * dpr);
    }
    function regen(force) {
      const total = s.counts.w + s.counts.c;
      const drawN = Math.min(MAX_DRAW, Math.round(total));
      const nC = total > 0 ? Math.round(drawN * s.counts.c / total) : 0;
      if (!force && s.pts.length === drawN && s.pts.filter(p => p.sp === "c").length === nC) return;
      const R = rng(7 + drawN * 13 + nC);
      s.pts = Array.from({ length: drawN }, (_, k) => ({ sp: k < nC ? "c" : "w", fx: R() - 0.5, fy: R() - 0.5, fz: R() - 0.5, ph: R() * 6.283, ph2: R() * 6.283, ph3: R() * 6.283 }));
    }
    function sprites(px) {
      if (Math.abs(px - s.spritePx) < 0.5 && s.sprites.w) return;
      s.spritePx = px;
      for (const k in COLORS) s.sprites[k] = sprite(COLORS[k], px * dpr);
    }
    function project(x, y, z, scale) {
      const ct = Math.cos(s.theta), st = Math.sin(s.theta), cp = Math.cos(s.phi), sp = Math.sin(s.phi);
      const x1 = x * ct + z * st, z1 = -x * st + z * ct;
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      const D = 3.2 * s.Lref, f = D / (D + z2);
      return { X: W / 2 + scale * f * x1, Y: H / 2 + 8 - scale * f * y2, z: z2, f };
    }

    function draw(t) {
      if (!W) return;
      const dark = getComputedStyle(document.documentElement).colorScheme === "dark" || document.documentElement.dataset.theme === "dark";
      const ink = dark ? "rgba(235,240,255," : "rgba(20,28,48,";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (!(s.L > 0)) {
        ctx.fillStyle = ink + "0.45)"; ctx.font = "500 13px Inter, sans-serif"; ctx.textAlign = "center";
        ctx.fillText("Enter a box volume or load an example", W / 2, H / 2); return;
      }
      const scale = 0.5 * Math.min(W, H) / s.Lref, L = s.L, h = L / 2;
      // edges
      const V = [];
      for (const a of [-h, h]) for (const b of [-h, h]) for (const c of [-h, h]) V.push(project(a, b, c, scale));
      const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
      const edge = front => E.forEach(([a, b]) => {
        const zm = (V[a].z + V[b].z) / 2; if ((zm < 0) !== front) return;
        ctx.strokeStyle = ink + (front ? "0.55)" : "0.22)"); ctx.lineWidth = front ? 1.4 : 1;
        ctx.beginPath(); ctx.moveTo(V[a].X, V[a].Y); ctx.lineTo(V[b].X, V[b].Y); ctx.stroke();
      });
      edge(false);
      // particles
      const amp = reduce ? 0 : 0.22 * s.rphys * Math.sqrt(Math.max(s.T, 1) / 298), w = t / 1000 * Math.sqrt(Math.max(s.T, 1) / 298) * 2.2;
      const P = s.pts.map(p => {
        const x = p.fx * L + amp * Math.sin(w + p.ph), y = p.fy * L + amp * Math.sin(1.3 * w + p.ph2), z = p.fz * L + amp * Math.sin(0.9 * w + p.ph3);
        const q = project(Math.max(-h, Math.min(h, x)), Math.max(-h, Math.min(h, y)), Math.max(-h, Math.min(h, z)), scale); q.sp = p.sp; return q;
      }).sort((a, b) => b.z - a.z);
      const rpx = Math.max(1.6, scale * s.rphys);
      sprites(rpx * (s.mode === "binary" || s.mode === "pb" ? 1.25 : 1));
      const center = project(0, 0, 0, scale);
      const shellR = r => scale * center.f * r;
      { const pk = s.rdf && s.rdf.r.length ? peaks(s.rdf.r, s.rdf.g) : []; s.shellPx = pk.length ? shellR(pk[pk.length - 1].r) * 1.05 : 0; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const q of P) {
        const spr = s.sprites[q.sp], d = spr.width * q.f * (s.mode === "binary" && q.sp === "c" ? 1.25 : 1);
        const inShell = s.shellPx && Math.hypot(q.X - center.X, q.Y - center.Y) < s.shellPx;
        ctx.globalAlpha = (inShell ? 0.28 : 1) * Math.max(0.35, Math.min(1, 0.75 + 0.5 * (-q.z / L)));
        ctx.drawImage(spr, q.X * dpr - d / 2, q.Y * dpr - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // RDF cutoff and coordination shells, drawn over the particles
      if (s.rdf && s.rdf.r.length) {
        const rmax = s.rdf.r[s.rdf.r.length - 1], bad = rmax > h * 1.0001;
        ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4;
        ctx.strokeStyle = bad ? "rgba(208,59,59,.9)" : ink + "0.45)";
        ctx.beginPath(); ctx.arc(center.X, center.Y, shellR(Math.min(rmax, L)), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        peaks(s.rdf.r, s.rdf.g).forEach((pk, k) => {
          const rr = shellR(pk.r), a = Math.min(0.45, 0.12 * pk.g);
          const gr = ctx.createRadialGradient(center.X, center.Y, rr * 0.82, center.X, center.Y, rr * 1.1);
          gr.addColorStop(0, "rgba(59,80,224,0)"); gr.addColorStop(0.55, `rgba(59,80,224,${a})`); gr.addColorStop(1, "rgba(59,80,224,0)");
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(center.X, center.Y, rr * 1.12, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = `rgba(59,80,224,${k ? 0.5 : 0.85})`; ctx.lineWidth = k ? 1 : 1.6;
          ctx.beginPath(); ctx.arc(center.X, center.Y, rr, 0, Math.PI * 2); ctx.stroke();
        });
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // central particle i (or solute p)
      const cs = s.mode === "pb" ? s.sprites.p : s.sprites.i, cd = cs.width * center.f * (s.mode === "pb" ? 2.6 : 1.6);
      ctx.drawImage(cs, center.X * dpr - cd / 2, center.Y * dpr - cd / 2, cd, cd);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      edge(true);
      // dimension label on the front-bottom edge
      const a = project(-h, -h, h, scale), b = project(h, -h, h, scale);
      ctx.fillStyle = ink + "0.8)"; ctx.font = "600 12px Inter, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`L = ${L.toFixed(L < 10 ? 3 : 2)} ${s.unit}`, (a.X + b.X) / 2, Math.max(a.Y, b.Y) + 18);
    }

    function drawHalo() {
      const Wd = halo.width, Hd = halo.height;
      if (!Wd) return;
      const dark = getComputedStyle(document.documentElement).colorScheme === "dark" || document.documentElement.dataset.theme === "dark";
      const g = hctx, ink = dark ? "rgba(235,240,255," : "rgba(20,28,48,";
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
      if (!s.rdf || !s.rdf.r.length) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = ink + "0.45)"; g.font = "500 13px Inter, sans-serif"; g.textAlign = "center";
        g.fillText("Load an RDF to see its coordination shells", Wd / dpr / 2, Hd / dpr / 2); return;
      }
      const r = s.rdf.r, gv = s.rdf.g, rmax = r[r.length - 1];
      let gmax = 0; for (const v of gv) if (v > gmax) gmax = v;
      gmax = Math.max(gmax, 1.2);
      const barW = 56 * dpr, R = Math.min(Wd - barW, Hd) / 2 - 10 * dpr, cx = (Wd - barW) / 2, cy = Hd / 2;
      const img = g.createImageData(Wd, Hd), dat = img.data;
      const gAt = rr => { let lo = 0, hi = r.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r[m] < rr) lo = m; else hi = m; } const f = (rr - r[lo]) / ((r[hi] - r[lo]) || 1); return lerp(gv[lo], gv[hi], Math.max(0, Math.min(1, f))); };
      for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd - barW; x++) {
        const d = Math.hypot(x - cx, y - cy); if (d > R) continue;
        const c = cmap(gAt(d / R * rmax), gmax, dark), k = (y * Wd + x) * 4, edge = Math.min(1, (R - d) / (1.5 * dpr));
        dat[k] = c[0]; dat[k + 1] = c[1]; dat[k + 2] = c[2]; dat[k + 3] = Math.round(255 * edge);
      }
      g.putImageData(img, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx1 = cx / dpr, cy1 = cy / dpr, R1 = R / dpr;
      peaks(r, gv).forEach((pk, k) => { g.strokeStyle = `rgba(255,255,255,${k ? 0.55 : 0.9})`; g.lineWidth = 1; g.setLineDash([2, 3]); g.beginPath(); g.arc(cx1, cy1, R1 * pk.r / rmax, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); });
      if (s.L > 0 && s.L / 2 < rmax) { g.setLineDash([5, 3]); g.strokeStyle = "rgba(208,59,59,.95)"; g.lineWidth = 1.6; g.beginPath(); g.arc(cx1, cy1, R1 * (s.L / 2) / rmax, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
      g.fillStyle = s.mode === "pb" ? "#d6a531" : "#3b50e0"; g.beginPath(); g.arc(cx1, cy1, Math.max(3, R1 * 0.035), 0, Math.PI * 2); g.fill();
      // colour bar (diverging, g = 1 marked)
      const bx = (Wd - barW) / dpr + 14, bh = Math.min(150, R1 * 1.4), by = cy1 - bh / 2;
      for (let k = 0; k < bh; k++) {
        const frac = 1 - k / bh, gval = frac * gmax, c = cmap(gval, gmax, dark);
        g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.fillRect(bx, by + k, 10, 1);
      }
      g.strokeStyle = ink + "0.3)"; g.lineWidth = 1; g.strokeRect(bx + 0.5, by + 0.5, 10, bh);
      g.fillStyle = ink + "0.75)"; g.font = "500 10.5px Inter, sans-serif"; g.textAlign = "left";
      const y1 = by + bh * (1 - 1 / gmax);
      g.fillText(gmax.toFixed(1), bx + 14, by + 8); g.fillText("1", bx + 14, y1 + 4); g.fillText("0", bx + 14, by + bh);
      g.fillRect(bx - 3, y1, 16, 1);
      g.font = "italic 500 11px Georgia, serif"; g.fillText("g(r)", bx - 2, by - 8);
    }

    function loop(t) {
      raf = 0;
      if (!s.visible) return;
      if (!s.drag && !reduce) s.theta += 0.0016;
      draw(t);
      if (!reduce) raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }

    box.addEventListener("pointerdown", e => { s.drag = true; s.px = e.clientX; s.py = e.clientY; box.setPointerCapture(e.pointerId); });
    box.addEventListener("pointermove", e => { if (!s.drag) return; s.theta += (e.clientX - s.px) * 0.01; s.phi = Math.max(-1.2, Math.min(1.2, s.phi + (e.clientY - s.py) * 0.01)); s.px = e.clientX; s.py = e.clientY; if (reduce) draw(0); });
    box.addEventListener("pointerup", () => { s.drag = false; });
    new IntersectionObserver(es => { s.visible = es[0].isIntersecting; if (s.visible) kick(); }).observe(box);
    let rt = 0;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { size(); s.spritePx = 0; draw(performance.now()); drawHalo(); }, 150); });
    size();

    return {
      update(o) {
        const L = o.V > 0 ? Math.cbrt(o.V) : 0;
        const total = (o.nw || 0) + (o.nc || 0);
        if (o.resetScale || !s.Lref || !(s.L > 0) || (L > 0 && (L / s.Lref > 1.6 || L / s.Lref < 0.55))) { s.Lref = L || 1; s.rphys = total > 0 && o.V > 0 ? 0.5 * Math.cbrt(o.V / total) * 0.62 : 0.05 * (L || 1); }
        s.L = L; s.counts = { w: o.nw || 0, c: o.nc || 0 }; s.T = o.T || 298; s.mode = o.mode; s.unit = o.unit || "nm";
        if (total > 0 && !(s.rphys > 0)) s.rphys = 0.5 * Math.cbrt(o.V / total) * 0.62;
        regen(o.resetScale);
        s.rdf = o.rdf || null;
        drawHalo(); draw(performance.now()); kick();
      },
      redraw() { size(); s.spritePx = 0; drawHalo(); draw(performance.now()); },
      shown() { return s.pts.length; },
      info() { return s.rdf ? { peaks: peaks(s.rdf.r, s.rdf.g), rmax: s.rdf.r[s.rdf.r.length - 1] } : null; }
    };
  }
  window.KBView = View;
})();
