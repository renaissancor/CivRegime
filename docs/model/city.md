# City

## What a City Is

A **City** is a *place* — a geographic site of important human urban habitation — not a *polis* (the political community of inhabitants at a moment).

```
City = Place × Continuity of Site Choice
```

The dot on a historical world map is the unit. Constantinople-the-place is one city across Greek, Roman, Byzantine, Ottoman, and Turkish phases — even though the polis (the political community, language, and rulers) changed many times. The persistent thing is the place; everything political about it lives in time-bounded relationships layered on top.

This is a deliberate choice. "Polis" forces the curator to define political community, population continuity, and language — three soft criteria that drag every edge case into argument. "Place" is decidable from a map.

---

## What "Place" Means Precisely

Place is **geographically anchored but not geometrically strict**, and **occupation can be discontinuous as long as refounding is site-motivated**. Two looser criteria:

### 1. Site overlap, not coordinate match

Cities drift. Roman Carthage's forum is ~1 km from Punic Byrsa. Beijing's palace core shifted across Yuan/Ming/Qing. Old Cairo (Fustat) is ~1 km from medieval Cairo's center. If exact coordinates were required, half the ancient world would split into multiple rows.

The `lat`/`lon` on `city.csv` is **one chosen center point** — usually the historical core. The *place* is the urban footprint that has shifted around it over centuries.

### 2. Continuity of site choice, not continuity of habitation

Gaps are fine if the refounder picked the spot **because of** the previous city — reusing walls, harbors, defensive hills, river crossings, or sacred associations. Roman Carthage was deliberately built atop Punic ruins; that's why it's one place despite the 100-year abandonment.

