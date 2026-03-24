#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TREE_FILE = path.join(__dirname, '../../docs/tree/language.md');
const DATA_DIR = path.join(__dirname, '../../data/languages');

/**
 * Parse the language tree markdown and generate JSON files
 */
function generateLanguageFiles() {
  // Read the markdown file
  const markdown = fs.readFileSync(TREE_FILE, 'utf-8');
  const lines = markdown.split('\n');

  let currentFamily = null;
  let currentBranch = null;
  let currentGroup = null;
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
        currentBranch = null;
        currentGroup = null;
      }
    }

    // Parse branch (### N.N Branch Name)
    else if (line.match(/^### \d+\.\d+/)) {
      const match = line.match(/^### \d+\.\d+\s+(.+?)(?:\s+\(|$)/);
      if (match) {
        currentBranch = normalizeFileName(match[1].trim());
        currentGroup = null;
      }
    }

    // Parse group (#### Group Name)
    else if (line.match(/^#### /)) {
      const match = line.match(/^#### (.+?)(?:\s+\(|$)/);
      if (match) {
        currentGroup = normalizeFileName(match[1].trim());
      }
    }

    // Parse language (- Language Name)
    else if (line.match(/^- /) && currentFamily) {
      const languageMatch = line.match(/^- (.+?)(?:\s+\(|$)/);
      if (languageMatch) {
        let rawName = languageMatch[1].trim();
        // Remove markdown bold markers
        rawName = rawName.replace(/^\*\*|\*\*$/g, '');
        const languageName = normalizeFileName(rawName);

        try {
          createLanguageJson(
            currentFamily,
            currentBranch,
            currentGroup,
            languageName,
            rawName
          );
          results.created.push(`${currentFamily}/${currentBranch || 'root'}/${currentGroup || 'root'}/${languageName}`);
        } catch (err) {
          results.errors.push({
            language: rawName,
            path: `${currentFamily}/${currentBranch}/${currentGroup}/${languageName}`,
            error: err.message
          });
        }
      }
    }
  }

  return results;
}

/**
 * Clean branch/group names by removing parenthetical and asterisk notes
 */
function cleanBranchGroupName(name) {
  // Remove anything in asterisks/parentheses like "*(all extinct)*", "(extinct)", etc.
  return name
    .replace(/\s*\*\([^)]*\)\*/g, '')  // remove *(...)*
    .replace(/\s*\([^)]*\).*$/g, '')   // remove (...) and everything after
    .replace(/\s+(Branch|Group)$/i, '') // remove trailing "Branch" or "Group"
    .trim();
}

/**
 * Normalize a name to a valid filename (snake_case)
 */
function normalizeFileName(name) {
  // First clean branch/group names
  name = cleanBranchGroupName(name);
  
  return name
    .toLowerCase()
    .replace(/[-\s]+/g, '_')         // hyphens and spaces to underscores
    .replace(/[&\/]/g, '')           // remove & and /
    .replace(/[()]/g, '')            // remove parentheses only
    .replace(/_+/g, '_')             // collapse multiple underscores
    .replace(/^_|_$/g, '');          // trim leading/trailing underscores
}

/**
 * Create a language JSON file at the appropriate path
 */
function createLanguageJson(family, branch, group, languageName, displayName) {
  // Build the directory path - only include branch/group if they exist
  let dirPath = path.join(DATA_DIR, family);
  
  // Add branch only if it exists and is not empty
  if (branch && branch.trim()) {
    dirPath = path.join(dirPath, branch);
    
    // Add group only if it exists and is not empty
    if (group && group.trim()) {
      dirPath = path.join(dirPath, group);
    }
  }
  
  dirPath = path.join(dirPath, languageName);

  // Create directories if they don't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Create the JSON file
  const jsonPath = path.join(dirPath, `${languageName}.json`);
  
  const jsonData = {
    name: displayName,
    iso6393: null,
    glottocode: null,
    family: family,
    branch: branch && branch.trim() ? branch : null,
    group: group && group.trim() ? group : null,
    macro_area: null,
    coordinates: {
      lat: null,
      lon: null
    },
    status: null,
    scripts: [],
    speaker_count: {
      L1: null,
      L2: null,
      date: new Date().getFullYear().toString()
    }
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

  const results = generateLanguageFiles();

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
      console.log(`  ✗ ${err.language}: ${err.error}`);
    });
  }

  process.exit(results.errors.length > 0 ? 1 : 0);
}

main();
