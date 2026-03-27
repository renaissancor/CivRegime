/**
 * Regime Viewer
 * Display regime details, succession chains, and controlled territories
 */

let regimesData = [];
let successionData = null;
let territoriesData = [];
let selectedRegimeId = null;
let successionsByRegime = {};

// Load all required data
Promise.all([
  // Load regimes - try to get them from individual files
  fetch('../data/regimes.json')
    .catch(() => ({
      // Fallback: create a stub if the API doesn't exist
      ok: true,
      json: async () => ({
        regimes: []
      })
    }))
    .then(r => r.json()),
  
  // Load succession graph
  fetch('../data/successions.json').then(r => r.json()),
  
  // Load territories for regime reference
  fetch('../data/territories.json')
    .catch(() => ({
      ok: true,
      json: async () => ({
        territories: []
      })
    }))
    .then(r => r.json())
]).then(([regimesResponse, successions, territoriesResponse]) => {
  regimesData = regimesResponse.regimes || [];
  successionData = successions;
  territoriesData = territoriesResponse.territories || [];
  
  // Try to load regime data from individual regime files
  loadRegimeDetails();
  
  // Build succession lookup
  buildSuccessionLookup();
  
  // Render UI
  renderRegimeList();
  attachEventListeners();
}).catch(err => {
  console.error('Error loading data:', err);
  document.getElementById('empty-state').textContent = 'Error loading data. Check console.';
});

async function loadRegimeDetails() {
  // If we don't have detailed regime data, try to construct it from succession edges
  if (!regimesData || regimesData.length === 0) {
    const regimeMap = new Map();
    
    if (successionData && successionData.edges) {
      successionData.edges.forEach(edge => {
        if (!regimeMap.has(edge.from)) {
          regimeMap.set(edge.from, {
            id: edge.from,
            name: edge.from_name
          });
        }
        if (!regimeMap.has(edge.to)) {
          regimeMap.set(edge.to, {
            id: edge.to,
            name: edge.to_name
          });
        }
      });
    }
    
    regimesData = Array.from(regimeMap.values());
  }
}

function buildSuccessionLookup() {
  // Create reverse lookup: regime -> [successors, predecessors]
  regimesData.forEach(regime => {
    successionsByRegime[regime.id] = {
      successors: [],
      predecessors: []
    };
  });
  
  if (successionData && successionData.edges) {
    successionData.edges.forEach(edge => {
      if (!successionsByRegime[edge.from]) {
        successionsByRegime[edge.from] = { successors: [], predecessors: [] };
      }
      if (!successionsByRegime[edge.to]) {
        successionsByRegime[edge.to] = { successors: [], predecessors: [] };
      }
      
      successionsByRegime[edge.from].successors.push({
        regime_id: edge.to,
        regime_name: edge.to_name,
        type: edge.type,
        shared_territories: edge.shared_territories,
        temporal_gap: edge.temporal_gap_years
      });
      
      successionsByRegime[edge.to].predecessors.push({
        regime_id: edge.from,
        regime_name: edge.from_name,
        type: edge.type,
        shared_territories: edge.shared_territories,
        temporal_gap: edge.temporal_gap_years
      });
    });
  }
}

function renderRegimeList() {
  const sidebar = document.getElementById('regime-list');
  
  // Group by state if we have state data
  const grouped = {};
  regimesData.forEach(regime => {
    const state = regime.state_id || 'Ungrouped';
    if (!grouped[state]) {
      grouped[state] = [];
    }
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
  // Regime selection
  document.querySelectorAll('.regime-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const regimeId = e.currentTarget.dataset.regimeId;
      selectRegime(regimeId);
    });
  });
  
  // Search
  document.getElementById('regime-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.regime-item').forEach(item => {
      const name = item.textContent.toLowerCase();
      item.style.display = name.includes(query) ? '' : 'none';
    });
  });
}

function selectRegime(regimeId) {
  selectedRegimeId = regimeId;
  
  // Update active state
  document.querySelectorAll('.regime-item').forEach(item => {
    item.classList.toggle('active', item.dataset.regimeId === regimeId);
  });
  
  // Render details
  renderRegimeDetails(regimeId);
}

function renderRegimeDetails(regimeId) {
  const header = document.getElementById('regime-header');
  const regime = regimesData.find(r => r.id === regimeId);
  
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
  
  if (regime.id_ruling_ethnicity) {
    html += `
      <div class="regime-info-block">
        <div class="regime-info-label">Ruling Ethnicity</div>
        <div class="regime-info-value">#${regime.id_ruling_ethnicity}</div>
      </div>
    `;
  }
  
  if (regime.id_ruling_language) {
    html += `
      <div class="regime-info-block">
        <div class="regime-info-label">Language</div>
        <div class="regime-info-value">#${regime.id_ruling_language}</div>
      </div>
    `;
  }
  
  if (regime.id_ruling_religion) {
    html += `
      <div class="regime-info-block">
        <div class="regime-info-label">Religion</div>
        <div class="regime-info-value">#${regime.id_ruling_religion}</div>
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
      const gap = pred.temporal_gap !== 0 ? ` (${pred.temporal_gap > 0 ? '+' : ''}${pred.temporal_gap}y)` : '';
      html += `
        <div class="succession-badge ${pred.type}" title="${pred.regime_name}${gap}">
          ${pred.regime_name.substring(0, 20)}
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
      const gap = succ.temporal_gap !== 0 ? ` (${succ.temporal_gap > 0 ? '+' : ''}${succ.temporal_gap}y)` : '';
      html += `
        <div class="succession-badge ${succ.type}" title="${succ.regime_name}${gap}">
          ${succ.regime_name.substring(0, 20)}
        </div>
      `;
    });
    html += '</div></div>';
  }
  
  // Shared territories with successors
  if (successions.successors.length > 0) {
    const sharedTerritoriesSet = new Set();
    successions.successors.forEach(succ => {
      succ.shared_territories.forEach(t => sharedTerritoriesSet.add(t));
    });
    
    if (sharedTerritoriesSet.size > 0) {
      html += `
        <div class="territory-section">
          <div class="territory-title">Territories Inherited by Successors (${sharedTerritoriesSet.size})</div>
          <div class="territory-list">
      `;
      Array.from(sharedTerritoriesSet).sort().forEach(territory => {
        html += `<div class="territory-badge">${territory}</div>`;
      });
      html += '</div></div>';
    }
  }
  
  header.innerHTML = html;
  
  // Attach click handlers to successor/predecessor badges
  document.querySelectorAll('.succession-badge').forEach(badge => {
    badge.addEventListener('click', (e) => {
      // Try to find the regime name and click it
      const text = e.currentTarget.textContent.trim();
      const regime = regimesData.find(r => r.name.includes(text) || r.name.startsWith(text));
      if (regime) {
        selectRegime(regime.id);
      }
    });
  });
}

function formatDateRange(start, end) {
  const formatYear = (y) => {
    if (y === null || y === undefined) return 'present';
    return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
  };
  
  const startStr = formatYear(start);
  const endStr = formatYear(end);
  return `${startStr} – ${endStr}`;
}
