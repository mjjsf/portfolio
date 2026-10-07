# portfolio

Source for [micahjohnson.co](https://micahjohnson.co): a minimal, text-first portfolio in plain HTML and CSS. No build step. The only JavaScript is `cursor.js` (the custom cursor, on every page) and a small inline script on the homepage that copies the email address.

## Structure

```
index.html              intro, selected work, about, contact
work/<slug>/index.html  one page per project
styles.css              the only stylesheet (tokens at the top, dark mode included)
cursor.js               liquid glass cursor (mouse and trackpad only)
assets/                 favicon and any project images
assets/marquee.js       "previously worked with" logo marquee (home; hover pauses, drag scrubs)
assets/logos/           marquee logos, numbered in display order
404.html
```

## Preview locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Add a project

1. Copy an existing folder in `work/` to `work/<new-slug>/` and edit the title, meta list and text.
2. Add a row to the `.work-list` in `index.html`.
3. Update the previous/next links in the neighbouring project pages.

## Add a logo

1. Save the SVG to `assets/logos/` with the next number, e.g. `6-acme.svg`. Crop the viewBox tight to the artwork; any colour works, it is tinted in CSS.
2. Add `<li><img src="assets/logos/6-acme.svg" alt="Acme"></li>` to the end of `.marquee-set` in `index.html`.

Logos are sized automatically so wide wordmarks and compact marks read at a similar weight, and the scroll speed stays the same however many there are. If one still looks too heavy or light, nudge it with `data-scale` on the `<img>` (e.g. `data-scale="0.8"`). If one sits too high or low, shift it with `style="--logo-y: 4px"` (positive moves it down).

## Placeholder content

Any text wrapped in `<span class="placeholder">…</span>` is placeholder copy and shows with a faint highlight. Replace it with real content, then remove the span. When none are left, delete the `.placeholder` rule from `styles.css`.

## Deploy

The site is fully static, so it works on GitHub Pages, Netlify, Vercel or Cloudflare Pages. Point the host at the repository root with no build command.
