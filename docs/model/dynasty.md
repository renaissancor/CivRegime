# Dynasty

## What a Dynasty Is

A **Dynasty** is a ruling family or clan that holds sovereign power across one or more polities. It is the genealogical thread that connects political entities through bloodline rather than territory, ideology, or ethnicity.

```
Dynasty = Ruling Family × Ethnic Origin × Region of Origin
```

A dynasty is **not** a polity. The Borjigin clan (Genghis Khan's family) is one dynasty, but it spawned the Mongol Empire, Yuan Dynasty, Chagatai Khanate, Golden Horde, and Il-Khanate — five distinct polities. Conversely, the Byzantine Empire was one polity ruled by many dynasties (Justinian, Macedonian, Komnenoi, Palaiologoi).

---

## Relationship to Polity

The dynasty–polity relationship is **many-to-many**, stored in `polity_dynasty.csv`:

```
polity_id,dynasty_id,start,end
byzantine_empire,roman_julio_claudian,395,518
ottoman_empire,ottoman,1299,1922
golden_horde,borjigin,1227,1502
yuan_dynasty,borjigin,1271,1368
```

- A polity can have **zero dynasties** (republics, tribal confederations, communist civilizations)
- A polity can have **one dynasty** for its entire span (Ottoman Empire → House of Osman)
- A polity can have **multiple sequential dynasties** (Byzantine Empire → many houses)
- A dynasty can rule **multiple polities simultaneously** (Habsburgs ruled Austria and Spain)

---

## Data Fields

### dynasty.csv

```csv
id,name,ethnicity,origin_region,note
borjigin,Borjigin,mongol,mongolian_plateau,Genghis Khan's clan
habsburg,Habsburg,german,germany,Austrian royal house
ottoman,Ottoman,turkic_cluster,anatolia,House of Osman
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (snake_case) |
| `name` | string | Display name of the dynasty |
| `ethnicity` | ref → ethnicity | Ethnic origin of the founding family |
| `origin_region` | string | Geographic region where the dynasty originated |
| `note` | string | Brief historical context |

### polity_dynasty.csv (Junction Table)

```csv
polity_id,dynasty_id,start,end
habsburg_monarchy,habsburg,1526,1804
austrian_empire,habsburg,1804,1867
austria_hungary,habsburg,1867,1918
```

| Field | Type | Description |
|---|---|---|
| `polity_id` | ref → polity | The polity being ruled |
| `dynasty_id` | ref → dynasty | The ruling dynasty |
| `start` | integer (year) | When this dynasty began ruling this polity |
| `end` | integer (year) | When this dynasty stopped ruling (empty = ongoing) |

---

## Dynasty vs Polity vs Civilization

These three concepts capture different layers of political continuity:

| Concept | What it tracks | Example |
|---|---|---|
| **Civilization** | Political continuity regardless of dynasty | Roman Civilization (Republic → Empire → Byzantine) |
| **Polity** | A specific political entity in time | Roman Empire (27 BC – 395 CE) |
| **Dynasty** | The ruling family | Julio-Claudian, Flavian, Severan, etc. |

A civilization persists across dynasty changes. A polity can persist across dynasty changes (Byzantine Empire). A dynasty can persist across polity changes (Borjigin ruling Mongol Empire then Yuan).

---

## When a Polity Has No Dynasty

Not all polities are dynastic. The following government types typically have no dynasty entry:

| Government Type | Reason |
|---|---|
| `democratic_republic` | Elected leaders, no hereditary rule |
| `communist_civilization` | Party rule, not family rule |
| `republic` | Non-hereditary by definition |
| `tribal_confederation` | Collective leadership, rotating chiefs |
| `colonial_administration` | Ruled by distant metropolitan civilization |
| `puppet_civilization` | Sovereignty lies elsewhere |
| `military_republic` | Military junta, not hereditary |

---

## Multi-Dynasty Polities

Some long-lived polities cycled through multiple ruling houses:

### Byzantine Empire (planned expansion)
```csv
byzantine_empire,roman_julio_claudian,395,518
byzantine_empire,justinian,518,602
byzantine_empire,heraclian,610,711
byzantine_empire,isaurian,717,802
byzantine_empire,macedonian_byz,867,1056
byzantine_empire,komnenoi,1081,1185
byzantine_empire,angeloi,1185,1204
byzantine_empire,palaiologoi,1261,1453
```

### Kingdom of England (planned expansion)
```csv
kingdom_of_england,plantagenet,1154,1399
kingdom_of_england,lancaster,1399,1461
kingdom_of_england,york,1461,1485
kingdom_of_england,tudor,1485,1603
```

These sub-dynasty entries are aspirational — the current dataset maps one primary dynasty per polity for most cases.

---

## Cross-Polity Dynasty Chains

Dynasties reveal connections invisible to territory or ethnicity analysis:

### Borjigin (Genghisid)
```
Mongol Empire (1206–1368)
├── Yuan Dynasty (1271–1368) — China
├── Chagatai Khanate (1227–1347) — Central Asia
├── Golden Horde (1227–1502) — Pontic steppe
├── Il-Khanate (1256–1335) — Persia
├── Northern Yuan (1368–1635) — Mongolia
├── Moghulistan (1347–1462) — Eastern Turkestan
├── Crimean Khanate (1441–1783) — Crimea via Giray branch
├── Kazakh Khanate (1465–1847) — Kazakhstan
├── Khanate of Bukhara (1500–1785) — Uzbekistan
└── Yarkand Khanate (1514–1705) — Xinjiang
```

### Habsburg
```
Holy Roman Empire (1438–1806)
├── Habsburg Monarchy (1526–1804)
├── Austrian Empire (1804–1867)
├── Austria-Hungary (1867–1918)
├── Kingdom of Hungary (1526–1918)
├── Kingdom of Bohemia (1526–1918)
└── Principality of Transylvania (1570–1711)
```

These chains show how a single family's power network shaped political geography across centuries and continents.
