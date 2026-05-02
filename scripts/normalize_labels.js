#!/usr/bin/env node
// ============================================================
// Normalize panel labels into entity IDs following naming.md
// Input:  csvs/derived/panel_labels.csv
// Output: csvs/derived/panel_entities.csv         (deduplicated entity list)
//         csvs/derived/panel_labels_linked.csv    (labels → entity IDs)
// Usage:  node scripts/normalize_labels.js
// ============================================================

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const LABELS_FILE = path.join(BASE, 'csvs', 'derived', 'panel_labels.csv');
const ENTITIES_OUT = path.join(BASE, 'csvs', 'derived', 'panel_entities.csv');
const LINKED_OUT = path.join(BASE, 'csvs', 'derived', 'panel_labels_linked.csv');

// Load existing polity IDs
const polityCSV = fs.readFileSync(path.join(BASE, 'csvs', 'polity.csv'), 'utf8');
const existingPolities = new Map();
for (const line of polityCSV.split('\n').slice(1)) {
  if (!line.trim()) continue;
  const match = line.match(/^([^,]+),(".*?"|[^,]*)/);
  if (match) {
    existingPolities.set(match[1], match[2].replace(/^"|"$/g, ''));
  }
}

// Synonym map: bare names / removed IDs → canonical polity IDs.
// Mirrors dedup_and_link.js so both passes resolve the same way.
const SYNONYM_MAP = new Map([
  ['roman_empire_pagan', 'roman_empire'],
  ['roman_empire_christian', 'roman_empire'],
  ['il_khanate', 'ilkhanate'],
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
  ['habsburg', 'habsburg_monarchy'],
  ['habsburg_empire', 'habsburg_monarchy'],
  ['alexander_the_great', 'macedonian_empire'],
  ['alexander', 'macedonian_empire'],
  ['prc', 'peoples_republic_of_china'],
  ['venice_republic', 'republic_of_venice'],
  ['venice', 'republic_of_venice'],
]);

function canonicalize(id) {
  return SYNONYM_MAP.get(id) || id;
}

// ─── PARSE CSV ────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCSVLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = vals[j] || '';
    }
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

// ─── NORMALIZATION ─────────────────────────────────────────

// Strip native script in parentheses: (清), (唐), (중국), etc.
function stripNativeScript(label) {
  return label.replace(/\s*\([^)]*[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0400-\u04ff][^)]*\)/g, '').trim();
}

// Split "Polity — Dynasty" labels
function splitDashLabel(label) {
  const parts = label.split(/\s*—\s*/);
  if (parts.length >= 2) {
    return { polity: parts[0].trim(), qualifier: parts.slice(1).join(' — ').trim() };
  }
  return { polity: label, qualifier: null };
}

// Strip parenthetical context notes: "(Clovis I)", "(declining)", "(from 1335)"
function stripParens(label) {
  return label.replace(/\s*\([^)]*\)/g, '').trim();
}

