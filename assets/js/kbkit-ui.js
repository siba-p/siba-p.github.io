(function () {
  "use strict";
  const K = window.KBK, S = window.SMC, A = window.APP, root = document.getElementById("kb");
  if (!K || !S || !A || !root) return;
  const $ = s => root.querySelector(s), $$ = s => Array.from(root.querySelectorAll(s));
  const SLOTS = {
    single: [{ id: "ij", label: "radial distribution function", sub: "ij" }],
    binary: [{ id: "ww", label: "solvent–solvent", sub: "ww", nj: "nw", same: true }, { id: "cc", label: "cosolvent–cosolvent", sub: "cc", nj: "nc", same: true }, { id: "cw", label: "cosolvent–solvent", sub: "cw", nj: "nw", same: false }],
    pb: [{ id: "pc", label: "solute–cosolvent", sub: "pc", nj: "nc", same: false }, { id: "pw", label: "solute–solvent", sub: "pw", nj: "nw", same: false }]
  };
  const st = { mode: "single", files: {}, exact: null, res: null, thermo: null };
  const num = id => { const v = parseFloat($(id).value); return Number.isFinite(v) ? v : null; };
  const lu = () => $("#kb-lu").value;
  const toNm3 = () => ({ nm: 1, "Å": 1e-3 })[lu()] ?? null;
  const f = (v, d) => S.fmt(v, d == null ? 4 : d);
  const T = s => A.tex(s);
  const U3 = () => (lu() === "σ" ? T("\\sigma^3") : T(`\\mathrm{${lu() === "Å" ? "\\AA" : "nm"}}^3`));
  const molar = G => (toNm3() ? `${S.fmt(G * toNm3() * K.NA, 1)} cm³/mol` : "");

  /* ---------- mode & slots ---------- */
  function setMode(m) {
    st.mode = m;
    $$(".app-mode").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === m));
    $$("[data-show]").forEach(el => { el.hidden = !el.dataset.show.split(" ").includes(m); });
    renderSlots();
    A.steps($("#kb-steps"), 1);
  }
  function renderSlots() {
    $("#kb-slots").innerHTML = SLOTS[st.mode].map(s => {
      const fl = st.files[s.id];
      return `<div class="slot${fl ? " ok" : ""}" data-slot="${s.id}"><b>${A.tex(`G_{${s.sub}}`)} · ${s.label}</b><small>${fl ? A.esc(fl.name) + ` · ${fl.r.length} points · r ≤ ${f(fl.r[fl.r.length - 1], 2)}` : "no file yet: drop or choose"}</small><label>${fl ? "Replace" : "Choose"}<input type="file" accept=".xvg,.dat,.txt,.csv"></label></div>`;
    }).join("");
    $$("#kb-slots .slot").forEach(el => A.bindDrop(el, async files => {
      const fl = files[0], txt = await fl.text(), p = K.parseRdf(txt);
      if (p.r.length < 10) { A.toast("No r, g(r) columns found in " + fl.name); return; }
      st.files[el.dataset.slot] = { name: fl.name, ...p }; st.exact = null; renderSlots(); A.toast(`Loaded ${fl.name}`);
      if (ready()) compute(true);
    }));
  }
  $$(".app-mode").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
  $("#kb-lu").addEventListener("change", () => { $$(".lu3").forEach(e => { e.textContent = lu() + "³"; }); if (st.res) compute(true); });

  /* ---------- examples ---------- */
  async function getRdf(file) { const t = await (await fetch(root.dataset.base + file)).text(); return { name: file, ...K.parseRdf(t) }; }
  $$("[data-sample]").forEach(b => b.addEventListener("click", async () => {
    const k = b.dataset.sample;
    $("#kb-lu").value = "σ"; $$(".lu3").forEach(e => { e.textContent = "σ³"; });
    if (k === "hs") { setMode("single"); st.files = { ij: await getRdf("kbkit-hard-spheres.xvg") }; $("#kb-V").value = 893.6086; $("#kb-nj").value = 512; $("#kb-same").checked = true; st.exact = K.hardSphereG(0.3); }
    if (k === "ideal") { setMode("single"); st.files = { ij: await getRdf("kbkit-ideal-gas.xvg") }; $("#kb-V").value = 512; $("#kb-nj").value = 400; $("#kb-same").checked = true; st.exact = 0; }
    if (k === "binary") {
      setMode("binary");
      st.files = { ww: await getRdf("kbkit-binary-ww.xvg"), cc: await getRdf("kbkit-binary-cc.xvg"), cw: await getRdf("kbkit-binary-cw.xvg") };
      $("#kb-V").value = 1127.5944; $("#kb-nw").value = 400; $("#kb-nc").value = 112; st.exact = null;
    }
    renderSlots(); compute(false);
  }));

  /* ---------- compute ---------- */
  function reliability(r) {
    let s = 100; const why = [];
    if (!r.plateauGv) { s -= 30; why.push("no particle number, so the finite-size correction could not be applied"); }
    else {
      const d = Math.abs(r.plateauGv[0] - r.kv[0]);
      const tol = Math.max(2 * r.plateauGv[1], 0.03 * Math.abs(r.kv[0]), 0.1 * Math.abs(r.plateauRaw[0] - r.kv[0]), 1e-4);
      if (d > tol) { s -= Math.min(40, 20 * d / tol); why.push("the two corrected estimates disagree beyond their uncertainty"); }
    }
    const rel = r.plateauRaw[1] / Math.max(Math.abs(r.best[0]), 1e-6);
    if (rel > 0.15 && Math.abs(r.best[0]) > 1e-3) { s -= 15; why.push("the running integral is still oscillating in the plateau region (use a longer cutoff or more frames)"); }
    return { s: Math.max(0, s), why };
  }
  function compute(silent) {
    const V = num("#kb-V");
    if (!(V > 0)) { if (!silent) { A.toast("Enter the box volume"); $("#kb-V").focus(); } return; }
    const miss = SLOTS[st.mode].filter(s => !st.files[s.id]);
    if (miss.length) { if (!silent) A.toast(`Load the ${miss.map(m => "G_" + m.sub).join(", ")} RDF`); return; }
    const pl = num("#kb-p1") != null && num("#kb-p2") != null ? [num("#kb-p1"), num("#kb-p2")] : null;
    const fit = num("#kb-f1") != null && num("#kb-f2") != null ? [num("#kb-f1"), num("#kb-f2")] : null;
    const res = {};
    for (const s of SLOTS[st.mode]) {
      const nj = st.mode === "single" ? num("#kb-nj") : num("#kb-" + s.nj), same = st.mode === "single" ? $("#kb-same").checked : s.same;
      const r = K.kbi(st.files[s.id].r, st.files[s.id].g, { nj, V, same, plateau: pl, fit });
      r.slot = s; r.nj = nj; r.rel = reliability(r);
      res[s.id] = r;
    }
    st.res = res; st.V = V;
    st.thermo = null;
    if (st.mode === "binary") {
      const k = toNm3() || 1, rw = num("#kb-nw") / V / k, rc = num("#kb-nc") / V / k;
      st.thermo = K.binaryThermo(res.ww.best[0] * k, res.cc.best[0] * k, res.cw.best[0] * k, rw, rc, num("#kb-T") || 298.15);
    }
    if (st.mode === "pb") st.nu = K.preferentialBinding(res.pc.best[0], res.pw.best[0], num("#kb-nc") / V);
    $("#kb-empty").hidden = true; $("#kb-res").hidden = false;
    ["#kb-report", "#kb-csv", "#kb-copy"].forEach(b => { $(b).disabled = false; });
    A.steps($("#kb-steps"), 2);
    render();
  }
  $("#kb-run").addEventListener("click", () => compute(false));
  let liveT = 0;
  const ready = () => SLOTS[st.mode].every(s => st.files[s.id]) && num("#kb-V") > 0;
  ["#kb-V", "#kb-nj", "#kb-nw", "#kb-nc", "#kb-T", "#kb-p1", "#kb-p2", "#kb-f1", "#kb-f2"].forEach(id => $(id).addEventListener("input", () => {
    clearTimeout(liveT); liveT = setTimeout(() => { if (ready()) compute(true); }, 220);
  }));
  $("#kb-same").addEventListener("change", () => { if (ready()) compute(true); });

  /* ---------- render ---------- */
  function render() {
    const res = st.res, pairs = Object.values(res), worst = Math.min(...pairs.map(r => r.rel.s));
    $("#kb-insight").className = "panel2 insight " + A.gauge($("#kb-gauge"), worst, "reliability");
    let head = "", story = "", kpis = [];
    if (st.mode === "single") {
      const r = res.ij, shift = r.plateauRaw[0] !== 0 ? 100 * (r.best[0] - r.plateauRaw[0]) / Math.abs(r.plateauRaw[0]) : 0;
      const nexc = r.nj && st.V ? r.nj / st.V * r.best[0] : null;
      head = `${T(`G_{ij} = ${f(r.best[0])}`)} ${U3()} ${toNm3() ? `<small class="muted" style="font-size:.6em">(${molar(r.best[0])})</small>` : ""}`;
      story = r.plateauGv
        ? `The two finite-size corrections ${r.rel.why.some(w => w.includes("disagree")) ? "<b>do not fully agree</b>" : "<b>agree</b>"} (GvdV ${f(r.plateauGv[0])}, Krüger–Vlugt ${f(r.kv[0])})` + (Math.abs(r.best[0]) < 0.1 * Math.abs(r.plateauRaw[0])
          ? `, and they remove almost all of the raw value (<b>${f(r.plateauRaw[0])} → ${f(r.best[0])}</b>): the raw number was a finite-size artefact. `
          : `, and they shift the raw integral by <b>${Math.abs(shift).toFixed(1)}%</b>. `)
        : `Only the raw and Krüger–Vlugt estimates are available. Enter N<sub>j</sub> to apply the Ganguly–van der Vegt correction. `;
      if (nexc != null && Math.abs(nexc) < 0.05) story += `G ≈ 0: i and j are distributed <b>essentially at random</b> relative to each other, as in an ideal mixture (excess coordination ${f(nexc, 3)}). `;
      else if (nexc != null) story += r.best[0] < 0
        ? `G < 0: there are <b>${Math.abs(nexc).toFixed(2)} fewer</b> j particles around each i than in an ideal (random) mixture, as expected from excluded volume or depletion. `
        : `G > 0: there are <b>${nexc.toFixed(2)} more</b> j particles around each i than in an ideal mixture, a sign of preferential association. `;
      if (st.exact != null) story += `<b>Exact answer: ${f(st.exact)}</b>. The recommended estimate is ${st.exact === 0 ? `within ${f(Math.abs(r.best[0]), 3)} of zero` : `within ${(100 * Math.abs(r.best[0] - st.exact) / Math.abs(st.exact)).toFixed(1)}%`}, whereas the raw integral is off by ${st.exact === 0 ? f(Math.abs(r.plateauRaw[0]), 3) : (100 * Math.abs(r.plateauRaw[0] - st.exact) / Math.abs(st.exact)).toFixed(1) + "%"}.`;
      if (r.rel.why.length) story += ` Caution: ${r.rel.why.join("; ")}.`;
      kpis = [["Recommended", `${f(r.best[0])} ${U3()}`], ["Raw plateau", f(r.plateauRaw[0])], ["GvdV", r.plateauGv ? f(r.plateauGv[0]) : "–"], ["Krüger–Vlugt", f(r.kv[0])]];
      if (nexc != null) kpis.push([`Excess coordination ${T("\\rho_j G_{ij}")}`, f(nexc, 3)]);
      if (r.nj && st.V) kpis.push([`Density ${T("\\rho_j = N_j/V")}`, f(r.nj / st.V, 4)]);
      if (st.exact != null) kpis.push(["Exact", f(st.exact)]);
    } else if (st.mode === "binary") {
      const t = st.thermo, s = t.dlna_dlnx;
      const kind = s < 0.95 ? "tends to self-associate" : s > 1.05 ? "mixes favourably" : "behaves almost ideally";
      head = `The mixture ${kind} <small class="muted" style="font-size:.6em">(${T(`\\partial \\ln a_c / \\partial \\ln x_c = ${f(s, 3)}`)})</small>`;
      story = `For an ideal mixture ${T("\\partial \\ln a_c/\\partial \\ln x_c = 1")}. A value of ${f(s, 3)} ${s < 1 ? `means like molecules cluster: cosolvent–cosolvent and solvent–solvent contacts are favoured over mixed ones (${T("\\Delta = G_{cc} + G_{ww} - 2G_{cw} > 0")})` : `means unlike contacts are favoured (${T("\\Delta < 0")})`}. ${s < 0.2 ? "<b>Values near 0 signal an approaching phase separation.</b> " : ""}`
        + `Partial molar volumes are ${T("\\bar V_c")} = ${vol(t.v_c)} and ${T("\\bar V_w")} = ${vol(t.v_w)}.` + (pairs.some(p => p.rel.why.length) ? ` Caution: ${[...new Set(pairs.flatMap(p => p.rel.why))].join("; ")}.` : "");
      kpis = [[T("x_c"), f(t.x_c, 4)], [T("\\partial \\ln a_c/\\partial \\ln x_c"), f(s, 3)], [T("\\Delta"), `${f(t.Delta)} ${U3()}`], [T("\\bar V_c"), vol(t.v_c)], [T("\\bar V_w"), vol(t.v_w)], [toNm3() ? T("\\kappa_T") : T("k_B T\\,\\kappa_T"), toNm3() ? `${f(t.kappa, 3)} ${T("\\mathrm{GPa}^{-1}")}` : `${f(t.kTkappa, 3)} ${U3()}`]];
    } else {
      const nu = st.nu;
      head = nu > 0 ? `The cosolvent accumulates at the solute <small class="muted" style="font-size:.6em">(ν = +${f(nu, 3)})</small>` : `The cosolvent is excluded from the solute <small class="muted" style="font-size:.6em">(ν = ${f(nu, 3)})</small>`;
      story = `The preferential binding coefficient ν<sub>pc</sub> = ρ<sub>c</sub>(G<sub>pc</sub> − G<sub>pw</sub>) counts how many extra cosolvent molecules the solute carries compared with bulk composition. ${nu > 0 ? "A positive value means the solute is <b>preferentially solvated by the cosolvent</b>: by Wyman linkage, adding cosolvent stabilises states that expose more of this surface." : "A negative value means <b>preferential hydration</b>: the cosolvent is excluded, so adding it stabilises compact states (the classic osmolyte effect)."}`;
      kpis = [[T("\\nu_{pc}"), f(nu, 3)], [T("G_{pc}"), f(res.pc.best[0])], [T("G_{pw}"), f(res.pw.best[0])]];
    }
    $("#kb-headline").innerHTML = head; $("#kb-story").innerHTML = story;
    $("#kb-kpis").innerHTML = kpis.map(([a, b]) => `<div class="kpi"><small>${a}</small><b>${b}</b></div>`).join("");

    // tabs
    const tabs = [];
    if (st.mode === "binary") tabs.push(["v-thermo", "Thermodynamics"]);
    if (st.mode === "pb") tabs.push(["v-pb", "Preferential binding"]);
    pairs.forEach(r => tabs.push(["v-" + r.slot.id, T(`G_{${r.slot.sub}}`), r.rel.s]));
    const keep = tabs.some(t => t[0] === st.view) ? st.view : tabs[0][0];
    $("#kb-tabs").innerHTML = tabs.map(([id, lab, sc]) => `<button role="tab" data-view="${id}" aria-selected="${id === keep}">${lab}${sc != null && sc < 80 ? ` <span class="cnt warning">!</span>` : ""}</button>`).join("");
    $("#kb-views").innerHTML = tabs.map(([id]) => `<div class="rview" id="${id}" ${id === keep ? "" : "hidden"}></div>`).join("");
    if (st.mode === "binary") renderThermo(); if (st.mode === "pb") renderPb();
    pairs.forEach(renderPair);
    A.tabs($("#kb-tabs"), v => { st.view = v; });
  }
  const vol = v => (toNm3() ? `${S.fmt(v * toNm3() * K.NA, 2)} ${T("\\mathrm{cm^3\\,mol^{-1}}")}` : `${f(v, 3)} ${U3()}`);
  function renderThermo() {
    const t = st.thermo, pos = Math.max(0, Math.min(2, t.dlna_dlnx)) / 2 * 100;
    const row = (a, b) => `<tr><td>${a}</td><td><b>${b}</b></td></tr>`;
    $("#v-thermo").innerHTML = `<div class="two"><div>
      <h3 style="font-size:1rem;margin:0 0 .3rem">Mixing stability ${T("\\partial \\ln a_c / \\partial \\ln x_c")}</h3>
      <div class="scale"><div class="bar"></div><div class="mark" style="left:${pos}%" data-v="${f(t.dlna_dlnx, 3)}"></div><div class="ends"><span>0 · demixing</span><span>1 · ideal</span><span>2 · strong mixing</span></div></div>
      <div class="eqbox">${A.tex("\\left(\\frac{\\partial \\ln a_c}{\\partial \\ln x_c}\\right)_{T,p} = \\frac{1}{1 + \\rho\\, x_w \\Delta}", true)}</div>
      <p class="hint">Thermodynamic stability requires a positive value; the closer to zero, the stronger the tendency to demix.</p></div>
      <table class="dtable"><tbody>
        ${row(`Cosolvent mole fraction ${T("x_c")}`, f(t.x_c, 4))}
        ${row(T("\\Delta = G_{cc} + G_{ww} - 2G_{cw}"), `${f(t.Delta)} ${U3()}`)}
        ${row(T("\\partial \\ln a_c / \\partial \\ln x_c"), f(t.dlna_dlnx, 4))}
        ${row(T("\\partial \\ln a_c / \\partial \\ln \\rho_c"), f(t.dlna_dlnrho, 4))}
        ${row(`Partial molar volume ${T("\\bar V_c")}`, vol(t.v_c))}
        ${row(`Partial molar volume ${T("\\bar V_w")}`, vol(t.v_w))}
        ${row(toNm3() ? `Compressibility ${T("\\kappa_T")}` : T("k_B T\\,\\kappa_T"), toNm3() ? `${f(t.kappa, 4)} ${T("\\mathrm{GPa^{-1}}")}` : `${f(t.kTkappa, 4)} ${U3()}`)}
        ${row(`Excess coordination ${T("N_{cc},\\ N_{cw},\\ N_{ww}")}`, `${f(t.N_cc, 3)}, ${f(t.N_cw, 3)}, ${f(t.N_ww, 3)}`)}
      </tbody></table></div>
      <details class="explain"><summary>How are these obtained?</summary><div class="x-in">
        <p>With ${T("\\rho = \\rho_w + \\rho_c")} and</p>
        ${A.tex("\\eta = \\rho_w + \\rho_c + \\rho_w \\rho_c \\Delta, \\qquad \\zeta = 1 + \\rho_w G_{ww} + \\rho_c G_{cc} + \\rho_w \\rho_c \\left(G_{ww} G_{cc} - G_{cw}^2\\right),", true)}
        <p>the Kirkwood–Buff relations give</p>
        ${A.tex("\\bar V_c = \\frac{1 + \\rho_w (G_{ww} - G_{cw})}{\\eta}, \\qquad \\bar V_w = \\frac{1 + \\rho_c (G_{cc} - G_{cw})}{\\eta}, \\qquad \\kappa_T = \\frac{\\zeta}{\\eta\\, k_B T}.", true)}
        <p>Each ${T("G")} is the recommended (finite-size-corrected) estimate.</p></div></details>`;
  }
  function renderPb() {
    $("#v-pb").innerHTML = `<div class="eqbox">${A.tex(`\\nu_{pc} = \\rho_c \\left(G_{pc} - G_{pw}\\right) = ${f(st.nu, 4)}`, true)}</div>
      <table class="dtable"><tbody><tr><td>${T("G_{pc}")}</td><td>${f(st.res.pc.best[0])} ${U3()}</td></tr><tr><td>${T("G_{pw}")}</td><td>${f(st.res.pw.best[0])} ${U3()}</td></tr><tr><td>${T("\\rho_c = N_c / V")}</td><td>${f(num("#kb-nc") / st.V)}</td></tr></tbody></table>
      <details class="explain" open><summary>How should I read ${T("\\nu")}?</summary><div class="x-in"><p>${T("\\nu > 0")}: the cosolvent binds preferentially (as urea does to proteins). ${T("\\nu < 0")}: the cosolvent is excluded and the solute is preferentially hydrated (osmolytes such as TMAO or sugars). Wyman linkage connects ${T("\\nu")} to how the cosolvent shifts an equilibrium:</p>
      ${A.tex("\\frac{\\partial \\Delta G}{\\partial \\ln a_c} = -k_B T\\, \\Delta \\nu_{pc}", true)}</div></details>`;
  }
  function renderPair(r) {
    const id = r.slot.id, v = $("#v-" + id), mc = toNm3() ? `<th>${T("\\mathrm{cm^3\\,mol^{-1}}")}</th>` : "";
    const tr = (lab, g, sd, cls) => `<tr${cls ? ` class="${cls}"` : ""}><td>${lab}</td><td>${f(g)}</td><td>${sd == null ? "" : f(sd)}</td>${toNm3() ? `<td>${S.fmt(g * toNm3() * K.NA, 1)}</td>` : ""}</tr>`;
    v.innerHTML = `<div class="chart-host" id="kc-run-${id}"></div>
      <p class="hint" style="margin:.2rem 0 0">Drag the edges of the shaded regions to change the plateau and fit ranges; everything updates live.</p>
      <div class="two" style="margin-top:16px"><div class="chart-host" id="kc-g-${id}"></div><div class="chart-host" id="kc-kv-${id}"></div></div>
      <table class="dtable" style="margin-top:14px"><thead><tr><th>Estimator</th><th>${T(`G_{${r.slot.sub}}`)} (${U3()})</th><th>±</th>${mc}</tr></thead><tbody>
        ${tr("Raw running-integral plateau", r.plateauRaw[0], r.plateauRaw[1])}
        ${r.plateauGv ? tr("Ganguly–van der Vegt plateau", r.plateauGv[0], r.plateauGv[1]) : ""}
        ${tr("Krüger–Vlugt extrapolation (± fit only)", r.kv[0], r.kv[1])}
        ${tr("<b>Recommended</b>", r.best[0], r.best[1], "hl")}
        ${st.exact != null && st.mode === "single" ? tr("Exact", st.exact, null) : ""}</tbody></table>
      <details class="explain"><summary>What am I looking at?</summary><div class="x-in">
        <p><b>Top:</b> the running integral ${T("G(R) = 4\\pi\\int_0^R [g(r)-1]\\,r^2\\,dr")}. In a closed box the raw curve (grey) drifts because the box is depleted around any given particle. The corrected curve (blue) should settle onto a <b>plateau</b> (shaded region).</p>
        <p><b>Bottom left:</b> ${T("g(r)")} before and after the Ganguly–van der Vegt correction, which lifts the long-range tail towards 1. <b>Bottom right:</b> ${T("L\\,G_V(L)")}, which becomes a straight line whose <b>slope is</b> ${T("G_\\infty")}.</p></div></details>`;
    drawRun(r, $("#kc-run-" + id)); drawG(r, $("#kc-g-" + id)); drawKV(r, $("#kc-kv-" + id));
  }
  // Draggable range: two handles on a shaded rect; onDone(lo, hi) in data units.
  function rangeHandles(fr, rect, lo, hi, onDone) {
    const tk = S.tokens(), inv = px => fr.o.x0 + (px - fr.m.l) / (fr.W - fr.m.l - fr.m.r) * (fr.o.x1 - fr.o.x0);
    let a = fr.x(lo), b = fr.x(hi);
    const mk = X => {
      const g = S.el("g", { class: "rh" }, fr.svg);
      const ln = S.el("line", { x1: X, x2: X, y1: fr.m.t, y2: fr.H - fr.m.b, stroke: tk.ink2, "stroke-width": 1.5, "stroke-dasharray": "4 3" }, g);
      const kn = S.el("rect", { x: X - 5, y: (fr.m.t + fr.H - fr.m.b) / 2 - 12, width: 10, height: 24, rx: 4, fill: tk.surface, stroke: tk.ink2, "stroke-width": 1.2 }, g);
      const hit = S.el("rect", { x: X - 9, y: fr.m.t, width: 18, height: fr.H - fr.m.t - fr.m.b, fill: "transparent" }, g);
      return { g, ln, kn, hit, set(x) { ln.setAttribute("x1", x); ln.setAttribute("x2", x); kn.setAttribute("x", x - 5); hit.setAttribute("x", x - 9); } };
    };
    const hs = [mk(a), mk(b)];
    hs.forEach((h, i) => {
      let drag = false;
      h.hit.addEventListener("pointerdown", e => { drag = true; h.g.classList.add("drag"); h.hit.setPointerCapture(e.pointerId); e.stopPropagation(); });
      h.hit.addEventListener("pointermove", e => {
        if (!drag) return;
        const X = Math.max(fr.m.l, Math.min(fr.W - fr.m.r, S.svgPoint(fr, e).x));
        if (i === 0) a = Math.min(X, b - 6); else b = Math.max(X, a + 6);
        h.set(i === 0 ? a : b); rect.setAttribute("x", a); rect.setAttribute("width", b - a);
      });
      h.hit.addEventListener("pointerup", () => { if (!drag) return; drag = false; h.g.classList.remove("drag"); onDone(inv(a), inv(b)); });
    });
  }
  function drawRun(r, host) {
    const tk = S.tokens(), ex = st.mode === "single" ? st.exact : null;
    const vals = [...r.Graw, ...(r.Ggv || [])].filter(Number.isFinite).concat(ex != null ? [ex] : []);
    const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.08 || 0.1;
    const fr = S.frame(host, { x0: 0, x1: r.r[r.r.length - 1], y0: lo - pad, y1: hi + pad, xLabel: `R (${lu()})`, yLabel: `running G(R) (${lu()}³)`, yd: 2, label: "Running KB integral", height: 280 });
    const prect = S.el("rect", { x: fr.x(r.plateauRange[0]), y: fr.m.t, width: fr.x(r.plateauRange[1]) - fr.x(r.plateauRange[0]), height: fr.H - fr.m.t - fr.m.b, fill: tk.series, "fill-opacity": 0.08 }, fr.svg);
    S.el("text", { x: fr.x(r.plateauRange[0]) + 6, y: fr.m.t + 12, class: "lbl" }, fr.svg).textContent = "plateau";
    S.line(fr, r.r, Array.from(r.Graw), { stroke: tk.neutral, "stroke-width": 1.8 });
    if (r.Ggv) S.line(fr, r.r, Array.from(r.Ggv), { stroke: tk.series, "stroke-width": 2.2 });
    S.hline(fr, r.best[0], { stroke: tk.series2, "stroke-dasharray": "6 4" });
    if (ex != null) S.hline(fr, ex, { stroke: tk.ink, "stroke-width": 1.2, "stroke-dasharray": "1 3" });
    S.crosshair(fr, r.r, i => `<b>R = ${f(r.r[i], 3)}</b><br>raw ${f(r.Graw[i])}${r.Ggv ? `<br>corrected ${f(r.Ggv[i])}` : ""}`, i => (r.Ggv ? r.Ggv[i] : r.Graw[i]));
    const it = [{ label: "raw", color: tk.neutral }]; if (r.Ggv) it.push({ label: "GvdV corrected", color: tk.series });
    it.push({ label: `recommended ${f(r.best[0])}`, color: tk.series2, dash: true }); if (ex != null) it.push({ label: `exact ${f(ex)}`, color: tk.ink, dash: true });
    rangeHandles(fr, prect, r.plateauRange[0], r.plateauRange[1], (lo, hi) => { $("#kb-p1").value = lo.toFixed(3); $("#kb-p2").value = hi.toFixed(3); compute(true); });
    S.legend(fr, it); A.chartTools(host, `G_${r.slot.sub}_running`);
  }
  function drawG(r, host) {
    const tk = S.tokens(), ys = r.g.concat(r.gc ? r.gc.filter(Number.isFinite) : []), hi = Math.max(...ys);
    const fr = S.frame(host, { x0: 0, x1: r.r[r.r.length - 1], y0: 0, y1: Math.min(hi * 1.05, 6), xLabel: `r (${lu()})`, yLabel: "g(r)", yd: 1, label: "Radial distribution function", height: 240 });
    S.hline(fr, 1, { stroke: tk.ink3, "stroke-width": 1, "stroke-dasharray": "3 3" });
    S.line(fr, r.r, r.g, { stroke: tk.neutral, "stroke-width": 1.6 });
    if (r.gc) S.line(fr, r.r, r.gc, { stroke: tk.series, "stroke-width": 1.6 });
    S.crosshair(fr, r.r, i => `<b>r = ${f(r.r[i], 3)}</b><br>g = ${f(r.g[i], 4)}${r.gc ? `<br>corrected ${f(r.gc[i], 4)}` : ""}`, i => r.g[i]);
    S.legend(fr, r.gc ? [{ label: "g(r)", color: tk.neutral }, { label: "GvdV corrected", color: tk.series }] : [{ label: "g(r)", color: tk.neutral }]);
    A.chartTools(host, `g_${r.slot.sub}`);
  }
  function drawKV(r, host) {
    const tk = S.tokens(), y = r.L.map((l, i) => l * r.GV[i]), fy = r.L.map(l => r.kv[0] * l + r.kvIntercept);
    const all = y.concat(fy), lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.08 || 0.1;
    const fr = S.frame(host, { x0: 0, x1: r.L[r.L.length - 1], y0: lo - pad, y1: hi + pad, xLabel: `L (${lu()})`, yLabel: "L · G_V(L)", yd: 1, label: "Krüger–Vlugt extrapolation", height: 240 });
    const frect = S.el("rect", { x: fr.x(r.fit[0]), y: fr.m.t, width: fr.x(r.fit[1]) - fr.x(r.fit[0]), height: fr.H - fr.m.t - fr.m.b, fill: tk.series2, "fill-opacity": 0.08 }, fr.svg);
    S.el("text", { x: fr.x(r.fit[0]) + 6, y: fr.m.t + 12, class: "lbl" }, fr.svg).textContent = "fit range";
    S.line(fr, r.L, fy, { stroke: tk.series2, "stroke-dasharray": "6 4", "stroke-width": 1.6 });
    S.line(fr, r.L, y, { stroke: tk.series, "stroke-width": 2.2 });
    S.crosshair(fr, r.L, i => `<b>L = ${f(r.L[i], 3)}</b><br>G_V(L) = ${f(r.GV[i])}`, i => y[i]);
    rangeHandles(fr, frect, r.fit[0], r.fit[1], (lo, hi) => { $("#kb-f1").value = lo.toFixed(3); $("#kb-f2").value = hi.toFixed(3); compute(true); });
    S.legend(fr, [{ label: "L·G_V(L)", color: tk.series }, { label: `linear fit, slope G∞ = ${f(r.kv[0])}`, color: tk.series2, dash: true }]);
    A.chartTools(host, `G_${r.slot.sub}_kruger_vlugt`);
  }

  /* ---------- export ---------- */
  function summary() {
    const pairs = Object.values(st.res).map(r => `G_${r.slot.sub} = ${f(r.best[0])} ${lu()}^3 (raw ${f(r.plateauRaw[0])}, GvdV ${r.plateauGv ? f(r.plateauGv[0]) : "n/a"}, Kruger-Vlugt ${f(r.kv[0])})`).join("; ");
    let s = `Kirkwood-Buff integrals: ${pairs}.`;
    if (st.thermo) s += ` Binary mixture x_c = ${f(st.thermo.x_c, 4)}: dln a_c/dln x_c = ${f(st.thermo.dlna_dlnx, 4)}, partial molar volumes V_c = ${vol(st.thermo.v_c)}, V_w = ${vol(st.thermo.v_w)}.`;
    if (st.mode === "pb") s += ` Preferential binding coefficient nu_pc = ${f(st.nu, 4)}.`;
    return s + " Computed with KBkit (https://siba-p.github.io/kbkit/), finite-size corrections after Ganguly & van der Vegt (2013) and Kruger et al. (2013).";
  }
  $("#kb-copy").addEventListener("click", () => A.copy(summary(), "Summary copied"));
  $("#kb-csv").addEventListener("click", () => {
    const L = ["pair,raw,raw_sd,gvdv,gvdv_sd,kv,kv_fit_se,recommended,unit"];
    Object.values(st.res).forEach(r => L.push([r.slot.sub, r.plateauRaw[0], r.plateauRaw[1], r.plateauGv ? r.plateauGv[0] : "", r.plateauGv ? r.plateauGv[1] : "", r.kv[0], r.kv[1], r.best[0], lu() + "^3"].join(",")));
    A.download("kbkit_results.csv", L.join("\n"), "text/csv");
  });
  $("#kb-report").addEventListener("click", () => {
    const svgs = $$("#kb-views svg").map(s => s.cloneNode(true));
    $$("#kb-views .rview").forEach(v => { if (!v.querySelector("svg")) return; });
    A.report({ title: "Kirkwood–Buff analysis", subtitle: Object.values(st.files).map(x => A.esc(x.name)).join(", "), tool: "KBkit", filename: "kbkit_report.html",
      sections: [{ title: "Summary", html: `<p><b>${$("#kb-headline").innerText}</b></p><p>${$("#kb-story").innerHTML}</p>` },
        { title: "Results", html: $$("#kb-views table").map(t => t.outerHTML).join("") }, { title: "Figures", svgs },
        { title: "Methods", html: "<p>Running KB integrals with the Ganguly–van der Vegt finite-size correction (JCTC 2013) and Krüger–Vlugt finite-volume extrapolation (JPCL 2013); thermodynamic relations after Ben-Naim (2006).</p>" }] });
    A.steps($("#kb-steps"), 3); A.toast("Report downloaded");
  });
  S.onTheme(() => { if (st.res) render(); });
  setMode("single");
})();
