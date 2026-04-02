/**
 * Regime Viewer
 * Display regime details, succession chains, and controlled territories
 */

let regimesData = [];
let successionsData = [];
let territoriesData = [];
let selectedRegimeId = null;
let successionsByRegime = {};
let regimeById = {};

// Load from /api/db
fetch('/api/db').then(r => r.json()).then(db => {
  regimesData = db.regimes || [];
  successionsData = db.successions || [];
  territoriesData = db.territories || [];

  // Build lookup
  regimeById = {};
  regimesData.forEach(r => { regimeById[r.id] = r; });

  buildSuccessionLookup();
  renderRegimeList();
  attachEventListeners();
}).catch(err => {
  console.error('Error loading data:', err);
  document.getElementById('empty-state').textContent = 'Error loading data. Check console.';
});

function buildSuccessionLookup() {
  successionsByRegime = {};
  regimesData.forEach(r => {
    successionsByRegime[r.id] = { successors: [], predecessors: [] };
  });

  successionsData.forEach(s => {
    if (!successionsByRegime[s.from]) {
      successionsByRegime[s.from] = { successors: [], predecessors: [] };
    }
    if (!successionsByRegime[s.to]) {
      successionsByRegime[s.to] = { successors: [], predecessors: [] };
    }

    const fromR = regimeById[s.from];
    const toR = regimeById[s.to];

    successionsByRegime[s.from].successors.push({
      regime_id: s.to,
      regime_name: toR ? toR.name : s.to,
      territorial_direction: s.territorial_direction || 'unknown',
      same_ethnicity: s.same_ethnicity,
      same_language: s.same_language,
      same_religion: s.same_religion,
      shared_territories: s.shared_territories || [],
      temporal_gap: s.temporal_gap_years,
    });

    successionsByRegime[s.to].predecessors.push({
      regime_id: s.from,
      regime_name: fromR ? fromR.name : s.from,
      territorial_direction: s.territorial_direction || 'unknown',
      same_ethnicity: s.same_ethnicity,
      same_language: s.same_language,
      same_religion: s.same_religion,
      shared_territories: s.shared_territories || [],
      temporal_gap: s.temporal_gap_years,
    });
  });
}

function renderRegimeList() {
  const sidebar = document.getElementById('regime-list');

  const grouped = {};
  regimesData.forEach(regime => {
    const state = regime.state_id || 'Ungrouped';
    if (!grouped[state]) grouped[state] = [];
    grouped[state].push(regime);
  });

  let html = '';
  Object.entries(grouped).forEach(([state, regimes]) => {
    if (state !== 'Ungrouped') {
      html += `<div class="state-label">${state}</div>`;
    }
    regimes.sort((a, b) => (a.start || 0) - (b.start || 0));
    regimes.forEach(regime => {
      const dateRange = formatDateRange(regime.start, regime.end);
      html += `
        <div class="regime-item" data-regime-id="${regime.id}" title="${regime.name}">
          ${regime.name}
          <span style="color: #4a5568; font-size: 10px; display: block;">${dateRange}</span>
        </div>
      `;
    });
  });

  sidebar.innerHTML = html || '<div style="padding: 16px; color: #4a5568;">No regimes loaded</div>';
}

function attachEventListeners() {
  document.querySelectorAll('.regime-item').forEach(item => {
    item.addEventListener('click', (e) => {
      selectRegime(e.currentTarget.dataset.regimeId);
    });
  });

  document.getElementById('regime-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.regime-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
  });
}

function selectRegime(regimeId) {
  selectedRegimeId = regimeId;
  document.querySelectorAll('.regime-item').forEach(item => {
    item.classList.toggle('active', item.dataset.regimeId === regimeId);
  });
  renderRegimeDetails(regimeId);
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

// ── Render regime detail ────────────────────────────────────────────────────

function renderRegimeDetails(regimeId) {
  const header = document.getElementById('regime-header');
  const regime = regimeById[regimeId];

  if (!regime) {
    header.innerHTML = '<div id="empty-state">Regime not found</div>';
    return;
  }

  const successions = successionsByRegime[regimeId] || { successors: [], predecessors: [] };
  const dateRange = formatDateRange(regime.start, regime.end);

  let html = `
    <div id="regime-title">${regime.name}</div>
    <div class="regime-info-row">
      <div class="regime-info-block">
        <div class="regime-info-label">Duration</div>
        <div class="regime-info-value">${dateRange}</div>
      </div>
  `;

  if (regime.ruling_ethnicity) {
    html += `
      <div class="regime-info-block">
        <div class="regime-info-label">Ruling Ethnicity</div>
        <div class="regime-info-value">${regime.ruling_ethnicity}</div>
      </div>
    `;
  }

  if (regime.cultural_language) {
    html += `
      <div class="regime-info-block">
        <div class="regime-info-label">Language</div>
        <div class="regime-info-value">${regime.cultural_language}</div>
      </div>
    `;
  }

  if (regime.ideology?.religion) {
    html += `
      <div class="regime-info-block">
        <div class="regime-info-label">Religion</div>
        <div class="regime-info-value">${regime.ideology.religion}</div>
      </div>
    `;
  }

  if (regime.ideology?.government) {
    html += `
      <div class="regime-info-block">
        <div class="regime-info-label">Government</div>
        <div class="regime-info-value">${regime.ideology.government}</div>
      </div>
    `;
  }

  html += '</div>';

  // Predecessors
  if (successions.predecessors.length > 0) {
    html += `
      <div class="succession-section">
        <div class="succession-title">Predecessors (${successions.predecessors.length})</div>
        <div class="succession-list">
    `;
    successions.predecessors.forEach(pred => {
      html += `
        <div class="succession-badge ${pred.territorial_direction}" data-regime-id="${pred.regime_id}"
             title="${pred.regime_name} — ${dirLabel(pred.territorial_direction)}">
          ${pred.regime_name} ${gapLabel(pred.temporal_gap)}${continuityIcons(pred)}
        </div>
      `;
    });
    html += '</div></div>';
  }

  // Successors
  if (successions.successors.length > 0) {
    html += `
      <div class="succession-section">
        <div class="succession-title">Successors (${successions.successors.length})</div>
        <div class="succession-list">
    `;
    successions.successors.forEach(succ => {
      html += `
        <div class="succession-badge ${succ.territorial_direction}" data-regime-id="${succ.regime_id}"
             title="${succ.regime_name} — ${dirLabel(succ.territorial_direction)}">
          ${succ.regime_name} ${gapLabel(succ.temporal_gap)}${continuityIcons(succ)}
        </div>
      `;
    });
    html += '</div></div>';
  }

  // Territories
  const territories = regime.territories || [];
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
  if (regime.note) {
    html += `
      <div class="territory-section">
        <div class="territory-title">Note</div>
        <div style="font-size:12px;color:#a0aec0;line-height:1.6;margin-top:6px">${regime.note}</div>
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
      <div style="margin-top:8px;font-size:10px;color:#4a5568">Temporal gap (e.g. <span style="color:#718096">+5y</span>) shows years between predecessor's end and successor's start.</div>
    </div>
  `;

  header.innerHTML = html;

  // Click handlers on badges to navigate
  document.querySelectorAll('.succession-badge').forEach(badge => {
    badge.style.cursor = 'pointer';
    badge.addEventListener('click', () => {
      const rid = badge.dataset.regimeId;
      if (rid && regimeById[rid]) selectRegime(rid);
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
