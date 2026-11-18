---
title: "Linux for simulation work"
description: "Working on clusters: SSH keys and configuration, moving data with rsync, sessions that survive disconnection, software modules and conda, the Slurm scheduler and job scripts, file systems and quotas. With a command explainer, a job-script builder and a searchable reference of about 75 commands."
hook: "Your simulation will run on a machine you never see, started by a scheduler you cannot argue with, writing to a scratch disk that may be wiped after a few weeks. Here is how to work with all three."
objectives:
  - "Set up SSH keys and a config file for quick, secure cluster logins"
  - "Move and archive simulation data safely with rsync, tar and checksums"
  - "Write a Slurm job script whose cores, threads, memory and time match the program"
  - "Estimate wall time, core-hours and storage for a run from a short benchmark"
  - "Run a parameter sweep as a job array, then diagnose and resubmit failed tasks"
cover: "cover.svg"
milestones:
  - year: 1994
    text: "Thomas Sterling and Donald Becker build Beowulf, a cluster of commodity PCs, at NASA"
  - year: 1995
    text: "Tatu Ylönen writes SSH after a password-sniffing attack at his university"
  - year: 1996
    text: "Andrew Tridgell and Paul Mackerras describe the rsync algorithm"
  - year: 2003
    text: "Yoo, Jette and Grondona describe Slurm, developed at Lawrence Livermore"
track: toolbox
weight: 4
level: Foundation
minutes: 55
lab: "Explain any command; build a Slurm script"
prereqs: ["linux-shell"]
---

## How a cluster is organised

A high-performance computing (HPC) cluster is many computers (**nodes**) connected by a fast network and sharing file systems. You log in to a **login node**, which is shared by everyone and meant for editing, compiling and submitting work. The calculations run on **compute nodes**, which you reach only through the **scheduler** (usually Slurm, sometimes PBS or LSF): you describe the resources you need in a **job script**, submit it, and the scheduler starts it when the resources are free.

{{< fig src="cluster.svg" alt="Schematic of a cluster. A laptop connects by ssh to two login nodes. From a login node, sbatch hands a job to the Slurm controller, which runs it on a grid of compute nodes, some with GPUs, joined by a fast interconnect. Below, three shared file systems, home, scratch and project, are mounted on every node." caption="The parts of a cluster that a user meets. You touch the login nodes directly and the compute nodes only through the scheduler; the shared file systems look the same from every node, while each compute node also has a private local disk." >}}

The numbers set the working habits. A current CPU node typically has two processors with 32 to 64 cores each and 256 to 512 GB of memory; a GPU node adds four or eight accelerators with 40 to 80 GB of memory each. The nodes are joined by an interconnect such as InfiniBand, with 100 to 400 Gb/s per link and latencies of one to two microseconds, about ten times lower than ordinary Ethernet. That latency is what lets a molecular dynamics code exchange halo atoms between nodes every 2 fs time step. The login nodes, by contrast, are a handful of machines shared by hundreds of users, which is why the rule below exists.

{{< note type="story" title="Clusters from shop-floor parts" >}}
In 1994 Thomas Sterling and Donald Becker, working at NASA's Goddard Space Flight Center, connected sixteen ordinary PCs with Ethernet and ran Linux on them. Their Beowulf cluster showed that commodity hardware, free software and message passing could do work that previously needed a purpose-built supercomputer. Within about a decade, clusters of this kind made up most of the TOP500 list of the world's fastest machines, and almost all of them now run Linux.
{{< /note >}}

{{< note type="warn" title="The first rule of shared clusters" >}}
Do not run simulations on the login node. It slows the machine down for every other user and the processes are usually killed automatically. Short tests belong in an interactive job (`srun --pty …` or `salloc`), everything else in a batch job.
{{< /note >}}

## Logging in with SSH, properly

`ssh user@cluster.university.edu` opens a remote shell. Typing a password every time is slow and less secure than a **key pair**: a private key that never leaves your computer and a public key that you install on the server.

```bash
ssh-keygen -t ed25519 -C "laptop key"        # creates ~/.ssh/id_ed25519 and id_ed25519.pub
ssh-copy-id user@cluster.university.edu       # appends the public key to the server's authorized_keys
```

Then give the cluster a short name in `~/.ssh/config`:

