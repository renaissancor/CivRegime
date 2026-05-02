# CivRegime Architecture

## Core Principle: CSV as Source of Truth

**CSV is the canonical format for all flat/relational data.** CSVs are human-readable, spreadsheet-editable, git-diffable, and directly loadable by DuckDB. As the dataset scales toward thousands of entities, CSV remains the most practical format for bulk authoring and review.

**JSON is reserved for two roles:**
1. **History panels** — inherently nested (rows → cells → stacks → splits), cannot be flattened to CSV
2. **Frontend serving** — generated from CSV/DuckDB, not hand-edited

```
CSV files (csvs/)              ← source of truth for flat data
  ├── polity.csv                  428 polities
  ├── polity_territory.csv        939 territory links
  ├── successions.csv             1,995 edges
  ├── territories.csv             53 territories
  ├── ethnicity.csv               276 nodes
  ├── languages.csv               691 nodes
  ├── religions.csv               255 nodes
  ├── civilizations.csv                  2 civilizations
  └── figures.csv                 285 figures

JSON files (data/history/)     ← source of truth for nested data
  └── {region}/{country}.json     66 history panels, ~4,300 cells

DuckDB (civregime.db)          ← query engine, loads from both
  └── 24 tables (see docs/model/erd.sql)

JSON files (data/)             ← generated output for frontend
  ├── polity/*.json               generated from CSV
  ├── succession/all.json         generated from CSV
  ├── territory/*.json            generated from CSV
  ├── ethnicity/                  generated from CSV (tree)
  ├── language/                   generated from CSV (tree)
  └── religion/                   generated from CSV (tree)
```

### Why CSV over JSON for flat data?

| | CSV | JSON |
|---|---|---|
| **Read 1,000 rows** | Open in spreadsheet, sort/filter | Scattered across 1,000 files |
| **Bulk edit** | Find/replace in one file | Script across 1,000 files |
| **DuckDB load** | `read_csv_auto()` — native | Requires custom loader |
| **Git diff** | One changed row = one line | Entire object block changes |
| **Validation** | Column constraints, FK checks | Schema must be defined separately |

---

## Data Flow

```
┌─────────────────────────────────┐
│  CSVs (csvs/)                   │
│  Source of truth (flat data)    │
│  Human-editable, git-diffable   │
└─────────────┬───────────────────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
┌────────────┐   ┌──────────────────┐
│  DuckDB    │   │  code/makejson/  │
│  Analytics │   │  CSV → JSON      │
│  Queries   │   │  for frontend    │
└────────────┘   └───────┬──────────┘
                         ▼
              ┌──────────────────────┐
              │  JSON (data/)        │
              │  Generated output    │
              │  + history panels    │
              └──────────┬───────────┘
                         ▼ data/index.js
              ┌──────────────────────┐
              │  In-Memory DB        │
              │  (server.js)         │
              └──────────┬───────────┘
                         ▼ Express API
              ┌──────────────────────┐
              │  Frontend (public/)  │
              │  Vanilla JS + D3     │
              └──────────────────────┘
```

### Data Loading (data/index.js)

Three loading strategies for generated JSON:
- **`loadDir(dir)`** — flat recursive load of all JSONs into array (polity, successions, territories)
- **`loadTree(dir)`** — taxonomy loader that derives `parent` from directory structure (religions, languages, ethnicity)
- **`loadJSON(file)`** — single file load (ideologies)

### Generation Pipeline

```bash
npm run make:all    # regenerate all JSON from CSVs
npm run validate    # check data integrity (npm test)
```

