# Data Structure & Loading Pipeline

This directory contains all structured data for the CivRegime Inheritance Framework. It includes both hand-curated regime/succession data and auto-generated taxonomies (languages, religions, ethnicities).

## Directory Organization

```
data/
  ├── regimes/              ← Historical regimes (auto-generated from CSV, one file per regime)
  ├── successions/          ← Succession edges between regimes (one file per region)
  ├── provinces/            ← GeoJSON province subunits (one file per province)
  ├── territories/          ← Macro geographic zones (one file per territory)
  │
  ├── languages/            ← Auto-generated from docs/tree/language.md
  │   ├── indo_european/
  │   │   ├── index.json
  │   │   ├── germanic/
  │   │   ├── italic/
  │   │   ├── celtic/
  │   │   └── ...
  │   ├── afroasiatic/
  │   ├── sino_tibetan/
  │   └── ... (36+ families, 552+ languages)
  │
  ├── religions/            ← Auto-generated from docs/tree/religion.md
  │   ├── abrahamic/
  │   │   ├── index.json
  │   │   ├── christianity/
  │   │   ├── islam/
  │   │   └── judaism/
  │   ├── dharmic/
  │   └── ... (9+ families, 193+ traditions)
  │
  ├── ethnicities/          ← Auto-generated from docs/tree/ethnicity.md
  │   ├── middle_eastern_north_african_bloc/
  │   ├── sub_saharan_african_bloc/
  │   └── ... (11+ blocs, 203+ groups)
  │
  ├── history/              ← Regional history panels (hand-curated, 61 files)
  │   ├── central_asia/     (afghanistan, kazakhstan, turkmenistan, uzbekistan, xinjiang)
  │   ├── east_africa/      (ethiopia, somalia)
  │   ├── east_asia/        (china, japan, korea, manchuria, mongolia, tibet)
  │   ├── europe/           (24 panels — W/Central/Balkans/Eastern Europe)
  │   ├── middle_east/      (anatolia, arabia, yemen, egypt, iraq, levant, morocco, ...)
  │   ├── north_africa/     (algeria, libya, sudan, tunisia)
  │   ├── persia_central_asia/ (iran)
  │   ├── south_asia/       (india, pakistan, sri_lanka)
  │   ├── southeast_asia/   (vietnam, thailand/cambodia/laos, myanmar, indonesia, malaysia/singapore/brunei)
  │   └── west_africa/      (west_africa)
  │
  ├── index.js              ← Data loader (loads all JSON files)
  └── ideologies.json       ← Static lookup table (government forms)
```

## Data File Formats

### Regimes (Auto-Generated from CSV)
**Source:** `csvs/regimes.csv`  
**Output:** `regimes/*.json` (one file per regime)  
**Generator:** `npm run make:regimes` or `node code/makejson/regimes.js`

```json
{
  "id": "kushan_empire",
  "name": "Kushan Empire",
  "ruling_ethnicity": "central_asian_steppe_bloc",
  "cultural_language": "bactrian",
  "ideology": {
    "religion": "buddhism",
    "government": "imperial_monarchy"
  },
  "territories": ["transoxiana", "khorasan", "punjab", "indus_valley", "ganges_plain"],
  "start": 30,
  "end": 375,
  "note": "Founded by Kujula Kadphises from the Yuezhi confederation..."
}
```

### Successions (Auto-Generated from CSV)
**Source:** `csvs/successions.csv`  
**Output:** `successions/all.json`  
**Generator:** `npm run make:successions` or `node code/makejson/successions.js`

```json
{
  "from": "roman_republic",
  "to": "roman_empire_pagan",
  "type": "A",
  "year": 27,
  "notes": "Augustus restores order and consolidates power"
}
```

### Taxonomies (Auto-Generated)

#### Languages
**Location:** `languages/{family}/{branch}/{group}/{language}/`  
**Parent Derivation:** From directory path

```json
{
  "id": "english",
  "name": "English",
  "parent": "west_germanic",
  "description": null,
  "founded_year": null,
  "macro_area": null,
  "coordinates": null,
  "status": null,
  "scripts": [],
  "speaker_count": null,
  "iso6393": null,
  "glottocode": null
}
```

#### Religions
**Location:** `religions/{family}/{tradition}/{branch}/`  
**Parent Derivation:** From directory path

```json
{
  "id": "sunni_hanafi",
  "name": "Sunni (Hanafi)",
  "parent": "sunni",
  "description": null,
  "founder": null,
  "founded_year": null,
  "founded_region": null,
  "status": null,
  "scriptures": [],
  "theology": [],
  "adherent_count": null,
  "major_regions": [],
  "sub_sects": []
}
```

