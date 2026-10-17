/* Machine-learned interatomic potentials: a timeline of models, the Behler–Parrinello architecture,
   angular (circular-harmonic) expansions behind SOAP/ACE, equivariance, message-passing receptive
   fields, and a small atomic neural network trained in the browser. */
(function () {
  "use strict";
  const H = LW.h, esc = LW.esc;
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  /* ---------------- 1. a timeline of interatomic potentials ---------------- */
  const FAM = { classical: ["Empirical potentials", "#8a94a6"], abinitio: ["Ab initio dynamics", GOLD], nn: ["Descriptor + neural network", BLUE], kernel: ["Kernel and linear models", TEAL], mpnn: ["Message passing (invariant)", ORANGE], equi: ["Equivariant networks", VIOLET], universal: ["Universal (foundation) models", ROSE] };
  const ZOO = [
    [1924, "Lennard-Jones", "classical", "J. E. Lennard-Jones", "Proc. R. Soc. A 106, 463 (1924)", "A pair potential with an r⁻¹² repulsion and an r⁻⁶ dispersion attraction: two parameters per element pair. Still the default model of noble gases and of van der Waals interactions in force fields."],
    [1929, "Morse", "classical", "P. M. Morse", "Phys. Rev. 34, 57 (1929)", "An anharmonic bond potential, D(1 − e^(−a(r−r₀)))², whose Schrödinger equation is exactly solvable; it describes bond breaking qualitatively."],
    [1983, "Embedded atom method (EAM)", "classical", "M. S. Daw, M. I. Baskes", "Phys. Rev. Lett. 50, 1285 (1983); Phys. Rev. B 29, 6443 (1984)", "Each atom's energy is a nonlinear function of the electron density contributed by its neighbours plus a pair term. The many-body embedding term captures metallic bonding; EAM remains the workhorse for metals."],
    [1985, "Stillinger–Weber", "classical", "F. H. Stillinger, T. A. Weber", "Phys. Rev. B 31, 5262 (1985)", "Adds explicit three-body terms that favour tetrahedral angles to a pair potential, making diamond-structure silicon stable."],
    [1985, "Car–Parrinello MD", "abinitio", "R. Car, M. Parrinello", "Phys. Rev. Lett. 55, 2471 (1985)", "Molecular dynamics with forces from density-functional theory computed on the fly, the electronic wavefunctions evolving as fictitious dynamical variables. Accurate and transferable, but limited to hundreds of atoms and picoseconds: the accuracy that MLIPs later learned to imitate."],
    [1988, "Tersoff", "classical", "J. Tersoff", "Phys. Rev. B 37, 6991 (1988)", "A bond-order potential: the strength of each bond depends on the local coordination, so covalent bonds weaken as an atom gains neighbours."],
    [1990, "REBO", "classical", "D. W. Brenner", "Phys. Rev. B 42, 9458 (1990)", "Reactive empirical bond order for hydrocarbons; its successor AIREBO is widely used for carbon materials."],
    [1995, "First neural-network PES", "nn", "T. B. Blank, S. D. Brown, A. W. Calhoun, D. J. Doren", "J. Chem. Phys. 103, 4129 (1995)", "A neural network fitted to the potential energy of a small molecule on a surface, using a fixed set of coordinates as input. Not transferable to other system sizes, but the first demonstration that networks can represent PESs."],
    [2001, "ReaxFF", "classical", "A. C. T. van Duin, S. Dasgupta, F. Lorant, W. A. Goddard III", "J. Phys. Chem. A 105, 9396 (2001)", "A reactive force field with bond orders computed from distances and charge equilibration, able to break and form bonds; many hand-tuned terms and parameters."],
    [2007, "Behler–Parrinello NN", "nn", "J. Behler, M. Parrinello", "Phys. Rev. Lett. 98, 146401 (2007)", "The key idea of modern MLIPs: total energy as a sum of atomic energies, each predicted by a neural network from symmetry functions describing the atom's environment within a cutoff. Scales to any number of atoms; demonstrated on bulk silicon."],
    [2010, "GAP", "kernel", "A. P. Bartók, M. C. Payne, R. Kondor, G. Csányi", "Phys. Rev. Lett. 104, 136403 (2010)", "Gaussian approximation potentials: Gaussian-process regression of atomic energies with a kernel comparing atomic environments, later built on the SOAP descriptor. Comes with an uncertainty estimate."],
    [2011, "Atom-centred symmetry functions", "nn", "J. Behler", "J. Chem. Phys. 134, 074106 (2011)", "The systematic set of radial (G2) and angular (G4, G5) symmetry functions used as inputs by Behler–Parrinello networks."],
    [2013, "SOAP", "kernel", "A. P. Bartók, R. Kondor, G. Csányi", "Phys. Rev. B 87, 184115 (2013)", "Smooth overlap of atomic positions: smear neighbours into a density, expand it in radial functions times spherical harmonics, and form the rotation-invariant power spectrum. A complete-to-three-body, smooth descriptor."],
    [2015, "SNAP", "kernel", "A. P. Thompson, L. P. Swiler, C. R. Trott, S. M. Foiles, G. J. Tucker", "J. Comput. Phys. 285, 316 (2015)", "Spectral neighbour analysis potential: energy linear in bispectrum components of the neighbour density. Fast enough for very large simulations in LAMMPS."],
    [2016, "Moment tensor potentials", "kernel", "A. V. Shapeev", "Multiscale Model. Simul. 14, 1153 (2016)", "A systematically improvable linear model built from contractions of moment tensors of the neighbour positions; widely used with active learning."],
    [2017, "ANI-1", "nn", "J. S. Smith, O. Isayev, A. E. Roitberg", "Chem. Sci. 8, 3192 (2017)", "Behler–Parrinello networks with modified symmetry functions, trained on millions of DFT calculations of small organic molecules: an early transferable potential for organic chemistry."],
    [2017, "SchNet", "mpnn", "K. T. Schütt et al.", "NeurIPS 2017; J. Chem. Phys. 148, 241722 (2018)", "Learned representations instead of hand-made descriptors: continuous-filter convolutions pass messages between atoms with filters that are functions of interatomic distance. Invariant, end-to-end trainable."],
    [2018, "Deep Potential (DeePMD)", "nn", "L. Zhang, J. Han, H. Wang, R. Car, W. E", "Phys. Rev. Lett. 120, 143001 (2018)", "Atomic networks fed by a learned, symmetry-preserving embedding of the local environment (DeepPot-SE). Its software, DeePMD-kit, with DP-GEN active learning, made large-scale MLIP simulations routine."],
    [2019, "ACE", "kernel", "R. Drautz", "Phys. Rev. B 99, 014104 (2019)", "The atomic cluster expansion: a complete, systematic basis for atomic environments built from products of one-particle basis functions, to any body order, with linear or nonlinear fits. Unifies SOAP, SNAP, MTP and symmetry functions as special cases."],
    [2019, "PhysNet", "mpnn", "O. T. Unke, M. Meuwly", "J. Chem. Theory Comput. 15, 3678 (2019)", "A message-passing network that also predicts atomic charges, adding explicit electrostatics and dispersion for long-range physics."],
    [2020, "DimeNet", "mpnn", "J. Gasteiger, J. Groß, S. Günnemann", "ICLR 2020", "Directional message passing: messages live on bonds and are updated using bond angles, giving angular information that distance-only networks lack."],
    [2021, "PaiNN", "equi", "K. T. Schütt, O. T. Unke, M. Gastegger", "ICML 2021", "Polarizable atom interaction network: carries vector features alongside scalars, updated equivariantly, so directional information propagates efficiently."],
    [2021, "4G-HDNNP", "nn", "T. W. Ko, J. A. Finkler, S. Goedecker, J. Behler", "Nat. Commun. 12, 398 (2021)", "Fourth-generation network potential: atomic charges determined by global charge equilibration, capturing non-local charge transfer that purely local models miss."],
    [2022, "NequIP", "equi", "S. Batzner et al.", "Nat. Commun. 13, 2453 (2022)", "E(3)-equivariant message passing with features labelled by angular momentum (scalars, vectors, higher tensors) combined by tensor products. Showed remarkable data efficiency: accurate potentials from hundreds of structures."],
    [2022, "MACE", "equi", "I. Batatia, D. P. Kovács, G. N. C. Simm, C. Ortner, G. Csányi", "NeurIPS 2022", "Higher-order equivariant message passing: ACE-like many-body messages, so only two message-passing layers are needed. Fast, accurate and the basis of several foundation models."],
    [2022, "M3GNet", "universal", "C. Chen, S. P. Ong", "Nat. Comput. Sci. 2, 718 (2022)", "A graph network with three-body interactions trained on the relaxation trajectories of the Materials Project: one of the first universal potentials covering most of the periodic table."],
    [2023, "Allegro", "equi", "A. Musaelian et al.", "Nat. Commun. 14, 579 (2023)", "A strictly local equivariant model (no message passing), so it parallelises over many GPUs and scales to hundreds of millions of atoms."],
    [2023, "CHGNet", "universal", "B. Deng et al.", "Nat. Mach. Intell. 5, 1031 (2023)", "A universal graph potential trained on Materials Project trajectories that also predicts magnetic moments, as a proxy for charge state."],
    [2023, "GNoME", "universal", "A. Merchant et al.", "Nature 624, 80 (2023)", "Graph networks used in an active-learning loop of structure generation, DFT and retraining, which proposed hundreds of thousands of new stable crystals; the resulting potentials became universal models."],
    [2023, "MACE-MP-0", "universal", "I. Batatia et al.", "arXiv:2401.00096 (2023)", "A MACE model trained on the Materials Project trajectory data set (MPtrj), shown to run stable dynamics across chemistry from water to catalysts and batteries out of the box."],
    [2024, "MatterSim", "universal", "H. Yang et al.", "arXiv:2405.04967 (2024)", "A universal potential trained on structures sampled across elements, temperatures and pressures, aimed at finite-temperature properties."],
    [2024, "SevenNet", "universal", "Y. Park et al.", "J. Chem. Theory Comput. 20, 4857 (2024)", "A NequIP-based universal potential with a parallel algorithm for large-scale molecular dynamics."],
    [2024, "ORB", "universal", "M. Neumann et al.", "arXiv:2410.22570 (2024)", "A fast universal potential that is not built to be exactly equivariant but learns the symmetry from data augmentation, trading strict symmetry for speed."],
    [2024, "eqV2 / OMat24", "universal", "L. Barroso-Luque et al.", "arXiv:2410.12771 (2024)", "EquiformerV2 models trained on the Open Materials 2024 data set of about 110 million DFT calculations, including many non-equilibrium structures."]
  ];
  LW.register("mlipzoo", function (root) {
    let fam = "all", sel = null;
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Family", options: [["all", "All"]].concat(Object.keys(FAM).map(k => [k, FAM[k][0]])), value: "all", onChange: v => { fam = v; render(); } });
    const P = LW.canvas(root, { height: w => (w < 640 ? 150 : 120) });
    const list = H("ol", { class: "zoo" }); root.append(list);
    const X = (y, W) => { const a = 1920, b = 2000, c = 2025, split = 0.28; return 20 + (y < b ? (y - a) / (b - a) * split : split + (y - b) / (c - b) * (1 - split)) * (W - 40); };
    function draw() {
      const C = LW.colors(), { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH); const y0 = HH / 2;
      ctx.strokeStyle = C.line2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, y0); ctx.lineTo(W - 20, y0); ctx.stroke();
      [1920, 1940, 1960, 1980, 2000, 2005, 2010, 2015, 2020, 2025].forEach(y => { const x = X(y, W); ctx.strokeStyle = C.line2; ctx.beginPath(); ctx.moveTo(x, y0 - 4); ctx.lineTo(x, y0 + 4); ctx.stroke(); LW.text(ctx, String(y), x, y0 + 20, { color: C.ink3, size: 10, align: "center", mono: true }); });
      LW.text(ctx, "(the axis is stretched after 2000)", W - 20, HH - 6, { color: C.ink3, size: 9.5, align: "right" });
      const lane = {}; ZOO.forEach((z, k) => { if (fam !== "all" && z[2] !== fam) return; const x = X(z[0], W), key = Math.round(x / 12); lane[key] = (lane[key] || 0) + 1; const yy = y0 - 10 - (lane[key] - 1) * 11; LW.dot(ctx, x, yy, sel === k ? 6 : 4.5, FAM[z[2]][1], C.card, 1.2); });
    }
    function render() {
      list.innerHTML = ZOO.map((z, k) => (fam !== "all" && z[2] !== fam) ? "" : `<li data-k="${k}" class="${sel === k ? "on" : ""}" style="--c:${FAM[z[2]][1]}"><span class="zoo-y">${z[0]}</span><div><b>${esc(z[1])}</b> <span class="zoo-f">${esc(FAM[z[2]][0])}</span><p>${esc(z[5])}</p><small>${esc(z[3])} · ${esc(z[4])}</small></div></li>`).join("");
      draw();
    }
    list.addEventListener("click", e => { const li = e.target.closest("li[data-k]"); if (li) { sel = +li.dataset.k; render(); } });
    P.draw = draw; render();
  });

  /* ---------------- 2. the Behler–Parrinello architecture, live ---------------- */
  const LJ = r => 4 * (Math.pow(r, -12) - Math.pow(r, -6));
  const RCUT = 2.6, fcut = r => (r < RCUT ? 0.5 * (Math.cos(Math.PI * r / RCUT) + 1) : 0), RS = [0.9, 1.1, 1.3, 1.5, 1.8, 2.1, 2.4], ETA = 6;
  LW.register("bpnnarch", function (root) {
    let pts = [[0, 0], [1.12, 0], [0.56, 0.97], [-0.56, 0.97], [-1.12, 0.05], [-0.5, -0.95], [0.6, -0.98], [1.9, 0.9]], focus = 0, drag = -1;
    const P = LW.canvas(root, { height: w => (w < 640 ? 640 : 380) });
    const S = LW.stats(root, [["ei", "atomic energy of the selected atom"], ["e", "total energy E = Σ Eᵢ"], ["n", "neighbours inside the cutoff"]]);
    LW.note(root, "Drag atoms; click an atom to select it. The descriptor vector of the selected atom is a list of smooth radial functions summed over its neighbours inside the cutoff (dashed circle). In a trained network, the same small network maps every atom's descriptor to its energy contribution; here the atomic energies are those of the underlying pair potential, E<sub>i</sub> = ½ Σ<sub>j</sub> V(r<sub>ij</sub>), which is what a perfect network would learn.");
    let V = null;
    function desc(i) { return RS.map(rs => pts.reduce((s, q, j) => { if (j === i) return s; const r = Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]); return s + Math.exp(-ETA * (r - rs) ** 2) * fcut(r); }, 0)); }
    function ei(i) { return 0.5 * pts.reduce((s, q, j) => (j === i ? s : s + LJ(Math.max(0.8, Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1])))), 0); }
    function draw() {
      const C = LW.colors(), { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH); const narrow = W < 640;
      const aw = narrow ? W : W * 0.36, ah = narrow ? 260 : HH, s = Math.min(aw, ah) / 6.2, cx = aw / 2, cy = ah / 2 + 6;
      V = { X: x => cx + x * s, Y: y => cy - y * s, ix: px => (px - cx) / s, iy: py => (cy - py) / s };
      LW.text(ctx, "1  atoms and the cutoff", 8, 16, { color: C.ink2, size: 11.5, weight: 600 });
      ctx.strokeStyle = ROSE; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(V.X(pts[focus][0]), V.Y(pts[focus][1]), Math.max(0, RCUT * s), 0, 7); ctx.stroke(); ctx.setLineDash([]);
      const es = pts.map((_, i) => ei(i)), emin = Math.min(...es), emax = Math.max(...es);
      pts.forEach((q, i) => { const r = Math.hypot(q[0] - pts[focus][0], q[1] - pts[focus][1]); if (i !== focus && r < RCUT) { ctx.strokeStyle = rgba(ROSE, 0.35 + 0.5 * fcut(r)); ctx.lineWidth = 1 + 2 * fcut(r); ctx.beginPath(); ctx.moveTo(V.X(pts[focus][0]), V.Y(pts[focus][1])); ctx.lineTo(V.X(q[0]), V.Y(q[1])); ctx.stroke(); } });
      pts.forEach((q, i) => LW.dot(ctx, V.X(q[0]), V.Y(q[1]), 13, i === focus ? ROSE : LW.ramp(0.15 + 0.8 * (es[i] - emin) / Math.max(1e-9, emax - emin), C), C.card, 2));
      // descriptor bars
      const d = desc(focus), bx = narrow ? 20 : aw + 20, by = narrow ? ah + 20 : 30, bw = narrow ? (W - 40) * 0.4 : W * 0.2, bh = narrow ? 160 : HH - 70;
      LW.text(ctx, "2  descriptor Gᵢ", bx, by - 10, { color: C.ink2, size: 11.5, weight: 600 });
      const dm = Math.max(1, ...d); d.forEach((v, k) => { const y = by + k * bh / d.length; ctx.fillStyle = rgba(TEAL, 0.8); ctx.fillRect(bx + 40, y + 3, v / dm * (bw - 50), bh / d.length - 6); LW.text(ctx, "r_s=" + RS[k], bx, y + bh / d.length / 2 + 4, { color: C.ink3, size: 9.5, mono: true }); });
      // network
      const nx = narrow ? bx + bw + 10 : bx + bw + 30, nw = narrow ? W - nx - 20 : W * 0.24, layers = [d.length, 6, 6, 1];
      LW.text(ctx, "3  atomic network", nx, by - 10, { color: C.ink2, size: 11.5, weight: 600 });
      const pos = layers.map((n, l) => Array.from({ length: n }, (_, k) => [nx + l * nw / (layers.length - 1), by + (k + 0.5) * bh / n]));
      for (let l = 0; l < layers.length - 1; l++) pos[l].forEach(a => pos[l + 1].forEach(b => { ctx.strokeStyle = C.line2; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }));
      pos.forEach((L, l) => L.forEach(([x, y], k) => LW.dot(ctx, x, y, l === 0 ? 4 : 6, l === 0 ? rgba(TEAL, 0.3 + 0.7 * d[k] / dm) : l === 3 ? ORANGE : rgba(BLUE, 0.6), C.card, 1)));
      // sum
      const sx = narrow ? 20 : nx + nw + 40, sy = narrow ? by + bh + 50 : by;
      if (!narrow) { LW.text(ctx, "4  sum", sx, by - 10, { color: C.ink2, size: 11.5, weight: 600 }); const tot = es.reduce((a, b) => a + b, 0); es.forEach((e, i) => { const y = sy + i * 20; LW.text(ctx, "E" + i + " = " + e.toFixed(2), sx, y + 14, { color: i === focus ? ROSE : C.ink2, size: 11, mono: true, weight: i === focus ? 700 : 500 }); }); LW.text(ctx, "E = " + tot.toFixed(2), sx, sy + es.length * 20 + 18, { color: ORANGE, size: 12.5, mono: true, weight: 700 }); }
      else { LW.text(ctx, "4  E = Σ Eᵢ = " + es.reduce((a, b) => a + b, 0).toFixed(2), 20, sy, { color: ORANGE, size: 12.5, mono: true, weight: 700 }); }
      S.set("ei", es[focus].toFixed(3) + " ε"); S.set("e", es.reduce((a, b) => a + b, 0).toFixed(3) + " ε"); S.set("n", String(pts.filter((q, j) => j !== focus && Math.hypot(q[0] - pts[focus][0], q[1] - pts[focus][1]) < RCUT).length));
    }
    P.draw = draw;
    LW.drag(P.cv, { down: q => { if (!V) return false; const x = V.ix(q.x), y = V.iy(q.y); let b = -1, bd = 0.4; pts.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; b = i; } }); if (b < 0) return false; focus = b; drag = b; draw(); return true; }, move: q => { if (drag < 0) return; pts[drag] = [LW.clamp(V.ix(q.x), -3, 3), LW.clamp(V.iy(q.y), -2.8, 2.8)]; draw(); }, up: () => { drag = -1; } });
    draw();
  });

  /* ---------------- 3. angular expansion: invariants and how coefficients rotate ---------------- */
  LW.register("harmonics", function (root) {
    let nb = [[1.0, 0.3], [-0.4, 1.0], [-0.9, -0.5], [0.5, -0.9]], rot = 0, drag = -1, M = 6;
    const P = LW.canvas(root, { height: w => (w < 640 ? 600 : 360) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Rotate the whole environment by α", min: -3.14, max: 3.14, step: 0.01, value: 0, fmt: v => Math.round(v * 180 / Math.PI) + "°", onInput: v => { rot = v; draw(); } });
    LW.button(ctl, "Add a neighbour", () => { const a = Math.random() * 6.28; nb.push([Math.cos(a) * 1.1, Math.sin(a) * 1.1]); draw(); });
    LW.button(ctl, "Remove one", () => { if (nb.length > 1) nb.pop(); draw(); });
    LW.note(root, "The angular density of neighbours, n(θ) = Σ<sub>j</sub> δ(θ − θ<sub>j</sub>), is expanded in circular harmonics e<sup>imθ</sup>, the two-dimensional analogue of spherical harmonics. Rotating the environment by α multiplies each coefficient c<sub>m</sub> by e<sup>−imα</sup>: its phase turns m times as fast, while its magnitude |c<sub>m</sub>|, the power spectrum, stays fixed. Drag the neighbours.");
    let V = null;
    function coef() { const out = []; for (let m = 0; m <= M; m++) { let re = 0, im = 0; nb.forEach(([x, y]) => { const th = Math.atan2(y, x) + rot; re += Math.cos(m * th); im -= Math.sin(m * th); }); out.push([re, im]); } return out; }
    function draw() {
      const C = LW.colors(), { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH); const narrow = W < 640, cw = narrow ? W : W * 0.4, ch = narrow ? 260 : HH, s = Math.min(cw, ch) / 3.4, cx = cw / 2, cy = ch / 2;
      V = { X: x => cx + x * s, Y: y => cy - y * s, ix: px => (px - cx) / s, iy: py => (cy - py) / s };
      const cs = coef();
      // smoothed angular density reconstructed from the truncated expansion
      ctx.fillStyle = rgba(TEAL, 0.15); ctx.strokeStyle = TEAL; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k <= 200; k++) { const th = k / 200 * 2 * Math.PI; let v = cs[0][0] / (2 * Math.PI); for (let m = 1; m <= M; m++) v += (cs[m][0] * Math.cos(m * th) - cs[m][1] * Math.sin(m * th)) / Math.PI; const rr = 0.55 + Math.max(0, v) * 0.5; const X = V.X(rr * Math.cos(th)), Y = V.Y(rr * Math.sin(th)); k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.line2; ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, 0.55 * s), 0, 7); ctx.stroke();
      nb.forEach(([x, y]) => { const th = Math.atan2(y, x) + rot, r = Math.hypot(x, y); ctx.strokeStyle = C.line2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(V.X(r * Math.cos(th)), V.Y(r * Math.sin(th))); ctx.stroke(); LW.dot(ctx, V.X(r * Math.cos(th)), V.Y(r * Math.sin(th)), 9, BLUE, C.card, 2); });
      LW.dot(ctx, cx, cy, 10, ROSE, C.card, 2);
      LW.text(ctx, "teal: angular density from the first " + M + " harmonics", 8, 16, { color: C.ink2, size: 11, weight: 600 });
      // coefficient panel: one dial per m (phase) and a bar (magnitude)
      const px = narrow ? 10 : cw + 20, py = narrow ? ch + 20 : 30, pw = narrow ? W - 20 : W - cw - 30, cell = pw / (M + 1), R = Math.min(cell * 0.38, 28);
      LW.text(ctx, "coefficients cₘ: phase (dial) and magnitude |cₘ| (bar, rotation-invariant)", px, py - 10, { color: C.ink2, size: 11, weight: 600 });
      const mag = cs.map(([a, b]) => Math.hypot(a, b)), mm = Math.max(...mag, 1);
      cs.forEach(([a, b], m) => { const x = px + (m + 0.5) * cell, y = py + R + 10; ctx.strokeStyle = C.line2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
        const ph = Math.atan2(b, a), L = mag[m] / mm * R; LW.arrow(ctx, x, y, x + L * Math.cos(ph), y - L * Math.sin(ph), VIOLET, 2.2, 6); LW.text(ctx, "m=" + m, x, y + R + 16, { color: C.ink3, size: 10, align: "center", mono: true });
        const bh = (narrow ? 120 : HH - py - R * 2 - 70) * mag[m] / mm, by = py + 2 * R + 40 + (narrow ? 120 : HH - py - R * 2 - 70); ctx.fillStyle = rgba(GOLD, 0.8); ctx.fillRect(x - cell * 0.25, by - bh, cell * 0.5, bh); LW.text(ctx, mag[m].toFixed(2), x, by + 13, { color: C.ink2, size: 10, align: "center", mono: true }); });
    }
    P.draw = draw;
    LW.drag(P.cv, { down: q => { if (!V) return false; let b = -1, bd = 0.3; nb.forEach(([x, y], i) => { const th = Math.atan2(y, x) + rot, r = Math.hypot(x, y), d = Math.hypot(V.X(r * Math.cos(th)) - q.x, V.Y(r * Math.sin(th)) - q.y) / 30; if (d < bd + 0.5) { bd = d; b = i; } }); drag = b; return b >= 0; }, move: q => { const x = V.ix(q.x), y = V.iy(q.y), th = Math.atan2(y, x) - rot, r = LW.clamp(Math.hypot(x, y), 0.6, 1.5); nb[drag] = [r * Math.cos(th), r * Math.sin(th)]; draw(); } });
    draw();
  });

  /* ---------------- 4. equivariance: forces must rotate with the molecule ---------------- */
  LW.register("equivar", function (root) {
    let ang = 0;
    const ref = [[0, 0], [1.25, 0.05], [0.45, 1.05], [-0.95, 0.45]];
    const P = LW.canvas(root, { height: w => (w < 640 ? 560 : 340) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Rotate the molecule by", min: -180, max: 180, step: 1, value: 0, fmt: v => v + "°", onInput: v => { ang = v * Math.PI / 180; draw(); } });
    const S = LW.stats(root, [["e", "energy (true = invariant model)"], ["en", "energy, coordinate-based model"], ["fe", "force error of the coordinate-based model"]]);
    const forces = p => { const F = p.map(() => [0, 0]); for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) { const dx = p[j][0] - p[i][0], dy = p[j][1] - p[i][1], r = Math.hypot(dx, dy), f = 24 * (2 * Math.pow(r, -13) - Math.pow(r, -7)); F[i][0] -= f * dx / r; F[i][1] -= f * dy / r; F[j][0] += f * dx / r; F[j][1] += f * dy / r; } return F; };
    const energy = p => { let e = 0; for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) e += LJ(Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1])); return e; };
    // a model that takes raw Cartesian coordinates and was fitted (to first order) in the reference orientation only
    const F0 = forces(ref), E0 = energy(ref), flat = p => p.flat(), x0 = flat(ref), n = x0.length;
    const J = []; for (let a = 0; a < n; a++) { const xp = x0.slice(); xp[a] += 1e-5; const fp = flat(forces(Array.from({ length: n / 2 }, (_, k) => [xp[2 * k], xp[2 * k + 1]]))), f0 = flat(F0); J.push(fp.map((v, b) => (v - f0[b]) / 1e-5)); }
    const naive = p => { const x = flat(p), d = x.map((v, a) => v - x0[a]), f = flat(F0).map((v, b) => v + d.reduce((s, dv, a) => s + dv * J[a][b], 0)); return { F: Array.from({ length: n / 2 }, (_, k) => [f[2 * k], f[2 * k + 1]]), E: E0 - flat(F0).reduce((s, fv, a) => s + fv * d[a], 0) }; };
    function draw() {
      const C = LW.colors(), { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH); const narrow = W < 640;
      const c = Math.cos(ang), s = Math.sin(ang), p = ref.map(([x, y]) => [c * x - s * y, s * x + c * y]), Ft = forces(p), Nv = naive(p);
      const pan = (ox, oy, w, h, F, title, col) => { const sc = Math.min(w, h) / 4.6, cx = ox + w / 2, cy = oy + h / 2 + 8; LW.text(ctx, title, ox + 6, oy + 14, { color: C.ink2, size: 11.5, weight: 600 });
        for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) if (Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1]) < 1.5) { ctx.strokeStyle = C.line2; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + p[i][0] * sc, cy - p[i][1] * sc); ctx.lineTo(cx + p[j][0] * sc, cy - p[j][1] * sc); ctx.stroke(); }
        p.forEach(([x, y], i) => { LW.dot(ctx, cx + x * sc, cy - y * sc, 11, BLUE, C.card, 2); const f = F[i], L = Math.hypot(...f), k = Math.min(1.6, L * 0.25) / (L || 1) * sc; LW.arrow(ctx, cx + x * sc, cy - y * sc, cx + x * sc + f[0] * k, cy - y * sc - f[1] * k, col, 2.6, 8); }); };
      if (narrow) { pan(0, 0, W, HH / 2, Ft, "invariant energy → forces rotate with the molecule", TEAL); pan(0, HH / 2, W, HH / 2, Nv.F, "model on raw coordinates, fitted at 0° only", ROSE); }
      else { pan(0, 0, W / 2, HH, Ft, "invariant energy → forces rotate with the molecule", TEAL); pan(W / 2, 0, W / 2, HH, Nv.F, "model on raw coordinates, fitted at 0° only", ROSE); ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(W / 2, 10); ctx.lineTo(W / 2, HH - 10); ctx.stroke(); }
      const err = Math.sqrt(Ft.reduce((a, f, i) => a + (f[0] - Nv.F[i][0]) ** 2 + (f[1] - Nv.F[i][1]) ** 2, 0) / Ft.length);
      S.set("e", energy(p).toFixed(4)); S.set("en", Nv.E.toFixed(4)); S.set("fe", err.toFixed(3) + " (rms per atom)");
    }
    P.draw = draw; draw();
  });

  /* ---------------- 5. receptive field of message passing ---------------- */
  LW.register("receptive", function (root) {
    let T = 2, rc = 1.6, focus = null;
    const r0 = LW.rng(4), pts = []; for (let i = 0; i < 13; i++) for (let j = 0; j < 9; j++) pts.push([i + (j % 2) * 0.5 + 0.12 * r0.normal(), j * 0.87 + 0.12 * r0.normal()]);
    focus = pts.findIndex(p => Math.abs(p[0] - 6.5) < 0.7 && Math.abs(p[1] - 3.5) < 0.6); if (focus < 0) focus = 58;
    const P = LW.canvas(root, { height: w => Math.min(380, Math.max(260, w * 0.5)) });
    const ctl = LW.controls(root);
    LW.slider(ctl, { label: "Message-passing layers T", min: 0, max: 5, step: 1, value: T, fmt: v => String(v), onInput: v => { T = v; draw(); } });
    LW.slider(ctl, { label: "Cutoff radius r<sub>c</sub>", min: 1.0, max: 2.6, step: 0.05, value: rc, fmt: v => v.toFixed(2), onInput: v => { rc = v; draw(); } });
    const S = LW.stats(root, [["d", "atoms that can influence the centre"], ["r", "effective range ≈ T × r_c"], ["c", "atoms within one cutoff"]]);
    LW.note(root, "Each message-passing layer lets an atom gather information from neighbours within the cutoff; after T layers, information has travelled up to T hops. Click any atom to make it the centre.");
    let V;
    function draw() {
      const C = LW.colors(), { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH);
      const sc = Math.min((W - 30) / 13.5, (HH - 30) / 7.6); V = { X: x => 15 + (x + 0.3) * sc, Y: y => 15 + (y + 0.3) * sc };
      const hop = pts.map(() => Infinity); hop[focus] = 0; let frontier = [focus];
      for (let t = 1; t <= T; t++) { const nxt = []; frontier.forEach(i => pts.forEach((q, j) => { if (hop[j] === Infinity && Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]) < rc) { hop[j] = t; nxt.push(j); } })); frontier = nxt; }
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const d = Math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]); if (d < rc) { const on = hop[i] <= T && hop[j] <= T && Math.abs(hop[i] - hop[j]) <= 1; ctx.strokeStyle = on ? rgba(VIOLET, 0.55) : C.line; ctx.lineWidth = on ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(V.X(pts[i][0]), V.Y(pts[i][1])); ctx.lineTo(V.X(pts[j][0]), V.Y(pts[j][1])); ctx.stroke(); } }
      ctx.strokeStyle = ROSE; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(V.X(pts[focus][0]), V.Y(pts[focus][1]), Math.max(0, rc * sc), 0, 7); ctx.stroke(); ctx.setLineDash([]);
      const pal = [ROSE, ORANGE, GOLD, TEAL, BLUE, VIOLET];
      pts.forEach((q, i) => LW.dot(ctx, V.X(q[0]), V.Y(q[1]), i === focus ? 8 : 6, hop[i] <= T ? pal[Math.min(hop[i], 5)] : (C.dark ? "#2a3350" : "#dde2ee"), C.card, 1.2));
      const nIn = hop.filter(h => h <= T).length - 1, nC = pts.filter((q, j) => j !== focus && Math.hypot(q[0] - pts[focus][0], q[1] - pts[focus][1]) < rc).length;
      S.set("d", String(nIn)); S.set("r", (T * rc).toFixed(2) + " (lattice spacing 1)"); S.set("c", String(nC));
    }
    P.draw = draw;
    LW.drag(P.cv, { down: q => { if (!V) return false; let b = -1, bd = 14; pts.forEach((p, i) => { const d = Math.hypot(V.X(p[0]) - q.x, V.Y(p[1]) - q.y); if (d < bd) { bd = d; b = i; } }); if (b >= 0) { focus = b; draw(); } return false; } });
    draw();
  });

  /* ---------------- 6. train a tiny atomic neural network in the browser ---------------- */
  // data: 2D clusters of 5 Lennard-Jones atoms; descriptors: 8 radial functions; network: 8-16-16-1 (tanh)
  LW.register("mliptrain", function (root) {
    let nTrain = 120, hid = 16, net, opt, data, test, step = 0, hist = [], seed = 1;
    const NA = 5, RS2 = LW.linspace(0.85, 2.6, 8), ET = 4, RC2 = 2.8;
    const fc2 = r => (r < RC2 ? 0.5 * (Math.cos(Math.PI * r / RC2) + 1) : 0), dfc2 = r => (r < RC2 ? -0.5 * Math.PI / RC2 * Math.sin(Math.PI * r / RC2) : 0);
    const P = LW.canvas(root, { height: w => (w < 640 ? 640 : 330) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Training structures", options: [["30", "30"], ["120", "120"], ["480", "480"]], value: "120", onChange: v => { nTrain = +v; init(); } });
    LW.seg(ctl, { label: "Hidden neurons", options: [["4", "4"], ["16", "16"], ["32", "32"]], value: "16", onChange: v => { hid = +v; init(); } });
    const c2 = LW.controls(root);
    const runB = LW.button(c2, "Train", () => { runB.textContent = loop.toggle() ? "Pause" : "Train"; }, { primary: true });
    LW.button(c2, "New random initial weights", () => { seed++; init(); });
    const S = LW.stats(root, [["st", "training steps"], ["tr", "train energy RMSE"], ["te", "test energy RMSE"], ["tf", "test force RMSE (forces never seen in training)"]]);
    function sample(r) { for (;;) { const p = []; while (p.length < NA) { const q = [r() * 2.6, r() * 2.6]; if (p.every(s => Math.hypot(s[0] - q[0], s[1] - q[1]) > 0.88)) p.push(q); } return p; } }
    function energy(p) { let e = 0; for (let i = 0; i < NA; i++) for (let j = i + 1; j < NA; j++) { const r = Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1]); e += LJ(r) * fc2(r); } return e; }
    function desc(p) { return p.map((pi, i) => RS2.map(rs => p.reduce((s, q, j) => (j === i ? s : s + Math.exp(-ET * (Math.hypot(q[0] - pi[0], q[1] - pi[1]) - rs) ** 2) * fc2(Math.hypot(q[0] - pi[0], q[1] - pi[1]))), 0))); }
    function init() { const r = LW.rng(7); data = Array.from({ length: nTrain }, () => { const p = sample(r); return { p, G: desc(p), E: energy(p) }; }); const r2 = LW.rng(99); test = Array.from({ length: 80 }, () => { const p = sample(r2); return { p, G: desc(p), E: energy(p) }; });
      const rr = LW.rng(seed * 31), w = (a, b) => Array.from({ length: a }, () => Array.from({ length: b }, () => rr.normal() / Math.sqrt(b)));
      net = { W1: w(hid, 8), b1: new Array(hid).fill(0), W2: w(hid, hid), b2: new Array(hid).fill(0), w3: w(1, hid)[0], b3: data.reduce((s, d) => s + d.E, 0) / data.length / NA };
      opt = { t: 0, m: {}, v: {} }; step = 0; hist = []; draw(); }
    function fwd(g) { const z1 = net.W1.map((row, k) => row.reduce((s, w, i) => s + w * g[i], net.b1[k])), h1 = z1.map(Math.tanh), z2 = net.W2.map((row, k) => row.reduce((s, w, i) => s + w * h1[i], net.b2[k])), h2 = z2.map(Math.tanh); return { h1, h2, e: net.w3.reduce((s, w, i) => s + w * h2[i], net.b3) }; }
    const Epred = s => s.G.reduce((a, g) => a + fwd(g).e, 0);
    function dEdg(g) { const f = fwd(g), d2 = net.w3.map((w, i) => w * (1 - f.h2[i] ** 2)), d1 = f.h1.map((h, j) => net.W2.reduce((s, row, k) => s + d2[k] * row[j], 0) * (1 - h * h)); return g.map((_, i) => net.W1.reduce((s, row, k) => s + d1[k] * row[i], 0)); }
    function forcesPred(p, G) { const F = p.map(() => [0, 0]); for (let i = 0; i < NA; i++) { const dg = dEdg(G[i]); for (let j = 0; j < NA; j++) { if (j === i) continue; const dx = p[j][0] - p[i][0], dy = p[j][1] - p[i][1], r = Math.hypot(dx, dy); let dGdr = 0; RS2.forEach((rs, k) => { const ex = Math.exp(-ET * (r - rs) ** 2); dGdr += dg[k] * (ex * (-2 * ET * (r - rs)) * fc2(r) + ex * dfc2(r)); }); F[i][0] += dGdr * dx / r; F[i][1] += dGdr * dy / r; F[j][0] -= dGdr * dx / r; F[j][1] -= dGdr * dy / r; } } return F; }
    function forcesTrue(p) { const h = 1e-5, F = p.map(() => [0, 0]); for (let i = 0; i < NA; i++) for (let a = 0; a < 2; a++) { const q = p.map(v => v.slice()); q[i][a] += h; const e1 = energy(q); q[i][a] -= 2 * h; F[i][a] = -(e1 - energy(q)) / (2 * h); } return F; }
    function trainStep() { // one Adam step on a mini-batch, loss = mean (E_pred - E)^2 / NA^2
      const g = { W1: net.W1.map(r => r.map(() => 0)), b1: net.b1.map(() => 0), W2: net.W2.map(r => r.map(() => 0)), b2: net.b2.map(() => 0), w3: net.w3.map(() => 0), b3: 0 }, B = 16, r = LW.rng(step + 1);
      for (let b = 0; b < B; b++) { const s = data[Math.floor(r() * data.length)], err = 2 * (Epred(s) - s.E) / (NA * NA) / B;
        s.G.forEach(gv => { const f = fwd(gv), d2 = net.w3.map((w, i) => err * w * (1 - f.h2[i] ** 2)); g.b3 += err; f.h2.forEach((h, i) => { g.w3[i] += err * h; }); const d1 = f.h1.map((h, j) => net.W2.reduce((s2, row, k) => s2 + d2[k] * row[j], 0) * (1 - h * h)); d2.forEach((d, k) => { g.b2[k] += d; f.h1.forEach((h, j) => { g.W2[k][j] += d * h; }); }); d1.forEach((d, k) => { g.b1[k] += d; gv.forEach((x, i) => { g.W1[k][i] += d * x; }); }); }); }
      opt.t++; const lr = 0.01, upd = (key, val, gr) => { const m = (opt.m[key] = 0.9 * (opt.m[key] || 0) + 0.1 * gr), v = (opt.v[key] = 0.999 * (opt.v[key] || 0) + 0.001 * gr * gr); return val - lr * (m / (1 - 0.9 ** opt.t)) / (Math.sqrt(v / (1 - 0.999 ** opt.t)) + 1e-8); };
      net.W1 = net.W1.map((row, k) => row.map((w, i) => upd("W1" + k + "_" + i, w, g.W1[k][i]))); net.b1 = net.b1.map((v, k) => upd("b1" + k, v, g.b1[k])); net.W2 = net.W2.map((row, k) => row.map((w, i) => upd("W2" + k + "_" + i, w, g.W2[k][i]))); net.b2 = net.b2.map((v, k) => upd("b2" + k, v, g.b2[k])); net.w3 = net.w3.map((v, k) => upd("w3" + k, v, g.w3[k])); net.b3 = upd("b3", net.b3, g.b3); step++; }
    const rmse = set => Math.sqrt(set.reduce((s, d) => s + ((Epred(d) - d.E) / NA) ** 2, 0) / set.length);
    const loop = LW.loop(root, () => { for (let k = 0; k < 20; k++) trainStep(); if (step % 40 === 0) hist.push([step, rmse(data), rmse(test)]); draw(); if (step > 6000) { loop.stop(); runB.textContent = "Train"; } });
    function draw() {
      const C = LW.colors(), { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH); const narrow = W < 640, pw = narrow ? W - 70 : (W - 200) / 3, ph = narrow ? (HH - 150) / 3 : HH - 60;
      const box = k => (narrow ? { x: 56, y: 22 + k * (ph + 50), w: pw, h: ph } : { x: 56 + k * (pw + 66), y: 22, w: pw, h: ph });
      const A = LW.axes(ctx, box(0), { xr: [0, Math.max(400, step)], yr: [-3, 1], xlabel: "training step", ylabel: "log₁₀ RMSE (ε/atom)", colors: C, title: "learning curve", ny: 4 });
      A.clip(); LW.path(ctx, hist.map(h => h[0]), hist.map(h => Math.log10(h[1])), A, { color: BLUE, width: 2 }); LW.path(ctx, hist.map(h => h[0]), hist.map(h => Math.log10(h[2])), A, { color: ORANGE, width: 2 }); ctx.restore();
      LW.text(ctx, "blue train, orange test", A.box.x + A.box.w - 4, A.box.y + 12, { color: C.ink3, size: 10, align: "right" });
      const pe = test.map(d => [d.E / NA, Epred(d) / NA]), lo = Math.min(...pe.flat()), hi = Math.max(...pe.flat());
      const B = LW.axes(ctx, box(1), { xr: [lo, hi], yr: [lo, hi], xlabel: "true energy per atom", ylabel: "predicted", colors: C, title: "energy parity (test set)", ny: 4 });
      B.clip(); LW.path(ctx, [lo, hi], [lo, hi], B, { color: C.ink3, width: 1, dash: [4, 4] }); pe.forEach(([a, b]) => LW.dot(ctx, B.sx(a), B.sy(b), 3, ORANGE, null)); ctx.restore();
      const fs = []; test.slice(0, 20).forEach(d => { const ft = forcesTrue(d.p), fp = forcesPred(d.p, d.G); ft.forEach((f, i) => { fs.push([f[0], fp[i][0]]); fs.push([f[1], fp[i][1]]); }); });
      const fl = Math.max(4, ...fs.map(f => Math.abs(f[0]))) * 1.05, Cx = LW.axes(ctx, box(2), { xr: [-fl, fl], yr: [-fl, fl], xlabel: "true force component", ylabel: "predicted", colors: C, title: "force parity (forces = −∇E of the network)", ny: 4 });
      Cx.clip(); LW.path(ctx, [-fl, fl], [-fl, fl], Cx, { color: C.ink3, width: 1, dash: [4, 4] }); fs.forEach(([a, b]) => LW.dot(ctx, Cx.sx(a), Cx.sy(LW.clamp(b, -fl * 1.2, fl * 1.2)), 2.6, VIOLET, null)); ctx.restore();
      const fr = Math.sqrt(fs.reduce((s, f) => s + (f[0] - f[1]) ** 2, 0) / fs.length);
      S.set("st", String(step)); S.set("tr", hist.length ? hist[hist.length - 1][1].toFixed(4) + " ε" : rmse(data).toFixed(4)); S.set("te", rmse(test).toFixed(4) + " ε"); S.set("tf", fr.toFixed(3) + " ε/σ");
    }
    P.draw = draw; init();
  });
})();

