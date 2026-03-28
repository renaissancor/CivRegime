# Handoff: CivRegime Data Cleanup

## Context
CivRegime is a property graph of historical political entities. We are currently auditing the `data/territories/` directory, which contains high-level territorial timelines (aliased as `territory` in the codebase).

## Current Status
Running `node scripts/validate.js` reveals **22 errors and 8 warnings**. Most errors are "Broken Foreign Keys" where territory files or regimes reference entities that don't exist in the taxonomies.

## Key Findings

### 1. Missing Ethnicities
The following IDs are referenced but missing from `data/ethnicities/`:
- `yamato` (Used extensively in Japan)
- `japanese` (Used in Korea/Manchuria for colonial periods)
- `russian` (Used in Mongolia/Kievan Rus)
- `kazakh` (Used in Mongolia)

**Note:** `korean_eth` exists, but there is an inconsistency between using `_eth` suffixes and plain names (e.g., `han`, `german`).

### 2. Missing Languages
The following language IDs are referenced in regimes but missing from the `data/languages/` tree:
- `old_japanese`, `early_modern_japanese`, `modern_japanese`
- `old_korean`

### 3. Missing Ideologies / Governments
The following are referenced in `data/regimes/east_asia.json` but missing from `data/ideologies.json`:
- **Governments:** `centralized_monarchy`, `bureaucratic_monarchy`, `shogunate`
- **Religions:** `shinto_buddhism`, `neo_confucianism_shinto`, `state_shinto`

### 4. Missing Regimes
Cradle files reference several regimes that haven't been implemented in `data/regimes/` yet:
- `feudal_japan`, `modern_japan`
- `three_kingdoms_korea`, `japanese_korea`, `modern_korea`
- `angevin_empire` (in Aquitaine)

## Recommended Actions for Claude

1.  **Standardize IDs:** Decide on a convention for ethnicity IDs (e.g., always `name_eth` or just `name`) and apply it across `data/ethnicities/`, `data/regimes/`, and `data/territories/`.
2.  **Fill Taxonomy Gaps:**
    - Create `yamato.json`, `japanese.json`, `russian.json`, and `kazakh.json` in `data/ethnicities/`.
    - Add the missing Japanese/Korean language nodes to `data/languages/`.
    - Update `data/ideologies.json` with the missing government and religion types found in the validation report.
3.  **Stub/Implement Regimes:** Create the missing regime entries in `data/regimes/east_asia.json` (or separate files if preferred) so the territory timelines can resolve their foreign keys.
4.  **Audit Territories:** Once taxonomies are fixed, update the `dominant_ethnicity` and `regime` fields in `data/territories/` to ensure they point to the correct, standardized IDs.
