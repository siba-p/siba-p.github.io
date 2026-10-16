/* NumPy from the inside: memory layout, strides and views; broadcasting; and a live speed test. */
(function () {
  "use strict";
  const H = LW.h, esc = LW.esc;
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  /* ---------------- 1. an ndarray is a buffer plus shape and strides ---------------- */
  const VIEWS = {
    all: { name: "a", desc: "the whole array" },
    row: { name: "a[1]", desc: "one row: a view" },
    col: { name: "a[:, 2]", desc: "one column: a view with a large stride" },
    every: { name: "a[::2, ::2]", desc: "every other element: a strided view" },
    T: { name: "a.T", desc: "the transpose: same memory, strides swapped" },
    mask: { name: "a[a % 3 == 0]", desc: "boolean mask: a new copy" }
  };
  LW.register("ndarray", function (root) {
    let R = 3, Cc = 4, dt = 8, order = "C", vk = "all", pick = null; /* default 3 × 4 float64 */
    const P = LW.canvas(root, { height: w => (w < 640 ? 440 : 340) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Rows", min: 1, max: 5, step: 1, value: R, fmt: v => String(v), onInput: v => { R = v; pick = null; draw(); } });
    LW.slider(ctl, { label: "Columns", min: 1, max: 7, step: 1, value: Cc, fmt: v => String(v), onInput: v => { Cc = v; pick = null; draw(); } });
    LW.seg(ctl, { label: "dtype", options: [["1", "int8 (1 byte)"], ["4", "int32 (4 bytes)"], ["8", "float64 (8 bytes)"]], value: "8", onChange: v => { dt = +v; draw(); } });
    const c2 = LW.controls(root);
    LW.seg(c2, { label: "Memory order", options: [["C", "C (row-major)"], ["F", "Fortran (column-major)"]], value: order, onChange: v => { order = v; draw(); } });
    LW.seg(c2, { label: "Expression", options: Object.keys(VIEWS).map(k => [k, VIEWS[k].name]), value: vk, onChange: v => { vk = v; pick = null; draw(); } });
    const S = LW.stats(root, [["shape", "shape"], ["str", "strides (bytes)"], ["kind", "memory"], ["cont", "contiguous"], ["off", "selected element"]]);
    LW.note(root, "Click an element in the grid to see where it lives in memory: its byte offset is the dot product of its index with the strides.");
    let cells = [];
    const baseOff = (i, j) => (order === "C" ? i * Cc + j : j * R + i);
    function view() { // returns {shape, strides (in elements), start, map(p,q)->[i,j] | null, copy}
      const sC = order === "C" ? [Cc, 1] : [1, R];
      if (vk === "all") return { shape: [R, Cc], st: sC, map: (p, q) => [p, q] };
      if (vk === "row") { const i = Math.min(1, R - 1); return { shape: [Cc], st: [sC[1]], map: (p) => [i, p] }; }
      if (vk === "col") { const j = Math.min(2, Cc - 1); return { shape: [R], st: [sC[0]], map: (p) => [p, j] }; }
      if (vk === "every") return { shape: [Math.ceil(R / 2), Math.ceil(Cc / 2)], st: [2 * sC[0], 2 * sC[1]], map: (p, q) => [2 * p, 2 * q] };
      if (vk === "T") return { shape: [Cc, R], st: [sC[1], sC[0]], map: (p, q) => [q, p] };
      const hits = []; for (let i = 0; i < R; i++) for (let j = 0; j < Cc; j++) if ((i * Cc + j) % 3 === 0) hits.push([i, j]);
      return { shape: [hits.length], st: [1], map: p => hits[p], copy: true };
    }
    function draw() {
      const C = LW.colors(), { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH); cells = [];
      const V = view(), n = R * Cc, narrow = W < 640;
      // the logical view (grid)
      const rows = V.shape.length === 2 ? V.shape[0] : 1, cols = V.shape.length === 2 ? V.shape[1] : V.shape[0];
      const cs = Math.min(46, (narrow ? W - 40 : W * 0.45) / Math.max(cols, 1), 150 / Math.max(rows, 1)), gx = 20, gy = 34;
      LW.text(ctx, narrow ? VIEWS[vk].name + ": " + VIEWS[vk].desc : VIEWS[vk].name + "  —  " + VIEWS[vk].desc + "  (what your code sees)", gx, 18, { color: C.ink2, size: 12, weight: 600 });
      const inView = new Set();
      for (let p = 0; p < rows; p++) for (let q = 0; q < cols; q++) {
        const ij = V.shape.length === 2 ? V.map(p, q) : V.map(q); if (!ij) continue; const [i, j] = ij, val = i * Cc + j; inView.add(i + "," + j);
        const x = gx + q * cs, y = gy + p * cs, on = pick && pick[0] === i && pick[1] === j;
        ctx.fillStyle = on ? rgba(ORANGE, 0.5) : rgba(V.copy ? ROSE : BLUE, 0.16); ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2); ctx.strokeStyle = V.copy ? ROSE : BLUE; ctx.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3);
        LW.text(ctx, String(val), x + cs / 2, y + cs / 2 + 4, { color: C.ink, size: 12, weight: 600, align: "center", mono: true });
        cells.push({ x, y, s: cs, ij: [i, j], idx: V.shape.length === 2 ? [p, q] : [q] });
      }
      // index labels
      if (V.shape.length === 2) { for (let q = 0; q < cols; q++) LW.text(ctx, String(q), gx + q * cs + cs / 2, gy - 4, { color: C.ink3, size: 9.5, align: "center", mono: true }); }
      // memory buffer
      const by = narrow ? gy + rows * cs + 50 : gy + Math.max(rows * cs, 120) + 56, bw = Math.min(54, (W - 40) / Math.min(n, narrow ? 10 : 20)), perRow = Math.floor((W - 40) / bw);
      LW.text(ctx, (narrow ? "buffer: " : "the data buffer in memory: ") + n + " × " + dt + " = " + n * dt + " bytes, " + (order === "C" ? "row after row" : "column after column"), 20, by - 14, { color: C.ink2, size: 12, weight: 600 });
      for (let k = 0; k < n; k++) {
        let i, j; if (order === "C") { i = Math.floor(k / Cc); j = k % Cc; } else { j = Math.floor(k / R); i = k % R; }
        const x = 20 + (k % perRow) * bw, y = by + Math.floor(k / perRow) * (bw + 18), on = inView.has(i + "," + j) && !V.copy, sel = pick && pick[0] === i && pick[1] === j;
        ctx.fillStyle = sel ? rgba(ORANGE, 0.55) : on ? rgba(BLUE, 0.28) : (C.dark ? "rgba(255,255,255,.05)" : "rgba(12,18,34,.04)"); ctx.fillRect(x + 1, y, bw - 2, bw * 0.7);
        ctx.strokeStyle = on ? BLUE : C.line2; ctx.strokeRect(x + 1.5, y + 0.5, bw - 3, bw * 0.7 - 1);
        LW.text(ctx, String(i * Cc + j), x + bw / 2, y + bw * 0.35 + 4, { color: on || sel ? C.ink : C.ink3, size: 11, weight: 600, align: "center", mono: true });
        LW.text(ctx, String(k * dt), x + bw / 2, y + bw * 0.7 + 11, { color: C.ink3, size: 8.5, align: "center", mono: true });
      }
      if (V.copy) { const yy = by + Math.ceil(n / perRow) * (bw + 18) + 14; LW.text(ctx, "A boolean mask cannot be described by strides, so NumPy copies the selected values into a new buffer:", 20, yy, { color: ROSE, size: 11.5, weight: 600 });
        V.shape[0] && Array.from({ length: V.shape[0] }, (_, p) => { const [i, j] = V.map(p), x = 20 + p * bw; ctx.fillStyle = rgba(ROSE, 0.2); ctx.fillRect(x + 1, yy + 8, bw - 2, bw * 0.7); ctx.strokeStyle = ROSE; ctx.strokeRect(x + 1.5, yy + 8.5, bw - 3, bw * 0.7 - 1); LW.text(ctx, String(i * Cc + j), x + bw / 2, yy + 8 + bw * 0.35 + 4, { color: C.ink, size: 11, weight: 600, align: "center", mono: true }); }); }
      const stB = V.st.map(s => s * (V.copy ? dt : dt));
      const cont = V.copy ? "yes (new buffer)" : (V.shape.length === 1 ? (V.st[0] === 1 ? "yes" : "no") : (V.st[1] === 1 && V.st[0] === V.shape[1] ? "C order" : V.st[0] === 1 && V.st[1] === V.shape[0] ? "Fortran order" : "no"));
      S.set("shape", "(" + V.shape.join(", ") + (V.shape.length === 1 ? "," : "") + ")"); S.set("str", "(" + stB.join(", ") + (stB.length === 1 ? "," : "") + ")"); S.set("kind", V.copy ? "copy" : "view of a's buffer"); S.set("cont", cont);
      if (pick) { const c = cells.find(c => c.ij[0] === pick[0] && c.ij[1] === pick[1]); if (c && !V.copy) { const off = baseOff(pick[0], pick[1]) * dt; S.set("off", "index (" + c.idx.join(", ") + ") → byte " + off + " = " + c.idx.map((v, d) => v + "×" + stB[d]).join(" + ") + (vk === "all" || vk === "T" ? "" : " + start " + (off - c.idx.reduce((s, v, d) => s + v * stB[d], 0)))); } else S.set("off", "–"); } else S.set("off", "click a grid cell");
    }
    P.draw = draw;
    LW.drag(P.cv, { down: q => { const c = cells.find(c => q.x >= c.x && q.x < c.x + c.s && q.y >= c.y && q.y < c.y + c.s); if (c) { pick = c.ij; draw(); } return false; } });
    draw();
  });

  /* ---------------- 2. broadcasting ---------------- */
  const BPRE = { mr: ["matrix + row", "3,4", "4"], outer: ["column + row (outer sum)", "3,1", "1,4"], mc: ["matrix + column", "3,4", "3,1"], bad: ["incompatible", "4,3", "4"], centre: ["positions − centre", "5,3", "3"], pairs: ["all pair vectors", "5,1,3", "1,5,3"] };
  LW.register("broadcast", function (root) {
    let A = [3, 4], B = [4];
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Example", options: Object.keys(BPRE).map(k => [k, BPRE[k][0]]), value: "mr", onChange: k => { ia.value = BPRE[k][1]; ib.value = BPRE[k][2]; parse(); } });
    const ia = H("input", { type: "text", value: "3,4", class: "ht-in", "aria-label": "Shape of a" }), ib = H("input", { type: "text", value: "4", class: "ht-in", "aria-label": "Shape of b" });
    const c2 = LW.controls(root); c2.append(H("label", { class: "lw-check" }, H("span", { html: "shape of <b>a</b>" }), ia), H("label", { class: "lw-check" }, H("span", { html: "shape of <b>b</b>" }), ib));
    [ia, ib].forEach(x => x.addEventListener("input", parse));
    const out = H("div", { class: "bc-out" }); root.append(out);
    const P = LW.canvas(root, { height: w => (w < 640 ? 300 : 230) });
    function parse() { const f = s => s.split(/[ ,x×]+/).filter(Boolean).map(Number).filter(v => Number.isInteger(v) && v >= 0); A = f(ia.value); B = f(ib.value); render(); }
    function bcast(a, b) { const n = Math.max(a.length, b.length), pa = Array(n - a.length).fill(null).concat(a), pb = Array(n - b.length).fill(null).concat(b), r = [], why = []; let ok = true;
      for (let d = 0; d < n; d++) { const x = pa[d], y = pb[d]; let res, note;
        if (x === null) { res = y; note = "a has no axis here: treated as 1, stretched"; } else if (y === null) { res = x; note = "b has no axis here: treated as 1, stretched"; }
        else if (x === y) { res = x; note = "equal"; } else if (x === 1) { res = y; note = "a's 1 is stretched to " + y; } else if (y === 1) { res = x; note = "b's 1 is stretched to " + x; } else { res = "✗"; note = "mismatch: " + x + " vs " + y; ok = false; }
        r.push(res); why.push([pa[d], pb[d], res, note]); }
      return { ok, r, why, pa, pb };
    }
    function render() {
      if (!A.length || !B.length) { out.innerHTML = "<p class='pp-hint'>Type shapes such as 3,4 and 4.</p>"; draw(null); return; }
      const R = bcast(A, B);
      out.innerHTML = `<table class="bc-tab"><thead><tr><th>axis (aligned from the right)</th>${R.why.map((_, d) => `<th>${d - R.why.length}</th>`).join("")}</tr></thead><tbody>
        <tr><td>a ${esc("(" + A.join(", ") + ")")}</td>${R.pa.map(v => `<td>${v === null ? "·" : v}</td>`).join("")}</tr>
        <tr><td>b ${esc("(" + B.join(", ") + ")")}</td>${R.pb.map(v => `<td>${v === null ? "·" : v}</td>`).join("")}</tr>
        <tr class="${R.ok ? "ok" : "bad"}"><td>result</td>${R.r.map(v => `<td>${v}</td>`).join("")}</tr></tbody></table>
        <ul class="bc-why">${R.why.map(w => `<li>${esc(w[3])}</li>`).join("")}</ul>
        <p class="bc-res ${R.ok ? "ok" : "bad"}">${R.ok ? `a + b has shape (${R.r.join(", ")}${R.r.length === 1 ? "," : ""}) and ${R.r.reduce((s, v) => s * v, 1)} elements; no data were copied to stretch the inputs.` : "ValueError: operands could not be broadcast together"}</p>`;
      draw(R);
    }
    function grid(ctx, x, y, r, c, cs, col, ghostR, ghostC, label, C) {
      for (let i = 0; i < ghostR; i++) for (let j = 0; j < ghostC; j++) { const real = i < r && j < c, X = x + j * cs, Y = y + i * cs;
        ctx.fillStyle = real ? rgba(col, 0.32) : rgba(col, 0.08); ctx.fillRect(X + 1, Y + 1, cs - 2, cs - 2); ctx.strokeStyle = real ? col : rgba(col, 0.4); ctx.setLineDash(real ? [] : [3, 3]); ctx.strokeRect(X + 1.5, Y + 1.5, cs - 3, cs - 3); ctx.setLineDash([]); }
      LW.text(ctx, label, x, y - 8, { color: C.ink2, size: 11.5, weight: 600 });
    }
    function draw(R) {
      const C = LW.colors(), { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH);
      if (!R || !R.ok || R.r.length > 2) { LW.text(ctx, R && R.ok ? "Three or more axes: see the table above (the picture shows up to two axes)." : R ? "These shapes cannot be broadcast: a size that is neither 1 nor equal to the other blocks it." : "", 16, 30, { color: R && !R.ok ? ROSE : C.ink3, size: 12.5, weight: 600 }); return; }
      const two = s => (s.length === 1 ? [1, s[0]] : s.length === 0 ? [1, 1] : s);
      const [ar, ac] = two(A), [br, bc] = two(B), [rr, rc] = two(R.r), narrow = W < 640;
      const cs = Math.min(30, (W - 80) / (3 * Math.max(rc, 1) + 2), (HH - 60) / Math.max(rr, 1) / (narrow ? 1.6 : 1));
      const y = 34, x1 = 16, x2 = x1 + rc * cs + 40, x3 = x2 + rc * cs + 40;
      grid(ctx, x1, y, ar, ac, cs, BLUE, rr, rc, "a, stretched", C); LW.text(ctx, "+", x2 - 24, y + rr * cs / 2 + 6, { color: C.ink2, size: 18, weight: 600 });
      grid(ctx, x2, y, br, bc, cs, ORANGE, rr, rc, "b, stretched", C); LW.text(ctx, "=", x3 - 26, y + rr * cs / 2 + 6, { color: C.ink2, size: 18, weight: 600 });
      grid(ctx, x3, y, rr, rc, cs, VIOLET, rr, rc, "result", C);
      LW.text(ctx, "solid: real data   dashed: virtual copies made by a zero stride", x1, HH - 10, { color: C.ink3, size: 10.5 });
    }
    parse();
  });

  /* ---------------- 3. how much faster is NumPy? (measured live) ---------------- */
  const SPEED_PY = `
import time, json
import numpy as np
def _lw_speed(n):
    xs = [float(i) for i in range(n)]
    arr = np.arange(n, dtype=np.float64)
    def best(f, reps=3):
        t0 = time.perf_counter(); f(); one = time.perf_counter() - t0
        k = max(1, int(0.05 / max(one, 1e-6)))       # repeat fast calls so the coarse browser timer can resolve them
        t = 1e9
        for _ in range(reps):
            t0 = time.perf_counter()
            for _ in range(k): f()
            t = min(t, (time.perf_counter() - t0) / k)
        return t
    def loop():
        s = 0.0
        for x in xs:
            s += x * x
        return s
    res = {"loop": best(loop), "gen": best(lambda: sum(x * x for x in xs)), "np": best(lambda: float((arr * arr).sum())), "dot": best(lambda: float(arr @ arr))}
    return json.dumps(res)
`;
  LW.register("pyspeed", function (root) {
    let n = 1000000, res = null;
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Number of elements", options: [["1000", "10³"], ["100000", "10⁵"], ["1000000", "10⁶"]], value: String(n), onChange: v => { n = +v; } });
    const go = LW.button(ctl, "Measure in this browser", () => run(), { primary: true });
    const st = H("span", { class: "pp-status" }); ctl.append(st);
    const P = LW.canvas(root, { height: w => (w < 640 ? 250 : 220) });
    async function run() { go.disabled = true; try { const py = await LW.loadPy(s => { st.textContent = s; }); st.textContent = "Loading NumPy…"; await py.loadPackage("numpy"); if (!py._lwSpeed) { py.runPython(SPEED_PY); py._lwSpeed = true; } st.textContent = "Timing…"; await new Promise(r => setTimeout(r, 30)); const f = py.globals.get("_lw_speed"); res = JSON.parse(f(n)); f.destroy(); res.n = n; st.textContent = "Done"; } catch (e) { st.textContent = String(e.message || e).split("\n").filter(Boolean).slice(-1)[0]; } go.disabled = false; draw(); }
    function draw() {
      const C = LW.colors(), { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH);
      if (!res) { LW.text(ctx, "Press the button: CPython and NumPy (compiled to WebAssembly) will time four ways of computing Σ x² in this page.", 12, 28, { color: C.ink3, size: 12 }); return; }
      const rows = [["for loop over a list", res.loop, ROSE], ["sum() of a generator", res.gen, ORANGE], ["NumPy: (a * a).sum()", res.np, TEAL], ["NumPy: a @ a (one BLAS call)", res.dot, BLUE]];
      const lo = Math.log10(Math.min(...rows.map(r => r[1]))) - 0.5, hi = Math.log10(Math.max(...rows.map(r => r[1]))) + 0.3, lw = W < 640 ? 150 : 210, bw = W - lw - 120;
      rows.forEach(([lab, t, col], i) => { const y = 18 + i * 46, w = Math.max(3, (Math.log10(t) - lo) / (hi - lo) * bw);
        LW.text(ctx, lab, 10, y + 18, { color: C.ink2, size: 12, weight: 600 }); ctx.fillStyle = col; ctx.globalAlpha = 0.8; ctx.fillRect(lw, y + 4, w, 22); ctx.globalAlpha = 1;
        LW.text(ctx, (t * 1e3 < 1 ? (t * 1e6).toFixed(1) + " µs" : (t * 1e3).toFixed(2) + " ms") + (i ? "  (" + (res.loop / t >= 1 ? (res.loop / t).toFixed(0) + "× faster" : (t / res.loop).toFixed(1) + "× slower") + ")" : ""), lw + w + 8, y + 20, { color: C.ink, size: 11.5, mono: true }); });
      LW.text(ctx, "n = " + res.n.toLocaleString() + " elements; best of three runs; bar length on a logarithmic scale", 10, HH - 8, { color: C.ink3, size: 10.5 });
    }
    P.draw = draw; draw();
  });
  /* ---------------- 4. matplotlib in the page: run code, see the figure ---------------- */
  const FIG_PY = `
import io, base64, contextlib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
def _lw_fig(src):
    plt.close("all")
    out = io.StringIO()
    g = {"__name__": "__main__"}
    with contextlib.redirect_stdout(out):
        exec(compile(src, "<figure code>", "exec"), g)
    fig = plt.gcf()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120, bbox_inches="tight")
    return base64.b64encode(buf.getvalue()).decode() + "|" + out.getvalue()
`;
  LW.register("pyfig", function (root, opts) {
    const ta = H("textarea", { class: "pp-src", spellcheck: "false", autocapitalize: "off", "aria-label": "Python plotting code" }); ta.value = (opts && opts.code) || "import numpy as np\nimport matplotlib.pyplot as plt\nx = np.linspace(0, 10, 200)\nplt.plot(x, np.sin(x))\n";
    const grow = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; };
    root.append(ta); setTimeout(grow, 0); ta.addEventListener("input", grow);
    const ctl = LW.controls(root); const go = LW.button(ctl, "Run and draw", () => run(), { primary: true }); const st = H("span", { class: "pp-status" }); ctl.append(st);
    const img = H("img", { class: "pf-img", alt: "Figure produced by the code above", hidden: true }), out = H("pre", { class: "pp-out", hidden: true }); root.append(img, out);
    async function run() { go.disabled = true; out.hidden = true;
      try { const py = await LW.loadPy(s => { st.textContent = s; }); st.textContent = "Loading NumPy and Matplotlib (first run only)…"; await py.loadPackage(["numpy", "matplotlib"]); if (!py._lwFig) { py.runPython(FIG_PY); py._lwFig = true; }
        st.textContent = "Running…"; await new Promise(r => setTimeout(r, 20)); const f = py.globals.get("_lw_fig"); const r = f(ta.value); f.destroy(); const i = r.indexOf("|");
        img.src = "data:image/png;base64," + r.slice(0, i); img.hidden = false; const txt = r.slice(i + 1); out.textContent = txt; out.hidden = !txt; st.textContent = "Done";
      } catch (e) { const m = String(e.message || e).split("\n").filter(Boolean); out.textContent = m.slice(-3).join("\n"); out.hidden = false; out.classList.add("pp-err"); st.textContent = "Error"; }
      go.disabled = false; }
  });

  /* ---------------- 5. Amdahl's law ---------------- */
  LW.register("amdahl", function (root) {
    let serial = 0.05, overhead = 0.0;
    const P = LW.canvas(root, { height: w => Math.min(340, Math.max(260, w * 0.45)) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Serial fraction of the work, s", min: 0, max: 0.5, step: 0.005, value: serial, fmt: v => (100 * v).toFixed(1) + " %", onInput: v => { serial = v; draw(); } });
    LW.slider(ctl, { label: "Communication cost per extra core (fraction of 1-core time)", min: 0, max: 0.004, step: 0.0001, value: overhead, fmt: v => (100 * v).toFixed(2) + " %", onInput: v => { overhead = v; draw(); } });
    const S = LW.stats(root, [["s16", "speed-up on 16 cores"], ["s128", "on 128 cores"], ["lim", "limit 1/s"], ["best", "best core count"]]);
    function draw() {
      const C = LW.colors(), { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH);
      const sp = n => 1 / (serial + (1 - serial) / n + overhead * (n - 1)), L = LW.linspace(0, Math.log2(1024), 200), ns = L.map(l => Math.pow(2, l));
      const A = LW.axes(ctx, { x: 52, y: 14, w: W - 66, h: HH - 52 }, { xr: [0, 10], yr: [0, 1.15 * Math.min(1024, Math.max(...ns.map(sp)))], xlabel: "number of cores (log₂ scale)", ylabel: "speed-up", colors: C, xfmt: v => String(Math.pow(2, v)) });
      A.clip(); LW.path(ctx, L, ns, A, { color: C.ink3, width: 1.4, dash: [5, 4] }); LW.path(ctx, L, ns.map(sp), A, { color: TEAL, width: 2.8 });
      if (serial > 0) LW.path(ctx, [0, 10], [1 / serial, 1 / serial], A, { color: ROSE, width: 1.4, dash: [3, 4] }); ctx.restore();
      LW.text(ctx, "dashed grey: perfect scaling   teal: Amdahl's law   rose: limit 1/s", A.box.x + 8, A.box.y + 14, { color: C.ink3, size: 10.5 });
      let best = 1, bv = 1; for (let n = 1; n <= 1024; n *= 2) if (sp(n) > bv) { bv = sp(n); best = n; }
      S.set("s16", sp(16).toFixed(2) + "×"); S.set("s128", sp(128).toFixed(2) + "×"); S.set("lim", serial > 0 ? (1 / serial).toFixed(1) + "×" : "∞"); S.set("best", best + " (" + bv.toFixed(1) + "×)");
    }
    P.draw = draw; draw();
  });
})();
