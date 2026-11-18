---
title: "The Linux system"
description: "What an operating system is for, how Linux is built from hardware up to your programs, what a process, a system call, virtual memory and a file really are, and how the directory tree is organised."
hook: "Type ls and press Enter, and your shell first makes a copy of itself, then the copy turns into ls. That odd two-step, fork then exec, is how new programs start on Linux."
objectives:
  - "Explain what the kernel does and why programs reach hardware only through system calls"
  - "Describe how processes are created with fork and exec and controlled with signals"
  - "Explain how virtual memory isolates processes and why swapping slows a machine"
  - "Recognise file descriptors 0, 1 and 2 behind every redirection and pipe"
  - "Find your way around the Linux directory tree and inspect a machine's hardware"
cover: "cover.svg"
milestones:
  - year: 1969
    text: "Ken Thompson and Dennis Ritchie begin writing Unix at Bell Labs"
  - year: 1974
    text: "Ritchie and Thompson describe Unix in Communications of the ACM"
  - year: 1983
    text: "Richard Stallman announces the GNU project to build a free Unix-like system"
  - year: 1991
    text: "Linus Torvalds releases the first Linux kernel, version 0.01"
track: toolbox
weight: 1
level: Foundation
minutes: 45
lab: "Trace a command through the layers of Linux"
prereqs: ["inside-a-computer"]
---

## Why there is an operating system at all

The [previous chapters](../inside-a-computer/) showed a processor executing one program. A real computer runs hundreds at once: your shell, an editor, a simulation on 64 cores, a network daemon, someone else's job. Each believes it has the machine to itself. Something must share out the processor time, keep the programs from overwriting each other's memory, and give them a simple way to use disks, networks and GPUs without knowing how each device works. That something is the **operating system**, and its core, the part that is always running with full control of the hardware, is the **kernel**.

An operating system gives programs three illusions, its three great **abstractions**:

- a **process**: each program seems to have a processor of its own;
- **virtual memory**: each process seems to have a large, private memory of its own;
- **files**: storage, devices and even other programs look like named streams of bytes.

## Unix, Linux and GNU

Unix was written at Bell Labs from 1969 by Ken Thompson and Dennis Ritchie, who also created the C language to rewrite it portably. Its ideas (a hierarchical file system, small programs connected by pipes, everything as a file) shaped every system since. In 1991 Linus Torvalds, then a student in Helsinki, wrote a new Unix-like kernel, **Linux**, and released it freely. Combined with the GNU project's compiler, C library and command-line tools, it became a complete free operating system. Today Linux runs Android phones, most web servers, and every one of the world's 500 fastest supercomputers. A **distribution** (Ubuntu, Rocky, Debian, SUSE) packages the kernel with tools and an installer; clusters usually run an enterprise distribution such as Rocky Linux or RHEL.

{{< note type="story" title="Just a hobby" >}}
Thompson wrote the first Unix in 1969 on a little-used PDP-7 minicomputer, in assembly language; by 1973 the kernel had been rewritten in C, which made it the first widely used operating system that could be moved to new hardware by recompiling it. On 25 August 1991 Linus Torvalds posted to the Usenet group comp.os.minix that he was "doing a (free) operating system (just a hobby, won't be big and professional like gnu) for 386(486) AT clones". Version 0.01 followed in September. The kernel he started now has contributions from thousands of developers in each release, and the hobby runs the whole TOP500 list.
{{< /note >}}

## The layers

Linux is built in layers, each using only the one below it. Click any block to read what it does, then pick a command and step through what happens when you press Enter.

{{< widget name="linuxstack" title="The layers of a Linux system" caption="From the physical hardware at the bottom to your programs at the top. The dashed system-call layer is the only door between ordinary programs and the kernel." >}}

**User mode and kernel mode.** The processor itself enforces the division. Ordinary programs run in **user mode**, in which instructions that touch hardware or other programs' memory are forbidden; if a program tries, the processor stops it and the kernel kills it (the familiar *segmentation fault*). Only the kernel runs in **kernel mode**. A program that needs something done, such as reading a file, asks the kernel through a **system call**: a special instruction that switches the processor into kernel mode at a fixed entry point, where the kernel checks the request, does the work and switches back. Linux has about 350 system calls; a handful (`open`, `read`, `write`, `close`, `fork`, `execve`, `exit`, `mmap`) do most of the work. You can watch them: on Linux, `strace -c ls` counts every system call `ls` makes.

