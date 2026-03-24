#!/usr/bin/env node
/**
 * One-shot script: add `founded` and (where applicable) `schism` fields
 * to every religion JSON file.
 *
 * founded: integer year (negative = BCE), or "prehistoric" for pre-recorded-history traditions.
 * schism:  short string describing the council/event that created this branch (branch nodes only).
 */

const fs   = require('fs');
const path = require('path');

// id → { founded, schism? }
const DATES = {
  // ── Root-level ────────────────────────────────────────────────────────────
  mesopotamian_religion: { founded: 'prehistoric' },
  anatolian_paganism:    { founded: 'prehistoric' },
  egyptian_religion:     { founded: 'prehistoric' },
  canaanite_religion:    { founded: 'prehistoric' },
  manichaeism:           { founded: 216 },  // Mani born 216 CE

  // ── Abrahamic ─────────────────────────────────────────────────────────────
  abrahamic:       { founded: null },   // category only
  judaism:         { founded: -1200 },  // emergence of Israelite monotheism (~1200 BCE)
  temple_judaism:  { founded: -970 },   // Solomon's Temple ~970 BCE
  rabbinic_judaism:{ founded: 70  },    // destruction of Second Temple

  christianity:       { founded: 30 },
  early_christianity: { founded: 30 },

  // Christological schisms — structural parent remains Christianity
  church_of_east:    { founded: 431, schism: 'Council of Ephesus (431) — rejected Theotokos' },
  oriental_orthodox: { founded: 451, schism: 'Council of Chalcedon (451) — rejected two-nature Christology' },
  eastern_orthodox:  { founded: 1054, schism: 'Great Schism (1054) — split from Rome over papal primacy & filioque' },
  catholic:          { founded: 1054, schism: 'Great Schism (1054) — split from Constantinople over papal primacy & filioque' },
  protestant:        { founded: 1517, schism: "Protestant Reformation — Luther's 95 Theses (1517)" },

  // Oriental Orthodox churches
  armenian_apostolic:  { founded: 301  },  // Gregory the Illuminator
  coptic_church:       { founded: 42   },  // traditionally Saint Mark in Alexandria
  ethiopian_tewahido:  { founded: 340  },  // Aksumite conversion, Frumentius
  eritrean_tewahido:   { founded: 1993 },  // split from Ethiopian on Eritrean independence

  // Eastern Orthodox churches
  greek_orthodox:    { founded: 1054 },  // Ecumenical Patriarchate, Great Schism era
  bulgarian_orthodox:{ founded: 870  },  // Tsar Boris I's conversion
  georgian_orthodox: { founded: 337  },  // Saint Nino, before Roman imperial conversion
  serbian_orthodox:  { founded: 1219 },  // Saint Sava
  russian_orthodox:  { founded: 988  },  // Baptism of Kievan Rus, Vladimir I
  romanian_orthodox: { founded: 1885 },  // granted autocephaly

  // Protestant denominations
  lutheranism:  { founded: 1517 },
  calvinism:    { founded: 1536 },  // Calvin's Institutes
  anglicanism:  { founded: 1534 },  // Henry VIII's break with Rome
  baptist:      { founded: 1609 },
  methodism:    { founded: 1739 },  // John Wesley's revival movement
  evangelical:  { founded: 1730 },  // First Great Awakening

  // Church of the East
  assyrian_church: { founded: 431 },  // continuation of pre-Ephesus tradition

  // Islam
  islam:  { founded: 622 },  // Hijra (officially marks the Islamic calendar)
  sunni:  { founded: 661, schism: 'First Fitna (656–661) — disputed succession, majority followed Muawiyah' },
  shia:   { founded: 680, schism: 'Battle of Karbala (680) — martyrdom of Husayn ibn Ali' },
  ibadi:  { founded: 657, schism: 'Battle of Siffin (657) — early secession, pre-dates Sunni/Shia split' },

  shia_twelver: { founded: 874 },  // occultation of the 12th Imam
  shia_ismaili: { founded: 765, schism: 'Succession dispute over 7th Imam (765)' },
  shia_zaydi:   { founded: 740, schism: "Zayd ibn Ali's revolt (740)" },

  sunni_hanafi: { founded: 767 },  // Abu Hanifa died 767; school formalized ~750s
  sunni_maliki: { founded: 795 },  // Malik ibn Anas died 795
  sunni_shafi:  { founded: 820 },  // Al-Shafi'i died 820
  sunni_hanbali:{ founded: 855 },  // Ahmad ibn Hanbal died 855

  // ── Dharmic ───────────────────────────────────────────────────────────────
  dharmic:   { founded: null },     // category only
  hinduism:  { founded: 'prehistoric' },  // Vedic roots ~1500 BCE, pre-historical origins
  shaivism:  { founded: -200 },     // early systematic Shaivite texts
  vaishnavism:{ founded: -400 },    // Pancharatra / Bhagavata traditions

  buddhism:  { founded: -528 },     // Siddhartha's enlightenment, traditional date
  theravada: { founded: -250 },     // Third Buddhist Council under Ashoka
  mahayana:  { founded: -100 },     // earliest Mahayana sutras ~100 BCE
  vajrayana: { founded: 600  },     // Tantric Buddhism, ~7th century CE
  chan_zen:   { founded: 520  },    // Bodhidharma's arrival in China

  jainism:   { founded: -599 },     // Mahavira born 599 BCE (24th Tirthankara)
  sikhism:   { founded: 1469 },     // Guru Nanak born 1469

  // ── East Asian ────────────────────────────────────────────────────────────
  east_asian_traditions: { founded: null },  // category only
  confucianism:          { founded: -551 },  // Confucius born 551 BCE
  neo_confucianism:      { founded: 1000 },  // Song dynasty synthesis (Zhou Dunyi ~1017)
  taoism:                { founded: -600 },  // traditional dating of Laozi / Tao Te Ching
  chinese_folk_religion: { founded: 'prehistoric' },
  legalism:              { founded: -356 },  // Shang Yang's reforms in Qin, ~356 BCE

  shinto:                { founded: 'prehistoric' },
  shinto_buddhism:       { founded: 594 },   // Buddhism officially adopted, Prince Shotoku
  neo_confucianism_shinto: { founded: 1603 }, // Edo / Tokugawa period
  state_shinto:          { founded: 1868 },  // Meiji Restoration

  // ── Hellenic ──────────────────────────────────────────────────────────────
  hellenic_paganism: { founded: 'prehistoric' },
  roman_paganism:    { founded: 'prehistoric' },  // roots prehistoric; traditional Rome founding -753

  // ── Zoroastrianism ────────────────────────────────────────────────────────
  zoroastrianism: { founded: -1000 },  // disputed; Gathas dated ~1200–1000 BCE
  zurvanism:      { founded: 300 },    // distinct heresy emerges in Sassanid period

  // ── Animism / Shamanism ───────────────────────────────────────────────────
  animism:           { founded: 'prehistoric' },
  tengriism:         { founded: 'prehistoric' },
  germanic_paganism: { founded: 'prehistoric' },
  celtic_paganism:   { founded: 'prehistoric' },
  arabian_paganism:  { founded: 'prehistoric' },
  slavic_paganism:   { founded: 'prehistoric' },
  lithuanian_paganism:{ founded: 'prehistoric' },
  manchu_shamanism:  { founded: 'prehistoric' },
};

function processFile(filePath) {
  const raw  = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw.replace(/\/\/[^\n]*/g, ''));
  const entry = DATES[data.id];
  if (!entry) {
    console.warn(`  SKIP (no entry): ${data.id}  (${filePath})`);
    return;
  }
  if (entry.founded === null) {
    // Category node — no founded date
    return;
  }
  let changed = false;
  if (!('founded' in data)) {
    data.founded = entry.founded;
    changed = true;
  }
  if (entry.schism && !('schism' in data)) {
    data.schism = entry.schism;
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`  updated: ${data.id}`);
  } else {
    console.log(`  already has dates: ${data.id}`);
  }
}

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())            walkDir(full);
    else if (entry.name.endsWith('.json')) processFile(full);
  }
}

const religionsDir = path.join(__dirname, '../data/religions');
console.log('Adding founded/schism dates to religions…');
walkDir(religionsDir);
console.log('Done.');
