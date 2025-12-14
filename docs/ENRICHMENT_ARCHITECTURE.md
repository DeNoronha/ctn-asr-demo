# Enrichment & Verification Architecture

**Last Updated:** 2025-12-14
**Related Code:**
- `api/src/routes.ts` - POST /v1/legal-entities/:id/enrich endpoint
- `api/src/services/enrichment/` - Extracted enrichment services

This document visualizes the data enrichment and verification flows in the ASR system.

## Key Principles

1. **LEI, Peppol, and branding apply to ALL countries** - not just NL/DE
2. **Chamber of Commerce (CoC) first, then name fallback** - LEI and Peppol search by CoC number first
3. **Country-specific flows** - RSIN/VAT for NL, HRB/EUID for DE
4. **Modular services** - Each enrichment type in its own service file

---

## High-Level Overview

```mermaid
flowchart TB
    subgraph Input["Input Data"]
        LE[Legal Entity]
        COC_ID["CoC Number
        (KVK/HRB/KBO/CRN/etc)"]
        NAME[Company Name]
        DOMAIN[Domain]
    end

    subgraph Enrichment["Enrichment Engine"]
        ENRICH["/v1/legal-entities/:id/enrich"]
    end

    subgraph NL["Dutch Company Flow (NL only)"]
        KVK_API[KVK API]
        RSIN[RSIN Identifier]
        VAT_DERIVE[Derive VAT: NL + RSIN + B01]
        VIES[VIES Validation]
    end

    subgraph DE["German Company Flow (DE only)"]
        HR_SEARCH[Handelsregister Search]
        HRB[HRB/HRA Identifier]
        EUID_GEN[Generate EUID]
    end

    subgraph Global["Global Enrichment (ALL Countries)"]
        LEI_SEARCH["LEI Search
        1. CoC number first
        2. Company name fallback"]
        PEPPOL_SEARCH["Peppol Search
        1. CoC/VAT first
        2. Company name fallback"]
        BRANDING[Logo from Domain]
    end

    subgraph Output["Stored Data"]
        LEN[legal_entity_number]
        KVK_DATA[kvk_registry_data]
        GLEIF_DATA[gleif_registry_data]
        VIES_DATA[vies_registry_data]
        DE_DATA[german_registry_data]
        BRAND[legal_entity_branding]
    end

    LE --> ENRICH
    ENRICH --> |country=NL| NL
    ENRICH --> |country=DE| DE
    ENRICH --> |ALL countries| Global

    COC_ID --> KVK_API
    KVK_API --> RSIN
    KVK_API --> KVK_DATA
    RSIN --> VAT_DERIVE
    VAT_DERIVE --> VIES
    VIES --> |valid| LEN
    VIES --> VIES_DATA

    COC_ID --> HR_SEARCH
    NAME --> HR_SEARCH
    HR_SEARCH --> HRB
    HR_SEARCH --> DE_DATA
    HRB --> EUID_GEN
    EUID_GEN --> LEN

    COC_ID --> LEI_SEARCH
    NAME --> LEI_SEARCH
    LEI_SEARCH --> LEN
    LEI_SEARCH --> GLEIF_DATA

    COC_ID --> PEPPOL_SEARCH
    NAME --> PEPPOL_SEARCH
    PEPPOL_SEARCH --> LEN

    DOMAIN --> BRANDING
    BRANDING --> BRAND
```

---

## Dutch Company Enrichment Flow (NL)