// Convert to snake_case ID
function toSnakeId(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // strip diacritics
    .replace(/[()（）【】「」\[\]{}<>]/g, '')
    .replace(/[—–·:;,!?'"''"".]/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
}

// Check if a qualifier looks like a dynasty/polity name
function isDynastyQualifier(q) {
  if (!q) return false;
  return /\b(dynasty|house|clan|regency|period)\b/i.test(q)
    || /\b(merovingian|carolingian|capetian|valois|bourbon|habsburg|hohenzollern)\b/i.test(q)
    || /\b(umayyad|abbasid|fatimid|ayyubid|seljuk|safavid|qajar)\b/i.test(q)
    || /\b(julio.claudian|flavian|severan|nerva.antonine|constantinian)\b/i.test(q)
    || /\b(early|middle|late|golden|classical|high)\b/i.test(q);
}

// ─── ENTITY RESOLUTION ────────────────────────────────────

const labels = parseCSV(fs.readFileSync(LABELS_FILE, 'utf8'));

// Canonical entity map: normalized_key → entity record
const entities = new Map();
const labelLinks = []; // each label row → entity_id, entity_type

// Build reverse lookup for existing polity names
const existingByNorm = new Map();
for (const [id, name] of existingPolities) {
  existingByNorm.set(toSnakeId(name), id);
  existingByNorm.set(id, id);  // also match by ID directly
}

function resolveExistingPolity(label) {
  // Direct polity field link
  const normLabel = toSnakeId(stripParens(stripNativeScript(label)));

  // Try synonym map first
  if (SYNONYM_MAP.has(normLabel)) {
    const canon = SYNONYM_MAP.get(normLabel);
    if (existingPolities.has(canon)) return canon;
  }
  if (existingByNorm.has(normLabel)) return existingByNorm.get(normLabel);

  // Try without common suffixes
  for (const suffix of ['_dynasty', '_empire', '_kingdom', '_sultanate', '_khanate', '_caliphate', '_republic']) {
    if (existingByNorm.has(normLabel + suffix)) return existingByNorm.get(normLabel + suffix);
    if (normLabel.endsWith(suffix) && existingByNorm.has(normLabel.slice(0, -suffix.length))) {
      return existingByNorm.get(normLabel.slice(0, -suffix.length));
    }
  }

  return null;
}

function getOrCreateEntity(label, category, panel_id, existingPolityLink) {
  const clean = stripNativeScript(label);
  const { polity: polityPart, qualifier } = splitDashLabel(clean);
  const polityClean = stripParens(polityPart);
  const normKey = toSnakeId(polityClean);

  // Skip empty
  if (!normKey) return { entity_id: '', entity_type: 'skip' };

  // Canonicalize an explicit existing_polity_link from the source CSV
  // (may carry deprecated IDs like roman_empire_pagan/_christian).
  let resolvedExistingLink = '';
  if (existingPolityLink) {
    const canon = canonicalize(existingPolityLink);
    if (existingPolities.has(canon)) resolvedExistingLink = canon;
  }

  // If already linked to existing polity (via label match)
  const existingId = resolvedExistingLink || resolveExistingPolity(polityClean);

  // Determine entity type from category + qualifier
  let entityType = category;
  let entityId;
  let entityName = polityClean;
  let dynastyName = null;

  if (existingId) {
    entityId = existingId;
    entityType = 'existing_polity';
  } else if (category === 'linked') {
    // Speculative link that no longer resolves to a polity row.
    // Leave entity_id blank so it doesn't masquerade as resolved.
    return { entity_id: '', entity_type: 'unresolved_link' };
  } else if (category === 'polity' || isDynastyQualifier(qualifier)) {
    // This is a dynasty/polity within a polity
    entityType = 'polity';
    dynastyName = qualifier || polityClean;
    const polityId = existingId || toSnakeId(polityClean);
    const dynastySlug = toSnakeId(stripParens(dynastyName));
    entityId = polityId !== dynastySlug ? `${polityId}__${dynastySlug}` : dynastySlug;
    entityName = label;
  } else if (category === 'polity') {
    entityId = normKey;
    entityType = 'polity';
    entityName = polityClean;
  } else if (category === 'culture') {
    entityId = normKey.endsWith('_culture') ? normKey : normKey + '_culture';
    entityType = 'culture';
  } else if (category === 'people') {
    entityId = normKey;
    entityType = 'people';
  } else if (category === 'event') {
    entityId = normKey;
    entityType = 'event';
  } else {
    entityId = normKey;
    entityType = 'unclassified';
  }

  // Register in entity map (dedup)
  if (!entities.has(entityId)) {
    entities.set(entityId, {
      entity_id: entityId,
      entity_type: entityType,
      canonical_name: entityName,
      dynasty: dynastyName || '',
      source_labels: [label],
      panel_count: 1,
      panels: new Set([panel_id]),
    });
  } else {
    const e = entities.get(entityId);
    if (!e.source_labels.includes(label)) e.source_labels.push(label);
    e.panel_count++;
    e.panels.add(panel_id);
  }

  return { entity_id: entityId, entity_type: entityType };
}

// ─── PROCESS ALL LABELS ───────────────────────────────────

for (const row of labels) {
  const { entity_id, entity_type } = getOrCreateEntity(
    row.label, row.category, row.panel_id, row.existing_polity_link
  );
  labelLinks.push({
    ...row,
    entity_id,
    entity_type,
  });
}

// ─── WRITE OUTPUTS ────────────────────────────────────────

function escapeCSV(val) {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Panel entities (deduplicated)
{
  const headers = ['entity_id', 'entity_type', 'canonical_name', 'dynasty', 'panel_count', 'panels', 'source_labels'];
  const lines = [headers.join(',')];
  for (const e of entities.values()) {
    lines.push([
      escapeCSV(e.entity_id),
      escapeCSV(e.entity_type),
      escapeCSV(e.canonical_name),
      escapeCSV(e.dynasty),
      e.panel_count,
      escapeCSV([...e.panels].join('|')),
      escapeCSV(e.source_labels.join(' | ')),
    ].join(','));
  }
  fs.writeFileSync(ENTITIES_OUT, lines.join('\n') + '\n');
}

// Labels with entity links
{
  const headers = [
    'panel_id', 'column_id', 'row_index', 'stack_index', 'era',
    'label', 'note', 'span', 'existing_polity_link', 'category',
    'entity_id', 'entity_type'
  ];
  const lines = [headers.join(',')];
  for (const row of labelLinks) {
    lines.push(headers.map(h => escapeCSV(row[h])).join(','));
  }
  fs.writeFileSync(LINKED_OUT, lines.join('\n') + '\n');
}

// ─── SUMMARY ──────────────────────────────────────────────

const typeCounts = {};
for (const e of entities.values()) {
  typeCounts[e.entity_type] = (typeCounts[e.entity_type] || 0) + 1;
}

console.log(`\nProcessed ${labels.length} labels → ${entities.size} unique entities\n`);
console.log('Entity types:');
for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type.padEnd(20)} ${count}`);
}

// Check for ID collisions (different canonical names, same ID)
const collisions = [];
for (const e of entities.values()) {
  if (e.source_labels.length > 1) {
    const norms = new Set(e.source_labels.map(l => toSnakeId(stripNativeScript(l))));
    if (norms.size > 1) collisions.push(e);
  }
}

if (collisions.length > 0) {
  console.log(`\n⚠ ID collisions (${collisions.length} — same ID, different source labels):`);
  for (const e of collisions.slice(0, 20)) {
    console.log(`  ${e.entity_id}: ${e.source_labels.join(' | ')}`);
  }
  if (collisions.length > 20) console.log(`  ... and ${collisions.length - 20} more`);
}

// Cross-panel entities
const crossPanel = [...entities.values()]
  .filter(e => e.panels.size > 1)
  .sort((a, b) => b.panels.size - a.panels.size);
console.log(`\nCross-panel entities: ${crossPanel.length}`);
for (const e of crossPanel.slice(0, 15)) {
  console.log(`  ${e.panels.size} panels  ${e.entity_id} [${e.entity_type}]`);
}

console.log(`\nOutput:`);
console.log(`  ${ENTITIES_OUT}`);
console.log(`  ${LINKED_OUT}`);
