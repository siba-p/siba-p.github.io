/* 1.1 The Linux shell: a small terminal with a virtual file system of a simulation project,
   pipes, redirection, globs, tab completion and guided missions. Nothing touches your computer. */
(function () {
  "use strict";
  const HOME = "/home/student";
  function energyXvg(T, seed) {
    const r = LW.rng(seed); let s = `# This file was created by gmx energy\n# Command line:\n#   gmx energy -f md.edr -o energy.xvg\n@    title "GROMACS Energies"\n@    xaxis  label "Time (ps)"\n@    yaxis  label "(kJ/mol)"\n@TYPE xy\n@ s0 legend "Potential"\n`;
    const base = -412000 + (T - 300) * 410;
    for (let i = 0; i < 20; i++) s += `${(i * 50).toFixed(1).padStart(10)}  ${(base + 380 * r.normal()).toFixed(3).padStart(14)}\n`;
    return s;
  }
  const mdlog = (T, ok) => `                 :-) GROMACS - gmx mdrun, 2023.3 (-:\n\nCommand line:\n  gmx mdrun -deffnm md\n\nUsing 1 MPI thread\nUsing 8 OpenMP threads\n\nStarted mdrun on rank 0\n           Step           Time\n              0        0.00000\n\n   Energies (kJ/mol)\n          Angle    Proper Dih.          LJ-14     Coulomb-14        LJ (SR)\n    2.31842e+04    1.20581e+04    4.11027e+03    5.70413e+04    6.21730e+04\n   Coulomb (SR)   Coul. recip.      Potential    Kinetic En.   Total Energy\n   -6.13042e+05    2.98071e+03   -4.12001e+05    7.45210e+04   -3.37480e+05\n    Temperature Pressure (bar)\n    ${T.toFixed(5).padStart(11)}    1.24300e+00\n` +
    (ok ? `\n           Step           Time\n         500000     1000.00000\n\n   Energies (kJ/mol)\n      Potential    Kinetic En.   Total Energy    Temperature\n   ${(-412000 + (T - 300) * 410).toExponential(5).replace("e+", "e+0").padStart(12)}    ${(74521 * T / 300).toExponential(5).replace("e+", "e+0")}   -3.37412e+05    ${T.toFixed(5)}\n\n               Core t (s)   Wall t (s)        (%)\n       Time:    28800.112     3600.014      800.0\n                 (ns/day)    (hour/ns)\nPerformance:       24.000        1.000\n\nFinished mdrun on rank 0\n`
      : `\nStep 31250, time 62.5 (ps)  LINCS WARNING\nrelative constraint deviation after LINCS:\nrms 0.084312, max 1.732049 (between atoms 1201 and 1202)\n\n-------------------------------------------------------\nProgram:     gmx mdrun, version 2023.3\n\nFatal error:\nToo many LINCS warnings (1000)\nIf you know what you are doing you can adjust the lincs warning threshold\nin your mdp file, but normally it is better to fix the problem\n-------------------------------------------------------\n`);
  function makeFS() {
    const F = (text) => ({ t: "f", text }), Dd = (kids) => ({ t: "d", kids });
    return Dd({ home: Dd({ student: Dd({
      "notes.txt": F("Group meeting Thursday 10:00.\nBack up runs/ to the cluster every Friday.\nAsk about the T340 crash.\n"),
      project: Dd({
        "README.md": F("# Crowded amino-acid solution, three temperatures\n\ninput/    GROMACS input files\nruns/     one directory per temperature\nscripts/  analysis and job scripts\n"),
        input: Dd({
          "md.mdp": F("; production run\nintegrator      = md\ndt              = 0.002     ; ps\nnsteps          = 500000    ; 1 ns\nnstxout-compressed = 5000\ncutoff-scheme   = Verlet\nrcoulomb        = 1.2\nrvdw            = 1.2\ncoulombtype     = PME\ntcoupl          = V-rescale\ntc-grps         = System\ntau_t           = 0.1\nref_t           = 300\npcoupl          = C-rescale\ntau_p           = 2.0\nref_p           = 1.0\nconstraints     = h-bonds\n"),
          "topol.top": F("#include \"charmm36.ff/forcefield.itp\"\n#include \"charmm36.ff/tip3p.itp\"\n\n[ system ]\nGlycine in water\n\n[ molecules ]\nGLY     200\nSOL     4800\n"),
          "conf.gro": F("Glycine in water\n 15200\n    1GLY      N    1   0.126   1.635   2.102\n    1GLY     H1    2   0.211   1.681   2.131\n    1GLY     H2    3   0.059   1.704   2.073\n    1GLY     H3    4   0.090   1.583   2.183\n    1GLY     CA    5   0.172   1.539   1.998\n   5.48750   5.48750   5.48750\n")
        }),
        runs: Dd({
          T300: Dd({ "md.log": F(mdlog(300, true)), "energy.xvg": F(energyXvg(300, 1)) }),
          T320: Dd({ "md.log": F(mdlog(320, true)), "energy.xvg": F(energyXvg(320, 2)) }),
          T340: Dd({ "md.log": F(mdlog(340, false)), "energy.xvg": F(energyXvg(340, 3)) })
        }),
        scripts: Dd({
          "analyse.py": F("import numpy as np\n\ndata = np.loadtxt('energy.xvg', comments=['#', '@'])\nprint('mean potential:', data[:, 1].mean())\n"),
          "submit.sh": F("#!/bin/bash\n#SBATCH --job-name=md-T300\n#SBATCH --nodes=1\n#SBATCH --ntasks-per-node=8\n#SBATCH --time=24:00:00\n\nmodule load gromacs/2023.3\ngmx mdrun -deffnm md\n")
        })
      })
    }) }) });
  }
  const HELP = {
    pwd: "print the working directory", ls: "list files  (-l long, -a hidden, -h sizes)", cd: "change directory  (cd .., cd ~, cd -)", cat: "print files", head: "first lines (-n N)", tail: "last lines (-n N)",
    wc: "count lines/words/bytes (-l -w -c)", grep: "search text (-i -n -c -v -l -r -w -E)", find: "find files (find . -name '*.py' -type f)", mkdir: "make directories (-p)", touch: "create empty file", cp: "copy (-r for directories)",
    mv: "move or rename", rm: "remove (-r for directories)", echo: "print text (use > file to write)", sort: "sort lines (-n -r -k N -t SEP)", uniq: "collapse repeats (-c counts)", cut: "select columns (-d SEP -f N)",
    awk: "column tool: awk '{print $2}', awk '!/^#/ {print $1, $2}', awk 'NR>8'", tree: "show a directory tree", history: "show previous commands", clear: "clear the screen", whoami: "print your user name", date: "print the date"
  };
  LW.register("terminal", function (root) {
    let fs = makeFS(), cwd = HOME + "/project", prev = cwd, hist = [], hi = 0;
    const wrap = LW.h("div", { class: "term-wrap" }); root.append(wrap);
    const term = LW.h("div", { class: "term", role: "log", "aria-live": "polite" });
    const side = LW.h("div", { class: "term-side" });
    wrap.append(term, side);
    const out = LW.h("div", { class: "term-out" }), line = LW.h("div", { class: "term-line" }), prompt = LW.h("span", { class: "term-prompt" }), inp = LW.h("input", { class: "term-in", type: "text", spellcheck: "false", autocapitalize: "off", autocomplete: "off", "aria-label": "Shell command" });
    line.append(prompt, inp); term.append(out, line);
    term.addEventListener("click", () => inp.focus({ preventScroll: true }));
    /* ---------- file system helpers ---------- */
    const norm = p => { const parts = []; (p.startsWith("/") ? p : cwd + "/" + p).split("/").forEach(s => { if (!s || s === ".") return; if (s === "..") parts.pop(); else parts.push(s); }); return "/" + parts.join("/"); };
    const expandHome = p => (p === "~" ? HOME : p.startsWith("~/") ? HOME + p.slice(1) : p);
    const node = p => { let n = fs; for (const s of norm(p).split("/").filter(Boolean)) { if (!n || n.t !== "d" || !(s in n.kids)) return null; n = n.kids[s]; } return n; };
    const parentOf = p => { const a = norm(p); const i = a.lastIndexOf("/"); return { dir: node(a.slice(0, i) || "/"), name: a.slice(i + 1), path: a }; };
    const disp = p => (p === HOME ? "~" : p.startsWith(HOME + "/") ? "~" + p.slice(HOME.length) : p);
    const setPrompt = () => { prompt.innerHTML = `<b>student@lab</b>:<i>${LW.esc(disp(cwd))}</i>$ `; };
    const globRe = g => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
    function expandGlob(arg) {
      if (!/[*?]/.test(arg)) return [arg];
      const abs = arg.startsWith("/"), parts = arg.split("/").filter((s, i) => s || i === 0);
      let paths = [abs ? "" : null];
      parts.forEach((seg, k) => {
        if (k === 0 && abs && seg === "") return;
        const next = [];
        paths.forEach(base => {
          const basePath = base === null ? cwd : base || "/";
          if (/[*?]/.test(seg)) { const d = node(basePath); if (d && d.t === "d") Object.keys(d.kids).sort().filter(n => !n.startsWith(".") && globRe(seg).test(n)).forEach(n => next.push(base === null ? n : base + "/" + n)); }
          else next.push(base === null ? seg : base + "/" + seg);
        });
        paths = next;
      });
      const res = paths.filter(p => p !== null && node(p));
      return res.length ? res : [arg];
    }
    /* ---------- tokenizer: quotes, pipes, redirects, && and ; ---------- */
    function tokenize(s) {
      const toks = []; let cur = "", q = null, has = false;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (q) { if (c === q) q = null; else cur += c; continue; }
        if (c === "'" || c === '"') { q = c; has = true; continue; }
        if (c === " " || c === "\t") { if (cur || has) toks.push({ v: cur, q: has }); cur = ""; has = false; continue; }
        if (c === "|" || c === ";" || c === ">" || c === "&") {
          if (cur || has) toks.push({ v: cur, q: has }); cur = ""; has = false;
          if (c === ">" && s[i + 1] === ">") { toks.push({ op: ">>" }); i++; } else if (c === "&" && s[i + 1] === "&") { toks.push({ op: "&&" }); i++; } else toks.push({ op: c });
          continue;
        }
        cur += c;
      }
      if (q) throw new Error("unterminated quote");
      if (cur || has) toks.push({ v: cur, q: has });
      return toks;
    }
    function parse(s) { // → list of {pipeline: [[args]], redirect, append, sep}
      const toks = tokenize(s), seqs = []; let pipe = [[]], redir = null, append = false, expectFile = false;
      const flush = sep => { if (pipe.some(a => a.length)) seqs.push({ pipe, redir, append, sep }); pipe = [[]]; redir = null; append = false; };
      for (const t of toks) {
        if (t.op === "|") pipe.push([]);
        else if (t.op === ">" || t.op === ">>") { expectFile = true; append = t.op === ">>"; }
        else if (t.op === ";" || t.op === "&&") flush(t.op);
        else if (t.op === "&") throw new Error("background jobs (&) are not available here");
        else if (expectFile) { redir = t.v; expectFile = false; }
        else { const v = t.q ? [t.v] : expandGlob(expandHome(t.v.replace(/\$HOME/g, HOME))); pipe[pipe.length - 1].push(...v); }
      }
      if (expectFile) throw new Error("syntax error: missing file name after >");
      flush(null); return seqs;
    }
    /* ---------- commands ---------- */
    const flagsOf = (args, takes = "") => { const fl = {}, rest = []; for (let i = 0; i < args.length; i++) { const a = args[i]; if (/^-\d+$/.test(a)) { fl.n = a.slice(1); continue; } if (a.startsWith("-") && a.length > 1 && !/^-?\d/.test(a.slice(1))) { if (a.startsWith("--")) { fl[a.slice(2)] = true; continue; } for (let k = 1; k < a.length; k++) { const c = a[k]; if (takes.includes(c)) { fl[c] = a.slice(k + 1) || args[++i]; break; } fl[c] = true; } } else rest.push(a); } return { fl, rest }; };
    const readFile = p => { const n = node(p); if (!n) throw new Error(`${p}: No such file or directory`); if (n.t === "d") throw new Error(`${p}: Is a directory`); return n.text; };
    const inputOf = (files, stdin, name) => (files.length ? files.map(readFile).join("") : stdin != null ? stdin : (() => { throw new Error(`${name}: needs a file or piped input`); })());
    const lines = t => { const l = t.split("\n"); if (l[l.length - 1] === "") l.pop(); return l; };
    const join = l => (l.length ? l.join("\n") + "\n" : "");
    const size = n => (n.t === "d" ? 4096 : n.text.length);
    const CMD = {
      pwd: () => cwd + "\n",
      whoami: () => "student\n",
      date: () => new Date().toString().slice(0, 24) + "\n",
      echo: a => a.join(" ") + "\n",
      clear: () => { out.innerHTML = ""; return ""; },
      history: () => hist.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join("\n") + "\n",
      help: () => "Commands available in this practice shell:\n" + Object.keys(HELP).map(k => `  ${k.padEnd(8)} ${HELP[k]}`).join("\n") + "\nPipes (|), redirects (> and >>), && and ; work. Use Tab to complete names and ↑ for history.\n",
      man: a => (a[0] && HELP[a[0]] ? `${a[0]}: ${HELP[a[0]]}\n(On a real system, 'man ${a[0]}' opens the full manual; press q to quit it.)\n` : "What manual page do you want?\n"),
      cd: a => { let t = a[0] === undefined ? HOME : a[0] === "-" ? prev : a[0]; const p = norm(t), n = node(p); if (!n) throw new Error(`cd: ${a[0]}: No such file or directory`); if (n.t !== "d") throw new Error(`cd: ${a[0]}: Not a directory`); prev = cwd; cwd = p; return ""; },
      ls: a => {
        const { fl, rest } = flagsOf(a), targets = rest.length ? rest : ["."]; let o = "";
        targets.forEach((t, ti) => {
          const n = node(t); if (!n) throw new Error(`ls: cannot access '${t}': No such file or directory`);
          const entries = n.t === "d" ? Object.keys(n.kids).sort().filter(k => fl.a || !k.startsWith(".")).map(k => [k, n.kids[k]]) : [[t, n]];
          if (fl.a && n.t === "d") entries.unshift([".", n], ["..", n]);
          if (targets.length > 1 && n.t === "d") o += (ti ? "\n" : "") + t + ":\n";
          if (fl.l) { if (n.t === "d") o += `total ${entries.length * 4}\n`; entries.forEach(([k, e]) => { const sz = size(e); o += `${e.t === "d" ? "drwxr-xr-x" : k.endsWith(".sh") ? "-rwxr-xr-x" : "-rw-r--r--"} 1 student lab ${(fl.h ? (sz >= 1024 ? (sz / 1024).toFixed(1) + "K" : String(sz)) : String(sz)).padStart(6)} Oct 14 09:30 ${k}${e.t === "d" ? "/" : ""}\n`; }); }
          else o += entries.map(([k, e]) => k + (e.t === "d" ? "/" : "")).join("  ") + "\n";
        });
        return o;
      },
      cat: (a, stdin) => inputOf(a.filter(x => !x.startsWith("-")), stdin, "cat"),
      less: (a, stdin) => inputOf(a, stdin, "less") + "(less shows files one screen at a time on a real system; press q to quit.)\n",
      head: (a, stdin) => { const { fl, rest } = flagsOf(a, "n"); return join(lines(inputOf(rest, stdin, "head")).slice(0, +(fl.n || 10))); },
      tail: (a, stdin) => { const { fl, rest } = flagsOf(a, "n"); const n = String(fl.n || 10); const l = lines(inputOf(rest, stdin, "tail")); return join(n.startsWith("+") ? l.slice(+n.slice(1) - 1) : l.slice(-(+n))); },
      wc: (a, stdin) => {
        const { fl, rest } = flagsOf(a), one = (t, name) => { const L = lines(t).length, Wd = t.split(/\s+/).filter(Boolean).length, B = t.length; const v = fl.l ? [L] : fl.w ? [Wd] : fl.c ? [B] : [L, Wd, B]; return v.map(x => String(x).padStart(fl.l || fl.w || fl.c ? 1 : 7)).join(" ") + (name ? " " + name : ""); };
        return rest.length ? rest.map(f => one(readFile(f), f)).join("\n") + "\n" : one(inputOf([], stdin, "wc")) + "\n";
      },
      grep: (a, stdin) => {
        const { fl, rest } = flagsOf(a, "e"); let pat = fl.e || rest.shift(); if (pat === undefined) throw new Error("usage: grep [options] PATTERN [FILE...]");
        let src = fl.F ? pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : fl.E ? pat : pat.replace(/\\\|/g, "\u0000").replace(/\|/g, "\\|").replace(/\u0000/g, "|").replace(/\\\(/g, "(").replace(/\\\)/g, ")");
        if (fl.w) src = "\\b(?:" + src + ")\\b";
        let re; try { re = new RegExp(src, fl.i ? "i" : ""); } catch (e) { throw new Error("grep: invalid pattern"); }
        let files = rest;
        if (fl.r || fl.R) { const all = []; const walk = (p, n) => { if (n.t === "f") all.push(p); else Object.keys(n.kids).sort().forEach(k => walk(p === "/" ? "/" + k : p + "/" + k, n.kids[k])); }; (files.length ? files : ["."]).forEach(f => { const n = node(f); if (!n) throw new Error(`grep: ${f}: No such file or directory`); walk(f.replace(/\/$/, ""), n); }); files = all; }
        const multi = files.length > 1 || fl.r; let o = "";
        const run = (text, name) => { const L = lines(text), hits = []; L.forEach((l, i) => { if (re.test(l) !== !!fl.v) hits.push([i + 1, l]); });
          if (fl.l) { if (hits.length) o += name + "\n"; return; } if (fl.c) { o += (multi ? name + ":" : "") + hits.length + "\n"; return; }
          hits.forEach(([k, l]) => { o += (multi ? name + ":" : "") + (fl.n ? k + ":" : "") + l + "\n"; }); };
        if (files.length) files.forEach(f => { const n = node(f); if (!n) { o += `grep: ${f}: No such file or directory\n`; return; } if (n.t === "d") { o += `grep: ${f}: Is a directory\n`; return; } run(n.text, f); });
        else run(inputOf([], stdin, "grep"), "(standard input)");
        return o;
      },
      sort: (a, stdin) => { const { fl, rest } = flagsOf(a, "kt"); let l = lines(inputOf(rest, stdin, "sort")); const key = s => { if (!fl.k) return s; const f = fl.t ? s.split(fl.t) : s.trim().split(/\s+/); return f[+String(fl.k).split(",")[0] - 1] || ""; };
        l.sort((x, y) => (fl.n ? (parseFloat(key(x)) || 0) - (parseFloat(key(y)) || 0) : key(x) < key(y) ? -1 : key(x) > key(y) ? 1 : 0)); if (fl.r) l.reverse(); return join(l); },
      uniq: (a, stdin) => { const { fl, rest } = flagsOf(a); const l = lines(inputOf(rest, stdin, "uniq")), o = []; l.forEach(x => { if (o.length && o[o.length - 1][1] === x) o[o.length - 1][0]++; else o.push([1, x]); }); return join(o.map(([c, x]) => (fl.c ? String(c).padStart(7) + " " : "") + x)); },
      cut: (a, stdin) => { const { fl, rest } = flagsOf(a, "df"); if (!fl.f) throw new Error("cut: you must specify a list of fields with -f"); const d = fl.d || "\t", idx = String(fl.f).split(",").map(Number); return join(lines(inputOf(rest, stdin, "cut")).map(l => { const f = l.split(d); return idx.map(i => f[i - 1] ?? "").join(d); })); },
      tr: (a, stdin) => { const t = inputOf([], stdin, "tr"); if (a[0] === "-d") return t.split(a[1] || "").join(""); return t.split(a[0] || "").join(a[1] || ""); },
      awk: (a, stdin) => {
        const prog = a[0] || "", files = a.slice(1); const m = prog.match(/^\s*(?:(!?)\/(.*)\/|NR\s*([<>]=?|==)\s*(\d+)|\$(\d+)\s*([<>]=?|==)\s*(-?[\d.e+]+))?\s*(?:\{\s*print\s*(.*?)\s*;?\s*\})?\s*$/);
        if (!m || (!m[8] && m[8] !== "" && !m[2] && !m[3] && !m[5])) throw new Error("awk: this practice shell understands patterns like  /re/ {print $1, $2},  !/^#/ {print $2},  NR>5,  $2 > 0 {print $1}");
        const re = m[2] !== undefined ? new RegExp(m[2]) : null, neg = m[1] === "!";
        const cmp = (x, op, y) => (op === ">" ? x > y : op === "<" ? x < y : op === ">=" ? x >= y : op === "<=" ? x <= y : x === y);
        const L = lines(inputOf(files, stdin, "awk")), o = [];
        L.forEach((l, i) => { const f = l.trim().split(/\s+/);
          if (re && re.test(l) === neg) return; if (m[3] && !cmp(i + 1, m[3], +m[4])) return; if (m[5] && !cmp(parseFloat(f[+m[5] - 1]), m[6], +m[7])) return;
          if (!m[8]) { o.push(l); return; }
          o.push(m[8].split(/\s*,\s*/).map(e => (e === "$0" ? l : /^\$\d+$/.test(e) ? f[+e.slice(1) - 1] ?? "" : e === "NR" ? String(i + 1) : e === "NF" ? String(f.length) : e.replace(/^"|"$/g, ""))).join(" ")); });
        return join(o);
      },
      mkdir: a => { const { fl, rest } = flagsOf(a); if (!rest.length) throw new Error("mkdir: missing operand"); rest.forEach(p => { const parts = norm(p).split("/").filter(Boolean); let n = fs; parts.forEach((s, i) => { if (!(s in n.kids)) { if (i < parts.length - 1 && !fl.p) throw new Error(`mkdir: cannot create directory '${p}': No such file or directory`); n.kids[s] = { t: "d", kids: {} }; } else if (i === parts.length - 1 && !fl.p) throw new Error(`mkdir: cannot create directory '${p}': File exists`); n = n.kids[s]; if (n.t !== "d") throw new Error(`mkdir: '${p}': Not a directory`); }); }); return ""; },
      touch: a => { a.forEach(p => { const { dir, name } = parentOf(p); if (!dir || dir.t !== "d") throw new Error(`touch: cannot touch '${p}': No such file or directory`); if (!dir.kids[name]) dir.kids[name] = { t: "f", text: "" }; }); return ""; },
      rm: a => { const { fl, rest } = flagsOf(a); if (!rest.length) throw new Error("rm: missing operand"); rest.forEach(p => { const { dir, name } = parentOf(p), n = dir && dir.kids[name]; if (!n) { if (!fl.f) throw new Error(`rm: cannot remove '${p}': No such file or directory`); return; } if (n.t === "d" && !fl.r && !fl.R) throw new Error(`rm: cannot remove '${p}': Is a directory (use rm -r)`); delete dir.kids[name]; }); return ""; },
      cp: a => { const { fl, rest } = flagsOf(a); if (rest.length < 2) throw new Error("cp: missing destination"); const dst = rest.pop(); rest.forEach(src => { const n = node(src); if (!n) throw new Error(`cp: cannot stat '${src}': No such file or directory`); if (n.t === "d" && !fl.r && !fl.R) throw new Error(`cp: -r not specified; omitting directory '${src}'`); const copy = JSON.parse(JSON.stringify(n)); const d = node(dst); if (d && d.t === "d") d.kids[norm(src).split("/").pop()] = copy; else { const { dir, name } = parentOf(dst); if (!dir) throw new Error(`cp: cannot create '${dst}': No such file or directory`); dir.kids[name] = copy; } }); return ""; },
      mv: a => { if (a.length < 2) throw new Error("mv: missing destination"); const dst = a.pop(); a.forEach(src => { const s = parentOf(src), n = s.dir && s.dir.kids[s.name]; if (!n) throw new Error(`mv: cannot stat '${src}': No such file or directory`); const d = node(dst); delete s.dir.kids[s.name]; if (d && d.t === "d") d.kids[s.name] = n; else { const { dir, name } = parentOf(dst); if (!dir) throw new Error(`mv: cannot move to '${dst}'`); dir.kids[name] = n; } }); return ""; },
      find: a => { let start = "."; const args = a.slice(); if (args.length && !args[0].startsWith("-")) start = args.shift(); let name = null, type = null; for (let i = 0; i < args.length; i++) { if (args[i] === "-name" || args[i] === "-iname") name = globRe(args[++i] || "*"); else if (args[i] === "-type") type = args[++i]; }
        const n = node(start); if (!n) throw new Error(`find: '${start}': No such file or directory`); const o = []; const walk = (p, x) => { const base = p.split("/").pop(); if ((!name || name.test(base)) && (!type || (type === "f" ? x.t === "f" : x.t === "d"))) o.push(p); if (x.t === "d") Object.keys(x.kids).sort().forEach(k => walk(p + "/" + k, x.kids[k])); }; walk(start.replace(/\/$/, ""), n); return join(o); },
      tree: a => { const start = a[0] || ".", n = node(start); if (!n) throw new Error(`tree: ${start}: no such directory`); let o = start + "\n", nd = 0, nf = 0; const walk = (x, pre) => { const ks = Object.keys(x.kids).sort(); ks.forEach((k, i) => { const last = i === ks.length - 1, c = x.kids[k]; o += pre + (last ? "└── " : "├── ") + k + "\n"; if (c.t === "d") { nd++; walk(c, pre + (last ? "    " : "│   ")); } else nf++; }); }; walk(n, ""); return o + `\n${nd} directories, ${nf} files\n`; },
      which: a => a.map(c => (CMD[c] ? "/usr/bin/" + c : `${c} not found`)).join("\n") + "\n",
      nano: () => { throw new Error("editors are not available in this practice shell. Write a file with  echo \"text\" > file  or  echo \"more\" >> file"); },
      python: () => { throw new Error("Python is not installed in this practice shell; the Python lesson runs real Python in the page."); }
    };
    CMD.vim = CMD.vi = CMD.nano; CMD.python3 = CMD.python; CMD.ll = a => CMD.ls(["-l", ...a]);
    /* ---------- run a line ---------- */
    let last = { line: "", out: "", cmds: [] };
    function exec(lineStr) {
      let seqs; try { seqs = parse(lineStr); } catch (e) { return { text: e.message + "\n", err: true }; }
      let text = "", err = false, ok = true; const cmds = [];
      for (let si = 0; si < seqs.length; si++) {
        const sq = seqs[si];
        if (si > 0 && seqs[si - 1].sep === "&&" && !ok) continue;
        try {
          let data = null;
          sq.pipe.forEach(args => { if (!args.length) throw new Error("syntax error near |"); const [c, ...rest] = args; cmds.push([c, rest]); if (!CMD[c]) throw new Error(`${c}: command not found (type help for the list)`); data = CMD[c](rest, data); });
          if (sq.redir) { const { dir, name } = parentOf(sq.redir); if (!dir || dir.t !== "d") throw new Error(`${sq.redir}: No such file or directory`); const ex = dir.kids[name]; if (ex && ex.t === "d") throw new Error(`${sq.redir}: Is a directory`); dir.kids[name] = { t: "f", text: (sq.append && ex ? ex.text : "") + (data || "") }; }
          else text += data || "";
          ok = true;
        } catch (e) { text += e.message + "\n"; err = true; ok = false; }
      }
      return { text, err, cmds };
    }
    function print(html, cls) { const d = LW.h("div", { class: "term-o" + (cls ? " " + cls : ""), html }); out.append(d); term.scrollTop = term.scrollHeight; }
    function submit(s) {
      print(prompt.innerHTML + LW.esc(s), "echo");
      if (s.trim()) { hist.push(s); hi = hist.length; }
      const r = s.trim() ? exec(s) : { text: "", cmds: [] };
      if (r.text) print(LW.esc(r.text.replace(/\n$/, "")), r.err ? "err" : "");
      last = { line: s, out: r.text, cmds: r.cmds || [] };
      setPrompt(); check();
    }
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); const v = inp.value; inp.value = ""; submit(v); }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (hi > 0) { hi--; inp.value = hist[hi]; } }
      else if (e.key === "ArrowDown") { e.preventDefault(); if (hi < hist.length - 1) { hi++; inp.value = hist[hi]; } else { hi = hist.length; inp.value = ""; } }
      else if (e.key === "Tab") { e.preventDefault(); complete(); }
      else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); out.innerHTML = ""; }
      else if (e.key === "c" && e.ctrlKey) { e.preventDefault(); print(prompt.innerHTML + LW.esc(inp.value) + "^C", "echo"); inp.value = ""; }
    });
    function complete() {
      const v = inp.value, m = v.match(/(\S*)$/), word = m[1], start = v.length - word.length;
      if (start === 0 || /[|;&]\s*$/.test(v.slice(0, start))) { const c = Object.keys(CMD).filter(k => k.startsWith(word)); if (c.length === 1) inp.value = v.slice(0, start) + c[0] + " "; else if (c.length) print(c.join("  ")); return; }
      const w = expandHome(word), slash = w.lastIndexOf("/"), dirPart = slash >= 0 ? w.slice(0, slash + 1) : "", base = slash >= 0 ? w.slice(slash + 1) : w;
      const d = node(dirPart || "."); if (!d || d.t !== "d") return;
      const c = Object.keys(d.kids).filter(k => k.startsWith(base) && (base.startsWith(".") || !k.startsWith("."))).sort();
      if (c.length === 1) { const n = d.kids[c[0]]; inp.value = v.slice(0, start) + word.slice(0, word.length - base.length) + c[0] + (n.t === "d" ? "/" : " "); }
      else if (c.length > 1) { let p = c[0]; c.forEach(x => { while (!x.startsWith(p)) p = p.slice(0, -1); }); if (p.length > base.length) inp.value = v.slice(0, start) + word.slice(0, word.length - base.length) + p; else print(c.map(x => x + (d.kids[x].t === "d" ? "/" : "")).join("  ")); }
    }
    /* ---------- missions ---------- */
    const ran = (name, pred) => last.cmds.some(([c, a]) => c === name && (!pred || pred(a)));
    const MISSIONS = [
      { t: "Where am I?", d: "Print the directory you are in.", hint: "pwd", ok: () => ran("pwd") },
      { t: "Look around", d: "List the project with sizes and permissions.", hint: "ls -l", ok: () => ran("ls", a => a.some(x => /^-\w*l/.test(x))) },
      { t: "Read the run settings", d: "Print the GROMACS parameter file input/md.mdp.", hint: "cat input/md.mdp", ok: () => /nsteps\s+=/.test(last.out) && /integrator/.test(last.out) },
      { t: "How long was the run?", d: "Show only the lines of md.mdp that contain nsteps or dt.", hint: "grep -E 'nsteps|dt' input/md.mdp", ok: () => ran("grep") && /nsteps/.test(last.out) && /\bdt\b/.test(last.out) && !/integrator/.test(last.out) },
      { t: "Which run crashed?", d: "Search every md.log under runs/ for “Fatal error”, printing just the file names.", hint: "grep -l 'Fatal error' runs/*/md.log", ok: () => ran("grep") && /T340/.test(last.out) && !/T300/.test(last.out) },
      { t: "Read the end of a log", d: "Show the last 6 lines of the T300 log to check it finished.", hint: "tail -n 6 runs/T300/md.log", ok: () => ran("tail") && /Finished mdrun/.test(last.out) },
      { t: "Count the data", d: "Count the lines of runs/T300/energy.xvg that are data, not # or @ headers.", hint: "grep -v '^[#@]' runs/T300/energy.xvg | wc -l", ok: () => last.out.trim() === "20" },
      { t: "Extract a column to a file", d: "Make a directory analysis/ and write the potential-energy column (column 2) of the T300 data into analysis/pot.dat.", hint: "mkdir -p analysis && awk '!/^[#@]/ {print $2}' runs/T300/energy.xvg > analysis/pot.dat",
        ok: () => { const n = node(HOME + "/project/analysis/pot.dat"); return !!n && n.t === "f" && lines(n.text).length === 20 && lines(n.text).every(l => isFinite(parseFloat(l)) && l.trim().split(/\s+/).length === 1); } },
      { t: "Back up the inputs", d: "Copy the whole input/ directory to input_backup/.", hint: "cp -r input input_backup", ok: () => !!node(HOME + "/project/input_backup/md.mdp") },
      { t: "Find the scripts", d: "Find every Python file anywhere below the project.", hint: "find . -name '*.py'", ok: () => ran("find") && /analyse\.py/.test(last.out) }
    ];
    const done = new Set();
    side.innerHTML = `<p class="term-st">Missions <span></span></p>`;
    const list = LW.h("ol", { class: "term-ms" }); side.append(list);
    MISSIONS.forEach((m, i) => {
      const li = LW.h("li", {}, LW.h("b", { text: m.t }), LW.h("span", { text: m.d }));
      const hb = LW.h("button", { type: "button", class: "term-hint", text: "Show a solution" });
      hb.addEventListener("click", () => { hb.replaceWith(LW.h("code", { text: m.hint, title: "Click to paste into the terminal", onclick: () => { inp.value = m.hint; inp.focus(); } })); });
      li.append(hb); list.append(li); m.el = li;
    });
    const cnt = side.querySelector(".term-st span");
    function check() { MISSIONS.forEach((m, i) => { if (!done.has(i)) { let ok = false; try { ok = m.ok(); } catch (e) { ok = false; } if (ok) { done.add(i); m.el.classList.add("done"); } } }); cnt.textContent = `${done.size} / ${MISSIONS.length}`; }
    LW.button(side, "Reset the file system", () => { fs = makeFS(); cwd = HOME + "/project"; out.innerHTML = ""; print("File system restored. Type <b>help</b> for the list of commands.", "info"); setPrompt(); });
    setPrompt(); check();
    print("Welcome to a practice shell. It runs entirely in this page; nothing here can touch your computer.\nType <b>help</b> to list the commands, or start with the missions on the right.", "info");
  });
})();
