const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./data');

const app = express();
const PORT = 3000;

// ── Static assets ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// ── Build indexes ────────────────────────────────────────────
const regimeById = {};
(db.regimes || []).forEach(r => { regimeById[r.id] = r; });

const succByFrom = {};
const succByTo = {};
(db.successions || []).forEach(s => {
  if (!succByFrom[s.from]) succByFrom[s.from] = [];
  if (!succByTo[s.to]) succByTo[s.to] = [];
  succByFrom[s.from].push(s);
  succByTo[s.to].push(s);
});

// ── API: Polity ──────────────────────────────────────────────

// List all polities (lightweight)
app.get('/api/polity', (req, res) => {
  const list = (db.regimes || []).map(r => ({
    id: r.id,
    name: r.name,
    start: r.start,
    end: r.end,
    ruling_ethnicity: r.ruling_ethnicity || null,
    cultural_language: r.cultural_language || null,
    government: r.ideology?.government || null,
    ideology: r.ideology || null,
    territories: r.territories || [],
    state_id: r.state_id || null,
  }));
  res.json(list);
});

// Bulk color mapping: polity_id → ruling_ethnicity
app.get('/api/polity/colors', (req, res) => {
  const colors = {};
  (db.regimes || []).forEach(r => {
    colors[r.id] = r.ruling_ethnicity || null;
  });
  res.json(colors);
});

// Single polity with full detail
app.get('/api/polity/:id', (req, res) => {
  const r = regimeById[req.params.id];
  if (!r) return res.status(404).json({ error: 'Not found' });

  const successors = (succByFrom[r.id] || []).map(s => ({
    id: s.to,
    name: regimeById[s.to]?.name || s.to,
    territorial_direction: s.territorial_direction,
    strength: s.strength,
    shared_territories: s.shared_territories || [],
    same_ethnicity: s.same_ethnicity,
    same_language: s.same_language,
    same_religion: s.same_religion,
  }));

  const predecessors = (succByTo[r.id] || []).map(s => ({
    id: s.from,
    name: regimeById[s.from]?.name || s.from,
    territorial_direction: s.territorial_direction,
    strength: s.strength,
    shared_territories: s.shared_territories || [],
    same_ethnicity: s.same_ethnicity,
    same_language: s.same_language,
    same_religion: s.same_religion,
  }));

  res.json({ ...r, successors, predecessors });
});

// ── API: Succession ──────────────────────────────────────────

app.get('/api/succession', (req, res) => {
  res.json(db.successions || []);
});

// ── API: Territory ───────────────────────────────────────────

app.get('/api/territory', (req, res) => {
  res.json(db.territories || []);
});

app.get('/api/territory/:id', (req, res) => {
  const t = (db.territories || []).find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

// ── API: Taxonomy ────────────────────────────────────────────

app.get('/api/taxonomy/:type', (req, res) => {
  const types = {
    ethnicity: db.ethnicities,
    language: db.languages,
    religion: db.religions,
  };
  const data = types[req.params.type];
  if (!data) return res.status(404).json({ error: 'Unknown taxonomy type' });
  res.json(data);
});

// ── API: Dynasty ─────────────────────────────────────────────

const dynastyById = {};
(db.dynasties || []).forEach(d => { dynastyById[d.id] = d; });

app.get('/api/dynasty', (req, res) => {
  const list = (db.dynasties || []).map(d => ({
    id: d.id,
    name: d.name,
    ethnicity: d.ethnicity || null,
    origin_region: d.origin_region || null,
    polity_count: (d.polities || []).length,
  }));
  res.json(list);
});

app.get('/api/dynasty/:id', (req, res) => {
  const d = dynastyById[req.params.id];
  if (!d) return res.status(404).json({ error: 'Not found' });

  // Enrich polity links with names
  const polities = (d.polities || []).map(p => ({
    ...p,
    name: regimeById[p.polity_id]?.name || p.polity_id,
  }));

  res.json({ ...d, polities });
});

// ── API: History panels ──────────────────────────────────────

const HISTORY_DIR = path.join(__dirname, 'data', 'history');

app.get('/api/panel', (req, res) => {
  const panels = [];
  function walk(dir, prefix) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name);
      } else if (entry.name.endsWith('.json')) {
        const id = prefix ? `${prefix}/${entry.name.replace('.json', '')}` : entry.name.replace('.json', '');
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dir, entry.name), 'utf8'));
          panels.push({ id, title: data.title || id, region: prefix || '' });
        } catch { /* skip malformed */ }
      }
    }
  }
  walk(HISTORY_DIR, '');
  res.json(panels);
});

app.get('/api/panel/:region/:id', (req, res) => {
  const panelPath = `${req.params.region}/${req.params.id}`;
  const filePath = path.join(HISTORY_DIR, panelPath + '.json');
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Panel not found' });
  res.sendFile(filePath);
});

// ── API: Figure ──────────────────────────────────────────────

app.get('/api/figure', (req, res) => {
  const figures = [];
  (db.regimes || []).forEach(r => {
    if (r.figures) {
      r.figures.forEach(f => figures.push({ ...f, polity_id: r.id, polity_name: r.name }));
    }
  });
  res.json(figures);
});

// ── API: Full DB (backward compat, will deprecate) ──────────

app.get('/api/db', (req, res) => res.json(db));

// ── Start ────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`CivRegime → http://localhost:${PORT}`);
  console.log(`  Polities:    ${db.regimes?.length || 0}`);
  console.log(`  Successions: ${db.successions?.length || 0}`);
  console.log(`  Territories: ${db.territories?.length || 0}`);
  console.log(`  Dynasties:   ${db.dynasties?.length || 0}`);
});
