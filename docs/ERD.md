# CivRegime Entity-Relationship Diagram

```mermaid
erDiagram
    STATES {
        string id PK
        string name
        string description
    }

    REGIMES {
        string id PK
        string name
        string state_id FK
        string id_ruling_ethnicity FK
        string id_ruling_language FK
        string id_ruling_religion FK
        string government
        string territories
        int    start
        int    end
        string policies
        string note
    }

    FIGURES {
        string regime_id FK
        string figure_id
        string name
        string role
        string years
        string significance
    }

    SUCCESSIONS {
        string from_regime_id FK
        string to_regime_id   FK
        string type
        int    strength
        string shared_territories
        int    shared_territory_count
        bool   same_ethnicity
        bool   related_ethnicity
        bool   same_language
        bool   same_religion
        bool   same_state
        int    temporal_gap_years
    }

    TERRITORIES {
        string id PK
        string name
    }

    TERRITORY_PERIODS {
        string territory_id FK
        string regime_id    FK
        int    start
        int    end
    }

    ETHNICITIES {
        string id PK
        string old_id
        string name
        string parent_id FK
        string description
        string founded
    }

    LANGUAGES {
        string id PK
        string old_id
        string name
        string parent_id FK
        string description
        string founded
    }

    RELIGIONS {
        string id PK
        string old_id
        string name
        string parent_id FK
        string description
        string founded
    }

    STATES        ||--o{ REGIMES           : "state_id"
    REGIMES       ||--o{ FIGURES           : "regime_id"
    REGIMES       ||--o{ SUCCESSIONS       : "from_regime_id"
    REGIMES       ||--o{ SUCCESSIONS       : "to_regime_id"
    REGIMES       ||--o{ TERRITORY_PERIODS : "regime_id"
    TERRITORIES   ||--o{ TERRITORY_PERIODS : "territory_id"
    ETHNICITIES   ||--o{ REGIMES           : "id_ruling_ethnicity"
    LANGUAGES     ||--o{ REGIMES           : "id_ruling_language"
    RELIGIONS     ||--o{ REGIMES           : "id_ruling_religion"
    ETHNICITIES   |o--o{ ETHNICITIES       : "parent_id"
    LANGUAGES     |o--o{ LANGUAGES         : "parent_id"
    RELIGIONS     |o--o{ RELIGIONS         : "parent_id"
```

## Notes

- `SUCCESSIONS` has a composite PK: `(from_regime_id, to_regime_id)`
- `FIGURES` has a composite PK: `(regime_id, figure_id)`
- `TERRITORY_PERIODS` has a composite PK: `(territory_id, regime_id)`
- `territories` and `policies` in REGIMES are pipe-separated denormalized references — normalized form is `TERRITORY_PERIODS`
- Tree tables (ETHNICITIES, LANGUAGES, RELIGIONS) are self-referential via `parent_id`
