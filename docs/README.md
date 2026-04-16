# CivRegime Documentation

## Start Here

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture and data flow |
| [TODO.md](TODO.md) | 9-phase RDBMS migration roadmap (Phase 3 in progress) |

## Domain Model (`model/`)

Schema definitions, entity semantics, and naming conventions.

| Doc | Purpose |
|-----|---------|
| [data-model.md](model/data-model.md) | Property graph model and edge types |
| [erd.md](model/erd.md) | Visual ERD diagram, table summary, example queries |
| [erd.sql](model/erd.sql) | Full DDL schema (24 tables, Polity/Regime split) |
| [naming.md](model/naming.md) | Entity ID naming conventions and collision resolution |
| [succession.md](model/succession.md) | Succession type logic (A/A-/B/C/D) and edge cases |
| [regime.md](model/regime.md) | Polity fields, figures, polity vs regime distinction |
| [dynasty.md](model/dynasty.md) | Dynasty entity and lineage modeling |
| [polity_dynasty.md](model/polity_dynasty.md) | Polity-dynasty junction table |
| [ideology.md](model/ideology.md) | Ideology vs policy distinction; government form = ideology |
| [ethnicity.md](model/ethnicity.md) | Ethnicity taxonomy and tree structure |
| [religion.md](model/religion.md) | Religion taxonomy |

## Migration & Data Pipeline (`migration/`)

Guides for the CSV-to-JSON-to-DuckDB data pipeline.

| Doc | Purpose |
|-----|---------|
| [csv_workflow.md](migration/csv_workflow.md) | Editing CSVs and regenerating JSON |
| [merge_map.md](migration/merge_map.md) | Panel label to entity ID resolution |
| [missing_polities.md](migration/missing_polities.md) | Polities to be added |

## Frontend (`frontend/`)

| Doc | Purpose |
|-----|---------|
| [succession_graph.md](frontend/succession_graph.md) | D3 force-directed graph visualization |

## Reference Data

| Directory | Purpose |
|-----------|---------|
| [tree/](tree/) | Taxonomy tree structure dumps (language, religion, ethnicity, territories) |
| [todo/](todo/) | Per-entity work tracking |
