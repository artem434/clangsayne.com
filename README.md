# Clang Sayne CMS Migration

This repo now uses Eleventy for rendering and Decap CMS for content editing.

## Build & deploy

- **Publish directory:** `_site/` (run `npm run build` after `npm install`).
- **`npm run build`** runs `prebuild` (clean `_site`, refresh `content/uploads/_idx__*` symlinks via `media:index`) then Eleventy in **production mode**. It does **not** re-run `import:content`, so committed JSON under `src/content/` is the source of truth for deploy.
- **Local build variant:** `npm run build:local` keeps the local admin config in `_site/admin/config.yml` for offline preview.
- **Re-seed JSON from legacy HTML** (root `index.html`, `news.html`, `news/*.html`, etc.): `npm run rebuild:from-legacy-html` — use only when you intentionally overwrite content from those static files.

## Local development

```bash
npm install
npm run dev
```

In a second terminal, start the Decap proxy:

```bash
npx decap-server --port 8083
```

If that flag is not supported in your environment, use:

```bash
PORT=8083 npx decap-server
```

Open (Eleventy `--serve` defaults to **port 8080** — keep this in sync with `site_url` / `display_url` in `admin/config.yml`):

- site: `http://localhost:8080/`
- admin: `http://localhost:8080/admin/`

If you run the dev server on another port (e.g. `npx @11ty/eleventy --serve --port=8081`), update **`admin/config.yml`** `site_url` and `display_url` to the same origin so Decap (login, preview links, local backend) stays consistent.

### Decap admin checklist (entry editor blank / won’t load)

1. **Decap proxy** — with `backend: git-gateway` and `local_backend` in `admin/config.yml`, run **`npx decap-server`** (port **8083** by default, matching `local_backend.url`). Without it, the CMS cannot read or write repo files locally.
2. **Same origin as `site_url`** — open admin from the **same host and port** as `site_url` / `display_url` (e.g. site at `http://localhost:8080` → use `http://localhost:8080/admin/`).
3. **Browser console** — DevTools → Console on `/admin/` after reload; check failed requests (`config.yml`, `decap-cms.js`, `decap-bootstrap.js`) and red errors.

Config files:
- `admin/config.yml` = local development
- `admin/config.production.yml` = DecapBridge production setup

## Content import

The migration seeds content from the current static HTML with:

```bash
npm run import:content
```

That script can be rerun if the source HTML changes before the CMS becomes the only source of truth.

## Media library (Decap)

Decap only lists **files directly inside** `media_folder` (`content/uploads`), not nested folders under `content/`.  
Run **`npm run media:index`** to refresh **`content/uploads/_idx__*`** symlinks to every image under `content/1-about`, `2-news`, `3-works`, `5-shop`, and `6-press` so they all appear in **Media**. This also runs automatically at the end of **`npm run prebuild`**. Commit the `_idx__*` entries so Git-backed / Bridge editors see them too.
