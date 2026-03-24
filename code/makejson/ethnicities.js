#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TREE_FILE = path.join(__dirname, '../../docs/tree/ethnicity.md');
const DATA_DIR = path.join(__dirname, '../../data/ethnicities');

function generateEthnicityFiles() {
  const markdown = fs.readFileSync(TREE_FILE, 'utf-8');
  const lines = markdown.split('\n');

  const createdNodes = new Set();
  const results = { created: [], errors: [] };

  let currentBloc = null;
  let currentBlocName = null;
  let currentCluster = null;
  let currentClusterName = null;
  let currentSubcluster = null;
  let currentSubclusterName = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^## \d+\./)) {
      const match = line.match(/^## \d+\.\s+(.+?)(?:\s+\(|$)/);
      if (match) {
        currentBlocName = match[1].trim();
        currentBloc = normalizeFileName(currentBlocName);
        currentCluster = null;
        currentClusterName = null;
        currentSubcluster = null;
        currentSubclusterName = null;

        createBranchNode([currentBloc], currentBlocName, null, createdNodes, results);
      }
    } else if (line.match(/^### \d+\.\d+/)) {
      const match = line.match(/^### \d+\.\d+\s+(.+?)(?:\s+\(|$)/);
      if (match) {
        currentClusterName = match[1].trim();
        currentCluster = normalizeFileName(currentClusterName);
        currentSubcluster = null;
        currentSubclusterName = null;

        if (currentBloc) {
          createBranchNode([currentBloc, currentCluster], currentClusterName, currentBloc, createdNodes, results);
        }
      }
    } else if (line.match(/^#### /)) {
      const match = line.match(/^#### (.+?)(?:\s+\(|$)/);
      if (match) {
        currentSubclusterName = match[1].trim();
        currentSubcluster = normalizeFileName(currentSubclusterName);

        if (currentCluster) {
          createBranchNode([currentBloc, currentCluster, currentSubcluster], currentSubclusterName, currentCluster, createdNodes, results);
        }
      }
    } else if (line.match(/^- /) && currentBloc) {
      const groupMatch = line.match(/^- (.+?)(?:\s+\(|$)/);
      if (groupMatch) {
        let rawName = groupMatch[1].trim();
        rawName = rawName.replace(/^\*\*|\*\*$/g, '');
        const groupId = normalizeFileName(rawName);

        try {
          const pathArray = [currentBloc, currentCluster, currentSubcluster, groupId].filter(Boolean);
          createLeafNode(
            pathArray,
            groupId,
            rawName,
            currentSubcluster || currentCluster || currentBloc,
            createdNodes,
            results
          );
        } catch (err) {
          results.errors.push({ ethnicity: rawName, error: err.message });
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
    description: null,
    founded: null,
    historical_depth: null,
    languages: [],
    origin_territory: null,
    ancestry: [],
    social_structure: { descent: null, settlement: null },
    population: { total: null, date: new Date().getFullYear().toString() },
    major_regions: [],
    status: null
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2) + '\n');
  results.created.push(`${nodeId} (leaf)`);
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

  const results = generateEthnicityFiles();

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
    results.errors.forEach(err => console.log(`  ✗ ${err.ethnicity}: ${err.error}`));
  }

  process.exit(results.errors.length > 0 ? 1 : 0);
}

main();
