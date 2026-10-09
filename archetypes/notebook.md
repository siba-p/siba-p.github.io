---
title: "{{ replace (substr .File.ContentBaseName 11) "-" " " | title }}"
date: {{ .Date }}
description: ""
tags: []
draft: false
---

Write here. Markdown works, and so does math: inline $E = mc^2$ or display

$$
G_{ij} = 4\pi \int_0^\infty [g_{ij}(r) - 1] r^2 dr
$$

Embed a simulation movie (put the files in static/media/):

{{ "{{<" }} movie src="media/your-movie.mp4" poster="media/your-movie.jpg" caption="What it shows" >}}

Add an image (put it in static/img/):

![Alt text](/img/your-figure.png)
