#!/usr/bin/env node
// ============================================================
// Generate polity.csv stub rows for unresolved canonical entities
// (P3.10). Reads csvs/derived/canonical_entities.csv (filter to unresolved_polity
// + polity), walks panel JSONs to gather occurrence context, parses
// dates from notes, infers government from ID suffixes, and maps
// panel directories to territory FKs.
//
// Usage:   node scripts/generate_stubs.js
// Output:  csvs/derived/polity_stubs.csv  (review-only; DO NOT merge blindly)
// ============================================================

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const HISTORY_DIR = path.join(BASE, 'data', 'history');
const ENTITIES_IN  = path.join(BASE, 'csvs', 'derived', 'canonical_entities.csv');
const POLITY_IN    = path.join(BASE, 'csvs', 'polity.csv');
const TERRITORY_IN = path.join(BASE, 'csvs', 'territory.csv');
const STUBS_OUT    = path.join(BASE, 'csvs', 'derived', 'polity_stubs.csv');

// ─── CSV PARSING ──────────────────────────────────────────

// Minimal RFC4180-ish parser (handles quoted fields, double-quote escapes).
function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

function escapeCSV(val) {
  const s = String(val == null ? '' : val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ─── LOAD INPUTS ──────────────────────────────────────────

const entityRows = parseCSV(fs.readFileSync(ENTITIES_IN, 'utf8'));
const entityHeader = entityRows[0];
const idxId = entityHeader.indexOf('entity_id');
const idxType = entityHeader.indexOf('entity_type');
const idxName = entityHeader.indexOf('canonical_name');
const idxPanels = entityHeader.indexOf('panels');

const candidates = [];
for (let i = 1; i < entityRows.length; i++) {
  const r = entityRows[i];
  const type = r[idxType];
  if (type === 'unresolved_polity' || type === 'polity') {
    candidates.push({ id: r[idxId], type, name: r[idxName], panels: r[idxPanels] });
  }
}

// Existing polity IDs (defensive skip).
const existingPolityIds = new Set();
for (const line of fs.readFileSync(POLITY_IN, 'utf8').split('\n').slice(1)) {
  if (!line.trim()) continue;
  const m = line.match(/^([^,]+),/);
  if (m) existingPolityIds.add(m[1]);
}

// Territory IDs (only emit FKs that exist).
const territoryIds = new Set();
for (const line of fs.readFileSync(TERRITORY_IN, 'utf8').split('\n').slice(1)) {
  if (!line.trim()) continue;
  const m = line.match(/^([^,]+),/);
  if (m) territoryIds.add(m[1]);
}

// ─── REGION → TERRITORY MAP ───────────────────────────────
// Loose mapping from panel-directory name → candidate territory FKs.
// Filtered against territoryIds before writing, so missing IDs drop
// silently rather than producing FK orphans.
const REGION_TERRITORY = {
  persia_central_asia: ['iran_plateau', 'khorasan', 'transoxiana'],
  central_asia:        ['transoxiana', 'central_asian_steppe', 'khorasan'],
  east_asia:           ['yellow_river', 'yangtze', 'manchuria', 'mongolian_plateau', 'korean_peninsula', 'japanese_archipelago'],
  south_asia:          ['ganges_plain', 'indus_valley', 'punjab', 'deccan'],
  southeast_asia:      [],
  middle_east:         ['mesopotamia', 'levant', 'arabia', 'anatolia', 'caucasus', 'egypt'],
  europe:              ['italy', 'iberia', 'gaul', 'germany', 'britannia', 'scandinavia', 'balkans', 'hungary', 'poland'],
  north_africa:        ['north_africa', 'egypt', 'nubia'],
  east_africa:         ['nubia'],
  central_africa:      [],
  southern_africa:     [],
  west_africa:         [],
  north_america:       ['us_east', 'us_south', 'us_midwest', 'us_west', 'alaska', 'quebec', 'atlantic_canada', 'western_canada'],
  latin_america:       ['mesoamerica', 'caribbean', 'andes', 'amazonia', 'patagonia'],
  oceania:             ['hawaii'],
};

// Per-panel-id finer territory hints (overrides region defaults).
const PANEL_TERRITORY = {
  iran:        ['iran_plateau', 'khorasan'],
  china:       ['yellow_river', 'yangtze'],
  japan:       ['japanese_archipelago'],
  korea:       ['korean_peninsula'],
  manchuria:   ['manchuria'],
  mongolia:    ['mongolian_plateau'],
  italy:       ['italy'],
  france:      ['gaul'],
  germany:     ['germany'],
  iberia:      ['iberia'],
  britain_ireland: ['britannia', 'ireland', 'scotland'],
  scandinavia: ['scandinavia'],
  poland:      ['poland'],
  hungary:     ['hungary'],
  india:       ['ganges_plain', 'deccan'],
  pakistan:    ['indus_valley', 'punjab'],
  iraq:        ['mesopotamia'],
  levant:      ['levant'],
  arabia:      ['arabia'],
  anatolia:    ['anatolia'],
  egypt:       ['egypt'],
  greece:      ['balkans'],
  russia:      ['kievan_rus', 'pontic_steppe'],
  ukraine:     ['kievan_rus', 'pontic_steppe'],
  afghanistan: ['khorasan'],
  uzbekistan:  ['transoxiana'],
  turkmenistan:['transoxiana'],
  kazakhstan:  ['central_asian_steppe'],
};

// ─── PANEL WALK: build occurrence index ──────────────────

function findPanelFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findPanelFiles(full));
    else if (e.name.endsWith('.json')) out.push(full);
  }
  return out;
}

