-- Migration: 065_fix_nullable_columns_with_defaults.sql
-- Date: 2026-02-02
-- Description: Fix all columns that have default values but are nullable
--
-- Database integrity rule: Columns with DEFAULT values should be NOT NULL
-- This prevents inconsistent data where NULL and the default value could
-- have different semantic meanings.
--
-- Total columns to fix: 107

BEGIN;

-- =====================================================
-- Count NULL values before fixing (for audit purposes)
-- =====================================================

DO $$
DECLARE
    null_count INTEGER;
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration 065: Fixing nullable columns with defaults';
    RAISE NOTICE '==============================================';
END $$;

-- =====================================================
-- 1. ADMIN_TASKS (3 columns)
-- =====================================================

UPDATE admin_tasks SET assigned_at = now() WHERE assigned_at IS NULL;
UPDATE admin_tasks SET created_at = now() WHERE created_at IS NULL;
UPDATE admin_tasks SET updated_at = now() WHERE updated_at IS NULL;

ALTER TABLE admin_tasks ALTER COLUMN assigned_at SET NOT NULL;
ALTER TABLE admin_tasks ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE admin_tasks ALTER COLUMN updated_at SET NOT NULL;

-- =====================================================
-- 2. APPLICATIONS (12 columns)
-- =====================================================

UPDATE applications SET country = 'Netherlands' WHERE country IS NULL;
UPDATE applications SET created_by = 'system' WHERE created_by IS NULL;
UPDATE applications SET dt_created = now() WHERE dt_created IS NULL;
UPDATE applications SET dt_updated = now() WHERE dt_updated IS NULL;
UPDATE applications SET gdpr_consent = false WHERE gdpr_consent IS NULL;
UPDATE applications SET kvk_verification_status = 'pending' WHERE kvk_verification_status IS NULL;
UPDATE applications SET membership_type = 'basic' WHERE membership_type IS NULL;
UPDATE applications SET status = 'pending' WHERE status IS NULL;
UPDATE applications SET submitted_at = now() WHERE submitted_at IS NULL;
UPDATE applications SET terms_accepted = false WHERE terms_accepted IS NULL;

ALTER TABLE applications ALTER COLUMN country SET NOT NULL;
ALTER TABLE applications ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE applications ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE applications ALTER COLUMN dt_updated SET NOT NULL;
ALTER TABLE applications ALTER COLUMN gdpr_consent SET NOT NULL;
ALTER TABLE applications ALTER COLUMN kvk_verification_status SET NOT NULL;
ALTER TABLE applications ALTER COLUMN membership_type SET NOT NULL;
ALTER TABLE applications ALTER COLUMN status SET NOT NULL;
ALTER TABLE applications ALTER COLUMN submitted_at SET NOT NULL;
ALTER TABLE applications ALTER COLUMN terms_accepted SET NOT NULL;

-- =====================================================
-- 3. BELGIUM_REGISTRY_DATA (5 columns)
-- =====================================================

UPDATE belgium_registry_data SET country = 'Belgium' WHERE country IS NULL;
UPDATE belgium_registry_data SET data_source = 'kbo_public' WHERE data_source IS NULL;
UPDATE belgium_registry_data SET dt_created = now() WHERE dt_created IS NULL;
UPDATE belgium_registry_data SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE belgium_registry_data SET is_deleted = false WHERE is_deleted IS NULL;

ALTER TABLE belgium_registry_data ALTER COLUMN country SET NOT NULL;
ALTER TABLE belgium_registry_data ALTER COLUMN data_source SET NOT NULL;
ALTER TABLE belgium_registry_data ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE belgium_registry_data ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE belgium_registry_data ALTER COLUMN is_deleted SET NOT NULL;

-- =====================================================
-- 4. CTN_M2M_CREDENTIALS (6 columns)
-- =====================================================

UPDATE ctn_m2m_credentials SET activation_date = now() WHERE activation_date IS NULL;
UPDATE ctn_m2m_credentials SET dt_created = now() WHERE dt_created IS NULL;
UPDATE ctn_m2m_credentials SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE ctn_m2m_credentials SET is_active = true WHERE is_active IS NULL;
UPDATE ctn_m2m_credentials SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE ctn_m2m_credentials SET total_requests = 0 WHERE total_requests IS NULL;

