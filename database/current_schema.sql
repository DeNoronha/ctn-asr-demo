-- Database export via SQLPro (https://www.sqlprostudio.com/)
-- Exported by ramondenoronha at 20-10-2025 07:35.
-- WARNING: This file may contain descructive statements such as DROPs.
-- Please ensure that you are running the script at the proper location.
-- ============================================
-- CTN Association Register Database Schema
-- Database: asr_dev (psql-ctn-demo-asr-dev)
-- Extracted: 2025-10-20
-- Tool: SQLPro Studio
-- ============================================



-- BEGIN TABLE public.admin_tasks
DROP TABLE IF EXISTS public.admin_tasks CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_tasks (
	task_id uuid DEFAULT gen_random_uuid() NOT NULL,
	task_type character varying(50) NOT NULL,
	title character varying(255) NOT NULL,
	description text NOT NULL,
	priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
	status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
	assigned_to uuid,
	assigned_to_email character varying(255),
	assigned_at timestamp with time zone,
	related_entity_id uuid,
	related_subscription_id uuid,
	related_newsletter_id uuid,
	due_date timestamp with time zone,
	completed_at timestamp with time zone,
	completed_by character varying(100),
	resolution text,
	resolution_notes text,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL,
	created_by character varying(100),
	tags text[],
	metadata jsonb DEFAULT '{}'::jsonb,
	PRIMARY KEY(task_id)
);

COMMIT;

-- END TABLE public.admin_tasks

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
	PRIMARY KEY(audit_log_id)
);

COMMIT;

-- END TABLE public.audit_log

-- BEGIN TABLE public.audit_logs
DROP TABLE IF EXISTS public.audit_logs CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_logs (
	id bigint DEFAULT nextval('audit_logs_id_seq'::regclass) NOT NULL,
	event_time timestamp with time zone DEFAULT now(),
	event_type character varying(50) NOT NULL,
	actor_org_id character varying(100),
	resource_type character varying(50),
	resource_id character varying(255),
	"action" character varying(50),
	result character varying(20),
	metadata jsonb,
	PRIMARY KEY(id)
);

COMMIT;

-- END TABLE public.audit_logs

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

-- BEGIN TABLE public.invoices
DROP TABLE IF EXISTS public.invoices CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.invoices (
	invoice_id uuid DEFAULT gen_random_uuid() NOT NULL,
	subscription_id uuid NOT NULL,
	legal_entity_id uuid NOT NULL,
	invoice_number character varying(50) NOT NULL,
	amount numeric(10,2) NOT NULL,
	tax_amount numeric(10,2) DEFAULT 0,
	total_amount numeric(10,2) NOT NULL,
	currency character varying(3) DEFAULT 'EUR'::character varying,
	status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
	issue_date date DEFAULT CURRENT_DATE NOT NULL,
	due_date date NOT NULL,
	paid_at timestamp with time zone,
	payment_method character varying(50),
	payment_reference character varying(100),
	pdf_url text,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL,
	notes text,
	line_items jsonb DEFAULT '[]'::jsonb,
	PRIMARY KEY(invoice_id)
);

COMMIT;

-- END TABLE public.invoices

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
	PRIMARY KEY(legal_entity_id)
);

COMMIT;

-- END TABLE public.legal_entity

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
	PRIMARY KEY(legal_entity_reference_id)
);

COMMIT;

-- END TABLE public.legal_entity_number

-- BEGIN TABLE public.members
DROP TABLE IF EXISTS public.members CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.members (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	org_id character varying(100) NOT NULL,
	legal_name character varying(255) NOT NULL,
	lei character varying(20),
	kvk character varying(20),
	"domain" character varying(255) NOT NULL,
	status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
	membership_level character varying(20) DEFAULT 'BASIC'::character varying,
	created_at timestamp with time zone DEFAULT now(),
	updated_at timestamp with time zone DEFAULT now(),
	metadata jsonb,
	legal_entity_id uuid,
	azure_ad_object_id uuid,
	email character varying(255),
	PRIMARY KEY(id)
);

COMMIT;

-- END TABLE public.members

