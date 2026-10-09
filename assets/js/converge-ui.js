(function () {
  "use strict";
  const C = window.CVG, S = window.SMC, root = document.getElementById("cv");
  if (!C || !S || !root) return;
  const $ = s => root.querySelector(s);
  let data = null, reports = [], sel = 0;

  async function load(text, name) {
    try { data = C.parseXvg(text); } catch (e) { alert(e.message); return; }
    data.name = name;
    const dt = data.t.length > 1 ? data.t[1] - data.t[0] : 1;
    reports = data.cols.map((c, i) => { try { return C.analyze(c, data.names[i], dt); } catch (e) { return null; } });
    sel = Math.max(0, reports.findIndex(Boolean));
    $("#cv-results").hidden = false;
    $("#cv-file-name").textContent = `· ${name}`;
    renderTable(); renderOne();
  }
  const fmt = (v, d) => S.fmt(v, d == null ? 4 : d);
  function renderTable() {
    const target = parseFloat($("#cv-target").value);
    $("#cv-need-h").hidden = !(target > 0);
    const tb = $("#cv-summary tbody"); tb.innerHTML = "";
    reports.forEach((r, i) => {
      const tr = document.createElement("tr");
      tr.className = "cv-row" + (i === sel ? " sel" : "");
      if (!r) { tr.innerHTML = `<td>${data.names[i]}</td><td colspan="5">too few samples</td>`; tb.appendChild(tr); return; }
      const st = r.verdict === "converged" ? "good" : r.verdict === "not converged" ? "critical" : "warning";
      tr.innerHTML = `<td><b>${r.name}</b></td><td>${fmt(r.mean)} ± ${fmt(r.semBest, 3)}</td><td>${fmt(data.t[r.t0] - data.t[0], 1)}</td><td>${fmt(r.tau, 2)}</td><td>${Math.round(r.neff).toLocaleString()}</td>
        <td><span class="ww-st ${st}" style="width:20px;height:20px;font-size:.7rem">${st === "good" ? "✓" : st === "critical" ? "✕" : "!"}</span> ${r.verdict}</td>${target > 0 ? `<td>${fmt(r.lengthFor(target), 0)}</td>` : ""}`;
      tr.addEventListener("click", () => { sel = i; renderTable(); renderOne(); });
      tb.appendChild(tr);
    });
  }
  function renderOne() {
    const r = reports[sel]; if (!r) return;
    const t = data.t, x = data.cols[sel], st = r.verdict === "converged" ? "good" : r.verdict === "not converged" ? "critical" : "warning";
    $("#cv-verdict").innerHTML = `<span class="ww-st ${st}">${st === "good" ? "✓" : st === "critical" ? "✕" : "!"}</span><div><b>${r.name}: ${r.verdict}.</b> ${fmt(r.mean)} ± ${fmt(r.semBest, 3)} from ${Math.round(r.neff).toLocaleString()} independent samples, after discarding the first ${fmt(t[r.t0] - t[0], 1)} time units.</div>`;
    $("#cv-series-title").textContent = `${r.name} over time`;
    // time series (min/max decimation for long runs)
    const step = Math.max(1, Math.floor(x.length / 1500)), xs = [], ys = [];
    for (let i = 0; i < x.length; i += step) {
      let lo = Infinity, hi = -Infinity, ilo = i, ihi = i;
      for (let j = i; j < Math.min(x.length, i + step); j++) { if (x[j] < lo) { lo = x[j]; ilo = j; } if (x[j] > hi) { hi = x[j]; ihi = j; } }
      if (ilo <= ihi) { xs.push(t[ilo], t[ihi]); ys.push(lo, hi); } else { xs.push(t[ihi], t[ilo]); ys.push(hi, lo); }
    }
    let ymin = Math.min(...ys), ymax = Math.max(...ys); const pad = (ymax - ymin) * 0.06 || 1;
    const span = ymax - ymin, yd = span > 50 ? 0 : span > 5 ? 1 : span > 0.5 ? 2 : 3;
    const f = S.frame($("#cv-series"), { x0: t[0], x1: t[t.length - 1], y0: ymin - pad, y1: ymax + pad, xLabel: "time", yLabel: r.name, yd, xd: 0, yFmt: v => v.toFixed(yd), label: `${r.name} time series`, height: 250 });
    S.el("rect", { x: f.x(t[0]), y: f.m.t, width: Math.max(0, f.x(t[r.t0]) - f.x(t[0])), height: f.H - f.m.t - f.m.b, fill: f.tk.neutral, "fill-opacity": 0.22 }, f.svg);
    S.line(f, xs, ys, { stroke: f.tk.series, "stroke-width": 1, "stroke-opacity": 0.9 });
    S.band(f, [t[r.t0], t[t.length - 1]], [r.mean - 2 * r.semBest, r.mean - 2 * r.semBest], [r.mean + 2 * r.semBest, r.mean + 2 * r.semBest], f.tk.series2, 0.25);
    S.el("line", { x1: f.x(t[r.t0]), x2: f.x(t[t.length - 1]), y1: f.y(r.mean), y2: f.y(r.mean), stroke: f.tk.series2, "stroke-width": 2 }, f.svg);
    S.crosshair(f, xs, i => `<b>t = ${fmt(xs[i], 2)}</b><br>${r.name} = ${fmt(ys[i])}${xs[i] < t[r.t0] ? "<br>(discarded)" : ""}`, i => ys[i]);
    S.legend(f, [{ label: "data", color: f.tk.series }, { label: "mean ± 2 SEM (production)", color: f.tk.series2 }, { label: "discarded as equilibration", color: f.tk.neutral }]);

    // blocking
    const b = r.blocking, lx = b.sizes.map(s => Math.log2(s));
    const top = Math.max(...b.sems.map((s, i) => s + b.errs[i])) * 1.1;
    const fb = S.frame($("#cv-blocking"), { x0: -0.3, x1: lx[lx.length - 1] + 0.3, y0: 0, y1: top, xLabel: "block size (frames)", yLabel: "SEM", yd: 3, xTicks: lx.filter((_, i) => i % Math.ceil(lx.length / 8) === 0), xFmt: v => (2 ** v).toLocaleString(), label: "Block averaging", height: 230 });
    S.hline(fb, b.semPlateau, { stroke: fb.tk.series2, "stroke-dasharray": "5 4" });
    lx.forEach((v, i) => {
      S.el("line", { x1: fb.x(v), x2: fb.x(v), y1: fb.y(b.sems[i] - b.errs[i]), y2: fb.y(b.sems[i] + b.errs[i]), stroke: fb.tk.series, "stroke-width": 1.5 }, fb.svg);
      S.el("circle", { cx: fb.x(v), cy: fb.y(b.sems[i]), r: i === b.idx ? 6 : 4.5, fill: i === b.idx ? fb.tk.series2 : fb.tk.series, stroke: fb.tk.surface, "stroke-width": 2 }, fb.svg);
    });
    S.crosshair(fb, lx, i => `<b>block ${b.sizes[i].toLocaleString()} frames</b><br>SEM ${fmt(b.sems[i])} ± ${fmt(b.errs[i])}${i === b.idx ? "<br>plateau" : ""}`, i => b.sems[i]);

    // ACF
    const win = Math.max(10, Math.min(r.acf.length - 1, Math.round(r.tau / r.dt * 12))), ax = [], ay = [];
    for (let i = 0; i <= win; i++) { ax.push(i * r.dt); ay.push(r.acf[i]); }
    const fa = S.frame($("#cv-acf"), { x0: 0, x1: ax[ax.length - 1], y0: Math.min(-0.1, ...ay), y1: 1.05, xLabel: "lag (time)", yLabel: "ρ(lag)", yd: 1, label: "Autocorrelation", height: 230 });
    S.hline(fa, 0, { stroke: fa.tk.ink3, "stroke-width": 1 });
    const sok = Math.min(ax[ax.length - 1], 5 * r.tau);
    S.el("line", { x1: fa.x(sok), x2: fa.x(sok), y1: fa.m.t, y2: fa.H - fa.m.b, stroke: fa.tk.series2, "stroke-dasharray": "5 4" }, fa.svg);
    S.line(fa, ax, ay, { stroke: fa.tk.series });
    S.crosshair(fa, ax, i => `<b>lag ${fmt(ax[i], 2)}</b><br>ρ = ${fmt(ay[i], 3)}`, i => ay[i]);

    const rows = [
      ["Mean", fmt(r.mean)], ["SEM (autocorrelation)", fmt(r.sem)], ["SEM (block averaging)", fmt(r.semBlocking)],
      ["Equilibration t₀ (Chodera)", fmt(t[r.t0] - t[0], 1)], ["Equilibration t₀ (MSER-5)", fmt(t[r.t0Mser] - t[0], 1)],
      ["τ_int", fmt(r.tau, 3)], ["Statistical inefficiency g", fmt(r.g, 2)], ["Independent samples", Math.round(r.neff).toLocaleString()],
      ["Half-vs-half drift", `${fmt(r.driftZ, 2)} σ`], ["Linear trend", `${fmt(r.trendZ, 2)} σ`]
    ];
    $("#cv-details").innerHTML = rows.map(([a, v]) => `<div><dt>${a}</dt><dd>${v}</dd></div>`).join("");
    $("#cv-flags").innerHTML = r.flags.length ? r.flags.map(fl => `<li><span class="ww-st ${fl.level}">${fl.level === "critical" ? "✕" : "!"}</span><div><b>${fl.level === "critical" ? "Critical" : "Warning"}</b><br>${fl.text}</div></li>`).join("")
      : `<li><span class="ww-st good">✓</span><div><b>No issues</b><br>Stationary, well sampled, and the two error estimates agree.</div></li>`;
  }

  $("#cv-file").addEventListener("change", async e => { const f = e.target.files[0]; if (f) load(await f.text(), f.name); e.target.value = ""; });
  const drop = $("#cv-drop");
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", async e => { const f = e.dataTransfer.files[0]; if (f) load(await f.text(), f.name); });
  $("#cv-demo").addEventListener("click", async () => {
    const res = await fetch(root.dataset.demo || "/data/converge-energy.xvg");
    load(await res.text(), "example energy.xvg");
  });
  $("#cv-target").addEventListener("input", () => { if (reports.length) renderTable(); });
  S.onTheme(() => { if (reports.length) renderOne(); });
})();
