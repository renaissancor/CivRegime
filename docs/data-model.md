# Data Model Overview

The entire project is a **property graph** — multiple node types connected by typed edges.

## Node Types

| Location | Node Type | What it represents |
|---|---|---|
| `data/territories/{region}/{id}.json` | Territory | A macro geographic zone. Accumulates rulers over time. Each file contains metadata + `periods[]` of historical control. |
| `data/languages/` (directory tree) | Language | A language in a phylogenetic tree. Parent derived from filesystem path. |
| `data/religions/` (directory tree) | Religion | A religion or religious branch in a taxonomy tree. Parent derived from filesystem path. |
| `data/ideologies.json` | Ideology | A government form or state philosophy. Kept as a single flat file. |
| `data/ethnicities/` (flat directory) | Ethnicity | A people defined by language, origin, and ancestry. |
| `data/regimes/` (flat directory, subdirs supported) | Regime | A specific political entity at the intersection of Ethnicity × Territory × Ideology × Time. |
| `data/successions/` (flat directory) | Succession | A directed edge between two Regimes, typed A/A-/B/C/D. |

## Edge Types

```
Language        --[parentOf]-->        Language          (phylogenetic tree)
Religion        --[parentOf]-->        Religion          (taxonomy tree)
Ideology        --[parentOf]-->        Ideology          (taxonomy tree)

Ethnicity       --[speaksLanguage]--> Language
Ethnicity       --[originatesIn]-->   Territory

Regime          --[ruledBy]-->         Ethnicity         (ruling_ethnicity)
Regime          --[courtLanguage]-->   Language          (cultural_language)
Regime          --[hasIdeology]-->     Ideology          (ideology.government)
Regime          --[hasReligion]-->     Religion          (ideology.religion)
Regime          --[controlled]-->      Territory[]       (with time bounds: start/end)

Succession      --[from]-->            Regime
Succession      --[to]-->              Regime
Succession      --[type]-->            A | B | C | D
```

## The Succession Matrix

A succession edge is typed by what the two regimes share:

| Type | Name | Same Ethnicity | Same Territory | Legitimacy |
|---|---|:---:|:---:|---|
| A | Direct Lineage | ✅ | ✅ | Orthodox — the gold standard |
| A- | Direct (ideology gap) | ✅ | ✅ | Weakened — same people, same land, ideology changed |
| B | Cultural Migration | ✅ | ❌ | Successor — same people moved |
| C | Locus Inheritance | ❌ | ✅ | Claimant — conquered the land |
| D | Arbitrary Jump | ❌ | ❌ | **Ahistorical / Invalid** |

## Ideology vs Policy

See `ideology.md` for the full explanation. In the data:

- `regime.ideology` — **fixed**. The unchanging existential identity of the regime.
- `regime.policies[]` — **time-bounded**. Decisions made within the regime's lifespan that do not redefine its core identity.

## The Persian Cultural Thread (an example of why the model matters)

The model makes the following pattern visible:
- **Achaemenid** (Persian ruling + Persian court)
- **Macedonian/Seleucid** conquest → Greek ruling, but Persian administrative tradition survives
- **Parthian** (Iranian ruling + Persian court)
- **Sassanid** (Persian ruling + Persian court, Zoroastrian ideology)
- **Abbasid** conquest → Arab ruling, but Persian bureaucracy dominates
- **Seljuk** (Turkic ruling + **Persian** court)
- **Ilkhanate** (Mongol ruling + **Persian** court)
- **Timurid** (Turkic ruling + **Persian** court)
- **Safavid** (Persian ruling + **Persian** court, Shia ideology)
- **Mughal** (Turkic ruling + **Persian** court)

Persian culture survived six conquests by completely different ethnic groups because it filled a functional role: the **Persianate bureaucracy** (see `ideologies.json`) was the most advanced administrative system available in the region, and every conqueror eventually adopted it.

The `cultural_language` field on regimes makes this thread visible across the graph.
