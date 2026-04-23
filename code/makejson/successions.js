#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, '../../csvs/polity_succession.csv');
const OUT_FILE = path.join(__dirname, '../../data/succession/all.json');

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

function parseBool(value) {
  return value === '1' || value === 'true';
}

function parseInt2(value) {
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

function parsePipe(value) {
  return value ? value.split('|').map(s => s.trim()).filter(Boolean) : [];
}

function buildSuccession(row) {
  return {
    from:                    row.from_polity_id,
    to:                      row.to_polity_id,
    territorial_direction:   row.territorial_direction || 'unknown',
    strength:                parseInt2(row.strength),
    shared_territories:      parsePipe(row.shared_territories),
    shared_territory_count:  parseInt2(row.shared_territory_count),
    same_ethnicity:          parseBool(row.same_ethnicity),
    related_ethnicity:       parseBool(row.related_ethnicity),
    same_language:           parseBool(row.same_language),
    same_religion:           parseBool(row.same_religion),
    same_state:              parseBool(row.same_state),
    temporal_gap_years:      parseInt2(row.temporal_gap_years),
  };
}

function main() {
  console.log(`Reading CSV: ${CSV_FILE}`);

  if (!fs.existsSync(CSV_FILE)) {
    console.error('Error: successions.csv not found');
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const rows = parseCSV(content).filter(r => r.from_polity_id && r.to_polity_id);
  const successions = rows.map(buildSuccession);

  const outDir = path.dirname(OUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(OUT_FILE, JSON.stringify(successions, null, 2) + '\n');

  console.log(`✓ Written ${successions.length} successions → ${OUT_FILE}`);
}

main();
