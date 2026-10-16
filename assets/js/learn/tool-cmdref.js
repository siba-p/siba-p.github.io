/* 1.2 Linux for simulation work: a searchable command reference and a command-line explainer. */
(function () {
  "use strict";
  const REF = [
    ["Files", "ls -lh", "List files with sizes in K, M, G", "ls -lht runs/ | head"],
    ["Files", "cd", "Change directory; cd - returns to the previous one", "cd ~/project/runs"],
    ["Files", "pwd", "Print the current directory", "pwd"],
    ["Files", "mkdir -p", "Make a directory and any missing parents", "mkdir -p analysis/rdf"],
    ["Files", "cp -r", "Copy files or whole directories", "cp -r input/ input_backup/"],
    ["Files", "mv", "Move or rename", "mv md.log md_T300.log"],
    ["Files", "rm -r", "Delete (there is no recycle bin)", "rm -r old_runs/"],
    ["Files", "ln -s", "Make a symbolic link (a shortcut)", "ln -s /scratch/$USER/runs runs"],
    ["Files", "find", "Search for files by name, type, size or age", "find . -name '*.xtc' -size +1G"],
    ["Files", "du -sh", "Disk usage of a directory", "du -sh runs/* | sort -h"],
    ["Files", "df -h", "Free space on each file system", "df -h /scratch"],
    ["Files", "chmod", "Change permissions; +x makes a script executable", "chmod +x submit.sh"],
    ["Files", "tree", "Show a directory tree", "tree -L 2"],
    ["Text", "cat", "Print a file", "cat md.mdp"],
    ["Text", "less", "Page through a large file (q quits, / searches)", "less md.log"],
    ["Text", "head / tail", "First or last lines; tail -f follows a growing file", "tail -f md.log"],
    ["Text", "grep", "Search for a pattern; -r recursive, -i ignore case, -n line numbers", "grep -n 'Fatal error' */md.log"],
    ["Text", "wc -l", "Count lines", "grep -c ATOM protein.pdb"],
    ["Text", "sort / uniq", "Sort lines, then count repeats", "cut -c18-20 prot.pdb | sort | uniq -c"],
    ["Text", "cut", "Select columns by delimiter or character position", "cut -d, -f1,3 results.csv"],
    ["Text", "awk", "Column arithmetic and filtering", "awk '!/^[#@]/ {s+=$2} END {print s/NR}' energy.xvg"],
    ["Text", "sed", "Stream editor: search and replace", "sed -i 's/ref_t = 300/ref_t = 320/' md.mdp"],
    ["Text", "diff", "Show differences between two files", "diff -u old.mdp new.mdp"],
    ["Text", "paste", "Join files side by side, column-wise", "paste time.dat pot.dat > both.dat"],
    ["Text", "xargs", "Build commands from input lines", "find . -name '*.log' | xargs grep -l 'Fatal'"],
    ["Text", "tr", "Translate or delete characters", "tr ',' '\\t' < data.csv"],
    ["Remote", "ssh", "Log in to a remote machine", "ssh -J gateway.uni.edu user@cluster.uni.edu"],
    ["Remote", "ssh-keygen", "Create a key pair for password-less, safer login", "ssh-keygen -t ed25519"],
    ["Remote", "ssh-copy-id", "Install your public key on a server", "ssh-copy-id user@cluster.uni.edu"],
    ["Remote", "scp", "Copy files over SSH", "scp -r user@cluster:~/runs/T300 ."],
    ["Remote", "rsync", "Synchronise directories; only transfers what changed", "rsync -avzP --exclude '*.trr' user@cluster:~/runs/ runs/"],
    ["Remote", "tmux", "Keep a session alive after you disconnect", "tmux new -s md   (detach: Ctrl-b d)"],
    ["Remote", "wget / curl", "Download a file from the web", "curl -LO https://files.rcsb.org/download/1UBQ.pdb"],
    ["Archives", "tar", "Pack or unpack archives (c create, x extract, z gzip, f file)", "tar -czvf runs.tar.gz runs/"],
    ["Archives", "tar -tf", "List an archive's contents without extracting", "tar -tzf runs.tar.gz | head"],
    ["Archives", "gzip / gunzip", "Compress or decompress single files", "gzip -9 traj.xvg"],
    ["Archives", "zcat / zgrep", "Read or search compressed files directly", "zgrep 'Potential' md.log.gz"],
    ["Processes", "top / htop", "Live view of running processes and memory", "htop -u $USER"],
    ["Processes", "ps", "List processes", "ps aux | grep gmx"],
    ["Processes", "kill", "Stop a process by its ID; -9 forces it", "kill 12345"],
    ["Processes", "nohup … &", "Run a command that survives logout, in the background", "nohup gmx mdrun -deffnm md > run.out 2>&1 &"],
    ["Processes", "jobs / fg / bg", "Manage background jobs in this shell", "jobs"],
    ["Processes", "free -h", "Memory in use and available", "free -h"],
    ["Processes", "nvidia-smi", "GPU utilisation, memory and running processes", "watch -n 2 nvidia-smi"],
    ["Processes", "nproc / lscpu", "Number of cores and CPU details", "nproc"],
    ["Environment", "echo $VAR", "Print a variable", "echo $PATH"],
    ["Environment", "export", "Set an environment variable for this shell and its children", "export OMP_NUM_THREADS=8"],
    ["Environment", "which", "Show which executable a command runs", "which gmx python"],
    ["Environment", "source", "Run a script in the current shell (e.g. to set variables)", "source ~/.bashrc"],
    ["Environment", "alias", "Define a shortcut", "alias sq='squeue -u $USER'"],
    ["Environment", "history", "Previous commands; !N reruns number N", "history | grep rsync"],
    ["Environment", "module", "Load software on HPC systems (Lmod/Environment Modules)", "module load gromacs/2023.3"],
    ["Environment", "conda", "Create and use isolated Python environments", "conda create -n ml python=3.11 numpy scipy"],
    ["Environment", "pip", "Install Python packages into the active environment", "pip install mdanalysis"],
    ["Slurm", "sbatch", "Submit a batch job script", "sbatch submit.sh"],
    ["Slurm", "squeue", "Show queued and running jobs", "squeue -u $USER"],
    ["Slurm", "scancel", "Cancel a job", "scancel 123456"],
    ["Slurm", "sinfo", "Show partitions and node states", "sinfo -s"],
    ["Slurm", "sacct", "Accounting for finished jobs: time, memory, exit code", "sacct -j 123456 --format=JobID,Elapsed,MaxRSS,State"],
    ["Slurm", "srun", "Run a parallel step inside a job (or an interactive job)", "srun --pty -p debug -t 30 bash"],
    ["Slurm", "salloc", "Request an interactive allocation", "salloc -N 1 -n 8 -t 01:00:00"],
    ["Slurm", "scontrol", "Detailed job or node information", "scontrol show job 123456"],
    ["PBS", "qsub / qstat / qdel", "Submit, list and delete jobs on PBS/Torque systems", "qstat -u $USER"],
    ["Git", "git clone", "Copy a repository", "git clone https://github.com/user/project.git"],
    ["Git", "git status / diff", "See what changed", "git diff md.mdp"],
    ["Git", "git add / commit", "Record a snapshot of your work", "git add analysis.py && git commit -m 'Add RDF analysis'"],
    ["Git", "git log", "History of commits", "git log --oneline --graph"],
    ["Git", "git push / pull", "Share commits with a remote", "git pull --rebase && git push"],
    ["Simulation", "gmx grompp", "Preprocess: combine structure, topology and parameters into a .tpr", "gmx grompp -f md.mdp -c npt.gro -p topol.top -o md.tpr"],
    ["Simulation", "gmx mdrun", "Run GROMACS; -cpi continues from a checkpoint", "gmx mdrun -deffnm md -cpi md.cpt"],
    ["Simulation", "gmx energy", "Extract energies, temperature, density from an .edr", "echo Density | gmx energy -f md.edr -o density.xvg"],
    ["Simulation", "gmx trjconv", "Convert, centre or strip trajectories", "gmx trjconv -f md.xtc -s md.tpr -pbc mol -center -o whole.xtc"],
    ["Simulation", "lmp", "Run LAMMPS with an input script", "mpirun -np 16 lmp -in in.lj"],
    ["Simulation", "mpirun / srun", "Launch an MPI program on many cores", "mpirun -np 64 gmx_mpi mdrun -deffnm md"]
  ];
  const OPS = { "|": "pipe: the output of the command on the left becomes the input of the one on the right", ">": "redirect the output into a file, replacing its contents", ">>": "append the output to the end of a file", "2>": "redirect error messages into a file", "2>&1": "send error messages to the same place as normal output", "&&": "run the next command only if this one succeeded", "||": "run the next command only if this one failed", ";": "run the next command regardless of the result", "&": "run in the background and return the prompt immediately", "<": "read the input from a file" };
  const EX = {
    ls: ["list directory contents", { "-l": "long format: permissions, owner, size and date", "-a": "include hidden files (names starting with a dot)", "-h": "human-readable sizes (K, M, G)", "-t": "sort by modification time, newest first", "-r": "reverse the sort order", "-R": "recurse into subdirectories", "-S": "sort by file size", "-1": "one name per line" }],
    cd: ["change the working directory", {}], pwd: ["print the working directory", {}], cat: ["print files", { "-n": "number the lines" }], less: ["page through a file", {}],
    head: ["print the first lines", { "-n": "number of lines (takes a value)" }], tail: ["print the last lines", { "-n": "number of lines (takes a value; +N starts at line N)", "-f": "follow: keep printing as the file grows" }],
    grep: ["search for lines matching a pattern", { "-i": "ignore upper/lower case", "-n": "show line numbers", "-c": "count matching lines per file", "-v": "invert: show lines that do NOT match", "-l": "list only the names of files that match", "-L": "list files that do not match", "-r": "search directories recursively", "-w": "match whole words only", "-E": "extended regular expressions (|, +, ?)", "-F": "treat the pattern as plain text", "-o": "print only the matching part", "-A": "lines of context after each match (takes a value)", "-B": "lines of context before each match (takes a value)", "-C": "lines of context around each match (takes a value)", "-h": "do not print file names" }],
    find: ["search a directory tree", { "-name": "match the file name against a pattern (quote it)", "-iname": "like -name, ignoring case", "-type": "f for files, d for directories (takes a value)", "-size": "size filter, e.g. +1G (takes a value)", "-mtime": "modified N days ago, e.g. -7 (takes a value)", "-maxdepth": "how deep to descend (takes a value)", "-delete": "delete what is found (careful)", "-exec": "run a command on each result" }],
    wc: ["count lines, words and bytes", { "-l": "lines only", "-w": "words only", "-c": "bytes only" }],
    sort: ["sort lines", { "-n": "numeric sort", "-g": "general numeric sort (handles 1e-5)", "-r": "reverse", "-k": "sort by this field (takes a value)", "-t": "field separator (takes a value)", "-u": "drop duplicates", "-h": "sort human-readable sizes (2K, 1G)" }],
    uniq: ["collapse adjacent repeated lines (sort first)", { "-c": "prefix each line with its count", "-d": "only print duplicated lines" }],
    cut: ["select columns", { "-d": "delimiter (takes a value)", "-f": "fields to keep, e.g. 1,3 (takes a value)", "-c": "character positions, e.g. 18-20 (takes a value)" }],
    awk: ["pattern-action language for column data", { "-F": "field separator (takes a value)" }],
    sed: ["stream editor", { "-i": "edit the file in place", "-n": "print only lines explicitly printed", "-e": "add an editing command (takes a value)" }],
    cp: ["copy", { "-r": "copy directories recursively", "-a": "archive: recursive, preserving times and permissions", "-i": "ask before overwriting", "-v": "verbose", "-u": "copy only when the source is newer" }],
    mv: ["move or rename", { "-i": "ask before overwriting", "-v": "verbose", "-n": "never overwrite" }],
    rm: ["remove files", { "-r": "remove directories and their contents", "-f": "force: no questions, no errors for missing files", "-i": "ask before each removal" }],
    mkdir: ["make directories", { "-p": "create parents as needed; no error if it exists" }],
    ln: ["make links", { "-s": "symbolic link (a pointer to a path)", "-f": "replace an existing link" }],
    chmod: ["change permissions", { "-R": "recursively" }],
    du: ["disk usage", { "-s": "summary: one total per argument", "-h": "human-readable sizes", "-c": "grand total", "--max-depth": "how many directory levels to report" }],
    df: ["free disk space", { "-h": "human-readable sizes" }],
    tar: ["create or extract archives", { "-c": "create an archive", "-x": "extract", "-t": "list contents", "-z": "gzip compression (.tar.gz)", "-j": "bzip2 compression (.tar.bz2)", "-J": "xz compression", "-v": "verbose: list files as they are processed", "-f": "archive file name (takes a value; must come last in a group)", "-C": "change to this directory first (takes a value)" }],
    gzip: ["compress files", { "-d": "decompress", "-k": "keep the original", "-9": "best compression" }],
    ssh: ["log in to a remote machine securely", { "-p": "port (takes a value)", "-i": "identity (private key) file (takes a value)", "-J": "jump through this gateway host first (takes a value)", "-L": "forward a local port, e.g. 8888:localhost:8888 for Jupyter (takes a value)", "-X": "forward X11 graphics", "-Y": "trusted X11 forwarding", "-v": "verbose, for debugging connections" }],
    scp: ["copy files over SSH", { "-r": "copy directories", "-P": "port (takes a value)", "-C": "compress during transfer", "-i": "identity file (takes a value)" }],
    rsync: ["synchronise files, locally or over SSH", { "-a": "archive: recursive, keep times, permissions and links", "-v": "verbose", "-z": "compress during transfer", "-P": "show progress and keep partial files (resumable)", "-n": "dry run: show what would happen", "--delete": "delete files at the destination that no longer exist at the source", "--exclude": "skip files matching a pattern (takes a value)", "--progress": "show progress", "-e": "remote shell to use, e.g. 'ssh -p 2222' (takes a value)" }],
    "ssh-keygen": ["generate an SSH key pair", { "-t": "key type, e.g. ed25519 (takes a value)", "-C": "comment, often your e-mail (takes a value)" }],
    kill: ["send a signal to a process", { "-9": "SIGKILL: stop immediately, no clean-up", "-15": "SIGTERM: ask politely (the default)" }],
    ps: ["list processes", { "aux": "all processes of all users, with CPU and memory", "-u": "processes of one user (takes a value)", "-ef": "full listing of all processes" }],
    top: ["live process monitor", { "-u": "only this user's processes (takes a value)" }], htop: ["interactive process monitor", { "-u": "only this user's processes (takes a value)" }],
    nohup: ["run a command immune to hang-ups (logout)", {}], echo: ["print arguments", { "-e": "interpret escapes like \\n", "-n": "no trailing newline" }],
    export: ["set an environment variable for child processes", {}], source: ["run a script in the current shell", {}], which: ["locate a command", {}],
    sbatch: ["submit a Slurm batch job", { "--job-name": "name shown in the queue", "-J": "job name (takes a value)", "-N": "number of nodes (takes a value)", "-n": "number of tasks (takes a value)", "-t": "time limit (takes a value)", "-p": "partition (takes a value)", "--gres": "generic resources, e.g. gpu:1", "--dependency": "start only after another job, e.g. afterok:123" }],
    squeue: ["show the Slurm queue", { "-u": "only this user's jobs (takes a value)", "-j": "only this job (takes a value)", "--start": "estimated start times", "-p": "only this partition (takes a value)" }],
    scancel: ["cancel Slurm jobs", { "-u": "all jobs of a user (takes a value)", "-n": "jobs with this name (takes a value)" }],
    sacct: ["Slurm accounting for past jobs", { "-j": "job ID (takes a value)", "--format": "columns to show", "-S": "start date (takes a value)" }],
    srun: ["launch a parallel job step or interactive job", { "--pty": "attach a terminal (interactive)", "-p": "partition (takes a value)", "-t": "time limit (takes a value)", "-n": "tasks (takes a value)", "-N": "nodes (takes a value)" }],
    mpirun: ["start an MPI program", { "-np": "number of processes (takes a value)", "-n": "number of processes (takes a value)" }],
    curl: ["transfer data from URLs", { "-L": "follow redirects", "-O": "save under the remote file name", "-o": "save under this name (takes a value)", "-s": "silent" }],
    wget: ["download files", { "-c": "continue a partial download", "-O": "output file name (takes a value)" }],
    diff: ["compare files", { "-u": "unified format (the usual one)", "-r": "compare directories recursively", "-q": "only report whether files differ" }],
    xargs: ["run a command with arguments read from input", { "-n": "arguments per command (takes a value)", "-P": "run this many in parallel (takes a value)", "-0": "input separated by null characters (use with find -print0)" }],
    paste: ["merge lines of files side by side", { "-d": "delimiter (takes a value)" }], tr: ["translate characters", { "-d": "delete these characters" }],
    free: ["show memory", { "-h": "human-readable" }], watch: ["re-run a command periodically", { "-n": "interval in seconds (takes a value)" }],
    tree: ["show a directory tree", { "-L": "depth (takes a value)", "-d": "directories only" }],
    module: ["load software environments on HPC systems", { load: "add a package to your environment", avail: "list available packages", list: "show what is loaded", purge: "unload everything", spider: "search all versions of a package", unload: "remove a package" }],
    conda: ["manage Python environments and packages", { create: "make a new environment", activate: "switch to an environment", install: "install packages", "-n": "environment name (takes a value)", "-c": "channel, e.g. conda-forge (takes a value)", env: "environment subcommands (export, list)", list: "list installed packages" }],
    git: ["version control", { clone: "copy a repository", status: "show changed files", add: "stage changes", commit: "record staged changes", push: "upload commits", pull: "download and merge commits", log: "show history", diff: "show changes", "-m": "commit message (takes a value)", "--oneline": "one line per commit", "--rebase": "replay local commits on top of the remote ones" }],
    gmx: ["the GROMACS command-line tool", { grompp: "preprocess inputs into a run file (.tpr)", mdrun: "run the simulation", energy: "extract energy terms", trjconv: "convert or process trajectories", rdf: "radial distribution functions", "-f": "input file (takes a value)", "-c": "structure file (takes a value)", "-p": "topology (takes a value)", "-o": "output file (takes a value)", "-s": "run input (.tpr) (takes a value)", "-deffnm": "default base name for all files (takes a value)", "-cpi": "continue from this checkpoint (takes a value)", "-nb": "where to compute non-bonded forces: cpu or gpu (takes a value)", "-pbc": "periodic-boundary treatment (takes a value)", "-center": "centre a group in the box" }],
    lmp: ["the LAMMPS executable", { "-in": "input script (takes a value)", "-log": "log file name (takes a value)", "-var": "set a variable (takes two values)" }]
  };
  ["lmp_serial", "lmp_mpi"].forEach(k => { EX[k] = EX.lmp; });
  EX["gmx_mpi"] = EX.gmx;
  EX.time = ["time how long the following command takes", {}]; EX.sudo = ["run the following command as administrator (not available on shared clusters)", {}];
  function explain(s) {
    const toks = []; let cur = "", q = null;
    for (let i = 0; i < s.length; i++) { const c = s[i];
      if (q) { cur += c; if (c === q) q = null; continue; }
      if (c === "'" || c === '"') { q = c; cur += c; continue; }
      if (/\s/.test(c)) { if (cur) toks.push(cur); cur = ""; continue; }
      const two = s.slice(i, i + 2), four = s.slice(i, i + 4);
      if (four === "2>&1") { if (cur) toks.push(cur); cur = ""; toks.push("2>&1"); i += 3; continue; }
      if (["&&", "||", ">>", "2>"].includes(two)) { if (cur) toks.push(cur); cur = ""; toks.push(two); i++; continue; }
      if ("|;&><".includes(c)) { if (cur) toks.push(cur); cur = ""; toks.push(c); continue; }
      cur += c; }
    if (cur) toks.push(cur);
    const items = []; let cmd = null, expectValue = null, pos = 0, redirNext = false;
    toks.forEach(t => {
      if (OPS[t]) { items.push([t, OPS[t], "op"]); cmd = t === "|" || t === "&&" || t === "||" || t === ";" || t === "&" ? null : cmd; redirNext = [">", ">>", "2>", "<"].includes(t); pos = 0; return; }
      if (redirNext) { items.push([t, "the file the output goes to (or comes from)", "file"]); redirNext = false; return; }
      if (expectValue) { items.push([t, "value for " + expectValue, "val"]); expectValue = null; return; }
      if (!cmd) { cmd = t; const e = EX[t]; items.push([t, e ? e[0] : "a command (not in this explainer's dictionary)", "cmd"]); pos = 0; return; }
      const e = EX[cmd], fl = e ? e[1] : {};
      if (fl[t] !== undefined) { items.push([t, fl[t].replace(" (takes a value)", "").replace(" (takes two values)", ""), "flag"]); if (/takes a value/.test(fl[t])) expectValue = t; return; }
      if (/^-[A-Za-z]{2,}$/.test(t) && !fl[t]) { // combined short flags, e.g. -xzvf
        const parts = t.slice(1).split("").map(ch => "-" + ch), known = parts.filter(p => fl[p] !== undefined);
        if (known.length === parts.length) { parts.forEach(p => items.push([p, fl[p].replace(" (takes a value; must come last in a group)", "").replace(" (takes a value)", ""), "flag"])); const lastF = parts[parts.length - 1]; if (/takes a value/.test(fl[lastF])) expectValue = lastF; return; }
      }
      if (/^--?[\w-]+=/.test(t)) { const [k, v] = t.split("="); items.push([t, (fl[k] ? fl[k].replace(" (takes a value)", "") : "option " + k) + " = " + v, "flag"]); return; }
      if (t.startsWith("-")) { items.push([t, "an option of " + cmd + " (see man " + cmd + ")", "flag"]); return; }
      if (["nohup", "time", "watch", "sudo", "xargs", "srun", "mpirun", "env"].includes(cmd)) { const w = cmd; cmd = t; const e2 = EX[t]; items.push([t, (e2 ? e2[0] : "a command") + " (launched by " + w + ")", "cmd"]); pos = 0; return; }
      pos++;
      let what = "argument";
      if (/^\$\w+/.test(t)) what = "a shell variable, replaced by its value";
      else if (/^'.*'$|^".*"$/.test(t)) what = cmd === "grep" && pos === 1 ? "the pattern to search for (quoted so the shell leaves it alone)" : cmd === "awk" ? "the awk program" : cmd === "sed" ? "the sed script (s/old/new/ substitutes)" : "a quoted argument, passed as-is";
      else if (cmd === "grep" && pos === 1) what = "the pattern to search for";
      else if (/@/.test(t) && /:/.test(t)) what = "a remote location, user@host:path";
      else if (/@/.test(t)) what = "the remote user and host to connect to";
      else if (/[*?]/.test(t)) what = "a wildcard pattern, expanded by the shell into matching file names";
      else if (/^\d+$/.test(t) && (cmd === "kill" || cmd === "scancel")) what = "a process or job ID";
      else if (cmd === "chmod" && pos === 1) what = "the permission change: +x adds execute; 755 is rwxr-xr-x";
      else if (fl[t] !== undefined) what = fl[t];
      else if (/[/.]/.test(t) || /^~/.test(t)) what = "a file or directory path";
      items.push([t, what, "arg"]);
    });
    return items;
  }
  LW.register("cmdexplain", function (root) {
    const box = LW.h("div", { class: "cx" }); root.append(box);
    const inp = LW.h("input", { class: "cx-in", type: "text", spellcheck: "false", autocapitalize: "off", value: "rsync -avzP --exclude '*.trr' user@cluster:~/runs/ runs/", "aria-label": "Command to explain" });
    const outEl = LW.h("div", { class: "cx-out", "aria-live": "polite" });
    box.append(inp, outEl);
    const ex = LW.h("div", { class: "cx-ex" }, LW.h("span", { text: "Try: " }));
    ["tar -czvf runs.tar.gz runs/ && rm -r runs/", "grep -rn 'Fatal error' . | head -5", "find . -name '*.xtc' -mtime -7 -size +1G", "ssh -L 8888:localhost:8888 user@cluster", "nohup gmx mdrun -deffnm md -nb gpu > run.out 2>&1 &", "sbatch --dependency=afterok:123456 analyse.sh"].forEach(c => ex.append(LW.h("button", { type: "button", text: c, onclick: () => { inp.value = c; render(); } })));
    box.append(ex);
    function render() { const items = explain(inp.value); outEl.innerHTML = items.map(([t, d, k]) => `<div class="cx-i cx-${k}"><code>${LW.esc(t)}</code><span>${LW.esc(d)}</span></div>`).join("") || '<p class="lw-note">Type a command above.</p>'; }
    inp.addEventListener("input", render); render();
  });
  LW.register("cmdref", function (root) {
    let group = "All", query = "";
    const ctl = LW.h("div", { class: "cr-ctl" }); root.append(ctl);
    const search = LW.h("input", { type: "search", class: "cr-search", placeholder: "Search commands, e.g. copy, archive, GPU, queue…", "aria-label": "Search the command reference" });
    ctl.append(search);
    const groups = ["All", ...new Set(REF.map(r => r[0]))];
    const seg = LW.seg(ctl, { options: groups.map(g => [g, g]), value: "All", onChange: v => { group = v; draw(); } });
    const tableWrap = LW.h("div", { class: "cr-wrap" }); root.append(tableWrap);
    const count = LW.note(root, "");
    search.addEventListener("input", () => { query = search.value.toLowerCase(); draw(); });
    function draw() {
      const rows = REF.filter(r => (group === "All" || r[0] === group) && (!query || r.join(" ").toLowerCase().includes(query)));
      tableWrap.innerHTML = `<table class="cr"><thead><tr><th>Command</th><th>What it does</th><th>Example</th></tr></thead><tbody>${rows.map(r => `<tr><td><code>${LW.esc(r[1])}</code><small>${LW.esc(r[0])}</small></td><td>${LW.esc(r[2])}</td><td><code class="cr-ex" tabindex="0" title="Copy">${LW.esc(r[3])}</code></td></tr>`).join("")}</tbody></table>`;
      count.set(`${rows.length} of ${REF.length} commands. Click an example to copy it.`);
      LW.$$(".cr-ex", tableWrap).forEach(c => c.addEventListener("click", async () => { try { await navigator.clipboard.writeText(c.textContent); const o = c.textContent; c.textContent = "Copied"; setTimeout(() => { c.textContent = o; }, 900); } catch (e) { /* ignore */ } }));
    }
    draw();
  });
})();
