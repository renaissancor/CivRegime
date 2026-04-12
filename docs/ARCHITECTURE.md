# CivRegime Architecture

## Evolution

The project has gone through three architectural phases:

1. **CSV-first (early):** CSVs as source of truth, numeric IDs, JSON generated from CSV
2. **JSON-first (current):** JSON files as source of truth, text IDs, direct editing
3. **RDBMS (planned):** DuckDB as source of truth, JSON generated from DB queries

### Why the shift?
- CSV with numeric IDs was hard to maintain as the dataset grew (268 polities, 1,243 successions)
- Text IDs (`ottoman_empire` vs `42`) are self-documenting and prevent errors
- History panels (61 files) are hand-curated and don't fit a CSV workflow
- A relational database enables complex queries (succession chains, temporal overlap, cross-referencing)

---

## Current Architecture (JSON-First)

```
┌─────────────────────────────────────────┐
│  JSON Files (data/)                     │
│  Source of Truth                        │
│  ├── polity/*.json       (268 files)    │  ← polities (was regimes/)
│  ├── successions/all.json (1,243 edges) │
│  ├── history/*/*.json    (61 panels)    │
│  ├── territories/        (79 files)     │
│  ├── provinces/          (53 GeoJSON)   │
│  ├── languages/          (691 nodes)    │  ← directory tree
│  ├── religions/          (255 nodes)    │  ← directory tree
│  ├── ethnicity/          (276 nodes)    │  ← directory tree
│  ├── ideologies.json     (~30 entries)  │
│  └── states.json         (2 entries)    │
└─────────────────────────────────────────┘
            ↓ data/index.js
┌─────────────────────────────────────────┐
│  In-Memory Database (server.js)         │
│  ├── db.polity[]                        │
│  ├── db.successions[]                   │
│  ├── db.religions[] (with tree helpers) │
│  ├── db.languages[] (with tree helpers) │
│  ├── db.ethnicity[]                     │
│  ├── db.ideologies[]                    │
│  ├── db.territories[]                   │
│  └── db.provinces[]                     │
└─────────────────────────────────────────┘
            ↓ Express static + API
┌─────────────────────────────────────────┐
│  Frontend (public/)                     │
│  ├── index.html        (polity browser) │
│  ├── history/index.html (panel viewer)  │
│  ├── succession-graph.html (D3 graph)   │
│  ├── territory/, ethnicity/, etc.       │
│  └── Fetches JSON directly from /data/  │
└─────────────────────────────────────────┘
```

### Data Loading (data/index.js)

Three loading strategies:
- **`loadDir(dir)`** — flat recursive load of all JSONs into array (polity, successions, territories, provinces)
- **`loadTree(dir)`** — taxonomy loader that derives `parent` from directory structure (religions, languages, ethnicity)
- **`loadJSON(file)`** — single file load (ideologies)

### History Panels

History panels are served as static JSON and rendered client-side. Each panel defines:
- `columns[]` — geographic sub-regions (e.g., Northern France, Southern France)
- `rows[]` — temporal rows with `era` labels
- `cells[]` — each cell contains a `label`, optional `regime` FK, `note`, and `span`
- `stack[]` — multiple entries per cell (sequential rulers)
- `split[]` — concurrent entities (e.g., Free France / Vichy France)
- `footnotes[]` — explanatory notes

---

## Planned Architecture (DuckDB RDBMS)

```
┌─────────────────────────────────────────┐
│  DuckDB (civregime.db)                  │
│  Source of Truth                        │
│  24 tables (see docs/erd.sql)           │
│  ├── Taxonomy: ethnicities, languages,  │
│  │   religions, ideologies              │
│  ├── Geography: territories, provinces  │
│  ├── Political: states → polities →     │
│  │   regimes (3-tier hierarchy)         │
│  ├── Successions: polity-level +        │
│  │   regime-level (dynasty)             │
│  ├── Panel: history_panels, columns,    │
│  │   cells                              │
│  └── People: figures                    │
└─────────────────────────────────────────┘
            ↓ API layer (server.js)
┌─────────────────────────────────────────┐
│  REST API                               │
│  GET /api/panel/:id                     │
│  GET /api/polity/:id                    │
│  GET /api/regime/:id                    │
│  GET /api/territory/:id?year=1200       │
│  GET /api/succession-chain/:from/:to    │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│  Frontend (same public/ pages)          │
│  Panels generated from DB queries       │
│  instead of static JSON                 │
└─────────────────────────────────────────┘
```

### Three-Tier Political Hierarchy

The key architectural change is splitting the current `polity` concept into three levels:

| Tier | Table | Count | Example |
|------|-------|-------|---------|
| **State** | `states` | ~20 | Roman State, French State |
| **Polity** | `polities` | 268+ | Roman Republic, Kingdom of France |
| **Regime** | `regimes` | ~2,500 | Julio-Claudian, Bourbon dynasty |

- **State** = political continuity across polity changes (Roman Republic → Roman Empire = same "Roman State")
- **Polity** = a political entity (what current `data/polity/*.json` records are)
- **Regime** = a dynasty or ruling period within a polity (what history panel labels describe)

Current `data/polity/` files are the polity-level records (formerly `data/regimes/`).

### Succession at Two Levels

```
Polity successions (macro):  Roman Republic → Roman Empire → Byzantine Empire
Regime successions (micro):  Julio-Claudian → Flavian → Antonine → Severan
```

Both are directed graphs. Polity successions exist today (1,243 edges). Regime successions will be derived from history panel stack order (~2,300 edges).

---

## Foreign Key Reference Map

```
polity.ruling_ethnicity  → ethnicities.id
polity.cultural_language → languages.id
polity.religion          → religions.id
polity.government        → ideologies.id
polity.state_id          → states.id

regime.polity_id         → polities.id

history_cell.regime_id   → regimes.id
history_cell.polity_id   → polities.id
history_cell.culture_id  → cultures.id
history_cell.column_id   → history_columns.id

polity_succession.from/to → polities.id
regime_succession.from/to → regimes.id

figure.regime_id         → regimes.id
figure.polity_id         → polities.id

polity_territory.polity_id    → polities.id
polity_territory.territory_id → territories.id

province.territory_id    → territories.id
```

---

## Key Design Decisions

### 1. Text IDs (not numeric)
All entities use human-readable text IDs (`ottoman_empire`, not `42`). Self-documenting, stable across imports, easy to reference in history panels.

### 2. Polity/Regime Split
Polities are the political entity (the state). Regimes are dynasties/periods within. This avoids the question "is Capetian France the same as Bourbon France?" — they're different regimes of the same polity.

### 3. History Panels as First-Class Data
Panels aren't just visualization — they're the richest source of regime data. The ~4,600 cells contain temporal, geographic, and succession information that the RDBMS will normalize.

### 4. Taxonomy Trees via Directory Structure
Languages, religions, and ethnicities use filesystem hierarchy to encode parent-child relationships. `languages/indo_european/germanic/west_germanic/english.json` → parent is `west_germanic`. No explicit parent field needed in source files.

### 5. DuckDB over SQLite
DuckDB was chosen for analytical query power (column-oriented, complex JOINs, recursive CTEs for succession chains). The existing `civregime.db` file uses DuckDB format.

---

## See Also

- `docs/erd.sql` — Full DDL schema
- `docs/erd.md` — Visual ERD diagram
- `docs/TODO.md` — Migration roadmap
- `data/README.md` — Data file formats and loading pipeline
