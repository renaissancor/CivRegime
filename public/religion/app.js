const FAMILY_PALETTE = ['#60a5fa','#fb923c','#4ade80','#fbbf24','#a78bfa','#f472b6','#34d399','#38bdf8'];
const familyColor = {};

const PREHISTORIC_YEAR = -3000;
const TIMELINE_START   = -3500;
const TIMELINE_END     = 2100;
const PX_PER_YEAR = 0.3;

// Absolute Y pixel position per node.  X = years, Y = this value.
//
// Dharmic and East Asian each get their own bands (temporally dense).
// Paganism shares Y values with Islam + Christianity — no visual collision
// because paganism nodes are on the far-left of the X axis (prehistoric/ancient)
// while Islam and Christianity are on the right (600 CE – present).
const Y = {
  // ── Dharmic (0–440) ───────────────────────────────────────────────────────
  dharmic:                   0,
  jainism:                  40,
  hinduism:                 80,
  shaivism:                120,
  vaishnavism:             160,
  buddhism:                200,
  theravada:               240,
  mahayana:                280,
  chan_zen:                320,
  vajrayana:               360,
  sikhism:                 440,

  // ── East Asian (520–880) ──────────────────────────────────────────────────
  east_asian_traditions:   520,
  chinese_folk_religion:   560,
  taoism:                  600,
  legalism:                640,
  confucianism:            680,
  neo_confucianism:        720,
  shinto:                  760,
  shinto_buddhism:         800,
  neo_confucianism_shinto: 840,
  state_shinto:            880,

  // ── Judaism (960–1040) ────────────────────────────────────────────────────
  judaism:                 960,
  temple_judaism:         1000,
  rabbinic_judaism:       1040,

  // ── Zoroastrian group above Islam/Christianity ────────────────────────────
  zoroastrianism:         1080,
  zurvanism:              1120,
  manichaeism:            1160,

  // ── Islam + paganism sharing Y 1240–1720 ──────────────────────────────────
  // Islam nodes on the right (622 CE+), pagan nodes on the left (prehistoric).
  islam:                  1240,  mesopotamian_religion:  1240,
  sunni:                  1280,  anatolian_paganism:     1280,
  sunni_hanafi:           1320,  egyptian_religion:      1320,
  sunni_maliki:           1360,  canaanite_religion:     1360,
  sunni_shafi:            1400,  arabian_paganism:       1400,
  sunni_hanbali:          1440,  hellenic_paganism:      1440,
  ibadi:                  1520,  roman_paganism:         1520,
  shia:                   1600,  animism:                1600,
  shia_twelver:           1640,  tengriism:              1640,
  shia_ismaili:           1680,  manchu_shamanism:       1680,
  shia_zaydi:             1720,  germanic_paganism:      1720,

  // ── Christianity + remaining paganism sharing Y 1800–2800 ─────────────────
  christianity:           1800,  celtic_paganism:        1800,
  early_christianity:     1840,  slavic_paganism:        1840,
  church_of_east:         1880,  lithuanian_paganism:    1880,
  assyrian_church:        1920,
  oriental_orthodox:      1960,
  armenian_apostolic:     2000,
  coptic_church:          2040,
  ethiopian_tewahido:     2080,
  eritrean_tewahido:      2120,
  eastern_orthodox:       2160,
  georgian_orthodox:      2200,
  greek_orthodox:         2240,
  bulgarian_orthodox:     2280,
  serbian_orthodox:       2320,
  russian_orthodox:       2360,
  romanian_orthodox:      2400,
  catholic:               2480,
  protestant:             2560,
  lutheranism:            2600,
  calvinism:              2640,
  anglicanism:            2680,
  baptist:                2720,
  methodism:              2760,
  evangelical:            2800,
};

function getDescendants(id, nodes) {
  const children = nodes.filter(n => n.parent === id);
  return children.flatMap(c => [c, ...getDescendants(c.id, nodes)]);
}

function rootColor(nodeId, allReligions) {
  let n = allReligions.find(r => r.id === nodeId);
  while (n && n.parent) n = allReligions.find(r => r.id === n.parent);
  return n ? (familyColor[n.id] || '#718096') : '#718096';
}

function formatYear(founded) {
  if (founded === 'prehistoric') return 'prehistoric';
  if (founded == null) return null;
  return founded < 0 ? `${Math.abs(founded)} BCE` : `${founded} CE`;
}

function buildYearMap(nodes) {
  const cache = new Map();
  const byId  = new Map(nodes.map(n => [n.id, n]));

  function resolve(id) {
    if (cache.has(id)) return cache.get(id);
    const node = byId.get(id);
    if (!node) { cache.set(id, TIMELINE_START); return TIMELINE_START; }
    let yr;
    if (node.founded === 'prehistoric')        yr = PREHISTORIC_YEAR;
    else if (typeof node.founded === 'number') yr = node.founded;
    else {
      const children = nodes.filter(n => n.parent === id);
      yr = children.length
        ? Math.min(...children.map(c => resolve(c.id))) - 80
        : 0;
    }
    cache.set(id, yr);
    return yr;
  }

  nodes.forEach(n => resolve(n.id));
  return cache;
}

