(function () {
  "use strict";
  const K = window.KBK, S = window.SMC, root = document.getElementById("kb");
  if (!K || !S || !root) return;
  const $ = s => root.querySelector(s), $$ = s => Array.from(root.querySelectorAll(s));
  const form = $("#kb-form");
  const SLOTS = {
    single: [{ id: "ij", label: "g_ij(r)" }],
    binary: [{ id: "ww", label: "solvent–solvent (w–w)", nj: "nw", same: true }, { id: "cc", label: "cosolvent–cosolvent (c–c)", nj: "nc", same: true }, { id: "cw", label: "cosolvent–solvent (c–w)", nj: "nw", same: false }],
    pb: [{ id: "pc", label: "solute–cosolvent (p–c)", nj: "nc", same: false }, { id: "pw", label: "solute–solvent (p–w)", nj: "nw", same: false }]
  };
  let mode = "single", files = {}, last = null, exact = null;

  function setMode(m) {
    mode = m;
    $$('[role="tab"]').forEach(t => t.setAttribute("aria-selected", t.dataset.mode === m));
    $$("[data-show]").forEach(d => { d.hidden = !d.dataset.show.split(" ").includes(m); });
    $("#kb-demo").hidden = m !== "single";
    $("#kb-slots").innerHTML = SLOTS[m].map(s => `<div class="kb-slot" data-slot="${s.id}"><span>${s.label}</span>
      <label class="ww-file">${files[s.id] ? "✓ " + files[s.id].name : "Choose file"}<input type="file" accept=".xvg,.dat,.txt,.csv" data-slot="${s.id}"></label></div>`).join("");
  }
  $$('[role="tab"]').forEach(t => t.addEventListener("click", () => setMode(t.dataset.mode)));
  root.addEventListener("change", async e => {
    const inp = e.target;
    if (inp.type === "file" && inp.dataset.slot) {
      const f = inp.files[0]; if (!f) return;
      files[inp.dataset.slot] = { name: f.name, ...K.parseRdf(await f.text()) };
      exact = null; setMode(mode);
      status(`${f.name}: ${files[inp.dataset.slot].r.length} points, r up to ${S.fmt(files[inp.dataset.slot].r.slice(-1)[0], 3)}.`);
    }
  });
  const status = m => { $("#kb-status").textContent = m; };

  $("#kb-demo").addEventListener("click", async () => {
    const text = await (await fetch(root.dataset.demo)).text();
    files.ij = { name: "hard_spheres_eta0.30.xvg", ...K.parseRdf(text) };
    form.V.value = 893.6086; form.nj.value = 512; form.same.checked = true;
    exact = K.hardSphereG(0.3);
    setMode("single"); status("Demo loaded: N = 512 hard spheres (σ = 1) in V = 893.6 σ³. Press Compute.");
    compute();
  });

  form.addEventListener("submit", e => { e.preventDefault(); compute(); });
  function num(n) { const v = parseFloat(form[n].value); return Number.isFinite(v) ? v : null; }
  function compute() {
    const V = num("V");
    if (!(V > 0)) { status("Enter the box volume."); return; }
    const slots = SLOTS[mode];
    if (slots.some(s => !files[s.id])) { status("Load an RDF file for every slot."); return; }
    const pl = num("p1") != null && num("p2") != null ? [num("p1"), num("p2")] : null;
    const fit = num("f1") != null && num("f2") != null ? [num("f1"), num("f2")] : null;
    const res = {};
    for (const s of slots) {
      const nj = mode === "single" ? num("nj") : num(s.nj);
      const same = mode === "single" ? form.same.checked : s.same;
      res[s.id] = K.kbi(files[s.id].r, files[s.id].g, { nj, V, same, plateau: pl, fit });
      res[s.id].label = s.label; res[s.id].hasN = nj > 0;
    }
    last = { res, mode, V };
    render();
    status("Done. Hover the charts for values.");
  }
  const f4 = v => (Number.isFinite(v) ? S.fmt(v, 4) : "–");
  function render() {
    if (!last) return;
    const { res, mode: m, V } = last, out = $("#kb-out");
    out.innerHTML = "";
    let thermoHtml = "";
    if (m === "binary") {
      const t = K.binaryThermo(res.ww.best[0], res.cc.best[0], res.cw.best[0], num("nw") / V, num("nc") / V, num("T") || 298.15);
      const stab = t.dlna_dlnx > 1.02 ? "favourable mixing" : t.dlna_dlnx < 0.98 ? "self-association" : "close to ideal";
      thermoHtml = card("Binary-mixture thermodynamics", `<dl class="ww-summary">
        ${dd("Cosolvent mole fraction x_c", f4(t.x_c))}${dd("∂ln a_c / ∂ln x_c", `${f4(t.dlna_dlnx)} <small>(${stab})</small>`)}${dd("∂ln a_c / ∂ln ρ_c", f4(t.dlna_dlnrho))}
        ${dd("Δ = G_cc + G_ww − 2G_cw", f4(t.Delta) + " nm³")}${dd("Partial molar volume V̄_c", S.fmt(t.V_c, 2) + " cm³/mol")}${dd("Partial molar volume V̄_w", S.fmt(t.V_w, 2) + " cm³/mol")}
        ${dd("Isothermal compressibility κ_T", S.fmt(t.kappa, 3) + " GPa⁻¹")}${dd("Excess coordination N_cc", f4(t.N_cc))}${dd("Excess coordination N_cw", f4(t.N_cw))}</dl>
        <p class="ww-caption">Uses the recommended estimate for each G. Lengths in nm. ∂ln a/∂ln x = 1 for an ideal mixture.</p>`);
    } else if (m === "pb") {
      const nu = K.preferentialBinding(res.pc.best[0], res.pw.best[0], num("nc") / V);
      thermoHtml = card("Preferential binding", `<dl class="ww-summary">${dd("ν_pc = ρ_c (G_pc − G_pw)", S.fmt(nu, 3))}${dd("Interpretation", nu > 0 ? "cosolvent accumulates at the solute" : "cosolvent is excluded (preferential hydration)")}</dl>`);
    }
    if (thermoHtml) out.insertAdjacentHTML("beforeend", thermoHtml);
    Object.entries(res).forEach(([id, r]) => {
      const rows = `<table class="ww-table kb-table"><thead><tr><th>Estimator</th><th>G</th><th>±</th><th>cm³/mol</th></tr></thead><tbody>
        <tr><td>Raw plateau</td><td>${f4(r.plateauRaw[0])}</td><td>${f4(r.plateauRaw[1])}</td><td>${S.fmt(r.plateauRaw[0] * K.NA, 1)}</td></tr>
        ${r.plateauGv ? `<tr><td>GvdV-corrected plateau</td><td>${f4(r.plateauGv[0])}</td><td>${f4(r.plateauGv[1])}</td><td>${S.fmt(r.plateauGv[0] * K.NA, 1)}</td></tr>` : ""}
        <tr><td>Krüger–Vlugt extrapolation</td><td>${f4(r.kv[0])}</td><td>${f4(r.kv[1])}</td><td>${S.fmt(r.kv[0] * K.NA, 1)}</td></tr>
        <tr class="best"><td><b>Recommended</b></td><td><b>${f4(r.best[0])}</b></td><td>${f4(r.best[1])}</td><td>${S.fmt(r.best[0] * K.NA, 1)}</td></tr>
        ${exact != null ? `<tr><td>Exact (Carnahan–Starling)</td><td>${f4(exact)}</td><td></td><td></td></tr>` : ""}</tbody></table>
        ${r.hasN ? "" : '<p class="ww-caption">Enter the particle number to enable the Ganguly–van der Vegt correction.</p>'}`;
      out.insertAdjacentHTML("beforeend", card(`G<sub>${id}</sub> · ${r.label}`, `<div class="kb-two"><div class="ww-chart" id="kbc-${id}"></div><div class="ww-chart" id="kbv-${id}"></div></div>${rows}`));
      drawRunning(r, document.getElementById("kbc-" + id));
      drawKV(r, document.getElementById("kbv-" + id));
    });
    const dl = document.createElement("button"); dl.type = "button"; dl.textContent = "Download results (CSV)";
    dl.addEventListener("click", () => {
      const lines = ["pair,raw,raw_sd,gvdv,gvdv_sd,kv,kv_fit_se,recommended"];
      Object.entries(res).forEach(([id, r]) => lines.push([id, r.plateauRaw[0], r.plateauRaw[1], r.plateauGv ? r.plateauGv[0] : "", r.plateauGv ? r.plateauGv[1] : "", r.kv[0], r.kv[1], r.best[0]].join(",")));
      S.download("kbkit_results.csv", lines.join("\n"), "text/csv");
    });
    out.appendChild(dl);
  }
  const card = (title, body) => `<div class="ww-card"><div class="ww-cardhead"><h3>${title}</h3></div>${body}</div>`;
  const dd = (a, b) => `<div><dt>${a}</dt><dd>${b}</dd></div>`;
  function drawRunning(r, host) {
    const vals = [...r.Graw, ...(r.Ggv || [])].filter(Number.isFinite).concat(exact != null ? [exact] : []);
    const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.08 || 0.1;
    const f = S.frame(host, { x0: 0, x1: r.r[r.r.length - 1], y0: lo - pad, y1: hi + pad, xLabel: "R", yLabel: "running G(R)", yd: 2, label: "Running KB integral", height: 240 });
    S.el("rect", { x: f.x(r.plateauRange[0]), y: f.m.t, width: f.x(r.plateauRange[1]) - f.x(r.plateauRange[0]), height: f.H - f.m.t - f.m.b, fill: f.tk.neutral, "fill-opacity": 0.12 }, f.svg);
    S.line(f, r.r, Array.from(r.Graw), { stroke: f.tk.neutral, "stroke-width": 1.6 });
    if (r.Ggv) S.line(f, r.r, Array.from(r.Ggv), { stroke: f.tk.series });
    S.hline(f, r.best[0], { stroke: f.tk.series2, "stroke-dasharray": "5 4" });
    if (exact != null) S.hline(f, exact, { stroke: f.tk.ink, "stroke-width": 1, "stroke-dasharray": "1 3" });
    S.crosshair(f, r.r, i => `<b>R = ${S.fmt(r.r[i], 3)}</b><br>raw ${f4(r.Graw[i])}${r.Ggv ? `<br>GvdV ${f4(r.Ggv[i])}` : ""}`, i => (r.Ggv ? r.Ggv[i] : r.Graw[i]));
    const items = [{ label: "raw", color: f.tk.neutral }];
    if (r.Ggv) items.push({ label: "GvdV corrected", color: f.tk.series });
    items.push({ label: "recommended", color: f.tk.series2, dash: true });
    if (exact != null) items.push({ label: "exact", color: f.tk.ink, dash: true });
    S.legend(f, items);
  }
  function drawKV(r, host) {
    const y = r.L.map((l, i) => l * r.GV[i]), fitY = r.L.map(l => r.kv[0] * l + r.kvIntercept);
    const all = y.concat(fitY), lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.08 || 0.1;
    const f = S.frame(host, { x0: 0, x1: r.L[r.L.length - 1], y0: lo - pad, y1: hi + pad, xLabel: "L", yLabel: "L · G_V(L)", yd: 2, label: "Krüger–Vlugt extrapolation", height: 240 });
    S.el("rect", { x: f.x(r.fit[0]), y: f.m.t, width: f.x(r.fit[1]) - f.x(r.fit[0]), height: f.H - f.m.t - f.m.b, fill: f.tk.neutral, "fill-opacity": 0.12 }, f.svg);
    S.line(f, r.L, fitY, { stroke: f.tk.series2, "stroke-dasharray": "5 4", "stroke-width": 1.5 });
    S.line(f, r.L, y, { stroke: f.tk.series });
    S.crosshair(f, r.L, i => `<b>L = ${S.fmt(r.L[i], 3)}</b><br>L·G_V = ${f4(y[i])}<br>G_V = ${f4(r.GV[i])}`, i => y[i]);
    S.legend(f, [{ label: "L·G_V(L)", color: f.tk.series }, { label: `fit: slope G∞ = ${f4(r.kv[0])}`, color: f.tk.series2, dash: true }]);
  }
  setMode("single");
  S.onTheme(render);
})();
