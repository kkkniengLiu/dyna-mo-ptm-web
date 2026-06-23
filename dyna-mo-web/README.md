# Dyna-MO PTM Web

Static Vite + React interface for the Dyna-MO PTM v0.2.5 molecular dynamics
database.
The site is designed for GitHub Pages: no Node backend, no SQLite server, and
all user-facing data is loaded from static assets under `public/`.

## What It Ships

- Homepage with GPCRmd-inspired scientific database styling, PTM composition,
  dataset statistics, and the manuscript Fig. 1 overview image.
- `/browse` descriptor browser for the v0.2.5 109-column master table with
  fuzzy search, URL-addressable PTM/length/DSSP filters, sorting, and a
  virtualized 12-column table.
- `/system/[id]` static system pages with descriptor cards, UniProt/Zenodo
  links, JSON-LD metadata, full source-row expansion, and an NGL viewer for
  locally bundled K/R-PTM AF3 PDB files.
- Static API files at `/api/systems.json` and `/api/system/<id>.json`, plus
  `robots.txt` and `sitemap.xml` for public database indexing.
- Phosphorylation systems gracefully show a Zenodo fallback because their PDBs
  are not yet present in `inputs/all_ptm_pdbs.tar.gz`.

## Quick Start

Run commands from `dyna-mo-web/`:

```bash
corepack pnpm install
corepack pnpm dev
```

Open http://127.0.0.1:3000.

`pnpm dev` first runs `scripts/prepare-static-data.ts`, which reads:

```text
../submission/master_table_all_v2.csv
release figure PNG/PDF assets
../inputs/all_ptm_pdbs.tar.gz
```

and writes:

```text
public/data/master_table.json
public/data/master_table_all_v2.csv
public/api/systems.json
public/api/system/*.json
public/figures/*.png
public/figures/*.pdf
public/structures/*.pdb
public/robots.txt
public/sitemap.xml
```

Example browser filters are encoded in the URL:

```text
/browse?ptm_type=phos_Y&min_length=200&max_length=500&dssp=H
```

## Build

```bash
corepack pnpm build
```

The production bundle is written to:

```text
dist/
```

`scripts/post-build.ts` also creates `dist/404.html` so direct links such as
`/system/<id>` work on GitHub Pages.

For project pages, set `BASE_PATH` before building:

```bash
$env:BASE_PATH="/Dyna-MO-PTM/"
corepack pnpm build
```

For a public sitemap, set `SITE_URL` before `prepare:data` or `build`:

```bash
$env:SITE_URL="https://your-domain.example/Dyna-MO-PTM"
corepack pnpm build
```

## Verification

```bash
corepack pnpm run prepare:data
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm screenshots
```

Playwright writes visual checks to `screenshots/`.

## Optional Docker Preview

Docker uses already prepared static assets from `public/`, so run
`corepack pnpm run prepare:data` first:

```bash
docker compose up --build
```

The container serves the built site on http://127.0.0.1:3000.

## Release Placeholders

Before public release, replace these placeholders in `src/App.tsx` and
`scripts/prepare-static-data.ts`:

```text
__ZENODO_DOI__
__GITHUB_URL__
publication citation metadata
```

The descriptor CSV and code are static assets; trajectory downloads should stay
on Zenodo rather than being bundled into the web build.
