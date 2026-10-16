---
title: "The Linux shell"
description: "The command line from zero: the file-system tree, paths, the anatomy of a command, wildcards, pipes and redirection, permissions and your first scripts, practised in a terminal that runs in this page."
track: toolbox
weight: 1
level: Foundation
minutes: 50
lab: "A practice terminal with ten missions"
---

## Why the shell, in 2026

Nearly every scientific computer you will work on, from a cluster with ten thousand cores to a GPU workstation or a cloud machine, runs Linux and is reached through a text **shell**. Simulation codes are launched from it, job schedulers are driven from it, and the files they produce, often thousands of them, are far quicker to inspect, filter and move with a few commands than with any graphical tool. The shell also makes work **reproducible**: a command you typed can be saved in a script and run again next year, on another machine, with identical results.

A few terms. The **terminal** is the window; the **shell** is the program inside it that reads your commands and runs them. The common shells are `bash` (the default on most Linux systems) and `zsh` (the default on macOS); everything in this lesson works in both. macOS's tools are BSD versions that occasionally take slightly different options from the GNU versions on Linux, which is noted where it matters.

## The file system is a tree

Every file lives in one tree that starts at the **root**, written `/`. Your own files live in your **home directory**, written `~` (for example `/home/student`). A **path** names a location in the tree:

- an **absolute path** starts at the root: `/home/student/project/input/md.mdp`;
- a **relative path** starts at your current directory: `input/md.mdp`;
- `.` means "this directory" and `..` means "the directory above";
- names starting with a dot, such as `.bashrc`, are **hidden** from a plain `ls`.

Avoid spaces in file names (`run 1/` must then be quoted everywhere); use `run_1/` or `run-1/`.

## The anatomy of a command

```bash
ls -l -h runs/T300
```

A command is a **program name** (`ls`), then **options** that change its behaviour (`-l` long format, `-h` human-readable sizes; single-letter options can be combined as `-lh`), then **arguments**, usually files or directories (`runs/T300`). Long options start with two dashes (`--human-readable`). Every command documents itself: `man ls` opens its manual (press `q` to leave, `/word` to search), and most accept `--help`.

## Practise here

The terminal below runs entirely in this page, on a pretend file system containing a small simulation project: three GROMACS runs at different temperatures, one of which crashed. Nothing you type can affect your computer. Work through the missions; each turns green when you have done it, and each has a solution if you are stuck. Type `help` to see what the practice shell understands, use **Tab** to complete names and **↑** to recall previous commands.

{{< widget name="terminal" title="A practice shell" caption="A safe sandbox for the commands in this lesson. Reset the file system at any time." >}}

## Moving around and looking

| Command | What it does |
|---|---|
| `pwd` | print the working directory |
| `ls`, `ls -l`, `ls -a`, `ls -lh` | list files; long format; include hidden files; readable sizes |
| `cd dir`, `cd ..`, `cd ~`, `cd -` | change directory; up one level; home; back to the previous one |
| `cat file` | print a whole file |
| `less file` | page through a file (space, b, `/search`, `q` to quit) |
| `head -n 20 file`, `tail -n 20 file` | first or last 20 lines |
| `tail -f md.log` | follow a file as it grows: ideal for a running simulation |
| `wc -l file` | count lines |

Reading `ls -l`:

```text
-rw-r--r-- 1 student lab   412 Oct 14 09:30 md.mdp
drwxr-xr-x 1 student lab  4096 Oct 14 09:30 runs/
```

The first character is `-` for a file and `d` for a directory. The next nine are **permissions** in three groups of three, for the owner, the group and everyone else: `r` read, `w` write, `x` execute (for a directory, `x` means you may enter it). Then the owner, group, size in bytes, modification time and name. `chmod +x script.sh` makes a script executable; `chmod 600 ~/.ssh/id_ed25519` makes a private key readable only by you, which SSH insists on.

## Creating, copying, moving and deleting

```bash
mkdir -p analysis/rdf        # -p creates parent directories as needed
cp input/md.mdp md_new.mdp   # copy a file
cp -r input/ input_backup/   # copy a directory: -r means recursive
mv md_new.mdp md_T320.mdp    # rename (or move to another directory)
rm md_T320.mdp               # delete a file
rm -r old_runs/              # delete a directory and everything in it
```

{{< note type="warn" title="There is no recycle bin" >}}
`rm` deletes immediately and permanently. Be especially careful with wildcards: `rm *.log` and `rm * .log` (note the space) do very different things; the second deletes everything in the directory. Use `ls *.log` first to see what a pattern matches, or `rm -i` to be asked for each file. On clusters, scratch file systems are usually not backed up at all.
{{< /note >}}

## Wildcards

The shell expands **wildcards** into matching file names *before* the command runs:

- `*` matches any sequence of characters: `runs/*/md.log` is every `md.log` one level below `runs/`;
- `?` matches exactly one character: `T3?0` matches `T300`, `T320` and `T340`;
- `[ab]` matches one of the listed characters; `{a,b}` expands to both words (bash and zsh).

Because the shell does the expansion, `grep` never sees the `*`; it receives a list of file names. Put a pattern in quotes (`find . -name '*.py'`) when you want the *command* to see it instead.

## Searching

```bash
grep 'Fatal error' runs/T340/md.log       # lines containing the text
grep -n -i 'lincs' runs/*/md.log          # with line numbers, ignoring case, across files
grep -l 'Fatal error' runs/*/md.log       # only the names of matching files
grep -r 'ref_t' .                         # recursively through all files below .
grep -v '^[#@]' energy.xvg                # invert: lines NOT starting with # or @
find . -name '*.xtc' -size +1G            # files by name and size
find . -type d -name 'T3*'                # directories by name
```

