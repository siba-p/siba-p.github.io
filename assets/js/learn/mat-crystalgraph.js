/* 5.1 Representing materials: build the periodic crystal graph of a 2D lattice with a cut-off. */
(function () {
  "use strict";
  const LAT = {
    square: { name: "Square", a: [[1, 0], [0, 1]], basis: [[0, 0, "A"]] },
    hex: { name: "Triangular", a: [[1, 0], [0.5, Math.sqrt(3) / 2]], basis: [[0, 0, "A"]] },
    honey: { name: "Honeycomb (graphene)", a: [[Math.sqrt(3), 0], [Math.sqrt(3) / 2, 1.5]], basis: [[0, 0, "A"], [Math.sqrt(3) / 2, 0.5, "A"]] },
    salt: { name: "Two-species square (rock salt in 2D)", a: [[2, 0], [0, 2]], basis: [[0, 0, "A"], [1, 0, "B"], [0, 1, "B"], [1, 1, "A"]] }
  };
  LW.register("crystalgraph", function (root) {
    let key = "hex", rc = 1.1, strain = 0, scale = 1;
    const row = LW.h("div", { class: "lw-row" }); root.append(row);
    const left = LW.h("div"), right = LW.h("div"); row.append(left, right);
    const P = LW.canvas(left, { height: w => Math.min(w * 0.86, 420) });
    const Q = LW.canvas(right, { aspect: 0.8, minH: 220, maxH: 320 });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Lattice", options: Object.keys(LAT).map(k => [k, LAT[k].name]), value: key, onChange: v => { key = v; draw(); } });
    const c2 = LW.controls(root);
    LW.slider(c2, { label: "Cut-off radius r<sub>c</sub>", min: 0.5, max: 2.6, step: 0.01, value: rc, fmt: v => v.toFixed(2), onInput: v => { rc = v; draw(); } });
    LW.slider(c2, { label: "Uniaxial strain along x", min: -0.15, max: 0.15, step: 0.005, value: 0, fmt: v => (v * 100).toFixed(1) + " %", onInput: v => { strain = v; draw(); } });
    const S = LW.stats(root, [["n", "atoms in the cell"], ["e", "edges from the cell"], ["img", "edges to periodic images"], ["cn", "coordination numbers"]]);
    LW.note(root, "Bold atoms are the unit cell; faint atoms are its periodic images. Every edge starts in the cell; dashed edges end on an image, so the graph wraps around the periodic boundary.");
    function cell() {
      const L = LAT[key], A = L.a.map(v => [v[0] * (1 + strain) * scale, v[1] * scale]);
      const frac = L.basis.map(([x, y, s]) => { const M = L.a, det = M[0][0] * M[1][1] - M[1][0] * M[0][1]; return { f: [(x * M[1][1] - y * M[1][0]) / det, (y * M[0][0] - x * M[0][1]) / det], s }; });
      const cart = (f, n1, n2) => [(f[0] + n1) * A[0][0] + (f[1] + n2) * A[1][0], (f[0] + n1) * A[0][1] + (f[1] + n2) * A[1][1]];
      const edges = [];
      frac.forEach((ai, i) => { const pi = cart(ai.f, 0, 0); for (let n1 = -4; n1 <= 4; n1++) for (let n2 = -4; n2 <= 4; n2++) frac.forEach((aj, j) => { if (i === j && !n1 && !n2) return; const pj = cart(aj.f, n1, n2), d = Math.hypot(pj[0] - pi[0], pj[1] - pi[1]); if (d < rc) edges.push({ i, j, n1, n2, d, p0: pi, p1: pj }); }); });
      return { A, frac, cart, edges };
    }
    function draw() {
      const C = LW.colors(), G = cell();
      { const { ctx, W, H } = P; ctx.clearRect(0, 0, W, H);
        const diag = Math.hypot(G.A[0][0] + G.A[1][0], G.A[0][1] + G.A[1][1]), span = 2 * (Math.max(rc, 0.8) + diag / 2) + 0.9, sc = Math.min(W, H) / span;
        const c0 = [(G.A[0][0] + G.A[1][0]) / 2, (G.A[0][1] + G.A[1][1]) / 2], X = p => W / 2 + (p[0] - c0[0]) * sc, Y = p => H / 2 - (p[1] - c0[1]) * sc;
        ctx.fillStyle = C.dark ? "rgba(135,150,255,.07)" : "rgba(59,80,224,.05)"; ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(X([0, 0]), Y([0, 0])); ctx.lineTo(X(G.A[0]), Y(G.A[0])); ctx.lineTo(X([G.A[0][0] + G.A[1][0], G.A[0][1] + G.A[1][1]]), Y([G.A[0][0] + G.A[1][0], G.A[0][1] + G.A[1][1]])); ctx.lineTo(X(G.A[1]), Y(G.A[1])); ctx.closePath(); ctx.fill(); ctx.stroke();
        G.edges.forEach(e => { const img = e.n1 || e.n2; ctx.strokeStyle = img ? C.orange : C.teal; ctx.lineWidth = 2.2; ctx.setLineDash(img ? [5, 4] : []); ctx.beginPath(); ctx.moveTo(X(e.p0), Y(e.p0)); ctx.lineTo(X(e.p1), Y(e.p1)); ctx.stroke(); }); ctx.setLineDash([]);
        for (let n1 = -3; n1 <= 3; n1++) for (let n2 = -3; n2 <= 3; n2++) G.frac.forEach(a => { const p = G.cart(a.f, n1, n2), x = X(p), y = Y(p); if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return; const home = !n1 && !n2;
          ctx.globalAlpha = home ? 1 : 0.32; LW.dot(ctx, x, y, Math.max(5, sc * 0.14), a.s === "A" ? C.atomA : C.atomB, home ? C.ink : null, 2); ctx.globalAlpha = 1; });
        G.frac.forEach((a, i) => { const p = G.cart(a.f, 0, 0); LW.text(ctx, String(i + 1), X(p), Y(p) + 1, { color: "#fff", size: 10, weight: 700, align: "center", base: "middle" }); });
        ctx.strokeStyle = C.ink3; ctx.setLineDash([3, 4]); const p0 = G.cart(G.frac[0].f, 0, 0); ctx.beginPath(); ctx.arc(X(p0), Y(p0), rc * sc, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
      }
      { const { ctx, W, H } = Q; ctx.clearRect(0, 0, W, H);
        const ds = G.edges.map(e => e.d), nb = 26, bins = new Array(nb).fill(0), hi = 2.6; ds.forEach(d => { bins[Math.min(nb - 1, Math.floor(d / hi * nb))]++; });
        const B = LW.axes(ctx, { x: 52, y: 22, w: W - 64, h: H - 62 }, { xr: [0, hi], yr: [0, Math.max(4, ...bins) * 1.15], xlabel: "neighbour distance (lattice units)", ylabel: "edges", title: "Edge lengths in the graph", colors: C });
        bins.forEach((c, k) => { if (!c) return; ctx.fillStyle = C.violet; const x0 = B.sx(k * hi / nb), x1 = B.sx((k + 1) * hi / nb); ctx.fillRect(x0 + 1, B.sy(c), x1 - x0 - 2, B.sy(0) - B.sy(c)); });
        ctx.strokeStyle = C.rose; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(B.sx(rc), B.box.y); ctx.lineTo(B.sx(rc), B.box.y + B.box.h); ctx.stroke(); ctx.setLineDash([]);
        LW.text(ctx, "r_c", B.sx(rc) + 4, B.box.y + 12, { color: C.rose, size: 11 });
      }
      const cn = G.frac.map((_, i) => G.edges.filter(e => e.i === i).length);
      S.set("n", String(G.frac.length)); S.set("e", String(G.edges.length)); S.set("img", String(G.edges.filter(e => e.n1 || e.n2).length)); S.set("cn", cn.join(", "));
    }
    P.draw = Q.draw = draw;
    draw();
  });
})();