A system call is cheap by human standards and expensive by the processor's. Entering the kernel, checking the arguments and returning costs on the order of a hundred nanoseconds to a microsecond on current hardware, several hundred to a few thousand clock cycles, before any real work is done. That is why libraries **buffer**. When a C program calls `printf` or a Python program calls `print`, the text goes into a buffer in the program's own memory, and the library makes one `write` system call when the buffer fills (typically 4 to 8 KB) instead of one per line.

{{< note type="practice" title="From the lab" >}}
Buffering explains a classic cluster puzzle: a Python job prints its progress every step, yet the Slurm output file stays empty for an hour and then fills in a burst, or loses the last lines when the job is killed. The C library and Python both decide the buffering mode from what standard output is connected to. On a terminal it is **line-buffered**, flushed at every newline; redirected to a file, as it is in a batch job, it is **fully buffered**, flushed only when several kilobytes have accumulated. Run `python -u script.py`, set `PYTHONUNBUFFERED=1` in the job script, or call `print(..., flush=True)` for progress lines. Do not go to the other extreme and flush every line of a large data file: that turns one system call per 8 KB into one per line.
{{< /note >}}

## Processes

A **process** is a running program: its code, its memory, its open files and the processor state (registers, program counter) needed to resume it. Each has a number, the **PID**. New processes are created in a two-step dance that is pure Unix:

1. `fork()` makes an almost exact copy of the calling process;
2. the copy calls `execve()` to replace its program with a different one.

{{< fig src="fork-exec.svg" alt="Timeline with a user-mode band above and a kernel-mode band below. The bash process calls fork, then waits asleep in the kernel. A child process appears, runs briefly as a copy of bash, calls execve and continues as ls, makes several system calls, exits, and the kernel wakes bash, which prints the prompt." caption="What happens when bash runs `ls` with its output redirected to `files.txt`. Every downward excursion is a system call into the kernel. The child sets up the redirection while it is still a copy of bash; `execve` replaces the program but keeps the process number and the open file descriptors, so ls writes to `files.txt` without knowing it." >}}

That is how your shell starts every command, and why processes form a family tree (`pstree` shows it), all descended from process 1, `systemd`, which the kernel starts at boot. The **scheduler** decides which process runs on which core, switching between them many times a second, so that hundreds share a few cores fairly. A process can be running, waiting (for disk, network or a child), or stopped. Processes are controlled with **signals**: Ctrl-C sends `SIGINT`, `kill PID` sends `SIGTERM` (please stop), `kill -9 PID` sends `SIGKILL` (stop now, no clean-up).

### Why the two-step is cheap, and why it is useful

