#!/usr/bin/env node
// ============================================================
// Deduplicate panel labels → canonical entities, then write
// `regime` fields back into history JSON files.
//
// Usage: node scripts/dedup_and_link.js [--dry-run]
//
// Outputs:
//   csvs/canonical_entities.csv  — deduplicated entity list
//   data/history/**/*.json       — updated with regime fields
// ============================================================

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const BASE = path.join(__dirname, '..');
const HISTORY_DIR = path.join(BASE, 'data', 'history');
const ENTITIES_OUT = path.join(BASE, 'csvs', 'canonical_entities.csv');

// ─── LOAD EXISTING POLITIES ──────────────────────────────

const regimesCSV = fs.readFileSync(path.join(BASE, 'csvs', 'polity.csv'), 'utf8');
const existingPolities = new Map(); // id → name
for (const line of regimesCSV.split('\n').slice(1)) {
  if (!line.trim()) continue;
  const match = line.match(/^([^,]+),(".*?"|[^,]*)/);
  if (match) {
    existingPolities.set(match[1], match[2].replace(/^"|"$/g, ''));
  }
}

// ─── NORMALIZATION HELPERS ────────────────────────────────

// Strip native script in parens: (清), (唐), (한국), (Кирилл)
function stripNativeScript(label) {
  return label
    .replace(/\s*\([^)]*[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0400-\u04ff][^)]*\)/g, '')
    .trim();
}

// Strip ALL parenthetical qualifiers — handles unclosed parens too
function stripAllParens(label) {
  return label
    .replace(/\s*\([^)]*\)?/g, '')
    .trim();
}

// Strip trailing state descriptors
const TRAILING_DESCRIPTORS = /\b(forming|declining|continued|continuing|briefly|restored|expanding|consolidating|fragmentation|fragmenting|remnants?|resists?\s+\w+|semi[- ]independent|de facto|nominal|puppet|vassal|tributary)$/i;

function stripTrailingDescriptors(label) {
  let result = label;
  // Iteratively strip trailing descriptors
  for (let i = 0; i < 3; i++) {
    const prev = result;
    result = result.replace(TRAILING_DESCRIPTORS, '').replace(/[\s,·—]+$/, '').trim();
    if (result === prev) break;
  }
  return result || label; // don't return empty
}

// Extract core entity from a label
function extractCore(label) {
  // Step 1: Strip native script
  let core = stripNativeScript(label);

  // Step 2: Take only the part before em-dash (polity part)
  const dashIdx = core.indexOf('—');
  if (dashIdx > 0) {
    core = core.substring(0, dashIdx).trim();
  }

  // Step 3: Remove arrow transitions — take first part
  const arrowIdx = core.indexOf('→');
  if (arrowIdx > 0) {
    core = core.substring(0, arrowIdx).trim();
  }

  // Step 4: Strip parenthetical qualifiers
  core = stripAllParens(core);

  // Step 5: Strip trailing descriptors
  core = stripTrailingDescriptors(core);

  // Step 6: Strip middle-dot lists to first item if the items aren't part of name
  if (core.includes('·')) {
    const parts = core.split('·').map(s => s.trim());
    if (parts[0].split(/\s+/).length >= 2) {
      core = parts[0];
    }
  }

  // Step 7: Split on " / " — take first part for combined labels
  // e.g., "Ghaznavid / Ghurid" → "Ghaznavid"
  if (core.includes(' / ')) {
    core = core.split(' / ')[0].trim();
  }

  return core.trim();
}