ALTER TABLE ctn_m2m_credentials ALTER COLUMN activation_date SET NOT NULL;
ALTER TABLE ctn_m2m_credentials ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE ctn_m2m_credentials ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE ctn_m2m_credentials ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE ctn_m2m_credentials ALTER COLUMN is_deleted SET NOT NULL;
ALTER TABLE ctn_m2m_credentials ALTER COLUMN total_requests SET NOT NULL;

-- =====================================================
-- 5. CTN_M2M_SECRET_AUDIT (4 columns)
-- =====================================================

UPDATE ctn_m2m_secret_audit SET dt_created = now() WHERE dt_created IS NULL;
UPDATE ctn_m2m_secret_audit SET is_revoked = false WHERE is_revoked IS NULL;
UPDATE ctn_m2m_secret_audit SET secret_acknowledged = false WHERE secret_acknowledged IS NULL;
UPDATE ctn_m2m_secret_audit SET secret_generated_at = now() WHERE secret_generated_at IS NULL;

ALTER TABLE ctn_m2m_secret_audit ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE ctn_m2m_secret_audit ALTER COLUMN is_revoked SET NOT NULL;
ALTER TABLE ctn_m2m_secret_audit ALTER COLUMN secret_acknowledged SET NOT NULL;
ALTER TABLE ctn_m2m_secret_audit ALTER COLUMN secret_generated_at SET NOT NULL;

-- =====================================================
-- 6. DNS_VERIFICATION_TOKENS (1 column)
-- =====================================================

UPDATE dns_verification_tokens SET verification_attempts = 0 WHERE verification_attempts IS NULL;

ALTER TABLE dns_verification_tokens ALTER COLUMN verification_attempts SET NOT NULL;

-- =====================================================
-- 7. EORI_REGISTRY_DATA (4 columns)
-- =====================================================

UPDATE eori_registry_data SET data_source = 'ec_eori_soap' WHERE data_source IS NULL;
UPDATE eori_registry_data SET dt_created = now() WHERE dt_created IS NULL;
UPDATE eori_registry_data SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE eori_registry_data SET is_deleted = false WHERE is_deleted IS NULL;

ALTER TABLE eori_registry_data ALTER COLUMN data_source SET NOT NULL;
ALTER TABLE eori_registry_data ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE eori_registry_data ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE eori_registry_data ALTER COLUMN is_deleted SET NOT NULL;

-- =====================================================
-- 8. GERMAN_COURT_CODES (2 columns)
-- =====================================================

UPDATE german_court_codes SET dt_created = now() WHERE dt_created IS NULL;
UPDATE german_court_codes SET is_active = true WHERE is_active IS NULL;

ALTER TABLE german_court_codes ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE german_court_codes ALTER COLUMN is_active SET NOT NULL;

-- =====================================================
-- 9. GERMAN_REGISTRY_DATA (8 columns)
-- =====================================================

UPDATE german_registry_data SET country = 'Germany' WHERE country IS NULL;
UPDATE german_registry_data SET data_source = 'handelsregister' WHERE data_source IS NULL;
UPDATE german_registry_data SET dt_created = now() WHERE dt_created IS NULL;
UPDATE german_registry_data SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE german_registry_data SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE german_registry_data SET is_main_establishment = true WHERE is_main_establishment IS NULL;
UPDATE german_registry_data SET share_capital_currency = 'EUR' WHERE share_capital_currency IS NULL;

ALTER TABLE german_registry_data ALTER COLUMN country SET NOT NULL;
ALTER TABLE german_registry_data ALTER COLUMN data_source SET NOT NULL;
ALTER TABLE german_registry_data ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE german_registry_data ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE german_registry_data ALTER COLUMN is_deleted SET NOT NULL;
ALTER TABLE german_registry_data ALTER COLUMN is_main_establishment SET NOT NULL;
ALTER TABLE german_registry_data ALTER COLUMN share_capital_currency SET NOT NULL;