#### Ethnicities
**Location:** `ethnicities/{bloc}/{cluster}/{subcluster}/{group}/`  
**Parent Derivation:** From directory path

```json
{
  "id": "akkadian",
  "name": "Akkadian",
  "parent": "ancient_semitic_groups",
  "description": null,
  "founded_year": null,
  "historical_depth": null,
  "languages": [],
  "origin_territory": null,
  "ancestry": [],
  "social_structure": [],
  "population": null,
  "major_regions": [],
  "status": null
}
```

### History Panels (Hand-Curated)
**Location:** `history/{region}/{country}.json`  
**Structure:** Regional history tables with era columns and regime references.

```json
{
  "id": "pakistan",
  "title": "History of Pakistan (Sindh / Punjab / Gandhara-Kashmir)",
  "columns": [
    { "id": "era",    "name": "Era",    "slots": 1, "type": "era" },
    { "id": "south",  "name": "South",  "slots": 1 },
    { "id": "center", "name": "Central","slots": 1 },
    { "id": "north",  "name": "North",  "slots": 1 }
  ],
  "rows": [
    {
      "era": { "label": "Ancient", "rowspan": 3 },
      "cells": [
        { "regime": "achaemenid_empire", "label": "Achaemenid Empire", "span": 3 }
      ]
    }
  ],
  "footnotes": ["Explanatory notes..."]
}
```

Cells can contain:
- `label` — display text
- `regime` — FK to regime ID (enables linking and colour-coding)
- `span` — how many columns the cell spans
- `stack` — array of `{label, note, regime?}` for stacked entries in a single cell
- `split` — array of `{label}` for civil war / parallel entities

### Static Lookup Tables
**Location:** `ideologies.json`

```json
[
  {
    "id": "monarchy",
    "name": "Monarchy",
    "description": "Rule by a single sovereign"
  },
  {
    "id": "oligarchy",
    "name": "Oligarchy",
    "description": "Rule by a few elite"
  }
]
```

## Data Loading Pipeline

### Loader: `data/index.js`

The data loader reads all files and constructs the in-memory database:

```javascript
const db = {
  // Hand-curated regime history
  regimes: loadDir('data/regimes'),           // flat array
  successions: loadDir('data/successions'),   // flat array
  
  // Auto-generated taxonomies (load as trees)
  religions: loadTree('data/religions'),      // preserves parent-child
  languages: loadTree('data/languages'),      // preserves parent-child
  ethnicities: loadTree('data/ethnicities'),  // preserves parent-child
  
  // Static lookups
  ideologies: loadJSON('data/ideologies.json'),
  
  // Geographic data
  territories: [...],
  provinces: [...]
};
```

### Loading Functions

#### `loadDir(dir)` — Flat File Loading
Recursively loads all JSON files into a flat array.

