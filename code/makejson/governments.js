#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, '../../csvs/government.csv');
const POLITY_CSV = path.join(__dirname, '../../csvs/polity.csv');
const DATA_DIR = path.join(__dirname, '../../data/government');

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

function main() {
  console.log(`Reading CSV: ${CSV_FILE}`);
  console.log(`Output dir:  ${DATA_DIR}\n`);

  if (!fs.existsSync(CSV_FILE)) {
    console.error('Error: government.csv not found');
    process.exit(1);
  }

  const rows = parseCSV(fs.readFileSync(CSV_FILE, 'utf-8')).filter(r => r.id);

  // Count polities per government type
  const polityCounts = new Map();
  if (fs.existsSync(POLITY_CSV)) {
    const polities = parseCSV(fs.readFileSync(POLITY_CSV, 'utf-8'));
    for (const p of polities) {
      if (p.government) {
        polityCounts.set(p.government, (polityCounts.get(p.government) || 0) + 1);
      }
    }
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // Clear existing
  for (const file of fs.readdirSync(DATA_DIR)) {
    if (file.endsWith('.json')) fs.unlinkSync(path.join(DATA_DIR, file));
  }

  let created = 0;
  for (const row of rows) {
    const gov = {
      id: row.id,
      name: row.name,
      finer_type: row.finer_type || null,
      weber_legitimacy: row.weber_legitimacy || null,
      description: row.description || null,
      polity_count: polityCounts.get(row.id) || 0,
    };

    fs.writeFileSync(
      path.join(DATA_DIR, `${row.id}.json`),
      JSON.stringify(gov, null, 2) + '\n'
    );
    created++;
  }

  console.log(`✓ Created: ${created} government files`);
  console.log(`  Finer types: ${[...new Set(rows.map(r => r.finer_type))].join(', ')}`);
  console.log(`  Weber types: ${[...new Set(rows.map(r => r.weber_legitimacy))].join(', ')}`);
}

main();
