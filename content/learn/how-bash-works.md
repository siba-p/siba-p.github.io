---
title: "How the shell reads a command"
description: "The shell's read–expand–execute cycle, step by step: tokens and quoting, the order of expansions, redirections and pipes as rewired file descriptors, built-ins versus programs, environment variables and exit status, and the classic traps."
hook: "Store the name 'old runs' in a variable, pass it to rm without quotes, and bash tries to delete two things, old and runs. The reason is the fixed order in which the shell splits, expands and runs every line."
objectives:
  - "Trace a command line through tokenising, the expansions in order, and quote removal"
  - "Predict where output and errors go from redirections read left to right"
  - "Explain why unquoted variables split and why some commands must be built-ins"
  - "Interpret exit statuses such as 127, 137 and 139 when a command fails"
  - "Write safer scripts that avoid the quoting, subshell and pipeline traps"
cover: "cover.svg"
milestones:
  - year: 1973
    text: "Ken Thompson adds pipes to Unix, after years of urging by Doug McIlroy"
  - year: 1979
    text: "Stephen Bourne's shell ships with Version 7 Unix"
  - year: 1989
    text: "Brian Fox releases bash, the Bourne-Again Shell, for the GNU Project"
  - year: 2014
    text: "Stéphane Chazelas finds Shellshock, a bash bug present since 1989"
track: toolbox
weight: 3
level: Foundation
minutes: 40
lab: "Watch bash take a command line apart"
prereqs: ["linux-shell"]
---

## The shell is a program like any other

`bash` is an ordinary user program (it lives at `/bin/bash`) whose whole job is a loop: print a prompt, read a line, work out what it means, start the programs it names, wait for them, and repeat. Understanding the middle step, *working out what a line means*, removes almost all of the mystery from the command line: why spaces in file names break scripts, why `*` sometimes stays a star, why `cd` cannot be a separate program, and why `2>&1` must come after `>`.

The rules are old and have changed little. The first Unix shell, written by Ken Thompson, shipped with Version 1 of Unix in 1971; Stephen Bourne's rewrite, `sh`, came with Version 7 in 1979 and fixed the grammar that later shells follow: variables, quoting, `for` and `case`, here documents. Brian Fox wrote bash (the Bourne-Again Shell) for the GNU Project and released it in 1989, and Chet Ramey has maintained it since the early 1990s. POSIX standardised the common core in 1992, so the order of expansions described below holds, with small extensions, in `sh`, `dash`, `ksh` and `zsh` too. A job script written today is parsed by essentially the rules Bourne wrote down.

{{< note type="story" title="Garden hoses and pipes" >}}
In a 1964 Bell Labs memo, Doug McIlroy argued that programs should be connectable like lengths of garden hose, so that the output of one could be screwed onto the input of the next. The idea waited until 1973, when Ken Thompson added the `pipe` system call to Unix and the standard programs were rewritten to read from standard input and write to standard output. That convention, more than any single feature, is why `grep … | sort | uniq -c | head` works today with programs written decades apart by people who never met.
{{< /note >}}

## Four stages for every line

{{< widget name="bashflow" title="One command line, taken apart" caption="Edit the line or pick an example. Stage 1 splits it into tokens, stage 2 performs the expansions, stage 3 shows the processes that would be started and how their inputs and outputs are wired. Nothing is actually run." >}}

{{< note type="try" >}}
Type `ls *.log`, then `ls "*.log"`: in stage 2 the first becomes three file names and the second keeps its star. Compare `echo 'Hello $USER'` with `echo "Hello $USER"`. Then type `rm -r $dir/*`. The simulated shell has no variable `dir`, so stage 2 shrinks the argument to `/*`, which in a real shell matches every top-level directory: the reason `set -u` exists.
{{< /note >}}

### 1. Splitting into tokens

bash first cuts the line into **words** and **operators**. Operators are the characters with special meaning: `|`, `&`, `;`, `&&`, `||`, `<`, `>`, `>>`, parentheses. **Quotes** stop splitting: `"my run"` is one word, `my run` is two. Single quotes switch off *every* special meaning inside them; double quotes switch off splitting and wildcards but still allow `$` expansions.

### 2. Expansions, in a fixed order

Each word is then rewritten, always in the same order:

