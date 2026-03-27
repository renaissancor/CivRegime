#!/usr/bin/env node

/**
 * Convert csvs/successions.csv → data/successions/all.json
 *
 * The server (data/index.js) loads data/successions/ via loadDir(),
 * which flattens all JSON arrays found in that directory.
 * The frontend (public/app.js) reads db.successions as an array of edges.
 *
 * Edge format: { from, to, type, shared_territories: [...] }
 * Types: A (direct), A- (ideology gap), B (ethnic migration), C (locus inheritance)
 */

const fs = require('fs');
const path = require('path');

// ── CSV parser (handles quoted fields) ──────────────────────────────────────

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

// ── Load CSV ────────────────────────────────────────────────────────────────

const csvPath = path.join(__dirname, '../../csvs/successions.csv');
const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));

const edges = rows.map(r => ({
  from:               r.from_regime_id,
  to:                 r.to_regime_id,
  type:               r.type,
  shared_territories: r.shared_territories ? r.shared_territories.split('|').filter(Boolean) : [],
}));

// ── Write to data/successions/ ──────────────────────────────────────────────

const outDir = path.join(__dirname, '../../data/successions');

// Clear old files
if (fs.existsSync(outDir)) {
  fs.readdirSync(outDir).forEach(f => {
    if (f.endsWith('.json')) fs.unlinkSync(path.join(outDir, f));
  });
} else {
  fs.mkdirSync(outDir, { recursive: true });
}

// Write single file (loadDir flattens the array)
fs.writeFileSync(
  path.join(outDir, 'all.json'),
  JSON.stringify(edges, null, 2),
  'utf8'
);

// ── Stats ───────────────────────────────────────────────────────────────────

const counts = {};
edges.forEach(e => counts[e.type] = (counts[e.type] || 0) + 1);

console.log(`✓ Generated data/successions/all.json — ${edges.length} edges`);
Object.entries(counts).sort().forEach(([type, n]) => {
  console.log(`  ${type.padEnd(4)} : ${n}`);
});