```text
Host cluster
    HostName login.cluster.university.edu
    User yourname
    IdentityFile ~/.ssh/id_ed25519
    ProxyJump gateway.university.edu      # only if you must go through a gateway first
```

Now `ssh cluster`, `scp file cluster:` and `rsync … cluster:` all work, and so does the remote mode of editors such as VS Code. Protect the private key with a passphrase and keep it readable only by you (`chmod 600`). An agent (`ssh-add` once per session; on macOS, `UseKeychain yes` in the config) holds the unlocked key so that the passphrase is typed once, not at every login. Two more config lines save time on sites with slow logins or two-factor authentication: `ControlMaster auto` with `ControlPath ~/.ssh/cm-%r@%h:%p` lets later `ssh`, `scp` and `rsync` calls reuse the first authenticated connection.

SSH replaced `telnet` and `rlogin`, which sent passwords across the network in plain text. Tatu Ylönen wrote the first version in 1995 at the Helsinki University of Technology after a password-sniffing attack on its network; the free OpenSSH implementation followed in 1999 and is what nearly every cluster runs today.

Port forwarding lets you use a remote service in your local browser, for example a Jupyter notebook running on the cluster:

```bash
ssh -L 8888:localhost:8888 cluster    # then open http://localhost:8888 on your laptop
```

## Moving data

`scp` copies files over SSH; `rsync` synchronises directories and transfers only what has changed, which makes it the right tool for simulation data:

```bash
rsync -avzP cluster:~/project/runs/ runs/                     # fetch, preserving times; resumable
rsync -avzP --exclude '*.trr' --exclude '*.cpt' cluster:~/project/runs/ runs/   # skip huge files
rsync -avn --delete runs/ cluster:~/backup/runs/              # -n: dry run first, ALWAYS with --delete
```

rsync is fast on a second run because of the algorithm Andrew Tridgell and Paul Mackerras published in 1996: for a file that exists on both sides, the receiver sends checksums of fixed-size blocks, and the sender finds matching blocks at any offset with a cheap rolling checksum, so only the changed bytes travel. By default rsync skips files whose size and modification time already match; `-c` compares full checksums instead, which is slower but catches silent corruption.

A trailing slash on the source (`runs/`) copies the *contents* of the directory; without it (`runs`) it copies the directory itself. Pack many small files before moving or archiving them, and check that the copy is intact:

```bash
tar -czf runs_2026-10.tar.gz runs/          # c create, z gzip, f file name
sha256sum runs_2026-10.tar.gz > runs_2026-10.sha256   # on macOS: shasum -a 256
sha256sum -c runs_2026-10.sha256            # verify after transfer
tar -xzf runs_2026-10.tar.gz                # x extract
```

{{< note type="practice" title="Back of the envelope" >}}
The temperature series planned below produces 120 GB of trajectories. Over a campus link that sustains 100 MB/s, copying them takes 1,200 s, twenty minutes. Over home broadband at 10 MB/s it takes three and a half hours, which is why analysis usually runs on the cluster and only reduced data (energies, RDFs, a few hundred frames) travels. The file count matters as much as the volume: per-file overheads of a few milliseconds turn a directory of one million 10 kB files (only 10 GB) into an hour of transfer. One `tar` file avoids that.
{{< /note >}}

## Sessions that survive a dropped connection

If your SSH connection drops, programs started in it are killed. **tmux** (or the older `screen`) keeps a session running on the server:

```bash
tmux new -s analysis       # start a named session
# ... work; press Ctrl-b then d to detach ...
tmux ls                    # list sessions after logging back in
tmux attach -t analysis    # reattach
```

For a single long command, `nohup command > out.log 2>&1 &` also survives logout, but on a cluster long runs should be batch jobs.

## Software: modules and environments

Clusters provide many versions of compilers, MPI libraries and simulation codes through **environment modules**:

```bash
module avail gromacs        # which versions exist?
module load gromacs/2023.3  # put one on your PATH
module list                 # what is loaded
module purge                # unload everything (start job scripts with this)
```

For Python, keep each project in its own **environment** so that package versions do not collide:

```bash
conda create -n mlip python=3.11 numpy scipy matplotlib
conda activate mlip
pip install mdanalysis ase
conda env export > environment.yml       # record exact versions for reproducibility
```

## Job scripts

A Slurm job script is a shell script whose `#SBATCH` comment lines request resources. The builder below writes one for common cases and explains every line; adjust the module names and partition to your cluster (`sinfo -s` lists partitions, `module avail` the software).

