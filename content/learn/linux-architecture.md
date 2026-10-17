---
title: "The Linux system"
description: "What an operating system is for, how Linux is built from hardware up to your programs, what a process, a system call, virtual memory and a file really are, and how the directory tree is organised."
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

## The layers

Linux is built in layers, each using only the one below it. Click any block to read what it does, then pick a command and step through what happens when you press Enter.

{{< widget name="linuxstack" title="The layers of a Linux system" caption="From the physical hardware at the bottom to your programs at the top. The dashed system-call layer is the only door between ordinary programs and the kernel." >}}

**User mode and kernel mode.** The processor itself enforces the division. Ordinary programs run in **user mode**, in which instructions that touch hardware or other programs' memory are forbidden; if a program tries, the processor stops it and the kernel kills it (the familiar *segmentation fault*). Only the kernel runs in **kernel mode**. A program that needs something done, such as reading a file, asks the kernel through a **system call**: a special instruction that switches the processor into kernel mode at a fixed entry point, where the kernel checks the request, does the work and switches back. Linux has about 350 system calls; a handful (`open`, `read`, `write`, `close`, `fork`, `execve`, `exit`, `mmap`) do most of the work. You can watch them: on Linux, `strace -c ls` counts every system call `ls` makes.

## Processes

A **process** is a running program: its code, its memory, its open files and the processor state (registers, program counter) needed to resume it. Each has a number, the **PID**. New processes are created in a two-step dance that is pure Unix:

1. `fork()` makes an almost exact copy of the calling process;
2. the copy calls `execve()` to replace its program with a different one.

That is how your shell starts every command, and why processes form a family tree (`pstree` shows it), all descended from process 1, `systemd`, which the kernel starts at boot. The **scheduler** decides which process runs on which core, switching between them many times a second, so that hundreds share a few cores fairly. A process can be running, waiting (for disk, network or a child), or stopped. Processes are controlled with **signals**: Ctrl-C sends `SIGINT`, `kill PID` sends `SIGTERM` (please stop), `kill -9 PID` sends `SIGKILL` (stop now, no clean-up).

## Virtual memory

Every process sees its own private address space, as if it had the machine's whole memory to itself. The kernel and the processor's **memory management unit** translate these **virtual addresses** to physical ones, in blocks called **pages** (usually 4 KB), using a **page table** per process.

{{< eq title="Address translation" say="The top bits of an address choose a page, the bottom bits a byte within it; only the page is translated." >}}
$$ \underbrace{\textcolor{#4c6ef5}{\text{virtual page}}\;\big|\;\textcolor{#12a594}{\text{offset}}}_{\text{virtual address}} \;\xrightarrow{\ \text{page table}\ }\; \underbrace{\textcolor{#f08c2e}{\text{physical frame}}\;\big|\;\textcolor{#12a594}{\text{offset}}}_{\text{physical address}} $$
- $\textcolor{#4c6ef5}{\text{virtual page}}$: which 4 KB page of the process's own space
- $\textcolor{#12a594}{\text{offset}}$: position inside the page, unchanged (12 bits for 4 KB)
- $\textcolor{#f08c2e}{\text{physical frame}}$: where that page actually is in RAM
{{< /eq >}}

The consequences are everywhere in practice. Processes cannot read each other's memory, so a crashing program cannot corrupt another. Memory is assigned **lazily**: a program that allocates 100 GB but touches only 1 GB uses only 1 GB of RAM. Pages not used for a while can be moved to disk (**swap**), which is why an overloaded machine suddenly becomes thousands of times slower; clusters usually disable swap and kill jobs that exceed their memory request instead. And the kernel uses spare RAM as a **page cache** for files, which is why reading the same trajectory a second time is much faster than the first.

## Files, and everything else that looks like one

To Linux, a **file** is a named sequence of bytes. Directories are files listing names; so are devices (`/dev/nvidia0`), pipes between processes, network sockets, and live information about the system (`/proc/cpuinfo`, `/proc/meminfo`, `/proc/PID/status`). One set of system calls (open, read, write, close) works on all of them. This is the famous Unix idea that **everything is a file**.

A running process refers to its open files by small integers, **file descriptors**. Three are open from the start: **0** standard input, **1** standard output, **2** standard error. Redirection (`>`) and pipes (`|`), which [the next chapter](../how-bash-works/) dissects, are nothing more than the shell rearranging these three numbers before it starts a program.

Each file's metadata (owner, permissions, size, times, where its data lives on disk) is kept in an **inode**; the name you see is just a directory entry pointing to it. Permissions are three sets of read, write and execute bits for the owner, the group and everyone else, and the special user **root** (the administrator) bypasses them all. On a shared cluster you are never root, which is why software comes from modules or from environments you install in your own directories.

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
