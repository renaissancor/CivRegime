# Regime

## What a Regime Is

A **Regime** is a specific political entity that exists at the intersection of four dimensions:

```
Regime = Ethnicity (who rules) × Territory (where) × Ideology (why) × Time (when)
```

It is **not** a civilization, a culture, or a people. It is a concrete political instance — the Roman Empire, the Sassanid Empire, the Tang Dynasty. Two regimes can share the same territory, the same ethnicity, or the same ideology while still being distinct entities.

The regime is the **node** in the succession graph. Everything else (ethnicity, territory, language, religion, ideology) is a property or edge that connects regimes to each other.

---

## Data Fields

```json
{
  "id": "ottoman_empire",
  "name": "Ottoman Empire",

  "ruling_ethnicity": "turkic",
  "cultural_language": "ottoman_turkish",

  "ideology": {
    "religion": "sunni_hanafi",
    "government": "caliphate"
  },

  "territories": ["anatolia", "balkans", "levant", "mesopotamia", "egypt"],

  "start": 1299,
  "end": 1922,

  "policies": [
    { "id": "millet_system", "start": 1453, "end": 1839, "description": "..." }
  ],

  "figures": [
    { "id": "osman_i", "name": "Osman I", "role": "founder", "years": "1258/1326" },
    { "id": "mehmed_ii", "name": "Mehmed II (Fatih)", "role": "ruler", "years": "1432/1481" }
  ],

  "note": "Optional historical annotation"
}
```

### Field Reference

| Field | Type | Description |
|---|---|---|
| `ruling_ethnicity` | ref → ethnicities | The dynasty's ethnic origin — who holds power |
| `cultural_language` | ref → languages | The language the court actually operates in |
| `ideology.religion` | ref → religions | The fixed state religion — existential identity |
| `ideology.government` | ref → ideologies | The fixed government form — existential structure |
| `territories[]` | ref[] → territories | Lands controlled at peak extent |
| `start` / `end` | integer (year, negative = BC) | Regime lifespan |
| `policies[]` | inline array | Time-bounded decisions (see `ideology.md`) |
| `figures[]` | inline array | Key historical personalities (see below) |
| `note` | string | Free-text historical annotation |

---

## Figures

A regime's `figures` are the historical personalities who best **represent or define** the regime's identity. They are not exhaustive biographies — they are the human faces that give the regime meaning.

### Figure Roles

| Role | Meaning | Example |
|---|---|---|
| `founder` | Established the regime; defined its original character | Osman I (Ottoman), Cyrus the Great (Achaemenid) |
| `ruler` | A ruler whose reign defined the regime at its height | Suleiman the Magnificent, Harun al-Rashid |
| `general` | Military figure who shaped the regime's territory | Khalid ibn al-Walid (Rashidun), Belisarius (Byzantine) |
| `administrator` | Bureaucrat/vizier who built the administrative system | Nizam al-Mulk (Seljuk), Li Si (Qin) |
| `philosopher` | Intellectual who defined or challenged the regime's ideology | Confucius (Zhou), Ibn Khaldun (Marinid/observer) |
| `cultural` | Poet, artist, or scientist who personifies the era | Li Bai (Tang), Omar Khayyam (Seljuk), Rumi (Seljuk Rum) |
| `reformer` | A ruler who radically changed the regime's direction | Akbar (Mughal), Ashoka (Maurya) |
| `last_ruler` | The one who presided over the end | Constantine XI (Byzantine), Puyi (Qing) |

### Why Figures Matter

Figures make the abstract graph human and navigable. They also reveal succession logic intuitively:

- **Bismarck** as founder of the German Empire tells you it was a top-down political construction, not an organic ethnic emergence
- **El Cid** as the representative figure of Reconquista Spain tells you the regime's identity was defined by the Catholic frontier against Islamic territory — religion first, ethnicity second
- **Ashoka** as reformer of the Maurya Empire captures the ideological rupture mid-dynasty: the same regime, same territory, same ethnic dynasty, but a near-total reversal of state philosophy from Brahmanical conquest to Buddhist non-violence
- **Nizam al-Mulk** as the Seljuk administrator explains why a Turkic ruling regime had a Persian cultural identity — the Persian bureaucrat was the actual engine of governance

### Selection Principle

Choose figures that best answer: *"If someone knows nothing about this regime, who would give them the clearest picture of what it stood for?"*

Priority order:
1. Founder (if historically known and significant)
2. The ruler at the regime's zenith
3. A cultural or intellectual figure who personifies the era
4. The last ruler (if the ending is historically significant)

---

## Regime vs Dynasty

A regime is **not** a dynasty. A single dynasty can span multiple regimes if the ideology changes fundamentally:

| Dynasty | Regimes | Break |
|---|---|---|
| Roman imperial line | Roman Empire (pagan) → Byzantine Empire (Orthodox) | Theodosius I's Christianity as state religion |
| Jurchen/Aisin Gioro | Jin Dynasty → (gap) → Qing Dynasty | Centuries apart; Qing consciously invoked Jin ancestry as legitimation |
| Mongol Borjigin | Mongol Empire → Yuan / Ilkhanate / Golden Horde / Chagatai | Each successor adopted a different ideology |

Conversely, a regime can outlast its founding dynasty. The Byzantine Empire continued through multiple dynastic changes while maintaining its Orthodox + Caesaropapism ideology unchanged.

---

## Regime Continuity Score (Planned)

The validation engine will compute a continuity score for any succession edge based on:

```
score = territory_overlap × ethnicity_match × ideology_distance × language_distance
```

Where:
- `territory_overlap` = Jaccard similarity of territory sets
- `ethnicity_match` = 1 if same ruling_ethnicity, else language tree distance
- `ideology_distance` = religion tree distance + government form distance
- `language_distance` = court language tree distance

A Type A succession scores near 1.0. A Type D scores near 0.0. The score makes it possible to distinguish a *strong* Type C (same territory, closely related ethnicity) from a *weak* Type C (same territory, completely alien ethnicity).
