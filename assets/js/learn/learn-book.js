/* Learn navigation.
   Chapter pages: contents drawer on small screens, section scroll-spy, reading-progress bar, and a note of the
   last chapter opened. Book pages and reading paths: "Continue" buttons that point at the first unread chapter.
   Library: "Continue where you left off" and the remembered reading path. */
(function () {
  "use strict";
  const DONE = "learn.done", LAST = "learn.last", PATH = "learn.path";
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
  const narrow = () => matchMedia("(max-width: 1100px)").matches;

  function drawer(nav) {
    const toggle = nav && nav.querySelector(".bn-toggle"); if (!toggle) return;
    const close = () => { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", () => { const o = nav.classList.toggle("open"); toggle.setAttribute("aria-expanded", String(o)); });
    nav.addEventListener("click", e => { if (e.target.closest(".bn-in a") && narrow()) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  }

  function chapter() {
    const art = document.querySelector(".chap"); if (!art) return;
    const nav = art.querySelector(".book-nav"), body = art.querySelector(".chap-body");
    drawer(nav);
    const h1 = art.querySelector(".chap-head h1");
    put(LAST, { s: art.dataset.learnPage, t: h1 ? h1.textContent.trim() : "", b: art.dataset.learnBook || "", u: location.pathname });

    const bar = document.createElement("div"); bar.className = "book-progress"; bar.setAttribute("aria-hidden", "true"); bar.innerHTML = "<i></i>"; document.body.append(bar);
    const heads = body ? [...body.querySelectorAll(":scope > h2[id]")] : [];
    const links = nav ? [...nav.querySelectorAll(".bn-secs a")] : [];
    let ticking = false;
    function spy() {
      ticking = false;
      if (body) { const r = body.getBoundingClientRect(), span = r.height - innerHeight * 0.6; bar.firstChild.style.transform = "scaleX(" + Math.min(1, Math.max(0, span > 0 ? -r.top / span : 0)) + ")"; }
      let cur = null; for (const h of heads) { if (h.getBoundingClientRect().top - 120 <= 0) cur = h; else break; }
      links.forEach(a => a.classList.toggle("on", !!cur && a.getAttribute("href") === "#" + cur.id));
    }
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    spy();
    // keep the current chapter in view inside a long sidebar
    const on = nav && nav.querySelector(".bn-chs > li.on");
    if (on && !narrow() && on.offsetTop + on.offsetHeight > nav.clientHeight - 60) nav.scrollTop = Math.max(0, on.offsetTop - 140);
    // figures change height while they mount, so a deep link is re-applied once they have settled
    if (location.hash) { const t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) setTimeout(() => t.scrollIntoView({ behavior: "instant" }), 450); }
  }

  function continues() {
    const s = new Set(get(DONE, []));
    document.querySelectorAll("[data-learn-continue]").forEach(btn => {
      if (!btn.dataset.start) btn.dataset.start = btn.textContent;
      const scope = btn.closest("[data-learn-slugs]"); if (!scope) return;
      const list = scope.dataset.learnSlugs.trim().split(/\s+/).filter(Boolean); if (!list.length) return;
      const link = slug => scope.querySelector('a[data-learn-slug="' + slug + '"]:not([data-learn-continue])');
      const read = list.filter(x => s.has(x)).length, next = list.find(x => !s.has(x));
      if (!read) { btn.textContent = btn.dataset.start; const a = link(list[0]); if (a) btn.href = a.getAttribute("href"); return; }
      if (!next) { btn.textContent = "All read. Start again"; const a = link(list[0]); if (a) btn.href = a.getAttribute("href"); return; }
      const a = link(next); if (!a) return;
      const t = a.querySelector(".syl-t, .ls-t, .cb-t");
      btn.href = a.getAttribute("href");
      btn.textContent = "Continue: " + (t ? t.textContent : a.textContent).trim();
    });
  }

  function library() {
    const r = document.querySelector("[data-learn-resume]"), last = get(LAST, null);
    if (r && last && last.u) { const a = r.querySelector("a"); a.href = last.u; a.textContent = last.t + (last.b ? " (" + last.b + ")" : ""); r.hidden = false; }
    const radios = [...document.querySelectorAll(".lpath-r")];
    if (radios.length) {
      const want = get(PATH, null), hit = radios.find(x => x.id === "lp-" + want);
      if (hit) hit.checked = true;
      radios.forEach(x => x.addEventListener("change", () => { if (x.checked) put(PATH, x.id.slice(3)); }));
    }
  }

  /* static figures open full size; Escape or a click closes them */
  function zoom() {
    document.addEventListener("click", e => {
      const a = e.target.closest("a[data-zoom]"); if (!a || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      const img = a.querySelector("img"), cap = a.closest("figure") && a.closest("figure").querySelector("figcaption");
      const box = document.createElement("div"); box.className = "lightbox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", img ? img.alt : "Figure");
      box.innerHTML = '<img alt="">' + (cap ? "<p></p>" : "");
      box.firstChild.src = a.getAttribute("href"); box.firstChild.alt = img ? img.alt : "";
      if (cap) box.lastChild.textContent = cap.textContent.trim();
      const close = () => { box.remove(); document.removeEventListener("keydown", key); a.focus(); };
      const key = ev => { if (ev.key === "Escape") close(); };
      box.addEventListener("click", close); document.addEventListener("keydown", key);
      document.body.append(box);
    });
  }

  /* book tabs follow the address (#timeline, #formulas), and the library timeline filters by book */
  function tabs() {
    const pick = () => { const h = location.hash.slice(1), r = document.getElementById("bt-" + h); if (r && (h === "timeline" || h === "formulas" || h === "contents")) r.checked = true; else if (/^part-/.test(h)) { const c = document.getElementById("bt-contents"); if (c) c.checked = true; } };
    pick(); addEventListener("hashchange", pick);
    document.querySelectorAll('input[name="bktab"]').forEach(r => r.addEventListener("change", () => { if (r.checked) history.replaceState(null, "", "#" + r.id.slice(3)); }));
    const bar = document.querySelector(".tl-filter"), list = document.querySelector(".tl-all");
    if (bar && list) bar.addEventListener("click", e => {
      const b = e.target.closest("button[data-tl]"); if (!b) return;
      bar.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      const f = b.dataset.tl; let cent = null, any = false;
      [...list.children].forEach(li => {
        if (li.classList.contains("tl-cent")) { if (cent) cent.hidden = !any; cent = li; any = false; return; }
        const show = f === "all" || li.dataset.c === f; li.hidden = !show; any = any || show;
      });
      if (cent) cent.hidden = !any;
    });
  }

  function init() { chapter(); library(); continues(); zoom(); tabs(); document.addEventListener("learn:progress", continues); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(init, 0)); else setTimeout(init, 0);
})();
