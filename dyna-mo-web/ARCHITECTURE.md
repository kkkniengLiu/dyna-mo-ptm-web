# Architecture

## Goal

Dyna-MO PTM Web is a static scientific database interface for the 1,095-system
v0.2.5 109-column descriptor release. It is built for GitHub Pages and avoids
server runtime, SQLite, and bundled trajectory files.

## Stack

- **Vite + React**: static SPA with fast local development and a small deploy
  surface.
- **Tailwind CSS**: dense scientific UI with PTM-color continuity from the
  manuscript figures.
- **Fuse.js**: client-side fuzzy search across system IDs and UniProt accessions.
- **TanStack Virtual**: virtualized browser table for the 1,095-row descriptor
  dataset.
- **Framer Motion**: restrained entry and card interactions for a more modern
  database front page.
- **NGL.js**: dynamically imported only on system detail pages with local PDBs.

## Data Flow

1. `scripts/prepare-static-data.ts` reads
   `../submission/master_table_all_v2.csv`.
2. The script normalizes public fields, applies the six PTM colors from the
   manuscript figure code, and writes `public/data/master_table.json`.
3. It copies the descriptor CSV and release figure PNG/PDF assets into
   `public/data/` and `public/figures/`.
4. It extracts K/R-PTM AF3 PDBs from `../inputs/all_ptm_pdbs.tar.gz` into
   `public/structures/`. Phosphorylation systems remain valid static pages and
   show a Zenodo fallback panel.
5. `vite build` copies `public/` into `dist/`, bundles the SPA, and
   `scripts/post-build.ts` creates `dist/404.html` for GitHub Pages route
   fallback.

## Routes

- `/`: homepage, release statistics, PTM composition, Fig. 1 overview.
- `/browse`: searchable/filterable descriptor browser with row links.
- `/system/[id]`: static system detail page with descriptors, links, and either
  an NGL structure viewer or a Zenodo-hosted-data fallback.
- `/about`: methods summary, data/licence notes, and citation placeholder.

## Release Boundaries

Trajectory files are never bundled in the web artifact. They should remain on
Zenodo and be linked from the system detail pages. Before public release,
replace `__ZENODO_DOI__`, `__GITHUB_URL__`, and publication citation metadata.
