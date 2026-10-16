/* Computing 3: the layers of a Linux system, clickable, with traces of real commands through them. */
(function () {
  "use strict";
  const LAYERS = [
    { id: "app", name: "User programs", kind: "user space", blocks: [["bash", "The shell: reads your commands, starts programs, connects them with pipes."], ["python", "An interpreter: itself an ordinary program that reads your script."], ["gmx mdrun", "A simulation code: an ordinary process asking the kernel for memory, files and CPU time."], ["ssh, vim, ls…", "Every command you type is a separate program on disk, usually in /usr/bin."]] },
    { id: "lib", name: "Libraries", kind: "user space", blocks: [["C library (glibc)", "Wraps every system call in an ordinary function (open, read, printf, malloc). Almost every program links to it."], ["libm, BLAS, LAPACK", "Mathematics and linear algebra, optimised for the processor."], ["MPI, CUDA runtime", "Libraries for talking to other nodes and to GPUs."]] },
    { id: "sys", name: "System call interface", kind: "the boundary", blocks: [["open · read · write · close", "Files and devices."], ["fork · execve · exit · wait", "Creating and running processes."], ["mmap · brk", "Asking for memory."], ["socket · connect", "Networking."]] },
    { id: "kern", name: "Linux kernel", kind: "kernel space", blocks: [["Process scheduler", "Decides which process runs on which core, switching hundreds of times a second so that many programs seem to run at once."], ["Memory manager", "Gives every process its own virtual address space, maps it to physical RAM in 4 KB pages, and keeps processes from reading each other's memory."], ["Virtual file system", "One interface (open, read, write) over every kind of storage: ext4 and XFS on local disks, NFS and Lustre on clusters, and pseudo-files such as /proc."], ["Network stack", "TCP/IP: turns socket writes into packets."], ["Device drivers", "Code that knows how to talk to each piece of hardware: disks, network cards, GPUs."]] },
    { id: "hw", name: "Hardware", kind: "physical", blocks: [["CPU cores", "Execute instructions; switch between user mode and the privileged kernel mode."], ["RAM", "Holds running programs and their data."], ["SSD / disk", "Holds files when the power is off."], ["Network card", "Ethernet or InfiniBand to other machines."], ["GPU", "Thousands of simple cores for parallel arithmetic."]] }
  ];
  const TRACES = {
    cat: { name: "cat md.mdp", steps: [
      ["app:bash", "bash reads the line, splits it into the words <code>cat</code> and <code>md.mdp</code>, and looks for a program called <code>cat</code> in the directories listed in <code>$PATH</code>; it finds <code>/usr/bin/cat</code>."],
      ["sys:fork · execve · exit · wait", "bash calls <code>fork()</code> to clone itself, and the child calls <code>execve(\"/usr/bin/cat\", …)</code>, replacing its program with cat. The parent bash waits."],
      ["kern:Process scheduler", "The kernel puts the new process on a CPU core. From now on cat runs in user mode, with no direct access to hardware."],
      ["sys:open · read · write · close", "cat calls <code>open(\"md.mdp\")</code>. The CPU switches to kernel mode: this crossing of the boundary is a <b>system call</b>."],
      ["kern:Virtual file system", "The kernel resolves the path, checks permissions, and asks the file-system driver (ext4, XFS, Lustre…) where the file's blocks are."],
      ["hw:SSD / disk", "The disk driver reads the blocks (unless they are already cached in RAM, which is common for recently used files)."],
      ["kern:Memory manager", "The data is copied into a buffer in cat's own memory."],
      ["sys:open · read · write · close", "cat calls <code>write(1, …)</code>: file descriptor 1 is standard output, connected to your terminal."],
      ["app:bash", "cat calls <code>exit(0)</code>. The kernel wakes bash, which receives the exit status 0 (success) and prints the next prompt."]] },
    py: { name: "python analyse.py", steps: [
      ["app:bash", "bash finds <code>python</code> in <code>$PATH</code> (in a conda environment it is the environment's own copy)."],
      ["sys:fork · execve · exit · wait", "fork() and execve() start the Python interpreter, a program written in C."],
      ["lib:C library (glibc)", "The interpreter's start-up code, from glibc, sets up the process."],
      ["sys:mmap · brk", "Python asks the kernel for memory with mmap to hold its objects and the shared libraries it loads (for example NumPy's compiled code)."],
      ["kern:Memory manager", "The kernel reserves virtual addresses but only assigns physical RAM pages when they are first touched."],
      ["lib:libm, BLAS, LAPACK", "When your script calls <code>np.linalg.solve</code>, NumPy hands the work to an optimised LAPACK library, which runs at full CPU speed without any further help from the kernel."],
      ["hw:CPU cores", "The arithmetic happens directly on the CPU. System calls are needed only for input, output and memory, which is why number-crunching code spends almost all its time in user mode."]] },
    mpi: { name: "srun gmx_mpi mdrun", steps: [
      ["app:bash", "Inside a Slurm job, bash runs <code>srun</code>, which asks Slurm to start one copy of the program per MPI rank, possibly on several nodes."],
      ["sys:fork · execve · exit · wait", "On every node, Slurm's daemon creates the processes with fork and execve."],
      ["kern:Process scheduler", "Each node's kernel pins the ranks to cores; OpenMP threads inside each rank are scheduled too."],
      ["lib:MPI, CUDA runtime", "Ranks exchange atom positions and forces through the MPI library."],
      ["sys:socket · connect", "MPI messages travel through system calls, or, on fast interconnects, straight from user space to the network card (kernel bypass)."],
      ["hw:Network card", "InfiniBand or fast Ethernet carries the messages between nodes."],
      ["hw:GPU", "If GPUs are used, the CUDA runtime sends work to the GPU through its driver."],
      ["kern:Virtual file system", "Trajectory frames are written to a parallel file system such as Lustre or GPFS through the same open and write calls as any other file."]] }
  };
  LW.register("linuxstack", function (root) {
    let trace = null, k = -1, sel = null;
    const wrap = LW.h("div", { class: "ls-wrap" }); root.append(wrap);
    const stack = LW.h("div", { class: "ls-stack" }), side = LW.h("div", { class: "ls-side" }); wrap.append(stack, side);
    const els = {};
    LAYERS.forEach(L => {
      const row = LW.h("div", { class: "ls-layer ls-" + L.id }, LW.h("div", { class: "ls-name" }, LW.h("b", { text: L.name }), LW.h("small", { text: L.kind })));
      const bl = LW.h("div", { class: "ls-blocks" });
      L.blocks.forEach(([n, d]) => { const b = LW.h("button", { type: "button", class: "ls-b", text: n, onclick: () => { sel = [L, n, d]; trace = null; k = -1; paint(); } }); els[L.id + ":" + n] = b; bl.append(b); });
      row.append(bl); stack.append(row);
      if (L.id === "sys") stack.append(LW.h("div", { class: "ls-mode" }, LW.h("span", { text: "▲ user mode: ordinary programs, no direct hardware access" }), LW.h("span", { text: "▼ kernel mode: full control of the machine" })));
    });
    const ctl = LW.controls(root);
    LW.seg(ctl, { label: "Trace a command through the layers", options: Object.keys(TRACES).map(t => [t, `<code>${TRACES[t].name}</code>`]), value: null, onChange: v => { trace = v; k = 0; sel = null; paint(); } });
    const c2 = LW.controls(root);
    const prev = LW.button(c2, "← Previous step", () => { if (trace && k > 0) { k--; paint(); } });
    const next = LW.button(c2, "Next step →", () => { if (!trace) { trace = "cat"; k = 0; } else if (k < TRACES[trace].steps.length - 1) k++; paint(); }, { primary: true });
    function paint() {
      Object.values(els).forEach(e => e.classList.remove("hot", "sel"));
      if (trace) {
        const st = TRACES[trace].steps; const [key, text] = st[k];
        if (els[key]) els[key].classList.add("hot");
        side.innerHTML = `<p class="ls-k">${LW.esc(TRACES[trace].name)} · step ${k + 1} of ${st.length}</p><p>${text}</p><ol class="ls-steps">${st.map((s, i) => `<li class="${i === k ? "cur" : i < k ? "past" : ""}">${s[0].split(":")[1]}</li>`).join("")}</ol>`;
        prev.disabled = k === 0; next.disabled = k === st.length - 1;
      } else if (sel) {
        els[sel[0].id + ":" + sel[1]].classList.add("sel");
        side.innerHTML = `<p class="ls-k">${LW.esc(sel[0].name)} · ${LW.esc(sel[0].kind)}</p><h5>${LW.esc(sel[1])}</h5><p>${sel[2]}</p>`;
      } else side.innerHTML = `<p class="ls-k">How to use this</p><p>Click any block to read what it does, or choose a command below and step through what happens when you press Enter.</p>`;
    }
    paint();
  });
})();
