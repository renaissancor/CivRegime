# Merge Map — Panel Label → Entity ID Resolution

Built from gold-standard curation of `iran.json` panel. Apply these rules when running `dedup_and_link.js` across all 61 panels.

## 1. Qualifier Stripping → Link to Base Polity

Labels with trailing qualifiers like `(collapse)`, `(remnant)`, `(consolidating)`, `(briefly)`, `(continued)` should strip the qualifier and link to the base polity.

| Pattern | → polity ID | Example |
|---------|------------|---------|
| `{Polity} (collapse)` | base polity | Safavid (collapse) → `safavid_empire` |
| `{Polity} (remnant)` | base polity | Saffarid (remnant) → `saffarid_dynasty` |
| `{Polity} (consolidating)` | base polity | Qajar (consolidating) → `qajar_dynasty` |
| `{Polity} (briefly)` | base polity | Mauryan Empire (briefly) → `maurya_empire` |
| `{Polity} (continued)` | base polity | Elam (continued) → `elam` |

## 2. Combined Labels (X / Y) → Primary Entity

When a cell shows two entities separated by `/`, link to the **first-mentioned** (usually the earlier or dominant entity). The second entity should already have its own cell elsewhere in the panel or another panel.

| Label | → polity ID | Rationale |
|-------|------------|-----------|
| Kura-Araxes / Urartu | `kura_araxes_culture` | Pre-Urartu period |
| Jiroft / Helmand | `jiroft_culture` | Same cultural sphere |
| Kushan / Saka | `kushan_empire` | Primary political entity |
| Ghaznavid / Ghurid | `ghaznavid_empire` | Longer rule, primary |
| Bavandid / Paduspanid | `bavandid_dynasty` | Primary dynasty |
| Bavandid / Maraashi | `bavandid_dynasty` | Primary dynasty |
| Chobanid / Jalayirid | `chobanid_dynasty` | First in pair |
| Injuid / Muzaffarid | `injuid_dynasty` | First in pair |
| Inju / Muzaffarid | `injuid_dynasty` | Variant spelling |
| Kartid / Sarbadaran | `kartid_dynasty` | Primary political power |
| Kidarite / Chionite | `kidarite_kingdom` | Primary name |

**Rule:** For `X / Y` labels, default to `X` unless `X` is clearly subordinate to `Y`.

## 3. Cross-Panel Synonyms

Full synonym map implemented in `dedup_and_link.js`. Applied to all 61 panels.

### Suffix variants (dynasty/empire/sultanate for same entity)

| Panel ID | → Canonical DB ID |
|----------|------------------|
| `samanid_dynasty` | `samanid_empire` |
| `ghaznavid_dynasty` | `ghaznavid_empire` |
| `safavid_dynasty` | `safavid_empire` |
| `median_empire` | `median_kingdom` |
| `mitanni_kingdom` | `mitanni_empire` |
| `almohad_dynasty` | `almohad_caliphate` |
| `ayyubid_dynasty` | `ayyubid_sultanate` |
| `ghurid_sultanate` | `ghorid_dynasty` |

### Bare name → full DB ID

| Panel ID | → Canonical DB ID |
|----------|------------------|
| `sassanid` | `sassanid_empire` |
| `ottoman` | `ottoman_empire` |
| `mughal` | `mughal_empire` |
| `mughal_empire_india` | `mughal_empire` |
| `qing` | `qing_dynasty` |
| `ming` | `ming_dynasty` |
| `tang` | `tang_dynasty` |
| `sui` | `sui_dynasty` |
| `carolingian` | `carolingian_empire` |
| `frankish_kingdom` | `carolingian_empire` |

### Short form → full DB ID

| Panel ID | → Canonical DB ID |
|----------|------------------|
| `habsburg` | `habsburg_monarchy` |
| `habsburg_empire` | `habsburg_monarchy` |
| `alexander_the_great` | `macedonian_empire` |
| `alexander` | `macedonian_empire` |
| `prc` | `peoples_republic_of_china` |

### Spelling variants

| Panel ID | → Canonical ID |
|----------|---------------|
| `venice_republic` | `republic_of_venice` |
| `venice` | `republic_of_venice` |
| `il_khanate` | `ilkhanate` |
| `first_turkic_empire` | `first_turkic_khaganate` |
| `hotaki_afghan` | `hotaki_dynasty` |
| `roman_empire_pagan` | `roman_empire` |
| `roman_empire_christian` | `roman_empire` |

### Iran panel local synonyms

| Panel ID | → Canonical ID |
|----------|---------------|
| `inju` / `injuid` | `injuid_dynasty` |
| `ildeguzids` / `eldiguzids` | `eldiguzid_dynasty` |
| `ghurid` / `ghorid` | `ghorid_dynasty` |
| `khalji` | `khalji_dynasty` |
| `hotaki` | `hotaki_dynasty` |

