# CivRegime Architecture Overview

## Design Philosophy

CivRegime is a **CSV-first historical simulation** system where:

1. **CSV is the single source of truth** for all historical data
2. **Relational database normalization** principles organize data into clear tables
3. **Numeric IDs** ensure consistency across tree structures (ethnicities, languages, religions)
4. **JSON generation** converts CSV → JSON for frontend consumption
5. **Visualizations** render from generated JSON files

The system prioritizes **data maintainability** (humans edit CSVs easily) and **frontend performance** (pre-computed JSON).

---

## Data Architecture

### Three-Layer Model

```
┌─────────────────────────────────────────┐
│  CSV Files (csvs/)                      │
│  Source of Truth                        │
│  ├─ states.csv                          │
│  ├─ regimes.csv                         │
│  ├─ territories.csv                     │
│  ├─ territory_periods.csv               │
│  ├─ ethnicities.csv (hierarchical)      │
│  ├─ languages.csv (hierarchical)        │
│  └─ religions.csv (hierarchical)        │
└─────────────────────────────────────────┘
            ↓ [generation scripts]
┌─────────────────────────────────────────┐
│  JSON Files (data/)                     │
│  Generated Output                       │
│  ├─ data/states.json (single file)      │
│  ├─ data/regimes/*.json (138 files)     │
│  └─ data/territories/*.json (39 files)  │
└─────────────────────────────────────────┘
            ↓ [frontend]
┌─────────────────────────────────────────┐
│  Visualizations                         │
│  Interactive maps, charts, trees        │
└─────────────────────────────────────────┘
```

### Core Tables

**STATES** (2 rows)
- Groups related regimes under long-term political continuities
- Example: "Roman State" contains both "Roman Empire (Pagan)" and "Roman Empire (Christian)"
- Maps: 1:N to REGIMES

**REGIMES** (138 rows)
- Historical eras/regimes with ruling culture, language, and religion
- Each belongs to exactly one STATE
- Has start/end dates
- References: id_ruling_ethnicity, id_ruling_language, id_ruling_religion (numeric FKs)

**TERRITORIES** (39 rows)
- Geographic regions/areas
- No direct regime reference; control history is in TERRITORY_PERIODS

**TERRITORY_PERIODS** (301 rows)
- Junction table tracking which regime controlled which territory during which period
- Enables many-to-many relationship between TERRITORIES and REGIMES
- Each row: `territory_id`, `regime_id`, `start_year`, `end_year`

**ETHNICITIES, LANGUAGES, RELIGIONS** (~260 rows each)
- Hierarchical trees (self-referential via `parent_id`)
- Use numeric IDs (1, 2, 3...) to avoid semantic inconsistencies
- Include `old_id` column for reference to original semantic IDs

---

## Key Design Decisions

### 1. Numeric IDs for Tree Structures
**Problem:** Text-based semantic IDs (e.g., "han", "han_chinese", "Han Chinese") cause inconsistency when the same entity is referenced from different sources.

**Solution:** All tree structures use numeric IDs (1, 2, 3...), with `old_id` column preserving original semantic IDs.

