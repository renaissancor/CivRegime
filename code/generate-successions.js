#!/usr/bin/env node

/**
 * Generate rich succession relationships from ALL available data:
 *   - territory_periods (territorial handoffs)
 *   - regimes (ethnicity, language, religion, dates)
 *   - ethnicities (tree ancestry for broader ethnic matching)
 *
 * Succession signals (each contributes to edge weight):
 *   1. TERRITORY:  Consecutive control of same territory
 *   2. ETHNICITY:  Same ruling ethnicity (direct match)
 *   3. ETH_FAMILY: Related ethnicity (shared ancestor in tree)
 *   4. LANGUAGE:   Same ruling language
 *   5. RELIGION:   Same ruling religion
 *   6. STATE:      Same state_id (political continuity)
 *   7. TEMPORAL:   How close in time (gap years)
 *
 * Classification:
 *   A  — Strong continuity (territory + ethnicity + continuous)
 *   A- — Continuity with break (territory + ethnicity + gap, OR territory + language/religion)
 *   B  — Ethnic/cultural migration (same ethnicity/language, different territory)
 *   C  — Conquest / locus inheritance (same territory, different culture)
 *
 * Output: csvs/successions.csv (rich columns)
 */

const fs = require('fs');
const path = require('path');

// ── CSV parser ──────────────────────────────────────────────────────────────

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = [];
    let current = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i + 1] === '"') { current += '"'; i++; } else inQ = !inQ; }
      else if (ch === ',' && !inQ) { values.push(current.trim()); current = ''; }
      else current += ch;
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

// ── Load all data ───────────────────────────────────────────────────────────

const regimesRaw = parseCSV(fs.readFileSync(path.join(__dirname, '../csvs/polity.csv'), 'utf8'));
const tpRaw      = parseCSV(fs.readFileSync(path.join(__dirname, '../csvs/polity_territory.csv'), 'utf8'));
const ethRaw     = parseCSV(fs.readFileSync(path.join(__dirname, '../csvs/ethnicity.csv'), 'utf8'));

// Map string old_id → numeric id for ethnicities
const ethOldToNum = {};
ethRaw.forEach(e => { if (e.old_id) ethOldToNum[e.old_id] = parseInt(e.id); });

const regimes = regimesRaw.map(r => ({
  id:       r.id,
  name:     r.name,
  state_id: r.state_id || null,
  eth:      r.id_ruling_ethnicity ? (ethOldToNum[r.id_ruling_ethnicity] || null) : null,
  ethStr:   r.id_ruling_ethnicity || null,
  lang:     r.id_ruling_language  || null,
  rel:      r.id_ruling_religion  || null,
  start:    parseInt(r.start_year),
  end:      r.end_year ? parseInt(r.end_year) : null,
}));

const tp = tpRaw.map(t => ({
  territory_id: t.territory_id,
  polity_id:    t.polity_id,
  start:        parseInt(t.start_year),
  end:          t.end_year ? parseInt(t.end_year) : null,
}));

// ── Ethnicity tree ancestry ─────────────────────────────────────────────────

const ethById = {};
ethRaw.forEach(e => { ethById[parseInt(e.id)] = e; });

// Get all ancestor IDs for an ethnicity (up the tree)
function getAncestors(ethId) {
  const ancestors = new Set();
  let cur = ethById[ethId];
  while (cur && cur.parent_id) {
    const pid = parseInt(cur.parent_id);
    if (ancestors.has(pid)) break; // cycle guard
    ancestors.add(pid);
    cur = ethById[pid];
  }
  return ancestors;
}

// Check if two ethnicities share an ancestor within N levels
function relatedEthnicity(ethA, ethB) {
  if (!ethA || !ethB) return false;
  if (ethA === ethB) return true;
  const ancestorsA = getAncestors(ethA);
  const ancestorsB = getAncestors(ethB);
  // Direct parent-child
  if (ancestorsA.has(ethB) || ancestorsB.has(ethA)) return true;
  // Shared ancestor (within 3 levels)
  for (const a of ancestorsA) {
    if (ancestorsB.has(a)) return true;
  }
  return false;
}

