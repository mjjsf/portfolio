# portfolio

Source for [micahjohnson.co](https://micahjohnson.co) — a minimal, text-centric product design portfolio.

Plain HTML and one stylesheet. No build step, no dependencies.

```
index.html            Home: intro, selected work, experience, contact
work/project-one.html Case study template — duplicate per project
style.css             All styles (light + dark via prefers-color-scheme)
404.html              Not-found page
```

## Editing

- Replace the placeholder copy marked with `TODO` comments in `index.html`.
- For each case study, copy `work/project-one.html`, rename it, and link it from the "Selected work" list.
- Images are optional; put them in `images/` and use the commented `<figure>` block in the template.

## Preview locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. Links are root-relative, so open via a server rather than `file://`.
