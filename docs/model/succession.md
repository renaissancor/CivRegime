# Succession Logic

In this file, **Polity** = the top-level political entity (dir: `data/polity/`). The future dynasty-tier **Regime** is defined in [`erd.md`](./erd.md).

## What is Succession?

Succession is **continuity between polities**. In the CivRegime model, it answers: "When one polity ends and another begins, is there a connection between them?"

The connection is measured by:
1. **Territorial Continuity** — Did the successor polity control any of the predecessor's territories?
2. **Cultural Continuity** — Did the successor share ethnicity, language, or ideology with the predecessor?
3. **Temporal Proximity** — Was the transition immediate or separated by years/centuries?
4. **State Membership** — Do both polities belong to the same STATE (political continuity)?

---

## Core Data Structure

### polity_territory: The Foundation

The `polity_territory` table is the source of truth for succession:

```csv
territory_id,regime_id,start,end
egypt,1,-2686,-2181    # Old Kingdom Egypt
egypt,5,-2181,-2055    # First Intermediate Period
egypt,7,-2055,-1650    # Middle Kingdom Egypt
egypt,8,-1550,-1070    # New Kingdom Egypt
```

**Key insight:** When we see polity 1 ending in Egypt (-2181) and polity 5 immediately taking over, that's a **direct succession on the same territory**.

---

## Succession Categories

### 1. **Direct Succession** (Same Territory, Same Ethnicity)
One polity directly succeeds another on the same territory with shared cultural identity.

**Pattern in data:**
- Territory T: Polity A (-100 to 0) → Polity B (0 to 100)
- Both polities have same or closely-related ethnicity
- No gap in timeline (end of A = start of B)

**Examples:**
- Old Kingdom Egypt → First Intermediate Period (same territory, continuous Egyptian culture)
- Seljuk Rum → Ottoman (same Anatolian territory, same Turkish ethnicity)

**Strength:** Very strong continuity ✅✅✅

---

### 2. **Weak Direct Succession** (Same Territory, Different Ethnicity)
New polity conquers and holds the same territory but brings a different culture/ethnicity.

**Pattern in data:**
- Territory T: Polity A (ethnicity X, -100 to 0) → Polity B (ethnicity Y, 0 to 100)
- Different ethnicities/cultures
- Same territory controlled continuously

**Examples:**
- Ptolemaic Egypt (Greek) → Roman Egypt (Roman)
- Byzantine Anatolia (Greek) → Ottoman Anatolia (Turkish)
- Persian Empire (Persian) → Macedonian Empire (Macedonian) in same territories

**Strength:** Territory shows continuity, but culture/ethnicity breaks. Medium strength. 🔗

---

### 3. **Ethnic Migration** (Different Territory, Same Ethnicity)
Same ethnic/cultural group controls new territories (migration, expansion, diaspora).

**Pattern in data:**
- Territory T1: Polity A (ethnicity X, -100 to 0)
- Territory T2: Polity B (ethnicity X, 0 to 100)
- Same ethnicity, but different territories

**Examples:**
- Jurchen Jin Dynasty (Jurchen in Manchuria) → Manchu Qing (Jurchen in Manchuria + China)
- Germanic tribes in Germany → Frankish Empire across Western Europe
- Islamic Caliphates expanding from Arabia to Mesopotamia/Levant

**Strength:** Cultural continuity matters, but territory shift weakens the link. Medium-weak. 🔗

---

### 4. **No Direct Succession** (Different Territory, Different Ethnicity)
Polities are completely unrelated — no territorial overlap and no shared culture.

**Pattern in data:**
- Polity A: ethnicity X, territory T1, (-100 to 0)
- Polity B: ethnicity Y, territory T2, (50 to 150)
- No overlap on territory, no shared ethnicity
- Possible temporal gap

**Examples:**
- Tang Dynasty (Han, China) → Ottoman Empire (Turkish, Anatolia)
- Aztec Empire (Mexico) → Songhai Empire (Mali region)

**Strength:** No connection. 0️⃣

---

## Building Succession Graphs

### Algorithm: Find Successors for Polity P

1. **Same Territory, Same Ethnicity:**
   - Find all territories T controlled by polity P
   - For each T, find which polity controls T immediately after P ends
   - If successor has same ethnicity → **Direct Succession** ✅

2. **Same Territory, Different Ethnicity:**
   - For each T, find successor polity
   - If successor has different ethnicity → **Weak Succession** 🔗

3. **Same Ethnicity, Different Territory:**
   - Find all polities with same ethnicity as P
   - Check if they controlled territories P didn't
   - If timeline overlaps or immediately follows → **Ethnic Migration** 🔗