// ── Build lookups ───────────────────────────────────────────────────────────

const regimeById = {};
regimes.forEach(r => { regimeById[r.id] = r; });

// Territories per regime
const regimeTerritories = {};
tp.forEach(p => {
  if (!regimeTerritories[p.polity_id]) regimeTerritories[p.polity_id] = [];
  regimeTerritories[p.polity_id].push(p);
});

// Territory periods grouped by territory
const byTerritory = {};
tp.forEach(p => {
  if (!byTerritory[p.territory_id]) byTerritory[p.territory_id] = [];
  byTerritory[p.territory_id].push(p);
});

// ── Edge accumulator ────────────────────────────────────────────────────────

const edgeMap = {};
const edgeKey = (a, b) => `${a}→${b}`;

function addEdge(fromId, toId, signals) {
  if (fromId === toId) return;
  const key = edgeKey(fromId, toId);

  if (!edgeMap[key]) {
    edgeMap[key] = {
      from:       fromId,
      to:         toId,
      signals:    { ...signals },
      territories: signals.territory ? [signals.territory] : [],
    };
  } else {
    const e = edgeMap[key];
    // Merge signals (keep truthy values)
    Object.entries(signals).forEach(([k, v]) => {
      if (k === 'territory' && v) {
        if (!e.territories.includes(v)) e.territories.push(v);
        return;
      }
      if (v && !e.signals[k]) e.signals[k] = v;
    });
  }
}

// ── Strategy 1: Territory-based (consecutive control) ───────────────────────

const TERRITORY_GAP = 150; // years tolerance for "consecutive"

Object.entries(byTerritory).forEach(([territoryId, periods]) => {
  periods.sort((a, b) => a.start - b.start || (b.end || 9999) - (a.end || 9999));

  for (let i = 0; i < periods.length; i++) {
    const curr = periods[i];
    const fromR = regimeById[curr.polity_id];
    if (!fromR) continue;

    for (let j = i + 1; j < periods.length; j++) {
      const next = periods[j];
      if (curr.polity_id === next.polity_id) continue;
      const toR = regimeById[next.polity_id];
      if (!toR) continue;

      const gap = next.start - (curr.end || next.start);
      if (gap > TERRITORY_GAP) break;

      addEdge(curr.polity_id, next.polity_id, { territory: territoryId });
    }

    // Also link overlapping periods
    for (let j = i + 1; j < periods.length; j++) {
      const other = periods[j];
      if (curr.polity_id === other.polity_id) continue;
      const aEnd = curr.end || 2025;
      if (other.start < aEnd) {
        addEdge(curr.polity_id, other.polity_id, { territory: territoryId });
      }
    }
  }
});

// ── Strategy 2: Ethnicity-based (same or related ethnicity) ─────────────────

const ETH_GAP = 300; // years

// Group by exact ethnicity (use string ID for grouping)
const regimesByEth = {};
regimes.forEach(r => {
  if (!r.ethStr) return;
  if (!regimesByEth[r.ethStr]) regimesByEth[r.ethStr] = [];
  regimesByEth[r.ethStr].push(r);
});

// Same ethnicity, close in time — require shared territory to avoid noise
Object.values(regimesByEth).forEach(group => {
  if (group.length < 2) return;
  group.sort((a, b) => a.start - b.start);
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const gap = group[j].start - (group[i].end || group[j].start);
      if (gap > ETH_GAP) break;
      const aTerrs = new Set((regimeTerritories[group[i].id] || []).map(t => t.territory_id));
      const bTerrs = (regimeTerritories[group[j].id] || []).map(t => t.territory_id);
      const shared = bTerrs.some(t => aTerrs.has(t));
      if (shared) addEdge(group[i].id, group[j].id, { same_ethnicity: true });
    }
  }
});

