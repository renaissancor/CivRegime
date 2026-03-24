#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TREE_FILE = path.join(__dirname, '../../docs/tree/ethnicity.md');
const DATA_DIR = path.join(__dirname, '../../data/ethnicities');

/**
 * Parse the ethnicity tree markdown and generate JSON files
 */
function generateEthnicityFiles() {
  // Read the markdown file
  const markdown = fs.readFileSync(TREE_FILE, 'utf-8');
  const lines = markdown.split('\n');

  let currentBloc = null;
  let currentCluster = null;
  let currentSubcluster = null;
  let blocNum = null;

  const results = {
    created: [],
    skipped: [],
    errors: []
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Parse bloc (## N. BLOC_NAME)
    if (line.match(/^## \d+\./)) {
      const match = line.match(/^## \d+\.\s+(.+?)(?:\s+\(|$)/);
      if (match) {
        currentBloc = normalizeFileName(match[1].trim());
        blocNum = line.match(/^## (\d+)\./)[1];
        currentCluster = null;
        currentSubcluster = null;
      }
    }

    // Parse cluster (### N.N Cluster Name)
    else if (line.match(/^### \d+\.\d+/)) {
      const match = line.match(/^### \d+\.\d+\s+(.+?)(?:\s+\(|$)/);
      if (match) {
        currentCluster = normalizeFileName(match[1].trim());
        currentSubcluster = null;
      }
    }

    // Parse subcluster (#### Subcluster Name)
    else if (line.match(/^#### /)) {
      const match = line.match(/^#### (.+?)(?:\s+\(|$)/);
      if (match) {
        currentSubcluster = normalizeFileName(match[1].trim());
      }
    }

    // Parse ethnic group (- Ethnic Group Name)
    else if (line.match(/^- /) && currentBloc) {
      const groupMatch = line.match(/^- (.+?)(?:\s+\(|$)/);
      if (groupMatch) {
        let rawName = groupMatch[1].trim();
        // Remove markdown bold markers
        rawName = rawName.replace(/^\*\*|\*\*$/g, '');
        const ethnicityName = normalizeFileName(rawName);

        try {
          createEthnicityJson(
            currentBloc,
            currentCluster,
            currentSubcluster,
            ethnicityName,
            rawName
          );
          results.created.push(`${currentBloc}/${currentCluster || 'root'}/${currentSubcluster || 'root'}/${ethnicityName}`);
        } catch (err) {
          results.errors.push({
            ethnicity: rawName,
            path: `${currentBloc}/${currentCluster}/${currentSubcluster}/${ethnicityName}`,
            error: err.message
          });
        }
      }
    }
  }

  return results;
}

/**
 * Clean cluster/subcluster names by removing parenthetical and asterisk notes
 */
function cleanClusterName(name) {
  // Remove anything in asterisks/parentheses like "*(historical)*", "(historical)", etc.
  return name
    .replace(/\s*\*\([^)]*\)\*/g, '')  // remove *(...)*
    .replace(/\s*\([^)]*\).*$/g, '')   // remove (...) and everything after
    .trim();
}

/**
 * Normalize a name to a valid filename (snake_case)
 */
function normalizeFileName(name) {
  // First clean cluster/subcluster names
  name = cleanClusterName(name);
  
  return name
    .toLowerCase()
    .replace(/[-\s]+/g, '_')         // hyphens and spaces to underscores
    .replace(/[&\/]/g, '')           // remove & and /
    .replace(/[()]/g, '')            // remove parentheses only
    .replace(/_+/g, '_')             // collapse multiple underscores
    .replace(/^_|_$/g, '');          // trim leading/trailing underscores
}

/**
 * Create an ethnicity JSON file at the appropriate path
 */
function createEthnicityJson(bloc, cluster, subcluster, ethnicityName, displayName) {
  // Build the directory path - only include cluster/subcluster if they exist
  let dirPath = path.join(DATA_DIR, bloc);
  
  // Add cluster only if it exists and is not empty
  if (cluster && cluster.trim()) {
    dirPath = path.join(dirPath, cluster);
    
    // Add subcluster only if it exists and is not empty
    if (subcluster && subcluster.trim()) {
      dirPath = path.join(dirPath, subcluster);
    }
  }
  
  dirPath = path.join(dirPath, ethnicityName);

  // Create directories if they don't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Create the JSON file
  const jsonPath = path.join(dirPath, `${ethnicityName}.json`);
  
  const jsonData = {
    name: displayName,
    bloc: bloc,
    cluster: cluster && cluster.trim() ? cluster : null,
    subcluster: subcluster && subcluster.trim() ? subcluster : null,
    historical_depth: null,
    languages: [],
    origin_territory: null,
    ancestry: [],
    social_structure: {
      descent: null,
      settlement: null
    },
    population: {
      total: null,
      date: new Date().getFullYear().toString()
    },
    major_regions: []
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2) + '\n');
}

/**
 * Main execution
 */
function main() {
  console.log(`Reading tree from: ${TREE_FILE}`);
  console.log(`Output directory: ${DATA_DIR}\n`);

  if (!fs.existsSync(TREE_FILE)) {
    console.error(`Error: Tree file not found at ${TREE_FILE}`);
    process.exit(1);
  }

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const results = generateEthnicityFiles();

  console.log('\n=== Generation Results ===');
  console.log(`✓ Created: ${results.created.length} files`);
  console.log(`⚠ Skipped: ${results.skipped.length} items`);
  console.log(`✗ Errors: ${results.errors.length} items\n`);

  if (results.created.length > 0 && results.created.length <= 20) {
    console.log('Created files:');
    results.created.forEach(file => console.log(`  - ${file}`));
  } else if (results.created.length > 20) {
    console.log(`First 20 created files:`);
    results.created.slice(0, 20).forEach(file => console.log(`  - ${file}`));
    console.log(`  ... and ${results.created.length - 20} more`);
  }

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(err => {
      console.log(`  ✗ ${err.ethnicity}: ${err.error}`);
    });
  }

  process.exit(results.errors.length > 0 ? 1 : 0);
}

main();
