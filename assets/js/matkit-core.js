/* nanomatkit core (JS port of github.com/siba-p/nanomatkit): nanoparticles, powder XRD, box composition. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MAT = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const NA = 6.02214076e23;

  /* ================= nanoparticles ================= */
  const METALS = { Au: [4.0782, 196.967], Ag: [4.0862, 107.868], Cu: [3.6149, 63.546], Pt: [3.9242, 195.084], Pd: [3.8907, 106.42], Ni: [3.5240, 58.693], Al: [4.0495, 26.982], Ir: [3.8390, 192.217], Rh: [3.8034, 102.906] };
  const OFFS = [[1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0], [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1], [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1]];
  function build(shape, k, gammaRatio, radius) {
    k = Math.max(1, Math.round(k));
    let S = Infinity, M = Infinity, hole = false, R = null;
    if (shape === "cuboctahedron") { S = 2 * k; M = k; }
    else if (shape === "truncated_octahedron") { S = 3 * k; M = 2 * k; hole = k % 2 === 1; }
    else if (shape === "octahedron") { S = k; hole = k % 2 === 1; }
    else if (shape === "cube") { M = k; hole = k % 2 === 1; }
    else if (shape === "wulff") { S = 2 * k; M = (gammaRatio || 2 / Math.sqrt(3)) * S / Math.sqrt(3); }
    else if (shape === "sphere") { R = radius != null ? radius : 2 * k; }
    const ext = (R != null ? Math.ceil(R) : Math.ceil(Math.min(S, 3 * M))) + 3, P = [];
    for (let i = -ext; i <= ext; i++) for (let j = -ext; j <= ext; j++) for (let l = -ext; l <= ext; l++) {
      if (((i + j + l) % 2 + 2) % 2 !== 0) continue;
      const x = i - (hole ? 1 : 0), y = j, z = l;
      if (R != null) { if (Math.sqrt(x * x + y * y + z * z) <= R + 1e-9) P.push([x, y, z]); }
      else if (Math.abs(x) + Math.abs(y) + Math.abs(z) <= S + 1e-9 && Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) <= M + 1e-9) P.push([x, y, z]);
    }
    return P;
  }
  function siteClass(cn) { return cn >= 12 ? "bulk" : cn === 9 ? "{111} facet" : cn === 8 ? "{100} facet" : cn === 7 ? "edge" : cn > 9 ? "bulk" : "vertex"; }
  function analyse(P, metal) {
    const [a, molar] = METALS[metal], key = new Map(P.map((p, i) => [p.join(","), i]));
    const nb = P.map(p => OFFS.map(o => key.get(`${p[0] + o[0]},${p[1] + o[1]},${p[2] + o[2]}`)).filter(v => v !== undefined));
    const cn = nb.map(n => n.length), gcn = nb.map(n => n.reduce((s, j) => s + cn[j], 0) / 12);
    const classes = cn.map(siteClass), n = P.length;
    const counts = { "{111} facet": 0, "{100} facet": 0, edge: 0, vertex: 0, bulk: 0 };
    classes.forEach(c => counts[c]++);
    const an = a / 10, nsurf = n - counts.bulk;
    const area = (counts["{111} facet"] + counts.edge + counts.vertex) * Math.sqrt(3) / 4 * an * an + counts["{100} facet"] * an * an / 2;
    let rmax = 0; P.forEach(p => { rmax = Math.max(rmax, Math.hypot(p[0], p[1], p[2])); });
    let span = 0;
    if (n < 2500) for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1], P[i][2] - P[j][2]); if (d > span) span = d; }
    else span = 2 * rmax;
    return { metal, a, P, pos: P.map(p => p.map(v => v * a / 2)), cn, gcn, classes, counts, n, nsurf, dispersion: nsurf / n,
      dEq: Math.cbrt(6 / Math.PI * n * an ** 3 / 4), dMax: (span * a / 2 + a / Math.SQRT2) / 10, mass: n * molar, area,
      f111: counts["{111} facet"] / Math.max(1, counts["{111} facet"] + counts["{100} facet"]) };
  }
  function toXYZ(an, comment) { return `${an.n}\n${comment || `${an.metal} nanoparticle N=${an.n} (nanomatkit)`}\n` + an.pos.map(p => `${an.metal} ${p.map(v => v.toFixed(5).padStart(12)).join(" ")}`).join("\n") + "\n"; }

  /* ================= XRD ================= */
  const CM = {
    Au: [16.8819, 0.4611, 18.5913, 8.6216, 25.5582, 1.4826, 5.86, 36.3956, 12.0658], Ag: [19.2808, 0.6446, 16.6885, 7.4726, 4.8045, 24.6605, 1.0463, 99.8156, 5.179],
    Cu: [13.338, 3.5828, 7.1676, 0.247, 5.6158, 11.3966, 1.6735, 64.8126, 1.191], Pt: [27.0059, 1.51293, 17.7639, 8.81174, 15.7131, 0.424593, 5.7837, 38.6103, 11.6883],
    Pd: [19.3319, 0.698655, 15.5017, 7.98929, 5.29537, 25.2052, 0.605844, 76.8986, 5.26593], Ni: [12.8376, 3.8785, 7.292, 0.2565, 4.4438, 12.1763, 2.38, 66.3421, 1.0341],
    Al: [6.4202, 3.0387, 1.9002, 0.7426, 1.5936, 31.5472, 1.9646, 85.0886, 1.1151], Fe: [11.7695, 4.7611, 7.3573, 0.3072, 3.5222, 15.3535, 2.3045, 76.8805, 1.0369],
    W: [29.0818, 1.72029, 15.43, 9.2259, 14.4327, 0.321703, 5.11982, 57.056, 9.8875], Si: [6.2915, 2.4386, 3.0353, 32.3337, 1.9891, 0.6785, 1.541, 81.6937, 1.1407],
    Na: [4.7626, 3.285, 3.1736, 8.8422, 1.2674, 0.3136, 1.1128, 129.424, 0.676], Cl: [11.4604, 0.0104, 7.1962, 1.1662, 6.2556, 18.5194, 1.6455, 47.7784, -9.5574],
    Mg: [5.4204, 2.8275, 2.1735, 79.2611, 1.2269, 0.3808, 2.3073, 7.1937, 0.8584], O: [3.0485, 13.2771, 2.2868, 5.7011, 1.5463, 0.3239, 0.867, 32.9089, 0.2508],
    Cs: [20.3892, 3.569, 19.1062, 0.3107, 10.662, 24.3879, 1.4953, 213.904, 3.3352]
  };
  const FCC = [[0, 0, 0], [0, .5, .5], [.5, 0, .5], [.5, .5, 0]];
  const STRUCT = {
    fcc: (A) => FCC.map(p => [A, p]), bcc: (A) => [[A, [0, 0, 0]], [A, [.5, .5, .5]]], sc: (A) => [[A, [0, 0, 0]]],
    diamond: (A) => FCC.map(p => [A, p]).concat(FCC.map(p => [A, p.map(c => c + .25)])),
    rocksalt: (A, B) => FCC.map(p => [A, p]).concat(FCC.map(p => [B, [(p[0] + .5) % 1, p[1], p[2]]])),
    cscl: (A, B) => [[A, [0, 0, 0]], [B, [.5, .5, .5]]]
  };
  const MATERIALS = { Au: ["fcc", "Au", null, 4.0782], Ag: ["fcc", "Ag", null, 4.0862], Cu: ["fcc", "Cu", null, 3.6149], Pt: ["fcc", "Pt", null, 3.9242], Pd: ["fcc", "Pd", null, 3.8907], Ni: ["fcc", "Ni", null, 3.5240], Al: ["fcc", "Al", null, 4.0495], Fe: ["bcc", "Fe", null, 2.8665], W: ["bcc", "W", null, 3.1652], Si: ["diamond", "Si", null, 5.4309], NaCl: ["rocksalt", "Na", "Cl", 5.6402], MgO: ["rocksalt", "Mg", "O", 4.2112], CsCl: ["cscl", "Cs", "Cl", 4.123] };
  const WAVELENGTHS = { "Cu Kα": 1.54056, "Co Kα": 1.78897, "Mo Kα": 0.70930, "Cr Kα": 2.28970, "Ag Kα": 0.55941 };
  function ff(el, s) { const c = CM[el], s2 = s * s; return c[0] * Math.exp(-c[1] * s2) + c[2] * Math.exp(-c[3] * s2) + c[4] * Math.exp(-c[5] * s2) + c[6] * Math.exp(-c[7] * s2) + c[8]; }
  function multiplicity(h, k, l) {
    const set = new Set(), v = [h, k, l], perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    for (const p of perms) for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) set.add([sx * v[p[0]], sy * v[p[1]], sz * v[p[2]]].join(","));
    return set.size;
  }
  function peaks(material, lambda, a, ttMin, ttMax, B) {
    const [st, A, Bel, a0] = MATERIALS[material]; a = a || a0; ttMin = ttMin ?? 20; ttMax = ttMax ?? 100; B = B ?? 0.5;
    const basis = STRUCT[st](A, Bel), hmax = Math.ceil(2 * a / lambda) + 1, out = [];
    for (let h = 0; h <= hmax; h++) for (let k = 0; k <= h; k++) for (let l = 0; l <= k; l++) {
      if (!h && !k && !l) continue;
      const d = a / Math.sqrt(h * h + k * k + l * l), x = lambda / (2 * d);
      if (x >= 1) continue;
      const th = Math.asin(x), tt = 2 * th * 180 / Math.PI;
      if (tt < ttMin || tt > ttMax) continue;
      const s = x / lambda; let re = 0, im = 0;
      for (const [el, p] of basis) { const f = ff(el, s), ph = 2 * Math.PI * (h * p[0] + k * p[1] + l * p[2]); re += f * Math.cos(ph); im += f * Math.sin(ph); }
      const F2 = re * re + im * im; if (F2 < 1e-6) continue;
      const m = multiplicity(h, k, l), lp = (1 + Math.cos(2 * th) ** 2) / (Math.sin(th) ** 2 * Math.cos(th));
      out.push({ hkl: [h, k, l], d, tt, m, F2, I: F2 * m * lp * Math.exp(-2 * B * s * s) });
    }
    const imax = Math.max(...out.map(p => p.I), 1e-30); out.forEach(p => { p.I = 100 * p.I / imax; });
    return out.sort((a, b) => a.tt - b.tt);
  }
  function fwhm(tt, lambda, sizeNm, strain, instr, K) {
    K = K || 0.9; const th = tt / 2 * Math.PI / 180;
    const bs = sizeNm ? K * lambda / (sizeNm * 10 * Math.cos(th)) : 0, be = 4 * (strain || 0) * Math.tan(th);
    return Math.hypot(bs + be, (instr ?? 0.05) * Math.PI / 180) * 180 / Math.PI;
  }
  function scherrerSize(tt, fw, lambda, instr, K) {
    K = K || 0.9; const b = Math.sqrt(Math.max((fw * Math.PI / 180) ** 2 - ((instr || 0) * Math.PI / 180) ** 2, 1e-30));
    return K * lambda / (b * Math.cos(tt / 2 * Math.PI / 180)) / 10;
  }
  function pattern(pk, lambda, sizeNm, strain, instr, ttMin, ttMax, n, eta) {
    n = n || 3000; eta = eta ?? 0.5; const x = [], y = [];
    for (let i = 0; i < n; i++) { x.push(ttMin + (ttMax - ttMin) * i / (n - 1)); y.push(0); }
    for (const p of pk) {
      const w = fwhm(p.tt, lambda, sizeNm, strain, instr), lo = Math.max(0, Math.floor((p.tt - 12 * w - ttMin) / (ttMax - ttMin) * (n - 1))), hi = Math.min(n - 1, Math.ceil((p.tt + 12 * w - ttMin) / (ttMax - ttMin) * (n - 1)));
      for (let i = lo; i <= hi; i++) { const u = (x[i] - p.tt) / w; y[i] += p.I * (eta / (1 + 4 * u * u) + (1 - eta) * Math.exp(-4 * Math.LN2 * u * u)); }
    }
    const m = Math.max(...y, 1e-30); return { x, y: y.map(v => 100 * v / m) };
  }

  /* ================= box composition ================= */
  const SOLVENTS = { water: [0.997, 18.015], methanol: [0.7866, 32.042], ethanol: [0.7849, 46.069], DMSO: [1.0955, 78.13], acetonitrile: [0.7766, 41.053], chloroform: [1.4788, 119.38] };
  function counts(V, solutes, solvent, density, Mw0) {
    const [rho0, Mw1] = SOLVENTS[solvent] || [density || 1, Mw0 || 18.015], rho = density || rho0, Mw = Mw0 || Mw1;
    const VL = V * 1e-24, mass = rho * V * 1e-21, n = {};
    solutes.forEach(s => { if (s.unit === "count") n[s.name] = s.value; else if (s.unit === "M") n[s.name] = s.value * NA * VL; });
    const fixedMass = solutes.filter(s => s.name in n).reduce((a, s) => a + n[s.name] * s.M, 0) / NA;
    const molal = solutes.filter(s => s.unit === "m").reduce((a, s) => a + s.value * s.M / 1000, 0);
    const wt = solutes.filter(s => s.unit === "wt%").reduce((a, s) => a + s.value / 100, 0);
    const xs = solutes.filter(s => s.unit === "x");
    const solventMass = (mass * (1 - wt) - fixedMass) / (1 + molal);
    let Nw;
    if (xs.length) {
      const X = xs.reduce((a, s) => a + s.value, 0), Mx = xs.reduce((a, s) => a + s.value * s.M, 0) / (1 - X), other = Object.values(n).reduce((a, v) => a + v, 0);
      Nw = Math.max(0, (solventMass * NA - Mx * other) / (Mw + Mx));
      xs.forEach(s => { n[s.name] = s.value / (1 - X) * (Nw + other); });
    } else Nw = Math.max(0, solventMass * NA / Mw);
    solutes.forEach(s => { if (s.unit === "m") n[s.name] = s.value * Nw * Mw / 1000; else if (s.unit === "wt%") n[s.name] = s.value / 100 * mass * NA / s.M; });
    const exact = Object.assign({ solvent: Nw }, n), out = {};
    for (const k in exact) out[k] = Math.round(exact[k]);
    const tot = Object.values(out).reduce((a, v) => a + v, 0), achieved = {};
    solutes.forEach(s => { const Ns = out[s.name]; achieved[s.name] = { M: Ns / NA / VL, m: out.solvent ? Ns * 1000 / (out.solvent * Mw) : NaN, x: Ns / Math.max(1, tot) }; });
    return { counts: out, exact, achieved, netCharge: solutes.reduce((a, s) => a + (s.charge || 0) * out[s.name], 0), edge: Math.cbrt(V), Mw, rho };
  }
  return { NA, METALS, build, analyse, toXYZ, siteClass, CM, MATERIALS, WAVELENGTHS, ff, multiplicity, peaks, fwhm, scherrerSize, pattern, SOLVENTS, counts };
});