{{< widget name="slurm" title="Build a Slurm job script" caption="Choose a program and the resources; the script updates as you type. Core-hours are what your allocation is charged when the job runs to its time limit." >}}

{{< note type="try" >}}
Pick **GROMACS, MPI on CPUs** and raise the cores per task from 2 to 8: 32 ranks of 8 threads ask for 256 cores on one node, and the checker objects. Choose the GPU program and set GPUs to 0 to see another warning. Finally, tick the job-array box and watch the core-hours multiply by five.
{{< /note >}}

The essentials of resource requests:

- **Nodes, tasks and cores.** `--ntasks` is the number of MPI processes; `--cpus-per-task` is the number of threads each one runs (OpenMP); their product per node should not exceed the cores in a node. Set `OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK` so programs use exactly what was allocated.
- **GPUs.** Request them explicitly (`--gres=gpu:1` or `--gpus-per-node=1`, depending on the site). GPU codes usually want one to a few MPI ranks per GPU.
- **Time.** The job is killed at the limit, so ask for a little more than you need, and write checkpoints: GROMACS `-cpi`, LAMMPS `write_restart`. Shorter jobs start sooner because the scheduler can fit them into gaps (backfilling).
- **Memory.** Too little and the job is killed; far too much and it waits longer. After a job, `sacct -j JOBID --format=JobID,Elapsed,MaxRSS,State` shows what it actually used.

Monitoring and controlling jobs:

```bash
sbatch job.sh                                  # submit; prints the job ID
squeue -u $USER                                # your jobs: PD pending, R running
squeue -u $USER --start                        # estimated start times
scontrol show job 123456                       # full details, including why it is pending
scancel 123456                                 # cancel
sbatch --dependency=afterok:123456 analyse.sh  # start only after job 123456 succeeds
sacct -u $USER -S 2026-10-01 --format=JobID,JobName,Elapsed,State,ExitCode   # history
```

**Job arrays** run the same script many times with different inputs, with the index in `$SLURM_ARRAY_TASK_ID`: the natural way to run a temperature series or a set of independent replicas (tick the option in the builder).

### How the scheduler chooses the next job

Slurm orders pending jobs by a **priority** computed from several weighted factors, set by each site: how long the job has waited (age), how much the user's group has used recently compared with its share (fair-share, with past usage decaying over a half-life of typically a week), the job's size, and the partition and quality of service. `sprio -u $USER` shows the factors for your pending jobs and `sshare` your fair-share standing. A group that has burned through its share this week sees its jobs sink below those of a group that has been idle.

Strict priority order would leave nodes idle. If the top job needs all eight nodes of a partition, those nodes must drain as running jobs finish, and every node that frees up early would sit empty until the last one is done. **Backfilling** fills those gaps. The scheduler computes when the top job can start, reserves the nodes for that moment, and then lets lower-priority jobs start now, but only if they will finish before the reservation or use nodes the reservation does not need. David Lifka introduced this scheme, now called EASY backfilling, for the IBM SP at Argonne National Laboratory in 1995; Slurm's backfill scheduler extends it by planning reservations for many pending jobs, not just the first.

{{< fig src="backfill.svg" alt="Gantt chart of eight nodes over 46 hours. Two grey jobs are already running. A blue job needing all eight nodes for 12 hours gets a reservation at 9 hours. Three short teal jobs start earlier in the gaps and finish before 9 hours. A pink job asking for two nodes for 24 hours cannot fit before the reservation and starts only at 21 hours." caption="A simulation of EASY backfilling on eight nodes. J1 has the highest priority and reserves the whole partition from 9 h; the short jobs J3, J4 and J5 run in the gaps before then, while J2, which asked for 24 hours, would delay J1 and so waits until 21 h despite outranking the short jobs." >}}

The scheduler knows only the time you *request*, so the request decides whether your job can backfill. J2 in the figure would have started at once on two idle nodes had it asked for under nine hours. This is the practical case for splitting a long run into checkpointed segments of a few hours each, and for asking for the time a job needs plus a margin of 10 to 20 per cent, rather than the partition maximum.

