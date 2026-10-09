(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }
  };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Theme */
  const themeBtn = $(".theme-btn");
  if (themeBtn) themeBtn.addEventListener("click", () => {
    const root = document.documentElement;
    const cur = root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    root.dataset.theme = next; store.set("theme", next);
  });

  /* Mobile menu */
  const menuBtn = $(".menu-btn"), nav = $(".nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open);
    });
    nav.addEventListener("click", e => { if (e.target.closest("a")) { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); } });
  }

  /* Header over hero */
  const header = $(".site-header");
  if (document.body.classList.contains("is-home") && header) {
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > window.innerHeight * 0.75);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Reveal */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach(el => io.observe(el));

  /* Videos: play only while visible */
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting && !reduce) { v.play().catch(() => {}); } else v.pause();
  }), { threshold: 0.25 });
  $$("video[data-auto]").forEach(v => { v.muted = true; vio.observe(v); });

  /* Hero simulation */
  const fmt = (v, d = 2) => (+v).toFixed(d);
  function spark(canvas, hist) {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w) return;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const g = canvas.getContext("2d"); g.scale(dpr, dpr);
    g.strokeStyle = "rgba(255,255,255,.08)"; g.beginPath(); g.moveTo(0, h - 0.5); g.lineTo(w, h - 0.5); g.stroke();
    if (hist.length < 2) return;
    g.beginPath();
    hist.forEach((v, i) => { const X = (i / 159) * w, Y = h - 2 - v * (h - 4); i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.strokeStyle = "#e2b13c"; g.lineWidth = 1.5; g.stroke();
  }
  function wirePanel(panel, sim) {
    if (!panel) return;
    const tIn = $("[data-ctl=T]", panel), tOut = $("output[data-out=T]", panel);
    let dragging = false;
    if (tIn) {
      tIn.addEventListener("input", () => { dragging = true; sim.setT(+tIn.value); tOut.textContent = fmt(tIn.value); });
      tIn.addEventListener("change", () => { dragging = false; });
    }
    const dIn = $("[data-ctl=phi]", panel);
    if (dIn) {
      dIn.addEventListener("input", () => { $("output[data-out=phi]", panel).textContent = fmt(dIn.value); });
      dIn.addEventListener("change", () => sim.setDensity(+dIn.value));
    }
    const tauIn = $("[data-ctl=tau]", panel);
    if (tauIn) tauIn.addEventListener("input", () => { sim.setTau(+tauIn.value); $("output[data-out=tau]", panel).textContent = fmt(tauIn.value, 1); });
    $$("[data-act]", panel).forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "quench") sim.anneal(0.36);
      if (a === "melt") sim.heat();
      if (a === "reset") sim.reset();
      if (a === "attention" || a === "bonds") {
        const on = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", on); sim.toggle(a, on);
      }
      if (a === "pause") {
        if (sim.running) { sim.stop(); b.textContent = "Play"; } else { sim.start(); b.textContent = "Pause"; }
      }
    }));
    return s => {
      if (tIn && !dragging) { tIn.value = s.T; tOut.textContent = fmt(s.T); }
      const set = (k, v) => { const el = $(`[data-stat=${k}]`, panel); if (el) el.textContent = v; };
      set("solid", Math.round(s.solid * 100) + "%");
      set("z", fmt(s.z, 2));
      set("N", s.N);
      spark($(".sim-spark", panel), s.history);
    };
  }
  $$("canvas[data-sim]").forEach(canvas => {
    if (!window.AssemblySim) return;
    const panel = document.getElementById(canvas.dataset.panel);
    let update = null;
    const sim = window.AssemblySim(canvas, {
      sigmaPx: +(canvas.dataset.sigma || 22),
      maxN: +(canvas.dataset.max || 720),
      phi: +(canvas.dataset.phi || 0.28),
      onStats: s => update && update(s)
    });
    update = wirePanel(panel, sim);
    if (sim.reduced && panel) { const p = $("[data-act=pause]", panel); if (p) p.textContent = "Play"; }
  });

  /* Ising playground */
  const ising = $("#ising");
  if (ising && window.initIsing) window.initIsing(ising);

  /* Gallery filter + viewer */
  const theatre = $(".theatre");
  if (theatre) {
    $$(".filters button").forEach(btn => btn.addEventListener("click", () => {
      $$(".filters button").forEach(b => b.setAttribute("aria-pressed", b === btn));
      const tag = btn.dataset.tag;
      $$(".shot", theatre).forEach(s => { s.hidden = tag !== "all" && !s.dataset.tags.split(",").includes(tag); });
    }));
    const dlg = $("dialog.viewer");
    $$(".shot button", theatre).forEach(b => b.addEventListener("click", () => {
      const shot = b.closest(".shot"), media = $(".plate", shot).cloneNode(true);
      const v = $("video", media); if (v) { v.controls = true; v.removeAttribute("data-auto"); v.muted = true; v.play().catch(() => {}); }
      $(".viewer-body", dlg).replaceChildren(media);
      $("p", dlg).textContent = $("figcaption", shot).innerText.replace(/\n+/, ". ");
      dlg.showModal();
    }));
    if (dlg) {
      $(".close", dlg).addEventListener("click", () => dlg.close());
      dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener("close", () => $(".viewer-body", dlg).replaceChildren());
    }
  }

  /* GitHub repo stats */
  $$("[data-repo]").forEach(async el => {
    const repo = el.dataset.repo, key = "gh:" + repo;
    let data = null;
    try { data = JSON.parse(sessionStorage.getItem(key) || "null"); } catch { /* ignore */ }
    if (!data) {
      try {
        const r = await fetch(`https://api.github.com/repos/${repo}`);
        if (!r.ok) return;
        const j = await r.json();
        data = { s: j.stargazers_count, f: j.forks_count, u: j.pushed_at };
        try { sessionStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
      } catch { return; }
    }
    const d = new Date(data.u);
    el.textContent = `★ ${data.s}   ⑂ ${data.f}   updated ${d.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
  });

  /* Copy buttons for BibTeX / code */
  $$("[data-copy]").forEach(b => b.addEventListener("click", async () => {
    const src = document.getElementById(b.dataset.copy);
    try { await navigator.clipboard.writeText(src.innerText); b.textContent = "Copied ✓"; }
    catch { b.textContent = "Select & copy"; }
    setTimeout(() => (b.textContent = "Copy"), 1500);
  }));
})();
