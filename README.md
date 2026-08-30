# PDF / Image Merger

A private, single-user PWA for merging images and PDFs into **one combined PDF**, with
full control over page order and per-page rotation. Everything runs in the browser —
files never leave the device. No backend, no accounts.

## Features

- Add **PDFs and images** (JPG / PNG / WebP) by drag-and-drop, file picker, or the
  device **camera** (`Take photo` on mobile).
- Every file is **flattened into individual pages**: a 10-page PDF becomes 10 entries,
  each image becomes 1. You reorder the flat page list, not files.
- **Thumbnail preview** for every page (PDF pages rendered with pdf.js).
- **Drag-and-drop reordering** across the whole list, freely interleaving pages from
  different sources. Works with mouse, touch, and keyboard.
- **Per-page rotation** in 90° steps. Rotation is *added to* any rotation already
  embedded in the source PDF page (never overwritten) and applied only on export.
- **Remove** individual pages before export.
- **Export**: builds a new PDF (original PDF pages copied, images embedded at native
  size), applies each page's rotation, and downloads `merged-<timestamp>.pdf`.
- Installable PWA — offline-capable app shell, home-screen icon, standalone display.

## Tech

React + TypeScript + Vite · [pdf-lib](https://pdf-lib.js.org/) (build output) ·
[pdf.js](https://mozilla.github.io/pdf.js/) (thumbnails) ·
[dnd-kit](https://dndkit.com/) (touch + mouse reorder) ·
[vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (manifest + service worker).

All assets are served from the app's own origin — no CDN — so it works offline and
passes installability checks on iOS Safari and Android Chrome.

## Develop

```bash
npm install
npm run icons     # generate the PWA icon PNGs into public/icons (run once)
npm run dev
```

Open the printed URL. The service worker is disabled in dev; test PWA behavior with a
production build.

## Build & preview

```bash
npm run build
npm run preview
```

`npm run build` runs `tsc --noEmit` first, so type errors fail the build.

## Deploy

The build in `dist/` is a plain static site. Deploy it to any static host
(Vercel, Netlify, Cloudflare Pages, GitHub Pages). It **must be served over HTTPS** —
required for PWA installability, camera access, and the File APIs on mobile.

- **Vercel / Netlify / Cloudflare Pages**: point the project at this repo, build command
  `npm run build`, output directory `dist`. No further config needed.
- **GitHub Pages** (project site at `/<repo>/`): set `base: '/<repo>/'` in
  `vite.config.ts` before building, then publish `dist/`.

## Access gate (optional)

Because a static URL is reachable by anyone who has the link, there is an optional
lightweight password prompt. **This is not real security** — the app is entirely
client-side and the code is public. It only keeps casual/accidental visitors out and,
together with the `noindex` meta tag and `robots.txt`, keeps the URL out of search
indexes.

To enable it:

```bash
npm run hash-password -- "your secret phrase"
```

Copy the two printed lines into a `.env` file:

```
VITE_ACCESS_GATE=on
VITE_ACCESS_HASH=<the printed hash>
```

Rebuild. A correct entry is remembered per device via `localStorage`. To disable, set
`VITE_ACCESS_GATE=off` (or remove `.env`) and rebuild.

## Scope / non-goals

Single-user, private use. No accounts, no cloud sync, no persistence between reloads.
No OCR, no text editing, no PDF form handling — merge, reorder, and rotate only.
