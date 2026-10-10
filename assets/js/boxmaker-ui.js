(function () {
  "use strict";
  const M = window.MAT, S = window.SMC, A = window.APP, root = document.getElementById("bm");
  if (!M || !S || !A || !root) return;
  const $ = s => root.querySelector(s), $$ = s => Array.from(root.querySelectorAll(s));
  const T = s => A.tex(s), f = (v, d) => S.fmt(v, d == null ? 3 : d);
  const PRESETS = {
    NaCl: { name: "NaCl", M: 58.44, value: 0.15, unit: "M", ions: ["NA", "CL"] }, KCl: { name: "KCl", M: 74.55, value: 0.15, unit: "M", ions: ["K", "CL"] },
    urea: { name: "urea", M: 60.06, value: 1, unit: "M" }, glycine: { name: "glycine", M: 75.07, value: 2, unit: "m" }, TMAO: { name: "TMAO", M: 75.11, value: 0.5, unit: "M" },
    glucose: { name: "glucose", M: 180.16, value: 10, unit: "wt%" }, trehalose: { name: "trehalose", M: 342.30, value: 0.5, unit: "m" }, ethanol: { name: "ethanol", M: 46.07, value: 0.1, unit: "x" },
    custom: { name: "molecule", M: 100, value: 1, unit: "M" }
  };
  const UNITS = [["M", "mol/L"], ["m", "mol/kg"], ["wt%", "mass %"], ["x", "mole fraction"], ["count", "molecules"]];
  let solutes = [Object.assign({}, PRESETS.glycine), Object.assign({}, PRESETS.NaCl)], res = null;
  const view = window.KBView ? window.KBView($("#bm-box"), $("#bm-halo")) : null;

  function rows() {
    $("#bm-rows").innerHTML = solutes.map((s, i) => `<div class="bm-row">
      <input class="bm-name" data-i="${i}" data-k="name" value="${A.esc(s.name)}" aria-label="Name">
      <button type="button" class="bm-del" data-del="${i}" aria-label="Remove ${A.esc(s.name)}">✕</button>
      <span class="fld-in"><input type="number" step="any" data-i="${i}" data-k="value" value="${s.value}" aria-label="Amount"><select data-i="${i}" data-k="unit" aria-label="Unit">${UNITS.map(([u, l]) => `<option value="${u}"${u === s.unit ? " selected" : ""}>${l}</option>`).join("")}</select></span>
      <span class="fld-in"><input type="number" step="any" data-i="${i}" data-k="M" value="${s.M}" aria-label="Molar mass"><em>g/mol</em></span>
    </div>`).join("") || `<p class="hint">Pure solvent. Add a solute below.</p>`;
  }
  $("#bm-rows").addEventListener("input", e => { const el = e.target, i = +el.dataset.i, k = el.dataset.k; if (!k) return; solutes[i][k] = k === "name" || k === "unit" ? el.value : parseFloat(el.value); compute(); });
  $("#bm-rows").addEventListener("click", e => { const b = e.target.closest("[data-del]"); if (!b) return; solutes.splice(+b.dataset.del, 1); rows(); compute(); });
  $("#bm-add").addEventListener("change", e => { const p = PRESETS[e.target.value]; if (p) { solutes.push(Object.assign({}, p)); rows(); compute(); } e.target.value = ""; });
  $("#bm-sol").addEventListener("change", () => { $("#bm-rho").value = M.SOLVENTS[$("#bm-sol").value][0]; compute(); });
  $("#bm-L").addEventListener("input", () => { $("#bm-V").value = ((+$("#bm-L").value) ** 3).toFixed(3); compute(); });
  $("#bm-V").addEventListener("input", () => { const V = parseFloat($("#bm-V").value); if (V > 0) $("#bm-L").value = Math.cbrt(V); compute(); });
  $("#bm-rho").addEventListener("input", compute);

  const valid = () => solutes.filter(s => s.name && s.M > 0 && s.value >= 0);
  function compute() {
    const V = parseFloat($("#bm-V").value), sol = $("#bm-sol").value, rho = parseFloat($("#bm-rho").value);
    if (!(V > 0)) return;
    $("#bm-L-o").textContent = `${Math.cbrt(V).toFixed(2)} nm`;
    const sl = valid().map(s => Object.assign({}, s));
    res = { V, sol, rho, sl, r: M.counts(V, sl, sol, rho) };
    render();
  }
  const unitLabel = u => ({ M: "M", m: "mol/kg", "wt%": "wt%", x: "", count: "" })[u];
  function achievedIn(s, ac, r) {
    if (s.unit === "M") return ac.M; if (s.unit === "m") return ac.m; if (s.unit === "x") return ac.x;
    if (s.unit === "wt%") return 100 * r.counts[s.name] * s.M / (res.rho * res.V * 1e-21 * M.NA); return r.counts[s.name];
  }
  function render() {
    const { r, sl, sol, V } = res, Nw = r.counts.solvent, totalSolute = sl.reduce((a, s) => a + r.counts[s.name], 0);
    $("#bm-title").innerHTML = `${Nw.toLocaleString()} ${sol} ${sl.length ? "· " + sl.map(s => `${r.counts[s.name].toLocaleString()} ${A.esc(s.name)}`).join(" · ") : ""}`;
    const worst = sl.map(s => { const tgt = s.value, got = achievedIn(s, r.achieved[s.name], r); return { s, err: tgt ? (got - tgt) / tgt : 0, got }; }).sort((a, b) => Math.abs(b.err) - Math.abs(a.err))[0];
    $("#bm-story").innerHTML = `A ${T(`L = ${Math.cbrt(V).toFixed(3)}\\ \\mathrm{nm}`)} box (${f(V, 2)} nm³) at ${f(res.rho, 4)} g/cm³. ` +
      (worst && Math.abs(worst.err) > 0.005 ? `Rounding to whole molecules moves <b>${A.esc(worst.s.name)}</b> ${worst.err > 0 ? "above" : "below"} its target by <b>${(Math.abs(worst.err) * 100).toFixed(1)}%</b>${Math.abs(worst.err) > 0.05 ? "; a larger box would bring it closer" : ""}. ` : sl.length ? "All targets are reached to within 0.5% after rounding. " : "") +
      (sl.some(s => PRESETS[s.name] && PRESETS[s.name].ions) ? "Salts are counted as ion pairs: add that many cations and anions." : "");
    $("#bm-table").innerHTML = `<thead><tr><th>Species</th><th>Count</th><th>Target</th><th>Achieved</th><th>${T("c")} (M)</th><th>${T("x")}</th></tr></thead><tbody>
      <tr><td><b>${sol}</b></td><td>${Nw.toLocaleString()}</td><td>fills box</td><td></td><td>${f(Nw / M.NA / (V * 1e-24), 2)}</td><td>${f(Nw / Math.max(1, Nw + totalSolute), 4)}</td></tr>
      ${sl.map(s => { const ac = r.achieved[s.name], got = achievedIn(s, ac, r); return `<tr><td><b>${A.esc(s.name)}</b></td><td>${r.counts[s.name].toLocaleString()}</td><td>${s.value} ${unitLabel(s.unit) || (s.unit === "x" ? "(x)" : "")}</td><td>${s.unit === "count" ? "–" : f(got, s.unit === "x" ? 4 : 3)}</td><td>${f(ac.M, 4)}</td><td>${f(ac.x, 4)}</td></tr>`; }).join("")}</tbody>`;
    if (view) {
      view.update({ V, nw: Nw, nc: totalSolute, T: 298, mode: "binary", unit: "nm", rdf: null, resetScale: !res.scaled });
      res.scaled = true;
    }
    $("#bm-legend").innerHTML = `<span><i style="background:#6f8fe8"></i>${sol}</span><span><i style="background:#f0a04b"></i>solutes</span>`;
    drawRound(); commands();
  }
  function drawRound() {
    const host = $("#mc-round"), tk = S.tokens();
    const cands = res.sl.filter(q => q.unit !== "count" && q.value > 0);
    const s = cands.sort((a, b) => Math.abs(achievedIn(b, res.r.achieved[b.name], res.r) / b.value - 1) - Math.abs(achievedIn(a, res.r.achieved[a.name], res.r) / a.value - 1))[0];
    if (!s || s.unit === "count") { host.innerHTML = `<p class="hint">Add a solute with a concentration to see the rounding error.</p>`; return; }
    const L0 = Math.cbrt(res.V), xs = [], ys = [];
    for (let L = 2; L <= 12.0001; L += 0.02) { const r = M.counts(L ** 3, res.sl, res.sol, res.rho); xs.push(L); ys.push(achievedIn(s, r.achieved[s.name], r)); }
    const hi = s.value * 2, lab = s.unit === "M" ? "c (mol/L)" : s.unit === "m" ? "molality (mol/kg)" : s.unit === "x" ? "mole fraction" : "mass %";
    const fr = S.frame(host, { x0: 2, x1: 12, y0: 0, y1: hi, xLabel: "box edge L (nm)", yLabel: `achieved ${lab}`, yd: 3, xd: 0, label: "Achieved concentration vs box size", height: 280 });
    S.hline(fr, s.value, { stroke: tk.series2, "stroke-dasharray": "6 4" });
    S.line(fr, xs, ys.map(v => Math.min(v, hi)), { stroke: tk.series, "stroke-width": 1.6 });
    S.el("line", { x1: fr.x(L0), x2: fr.x(L0), y1: fr.m.t, y2: fr.H - fr.m.b, stroke: tk.ink2, "stroke-dasharray": "3 3" }, fr.svg);
    S.el("text", { x: fr.x(L0) + 6, y: fr.m.t + 12, class: "lbl" }, fr.svg).textContent = "your box";
    S.crosshair(fr, xs, i => `<b>L = ${xs[i].toFixed(2)} nm</b><br>${A.esc(s.name)}: ${f(ys[i], 4)} (${((ys[i] / s.value - 1) * 100).toFixed(1)}%)`, i => Math.min(ys[i], hi));
    S.legend(fr, [{ label: `${s.name} after rounding`, color: tk.series }, { label: `target ${s.value}`, color: tk.series2, dash: true }]);
    A.chartTools(host, "boxmaker_rounding");
  }
  function commands() {
    const { r, sl, sol } = res, L = Math.cbrt(res.V).toFixed(3), g = ["# GROMACS: build an empty box, insert solutes, then solvate"];
    g.push(`gmx editconf -f solute.gro -o box.gro -box ${L} ${L} ${L} -bt cubic`);
    sl.forEach(s => { const p = PRESETS[s.name]; if (p && p.ions) return; g.push(`gmx insert-molecules -f box.gro -ci ${s.name}.gro -nmol ${r.counts[s.name]} -o box.gro -try 500`); });
    g.push(`gmx solvate -cp box.gro -cs spc216.gro -maxsol ${r.counts.solvent} -o solvated.gro -p topol.top`);
    sl.forEach(s => { const p = PRESETS[s.name]; if (p && p.ions) g.push(`gmx genion -s ions.tpr -o solvated_ions.gro -p topol.top -pname ${p.ions[0]} -nname ${p.ions[1]} -np ${r.counts[s.name]} -nn ${r.counts[s.name]}`); });
    $("#bm-gmx").textContent = g.join("\n");
    const a = (+L * 10 - 2).toFixed(1), pk = ["# Packmol input written by BoxMaker (coordinates in Å, 1 Å margin)", "tolerance 2.0", "filetype pdb", "output box.pdb", "",
      `structure ${sol}.pdb`, `  number ${r.counts.solvent}`, `  inside box 1. 1. 1. ${a} ${a} ${a}`, "end structure"];
    sl.forEach(s => pk.push("", `structure ${s.name}.pdb`, `  number ${r.counts[s.name]}`, `  inside box 1. 1. 1. ${a} ${a} ${a}`, "end structure"));
    $("#bm-pack").textContent = pk.join("\n");
  }
  A.tabs($("#bm-tabs"));
  $("#bm-copycmd").addEventListener("click", () => A.copy($("#bm-gmx").textContent, "GROMACS commands copied"));
  $("#bm-dlpack").addEventListener("click", () => A.download("box.inp", $("#bm-pack").textContent));
  $("#bm-csv").addEventListener("click", () => A.download("boxmaker_counts.csv", "species,count,target,unit,molarity_M,molality_mol_per_kg,mole_fraction\n" + `${res.sol},${res.r.counts.solvent},,,,,\n` + res.sl.map(s => { const ac = res.r.achieved[s.name]; return `${s.name},${res.r.counts[s.name]},${s.value},${s.unit},${ac.M.toFixed(5)},${ac.m.toFixed(5)},${ac.x.toFixed(6)}`; }).join("\n"), "text/csv"));
  $("#bm-copy").addEventListener("click", () => A.copy(`Simulation box ${Math.cbrt(res.V).toFixed(3)} nm (cubic): ${res.r.counts.solvent} ${res.sol}${res.sl.map(s => `, ${res.r.counts[s.name]} ${s.name}`).join("")}. Counts from BoxMaker (https://siba-p.github.io/boxmaker/).`));
  $("#bm-report").addEventListener("click", () => A.report({ title: "Simulation box composition", subtitle: `${Math.cbrt(res.V).toFixed(3)} nm cubic box`, tool: "BoxMaker", filename: "boxmaker_report.html", sections: [{ title: "Composition", html: `<p>${$("#bm-story").innerHTML}</p>${$("#bm-table").outerHTML}` }, { title: "Rounding error", svgs: [$("#mc-round svg")].filter(Boolean) }, { title: "Commands", html: `<pre>${A.esc($("#bm-gmx").textContent)}</pre><pre>${A.esc($("#bm-pack").textContent)}</pre>` }] }));
  S.onTheme(() => { if (res) render(); });
  rows(); compute();
})();
