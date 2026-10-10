(function () {
  "use strict";
  const M = window.MAT, S = window.SMC, A = window.APP, root = document.getElementById("br");
  if (!M || !S || !A || !root) return;
  const $ = s => root.querySelector(s);
  const T = s => A.tex(s), f = (v, d) => S.fmt(v, d == null ? 3 : d);
  const sizeFromSlider = v => +(Math.pow(10, 0.3 + v / 100 * (2.3 - 0.3))).toFixed(1); // 2 .. 200 nm, log scale
  let res = null;
  $("#br-D").value = 42; // ~ 8 nm

  function read() {
    const mat = $("#br-mat").value, [struct, , , a0] = M.MATERIALS[mat];
    return { mat, struct, a0, a: parseFloat($("#br-a").value) || a0, src: $("#br-src").value, lam: M.WAVELENGTHS[$("#br-src").value],
      D: sizeFromSlider(+$("#br-D").value), eps: +$("#br-e").value / 100, ins: parseFloat($("#br-ins").value) || 0, B: parseFloat($("#br-B").value) || 0,
      t1: parseFloat($("#br-t1").value) || 10, t2: parseFloat($("#br-t2").value) || 100 };
  }
  function compute() {
    const o = read();
    $("#br-struct").textContent = o.struct; $("#br-lam").textContent = `${o.lam.toFixed(4)} Å`;
    $("#br-D-o").textContent = `${f(o.D, o.D < 10 ? 1 : 0)} nm`; $("#br-e-o").textContent = `${(o.eps * 100).toFixed(2)}%`;
    const pk = M.peaks(o.mat, o.lam, o.a, o.t1, o.t2, o.B);
    const pat = M.pattern(pk, o.lam, o.D, o.eps, o.ins, o.t1, o.t2, 3000);
    const bulk = $("#br-bulk").checked ? M.pattern(pk, o.lam, 200, 0, o.ins, o.t1, o.t2, 3000) : null;
    res = { o, pk, pat, bulk };
    render();
  }
  const hkl = p => `(${p.hkl.join("")})`;
  function render() {
    const { o, pk, pat, bulk } = res, tk = S.tokens();
    const top = pk.slice().sort((a, b) => b.I - a.I)[0];
    const strainPct = (o.a / o.a0 - 1) * 100;
    $("#br-title").innerHTML = `${o.mat} <span class="muted" style="font-weight:500">· ${o.struct}, ${T(`a = ${o.a.toFixed(4)}\\ \\text{Å}`)}</span>`;
    const fw = top ? M.fwhm(top.tt, o.lam, o.D, o.eps, o.ins) : 0;
    $("#br-sub").innerHTML = top ? `${pk.length} reflections between ${o.t1}° and ${o.t2}° with ${o.src}. The strongest, ${hkl(top)} at ${f(top.tt, 2)}°, is ${f(fw, 2)}° wide for ${f(o.D, 1)} nm crystallites${o.eps ? ` and ${(o.eps * 100).toFixed(2)}% strain` : ""}.` + (Math.abs(strainPct) > 0.01 ? ` The lattice is ${strainPct > 0 ? "expanded" : "compressed"} by ${Math.abs(strainPct).toFixed(2)}% relative to the reference, so every peak shifts ${strainPct > 0 ? "to lower" : "to higher"} angle.` : "") : "No allowed reflections in this range.";
    const fr = S.frame($("#bc-pattern"), { x0: o.t1, x1: o.t2, y0: 0, y1: 118, xLabel: "2θ (degrees)", yLabel: "intensity (a.u.)", yd: 0, xd: 0, label: "Powder diffraction pattern", height: 330 });
    if (bulk) S.line(fr, bulk.x, bulk.y, { stroke: tk.neutral, "stroke-width": 1.2 });
    S.band(fr, pat.x, pat.x.map(() => 0), pat.y, tk.series, 0.12);
    S.line(fr, pat.x, pat.y, { stroke: tk.series, "stroke-width": 2 });
    pk.forEach(p => {
      S.el("line", { x1: fr.x(p.tt), x2: fr.x(p.tt), y1: fr.y(0), y2: fr.y(0) - 7, stroke: tk.ink2, "stroke-width": 1.4 }, fr.svg);
      if (p.I > 4) S.el("text", { x: fr.x(p.tt), y: fr.y(Math.min(105, Math.max(...pat.y.slice(Math.max(0, idx(p.tt) - 3), idx(p.tt) + 4)))) - 8, "text-anchor": "middle", class: "lbl" }, fr.svg).textContent = p.hkl.join("");
    });
    function idx(tt) { return Math.round((tt - o.t1) / (o.t2 - o.t1) * (pat.x.length - 1)); }
    S.crosshair(fr, pat.x, i => { const n = pk.reduce((b, p) => (Math.abs(p.tt - pat.x[i]) < Math.abs(b.tt - pat.x[i]) ? p : b), pk[0]); return `<b>2θ = ${f(pat.x[i], 2)}°</b><br>I = ${f(pat.y[i], 1)}${n ? `<br>nearest ${hkl(n)}: d = ${f(n.d, 4)} Å` : ""}`; }, i => pat.y[i]);
    const items = [{ label: `D = ${f(o.D, 1)} nm`, color: tk.series }]; if (bulk) items.push({ label: "bulk (200 nm)", color: tk.neutral });
    S.legend(fr, items); A.chartTools($("#bc-pattern"), `${o.mat}_xrd`);
    $("#br-kv").innerHTML = top ? [[`${T("d")}${T("_{" + top.hkl.join("") + "}")}`, `${f(top.d, 4)} Å`], [`FWHM ${hkl(top)}`, `${f(fw, 3)}°`], ["Scherrer size back-calculated", `${f(M.scherrerSize(top.tt, fw, o.lam, o.ins), 2)} nm`], ["Reflections", pk.length]]
      .map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("") : "";
    // table
    $("#br-table").innerHTML = `<thead><tr><th>hkl</th><th>${T("d")} (Å)</th><th>${T("2\\theta")} (°)</th><th>${T("m")}</th><th>${T("|F|^2")}</th><th>${T("I/I_0")}</th><th>FWHM (°)</th></tr></thead><tbody>${pk.map(p => `<tr><td><b>${p.hkl.join(" ")}</b></td><td>${f(p.d, 4)}</td><td>${f(p.tt, 3)}</td><td>${p.m}</td><td>${S.fmt(p.F2, 0)}</td><td>${f(p.I, 1)}</td><td>${f(M.fwhm(p.tt, o.lam, o.D, o.eps, o.ins), 3)}</td></tr>`).join("")}</tbody>`;
    drawWH(); calc();
  }
  function drawWH() {
    const { o, pk } = res, tk = S.tokens();
    // physical broadening (instrument removed) in radians
    const pts = pk.map(p => { const th = p.tt / 2 * Math.PI / 180, bt = M.fwhm(p.tt, o.lam, o.D, o.eps, 0) * Math.PI / 180; return { x: 4 * Math.sin(th), y: bt * Math.cos(th), p }; });
    if (pts.length < 2) { $("#bc-wh").innerHTML = ""; $("#br-whtext").innerHTML = ""; return; }
    const n = pts.length, mx = pts.reduce((a, v) => a + v.x, 0) / n, my = pts.reduce((a, v) => a + v.y, 0) / n;
    let sxx = 0, sxy = 0; pts.forEach(v => { sxx += (v.x - mx) ** 2; sxy += (v.x - mx) * (v.y - my); });
    const slope = sxy / sxx, icpt = my - slope * mx, D = 0.9 * o.lam / icpt / 10;
    const xmax = Math.max(...pts.map(v => v.x)) * 1.08, ymax = Math.max(...pts.map(v => v.y), icpt + slope * xmax) * 1.15;
    const fr = S.frame($("#bc-wh"), { x0: 0, x1: xmax, y0: 0, y1: ymax, xLabel: "4 sin θ", yLabel: "β cos θ (rad)", yd: 4, xd: 1, yFmt: v => (v * 1000).toFixed(1) + "e-3", label: "Williamson–Hall plot", height: 260 });
    S.line(fr, [0, xmax], [icpt, icpt + slope * xmax], { stroke: tk.series2, "stroke-dasharray": "6 4", "stroke-width": 1.6 });
    pts.forEach(v => { S.el("circle", { cx: fr.x(v.x), cy: fr.y(v.y), r: 5, fill: tk.series, stroke: tk.surface, "stroke-width": 2 }, fr.svg); S.el("text", { x: fr.x(v.x) + 7, y: fr.y(v.y) - 7, class: "lbl" }, fr.svg).textContent = v.p.hkl.join(""); });
    S.crosshair(fr, pts.map(v => v.x), i => `<b>${hkl(pts[i].p)}</b><br>4 sin θ = ${f(pts[i].x, 3)}<br>β cos θ = ${(pts[i].y * 1000).toFixed(3)}×10⁻³`, i => pts[i].y);
    A.chartTools($("#bc-wh"), `${o.mat}_williamson_hall`);
    $("#br-whtext").innerHTML = `<h3>Reading the plot</h3><p>Each reflection's physical width ${T("\\beta")} (instrument removed) is plotted as ${T("\\beta\\cos\\theta")} against ${T("4\\sin\\theta")}. Size broadening is the same for every peak and sets the <b>intercept</b>; strain grows with angle and sets the <b>slope</b>.</p>
      <div class="eqbox two-eq">${A.tex(`\\text{intercept } \\frac{K\\lambda}{D} = ${(icpt * 1000).toFixed(3)}\\times10^{-3} \\;\\Rightarrow\\; D = ${f(D, 2)}\\ \\mathrm{nm}`, true)}${A.tex(`\\text{slope} \\;\\Rightarrow\\; \\varepsilon = ${(Math.abs(slope) < 1e-9 ? 0 : slope * 100).toFixed(3)}\\,\\%`, true)}</div>
      <p class="hint">The fit recovers the inputs (${f(o.D, 1)} nm, ${(o.eps * 100).toFixed(2)}%), which is how the method is applied to measured data.</p>`;
  }
  function calc() {
    const o = res.o, tt = parseFloat($("#bc-tt").value), fw = parseFloat($("#bc-fw").value), K = parseFloat($("#bc-K").value) || 0.9;
    if (!(tt > 0 && fw > 0)) { $("#bc-out").innerHTML = ""; return; }
    const D = M.scherrerSize(tt, fw, o.lam, o.ins, K), corrected = Math.sqrt(Math.max(fw * fw - o.ins * o.ins, 0));
    $("#bc-out").innerHTML = `<div class="lig-big" style="grid-template-columns:1fr 1fr"><div><b>${f(D, 2)}</b><span>crystallite size (nm)</span></div><div><b>${f(corrected, 3)}°</b><span>FWHM after removing ${o.ins}° instrumental</span></div></div>
      <div class="eqbox">${A.tex(`D = \\frac{K\\lambda}{\\beta\\cos\\theta} = \\frac{${K} \\times ${o.lam.toFixed(4)}\\ \\text{Å}}{${(corrected * Math.PI / 180).toFixed(5)} \\times \\cos ${(tt / 2).toFixed(2)}^\\circ} = ${f(D, 2)}\\ \\mathrm{nm}`, true)}</div>
      <p class="hint">Scherrer gives a volume-weighted lower bound on crystallite size; strain and instrumental broadening make it smaller still unless removed.</p>`;
  }
  $("#br-mat").addEventListener("change", () => { $("#br-a").value = M.MATERIALS[$("#br-mat").value][3]; compute(); });
  ["#br-a", "#br-D", "#br-e", "#br-src", "#br-t1", "#br-t2", "#br-ins", "#br-B", "#br-bulk"].forEach(s => $(s).addEventListener("input", compute));
  ["#bc-tt", "#bc-fw", "#bc-K"].forEach(s => $(s).addEventListener("input", calc));
  A.tabs($("#br-tabs"));
  $("#br-csv").addEventListener("click", () => A.download(`${res.o.mat}_xrd_pattern.csv`, "two_theta_deg,intensity\n" + res.pat.x.map((x, i) => `${x.toFixed(4)},${res.pat.y[i].toFixed(4)}`).join("\n"), "text/csv"));
  $("#br-peaks").addEventListener("click", () => A.download(`${res.o.mat}_reflections.csv`, "h,k,l,d_A,two_theta_deg,multiplicity,F2,I_rel,fwhm_deg\n" + res.pk.map(p => `${p.hkl.join(",")},${p.d.toFixed(5)},${p.tt.toFixed(4)},${p.m},${p.F2.toFixed(2)},${p.I.toFixed(2)},${M.fwhm(p.tt, res.o.lam, res.o.D, res.o.eps, res.o.ins).toFixed(4)}`).join("\n"), "text/csv"));
  $("#br-copy").addEventListener("click", () => A.copy(`Simulated powder XRD of ${res.o.mat} (${res.o.struct}, a = ${res.o.a.toFixed(4)} Å, ${res.o.src}): ${res.pk.slice(0, 5).map(p => `${hkl(p)} ${p.tt.toFixed(2)}°`).join(", ")}; crystallite size ${f(res.o.D, 1)} nm. Computed with Bragg (https://siba-p.github.io/bragg/).`));
  $("#br-report").addEventListener("click", () => A.report({ title: `Powder XRD: ${res.o.mat}`, subtitle: `${res.o.src}, D = ${f(res.o.D, 1)} nm`, tool: "Bragg", filename: `bragg_${res.o.mat}.html`, sections: [{ title: "Pattern", html: `<p>${$("#br-sub").innerHTML}</p>`, svgs: [$("#bc-pattern svg")] }, { title: "Reflections", html: $("#br-table").outerHTML }, { title: "Williamson–Hall", svgs: [$("#bc-wh svg")] }] }));
  S.onTheme(() => res && render());
  $("#br-a").value = M.MATERIALS.Au[3];
  compute();
})();
