#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TREE_FILE = path.join(__dirname, '../../docs/tree/religion.md');
const DATA_DIR = path.join(__dirname, '../../data/religion');

function generateReligionFiles() {
  const markdown = fs.readFileSync(TREE_FILE, 'utf-8');
  const lines = markdown.split('\n');

  const createdNodes = new Set();
  const results = { created: [], errors: [] };

  let currentFamily = null;
  let currentFamilyName = null;
  let currentTradition = null;
  let currentTraditionName = null;
  let currentBranch = null;
  let currentBranchName = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^## \d+\./)) {
      const match = line.match(/^## \d+\.\s+(.+?)(?:\s+\(|$)/);
      if (match) {
        currentFamilyName = match[1].trim();
        currentFamily = normalizeFileName(currentFamilyName);
        currentTradition = null;
        currentTraditionName = null;
        currentBranch = null;
        currentBranchName = null;

        createBranchNode([currentFamily], currentFamilyName, null, createdNodes, results);
      }
    } else if (line.match(/^### \d+\.\d+/)) {
      const match = line.match(/^### \d+\.\d+\s+(.+?)(?:\s+\(|$)/);
      if (match) {
        currentTraditionName = match[1].trim();
        currentTradition = normalizeFileName(currentTraditionName);
        currentBranch = null;
        currentBranchName = null;

        if (currentFamily) {
          createBranchNode([currentFamily, currentTradition], currentTraditionName, currentFamily, createdNodes, results);
        }
      }
    } else if (line.match(/^#### /)) {
      const match = line.match(/^#### (.+?)(?:\s+\(|$)/);
      if (match) {
        currentBranchName = match[1].trim();
        currentBranch = normalizeFileName(currentBranchName);

        if (currentTradition) {
          createBranchNode([currentFamily, currentTradition, currentBranch], currentBranchName, currentTradition, createdNodes, results);
        }
      }
    } else if (line.match(/^- /) && currentFamily) {
      const sectMatch = line.match(/^- (.+?)(?:\s+\(|$)/);
      if (sectMatch) {
        let rawName = sectMatch[1].trim();
        rawName = rawName.replace(/^\*\*|\*\*$/g, '');
        const sectId = normalizeFileName(rawName);

        try {
          const pathArray = [currentFamily, currentTradition, currentBranch, sectId].filter(Boolean);
          createLeafNode(
            pathArray,
            sectId,
            rawName,
            currentBranch || currentTradition || currentFamily,
            createdNodes,
            results
          );
        } catch (err) {
          results.errors.push({ religion: rawName, error: err.message });
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
    founder: null,
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
    description: null,
    founder: null,
    founded: null,
    founded_region: null,
    scriptures: [],
    theology: { type: null, deities: [], key_tenets: [] },
    adherent_count: { total: null, date: new Date().getFullYear().toString() },
    major_regions: [],
    status: null,
    sub_sects: []
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

  const results = generateReligionFiles();

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
    results.errors.forEach(err => console.log(`  ✗ ${err.religion}: ${err.error}`));
  }

  process.exit(results.errors.length > 0 ? 1 : 0);
}

main();