### NOT synonyms (different entities)

| Panel ID | Existing ID | Why different |
|----------|------------|---------------|
| `german_confederation` | `german_empire` | 1815–1866 vs 1871–1918 |
| `russian_republic` | `russian_empire` | 1917 provisional govt vs tsarist |
| `serbian_kingdom` | `serbian_empire` | Medieval kingdom vs Dušan's empire |
| `german_kingdom` | `german_empire` | Medieval vs 1871 |
| `malwa_kingdom` | `malwa_sultanate` | Hindu vs Muslim states |
| `macedonian_kingdom` | `macedonian_empire` | Kingdom of Macedon vs Alexander's empire |

## 4. Skip Categories — No polity ID

| Pattern | Reason |
|---------|--------|
| `?` | Unknown / blank cell |
| `{People} / {People}` (tribal) | People category, not a polity (e.g., Scythian / Saka) |
| `{Power} sphere` / `{Power} influence` | Influence zone, not direct rule (e.g., British India sphere) |

## 5. Culture Entity IDs

Prehistoric/archaeological entities get `_culture` suffix:

| Label | → ID |
|-------|------|
| Kura-Araxes culture | `kura_araxes_culture` |
| Dalma culture | `dalma_culture` |
| Zayanderud culture | `zayanderud_culture` |
| Helmand culture | `helmand_culture` |
| Oxus / BMAC culture | `bmac_culture` |
| Jiroft culture | `jiroft_culture` |

## 6. New Polity Stubs from Iran Panel

26 new polity IDs created (not yet in DuckDB — add when building polity stubs):

| ID | Name | Years | Government |
|----|------|-------|------------|
| `proto_elamite` | Proto-Elamite | c.3100–2700 BCE | — |
| `lullubi_kingdom` | Lullubi Kingdom | c.2300–1200 BCE | kingdom |
| `anshan_kingdom` | Anshan Kingdom | c.2400–550 BCE | kingdom |
| `marhashi_kingdom` | Marhashi | c.2500–? BCE | kingdom |
| `kassite_babylon` | Kassite Babylon | c.1600–1155 BCE | kingdom |
| `mannai_kingdom` | Mannai Kingdom | c.850–616 BCE | kingdom |
| `gutian_dynasty` | Gutian Dynasty | c.2154–2112 BCE | dynasty |
| `kidarite_kingdom` | Kidarite Kingdom | c.320–467 CE | kingdom |
| `dabuyid_dynasty` | Dabuyid Dynasty | 642–760 | dynasty |
| `bavandid_dynasty` | Bavandid Dynasty | 651–1349 | dynasty |
| `tahirid_dynasty` | Tahirid Dynasty | 821–873 | dynasty |
| `dulafid_dynasty` | Dulafid Dynasty | 840–897 | dynasty |
| `sajid_dynasty` | Sajid Dynasty | 889–929 | dynasty |
| `ziyarid_dynasty` | Ziyarid Dynasty | 930–1090 | dynasty |
| `rawwadid_dynasty` | Rawwadid Dynasty | c.955–1071 | dynasty |
| `kakuyid_dynasty` | Kakuyid Dynasty | 1008–1051 | dynasty |
| `eldiguzid_dynasty` | Eldiguzid Dynasty | 1136–1225 | dynasty |
| `zengid_dynasty` | Zengid Dynasty | 1127–1222 | dynasty |
| `salgurid_dynasty` | Salgurid Dynasty | 1148–1286 | dynasty |
| `ghurid_sultanate` | Ghurid Sultanate | 1175–1215 | sultanate |
| `kartid_dynasty` | Kartid Dynasty | 1245–1381 | dynasty |
| `khalji_dynasty` | Khalji Dynasty | 1290–1320 | sultanate |
| `chobanid_dynasty` | Chobanid Dynasty | 1335–1357 | dynasty |
| `injuid_dynasty` | Injuid Dynasty | 1325–1353 | dynasty |
| `hormuz_kingdom` | Kingdom of Hormuz | 1300–1622 | kingdom |
| `karkiya_dynasty` | Kar-Kiya Dynasty | 1370–1592 | dynasty |
| `hotaki_dynasty` | Hotaki Dynasty | 1709–1729 | dynasty |
| `kalat_khanate` | Kalat Khanate | 1666–1955 | khanate |
| `mahabad_republic` | Mahabad Republic | 1946–1946 | republic |
| `azerbaijan_peoples_government` | Azerbaijan People's Government | 1945–1946 | republic |

## 7. Bug Fixes Found

| Label | Wrong ID | Correct ID | Panel |
|-------|----------|-----------|-------|
| Dabuyid Dynasty (642–760) | `buyid_dynasty` | `dabuyid_dynasty` | iran |
