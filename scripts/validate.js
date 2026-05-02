/**
 * CivRegime data validator.
 * Run: node scripts/validate.js
 *
 * Checks:
 *   1. No duplicate IDs within any entity type
 *   2. All foreign key references resolve
 *   3. Required fields present on every polity
 *   4. Date validity (start < end where both exist)
 *   5. Succession integrity (both ends exist, no self-loops)
 *   6. Succession type is a known value
 *   7. Region integrity (territory FK resolves, period polity FKs resolve)
 */

const fs   = require('fs');
const path = require('path');
const db   = require('../data');

const VALID_SUCCESSION_TYPES = new Set(['A', 'A-', 'B', 'C', 'D']);

let errors   = 0;
let warnings = 0;

function err(msg)  { console.error(`  ✗  ${msg}`); errors++; }
function warn(msg) { console.warn( `  ⚠  ${msg}`); warnings++; }
function ok(msg)   { console.log(  `  ✓  ${msg}`); }

// ── Build lookup sets ─────────────────────────────────────────────────────────

const sets = {
  polities:     new Set(db.polities.map(r => r.id)),
  territories: new Set(db.territories.map(t => t.id)),
  languages:   new Set(db.languages.map(l => l.id)),
  religions:   new Set(db.religions.map(r => r.id)),
  governments: new Set((db.governments || []).map(g => g.id)),
  ethnicities: new Set(db.ethnicities.map(e => e.id)),
  provinces:   new Set(db.provinces.map(r => r.id)),
};

// ── 1. Duplicate ID check ─────────────────────────────────────────────────────

function checkDuplicates(items, label) {
  const seen = new Map();
  for (const item of items) {
    if (!item.id) { err(`${label}: entry missing "id" field`); continue; }
    if (seen.has(item.id)) {
      err(`${label}: duplicate id "${item.id}"`);
    } else {
      seen.set(item.id, true);
    }
  }
}

console.log('\n── Duplicate IDs ────────────────────────────────────────');
checkDuplicates(db.polities,     'polities');
checkDuplicates(db.territories, 'territories');
checkDuplicates(db.provinces,   'provinces');
checkDuplicates(db.languages,   'languages');
checkDuplicates(db.religions,   'religions');
checkDuplicates(db.governments || [],  'governments');
checkDuplicates(db.ethnicities, 'ethnicities');
if (!errors) ok('no duplicates');

// ── 2. Required fields on polities ─────────────────────────────────────────────

console.log('\n── Required polity fields ───────────────────────────────');
const REQUIRED = ['id', 'name', 'ruling_ethnicity', 'start'];
let missingFields = 0;

for (const r of db.polities) {
  for (const f of REQUIRED) {
    if (r[f] == null || r[f] === '') {
      err(`polity "${r.id || '?'}": missing required field "${f}"`);
      missingFields++;
    }
  }
  if (!r.ideology?.religion)   warn(`polity "${r.id}": missing ideology.religion`);
  if (!r.ideology?.government) warn(`polity "${r.id}": missing ideology.government`);
}
if (!missingFields) ok('all required fields present');

// ── 3. Date validity ──────────────────────────────────────────────────────────

console.log('\n── Date validity ────────────────────────────────────────');
let badDates = 0;
for (const r of db.polities) {
  if (r.start != null && r.end != null && r.start >= r.end) {
    err(`polity "${r.id}": start (${r.start}) >= end (${r.end})`);
    badDates++;
  }
}
if (!badDates) ok('all date ranges valid');

// ── 4. Foreign key references ─────────────────────────────────────────────────

console.log('\n── Foreign key references ───────────────────────────────');
let brokenFKs = 0;

function checkFK(label, value, lookupSet) {
  if (value && !lookupSet.has(value)) {
    err(`${label}: "${value}" not found`);
    brokenFKs++;
  }
}

for (const r of db.polities) {
  const ctx = `polity "${r.id}"`;
  checkFK(`${ctx} ruling_ethnicity`, r.ruling_ethnicity, sets.ethnicities);
  checkFK(`${ctx} cultural_language`, r.cultural_language, sets.languages);
  checkFK(`${ctx} ideology.religion`, r.ideology?.religion, sets.religions);
  checkFK(`${ctx} ideology.government`, r.ideology?.government, sets.governments);
  for (const t of (r.territories || [])) {
    checkFK(`${ctx} territory "${t}"`, t, sets.territories);
  }
}