-- BEGIN TABLE public.newsletter_recipients
DROP TABLE IF EXISTS public.newsletter_recipients CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.newsletter_recipients (
	recipient_id uuid DEFAULT gen_random_uuid() NOT NULL,
	newsletter_id uuid NOT NULL,
	legal_entity_id uuid NOT NULL,
	email_address character varying(255) NOT NULL,
	company_name character varying(255),
	status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
	sent_at timestamp with time zone,
	delivered_at timestamp with time zone,
	opened_at timestamp with time zone,
	clicked_at timestamp with time zone,
	bounced_at timestamp with time zone,
	open_count integer DEFAULT 0,
	click_count integer DEFAULT 0,
	last_opened_at timestamp with time zone,
	last_clicked_at timestamp with time zone,
	error_message text,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY(recipient_id)
);

COMMIT;

-- END TABLE public.newsletter_recipients

-- BEGIN TABLE public.newsletters
DROP TABLE IF EXISTS public.newsletters CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.newsletters (
	newsletter_id uuid DEFAULT gen_random_uuid() NOT NULL,
	title character varying(255) NOT NULL,
	subject_line character varying(255) NOT NULL,
	preview_text character varying(150),
	"content" text NOT NULL,
	html_content text NOT NULL,
	recipient_filter character varying(50) DEFAULT 'all'::character varying NOT NULL,
	membership_levels text[],
	entity_statuses text[],
	custom_recipient_ids uuid[],
	status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
	scheduled_at timestamp with time zone,
	sent_at timestamp with time zone,
	recipient_count integer DEFAULT 0,
	delivered_count integer DEFAULT 0,
	open_count integer DEFAULT 0,
	click_count integer DEFAULT 0,
	bounce_count integer DEFAULT 0,
	unsubscribe_count integer DEFAULT 0,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL,
	created_by character varying(100),
	updated_by character varying(100),
	tags text[],
	metadata jsonb DEFAULT '{}'::jsonb,
	PRIMARY KEY(newsletter_id)
);

COMMIT;

-- END TABLE public.newsletters

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

-- BEGIN TABLE public.subscription_history
DROP TABLE IF EXISTS public.subscription_history CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.subscription_history (
	history_id uuid DEFAULT gen_random_uuid() NOT NULL,
	subscription_id uuid NOT NULL,
	event_type character varying(50) NOT NULL,
	old_values jsonb,
	new_values jsonb,
	changed_by character varying(100),
	change_reason text,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY(history_id)
);

COMMIT;

-- END TABLE public.subscription_history

-- BEGIN TABLE public.subscriptions
DROP TABLE IF EXISTS public.subscriptions CASCADE;
BEGIN;

CREATE TABLE IF NOT EXISTS public.subscriptions (
	subscription_id uuid DEFAULT gen_random_uuid() NOT NULL,
	legal_entity_id uuid NOT NULL,
	plan_name character varying(100) NOT NULL,
	plan_description text,
	price numeric(10,2) NOT NULL,
	currency character varying(3) DEFAULT 'EUR'::character varying,
	billing_cycle character varying(20) NOT NULL,
	status character varying(20) DEFAULT 'active'::character varying NOT NULL,
	start_date timestamp with time zone DEFAULT now() NOT NULL,
	end_date timestamp with time zone,
	trial_end_date timestamp with time zone,
	cancelled_at timestamp with time zone,
	auto_renew boolean DEFAULT true,
	next_billing_date timestamp with time zone,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL,
	created_by character varying(100),
	updated_by character varying(100),
	notes text,
	metadata jsonb DEFAULT '{}'::jsonb,
	PRIMARY KEY(subscription_id)
);

COMMIT;

-- END TABLE public.subscriptions

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

DROP VIEW public.active_subscriptions_view;

CREATE OR REPLACE VIEW public.active_subscriptions_view AS
 SELECT s.subscription_id,
    s.legal_entity_id,
    le.primary_legal_name AS legal_name,
    le.party_id,
    s.plan_name,
    s.price,
    s.currency,
    s.billing_cycle,
    s.status,
    s.start_date,
    s.next_billing_date,
    s.auto_renew,
        CASE
            WHEN (s.next_billing_date < (now() + '7 days'::interval)) THEN true
            ELSE false
        END AS renewal_upcoming,
        CASE
            WHEN (s.next_billing_date < now()) THEN true
            ELSE false
        END AS renewal_overdue
   FROM (subscriptions s
     JOIN legal_entity le ON ((s.legal_entity_id = le.legal_entity_id)))
  WHERE ((s.status)::text = 'active'::text);

