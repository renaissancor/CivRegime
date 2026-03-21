/**
 * CivRegime data validator.
 * Run: node scripts/validate.js
 *
 * Checks:
 *   1. No duplicate IDs within any entity type
 *   2. All foreign key references resolve
 *   3. Required fields present on every regime
 *   4. Date validity (start < end where both exist)
 *   5. Succession integrity (both ends exist, no self-loops)
 *   6. Succession type is a known value
 *   7. Region integrity (territory FK resolves, period regime FKs resolve)
 */

const db = require('../data');

const VALID_SUCCESSION_TYPES = new Set(['A', 'A-', 'B', 'C', 'D']);

let errors   = 0;
let warnings = 0;

function err(msg)  { console.error(`  ✗  ${msg}`); errors++; }
function warn(msg) { console.warn( `  ⚠  ${msg}`); warnings++; }
function ok(msg)   { console.log(  `  ✓  ${msg}`); }

// ── Build lookup sets ─────────────────────────────────────────────────────────

const sets = {
  regimes:     new Set(db.regimes.map(r => r.id)),
  territories: new Set(db.territory.map(t => t.id)),
  languages:   new Set(db.languages.map(l => l.id)),
  religions:   new Set(db.religions.map(r => r.id)),
  ideologies:  new Set(db.ideologies.map(i => i.id)),
  ethnicities: new Set(db.ethnicities.map(e => e.id)),
  regions:     new Set(db.regions.map(r => r.id)),
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
checkDuplicates(db.regimes,     'regimes');
checkDuplicates(db.territory,   'territory');
checkDuplicates(db.regions,     'regions');
checkDuplicates(db.languages,   'languages');
checkDuplicates(db.religions,   'religions');
checkDuplicates(db.ideologies,  'ideologies');
checkDuplicates(db.ethnicities, 'ethnicities');
if (!errors) ok('no duplicates');

// ── 2. Required fields on regimes ─────────────────────────────────────────────

console.log('\n── Required regime fields ───────────────────────────────');
const REQUIRED = ['id', 'name', 'ruling_ethnicity', 'start'];
let missingFields = 0;

for (const r of db.regimes) {
  for (const f of REQUIRED) {
    if (r[f] == null || r[f] === '') {
      err(`regime "${r.id || '?'}": missing required field "${f}"`);
      missingFields++;
    }
  }
  if (!r.ideology?.religion)   warn(`regime "${r.id}": missing ideology.religion`);
  if (!r.ideology?.government) warn(`regime "${r.id}": missing ideology.government`);
}
if (!missingFields) ok('all required fields present');

// ── 3. Date validity ──────────────────────────────────────────────────────────

console.log('\n── Date validity ────────────────────────────────────────');
let badDates = 0;
for (const r of db.regimes) {
  if (r.start != null && r.end != null && r.start >= r.end) {
    err(`regime "${r.id}": start (${r.start}) >= end (${r.end})`);
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

for (const r of db.regimes) {
  const ctx = `regime "${r.id}"`;
  checkFK(`${ctx} ruling_ethnicity`, r.ruling_ethnicity, sets.ethnicities);
  checkFK(`${ctx} cultural_language`, r.cultural_language, sets.languages);
  checkFK(`${ctx} ideology.religion`, r.ideology?.religion, sets.religions);
  checkFK(`${ctx} ideology.government`, r.ideology?.government, sets.ideologies);
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
  if (!sets.regimes.has(s.from)) {
    err(`succession from "${s.from}": regime not found`);
    badSuccessions++;
  }
  if (!sets.regimes.has(s.to)) {
    err(`succession to "${s.to}": regime not found`);
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

for (const t of db.territory) {
  const periods = [...(t.periods || [])].sort((a, b) => a.start - b.start);

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    const ctx = `territory "${t.id}" period [${p.start}–${p.end ?? '?'}]`;

    // Regime FK
    if (p.regime === undefined) {
      err(`${ctx}: missing "regime" field — use null for explicitly uncontrolled periods`);
    } else if (p.regime !== null && !sets.regimes.has(p.regime)) {
      warn(`${ctx}: regime "${p.regime}" not found — may not be added yet`);
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

// ── 7. Region integrity ───────────────────────────────────────────────────────

console.log('\n── Region integrity ─────────────────────────────────────');
let badRegions = 0;

for (const region of db.regions) {
  const id    = region.id;
  const props = region.properties || {};
  const ctx   = `region "${id}"`;

  if (!id) {
    err(`region missing top-level "id" field`);
    badRegions++;
    continue;
  }
  if (!props.territory) {
    err(`${ctx}: missing "territory" field`);
    badRegions++;
  } else if (!sets.territories.has(props.territory)) {
    err(`${ctx}: territory "${props.territory}" not found`);
    badRegions++;
  }

  for (const p of (props.periods || [])) {
    if (p.regime !== null && p.regime !== undefined && !sets.regimes.has(p.regime)) {
      warn(`${ctx} period [${p.start}]: regime "${p.regime}" not found — may not be added yet`);
    }
  }
}

if (!badRegions) ok('all regions valid');

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n─────────────────────────────────────────────────────────');
console.log(`Regimes: ${db.regimes.length}  |  Successions: ${db.successions.length}  |  Territories: ${db.territory.length}  |  Regions: ${db.regions.length}`);
console.log(`Languages: ${db.languages.length}  |  Religions: ${db.religions.length}  |  Ethnicities: ${db.ethnicities.length}`);
console.log('');

if (errors > 0) {
  console.error(`FAILED: ${errors} error(s), ${warnings} warning(s)\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`PASSED with ${warnings} warning(s)\n`);
} else {
  console.log('PASSED — data is clean\n');
}