if (!brokenFKs) ok('all foreign keys resolve');

// ── 5. Succession integrity ───────────────────────────────────────────────────

console.log('\n── Succession integrity ─────────────────────────────────');
let badSuccessions = 0;

for (const s of db.successions) {
  if (!s.from || !s.to) {
    err(`succession missing "from" or "to": ${JSON.stringify(s)}`);
    badSuccessions++;
    continue;
  }
  if (s.from === s.to) {
    err(`succession self-loop: "${s.from}"`);
    badSuccessions++;
  }
  if (!sets.polities.has(s.from)) {
    err(`succession from "${s.from}": polity not found`);
    badSuccessions++;
  }
  if (!sets.polities.has(s.to)) {
    err(`succession to "${s.to}": polity not found`);
    badSuccessions++;
  }
  if (s.type && !VALID_SUCCESSION_TYPES.has(s.type)) {
    err(`succession "${s.from}" → "${s.to}": unknown type "${s.type}"`);
    badSuccessions++;
  }
}

if (!badSuccessions) ok('all successions valid');

// ── 6. Territory timeline integrity ──────────────────────────────────────────

console.log('\n── Territory timeline integrity ─────────────────────────');

for (const t of db.territories) {
  const periods = [...(t.periods || [])].sort((a, b) => a.start - b.start);

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    const ctx = `territory "${t.id}" period [${p.start}–${p.end ?? '?'}]`;

    // Polity FK
    if (p.polity === undefined) {
      err(`${ctx}: missing "polity" field — use null for explicitly uncontrolled periods`);
    } else if (p.polity !== null && !sets.polities.has(p.polity)) {
      warn(`${ctx}: polity "${p.polity}" not found — may not be added yet`);
    }

    // Dominant ethnicity FK
    if (p.dominant_ethnicity && !sets.ethnicities.has(p.dominant_ethnicity)) {
      err(`${ctx}: unknown dominant_ethnicity "${p.dominant_ethnicity}"`);
    }

    // Ethnic composition FKs
    for (const ec of (p.ethnic_composition || [])) {
      if (ec.ethnicity && !sets.ethnicities.has(ec.ethnicity)) {
        err(`${ctx}: unknown ethnicity in composition "${ec.ethnicity}"`);
      }
    }

  }
}

ok('territory timeline checks complete');

// ── 7. Province integrity ─────────────────────────────────────────────────────

console.log('\n── Province integrity ───────────────────────────────────');
let badProvinces = 0;

for (const province of db.provinces) {
  const id    = province.id;
  const props = province.properties || {};
  const ctx   = `province "${id}"`;

  if (!id) {
    err(`province missing top-level "id" field`);
    badProvinces++;
    continue;
  }
  if (!props.territory) {
    err(`${ctx}: missing "territory" field`);
    badProvinces++;
  } else if (!sets.territories.has(props.territory)) {
    err(`${ctx}: territory "${props.territory}" not found`);
    badProvinces++;
  }

  for (const p of (props.periods || [])) {
    if (p.polity !== null && p.polity !== undefined && !sets.polities.has(p.polity)) {
      warn(`${ctx} period [${p.start}]: polity "${p.polity}" not found — may not be added yet`);
    }
  }
}

if (!badProvinces) ok('all provinces valid');

// ── 8. Duplicate succession edges ────────────────────────────────────────────

console.log('\n── Duplicate succession edges ───────────────────────────');
let dupEdges = 0;
const edgeSeen = new Set();
for (const s of db.successions) {
  const key = `${s.from}→${s.to}`;
  if (edgeSeen.has(key)) {
    err(`duplicate succession edge: ${key}`);
    dupEdges++;
  } else {
    edgeSeen.add(key);
  }
}
if (!dupEdges) ok('no duplicate succession edges');

// ── 9. Succession shared_territories ─────────────────────────────────────────

