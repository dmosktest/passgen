# passgen

Online password generator. Passwords are created in the browser with Web Crypto and are not sent to the server.

**Version:** `1.3.3`  
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

Open `/ru/` (or another locale). Optionally run the stats helper separately if you want the shared counter.

```bash
node stats-api/server.mjs
```
