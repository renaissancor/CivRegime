#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TREE_FILE = path.join(__dirname, '../../docs/tree/religion.md');
const DATA_DIR = path.join(__dirname, '../../data/religions');

/**
 * Parse the religion tree markdown and generate JSON files
 */
function generateReligionFiles() {
  // Read the markdown file
  const markdown = fs.readFileSync(TREE_FILE, 'utf-8');
  const lines = markdown.split('\n');

  let currentFamily = null;
  let currentTradition = null;
  let currentBranch = null;
  let familyNum = null;

  const results = {
    created: [],
    skipped: [],
    errors: []
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Parse family (## N. FAMILY_NAME)
    if (line.match(/^## \d+\./)) {
      const match = line.match(/^## \d+\.\s+(.+?)(?:\s+\(|$)/);
      if (match) {
        currentFamily = normalizeFileName(match[1].trim());
        familyNum = line.match(/^## (\d+)\./)[1];
        currentTradition = null;
        currentBranch = null;
      }
    }

    // Parse tradition (### N.N Tradition Name)
    else if (line.match(/^### \d+\.\d+/)) {
      const match = line.match(/^### \d+\.\d+\s+(.+?)(?:\s+\(|$)/);
      if (match) {
        currentTradition = normalizeFileName(match[1].trim());
        currentBranch = null;
      }
    }

    // Parse branch (#### Branch Name)
    else if (line.match(/^#### /)) {
      const match = line.match(/^#### (.+?)(?:\s+\(|$)/);
      if (match) {
        currentBranch = normalizeFileName(match[1].trim());
      }
    }

    // Parse sect/movement (- Sect Name)
    else if (line.match(/^- /) && currentFamily) {
      const sectMatch = line.match(/^- (.+?)(?:\s+\(|$)/);
      if (sectMatch) {
        let rawName = sectMatch[1].trim();
        // Remove markdown bold markers
        rawName = rawName.replace(/^\*\*|\*\*$/g, '');
        const sectName = normalizeFileName(rawName);

        try {
          createReligionJson(
            currentFamily,
            currentTradition,
            currentBranch,
            sectName,
            rawName
          );
          results.created.push(`${currentFamily}/${currentTradition || 'root'}/${currentBranch || 'root'}/${sectName}`);
        } catch (err) {
          results.errors.push({
            religion: rawName,
            path: `${currentFamily}/${currentTradition}/${currentBranch}/${sectName}`,
            error: err.message
          });
        }
      }
    }
  }

  return results;
}

/**
 * Clean tradition/branch names by removing parenthetical and asterisk notes
 */
function cleanTraditionBranchName(name) {
  // Remove anything in asterisks/parentheses like "*(all extinct)*", "(extinct)", etc.
  return name
    .replace(/\s*\*\([^)]*\)\*/g, '')  // remove *(...)*
    .replace(/\s*\([^)]*\).*$/g, '')   // remove (...) and everything after
    .trim();
}

/**
 * Normalize a name to a valid filename (snake_case)
 */
function normalizeFileName(name) {
  // First clean tradition/branch names
  name = cleanTraditionBranchName(name);
  
  return name
    .toLowerCase()
    .replace(/[-\s]+/g, '_')         // hyphens and spaces to underscores
    .replace(/[&\/]/g, '')           // remove & and /
    .replace(/[()]/g, '')            // remove parentheses only
    .replace(/_+/g, '_')             // collapse multiple underscores
    .replace(/^_|_$/g, '');          // trim leading/trailing underscores
}

/**
 * Create a religion JSON file at the appropriate path
 */
function createReligionJson(family, tradition, branch, sectName, displayName) {
  // Build the directory path - only include tradition/branch if they exist
  let dirPath = path.join(DATA_DIR, family);
  
  // Add tradition only if it exists and is not empty
  if (tradition && tradition.trim()) {
    dirPath = path.join(dirPath, tradition);
    
    // Add branch only if it exists and is not empty
    if (branch && branch.trim()) {
      dirPath = path.join(dirPath, branch);
    }
  }
  
  dirPath = path.join(dirPath, sectName);

  // Create directories if they don't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Create the JSON file
  const jsonPath = path.join(dirPath, `${sectName}.json`);
  
  const jsonData = {
    name: displayName,
    family: family,
    tradition: tradition && tradition.trim() ? tradition : null,
    branch: branch && branch.trim() ? branch : null,
    description: null,
    founder: null,
    founded_year: null,
    founded_region: null,
    scriptures: [],
    theology: {
      type: null,
      deities: [],
      key_tenets: []
    },
    adherent_count: {
      total: null,
      date: new Date().getFullYear().toString()
    },
    major_regions: [],
    status: null,
    sub_sects: []
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

  const results = generateReligionFiles();

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
      console.log(`  ✗ ${err.religion}: ${err.error}`);
    });
  }

  process.exit(results.errors.length > 0 ? 1 : 0);
}

main();
