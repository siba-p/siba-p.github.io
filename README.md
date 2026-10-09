# siba-p.github.io

Personal research site of Sibasankar Panigrahy: nanoparticle self-assembly, molecular simulation and machine learning.
Built with [Hugo](https://gohugo.io) and a custom theme (no third-party theme). It deploys automatically to GitHub Pages on every push to `main`.

## Preview locally

```bash
hugo server        # open http://localhost:1313
```

## Write a notebook (blog) post

```bash
./new-post.sh "Why my PMF has two minima"
```

This creates `content/notebook/YYYY-MM-DD-why-my-pmf-has-two-minima.md`. Write in Markdown, then:

```bash
git add -A && git commit -m "Notebook: why my PMF has two minima" && git push
```

The site is live about a minute later. You can also add a post entirely from the browser: on GitHub, open `content/notebook/`, choose **Add file → Create new file**, and copy the front matter from an existing post.

Inside a post you can use:

- **Math:** `$\Delta G = \Delta H - T\Delta S$` inline, or `$$ ... $$` for display equations. These are rendered at build time, so no JavaScript is needed.
- **Movies:** put `my-run.mp4` and a poster `my-run.jpg` in `static/media/`, then
  `{{< movie src="media/my-run.mp4" poster="media/my-run.jpg" caption="What it shows" >}}`
- **Images:** put files in `static/img/` and use `![alt text](/img/figure.png)`
- **Tags:** `tags: ["crowding", "machine learning"]` in the front matter. Tag pages are generated automatically.

To convert a VMD/OVITO movie for the web (small, silent, autoplay-friendly):

```bash
ffmpeg -i raw.mp4 -an -vf "scale='min(960,iw)':-2,format=yuv420p" -c:v libx264 -crf 30 -movflags +faststart static/media/my-run.mp4
ffmpeg -ss 1.5 -i static/media/my-run.mp4 -frames:v 1 -q:v 5 static/media/my-run.jpg
```

## Update everything else (no HTML needed)

| What | File |
|---|---|
| Publications (+ BibTeX export) | `data/publications.yaml` |
| Software cards | `data/software.yaml` (set `public: true` when a repo is released) |
| Research studies (home + Research page) | `data/studies.yaml` |
| Simulation Theatre gallery | `data/gallery.yaml` |
| Positions, talks, methods (About page) | `data/cv.yaml` |
| About text | `content/about/_index.md` |
| Email, Scholar, LinkedIn, ORCID, CV link | `[params]` in `hugo.toml` |

## Structure

```
assets/css/main.css      design system (light + dark)
assets/js/assembly.js    live Brownian-dynamics self-assembly (hero + playground)
assets/js/ising.js       Kawasaki Ising pattern generator (playground)
assets/js/site.js        theme toggle, video autoplay, gallery, GitHub stats
layouts/                 page templates
content/                 pages and notebook posts
data/                    structured content (YAML)
static/media, static/img movies, renders, social card
```
