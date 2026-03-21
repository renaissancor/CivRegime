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

// All unique time boundary events across all periods in a territory
function timeEvents(periods, NOW) {
  const s = new Set();
  for (const p of periods) { s.add(p.start); s.add(p.end ?? NOW); }
  return [...s].sort((a, b) => a - b);
}

// Build an SVG path for one period.
// The bar expands to full innerW when alone, splits proportionally when coexisting.
// Periods active at the same time are sorted by start (then regime id) for stable left→right order.
function buildPath(period, periods, events, yScale, innerW, NOW) {
  const pEnd = period.end ?? NOW;
  const GAP = 2; // px padding between adjacent bars

  const slices = [];
  for (let i = 0; i < events.length - 1; i++) {
    const t0 = events[i], t1 = events[i + 1];
    if (t0 >= pEnd || t1 <= period.start) continue;

    const mid = (t0 + t1) / 2;
    const active = periods
      .filter(p => p.start <= mid && (p.end ?? NOW) >= mid)
      .sort((a, b) => a.start - b.start || (a.regime || '').localeCompare(b.regime || ''));

    const n = active.length;
    const idx = active.indexOf(period);
    if (idx < 0) continue;

    slices.push({
      t0, t1,
      x1: (idx / n) * innerW + GAP,
      x2: ((idx + 1) / n) * innerW - GAP,
    });
  }

  if (!slices.length) return { path: '', labelX: 0, labelY: 0, labelH: 0 };

  // Build path: left edge downward, then right edge upward, close with Z.
  const pts = [];

  // Left edge (top → bottom)
  pts.push([slices[0].x1, yScale(slices[0].t0)]);
  for (let i = 0; i < slices.length; i++) {
    const { x1, t1 } = slices[i];
    const y1 = yScale(t1);
    const nextX1 = slices[i + 1]?.x1;
    if (nextX1 != null && nextX1 !== x1) {
      pts.push([x1, y1], [nextX1, y1]);
    } else {
      pts.push([x1, y1]);
    }
  }

  // Right edge (bottom → top)
  const last = slices[slices.length - 1];
  pts.push([last.x2, yScale(last.t1)]);
  for (let i = slices.length - 1; i >= 0; i--) {
    const { x2, t0 } = slices[i];
    const y0 = yScale(t0);
    const prevX2 = slices[i - 1]?.x2;
    if (prevX2 != null && prevX2 !== x2) {
      pts.push([x2, y0], [prevX2, y0]);
    } else {
      pts.push([x2, y0]);
    }
  }

  const path = 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z';

  // Label: centre of the tallest slice
  const best = slices.reduce((a, s) => {
    const h = yScale(s.t1) - yScale(s.t0);
    return h > (yScale(a.t1) - yScale(a.t0)) ? s : a;
  }, slices[0]);

  return {
    path,
    labelX: (best.x1 + best.x2) / 2,
    labelY: (yScale(best.t0) + yScale(best.t1)) / 2 + 4,
    labelH: yScale(best.t1) - yScale(best.t0),
  };
}

