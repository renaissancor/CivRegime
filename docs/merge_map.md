# Merge Map — Phase 3 Gold-Standard Curation

Drafted from the three gold-standard panels curated under P3.6:
`iran.json`, `china.json`, `italy.json` (commits `e4d33bb`, `d8b414f`, `de8e48b`).

This map turns the manual curation decisions made on those panels into
reusable rules so `scripts/dedup_and_link.js` can apply them to the
remaining 58 panels (P3.8). The script's `SYNONYM_MAP` and `BUG_FIXES`
constants are the executable mirror of this document — keep them in sync.

## Rule classes

The three curations exposed three distinct rule shapes. The script
already supports the first two; the third is implicit (handled by
`categorize()` heuristics) and needs an explicit blacklist.

| Class | What it does | Where it lives |
|---|---|---|
| **Synonym** | bare-name / variant → canonical polity ID | `SYNONYM_MAP` |
| **Bug fix** | wrong existing FK → correct FK (label-keyed) | `BUG_FIXES` |
| **Strip** | polity ID is a non-polity (event, people, era) — never write as FK | new (see below) |

## Synonyms (bare-name → canonical ID)

Already in `SYNONYM_MAP` from prior curation passes. The Iran/China/Italy
panels confirmed these and added the following:

| From label / variant | Canonical polity ID | Source |
|---|---|---|
| `hotaki_dynasty`, `hotaki_afghan`, `hotaki` | `hotak_dynasty` | iran |
| `il_khanate` | `ilkhanate` | iran |
| `aragonese` (orphan) | `aragonese_sardinia` | italy |

> ⚠️ **Open conflict to fix in code.** `dedup_and_link.js:108–109`
> currently maps `hotaki_afghan` and `hotaki` → `hotaki_dynasty`, but
> the Iran curation established `hotak_dynasty` as the canonical ID
> (no `i`). Update both entries before running P3.8.

## Bug fixes (label → corrected FK)

These are cells where the label was correct but the existing `polity`
FK pointed at the wrong polity. Keyed by label text so they only fire
on the offending cell, not all cells with the same FK.

| Label | Wrong FK | Correct FK | Source |
|---|---|---|---|
| `Dabuyid Dynasty` | `buyid_dynasty` | `dabuyid_dynasty` | (pre-existing) |

No new bug fixes were discovered in the Iran/China/Italy passes.

## Strip list (non-polity IDs — never use as polity FK)

These IDs were stripped from panel JSONs because the cell describes an
**event, people, era, or collective**, not a polity that belongs in
`polity.csv`. The script's `categorize()` heuristic catches most of
these, but the curated panels show specific IDs that survived earlier
runs and were only removed by hand. Adding them to an explicit
blacklist prevents regression.

### Events / wars / movements
```
chu_han_contention            xianbei_rising
gothic_war                    investiture_controversy
vandal_raids_on_sicily        lombard_league_vs_frederick_barbarossa
guelph_vs_ghibelline          napoleon_annexes_rome
leads_risorgimento            lombardy_1859
garibaldis_expedition_of_the_thousand_1860
five_barbarians_migrating_south
```

### Periods / eras
```
spring_and_autumn             sixteen_kingdoms
italian_renaissance
```

### Peoples / collectives
```
indigenous_peoples            northern_steppe_peoples
xianyun_quanrong              donghu_yuezhi
various_steppe_peoples        various_mongol_khanates
venetians                     greek_colonies
city_communes                 austrian_habsburg
qing_court
```

### Combined / multi-polity entries
```
chu_wu_yue                    later_chu
republics_of_siena
```

### Narrative / sphere-of-influence labels
```
british_india_sphere
```

## New polity stubs — final reconciled state

The three curations added 94+ stubs. The subsequent schema refactor
`1e6620b` (Apr 23) caused two regressions, both now resolved:

| Panel | Added | Status after reconciliation |
|---|---|---|
| China | 26 | all 26 present, FKs clean |
| Iran  | 24 | 18 kept, 6 renamed by refactor — synonyms cover the gap |
| Italy | 47 | wiped by refactor → **restored from `de8e48b` to current `polity.csv`** |

### China (26) — clean from the start