`grep` patterns are **regular expressions**: `^` anchors the start of a line, `$` the end, `.` matches any character, `[0-9]` any digit, `*` repeats the previous item. They are worth learning; they appear in every programming language.

## Pipes and redirection: the real power

Every command reads from **standard input** and writes to **standard output** (and error messages to **standard error**). You can redirect them:

```bash
grep -v '^[#@]' energy.xvg > potential.dat     # > writes output to a file (overwriting it)
echo "T300 done" >> progress.log                # >> appends
gmx mdrun -deffnm md > run.out 2>&1             # 2>&1 sends errors to the same file
```

and connect commands with a **pipe**, `|`, so that the output of one becomes the input of the next:

```bash
grep -v '^[#@]' energy.xvg | wc -l                          # how many data lines?
grep -h 'Performance' runs/*/md.log | sort -k2 -n | head -1  # slowest run
cut -c18-20 protein.pdb | sort | uniq -c | sort -rn         # residue counts in a PDB file
awk '!/^[#@]/ {print $1, $2}' energy.xvg > energy.dat       # strip headers, keep two columns
awk '!/^[#@]/ {s += $2; n++} END {print s / n}' energy.xvg  # mean of column 2
```

This is the Unix philosophy, set out by Doug McIlroy: small programs that each do one thing well, combined through a universal interface, text. A pipeline of four small commands often replaces a page of code.

## Your first script

A **shell script** is a file of commands. This one prepares three simulations at different temperatures from one template:

```bash
#!/bin/bash
# make_runs.sh: one directory and one parameter file per temperature
set -euo pipefail                      # stop on errors, unset variables and failed pipes

for T in 300 320 340; do
    dir="T${T}"
    mkdir -p "$dir"
    # replace the reference temperature, writing a new file in each directory
    sed "s/^ref_t .*/ref_t      = ${T}/" md.mdp > "$dir/md.mdp"
    echo "prepared $dir: $(grep ref_t "$dir/md.mdp")"
done
```

```bash
chmod +x make_runs.sh
./make_runs.sh
```

```text
prepared T300: ref_t      = 300
prepared T320: ref_t      = 320
prepared T340: ref_t      = 340
```

Points to notice: the first line (the **shebang**) says which program runs the script; variables are set with `T=300` (no spaces) and used as `$T` or `${T}`; double quotes around `"$dir"` keep the value as one word even if it contains spaces; `$(…)` inserts the output of a command; and `set -euo pipefail` makes the script stop at the first error instead of carrying on with broken state. `sed "s/old/new/"` substitutes text; on Linux `sed -i` edits a file in place, while macOS's sed needs `sed -i ''`.

{{< note type="practice" title="Habits that save time" >}}
- Use **Tab completion** for every file name: it is faster and prevents typos.
- Press **Ctrl-R** and type part of an earlier command to search your history.
- **Ctrl-C** stops a running command; **Ctrl-L** clears the screen.
- Keep each project in its own directory with a `README` saying what is where, and save the commands you ran in scripts rather than retyping them.
{{< /note >}}

{{< quiz >}}
- q: "You are in `/home/student/project/runs`. Which path refers to `/home/student/project/input/md.mdp`?"
  options: ["`input/md.mdp`", "`../input/md.mdp`", "`/input/md.mdp`"]
  answer: 1
  why: "`..` goes up from `runs` to `project`, then `input/md.mdp` goes down. `/input/md.mdp` is an absolute path from the root of the file system."
- q: "What does `grep -v '^#' data.txt | wc -l` print?"
  options: ["The number of lines that start with #", "The number of lines that do not start with #", "The lines that do not start with #"]
  answer: 1
  why: "`-v` inverts the match, keeping lines that do not start with #, and the pipe sends them to `wc -l`, which counts them."
- q: "Who expands `*.log` in `ls *.log`?"
  options: ["The `ls` program", "The shell, before `ls` runs", "The file system"]
  answer: 1
  why: "Wildcard expansion is done by the shell; `ls` receives the list of matching names. Quoting the pattern ('*.log') passes it unexpanded."
- q: "A job script ran `gmx mdrun ... > run.out`, but error messages still appeared on the screen and are not in run.out. Why?"
  options: ["`>` only redirects standard output; errors go to standard error, which needs `2>` or `2>&1`", "The file was too small", "GROMACS does not print errors"]
  answer: 0
  why: "Standard output and standard error are separate streams. `> run.out 2>&1` sends both to the file."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. W. Shotts, *The Linux Command Line*, 2nd ed., No Starch Press (2019), free online at linuxcommand.org.
2. Software Carpentry, “The Unix Shell” lesson, swcarpentry.github.io/shell-novice, a tested introduction for researchers.
3. B. W. Kernighan and R. Pike, *The UNIX Programming Environment*, Prentice Hall (1984), the classic account of the pipes-and-small-tools philosophy.
4. J. Janssens, *Data Science at the Command Line*, 2nd ed., O'Reilly (2021), free online.
5. G. Wilson et al., “Best practices for scientific computing,” *PLoS Biology* **12**, e1001745 (2014).
6. G. Wilson, J. Bryan, K. Cranston, J. Kitzes, L. Nederbragt and T. K. Teal, “Good enough practices in scientific computing,” *PLoS Computational Biology* **13**, e1005510 (2017).

</div>