Individual generators in `code/makejson/`:
- `polities.js` — csvs/polity.csv → data/polity/*.json
- `successions.js` — csvs/successions.csv → data/succession/all.json
- `territories.js` — csvs/territories.csv → data/territory/*.json
- `ethnicities.js`, `languages.js`, `religions.js` — tree CSVs → directory trees

---

## History Panels

History panels are the exception to CSV-first — they remain as hand-curated JSON because their structure is inherently nested:

- `columns[]` — geographic sub-regions (e.g., Northern France, Southern France)
- `rows[]` — temporal rows with `era` labels
- `cells[]` — each cell contains a `label`, optional `polity` FK, `note`, and `span`
- `stack[]` — multiple entries per cell (sequential rulers)
- `split[]` — concurrent entities (e.g., Free France / Vichy France)
- `footnotes[]` — explanatory notes

Phase 5 of the roadmap will normalize panels into DuckDB tables (`history_panels`, `history_columns`, `history_cells`), but the source JSON files remain authoritative until then.

---

## Planned: DuckDB RDBMS

```
┌─────────────────────────────────────────┐
│  DuckDB (civregime.db)                  │
│  24 tables (see docs/model/erd.sql)     │
│  Loaded from CSVs + history JSONs       │
│  ├── Taxonomy: ethnicities, languages,  │
│  │   religions, ideologies              │
│  ├── Geography: territories, provinces  │
│  ├── Political: civilizations → polities       │
│  │   (with dynasty as cross-cutting)    │
│  ├── Successions: polity-to-polity      │
│  ├── Panel: history_panels, columns,    │
│  │   cells                              │
│  └── People: figures                    │
└─────────────────────────────────────────┘
```

### Two-Tier Political Hierarchy

| Tier | Table | Count | Example |
|------|-------|-------|---------|
| **Civilization** | `civilization` | ~20 | Roman Civilization, French Civilization |
| **Polity** | `polity` | 428 | Roman Republic, Kingdom of France |

- **Civilization** = political continuity across polity changes (Roman Republic → Roman Empire (Pagan) → Roman Empire (Christian) → Byzantine Empire all share `roman_civilization`)
- **Polity** = a political entity; splits into a new polity when religion/language/ethnicity flips

Dynasty (192 records) is modelled as a cross-cutting tag via `polity_dynasty`, not as a third tier.

### Succession

```
Roman Republic → Roman Empire (Pagan) → Roman Empire (Christian) → Byzantine Empire
```

Polity successions today: 1,995 edges in `csvs/successions.csv`.

---

## Foreign Key Reference Map

```
polity.ruling_ethnicity  → ethnicities.id
polity.cultural_language → languages.id
polity.religion          → religions.id
polity.government        → ideologies.id
polity.civilization_id          → civilizations.id

history_cell.polity_id   → polities.id
history_cell.culture_id  → cultures.id
history_cell.column_id   → history_columns.id

polity_succession.from/to → polities.id

figure.polity_id         → polities.id

polity_territory.polity_id    → polities.id
polity_territory.territory_id → territories.id

polity_dynasty.polity_id  → polities.id
polity_dynasty.dynasty_id → dynasties.id

province.territory_id    → territories.id
```

---

## Key Design Decisions

### 1. CSV-first for flat data
CSVs are the source of truth. JSON is generated output. At 400+ polities and growing, CSV is the only format that scales for human editing, bulk operations, and direct DuckDB ingestion.

### 2. Text IDs (not numeric)
All entities use human-readable text IDs (`ottoman_empire`, not `42`). Self-documenting, stable across imports, easy to reference in history panels and CSVs.

### 3. Identity-drift via polity splits
When religion, language, or ethnicity flips, a new polity is created with a succession edge to the predecessor. Capetian France, Valois France, Bourbon France, First Republic, Empire are all separate polities sharing the same `civilization_id` (`french_civilization`). Dynasty is tracked separately via `polity_dynasty` and can span polities (House of Bourbon → Old Regime + Bourbon Restoration).

### 4. History Panels as First-Class Data
Panels aren't just visualization — they're the richest source of polity data. The ~4,300 cells contain temporal, geographic, and succession information that the RDBMS will normalize.

### 5. DuckDB over SQLite
DuckDB was chosen for analytical query power (column-oriented, complex JOINs, recursive CTEs for succession chains).

---

## See Also

- `docs/model/erd.sql` — Full DDL schema
- `docs/model/erd.md` — Visual ERD diagram
- `docs/TODO.md` — Migration roadmap
- `docs/migration/csv_workflow.md` — CSV editing guide
- `data/README.md` — Data file formats and loading pipeline
