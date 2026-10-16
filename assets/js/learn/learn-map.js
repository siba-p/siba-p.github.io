/* The library's knowledge map: every chapter is a node, grouped by volume; lines show what each
   chapter builds on (the chapter before it, and its listed prerequisites). Hover to light up
   everything a chapter depends on; click to open it. */
(function () {
  "use strict";
  const TONE = { teal: "--teal", indigo: "--accent", gold: "--gold", violet: "--violet", rose: "--rose" };
  const CENTRES = { computing: [0.17, 0.52], ml: [0.5, 0.27], science: [0.5, 0.76], ai4mat: [0.84, 0.52] };
  LW.register("learnmap", function (root, opts) {
    const nodes = opts.nodes || [], courses = opts.courses || [], bySlug = {};
    nodes.forEach(n => { bySlug[n.s] = n; });
    // edges: previous chapter in the same volume, plus explicit prerequisites
    const edges = [];
    courses.forEach(c => { const list = nodes.filter(n => n.c === c.id); list.forEach((n, i) => { if (i) edges.push([list[i - 1].s, n.s, "seq"]); }); });
    nodes.forEach(n => (n.p || []).forEach(p => { if (bySlug[p] && !edges.some(e => e[0] === p && e[1] === n.s)) edges.push([p, n.s, "pre"]); }));
    const parents = {}; edges.forEach(([a, b]) => { (parents[b] = parents[b] || []).push(a); });
    const ancestors = s => { const out = new Set(), st = [s]; while (st.length) { const x = st.pop(); (parents[x] || []).forEach(p => { if (!out.has(p)) { out.add(p); st.push(p); } }); } return out; };
    const P = LW.canvas(root, { height: w => (w < 700 ? 1040 : Math.min(620, w * 0.55)) });
    const tip = LW.h("div", { class: "lm-tip", hidden: true }); root.append(tip);
    root.style.position = "relative";
    let hover = null, pos = {};
    function layout(W, H) {
      const narrow = W < 700, cen = narrow ? { computing: [0.5, 0.115], ml: [0.5, 0.365], science: [0.5, 0.615], ai4mat: [0.5, 0.865] } : CENTRES;
      courses.forEach(c => {
        const list = nodes.filter(n => n.c === c.id), k = list.length, [cx, cy] = cen[c.id] || [0.5, 0.5];
        const rx = narrow ? W * 0.38 : Math.min(W * 0.14, 64 + k * 9), ry = narrow ? 78 : Math.min(H * 0.19, 54 + k * 6);
        list.forEach((n, i) => { const a = Math.PI * 0.72 + (i / Math.max(1, k - 1)) * Math.PI * 1.56; /* a horseshoe, open at the bottom: 1 at lower left, last at lower right */ const wob = 1; pos[n.s] = [cx * W + rx * Math.cos(a) * wob, cy * H + ry * Math.sin(a) * wob]; });
        c.pos = [cx * W, cy * H]; c.ry = ry;
      });
    }
    const done = () => new Set(LW.store.get("learn.done", []));
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H); layout(W, H);
      const col = c => { const t = (courses.find(x => x.id === c) || {}).tone; return getComputedStyle(document.documentElement).getPropertyValue(TONE[t] || "--accent").trim() || C.accent; };
      const lit = hover ? ancestors(hover) : null, dn = done();
      // starfield
      const r = LW.rng(5); ctx.fillStyle = C.ink3; for (let i = 0; i < 90; i++) { ctx.globalAlpha = 0.12 + 0.18 * r(); ctx.beginPath(); ctx.arc(r() * W, r() * H, r() * 1.3 + 0.3, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
      // volume halos and names
      courses.forEach(c => { const g = ctx.createRadialGradient(c.pos[0], c.pos[1], 4, c.pos[0], c.pos[1], 170); const cc = col(c.id); g.addColorStop(0, cc + "26"); g.addColorStop(1, cc + "00"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.pos[0], c.pos[1], 150, 0, 7); ctx.fill();
        ctx.save(); ctx.font = "400 40px 'Instrument Serif', Georgia, serif"; ctx.fillStyle = cc; ctx.globalAlpha = 0.85; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(c.r, c.pos[0], c.pos[1] + 2); ctx.restore();
        LW.text(ctx, c.t, c.pos[0], c.pos[1] + c.ry + 32, { color: C.ink2, size: 11.5, weight: 600, align: "center" }); });
      // edges
      edges.forEach(([a, b, kind]) => { const p0 = pos[a], p1 = pos[b]; if (!p0 || !p1) return; const on = lit && (b === hover || lit.has(b)) && (lit.has(a));
        ctx.strokeStyle = on ? col(bySlug[a].c) : kind === "seq" ? C.line2 : C.ink3; ctx.globalAlpha = lit ? (on ? 0.95 : 0.12) : kind === "seq" ? 0.7 : 0.32; ctx.lineWidth = on ? 2.4 : 1.2; ctx.setLineDash(kind === "pre" && !on ? [3, 4] : []);
        const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2 - (kind === "pre" ? 30 : 0);
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(mx, my, p1[0], p1[1]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; });
      // nodes
      nodes.forEach(n => { const [x, y] = pos[n.s], cc = col(n.c), isH = n.s === hover, on = !lit || isH || lit.has(n.s), d = dn.has(n.s);
        ctx.globalAlpha = on ? 1 : 0.25;
        if (isH) { ctx.fillStyle = cc + "33"; ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fill(); }
        LW.dot(ctx, x, y, isH ? 13 : 10.5, d ? cc : C.card, cc, 2.2);
        LW.text(ctx, n.n.split(".")[1], x, y + 1, { color: d ? "#fff" : cc, size: 10, weight: 700, align: "center", base: "middle", mono: true });
        ctx.globalAlpha = 1; });
      if (hover) { const [x, y] = pos[hover], n = bySlug[hover]; const k = lit.size;
        tip.hidden = false; tip.innerHTML = `<small>Chapter ${n.n} · ${n.m} min</small><b>${LW.esc(n.t)}</b><span>${LW.esc(n.d || "")}</span><em>${k ? `Builds on ${k} earlier chapter${k > 1 ? "s" : ""}, highlighted.` : "A starting point: no prerequisites."} Click to open.</em>`;
        const tw = Math.min(300, W - 20); tip.style.width = tw + "px"; tip.style.left = Math.max(10, Math.min(W - tw - 10, x - tw / 2)) + "px"; tip.style.top = (y + 22 + 170 > H ? y - 26 - tip.offsetHeight : y + 22) + "px"; }
      else tip.hidden = true;
    }
    P.draw = draw;
    const hit = p => { let best = null, bd = 18; nodes.forEach(n => { const q = pos[n.s]; if (!q) return; const d = Math.hypot(q[0] - p.x, q[1] - p.y); if (d < bd) { bd = d; best = n.s; } }); return best; };
    LW.drag(P.cv, { down: p => { const h = hit(p); if (h) { location.href = bySlug[h].u; } return false; }, hover: p => { const h = p ? hit(p) : null; if (h !== hover) { hover = h; P.cv.style.cursor = h ? "pointer" : "default"; draw(); } } });
    P.cv.addEventListener("pointerleave", () => { hover = null; draw(); });
    draw();
  });
})();
