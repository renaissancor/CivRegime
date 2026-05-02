/**
 * Polity Viewer
 * Display polity details, succession chains, and controlled territories
 */

let politiesData = [];
let selectedRegimeId = null;
let polityById = {};

// Load lightweight polity list for sidebar
cachedFetch('/api/polity').then(polities => {
  politiesData = polities;
  polityById = {};
  politiesData.forEach(r => { polityById[r.id] = r; });

  renderPolityList();
  attachEventListeners();

  // Deep-link: ?id=roman_empire
  const params = new URLSearchParams(location.search);
  if (params.get('id')) selectRegime(params.get('id'));
}).catch(err => {
  showError('Failed to load polity data');
  document.getElementById('empty-state').textContent = 'Error loading data.';
});

function renderPolityList() {
  const sidebar = document.getElementById('polity-list');

  const grouped = {};
  politiesData.forEach(polity => {
    const state = polity.civilization_id || 'Ungrouped';
    if (!grouped[state]) grouped[state] = [];
    grouped[state].push(polity);
  });

  let html = '';
  Object.entries(grouped).forEach(([state, polities]) => {
    if (state !== 'Ungrouped') {
      html += `<div class="state-label">${state}</div>`;
    }
    polities.sort((a, b) => (a.start || 0) - (b.start || 0));
    polities.forEach(polity => {
      const dateRange = formatDateRange(polity.start, polity.end);
      html += `
        <div class="polity-item" data-polity-id="${polity.id}" title="${polity.name}">
          ${polity.name}
          <span style="color: #4a5568; font-size: 10px; display: block;">${dateRange}</span>
        </div>
      `;
    });
  });

  sidebar.innerHTML = html || '<div style="padding: 16px; color: #4a5568;">No polities loaded</div>';
}

function attachEventListeners() {
  document.querySelectorAll('.polity-item').forEach(item => {
    item.addEventListener('click', (e) => {
      selectRegime(e.currentTarget.dataset.polityId);
    });
  });

  document.getElementById('polity-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.polity-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
  });
}

function selectRegime(polityId) {
  selectedRegimeId = polityId;
  document.querySelectorAll('.polity-item').forEach(item => {
    item.classList.toggle('active', item.dataset.polityId === polityId);
  });
  renderRegimeDetails(polityId);
}

// ── Succession helpers ──────────────────────────────────────────────────────

function continuityIcons(entry) {
  const parts = [];
  if (entry.same_ethnicity) parts.push('<span title="Same ethnicity" style="background:#4ade8033;color:#4ade80">E</span>');
  if (entry.same_language)  parts.push('<span title="Same language" style="background:#60a5fa33;color:#60a5fa">L</span>');
  if (entry.same_religion)  parts.push('<span title="Same religion" style="background:#c084fc33;color:#c084fc">R</span>');
  return parts.length ? `<span class="continuity">${parts.join('')}</span>` : '';
}

function gapLabel(years) {
  if (!years) return '';
  const sign = years > 0 ? '+' : '';
  return `<span class="gap">${sign}${years}y</span>`;
}

const DIR_META = {
  same:         { color: '#4ade80', label: 'Same territory',  desc: 'Successor controls roughly the same core territory' },
  expansion:    { color: '#60a5fa', label: 'Expansion',       desc: 'Successor controls more territory than predecessor' },
  contraction:  { color: '#facc15', label: 'Contraction',     desc: 'Successor controls less territory (fragment state)' },
  displacement: { color: '#fb923c', label: 'Displacement',    desc: 'Successor controls mostly different territory' },
  unknown:      { color: '#718096', label: 'Unknown',         desc: 'Insufficient territory data to determine direction' },
};

function dirLabel(dir) { return (DIR_META[dir] || {}).label || dir; }

// ── Render polity detail ────────────────────────────────────────────────────

