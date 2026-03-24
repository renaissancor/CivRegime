#!/usr/bin/env node
/**
 * Completely rewrites data/languages/ with a strict 4-level taxonomy:
 *   Family → Branch → Group → Language
 *
 * Historical ancestor languages form parent-child chains within the tree.
 * attested: integer year (negative = BCE), null = reconstructed/unknown.
 * extinct: boolean.
 * type: "family" | "branch" | "group" | "language"
 */

const fs   = require('fs');
const path = require('path');

// ──────────────────────────────────────────────────────────────────────────────
// TREE DEFINITION
// Children array implies subdirectory; no children → leaf file.
// ──────────────────────────────────────────────────────────────────────────────

const TREE = [
  // ════════════════════════════════════════════════════════════
  // INDO-EUROPEAN
  // ════════════════════════════════════════════════════════════
  { id: 'indo_european', name: 'Indo-European', type: 'family',
    attested: -2000, extinct: false,
    note: 'Largest language family by number of native speakers; descended from reconstructed Proto-Indo-European.',
    children: [

      // ── Anatolian ──
      { id: 'anatolian', name: 'Anatolian', type: 'branch',
        attested: -1700, extinct: true,
        note: 'Earliest attested IE branch; all languages extinct by late antiquity.',
        children: [
          { id: 'hittite', name: 'Hittite', type: 'language',
            attested: -1700, extinct: true,
            note: 'Language of the Hittite Empire; oldest attested IE language.' },
          { id: 'luwian', name: 'Luwian', type: 'language',
            attested: -1400, extinct: true },
          { id: 'lydian', name: 'Lydian', type: 'language',
            attested: -700, extinct: true },
        ]
      },

      // ── Hellenic ──
      { id: 'hellenic', name: 'Hellenic', type: 'branch',
        attested: -1450, extinct: false,
        children: [
          { id: 'mycenaean_greek', name: 'Mycenaean Greek', type: 'language',
            attested: -1450, extinct: true,
            note: 'Linear B script; earliest attested Greek.' },
          { id: 'ancient_greek', name: 'Ancient Greek', type: 'language',
            attested: -800, extinct: true,
            note: 'Archaic and Classical periods (~800–300 BCE); parent of Koine.' },
          { id: 'koine_greek', name: 'Koine Greek', type: 'language',
            attested: -300, extinct: true,
            note: 'Common dialect of the Hellenistic period; language of the New Testament.' },
          { id: 'byzantine_greek', name: 'Byzantine Greek', type: 'language',
            attested: 330, extinct: true,
            note: 'Medieval Greek used in the Byzantine Empire.' },
          { id: 'modern_greek', name: 'Modern Greek', type: 'language',
            attested: 1100, extinct: false,
            note: 'Descended from Koine via Byzantine Greek.' },
        ]
      },

      // ── Italic ──
      { id: 'italic', name: 'Italic', type: 'branch',
        attested: -700, extinct: false,
        children: [
          { id: 'latin', name: 'Latin', type: 'language',
            attested: -700, extinct: true,
            note: 'Language of Rome; parent of all Romance languages.' },
          { id: 'vulgar_latin', name: 'Vulgar Latin', type: 'language',
            attested: 200, extinct: true,
            note: 'Spoken Latin of the late Empire; direct ancestor of Romance.' },
          { id: 'romance', name: 'Romance Group', type: 'group',
            attested: 800, extinct: false,
            children: [
              { id: 'old_french', name: 'Old French', type: 'language',
                attested: 842, extinct: true,
                note: 'Strasbourg Oaths (842) are the earliest Romance text.' },
              { id: 'french', name: 'French', type: 'language',
                attested: 1200, extinct: false },
              { id: 'old_spanish', name: 'Old Spanish', type: 'language',
                attested: 900, extinct: true },
              { id: 'spanish', name: 'Spanish (Castilian)', type: 'language',
                attested: 1200, extinct: false },
              { id: 'portuguese', name: 'Portuguese', type: 'language',
                attested: 1200, extinct: false },
              { id: 'italian', name: 'Italian', type: 'language',
                attested: 960, extinct: false,
                note: 'Placiti Cassinesi (960) are the earliest Italian documents.' },
              { id: 'romanian', name: 'Romanian', type: 'language',
                attested: 1521, extinct: false },
              { id: 'catalan', name: 'Catalan', type: 'language',
                attested: 1000, extinct: false },
            ]
          },
          { id: 'oscan', name: 'Oscan', type: 'language',
            attested: -400, extinct: true,
            note: 'Italic language of the Samnites; extinct by 1st century CE.' },
        ]
      },

      // ── Germanic ──
      { id: 'germanic', name: 'Germanic', type: 'branch',
        attested: -200, extinct: false,
        children: [
          { id: 'proto_germanic', name: 'Proto-Germanic', type: 'language',
            attested: null, extinct: true,
            note: 'Reconstructed ancestor; spoken ~500 BCE – 200 CE.' },
          { id: 'west_germanic', name: 'West Germanic', type: 'group',
            attested: 200, extinct: false,
            children: [
              { id: 'old_high_german', name: 'Old High German', type: 'language',
                attested: 750, extinct: true },
              { id: 'middle_high_german', name: 'Middle High German', type: 'language',
                attested: 1050, extinct: true },
              { id: 'german', name: 'German', type: 'language',
                attested: 1350, extinct: false },
              { id: 'yiddish', name: 'Yiddish', type: 'language',
                attested: 1200, extinct: false,
                note: 'Germanic language with heavy Hebrew/Slavic influence.' },
              { id: 'old_english', name: 'Old English (Anglo-Saxon)', type: 'language',
                attested: 600, extinct: true },
              { id: 'middle_english', name: 'Middle English', type: 'language',
                attested: 1100, extinct: true },
              { id: 'english', name: 'English', type: 'language',
                attested: 1400, extinct: false },
              { id: 'old_dutch', name: 'Old Dutch', type: 'language',
                attested: 900, extinct: true },
              { id: 'dutch', name: 'Dutch', type: 'language',
                attested: 1200, extinct: false },
              { id: 'frisian', name: 'Frisian', type: 'language',
                attested: 1300, extinct: false },
            ]
          },
          { id: 'north_germanic', name: 'North Germanic (Norse)', type: 'group',
            attested: 200, extinct: false,
            children: [
              { id: 'proto_norse', name: 'Proto-Norse', type: 'language',
                attested: 200, extinct: true,
                note: 'Runic inscriptions from ~200 CE; ancestor of Old Norse.' },
              { id: 'old_norse', name: 'Old Norse', type: 'language',
                attested: 700, extinct: true,
                note: 'Language of the Vikings; ancestor of modern Scandinavian languages.' },
              { id: 'swedish', name: 'Swedish', type: 'language',
                attested: 1225, extinct: false },
              { id: 'danish', name: 'Danish', type: 'language',
                attested: 1200, extinct: false },
              { id: 'norwegian', name: 'Norwegian', type: 'language',
                attested: 1150, extinct: false },
              { id: 'icelandic', name: 'Icelandic', type: 'language',
                attested: 1100, extinct: false },
            ]
          },
          { id: 'east_germanic', name: 'East Germanic', type: 'group',
            attested: 300, extinct: true,
            children: [
              { id: 'gothic', name: 'Gothic', type: 'language',
                attested: 350, extinct: true,
                note: 'Wulfila Bible (c. 350 CE) is the oldest substantial Germanic text.' },
              { id: 'vandalic', name: 'Vandalic', type: 'language',
                attested: 400, extinct: true },
              { id: 'burgundian', name: 'Burgundian', type: 'language',
                attested: 400, extinct: true },
            ]
          },
        ]
      },

      // ── Celtic ──
      { id: 'celtic', name: 'Celtic', type: 'branch',
        attested: -600, extinct: false,
        children: [
          { id: 'gaulish', name: 'Gaulish', type: 'language',
            attested: -600, extinct: true,
            note: 'Continental Celtic; spoken in Gaul until replaced by Latin.' },
          { id: 'old_irish', name: 'Old Irish', type: 'language',
            attested: 600, extinct: true },
          { id: 'irish', name: 'Irish (Gaelic)', type: 'language',
            attested: 900, extinct: false },
          { id: 'scottish_gaelic', name: 'Scottish Gaelic', type: 'language',
            attested: 1100, extinct: false },
          { id: 'welsh', name: 'Welsh', type: 'language',
            attested: 600, extinct: false },
          { id: 'breton', name: 'Breton', type: 'language',
            attested: 800, extinct: false },
        ]
      },

      // ── Baltic ──
      { id: 'baltic', name: 'Baltic', type: 'branch',
        attested: 1400, extinct: false,
        children: [
          { id: 'old_prussian', name: 'Old Prussian', type: 'language',
            attested: 1400, extinct: true,
            note: 'Extinct Baltic language of the Baltic Prussians; no modern descendants.' },
          { id: 'lithuanian', name: 'Lithuanian', type: 'language',
            attested: 1503, extinct: false,
            note: 'Most archaic living IE language.' },
          { id: 'latvian', name: 'Latvian', type: 'language',
            attested: 1530, extinct: false },
        ]
      },

      // ── Armenian ──
      { id: 'armenian', name: 'Armenian', type: 'branch',
        attested: 405, extinct: false,
        children: [
          { id: 'classical_armenian', name: 'Classical Armenian (Grabar)', type: 'language',
            attested: 405, extinct: true,
            note: 'Liturgical language; first attested with the Armenian alphabet (405 CE).' },
          { id: 'armenian_lang', name: 'Armenian', type: 'language',
            attested: 1100, extinct: false },
        ]
      },

      // ── Slavic ──
      { id: 'slavic', name: 'Slavic', type: 'branch',
        attested: 600, extinct: false,
        children: [
          { id: 'proto_slavic', name: 'Proto-Slavic', type: 'language',
            attested: null, extinct: true,
            note: 'Reconstructed ancestor of all Slavic languages; spoken ~500–700 CE.' },
          { id: 'old_church_slavonic', name: 'Old Church Slavonic', type: 'language',
            attested: 863, extinct: true,
            note: 'First Slavic literary language; created by Cyril and Methodius.' },
          { id: 'east_slavic', name: 'East Slavic', type: 'group',
            attested: 900, extinct: false,
            children: [
              { id: 'old_east_slavic', name: 'Old East Slavic', type: 'language',
                attested: 900, extinct: true,
                note: 'Language of Kievan Rus; ancestor of Russian, Ukrainian, and Belarusian.' },
              { id: 'russian', name: 'Russian', type: 'language',
                attested: 1300, extinct: false },
              { id: 'ukrainian', name: 'Ukrainian', type: 'language',
                attested: 1200, extinct: false },
              { id: 'belarusian', name: 'Belarusian', type: 'language',
                attested: 1200, extinct: false },
            ]
          },
          { id: 'west_slavic', name: 'West Slavic', type: 'group',
            attested: 900, extinct: false,
            children: [
              { id: 'old_czech', name: 'Old Czech', type: 'language',
                attested: 1100, extinct: true },
              { id: 'czech', name: 'Czech', type: 'language',
                attested: 1300, extinct: false },
              { id: 'polish', name: 'Polish', type: 'language',
                attested: 1136, extinct: false,
                note: 'Gniezno Bull (1136) contains earliest Polish words.' },
              { id: 'slovak', name: 'Slovak', type: 'language',
                attested: 1300, extinct: false },
            ]
          },
          { id: 'south_slavic', name: 'South Slavic', type: 'group',
            attested: 900, extinct: false,
            children: [
              { id: 'old_bulgarian', name: 'Old Bulgarian', type: 'language',
                attested: 893, extinct: true },
              { id: 'bulgarian', name: 'Bulgarian', type: 'language',
                attested: 1100, extinct: false },
              { id: 'serbo_croatian', name: 'Serbo-Croatian', type: 'language',
                attested: 1100, extinct: false,
                note: 'Pluricentric language; includes Serbian, Croatian, Bosnian.' },
              { id: 'slovenian', name: 'Slovenian', type: 'language',
                attested: 1000, extinct: false,
                note: 'Freising Monuments (c. 1000 CE) are earliest Slavic Latin-script texts.' },
            ]
          },
        ]
      },

      // ── Indo-Iranian ──
      { id: 'indo_iranian', name: 'Indo-Iranian', type: 'branch',
        attested: -1500, extinct: false,
        children: [
          { id: 'indo_aryan', name: 'Indo-Aryan', type: 'group',
            attested: -1500, extinct: false,
            children: [
              { id: 'vedic_sanskrit', name: 'Vedic Sanskrit', type: 'language',
                attested: -1500, extinct: true,
                note: 'Oldest attested Indo-Iranian language; language of the Rigveda.' },
              { id: 'classical_sanskrit', name: 'Classical Sanskrit', type: 'language',
                attested: -500, extinct: true,
                note: 'Standardized by Panini c. 400 BCE; lingua franca of learned South Asia.' },
              { id: 'pali', name: 'Pali', type: 'language',
                attested: -300, extinct: true,
                note: 'Liturgical language of Theravada Buddhism.' },
              { id: 'prakrit', name: 'Prakrit', type: 'language',
                attested: -300, extinct: true,
                note: 'Middle Indo-Aryan dialects; ancestor of modern NIA languages.' },
              { id: 'hindi_urdu', name: 'Hindi-Urdu (Hindustani)', type: 'language',
                attested: 1000, extinct: false,
                note: 'Most widely spoken Indo-Aryan language.' },
              { id: 'bengali', name: 'Bengali', type: 'language',
                attested: 1000, extinct: false },
              { id: 'punjabi', name: 'Punjabi', type: 'language',
                attested: 1100, extinct: false },
              { id: 'marathi', name: 'Marathi', type: 'language',
                attested: 1000, extinct: false },
              { id: 'gujarati', name: 'Gujarati', type: 'language',
                attested: 1100, extinct: false },
              { id: 'romani', name: 'Romani', type: 'language',
                attested: 1300, extinct: false,
                note: 'IE language of the Romani people; originated in the Indian subcontinent.' },
            ]
          },
          { id: 'iranian', name: 'Iranian', type: 'group',
            attested: -600, extinct: false,
            children: [
              { id: 'old_persian', name: 'Old Persian', type: 'language',
                attested: -600, extinct: true,
                note: 'Language of the Achaemenid inscriptions (Behistun, Persepolis).' },
              { id: 'avestan', name: 'Avestan', type: 'language',
                attested: -1000, extinct: true,
                note: 'Language of the Avesta (Zoroastrian scriptures).' },
              { id: 'middle_persian', name: 'Middle Persian (Pahlavi)', type: 'language',
                attested: -200, extinct: true,
                note: 'Language of the Parthian and Sassanid empires.' },
              { id: 'new_persian', name: 'New Persian (Farsi)', type: 'language',
                attested: 800, extinct: false,
                note: 'Direct descendant of Middle Persian; major literary language of the Islamic world.' },
              { id: 'dari', name: 'Dari (Afghan Persian)', type: 'language',
                attested: 900, extinct: false },
              { id: 'tajik', name: 'Tajik', type: 'language',
                attested: 900, extinct: false },
              { id: 'kurdish', name: 'Kurdish', type: 'language',
                attested: 1000, extinct: false },
              { id: 'pashto', name: 'Pashto', type: 'language',
                attested: 1400, extinct: false },
              { id: 'sogdian', name: 'Sogdian', type: 'language',
                attested: 300, extinct: true,
                note: 'Lingua franca of the Silk Road; extinct by 1300 CE.' },
              { id: 'scythian', name: 'Scythian', type: 'language',
                attested: -600, extinct: true,
                note: 'Iranian language of the Eurasian steppe nomads.' },
            ]
          },
        ]
      },

    ]
  }, // end Indo-European

  // ════════════════════════════════════════════════════════════
  // AFRO-ASIATIC
  // ════════════════════════════════════════════════════════════
  { id: 'afroasiatic', name: 'Afro-Asiatic', type: 'family',
    attested: -3200, extinct: false,
    note: 'Includes Semitic, Egyptian, Berber, Cushitic, and Chadic branches.',
    children: [

      { id: 'semitic', name: 'Semitic', type: 'branch',
        attested: -3200, extinct: false,
        children: [
          { id: 'east_semitic', name: 'East Semitic', type: 'group',
            attested: -3200, extinct: true,
            children: [
              { id: 'akkadian', name: 'Akkadian', type: 'language',
                attested: -3200, extinct: true,
                note: 'Earliest attested Semitic language; lingua franca of the ancient Near East.' },
              { id: 'babylonian', name: 'Babylonian', type: 'language',
                attested: -2000, extinct: true,
                note: 'Dialect of Akkadian used in Babylonia.' },
              { id: 'assyrian_lang', name: 'Assyrian (dialect)', type: 'language',
                attested: -2000, extinct: true,
                note: 'Northern Akkadian dialect.' },
            ]
          },
          { id: 'nw_semitic', name: 'Northwest Semitic', type: 'group',
            attested: -2400, extinct: false,
            children: [
              { id: 'ugaritic', name: 'Ugaritic', type: 'language',
                attested: -1400, extinct: true },
              { id: 'phoenician', name: 'Phoenician / Punic', type: 'language',
                attested: -1100, extinct: true,
                note: 'Trade language of the Mediterranean; Punic survived in North Africa until ~400 CE.' },
              { id: 'old_hebrew', name: 'Biblical Hebrew', type: 'language',
                attested: -1000, extinct: true,
                note: 'Language of the Hebrew Bible; ceased as a vernacular ~400 BCE.' },
              { id: 'mishnaic_hebrew', name: 'Mishnaic Hebrew', type: 'language',
                attested: 200, extinct: true,
                note: 'Rabbinic Hebrew used in the Mishnah and Talmud.' },
              { id: 'modern_hebrew', name: 'Modern Hebrew', type: 'language',
                attested: 1880, extinct: false,
                note: 'Revived as a spoken language in the late 19th century.' },
              { id: 'aramaic', name: 'Aramaic', type: 'language',
                attested: -900, extinct: false,
                note: 'Imperial Aramaic was the administrative language of the Achaemenid Empire; still spoken by small communities.' },
              { id: 'syriac', name: 'Syriac', type: 'language',
                attested: 200, extinct: false,
                note: 'Eastern Aramaic dialect; major language of early Christianity.' },
            ]
          },
          { id: 'south_semitic', name: 'South Semitic', type: 'group',
            attested: -800, extinct: false,
            children: [
              { id: 'old_arabic', name: 'Old Arabic', type: 'language',
                attested: -800, extinct: true,
                note: 'Pre-Islamic Arabic inscriptions.' },
              { id: 'classical_arabic', name: 'Classical Arabic', type: 'language',
                attested: 500, extinct: false,
                note: 'Language of the Quran; liturgical and formal standard.' },
              { id: 'modern_arabic', name: 'Modern Standard Arabic', type: 'language',
                attested: 1800, extinct: false,
                note: 'Written standard used across the Arab world.' },
              { id: 'ge_ez', name: "Ge'ez (Classical Ethiopic)", type: 'language',
                attested: 300, extinct: true,
                note: 'Liturgical language of the Ethiopian Orthodox Church.' },
              { id: 'amharic', name: 'Amharic', type: 'language',
                attested: 1300, extinct: false,
                note: 'Official language of Ethiopia; descended from Ge\'ez.' },
              { id: 'tigrinya', name: 'Tigrinya', type: 'language',
                attested: 1300, extinct: false },
            ]
          },
        ]
      },

      { id: 'egyptian_branch', name: 'Egyptian', type: 'branch',
        attested: -3200, extinct: false,
        note: 'Longest continuous written history of any language family.',
        children: [
          { id: 'old_egyptian', name: 'Old Egyptian', type: 'language',
            attested: -3200, extinct: true,
            note: 'Language of the Old Kingdom pyramid texts.' },
          { id: 'middle_egyptian', name: 'Middle Egyptian', type: 'language',
            attested: -2000, extinct: true,
            note: 'Classical literary language; used in hieroglyphic inscriptions for millennia.' },
          { id: 'demotic', name: 'Demotic Egyptian', type: 'language',
            attested: -650, extinct: true },
          { id: 'coptic', name: 'Coptic', type: 'language',
            attested: 200, extinct: false,
            note: 'Liturgical language of the Coptic Orthodox Church; last stage of the Egyptian language.' },
        ]
      },

      { id: 'berber', name: 'Berber (Amazigh)', type: 'branch',
        attested: -600, extinct: false,
        children: [
          { id: 'tifinagh_old', name: 'Old Libyan / Tifinagh', type: 'language',
            attested: -600, extinct: false,
            note: 'Tifinagh script attested from ~600 BCE; used by Tuareg to the present.' },
          { id: 'tamazight', name: 'Tamazight (Berber)', type: 'language',
            attested: 900, extinct: false,
            note: 'Collective term for modern Berber languages of North Africa.' },
        ]
      },

      { id: 'cushitic', name: 'Cushitic', type: 'branch',
        attested: 1000, extinct: false,
        children: [
          { id: 'somali', name: 'Somali', type: 'language',
            attested: 1000, extinct: false },
          { id: 'oromo', name: 'Oromo', type: 'language',
            attested: 1500, extinct: false },
        ]
      },

    ]
  }, // end Afro-Asiatic

  // ════════════════════════════════════════════════════════════
  // DRAVIDIAN
  // ════════════════════════════════════════════════════════════
  { id: 'dravidian', name: 'Dravidian', type: 'family',
    attested: -300, extinct: false,
    note: 'Dominant language family of peninsular India; possibly connected to Indus Valley civilization.',
    children: [
      { id: 'south_dravidian', name: 'South Dravidian', type: 'branch',
        attested: -300, extinct: false,
        children: [
          { id: 'old_tamil', name: 'Old Tamil', type: 'language',
            attested: -300, extinct: true,
            note: 'Oldest attested Dravidian language; Sangam literature dates to ~300 BCE.' },
          { id: 'tamil', name: 'Tamil', type: 'language',
            attested: 600, extinct: false,
            note: 'Classical language; one of the longest-surviving languages in the world.' },
          { id: 'kannada', name: 'Kannada', type: 'language',
            attested: 450, extinct: false },
          { id: 'malayalam', name: 'Malayalam', type: 'language',
            attested: 830, extinct: false },
        ]
      },
      { id: 'south_central_dravidian', name: 'South-Central Dravidian', type: 'branch',
        attested: 1000, extinct: false,
        children: [
          { id: 'telugu', name: 'Telugu', type: 'language',
            attested: 575, extinct: false,
            note: 'Italian of the East; one of the classical languages of India.' },
        ]
      },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // SINO-TIBETAN
  // ════════════════════════════════════════════════════════════
  { id: 'sino_tibetan', name: 'Sino-Tibetan', type: 'family',
    attested: -1250, extinct: false,
    note: 'Second largest family by native speakers; includes Chinese and Tibeto-Burman branches.',
    children: [
      { id: 'sinitic', name: 'Sinitic (Chinese)', type: 'branch',
        attested: -1250, extinct: false,
        children: [
          { id: 'old_chinese', name: 'Old Chinese', type: 'language',
            attested: -1250, extinct: true,
            note: 'Oracle bone script inscriptions of the Shang dynasty.' },
          { id: 'middle_chinese', name: 'Middle Chinese', type: 'language',
            attested: 600, extinct: true,
            note: 'Tang dynasty standard; basis of many modern Chinese varieties.' },
          { id: 'classical_chinese', name: 'Classical Chinese (Literary)', type: 'language',
            attested: -500, extinct: true,
            note: 'Written standard used across East Asia for two millennia.' },
          { id: 'mandarin', name: 'Mandarin Chinese', type: 'language',
            attested: 1000, extinct: false,
            note: 'Most widely spoken language in the world.' },
          { id: 'cantonese', name: 'Cantonese', type: 'language',
            attested: 900, extinct: false },
          { id: 'min', name: 'Min (Hokkien/Teochew)', type: 'language',
            attested: 800, extinct: false },
          { id: 'wu', name: 'Wu (Shanghainese)', type: 'language',
            attested: 900, extinct: false },
        ]
      },
      { id: 'tibeto_burman', name: 'Tibeto-Burman', type: 'branch',
        attested: 600, extinct: false,
        children: [
          { id: 'classical_tibetan', name: 'Classical Tibetan', type: 'language',
            attested: 620, extinct: true,
            note: 'Literary language created with the Tibetan script (c. 620 CE).' },
          { id: 'tibetan', name: 'Tibetan', type: 'language',
            attested: 900, extinct: false },
          { id: 'burmese', name: 'Burmese (Myanmar)', type: 'language',
            attested: 1100, extinct: false },
        ]
      },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // TURKIC
  // ════════════════════════════════════════════════════════════
  { id: 'turkic', name: 'Turkic', type: 'family',
    attested: 600, extinct: false,
    note: 'Originated in the Altai region; spread with Turkic migrations across Eurasia.',
    children: [
      { id: 'oghuz', name: 'Oghuz', type: 'branch',
        attested: 800, extinct: false,
        children: [
          { id: 'old_anatolian_turkish', name: 'Old Anatolian Turkish', type: 'language',
            attested: 1100, extinct: true },
          { id: 'ottoman_turkish', name: 'Ottoman Turkish', type: 'language',
            attested: 1300, extinct: true,
            note: 'Administrative and literary language of the Ottoman Empire.' },
          { id: 'modern_turkish', name: 'Turkish', type: 'language',
            attested: 1928, extinct: false,
            note: 'Romanized form introduced by Atatürk in 1928.' },
          { id: 'azerbaijani', name: 'Azerbaijani', type: 'language',
            attested: 1300, extinct: false },
          { id: 'turkmen', name: 'Turkmen', type: 'language',
            attested: 1400, extinct: false },
        ]
      },
      { id: 'kipchak', name: 'Kipchak', type: 'branch',
        attested: 900, extinct: false,
        children: [
          { id: 'old_kipchak', name: 'Old Kipchak / Cuman', type: 'language',
            attested: 900, extinct: true,
            note: 'Kipchak confederacy language; Codex Cumanicus (c. 1303).' },
          { id: 'kazakh', name: 'Kazakh', type: 'language',
            attested: 1400, extinct: false },
          { id: 'kyrgyz', name: 'Kyrgyz', type: 'language',
            attested: 600, extinct: false,
            note: 'One of the earliest attested Turkic languages via runic inscriptions.' },
          { id: 'tatar', name: 'Tatar', type: 'language',
            attested: 1300, extinct: false },
          { id: 'bashkir', name: 'Bashkir', type: 'language',
            attested: 1300, extinct: false },
        ]
      },
      { id: 'karluk', name: 'Karluk', type: 'branch',
        attested: 800, extinct: false,
        children: [
          { id: 'old_uyghur', name: 'Old Uyghur', type: 'language',
            attested: 800, extinct: true,
            note: 'Literary language of the Uyghur Khaganate and Turfan.' },
          { id: 'uyghur', name: 'Uyghur', type: 'language',
            attested: 1200, extinct: false },
          { id: 'uzbek', name: 'Uzbek', type: 'language',
            attested: 1400, extinct: false },
          { id: 'chagatai', name: 'Chagatai', type: 'language',
            attested: 1300, extinct: true,
            note: 'Literary language of the Timurid and Mughal courts.' },
        ]
      },
      { id: 'old_turkic', name: 'Old Turkic (Orkhon)', type: 'language',
        attested: 600, extinct: true,
        note: 'Earliest Turkic runic inscriptions; Orkhon Valley, Mongolia.' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // MONGOLIC
  // ════════════════════════════════════════════════════════════
  { id: 'mongolic', name: 'Mongolic', type: 'family',
    attested: 1200, extinct: false,
    note: 'Spread across Inner Asia with the Mongol Empire.',
    children: [
      { id: 'middle_mongolian', name: 'Middle Mongolian', type: 'language',
        attested: 1200, extinct: true,
        note: 'Language of the Mongol Empire; Secret History of the Mongols (1227).' },
      { id: 'classical_mongolian', name: 'Classical Mongolian', type: 'language',
        attested: 1300, extinct: true,
        note: 'Literary standard using the traditional Mongolian script.' },
      { id: 'mongolian', name: 'Mongolian', type: 'language',
        attested: 1600, extinct: false },
      { id: 'buryat', name: 'Buryat', type: 'language',
        attested: 1700, extinct: false },
      { id: 'oirat', name: 'Oirat / Kalmyk', type: 'language',
        attested: 1600, extinct: false },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // TUNGUSIC
  // ════════════════════════════════════════════════════════════
  { id: 'tungusic', name: 'Tungusic', type: 'family',
    attested: 1600, extinct: false,
    note: 'Spoken in Siberia and Manchuria; includes Manchu, the language of the Qing dynasty.',
    children: [
      { id: 'manchu', name: 'Manchu', type: 'language',
        attested: 1599, extinct: false,
        note: 'Nurhaci created the Manchu script in 1599; administrative language of the Qing Empire.' },
      { id: 'evenki', name: 'Evenki', type: 'language',
        attested: 1700, extinct: false,
        note: 'Most widely distributed Tungusic language across Siberia.' },
      { id: 'nanai', name: 'Nanai', type: 'language',
        attested: 1700, extinct: false },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // JAPONIC
  // ════════════════════════════════════════════════════════════
  { id: 'japonic', name: 'Japonic', type: 'family',
    attested: 712, extinct: false,
    note: 'Language family of Japan; includes Japanese and Ryukyuan languages.',
    children: [
      { id: 'old_japanese', name: 'Old Japanese', type: 'language',
        attested: 712, extinct: true,
        note: 'Kojiki (712 CE) and Man\'yoshu are the oldest substantial texts.' },
      { id: 'middle_japanese', name: 'Middle Japanese', type: 'language',
        attested: 1000, extinct: true },
      { id: 'japanese', name: 'Japanese', type: 'language',
        attested: 1400, extinct: false },
      { id: 'ryukyuan', name: 'Ryukyuan', type: 'language',
        attested: 1300, extinct: false,
        note: 'Closely related to Japanese; languages of the Ryukyu Islands (Okinawa).' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // KOREANIC
  // ════════════════════════════════════════════════════════════
  { id: 'koreanic', name: 'Koreanic', type: 'family',
    attested: 600, extinct: false,
    note: 'Language family of the Korean peninsula; possible Altaic connections debated.',
    children: [
      { id: 'old_korean', name: 'Old Korean', type: 'language',
        attested: 600, extinct: true,
        note: 'Attested in hyangga poems and Silla-era inscriptions.' },
      { id: 'middle_korean', name: 'Middle Korean', type: 'language',
        attested: 900, extinct: true,
        note: 'Goryeo and Joseon dynasty Korean; Hunminjeongeum (Hangul) created in 1443.' },
      { id: 'korean', name: 'Korean', type: 'language',
        attested: 1500, extinct: false },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // SUMERIAN (isolate)
  // ════════════════════════════════════════════════════════════
  { id: 'sumerian_isolate', name: 'Sumerian', type: 'family',
    attested: -3500, extinct: true,
    note: 'Language isolate of ancient Mesopotamia; first written language. No known relatives.',
    children: [
      { id: 'early_sumerian', name: 'Early Sumerian', type: 'language',
        attested: -3500, extinct: true,
        note: 'Proto-cuneiform from Uruk (~3500 BCE); earliest writing in history.' },
      { id: 'classical_sumerian', name: 'Classical Sumerian', type: 'language',
        attested: -2500, extinct: true,
        note: 'Language of the Ur III dynasty; ceased as a vernacular ~2000 BCE.' },
      { id: 'liturgical_sumerian', name: 'Liturgical Sumerian', type: 'language',
        attested: -2000, extinct: true,
        note: 'Survived as a learned/priestly language until ~100 CE.' },
    ]
  },

];

// ──────────────────────────────────────────────────────────────────────────────
// FILE GENERATION
// ──────────────────────────────────────────────────────────────────────────────

const BASE = path.join(__dirname, '../data/languages');

function rmrf(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) rmrf(full);
    else fs.unlinkSync(full);
  }
  fs.rmdirSync(dir);
}

function writeNode(node, dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });

  if (node.children && node.children.length) {
    // Branch node → index.json
    const { children, ...meta } = node;
    fs.writeFileSync(
      path.join(dirPath, 'index.json'),
      JSON.stringify(meta, null, 2) + '\n'
    );
    for (const child of children) {
      writeNode(child, path.join(dirPath, child.id));
    }
  } else {
    // Leaf node → id.json in PARENT dir (dirPath is the parent here)
    // We write it as: parentDir/id.json
    // Actually we write to dirPath/index.json if it's a solo dir, but the
    // convention in this project for leaves is: the file IS the leaf, named
    // after the id, in the parent directory.
    // Let's use: leaf → parentDir/id.json, and dirPath is already parentDir/id
    // So we write dirPath/../id.json … actually let's just write leaf.json
    // inside a directory named after the id, consistent with how religion works.
    fs.writeFileSync(
      path.join(dirPath, `${node.id}.json`),
      JSON.stringify(node, null, 2) + '\n'
    );
  }
}

// ── Main ──
console.log('Removing old language data…');
rmrf(BASE);
fs.mkdirSync(BASE, { recursive: true });

console.log('Writing new language tree…');
for (const family of TREE) {
  writeNode(family, path.join(BASE, family.id));
}

// Count files
let count = 0;
function countFiles(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) countFiles(path.join(dir, e.name));
    else if (e.name.endsWith('.json')) count++;
  }
}
countFiles(BASE);
console.log(`Done. ${count} JSON files written.`);
