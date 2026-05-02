const fs = require('fs');
const polities = JSON.parse(fs.readFileSync('data/polity.json', 'utf8'));

const figures = {
  sumerian_city_states: [
    { id: 'gilgamesh', name: 'Gilgamesh', role: 'ruler', years: '-2700/-2600', significance: 'Legendary king of Uruk; the Epic of Gilgamesh is the oldest known work of literature' },
    { id: 'ur_nammu', name: 'Ur-Nammu', role: 'founder', years: '-2112/-2095', significance: 'Author of the earliest known law code' }
  ],
  akkadian_empire: [
    { id: 'sargon_akkad', name: 'Sargon of Akkad', role: 'founder', years: '-2334/-2279', significance: 'Created the world first empire; conquered all Sumerian city-states' }
  ],
  ur_iii: [
    { id: 'shulgi', name: 'Shulgi', role: 'ruler', years: '-2094/-2047', significance: 'Greatest Ur III king; standardized weights, measures, and the first bureaucratic state' }
  ],
  old_babylonian: [
    { id: 'hammurabi', name: 'Hammurabi', role: 'ruler', years: '-1810/-1750', significance: 'Author of the Code of Hammurabi' }
  ],
  neo_assyrian_empire: [
    { id: 'tiglath_pileser_iii', name: 'Tiglath-Pileser III', role: 'founder', years: '-745/-727', significance: 'Transformed Assyria into a professional military empire' },
    { id: 'ashurbanipal', name: 'Ashurbanipal', role: 'ruler', years: '-685/-627', significance: 'Assembled the Library of Nineveh' }
  ],
  neo_babylonian: [
    { id: 'nebuchadnezzar_ii', name: 'Nebuchadnezzar II', role: 'ruler', years: '-634/-562', significance: 'Built the Hanging Gardens; destroyed Jerusalem; initiated the Babylonian captivity' }
  ],
  old_kingdom_egypt: [
    { id: 'imhotep', name: 'Imhotep', role: 'administrator', years: '-2650/-2600', significance: 'Architect of the Step Pyramid; first named architect in history; later deified' },
    { id: 'khufu', name: 'Khufu (Cheops)', role: 'ruler', years: '-2589/-2566', significance: 'Commissioned the Great Pyramid of Giza' }
  ],
  new_kingdom_egypt: [
    { id: 'thutmose_iii', name: 'Thutmose III', role: 'ruler', years: '-1481/-1425', significance: 'Greatest military pharaoh; expanded Egypt to its greatest territorial extent' },
    { id: 'akhenaten', name: 'Akhenaten', role: 'reformer', years: '-1353/-1336', significance: 'Revolutionary monotheist attempt (Aten worship); rejected by successors' },
    { id: 'ramesses_ii', name: 'Ramesses II', role: 'ruler', years: '-1303/-1213', significance: 'Signed the first known peace treaty in history (with the Hittites)' }
  ],
  ptolemaic_egypt: [
    { id: 'ptolemy_i', name: 'Ptolemy I Soter', role: 'founder', years: '-367/-283', significance: 'Macedonian general who founded the dynasty; established the Library of Alexandria' },
    { id: 'cleopatra_vii', name: 'Cleopatra VII', role: 'last_ruler', years: '-69/-30', significance: 'Last active Ptolemaic ruler; only one to learn Egyptian; her death ended Greek rule in Egypt' }
  ],
  phoenician_states: [
    { id: 'hiram_tyre', name: 'Hiram I of Tyre', role: 'ruler', years: '-980/-947', significance: 'Ally of King Solomon; expanded Phoenician trade networks across the Mediterranean' }
  ],
  kingdom_of_israel: [
    { id: 'david', name: 'David', role: 'founder', years: '-1040/-970', significance: 'Unified the Israelite tribes; made Jerusalem the capital' },
    { id: 'solomon', name: 'Solomon', role: 'ruler', years: '-970/-931', significance: 'Built the First Temple; his death caused the kingdom split' }
  ],
  kingdom_of_judah: [
    { id: 'hezekiah', name: 'Hezekiah', role: 'ruler', years: '-739/-687', significance: 'Centralized Yahweh worship; resisted Assyrian siege of Jerusalem' },
    { id: 'josiah', name: 'Josiah', role: 'reformer', years: '-648/-609', significance: 'Major religious reform; rediscovery of the Torah' }
  ],
  fatimid_caliphate: [
    { id: 'al_muizz', name: 'Al-Muizz li-Din Allah', role: 'founder', years: '932/975', significance: 'Founded Cairo; established Al-Azhar mosque and university' }
  ],
  ayyubid_sultanate: [
    { id: 'saladin', name: 'Saladin (Salah ad-Din)', role: 'founder', years: '1137/1193', significance: 'Recaptured Jerusalem from the Crusaders (1187); defining figure of Islamic resistance to the Crusades' }
  ],
  mamluk_sultanate: [
    { id: 'baybars', name: 'Baybars', role: 'founder', years: '1223/1277', significance: 'Defeated the Mongols at Ain Jalut (1260); expelled the Crusaders' }
  ],
  median_kingdom: [
    { id: 'cyaxares', name: 'Cyaxares', role: 'ruler', years: '-625/-585', significance: 'Destroyed the Assyrian Empire in alliance with Babylon' }
  ],
  achaemenid_empire: [
    { id: 'cyrus_great', name: 'Cyrus the Great', role: 'founder', years: '-600/-530', significance: 'Founded the largest empire yet seen; issued the Cyrus Cylinder; freed the Jews from Babylonian captivity' },
    { id: 'darius_i', name: 'Darius I', role: 'ruler', years: '-550/-486', significance: 'Built Persepolis; reorganized the empire into satrapies' },
    { id: 'xerxes_i', name: 'Xerxes I', role: 'ruler', years: '-519/-465', significance: 'Led the great Persian invasion of Greece (Thermopylae, Salamis)' }
  ],
  parthian_empire: [
    { id: 'arsaces_i', name: 'Arsaces I', role: 'founder', years: '-285/-217', significance: 'Founded the Arsacid dynasty; began the Parthian revolt against the Seleucids' },
    { id: 'mithridates_i', name: 'Mithridates I', role: 'ruler', years: '-195/-138', significance: 'Captured Mesopotamia from the Seleucids; turned Parthia into a true empire' }
  ],
  sassanid_empire: [
    { id: 'ardashir_i', name: 'Ardashir I', role: 'founder', years: '180/242', significance: 'Overthrew the Parthians; revived Persian and Zoroastrian identity' },
    { id: 'shapur_i', name: 'Shapur I', role: 'ruler', years: '215/272', significance: 'Captured Roman Emperor Valerian — the only Roman emperor taken prisoner by a foreign enemy' },
    { id: 'khosrow_i', name: 'Khosrow I (Anushirvan)', role: 'ruler', years: '501/579', significance: 'The ideal Persian king; reformed taxation; translated Greek philosophy into Pahlavi' }
  ],
  ilkhanate: [
    { id: 'hulagu_khan', name: 'Hulagu Khan', role: 'founder', years: '1217/1265', significance: 'Sacked Baghdad (1258), ending the Abbasid Caliphate' },
    { id: 'ghazan_khan', name: 'Ghazan Khan', role: 'reformer', years: '1271/1304', significance: 'Converted to Sunni Islam (1295) — the ideological turning point that fully Persianized the Ilkhanate' }
  ],
  timurid_empire: [
    { id: 'timur', name: 'Timur (Tamerlane)', role: 'founder', years: '1336/1405', significance: 'Last great nomadic conqueror; made Samarkand the most dazzling city of the age' },
    { id: 'ulugh_beg', name: 'Ulugh Beg', role: 'ruler', years: '1394/1449', significance: 'Astronomer-king; built the Samarkand observatory' },
    { id: 'babur_timurid', name: 'Babur', role: 'last_ruler', years: '1483/1530', significance: 'Last Timurid; lost Samarkand and conquered India instead; founded the Mughal Empire' }
  ],
  safavid_empire: [
    { id: 'shah_ismail_i', name: 'Shah Ismail I', role: 'founder', years: '1487/1524', significance: 'Forcibly converted Iran from Sunni to Shia Islam; created the civilizational identity that defines Iran today' },
    { id: 'shah_abbas_i', name: 'Shah Abbas I (The Great)', role: 'ruler', years: '1571/1629', significance: 'Rebuilt Isfahan; zenith of Safavid power and Persian art' }
  ],
  macedonian_empire: [
    { id: 'alexander_great', name: 'Alexander the Great', role: 'founder', years: '-356/-323', significance: 'Conquered from Greece to India in 13 years; spread Hellenism across three continents' },
    { id: 'aristotle', name: 'Aristotle', role: 'philosopher', years: '-384/-322', significance: 'Alexander tutor; his philosophy became the framework of Hellenistic, Islamic, and Christian scholarship' }
  ],
  seleucid_empire: [
    { id: 'seleucus_i', name: 'Seleucus I Nicator', role: 'founder', years: '-358/-281', significance: 'Founded dozens of Greek cities across Persia and Central Asia' }
  ],
  roman_empire: [
    { id: 'augustus', name: 'Augustus (Octavian)', role: 'founder', years: '-63/14', significance: 'Created the imperial system; the Pax Romana began with him' },
    { id: 'marcus_aurelius', name: 'Marcus Aurelius', role: 'ruler', years: '121/180', significance: 'Philosopher-emperor; his Meditations is the definitive Stoic text' },
    { id: 'constantine_i', name: 'Constantine I', role: 'reformer', years: '272/337', significance: 'Legalized Christianity; founded Constantinople; the hinge between pagan Rome and Christian Byzantium' }
  ],
  byzantine_empire: [
    { id: 'justinian_i', name: 'Justinian I', role: 'ruler', years: '482/565', significance: 'Reconquered the Western Mediterranean; codified Roman law (Corpus Juris Civilis)' },
    { id: 'basil_ii', name: 'Basil II (Bulgaroktonos)', role: 'ruler', years: '958/1025', significance: 'Expanded Byzantium to its greatest medieval extent' },
    { id: 'constantine_xi', name: 'Constantine XI Palaiologos', role: 'last_ruler', years: '1404/1453', significance: 'Died defending Constantinople in 1453; the last Roman emperor' }
  ],
  rashidun_caliphate: [
    { id: 'abu_bakr', name: 'Abu Bakr', role: 'founder', years: '573/634', significance: 'First Caliph; held the Muslim community together after Muhammad death' },
    { id: 'umar_ibn_khattab', name: 'Umar ibn al-Khattab', role: 'ruler', years: '584/644', significance: 'Conquered Persia, Syria, and Egypt in a decade; established Islamic governance foundations' },
    { id: 'khalid_ibn_walid', name: 'Khalid ibn al-Walid', role: 'general', years: '585/642', significance: 'Undefeated general; called the Sword of Allah' }
  ],
  umayyad_caliphate: [
    { id: 'muawiya_i', name: 'Muawiya I', role: 'founder', years: '602/680', significance: 'Founded the Umayyad dynasty; shifted the caliphate from elective to hereditary' },
    { id: 'tariq_ibn_ziyad', name: 'Tariq ibn Ziyad', role: 'general', years: '670/720', significance: 'Conquered Visigothic Spain (711); Gibraltar is named after him (Jabal Tariq)' }
  ],
  abbasid_caliphate: [
    { id: 'al_mansur', name: 'Al-Mansur', role: 'founder', years: '714/775', significance: 'Built Baghdad; the city became the largest in the world' },
    { id: 'harun_al_rashid', name: 'Harun al-Rashid', role: 'ruler', years: '763/809', significance: 'The golden-age Caliph of the Thousand and One Nights; patron of the House of Wisdom' }
  ],
  xiongnu: [
    { id: 'modu_chanyu', name: 'Modu Chanyu', role: 'founder', years: '-234/-174', significance: 'United the steppe tribes; template for all subsequent steppe empires' }
  ],
  goktürk_khaganate: [
    { id: 'bumin_qaghan', name: 'Bumin Qaghan', role: 'founder', years: '/552', significance: 'First use of the title Khagan; founded the first explicitly Turkic empire' },
    { id: 'bilge_qaghan', name: 'Bilge Qaghan', role: 'ruler', years: '683/734', significance: 'Documented in the Orkhon inscriptions — the oldest known Turkic texts' }
  ],
  uyghur_khaganate: [
    { id: 'bayanchur_khan', name: 'Bayanchur Khan', role: 'founder', years: '/759', significance: 'Founded the Uyghur Khaganate; adopted Manichaeism as state religion' }
  ],
  khazar_khaganate: [
    { id: 'bulan', name: 'Bulan', role: 'reformer', years: '740/800', significance: 'The Khazar ruler who converted to Judaism' }
  ],
  seljuk_empire: [
    { id: 'tughril', name: 'Tughril', role: 'founder', years: '990/1063', significance: 'Entered Baghdad (1055) as Abbasid protector; received the title Sultan' },
    { id: 'alp_arslan', name: 'Alp Arslan', role: 'ruler', years: '1029/1072', significance: 'Defeated Byzantium at Manzikert (1071) — opened Anatolia to Turkic settlement' },
    { id: 'nizam_al_mulk', name: 'Nizam al-Mulk', role: 'administrator', years: '1018/1092', significance: 'Grand vizier; his Siyasatnama is the masterwork of Persian administrative theory' },
    { id: 'omar_khayyam', name: 'Omar Khayyam', role: 'cultural', years: '1048/1131', significance: 'Mathematician, astronomer, and poet (Rubaiyat); pinnacle of Seljuk Persian intellectual culture' }
  ],
  seljuk_rum: [
    { id: 'rumi', name: 'Jalal ad-Din Rumi', role: 'cultural', years: '1207/1273', significance: 'Composed the Masnavi in Persian at the Konya court; founder of the Mevlevi order; most widely read poet in the world' }
  ],
  ottoman_empire: [
    { id: 'osman_i', name: 'Osman I', role: 'founder', years: '1258/1326', significance: 'The dynasty is named after him (Osmanli)' },
    { id: 'mehmed_ii', name: 'Mehmed II (Fatih)', role: 'ruler', years: '1432/1481', significance: 'Conquered Constantinople (1453); ended the Byzantine Empire; claimed Kayser-i Rum' },
    { id: 'suleiman_magnificent', name: 'Suleiman the Magnificent', role: 'ruler', years: '1494/1566', significance: 'Zenith of the Ottoman Empire; also the Lawgiver who reformed the legal system' },
    { id: 'ataturk', name: 'Mustafa Kemal Ataturk', role: 'last_ruler', years: '1881/1938', significance: 'Ended the Sultanate (1922) and Caliphate (1924); founded the Republic of Turkey' }
  ],
  mongol_empire: [
    { id: 'genghis_khan', name: 'Genghis Khan', role: 'founder', years: '1162/1227', significance: 'Greatest conqueror by territory in history; created the Yasa and the meritocratic military system' },
    { id: 'ogedei_khan', name: 'Ogedei Khan', role: 'ruler', years: '1186/1241', significance: 'Completed the conquest of North China; launched the invasion of Europe' }
  ],
  golden_horde: [
    { id: 'batu_khan', name: 'Batu Khan', role: 'founder', years: '1205/1255', significance: 'Conquered Russia and Eastern Europe; founded the Golden Horde' },
    { id: 'ozbeg_khan', name: 'Ozbeg Khan', role: 'reformer', years: '1282/1341', significance: 'Converted the Golden Horde to Sunni Islam (1313); modern Uzbeks are named after him' }
  ],
  chagatai_khanate: [
    { id: 'chagatai_khan', name: 'Chagatai Khan', role: 'founder', years: '1183/1242', significance: 'Second son of Genghis Khan; Chagatai Turkic language is named after him' }
  ],
  maurya_empire: [
    { id: 'chandragupta_maurya', name: 'Chandragupta Maurya', role: 'founder', years: '-340/-298', significance: 'Unified India for the first time; expelled Macedonian garrisons' },
    { id: 'kautilya', name: 'Kautilya (Chanakya)', role: 'administrator', years: '-375/-283', significance: 'Author of the Arthashastra — the first systematic treatise on statecraft' },
    { id: 'ashoka', name: 'Ashoka the Great', role: 'reformer', years: '-304/-232', significance: 'Converted to Buddhism after Kalinga War; spread Buddhism to Central Asia, Sri Lanka, Southeast Asia' }
  ],
  gupta_empire: [
    { id: 'samudragupta', name: 'Samudragupta', role: 'ruler', years: '335/380', significance: 'Military genius and poet; the Napoleon and Augustus of India' },
    { id: 'aryabhata', name: 'Aryabhata', role: 'cultural', years: '476/550', significance: 'Calculated pi; proposed a heliocentric model; developed zero as a number' }
  ],
  delhi_sultanate: [
    { id: 'qutb_ud_din_aibak', name: 'Qutb ud-Din Aibak', role: 'founder', years: '1150/1210', significance: 'Founded the Delhi Sultanate; built the Qutb Minar' },
    { id: 'alauddin_khalji', name: 'Alauddin Khalji', role: 'ruler', years: '1266/1316', significance: 'Most powerful Delhi Sultan; repelled multiple Mongol invasions' }
  ],
  mughal_empire: [
    { id: 'babur', name: 'Babur', role: 'founder', years: '1483/1530', significance: 'Timurid prince who conquered India; his Baburnama is one of the great autobiographies' },
    { id: 'akbar', name: 'Akbar the Great', role: 'ruler', years: '1542/1605', significance: 'Consolidated the empire; policy of religious tolerance; abolished jizya' },
    { id: 'shah_jahan', name: 'Shah Jahan', role: 'ruler', years: '1592/1666', significance: 'Built the Taj Mahal; apex of Mughal Persian-Indian cultural synthesis' },
    { id: 'aurangzeb', name: 'Aurangzeb', role: 'last_ruler', years: '1618/1707', significance: 'Largest territorial extent; Sharia policies alienated Hindus; his death began the collapse' }
  ],
  shang_dynasty: [
    { id: 'wu_ding', name: 'Wu Ding', role: 'ruler', years: '-1250/-1192', significance: 'Greatest Shang king; oracle bone inscriptions from his reign are the oldest surviving Chinese writing' }
  ],
  zhou_dynasty: [
    { id: 'confucius', name: 'Confucius (Kong Qiu)', role: 'philosopher', years: '-551/-479', significance: 'Defined the moral and political philosophy that governed China for 2500 years' },
    { id: 'sun_tzu', name: 'Sun Tzu', role: 'philosopher', years: '-544/-496', significance: 'Author of The Art of War' },
    { id: 'laozi', name: 'Laozi', role: 'philosopher', years: '-601/-531', significance: 'Founder of Taoism; author of the Tao Te Ching' }
  ],
  qin_dynasty: [
    { id: 'qin_shi_huang', name: 'Qin Shi Huang', role: 'founder', years: '-259/-210', significance: 'First Emperor of unified China; built the Great Wall and Terracotta Army; his title Huangdi was used by every subsequent emperor' },
    { id: 'li_si', name: 'Li Si', role: 'administrator', years: '-280/-208', significance: 'Grand Councillor; architect of Qin Legalism and the first unified Chinese bureaucracy' }
  ],
  han_dynasty: [
    { id: 'liu_bang', name: 'Liu Bang (Emperor Gaozu)', role: 'founder', years: '-256/-195', significance: 'Rose from peasant to emperor; the Han ethnic identity is named after his dynasty' },
    { id: 'emperor_wu_han', name: 'Emperor Wu of Han', role: 'ruler', years: '-157/-87', significance: 'Established Confucianism as state ideology; opened the Silk Road' },
    { id: 'sima_qian', name: 'Sima Qian', role: 'cultural', years: '-145/-86', significance: 'Father of Chinese historiography; his Records of the Grand Historian defined the writing of Chinese history for 2000 years' }
  ],
  sui_dynasty: [
    { id: 'emperor_wen_sui', name: 'Emperor Wen (Yang Jian)', role: 'founder', years: '541/604', significance: 'Reunified China after 370 years of division; built the Grand Canal' }
  ],
  tang_dynasty: [
    { id: 'emperor_taizong', name: 'Emperor Taizong (Li Shimin)', role: 'ruler', years: '598/649', significance: 'Considered China greatest emperor; his Zhenguan era is the model of virtuous governance' },
    { id: 'wu_zetian', name: 'Wu Zetian', role: 'ruler', years: '624/705', significance: 'The only woman in Chinese history to hold the title of Empress Regnant' },
    { id: 'li_bai', name: 'Li Bai', role: 'cultural', years: '701/762', significance: 'Greatest Tang poet; defines the image of Tang cosmopolitan culture' }
  ],
  liao_dynasty: [
    { id: 'abaoji', name: 'Abaoji (Emperor Taizu of Liao)', role: 'founder', years: '872/926', significance: 'United the Khitan tribes; created the Khitan script; invented the dual-administration system' }
  ],
  song_dynasty: [
    { id: 'zhao_kuangyin', name: 'Zhao Kuangyin (Emperor Taizu)', role: 'founder', years: '927/976', significance: 'Former general who peacefully demilitarized the warlords; built China most sophisticated civilian bureaucracy' },
    { id: 'su_shi', name: 'Su Shi (Su Dongpo)', role: 'cultural', years: '1037/1101', significance: 'Poet, painter, calligrapher, and statesman; the Renaissance Man of the Song dynasty' }
  ],
  jin_dynasty_jurchen: [
    { id: 'wanyan_aguda', name: 'Wanyan Aguda (Emperor Taizu of Jin)', role: 'founder', years: '1068/1123', significance: 'United the Jurchen tribes; created the Jurchen script to resist cultural assimilation' }
  ],
  yuan_dynasty: [
    { id: 'kublai_khan', name: 'Kublai Khan', role: 'founder', years: '1215/1294', significance: 'Founded the Yuan dynasty; first non-Han ruler to control all of China' }
  ],
  ming_dynasty: [
    { id: 'zhu_yuanzhang', name: 'Zhu Yuanzhang (Hongwu Emperor)', role: 'founder', years: '1328/1398', significance: 'Rose from orphaned peasant to emperor; expelled the Mongols' },
    { id: 'zheng_he', name: 'Zheng He', role: 'general', years: '1371/1433', significance: 'Led seven maritime expeditions reaching Arabia and East Africa; commanded fleets that dwarfed anything in Europe' },
    { id: 'yongle_emperor', name: 'Yongle Emperor', role: 'ruler', years: '1360/1424', significance: 'Built the Forbidden City; commissioned the Yongle Encyclopedia' }
  ],
  qing_dynasty: [
    { id: 'nurhaci', name: 'Nurhaci', role: 'founder', years: '1559/1626', significance: 'United the Jurchen tribes; created the Eight Banner military system' },
    { id: 'kangxi_emperor', name: 'Kangxi Emperor', role: 'ruler', years: '1654/1722', significance: 'Longest-reigning Chinese emperor (61 years); consolidated Qing rule' },
    { id: 'qianlong_emperor', name: 'Qianlong Emperor', role: 'ruler', years: '1711/1799', significance: 'Greatest territorial extent; commissioned the Siku Quanshu — the largest library in history' },
    { id: 'puyi', name: 'Puyi', role: 'last_ruler', years: '1906/1967', significance: 'Last Emperor of China; the final chapter of 2000 years of imperial rule' }
  ]
};

polities.forEach(r => { r.figures = figures[r.id] || []; });
fs.writeFileSync('data/polity.json', JSON.stringify(polities, null, 2));
const total = polities.reduce((n, r) => n + r.figures.length, 0);
console.log('done', polities.filter(r => r.figures.length > 0).length, 'polities with figures,', total, 'total figures');
