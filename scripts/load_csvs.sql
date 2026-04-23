-- ============================================================
-- Load CSVs into CivRegime DuckDB (v3 — singular table names)
-- Requires: duckdb civregime.db ".read docs/erd_nofk.sql" first
-- Usage:    duckdb civregime.db ".read scripts/load_csvs.sql"
-- ============================================================

-- Clear existing data (children before parents)
DELETE FROM polity_succession_territory;
DELETE FROM polity_succession;
DELETE FROM polity_policy;
DELETE FROM polity_territory;
DELETE FROM polity_dynasty;
DELETE FROM government;
DELETE FROM dynasty;
DELETE FROM figure;
DELETE FROM polity;
DELETE FROM religion;
DELETE FROM language;
DELETE FROM ethnicity;
DELETE FROM territory;
DELETE FROM state;

-- ─── STATE ────────────────────────────────────────────────
INSERT INTO state (id, name, description)
SELECT id, name, description
FROM read_csv('csvs/state.csv', auto_detect=true);

-- ─── TERRITORY ────────────────────────────────────────────
INSERT INTO territory (id, name)
SELECT id, name
FROM read_csv('csvs/territory.csv', auto_detect=true);

-- ─── ETHNICITY ────────────────────────────────────────────
-- Insert without parent_id first, then update parent references
-- This avoids FK ordering issues with self-referential tables
INSERT INTO ethnicity (id, name, description, founded)
SELECT id, name,
       NULLIF(description, ''), NULLIF(founded, '')
FROM (
    SELECT e.id, e.name, e.description, e.founded,
           ROW_NUMBER() OVER (PARTITION BY e.id ORDER BY e.id) AS rn
    FROM read_csv('csvs/ethnicity.csv', auto_detect=true) e
) WHERE rn = 1;

UPDATE ethnicity SET parent_id = sub.parent_text_id
FROM (
    SELECT e.id, p.id AS parent_text_id
    FROM read_csv('csvs/ethnicity.csv', auto_detect=true) e
    JOIN read_csv('csvs/ethnicity.csv', auto_detect=true) p ON e.parent_id = p.id
    WHERE p.id IN (SELECT id FROM ethnicity)
) sub
WHERE ethnicity.id = sub.id;

-- ─── LANGUAGE ─────────────────────────────────────────────
INSERT INTO language (id, name, description, founded)
SELECT id, name,
       NULLIF(description, ''), NULLIF(founded, '')
FROM (
    SELECT e.id, e.name, e.description, e.founded,
           ROW_NUMBER() OVER (PARTITION BY e.id ORDER BY e.id) AS rn
    FROM read_csv('csvs/language.csv', auto_detect=true) e
) WHERE rn = 1;

UPDATE language SET parent_id = sub.parent_text_id
FROM (
    SELECT e.id, p.id AS parent_text_id
    FROM read_csv('csvs/language.csv', auto_detect=true) e
    JOIN read_csv('csvs/language.csv', auto_detect=true) p ON e.parent_id = p.id
    WHERE p.id IN (SELECT id FROM language)
) sub
WHERE language.id = sub.id;

-- ─── RELIGION ─────────────────────────────────────────────
INSERT INTO religion (id, name, description, founded)
SELECT id, name,
       NULLIF(description, ''), NULLIF(founded, '')
FROM (
    SELECT e.id, e.name, e.description, e.founded,
           ROW_NUMBER() OVER (PARTITION BY e.id ORDER BY e.id) AS rn
    FROM read_csv('csvs/religion.csv', auto_detect=true) e
) WHERE rn = 1;

UPDATE religion SET parent_id = sub.parent_text_id
FROM (
    SELECT e.id, p.id AS parent_text_id
    FROM read_csv('csvs/religion.csv', auto_detect=true) e
    JOIN read_csv('csvs/religion.csv', auto_detect=true) p ON e.parent_id = p.id
    WHERE p.id IN (SELECT id FROM religion)
) sub
WHERE religion.id = sub.id;

-- ─── COMPUTE DEPTH FOR TAXONOMY TREES ─────────────────────
WITH RECURSIVE tree AS (
    SELECT id, 0 AS depth FROM ethnicity WHERE parent_id IS NULL
    UNION ALL
    SELECT e.id, t.depth + 1 FROM ethnicity e JOIN tree t ON e.parent_id = t.id
)
UPDATE ethnicity SET depth = tree.depth FROM tree WHERE ethnicity.id = tree.id;

WITH RECURSIVE tree AS (
    SELECT id, 0 AS depth FROM language WHERE parent_id IS NULL
    UNION ALL
    SELECT e.id, t.depth + 1 FROM language e JOIN tree t ON e.parent_id = t.id
)
UPDATE language SET depth = tree.depth FROM tree WHERE language.id = tree.id;

WITH RECURSIVE tree AS (
    SELECT id, 0 AS depth FROM religion WHERE parent_id IS NULL
    UNION ALL
    SELECT e.id, t.depth + 1 FROM religion e JOIN tree t ON e.parent_id = t.id
)
UPDATE religion SET depth = tree.depth FROM tree WHERE religion.id = tree.id;

-- ─── POLITY (from polity.csv) ─────────────────────────────
INSERT INTO polity (id, name, state_id, ruling_ethnicity, cultural_language,
                    religion, government, start_year, end_year, note)
