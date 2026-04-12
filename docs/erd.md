# CivRegime ERD v2 — Polity / Regime Split

## Three-Tier Political Hierarchy

```
State (political continuity)          e.g. "Roman State", "French State"
  └─ Polity (political entity)        e.g. Roman Republic, Kingdom of France
       └─ Regime (dynasty/period)     e.g. Julio-Claudian, Bourbon dynasty
```

## Entity Relationship Diagram

```
                    ┌─────────────┐
                    │   states    │
                    ├─────────────┤
                    │ PK id       │
                    │    name     │
                    │    descr.   │
                    └──────┬──────┘
                           │ 1
                           ▼ N
┌──────────────┐   ┌──────────────────────────────────────┐   ┌──────────────┐
│ ethnicities  │   │              polities                 │   │  ideologies  │
├──────────────┤   │         (268 existing records)        │   ├──────────────┤
│ PK id        │◄──├──────────────────────────────────────┤──►│ PK id        │
│ FK parent_id │   │ PK id                                 │   │ FK parent_id │
│    name      │   │ FK state_id                           │   │    name      │
│    depth     │   │ FK ruling_ethnicity                   │   └──────────────┘
│    ...       │   │ FK cultural_language                   │
└──────────────┘   │ FK religion                           │   ┌──────────────┐
                   │ FK government                         │   │  languages   │
┌──────────────┐   │    name                               │   ├──────────────┤
│  religions   │   │    start_year, end_year               │   │ PK id        │
├──────────────┤   │    note                               │◄──│ FK parent_id │
│ PK id        │◄──│                                       │   │    name      │
│ FK parent_id │   └───┬───────┬───────┬──────────┬────────┘   │    ...       │
│    name      │       │       │       │          │            └──────────────┘
│    ...       │       │       │       │          │
└──────────────┘       │       │       │          │
                       │       │       │          │
            ┌──────────┘       │       │          └────────────────┐
            ▼                  ▼       ▼                           ▼
   ┌─────────────────┐  ┌──────────┐  ┌──────────────────┐  ┌───────────┐
   │polity_territory│  │ figures  │  │polity_succession│  │ polity_   │
   ├─────────────────┤  ├──────────┤  ├──────────────────┤  │ policies  │
   │ FK polity_id    │  │ PK id    │  │ PK id            │  ├───────────┤
   │ FK territory_id │  │ FK polity│  │ FK from_polity   │  │ FK polity │
   │    start_year   │  │ FK regime│  │ FK to_polity     │  │    policy │
   │    end_year     │  │    name  │  │    type           │  └───────────┘
   └────────┬────────┘  │    role  │  │    strength       │
            │           └──────────┘  │    same_ethnicity │
            ▼                         │    ...            │
   ┌──────────────┐                   └──────────────────┘
   │ territories  │
   ├──────────────┤                 ═══════════════════════
   │ PK id        │                 NEW: Regime Layer
   │    name      │                 ═══════════════════════
   └──────┬───────┘
          │                    ┌────────────────────────────────┐
          ▼                    │            regimes              │
   ┌──────────────┐            │      (~2,500 from panels)      │
   │  provinces   │            ├────────────────────────────────┤
   ├──────────────┤            │ PK id                          │
   │ PK id        │            │ FK polity_id                   │
   │ FK territory │            │    label                       │
   │    name      │            │    dynasty                     │
   │    geojson   │            │    start_year, end_year        │
   └──────┬───────┘            │    note                        │
          │                    └────┬──────────────────────┬────┘
          ▼                         │                      │
   ┌────────────────┐               ▼                      ▼
   │province_periods│        ┌──────────────────┐   ┌─────────────┐
   ├────────────────┤        │regime_successions │   │history_cells│
   │ FK province_id │        ├──────────────────┤   ├─────────────┤
   │ FK polity_id   │        │ FK predecessor   │   │ PK id       │
   │ FK regime_id   │        │ FK successor     │   │ FK column_id│
   │    start_year  │        │    type           │   │ FK regime_id│
   │    end_year    │        └──────────────────┘   │ FK polity_id│
   └────────────────┘                               │ FK culture  │
                                                    │    label    │
   ┌──────────────┐          ┌─────────────────┐    │    era      │
   │   cultures   │          │ history_panels  │    │    years    │
   ├──────────────┤          ├─────────────────┤    │    span     │
   │ PK id        │          │ PK id           │    │    row_order│
   │    name      │          │    title         │    └─────────────┘
   │    type      │          └────────┬────────┘          ▲
   │    years     │                   │                    │
   │    region    │                   ▼                    │
   └──────────────┘          ┌─────────────────┐          │
                             │history_columns  ├──────────┘
                             ├─────────────────┤
                             │ PK id           │
                             │ FK panel_id     │
                             │    name         │
                             │    col_order    │
                             └─────────────────┘
```

