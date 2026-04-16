# Naming Architecture — Entity ID Conventions

## The Problem

Panel labels are free-text display strings with many formats:

| Pattern | Example | Count |
|---------|---------|-------|
| `(qualifier)` | `Khmer Empire (Angkor — declining)` | 2,040 |
| `X — Y` (em-dash) | `Frankish Kingdom — Merovingian dynasty` | 865 |
| `X · Y` (middle-dot) | `Alexander the Great · Seleucid` | 530 |
| `X / Y` (slash) | `Kidarites / Xionites` | 253 |
| `X → Y` (arrow) | `Austrian Empire → Austria-Hungary` | 137 |

One entity can appear with different labels across panels:
- "Tahirid dynasty" vs "Tahirid Dynasty" (case)
- "Qing" vs "Qing dynasty" vs "Qing Dynasty (清)" (verbosity)
- "Frankish Kingdom — Merovingian dynasty" vs "Frankish Kingdom — Carolingian dynasty" (same polity, different regime)

## ID Design Principles

1. **IDs are permanent** — once assigned, never renamed
2. **IDs are entity-scoped** — one ID per real-world entity, regardless of how many panels reference it
3. **IDs are human-readable** — `ottoman_empire` not `P-0047`
4. **Labels are display-only** — free text, can vary by panel context

## ID Formats by Entity Type

### States (`states` table)

Pattern: `{name}_state`

```
roman_state
french_state
chinese_state
persian_state
```

States are political continuity groupings. Few in number (~20–30).

### Polities (`polities` table)

Pattern: `{descriptive_name}` — snake_case of the most common English name.

```
roman_republic
roman_empire
ottoman_empire
kingdom_of_france
ming_dynasty          ← Chinese dynasties are polity-level (they ARE the state)
joseon                ← Short name when unambiguous
republic_of_turkey
```

Rules:
- Drop articles only when they start the name: "The Roman Empire" → `roman_empire`
- Keep prepositions when they're part of the name: `kingdom_of_france`
- Use the anglicized name: `ottoman_empire` not `osmanli_devleti`
- For non-Western polities, prefer the endonym when it's the common English usage: `joseon` not `kingdom_of_joseon`
- Max ~40 characters

### Regimes (`regimes` table)

Pattern: `{polity_id}__{dynasty_or_period}`  (double underscore separates polity from regime)

```
kingdom_of_france__capetian
kingdom_of_france__valois
kingdom_of_france__bourbon
roman_empire__julio_claudian
roman_empire__severan
ottoman_empire__early_expansion
ottoman_empire__tanzimat
```

If no polity link yet (standalone dynasty): `{dynasty_name}_dynasty`
```
samanid_dynasty
tahirid_dynasty
ghaznavid_dynasty
```

### Cultures (`cultures` table)

Pattern: `{name}_culture` (when archaeological) or `{name}` (when named civilization)

```
minoan_culture
mycenaean_culture
yangshao_culture
hallstatt_culture
jomon                 ← widely known by single name
```

### Ethnicities, Languages, Religions

Already established — use the existing `old_id` slug from the JSON directory tree.

## Parsing Panel Labels → Entity IDs

### Step 1: Strip display-only parts

| Pattern | What to strip | Example |
|---------|--------------|---------|
| `(native script)` | Remove `(清)`, `(唐)` etc. | `Qing Dynasty (清)` → `Qing Dynasty` |
| `(context note)` | Remove `(Clovis I)`, `(declining)` | `Frankish Kingdom (Clovis I)` → `Frankish Kingdom` |
| `— qualifier` | Split on em-dash | `Frankish Kingdom — Merovingian dynasty` → polity=`Frankish Kingdom`, regime=`Merovingian dynasty` |
| `X → Y` | Treat as transition event, not entity | `Austrian Empire → Austria-Hungary` → event label |
| `X / Y` | Alternative names — pick first, note aliases | `Kidarites / Xionites` → `kidarites` |
| `X · Y` | Multiple items — resolve individually | `Ur · Uruk · Lagash` → keep as compound |

### Step 2: Normalize

1. Lowercase
2. Replace spaces/hyphens with `_`
3. Remove accents/diacritics for the ID (keep in `name` field)
4. Drop trailing "dynasty" / "empire" / "kingdom" only if already specified in the polity type

### Step 3: Deduplicate

Match against existing polity IDs first (`existingPolityIds`), then against other new labels.

Priority:
1. Exact match on existing `polities.id`
2. Fuzzy match on existing `polities.name` (Levenshtein ≤ 2)
3. Match by normalized stem (e.g., `tahirid` matches both "Tahirid dynasty" and "Tahirid Dynasty")
4. New ID if no match found

### Step 4: Assign

- **Polity + dynasty in one label** → create both, link via `regimes.polity_id`
  - "Frankish Kingdom — Merovingian dynasty"
  - → polity: `frankish_kingdom`
  - → regime: `frankish_kingdom__merovingian`
- **Standalone dynasty** → regime only (link polity later)
  - "Samanid dynasty" → `samanid_dynasty`
- **Polity only** → polity record
  - "Venice Republic" → `venice_republic`

## Cross-Panel Deduplication

The same entity ID appears across many panels:

```
byzantine_empire    → 19 panels
ottoman_empire      → 15 panels
mongol_empire       → 13 panels
```

Each panel cell gets a `history_cells` record pointing to the **same** polity/regime ID.
The `label` field in `history_cells` stays panel-specific (can include context like "Ottoman Empire — Rumelia").

## Collision Resolution

If two genuinely different entities would generate the same ID:

1. Add geographic qualifier: `jin_dynasty_north` vs `jin_dynasty_jurchen`
2. Add temporal qualifier: `wei_dynasty_386` vs `cao_wei_220`
3. For Chinese dynasties with shared names, use the established convention:
   - `cao_wei` (曹魏, 220–266)
   - `northern_wei` (北魏, 386–535)
   - `jin_western` (西晋)
   - `jin_eastern` (东晋)
