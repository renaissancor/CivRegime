# Data Structure & Loading Pipeline

This directory contains all structured data for the CivRegime Inheritance Framework. It includes both hand-curated regime/succession data and auto-generated taxonomies (languages, religions, ethnicities).

## Directory Organization

```
data/
  ├── regimes/              ← Historical regimes (hand-curated, one file per cluster)
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
  ├── index.js              ← Data loader (loads all JSON files)
  └── ideologies.json       ← Static lookup table (government forms)
```

## Data File Formats

### Regimes (Hand-Curated)
**Location:** `regimes/*.json`  
**Structure:** One or more regime objects per file, or array of objects.

```json
{
  "id": "roman_republic",
  "name": "Roman Republic",
  "start": 509,
  "end": 27,
  "territory": "italy_mediterranean",
  "ruling_ethnicity": "latin",
  "cultural_language": "latin",
  "religions": ["roman_paganism"],
  "capitals": ["rome"],
  "government": "oligarchy",
  "figures": [
    { "name": "Romulus", "role": "founder", "period": "753-715 BCE" }
  ]
}
```

### Successions (Hand-Curated)
**Location:** `successions/*.json`  
**Structure:** Edges describing transitions between regimes.

```json
{
  "from": "roman_republic",
  "to": "roman_empire",
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

**Example:** `regimes/` contains:
```
regimes/
  ancient_near_east.json      → Array of regimes
  east_asia.json              → Array of regimes
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
  "to": "roman_empire",        // FK to regimes
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
- 552 language files
- 193 religion files
- 203 ethnicity files
- ~50+ regime files
- ~70 succession files

**Load time:** ~50-100ms on typical hardware

### Memory Usage
- Flattened DB: ~2-3 MB (all data)
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
1. Create new file in `data/regimes/` (or existing regional file)
2. Add regime object with required fields
3. Create corresponding succession edges in `data/successions/`
4. Run validator: `npm run validate`

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
| Regimes | `regimes/*.json` | `loadDir` (flat) | ~50 |
| Successions | `successions/*.json` | `loadDir` (flat) | ~70 |
| Languages | `languages/*/` | `loadTree` (hierarchical) | 552 |
| Religions | `religions/*/` | `loadTree` (hierarchical) | 193 |
| Ethnicities | `ethnicities/*/` | `loadTree` (hierarchical) | 203 |
| Ideologies | `ideologies.json` | `loadJSON` (static) | 15 |
| Provinces | `provinces/*.geojson` | `loadDir` (flat) | ~100+ |
| Territories | `territories/*.json` | `loadDir` (flat) | 40+ |