```mermaid
flowchart TD
    START([Start Enrichment])
    CHECK_KVK{KVK Number exists?}

    subgraph KVK_Flow["KVK → RSIN Flow"]
        CHECK_RSIN{RSIN already stored?}
        CHECK_KVK_REGISTRY{kvk_registry_data exists?}
        FETCH_KVK[Fetch from KVK API]
        EXTRACT_RSIN[Extract RSIN from response]
        STORE_KVK[Store in kvk_registry_data]
        STORE_RSIN[Store RSIN identifier]
    end

    subgraph VAT_Flow["RSIN → VAT Flow"]
        HAS_RSIN{RSIN available?}
        DERIVE_VAT["Derive VAT: NL{RSIN}B01"]
        CALL_VIES[Call VIES API to validate]
        VIES_VALID{VIES returns valid?}
        TRY_B02["Try B02 suffix (fiscal unit)"]
        VIES_B02_VALID{B02 valid?}
        STORE_VAT[Store VAT identifier]
        STORE_VIES[Store vies_registry_data]
        VAT_NOT_AVAILABLE[VAT not available]
    end

    subgraph LEI_Flow["LEI Lookup"]
        SEARCH_LEI_KVK["Search GLEIF by NL-KVK/{number}"]
        LEI_FOUND{LEI found?}
        SEARCH_LEI_NAME["Fallback: Search by company name"]
        NAME_FOUND{Single/exact match?}
        STORE_LEI[Store LEI identifier]
        STORE_GLEIF[Store gleif_registry_data]
    end

    subgraph Peppol_Flow["Peppol Lookup"]
        SEARCH_PEPPOL["Query Peppol Directory by KVK"]
        PEPPOL_FOUND{Participant found?}
        STORE_PEPPOL[Store PEPPOL identifier]
    end

    START --> CHECK_KVK
    CHECK_KVK -->|Yes| CHECK_RSIN
    CHECK_RSIN -->|No| CHECK_KVK_REGISTRY
    CHECK_KVK_REGISTRY -->|No| FETCH_KVK
    CHECK_KVK_REGISTRY -->|Yes| EXTRACT_RSIN
    FETCH_KVK --> STORE_KVK
    STORE_KVK --> EXTRACT_RSIN
    EXTRACT_RSIN --> STORE_RSIN
    CHECK_RSIN -->|Yes| HAS_RSIN

    STORE_RSIN --> HAS_RSIN
    HAS_RSIN -->|Yes| DERIVE_VAT
    HAS_RSIN -->|No| VAT_NOT_AVAILABLE
    DERIVE_VAT --> CALL_VIES
    CALL_VIES --> VIES_VALID
    VIES_VALID -->|Yes| STORE_VAT
    VIES_VALID -->|No| TRY_B02
    TRY_B02 --> VIES_B02_VALID
    VIES_B02_VALID -->|Yes| STORE_VAT
    VIES_B02_VALID -->|No| VAT_NOT_AVAILABLE
    STORE_VAT --> STORE_VIES

    CHECK_KVK -->|Yes| SEARCH_LEI_KVK
    SEARCH_LEI_KVK --> LEI_FOUND
    LEI_FOUND -->|Yes| STORE_LEI
    LEI_FOUND -->|No| SEARCH_LEI_NAME
    SEARCH_LEI_NAME --> NAME_FOUND
    NAME_FOUND -->|Yes| STORE_LEI
    STORE_LEI --> STORE_GLEIF

    CHECK_KVK -->|Yes| SEARCH_PEPPOL
    SEARCH_PEPPOL --> PEPPOL_FOUND
    PEPPOL_FOUND -->|Yes| STORE_PEPPOL
```

---

## German Company Enrichment Flow (DE)