**Benefit:** Consistency, stability (IDs don't change on rename), simple FK relationships.

### 2. Junction Table for Territory-Regime Relationships
**Problem:** Territories are controlled by multiple regimes over time (many-to-many with dates).

**Solution:** Separate `TERRITORY_PERIODS` table that merges into JSON for frontend.

**Benefit:** Normalized schema, clean query semantics, easy to update control history.

### 3. State Grouping
**Problem:** Distinguishing between "same political entity undergoing change" vs. "new regime" is semantically unclear.

**Solution:** Two-level hierarchy: STATES (political continuity) group REGIMES (eras).

**Benefit:** Clarity about what makes something "the same state" vs. "a new era within the state".

### 4. CSV as Source of Truth
**Problem:** Data locked in code or markdown is hard to maintain and version control.

**Solution:** CSV files are the authoritative source; JSON is generated.

**Benefit:** Easy to edit (spreadsheet tools), version control friendly, decouples maintenance from deployment.

---

## Data Flow

### Adding a New Regime

```
1. Open csvs/regimes.csv
   ↓
2. Add row: "139,New Kingdom Egypt,3,8,42,15,-1550,-1070"
   ↓
3. Run: node code/csv2json/regimes.js
   ↓
4. Script generates: data/regimes/139.json
   ↓
5. Frontend loads updated JSON on next page load
   ↓
6. Visualizations reflect new regime
```

### Adding Territory Control Period

```
1. Open csvs/territories.csv
   └─ Add row: "40,Anatolia"
   
2. Open csvs/territory_periods.csv
   ├─ Add row: "40,5,-2686,-2181,Old Kingdom Egypt"
   ├─ Add row: "40,15,-1200,-500,Hittite Empire"
   └─ ...more periods...
   
3. Run: node code/csv2json/territories.js
   
4. Script merges territory_periods.csv into territory JSON
   └─ Generates: data/territories/40.json with embedded timeline
   
5. Frontend loads, visualizations show territory control history
```

### Reorganizing Religion Tree

```
1. Edit csvs/religions.csv
   ├─ Change parent_id values to rearrange hierarchy
   ├─ Add new religions with parent_id pointing to parent
   └─ Example: Add "Protestantism" with parent_id pointing to "Christianity"
   
2. No generation script needed for trees yet
   (Trees can be queried directly from CSV)
   
3. Frontend or tools reconstruct tree from parent_id column
```

---

## Foreign Key Validation

The generation scripts validate foreign key consistency:

- Each regime must reference valid ethnicity_id, language_id, religion_id
- Each regime must reference valid state_id (if populated)
- Each territory_period must reference valid territory_id and regime_id
- Each tree node's parent_id must reference a valid parent (or be NULL for roots)

**On FK violation**, the script warns and skips the invalid row.

---

## File Organization

```
project-root/
├── csvs/                          # CSV source files
│   ├── states.csv
│   ├── regimes.csv
│   ├── territories.csv
│   ├── territory_periods.csv
│   ├── ethnicities.csv
│   ├── languages.csv
│   └── religions.csv
│
├── code/csv2json/                 # Generation scripts
│   ├── states.js
│   ├── regimes.js
│   └── territories.js
│
├── data/                          # Generated JSON output
│   ├── states.json
│   ├── regimes/                   # 138 regime files
│   │   ├── 1.json
│   │   ├── 2.json
│   │   └── ...
│   └── territories/               # 39 territory files
│       ├── 1.json
│       ├── 2.json
│       └── ...
│
└── docs/                          # Documentation
    ├── README.md                  # This directory's guide
    ├── ERD.md                     # Entity-Relationship Diagram
    ├── CSV_WORKFLOW.md            # Practical editing guide
    ├── ARCHITECTURE.md            # This file
    ├── regime.md                  # Entity semantics
    ├── ethnicity.md
    ├── religion.md
    └── language.md
```

---

## Common Tasks

### Edit a Regime Name
```bash
1. Open csvs/regimes.csv
2. Find the regime, update the "name" column
3. Save the file
4. Run: node code/csv2json/regimes.js
5. Reload browser (Ctrl+F5)
```

### Update Territory Control Dates
```bash
1. Open csvs/territory_periods.csv
2. Find the row with territory_id and regime_id
3. Update start/end dates
4. Save the file
5. Run: node code/csv2json/territories.js
6. Reload browser
```

### Add a New Territory
```bash
1. Open csvs/territories.csv, add: "40,New Territory Name"
2. Open csvs/territory_periods.csv, add control periods:
   - "40,regime_id,start_year,end_year"
   - (repeat for each regime that controlled it)
3. Save both files
4. Run both scripts:
   - node code/csv2json/territories.js
5. Reload browser
```

### Remove Unused Language/Ethnicity/Religion
```bash
1. Open csvs/languages.csv (or ethnicities/religions)
2. Delete the row with the unused entry
3. (Optional) Verify no regimes reference this ID in regimes.csv
4. Save the file
5. Rebuild: node code/csv2json/regimes.js
6. Reload browser
```

---

## Performance Characteristics

| Operation | Speed | Notes |
|-----------|-------|-------|
| Generate states.json | <100ms | Single file, minimal processing |
| Generate 138 regimes | 500ms-1s | Reads CSV, writes 138 files |
| Generate 39 territories | 1-2s | Reads territories.csv + territory_periods.csv (301 rows), merges |
| Load regimes.json | ~50ms | Single network request |
| Load all territories | ~200ms | 39 separate requests (optimize: combine into single file if needed) |
| Edit CSV + regenerate | 2-3s | Human-perceived latency is page reload, not script |

---

## Future Enhancements

### Not Yet Implemented

1. **Tree generation to JSON**: Currently ethnicities, languages, religions stay in CSV. Could generate to `data/ethnicities/*.json` similar to regimes.

2. **SQLite/DuckDB backend**: Schema is normalized for database. Could swap CSV storage with SQLite for query power while keeping same API.

3. **Metadata enrichment**: Currently CSVs have sparse metadata. Could populate descriptions, founding dates, etc. via LLM pipeline.

4. **Validation framework**: More comprehensive FK/constraint checking with detailed error reports.

5. **Diff/merge tools**: Tools to manage CSV conflicts in version control (diffs are hard to read in CSV).

6. **Batch import tools**: Scripts to import historical data from external sources (Wikipedia, academic databases).

---

## Debugging

### JSON files aren't updating after editing CSV
- Verify CSV was saved
- Run generation script with verbose output: `node code/csv2json/regimes.js 2>&1`
- Check `data/regimes/` timestamps (newer than your CSV edit?)

### Foreign key validation errors
- Check spelling and numeric IDs
- Verify referenced ID exists in the target table
- Look at error message for which regime/territory has the invalid FK

### Visualizations not showing new data
- Hard-refresh browser (Ctrl+F5)
- Check browser console (F12) for JavaScript errors
- Verify JSON file exists: `ls -la data/regimes/` (for regimes) or `data/territories/` (for territories)

---

## Related Documentation

- **`ERD.md`** — Complete ER diagram and table schemas
- **`CSV_WORKFLOW.md`** — Step-by-step guide to editing CSVs
- **`README.md`** — Overview of all docs
- **`regime.md`** — Regime semantics and examples
- **`ethnicity.md`** — Ethnicity tree structure
- **`religion.md`** — Religion tree structure