DROP VIEW public.admin_tasks_dashboard_view;

CREATE OR REPLACE VIEW public.admin_tasks_dashboard_view AS
 SELECT t.task_id,
    t.task_type,
    t.title,
    t.priority,
    t.status,
    t.assigned_to,
    t.assigned_to_email,
    t.due_date,
    t.created_at,
        CASE
            WHEN ((t.due_date < now()) AND ((t.status)::text <> ALL ((ARRAY['completed'::character varying, 'cancelled'::character varying])::text[]))) THEN true
            ELSE false
        END AS is_overdue,
        CASE
            WHEN ((t.due_date < (now() + '24:00:00'::interval)) AND (t.due_date > now()) AND ((t.status)::text <> ALL ((ARRAY['completed'::character varying, 'cancelled'::character varying])::text[]))) THEN true
            ELSE false
        END AS is_due_soon,
    le.primary_legal_name AS related_entity_name,
    le.party_id AS related_entity_party_id
   FROM (admin_tasks t
     LEFT JOIN legal_entity le ON ((t.related_entity_id = le.legal_entity_id)));

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
 SELECT (le.legal_entity_id)::text AS org_id,
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

DROP VIEW public.newsletter_performance_view;

CREATE OR REPLACE VIEW public.newsletter_performance_view AS
 SELECT n.newsletter_id,
    n.title,
    n.status,
    n.sent_at,
    n.recipient_count,
    n.delivered_count,
    n.open_count,
    n.click_count,
    n.bounce_count,
        CASE
            WHEN (n.recipient_count > 0) THEN round((((n.delivered_count)::numeric / (n.recipient_count)::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS delivery_rate,
        CASE
            WHEN (n.delivered_count > 0) THEN round((((n.open_count)::numeric / (n.delivered_count)::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS open_rate,
        CASE
            WHEN (n.open_count > 0) THEN round((((n.click_count)::numeric / (n.open_count)::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS click_through_rate
   FROM newsletters n
  WHERE ((n.status)::text = 'sent'::text);

ALTER TABLE IF EXISTS public.admin_tasks
	ADD CONSTRAINT admin_tasks_related_subscription_id_fkey
	FOREIGN KEY (related_subscription_id)
	REFERENCES public.subscriptions (subscription_id)
	ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.admin_tasks
	ADD CONSTRAINT admin_tasks_related_newsletter_id_fkey
	FOREIGN KEY (related_newsletter_id)
	REFERENCES public.newsletters (newsletter_id)
	ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.admin_tasks
	ADD CONSTRAINT admin_tasks_related_entity_id_fkey
	FOREIGN KEY (related_entity_id)
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

ALTER TABLE IF EXISTS public.endpoint_authorization
	ADD CONSTRAINT fk_endpoint_authorization
	FOREIGN KEY (legal_entity_endpoint_id)
	REFERENCES public.legal_entity_endpoint (legal_entity_endpoint_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.invoices
	ADD CONSTRAINT invoices_subscription_id_fkey
	FOREIGN KEY (subscription_id)
	REFERENCES public.subscriptions (subscription_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.invoices
	ADD CONSTRAINT invoices_legal_entity_id_fkey
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.issued_tokens
	ADD CONSTRAINT issued_tokens_member_id_fkey
	FOREIGN KEY (member_id)
	REFERENCES public.members (id)
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

ALTER TABLE IF EXISTS public.members
	ADD CONSTRAINT members_legal_entity_id_fkey
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id);

ALTER TABLE IF EXISTS public.newsletter_recipients
	ADD CONSTRAINT newsletter_recipients_newsletter_id_fkey
	FOREIGN KEY (newsletter_id)
	REFERENCES public.newsletters (newsletter_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.newsletter_recipients
	ADD CONSTRAINT newsletter_recipients_legal_entity_id_fkey
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.oauth_clients
	ADD CONSTRAINT oauth_clients_member_id_fkey
	FOREIGN KEY (member_id)
	REFERENCES public.members (id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.subscription_history
	ADD CONSTRAINT subscription_history_subscription_id_fkey
	FOREIGN KEY (subscription_id)
	REFERENCES public.subscriptions (subscription_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.subscriptions
	ADD CONSTRAINT subscriptions_legal_entity_id_fkey
	FOREIGN KEY (legal_entity_id)
	REFERENCES public.legal_entity (legal_entity_id)
	ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.vetting_records
	ADD CONSTRAINT vetting_records_member_id_fkey
	FOREIGN KEY (member_id)
	REFERENCES public.members (id)
	ON DELETE CASCADE;


-- ============================================
-- INDEXES
-- Extracted from database: 2025-10-20
-- Total: 110 indexes (excludes primary keys)
-- ============================================

CREATE INDEX idx_admin_tasks_assigned ON public.admin_tasks USING btree (assigned_to, status) WHERE (assigned_to IS NOT NULL);
CREATE INDEX idx_admin_tasks_due ON public.admin_tasks USING btree (due_date) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying])::text[]));
CREATE INDEX idx_admin_tasks_entity ON public.admin_tasks USING btree (related_entity_id) WHERE (related_entity_id IS NOT NULL);
CREATE INDEX idx_admin_tasks_status ON public.admin_tasks USING btree (status, priority, due_date);
CREATE INDEX idx_admin_tasks_type ON public.admin_tasks USING btree (task_type, status);
CREATE INDEX idx_audit_log_dt_created ON public.audit_log USING btree (dt_created DESC);
CREATE INDEX idx_audit_log_event_type ON public.audit_log USING btree (event_type);
CREATE INDEX idx_audit_log_failures ON public.audit_log USING btree (result, severity, dt_created DESC) WHERE ((result)::text = 'failure'::text);
CREATE INDEX idx_audit_log_resource ON public.audit_log USING btree (resource_type, resource_id);
CREATE INDEX idx_audit_log_result ON public.audit_log USING btree (result);
CREATE INDEX idx_audit_log_severity ON public.audit_log USING btree (severity);
CREATE INDEX idx_audit_log_user_activity ON public.audit_log USING btree (user_id, dt_created DESC);
CREATE INDEX idx_audit_log_user_email ON public.audit_log USING btree (user_email);
CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (user_id);
CREATE INDEX idx_audit_actor ON public.audit_logs USING btree (actor_org_id);
CREATE INDEX idx_audit_time ON public.audit_logs USING btree (event_time DESC);
CREATE INDEX idx_audit_type ON public.audit_logs USING btree (event_type);
CREATE UNIQUE INDEX bdi_external_systems_keycloak_client_id_key ON public.bdi_external_systems USING btree (keycloak_client_id);
CREATE UNIQUE INDEX bdi_external_systems_system_domain_key ON public.bdi_external_systems USING btree (system_domain);
CREATE INDEX idx_bdi_systems_active ON public.bdi_external_systems USING btree (is_active, is_approved) WHERE (is_deleted = false);
CREATE INDEX idx_bdi_systems_client ON public.bdi_external_systems USING btree (keycloak_client_id);
CREATE INDEX idx_bdi_systems_domain ON public.bdi_external_systems USING btree (system_domain);
CREATE INDEX idx_participants_domain ON public.bdi_orchestration_participants USING btree (participant_domain);
CREATE INDEX idx_participants_entity ON public.bdi_orchestration_participants USING btree (legal_entity_id);
CREATE INDEX idx_participants_orchestration ON public.bdi_orchestration_participants USING btree (orchestration_id);
CREATE INDEX idx_participants_role ON public.bdi_orchestration_participants USING btree (participant_role);
CREATE INDEX idx_participants_status ON public.bdi_orchestration_participants USING btree (participant_status) WHERE (is_deleted = false);
CREATE UNIQUE INDEX uq_orchestration_participant ON public.bdi_orchestration_participants USING btree (orchestration_id, participant_domain, participant_role);
CREATE INDEX idx_orchestrations_business_keys ON public.bdi_orchestrations USING gin (business_keys);
CREATE INDEX idx_orchestrations_created ON public.bdi_orchestrations USING btree (dt_created DESC);
CREATE INDEX idx_orchestrations_customer ON public.bdi_orchestrations USING btree (customer_domain);
CREATE INDEX idx_orchestrations_orchestrator ON public.bdi_orchestrations USING btree (orchestrator_domain);
CREATE INDEX idx_orchestrations_order_ref ON public.bdi_orchestrations USING btree (internal_order_identifier);
CREATE INDEX idx_orchestrations_status ON public.bdi_orchestrations USING btree (status) WHERE (is_deleted = false);
CREATE UNIQUE INDEX bvad_issued_tokens_jti_key ON public.bvad_issued_tokens USING btree (jti);
CREATE INDEX idx_bvad_tokens_entity ON public.bvad_issued_tokens USING btree (legal_entity_id);
CREATE INDEX idx_bvad_tokens_expires ON public.bvad_issued_tokens USING btree (expires_at);
CREATE INDEX idx_bvad_tokens_issued ON public.bvad_issued_tokens USING btree (issued_at DESC);
CREATE INDEX idx_bvad_tokens_jti ON public.bvad_issued_tokens USING btree (jti);
CREATE INDEX idx_bvad_tokens_subject ON public.bvad_issued_tokens USING btree (subject);
CREATE INDEX idx_bvod_validation_jti ON public.bvod_validation_log USING btree (bvod_jti);
CREATE INDEX idx_bvod_validation_member ON public.bvod_validation_log USING btree (member_domain_checked);
CREATE INDEX idx_bvod_validation_orchestration ON public.bvod_validation_log USING btree (orchestration_id);
CREATE INDEX idx_bvod_validation_requested ON public.bvod_validation_log USING btree (requested_at DESC);
CREATE INDEX idx_bvod_validation_requestor ON public.bvod_validation_log USING btree (requested_by);
CREATE INDEX idx_bvod_validation_result ON public.bvod_validation_log USING btree (validation_result);
CREATE UNIQUE INDEX company_registries_registry_code_key ON public.company_registries USING btree (registry_code);
CREATE INDEX idx_registries_active ON public.company_registries USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_registries_country ON public.company_registries USING btree (country_code);
CREATE INDEX idx_registries_type ON public.company_registries USING btree (registry_type);
CREATE INDEX idx_endpoint_authorization_active ON public.endpoint_authorization USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_endpoint_authorization_deleted ON public.endpoint_authorization USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_endpoint_authorization_endpoint ON public.endpoint_authorization USING btree (legal_entity_endpoint_id);
CREATE INDEX idx_endpoint_authorization_expires ON public.endpoint_authorization USING btree (expires_at);
CREATE INDEX idx_invoices_entity ON public.invoices USING btree (legal_entity_id);
CREATE INDEX idx_invoices_number ON public.invoices USING btree (invoice_number);
CREATE INDEX idx_invoices_status ON public.invoices USING btree (status, due_date);
CREATE INDEX idx_invoices_subscription ON public.invoices USING btree (subscription_id);
CREATE UNIQUE INDEX invoices_invoice_number_key ON public.invoices USING btree (invoice_number);
CREATE INDEX idx_tokens_expiry ON public.issued_tokens USING btree (expires_at);
CREATE INDEX idx_tokens_member ON public.issued_tokens USING btree (member_id);
CREATE INDEX idx_tokens_type ON public.issued_tokens USING btree (token_type);
CREATE INDEX idx_legal_entity_created ON public.legal_entity USING btree (dt_created);
CREATE INDEX idx_legal_entity_deleted ON public.legal_entity USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_legal_entity_kvk_verification ON public.legal_entity USING btree (kvk_verification_status, kvk_verified_at);
CREATE INDEX idx_legal_entity_name ON public.legal_entity USING btree (primary_legal_name);
CREATE INDEX idx_legal_entity_party ON public.legal_entity USING btree (party_id);
CREATE INDEX idx_legal_entity_status ON public.legal_entity USING btree (status);
CREATE INDEX idx_legal_entity_contact_active ON public.legal_entity_contact USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_legal_entity_contact_deleted ON public.legal_entity_contact USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_legal_entity_contact_email ON public.legal_entity_contact USING btree (email);
CREATE INDEX idx_legal_entity_contact_entity ON public.legal_entity_contact USING btree (legal_entity_id);
CREATE INDEX idx_legal_entity_contact_primary ON public.legal_entity_contact USING btree (is_primary) WHERE (is_primary = true);
CREATE INDEX idx_legal_entity_contact_type ON public.legal_entity_contact USING btree (contact_type);
CREATE INDEX idx_legal_entity_endpoint_active ON public.legal_entity_endpoint USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_legal_entity_endpoint_category ON public.legal_entity_endpoint USING btree (data_category);
CREATE INDEX idx_legal_entity_endpoint_deleted ON public.legal_entity_endpoint USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_legal_entity_endpoint_entity ON public.legal_entity_endpoint USING btree (legal_entity_id);
CREATE INDEX idx_legal_entity_number_country ON public.legal_entity_number USING btree (country_code) WHERE (country_code IS NOT NULL);
CREATE INDEX idx_legal_entity_number_deleted ON public.legal_entity_number USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_legal_entity_number_entity ON public.legal_entity_number USING btree (legal_entity_id);
CREATE INDEX idx_legal_entity_number_status ON public.legal_entity_number USING btree (validation_status);
CREATE INDEX idx_legal_entity_number_type ON public.legal_entity_number USING btree (identifier_type);
CREATE INDEX idx_legal_entity_number_type_country ON public.legal_entity_number USING btree (identifier_type, country_code) WHERE (country_code IS NOT NULL);
CREATE INDEX idx_legal_entity_number_value ON public.legal_entity_number USING btree (identifier_value);
CREATE UNIQUE INDEX uq_identifier ON public.legal_entity_number USING btree (legal_entity_id, identifier_type, identifier_value);
CREATE INDEX idx_members_azure_ad_oid ON public.members USING btree (azure_ad_object_id) WHERE (azure_ad_object_id IS NOT NULL);
CREATE UNIQUE INDEX idx_members_azure_ad_oid_unique ON public.members USING btree (azure_ad_object_id) WHERE (azure_ad_object_id IS NOT NULL);
CREATE INDEX idx_members_domain ON public.members USING btree (domain);
CREATE INDEX idx_members_email ON public.members USING btree (email) WHERE (email IS NOT NULL);
CREATE INDEX idx_members_lei ON public.members USING btree (lei) WHERE (lei IS NOT NULL);
CREATE INDEX idx_members_org_id ON public.members USING btree (org_id);
CREATE INDEX idx_members_status ON public.members USING btree (status);
CREATE UNIQUE INDEX members_org_id_key ON public.members USING btree (org_id);
CREATE INDEX idx_newsletter_recipients_entity ON public.newsletter_recipients USING btree (legal_entity_id);
CREATE INDEX idx_newsletter_recipients_newsletter ON public.newsletter_recipients USING btree (newsletter_id);
CREATE INDEX idx_newsletter_recipients_status ON public.newsletter_recipients USING btree (newsletter_id, status);
CREATE INDEX idx_newsletters_created ON public.newsletters USING btree (created_at DESC);
CREATE INDEX idx_newsletters_sent ON public.newsletters USING btree (sent_at DESC) WHERE (sent_at IS NOT NULL);
CREATE INDEX idx_newsletters_status ON public.newsletters USING btree (status, scheduled_at);
CREATE INDEX idx_oauth_member ON public.oauth_clients USING btree (member_id);
CREATE INDEX idx_party_reference_created ON public.party_reference USING btree (dt_created);
CREATE INDEX idx_party_reference_deleted ON public.party_reference USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_subscription_history_event ON public.subscription_history USING btree (event_type, created_at DESC);
CREATE INDEX idx_subscription_history_subscription ON public.subscription_history USING btree (subscription_id, created_at DESC);
CREATE INDEX idx_subscriptions_billing ON public.subscriptions USING btree (next_billing_date) WHERE ((status)::text = 'active'::text);
CREATE INDEX idx_subscriptions_entity ON public.subscriptions USING btree (legal_entity_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status, next_billing_date);
CREATE INDEX idx_vetting_member ON public.vetting_records USING btree (member_id);
CREATE INDEX idx_vetting_status ON public.vetting_records USING btree (status);

-- End of schema