async function renderRegimeDetails(polityId) {
  const header = document.getElementById('polity-header');
  header.innerHTML = '<div id="empty-state" style="color:#718096">Loading...</div>';

  let polity;
  try {
    polity = await cachedFetch(`/api/polity/${polityId}`);
  } catch {
    header.innerHTML = '<div id="empty-state">Polity not found</div>';
    return;
  }

  const dateRange = formatDateRange(polity.start, polity.end);

  let html = `
    <div id="polity-title">${polity.name}</div>
    <div class="polity-info-row">
      <div class="polity-info-block">
        <div class="polity-info-label">Duration</div>
        <div class="polity-info-value">${dateRange}</div>
      </div>
  `;

  if (polity.ruling_ethnicity) {
    html += `
      <div class="polity-info-block">
        <div class="polity-info-label">Ruling Ethnicity</div>
        <div class="polity-info-value">${polity.ruling_ethnicity}</div>
      </div>
    `;
  }

  if (polity.cultural_language) {
    html += `
      <div class="polity-info-block">
        <div class="polity-info-label">Language</div>
        <div class="polity-info-value">${polity.cultural_language}</div>
      </div>
    `;
  }

  if (polity.ideology?.religion) {
    html += `
      <div class="polity-info-block">
        <div class="polity-info-label">Religion</div>
        <div class="polity-info-value">${polity.ideology.religion}</div>
      </div>
    `;
  }

  if (polity.ideology?.government) {
    html += `
      <div class="polity-info-block">
        <div class="polity-info-label">Government</div>
        <div class="polity-info-value">${polity.ideology.government}</div>
      </div>
    `;
  }

  html += '</div>';

  // Predecessors (from /api/polity/:id response)
  const predecessors = polity.predecessors || [];
  if (predecessors.length > 0) {
    html += `
      <div class="succession-section">
        <div class="succession-title">Predecessors (${predecessors.length})</div>
        <div class="succession-list">
    `;
    predecessors.forEach(pred => {
      html += `
        <div class="succession-badge ${pred.territorial_direction || 'unknown'}" data-polity-id="${pred.id}"
             title="${pred.name} — ${dirLabel(pred.territorial_direction)}">
          ${pred.name} ${continuityIcons(pred)}
        </div>
      `;
    });
    html += '</div></div>';
  }

  // Successors (from /api/polity/:id response)
  const successors = polity.successors || [];
  if (successors.length > 0) {
    html += `
      <div class="succession-section">
        <div class="succession-title">Successors (${successors.length})</div>
        <div class="succession-list">
    `;
    successors.forEach(succ => {
      html += `
        <div class="succession-badge ${succ.territorial_direction || 'unknown'}" data-polity-id="${succ.id}"
             title="${succ.name} — ${dirLabel(succ.territorial_direction)}">
          ${succ.name} ${continuityIcons(succ)}
        </div>
      `;
    });
    html += '</div></div>';
  }

  // Territories
  const territories = polity.territories || [];
  if (territories.length > 0) {
    html += `
      <div class="territory-section">
        <div class="territory-title">Territories (${territories.length})</div>
        <div class="territory-list">
    `;
    territories.sort().forEach(t => {
      html += `<div class="territory-badge">${t}</div>`;
    });
    html += '</div></div>';
  }

  // Note
  if (polity.note) {
    html += `
      <div class="territory-section">
        <div class="territory-title">Note</div>
        <div style="font-size:12px;color:#a0aec0;line-height:1.6;margin-top:6px">${polity.note}</div>
      </div>
    `;
  }

  // Legend
  html += `
    <div class="territory-section">
      <div class="territory-title">Succession Types</div>
      <table style="font-size:11px;border-collapse:collapse;margin-top:8px;width:100%;max-width:520px">
        <tr style="color:#718096;text-align:left">
          <th style="padding:2px 8px 6px 0;font-weight:600">Territorial Direction</th>
          <th style="padding:2px 0 6px;font-weight:600">Meaning</th>
        </tr>
        ${Object.entries(DIR_META).map(([k, v]) => `
          <tr>
            <td style="padding:3px 8px 3px 0;white-space:nowrap"><span style="color:${v.color}">■</span> ${v.label}</td>
            <td style="padding:3px 0;color:#a0aec0">${v.desc}</td>
          </tr>
        `).join('')}
      </table>
      <div style="margin-top:12px;font-size:11px;color:#718096;font-weight:600">Continuity Indicators</div>
      <div style="display:flex;gap:12px;margin-top:4px;font-size:11px;color:#a0aec0">
        <span><span style="background:#4ade8033;color:#4ade80;padding:1px 3px;border-radius:2px;font-weight:600;font-size:9px">E</span> Same ethnicity</span>
        <span><span style="background:#60a5fa33;color:#60a5fa;padding:1px 3px;border-radius:2px;font-weight:600;font-size:9px">L</span> Same language</span>
        <span><span style="background:#c084fc33;color:#c084fc;padding:1px 3px;border-radius:2px;font-weight:600;font-size:9px">R</span> Same religion</span>
      </div>
    </div>
  `;

  header.innerHTML = html;

  // Click handlers on badges to navigate
  document.querySelectorAll('.succession-badge').forEach(badge => {
    badge.style.cursor = 'pointer';
    badge.addEventListener('click', () => {
      const rid = badge.dataset.polityId;
      if (rid) selectRegime(rid);
    });
  });
}

function formatDateRange(start, end) {
  const fmt = (y) => {
    if (y === null || y === undefined) return 'present';
    return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}
