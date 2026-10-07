# portfolio

Source for [micahjohnson.co](https://micahjohnson.co): a minimal, text-first portfolio in plain HTML and CSS. No build step. The only JavaScript is `cursor.js` (the custom cursor, on every page) and a small inline script on the homepage that copies the email address.

## Structure

```
index.html              intro, selected work, about, contact
work/<slug>/index.html  one page per project
styles.css              the only stylesheet (tokens at the top, dark mode included)
cursor.js               liquid glass cursor (mouse and trackpad only)
assets/                 favicon and any project images
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

## Placeholder content

Any text wrapped in `<span class="placeholder">…</span>` is placeholder copy and shows with a faint highlight. Replace it with real content, then remove the span. When none are left, delete the `.placeholder` rule from `styles.css`.

## Deploy

The site is fully static, so it works on GitHub Pages, Netlify, Vercel or Cloudflare Pages. Point the host at the repository root with no build command.
