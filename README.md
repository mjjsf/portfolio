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

## Password-protect a project

Add this line to the project page's `<head>`, after the stylesheet:

```html
<script src="../../assets/gate.js?v=3"></script>
```

Visitors see a password screen (over the homepage's animated background) until they enter the password. The default password is set in `assets/gate.js`. Use `data-password="…"` on the tag to give one page a different password, and `data-home="…"` to change where "Return to home" goes. Visitors must enter the password every time they open the page. To remove protection, delete the line.

This only discourages casual visitors. The page source and images can still be read by anyone who looks for them.

## Placeholder content

Any text wrapped in `<span class="placeholder">…</span>` is placeholder copy and shows with a faint highlight. Replace it with real content, then remove the span. When none are left, delete the `.placeholder` rule from `styles.css`.

## Deploy

The site is fully static, so it works on GitHub Pages, Netlify, Vercel or Cloudflare Pages. Point the host at the repository root with no build command.