async function init() {
  const db = await fetch('/api/db').then(r => r.json());

  const regimesByRel = new Map();
  for (const r of db.regimes) {
    const rel = r.ideology?.religion;
    if (rel) {
      if (!regimesByRel.has(rel)) regimesByRel.set(rel, []);
      regimesByRel.get(rel).push(r);
    }
  }

  const roots = db.religions.filter(r => r.parent == null);
  roots.forEach((r, i) => { familyColor[r.id] = FAMILY_PALETTE[i % FAMILY_PALETTE.length]; });

  const list = document.getElementById('family-list');
  const allBtn = document.createElement('button');
  allBtn.className = 'family-btn active';
  allBtn.dataset.family = 'all';
  allBtn.textContent = 'All Religions';
  list.appendChild(allBtn);
  for (const root of roots) {
    const btn = document.createElement('button');
    btn.className = 'family-btn';
    btn.dataset.family = root.id;
    btn.style.borderLeftColor = familyColor[root.id];
    btn.textContent = root.name;
    list.appendChild(btn);
  }

  list.addEventListener('click', e => {
    const btn = e.target.closest('[data-family]');
    if (!btn) return;
    list.querySelectorAll('.family-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTree(btn.dataset.family, db.religions, regimesByRel);
  });

  renderTree('all', db.religions, regimesByRel);
}

function renderTree(familyId, allReligions, regimesByRel) {
  const svg = d3.select('#tree-svg');
  svg.selectAll('*').remove();

  // ── Build node list ────────────────────────────────────────────────────────
  let nodes;
  if (familyId === 'all') {
    nodes = [
      { id: '__root__', parent: null, name: '', founded: null },
      ...allReligions.map(r => ({ ...r, parent: r.parent ?? '__root__' }))
    ];
  } else {
    const root = allReligions.find(r => r.id === familyId);
    if (!root) return;
    nodes = [{ ...root, parent: null }, ...getDescendants(familyId, allReligions)];
  }

  const stratify = d3.stratify().id(d => d.id).parentId(d => d.parent);
  let hierarchy;
  try { hierarchy = stratify(nodes); } catch { return; }

  // ── Assign explicit row positions (x) and time positions (timeY) ──────────
  const yearMap = buildYearMap(nodes);
  const timeScale = d3.scaleLinear()
    .domain([TIMELINE_START, TIMELINE_END])
    .range([0, (TIMELINE_END - TIMELINE_START) * PX_PER_YEAR]);

  // Assign x from ROWS table; fall back to average of children for unknowns
  hierarchy.eachAfter(d => {
    const y = Y[d.data.id];
    if (y != null) {
      d.x = y;
    } else if (d.children && d.children.length) {
      d.x = d.children.reduce((s, c) => s + c.x, 0) / d.children.length;
    } else {
      d.x = 0;
    }
    d.timeY = timeScale(yearMap.get(d.data.id) ?? 0);
  });

  // ── Zoom / pan ─────────────────────────────────────────────────────────────
  const zoom = d3.zoom().scaleExtent([0.08, 8]).on('zoom', e => {
    g.attr('transform', e.transform);
    const k = e.transform.k;
    g.selectAll('.node-label').style('opacity', k > 0.5 ? Math.min(1, (k - 0.5) * 4) : 0);
    g.selectAll('.node-year') .style('opacity', k > 1.0 ? Math.min(1, (k - 1.0) * 4) : 0);
  });
  svg.call(zoom);

  let minX = Infinity, maxX = -Infinity;
  hierarchy.each(d => { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); });

  const g = svg.append('g');

  // Fit full timeline into view on load
  const svgW    = document.getElementById('tree-svg').clientWidth  || 900;
  const svgH    = document.getElementById('tree-svg').clientHeight || 600;
  const totalPx = timeScale(TIMELINE_END);
  const fitK    = (svgW - 120) / totalPx;
  const initTy  = svgH / 2 - ((minX + maxX) / 2) * fitK;
  svg.call(zoom.transform, d3.zoomIdentity.translate(60, initTy).scale(fitK));

  // ── Time axis ──────────────────────────────────────────────────────────────
  const axisY     = maxX + 50;
  const tickYears = [-3000, -2000, -1000, -500, 0, 500, 1000, 1500, 2000];

  g.append('line').attr('class', 'axis-baseline')
    .attr('x1', timeScale(TIMELINE_START)).attr('x2', timeScale(TIMELINE_END))
    .attr('y1', axisY).attr('y2', axisY);

  g.selectAll('.axis-tick-line').data(tickYears).join('line')
    .attr('class', 'axis-tick-line')
    .attr('x1', yr => timeScale(yr)).attr('x2', yr => timeScale(yr))
    .attr('y1', minX - 20).attr('y2', axisY + 4);

  g.selectAll('.axis-tick-label').data(tickYears).join('text')
    .attr('class', 'axis-tick-label')
    .attr('x', yr => timeScale(yr)).attr('y', axisY + 14)
    .attr('text-anchor', 'middle')
    .text(yr => yr < 0 ? `${Math.abs(yr)} BCE` : (yr === 0 ? '0' : `${yr} CE`));

  g.append('line').attr('class', 'axis-bce-line')
    .attr('x1', timeScale(0)).attr('x2', timeScale(0))
    .attr('y1', minX - 20).attr('y2', axisY);

  // ── Links ──────────────────────────────────────────────────────────────────
  g.selectAll('.link')
    .data(hierarchy.links())
    .join('path')
    .attr('class', 'link')
    .attr('d', d3.linkHorizontal().x(d => d.timeY).y(d => d.x));

  // ── Node groups ────────────────────────────────────────────────────────────
  const node = g.selectAll('.node')
    .data(hierarchy.descendants().filter(d => d.data.id !== '__root__'))
    .join('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.timeY},${d.x})`)
    .style('cursor', 'pointer')
    .on('click', (e, d) => showDetail(d.data, allReligions, regimesByRel))
    .on('mouseover', (e, d) => {
      const tip   = document.getElementById('tooltip');
      const count = regimesByRel.get(d.data.id)?.length || 0;
      const yr    = formatYear(d.data.founded);
      tip.innerHTML = `<strong>${d.data.name || d.data.id}</strong>`
        + (yr    ? `<br><span style="color:#a0aec0">${yr}</span>` : '')
        + (count ? `<br>${count} regime${count > 1 ? 's' : ''}` : '');
      tip.classList.add('visible');
    })
    .on('mousemove', e => {
      const tip = document.getElementById('tooltip');
      tip.style.left = (e.clientX + 12) + 'px';
      tip.style.top  = (e.clientY - 10) + 'px';
    })
    .on('mouseout', () => document.getElementById('tooltip').classList.remove('visible'));

  node.append('circle')
    .attr('r', 5)
    .attr('fill', d => {
      const color = rootColor(d.data.id, allReligions);
      return (d.children || d._children) ? color : color + '66';
    })
    .attr('stroke', d => rootColor(d.data.id, allReligions))
    .attr('stroke-width', 1.5);

  node.filter(d => (regimesByRel.get(d.data.id)?.length || 0) > 0)
    .append('text')
    .attr('x', -12).attr('dy', '0.32em')
    .attr('text-anchor', 'middle')
    .attr('font-size', 10)
    .attr('fill', '#f6ad55')
    .text(d => regimesByRel.get(d.data.id)?.length);

  node.append('text')
    .attr('class', 'node-label')
    .attr('x', 10).attr('dy', '0.32em')
    .style('opacity', 0)
    .text(d => d.data.name || d.data.id);

  node.filter(d => d.data.founded != null)
    .append('text')
    .attr('class', 'node-year')
    .attr('x', 10).attr('dy', '1.5em')
    .attr('font-size', 9).attr('fill', '#4a5568')
    .style('opacity', 0)
    .text(d => formatYear(d.data.founded));
}

function showDetail(data, allReligions, regimesByRel) {
  const panel   = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');
  const regimes     = regimesByRel.get(data.id) || [];
  const descendants = getDescendants(data.id, allReligions);
  const allRelRegimes = [...new Set(
    [data.id, ...descendants.map(d => d.id)].flatMap(id => regimesByRel.get(id) || [])
  )];

  let html = `<h2>${data.name || data.id}</h2>`;
  if (data.founded != null) {
    html += `<div class="meta-row"><span class="meta-key">Founded</span><span class="meta-val">${formatYear(data.founded)}</span></div>`;
  }
  if (data.parent) {
    const parentNode = allReligions.find(r => r.id === data.parent);
    html += `<div class="sub">Branch of: ${parentNode ? parentNode.name : data.parent}</div>`;
  }
  if (descendants.length) html += `<div class="sub">${descendants.length} sub-branch${descendants.length > 1 ? 'es' : ''}</div>`;
  if (data.note) html += `<div class="note-text">${data.note}</div>`;

  if (regimes.length) {
    html += `<div class="section-title">Uses this religion directly (${regimes.length})</div>`;
    for (const r of regimes) {
      const dates = r.end ? `${r.start}–${r.end}` : `${r.start}–`;
      html += `<div class="regime-item"><strong>${r.name}</strong><span>${dates} · ${r.ruling_ethnicity}</span></div>`;
    }
  }
  if (allRelRegimes.length > regimes.length) {
    const sub = allRelRegimes.filter(r => !regimes.includes(r));
    html += `<div class="section-title">In sub-branches (${sub.length})</div>`;
    for (const r of sub) {
      const dates = r.end ? `${r.start}–${r.end}` : `${r.start}–`;
      html += `<div class="regime-item"><strong>${r.name}</strong><span>${dates}</span></div>`;
    }
  }
  if (!allRelRegimes.length) {
    html += `<div class="sub" style="margin-top:8px">No regimes in this branch yet.</div>`;
  }

  content.innerHTML = html;
  panel.classList.add('open');
}

init();
