(function () {
  "use strict";
  const W = window.WW, S = window.SMC, A = window.APP, root = document.getElementById("ww");
  if (!W || !S || !A || !root) return;
  const $ = s => root.querySelector(s), $$ = s => Array.from(root.querySelectorAll(s));
  const num = id => { const v = parseFloat($(id).value); return Number.isFinite(v) ? v : null; };
  const f = (v, d) => S.fmt(v, d == null ? 3 : d);
  const RAMP_L = ["#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281"];
  const RAMP_D = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6"];
  const ramp = (t) => { const r = S.tokens().dark ? RAMP_D : RAMP_L; return r[Math.max(0, Math.min(r.length - 1, Math.round(t * (r.length - 1))))]; };
  const ST = { warning: "#e09a00", critical: "#d03b3b", good: "#0ca30c", gp: "#8b5cf6" };
  let mode = "plan";
  const st = { windows: [], raw: [], meta: null, truth: null, res: null };

  /* =================== mode =================== */
  function setMode(m) {
    mode = m;
    $$(".app-mode").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === m));
    $$("[data-show]").forEach(el => { el.hidden = el.dataset.show !== m; });
    $("#ww-go").textContent = m === "plan" ? "Update plan" : "Run analysis";
    const has = m === "plan" || !!st.res;
    ["#ww-report", "#ww-csv", "#ww-copy"].forEach(b => { $(b).disabled = !has; });
    A.steps($("#ww-steps"), m === "plan" ? 1 : st.res ? 2 : 0);
    if (m === "plan") renderPlan(); else if (st.res) renderResults();
  }
  $$(".app-mode").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
  $("#ww-go").addEventListener("click", () => (mode === "plan" ? renderPlan() : run()));

  /* =================== PLAN =================== */
  function readPlan() {
    const m = root.querySelector('#p-mode input:checked').value;
    return { xmin: num("#p-xmin"), xmax: num("#p-xmax"), T: num("#p-T"), unit: $("#p-unit").value, overlap: num("#p-ov") / 100, mode: m,
      slope: num("#p-slope"), kMin: num("#p-kmin") || 0, k: num("#p-k"), spacing: num("#p-sp"), lu: $("#p-lu").value || "nm", geom: $("#p-geom").value,
      ns: num("#p-ns") || 0, speed: num("#p-speed") || 0 };
  }
  let plan = null;
  function renderPlan() {
    const o = readPlan();
    $("#p-ov-o").textContent = `${Math.round(o.overlap * 100)}%`;
    $$("[data-pm]").forEach(el => { el.hidden = el.dataset.pm !== o.mode; });
    $$(".lu").forEach(e => { e.textContent = o.lu; }); $$(".eu2").forEach(e => { e.textContent = `${o.unit}/${o.lu}²`; });
    if (!(o.xmax > o.xmin) || !(o.T > 0)) return;
    if (o.mode === "auto" && !(o.slope > 0) && !(o.kMin > 0)) return;
    if (o.mode === "k" && !(o.k > 0)) return;
    if (o.mode === "spacing" && !(o.spacing > 0)) return;
    const p = W.plan(o); plan = { p, o };
    const totalNs = p.n * o.ns, days = o.speed > 0 ? totalNs / o.speed : null;
    $("#p-gauge").innerHTML = `<div class="bignum"><b>${p.n}</b><span>windows</span></div>`;
    $("#p-headline").innerHTML = `k = ${Math.round(p.k).toLocaleString()} ${o.unit}/${o.lu}² · spacing ${f(p.spacing, 4)} ${o.lu}`;
    let story = `Each window samples a width σ = <b>${f(p.sigma, 4)} ${o.lu}</b>, and neighbours overlap by <b>${(p.overlap * 100).toFixed(1)}%</b>. `;
    if (o.mode === "auto" && o.slope > 0) story += p.k > o.kMin ? `The steepest slope you expect (${f(o.slope, 0)} ${o.unit}/${o.lu}) would push a window <b>${f(p.shift, 4)} ${o.lu}</b> off its centre, ${(p.shift / p.spacing * 100).toFixed(0)}% of a spacing, so steep walls stay covered. ` : `Your minimum force constant already keeps slope-induced drift small (${f(p.shift, 4)} ${o.lu}). `;
    if (o.ns > 0) story += `At ${o.ns} ns per window the campaign costs <b>${f(totalNs, 0)} ns</b>${days ? `: about <b>${days >= 1 ? f(days, 1) + " days" : f(days * 24, 1) + " hours"}</b> run one after another, or ${f(o.ns / o.speed * 24, 1)} hours with all windows in parallel` : ""}.`;
    $("#p-story").innerHTML = story;
    $("#p-kpis").innerHTML = [["Force constant", `${Math.round(p.k).toLocaleString()}`], ["Spacing", `${f(p.spacing, 4)} ${o.lu}`], ["Window width σ", `${f(p.sigma, 4)} ${o.lu}`], ["Overlap", `${(p.overlap * 100).toFixed(1)}%`], ["Max drift", o.mode === "auto" && o.slope ? `${f(p.shift, 4)} ${o.lu}` : "–"], ["Total sampling", `${f(totalNs, 0)} ns`]]
      .map(([a, b]) => `<div class="kpi"><small>${a}</small><b>${b}</b></div>`).join("");
    drawLayout(p, o);
    $("#p-table").innerHTML = `<thead><tr><th>#</th><th>pull-coord1-init (${o.lu})</th><th>pull-coord1-k</th><th>σ (${o.lu})</th><th>Drift at steepest slope</th></tr></thead><tbody>${p.centers.map((c, i) => `<tr><td>${String(i).padStart(2, "0")}</td><td>${c.toFixed(4)}</td><td>${Math.round(p.k)}</td><td>${f(p.sigma, 4)}</td><td>${o.slope ? f(p.shift, 4) : "–"}</td></tr>`).join("")}</tbody>`;
    $("#p-mdp").textContent = W.mdpSnippet(p.centers, p.centers.map(() => p.k), { geometry: o.geom });
    $("#p-sh").textContent = ["#!/usr/bin/env bash", "# WindowWise: write one .mdp per umbrella window from umbrella_template.mdp,", "# which must contain the placeholders XINIT and KVAL.", "set -euo pipefail",
      `centers=(${p.centers.map(c => c.toFixed(4)).join(" ")})`, `k=${Math.round(p.k)}`, 'for i in "${!centers[@]}"; do', '  n=$(printf "%02d" "$i")',
      '  sed -e "s/XINIT/${centers[$i]}/" -e "s/KVAL/${k}/" umbrella_template.mdp > "window_${n}.mdp"',
      '  echo "gmx grompp -f window_${n}.mdp -c conf_${n}.gro -p topol.top -n index.ndx -o umbrella_${n}.tpr"', "done"].join("\n");
    A.steps($("#ww-steps"), 1);
  }
  function drawLayout(p, o) {
    const host = $("#pc-layout"), tk = S.tokens(), pad = 3 * p.sigma;
    const x0 = o.xmin - pad, x1 = o.xmax + pad, xs = Array.from({ length: 500 }, (_, i) => x0 + (x1 - x0) * i / 499);
    const fr = S.frame(host, { x0, x1, y0: 0, y1: 1.14, xLabel: `ξ (${o.lu})`, yLabel: "relative probability", yd: 2, label: "Predicted window distributions", height: 290 });
    const mid = Math.floor(p.n / 2) - 1;
    if (mid >= 0 && mid + 1 < p.n) {
      const a = p.centers[mid], b = p.centers[mid + 1], ov = xs.map(x => Math.min(Math.exp(-0.5 * ((x - a) / p.sigma) ** 2), Math.exp(-0.5 * ((x - b) / p.sigma) ** 2)));
      S.band(fr, xs, xs.map(() => 0), ov, tk.series2, 0.35);
      const ox = fr.x((a + b) / 2), oy = fr.y(Math.exp(-0.5 * ((b - a) / 2 / p.sigma) ** 2));
      S.el("line", { x1: ox, x2: ox, y1: oy, y2: fr.y(1.06) + 4, stroke: tk.series2, "stroke-width": 1 }, fr.svg);
      S.el("text", { x: ox, y: fr.y(1.06), "text-anchor": "middle", class: "lbl" }, fr.svg).textContent = `neighbour overlap ${(p.overlap * 100).toFixed(0)}%`;
    }
    p.centers.forEach((c, i) => S.line(fr, xs, xs.map(x => Math.exp(-0.5 * ((x - c) / p.sigma) ** 2)), { stroke: ramp(i / Math.max(1, p.n - 1)), "stroke-width": 1.8 }));
    p.centers.forEach(c => S.el("line", { x1: fr.x(c), x2: fr.x(c), y1: fr.y(0), y2: fr.y(0) + 5, stroke: tk.ink2 }, fr.svg));
    S.crosshair(fr, p.centers, i => `<b>window ${String(i).padStart(2, "0")}</b><br>centre ${p.centers[i].toFixed(4)} ${o.lu}<br>k ${Math.round(p.k)}`, () => 1);
    A.chartTools(host, "windowwise_plan");
  }
  ["#p-xmin", "#p-xmax", "#p-lu", "#p-geom", "#p-T", "#p-unit", "#p-ov", "#p-slope", "#p-kmin", "#p-k", "#p-sp", "#p-ns", "#p-speed"].forEach(s => $(s).addEventListener("input", renderPlan));
  $$('#p-mode input').forEach(i => i.addEventListener("change", renderPlan));
  A.tabs($("#p-tabs"));

  /* =================== ANALYZE: data =================== */
  async function addFiles(list) {
    const files = Array.from(list), texts = await Promise.all(files.map(x => x.text()));
    files.forEach((fl, i) => { const m = W.parseMetadata(texts[i]); if (m) st.meta = m; else st.raw.push({ name: fl.name, text: texts[i] }); });
    st.truth = null; rebuild();
    A.toast(`${st.windows.length} windows loaded${st.meta ? " (centres and k from metadata)" : ""}`);
  }
  function rebuild() {
    const col = Math.max(0, Math.round(num("#a-col") || 1)), k0 = num("#a-k") || 1000, prev = new Map(st.windows.map(w => [w.name, w]));
    st.windows = st.raw.map(r => {
      const data = W.parseSeries(r.text, col), m = st.meta && st.meta.find(x => x.file === r.name), p = prev.get(r.name);
      let c = m ? m.center : p ? p.center : W.numberFromName(r.name);
      const guessed = !Number.isFinite(c);
      if (guessed) c = data.length ? +W.mean(data).toFixed(4) : 0;
      return { name: r.name, data, center: c, k: m ? m.k : p ? p.k : k0, guessed };
    }).filter(w => w.data.length > 1).sort((a, b) => a.center - b.center);
    renderFiles(); renderWinTable();
  }
  function renderFiles() {
    const n = st.windows.length;
    $("#a-files").innerHTML = n ? `<div class="slot ok"><b>${n} windows</b><small>${st.windows[0].center} … ${st.windows[n - 1].center} · ${st.windows.reduce((a, w) => a + w.data.length, 0).toLocaleString()} frames${st.meta ? " · metadata ✓" : ""}${st.windows.some(w => w.guessed) ? " · some centres guessed" : ""}</small><label>Clear<input type="button" hidden></label></div>` : "";
    const clr = $("#a-files label"); if (clr) clr.addEventListener("click", e => { e.preventDefault(); st.raw = []; st.windows = []; st.meta = null; st.res = null; renderFiles(); $("#a-res").hidden = true; $("#a-empty").hidden = false; setMode("analyze"); });
    $("#a-nwin").textContent = n || "";
  }
  A.bindDrop($("#a-drop"), addFiles);
  $("#a-names").addEventListener("click", () => { let c = 0; st.windows.forEach(w => { const v = W.numberFromName(w.name); if (Number.isFinite(v)) { w.center = v; w.guessed = false; c++; } }); st.windows.sort((a, b) => a.center - b.center); renderFiles(); renderWinTable(); A.toast(`Centres read from ${c} file names`); });
  $("#a-kall").addEventListener("click", () => { const k = num("#a-k"); st.windows.forEach(w => { w.k = k; }); renderWinTable(); A.toast(`k = ${k} applied to all windows`); });
  $("#a-col").addEventListener("change", rebuild);

  /* =================== examples =================== */
  const MORSE = x => 30 * ((1 - Math.exp(-3.5 * (x - 0.7))) ** 2 - 1);
  $$("[data-sample]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.sample, cs = [];
    const step = k === "clean" ? 0.04 : k === "sparse" ? 0.2 : 0.1, start = k === "clean" ? 0.6 : 0.5;
    for (let c = start; c <= 2.5 + 1e-9; c += step) { const r = +c.toFixed(2); if (k === "broken" && (r === 1.4 || r === 1.5)) continue; cs.push(r); }
    const kk = k === "broken" ? 1000 : k === "clean" ? 8000 : 3000;
    const ws = W.synthetic({ F: MORSE, centers: cs, k: kk, T: 300, unit: "kJ/mol", n: 3000, stride: 5, burn: 2000, seed: k === "clean" ? 3 : k === "sparse" ? 6 : 4 });
    st.raw = ws.map(w => ({ name: `pullx_${w.center.toFixed(2)}.xvg`, text: "# example\n" + Array.from(w.data, (v, i) => `${(i * 0.1).toFixed(1)} ${v.toFixed(5)}`).join("\n") }));
    st.meta = null; st.windows = [];
    $("#a-T").value = 300; $("#a-unit").value = "kJ/mol"; $("#a-k").value = kk; $("#a-col").value = 1; $("#a-lu").value = "nm";
    rebuild(); st.truth = MORSE; run();
  }));

  /* =================== ANALYZE: run =================== */
  function health(res) {
    let s = 100;
    res.flags.forEach(fl => { s -= fl.kind === "overlap" ? (fl.level === "critical" ? 30 : 12) : fl.kind === "drift" ? 8 : fl.kind === "samples" ? 5 : 30; });
    return Math.max(0, s);
  }
  function run() {
    if (st.windows.length < 2) { A.toast("Load at least two windows"); return; }
    const btn = $("#ww-go"); btn.innerHTML = '<span class="spin"></span> Analysing…'; btn.disabled = true;
    setTimeout(() => {
      try {
        const t0 = performance.now();
        const res = W.analyze({ windows: st.windows, T: num("#a-T"), unit: $("#a-unit").value, lunit: $("#a-lu").value || "nm", nbins: num("#a-bins") || 120, nboot: num("#a-boot") ?? 20, overlapMin: (num("#a-omin") || 10) / 100 });
        res.gp = null; res.picks = [];
        if ($("#a-gp").checked) { try { res.gp = W.gpPmf(res.windows); res.picks = res.gp ? W.suggestWindowsGP(res.windows, res.gp, 3) : []; } catch (e) { res.gp = null; } }
        res.ms = performance.now() - t0; res.truth = st.truth;
        res.E = $("#a-unit").value; res.L = $("#a-lu").value || "nm"; res.omin = (num("#a-omin") || 10) / 100;
        st.res = res;
        $("#a-empty").hidden = true; $("#a-res").hidden = false;
        setMode("analyze");
        A.toast(`Analysed ${res.windows.length} windows in ${(res.ms / 1000).toFixed(1)} s`);
      } catch (e) { A.toast("Analysis failed: " + e.message); }
      btn.textContent = "Run analysis"; btn.disabled = false;
    }, 30);
  }

  /* =================== ANALYZE: render =================== */
  function gpAligned(res) {
    if (!res.gp) return null;
    const pr = []; res.gp.x.forEach((x, i) => { const b = Math.floor((x - res.bins.lo) / res.bins.width); if (b >= 0 && b < res.bins.nbins && Number.isFinite(res.F[b])) pr.push(res.F[b] - res.gp.A[i]); });
    const off = pr.length ? pr.reduce((a, v) => a + v, 0) / pr.length : 0;
    const rms = pr.length ? Math.sqrt(pr.reduce((a, v) => a + (v - off) ** 2, 0) / pr.length) : NaN;
    return { off, rms };
  }
  function renderResults() {
    const res = st.res, E = res.E, L = res.L, sc = health(res), lv = A.gauge($("#a-gauge"), sc, "sampling health");
    $("#a-insight").className = "panel2 insight " + lv;
    const fin = Array.from(res.F).filter(Number.isFinite), range = Math.max(...fin) - Math.min(...fin);
    const errs = res.err ? Array.from(res.err).filter(Number.isFinite).sort((a, b) => a - b) : [], medErr = errs.length ? errs[errs.length >> 1] : NaN;
    const gaps = res.flags.filter(x => x.kind === "overlap").length, drifts = res.flags.filter(x => x.kind === "drift").length, samp = res.flags.filter(x => x.kind === "samples").length;
    const minOv = Math.min(...res.pairs.map(p => p.overlap)), ga = gpAligned(res);
    let head = res.flags.length === 0 ? "Healthy sampling: no gaps, no drifting windows" :
      [gaps ? `${gaps} gap${gaps > 1 ? "s" : ""}` : "", drifts ? `${drifts} soft spring${drifts > 1 ? "s" : ""}` : "", samp ? `${samp} under-sampled window${samp > 1 ? "s" : ""}` : ""].filter(Boolean).join(", ") + ` found`;
    if (res.suggestions.length) head += ` · ${res.suggestions.length} repair window${res.suggestions.length > 1 ? "s" : ""} proposed`;
    $("#a-headline").textContent = head;
    let story = `WHAM ${res.converged ? "converged" : "<b>did not converge</b>"} over ${res.windows.length} windows. The profile spans <b>${f(range, 1)} ${E}</b> with a median bootstrap error of <b>±${f(medErr, 2)} ${E}</b>. `;
    story += gaps ? `Somewhere the neighbouring windows barely overlap (minimum ${(minOv * 100).toFixed(1)}%), so the profile there is a guess. ` : `Every pair of neighbours overlaps by at least ${(minOv * 100).toFixed(0)}%. `;
    if (drifts) story += `${drifts} window${drifts > 1 ? "s" : ""} slid off ${drifts > 1 ? "their" : "its"} centre because the spring is too soft for the local slope. `;
    if (res.gp && gaps >= 2) story += `WHAM cannot bridge gaps between non-overlapping windows, but <b>GP umbrella integration needs only each window's mean force</b>, so it still gives a continuous profile with an honest uncertainty band (orange). `;
    if (ga && Number.isFinite(ga.rms)) story += `The Gaussian process, built only from window mean forces, reproduces the WHAM profile to <b>${f(ga.rms, 2)} ${E}</b> RMS${res.picks.length ? `, and active learning points to <b>ξ ≈ ${res.picks.map(p => p.target.toFixed(2)).join(", ")}</b> as the most informative next windows` : ""}. `;
    if (res.truth) { const pr = []; res.bins.centers.forEach((x, b) => { if (Number.isFinite(res.F[b])) pr.push(res.F[b] - res.truth(x)); }); const o = pr.reduce((a, v) => a + v, 0) / pr.length; story += `Against the exact profile of this example, WHAM's RMSE is <b>${f(Math.sqrt(pr.reduce((a, v) => a + (v - o) ** 2, 0) / pr.length), 2)} ${E}</b>.`; }
    $("#a-story").innerHTML = story;
    const neffs = res.windows.map(w => w.neff).sort((a, b) => a - b);
    $("#a-kpis").innerHTML = [["Windows", res.windows.length], ["ΔF range", `${f(range, 1)} ${E}`], ["Median error", `±${f(medErr, 2)}`], ["Min. overlap", `${(minOv * 100).toFixed(1)}%`], ["Median indep. samples", Math.round(neffs[neffs.length >> 1]).toLocaleString()], ["GP length scale", res.gp ? `${f(res.gp.ell, 3)} ${L}` : "off"]]
      .map(([a, b]) => `<div class="kpi"><small>${a}</small><b>${b}</b></div>`).join("");
    $("#a-nissues").textContent = res.flags.length || "✓"; $("#a-nissues").className = "cnt" + (res.flags.some(x => x.level === "critical") ? " critical" : res.flags.length ? " warning" : "");
    $("#a-nfix").textContent = res.suggestions.length + res.picks.length || "";
    A.steps($("#ww-steps"), 2);
    drawPmf(res); drawHist(res); drawOverlap(res); renderIssues(res); renderFix(res); renderWinTable();
  }
  function flagLines(fr, res) {
    res.flags.forEach(fl => { if (!Number.isFinite(fl.x) || fl.x < fr.o.x0 || fl.x > fr.o.x1) return; S.el("line", { x1: fr.x(fl.x), x2: fr.x(fl.x), y1: fr.m.t, y2: fr.H - fr.m.b, stroke: ST[fl.level], "stroke-dasharray": "2 3", opacity: .8 }, fr.svg); S.el("text", { x: fr.x(fl.x), y: fr.H - fr.m.b - 6, "text-anchor": "middle", class: "ww-flagtxt" }, fr.svg).textContent = fl.level === "critical" ? "✕" : "!"; });
  }
  function drawPmf(res) {
    const host = $("#ac-pmf"), tk = S.tokens(), xs = res.bins.centers, F = Array.from(res.F), ga = gpAligned(res);
    const vals = F.filter(Number.isFinite); let lo = Math.min(...vals), hi = Math.max(...vals);
    if (res.gp) res.gp.A.forEach((a, i) => { lo = Math.min(lo, a + ga.off - 2 * res.gp.Asd[i]); hi = Math.max(hi, a + ga.off + 2 * res.gp.Asd[i]); });
    const pad = (hi - lo) * 0.06 || 1;
    const fr = S.frame(host, { x0: res.bins.lo, x1: res.bins.hi, y0: lo - pad, y1: hi + pad, xLabel: `ξ (${res.L})`, yLabel: `free energy (${res.E})`, yd: 0, label: "Potential of mean force", height: 320 });
    flagLines(fr, res);
    if (res.gp) {
      S.band(fr, res.gp.x, res.gp.A.map((a, i) => a + ga.off - 1.96 * res.gp.Asd[i]), res.gp.A.map((a, i) => a + ga.off + 1.96 * res.gp.Asd[i]), tk.series2, 0.14);
      S.line(fr, res.gp.x, Array.from(res.gp.A, a => a + ga.off), { stroke: tk.series2, "stroke-dasharray": "7 4", "stroke-width": 2 });
    }
    if (res.err) { const ix = [], l = [], h = []; xs.forEach((x, b) => { if (Number.isFinite(F[b]) && Number.isFinite(res.err[b])) { ix.push(x); l.push(F[b] - res.err[b]); h.push(F[b] + res.err[b]); } }); if (ix.length) S.band(fr, ix, l, h, tk.series, 0.2); }
    if (res.truth) { const pr = []; xs.forEach((x, b) => { if (Number.isFinite(F[b])) pr.push(F[b] - res.truth(x)); }); const o = pr.reduce((a, v) => a + v, 0) / pr.length; S.line(fr, xs, xs.map(x => res.truth(x) + o), { stroke: tk.ink, "stroke-width": 1.2, "stroke-dasharray": "1.5 3" }); }
    S.line(fr, xs, F, { stroke: tk.series, "stroke-width": 2.4 });
    res.picks.forEach(p => { S.el("text", { x: fr.x(p.target), y: fr.m.t + 14, "text-anchor": "middle", style: `font:700 14px sans-serif;fill:${ST.gp}` }, fr.svg).textContent = "★"; S.el("line", { x1: fr.x(p.target), x2: fr.x(p.target), y1: fr.m.t + 18, y2: fr.H - fr.m.b, stroke: ST.gp, "stroke-width": 1, opacity: .5 }, fr.svg); });
    S.crosshair(fr, xs, b => Number.isFinite(F[b]) ? `<b>ξ = ${f(xs[b], 3)} ${res.L}</b><br>WHAM ${f(F[b], 2)}${res.err && Number.isFinite(res.err[b]) ? ` ± ${f(res.err[b], 2)}` : ""} ${res.E}` : `<b>ξ = ${f(xs[b], 3)}</b><br>not sampled`, b => F[b]);
    const items = [{ label: "WHAM ± bootstrap", color: tk.series }];
    if (res.gp) items.push({ label: "GP umbrella integration (95%)", color: tk.series2, dash: true });
    if (res.truth) items.push({ label: "exact (example)", color: tk.ink, dash: true });
    if (res.picks.length) items.push({ label: "★ active-learning picks", color: ST.gp });
    S.legend(fr, items); A.chartTools(host, "windowwise_pmf");
  }
  function drawHist(res) {
    const host = $("#ac-hist"), tk = S.tokens(), xs = res.bins.centers;
    const nh = res.hists.map((h, i) => Array.from(h, v => v / res.windows[i].n / res.bins.width)), mx = Math.max(...nh.map(h => Math.max(...h)));
    const fr = S.frame(host, { x0: res.bins.lo, x1: res.bins.hi, y0: -mx * 0.06, y1: mx * 1.08, xLabel: `ξ (${res.L})`, yLabel: "probability density", yd: 0, label: "Window histograms", height: 300 });
    res.pairs.filter(p => p.overlap < res.omin).forEach(p => { const a = res.windows[p.i].mean, b = res.windows[p.j].mean; S.el("rect", { x: fr.x(Math.min(a, b)), y: fr.m.t, width: Math.abs(fr.x(b) - fr.x(a)), height: fr.H - fr.m.t - fr.m.b, fill: p.overlap < res.omin / 3 ? ST.critical : ST.warning, "fill-opacity": .1 }, fr.svg); });
    const order = res.windows.map((_, i) => i).sort((a, b) => res.windows[a].center - res.windows[b].center), paths = [];
    order.forEach((i, r) => { paths[i] = S.line(fr, xs, nh[i], { stroke: ramp(r / Math.max(1, order.length - 1)), "stroke-width": 1.6 }); });
    res.windows.forEach(w => { if (w.center >= fr.o.x0 && w.center <= fr.o.x1) S.el("circle", { cx: fr.x(w.center), cy: fr.y(-mx * 0.03), r: 2.6, fill: Math.abs(w.mean - w.center) > 0.5 * res.medSpacing ? ST.warning : tk.ink3 }, fr.svg); });
    const hit = S.el("rect", { x: fr.m.l, y: fr.m.t, width: fr.W - fr.m.l - fr.m.r, height: fr.H - fr.m.t - fr.m.b, fill: "transparent" }, fr.svg);
    hit.addEventListener("pointermove", e => {
      const p = S.svgPoint(fr, e), b = Math.max(0, Math.min(xs.length - 1, Math.round((p.x - fr.m.l) / (fr.W - fr.m.l - fr.m.r) * xs.length - 0.5)));
      let best = 0; nh.forEach((h, i) => { if (h[b] > nh[best][b]) best = i; });
      paths.forEach((pp, i) => pp.setAttribute("stroke-width", i === best ? 3.2 : 1.2));
      const w = res.windows[best];
      S.showTip(fr, `<b>${A.esc(w.name)}</b><br>centre ${w.center} · k ${Math.round(w.k)}<br>⟨ξ⟩ ${f(w.mean, 4)} · ${Math.round(w.neff)} indep. samples`, p.x, p.y);
    });
    hit.addEventListener("pointerleave", () => { fr.tip.hidden = true; paths.forEach(pp => pp.setAttribute("stroke-width", 1.6)); });
    A.chartTools(host, "windowwise_histograms");
  }
  function drawOverlap(res) {
    const host = $("#ac-ovl"), tk = S.tokens(), P = res.pairs, n = P.length;
    const fr = S.frame(host, { x0: 0, x1: n, y0: 0, y1: Math.max(0.5, ...P.map(p => p.overlap)) * 1.12, xLabel: `neighbouring window pairs, ordered along ξ`, yLabel: "overlap", yd: 1, label: "Neighbour overlap", height: 260, xTicks: [], yFmt: v => `${Math.round(v * 100)}%` });
    const bw = (fr.W - fr.m.l - fr.m.r) / n, gap = Math.min(2, bw * 0.2);
    P.forEach((p, j) => {
      const low = p.overlap < res.omin, col = !low ? tk.neutral : p.overlap < res.omin / 3 ? ST.critical : ST.warning;
      const x = fr.x(j) + gap / 2, w = Math.max(1, bw - gap), y0 = fr.y(0), y1 = fr.y(p.overlap), r = Math.min(4, w / 2, Math.max(0, y0 - y1));
      S.el("path", { d: `M${x} ${y0}V${y1 + r}Q${x} ${y1} ${x + r} ${y1}H${x + w - r}Q${x + w} ${y1} ${x + w} ${y1 + r}V${y0}Z`, fill: col }, fr.svg);
      if (low) S.el("text", { x: x + w / 2, y: y1 - 6, "text-anchor": "middle", class: "ww-flagtxt" }, fr.svg).textContent = p.overlap < res.omin / 3 ? "✕" : "!";
    });
    S.hline(fr, res.omin, { stroke: tk.ink2, "stroke-dasharray": "4 4", "stroke-width": 1.2 });
    const hit = S.el("rect", { x: fr.m.l, y: fr.m.t, width: fr.W - fr.m.l - fr.m.r, height: fr.H - fr.m.t - fr.m.b, fill: "transparent" }, fr.svg);
    hit.addEventListener("pointermove", e => { const pt = S.svgPoint(fr, e), j = Math.max(0, Math.min(n - 1, Math.floor((pt.x - fr.m.l) / bw))), p = P[j]; S.showTip(fr, `<b>${res.windows[p.i].center} ↔ ${res.windows[p.j].center} ${res.L}</b><br>overlap ${(p.overlap * 100).toFixed(1)}%${p.overlap < res.omin ? " · below threshold" : ""}`, pt.x, pt.y); });
    hit.addEventListener("pointerleave", () => { fr.tip.hidden = true; });
    A.chartTools(host, "windowwise_overlap");
  }
  function renderIssues(res) {
    const L = res.L, E = res.E, items = res.flags.map(fl => {
      let title, cause, fix;
      if (fl.kind === "overlap") {
        const sug = res.suggestions.filter(s => s.reason === "fill gap" && Math.abs(s.target - fl.x) < res.medSpacing * 3);
        title = fl.level === "critical" ? "Gap in sampling" : "Thin overlap"; cause = `${fl.text} WHAM has to bridge this stretch with almost no data, so the profile there is unreliable however small the error bars look.`;
        fix = sug.length ? `<b>Fix:</b> add ${sug.length} window${sug.length > 1 ? "s" : ""} at pull-coord1-init = ${sug.map(s => s.center.toFixed(3)).join(", ")} ${L} (k = ${Math.round(sug[0].k)}).` : "<b>Fix:</b> add a window between these two.";
      } else if (fl.kind === "drift") {
        const sug = res.suggestions.find(s => s.reason === "stiffen" && Math.abs(s.target - (fl.x ?? s.target)) < 1);
        title = "Spring too soft"; cause = `${fl.text} The window samples the wrong region, leaving its intended stretch thin.`;
        fix = `<b>Fix:</b> re-run this window with a stiffer spring${sug ? ` (k ≥ ${Math.round(sug.k)} ${E}/${L}²)` : ""}.`;
      } else if (fl.kind === "samples") { title = "Too few independent samples"; cause = fl.text; fix = "<b>Fix:</b> extend this window; aim for at least 50–100 independent samples."; }
      else { title = "WHAM did not converge"; cause = fl.text; fix = "<b>Fix:</b> check the centres and force constants in the Windows tab."; }
      return `<li class="issue"><span class="badge-st ${fl.level}">${fl.level === "critical" ? "✕" : "!"}</span><div><h4>${title}</h4><p>${cause}</p><div class="fix">${fix}</div></div></li>`;
    });
    $("#a-issues").innerHTML = items.length ? items.join("") : `<li class="issue"><span class="badge-st good">✓</span><div><h4>No issues found</h4><p>Every pair of neighbours overlaps above the threshold, no window drifts from its centre, and every window has enough independent samples.</p></div></li>`;
  }
  function renderFix(res) {
    const host = $("#ac-fix"), tk = S.tokens(), xs = res.bins.centers, F = Array.from(res.F);
    const vals = F.filter(Number.isFinite), lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.1 || 1;
    const fr = S.frame(host, { x0: res.bins.lo, x1: res.bins.hi, y0: lo - pad * 2.2, y1: hi + pad, xLabel: `ξ (${res.L})`, yLabel: `free energy (${res.E})`, yd: 0, label: "Repair plan", height: 280 });
    S.line(fr, xs, F, { stroke: tk.series, "stroke-width": 2, "stroke-opacity": .55 });
    const base = fr.y(lo - pad * 1.4);
    res.windows.forEach(w => S.el("line", { x1: fr.x(w.center), x2: fr.x(w.center), y1: base - 6, y2: base + 6, stroke: tk.ink3, "stroke-width": 1.5 }, fr.svg));
    S.el("text", { x: fr.W - fr.m.r - 2, y: base - 10, "text-anchor": "end", class: "lbl" }, fr.svg).textContent = "existing windows (ticks)";
    res.suggestions.forEach(s => { const X = fr.x(s.target); S.el("path", { d: `M${X} ${base - 16}l7 12h-14z`, fill: s.reason === "stiffen" ? tk.series2 : ST.warning, stroke: tk.surface, "stroke-width": 1 }, fr.svg); });
    res.picks.forEach(p => S.el("text", { x: fr.x(p.target), y: base + 22, "text-anchor": "middle", style: `font:700 14px sans-serif;fill:${ST.gp}` }, fr.svg).textContent = "★");
    S.legend(fr, [{ label: "existing", color: tk.ink3 }, { label: "▲ fill gap", color: ST.warning }, { label: "▲ stiffen spring", color: tk.series2 }, { label: "★ GP active learning", color: ST.gp }]);
    A.chartTools(host, "windowwise_repair_plan");
    const rows = res.suggestions.map(s => ({ type: s.reason === "stiffen" ? "Stiffen spring" : "Fill gap", target: s.target, c: s.center, k: s.k, why: s.reason === "stiffen" ? "window drifted off its centre" : "neighbours barely overlap" }))
      .concat(res.picks.map(p => ({ type: "GP active learning", target: p.target, c: p.center, k: p.k, why: `largest mean-force uncertainty (±${f(p.sd, 1)})` })));
    $("#a-fixtable").innerHTML = rows.length ? `<thead><tr><th>Type</th><th>Target ξ</th><th>pull-coord1-init</th><th>pull-coord1-k</th><th>Why</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${r.type}</b></td><td>${r.target.toFixed(3)}</td><td>${r.c.toFixed(4)}</td><td>${Math.round(r.k)}</td><td>${r.why}</td></tr>`).join("")}</tbody>` : `<tbody><tr><td>No repair windows needed.</td></tr></tbody>`;
    const lines = [`; WindowWise repair plan (U = 0.5 k (x - x0)^2, k in ${res.E}/${res.L}^2)`, "; keep geometry and groups from your original .mdp", ""];
    rows.forEach((r, i) => lines.push(`; ${String(i).padStart(2, "0")} ${r.type.padEnd(19)} targets ξ ≈ ${r.target.toFixed(3)}:  pull-coord1-init = ${r.c.toFixed(4)}   pull-coord1-k = ${Math.round(r.k)}`));
    $("#a-fixmdp").textContent = lines.join("\n");
  }
  function renderWinTable() {
    const t = $("#a-wintable"); if (!t) return;
    const resW = st.res ? new Map(st.res.windows.map(w => [w.name, w])) : new Map();
    t.innerHTML = `<thead><tr><th>File</th><th>Frames</th><th>Centre</th><th>k</th><th>⟨ξ⟩</th><th>Drift</th><th>Indep.</th><th></th></tr></thead><tbody>${st.windows.map((w, i) => {
      const r = resW.get(w.name), m = r ? r.mean : W.mean(w.data), drift = Math.abs(m - w.center);
      return `<tr><td title="${A.esc(w.name)}">${A.esc(w.name)}${w.guessed ? ' <span class="cnt warning">guessed</span>' : ""}</td><td>${w.data.length.toLocaleString()}</td><td><input type="number" step="any" value="${w.center}" data-i="${i}" data-f="center"></td><td><input type="number" step="any" value="${w.k}" data-i="${i}" data-f="k"></td><td>${m.toFixed(4)}</td><td>${drift.toFixed(4)}</td><td>${r ? Math.round(r.neff).toLocaleString() : "–"}</td><td><button type="button" class="btn-sm" data-del="${i}" aria-label="Remove">✕</button></td></tr>`;
    }).join("")}</tbody>`;
  }
  $("#a-wintable").addEventListener("change", e => { const el = e.target; if (!el.dataset.f) return; const w = st.windows[+el.dataset.i]; w[el.dataset.f] = parseFloat(el.value); w.guessed = false; A.toast("Edited. Press Run analysis to update"); });
  $("#a-wintable").addEventListener("click", e => { const b = e.target.closest("[data-del]"); if (!b) return; const w = st.windows[+b.dataset.del]; st.raw = st.raw.filter(r => r.name !== w.name); st.windows.splice(+b.dataset.del, 1); renderWinTable(); renderFiles(); });
  A.tabs($("#a-tabs"));

  /* =================== export =================== */
  root.addEventListener("click", e => {
    const c = e.target.closest("[data-copy]"), d = e.target.closest("[data-dl]");
    if (c) A.copy(document.getElementById(c.dataset.copy).textContent);
    if (d) A.download(d.dataset.name, document.getElementById(d.dataset.dl).textContent);
  });
  $("#ww-copy").addEventListener("click", () => {
    if (mode === "plan" && plan) return A.copy(`Umbrella windows planned with WindowWise: ${plan.p.n} windows from ${plan.o.xmin} to ${plan.o.xmax} ${plan.o.lu}, k = ${Math.round(plan.p.k)} ${plan.o.unit}/${plan.o.lu}^2, spacing ${f(plan.p.spacing, 4)} ${plan.o.lu} (neighbour overlap ${(plan.p.overlap * 100).toFixed(0)}%).`);
    const r = st.res; if (!r) return;
    A.copy(`Free-energy profile from ${r.windows.length} umbrella windows by WHAM (T = ${num("#a-T")} K) with block-bootstrap errors; sampling checked with WindowWise (https://siba-p.github.io/windowwise/): ${$("#a-headline").textContent}.`);
  });
  $("#ww-csv").addEventListener("click", () => {
    if (mode === "plan" && plan) return A.download("windows.csv", "window,center,k\n" + plan.p.centers.map((c, i) => `${i},${c.toFixed(5)},${Math.round(plan.p.k)}`).join("\n"), "text/csv");
    const r = st.res; if (!r) return;
    A.download("pmf_windowwise.csv", [`# WindowWise PMF, T=${num("#a-T")} K, ${r.E}, zero at minimum`, `xi_${r.L},F,F_err`].concat(r.bins.centers.map((x, b) => `${x.toFixed(6)},${Number.isFinite(r.F[b]) ? r.F[b].toFixed(5) : ""},${r.err && Number.isFinite(r.err[b]) ? r.err[b].toFixed(5) : ""}`)).join("\n"), "text/csv");
  });
  $("#ww-report").addEventListener("click", () => {
    if (mode === "plan" && plan) {
      A.report({ title: "Umbrella-sampling plan", subtitle: `${plan.p.n} windows`, tool: "WindowWise", filename: "windowwise_plan.html", sections: [{ title: "Design", html: `<p><b>${$("#p-headline").textContent}</b></p><p>${$("#p-story").innerHTML}</p>` }, { title: "Window layout", svgs: [$("#pc-layout svg")] }, { title: "Windows", html: $("#p-table").outerHTML }, { title: "GROMACS", html: `<pre>${A.esc($("#p-mdp").textContent)}</pre><pre>${A.esc($("#p-sh").textContent)}</pre>` }] });
      return A.toast("Report downloaded");
    }
    if (!st.res) return;
    A.report({ title: "Umbrella-sampling diagnostics", subtitle: `${st.res.windows.length} windows`, tool: "WindowWise", filename: "windowwise_report.html",
      sections: [{ title: "Summary", html: `<p><b>${A.esc($("#a-headline").textContent)}</b></p><p>${$("#a-story").innerHTML}</p>` },
        { title: "Free energy", svgs: [$("#ac-pmf svg")] }, { title: "Sampling and overlap", svgs: [$("#ac-hist svg"), $("#ac-ovl svg")] },
        { title: "Issues", html: $("#a-issues").outerHTML }, { title: "Repair plan", html: $("#a-fixtable").outerHTML + `<pre>${A.esc($("#a-fixmdp").textContent)}</pre>`, svgs: [$("#ac-fix svg")] },
        { title: "Methods", html: "<p>1D WHAM (Kumar et al. 1992) with block-bootstrap errors; overlap, drift and sampling diagnostics; Gaussian-process umbrella integration from window mean forces (cf. Stecher, Bernstein & Csányi 2014) with active learning by maximum posterior mean-force uncertainty.</p>" }] });
    A.steps($("#ww-steps"), 3); A.toast("Report downloaded");
  });
  S.onTheme(() => { if (mode === "plan") renderPlan(); else if (st.res) renderResults(); });
  setMode("plan");
})();
