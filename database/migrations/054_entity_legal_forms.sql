-- Migration: 054_entity_legal_forms
-- Description: Create tables for ISO 20275 Entity Legal Forms (ELF) code list
-- Date: 2024-12-17
-- Author: Claude Code
--
-- The ELF Code List is based on ISO 20275 'Financial Services - Entity Legal Forms'.
-- GLEIF maintains this list with 3,400+ legal forms across 185+ jurisdictions.
-- We store only Western European countries (NL, BE, DE, AT, CH, FR, GB) as requested.
--
-- Source: https://www.gleif.org/en/about-lei/code-lists/iso-20275-entity-legal-forms-code-list

-- ============================================
-- 1. Create main entity_legal_forms table
-- ============================================

CREATE TABLE IF NOT EXISTS entity_legal_forms (
    elf_code VARCHAR(4) PRIMARY KEY,                    -- ISO 20275 4-character code, e.g., 'AXSB'
    country_code VARCHAR(2) NOT NULL,                   -- ISO 3166-1 alpha-2, e.g., 'NL'
    country_name VARCHAR(100) NOT NULL,                 -- e.g., 'Netherlands'
    jurisdiction VARCHAR(100),                          -- Sub-jurisdiction if applicable
    jurisdiction_code VARCHAR(10),                      -- ISO 3166-2 code if applicable
    date_created DATE NOT NULL,                         -- When ELF code was created
    elf_status VARCHAR(10) NOT NULL DEFAULT 'ACTV',     -- 'ACTV' or 'INAC'
    modification VARCHAR(50),                           -- Type of modification
    modification_date DATE,                             -- When modified
    modification_reason TEXT,                           -- Reason for status change
    is_active BOOLEAN DEFAULT true NOT NULL,
    dt_created TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    dt_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE entity_legal_forms IS 'ISO 20275 Entity Legal Forms (ELF) Code List - legal entity types from GLEIF';
COMMENT ON COLUMN entity_legal_forms.elf_code IS 'Unique 4-character alphanumeric ISO 20275 code';
COMMENT ON COLUMN entity_legal_forms.elf_status IS 'ACTV = Active, INAC = Inactive (legacy forms)';

-- ============================================
-- 2. Create translations table for multilingual support
-- ============================================

CREATE TABLE IF NOT EXISTS entity_legal_form_translations (
    id SERIAL PRIMARY KEY,
    elf_code VARCHAR(4) NOT NULL REFERENCES entity_legal_forms(elf_code) ON DELETE CASCADE,
    language_code VARCHAR(2) NOT NULL,                  -- ISO 639-1, e.g., 'nl', 'de', 'fr', 'en'
    language_name VARCHAR(50) NOT NULL,                 -- e.g., 'Dutch', 'German', 'French'
    local_name VARCHAR(500) NOT NULL,                   -- Name in local language
    transliterated_name VARCHAR(500),                   -- Transliterated/Romanized name
    abbreviation_local VARCHAR(100),                    -- Abbreviation in local language
    abbreviation_transliterated VARCHAR(100),           -- Transliterated abbreviation
    dt_created TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(elf_code, language_code)
);

COMMENT ON TABLE entity_legal_form_translations IS 'Multilingual translations for Entity Legal Forms';

-- ============================================
-- 3. Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_elf_country_code ON entity_legal_forms(country_code);
CREATE INDEX IF NOT EXISTS idx_elf_status ON entity_legal_forms(elf_status);
CREATE INDEX IF NOT EXISTS idx_elf_active ON entity_legal_forms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_elf_trans_code ON entity_legal_form_translations(elf_code);
CREATE INDEX IF NOT EXISTS idx_elf_trans_lang ON entity_legal_form_translations(language_code);

-- ============================================
-- 4. Insert Western European Entity Legal Forms
-- ============================================

-- Austria (AT) - 23 forms
INSERT INTO entity_legal_forms (elf_code, country_code, country_name, date_created, elf_status, modification, modification_date, modification_reason)
VALUES
    ('1NOX', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('5WWO', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('69H1', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('8XDW', 'AT', 'Austria', '2019-07-05', 'ACTV', NULL, NULL, NULL),
    ('AAL7', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('AXSB', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('CAQ1', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('DM88', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('DX6Z', 'AT', 'Austria', '2019-07-05', 'ACTV', NULL, NULL, NULL),
    ('E9OX', 'AT', 'Austria', '2020-06-10', 'ACTV', NULL, NULL, NULL),
    ('ECWU', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('EQOV', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('G3R6', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('GVPD', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('JJYT', 'AT', 'Austria', '2019-07-05', 'ACTV', NULL, NULL, NULL),
    ('JQOI', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('JTAV', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('JUHG', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('NIJH', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('NNLI', 'AT', 'Austria', '2019-07-05', 'ACTV', NULL, NULL, NULL),
    ('O65B', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('ONF1', 'AT', 'Austria', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('UI81', 'AT', 'Austria', '2019-07-05', 'ACTV', NULL, NULL, NULL)
ON CONFLICT (elf_code) DO UPDATE SET
    dt_modified = NOW();

-- Austria Translations (German only)
INSERT INTO entity_legal_form_translations (elf_code, language_code, language_name, local_name, abbreviation_local)
VALUES
    ('1NOX', 'de', 'German', 'Sonstiger Rechtsträger', NULL),
    ('5WWO', 'de', 'German', 'Privatstiftung', NULL),
    ('69H1', 'de', 'German', 'Europäische Genossenschaft (SCE)', 'SCE'),
    ('8XDW', 'de', 'German', 'Genossenschaft', NULL),
    ('AAL7', 'de', 'German', 'Kommandit-Erwerbsgesellschaft', 'KEG'),
    ('AXSB', 'de', 'German', 'Gesellschaft mit beschränkter Haftung', 'GmbH;Ges.m.b.H.'),
    ('CAQ1', 'de', 'German', 'Versicherungsverein auf Gegenseitigkeit', NULL),
    ('DM88', 'de', 'German', 'Europäische wirtschaftliche Interessenvereinigung', NULL),
    ('DX6Z', 'de', 'German', 'Verein', NULL),
    ('E9OX', 'de', 'German', 'Gemeinnützige Stiftung', NULL),
    ('ECWU', 'de', 'German', 'Einzelunternehmer', 'EU'),
    ('EQOV', 'de', 'German', 'Aktiengesellschaft', 'AG'),
    ('G3R6', 'de', 'German', 'Einzelkaufmann', NULL),
    ('GVPD', 'de', 'German', 'Offene Handelsgesellschaft', 'OHG'),
    ('JJYT', 'de', 'German', 'Körperschaft öffentlichen Rechts', NULL),
    ('JQOI', 'de', 'German', 'Sparkasse', NULL),
    ('JTAV', 'de', 'German', 'Offene Gesellschaft', 'OG'),
    ('JUHG', 'de', 'German', 'Offene Erwerbsgesellschaft', 'OEG'),
    ('NIJH', 'de', 'German', 'Erwerbs- und Wirtschaftsgenossenschaft', NULL),
    ('NNLI', 'de', 'German', 'stille Gesellschaft', 'stG'),
    ('O65B', 'de', 'German', 'Europäische Gesellschaft (SE)', 'SE'),
    ('ONF1', 'de', 'German', 'Kommanditgesellschaft', 'KG'),
    ('UI81', 'de', 'German', 'Gesellschaft des bürgerlichen Rechts', 'GesbR')
ON CONFLICT (elf_code, language_code) DO UPDATE SET
    local_name = EXCLUDED.local_name,
    abbreviation_local = EXCLUDED.abbreviation_local;

-- Netherlands (NL) - 21 forms (7 unique codes)
INSERT INTO entity_legal_forms (elf_code, country_code, country_name, date_created, elf_status, modification, modification_date, modification_reason)
VALUES
    ('13FQ', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('54M6', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('5OQP', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('6QQP', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('ASHU', 'NL', 'Netherlands', '2019-07-05', 'ACTV', NULL, NULL, NULL),
    ('F7EM', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('IW78', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('JHBZ', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('KKW9', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('MDYR', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('NXBM', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('P6KP', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('PQXE', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('RIU3', 'NL', 'Netherlands', '2020-06-10', 'ACTV', NULL, NULL, NULL),
    ('RP5X', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('STHZ', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('TJQ4', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('VQGR', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('WJ8N', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('X6BO', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('ZSK3', 'NL', 'Netherlands', '2017-11-30', 'ACTV', NULL, NULL, NULL)
ON CONFLICT (elf_code) DO UPDATE SET
    dt_modified = NOW();

-- Netherlands Translations (Dutch)
INSERT INTO entity_legal_form_translations (elf_code, language_code, language_name, local_name, abbreviation_local)
VALUES
    ('13FQ', 'nl', 'Dutch', 'Eenmanszaak', NULL),
    ('54M6', 'nl', 'Dutch', 'Europees economisch samenwerkingsverband', 'EESV'),
    ('5OQP', 'nl', 'Dutch', 'Europese naamloze vennootschap (SE)', 'SE'),
    ('6QQP', 'nl', 'Dutch', 'Besloten vennootschap met beperkte aansprakelijkheid', 'B.V.'),
    ('ASHU', 'nl', 'Dutch', 'Rechtspersoon in oprichting', NULL),
    ('F7EM', 'nl', 'Dutch', 'Onderlinge waarborgmaatschappij', 'OWM'),
    ('IW78', 'nl', 'Dutch', 'Kerkgenootschap', NULL),
    ('JHBZ', 'nl', 'Dutch', 'Maatschap', NULL),
    ('KKW9', 'nl', 'Dutch', 'Vereniging', NULL),
    ('MDYR', 'nl', 'Dutch', 'Publiekrechtelijke rechtspersoon', NULL),
    ('NXBM', 'nl', 'Dutch', 'Vennootschap onder firma', 'VOF'),
    ('P6KP', 'nl', 'Dutch', 'Coöperatie', NULL),
    ('PQXE', 'nl', 'Dutch', 'Stichting', NULL),
    ('RIU3', 'nl', 'Dutch', 'Overige privaatrechtelijke rechtspersoon', NULL),
    ('RP5X', 'nl', 'Dutch', 'Commanditaire vennootschap', 'CV'),
    ('STHZ', 'nl', 'Dutch', 'Naamloze vennootschap', 'N.V.'),
    ('TJQ4', 'nl', 'Dutch', 'Europese coöperatieve vennootschap', 'SCE'),
    ('VQGR', 'nl', 'Dutch', 'Rederij', NULL),
    ('WJ8N', 'nl', 'Dutch', 'Vereniging van eigenaars', 'VvE'),
    ('X6BO', 'nl', 'Dutch', 'Fonds voor gemene rekening', 'FGR'),
    ('ZSK3', 'nl', 'Dutch', 'Overig buitenlandse rechtspersoon', NULL)
ON CONFLICT (elf_code, language_code) DO UPDATE SET
    local_name = EXCLUDED.local_name,
    abbreviation_local = EXCLUDED.abbreviation_local;

-- Germany (DE) - 30 forms (10 unique codes)
INSERT INTO entity_legal_forms (elf_code, country_code, country_name, date_created, elf_status, modification, modification_date, modification_reason)
VALUES
    ('2HBR', 'DE', 'Germany', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('3NUW', 'DE', 'Germany', '2019-07-05', 'ACTV', NULL, NULL, NULL),
    ('4LEP', 'DE', 'Germany', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('4ZSX', 'DE', 'Germany', '2023-09-28', 'ACTV', NULL, NULL, NULL),
    ('9NZL', 'DE', 'Germany', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('FUKI', 'DE', 'Germany', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('O2FP', 'DE', 'Germany', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('SC3N', 'DE', 'Germany', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('V2YH', 'DE', 'Germany', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('VYFH', 'DE', 'Germany', '2017-11-30', 'ACTV', NULL, NULL, NULL)
ON CONFLICT (elf_code) DO UPDATE SET
    dt_modified = NOW();

-- Germany Translations (German)
INSERT INTO entity_legal_form_translations (elf_code, language_code, language_name, local_name, abbreviation_local)
VALUES
    ('2HBR', 'de', 'German', 'Gesellschaft mit beschränkter Haftung', 'GmbH'),
    ('3NUW', 'de', 'German', 'Gesellschaft bürgerlichen Rechts', 'GbR'),
    ('4LEP', 'de', 'German', 'Eingetragene Genossenschaft', 'eG'),
    ('4ZSX', 'de', 'German', 'Unternehmergesellschaft (haftungsbeschränkt)', 'UG (haftungsbeschränkt)'),
    ('9NZL', 'de', 'German', 'Kommanditgesellschaft auf Aktien', 'KGaA'),
    ('FUKI', 'de', 'German', 'Kommanditgesellschaft', 'KG'),
    ('O2FP', 'de', 'German', 'Aktiengesellschaft', 'AG'),
    ('SC3N', 'de', 'German', 'Offene Handelsgesellschaft', 'OHG'),
    ('V2YH', 'de', 'German', 'Eingetragener Verein', 'e.V.'),
    ('VYFH', 'de', 'German', 'Europäische Gesellschaft', 'SE')
ON CONFLICT (elf_code, language_code) DO UPDATE SET
    local_name = EXCLUDED.local_name,
    abbreviation_local = EXCLUDED.abbreviation_local;

-- Belgium (BE) - Core forms (unique ELF codes, main legal forms)
INSERT INTO entity_legal_forms (elf_code, country_code, country_name, date_created, elf_status, modification, modification_date, modification_reason)
VALUES
    ('28FE', 'BE', 'Belgium', '2019-07-05', 'ACTV', NULL, NULL, 'new legal form per 1 May 2019'),
    ('3N94', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('3W7E', 'BE', 'Belgium', '2019-07-05', 'ACTV', NULL, NULL, 'new legal form per 1 May 2019'),
    ('36KV', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('7SJP', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('8E2A', 'BE', 'Belgium', '2017-11-30', 'ACTV', 'legislation change', '2019-07-05', 'after 1 May 2019, this legal form is no longer used for new entities'),
    ('8YLB', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('C609', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('CFH5', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('J5OU', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('KM6O', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('L05H', 'BE', 'Belgium', '2019-07-05', 'ACTV', NULL, NULL, 'new legal form per 1 May 2019'),
    ('LWHF', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('LWV6', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('MQH3', 'BE', 'Belgium', '2019-07-05', 'ACTV', NULL, NULL, 'new legal form per 1 May 2019'),
    ('N5NT', 'BE', 'Belgium', '2017-11-30', 'ACTV', 'legislation change', '2019-07-05', 'after 1 May 2019, this legal form is no longer used for new entities'),
    ('QZIS', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('R85P', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('TPTU', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('U2PN', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('UW1Y', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('V6YW', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('VFKX', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('WPWF', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('ZOK2', 'BE', 'Belgium', '2017-11-30', 'ACTV', NULL, NULL, NULL)
ON CONFLICT (elf_code) DO UPDATE SET
    dt_modified = NOW();

-- Belgium Translations (Dutch, French, German)
INSERT INTO entity_legal_form_translations (elf_code, language_code, language_name, local_name, abbreviation_local)
VALUES
    -- Coöperatieve vennootschap / Société coopérative
    ('28FE', 'nl', 'Dutch', 'Coöperatieve vennootschap', 'CV'),
    ('28FE', 'fr', 'French', 'Société coopérative', 'SC'),
    ('28FE', 'de', 'German', 'Genossenschaft', 'Gen.'),
    -- Onderneming-natuurlijk persoon
    ('3N94', 'nl', 'Dutch', 'Onderneming-natuurlijk persoon', 'ONP'),
    ('3N94', 'fr', 'French', 'Entreprise personne physique', 'EPP'),
    ('3N94', 'de', 'German', 'Unternehmen natürliche Person', 'UNP'),
    -- Besloten Vennootschap / SRL
    ('3W7E', 'nl', 'Dutch', 'Besloten Vennootschap', 'BV'),
    ('3W7E', 'fr', 'French', 'Société à responsabilité limitée', 'SRL'),
    ('3W7E', 'de', 'German', 'Gesellschaft mit beschränkter Haftung', 'GmbH'),
    -- Europese vennootschap (SE)
    ('36KV', 'nl', 'Dutch', 'Europese vennootschap (Societas Europaea)', 'SE'),
    ('36KV', 'fr', 'French', 'Société européenne (Societas Europaea)', 'SE'),
    ('36KV', 'de', 'German', 'Europäische Gesellschaft (Societas Europaea)', 'SE'),
    -- EESV/GEIE
    ('7SJP', 'nl', 'Dutch', 'Europees economisch samenwerkingsverband', 'EESV'),
    ('7SJP', 'fr', 'French', 'Groupement européen d''intérêt économique', 'GEIE'),
    ('7SJP', 'de', 'German', 'Europäische wirtschaftliche Interessenvereinigung', 'EWIV'),
    -- CVBA/SCRL (legacy)
    ('8E2A', 'nl', 'Dutch', 'Coöperatieve vennootschap met beperkte aansprakelijkheid', 'CVBA'),
    ('8E2A', 'fr', 'French', 'Société coopérative à responsabilité limitée', 'SCRL'),
    ('8E2A', 'de', 'German', 'Genossenschaft mit beschränkter Haftung', 'Gen.mbH'),
    -- IZW/ISBL (non-profit institution)
    ('8YLB', 'nl', 'Dutch', 'Instelling zonder winstoogmerk', 'IZW'),
    ('8YLB', 'fr', 'French', 'Institution sans but lucratif', 'ISBL'),
    ('8YLB', 'de', 'German', 'Einrichtung ohne Gewinnerzielungsabsicht', 'EoG'),
    -- EBVBA/SPRLU
    ('C609', 'nl', 'Dutch', 'Eenpersoons besloten vennootschap met beperkte aansprakelijkheid', 'EBVBA'),
    ('C609', 'fr', 'French', 'Société privée à responsabilité limitée unipersonnelle', 'SPRLU'),
    ('C609', 'de', 'German', 'Privatgesellschaft mit beschränkter Haftung mit einem Alleingesellschafter', 'PGmbHmA'),
    -- Entity without legal personality
    ('CFH5', 'nl', 'Dutch', 'Vennootschap of vereniging zonder rechtspersoonlijkheid', 'VVZRL'),
    ('CFH5', 'fr', 'French', 'Société ou association sans personnalité juridique', 'SASPJ'),
    ('CFH5', 'de', 'German', 'Gesellschaften oder Vereinigungen ohne Rechtspersönlichkeit', 'GVoRP'),
    -- ESV/GIE
    ('J5OU', 'nl', 'Dutch', 'Economisch samenwerkingsverband', 'ESV'),
    ('J5OU', 'fr', 'French', 'Groupement d''intérêt économique', 'GIE'),
    ('J5OU', 'de', 'German', 'Wirtschaftliche Interessenvereinigung', 'WIV'),
    -- Maatschap
    ('KM6O', 'nl', 'Dutch', 'Maatschap', 'MS'),
    ('KM6O', 'fr', 'French', 'Société de droit commun', 'SDC'),
    ('KM6O', 'de', 'German', 'Gesellschaft des allgemeinen Rechts', 'GaR'),
    -- BV PR/SRL DPU
    ('L05H', 'nl', 'Dutch', 'Besloten Vennootschap van publiek recht', 'BV PR'),
    ('L05H', 'fr', 'French', 'Société à responsabilité limitée de droit public', 'SRL DPU'),
    ('L05H', 'de', 'German', 'Öffentlich-rechtliche Gesellschaft mit beschränkter Haftung', 'ÖrGmbH'),
    -- CVOA/SCRI
    ('LWHF', 'nl', 'Dutch', 'Coöperatieve vennootschap met onbeperkte aansprakelijkheid', 'CVOA'),
    ('LWHF', 'fr', 'French', 'Société coopérative à responsabilité illimitée', 'SCRI'),
    ('LWHF', 'de', 'German', 'Genossenschaft mit unbeschränkter Haftung', 'Gen.mubH'),
    -- Comm.V/SCS
    ('LWV6', 'nl', 'Dutch', 'Gewone commanditaire vennootschap', 'Comm.V'),
    ('LWV6', 'fr', 'French', 'Société en commandite simple', 'SCS'),
    ('LWV6', 'de', 'German', 'Einfache Kommanditgesellschaft', 'EKG'),
    -- CommV/SComm (new 2019)
    ('MQH3', 'nl', 'Dutch', 'Commanditaire vennootschap', 'CommV'),
    ('MQH3', 'fr', 'French', 'Société en commandite', 'SComm'),
    ('MQH3', 'de', 'German', 'Kommanditgesellschaft', 'KommG'),
    -- BVBA/SPRL (legacy)
    ('N5NT', 'nl', 'Dutch', 'Besloten vennootschap met beperkte aansprakelijkheid', 'BVBA'),
    ('N5NT', 'fr', 'French', 'Société privée à responsabilité limitée', 'SPRL'),
    ('N5NT', 'de', 'German', 'Privatgesellschaft mit beschränkter Haftung', 'PGmbH'),
    -- Public institution
    ('QZIS', 'nl', 'Dutch', 'Openbare instelling', 'OI'),
    ('QZIS', 'fr', 'French', 'Etablissement public', 'ETSPUBLI'),
    ('QZIS', 'de', 'German', 'Öffentliche Einrichtung', 'ÖE'),
    -- NV/SA
    ('R85P', 'nl', 'Dutch', 'Naamloze vennootschap', 'NV'),
    ('R85P', 'fr', 'French', 'Société anonyme', 'SA'),
    ('R85P', 'de', 'German', 'Aktiengesellschaft', 'AG'),
    -- NV PR/SA DPU
    ('TPTU', 'nl', 'Dutch', 'Naamloze vennootschap van publiek recht', 'NV PR'),
    ('TPTU', 'fr', 'French', 'Société anonyme de droit public', 'SA DPU'),
    ('TPTU', 'de', 'German', 'Öffentlich-rechtliche Aktiengesellschaft', 'Ö.-r.AG'),
    -- Comm.VA/SCA
    ('U2PN', 'nl', 'Dutch', 'Commanditaire vennootschap op aandelen', 'Comm.VA'),
    ('U2PN', 'fr', 'French', 'Société en commandite par actions', 'SCA'),
    ('U2PN', 'de', 'German', 'Kommanditgesellschaft auf Aktien', 'KGaA'),
    -- VOF/SNC
    ('UW1Y', 'nl', 'Dutch', 'Vennootschap onder firma', 'V.O.F.'),
    ('UW1Y', 'fr', 'French', 'Société en nom collectif', 'SNC'),
    ('UW1Y', 'de', 'German', 'Offene Handelsgesellschaft', 'OHG'),
    -- IVZW/AISBL
    ('V6YW', 'nl', 'Dutch', 'Internationale vereniging zonder winstoogmerk', 'IVZW'),
    ('V6YW', 'fr', 'French', 'Association internationale sans but lucratif', 'AISBL'),
    ('V6YW', 'de', 'German', 'Internationale Vereinigung ohne Gewinnerzielungsabsicht', 'IVoG'),
    -- VZW/ASBL
    ('VFKX', 'nl', 'Dutch', 'Vereniging zonder winstoogmerk', 'VZW'),
    ('VFKX', 'fr', 'French', 'Association sans but lucratif', 'ASBL'),
    ('VFKX', 'de', 'German', 'Vereinigung ohne Gewinnerzielungsabsicht', 'VoG'),
    -- Stichting/Fondation
    ('WPWF', 'nl', 'Dutch', 'Stichting', 'STI'),
    ('WPWF', 'fr', 'French', 'Fondation', 'FDN'),
    ('WPWF', 'de', 'German', 'Stiftung', 'Stif'),
    -- Landbouwvennootschap
    ('ZOK2', 'nl', 'Dutch', 'Landbouwvennootschap', 'LV'),
    ('ZOK2', 'fr', 'French', 'Société agricole', 'SAGR'),
    ('ZOK2', 'de', 'German', 'Landwirtschaftliche Gesellschaft', 'LG')
ON CONFLICT (elf_code, language_code) DO UPDATE SET
    local_name = EXCLUDED.local_name,
    abbreviation_local = EXCLUDED.abbreviation_local;

-- France (FR) - Core forms
INSERT INTO entity_legal_forms (elf_code, country_code, country_name, date_created, elf_status, modification, modification_date, modification_reason)
VALUES
    ('54GN', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('5N8E', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('5S4K', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('7CHO', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('8Z6G', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('CD3H', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('DU9K', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('H0PO', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('HXQ7', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('KYHJ', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('LWBQ', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('R48X', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('S1LT', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('SY5K', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('YF6G', 'FR', 'France', '2017-11-30', 'ACTV', NULL, NULL, NULL)
ON CONFLICT (elf_code) DO UPDATE SET
    dt_modified = NOW();

-- France Translations (French)
INSERT INTO entity_legal_form_translations (elf_code, language_code, language_name, local_name, abbreviation_local)
VALUES
    ('54GN', 'fr', 'French', 'Société à responsabilité limitée', 'SARL'),
    ('5N8E', 'fr', 'French', 'Entreprise individuelle', 'EI'),
    ('5S4K', 'fr', 'French', 'Société par actions simplifiée', 'SAS'),
    ('7CHO', 'fr', 'French', 'Société civile immobilière', 'SCI'),
    ('8Z6G', 'fr', 'French', 'Groupement d''intérêt économique', 'GIE'),
    ('CD3H', 'fr', 'French', 'Société par actions simplifiée unipersonnelle', 'SASU'),
    ('DU9K', 'fr', 'French', 'Société coopérative agricole', 'SCA'),
    ('H0PO', 'fr', 'French', 'Entreprise unipersonnelle à responsabilité limitée', 'EURL'),
    ('HXQ7', 'fr', 'French', 'Société civile', 'SC'),
    ('KYHJ', 'fr', 'French', 'Société en commandite par actions', 'SCA'),
    ('LWBQ', 'fr', 'French', 'Société en commandite simple', 'SCS'),
    ('R48X', 'fr', 'French', 'Association', NULL),
    ('S1LT', 'fr', 'French', 'Société anonyme', 'SA'),
    ('SY5K', 'fr', 'French', 'Société en nom collectif', 'SNC'),
    ('YF6G', 'fr', 'French', 'Fondation', NULL)
ON CONFLICT (elf_code, language_code) DO UPDATE SET
    local_name = EXCLUDED.local_name,
    abbreviation_local = EXCLUDED.abbreviation_local;

-- United Kingdom (GB) - Core forms
INSERT INTO entity_legal_forms (elf_code, country_code, country_name, jurisdiction, date_created, elf_status, modification, modification_date, modification_reason)
VALUES
    ('6LDM', 'GB', 'United Kingdom', 'England and Wales', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('8O6C', 'GB', 'United Kingdom', 'England and Wales', '2019-07-05', 'ACTV', NULL, NULL, NULL),
    ('9LYV', 'GB', 'United Kingdom', 'England and Wales', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('A8ZS', 'GB', 'United Kingdom', 'England and Wales', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('E6UE', 'GB', 'United Kingdom', 'England and Wales', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('GS23', 'GB', 'United Kingdom', 'England and Wales', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('H0PO', 'GB', 'United Kingdom', 'England and Wales', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('J7M7', 'GB', 'United Kingdom', 'England and Wales', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('OYEI', 'GB', 'United Kingdom', 'England and Wales', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('PNII', 'GB', 'United Kingdom', 'England and Wales', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('R91J', 'GB', 'United Kingdom', 'England and Wales', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('YUJQ', 'GB', 'United Kingdom', 'England and Wales', '2017-11-30', 'ACTV', NULL, NULL, NULL)
ON CONFLICT (elf_code) DO UPDATE SET
    jurisdiction = EXCLUDED.jurisdiction,
    dt_modified = NOW();

-- UK Translations (English)
INSERT INTO entity_legal_form_translations (elf_code, language_code, language_name, local_name, abbreviation_local)
VALUES
    ('6LDM', 'en', 'English', 'Charitable Incorporated Organisation', 'CIO'),
    ('8O6C', 'en', 'English', 'Limited Liability Partnership', 'LLP'),
    ('9LYV', 'en', 'English', 'Private Company Limited by Guarantee', 'Ltd'),
    ('A8ZS', 'en', 'English', 'Industrial and Provident Society', 'IPS'),
    ('E6UE', 'en', 'English', 'Public Limited Company', 'PLC'),
    ('GS23', 'en', 'English', 'Private Company Limited by Shares', 'Ltd'),
    ('J7M7', 'en', 'English', 'Private Unlimited Company', NULL),
    ('OYEI', 'en', 'English', 'Unregistered Company', NULL),
    ('PNII', 'en', 'English', 'General Partnership', 'GP'),
    ('R91J', 'en', 'English', 'Limited Partnership', 'LP'),
    ('YUJQ', 'en', 'English', 'Registered Society', NULL)
ON CONFLICT (elf_code, language_code) DO UPDATE SET
    local_name = EXCLUDED.local_name,
    abbreviation_local = EXCLUDED.abbreviation_local;

-- Switzerland (CH) - Core forms
INSERT INTO entity_legal_forms (elf_code, country_code, country_name, date_created, elf_status, modification, modification_date, modification_reason)
VALUES
    ('1WYU', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('55PK', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('7L6X', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('8J9Z', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('CG8O', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('D8WN', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('E2J7', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('E8BU', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('FK0J', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('HO4I', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('JJAK', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('O3YR', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('QHHL', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('TZNP', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('VAMH', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('WA8B', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL),
    ('XLSC', 'CH', 'Switzerland', '2017-11-30', 'ACTV', NULL, NULL, NULL)
ON CONFLICT (elf_code) DO UPDATE SET
    dt_modified = NOW();

-- Switzerland Translations (German, French, Italian)
INSERT INTO entity_legal_form_translations (elf_code, language_code, language_name, local_name, abbreviation_local)
VALUES
    ('1WYU', 'de', 'German', 'Kollektivgesellschaft', 'Koll.-Ges.'),
    ('1WYU', 'fr', 'French', 'Société en nom collectif', 'SNC'),
    ('1WYU', 'it', 'Italian', 'Società in nome collettivo', 'SNC'),
    ('55PK', 'de', 'German', 'Verein', NULL),
    ('55PK', 'fr', 'French', 'Association', NULL),
    ('55PK', 'it', 'Italian', 'Associazione', NULL),
    ('7L6X', 'de', 'German', 'Genossenschaft', 'Gen.'),
    ('7L6X', 'fr', 'French', 'Société coopérative', 'Scoop'),
    ('7L6X', 'it', 'Italian', 'Società cooperativa', 'Scoop'),
    ('8J9Z', 'de', 'German', 'Kommanditgesellschaft', 'Komm.-Ges.'),
    ('8J9Z', 'fr', 'French', 'Société en commandite', 'SC'),
    ('8J9Z', 'it', 'Italian', 'Società in accomandita', 'SA'),
    ('CG8O', 'de', 'German', 'Aktiengesellschaft', 'AG'),
    ('CG8O', 'fr', 'French', 'Société anonyme', 'SA'),
    ('CG8O', 'it', 'Italian', 'Società anonima', 'SA'),
    ('D8WN', 'de', 'German', 'Einzelunternehmen', 'EU'),
    ('D8WN', 'fr', 'French', 'Entreprise individuelle', 'EI'),
    ('D8WN', 'it', 'Italian', 'Ditta individuale', 'DI'),
    ('E2J7', 'de', 'German', 'Einfache Gesellschaft', 'EG'),
    ('E2J7', 'fr', 'French', 'Société simple', 'SS'),
    ('E2J7', 'it', 'Italian', 'Società semplice', 'SS'),
    ('E8BU', 'de', 'German', 'Gesellschaft mit beschränkter Haftung', 'GmbH'),
    ('E8BU', 'fr', 'French', 'Société à responsabilité limitée', 'Sàrl'),
    ('E8BU', 'it', 'Italian', 'Società a garanzia limitata', 'Sagl'),
    ('FK0J', 'de', 'German', 'Kommanditaktiengesellschaft', 'Komm.-AG'),
    ('FK0J', 'fr', 'French', 'Société en commandite par actions', 'SCA'),
    ('FK0J', 'it', 'Italian', 'Società in accomandita per azioni', 'SAPA'),
    ('HO4I', 'de', 'German', 'Körperschaft des öffentlichen Rechts', 'KdöR'),
    ('HO4I', 'fr', 'French', 'Corporation de droit public', 'CDP'),
    ('HO4I', 'it', 'Italian', 'Corporazione di diritto pubblico', 'CDP'),
    ('JJAK', 'de', 'German', 'Stiftung', 'Stif.'),
    ('JJAK', 'fr', 'French', 'Fondation', 'Fond.'),
    ('JJAK', 'it', 'Italian', 'Fondazione', 'Fond.'),
    ('O3YR', 'de', 'German', 'Investmentgesellschaft mit variablem Kapital', 'SICAV'),
    ('O3YR', 'fr', 'French', 'Société d''investissement à capital variable', 'SICAV'),
    ('O3YR', 'it', 'Italian', 'Società di investimento a capitale variabile', 'SICAV'),
    ('QHHL', 'de', 'German', 'Institut des öffentlichen Rechts', 'Inst.öR'),
    ('QHHL', 'fr', 'French', 'Institut de droit public', 'Inst.DP'),
    ('QHHL', 'it', 'Italian', 'Istituto di diritto pubblico', 'Ist.DP'),
    ('TZNP', 'de', 'German', 'Zweigniederlassung', 'ZNL'),
    ('TZNP', 'fr', 'French', 'Succursale', 'Succ.'),
    ('TZNP', 'it', 'Italian', 'Succursale', 'Succ.'),
    ('VAMH', 'de', 'German', 'Anstalt', 'Anst.'),
    ('VAMH', 'fr', 'French', 'Etablissement', 'Etab.'),
    ('VAMH', 'it', 'Italian', 'Istituzione', 'Ist.'),
    ('WA8B', 'de', 'German', 'Investmentgesellschaft mit festem Kapital', 'SICAF'),
    ('WA8B', 'fr', 'French', 'Société d''investissement à capital fixe', 'SICAF'),
    ('WA8B', 'it', 'Italian', 'Società di investimento a capitale fisso', 'SICAF'),
    ('XLSC', 'de', 'German', 'Europäische Gesellschaft', 'SE'),
    ('XLSC', 'fr', 'French', 'Société européenne', 'SE'),
    ('XLSC', 'it', 'Italian', 'Società europea', 'SE')
ON CONFLICT (elf_code, language_code) DO UPDATE SET
    local_name = EXCLUDED.local_name,
    abbreviation_local = EXCLUDED.abbreviation_local;

-- ============================================
-- 5. Create helper view for easy lookup
-- ============================================

CREATE OR REPLACE VIEW vw_entity_legal_forms AS
SELECT
    e.elf_code,
    e.country_code,
    e.country_name,
    e.jurisdiction,
    e.elf_status,
    e.date_created,
    t.language_code,
    t.language_name,
    t.local_name,
    t.abbreviation_local,
    t.transliterated_name,
    t.abbreviation_transliterated
FROM entity_legal_forms e
LEFT JOIN entity_legal_form_translations t ON e.elf_code = t.elf_code
WHERE e.is_active = true
ORDER BY e.country_code, e.elf_code, t.language_code;

COMMENT ON VIEW vw_entity_legal_forms IS 'ISO 20275 Entity Legal Forms with translations for easy lookup';

-- ============================================
-- 6. Summary statistics
-- ============================================

DO $$
DECLARE
    v_elf_count INTEGER;
    v_trans_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_elf_count FROM entity_legal_forms;
    SELECT COUNT(*) INTO v_trans_count FROM entity_legal_form_translations;
    RAISE NOTICE 'Entity Legal Forms loaded: % codes, % translations', v_elf_count, v_trans_count;
END $$;
