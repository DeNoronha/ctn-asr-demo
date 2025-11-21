-- Database export via SQLPro (https://www.sqlprostudio.com/)
-- Exported by ramondenoronha at 21-11-2025 16:07.
-- WARNING: This file may contain descructive statements such as DROPs.
-- Please ensure that you are running the script at the proper location.


-- BEGIN TABLE public.admin_tasks
DROP TABLE IF EXISTS public.admin_tasks CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_tasks (
	task_id uuid DEFAULT gen_random_uuid() NOT NULL,
	title character varying(255) NOT NULL,
	description text,
	task_type character varying(50) NOT NULL,
	status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
	priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
	assigned_to uuid,
	assigned_by uuid,
	assigned_at timestamp without time zone DEFAULT now(),
	related_entity_type character varying(50),
	related_entity_id uuid,
	due_date timestamp without time zone,
	completed_at timestamp without time zone,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	metadata jsonb,
	assigned_to_email character varying(255),
	created_by uuid,
	tags text[],
	PRIMARY KEY(task_id)
);

COMMIT;

-- END TABLE public.admin_tasks

-- BEGIN TABLE public.applications
DROP TABLE IF EXISTS public.applications CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.applications (
	application_id uuid DEFAULT gen_random_uuid() NOT NULL,
	applicant_email character varying(255) NOT NULL,
	applicant_name character varying(255) NOT NULL,
	applicant_job_title character varying(255),
	applicant_phone character varying(50),
	legal_name character varying(255) NOT NULL,
	kvk_number character varying(50) NOT NULL,
	lei character varying(20),
	company_address text,
	postal_code character varying(20),
	city character varying(100),
	country character varying(100) DEFAULT 'Netherlands'::character varying,
	membership_type character varying(50) DEFAULT 'basic'::character varying,
	kvk_document_url text,
	kvk_document_filename character varying(255),
	kvk_document_size_bytes integer,
	kvk_document_mime_type character varying(100),
	kvk_extracted_data jsonb,
	kvk_verification_status character varying(50) DEFAULT 'pending'::character varying,
	kvk_verification_notes text,
	status character varying(50) DEFAULT 'pending'::character varying,
	terms_accepted boolean DEFAULT false,
	gdpr_consent boolean DEFAULT false,
	submitted_at timestamp without time zone DEFAULT now(),
	reviewed_at timestamp without time zone,
	reviewed_by uuid,
	review_notes text,
	rejection_reason text,
	created_member_id uuid,
	created_azure_ad_invitation_id character varying(255),
	created_by character varying(255) DEFAULT 'system'::character varying,
	dt_created timestamp without time zone DEFAULT now(),
	dt_updated timestamp without time zone DEFAULT now(),
	PRIMARY KEY(application_id)
);

COMMIT;

-- END TABLE public.applications

-- BEGIN TABLE public.audit_log
DROP TABLE IF EXISTS public.audit_log CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_log (
	audit_log_id integer DEFAULT nextval('audit_log_audit_log_id_seq'::regclass) NOT NULL,
	event_type character varying(100) NOT NULL,
	severity character varying(20) NOT NULL,
	result character varying(20) NOT NULL,
	user_id character varying(255),
	user_email character varying(255),
	resource_type character varying(100),
	resource_id character varying(255),
	"action" character varying(100),
	ip_address character varying(45),
	user_agent text,
	request_path text,
	request_method character varying(10),
	details jsonb,
	error_message text,
	dt_created timestamp with time zone DEFAULT now() NOT NULL,
	user_email_pseudonym character varying(64),
	ip_address_pseudonym character varying(64),
	PRIMARY KEY(audit_log_id)
);

COMMIT;

-- END TABLE public.audit_log

-- BEGIN TABLE public.audit_log_pii_access
DROP TABLE IF EXISTS public.audit_log_pii_access CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_log_pii_access (
	access_id integer DEFAULT nextval('audit_log_pii_access_access_id_seq'::regclass) NOT NULL,
	pseudonym character varying(64) NOT NULL,
	accessed_by character varying(255) NOT NULL,
	accessed_at timestamp with time zone DEFAULT now() NOT NULL,
	access_reason text,
	user_agent text,
	ip_address character varying(45),
	PRIMARY KEY(access_id)
);

COMMIT;

-- END TABLE public.audit_log_pii_access

-- BEGIN TABLE public.audit_log_pii_mapping
DROP TABLE IF EXISTS public.audit_log_pii_mapping CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_log_pii_mapping (
	pseudonym character varying(64) NOT NULL,
	encrypted_value bytea NOT NULL,
	created_by character varying(255) NOT NULL,
	dt_created timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY(pseudonym)
);

COMMIT;

-- END TABLE public.audit_log_pii_mapping

-- BEGIN TABLE public.authorization_log
DROP TABLE IF EXISTS public.authorization_log CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.authorization_log (
	log_id uuid DEFAULT gen_random_uuid() NOT NULL,
	legal_entity_id uuid,
	user_identifier character varying(255),
	requested_resource character varying(255) NOT NULL,
	requested_action character varying(100) NOT NULL,
	required_tier integer NOT NULL,
	user_tier integer,
	authorization_result character varying(20) NOT NULL,
	denial_reason text,
	request_ip_address inet,
	request_user_agent text,
	request_path text,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	metadata jsonb,
	PRIMARY KEY(log_id)
);

COMMIT;

-- END TABLE public.authorization_log

-- BEGIN TABLE public.bdi_external_systems
DROP TABLE IF EXISTS public.bdi_external_systems CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.bdi_external_systems (
	system_id uuid DEFAULT gen_random_uuid() NOT NULL,
	system_name character varying(255) NOT NULL,
	system_domain character varying(255) NOT NULL,
	system_description text,
	keycloak_client_id character varying(255),
	client_type character varying(50),
	allowed_operations text[],
	rate_limit_per_hour integer DEFAULT 1000,
	is_active boolean DEFAULT true,
	is_approved boolean DEFAULT false,
	approved_by character varying(100),
	approved_at timestamp with time zone,
	admin_contact_name character varying(255),
	admin_contact_email character varying(255),
	dt_created timestamp with time zone DEFAULT now(),
	dt_modified timestamp with time zone DEFAULT now(),
	created_by character varying(100),
	modified_by character varying(100),
	is_deleted boolean DEFAULT false,
	PRIMARY KEY(system_id)
);

COMMIT;

-- END TABLE public.bdi_external_systems

-- BEGIN TABLE public.bdi_orchestration_participants
DROP TABLE IF EXISTS public.bdi_orchestration_participants CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.bdi_orchestration_participants (
	participant_id uuid DEFAULT gen_random_uuid() NOT NULL,
	orchestration_id uuid NOT NULL,
	legal_entity_id uuid,
	participant_domain character varying(255) NOT NULL,
	participant_legal_name character varying(255),
	participant_kvk character varying(20),
	participant_lei character varying(20),
	participant_role character varying(100) NOT NULL,
	authorized_by character varying(255),
	authorized_at timestamp with time zone DEFAULT now(),
	participant_status character varying(50) DEFAULT 'active'::character varying,
	dt_created timestamp with time zone DEFAULT now(),
	dt_modified timestamp with time zone DEFAULT now(),
	created_by character varying(100),
	modified_by character varying(100),
	is_deleted boolean DEFAULT false,
	PRIMARY KEY(participant_id)
);

COMMIT;

-- END TABLE public.bdi_orchestration_participants

-- BEGIN TABLE public.bdi_orchestrations
DROP TABLE IF EXISTS public.bdi_orchestrations CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.bdi_orchestrations (
	orchestration_id uuid DEFAULT gen_random_uuid() NOT NULL,
	internal_order_identifier character varying(255) NOT NULL,
	orchestrator_domain character varying(255) NOT NULL,
	orchestrator_legal_name character varying(255),
	orchestrator_lei character varying(20),
	customer_domain character varying(255),
	customer_legal_name character varying(255),
	customer_lei character varying(20),
	business_keys jsonb,
	status character varying(50) DEFAULT 'active'::character varying NOT NULL,
	orchestration_type character varying(100),
	dt_created timestamp with time zone DEFAULT now(),
	dt_modified timestamp with time zone DEFAULT now(),
	completed_at timestamp with time zone,
	metadata jsonb,
	created_by character varying(100),
	modified_by character varying(100),
	is_deleted boolean DEFAULT false,
	PRIMARY KEY(orchestration_id)
);

COMMIT;

-- END TABLE public.bdi_orchestrations

-- BEGIN TABLE public.bvad_issued_tokens
DROP TABLE IF EXISTS public.bvad_issued_tokens CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.bvad_issued_tokens (
	bvad_token_id uuid DEFAULT gen_random_uuid() NOT NULL,
	legal_entity_id uuid NOT NULL,
	jti character varying(255) NOT NULL,
	token_hash character varying(255),
	issuer character varying(255) NOT NULL,
	subject character varying(255) NOT NULL,
	audience text[],
	issued_at timestamp with time zone NOT NULL,
	expires_at timestamp with time zone NOT NULL,
	not_before timestamp with time zone,
	claims_snapshot jsonb,
	usage_count integer DEFAULT 0,
	last_used_at timestamp with time zone,
	last_used_by character varying(255),
	is_revoked boolean DEFAULT false,
	revoked_at timestamp with time zone,
	revoked_by character varying(100),
	revocation_reason text,
	dt_created timestamp with time zone DEFAULT now(),
	created_by character varying(100),
	PRIMARY KEY(bvad_token_id)
);

COMMIT;

-- END TABLE public.bvad_issued_tokens

-- BEGIN TABLE public.bvod_validation_log
DROP TABLE IF EXISTS public.bvod_validation_log CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.bvod_validation_log (
	validation_id uuid DEFAULT gen_random_uuid() NOT NULL,
	orchestration_id uuid,
	bvod_jti character varying(255),
	bvod_issuer character varying(255),
	bvod_subject character varying(255),
	requested_by character varying(255),
	requested_at timestamp with time zone DEFAULT now(),
	request_ip_address inet,
	request_user_agent text,
	validation_result character varying(50) NOT NULL,
	validation_reason text,
	member_domain_checked character varying(255),
	member_found_in_orchestration boolean,
	member_role_in_orchestration character varying(100),
	token_claims jsonb,
	signature_valid boolean,
	token_expired boolean,
	token_not_yet_valid boolean,
	validation_duration_ms integer,
	metadata jsonb,
	PRIMARY KEY(validation_id)
);

COMMIT;

-- END TABLE public.bvod_validation_log

-- BEGIN TABLE public.company_registries
DROP TABLE IF EXISTS public.company_registries CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.company_registries (
	registry_id uuid DEFAULT gen_random_uuid() NOT NULL,
	registry_code character varying(50) NOT NULL,
	registry_name character varying(255) NOT NULL,
	country_code character varying(2) NOT NULL,
	registry_type character varying(50),
	jurisdiction character varying(255),
	registry_url character varying(500),
	verification_url character varying(500),
	api_endpoint character varying(500),
	identifier_pattern character varying(255),
	identifier_example character varying(100),
	identifier_length_min integer,
	identifier_length_max integer,
	is_active boolean DEFAULT true,
	supports_api_lookup boolean DEFAULT false,
	requires_authentication boolean DEFAULT false,
	notes text,
	dt_created timestamp with time zone DEFAULT now(),
	dt_modified timestamp with time zone DEFAULT now(),
	created_by character varying(100),
	modified_by character varying(100),
	PRIMARY KEY(registry_id)
);

COMMIT;

-- END TABLE public.company_registries

-- BEGIN TABLE public.ctn_m2m_credentials
DROP TABLE IF EXISTS public.ctn_m2m_credentials CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.ctn_m2m_credentials (
	credential_id uuid DEFAULT gen_random_uuid() NOT NULL,
	party_id uuid NOT NULL,
	dt_created timestamp with time zone DEFAULT now(),
	dt_modified timestamp with time zone DEFAULT now(),
	created_by uuid,
	modified_by uuid,
	is_deleted boolean DEFAULT false,
	m2m_client_id character varying(500) NOT NULL,
	m2m_realm_id character varying(255) NOT NULL,
	m2m_user_id character varying(255) NOT NULL,
	service_account_name character varying(255) NOT NULL,
	description text,
	auth_provider character varying(50) DEFAULT 'zitadel'::character varying NOT NULL,
	auth_issuer character varying(500) NOT NULL,
	assigned_scopes text[] DEFAULT '{}'::text[] NOT NULL,
	allowed_endpoints text[],
	is_active boolean DEFAULT true,
	activation_date timestamp with time zone DEFAULT now(),
	deactivation_date timestamp with time zone,
	deactivation_reason text,
	last_used_at timestamp with time zone,
	total_requests integer DEFAULT 0,
	last_request_ip character varying(45),
	notes text,
	PRIMARY KEY(credential_id)
);

COMMIT;

-- END TABLE public.ctn_m2m_credentials

-- BEGIN TABLE public.ctn_m2m_secret_audit
DROP TABLE IF EXISTS public.ctn_m2m_secret_audit CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.ctn_m2m_secret_audit (
	audit_id uuid DEFAULT gen_random_uuid() NOT NULL,
	credential_id uuid NOT NULL,
	dt_created timestamp with time zone DEFAULT now(),
	secret_generated_at timestamp with time zone DEFAULT now(),
	generated_by uuid,
	secret_acknowledged boolean DEFAULT false,
	acknowledged_at timestamp with time zone,
	is_revoked boolean DEFAULT false,
	revoked_at timestamp with time zone,
	revoked_by uuid,
	revocation_reason text,
	generated_from_ip character varying(45),
	user_agent text,
	PRIMARY KEY(audit_id)
);

COMMIT;

-- END TABLE public.ctn_m2m_secret_audit

-- BEGIN TABLE public.dns_verification_tokens
DROP TABLE IF EXISTS public.dns_verification_tokens CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.dns_verification_tokens (
	token_id uuid DEFAULT gen_random_uuid() NOT NULL,
	legal_entity_id uuid NOT NULL,
	"domain" character varying(255) NOT NULL,
	token character varying(255) NOT NULL,
	record_name character varying(255) NOT NULL,
	status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
	verification_attempts integer DEFAULT 0,
	last_verification_attempt timestamp with time zone,
	verification_details jsonb,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	expires_at timestamp with time zone NOT NULL,
	verified_at timestamp with time zone,
	created_by character varying(100),
	PRIMARY KEY(token_id)
);

COMMIT;

-- END TABLE public.dns_verification_tokens

-- BEGIN TABLE public.endpoint_authorization
DROP TABLE IF EXISTS public.endpoint_authorization CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.endpoint_authorization (
	endpoint_authorization_id uuid DEFAULT gen_random_uuid() NOT NULL,
	legal_entity_endpoint_id uuid NOT NULL,
	dt_created timestamp with time zone DEFAULT now(),
	dt_modified timestamp with time zone DEFAULT now(),
	created_by character varying(100),
	modified_by character varying(100),
	is_deleted boolean DEFAULT false,
	token_value text NOT NULL,
	token_type character varying(50) DEFAULT 'BVAD'::character varying,
	token_hash character varying(255),
	issued_at timestamp with time zone DEFAULT now(),
	expires_at timestamp with time zone,
	revoked_at timestamp with time zone,
	revocation_reason text,
	is_active boolean DEFAULT true,
	last_used_at timestamp with time zone,
	usage_count integer DEFAULT 0,
	issued_by character varying(100),
	issued_by_user_id uuid,
	PRIMARY KEY(endpoint_authorization_id)
);

COMMIT;

-- END TABLE public.endpoint_authorization

-- BEGIN TABLE public.identifier_verification_history
DROP TABLE IF EXISTS public.identifier_verification_history CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.identifier_verification_history (
	verification_id uuid DEFAULT gen_random_uuid() NOT NULL,
	legal_entity_id uuid NOT NULL,
	identifier_id uuid NOT NULL,
	identifier_type character varying(50) NOT NULL,
	identifier_value character varying(255) NOT NULL,
	verification_method character varying(100) NOT NULL,
	verification_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
	document_blob_url text,
	document_filename character varying(500),
	document_mime_type character varying(100),
	extracted_data jsonb,
	verified_by character varying(255),
	verified_at timestamp with time zone,
	verification_notes text,
	created_at timestamp with time zone DEFAULT now(),
	updated_at timestamp with time zone DEFAULT now(),
	PRIMARY KEY(verification_id)
);

COMMIT;

-- END TABLE public.identifier_verification_history

-- BEGIN TABLE public.issued_tokens
DROP TABLE IF EXISTS public.issued_tokens CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.issued_tokens (
	jti character varying(255) NOT NULL,
	token_type character varying(20) NOT NULL,
	member_id uuid,
	issued_at timestamp with time zone DEFAULT now(),
	expires_at timestamp with time zone NOT NULL,
	revoked boolean DEFAULT false,
	metadata jsonb,
	PRIMARY KEY(jti)
);

COMMIT;

-- END TABLE public.issued_tokens

-- BEGIN TABLE public.kvk_registry_data
DROP TABLE IF EXISTS public.kvk_registry_data CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.kvk_registry_data (
	registry_data_id uuid DEFAULT gen_random_uuid() NOT NULL,
	legal_entity_id uuid NOT NULL,
	kvk_number character varying(20) NOT NULL,
	company_name character varying(500) NOT NULL,
	legal_form character varying(200),
	trade_names jsonb,
	formal_registration_date date,
	material_registration_date date,
	company_status character varying(100),
	addresses jsonb,
	sbi_activities jsonb,
	total_employees integer,
	kvk_profile_url text,
	establishment_profile_url text,
	raw_api_response jsonb NOT NULL,
	fetched_at timestamp with time zone DEFAULT now() NOT NULL,
	last_verified_at timestamp with time zone,
	data_source character varying(50) DEFAULT 'kvk_api'::character varying,
	dt_created timestamp with time zone DEFAULT now(),
	dt_modified timestamp with time zone DEFAULT now(),
	created_by character varying(255),
	modified_by character varying(255),
	is_deleted boolean DEFAULT false,
	PRIMARY KEY(registry_data_id)
);

COMMIT;

-- END TABLE public.kvk_registry_data

-- BEGIN TABLE public.legal_entity
DROP TABLE IF EXISTS public.legal_entity CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.legal_entity (
	legal_entity_id uuid DEFAULT gen_random_uuid() NOT NULL,
	party_id uuid NOT NULL,
	dt_created timestamp with time zone DEFAULT now(),
	dt_modified timestamp with time zone DEFAULT now(),
	created_by character varying(100),
	modified_by character varying(100),
	is_deleted boolean DEFAULT false,
	primary_legal_name character varying(255) NOT NULL,
	address_line1 character varying(255),
	address_line2 character varying(255),
	postal_code character varying(255),
	city character varying(255),
	province character varying(255),
	country_code character varying(2),
	entity_legal_form character varying(255),
	registered_at character varying(255),
	direct_parent_legal_entity_id uuid,
	ultimate_parent_legal_entity_id uuid,
	"domain" character varying(255),
	status character varying(20) DEFAULT 'PENDING'::character varying,
	membership_level character varying(20) DEFAULT 'BASIC'::character varying,
	metadata jsonb,
	kvk_document_url text,
	kvk_verification_status character varying(20) DEFAULT 'pending'::character varying,
	kvk_verified_at timestamp with time zone,
	kvk_verified_by character varying(100),
	kvk_verification_notes text,
	kvk_extracted_company_name text,
	kvk_extracted_number text,
	kvk_api_response jsonb,
	kvk_mismatch_flags text[],
	document_uploaded_at timestamp with time zone,
	authentication_tier integer DEFAULT 3 NOT NULL,
	authentication_method character varying(50) DEFAULT 'EmailVerification'::character varying,
	dns_verified_domain character varying(255),
	dns_verification_initiated_at timestamp with time zone,
	dns_verified_at timestamp with time zone,
	dns_reverification_due timestamp with time zone,
	eherkenning_identifier character varying(255),
	eherkenning_level character varying(10),
	PRIMARY KEY(legal_entity_id)
);

COMMIT;

-- END TABLE public.legal_entity

-- BEGIN TABLE public.legal_entity_backup_20251113
DROP TABLE IF EXISTS public.legal_entity_backup_20251113 CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.legal_entity_backup_20251113 (
	legal_entity_id uuid,
	party_id uuid,
	dt_created timestamp with time zone,
	dt_modified timestamp with time zone,
	created_by character varying(100),
	modified_by character varying(100),
	is_deleted boolean,
	primary_legal_name character varying(255),
	address_line1 character varying(255),
	address_line2 character varying(255),
	postal_code character varying(255),
	city character varying(255),
	province character varying(255),
	country_code character varying(2),
	entity_legal_form character varying(255),
	registered_at character varying(255),
	direct_parent_legal_entity_id uuid,
	ultimate_parent_legal_entity_id uuid,
	"domain" character varying(255),
	status character varying(20),
	membership_level character varying(20),
	metadata jsonb,
	kvk_document_url text,
	kvk_verification_status character varying(20),
	kvk_verified_at timestamp with time zone,
	kvk_verified_by character varying(100),
	kvk_verification_notes text,
	kvk_extracted_company_name text,
	kvk_extracted_number text,
	kvk_api_response jsonb,
	kvk_mismatch_flags text[],
	document_uploaded_at timestamp with time zone,
	authentication_tier integer,
	authentication_method character varying(50),
	dns_verified_domain character varying(255),
	dns_verification_initiated_at timestamp with time zone,
	dns_verified_at timestamp with time zone,
	dns_reverification_due timestamp with time zone,
	eherkenning_identifier character varying(255),
	eherkenning_level character varying(10)
);

COMMIT;

-- END TABLE public.legal_entity_backup_20251113

-- BEGIN TABLE public.legal_entity_contact
DROP TABLE IF EXISTS public.legal_entity_contact CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.legal_entity_contact (
	legal_entity_contact_id uuid DEFAULT gen_random_uuid() NOT NULL,
	legal_entity_id uuid NOT NULL,
	dt_created timestamp with time zone DEFAULT now(),
	dt_modified timestamp with time zone DEFAULT now(),
	created_by character varying(100),
	modified_by character varying(100),
	is_deleted boolean DEFAULT false,
	contact_type character varying(50) NOT NULL,
	full_name character varying(255) NOT NULL,
	email character varying(255) NOT NULL,
	phone character varying(50),
	mobile character varying(50),
	job_title character varying(100),
	department character varying(100),
	preferred_language character varying(10) DEFAULT 'en'::character varying,
	preferred_contact_method character varying(50) DEFAULT 'EMAIL'::character varying,
	is_primary boolean DEFAULT false,
	is_active boolean DEFAULT true,
	first_name character varying(100),
	last_name character varying(100),
	PRIMARY KEY(legal_entity_contact_id)
);

COMMIT;

-- END TABLE public.legal_entity_contact

-- BEGIN TABLE public.legal_entity_endpoint
DROP TABLE IF EXISTS public.legal_entity_endpoint CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.legal_entity_endpoint (
	legal_entity_endpoint_id uuid DEFAULT gen_random_uuid() NOT NULL,
	legal_entity_id uuid NOT NULL,
	dt_created timestamp with time zone DEFAULT now(),
	dt_modified timestamp with time zone DEFAULT now(),
	created_by character varying(100),
	modified_by character varying(100),
	is_deleted boolean DEFAULT false,
	endpoint_name character varying(255) NOT NULL,
	endpoint_url character varying(500),
	endpoint_description text,
	data_category character varying(100),
	endpoint_type character varying(50) DEFAULT 'REST_API'::character varying,
	authentication_method character varying(50),
	last_connection_test timestamp with time zone,
	last_connection_status character varying(50),
	connection_test_details jsonb,
	is_active boolean DEFAULT true,
	activation_date timestamp with time zone,
	deactivation_date timestamp with time zone,
	deactivation_reason text,
	verification_token text,
	verification_status character varying(20) DEFAULT 'PENDING'::character varying,
	verification_sent_at timestamp with time zone,
	verification_expires_at timestamp with time zone,
	test_result_data jsonb,
	PRIMARY KEY(legal_entity_endpoint_id)
);

COMMIT;

-- END TABLE public.legal_entity_endpoint

-- BEGIN TABLE public.legal_entity_number
DROP TABLE IF EXISTS public.legal_entity_number CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.legal_entity_number (
	legal_entity_reference_id uuid DEFAULT gen_random_uuid() NOT NULL,
	legal_entity_id uuid NOT NULL,
	dt_created timestamp with time zone DEFAULT now(),
	dt_modified timestamp with time zone DEFAULT now(),
	created_by character varying(100),
	modified_by character varying(100),
	is_deleted boolean DEFAULT false,
	identifier_type character varying(100) NOT NULL,
	identifier_value character varying(100) NOT NULL,
	country_code character varying(2),
	valid_from timestamp with time zone,
	valid_to timestamp with time zone,
	issued_by character varying(100),
	validated_by character varying(100),
	validation_status character varying(50) DEFAULT 'PENDING'::character varying,
	validation_date timestamp with time zone,
	verification_document_url text,
	verification_notes text,
	registry_name character varying(255),
	registry_url character varying(500),
	issuing_authority character varying(255),
	issued_at timestamp without time zone,
	expires_at timestamp without time zone,
	verification_status character varying(50) DEFAULT 'PENDING'::character varying,
	PRIMARY KEY(legal_entity_reference_id)
);

COMMIT;

-- END TABLE public.legal_entity_number

-- BEGIN TABLE public.m2m_client_secrets_audit
DROP TABLE IF EXISTS public.m2m_client_secrets_audit CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.m2m_client_secrets_audit (
	audit_id uuid DEFAULT gen_random_uuid() NOT NULL,
	m2m_client_id uuid NOT NULL,
	dt_created timestamp with time zone DEFAULT now(),
	secret_generated_at timestamp with time zone DEFAULT now(),
	generated_by uuid,
	expires_at timestamp with time zone,
	is_revoked boolean DEFAULT false,
	revoked_at timestamp with time zone,
	revoked_by uuid,
	revocation_reason text,
	last_used_at timestamp with time zone,
	usage_count integer DEFAULT 0,
	generated_from_ip character varying(45),
	user_agent text,
	PRIMARY KEY(audit_id)
);

COMMIT;

-- END TABLE public.m2m_client_secrets_audit

-- BEGIN TABLE public.m2m_clients
DROP TABLE IF EXISTS public.m2m_clients CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.m2m_clients (
	m2m_client_id uuid DEFAULT gen_random_uuid() NOT NULL,
	legal_entity_id uuid NOT NULL,
	dt_created timestamp with time zone DEFAULT now(),
	dt_modified timestamp with time zone DEFAULT now(),
	created_by uuid,
	modified_by uuid,
	is_deleted boolean DEFAULT false,
	client_name character varying(255) NOT NULL,
	azure_client_id uuid NOT NULL,
	azure_object_id uuid,
	description text,
	assigned_scopes text[] DEFAULT '{}'::text[] NOT NULL,
	is_active boolean DEFAULT true,
	activation_date timestamp with time zone DEFAULT now(),
	deactivation_date timestamp with time zone,
	deactivation_reason text,
	legal_entity_endpoint_id uuid,
	PRIMARY KEY(m2m_client_id)
);

COMMIT;

-- END TABLE public.m2m_clients

-- BEGIN TABLE public.members
DROP TABLE IF EXISTS public.members CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.members (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	org_id character varying(100) NOT NULL,
	created_at timestamp with time zone DEFAULT now(),
	updated_at timestamp with time zone DEFAULT now(),
	metadata jsonb,
	legal_entity_id uuid NOT NULL,
	azure_ad_object_id uuid,
	email character varying(255),
	PRIMARY KEY(id)
);

COMMIT;

-- END TABLE public.members

-- BEGIN TABLE public.members_backup_20251113
DROP TABLE IF EXISTS public.members_backup_20251113 CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.members_backup_20251113 (
	id uuid,
	org_id character varying(100),
	legal_name character varying(255),
	lei character varying(20),
	kvk character varying(20),
	"domain" character varying(255),
	status character varying(20),
	membership_level character varying(20),
	created_at timestamp with time zone,
	updated_at timestamp with time zone,
	metadata jsonb,
	legal_entity_id uuid,
	azure_ad_object_id uuid,
	email character varying(255)
);

COMMIT;

-- END TABLE public.members_backup_20251113

-- BEGIN TABLE public.oauth_clients
DROP TABLE IF EXISTS public.oauth_clients CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.oauth_clients (
	client_id character varying(255) NOT NULL,
	member_id uuid,
	client_secret_hash character varying(255) NOT NULL,
	redirect_uris text[],
	scopes text[],
	created_at timestamp with time zone DEFAULT now(),
	updated_at timestamp with time zone DEFAULT now(),
	PRIMARY KEY(client_id)
);

COMMIT;

-- END TABLE public.oauth_clients

-- BEGIN TABLE public.party_reference
DROP TABLE IF EXISTS public.party_reference CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.party_reference (
	party_id uuid DEFAULT gen_random_uuid() NOT NULL,
	dt_created timestamp with time zone DEFAULT now(),
	dt_modified timestamp with time zone DEFAULT now(),
	created_by character varying(100),
	modified_by character varying(100),
	is_deleted boolean DEFAULT false,
	party_class character varying(255),
	party_type character varying(255),
	PRIMARY KEY(party_id)
);

COMMIT;

-- END TABLE public.party_reference

-- BEGIN TABLE public.vetting_records
DROP TABLE IF EXISTS public.vetting_records CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.vetting_records (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	member_id uuid,
	vetting_type character varying(50) NOT NULL,
	status character varying(20) NOT NULL,
	result jsonb,
	completed_at timestamp with time zone,
	expires_at timestamp with time zone,
	created_at timestamp with time zone DEFAULT now(),
	PRIMARY KEY(id)
);

COMMIT;

-- END TABLE public.vetting_records

DROP VIEW public.company_identifiers_with_registry;

CREATE OR REPLACE VIEW public.company_identifiers_with_registry AS
 SELECT len.legal_entity_reference_id,
    len.legal_entity_id,
    len.identifier_type,
    len.identifier_value,
    len.country_code,
    len.registry_name,
    len.registry_url AS identifier_registry_url,
    len.validation_status,
    cr.registry_id,
    cr.registry_code,
    cr.registry_name AS official_registry_name,
    cr.registry_type,
    cr.jurisdiction,
    cr.registry_url AS official_registry_url,
    cr.verification_url,
    cr.supports_api_lookup,
    cr.identifier_pattern,
    cr.identifier_example
   FROM (legal_entity_number len
     LEFT JOIN company_registries cr ON ((((len.identifier_type)::text = (cr.registry_code)::text) OR (((len.country_code)::text = (cr.country_code)::text) AND ((cr.registry_type)::text = 'chamber_of_commerce'::text)))))
  WHERE ((len.is_deleted = false) OR (len.is_deleted IS NULL));

DROP VIEW public.legal_entity_full;

CREATE OR REPLACE VIEW public.legal_entity_full AS
 SELECT le.legal_entity_id,
    le.party_id,
    pr.party_class,
    pr.party_type,
    le.primary_legal_name,
    le.address_line1,
    le.address_line2,
    le.postal_code,
    le.city,
    le.province,
    le.country_code,
    le.entity_legal_form,
    le.registered_at,
    le.domain,
    le.status,
    le.membership_level,
    le.dt_created,
    le.dt_modified,
    le.created_by,
    le.modified_by,
    COALESCE(json_agg(DISTINCT jsonb_build_object('type', len.identifier_type, 'value', len.identifier_value, 'country', len.country_code, 'status', len.validation_status)) FILTER (WHERE (len.legal_entity_reference_id IS NOT NULL)), '[]'::json) AS identifiers,
    COALESCE(json_agg(DISTINCT jsonb_build_object('id', lec.legal_entity_contact_id, 'type', lec.contact_type, 'name', lec.full_name, 'email', lec.email, 'phone', lec.phone, 'is_primary', lec.is_primary)) FILTER (WHERE (lec.legal_entity_contact_id IS NOT NULL)), '[]'::json) AS contacts,
    COALESCE(json_agg(DISTINCT jsonb_build_object('id', lee.legal_entity_endpoint_id, 'name', lee.endpoint_name, 'url', lee.endpoint_url, 'category', lee.data_category, 'is_active', lee.is_active)) FILTER (WHERE (lee.legal_entity_endpoint_id IS NOT NULL)), '[]'::json) AS endpoints
   FROM ((((legal_entity le
     JOIN party_reference pr ON ((le.party_id = pr.party_id)))
     LEFT JOIN legal_entity_number len ON (((le.legal_entity_id = len.legal_entity_id) AND (len.is_deleted = false))))
     LEFT JOIN legal_entity_contact lec ON (((le.legal_entity_id = lec.legal_entity_id) AND (lec.is_deleted = false))))
     LEFT JOIN legal_entity_endpoint lee ON (((le.legal_entity_id = lee.legal_entity_id) AND (lee.is_deleted = false))))
  WHERE (le.is_deleted = false)
  GROUP BY le.legal_entity_id, le.party_id, pr.party_class, pr.party_type, le.primary_legal_name, le.address_line1, le.address_line2, le.postal_code, le.city, le.province, le.country_code, le.entity_legal_form, le.registered_at, le.domain, le.status, le.membership_level, le.dt_created, le.dt_modified, le.created_by, le.modified_by;

DROP VIEW public.members_view;

CREATE OR REPLACE VIEW public.members_view AS
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
    le.domain,
    le.status,
    le.membership_level,
    le.dt_created AS created_at,
    le.metadata
   FROM (legal_entity le
     LEFT JOIN legal_entity_number len ON ((le.legal_entity_id = len.legal_entity_id)))
  WHERE (le.is_deleted = false)
  GROUP BY le.legal_entity_id, le.primary_legal_name, le.domain, le.status, le.membership_level, le.dt_created, le.metadata;

DROP VIEW public.v_audit_log_summary;

CREATE OR REPLACE VIEW public.v_audit_log_summary AS
 SELECT audit_log.audit_log_id,
    audit_log.event_type,
    audit_log.severity,
    audit_log.result,
    audit_log.user_id,
    COALESCE(audit_log.user_email_pseudonym, 'no-email'::character varying) AS user_identifier,
    audit_log.resource_type,
    audit_log.resource_id,
    audit_log.action,
    COALESCE(audit_log.ip_address_pseudonym, 'no-ip'::character varying) AS client_identifier,
    "left"(audit_log.user_agent, 100) AS user_agent_summary,
    audit_log.request_path,
    audit_log.request_method,
    audit_log.error_message,
    audit_log.dt_created
   FROM audit_log
  ORDER BY audit_log.dt_created DESC;

DROP VIEW public.v_m2m_clients_active;

CREATE OR REPLACE VIEW public.v_m2m_clients_active AS
 SELECT c.m2m_client_id,
    c.legal_entity_id,
    c.client_name,
    c.azure_client_id,
    c.azure_object_id,
    c.description,
    c.assigned_scopes,
    c.is_active,
    c.dt_created,
    c.dt_modified,
    ( SELECT count(*) AS count
           FROM m2m_client_secrets_audit s
          WHERE ((s.m2m_client_id = c.m2m_client_id) AND (s.is_revoked = false))) AS active_secrets_count,
    ( SELECT max(s.secret_generated_at) AS max
           FROM m2m_client_secrets_audit s
          WHERE (s.m2m_client_id = c.m2m_client_id)) AS last_secret_generated_at,
    le.primary_legal_name,
    le.domain
   FROM (m2m_clients c
     LEFT JOIN legal_entity le ON ((c.legal_entity_id = le.legal_entity_id)))
  WHERE ((c.is_deleted = false) AND (c.is_active = true));

DROP VIEW public.v_m2m_credentials_active;

CREATE OR REPLACE VIEW public.v_m2m_credentials_active AS
 SELECT DISTINCT ON (c.credential_id) c.credential_id,
    c.party_id,
    c.m2m_client_id,
    c.m2m_realm_id,
    c.m2m_user_id,
    c.service_account_name,
    c.description,
    c.auth_provider,
    c.auth_issuer,
    c.assigned_scopes,
    c.allowed_endpoints,
    c.is_active,
    c.dt_created,
    c.dt_modified,
    c.last_used_at,
    c.total_requests,
    c.last_request_ip,
    ( SELECT count(*) AS count
           FROM ctn_m2m_secret_audit s
          WHERE ((s.credential_id = c.credential_id) AND (s.is_revoked = false))) AS active_secrets_count,
    ( SELECT max(s.secret_generated_at) AS max
           FROM ctn_m2m_secret_audit s
          WHERE (s.credential_id = c.credential_id)) AS last_secret_generated_at,
    p.party_type,
    le.primary_legal_name AS party_name
   FROM ((ctn_m2m_credentials c
     LEFT JOIN party_reference p ON ((c.party_id = p.party_id)))
     LEFT JOIN legal_entity le ON (((c.party_id = le.party_id) AND (le.is_deleted = false))))
  WHERE ((c.is_deleted = false) AND (c.is_active = true))
  ORDER BY c.credential_id, le.dt_created DESC;

DROP VIEW public.v_members_full;

CREATE OR REPLACE VIEW public.v_members_full AS
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

DROP VIEW public.v_members_list;

CREATE OR REPLACE VIEW public.v_members_list AS
 SELECT m.id,
    m.org_id,
    m.legal_entity_id,
    m.email,
    m.created_at,
    m.updated_at,
    le.primary_legal_name AS legal_name,
    le.domain,
    le.status,
    le.membership_level,
    le.authentication_tier,
    le.party_id
   FROM (members m
     LEFT JOIN legal_entity le ON (((m.legal_entity_id = le.legal_entity_id) AND (le.is_deleted = false))));

ALTER TABLE IF EXISTS public.applications
	ADD CONSTRAINT applications_created_member_id_fkey
	FOREIGN KEY (created_member_id)
	REFERENCES public.legal_entity (legal_entity_id)
	ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.authorization_log
	ADD CONSTRAINT fk_auth_log_legal_entity
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id)
	ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.bdi_orchestration_participants
	ADD CONSTRAINT bdi_orchestration_participants_orchestration_id_fkey
	FOREIGN KEY (orchestration_id)
	REFERENCES public.bdi_orchestrations (orchestration_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.bdi_orchestration_participants
	ADD CONSTRAINT bdi_orchestration_participants_legal_entity_id_fkey
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id);

