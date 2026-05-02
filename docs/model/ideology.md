# Ideology vs Policy

## The Core Distinction

**Ideology** is the polity's existential reason to exist. It does not change. If it changes, the polity has ended and a new one has begun — even if the same dynasty continues sitting on the throne.

**Policy** is a time-bounded decision made by rulers within the polity. It can change, reverse, or expire without threatening the polity's identity.

---

## Ideology

A polity's ideology has three components in the data model:

```json
"ideology": {
  "religion": "eastern_orthodox",
  "government": "caesaropapism",
  "philosophy": "confucian_statecraft"
}
```

- **religion**: The state religion that defines the polity's legitimacy and civilizational allegiance. Changing this ends the polity.
- **government**: The structural form of power (khaganate, caliphate, Chinese imperial bureaucracy, etc.).
- **philosophy**: The intellectual/moral framework of governance (Legalism, Confucian statecraft, Zoroastrian statecraft, Sharia-based governance, etc.). Optional — not all polities have a distinct state philosophy separate from religion.

### Examples of Ideology as Existential Identity

| Polity | Core Ideology | Why it Cannot Change |
|---|---|---|
| Byzantine Empire | Eastern Orthodox + Caesaropapism | The emperor is God's representative on Earth; losing Orthodoxy would destroy the basis of all political legitimacy |
| Soviet Union | Communism | The state exists explicitly to implement communism; without it, there is no justification for the party's monopoly on power |
| Sassanid Empire | Zoroastrianism | The Zoroastrian Magi priestly class was co-ruler; the king legitimized by protecting asha (cosmic order) |
| Fatimid Caliphate | Ismaili Shia | The Caliph's authority derived entirely from being the Imam — the divinely appointed descendant of Ali |
| Safavid Empire | Twelver Shia | Founded to impose Shia Islam on Iran; the entire state was a religious project |
| Ottoman Empire (post-1517) | Sunni Caliphate | Claimed to be the protector of all Sunni Muslims globally after taking the caliphal title |
| Han Dynasty | Confucianism | The civil examination system, bureaucratic structure, and moral governance were all Confucian; this was the "operating system" of the state |

---

## Policy

A policy is a time-bounded decision that does **not** redefine the polity's core identity.

```json
"policies": [
  {
    "id": "din_i_ilahi",
    "name": "Din-i-Ilahi (Divine Faith)",
    "start": 1582,
    "end": 1605,
    "description": "Akbar's syncretic personal cult blending Islam, Hinduism, Zoroastrianism, and Christianity. A policy experiment, not a change in state religion. The Mughal state remained Sunni Hanafi. The policy died with Akbar."
  }
]
```

### Examples of Policy vs Ideology Confusion

**Constantine's Conversion (Roman Empire)**
- In 312 AD, Constantine issued the Edict of Milan tolerating Christianity. This was **policy**.
- In 380 AD, Theodosius I made Christianity the only legal religion. This hardened into **ideology**.
- The Byzantine Empire inherited Christianity as fixed **ideology** — not policy.
- The Roman Empire that preceded it (pagan) is a different polity in ideological terms, despite physical continuity.

**Akbar's Din-i-Ilahi (Mughal Empire)**
- Akbar's syncretic experiment (1582–1605) was personal **policy**.
- It died with him. Aurangzeb reversed course and imposed strict Sunni orthodoxy.
- The Mughal **ideology** (Sunni Hanafi sultanate) never changed.

**Mongol Religious Tolerance**
- The Mongol Empire's tolerance was **policy** (enforced by the Yasa legal code).
- Successor states each adopted local religions as their **ideology**: Ilkhanate → Sunni Islam, Golden Horde → Sunni Islam, Yuan → Vajrayana Buddhism.
- The moment each khanate adopted a religion as state religion, it became an ideological commitment.

**Khazar Conversion to Judaism**
- The Khazar ruling class converting to Judaism was an **ideological shift**, not policy.
- It redefined the polity's civilizational allegiance and is why the Khazar Khaganate is a distinct civilizational case.

---

## Why This Matters for Succession

When evaluating whether a succession is valid:
- **Same ideology** → strong continuity, reinforces Type A
- **Same ethnicity, different ideology** → weakened continuity; Sunni Timurid → Shia Safavid on the same Iranian territory is more disruptive than a simple Type C despite Persian ethnic continuity
- **Religion split within same ethnicity** → creates entirely separate polities: Serb (Orthodox) vs Croat (Catholic) vs Bosniak (Muslim) are the same South Slavic people but three distinct civilizational identities with different valid successors

The Safavid/Timurid case is instructive: same territory (Iran), same broad ethnicity (Persian/Iranian), but the Shia vs Sunni divide means these are NOT a smooth Type A succession. The ideological discontinuity is a Type D in religious terms even where ethnic and territorial continuity exists.

---

## Government Form as Ideology

The **government form** is also part of ideology, not policy.

A caliphate is not merely a government style — it is a claim to be the legitimate ruler of all Muslims globally. An empire that claims the caliphate and then abandons it has ended. This is why the end of the Ottoman Caliphate in 1924 is considered the end of the Ottoman polity even though the sultanate had been abolished in 1922 — the two were the polity's twin ideological pillars.

Similarly, the Chinese Imperial Bureaucracy (Son of Heaven, Confucian exam system, mandate of heaven) was not a governing choice — it was the definition of what it meant to rule China. Every non-Han dynasty that wanted to rule China (Jurchen Jin, Mongol Yuan, Manchu Qing) had to either adopt this system (thereby legitimizing themselves) or rule as a foreign occupier.
