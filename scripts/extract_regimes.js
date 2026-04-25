#!/usr/bin/env node
// ============================================================
// Extract & categorize all labels from history panel JSONs
// Outputs: csvs/panel_labels.csv
// Usage: node scripts/extract_regimes.js
// ============================================================

const fs = require('fs');
const path = require('path');

const HISTORY_DIR = path.join(__dirname, '..', 'data', 'history');
const OUT_FILE = path.join(__dirname, '..', 'csvs', 'panel_labels.csv');

// Load existing polity IDs for matching
const polityCSV = fs.readFileSync(path.join(__dirname, '..', 'csvs', 'polity.csv'), 'utf8');
const existingPolityIds = new Set(
  polityCSV.split('\n').slice(1).filter(Boolean).map(line => line.split(',')[0])
);

// ─── CATEGORIZATION RULES ─────────────────────────────────

const POLITY_PATTERNS = [
  /\b(kingdom|empire|sultanate|caliphate|khanate|khaganate|kaghanate|emirate|shogunate)\b/i,
  /\b(republic|duchy|principality|county|margraviate|landgraviate|barony)\b/i,
  /\b(confederation|commonwealth|federation|league|union)\b/i,
  /\b(city[- ]state|free city|papal state|theocracy|papal)\b/i,
  /\b(raj|vijayanagara|majapahit|srivijaya|champa|dai viet|ayutthaya)\b/i,
  /\b(colony|protectorate|mandate|colonial|dominion)\b/i,
  /\b(voivodeship|despotate|exarchate|theme|banate|beylik|beyliks)\b/i,
  /\b(taifa|imamate|pashalik|vilayet|eyalet|governorate)\b/i,
  /SSR\b/,  // matches UkrSSR, BSSR, etc.
  /\b(autonomous region|autonomous republic|autonomous oblast)\b/i,
  /\b(condominium|administration|administered)\b/i,
  /\b(catepanate|march of|marca|archbishopric|bishopric)\b/i,
  /\b(daimyo|han\b|bakufu|regnum|civitas)\b/i,
  /\b(oblast|okrug|krai|raion)\b/i,
  /\b(reichskommissariat|generalgouvernement|banovina)\b/i,
  /\b(city[- ]states)\b/i,
  /\b(roman|byzantine|carthaginian|venetian|genoese)\s+\w/i,  // Roman X, Byzantine X
  /\b(portuguese|spanish|italian|french|british|dutch|german)\s+(east|west|north|south|central)/i,
  /\b(estado da|capitania)\b/i,
  /\bstate\b/i,
];

const DYNASTY_PATTERNS = [
  /\bdynasty\b/i,
  /\bhouse of\b/i,
  /\bclan\b/i,
  /\bregency\b/i,
  /\brestoration\b/i,
  /\bruling\b/i,
  /\b(vassal|tributary|puppet|client)\b/i,
  /\b(governors?|wali|bey)\b/i,
  /\b(bourbon|habsburg|hohenzollern|romanov|tudor|stuart|valois|capetian|carolingian|merovingian)\b/i,
  /\b(umayyad|abbasid|fatimid|ayyubid|mamluk|safavid|qajar|pahlavi)\b/i,
  /\b(ming|qing|tang|song|sui|han|yuan|jin|liao|wei|zhou)\b/i,
  /\b(seljuk|ghaznavid|ghurid|timurid|samanid|tahirid|buyid|zand|afsharid)\b/i,
  /\b(mughal|maratha|chola|pallava|chalukya|rashtrakuta|hoysala|kakatiya|pandya)\b/i,
  /\b(joseon|goryeo|baekje|silla|goguryeo|balhae)\b/i,
  /\b(hotaki|durrani|barakzai|sadozai)\b/i,
  /\b(almoravid|almohad|marinid|wattasid|saadi|alaouite|hafsid|zayyanid|zirid|hammadid)\b/i,
  /\b(chobanid|jalayirid|muzaffarid|kartid|injuid)\b/i,
  /\b(ak koyunlu|kara koyunlu|aq qoyunlu|qara qoyunlu)\b/i,
  /\b(diadochi|alexander the great|alexander)\b/i,
  /\b(sassanid|sasanian|kushano)\b/i,
  /\b(ikshvaku|satavahana|shunga|kanva|nanda|maurya|gupta)\b/i,
  /\b(melikdom|atabeg|atabegate)\b/i,
  /\b(regime)\b/i,
];

