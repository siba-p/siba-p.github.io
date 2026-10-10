(function () {
  "use strict";
  const M = window.MAT, S = window.SMC, A = window.APP, root = document.getElementById("fl");
  if (!M || !S || !A || !root) return;
  const $ = s => root.querySelector(s), $$ = s => Array.from(root.querySelectorAll(s));
  const SITE = { "{111} facet": "#3f6fe0", "{100} facet": "#1baf7a", edge: "#eda100", vertex: "#e34948", bulk: "#c9a227" };
  const METAL_COL = { Au: "#d4a62a", Ag: "#c9ccd6", Cu: "#c8743c", Pt: "#b8bcc8", Pd: "#a9b0bf", Ni: "#9aa6a0", Al: "#c4cbd8", Ir: "#b9c3cf", Rh: "#c7c2d4" };
  const MAXK = { truncated_octahedron: 7, cuboctahedron: 9, octahedron: 16, cube: 9, wulff: 9, sphere: 12 };
  const st = { shape: "truncated_octahedron", color: "site", an: null, theta: 0.7, phi: 0.45, drag: false, series: {} };
  const f = (v, d) => S.fmt(v, d == null ? 3 : d);
  const T = s => A.tex(s);

  function hexToRgb(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
  function shade(h, k) { const c = hexToRgb(h); return `rgb(${c.map(v => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))).join(",")})`; }
  const spriteCache = new Map();
  function sprite(col, px) {
    const key = col + px; if (spriteCache.has(key)) return spriteCache.get(key);
    const d = Math.max(4, Math.round(px * 2)), c = document.createElement("canvas"); c.width = c.height = d;
    const g = c.getContext("2d"), r = d / 2, gr = g.createRadialGradient(r * 0.62, r * 0.58, r * 0.06, r, r, r);
    gr.addColorStop(0, shade(col, 0.75)); gr.addColorStop(0.45, col); gr.addColorStop(1, shade(col, -0.55));
    g.fillStyle = gr; g.beginPath(); g.arc(r, r, r - 0.4, 0, Math.PI * 2); g.fill();
    if (spriteCache.size > 400) spriteCache.clear();
    spriteCache.set(key, c); return c;
  }
  function gcnColor(g) {
    const stops = [[227, 73, 72], [237, 161, 0], [240, 239, 236], [127, 163, 238], [29, 60, 156]], t = Math.max(0, Math.min(1, (g - 3) / (9 - 3))) * 4, i = Math.min(3, Math.floor(t)), u = t - i;
    return "#" + stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * u).toString(16).padStart(2, "0")).join("");
  }

  /* ---------- 3D render ---------- */
  const cv = $("#fl-canvas"), ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1, raf = 0, visible = true;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; spriteCache.clear(); }
  function render() {
    const an = st.an; if (!an || !W) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    let R = 0; an.P.forEach(p => { R = Math.max(R, Math.hypot(p[0], p[1], p[2])); });
    R += 1;
    const scale = 0.42 * Math.min(W, H) / R * dpr, ct = Math.cos(st.theta), sn = Math.sin(st.theta), cp = Math.cos(st.phi), sp = Math.sin(st.phi);
    const D = 4 * R, cut = $("#fl-cut").checked, pts = [];
    an.P.forEach((p, i) => {
      const x1 = p[0] * ct + p[2] * sn, z1 = -p[0] * sn + p[2] * ct, y2 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp;
      if (cut && z2 < -0.01) return;
      const k = D / (D + z2); pts.push({ X: cv.width / 2 + scale * k * x1, Y: cv.height / 2 - scale * k * y2, z: z2, k, i });
    });
    pts.sort((a, b) => b.z - a.z);
    const rad = scale * Math.SQRT2 / 2 * 0.98;
    for (const q of pts) {
      const col = st.color === "gcn" ? gcnColor(an.gcn[q.i]) : st.color === "metal" ? METAL_COL[an.metal] : SITE[an.classes[q.i]];
      const s = sprite(col, Math.round(rad * q.k)), d = s.width;
      ctx.globalAlpha = Math.max(0.55, Math.min(1, 0.85 - 0.35 * q.z / R));
      ctx.drawImage(s, q.X - d / 2, q.Y - d / 2);
    }
    ctx.globalAlpha = 1;
  }
  function loop() { raf = 0; if (!visible) return; if (!st.drag && !reduce) st.theta += 0.004; render(); if (!reduce) raf = requestAnimationFrame(loop); }
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  cv.addEventListener("pointerdown", e => { st.drag = true; st.px = e.clientX; st.py = e.clientY; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => { if (!st.drag) return; st.theta += (e.clientX - st.px) * 0.01; st.phi = Math.max(-1.4, Math.min(1.4, st.phi + (e.clientY - st.py) * 0.01)); st.px = e.clientX; st.py = e.clientY; if (reduce) render(); });
  cv.addEventListener("pointerup", () => { st.drag = false; });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(cv);
  addEventListener("resize", () => { size(); render(); });

  /* ---------- update ---------- */
  function params() {
    const k = +$("#fl-k").value, gam = +$("#fl-gam").value;
    return { metal: $("#fl-metal").value, shape: st.shape, k, gam, radius: st.shape === "sphere" ? k + 0.6 : null };
  }
  function update() {
    const p = params();
    $("#fl-k").max = MAXK[p.shape]; if (+$("#fl-k").value > MAXK[p.shape]) $("#fl-k").value = MAXK[p.shape];
    $("#fl-k-o").textContent = $("#fl-k").value; $("#fl-gam-o").textContent = (+$("#fl-gam").value).toFixed(2);
    $("#fl-gam-row").hidden = p.shape !== "wulff";
    $("#fl-a").textContent = `${M.METALS[p.metal][0].toFixed(3)} Å`;
    const P = M.build(p.shape, +$("#fl-k").value, p.gam, p.radius);
    st.an = M.analyse(P, p.metal);
    renderFacts(); renderLegend(); render(); kick();
    drawSites(); drawGcn(); drawSize(); renderLig();
  }
  const shapeName = s => ({ truncated_octahedron: "truncated octahedron", cuboctahedron: "cuboctahedron", octahedron: "octahedron", cube: "cube", wulff: "Wulff polyhedron", sphere: "sphere" })[s];
  function renderFacts() {
    const an = st.an, c = an.counts, low = (c.edge + c.vertex) / Math.max(1, an.nsurf);
    $("#fl-title").innerHTML = `${T(`\\mathrm{${an.metal}}_{${an.n}}`)} ${shapeName(st.shape)}`;
    $("#fl-story").innerHTML = `A ${f(an.dEq, 2)} nm particle with <b>${an.nsurf}</b> of its ${an.n} atoms on the surface (dispersion ${(100 * an.dispersion).toFixed(0)}%). ` +
      `${(100 * low).toFixed(0)}% of the surface atoms sit on edges and vertices, and {111} terraces make up ${(100 * an.f111).toFixed(0)}% of the facet atoms.`;
    const kv = [["Atoms", an.n.toLocaleString()], ["Surface atoms", an.nsurf.toLocaleString()], ["Diameter (equiv.)", `${f(an.dEq, 2)} nm`], ["Largest dimension", `${f(an.dMax, 2)} nm`], ["Molar mass", `${S.fmt(an.mass / 1000, 1)} kg/mol`], ["Mean surface GCN", f(an.gcn.filter((_, i) => an.classes[i] !== "bulk").reduce((a, v) => a + v, 0) / Math.max(1, an.nsurf), 2)]];
    $("#fl-kv").innerHTML = kv.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("");
  }
  function renderLegend() {
    if (st.color === "site") $("#fl-legend").innerHTML = Object.entries(SITE).map(([k, c]) => `<span><i style="background:${c}"></i>${k === "bulk" ? "core" : k}</span>`).join("");
    else if (st.color === "gcn") $("#fl-legend").innerHTML = `<span class="gbar"><b>GCN</b><i class="grad"></i><small>3</small><small>9</small></span>`;
    else $("#fl-legend").innerHTML = "";
  }
  function drawSites() {
    const host = $("#fc-sites"), an = st.an, tk = S.tokens(), keys = ["{111} facet", "{100} facet", "edge", "vertex"], vals = keys.map(k => an.counts[k]), mx = Math.max(...vals, 1);
    const fr = S.frame(host, { x0: 0, x1: 4, y0: 0, y1: mx * 1.18, xLabel: "surface site type", yLabel: "atoms", yd: 0, xTicks: [], label: "Surface site counts", height: 250 });
    const bw = (fr.W - fr.m.l - fr.m.r) / 4;
    keys.forEach((k, i) => {
      const x = fr.m.l + i * bw + bw * 0.18, w = bw * 0.64, y = fr.y(vals[i]), y0 = fr.y(0), r = Math.min(5, w / 2, y0 - y);
      S.el("path", { d: `M${x} ${y0}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y0}Z`, fill: SITE[k] }, fr.svg);
      S.el("text", { x: x + w / 2, y: y - 6, "text-anchor": "middle", class: "lbl" }, fr.svg).textContent = vals[i];
      S.el("text", { x: x + w / 2, y: fr.H - fr.m.b + 16, "text-anchor": "middle", class: "ww-tick" }, fr.svg).textContent = k.replace(" facet", "");
    });
    A.chartTools(host, `${an.metal}${an.n}_sites`);
  }
  function drawGcn() {
    const host = $("#fc-gcn"), an = st.an, tk = S.tokens(), sur = an.gcn.filter((_, i) => an.classes[i] !== "bulk");
    const bins = 24, lo = 2.5, hi = 8.5, w = (hi - lo) / bins, h = new Array(bins).fill(0);
    sur.forEach(g => { const b = Math.floor((g - lo) / w); if (b >= 0 && b < bins) h[b]++; });
    const fr = S.frame(host, { x0: lo, x1: hi, y0: 0, y1: Math.max(...h, 1) * 1.15, xLabel: "generalized coordination number (surface atoms)", yLabel: "atoms", yd: 0, label: "GCN distribution", height: 250 });
    h.forEach((c, b) => { if (!c) return; const x0 = fr.x(lo + b * w) + 1, x1 = fr.x(lo + (b + 1) * w) - 1, y = fr.y(c); S.el("rect", { x: x0, y, width: Math.max(1, x1 - x0), height: fr.y(0) - y, rx: 2, fill: gcnColor(lo + (b + 0.5) * w) }, fr.svg); });
    [[7.5, "{111} terrace"], [80 / 12, "{100} terrace"]].forEach(([g, l]) => { S.el("line", { x1: fr.x(g), x2: fr.x(g), y1: fr.m.t, y2: fr.H - fr.m.b, stroke: tk.ink3, "stroke-dasharray": "3 3" }, fr.svg); S.el("text", { x: fr.x(g) + 4, y: fr.m.t + 12, class: "lbl" }, fr.svg).textContent = l; });
    A.chartTools(host, `${an.metal}${an.n}_gcn`);
  }
  function series() {
    const p = params(), key = p.shape + p.metal + (p.shape === "wulff" ? p.gam : "");
    if (st.series[key]) return st.series[key];
    const out = [];
    for (let k = 1; k <= MAXK[p.shape]; k++) {
      const an = M.analyse(M.build(p.shape, k, p.gam, p.shape === "sphere" ? k + 0.6 : null), p.metal);
      out.push({ k, d: an.dEq, disp: an.dispersion, low: (an.counts.edge + an.counts.vertex) / an.n, n: an.n });
    }
    return (st.series[key] = out);
  }
  function drawSize() {
    const host = $("#fc-size"), tk = S.tokens(), s = series(), cur = +$("#fl-k").value;
    const fr = S.frame(host, { x0: 0, x1: Math.max(...s.map(v => v.d)) * 1.05, y0: 0, y1: 1, xLabel: "equivalent diameter (nm)", yLabel: "fraction of all atoms", yd: 1, yFmt: v => `${Math.round(v * 100)}%`, label: "Size dependence", height: 280 });
    S.line(fr, s.map(v => v.d), s.map(v => v.disp), { stroke: tk.series });
    S.line(fr, s.map(v => v.d), s.map(v => v.low), { stroke: tk.series2 });
    s.forEach(v => { [[v.disp, tk.series], [v.low, tk.series2]].forEach(([y, c]) => S.el("circle", { cx: fr.x(v.d), cy: fr.y(y), r: v.k === cur ? 6 : 3.5, fill: c, stroke: tk.surface, "stroke-width": 2 }, fr.svg)); });
    S.crosshair(fr, s.map(v => v.d), i => `<b>N = ${s[i].n.toLocaleString()}</b>, d = ${f(s[i].d, 2)} nm<br>surface ${(100 * s[i].disp).toFixed(1)}% · edges + vertices ${(100 * s[i].low).toFixed(1)}%`, i => s[i].disp);
    S.legend(fr, [{ label: "surface atoms (dispersion)", color: tk.series }, { label: "edge + vertex atoms", color: tk.series2 }]);
    A.chartTools(host, "size_dependence");
  }
  function renderLig() {
    const an = st.an, gd = parseFloat($("#fl-gd").value) || 0, nl = gd * an.area, sph = Math.PI * an.dEq ** 2;
    $("#fl-lig").innerHTML = `<div class="lig-big"><div><b>${S.fmt(nl, 0)}</b><span>ligands</span></div><div><b>${f(nl / Math.max(1, an.nsurf), 2)}</b><span>per surface atom</span></div><div><b>${f(an.area, 2)}</b><span>atomistic surface area (nm²)</span></div><div><b>${f(sph, 2)}</b><span>sphere area ${T("\\pi d^2")} (nm²)</span></div></div>
      <div class="eqbox">${A.tex(`N_\\mathrm{lig} = \\sigma_g A = ${f(gd, 2)}\\ \\mathrm{nm^{-2}} \\times ${f(an.area, 2)}\\ \\mathrm{nm^2} \\approx ${S.fmt(nl, 0)}`, true)}</div>
      <p class="hint">Using the sphere area instead would give ${S.fmt(gd * sph, 0)} ligands (${((sph / an.area - 1) * 100).toFixed(0)}% ${sph > an.area ? "more" : "fewer"}). On faceted particles the atomistic area is the better reference. A ratio above about 0.33 ligands per surface atom exceeds a full thiolate monolayer on Au(111).</p>`;
  }

  /* ---------- controls ---------- */
  $$("#fl-shape button").forEach(b => b.addEventListener("click", () => { st.shape = b.dataset.shape; $$("#fl-shape button").forEach(o => o.setAttribute("aria-pressed", o === b)); update(); }));
  $$("#fl-color button").forEach(b => b.addEventListener("click", () => { st.color = b.dataset.c; $$("#fl-color button").forEach(o => o.setAttribute("aria-pressed", o === b)); renderLegend(); render(); }));
  ["#fl-metal", "#fl-k", "#fl-gam"].forEach(s => $(s).addEventListener("input", update));
  $("#fl-gd").addEventListener("input", renderLig);
  $("#fl-cut").addEventListener("change", render);
  A.tabs($("#fl-tabs"));
  $("#fl-xyz").addEventListener("click", () => A.download(`${st.an.metal}${st.an.n}_${st.shape}.xyz`, M.toXYZ(st.an), "chemical/x-xyz"));
  $("#fl-csv").addEventListener("click", () => A.download(`${st.an.metal}${st.an.n}_sites.csv`, "index,x_A,y_A,z_A,CN,GCN,site\n" + st.an.pos.map((p, i) => `${i},${p.map(v => v.toFixed(4)).join(",")},${st.an.cn[i]},${st.an.gcn[i].toFixed(4)},${st.an.classes[i]}`).join("\n"), "text/csv"));
  $("#fl-copy").addEventListener("click", () => { const an = st.an; A.copy(`${an.metal}${an.n} ${shapeName(st.shape)} (d = ${f(an.dEq, 2)} nm): ${an.nsurf} surface atoms (${an.counts["{111} facet"]} {111}, ${an.counts["{100} facet"]} {100}, ${an.counts.edge} edge, ${an.counts.vertex} vertex). Built with FacetLab (https://siba-p.github.io/facetlab/).`); });
  $("#fl-report").addEventListener("click", () => {
    A.report({ title: `${st.an.metal}${st.an.n} ${shapeName(st.shape)}`, subtitle: "nanoparticle structure", tool: "FacetLab", filename: `facetlab_${st.an.metal}${st.an.n}.html`,
      sections: [{ title: "Summary", html: `<p>${$("#fl-story").innerHTML}</p>${$("#fl-kv").outerHTML}` }, { title: "Surface sites", svgs: [$("#fc-sites svg"), $("#fc-gcn svg")] }, { title: "Size dependence", svgs: [$("#fc-size svg")] }, { title: "Ligands", html: $("#fl-lig").innerHTML }] });
  });
  S.onTheme(() => { drawSites(); drawGcn(); drawSize(); });
  size(); update();
})();