console.log('\n── Succession shared_territories ────────────────────────');
let badSharedTerr = 0;
for (const s of db.successions) {
  for (const t of (s.shared_territories || [])) {
    if (!sets.territories.has(t)) {
      err(`succession "${s.from}" → "${s.to}": shared_territory "${t}" not found`);
      badSharedTerr++;
    }
  }
}
if (!badSharedTerr) ok('all shared_territories resolve');

// ── 10. History panel polity references ──────────────────────────────────────

console.log('\n── History panel polity references ──────────────────────');
let badPanelRefs = 0;
let panelCount = 0;
let cellCount = 0;

function walkPanels(dir) {
  if (!fs.existsSync(dir)) return [];
  const panels = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      panels.push(...walkPanels(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.json')) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, entry.name), 'utf8'));
        panels.push({ file: path.join(dir, entry.name), data });
      } catch { /* skip malformed */ }
    }
  }
  return panels;
}

const historyDir = path.join(__dirname, '..', 'data', 'history');
const panels = walkPanels(historyDir);
panelCount = panels.length;

for (const { file, data } of panels) {
  const panelId = data.id || path.basename(file, '.json');
  for (const row of (data.rows || [])) {
    for (const cell of (row.cells || [])) {
      const entries = [...(cell.stack || []), ...(cell.split || [])];
      for (const entry of entries) {
        cellCount++;
        if (entry.polity && !sets.polities.has(entry.polity)) {
          warn(`panel "${panelId}": polity ref "${entry.polity}" not found in polity data`);
          badPanelRefs++;
        }
      }
    }
  }
}

if (!badPanelRefs) ok(`${panelCount} panels, ${cellCount} cells — all polity refs valid`);
else ok(`${panelCount} panels scanned, ${badPanelRefs} unresolved polity ref(s)`);

// ── 11. Taxonomy tree integrity ──────────────────────────────────────────────

console.log('\n── Taxonomy tree integrity ──────────────────────────────');
let badTaxonomy = 0;

function checkTree(items, label) {
  const ids = new Set(items.map(n => n.id));
  for (const node of items) {
    if (node.parent && !ids.has(node.parent)) {
      err(`${label} "${node.id}": parent "${node.parent}" not found`);
      badTaxonomy++;
    }
  }
  // Cycle detection via tortoise-and-hare on parent chain
  const byId = new Map(items.map(n => [n.id, n]));
  for (const node of items) {
    const visited = new Set();
    let cur = node;
    while (cur && cur.parent) {
      if (visited.has(cur.id)) {
        err(`${label}: cycle detected involving "${cur.id}"`);
        badTaxonomy++;
        break;
      }
      visited.add(cur.id);
      cur = byId.get(cur.parent);
    }
  }
}

checkTree(db.ethnicities, 'ethnicity');
checkTree(db.languages, 'language');
checkTree(db.religions, 'religion');
if (!badTaxonomy) ok('all taxonomy trees valid');

// ── 12. Government FK validation ────────────────────────────────────────────

console.log('\n── Government FK validation ─────────────────────────────');
let badGov = 0;
const govSet = new Set((db.governments || []).map(g => g.id));

for (const r of db.polities) {
  const gov = r.ideology?.government;
  if (gov && !govSet.has(gov)) {
    err(`polity "${r.id}": government "${gov}" not found in government.csv`);
    badGov++;
  }
}
if (!badGov) ok(`all polity government refs resolve (${govSet.size} government types)`);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n─────────────────────────────────────────────────────────');
console.log(`Polities: ${db.polities.length}  |  Successions: ${db.successions.length}  |  Territories: ${db.territories.length}  |  Provinces: ${db.provinces.length}`);
console.log(`Languages: ${db.languages.length}  |  Religions: ${db.religions.length}  |  Ethnicities: ${db.ethnicities.length}`);
console.log(`Dynasties: ${(db.dynasties||[]).length}  |  Governments: ${(db.governments||[]).length}`);
console.log(`History panels: ${panelCount}  |  Panel cells: ${cellCount}`);
console.log('');

if (errors > 0) {
  console.error(`FAILED: ${errors} error(s), ${warnings} warning(s)\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`PASSED with ${warnings} warning(s)\n`);
} else {
  console.log('PASSED — data is clean\n');
}