{{< note type="warn" title="Myth" >}}
**Myth:** asking for the maximum time and memory is harmless, because you are charged only for what the job uses.
**Reality:** most sites do charge the elapsed time, but the request still costs you. A 48-hour request cannot backfill into a 6-hour gap, and on a busy machine it can wait days longer than the same job asking for 8 hours. An inflated `--mem` can stop the job fitting on nodes that are partly occupied. Look at `sacct`'s Elapsed and MaxRSS for a finished run and set the next request from them.
{{< /note >}}

## Where to keep files

Clusters usually have several file systems with different purposes:

| Location | Typical use | Notes |
|---|---|---|
| `$HOME` | scripts, source code, small inputs | small quota; usually backed up |
| scratch (`/scratch/$USER`) | running simulations, large temporary output | fast, large, **not backed up**, often purged after weeks of inactivity |
| project or work space | shared group data, results to keep | larger quota; check the backup policy |
| node-local disk (`$TMPDIR`) | very I/O-heavy temporary files during a job | erased when the job ends |

Check your usage with `quota`, `du -sh *` or the site's own tool, and copy anything you need to keep off scratch promptly.

Scratch on a large cluster is usually a **parallel file system** such as Lustre or IBM Storage Scale (GPFS). Lustre stripes each file across many object storage servers, so one large file can be read and written at tens of gigabytes per second, while a separate metadata server keeps track of names, sizes and permissions. Every `open`, `stat` and `ls -l` is a request to that metadata server, shared by every user of the machine. Sites therefore set quotas on the *number* of files (inodes) as well as on bytes, and `lfs quota -u $USER /scratch` shows both on Lustre.

{{< note type="warn" title="Myth" >}}
**Myth:** scratch is the fastest disk on the cluster, so it is fast for everything.
**Reality:** it is fast for large sequential reads and writes and slow for many small operations. A workflow that writes one 2 kB file per frame for 100,000 frames, or a Python environment of 50,000 small files imported by every task of a 500-task array, can slow the whole file system for everyone. Write trajectories in large binary files (`.xtc`, `.dcd`, HDF5), keep conda environments in home or project space or in a container image, and put files that a single job hammers on the node-local `$TMPDIR`, copying results back at the end of the job.
{{< /note >}}

## A day on the cluster

The commands above make most sense in sequence, so follow one realistic project from morning to evening: a solvated protein simulated with GROMACS at five temperatures from 300 to 340 K on a GPU partition. Partition and module names are placeholders for your own cluster's.

### Morning: take stock

```bash
ssh cluster                                   # key-based login, thanks to ~/.ssh/config
tmux attach -t work || tmux new -s work       # yesterday's session, or a fresh one
squeue -u $USER                               # running (R) or pending (PD)?
sacct -X -S $(date -d yesterday +%F) --format=JobID%-14,JobName,State,Elapsed,ExitCode
```

`-X` prints one line per job instead of one per job step, and the start of the window comes from `date`, a command substitution of the kind traced in [the previous chapter](../how-bash-works/). For a pending job, the last column of `squeue` gives the reason: `(Priority)` means others are ahead of you, `(Resources)` that you are next but the nodes are busy, `(Dependency)` that it waits for another job.

### Planning: a worked estimate

Before submitting five long jobs, measure. A 30-minute test of the 300 K system ends its `md.log` with a line such as

```text
               (ns/day)    (hour/ns)
Performance:     48.000        0.500
```

and a few minutes of arithmetic follow.

- **Wall time.** 200 ns at 48 ns/day takes 4.2 days, about 100 hours per temperature.
- **Segments.** The partition allows 24 hours, so each temperature needs five jobs, each continuing from the previous checkpoint. `gmx mdrun -maxh 23.5` makes GROMACS write a checkpoint and stop cleanly after 0.99 × 23.5 ≈ 23.3 hours, before Slurm kills it.
- **Cost.** Five temperatures × 100 hours is 500 GPU-hours, or 4,000 core-hours with 8 cores per GPU. Check that your allocation has them.
- **Storage.** A frame of 100,000 atoms in single precision is 100,000 × 3 × 4 bytes = 1.2 MB. Saving every 10 ps gives 20,000 frames: 24 GB per temperature before compression, 120 GB for the series. That belongs on scratch, and it is a reason to save only what you will analyse.

### One script, five temperatures

