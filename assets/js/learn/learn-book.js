/* Book pages: contents scroll-spy, mobile contents drawer, and same-page links between chapters. */
(function () {
  "use strict";
  function init() {
    const book = document.querySelector(".book"); if (!book) return;
    const nav = book.querySelector(".book-nav"), toggle = nav && nav.querySelector(".bn-toggle");
    if (toggle) { toggle.addEventListener("click", () => { const o = nav.classList.toggle("open"); toggle.setAttribute("aria-expanded", String(o)); }); nav.addEventListener("click", e => { if (e.target.closest(".bn-in a") && matchMedia("(max-width: 1100px)").matches) { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); } }); }
    // links written as ../slug/ or /learn/slug/#frag inside chapters: keep them on this page when possible
    book.querySelectorAll(".book-body a[href]").forEach(a => {
      let u; try { u = new URL(a.getAttribute("href"), location.href); } catch (e) { return; }
      if (u.origin !== location.origin) return; const m = u.pathname.match(/\/learn\/([a-z0-9-]+)\/?$/); if (!m || !document.getElementById(m[1]) || !document.getElementById(m[1]).classList.contains("chapter")) return;
      const frag = u.hash.slice(1); a.setAttribute("href", "#" + (frag ? m[1] + "--" + frag : m[1]));
    });
    // scroll-spy
    const items = [...book.querySelectorAll(".bn-chs > li")], secLinks = [...book.querySelectorAll(".bn-secs a")];
    const chapters = [...book.querySelectorAll(".chapter")], heads = [...book.querySelectorAll(".ch-body > h3[id]")];
    let ticking = false;
    function spy() { ticking = false; const y = 120;
      let ch = chapters[0]; for (const c of chapters) { if (c.getBoundingClientRect().top - y <= 0) ch = c; else break; }
      let hd = null; for (const h of heads) { if (h.getBoundingClientRect().top - y <= 0) hd = h; else break; }
      items.forEach(li => li.classList.toggle("on", ch && li.dataset.ch === ch.id));
      secLinks.forEach(a => a.classList.toggle("on", !!hd && a.getAttribute("href") === "#" + hd.id && hd.closest(".chapter") === ch));
      const on = book.querySelector(".bn-chs > li.on"); if (on && !matchMedia("(max-width: 1100px)").matches) { const n = nav.querySelector(".bn-in"), box = nav.getBoundingClientRect(), r = on.getBoundingClientRect(); if (r.top < box.top + 40 || r.bottom > box.bottom - 40) nav.scrollTop += r.top - box.top - 80; void n; }
    }
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    spy();
    // an anchor may point into a chapter whose figures change height while mounting: re-scroll once
    if (location.hash) { const t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) { t.scrollIntoView({ behavior: "instant" }); setTimeout(() => t.scrollIntoView({ behavior: "instant" }), 400); } }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(init, 0)); else setTimeout(init, 0);
})();
