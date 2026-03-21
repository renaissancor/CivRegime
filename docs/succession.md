# Succession Logic

## The Four Types

| Type | Name | Ethnicity Match | Territory Match | Ideology Match | Legitimacy |
|---|---|:---:|:---:|:---:|---|
| A | Direct Lineage | ✅ | ✅ | ✅ | Orthodox — the gold standard |
| A- | Direct (ideology gap) | ✅ | ✅ | ❌ | Weakened — same people, same land, different religion/ideology |
| B | Cultural Migration | ✅ | ❌ | — | Successor — same people moved |
| C | Locus Inheritance | ❌ | ✅ | — | Claimant — conquered the land |
| D | Arbitrary Jump | ❌ | ❌ | — | **Ahistorical / Invalid** |

## Ideology as a Succession Modifier

Religion and government form are not just regime descriptors — they affect succession weight.

**Same ideology strengthens continuity:**
- Byzantine → Greek Orthodox successor states have strong Type A claims
- Abbasid → Ottoman (both Sunni Caliphate) is a much stronger Type C than Abbasid → Ilkhanate (Mongol/pagan)

**Different ideology weakens continuity — even within the same ethnicity:**
- Timurid (Sunni Hanafi, Persian-Turkic) → Safavid (Shia Twelver, Persian) on the same territory is NOT a clean Type A despite ethnic and territorial overlap. The Shia revolution was precisely designed to mark a break.
- Roman Empire (pagan) → Roman Empire (Christian) → Byzantine (Orthodox) represents ideological discontinuity even within apparent dynastic continuity.

## Path Validation

A valid succession path between Regime A and Regime Z must have:
1. No Type D jumps (unless an explicit intermediary is identified)
2. Each step connected by at least one shared dimension (ethnicity OR territory)

**Tang → Ottoman is Type D** because:
- Tang: Han Chinese, Yellow River / Yangtze, Confucian
- Ottoman: Turkic, Anatolia / Balkans, Sunni Hanafi
- Zero overlap on any dimension

The framework's goal is to make this immediately visible — a path query from Tang to Ottoman should return "no valid path" or a very long indirect chain through multiple intermediary regimes.

## Interesting Edge Cases

**Macedonian → Ptolemaic → Roman (Egypt)**
Each step is Type C (same Egyptian territory, different ethnicity). Three consecutive locus inheritances on the same land.

**Jurchen Jin → (gap) → Manchu Qing**
Type B: same Jurchen/Manchu ethnicity, but centuries apart and in a new political context. The Qing consciously invoked Jin dynasty ancestry as legitimation.

**Seljuk → Seljuk Rum → Ottoman**
- Seljuk → Seljuk Rum: Type B (same Turkic ethnicity, Anatolia is a new territory)
- Seljuk Rum → Ottoman: Type A (same Turkic ethnicity, same Anatolian territory)
- Full chain: Turkic ethnic continuity across both steps ✅

**Ottoman inheriting Byzantine legitimacy**
Ottoman claimed "Kayser-i Rum" (Caesar of Rome) after 1453. This is a Type C claim — territorial inheritance of Constantinople's symbolic weight. It is a **Claimant** succession, not Orthodox. The Ottoman was not Hellenic and not Orthodox Christian — it merely occupied the seat.
