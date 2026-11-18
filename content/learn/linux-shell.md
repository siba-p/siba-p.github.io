---
title: "The Linux shell"
description: "The command line from zero: the file-system tree, paths, the anatomy of a command, wildcards, pipes and redirection, permissions and your first scripts, practised in a terminal that runs in this page."
hook: "A simulation project quickly fills up with thousands of files. A pipeline of four small commands can search, filter and count them in seconds, and a ten-line script can prepare the next fifty runs."
objectives:
  - "Navigate the file-system tree with absolute and relative paths"
  - "Read a command's options and arguments, and find help with man and --help"
  - "Find files and lines with wildcards, grep and find"
  - "Combine commands with pipes and redirection to filter simulation output"
  - "Write a shell script that prepares a series of simulation inputs"
cover: "cover.svg"
milestones:
  - year: 1971
    text: "Ken Thompson's shell ships with the first edition of Unix"
  - year: 1973
    text: "Thompson adds Doug McIlroy's pipes to Unix, and grep follows"
  - year: 1979
    text: "Stephen Bourne's shell, sh, ships with Version 7 Unix"
  - year: 1989
    text: "Brian Fox releases bash, the GNU Project's free Bourne-again shell"
track: toolbox
weight: 2
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

{{< fig src="file-tree.svg" alt="The practice project drawn as a tree from the root slash through home, student and project to input, runs and scripts, with runs highlighted as the current directory and a teal path going up from runs to project and down to input/md.mdp." caption="The project used in the practice terminal. From `runs/`, the relative path `../input/md.mdp` goes up one level with `..` and down again; the absolute path spells out the whole route from `/` and works from anywhere." >}}

{{< note type="try" title="Pause and predict" >}}
You are in `/home/student/project/runs/T300`. Where does `cd ../../scripts` take you, and what does `ls ../T340` list? Work it out on the tree, then check in the practice shell below: the first goes up to `runs`, up again to `project`, and down into `scripts`; the second lists the contents of the sibling directory `T340` without leaving `T300`. `cd -` brings you back to wherever you were before the last `cd`.
{{< /note >}}

Absolute paths belong in scripts that may be run from any directory, such as job scripts, and relative paths belong in a project that may be moved or copied: a project whose scripts refer only to `../input/md.mdp` keeps working when you `rsync` it to a cluster where your home directory is `/home/u/ab1234` instead of `/home/student`.

## The anatomy of a command

```bash
ls -l -h runs/T300
```

A command is a **program name** (`ls`), then **options** that change its behaviour (`-l` long format, `-h` human-readable sizes; single-letter options can be combined as `-lh`), then **arguments**, usually files or directories (`runs/T300`). Long options start with two dashes (`--human-readable`). Every command documents itself: `man ls` opens its manual (press `q` to leave, `/word` to search), and most accept `--help`.

The SYNOPSIS line at the top of every manual page uses a compact notation worth learning once. `ls [OPTION]... [FILE]...` means that options and files are both optional (square brackets) and may be repeated (the ellipsis). `cp [OPTION]... SOURCE... DIRECTORY` says that `cp` takes one or more sources and a directory last, which is why `cp *.mdp backup/` copies every `.mdp` file into `backup/`. A lone `--` marks the end of the options, so that `rm -- -oops.txt` removes a file whose name starts with a dash instead of treating it as an option.

Commands are of two kinds. Most are separate programs on disk; `type ls` and `which grep` say where (`/usr/bin/ls`). A few, such as `cd`, `export` and `source`, are **builtins** inside the shell itself, because they must change the shell's own state: a separate program could change only its own working directory, which would vanish when it exited. [The Linux system](../linux-architecture/) explains why, and [How the shell reads a command](../how-bash-works/) follows a line through all the steps the shell takes before running it.

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

### Permissions as numbers

The nine permission letters are nine bits, and each group of three is written as one octal digit by giving read the weight 4, write 2 and execute 1. That is all there is to `chmod 755` and `chmod 600`.

{{< fig src="permissions.svg" alt="The string -rwxr-x--- split into a type character and three groups of three letters for owner, group and others, with the bits 111, 101 and 000 below them, weights 4, 2 and 1, and the octal digits 7, 5 and 0. Below, a list of common modes from 644 to 600." caption="Each class of user gets three bits, and each group of three bits is one octal digit, so `rwxr-x---` is 750. The common modes in the list cover nearly every case in research computing." >}}

For a directory the same letters mean slightly different things: `r` lets you list its names, `w` lets you create and delete files in it, and `x` lets you enter it and reach the files inside. To share a project with your group on a cluster, the group needs `r` on the files and `r-x` on every directory leading to them, including your home directory. `chmod -R g+rX project/` does exactly that: the capital `X` adds execute only to directories (and to files that are already executable for someone), so data files do not become "programs". New files get their permissions from your **umask**, usually `022` (remove write for group and others, so files are created 644 and directories 755).

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

