/**
 * Migration: merges territories.json + territory_history.json
 * into data/cradles/{region}/{id}.json
 */

const fs   = require('fs');
const path = require('path');
const db   = require('../data');

const REGION_MAP = {
  anatolia:             'middle_east',
  mesopotamia:          'middle_east',
  levant:               'middle_east',
  egypt:                'middle_east',
  nubia:                'middle_east',
  north_africa:         'middle_east',
  arabia:               'middle_east',

  iran_plateau:         'persia_central_asia',
  khorasan:             'persia_central_asia',
  caucasus:             'persia_central_asia',
  transoxiana:          'persia_central_asia',

  pontic_steppe:        'steppe',
  central_asian_steppe: 'steppe',
  mongolian_plateau:    'steppe',

  balkans:              'europe',
  italy:                'europe',
  iberia:               'europe',
  gaul:                 'europe',

  yellow_river:         'east_asia',
  yangtze:              'east_asia',
  manchuria:            'east_asia',

  indus_valley:         'south_asia',
  punjab:               'south_asia',
  ganges_plain:         'south_asia',
  deccan:               'south_asia',
};

const TARGET = path.join(__dirname, '../data/cradles');

// Build history lookup
const historyById = new Map(db.territory_history.map(t => [t.territory, t]));

let written = 0;
const unrouted = [];

for (const terr of db.territories) {
  const region = REGION_MAP[terr.id];
  if (!region) { unrouted.push(terr.id); continue; }

  const history = historyById.get(terr.id);

  const doc = {
    id:          terr.id,
    name:        terr.name,
    description: terr.description,
    region,
    geo:         null,
    periods:     history ? history.periods : [],
  };

  const dir = path.join(TARGET, region);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${terr.id}.json`),
    JSON.stringify(doc, null, 2) + '\n'
  );
  written++;
}

console.log(`\nWrote ${written} territory files`);
if (unrouted.length) console.warn(`Unrouted territories: ${unrouted.join(', ')}`);
console.log('Done.\n');
