#!/usr/bin/env node
/**
 * Extract polity IDs referenced in history panels but missing from polity.csv.
 * Classifies each as polity vs non-polity (culture, migration, event, etc.)
 * and only reports/adds actual polities.
 *
 * Usage:
 *   node scripts/extract_missing_polities.js              # report only
 *   node scripts/extract_missing_polities.js --write       # append stubs to polity.csv
 *   node scripts/extract_missing_polities.js --min-panels 3  # only 3+ panel polities
 */
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../csvs/polity.csv');
const HISTORY_DIR = path.join(__dirname, '../data/history');

const args = process.argv.slice(2);
const writeMode = args.includes('--write');
const minPanels = (() => {
  const idx = args.indexOf('--min-panels');
  return idx >= 0 ? parseInt(args[idx + 1], 10) : 2;
})();

// ── Non-polity classification rules ─────────────────────────────────────────

const NON_POLITY_SUFFIXES = [
  '_culture',        // archaeological cultures (BMAC, Hallstatt, Capsian, etc.)
  '_migration',      // population movements
  '_settlement',     // settlement waves
  '_raids',          // military raids (not a polity)
  '_reconquest',     // military campaigns
  '_colonies',       // collective colonial presence (Greek colonies, Phoenician colonies)
];

const NON_POLITY_EXACT = new Set([
  // Species / biological
  'neanderthals',
  'homo_sapiens',
  'homo_erectus',
  'denisovans',

  // Generic labels
  'indigenous_peoples',
  'tribal_peoples',
  'nomadic_peoples',

  // Wars / conflicts (events, not polities)
  'hundred_years_war',
  'thirty_years_war',
  'world_war_i',
  'world_war_ii',
  'cold_war',
]);

const NON_POLITY_PATTERNS = [
  /^homo_/,              // homo sapiens, homo erectus, etc.
  /^neolithic/,          // neolithic periods
  /^paleolithic/,        // paleolithic periods
  /^mesolithic/,         // mesolithic periods
  /^bronze_age/,         // bronze age labels
  /^iron_age/,           // iron age labels
  /^stone_age/,          // stone age labels
];

function isNonPolity(id) {
  // Suffix match
  for (const suffix of NON_POLITY_SUFFIXES) {
    if (id.endsWith(suffix)) return { skip: true, reason: `suffix: ${suffix}` };
  }

  // Exact match
  if (NON_POLITY_EXACT.has(id)) return { skip: true, reason: 'exact match' };

  // Regex pattern match
  for (const pattern of NON_POLITY_PATTERNS) {
    if (pattern.test(id)) return { skip: true, reason: `pattern: ${pattern}` };
  }

  return { skip: false };
}

// ── Load existing polity IDs ────────────────────────────────────────────────

function loadCsvIds() {
  const content = fs.readFileSync(CSV_PATH, 'utf8');
  return new Set(
    content.trim().split('\n').slice(1)
      .map(l => l.split(',')[0].trim().replace(/^"|"$/g, ''))
      .filter(Boolean)
  );
}

// ── Scan history panels ─────────────────────────────────────────────────────

function scanPanels() {
  const polityInfo = new Map(); // id → { labels, panels }

  function walk(dir, prefix) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      if (f.isDirectory()) {
        walk(path.join(dir, f.name), prefix ? `${prefix}/${f.name}` : f.name);
      } else if (f.name.endsWith('.json')) {
        const panelId = prefix
          ? `${prefix}/${f.name.replace('.json', '')}`
          : f.name.replace('.json', '');
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dir, f.name), 'utf8'));
          for (const row of data.rows || []) {
            function process(cell) {
              if (!cell.regime) return;
              if (!polityInfo.has(cell.regime)) {
                polityInfo.set(cell.regime, { labels: new Set(), panels: new Set() });
              }
              const info = polityInfo.get(cell.regime);
              if (cell.label) info.labels.add(cell.label);
              info.panels.add(panelId);
            }
            for (const cell of row.cells || []) {
              process(cell);
              for (const s of cell.stack || []) process(s);
              for (const s of cell.split || []) process(s);
            }
          }
        } catch { /* skip malformed */ }
      }
    }
  }

  walk(HISTORY_DIR, '');
  return polityInfo;
}

// ── Clean label for CSV name field ──────────────────────────────────────────

function cleanName(label) {
  return label
    .replace(/\s*[—–]\s+.*$/, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*[·]\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim();
}

function esc(val) {
  if (!val) return '';
  val = String(val);
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const csvIds = loadCsvIds();
  const polityInfo = scanPanels();

  console.log(`Existing polities in CSV: ${csvIds.size}`);
  console.log(`Unique regime IDs in panels: ${polityInfo.size}`);

  // Separate missing IDs into polity vs non-polity
  const missing = [];
  const skipped = [];

  for (const [id, info] of polityInfo) {
    if (csvIds.has(id)) continue;
    if (info.panels.size < minPanels) continue;

    const check = isNonPolity(id);
    if (check.skip) {
      skipped.push({ id, reason: check.reason, panels: info.panels.size });
    } else {
      missing.push({
        id,
        name: cleanName([...info.labels][0] || id.replace(/_/g, ' ')),
        panels: info.panels.size,
        panelList: [...info.panels].sort(),
      });
    }
  }

  missing.sort((a, b) => b.panels - a.panels);
  skipped.sort((a, b) => b.panels - a.panels);

  // Report skipped non-polities
  if (skipped.length) {
    console.log(`\n── Skipped (non-polity): ${skipped.length} ──`);
    for (const s of skipped) {
      console.log(`  ✗ ${s.id} (${s.panels} panels) — ${s.reason}`);
    }
  }

  // Report missing polities
  console.log(`\n── Missing polities (${minPanels}+ panels): ${missing.length} ──`);
  for (const m of missing) {
    console.log(`  ${m.id} (${m.panels} panels) — ${m.name}`);
    console.log(`    panels: ${m.panelList.join(', ')}`);
  }

  // Write mode
  if (writeMode && missing.length > 0) {
    // header: id,name,state_id,id_ruling_ethnicity,id_ruling_language,id_ruling_religion,government,territories,start,end,policies,note
    const stubs = missing.map(m => {
      return [m.id, esc(m.name), '', '', '', '', '', '', '', '', '', ''].join(',');
    });
    fs.appendFileSync(CSV_PATH, '\n' + stubs.join('\n'));
    console.log(`\n✓ Appended ${stubs.length} stub rows to polity.csv`);
    console.log('  Fill in ethnicity/language/religion/government/dates before running make:all');
  } else if (!writeMode && missing.length > 0) {
    console.log(`\nRun with --write to append ${missing.length} stubs to polity.csv`);
  }

  // Summary
  console.log(`\n── Summary ──`);
  console.log(`  Already in CSV: ${csvIds.size}`);
  console.log(`  Missing polities: ${missing.length}`);
  console.log(`  Skipped non-polities: ${skipped.length}`);
}

main();
