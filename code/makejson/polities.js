#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CSV_FILE     = path.join(__dirname, '../../csvs/polity.csv');
const FIGURES_FILE = path.join(__dirname, '../../csvs/figure.csv');
const DATA_DIR     = path.join(__dirname, '../../data/polity');

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

function parsePipe(value) {
  return value ? value.split('|').map(s => s.trim()).filter(Boolean) : [];
}

function parseInt2(value) {
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

function loadFiguresByPolity() {
  if (!fs.existsSync(FIGURES_FILE)) return new Map();
  const content = fs.readFileSync(FIGURES_FILE, 'utf-8');
  const rows = parseCSV(content).filter(r => r.polity_id);
  const byPolity = new Map();
  for (const row of rows) {
    if (!byPolity.has(row.polity_id)) byPolity.set(row.polity_id, []);
    const fig = {};
    if (row.figure_id)    fig.id           = row.figure_id;
    if (row.name)         fig.name         = row.name;
    if (row.role)         fig.role         = row.role;
    if (row.years)        fig.years        = row.years;
    if (row.significance) fig.significance = row.significance;
    byPolity.get(row.polity_id).push(fig);
  }
  return byPolity;
}

function buildPolity(row, figuresByPolity) {
  const polity = {
    id: row.id,
    name: row.name,
  };

  if (row.civilization_id)              polity.civilization_id        = row.civilization_id;
  if (row.id_ruling_ethnicity)   polity.ruling_ethnicity = row.id_ruling_ethnicity;
  if (row.id_ruling_language)    polity.cultural_language = row.id_ruling_language;

  const religion   = row.id_ruling_religion  || '';
  const government = row.government          || '';
  if (religion || government) {
    polity.ideology = {};
    if (religion)   polity.ideology.religion   = religion;
    if (government) polity.ideology.government = government;
  }

  const territories = parsePipe(row.territories);
  if (territories.length) polity.territories = territories;

  polity.start = parseInt2(row.start);
  polity.end   = parseInt2(row.end);

  const policies = parsePipe(row.policies);
  if (policies.length) polity.policies = policies;

  if (row.note) polity.note = row.note;

  const figures = figuresByPolity ? (figuresByPolity.get(row.id) || []) : [];
  if (figures.length) polity.figures = figures;

  return polity;
}

function generatePolityFiles() {
  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const rows = parseCSV(content).filter(r => r.id);
  const results = { created: [], skipped: [], errors: [] };

  const figuresByPolity = loadFiguresByPolity();

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // Clear existing generated files
  for (const file of fs.readdirSync(DATA_DIR)) {
    if (file.endsWith('.json')) fs.unlinkSync(path.join(DATA_DIR, file));
  }

  for (const row of rows) {
    try {
      if (!row.id) { results.skipped.push('(empty id)'); continue; }
      const polity = buildPolity(row, figuresByPolity);
      const outPath = path.join(DATA_DIR, `${row.id}.json`);
      fs.writeFileSync(outPath, JSON.stringify(polity, null, 2) + '\n');
      results.created.push(row.id);
    } catch (err) {
      results.errors.push({ id: row.id, error: err.message });
    }
  }

  return results;
}

function main() {
  console.log(`Reading CSV: ${CSV_FILE}`);
  console.log(`Output dir:  ${DATA_DIR}\n`);

  if (!fs.existsSync(CSV_FILE)) {
    console.error('Error: polity.csv not found');
    process.exit(1);
  }

  const results = generatePolityFiles();

  console.log('=== Generation Results ===');
  console.log(`✓ Created:  ${results.created.length} polity files`);
  console.log(`⚠ Skipped:  ${results.skipped.length}`);
  console.log(`✗ Errors:   ${results.errors.length}\n`);

  if (results.errors.length > 0) {
    console.log('Errors:');
    results.errors.forEach(e => console.log(`  ✗ ${e.id}: ${e.error}`));
  }

  process.exit(results.errors.length > 0 ? 1 : 0);
}

main();
