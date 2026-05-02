-- ============================================================
-- CivRegime ERD v3 — Active Tables Only
-- ============================================================
-- Singular table names. No FK enforcement (data has gaps).
--
-- Hierarchy:
--   Civilization    → political continuity (e.g., Roman Civilization, Chinese Civilization)
--   Polity   → political entity (e.g., Roman Empire, Tang Dynasty)
--
-- Future tables (create when data is ready):
--   Dynasty  → ruling family (e.g., Bourbon, Borjigin)
--   Polity   → ruling period within a polity (e.g., Julio-Claudian)
--   Culture  → prehistoric/archaeological entities
--   Ideology → government forms and civilization philosophies
--   History panel/column/cell → panel visualization layer
--   Province/province_period → fine-grained GeoJSON
--
-- Years: negative = BCE (e.g., -753 = 753 BCE)
-- ============================================================


-- ─── GEOGRAPHY ──────────────────────────────────────────────

CREATE TABLE territory (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
);


-- ─── TAXONOMY TREES ─────────────────────────────────────────

CREATE TABLE ethnicity (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    parent_id   TEXT,
    depth       INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    founded     TEXT,
    status      TEXT
);

CREATE TABLE language (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    parent_id   TEXT,
    depth       INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    founded     TEXT,
    status      TEXT
);

CREATE TABLE religion (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    parent_id   TEXT,
    depth       INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    founder     TEXT,
    founded     TEXT,
    founded_region TEXT,
    status      TEXT
);


-- ─── POLITICAL HIERARCHY ────────────────────────────────────

CREATE TABLE civilization (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT
);

CREATE TABLE polity (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    civilization_id          TEXT,
    ruling_ethnicity  TEXT,
    cultural_language TEXT,
    religion          TEXT,
    government        TEXT,
    start_year        INTEGER NOT NULL,
    end_year          INTEGER,
    note              TEXT
);


-- ─── POLITY RELATIONSHIPS ───────────────────────────────────

CREATE TABLE polity_territory (
    polity_id    TEXT NOT NULL,
    territory_id TEXT NOT NULL,
    start_year   INTEGER,
    end_year     INTEGER,
    PRIMARY KEY (polity_id, territory_id, start_year)
);

CREATE TABLE polity_policy (
    polity_id TEXT NOT NULL,
    policy    TEXT NOT NULL,
    PRIMARY KEY (polity_id, policy)
);

CREATE TABLE polity_succession (
    id                    INTEGER PRIMARY KEY,
    from_polity_id        TEXT NOT NULL,
    to_polity_id          TEXT NOT NULL,
    type                  TEXT,
    territorial_direction TEXT,
    strength              INTEGER,
    temporal_gap_years    INTEGER DEFAULT 0,
    same_ethnicity        BOOLEAN,
    related_ethnicity     BOOLEAN,
    same_language         BOOLEAN,
    same_religion         BOOLEAN,
    same_civilization            BOOLEAN,
    UNIQUE (from_polity_id, to_polity_id)
);

CREATE TABLE polity_succession_territory (
    succession_id INTEGER NOT NULL,
    territory_id  TEXT NOT NULL,
    PRIMARY KEY (succession_id, territory_id)
);


-- ─── FIGURES ────────────────────────────────────────────────

CREATE TABLE figure (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    polity_id    TEXT,
    role         TEXT,
    birth_year   INTEGER,
    death_year   INTEGER,
    significance TEXT
);


-- ─── INDEXES ────────────────────────────────────────────────

CREATE INDEX idx_polity_civilization ON polity(civilization_id);
CREATE INDEX idx_polity_years ON polity(start_year, end_year);
CREATE INDEX idx_polity_succession_from ON polity_succession(from_polity_id);
CREATE INDEX idx_polity_succession_to ON polity_succession(to_polity_id);
CREATE INDEX idx_polity_territory_territory ON polity_territory(territory_id);
CREATE INDEX idx_figure_polity ON figure(polity_id);