```mermaid
flowchart TD
    START([Start Enrichment - DE])

    subgraph HRB_Flow["German Registry Flow"]
        CHECK_DE_DATA{german_registry_data exists?}
        HAS_HRB{HRB/HRA identifier exists?}
        SEARCH_BY_HRB[Search Handelsregister by HRB]
        SEARCH_BY_NAME[Search by company name]
        HR_FOUND{Company found?}
        STORE_DE_DATA[Store german_registry_data]
        STORE_HRB[Store HRB/HRA identifier]
    end

    subgraph EUID_Flow["EUID Generation"]
        HAS_EUID{EUID already exists?}
        HAS_COURT_CODE{Court code available?}
        GENERATE_EUID["Generate: DE{courtCode}.{type}{number}"]
        STORE_EUID[Store EUID identifier]
    end

    subgraph LEI_Flow["LEI from GLEIF"]
        SEARCH_GLEIF_DE["Search GLEIF by DE-HRB/{number}"]
        SEARCH_GLEIF_NAME["Search GLEIF by company name"]
        LEI_FOUND{LEI found?}
        STORE_LEI[Store LEI identifier]
        STORE_GLEIF[Store gleif_registry_data]
    end

    subgraph VAT_Note["VAT for German Companies"]
        VAT_MANUAL["VAT must be provided manually
        (cannot be auto-derived)

        Reason:
        - Handelsregister has no VAT data
        - VIES only validates, doesn't search"]
    end

    START --> CHECK_DE_DATA
    CHECK_DE_DATA -->|No| HAS_HRB
    HAS_HRB -->|Yes| SEARCH_BY_HRB
    HAS_HRB -->|No| SEARCH_BY_NAME
    SEARCH_BY_HRB --> HR_FOUND
    SEARCH_BY_NAME --> HR_FOUND
    HR_FOUND -->|Yes| STORE_DE_DATA
    STORE_DE_DATA --> STORE_HRB

    STORE_HRB --> HAS_EUID
    CHECK_DE_DATA -->|Yes| HAS_EUID
    HAS_EUID -->|No| HAS_COURT_CODE
    HAS_COURT_CODE -->|Yes| GENERATE_EUID
    GENERATE_EUID --> STORE_EUID

    START --> SEARCH_GLEIF_DE
    SEARCH_GLEIF_DE --> LEI_FOUND
    LEI_FOUND -->|No| SEARCH_GLEIF_NAME
    SEARCH_GLEIF_NAME --> LEI_FOUND
    LEI_FOUND -->|Yes| STORE_LEI
    STORE_LEI --> STORE_GLEIF
```

---

## External Registry Services

```mermaid
flowchart LR
    subgraph Services["TypeScript Services"]
        KVK_SVC[kvkService.ts]
        VIES_SVC[viesService.ts]
        LEI_SVC[leiService.ts]
        HR_SVC[handelsregisterService.ts]
        PEPPOL_SVC[peppolService.ts]
        EUID_SVC[euidService.ts]
    end

    subgraph APIs["External APIs"]
        KVK_API["KVK API
        api.kvk.nl"]
        VIES_API["VIES API
        ec.europa.eu/taxation_customs/vies"]
        GLEIF_API["GLEIF API
        api.gleif.org"]
        PEPPOL_API["Peppol Directory
        directory.peppol.eu"]
        HR_WEB["Handelsregister.de
        (web scraping)"]
    end

    subgraph Data["Registry Data Tables"]
        KVK_DATA[(kvk_registry_data)]
        VIES_DATA[(vies_registry_data)]
        GLEIF_DATA[(gleif_registry_data)]
        DE_DATA[(german_registry_data)]
    end

    KVK_SVC --> KVK_API
    VIES_SVC --> VIES_API
    LEI_SVC --> GLEIF_API
    HR_SVC --> HR_WEB
    HR_SVC --> GLEIF_API
    PEPPOL_SVC --> PEPPOL_API

    KVK_API --> KVK_DATA
    VIES_API --> VIES_DATA
    GLEIF_API --> GLEIF_DATA
    HR_WEB --> DE_DATA
```

---

## Identifier Type Matrix

### Country-Specific Identifiers

| Country | Identifier | Source | Derivation Logic |
|---------|------------|--------|------------------|
| NL | KVK | Input | Manual entry or application |
| NL | RSIN | KVK API | Extracted from `_embedded.eigenaar.rsin` |
| NL | VAT | Derived | `NL` + `RSIN` + `B01` (or B02 for fiscal units) |
| NL | EUID | Generated | `NL.KVK.{kvkNumber}` |
| DE | HRB/HRA | Handelsregister | Scraped or manual entry |
| DE | EUID | Generated | `DE{courtCode}.{type}{number}` |
| DE | VAT | Manual | Cannot be auto-derived (Handelsregister has no VAT) |
| BE | KBO/BCE | Input | Belgian business register number |
| FR | SIRET/RCS | Input | French business register number |
| GB | CRN | Input | UK Companies House number |

