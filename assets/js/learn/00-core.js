/* Learn: shared toolkit for the interactive lessons (canvas, axes, controls, maths helpers),
   plus quizzes, progress, copy buttons and in-browser Python cells. Widgets register with
   LW.register(name, mount) and are mounted on <figure class="lw" data-widget="name">. */
(function () {
  "use strict";
  const LW = (window.LW = window.LW || {});
  const reg = {};
  LW.register = (name, fn) => { reg[name] = fn; };

  /* ---------- DOM ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  LW.$ = $; LW.$$ = $$;
  LW.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
    return el;
  };
  const h = LW.h;
  LW.esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  LW.store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  LW.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- numbers ---------- */
  LW.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  LW.lerp = (a, b, t) => a + (b - a) * t;
  LW.linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
  LW.fmt = (v, d = 2) => {
    if (v == null || !isFinite(v)) return "–";
    const a = Math.abs(v);
    if (a !== 0 && (a < 1e-3 || a >= 1e5)) return v.toExponential(Math.max(1, d - 1)).replace("e", "×10^").replace(/\^\+?(-?)(\d+)/, (m, s, e) => "<sup>" + (s ? "−" : "") + e + "</sup>");
    return v.toFixed(d).replace("-", "−");
  };
  LW.fmtTxt = (v, d = 2) => (v == null || !isFinite(v) ? "–" : v.toFixed(d).replace("-", "−"));
  /* seeded random numbers (mulberry32) with a normal sampler */
  LW.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const r = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    let spare = null;
    r.normal = () => { if (spare != null) { const s = spare; spare = null; return s; } let u = 0, v = 0; while (u === 0) u = r(); v = r(); const m = Math.sqrt(-2 * Math.log(u)); spare = m * Math.sin(2 * Math.PI * v); return m * Math.cos(2 * Math.PI * v); };
    return r;
  };
  LW.ticks = function (a, b, n = 5) {
    const span = b - a; if (!(span > 0)) return [a];
    const raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    const step = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * mag;
    const out = []; for (let v = Math.ceil(a / step) * step; v <= b + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return out;
  };
  const tickLabel = (v, step) => { const d = Math.max(0, -Math.floor(Math.log10(step || 1) + 1e-9)); return (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0)) ? v.toExponential(0) : v.toFixed(d).replace("-", "−"); };

  /* ---------- linear algebra (small, dense) ---------- */
  LW.chol = function (A) {          // returns lower-triangular L with A = L Lᵀ, or null
    const n = A.length, L = Array.from({ length: n }, () => new Float64Array(n));
    for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
      let s = A[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) { if (s <= 0) return null; L[i][i] = Math.sqrt(s); } else L[i][j] = s / L[j][j];
    }
    return L;
  };
  LW.cholSolve = function (L, b) {   // solves L Lᵀ x = b
    const n = L.length, y = new Float64Array(n), x = new Float64Array(n);
    for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i][k] * y[k]; y[i] = s / L[i][i]; }
    for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; }
    return x;
  };
  LW.forwardSub = function (L, b) { const n = L.length, y = new Float64Array(n); for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i][k] * y[k]; y[i] = s / L[i][i]; } return y; };
  /* least squares with a ridge penalty: minimise |Xw − y|² + λ|w|² */
  LW.ridge = function (X, y, lam) {
    const p = X[0].length, A = Array.from({ length: p }, () => new Float64Array(p)), b = new Float64Array(p);
    for (let i = 0; i < X.length; i++) for (let a = 0; a < p; a++) { b[a] += X[i][a] * y[i]; for (let c = 0; c <= a; c++) A[a][c] += X[i][a] * X[i][c]; }
    for (let a = 0; a < p; a++) { for (let c = 0; c < a; c++) A[c][a] = A[a][c]; A[a][a] += lam + 1e-12; }
    const L = LW.chol(A); return L ? LW.cholSolve(L, b) : null;
  };

  /* ---------- Gaussian process (1D inputs, squared-exponential kernel) ---------- */
  LW.gp = function (xs, ys, { ell = 1, sf = 1, sn = 0.05, mean = 0 } = {}) {
    const n = xs.length, k = (a, b) => sf * sf * Math.exp(-0.5 * ((a - b) / ell) ** 2);
    if (!n) return { predict: x => ({ mu: mean, sd: sf }) };
    const K = Array.from({ length: n }, (_, i) => Float64Array.from(xs, (xj, j) => k(xs[i], xj) + (i === j ? sn * sn + 1e-10 : 0)));
    const L = LW.chol(K), alpha = LW.cholSolve(L, ys.map(y => y - mean));
    return {
      predict(x) {
        const ks = xs.map(xi => k(x, xi)); let mu = mean; for (let i = 0; i < n; i++) mu += ks[i] * alpha[i];
        const v = LW.forwardSub(L, ks); let s = sf * sf; for (let i = 0; i < n; i++) s -= v[i] * v[i];
        return { mu, sd: Math.sqrt(Math.max(s, 1e-12)) };
      },
      L, alpha, k
    };
  };
  LW.normPdf = z => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  LW.normCdf = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };

  /* ---------- colours that follow the site theme ---------- */
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  LW.dark = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
  LW.colors = function () {
    const d = LW.dark();
    return {
      ink: cssVar("--ink"), ink2: cssVar("--ink-2"), ink3: cssVar("--ink-3"), line: cssVar("--line"), line2: cssVar("--line-2"),
      bg: cssVar("--bg"), bg2: cssVar("--bg-2"), card: cssVar("--card"), accent: cssVar("--accent"), teal: cssVar("--teal"), gold: cssVar("--gold"),
      violet: d ? "#a993ff" : "#6d4fe0", rose: d ? "#ff7aa5" : "#d6336c", orange: d ? "#ff9f5a" : "#e0701c",
      grid: d ? "rgba(255,255,255,.06)" : "rgba(12,18,34,.06)", band: d ? "rgba(135,150,255,.18)" : "rgba(59,80,224,.12)",
      atomA: d ? "#8796ff" : "#3b50e0", atomB: d ? "#ffb26b" : "#e0701c", dark: d
    };
  };
  const themeCbs = new Set();
  LW.onTheme = cb => themeCbs.add(cb);
  const fireTheme = () => themeCbs.forEach(f => { try { f(); } catch (e) { /* ignore */ } });
  new MutationObserver(fireTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", fireTheme);

  /* ---------- canvas that fills its container and survives resizes ---------- */
  LW.canvas = function (parent, { aspect = 0.6, minH = 220, maxH = 480, height } = {}) {
    const cv = h("canvas", { class: "lw-cv" }); parent.append(cv);
    const ctx = cv.getContext("2d"), o = { cv, ctx, W: 0, H: 0, draw: null };
    let lastW = -1;
    const fit = force => {
      const w = Math.round(parent.clientWidth || 600); if (!force && w === lastW) return; lastW = w;
      const hh = height ? (typeof height === "function" ? height(w) : height) : Math.round(LW.clamp(w * aspect, minH, maxH));
      const d = Math.min(window.devicePixelRatio || 1, 2.5);
      cv.width = Math.round(w * d); cv.height = Math.round(hh * d); cv.style.height = hh + "px";
      ctx.setTransform(d, 0, 0, d, 0, 0); o.W = w; o.H = hh; if (o.draw) o.draw();
    };
    o.refit = () => fit(true);
    new ResizeObserver(() => fit(false)).observe(parent); fit(true);
    LW.onTheme(() => o.draw && o.draw());
    return o;
  };
  /* pointer position in CSS pixels, with drag support */
  LW.drag = function (cv, { down, move, up, hover } = {}) {
    let active = false;
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, e }; };
    cv.addEventListener("pointerdown", e => { const p = pos(e); if (down && down(p) !== false) { active = true; cv.setPointerCapture(e.pointerId); e.preventDefault(); } });
    cv.addEventListener("pointermove", e => { const p = pos(e); if (active) { move && move(p); e.preventDefault(); } else hover && hover(p); });
    const end = e => { if (active) { active = false; up && up(pos(e)); } };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
    cv.addEventListener("pointerleave", e => { if (!active && hover) hover(null); });
  };
  /* requestAnimationFrame loop that sleeps while the figure is off screen */
  LW.loop = function (el, step) {
    let visible = false, running = false, raf = 0, last = 0;
    const tick = t => { raf = 0; if (!running || !visible) return; const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016; last = t; step(dt); raf = requestAnimationFrame(tick); };
    const kick = () => { if (running && visible && !raf) { last = 0; raf = requestAnimationFrame(tick); } };
    new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }, { rootMargin: "100px" }).observe(el);
    return { start() { running = true; kick(); }, stop() { running = false; }, get running() { return running; }, toggle() { running ? (running = false) : (running = true, kick()); return running; } };
  };

  /* ---------- 2D plotting ---------- */
  /* Draws a framed plot and returns scale functions. box = {x, y, w, h} in CSS px. */
  LW.axes = function (ctx, box, o) {
    const C = o.colors || LW.colors();
    const [x0, x1] = o.xr, [y0, y1] = o.yr;
    const sx = v => box.x + (v - x0) / (x1 - x0) * box.w, sy = v => box.y + box.h - (v - y0) / (y1 - y0) * box.h;
    const ix = px => x0 + (px - box.x) / box.w * (x1 - x0), iy = py => y0 + (box.y + box.h - py) / box.h * (y1 - y0);
    ctx.save();
    ctx.font = "11px " + (cssVar("--f-mono") || "monospace");
    const xt = o.xticks || LW.ticks(x0, x1, o.nx || Math.max(3, Math.round(box.w / 90)));
    const yt = o.yticks || LW.ticks(y0, y1, o.ny || Math.max(3, Math.round(box.h / 55)));
    const xs = xt.length > 1 ? xt[1] - xt[0] : 1, ys = yt.length > 1 ? yt[1] - yt[0] : 1;
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    if (o.grid !== false) {
      xt.forEach(v => { const X = Math.round(sx(v)) + .5; ctx.beginPath(); ctx.moveTo(X, box.y); ctx.lineTo(X, box.y + box.h); ctx.stroke(); });
      yt.forEach(v => { const Y = Math.round(sy(v)) + .5; ctx.beginPath(); ctx.moveTo(box.x, Y); ctx.lineTo(box.x + box.w, Y); ctx.stroke(); });
    }
    ctx.strokeStyle = C.line2; ctx.beginPath(); ctx.moveTo(box.x + .5, box.y); ctx.lineTo(box.x + .5, box.y + box.h + .5); ctx.lineTo(box.x + box.w, box.y + box.h + .5); ctx.stroke();
    ctx.fillStyle = C.ink3; ctx.textAlign = "center"; ctx.textBaseline = "top";
    if (o.xlabels !== false) xt.forEach(v => ctx.fillText(o.xfmt ? o.xfmt(v) : tickLabel(v, xs), sx(v), box.y + box.h + 5));
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    let tw = 0;
    if (o.ylabels !== false) yt.forEach(v => { const s = o.yfmt ? o.yfmt(v) : tickLabel(v, ys); tw = Math.max(tw, ctx.measureText(s).width); ctx.fillText(s, box.x - 6, sy(v)); });
    ctx.font = "500 12px " + (cssVar("--f-body") || "sans-serif"); ctx.fillStyle = C.ink2;
    if (o.xlabel) { ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(o.xlabel, box.x + box.w / 2, box.y + box.h + 21); }
    if (o.ylabel) { ctx.save(); ctx.translate(Math.max(1, box.x - 10 - tw - 15), box.y + box.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(o.ylabel, 0, 0); ctx.restore(); }
    if (o.title) { ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.font = "600 12px " + (cssVar("--f-body") || "sans-serif"); ctx.fillStyle = C.ink2; ctx.fillText(o.title, box.x, box.y - 6); }
    ctx.restore();
    return { sx, sy, ix, iy, box, clip() { ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip(); } };
  };
  LW.path = function (ctx, xs, ys, A, { color, width = 2, dash, alpha } = {}) {
    ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = "round"; ctx.lineCap = "round"; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); let pen = false;
    for (let i = 0; i < xs.length; i++) { const y = ys[i]; if (!isFinite(y)) { pen = false; continue; } const X = A.sx(xs[i]), Y = A.sy(y); pen ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); pen = true; }
    ctx.stroke(); ctx.restore();
  };
  LW.band = function (ctx, xs, lo, hi, A, color) {
    ctx.save(); ctx.fillStyle = color; ctx.beginPath();
    xs.forEach((x, i) => (i ? ctx.lineTo(A.sx(x), A.sy(hi[i])) : ctx.moveTo(A.sx(x), A.sy(hi[i]))));
    for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(A.sx(xs[i]), A.sy(lo[i]));
    ctx.closePath(); ctx.fill(); ctx.restore();
  };
  LW.dot = function (ctx, x, y, r, fill, stroke, lw = 1.5) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 2 * Math.PI); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } };
  LW.arrow = function (ctx, x0, y0, x1, y1, color, w = 1.6, head = 6) {
    const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0); if (L < 0.5) return;
    const hh = Math.min(head, L * 0.6);
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * hh * 0.7, y1 - Math.sin(a) * hh * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - hh * Math.cos(a - 0.45), y1 - hh * Math.sin(a - 0.45)); ctx.lineTo(x1 - hh * Math.cos(a + 0.45), y1 - hh * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill(); ctx.restore();
  };
  LW.text = function (ctx, s, x, y, { color, size = 12, weight = 500, align = "left", base = "alphabetic", mono = false } = {}) {
    ctx.save(); ctx.font = `${weight} ${size}px ${mono ? cssVar("--f-mono") : cssVar("--f-body")}`; ctx.fillStyle = color || LW.colors().ink2; ctx.textAlign = align; ctx.textBaseline = base; ctx.fillText(s, x, y); ctx.restore();
  };
  /* sequential colour ramp (light → strong accent) for heat maps */
  LW.ramp = function (t, C) {
    C = C || LW.colors(); t = LW.clamp(t, 0, 1);
    const a = C.dark ? [17, 26, 45] : [246, 247, 252], b = C.dark ? [135, 150, 255] : [59, 80, 224];
    const m = t < 0.5 ? t * 2 : 1, ex = t < 0.5 ? 0 : (t - 0.5) * 2;
    let r = a[0] + (b[0] - a[0]) * m, g = a[1] + (b[1] - a[1]) * m, bl = a[2] + (b[2] - a[2]) * m;
    if (ex) { const c = C.dark ? [255, 178, 107] : [224, 112, 28]; r += (c[0] - r) * ex; g += (c[1] - g) * ex; bl += (c[2] - bl) * ex; }
    return `rgb(${r | 0},${g | 0},${bl | 0})`;
  };
  /* readable text colour on a filled cell */
  LW.onColor = rgb => { const m = String(rgb).match(/\d+/g); if (!m) return "#fff"; const [r, g, b] = m.map(Number); return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#0c1222" : "#ffffff"; };
  /* diverging ramp for signed values in [−1, 1] */
  LW.diverge = function (t, C) {
    C = C || LW.colors(); t = LW.clamp(t, -1, 1);
    const mid = C.dark ? [17, 26, 45] : [246, 247, 252], pos = C.dark ? [255, 158, 90] : [224, 112, 28], neg = C.dark ? [135, 150, 255] : [59, 80, 224];
    const e = t >= 0 ? pos : neg, a = Math.abs(t);
    return `rgb(${(mid[0] + (e[0] - mid[0]) * a) | 0},${(mid[1] + (e[1] - mid[1]) * a) | 0},${(mid[2] + (e[2] - mid[2]) * a) | 0})`;
  };

  /* ---------- controls ---------- */
  LW.controls = (parent, cls) => { const d = h("div", { class: "lw-ctl" + (cls ? " " + cls : "") }); parent.append(d); return d; };
  let uid = 0;
  LW.slider = function (parent, { label, min, max, step = "any", value, fmt, log = false, onInput, width }) {
    const id = "lw-s" + ++uid;
    const toPos = v => (log ? Math.log10(v) : v), fromPos = p => (log ? Math.pow(10, p) : +p);
    const out = h("output", { for: id });
    const input = h("input", { id, type: "range", min: toPos(min), max: toPos(max), step: log ? "any" : step, value: toPos(value) });
    const wrap = h("label", { class: "lw-slider", for: id, style: width ? { minWidth: width } : null }, h("span", { class: "lw-sl-top" }, h("span", { html: label }), out), input);
    parent.append(wrap);
    const o = { el: wrap, input, get value() { return fromPos(input.value); }, set(v) { input.value = toPos(v); show(); }, on(cb) { cbs.push(cb); return o; } };
    const cbs = onInput ? [onInput] : [];
    const show = () => { const v = o.value; out.innerHTML = fmt ? fmt(v) : LW.fmt(v, 2); };
    input.addEventListener("input", () => { show(); cbs.forEach(f => f(o.value)); });
    show(); return o;
  };
  LW.seg = function (parent, { label, options, value, onChange }) {
    const g = h("div", { class: "lw-seg", role: "group", "aria-label": label || "Options" });
    const o = { el: g, value, set(v) { o.value = v; btns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === String(v)))); } };
    const btns = options.map(([v, txt]) => h("button", { type: "button", "data-v": v, html: txt, onclick: () => { o.set(v); onChange && onChange(v); } }));
    if (label) parent.append(h("div", { class: "lw-seg-wrap" }, h("span", { class: "lw-seg-l", html: label }), g)); else parent.append(g);
    g.append(...btns); o.set(value); return o;
  };
  LW.button = (parent, label, onClick, { primary = false, title } = {}) => { const b = h("button", { type: "button", class: "lw-btn" + (primary ? " primary" : ""), html: label, title, onclick: onClick }); parent.append(b); return b; };
  LW.check = function (parent, { label, value = false, onChange }) {
    const id = "lw-c" + ++uid, inp = h("input", { type: "checkbox", id }); inp.checked = value;
    inp.addEventListener("change", () => onChange && onChange(inp.checked));
    parent.append(h("label", { class: "lw-check", for: id }, inp, h("span", { html: label })));
    return { el: inp, get value() { return inp.checked; }, set(v) { inp.checked = v; } };
  };
  /* row of labelled numbers that can be updated by key */
  LW.stats = function (parent, items) {
    const d = h("div", { class: "lw-stats" }), map = {};
    items.forEach(([k, label, cls]) => { const v = h("b", { html: "–" }); map[k] = v; d.append(h("span", { class: cls || null }, h("small", { html: label }), v)); });
    parent.append(d);
    return { el: d, set(k, html) { if (map[k]) map[k].innerHTML = html; } };
  };
  LW.note = (parent, html, cls) => { const p = h("p", { class: "lw-note" + (cls ? " " + cls : ""), html }); parent.append(p); return { el: p, set(s) { p.innerHTML = s; } }; };
  LW.legend = (parent, items) => { const d = h("div", { class: "lw-legend" }); items.forEach(([color, label, dash]) => d.append(h("span", {}, h("i", { style: { background: dash ? "none" : color, borderTop: dash ? `2px dashed ${color}` : null } }), h("span", { html: label })))); parent.append(d); return d; };

  /* ---------- mount ---------- */
  function mountAll() {
    // mount every figure now, so the page height is final before any #anchor is scrolled to;
    // animation loops still sleep while their figure is off screen (LW.loop)
    $$("figure.lw[data-widget]").forEach(mountOne);
  }
  function mountOne(fig) {
    [fig].forEach(fig => {
      const name = fig.dataset.widget, body = $(".lw-body", fig), fn = reg[name];
      if (!fn) { body.innerHTML = `<p class="lw-loading">Interactive “${LW.esc(name)}” is not available.</p>`; return; }
      body.innerHTML = "";
      let opts = {}; try { opts = fig.dataset.opts ? JSON.parse(fig.dataset.opts) : {}; } catch (e) { /* bad options */ }
      try { fn(body, opts, fig); } catch (e) { console.error(e); body.innerHTML = `<p class="lw-loading">This interactive figure failed to start: ${LW.esc(e.message)}</p>`; }
    });
  }

  /* ---------- quizzes ---------- */
  function quizzes() {
    $$(".quiz").forEach(qz => {
      const items = $$(".qz", qz), score = $(".qz-score", qz);
      const update = () => {
        const done = items.filter(i => i.dataset.done), right = done.filter(i => i.dataset.done === "right").length;
        if (done.length === items.length) {
          score.innerHTML = right === items.length ? `<b>All ${items.length} right.</b> Nicely done.` : `<b>${right} of ${items.length}</b> right first time. Read the explanations, then move on when they make sense.`;
          const page = $("[data-learn-page]"); if (page && right === items.length) markDone(page.dataset.learnPage, true);
        }
      };
      items.forEach(item => {
        const ans = +item.dataset.answer, why = $(".qz-why", item);
        $$(".qz-o", item).forEach(btn => btn.addEventListener("click", () => {
          const i = +btn.dataset.i, ok = i === ans;
          if (!item.dataset.done) item.dataset.done = ok ? "right" : "wrong";
          btn.classList.add(ok ? "right" : "wrong");
          if (ok) $$(".qz-o", item).forEach(b => { b.disabled = true; });
          why.hidden = false; why.classList.toggle("ok", ok);
          why.dataset.prefix = ok ? "Right. " : "Not quite. ";
          update();
        }));
      });
    });
  }

  /* ---------- progress ---------- */
  const KEY = "learn.done";
  const doneSet = () => new Set(LW.store.get(KEY, []));
  function markDone(slug, on) {
    const s = doneSet(); on ? s.add(slug) : s.delete(slug); LW.store.set(KEY, [...s]); paintProgress();
  }
  function paintProgress() {
    const s = doneSet();
    const slugsOf = el => { const h = el && el.closest("[data-learn-slugs]"); return h ? h.dataset.learnSlugs.trim().split(/\s+/).filter(Boolean) : null; };
    $$("[data-learn-slug]").forEach(a => a.classList.toggle("is-done", s.has(a.dataset.learnSlug)));
    $$("[data-learn-count]").forEach(b => { const list = slugsOf(b); b.textContent = list ? list.filter(x => s.has(x)).length : s.size; });
    $$("[data-learn-total]").forEach(t => { const list = slugsOf(t); t.hidden = !(list ? list.some(x => s.has(x)) : s.size); });
    $$("[data-learn-bar]").forEach(bar => { const list = slugsOf(bar) || []; bar.style.width = (list.length ? 100 * list.filter(x => s.has(x)).length / list.length : 0) + "%"; });
    $$("[data-learn-mark]").forEach(b => { const on = s.has(b.dataset.learnMark); b.textContent = on ? "Read ✓  (undo)" : "Mark this chapter as read"; b.classList.toggle("btn-primary", !on); b.classList.toggle("btn-ghost", on); });
  }
  function progress() {
    $$("[data-learn-mark]").forEach(b => b.addEventListener("click", () => markDone(b.dataset.learnMark, !doneSet().has(b.dataset.learnMark))));
    paintProgress();
    const nav = $(".course-nav details"); if (nav && matchMedia("(max-width: 1100px)").matches) nav.open = false;
  }

  /* ---------- copy buttons on code blocks ---------- */
  function copyButtons() {
    $$(".lesson-body .highlight, .lesson-body > pre").forEach(blk => {
      if (blk.closest(".pycell")) return;
      const pre = blk.tagName === "PRE" ? blk : $("pre", blk); if (!pre) return;
      const b = h("button", { type: "button", class: "copy-btn", "aria-label": "Copy code", text: "Copy" });
      b.addEventListener("click", async () => {
        const txt = pre.innerText.replace(/\n$/, "");
        try { await navigator.clipboard.writeText(txt); b.textContent = "Copied"; } catch (e) { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Selected"; }
        setTimeout(() => { b.textContent = "Copy"; }, 1400);
      });
      blk.classList.add("has-copy"); blk.append(b);
    });
  }

  /* ---------- Python cells (Pyodide, loaded on first run) ---------- */
  const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
  let pyReady = null;
  function loadPy(status) {
    if (pyReady) return pyReady;
    pyReady = new Promise((res, rej) => {
      status("Loading Python (about 10 MB, first run only)…");
      const s = h("script", { src: PYODIDE + "pyodide.js", crossorigin: "anonymous" });
      s.onload = async () => { try { const py = await window.loadPyodide({ indexURL: PYODIDE }); py.runPython("import warnings; warnings.filterwarnings('ignore', category=DeprecationWarning)"); res(py); } catch (e) { rej(e); } };
      s.onerror = () => rej(new Error("Could not download Python. Check your connection and try again."));
      document.head.append(s);
    });
    pyReady.catch(() => { pyReady = null; });
    return pyReady;
  }
  LW.loadPy = st => loadPy(st || (() => {}));
  function pycells() {
    $$(".pycell").forEach(cell => {
      const ta = $(".pc-code", cell), out = $(".pc-out", cell), run = $(".pc-run", cell), st = $(".pc-status", cell), orig = ta.value;
      const grow = () => { ta.style.height = "auto"; ta.style.height = (ta.scrollHeight + 2) + "px"; };
      grow(); ta.addEventListener("input", grow);
      ta.addEventListener("keydown", e => {
        if (e.key === "Enter" && (e.shiftKey || e.metaKey || e.ctrlKey)) { e.preventDefault(); go(); }
        else if (e.key === "Tab") { e.preventDefault(); const a = ta.selectionStart; ta.setRangeText("    ", a, ta.selectionEnd, "end"); grow(); }
      });
      $(".pc-reset", cell).addEventListener("click", () => { ta.value = orig; grow(); });
      const status = s => { st.textContent = s; };
      async function go() {
        run.disabled = true; out.hidden = false; out.classList.remove("err"); out.textContent = "";
        try {
          const py = await loadPy(status);
          status("Running…");
          await py.loadPackagesFromImports(ta.value);
          let buf = "";
          py.setStdout({ batched: s => { buf += s + "\n"; } }); py.setStderr({ batched: s => { buf += s + "\n"; } });
          const t0 = performance.now();
          const r = await py.runPythonAsync(ta.value);
          if (r !== undefined && r !== null) buf += String(r.toString ? r.toString() : r) + "\n";
          if (r && r.destroy) r.destroy();
          out.textContent = buf.replace(/\n$/, "") || "(no output)";
          status(`Done in ${((performance.now() - t0) / 1000).toFixed(2)} s`);
        } catch (e) {
          out.classList.add("err");
          const msg = String(e.message || e); const lines = msg.split("\n"); const i = lines.findIndex(l => l.includes('File "<exec>"'));
          out.textContent = (i >= 0 ? lines.slice(i).join("\n") : msg).trim();
          status("Error");
        }
        run.disabled = false;
      }
      run.addEventListener("click", go);
    });
  }

  function init() { mountAll(); quizzes(); progress(); copyButtons(); pycells(); }
  /* widgets register later in the same bundle, so mount after this script has finished */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0);
})();