/* ---------------- 7. linear basis versus kernel regression for a dimer curve ---------------- */
(function () {
  "use strict";
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const morse = r => 2.0 * (1 - Math.exp(-1.4 * (r - 2.25))) ** 2 - 2.0, RC = 5.0, fc = r => (r < RC ? 0.5 * (Math.cos(Math.PI * r / RC) + 1) : 0);
  function solve(A, b) { const n = b.length, M = A.map((r, i) => r.concat([b[i]])); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } } return M.map((r, i) => r[n] / r[i]); }
  LW.register("basisfit", function (root) {
    let mode = "linear", K = 8, lam = -6, nData = 12, ell = 0.35, lo = 1.95, hi = 3.6;
    const P = LW.canvas(root, { height: w => Math.min(380, Math.max(280, w * 0.5)) });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Model", options: [["linear", "Linear in basis functions (SNAP / MTP / ACE)"], ["kernel", "Gaussian-process kernel (GAP)"]], value: mode, onChange: v => { mode = v; kS.el.style.display = v === "linear" ? "" : "none"; eS.el.style.display = v === "kernel" ? "" : "none"; draw(); } });
    const c2 = LW.controls(root);
    const kS = LW.slider(c2, { label: "Number of radial basis functions", min: 2, max: 16, step: 1, value: K, fmt: v => String(v), onInput: v => { K = v; draw(); } });
    const eS = LW.slider(c2, { label: "Kernel length scale ℓ (Å)", min: 0.08, max: 1.2, step: 0.01, value: ell, fmt: v => v.toFixed(2), onInput: v => { ell = v; draw(); } });
    LW.slider(c2, { label: "Regularisation log₁₀ λ", min: -10, max: 0, step: 0.1, value: lam, fmt: v => v.toFixed(1), onInput: v => { lam = v; draw(); } });
    LW.slider(c2, { label: "Training distances", min: 3, max: 30, step: 1, value: nData, fmt: v => String(v), onInput: v => { nData = v; draw(); } });
    const S = LW.stats(root, [["tr", "RMSE inside the training range"], ["ex", "RMSE outside it (extrapolation)"], ["n", "parameters"]]);
    eS.el.style.display = "none";
    function draw() {
      const C = LW.colors(), { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
      const xs = LW.linspace(1.7, 5.0, 300), rd = LW.linspace(lo, hi, nData), yd = rd.map(morse), L = Math.pow(10, lam);
      let pred, sd = null, coef = null, basis = null;
      if (mode === "linear") {
        const cen = LW.linspace(1.8, 4.8, K), wdt = (4.8 - 1.8) / Math.max(1, K - 1) * 0.8; basis = (r, k) => Math.exp(-((r - cen[k]) ** 2) / (2 * wdt * wdt)) * fc(r);
        const A = Array.from({ length: K }, (_, a) => Array.from({ length: K }, (_, b) => rd.reduce((s, r) => s + basis(r, a) * basis(r, b), 0) + (a === b ? L : 0)));
        const bb = Array.from({ length: K }, (_, a) => rd.reduce((s, r, i) => s + basis(r, a) * yd[i], 0)); coef = solve(A, bb);
        pred = r => coef.reduce((s, c, k) => s + c * basis(r, k), 0);
      } else {
        const k = (a, b) => Math.exp(-((a - b) ** 2) / (2 * ell * ell)), mu = yd.reduce((a, b) => a + b, 0) / nData;
        const Kmat = rd.map((a, i) => rd.map((b, j) => k(a, b) + (i === j ? L + 1e-9 : 0))), Lc = LW.chol(Kmat) || LW.chol(Kmat.map((row, i) => row.map((v, j) => v + (i === j ? 1e-5 : 0))));
        const alpha = LW.cholSolve(Lc, yd.map(y => y - mu)); pred = r => mu + rd.reduce((s, x, i) => s + alpha[i] * k(r, x), 0);
        sd = r => { const kv = rd.map(x => k(r, x)), v = LW.forwardSub(Lc, kv); return Math.sqrt(Math.max(0, 1 - v.reduce((s, q) => s + q * q, 0))) * 1.0; };
      }
      const A = LW.axes(ctx, { x: 52, y: 14, w: W - 66, h: H - 52 }, { xr: [1.7, 5.0], yr: [-2.6, 2.5], xlabel: "bond length r (Å)", ylabel: "energy (eV)", colors: C });
      A.clip(); ctx.fillStyle = rgba(TEAL, 0.07); ctx.fillRect(A.sx(lo), A.box.y, A.sx(hi) - A.sx(lo), A.box.h);
      if (sd) LW.band(ctx, xs, xs.map(r => pred(r) - 2 * sd(r)), xs.map(r => pred(r) + 2 * sd(r)), A, rgba(VIOLET, 0.16));
      if (basis) coef.forEach((c, k) => LW.path(ctx, xs, xs.map(r => c * basis(r, k)), A, { color: C.ink3, width: 1, alpha: 0.6 }));
      LW.path(ctx, xs, xs.map(morse), A, { color: BLUE, width: 2.2, dash: [6, 4] });
      LW.path(ctx, xs, xs.map(pred), A, { color: ORANGE, width: 2.6 });
      rd.forEach((r, i) => LW.dot(ctx, A.sx(r), A.sy(yd[i]), 4.5, ORANGE, C.card, 1.5)); ctx.restore();
      LW.text(ctx, "dashed blue: reference   orange: fit" + (basis ? "   grey: weighted basis functions" : "   violet: ±2σ uncertainty") + "   teal band: training range", A.box.x + 6, A.box.y + 14, { color: C.ink3, size: 10.5 });
      const ins = xs.filter(r => r >= lo && r <= hi), out = xs.filter(r => r > hi + 0.2), rm = a => Math.sqrt(a.reduce((s, r) => s + (pred(r) - morse(r)) ** 2, 0) / a.length);
      S.set("tr", (1000 * rm(ins)).toFixed(1) + " meV"); S.set("ex", (1000 * rm(out)).toFixed(0) + " meV"); S.set("n", mode === "linear" ? K + " coefficients" : nData + " kernel weights (one per training point)");
    }
    P.draw = draw; draw();
  });
})();