ALTER TABLE IF EXISTS public.bvad_issued_tokens
	ADD CONSTRAINT bvad_issued_tokens_legal_entity_id_fkey
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id);

ALTER TABLE IF EXISTS public.bvod_validation_log
	ADD CONSTRAINT bvod_validation_log_orchestration_id_fkey
	FOREIGN KEY (orchestration_id)
	REFERENCES public.bdi_orchestrations (orchestration_id);

ALTER TABLE IF EXISTS public.ctn_m2m_credentials
	ADD CONSTRAINT fk_m2m_modified_by
	FOREIGN KEY (modified_by)
	REFERENCES public.party_reference (party_id);

ALTER TABLE IF EXISTS public.ctn_m2m_credentials
	ADD CONSTRAINT fk_m2m_party
	FOREIGN KEY (party_id)
	REFERENCES public.party_reference (party_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.ctn_m2m_credentials
	ADD CONSTRAINT fk_m2m_created_by
	FOREIGN KEY (created_by)
	REFERENCES public.party_reference (party_id);

ALTER TABLE IF EXISTS public.ctn_m2m_secret_audit
	ADD CONSTRAINT fk_m2m_secrets_generated_by
	FOREIGN KEY (generated_by)
	REFERENCES public.party_reference (party_id);

ALTER TABLE IF EXISTS public.ctn_m2m_secret_audit
	ADD CONSTRAINT fk_m2m_secrets_revoked_by
	FOREIGN KEY (revoked_by)
	REFERENCES public.party_reference (party_id);

ALTER TABLE IF EXISTS public.ctn_m2m_secret_audit
	ADD CONSTRAINT fk_m2m_secrets_credential
	FOREIGN KEY (credential_id)
	REFERENCES public.ctn_m2m_credentials (credential_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.dns_verification_tokens
	ADD CONSTRAINT fk_dns_token_legal_entity
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.endpoint_authorization
	ADD CONSTRAINT fk_endpoint_authorization
	FOREIGN KEY (legal_entity_endpoint_id)
	REFERENCES public.legal_entity_endpoint (legal_entity_endpoint_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.identifier_verification_history
	ADD CONSTRAINT identifier_verification_history_identifier_id_fkey
	FOREIGN KEY (identifier_id)
	REFERENCES public.legal_entity_number (legal_entity_reference_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.identifier_verification_history
	ADD CONSTRAINT identifier_verification_history_legal_entity_id_fkey
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.issued_tokens
	ADD CONSTRAINT issued_tokens_member_id_fkey
	FOREIGN KEY (member_id)
	REFERENCES public.members (id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.kvk_registry_data
	ADD CONSTRAINT kvk_registry_data_legal_entity_id_fkey
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.legal_entity
	ADD CONSTRAINT fk_party
	FOREIGN KEY (party_id)
	REFERENCES public.party_reference (party_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.legal_entity
	ADD CONSTRAINT fk_direct_parent
	FOREIGN KEY (direct_parent_legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id);

ALTER TABLE IF EXISTS public.legal_entity
	ADD CONSTRAINT fk_ultimate_parent
	FOREIGN KEY (ultimate_parent_legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id);

ALTER TABLE IF EXISTS public.legal_entity_contact
	ADD CONSTRAINT fk_legal_entity_contact
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.legal_entity_endpoint
	ADD CONSTRAINT fk_legal_entity_endpoint
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.legal_entity_number
	ADD CONSTRAINT fk_legal_entity
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.m2m_client_secrets_audit
	ADD CONSTRAINT fk_m2m_secrets_generated_by
	FOREIGN KEY (generated_by)
	REFERENCES public.party_reference (party_id);

ALTER TABLE IF EXISTS public.m2m_client_secrets_audit
	ADD CONSTRAINT fk_m2m_secrets_client
	FOREIGN KEY (m2m_client_id)
	REFERENCES public.m2m_clients (m2m_client_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.m2m_client_secrets_audit
	ADD CONSTRAINT fk_m2m_secrets_revoked_by
	FOREIGN KEY (revoked_by)
	REFERENCES public.party_reference (party_id);

ALTER TABLE IF EXISTS public.m2m_clients
	ADD CONSTRAINT fk_m2m_created_by
	FOREIGN KEY (created_by)
	REFERENCES public.party_reference (party_id);

ALTER TABLE IF EXISTS public.m2m_clients
	ADD CONSTRAINT fk_m2m_clients_endpoint
	FOREIGN KEY (legal_entity_endpoint_id)
	REFERENCES public.legal_entity_endpoint (legal_entity_endpoint_id)
	ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.m2m_clients
	ADD CONSTRAINT fk_m2m_legal_entity
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.m2m_clients
	ADD CONSTRAINT fk_m2m_modified_by
	FOREIGN KEY (modified_by)
	REFERENCES public.party_reference (party_id);

ALTER TABLE IF EXISTS public.members
	ADD CONSTRAINT members_legal_entity_id_fkey
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id)
	ON DELETE RESTRICT
	ON UPDATE CASCADE;

ALTER TABLE IF EXISTS public.oauth_clients
	ADD CONSTRAINT oauth_clients_member_id_fkey
	FOREIGN KEY (member_id)
	REFERENCES public.members (id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.vetting_records
	ADD CONSTRAINT vetting_records_member_id_fkey
	FOREIGN KEY (member_id)
	REFERENCES public.members (id)
	ON DELETE CASCADE;

