/* Computing 1: a toy stored-program computer (fetch–decode–execute) and the memory-latency ladder. */
(function () {
  "use strict";
  const PROGRAMS = {
    sum: { name: "Sum 1 + 2 + … + n", code: [["LOAD", 14], ["ADD", 13], ["STORE", 14], ["LOAD", 13], ["SUB", 15], ["STORE", 13], ["JNZ", 0], ["HALT", 0]], data: { 13: 5, 14: 0, 15: 1 }, labels: { 13: "n", 14: "sum", 15: "one" }, param: 13, pmax: 9, result: 14 },
    mul: { name: "Multiply a × b by repeated addition", code: [["LOAD", 14], ["ADD", 12], ["STORE", 14], ["LOAD", 13], ["SUB", 15], ["STORE", 13], ["JNZ", 0], ["HALT", 0]], data: { 12: 7, 13: 3, 14: 0, 15: 1 }, labels: { 12: "a", 13: "b", 14: "product", 15: "one" }, param: 13, pmax: 9, result: 14 }
  };
  const EXPLAIN = {
    LOAD: "copy the number stored at the address into the accumulator",
    ADD: "add the number at the address to the accumulator (the ALU does the arithmetic)",
    SUB: "subtract the number at the address from the accumulator",
    STORE: "copy the accumulator into memory at the address",
    JNZ: "jump: if the accumulator is not zero, load the address into the program counter",
    HALT: "stop the machine"
  };
  LW.register("cpu", function (root) {
    let key = "sum", mem, pc, acc, ir, phase, cycles, halted, bus = null, nval = 5;
    const P = LW.canvas(root, { height: w => (w < 620 ? 540 : 290) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Program in memory", options: Object.keys(PROGRAMS).map(k => [k, PROGRAMS[k].name]), value: key, onChange: v => { key = v; reset(); } });
    const ps = LW.slider(ctl, { label: "Input value (n or b)", min: 1, max: 9, step: 1, value: nval, fmt: v => String(v), onInput: v => { nval = v; reset(); } });
    const c2 = LW.controls(root);
    LW.button(c2, "Step one phase", () => { step(); draw(); }, { primary: true });
    const runB = LW.button(c2, "Run", () => { runB.textContent = loop.toggle() ? "Pause" : "Run"; });
    LW.button(c2, "Reset", () => reset());
    const sp = LW.slider(c2, { label: "Speed", min: 1, max: 20, step: 1, value: 4, fmt: v => v + "×" });
    const msg = LW.note(root, "");
    function reset() {
      const pr = PROGRAMS[key]; mem = new Array(16).fill(null);
      pr.code.forEach((c, i) => { mem[i] = { op: c[0], a: c[1] }; });
      Object.entries(pr.data).forEach(([a, v]) => { mem[+a] = { v }; });
      mem[pr.param] = { v: nval };
      pc = 0; acc = 0; ir = null; phase = "fetch"; cycles = 0; halted = false; bus = null;
      loop.stop(); runB.textContent = "Run"; msg.set("Press <b>Step one phase</b>. Each instruction takes three phases: fetch it from memory, decode it, execute it."); draw();
    }
    function step() {
      if (halted) return;
      cycles++;
      if (phase === "fetch") { ir = mem[pc]; bus = { from: "mem", to: "ir", addr: pc, label: `${ir.op} ${ir.op === "HALT" ? "" : ir.a}` }; msg.set(`<b>Fetch.</b> The program counter holds ${pc}, so the control unit reads memory address ${pc} over the bus into the instruction register, then adds 1 to the program counter.`); pc++; phase = "decode"; }
      else if (phase === "decode") { bus = null; msg.set(`<b>Decode.</b> The instruction is <code>${ir.op}${ir.op === "HALT" ? "" : " " + ir.a}</code>: ${EXPLAIN[ir.op]}.`); phase = "exec"; }
      else {
        const a = ir.a, v = mem[a] && mem[a].v !== undefined ? mem[a].v : 0; let t = "";
        if (ir.op === "LOAD") { acc = v; bus = { from: "mem", to: "acc", addr: a, label: String(v) }; t = `accumulator ← memory[${a}] = ${v}`; }
        else if (ir.op === "ADD") { bus = { from: "mem", to: "alu", addr: a, label: String(v) }; t = `accumulator ← ${acc} + ${v} = ${acc + v}`; acc += v; }
        else if (ir.op === "SUB") { bus = { from: "mem", to: "alu", addr: a, label: String(v) }; t = `accumulator ← ${acc} − ${v} = ${acc - v}`; acc -= v; }
        else if (ir.op === "STORE") { mem[a] = { v: acc }; bus = { from: "acc", to: "mem", addr: a, label: String(acc) }; t = `memory[${a}] ← ${acc}`; }
        else if (ir.op === "JNZ") { bus = null; if (acc !== 0) { pc = a; t = `accumulator is ${acc}, not zero, so the program counter jumps to ${a}: the loop repeats`; } else t = "accumulator is zero, so no jump: the loop ends"; }
        else if (ir.op === "HALT") { halted = true; bus = null; const r = PROGRAMS[key].result; t = `the machine stops. The answer, ${mem[r].v}, is in memory address ${r}`; loop.stop(); runB.textContent = "Run"; }
        msg.set(`<b>Execute.</b> ${t}.`);
        phase = "fetch";
      }
    }
    let acc2 = 0;
    const loop = LW.loop(root, dt => { acc2 += dt * sp.value; if (acc2 > 0.6) { acc2 = 0; step(); draw(); } });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const narrow = W < 620, cpuW = narrow ? W - 20 : W * 0.44, cpuH = narrow ? H * 0.42 : H - 30, cx = 10, cy = 14;
      const mx = narrow ? 10 : W * 0.56, my = narrow ? cy + cpuH + 34 : 14, mw = narrow ? W - 20 : W * 0.44 - 10, mh = narrow ? H - my - 8 : H - 30;
      const box = (x, y, w, h, title, fill) => { ctx.fillStyle = fill || C.card; ctx.strokeStyle = C.line2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); ctx.stroke(); if (title) LW.text(ctx, title, x + 10, y + 18, { color: C.ink2, size: 11, weight: 600 }); };
      box(cx, cy, cpuW, cpuH, "PROCESSOR (CPU)", C.bg2);
      const reg = (x, y, w, name, val, hot, col) => { box(x, y, w, 46, null, hot ? (C.dark ? "rgba(255,159,90,.18)" : "rgba(224,112,28,.10)") : C.card); LW.text(ctx, name, x + 8, y + 15, { color: C.ink3, size: 10, weight: 600 }); LW.text(ctx, val, x + 8, y + 36, { color: col || C.ink, size: 15, weight: 600, mono: true }); };
      const rw = (cpuW - 40) / 2;
      const hotPc = phase === "decode" || (bus && bus.to === "ir"), hotIr = bus && bus.to === "ir", hotAcc = bus && (bus.to === "acc" || bus.to === "alu" || bus.from === "acc");
      reg(cx + 14, cy + 32, rw, "PROGRAM COUNTER", String(pc), hotPc, C.accent);
      reg(cx + 26 + rw, cy + 32, rw, "INSTRUCTION REGISTER", ir ? ir.op + (ir.op === "HALT" ? "" : " " + ir.a) : "–", hotIr, C.violet);
      reg(cx + 14, cy + 92, rw, "ACCUMULATOR", String(acc), hotAcc, C.orange);
      box(cx + 26 + rw, cy + 92, rw, 46, null, bus && bus.to === "alu" ? (C.dark ? "rgba(60,201,189,.2)" : "rgba(14,149,139,.12)") : C.card);
      LW.text(ctx, "ALU", cx + 34 + rw, cy + 107, { color: C.ink3, size: 10, weight: 600 }); LW.text(ctx, "+  −  compare", cx + 34 + rw, cy + 128, { color: C.teal, size: 13, weight: 600 });
      const phY = cy + 152; ["fetch", "decode", "exec"].forEach((ph, i) => { const w2 = (cpuW - 40) / 3, x = cx + 14 + i * (w2 + 6); const on = ph === phase && !halted; ctx.fillStyle = on ? C.accent : C.card; ctx.strokeStyle = C.line2; ctx.beginPath(); ctx.roundRect(x, phY, w2, 26, 13); ctx.fill(); ctx.stroke(); LW.text(ctx, ["1 fetch", "2 decode", "3 execute"][i], x + w2 / 2, phY + 17, { color: on ? "#fff" : C.ink2, size: 11, weight: 600, align: "center" }); });
      if (cpuH > 200) LW.text(ctx, `clock cycles: ${cycles}${halted ? "   (halted)" : ""}`, cx + 14, phY + 50, { color: C.ink3, size: 11, mono: true });
      box(mx, my, mw, mh, "MEMORY (RAM)", C.bg2);
      const cols = narrow ? 8 : 4, rows = 16 / cols, cw = (mw - 20) / cols, ch = Math.min(46, (mh - 32) / rows), pr = PROGRAMS[key];
      const cellPos = a => [mx + 10 + (a % cols) * cw, my + 26 + Math.floor(a / cols) * ch];
      mem.forEach((m, a) => { const [x, y] = cellPos(a), isPc = a === pc && !halted && phase === "fetch", isBus = bus && bus.addr === a;
        ctx.fillStyle = isBus ? (C.dark ? "rgba(255,159,90,.25)" : "rgba(224,112,28,.14)") : C.card; ctx.strokeStyle = isPc ? C.accent : C.line; ctx.lineWidth = isPc ? 2.2 : 1; ctx.beginPath(); ctx.roundRect(x + 2, y + 2, cw - 4, ch - 4, 6); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1;
        LW.text(ctx, String(a), x + 7, y + 13, { color: C.ink3, size: 9, mono: true });
        const txt = !m ? "" : m.op ? m.op + (m.op === "HALT" ? "" : " " + m.a) : String(m.v);
        LW.text(ctx, txt, x + cw / 2, y + ch / 2 + 6, { color: m && m.op ? C.violet : C.orange, size: Math.min(13, cw / 6), weight: 600, align: "center", mono: true });
        if (pr.labels[a]) LW.text(ctx, pr.labels[a], x + cw - 7, y + 13, { color: C.ink3, size: 9, align: "right" }); });
      if (bus) { const [x, y] = cellPos(bus.addr), mxp = x + cw / 2, myp = y + ch / 2, tx = bus.to === "ir" ? cx + 26 + rw * 1.5 : bus.to === "alu" ? cx + 26 + rw * 1.5 : cx + 14 + rw / 2, ty = bus.to === "ir" ? cy + 55 : cy + 115;
        const [x0, y0, x1, y1] = bus.from === "mem" ? [mxp, myp, tx, ty] : [cx + 14 + rw / 2, cy + 115, mxp, myp];
        ctx.strokeStyle = C.orange; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]); LW.arrow(ctx, x0 + (x1 - x0) * 0.8, y0 + (y1 - y0) * 0.8, x1, y1, C.orange, 2.5, 9);
        LW.text(ctx, bus.label, (x0 + x1) / 2 + 6, (y0 + y1) / 2 - 6, { color: C.orange, size: 12, weight: 700, mono: true }); }
    }
    P.draw = draw; reset();
  });

  /* the memory hierarchy: latency on a log scale, with a human-scale translation */
  const LAT = [["CPU register", 0.3e-9, "a few hundred bytes"], ["L1 cache", 1e-9, "32–64 KB per core"], ["L2 cache", 4e-9, "0.5–2 MB per core"], ["L3 cache", 15e-9, "8–64 MB shared"], ["Main memory (RAM)", 90e-9, "16 GB – 1 TB"],
    ["NVMe SSD, random read", 80e-6, "1–8 TB"], ["Network round trip, same data centre", 0.5e-3, "–"], ["Hard disk, seek", 5e-3, "2–20 TB"], ["Internet round trip, Europe ↔ India", 0.15, "–"]];
  const human = s => { const t = s / 0.3e-9; return t < 60 ? t.toFixed(t < 10 ? 1 : 0) + " s" : t < 3600 ? (t / 60).toFixed(1) + " min" : t < 86400 ? (t / 3600).toFixed(1) + " h" : t < 3.15e7 ? (t / 86400).toFixed(1) + " days" : (t / 3.15e7).toFixed(1) + " years"; };
  const real = s => (s < 1e-6 ? (s * 1e9).toFixed(s < 1e-9 ? 1 : 0) + " ns" : s < 1e-3 ? (s * 1e6).toFixed(0) + " µs" : (s * 1e3).toFixed(s < 0.01 ? 1 : 0) + " ms");
  LW.register("latency", function (root) {
    let hum = false;
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Show times as", options: [["real", "Real time"], ["human", "If one clock cycle took one second"]], value: "real", onChange: v => { hum = v === "human"; draw(); } });
    const P = LW.canvas(root, { height: w => (w < 600 ? 470 : 380) });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const lab = W < 600 ? 150 : 250, x0 = lab + 10, x1 = W - 90, rowH = (H - 30) / LAT.length, lo = Math.log10(0.2e-9), hi = Math.log10(0.3);
      const X = s => x0 + (Math.log10(s) - lo) / (hi - lo) * (x1 - x0);
      [1e-9, 1e-6, 1e-3, 1].forEach(s => { if (s > 0.3) return; ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(X(s), 4); ctx.lineTo(X(s), H - 24); ctx.stroke(); LW.text(ctx, ["1 ns", "1 µs", "1 ms", "1 s"][[1e-9, 1e-6, 1e-3, 1].indexOf(s)], X(s), H - 8, { color: C.ink3, size: 10, align: "center", mono: true }); });
      LAT.forEach(([name, s, cap], i) => { const y = 8 + i * rowH, f = i / (LAT.length - 1);
        LW.text(ctx, name, lab, y + rowH * 0.42, { color: C.ink, size: 12, weight: 600, align: "right" }); LW.text(ctx, cap, lab, y + rowH * 0.42 + 14, { color: C.ink3, size: 10, align: "right" });
        ctx.fillStyle = LW.ramp(0.25 + 0.75 * f, C); ctx.beginPath(); ctx.roundRect(x0, y + 4, Math.max(4, X(s) - x0), rowH - 12, 5); ctx.fill();
        LW.text(ctx, hum ? human(s) : real(s), X(s) + 8, y + rowH / 2 + 2, { color: C.ink2, size: 12, weight: 600, mono: true }); });
    }
    P.draw = draw; draw();
  });
})();
