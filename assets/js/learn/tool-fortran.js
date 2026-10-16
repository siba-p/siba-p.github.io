/* 1.4 Fortran: how a 2D array is laid out in memory (column- vs row-major), and why loop order
   decides whether the CPU reads memory contiguously. */
(function () {
  "use strict";
  LW.register("colmajor", function (root) {
    const R = 4, Cc = 6, LINE = 4;              // rows, columns, elements per cache line
    let lang = "f", order = "i", k = -1, lines = 0, lastLine = -1, cache = [];
    const P = LW.canvas(root, { height: w => Math.min(380, Math.max(300, w * 0.48)) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Language and layout", options: [["f", "Fortran (column-major)"], ["c", "C / NumPy (row-major)"]], value: lang, onChange: v => { lang = v; reset(); } });
    LW.seg(ctl, { label: "Loop order", options: [["i", "Inner loop over the first index (i)"], ["j", "Inner loop over the second index (j)"]], value: order, onChange: v => { order = v; reset(); } });
    const c2 = LW.controls(root);
    const playB = LW.button(c2, "Play", () => { if (k >= R * Cc - 1) reset(); playB.textContent = loop.toggle() ? "Pause" : "Play"; }, { primary: true });
    LW.button(c2, "Step", () => { advance(); draw(); });
    LW.button(c2, "Reset", () => reset());
    const S = LW.stats(root, [["el", "element"], ["off", "memory offset"], ["stride", "jump from previous"], ["lines", "cache lines loaded (cache holds 2)"]]);
    const code = LW.h("pre", { class: "fm-code" }); root.append(code);
    const seqFor = () => { const s = []; const innerI = order === "i"; if (innerI) { for (let j = 0; j < Cc; j++) for (let i = 0; i < R; i++) s.push([i, j]); } else { for (let i = 0; i < R; i++) for (let j = 0; j < Cc; j++) s.push([i, j]); } return s; };
    const off = (i, j) => (lang === "f" ? j * R + i : i * Cc + j);
    let S0 = seqFor();
    function reset() { k = -1; lines = 0; lastLine = -1; cache = []; S0 = seqFor(); loop.stop(); playB.textContent = "Play"; codeText(); draw(); }
    function advance() { if (k >= R * Cc - 1) { loop.stop(); playB.textContent = "Play"; return; } k++; const [i, j] = S0[k], ln = Math.floor(off(i, j) / LINE); if (!cache.includes(ln)) { lines++; cache.push(ln); if (cache.length > 2) cache.shift(); } lastLine = ln; }
    let acc = 0; const loop = LW.loop(root, dt => { acc += dt; if (acc > 0.35) { acc = 0; advance(); draw(); } });
    function codeText() {
      const innerI = order === "i";
      code.textContent = lang === "f"
        ? (innerI ? "do j = 1, 6          ! outer: columns\n   do i = 1, 4       ! inner: rows -> consecutive in memory\n      A(i, j) = 2.0 * A(i, j)\n   end do\nend do" : "do i = 1, 4          ! outer: rows\n   do j = 1, 6       ! inner: columns -> jumps of 4 elements\n      A(i, j) = 2.0 * A(i, j)\n   end do\nend do")
        : (innerI ? "for (int j = 0; j < 6; j++)      // outer: columns\n    for (int i = 0; i < 4; i++)  // inner: rows -> jumps of 6 elements\n        a[i][j] *= 2.0;" : "for (int i = 0; i < 4; i++)      // outer: rows\n    for (int j = 0; j < 6; j++)  // inner: columns -> consecutive in memory\n        a[i][j] *= 2.0;");
    }
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const cs = Math.min((W - 120) / Cc, (H - 150) / R, 52), gx = 70, gy = 34;
      LW.text(ctx, lang === "f" ? "A(i, j), i = 1…4 rows, j = 1…6 columns" : "a[i][j], i = 0…3 rows, j = 0…5 columns", gx, 18, { color: C.ink2, size: 12, weight: 600 });
      const cur = k >= 0 ? S0[k] : null;
      for (let i = 0; i < R; i++) for (let j = 0; j < Cc; j++) {
        const x = gx + j * cs, y = gy + i * cs, visited = k >= 0 && S0.slice(0, k + 1).some(([a, b]) => a === i && b === j), isCur = cur && cur[0] === i && cur[1] === j;
        ctx.fillStyle = isCur ? C.orange : visited ? (C.dark ? "rgba(135,150,255,.28)" : "rgba(59,80,224,.14)") : C.card; ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
        ctx.strokeStyle = C.line2; ctx.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3);
        LW.text(ctx, lang === "f" ? `${i + 1},${j + 1}` : `${i},${j}`, x + cs / 2, y + cs / 2, { color: isCur ? "#fff" : C.ink2, size: 11, align: "center", base: "middle", mono: true });
      }
      // memory strip
      const my = gy + R * cs + 46, mw = Math.min((W - gx - 20) / (R * Cc), 34);
      LW.text(ctx, "memory, address increasing →  (boxes group cache lines of " + LINE + " elements)", gx, my - 12, { color: C.ink2, size: 12, weight: 600 });
      for (let a = 0; a < R * Cc; a++) {
        let ii, jj; if (lang === "f") { ii = a % R; jj = Math.floor(a / R); } else { ii = Math.floor(a / Cc); jj = a % Cc; }
        const x = gx + a * mw, isCur = cur && off(cur[0], cur[1]) === a, inCache = cache.includes(Math.floor(a / LINE));
        ctx.fillStyle = isCur ? C.orange : inCache ? (C.dark ? "rgba(60,201,189,.25)" : "rgba(14,149,139,.15)") : C.card; ctx.fillRect(x + 1, my + 1, mw - 2, 30);
        ctx.strokeStyle = C.line2; ctx.strokeRect(x + 1.5, my + 1.5, mw - 3, 29);
        if (mw > 24) LW.text(ctx, lang === "f" ? `${ii + 1},${jj + 1}` : `${ii},${jj}`, x + mw / 2, my + 16, { color: isCur ? "#fff" : C.ink3, size: 9, align: "center", base: "middle", mono: true });
        if (a % LINE === 0) { ctx.strokeStyle = C.teal; ctx.lineWidth = 2; ctx.strokeRect(x + 0.5, my - 3, mw * LINE - 1, 37); ctx.lineWidth = 1; }
      }
      if (k > 0) { const a0 = off(...S0[k - 1]), a1 = off(...S0[k]); if (Math.abs(a1 - a0) > 1) { const x0 = gx + a0 * mw + mw / 2, x1 = gx + a1 * mw + mw / 2, yy = my + 40; ctx.strokeStyle = C.rose; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.quadraticCurveTo((x0 + x1) / 2, yy + 26, x1, yy); ctx.stroke(); LW.arrow(ctx, x1 + (x0 > x1 ? 6 : -6), yy + 4, x1, yy, C.rose, 1.6, 6); } }
      if (cur) { const a = off(cur[0], cur[1]), prev = k > 0 ? off(...S0[k - 1]) : null; S.set("el", lang === "f" ? `A(${cur[0] + 1}, ${cur[1] + 1})` : `a[${cur[0]}][${cur[1]}]`); S.set("off", String(a)); S.set("stride", prev === null ? "–" : (a - prev > 0 ? "+" : "") + (a - prev)); }
      else { S.set("el", "–"); S.set("off", "–"); S.set("stride", "–"); }
      S.set("lines", `${lines} (minimum ${R * Cc / LINE})`);
    }
    P.draw = draw; codeText(); draw();
  });
})();