Copying a process sounds wasteful when the copy will immediately throw itself away, and for a 20 GB Python process it would be. The kernel avoids the copy with **copy-on-write**: after `fork`, parent and child share every physical page, marked read-only, and a page is duplicated only when one of them writes to it. A child that calls `execve` straight away therefore copies almost nothing. (On Linux the C library's `fork()` is implemented with the more general `clone` system call, which is what `strace` shows; `clone` with different flags also creates threads, which share their memory instead of copying it.)

The gap between the two steps is the useful part. Between `fork` and `execve`, the child is still running the shell's code, so it can rearrange its own file descriptors, change directory, set environment variables or lower its priority, and the new program inherits all of it. Redirection, pipes, `cd` in a subshell and environment variables all work this way, and none of the programs involved need to know about them.

When a process ends, its exit status waits in the kernel until the parent collects it with `wait`. In the meantime the process is a **zombie**, listed by `ps` with state `Z`. Other states in the `STAT` column are `R` (running or ready), `S` (sleeping, for example waiting for input), `T` (stopped, for example by Ctrl-Z) and `D` (uninterruptible sleep, almost always waiting for disk or a network file system). A process stuck in `D` on a hung NFS or Lustre mount often cannot be killed even with `kill -9` until the I/O completes, a frequent cause of jobs that refuse to die on clusters. If a parent exits first, its children are adopted by process 1, which collects their statuses.

The exit status itself is a small integer: 0 for success, 1 to 125 for errors the program reports itself. When a process is killed by signal $n$, bash reports $128 + n$. Two values are worth memorising for cluster work. **137** is $128 + 9$, death by `SIGKILL`, which on a batch system usually means the job exceeded its memory limit and was killed by the kernel's out-of-memory killer or by the scheduler. **139** is $128 + 11$, `SIGSEGV`, a segmentation fault: an out-of-bounds array access, a stack overflow from a large local array in Fortran or C, or a library compiled for a different processor.

{{< note type="warn" title="Myth" >}}
**Myth: `kill -9` is the way to stop a program.** `SIGKILL` cannot be caught, so the program gets no chance to finish writing its output, flush its buffers or remove its lock files. A simulation code killed this way can leave a truncated trajectory frame or a checkpoint half written. Send `SIGTERM` first with a plain `kill PID`; Slurm does the same when a job reaches its time limit, sending `SIGTERM` and following with `SIGKILL` only after a grace period. GROMACS, for instance, responds to `SIGTERM` by stopping at the next neighbour-search step and writing a checkpoint. Keep `-9` for processes that ignore everything else.
{{< /note >}}

## Virtual memory

Every process sees its own private address space, as if it had the machine's whole memory to itself. The kernel and the processor's **memory management unit** translate these **virtual addresses** to physical ones, in blocks called **pages** (usually 4 KB), using a **page table** per process.

{{< eq title="Address translation" say="The top bits of an address choose a page, the bottom bits a byte within it; only the page is translated." >}}
$$ \underbrace{\textcolor{#4c6ef5}{\text{virtual page}}\;\big|\;\textcolor{#12a594}{\text{offset}}}_{\text{virtual address}} \;\xrightarrow{\ \text{page table}\ }\; \underbrace{\textcolor{#f08c2e}{\text{physical frame}}\;\big|\;\textcolor{#12a594}{\text{offset}}}_{\text{physical address}} $$
- $\textcolor{#4c6ef5}{\text{virtual page}}$: which 4 KB page of the process's own space
- $\textcolor{#12a594}{\text{offset}}$: position inside the page, unchanged (12 bits for 4 KB)
- $\textcolor{#f08c2e}{\text{physical frame}}$: where that page actually is in RAM
{{< /eq >}}

{{< fig src="virtual-memory.svg" alt="Two columns of virtual pages for processes A and B, with arrows to frames in a central column of physical RAM. Both processes' 0x400000 pages map to different frames, both libc pages map to the same violet frame, A's stack page points to swap on disk, and both untouched heap pages have no arrow." caption="Two processes, one physical memory. The same virtual address 0x400000 maps to different frames in each process; read-only code such as the C library is mapped once and shared; pages never touched use no RAM; and a page not used for a while can live on disk until it is needed." >}}

On x86-64 the page table is not one table but a tree. A virtual address uses 48 bits: 12 for the offset within a 4 KB page and four groups of 9 bits, each indexing a 512-entry table that points to the next level. (Recent processors add a fifth level for 57-bit addresses.) Walking four levels on every memory access would be ruinous, so the processor caches recent translations in a **translation lookaside buffer** (TLB) of one or two thousand entries. With 4 KB pages those entries cover only a few megabytes; a code that wanders over a 10 GB array misses the TLB constantly and pays for the walk. Linux therefore also supports **huge pages** of 2 MB (and 1 GB), each covering 512 times as much memory per TLB entry, and its transparent huge pages feature uses them automatically for large allocations where it can. For large simulations and dense linear algebra this alone can be worth several percent of run time.

The consequences are everywhere in practice. Processes cannot read each other's memory, so a crashing program cannot corrupt another. Memory is assigned **lazily**: a program that allocates 100 GB but touches only 1 GB uses only 1 GB of RAM. Pages not used for a while can be moved to disk (**swap**), which is why an overloaded machine suddenly becomes thousands of times slower; clusters usually disable swap and kill jobs that exceed their memory request instead. And the kernel uses spare RAM as a **page cache** for files, which is why reading the same trajectory a second time is much faster than the first.

{{< fig src="swap-slowdown.svg" alt="Log–log plot of slowdown relative to RAM against the fraction of memory accesses that must wait for swap, with a pink curve for a hard disk rising to about 57 times at one access in a thousand and 557 times at one in a hundred, and a lower teal curve for an NVMe SSD." caption="Average access time $(1-p)\,t_{\text{RAM}} + p\,t_{\text{fault}}$ relative to $t_{\text{RAM}} = 90$ ns, using the latencies of [the previous chapter](../inside-a-computer/). The device latencies are lower bounds on a real page fault, which also costs kernel work, so actual slowdowns are larger." >}}

The arithmetic behind the cliff is short. If a fraction $p$ of memory accesses must wait for a page to come back from swap, the average access costs $(1-p)\,t_{\text{RAM}} + p\,t_{\text{fault}}$. With $t_{\text{RAM}} = 90$ ns and a 5 ms hard-disk seek, one access in a thousand makes the program 57 times slower and one in a hundred 557 times slower. An NVMe SSD at 80 µs softens the cliff (1.9 and 9.9 times) but does not remove it. A program whose working set fits in RAM never pays any of this, which is why swapping is a cliff rather than a slope.

Lazy allocation has a corollary. Because a request for memory reserves only addresses, Linux by default promises more memory than it has (**overcommit**), on the bet that most of it will never be touched. When the bet fails and RAM and swap are both exhausted, the kernel's **out-of-memory killer** chooses a process, usually the largest, and sends it `SIGKILL`. The program gets no error from `malloc` or `numpy.zeros`; it simply dies, with exit status 137, at whichever line first touched a page that could not be supplied.

{{< note type="warn" title="Myth" >}}
**Myth: `top` shows how much memory my program uses in the VIRT column.** VIRT (VSZ in `ps`) counts every virtual address the process has reserved, including untouched allocations, memory-mapped files and shared libraries; a Python process that imports PyTorch can show tens of gigabytes there. The physical memory in use is **RES** (RSS in `ps`, `VmRSS` in `/proc/PID/status`), and shared pages are counted in full in every process that maps them. Likewise, a `free` column near zero on a machine that has run for a while is not a problem: the kernel fills spare RAM with page cache and releases it on demand. The **available** column is the one that says how much a new program could use.
{{< /note >}}

## Files, and everything else that looks like one

To Linux, a **file** is a named sequence of bytes. Directories are files listing names; so are devices (`/dev/nvidia0`), pipes between processes, network sockets, and live information about the system (`/proc/cpuinfo`, `/proc/meminfo`, `/proc/PID/status`). One set of system calls (open, read, write, close) works on all of them. This is the famous Unix idea that **everything is a file**.

A running process refers to its open files by small integers, **file descriptors**. Three are open from the start: **0** standard input, **1** standard output, **2** standard error. Redirection (`>`) and pipes (`|`), which [the next chapter](../how-bash-works/) dissects, are nothing more than the shell rearranging these three numbers before it starts a program.

Each file's metadata (owner, permissions, size, times, where its data lives on disk) is kept in an **inode**; the name you see is just a directory entry pointing to it. Permissions are three sets of read, write and execute bits for the owner, the group and everyone else, and the special user **root** (the administrator) bypasses them all. On a shared cluster you are never root, which is why software comes from modules or from environments you install in your own directories.

Because names and inodes are separate, one inode can have several names (**hard links**, made with `ln`), and the data is freed only when the last name is removed *and* no process still has the file open. That second condition catches people on clusters. Deleting a 200 GB trajectory that a running job is still writing removes the name at once, but `df` shows no space freed until the job closes the file or ends; `lsof +L1` lists such deleted-but-open files. A **symbolic link** (`ln -s target name`) is different: a small file holding a path, which breaks if the target moves.

{{< note type="practice" title="From the lab" >}}
Parallel file systems such as Lustre and GPFS, the `/scratch` of most clusters, keep file contents on many storage servers but all names and inodes on a few metadata servers. They stream a single large file at many gigabytes per second, yet every `open`, `stat` and `ls -l` is a round trip to the metadata server. A workflow that writes a million 10 KB files (one per frame, or one per configuration in a high-throughput DFT screen) can slow the file system for every user on the cluster, and administrators often set quotas on the number of inodes for that reason. Write one HDF5, NetCDF or XTC file per run, or bundle small files with `tar` before moving them, and use the node-local disk (often `$TMPDIR`) for scratch files that a job creates and deletes. [Linux for simulation work](../linux-for-simulation/) covers where each kind of file belongs.
{{< /note >}}

## The directory tree

Linux has a single tree rooted at `/`; disks and network file systems are **mounted** at points inside it rather than having drive letters. The standard layout:

| Directory | What lives there |
|---|---|
| `/bin`, `/usr/bin` | programs (commands) for everyone |
| `/lib`, `/usr/lib` | shared libraries those programs use |
| `/etc` | system-wide configuration files |
| `/home/you` (`~`) | your files and personal settings (hidden "dot files" such as `.bashrc`) |
| `/tmp` | temporary files, often cleared on reboot |
| `/var` | changing data: logs (`/var/log`), spool files |
| `/opt`, `/usr/local` | software installed by hand |
| `/proc`, `/sys` | windows into the running kernel, not real files on disk |
| `/dev` | devices: disks, terminals, GPUs, and `/dev/null`, which swallows anything written to it |
| `/scratch`, `/work`, `/project` | cluster-specific: large, fast storage for jobs |

## Looking inside your own machine

These commands work on any Linux system (macOS has some under different names):

```bash
uname -a                 # kernel name and version
lscpu                    # processor: cores, threads, caches, vector extensions
free -h                  # memory in use, free and used as page cache
cat /proc/meminfo | head # the kernel's own memory accounting
df -h                    # mounted file systems and free space
ps -ef --forest | head   # the process family tree
top                      # live view of processes (q to quit)
strace -c python3 -c 'print(1)' 2>&1 | tail -15   # system calls of a tiny Python run
ldd $(which python3)     # the shared libraries a program depends on
```

{{< note type="key" >}}
- The kernel shares the hardware safely through three abstractions: processes, virtual memory and files.
- Programs run in user mode and reach the hardware only through system calls; that boundary is enforced by the processor itself.
- Processes are created by fork and exec, scheduled by the kernel, and talk to the world through file descriptors 0, 1 and 2.
- Virtual memory is lazy and paged: untouched memory costs nothing, swapping is a cliff, and RES, not VIRT, measures real use.
{{< /note >}}

{{< quiz >}}
- q: "Your program reads an array out of bounds and is killed with “Segmentation fault”. Who stopped it?"
  options: ["The compiler", "The processor's memory protection, which traps the illegal access, and the kernel, which then kills the process", "The shell"]
  answer: 1
  why: "The address was not mapped for the process, so the memory management unit raised a fault in hardware; the kernel handled it by sending SIGSEGV, which terminates the program."
- q: "How does bash start the program `cat`?"
  options: ["It loads cat's code into its own memory and jumps to it", "It calls fork() to clone itself, and the child calls execve() to become cat", "It asks systemd to start cat"]
  answer: 1
  why: "fork followed by exec is the Unix way of creating every new process."
- q: "Why can two processes both use virtual address 0x400000 without conflict?"
  options: ["They take turns", "Each process has its own page table, mapping the same virtual address to different physical memory", "Address 0x400000 is reserved"]
  answer: 1
  why: "Virtual memory gives every process a private address space; the hardware translates each process's addresses separately."
- q: "What are file descriptors 0, 1 and 2?"
  options: ["The first three files on the disk", "Standard input, standard output and standard error of a process", "The kernel's own files"]
  answer: 1
  why: "Every process starts with these three open. Redirection and pipes work by changing what they point to."
- q: "A batch job ends with exit status 137 and no error message. What is the most likely cause?"
  options: ["A segmentation fault", "It was killed with SIGKILL (128 + 9), typically for exceeding its memory limit", "It finished normally"]
  answer: 1
  why: "Bash reports death by signal n as 128 + n. SIGKILL is signal 9, sent by the out-of-memory killer or the scheduler when a job exceeds its memory; a segmentation fault gives 139."
- q: "Why is fork() fast even for a process using 20 GB of memory?"
  options: ["It only copies the first page", "Copy-on-write: parent and child share all pages until one of them writes, so almost nothing is copied", "The kernel compresses the memory"]
  answer: 1
  why: "Pages are shared read-only after fork and duplicated only on a write. A child that calls execve straight away copies almost nothing."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. R. H. Arpaci-Dusseau and A. C. Arpaci-Dusseau, *Operating Systems: Three Easy Pieces*, Arpaci-Dusseau Books (2018), free online at ostep.org: virtualisation, concurrency and persistence.
2. M. Kerrisk, *The Linux Programming Interface*, No Starch Press (2010), the definitive guide to Linux system calls.
3. D. M. Ritchie and K. Thompson, “The UNIX time-sharing system,” *Communications of the ACM* **17**(7), 365–375 (1974).
4. A. S. Tanenbaum and H. Bos, *Modern Operating Systems*, 4th ed., Pearson (2014).
5. R. Love, *Linux Kernel Development*, 3rd ed., Addison-Wesley (2010).
6. R. E. Bryant and D. R. O'Hallaron, *Computer Systems: A Programmer's Perspective*, 3rd ed., Pearson (2016), chapters 8 (exceptional control flow) and 9 (virtual memory).

</div>
