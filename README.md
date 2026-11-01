# passgen

Online password generator. Passwords are created in the browser with Web Crypto and are not sent to the server.

**Version:** `1.3.1`  
**Live:** https://passgen.dmosk.net

## Stack

| Layer | Choice |
|-------|--------|
| UI / logic | Vite + TypeScript (vanilla) |
| Randomness | Web Crypto (`crypto.getRandomValues` + rejection sampling) |
| Generation counter | local Node helper (`stats-api`) + `data/stats/total.txt`, API `/api/gen-count` |

## Features

- Generate passwords in the browser (20 at a time; fewer columns for long passwords)
- Basic and advanced settings modes (presets, exclusions, strength meter, shareable settings link)
- Presets: general, Wi-Fi, shell, URL, PIN, dictate, API token (`src/presets.ts`)
- Length 1–128 (default 12)
- Character sets: digits / lower / upper / symbols; “no duplicates” on by default in basic mode
- Strength meter with a clickable “?” hint; “Copy link” in advanced mode
- Settings in the URL (`adv`, `len`, `num`, `low`, `up`, `sym`, `nodup`, `ex`, `sim`, `preset`)
- Shared generation counter via `/api/gen-count` (passwords stay client-side)
- SEO copy, FAQ + JSON-LD; `robots.txt`, `sitemap.xml`, per-language 404 pages
- Symbols kept off password edges and not adjacent; at most two symbols per password
- Click a password to copy it
- **PWA:** installable; generation works offline after the first visit (`/{lang}/manifest.webmanifest` + `/sw.js`)

## Languages and URLs

- Locale paths: `/ru/`, `/en/`, `/zh/`, `/es/`, `/hi/`, `/ar/`, `/bn/`, `/pt/`, `/fr/`, `/de/`, `/ja/`, `/id/`, `/pa/`, `/jv/`, `/te/`, `/tr/`, `/ko/`, `/mr/`, `/vi/`, `/ta/`, `/it/`, `/fa/`, `/tlh/`
- `/` redirects to `/{lang}/` using `Accept-Language`, then a GeoIP country header when present, otherwise `en`
- Language switcher uses local Twemoji flag PNGs; `ar` / `fa` use `dir="rtl"`
- Self-canonical URLs and full hreflang; `x-default` → `/en/`
- Build writes `dist/{lang}/`; UI/SEO strings come from `scripts/gen-i18n.mjs`

## Local development

```bash
npm install
npm run dev
```

Open `/ru/`, `/en/`, `/zh/`, and other locale codes (in Vite dev the root redirects to `/ru/`).

```bash
npm run build
npm run preview
```

Production-oriented build with indexing enabled:

```bash
# Windows (cmd)
set VITE_SITE_ORIGIN=https://passgen.dmosk.net
set VITE_ALLOW_INDEX=true
npm run build

# Unix
VITE_SITE_ORIGIN=https://passgen.dmosk.net VITE_ALLOW_INDEX=true npm run build
```

## Presets

Add a row in `src/presets.ts` (`id`, localized `name` / `hint`, `values`). UI and URL handling pick it up automatically. For `shell` / `url`, restrict symbols with `specialsAllowlist`.

## Layout

```text
.
  package.json
  vite.config.ts
  index.html
  sw.template.js          # → dist/sw.js on build
  public/                 # robots, sitemap, 404, redirects, flags/, manifest
  scripts/
    gen-i18n.mjs
    seo-full-bodies.mjs
  src/
  stats-api/              # generation counter used by Vite / local API
  data/stats/             # total.txt (not committed)
```

## License

Source published for reference. Product site: https://passgen.dmosk.net