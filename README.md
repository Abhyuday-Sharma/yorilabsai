# yorilabs.ai

A static site. No build step, no framework: HTML, one stylesheet, two
scripts, and Anime.js plus Lenis from a CDN.

```
site/                 <- everything that deploys
  index.html          the home page, sections 01 to 08
  contact.html        the enquiry form
  style.css
  app.js              home page motion
  contact.js          the form and the phone menu
  assets/
    brand/            logo, favicon, grain
    images/           section plates and product panels
serve.py              local dev server
START-SITE.cmd        double-click to run it
render.yaml           deploy config
```

Everything else in this folder is the workshop: the mirrored reference
site, source PNGs, and `_unused-assets/` (plates from an earlier art
direction, kept but not shipped). `.gitignore` names what ships, so
none of it reaches the repo.

## Run it locally

Double-click **START-SITE.cmd**, or:

```
python serve.py           # http://localhost:8080/site/
python serve.py 8777      # any other port
```

`serve.py` is `http.server` with two things added: `no-store` on every
response so a refresh never hands you a stale asset, and byte-range
support, without which a browser treats video as unseekable.

## Deploy on Render

It is a Static Site, not a web service. There is nothing to build.

**With the blueprint** — push this repo, then in Render pick
**New → Blueprint**, point it at the repo, and `render.yaml` fills in
the rest.

**By hand** — **New → Static Site**, connect the repo, then:

| Field | Value |
|---|---|
| Build Command | *leave empty* |
| Publish Directory | `site` |

`site/` is the publish root, so `index.html` is served at `/` and the
paths inside it resolve from `site/assets/`. Every asset reference is
relative, which is why the same files work at `/site/` locally and at
`/` in production.

Render redeploys on every push to the connected branch.

## Notes

- Both pages compose a `mailto:` rather than posting anywhere, since
  there is no backend. The address is `info@yorilabs.com`.
- The four social links in the footer have no `href` yet. Add the real
  profile URLs to activate them.
