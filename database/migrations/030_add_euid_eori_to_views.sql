-- Migration 030: Add EUID and EORI identifier types to member views
-- Date: 2025-11-21
-- Description: Updates v_members_full and members_view to include EUID and EORI identifiers
--              Frontend expects these fields but they were missing from the views

-- Drop and recreate v_members_full with EUID and EORI
DROP VIEW IF EXISTS v_members_full;

CREATE OR REPLACE VIEW v_members_full AS
 SELECT m.id,
    m.org_id,
    m.legal_entity_id,
    m.azure_ad_object_id,
    m.email,
    m.created_at,
    m.updated_at,
    m.metadata AS member_metadata,
    le.primary_legal_name AS legal_name,
    le.domain,
    le.status,
    le.membership_level,
    le.authentication_tier,
    le.authentication_method,
    le.metadata AS legal_entity_metadata,
    le.party_id,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'LEI'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS lei,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'KVK'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS kvk,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'EURI'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS euri,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'EUID'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS euid,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'EORI'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS eori,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'DUNS'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS duns,
    ( SELECT count(*) AS count
           FROM legal_entity_contact lec
          WHERE ((lec.legal_entity_id = m.legal_entity_id) AND (lec.is_deleted = false))) AS contact_count,
    ( SELECT count(*) AS count
           FROM legal_entity_endpoint lee
          WHERE ((lee.legal_entity_id = m.legal_entity_id) AND (lee.is_deleted = false))) AS endpoint_count
   FROM ((members m
     LEFT JOIN legal_entity le ON (((m.legal_entity_id = le.legal_entity_id) AND (le.is_deleted = false))))
     LEFT JOIN legal_entity_number len ON (((le.legal_entity_id = len.legal_entity_id) AND (len.is_deleted = false))))
  GROUP BY m.id, m.org_id, m.legal_entity_id, m.azure_ad_object_id, m.email, m.created_at, m.updated_at, m.metadata, le.primary_legal_name, le.domain, le.status, le.membership_level, le.authentication_tier, le.authentication_method, le.metadata, le.party_id;

-- Drop and recreate members_view with EUID and EORI
DROP VIEW IF EXISTS members_view;

CREATE OR REPLACE VIEW members_view AS
 SELECT le.legal_entity_id,
    le.primary_legal_name AS legal_name,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'LEI'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS lei,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'KVK'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS kvk,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'EURI'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS euri,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'EUID'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS euid,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'EORI'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS eori,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'DUNS'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS duns,
    le.domain,
    le.status,
    le.membership_level,
    le.dt_created AS created_at,
    le.metadata
   FROM (legal_entity le
     LEFT JOIN legal_entity_number len ON ((le.legal_entity_id = len.legal_entity_id)))
  WHERE (le.is_deleted = false)
  GROUP BY le.legal_entity_id, le.primary_legal_name, le.domain, le.status, le.membership_level, le.dt_created, le.metadata;

-- Verify the views were created successfully
SELECT 'v_members_full view updated successfully' AS status;
SELECT 'members_view updated successfully' AS status;
