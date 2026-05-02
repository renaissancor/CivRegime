/**
 * One-time migration script.
 * Splits polities.json → data/polity/*.json
 * Splits successions.json → data/successions/*.json
 */

const fs   = require('fs');
const path = require('path');
const db   = require('../data');

function write(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`  wrote ${path.basename(filePath)}  (${data.length} entries)`);
}

// ── Polity groupings ──────────────────────────────────────────────────────────

const REGIME_GROUPS = {
  'ancient_near_east': [
    'sumerian_city_states', 'akkadian_empire', 'ur_iii', 'old_babylonian',
    'neo_assyrian_empire', 'neo_babylonian',
    'phoenician_states', 'kingdom_of_israel', 'kingdom_of_judah',
  ],
  'egypt': [
    'old_kingdom_egypt', 'new_kingdom_egypt', 'ptolemaic_egypt',
  ],
  'persia_iran': [
    'median_kingdom', 'achaemenid_empire', 'parthian_empire', 'sassanid_empire',
    'ilkhanate', 'timurid_empire', 'safavid_empire',
  ],
  'islam_caliphates': [
    'rashidun_caliphate', 'umayyad_caliphate', 'abbasid_caliphate',
    'fatimid_caliphate', 'ayyubid_sultanate', 'mamluk_sultanate',
  ],
  'steppe_nomadic': [
    'xiongnu', 'goktürk_khaganate', 'uyghur_khaganate', 'khazar_khaganate',
    'mongol_empire', 'golden_horde', 'chagatai_khanate',
  ],
  'turkic_empires': [
    'seljuk_empire', 'seljuk_rum', 'ottoman_empire',
    'ghaznavid_empire',
  ],
  'mediterranean_europe': [
    'macedonian_empire', 'seleucid_empire', 'roman_empire', 'byzantine_empire',
  ],
  'south_asia': [
    'maurya_empire', 'gupta_empire', 'delhi_sultanate', 'mughal_empire',
  ],
  'east_asia': [
    'shang_dynasty', 'zhou_dynasty', 'qin_dynasty', 'han_dynasty',
    'sui_dynasty', 'tang_dynasty', 'liao_dynasty', 'song_dynasty',
    'jin_dynasty_jurchen', 'yuan_dynasty', 'ming_dynasty', 'qing_dynasty',
  ],
};

// ── Succession groupings ──────────────────────────────────────────────────────

const SUCCESSION_GROUPS = {
  'near_east_egypt':      ['ancient_near_east', 'egypt'],
  'persia_islam_turkic':  ['persia_iran', 'islam_caliphates', 'turkic_empires'],
  'steppe_mongol':        ['steppe_nomadic'],
  'europe':               ['mediterranean_europe'],
  'south_asia':           ['south_asia'],
  'east_asia':            ['east_asia'],
};

// ── Split polities ─────────────────────────────────────────────────────────────

console.log('\nSplitting polities.json →');

const polityIndex = new Map(db.polities.map(r => [r.id, r]));
const assigned = new Set();

const REGIMES_DIR = path.join(__dirname, '../data/polity');

for (const [group, ids] of Object.entries(REGIME_GROUPS)) {
  const polities = ids
    .map(id => {
      const r = polityIndex.get(id);
      if (!r) console.warn(`  ⚠  unknown polity id: ${id}`);
      return r;
    })
    .filter(Boolean);

  polities.forEach(r => assigned.add(r.id));
  write(path.join(REGIMES_DIR, `${group}.json`), polities);
}

// Catch any polities not assigned to a group
const unassigned = db.polities.filter(r => !assigned.has(r.id));
if (unassigned.length > 0) {
  console.warn(`\n  ⚠  ${unassigned.length} unassigned polities → data/polity/_unassigned.json`);
  write(path.join(REGIMES_DIR, '_unassigned.json'), unassigned);
} else {
  console.log('  ✓ all polities assigned');
}

// ── Split successions ─────────────────────────────────────────────────────────

console.log('\nSplitting successions.json →');

const SUCCESSIONS_DIR = path.join(__dirname, '../data/successions');

// Build polity → group lookup
const polityToGroup = {};
for (const [group, ids] of Object.entries(REGIME_GROUPS)) {
  ids.forEach(id => { polityToGroup[id] = group; });
}

// Build group → succession-file lookup (reverse of SUCCESSION_GROUPS)
const groupToFile = {};
for (const [file, groups] of Object.entries(SUCCESSION_GROUPS)) {
  groups.forEach(g => { groupToFile[g] = file; });
}

const successionBuckets = {};
const crossRegion = [];

for (const s of db.successions) {
  const fromGroup = polityToGroup[s.from];
  const toGroup   = polityToGroup[s.to];
  const fromFile  = groupToFile[fromGroup];
  const toFile    = groupToFile[toGroup];

  if (fromFile && fromFile === toFile) {
    if (!successionBuckets[fromFile]) successionBuckets[fromFile] = [];
    successionBuckets[fromFile].push(s);
  } else {
    // Cross-region succession (e.g. Mongol Empire → Ilkhanate which spans groups)
    crossRegion.push(s);
  }
}

for (const [file, successions] of Object.entries(successionBuckets)) {
  write(path.join(SUCCESSIONS_DIR, `${file}.json`), successions);
}

if (crossRegion.length > 0) {
  write(path.join(SUCCESSIONS_DIR, 'cross_region.json'), crossRegion);
}

console.log('\nDone. Old flat files (polities.json, successions.json) are still present.');
console.log('Review the output, then delete them and update data/index.js.\n');
