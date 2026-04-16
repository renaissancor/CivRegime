#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DYNASTY_CSV      = path.join(__dirname, '../../csvs/dynasty.csv');
const POLITY_DYN_CSV   = path.join(__dirname, '../../csvs/polity_dynasty.csv');
const DATA_DIR         = path.join(__dirname, '../../data/dynasty');

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

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

function parseInt2(value) {
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

function loadPolityDynastyLinks() {
  if (!fs.existsSync(POLITY_DYN_CSV)) return new Map();
  const content = fs.readFileSync(POLITY_DYN_CSV, 'utf-8');
  const rows = parseCSV(content).filter(r => r.dynasty_id);
  const byDynasty = new Map();
  for (const row of rows) {
    if (!byDynasty.has(row.dynasty_id)) byDynasty.set(row.dynasty_id, []);
    byDynasty.get(row.dynasty_id).push({
      polity_id: row.polity_id,
      start: parseInt2(row.start),
      end: parseInt2(row.end),
    });
  }
  return byDynasty;
}

function generateDynastyFiles() {
  const content = fs.readFileSync(DYNASTY_CSV, 'utf-8');
  const rows = parseCSV(content).filter(r => r.id);
  const links = loadPolityDynastyLinks();
  const results = { created: [], skipped: [], errors: [] };

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // Clear existing generated files
  for (const file of fs.readdirSync(DATA_DIR)) {
    if (file.endsWith('.json')) fs.unlinkSync(path.join(DATA_DIR, file));
  }

  for (const row of rows) {
    try {
      if (!row.id) { results.skipped.push('(empty id)'); continue; }

      const dynasty = {
        id: row.id,
        name: row.name,
      };

      if (row.ethnicity)     dynasty.ethnicity     = row.ethnicity;
      if (row.origin_region) dynasty.origin_region  = row.origin_region;
      if (row.note)          dynasty.note           = row.note;

      const polities = links.get(row.id) || [];
      if (polities.length) {
        dynasty.polities = polities.sort((a, b) => (a.start || 0) - (b.start || 0));
      }

      const outPath = path.join(DATA_DIR, `${row.id}.json`);
      fs.writeFileSync(outPath, JSON.stringify(dynasty, null, 2) + '\n');
      results.created.push(row.id);
    } catch (err) {
      results.errors.push({ id: row.id, error: err.message });
    }
  }

  return results;
}

function main() {
  console.log(`Reading CSV: ${DYNASTY_CSV}`);
  console.log(`Links CSV:   ${POLITY_DYN_CSV}`);
  console.log(`Output dir:  ${DATA_DIR}\n`);

  if (!fs.existsSync(DYNASTY_CSV)) {
    console.error('Error: dynasty.csv not found');
    process.exit(1);
  }

  const results = generateDynastyFiles();

  console.log('=== Generation Results ===');
  console.log(`✓ Created:  ${results.created.length} dynasty files`);
  console.log(`⚠ Skipped:  ${results.skipped.length}`);
  console.log(`✗ Errors:   ${results.errors.length}\n`);

  if (results.errors.length > 0) {
    console.log('Errors:');
    results.errors.forEach(e => console.log(`  ✗ ${e.id}: ${e.error}`));
  }

  process.exit(results.errors.length > 0 ? 1 : 0);
}

main();