```bash
#!/bin/bash
#SBATCH --job-name=Tseries
#SBATCH --partition=gpu
#SBATCH --array=0-4                  # five tasks; the index is in $SLURM_ARRAY_TASK_ID
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=8
#SBATCH --gres=gpu:1
#SBATCH --mem=16G
#SBATCH --time=24:00:00
#SBATCH --output=logs/%x_%A_%a.out   # %A: array job ID, %a: task index

set -euo pipefail
module purge
module load gromacs/2023.3
export OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK

TEMPS=(300 310 320 330 340)
T=${TEMPS[$SLURM_ARRAY_TASK_ID]}
cd "$SLURM_SUBMIT_DIR/T$T"
echo "task $SLURM_ARRAY_TASK_ID: $T K on $(hostname), $(date)"

gmx mdrun -deffnm md -ntmpi 1 -ntomp "$OMP_NUM_THREADS" -nb gpu -cpi md.cpt -maxh 23.5
```

The array line turns one submission into five independent tasks, which may run at the same time on different nodes. Each task looks up its temperature in a bash array, moves into its own directory, and starts its run or, thanks to `-cpi md.cpt`, continues it. Every task gets its own log, such as `Tseries_4817352_3.out`. For a hundred replicas, `--array=0-99%10` would run at most ten at once. Submit all five segments in one go:

```bash
mkdir -p logs                                         # Slurm will not create it for you
jid=$(sbatch --parsable tseries.sh)                   # --parsable prints just the job ID
for seg in 2 3 4 5; do
    jid=$(sbatch --parsable --dependency=aftercorr:$jid tseries.sh)
done
```

`aftercorr` links consecutive arrays task by task: segment 2 at 320 K starts as soon as segment 1 at 320 K has finished successfully, whatever happens at the other temperatures. With `afterok`, one failed temperature would hold up every later segment of the series. Because `-maxh` lets mdrun stop on its own, each segment exits with status 0 and counts as a success.

{{< fig src="segments.svg" alt="Timeline of five temperature rows over 100 hours. The rows for 300 to 330 K each show four segments of 23.3 hours reaching 47, 93, 140 and 186 ns, and a short fifth segment reaching 200 ns at 100 hours. The 340 K row shows a first segment that fails after under four minutes and four dashed segments that never start." caption="The worked example drawn to scale: at 48 ns/day, each 23.3-hour segment adds 46.5 ns, so the fifth needs only 6.9 hours. With `aftercorr`, the failure at 340 K blocks only its own row. Real queues add waiting time between segments." >}}

{{< note type="practice" title="Scaling test before a big run" >}}
The 48 ns/day benchmark was measured on one GPU. Before asking for more, measure the speed-up $S(N) = t_1 / t_N$ on $N$ = 1, 2 and 4 GPUs or 1, 2, 4 and 8 CPU nodes and compute the parallel efficiency $E = S/N$. If two GPUs gave 80 ns/day, $E = 80/(2 \times 48) = 0.83$; if four gave 110 ns/day, $E = 0.57$, and the extra two GPUs buy 30 ns/day for the same charge as the first two. Many centres ask proposals to show efficiency above about 50 to 70 per cent at the requested size. For a five-temperature series, five one-GPU jobs running side by side are almost always a better use of an allocation than one temperature at a time on five GPUs. [The performance chapter](../python-performance/) explains why the efficiency falls, with Amdahl's law.
{{< /note >}}

### When a task fails

The next morning, `sacct -j 4817352 -X --format=JobID,State,ExitCode,Elapsed` shows the first segment's record:

```text
JobID             State ExitCode    Elapsed
------------ ---------- -------- ----------
4817352_0     COMPLETED      0:0   23:17:02
4817352_1     COMPLETED      0:0   23:16:48
4817352_2     COMPLETED      0:0   23:17:10
4817352_3     COMPLETED      0:0   23:16:55
4817352_4        FAILED      1:0   00:03:41
```

ExitCode is the exit status, then, after the colon, the signal that ended the job, if any. Task 4 (340 K) stopped by itself with status 1 after under four minutes, which points to the input or the physics rather than to resources. Other states point to other fixes:

| State | What happened | Usual fix |
|---|---|---|
| `TIMEOUT` | killed at the time limit | continue from the checkpoint; use `-maxh` or ask for more time |
| `OUT_OF_MEMORY` | used more than `--mem` | check `MaxRSS` (or `seff JOBID`, where installed) and ask for more |
| `FAILED` | the script exited with a non-zero status | read the logs |
| `NODE_FAIL` | the node itself failed | resubmit; not your fault |

