# ASR Database - Entity Relationship Diagram

**Database:** asr_dev (`psql-ctn-demo-asr-dev.postgres.database.azure.com`)
**Generated from:** `SCHEMA_REFERENCE.md`
**Conceptual lineage:** afgeleid van het Poort8 Dataspace-model (P8-CTN-ASR); intake-flow komt overeen met `Proposal` uit participant-onboarding-portal.

---

## 1. Huidige ERD (feitelijk schema)

Cardinaliteit is expliciet gemaakt: een verplichte FK = `||`, een nullable FK = `|o`.

```mermaid
erDiagram
    party_reference ||--o{ legal_entity : "has"
    party_reference |o--o{ m2m_clients : "created_by / modified_by (nullable)"
    legal_entity ||--o{ legal_entity_contact : "has"
    legal_entity ||--o{ legal_entity_number : "has"
    legal_entity ||--o{ legal_entity_endpoint : "exposes"
    legal_entity ||--o{ m2m_clients : "has"
    legal_entity |o--o{ members : "maps to (legacy, nullable FK)"

    party_reference {
        uuid party_id PK
        varchar party_class
        varchar party_type
        boolean is_deleted
        timestamptz dt_created
        timestamptz dt_modified
    }

    legal_entity {
        uuid legal_entity_id PK
        uuid party_id FK "NOT NULL"
        varchar primary_legal_name "NOT NULL"
        varchar status
        varchar membership_level
        int authentication_tier "NOT NULL"
        varchar authentication_method
        varchar country_code
        varchar domain
        jsonb metadata
        boolean is_deleted
    }

    legal_entity_contact {
        uuid legal_entity_contact_id PK
        uuid legal_entity_id FK "NOT NULL"
        varchar contact_type "NOT NULL"
        varchar full_name "NOT NULL"
        varchar email "NOT NULL"
        boolean is_primary
        boolean is_active
        boolean is_deleted
    }

    legal_entity_number {
        uuid legal_entity_reference_id PK
        uuid legal_entity_id FK "NOT NULL"
        varchar identifier_type "NOT NULL"
        varchar identifier_value "NOT NULL"
        varchar country_code
        varchar validation_status
        timestamptz validation_date
        boolean is_deleted
    }

    legal_entity_endpoint {
        uuid legal_entity_endpoint_id PK
        uuid legal_entity_id FK "NOT NULL"
        varchar endpoint_name "NOT NULL"
        varchar endpoint_url
        varchar data_category
        varchar endpoint_type
        boolean is_active
        boolean is_deleted
    }

    m2m_clients {
        uuid m2m_client_id PK
        uuid legal_entity_id FK "NOT NULL"
        uuid created_by FK "nullable"
        uuid modified_by FK "nullable"
        varchar client_name "NOT NULL"
        uuid azure_client_id UK "NOT NULL"
        text_array assigned_scopes "NOT NULL"
        boolean is_active
        boolean is_deleted
    }

    members {
        uuid id PK
        uuid legal_entity_id FK "nullable, ON DELETE RESTRICT"
        varchar org_id UK
        varchar legal_name
        varchar lei
        varchar kvk
        varchar domain
        varchar status
        uuid azure_ad_object_id
    }

    applications {
        uuid application_id PK
        varchar applicant_email
        varchar applicant_name
        varchar legal_name
        varchar kvk_number
        varchar lei
        varchar status
        timestamp submitted_at
        uuid reviewed_by "geen FK (dangling)"
    }
```

### Aandachtspunten bij het huidige model
- **`applications` is losgekoppeld:** geen FK naar `legal_entity`, en `reviewed_by` verwijst nergens naar. De levenscyclus aanvraag → goedgekeurde entiteit is niet traceerbaar.
- **`members` (legacy):** dupliceert `legal_name`, `lei`, `kvk`, `domain`, `status`, `membership_level` die al in `legal_entity`/`legal_entity_number` staan — dubbele waarheid.
- **Gemengde conventies:** `dt_created`/`dt_modified` (core) vs `created_at`/`updated_at` (members) vs `submitted_at`+`dt_created`+`dt_updated` (applications); `created_by` is soms VARCHAR, soms UUID.
- **Verificatie is platgeslagen** tot `validation_status` op `legal_entity_number` + `authentication_tier`/`authentication_method` op `legal_entity` — geen audit-trail per check.

---

## 2. Voorgestelde toekomst-ERD

Verbeteringen geïnspireerd op het Poort8-model: verificatie en rollen als eigen entiteiten, `applications` gekoppeld, en een centrale audit-trail. Nieuwe/gewijzigde entiteiten zijn met `NEW`/`CHANGED` gemarkeerd in de relatielabels.

