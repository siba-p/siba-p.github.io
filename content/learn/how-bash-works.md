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
track: toolbox
weight: 3
level: Foundation
minutes: 40
lab: "Watch bash take a command line apart"
prereqs: ["linux-shell"]
---

## The shell is a program like any other

`bash` is an ordinary user program (it lives at `/bin/bash`) whose whole job is a loop: print a prompt, read a line, work out what it means, start the programs it names, wait for them, and repeat. Understanding the middle step, *working out what a line means*, removes almost all of the mystery from the command line: why spaces in file names break scripts, why `*` sometimes stays a star, why `cd` cannot be a separate program, and why `2>&1` must come after `>`.

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

### 3. Redirections, pipes and starting programs

Before running a command, bash sets up its **file descriptors** ([the chapter on the Linux system](../linux-architecture/)): 0 for input, 1 for output, 2 for errors.

{{< eq title="Redirection is rewiring" say="A redirection replaces one of a process's file descriptors before the program starts; the program never knows." >}}
$$ \underbrace{\textcolor{#4c6ef5}{0}}_{\text{stdin}} \leftarrow \texttt{< in.txt} \qquad \underbrace{\textcolor{#12a594}{1}}_{\text{stdout}} \rightarrow \texttt{> out.txt} \qquad \underbrace{\textcolor{#e64980}{2}}_{\text{stderr}} \rightarrow \texttt{2> err.txt} \qquad \textcolor{#e64980}{2} \rightarrow \textcolor{#12a594}{1}\;\;(\texttt{2>\&1}) $$
- $\textcolor{#4c6ef5}{0}$: where the program reads input
- $\textcolor{#12a594}{1}$: where normal output goes
- $\textcolor{#e64980}{2}$: where error messages go
{{< /eq >}}

Redirections are processed **left to right**. `cmd > log 2>&1` first points 1 at `log`, then makes 2 point wherever 1 now points: both go to the file. `cmd 2>&1 > log` makes 2 point at the terminal (where 1 pointed at that moment) and only then moves 1 to the file, so errors still appear on screen.

A **pipe** `a | b` asks the kernel for a small buffer with two ends, connects `a`'s descriptor 1 to the writing end and `b`'s descriptor 0 to the reading end, and starts *both programs at once*. Data streams through while both run: `grep` can be filtering the first lines of a huge file before `cat` has finished reading it, and the file never has to fit in memory. When `b` stops reading (as `head` does after ten lines), `a` is told to stop.

Then bash runs the command. If the first word is a **built-in** such as `cd`, `export`, `echo` or `source`, bash does the work itself. `cd` *must* be a built-in: it changes the current directory of the shell process itself, and a separate program could only change its own. Otherwise bash searches the directories listed in `$PATH`, in order, for an executable with that name (`type gmx` or `which gmx` shows which one wins) and starts it with fork and exec.

### 4. Exit status

Every program ends by returning a small number, its **exit status**: 0 for success, anything from 1 to 255 for failure. bash keeps the last one in `$?`. The operators `&&` and `||` act on it: `make && ./run` only runs if the build succeeded; `grep -q Fatal md.log || echo "no errors"` prints only if grep found nothing.

A few values are worth recognising on sight. **127** means the command was not found (a typo, or a module not loaded); **126** means it was found but could not be executed, usually for want of `chmod +x`. A program killed by a signal reports **128 plus the signal number**: 130 after Ctrl-C (SIGINT, 2), 137 after `kill -9` or the kernel's out-of-memory killer (SIGKILL, 9), and 139 after a segmentation fault (SIGSEGV, 11). A Fortran code that exits with 139 has hit the same memory fault described in [the chapter on the Linux system](../linux-architecture/), reported as a number.

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

**Which `python` runs?** For a command name, bash tries aliases, then functions, then built-ins, and only then the directories of `$PATH` in order. `type -a python` lists every candidate in that order. It is the first check to make when a job picks up the system Python instead of the one in your environment.

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

{{< note type="key" >}}
- bash splits a line into words and operators, then expands each word in a fixed order: braces, tilde, variables, command substitution, arithmetic, word splitting, globbing, quote removal.
- Word splitting and globbing touch only unquoted results, so quote every variable.
- Redirections are applied left to right before the program starts; the programs in a pipeline run at the same time.
- Built-ins and functions run inside the shell; programs and subshells get copies of its state and cannot change the original.
- Exit status 0 means success, 127 means not found, and 128 + n means killed by signal n.
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
{{< /quiz >}}

## References and further reading

<div class="refs">

1. C. Ramey and B. Fox, *Bash Reference Manual*, Free Software Foundation, gnu.org/software/bash/manual: §3.5 (shell expansions) and §3.6 (redirections) are the authority on everything above.
2. W. Shotts, *The Linux Command Line*, 2nd ed., No Starch Press (2019), chapters 7 (seeing the world as the shell sees it) and 24–36 (writing shell scripts).
3. G. Wooledge et al., “Bash Pitfalls” and “BashFAQ,” mywiki.wooledge.org, the best catalogue of shell traps.
4. B. W. Kernighan and R. Pike, *The UNIX Programming Environment*, Prentice Hall (1984), chapter 3 (using the shell).
5. M. Kerrisk, *The Linux Programming Interface*, No Starch Press (2010), chapters 24–27 (process creation and program execution) and 44 (pipes).

</div>