function toSnakeId(name) {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
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

// Index: entityId → [{ panelId, region, note }]
const occurrences = new Map();
function recordOccurrence(id, panelId, region, note) {
  if (!occurrences.has(id)) occurrences.set(id, []);
  occurrences.get(id).push({ panelId, region, note: note || null });
}

const panelFiles = findPanelFiles(HISTORY_DIR);
for (const filePath of panelFiles) {
  const region = path.basename(path.dirname(filePath));
  const panel = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const panelId = panel.id;
  for (const row of (panel.rows || [])) {
    for (const cell of (row.cells || [])) {
      const items = cell.stack || cell.split || [cell];
      for (const item of items) {
        if (!item.label) continue;
        if (item.polity) {
          recordOccurrence(item.polity, panelId, region, item.note);
        } else {
          // Try label-derived ID match (mirrors linker's toSnakeId path).
          const id = toSnakeId(item.label);
          if (id) recordOccurrence(id, panelId, region, item.note);
        }
      }
    }
  }
}

// ─── DATE PARSER ─────────────────────────────────────────

// Returns { start, end } or null. Empty when unparseable / too messy.
// Handles: "1442–1503", "c.1000 BCE–", "206–202 BCE", "535–553",
// "27 BCE–380 CE", "c.3400–2200 BCE", "c.450 BCE–", "1960".
// Skips: "19th–20th c.", "pre-Greek", "pre-Roman", "1241 BCE (...)" with
// only a single year (records as start with end empty).
function parseDate(note) {
  if (!note) return null;
  let s = String(note).trim();
  // Centuries are too lossy → skip.
  if (/\b\d+(st|nd|rd|th)\b/i.test(s)) return null;
  if (/^pre-/i.test(s)) return null;

  // Strip leading "c." / "c " / "ca."
  s = s.replace(/^c\.?\s*/i, '').replace(/^ca\.?\s*/i, '');

  // Drop trailing parenthetical qualifier "(first province)" etc.
  s = s.replace(/\s*\([^)]*\)\s*$/, '').trim();

  // Detect overall era hint at end (BCE or CE)
  const dash = /[–—-]/;
  const parts = s.split(dash).map(p => p.trim());

  function yearOf(token, defaultEra) {
    if (!token) return null;
    const m = token.match(/(-?\d{1,4})\s*(BCE|BC|CE|AD)?/i);
    if (!m) return null;
    let y = parseInt(m[1], 10);
    const era = (m[2] || defaultEra || '').toUpperCase();
    if (era === 'BCE' || era === 'BC') y = -Math.abs(y);
    return y;
  }

  if (parts.length === 1) {
    // Single year: "1960", "238 BCE"
    const y = yearOf(parts[0]);
    if (y == null) return null;
    return { start: y, end: '' };
  }

  if (parts.length === 2) {
    const [a, b] = parts;
    // Determine era for left side: if right has BCE → left BCE; if right CE
    // and left has explicit BCE token, leave as is.
    const rightEraMatch = b.match(/\b(BCE|BC|CE|AD)\b/i);
    const rightEra = rightEraMatch ? rightEraMatch[1].toUpperCase() : '';
    const leftHasEra = /\b(BCE|BC|CE|AD)\b/i.test(a);
    let leftEra = '';
    if (!leftHasEra) {
      if (rightEra === 'BCE' || rightEra === 'BC') leftEra = 'BCE';
      else if (rightEra === 'CE' || rightEra === 'AD') leftEra = 'CE';
    }
    const start = yearOf(a, leftEra);
    const end = b ? yearOf(b, rightEra) : '';
    if (start == null) return null;
    return { start, end: end == null ? '' : end };
  }

  return null;
}

