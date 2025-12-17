--
-- PostgreSQL database dump
--

\restrict lMitiQ6OyQWAcW1DPKF0IQZdL5fohVp6ELB0iw9EjhlklfPTdJVfGgcYpaTlaDW

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
    CONSTRAINT chk_validation_status_valid CHECK (((validation_status)::text = ANY ((ARRAY['PENDING'::character varying, 'VALID'::character varying, 'INVALID'::character varying, 'EXPIRED'::character varying, 'NOT_VE