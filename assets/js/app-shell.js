/* Shared helpers for the research-tool apps: toasts, gauges, tabs, steppers, chart export, reports, prefs. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";

  let toastEl = null, toastT = 0;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("on"), 2400);
  }

  function level(score) { return score >= 80 ? "good" : score >= 50 ? "warning" : "critical"; }
  const LEVEL_COLOR = { good: "#0ca30c", warning: "#e09a00", critical: "#d03b3b", info: "#3b50e0" };
  // Semicircular gauge, score 0-100.
  function gauge(host, score, label) {
    const lv = level(score), col = LEVEL_COLOR[lv], a = Math.PI * (1 - Math.max(0, Math.min(100, score)) / 100);
    const cx = 75, cy = 78, r = 62, x = cx + r * Math.cos(a), y = cy - r * Math.sin(a);
    host.innerHTML = `<svg class="gauge" viewBox="0 0 150 96" role="img" aria-label="${label} ${Math.round(score)} of 100">
      <path d="M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="var(--line)" stroke-width="11" stroke-linecap="round"/>
      <path d="M${cx - r} ${cy} A${r} ${r} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}" fill="none" stroke="${col}" stroke-width="11" stroke-linecap="round"/>
      <text class="v" x="${cx}" y="${cy - 6}" text-anchor="middle">${Math.round(score)}</text>
      <text class="l" x="${cx}" y="${cy + 14}" text-anchor="middle">${label}</text></svg>`;
    return lv;
  }

  function steps(el, idx) {
    if (!el) return;
    Array.from(el.querySelectorAll("li")).forEach((li, i) => { li.classList.toggle("done", i < idx); li.classList.toggle("on", i === idx); });
  }

  function tabs(bar, onChange) {
    const btns = Array.from(bar.querySelectorAll("[data-view]"));
    const show = v => {
      btns.forEach(b => b.setAttribute("aria-selected", b.dataset.view === v));
      btns.forEach(b => { const p = document.getElementById(b.dataset.view); if (p) p.hidden = b.dataset.view !== v; });
      if (onChange) onChange(v);
    };
    btns.forEach(b => b.addEventListener("click", () => show(b.dataset.view)));
    bar.addEventListener("keydown", e => {
      const i = btns.findIndex(b => b.getAttribute("aria-selected") === "true");
      if (e.key === "ArrowRight") { btns[(i + 1) % btns.length].focus(); btns[(i + 1) % btns.length].click(); }
      if (e.key === "ArrowLeft") { btns[(i - 1 + btns.length) % btns.length].focus(); btns[(i - 1 + btns.length) % btns.length].click(); }
    });
    return show;
  }

  /* ---------- export ---------- */
  function download(name, data, type) {
    const a = document.createElement("a");
    a.href = data instanceof Blob ? URL.createObjectURL(data) : URL.createObjectURL(new Blob([data], { type: type || "text/plain" }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  // Standalone SVG: inline the CSS-driven text colours/fonts and paint the card background.
  function svgString(svg) {
    const cs = getComputedStyle(document.documentElement);
    const ink = cs.getPropertyValue("--ink").trim(), ink2 = cs.getPropertyValue("--ink-2").trim(), ink3 = cs.getPropertyValue("--ink-3").trim();
    const card = cs.getPropertyValue("--card").trim() || "#fff";
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", NS);
    const vb = svg.viewBox.baseVal;
    const bg = document.createElementNS(NS, "rect");
    bg.setAttribute("x", vb.x); bg.setAttribute("y", vb.y); bg.setAttribute("width", vb.width); bg.setAttribute("height", vb.height); bg.setAttribute("fill", card);
    clone.insertBefore(bg, clone.firstChild);
    const style = document.createElementNS(NS, "style");
    style.textContent = `text{font-family:Inter,Helvetica,Arial,sans-serif}.ww-tick{font:500 10.5px 'JetBrains Mono',Menlo,monospace;fill:${ink3}}.ww-axis{font:500 11.5px Inter,Arial,sans-serif;fill:${ink2}}.ww-flagtxt{font:700 12px Inter,Arial,sans-serif;fill:${ink}}.lbl{font:500 11px Inter,Arial,sans-serif;fill:${ink2}}`;
    clone.insertBefore(style, clone.firstChild);
    return new XMLSerializer().serializeToString(clone);
  }
  function svgToPng(svg, name, scale) {
    const s = svgString(svg), vb = svg.viewBox.baseVal, k = scale || 3;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = vb.width * k; c.height = vb.height * k;
      const g = c.getContext("2d"); g.scale(k, k); g.drawImage(img, 0, 0);
      c.toBlob(b => download(name, b), "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
  }
  // Wrap a chart host with hover tools (SVG / PNG download).
  function chartTools(host, name) {
    let wrap = host.parentElement;
    if (!wrap.classList.contains("chart-wrap")) { wrap = document.createElement("div"); wrap.className = "chart-wrap"; host.parentNode.insertBefore(wrap, host); wrap.appendChild(host); }
    wrap.dataset.name = name;
    let tools = wrap.querySelector(".chart-tools");
    if (!tools) {
      tools = document.createElement("div"); tools.className = "chart-tools";
      tools.innerHTML = '<button type="button" data-f="svg" title="Download as SVG (vector)">SVG</button><button type="button" data-f="png" title="Download as PNG (3x)">PNG</button>';
      wrap.appendChild(tools);
      tools.addEventListener("click", e => {
        const f = e.target.dataset.f, svg = host.querySelector("svg"); if (!svg || !f) return;
        const nm = (wrap.dataset.name || "chart").replace(/[^\w.-]+/g, "_");
        if (f === "svg") download(nm + ".svg", svgString(svg), "image/svg+xml"); else svgToPng(svg, nm + ".png");
      });
    }
  }
  // Standalone HTML report.
  function report(o) {
    const date = new Date().toISOString().slice(0, 10);
    const body = o.sections.map(s => `<section><h2>${s.title}</h2>${s.html || ""}${(s.svgs || []).map(svgString).map(x => `<figure>${x}</figure>`).join("")}</section>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${o.title}</title><style>
      body{font:15px/1.6 Inter,Helvetica,Arial,sans-serif;color:#0c1222;max-width:900px;margin:40px auto;padding:0 24px}
      h1{font-size:28px;margin:0 0 4px;letter-spacing:-.02em}h2{font-size:18px;margin:32px 0 10px;border-bottom:1px solid #e6e9ef;padding-bottom:6px}
      .meta{color:#828ca0;font-size:13px}table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e6e9ef}th{color:#828ca0;font-weight:600}
      figure{margin:12px 0}svg{width:100%;height:auto}pre{background:#0d1324;color:#e3e7f1;padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap}
      .kpi{display:inline-block;margin:0 10px 8px 0;padding:6px 10px;border:1px solid #e6e9ef;border-radius:8px;font-size:13px}.kpi b{font-family:Menlo,monospace}
      footer{margin-top:40px;color:#828ca0;font-size:12px}</style></head><body>
      <h1>${o.title}</h1><p class="meta">${o.subtitle || ""} · generated ${date} with ${o.tool} (${location.origin}${location.pathname})</p>${body}
      <footer>${o.footer || ""}</footer></body></html>`;
    download(o.filename || "report.html", html, "text/html");
  }

  const prefs = {
    get(k, d) { try { const v = localStorage.getItem("app:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("app:" + k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
  };
  async function copy(text, okMsg) {
    try { await navigator.clipboard.writeText(text); toast(okMsg || "Copied to clipboard"); }
    catch { toast("Copy blocked by the browser; select the text manually"); }
  }
  function bindDrop(el, onFiles) {
    ["dragenter", "dragover"].forEach(t => el.addEventListener(t, e => { e.preventDefault(); el.classList.add("over"); }));
    ["dragleave", "drop"].forEach(t => el.addEventListener(t, e => { e.preventDefault(); el.classList.remove("over"); }));
    el.addEventListener("drop", e => { if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); });
    const inp = el.querySelector('input[type="file"]');
    if (inp) inp.addEventListener("change", () => { if (inp.files.length) onFiles(inp.files); inp.value = ""; });
    el.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && inp) { e.preventDefault(); inp.click(); } });
  }
  // Seeded RNG + Gaussian for example datasets.
  function rng(seed) {
    let a = seed >>> 0;
    const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return { u, n: () => Math.sqrt(-2 * Math.log(u() + 1e-300)) * Math.cos(2 * Math.PI * u()) };
  }
  // Inline (or display) LaTeX via KaTeX when it is loaded; plain text otherwise.
  const tex = (s, display) => (window.katex ? window.katex.renderToString(s, { throwOnError: false, displayMode: !!display, output: "html" }) : s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  window.APP = { tex, toast, gauge, level, steps, tabs, download, svgString, svgToPng, chartTools, report, prefs, copy, bindDrop, rng, esc };
})();
