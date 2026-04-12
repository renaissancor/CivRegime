# CivRegime TODO — RDBMS Migration Roadmap

## Phase 1: Schema & Foundation ✅ (done)
- [x] Design three-tier ERD (State → Polity → Regime)
- [x] Create DuckDB schema (`civregime.db`) — 24 tables
- [x] Auto-link 637 panel labels to existing polity IDs
- [x] Document ERD (`docs/erd.sql`, `docs/erd.md`)

## Phase 2: Migrate Existing Data → DuckDB ✅ (done)
- [x] **P2.1** Migrate taxonomy trees (ethnicity → 256, languages → 691, religions → 256)
- [x] **P2.2** ~~Migrate ideologies~~ — deferred (still in `data/ideologies.json`, 30 records; load when schema stabilizes)
- [x] **P2.3** Migrate territories (39 loaded) — provinces/GeoJSON deferred
- [x] **P2.4** Load 268 polity records into `polities` table (from `polity.csv`)
- [x] **P2.5** Migrate successions (1,243 → `polity_succession`) + 1,099 shared territory links
- [x] **P2.6** Migrate figures (285 records → `figures` table)
- [x] **P2.7** Migrate states (2 records loaded)
- [x] **P2.8** Compute taxonomy tree depths (recursive CTE, max depth 3)
- [x] **P2.9** Build `polity_territory` (939 records from `polity_territory.csv` + `polity.csv` gap-fill)
- [x] **P2.10** Build `polity_policy` (26 records)
- [x] **P2.11** Create idempotent load script: `scripts/load_csvs.sql`

### Phase 2 Known Issues
- [ ] Duplicate `old_id` values in taxonomy CSVs (7 in ethnicity, 7 in languages, 4 in religions) — currently deduped by taking first occurrence; should clean source CSVs
- [ ] Provinces (53) and GeoJSON not yet loaded
- [ ] Ideologies (30) not yet in DuckDB

## Phase 3: Extract & Link Panel Entities ← CURRENT
Extracted 4,572 labels from 61 history panels. Analysis complete. Now need manual curation before bulk-writing.

### Phase 3 Analysis (done)
- [x] **P3.1** Extract all labels from 61 panel JSONs → `csvs/panel_labels.csv` (`scripts/extract_regimes.js`)
- [x] **P3.2** Categorize labels: 1,451 linked, 1,064 polity, 475 regime, 355 people, 369 event, 126 culture, 732 unclassified
- [x] **P3.3** Normalize & deduplicate labels → `csvs/canonical_entities.csv` (`scripts/normalize_labels.js`)
- [x] **P3.4** Identify temporal/spatial overlaps → `csvs/overlap_candidates.csv`, `csvs/timeline_sorted.csv` (`scripts/find_overlaps.js`)
- [x] **P3.5** Document naming architecture → `docs/naming.md`

### Phase 3 Curation (todo — manual + scripted)
- [ ] **P3.6** Pick one panel (gold standard), manually curate all labels:
  - Assign correct `regime` IDs to every cell
  - Fix duplicates (e.g., `sassanid` → `sassanid_empire`)
  - Verify category assignments (polity / regime / culture / people / event)
  - Validate against `csvs/overlap_candidates.csv` for that panel
- [ ] **P3.7** Build merge map from gold-standard experience:
  - Bare names → existing polity IDs (`sassanid` → `sassanid_empire`, `qing` → `qing_dynasty`)
  - Cross-panel synonyms (`il_khanate` = `ilkhanate`)
  - Type-suffix normalization (`safavid_dynasty` = `safavid_empire` = `safavid`)
- [ ] **P3.8** Apply merge map to `dedup_and_link.js`, re-run for all 61 panels
- [ ] **P3.9** Write `regime` fields into history JSONs for confident matches
- [ ] **P3.10** Create new polity stubs in DuckDB for genuinely new entities (~400–800 expected)
- [ ] **P3.11** Create regime records (dynasty-level) in DuckDB (~400+ expected)
- [ ] **P3.12** Populate `cultures` table from culture-category labels (~100 records)
- [ ] **P3.13** Review remaining unclassified labels — reclassify or mark as label-only

### Phase 3 Overlap Issues (63 intra-panel, 75 cross-panel)
Key patterns to resolve:
- `sassanid` vs `sassanid_empire` (bare name vs existing ID)
- `qing` vs `qing_dynasty` vs `qing_empire` (suffix variants)
- `first_turkic_empire` vs `first_turkic_khaganate` (government-form synonym)
- `roman_republic` vs `roman_empire` vs `roman_kingdom` (genuinely different — keep separate)

## Phase 4: Derive Successions
- [ ] **P4.1** Derive regime_successions from panel stack order (~2,300 edges):
  - Adjacent items in same stack = succession
  - Infer type: same polity → `inheritance`; different polity → `conquest`/`revolution`
  - Temporal gap > 0 → possible interregnum
