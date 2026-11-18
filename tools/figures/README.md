# Learn figures

Each chapter in `content/learn/<slug>.md` has a script `tools/figures/<slug>.py` that draws every static
figure of that chapter into `static/img/learn/<slug>/`. Figures are computed from the equations and
numbers in the text, so if the text changes, change the script and run it again:

```bash
python3 tools/figures/<slug>.py          # one chapter
for f in tools/figures/*.py; do [ "$f" != tools/figures/style.py ] && python3 "$f"; done   # all
```

`style.py` holds the shared fonts (Inter, SIL Open Font License, in `fonts/`), palette and sizes.
In a chapter, place a figure with

```
{{< fig src="name.svg" alt="What the image shows, for screen readers" caption="What to notice in it." >}}
```

and name the chapter's cover illustration in its front matter with `cover: "cover.svg"`.
