# Dyna-MO PTM UI Design Review

Date: 2026-06-14

## Design Position

Dyna-MO PTM should read as a scientific database resource for an NAR Database issue submission, not as a commercial SaaS dashboard or creative landing page. The interface should foreground search, dataset scope, provenance, download/citation paths, and per-system inspection.

## Reference Patterns

- AlphaFold DB and UniProt: strong central search, restrained institutional color, direct examples under search, plain-language scientific purpose.
- RCSB PDB: clear tool entry points for search, visualization, analysis and download; persistent top navigation; visible collection scale.
- GPCRmd: molecular dynamics identity and "visualize / inspect / analyze" positioning, but its dark cinematic hero should be used cautiously for an NAR-facing database.
- Mol\* / NGL ecosystem: molecular viewer is a scientific tool, so controls should be explicit and compact rather than decorative.

## Keep

- Six PTM color identity, but only as a data encoding palette.
- Large search entry on the home page.
- Browse table with virtualization.
- Per-system NGL viewer and descriptor groups.
- Static CSV download and citation route.

## Reduce

- Oversized marketing headline.
- Spinning PTM orbit graphic.
- Strong aurora gradients, glowing shadows and glassmorphism.
- Black icon tiles and high-contrast decorative cards.
- Animation beyond subtle load/hover transitions.

## Implementation Direction

1. Home page:
   - Use a light institutional hero.
   - H1 should be the resource name: "Dyna-MO PTM".
   - Add short scientific subtitle and direct search.
   - Keep dataset scale metrics near the search.
   - Replace orbital visualization with release summary and PTM composition bar.

2. Browse page:
   - Keep dense, readable scientific table.
   - Maintain colored PTM chips, but with muted outline styling.
   - Keep CSV download visible.
   - Avoid dashboard-style neon panels.

3. System detail:
   - Prioritize AF3 structure viewer, UniProt link, trajectory link and descriptor blocks.
   - Show structure availability explicitly.
   - Avoid color shadows tied to PTM type except small chips or top accent.

4. Libraries:
   - Keep TanStack Virtual for the table.
   - Keep NGL in the current release because it is already integrated.
   - Consider Mol\* later if migration time is available.
   - Keep Motion only for subtle fade/hover; avoid React Bits text/background effects for the publication-facing version.

## Acceptance Standard

The site should feel closer to AlphaFold DB / UniProt / RCSB PDB than to a startup landing page. It can have Dyna-MO PTM-specific color identity, but the first impression must be "credible scientific database".
