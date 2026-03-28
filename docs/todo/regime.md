This document defines the organization of historical and modern political regimes. Agent AIso must use this hierarchy to populate and organize JSON files in the `data/regimes/` directory, ensuring that each regime is properly situated at the intersection of Ethnicity, Territory, Ideology, and Time.

# TODO/regime.md

## 1. Instructions for Agent AIso
The regime tree is organized by **Geographic/Epoch Clusters**. Unlike the phylogenetic or taxonomic trees of language and religion, regimes are discrete entities linked to other nodes via property graph edges.

### Implementation Rules:
- **File Format**: Regimes are grouped into thematic/geographic JSON files located at `data/regimes/{cluster_name}.json`.[1]
- **Node Intersection**: Every regime entry MUST reference:
    - **Ethnicity**: Link to `data/ethnicities/{ethnicity}.json` (The `ruledBy` edge).
    - **Territory**: Link to `data/territories/{region}/{id}.json` (The `controlled` edge).
    - **Ideology**: Link to a key in `data/ideologies.json` (The `hasIdeology` edge).
    - **Language**: Link to `data/languages/...` (The `courtLanguage` edge).
    - **Religion**: Link to `data/religions/...` (The `hasReligion` edge).
- **Time Bounds**: Every regime must have a strict `start_year` and `end_year` (using BCE/CE or negative/positive integers).
- **Succession Handling**: Successions between regimes should be validated against the **Succession Matrix** (Types A, A-, B, C, D) and recorded in `data/successions/`.

---

## 2. Regime Tree Schema (JSON Template)
```json
{
  "id": "unique_regime_id",
  "name": "Full Name of the State/Regime",
  "cluster": "europe_medieval",
  "period": {
    "start": 800,
    "end": 888,
    "precision": "approximate"
  },
  "ruled_by": "data/ethnicities/indo_european/germanic/franks.json",
  "court_language": "data/languages/indo_european/italic/romance/old_french.json",
  "official_religion": "data/religions/abrahamic/christianity/catholic/index.json",
  "ideology": "feudal_monarchy",
  "territories": ["data/territories/europe/gaul.json", "data/territories/europe/germany.json"],
  "capital": "Aachen"
}
```

---

## 3. The Regime Hierarchy (Geographic Clusters)

### 1. Near East & Egypt
- **Ancient Near East**: Sumerian City States, Akkadian Empire, Old/Middle/Neo-Assyrian, Babylonian (Old/Neo), Hittite Empire.[1, 2]
- **Egypt Cluster**: Old Kingdom, Middle Kingdom, New Kingdom, Ptolemaic Kingdom.[1]
- **Persia & Iran**: Median Empire, Achaemenid Empire, Parthian Empire, Sasanian Empire, Safavid Dynasty, Pahlavi, Modern Iran.

### 2. Europe
- **Europe Ancient**: Minoan, Mycenaean, Classical Greek (Athens/Sparta/etc.), Macedonian Empire, Roman Republic, Roman Empire.
- **Europe Medieval**: Frankish Empire, Holy Roman Empire, Kievan Rus', Kingdom of France, Kingdom of England, Byzantine Empire.[1]
- **Mediterranean Europe**: Republic of Venice, Kingdom of Naples, Papal States.[1]
- **Transitions**: Europe during the Age of Revolutions and Modern Formations.[1]

### 3. Islam & Middle East
- **Islam Caliphates**: Rashidun, Umayyad, Abbasid, Fatimid, Almohad.[1]
- **Turkic Empires**: Seljuk Empire, Ottoman Empire, Timurid Empire, Mamluk Sultanate.[1]
- **Middle East Modern**: Post-WWI mandates and contemporary sovereign states.[1]

### 4. Central Asia & Steppe
- **Steppe Nomadic**: Xiongnu Confederation, Göktürk Khaganate, Khazar Khaganate, Mongol Empire, Golden Horde.[1]
- **Central Asia Medieval**: Samanid, Ghaznavid, Khwarazmian Empire.[1]

### 5. East Asia
- **Chinese Dynasties**: Qin, Han, Tang, Song, Yuan, Ming, Qing.
- **Japanese Eras**: Nara, Heian, Kamakura, Ashikaga, Tokugawa, Imperial Japan.[1]
- **Korean Eras**: Three Kingdoms (Goguryeo/Baekje/Silla), Goryeo, Joseon.[1]

### 6. South Asia
- **Ancient/Medieval**: Maurya Empire, Gupta Empire, Chola Dynasty, Delhi Sultanate, Mughal Empire.[1]
- **South Asia Modern**: British Raj, Republic of India, Pakistan, Bangladesh.[1]

---

**Summary of Action Items for Agent AIso:**
1.  **Initialize** the cluster JSON files if they do not exist.
2.  **Verify** every `ruled_by` and `court_language` link exists in the previously created Language and Ethnicity trees.
3.  **Cross-reference** `ideology` keys with the definitions in `data/ideologies.json`.
4.  **Map** the regime lifespan to the `controlled` timeline in the corresponding Territory JSON files.

This concludes the instruction sets for the **TODO** folder. Let me know if you need any adjustments to these four frameworks!