-- =====================================================
-- 10. GLEIF_REGISTRATION_AUTHORITIES (1 column)
-- =====================================================

UPDATE gleif_registration_authorities SET is_primary = false WHERE is_primary IS NULL;

ALTER TABLE gleif_registration_authorities ALTER COLUMN is_primary SET NOT NULL;

-- =====================================================
-- 11. GLEIF_REGISTRY_DATA (6 columns)
-- =====================================================

UPDATE gleif_registry_data SET created_by = 'system' WHERE created_by IS NULL;
UPDATE gleif_registry_data SET data_source = 'gleif_api' WHERE data_source IS NULL;
UPDATE gleif_registry_data SET dt_created = now() WHERE dt_created IS NULL;
UPDATE gleif_registry_data SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE gleif_registry_data SET fetched_at = now() WHERE fetched_at IS NULL;
UPDATE gleif_registry_data SET last_verified_at = now() WHERE last_verified_at IS NULL;

ALTER TABLE gleif_registry_data ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE gleif_registry_data ALTER COLUMN data_source SET NOT NULL;
ALTER TABLE gleif_registry_data ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE gleif_registry_data ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE gleif_registry_data ALTER COLUMN fetched_at SET NOT NULL;
ALTER TABLE gleif_registry_data ALTER COLUMN last_verified_at SET NOT NULL;

-- =====================================================
-- 12. IDENTIFIER_VERIFICATION_HISTORY (2 columns)
-- =====================================================

UPDATE identifier_verification_history SET created_at = now() WHERE created_at IS NULL;
UPDATE identifier_verification_history SET updated_at = now() WHERE updated_at IS NULL;

ALTER TABLE identifier_verification_history ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE identifier_verification_history ALTER COLUMN updated_at SET NOT NULL;

-- =====================================================
-- 13. ISSUED_TOKENS (2 columns)
-- =====================================================

UPDATE issued_tokens SET issued_at = now() WHERE issued_at IS NULL;
UPDATE issued_tokens SET revoked = false WHERE revoked IS NULL;

ALTER TABLE issued_tokens ALTER COLUMN issued_at SET NOT NULL;
ALTER TABLE issued_tokens ALTER COLUMN revoked SET NOT NULL;

-- =====================================================
-- 14. KVK_REGISTRY_DATA (4 columns)
-- =====================================================

UPDATE kvk_registry_data SET data_source = 'kvk_api' WHERE data_source IS NULL;
UPDATE kvk_registry_data SET dt_created = now() WHERE dt_created IS NULL;
UPDATE kvk_registry_data SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE kvk_registry_data SET is_deleted = false WHERE is_deleted IS NULL;

ALTER TABLE kvk_registry_data ALTER COLUMN data_source SET NOT NULL;
ALTER TABLE kvk_registry_data ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE kvk_registry_data ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE kvk_registry_data ALTER COLUMN is_deleted SET NOT NULL;

-- =====================================================
-- 15. LEGAL_ENTITY (7 columns)
-- =====================================================

UPDATE legal_entity SET authentication_method = 'EmailVerification' WHERE authentication_method IS NULL;
UPDATE legal_entity SET dt_created = now() WHERE dt_created IS NULL;
UPDATE legal_entity SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE legal_entity SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE legal_entity SET kvk_verification_status = 'pending' WHERE kvk_verification_status IS NULL;
UPDATE legal_entity SET membership_level = 'BASIC' WHERE membership_level IS NULL;

ALTER TABLE legal_entity ALTER COLUMN authentication_method SET NOT NULL;
ALTER TABLE legal_entity ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE legal_entity ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE legal_entity ALTER COLUMN is_deleted SET NOT NULL;
ALTER TABLE legal_entity ALTER COLUMN kvk_verification_status SET NOT NULL;
ALTER TABLE legal_entity ALTER COLUMN membership_level SET NOT NULL;

-- =====================================================
-- 16. LEGAL_ENTITY_BRANDING (4 columns)
-- =====================================================