// ─── EXPLICIT SYNONYM MAP ────────────────────────────────
// From gold-standard curation (docs/merge_map.md).
// Maps normalized snake_case → canonical entity ID.
const SYNONYM_MAP = new Map([
  // ── Iran gold-standard curation ──
  ['hotaki_afghan', 'hotaki_dynasty'],
  ['hotaki', 'hotaki_dynasty'],
  ['ildeguzids', 'eldiguzid_dynasty'],
  ['eldiguzids', 'eldiguzid_dynasty'],
  ['inju', 'injuid_dynasty'],
  ['injuid', 'injuid_dynasty'],
  ['khalji', 'khalji_dynasty'],
  ['il_khanate', 'ilkhanate'],

  // ── Roman Empire merge ──
  ['roman_empire_pagan', 'roman_empire'],
  ['roman_empire_christian', 'roman_empire'],

  // ── Suffix variants (dynasty/empire/sultanate for same entity) ──
  ['samanid_dynasty', 'samanid_empire'],
  ['samanid', 'samanid_empire'],
  ['ghaznavid_dynasty', 'ghaznavid_empire'],
  ['ghaznavid', 'ghaznavid_empire'],
  ['safavid_dynasty', 'safavid_empire'],
  ['safavid', 'safavid_empire'],
  ['median_empire', 'median_kingdom'],
  ['mitanni_kingdom', 'mitanni_empire'],
  ['almohad_dynasty', 'almohad_caliphate'],
  ['ayyubid_dynasty', 'ayyubid_sultanate'],
  ['ghurid_sultanate', 'ghorid_dynasty'],
  ['ghurid', 'ghorid_dynasty'],
  ['ghorid', 'ghorid_dynasty'],

  // ── Bare name → full DB ID ──
  ['sassanid', 'sassanid_empire'],
  ['ottoman', 'ottoman_empire'],
  ['mughal', 'mughal_empire'],
  ['mughal_empire_india', 'mughal_empire'],
  ['qing', 'qing_dynasty'],
  ['ming', 'ming_dynasty'],
  ['tang', 'tang_dynasty'],
  ['sui', 'sui_dynasty'],
  ['carolingian', 'carolingian_empire'],
  ['frankish_kingdom', 'carolingian_empire'],
  ['first_turkic_empire', 'first_turkic_khaganate'],

  // ── Short form → full DB ID ──
  ['habsburg', 'habsburg_monarchy'],
  ['habsburg_empire', 'habsburg_monarchy'],
  ['alexander_the_great', 'macedonian_empire'],
  ['alexander', 'macedonian_empire'],
  ['prc', 'peoples_republic_of_china'],

  // ── Cross-panel spelling variants ──
  ['venice_republic', 'republic_of_venice'],
  ['venice', 'republic_of_venice'],
]);

// ─── BUG FIX MAP ─────────────────────────────────────────
// Known incorrect regime links found during curation.
// key = label text, value = { wrong, correct }
const BUG_FIXES = new Map([
  ['Dabuyid Dynasty', { wrong: 'buyid_dynasty', correct: 'dabuyid_dynasty' }],
]);

