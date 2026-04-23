#!/usr/bin/env node
/**
 * bootstrap_regimes_csv.js — ONE-TIME script
 *
 * Reads legacy multi-regime JSON files from data/regimes/ and merges them
 * into csvs/regimes.csv, replacing stale numeric IDs with proper string IDs.
 * Also creates csvs/figures.csv with one row per figure from the legacy files.
 *
 * Direction: JSON → CSV (reverse of normal flow)
 * Run once, then use code/makejson/regimes.js (CSV → JSON) going forward.
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.join(__dirname, '..');
const DATA_DIR    = path.join(ROOT, 'data/regimes');
const CSV_DIR     = path.join(ROOT, 'csvs');
const REGIMES_CSV = path.join(CSV_DIR, 'regimes.csv');
const FIGURES_CSV = path.join(CSV_DIR, 'figures.csv');

// ── CSV helpers ───────────────────────────────────────────────────────────────

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // escaped quote inside quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  }).filter(r => r.id);
}

/**
 * Quote a single CSV field value.
 * Wraps in double-quotes if the value contains comma, newline, or double-quote.
 * Escapes embedded double-quotes by doubling them.
 */
function csvField(value) {
  if (value == null) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvRow(fields) {
  return fields.map(csvField).join(',');
}

// ── Load legacy JSON files ────────────────────────────────────────────────────

function loadLegacyRegimes() {
  const byId = new Map();
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.warn(`  ⚠ Could not parse ${file}: ${e.message}`);
      continue;
    }

    // Legacy files are arrays; single-regime files may be objects (future)
    const regimes = Array.isArray(data) ? data : [data];
    for (const r of regimes) {
      if (r.id) {
        byId.set(r.id, { regime: r, sourceFile: file });
      }
    }
  }
  return byId;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  console.log('Reading legacy JSON files from data/regimes/...');
  const legacyById = loadLegacyRegimes();
  console.log(`  Loaded ${legacyById.size} legacy regimes\n`);

  console.log(`Reading existing CSV: ${REGIMES_CSV}`);
  const csvContent = fs.readFileSync(REGIMES_CSV, 'utf8');
  const csvRows = parseCSV(csvContent);
  const csvById = new Map(csvRows.map(r => [r.id, r]));
  console.log(`  Found ${csvRows.length} existing CSV rows\n`);

  // Output column order
  const HEADERS = [
    'id', 'name', 'state_id',
    'id_ruling_ethnicity', 'id_ruling_language', 'id_ruling_religion',
    'government', 'territories', 'start_year', 'end_year', 'policies', 'note'
  ];

  // Build the merged rows
  const outputRows = [];
  const figureRows = [];

  // Track which legacy regimes are new (not in CSV)
  const newRegimes = [];

  // Process existing CSV rows first (preserve order)
  for (const csvRow of csvRows) {
    const legacy = legacyById.get(csvRow.id);
    if (legacy) {
      const r = legacy.regime;

      // Extract policies: if array of objects use their IDs pipe-joined,
      // if already a string use as-is
      let policiesStr = '';
      if (Array.isArray(r.policies) && r.policies.length > 0) {
        policiesStr = r.policies
          .map(p => (typeof p === 'object' ? p.id : p))
          .filter(Boolean)
          .join('|');
      }

      // Extract territories
      const territoriesStr = Array.isArray(r.territories)
        ? r.territories.filter(Boolean).join('|')
        : '';

      const merged = {
        id:                   r.id,
        name:                 r.name || csvRow.name || '',
        state_id:             csvRow.state_id || '',
        id_ruling_ethnicity:  r.ruling_ethnicity || '',
        id_ruling_language:   r.cultural_language || '',
        id_ruling_religion:   r.ideology?.religion || '',
        government:           r.ideology?.government || '',
        territories:          territoriesStr,
        start_year:           r.start != null ? String(r.start) : csvRow.start_year || '',
        end_year:             r.end   != null ? String(r.end)   : csvRow.end_year   || '',
        policies:             policiesStr,
        note:                 r.note  || '',
      };
      outputRows.push(merged);

      // Collect figures
      if (Array.isArray(r.figures)) {
        for (const fig of r.figures) {
          figureRows.push({
            polity_id:    r.id,
            figure_id:    fig.id || '',
            name:         fig.name || '',
            role:         fig.role || '',
            years:        fig.years || '',
            significance: fig.significance || '',
          });
        }
      }
    } else {
      // CSV-only row (e.g. soviet_union, nazi_germany) — preserve as-is
      // Map old columns to new column set, filling new columns with empty strings
      const preserved = {
        id:                   csvRow.id,
        name:                 csvRow.name || '',
        state_id:             csvRow.state_id || '',
        id_ruling_ethnicity:  csvRow.id_ruling_ethnicity || '',
        id_ruling_language:   csvRow.id_ruling_language || '',
        id_ruling_religion:   csvRow.id_ruling_religion || '',
        government:           csvRow.government || '',
        territories:          csvRow.territories || '',
        start_year:           csvRow.start_year || '',
        end_year:             csvRow.end_year || '',
        policies:             csvRow.policies || '',
        note:                 csvRow.note || '',
      };
      outputRows.push(preserved);
    }
  }

  // Add legacy regimes that are NOT in the CSV (new rows)
  for (const [id, { regime: r }] of legacyById) {
    if (!csvById.has(id)) {
      newRegimes.push(id);
      console.log(`  + Adding new regime to CSV: ${id}`);

      let policiesStr = '';
      if (Array.isArray(r.policies) && r.policies.length > 0) {
        policiesStr = r.policies
          .map(p => (typeof p === 'object' ? p.id : p))
          .filter(Boolean)
          .join('|');
      }

      const territoriesStr = Array.isArray(r.territories)
        ? r.territories.filter(Boolean).join('|')
        : '';

      outputRows.push({
        id:                   r.id,
        name:                 r.name || '',
        state_id:             '',
        id_ruling_ethnicity:  r.ruling_ethnicity || '',
        id_ruling_language:   r.cultural_language || '',
        id_ruling_religion:   r.ideology?.religion || '',
        government:           r.ideology?.government || '',
        territories:          territoriesStr,
        start_year:           r.start != null ? String(r.start) : '',
        end_year:             r.end   != null ? String(r.end)   : '',
        policies:             policiesStr,
        note:                 r.note || '',
      });

      // Collect figures for new regimes too
      if (Array.isArray(r.figures)) {
        for (const fig of r.figures) {
          figureRows.push({
            polity_id:    r.id,
            figure_id:    fig.id || '',
            name:         fig.name || '',
            role:         fig.role || '',
            years:        fig.years || '',
            significance: fig.significance || '',
          });
        }
      }
    }
  }

  // ── Write regimes.csv ──────────────────────────────────────────────────────
  const regimesCsvLines = [HEADERS.join(',')];
  for (const row of outputRows) {
    regimesCsvLines.push(csvRow(HEADERS.map(h => row[h] ?? '')));
  }
  const regimesCsvContent = regimesCsvLines.join('\n') + '\n';
  fs.writeFileSync(REGIMES_CSV, regimesCsvContent, 'utf8');
  console.log(`\nWrote ${outputRows.length} rows to ${REGIMES_CSV}`);

  // ── Write figures.csv ──────────────────────────────────────────────────────
  const figHeaders = ['polity_id', 'figure_id', 'name', 'role', 'years', 'significance'];
  const figuresCsvLines = [figHeaders.join(',')];
  for (const fig of figureRows) {
    figuresCsvLines.push(csvRow(figHeaders.map(h => fig[h] ?? '')));
  }
  const figuresCsvContent = figuresCsvLines.join('\n') + '\n';
  fs.writeFileSync(FIGURES_CSV, figuresCsvContent, 'utf8');
  console.log(`Wrote ${figureRows.length} figure rows to ${FIGURES_CSV}`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const csvOnlyCount = csvRows.filter(r => !legacyById.has(r.id)).length;
  console.log(`\n=== Summary ===`);
  console.log(`  Legacy regimes merged: ${legacyById.size - newRegimes.length} (updated in CSV)`);
  console.log(`  New regimes added:     ${newRegimes.length}`);
  console.log(`  CSV-only rows kept:    ${csvOnlyCount}`);
  console.log(`  Total CSV rows:        ${outputRows.length}`);
  console.log(`  Total figures:         ${figureRows.length}`);
  if (newRegimes.length > 0) {
    console.log(`  New regime IDs: ${newRegimes.join(', ')}`);
  }
}

main();
