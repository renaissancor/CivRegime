# CSV Workflow Guide

This guide explains how to edit data in CivRegime using the CSV system and regenerate JSON outputs.

## Quick Start

### 1. Edit a CSV File
Open any CSV file in `csvs/` with a spreadsheet editor (Excel, LibreOffice Calc, Google Sheets) or a text editor.

### 2. Run Generation Scripts
```bash
# Regenerate all outputs
node code/csv2json/states.js
node code/csv2json/regimes.js
node code/csv2json/territories.js

# Or run all at once
node code/csv2json/states.js && node code/csv2json/regimes.js && node code/csv2json/territories.js
```

### 3. Refresh Frontend
The frontend will automatically load the updated JSON files. Changes appear in visualizations on page reload.

---

## CSV Files and How to Edit Them

### **states.csv** - Political Continuities
Groups related regimes under long-term political entities. Each regime must reference a state via `state_id`.

**Columns:**
- `id`: Numeric identifier (1, 2, 3...)
- `name`: Display name (e.g., "Roman State")
- `description`: Optional history/notes

**Example:**
```csv
id,name,description
1,Roman State,Political continuity from Augustus to 1453
2,Ottoman State,Political continuity from Osman I to 1923
```

**When to edit:**
- Add a new state when you have a group of regimes that represent a distinct political continuity
- Update descriptions to clarify the state's historical span

---

### **regimes.csv** - Historical Eras
The main historical data. Each row represents an era or regime with ruling culture, ideology, and timespan.

**Columns:**
- `id`: Unique numeric identifier (1, 2, 3...)
- `name`: Display name (e.g., "Roman Empire (Pagan)")
- `state_id`: FK to STATES.id (groups regimes into political continuities)
- `id_ruling_ethnicity`: FK to ETHNICITIES.id (numeric ID of ruling culture)
- `id_ruling_language`: FK to LANGUAGES.id (numeric ID of official language)
- `id_ruling_religion`: FK to RELIGIONS.id (numeric ID of official religion)
- `start`: Start year (negative = BCE, e.g., -27 for 27 BCE)
- `end`: End year (NULL or blank for ongoing)
- `old_id`: Original semantic ID for reference (e.g., "roman_empire_pagan")

**Example:**
```csv
id,name,state_id,id_ruling_ethnicity,id_ruling_language,id_ruling_religion,start,end,old_id
1,Roman Empire (Pagan),1,5,335,106,-27,380,roman_empire_pagan
2,Roman Empire (Christian),1,5,335,107,380,476,roman_empire_christian
3,Byzantine Empire,1,12,400,108,395,1453,byzantine_empire
```

**When to edit:**
- Add a new regime by inserting a new row
- Update regime name, dates, or cultural references
- Reassign a regime to a different state via `state_id`
- Correct spelling or simplify redundant names

**Common edits:**
```csv
# Change end date
1,Roman Empire (Pagan),1,5,335,106,-27,410,roman_empire_pagan

# Add new regime
139,New Kingdom Egypt,3,8,42,15,-1550,-1070,new_kingdom_egypt

# Remove regime (delete entire row, not just mark)
```

---

### **territories.csv** - Geographic Regions
List of territories (geographic regions) controlled by regimes. Territory control periods are stored separately in `territory_periods.csv`.

**Columns:**
- `id`: Unique identifier (numeric or text, e.g., 1 or "egypt")
- `name`: Display name (e.g., "Egypt")

**Example:**
```csv
id,name
1,Egypt
2,Mesopotamia
3,Greece
4,Persia
5,India
```

**When to edit:**
- Add new territories to expand geographic coverage
- Rename territories for clarity
- Remove territories (delete entire row)

**Note:** Territory control history is managed in `territory_periods.csv`, not here.

---

### **territory_periods.csv** - Territory Control Timeline
Junction table linking territories to the regimes that controlled them, with start/end dates.