- [ ] **P4.2** Cross-validate panel-derived successions against existing polity_succession
- [ ] **P4.3** Build state groupings: cluster polities into ~20–30 state records by succession chains
  - Use connected component analysis on polity_succession with `same_state = true`

## Phase 5: Populate History Panel Tables
- [ ] **P5.1** Create `history_panels` (61 records) and `history_columns` (~180 records)
- [ ] **P5.2** Create `history_cells` (~4,600 records) with FK links to regime/polity/culture
- [ ] **P5.3** Refactor frontend to render panels from DB queries instead of static JSON
- [ ] **P5.4** Add API endpoints: `GET /api/panel/:id`, `GET /api/polity/:id`, `GET /api/regime/:id`

## Phase 6: Enrich Polity Data
- [ ] **P6.1** Fill in polity stubs (ruling_ethnicity, cultural_language, religion, government, territories)
  - Priority: major civilizations first (Roman, Chinese, Ottoman, Mongol, etc.)
  - Use history panel context to infer attributes
- [ ] **P6.2** Expand figures table — key rulers for each regime
- [ ] **P6.3** Add `polity_territory` temporal data (which territory, when)
- [ ] **P6.4** Add `province_periods` for finer-grained geographic control

## Phase 7: Frontend RDBMS Integration
- [ ] **P7.1** Add DuckDB backend to `server.js`
- [ ] **P7.2** Serve history panels from DB (deprecate JSON files)
- [ ] **P7.3** Build polity detail page (succession graph + regime timeline + territories)
- [ ] **P7.4** Build regime detail page (figures, predecessor/successor)
- [ ] **P7.5** Cross-linking: click a regime in a panel → polity detail page
- [ ] **P7.6** Search: find polities/regimes by name, time range, territory, ethnicity

## Phase 8: Advanced Features
- [ ] **P8.1** Interactive map: show polity territories at any given year
- [ ] **P8.2** Timeline comparison: overlay multiple polities on a shared timeline
- [ ] **P8.3** Succession graph visualization (full graph, not just per-panel)
- [ ] **P8.4** "What existed in year X?" global query across all regions
- [ ] **P8.5** Export: generate static panels from DB for offline use
- [ ] **P8.6** Data validation: ensure all panel cells link to a polity/regime/culture

## Phase 9: Geographic Expansion (History Panels)
- [ ] **P9.1** Americas: Mesoamerica (Maya/Aztec), Andes (Inca), North America, Brazil
- [ ] **P9.2** Sub-Saharan Africa: Southern Africa, East African coast (Swahili/Kilwa), Congo
- [ ] **P9.3** Remaining gaps: Philippines, Bangladesh/Bengal, Oceania

## Data Counts (Current → Target)

| Entity | Current (in DB) | After Phase 3 | After Phase 6 |
|--------|-----------------|---------------|---------------|
| States | 2 | ~20 | ~30 |
| Polities | 268 | ~700–1,100 | ~1,500 (enriched) |
| Regimes | 0 | ~400+ | ~2,500 |
| Polity successions | 1,243 | 1,243 | ~2,000 |
| Regime successions | 0 | ~2,300 | ~2,500 |
| Cultures | 0 | ~100 | ~150 |
| Figures | 285 | ~285 | ~1,000 |
| History panels | 61 (JSON) | 61 (DB) | 70+ |
| **Total entities** | **~270** | **~1,500+** | **~5,200+** |

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `scripts/load_csvs.sql` | Load all CSVs into DuckDB (idempotent) |
| `scripts/extract_regimes.js` | Extract & categorize labels from panel JSONs |
| `scripts/normalize_labels.js` | Normalize labels, resolve to entity IDs, deduplicate |
| `scripts/dedup_and_link.js` | Deduplicate + write `regime` fields back into JSONs |
| `scripts/find_overlaps.js` | Find temporal/spatial overlaps for dedup review |
| `scripts/json_to_csv.js` | Convert JSON data files to CSVs |
| `scripts/validate.js` | Validate data integrity |

## API Routes Reference

| Route | Purpose |
|-------|---------|
| `GET /api/polity/:id` | Polity detail |
| `GET /api/regime/:id` | Regime (dynasty) detail |
| `GET /api/succession-chain/:from/:to` | Succession chain query |
| `GET /api/territory/:id` | Territory detail |
| `GET /api/taxonomy/ethnicity` | Ethnicity taxonomy |
| `GET /api/panel/:id` | History panel |

## Key Documents

| Doc | Purpose |
|-----|---------|
| `docs/naming.md` | Entity ID naming conventions and collision resolution |
| `docs/ideology.md` | Ideology vs policy distinction; government form = ideology |
| `docs/data-model.md` | Property graph model, edge types |
| `docs/erd.sql` | Full DDL schema (24 tables) |
| `docs/erd.md` | Visual ERD and example queries |
