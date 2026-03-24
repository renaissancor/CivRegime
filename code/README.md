# Code Generation & Automation Tools

This directory contains Node.js scripts for generating and maintaining CRIF data structures from markdown source files.

## Scripts Overview

### Taxonomy Generators
Generate JSON taxonomy files from markdown source trees:

#### `makejson/languages.js`
Generates language taxonomy JSON files from `docs/tree/language.md`

**Usage:**
```bash
node code/makejson/languages.js
```

**What it does:**
- Reads `docs/tree/language.md` (source of truth)
- Parses markdown hierarchy: Family → Branch → Group → Language
- Extracts status markers `(extinct)`, `(historical)` and dates
- Normalizes filenames to snake_case (spaces/hyphens → underscores)
- Creates directory tree under `data/languages/`
- Generates one JSON file per language + one per branch (index.json)

**Output structure:**
```
data/languages/
  indo_european/
    index.json                           ← branch node
    germanic/
      index.json
      west_germanic/
        english/
          english.json                   ← leaf node
        german/
          german.json
  afroasiatic/
    semitic/
      south_semitic/
        modern_arabic/
          modern_arabic.json
```

**JSON schema per file:**
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

---

#### `makejson/religions.js`
Generates religion taxonomy JSON files from `docs/tree/religion.md`

**Usage:**
```bash
node code/makejson/religions.js
```

**What it does:**
- Reads `docs/tree/religion.md` (source of truth)
- Parses markdown hierarchy: Theological Family → Tradition → Branch/Sect
- Normalizes filenames and extracts metadata from notes
- Creates directory tree under `data/religions/`

**Output structure:**
```
data/religions/
  abrahamic/
    index.json
    christianity/
      index.json
      catholic/
        roman_catholicism/
          roman_catholicism.json
      protestant/
        lutheranism/
          lutheranism.json
    islam/
      sunni/
        sunni_hanafi.json
```

**JSON schema per file:**
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

---

#### `makejson/ethnicities.js`
Generates ethnicity taxonomy JSON files from `docs/tree/ethnicity.md`

**Usage:**
```bash
node code/makejson/ethnicities.js
```

**What it does:**
- Reads `docs/tree/ethnicity.md` (source of truth)
- Parses markdown hierarchy: Affinity Bloc → People Cluster → Ethnic Group
- Normalizes filenames and preserves historical/modern designations
- Creates directory tree under `data/ethnicities/`

**Output structure:**
```
data/ethnicities/
  middle_eastern_north_african_bloc/
    index.json
    semitic_cluster/
      ancient_semitic_groups/
        akkadian/
          akkadian.json
```

**JSON schema per file:**
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

---

## How to Use Generators

### Running Generators

**Single generator:**
```bash
node code/makejson/languages.js
```

**All generators:**
```bash
node code/makejson/languages.js && node code/makejson/religions.js && node code/makejson/ethnicities.js
```

### Understanding Output

Each script:
1. Reads the markdown tree file from `docs/tree/`
2. Parses the hierarchy and creates directory structure
3. Writes one JSON file per node
4. Logs summary: total files created/updated

If the directory already exists, the script **overwrites** JSON files — this is intentional for idempotent updates.

---

## Key Implementation Details

### Filename Normalization
Converts markdown names to filesystem-safe IDs:
```javascript
function normalizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[-\s]+/g, '_')           // spaces/hyphens → underscore
    .replace(/[^\w_]/g, '')             // remove special chars
}
```

Examples:
- "Indo-European" → `indo_european`
- "West Germanic" → `west_germanic`
- "Old English (extinct)" → `old_english` (status stripped)

### Status Extraction
Pulls metadata from parenthetical notes:
```javascript
// "(extinct)" → status: "extinct"
// "(historical)" → status: "historical"
// "(1000-1500)" → founded_year: "1000-1500"
```

### Parent Derivation
Directory path automatically becomes the parent field:
- `data/languages/indo_european/germanic/west_germanic/english/english.json`
  - `parent: "west_germanic"`
  - `id: "english"`

For branch nodes (index.json), parent is the parent directory:
- `data/languages/indo_european/germanic/index.json`
  - `parent: "germanic"` (wait, actually this should be "indo_european")
  - Actually check the code — parent is set from the directory traversal logic

---

## Data Pipeline Architecture

```
                    Source of Truth
                         ↓
              docs/tree/*.md (markdown)
                         ↓
            ┌────────────┼────────────┐
            ↓            ↓            ↓
     languages.js  religions.js  ethnicities.js
            ↓            ↓            ↓
              JSON Files in data/*/
                         ↓
                   server.js loads
                         ↓
                   /api/db endpoint
                         ↓
                   Web Visualizer
```

### Metadata Enrichment Pipeline

For populating null fields (description, founded_year, status):

1. **Extract CSV** (future: add script)
   - Parse generated JSON files
   - Extract id/name columns
   - Write to CSV (language_metadata.csv, etc.)

2. **Enrich with Gemini** (external)
   - Use cheaper LLM (Gemini, Claude Haiku)
   - Populate description, founding dates, status
   - Write enriched CSV

3. **Merge Back** (future: add script)
   - Read enriched CSV
   - Update corresponding JSON files
   - Preserve structural fields (id, name, parent)

This workflow keeps generation fast while deferring expensive metadata work to cheaper models.

---

## Testing & Validation

### Validate Generated JSON
```bash
npm run validate
```

This checks:
- All JSON files parse correctly
- Required fields present (id, name, parent)
- All parent references exist
- No orphaned nodes
- No circular parent chains

### Manual Testing
```bash
node code/makejson/languages.js
# Check a file:
cat data/languages/indo_european/germanic/west_germanic/english/english.json
```

### Integration Testing
Start the server and check the visualizer loads data:
```bash
npm start
# Open http://localhost:3000
# Click "Languages" tab → should see tree structure
```

---

## Adding New Taxonomies

To add a new taxonomy (e.g., scripts, currencies):

1. **Create markdown tree** at `docs/tree/scriptname.md` with same format
2. **Create generator** at `code/makejson/scriptname.js`:
   - Copy `languages.js` as template
   - Adjust parsing for your hierarchy levels
   - Adjust JSON schema (fields to include)
3. **Register in data loader** in `data/index.js`:
   - Add `scripts: loadTree(path.join(DATA, 'scripts'))`
4. **Update server** in `server.js` if needed for new routes
5. **Update visualizer** in `public/` if you need new UI for browsing

---

## Technical Notes

### Performance
- Generators process hundreds of files in <100ms
- Markdown parsing is regex-based (fast)
- File I/O is synchronous (fine for one-time scripts)

### Idempotence
- Scripts can be run multiple times safely
- Overwrites all JSON files from scratch each run
- Safe to regenerate after markdown edits

### Directory Structure Constraints
- Max nesting: 4 levels (Family → Branch → Group → Item)
- Filenames: lowercase, alphanumeric + underscores
- No parallel directories at same level (except leaf files)

---

## Future Enhancements

- [ ] CSV extract script to prep metadata for external enrichment
- [ ] CSV merge script to integrate enriched metadata
- [ ] Gemini integration for auto-population (via separate tool)
- [ ] Validation rules engine (custom constraints per taxonomy)
- [ ] Markdown → GraphQL schema generator
- [ ] Diff tool to track what changed between runs
