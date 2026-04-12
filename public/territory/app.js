/* ── State Timeline ─────────────────────────────────────────────
   Shows polities as vertical bars on a time axis, colored by
   ethnicity, with succession arrows connecting them.
   Sidebar groups by territory (until state_id is populated).
   ─────────────────────────────────────────────────────────────── */

const ETHNICITY_PALETTE = [
  '#4ade80','#60a5fa','#fb923c','#f87171',
  '#a78bfa','#34d399','#fbbf24','#f472b6',
  '#38bdf8','#a3e635','#fb7185','#818cf8',
];

function ethnicColor(id) {
  if (!id) return '#1e2535';
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return ETHNICITY_PALETTE[Math.abs(h) % ETHNICITY_PALETTE.length];
}

function formatYear(y) {
  if (y == null) return '?';
  return y < 0 ? `${Math.abs(y)} BC` : `${y} CE`;
}

const ARROW_COLORS = {
  same: '#4ade80',
  expansion: '#60a5fa',
  contraction: '#facc15',
  displacement: '#fb923c',
  unknown: '#718096',
};

// ── Data ────────────────────────────────────────────────────────

let allPolities = [];
let polityById = {};
let allSuccessions = [];
let allTerritories = [];

async function init() {
  const [polities, successions, territories] = await Promise.all([
    fetch('/api/polity').then(r => r.json()),
    fetch('/api/succession').then(r => r.json()),
    fetch('/api/territory').then(r => r.json()),
  ]);

  allPolities = polities;
  polityById = {};
  polities.forEach(p => { polityById[p.id] = p; });
  allSuccessions = successions;
  allTerritories = territories;

  buildSidebar(territories);

  // Deep-link support
  const params = new URLSearchParams(location.search);
  const tid = params.get('id');
  if (tid) {
    const el = document.querySelector(`[data-id="${tid}"]`);
    if (el) {
      el.classList.add('active');
      el.scrollIntoView({ block: 'center' });
      selectTerritory(tid);
    }
  }
}

// ── Sidebar ─────────────────────────────────────────────────────

function buildSidebar(territories) {
  const list = document.getElementById('sidebar-list');
  list.innerHTML = '';

  // Group by region
  const grouped = new Map();
  for (const t of territories) {
    const region = t.region || 'other';
    if (!grouped.has(region)) grouped.set(region, []);
    grouped.get(region).push(t);
  }

  // Count polities per territory for display
  const terrPolityCount = {};
  for (const p of allPolities) {
    for (const tid of p.territories || []) {
      terrPolityCount[tid] = (terrPolityCount[tid] || 0) + 1;
    }
  }

  const sortedRegions = [...grouped.keys()].sort();
  for (const region of sortedRegions) {
    const label = document.createElement('div');
    label.className = 'group-label';
    label.textContent = region.replace(/_/g, ' ');
    list.appendChild(label);

    const items = grouped.get(region).sort((a, b) => a.name.localeCompare(b.name));
    for (const t of items) {
      const el = document.createElement('div');
      el.className = 'sidebar-item';
      el.dataset.id = t.id;
      const count = terrPolityCount[t.id] || 0;
      el.innerHTML = `${t.name} <span class="count">${count}</span>`;
      list.appendChild(el);
    }
  }

  list.addEventListener('click', e => {
    const el = e.target.closest('[data-id]');
    if (!el) return;
    list.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    selectTerritory(el.dataset.id);
    history.replaceState(null, '', `?id=${el.dataset.id}`);
  });
}

// ── Select territory ────────────────────────────────────────────

function selectTerritory(territoryId) {
  const territory = allTerritories.find(t => t.id === territoryId);
  const name = territory?.name || territoryId.replace(/_/g, ' ');

  document.getElementById('main-title').textContent = name;
  document.getElementById('main-subtitle').textContent = '';

  // Find polities that control this territory
  const polities = allPolities.filter(p =>
    (p.territories || []).includes(territoryId)
  );

  if (!polities.length) {
    document.getElementById('chart-container').innerHTML =
      '<div id="empty-state">No polities found for this territory</div>';
    document.getElementById('legend').innerHTML = '';
    document.getElementById('main-subtitle').textContent = '0 polities';
    return;
  }

  document.getElementById('main-subtitle').textContent = `${polities.length} polities`;

  // Find successions between these polities
  const idSet = new Set(polities.map(p => p.id));
  const successions = allSuccessions.filter(s => idSet.has(s.from) && idSet.has(s.to));

  renderTimeline(polities, successions, territoryId);
}

