#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const CSV_DIR = path.join(__dirname, '../csvs');

// Ensure csvs directory exists
if (!fs.existsSync(CSV_DIR)) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
}

/**
 * Load all JSON files from a directory (recursive)
 */
function loadJSON(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(text.replace(/\/\/[^\n]*/g, ''));
}

function loadDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      results.push(...loadDir(path.join(dir, entry.name)));
    } else if ((entry.name.endsWith('.json') || entry.name.endsWith('.geojson')) && !entry.name.startsWith('_')) {
      results.push(...[].concat(loadJSON(path.join(dir, entry.name))));
    }
  }
  return results;
}

/**
 * Write CSV file
 */
function writeCSV(filename, headers, rows) {
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => {
    const val = r[h];
    if (val === null || val === undefined) return '';
    if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }).join(','))].join('\n');
  
  fs.writeFileSync(path.join(CSV_DIR, filename), csv + '\n');
  console.log(`✓ Created: ${filename} (${rows.length} rows)`);
}

/**
 * Main conversion
 */
function convert() {
  console.log('Converting JSON data to CSV format...\n');

  // ======== REGIMES ========
  const regimes = loadDir(path.join(DATA_DIR, 'regimes'));
  if (regimes.length > 0) {
    const regimeRows = regimes.map(r => ({
      id: r.id,
      name: r.name,
      state_id: '', // Will be populated manually
      id_ruling_ethnicity: r.ruling_ethnicity || '',
      id_ruling_language: r.cultural_language || '',
      id_ruling_religion: r.ideology?.religion || '',
      start: r.start,
      end: r.end || ''
    }));
    writeCSV('regimes.csv', ['id', 'name', 'state_id', 'id_ruling_ethnicity', 'id_ruling_language', 'id_ruling_religion', 'start', 'end'], regimeRows);
  }

  // ======== TERRITORIES ========
  const territories = loadDir(path.join(DATA_DIR, 'territories'));
  if (territories.length > 0) {
    const territoryRows = territories.map(t => ({
      id: t.id,
      name: t.name,
      regime_count: t.regime_count || 0
    }));
    writeCSV('territories.csv', ['id', 'name', 'regime_count'], territoryRows);
  }

  // ======== ETHNICITIES (tree) ========
  const ethnicities = loadDir(path.join(DATA_DIR, 'ethnicities'));
  if (ethnicities.length > 0) {
    const ethnicityRows = ethnicities.map(e => ({
      id: e.id,
      name: e.name,
      parent: e.parent || '',
      description: e.description || '',
      founded: e.founded || ''
    }));
    writeCSV('ethnicities.csv', ['id', 'name', 'parent', 'description', 'founded'], ethnicityRows);
  }

  // ======== LANGUAGES (tree) ========
  const languages = loadDir(path.join(DATA_DIR, 'languages'));
  if (languages.length > 0) {
    const languageRows = languages.map(l => ({
      id: l.id,
      name: l.name,
      parent: l.parent || '',
      description: l.description || '',
      founded: l.founded || ''
    }));
    writeCSV('languages.csv', ['id', 'name', 'parent', 'description', 'founded'], languageRows);
  }

  // ======== RELIGIONS (tree) ========
  const religions = loadDir(path.join(DATA_DIR, 'religions'));
  if (religions.length > 0) {
    const religionRows = religions.map(r => ({
      id: r.id,
      name: r.name,
      parent: r.parent || '',
      description: r.description || '',
      founded: r.founded || ''
    }));
    writeCSV('religions.csv', ['id', 'name', 'parent', 'description', 'founded'], religionRows);
  }

  // ======== STATES (template) ========
  const statesTemplate = [
    { id: 'roman_state', name: 'Roman State', description: 'Political continuity from Augustus to 1453' },
    { id: 'ottoman_state', name: 'Ottoman State', description: 'Political continuity from Osman I to Mehmed VI' }
  ];
  writeCSV('states.csv', ['id', 'name', 'description'], statesTemplate);

  console.log('\n✓ All CSV files created in csvs/ folder');
}

convert();
