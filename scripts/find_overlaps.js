#!/usr/bin/env node
// ============================================================
// Find potential duplicate polities by checking temporal/spatial
// overlaps within panels. Sorted by start year.
//
// Usage: node scripts/find_overlaps.js
// Output: csvs/overlap_candidates.csv
// ============================================================

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const HISTORY_DIR = path.join(BASE, 'data', 'history');
const OUT_FILE = path.join(BASE, 'csvs', 'overlap_candidates.csv');

// Load existing polity IDs
const regimesCSV = fs.readFileSync(path.join(BASE, 'csvs', 'regimes.csv'), 'utf8');
const existingPolities = new Map();
for (const line of regimesCSV.split('\n').slice(1)) {
  if (!line.trim()) continue;
  const match = line.match(/^([^,]+),(".*?"|[^,]*)/);
  if (match) existingPolities.set(match[1], match[2].replace(/^"|"$/g, ''));
}

// ─── YEAR EXTRACTION ──────────────────────────────────────

function parseYears(note, label) {
  const text = `${note || ''} ${label || ''}`;
  let start = null, end = null;

  // Pattern: "c.3000–1100 BCE"
  let m = text.match(/c?\.?\s*(\d{3,4})\s*[–\-−]\s*(\d{3,4})\s*BCE/i);
  if (m) return { start: -parseInt(m[1]), end: -parseInt(m[2]) };

  // Pattern: "27 BCE–380 CE"
  m = text.match(/(\d{1,4})\s*BCE\s*[–\-−]\s*(\d{1,4})\s*CE/i);
  if (m) return { start: -parseInt(m[1]), end: parseInt(m[2]) };

  // Pattern: "c.300 BCE–"
  m = text.match(/c?\.?\s*(\d{1,4})\s*BCE\s*[–\-−]\s*$/i);
  if (m) return { start: -parseInt(m[1]), end: null };

  // Pattern: "c.300 BCE"
  m = text.match(/c?\.?\s*(\d{1,4})\s*BCE/i);
  if (m) { start = -parseInt(m[1]); }

  // Pattern: "1256–1335" (CE dates)
  m = text.match(/(\d{3,4})\s*[–\-−]\s*(\d{3,4})(?!\s*BCE)/);
  if (m) {
    const a = parseInt(m[1]), b = parseInt(m[2]);
    // Both positive CE dates
    if (a > 0 && b > 0) return { start: a, end: b };
  }

  // Pattern: "1918" alone
  m = text.match(/\b(\d{4})\b/);
  if (m && !start) {
    const y = parseInt(m[1]);
    if (y > 500 && y < 2100) return { start: y, end: null };
  }

  // Pattern: "-3500" (from regimes.csv style)
  m = text.match(/(-?\d{3,4})\s*\/\s*(-?\d{3,4})/);
  if (m) return { start: parseInt(m[1]), end: parseInt(m[2]) };

  if (start !== null) return { start, end };
  return { start: null, end: null };
}

// ─── NORMALIZE FOR COMPARISON ─────────────────────────────

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
    .replace(/^_|_$/g, '');
}

function extractCore(label) {
  let core = label
    .replace(/\s*\([^)]*[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af][^)]*\)/g, '')
    .trim();
  const dashIdx = core.indexOf('—');
  if (dashIdx > 0) core = core.substring(0, dashIdx).trim();
  const arrowIdx = core.indexOf('→');
  if (arrowIdx > 0) core = core.substring(0, arrowIdx).trim();
  core = core.replace(/\s*\([^)]*\)?/g, '').trim();
  core = core.replace(/\b(forming|declining|continued|restored|expanding|briefly|remnants?)$/i, '').trim();
  return core;
}

// Compute base stem for fuzzy matching: strip type suffixes
function baseStem(id) {
  return id.replace(/_(dynasty|empire|kingdom|sultanate|khanate|khaganate|caliphate|republic|state|confederation|league|period)$/, '');
}

// ─── EXTRACT ALL CELLS ────────────────────────────────────

function findFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findFiles(full));
    else if (entry.name.endsWith('.json')) results.push(full);
  }
  return results;
}

const allCells = [];

for (const file of findFiles(HISTORY_DIR)) {
  const panel = JSON.parse(fs.readFileSync(file, 'utf8'));
  const panelId = panel.id;

  for (let rowIdx = 0; rowIdx < panel.rows.length; rowIdx++) {
    const row = panel.rows[rowIdx];
    const era = row.era ? row.era.label : null;
    const cells = row.cells || [];
    const dataCols = panel.columns.filter(c => c.type !== 'era');
    let colOffset = 0;

    for (const cell of cells) {
      const items = cell.stack || [cell];
      const columnId = dataCols[colOffset] ? dataCols[colOffset].id : `col_${colOffset}`;
      const span = cell.span || 1;

      for (let si = 0; si < items.length; si++) {
        const item = items[si];
        if (!item.label) continue;

        const core = extractCore(item.label);
        const { start, end } = parseYears(item.note, item.label);
        const entityId = item.regime || toSnakeId(core);

        allCells.push({
          panel_id: panelId,
          column_id: columnId,
          row_index: rowIdx,
          stack_index: si,
          era: era || '',
          label: item.label,
          note: item.note || '',
          core_name: core,
          entity_id: entityId,
          base_stem: baseStem(entityId),
          start_year: start,
          end_year: end,
          span: span,
          has_regime_link: !!item.regime,
        });
      }
      colOffset += span;
    }
  }
}