| Step | Example | Becomes |
|---|---|---|
| brace expansion | `T{300,320,340}` | `T300 T320 T340` |
| tilde expansion | `~/project` | `/home/student/project` |
| parameter (variable) expansion | `md_$T.mdp` | `md_320.mdp` |
| command substitution | `$(date +%A)` | the output of the command, e.g. `Friday` |
| arithmetic expansion | `$((2*T))` | `640` |
| word splitting | an unquoted `$VAR` holding `a b` | two words `a` and `b` |
| pathname expansion (globbing) | `*.log` | `md.log run1.log run2.log` |
| quote removal | `"Hello"` | `Hello` |

Strictly, the four steps from tilde to arithmetic expansion happen together, in a single left-to-right pass over each word; brace expansion always comes before them, and word splitting after.

Two consequences are worth remembering. Word splitting and globbing happen *after* variable expansion, and only to unquoted results, which is why **variables should almost always be quoted**: `"$file"`. And a glob that matches nothing is passed on unchanged, so `ls *.xyz` complains about a file literally called `*.xyz`.

{{< note type="try" title="Pause and predict" >}}
In a directory holding `md.log`, `run1.log` and `run2.log`, run `x='*.log'`. The single quotes stopped the star from being expanded during the assignment, so `x` holds the five characters `*.log`. What do `echo $x` and `echo "$x"` print? Decide before reading on.

The first prints `md.log run1.log run2.log`: the variable is expanded, and because the result is unquoted, pathname expansion then runs on it. The second prints `*.log`, because double quotes suppress globbing of the expanded value. A variable does not hold a pattern or a list of files; it holds text, and the quoting at the point of *use* decides whether that text is split and globbed.
{{< /note >}}

Two shell options change what happens to an unmatched glob. `shopt -s nullglob` makes it expand to nothing, so `for f in *.xyz` runs zero times instead of once with the literal pattern; `shopt -s failglob` makes it an error. `nullglob` is the right choice inside loops and the wrong one for arguments: with it set, `ls *.xyz` runs a bare `ls` and lists the whole directory.

### 3. Redirections, pipes and starting programs

Before running a command, bash sets up its **file descriptors** ([the chapter on the Linux system](../linux-architecture/)): 0 for input, 1 for output, 2 for errors.