```mermaid
erDiagram
    party_reference ||--o{ legal_entity : "has"
    party_reference |o--o{ m2m_clients : "created_by / modified_by"
    legal_entity ||--o{ legal_entity_contact : "has"
    legal_entity ||--o{ legal_entity_number : "has"
    legal_entity ||--o{ legal_entity_endpoint : "exposes"
    legal_entity ||--o{ m2m_clients : "has"
    legal_entity ||--o{ verification : "NEW: verified by"
    legal_entity ||--o{ legal_entity_role : "NEW: plays"
    legal_entity |o--o{ applications : "CHANGED: results in (nullable)"
    party_reference |o--o{ applications : "CHANGED: reviewed_by (FK)"

    party_reference {
        uuid party_id PK
        varchar party_class
        varchar party_type
        entity_status status "NEW: enum vervangt is_deleted"
        timestamptz dt_created
        timestamptz dt_modified
        varchar created_by
        varchar modified_by
    }

    legal_entity {
        uuid legal_entity_id PK
        uuid party_id FK
        varchar primary_legal_name
        varchar status
        varchar membership_level
        int authentication_tier
        varchar domain
        jsonb metadata
        entity_status record_status "NEW: enum"
    }

    verification {
        uuid verification_id PK
        uuid legal_entity_id FK
        varchar type "KvkCheck, LeiCheck, VatCheck, DnsVerification, EmailVerification, eHerkenning, OnboardingApproval..."
        varchar category "Admin | Automatic | Organization"
        varchar status "Pending | Approved | Rejected | Revoked"
        timestamptz handled_at
        varchar handled_by
        text evidence
        text reason
    }

    legal_entity_role {
        uuid role_id PK
        uuid legal_entity_id FK
        varchar role "DataOwner | DataConsumer | DataProvider | ServiceProvider"
        date start_date
        date end_date
        varchar loa
        boolean compliancy_verified
    }

    applications {
        uuid application_id PK
        uuid legal_entity_id FK "NEW: gevuld bij approval"
        uuid reviewed_by FK "NEW: -> party_reference"
        varchar applicant_email
        varchar applicant_name
        varchar legal_name
        varchar kvk_number
        varchar status
        timestamptz submitted_at
        timestamptz reviewed_at
    }

    audit_record {
        uuid audit_record_id PK
        varchar entity_type "NEW: centrale change-log"
        varchar entity_key
        varchar action "Added | Modified | Deleted"
        varchar performed_by
        timestamptz timestamp
        jsonb payload
    }
```

### Wat dit oplost
1. **`verification`** geeft een volledige, auditeerbare trail per check (NIS2/forensisch). Vervangt de losse `validation_status`-velden.
2. **`legal_entity_role`** maakt deelnemersrollen expliciet i.p.v. ze in `metadata` te verstoppen.
3. **Gekoppelde `applications`** maakt de levenscyclus aanvraag → entiteit traceerbaar; `reviewed_by` wordt een echte FK.
4. **`audit_record`** centraliseert wijzigingshistorie (zoals P8's `AuditRecord`), losgekoppeld van de business-tabellen.
5. **`entity_status`-enum** vervangt losse `is_deleted` booleans en geeft ruimte voor `Active`/`Inactive`/`Deleted` i.p.v. alleen wel/niet verwijderd.
6. **`members` (legacy)** is bewust weggelaten — deprecation-pad richting `legal_entity` + `legal_entity_number`.

---

## 3. Conceptuele mapping over de drie repo's

| Concept | DEV-CTN-ASR (Postgres) | P8-CTN-ASR (Poort8/.NET) | participant-onboarding-portal (Go) |
|---|---|---|---|
| Organisatie | `legal_entity` + `party_reference` | `Organization` (`OrOrganization`) | `Party` / `Proposal` |
| Identificatie (KvK/LEI) | `legal_entity_number` | `Property` (IsIdentifier) | velden op `Proposal` |
| Contactpersoon | `legal_entity_contact` | `Employee` | `Contact*` velden op `Proposal` |
| Endpoint/API | `legal_entity_endpoint` | `Api` / `Service` | `CapabilitiesUrl` |
| M2M client | `m2m_clients` | n.v.t. (Keycloak scopes) | `UseM2M` |
| Verificatie | `validation_status` (veld) | `Verification` + `OrganizationVerification` | `Status` op `Proposal` |
| Rollen | (geen) | `OrganizationRole` | `DataOwner/Consumer/Provider` |
| Aanvraag/intake | `applications` | `Application` + `ApiAccessRequest` | `Proposal` |
| Audit | (per-tabel timestamps) | `AuditRecord` + IMetadata | `CreatedAt` |

ASR's naamgeving (`legal_entity`, `party_reference`) sluit het dichtst aan op BDI/iSHARE.

---

## 4. Migratienotities (volgorde)

1. Voeg `verification`-tabel toe; backfill vanuit bestaande `validation_status`/`validation_date`.
2. Voeg `legal_entity_role` toe; leid rollen af uit `metadata` indien aanwezig.
3. `ALTER TABLE applications ADD COLUMN legal_entity_id uuid REFERENCES legal_entity(...)`, plus FK op `reviewed_by`.
4. Introduceer `audit_record` + triggers (of applicatie-laag) voor change-capture.
5. Uniformeer timestamp-/audit-conventies; voer `entity_status`-enum gefaseerd in naast `is_deleted`.
6. Deprecation-traject `members`: lees-only maken, daarna uitfaseren.

> Diagram-conventie: verplichte FK = `||`, nullable FK = `|o`. PK/FK/UK gemarkeerd per attribuut.