SELECT id, name,
       NULLIF(state_id, ''),
       NULLIF(id_ruling_ethnicity, ''),
       NULLIF(id_ruling_language, ''),
       NULLIF(id_ruling_religion, ''),
       NULLIF(government, ''),
       TRY_CAST(start_year AS INTEGER),
       TRY_CAST(end_year AS INTEGER),
       NULLIF(note, '')
FROM read_csv('csvs/polity.csv', auto_detect=true);

-- ─── POLITY_TERRITORY (from polity_territory.csv) ─────────
INSERT INTO polity_territory (polity_id, territory_id, start_year, end_year)
SELECT polity_id, territory_id,
       TRY_CAST(start_year AS INTEGER),
       TRY_CAST(end_year AS INTEGER)
FROM (
    SELECT polity_id, territory_id, start_year, end_year,
           ROW_NUMBER() OVER (
               PARTITION BY polity_id, territory_id, start_year ORDER BY end_year
           ) AS rn
    FROM read_csv('csvs/polity_territory.csv', auto_detect=true)
) WHERE rn = 1;

-- Gap-fill from polity.csv territories column
WITH polity_terr AS (
    SELECT id AS polity_id,
           unnest(string_split(territories, '|')) AS territory_id,
           TRY_CAST(start_year AS INTEGER) AS start_year,
           TRY_CAST(end_year AS INTEGER) AS end_year
    FROM read_csv('csvs/polity.csv', auto_detect=true)
    WHERE territories IS NOT NULL AND territories != ''
)
INSERT INTO polity_territory (polity_id, territory_id, start_year, end_year)
SELECT pt.polity_id, pt.territory_id, pt.start_year, pt.end_year
FROM polity_terr pt
WHERE NOT EXISTS (
    SELECT 1 FROM polity_territory existing
    WHERE existing.polity_id = pt.polity_id AND existing.territory_id = pt.territory_id
);

-- ─── POLITY_POLICY ────────────────────────────────────────
INSERT INTO polity_policy (polity_id, policy)
SELECT id, unnest(string_split(policies, '|'))
FROM read_csv('csvs/polity.csv', auto_detect=true)
WHERE policies IS NOT NULL AND policies != '';

-- ─── POLITY_SUCCESSION ───────────────────────────────────
CREATE TEMP TABLE _succ AS
SELECT
    ROW_NUMBER() OVER (ORDER BY from_polity_id, to_polity_id) AS id,
    from_polity_id,
    to_polity_id,
    territorial_direction,
    CAST(strength AS INTEGER)          AS strength,
    CAST(temporal_gap_years AS INTEGER) AS temporal_gap_years,
    CAST(same_ethnicity AS BOOLEAN)    AS same_ethnicity,
    CAST(related_ethnicity AS BOOLEAN) AS related_ethnicity,
    CAST(same_language AS BOOLEAN)     AS same_language,
    CAST(same_religion AS BOOLEAN)     AS same_religion,
    CAST(same_state AS BOOLEAN)        AS same_state,
    shared_territories
FROM read_csv('csvs/polity_succession.csv', auto_detect=true);

INSERT INTO polity_succession
    (id, from_polity_id, to_polity_id, territorial_direction, strength,
     temporal_gap_years, same_ethnicity, related_ethnicity,
     same_language, same_religion, same_state)
SELECT id, from_polity_id, to_polity_id, territorial_direction, strength,
       temporal_gap_years, same_ethnicity, related_ethnicity,
       same_language, same_religion, same_state
FROM _succ;

-- ─── POLITY_SUCCESSION_TERRITORY ──────────────────────────
INSERT INTO polity_succession_territory (succession_id, territory_id)
SELECT id, unnest(string_split(shared_territories, '|'))
FROM _succ
WHERE shared_territories IS NOT NULL AND shared_territories != '';

DROP TABLE _succ;

-- ─── GOVERNMENT ──────────────────────────────────────────
INSERT INTO government (id, name, finer_type, weber_legitimacy, description)
SELECT id, name,
       NULLIF(finer_type, ''),
       NULLIF(weber_legitimacy, ''),
       NULLIF(description, '')
FROM read_csv('csvs/government.csv', auto_detect=true);

-- ─── DYNASTY ─────────────────────────────────────────────
INSERT INTO dynasty (id, name, ethnicity, origin_region, note)
SELECT id, name,
       NULLIF(ethnicity, ''),
       NULLIF(origin_region, ''),
       NULLIF(note, '')
FROM read_csv('csvs/dynasty.csv', auto_detect=true);

-- ─── POLITY_DYNASTY ──────────────────────────────────────
INSERT INTO polity_dynasty (polity_id, dynasty_id, start_year, end_year)
SELECT polity_id, dynasty_id,
       TRY_CAST(start_year AS INTEGER),
       TRY_CAST(end_year AS INTEGER)
FROM read_csv('csvs/polity_dynasty.csv', auto_detect=true);

-- ─── FIGURE ───────────────────────────────────────────────
-- years format: "birth/death" e.g. "-2700/-2600", "?/-1322"
INSERT INTO figure (id, name, polity_id, role, birth_year, death_year, significance)
SELECT figure_id, name, polity_id, role,
    TRY_CAST(string_split(years, '/')[1] AS INTEGER),
    TRY_CAST(string_split(years, '/')[2] AS INTEGER),
    significance
FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY figure_id ORDER BY polity_id) AS rn
    FROM read_csv('csvs/figure.csv', auto_detect=true)
) WHERE rn = 1;