UPDATE legal_entity_branding SET dt_created = now() WHERE dt_created IS NULL;
UPDATE legal_entity_branding SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE legal_entity_branding SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE legal_entity_branding SET preferred_theme = 'light' WHERE preferred_theme IS NULL;

ALTER TABLE legal_entity_branding ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE legal_entity_branding ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE legal_entity_branding ALTER COLUMN is_deleted SET NOT NULL;
ALTER TABLE legal_entity_branding ALTER COLUMN preferred_theme SET NOT NULL;

-- =====================================================
-- 17. LEGAL_ENTITY_CONTACT (7 columns)
-- =====================================================

UPDATE legal_entity_contact SET dt_created = now() WHERE dt_created IS NULL;
UPDATE legal_entity_contact SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE legal_entity_contact SET is_active = true WHERE is_active IS NULL;
UPDATE legal_entity_contact SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE legal_entity_contact SET is_primary = false WHERE is_primary IS NULL;
UPDATE legal_entity_contact SET preferred_contact_method = 'EMAIL' WHERE preferred_contact_method IS NULL;
UPDATE legal_entity_contact SET preferred_language = 'en' WHERE preferred_language IS NULL;

ALTER TABLE legal_entity_contact ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE legal_entity_contact ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE legal_entity_contact ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE legal_entity_contact ALTER COLUMN is_deleted SET NOT NULL;
ALTER TABLE legal_entity_contact ALTER COLUMN is_primary SET NOT NULL;
ALTER TABLE legal_entity_contact ALTER COLUMN preferred_contact_method SET NOT NULL;
ALTER TABLE legal_entity_contact ALTER COLUMN preferred_language SET NOT NULL;

-- =====================================================
-- 18. LEGAL_ENTITY_ENDPOINT (6 columns)
-- =====================================================

UPDATE legal_entity_endpoint SET dt_created = now() WHERE dt_created IS NULL;
UPDATE legal_entity_endpoint SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE legal_entity_endpoint SET endpoint_type = 'REST_API' WHERE endpoint_type IS NULL;
UPDATE legal_entity_endpoint SET is_active = true WHERE is_active IS NULL;
UPDATE legal_entity_endpoint SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE legal_entity_endpoint SET verification_status = 'PENDING' WHERE verification_status IS NULL;

ALTER TABLE legal_entity_endpoint ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE legal_entity_endpoint ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE legal_entity_endpoint ALTER COLUMN endpoint_type SET NOT NULL;
ALTER TABLE legal_entity_endpoint ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE legal_entity_endpoint ALTER COLUMN is_deleted SET NOT NULL;
ALTER TABLE legal_entity_endpoint ALTER COLUMN verification_status SET NOT NULL;

-- =====================================================
-- 19. LEGAL_ENTITY_NUMBER (5 columns)
-- =====================================================

UPDATE legal_entity_number SET dt_created = now() WHERE dt_created IS NULL;
UPDATE legal_entity_number SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE legal_entity_number SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE legal_entity_number SET validation_status = 'PENDING' WHERE validation_status IS NULL;
UPDATE legal_entity_number SET verification_status = 'PENDING' WHERE verification_status IS NULL;

ALTER TABLE legal_entity_number ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE legal_entity_number ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE legal_entity_number ALTER COLUMN is_deleted SET NOT NULL;
ALTER TABLE legal_entity_number ALTER COLUMN validation_status SET NOT NULL;
ALTER TABLE legal_entity_number ALTER COLUMN verification_status SET NOT NULL;

-- =====================================================
-- 20. LEGAL_ENTITY_NUMBER_TYPE (2 columns)
-- =====================================================

UPDATE legal_entity_number_type SET created_by = 'system' WHERE created_by IS NULL;
UPDATE legal_entity_number_type SET display_order = 100 WHERE display_order IS NULL;

ALTER TABLE legal_entity_number_type ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE legal_entity_number_type ALTER COLUMN display_order SET NOT NULL;

-- =====================================================
-- 21. M2M_CLIENT_SECRETS_AUDIT (4 columns)
-- =====================================================