Expansions come out in alphabetical order, character by character, which is not numerical order. With directories `run_1`, `run_2`, `run_9` and `run_10`, the pattern `run_*` expands to `run_1 run_10 run_2 run_9`, and a script that concatenates `run_*/energy.xvg` stitches the trajectory together in the wrong order without any error. Pad numbers with zeros when you create the names, `printf 'run_%03d' 7` gives `run_007`, and every tool that sorts names will put them in the right order.

{{< note type="warn" title="When a pattern matches nothing" >}}
If no file matches, bash passes the pattern on unchanged: `ls *.trr` in a directory without `.trr` files runs `ls` with the literal argument `*.trr`, which then complains that no such file exists. zsh, the macOS default, instead stops with `zsh: no matches found: *.trr` and does not run the command at all. This difference breaks commands copied between the two shells, most often `scp cluster:runs/*.log .`, where the pattern is meant for the remote machine: quote it, `scp 'cluster:runs/*.log' .`, so that the local shell leaves it alone.
{{< /note >}}

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

Two more `grep` options do most of the bookkeeping on a set of runs. `grep -c` counts matching lines per file, and `grep -L` lists the files that do **not** match. A GROMACS log that ended normally finishes with the line `Finished mdrun`, so

```bash
grep -L 'Finished mdrun' runs/*/md.log
```

prints exactly the runs that crashed or are still running: in the practice project, `runs/T340/md.log`. With fifty temperatures instead of three, that one line replaces opening fifty log files. Use `grep -E` (extended regular expressions) when a pattern needs alternation or repetition counts, as in `grep -E 'nsteps|dt' md.mdp` or `grep -E '^[0-9]{3}$'`. `find` complements `grep` by selecting files on their properties rather than their contents: `find runs -name '*.xtc' -mtime +30` lists trajectories not modified for thirty days, and only after checking that list should you append `-delete`.

## Pipes and redirection: the real power

{{< note type="story" title="Coupling programs like garden hose" >}}
In a memo of October 1964 Doug McIlroy, who later led the Bell Labs department where Unix was written, proposed that "we should have some ways of coupling programs like garden hose—screw in another segment when it becomes necessary to massage data in another way." Nine years later Ken Thompson added the `pipe` system call and the `|` notation to Unix; McIlroy recalled that he did it in a single night, and that the next morning the group was writing one-line programs nobody had been able to write the day before. Thompson's `grep`, named after the editor command `g/re/p` (globally search for a regular expression and print), and Aho, Weinberger and Kernighan's `awk` (1977) were written to be used this way.
{{< /note >}}

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

{{< fig src="pipeline.svg" alt="Diagram of energy.xvg flowing into grep, then through a pipe into sort, then through a pipe into head, whose single output line goes to the terminal; dashed pink arrows from each process's descriptor 2 go straight to the terminal." caption="`grep -v '^[#@]' energy.xvg | sort -k2 -g | head -n 1` finds the frame with the lowest potential energy in the worked example's file. Each pipe connects one process's descriptor 1 to the next one's descriptor 0; descriptor 2 is not piped, so error messages from any stage still reach the screen." >}}

A pipeline is not a sequence of steps that run one after another. The shell starts all the processes at once and the kernel connects them with buffers, 64 KB each on Linux by default. When a buffer is full, the writer is paused until the reader catches up; when it is empty, the reader waits. Data streams through, so a pipeline can process a 50 GB file on a machine with 8 GB of RAM, as long as no stage needs to hold everything at once (`sort` is the exception: it must read all of its input before it can print the first line, and spills to temporary files when the input is large). When `head` has printed its lines and exits, the next write by the process before it fails with the signal `SIGPIPE`, which ends it quietly. That is why `grep pattern huge.log | head` returns instantly even though `grep` alone would read the whole file.

{{< note type="warn" title="Myth" >}}
**Myth: `sort` sorts numbers.** Without options `sort` compares text character by character, so 10 comes before 9 and 100 before 9. `sort -n` compares numbers but reads only a leading decimal number: given 1.5e-3 and 2.0e-4 it compares 1.5 with 2.0 and puts them in the wrong order. GROMACS, LAMMPS and most Fortran codes write exponents, so use `sort -g` (general numeric) for their output. And `uniq` removes only *adjacent* duplicate lines, which is why it almost always follows `sort`.
{{< /note >}}

### Worked example: is the run equilibrated?

Take an `energy.xvg` from a 1 ns production run with one frame per picosecond: 8 header lines starting with `#` or `@`, then 1,001 lines of time and potential energy. The question every simulation must answer before its averages mean anything is whether the system had settled when data collection began. A first answer takes three commands.

```bash
grep -v '^[#@]' energy.xvg | wc -l
awk '!/^[#@]/ && $1 <  200 {s += $2; n++} END {print n, s / n}' energy.xvg
awk '!/^[#@]/ && $1 >= 200 {s += $2; n++} END {print n, s / n}' energy.xvg
```

```text
1001
200 -411163
801 -412002
```

