# Clang Sayne CMS Migration

This repo now uses Eleventy for rendering and Decap CMS for content editing.

## Local development

```bash
npm install
npm run dev
```

In a second terminal, start the Decap proxy:

```bash
npx decap-server --port 8082
```

If that flag is not supported in your environment, use:

```bash
PORT=8082 npx decap-server
```

Or:

```bash
npx decap-server
```

Open:
- site: `http://localhost:8080`
- admin: `http://localhost:8080/admin/`

## Content import

The migration seeds content from the current static HTML with:

```bash
npm run import:content
```

That script can be rerun if the source HTML changes before the CMS becomes the only source of truth.
