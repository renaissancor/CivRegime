const FAMILY_PALETTE = [
  '#60a5fa', '#fb923c', '#4ade80', '#fbbf24', '#a78bfa',
  '#f472b6', '#34d399', '#38bdf8', '#f87171', '#34d399'
];
const familyColor = {};

let tooltipTimeout = null;

function getDescendants(id, nodes) {
  const children = nodes.filter(n => n.parent === id);
  return children.flatMap(c => [c, ...getDescendants(c.id, nodes)]);
}

function rootColor(nodeId, allLanguages) {
  let n = allLanguages.find(l => l.id === nodeId);
  while (n && n.parent) n = allLanguages.find(l => l.id === n.parent);
  return n ? (familyColor[n.id] || '#718096') : '#718096';
}

async function init() {
  let languages, polities;
  try {
    [languages, polities] = await Promise.all([
      cachedFetch('/api/taxonomy/language'),
      cachedFetch('/api/polity'),
    ]);
  } catch (err) {
    showError('Failed to load language data');
    return;
  }

  // Map language id → regimes that use it as cultural_language
  const regimesByLang = new Map();
  for (const r of polities) {
    const lang = r.cultural_language;
    if (lang) {
      if (!regimesByLang.has(lang)) regimesByLang.set(lang, []);
      regimesByLang.get(lang).push(r);
    }
  }

  // Root families
  const roots = languages.filter(l => l.parent == null);
  roots.forEach((l, i) => { familyColor[l.id] = FAMILY_PALETTE[i % FAMILY_PALETTE.length]; });

  // Sidebar
  const list = document.getElementById('family-list');
  const allBtn = document.createElement('button');
  allBtn.className = 'family-btn active';
  allBtn.dataset.family = 'all';
  allBtn.textContent = 'All';
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
    renderTree(btn.dataset.family, languages, regimesByLang);
  });

  renderTree('all', languages, regimesByLang);
}

function renderTree(familyId, allLanguages, regimesByLang) {
  const svg = d3.select('#tree-svg');
  svg.selectAll('*').remove();

  // Build node list
  let nodes;
  if (familyId === 'all') {
    nodes = [
      { id: '__root__', parent: null, name: '' },
      ...allLanguages.map(l => ({ ...l, parent: l.parent ?? '__root__' }))
    ];
  } else {
    const root = allLanguages.find(l => l.id === familyId);
    if (!root) return;
    nodes = [{ ...root, parent: null }, ...getDescendants(familyId, allLanguages)];
  }

  const stratify = d3.stratify().id(d => d.id).parentId(d => d.parent);
  let hierarchy;
  try { hierarchy = stratify(nodes); } catch { return; }

  // Tighter vertical spacing for deep language trees
  const tree = d3.tree().nodeSize([22, 220]);
  tree(hierarchy);

  // Zoom / pan
  const zoom = d3.zoom().scaleExtent([0.1, 4]).on('zoom', e => g.attr('transform', e.transform));
  svg.call(zoom);

  let minX = Infinity, maxX = -Infinity;
  hierarchy.each(d => { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); });

  const g = svg.append('g').attr('transform', `translate(80,${-minX + 30})`);

  // Links
  g.selectAll('.link')
    .data(hierarchy.links())
    .join('path')
    .attr('class', 'link')
    .attr('d', d3.linkHorizontal().x(d => d.y).y(d => d.x));

  // Node groups
  const node = g.selectAll('.node')
    .data(hierarchy.descendants().filter(d => d.data.id !== '__root__'))
    .join('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.y},${d.x})`)
    .style('cursor', 'pointer')
    .on('click', (e, d) => showDetail(d.data, allLanguages, regimesByLang))
    .on('mouseover', (e, d) => {
      clearTimeout(tooltipTimeout);
      const tip = document.getElementById('tooltip');
      const count = regimesByLang.get(d.data.id)?.length || 0;
      const extinct = d.data.status === 'extinct' ? ' · extinct' : '';
      tip.innerHTML = `<strong>${d.data.name || d.data.id}</strong>${extinct}${count ? `<br>${count} regime${count > 1 ? 's' : ''}` : ''}`;
      tip.classList.add('visible');
    })
    .on('mousemove', e => {
      clearTimeout(tooltipTimeout);
      const tip = document.getElementById('tooltip');
      tip.style.left = (e.clientX + 12) + 'px';
      tip.style.top  = (e.clientY - 10) + 'px';
      tip.classList.add('visible');
    })
    .on('mouseout', () => {
      tooltipTimeout = setTimeout(() => {
        document.getElementById('tooltip').classList.remove('visible');
      }, 100);
    });

  // Circle — filled for branch nodes, semi-transparent for leaves
  node.append('circle')
    .attr('r', 5)
    .attr('fill', d => {
      const color = rootColor(d.data.id, allLanguages);
      const isLeaf = !d.children && !d._children;
      return isLeaf ? color + '55' : color;
    })
    .attr('stroke', d => rootColor(d.data.id, allLanguages))
    .attr('stroke-width', 1.5)
    // Dashed stroke for extinct nodes
    .attr('stroke-dasharray', d => d.data.status === 'extinct' ? '3,2' : null);

  // Regime count badge (left of node, gold)
  node.filter(d => (regimesByLang.get(d.data.id)?.length || 0) > 0)
    .append('text')
    .attr('x', -12)
    .attr('dy', '0.32em')
    .attr('text-anchor', 'middle')
    .attr('font-size', 10)
    .attr('fill', '#f6ad55')
    .text(d => regimesByLang.get(d.data.id)?.length);

  // Label
  node.append('text')
    .attr('x', 10)
    .attr('dy', '0.32em')
    .text(d => d.data.name || d.data.id);
}

function showDetail(data, allLanguages, regimesByLang) {
  const panel   = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');
  const regimes     = regimesByLang.get(data.id) || [];
  const descendants = getDescendants(data.id, allLanguages);
  const allLangRegimes = [...new Set(
    [data.id, ...descendants.map(d => d.id)].flatMap(id => regimesByLang.get(id) || [])
  )];

  let html = `<h2>${data.name || data.id}</h2>`;
  if (data.status === 'extinct') html += `<div class="sub" style="color:#f6ad55">Extinct</div>`;
  if (data.parent)  html += `<div class="sub">Descended from: ${data.parent}</div>`;
  if (data.description) html += `<div class="sub" style="margin-top:4px">${data.description}</div>`;
  if (descendants.length) html += `<div class="sub">${descendants.length} descendant${descendants.length > 1 ? 's' : ''}</div>`;

  if (regimes.length) {
    html += `<div class="section-title">Uses this language directly (${regimes.length})</div>`;
    for (const r of regimes) {
      const dates = r.end ? `${r.start}–${r.end}` : `${r.start}–`;
      html += `<div class="regime-item"><strong>${r.name}</strong><span>${dates} · ${r.ruling_ethnicity || ''}</span></div>`;
    }
  }
  if (allLangRegimes.length > regimes.length) {
    const sub = allLangRegimes.filter(r => !regimes.includes(r));
    html += `<div class="section-title">In descendant languages (${sub.length})</div>`;
    for (const r of sub) {
      const dates = r.end ? `${r.start}–${r.end}` : `${r.start}–`;
      html += `<div class="regime-item"><strong>${r.name}</strong><span>${dates}</span></div>`;
    }
  }
  if (!allLangRegimes.length) {
    html += `<div class="sub" style="margin-top:8px">No regimes recorded for this language branch.</div>`;
  }

  content.innerHTML = html;
  panel.classList.add('open');
}

init();