{{< eq title="Redirection is rewiring" say="A redirection replaces one of a process's file descriptors before the program starts; the program never knows." >}}
$$ \underbrace{\textcolor{#4c6ef5}{0}}_{\text{stdin}} \leftarrow \texttt{< in.txt} \qquad \underbrace{\textcolor{#12a594}{1}}_{\text{stdout}} \rightarrow \texttt{> out.txt} \qquad \underbrace{\textcolor{#e64980}{2}}_{\text{stderr}} \rightarrow \texttt{2> err.txt} \qquad \textcolor{#e64980}{2} \rightarrow \textcolor{#12a594}{1}\;\;(\texttt{2>\&1}) $$
- $\textcolor{#4c6ef5}{0}$: where the program reads input
- $\textcolor{#12a594}{1}$: where normal output goes
- $\textcolor{#e64980}{2}$: where error messages go
{{< /eq >}}

Redirections are processed **left to right**. `cmd > log 2>&1` first points 1 at `log`, then makes 2 point wherever 1 now points: both go to the file. `cmd 2>&1 > log` makes 2 point at the terminal (where 1 pointed at that moment) and only then moves 1 to the file, so errors still appear on screen.

{{< fig src="redirect.svg" alt="Two rows of three descriptor tables. In the top row, where the output is redirected to the log first and errors are copied second, descriptor 1 moves to the log file and descriptor 2 then follows it. In the bottom row, with the opposite order, descriptor 2 is copied while 1 still points at the screen, so only descriptor 1 ends up in the log." caption="The descriptor table after each redirection, read left to right. Copying descriptor 2 from 1 is a single system call, `dup2(1, 2)`, made at one moment, not a permanent link, so the order of the two redirections decides where errors go." >}}

Underneath, `> log` is the system call `open("log", O_WRONLY|O_CREAT|O_TRUNC)` followed by `dup2(fd, 1)`, and `2>&1` is just `dup2(1, 2)`. `>>` opens with `O_APPEND` instead of `O_TRUNC`, so every write goes to the current end of the file; that is why two jobs appending to one log interleave their lines instead of overwriting each other. `&> log` is bash shorthand for `> log 2>&1`, and `2> /dev/null` discards errors by pointing descriptor 2 at a device that accepts and drops everything written to it.

A **pipe** `a | b` asks the kernel for a small buffer with two ends, connects `a`'s descriptor 1 to the writing end and `b`'s descriptor 0 to the reading end, and starts *both programs at once*. Data streams through while both run: `grep` can be filtering the first lines of a huge file before `cat` has finished reading it, and the file never has to fit in memory. When `b` stops reading (as `head` does after ten lines), `a` is told to stop.

The buffer has a fixed size, 64 KiB by default on Linux. A writer that gets ahead of its reader fills it and is then put to sleep by the kernel until the reader catches up, so a fast `cat` feeding a slow `awk` runs at the speed of `awk` and uses 64 KiB of buffer however large the file is. This back-pressure is what makes `zcat traj.xyz.gz | python analyse.py` practical for a 50 GB trajectory that could never be decompressed onto a 20 GB quota.

Then bash runs the command. If the first word is a **built-in** such as `cd`, `export`, `echo` or `source`, bash does the work itself. `cd` *must* be a built-in: it changes the current directory of the shell process itself, and a separate program could only change its own. Otherwise bash searches the directories listed in `$PATH`, in order, for an executable with that name (`type gmx` or `which gmx` shows which one wins) and starts it with fork and exec.

### 4. Exit status

Every program ends by returning a small number, its **exit status**: 0 for success, anything from 1 to 255 for failure. bash keeps the last one in `$?`. The operators `&&` and `||` act on it: `make && ./run` only runs if the build succeeded; `grep -q Fatal md.log || echo "no errors"` prints only if grep found nothing.

A few values are worth recognising on sight. **127** means the command was not found (a typo, or a module not loaded); **126** means it was found but could not be executed, usually for want of `chmod +x`. A program killed by a signal reports **128 plus the signal number**: 130 after Ctrl-C (SIGINT, 2), 137 after `kill -9` or the kernel's out-of-memory killer (SIGKILL, 9), and 139 after a segmentation fault (SIGSEGV, 11). A Fortran code that exits with 139 has hit the same memory fault described in [the chapter on the Linux system](../linux-architecture/), reported as a number. Two more appear in cluster logs: **136** is 128 + 8, a floating-point exception (SIGFPE) caught by a code compiled with `-ffpe-trap`, as in [the Fortran chapter](../fortran/), and **143** is 128 + 15, SIGTERM, which Slurm sends to a job at its time limit before following up with SIGKILL after a grace period (30 seconds by default).

## One line, traced from start to finish

The figure shows each stage on short examples. Here are all of them on one realistic line, typed at the end of a day to check a temperature series for crashed simulations. Suppose `T` holds 320, your home directory is `/home/student`, and the runs so far have left three log files:

```text
/home/student/runs/T300/md.log
/home/student/runs/T300/rerun.log
/home/student/runs/T320/md.log
```

```bash
grep -c 'Fatal error' ~/runs/T{300,$T}/*.log > "errors_$(date +%F).txt" 2>&1 || echo "no errors at $T K"
```

**Tokens and structure.** bash first finds the operators. `||` divides the line into two commands joined by a condition; `>` and `2>&1` mark redirections, which bash sets aside for later. The quoted `'Fatal error'` stays one word despite its space. Only the first command is expanded now: the `echo` is not touched until bash knows whether it will run at all.

**The first command's words, expansion by expansion.**

1. *Brace expansion* is purely textual and comes first: `~/runs/T{300,$T}/*.log` becomes two words, `~/runs/T300/*.log` and `~/runs/T$T/*.log`. The `$T` is carried along unexpanded.
2. *Tilde, parameter, command and arithmetic expansion* share one left-to-right pass. The leading `~` of each word becomes `/home/student` and `$T` becomes `320`, giving `/home/student/runs/T300/*.log` and `/home/student/runs/T320/*.log`.
3. *Word splitting* examines the results of unquoted expansions; `320` contains no spaces, so nothing splits.
4. *Pathname expansion* replaces each pattern with the matching names in sorted order: two files from `T300`, one from `T320`.
5. *Quote removal* strips the single quotes from `'Fatal error'`.

grep never sees a brace, a tilde, a dollar sign, a star or a quote. It receives exactly these words:

```text
argv[0]  grep
argv[1]  -c
argv[2]  Fatal error
argv[3]  /home/student/runs/T300/md.log
argv[4]  /home/student/runs/T300/rerun.log
argv[5]  /home/student/runs/T320/md.log
```

**Redirections.** bash now forks a child for grep, and only there are the redirection words expanded. `$(date +%F)` runs `date` in a subshell of its own and substitutes its output, minus the trailing newline, giving `errors_2026-11-17.txt`. The child opens that file as descriptor 1, makes descriptor 2 a copy of 1, and calls `execve` on the first `grep` found along `$PATH`. The shell's own descriptors are never touched.

**Exit status.** grep writes one count per file into the file and exits with 0 if any line matched, 1 if none did, and 2 if something went wrong. Only if the status is non-zero does bash turn to the second command, expand `"no errors at $T K"` into the single word `no errors at 320 K`, and run the built-in `echo` without starting a process.

**Watching it happen.** `set -x` makes bash print every command after expansion, prefixed by `+`, with a `++` line for each command substitution; `set +x` turns it off, and `bash -x script.sh` traces a whole script. For the line above it prints

```text
+ grep -c 'Fatal error' /home/student/runs/T300/md.log /home/student/runs/T300/rerun.log /home/student/runs/T320/md.log
++ date +%F
```

which confirms the order: the command's own words first, the substitution inside the redirection afterwards.

{{< note type="warn" title="A reassuring message that lies" >}}
Run the same line with `T=340` before any 340 K run exists. The pattern `~/runs/T340/*.log` matches nothing, so it reaches grep unchanged; grep reports *No such file or directory* and exits with 2, and because of `2>&1` the complaint goes into the file instead of onto your screen. `||` treats 2 exactly like 1, and the terminal cheerfully prints `no errors at 340 K`. When a status can mean either "nothing found" or "something broke", keep errors separate and test for the value you mean, as below.
{{< /note >}}

```bash
grep -c 'Fatal error' ~/runs/T{300,$T}/*.log > counts.txt 2> grep.err
case $? in
    0) echo "crashes found: see counts.txt" ;;
    1) echo "no errors at $T K" ;;
    *) echo "grep failed: see grep.err" ;;
esac
```

## Variables and the environment

`T=320` sets a **shell variable**, visible only to this shell. `export T` makes it an **environment variable**, copied into every program the shell starts; that is how settings such as `OMP_NUM_THREADS`, `CUDA_VISIBLE_DEVICES` and `PATH` reach your programs. Prefixing a single command, `OMP_NUM_THREADS=8 ./md`, sets the variable for that command alone.

At start-up an interactive bash reads `~/.bashrc` (login shells on some systems read `~/.bash_profile` instead). That is where aliases, `module load` lines and `PATH` additions go, which also means a broken `.bashrc` can break every job you submit.

## Where commands run: the shell, a child or a subshell

Every command runs in one of three places, and knowing which explains several puzzles. **Built-ins** and shell **functions** run inside the shell itself. **Programs** run in a child made by fork and exec, which inherits *copies* of the shell's environment variables, open files and current directory, and can change only its copies. **Subshells** are forked copies of the shell itself, created for `$( … )`, for commands grouped in `( … )`, and for each part of a pipeline.

**Running a script or sourcing it.** `./setup.sh` starts a new bash process, so any `cd`, `export` or variable it sets vanishes when it exits. `source setup.sh` (or `. setup.sh`) reads the same lines into your current shell. This is why `module` and `conda` are shell functions rather than ordinary programs: defined at login or by `conda init`, they run inside your shell and can change its `PATH` directly. `type module` confirms it.

**Variables set inside a pipeline disappear.** Here each side of the `|` runs in a subshell, so the counter is incremented in a copy and the last line prints 0:

```bash
count=0
grep -l 'Fatal error' runs/*/md.log | while read -r f; do count=$((count + 1)); done
echo "$count"                                   # 0, not the number of crashed runs
```

Feeding the loop by redirection instead, `done < <(grep -l 'Fatal error' runs/*/md.log)`, keeps it in the current shell. Conversely, a subshell is handy when you *want* changes to stay local: `(cd analysis && python plot.py)` leaves your shell where it was.

**What starting a program involves.** Running `grep` from the traced line takes three system calls, shown in the figure. `fork` makes the child, a copy of the shell process with its own process ID; Linux shares the parent's memory pages copy-on-write, so the copy is cheap until either side writes. The child applies the redirections to its own descriptor table and calls `execve`, which replaces the bash code in that process with the `grep` program while keeping the process ID and the open descriptors. The parent calls `wait` and sleeps until the child exits, then stores the status in `$?`. A built-in such as `echo` skips all three.

{{< fig src="fork-exec.svg" alt="A timeline with two lanes. The bash lane parses the line, forks a child, then waits until the child exits before running the built-in echo. The child lane is first a copy of bash, then opens the output file and duplicates descriptors, then calls execve and becomes grep." caption="Every external command costs a `fork`, an `execve` and a `wait`. Redirections are applied in the child between fork and exec, which is why they never disturb the shell's own descriptors. The process IDs are illustrative." >}}

{{< note type="practice" title="Back of the envelope" >}}
Those system calls are not free. On the Linux server used to test this chapter (bash 5.2), a loop of 10,000 iterations cost 4.6 µs per iteration with the built-in `x=$((i + 1))`, but 1.0 ms with an empty subshell `( : )`, 1.8 ms with the external program `/bin/true`, and 2.9 ms with `x=$(expr $i + 1)`, which forks for the substitution and then executes `expr`. The absolute values vary by a factor of a few between machines; the ratio of several hundred does not. A script that post-processes 20,000 frames by calling `awk`, `sed` and `bc` once per frame spends a minute or more just starting processes. One `awk` over the whole file, or bash arithmetic, does the same work in well under a second.
{{< /note >}}

{{< fig src="loop-cost.svg" alt="Horizontal bar chart on a logarithmic time axis. Built-in arithmetic takes 4.6 microseconds per loop iteration; a subshell 1.0 ms, a command substitution with echo 1.1 ms, running /bin/true 1.8 ms, and command substitution of expr 2.9 ms." caption="Measured cost of one loop iteration for five ways of doing almost nothing (medians of three runs of 10,000 iterations). Anything that forks costs about a millisecond; staying inside the shell costs microseconds." >}}

**Which `python` runs?** For a command name, bash tries aliases, then functions, then built-ins, and only then the directories of `$PATH` in order. `type -a python` lists every candidate in that order. It is the first check to make when a job picks up the system Python instead of the one in your environment. bash also remembers where it found each program in a hash table, so after you install a new `gmx` earlier in `$PATH` within the same session, `hash -r` makes it search again.

## Writing inputs and passing arguments

Two features account for most of the shell code in a simulation project: generating input files from templates, and passing lists of file names to other programs without breaking them apart.

**Here documents.** A here document feeds the lines up to a delimiter to a command's standard input, after parameter, command and arithmetic expansion:

```bash
for T in 300 320 340; do
    mkdir -p "T$T"
    cat > "T$T/md.mdp" <<EOF
integrator  = md
dt          = 0.002
nsteps      = $(( 200000 * 1000 / 2 ))   ; 200 ns at 2 fs
tcoupl      = v-rescale
ref_t       = $T
gen_temp    = $T
EOF
done
```

Each pass writes an input with `ref_t` set to 300, 320 or 340 and `nsteps = 100000000`. Quoting the delimiter, `<<'EOF'`, switches every expansion off and copies the text literally: the right choice when the body is itself a script full of dollar signs, such as an `awk` program or a job script generated by another script. With `<<-EOF`, leading tab characters (not spaces) are stripped, so the body can be indented inside a loop.

**Lists of arguments.** Inside a script or function, `"$@"` expands to the positional parameters as separate words, each kept intact: a wrapper `run() { gmx mdrun "$@"; }` passes `-deffnm "run 1"` through as two arguments, the second containing a space. `$*` and unquoted `$@` join and re-split them, so the same call would produce three. The same rule applies to arrays, the safe way to hold a list of file names:

```bash
logs=(runs/*/md.log)                  # globbing fills the array; names with spaces stay whole
echo "${#logs[@]} logs"               # number of elements
grep -c 'Fatal error' "${logs[@]}"    # every element as one word
```

{{< note type="practice" title="From the lab" >}}
A reproducible sweep usually has three files: a template input, a short bash driver like the loop above that writes one directory per parameter value, and a job-array script that runs whichever directory its task index points to ([Linux for simulation](../linux-for-simulation/) builds one). Make the driver refuse to overwrite, `[[ -e "T$T/md.mdp" ]] && { echo "T$T exists" >&2; exit 1; }`, and record what it did, `echo "$(date -Is) $0 $*" >> sweep.log`. Six months later, when a referee asks which thermostat the 340 K run used, the answer is one `grep` away.
{{< /note >}}

## Traps that catch everyone

{{< note type="warn" title="Unquoted variables" >}}
With `dir="old runs"`, the command `rm -r $dir` expands to `rm -r old runs`, deleting two different things. Worse, if `dir` is accidentally empty, `rm -r $dir/*` becomes `rm -r /*`. Always quote (`"$dir"`), and start scripts with `set -euo pipefail`: `-u` turns the use of an unset variable into an error instead of an empty string.
{{< /note >}}

- **Spaces around `=`.** `T = 320` runs a command called `T` with arguments `=` and `320`. Assignments have no spaces: `T=320`.
- **Single against double quotes.** `echo '$HOME'` prints `$HOME`; `echo "$HOME"` prints `/home/student`.
- **A pipeline's status is its last command's.** `false | true` succeeds. `set -o pipefail` makes a pipeline fail if any part fails.
- **Variables in brace ranges.** Brace expansion runs before variables are expanded, so with `T=340` the word `T{300..$T}` is not a valid range and comes out as `T{300..340}`. Use `for t in $(seq 300 20 "$T")` instead.
- **`ls` output is not for parsing.** Loop over a glob instead: `for f in *.log; do …; done`.
- **Windows line endings.** A script edited on Windows may end lines with `\r\n`; bash then reports `$'\r': command not found`. Convert with `dos2unix`.
- **Missing spaces in tests.** `[` is a command (a built-in, and also `/usr/bin/[`), and `]` is its last argument. `[ -f md.log]` passes the single word `md.log]` and fails with the complaint that `]` is missing. Inside `[[ … ]]`, a bash keyword rather than a command, unquoted variables are not word-split and `==` matches patterns: `[[ $f == *.log ]]`.

{{< note type="warn" title="Myth" >}}
**Myth:** `set -e` makes a script stop at the first command that fails.
**Reality:** it is switched off in several contexts: inside the condition of `if`, `while` or `until`, in every command of an `&&` or `||` list except the last, in every command of a pipeline except the last (unless `pipefail` is set), and after `!`. The exemption extends to everything called from those places. With `set -e`, the function `check() { false; echo still running; }` prints `still running` when called as `if check; then …`, because its whole body runs as part of an `if` condition. Treat `set -euo pipefail` as a safety net, and test the status of commands that matter explicitly, as in the `case` example above.
{{< /note >}}

{{< note type="fun" >}}
In September 2014 Stéphane Chazelas reported that bash executed commands appended to a function definition passed in through an environment variable. Any service that copied untrusted text into the environment before starting bash, as web servers running CGI scripts did with HTTP headers, could be made to run arbitrary commands. The bug, named Shellshock, had been in the code that lets `export -f` pass functions to child processes since 1989.
{{< /note >}}

{{< note type="key" >}}
- bash splits a line into words and operators, then expands each word in a fixed order: braces, tilde, variables, command substitution, arithmetic, word splitting, globbing, quote removal.
- Word splitting and globbing touch only unquoted results, so quote every variable.
- Redirections are applied left to right before the program starts; the programs in a pipeline run at the same time.
- Built-ins and functions run inside the shell; programs and subshells get copies of its state and cannot change the original.
- Exit status 0 means success, 127 means not found, and 128 + n means killed by signal n.
- Every external command costs a fork, an exec and a wait, about a millisecond; built-ins cost microseconds.
- Use `"$@"` and `"${array[@]}"` to pass lists without splitting, and here documents to write input files.
{{< /note >}}

{{< quiz >}}
- q: "Why must `cd` be built into the shell rather than be a program in /usr/bin?"
  options: ["For speed", "A separate process could only change its own current directory, not the shell's", "Because it needs root"]
  answer: 1
  why: "The current directory belongs to each process. Only code running inside the shell process can change the shell's directory."
- q: "With `dir=\"old runs\"`, what does `ls $dir` do?"
  options: ["Lists the directory “old runs”", "Tries to list two things, “old” and “runs”, because the unquoted value is split into words", "Prints “$dir”"]
  answer: 1
  why: "Word splitting happens after variable expansion for unquoted words. Write `ls \"$dir\"`."
- q: "Which command sends both normal output and errors to run.log?"
  options: ["`gmx mdrun 2>&1 > run.log`", "`gmx mdrun > run.log 2>&1`", "Both are equivalent"]
  answer: 1
  why: "Redirections are applied left to right. 1 must point at the file before 2 is duplicated from it."
- q: "In `cat big.xvg | grep -v '^#' | head -5`, when does grep start running?"
  options: ["After cat has read the whole file", "At the same time as cat: all three processes run concurrently, connected by pipes", "After head finishes"]
  answer: 1
  why: "bash starts every process of a pipeline at once; data flows through the kernel's pipe buffers as it is produced."
- q: "With `T=320`, what does `echo T{300..$T}` print?"
  options: ["`T300 T301 … T320`", "`T{300..320}`", "An error message"]
  answer: 1
  why: "Brace expansion runs before parameter expansion. At that moment the range still contains a dollar sign, so it is not a valid range and is left alone; only afterwards is the variable replaced by 320."
- q: "A job script's last command ends with exit status 137. What is the most likely cause?"
  options: ["The program chose to return 137", "It was killed by signal 9 (SIGKILL), since 137 = 128 + 9, often by the out-of-memory killer", "The command was not found"]
  answer: 1
  why: "A status above 128 means death by a signal: subtract 128 to get its number. Command not found would be 127."
- q: "In a directory containing `a.log` and `b.log`, with `x='*.log'`, what does `echo \"$x\"` print?"
  options: ["`a.log b.log`", "`*.log`", "Nothing"]
  answer: 1
  why: "Double quotes suppress word splitting and pathname expansion of the expanded value, so the star is printed literally. Unquoted, `echo $x` would print the two file names."
- q: "A script calls `awk` once for each of 20,000 frames. Roughly how long does starting the processes alone take?"
  options: ["About 20 ms", "Tens of seconds to a minute", "About a day"]
  answer: 1
  why: "Each fork and exec costs of the order of a millisecond, so 20,000 of them cost 20 s or more before any work is done. One awk over the whole file avoids it."
- q: "Why does `[ -f md.log]` fail?"
  options: ["`-f` is not a valid test", "`[` is a command whose last argument must be `]`; without the space it receives `md.log]` as one word", "Files cannot be tested with `[`"]
  answer: 1
  why: "Because `[` is an ordinary command, its arguments must be separate words. `[ -f md.log ]` works."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. C. Ramey and B. Fox, *Bash Reference Manual*, Free Software Foundation, gnu.org/software/bash/manual: §3.5 (shell expansions) and §3.6 (redirections) are the authority on everything above.
2. W. Shotts, *The Linux Command Line*, 2nd ed., No Starch Press (2019), chapters 7 (seeing the world as the shell sees it) and 24–36 (writing shell scripts).
3. G. Wooledge et al., “Bash Pitfalls” and “BashFAQ,” mywiki.wooledge.org, the best catalogue of shell traps.
4. B. W. Kernighan and R. Pike, *The UNIX Programming Environment*, Prentice Hall (1984), chapter 3 (using the shell).
5. M. Kerrisk, *The Linux Programming Interface*, No Starch Press (2010), chapters 24–27 (process creation and program execution) and 44 (pipes).
6. S. R. Bourne, “The UNIX shell,” *The Bell System Technical Journal* **57**, 1971–1990 (1978).
7. D. M. Ritchie and K. Thompson, “The UNIX time-sharing system,” *Communications of the ACM* **17**, 365–375 (1974).

</div>
