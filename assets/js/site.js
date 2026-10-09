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

  /* Transparent header over the home hero */
  const header = $(".site-header");
  if (document.body.classList.contains("is-home") && header) {
    const hero = $(".hero");
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > (hero ? hero.offsetHeight - 70 : 200));
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

  /* Assembly simulations */
  const fmt = (v, d = 2) => (+v).toFixed(d);
  const NOTES = {
    complementary: "Complementary strands bind only unlike particles, so the system builds an alternating binary lattice.",
    self: "Self-complementary strands bind like with like, so the two species sort into separate crystals.",
    universal: "When every pair can hybridise, the particles pack into a hexagonal crystal with the species mixed at random."
  };
  function wirePanel(panel, sim) {
    if (!panel) return () => {};
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
    $$("[data-program]", panel).forEach(b => b.addEventListener("click", () => {
      $$("[data-program]", panel).forEach(o => o.setAttribute("aria-pressed", o === b));
      sim.setProgram(b.dataset.program);
      const note = $("[data-program-note]", panel); if (note) note.textContent = NOTES[b.dataset.program];
    }));
    $$("[data-act]", panel).forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "quench") sim.anneal(0.45);
      if (a === "melt") { sim.heat(); setTimeout(() => sim.anneal(0.45), 900); }
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
    };
  }
  $$("canvas[data-sim]").forEach(canvas => {
    if (!window.AssemblySim) return;
    const panel = document.getElementById(canvas.dataset.panel);
    let update = null;
    const sim = window.AssemblySim(canvas, {
      sigmaPx: +(canvas.dataset.sigma || 20),
      maxN: +(canvas.dataset.max || 520),
      phi: +(canvas.dataset.phi || 0.44),
      attention: canvas.dataset.attention === "true",
      prewarm: +(canvas.dataset.prewarm || 0),
      onStats: s => update && update(s)
    });
    update = wirePanel(panel, sim);
    const cycle = canvas.parentElement.querySelector("[data-cycle-program]");
    if (cycle) {
      const order = [["complementary", "a ↔ a′", "#6f88ff", "#ff9f5a"], ["self", "a ↔ a, a′ ↔ a′", "#6f88ff", "#6f88ff"], ["universal", "all bind", "#c9d2ea", "#c9d2ea"]];
      let k = 0;
      cycle.addEventListener("click", () => {
        k = (k + 1) % order.length;
        const [name, label, c1, c2] = order[k];
        sim.setProgram(name);
        const dots = cycle.querySelectorAll("i"); dots[0].style.background = c1; dots[1].style.background = c2;
        cycle.querySelector("span").textContent = label;
      });
    }
    if (sim.reduced && panel) { const p = $("[data-act=pause]", panel); if (p) p.textContent = "Play"; }
  });

  /* Ising playground */
  const ising = $("#ising");
  if (ising && window.initIsing) window.initIsing(ising);

  /* Publication lineage graph */
  const graph = $("svg.graph");
  if (graph) {
    const tip = $(".graph-tip");
    const defaultTip = tip ? tip.innerHTML : "";
    const edges = $$(".edge", graph);
    const related = key => {
      const set = new Set([key]);
      let grew = true;
      while (grew) {
        grew = false;
        edges.forEach(e => {
          if (set.has(e.dataset.to) && !set.has(e.dataset.from) && e.dataset.from) { set.add(e.dataset.from); grew = true; }
        });
      }
      edges.forEach(e => { if (e.dataset.from === key && e.dataset.to !== "thesis") set.add(e.dataset.to); });
      return set;
    };
    const show = node => {
      const key = node.dataset.key, set = related(key);
      graph.classList.add("hovering");
      $$(".node", graph).forEach(n => n.classList.toggle("hot", set.has(n.dataset.key)));
      edges.forEach(e => e.classList.toggle("hot", set.has(e.dataset.from) && (set.has(e.dataset.to) || e.dataset.to === "thesis") && (e.dataset.to !== "thesis" || e.dataset.from === key)));
      if (tip) { tip.innerHTML = ""; const b = document.createElement("b"); b.textContent = node.dataset.title; tip.append(b, document.createTextNode(". " + (node.dataset.take || ""))); }
    };
    const clear = () => {
      graph.classList.remove("hovering");
      $$(".hot", graph).forEach(n => n.classList.remove("hot"));
      if (tip) tip.innerHTML = defaultTip;
    };
    $$(".node", graph).forEach(n => {
      n.addEventListener("mouseenter", () => show(n));
      n.addEventListener("focus", () => show(n));
      n.addEventListener("mouseleave", clear);
      n.addEventListener("blur", clear);
      n.addEventListener("click", () => {
        const card = document.getElementById("pub-" + n.dataset.key);
        if (card) { card.hidden = false; card.classList.add("flash"); setTimeout(() => card.classList.remove("flash"), 1600); }
      });
    });
  }
  $$(".filters [data-lane]").forEach(btn => btn.addEventListener("click", () => {
    $$(".filters [data-lane]").forEach(b => b.setAttribute("aria-pressed", b === btn));
    const lane = btn.dataset.lane;
    $$(".pub-card[data-lane]").forEach(c => { c.hidden = lane !== "all" && c.dataset.lane !== lane; });
  }));

  /* Network map: link legend cards and map nodes */
  const net = $("[data-net]");
  if (net) {
    const list = $(".netlist");
    const hot = id => {
      net.classList.toggle("net-hover", !!id);
      $$(".mnode", net).forEach(n => n.classList.toggle("hot", n.dataset.node === id));
      if (list) $$("li", list).forEach(l => l.classList.toggle("hot", l.dataset.node === id));
    };
    const bind = (el, id) => {
      el.addEventListener("mouseenter", () => hot(id));
      el.addEventListener("mouseleave", () => hot(null));
      el.addEventListener("focus", () => hot(id));
      el.addEventListener("blur", () => hot(null));
    };
    if (list) $$("li", list).forEach(l => bind(l, l.dataset.node));
    $$(".mnode", net).forEach(n => bind(n, n.dataset.node));
  }

  /* Gallery filter + viewer */
  const theatre = $(".theatre");
  if (theatre) {
    $$(".filters button[data-tag]").forEach(btn => btn.addEventListener("click", () => {
      $$(".filters button[data-tag]").forEach(b => b.setAttribute("aria-pressed", b === btn));
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

  /* Copy buttons */
  $$("[data-copy]").forEach(b => b.addEventListener("click", async () => {
    const src = document.getElementById(b.dataset.copy);
    try { await navigator.clipboard.writeText(src.innerText); b.textContent = "Copied ✓"; }
    catch { b.textContent = "Select & copy"; }
    setTimeout(() => (b.textContent = "Copy"), 1500);
  }));
})();