async function init() {
  const db = await fetch('/api/db').then(r => r.json());
  const regimeById = new Map(db.regimes.map(r => [r.id, r]));

  const list = document.getElementById('territory-list');
  const grouped = [...d3.group(db.territory, t => t.region || 'other').entries()]
    .sort((a, b) => a[0].localeCompare(b[0]));

  for (const [region, items] of grouped) {
    const label = document.createElement('div');
    label.className = 'region-label';
    label.textContent = region.replace(/_/g, ' ');
    list.appendChild(label);

    for (const t of [...items].sort((a, b) => a.name.localeCompare(b.name))) {
      const el = document.createElement('div');
      el.className = 'territory-item';
      el.dataset.id = t.id;
      el.textContent = t.name;
      list.appendChild(el);
    }
  }

  list.addEventListener('click', e => {
    const el = e.target.closest('[data-id]');
    if (!el) return;
    list.querySelectorAll('.territory-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    const t = db.territory.find(t => t.id === el.dataset.id);
    if (t) renderTimeline(t, regimeById);
  });
}

function renderTimeline(territory, regimeById) {
  document.getElementById('territory-title').textContent = territory.name;
  document.getElementById('territory-desc').textContent = territory.description || '';
  document.getElementById('empty-state')?.remove();

  const container = document.getElementById('timeline-container');
  container.innerHTML = '';

  const NOW = 2026;
  const periods = [...(territory.periods || [])];

  if (!periods.length) {
    container.innerHTML = '<div style="color:#4a5568;padding:40px 0">No period data for this territory yet.</div>';
    buildLegend([]);
    return;
  }

  const yMin = d3.min(periods, p => p.start);
  const yMax = d3.max(periods, p => p.end != null ? p.end : NOW);
  const events = timeEvents(periods, NOW);

  const margin  = { top: 28, right: 16, bottom: 28, left: 84 };
  const H       = Math.max(container.clientHeight || 500, 400);
  const innerH  = H - margin.top - margin.bottom;
  const innerW  = Math.max((container.clientWidth || 600) - margin.left - margin.right, 100);

  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.setAttribute('width', margin.left + innerW + margin.right);
  svgEl.setAttribute('height', H);
  container.appendChild(svgEl);

  const svg = d3.select(svgEl);

  const clipId = `clip-${territory.id.replace(/\W/g, '_')}`;
  svg.append('defs').append('clipPath').attr('id', clipId)
    .append('rect').attr('width', innerW).attr('height', innerH);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Chart border
  g.append('rect')
    .attr('x', 0).attr('y', 0).attr('width', innerW).attr('height', innerH)
    .attr('fill', 'none').attr('stroke', '#2d3748').attr('stroke-width', 1);

  const barsG = g.append('g').attr('clip-path', `url(#${clipId})`);
  const labsG = g.append('g').attr('clip-path', `url(#${clipId})`).attr('pointer-events', 'none');
  const axisG = g.append('g');

  const yOrig = d3.scaleLinear().domain([yMin, yMax]).range([0, innerH]);

  const tip = document.getElementById('tooltip');

  function redraw(yScale) {
    const pathData = periods.map(p => ({
      period: p,
      ...buildPath(p, periods, events, yScale, innerW, NOW),
    }));

    // Bars
    barsG.selectAll('path')
      .data(pathData, d => d.period.regime || String(d.period.start))
      .join('path')
      .attr('d', d => d.path)
      .attr('fill', d => d.period.regime
        ? ethnicColor(regimeById.get(d.period.regime)?.ruling_ethnicity || d.period.regime)
        : '#252e42')
      .attr('stroke', '#0f1117')
      .attr('stroke-width', 1)
      .on('mouseover', (e, d) => {
        const r = regimeById.get(d.period.regime);
        tip.innerHTML = [
          `<strong>${r?.name || d.period.regime || 'Uncontrolled'}</strong>`,
          `${formatYear(d.period.start)} – ${formatYear(d.period.end)}`,
          r?.ruling_ethnicity ? `Ethnicity: ${r.ruling_ethnicity}` : '',
          r?.ideology?.religion ? `Religion: ${r.ideology.religion}` : '',
          d.period.note ? `<em>${d.period.note}</em>` : '',
        ].filter(Boolean).join('<br>');
        tip.classList.add('visible');
      })
      .on('mousemove', e => {
        tip.style.left = (e.clientX + 14) + 'px';
        tip.style.top  = (e.clientY - 12) + 'px';
      })
      .on('mouseout', () => tip.classList.remove('visible'));

    // Labels
    labsG.selectAll('text')
      .data(pathData, d => d.period.regime || String(d.period.start))
      .join('text')
      .attr('x', d => d.labelX)
      .attr('y', d => d.labelY)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', '#0f1117')
      .attr('font-weight', '600')
      .text(d => {
        if (d.labelH < 20 || !d.period.regime) return '';
        const name = regimeById.get(d.period.regime)?.name || d.period.regime;
        return d.labelH < 34 ? '' : name;
      });

    // Left axis
    const tickCount = Math.min(14, Math.max(4, Math.floor(innerH / 55)));
    axisG.call(
      d3.axisLeft(yScale).ticks(tickCount).tickFormat(y => formatYear(Math.round(y)))
    );
    axisG.selectAll('text').attr('fill', '#718096').attr('font-size', 11);
    axisG.selectAll('.domain, line').attr('stroke', '#2d3748');
  }

  svg.call(
    d3.zoom().scaleExtent([0.4, 40])
      .on('zoom', e => redraw(e.transform.rescaleY(yOrig)))
  );

  redraw(yOrig);

  // Legend
  const seen = new Map();
  for (const p of periods) {
    if (p.regime) {
      const r = regimeById.get(p.regime);
      if (r && !seen.has(r.ruling_ethnicity)) seen.set(r.ruling_ethnicity, ethnicColor(r.ruling_ethnicity));
    }
  }
  buildLegend([...seen.entries()]);
}

function buildLegend(entries) {
  const legend = document.getElementById('legend');
  legend.innerHTML = '';
  for (const [label, color] of entries) {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<div class="legend-swatch" style="background:${color}"></div>${label}`;
    legend.appendChild(item);
  }
}

init();
