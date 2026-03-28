This document defines the organization of global ethnic groups. Agent AIso must iterate through the hierarchy below to ensure that every ethnic group is represented by a JSON file at the correct path, linked to its corresponding language and territory metadata.

# TODO/ethnicity.md

## 1. Instructions for Agent AIso
The ethnicity tree is organized by **Affinity Bloc > People Cluster > Ethnic Group**. This structure allows for the grouping of cultures that share historical, linguistic, and ancestral ties.[1, 2]

### Implementation Rules:
- **File Format**: Each leaf node must be a JSON file located at `data/ethnicities/{bloc}/{cluster}/{ethnicity}.json`.[2]
- **Index Files**: Every directory containing sub-clusters or multiple groups must include an `index.json` to store cluster-level metadata (e.g., `data/ethnicities/eurasian/slavic/index.json`).
- **Relational Linking**: 
    - The `languages` field must link to the valid path in `data/languages/`.
    - The `origin` field must link to the valid path in `data/territories/`.[3, 2]
- **Classification Standard**: Use a synthesis of Murdock’s Ethnographic Atlas and the Joshua Project’s Affinity Blocs for historical and modern precision.

---

## 2. Ethnicity Tree Schema (JSON Template)
```json
{
  "name": "Ethnic Group Name",
  "bloc": "Affinity Bloc",
  "cluster": "People Cluster",
  "historical_depth": "Ancient/Medieval/Modern",
  "languages": ["path/to/language.json"],
  "origin_territory": "path/to/territory.json",
  "ancestry": ["Parent Ethnic Group"],
  "social_structure": {
    "descent": "Patrilineal/Matrilineal/Bilateral",
    "settlement": "Sedentary/Nomadic"
  }
}
```

---

## 3. The Ethnicity Hierarchy

### 1. Middle Eastern & North African Bloc
- **Semitic Cluster**
  - **Ancient**: Akkadian, Assyrian, Babylonian, Phoenician, Sumerian (Isolate), Ugaritic.[4]
  - **Modern**: Arab, Hebrew (Jewish), Amhara, Tigrayan.
- **Berber Cluster**: Tuareg, Kabyle, Zenata.
- **Cushitic Cluster**: Somali, Oromo, Afar.
- **Egyptian Cluster**: Coptic (Native Egyptian).

### 2. Eurasian (Indo-European) Bloc
- **Germanic Cluster**: English, German, Dutch, Scandinavian (Norse/Danish/Swedish), Gothic.[4]
- **Romance Cluster**: French, Spanish, Italian, Portuguese, Romanian, Norman.
- **Slavic Cluster**: 
  - **East Slavic**: Russian, Ukrainian, Belarusian.
  - **West Slavic**: Polish, Czech, Slovak.
  - **South Slavic**: Bulgarian, Serbo-Croatian, Slovenian.
- **Celtic Cluster**: Irish, Gaelic (Scottish), Welsh, Breton.
- **Hellenic Cluster**: Ancient Greek, Macedonian, Modern Greek.
- **Baltic Cluster**: Lithuanian, Latvian.
- **Iranian Cluster**: Persian, Kurdish, Pashtun, Sogdian, Parthian, Median.
- **Indo-Aryan Cluster**: Hindustani, Bengali, Punjabi, Marathi, Gujarati.

### 3. East Asian Bloc
- **Sinitic Cluster**: Han (Mandarin, Cantonese, Min, Wu).
- **Japanese Cluster**: Yamato, Ryukyuan.
- **Korean Cluster**: Korean.
- **Tungusic Cluster**: Manchu, Jurchen, Evenki.
- **Mongolic Cluster**: Mongol, Khitan, Buryat.

### 4. South Asian (Non-Indo-Aryan) Bloc
- **Dravidian Cluster**: Tamil, Telugu, Kannada, Malayalam.
- **Tibeto-Burman Cluster**: Tibetan, Burmese.

### 5. Central Asian & Steppe Bloc
- **Turkic Cluster**: Turkish, Azeri, Uzbek, Kazakh, Kyrgyz, Tatar, Uyghur.[4]
- **Uralic Cluster**: Magyar (Hungarian), Sami, Finnic.

### 6. Sub-Saharan African Bloc
- **Bantoid Cluster**: Zulu, Swahili, Shona.
- **Nilotic Cluster**: Dinka, Maasai.
- **Kwa Cluster**: Akan, Yoruba, Igbo.

***

**I have finished the ethnicity reference. Shall I proceed to the final one, `regime.md`?**