### Global Identifiers (ALL Countries)

| Identifier | Source | Lookup Strategy |
|------------|--------|-----------------|
| **LEI** | GLEIF | 1. CoC number (KVK/HRB/KBO/CRN/etc) via registration authority<br>2. Company name search fallback |
| **PEPPOL** | Peppol Directory | 1. CoC/VAT by country-specific scheme<br>2. Company name + country search fallback |
| **Branding** | Domain | Google/DuckDuckGo favicon services |

### Supported CoC Types for LEI Lookup

| Type | Country | GLEIF Authority |
|------|---------|-----------------|
| KVK | NL | NL-KVK |
| HRB/HRA | DE | DE-HRB, DE-HRA |
| KBO/BCE | BE | BE-BCE |
| RCS/SIREN | FR | FR-RCS |
| CRN | GB | GB-COH |
| REA | IT | IT-REA |
| CIF | ES | ES-CIF |
| CVR | DK | DK-CVR |
| CHR | CH | CH-CHRB |

### Supported Identifiers for Peppol Lookup

| Type | Country | Peppol Scheme |
|------|---------|---------------|
| KVK | NL | 0106 |
| VAT | NL | 9944 |
| KBO | BE | 0208 |
| VAT | BE | 9925 |
| SIRET | FR | 0009 |
| CRN | GB | 0088 |
| CVR | DK | 0184 |
| VAT | DE | 9930 |

---

## EUID Format Examples

| Country | Format | Example |
|---------|--------|---------|
| Netherlands | `NL.KVK.{number}` | `NL.KVK.12345678` |
| Germany | `DE{courtCode}.{type}{number}` | `DED4601R.HRB15884` |
| Germany | `DEK1101R.{type}{number}` | `DEK1101R.HRB116737` (Hamburg) |

**German Court Codes:**
- D4601R = Amtsgericht Neuss
- K1101R = Amtsgericht Hamburg
- M1301R = Amtsgericht München
- K1704R = Amtsgericht Duisburg

---

## Decision Trees

### When is RSIN applicable?

```mermaid
flowchart TD
    Q1{Country = NL?}
    Q1 -->|Yes| Q2{KVK number exists?}
    Q1 -->|No| NOT_APPLICABLE["RSIN not applicable
    (Dutch-specific identifier)"]
    Q2 -->|Yes| FETCH[Fetch RSIN from KVK API]
    Q2 -->|No| NOT_POSSIBLE["Cannot derive RSIN
    without KVK number"]
    FETCH --> RESULT[Store RSIN identifier]
```

### When can VAT be auto-derived?

```mermaid
flowchart TD
    Q1{Country = NL?}
    Q1 -->|Yes| Q2{RSIN available?}
    Q1 -->|No| MANUAL["VAT must be provided manually
    (Handelsregister has no VAT data,
    VIES only validates existing VAT)"]
    Q2 -->|Yes| DERIVE["Derive: NL{RSIN}B01"]
    Q2 -->|No| NO_RSIN["Cannot derive VAT
    without RSIN"]
    DERIVE --> VALIDATE[Validate via VIES]
    VALIDATE --> |Valid| STORE[Store VAT]
    VALIDATE --> |Invalid| TRY_B02["Try B02 suffix"]
```

### When can EUID be generated?

