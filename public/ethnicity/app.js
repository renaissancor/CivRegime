const FAMILY_PALETTE = [
  '#60a5fa', '#fb923c', '#4ade80', '#fbbf24', '#a78bfa',
  '#f472b6', '#34d399', '#38bdf8', '#f87171', '#818cf8'
];
const familyColor = {};

let tooltipTimeout = null;

function getDescendants(id, nodes) {
  const children = nodes.filter(n => n.parent === id);
  return children.flatMap(c => [c, ...getDescendants(c.id, nodes)]);
}

function rootColor(nodeId, allEthnicities) {
  let n = allEthnicities.find(e => e.id === nodeId);
  while (n && n.parent) n = allEthnicities.find(e => e.id === n.parent);
  return n ? (familyColor[n.id] || '#718096') : '#718096';
}

async function init() {
  const [ethnicities, polities] = await Promise.all([
    fetch('/api/taxonomy/ethnicity').then(r => r.json()),
    fetch('/api/polity').then(r => r.json()),
  ]);

  // Map ethnicity id → regimes that use it as ruling_ethnicity
  const regimesByEth = new Map();
  for (const r of polities) {
    const eth = r.ruling_ethnicity;
    if (eth) {
      if (!regimesByEth.has(eth)) regimesByEth.set(eth, []);
      regimesByEth.get(eth).push(r);
    }
  }

  // Root families
  const roots = ethnicities.filter(e => e.parent == null);
  roots.forEach((e, i) => { familyColor[e.id] = FAMILY_PALETTE[i % FAMILY_PALETTE.length]; });

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
    renderTree(btn.dataset.family, ethnicities, regimesByEth);
  });

  renderTree('all', ethnicities, regimesByEth);
}

function renderTree(familyId, allEthnicities, regimesByEth) {
  try {
    const svg = d3.select('#tree-svg');
    svg.selectAll('*').remove();

    // Build node list
    let nodes;
    if (familyId === 'all') {
      nodes = [
        { id: '__root__', parent: null, name: '' },
        ...allEthnicities.map(e => ({ ...e, parent: e.parent ?? '__root__' }))
      ];
    } else {
      const root = allEthnicities.find(e => e.id === familyId);
      if (!root) {
        console.warn('Family not found:', familyId);
        return;
      }
      nodes = [{ ...root, parent: null }, ...getDescendants(familyId, allEthnicities)];
    }

    const stratify = d3.stratify().id(d => d.id).parentId(d => d.parent);
    const hierarchy = stratify(nodes);

    // Tree layout - adjust node size based on tree depth
    const depth = d3.max(hierarchy.descendants(), d => d.depth) || 1;
    const tree = d3.tree().nodeSize([24, Math.max(150, 300 / Math.sqrt(depth + 1))]);
    tree(hierarchy);

    let minX = Infinity, maxX = -Infinity;
    hierarchy.each(d => { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); });

    if (minX === Infinity || maxX === -Infinity) {
      console.error('Invalid min/max X values');
      return;
    }

    // Zoom / pan - set up AFTER we have the g element
    const g = svg.append('g').attr('transform', `translate(80,${-minX + 30})`);

    const zoom = d3.zoom().scaleExtent([0.1, 8]).on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoom);

  // Links
  g.selectAll('.link')
    .data(hierarchy.links())
    .join('path')
    .attr('class', 'link')
    .attr('d', d3.linkHorizontal().x(d => d.y).y(d => d.x));

    // Node groups
    const nodeData = hierarchy.descendants().filter(d => d.data.id !== '__root__');
    console.log('Drawing', nodeData.length, 'nodes');

    const node = g.selectAll('.node')
      .data(nodeData)
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (e, d) => showDetail(d.data, allEthnicities, regimesByEth))
      .on('mouseover', (e, d) => {
        clearTimeout(tooltipTimeout);
        const tip = document.getElementById('tooltip');
        const count = regimesByEth.get(d.data.id)?.length || 0;
        tip.innerHTML = `<strong>${d.data.name || d.data.id}</strong>${count ? `<br>${count} regime${count > 1 ? 's' : ''}` : ''}`;
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
        const color = rootColor(d.data.id, allEthnicities);
        const isLeaf = !d.children && !d._children;
        return isLeaf ? color + '55' : color;
      })
      .attr('stroke', d => rootColor(d.data.id, allEthnicities))
      .attr('stroke-width', 1.5);

    // Regime count badge (left of node)
    node.filter(d => (regimesByEth.get(d.data.id)?.length || 0) > 0)
      .append('text')
      .attr('x', -12)
      .attr('dy', '0.32em')
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', '#f6ad55')
      .text(d => regimesByEth.get(d.data.id)?.length);

    // Label
    node.append('text')
      .attr('x', 10)
      .attr('dy', '0.32em')
      .text(d => d.data.name || d.data.id);

    console.log('Render complete for:', familyId);
  } catch (e) {
    console.error('Error rendering tree:', e);
  }
}

function showDetail(data, allEthnicities, regimesByEth) {
  const panel   = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');
  const regimes     = regimesByEth.get(data.id) || [];
  const descendants = getDescendants(data.id, allEthnicities);
  const allEthRegimes = [...new Set(
    [data.id, ...descendants.map(d => d.id)].flatMap(id => regimesByEth.get(id) || [])
  )];

  let html = `<h2>${data.name || data.id}</h2>`;
  if (data.founded != null) {
    html += `<div class="sub">Founded: ${formatYear(data.founded)}</div>`;
  }
  if (data.parent) html += `<div class="sub">Part of: ${data.parent}</div>`;
  if (data.description) html += `<div class="sub" style="margin-top:4px">${data.description}</div>`;
  if (descendants.length) html += `<div class="sub">${descendants.length} sub-group${descendants.length > 1 ? 's' : ''}</div>`;

  if (regimes.length) {
    html += `<div class="section-title">Ruling ethnicity in (${regimes.length})</div>`;
    for (const r of regimes) {
      const dates = r.end ? `${r.start}–${r.end}` : `${r.start}–`;
      html += `<div class="regime-item"><strong>${r.name}</strong><span>${dates}</span></div>`;
    }
  }
  if (allEthRegimes.length > regimes.length) {
    const sub = allEthRegimes.filter(r => !regimes.includes(r));
    html += `<div class="section-title">In sub-groups (${sub.length})</div>`;
    for (const r of sub) {
      const dates = r.end ? `${r.start}–${r.end}` : `${r.start}–`;
      html += `<div class="regime-item"><strong>${r.name}</strong><span>${dates}</span></div>`;
    }
  }
  if (!allEthRegimes.length) {
    html += `<div class="sub" style="margin-top:8px">No regimes recorded for this ethnicity group.</div>`;
  }

  content.innerHTML = html;
  panel.classList.add('open');
}

function formatYear(y) {
  if (y == null) return '?';
  if (y < 0) return `${Math.abs(y)} BCE`;
  return `${y} CE`;
}

init();
