#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, '../../csvs/regimes.csv');
const OUTPUT_DIR = path.join(__dirname, '../../data/regimes');

function loadCSV(file) {
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  const rows = lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') inQuotes = !inQuotes;
      else if (line[i] === ',' && !inQuotes) {
        values.push(current.replace(/^"|"$/g, ''));
        current = '';
      } else current += line[i];
    }
    values.push(current.replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
  
  return rows;
}

function generateRegimes() {
  console.log(`Reading regimes from: ${CSV_FILE}`);
  
  if (!fs.existsSync(CSV_FILE)) {
    console.error('Error: regimes.csv not found');
    process.exit(1);
  }
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const regimes = loadCSV(CSV_FILE);
  let created = 0;
  let errors = 0;
  
  regimes.forEach(r => {
    try {
      const regime = {
        id: r.id,
        name: r.name,
        ...(r.state_id && { state_id: r.state_id }),
        ...(r.id_ruling_ethnicity && { ruling_ethnicity: parseInt(r.id_ruling_ethnicity) }),
        ...(r.id_ruling_language && { cultural_language: parseInt(r.id_ruling_language) }),
        start: parseInt(r.start),
        ...(r.end && { end: parseInt(r.end) })
      };
      
      // Add ideology if religion exists
      if (r.id_ruling_religion) {
        regime.ideology = {
          religion: parseInt(r.id_ruling_religion),
          government: 'monarchy' // placeholder
        };
      }
      
      const filePath = path.join(OUTPUT_DIR, `${r.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify([regime], null, 2) + '\n');
      created++;
    } catch (err) {
      console.error(`  ✗ ${r.id}: ${err.message}`);
      errors++;
    }
  });
  
  console.log(`\n✓ Generated ${created} regime files`);
  if (errors > 0) console.log(`✗ ${errors} errors`);
  
  process.exit(errors > 0 ? 1 : 0);
}

generateRegimes();