4. **No Match:**
   - If successor polity has different ethnicity AND different territories → **No Direct Succession**
   - May need multi-hop path (e.g., A → B → C)

---

## Query Examples

### "Who succeeded Old Kingdom Egypt?"

```
1. Old Kingdom Egypt ends at year -2181, controls territory "egypt"
2. Find polity controlling "egypt" starting at -2181
   → First Intermediate Period (polity 5)
3. Check ethnicity: both Egyptian
4. Result: DIRECT SUCCESSION ✅
```

### "Who succeeded the Seljuk Turks?"

```
1. Seljuk Rum controls: anatolia, levant, mesopotamia
2. Find polities taking over each territory around 1308:
   - anatolia → Ottoman (Turkic) ✅
   - levant → Mamluk (Arabic) 🔗
   - mesopotamia → Timur/Timurid (Turko-Mongol) 🔗
3. Result: Ottoman has DIRECT SUCCESSION (same ethnicity, same core territory)
           Timurid has ETHNIC CONTINUATION (same Turkic core)
```

### "Who succeeded Justinian's Byzantine Empire?"

```
1. Byzantine Empire controls: balkans, greece, anatolia, levant, egypt, north africa
2. Empire collapses 1453, territories split among:
   - anatolia → Ottoman (Turkic) 🔗
   - balkans → Ottoman (Turkic) 🔗
   - greece → Ottoman (Turkic) 🔗
   - levant → Ottoman (Turkic) 🔗
   - egypt → Ottoman (Turkic) 🔗
3. Result: Ottoman Empire is TERRITORIAL SUCCESSOR (controls most Byzantine lands)
           but NOT ETHNIC successor (Turkish ≠ Greek)
```

---

## Ideological Breaks

Religion and ideology can create "succession breaks" even when territory and ethnicity continue.

**Example: Roman Empire Ideological Transition**

```
Roman Empire (Pagan): -27 to 380
  Ethnicity: Latin
  Religion: Roman Polytheism
  Territory: Mediterranean, Western Europe

Roman Empire (Christian): 380 to 476 (Western), continues Eastern as Byzantine
  Ethnicity: Latin (Western), Greek (Eastern/Byzantine)
  Religion: Catholic / Orthodox
  Territory: Same as predecessor
```

**Analysis:**
- Same territory ✅
- Same ethnicity ✅
- Different ideology ❌

**Verdict:** This is technically DIRECT SUCCESSION by territorial and ethnic measures, but **ideologically it's a break**. The religion shift was deliberate and civilization-defining. The succession is "technically continuous, spiritually revolutionary."

This is where the future **Regime** tier (defined in `erd.md`) will subdivide the Roman polity into separate regimes by ideology and dynasty.

---

## Implementation Notes

### Data Sources
- **Succession data** comes from `polity_territory` table
- **Ethnicity data** from `polity.id_ruling_ethnicity`
- **Religion data** from `polity.id_ruling_religion`
- **Timeline data** from `polity.start` and `polity.end`

### Visualization
A succession graph should:
1. Show polities as nodes
2. Draw edges between polities with succession relationships
3. Color edges by type:
   - **Green** = Direct succession (same territory, same ethnicity)
   - **Yellow** = Weak succession (same territory, different ethnicity)
   - **Orange** = Ethnic migration (different territory, same ethnicity)
   - **No edge** = No connection
4. Optional: Label edges with territory names or dates

### Example Query in Code
```javascript
// Find successor of polity P
const successors = polities
  .filter(succ => {
    // Check if this polity controls any of P's territories
    const sharesTerritory = P.territories.some(t => 
      succ.territories.includes(t) && 
      succ.start <= P.end &&
      succ.end >= P.end
    );
    
    // Check if same ethnicity
    const sameEthnicity = succ.ethnicity_id === P.ethnicity_id;
    
    return sharesTerritory || sameEthnicity;
  });
```

---

## Edge Cases

### Simultaneous Collapse
When a large empire splinters into multiple successor states:
- Roman Empire → Visigothic Kingdom (Spain), Frankish Kingdom (France), etc.
- Each gets partial territory but none controls the whole
- **Result:** Multiple weak successors, no single "true successor"

### Long Gaps
Polity A controls territory T (0-100), then T is controlled by unrelated polities (100-300), then polity B (also ethnicity X) controls T (300-400).
- A and B share ethnicity but not continuous territory
- **Result:** Not a direct successor, but ethnic continuity exists

### Reconquest After Loss
Polity A controls territory T (-100 to 0), loses it, then a related polity B (same ethnicity) reconquers it (50-150).
- Territory control is discontinuous
- **Result:** Weak succession (ethnicity matters, but not territorial continuity)

---
