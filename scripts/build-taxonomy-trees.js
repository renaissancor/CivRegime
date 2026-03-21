/**
 * One-time migration: converts flat taxonomy JSON arrays → directory trees.
 * Applies to: religions, languages, ethnicities.
 *
 * Input:  data/religions.json  (flat array with "parent" field)
 * Output: data/religions/      (directory tree, parent derived from path)
 *
 * Node with children → directory/index.json
 * Leaf node          → directory/id.json
 * "parent" field is removed from files — derived by loader from path.
 */

const fs   = require('fs');
const path = require('path');
const db   = require('../data');

// ── Build in-memory tree from flat array ──────────────────────────────────────

function buildTree(nodes) {
  const byId = new Map(nodes.map(n => [n.id, { ...n, _children: [] }]));

  for (const node of byId.values()) {
    if (node.parent) {
      const parent = byId.get(node.parent);
      if (parent) parent._children.push(node);
    }
  }

  return [...byId.values()].filter(n => !n.parent);
}

// ── Write tree to filesystem ──────────────────────────────────────────────────

function writeTree(nodes, dir) {
  for (const node of nodes) {
    const { _children, parent, ...data } = node; // strip internal fields

    if (_children.length > 0) {
      // Branch node → directory + index.json
      const nodeDir = path.join(dir, node.id);
      fs.mkdirSync(nodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(nodeDir, 'index.json'),
        JSON.stringify(data, null, 2) + '\n'
      );
      writeTree(_children, nodeDir);
    } else {
      // Leaf node → id.json
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, `${node.id}.json`),
        JSON.stringify(data, null, 2) + '\n'
      );
    }
  }
}

// ── Migrate ───────────────────────────────────────────────────────────────────

function migrate(nodes, targetDir, label) {
  console.log(`\nMigrating ${label} (${nodes.length} nodes) → ${targetDir}`);

  const roots = buildTree(nodes);
  console.log(`  Tree roots: ${roots.map(r => r.id).join(', ')}`);

  // Check for orphans (parent referenced but not found)
  const ids = new Set(nodes.map(n => n.id));
  const orphans = nodes.filter(n => n.parent && !ids.has(n.parent));
  if (orphans.length > 0) {
    console.warn(`  ⚠  orphaned nodes (parent not found): ${orphans.map(o => o.id).join(', ')}`);
  }

  fs.mkdirSync(targetDir, { recursive: true });
  writeTree(roots, targetDir);

  // Count files written
  const count = countFiles(targetDir);
  console.log(`  ✓ wrote ${count} files`);
}

function countFiles(dir) {
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile()) n++;
    else if (entry.isDirectory()) n += countFiles(path.join(dir, entry.name));
  }
  return n;
}

const DATA = path.join(__dirname, '../data');

migrate(db.religions,   path.join(DATA, 'religions'),   'religions');
migrate(db.languages,   path.join(DATA, 'languages'),   'languages');
migrate(db.ethnicities, path.join(DATA, 'ethnicities'), 'ethnicities');

console.log('\nDone. Old flat files (religions.json, languages.json, ethnicities.json)');
console.log('are still present. Delete them after verifying the output.\n');