## Table Summary

| Layer | Table | Records (est.) | Source |
|-------|-------|---------------|--------|
| **Taxonomy** | ethnicities | 276 | data/ethnicities/ |
| | languages | 691 | data/languages/ |
| | language_scripts | ~300 | embedded |
| | religions | 255 | data/religions/ |
| | religion_deities/tenets/scriptures | ~700 | embedded |
| | ideologies | ~30 | data/ideologies.json |
| **Geography** | territories | 79 | data/territories/ |
| | provinces | 53 | data/provinces/ |
| **Political T1** | states | ~20 | to be created |
| **Political T2** | polities | 268 | data/polity/ |
| | polity_territory | ~1,500 | polity.territories[] |
| | polity_policies | ~50 | polity.policies[] |
| | polity_succession | 1,243 | data/successions/all.json |
| | polity_succession_territories | ~5,000 | succession.shared_territories[] |
| **Political T3** | regimes | ~2,500 | extracted from panels |
| | regime_successions | ~2,300 | derived from stack order |
| **People** | figures | ~200 | polity.figures[] |
| **Cultures** | cultures | ~100 | extracted from panels |
| **Panels** | history_panels | 61 | panel metadata |
| | history_columns | ~180 | panel column defs |
| | history_cells | ~4,600 | panel cells |
| | province_periods | ~500 | province.periods[] |
| | **TOTAL** | **~14,800** | |

## Example Queries

```sql
-- Full political lineage: State → Polity → Regime
SELECT s.name as state, p.name as polity, r.label as regime,
       r.dynasty, r.start_year, r.end_year
FROM states s
JOIN polities p ON p.state_id = s.id
JOIN regimes r ON r.polity_id = p.id
WHERE s.id = 'french_state'
ORDER BY r.start_year;

-- Dynasty succession chain within France
SELECT r1.label as "from", r2.label as "to", rs.type
FROM regime_successions rs
JOIN regimes r1 ON rs.predecessor_id = r1.id
JOIN regimes r2 ON rs.successor_id = r2.id
JOIN polities p ON r1.polity_id = p.id
WHERE p.state_id = 'french_state'
ORDER BY r1.start_year;

-- What polities controlled Anatolia in 1200 CE?
SELECT p.name, pt.start_year, pt.end_year
FROM polities p
JOIN polity_territory pt ON p.id = pt.polity_id
WHERE pt.territory_id = 'anatolia'
  AND pt.start_year <= 1200
  AND (pt.end_year >= 1200 OR pt.end_year IS NULL);

-- Generate a history panel dynamically
SELECT hc.era, hcol.name as region, hc.label,
       r.dynasty, p.name as polity, c.name as culture,
       hc.start_year, hc.end_year
FROM history_cells hc
JOIN history_columns hcol ON hc.column_id = hcol.id
LEFT JOIN regimes r ON hc.regime_id = r.id
LEFT JOIN polities p ON COALESCE(r.polity_id, hc.polity_id) = p.id
LEFT JOIN cultures c ON hc.culture_id = c.id
WHERE hcol.panel_id = 'france'
ORDER BY hc.row_order, hcol.col_order;

-- All regimes (dynasties) of a single polity
SELECT r.label, r.dynasty, r.start_year, r.end_year
FROM regimes r WHERE r.polity_id = 'kingdom_of_france'
ORDER BY r.start_year;

-- Cross-polity dynasty comparison (e.g., all Bourbon regimes)
SELECT p.name as polity, r.label, r.start_year, r.end_year
FROM regimes r
JOIN polities p ON r.polity_id = p.id
WHERE r.dynasty ILIKE '%bourbon%'
ORDER BY r.start_year;
```
