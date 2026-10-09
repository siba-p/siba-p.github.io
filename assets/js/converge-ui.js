(function () {
  "use strict";
  const C = window.CVG, S = window.SMC, A = window.APP, root = document.getElementById("cv");
  if (!C || !S || !A || !root) return;
  const $ = s => root.querySelector(s), $$ = s => Array.from(root.querySelectorAll(s));
  const st = { data: null, reps: [], dets: [], sel: 0, manual: {}, method: "chodera" };
  const ci = () => parseFloat($("#cv-ci").value);
  const ciLabel = () => ({ "1": "68%", "1.96": "95%", "2.576": "99%" })[$("#cv-ci").value];
  const tu = () => $("#cv-tu").value || "time";
  const f = (v, d) => S.fmt(v, d == null ? 4 : d);
  const showTab = A.tabs($("#cv-tabs"), () => renderCharts());
  $("#cv-tu").value = A.prefs.get("cv-tu", "ps");
  $("#cv-ci").value = A.prefs.get("cv-ci", "1.96");

  /* ---------- scoring & language ---------- */
  function score(r) {
    let s = 100;
    if (Math.abs(r.driftZ) > 3) s -= 45; else if (Math.abs(r.trendZ) > 4) s -= 20; else if (Math.abs(r.driftZ) > 2) s -= 8;
    if (r.neff < 100) s -= 30 * (1 - r.neff / 100);
    if (r.semBlocking > 1.5 * r.sem) s -= 15;
    if (r.t0 > 0.4 * r.n) s -= 12;
    return Math.max(0, Math.min(100, s));
  }
  function story(r) {
    const t = st.data.t, disc = t[r.t0] - t[0], prodT = (r.n - r.t0) * r.dt, half = r.lengthFor(r.semBest / 2);
    const parts = [];
    parts.push(`The first <b>${f(disc, 1)} ${tu()}</b> (${r.t0 / r.n < 0.01 ? "under 1" : (100 * r.t0 / r.n).toFixed(0)}% of the run) ${r.method === "manual" ? "were discarded by hand" : "were discarded as equilibration"}.`);
    parts.push(`Frames are correlated over <b>τ<sub>int</sub> ≈ ${f(r.tau, 2)} ${tu()}</b>, so the ${(r.n - r.t0).toLocaleString()} production frames hold about <b>${Math.round(r.neff).toLocaleString()} independent samples</b>.`);
    if (Math.abs(r.driftZ) > 3) parts.push(`The second half of the run differs from the first by <b>${Math.abs(r.driftZ).toFixed(1)}σ</b>: the average still depends on when you stop, so <b>extend the simulation</b> rather than trusting this number.`);
    else if (Math.abs(r.trendZ) > 4) parts.push(`There is a slow linear trend (${Math.abs(r.trendZ).toFixed(1)}σ). Check whether the system is still relaxing.`);
    else parts.push(`No drift was detected (half-vs-half ${Math.abs(r.driftZ).toFixed(1)}σ).`);
    if (r.neff < 50) parts.push(`With so few independent samples the error bar itself is uncertain; aim for at least 50–100.`);
    parts.push(`To halve the error bar, run about <b>4× longer</b> (≈ ${f(half, 0)} ${tu()} of production).`);
    return parts.join(" ");
  }

  /* ---------- data ---------- */
  async function loadText(text, name) {
    let d;
    try { d = C.parseXvg(text); } catch (e) { A.toast("Could not read that file: " + e.message); return; }
    d.file = name;
    st.data = d; st.manual = {}; st.dets = []; st.reps = [];
    const dt = d.t.length > 1 ? d.t[1] - d.t[0] : 1;
    $("#cv-file").hidden = false;
    $("#cv-file").innerHTML = `<div class="slot ok"><b>${A.esc(name)}</b><small>${d.t.length.toLocaleString()} frames · ${d.cols.length} quantit${d.cols.length > 1 ? "ies" : "y"} · Δt = ${f(dt, 3)}</small><label>Replace<input type="file" accept=".xvg,.dat,.txt,.csv"></label></div>`;
    A.bindDrop($("#cv-file .slot"), files => files[0].text().then(t => loadText(t, files[0].name)));
    d.cols.forEach((c, i) => {
      try { const r = C.analyze(c, d.names[i], dt); st.dets[i] = { det: r.det, t0Mser: r.t0Mser }; st.reps[i] = r; }
      catch (e) { st.reps[i] = null; }
    });
    st.sel = Math.max(0, st.reps.findIndex(Boolean));
    $("#cv-empty").hidden = true; $("#cv-res").hidden = false;
    $("#cv-report").disabled = false; $("#cv-copy").disabled = false;
    A.steps($("#cv-steps"), 2);
    renderAll();
    A.toast(`Analysed ${d.cols.length} quantit${d.cols.length > 1 ? "ies" : "y"}`);
  }
  function reanalyse(i) {
    const d = st.data, dt = d.t.length > 1 ? d.t[1] - d.t[0] : 1, m = st.method;
    const opts = Object.assign({ method: m === "manual" && st.manual[i] == null ? "chodera" : m, t0: st.manual[i] }, st.dets[i]);
    st.reps[i] = C.analyze(d.cols[i], d.names[i], dt, opts);
  }

  /* ---------- rendering ---------- */
  function renderAll() { renderList(); renderInsight(); renderTable(); renderCharts(); }
  function spark(x) {
    const n = x.length, step = Math.max(1, Math.floor(n / 60)), pts = [];
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i += step) { lo = Math.min(lo, x[i]); hi = Math.max(hi, x[i]); }
    for (let i = 0; i < n; i += step) pts.push(`${(i / n * 80).toFixed(1)},${(20 - (x[i] - lo) / (hi - lo || 1) * 18).toFixed(1)}`);
    return `<svg viewBox="0 0 80 22" width="80" height="22" aria-hidden="true"><polyline points="${pts.join(" ")}" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`;
  }
  function renderList() {
    $("#cv-qlist").innerHTML = st.reps.map((r, i) => {
      if (!r) return `<div class="slot"><b>${A.esc(st.data.names[i])}</b><small>too few samples</small></div>`;
      const lv = A.level(score(r));
      return `<button type="button" class="qrow${i === st.sel ? " on" : ""}" data-i="${i}"><span class="dot-st ${lv}"></span><span class="qn"><b>${A.esc(r.name)}</b><small>${f(r.mean)} ± ${f(ci() * r.semBest, 3)}</small></span><span class="qs">${spark(st.data.cols[i])}</span></button>`;
    }).join("");
    $$("#cv-qlist .qrow").forEach(b => b.addEventListener("click", () => { st.sel = +b.dataset.i; A.steps($("#cv-steps"), 2); renderAll(); }));
    $("#cv-nq").textContent = st.reps.length;
  }
  function renderInsight() {
    const r = st.reps[st.sel]; if (!r) return;
    const sc = score(r), lv = A.gauge($("#cv-gauge"), sc, "convergence score");
    $("#cv-insight").className = "panel2 insight " + lv;
    const verdict = r.verdict === "converged" && sc >= 80 ? "is converged" : r.verdict === "not converged" ? "is not converged" : "needs care";
    $("#cv-headline").innerHTML = `${A.esc(r.name)} ${verdict}: ${f(r.mean)} ± ${f(ci() * r.semBest, 3)} <small class="muted" style="font-size:.6em;font-weight:500">(${ciLabel()} CI)</small>`;
    $("#cv-story").innerHTML = story(r);
    const target = parseFloat($("#cv-target").value);
    const k = [["Mean", f(r.mean)], [`± ${ciLabel()} CI`, f(ci() * r.semBest, 4)], ["Discarded", `${f(st.data.t[r.t0] - st.data.t[0], 1)} ${tu()}`], ["τ<sub>int</sub>", `${f(r.tau, 2)} ${tu()}`], ["Independent samples", Math.round(r.neff).toLocaleString()], ["Drift (half vs half)", `${r.driftZ.toFixed(1)} σ`]];
    if (target > 0) k.push(["Run length for target", `${f(r.lengthFor(target), 0)} ${tu()}`]);
    $("#cv-kpis").innerHTML = k.map(([a, b]) => `<div class="kpi"><small>${a}</small><b>${b}</b></div>`).join("");
    $("#cv-target-u").textContent = r.name.length < 14 ? r.name : "units";
  }
  function renderTable() {
    const target = parseFloat($("#cv-target").value);
    $("#cv-need-h").hidden = !(target > 0);
    $("#cv-table tbody").innerHTML = st.reps.map((r, i) => {
      if (!r) return "";
      const sc = score(r), lv = A.level(sc);
      return `<tr data-i="${i}" class="${i === st.sel ? "hl" : ""}" style="cursor:pointer"><td><b>${A.esc(r.name)}</b></td><td>${f(r.mean)}</td><td>${f(ci() * r.semBest, 3)}</td><td>${f(st.data.t[r.t0] - st.data.t[0], 1)}</td><td>${f(r.tau, 2)}</td><td>${Math.round(r.neff).toLocaleString()}</td><td>${Math.round(sc)}</td><td><span class="dot-st ${lv}"></span> ${r.verdict}</td>${target > 0 ? `<td>${f(r.lengthFor(target), 0)}</td>` : "<td hidden></td>"}</tr>`;
    }).join("");
    $$("#cv-table tbody tr").forEach(tr => tr.addEventListener("click", () => { st.sel = +tr.dataset.i; renderAll(); showTab("v-series"); }));
  }

  function renderCharts() {
    const r = st.reps[st.sel]; if (!r) return;
    const t = st.data.t, x = st.data.cols[st.sel], tk = S.tokens();
    const view = $$("#cv-tabs [data-view]").find(b => b.getAttribute("aria-selected") === "true").dataset.view;
    if (view === "v-series") { drawSeries(r, t, x, tk); drawHist(r, x); }
    if (view === "v-equil") drawEquil(r, t);
    if (view === "v-err") { drawBlock(r); drawProj(r); }
    if (view === "v-acf") drawAcf(r);
  }
  function decimate(t, x) {
    const step = Math.max(1, Math.floor(x.length / 1600)), xs = [], ys = [];
    for (let i = 0; i < x.length; i += step) {
      let lo = Infinity, hi = -Infinity, ilo = i, ihi = i;
      for (let j = i; j < Math.min(x.length, i + step); j++) { if (x[j] < lo) { lo = x[j]; ilo = j; } if (x[j] > hi) { hi = x[j]; ihi = j; } }
      if (ilo <= ihi) { xs.push(t[ilo], t[ihi]); ys.push(lo, hi); } else { xs.push(t[ihi], t[ilo]); ys.push(hi, lo); }
    }
    return [xs, ys];
  }
  function drawSeries(r, t, x, tk) {
    const host = $("#c-series"), [xs, ys] = decimate(t, x);
    let lo = Infinity, hi = -Infinity; for (const v of ys) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const pad = (hi - lo) * 0.06 || 1, span = hi - lo, yd = span > 50 ? 0 : span > 5 ? 1 : span > 0.5 ? 2 : 3;
    const fr = S.frame(host, { x0: t[0], x1: t[t.length - 1], y0: lo - pad, y1: hi + pad, xLabel: `time (${tu()})`, yLabel: r.name, yFmt: v => v.toFixed(yd), xd: 0, label: `${r.name} over time`, height: 280 });
    const cutX = fr.x(t[r.t0]);
    const shade = S.el("rect", { x: fr.x(t[0]), y: fr.m.t, width: Math.max(0, cutX - fr.x(t[0])), height: fr.H - fr.m.t - fr.m.b, fill: tk.neutral, "fill-opacity": 0.22 }, fr.svg);
    S.line(fr, xs, ys, { stroke: tk.series, "stroke-width": 0.9, "stroke-opacity": 0.75 });
    // running average of the production part
    const rx = [], ry = []; let s = 0;
    const stp = Math.max(1, Math.floor((x.length - r.t0) / 400));
    for (let i = r.t0; i < x.length; i++) { s += x[i]; if ((i - r.t0) % stp === 0 || i === x.length - 1) { rx.push(t[i]); ry.push(s / (i - r.t0 + 1)); } }
    const w = ci() * r.semBest;
    S.band(fr, [t[r.t0], t[t.length - 1]], [r.mean - w, r.mean - w], [r.mean + w, r.mean + w], tk.series2, 0.22);
    S.el("line", { x1: cutX, x2: fr.x(t[t.length - 1]), y1: fr.y(r.mean), y2: fr.y(r.mean), stroke: tk.series2, "stroke-width": 2 }, fr.svg);
    S.line(fr, rx, ry, { stroke: tk.ink, "stroke-width": 1.4 });
    // draggable cut
    const g = S.el("g", { class: "cut", style: "cursor:ew-resize" }, fr.svg);
    const ln = S.el("line", { x1: cutX, x2: cutX, y1: fr.m.t, y2: fr.H - fr.m.b, stroke: tk.ink, "stroke-width": 1.5, "stroke-dasharray": "5 4" }, g);
    const knob = S.el("rect", { x: cutX - 7, y: fr.m.t + 4, width: 14, height: 22, rx: 4, fill: tk.surface, stroke: tk.ink, "stroke-width": 1.2 }, g);
    const hit = S.el("rect", { x: cutX - 10, y: fr.m.t, width: 20, height: fr.H - fr.m.t - fr.m.b, fill: "transparent" }, g);
    let drag = false;
    const toIdx = px => { const tv = fr.o.x0 + (px - fr.m.l) / (fr.W - fr.m.l - fr.m.r) * (fr.o.x1 - fr.o.x0); let k = 0; while (k < t.length - 1 && t[k] < tv) k++; return Math.max(0, Math.min(x.length - 60, k)); };
    hit.addEventListener("pointerdown", e => { drag = true; hit.setPointerCapture(e.pointerId); });
    hit.addEventListener("pointermove", e => {
      if (!drag) return;
      const p = S.svgPoint(fr, e), X = Math.max(fr.m.l, Math.min(fr.W - fr.m.r, p.x));
      ln.setAttribute("x1", X); ln.setAttribute("x2", X); knob.setAttribute("x", X - 7); hit.setAttribute("x", X - 10); shade.setAttribute("width", Math.max(0, X - fr.x(t[0])));
    });
    hit.addEventListener("pointerup", e => {
      if (!drag) return; drag = false;
      st.manual[st.sel] = toIdx(S.svgPoint(fr, e).x);
      setMethod("manual");
    });
    S.crosshair(fr, xs, i => `<b>${f(xs[i], 1)} ${tu()}</b><br>${A.esc(r.name)} = ${f(ys[i])}${xs[i] < t[r.t0] ? "<br><i>discarded</i>" : ""}`, i => ys[i]);
    fr.svg.appendChild(g);
    S.legend(fr, [{ label: "data", color: tk.series }, { label: "running average", color: tk.ink }, { label: `mean ± ${ciLabel()} CI`, color: tk.series2 }, { label: "discarded", color: tk.neutral }, { label: "cut (drag in Manual)", color: tk.ink, dash: true }]);
    A.chartTools(host, `${r.name}_timeseries`);
  }
  function drawHist(r, x) {
    const host = $("#c-hist"), prod = x.slice(r.t0), nb = 32;
    let lo = Infinity, hi = -Infinity; for (const v of prod) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const w = (hi - lo) / nb || 1, h = new Array(nb).fill(0);
    prod.forEach(v => { h[Math.min(nb - 1, Math.floor((v - lo) / w))]++; });
    const mx = Math.max(...h), tk = S.tokens(), span = hi - lo, yd = span > 50 ? 0 : span > 5 ? 1 : 2;
    const fr = S.frame(host, { x0: lo, x1: hi, y0: 0, y1: mx * 1.1 / prod.length, xLabel: r.name, yLabel: "fraction of frames", yd: 2, xFmt: v => v.toFixed(yd), xTicks: [lo + span * 0.1, lo + span * 0.3, lo + span * 0.5, lo + span * 0.7, lo + span * 0.9], label: "Distribution", height: 300 });
    h.forEach((c, i) => { const x0 = fr.x(lo + i * w) + 1, x1 = fr.x(lo + (i + 1) * w) - 1, y = fr.y(c / prod.length); S.el("rect", { x: x0, y, width: Math.max(1, x1 - x0), height: fr.y(0) - y, fill: tk.series, "fill-opacity": 0.75, rx: 1.5 }, fr.svg); });
    S.el("line", { x1: fr.x(r.mean), x2: fr.x(r.mean), y1: fr.m.t, y2: fr.H - fr.m.b, stroke: tk.series2, "stroke-width": 2 }, fr.svg);
    A.chartTools(host, `${r.name}_distribution`);
  }
  function drawEquil(r, t) {
    const host = $("#c-equil"), tk = S.tokens(), cx = r.curve.t0.map(i => t[i] - t[0]), cy = r.curve.neff;
    const fr = S.frame(host, { x0: 0, x1: Math.max(...cx), y0: 0, y1: Math.max(...cy) * 1.1, xLabel: `samples discarded from the start, t₀ (${tu()})`, yLabel: "independent samples left", yd: 0, label: "Independent samples vs equilibration cut", height: 280 });
    S.band(fr, cx, cx.map(() => 0), cy, tk.series, 0.1);
    S.line(fr, cx, cy, { stroke: tk.series });
    const mark = (ti, color, dash, lab) => { const X = fr.x(t[ti] - t[0]); S.el("line", { x1: X, x2: X, y1: fr.m.t, y2: fr.H - fr.m.b, stroke: color, "stroke-width": 1.5, "stroke-dasharray": dash }, fr.svg); S.el("text", { x: X + 5, y: fr.m.t + 12, class: "lbl" }, fr.svg).textContent = lab; };
    mark(r.t0Auto, tk.series2, "", "Chodera max");
    mark(r.t0Mser, tk.ink2, "2 3", "MSER-5");
    if (r.t0 !== r.t0Auto && r.t0 !== r.t0Mser) mark(r.t0, tk.ink, "5 4", "your cut");
    S.crosshair(fr, cx, i => `<b>discard ${f(cx[i], 1)} ${tu()}</b><br>${Math.round(cy[i]).toLocaleString()} independent samples left`, i => cy[i]);
    A.chartTools(host, `${r.name}_equilibration`);
  }
  function drawBlock(r) {
    const host = $("#c-block"), b = r.blocking, tk = S.tokens(), lx = b.sizes.map(s => Math.log2(s));
    const top = Math.max(...b.sems.map((s, i) => s + b.errs[i])) * 1.12;
    const fr = S.frame(host, { x0: -0.4, x1: lx[lx.length - 1] + 0.4, y0: 0, y1: top, xLabel: "block size (frames)", yLabel: "standard error", yd: 3, xTicks: lx.filter((_, i) => i % Math.ceil(lx.length / 7) === 0), xFmt: v => (2 ** v).toLocaleString(), label: "Block averaging", height: 250 });
    S.hline(fr, b.semPlateau, { stroke: tk.series2, "stroke-dasharray": "5 4" });
    S.line(fr, lx, b.sems, { stroke: tk.series, "stroke-width": 1.4, "stroke-opacity": 0.6 });
    lx.forEach((v, i) => {
      S.el("line", { x1: fr.x(v), x2: fr.x(v), y1: fr.y(Math.max(0, b.sems[i] - b.errs[i])), y2: fr.y(b.sems[i] + b.errs[i]), stroke: tk.series, "stroke-width": 1.5 }, fr.svg);
      S.el("circle", { cx: fr.x(v), cy: fr.y(b.sems[i]), r: i === b.idx ? 6 : 4.5, fill: i === b.idx ? tk.series2 : tk.series, stroke: tk.surface, "stroke-width": 2 }, fr.svg);
    });
    S.el("text", { x: fr.W - fr.m.r - 4, y: fr.y(b.semPlateau) - 6, "text-anchor": "end", class: "lbl" }, fr.svg).textContent = "plateau";
    S.crosshair(fr, lx, i => `<b>blocks of ${b.sizes[i].toLocaleString()} frames</b><br>SEM ${f(b.sems[i])} ± ${f(b.errs[i])}`, i => b.sems[i]);
    A.chartTools(host, `${r.name}_blocking`);
  }
  function drawProj(r) {
    const host = $("#c-proj"), tk = S.tokens(), T0 = (r.n - r.t0) * r.dt, target = parseFloat($("#cv-target").value);
    const need = target > 0 ? r.lengthFor(target) : null, Tmax = Math.max(4 * T0, need ? need * 1.25 : 0);
    const xs = Array.from({ length: 120 }, (_, i) => T0 * 0.2 + (Tmax - T0 * 0.2) * i / 119), ys = xs.map(T => ci() * r.semBest * Math.sqrt(T0 / T));
    const fr = S.frame(host, { x0: 0, x1: Tmax, y0: 0, y1: Math.max(...ys) * 1.05, xLabel: `production length (${tu()})`, yLabel: `± ${ciLabel()} CI`, yd: 3, xd: 0, label: "Error bar vs run length", height: 250 });
    S.line(fr, xs, ys, { stroke: tk.series });
    S.el("circle", { cx: fr.x(T0), cy: fr.y(ci() * r.semBest), r: 6, fill: tk.series2, stroke: tk.surface, "stroke-width": 2 }, fr.svg);
    S.el("text", { x: fr.x(T0) + 9, y: fr.y(ci() * r.semBest) - 8, class: "lbl" }, fr.svg).textContent = "your run";
    if (need) {
      S.hline(fr, ci() * target, { stroke: tk.ink2, "stroke-dasharray": "4 4" });
      S.el("circle", { cx: fr.x(need), cy: fr.y(ci() * target), r: 6, fill: "#0ca30c", stroke: tk.surface, "stroke-width": 2 }, fr.svg);
      S.el("text", { x: fr.x(need) - 8, y: fr.y(ci() * target) - 9, "text-anchor": "end", class: "lbl" }, fr.svg).textContent = `target reached at ${f(need, 0)}`;
    }
    S.crosshair(fr, xs, i => `<b>${f(xs[i], 0)} ${tu()}</b><br>± ${f(ys[i], 4)}`, i => ys[i]);
    A.chartTools(host, `${r.name}_projection`);
  }
  function drawAcf(r) {
    const host = $("#c-acf"), tk = S.tokens();
    const win = Math.max(10, Math.min(r.acf.length - 1, Math.round(r.tau / r.dt * 12))), ax = [], ay = [];
    for (let i = 0; i <= win; i++) { ax.push(i * r.dt); ay.push(r.acf[i]); }
    const fr = S.frame(host, { x0: 0, x1: ax[ax.length - 1], y0: Math.min(-0.1, ...ay), y1: 1.05, xLabel: `lag (${tu()})`, yLabel: "ρ(lag)", yd: 1, label: "Autocorrelation", height: 270 });
    S.band(fr, ax, ax.map(() => 0), ay.map(v => Math.max(0, v)), tk.series, 0.12);
    S.hline(fr, 0, { stroke: tk.ink3, "stroke-width": 1 });
    const sok = Math.min(ax[ax.length - 1], 5 * r.tau);
    S.el("line", { x1: fr.x(sok), x2: fr.x(sok), y1: fr.m.t, y2: fr.H - fr.m.b, stroke: tk.series2, "stroke-dasharray": "5 4" }, fr.svg);
    S.el("text", { x: fr.x(sok) + 6, y: fr.m.t + 12, class: "lbl" }, fr.svg).textContent = `Sokal window · τ_int = ${f(r.tau, 2)} ${tu()}`;
    S.line(fr, ax, ay, { stroke: tk.series });
    S.crosshair(fr, ax, i => `<b>lag ${f(ax[i], 2)} ${tu()}</b><br>ρ = ${f(ay[i], 3)}`, i => ay[i]);
    A.chartTools(host, `${r.name}_autocorrelation`);
  }

  /* ---------- controls ---------- */
  function setMethod(m) {
    st.method = m;
    $$('#cv-method input').forEach(i => { i.checked = i.value === m; });
    if (!st.data) return;
    st.reps.forEach((r, i) => { if (r) reanalyse(i); });
    A.steps($("#cv-steps"), 2);
    renderAll();
    if (m === "manual" && st.manual[st.sel] == null) A.toast("Drag the dashed line on the time-series chart to set the cut");
  }
  $$('#cv-method input').forEach(i => i.addEventListener("change", () => setMethod(i.value)));
  ["#cv-ci", "#cv-target", "#cv-tu"].forEach(s => $(s).addEventListener("input", () => { A.prefs.set("cv-ci", $("#cv-ci").value); A.prefs.set("cv-tu", $("#cv-tu").value); if (st.data) renderAll(); }));
  A.bindDrop($("#cv-drop"), files => files[0].text().then(t => loadText(t, files[0].name)));

  /* ---------- examples ---------- */
  function xvg(names, t, cols, title) {
    return `# ${title}\n` + names.map((n, i) => `@ s${i} legend "${n}"`).join("\n") + "\n" + t.map((v, i) => [v.toFixed(2), ...cols.map(c => c[i].toFixed(5))].join(" ")).join("\n");
  }
  function ar(R, n, phi, sig) { const x = new Float64Array(n); x[0] = R.n() * sig / Math.sqrt(1 - phi * phi); for (let i = 1; i < n; i++) x[i] = phi * x[i - 1] + sig * R.n(); return x; }
  $$("[data-sample]").forEach(b => b.addEventListener("click", async () => {
    const k = b.dataset.sample;
    if (k === "npt") { const res = await fetch(root.dataset.demo); loadText(await res.text(), "npt_energy.xvg (example)"); return; }
    const R = A.rng(k === "drift" ? 21 : 33), n = k === "drift" ? 8000 : 6000, t = Array.from({ length: n }, (_, i) => i * (k === "drift" ? 5 : 2));
    if (k === "drift") {
      const pot = ar(R, n, 0.9, 40).map((v, i) => -152300 + v - 0.11 * i - 900 * Math.exp(-i / 300));
      const temp = ar(R, n, 0.3, 1.6).map(v => 300 + v);
      loadText(xvg(["Potential", "Temperature"], t, [pot, temp], "example: drifting potential energy"), "drifting_run.xvg (example)");
    } else {
      const op = ar(R, n, 0.996, 0.004).map((v, i) => 0.62 + v + 0.18 * Math.exp(-i / 900));
      loadText(xvg(["Order parameter"], t, [op], "example: slowly relaxing order parameter"), "slow_relaxation.xvg (example)");
    }
  }));

  /* ---------- export ---------- */
  function summaryText(r) {
    return `${r.name}: ${f(r.mean)} ± ${f(ci() * r.semBest, 4)} (${ciLabel()} CI; SEM ${f(r.semBest, 4)}), from ${Math.round(r.neff)} independent samples after discarding the first ${f(st.data.t[r.t0] - st.data.t[0], 1)} ${tu()} (${r.method === "manual" ? "manual cut" : r.method === "mser" ? "MSER-5" : "Chodera's method"}). Autocorrelation time ${f(r.tau, 3)} ${tu()}; half-vs-half drift ${r.driftZ.toFixed(2)} sigma; verdict: ${r.verdict}. Analysed with Converge (https://siba-p.github.io/converge/).`;
  }
  $("#cv-copy").addEventListener("click", () => { const r = st.reps[st.sel]; if (r) A.copy(summaryText(r), "Summary copied"); });
  $("#cv-report").addEventListener("click", () => {
    const r = st.reps[st.sel]; if (!r) return;
    const prev = $$("#cv-tabs [data-view]").find(b => b.getAttribute("aria-selected") === "true").dataset.view;
    const svgs = [];
    ["v-series", "v-equil", "v-err", "v-acf"].forEach(v => { showTab(v); root.querySelectorAll(`#${v} svg:not(.gauge)`).forEach(s => svgs.push(s)); });
    const clones = svgs.map(s => s.cloneNode(true));
    showTab(prev);
    const tbl = `<table><tr><th>Quantity</th><th>Mean</th><th>± ${ciLabel()} CI</th><th>Discarded (${tu()})</th><th>τ_int (${tu()})</th><th>Indep. samples</th><th>Verdict</th></tr>${st.reps.filter(Boolean).map(q => `<tr><td>${A.esc(q.name)}</td><td>${f(q.mean)}</td><td>${f(ci() * q.semBest, 4)}</td><td>${f(st.data.t[q.t0] - st.data.t[0], 1)}</td><td>${f(q.tau, 3)}</td><td>${Math.round(q.neff)}</td><td>${q.verdict}</td></tr>`).join("")}</table>`;
    A.report({ title: `Convergence report: ${r.name}`, subtitle: A.esc(st.data.file), tool: "Converge", filename: `converge_${r.name.replace(/\W+/g, "_")}.html`,
      sections: [{ title: "Summary", html: `<p><b>${A.esc($("#cv-headline").textContent)}</b></p><p>${$("#cv-story").innerHTML}</p>${$("#cv-kpis").innerText.split("\n").reduce((a, v, i, arr) => i % 2 ? a : a + `<span class="kpi">${v}: <b>${arr[i + 1] || ""}</b></span>`, "")}` },
        { title: "Figures", svgs: clones }, { title: "All quantities", html: tbl },
        { title: "Methods", html: "<p>Equilibration by maximising the number of uncorrelated samples (Chodera, JCTC 2016), cross-checked with MSER-5; integrated autocorrelation time with Sokal's automatic window; Flyvbjerg–Petersen block averaging; reported SEM is the larger of the autocorrelation and block-averaging estimates.</p>" }] });
    A.steps($("#cv-steps"), 3); A.toast("Report downloaded");
  });
  S.onTheme(() => { if (st.data) renderAll(); });
})();
