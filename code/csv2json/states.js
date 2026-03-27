#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, '../../csvs/states.csv');
const OUTPUT_FILE = path.join(__dirname, '../../data/states.json');

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

function generateStates() {
  console.log(`Reading states from: ${CSV_FILE}`);
  
  if (!fs.existsSync(CSV_FILE)) {
    console.error('Error: states.csv not found');
    process.exit(1);
  }
  
  const states = loadCSV(CSV_FILE);
  
  const stateObjects = states.map(s => ({
    id: s.id,
    name: s.name,
    ...(s.description && { description: s.description })
  }));
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stateObjects, null, 2) + '\n');
  
  console.log(`✓ Generated states.json (${stateObjects.length} states)`);
  process.exit(0);
}

generateStates();