const CULTURE_PATTERNS = [
  /\b(culture|civilization|neolithic|paleolithic|mesolithic|chalcolithic)\b/i,
  /\b(bronze age|iron age|megalithic|archaeological)\b/i,
  /\b(jōmon|yayoi|kofun|gusuku|lapita|corded ware|bell beaker)\b/i,
  /\b(yangshao|longshan|hemudu|liangzhu|erlitou|majiayao)\b/i,
  /\b(hallstatt|la tène|cucuteni|vinča|starčevo)\b/i,
  /\b(oldowan|acheulean|mousterian|aurignacian|magdalenian|gravettian)\b/i,
  /\b(pre-pottery|pottery|ceramic|lithic)\b/i,
];

const PEOPLE_PATTERNS = [
  /\bpeople[s]?\b/i,
  /\btribe[s]?\b/i,
  /\btribal\b/i,
  /\bchiefs\b/i,
  /\b(gauls?|celts?|celtic|germanic|slavic|turkic)\b/i,
  /\b(berbers?|bedouin|nomad[s]?|pastoral)\b/i,
  /\b(emishi|ezo|ainu|hayato|kumaso|ryukyuan)\b/i,
  /\b(scythian[s]?|sarmatian[s]?|cimmerian[s]?|xiongnu|wusun|yuezhi|tocharian)\b/i,
  /\b(neanderthal|homo sapiens|early.*farmers)\b/i,
  /\b(huns?|hunnic|hephthalite|kidarite|alchon|xionite)\b/i,
  /\b(alans?|avars?|goths?|gothic|vandals?|lombard|suevi|suebi)\b/i,
  /\b(cumans?|kipchak|pecheneg|bulgar|khazar)\b/i,
  /\b(rouran|turgesh|karluk|oghuz|uyghur)\b/i,
  /\b(cuman|illyrian|thracian|dacian|phrygian|lydian|carian)\b/i,
  /\b(adivasi|indigenous|aboriginal)\b/i,
  /\b(settling|settlers|settlement)\b/i,
  /\b(pastoralist|nomadic)\b/i,
  /\b(uriankhai|khalkha|dzungar|oirat|chagatai|nogai)\b/i,
  /^[A-Z][a-z]+$/, // single-word proper nouns (often ethnic labels)
];

const EVENT_PATTERNS = [
  /\b(migration[s]?|collapse|invasion|conquest|war[s]?|battle|siege|revolt|rebellion)\b/i,
  /\b(dark ages?|interregnum|anarchy|chaos|fragmentation|disunity)\b/i,
  /\b(depopulation|famine|plague|unification|reunification)\b/i,
  /\b(christianization|islamization|conversion|arabization)\b/i,
  /\b(occupation|partition|annexation|independence|liberat)\b/i,
  /\b(raids?|expansion|crusade|inquisition)\b/i,
  /\b(age of|begins?|ends?|returned|fall of|rise of|golden age)\b/i,
  /\b(member|joins|accession|admitted|entry)\b/i,
  /\b(treaty|peace|armistice|ceasefire|accord)\b/i,
  /\b(revolution|uprising|insurrection|insurgency|civil war)\b/i,
  /\b(restored|restores|reforms?|modernization)\b/i,
  /\b(outside.*control|under.*control|controlled by|ruled by)\b/i,
  /\b(vespers|crisis|decline|declining|forming)\b/i,
  /\b(fully french|fully|returned to)\b/i,
  /→/,  // transitional labels like "X → Y → Z"
  /\b(exile|diaspora|persecution)\b/i,
  /\b(period|era)\b/i,  // "Sanzan period", "Isin-Larsa period"
  /\b(autonomy|neutrality|guaranteed)\b/i,
  /\b(controversies|gold|policy|compromise)\b/i,
];

function categorize(label, note) {
  const text = `${label} ${note || ''}`;

  // Bare "?" or empty → event/unknown
  if (/^\?+$/.test(label.trim())) return 'event';

  // Check patterns in priority order
  // 1. Culture (prehistoric/archaeological take priority)
  for (const pat of CULTURE_PATTERNS) {
    if (pat.test(text)) return 'culture';
  }

  // 2. People/ethnic (before polity, since "X people" shouldn't match polity)
  if (/\bpeople[s]?\b/i.test(label) || /\btribe[s]?\b/i.test(label)) return 'people';

  // 3. Dynasty/regime (within a polity)
  for (const pat of DYNASTY_PATTERNS) {
    if (pat.test(label)) return 'regime';
  }

  // 4. Polity (political entity)
  for (const pat of POLITY_PATTERNS) {
    if (pat.test(label)) return 'polity';
  }

  // 5. Event/description
  for (const pat of EVENT_PATTERNS) {
    if (pat.test(text)) return 'event';
  }

  // 6. People (broader check)
  for (const pat of PEOPLE_PATTERNS) {
    if (pat.test(label)) return 'people';
  }

  // 7. Default — unclassified (needs manual review)
  return 'unclassified';
}