`xia`, `western_zhou`, `eastern_zhou`, `ba_shu`, `xin`, `xuan_han`,
`eastern_han`, `shun`, `former_qin`, `liu_song`, `southern_qi`,
`liang`, `chen`, `wu_zhou`, `huan_chu`, `later_tang`, `later_zhou`,
`southern_ming`, `kingdom_of_tungning`, `taiping_heavenly_kingdom`,
`chinese_empire`, `beiyang_government`, `nationalist_government`,
`wuhan_government`, `wang_jingwei_regime`, `chinese_soviet_republic`.

### Iran — 6 stubs renamed by the refactor

The schema refactor renamed bare-name stubs to add `_kingdom` /
`_dynasty` suffixes. iran.json's polity fields had already been
remapped to the new IDs by an intermediate linker run, so this is a
no-op at the panel level — but the synonym entries below are needed
so the merge map remains correct for any panel that still references
the old IDs.

| Old ID (curation) | New ID (refactor) |
|---|---|
| `anshan` | `anshan_kingdom` |
| `lullubi` | `lullubi_kingdom` |
| `mannai` | `mannai_kingdom` |
| `marhashi` | `marhashi_kingdom` |
| `kidarite` | `kidarite_kingdom` |
| `kar_kiya_dynasty` | `karkiya_dynasty` |

### Italy (47) — restored

All 47 stubs from commit `de8e48b` were re-appended to `polity.csv`
verbatim (column count and order unchanged across the refactor; the
header rename `start/end` → `start_year/end_year` was the only
schema-relevant edit, and values fit either name). After
restoration, italy.json's FK orphans drop from 47+ to 14 culture/
peoples entries — exactly what the original curation commit
predicted as P3.12-deferred.

## Verification snapshot

After applying the merge map and Italy restoration, FK status of
the three gold-standard panels:

| Panel | Total FKs | Orphan FKs | Orphan kind |
|---|---|---|---|
| italy.json  | 115 | 16 | `*_culture` / `*_peoples` only |
| iran.json   | 138 | 9 | `*_culture` only |
| china.json  | 83  | 3 | `*_culture` only |

All non-culture orphans are resolved. The remaining orphans are the
P3.12 backlog (cultures table), as documented in the curation
commit messages.

## Categorization rules confirmed

The three curations validated the classifier patterns in
`dedup_and_link.js`:

- `*_culture` and `*_culture_*` IDs are deferred to P3.12 (cultures
  table). They are *not* polities and should not be in `polity.csv`.
- Period labels covering many states (`spring_and_autumn`,
  `sixteen_kingdoms`, `warring_states`) are events, not polities.
- "X vs Y" labels (`lombard_league_vs_frederick_barbarossa`,
  `guelph_vs_ghibelline`) are events.
- "X · Y · Z" combined-name cells stay as labels but their `polity`
  field should be empty unless one of the names is the dominant polity.

## Resolution decisions to preserve

From the commit trailers, decisions that should not be re-litigated:

- **Hohenstaufen variants stay separate** (`hohenstaufen` vs
  `hohenstaufen_sicily`) per the `cao_wei` / `northern_wei` precedent
  in `docs/model/naming.md`.
- **Kingdom of Sicily variants stay separate** — `kingdom_of_sicily`
  (1282–1816) and `aragonese_kingdom_of_sicily` (1282–1409) have
  different end dates and succession chains.
- **Republican-era China granularity is intentional** — Beiyang,
  Nationalist, Wuhan, Wang Jingwei treated as distinct polities
  (parallels Iran's Mahabad / Azerbaijan separatist treatment).

## Application path (P3.8)

1. Update `SYNONYM_MAP` in `dedup_and_link.js`:
   - fix `hotaki` / `hotaki_afghan` → `hotak_dynasty`
   - add `aragonese` → `aragonese_sardinia`
2. Add a `STRIP_LIST` set keyed by ID (the IDs above). In
   `resolveLabel()`, if the existing `polity` field is in the strip
   list, delete it instead of preserving it.
3. Run `node scripts/dedup_and_link.js --dry-run` and review the
   diff for the 58 uncurated panels.
4. Run for real, then re-validate FK integrity with
   `scripts/validate.js`.

## Source commits

- `e4d33bb` — iran.json (24 stubs, hotak typo, british_india_sphere strip)
- `d8b414f` — china.json (26 stubs, 14 narrative-label strips)
- `de8e48b` — italy.json (44 stubs, 15 narrative-label strips, aragonese fix)
- `2a28d09` — government taxonomy remap (27-type) — orthogonal to merge map
- `7dc9a72` — linker fix to only write resolved polity FKs (lets us run safely)
