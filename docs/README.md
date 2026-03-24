# Documentation Guide

This directory contains all reference documentation for the CivRegime Inheritance Framework (CRIF).

## Documentation Structure

### Core References
- **`data-model.md`** — Complete entity schemas, field definitions, and edge type reference for all CRIF objects (Regimes, Successions, Territories, Languages, Religions, Ethnicities)
- **`regime.md`** — Regime field definitions, examples, and the distinction between historical regimes and dynasties
- **`succession.md`** — Succession type logic (A/A-/B/C/D), validation paths, and edge case handling
- **`ideology.md`** — Government forms and ideology model; distinction between ideology and policy
- **`ethnicity.md`** — Ethnicity taxonomy model and metadata fields
- **`religion.md`** — Religion taxonomy model and metadata fields

### Hierarchical Trees (Source of Truth for Code Generation)
Located in `docs/tree/`:

- **`language.md`** — Comprehensive world language taxonomy (36+ families, 552+ languages)
  - Hierarchical: Family → Branch → Group → Language
  - Format: Markdown with numbered sections and parenthetical status notes `(extinct)`, `(historical)`
  - Used by `code/makejson/languages.js` to generate `data/languages/` JSON files
  
- **`religion.md`** — Theological taxonomy (9+ families, 193+ traditions/sects)
  - Hierarchical: Theological Family → Tradition → Branch/Sect
  - Format: Markdown with numbered sections, includes founder/date context
  - Used by `code/makejson/religions.js` to generate `data/religions/` JSON files
  
- **`ethnicity.md`** — World ethnicity taxonomy (11+ blocs, 203+ ethnic groups)
  - Hierarchical: Affinity Bloc → People Cluster → Ethnic Group
  - Format: Markdown with historical and modern classifications
  - Used by `code/makejson/ethnicities.js` to generate `data/ethnicities/` JSON files

### Task Tracking
- **`todo/`** — Work tracking and issue logs (internal use)

## How to Use This Documentation

### For Understanding CRIF Data Model
1. Start with the main `README.md` at the project root for philosophy and overview
2. Read `data-model.md` for complete field definitions
3. Read specific entity docs (`regime.md`, `succession.md`, etc.) for detailed semantics

### For Working with Taxonomies (Languages, Religions, Ethnicities)
1. The **markdown tree files** (`docs/tree/language.md`, etc.) are the **canonical source of truth**
2. These files organize the hierarchy in human-readable markdown format
3. Code generators (`code/makejson/*.js`) parse these markdown files and generate JSON
4. The resulting JSON files in `data/languages/`, `data/religions/`, `data/ethnicities/` are **derived outputs**

### For Contributing New Data
1. **To add a new language/religion/ethnicity:**
   - Edit the corresponding `docs/tree/*.md` file
   - Run the code generator: `node code/makejson/languages.js` (or religions/ethnicities)
   - This auto-generates or updates JSON files in the appropriate directory tree
   
2. **To populate metadata (descriptions, founding years, etc.):**
   - See `docs/languages-world-reference.md` for detailed language metadata (auto-generated)
   - Use the CSV workflow: metadata → CSV → merge into JSON (see `code/README.md` for pipeline)
   - Cheaper LLMs (Gemini, Claude Haiku) can populate CSV files before merge

## File Format Conventions

### JSON Schema
All JSON taxonomy files follow this schema:
```json
{
  "id": "lowercase_with_underscores",
  "name": "Display Name",
  "parent": "parent_id_or_null",
  "description": null,
  "founded_year": null,
  "status": null,
  ... (domain-specific fields)
}
```

Fields with `null` values are placeholders for future enrichment via CSV pipeline.

### Markdown Tree Format
- Numbered headers: `## 1. FAMILY_NAME` (top-level branches)
- Subsections: `### Branch Name`, `#### Sub-branch Name`
- List items: `- Item Name` or `- **Item Name** (metadata)`
- Status markers: `(extinct)`, `(historical)`, dates in parentheses

### Directory Structure
For generated JSON files:
- Spaces and hyphens in names are converted to underscores: `indo_european`, `west_germanic`
- Nested directory path mirrors taxonomy hierarchy
- Leaf files: `group/item/item.json` 
- Branch nodes: `group/index.json` (contains metadata for that branch)

## Metadata Enrichment Pipeline

The framework uses a deferred enrichment pattern to keep generation fast:

1. **Generation Phase** (cheap, fast)
   - Code generators create skeleton JSON with null metadata fields
   - Preserves id, name, parent, and structural relationships

2. **Metadata Phase** (deferred to cheaper LLMs)
   - Extract id/name pairs into CSV files
   - Use Gemini (or similar cheap LLM) to populate descriptions, dates, status
   - CSV files are intermediate format before JSON merge

3. **Merge Phase**
   - Merge CSV metadata back into JSON files
   - Updates null fields with real values
   - Preserves structural integrity

This keeps high-level metadata work cost-effective while maintaining data integrity.

## For Developers

See `code/README.md` for:
- How code generators work
- Pipeline architecture
- Running scripts and validation
- Contributing new generators

See `data/README.md` for:
- Data file organization
- How data files are loaded by the server
- Foreign key relationships
- Data loading pipeline
