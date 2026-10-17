/* Small live figure for the "How to read" preview on the Learn hub:
   Boltzmann populations p_n ∝ exp(−n ε / k_BT) of six evenly spaced levels. */
(function () {
  "use strict";
  LW.register("peek", function (root) {
    let T = 1;
    const N = 6, P = LW.canvas(root, { height: 170 });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Temperature k<sub>B</sub>T / ε", min: 0.15, max: 6, value: T, log: true, fmt: v => v.toFixed(2), onInput: v => { T = v; draw(); } });
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const w = Array.from({ length: N }, (_, n) => Math.exp(-n / T)), Z = w.reduce((a, b) => a + b, 0), p = w.map(x => x / Z);
      const top = 12, bot = H - 14, row = (bot - top) / N, lx = 34, lw = Math.min(70, W * 0.2), bx = lx + lw + 16, bw = W - bx - 52;
      for (let n = 0; n < N; n++) {
        const y = bot - (n + 0.5) * row;
        ctx.strokeStyle = C.ink2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + lw, y); ctx.stroke();
        LW.text(ctx, "n=" + n, 4, y + 4, { color: C.ink3, size: 11 });
        ctx.fillStyle = C.teal; ctx.globalAlpha = 0.85; ctx.fillRect(bx, y - row * 0.32, Math.max(1, bw * p[n]), row * 0.64); ctx.globalAlpha = 1;
        LW.text(ctx, (100 * p[n]).toFixed(1) + " %", bx + Math.max(1, bw * p[n]) + 6, y + 4, { color: C.ink2, size: 11 });
      }
    }
    P.draw = draw; draw(); LW.onTheme(draw);
  });
})();
