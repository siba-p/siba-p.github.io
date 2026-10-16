/* Computing 2: how numbers are stored — 8-bit integers (two's complement) and IEEE 754 single precision. */
(function () {
  "use strict";
  const f32 = new DataView(new ArrayBuffer(4));
  const bitsOf = x => { f32.setFloat32(0, x); const u = f32.getUint32(0); return Array.from({ length: 32 }, (_, i) => (u >>> (31 - i)) & 1); };
  const valOf = b => { let u = 0; b.forEach(x => { u = (u << 1) | x; }); f32.setUint32(0, u >>> 0); return f32.getFloat32(0); };
  LW.register("floatbits", function (root) {
    let mode = "float", bits = bitsOf(0.1), ibits = [0, 0, 1, 0, 1, 0, 1, 0];
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Representation", options: [["int", "8-bit integer"], ["float", "32-bit floating point"]], value: mode, onChange: v => { mode = v; render(); } });
    const inp = LW.h("input", { type: "text", class: "fb-in", value: "0.1", "aria-label": "Type a number" });
    const inWrap = LW.h("label", { class: "fb-l" }, LW.h("span", { text: "Type a number" }), inp); ctl.append(inWrap);
    const pre = LW.h("div", { class: "fb-pre" }); ctl.append(pre);
    const board = LW.h("div", { class: "fb-board" }); root.append(board);
    const out = LW.h("div", { class: "fb-out" }); root.append(out);
    const PRE_F = [["0.1", "0.1"], ["1", "1"], ["−2.5", "-2.5"], ["1 + ε", "1.0000001192092896"], ["16777217", "16777217"], ["largest", "3.4028234663852886e38"], ["smallest normal", "1.1754943508222875e-38"], ["smallest", "1e-45"], ["∞", "Infinity"], ["NaN", "NaN"]];
    const PRE_I = [["42", "42"], ["127", "127"], ["128", "128"], ["−1", "-1"], ["−128", "-128"], ["100 + 100", "200"]];
    inp.addEventListener("input", () => setFrom(inp.value));
    function setFrom(t) {
      const x = Number(String(t).replace("−", "-").replace(/\s/g, ""));
      if (mode === "float") { if (!isNaN(x) || /nan/i.test(t)) bits = bitsOf(isNaN(x) ? NaN : x); }
      else if (Number.isFinite(x)) { const n = Math.round(x); const w = ((n % 256) + 256) % 256; ibits = Array.from({ length: 8 }, (_, i) => (w >> (7 - i)) & 1); }
      draw();
    }
    function render() {
      pre.innerHTML = ""; (mode === "float" ? PRE_F : PRE_I).forEach(([l, v]) => pre.append(LW.h("button", { type: "button", text: l, onclick: () => { inp.value = v; setFrom(v); } })));
      inp.value = mode === "float" ? "0.1" : "42"; setFrom(inp.value);
    }
    function draw() {
      board.innerHTML = "";
      if (mode === "int") {
        const row = LW.h("div", { class: "fb-row" });
        ibits.forEach((b, i) => { const w = i === 0 ? -128 : 2 ** (7 - i); row.append(LW.h("button", { type: "button", class: "fb-bit " + (i === 0 ? "fb-s" : "fb-m") + (b ? " on" : ""), "aria-pressed": String(!!b), onclick: () => { ibits[i] ^= 1; draw(); } }, LW.h("b", { text: String(b) }), LW.h("small", { text: (w > 0 ? "+" : "−") + Math.abs(w) }))); });
        board.append(row);
        const u = ibits.reduce((s, b, i) => s + b * 2 ** (7 - i), 0), sgn = u >= 128 ? u - 256 : u;
        const terms = ibits.map((b, i) => (b ? (i === 0 ? "−128" : String(2 ** (7 - i))) : null)).filter(Boolean);
        out.innerHTML = `<p class="fb-eq"><span class="c-s">${ibits[0] ? "−128" : "0"}</span> ${terms.filter(t => t !== "−128").map(t => `+ <span class="c-m">${t}</span>`).join(" ")} = <b>${sgn}</b></p>
          <p class="lw-note">As an <b>unsigned</b> byte these bits mean ${u}. As a <b>signed</b> (two's complement) byte the leftmost bit counts −128, so the range is −128 to 127. Adding 1 to 127 (<code>01111111</code>) gives <code>10000000</code> = −128: integer overflow wraps around silently.</p>`;
        return;
      }
      const row = LW.h("div", { class: "fb-row f32" });
      bits.forEach((b, i) => { const cls = i === 0 ? "fb-s" : i < 9 ? "fb-e" : "fb-m"; row.append(LW.h("button", { type: "button", class: "fb-bit " + cls + (b ? " on" : ""), "aria-pressed": String(!!b), title: i === 0 ? "sign" : i < 9 ? "exponent bit" : "fraction bit", onclick: () => { bits[i] ^= 1; inp.value = String(valOf(bits)); draw(); } }, LW.h("b", { text: String(b) }))); });
      board.append(LW.h("div", { class: "fb-legend" }, LW.h("span", { class: "c-s", text: "sign (1 bit)" }), LW.h("span", { class: "c-e", text: "exponent (8 bits)" }), LW.h("span", { class: "c-m", text: "fraction (23 bits)" })), row);
      const s = bits[0], E = bits.slice(1, 9).reduce((a, b) => a * 2 + b, 0), F = bits.slice(9).reduce((a, b) => a * 2 + b, 0), v = valOf(bits);
      let formula, kind;
      if (E === 255) { formula = F ? "exponent all ones, fraction ≠ 0 → <b>NaN</b> (not a number)" : `exponent all ones, fraction 0 → <b>${s ? "−" : "+"}∞</b>`; kind = "special"; }
      else if (E === 0) { formula = `(−1)<sup class="c-s">${s}</sup> × <span class="c-m">0.${F.toString(2).padStart(23, "0").replace(/0+$/, "") || "0"}</span><sub>2</sub> × 2<sup class="c-e">−126</sup>`; kind = F ? "subnormal (tiny numbers lose precision gradually)" : "zero"; }
      else { formula = `(−1)<sup class="c-s">${s}</sup> × <span class="c-m">1.${F.toString(2).padStart(23, "0").replace(/0+$/, "") || "0"}</span><sub>2</sub> × 2<sup class="c-e">${E} − 127 = ${E - 127}</sup>`; kind = "normal number"; }
      const typed = Number(String(inp.value).replace("−", "-")), exact = Number.isFinite(typed) ? typed : null;
      const next = (() => { if (!Number.isFinite(v)) return NaN; const b2 = bitsOf(Math.abs(v)); const u = b2.reduce((a, b) => a * 2 + b, 0) + 1; f32.setUint32(0, u); return f32.getFloat32(0) - Math.abs(v); })();
      out.innerHTML = `<p class="fb-eq">${formula}</p>
        <div class="lw-stats"><span><small>stored value (exactly)</small><b>${Number.isFinite(v) ? v.toPrecision(17).replace(/\.?0+(e|$)/, "$1") : String(v)}</b></span>
        <span><small>kind</small><b style="font-size:.78rem">${kind}</b></span>
        <span><small>gap to the next float</small><b>${Number.isFinite(next) ? next.toExponential(3) : "–"}</b></span>
        ${exact !== null && Number.isFinite(v) && exact !== 0 ? `<span class="${v === exact ? "good" : "bad"}"><small>error versus what you typed</small><b>${v === exact ? "exact" : ((v - exact) / exact).toExponential(2)}</b></span>` : ""}</div>`;
    }
    render();
  });
})();
