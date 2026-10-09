const WW = require("../assets/js/windowwise-core.js");
const assert = (c, m) => { if (!c) { console.log("FAIL:", m); process.exitCode = 1; } else console.log("ok  :", m); };
const T = 300, unit = "kJ/mol", kt = WW.kT(T, unit);
// Morse-type adsorption PMF: well depth 30 kJ/mol at 0.7 nm, plateau at large distance.
const D = 30, a = 3.5, x0 = 0.7;
const F = x => D * ((1 - Math.exp(-a * (x - x0))) ** 2 - 1);

// 1. planner
const p = WW.plan({ xmin: 0.5, xmax: 2.5, T, unit, overlap: 0.3, mode: "auto", slope: 60, kMin: 500 });
assert(Math.abs(WW.gaussOverlap(2 * -WW.invNorm(0.15) * p.sigma, p.sigma) - 0.3) < 1e-6, `overlap formula self-consistent (z=${(-WW.invNorm(0.15)).toFixed(4)})`);
assert(p.overlap >= 0.3 - 1e-9, `plan overlap ${p.overlap.toFixed(3)} >= target; k=${p.k.toFixed(0)} spacing=${p.spacing.toFixed(4)} n=${p.n}`);
assert(p.shift <= 0.52 * p.spacing, `slope-induced shift ${p.shift.toFixed(4)} <= half spacing`);

// 2. WHAM accuracy on well-sampled windows
const centers = []; for (let c = 0.5; c <= 2.5 + 1e-9; c += 0.05) centers.push(+c.toFixed(3));
const wins = WW.synthetic({ F, centers, k: 3000, T, unit, n: 4000, stride: 5, burn: 2000, seed: 3 });
const t0 = Date.now();
const res = WW.analyze({ windows: wins, T, unit, nbins: 120, nboot: 20 });
const dt = Date.now() - t0;
let se = 0, cnt = 0, maxe = 0;
const ref = F(res.bins.centers[0]); // align using mean offset over well-sampled bins
const pairs = [];
res.bins.centers.forEach((x, b) => { if (Number.isFinite(res.F[b]) && x > 0.55 && x < 2.45) pairs.push([res.F[b], F(x)]); });
const off = pairs.reduce((s, [w, t]) => s + (w - t), 0) / pairs.length;
pairs.forEach(([w, t]) => { const e = w - t - off; se += e * e; cnt++; maxe = Math.max(maxe, Math.abs(e)); });
const rmse = Math.sqrt(se / cnt);
assert(res.converged, `WHAM converged in ${res.iter} iterations (+20 bootstraps in ${dt} ms)`);
assert(rmse < 0.5, `PMF RMSE vs exact = ${rmse.toFixed(3)} kJ/mol (max ${maxe.toFixed(2)}) over ${cnt} bins`);
const errs = res.err.filter(Number.isFinite);
assert(errs.length > 50 && Math.max(...errs) < 3, `bootstrap errors finite; median ${errs.sort((x, y) => x - y)[errs.length >> 1].toFixed(3)} kJ/mol`);
assert(res.flags.filter(f => f.kind === "overlap").length === 0, `no overlap flags for well-designed set (min overlap ${Math.min(...res.pairs.map(p => p.overlap)).toFixed(2)})`);

// 3. gap detection: remove windows between 1.30 and 1.50
const gapWins = wins.filter(w => w.center < 1.3 - 1e-9 || w.center > 1.5 + 1e-9);
const r2 = WW.analyze({ windows: gapWins, T, unit, nbins: 120, nboot: 0 });
const ov = r2.flags.filter(f => f.kind === "overlap");
assert(ov.length >= 1, `gap flagged: ${ov.map(f => f.text).join(" | ")}`);
const inGap = r2.suggestions.filter(s => s.target > 1.25 && s.target < 1.55);
assert(inGap.length >= 1, `suggested windows in gap: ${inGap.map(s => s.center.toFixed(3) + "@k" + Math.round(s.k)).join(", ")}`);

// 4. soft springs on steep wall -> drift flag
const soft = WW.synthetic({ F, centers: centers.filter(c => c <= 1.0), k: 300, T, unit, n: 3000, stride: 5, burn: 2000, seed: 5 });
const r3 = WW.analyze({ windows: soft, T, unit, nbins: 80, nboot: 0 });
assert(r3.flags.some(f => f.kind === "drift"), `soft springs on steep wall flagged as drift (${r3.flags.filter(f => f.kind === "drift").length} windows)`);

// 5. parsers
const xvg = "# GROMACS\n@ title \"pull\"\n@ xaxis label\n0.000 1.2345\n0.100 1.2400\n0.200\t1.2500\n";
assert(WW.parseSeries(xvg).length === 3 && Math.abs(WW.parseSeries(xvg)[2] - 1.25) < 1e-12, "xvg parsing skips # and @ lines");
const meta = WW.parseMetadata("# comment\n/run/pullx_0.50.xvg 0.50 1000\npullx_0.60.xvg 0.60 1000 10\n");
assert(meta && meta.length === 2 && meta[0].file === "pullx_0.50.xvg" && meta[1].k === 1000, "Grossfield metadata parsing");
assert(WW.numberFromName("umbrella_1.35.xvg") === 1.35 && WW.numberFromName("pullx-12.xvg") === 12, "centre from file name");
// 6. log-space fallback agrees with linear on a deep PMF (forces overflow of exp(f))
const Fdeep = x => 2000 * ((1 - Math.exp(-3.5 * (x - 0.7))) ** 2 - 1);
const dc = []; for (let c = 0.6; c <= 1.6 + 1e-9; c += 0.02) dc.push(+c.toFixed(3));
const dw = WW.synthetic({ F: Fdeep, centers: dc, k: 60000, T, unit, n: 1500, stride: 4, burn: 1000, seed: 9 });
const rd = WW.analyze({ windows: dw, T, unit, nbins: 100, nboot: 0 });
const pr = []; rd.bins.centers.forEach((x, b) => { if (Number.isFinite(rd.F[b]) && x > 0.62 && x < 1.58) pr.push([rd.F[b], Fdeep(x)]); });
const o2 = pr.reduce((s, [w, t]) => s + (w - t), 0) / pr.length;
const rm2 = Math.sqrt(pr.reduce((s, [w, t]) => s + (w - t - o2) ** 2, 0) / pr.length);
assert(rd.converged && rm2 < 2, `deep PMF (~2000 kJ/mol): converged=${rd.converged}, RMSE ${rm2.toFixed(2)} kJ/mol (~${(2000/kt).toFixed(0)} kT deep)`);
