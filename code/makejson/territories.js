#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TERRITORIES_CSV = path.join(__dirname, '../../csvs/territory.csv');
const PERIODS_CSV = path.join(__dirname, '../../csvs/polity_territory.csv');
const OUTPUT_DIR = path.join(__dirname, '../../data/territory');

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

function generateTerritories() {
  console.log(`Reading territories from: ${TERRITORIES_CSV}`);
  console.log(`Reading periods from: ${PERIODS_CSV}`);
  
  if (!fs.existsSync(TERRITORIES_CSV) || !fs.existsSync(PERIODS_CSV)) {
    console.error('Error: territories.csv or territory_periods.csv not found');
    process.exit(1);
  }
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const territories = loadCSV(TERRITORIES_CSV);
  const periods = loadCSV(PERIODS_CSV);
  
  // Group periods by territory
  const periodsByTerritory = {};
  periods.forEach(p => {
    if (!periodsByTerritory[p.territory_id]) {
      periodsByTerritory[p.territory_id] = [];
    }
    periodsByTerritory[p.territory_id].push({
      polity_id: p.polity_id,
      start_year: parseInt(p.start_year),
      ...(p.end_year && { end_year: parseInt(p.end_year) })
    });
  });
  
  let created = 0;
  let errors = 0;
  
  territories.forEach(t => {
    try {
      const territory = {
        id: t.id,
        name: t.name,
        polity_count: periodsByTerritory[t.id]?.length || 0,
        polities: periodsByTerritory[t.id] || []
      };
      
      const filePath = path.join(OUTPUT_DIR, `${t.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(territory, null, 2) + '\n');
      created++;
    } catch (err) {
      console.error(`  ✗ ${t.id}: ${err.message}`);
      errors++;
    }
  });
  
  console.log(`\n✓ Generated ${created} territory files`);
  console.log(`  Total polity control periods: ${periods.length}`);
  if (errors > 0) console.log(`✗ ${errors} errors`);
  
  process.exit(errors > 0 ? 1 : 0);
}

generateTerritories();
