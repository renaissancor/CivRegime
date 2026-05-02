# CivRegime — Historical Polity Database

A structured database of historical political entities (polities), their successions, and regional timelines. Maps the continuity and legitimacy of state transitions across world history.

## Core Model

```
Polity = Ethnicity (who rules) × Territory (where) × Ideology (why) × Time (when)
```

- **Civilization DNA (Software):** The linguistic, religious, and ethnic identity of the ruling people
- **Territorial Locus (Hardware):** The physical geography — stays static but accumulates layers of rulers
- **Polity (The Instance):** A concrete political entity at the intersection of Civilization × Territory × Time

### Two-Tier Political Hierarchy

```
Civilization → political continuity (e.g., "Roman Civilization", "French Civilization")
Polity → political entity        (e.g., Roman Republic, Kingdom of France)  [428 records]
```

Dynasty (192 records) is modelled as a cross-cutting tag via `polity_dynasty`, not as a tier.

---

## Data at a Glance

| Entity | Count | Location |
|--------|-------|----------|
| Polities (political entities) | 428 | `data/polity/*.json` |
| Polity successions | 1,243 | `data/successions/all.json` |
| History panels | 61 | `data/history/*/*.json` |
| Territories | 79 | `data/territories/` |
| Provinces (GeoJSON) | 53 | `data/provinces/` |
| Languages | 691 | `data/languages/` (hierarchical tree) |
| Ethnicities | 276 | `data/ethnicities/` (hierarchical tree) |
| Religions | 255 | `data/religions/` (hierarchical tree) |
| Ideologies | ~30 | `data/ideologies.json` |

### History Panel Coverage (61 panels)

| Region | Panels |
|--------|--------|
| **Western Europe** | Britain & Ireland, France, Low Countries, Scandinavia/Nordic, Italy, Iberia |
| **Central Europe** | Germany, Switzerland & Austria, Poland, Czechia & Slovakia, Hungary, Slovenia |
| **Balkans** | Greece, N. Macedonia, Bulgaria, Serbia/Kosovo/Montenegro, Bosnia, Croatia, Albania, Romania |
| **Eastern Europe** | Baltic States, Belarus, Ukraine, Russia |
| **East Asia** | China, Japan, Korea, Mongolia, Manchuria, Tibet |
| **South Asia** | India, Pakistan, Sri Lanka |
| **Central Asia & Persia** | Iran, Afghanistan, Uzbekistan, Turkmenistan, Xinjiang, Kazakhstan |
| **Middle East** | Anatolia, Iraq, Levant, Egypt, Arabia, Yemen, Georgia, Armenia, Azerbaijan, Morocco |
| **Southeast Asia** | Vietnam, Thailand/Cambodia/Laos, Myanmar, Indonesia, Malaysia/Singapore/Brunei |
| **North Africa** | Algeria, Tunisia, Libya, Sudan |
| **East Africa** | Ethiopia, Somalia |
| **West Africa** | West Africa |

---

## Getting Started

```bash
npm install
npm start        # Express server at http://localhost:3000
```

### Frontend Pages

- `/` — Polity browser
- `/history/` — History panel viewer (interactive timeline grids)
- `/succession-graph.html` — D3.js force-directed succession graph
- `/territory/` — Territory browser
- `/ethnicity/`, `/language/`, `/religion/` — Taxonomy browsers

---

## Architecture

### Current: JSON-First

```
data/
  polity/*.json          ← 428 polity records (text IDs, one file each)
  successions/all.json   ← 1,243 succession edges
  history/*/*.json       ← 61 regional timeline panels
  territories/           ← 79 macro geographic zones
  provinces/             ← 53 GeoJSON subunits
  languages/             ← 691 nodes (directory tree → parent derived from path)
  religions/             ← 255 nodes (directory tree)
  ethnicities/           ← 276 nodes (directory tree)
  ideologies.json        ← ~30 government forms
  civilizations.json            ← political continuity groupings
```

All cross-references use string IDs as foreign keys. The server loads JSON at startup via `data/index.js`.

### Future: DuckDB RDBMS

The project is transitioning to a DuckDB relational database (`civregime.db`) with a normalized schema:

- Schema designed (see `docs/model/erd.sql`)
- **History panels** decompose into `history_cells` table with FK links to polities
- **Succession graph** is polity-to-polity

See `docs/model/erd.md` for the full ERD and `docs/TODO.md` for the migration roadmap.

---

## Documentation

| File | Contents |
|------|----------|
| `docs/README.md` | Documentation index |
| `docs/TODO.md` | 9-phase RDBMS migration roadmap |
| `docs/ARCHITECTURE.md` | System architecture and data flow |
| `docs/model/erd.sql` | Full DDL schema |
| `docs/model/erd.md` | Visual ERD diagram, table summary, example queries |
| `docs/model/data-model.md` | Entity schema and edge type reference |
| `docs/model/succession.md` | Succession type logic and edge cases |
| `docs/model/ideology.md` | Ideology vs policy distinction |
| `docs/model/ethnicity.md` | Ethnicity model and tree structure |
| `docs/model/religion.md` | Religion taxonomy |
| `docs/migration/` | CSV workflow, merge map, missing polities |
| `docs/frontend/` | Succession graph visualization |
| `data/README.md` | Data directory guide and file formats |

---

## Succession Model

Transitions between polities are typed by what they share:

| Metric | Description |
|--------|-------------|
| `same_ethnicity` | Ruling ethnicity matches |
| `same_language` | Cultural language matches |
| `same_religion` | State religion matches |
| `same_civilization` | Both belong to same state grouping |
| `territorial_direction` | expansion / contraction / stable |
| `strength` | Computed continuity score (0–20) |
| `temporal_gap_years` | Gap between end of predecessor and start of successor |

Succession edges are stored in `data/successions/all.json` with shared territory lists.

---

## Roadmap

See `docs/TODO.md` for the full 9-phase plan. Summary:

- **Phase 1** ✅ Schema & foundation (ERD, DuckDB schema, auto-linking)
- **Phase 2** Migrate existing JSON → DuckDB tables
- **Phase 3** Extract polity entities from history panels
- **Phase 4** Derive successions from panel stack order
- **Phase 5** Populate history panel tables (cells, columns)
- **Phase 6** Enrich polity data (fill stubs with ethnicity, language, religion)
- **Phase 7** Frontend RDBMS integration (API endpoints, dynamic panels)
- **Phase 8** Advanced features (interactive map, timeline, global queries)
- **Phase 9** Geographic expansion (Americas, sub-Saharan Africa, Oceania)
