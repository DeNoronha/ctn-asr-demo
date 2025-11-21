-- Migration 031: Remove EURI from views (not a recognized identifier)
-- Date: 2025-11-21
-- Description: EURI is not a standard European identifier system.
--              Web research confirms only EUID (European Unique Identifier) and
--              EORI (Economic Operators Registration and Identification) exist.
--              Removing EURI column from views to prevent confusion.
--
-- Note: NOT removing from legal_entity_number table to preserve any existing data,
--       but views will no longer expose it.

-- Drop and recreate v_members_full WITHOUT euri
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

-- Drop and recreate members_view WITHOUT euri
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

-- Add comment explaining identifier types
COMMENT ON VIEW v_members_full IS
'Member view with all identifier types: EUID (European Unique ID), EORI (Economic Operators Registration), LEI (Legal Entity Identifier), KVK (Dutch Chamber of Commerce), DUNS (Dun & Bradstreet). Note: EURI removed as it is not a recognized identifier system.';

COMMENT ON VIEW members_view IS
'Simplified member view with identifier types: EUID, EORI, LEI, KVK, DUNS. Note: EURI removed as it is not a recognized identifier system.';

-- Verify the views were created successfully
SELECT 'v_members_full view updated - EURI removed' AS status;
SELECT 'members_view updated - EURI removed' AS status;
