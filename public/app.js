const TYPE_COLOR = {
  'A':  '#4ade80',
  'A-': '#86efac',
  'B':  '#60a5fa',
  'C':  '#fb923c',
  'D':  '#f87171',
};

const LABEL_MAP = {
  ethnicity: 'Ruling Ethnicity',
  territory: 'Territory',
  religion:  'Religion',
};

let simulation, nodeSelection, linkSelection;
let allNodes = [], allLinks = [];
let activeFilter = { type: 'all', value: null };

async function init() {
  const db = await fetch('/api/db').then(r => r.json());

  const nodeById = new Map(db.regimes.map(r => [r.id, r]));

  allNodes = db.regimes.map(r => ({
    ...r,
    _duration: Math.max(20, (r.end || 2000) - (r.start || 0)),
  }));

  allLinks = db.successions
    .filter(s => nodeById.has(s.from) && nodeById.has(s.to))
    .map(s => ({
      source: s.from,
      target: s.to,
      type: s.type,
      rationale: s.rationale,
      shared_territories: s.shared_territories || [],
    }));

  buildFilters(db);
  buildGraph(db);
  setupFilterListeners(db);
}

// ── Graph ────────────────────────────────────────────────────────────────────

function buildGraph(db) {
  const container = document.getElementById('graph');
  const W = container.clientWidth;
  const H = container.clientHeight;

  // Color scale — one color per ruling ethnicity
  const ethnicities = [...new Set(allNodes.map(n => n.ruling_ethnicity).filter(Boolean))];
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10.concat(d3.schemePastel1)).domain(ethnicities);

  const svg = d3.select('#graph').append('svg')
    .attr('width', W)
    .attr('height', H);

  // Zoom
  const g = svg.append('g');
  svg.call(d3.zoom().scaleExtent([0.2, 4]).on('zoom', e => g.attr('transform', e.transform)));

  // Arrow markers per succession type
  const defs = svg.append('defs');
  Object.entries(TYPE_COLOR).forEach(([type, color]) => {
    defs.append('marker')
      .attr('id', `arrow-${type}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', color);
  });

  // Links
  linkSelection = g.append('g').attr('class', 'links')
    .selectAll('line')
    .data(allLinks)
    .join('line')
    .attr('class', 'link')
    .attr('stroke', d => TYPE_COLOR[d.type] || '#999')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', d => d.type === 'D' ? '6,4' : null)
    .attr('marker-end', d => `url(#arrow-${d.type})`)
    .attr('opacity', 0.7)
    .on('mouseenter', (event, d) => showLinkTooltip(event, d))
    .on('mouseleave', hideTooltip);

  // Nodes
  nodeSelection = g.append('g').attr('class', 'nodes')
    .selectAll('g')
    .data(allNodes)
    .join('g')
    .attr('class', 'node')
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end',   (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
    )
    .on('click', (e, d) => { e.stopPropagation(); showDetail(d); })
    .on('mouseenter', (event, d) => showNodeTooltip(event, d))
    .on('mouseleave', hideTooltip);

  nodeSelection.append('circle')
    .attr('r', d => nodeRadius(d))
    .attr('fill', d => colorScale(d.ruling_ethnicity))
    .attr('stroke', '#0f1117')
    .attr('stroke-width', 1.5);

  nodeSelection.append('text')
    .attr('dy', d => nodeRadius(d) + 11)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('fill', '#cbd5e0')
    .text(d => d.name);

  // Close detail panel when clicking canvas
  svg.on('click', () => closeDetail());

  // Force simulation
  simulation = d3.forceSimulation(allNodes)
    .force('link', d3.forceLink(allLinks).id(d => d.id).distance(120))
    .force('charge', d3.forceManyBody().strength(-350))
    .force('center', d3.forceCenter(W / 2, H / 2))
    .force('collision', d3.forceCollide().radius(d => nodeRadius(d) + 14))
    .on('tick', () => {
      linkSelection
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      nodeSelection.attr('transform', d => `translate(${d.x},${d.y})`);
    });

  // Store colorScale for later
  window._colorScale = colorScale;
}

function nodeRadius(d) {
  return 6 + Math.sqrt(d._duration) * 0.55;
}

// ── Filters ───────────────────────────────────────────────────────────────────

function buildFilters(db) {
  const filterType  = document.getElementById('filter-type');
  const filterValue = document.getElementById('filter-value');

  filterType.addEventListener('change', () => {
    const type = filterType.value;
    activeFilter = { type, value: null };

    const group = document.getElementById('filter-value-group');
    const label = document.getElementById('filter-value-label');

    if (type === 'all') {
      group.style.display = 'none';
      clearRegimeList();
      applyFilter();
      return;
    }

    group.style.display = 'flex';
    label.textContent = LABEL_MAP[type] || type;
    filterValue.innerHTML = '<option value="">— select —</option>';

    let options = [];
    if (type === 'ethnicity') {
      const counts = {};
      db.regimes.forEach(r => { if (r.ruling_ethnicity) counts[r.ruling_ethnicity] = (counts[r.ruling_ethnicity] || 0) + 1; });
      options = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      options.forEach(([v, n]) => {
        filterValue.innerHTML += `<option value="${v}">${v}  (${n})</option>`;
      });
    } else if (type === 'territory') {
      const counts = {};
      db.regimes.forEach(r => (r.territories || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
      options = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      options.forEach(([v, n]) => {
        const terr = db.territories.find(t => t.id === v);
        filterValue.innerHTML += `<option value="${v}">${terr ? terr.name : v}  (${n})</option>`;
      });
    } else if (type === 'religion') {
      const counts = {};
      db.regimes.forEach(r => { const rel = r.ideology?.religion; if (rel) counts[rel] = (counts[rel] || 0) + 1; });
      options = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      options.forEach(([v, n]) => {
        filterValue.innerHTML += `<option value="${v}">${v}  (${n})</option>`;
      });
    }
  });
}

function setupFilterListeners(db) {
  document.getElementById('filter-value').addEventListener('change', e => {
    activeFilter.value = e.target.value || null;
    applyFilter(db);
  });
}

function applyFilter(db) {
  const { type, value } = activeFilter;

  if (type === 'all' || !value) {
    nodeSelection.attr('opacity', 1);
    linkSelection.attr('opacity', 0.7);
    clearRegimeList();
    return;
  }

  const matchIds = new Set(
    allNodes.filter(n => {
      if (type === 'ethnicity') return n.ruling_ethnicity === value;
      if (type === 'territory') return (n.territories || []).includes(value);
      if (type === 'religion')  return n.ideology?.religion === value;
      return true;
    }).map(n => n.id)
  );

  nodeSelection.attr('opacity', d => matchIds.has(d.id) ? 1 : 0.08);
  linkSelection.attr('opacity', d => {
    const s = typeof d.source === 'object' ? d.source.id : d.source;
    const t = typeof d.target === 'object' ? d.target.id : d.target;
    return matchIds.has(s) && matchIds.has(t) ? 0.9 : 0.04;
  });

  const matched = allNodes.filter(n => matchIds.has(n.id));
  renderRegimeList(matched);
}

function renderRegimeList(regimes) {
  const list  = document.getElementById('regime-list');
  const title = document.getElementById('list-title');

  if (regimes.length === 0) {
    list.innerHTML = '';
    title.style.display = 'none';
    return;
  }

  title.style.display = 'block';
  list.innerHTML = regimes
    .sort((a, b) => a.start - b.start)
    .map(r => {
      const s = formatYear(r.start);
      const e = formatYear(r.end);
      return `<div class="regime-item" onclick="focusNode('${r.id}')">
        <strong>${r.name}</strong>
        <span>${s} — ${e}</span>
      </div>`;
    }).join('');
}

function clearRegimeList() {
  document.getElementById('regime-list').innerHTML = '';
  document.getElementById('list-title').style.display = 'none';
}

// ── Focus node (from list click) ─────────────────────────────────────────────

function focusNode(id) {
  const node = allNodes.find(n => n.id === id);
  if (!node) return;
  showDetail(node);

  // Pulse the node
  nodeSelection
    .filter(d => d.id === id)
    .select('circle')
    .transition().duration(200).attr('stroke', '#f6ad55').attr('stroke-width', 4)
    .transition().duration(400).attr('stroke', '#0f1117').attr('stroke-width', 1.5);
}

// ── Detail Panel ─────────────────────────────────────────────────────────────

function showDetail(regime) {
  const panel = document.getElementById('detail-panel');
  const inner = document.getElementById('detail-inner');

  const figures = (regime.figures || []).map(f =>
    `<div class="figure-item">${f.name}<span class="role">${f.role}</span>
     ${f.years ? `<span style="color:#718096;font-size:10px"> ${f.years}</span>` : ''}</div>`
  ).join('');

  const territories = (regime.territories || []).map(t =>
    `<span class="tag">${t}</span>`
  ).join('');

  const policies = (regime.policies || []).map(p =>
    `<div style="font-size:11px;margin-bottom:4px">
       <strong style="color:#e2e8f0">${p.name || p.id}</strong>
       <span style="color:#718096"> ${p.start}–${p.end}</span>
       ${p.description ? `<div style="color:#a0aec0;margin-top:2px">${p.description}</div>` : ''}
     </div>`
  ).join('');

  inner.innerHTML = `
    <button class="close-btn" onclick="closeDetail()">✕</button>
    <h2>${regime.name}</h2>
    <div class="dates">${formatYear(regime.start)} — ${formatYear(regime.end)}
      <span style="color:#4a5568"> · ${Math.abs((regime.end || 2000) - (regime.start || 0))} years</span>
    </div>

    <div class="detail-section">
      <div class="kv">
        <label>Ethnicity</label><span>${regime.ruling_ethnicity || '—'}</span>
        <label>Court Language</label><span>${regime.cultural_language || '—'}</span>
        <label>Religion</label><span>${regime.ideology?.religion || '—'}</span>
        <label>Government</label><span>${regime.ideology?.government || '—'}</span>
      </div>
    </div>

    ${territories ? `
    <div class="detail-section">
      <div class="section-title">Territories</div>
      <div style="margin-top:4px">${territories}</div>
    </div>` : ''}

    ${figures ? `
    <div class="detail-section">
      <div class="section-title">Key Figures</div>
      <div style="margin-top:4px;display:flex;flex-direction:column;gap:4px">${figures}</div>
    </div>` : ''}

    ${policies ? `
    <div class="detail-section">
      <div class="section-title">Policies</div>
      <div style="margin-top:4px">${policies}</div>
    </div>` : ''}

    ${regime.note ? `
    <div class="detail-section">
      <div class="section-title">Note</div>
      <div class="note-text" style="margin-top:4px">${regime.note}</div>
    </div>` : ''}
  `;

  panel.classList.add('open');
}

function closeDetail() {
  document.getElementById('detail-panel').classList.remove('open');
}

// ── Tooltips ─────────────────────────────────────────────────────────────────

function showNodeTooltip(event, d) {
  const tt = document.getElementById('tooltip');
  tt.innerHTML = `<strong>${d.name}</strong><br>
    ${formatYear(d.start)} — ${formatYear(d.end)}<br>
    <span style="color:#a0aec0">${d.ruling_ethnicity || ''} · ${d.ideology?.religion || ''}</span>`;
  positionTooltip(event, tt);
  tt.classList.add('visible');
}

function showLinkTooltip(event, d) {
  const tt = document.getElementById('tooltip');
  const src = typeof d.source === 'object' ? d.source.name : d.source;
  const tgt = typeof d.target === 'object' ? d.target.name : d.target;
  const territories = d.shared_territories.length ? `<br><span style="color:#718096">via: ${d.shared_territories.join(', ')}</span>` : '';
  tt.innerHTML = `<strong>Type ${d.type}</strong>: ${src} → ${tgt}${territories}
    ${d.rationale ? `<br><span style="color:#a0aec0">${d.rationale}</span>` : ''}`;
  positionTooltip(event, tt);
  tt.classList.add('visible');
}

function hideTooltip() {
  document.getElementById('tooltip').classList.remove('visible');
}

function positionTooltip(event, tt) {
  const x = event.clientX + 14;
  const y = event.clientY - 10;
  tt.style.left = Math.min(x, window.innerWidth - 240) + 'px';
  tt.style.top = y + 'px';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatYear(y) {
  if (y == null) return '?';
  return y < 0 ? `${Math.abs(y)} BC` : `${y} AD`;
}

init();