// Convert to snake_case ID
function toSnakeId(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[()（）【】「」\[\]{}<>]/g, '')
    .replace(/[—–·:;,!?'"".]/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
}

// ─── EXISTING POLITY MATCHING ─────────────────────────────

// Build multiple lookup indexes for existing polities
const existingById = new Map([...existingPolities.entries()]);
const existingByNorm = new Map();
const existingByShort = new Map(); // without type suffix

for (const [id, name] of existingPolities) {
  existingByNorm.set(toSnakeId(name), id);
  existingByNorm.set(id, id);

  // Strip common suffixes for fuzzy matching
  for (const suffix of ['_dynasty', '_empire', '_kingdom', '_sultanate', '_khanate',
    '_khaganate', '_caliphate', '_republic', '_period', '_state']) {
    if (id.endsWith(suffix)) {
      existingByShort.set(id.slice(0, -suffix.length), id);
    }
  }
}

function matchExistingPolity(coreName) {
  const norm = toSnakeId(coreName);
  // Check explicit synonym map first
  if (SYNONYM_MAP.has(norm)) return SYNONYM_MAP.get(norm);
  // Direct match
  if (existingByNorm.has(norm)) return existingByNorm.get(norm);
  // Try adding common suffixes
  for (const suffix of ['_dynasty', '_empire', '_kingdom', '_sultanate', '_khanate',
    '_khaganate', '_caliphate', '_republic', '_period']) {
    if (existingByNorm.has(norm + suffix)) return existingByNorm.get(norm + suffix);
  }
  // Try matching short form
  if (existingByShort.has(norm)) return existingByShort.get(norm);
  return null;
}

// ─── CATEGORIZATION ───────────────────────────────────────

const CULTURE_PAT = /\b(culture|civilization|neolithic|paleolithic|mesolithic|chalcolithic|bronze age|iron age|megalithic|archaeological|jomon|yayoi|kofun|gusuku|yangshao|longshan|hemudu|liangzhu|hallstatt|la tene|oldowan|acheulean|mousterian|aurignacian|magdalenian|gravettian|pre-pottery|corded ware|bell beaker|cucuteni|vinca|starcevo)/i;

const PEOPLE_PAT = /\b(people[s]?|tribe[s]?|tribal|chiefs|nomad[s]?|pastoral|pastoralist|indigenous|aboriginal|adivasi|settling|settlers|settlement|neanderthal|homo sapiens|early.*farmers|huns?|hunnic|hephthalite|kidarite|alchon|xionite|alans?|avars?|goths?|gothic|vandals?|lombard|suevi|suebi|cumans?|kipchak|pecheneg|rouran|emishi|ezo|ainu|hayato|kumaso|ryukyuan|scythian|sarmatian|cimmerian|xiongnu|tocharian|illyrian|thracian|dacian|phrygian|gauls?|celts?|celtic|germanic|slavic|turkic|berbers?|bedouin)/i;

const EVENT_PAT = /\b(migration[s]?|collapse|invasion|conquest|war[s]?|battle|siege|revolt|rebellion|dark ages?|interregnum|anarchy|chaos|fragmentation|disunity|depopulation|famine|plague|unification|reunification|christianization|islamization|conversion|arabization|occupation|partition|annexation|independence|raids?|expansion|crusade|age of|begins?|ends?|returned|fall of|rise of|golden age|member|joins|accession|treaty|peace|revolution|uprising|insurgency|civil war|restored|restores|reform[s]?|modernization|outside.*control|under.*control|vespers|crisis|decline|declining|forming|abolished|annexed|merged|incorporated|influence|periphery|frontier|fringe|briefly|resistance|resists|awakening|disputed|nominal|protectorate of|divided between|suzerainty|sovereignty|guaranteed|neutrality|controversies|exile|diaspora|fully|period|era\b)/i;

const DYNASTY_PAT = /\b(dynasty|house of|clan|regency|governors?|vassal|tributary)\b/i;
const DYNASTY_NUMBER_PAT = /^\d+(st|nd|rd|th)\s+(dynasty|kingdom)/i;

function categorize(label) {
  if (/^\?+$/.test(label.trim())) return 'event';
  if (/→/.test(label)) return 'event';
  if (/^~?\d+\s/.test(label)) return 'event'; // "~300 sovereign territories"
  if (CULTURE_PAT.test(label)) return 'culture';
  if (PEOPLE_PAT.test(label)) return 'people';
  if (EVENT_PAT.test(label)) return 'event';
  if (DYNASTY_PAT.test(label)) return 'regime';
  if (DYNASTY_NUMBER_PAT.test(label)) return 'regime';
  return 'polity'; // default for things with entity names
}

// ─── PROCESS ALL PANELS ───────────────────────────────────

function findPanelFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findPanelFiles(full));
    else if (entry.name.endsWith('.json')) results.push(full);
  }
  return results;
}

// Canonical entity registry
// key = entity_id, value = { id, name, type, panels, labels }
const canonicalEntities = new Map();

function registerEntity(entityId, name, type, panelId, originalLabel) {
  if (!canonicalEntities.has(entityId)) {
    canonicalEntities.set(entityId, {
      id: entityId,
      name: name,
      type: type,
      panels: new Set(),
      labels: new Set(),
    });
  }
  const e = canonicalEntities.get(entityId);
  e.panels.add(panelId);
  e.labels.add(originalLabel);
  return entityId;
}