**Columns:**
- `territory_id`: FK to TERRITORIES.id (numeric or text)
- `regime_id`: FK to REGIMES.id (numeric)
- `start`: Period start year (negative = BCE)
- `end`: Period end year
- `regime_name`: Human-readable regime name (optional, for reference)

**Example:**
```csv
territory_id,regime_id,start,end,regime_name
1,5,-2686,-2181,Old Kingdom Egypt
1,6,-2181,-2055,First Intermediate Period
1,7,-2055,-1650,Middle Kingdom Egypt
1,8,-1550,-1070,New Kingdom Egypt
```

**When to edit:**
- Add a new regime control period for a territory
- Update dates when a regime's control period changes
- Add a regime controlling a new territory

**Rules:**
- One row per territory-regime period combination
- Dates should not overlap for the same territory (unless intentional for disputed control)
- If adding new regimes, use their numeric ID from `regimes.csv`

---

### **ethnicities.csv** - Ethnic/Cultural Hierarchy
Hierarchical tree of ethnic and cultural groups. Forms a tree structure via `parent_id` self-reference.

**Columns:**
- `id`: Numeric identifier (1, 2, 3...)
- `old_id`: Original semantic ID for reference (e.g., "han_chinese")
- `name`: Display name (e.g., "Han Chinese")
- `parent_id`: FK to ETHNICITIES.id (numeric, NULL for roots)
- `description`: Optional notes
- `founded`: Founding year (optional)

**Example:**
```csv
id,old_id,name,parent_id,description,founded
1,,Indo-European,,Large language family,
5,,Latin,,Roman ethnicity,
8,,Germanic,,Germanic peoples,
12,,Hellenic,,Greek ethnicity,
```

**When to edit:**
- Add new ethnic groups by inserting rows with a `parent_id` to position them in the tree
- Update names or descriptions
- Reorganize the tree by changing `parent_id` values
- Remove unused ethnicities

**Tree structure example:**
```
Indo-European (id=1, parent=NULL)
  ├─ Latin (id=5, parent=1)
  ├─ Germanic (id=8, parent=1)
  └─ Hellenic (id=12, parent=1)
```

---

### **languages.csv** - Language Hierarchy
Hierarchical tree of languages. Structure identical to `ethnicities.csv`.

**Columns:**
- `id`: Numeric identifier
- `old_id`: Original semantic ID
- `name`: Display name
- `parent_id`: FK to LANGUAGES.id (NULL for roots)
- `description`: Optional notes
- `founded`: Founding year (optional)

**When to edit:**
- Build or reorganize the language tree
- Currently contains ~62 languages (cleaned from 698 unused entries)
- Add new languages by referencing parent language families

---

### **religions.csv** - Religion Hierarchy
Hierarchical tree of religions and denominations. Structure identical to `ethnicities.csv`.

**Columns:**
- `id`: Numeric identifier
- `old_id`: Original semantic ID
- `name`: Display name
- `parent_id`: FK to RELIGIONS.id (NULL for roots)
- `description`: Optional notes
- `founded`: Founding year (optional)

**When to edit:**
- Build or reorganize the religion tree
- Add new religions or denominations
- Update foundational dates (e.g., when Christianity split from Judaism)

**Tree structure example:**
```
Abrahamic Religions (id=1, parent=NULL)
  ├─ Judaism (id=2, parent=1)
  ├─ Christianity (id=3, parent=1)
  │  ├─ Catholicism (id=4, parent=3)
  │  ├─ Orthodoxy (id=5, parent=3)
  │  └─ Protestantism (id=6, parent=3)
  └─ Islam (id=7, parent=1)
```

---

## Numeric ID System

All tree structures (ethnicities, languages, religions) use **numeric IDs** instead of semantic text IDs. This avoids inconsistency when the same entity is referenced from multiple data sources.

