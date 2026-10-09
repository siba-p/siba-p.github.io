/*
 * Composition-conserving Ising patterns (Kawasaki exchange Monte Carlo), as used to generate
 * the surface patterns and polymer sequences of the polymer-adhesion dataset.
 * A = strongly attracting site (+1), B = weakly attracting site (-1).
 */
(function () {
  "use strict";

  function shuffledLattice(n, nA) {
    const s = new Int8Array(n).fill(-1);
    for (let i = 0; i < nA; i++) s[i] = 1;
    for (let i = n - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = s[i]; s[i] = s[j]; s[j] = t; }
    return s;
  }

  function Surface(L, f) {
    this.L = L; this.f = f; this.nA = Math.round(f * L * L);
    this.s = shuffledLattice(L * L, this.nA);
  }
  Surface.prototype.nbrs = function (i) {
    const L = this.L, x = i % L, y = (i / L) | 0;
    return [y * L + (x + 1) % L, y * L + (x - 1 + L) % L, ((y + 1) % L) * L + x, ((y - 1 + L) % L) * L + x];
  };
  Surface.prototype.localE = function (i, skip) {
    let e = 0; const s = this.s;
    for (const j of this.nbrs(i)) if (j !== skip) e -= s[i] * s[j];
    return e;
  };
  Surface.prototype.sweep = function (K) {
    const L = this.L, n = L * L, s = this.s;
    for (let t = 0; t < n; t++) {
      const i = (Math.random() * n) | 0;
      const nb = this.nbrs(i), j = nb[(Math.random() * 4) | 0];
      if (s[i] === s[j]) continue;
      const before = this.localE(i, j) + this.localE(j, i);
      s[i] = -s[i]; s[j] = -s[j];
      const dE = this.localE(i, j) + this.localE(j, i) - before;
      if (dE > 0 && Math.random() >= Math.exp(-K * dE)) { s[i] = -s[i]; s[j] = -s[j]; }
    }
  };
  Surface.prototype.unlike = function () {
    const L = this.L, s = this.s; let u = 0;
    for (let i = 0; i < L * L; i++) { const x = i % L, y = (i / L) | 0; if (s[i] !== s[y * L + (x + 1) % L]) u++; if (s[i] !== s[((y + 1) % L) * L + x]) u++; }
    return u;
  };

  function Chain(N, f) { this.N = N; this.nA = Math.round(f * N); this.s = shuffledLattice(N, this.nA); }
  Chain.prototype.sweep = function (K) {
    const N = this.N, s = this.s;
    const e = i => { let v = 0; if (i > 0) v -= s[i] * s[i - 1]; if (i < N - 1) v -= s[i] * s[i + 1]; return v; };
    for (let t = 0; t < N; t++) {
      const i = (Math.random() * N) | 0, j = (Math.random() * N) | 0;
      if (i === j || s[i] === s[j]) continue;
      const before = e(i) + e(j);
      s[i] = -s[i]; s[j] = -s[j];
      const dE = e(i) + e(j) - before;
      if (dE > 0 && Math.random() >= Math.exp(-K * dE)) { s[i] = -s[i]; s[j] = -s[j]; }
    }
  };

  function drawSurface(canvas, surf) {
    const L = surf.L, px = 24, dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.height = L * px * dpr;
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#f3f6f8"; g.fillRect(0, 0, L * px, L * px);
    for (let i = 0; i < L * L; i++) {
      const x = (i % L) * px + px / 2, y = ((i / L) | 0) * px + px / 2, a = surf.s[i] > 0;
      const gr = g.createRadialGradient(x - 3, y - 4, 1, x, y, px * 0.5);
      if (a) { gr.addColorStop(0, "#ff9b8f"); gr.addColorStop(0.5, "#e2352a"); gr.addColorStop(1, "#8e1710"); }
      else { gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.6, "#e4e7eb"); gr.addColorStop(1, "#9aa1aa"); }
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, px * 0.47, 0, Math.PI * 2); g.fill();
    }
  }

  function drawChain(el, chain) {
    el.innerHTML = "";
    for (const v of chain.s) { const i = document.createElement("i"); i.className = v > 0 ? "a" : "b"; el.appendChild(i); }
  }

  function initIsing(root) {
    const $ = s => root.querySelector(s);
    const canvas = $("canvas"), seqEl = $(".seq");
    const fIn = $("#is-f"), kIn = $("#is-k"), lIn = $("#is-L"), npIn = $("#is-np");
    let surf, chain, raf = 0, sweeps = 0;

    function out(id, v) { const o = root.querySelector(`output[for="${id}"]`); if (o) o.textContent = v; }
    function report() {
      const L = surf.L, u = surf.unlike(), f = surf.nA / (L * L);
      const randomU = 2 * L * L * 2 * f * (1 - f);
      $("[data-stat=fa]").textContent = f.toFixed(3);
      $("[data-stat=nA]").textContent = `${surf.nA}/${L * L}`;
      $("[data-stat=unlike]").textContent = u;
      $("[data-stat=order]").textContent = (1 - u / randomU).toFixed(2);
      $("[data-stat=sweeps]").textContent = sweeps;
      $("[data-stat=seqfa]").textContent = (chain.nA / chain.N).toFixed(2);
    }
    function regenerate() {
      cancelAnimationFrame(raf);
      const f = +fIn.value, L = +lIn.value;
      surf = new Surface(L, f); chain = new Chain(+npIn.value, f); sweeps = 0;
      drawSurface(canvas, surf); drawChain(seqEl, chain); report();
      const K = +kIn.value, target = 400;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        for (let i = 0; i < target; i++) { surf.sweep(K); chain.sweep(K); }
        sweeps = target; drawSurface(canvas, surf); drawChain(seqEl, chain); report(); return;
      }
      const loop = () => {
        for (let i = 0; i < 4; i++) { surf.sweep(K); chain.sweep(K); sweeps++; }
        drawSurface(canvas, surf);
        if (sweeps % 20 === 0) drawChain(seqEl, chain);
        report();
        if (sweeps < target) raf = requestAnimationFrame(loop); else drawChain(seqEl, chain);
      };
      raf = requestAnimationFrame(loop);
    }
    [fIn, kIn, lIn, npIn].forEach(inp => {
      inp.addEventListener("input", () => out(inp.id, inp.value));
      inp.addEventListener("change", regenerate);
      out(inp.id, inp.value);
    });
    $("[data-act=gen]").addEventListener("click", regenerate);
    $("[data-act=copy]").addEventListener("click", async e => {
      const L = surf.L, rows = [];
      for (let y = 0; y < L; y++) rows.push(Array.from(surf.s.slice(y * L, y * L + L), v => (v > 0 ? 1 : 0)).join(" "));
      const txt = `# surface ${L}x${L}, f_A=${(surf.nA / (L * L)).toFixed(3)}, J/kT=${kIn.value}\n${rows.join("\n")}\n# polymer N=${chain.N}\n${Array.from(chain.s, v => (v > 0 ? "A" : "B")).join("")}\n`;
      try { await navigator.clipboard.writeText(txt); e.target.textContent = "Copied ✓"; }
      catch { e.target.textContent = "Copy blocked"; }
      setTimeout(() => (e.target.textContent = "Copy as text"), 1600);
    });
    regenerate();
  }

  window.initIsing = initIsing;
})();
