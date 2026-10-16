/* Python, from the inside: the compilation pipeline (real CPython in the page via Pyodide), the
   bytecode virtual machine step by step, names and objects in memory (a tracer), list growth and
   a model of a hash table. */
(function () {
  "use strict";
  const H = LW.h, esc = LW.esc;
  const BLUE = "#4c6ef5", TEAL = "#12a594", VIOLET = "#845ef7", GOLD = "#d4a017", ORANGE = "#f08c2e", ROSE = "#e64980";

  /* ---------------- 1. source → tokens → syntax tree → bytecode → result ---------------- */
  const PIPE_PY = `
import tokenize, io, ast, dis, json, contextlib
def _lw_pipeline(src):
    toks = []
    for t in tokenize.generate_tokens(io.StringIO(src).readline):
        toks.append([tokenize.tok_name[t.type], t.string, t.start[0]])
    tree = ast.parse(src)
    count = [0]
    def node(n):
        count[0] += 1
        kids, attrs = [], []
        for f, v in ast.iter_fields(n):
            if isinstance(v, list):
                if v and isinstance(v[0], ast.AST): kids.append([f, [node(x) for x in v]])
                elif v: attrs.append([f, repr(v)])
            elif isinstance(v, ast.AST):
                if f != "ctx": kids.append([f, [node(v)]])
            elif v is not None and f not in ("kind", "type_comment"):
                attrs.append([f, repr(v)])
        ctx = getattr(n, "ctx", None)
        return {"t": type(n).__name__, "a": attrs, "k": kids, "c": type(ctx).__name__ if ctx is not None else ""}
    t = node(tree)
    code = compile(src, "<your code>", "exec")
    def ins(c):
        return [[i.offset, i.opname, i.argrepr if not i.argrepr.startswith("<code object") else "code of " + i.argval.co_name, i.positions.lineno if i.positions else None] for i in dis.get_instructions(c)]
    blocks = [["module", ins(code), len(code.co_code)]]
    stack = [c for c in code.co_consts if hasattr(c, "co_code")]
    while stack:
        c = stack.pop(0)
        blocks.append([c.co_name, ins(c), len(c.co_code)])
        stack += [k for k in c.co_consts if hasattr(k, "co_code")]
    out = io.StringIO()
    err = None
    with contextlib.redirect_stdout(out):
        try:
            exec(code, {"__name__": "__main__"})
        except Exception as e:
            err = type(e).__name__ + ": " + str(e)
    return json.dumps({"tokens": toks, "ast": t, "nodes": count[0], "blocks": blocks, "out": out.getvalue(), "err": err})
`;
  const TOKCOL = { NAME: BLUE, NUMBER: GOLD, OP: ROSE, STRING: TEAL, NEWLINE: null, NL: null, INDENT: null, DEDENT: null, ENDMARKER: null, COMMENT: "#8a94a6", FSTRING_START: TEAL, FSTRING_MIDDLE: TEAL, FSTRING_END: TEAL };
  LW.register("pypipeline", function (root, opts) {
    const src0 = (opts && opts.code) || "x = 3\ny = 2 * (x + 4)\nprint(y)\n";
    const ta = H("textarea", { class: "pp-src", spellcheck: "false", autocapitalize: "off", "aria-label": "Python source code" }); ta.value = src0;
    const grow = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; };
    root.append(ta); setTimeout(grow, 0); ta.addEventListener("input", grow);
    const ctl = LW.controls(root);
    const go = LW.button(ctl, "Compile and run", () => run(), { primary: true });
    const st = H("span", { class: "pp-status" }); ctl.append(st);
    const stages = [["src", "Source text"], ["tok", "Tokens"], ["ast", "Syntax tree"], ["bc", "Bytecode"], ["out", "Result"]];
    const bar = H("ol", { class: "pp-stages" }), panel = H("div", { class: "pp-panel" }); root.append(bar, panel);
    let data = null, cur = "tok";
    const btn = {}; stages.forEach(([k, label], i) => { const b = H("button", { type: "button", "data-k": k, onclick: () => { cur = k; show(); } }, H("b", { html: label }), H("small", { html: "–" })); btn[k] = b; bar.append(H("li", {}, b)); if (i < stages.length - 1) bar.append(H("li", { class: "pp-arrow", "aria-hidden": "true", html: "→" })); });
    panel.innerHTML = "<p class='pp-hint'>Press <b>Compile and run</b>. Python itself (CPython 3.12, compiled to WebAssembly) will tokenise, parse, compile and execute your code inside this page, and every intermediate stage will be shown.</p>";
    async function run() {
      go.disabled = true;
      try {
        const py = await LW.loadPy(s => { st.textContent = s; });
        st.textContent = "Compiling…";
        if (!py._lwPipe) { py.runPython(PIPE_PY); py._lwPipe = true; }
        const f = py.globals.get("_lw_pipeline"); const js = f(ta.value); f.destroy();
        data = JSON.parse(js); st.textContent = data.err ? "Ran with an error" : "Done";
      } catch (e) { const m = String(e.message || e).split("\n").filter(l => l.trim()).slice(-1)[0]; data = { fail: m }; st.textContent = "Could not compile"; }
      go.disabled = false; show();
    }
    function tree(n) {
      const attrs = n.a.map(([k, v]) => `<span class="pp-at">${esc(k)}=<i>${esc(v)}</i></span>`).join(" ");
      const kids = n.k.map(([f, list]) => `<li><span class="pp-f">${esc(f)}</span><ul>${list.map(x => `<li>${tree(x)}</li>`).join("")}</ul></li>`).join("");
      return `<span class="pp-node">${esc(n.t)}</span>${n.c ? `<span class="pp-ctx">${n.c === "Store" ? "store" : n.c === "Load" ? "load" : esc(n.c)}</span>` : ""} ${attrs}${kids ? `<ul>${kids}</ul>` : ""}`;
    }
    function show() {
      Object.entries(btn).forEach(([k, b]) => b.setAttribute("aria-pressed", String(k === cur)));
      if (!data) return;
      if (data.fail) { panel.innerHTML = `<pre class="pp-err">${esc(data.fail)}</pre>`; return; }
      const nIns = data.blocks.reduce((s, b) => s + b[1].length, 0);
      btn.src.querySelector("small").textContent = ta.value.length + " characters"; btn.tok.querySelector("small").textContent = data.tokens.length + " tokens";
      btn.ast.querySelector("small").textContent = data.nodes + " nodes"; btn.bc.querySelector("small").textContent = nIns + " instructions"; btn.out.querySelector("small").textContent = data.err ? "error" : "output";
      if (cur === "src") panel.innerHTML = `<p class="pp-hint">To the computer, your program starts as nothing more than a sequence of characters, each stored as one or more bytes:</p><div class="pp-bytes">${[...new TextEncoder().encode(ta.value.slice(0, 120))].map(b => `<span title="${b === 10 ? "newline" : esc(String.fromCharCode(b))}"><b>${b === 10 ? "↵" : b === 32 ? "␣" : esc(String.fromCharCode(b))}</b><small>${b}</small></span>`).join("")}${ta.value.length > 120 ? "<span>…</span>" : ""}</div>`;
      if (cur === "tok") panel.innerHTML = `<p class="pp-hint">The <b>tokenizer</b> groups characters into words of the language: names, numbers, operators, strings, and the line structure (newlines and indentation).</p><div class="pp-toks">${data.tokens.map(([t, s]) => `<span class="pp-tok" style="${TOKCOL[t] ? `--c:${TOKCOL[t]}` : ""}"><b>${esc(t === "NEWLINE" || t === "NL" ? "↵" : t === "INDENT" ? "⇥" : t === "DEDENT" ? "⇤" : t === "ENDMARKER" ? "end" : s)}</b><small>${esc(t)}</small></span>`).join("")}</div>`;
      if (cur === "ast") panel.innerHTML = `<p class="pp-hint">The <b>parser</b> checks the grammar and builds an abstract syntax tree: the structure of the program, with brackets and spacing gone. Operator precedence is now explicit in the shape of the tree.</p><div class="pp-tree"><ul><li>${tree(data.ast)}</li></ul></div>`;
      if (cur === "bc") panel.innerHTML = `<p class="pp-hint">The <b>compiler</b> walks the tree and emits bytecode: simple instructions for CPython's virtual machine, which manipulates a stack of values. Each function gets its own block of bytecode.</p>${data.blocks.map(([name, ins, nb]) => `<div class="pp-bc"><p><b>${esc(name === "module" ? "the module (top level)" : "function " + name)}</b> · ${nb} bytes</p><table><thead><tr><th>line</th><th>offset</th><th>instruction</th><th>argument</th></tr></thead><tbody>${ins.map(([o, op, arg, ln], i) => `<tr${i && ins[i - 1][3] !== ln ? ' class="nl"' : ""}><td>${ln ?? ""}</td><td>${o}</td><td><code>${op}</code></td><td>${esc(arg)}</td></tr>`).join("")}</tbody></table></div>`).join("")}`;
      if (cur === "out") panel.innerHTML = `<p class="pp-hint">The <b>virtual machine</b> executes the bytecode one instruction at a time. What your program printed:</p><pre class="pp-out">${esc(data.out || "(nothing was printed)")}</pre>${data.err ? `<pre class="pp-err">${esc(data.err)}</pre>` : ""}`;
    }
    show();
  });

  /* ---------------- 2. the bytecode virtual machine, one instruction at a time ---------------- */
  const PROGS = {
    arith: { name: "Arithmetic", src: "x = 3\ny = 2 * (x + 4)",
      code: [[0, "RESUME", "", 0], [2, "LOAD_CONST", 3, 1], [4, "STORE_NAME", "x", 1], [6, "LOAD_CONST", 2, 2], [8, "LOAD_NAME", "x", 2], [10, "LOAD_CONST", 4, 2], [12, "BINARY_OP", "+", 2], [16, "BINARY_OP", "*", 2], [20, "STORE_NAME", "y", 2], [22, "RETURN_CONST", null, 2]] },
    branch: { name: "A decision", src: "t = 300\nif t > 273:\n    state = 'liquid'\nelse:\n    state = 'ice'",
      code: [[0, "RESUME", "", 0], [2, "LOAD_CONST", 300, 1], [4, "STORE_NAME", "t", 1], [6, "LOAD_NAME", "t", 2], [8, "LOAD_CONST", 273, 2], [10, "COMPARE_OP", ">", 2], [14, "POP_JUMP_IF_FALSE", 22, 2], [16, "LOAD_CONST", "'liquid'", 3], [18, "STORE_NAME", "state", 3], [20, "RETURN_CONST", null, 3], [22, "LOAD_CONST", "'ice'", 5], [24, "STORE_NAME", "state", 5], [26, "RETURN_CONST", null, 5]] },
    loop: { name: "A loop", src: "total = 0\nfor k in range(4):\n    total = total + k",
      code: [[0, "RESUME", "", 0], [2, "LOAD_CONST", 0, 1], [4, "STORE_NAME", "total", 1], [6, "PUSH_NULL", "", 2], [8, "LOAD_NAME", "range", 2], [10, "LOAD_CONST", 4, 2], [12, "CALL", 1, 2], [20, "GET_ITER", "", 2], [22, "FOR_ITER", 40, 2], [26, "STORE_NAME", "k", 2], [28, "LOAD_NAME", "total", 3], [30, "LOAD_NAME", "k", 3], [32, "BINARY_OP", "+", 3], [36, "STORE_NAME", "total", 3], [38, "JUMP_BACKWARD", 22, 3], [40, "END_FOR", "", 2], [42, "RETURN_CONST", null, 2]] },
    call: { name: "A function call", src: "def square(a):\n    return a * a\n\nb = square(5)",
      code: [[0, "RESUME", "", 0], [2, "LOAD_CONST", "code:square", 1], [4, "MAKE_FUNCTION", "", 1], [6, "STORE_NAME", "square", 1], [8, "PUSH_NULL", "", 4], [10, "LOAD_NAME", "square", 4], [12, "LOAD_CONST", 5, 4], [14, "CALL", 1, 4], [22, "STORE_NAME", "b", 4], [24, "RETURN_CONST", null, 4]],
      fns: { square: { args: ["a"], code: [[0, "RESUME", "", 1], [2, "LOAD_FAST", "a", 2], [4, "LOAD_FAST", "a", 2], [6, "BINARY_OP", "*", 2], [10, "RETURN_VALUE", "", 2]] } } }
  };
  const show = v => (v === null ? "None" : v === undefined ? "?" : v && v.kind === "null" ? "NULL" : v && v.kind === "iter" ? `range iterator (next: ${v.i < v.items.length ? v.items[v.i] : "done"})` : v && v.kind === "fn" ? `function ${v.name}` : v && v.kind === "code" ? `code of ${v.name}` : v && v.kind === "builtin" ? `built-in ${v.name}` : v && v.kind === "range" ? `range(${v.n})` : v === true ? "True" : v === false ? "False" : typeof v === "string" ? v : String(v));
  LW.register("stackvm", function (root) {
    let key = "arith", frames, done, log, timer = null;
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Program", options: Object.keys(PROGS).map(k => [k, PROGS[k].name]), value: key, onChange: v => { key = v; reset(); } });
    const c2 = LW.controls(root);
    const stepB = LW.button(c2, "Execute one instruction", () => step(), { primary: true });
    const runB = LW.button(c2, "Run", () => { if (timer) { clearInterval(timer); timer = null; runB.textContent = "Run"; } else { timer = setInterval(() => { if (!step()) { clearInterval(timer); timer = null; runB.textContent = "Run"; } }, 700); runB.textContent = "Pause"; } });
    LW.button(c2, "Reset", () => reset());
    const grid = H("div", { class: "vm-grid" }), expl = H("p", { class: "vm-expl" }); root.append(expl, grid);
    function reset() { if (timer) { clearInterval(timer); timer = null; runB.textContent = "Run"; } const P = PROGS[key]; frames = [{ name: "module", code: P.code, ip: 0, stack: [], names: {}, mod: true }]; done = false; log = "Press <b>Execute one instruction</b> to start. The highlighted row is the next instruction to run."; render(); }
    const jumpTo = (fr, off) => { fr.ip = fr.code.findIndex(c => c[0] === off); };
    function step() {
      if (done) return false;
      const fr = frames[frames.length - 1], [off, op, arg] = fr.code[fr.ip], P = PROGS[key], g = frames[0].names;
      let msg = "", next = true;
      switch (op) {
        case "RESUME": msg = "<code>RESUME</code>: housekeeping at the start of a code object (CPython checks for signals and other events here). Nothing visible happens."; break;
        case "LOAD_CONST": { const v = typeof arg === "string" && arg.startsWith("code:") ? { kind: "code", name: arg.slice(5) } : arg; fr.stack.push(v); msg = `<code>LOAD_CONST ${esc(show(v))}</code>: push a constant, stored with the compiled code, onto the value stack.`; break; }
        case "STORE_NAME": { const v = fr.stack.pop(); fr.names[arg] = v; msg = `<code>STORE_NAME ${arg}</code>: pop the top of the stack and bind the name <b>${arg}</b> to that value in the current namespace.`; break; }
        case "LOAD_NAME": { const v = arg in fr.names ? fr.names[arg] : arg in g ? g[arg] : arg === "range" ? { kind: "builtin", name: "range" } : undefined; fr.stack.push(v); msg = `<code>LOAD_NAME ${arg}</code>: look the name up (local namespace, then global, then built-ins) and push the value it refers to${arg === "range" ? ", here the built-in function <b>range</b>" : ""}.`; break; }
        case "LOAD_FAST": { fr.stack.push(fr.names[arg]); msg = `<code>LOAD_FAST ${arg}</code>: push the local variable <b>${arg}</b>. Locals live in numbered slots of the frame, so no dictionary lookup is needed: this is why local variables are faster than globals.`; break; }
        case "BINARY_OP": { const b = fr.stack.pop(), a = fr.stack.pop(), r = arg === "+" ? a + b : arg === "*" ? a * b : a - b; fr.stack.push(r); msg = `<code>BINARY_OP ${arg}</code>: pop two values (${show(a)} and ${show(b)}), compute ${show(a)} ${arg} ${show(b)} = ${show(r)}, and push the result. In CPython this calls the <code>__${arg === "+" ? "add" : arg === "*" ? "mul" : "sub"}__</code> method of the left operand's type.`; break; }
        case "COMPARE_OP": { const b = fr.stack.pop(), a = fr.stack.pop(), r = a > b; fr.stack.push(r); msg = `<code>COMPARE_OP ${arg}</code>: pop two values, compare ${show(a)} > ${show(b)}, and push the Boolean result <b>${show(r)}</b>.`; break; }
        case "POP_JUMP_IF_FALSE": { const v = fr.stack.pop(); if (!v) { jumpTo(fr, arg); next = false; } msg = `<code>POP_JUMP_IF_FALSE ${arg}</code>: pop the condition. It is ${show(v)}, so ${v ? "carry on with the next instruction (the <i>if</i> branch)." : "jump to offset " + arg + " (the <i>else</i> branch)."}`; break; }
        case "PUSH_NULL": fr.stack.push({ kind: "null" }); msg = "<code>PUSH_NULL</code>: push a NULL marker. CPython's calling convention reserves this slot below the function being called (it would hold <code>self</code> for a method call)."; break;
        case "CALL": { const args = fr.stack.splice(fr.stack.length - arg, arg), fn = fr.stack.pop(); fr.stack.pop();
          if (fn.kind === "builtin") { const n = args[0], items = Array.from({ length: n }, (_, i) => i); fr.stack.push({ kind: "range", n, items }); msg = `<code>CALL 1</code>: pop the argument (${n}) and the function, call <b>range(${n})</b>, and push the range object it returns. The range does not store its numbers; it produces them on demand.`; }
          else { const F = P.fns[fn.name], loc = {}; F.args.forEach((a, i) => { loc[a] = args[i]; }); fr.ip++; frames.push({ name: fn.name, code: F.code, ip: 0, stack: [], names: loc }); msg = `<code>CALL 1</code>: pop the argument and the function <b>${fn.name}</b>, create a new <b>frame</b> for the call with its own value stack and local variable <b>a = ${show(args[0])}</b>, and start executing the function's bytecode. The module's frame waits underneath.`; log = msg; render(); return true; }
          break; }
        case "GET_ITER": { const r = fr.stack.pop(); fr.stack.push({ kind: "iter", items: r.items, i: 0 }); msg = "<code>GET_ITER</code>: replace the range object by an <b>iterator</b> over it, an object that remembers how far the loop has got."; break; }
        case "FOR_ITER": { const it = fr.stack[fr.stack.length - 1]; if (it.i < it.items.length) { fr.stack.push(it.items[it.i++]); msg = `<code>FOR_ITER</code>: ask the iterator for its next value. It gives <b>${it.items[it.i - 1]}</b>, which is pushed on top of the iterator.`; } else { fr.stack.pop(); jumpTo(fr, arg); next = false; msg = `<code>FOR_ITER</code>: the iterator is exhausted, so it is removed from the stack and execution jumps to offset ${arg}, after the loop body.`; } break; }
        case "JUMP_BACKWARD": jumpTo(fr, arg); next = false; msg = `<code>JUMP_BACKWARD ${arg}</code>: the loop body is finished; jump back to offset ${arg} to fetch the next value. A loop is just a backward jump.`; break;
        case "END_FOR": msg = "<code>END_FOR</code>: the end of the loop; the stack is cleaned up and execution continues after the <i>for</i> statement."; break;
        case "MAKE_FUNCTION": { const c = fr.stack.pop(); fr.stack.push({ kind: "fn", name: c.name }); msg = "<code>MAKE_FUNCTION</code>: pop the compiled code of <b>square</b> and wrap it in a new function object. Defining a function is an action performed at run time, like an assignment."; break; }
        case "RETURN_VALUE": { const v = fr.stack.pop(); frames.pop(); frames[frames.length - 1].stack.push(v); msg = `<code>RETURN_VALUE</code>: pop the result (${show(v)}), destroy the function's frame and its local variables, and push the result onto the caller's stack.`; log = msg; render(); return true; }
        case "RETURN_CONST": done = true; next = false; msg = "<code>RETURN_CONST None</code>: the module has finished. Every code object ends by returning a value; a module returns None."; break;
      }
      if (next) fr.ip++;
      log = msg; render(); return !done;
    }
    function render() {
      const P = PROGS[key], fr = frames[frames.length - 1], cur = fr.code[fr.ip], line = done ? -1 : cur[3], inFn = frames.length > 1;
      const srcLines = P.src.split("\n");
      const hl = done ? -1 : cur[3]; // dis line numbers are absolute, also inside the function
      const srcH = `<div class="vm-col"><p class="vm-h">Source</p><pre class="vm-src">${srcLines.map((l, i) => `<span class="${i + 1 === hl ? "on" : ""}">${String(i + 1).padStart(2)}  ${esc(l) || " "}</span>`).join("")}</pre></div>`;
      const bcH = `<div class="vm-col"><p class="vm-h">Bytecode of ${inFn ? "function " + fr.name : "the module"}</p><table class="vm-bc">${fr.code.map((c, i) => `<tr class="${!done && i === fr.ip ? "on" : ""}"><td>${c[0]}</td><td><code>${c[1]}</code></td><td>${esc(c[1] === "LOAD_CONST" ? show(typeof c[2] === "string" && c[2].startsWith("code:") ? { kind: "code", name: c[2].slice(5) } : c[2]) : c[1] === "RETURN_CONST" ? "None" : c[1].includes("JUMP") || c[1] === "FOR_ITER" ? "to " + c[2] : String(c[2]))}</td></tr>`).join("")}</table></div>`;
      const frH = frames.slice().reverse().map((f, k) => `<div class="vm-frame${k === 0 ? " top" : ""}"><p class="vm-h">Frame: ${esc(f.mod ? "module" : f.name + "()")}</p><div class="vm-fr-in"><div><small>value stack</small><div class="vm-stack">${f.stack.length ? f.stack.map(v => `<span>${esc(show(v))}</span>`).reverse().join("") : "<em>empty</em>"}</div></div><div><small>${f.mod ? "global names" : "local variables"}</small><table class="vm-names">${Object.keys(f.names).length ? Object.entries(f.names).map(([n, v]) => `<tr><td>${esc(n)}</td><td>→</td><td>${esc(show(v))}</td></tr>`).join("") : "<tr><td><em>none yet</em></td></tr>"}</table></div></div></div>`).join("");
      grid.innerHTML = srcH + bcH + `<div class="vm-col">${frH}</div>`;
      expl.innerHTML = done ? log + " <b>Finished.</b>" : log;
      stepB.disabled = done;
    }
    reset();
  });

  /* ---------------- 3. names, frames and objects: a tracer ---------------- */
  const TRACE_PY = `
import sys, json, types
def _lw_trace(src, maxsteps=400):
    steps, out = [], []
    code = compile(src, "<code>", "exec")
    g = {"__name__": "__main__"}
    def p(*a, sep=" ", end="\\n", **k):
        out.append(sep.join(str(x) for x in a) + end)
    g["print"] = p
    def snap(frame, event, arg):
        fr, f = [], frame
        while f is not None and f.f_code.co_filename == "<code>":
            fr.append(f); f = f.f_back
        fr.reverse()
        heap, order = {}, []
        def enc(v):
            i = str(id(v))
            if i in heap: return i
            t = type(v).__name__
            heap[i] = {"t": t}; order.append(i)
            if isinstance(v, (bool, int, float, complex, str, type(None))):
                heap[i]["v"] = repr(v)
            elif isinstance(v, (list, tuple)):
                heap[i]["items"] = [enc(x) for x in v[:24]]
            elif isinstance(v, (set, frozenset)):
                heap[i]["items"] = [enc(x) for x in sorted(v, key=repr)[:24]]
            elif isinstance(v, dict):
                heap[i]["pairs"] = [[enc(k), enc(x)] for k, x in list(v.items())[:24]]
            elif isinstance(v, types.FunctionType):
                c = v.__code__; heap[i]["t"] = "function"; heap[i]["v"] = v.__name__ + "(" + ", ".join(c.co_varnames[:c.co_argcount]) + ")"
            elif isinstance(v, type):
                heap[i]["t"] = "class"; heap[i]["v"] = v.__name__
                heap[i]["attrs"] = [[k, enc(x)] for k, x in v.__dict__.items() if not k.startswith("__")]
            elif hasattr(v, "__dict__") and not isinstance(v, types.ModuleType):
                heap[i]["t"] = type(v).__name__ + " object"
                heap[i]["attrs"] = [[k, enc(x)] for k, x in vars(v).items()]
            else:
                heap[i]["v"] = repr(v)[:40]
            return i
        frames = []
        for f in fr:
            mod = f.f_code.co_name == "<module>"
            loc = f.f_globals if mod else f.f_locals
            vs = [[k, enc(v)] for k, v in loc.items() if not (k.startswith("__") and k.endswith("__")) and k != "print" and not isinstance(v, types.ModuleType)]
            cls = (not mod) and "__qualname__" in f.f_locals and "__module__" in f.f_locals
            frames.append({"name": "global frame" if mod else ("class body of " + f.f_code.co_name if cls else f.f_code.co_name + "()"), "vars": vs})
        s = {"line": frame.f_lineno, "event": event, "frames": frames, "heap": heap, "order": order, "out": "".join(out)}
        if event == "return" and frame.f_code.co_name != "<module>":
            s["ret"] = enc(arg)
        steps.append(s)
    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<code>": return None
        if len(steps) >= maxsteps: raise RuntimeError("stopped after %d steps" % maxsteps)
        if event in ("line", "return"): snap(frame, event, arg)
        return tracer
    err = None
    sys.settrace(tracer)
    try:
        exec(code, g)
    except Exception as e:
        err = type(e).__name__ + ": " + str(e)
    finally:
        sys.settrace(None)
    return json.dumps({"steps": steps, "err": err, "out": "".join(out)})
`;
  const PRIM = new Set(["int", "float", "str", "bool", "NoneType", "complex"]);
  LW.register("pytutor", function (root, opts) {
    const presets = (opts && opts.presets) || [["names", "Names and objects", "x = 300\ny = x\nx = x + 1\nname = 'argon'\nmass = 39.948\n"]];
    const ta = H("textarea", { class: "pp-src", spellcheck: "false", autocapitalize: "off", "aria-label": "Python code to visualise" }); ta.value = presets[0][2];
    const grow = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; };
    const ctl = LW.controls(root);
    if (presets.length > 1) LW.seg(ctl, { label: "Example", options: presets.map(p => [p[0], p[1]]), value: presets[0][0], onChange: k => { ta.value = presets.find(p => p[0] === k)[2]; grow(); trace = null; render(); } });
    root.append(ta); setTimeout(grow, 0); ta.addEventListener("input", () => { grow(); });
    const c2 = LW.controls(root);
    const go = LW.button(c2, "Visualise execution", () => run(), { primary: true });
    const prev = LW.button(c2, "◀ Back", () => { if (trace) { k = Math.max(0, k - 1); render(); } });
    const next = LW.button(c2, "Forward ▶", () => { if (trace) { k = Math.min(trace.steps.length - 1, k + 1); render(); } });
    const st = H("span", { class: "pp-status" }); c2.append(st);
    const slider = H("input", { type: "range", min: 0, max: 0, value: 0, class: "pt-slider", "aria-label": "Step" }); root.append(slider);
    slider.addEventListener("input", () => { k = +slider.value; render(); });
    const view = H("div", { class: "pt-view" }); root.append(view);
    let trace = null, k = 0;
    async function run() {
      go.disabled = true;
      try { const py = await LW.loadPy(s => { st.textContent = s; }); st.textContent = "Tracing…"; if (!py._lwTrace) { py.runPython(TRACE_PY); py._lwTrace = true; }
        const f = py.globals.get("_lw_trace"); trace = JSON.parse(f(ta.value)); f.destroy(); k = 0; st.textContent = trace.steps.length + " steps" + (trace.err ? " · ended with an error" : "");
      } catch (e) { trace = null; st.textContent = String(e.message || e).split("\n").filter(Boolean).slice(-1)[0]; }
      go.disabled = false; render();
    }
    function objHTML(id, s, pid) {
      const o = s.heap[id], inl = x => { const q = s.heap[x]; return PRIM.has(q.t) ? `<span class="pt-inl">${esc(q.v)}</span>` : `<span class="pt-ref" data-ref="${x}" data-from="${pid}"></span>`; };
      let body;
      if (o.items) body = `<div class="pt-cells">${o.items.length ? o.items.map((x, i) => `<span class="pt-cell"><small>${o.t === "set" ? "" : i}</small>${inl(x)}</span>`).join("") : "<em>empty</em>"}</div>`;
      else if (o.pairs) body = `<table class="pt-dict">${o.pairs.map(([a, b]) => `<tr><td>${inl(a)}</td><td>${inl(b)}</td></tr>`).join("") || "<tr><td><em>empty</em></td></tr>"}</table>`;
      else if (o.attrs) body = `${o.v ? `<b>${esc(o.v)}</b>` : ""}<table class="pt-dict">${o.attrs.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${inl(b)}</td></tr>`).join("")}</table>`;
      else body = `<b>${esc(o.v)}</b>`;
      return `<div class="pt-obj t-${esc(o.t.split(" ")[0])}" data-id="${id}"><small>${esc(o.t)}</small>${body}</div>`;
    }
    function render() {
      prev.disabled = !trace || k === 0; next.disabled = !trace || k >= (trace ? trace.steps.length - 1 : 0);
      const lines = ta.value.replace(/\n$/, "").split("\n");
      if (!trace) { view.innerHTML = `<p class="pp-hint">Press <b>Visualise execution</b>. The program is run by real Python in this page, pausing before every line to record every name and every object in memory.</p>`; slider.hidden = true; return; }
      slider.hidden = false; slider.max = trace.steps.length - 1; slider.value = k;
      const s = trace.steps[k], last = k === trace.steps.length - 1;
      const code = `<pre class="pt-code">${lines.map((l, i) => `<span class="${s.line === i + 1 ? (s.event === "return" ? "ret" : "on") : ""}"><i>${i + 1}</i>${esc(l) || " "}</span>`).join("")}</pre>`;
      const frames = s.frames.map((f, fi) => `<div class="pt-frame${fi === s.frames.length - 1 ? " top" : ""}"><p>${esc(f.name)}</p><table>${f.vars.map(([n, id]) => `<tr><td>${esc(n)}</td><td><span class="pt-ref" data-ref="${id}" data-from="f${fi}${n}"></span></td></tr>`).join("") || "<tr><td><em>no names yet</em></td></tr>"}${fi === s.frames.length - 1 && s.ret ? `<tr class="pt-ret"><td>return value</td><td><span class="pt-ref" data-ref="${s.ret}" data-from="ret"></span></td></tr>` : ""}</table></div>`).join("");
      // heap: objects referenced from frames, in first-seen order, primitives that only live inside containers are drawn inline instead
      const direct = new Set(); s.frames.forEach(f => f.vars.forEach(([, id]) => direct.add(id))); if (s.ret) direct.add(s.ret);
      const shown = s.order.filter(id => direct.has(id) || !PRIM.has(s.heap[id].t));
      const heap = shown.map(id => objHTML(id, s, id)).join("");
      const note = s.event === "return" ? (s.frames.length > 1 ? `Leaving <b>${esc(s.frames[s.frames.length - 1].name)}</b>; its frame is about to disappear.` : "The program has finished.") : `About to execute line ${s.line}.`;
      view.innerHTML = `<div class="pt-grid">${code}<div class="pt-mem"><div class="pt-frames"><p class="pt-h">Frames (names)</p>${frames}</div><div class="pt-heap"><p class="pt-h">Objects</p>${heap || "<em>none</em>"}</div><svg class="pt-svg"></svg></div></div><p class="pt-note">Step ${k + 1} of ${trace.steps.length}. ${note}${last && trace.err ? ` <b class="pt-err">${esc(trace.err)}</b>` : ""}</p>${s.out ? `<pre class="pt-out">${esc(s.out)}</pre>` : ""}`;
      requestAnimationFrame(arrows);
    }
    function arrows() {
      const mem = view.querySelector(".pt-mem"); if (!mem) return; const svg = mem.querySelector(".pt-svg"), R = mem.getBoundingClientRect();
      svg.setAttribute("width", R.width); svg.setAttribute("height", R.height); svg.setAttribute("viewBox", `0 0 ${R.width} ${R.height}`);
      const col = getComputedStyle(root).getPropertyValue("--ink-2") || "#555";
      let html = `<defs><marker id="pt-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${BLUE}"/></marker></defs>`;
      mem.querySelectorAll(".pt-ref").forEach(r => { const tgt = mem.querySelector(`.pt-obj[data-id="${r.dataset.ref}"]`); if (!tgt) return; const a = r.getBoundingClientRect(), b = tgt.getBoundingClientRect();
        const x0 = a.left + a.width / 2 - R.left, y0 = a.top + a.height / 2 - R.top, x1 = b.left - R.left, y1 = b.top + 14 - R.top, back = x1 < x0 + 10;
        const d = back ? `M${x0} ${y0} C ${x0 + 40} ${y0}, ${b.right - R.left + 40} ${y1}, ${b.right - R.left + 2} ${y1}` : `M${x0} ${y0} C ${x0 + (x1 - x0) * 0.5} ${y0}, ${x1 - (x1 - x0) * 0.5} ${y1}, ${x1 - 2} ${y1}`;
        html += `<path d="${d}" fill="none" stroke="${BLUE}" stroke-width="1.6" marker-end="url(#pt-ah)" opacity=".85"/>`; });
      svg.innerHTML = html; void col;
    }
    window.addEventListener("resize", () => requestAnimationFrame(arrows));
    render();
  });

  /* ---------------- 4. how a list grows: over-allocation ---------------- */
  // capacity of a list after each append, measured with sys.getsizeof in 64-bit CPython 3.12
  const CAPS = [0, 4, 4, 4, 4, 8, 8, 8, 8, 16, 16, 16, 16, 16, 16, 16, 16, 24, 24, 24, 24, 24, 24, 24, 24, 32, 32, 32, 32, 32, 32, 32, 32, 40, 40, 40, 40, 40, 40, 40, 40, 52, 52, 52, 52, 52, 52, 52, 52, 52, 52, 52, 52, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 76, 76, 76, 76, 76, 76];
  LW.register("listgrow", function (root) {
    let n = 0, flash = -1, copies = 0, moved = 0;
    const P = LW.canvas(root, { height: w => (w < 640 ? 400 : 330) });
    const ctl = LW.controls(root);
    LW.button(ctl, "append(x)", () => add(1), { primary: true });
    LW.button(ctl, "append 10 times", () => add(10));
    LW.button(ctl, "Start with an empty list", () => { n = 0; copies = 0; moved = 0; flash = -1; draw(); });
    const S = LW.stats(root, [["len", "len(list)"], ["cap", "allocated slots"], ["bytes", "sys.getsizeof(list)"], ["cp", "times the array was moved"], ["avg", "element copies per append"]]);
    function add(k) { for (let i = 0; i < k && n < CAPS.length - 1; i++) { if (CAPS[n + 1] > CAPS[n]) { copies++; moved += n; flash = n + 1; } n++; } draw(); }
    function draw() {
      const C = LW.colors(), { ctx, W, H: HH } = P; ctx.clearRect(0, 0, W, HH);
      const cap = CAPS[n], maxCap = 76, cols = W < 640 ? 19 : 38, cw = (W - 20) / cols, ch = Math.min(26, cw * 0.9);
      LW.text(ctx, W < 640 ? "slot array: one 8-byte pointer per element" : "The list object points to an array of slots, each holding one 8-byte pointer to an element object", 10, 16, { color: C.ink2, size: 11.5, weight: 600 });
      for (let i = 0; i < maxCap; i++) { const x = 10 + (i % cols) * cw, y = 28 + Math.floor(i / cols) * (ch + 6);
        if (i < cap) { ctx.fillStyle = i < n ? (flash === n && i < n ? "rgba(240,140,46,.55)" : "rgba(76,110,245,.55)") : (C.dark ? "rgba(255,255,255,.06)" : "rgba(12,18,34,.05)"); ctx.fillRect(x + 1, y, cw - 2, ch); ctx.strokeStyle = i < n ? BLUE : C.line2; ctx.strokeRect(x + 1.5, y + 0.5, cw - 3, ch - 1); if (i < n && cw > 16) LW.text(ctx, String(i), x + cw / 2, y + ch / 2 + 4, { color: "#fff", size: 9.5, align: "center", mono: true }); }
        else { ctx.strokeStyle = C.dark ? "rgba(255,255,255,.05)" : "rgba(12,18,34,.05)"; ctx.setLineDash([2, 3]); ctx.strokeRect(x + 1.5, y + 0.5, cw - 3, ch - 1); ctx.setLineDash([]); } }
      const rows = Math.ceil(maxCap / cols), gy = 28 + rows * (ch + 6) + 26;
      const A = LW.axes(ctx, { x: 50, y: gy, w: W - 64, h: HH - gy - 38 }, { xr: [0, CAPS.length - 1], yr: [0, 80], xlabel: "number of elements (len)", ylabel: "slots", colors: C, ny: 4 });
      A.clip(); const xs = CAPS.map((_, i) => i);
      LW.path(ctx, xs, xs, A, { color: C.ink3, width: 1.2, dash: [4, 4] });
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2.4; ctx.beginPath(); CAPS.forEach((c, i) => { const X = A.sx(i), Y = A.sy(c); i ? (ctx.lineTo(X, A.sy(CAPS[i - 1])), ctx.lineTo(X, Y)) : ctx.moveTo(X, Y); }); ctx.stroke();
      LW.dot(ctx, A.sx(n), A.sy(cap), 5, ORANGE, C.card, 1.5); ctx.restore();
      LW.text(ctx, "gold: allocated slots   dashed: elements actually stored", A.box.x + 8, A.box.y + 14, { color: C.ink3, size: 10.5 });
      S.set("len", String(n)); S.set("cap", String(cap)); S.set("bytes", (56 + 8 * cap) + " bytes"); S.set("cp", String(copies)); S.set("avg", n ? (moved / n).toFixed(2) : "–");
    }
    P.draw = draw; draw();
  });

  /* ---------------- 5. a dictionary is a hash table (simplified model) ---------------- */
  const ELEMENTS = [["H", 1], ["He", 2], ["C", 6], ["N", 7], ["O", 8], ["Na", 11], ["Si", 14], ["Cl", 17], ["Fe", 26], ["Cu", 29], ["Ag", 47], ["Au", 79], ["Pt", 78], ["Ti", 22]];
  const fnv = s => { let h = 0x811c9dc5; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
  LW.register("hashtable", function (root) {
    let size = 8, slots, used = 0, nextI = 0, probe = null, resizes = 0;
    const box = H("div", { class: "ht" }); root.append(box);
    const ctl = LW.controls(root);
    LW.button(ctl, "Insert the next element", () => insertNext(), { primary: true });
    const inp = H("input", { type: "text", value: "Fe", class: "ht-in", "aria-label": "Key to look up", size: 6 });
    ctl.append(H("label", { class: "lw-check" }, H("span", { html: "Look up key" }), inp));
    LW.button(ctl, "Look up", () => lookup(inp.value.trim()));
    LW.button(ctl, "Start again", () => reset());
    const S = LW.stats(root, [["n", "keys stored"], ["sz", "table size"], ["load", "load factor"], ["rz", "resizes so far"], ["pr", "slots inspected by the last operation"]]);
    function reset() { size = 8; slots = new Array(size).fill(null); used = 0; nextI = 0; probe = null; resizes = 0; for (let i = 0; i < 3; i++) insertNext(); probe = null; render(); }
    function place(k, v, path) { let i = fnv(k) & (size - 1); while (slots[i] && slots[i][0] !== k) { path.push(i); i = (i + 1) & (size - 1); } path.push(i); if (!slots[i]) used++; slots[i] = [k, v]; }
    function insertNext() {
      if (nextI >= ELEMENTS.length) return;
      const [k, v] = ELEMENTS[nextI++], path = [];
      if ((used + 1) * 3 > size * 2) { const old = slots.filter(Boolean); size *= 2; slots = new Array(size).fill(null); used = 0; resizes++; old.forEach(([a, b]) => place(a, b, [])); probe = { k, path: [], resized: true }; }
      place(k, v, path); probe = Object.assign(probe && probe.resized ? probe : {}, { k, path, op: "insert", found: true }); render();
    }
    function lookup(k) { if (!k) return; const path = []; let i = fnv(k) & (size - 1), found = false; while (slots[i]) { path.push(i); if (slots[i][0] === k) { found = true; break; } i = (i + 1) & (size - 1); } if (!found) path.push(i); probe = { k, path, op: "lookup", found }; render(); }
    function render() {
      const p = probe;
      const head = p ? `<p class="ht-msg">${p.op === "insert" ? "Insert" : "Look up"} <b>${esc(p.k)}</b>: hash(${esc(JSON.stringify(p.k))}) = <code>0x${fnv(p.k).toString(16).padStart(8, "0")}</code>; its last ${Math.log2(size)} bits give slot <b>${fnv(p.k) & (size - 1)}</b>.${p.path.length > 1 ? ` That slot was taken, so the search moved on: slots ${p.path.join(" → ")}.` : ""}${p.op === "lookup" ? (p.found ? ` Found, value <b>${slots[p.path[p.path.length - 1]][1]}</b>.` : " Reached an empty slot: the key is not in the table (KeyError).") : ""}${p.resized ? " The table was more than two-thirds full, so it was <b>doubled</b> and every key re-inserted." : ""}</p>` : `<p class="ht-msg">Insert chemical symbols as keys with their atomic numbers as values. Each key's hash decides where it lives.</p>`;
      const cells = slots.map((s, i) => { const on = p && p.path.includes(i), last = p && p.path[p.path.length - 1] === i; return `<div class="ht-slot${s ? " full" : ""}${on ? " probe" : ""}${last ? " last" : ""}"><small>${i}</small>${s ? `<b>${esc(s[0])}</b><span>${s[1]}</span>` : "<em>empty</em>"}</div>`; }).join("");
      box.innerHTML = head + `<div class="ht-grid" style="--n:${Math.min(size, 16)}">${cells}</div>`;
      S.set("n", String(used)); S.set("sz", String(size)); S.set("load", (used / size).toFixed(2)); S.set("rz", String(resizes)); S.set("pr", p ? String(p.path.length) : "–");
    }
    reset();
  });
})();
