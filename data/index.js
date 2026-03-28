const fs   = require('fs');
const path = require('path');

// ── File loaders ──────────────────────────────────────────────────────────────

function loadJSON(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(text.replace(/\/\/[^\n]*/g, ''));
}

/**
 * Load a flat or nested directory of JSON files into a single array.
 * Recurses into subdirectories automatically — no index.json convention.
 */
function loadDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      results.push(...loadDir(path.join(dir, entry.name)));
    } else if ((entry.name.endsWith('.json') || entry.name.endsWith('.geojson')) && !entry.name.startsWith('_')) {
      results.push(...[].concat(loadJSON(path.join(dir, entry.name))));
    }
  }
  return results;
}

/**
 * Load a taxonomy directory tree into a flat array.
 * Parent is derived from the directory path — not stored in files.
 *
 * Branch node: directory/index.json  → { id, name, ...meta, parent: <derived> }
 * Leaf node:   directory/id.json     → { id, name, ...meta, parent: <derived> }
 */
function loadTree(dir, parentId = null) {
  if (!fs.existsSync(dir)) return [];
  const results = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // 1. This directory's own node (index.json) — establishes currentParentId
  let currentParentId = parentId;
  const indexEntry = entries.find(e => e.isFile() && e.name === 'index.json');
  if (indexEntry) {
    const data = loadJSON(path.join(dir, 'index.json'));
    data.parent = parentId;
    results.push(data);
    currentParentId = data.id;
  }

  // 2. Leaf files in this directory
  for (const entry of entries) {
    if (entry.isFile() && entry.name !== 'index.json' && entry.name.endsWith('.json')) {
      const data = loadJSON(path.join(dir, entry.name));
      data.parent = currentParentId;
      results.push(data);
    }
  }

  // 3. Recurse into subdirectories
  for (const entry of entries) {
    if (entry.isDirectory()) {
      results.push(...loadTree(path.join(dir, entry.name), currentParentId));
    }
  }

  return results;
}

// ── Build db ──────────────────────────────────────────────────────────────────

const DATA = __dirname;

const db = {
  // Regime data — flat directories, one file per geographic cluster
  regimes:     loadDir(path.join(DATA, 'regimes')),
  successions: loadDir(path.join(DATA, 'successions')),

  // Territories — macro geographic zones, one file per territory
  // Each file contains metadata + periods[] of historical regime control
  territories: loadDir(path.join(DATA, 'territories')),

  // Taxonomies — directory trees, parent derived from path
  religions:   loadTree(path.join(DATA, 'religions')),
  languages:   loadTree(path.join(DATA, 'languages')),
  ethnicities: loadTree(path.join(DATA, 'ethnicities')),

  // Provinces — atomic map units (GeoJSON Features), one file per province
  // Each file contains: territory FK, simple regime control timeline, geometry (null until added)
  provinces: loadDir(path.join(DATA, 'provinces')),

  // Lookup table — stays as single flat file
  ideologies: loadJSON(path.join(DATA, 'ideologies.json')),
};

// ── Tree query helper ─────────────────────────────────────────────────────────
// db.tree.religions('christianity') → all descendants of christianity
// Used by the visualizer filter to include sub-branches automatically.

function getDescendants(id, nodes) {
  const children = nodes.filter(n => n.parent === id);
  return children.flatMap(c => [c, ...getDescendants(c.id, nodes)]);
}

db.tree = {
  religions:   (id) => getDescendants(id, db.religions),
  languages:   (id) => getDescendants(id, db.languages),
  ethnicities: (id) => getDescendants(id, db.ethnicities),
};

module.exports = db;