So read the logs, the job's own and then GROMACS's:

```bash
tail -n 20 logs/Tseries_4817352_4.out
grep -n -B 2 -A 8 'Fatal error' T340/md.log
```

Here GROMACS stopped after a cascade of LINCS warnings: the 340 K system blew up within its first few thousand steps, the classic sign of a starting structure not equilibrated at that temperature or a time step too long for it. Once it is fixed, `sbatch --array=4 tseries.sh` reruns that task alone. Its queued follow-up segments can now never start (`squeue` shows the reason `DependencyNeverSatisfied`); cancel them with `scancel` and chain new ones the same way.

{{< note type="practice" title="From the lab" >}}
Make every job record what it ran, so that a result can be traced back months later without guesswork. Three lines near the top of the script do it: `module list 2>&1` (the loaded versions, which `module` prints on standard error), `git -C "$SLURM_SUBMIT_DIR" rev-parse HEAD` (the commit of your scripts and inputs, if they are under version control), and `sha256sum md.tpr` (a fingerprint of the exact input). All three go into the job's own log next to the hostname and date. When two runs that should agree do not, comparing these lines usually finds the cause in minutes: a different GROMACS build, an edited topology, or a `.tpr` regenerated while the job was queued.
{{< /note >}}

{{< note type="warn" title="Four ways a job script fails" >}}
- **The log directory does not exist.** Slurm does not create the directory named in `--output`; the job fails at once and leaves no log to explain why.
- **`conda activate` in a batch script.** Batch jobs run a non-interactive shell that does not read `~/.bashrc`, so the `conda` shell function is missing. Source `etc/profile.d/conda.sh` from your conda installation first.
- **Editing the inputs of a queued job.** Slurm stores a copy of the job script at submission, but input files are read only when the job starts. Regenerating `md.tpr` while the job waits changes what it will run.
- **`--ntasks=8` for a threaded program.** That requests eight one-core tasks, and `srun` would start eight copies. One program with eight threads needs `--ntasks=1 --cpus-per-task=8`.
{{< /note >}}

### Evening: before you log off

```bash
squeue -u $USER --start                       # when will the queued segments start?
du -sh /scratch/$USER/Tseries                 # how much space the series takes
quota                                         # or your site's own tool
```

From your laptop, pull home what is worth keeping, leaving full-precision trajectories and checkpoints behind:

```bash
rsync -avzP --exclude '*.trr' --exclude '*.cpt' cluster:/scratch/yourname/Tseries/ ~/research/Tseries/
```

Then detach from tmux with Ctrl-b d and log out. The jobs, and the tmux session, carry on without you.

{{< note type="fun" >}}
Slurm understands a little English. `sbatch --begin=teatime job.sh` holds a job until 4 pm, and the manual also accepts `elevenses` (11 am) and `fika` (3 pm), alongside the more sober `midnight` and `noon`.
{{< /note >}}

## Explain a command

When you meet an unfamiliar command line in a tutorial or a colleague's script, paste it here to see what every part does.

{{< widget name="cmdexplain" title="Command explainer" caption="Covers about 60 common commands and their options, pipes, redirections and wrappers such as nohup and mpirun. It explains; it does not run anything." >}}

## Reference

{{< widget name="cmdref" title="Command reference" caption="Search or filter by topic. Click an example to copy it." >}}

{{< note type="key" >}}
- Login nodes are for editing and submitting; computation reaches the compute nodes through the scheduler.
- SSH keys and a config file make access quick; rsync with a dry run moves data safely; tmux keeps sessions alive.
- A job script should request what the program will use: ranks × threads, GPUs, memory and time.
- Benchmark first, then estimate wall time, segments, core-hours and storage before submitting a series.
- Job arrays run sweeps; `sacct`'s State and ExitCode, then the logs, tell you why a task failed.
- Scratch is fast but temporary: copy off what you need to keep.
- Backfilling starts short jobs in gaps before a reservation, so accurate time requests start sooner.
- Parallel file systems are fast for large files and slow for many small ones: tar, use binary formats, use `$TMPDIR`.
{{< /note >}}

{{< quiz >}}
- q: "Where should a two-hour test simulation run on a shared cluster?"
  options: ["On the login node, since it is only a test", "In an interactive or batch job on a compute node", "On your laptop through SSH"]
  answer: 1
  why: "Login nodes are shared by all users for light work. Anything computationally heavy, including tests, belongs on compute nodes through the scheduler."
