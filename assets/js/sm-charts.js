/* Minimal theme-aware SVG chart kit shared by the KBkit and Converge web apps. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const STATUS = { warning: "#fab219", critical: "#d03b3b", good: "#0ca30c" };

  function tokens() {
    const cs = getComputedStyle(document.documentElement);
    const dark = cs.colorScheme === "dark" || document.documentElement.dataset.theme === "dark";
    return {
      dark, series: dark ? "#3987e5" : "#2a78d6", series2: dark ? "#d95926" : "#eb6834",
      ink: cs.getPropertyValue("--ink").trim(), ink2: cs.getPropertyValue("--ink-2").trim(), ink3: cs.getPropertyValue("--ink-3").trim(),
      line: cs.getPropertyValue("--line").trim(), surface: cs.getPropertyValue("--card").trim(), neutral: dark ? "#6b7690" : "#a3abba"
    };
  }
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function niceTicks(lo, hi, n) {
    const span = hi - lo || 1, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  const fmt = (v, d) => {
    if (!Number.isFinite(v)) return "–";
    const a = Math.abs(v);
    if (a !== 0 && a < 1e-3) return v.toExponential(2);
    if (a >= 1e4) return v.toLocaleString(undefined, { maximumFractionDigits: a >= 1e5 ? 0 : 1 });
    return a >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: Math.min(2, d == null ? 2 : d) }) : (+v).toFixed(d == null ? 2 : d);
  };
  function frame(host, o) {
    host.innerHTML = "";
    const W = 640, H = o.height || 260, m = { l: 58, r: 14, t: 14, b: 40 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": o.label || "" }, host);
    const tk = tokens();
    const x = v => m.l + (v - o.x0) / (o.x1 - o.x0) * (W - m.l - m.r);
    const y = v => H - m.b - (v - o.y0) / (o.y1 - o.y0) * (H - m.t - m.b);
    const g = el("g", {}, svg);
    niceTicks(o.y0, o.y1, 5).forEach(v => {
      el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: tk.line }, g);
      el("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end", class: "ww-tick" }, g).textContent = o.yFmt ? o.yFmt(v) : fmt(v, o.yd);
    });
    (o.xTicks || niceTicks(o.x0, o.x1, 7)).forEach(v => {
      el("line", { x1: x(v), x2: x(v), y1: H - m.b, y2: H - m.b + 4, stroke: tk.ink3 }, g);
      el("text", { x: x(v), y: H - m.b + 17, "text-anchor": "middle", class: "ww-tick" }, g).textContent = o.xFmt ? o.xFmt(v) : fmt(v, o.xd);
    });
    el("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: tk.ink3 }, g);
    el("text", { x: (m.l + W - m.r) / 2, y: H - 4, "text-anchor": "middle", class: "ww-axis" }, g).textContent = o.xLabel || "";
    const cy = (m.t + H - m.b) / 2;
    el("text", { x: 14, y: cy, "text-anchor": "middle", class: "ww-axis", transform: `rotate(-90 14 ${cy})` }, g).textContent = o.yLabel || "";
    const tip = document.createElement("div"); tip.className = "ww-tip"; tip.hidden = true; host.appendChild(tip);
    return { svg, x, y, W, H, m, tk, tip, host, o };
  }
  function line(f, xs, ys, attrs) {
    let d = "", pen = false;
    for (let i = 0; i < xs.length; i++) {
      if (!Number.isFinite(ys[i]) || !Number.isFinite(xs[i])) { pen = false; continue; }
      d += (pen ? "L" : "M") + f.x(xs[i]).toFixed(1) + " " + f.y(ys[i]).toFixed(1); pen = true;
    }
    return el("path", Object.assign({ d, fill: "none", "stroke-width": 2, "stroke-linejoin": "round" }, attrs), f.svg);
  }
  function band(f, xs, lo, hi, color, opacity) {
    let d = "";
    xs.forEach((x, i) => { d += (i ? "L" : "M") + f.x(x).toFixed(1) + " " + f.y(hi[i]).toFixed(1); });
    for (let i = xs.length - 1; i >= 0; i--) d += "L" + f.x(xs[i]).toFixed(1) + " " + f.y(lo[i]).toFixed(1);
    return el("path", { d: d + "Z", fill: color, "fill-opacity": opacity || 0.18, stroke: "none" }, f.svg);
  }
  function hline(f, v, attrs) {
    return el("line", Object.assign({ x1: f.m.l, x2: f.W - f.m.r, y1: f.y(v), y2: f.y(v), "stroke-width": 1.5 }, attrs), f.svg);
  }
  function svgPoint(f, e) {
    const r = f.svg.getBoundingClientRect();
    return { x: (e.clientX - r.left) * f.W / r.width, y: (e.clientY - r.top) * f.H / r.height };
  }
  function showTip(f, html, px, py) {
    f.tip.innerHTML = html; f.tip.hidden = false;
    const r = f.host.getBoundingClientRect(), s = r.width / f.W;
    let left = px * s + 12;
    if (left + f.tip.offsetWidth > r.width) left = px * s - f.tip.offsetWidth - 12;
    f.tip.style.left = left + "px"; f.tip.style.top = Math.max(0, py * s - 10) + "px";
  }
  // Crosshair + tooltip for line charts; nearest index by x.
  function crosshair(f, xs, html, yAt) {
    const ln = el("line", { y1: f.m.t, y2: f.H - f.m.b, stroke: f.tk.ink3, visibility: "hidden" }, f.svg);
    const dot = el("circle", { r: 4.5, fill: f.tk.series, stroke: f.tk.surface, "stroke-width": 2, visibility: "hidden" }, f.svg);
    const hit = el("rect", { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: "transparent" }, f.svg);
    hit.addEventListener("pointermove", e => {
      const p = svgPoint(f, e), xv = f.o.x0 + (p.x - f.m.l) / (f.W - f.m.l - f.m.r) * (f.o.x1 - f.o.x0);
      let lo = 0, hi = xs.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] < xv) lo = mid; else hi = mid; }
      const i = Math.abs(xs[lo] - xv) < Math.abs(xs[hi] - xv) ? lo : hi, X = f.x(xs[i]);
      ln.setAttribute("x1", X); ln.setAttribute("x2", X); ln.setAttribute("visibility", "visible");
      const yv = yAt ? yAt(i) : NaN;
      if (Number.isFinite(yv)) { dot.setAttribute("cx", X); dot.setAttribute("cy", f.y(yv)); dot.setAttribute("visibility", "visible"); }
      else dot.setAttribute("visibility", "hidden");
      showTip(f, html(i), X, p.y);
    });
    hit.addEventListener("pointerleave", () => { f.tip.hidden = true; ln.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); });
  }
  function legend(f, items) {
    const d = document.createElement("div"); d.className = "ww-hlegend";
    d.innerHTML = items.map(it => `<span><i ${it.dash ? 'class="dash" ' : ""}style="${it.dash ? "border-color" : "background"}:${it.color}"></i>${it.label}</span>`).join("");
    f.host.appendChild(d);
  }
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type || "text/plain" }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function onTheme(cb) {
    new MutationObserver(cb).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", cb);
  }
  window.SMC = { STATUS, tokens, el, frame, line, band, hline, svgPoint, showTip, crosshair, legend, download, onTheme, fmt };
})();