**Used for:** regimes, successions (where order doesn't matter)

```javascript
function loadDir(dir) {
  // Recursively finds all .json files
  // Returns flat array
  // Removes comments (// style) before parsing
}
```

**Example:** `regimes/` contains one file per regime:
```
regimes/
  kushan_empire.json
  roman_republic.json
  tang_dynasty.json
```

Result: Single flat array of all regimes.

#### `loadTree(dir)` — Hierarchical Loading
Recursively loads JSON files while preserving parent-child relationships from directory structure.

**Used for:** religions, languages, ethnicities (where hierarchy matters)

**Algorithm:**
1. Each directory's `index.json` (if present) becomes a branch node
2. Other `.json` files in that directory become leaf nodes with that branch as parent
3. Subdirectories are processed recursively

**Example:** `languages/indo_european/germanic/west_germanic/`
```
indo_european/
  index.json              → { id: "indo_european", parent: null }
  germanic/
    index.json            → { id: "germanic", parent: "indo_european" }
    west_germanic/
      index.json          → { id: "west_germanic", parent: "germanic" }
      english.json        → { id: "english", parent: "west_germanic" }
      german.json         → { id: "german", parent: "west_germanic" }
```

Result: Flat array with explicit parent field on each node (no nested structure).

### Tree Query Helpers

The loader provides convenience methods to traverse trees:

```javascript
db.tree.religions('christianity')   // Returns all descendants
db.tree.languages('indo_european')  // Returns all descendants
db.tree.ethnicities('semitic_cluster')  // Returns all descendants
```

Used by the web visualizer for filtering (e.g., "show all Germanic languages").

---

## Foreign Key References

### Cross-Domain References

Regimes reference taxonomies by ID:
```json
{
  "id": "ming_dynasty",
  "ruling_ethnicity": "han_chinese",      // FK to ethnicities
  "cultural_language": "mandarin",        // FK to languages
  "religions": ["chinese_folk_religion"]  // FK array to religions
}
```

The validator checks all references resolve to actual nodes.

### Parent References (Taxonomies)

Every taxonomy node has a `parent` field:
- `null` for root nodes (families)
- String ID for child nodes
- Must point to an existing node in the same taxonomy

### Self-References (Optional)

Regime succession is a DAG (directed acyclic graph):
```json
{
  "from": "roman_republic",    // FK to regimes
  "to": "roman_empire_pagan",   // FK to regimes
  "type": "A"
}
```

---

## Metadata Enrichment

### Current State
Many fields are `null`:
- `description` — human-readable explanation
- `founded_year` — establishment date/period
- `status` — modern/extinct/historical status
- Language-specific: `iso6393`, `glottocode`, `speaker_count`
- Religion-specific: `founder`, `adherent_count`, `major_regions`

### Enrichment Process

1. **Generate CSV** (extract id/name pairs)
   ```bash
   node code/extract-csv.js  # (future script)
   ```
   Output: `language_metadata.csv`, etc.

2. **Enrich with cheap LLM** (external process)
   - Use Gemini API or Claude Haiku
   - Populate description, dates, status
   - Save back to CSV

3. **Merge into JSON** (update database)
   ```bash
   node code/merge-csv.js    # (future script)
   ```
   - Reads enriched CSV
   - Updates JSON files
   - Preserves structural fields

### Why This Approach?
- Keeps generation fast and cheap (markdown → JSON in ms)
- Defers expensive work to cheaper models (Gemini vs Claude)
- Maintains data integrity (structure + metadata separate)
- Allows iterative refinement without regeneration

---

## Validation

### Running Validation
```bash
npm run validate
```

Checks:
- ✓ All JSON files parse correctly
- ✓ Required fields present (id, name, parent)
- ✓ All parent references exist within the same taxonomy
- ✓ No circular parent chains
- ✓ All regime FK references resolve
- ✓ Succession type is valid (A, A-, B, C, or D)
- ✓ No orphaned nodes in taxonomies

### Common Issues

**"Parent not found"**
- Check `parent` field matches an actual node ID in the same taxonomy
- Verify directory structure matches naming (spaces → underscores)

**"Missing required field"**
- All nodes must have: `id`, `name`, `parent` (or `null` for roots)
- Additional fields can be null but must be declared

**"Invalid succession type"**
- Must be one of: `A`, `A-`, `B`, `C`, `D`
- See `docs/succession.md` for semantics

---

## Performance Notes

### File Count
- 268 regime files (auto-generated from CSV)
- 552 language files
- 193 religion files
- 203 ethnicity files
- ~70 succession files
- 35 history panel files (hand-curated)
- 40+ territory files
- 100+ province GeoJSON files

**Load time:** ~50-100ms on typical hardware

### Memory Usage
- Flattened DB: ~3-5 MB (all data)
- In-memory tree queries: instant
- Web visualizer: ~10MB in browser

### Query Patterns
```javascript
// Fast: O(n) array filter
db.languages.filter(l => l.parent === 'germanic')

// Fast: O(n) tree traversal
db.tree.languages('indo_european')  // all descendants

// Slow: O(n²) if done naively
// (Use tree helpers instead)
```

---

## Contributing Data

### Adding Regimes
1. Add a row to `csvs/regimes.csv` with all required fields
2. Run: `npm run make:regimes` to generate the JSON file
3. Create corresponding succession edges in `csvs/successions.csv`
4. Run: `npm run make:successions` to regenerate
5. Optionally add regime links in `data/history/*/*.json` panels

### Adding Taxonomy Nodes
1. Edit the markdown source: `docs/tree/language.md` (etc.)
2. Run generator: `node code/makejson/languages.js`
3. Optionally enrich metadata via CSV workflow

### Updating Metadata
1. Extract CSV: `node code/extract-csv.js` (future)
2. Edit description/dates in CSV
3. Merge back: `node code/merge-csv.js` (future)

---

## Data Files Location Reference

| Entity | Location | Loading | Count |
|---|---|---|---|
| Polities (regimes) | `regimes/*.json` | `loadDir` (flat) | 268 |
| Successions | `successions/all.json` | `loadDir` (flat) | 1,243 |
| History panels | `history/*/*.json` | served statically | 61 |
| Languages | `languages/*/` | `loadTree` (hierarchical) | 691 |
| Religions | `religions/*/` | `loadTree` (hierarchical) | 255 |
| Ethnicities | `ethnicities/*/` | `loadTree` (hierarchical) | 276 |
| Ideologies | `ideologies.json` | `loadJSON` (static) | ~30 |
| Provinces | `provinces/*.geojson` | `loadDir` (flat) | 53 |
| Territories | `territories/*.json` | `loadDir` (flat) | 79 |