In `awk`, `$1` and `$2` are the first and second whitespace-separated fields of each line, the pattern before the braces selects lines, and the `END` block runs after the last line. The first 200 ps average 839 kJ/mol above the rest, far more than the statistical uncertainty: with a frame-to-frame spread of about 380 kJ/mol, the standard error of a mean of 400 roughly independent frames is $380/\sqrt{400} \approx 19$ kJ/mol. Splitting the remainder in two (change the condition to `$1 >= 200 && $1 < 600`, then `$1 >= 600`) gives −412,012 and −411,992 kJ/mol, which agree within that uncertainty. The system relaxes during the first 200 ps and is stationary afterwards, so averages should start at 200 ps.

{{< fig src="equilibration.svg" alt="Potential energy against time for 1,000 ps, falling from about −409.5 to −412 MJ/mol over the first 200 ps and then fluctuating around −412; an orange segment marks the 0 to 200 ps mean of −411,163 and blue segments the 200 to 600 and 600 to 1000 ps means of −412,012 and −411,992 kJ/mol." caption="The worked example's synthetic `energy.xvg` (a 2,400 kJ/mol relaxation with a time constant of 80 ps plus noise of 380 kJ/mol), with the block means the `awk` one-liners print. Two blocks after equilibration agree within their standard error of about 19 kJ/mol; the first block does not." >}}

Block averages from the command line are a screening test, not a proof: neighbouring frames are correlated, so the true uncertainty is larger than the naive estimate, and a slow drift can hide inside noise. [Trajectory analysis](../trajectory-analysis/) does the job properly with block averaging and autocorrelation times. But a two-line check on all fifty runs of a series, before any Python is opened, catches the run that never equilibrated.

{{< note type="practice" title="Back of the envelope" >}}
A temperature series of 50 runs leaves 50 log files of about 2 MB each. Opening each in an editor, scrolling to the end and noting whether it finished takes perhaps 20 seconds per file, 17 minutes in all, with a fair chance of misreading one. `grep -L 'Finished mdrun' runs/*/md.log` reads 100 MB, which takes well under a second once the files are in the page cache. The real saving comes the second time: the command is already in your history, or in a script.
{{< /note >}}

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

The same loop structure serves analysis as well as preparation. This one prints one line per run with the temperature, whether it finished, and the mean potential energy after 200 ps:

```bash
for log in runs/*/md.log; do
    dir=$(dirname "$log")                     # runs/T300
    if grep -q 'Finished mdrun' "$log"; then status=done; else status=FAILED; fi
    mean=$(awk '!/^[#@]/ && $1 >= 200 {s += $2; n++} END {if (n) print s / n}' "$dir/energy.xvg")
    echo "$(basename "$dir") $status $mean"
done | sort -k1,1 > summary.txt
```

Note `grep -q`, which prints nothing and only sets the exit status that `if` tests, and the pipe after `done`, which sends the output of the whole loop through `sort` at once. Two tools catch most scripting mistakes before they cost a day of compute: `bash -n script.sh` checks the syntax without running anything, and ShellCheck (`shellcheck script.sh`) warns about unquoted variables, unmatched globs and the other traps described in [How the shell reads a command](../how-bash-works/). Running a script with `bash -x` prints each command, with its variables expanded, just before it runs.

{{< note type="practice" title="Habits that save time" >}}
- Use **Tab completion** for every file name: it is faster and prevents typos.
- Press **Ctrl-R** and type part of an earlier command to search your history.
- **Ctrl-C** stops a running command; **Ctrl-L** clears the screen.
- Keep each project in its own directory with a `README` saying what is where, and save the commands you ran in scripts rather than retyping them.
{{< /note >}}

{{< note type="key" >}}
- Every file has one place in a tree rooted at `/`; a path names it absolutely or relative to where you are.
- A command is a program, then options, then arguments; `man` and `--help` document each one.
- The shell expands wildcards before the command runs; quote a pattern to pass it on unchanged.
- Small programs joined by pipes and redirections replace pages of code, and a script makes the work repeatable.
- Permissions are three octal digits; names sort as text, so pad numbers with zeros; `sort -g` sorts scientific notation.
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
- q: "What does `chmod 640 results.dat` allow?"
  options: ["Everyone may read and write", "The owner may read and write, the group may read, others have no access", "The owner may execute the file"]
  answer: 1
  why: "6 = 4 + 2 is read and write for the owner, 4 is read for the group, and 0 gives others nothing."
- q: "Directories `run_1` to `run_12` exist. In what order does `ls -d run_*` list `run_2` and `run_10`?"
  options: ["run_2 before run_10", "run_10 before run_2, because names are sorted as text", "In the order they were created"]
  answer: 1
  why: "Glob expansion sorts names character by character, and '1' comes before '2'. Zero-padded names such as run_002 and run_010 sort correctly."
- q: "Which command lists the GROMACS logs that do not contain `Finished mdrun`?"
  options: ["`grep -v 'Finished mdrun' runs/*/md.log`", "`grep -L 'Finished mdrun' runs/*/md.log`", "`grep -c 'Finished mdrun' runs/*/md.log`"]
  answer: 1
  why: "`-L` lists files without a match. `-v` prints every non-matching line of every file, and `-c` prints a count for each file."
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