function toSnakeCase(str) {
  return str
    .replace(/[()（）【】「」\[\]]/g, '')
    .replace(/[—–·:;,!?'"]/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// ─── EXTRACT LABELS ───────────────────────────────────────

function extractLabels(panelPath) {
  const panel = JSON.parse(fs.readFileSync(panelPath, 'utf8'));
  const panelId = panel.id;
  const labels = [];

  // Build column index (skip era columns)
  const dataCols = panel.columns.filter(c => c.type !== 'era');

  for (let rowIdx = 0; rowIdx < panel.rows.length; rowIdx++) {
    const row = panel.rows[rowIdx];
    const era = row.era ? row.era.label : null;
    const cells = row.cells || [];

    let colOffset = 0;
    for (let cellIdx = 0; cellIdx < cells.length; cellIdx++) {
      const cell = cells[cellIdx];
      const columnId = dataCols[colOffset] ? dataCols[colOffset].id : `col_${colOffset}`;
      const span = cell.span || 1;

      // Cell can have a stack (array) or be a single item
      const items = cell.stack || [cell];

      for (let stackIdx = 0; stackIdx < items.length; stackIdx++) {
        const item = items[stackIdx];
        if (!item.label) continue;

        labels.push({
          panel_id: panelId,
          column_id: columnId,
          row_index: rowIdx,
          stack_index: stackIdx,
          era: era || '',
          label: item.label,
          note: item.note || '',
          span: span,
          existing_polity_link: item.regime || '',
          category: '', // filled below
          suggested_id: '',
        });
      }

      colOffset += span;
    }
  }

  return labels;
}

// ─── MAIN ─────────────────────────────────────────────────

function findPanelFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPanelFiles(full));
    } else if (entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

const panelFiles = findPanelFiles(HISTORY_DIR);
const allLabels = [];

for (const file of panelFiles) {
  allLabels.push(...extractLabels(file));
}

// Categorize
for (const entry of allLabels) {
  if (entry.existing_polity_link) {
    entry.category = 'linked';
  } else {
    entry.category = categorize(entry.label, entry.note);
  }
  entry.suggested_id = toSnakeCase(entry.label.split('—')[0].trim());
}

// ─── OUTPUT CSV ───────────────────────────────────────────

const headers = [
  'panel_id', 'column_id', 'row_index', 'stack_index', 'era',
  'label', 'note', 'span', 'existing_polity_link', 'category', 'suggested_id'
];

function escapeCSV(val) {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const lines = [headers.join(',')];
for (const entry of allLabels) {
  lines.push(headers.map(h => escapeCSV(entry[h])).join(','));
}

fs.writeFileSync(OUT_FILE, lines.join('\n') + '\n');

// ─── SUMMARY ──────────────────────────────────────────────

const counts = {};
for (const entry of allLabels) {
  counts[entry.category] = (counts[entry.category] || 0) + 1;
}

console.log(`\nExtracted ${allLabels.length} labels from ${panelFiles.length} panels\n`);
console.log('Category breakdown:');
for (const [cat, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat.padEnd(16)} ${count}`);
}

// Deduplicated unique labels
const uniqueLabels = new Map();
for (const entry of allLabels) {
  if (!uniqueLabels.has(entry.label)) {
    uniqueLabels.set(entry.label, { ...entry, panel_count: 1 });
  } else {
    uniqueLabels.get(entry.label).panel_count++;
  }
}

console.log(`\nUnique labels: ${uniqueLabels.size}`);

// Show cross-panel entities (appear in multiple panels)
const crossPanel = [...uniqueLabels.values()]
  .filter(e => e.panel_count > 1)
  .sort((a, b) => b.panel_count - a.panel_count);

if (crossPanel.length > 0) {
  console.log(`\nCross-panel entities (${crossPanel.length} labels appear in 2+ panels):`);
  for (const e of crossPanel.slice(0, 25)) {
    console.log(`  ${e.panel_count}x  ${e.label} [${e.category}]`);
  }
  if (crossPanel.length > 25) console.log(`  ... and ${crossPanel.length - 25} more`);
}

console.log(`\nOutput: ${OUT_FILE}`);
