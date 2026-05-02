# CivRegime ERD

## Two-Tier Political Hierarchy

```
Civilization (political continuity)          e.g. "Roman Civilization", "French Civilization"
  └─ Polity (political entity)        e.g. Roman Republic, Kingdom of France
```

Dynasty (192 records) is modelled as a cross-cutting tag via `polity_dynasty` — a dynasty can span multiple polities (House of Bourbon → Old Regime + Bourbon Restoration), and a polity can have multiple dynasties over its lifetime.

## Active Tables

```
                ┌─────────────┐
                │    civilization    │
                ├─────────────┤
                │ PK id       │
                │    name     │
                │    descr.   │
                └──────┬──────┘
                       │ 1
                       ▼ N
┌──────────────┐   ┌──────────────────────────────────────┐   ┌──────────────┐
│  ethnicity   │   │              polity                   │   │  government  │
├──────────────┤   ├──────────────────────────────────────┤   ├──────────────┤
│ PK id        │◄──│ PK id                                 │──►│ PK id        │
│ FK parent_id │   │ FK civilization_id                           │   │    name      │
│    name      │   │ FK ruling_ethnicity                   │   │    finer_type│
│    depth     │   │ FK cultural_language                   │   └──────────────┘
│    ...       │   │ FK religion                           │
└──────────────┘   │ FK government                         │   ┌──────────────┐
                   │    name, note                         │   │  language    │
┌──────────────┐   │    start_year, end_year               │   ├──────────────┤
│   religion   │   └───┬───────┬───────┬──────────┬────────┘   │ PK id        │
├──────────────┤       │       │       │          │            │ FK parent_id │
│ PK id        │◄──────┘       │       │          │            └──────────────┘
│ FK parent_id │               ▼       ▼          ▼
└──────────────┘   ┌─────────────────┐  ┌──────────┐  ┌─────────────────────┐
                   │ polity_territory│  │  figure  │  │  polity_succession  │
                   ├─────────────────┤  ├──────────┤  ├─────────────────────┤
                   │ FK polity_id    │  │ PK id    │  │ FK from_polity_id   │
                   │ FK territory_id │  │ FK polity│  │ FK to_polity_id     │
                   │    start_year   │  │    name  │  │    type, strength   │
                   │    end_year     │  │    role  │  │    same_ethnicity   │
                   └────────┬────────┘  └──────────┘  │    same_language    │
                            ▼                         │    same_religion    │
                   ┌──────────────┐                   │    territorial_dir  │
                   │  territory   │                   └─────────────────────┘
                   ├──────────────┤
                   │ PK id        │      ┌──────────────────────────────────┐
                   │    name      │      │  polity_dynasty (junction)       │
                   └──────────────┘      ├──────────────────────────────────┤
                                         │ FK polity_id                     │
                   ┌──────────────┐      │ FK dynasty_id                    │
                   │   dynasty    │◄─────│    start_year, end_year          │
                   ├──────────────┤      └──────────────────────────────────┘
                   │ PK id        │
                   │    name      │
                   │    ethnicity │
                   │    note      │
                   └──────────────┘
```

## Table Summary

| Layer | Table | Records | Source |
|-------|-------|---------|--------|
| **Geography** | territory | 53 | csvs/territory.csv |
| **Taxonomy** | ethnicity | 276 | csvs/ethnicity.csv |
| | language | 691 | csvs/language.csv |
| | religion | 255 | csvs/religion.csv |
| | government | 26 | csvs/government.csv |
| **Political T1** | civilization | ~20 | csvs/civilization.csv |
| **Political T2** | polity | 428 | csvs/polity.csv |
| | polity_territory | 939 | csvs/polity_territory.csv |
| | polity_policy | 26 | from polity.csv |
| | polity_succession | 1,995 | csvs/successions.csv |
| | polity_succession_territory | ~5,000 | embedded |
| **Dynasty** | dynasty | 192 | csvs/dynasty.csv |
| | polity_dynasty | ~400 | csvs/polity_dynasty.csv |
| **People** | figure | 285 | csvs/figure.csv |

## Planned Tables (not yet active)

- `culture` — prehistoric/archaeological entities (~100 expected)
- `history_panel` / `history_column` / `history_cell` — panel visualization layer (~4,600 cells)
- `province` / `province_period` — fine-grained GeoJSON

## Example Queries

```sql
-- All polities under a single civilization, in chronological order
SELECT p.id, p.name, p.start_year, p.end_year
FROM polity p
WHERE p.civilization_id = 'roman_civilization'
ORDER BY p.start_year;

-- Dynasties of a polity (which families ruled when)
SELECT d.name AS dynasty, pd.start_year, pd.end_year
FROM polity_dynasty pd
JOIN dynasty d ON pd.dynasty_id = d.id
WHERE pd.polity_id = 'kingdom_of_france'
ORDER BY pd.start_year;

-- Polities that share a dynasty (cross-polity dynasty span)
SELECT p.name, p.start_year, p.end_year
FROM polity p
JOIN polity_dynasty pd ON pd.polity_id = p.id
JOIN dynasty d ON pd.dynasty_id = d.id
WHERE d.id = 'house_of_bourbon'
ORDER BY p.start_year;

-- What polities controlled Anatolia in 1200 CE?
SELECT p.name, pt.start_year, pt.end_year
FROM polity p
JOIN polity_territory pt ON p.id = pt.polity_id
WHERE pt.territory_id = 'anatolia'
  AND pt.start_year <= 1200
  AND (pt.end_year >= 1200 OR pt.end_year IS NULL);

-- Successions where ethnicity flipped (identity break)
SELECT p1.name AS predecessor, p2.name AS successor, ps.territorial_direction
FROM polity_succession ps
JOIN polity p1 ON ps.from_polity_id = p1.id
JOIN polity p2 ON ps.to_polity_id = p2.id
WHERE ps.same_ethnicity = false
ORDER BY p2.start_year;
```