// Related ethnicity (shared ancestor), close in time
for (let i = 0; i < regimes.length; i++) {
  for (let j = i + 1; j < regimes.length; j++) {
    const a = regimes[i], b = regimes[j];
    if (!a.eth || !b.eth || a.eth === b.eth) continue;
    const gap = Math.abs(b.start - (a.end || b.start));
    if (gap > 200) continue;
    if (relatedEthnicity(a.eth, b.eth)) {
      // Only add if they also share territory (to avoid noise)
      const aTerrs = new Set((regimeTerritories[a.id] || []).map(t => t.territory_id));
      const bTerrs = (regimeTerritories[b.id] || []).map(t => t.territory_id);
      const shared = bTerrs.some(t => aTerrs.has(t));
      if (shared) {
        addEdge(a.id, b.id, { related_ethnicity: true });
      }
    }
  }
}

// ── Strategy 3: Language-based ──────────────────────────────────────────────

// Group by exact language (string ID)
const regimesByLang = {};
regimes.forEach(r => {
  if (!r.lang) return;
  if (!regimesByLang[r.lang]) regimesByLang[r.lang] = [];
  regimesByLang[r.lang].push(r);
});

Object.values(regimesByLang).forEach(group => {
  if (group.length < 2) return;
  group.sort((a, b) => a.start - b.start);
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const gap = group[j].start - (group[i].end || group[j].start);
      if (gap > 300) break;
      addEdge(group[i].id, group[j].id, { same_language: true });
    }
  }
});

// ── Strategy 4: Religion-based (same territory + same religion) ─────────────

// Group by exact religion (string ID)
const regimesByRel = {};
regimes.forEach(r => {
  if (!r.rel) return;
  if (!regimesByRel[r.rel]) regimesByRel[r.rel] = [];
  regimesByRel[r.rel].push(r);
});

Object.values(regimesByRel).forEach(group => {
  if (group.length < 2) return;
  group.sort((a, b) => a.start - b.start);
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const gap = group[j].start - (group[i].end || group[j].start);
      if (gap > 200) break;
      // Only add religion link if they also share territory
      const aTerrs = new Set((regimeTerritories[group[i].id] || []).map(t => t.territory_id));
      const bTerrs = (regimeTerritories[group[j].id] || []).map(t => t.territory_id);
      const shared = bTerrs.some(t => aTerrs.has(t));
      if (shared) {
        addEdge(group[i].id, group[j].id, { same_religion: true });
      }
    }
  }
});

// ── Strategy 5: State-based ─────────────────────────────────────────────────

const regimesByState = {};
regimes.forEach(r => {
  if (!r.state_id) return;
  if (!regimesByState[r.state_id]) regimesByState[r.state_id] = [];
  regimesByState[r.state_id].push(r);
});

Object.values(regimesByState).forEach(group => {
  group.sort((a, b) => a.start - b.start);
  for (let i = 0; i < group.length - 1; i++) {
    addEdge(group[i].id, group[i + 1].id, { same_state: true });
  }
});

// ── Classify edges ──────────────────────────────────────────────────────────

const edges = Object.values(edgeMap).map(e => {
  const fromR = regimeById[e.from];
  const toR   = regimeById[e.to];
  const s     = e.signals;

  const hasTerritory = e.territories.length > 0;
  const sameEth      = !!s.same_ethnicity;
  const relatedEth   = !!s.related_ethnicity;
  const sameLang     = !!s.same_language;
  const sameRel      = !!s.same_religion;
  const sameState    = !!s.same_state;
  const gap          = toR.start - (fromR.end || toR.start);

  // Territorial direction: compare territory counts
  const fromTerrs = new Set((regimeTerritories[e.from] || []).map(t => t.territory_id));
  const toTerrs   = new Set((regimeTerritories[e.to] || []).map(t => t.territory_id));
  let territorial_direction = 'unknown';
  if (fromTerrs.size > 0 && toTerrs.size > 0) {
    const shared = [...fromTerrs].filter(t => toTerrs.has(t)).length;
    if (shared === 0) territorial_direction = 'displacement';
    else if (toTerrs.size > fromTerrs.size) territorial_direction = 'expansion';
    else if (toTerrs.size < fromTerrs.size) territorial_direction = 'contraction';
    else territorial_direction = 'same';
  }

  // Compute strength (number of matching signals)
  let strength = 0;
  if (hasTerritory)  strength += e.territories.length;
  if (sameEth)       strength += 3;
  if (relatedEth)    strength += 1;
  if (sameLang)      strength += 2;
  if (sameRel)       strength += 1;
  if (sameState)     strength += 4;
  if (Math.abs(gap) <= 10)  strength += 2;
  else if (Math.abs(gap) <= 50) strength += 1;

  return {
    from:               e.from,
    from_name:          fromR.name,
    to:                 e.to,
    to_name:            toR.name,
    territorial_direction,
    strength,
    shared_territories: e.territories,
    same_ethnicity:     sameEth,
    related_ethnicity:  relatedEth,
    same_language:      sameLang,
    same_religion:      sameRel,
    same_state:         sameState,
    temporal_gap:       gap,
  };
});

