#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TREE_FILE = path.join(__dirname, '../../docs/tree/language.md');
const DATA_DIR = path.join(__dirname, '../../data/languages');

function generateLanguageFiles() {
  const markdown = fs.readFileSync(TREE_FILE, 'utf-8');
  const lines = markdown.split('\n');

  const createdNodes = new Set();
  const results = { created: [], errors: [] };

  let currentFamily = null;
  let currentFamilyName = null;
  let currentBranch = null;
  let currentBranchName = null;
  let currentGroup = null;
  let currentGroupName = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^## \d+\./)) {
      const match = line.match(/^## \d+\.\s+(.+?)(?:\s+\(|$)/);
      if (match) {
        currentFamilyName = match[1].trim();
        currentFamily = normalizeFileName(currentFamilyName);
        currentBranch = null;
        currentBranchName = null;
        currentGroup = null;
        currentGroupName = null;

        createBranchNode([currentFamily], currentFamilyName, null, createdNodes, results);
      }
    } else if (line.match(/^### \d+\.\d+/)) {
      const match = line.match(/^### \d+\.\d+\s+(.+?)(?:\s+\(|$)/);
      if (match) {
        currentBranchName = match[1].trim();
        currentBranch = normalizeFileName(currentBranchName);
        currentGroup = null;
        currentGroupName = null;

        if (currentFamily) {
          createBranchNode([currentFamily, currentBranch], currentBranchName, currentFamily, createdNodes, results);
        }
      }
    } else if (line.match(/^#### /)) {
      const match = line.match(/^#### (.+?)(?:\s+\(|$)/);
      if (match) {
        currentGroupName = match[1].trim();
        currentGroup = normalizeFileName(currentGroupName);

        if (currentBranch) {
          createBranchNode([currentFamily, currentBranch, currentGroup], currentGroupName, currentBranch, createdNodes, results);
        }
      }
    } else if (line.match(/^- /) && currentFamily) {
      const languageMatch = line.match(/^- (.+?)(?:\s+\(|$)/);
      if (languageMatch) {
        let rawName = languageMatch[1].trim();
        rawName = rawName.replace(/^\*\*|\*\*$/g, '');
        const languageId = normalizeFileName(rawName);

        try {
          const pathArray = [currentFamily, currentBranch, currentGroup, languageId].filter(Boolean);
          createLeafNode(
            pathArray,
            languageId,
            rawName,
            currentGroup || currentBranch || currentFamily,
            createdNodes,
            results
          );
        } catch (err) {
          results.errors.push({ language: rawName, error: err.message });
        }
      }
    }
  }

  return results;
}

function normalizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[-\s]+/g, '_')
    .replace(/[&\/]/g, '')
    .replace(/[()[\]{}]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function createBranchNode(pathArray, displayName, parentId, createdNodes, results) {
  const key = pathArray.join('/');
  if (createdNodes.has(key)) return;

  const nodeId = pathArray[pathArray.length - 1];
  
  // Skip self-references (node would have itself as parent)
  if (nodeId === parentId) {
    console.log(`⚠ Skipping self-reference: ${nodeId} (parent would be itself)`);
    createdNodes.add(key);
    return;
  }

  const dirPath = path.join(DATA_DIR, ...pathArray);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const jsonPath = path.join(dirPath, 'index.json');
  const jsonData = {
    id: nodeId,
    name: displayName,
    parent: parentId || null,
    description: null,
    founded: null,
    status: null
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2) + '\n');
  createdNodes.add(key);
  results.created.push(`${nodeId} (branch)`);
}

function createLeafNode(pathArray, nodeId, displayName, parentId, createdNodes, results) {
  const dirPath = path.join(DATA_DIR, ...pathArray);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const jsonPath = path.join(dirPath, `${nodeId}.json`);
  const jsonData = {
    id: nodeId,
    name: displayName,
    parent: parentId,
    iso6393: null,
    glottocode: null,
    description: null,
    founded: null,
    macro_area: null,
    coordinates: { lat: null, lon: null },
    status: null,
    scripts: [],
    speaker_count: { L1: null, L2: null, date: new Date().getFullYear().toString() }
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2) + '\n');
  results.created.push(`${nodeId} (leaf)`);
}

function cleanDataDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function main() {
  console.log(`Reading tree from: ${TREE_FILE}`);
  console.log(`Output directory: ${DATA_DIR}\n`);

  if (!fs.existsSync(TREE_FILE)) {
    console.error(`Error: Tree file not found`);
    process.exit(1);
  }

  cleanDataDir(DATA_DIR);

  const results = generateLanguageFiles();

  console.log('=== Generation Results ===');
  console.log(`✓ Created: ${results.created.length} files`);
  console.log(`✗ Errors: ${results.errors.length} items\n`);

  if (results.created.length > 0 && results.created.length <= 30) {
    console.log('Created files:');
    results.created.forEach(f => console.log(`  - ${f}`));
  } else if (results.created.length > 30) {
    console.log(`First 30 created files:`);
    results.created.slice(0, 30).forEach(f => console.log(`  - ${f}`));
    console.log(`  ... and ${results.created.length - 30} more`);
  }

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(err => console.log(`  ✗ ${err.language}: ${err.error}`));
  }

  process.exit(results.errors.length > 0 ? 1 : 0);
}

main();