If the next settlement was founded for **independent reasons on virgin ground** (Baghdad's round-city was a fresh political project, not "let's rebuild Ctesiphon"), it is a different place.

### Operational test

Two settlements are **the same city** if:
- They are within ~2–3 km of each other, AND
- The later one chose its site **because** of the prior occupation.

Otherwise they are **two cities** linked by `city_succession`.

---

## The Three Tables

| Table | Grain | Purpose |
|---|---|---|
| `city.csv` | One row per **place** | Stable identity; lat/lon, founding/abandonment, region |
| `city_name.csv` | One row per **name span** | Renames in place + concurrent multilingual names |
| `city_succession.csv` | One row per **cross-place link** | When a different place inherited the regional/capital function |

The polis (the political community of a city at a moment) does not get its own table. It emerges from the join: `city ⨝ city_name ⨝ polity ⨝ figure` — the polis is a **view**, not an entity.

---

## Data Fields

### city.csv

```csv
id,name,lat,lon,founding_year,abandonment_year,region,modern_country,note
constantinople,Constantinople,41.0082,28.9784,-657,,europe,turkey,Refounded by Constantine 330 CE on site of Byzantion
carthage,Carthage,36.8528,10.3233,-814,698,north_africa,tunisia,Punic city destroyed 146 BCE; Roman city built atop ruins 49 BCE — modeled as one place
baghdad,Baghdad,33.3152,44.3661,762,,west_asia,iraq,Founded by al-Mansur on virgin ground; succeeds Ctesiphon as regional capital
budapest,Budapest,47.4979,19.0402,1873,,europe,hungary,Formed by 1873 merger of Buda Pest and Óbuda
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (snake_case) |
| `name` | string | Canonical / most-recognizable historical name (primary display name) |
| `lat` | float | Latitude of the chosen historical core |
| `lon` | float | Longitude of the chosen historical core |
| `founding_year` | integer (year) | When occupation began as a city; BCE is negative |
| `abandonment_year` | integer (year) | When the city ceased to exist as a city; empty = extant |
| `region` | string | Geographic region (mirrors `polity.region` values) |
| `modern_country` | string | Modern country containing the site (for orientation) |
| `note` | string | Free text for ambiguity, judgment calls, and edge-case explanations |

### city_name.csv

```csv
city_id,name,language,start_year,end_year,note
constantinople,Byzantion,greek,-657,330,
constantinople,Constantinople,greek,330,1930,Official name through Byzantine and Ottoman eras
constantinople,Konstantiniyye,ottoman_turkish,1453,1930,
constantinople,İstanbul,turkish,1930,,Officially adopted 1930; phonetic descendant of "eis tin polin"
constantinople,Tsargrad,old_church_slavonic,860,,Slavic name still used in some Orthodox contexts
new_york,New Amsterdam,dutch,1624,1664,
new_york,New York,english,1664,,
```

| Field | Type | Description |
|---|---|---|
| `city_id` | ref → city | The place this name applies to |
| `name` | string | The name as it appears in that language |
| `language` | ref → language | Language the name is in |
| `start_year` | integer (year) | When this name came into use |
| `end_year` | integer (year) | When this name fell out of official use; empty = still in use |
| `note` | string | Optional context |

**Concurrent multilingual names are encouraged.** Greek "Smyrna" (in use ~600 BCE – present) and Turkish "İzmir" (~1300 – present) are both active today. The `language` column is the discriminator that lets overlapping spans coexist.

### city_succession.csv

```csv
from_city_id,to_city_id,succession_type,year,note
ctesiphon,baghdad,capital_function,762,Abbasid foundation 35 km north of Sasanian Ctesiphon
memphis_egypt,cairo,capital_function,969,Fatimid foundation north of long-decayed Memphis
carthage,tunis,regional_center,698,Tunis emerged as regional center after Arab destruction of Carthage
xianyang,xian,capital_function,-202,Han founded Chang'an after destruction of Qin Xianyang
buda,budapest,merger,1873,
pest,budapest,merger,1873,
obuda,budapest,merger,1873,
```

| Field | Type | Description |
|---|---|---|
| `from_city_id` | ref → city | The earlier place |
| `to_city_id` | ref → city | The later place that inherited the role |
| `succession_type` | enum | `capital_function`, `regional_center`, `merger`, `split`, `relocation` |
| `year` | integer (year) | When the succession effectively occurred |
| `note` | string | Optional historical context |

`city_succession` fires **only when the place changes.** Renames in place go in `city_name`, never here.

---

## Worked Examples

### Same place, multiple name spans (one row in `city`)

| Place | Name spans |
|---|---|
| Constantinople | Byzantion → Constantinople → Konstantiniyye → İstanbul (+ concurrent Tsargrad) |
| İzmir | Smyrna (Greek, ~600 BCE – present) + İzmir (Turkish, ~1300 – present) |
| Konya | Iconium (Greek) + Konya (Turkish), concurrent |
| Xi'an | Chang'an (Han through Yuan) → Xi'an (Ming onward) |
| New York | New Amsterdam (Dutch, 1624–1664) → New York (English, 1664–) |
| Saint Petersburg | Saint Petersburg → Petrograd → Leningrad → Saint Petersburg (oscillation, four spans) |
| Tokyo | Edo → Tokyo (1868) |

### Different places, linked by succession (two+ rows in `city`, link in `city_succession`)

| Earlier place | Later place | Distance | Why two cities |
|---|---|---|---|
| Ctesiphon | Baghdad | ~35 km | Baghdad founded on virgin ground for Abbasid political reasons |
| Memphis | Cairo | ~24 km | Memphis abandoned for centuries; Cairo founded fresh by Fatimids 969 CE |
| Carthage | Tunis | ~17 km | Tunis arose as regional center after Carthage's Arab-era destruction |
| Xianyang | Xi'an | ~10 km | Xianyang razed by Xiang Yu; Han founded Chang'an at a new site |
| Persepolis | Shiraz | ~60 km | Persepolis destroyed; Shiraz absorbed regional function much later |
| Nineveh | Mosul | ~adjacent | Distinct mounds across the Tigris; Mosul founded after Nineveh's fall |

### Mergers (many places → one)

| Components | Merged into | Year |
|---|---|---|
| Buda + Pest + Óbuda | Budapest | 1873 |
| Manhattan + Brooklyn + Queens + Bronx + Staten Island | New York City | 1898 |
| Edo wards | Tokyo | 1878–1943 (multiple consolidations) |

Components remain as their own `city` rows for the pre-merger period; the merged entity is its own row, linked by `city_succession(succession_type=merger)`.

---

## Edge Cases — When the `note` Field Earns Its Keep

The schema absorbs ambiguity rather than resolving it. The hard cases get a sentence in `note` and the curator moves on.

| Case | Type | Curator's call |
|---|---|---|
| **Carthage** | Destroyed and rebuilt on the same hill, same name, different polis | One city, note explains Punic→Roman gap |
| **Drifting cities** | Old Cairo / Fustat / medieval Cairo, Marrakech, Great Zimbabwe | One city, single chosen center; document drift in note |
| **Twin cities that never merged** | Minneapolis–Saint Paul, Rawalpindi–Islamabad, Buda–Pest pre-1873 | Two cities |
| **Refounded near old site with new name** | Persepolis → Shiraz | Two cities, succession link |
| **Continuous occupation, parallel-language names** | İzmir/Smyrna, Konya/Iconium, İstanbul/Constantinople | One city, overlapping `city_name` spans |

---

## Scope Discipline — When a City Earns a Row

`city.csv` is **scoped by inbound foreign keys**, not by historical fame. A place earns a row only when something else in the dataset points to it:

- A `polity.capital_id` references it
- A `figure.seat_city_id` or `figure.birth_city_id` references it
- A panel label, treaty, or other entity uses it as an anchor

**Rule:** *No inbound FK → no row.*

This self-limits the table to ~300–500 cities (the realistic count of polity capitals plus named figure seats), keeps `city_name` under ~1,500 rows, and prevents the table from sprawling into a parallel atlas. A row added "because the city is famous" but never referenced is a maintenance burden, not data.

When seeding, **start from the references and back-fill cities**, not the other way around. Walk through `polity.csv` extracting capitals; walk through `figure.csv` extracting seats; the union is your initial city set. Same rule applies to `city_name` — only add name spans for cities that already exist in `city.csv`.

`city_succession` is not subject to this rule (it's an edge table — its grain *is* the relationship), but its endpoints must be valid `city` rows, which means succession links can only exist between cities that already earned their place via some other FK.

---

## Why This Factoring

A historical atlas is a **map**, not a constitutional registry. Place-identity matches the artifact. It also keeps the schema honest about what is persistent (the site) versus what is time-bounded (the name, the rulers, the polity). Trying to encode "is this the same polis?" automatically is where over-engineering starts; trying to encode "is this the same dot on the map?" is achievable.

The 5% of genuinely ambiguous cases (Carthage, drifting cities, contested mergers) live in the `note` field. That is by design.
