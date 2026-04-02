#!/usr/bin/env node

/**
 * Computes territorial_direction for each succession based on
 * from/to regime territory data. Rewrites successions.csv in place
 * with the type column replaced by territorial_direction.
 *
 * Values:
 *   same         — roughly same core territory (high overlap ratio)
 *   expansion    — successor holds more territory
 *   contraction  — successor holds less territory (fragment)
 *   displacement — mostly different territory
 *   unknown      — insufficient territory data
 */

const fs = require('fs');
const path = require('path');

const REG_DIR = path.join(__dirname, '../data/regimes');
const CSV_IN  = path.join(__dirname, '../csvs/successions.csv');
const CSV_OUT = CSV_IN; // overwrite in place

// ── Load regimes ────────────────────────────────────────────────────────────

const regimes = {};
for (const f of fs.readdirSync(REG_DIR)) {
  if (!f.endsWith('.json')) continue;
  const r = JSON.parse(fs.readFileSync(path.join(REG_DIR, f), 'utf8'));
  regimes[r.id] = r;
}

// ── Compute direction ───────────────────────────────────────────────────────

function computeDirection(fromId, toId) {
  const fromR = regimes[fromId];
  const toR   = regimes[toId];
  const fromT = new Set(fromR?.territories || []);
  const toT   = new Set(toR?.territories || []);

  if (fromT.size === 0 || toT.size === 0) return 'unknown';

  // Compute actual intersection from regime territory data
  const intersection = [...fromT].filter(t => toT.has(t));
  const overlapCount = intersection.length;

  if (overlapCount === 0) return 'displacement';

  const overlapFromRatio = overlapCount / fromT.size;  // what % of "from" is shared
  const overlapToRatio   = overlapCount / toT.size;    // what % of "to" is shared

  // Both hold mostly the same land
  if (overlapFromRatio >= 0.5 && overlapToRatio >= 0.5) {
    if (toT.size > fromT.size * 1.3) return 'expansion';
    if (toT.size < fromT.size * 0.7) return 'contraction';
    return 'same';
  }

  // Successor holds a subset → contraction (fragment)
  if (overlapToRatio >= 0.5 && overlapFromRatio < 0.5) return 'contraction';

  // Successor holds a superset → expansion
  if (overlapFromRatio >= 0.5 && overlapToRatio < 0.5) return 'expansion';

  // Low overlap both ways → displacement
  return 'displacement';
}

// ── Parse and rewrite CSV ───────────────────────────────────────────────────

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

const lines = fs.readFileSync(CSV_IN, 'utf8').split('\n').filter(l => l.trim());
const headers = parseCSVLine(lines[0]);

// Find column indices
const fromIdx    = headers.indexOf('from_regime_id');
const toIdx      = headers.indexOf('to_regime_id');
const typeIdx    = headers.indexOf('type');
const sharedIdx  = headers.indexOf('shared_territories');

const tdIdx = headers.indexOf('territorial_direction');
// Support both fresh run (replacing 'type') and re-run (updating existing 'territorial_direction')
const replaceIdx = typeIdx !== -1 ? typeIdx : tdIdx;

// Build new header: replace 'type' or update existing 'territorial_direction'
const newHeaders = [...headers];
if (replaceIdx !== -1) {
  newHeaders[replaceIdx] = 'territorial_direction';
} else {
  newHeaders.push('territorial_direction');
}

const outputLines = [newHeaders.join(',')];
const stats = { same: 0, expansion: 0, contraction: 0, displacement: 0, unknown: 0 };

for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  if (!cols[fromIdx] || !cols[toIdx]) continue;

  const dir = computeDirection(cols[fromIdx], cols[toIdx]);
  stats[dir]++;

  if (replaceIdx !== -1) {
    cols[replaceIdx] = dir;
  } else {
    cols.push(dir);
  }
  outputLines.push(cols.join(','));
}

fs.writeFileSync(CSV_OUT, outputLines.join('\n') + '\n');

console.log(`Updated ${outputLines.length - 1} successions`);
console.log('Distribution:', stats);
