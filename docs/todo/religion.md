This document defines the organization of the world's religious traditions. Agent AIso must iterate through the hierarchy below and ensure that a corresponding JSON file exists at each specified path, maintaining metadata consistency across the tree.

# TODO/religion.md

## 1. Instructions for Agent AIso
The religion tree is organized by **Theological Family > Tradition > Branch/Sect**. The Agent must map these relationships to the filesystem to support recursive data retrieval.

### Implementation Rules:
- **File Format**: Each leaf node must be a JSON file located at `data/religions/{family}/{tradition}/{branch}/{sect}.json`.[1]
- **Index Files**: Every directory containing sub-sects must include an `index.json` to store tradition-level metadata (e.g., `data/religions/abrahamic/christianity/index.json`).
- **Core Metadata**: Include fields for the founder (if applicable), central scriptures, primary theological tenets, and historical period of origin.
- **Adherent Tracking**: Provide structures for population statistics using the World Religion Database (WRD) standard (18 high-level categories).

---

## 2. Religion Tree Schema (JSON Template)
```json
{
  "name": "Sect Name",
  "tradition": "Tradition Name",
  "family": "Theological Family",
  "scriptures":,
  "origin": {
    "date": "c. 30 CE",
    "region": "Judaea"
  },
  "theology": {
    "type": "Monotheistic",
    "deities": ["God"],
    "key_tenets":
  },
  "sub_sects":
}
```

---

## 3. The Religion Hierarchy

### Abrahamic Religions
- **Christianity** (`abrahamic/christianity/`)
  - **Catholic**: `catholic/index.json`
  - **Eastern Orthodox**: `eastern_orthodox/` (Bulgarian, Georgian, Greek, Romanian, Russian, Serbian)
  - **Oriental Orthodox**: `oriental_orthodox/` (Armenian Apostolic, Coptic, Eritrean, Ethiopian)
  - **Protestant**: `protestant/` (Anglicanism, Baptist, Calvinism, Evangelical, Lutheranism, Methodism)
  - **Church of the East**: `church_of_east/assyrian_church.json`
- **Islam** (`abrahamic/islam/`)
  - **Sunni**: `sunni/` (Hanafi, Hanbali, Maliki, Shafi)
  - **Shia**: `shia/` (Ismaili, Twelver, Zaydi)
  - **Other**: Ibadi (`ibadi.json`), Ahmadiyya
- **Judaism** (`abrahamic/judaism/`)
  - Rabbinic (Orthodox, Conservative, Reform), Temple Judaism

### Dharmic Religions
- **Buddhism** (`dharmic/buddhism/`)
  - Mahayana (Chan/Zen, Vajrayana/Tibetan), Theravada
- **Hinduism** (`dharmic/hinduism/`)
  - Shaivism, Vaishnavism, Shaktism
- **Other**: Jainism (`jainism.json`), Sikhism (`sikhism.json`)

### East Asian Traditions
- **Confucianism**: `confucianism/` (Neo-Confucianism)
- **Shinto**: `shinto/` (State Shinto, Shinto-Buddhism syncretism, Neo-Confucian Shinto)
- **Taoism**: `taoism.json`
- **Other**: Legalism, Chinese Folk Religion

### Animism and Ancient Systems
- **Animism folder** (`animism/`): Arabian Paganism, Celtic, Germanic, Lithuanian, Manchu Shamanism, Slavic, Tengriism
- **Ancient State Systems**:
  - `egyptian_religion.json`
  - `mesopotamian_religion.json`
  - `hellenic_paganism/roman_paganism.json`
  - `anatolian_paganism.json`, `canaanite_religion.json`

### Iranian Traditions
- **Zoroastrianism**: `zoroastrianism/` (Zurvanism)
- **Manichaeism**: `manichaeism.json`

***

**I have finished the religion reference. Shall I proceed to the next one, `ethnicity.md`?**