# Ethnicity in CRIF

## What Ethnicity Is (and Isn't)

Ethnicity in this framework is primarily a **linguistic ancestry grouping** — defined by what language family a people descend from. This is the most objective and traceable definition available for historical analysis.

It is **not**:
- Race (biological)
- Nationality (political, modern)
- Culture (too broad — culture includes religion, which is modeled separately)

## The Granularity Problem

Ethnic groupings exist at multiple levels of resolution, exactly like language families:

```
Germanic (proto-family)
  └── English | German | Dutch | Norse | Gothic

Indo-Aryan (branch)
  └── Bengali | Punjabi | Hindi | Urdu | Gujarati | Marathi | Sindhi
```

**A single "Indo-Aryan" ethnicity is as meaningless as a single "Germanic" ethnicity.**

In the data:
- Broad groupings (`indo_aryan`, `south_slavic_eth`) exist for when granularity doesn't matter
- Regional sub-groups exist for when it does (`bengali_eth`, `punjabi_eth`, etc.)

Use the most specific level that is historically relevant for the regime in question.

## The Religion Fracture

Religion splits ethnic groups into politically distinct identities. This is the most important concept for understanding subcontinental and Balkan history.

### South Slavic — The Clearest Case

Serbs, Croats, and Bosniaks are a single ethnic group by every linguistic and genetic measure. They speak the same language (Serbo-Croatian). The divisions are entirely religious, imposed by external empires:

| Identity | Religion | Imperial Patron | Script |
|---|---|---|---|
| Serb | Eastern Orthodox | Byzantine Empire | Cyrillic |
| Croat | Roman Catholic | Habsburg Empire | Latin |
| Bosniak | Sunni Islam | Ottoman Empire | (historically Arabic) |

These three groups have different valid successors, different civilizational allegiances, and different regime inheritance chains — because they were absorbed into three different ideological spheres.

### Indo-Aryan — The Layered Case

The Indian subcontinent is more complex because:
1. The base ethnic differentiation is **regional** (Bengali, Punjabi, Tamil, etc.)
2. **Religion then cuts across** those regional identities
3. The result is a matrix, not a simple split

| Ethnicity | Hindu identity | Muslim identity | Sikh identity (Punjab only) |
|---|---|---|---|
| Punjabi | Hindu Punjabi (India) | Muslim Punjabi (Pakistan) | Sikh Punjabi (India) |
| Bengali | Hindu Bengali (West Bengal) | Muslim Bengali (Bangladesh) | — |
| Hindustani | Hindi-speaking Hindu | Urdu-speaking Muslim | — |

Hindi and Urdu are the **same spoken language** (Hindustani). They diverged through:
- Script: Devanagari (Sanskrit-derived) vs Nastaliq (Persian-derived)
- Vocabulary: Sanskrit loan words vs Persian/Arabic loan words
- Identity: Hindu civilization vs Islamic civilization

This is modeled in `languages.json` with `hindustani` as the common parent of both `hindi` and `urdu`.

### Persian — The Shia/Sunni Case

Same ethnic group (Persian/Iranian), same territory (Iranian Plateau), but:
- Timurid: Sunni Hanafi
- Safavid: Twelver Shia

The Safavid revolution (1501) deliberately converted Iran to Shia Islam as a **state project** — to differentiate Iran from Ottoman Sunni power and create a distinct Iranian civilizational identity. Modern Iranian national identity is inseparable from Shia Islam, not just from Persian ethnicity.

## Ethnicity in Regimes: Two Fields

Each regime records two ethnic dimensions:

- `ruling_ethnicity`: Who holds power (the dynasty's ancestral origin)
- `cultural_language`: What language the court actually operates in

These frequently diverge in large empires:

| Regime | Ruling | Court Language | What it means |
|---|---|---|---|
| Timurid | Turkic | Persian | Turkic conquerors adopted Persian high culture |
| Mughal | Turkic | Persian | Same — Persian was the official state language |
| Mamluk | Turkic | Arabic | Turkic military rulers operating in Arab cultural sphere |
| Ayyubid | Kurdish | Arabic | Kurdish rulers fully assimilated into Arab-Islamic identity |
| Golden Horde | Mongol | Kipchak Turkic | Mongol rulers Turkified within two generations |
| Qing | Jurchen | Manchu (internal) | Maintained Manchu identity while governing Han majority |

The `cultural_language` field traces the **Persianate bureaucracy thread** — Persian as an administrative language that survived six ethnic conquests of Iran because it was the most sophisticated bureaucratic tradition available.

## The "Ethnic DNA" of a Territory

Each territory accumulates an ethnic history. Anatolia's sequence:

```
Hittite (Anatolian IE) → Achaemenid (Persian/Iranian IE)
  → Macedonian/Seleucid (Hellenic IE) → Roman (Latin IE)
  → Byzantine (Hellenic IE) → Seljuk Rum (Turkic)
  → Ottoman (Turkic)
```

Every transition is either Type C (locus inheritance — same land, different ethnicity) or Type A (direct continuity). The modern Turkish identity on Anatolian land is a Type B successor (Turkic ethnic continuity from Seljuk/Ottoman) overlaid on a Type C territorial inheritance from Byzantine.