// ─── FIND OVERLAPS ────────────────────────────────────────

// Group by panel, then check for stem matches with temporal overlap
const byPanel = new Map();
for (const c of allCells) {
  if (!byPanel.has(c.panel_id)) byPanel.set(c.panel_id, []);
  byPanel.get(c.panel_id).push(c);
}

const overlaps = [];

for (const [panelId, cells] of byPanel) {
  // Group by base_stem within this panel
  const byStem = new Map();
  for (const c of cells) {
    if (!c.base_stem || c.base_stem === '?') continue;
    if (!byStem.has(c.base_stem)) byStem.set(c.base_stem, []);
    byStem.get(c.base_stem).push(c);
  }

  for (const [stem, group] of byStem) {
    if (group.length < 2) continue;

    // Find unique entity_ids in this group
    const uniqueIds = [...new Set(group.map(c => c.entity_id))];
    if (uniqueIds.length < 2) continue; // same entity, no problem

    // Check temporal overlap between different entity_ids
    for (let i = 0; i < uniqueIds.length; i++) {
      for (let j = i + 1; j < uniqueIds.length; j++) {
        const cellsA = group.filter(c => c.entity_id === uniqueIds[i]);
        const cellsB = group.filter(c => c.entity_id === uniqueIds[j]);
        const a = cellsA[0], b = cellsB[0];

        overlaps.push({
          panel_id: panelId,
          stem: stem,
          entity_a: uniqueIds[i],
          label_a: a.label,
          start_a: a.start_year,
          end_a: a.end_year,
          column_a: a.column_id,
          entity_b: uniqueIds[j],
          label_b: b.label,
          start_b: b.start_year,
          end_b: b.end_year,
          column_b: b.column_id,
          same_column: a.column_id === b.column_id ? 'yes' : 'no',
          likely_duplicate: 'review',
        });
      }
    }
  }
}

// ─── ALSO FIND CROSS-PANEL STEM MATCHES ───────────────────

const globalByStem = new Map();
for (const c of allCells) {
  if (!c.base_stem || c.base_stem === '?') continue;
  const key = c.base_stem;
  if (!globalByStem.has(key)) globalByStem.set(key, new Map());
  const ids = globalByStem.get(key);
  if (!ids.has(c.entity_id)) ids.set(c.entity_id, c);
}

const crossPanelDups = [];
for (const [stem, ids] of globalByStem) {
  if (ids.size < 2) continue;
  const entries = [...ids.entries()];
  crossPanelDups.push({
    stem,
    entity_count: ids.size,
    entities: entries.map(([id, c]) => `${id} [${c.panel_id}]`).join(' | '),
    labels: entries.map(([id, c]) => c.label).join(' | '),
  });
}

// ─── SORTED TIMELINE OUTPUT ───────────────────────────────

const withYears = allCells
  .filter(c => c.start_year !== null)
  .sort((a, b) => a.start_year - b.start_year);

// Write timeline CSV
const timelineOut = path.join(BASE, 'csvs', 'timeline_sorted.csv');
{
  const headers = ['start_year','end_year','panel_id','column_id','entity_id','core_name','label','note','has_regime_link'];
  const lines = [headers.join(',')];
  for (const c of withYears) {
    lines.push(headers.map(h => {
      const v = String(c[h] ?? '');
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v;
    }).join(','));
  }
  fs.writeFileSync(timelineOut, lines.join('\n') + '\n');
}

// Write overlap candidates
{
  const headers = ['panel_id','stem','entity_a','label_a','start_a','end_a','column_a','entity_b','label_b','start_b','end_b','column_b','same_column','likely_duplicate'];
  const lines = [headers.join(',')];
  for (const o of overlaps) {
    lines.push(headers.map(h => {
      const v = String(o[h] ?? '');
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v;
    }).join(','));
  }
  fs.writeFileSync(OUT_FILE, lines.join('\n') + '\n');
}

// ─── SUMMARY ──────────────────────────────────────────────

console.log(`\nTotal cells: ${allCells.length}`);
console.log(`Cells with parsed years: ${withYears.length}`);
console.log(`\nIntra-panel overlaps (same stem, different ID): ${overlaps.length}`);
console.log(`Cross-panel stem collisions: ${crossPanelDups.length}`);

console.log(`\n── Top intra-panel overlaps ──`);
for (const o of overlaps.slice(0, 20)) {
  const years_a = o.start_a ? `${o.start_a}–${o.end_a || '?'}` : '?';
  const years_b = o.start_b ? `${o.start_b}–${o.end_b || '?'}` : '?';
  console.log(`  ${o.panel_id}: ${o.entity_a} (${years_a}) vs ${o.entity_b} (${years_b}) [${o.same_column === 'yes' ? 'SAME col' : 'diff col'}]`);
}

console.log(`\n── Top cross-panel stem collisions ──`);
for (const d of crossPanelDups.sort((a,b) => b.entity_count - a.entity_count).slice(0, 20)) {
  console.log(`  ${d.stem} (${d.entity_count} IDs): ${d.entities}`);
}

console.log(`\nOutput:`);
console.log(`  ${OUT_FILE}`);
console.log(`  ${timelineOut}`);
