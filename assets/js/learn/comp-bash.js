/* Computing 4: what bash does with a command line, stage by stage — tokens, expansions,
   redirections, processes and pipes, exit status. Nothing is executed. */
(function () {
  "use strict";
  const ENV = { HOME: "/home/student", USER: "student", PWD: "/home/student/project", T: "320", PATH: "/usr/local/bin:/usr/bin:/bin" };
  const FILES = ["md.log", "md.mdp", "run1.log", "run2.log", "energy.xvg", "topol.top"];
  const PRESETS = ["grep -c Fatal *.log | sort -t: -k2 -n > counts.txt", "echo \"Hello $USER, today is $(date +%A)\"", "cd ~/project && ls -l *.mdp", "gmx mdrun -deffnm md > run.out 2>&1 &", "sed \"s/300/$T/\" md.mdp > md_$T.mdp", "ls missing.txt || echo 'no such file'"];
  const OPS = new Set(["|", "&&", "||", ";", "&", ">", ">>", "<", "2>", "2>&1"]);
  function tokenize(s) {
    const t = []; let cur = "", q = null, kinds = [];
    const push = () => { if (cur) t.push({ v: cur, kind: kinds.includes("dq") ? "dq" : kinds.includes("sq") ? "sq" : "word" }); cur = ""; kinds = []; };
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { cur += c; if (c === q) q = null; continue; }
      if (c === "'" || c === '"') { q = c; kinds.push(c === "'" ? "sq" : "dq"); cur += c; continue; }
      if (c === "$" && s[i + 1] === "(") { let d = 0, j = i; for (; j < s.length; j++) { if (s[j] === "(") d++; if (s[j] === ")") { d--; if (!d) break; } } cur += s.slice(i, j + 1); i = j; continue; }
      if (/\s/.test(c)) { push(); continue; }
      const four = s.slice(i, i + 4), two = s.slice(i, i + 2);
      if (four === "2>&1") { push(); t.push({ v: four, kind: "op" }); i += 3; continue; }
      if (["&&", "||", ">>", "2>"].includes(two)) { push(); t.push({ v: two, kind: "op" }); i++; continue; }
      if ("|;&<>".includes(c)) { push(); t.push({ v: c, kind: "op" }); continue; }
      cur += c;
    }
    push(); return t;
  }
  function expand(tok) {
    if (tok.kind === "op") return { out: [tok.v], notes: [] };
    let v = tok.v, notes = [];
    if (v.startsWith("~")) { v = ENV.HOME + v.slice(1); notes.push("tilde ~ → your home directory"); }
    if (tok.kind !== "sq") {
      v = v.replace(/\$\(([^)]*)\)/g, (m, c) => { const r = /^date/.test(c) ? "Friday" : /^whoami/.test(c) ? "student" : /^pwd/.test(c) ? ENV.PWD : "…"; notes.push(`command substitution ${m} → runs it, inserts its output “${r}”`); return r; });
      v = v.replace(/\$\{?(\w+)\}?/g, (m, n) => { const r = ENV[n] !== undefined ? ENV[n] : ""; notes.push(`variable ${m} → “${r}”${ENV[n] === undefined ? " (unset, so empty)" : ""}`); return r; });
    }
    let quoted = false; if (/^'.*'$|^".*"$/.test(v)) { v = v.slice(1, -1); quoted = true; notes.push(tok.kind === "sq" ? "single quotes: everything inside kept literally" : "double quotes: variables expanded, spaces kept, no globbing"); }
    if (!quoted && /[*?]/.test(v)) { const re = new RegExp("^" + v.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".") + "$"), m = FILES.filter(f => re.test(f)); notes.push(m.length ? `glob ${v} → ${m.length} matching file${m.length > 1 ? "s" : ""}` : `glob ${v} matches nothing, so it is passed unchanged`); return { out: m.length ? m : [v], notes }; }
    return { out: [v], notes };
  }
  function plan(tokens) { // split into lists of pipelines; each command gets args and redirections
    const lists = []; let pipe = [], cmd = { args: [], redir: [] }, redirNext = null, sep = null;
    const endCmd = () => { if (cmd.args.length || cmd.redir.length) pipe.push(cmd); cmd = { args: [], redir: [] }; };
    const endPipe = s => { endCmd(); if (pipe.length) lists.push({ pipe, sep: s }); pipe = []; };
    tokens.forEach(t => {
      if (t.kind === "op") {
        if (t.v === "|") endCmd();
        else if ([">", ">>", "<", "2>"].includes(t.v)) redirNext = t.v;
        else if (t.v === "2>&1") cmd.redir.push({ fd: 2, to: "same place as stdout" });
        else endPipe(t.v);
      } else if (redirNext) { cmd.redir.push({ fd: redirNext === "<" ? 0 : redirNext === "2>" ? 2 : 1, to: t.exp[0], mode: redirNext }); redirNext = null; }
      else cmd.args.push(...t.exp);
    });
    endPipe(null); return lists;
  }
  LW.register("bashflow", function (root) {
    const inp = LW.h("input", { class: "cx-in", type: "text", spellcheck: "false", value: PRESETS[0], "aria-label": "A command line" });
    root.append(inp);
    const pr = LW.h("div", { class: "cx-ex" }, LW.h("span", { text: "Examples: " })); PRESETS.forEach(p => pr.append(LW.h("button", { type: "button", text: p, onclick: () => { inp.value = p; draw(); } }))); root.append(pr);
    const out = LW.h("div", { class: "bf-out" }); root.append(out);
    LW.note(root, `Simulated environment: you are <code>student</code> in <code>~/project</code>, which holds ${FILES.map(f => `<code>${f}</code>`).join(" ")}; <code>$T</code> is 320.`);
    inp.addEventListener("input", draw);
    function draw() {
      const toks = tokenize(inp.value); toks.forEach(t => { const e = expand(t); t.exp = e.out; t.notes = e.notes; });
      const lists = plan(toks);
      const notes = toks.flatMap(t => t.notes.map(n => `<li><code>${LW.esc(t.v)}</code> ${LW.esc(n)}</li>`));
      const procs = lists.map((L, li) => {
        const boxes = L.pipe.map((c, ci) => {
          const red = c.redir.map(r => `<span class="bf-fd">${r.fd === 0 ? "stdin ←" : r.fd === 1 ? "stdout →" : "stderr →"} ${LW.esc(r.to)}${r.mode === ">>" ? " (append)" : ""}</span>`).join("");
          const prog = c.args[0] || "?", builtin = ["cd", "echo", "export", "source", "exit"].includes(prog);
          return `<div class="bf-proc"><small>${builtin ? "shell built-in (no new process)" : "process " + (li * 10 + ci + 1) + ": fork + exec " + LW.esc(prog.includes("/") ? prog : "/usr/bin/" + prog)}</small><b>${c.args.map(a => LW.esc(a)).join(" ")}</b>${red}</div>${ci < L.pipe.length - 1 ? '<div class="bf-pipe" title="pipe: stdout of the left process feeds stdin of the right">│ pipe ▶</div>' : ""}`;
        }).join("");
        const sepTxt = L.sep === "&&" ? "&& run the next list only if this one succeeds (exit status 0)" : L.sep === "||" ? "|| run the next list only if this one fails" : L.sep === ";" ? "; then run the next list regardless" : L.sep === "&" ? "& run in the background; the prompt returns at once" : "";
        return `<div class="bf-list"><div class="bf-procs">${boxes}</div>${sepTxt ? `<p class="bf-sep">${LW.esc(sepTxt)}</p>` : ""}</div>`;
      }).join("");
      out.innerHTML = `
        <div class="bf-stage"><span class="bf-n">1</span><div><h5>Split into tokens</h5><p class="bf-toks">${toks.map(t => `<span class="bf-t bf-${t.kind}" title="${t.kind === "op" ? "operator" : t.kind === "sq" ? "single-quoted word" : t.kind === "dq" ? "double-quoted word" : "word"}">${LW.esc(t.v)}</span>`).join("")}</p></div></div>
        <div class="bf-stage"><span class="bf-n">2</span><div><h5>Expand</h5>${notes.length ? `<ul class="bf-notes">${notes.join("")}</ul>` : "<p class=\"lw-note\">Nothing to expand: no ~, $, $( ) or wildcards.</p>"}<p class="bf-toks">${toks.flatMap(t => t.kind === "op" ? [`<span class="bf-t bf-op">${LW.esc(t.v)}</span>`] : t.exp.map(x => `<span class="bf-t bf-word">${LW.esc(x)}</span>`)).join("")}</p></div></div>
        <div class="bf-stage"><span class="bf-n">3</span><div><h5>Set up redirections and pipes, start the processes</h5>${procs}</div></div>
        <div class="bf-stage"><span class="bf-n">4</span><div><h5>Wait and collect the exit status</h5><p class="lw-note">Each process ends with an exit status: 0 means success, anything else failure. bash stores the last one in <code>$?</code>, which is what <code>&&</code> and <code>||</code> test.</p></div></div>`;
    }
    draw();
  });
})();
