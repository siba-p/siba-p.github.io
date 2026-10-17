---
title: "Linux for simulation work"
description: "Working on clusters: SSH keys and configuration, moving data with rsync, sessions that survive disconnection, software modules and conda, the Slurm scheduler and job scripts, file systems and quotas. With a command explainer, a job-script builder and a searchable reference of about 75 commands."
track: toolbox
weight: 4
level: Foundation
minutes: 55
lab: "Explain any command; build a Slurm script"
prereqs: ["linux-shell"]
---

## How a cluster is organised

A high-performance computing (HPC) cluster is many computers (**nodes**) connected by a fast network and sharing file systems. You log in to a **login node**, which is shared by everyone and meant for editing, compiling and submitting work. The calculations run on **compute nodes**, which you reach only through the **scheduler** (usually Slurm, sometimes PBS or LSF): you describe the resources you need in a **job script**, submit it, and the scheduler starts it when the resources are free.

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

Now `ssh cluster`, `scp file cluster:` and `rsync … cluster:` all work, and so does the remote mode of editors such as VS Code. Protect the private key with a passphrase and keep it readable only by you (`chmod 600`).

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

A trailing slash on the source (`runs/`) copies the *contents* of the directory; without it (`runs`) it copies the directory itself. Pack many small files before moving or archiving them, and check that the copy is intact:

```bash
tar -czf runs_2026-10.tar.gz runs/          # c create, z gzip, f file name
sha256sum runs_2026-10.tar.gz > runs_2026-10.sha256   # on macOS: shasum -a 256
sha256sum -c runs_2026-10.sha256            # verify after transfer
tar -xzf runs_2026-10.tar.gz                # x extract
```

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

## Where to keep files

Clusters usually have several file systems with different purposes:

| Location | Typical use | Notes |
|---|---|---|
| `$HOME` | scripts, source code, small inputs | small quota; usually backed up |
| scratch (`/scratch/$USER`) | running simulations, large temporary output | fast, large, **not backed up**, often purged after weeks of inactivity |
| project or work space | shared group data, results to keep | larger quota; check the backup policy |
| node-local disk (`$TMPDIR`) | very I/O-heavy temporary files during a job | erased when the job ends |

Check your usage with `quota`, `du -sh *` or the site's own tool, and copy anything you need to keep off scratch promptly.

## Explain a command

When you meet an unfamiliar command line in a tutorial or a colleague's script, paste it here to see what every part does.

{{< widget name="cmdexplain" title="Command explainer" caption="Covers about 60 common commands and their options, pipes, redirections and wrappers such as nohup and mpirun. It explains; it does not run anything." >}}

## Reference

{{< widget name="cmdref" title="Command reference" caption="Search or filter by topic. Click an example to copy it." >}}

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
{{< /quiz >}}

## References and further reading

<div class="refs">

1. Slurm documentation, slurm.schedmd.com: the `sbatch`, `srun`, `squeue` and `sacct` manual pages and the “Quick Start User Guide”.
2. HPC Carpentry, “Introduction to High-Performance Computing,” carpentries-incubator.github.io/hpc-intro.
3. M. W. Lucas, *SSH Mastery*, 2nd ed., Tilted Windmill Press (2018).
4. W. Shotts, *The Linux Command Line*, 2nd ed., No Starch Press (2019), chapters on networking, archiving and shell scripts.
5. B. P. Hogan, *tmux 3: Productive Mouse-Free Development*, Pragmatic Bookshelf (2023).
6. GROMACS documentation, “Getting good performance from mdrun,” manual.gromacs.org, for choosing ranks, threads and GPU offload.

</div>