// Sort: strongest first
edges.sort((a, b) => b.strength - a.strength || a.territorial_direction.localeCompare(b.territorial_direction));

// ── Write CSV ───────────────────────────────────────────────────────────────

const headers = [
  'from_polity_id', 'from_name', 'to_polity_id', 'to_name',
  'territorial_direction', 'strength',
  'shared_territories', 'shared_territory_count',
  'same_ethnicity', 'related_ethnicity', 'same_language', 'same_religion', 'same_state',
  'temporal_gap_years',
];

function escapeCSV(val) {
  const s = String(val);
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? `"${s.replace(/"/g, '""')}"` : s;
}

const csvLines = [headers.join(',')];
edges.forEach(e => {
  csvLines.push([
    e.from,
    escapeCSV(e.from_name),
    e.to,
    escapeCSV(e.to_name),
    e.territorial_direction,
    e.strength,
    e.shared_territories.join('|'),
    e.shared_territories.length,
    e.same_ethnicity  ? 1 : 0,
    e.related_ethnicity ? 1 : 0,
    e.same_language   ? 1 : 0,
    e.same_religion   ? 1 : 0,
    e.same_state      ? 1 : 0,
    e.temporal_gap,
  ].join(','));
});

const csvPath = path.join(__dirname, '../csvs/polity_succession.csv');
fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');

// ── Stats ───────────────────────────────────────────────────────────────────

const counts = { same: 0, expansion: 0, contraction: 0, displacement: 0, unknown: 0 };
edges.forEach(e => counts[e.territorial_direction] = (counts[e.territorial_direction] || 0) + 1);

const connected = new Set();
edges.forEach(e => { connected.add(e.from); connected.add(e.to); });

const signalCounts = { territory: 0, ethnicity: 0, related_eth: 0, language: 0, religion: 0, state: 0 };
edges.forEach(e => {
  if (e.shared_territories.length) signalCounts.territory++;
  if (e.same_ethnicity)   signalCounts.ethnicity++;
  if (e.related_ethnicity) signalCounts.related_eth++;
  if (e.same_language)    signalCounts.language++;
  if (e.same_religion)    signalCounts.religion++;
  if (e.same_state)       signalCounts.state++;
});

console.log(`✓ Generated successions.csv — ${edges.length} edges, ${connected.size}/${regimes.length} regimes connected`);
console.log(`  Same         : ${counts.same}`);
console.log(`  Expansion    : ${counts.expansion}`);
console.log(`  Contraction  : ${counts.contraction}`);
console.log(`  Displacement : ${counts.displacement}`);
console.log(`  Unknown      : ${counts.unknown}`);
console.log(`  Avg strength : ${(edges.reduce((s,e) => s + e.strength, 0) / edges.length).toFixed(1)}`);
console.log(`  Edges with territory signal : ${signalCounts.territory}`);
console.log(`  Edges with ethnicity signal : ${signalCounts.ethnicity}`);
console.log(`  Edges with related eth      : ${signalCounts.related_eth}`);
console.log(`  Edges with language signal  : ${signalCounts.language}`);
console.log(`  Edges with religion signal  : ${signalCounts.religion}`);
console.log(`  Edges with state signal     : ${signalCounts.state}`);
