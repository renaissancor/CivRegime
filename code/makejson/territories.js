#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TREE_FILE = path.join(__dirname, '../../docs/tree/territories.md');
const DATA_DIR = path.join(__dirname, '../../data/territories');

function generateTerritoryFiles() {
  const markdown = fs.readFileSync(TREE_FILE, 'utf-8');
  const lines = markdown.split('\n');

  const results = { created: [], errors: [] };

  let currentTerritory = null;
  let currentTerritoryName = null;
  let regimes = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Territory header: ## territory_id
    if (line.match(/^## /)) {
      // Save previous territory if exists
      if (currentTerritory && regimes.length > 0) {
        saveTerritoryFile(currentTerritory, currentTerritoryName, regimes, results);
      }

      const match = line.match(/^## (.+)$/);
      if (match) {
        currentTerritory = match[1].trim();
        currentTerritoryName = currentTerritory; // Same as id in this case
        regimes = [];
      }
    }
    // Regime entry: 1. Regime Name (ethnicity) start – end
    else if (line.match(/^\d+\. /)) {
      const match = line.match(/^\d+\. (.+?) \(([^)]+)\) ([^ ]+) – ([^ ]+)$/);
      if (match) {
        const regimeName = match[1].trim();
        const ethnicity = match[2].trim();
        const startStr = match[3].trim();
        const endStr = match[4].trim();

        // Find regime by name in loaded data
        const db = require('../../data');
        const regime = db.regimes.find(r => r.name === regimeName);

        if (regime) {
          regimes.push({
            regime_id: regime.id,
            regime_name: regime.name,
            start: regime.start,
            end: regime.end
          });
        } else {
          results.errors.push({
            territory: currentTerritory,
            regime: regimeName,
            error: 'Regime not found in data'
          });
        }
      }
    }
  }

  // Save last territory
  if (currentTerritory && regimes.length > 0) {
    saveTerritoryFile(currentTerritory, currentTerritoryName, regimes, results);
  }

  return results;
}

function saveTerritoryFile(territoryId, territoryName, regimes, results) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const jsonPath = path.join(DATA_DIR, `${territoryId}.json`);
  const jsonData = {
    id: territoryId,
    name: territoryName,
    regime_count: regimes.length,
    regimes: regimes
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2) + '\n');
  results.created.push(territoryId);
}

function main() {
  console.log(`Reading tree from: ${TREE_FILE}`);
  console.log(`Output directory: ${DATA_DIR}\n`);

  if (!fs.existsSync(TREE_FILE)) {
    console.error(`Error: Tree file not found`);
    process.exit(1);
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const results = generateTerritoryFiles();

  console.log('=== Generation Results ===');
  console.log(`✓ Created: ${results.created.length} territories`);
  console.log(`✗ Errors: ${results.errors.length} items\n`);

  if (results.created.length > 0 && results.created.length <= 30) {
    console.log('Created territories:');
    results.created.forEach(t => console.log(`  - ${t}`));
  } else if (results.created.length > 30) {
    console.log(`Created territories:`);
    results.created.slice(0, 30).forEach(t => console.log(`  - ${t}`));
    console.log(`  ... and ${results.created.length - 30} more`);
  }

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(err =>
      console.log(`  ✗ ${err.territory}/${err.regime}: ${err.error}`)
    );
  }

  process.exit(results.errors.length > 0 ? 1 : 0);
}

main();
