(function () {
  "use strict";
  const WW = window.WW;
  const root = document.getElementById("ww");
  if (!root || !WW) return;
  const $ = (s, r = root) => r.querySelector(s);
  const $$ = (s, r = root) => Array.from(r.querySelectorAll(s));
  const SVGNS = "http://www.w3.org/2000/svg";

  /* ---------------- theme-aware chart tokens ---------------- */
  const RAMP_LIGHT = ["#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281"];
  const RAMP_DARK = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6"];
  const STATUS = { warning: "#fab219", critical: "#d03b3b", good: "#0ca30c" };
  function tokens() {
    const cs = getComputedStyle(document.documentElement);
    const dark = cs.colorScheme === "dark" || document.documentElement.dataset.theme === "dark";
    return {
      dark, ramp: dark ? RAMP_DARK : RAMP_LIGHT,
      series: dark ? "#3987e5" : "#2a78d6",
      ink: cs.getPropertyValue("--ink").trim(), ink2: cs.getPropertyValue("--ink-2").trim(), ink3: cs.getPropertyValue("--ink-3").trim(),
      line: cs.getPropertyValue("--line").trim(), surface: cs.getPropertyValue("--card").trim(), neutral: dark ? "#5b6782" : "#b5bdcc"
    };
  }
  const rampAt = (ramp, t) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1))))];

  /* ---------------- tiny SVG chart kit ---------------- */
  function niceTicks(lo, hi, n) {
    const span = hi - lo || 1, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  const fmt = (v, d) => (Math.abs(v) >= 1000 ? Math.round(v).toString() : (+v).toFixed(d == null ? 2 : d));
  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function frame(host, o) {
    host.innerHTML = "";
    const W = 640, H = o.height || 260, m = { l: 54, r: 14, t: 14, b: 40 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": o.label || "" }, host);
    const tk = tokens();
    const x = v => m.l + (v - o.x0) / (o.x1 - o.x0) * (W - m.l - m.r);
    const y = v => H - m.b - (v - o.y0) / (o.y1 - o.y0) * (H - m.t - m.b);
    const g = el("g", {}, svg);
    niceTicks(o.y0, o.y1, 5).forEach(v => {
      el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: tk.line, "stroke-width": 1 }, g);
      const t = el("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end", class: "ww-tick" }, g); t.textContent = fmt(v, o.yd);
    });
    niceTicks(o.x0, o.x1, 7).forEach(v => {
      el("line", { x1: x(v), x2: x(v), y1: H - m.b, y2: H - m.b + 4, stroke: tk.ink3 }, g);
      const t = el("text", { x: x(v), y: H - m.b + 17, "text-anchor": "middle", class: "ww-tick" }, g); t.textContent = fmt(v, o.xd);
    });
    el("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: tk.ink3, "stroke-width": 1 }, g);
    const xl = el("text", { x: (m.l + W - m.r) / 2, y: H - 4, "text-anchor": "middle", class: "ww-axis" }, g); xl.textContent = o.xLabel;
    const yl = el("text", { x: 14, y: (m.t + H - m.b) / 2, "text-anchor": "middle", class: "ww-axis", transform: `rotate(-90 14 ${(m.t + H - m.b) / 2})` }, g); yl.textContent = o.yLabel;
    const tip = document.createElement("div"); tip.className = "ww-tip"; tip.hidden = true; host.appendChild(tip);
    return { svg, x, y, W, H, m, tk, tip, host };
  }
  function showTip(f, html, px, py) {
    f.tip.innerHTML = html; f.tip.hidden = false;
    const r = f.host.getBoundingClientRect(), s = r.width / f.W;
    let left = px * s + 12, top = py * s - 10;
    if (left + f.tip.offsetWidth > r.width) left = px * s - f.tip.offsetWidth - 12;
    f.tip.style.left = left + "px"; f.tip.style.top = Math.max(0, top) + "px";
  }
  function svgPoint(f, evt) {
    const r = f.svg.getBoundingClientRect();
    return { x: (evt.clientX - r.left) * f.W / r.width, y: (evt.clientY - r.top) * f.H / r.height };
  }
  function pathFrom(xs, ys, f) {
    let d = "", pen = false;
    for (let i = 0; i < xs.length; i++) {
      if (!Number.isFinite(ys[i])) { pen = false; continue; }
      d += (pen ? "L" : "M") + f.x(xs[i]).toFixed(1) + " " + f.y(ys[i]).toFixed(1); pen = true;
    }
    return d;
  }

  /* ---------------- Plan ---------------- */
  const planForm = $("#plan-form");
  let lastPlan = null;
  function readPlan() {
    const fd = new FormData(planForm), num = k => parseFloat(fd.get(k));
    return { xmin: num("xmin"), xmax: num("xmax"), T: num("T"), unit: fd.get("unit"), overlap: num("overlap") / 100, mode: fd.get("mode"),
      slope: num("slope"), kMin: num("kMin"), k: num("k"), spacing: num("spacing"), lunit: fd.get("lunit") || "nm", geometry: fd.get("geometry") };
  }
  function renderPlan() {
    const o = readPlan();
    $$("[data-mode]", planForm).forEach(d => { d.hidden = d.dataset.mode !== o.mode; });
    if (!(o.xmax > o.xmin) || !(o.T > 0) || !(o.overlap > 0 && o.overlap < 1)) return;
    if (o.mode === "k" && !(o.k > 0)) return;
    if (o.mode === "spacing" && !(o.spacing > 0)) return;
    const p = WW.plan(o); lastPlan = { p, o };
    const L = o.lunit, E = o.unit;
    const rows = [
      ["Force constant k", `${Math.round(p.k).toLocaleString()} ${E}/${L}²`],
      ["Window spacing", `${p.spacing.toFixed(4)} ${L}`],
      ["Number of windows", p.n],
      ["Window width σ", `${p.sigma.toFixed(4)} ${L}`],
      ["Neighbour overlap", `${(p.overlap * 100).toFixed(1)}%`],
      ["Max slope-induced shift", o.mode === "auto" ? `${p.shift.toFixed(4)} ${L} (${(p.shift / p.spacing * 100).toFixed(0)}% of spacing)` : "n/a"]
    ];
    $("#plan-summary").innerHTML = rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("") + `<p class="ww-rule">${p.rule}</p>`;
    const pad = 3 * p.sigma, f = frame($("#plan-chart"), { x0: o.xmin - pad, x1: o.xmax + pad, y0: 0, y1: 1.08, xLabel: `ξ (${L})`, yLabel: "Relative probability", yd: 1, label: "Predicted window distributions" });
    const xs = Array.from({ length: 400 }, (_, i) => o.xmin - pad + (o.xmax - o.xmin + 2 * pad) * i / 399);
    p.centers.forEach((c, i) => {
      const ys = xs.map(x => Math.exp(-0.5 * ((x - c) / p.sigma) ** 2));
      el("path", { d: pathFrom(xs, ys, f), fill: "none", stroke: rampAt(f.tk.ramp, i / Math.max(1, p.n - 1)), "stroke-width": 2, "stroke-linejoin": "round" }, f.svg);
    });
    const hover = el("rect", { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: "transparent" }, f.svg);
    hover.addEventListener("pointermove", e => {
      const pt = svgPoint(f, e); const xv = o.xmin - pad + (pt.x - f.m.l) / (f.W - f.m.l - f.m.r) * (o.xmax - o.xmin + 2 * pad);
      let bi = 0; p.centers.forEach((c, i) => { if (Math.abs(c - xv) < Math.abs(p.centers[bi] - xv)) bi = i; });
      showTip(f, `<b>Window ${bi}</b><br>centre ${p.centers[bi].toFixed(4)} ${L}<br>k ${Math.round(p.k)} ${E}/${L}²`, pt.x, pt.y);
    });
    hover.addEventListener("pointerleave", () => { f.tip.hidden = true; });
    $("#plan-mdp").textContent = WW.mdpSnippet(p.centers, p.centers.map(() => p.k), { geometry: o.geometry });
  }
  planForm.addEventListener("input", renderPlan);
  planForm.addEventListener("submit", e => e.preventDefault());

  /* ---------------- tabs ---------------- */
  $$('[role="tab"]').forEach(t => t.addEventListener("click", () => {
    $$('[role="tab"]').forEach(o => o.setAttribute("aria-selected", o === t));
    $$('[role="tabpanel"]').forEach(p => { p.hidden = p.id !== t.getAttribute("aria-controls"); });
    if (t.id === "tab-plan") renderPlan(); else if (lastResult) renderResults(lastResult);
  }));

  /* ---------------- copy / download ---------------- */
  root.addEventListener("click", async e => {
    const c = e.target.closest("[data-copy-target]"), d = e.target.closest("[data-download]");
    if (c) {
      try { await navigator.clipboard.writeText(document.getElementById(c.dataset.copyTarget).textContent); c.textContent = "Copied ✓"; }
      catch { c.textContent = "Select & copy"; }
      setTimeout(() => (c.textContent = "Copy"), 1500);
    }
    if (d) download(d.dataset.filename, document.getElementById(d.dataset.download).textContent);
  });
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type || "text/plain" }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------------- Analyse: data loading ---------------- */
  const anForm = $("#an-form");
  let windows = [], truth = null, lastResult = null, rawFiles = [];
  const status = msg => { $("#an-status").textContent = msg; };
  const anOpts = () => { const fd = new FormData(anForm), n = k => parseFloat(fd.get(k)); return { T: n("T"), unit: fd.get("unit"), col: Math.max(0, Math.round(n("col"))), nbins: Math.round(n("nbins")), nboot: Math.round(n("nboot")), omin: n("omin") / 100, k: n("k"), lunit: fd.get("lunit") || "nm" }; };

  async function addFiles(fileList) {
    const files = Array.from(fileList);
    const texts = await Promise.all(files.map(f => f.text()));
    let meta = null;
    files.forEach((f, i) => {
      const m = WW.parseMetadata(texts[i]);
      if (m) meta = m; else rawFiles.push({ name: f.name, text: texts[i] });
    });
    truth = null;
    rebuildWindows(meta);
  }
  function rebuildWindows(meta) {
    const o = anOpts();
    const prev = new Map(windows.map(w => [w.name, w]));
    windows = rawFiles.map(f => {
      const data = WW.parseSeries(f.text, o.col);
      const m = meta && meta.find(r => r.file === f.name);
      const p = prev.get(f.name);
      let center = m ? m.center : p ? p.center : WW.numberFromName(f.name);
      if (!Number.isFinite(center)) center = data.length ? +WW.mean(data).toFixed(4) : 0;
      return { name: f.name, data, center, k: m ? m.k : p ? p.k : o.k, guessed: !m && !p && !Number.isFinite(WW.numberFromName(f.name)) };
    }).filter(w => w.data.length > 1).sort((a, b) => a.center - b.center);
    renderTable();
    $("#analysis-setup").hidden = windows.length === 0;
    status(windows.length ? (meta ? "Centres and k read from the metadata file." : "Check the centres and force constants, then run.") : "No numeric data found in those files.");
  }
  function renderTable() {
    const tb = $("#win-table tbody");
    tb.innerHTML = "";
    windows.forEach((w, i) => {
      const tr = document.createElement("tr");
      const m = WW.mean(w.data), g = WW.inefficiency(w.data);
      tr.innerHTML = `<td class="ww-fname" title="${w.name}">${w.name}${w.guessed ? ' <span class="ww-badge">guessed centre</span>' : ""}</td><td>${w.data.length.toLocaleString()}</td>
        <td><input type="number" step="any" value="${w.center}" data-i="${i}" data-f="center" aria-label="Centre of ${w.name}"></td>
        <td><input type="number" step="any" value="${w.k}" data-i="${i}" data-f="k" aria-label="Force constant of ${w.name}"></td>
        <td>${m.toFixed(4)}</td><td>${Math.round(w.data.length / g).toLocaleString()}</td>
        <td><button type="button" class="ww-x" data-del="${i}" aria-label="Remove ${w.name}">✕</button></td>`;
      tb.appendChild(tr);
    });
    $("#win-count").textContent = `(${windows.length})`;
  }
  $("#win-table").addEventListener("change", e => {
    const t = e.target; if (!t.dataset.f) return;
    const w = windows[+t.dataset.i]; w[t.dataset.f] = parseFloat(t.value); w.guessed = false;
  });
  $("#win-table").addEventListener("click", e => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    const w = windows[+b.dataset.del];
    rawFiles = rawFiles.filter(f => f.name !== w.name); windows.splice(+b.dataset.del, 1); renderTable();
  });
  $("#clear-files").addEventListener("click", () => { rawFiles = []; windows = []; truth = null; renderTable(); $("#analysis-setup").hidden = true; $("#results").hidden = true; });
  $("#centers-names").addEventListener("click", () => {
    let n = 0; windows.forEach(w => { const v = WW.numberFromName(w.name); if (Number.isFinite(v)) { w.center = v; w.guessed = false; n++; } });
    windows.sort((a, b) => a.center - b.center); renderTable(); status(`Read centres from ${n} of ${windows.length} file names.`);
  });
  $("#centers-even").addEventListener("click", () => {
    const row = $("#even-row");
    if (row.hidden) { row.hidden = false; status("Set the first centre and step, then press “Evenly spaced…” again. Files are taken in name order."); return; }
    const s = parseFloat($("#even-start").value), d = parseFloat($("#even-step").value);
    windows.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    windows.forEach((w, i) => { w.center = +(s + i * d).toFixed(6); w.guessed = false; });
    renderTable(); status("Centres assigned in file-name order.");
  });
  $("#k-all").addEventListener("click", () => { const k = anOpts().k; windows.forEach(w => { w.k = k; }); renderTable(); status(`k = ${k} applied to all windows.`); });
  anForm.addEventListener("change", e => { if (e.target.name === "col") rebuildWindows(null); });

  const drop = $("#dropzone"), input = $("#file-input");
  input.addEventListener("change", () => { if (input.files.length) addFiles(input.files); input.value = ""; });
  ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => { if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });

  $("#load-demo").addEventListener("click", () => {
    // Morse-type adsorption PMF; soft springs on the steep wall and two missing windows near 1.4–1.5 nm.
    const D = 30, a = 3.5, x0 = 0.7, F = x => D * ((1 - Math.exp(-a * (x - x0))) ** 2 - 1);
    const centers = []; for (let c = 0.5; c <= 2.5 + 1e-9; c += 0.1) { const r = +c.toFixed(2); if (r !== 1.4 && r !== 1.5) centers.push(r); }
    const ws = WW.synthetic({ F, centers, k: 1000, T: 300, unit: "kJ/mol", n: 3000, stride: 5, burn: 2000, seed: 4 });
    rawFiles = ws.map(w => ({ name: `pullx_${w.center.toFixed(2)}.xvg`, text: "# synthetic demo\n" + Array.from(w.data, (v, i) => `${(i * 0.1).toFixed(1)} ${v.toFixed(5)}`).join("\n") }));
    anForm.T.value = 300; anForm.unit.value = "kJ/mol"; anForm.k.value = 1000; anForm.col.value = 1;
    windows = []; rebuildWindows(null);
    truth = F;
    status("Demo: a 30 kJ/mol adsorption well, sampled with deliberate mistakes. Press Run.");
  });

  anForm.addEventListener("submit", e => {
    e.preventDefault();
    if (windows.length < 2) { status("Load at least two windows."); return; }
    const o = anOpts();
    status("Running WHAM and bootstrap…");
    $(".ww-run").disabled = true;
    setTimeout(() => {
      try {
        const t0 = performance.now();
        const res = WW.analyze({ windows, T: o.T, unit: o.unit, lunit: o.lunit, nbins: o.nbins, nboot: o.nboot, overlapMin: o.omin });
        res.opts = o; res.truth = truth; res.ms = performance.now() - t0;
        lastResult = res; renderResults(res);
        status(`Done in ${(res.ms / 1000).toFixed(1)} s · WHAM ${res.converged ? "converged" : "did not converge"} in ${res.iter.toLocaleString()} iterations.`);
      } catch (err) { status("Error: " + err.message); }
      $(".ww-run").disabled = false;
    }, 30);
  });

  /* ---------------- Analyse: results ---------------- */
  function renderResults(res) {
    $("#results").hidden = false;
    const o = res.opts, L = o.lunit, E = o.unit, xs = res.bins.centers;
    const crit = res.flags.filter(f => f.level === "critical").length, warn = res.flags.filter(f => f.level === "warning").length;
    $("#verdict").innerHTML = res.flags.length === 0
      ? `<span class="ww-st good">✓</span><div><b>No issues found.</b> All neighbouring windows overlap by at least ${(o.omin * 100).toFixed(0)}% and no window drifts from its centre.</div>`
      : `<span class="ww-st ${crit ? "critical" : "warning"}">${crit ? "✕" : "!"}</span><div><b>${crit ? crit + " critical" : ""}${crit && warn ? " and " : ""}${warn ? warn + " warning" + (warn > 1 ? "s" : "") : ""}.</b> ${res.suggestions.length ? `WindowWise suggests ${res.suggestions.length} window${res.suggestions.length > 1 ? "s" : ""} to add or stiffen (below).` : ""}</div>`;

    // PMF
    const finite = Array.from(res.F).filter(Number.isFinite);
    let ymax = Math.max(...finite);
    let tShift = null;
    if (res.truth) {
      const pr = []; xs.forEach((x, b) => { if (Number.isFinite(res.F[b])) pr.push(res.F[b] - res.truth(x)); });
      tShift = pr.reduce((s, v) => s + v, 0) / pr.length;
    }
    const f = frame($("#pmf-chart"), { x0: res.bins.lo, x1: res.bins.hi, y0: Math.min(0, ...finite) - 1, y1: ymax * 1.08 + 1, xLabel: `ξ (${L})`, yLabel: `F (${E})`, yd: 0, label: "Potential of mean force" });
    flagMarks(f, res);
    if (res.err) {
      let d = "", started = false; const up = [], dn = [];
      xs.forEach((x, b) => { if (Number.isFinite(res.F[b]) && Number.isFinite(res.err[b])) { up.push([x, res.F[b] + res.err[b]]); dn.push([x, res.F[b] - res.err[b]]); } });
      up.forEach(([x, y]) => { d += (started ? "L" : "M") + f.x(x).toFixed(1) + " " + f.y(y).toFixed(1); started = true; });
      dn.reverse().forEach(([x, y]) => { d += "L" + f.x(x).toFixed(1) + " " + f.y(y).toFixed(1); });
      if (d) el("path", { d: d + "Z", fill: f.tk.series, "fill-opacity": 0.18, stroke: "none" }, f.svg);
    }
    if (res.truth) el("path", { d: pathFrom(xs, xs.map(x => res.truth(x) + tShift), f), fill: "none", stroke: f.tk.ink2, "stroke-width": 1.5, "stroke-dasharray": "5 4" }, f.svg);
    el("path", { d: pathFrom(xs, Array.from(res.F), f), fill: "none", stroke: f.tk.series, "stroke-width": 2, "stroke-linejoin": "round" }, f.svg);
    if (res.truth) {
      const lg = document.createElement("div"); lg.className = "ww-hlegend";
      lg.innerHTML = `<span><i style="background:${f.tk.series}"></i>WHAM ± bootstrap</span><span><i class="dash" style="border-color:${f.tk.ink2}"></i>exact PMF (demo)</span>`;
      f.host.appendChild(lg);
    }
    crosshair(f, xs, b => Number.isFinite(res.F[b]) ? `<b>ξ = ${xs[b].toFixed(4)} ${L}</b><br>F = ${res.F[b].toFixed(2)}${res.err && Number.isFinite(res.err[b]) ? " ± " + res.err[b].toFixed(2) : ""} ${E}${res.truth ? `<br>exact ${(res.truth(xs[b]) + tShift).toFixed(2)}` : ""}` : `<b>ξ = ${xs[b].toFixed(4)}</b><br>not sampled`, b => res.F[b]);
    const depth = Math.max(...finite) - Math.min(...finite);
    $("#pmf-caption").textContent = `Zero at the global minimum. Range ${depth.toFixed(1)} ${E}${res.err ? `; shaded band = ±1σ from ${o.nboot} block-bootstrap resamples` : ""}.`;

    // Histograms
    const nh = res.hists.map((h, i) => { const n = res.windows[i].n; return Array.from(h, v => v / n / res.bins.width); });
    const hmax = Math.max(...nh.map(h => Math.max(...h)));
    const fh = frame($("#hist-chart"), { x0: res.bins.lo, x1: res.bins.hi, y0: 0, y1: hmax * 1.08, xLabel: `ξ (${L})`, yLabel: "Probability density", yd: 0, label: "Window histograms" });
    flagMarks(fh, res);
    const order = res.windows.map((_, i) => i).sort((a, b) => res.windows[a].center - res.windows[b].center);
    const paths = [];
    order.forEach((i, r) => { paths[i] = el("path", { d: pathFrom(xs, nh[i], fh), fill: "none", stroke: rampAt(fh.tk.ramp, r / Math.max(1, order.length - 1)), "stroke-width": 1.6, "stroke-linejoin": "round" }, fh.svg); });
    const hov = el("rect", { x: fh.m.l, y: fh.m.t, width: fh.W - fh.m.l - fh.m.r, height: fh.H - fh.m.t - fh.m.b, fill: "transparent" }, fh.svg);
    hov.addEventListener("pointermove", e => {
      const pt = svgPoint(fh, e), b = Math.max(0, Math.min(xs.length - 1, Math.round((pt.x - fh.m.l) / (fh.W - fh.m.l - fh.m.r) * xs.length - 0.5)));
      let best = 0; nh.forEach((h, i) => { if (h[b] > nh[best][b]) best = i; });
      paths.forEach((p, i) => p.setAttribute("stroke-width", i === best ? 3 : 1.2));
      const w = res.windows[best];
      showTip(fh, `<b>${w.name}</b><br>centre ${w.center} · k ${Math.round(w.k)}<br>⟨ξ⟩ ${w.mean.toFixed(4)} · ${Math.round(w.neff)} indep. samples`, pt.x, pt.y);
    });
    hov.addEventListener("pointerleave", () => { fh.tip.hidden = true; paths.forEach(p => p.setAttribute("stroke-width", 1.6)); });

    // Overlap bars
    const P = res.pairs, n = P.length;
    const fo = frame($("#ovl-chart"), { x0: 0, x1: n, y0: 0, y1: Math.max(0.5, ...P.map(p => p.overlap)) * 1.1, xLabel: "Adjacent window pair (ordered by centre)", yLabel: "Overlap", yd: 1, label: "Neighbour overlap", height: 230 });
    fo.svg.querySelectorAll("text.ww-tick").forEach(t => { if (+t.getAttribute("y") > fo.H - fo.m.b) t.remove(); });
    const bw = (fo.W - fo.m.l - fo.m.r) / n, gap = Math.min(2, bw * 0.2);
    P.forEach((p, j) => {
      const low = p.overlap < o.omin, col = !low ? fo.tk.neutral : p.overlap < o.omin / 3 ? STATUS.critical : STATUS.warning;
      const x = fo.x(j) + gap / 2, w = Math.max(1, bw - gap), y0 = fo.y(0), y1 = fo.y(p.overlap), h = Math.max(1, y0 - y1);
      const r = Math.min(4, w / 2, h);
      el("path", { d: `M${x} ${y0}V${y1 + r}Q${x} ${y1} ${x + r} ${y1}H${x + w - r}Q${x + w} ${y1} ${x + w} ${y1 + r}V${y0}Z`, fill: col }, fo.svg);
      if (low) { const t = el("text", { x: x + w / 2, y: y1 - 6, "text-anchor": "middle", class: "ww-flagtxt" }, fo.svg); t.textContent = p.overlap < o.omin / 3 ? "✕" : "!"; }
    });
    el("line", { x1: fo.m.l, x2: fo.W - fo.m.r, y1: fo.y(o.omin), y2: fo.y(o.omin), stroke: fo.tk.ink2, "stroke-dasharray": "4 4" }, fo.svg);
    const ho = el("rect", { x: fo.m.l, y: fo.m.t, width: fo.W - fo.m.l - fo.m.r, height: fo.H - fo.m.t - fo.m.b, fill: "transparent" }, fo.svg);
    ho.addEventListener("pointermove", e => {
      const pt = svgPoint(fo, e), j = Math.max(0, Math.min(n - 1, Math.floor((pt.x - fo.m.l) / bw))), p = P[j];
      showTip(fo, `<b>${res.windows[p.i].center} ↔ ${res.windows[p.j].center} ${L}</b><br>overlap ${(p.overlap * 100).toFixed(1)}%${p.overlap < o.omin ? " · below threshold" : ""}`, pt.x, pt.y);
    });
    ho.addEventListener("pointerleave", () => { fo.tip.hidden = true; });

    // Flags list
    $("#flags").innerHTML = res.flags.length ? res.flags.map(fl => `<li class="${fl.level}"><span class="ww-st ${fl.level}">${fl.level === "critical" ? "✕" : "!"}</span><div><b>${fl.level === "critical" ? "Critical" : "Warning"} · ${({ overlap: "gap", drift: "drift", samples: "sampling", wham: "convergence" })[fl.kind]}</b><br>${fl.text}</div></li>`).join("")
      : `<li class="good"><span class="ww-st good">✓</span><div><b>All clear</b><br>No gaps, drifting windows or under-sampled windows.</div></li>`;

    // Suggestions
    const S = res.suggestions;
    $("#suggest-card").hidden = !S.length;
    if (S.length) {
      const lines = ["; WindowWise repair windows (add these to your existing set)", `; geometry and groups as in your original .mdp; bias U = 0.5 k (x - x0)^2, k in ${E}/${L}^2`, ""];
      S.forEach((s, i) => lines.push(`; repair ${String(i).padStart(2, "0")} (${s.reason === "stiffen" ? "re-run with stiffer spring" : "fill gap"}, targets ξ ≈ ${s.target.toFixed(3)}):  pull-coord1-init = ${s.center.toFixed(4)}   pull-coord1-k = ${Math.round(s.k)}`));
      $("#fix-mdp").textContent = lines.join("\n");
    }
  }
  function flagMarks(f, res) {
    res.flags.forEach(fl => {
      if (!Number.isFinite(fl.x) || fl.x < res.bins.lo || fl.x > res.bins.hi) return;
      const col = STATUS[fl.level];
      el("line", { x1: f.x(fl.x), x2: f.x(fl.x), y1: f.m.t, y2: f.H - f.m.b, stroke: col, "stroke-width": 1, "stroke-dasharray": "2 3", opacity: 0.8 }, f.svg);
      const t = el("text", { x: f.x(fl.x), y: f.H - f.m.b - 6, "text-anchor": "middle", class: "ww-flagtxt" }, f.svg); t.textContent = fl.level === "critical" ? "✕" : "!";
    });
  }
  function crosshair(f, xs, html, yAt) {
    const line = el("line", { y1: f.m.t, y2: f.H - f.m.b, stroke: f.tk.ink3, "stroke-width": 1, visibility: "hidden" }, f.svg);
    const dot = el("circle", { r: 4.5, fill: f.tk.series, stroke: f.tk.surface, "stroke-width": 2, visibility: "hidden" }, f.svg);
    const hov = el("rect", { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: "transparent" }, f.svg);
    hov.addEventListener("pointermove", e => {
      const pt = svgPoint(f, e), b = Math.max(0, Math.min(xs.length - 1, Math.round((pt.x - f.m.l) / (f.W - f.m.l - f.m.r) * xs.length - 0.5)));
      const X = f.x(xs[b]); line.setAttribute("x1", X); line.setAttribute("x2", X); line.setAttribute("visibility", "visible");
      const yv = yAt(b);
      if (Number.isFinite(yv)) { dot.setAttribute("cx", X); dot.setAttribute("cy", f.y(yv)); dot.setAttribute("visibility", "visible"); } else dot.setAttribute("visibility", "hidden");
      showTip(f, html(b), X, pt.y);
    });
    hov.addEventListener("pointerleave", () => { f.tip.hidden = true; line.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); });
  }

  $("#pmf-csv").addEventListener("click", () => {
    const r = lastResult; if (!r) return;
    const rows = [`# WindowWise PMF, T=${r.opts.T} K, energy ${r.opts.unit}, zero at minimum`, `xi_${r.opts.lunit},F,${r.err ? "F_err" : ""}`];
    r.bins.centers.forEach((x, b) => rows.push(`${x.toFixed(6)},${Number.isFinite(r.F[b]) ? r.F[b].toFixed(5) : ""},${r.err && Number.isFinite(r.err[b]) ? r.err[b].toFixed(5) : ""}`));
    download("pmf_windowwise.csv", rows.join("\n"), "text/csv");
  });

  // Re-render charts when the colour theme changes.
  const rerender = () => { renderPlan(); if (lastResult && !$("#panel-analyze").hidden) renderResults(lastResult); };
  new MutationObserver(rerender).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", rerender);
  renderPlan();
})();