// Resolve a label to a canonical entity ID
function resolveLabel(label, existingRegimeField, panelId) {
  // Apply bug fixes to incorrect existing links
  const fix = BUG_FIXES.get(label);
  if (fix && existingRegimeField === fix.wrong) {
    registerEntity(fix.correct, label, 'existing_polity', panelId, label);
    return { id: fix.correct, fixed: true };
  }

  // Normalize existing regime links via synonym map
  if (existingRegimeField && SYNONYM_MAP.has(existingRegimeField)) {
    const canonical = SYNONYM_MAP.get(existingRegimeField);
    registerEntity(canonical, label, 'existing_polity', panelId, label);
    return { id: canonical, fixed: true };
  }

  // If cell already has a regime link, keep it
  if (existingRegimeField) {
    registerEntity(existingRegimeField, label, 'existing_polity', panelId, label);
    return existingRegimeField;
  }

  const core = extractCore(label);
  if (!core || core === '?') return null;

  // Try matching to existing polity
  const existingMatch = matchExistingPolity(core);
  if (existingMatch) {
    registerEntity(existingMatch, core, 'existing_polity', panelId, label);
    return existingMatch;
  }

  // Categorize
  const cat = categorize(label);
  if (cat === 'event') {
    // Events don't get entity IDs
    return null;
  }

  // Generate ID from core
  let entityId = toSnakeId(core);
  if (!entityId) return null;

  // Culture suffix
  if (cat === 'culture' && !entityId.endsWith('_culture')) {
    entityId += '_culture';
  }

  registerEntity(entityId, core, cat, panelId, label);
  return entityId;
}

// ─── WALK PANELS AND UPDATE ───────────────────────────────

const panelFiles = findPanelFiles(HISTORY_DIR);
let totalCells = 0;
let alreadyLinked = 0;
let newlyLinked = 0;
let bugFixed = 0;
let unresolved = 0;
let filesModified = 0;

for (const filePath of panelFiles) {
  const panel = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const panelId = panel.id;
  let modified = false;

  for (const row of panel.rows) {
    for (const cell of (row.cells || [])) {
      const items = cell.stack || cell.split || [cell];
      for (const item of items) {
        if (!item.label) continue;
        totalCells++;

        const result = resolveLabel(item.label, item.regime, panelId);

        // Handle bug fix return { id, fixed: true }
        if (result && typeof result === 'object' && result.fixed) {
          item.regime = result.id;
          bugFixed++;
          modified = true;
        } else if (item.regime) {
          alreadyLinked++;
        } else if (result) {
          item.regime = result;
          newlyLinked++;
          modified = true;
        } else {
          unresolved++;
        }
      }
    }
  }

  if (modified && !DRY_RUN) {
    fs.writeFileSync(filePath, JSON.stringify(panel, null, 2) + '\n');
    filesModified++;
  } else if (modified) {
    filesModified++;
  }
}

// ─── WRITE CANONICAL ENTITIES CSV ─────────────────────────

function escapeCSV(val) {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

{
  const headers = ['entity_id', 'entity_type', 'canonical_name', 'panel_count', 'panels', 'source_labels'];
  const lines = [headers.join(',')];
  const sorted = [...canonicalEntities.values()].sort((a, b) => b.panels.size - a.panels.size);
  for (const e of sorted) {
    lines.push([
      escapeCSV(e.id),
      escapeCSV(e.type),
      escapeCSV(e.name),
      e.panels.size,
      escapeCSV([...e.panels].join('|')),
      escapeCSV([...e.labels].join(' | ')),
    ].join(','));
  }
  fs.writeFileSync(ENTITIES_OUT, lines.join('\n') + '\n');
}

// ─── SUMMARY ──────────────────────────────────────────────

const typeCounts = {};
for (const e of canonicalEntities.values()) {
  typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
}

console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Processed ${totalCells} cells across ${panelFiles.length} panels\n`);
console.log('Cell linking:');
console.log(`  Already linked:   ${alreadyLinked}`);
console.log(`  Newly linked:     ${newlyLinked}`);
console.log(`  Bug fixes:        ${bugFixed}`);
console.log(`  Unresolved:       ${unresolved} (events, ?, ambiguous)`);
console.log(`  Files modified:   ${filesModified}`);
console.log(`\nCanonical entities: ${canonicalEntities.size}`);
for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type.padEnd(20)} ${count}`);
}

// Show dedup effect
const multiLabel = [...canonicalEntities.values()].filter(e => e.labels.size > 1);
console.log(`\nEntities with multiple source labels (deduplication): ${multiLabel.length}`);
for (const e of multiLabel.sort((a, b) => b.labels.size - a.labels.size).slice(0, 15)) {
  console.log(`  ${e.id} (${e.labels.size} variants):`);
  for (const l of [...e.labels].slice(0, 4)) {
    console.log(`    - ${l}`);
  }
  if (e.labels.size > 4) console.log(`    ... +${e.labels.size - 4} more`);
}

console.log(`\nOutput: ${ENTITIES_OUT}`);