UPDATE m2m_client_secrets_audit SET dt_created = now() WHERE dt_created IS NULL;
UPDATE m2m_client_secrets_audit SET is_revoked = false WHERE is_revoked IS NULL;
UPDATE m2m_client_secrets_audit SET secret_generated_at = now() WHERE secret_generated_at IS NULL;
UPDATE m2m_client_secrets_audit SET usage_count = 0 WHERE usage_count IS NULL;

ALTER TABLE m2m_client_secrets_audit ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE m2m_client_secrets_audit ALTER COLUMN is_revoked SET NOT NULL;
ALTER TABLE m2m_client_secrets_audit ALTER COLUMN secret_generated_at SET NOT NULL;
ALTER TABLE m2m_client_secrets_audit ALTER COLUMN usage_count SET NOT NULL;

-- =====================================================
-- 22. M2M_CLIENTS (5 columns)
-- =====================================================

UPDATE m2m_clients SET activation_date = now() WHERE activation_date IS NULL;
UPDATE m2m_clients SET dt_created = now() WHERE dt_created IS NULL;
UPDATE m2m_clients SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE m2m_clients SET is_active = true WHERE is_active IS NULL;
UPDATE m2m_clients SET is_deleted = false WHERE is_deleted IS NULL;

ALTER TABLE m2m_clients ALTER COLUMN activation_date SET NOT NULL;
ALTER TABLE m2m_clients ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE m2m_clients ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE m2m_clients ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE m2m_clients ALTER COLUMN is_deleted SET NOT NULL;

-- =====================================================
-- 23. PARTY_REFERENCE (3 columns)
-- =====================================================

UPDATE party_reference SET dt_created = now() WHERE dt_created IS NULL;
UPDATE party_reference SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE party_reference SET is_deleted = false WHERE is_deleted IS NULL;

ALTER TABLE party_reference ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE party_reference ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE party_reference ALTER COLUMN is_deleted SET NOT NULL;

-- =====================================================
-- 24. PEPPOL_REGISTRY_DATA (4 columns)
-- =====================================================

UPDATE peppol_registry_data SET data_source = 'peppol_directory' WHERE data_source IS NULL;
UPDATE peppol_registry_data SET dt_created = now() WHERE dt_created IS NULL;
UPDATE peppol_registry_data SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE peppol_registry_data SET is_deleted = false WHERE is_deleted IS NULL;

ALTER TABLE peppol_registry_data ALTER COLUMN data_source SET NOT NULL;
ALTER TABLE peppol_registry_data ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE peppol_registry_data ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE peppol_registry_data ALTER COLUMN is_deleted SET NOT NULL;

-- =====================================================
-- 25. VIES_REGISTRY_DATA (4 columns)
-- =====================================================

UPDATE vies_registry_data SET data_source = 'vies_ec_europa' WHERE data_source IS NULL;
UPDATE vies_registry_data SET dt_created = now() WHERE dt_created IS NULL;
UPDATE vies_registry_data SET dt_modified = now() WHERE dt_modified IS NULL;
UPDATE vies_registry_data SET is_deleted = false WHERE is_deleted IS NULL;

ALTER TABLE vies_registry_data ALTER COLUMN data_source SET NOT NULL;
ALTER TABLE vies_registry_data ALTER COLUMN dt_created SET NOT NULL;
ALTER TABLE vies_registry_data ALTER COLUMN dt_modified SET NOT NULL;
ALTER TABLE vies_registry_data ALTER COLUMN is_deleted SET NOT NULL;

-- =====================================================
-- Verification: Count remaining nullable columns with defaults
-- =====================================================

DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_default IS NOT NULL
      AND is_nullable = 'YES';

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration 065 completed!';
    RAISE NOTICE 'Remaining nullable columns with defaults: %', remaining_count;

    IF remaining_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All columns with defaults are now NOT NULL';
    ELSE
        RAISE NOTICE 'WARNING: Some columns may need manual review';
    END IF;
    RAISE NOTICE '==============================================';
END $$;

COMMIT;