// ── Lane assignment (interval scheduling) ───────────────────────
// Assign each polity to an X-lane so overlapping polities don't
// share the same column. Greedy left-most-lane-first algorithm.

function assignLanes(polities, NOW) {
  const sorted = [...polities].sort((a, b) => (a.start ?? -5000) - (b.start ?? -5000));
  const laneEnds = []; // laneEnds[i] = latest end year in lane i
  const assignment = new Map();

  for (const p of sorted) {
    const pStart = p.start ?? -5000;
    const pEnd = p.end ?? NOW;

    // Find first lane where this polity fits (no overlap)
    let placed = false;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] <= pStart) {
        laneEnds[i] = pEnd;
        assignment.set(p.id, i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      assignment.set(p.id, laneEnds.length);
      laneEnds.push(pEnd);
    }
  }

  return { assignment, laneCount: laneEnds.length };
}

// ── Timeline renderer ───────────────────────────────────────────

function renderTimeline(polities, successions, territoryId) {
  const container = document.getElementById('chart-container');
  container.innerHTML = '';

  const NOW = 2026;
  const yMin = d3.min(polities, p => p.start ?? -3000);
  const yMax = d3.max(polities, p => p.end ?? NOW);

  const { assignment, laneCount } = assignLanes(polities, NOW);

  const margin = { top: 20, right: 24, bottom: 20, left: 80 };
  const W = container.clientWidth || 800;
  const H = Math.max(container.clientHeight || 500, 400);
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  const barW = Math.max(Math.min(innerW / (laneCount || 1), 120), 24);
  const chartW = barW * (laneCount || 1);
  const GAP = 4; // gap between bars

  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.setAttribute('width', W);
  svgEl.setAttribute('height', H);
  container.appendChild(svgEl);

  const svg = d3.select(svgEl);

  const clipId = `clip-state-${territoryId.replace(/\W/g, '_')}`;
  svg.append('defs').append('clipPath').attr('id', clipId)
    .append('rect').attr('width', innerW + 10).attr('height', innerH);

  const root = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const yOrig = d3.scaleLinear().domain([yMin, yMax]).range([0, innerH]);

  // Chart border
  root.append('rect')
    .attr('x', 0).attr('y', 0).attr('width', innerW).attr('height', innerH)
    .attr('fill', 'none').attr('stroke', '#2d3748').attr('stroke-width', 1);

  const barsG = root.append('g').attr('clip-path', `url(#${clipId})`);
  const arrowG = root.append('g').attr('clip-path', `url(#${clipId})`);
  const labsG = root.append('g').attr('clip-path', `url(#${clipId})`).attr('pointer-events', 'none');
  const axisG = root.append('g');

  const tip = document.getElementById('tooltip');

  // ── Arrow marker defs ──
  const defs = svg.select('defs');
  for (const [dir, color] of Object.entries(ARROW_COLORS)) {
    defs.append('marker')
      .attr('id', `arrow-${dir}`)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 10).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,0 L10,5 L0,10 Z')
      .attr('fill', color);
  }

  function redraw(yScale) {
    // ── Bars ──
    const barData = polities.map(p => {
      const lane = assignment.get(p.id) || 0;
      const pStart = p.start ?? yMin;
      const pEnd = p.end ?? NOW;
      const x = lane * barW + GAP;
      const w = barW - GAP * 2;
      const y0 = yScale(pStart);
      const y1 = yScale(pEnd);
      return { polity: p, x, w, y: y0, h: y1 - y0, lane, yMid: (y0 + y1) / 2 };
    });

    const barById = {};
    barData.forEach(b => { barById[b.polity.id] = b; });

    barsG.selectAll('rect.polity-bar')
      .data(barData, d => d.polity.id)
      .join('rect')
      .attr('class', 'polity-bar')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', d => d.w)
      .attr('height', d => Math.max(d.h, 2))
      .attr('rx', 3)
      .attr('fill', d => ethnicColor(d.polity.ruling_ethnicity))
      .attr('stroke', '#0f1117')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .on('mouseover', (e, d) => {
        const p = d.polity;
        tip.innerHTML = [
          `<strong>${p.name || p.id}</strong>`,
          `${formatYear(p.start)} – ${formatYear(p.end)}`,
          p.ruling_ethnicity ? `Ethnicity: ${p.ruling_ethnicity}` : '',
          p.cultural_language ? `Language: ${p.cultural_language}` : '',
          p.government ? `Government: ${p.government}` : '',
        ].filter(Boolean).join('<br>');
        tip.classList.add('visible');
      })
      .on('mousemove', e => {
        tip.style.left = (e.clientX + 14) + 'px';
        tip.style.top = (e.clientY - 12) + 'px';
      })
      .on('mouseout', () => tip.classList.remove('visible'))
      .on('click', (e, d) => {
        window.open(`/regime/?id=${d.polity.id}`, '_blank');
      });

    // ── Labels ──
    labsG.selectAll('text.bar-label')
      .data(barData, d => d.polity.id)
      .join('text')
      .attr('class', 'bar-label')
      .attr('x', d => d.x + d.w / 2)
      .attr('y', d => d.y + d.h / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', d => d.h > 30 ? 11 : (d.h > 16 ? 9 : 0))
      .attr('fill', '#0f1117')
      .attr('font-weight', '600')
      .text(d => {
        if (d.h < 16) return '';
        const name = d.polity.name || d.polity.id;
        const maxChars = Math.floor(d.w / 6);
        return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
      });

    // ── Succession arrows ──
    const arrowData = successions
      .map(s => {
        const from = barById[s.from];
        const to = barById[s.to];
        if (!from || !to) return null;
        const dir = (s.territorial_direction || 'unknown').toLowerCase();
        return { s, from, to, dir };
      })
      .filter(Boolean);

    arrowG.selectAll('path.succession-arrow')
      .data(arrowData, d => `${d.s.from}-${d.s.to}`)
      .join('path')
      .attr('class', d => `succession-arrow ${d.dir}`)
      .attr('d', d => {
        // Arrow from bottom of predecessor to top of successor
        const x1 = d.from.x + d.from.w / 2;
        const y1 = d.from.y + d.from.h;
        const x2 = d.to.x + d.to.w / 2;
        const y2 = d.to.y;

        // If same lane, slight S-curve to the right
        if (d.from.lane === d.to.lane) {
          const off = barW * 0.4;
          const midY = (y1 + y2) / 2;
          return `M${x1},${y1} C${x1 + off},${midY} ${x2 + off},${midY} ${x2},${y2}`;
        }

        // Different lanes: smooth cubic bezier
        const midY = (y1 + y2) / 2;
        return `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;
      })
      .attr('marker-end', d => `url(#arrow-${d.dir})`)
      .on('mouseover', (e, d) => {
        const fromName = polityById[d.s.from]?.name || d.s.from;
        const toName = polityById[d.s.to]?.name || d.s.to;
        tip.innerHTML = [
          `<strong>${fromName} → ${toName}</strong>`,
          `Direction: ${d.dir}`,
          d.s.same_ethnicity ? 'Same ethnicity' : 'Different ethnicity',
          d.s.same_language ? 'Same language' : 'Different language',
          d.s.same_religion ? 'Same religion' : 'Different religion',
        ].join('<br>');
        tip.classList.add('visible');
      })
      .on('mousemove', e => {
        tip.style.left = (e.clientX + 14) + 'px';
        tip.style.top = (e.clientY - 12) + 'px';
      })
      .on('mouseout', () => tip.classList.remove('visible'));

    // ── Y axis ──
    const tickCount = Math.min(14, Math.max(4, Math.floor(innerH / 55)));
    axisG.call(
      d3.axisLeft(yScale).ticks(tickCount).tickFormat(y => formatYear(Math.round(y)))
    );
    axisG.selectAll('text').attr('fill', '#718096').attr('font-size', 11);
    axisG.selectAll('.domain, line').attr('stroke', '#2d3748');
  }

  // ── Zoom ──
  svg.call(
    d3.zoom().scaleExtent([0.3, 50])
      .on('zoom', e => redraw(e.transform.rescaleY(yOrig)))
  );

  redraw(yOrig);

  // ── Legend ──
  buildLegend(polities);
}

// ── Legend ───────────────────────────────────────────────────────

function buildLegend(polities) {
  const legend = document.getElementById('legend');
  legend.innerHTML = '';

  // Ethnicity-based legend
  const seen = new Map();
  for (const p of polities) {
    const eth = p.ruling_ethnicity;
    if (eth && !seen.has(eth)) seen.set(eth, ethnicColor(eth));
  }

  for (const [label, color] of seen) {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<div class="legend-swatch" style="background:${color}"></div>${label}`;
    legend.appendChild(item);
  }

  // Arrow direction legend
  if (legend.children.length) {
    const sep = document.createElement('div');
    sep.style.cssText = 'width:1px;height:16px;background:#2d3748;margin:0 4px';
    legend.appendChild(sep);
  }

  for (const [dir, color] of Object.entries(ARROW_COLORS)) {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<div class="legend-swatch" style="background:${color};border-radius:50%"></div>${dir}`;
    legend.appendChild(item);
  }
}

init();
