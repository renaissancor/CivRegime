# CivRegime Inheritance Framework (CRIF)

**CRIF** is a formal taxonomy and data schema for mapping the historical continuity and legitimacy of state transitions. It categorizes successions based on **Ethnic DNA (Software)** and **Territorial Locus (Hardware)** — the two independent axes that define whether one regime is a legitimate heir to another.

The framework makes patterns like the Persian cultural thread, the Mongol succession crisis, and the Tang → Ming continuity debate formally representable and queryable.

---

## Core Philosophy: The Hardware-Software Model

```
Regime = Ethnicity (who rules) × Territory (where) × Ideology (why) × Time (when)
```

- **Civilization DNA (Software):** The linguistic, religious, and ethnic identity of the ruling people. It flows like a river across borders — the same people can move territories.
- **Territorial Locus (Hardware):** The physical geography. It stays static but accumulates layers of different rulers over time.
- **Regime (The Instance):** A concrete political entity (Roman Republic, Ottoman Empire, Tang Dynasty) at the intersection of Civilization × Territory × Time.

---

## Succession Matrix

Transitions between Regimes are typed by what the two regimes share:

| Type | Name | Same Ethnicity | Same Territory | Legitimacy |
| :--- | :--- | :---: | :---: | :--- |
| **A** | Direct Lineage | ✅ | ✅ | Orthodox — the gold standard |
| **A-** | Direct (ideology gap) | ✅ | ✅ | Weakened — same people, same land, religion changed |
| **B** | Cultural Migration | ✅ | ❌ | Successor — same people moved |
| **C** | Locus Inheritance | ❌ | ✅ | Claimant — conquered the land |
| **D** | Arbitrary Jump | ❌ | ❌ | **Ahistorical / Invalid** |

Type D transitions are flagged as invalid unless an explicit intermediary regime is identified.

---

## Data Structure

```
data/
  regimes/              ← one JSON file per geographic cluster (recursive subdirs supported)
    ancient_near_east.json
    east_asia.json
    europe/
      medieval_west.json
      ...
  successions/          ← directed edges between regimes, one file per region
  territory/            ← one JSON file per territory, grouped by region
    middle_east/
    east_asia/
    ...
  religions/            ← directory tree; parent derived from filesystem path
    abrahamic/
      index.json        ← branch node
      islam/
        sunni/
          sunni_hanafi.json
  languages/            ← directory tree (same convention as religions)
    indo_european/
    afroasiatic/
    ...
  ethnicities/          ← flat directory of ethnicity files
  ideologies.json       ← flat array of government forms
```

All cross-references use string IDs as foreign keys. The validator checks all references resolve.

---

## Getting Started

```bash
npm install
npm start        # Express server at http://localhost:3000 — opens graph visualizer
npm run validate # Check all FK integrity, required fields, date validity
```

### Visualizer

The web visualizer (`public/`) is a D3.js force-directed graph:
- Nodes = regimes, colored by `ruling_ethnicity`
- Edges = succession types A/A-/B/C/D (each a distinct color)
- Left sidebar: filter by ruling ethnicity, territory, or religion (sub-branches included automatically)
- Click a node for full regime detail panel

---

## Current Data (as of 2026-03)

| Entity | Count |
|---|---|
| Regimes | 56 |
| Successions | 70 |
| Territories | 25 |
| Languages | 118 |
| Religions | 52 |
| Ethnicities | 43 |

Coverage: Ancient Near East, Egypt, Persia/Iran, Islamic Caliphates, Steppe/Nomadic, Turkic Empires, East Asia (China), South Asia (India), Mediterranean Europe.

Planned: Medieval Europe, Sub-Saharan Africa, Southeast Asia, Japan/Korea, Americas.

---

## Documentation

| File | Contents |
|---|---|
| `docs/data-model.md` | Full entity schema and edge type reference |
| `docs/regime.md` | Regime fields, figures, regime vs dynasty distinction |
| `docs/succession.md` | Succession type logic, path validation, edge cases |
| `docs/ideology.md` | Ideology vs policy distinction, examples |
| `docs/ethnicity.md` | Ethnicity model |
| `docs/religion.md` | Religion taxonomy |

---

## Roadmap

- **Phase 1 (in progress):** Data construction — Classical, Medieval, Early Modern eras globally
- **Phase 2:** Validation engine — compute succession continuity scores (`territory_overlap × ethnicity_match × ideology_distance`)
- **Phase 3:** Map visualization — add `geo` polygon data to territory files, render as world map
- **Phase 4:** Path queries — "find all valid succession paths from Regime A to Regime Z"