// ─── GOVERNMENT INFERENCE ────────────────────────────────

function inferGovernment(id) {
  if (/_dynasty$/.test(id)) return 'monarchy';
  if (/_kingdom$/.test(id)) return 'monarchy';
  if (/_empire$/.test(id))  return 'monarchy';
  if (/_republic$/.test(id)) return 'republic';
  if (/_caliphate$/.test(id)) return 'caliphate';
  if (/_sultanate$/.test(id)) return 'sultanate';
  if (/_khanate$/.test(id) || /_khaganate$/.test(id)) return 'khanate';
  return '';
}

function titleCase(id) {
  return id.split('_').map(w => w.length ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}

// ─── BUILD STUB ROWS ─────────────────────────────────────

const STUB_HEADERS = ['id','name','civilization_id','id_ruling_ethnicity','id_ruling_language',
  'id_ruling_religion','government','territories','start_year','end_year','policies','note'];

let total = 0, generated = 0, withDate = 0, withoutDate = 0, govInferred = 0;
let skippedExisting = 0, skippedCulture = 0, skippedNoSignal = 0;
const stubLines = [STUB_HEADERS.join(',')];
const samples = [];

// Stable order: most-cross-panel-first.
candidates.sort((a, b) => {
  const ap = a.panels ? a.panels.split('|').length : 0;
  const bp = b.panels ? b.panels.split('|').length : 0;
  return bp - ap;
});

for (const c of candidates) {
  total++;
  if (existingPolityIds.has(c.id)) { skippedExisting++; continue; }
  if (/_culture$/.test(c.id))      { skippedCulture++; continue; }

  const occs = occurrences.get(c.id) || [];
  if (occs.length === 0) { skippedNoSignal++; continue; }

  // Aggregate region/panel hints.
  const panelSet = new Set(occs.map(o => o.panelId));
  const regionSet = new Set(occs.map(o => o.region));
  const primaryPanel = occs[0].panelId;

  // Territory FKs.
  const terrSet = new Set();
  for (const p of panelSet) {
    for (const t of (PANEL_TERRITORY[p] || [])) {
      if (territoryIds.has(t)) terrSet.add(t);
    }
  }
  for (const r of regionSet) {
    for (const t of (REGION_TERRITORY[r] || [])) {
      if (territoryIds.has(t)) terrSet.add(t);
    }
  }
  const territories = [...terrSet].join('|');

  // Date inference: pick first parseable note.
  let start = '', end = '';
  for (const o of occs) {
    const d = parseDate(o.note);
    if (d && d.start !== '' && d.start != null) {
      start = d.start;
      end = d.end === '' ? '' : d.end;
      break;
    }
  }
  if (start !== '') withDate++; else withoutDate++;

  const government = inferGovernment(c.id);
  if (government) govInferred++;

  const name = titleCase(c.id);
  const note = `Stub generated from ${primaryPanel} panel; appears in ${panelSet.size} panel(s); needs P6.1 enrichment`;

  const row = [
    c.id, name, '', '', '', '',
    government,
    territories,
    start === '' ? '' : String(start),
    end === '' ? '' : String(end),
    '',
    note,
  ].map(escapeCSV).join(',');
  stubLines.push(row);
  if (samples.length < 10) samples.push(row);
  generated++;
}

fs.writeFileSync(STUBS_OUT, stubLines.join('\n') + '\n');

// ─── REPORT ──────────────────────────────────────────────

console.log('\n=== generate_stubs.js summary ===');
console.log(`Candidates considered:    ${total}  (unresolved_polity + polity)`);
console.log(`Stubs generated:          ${generated}`);
console.log(`  with date:              ${withDate}`);
console.log(`  without date:           ${withoutDate}`);
console.log(`  with government:        ${govInferred}`);
console.log(`Skipped (already polity): ${skippedExisting}`);
console.log(`Skipped (*_culture):      ${skippedCulture}`);
console.log(`Skipped (no panel signal):${skippedNoSignal}`);
console.log(`\nFile written: ${path.relative(BASE, STUBS_OUT)}`);
console.log(`\nFirst 10 stubs:`);
console.log(STUB_HEADERS.join(','));
for (const s of samples) console.log(s);