```mermaid
flowchart TD
    Q1{Country = NL?}
    Q1 -->|Yes| Q2{KVK number exists?}
    Q2 -->|Yes| GEN_NL["Generate: NL.KVK.{kvkNumber}"]
    Q2 -->|No| NO_NL["Cannot generate EUID"]

    Q1 -->|No| Q3{Country = DE?}
    Q3 -->|Yes| Q4{HRB/HRA exists?}
    Q4 -->|Yes| Q5{Court code available?}
    Q5 -->|Yes| GEN_DE["Generate: DE{courtCode}.{type}{number}"]
    Q5 -->|No| NO_CODE["Cannot generate EUID
    (missing court code)"]
    Q4 -->|No| NO_HRB["Cannot generate EUID
    (missing register number)"]
    Q3 -->|No| OTHER["See country-specific
    EUID format rules"]
```

---

## Service Architecture (Task 18 - COMPLETED)

### Enrichment Services (NEW - extracted from routes.ts)

| Service | File | Purpose |
|---------|------|---------|
| **Orchestrator** | `api/src/services/enrichment/index.ts` | Main enrichment coordinator |
| **NL Enrichment** | `api/src/services/enrichment/nlEnrichmentService.ts` | Dutch: RSIN, VAT, KVK registry |
| **DE Enrichment** | `api/src/services/enrichment/deEnrichmentService.ts` | German: HRB/HRA, EUID generation |
| **LEI Enrichment** | `api/src/services/enrichment/leiEnrichmentService.ts` | GLEIF lookup (ALL countries) |
| **Peppol Enrichment** | `api/src/services/enrichment/peppolEnrichmentService.ts` | Peppol lookup (ALL countries) |
| **Branding** | `api/src/services/enrichment/brandingService.ts` | Logo/favicon from domain |
| **Types** | `api/src/services/enrichment/types.ts` | Shared TypeScript types |

### External API Services (existing)

| Service | File | Purpose |
|---------|------|---------|
| KVK | `api/src/services/kvkService.ts` | Dutch Chamber of Commerce API |
| VIES | `api/src/services/viesService.ts` | EU VAT validation |
| LEI | `api/src/services/leiService.ts` | GLEIF LEI lookup + storage |
| Handelsregister | `api/src/services/handelsregisterService.ts` | German commercial register |
| BundesAPI | `api/src/services/bundesApiService.ts` | Handelsregister.de scraping |
| Peppol | `api/src/services/peppolService.ts` | Peppol directory lookup |
| EUID | `api/src/services/euidService.ts` | EUID format generation |
| DNS | `api/src/services/dnsVerificationService.ts` | Domain ownership verification |

### Service Structure

```
api/src/services/
├── enrichment/                     # ENRICHMENT ORCHESTRATION (NEW)
│   ├── index.ts                    # Main orchestrator - enrichLegalEntity()
│   ├── types.ts                    # EnrichmentContext, EnrichmentResult types
│   ├── nlEnrichmentService.ts      # enrichRsin(), enrichVat(), ensureKvkRegistryData()
│   ├── deEnrichmentService.ts      # enrichGermanRegistry(), generateEuidFromExisting()
│   ├── leiEnrichmentService.ts     # enrichLei() - ALL countries via CoC or name
│   ├── peppolEnrichmentService.ts  # enrichPeppol() - ALL countries via CoC/VAT or name
│   └── brandingService.ts          # enrichBranding() - logo from domain
├── kvkService.ts                   # KVK API client
├── viesService.ts                  # VIES API client
├── leiService.ts                   # GLEIF API client + storeGleifRegistryData()
├── handelsregisterService.ts       # Handelsregister search logic
├── bundesApiService.ts             # Handelsregister.de web scraping
├── peppolService.ts                # Peppol Directory API client
└── euidService.ts                  # EUID format generation
```

### Benefits of Extraction

1. **Separation of concerns** - Each enrichment type in its own service
2. **Testability** - Services can be unit tested independently
3. **Readability** - ~100-200 lines per service vs 900+ lines inline
4. **Global scope** - LEI and Peppol now work for ALL countries, not just NL/DE
5. **Extensibility** - Easy to add new country-specific enrichments (BE, FR, etc.)
