/* 1.2 A Slurm job-script builder with explanations and sanity checks. */
(function () {
  "use strict";
  const PROGS = {
    gmxgpu: { name: "GROMACS on one GPU", mod: "gromacs/2023.3", run: "gmx mdrun -deffnm md -nb gpu -pme gpu -update gpu -ntmpi 1 -ntomp $OMP_NUM_THREADS", gpu: 1, ntasks: 1, cpt: 8 },
    gmxmpi: { name: "GROMACS, MPI on CPUs", mod: "gromacs/2023.3-mpi", run: "srun gmx_mpi mdrun -deffnm md -ntomp $OMP_NUM_THREADS", gpu: 0, ntasks: 32, cpt: 2 },
    lammps: { name: "LAMMPS, MPI on CPUs", mod: "lammps/2Aug2023", run: "srun lmp -in in.lammps -log log.lammps", gpu: 0, ntasks: 64, cpt: 1 },
    python: { name: "Python: train an ML model on a GPU", mod: "miniconda3", run: "python train.py --config config.yaml", gpu: 1, ntasks: 1, cpt: 8, conda: "mlip" }
  };
  LW.register("slurm", function (root) {
    const st = { prog: "gmxgpu", name: "md-T300", part: "gpu", nodes: 1, ntasks: 1, cpt: 8, gpu: 1, mem: 16, hours: 24, cpi: true, array: false, mail: false };
    const grid = LW.h("div", { class: "sl-grid" }); root.append(grid);
    const form = LW.h("div", { class: "sl-form" }), pre = LW.h("pre", { class: "sl-out" }); grid.append(form, LW.h("div", { class: "sl-right" }, pre));
    const copy = LW.button(grid.lastChild, "Copy script", async () => { try { await navigator.clipboard.writeText(pre.textContent); copy.textContent = "Copied"; } catch (e) { copy.textContent = "Select and copy"; } setTimeout(() => { copy.textContent = "Copy script"; }, 1200); }, { primary: true });
    const stats = LW.stats(root, [["cores", "cores requested"], ["ch", "core-hours if it runs to the limit"], ["gh", "GPU-hours"]]);
    const warn = LW.note(root, "");
    LW.seg(form, { label: "Program", options: Object.keys(PROGS).map(k => [k, PROGS[k].name]), value: st.prog, onChange: v => { st.prog = v; const p = PROGS[v]; st.gpu = p.gpu; st.ntasks = p.ntasks; st.cpt = p.cpt; st.part = p.gpu ? "gpu" : "cpu"; build(); } });
    const field = (label, key, type = "text", attrs = {}) => { const inp = LW.h("input", Object.assign({ type, value: st[key] }, attrs)); inp.addEventListener("input", () => { st[key] = type === "number" ? Math.max(+attrs.min || 0, +inp.value || 0) : inp.value.replace(/[^\w.-]/g, ""); render(); }); form.append(LW.h("label", { class: "sl-f" }, LW.h("span", { html: label }), inp)); return inp; };
    let inputs = {};
    function build() {
      LW.$$(".sl-f, .sl-c", form).forEach(e => e.remove());
      inputs.name = field("Job name", "name");
      inputs.part = field("Partition (queue)", "part");
      inputs.nodes = field("Nodes", "nodes", "number", { min: 1, max: 64 });
      inputs.ntasks = field("MPI tasks per node", "ntasks", "number", { min: 1, max: 256 });
      inputs.cpt = field("CPU cores per task (OpenMP threads)", "cpt", "number", { min: 1, max: 128 });
      inputs.gpu = field("GPUs per node", "gpu", "number", { min: 0, max: 8 });
      inputs.mem = field("Memory per node (GB)", "mem", "number", { min: 1, max: 1024 });
      inputs.hours = field("Time limit (hours)", "hours", "number", { min: 1, max: 168 });
      const c = LW.h("div", { class: "sl-c" }); form.append(c);
      LW.check(c, { label: "Continue from a checkpoint if one exists", value: st.cpi, onChange: v => { st.cpi = v; render(); } });
      LW.check(c, { label: "Job array: 5 temperatures in one submission", value: st.array, onChange: v => { st.array = v; render(); } });
      LW.check(c, { label: "E-mail me when it ends or fails", value: st.mail, onChange: v => { st.mail = v; render(); } });
      render();
    }
    function render() {
      const p = PROGS[st.prog], hh = String(Math.floor(st.hours)).padStart(2, "0"), L = [];
      const cmt = (line, c) => L.push(c ? line.padEnd(34) + "# " + c : line);
      L.push("#!/bin/bash");
      cmt(`#SBATCH --job-name=${st.name || "job"}`, "name shown by squeue");
      cmt(`#SBATCH --partition=${st.part || "standard"}`, "queue; list them with sinfo -s");
      cmt(`#SBATCH --nodes=${st.nodes}`);
      cmt(`#SBATCH --ntasks-per-node=${st.ntasks}`, "MPI ranks per node");
      cmt(`#SBATCH --cpus-per-task=${st.cpt}`, "threads per rank");
      if (st.gpu > 0) cmt(`#SBATCH --gres=gpu:${st.gpu}`, "some sites use --gpus-per-node");
      cmt(`#SBATCH --mem=${st.mem}G`, "per node");
      cmt(`#SBATCH --time=${hh}:00:00`, "hh:mm:ss; the job is killed at the limit");
      cmt(`#SBATCH --output=%x-%j.out`, "%x = job name, %j = job ID");
      if (st.array) cmt(`#SBATCH --array=0-4`, "five tasks, index in $SLURM_ARRAY_TASK_ID");
      if (st.mail) { cmt(`#SBATCH --mail-type=END,FAIL`); cmt(`#SBATCH --mail-user=you@university.edu`); }
      L.push("");
      L.push("set -euo pipefail                       # stop at the first error");
      L.push("module purge");
      cmt(`module load ${p.mod}`, "names are site-specific: module avail");
      if (p.conda) { L.push(`source activate ${p.conda} 2>/dev/null || conda activate ${p.conda}`); }
      L.push("export OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK");
      L.push("");
      if (st.array) { L.push("TEMPS=(300 310 320 330 340)"); L.push("T=${TEMPS[$SLURM_ARRAY_TASK_ID]}"); L.push("cd \"$SLURM_SUBMIT_DIR/T$T\"                # one directory per temperature"); }
      else L.push("cd \"$SLURM_SUBMIT_DIR\"");
      L.push("");
      L.push('echo "Job $SLURM_JOB_ID on $(hostname) started $(date)"');
      let run = p.run; if (st.cpi && /mdrun/.test(run)) run += " -cpi md.cpt";
      L.push(run);
      L.push('echo "Finished $(date)"');
      pre.textContent = L.join("\n") + "\n";
      const cores = st.nodes * st.ntasks * st.cpt;
      stats.set("cores", String(cores)); stats.set("ch", String(cores * st.hours * (st.array ? 5 : 1))); stats.set("gh", String(st.nodes * st.gpu * st.hours * (st.array ? 5 : 1)));
      const w = [];
      if (st.gpu > 0 && /mpi/i.test(st.prog) === false && st.ntasks > st.gpu * 4) w.push("Many MPI tasks for few GPUs: GPU codes usually want one to a few ranks per GPU.");
      if (st.gpu === 0 && /gpu/.test(p.run)) w.push("This command offloads work to a GPU, but no GPU is requested.");
      if (st.ntasks * st.cpt > 128) w.push("More than 128 cores per node is more than most nodes have; check with sinfo -o '%P %c %m %G'.");
      if (st.hours > 72) w.push("Long time limits wait longer in the queue. Prefer 24–48 h jobs that restart from checkpoints.");
      if (st.prog === "python" && st.nodes > 1) w.push("Multi-node training needs a distributed launcher (torchrun, srun with DDP); a plain python call uses one node.");
      warn.set(w.length ? "<b>Check:</b> " + w.join(" ") : "Submit with <code>sbatch job.sh</code>, watch with <code>squeue -u $USER</code>, and after it ends check time and memory with <code>sacct -j JOBID --format=JobID,Elapsed,MaxRSS,State</code>.");
    }
    build();
  });
})();
