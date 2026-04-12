# Documentation Guide

This directory contains all reference documentation for the CivRegime historical simulation.

## Documentation Structure

### Core References
- **`ERD.md`** — Entity-Relationship Diagram showing database schema, table structures, foreign key relationships, and the CSV → JSON generation pipeline
- **`CSV_WORKFLOW.md`** — Practical guide for editing CSV files and regenerating JSON outputs
- **`data-model.md`** — Legacy: Entity schemas and field definitions (being migrated to CSV-based system)
- **`regime.md`** — Regime semantics and historical examples
- **`succession.md`** — Legacy documentation (may be deprecated)
- **`ideology.md`** — Government forms and ideology models
- **`ethnicity.md`** — Ethnicity taxonomy reference
- **`religion.md`** — Religion taxonomy reference

### Data Source: CSV Files
The authoritative source of all historical data is in `csvs/`:

- **`csvs/states.csv`** — Political continuities (groups related regimes)
- **`csvs/polity.csv`** — Historical eras/polities with ruling culture, language, religion, and timespan
- **`csvs/territories.csv`** — Geographic regions
- **`csvs/polity_territory.csv`** — Territory control timeline (which polity controlled which territory when)
- **`csvs/ethnicity.csv`** — Ethnic/cultural hierarchy (tree structure)
- **`csvs/languages.csv`** — Language hierarchy (tree structure)
- **`csvs/religions.csv`** — Religion hierarchy (tree structure)

### Generated JSON Output
Automatically generated from CSVs via `code/makejson/` scripts:

- **`data/states.json`** — All states in a single file
- **`data/polity/*.json`** — One JSON file per polity
- **`data/territories/*.json`** — One JSON file per territory with embedded control timeline

### Legacy Trees (Deprecated)
Located in `docs/tree/`:
- **`language.md`** — Deprecated in favor of `csvs/languages.csv`
- **`religion.md`** — Deprecated in favor of `csvs/religions.csv`
- **`ethnicity.md`** — Deprecated in favor of `csvs/ethnicity.csv`

### Task Tracking
- **`todo/`** — Work tracking and issue logs (internal use)

## How to Use This Documentation

### For Understanding the Data Model
1. Read **`ERD.md`** for the complete Entity-Relationship Diagram and CSV table structures
2. Read **`CSV_WORKFLOW.md`** for a practical guide to editing data
3. Reference specific entity docs (`regime.md`, `ethnicity.md`, etc.) for semantic details

### For Editing Historical Data (CSV-First Workflow)
1. **Single source of truth:** All data originates in CSV files (`csvs/`)
2. **To make changes:**
   - Edit the appropriate CSV file (using spreadsheet editor or text editor)
   - Run the generation scripts in `code/makejson/` to regenerate JSON
   - Visualizations automatically load the updated JSON files
3. **See `CSV_WORKFLOW.md`** for detailed examples and best practices

### For Contributing New Historical Data
1. **To add a new polity:**
   - Add a row to `csvs/polity.csv`
   - Ensure it references valid state_id, ethnicity_id, language_id, religion_id
   - Run: `node code/makejson/polity.js`

2. **To add territories and control periods:**
   - Add row to `csvs/territories.csv`
   - Add corresponding rows to `csvs/polity_territory.csv` with the control timeline
   - Run: `node code/makejson/territories.js`

3. **To reorganize the ethnicity/language/religion hierarchies:**
   - Edit `csvs/ethnicity.csv`, `csvs/languages.csv`, or `csvs/religions.csv`
   - Adjust `parent_id` values to rearrange the tree structure
   - Note: Tree JSON generation not yet implemented; trees are queried directly from CSV

## File Format Conventions

### CSV Format
All data originates in CSV files with the following structure:

**Flat Tables (STATES, POLITIES, TERRITORIES):**
```csv
id,name,other_fields...
1,Display Name,value1,value2
```

**Hierarchical Trees (ETHNICITY, LANGUAGES, RELIGIONS):**
```csv
id,old_id,name,parent_id,description,founded
1,,Root Name,,Optional description,
2,semantic_id,Child Name,1,Optional description,1000
```

**Junction Tables (POLITY_TERRITORY):**
```csv
territory_id,polity_id,start,end,polity_name
1,5,-2686,-2181,Optional name for reference
```

### JSON Schema (Generated Output)
Generated JSON files follow this schema:

**Polity Example:**
```json
{
  "id": "1",
  "name": "Roman Empire (Pagan)",
  "state_id": 1,
  "ruling_ethnicity": 5,
  "ruling_language": 335,
  "ruling_religion": 106,
  "start": -27,
  "end": 380
}
```

**Territory Example:**
```json
{
  "id": "egypt",
  "name": "Egypt",
  "polity_count": 17,
  "polities": [
    {"polity_id": "1", "start": -2686, "end": -2181},
    {"polity_id": "2", "start": -2181, "end": -2055}
  ]
}
```

### Directory Structure
- CSV files: `csvs/*.csv` (source of truth)
- Generated JSON: `data/states.json`, `data/polity/*.json`, `data/territories/*.json`
- Generation scripts: `code/makejson/*.js`

## Data Workflow

The new CSV-first architecture:

1. **CSV Source Phase**
   - All data stored in normalized CSV files
   - Each table represents an entity type (states, regimes, territories, etc.)
   - Trees use `parent_id` column for self-referential hierarchy

2. **Generation Phase**
   - Run `code/makejson/` scripts to convert CSV → JSON
   - Scripts apply transformations:
     - Convert numeric FK references to semantic IDs
     - Merge related tables (regimes + territories)
     - Normalize date ranges
   - Output JSON files ready for frontend consumption

3. **Frontend Phase**
   - Frontend loads JSON files and powers visualizations
   - Changes flow: CSV edit → generation → JSON updated → visualizations refresh

This keeps data maintenance simple (edit CSVs directly) while optimizing frontend performance (pre-computed JSON).

## For Developers

### Code Structure
- **`code/makejson/`** — Data generation scripts
  - `states.js` — Converts `csvs/states.csv` → `data/states.json`
  - `polity.js` — Converts `csvs/polity.csv` → `data/polity/*.json`
  - `territories.js` — Merges `csvs/territories.csv` + `csvs/polity_territory.csv` → `data/territories/*.json`

### Running the Pipeline
```bash
# Regenerate all JSON outputs
npm run make:all
# Or individually:
npm run make:polity
npm run make:successions
```

### Adding New Data
- **For a new polity:** Add row to `csvs/polity.csv`, run `node code/makejson/polity.js`
- **For a new territory:** Add row to `csvs/territories.csv` and control periods to `csvs/polity_territory.csv`, run `node code/makejson/territories.js`
- **For a new ethnic/language/religion:** Add row to the appropriate CSV (tree structure via `parent_id`)

See `data/README.md` for:
- How data files are loaded by the server
- Frontend data loading architecture