- q: "What is the safest way to try an `rsync … --delete` command for the first time?"
  options: ["Run it and check afterwards", "Add `-n` for a dry run and read what it would do", "Use scp instead"]
  answer: 1
  why: "`--delete` removes destination files absent from the source. `-n` (dry run) shows the transfers and deletions without performing them."
- q: "A job requests `--ntasks-per-node=4` and `--cpus-per-task=8`. How many cores per node does it use, and what should `OMP_NUM_THREADS` be?"
  options: ["4 cores; 4", "32 cores; 8", "8 cores; 32"]
  answer: 1
  why: "Four MPI ranks with eight threads each use 32 cores; each rank should run 8 OpenMP threads, i.e. `OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK`."
- q: "Your results live only in `/scratch/$USER`. What is the risk?"
  options: ["Scratch is slow", "Scratch is usually not backed up and may be purged automatically", "Other users can edit them"]
  answer: 1
  why: "Scratch is designed for speed and size, not safety. Copy results you need to project storage or off the cluster."
- q: "A benchmark gives 48 ns/day. You need 200 ns per temperature and the partition's time limit is 24 hours. How many 24-hour segments does each temperature need?"
  options: ["2", "5", "10"]
  answer: 1
  why: "200/48 ≈ 4.2 days, about 100 hours. Four segments give at most 96 hours, and less once each stops early with `-maxh`, so five are needed."
- q: "One task of a job array shows State `FAILED` and ExitCode `1:0` after three minutes; the other tasks completed. What do you do?"
  options: ["Resubmit the whole array with twice the memory", "Read that task's logs, fix the cause, and rerun only that index, for example with `sbatch --array=4`", "Ask for a longer time limit"]
  answer: 1
  why: "Status 1 with no signal, after a few minutes, means the program stopped itself with an error: an input or physics problem, not a resource limit. The completed tasks need not be rerun."
- q: "A large job holds a reservation that starts in 6 hours. Two equal-priority jobs each need one of the currently idle nodes: A requests 4 hours, B requests 24 hours. Which can start now?"
  options: ["Both", "Only A, because it finishes before the reservation", "Neither, because the large job has higher priority"]
  answer: 1
  why: "Backfilling lets a lower-priority job start only if it cannot delay the reservation. A ends before it; B would still occupy a node the reservation needs."
- q: "Which output pattern is kindest to a Lustre scratch file system?"
  options: ["One small text file per frame", "One large binary trajectory file per run", "One directory per frame"]
  answer: 1
  why: "Every file costs metadata operations on a server shared by all users. Large files are striped over many storage servers and read and written quickly."
- q: "Two GPUs give 80 ns/day where one gave 48 ns/day. What is the parallel efficiency?"
  options: ["About 0.6", "About 0.83", "About 1.67"]
  answer: 1
  why: "Speed-up S = 80/48 = 1.67; efficiency E = S/N = 1.67/2 = 0.83."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. Slurm documentation, slurm.schedmd.com: the `sbatch`, `srun`, `squeue` and `sacct` manual pages and the “Quick Start User Guide”.
2. HPC Carpentry, “Introduction to High-Performance Computing,” carpentries-incubator.github.io/hpc-intro.
3. M. W. Lucas, *SSH Mastery*, 2nd ed., Tilted Windmill Press (2018).
4. W. Shotts, *The Linux Command Line*, 2nd ed., No Starch Press (2019), chapters on networking, archiving and shell scripts.
5. B. P. Hogan, *tmux 3: Productive Mouse-Free Development*, Pragmatic Bookshelf (2023).
6. GROMACS documentation, “Getting good performance from mdrun,” manual.gromacs.org, for choosing ranks, threads and GPU offload.
7. A. B. Yoo, M. A. Jette and M. Grondona, “SLURM: Simple Linux Utility for Resource Management,” in *Job Scheduling Strategies for Parallel Processing*, Lecture Notes in Computer Science **2862**, 44–60, Springer (2003).
8. A. Tridgell and P. Mackerras, “The rsync algorithm,” Technical Report TR-CS-96-05, Australian National University (1996).
9. D. A. Lifka, “The ANL/IBM SP scheduling system,” in *Job Scheduling Strategies for Parallel Processing*, Lecture Notes in Computer Science **949**, 295–303, Springer (1995).

</div>