### Why Numeric IDs?
- **Consistency**: Prevents naming mismatches (e.g., "han" vs. "han_chinese" vs. "Han Chinese")
- **Stability**: IDs don't change if you rename an entity
- **Relationships**: Foreign keys are simple integers, not fragile string matches

### old_id Column
The `old_id` column preserves the original semantic identifier for reference and debugging. It's optional but useful for:
- Understanding which entity was renamed
- Finding old JSON files that used semantic IDs
- Mapping between old and new systems

### Example:
```csv
id,old_id,name,parent_id
1,,Indo-European,,
5,latin,Latin,1
335,medieval_latin,Medieval Latin,5
```

---

## Validation and Error Handling

When you run the generation scripts, they check for common errors:

### Foreign Key Violations
If `regimes.csv` references an ethnicity, language, or religion ID that doesn't exist, the script warns you:
```
ERROR: Regime 1 references id_ruling_ethnicity=999, but no ethnicity with id=999 exists
```

**Fix:** Update the regimes.csv row to reference a valid ID.

### Missing State
If a regime references a `state_id` that doesn't exist in `states.csv`:
```
WARNING: Regime 1 references state_id=999, but no state with id=999 exists
```

**Fix:** Either create the state in `states.csv` or set `state_id` to an existing state (or NULL).

### Parent ID in Trees
If an ethnicity/language/religion has a `parent_id` that doesn't exist:
```
WARNING: Ethnicity 100 has parent_id=999, which doesn't exist
```

**Fix:** Either create the parent or set `parent_id` to NULL (making it a root).

---

## Workflow Examples

### Add a New Regime
1. Open `csvs/regimes.csv`
2. Add a new row:
   ```csv
   139,Macedonian Empire,2,42,150,50,-336,-323,macedonian_empire
   ```
3. Run: `node code/csv2json/regimes.js`
4. Check `data/regimes/139.json` to verify output

### Add a Territory and Its Control History
1. Open `csvs/territories.csv`
   ```csv
   40,Anatolia
   ```
2. Open `csvs/territory_periods.csv` and add control periods:
   ```csv
   40,15,-1200,-500,Hittite Empire
   40,42,-500,-330,Persian Empire
   40,139,-336,-323,Macedonian Empire
   ```
3. Run: `node code/csv2json/territories.js`
4. Check `data/territories/40.json` to verify the timeline

### Reorganize the Religion Tree
1. Open `csvs/religions.csv`
2. Update `parent_id` values to rearrange:
   ```csv
   3,christianity,Christianity,1,Founded by Jesus,0
   50,coptic_christianity,Coptic Christianity,3,Ancient Christian tradition,150
   ```
3. No generation script needed for tree files (they're not yet generated to JSON)
4. Frontend can query the tree structure directly from CSV

---

## Tips and Best Practices

1. **Backup before major edits**: Make a git commit before bulk edits to territory_periods or regimes
2. **Use consistent date format**: Negative for BCE, positive for CE (e.g., -27 for 27 BCE)
3. **Keep parent_id consistent**: In tree structures, ensure parent exists before referencing it
4. **Avoid duplicate IDs**: Each entity must have a unique ID within its table
5. **Keep old_id for reference**: Preserve old semantic IDs so you can trace history and debug
6. **Run all scripts after major changes**: After editing multiple CSVs, regenerate all JSON to ensure consistency

---

## Troubleshooting

**JSON files not updating?**
- Make sure you saved the CSV file (not just closed the editor)
- Run the generation script again: `node code/csv2json/regimes.js`
- Check the console output for errors

**Foreign key errors?**
- Verify the ID exists in the referenced CSV
- Use numeric IDs consistently (don't mix "1" and "01")
- Check for typos in ID references

**Visualizations not changing?**
- Hard-refresh the browser (Ctrl+F5 or Cmd+Shift+R)
- Check the browser console for JavaScript errors
- Ensure JSON files were generated (check timestamps on files in `data/`)

---
