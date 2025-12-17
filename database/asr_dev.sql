--
-- PostgreSQL database dump
--

\restrict jIYk2xwdtamPISDkOs0Kae2ZggDvLqqCbBUi6LdcTcIf2S3Uzc5yZtVt8R19pOF

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'Dropped company_identifiers_with_registry view - redundant with legal_entity_number having inline registry_name/registry_url columns';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: purge_old_audit_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purge_old_audit_logs() RETURNS TABLE(audit_logs_deleted integer, pii_mappings_deleted integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_audit_logs_deleted INTEGER;
  v_pii_mappings_deleted INTEGER;
  v_retention_days INTEGER := 90;
BEGIN
  -- Delete old audit logs
  DELETE FROM audit_log
  WHERE dt_created < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_audit_logs_deleted = ROW_COUNT;

  -- Delete old PII mappings
  DELETE FROM audit_log_pii_mapping
  WHERE dt_created < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_pii_mappings_deleted = ROW_COUNT;

  -- Log the purge operation
  RAISE NOTICE 'Purged % audit logs and % PII mappings older than % days',
    v_audit_logs_deleted, v_pii_mappings_deleted, v_retention_days;

  -- Return counts
  RETURN QUERY SELECT v_audit_logs_deleted, v_pii_mappings_deleted;
END;
$$;


--
-- Name: FUNCTION purge_old_audit_logs(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.purge_old_audit_logs() IS 'Purges audit logs and PII mappings older than 90 days. GDPR Article 5(1)(e) - Storage Limitation. Run daily via scheduled job.';


--
-- Name: update_applications_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_applications_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.dt_updated = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_belgium_registry_modified(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_belgium_registry_modified() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.dt_modified = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_german_registry_modified(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_german_registry_modified() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.dt_modified = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_identifier_verification_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_identifier_verification_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_kvk_registry_modified(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_kvk_registry_modified() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.dt_modified = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_legal_entity_branding_modified(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_legal_entity_branding_modified() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.dt_modified = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_m2m_credentials_modified(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_m2m_credentials_modified() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.dt_modified = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_m2m_credentials_usage(character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_m2m_credentials_usage(p_m2m_client_id character varying, p_request_ip character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE ctn_m2m_credentials
  SET
    last_used_at = NOW(),
    total_requests = total_requests + 1,
    last_request_ip = p_request_ip
  WHERE m2m_client_id = p_m2m_client_id
    AND is_active = true
    AND is_deleted = false;
END;
$$;


--
-- Name: FUNCTION update_m2m_credentials_usage(p_m2m_client_id character varying, p_request_ip character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_m2m_credentials_usage(p_m2m_client_id character varying, p_request_ip character varying) IS 'Update usage statistics when M2M client makes API request (supports all IAM providers)';


--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        BEGIN
            NEW.dt_modified = NOW();
            RETURN NEW;
        END;
        $$;


--
-- Name: update_modified_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_modified_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.dt_modified = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_tasks (
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
    CONSTRAINT valid_priority CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT valid_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT valid_task_type CHECK (((task_type)::text = ANY ((ARRAY['review'::character varying, 'approval'::character varying, 'verification'::character varying, 'general'::character varying])::text[])))
);


--
-- Name: TABLE admin_tasks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_tasks IS 'Administrative and review tasks for CTN staff';


--
-- Name: COLUMN admin_tasks.task_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_tasks.task_type IS 'Type of task: review, approval, verification, general';


--
-- Name: COLUMN admin_tasks.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_tasks.status IS 'Current status: pending, in_progress, completed, cancelled';


--
-- Name: COLUMN admin_tasks.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_tasks.priority IS 'Priority level: low, medium, high, urgent';


--
-- Name: COLUMN admin_tasks.assigned_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_tasks.assigned_by IS 'User ID who assigned the task (nullable - can be assigned later)';


--
-- Name: COLUMN admin_tasks.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_tasks.metadata IS 'Additional task-specific data (JSON)';


--
-- Name: COLUMN admin_tasks.assigned_to_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_tasks.assigned_to_email IS 'Email address of person assigned to task (alternative to assigned_to UUID)';


--
-- Name: COLUMN admin_tasks.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_tasks.created_by IS 'User ID who created the task';


--
-- Name: COLUMN admin_tasks.tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_tasks.tags IS 'Array of tag strings for categorization';


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
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
    CONSTRAINT applications_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'under_review'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    audit_log_id integer NOT NULL,
    event_type character varying(100) NOT NULL,
    severity character varying(20) NOT NULL,
    result character varying(20) NOT NULL,
    user_id character varying(255),
    user_email character varying(255),
    resource_type character varying(100),
    resource_id character varying(255),
    action character varying(100),
    ip_address character varying(45),
    user_agent text,
    request_path text,
    request_method character varying(10),
    details jsonb,
    error_message text,
    dt_created timestamp with time zone DEFAULT now() NOT NULL,
    user_email_pseudonym character varying(64),
    ip_address_pseudonym character varying(64),
    CONSTRAINT audit_log_result_check CHECK (((result)::text = ANY ((ARRAY['success'::character varying, 'failure'::character varying])::text[]))),
    CONSTRAINT audit_log_severity_check CHECK (((severity)::text = ANY ((ARRAY['INFO'::character varying, 'WARNING'::character varying, 'ERROR'::character varying, 'CRITICAL'::character varying])::text[])))
);


--
-- Name: TABLE audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_log IS 'Consolidated audit log table for all system events';


--
-- Name: COLUMN audit_log.event_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.event_type IS 'Type of event (auth_success, member_created, etc.)';


--
-- Name: COLUMN audit_log.severity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.severity IS 'Event severity level (INFO, WARNING, ERROR, CRITICAL)';


--
-- Name: COLUMN audit_log.result; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.result IS 'Operation result (success or failure)';


--
-- Name: COLUMN audit_log.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.user_id IS 'ID of user who performed the action';


--
-- Name: COLUMN audit_log.user_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.user_email IS 'DEPRECATED: Use user_email_pseudonym instead. Will be removed after backfill.';


--
-- Name: COLUMN audit_log.resource_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.resource_type IS 'Type of resource affected (member, endpoint, etc.)';


--
-- Name: COLUMN audit_log.resource_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.resource_id IS 'ID of affected resource';


--
-- Name: COLUMN audit_log.action; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.action IS 'Specific action performed';


--
-- Name: COLUMN audit_log.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.ip_address IS 'DEPRECATED: Use ip_address_pseudonym instead. Will be removed after backfill.';


--
-- Name: COLUMN audit_log.details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.details IS 'Additional JSON details about the event';


--
-- Name: COLUMN audit_log.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.error_message IS 'Error message if result is failure';


--
-- Name: COLUMN audit_log.user_email_pseudonym; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.user_email_pseudonym IS 'Pseudonymized email address using HMAC-SHA256 (GDPR Article 5(1)(c) - Data Minimization)';


--
-- Name: COLUMN audit_log.ip_address_pseudonym; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_log.ip_address_pseudonym IS 'Pseudonymized IP address using HMAC-SHA256 (GDPR Article 5(1)(c) - Data Minimization)';


--
-- Name: audit_log_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_audit_log_id_seq OWNED BY public.audit_log.audit_log_id;


--
-- Name: authorization_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authorization_log (
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
    CONSTRAINT ck_auth_result CHECK (((authorization_result)::text = ANY ((ARRAY['granted'::character varying, 'denied'::character varying])::text[])))
);


--
-- Name: TABLE authorization_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.authorization_log IS 'Audit log for tier-based authorization decisions';


--
-- Name: COLUMN authorization_log.required_tier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authorization_log.required_tier IS 'Minimum tier required to access the resource';


--
-- Name: COLUMN authorization_log.user_tier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authorization_log.user_tier IS 'Actual tier of the user making the request';


--
-- Name: COLUMN authorization_log.denial_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authorization_log.denial_reason IS 'Reason for denial (e.g., "Insufficient tier: requires 2, has 3")';


--
-- Name: belgium_registry_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.belgium_registry_data (
    registry_data_id uuid DEFAULT gen_random_uuid() NOT NULL,
    legal_entity_id uuid NOT NULL,
    kbo_number character varying(20) NOT NULL,
    kbo_number_clean character varying(10) NOT NULL,
    enterprise_type character varying(50),
    enterprise_type_code character varying(10),
    company_name character varying(500) NOT NULL,
    legal_form character varying(200),
    legal_form_full character varying(500),
    company_status character varying(100),
    status_start_date date,
    start_date date,
    end_date date,
    street character varying(255),
    house_number character varying(20),
    bus_number character varying(20),
    postal_code character varying(20),
    city character varying(100),
    country character varying(50) DEFAULT 'Belgium'::character varying,
    full_address text,
    vat_number character varying(20),
    vat_status character varying(100),
    vat_start_date date,
    nace_codes jsonb,
    main_activity character varying(500),
    representatives jsonb,
    establishment_count integer,
    establishments jsonb,
    lei character varying(20),
    data_source character varying(50) DEFAULT 'kbo_public'::character varying,
    source_url text,
    raw_response jsonb,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    last_verified_at timestamp with time zone,
    dt_created timestamp with time zone DEFAULT now(),
    dt_modified timestamp with time zone DEFAULT now(),
    created_by character varying(255),
    modified_by character varying(255),
    is_deleted boolean DEFAULT false
);


--
-- Name: TABLE belgium_registry_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.belgium_registry_data IS 'Stores Belgian KBO (Kruispuntbank van Ondernemingen) company data';


--
-- Name: COLUMN belgium_registry_data.kbo_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.belgium_registry_data.kbo_number IS 'KBO number with dots, e.g., 0439.291.125';


--
-- Name: COLUMN belgium_registry_data.kbo_number_clean; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.belgium_registry_data.kbo_number_clean IS 'KBO number without formatting, 10 digits';


--
-- Name: COLUMN belgium_registry_data.enterprise_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.belgium_registry_data.enterprise_type IS 'Enterprise type: Rechtspersoon (legal entity) or Natuurlijk persoon (natural person)';


--
-- Name: COLUMN belgium_registry_data.bus_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.belgium_registry_data.bus_number IS 'Belgian bus/box number for addresses (unit within building)';


--
-- Name: COLUMN belgium_registry_data.nace_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.belgium_registry_data.nace_codes IS 'NACE activity codes with descriptions';


--
-- Name: ctn_m2m_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctn_m2m_credentials (
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
    CONSTRAINT chk_auth_provider_valid CHECK ((lower((auth_provider)::text) = ANY (ARRAY['keycloak'::text, 'zitadel'::text, 'azure_ad'::text, 'other'::text]))),
    CONSTRAINT chk_m2m_auth_provider CHECK (((auth_provider)::text = ANY ((ARRAY['zitadel'::character varying, 'keycloak'::character varying, 'azure_ad'::character varying, 'okta'::character varying])::text[]))),
    CONSTRAINT chk_m2m_client_id_not_empty CHECK ((length((m2m_client_id)::text) >= 3)),
    CONSTRAINT chk_m2m_scopes_not_empty CHECK ((array_length(assigned_scopes, 1) > 0)),
    CONSTRAINT chk_m2m_service_account_name CHECK ((length((service_account_name)::text) >= 3))
);


--
-- Name: TABLE ctn_m2m_credentials; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ctn_m2m_credentials IS 'M2M authentication credentials mapping service accounts to CTN parties. Supports Zitadel, Keycloak, Azure AD, and Okta.';


--
-- Name: COLUMN ctn_m2m_credentials.m2m_client_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ctn_m2m_credentials.m2m_client_id IS 'M2M client ID - format varies by provider. Zitadel: {user_id}@{project_id}, Keycloak: client_id or username';


--
-- Name: COLUMN ctn_m2m_credentials.m2m_realm_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ctn_m2m_credentials.m2m_realm_id IS 'IAM realm/project ID. Zitadel: project_id, Keycloak: realm name, Azure AD: tenant_id';


--
-- Name: COLUMN ctn_m2m_credentials.m2m_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ctn_m2m_credentials.m2m_user_id IS 'Service account user ID within the IAM provider';


--
-- Name: COLUMN ctn_m2m_credentials.auth_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ctn_m2m_credentials.auth_provider IS 'IAM provider: zitadel, keycloak, azure_ad, okta';


--
-- Name: COLUMN ctn_m2m_credentials.auth_issuer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ctn_m2m_credentials.auth_issuer IS 'IAM issuer URL. Example: https://lemur-8.cloud-iam.com/auth/realms/ctn-test for Keycloak';


--
-- Name: COLUMN ctn_m2m_credentials.assigned_scopes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ctn_m2m_credentials.assigned_scopes IS 'Scopes/roles granted to this M2M client: api.access, members.read, members.write, etc.';


--
-- Name: COLUMN ctn_m2m_credentials.allowed_endpoints; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ctn_m2m_credentials.allowed_endpoints IS 'Optional: Restrict M2M client to specific API endpoints (e.g., /api/v1/members/*)';


--
-- Name: CONSTRAINT chk_auth_provider_valid ON ctn_m2m_credentials; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT chk_auth_provider_valid ON public.ctn_m2m_credentials IS 'Ensures auth_provider is one of: keycloak, zitadel, azure_ad, other (case-insensitive)';


--
-- Name: ctn_m2m_secret_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctn_m2m_secret_audit (
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
    user_agent text
);


--
-- Name: TABLE ctn_m2m_secret_audit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ctn_m2m_secret_audit IS 'Audit log for M2M client secret generation. NEVER stores actual secrets. Works with all IAM providers.';


--
-- Name: dns_verification_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dns_verification_tokens (
    token_id uuid DEFAULT gen_random_uuid() NOT NULL,
    legal_entity_id uuid NOT NULL,
    domain character varying(255) NOT NULL,
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
    CONSTRAINT ck_dns_token_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'expired'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: TABLE dns_verification_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dns_verification_tokens IS 'DNS TXT record verification tokens for Tier 2 authentication';


--
-- Name: COLUMN dns_verification_tokens.token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dns_verification_tokens.token IS 'DNS token to be placed in TXT record (format: ctn-XXXXXXXXXXXXXXXXXXXXXXXXXXXXX)';


--
-- Name: COLUMN dns_verification_tokens.record_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dns_verification_tokens.record_name IS 'Full DNS record name (format: _ctn-verify.domain.com)';


--
-- Name: COLUMN dns_verification_tokens.verification_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dns_verification_tokens.verification_details IS 'JSON details from DNS lookup (resolvers, responses, timestamps)';


--
-- Name: entity_legal_form_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_legal_form_translations (
    id integer NOT NULL,
    elf_code character varying(4) NOT NULL,
    language_code character varying(2) NOT NULL,
    language_name character varying(50) NOT NULL,
    local_name character varying(500) NOT NULL,
    transliterated_name character varying(500),
    abbreviation_local character varying(100),
    abbreviation_transliterated character varying(100),
    dt_created timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE entity_legal_form_translations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.entity_legal_form_translations IS 'Multilingual translations for Entity Legal Forms';


--
-- Name: entity_legal_form_translations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_legal_form_translations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_legal_form_translations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_legal_form_translations_id_seq OWNED BY public.entity_legal_form_translations.id;


--
-- Name: entity_legal_forms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_legal_forms (
    elf_code character varying(4) NOT NULL,
    country_code character varying(2) NOT NULL,
    country_name character varying(100) NOT NULL,
    jurisdiction character varying(100),
    jurisdiction_code character varying(10),
    date_created date NOT NULL,
    elf_status character varying(10) DEFAULT 'ACTV'::character varying NOT NULL,
    modification character varying(50),
    modification_date date,
    modification_reason text,
    is_active boolean DEFAULT true NOT NULL,
    dt_created timestamp with time zone DEFAULT now() NOT NULL,
    dt_modified timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE entity_legal_forms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.entity_legal_forms IS 'ISO 20275 Entity Legal Forms (ELF) Code List - legal entity types from GLEIF';


--
-- Name: COLUMN entity_legal_forms.elf_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.entity_legal_forms.elf_code IS 'Unique 4-character alphanumeric ISO 20275 code';


--
-- Name: COLUMN entity_legal_forms.elf_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.entity_legal_forms.elf_status IS 'ACTV = Active, INAC = Inactive (legacy forms)';


--
-- Name: german_court_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.german_court_codes (
    court_code_id integer NOT NULL,
    court_name character varying(100) NOT NULL,
    court_code character varying(20) NOT NULL,
    state character varying(50),
    is_active boolean DEFAULT true,
    dt_created timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE german_court_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.german_court_codes IS 'Lookup table for German court codes used in EUID generation';


--
-- Name: german_court_codes_court_code_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.german_court_codes_court_code_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: german_court_codes_court_code_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.german_court_codes_court_code_id_seq OWNED BY public.german_court_codes.court_code_id;


--
-- Name: german_registry_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.german_registry_data (
    registry_data_id uuid DEFAULT gen_random_uuid() NOT NULL,
    legal_entity_id uuid NOT NULL,
    register_number character varying(50) NOT NULL,
    register_type character varying(10) NOT NULL,
    register_court character varying(100),
    register_court_code character varying(20),
    euid character varying(100),
    company_name character varying(500) NOT NULL,
    legal_form character varying(200),
    legal_form_long character varying(500),
    company_status character varying(100),
    registration_date date,
    dissolution_date date,
    street character varying(255),
    house_number character varying(20),
    postal_code character varying(20),
    city character varying(100),
    country character varying(50) DEFAULT 'Germany'::character varying,
    full_address text,
    business_purpose text,
    share_capital character varying(100),
    share_capital_currency character varying(10) DEFAULT 'EUR'::character varying,
    representatives jsonb,
    shareholders jsonb,
    is_main_establishment boolean DEFAULT true,
    branch_count integer,
    vat_number character varying(50),
    lei character varying(20),
    data_source character varying(50) DEFAULT 'handelsregister'::character varying,
    source_url text,
    raw_response jsonb,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    last_verified_at timestamp with time zone,
    dt_created timestamp with time zone DEFAULT now(),
    dt_modified timestamp with time zone DEFAULT now(),
    created_by character varying(255),
    modified_by character varying(255),
    is_deleted boolean DEFAULT false
);


--
-- Name: TABLE german_registry_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.german_registry_data IS 'Stores German Handelsregister (commercial register) data fetched from various sources';


--
-- Name: COLUMN german_registry_data.register_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.german_registry_data.register_number IS 'Full register number including type, e.g., HRB 116737';


--
-- Name: COLUMN german_registry_data.register_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.german_registry_data.register_type IS 'Register type: HRA (Einzelkaufleute/Personengesellschaften), HRB (Kapitalgesellschaften), GnR (Genossenschaften), PR (Partnerschaftsregister), VR (Vereinsregister)';


--
-- Name: COLUMN german_registry_data.register_court_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.german_registry_data.register_court_code IS 'Court code used in EUID format, e.g., K1101R for Hamburg';


--
-- Name: COLUMN german_registry_data.euid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.german_registry_data.euid IS 'European Unique Identifier in format DE{CourtCode}.{RegisterType}{Number}';


--
-- Name: gleif_registration_authorities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gleif_registration_authorities (
    ra_code character varying(20) NOT NULL,
    country_code character varying(2) NOT NULL,
    country_name character varying(100) NOT NULL,
    jurisdiction character varying(100),
    register_name_intl character varying(255) NOT NULL,
    register_name_local character varying(255),
    org_name_intl character varying(255),
    org_name_local character varying(255),
    website character varying(500),
    comments text,
    is_primary boolean DEFAULT false,
    is_active boolean DEFAULT true NOT NULL,
    dt_created timestamp with time zone DEFAULT now() NOT NULL,
    dt_modified timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE gleif_registration_authorities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gleif_registration_authorities IS 'GLEIF Registration Authorities List - official business register codes from GLEIF';


--
-- Name: COLUMN gleif_registration_authorities.ra_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gleif_registration_authorities.ra_code IS 'Unique GLEIF Registration Authority code (e.g., RA000463)';


--
-- Name: COLUMN gleif_registration_authorities.country_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gleif_registration_authorities.country_code IS 'ISO 3166-1 alpha-2 country code';


--
-- Name: COLUMN gleif_registration_authorities.is_primary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gleif_registration_authorities.is_primary IS 'Whether this is the primary commercial register for the country';


--
-- Name: gleif_registry_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gleif_registry_data (
    registry_data_id uuid DEFAULT gen_random_uuid() NOT NULL,
    legal_entity_id uuid NOT NULL,
    lei character varying(20) NOT NULL,
    legal_name character varying(500),
    legal_name_language character varying(10),
    jurisdiction character varying(2),
    registered_as character varying(100),
    registration_authority_id character varying(50),
    legal_address jsonb,
    headquarters_address jsonb,
    legal_form_id character varying(10),
    entity_status character varying(50),
    entity_category character varying(50),
    entity_creation_date timestamp without time zone,
    initial_registration_date timestamp without time zone,
    last_update_date timestamp without time zone,
    next_renewal_date timestamp without time zone,
    registration_status character varying(50),
    managing_lou character varying(20),
    corroboration_level character varying(50),
    conformity_flag character varying(50),
    raw_api_response jsonb,
    fetched_at timestamp without time zone DEFAULT now(),
    last_verified_at timestamp without time zone DEFAULT now(),
    data_source character varying(50) DEFAULT 'gleif_api'::character varying,
    created_by character varying(100) DEFAULT 'system'::character varying,
    dt_created timestamp without time zone DEFAULT now(),
    dt_modified timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE gleif_registry_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gleif_registry_data IS 'Historical storage of GLEIF API responses for LEI (Legal Entity Identifier) lookups. Each verification creates a new row to maintain history.';


--
-- Name: COLUMN gleif_registry_data.lei; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gleif_registry_data.lei IS 'Legal Entity Identifier (20 alphanumeric characters)';


--
-- Name: COLUMN gleif_registry_data.registered_as; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gleif_registry_data.registered_as IS 'National registration number (e.g., KvK number 80749100)';


--
-- Name: COLUMN gleif_registry_data.raw_api_response; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gleif_registry_data.raw_api_response IS 'Complete JSON response from GLEIF API for audit/debugging';


--
-- Name: COLUMN gleif_registry_data.fetched_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gleif_registry_data.fetched_at IS 'Timestamp when this data was fetched from GLEIF API';


--
-- Name: identifier_verification_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identifier_verification_history (
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
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE identifier_verification_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.identifier_verification_history IS 'Tracks verification history for all identifier types (LEI, EORI, DUNS, etc.)';


--
-- Name: COLUMN identifier_verification_history.verification_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identifier_verification_history.verification_id IS 'Unique verification record ID';


--
-- Name: COLUMN identifier_verification_history.legal_entity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identifier_verification_history.legal_entity_id IS 'Legal entity being verified';


--
-- Name: COLUMN identifier_verification_history.identifier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identifier_verification_history.identifier_id IS 'Identifier being verified (FK to legal_entity_number)';


--
-- Name: COLUMN identifier_verification_history.identifier_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identifier_verification_history.identifier_type IS 'Type of identifier (LEI, EORI, DUNS, KVK, etc.)';


--
-- Name: COLUMN identifier_verification_history.identifier_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identifier_verification_history.identifier_value IS 'The identifier value being verified';


--
-- Name: COLUMN identifier_verification_history.verification_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identifier_verification_history.verification_method IS 'How verification was performed (document_upload, api_verification, manual_review)';


--
-- Name: COLUMN identifier_verification_history.verification_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identifier_verification_history.verification_status IS 'Current status (pending, approved, rejected, requires_review)';


--
-- Name: COLUMN identifier_verification_history.document_blob_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identifier_verification_history.document_blob_url IS 'Azure Blob Storage URL for uploaded verification documents';


--
-- Name: COLUMN identifier_verification_history.extracted_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identifier_verification_history.extracted_data IS 'OCR/AI extracted data from uploaded documents (Document Intelligence)';


--
-- Name: COLUMN identifier_verification_history.verified_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identifier_verification_history.verified_by IS 'Admin user who performed verification';


--
-- Name: COLUMN identifier_verification_history.verified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identifier_verification_history.verified_at IS 'Timestamp of verification approval/rejection';


--
-- Name: COLUMN identifier_verification_history.verification_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identifier_verification_history.verification_notes IS 'Admin notes about verification decision';


--
-- Name: issued_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issued_tokens (
    jti character varying(255) NOT NULL,
    token_type character varying(20) NOT NULL,
    legal_entity_id uuid,
    issued_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    revoked boolean DEFAULT false,
    metadata jsonb
);


--
-- Name: kvk_registry_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kvk_registry_data (
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
    ind_non_mailing character varying(10),
    statutory_name character varying(500),
    material_end_date date,
    vestigingsnummer character varying(12),
    rsin character varying(9),
    ind_hoofdvestiging character varying(10),
    ind_commerciele_vestiging character varying(10),
    fulltime_employees integer,
    parttime_employees integer,
    primary_trade_name character varying(500),
    websites jsonb,
    rechtsvorm character varying(100),
    owner_addresses jsonb,
    owner_websites jsonb,
    geo_data jsonb,
    total_branches integer,
    commercial_branches integer,
    non_commercial_branches integer,
    api_version character varying(20),
    api_warning text
);


--
-- Name: TABLE kvk_registry_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.kvk_registry_data IS 'Stores complete KvK (Dutch Chamber of Commerce) registry data fetched from the KvK API. Designed to be extensible for other country business registries.';


--
-- Name: COLUMN kvk_registry_data.raw_api_response; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.raw_api_response IS 'Complete JSON response from KvK API for audit trail and future data extraction';


--
-- Name: COLUMN kvk_registry_data.data_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.data_source IS 'Source registry system (kvk_api, companies_house, handelsregister, etc.) for future multi-country support';


--
-- Name: COLUMN kvk_registry_data.ind_non_mailing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.ind_non_mailing IS 'Indicates if company wants no unsolicited mail or door-to-door sales (Ja/Nee)';


--
-- Name: COLUMN kvk_registry_data.statutory_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.statutory_name IS 'The statutory name of the company when statutes are registered';


--
-- Name: COLUMN kvk_registry_data.material_end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.material_end_date IS 'End date of company operations (materieleRegistratie.datumEinde)';


--
-- Name: COLUMN kvk_registry_data.vestigingsnummer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.vestigingsnummer IS 'Branch number: unique 12-digit identifier for the establishment';


--
-- Name: COLUMN kvk_registry_data.rsin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.rsin IS 'Rechtspersonen Samenwerkingsverbanden Informatie Nummer - 9 digit legal entity ID';


--
-- Name: COLUMN kvk_registry_data.ind_hoofdvestiging; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.ind_hoofdvestiging IS 'Indicates if this is the main branch (Ja/Nee)';


--
-- Name: COLUMN kvk_registry_data.ind_commerciele_vestiging; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.ind_commerciele_vestiging IS 'Indicates if this is a commercial establishment (Ja/Nee)';


--
-- Name: COLUMN kvk_registry_data.fulltime_employees; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.fulltime_employees IS 'Number of full-time employees (voltijdWerkzamePersonen)';


--
-- Name: COLUMN kvk_registry_data.parttime_employees; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.parttime_employees IS 'Number of part-time employees (deeltijdWerkzamePersonen)';


--
-- Name: COLUMN kvk_registry_data.primary_trade_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.primary_trade_name IS 'Primary trade name (eersteHandelsnaam) - the main name the company trades under';


--
-- Name: COLUMN kvk_registry_data.websites; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.websites IS 'Array of company website URLs from KVK registration';


--
-- Name: COLUMN kvk_registry_data.rechtsvorm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.rechtsvorm IS 'Short legal form code (rechtsvorm) e.g., BV, NV, Stichting';


--
-- Name: COLUMN kvk_registry_data.owner_addresses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.owner_addresses IS 'Owner/legal entity addresses (separate from establishment addresses)';


--
-- Name: COLUMN kvk_registry_data.owner_websites; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.owner_websites IS 'Owner/legal entity website URLs';


--
-- Name: COLUMN kvk_registry_data.geo_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.geo_data IS 'Geographic data including GPS coordinates and BAG identifiers (when geoData=true)';


--
-- Name: COLUMN kvk_registry_data.total_branches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.total_branches IS 'Total number of branches (totaalAantalVestigingen) for this company';


--
-- Name: COLUMN kvk_registry_data.commercial_branches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.commercial_branches IS 'Number of commercial branches (aantalCommercieleVestigingen)';


--
-- Name: COLUMN kvk_registry_data.non_commercial_branches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.non_commercial_branches IS 'Number of non-commercial branches (aantalNietCommercieleVestigingen)';


--
-- Name: COLUMN kvk_registry_data.api_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.api_version IS 'KVK API version used when fetching this data (from api-version header)';


--
-- Name: COLUMN kvk_registry_data.api_warning; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kvk_registry_data.api_warning IS 'API deprecation or other warnings received during fetch';


--
-- Name: legal_entity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_entity (
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
    domain character varying(255),
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
    azure_ad_object_id uuid,
    CONSTRAINT chk_legal_entity_name_not_empty CHECK ((length(TRIM(BOTH FROM primary_legal_name)) >= 2)),
    CONSTRAINT chk_legal_entity_status_valid CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ACTIVE'::character varying, 'SUSPENDED'::character varying, 'INACTIVE'::character varying, 'REJECTED'::character varying])::text[]))),
    CONSTRAINT ck_authentication_method CHECK (((authentication_method)::text = ANY ((ARRAY['eHerkenning'::character varying, 'DNS'::character varying, 'EmailVerification'::character varying])::text[]))),
    CONSTRAINT ck_authentication_tier CHECK ((authentication_tier = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT legal_entity_kvk_verification_status_check CHECK (((kvk_verification_status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'failed'::character varying, 'flagged'::character varying])::text[])))
);


--
-- Name: TABLE legal_entity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.legal_entity IS 'Full legal entity details for organizations. 1:1 relationship with party_reference via party_id (enforced by uq_legal_entity_party_id_active). Source of truth for legal_name, domain, status, membership_level. Updated 2025-11-13 (Migration 028 - members table no longer duplicates these columns).';


--
-- Name: COLUMN legal_entity.party_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.party_id IS 'Foreign key to party_reference. UNIQUE constraint ensures 1:1 relationship (one legal_entity per party).';


--
-- Name: COLUMN legal_entity.primary_legal_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.primary_legal_name IS 'Official legal name of the organization (source of truth)';


--
-- Name: COLUMN legal_entity.domain; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.domain IS 'Organization domain name (e.g., dhl.com). Used for DNS verification and endpoint registration.';


--
-- Name: COLUMN legal_entity.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.status IS 'Organization status. CHECK constraint ensures valid values: PENDING, ACTIVE, SUSPENDED, INACTIVE, REJECTED';


--
-- Name: COLUMN legal_entity.membership_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.membership_level IS 'Membership tier (e.g., BASIC, PREMIUM, ENTERPRISE). Determines feature access and rate limits.';


--
-- Name: COLUMN legal_entity.kvk_document_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.kvk_document_url IS 'Azure Blob Storage URL for uploaded KvK statement PDF';


--
-- Name: COLUMN legal_entity.kvk_verification_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.kvk_verification_status IS 'Verification status: pending, verified, failed, flagged';


--
-- Name: COLUMN legal_entity.kvk_extracted_company_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.kvk_extracted_company_name IS 'Company name extracted from PDF via Azure Document Intelligence';


--
-- Name: COLUMN legal_entity.kvk_extracted_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.kvk_extracted_number IS 'KvK number extracted from PDF via Azure Document Intelligence';


--
-- Name: COLUMN legal_entity.kvk_api_response; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.kvk_api_response IS 'Full response from KvK API basisprofiel endpoint';


--
-- Name: COLUMN legal_entity.kvk_mismatch_flags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.kvk_mismatch_flags IS 'Array of detected issues: company_name_mismatch, kvk_number_mismatch, bankrupt, dissolved';


--
-- Name: COLUMN legal_entity.authentication_tier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.authentication_tier IS 'Authentication tier (1, 2, or 3). Determines required verification level. CHECK constraint enforces valid values.';


--
-- Name: COLUMN legal_entity.authentication_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.authentication_method IS 'Authentication method (eHerkenning, DNS, EmailVerification). CHECK constraint enforces valid values.';


--
-- Name: COLUMN legal_entity.dns_verified_domain; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.dns_verified_domain IS 'Domain verified via DNS TXT record (Tier 2 only)';


--
-- Name: COLUMN legal_entity.dns_reverification_due; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.dns_reverification_due IS 'Date when DNS verification needs to be re-checked (90 days from verification)';


--
-- Name: COLUMN legal_entity.eherkenning_identifier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.eherkenning_identifier IS 'eHerkenning unique identifier';


--
-- Name: COLUMN legal_entity.eherkenning_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.eherkenning_level IS 'eHerkenning assurance level (EH3 or EH4)';


--
-- Name: COLUMN legal_entity.azure_ad_object_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity.azure_ad_object_id IS 'Azure AD B2C object ID for the organization. Used for Azure AD authentication integration.';


--
-- Name: legal_entity_branding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_entity_branding (
    branding_id uuid DEFAULT gen_random_uuid() NOT NULL,
    legal_entity_id uuid NOT NULL,
    logo_url text,
    logo_source character varying(50),
    logo_format character varying(10),
    favicon_url text,
    primary_color character varying(7),
    secondary_color character varying(7),
    accent_color character varying(7),
    background_color character varying(7),
    text_color character varying(7),
    preferred_theme character varying(10) DEFAULT 'light'::character varying,
    extracted_from_domain character varying(255),
    extracted_at timestamp with time zone,
    dt_created timestamp with time zone DEFAULT now(),
    dt_modified timestamp with time zone DEFAULT now(),
    created_by character varying(255),
    modified_by character varying(255),
    is_deleted boolean DEFAULT false
);


--
-- Name: TABLE legal_entity_branding; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.legal_entity_branding IS 'Stores company branding information (logos, colors) for member portal theming';


--
-- Name: COLUMN legal_entity_branding.logo_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_branding.logo_url IS 'URL to company logo, fetched from Logo.dev or other sources';


--
-- Name: COLUMN legal_entity_branding.logo_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_branding.logo_source IS 'Source of the logo: logo_dev, favicon, manual, brandfetch, etc.';


--
-- Name: COLUMN legal_entity_branding.primary_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_branding.primary_color IS 'Primary brand color in hex format (e.g., #0066b3)';


--
-- Name: legal_entity_contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_entity_contact (
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
    CONSTRAINT chk_contact_type CHECK (((contact_type)::text = ANY ((ARRAY['AUTHORIZED_REP'::character varying, 'TECHNICAL'::character varying, 'BILLING'::character varying, 'SUPPORT'::character varying, 'LEGAL'::character varying, 'OTHER'::character varying])::text[])))
);


--
-- Name: COLUMN legal_entity_contact.contact_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_contact.contact_type IS 'Contact type: AUTHORIZED_REP (bestuurder/gevolmachtigde - verified via eHerkenning), TECHNICAL, BILLING, SUPPORT, LEGAL, OTHER';


--
-- Name: legal_entity_endpoint; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_entity_endpoint (
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
    CONSTRAINT chk_endpoint_type_valid CHECK (((endpoint_type)::text = ANY ((ARRAY['REST'::character varying, 'REST_API'::character varying, 'SOAP'::character varying, 'WEBHOOK'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT chk_endpoint_verification_status_valid CHECK (((verification_status)::text = ANY ((ARRAY['PENDING'::character varying, 'SENT'::character varying, 'VERIFIED'::character varying, 'FAILED'::character varying, 'EXPIRED'::character varying])::text[]))),
    CONSTRAINT chk_verification_status CHECK (((verification_status)::text = ANY ((ARRAY['PENDING'::character varying, 'SENT'::character varying, 'VERIFIED'::character varying, 'FAILED'::character varying, 'EXPIRED'::character varying])::text[])))
);


--
-- Name: COLUMN legal_entity_endpoint.verification_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_endpoint.verification_token IS 'One-time verification token sent via email. Expires after 24 hours.';


--
-- Name: COLUMN legal_entity_endpoint.verification_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_endpoint.verification_status IS 'Status: PENDING (created), SENT (email sent), VERIFIED (token validated), FAILED (test failed), EXPIRED (token expired)';


--
-- Name: COLUMN legal_entity_endpoint.verification_sent_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_endpoint.verification_sent_at IS 'Timestamp when verification email was sent to member';


--
-- Name: COLUMN legal_entity_endpoint.verification_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_endpoint.verification_expires_at IS 'Token expiration timestamp (24 hours from sent_at)';


--
-- Name: COLUMN legal_entity_endpoint.test_result_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_endpoint.test_result_data IS 'JSON data returned from test API call during verification';


--
-- Name: CONSTRAINT chk_endpoint_type_valid ON legal_entity_endpoint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT chk_endpoint_type_valid ON public.legal_entity_endpoint IS 'Ensures endpoint_type is one of: REST, REST_API, SOAP, WEBHOOK, OTHER';


--
-- Name: CONSTRAINT chk_endpoint_verification_status_valid ON legal_entity_endpoint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT chk_endpoint_verification_status_valid ON public.legal_entity_endpoint IS 'Ensures verification_status is one of: PENDING, SENT, VERIFIED, FAILED, EXPIRED';


--
-- Name: legal_entity_number; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_entity_number (
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
    CONSTRAINT chk_validation_status_valid CHECK (((validation_status)::text = ANY ((ARRAY['PENDING'::character varying, 'VALIDATED'::character varying, 'VERIFIED'::character varying, 'FAILED'::character varying, 'EXPIRED'::character varying, 'DERIVED'::character varying])::text[])))
);


--
-- Name: TABLE legal_entity_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.legal_entity_number IS 'Legal entity identifiers (KvK, LEI, EURI, DUNS). Multiple identifiers per legal_entity (1:N relationship). Replaces duplicate lei/kvk columns previously in members table.';


--
-- Name: COLUMN legal_entity_number.identifier_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_number.identifier_type IS 'Type of identifier (LEI, KVK, EURI, DUNS, etc.)';


--
-- Name: COLUMN legal_entity_number.identifier_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_number.identifier_value IS 'Actual identifier value (e.g., 724500PMK2A2M1SQQ228 for LEI)';


--
-- Name: COLUMN legal_entity_number.validation_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_number.validation_status IS 'Validation status: PENDING (not yet checked), VALIDATED (format validated), VERIFIED (externally verified), FAILED (verification failed), EXPIRED (verification expired), DERIVED (mathematically derived from another identifier)';


--
-- Name: COLUMN legal_entity_number.registry_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_number.registry_name IS 'Name of the issuing registry/chamber (e.g., "IHK Berlin", "KvK", "Companies House")';


--
-- Name: COLUMN legal_entity_number.registry_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_number.registry_url IS 'URL to the registry for verification purposes';


--
-- Name: COLUMN legal_entity_number.issuing_authority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_number.issuing_authority IS 'Authority that issued the identifier (e.g., Chamber of Commerce, LEI Foundation)';


--
-- Name: COLUMN legal_entity_number.issued_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_number.issued_at IS 'Date when the identifier was issued';


--
-- Name: COLUMN legal_entity_number.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_number.expires_at IS 'Date when the identifier expires (NULL if no expiration)';


--
-- Name: COLUMN legal_entity_number.verification_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_number.verification_status IS 'Verification status: PENDING (awaiting verification), VERIFIED (confirmed valid), FAILED (verification failed), EXPIRED (no longer valid)';


--
-- Name: legal_entity_number_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_entity_number_type (
    type_code character varying(20) NOT NULL,
    type_name character varying(100) NOT NULL,
    description text,
    country_scope character varying(10),
    format_regex character varying(255),
    format_example character varying(100),
    registry_url character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 100,
    dt_created timestamp with time zone DEFAULT now() NOT NULL,
    dt_modified timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) DEFAULT 'system'::character varying,
    modified_by character varying(255),
    gleif_ra_code character varying(20)
);


--
-- Name: TABLE legal_entity_number_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.legal_entity_number_type IS 'Lookup table for legal entity identifier types (KVK, LEI, VAT, etc.)';


--
-- Name: COLUMN legal_entity_number_type.type_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_number_type.type_code IS 'Unique identifier type code (e.g., KVK, LEI, RSIN)';


--
-- Name: COLUMN legal_entity_number_type.country_scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_number_type.country_scope IS 'Geographic scope: 2-letter country code (NL, DE, BE, FR), EU for European Union identifiers, or GLOBAL for worldwide identifiers';


--
-- Name: COLUMN legal_entity_number_type.format_regex; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_number_type.format_regex IS 'Optional regex pattern for format validation';


--
-- Name: COLUMN legal_entity_number_type.gleif_ra_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.legal_entity_number_type.gleif_ra_code IS 'Optional link to the GLEIF Registration Authority for this identifier type';


--
-- Name: m2m_client_secrets_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m2m_client_secrets_audit (
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
    user_agent text
);


--
-- Name: TABLE m2m_client_secrets_audit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.m2m_client_secrets_audit IS 'Audit log for M2M client secret generation and revocation. NEVER stores actual secrets.';


--
-- Name: COLUMN m2m_client_secrets_audit.secret_generated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.m2m_client_secrets_audit.secret_generated_at IS 'Timestamp when secret was generated (not stored). Secret shown only once to user.';


--
-- Name: m2m_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m2m_clients (
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
    CONSTRAINT chk_m2m_client_name_length CHECK ((length((client_name)::text) >= 3)),
    CONSTRAINT chk_m2m_scopes_not_empty CHECK ((array_length(assigned_scopes, 1) > 0))
);


--
-- Name: TABLE m2m_clients; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.m2m_clients IS 'M2M client registrations for API access. Linked to legal entities with scoped permissions.';


--
-- Name: COLUMN m2m_clients.azure_client_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.m2m_clients.azure_client_id IS 'Azure AD application (client) ID for OAuth2 client credentials flow';


--
-- Name: COLUMN m2m_clients.assigned_scopes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.m2m_clients.assigned_scopes IS 'Array of scope strings: ETA.Read, Container.Read, Booking.Read, Booking.Write, Orchestration.Read';


--
-- Name: party_reference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.party_reference (
    party_id uuid DEFAULT gen_random_uuid() NOT NULL,
    dt_created timestamp with time zone DEFAULT now(),
    dt_modified timestamp with time zone DEFAULT now(),
    created_by character varying(100),
    modified_by character varying(100),
    is_deleted boolean DEFAULT false,
    party_class character varying(255),
    party_type character varying(255)
);


--
-- Name: TABLE party_reference; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.party_reference IS 'Abstract party identity. Minimal metadata (party_class, party_type). Extended by legal_entity table (1:1 relationship enforced by uq_legal_entity_party_id_active).';


--
-- Name: COLUMN party_reference.party_class; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.party_reference.party_class IS 'Party classification (e.g., ORGANIZATION, INDIVIDUAL)';


--
-- Name: COLUMN party_reference.party_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.party_reference.party_type IS 'Party type within class (e.g., MEMBER, PARTNER, SUPPLIER)';


--
-- Name: peppol_registry_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.peppol_registry_data (
    registry_data_id uuid DEFAULT gen_random_uuid() NOT NULL,
    legal_entity_id uuid NOT NULL,
    participant_id character varying(255) NOT NULL,
    participant_scheme character varying(100),
    participant_value character varying(100),
    entity_name character varying(500),
    country_code character varying(2),
    registration_date date,
    additional_identifiers jsonb,
    document_types jsonb,
    geo_info character varying(500),
    websites jsonb,
    contacts jsonb,
    additional_info text,
    raw_api_response jsonb,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    last_verified_at timestamp with time zone,
    data_source character varying(50) DEFAULT 'peppol_directory'::character varying,
    dt_created timestamp with time zone DEFAULT now(),
    dt_modified timestamp with time zone DEFAULT now(),
    created_by character varying(255),
    modified_by character varying(255),
    is_deleted boolean DEFAULT false
);


--
-- Name: vies_registry_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vies_registry_data (
    registry_data_id uuid DEFAULT gen_random_uuid() NOT NULL,
    legal_entity_id uuid NOT NULL,
    country_code character varying(2) NOT NULL,
    vat_number character varying(20) NOT NULL,
    full_vat_number character varying(25),
    is_valid boolean NOT NULL,
    user_error character varying(50),
    request_date timestamp with time zone,
    request_identifier character varying(100),
    trader_name character varying(500),
    trader_address text,
    approx_name character varying(500),
    approx_street character varying(500),
    approx_postal_code character varying(20),
    approx_city character varying(100),
    approx_company_type character varying(100),
    match_name integer,
    match_street integer,
    match_postal_code integer,
    match_city integer,
    match_company_type integer,
    raw_api_response jsonb,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    last_verified_at timestamp with time zone,
    data_source character varying(50) DEFAULT 'vies_ec_europa'::character varying,
    dt_created timestamp with time zone DEFAULT now(),
    dt_modified timestamp with time zone DEFAULT now(),
    created_by character varying(255),
    modified_by character varying(255),
    is_deleted boolean DEFAULT false
);


--
-- Name: TABLE vies_registry_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vies_registry_data IS 'Stores VIES (VAT Information Exchange System) validation data from the European Commission. Used for VAT number verification across EU member states.';


--
-- Name: COLUMN vies_registry_data.vat_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vies_registry_data.vat_number IS 'VAT number without country prefix (e.g., 001671248B03 for Netherlands)';


--
-- Name: COLUMN vies_registry_data.full_vat_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vies_registry_data.full_vat_number IS 'Full VAT number with country prefix (e.g., NL001671248B03)';


--
-- Name: COLUMN vies_registry_data.is_valid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vies_registry_data.is_valid IS 'Whether the VAT number is currently valid according to VIES';


--
-- Name: COLUMN vies_registry_data.request_identifier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vies_registry_data.request_identifier IS 'VIES consultation number for audit purposes';


--
-- Name: COLUMN vies_registry_data.trader_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vies_registry_data.trader_name IS 'Official company name as registered in the national VAT database';


--
-- Name: COLUMN vies_registry_data.trader_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vies_registry_data.trader_address IS 'Official company address as registered in the national VAT database';


--
-- Name: COLUMN vies_registry_data.match_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vies_registry_data.match_name IS 'VIES approximate matching: 1=match, 2=no match, 3=not processed';


--
-- Name: vw_audit_log_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_audit_log_summary AS
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
   FROM public.audit_log
  ORDER BY audit_log.dt_created DESC;


--
-- Name: VIEW vw_audit_log_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_audit_log_summary IS 'Audit log summary view with pseudonymized PII. Safe for general admin access without exposing original email/IP addresses.';


--
-- Name: vw_entity_legal_forms; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_entity_legal_forms AS
 SELECT e.elf_code,
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
   FROM (public.entity_legal_forms e
     LEFT JOIN public.entity_legal_form_translations t ON (((e.elf_code)::text = (t.elf_code)::text)))
  WHERE (e.is_active = true)
  ORDER BY e.country_code, e.elf_code, t.language_code;


--
-- Name: VIEW vw_entity_legal_forms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_entity_legal_forms IS 'ISO 20275 Entity Legal Forms with translations for easy lookup';


--
-- Name: vw_gleif_ra_by_country; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_gleif_ra_by_country AS
 SELECT g1.country_code,
    g1.country_name,
    array_agg(g1.ra_code ORDER BY g1.is_primary DESC, g1.ra_code) AS ra_codes,
    ( SELECT g2.ra_code
           FROM public.gleif_registration_authorities g2
          WHERE (((g2.country_code)::text = (g1.country_code)::text) AND (g2.is_primary = true) AND (g2.is_active = true))
         LIMIT 1) AS primary_ra_code
   FROM public.gleif_registration_authorities g1
  WHERE (g1.is_active = true)
  GROUP BY g1.country_code, g1.country_name;


--
-- Name: VIEW vw_gleif_ra_by_country; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_gleif_ra_by_country IS 'GLEIF Registration Authority codes grouped by country';


--
-- Name: vw_identifiers_with_type; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_identifiers_with_type AS
 SELECT len.legal_entity_reference_id,
    len.legal_entity_id,
    len.identifier_type,
    len.identifier_value,
    len.country_code,
    len.validation_status,
    len.validation_date,
    len.registry_name,
    len.registry_url,
    len.is_deleted,
    lent.type_name,
    lent.description AS type_description,
    lent.country_scope,
    lent.format_regex,
    lent.format_example,
    lent.registry_url AS type_registry_url,
    lent.is_active AS type_is_active
   FROM (public.legal_entity_number len
     LEFT JOIN public.legal_entity_number_type lent ON (((len.identifier_type)::text = (lent.type_code)::text)))
  WHERE ((len.is_deleted = false) OR (len.is_deleted IS NULL));


--
-- Name: vw_legal_entities; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_legal_entities AS
SELECT
    NULL::uuid AS legal_entity_id,
    NULL::uuid AS party_id,
    NULL::character varying(255) AS primary_legal_name,
    NULL::character varying(255) AS city,
    NULL::character varying(2) AS country_code,
    NULL::character varying(255) AS domain,
    NULL::character varying(20) AS status,
    NULL::character varying(20) AS membership_level,
    NULL::integer AS authentication_tier,
    NULL::character varying(50) AS authentication_method,
    NULL::timestamp with time zone AS dt_created,
    NULL::timestamp with time zone AS dt_modified,
    NULL::jsonb AS metadata,
    NULL::text AS kvk,
    NULL::text AS lei,
    NULL::text AS euid,
    NULL::text AS eori,
    NULL::text AS duns,
    NULL::text AS vat,
    NULL::text AS peppol,
    NULL::bigint AS contact_count,
    NULL::bigint AS endpoint_count;


--
-- Name: vw_m2m_clients_active; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_m2m_clients_active AS
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
           FROM public.m2m_client_secrets_audit s
          WHERE ((s.m2m_client_id = c.m2m_client_id) AND (s.is_revoked = false))) AS active_secrets_count,
    ( SELECT max(s.secret_generated_at) AS max
           FROM public.m2m_client_secrets_audit s
          WHERE (s.m2m_client_id = c.m2m_client_id)) AS last_secret_generated_at,
    le.primary_legal_name,
    le.domain
   FROM (public.m2m_clients c
     LEFT JOIN public.legal_entity le ON ((c.legal_entity_id = le.legal_entity_id)))
  WHERE ((c.is_deleted = false) AND (c.is_active = true));


--
-- Name: vw_m2m_credentials_active; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_m2m_credentials_active AS
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
           FROM public.ctn_m2m_secret_audit s
          WHERE ((s.credential_id = c.credential_id) AND (s.is_revoked = false))) AS active_secrets_count,
    ( SELECT max(s.secret_generated_at) AS max
           FROM public.ctn_m2m_secret_audit s
          WHERE (s.credential_id = c.credential_id)) AS last_secret_generated_at,
    p.party_type,
    le.primary_legal_name AS party_name
   FROM ((public.ctn_m2m_credentials c
     LEFT JOIN public.party_reference p ON ((c.party_id = p.party_id)))
     LEFT JOIN public.legal_entity le ON (((c.party_id = le.party_id) AND (le.is_deleted = false))))
  WHERE ((c.is_deleted = false) AND (c.is_active = true))
  ORDER BY c.credential_id, le.dt_created DESC;


--
-- Name: VIEW vw_m2m_credentials_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_m2m_credentials_active IS 'Active M2M credentials with party information. Uses DISTINCT ON to prevent duplicates from multiple legal_entity records per party. Updated 2025-11-13 (Migration 027).';


--
-- Name: audit_log audit_log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN audit_log_id SET DEFAULT nextval('public.audit_log_audit_log_id_seq'::regclass);


--
-- Name: entity_legal_form_translations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_legal_form_translations ALTER COLUMN id SET DEFAULT nextval('public.entity_legal_form_translations_id_seq'::regclass);


--
-- Name: german_court_codes court_code_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.german_court_codes ALTER COLUMN court_code_id SET DEFAULT nextval('public.german_court_codes_court_code_id_seq'::regclass);


--
-- Name: admin_tasks admin_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_tasks
    ADD CONSTRAINT admin_tasks_pkey PRIMARY KEY (task_id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (application_id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (audit_log_id);


--
-- Name: authorization_log authorization_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_log
    ADD CONSTRAINT authorization_log_pkey PRIMARY KEY (log_id);


--
-- Name: belgium_registry_data belgium_registry_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.belgium_registry_data
    ADD CONSTRAINT belgium_registry_data_pkey PRIMARY KEY (registry_data_id);


--
-- Name: ctn_m2m_credentials ctn_m2m_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctn_m2m_credentials
    ADD CONSTRAINT ctn_m2m_credentials_pkey PRIMARY KEY (credential_id);


--
-- Name: ctn_m2m_credentials ctn_m2m_credentials_zitadel_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctn_m2m_credentials
    ADD CONSTRAINT ctn_m2m_credentials_zitadel_client_id_key UNIQUE (m2m_client_id);


--
-- Name: ctn_m2m_secret_audit ctn_zitadel_secret_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctn_m2m_secret_audit
    ADD CONSTRAINT ctn_zitadel_secret_audit_pkey PRIMARY KEY (audit_id);


--
-- Name: dns_verification_tokens dns_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_verification_tokens
    ADD CONSTRAINT dns_verification_tokens_pkey PRIMARY KEY (token_id);


--
-- Name: entity_legal_form_translations entity_legal_form_translations_elf_code_language_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_legal_form_translations
    ADD CONSTRAINT entity_legal_form_translations_elf_code_language_code_key UNIQUE (elf_code, language_code);


--
-- Name: entity_legal_form_translations entity_legal_form_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_legal_form_translations
    ADD CONSTRAINT entity_legal_form_translations_pkey PRIMARY KEY (id);


--
-- Name: entity_legal_forms entity_legal_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_legal_forms
    ADD CONSTRAINT entity_legal_forms_pkey PRIMARY KEY (elf_code);


--
-- Name: german_court_codes german_court_codes_court_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.german_court_codes
    ADD CONSTRAINT german_court_codes_court_code_key UNIQUE (court_code);


--
-- Name: german_court_codes german_court_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.german_court_codes
    ADD CONSTRAINT german_court_codes_pkey PRIMARY KEY (court_code_id);


--
-- Name: german_registry_data german_registry_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.german_registry_data
    ADD CONSTRAINT german_registry_data_pkey PRIMARY KEY (registry_data_id);


--
-- Name: gleif_registration_authorities gleif_registration_authorities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gleif_registration_authorities
    ADD CONSTRAINT gleif_registration_authorities_pkey PRIMARY KEY (ra_code);


--
-- Name: gleif_registry_data gleif_registry_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gleif_registry_data
    ADD CONSTRAINT gleif_registry_data_pkey PRIMARY KEY (registry_data_id);


--
-- Name: identifier_verification_history identifier_verification_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identifier_verification_history
    ADD CONSTRAINT identifier_verification_history_pkey PRIMARY KEY (verification_id);


--
-- Name: issued_tokens issued_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issued_tokens
    ADD CONSTRAINT issued_tokens_pkey PRIMARY KEY (jti);


--
-- Name: kvk_registry_data kvk_registry_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kvk_registry_data
    ADD CONSTRAINT kvk_registry_data_pkey PRIMARY KEY (registry_data_id);


--
-- Name: legal_entity_branding legal_entity_branding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity_branding
    ADD CONSTRAINT legal_entity_branding_pkey PRIMARY KEY (branding_id);


--
-- Name: legal_entity_contact legal_entity_contact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity_contact
    ADD CONSTRAINT legal_entity_contact_pkey PRIMARY KEY (legal_entity_contact_id);


--
-- Name: legal_entity_endpoint legal_entity_endpoint_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity_endpoint
    ADD CONSTRAINT legal_entity_endpoint_pkey PRIMARY KEY (legal_entity_endpoint_id);


--
-- Name: legal_entity_number legal_entity_number_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity_number
    ADD CONSTRAINT legal_entity_number_pkey PRIMARY KEY (legal_entity_reference_id);


--
-- Name: legal_entity_number_type legal_entity_number_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity_number_type
    ADD CONSTRAINT legal_entity_number_type_pkey PRIMARY KEY (type_code);


--
-- Name: legal_entity legal_entity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity
    ADD CONSTRAINT legal_entity_pkey PRIMARY KEY (legal_entity_id);


--
-- Name: m2m_client_secrets_audit m2m_client_secrets_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m2m_client_secrets_audit
    ADD CONSTRAINT m2m_client_secrets_audit_pkey PRIMARY KEY (audit_id);


--
-- Name: m2m_clients m2m_clients_azure_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m2m_clients
    ADD CONSTRAINT m2m_clients_azure_client_id_key UNIQUE (azure_client_id);


--
-- Name: m2m_clients m2m_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m2m_clients
    ADD CONSTRAINT m2m_clients_pkey PRIMARY KEY (m2m_client_id);


--
-- Name: party_reference party_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_reference
    ADD CONSTRAINT party_reference_pkey PRIMARY KEY (party_id);


--
-- Name: peppol_registry_data peppol_registry_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.peppol_registry_data
    ADD CONSTRAINT peppol_registry_data_pkey PRIMARY KEY (registry_data_id);


--
-- Name: legal_entity_branding uq_legal_entity_branding_active; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity_branding
    ADD CONSTRAINT uq_legal_entity_branding_active UNIQUE (legal_entity_id);


--
-- Name: vies_registry_data vies_registry_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vies_registry_data
    ADD CONSTRAINT vies_registry_data_pkey PRIMARY KEY (registry_data_id);


--
-- Name: idx_admin_tasks_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_tasks_assigned_to ON public.admin_tasks USING btree (assigned_to);


--
-- Name: idx_admin_tasks_assigned_to_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_tasks_assigned_to_email ON public.admin_tasks USING btree (assigned_to_email);


--
-- Name: idx_admin_tasks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_tasks_created_at ON public.admin_tasks USING btree (created_at);


--
-- Name: idx_admin_tasks_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_tasks_created_by ON public.admin_tasks USING btree (created_by);


--
-- Name: idx_admin_tasks_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_tasks_due_date ON public.admin_tasks USING btree (due_date);


--
-- Name: idx_admin_tasks_related_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_tasks_related_entity ON public.admin_tasks USING btree (related_entity_type, related_entity_id);


--
-- Name: idx_admin_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_tasks_status ON public.admin_tasks USING btree (status);


--
-- Name: idx_applications_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_email ON public.applications USING btree (applicant_email);


--
-- Name: idx_applications_kvk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_kvk ON public.applications USING btree (kvk_number);


--
-- Name: idx_applications_reviewed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_reviewed_by ON public.applications USING btree (reviewed_by) WHERE (reviewed_by IS NOT NULL);


--
-- Name: idx_applications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_status ON public.applications USING btree (status);


--
-- Name: idx_applications_status_submitted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_status_submitted ON public.applications USING btree (status, submitted_at DESC);


--
-- Name: idx_applications_submitted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_submitted_at ON public.applications USING btree (submitted_at DESC);


--
-- Name: idx_audit_log_dt_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_dt_created ON public.audit_log USING btree (dt_created DESC);


--
-- Name: idx_audit_log_email_pseudonym; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_email_pseudonym ON public.audit_log USING btree (user_email_pseudonym) WHERE (user_email_pseudonym IS NOT NULL);


--
-- Name: idx_audit_log_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_event_type ON public.audit_log USING btree (event_type);


--
-- Name: idx_audit_log_failures; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_failures ON public.audit_log USING btree (result, severity, dt_created DESC) WHERE ((result)::text = 'failure'::text);


--
-- Name: idx_audit_log_ip_pseudonym; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_ip_pseudonym ON public.audit_log USING btree (ip_address_pseudonym) WHERE (ip_address_pseudonym IS NOT NULL);


--
-- Name: idx_audit_log_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_resource ON public.audit_log USING btree (resource_type, resource_id);


--
-- Name: idx_audit_log_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_result ON public.audit_log USING btree (result);


--
-- Name: idx_audit_log_result_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_result_severity ON public.audit_log USING btree (result, severity, dt_created DESC) WHERE ((result)::text = 'failure'::text);


--
-- Name: INDEX idx_audit_log_result_severity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_audit_log_result_severity IS 'Optimizes audit log queries for failures and severity levels';


--
-- Name: idx_audit_log_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_severity ON public.audit_log USING btree (severity);


--
-- Name: idx_audit_log_user_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_user_activity ON public.audit_log USING btree (user_id, dt_created DESC);


--
-- Name: idx_audit_log_user_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_user_email ON public.audit_log USING btree (user_email);


--
-- Name: idx_audit_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (user_id);


--
-- Name: idx_audit_log_user_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_user_time ON public.audit_log USING btree (user_id, dt_created DESC) WHERE (user_id IS NOT NULL);


--
-- Name: INDEX idx_audit_log_user_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_audit_log_user_time IS 'Optimizes audit log queries filtering by user and time range';


--
-- Name: idx_auth_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_log_created ON public.authorization_log USING btree (created_at DESC);


--
-- Name: idx_auth_log_denied; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_log_denied ON public.authorization_log USING btree (authorization_result, created_at DESC) WHERE ((authorization_result)::text = 'denied'::text);


--
-- Name: idx_auth_log_legal_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_log_legal_entity ON public.authorization_log USING btree (legal_entity_id);


--
-- Name: idx_auth_log_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_log_result ON public.authorization_log USING btree (authorization_result);


--
-- Name: idx_auth_log_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_log_user ON public.authorization_log USING btree (user_identifier, created_at DESC);


--
-- Name: idx_belgium_registry_company_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_belgium_registry_company_name ON public.belgium_registry_data USING btree (company_name) WHERE (is_deleted = false);


--
-- Name: idx_belgium_registry_kbo_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_belgium_registry_kbo_number ON public.belgium_registry_data USING btree (kbo_number_clean) WHERE (is_deleted = false);


--
-- Name: idx_belgium_registry_legal_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_belgium_registry_legal_entity ON public.belgium_registry_data USING btree (legal_entity_id) WHERE (is_deleted = false);


--
-- Name: idx_belgium_registry_unique_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_belgium_registry_unique_active ON public.belgium_registry_data USING btree (legal_entity_id) WHERE (is_deleted = false);


--
-- Name: idx_belgium_registry_vat_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_belgium_registry_vat_number ON public.belgium_registry_data USING btree (vat_number) WHERE ((is_deleted = false) AND (vat_number IS NOT NULL));


--
-- Name: idx_dns_tokens_cleanup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_tokens_cleanup ON public.dns_verification_tokens USING btree (expires_at) WHERE ((status)::text = 'pending'::text);


--
-- Name: INDEX idx_dns_tokens_cleanup; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_dns_tokens_cleanup IS 'Optimizes expired token cleanup queries (WHERE status=pending AND expires_at < NOW())';


--
-- Name: idx_dns_tokens_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_tokens_domain ON public.dns_verification_tokens USING btree (domain);


--
-- Name: idx_dns_tokens_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_tokens_expires ON public.dns_verification_tokens USING btree (expires_at) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_dns_tokens_legal_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_tokens_legal_entity ON public.dns_verification_tokens USING btree (legal_entity_id);


--
-- Name: idx_dns_tokens_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_tokens_status ON public.dns_verification_tokens USING btree (status);


--
-- Name: idx_dns_verification_entity_domain_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_verification_entity_domain_status ON public.dns_verification_tokens USING btree (legal_entity_id, domain, status) WHERE ((status)::text = 'pending'::text);


--
-- Name: INDEX idx_dns_verification_entity_domain_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_dns_verification_entity_domain_status IS 'Composite index for DNS verification lookups (entity + domain + status)';


--
-- Name: idx_elf_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elf_active ON public.entity_legal_forms USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_elf_country_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elf_country_code ON public.entity_legal_forms USING btree (country_code);


--
-- Name: idx_elf_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elf_status ON public.entity_legal_forms USING btree (elf_status);


--
-- Name: idx_elf_trans_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elf_trans_code ON public.entity_legal_form_translations USING btree (elf_code);


--
-- Name: idx_elf_trans_lang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elf_trans_lang ON public.entity_legal_form_translations USING btree (language_code);


--
-- Name: idx_endpoint_verification_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_endpoint_verification_expires ON public.legal_entity_endpoint USING btree (verification_expires_at) WHERE ((verification_expires_at IS NOT NULL) AND (is_deleted = false));


--
-- Name: idx_endpoint_verification_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_endpoint_verification_status ON public.legal_entity_endpoint USING btree (verification_status) WHERE (is_deleted = false);


--
-- Name: idx_endpoint_verification_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_endpoint_verification_token ON public.legal_entity_endpoint USING btree (verification_token) WHERE ((verification_token IS NOT NULL) AND (is_deleted = false));


--
-- Name: idx_german_registry_company_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_german_registry_company_name ON public.german_registry_data USING btree (company_name) WHERE (is_deleted = false);


--
-- Name: idx_german_registry_euid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_german_registry_euid ON public.german_registry_data USING btree (euid) WHERE ((is_deleted = false) AND (euid IS NOT NULL));


--
-- Name: idx_german_registry_legal_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_german_registry_legal_entity ON public.german_registry_data USING btree (legal_entity_id) WHERE (is_deleted = false);


--
-- Name: idx_german_registry_register_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_german_registry_register_number ON public.german_registry_data USING btree (register_number) WHERE (is_deleted = false);


--
-- Name: idx_german_registry_unique_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_german_registry_unique_active ON public.german_registry_data USING btree (legal_entity_id) WHERE (is_deleted = false);


--
-- Name: idx_gleif_ra_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gleif_ra_active ON public.gleif_registration_authorities USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_gleif_ra_country_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gleif_ra_country_code ON public.gleif_registration_authorities USING btree (country_code);


--
-- Name: idx_gleif_registry_fetched_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gleif_registry_fetched_at ON public.gleif_registry_data USING btree (legal_entity_id, fetched_at DESC);


--
-- Name: idx_gleif_registry_legal_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gleif_registry_legal_entity_id ON public.gleif_registry_data USING btree (legal_entity_id);


--
-- Name: idx_gleif_registry_lei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gleif_registry_lei ON public.gleif_registry_data USING btree (lei);


--
-- Name: idx_gleif_registry_unique_legal_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_gleif_registry_unique_legal_entity ON public.gleif_registry_data USING btree (legal_entity_id) WHERE (legal_entity_id IS NOT NULL);


--
-- Name: idx_identifier_type_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_identifier_type_active ON public.legal_entity_number_type USING btree (type_code) WHERE (is_active = true);


--
-- Name: idx_issued_tokens_cleanup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issued_tokens_cleanup ON public.issued_tokens USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: INDEX idx_issued_tokens_cleanup; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_issued_tokens_cleanup IS 'Optimizes OAuth token cleanup queries';


--
-- Name: idx_kvk_registry_fetched_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kvk_registry_fetched_at ON public.kvk_registry_data USING btree (fetched_at DESC);


--
-- Name: idx_kvk_registry_kvk_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kvk_registry_kvk_number ON public.kvk_registry_data USING btree (kvk_number) WHERE (is_deleted = false);


--
-- Name: idx_kvk_registry_legal_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kvk_registry_legal_entity ON public.kvk_registry_data USING btree (legal_entity_id) WHERE (is_deleted = false);


--
-- Name: idx_kvk_registry_rsin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kvk_registry_rsin ON public.kvk_registry_data USING btree (rsin) WHERE ((is_deleted = false) AND (rsin IS NOT NULL));


--
-- Name: idx_legal_entity_auth_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_auth_method ON public.legal_entity USING btree (authentication_method);


--
-- Name: idx_legal_entity_branding_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_branding_entity ON public.legal_entity_branding USING btree (legal_entity_id) WHERE (is_deleted = false);


--
-- Name: idx_legal_entity_contact_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_contact_active ON public.legal_entity_contact USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_legal_entity_contact_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_contact_deleted ON public.legal_entity_contact USING btree (is_deleted) WHERE (is_deleted = false);


--
-- Name: idx_legal_entity_contact_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_contact_email ON public.legal_entity_contact USING btree (email);


--
-- Name: idx_legal_entity_contact_email_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_contact_email_active ON public.legal_entity_contact USING btree (email, is_active) WHERE ((is_active = true) AND (is_deleted = false));


--
-- Name: INDEX idx_legal_entity_contact_email_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_legal_entity_contact_email_active IS 'Composite index for authentication queries (email + is_active on critical path)';


--
-- Name: idx_legal_entity_contact_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_contact_entity ON public.legal_entity_contact USING btree (legal_entity_id);


--
-- Name: idx_legal_entity_contact_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_contact_primary ON public.legal_entity_contact USING btree (is_primary) WHERE (is_primary = true);


--
-- Name: idx_legal_entity_contact_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_contact_type ON public.legal_entity_contact USING btree (contact_type);


--
-- Name: idx_legal_entity_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_created ON public.legal_entity USING btree (dt_created);


--
-- Name: idx_legal_entity_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_deleted ON public.legal_entity USING btree (is_deleted) WHERE (is_deleted = false);


--
-- Name: idx_legal_entity_dns_reverification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_dns_reverification ON public.legal_entity USING btree (dns_reverification_due) WHERE ((dns_reverification_due IS NOT NULL) AND (authentication_tier = 2));


--
-- Name: idx_legal_entity_endpoint_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_endpoint_active ON public.legal_entity_endpoint USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_legal_entity_endpoint_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_endpoint_category ON public.legal_entity_endpoint USING btree (data_category);


--
-- Name: idx_legal_entity_endpoint_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_endpoint_deleted ON public.legal_entity_endpoint USING btree (is_deleted) WHERE (is_deleted = false);


--
-- Name: idx_legal_entity_endpoint_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_endpoint_entity ON public.legal_entity_endpoint USING btree (legal_entity_id);


--
-- Name: idx_legal_entity_euid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_euid ON public.legal_entity_number USING btree (identifier_value) WHERE (((identifier_type)::text = 'EUID'::text) AND (is_deleted = false));


--
-- Name: idx_legal_entity_kvk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_kvk ON public.legal_entity_number USING btree (identifier_value) WHERE (((identifier_type)::text = 'KVK'::text) AND (is_deleted = false));


--
-- Name: idx_legal_entity_kvk_verification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_kvk_verification ON public.legal_entity USING btree (kvk_verification_status, kvk_verified_at);


--
-- Name: idx_legal_entity_lei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_lei ON public.legal_entity_number USING btree (identifier_value) WHERE (((identifier_type)::text = 'LEI'::text) AND (is_deleted = false));


--
-- Name: idx_legal_entity_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_name ON public.legal_entity USING btree (primary_legal_name);


--
-- Name: idx_legal_entity_number_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_number_country ON public.legal_entity_number USING btree (country_code) WHERE (country_code IS NOT NULL);


--
-- Name: idx_legal_entity_number_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_number_deleted ON public.legal_entity_number USING btree (is_deleted) WHERE (is_deleted = false);


--
-- Name: idx_legal_entity_number_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_number_entity ON public.legal_entity_number USING btree (legal_entity_id);


--
-- Name: idx_legal_entity_number_entity_type_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_number_entity_type_active ON public.legal_entity_number USING btree (legal_entity_id, identifier_type) WHERE (is_deleted = false);


--
-- Name: INDEX idx_legal_entity_number_entity_type_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_legal_entity_number_entity_type_active IS 'Composite index for frequent WHERE legal_entity_id = X AND identifier_type = Y queries (17 occurrences in API routes.ts)';


--
-- Name: idx_legal_entity_number_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_number_status ON public.legal_entity_number USING btree (validation_status);


--
-- Name: idx_legal_entity_number_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_number_type ON public.legal_entity_number USING btree (identifier_type);


--
-- Name: idx_legal_entity_number_type_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_number_type_country ON public.legal_entity_number USING btree (identifier_type, country_code) WHERE (country_code IS NOT NULL);


--
-- Name: idx_legal_entity_number_value; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_number_value ON public.legal_entity_number USING btree (identifier_value);


--
-- Name: idx_legal_entity_number_verification_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_number_verification_status ON public.legal_entity_number USING btree (verification_status) WHERE (is_deleted = false);


--
-- Name: idx_legal_entity_party; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_party ON public.legal_entity USING btree (party_id);


--
-- Name: idx_legal_entity_party_id_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_party_id_lookup ON public.legal_entity USING btree (party_id) WHERE (is_deleted = false);


--
-- Name: idx_legal_entity_party_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_party_ref ON public.legal_entity USING btree (party_id) WHERE (is_deleted = false);


--
-- Name: idx_legal_entity_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_status ON public.legal_entity USING btree (status);


--
-- Name: idx_legal_entity_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_entity_tier ON public.legal_entity USING btree (authentication_tier);


--
-- Name: idx_m2m_clients_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_clients_active ON public.m2m_clients USING btree (is_active) WHERE ((is_active = true) AND (is_deleted = false));


--
-- Name: idx_m2m_clients_azure_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_clients_azure_client_id ON public.m2m_clients USING btree (azure_client_id) WHERE (is_deleted = false);


--
-- Name: idx_m2m_clients_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_clients_created ON public.m2m_clients USING btree (dt_created);


--
-- Name: idx_m2m_clients_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_clients_deleted ON public.m2m_clients USING btree (is_deleted) WHERE (is_deleted = false);


--
-- Name: idx_m2m_clients_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_clients_endpoint ON public.m2m_clients USING btree (legal_entity_endpoint_id);


--
-- Name: idx_m2m_clients_legal_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_clients_legal_entity ON public.m2m_clients USING btree (legal_entity_id) WHERE (is_deleted = false);


--
-- Name: idx_m2m_clients_scopes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_clients_scopes ON public.m2m_clients USING gin (assigned_scopes);


--
-- Name: idx_m2m_credentials_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_credentials_active ON public.ctn_m2m_credentials USING btree (is_active) WHERE ((is_active = true) AND (is_deleted = false));


--
-- Name: idx_m2m_credentials_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_credentials_client_id ON public.ctn_m2m_credentials USING btree (m2m_client_id) WHERE ((is_deleted = false) AND (is_active = true));


--
-- Name: idx_m2m_credentials_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_credentials_created ON public.ctn_m2m_credentials USING btree (dt_created);


--
-- Name: idx_m2m_credentials_endpoints; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_credentials_endpoints ON public.ctn_m2m_credentials USING gin (allowed_endpoints) WHERE (allowed_endpoints IS NOT NULL);


--
-- Name: idx_m2m_credentials_last_used; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_credentials_last_used ON public.ctn_m2m_credentials USING btree (last_used_at) WHERE (last_used_at IS NOT NULL);


--
-- Name: idx_m2m_credentials_party; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_credentials_party ON public.ctn_m2m_credentials USING btree (party_id) WHERE (is_deleted = false);


--
-- Name: idx_m2m_credentials_realm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_credentials_realm ON public.ctn_m2m_credentials USING btree (m2m_realm_id) WHERE (is_deleted = false);


--
-- Name: idx_m2m_credentials_scopes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_credentials_scopes ON public.ctn_m2m_credentials USING gin (assigned_scopes);


--
-- Name: idx_m2m_secrets_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_secrets_active ON public.ctn_m2m_secret_audit USING btree (is_revoked) WHERE (is_revoked = false);


--
-- Name: idx_m2m_secrets_audit_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_secrets_audit_active ON public.m2m_client_secrets_audit USING btree (is_revoked) WHERE (is_revoked = false);


--
-- Name: idx_m2m_secrets_audit_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_secrets_audit_client ON public.m2m_client_secrets_audit USING btree (m2m_client_id);


--
-- Name: idx_m2m_secrets_audit_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_secrets_audit_expires ON public.m2m_client_secrets_audit USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_m2m_secrets_audit_generated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_secrets_audit_generated ON public.m2m_client_secrets_audit USING btree (secret_generated_at);


--
-- Name: idx_m2m_secrets_credential; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_secrets_credential ON public.ctn_m2m_secret_audit USING btree (credential_id);


--
-- Name: idx_m2m_secrets_generated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m2m_secrets_generated ON public.ctn_m2m_secret_audit USING btree (secret_generated_at);


--
-- Name: idx_members_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_domain ON public.legal_entity USING btree (domain);


--
-- Name: idx_members_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_status ON public.legal_entity USING btree (status);


--
-- Name: idx_party_reference_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_party_reference_created ON public.party_reference USING btree (dt_created);


--
-- Name: idx_party_reference_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_party_reference_deleted ON public.party_reference USING btree (is_deleted) WHERE (is_deleted = false);


--
-- Name: idx_peppol_registry_fetched_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_peppol_registry_fetched_at ON public.peppol_registry_data USING btree (fetched_at DESC);


--
-- Name: idx_peppol_registry_legal_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_peppol_registry_legal_entity ON public.peppol_registry_data USING btree (legal_entity_id) WHERE (is_deleted = false);


--
-- Name: idx_peppol_registry_participant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_peppol_registry_participant ON public.peppol_registry_data USING btree (participant_id) WHERE (is_deleted = false);


--
-- Name: idx_peppol_registry_unique_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_peppol_registry_unique_active ON public.peppol_registry_data USING btree (legal_entity_id) WHERE (is_deleted = false);


--
-- Name: idx_tokens_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tokens_expiry ON public.issued_tokens USING btree (expires_at);


--
-- Name: idx_tokens_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tokens_member ON public.issued_tokens USING btree (legal_entity_id);


--
-- Name: idx_tokens_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tokens_type ON public.issued_tokens USING btree (token_type);


--
-- Name: idx_verification_identifier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_identifier ON public.identifier_verification_history USING btree (identifier_id);


--
-- Name: idx_verification_identifier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_identifier_id ON public.identifier_verification_history USING btree (identifier_id) WHERE (identifier_id IS NOT NULL);


--
-- Name: INDEX idx_verification_identifier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_verification_identifier_id IS 'FK index for joins from legal_entity_number to identifier_verification_history';


--
-- Name: idx_verification_legal_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_legal_entity ON public.identifier_verification_history USING btree (legal_entity_id);


--
-- Name: idx_verification_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_status ON public.identifier_verification_history USING btree (verification_status);


--
-- Name: idx_verification_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_type ON public.identifier_verification_history USING btree (identifier_type);


--
-- Name: idx_vies_registry_fetched_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vies_registry_fetched_at ON public.vies_registry_data USING btree (fetched_at DESC);


--
-- Name: idx_vies_registry_full_vat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vies_registry_full_vat ON public.vies_registry_data USING btree (full_vat_number) WHERE (is_deleted = false);


--
-- Name: idx_vies_registry_legal_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vies_registry_legal_entity ON public.vies_registry_data USING btree (legal_entity_id) WHERE (is_deleted = false);


--
-- Name: idx_vies_registry_unique_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_vies_registry_unique_active ON public.vies_registry_data USING btree (legal_entity_id) WHERE (is_deleted = false);


--
-- Name: idx_vies_registry_valid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vies_registry_valid ON public.vies_registry_data USING btree (is_valid) WHERE (is_deleted = false);


--
-- Name: idx_vies_registry_vat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vies_registry_vat ON public.vies_registry_data USING btree (country_code, vat_number) WHERE (is_deleted = false);


--
-- Name: uq_dns_token_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dns_token_active ON public.dns_verification_tokens USING btree (legal_entity_id, domain) WHERE ((status)::text = 'pending'::text);


--
-- Name: uq_identifier_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_identifier_active ON public.legal_entity_number USING btree (legal_entity_id, identifier_type, identifier_value) WHERE (is_deleted = false);


--
-- Name: INDEX uq_identifier_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.uq_identifier_active IS 'Unique constraint on identifiers - only applies to active (non-deleted) records';


--
-- Name: uq_legal_entity_party_id_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_legal_entity_party_id_active ON public.legal_entity USING btree (party_id) WHERE (is_deleted = false);


--
-- Name: INDEX uq_legal_entity_party_id_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.uq_legal_entity_party_id_active IS 'Ensures 1:1 relationship between party_reference and legal_entity (respects soft deletes)';


--
-- Name: vw_legal_entities _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.vw_legal_entities AS
 SELECT le.legal_entity_id,
    le.party_id,
    le.primary_legal_name,
    le.city,
    le.country_code,
    le.domain,
    le.status,
    le.membership_level,
    le.authentication_tier,
    le.authentication_method,
    le.dt_created,
    le.dt_modified,
    le.metadata,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'KVK'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS kvk,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'LEI'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS lei,
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
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'VAT'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS vat,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'PEPPOL'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS peppol,
    ( SELECT count(*) AS count
           FROM public.legal_entity_contact lec
          WHERE ((lec.legal_entity_id = le.legal_entity_id) AND (lec.is_active = true))) AS contact_count,
    ( SELECT count(*) AS count
           FROM public.legal_entity_endpoint lee
          WHERE ((lee.legal_entity_id = le.legal_entity_id) AND (lee.is_active = true))) AS endpoint_count
   FROM (public.legal_entity le
     LEFT JOIN public.legal_entity_number len ON (((le.legal_entity_id = len.legal_entity_id) AND (len.is_deleted = false))))
  WHERE (le.is_deleted = false)
  GROUP BY le.legal_entity_id;


--
-- Name: legal_entity_contact trg_legal_entity_contact_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_legal_entity_contact_modified BEFORE UPDATE ON public.legal_entity_contact FOR EACH ROW EXECUTE FUNCTION public.update_modified_timestamp();


--
-- Name: legal_entity_endpoint trg_legal_entity_endpoint_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_legal_entity_endpoint_modified BEFORE UPDATE ON public.legal_entity_endpoint FOR EACH ROW EXECUTE FUNCTION public.update_modified_timestamp();


--
-- Name: legal_entity trg_legal_entity_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_legal_entity_modified BEFORE UPDATE ON public.legal_entity FOR EACH ROW EXECUTE FUNCTION public.update_modified_timestamp();


--
-- Name: legal_entity_number trg_legal_entity_number_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_legal_entity_number_modified BEFORE UPDATE ON public.legal_entity_number FOR EACH ROW EXECUTE FUNCTION public.update_modified_timestamp();


--
-- Name: ctn_m2m_credentials trg_m2m_credentials_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_m2m_credentials_modified BEFORE UPDATE ON public.ctn_m2m_credentials FOR EACH ROW EXECUTE FUNCTION public.update_m2m_credentials_modified();


--
-- Name: party_reference trg_party_reference_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_party_reference_modified BEFORE UPDATE ON public.party_reference FOR EACH ROW EXECUTE FUNCTION public.update_modified_timestamp();


--
-- Name: belgium_registry_data trigger_belgium_registry_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_belgium_registry_modified BEFORE UPDATE ON public.belgium_registry_data FOR EACH ROW EXECUTE FUNCTION public.update_belgium_registry_modified();


--
-- Name: german_registry_data trigger_german_registry_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_german_registry_modified BEFORE UPDATE ON public.german_registry_data FOR EACH ROW EXECUTE FUNCTION public.update_german_registry_modified();


--
-- Name: kvk_registry_data trigger_kvk_registry_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_kvk_registry_modified BEFORE UPDATE ON public.kvk_registry_data FOR EACH ROW EXECUTE FUNCTION public.update_kvk_registry_modified();


--
-- Name: legal_entity_branding trigger_legal_entity_branding_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_legal_entity_branding_modified BEFORE UPDATE ON public.legal_entity_branding FOR EACH ROW EXECUTE FUNCTION public.update_legal_entity_branding_modified();


--
-- Name: peppol_registry_data trigger_peppol_registry_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_peppol_registry_modified BEFORE UPDATE ON public.peppol_registry_data FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: identifier_verification_history trigger_update_identifier_verification_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_identifier_verification_updated_at BEFORE UPDATE ON public.identifier_verification_history FOR EACH ROW EXECUTE FUNCTION public.update_identifier_verification_updated_at();


--
-- Name: vies_registry_data trigger_vies_registry_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_vies_registry_modified BEFORE UPDATE ON public.vies_registry_data FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: admin_tasks update_admin_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_tasks_updated_at BEFORE UPDATE ON public.admin_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: applications applications_created_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_created_member_id_fkey FOREIGN KEY (created_member_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE SET NULL;


--
-- Name: belgium_registry_data belgium_registry_data_legal_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.belgium_registry_data
    ADD CONSTRAINT belgium_registry_data_legal_entity_id_fkey FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;


--
-- Name: entity_legal_form_translations entity_legal_form_translations_elf_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_legal_form_translations
    ADD CONSTRAINT entity_legal_form_translations_elf_code_fkey FOREIGN KEY (elf_code) REFERENCES public.entity_legal_forms(elf_code) ON DELETE CASCADE;


--
-- Name: authorization_log fk_auth_log_legal_entity; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_log
    ADD CONSTRAINT fk_auth_log_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE SET NULL;


--
-- Name: legal_entity fk_direct_parent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity
    ADD CONSTRAINT fk_direct_parent FOREIGN KEY (direct_parent_legal_entity_id) REFERENCES public.legal_entity(legal_entity_id);


--
-- Name: dns_verification_tokens fk_dns_token_legal_entity; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_verification_tokens
    ADD CONSTRAINT fk_dns_token_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;


--
-- Name: gleif_registry_data fk_gleif_legal_entity; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gleif_registry_data
    ADD CONSTRAINT fk_gleif_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;


--
-- Name: legal_entity_number fk_identifier_type; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity_number
    ADD CONSTRAINT fk_identifier_type FOREIGN KEY (identifier_type) REFERENCES public.legal_entity_number_type(type_code);


--
-- Name: legal_entity_number fk_legal_entity; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity_number
    ADD CONSTRAINT fk_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;


--
-- Name: legal_entity_contact fk_legal_entity_contact; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity_contact
    ADD CONSTRAINT fk_legal_entity_contact FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;


--
-- Name: legal_entity_endpoint fk_legal_entity_endpoint; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity_endpoint
    ADD CONSTRAINT fk_legal_entity_endpoint FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;


--
-- Name: m2m_clients fk_m2m_clients_endpoint; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m2m_clients
    ADD CONSTRAINT fk_m2m_clients_endpoint FOREIGN KEY (legal_entity_endpoint_id) REFERENCES public.legal_entity_endpoint(legal_entity_endpoint_id) ON DELETE SET NULL;


--
-- Name: ctn_m2m_credentials fk_m2m_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctn_m2m_credentials
    ADD CONSTRAINT fk_m2m_created_by FOREIGN KEY (created_by) REFERENCES public.party_reference(party_id);


--
-- Name: m2m_clients fk_m2m_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m2m_clients
    ADD CONSTRAINT fk_m2m_created_by FOREIGN KEY (created_by) REFERENCES public.party_reference(party_id);


--
-- Name: m2m_clients fk_m2m_legal_entity; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m2m_clients
    ADD CONSTRAINT fk_m2m_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;


--
-- Name: ctn_m2m_credentials fk_m2m_modified_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctn_m2m_credentials
    ADD CONSTRAINT fk_m2m_modified_by FOREIGN KEY (modified_by) REFERENCES public.party_reference(party_id);


--
-- Name: m2m_clients fk_m2m_modified_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m2m_clients
    ADD CONSTRAINT fk_m2m_modified_by FOREIGN KEY (modified_by) REFERENCES public.party_reference(party_id);


--
-- Name: ctn_m2m_credentials fk_m2m_party; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctn_m2m_credentials
    ADD CONSTRAINT fk_m2m_party FOREIGN KEY (party_id) REFERENCES public.party_reference(party_id) ON DELETE CASCADE;


--
-- Name: m2m_client_secrets_audit fk_m2m_secrets_client; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m2m_client_secrets_audit
    ADD CONSTRAINT fk_m2m_secrets_client FOREIGN KEY (m2m_client_id) REFERENCES public.m2m_clients(m2m_client_id) ON DELETE CASCADE;


--
-- Name: ctn_m2m_secret_audit fk_m2m_secrets_credential; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctn_m2m_secret_audit
    ADD CONSTRAINT fk_m2m_secrets_credential FOREIGN KEY (credential_id) REFERENCES public.ctn_m2m_credentials(credential_id) ON DELETE CASCADE;


--
-- Name: ctn_m2m_secret_audit fk_m2m_secrets_generated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctn_m2m_secret_audit
    ADD CONSTRAINT fk_m2m_secrets_generated_by FOREIGN KEY (generated_by) REFERENCES public.party_reference(party_id);


--
-- Name: m2m_client_secrets_audit fk_m2m_secrets_generated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m2m_client_secrets_audit
    ADD CONSTRAINT fk_m2m_secrets_generated_by FOREIGN KEY (generated_by) REFERENCES public.party_reference(party_id);


--
-- Name: ctn_m2m_secret_audit fk_m2m_secrets_revoked_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctn_m2m_secret_audit
    ADD CONSTRAINT fk_m2m_secrets_revoked_by FOREIGN KEY (revoked_by) REFERENCES public.party_reference(party_id);


--
-- Name: m2m_client_secrets_audit fk_m2m_secrets_revoked_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m2m_client_secrets_audit
    ADD CONSTRAINT fk_m2m_secrets_revoked_by FOREIGN KEY (revoked_by) REFERENCES public.party_reference(party_id);


--
-- Name: legal_entity fk_party; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity
    ADD CONSTRAINT fk_party FOREIGN KEY (party_id) REFERENCES public.party_reference(party_id) ON DELETE CASCADE;


--
-- Name: legal_entity fk_ultimate_parent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity
    ADD CONSTRAINT fk_ultimate_parent FOREIGN KEY (ultimate_parent_legal_entity_id) REFERENCES public.legal_entity(legal_entity_id);


--
-- Name: german_registry_data german_registry_data_legal_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.german_registry_data
    ADD CONSTRAINT german_registry_data_legal_entity_id_fkey FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;


--
-- Name: identifier_verification_history identifier_verification_history_identifier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identifier_verification_history
    ADD CONSTRAINT identifier_verification_history_identifier_id_fkey FOREIGN KEY (identifier_id) REFERENCES public.legal_entity_number(legal_entity_reference_id) ON DELETE CASCADE;


--
-- Name: identifier_verification_history identifier_verification_history_legal_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identifier_verification_history
    ADD CONSTRAINT identifier_verification_history_legal_entity_id_fkey FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;


--
-- Name: issued_tokens issued_tokens_legal_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issued_tokens
    ADD CONSTRAINT issued_tokens_legal_entity_id_fkey FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;


--
-- Name: kvk_registry_data kvk_registry_data_legal_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kvk_registry_data
    ADD CONSTRAINT kvk_registry_data_legal_entity_id_fkey FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;


--
-- Name: legal_entity_branding legal_entity_branding_legal_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity_branding
    ADD CONSTRAINT legal_entity_branding_legal_entity_id_fkey FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;


--
-- Name: legal_entity_number_type legal_entity_number_type_gleif_ra_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entity_number_type
    ADD CONSTRAINT legal_entity_number_type_gleif_ra_code_fkey FOREIGN KEY (gleif_ra_code) REFERENCES public.gleif_registration_authorities(ra_code);


--
-- Name: peppol_registry_data peppol_registry_data_legal_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.peppol_registry_data
    ADD CONSTRAINT peppol_registry_data_legal_entity_id_fkey FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;


--
-- Name: vies_registry_data vies_registry_data_legal_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vies_registry_data
    ADD CONSTRAINT vies_registry_data_legal_entity_id_fkey FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict jIYk2xwdtamPISDkOs0Kae2ZggDvLqqCbBUi6LdcTcIf2S3Uzc5yZtVt8R19pOF

