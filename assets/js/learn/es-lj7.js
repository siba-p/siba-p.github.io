/* The two-dimensional Lennard-Jones heptamer (LJ7), the running example of the enhanced-sampling book.
   Reduced units: epsilon = sigma = m = 1, time unit tau = sigma sqrt(m/epsilon). A soft wall keeps
   atoms within 2 sigma of the centre of mass so that the cluster cannot evaporate.
   Ground state: hexagon with a central atom (E = -12.53); the next isomers lie about 1 epsilon higher. */
(function () {
  "use strict";
  const N = 7, RW = 2.0, KW = 20, RB = 1.38;
  function rng(seed) { let s = seed >>> 0; const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    r.normal = () => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }; return r; }
  function force(p, f) { let E = 0, cx = 0, cy = 0; for (let i = 0; i < N; i++) { f[i] = [0, 0]; cx += p[i][0] / N; cy += p[i][1] / N; }
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const dx = p[i][0] - p[j][0], dy = p[i][1] - p[j][1], r2 = dx * dx + dy * dy, ir6 = 1 / (r2 * r2 * r2); E += 4 * (ir6 * ir6 - ir6); const ff = 24 * (2 * ir6 * ir6 - ir6) / r2; f[i][0] += ff * dx; f[i][1] += ff * dy; f[j][0] -= ff * dx; f[j][1] -= ff * dy; }
    for (let i = 0; i < N; i++) { const dx = p[i][0] - cx, dy = p[i][1] - cy, r = Math.hypot(dx, dy); if (r > RW) { const d = r - RW; E += 0.5 * KW * d * d; f[i][0] -= KW * d * dx / r; f[i][1] -= KW * d * dy / r; } }
    return E; }
  const hexagon = () => { const p = [[0, 0]]; for (let k = 0; k < 6; k++) p.push([1.12 * Math.cos(k * Math.PI / 3), 1.12 * Math.sin(k * Math.PI / 3)]); return p; };
  // a higher isomer: seven sites of a triangular lattice in a trapezoid, relaxed (E = -11.50)
  const trapezoid = () => { const p = [[0, 0], [1, 0], [2, 0], [0.5, 0.866], [1.5, 0.866], [2.5, 0.866], [1, 1.732]].map(q => [q[0] * 1.12 - 1.2, q[1] * 1.12 - 0.6]); const f = []; for (let k = 0; k < 3000; k++) { force(p, f); for (let i = 0; i < N; i++) { p[i][0] += 0.002 * f[i][0]; p[i][1] += 0.002 * f[i][1]; } } return p; };
  const TRAP = trapezoid();
  function coordination(p) { return p.map((q, i) => p.reduce((n, o, j) => n + (j !== i && Math.hypot(q[0] - o[0], q[1] - o[1]) < RB ? 1 : 0), 0)); }
  const isHexagon = p => coordination(p).some(c => c === 6);
  function make(seed, kT, start) { const R = rng(seed), p = (start === "hexagon" ? hexagon() : TRAP).map(q => q.slice()), v = p.map(() => [R.normal() * Math.sqrt(kT), R.normal() * Math.sqrt(kT)]), f = []; return { p, v, f, E: force(p, f), kT, R }; }
  // BAOAB Langevin step, friction gamma (1/tau)
  function step(s, dt, gamma) { const { p, v, f, R } = s, c1 = Math.exp(-gamma * dt), c2 = Math.sqrt((1 - c1 * c1) * s.kT);
    for (let i = 0; i < N; i++) { v[i][0] += 0.5 * dt * f[i][0]; v[i][1] += 0.5 * dt * f[i][1]; p[i][0] += 0.5 * dt * v[i][0]; p[i][1] += 0.5 * dt * v[i][1];
      v[i][0] = c1 * v[i][0] + c2 * R.normal(); v[i][1] = c1 * v[i][1] + c2 * R.normal(); p[i][0] += 0.5 * dt * v[i][0]; p[i][1] += 0.5 * dt * v[i][1]; }
    s.E = force(p, f); for (let i = 0; i < N; i++) { v[i][0] += 0.5 * dt * f[i][0]; v[i][1] += 0.5 * dt * f[i][1]; } }
  // draw a cluster centred in a box
  function drawCluster(ctx, C, s, box, col, alpha) { const { p } = s; let cx = 0, cy = 0; p.forEach(q => { cx += q[0] / N; cy += q[1] / N; });
    const sc = box.w / 6.2, X = x => box.x + box.w / 2 + (x - cx) * sc, Y = y => box.y + box.h / 2 - (y - cy) * sc, co = coordination(p);
    ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.strokeStyle = C.line2; ctx.lineWidth = 1.4;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]) < RB) { ctx.beginPath(); ctx.moveTo(X(p[i][0]), Y(p[i][1])); ctx.lineTo(X(p[j][0]), Y(p[j][1])); ctx.stroke(); }
    for (let i = 0; i < N; i++) { ctx.beginPath(); ctx.arc(X(p[i][0]), Y(p[i][1]), Math.max(1, 0.42 * sc), 0, 7); ctx.fillStyle = col; ctx.fill(); if (co[i] === 6) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke(); } }
    ctx.globalAlpha = 1; }
  LW.lj7 = { N, rng, force, make, step, coordination, isHexagon, drawCluster, hexagon, TRAP };
})();
