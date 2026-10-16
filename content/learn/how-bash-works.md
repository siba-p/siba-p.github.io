---
title: "What bash does with a command line"
description: "The shell's read–expand–execute cycle, step by step: tokens and quoting, the order of expansions, redirections and pipes as rewired file descriptors, built-ins versus programs, environment variables and exit status, and the classic traps."
track: toolbox
weight: 2
level: Foundation
minutes: 40
lab: "Watch bash take a command line apart"
prereqs: ["linux-architecture"]
---

## The shell is a program like any other

`bash` is an ordinary user program (it lives at `/bin/bash`) whose whole job is a loop: print a prompt, read a line, work out what it means, start the programs it names, wait for them, and repeat. Understanding the middle step, *working out what a line means*, removes almost all of the mystery from the command line: why spaces in file names break scripts, why `*` sometimes stays a star, why `cd` cannot be a separate program, and why `2>&1` must come after `>`.

## Four stages for every line

{{< widget name="bashflow" title="One command line, taken apart" caption="Edit the line or pick an example. Stage 1 splits it into tokens, stage 2 performs the expansions, stage 3 shows the processes that would be started and how their inputs and outputs are wired. Nothing is actually run." >}}

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

Two consequences are worth remembering. Word splitting and globbing happen *after* variable expansion, and only to unquoted results, which is why **variables should almost always be quoted**: `"$file"`. And a glob that matches nothing is passed on unchanged, so `ls *.xyz` complains about a file literally called `*.xyz`.

### 3. Redirections, pipes and starting programs

Before running a command, bash sets up its **file descriptors** ([previous chapter](../linux-architecture/)): 0 for input, 1 for output, 2 for errors.

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

## Variables and the environment

`T=320` sets a **shell variable**, visible only to this shell. `export T` makes it an **environment variable**, copied into every program the shell starts; that is how settings such as `OMP_NUM_THREADS`, `CUDA_VISIBLE_DEVICES` and `PATH` reach your programs. Prefixing a single command, `OMP_NUM_THREADS=8 ./md`, sets the variable for that command alone.

At start-up an interactive bash reads `~/.bashrc` (login shells on some systems read `~/.bash_profile` instead). That is where aliases, `module load` lines and `PATH` additions go, which also means a broken `.bashrc` can break every job you submit.

## Traps that catch everyone

{{< note type="warn" title="Unquoted variables" >}}
With `dir="old runs"`, the command `rm -r $dir` expands to `rm -r old runs`, deleting two different things. Worse, if `dir` is accidentally empty, `rm -r $dir/*` becomes `rm -r /*`. Always quote (`"$dir"`), and start scripts with `set -euo pipefail`: `-u` turns the use of an unset variable into an error instead of an empty string.
{{< /note >}}

- **Spaces around `=`.** `T = 320` runs a command called `T` with arguments `=` and `320`. Assignments have no spaces: `T=320`.
- **Single against double quotes.** `echo '$HOME'` prints `$HOME`; `echo "$HOME"` prints `/home/student`.
- **A pipeline's status is its last command's.** `false | true` succeeds. `set -o pipefail` makes a pipeline fail if any part fails.
- **`ls` output is not for parsing.** Loop over a glob instead: `for f in *.log; do …; done`.
- **Windows line endings.** A script edited on Windows may end lines with `\r\n`; bash then reports `$'\r': command not found`. Convert with `dos2unix`.

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
{{< /quiz >}}

## References and further reading

<div class="refs">

1. C. Ramey and B. Fox, *Bash Reference Manual*, Free Software Foundation, gnu.org/software/bash/manual: §3.5 (shell expansions) and §3.6 (redirections) are the authority on everything above.
2. W. Shotts, *The Linux Command Line*, 2nd ed., No Starch Press (2019), chapters 7 (seeing the world as the shell sees it) and 24–36 (writing shell scripts).
3. G. Wooledge et al., “Bash Pitfalls” and “BashFAQ,” mywiki.wooledge.org, the best catalogue of shell traps.
4. B. W. Kernighan and R. Pike, *The UNIX Programming Environment*, Prentice Hall (1984), chapter 3 (using the shell).
5. M. Kerrisk, *The Linux Programming Interface*, No Starch Press (2010), chapters 24–27 (process creation and program execution) and 44 (pipes).

</div>
