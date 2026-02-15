--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.subscription_features DROP CONSTRAINT IF EXISTS subscription_features_subscription_plan_id_fkey;
ALTER TABLE IF EXISTS ONLY public.manage_credentials_profile DROP CONSTRAINT IF EXISTS manage_credentials_profile_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.manage_advertisers_profile DROP CONSTRAINT IF EXISTS manage_advertisers_profile_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.manage_admins_profile DROP CONSTRAINT IF EXISTS manage_admins_profile_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.system_media_settings DROP CONSTRAINT IF EXISTS fk_subscription_plan;
ALTER TABLE IF EXISTS ONLY public.affiliate_tiers DROP CONSTRAINT IF EXISTS fk_affiliate_tiers_program;
ALTER TABLE IF EXISTS ONLY public.admin_resignations DROP CONSTRAINT IF EXISTS admin_resignations_reviewed_by_fkey;
ALTER TABLE IF EXISTS ONLY public.admin_resignations DROP CONSTRAINT IF EXISTS admin_resignations_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.admin_leave_requests DROP CONSTRAINT IF EXISTS admin_leave_requests_approved_by_fkey;
ALTER TABLE IF EXISTS ONLY public.admin_leave_requests DROP CONSTRAINT IF EXISTS admin_leave_requests_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.admin_invitations DROP CONSTRAINT IF EXISTS admin_invitations_invited_by_fkey;
ALTER TABLE IF EXISTS ONLY public.admin_invitations DROP CONSTRAINT IF EXISTS admin_invitations_admin_id_fkey;
DROP INDEX IF EXISTS public.ix_otps_id;
DROP INDEX IF EXISTS public.idx_verification_fee_type;
DROP INDEX IF EXISTS public.idx_verification_fee_country;
DROP INDEX IF EXISTS public.idx_unique_pending_invitation;
DROP INDEX IF EXISTS public.idx_unique_active_rules;
DROP INDEX IF EXISTS public.idx_system_media_uploader;
DROP INDEX IF EXISTS public.idx_system_media_media_type;
DROP INDEX IF EXISTS public.idx_system_media_is_active;
DROP INDEX IF EXISTS public.idx_system_media_category;
DROP INDEX IF EXISTS public.idx_subscription_plans_country;
DROP INDEX IF EXISTS public.idx_subscription_plans_active;
DROP INDEX IF EXISTS public.idx_subscription_features_user_role;
DROP INDEX IF EXISTS public.idx_subscription_features_plan_role;
DROP INDEX IF EXISTS public.idx_subscription_features_plan_id;
DROP INDEX IF EXISTS public.idx_resignations_status;
DROP INDEX IF EXISTS public.idx_resignations_admin_id;
DROP INDEX IF EXISTS public.idx_otps_purpose;
DROP INDEX IF EXISTS public.idx_otps_contact;
DROP INDEX IF EXISTS public.idx_leave_requests_status;
DROP INDEX IF EXISTS public.idx_leave_requests_dates;
DROP INDEX IF EXISTS public.idx_leave_requests_admin_id;
DROP INDEX IF EXISTS public.idx_invitations_status;
DROP INDEX IF EXISTS public.idx_invitations_invited_by;
DROP INDEX IF EXISTS public.idx_invitations_email;
DROP INDEX IF EXISTS public.idx_invitations_department;
DROP INDEX IF EXISTS public.idx_cpi_settings_country;
DROP INDEX IF EXISTS public.idx_brand_packages_order;
DROP INDEX IF EXISTS public.idx_brand_packages_active;
DROP INDEX IF EXISTS public.idx_base_price_rules_currency;
DROP INDEX IF EXISTS public.idx_base_price_rules_country;
DROP INDEX IF EXISTS public.idx_base_price_priority;
DROP INDEX IF EXISTS public.idx_base_price_lookup;
DROP INDEX IF EXISTS public.idx_base_price_active;
DROP INDEX IF EXISTS public.idx_astegni_reviews_reviewer;
DROP INDEX IF EXISTS public.idx_astegni_reviews_rating;
DROP INDEX IF EXISTS public.idx_astegni_reviews_featured;
DROP INDEX IF EXISTS public.idx_astegni_reviews_created;
DROP INDEX IF EXISTS public.idx_affiliate_tiers_program_id;
DROP INDEX IF EXISTS public.idx_affiliate_tiers_level;
DROP INDEX IF EXISTS public.idx_affiliate_tiers_business_type;
DROP INDEX IF EXISTS public.idx_affiliate_tiers_active;
DROP INDEX IF EXISTS public.idx_admin_portfolio_departments;
DROP INDEX IF EXISTS public.idx_admin_portfolio_admin_id;
ALTER TABLE IF EXISTS ONLY public.verification_fee DROP CONSTRAINT IF EXISTS verification_fee_type_key;
ALTER TABLE IF EXISTS ONLY public.verification_fee DROP CONSTRAINT IF EXISTS verification_fee_pkey;
ALTER TABLE IF EXISTS ONLY public.astegni_reviews DROP CONSTRAINT IF EXISTS unique_reviewer;
ALTER TABLE IF EXISTS ONLY public.subscription_features DROP CONSTRAINT IF EXISTS unique_plan_role_feature;
ALTER TABLE IF EXISTS ONLY public.system_subscription_tiers DROP CONSTRAINT IF EXISTS system_subscription_tiers_pkey;
ALTER TABLE IF EXISTS ONLY public.system_statistics DROP CONSTRAINT IF EXISTS system_statistics_pkey;
ALTER TABLE IF EXISTS ONLY public.system_sms_log DROP CONSTRAINT IF EXISTS system_sms_log_pkey;
ALTER TABLE IF EXISTS ONLY public.system_sms_config DROP CONSTRAINT IF EXISTS system_sms_config_pkey;
ALTER TABLE IF EXISTS ONLY public.system_security_settings DROP CONSTRAINT IF EXISTS system_security_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.system_performance_metrics DROP CONSTRAINT IF EXISTS system_performance_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.system_payment_gateways DROP CONSTRAINT IF EXISTS system_payment_gateways_pkey;
ALTER TABLE IF EXISTS ONLY public.system_media_settings DROP CONSTRAINT IF EXISTS system_media_settings_subscription_plan_id_unique;
ALTER TABLE IF EXISTS ONLY public.system_media_settings DROP CONSTRAINT IF EXISTS system_media_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.system_media DROP CONSTRAINT IF EXISTS system_media_pkey;
ALTER TABLE IF EXISTS ONLY public.system_maintenance DROP CONSTRAINT IF EXISTS system_maintenance_pkey;
ALTER TABLE IF EXISTS ONLY public.system_logs DROP CONSTRAINT IF EXISTS system_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.system_integrations DROP CONSTRAINT IF EXISTS system_integrations_pkey;
ALTER TABLE IF EXISTS ONLY public.system_impressions DROP CONSTRAINT IF EXISTS system_impressions_pkey;
ALTER TABLE IF EXISTS ONLY public.system_impression_stats DROP CONSTRAINT IF EXISTS system_impression_stats_pkey;
ALTER TABLE IF EXISTS ONLY public.system_general_settings DROP CONSTRAINT IF EXISTS system_general_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.system_email_templates DROP CONSTRAINT IF EXISTS system_email_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.system_email_config DROP CONSTRAINT IF EXISTS system_email_config_pkey;
ALTER TABLE IF EXISTS ONLY public.system_backup_history DROP CONSTRAINT IF EXISTS system_backup_history_pkey;
ALTER TABLE IF EXISTS ONLY public.system_backup_config DROP CONSTRAINT IF EXISTS system_backup_config_pkey;
ALTER TABLE IF EXISTS ONLY public.system_api_settings DROP CONSTRAINT IF EXISTS system_api_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.system_api_keys DROP CONSTRAINT IF EXISTS system_api_keys_pkey;
ALTER TABLE IF EXISTS ONLY public.system_affiliate_settings DROP CONSTRAINT IF EXISTS system_affiliate_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_pkey;
ALTER TABLE IF EXISTS ONLY public.subscription_features DROP CONSTRAINT IF EXISTS subscription_features_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_gateways DROP CONSTRAINT IF EXISTS payment_gateways_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_gateways DROP CONSTRAINT IF EXISTS payment_gateways_gateway_name_key;
ALTER TABLE IF EXISTS ONLY public.otps DROP CONSTRAINT IF EXISTS otps_pkey;
ALTER TABLE IF EXISTS ONLY public.manage_uploads DROP CONSTRAINT IF EXISTS manage_uploads_pkey;
ALTER TABLE IF EXISTS ONLY public.manage_system_settings_profile DROP CONSTRAINT IF EXISTS manage_system_settings_profile_pkey;
ALTER TABLE IF EXISTS ONLY public.manage_schools_profile DROP CONSTRAINT IF EXISTS manage_schools_profile_pkey;
ALTER TABLE IF EXISTS ONLY public.manage_customers_profile DROP CONSTRAINT IF EXISTS manage_customers_profile_pkey;
ALTER TABLE IF EXISTS ONLY public.manage_credentials_profile DROP CONSTRAINT IF EXISTS manage_credentials_profile_pkey;
ALTER TABLE IF EXISTS ONLY public.manage_courses_profile DROP CONSTRAINT IF EXISTS manage_courses_profile_pkey;
ALTER TABLE IF EXISTS ONLY public.manage_advertisers_profile DROP CONSTRAINT IF EXISTS manage_advertisers_profile_pkey;
ALTER TABLE IF EXISTS ONLY public.manage_advertisers_profile DROP CONSTRAINT IF EXISTS manage_advertisers_profile_admin_id_key;
ALTER TABLE IF EXISTS ONLY public.manage_admins_profile DROP CONSTRAINT IF EXISTS manage_admins_profile_pkey;
ALTER TABLE IF EXISTS ONLY public.cpi_settings DROP CONSTRAINT IF EXISTS cpi_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.brand_packages DROP CONSTRAINT IF EXISTS campaign_packages_pkey;
ALTER TABLE IF EXISTS ONLY public.base_price_rules DROP CONSTRAINT IF EXISTS base_price_rules_pkey;
ALTER TABLE IF EXISTS ONLY public.astegni_reviews DROP CONSTRAINT IF EXISTS astegni_reviews_pkey;
ALTER TABLE IF EXISTS ONLY public.affiliate_tiers DROP CONSTRAINT IF EXISTS affiliate_tiers_program_id_tier_level_business_type_key;
ALTER TABLE IF EXISTS ONLY public.affiliate_tiers DROP CONSTRAINT IF EXISTS affiliate_tiers_pkey;
ALTER TABLE IF EXISTS ONLY public.affiliate_program DROP CONSTRAINT IF EXISTS affiliate_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_reviews DROP CONSTRAINT IF EXISTS admin_reviews_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_resignations DROP CONSTRAINT IF EXISTS admin_resignations_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_profile DROP CONSTRAINT IF EXISTS admin_profile_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_portfolio DROP CONSTRAINT IF EXISTS admin_portfolio_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_leave_requests DROP CONSTRAINT IF EXISTS admin_leave_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_invitations DROP CONSTRAINT IF EXISTS admin_invitations_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_credentials DROP CONSTRAINT IF EXISTS admin_credentials_pkey;
ALTER TABLE IF EXISTS public.verification_fee ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_subscription_tiers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_statistics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_sms_log ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_security_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_performance_metrics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_payment_gateways ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_media_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_media ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_maintenance ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_integrations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_impressions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_impression_stats ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_general_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_email_templates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_email_config ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_backup_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_backup_config ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_api_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_api_keys ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_affiliate_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.subscription_plans ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.subscription_features ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payment_gateways ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.otps ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.manage_uploads ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.manage_system_settings_profile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.manage_schools_profile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.manage_customers_profile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.manage_credentials_profile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.manage_courses_profile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.manage_contents_profile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.manage_advertisers_profile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.manage_admins_profile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.cpi_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.brand_packages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.base_price_rules ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.astegni_reviews ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.affiliate_tiers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.affiliate_program ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admin_reviews ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admin_resignations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admin_profile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admin_portfolio ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admin_leave_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admin_invitations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admin_credentials ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.verification_fee_id_seq;
DROP TABLE IF EXISTS public.verification_fee;
DROP SEQUENCE IF EXISTS public.system_subscription_tiers_id_seq;
DROP TABLE IF EXISTS public.system_subscription_tiers;
DROP SEQUENCE IF EXISTS public.system_statistics_id_seq;
DROP TABLE IF EXISTS public.system_statistics;
DROP SEQUENCE IF EXISTS public.system_sms_log_id_seq;
DROP TABLE IF EXISTS public.system_sms_log;
DROP TABLE IF EXISTS public.system_sms_config;
DROP SEQUENCE IF EXISTS public.system_security_settings_id_seq;
DROP TABLE IF EXISTS public.system_security_settings;
DROP SEQUENCE IF EXISTS public.system_performance_metrics_id_seq;
DROP TABLE IF EXISTS public.system_performance_metrics;
DROP SEQUENCE IF EXISTS public.system_payment_gateways_id_seq;
DROP TABLE IF EXISTS public.system_payment_gateways;
DROP SEQUENCE IF EXISTS public.system_media_settings_id_seq;
DROP TABLE IF EXISTS public.system_media_settings;
DROP SEQUENCE IF EXISTS public.system_media_id_seq;
DROP TABLE IF EXISTS public.system_media;
DROP SEQUENCE IF EXISTS public.system_maintenance_id_seq;
DROP TABLE IF EXISTS public.system_maintenance;
DROP SEQUENCE IF EXISTS public.system_logs_id_seq;
DROP TABLE IF EXISTS public.system_logs;
DROP SEQUENCE IF EXISTS public.system_integrations_id_seq;
DROP TABLE IF EXISTS public.system_integrations;
DROP SEQUENCE IF EXISTS public.system_impressions_id_seq;
DROP TABLE IF EXISTS public.system_impressions;
DROP SEQUENCE IF EXISTS public.system_impression_stats_id_seq;
DROP TABLE IF EXISTS public.system_impression_stats;
DROP SEQUENCE IF EXISTS public.system_general_settings_id_seq;
DROP TABLE IF EXISTS public.system_general_settings;
DROP SEQUENCE IF EXISTS public.system_email_templates_id_seq;
DROP TABLE IF EXISTS public.system_email_templates;
DROP SEQUENCE IF EXISTS public.system_email_config_id_seq;
DROP TABLE IF EXISTS public.system_email_config;
DROP SEQUENCE IF EXISTS public.system_backup_history_id_seq;
DROP TABLE IF EXISTS public.system_backup_history;
DROP SEQUENCE IF EXISTS public.system_backup_config_id_seq;
DROP TABLE IF EXISTS public.system_backup_config;
DROP SEQUENCE IF EXISTS public.system_api_settings_id_seq;
DROP TABLE IF EXISTS public.system_api_settings;
DROP SEQUENCE IF EXISTS public.system_api_keys_id_seq;
DROP TABLE IF EXISTS public.system_api_keys;
DROP SEQUENCE IF EXISTS public.system_affiliate_settings_id_seq;
DROP TABLE IF EXISTS public.system_affiliate_settings;
DROP SEQUENCE IF EXISTS public.subscription_plans_id_seq;
DROP TABLE IF EXISTS public.subscription_plans;
DROP SEQUENCE IF EXISTS public.subscription_features_id_seq;
DROP TABLE IF EXISTS public.subscription_features;
DROP SEQUENCE IF EXISTS public.payment_gateways_id_seq;
DROP TABLE IF EXISTS public.payment_gateways;
DROP SEQUENCE IF EXISTS public.otps_id_seq;
DROP TABLE IF EXISTS public.otps;
DROP SEQUENCE IF EXISTS public.manage_uploads_id_seq;
DROP TABLE IF EXISTS public.manage_uploads;
DROP SEQUENCE IF EXISTS public.manage_system_settings_profile_id_seq;
DROP TABLE IF EXISTS public.manage_system_settings_profile;
DROP SEQUENCE IF EXISTS public.manage_schools_profile_id_seq;
DROP TABLE IF EXISTS public.manage_schools_profile;
DROP SEQUENCE IF EXISTS public.manage_customers_profile_id_seq;
DROP TABLE IF EXISTS public.manage_customers_profile;
DROP SEQUENCE IF EXISTS public.manage_credentials_profile_id_seq;
DROP TABLE IF EXISTS public.manage_credentials_profile;
DROP SEQUENCE IF EXISTS public.manage_courses_profile_id_seq;
DROP TABLE IF EXISTS public.manage_courses_profile;
DROP SEQUENCE IF EXISTS public.manage_contents_profile_profile_id_seq;
DROP TABLE IF EXISTS public.manage_contents_profile;
DROP SEQUENCE IF EXISTS public.manage_advertisers_profile_id_seq;
DROP TABLE IF EXISTS public.manage_advertisers_profile;
DROP SEQUENCE IF EXISTS public.manage_admins_profile_id_seq;
DROP TABLE IF EXISTS public.manage_admins_profile;
DROP SEQUENCE IF EXISTS public.cpi_settings_id_seq;
DROP TABLE IF EXISTS public.cpi_settings;
DROP SEQUENCE IF EXISTS public.campaign_packages_id_seq;
DROP TABLE IF EXISTS public.brand_packages;
DROP SEQUENCE IF EXISTS public.base_price_rules_id_seq;
DROP TABLE IF EXISTS public.base_price_rules;
DROP SEQUENCE IF EXISTS public.astegni_reviews_id_seq;
DROP TABLE IF EXISTS public.astegni_reviews;
DROP SEQUENCE IF EXISTS public.affiliate_tiers_id_seq;
DROP TABLE IF EXISTS public.affiliate_tiers;
DROP SEQUENCE IF EXISTS public.affiliate_settings_id_seq;
DROP TABLE IF EXISTS public.affiliate_program;
DROP SEQUENCE IF EXISTS public.admin_reviews_id_seq;
DROP TABLE IF EXISTS public.admin_reviews;
DROP SEQUENCE IF EXISTS public.admin_resignations_id_seq;
DROP TABLE IF EXISTS public.admin_resignations;
DROP SEQUENCE IF EXISTS public.admin_profile_id_seq;
DROP TABLE IF EXISTS public.admin_profile;
DROP SEQUENCE IF EXISTS public.admin_portfolio_id_seq;
DROP TABLE IF EXISTS public.admin_portfolio;
DROP SEQUENCE IF EXISTS public.admin_leave_requests_id_seq;
DROP TABLE IF EXISTS public.admin_leave_requests;
DROP SEQUENCE IF EXISTS public.admin_invitations_id_seq;
DROP TABLE IF EXISTS public.admin_invitations;
DROP SEQUENCE IF EXISTS public.admin_credentials_id_seq;
DROP TABLE IF EXISTS public.admin_credentials;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_credentials (
    id integer NOT NULL,
    uploader_id integer NOT NULL,
    uploader_role character varying(50) NOT NULL,
    document_type character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    issued_by character varying(255),
    date_of_issue date,
    expiry_date date,
    document_url text,
    file_name character varying(255),
    file_type character varying(100),
    file_size integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    verification_status character varying(50) DEFAULT 'pending'::character varying,
    is_verified boolean DEFAULT false,
    verified_by_admin_id integer,
    rejection_reason text,
    rejected_at timestamp with time zone,
    is_featured boolean DEFAULT false
);


--
-- Name: admin_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_credentials_id_seq OWNED BY public.admin_credentials.id;


--
-- Name: admin_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_invitations (
    id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    father_name character varying(100) NOT NULL,
    grandfather_name character varying(100),
    email character varying(255) NOT NULL,
    phone_number character varying(50),
    department character varying(100) NOT NULL,
    "position" character varying(100) NOT NULL,
    employee_id character varying(50),
    welcome_message text,
    invited_by integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    admin_id integer,
    accepted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    is_otp_verified boolean DEFAULT false
);


--
-- Name: admin_invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_invitations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_invitations_id_seq OWNED BY public.admin_invitations.id;


--
-- Name: admin_leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_leave_requests (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    leave_type character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    approved_by integer,
    approved_at timestamp without time zone,
    rejection_reason text,
    emergency_contact_name character varying(255),
    emergency_contact_phone character varying(50),
    handover_notes text,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: admin_leave_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_leave_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_leave_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_leave_requests_id_seq OWNED BY public.admin_leave_requests.id;


--
-- Name: admin_portfolio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_portfolio (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    departments jsonb DEFAULT '[]'::jsonb,
    total_actions integer DEFAULT 0,
    courses_verified integer DEFAULT 0,
    courses_rejected integer DEFAULT 0,
    courses_suspended integer DEFAULT 0,
    courses_reactivated integer DEFAULT 0,
    schools_verified integer DEFAULT 0,
    schools_rejected integer DEFAULT 0,
    schools_suspended integer DEFAULT 0,
    schools_reactivated integer DEFAULT 0,
    credentials_verified integer DEFAULT 0,
    credentials_rejected integer DEFAULT 0,
    credentials_suspended integer DEFAULT 0,
    credentials_reactivated integer DEFAULT 0,
    students_verified integer DEFAULT 0,
    students_suspended integer DEFAULT 0,
    students_reactivated integer DEFAULT 0,
    contents_approved integer DEFAULT 0,
    contents_rejected integer DEFAULT 0,
    contents_flagged integer DEFAULT 0,
    contents_removed integer DEFAULT 0,
    reviews_approved integer DEFAULT 0,
    reviews_rejected integer DEFAULT 0,
    reviews_flagged integer DEFAULT 0,
    campaigns_approved integer DEFAULT 0,
    campaigns_rejected integer DEFAULT 0,
    campaigns_paused integer DEFAULT 0,
    advertisers_verified integer DEFAULT 0,
    advertisers_rejected integer DEFAULT 0,
    advertisers_suspended integer DEFAULT 0,
    tickets_resolved integer DEFAULT 0,
    tickets_escalated integer DEFAULT 0,
    recent_actions jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    courses_created integer DEFAULT 0,
    courses_verified_ids integer[] DEFAULT ARRAY[]::integer[],
    courses_rejected_ids integer[] DEFAULT ARRAY[]::integer[],
    courses_suspended_ids integer[] DEFAULT ARRAY[]::integer[],
    courses_rejected_reasons jsonb DEFAULT '[]'::jsonb,
    courses_suspended_reasons jsonb DEFAULT '[]'::jsonb,
    schools_added integer DEFAULT 0,
    schools_verified_ids integer[] DEFAULT ARRAY[]::integer[],
    schools_rejected_ids integer[] DEFAULT ARRAY[]::integer[],
    schools_suspended_ids integer[] DEFAULT ARRAY[]::integer[],
    schools_rejected_reasons jsonb DEFAULT '[]'::jsonb,
    schools_suspended_reasons jsonb DEFAULT '[]'::jsonb,
    credentials_verified_ids integer[] DEFAULT ARRAY[]::integer[],
    credentials_rejected_ids integer[] DEFAULT ARRAY[]::integer[],
    credentials_suspended_ids integer[] DEFAULT ARRAY[]::integer[],
    credentials_rejected_reasons jsonb DEFAULT '[]'::jsonb,
    credentials_suspended_reasons jsonb DEFAULT '[]'::jsonb,
    students_verified_ids integer[] DEFAULT ARRAY[]::integer[],
    students_suspended_ids integer[] DEFAULT ARRAY[]::integer[],
    students_suspended_reasons jsonb DEFAULT '[]'::jsonb,
    contents_approved_ids integer[] DEFAULT ARRAY[]::integer[],
    contents_rejected_ids integer[] DEFAULT ARRAY[]::integer[],
    contents_rejected_reasons jsonb DEFAULT '[]'::jsonb,
    admins_invited integer DEFAULT 0,
    admins_verified integer DEFAULT 0,
    admins_suspended integer DEFAULT 0,
    admins_removed integer DEFAULT 0,
    admins_invited_ids integer[] DEFAULT ARRAY[]::integer[],
    admins_verified_ids integer[] DEFAULT ARRAY[]::integer[],
    admins_suspended_ids integer[] DEFAULT ARRAY[]::integer[],
    admins_removed_ids integer[] DEFAULT ARRAY[]::integer[],
    admins_suspended_reasons jsonb DEFAULT '[]'::jsonb,
    admins_removed_reasons jsonb DEFAULT '[]'::jsonb,
    credentials_reactivated_ids integer[] DEFAULT ARRAY[]::integer[],
    courses_reactivated_ids integer[] DEFAULT ARRAY[]::integer[],
    schools_reactivated_ids integer[] DEFAULT ARRAY[]::integer[],
    students_reactivated_ids integer[] DEFAULT ARRAY[]::integer[],
    badges jsonb DEFAULT '[]'::jsonb,
    status character varying(50) DEFAULT 'active'::character varying,
    status_by integer,
    status_reason text,
    suspended_until timestamp without time zone
);


--
-- Name: admin_portfolio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_portfolio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_portfolio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_portfolio_id_seq OWNED BY public.admin_portfolio.id;


--
-- Name: admin_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_profile (
    id integer NOT NULL,
    password_hash character varying(255),
    first_name character varying(100) NOT NULL,
    father_name character varying(100) NOT NULL,
    grandfather_name character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    departments text[] DEFAULT ARRAY[]::text[],
    email text[] DEFAULT ARRAY[]::text[],
    phone_number text[] DEFAULT ARRAY[]::text[],
    annual_leave_balance integer DEFAULT 20,
    sick_leave_balance integer DEFAULT 10,
    personal_leave_balance integer DEFAULT 5
);


--
-- Name: admin_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_profile_id_seq OWNED BY public.admin_profile.id;


--
-- Name: admin_resignations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_resignations (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    reason character varying(100) NOT NULL,
    reason_details text,
    comments text,
    status character varying(20) DEFAULT 'pending'::character varying,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    last_working_day date,
    exit_interview_completed boolean DEFAULT false,
    exit_interview_notes text,
    assets_returned boolean DEFAULT false,
    access_revoked boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: admin_resignations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_resignations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_resignations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_resignations_id_seq OWNED BY public.admin_resignations.id;


--
-- Name: admin_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_reviews (
    id integer NOT NULL,
    review_id character varying(50) NOT NULL,
    admin_id integer,
    admin_name character varying(255) NOT NULL,
    reviewer_name character varying(255) NOT NULL,
    reviewer_role character varying(50),
    rating numeric NOT NULL,
    response_time_rating numeric,
    accuracy_rating numeric,
    comment text,
    review_type character varying(50) DEFAULT 'general'::character varying,
    related_course_id character varying(50),
    metrics jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    department character varying(100)
);


--
-- Name: admin_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_reviews_id_seq OWNED BY public.admin_reviews.id;


--
-- Name: affiliate_program; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliate_program (
    id integer NOT NULL,
    enabled boolean DEFAULT false,
    payout_threshold numeric(10,2) DEFAULT 1000.0,
    payout_schedule character varying(50) DEFAULT 'monthly'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: affiliate_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.affiliate_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: affiliate_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.affiliate_settings_id_seq OWNED BY public.affiliate_program.id;


--
-- Name: affiliate_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliate_tiers (
    id integer NOT NULL,
    tier_level integer NOT NULL,
    tier_name character varying(100) NOT NULL,
    commission_rate numeric(5,2) DEFAULT 0 NOT NULL,
    duration_months integer DEFAULT 12 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    program_id integer NOT NULL,
    business_type character varying(50) DEFAULT 'tutoring'::character varying NOT NULL,
    CONSTRAINT affiliate_tiers_business_type_check CHECK (((business_type)::text = ANY ((ARRAY['tutoring'::character varying, 'subscription'::character varying, 'advertisement'::character varying])::text[])))
);


--
-- Name: affiliate_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.affiliate_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: affiliate_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.affiliate_tiers_id_seq OWNED BY public.affiliate_tiers.id;


--
-- Name: astegni_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.astegni_reviews (
    id integer NOT NULL,
    reviewer_id integer NOT NULL,
    rating numeric(3,2),
    ease_of_use integer NOT NULL,
    features_quality integer NOT NULL,
    support_quality integer NOT NULL,
    pricing integer NOT NULL,
    review_text text,
    would_recommend boolean,
    is_featured boolean DEFAULT false,
    count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT astegni_reviews_ease_of_use_check CHECK (((ease_of_use >= 1) AND (ease_of_use <= 5))),
    CONSTRAINT astegni_reviews_features_quality_check CHECK (((features_quality >= 1) AND (features_quality <= 5))),
    CONSTRAINT astegni_reviews_overall_value_check CHECK (((pricing >= 1) AND (pricing <= 5))),
    CONSTRAINT astegni_reviews_support_quality_check CHECK (((support_quality >= 1) AND (support_quality <= 5)))
);


--
-- Name: astegni_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.astegni_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: astegni_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.astegni_reviews_id_seq OWNED BY public.astegni_reviews.id;


--
-- Name: base_price_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.base_price_rules (
    id integer NOT NULL,
    rule_name character varying(200) NOT NULL,
    subject_category character varying(100) NOT NULL,
    session_format character varying(50) NOT NULL,
    base_price_per_hour numeric(10,2) NOT NULL,
    credential_bonus numeric(10,2) DEFAULT 0,
    priority integer DEFAULT 2,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    experience_bonus_per_year numeric(10,2) DEFAULT 0 NOT NULL,
    min_grade_level integer DEFAULT 1,
    max_grade_level integer DEFAULT 12,
    country character varying(100) DEFAULT 'all'::character varying,
    currency character varying(10) DEFAULT 'ETB'::character varying,
    CONSTRAINT base_price_rules_base_price_per_hour_check CHECK ((base_price_per_hour > (0)::numeric)),
    CONSTRAINT base_price_rules_credential_bonus_check CHECK ((credential_bonus >= (0)::numeric)),
    CONSTRAINT base_price_rules_priority_check CHECK (((priority >= 1) AND (priority <= 3))),
    CONSTRAINT check_grade_level_range CHECK (((min_grade_level <= max_grade_level) AND (min_grade_level >= 1) AND (max_grade_level <= 14)))
);


--
-- Name: base_price_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.base_price_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: base_price_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.base_price_rules_id_seq OWNED BY public.base_price_rules.id;


--
-- Name: brand_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_packages (
    id integer NOT NULL,
    package_title character varying(200) NOT NULL,
    package_price numeric(10,2) NOT NULL,
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    label character varying(50) DEFAULT 'none'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    duration_days integer DEFAULT 30,
    is_base_package boolean DEFAULT false,
    currency character varying(10) DEFAULT 'ETB'::character varying,
    discount numeric(5,2) DEFAULT 0
);


--
-- Name: campaign_packages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaign_packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaign_packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaign_packages_id_seq OWNED BY public.brand_packages.id;


--
-- Name: cpi_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cpi_settings (
    id integer NOT NULL,
    base_rate numeric(10,4) DEFAULT 0.05 NOT NULL,
    tutor_premium numeric(10,4) DEFAULT 0.02,
    student_premium numeric(10,4) DEFAULT 0.015,
    parent_premium numeric(10,4) DEFAULT 0.018,
    national_premium numeric(10,4) DEFAULT 0.01,
    regional_premium numeric(10,4) DEFAULT 0.025,
    currency character varying(10) DEFAULT 'ETB'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer,
    leaderboard_banner_premium numeric(10,4) DEFAULT 0.01,
    logo_premium numeric(10,4) DEFAULT 0.02,
    in_session_skyscrapper_banner_premium numeric(10,4) DEFAULT 0.05,
    advertiser_premium numeric(10,4) DEFAULT 0,
    user_premium numeric(10,4) DEFAULT 0,
    addis_premium numeric(10,4) DEFAULT 0,
    oromia_premium numeric(10,4) DEFAULT 0,
    amhara_premium numeric(10,4) DEFAULT 0,
    tigray_premium numeric(10,4) DEFAULT 0,
    snnpr_premium numeric(10,4) DEFAULT 0,
    somali_premium numeric(10,4) DEFAULT 0,
    afar_premium numeric(10,4) DEFAULT 0,
    benishangul_premium numeric(10,4) DEFAULT 0,
    gambela_premium numeric(10,4) DEFAULT 0,
    harari_premium numeric(10,4) DEFAULT 0,
    diredawa_premium numeric(10,4) DEFAULT 0,
    sidama_premium numeric(10,4) DEFAULT 0,
    region_exclusion_premiums jsonb DEFAULT '{}'::jsonb,
    country_regions jsonb DEFAULT '{}'::jsonb,
    country character varying(100) DEFAULT 'all'::character varying
);


--
-- Name: cpi_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cpi_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cpi_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cpi_settings_id_seq OWNED BY public.cpi_settings.id;


--
-- Name: manage_admins_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manage_admins_profile (
    id integer NOT NULL,
    admin_id integer,
    username character varying(100),
    bio text,
    quote text,
    cover_image text,
    profile_image text,
    languages jsonb DEFAULT '[]'::jsonb,
    hero_subtitle character varying(255),
    badges jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    hero_title jsonb DEFAULT '[]'::jsonb,
    location jsonb DEFAULT '[]'::jsonb,
    allow_location boolean DEFAULT false,
    display_location boolean DEFAULT true,
    employee_id character varying(100),
    "position" character varying(100),
    last_login timestamp without time zone,
    joined_in timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: manage_admins_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manage_admins_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manage_admins_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manage_admins_profile_id_seq OWNED BY public.manage_admins_profile.id;


--
-- Name: manage_advertisers_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manage_advertisers_profile (
    id integer NOT NULL,
    admin_id integer,
    username character varying(100),
    bio text,
    quote text,
    cover_image text,
    profile_image text,
    languages jsonb DEFAULT '[]'::jsonb,
    hero_subtitle character varying(255),
    hero_title jsonb DEFAULT '[]'::jsonb,
    badges jsonb DEFAULT '[]'::jsonb,
    location jsonb DEFAULT '[]'::jsonb,
    allow_location boolean DEFAULT false,
    display_location boolean DEFAULT true,
    employee_id character varying(100),
    "position" character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    last_login timestamp without time zone,
    joined_in timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: manage_advertisers_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manage_advertisers_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manage_advertisers_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manage_advertisers_profile_id_seq OWNED BY public.manage_advertisers_profile.id;


--
-- Name: manage_contents_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manage_contents_profile (
    id integer NOT NULL,
    admin_id integer,
    badges jsonb DEFAULT '[{"text": "✔ System Administrator", "class": "verified"}, {"text": "📁 Content Management", "class": "school"}, {"text": "📊 Content Expert", "class": "expert"}]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    bio text,
    quote text,
    cover_image text,
    profile_image text,
    languages jsonb DEFAULT '[]'::jsonb,
    hero_subtitle character varying(255),
    username character varying(100),
    hero_title jsonb DEFAULT '[]'::jsonb,
    location jsonb DEFAULT '[]'::jsonb,
    allow_location boolean DEFAULT false,
    display_location boolean DEFAULT true,
    employee_id character varying(100),
    "position" character varying(100),
    last_login timestamp without time zone,
    joined_in timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: manage_contents_profile_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manage_contents_profile_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manage_contents_profile_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manage_contents_profile_profile_id_seq OWNED BY public.manage_contents_profile.id;


--
-- Name: manage_courses_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manage_courses_profile (
    id integer NOT NULL,
    admin_id integer,
    badges jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    username character varying(100),
    bio text,
    quote text,
    cover_image text,
    profile_image text,
    languages jsonb DEFAULT '[]'::jsonb,
    hero_subtitle character varying(255),
    hero_title jsonb DEFAULT '[]'::jsonb,
    location jsonb DEFAULT '[]'::jsonb,
    allow_location boolean DEFAULT false,
    display_location boolean DEFAULT true,
    employee_id character varying(100),
    "position" character varying(100),
    last_login timestamp without time zone,
    joined_in timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: manage_courses_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manage_courses_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manage_courses_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manage_courses_profile_id_seq OWNED BY public.manage_courses_profile.id;


--
-- Name: manage_credentials_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manage_credentials_profile (
    id integer NOT NULL,
    admin_id integer,
    username character varying(100),
    bio text,
    quote text,
    cover_image text,
    profile_image text,
    languages jsonb DEFAULT '[]'::jsonb,
    hero_subtitle character varying(255),
    badges jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    hero_title jsonb DEFAULT '[]'::jsonb,
    location jsonb DEFAULT '[]'::jsonb,
    display_location boolean DEFAULT true,
    allow_location boolean DEFAULT false,
    employee_id character varying(100),
    "position" character varying(100),
    last_login timestamp without time zone,
    joined_in timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: manage_credentials_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manage_credentials_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manage_credentials_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manage_credentials_profile_id_seq OWNED BY public.manage_credentials_profile.id;


--
-- Name: manage_customers_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manage_customers_profile (
    id integer NOT NULL,
    admin_id integer,
    badges jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    username character varying(100),
    bio text,
    quote text,
    cover_image text,
    profile_image text,
    languages jsonb DEFAULT '[]'::jsonb,
    hero_subtitle character varying(255),
    hero_title jsonb DEFAULT '[]'::jsonb,
    location jsonb DEFAULT '[]'::jsonb,
    allow_location boolean DEFAULT false,
    display_location boolean DEFAULT true,
    employee_id character varying(100),
    "position" character varying(100),
    last_login timestamp without time zone,
    joined_in timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: manage_customers_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manage_customers_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manage_customers_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manage_customers_profile_id_seq OWNED BY public.manage_customers_profile.id;


--
-- Name: manage_schools_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manage_schools_profile (
    id integer NOT NULL,
    admin_id integer,
    badges jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    username character varying(100),
    bio text,
    quote text,
    cover_image text,
    profile_image text,
    languages jsonb DEFAULT '[]'::jsonb,
    hero_subtitle character varying(255),
    hero_title jsonb DEFAULT '[]'::jsonb,
    location jsonb DEFAULT '[]'::jsonb,
    allow_location boolean DEFAULT false,
    display_location boolean DEFAULT true,
    employee_id character varying(100),
    "position" character varying(100),
    last_login timestamp without time zone,
    joined_in timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: manage_schools_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manage_schools_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manage_schools_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manage_schools_profile_id_seq OWNED BY public.manage_schools_profile.id;


--
-- Name: manage_system_settings_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manage_system_settings_profile (
    id integer NOT NULL,
    admin_id integer,
    badges jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    username character varying(100),
    bio text,
    quote text,
    cover_image text,
    profile_image text,
    languages jsonb DEFAULT '[]'::jsonb,
    hero_subtitle character varying(255),
    hero_title jsonb DEFAULT '[]'::jsonb,
    location jsonb DEFAULT '[]'::jsonb,
    allow_location boolean DEFAULT false,
    display_location boolean DEFAULT true,
    employee_id character varying(100),
    "position" character varying(100),
    last_login timestamp without time zone,
    joined_in timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: manage_system_settings_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manage_system_settings_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manage_system_settings_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manage_system_settings_profile_id_seq OWNED BY public.manage_system_settings_profile.id;


--
-- Name: manage_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manage_uploads (
    id integer NOT NULL,
    admin_id integer,
    "position" character varying(255),
    joined_date date,
    rating numeric DEFAULT 0.00,
    total_reviews integer DEFAULT 0,
    badges jsonb DEFAULT '[]'::jsonb,
    events_created integer DEFAULT 0,
    clubs_created integer DEFAULT 0,
    events_moderated integer DEFAULT 0,
    clubs_moderated integer DEFAULT 0,
    avg_moderation_time_hours integer DEFAULT 0,
    permissions jsonb DEFAULT '{"can_create_clubs": true, "can_delete_clubs": false, "can_create_events": true, "can_delete_events": false, "can_moderate_clubs": true, "can_moderate_events": true}'::jsonb,
    username character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: manage_uploads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manage_uploads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manage_uploads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manage_uploads_id_seq OWNED BY public.manage_uploads.id;


--
-- Name: otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otps (
    id integer NOT NULL,
    user_id integer,
    otp_code character varying(6) NOT NULL,
    purpose character varying NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_used boolean,
    created_at timestamp without time zone,
    contact character varying(255),
    is_otp_verified boolean DEFAULT false
);


--
-- Name: otps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.otps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: otps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.otps_id_seq OWNED BY public.otps.id;


--
-- Name: payment_gateways; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_gateways (
    id integer NOT NULL,
    gateway_name character varying(100) NOT NULL,
    enabled boolean DEFAULT false,
    api_key text,
    secret_key text,
    webhook_url text,
    test_mode boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: payment_gateways_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_gateways_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_gateways_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_gateways_id_seq OWNED BY public.payment_gateways.id;


--
-- Name: subscription_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_features (
    id integer NOT NULL,
    subscription_plan_id integer NOT NULL,
    user_role character varying(50) NOT NULL,
    feature_name character varying(255) NOT NULL,
    feature_description text,
    is_enabled boolean DEFAULT true NOT NULL,
    feature_value text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE subscription_features; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.subscription_features IS 'Features available for each subscription plan, role-specific';


--
-- Name: COLUMN subscription_features.subscription_plan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_features.subscription_plan_id IS 'References subscription_plans.id';


--
-- Name: COLUMN subscription_features.user_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_features.user_role IS 'Role this feature applies to: tutor, student, parent, advertiser';


--
-- Name: COLUMN subscription_features.feature_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_features.feature_name IS 'Name of the feature (e.g., profile_boost, priority_support, advanced_analytics)';


--
-- Name: COLUMN subscription_features.feature_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_features.feature_value IS 'Optional configuration value for the feature';


--
-- Name: subscription_features_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_features_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_features_id_seq OWNED BY public.subscription_features.id;


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id integer NOT NULL,
    currency character varying(10) DEFAULT 'ETB'::character varying,
    discount_yearly numeric(5,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    package_title character varying(255) DEFAULT 'Untitled'::character varying NOT NULL,
    package_price numeric(10,2) DEFAULT 0,
    is_base_package boolean DEFAULT false,
    discount_3_months numeric(5,2) DEFAULT 0,
    discount_6_months numeric(5,2) DEFAULT 0,
    label character varying(50) DEFAULT 'none'::character varying,
    duration_days integer DEFAULT 30,
    country character varying(100) DEFAULT 'all'::character varying
);


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_plans_id_seq OWNED BY public.subscription_plans.id;


--
-- Name: system_affiliate_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_affiliate_settings (
    id integer NOT NULL,
    program_name character varying(200) DEFAULT 'Astegni Affiliate Program'::character varying,
    commission_rate numeric(5,2) DEFAULT 10.00,
    commission_type character varying(50) DEFAULT 'percentage'::character varying,
    min_payout numeric(10,2) DEFAULT 500.00,
    cookie_duration_days integer DEFAULT 30,
    enabled boolean DEFAULT false,
    auto_approve boolean DEFAULT false,
    payment_method character varying(100),
    payment_schedule character varying(50) DEFAULT 'monthly'::character varying,
    terms_and_conditions text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_affiliate_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_affiliate_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_affiliate_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_affiliate_settings_id_seq OWNED BY public.system_affiliate_settings.id;


--
-- Name: system_api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_api_keys (
    id integer NOT NULL,
    key_name character varying(200) NOT NULL,
    api_key character varying(500) NOT NULL,
    api_secret character varying(500),
    user_id integer,
    permissions json DEFAULT '[]'::jsonb,
    rate_limit_override integer,
    is_active boolean DEFAULT true,
    expires_at timestamp without time zone,
    last_used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_api_keys_id_seq OWNED BY public.system_api_keys.id;


--
-- Name: system_api_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_api_settings (
    id integer NOT NULL,
    api_enabled boolean DEFAULT true,
    rate_limit_per_minute integer DEFAULT 100,
    rate_limit_per_hour integer DEFAULT 5000,
    require_api_key boolean DEFAULT true,
    cors_enabled boolean DEFAULT true,
    allowed_origins json DEFAULT '["*"]'::jsonb,
    webhook_enabled boolean DEFAULT false,
    webhook_secret character varying(500),
    api_version character varying(20) DEFAULT 'v1'::character varying,
    documentation_url character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_api_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_api_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_api_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_api_settings_id_seq OWNED BY public.system_api_settings.id;


--
-- Name: system_backup_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_backup_config (
    id integer NOT NULL,
    auto_backup_enabled boolean DEFAULT true,
    backup_frequency character varying(50) DEFAULT 'daily'::character varying,
    backup_time character varying(10) DEFAULT '02:00'::character varying,
    backup_retention_days integer DEFAULT 30,
    backup_location character varying(500),
    include_media boolean DEFAULT false,
    include_database boolean DEFAULT true,
    include_logs boolean DEFAULT false,
    compression_enabled boolean DEFAULT true,
    encryption_enabled boolean DEFAULT false,
    last_backup_at timestamp without time zone,
    next_backup_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_backup_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_backup_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_backup_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_backup_config_id_seq OWNED BY public.system_backup_config.id;


--
-- Name: system_backup_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_backup_history (
    id integer NOT NULL,
    backup_type character varying(50),
    backup_size_mb numeric(10,2),
    backup_location character varying(500),
    status character varying(50) DEFAULT 'completed'::character varying,
    error_message text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_backup_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_backup_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_backup_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_backup_history_id_seq OWNED BY public.system_backup_history.id;


--
-- Name: system_email_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_email_config (
    id integer NOT NULL,
    smtp_host character varying(255),
    smtp_port integer DEFAULT 587,
    smtp_username character varying(255),
    smtp_password character varying(255),
    smtp_encryption character varying(10) DEFAULT 'TLS'::character varying,
    from_email character varying(255),
    from_name character varying(255) DEFAULT 'Astegni'::character varying,
    reply_to_email character varying(255),
    daily_limit integer DEFAULT 1000,
    enabled boolean DEFAULT true,
    test_mode boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    account_name character varying(100) DEFAULT 'Primary Email'::character varying,
    provider character varying(50) DEFAULT 'custom'::character varying
);


--
-- Name: system_email_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_email_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_email_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_email_config_id_seq OWNED BY public.system_email_config.id;


--
-- Name: system_email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_email_templates (
    id integer NOT NULL,
    template_name character varying(100) NOT NULL,
    subject character varying(500) NOT NULL,
    body text NOT NULL,
    variables json DEFAULT '[]'::jsonb,
    enabled boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_email_templates_id_seq OWNED BY public.system_email_templates.id;


--
-- Name: system_general_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_general_settings (
    id integer NOT NULL,
    platform_name character varying(255) DEFAULT 'Astegni'::character varying,
    platform_tagline character varying(500),
    platform_description text,
    primary_language character varying(50) DEFAULT 'English'::character varying,
    timezone character varying(100) DEFAULT 'Africa/Addis_Ababa'::character varying,
    date_format character varying(50) DEFAULT 'YYYY-MM-DD'::character varying,
    time_format character varying(50) DEFAULT '24h'::character varying,
    currency character varying(10) DEFAULT 'ETB'::character varying,
    currency_symbol character varying(10) DEFAULT 'ETB'::character varying,
    items_per_page integer DEFAULT 15,
    max_upload_size_mb integer DEFAULT 200,
    allowed_file_types json DEFAULT '["jpg", "jpeg", "png", "gif", "mp4", "mov", "pdf", "doc", "docx"]'::jsonb,
    maintenance_mode boolean DEFAULT false,
    registration_enabled boolean DEFAULT true,
    email_verification_required boolean DEFAULT true,
    phone_verification_required boolean DEFAULT false,
    contact_email_backup character varying(500),
    contact_phone_backup character varying(500),
    admin_email character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    site_url character varying(255),
    contact_phone jsonb,
    contact_email jsonb
);


--
-- Name: system_general_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_general_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_general_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_general_settings_id_seq OWNED BY public.system_general_settings.id;


--
-- Name: system_impression_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_impression_stats (
    id integer NOT NULL,
    stat_date date DEFAULT CURRENT_DATE,
    content_type character varying(50),
    total_impressions integer DEFAULT 0,
    unique_users integer DEFAULT 0,
    avg_duration_seconds numeric(10,2) DEFAULT 0.00,
    total_duration_seconds bigint DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_impression_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_impression_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_impression_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_impression_stats_id_seq OWNED BY public.system_impression_stats.id;


--
-- Name: system_impressions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_impressions (
    id integer NOT NULL,
    content_type character varying(50),
    content_id integer,
    user_id integer,
    session_id character varying(255),
    ip_address character varying(50),
    user_agent text,
    referer text,
    page_url text,
    view_duration_seconds integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_impressions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_impressions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_impressions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_impressions_id_seq OWNED BY public.system_impressions.id;


--
-- Name: system_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_integrations (
    id integer NOT NULL,
    service_name character varying(100) NOT NULL,
    display_name character varying(200),
    service_type character varying(50),
    api_key character varying(500),
    api_secret character varying(500),
    config json DEFAULT '{}'::jsonb,
    enabled boolean DEFAULT false,
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_integrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_integrations_id_seq OWNED BY public.system_integrations.id;


--
-- Name: system_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_logs (
    id integer NOT NULL,
    log_level character varying(20) DEFAULT 'info'::character varying,
    log_type character varying(50),
    message text,
    user_id integer,
    ip_address character varying(50),
    user_agent text,
    request_method character varying(10),
    request_url text,
    response_code integer,
    duration_ms integer,
    metadata json DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_logs_id_seq OWNED BY public.system_logs.id;


--
-- Name: system_maintenance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_maintenance (
    id integer NOT NULL,
    is_active boolean DEFAULT false,
    message text,
    allowed_ips json DEFAULT '[]'::jsonb,
    bypass_roles json DEFAULT '["super_admin"]'::jsonb,
    scheduled_start timestamp without time zone,
    scheduled_end timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_maintenance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_maintenance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_maintenance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_maintenance_id_seq OWNED BY public.system_maintenance.id;


--
-- Name: system_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_media (
    id integer NOT NULL,
    uploader_id integer NOT NULL,
    media_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    file_url character varying(500) NOT NULL,
    thumbnail character varying(500),
    category character varying(100),
    targets jsonb DEFAULT '[]'::jsonb,
    tags jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    download_count integer DEFAULT 0,
    likes integer DEFAULT 0,
    dislikes integer DEFAULT 0,
    comments jsonb DEFAULT '[]'::jsonb,
    shares integer DEFAULT 0,
    saves integer DEFAULT 0,
    is_favorite boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_media_id_seq OWNED BY public.system_media.id;


--
-- Name: system_media_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_media_settings (
    id integer NOT NULL,
    max_image_size_mb integer DEFAULT 5,
    max_video_size_mb integer DEFAULT 200,
    max_document_size_mb integer DEFAULT 10,
    max_audio_size_mb integer DEFAULT 50,
    storage_limit_gb integer DEFAULT 10,
    allowed_video_formats json DEFAULT '["mp4", "mov", "avi", "webm"]'::jsonb,
    allowed_image_formats json DEFAULT '["jpg", "jpeg", "png", "gif", "webp"]'::jsonb,
    allowed_document_formats json DEFAULT '["pdf", "doc", "docx", "txt"]'::jsonb,
    allowed_audio_formats json DEFAULT '["mp3", "wav", "ogg", "m4a"]'::jsonb,
    auto_optimize_images boolean DEFAULT true,
    auto_generate_thumbnails boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    max_image_storage_mb integer DEFAULT 0,
    max_video_storage_mb integer DEFAULT 0,
    auto_optimize_videos boolean DEFAULT false,
    video_quality_max character varying(20) DEFAULT NULL::character varying,
    subscription_plan_id integer
);


--
-- Name: system_media_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_media_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_media_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_media_settings_id_seq OWNED BY public.system_media_settings.id;


--
-- Name: system_payment_gateways; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_payment_gateways (
    id integer NOT NULL,
    gateway_name character varying(100) NOT NULL,
    display_name character varying(200),
    gateway_type character varying(50),
    api_key character varying(500),
    api_secret character varying(500),
    webhook_secret character varying(500),
    test_mode boolean DEFAULT true,
    enabled boolean DEFAULT false,
    supported_currencies json DEFAULT '["ETB"]'::jsonb,
    config json DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_payment_gateways_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_payment_gateways_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_payment_gateways_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_payment_gateways_id_seq OWNED BY public.system_payment_gateways.id;


--
-- Name: system_performance_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_performance_metrics (
    id integer NOT NULL,
    metric_type character varying(50),
    metric_name character varying(200),
    metric_value numeric(15,2),
    unit character varying(50),
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata json DEFAULT '{}'::jsonb
);


--
-- Name: system_performance_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_performance_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_performance_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_performance_metrics_id_seq OWNED BY public.system_performance_metrics.id;


--
-- Name: system_security_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_security_settings (
    id integer NOT NULL,
    two_factor_auth_enabled boolean DEFAULT false,
    two_factor_required_for_admins boolean DEFAULT true,
    session_timeout_minutes integer DEFAULT 30,
    max_login_attempts integer DEFAULT 5,
    lockout_duration_minutes integer DEFAULT 30,
    password_min_length integer DEFAULT 8,
    password_require_uppercase boolean DEFAULT true,
    password_require_lowercase boolean DEFAULT true,
    password_require_numbers boolean DEFAULT true,
    password_require_special boolean DEFAULT true,
    password_expiry_days integer DEFAULT 90,
    ip_whitelist json DEFAULT '[]'::jsonb,
    ip_blacklist json DEFAULT '[]'::jsonb,
    allowed_domains json DEFAULT '[]'::jsonb,
    csrf_protection boolean DEFAULT true,
    rate_limiting_enabled boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_security_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_security_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_security_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_security_settings_id_seq OWNED BY public.system_security_settings.id;


--
-- Name: system_sms_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_sms_config (
    id integer DEFAULT 1 NOT NULL,
    twilio_account_sid character varying(255) DEFAULT ''::character varying NOT NULL,
    twilio_auth_token character varying(255) DEFAULT ''::character varying NOT NULL,
    twilio_from_number character varying(50) DEFAULT ''::character varying NOT NULL,
    default_country_code character varying(10) DEFAULT '+251'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    daily_limit integer DEFAULT 1000 NOT NULL,
    otp_expiry_minutes integer DEFAULT 5 NOT NULL,
    otp_length integer DEFAULT 6 NOT NULL,
    otp_numeric_only boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_sms_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_sms_log (
    id integer NOT NULL,
    phone_number character varying(50) NOT NULL,
    message text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    twilio_sid character varying(255),
    error_message text,
    sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    delivered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_sms_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_sms_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_sms_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_sms_log_id_seq OWNED BY public.system_sms_log.id;


--
-- Name: system_statistics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_statistics (
    id integer NOT NULL,
    stat_date date DEFAULT CURRENT_DATE,
    total_users integer DEFAULT 0,
    total_students integer DEFAULT 0,
    total_tutors integer DEFAULT 0,
    total_parents integer DEFAULT 0,
    total_advertisers integer DEFAULT 0,
    total_admins integer DEFAULT 0,
    active_users_today integer DEFAULT 0,
    new_users_today integer DEFAULT 0,
    total_videos integer DEFAULT 0,
    total_courses integer DEFAULT 0,
    total_reviews integer DEFAULT 0,
    total_revenue numeric(15,2) DEFAULT 0.00,
    storage_used_gb numeric(10,2) DEFAULT 0.00,
    bandwidth_used_gb numeric(10,2) DEFAULT 0.00,
    api_calls_today integer DEFAULT 0,
    error_count_today integer DEFAULT 0,
    avg_response_time_ms numeric(10,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_statistics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_statistics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_statistics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_statistics_id_seq OWNED BY public.system_statistics.id;


--
-- Name: system_subscription_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_subscription_tiers (
    id integer NOT NULL,
    tier_name character varying(100) NOT NULL,
    display_name character varying(200),
    description text,
    price_monthly numeric(10,2) DEFAULT 0.00,
    price_yearly numeric(10,2) DEFAULT 0.00,
    features json DEFAULT '[]'::jsonb,
    limits json DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_subscription_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_subscription_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_subscription_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_subscription_tiers_id_seq OWNED BY public.system_subscription_tiers.id;


--
-- Name: verification_fee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_fee (
    id integer NOT NULL,
    type character varying(50) NOT NULL,
    features jsonb DEFAULT '[]'::jsonb,
    price numeric(10,2) NOT NULL,
    currency character varying(10) DEFAULT 'ETB'::character varying,
    duration_days integer DEFAULT 365,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    country character varying(100) DEFAULT 'all'::character varying
);


--
-- Name: verification_fee_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.verification_fee_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: verification_fee_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.verification_fee_id_seq OWNED BY public.verification_fee.id;


--
-- Name: admin_credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_credentials ALTER COLUMN id SET DEFAULT nextval('public.admin_credentials_id_seq'::regclass);


--
-- Name: admin_invitations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_invitations ALTER COLUMN id SET DEFAULT nextval('public.admin_invitations_id_seq'::regclass);


--
-- Name: admin_leave_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_leave_requests ALTER COLUMN id SET DEFAULT nextval('public.admin_leave_requests_id_seq'::regclass);


--
-- Name: admin_portfolio id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_portfolio ALTER COLUMN id SET DEFAULT nextval('public.admin_portfolio_id_seq'::regclass);


--
-- Name: admin_profile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_profile ALTER COLUMN id SET DEFAULT nextval('public.admin_profile_id_seq'::regclass);


--
-- Name: admin_resignations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_resignations ALTER COLUMN id SET DEFAULT nextval('public.admin_resignations_id_seq'::regclass);


--
-- Name: admin_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_reviews ALTER COLUMN id SET DEFAULT nextval('public.admin_reviews_id_seq'::regclass);


--
-- Name: affiliate_program id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_program ALTER COLUMN id SET DEFAULT nextval('public.affiliate_settings_id_seq'::regclass);


--
-- Name: affiliate_tiers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_tiers ALTER COLUMN id SET DEFAULT nextval('public.affiliate_tiers_id_seq'::regclass);


--
-- Name: astegni_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.astegni_reviews ALTER COLUMN id SET DEFAULT nextval('public.astegni_reviews_id_seq'::regclass);


--
-- Name: base_price_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_price_rules ALTER COLUMN id SET DEFAULT nextval('public.base_price_rules_id_seq'::regclass);


--
-- Name: brand_packages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_packages ALTER COLUMN id SET DEFAULT nextval('public.campaign_packages_id_seq'::regclass);


--
-- Name: cpi_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cpi_settings ALTER COLUMN id SET DEFAULT nextval('public.cpi_settings_id_seq'::regclass);


--
-- Name: manage_admins_profile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_admins_profile ALTER COLUMN id SET DEFAULT nextval('public.manage_admins_profile_id_seq'::regclass);


--
-- Name: manage_advertisers_profile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_advertisers_profile ALTER COLUMN id SET DEFAULT nextval('public.manage_advertisers_profile_id_seq'::regclass);


--
-- Name: manage_contents_profile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_contents_profile ALTER COLUMN id SET DEFAULT nextval('public.manage_contents_profile_profile_id_seq'::regclass);


--
-- Name: manage_courses_profile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_courses_profile ALTER COLUMN id SET DEFAULT nextval('public.manage_courses_profile_id_seq'::regclass);


--
-- Name: manage_credentials_profile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_credentials_profile ALTER COLUMN id SET DEFAULT nextval('public.manage_credentials_profile_id_seq'::regclass);


--
-- Name: manage_customers_profile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_customers_profile ALTER COLUMN id SET DEFAULT nextval('public.manage_customers_profile_id_seq'::regclass);


--
-- Name: manage_schools_profile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_schools_profile ALTER COLUMN id SET DEFAULT nextval('public.manage_schools_profile_id_seq'::regclass);


--
-- Name: manage_system_settings_profile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_system_settings_profile ALTER COLUMN id SET DEFAULT nextval('public.manage_system_settings_profile_id_seq'::regclass);


--
-- Name: manage_uploads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_uploads ALTER COLUMN id SET DEFAULT nextval('public.manage_uploads_id_seq'::regclass);


--
-- Name: otps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otps ALTER COLUMN id SET DEFAULT nextval('public.otps_id_seq'::regclass);


--
-- Name: payment_gateways id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_gateways ALTER COLUMN id SET DEFAULT nextval('public.payment_gateways_id_seq'::regclass);


--
-- Name: subscription_features id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_features ALTER COLUMN id SET DEFAULT nextval('public.subscription_features_id_seq'::regclass);


--
-- Name: subscription_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.subscription_plans_id_seq'::regclass);


--
-- Name: system_affiliate_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_affiliate_settings ALTER COLUMN id SET DEFAULT nextval('public.system_affiliate_settings_id_seq'::regclass);


--
-- Name: system_api_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_api_keys ALTER COLUMN id SET DEFAULT nextval('public.system_api_keys_id_seq'::regclass);


--
-- Name: system_api_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_api_settings ALTER COLUMN id SET DEFAULT nextval('public.system_api_settings_id_seq'::regclass);


--
-- Name: system_backup_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_backup_config ALTER COLUMN id SET DEFAULT nextval('public.system_backup_config_id_seq'::regclass);


--
-- Name: system_backup_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_backup_history ALTER COLUMN id SET DEFAULT nextval('public.system_backup_history_id_seq'::regclass);


--
-- Name: system_email_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_email_config ALTER COLUMN id SET DEFAULT nextval('public.system_email_config_id_seq'::regclass);


--
-- Name: system_email_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_email_templates ALTER COLUMN id SET DEFAULT nextval('public.system_email_templates_id_seq'::regclass);


--
-- Name: system_general_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_general_settings ALTER COLUMN id SET DEFAULT nextval('public.system_general_settings_id_seq'::regclass);


--
-- Name: system_impression_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_impression_stats ALTER COLUMN id SET DEFAULT nextval('public.system_impression_stats_id_seq'::regclass);


--
-- Name: system_impressions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_impressions ALTER COLUMN id SET DEFAULT nextval('public.system_impressions_id_seq'::regclass);


--
-- Name: system_integrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_integrations ALTER COLUMN id SET DEFAULT nextval('public.system_integrations_id_seq'::regclass);


--
-- Name: system_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs ALTER COLUMN id SET DEFAULT nextval('public.system_logs_id_seq'::regclass);


--
-- Name: system_maintenance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_maintenance ALTER COLUMN id SET DEFAULT nextval('public.system_maintenance_id_seq'::regclass);


--
-- Name: system_media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_media ALTER COLUMN id SET DEFAULT nextval('public.system_media_id_seq'::regclass);


--
-- Name: system_media_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_media_settings ALTER COLUMN id SET DEFAULT nextval('public.system_media_settings_id_seq'::regclass);


--
-- Name: system_payment_gateways id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_payment_gateways ALTER COLUMN id SET DEFAULT nextval('public.system_payment_gateways_id_seq'::regclass);


--
-- Name: system_performance_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_performance_metrics ALTER COLUMN id SET DEFAULT nextval('public.system_performance_metrics_id_seq'::regclass);


--
-- Name: system_security_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_security_settings ALTER COLUMN id SET DEFAULT nextval('public.system_security_settings_id_seq'::regclass);


--
-- Name: system_sms_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_sms_log ALTER COLUMN id SET DEFAULT nextval('public.system_sms_log_id_seq'::regclass);


--
-- Name: system_statistics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_statistics ALTER COLUMN id SET DEFAULT nextval('public.system_statistics_id_seq'::regclass);


--
-- Name: system_subscription_tiers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_subscription_tiers ALTER COLUMN id SET DEFAULT nextval('public.system_subscription_tiers_id_seq'::regclass);


--
-- Name: verification_fee id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_fee ALTER COLUMN id SET DEFAULT nextval('public.verification_fee_id_seq'::regclass);


--
-- Data for Name: admin_credentials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_credentials (id, uploader_id, uploader_role, document_type, title, description, issued_by, date_of_issue, expiry_date, document_url, file_name, file_type, file_size, created_at, updated_at, verification_status, is_verified, verified_by_admin_id, rejection_reason, rejected_at, is_featured) FROM stdin;
\.


--
-- Data for Name: admin_invitations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_invitations (id, first_name, father_name, grandfather_name, email, phone_number, department, "position", employee_id, welcome_message, invited_by, status, admin_id, accepted_at, created_at, updated_at, expires_at, is_otp_verified) FROM stdin;
\.


--
-- Data for Name: admin_leave_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_leave_requests (id, admin_id, leave_type, start_date, end_date, reason, status, approved_by, approved_at, rejection_reason, emergency_contact_name, emergency_contact_phone, handover_notes, attachments, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_portfolio; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_portfolio (id, admin_id, departments, total_actions, courses_verified, courses_rejected, courses_suspended, courses_reactivated, schools_verified, schools_rejected, schools_suspended, schools_reactivated, credentials_verified, credentials_rejected, credentials_suspended, credentials_reactivated, students_verified, students_suspended, students_reactivated, contents_approved, contents_rejected, contents_flagged, contents_removed, reviews_approved, reviews_rejected, reviews_flagged, campaigns_approved, campaigns_rejected, campaigns_paused, advertisers_verified, advertisers_rejected, advertisers_suspended, tickets_resolved, tickets_escalated, recent_actions, created_at, updated_at, courses_created, courses_verified_ids, courses_rejected_ids, courses_suspended_ids, courses_rejected_reasons, courses_suspended_reasons, schools_added, schools_verified_ids, schools_rejected_ids, schools_suspended_ids, schools_rejected_reasons, schools_suspended_reasons, credentials_verified_ids, credentials_rejected_ids, credentials_suspended_ids, credentials_rejected_reasons, credentials_suspended_reasons, students_verified_ids, students_suspended_ids, students_suspended_reasons, contents_approved_ids, contents_rejected_ids, contents_rejected_reasons, admins_invited, admins_verified, admins_suspended, admins_removed, admins_invited_ids, admins_verified_ids, admins_suspended_ids, admins_removed_ids, admins_suspended_reasons, admins_removed_reasons, credentials_reactivated_ids, courses_reactivated_ids, schools_reactivated_ids, students_reactivated_ids, badges, status, status_by, status_reason, suspended_until) FROM stdin;
\.


--
-- Data for Name: admin_profile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_profile (id, password_hash, first_name, father_name, grandfather_name, created_at, updated_at, departments, email, phone_number, annual_leave_balance, sick_leave_balance, personal_leave_balance) FROM stdin;
3	$2b$12$S..MXB2pFyqxiZRRh8B2vewO1BxqmZ0KhHOdF9qAmZ3D9n0RRjWxu	Abebe	Kebede	Tessema	2025-10-17 20:37:54.540343	2025-10-17 21:38:59.471059	{manage-campaigns,manage-courses}	{test_admin_20251017_203750@astegni.com}	{+251911234567}	20	10	5
4	$2b$12$Yq97mcRckHMWJTXqSF1ZCOmGNzecld.1XPjTrqIqII/PORCJidxqW	Jediael	Jediael	sss	2025-10-17 18:31:11.029173	2025-10-18 12:04:57.081944	{manage-system-settings,manage-contents}	{test1@example.com}	{+251911234567}	20	10	5
6	$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5aDzqiS9U7jTW	Abebe	Kebede	Tesfa	2025-10-19 23:20:12.878719	2025-10-19 23:20:12.874476	{manage-campaigns}	{campaigns@astegni.et}	{+251911234567}	20	10	5
7	$2b$12$bUQEW37ZeWbLn1t2NOHeh.OTvWPw.kplVYGUs9kWDKK5m.6Vauepy	kush	studios	16	2025-10-17 18:38:19.929971	2025-12-03 17:28:46.086535	{manage-courses,manage-schools}	{kushstudios16@gmail.com}	{+251852741963}	20	10	5
1	$2b$12$test	System	Admin	\N	2025-10-19 23:29:04.799529	2025-10-19 23:29:04.799529	{manage-system-settings}	{system_settings@astegni.et}	{}	20	10	5
5	$2b$12$test	Test	NoAccess	\N	2025-10-19 23:28:58.140662	2025-10-19 23:28:58.140662	{"Content Management","User Support"}	{test_no_access@astegni.et}	{}	20	10	5
2	$2b$12$s32L281gJm08DURy8/4f.OAJKJdyrEH56wklu9myJmJHNLcBXYw86	Admin	User	Jesus	2025-10-18 00:44:37.964305	2025-12-09 15:58:57.07088	{manage-system-settings,manage-schools,manage-contents,manage-courses}	{jediael.s.abebe@gmail.com,contact@astegni.com}	{+251911234567}	20	10	5
\.


--
-- Data for Name: admin_resignations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_resignations (id, admin_id, reason, reason_details, comments, status, reviewed_by, reviewed_at, last_working_day, exit_interview_completed, exit_interview_notes, assets_returned, access_revoked, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_reviews (id, review_id, admin_id, admin_name, reviewer_name, reviewer_role, rating, response_time_rating, accuracy_rating, comment, review_type, related_course_id, metrics, created_at, updated_at, department) FROM stdin;
1	REV-CNT-4-14	4	Jediael Abebe	Student Services	Support Department	5.0	\N	\N	User complaints about inappropriate content have dropped to near zero. Excellent moderation!	general	\N	\N	2025-10-06 18:55:06.863915-04	2025-10-20 18:55:06.856146-04	manage-contents
2	REV-CNT-4-16	4	Jediael Abebe	Legal Compliance	Legal Department	5.0	\N	\N	Perfect adherence to content policy and copyright guidelines. Zero legal issues since joining.	general	\N	\N	2025-10-04 18:55:06.864653-04	2025-10-20 18:55:06.856146-04	manage-contents
3	REV-CNT-4-20	4	Jediael Abebe	Platform Analytics	Data Team	5.0	\N	\N	Storage optimization strategies have saved us significant costs. Very data-driven approach.	general	\N	\N	2025-09-30 18:55:06.865419-04	2025-10-20 18:55:06.856146-04	manage-contents
4	REV-CNT-4-23	4	Jediael Abebe	Community Manager	Community Team	5.0	\N	\N	User engagement with content has increased by 40%. Great understanding of what our community needs.	general	\N	\N	2025-09-27 18:55:06.866095-04	2025-10-20 18:55:06.856146-04	manage-contents
5	REV-CNT-4-25	4	Jediael Abebe	CEO	Executive Leadership	5.0	\N	\N	Top-tier content management. Platform quality has improved dramatically under this leadership.	general	\N	\N	2025-09-25 18:55:06.866635-04	2025-10-20 18:55:06.856146-04	manage-contents
6	REV-TUT-001	4	system_admin	Dr. Alemayehu Bekele	Senior Tutor	5.0	5.0	5.0	My tutor verification was processed incredibly fast! The feedback on my documents was very helpful and professional.	tutor_verification	\N	\N	2025-09-25 22:44:05.615621-04	2025-10-19 22:44:05.610186-04	manage-tutors
7	REV-TUT-002	4	system_admin	Tigist Haile	Mathematics Tutor	4.8	4.7	5.0	Excellent support during the verification process. Very thorough document review.	tutor_verification	\N	\N	2025-10-14 22:44:05.621471-04	2025-10-19 22:44:05.610186-04	manage-tutors
8	REV-TUT-003	4	system_admin	Habtamu Tesfaye	Science Tutor	4.5	4.3	4.7	Good attention to detail. The verification guidelines were clear and easy to follow.	general	\N	\N	2025-10-08 22:44:05.622175-04	2025-10-19 22:44:05.610186-04	manage-tutors
9	REV-TUT-004	4	system_admin	Sarah Johnson	Department Head	4.9	5.0	4.8	Outstanding performance in managing tutor verifications. Approval times have improved significantly.	performance	\N	\N	2025-09-20 22:44:05.622866-04	2025-10-19 22:44:05.610186-04	manage-tutors
10	REV-TUT-005	4	system_admin	Alem Gebre	Language Tutor	4.7	4.5	4.9	Very professional handling of my tutor application. Clear communication throughout the process.	tutor_verification	\N	\N	2025-10-10 22:44:05.623581-04	2025-10-19 22:44:05.610186-04	manage-tutors
11	REV-TUT-006	4	system_admin	Michael Chen	Quality Assurance	4.6	4.4	4.8	Consistent quality in tutor verification. Rejection reasons are always well-documented.	quality	\N	\N	2025-10-02 22:44:05.624513-04	2025-10-19 22:44:05.610186-04	manage-tutors
12	REV-TUT-007	4	system_admin	Yohannes Tadesse	Chemistry Tutor	5.0	5.0	5.0	Phenomenal service! My documents were approved within hours. Very impressed with the efficiency.	tutor_verification	\N	\N	2025-10-17 22:44:05.625651-04	2025-10-19 22:44:05.610186-04	manage-tutors
13	REV-CAM-001	7	Abebe Kebede	Marketing Director	Director	5.0	5.0	5.0	Exceptional handling of campaign relationships. Revenue increased by 25% this quarter.	performance	\N	\N	2025-10-19 23:20:12.894058-04	2025-10-19 23:20:12.874476-04	manage-campaigns
14	REV-CAM-002	7	Abebe Kebede	Sales Team Lead	Team Lead	5.0	4.5	5.0	Campaign approvals are processed within hours. Great communication with clients.	performance	\N	\N	2025-10-19 23:20:12.895709-04	2025-10-19 23:20:12.874476-04	manage-campaigns
15	REV-CAM-003	7	Abebe Kebede	Finance Department	Manager	4.0	4.0	4.5	Consistently meets revenue targets. Excellent campaign retention rate.	performance	\N	\N	2025-10-19 23:20:12.896233-04	2025-10-19 23:20:12.874476-04	manage-campaigns
16	REV-CAM-004	7	Abebe Kebede	Advertiser Client	Client	5.0	5.0	5.0	Professional service and quick turnaround on campaign approvals. Highly recommended!	client_feedback	\N	\N	2025-10-19 23:20:12.896645-04	2025-10-19 23:20:12.874476-04	manage-campaigns
17	REV-CAM-005	7	Abebe Kebede	Content Team	Staff	4.5	4.5	4.5	Very responsive to campaign quality concerns. Maintains high standards.	internal	\N	\N	2025-10-19 23:20:12.897035-04	2025-10-19 23:20:12.874476-04	manage-campaigns
18	REV-CNT-1-3	1	Content Manager	Marketing Director	Marketing Department	5.0	\N	\N	Outstanding content management! The approval process is quick and efficient. Our content quality has significantly improved.	general	\N	\N	2025-10-17 18:25:04.574601-04	2025-10-20 18:25:04.57136-04	manage-contents
19	REV-CNT-1-5	1	Content Manager	Sales Team Lead	Sales Department	5.0	\N	\N	Content approvals are processed within hours. Great communication and feedback on rejected content helps us improve.	general	\N	\N	2025-10-15 18:25:04.577734-04	2025-10-20 18:25:04.57136-04	manage-contents
20	REV-CNT-1-7	1	Content Manager	Finance Department	Finance Team	4.0	\N	\N	Excellent storage management and organization. The system runs smoothly and efficiently.	general	\N	\N	2025-10-13 18:25:04.578458-04	2025-10-20 18:25:04.57136-04	manage-contents
21	REV-CNT-1-10	1	Content Manager	Content Creator	Media Team	5.0	\N	\N	Very responsive to flagged content. Clear guidelines and helpful feedback make the upload process seamless.	general	\N	\N	2025-10-10 18:25:04.579271-04	2025-10-20 18:25:04.57136-04	manage-contents
22	REV-CNT-1-12	1	Content Manager	Educational Director	Education Department	5.0	\N	\N	Professional handling of educational content. Quality control is top-notch and maintains platform standards.	general	\N	\N	2025-10-08 18:25:04.580373-04	2025-10-20 18:25:04.57136-04	manage-contents
23	REV-CNT-1-15	1	Content Manager	Technical Support	IT Department	4.0	\N	\N	Efficient content moderation system. Storage analytics are helpful for capacity planning.	general	\N	\N	2025-10-05 18:25:04.581397-04	2025-10-20 18:25:04.57136-04	manage-contents
24	REV-CNT-1-18	1	Content Manager	User Experience Team	UX Department	5.0	\N	\N	User satisfaction with content quality is at an all-time high. Great work maintaining platform integrity!	general	\N	\N	2025-10-02 18:25:04.582331-04	2025-10-20 18:25:04.57136-04	manage-contents
25	REV-CNT-1-21	1	Content Manager	Compliance Officer	Legal Department	5.0	\N	\N	Excellent adherence to content policy. Flagging system works perfectly and prevents policy violations.	general	\N	\N	2025-09-29 18:25:04.582902-04	2025-10-20 18:25:04.57136-04	manage-contents
26	REV-CNT-4-2	4	Jediael Abebe	Chief Technology Officer	Executive Team	5.0	\N	\N	Exceptional content quality control. Our platform standards have never been higher. Jediael's attention to detail is outstanding.	general	\N	\N	2025-10-18 18:55:06.855433-04	2025-10-20 18:55:06.856146-04	manage-contents
27	REV-CNT-4-4	4	Jediael Abebe	Head of Marketing	Marketing Department	5.0	\N	\N	Fast turnaround on content approvals. The efficiency has significantly improved our campaign launches.	general	\N	\N	2025-10-16 18:55:06.860842-04	2025-10-20 18:55:06.856146-04	manage-contents
28	REV-CNT-4-6	4	Jediael Abebe	Education Director	Educational Services	5.0	\N	\N	Outstanding management of educational content. Quality standards are consistently maintained.	general	\N	\N	2025-10-14 18:55:06.861739-04	2025-10-20 18:55:06.856146-04	manage-contents
29	REV-CNT-4-9	4	Jediael Abebe	Product Manager	Product Team	5.0	\N	\N	Great collaboration on content strategy. Very responsive to feedback and suggestions.	general	\N	\N	2025-10-11 18:55:06.862474-04	2025-10-20 18:55:06.856146-04	manage-contents
30	REV-CNT-4-11	4	Jediael Abebe	Content Creator Lead	Creative Team	4.0	\N	\N	Clear guidelines and helpful feedback. The content approval process is smooth and efficient.	general	\N	\N	2025-10-09 18:55:06.863196-04	2025-10-20 18:55:06.856146-04	manage-contents
31	REV-CRED-2-AD3104	2	Jediael Seyoum	HR Department	Human Resources	5	4.8	5	Excellent credential verification work! Very thorough and accurate checks on all documents.	performance	\N	\N	2025-12-02 14:41:36.497991-05	2025-12-04 14:41:36.498066-05	manage-credentials
32	REV-CRED-2-5D97C8	2	Jediael Seyoum	Quality Assurance	QA Team	4.8	4.5	4.9	Consistent quality in credential verification. Very low error rate.	quality	\N	\N	2025-11-29 14:41:36.502073-05	2025-12-04 14:41:36.502093-05	manage-credentials
33	REV-CRED-2-F9F49C	2	Jediael Seyoum	Academic Affairs	Education Department	5	5	5	Outstanding attention to detail when verifying academic credentials. Caught several fraudulent documents.	performance	\N	\N	2025-11-27 14:41:36.505044-05	2025-12-04 14:41:36.50506-05	manage-credentials
34	REV-CRED-2-1AA5F3	2	Jediael Seyoum	Operations Manager	Management	4.7	4.6	4.8	Great turnaround time on credential verifications. Keeps the workflow moving smoothly.	general	\N	\N	2025-11-24 14:41:36.505851-05	2025-12-04 14:41:36.505866-05	manage-credentials
35	REV-CRED-2-637D4A	2	Jediael Seyoum	Compliance Officer	Compliance	5	4.9	5	Perfect compliance with verification standards. No audit issues since this admin joined the team.	compliance	\N	\N	2025-11-20 14:41:36.506733-05	2025-12-04 14:41:36.506751-05	manage-credentials
36	REV-CRED-3-2E4F2A	3	Abebe Kebede	HR Department	Human Resources	5	4.8	5	Excellent credential verification work! Very thorough and accurate checks.	performance	\N	\N	2025-12-02 14:44:22.531679-05	2025-12-04 14:44:22.531755-05	manage-credentials
37	REV-CRED-3-2FE0D2	3	Abebe Kebede	Quality Assurance	QA Team	4.8	4.5	4.9	Consistent quality in credential verification. Very low error rate.	quality	\N	\N	2025-11-29 14:44:22.534567-05	2025-12-04 14:44:22.534586-05	manage-credentials
38	REV-CRED-3-EFA4AF	3	Abebe Kebede	Academic Affairs	Education Department	5	5	5	Outstanding attention to detail when verifying academic credentials.	performance	\N	\N	2025-11-27 14:44:22.535395-05	2025-12-04 14:44:22.535408-05	manage-credentials
39	REV-CRED-4-36A1A7	4	Jediael Jediael	HR Department	Human Resources	5	4.8	5	Excellent credential verification work! Very thorough and accurate checks.	performance	\N	\N	2025-12-02 14:44:22.536983-05	2025-12-04 14:44:22.536997-05	manage-credentials
40	REV-CRED-4-20042B	4	Jediael Jediael	Quality Assurance	QA Team	4.8	4.5	4.9	Consistent quality in credential verification. Very low error rate.	quality	\N	\N	2025-11-29 14:44:22.53777-05	2025-12-04 14:44:22.537785-05	manage-credentials
41	REV-CRED-4-4EA1BC	4	Jediael Jediael	Academic Affairs	Education Department	5	5	5	Outstanding attention to detail when verifying academic credentials.	performance	\N	\N	2025-11-27 14:44:22.538663-05	2025-12-04 14:44:22.538679-05	manage-credentials
42	REV-CRED-6-646AE7	6	Abebe Kebede	HR Department	Human Resources	5	4.8	5	Excellent credential verification work! Very thorough and accurate checks.	performance	\N	\N	2025-12-02 14:44:22.540714-05	2025-12-04 14:44:22.540723-05	manage-credentials
43	REV-CRED-6-03F6A0	6	Abebe Kebede	Quality Assurance	QA Team	4.8	4.5	4.9	Consistent quality in credential verification. Very low error rate.	quality	\N	\N	2025-11-29 14:44:22.541283-05	2025-12-04 14:44:22.541289-05	manage-credentials
44	REV-CRED-6-8EDAE6	6	Abebe Kebede	Academic Affairs	Education Department	5	5	5	Outstanding attention to detail when verifying academic credentials.	performance	\N	\N	2025-11-27 14:44:22.541936-05	2025-12-04 14:44:22.541946-05	manage-credentials
45	REV-CRED-7-0FCF8B	7	kush studios	HR Department	Human Resources	5	4.8	5	Excellent credential verification work! Very thorough and accurate checks.	performance	\N	\N	2025-12-02 14:44:22.543279-05	2025-12-04 14:44:22.543295-05	manage-credentials
46	REV-CRED-7-A4EF60	7	kush studios	Quality Assurance	QA Team	4.8	4.5	4.9	Consistent quality in credential verification. Very low error rate.	quality	\N	\N	2025-11-29 14:44:22.544558-05	2025-12-04 14:44:22.544578-05	manage-credentials
47	REV-CRED-7-81F3DA	7	kush studios	Academic Affairs	Education Department	5	5	5	Outstanding attention to detail when verifying academic credentials.	performance	\N	\N	2025-11-27 14:44:22.545276-05	2025-12-04 14:44:22.545293-05	manage-credentials
48	REV-CRED-1-354F66	1	System Admin	HR Department	Human Resources	5	4.8	5	Excellent credential verification work! Very thorough and accurate checks.	performance	\N	\N	2025-12-02 14:44:22.546664-05	2025-12-04 14:44:22.546679-05	manage-credentials
49	REV-CRED-1-436ED1	1	System Admin	Quality Assurance	QA Team	4.8	4.5	4.9	Consistent quality in credential verification. Very low error rate.	quality	\N	\N	2025-11-29 14:44:22.547418-05	2025-12-04 14:44:22.547437-05	manage-credentials
50	REV-CRED-1-291DFD	1	System Admin	Academic Affairs	Education Department	5	5	5	Outstanding attention to detail when verifying academic credentials.	performance	\N	\N	2025-11-27 14:44:22.54809-05	2025-12-04 14:44:22.548103-05	manage-credentials
51	REV-CRED-5-F4D6C6	5	Test NoAccess	HR Department	Human Resources	5	4.8	5	Excellent credential verification work! Very thorough and accurate checks.	performance	\N	\N	2025-12-02 14:44:22.549888-05	2025-12-04 14:44:22.549895-05	manage-credentials
52	REV-CRED-5-6C47E8	5	Test NoAccess	Quality Assurance	QA Team	4.8	4.5	4.9	Consistent quality in credential verification. Very low error rate.	quality	\N	\N	2025-11-29 14:44:22.550369-05	2025-12-04 14:44:22.550378-05	manage-credentials
53	REV-CRED-5-833D3D	5	Test NoAccess	Academic Affairs	Education Department	5	5	5	Outstanding attention to detail when verifying academic credentials.	performance	\N	\N	2025-11-27 14:44:22.550963-05	2025-12-04 14:44:22.55097-05	manage-credentials
\.


--
-- Data for Name: affiliate_program; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.affiliate_program (id, enabled, payout_threshold, payout_schedule, created_at, updated_at) FROM stdin;
1	t	1000.00	monthly	2025-12-05 08:27:32.550043	2025-12-05 08:27:32.550043
\.


--
-- Data for Name: affiliate_tiers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.affiliate_tiers (id, tier_level, tier_name, commission_rate, duration_months, is_active, created_at, updated_at, program_id, business_type) FROM stdin;
1	1	Direct Referral	10.00	24	t	2025-12-05 14:14:57.270345	2025-12-08 21:37:30.580499	1	tutoring
2	2	2nd Level	5.00	12	t	2025-12-05 14:14:57.270345	2025-12-08 21:37:37.701367	1	tutoring
18	1	level 1	10.00	24	t	2026-02-04 01:58:34.022424	2026-02-04 01:58:34.022424	1	subscription
19	2	Level 2	5.00	12	t	2026-02-04 02:03:11.6354	2026-02-04 02:03:11.6354	1	subscription
20	3	Level 3	3.00	6	t	2026-02-04 02:03:32.32848	2026-02-04 02:03:32.32848	1	subscription
3	3	Level 3	3.00	6	t	2025-12-08 21:37:20.549136	2026-02-04 02:03:53.072916	1	tutoring
8	4	Level 4	1.00	3	t	2026-01-01 02:56:26.421073	2026-02-04 02:04:01.910884	1	tutoring
23	4	Level 4	1.00	3	t	2026-02-04 02:05:04.928462	2026-02-04 02:05:04.928462	1	subscription
24	1	Direct Referral	10.00	24	t	2026-02-04 02:05:21.528183	2026-02-04 02:05:21.528183	1	advertisement
25	2	Level 2	5.00	12	t	2026-02-04 02:05:35.197703	2026-02-04 02:05:35.197703	1	advertisement
26	3	Level 3	3.00	6	t	2026-02-04 02:05:51.228173	2026-02-04 02:05:51.228173	1	advertisement
27	4	Level 4	1.00	3	t	2026-02-04 02:06:03.784916	2026-02-04 02:06:03.784916	1	advertisement
\.


--
-- Data for Name: astegni_reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.astegni_reviews (id, reviewer_id, rating, ease_of_use, features_quality, support_quality, pricing, review_text, would_recommend, is_featured, count, created_at, updated_at) FROM stdin;
1	141	4.25	5	4	3	5	Test review	t	f	0	2025-12-27 14:08:46.931279	2025-12-27 14:08:46.931279
2	115	4.75	5	4	5	5	Test review	t	f	0	2025-12-28 06:59:20.013429	2025-12-28 14:26:53.161562
3	1	5.00	5	5	5	5	test review	t	f	0	2026-01-27 11:52:36.518356	2026-01-27 18:38:42.069618
\.


--
-- Data for Name: base_price_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.base_price_rules (id, rule_name, subject_category, session_format, base_price_per_hour, credential_bonus, priority, is_active, created_at, updated_at, experience_bonus_per_year, min_grade_level, max_grade_level, country, currency) FROM stdin;
10	New tutor online	all	Online	100.00	30.00	2	t	2026-01-23 00:09:09.325442	\N	30.00	1	8	ET	ETB
9	New tutor in person	all	In-Person	200.00	30.00	2	t	2026-01-23 00:08:18.656226	2026-01-29 02:42:52.213218	30.00	1	8	ET	ETB
\.


--
-- Data for Name: brand_packages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.brand_packages (id, package_title, package_price, features, is_active, display_order, label, created_at, updated_at, duration_days, is_base_package, currency, discount) FROM stdin;
5	Monthly	1500.00	[]	t	1	none	2025-12-08 20:11:19.664584	2025-12-08 20:17:10.476927	30	t	ETB	0.00
6	3 months	900.00	[]	t	3	none	2025-12-08 20:11:52.777568	2025-12-08 20:17:19.78746	90	f	ETB	40.00
8	yearly	700.00	[]	t	4	popular	2025-12-08 20:13:35.56991	2025-12-08 20:17:29.754154	365	f	ETB	53.33
7	6 months	1200.00	[]	t	2	none	2025-12-08 20:12:47.796449	2025-12-08 21:34:10.71693	180	f	ETB	20.00
\.


--
-- Data for Name: cpi_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cpi_settings (id, base_rate, tutor_premium, student_premium, parent_premium, national_premium, regional_premium, currency, is_active, created_at, updated_at, updated_by, leaderboard_banner_premium, logo_premium, in_session_skyscrapper_banner_premium, advertiser_premium, user_premium, addis_premium, oromia_premium, amhara_premium, tigray_premium, snnpr_premium, somali_premium, afar_premium, benishangul_premium, gambela_premium, harari_premium, diredawa_premium, sidama_premium, region_exclusion_premiums, country_regions, country) FROM stdin;
1	0.2500	0.0000	0.0000	0.0000	0.0000	3.0000	ETB	t	2026-01-01 09:39:11.693733	2026-01-22 00:39:33.89095	\N	0.0000	0.0000	0.0000	0.0000	0.0000	0.0000	0.0000	0.0000	0.0000	0.0000	0.0000	0.0000	0.0000	0.0000	0.0000	0.0000	0.0000	{}	{"ET": {"name": "Ethiopia", "regions": [{"id": "addis-ababa", "icon": "fa-city", "name": "Addis Ababa"}, {"id": "oromia", "icon": "fa-mountain", "name": "Oromia"}, {"id": "amhara", "icon": "fa-landmark", "name": "Amhara"}, {"id": "tigray", "icon": "fa-monument", "name": "Tigray"}, {"id": "snnpr", "icon": "fa-tree", "name": "SNNPR"}, {"id": "somali", "icon": "fa-sun", "name": "Somali"}, {"id": "afar", "icon": "fa-temperature-high", "name": "Afar"}, {"id": "benishangul-gumuz", "icon": "fa-water", "name": "Benishangul-Gumuz"}, {"id": "gambela", "icon": "fa-leaf", "name": "Gambela"}, {"id": "harari", "icon": "fa-mosque", "name": "Harari"}, {"id": "dire-dawa", "icon": "fa-train", "name": "Dire Dawa"}, {"id": "sidama", "icon": "fa-coffee", "name": "Sidama"}], "currency": "ETB"}, "GH": {"name": "Ghana", "regions": [{"id": "greater-accra", "icon": "fa-city", "name": "Greater Accra"}, {"id": "ashanti", "icon": "fa-crown", "name": "Ashanti"}, {"id": "western", "icon": "fa-anchor", "name": "Western"}, {"id": "eastern", "icon": "fa-mountain", "name": "Eastern"}, {"id": "central", "icon": "fa-landmark", "name": "Central"}, {"id": "northern", "icon": "fa-sun", "name": "Northern"}, {"id": "volta", "icon": "fa-water", "name": "Volta"}, {"id": "brong-ahafo", "icon": "fa-tree", "name": "Brong-Ahafo"}], "currency": "GHS"}, "KE": {"name": "Kenya", "regions": [{"id": "nairobi", "icon": "fa-city", "name": "Nairobi"}, {"id": "mombasa", "icon": "fa-anchor", "name": "Mombasa"}, {"id": "kisumu", "icon": "fa-water", "name": "Kisumu"}, {"id": "nakuru", "icon": "fa-mountain", "name": "Nakuru"}, {"id": "eldoret", "icon": "fa-running", "name": "Eldoret"}, {"id": "central", "icon": "fa-map-marker", "name": "Central"}, {"id": "coast", "icon": "fa-umbrella-beach", "name": "Coast"}, {"id": "eastern", "icon": "fa-sun", "name": "Eastern"}, {"id": "western", "icon": "fa-tree", "name": "Western"}, {"id": "rift-valley", "icon": "fa-mountain", "name": "Rift Valley"}], "currency": "KES"}, "NG": {"name": "Nigeria", "regions": [{"id": "lagos", "icon": "fa-city", "name": "Lagos"}, {"id": "abuja", "icon": "fa-landmark", "name": "Abuja (FCT)"}, {"id": "kano", "icon": "fa-mosque", "name": "Kano"}, {"id": "rivers", "icon": "fa-water", "name": "Rivers"}, {"id": "oyo", "icon": "fa-university", "name": "Oyo"}, {"id": "kaduna", "icon": "fa-industry", "name": "Kaduna"}, {"id": "delta", "icon": "fa-oil-can", "name": "Delta"}, {"id": "anambra", "icon": "fa-store", "name": "Anambra"}, {"id": "enugu", "icon": "fa-gem", "name": "Enugu"}, {"id": "imo", "icon": "fa-leaf", "name": "Imo"}], "currency": "NGN"}, "ZA": {"name": "South Africa", "regions": [{"id": "gauteng", "icon": "fa-city", "name": "Gauteng"}, {"id": "western-cape", "icon": "fa-mountain", "name": "Western Cape"}, {"id": "kwazulu-natal", "icon": "fa-umbrella-beach", "name": "KwaZulu-Natal"}, {"id": "eastern-cape", "icon": "fa-water", "name": "Eastern Cape"}, {"id": "limpopo", "icon": "fa-tree", "name": "Limpopo"}, {"id": "mpumalanga", "icon": "fa-leaf", "name": "Mpumalanga"}, {"id": "north-west", "icon": "fa-sun", "name": "North West"}, {"id": "free-state", "icon": "fa-wheat", "name": "Free State"}, {"id": "northern-cape", "icon": "fa-gem", "name": "Northern Cape"}], "currency": "ZAR"}}	all
\.


--
-- Data for Name: manage_admins_profile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manage_admins_profile (id, admin_id, username, bio, quote, cover_image, profile_image, languages, hero_subtitle, badges, created_at, updated_at, hero_title, location, allow_location, display_location, employee_id, "position", last_login, joined_in) FROM stdin;
1	2	Jd-admin	Admin bio	test Admin quote	\N	\N	["Amharic", "English"]	Admin hero subtitile	[]	2025-12-07 22:42:58.659034	2025-12-07 23:38:35.500069	["Admin hero title 1", "Admin hero title 2"]	["Centrum, Amsterdam, North Holland, Netherlands"]	t	t	\N	\N	\N	2025-12-09 12:23:15.642145
\.


--
-- Data for Name: manage_advertisers_profile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manage_advertisers_profile (id, admin_id, username, bio, quote, cover_image, profile_image, languages, hero_subtitle, hero_title, badges, location, allow_location, display_location, employee_id, "position", created_at, updated_at, last_login, joined_in) FROM stdin;
\.


--
-- Data for Name: manage_contents_profile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manage_contents_profile (id, admin_id, badges, created_at, updated_at, bio, quote, cover_image, profile_image, languages, hero_subtitle, username, hero_title, location, allow_location, display_location, employee_id, "position", last_login, joined_in) FROM stdin;
\.


--
-- Data for Name: manage_courses_profile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manage_courses_profile (id, admin_id, badges, created_at, updated_at, username, bio, quote, cover_image, profile_image, languages, hero_subtitle, hero_title, location, allow_location, display_location, employee_id, "position", last_login, joined_in) FROM stdin;
1	2	[]	2025-12-03 04:09:12.555849	2025-12-09 15:58:57.076224	Jd-courses	Test Bio Updated	Because of you, Lord. Thank you!	\N	\N	["English", "Amharic"]	Test Subtitle Updated	["Test hero courses Title 1", "Test hero courses Title 2"]	["Megenagna, Yeka, Addis Ababa, Ethiopia"]	t	t		Manager	2026-02-12 16:10:44.517753	2025-12-09 12:23:15.642145
2	7	[]	2025-12-03 15:21:05.304702	2025-12-07 20:43:33.262375	kush	Updated courses bio	Test quote	\N	\N	["English", "Amharic"]	Course Subtitle Test	["Course Title 1", "Course Title 2"]	["Addis Ababa", "Bahir Dar"]	t	t	\N	\N	\N	2025-12-09 12:23:15.642145
\.


--
-- Data for Name: manage_credentials_profile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manage_credentials_profile (id, admin_id, username, bio, quote, cover_image, profile_image, languages, hero_subtitle, badges, created_at, updated_at, hero_title, location, display_location, allow_location, employee_id, "position", last_login, joined_in) FROM stdin;
1	2	Jd-credentials	Test bio 3	Test quote 3	\N	\N	["English", "Amharic"]	Hero credentials subtitle Test	[]	2025-12-04 17:40:45.508561	2025-12-07 20:26:57.729311	["Hero credentials title 1", "Hero credentials title 1"]	["Megenagna, Yeka, Addis Ababa, Ethiopia"]	t	t	\N	\N	\N	2025-12-09 12:23:15.642145
\.


--
-- Data for Name: manage_customers_profile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manage_customers_profile (id, admin_id, badges, created_at, updated_at, username, bio, quote, cover_image, profile_image, languages, hero_subtitle, hero_title, location, allow_location, display_location, employee_id, "position", last_login, joined_in) FROM stdin;
\.


--
-- Data for Name: manage_schools_profile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manage_schools_profile (id, admin_id, badges, created_at, updated_at, username, bio, quote, cover_image, profile_image, languages, hero_subtitle, hero_title, location, allow_location, display_location, employee_id, "position", last_login, joined_in) FROM stdin;
1	7	[]	2025-12-03 17:04:43.80671	2025-12-07 19:41:03.919152	kush	Updated bio test	Updated quote	\N	\N	[]	Test Subtitle	["Title 1", "Title 2"]	["Addis Ababa, Ethiopia", "Bahir Dar"]	t	f	\N	\N	\N	2025-12-09 12:23:15.642145
2	2	[]	2025-12-04 08:06:59.401642	2025-12-07 20:34:04.21292	JD-school	Test schools bio	Test schools quote	\N	\N	["English", "Amharic"]	Hero schools subtitle	["Hero schools title 1", "Hero schools title 2"]	["Megenagna, Yeka, Addis Ababa, Ethiopia"]	t	t	\N	\N	2026-02-12 16:10:44.517753	2025-12-09 12:23:15.642145
\.


--
-- Data for Name: manage_system_settings_profile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manage_system_settings_profile (id, admin_id, badges, created_at, updated_at, username, bio, quote, cover_image, profile_image, languages, hero_subtitle, hero_title, location, allow_location, display_location, employee_id, "position", last_login, joined_in) FROM stdin;
1	2	[]	2025-12-04 22:51:21.421859	2025-12-07 23:19:44.866241	jd-system	Test system bio test	Test system quote test	\N	\N	["Oromo"]	Hero subtitle	["Hero title system 1", "Hero title system 2"]	["Megenagna, Yeka, Addis Ababa, Ethiopia"]	t	t	\N	\N	2026-02-12 16:10:44.517753	2025-12-09 12:23:15.642145
\.


--
-- Data for Name: manage_uploads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manage_uploads (id, admin_id, "position", joined_date, rating, total_reviews, badges, events_created, clubs_created, events_moderated, clubs_moderated, avg_moderation_time_hours, permissions, username, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: otps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.otps (id, user_id, otp_code, purpose, expires_at, is_used, created_at, contact, is_otp_verified) FROM stdin;
1	98	897778	add_role	2025-10-02 20:43:25.928718	t	2025-10-02 20:38:25.954928	\N	f
2	98	344420	add_role	2025-10-02 20:49:15.772329	t	2025-10-02 20:44:15.784753	\N	f
3	98	830246	add_role	2025-10-02 20:59:16.697847	t	2025-10-02 20:54:16.708651	\N	f
4	98	903493	add_role	2025-10-02 21:10:11.247287	t	2025-10-02 21:05:11.260018	\N	f
5	98	969036	add_role	2025-10-02 21:15:12.757101	t	2025-10-02 21:10:12.764817	\N	f
6	98	945369	add_role	2025-10-02 21:22:23.619842	t	2025-10-02 21:17:23.628513	\N	f
7	98	845055	add_role	2025-10-02 21:24:49.895229	t	2025-10-02 21:19:49.911102	\N	f
8	98	491678	add_role	2025-10-02 21:25:52.109754	t	2025-10-02 21:20:52.11882	\N	f
9	98	991142	add_role	2025-10-02 21:27:47.622876	t	2025-10-02 21:22:47.630445	\N	f
10	98	708244	add_role	2025-10-04 22:10:03.362237	t	2025-10-04 22:05:03.37971	\N	f
11	98	290175	add_role	2025-10-04 23:16:53.865048	t	2025-10-04 23:11:53.881329	\N	f
12	98	765051	add_role	2025-10-04 23:23:49.144952	t	2025-10-04 23:18:49.157557	\N	f
13	98	703654	add_role	2025-10-04 23:25:08.056285	t	2025-10-04 23:20:08.069999	\N	f
14	98	926516	add_role	2025-10-04 23:31:13.102876	t	2025-10-04 23:26:13.116319	\N	f
15	98	361384	add_role	2025-10-04 23:31:19.43715	t	2025-10-04 23:26:19.451628	\N	f
16	98	714332	add_role	2025-10-04 23:33:45.335689	t	2025-10-04 23:28:45.355051	\N	f
17	98	846593	add_role	2025-10-04 23:35:59.473898	t	2025-10-04 23:30:59.491552	\N	f
18	98	557288	add_role	2025-10-04 23:36:45.908224	t	2025-10-04 23:31:45.934182	\N	f
19	98	600796	add_role	2025-10-05 00:14:34.36703	t	2025-10-05 00:09:34.382153	\N	f
20	98	809517	add_role	2025-10-05 00:19:51.181762	t	2025-10-05 00:14:51.202891	\N	f
21	98	420232	add_role	2025-10-05 00:28:51.960809	t	2025-10-05 00:23:51.979802	\N	f
22	98	576591	add_role	2025-10-05 00:32:04.768168	t	2025-10-05 00:27:04.787868	\N	f
23	98	463802	add_role	2025-10-05 00:37:59.721327	t	2025-10-05 00:32:59.737608	\N	f
24	98	260738	add_role	2025-10-05 00:38:41.262387	t	2025-10-05 00:33:41.267142	\N	f
25	98	247240	add_role	2025-10-05 00:38:56.816767	t	2025-10-05 00:33:56.823861	\N	f
26	98	989853	add_role	2025-10-05 00:39:41.764109	t	2025-10-05 00:34:41.774385	\N	f
27	98	532163	add_role	2025-10-05 00:43:45.605007	t	2025-10-05 00:38:45.612653	\N	f
28	98	872421	add_role	2025-10-05 00:50:38.06606	t	2025-10-05 00:45:38.082654	\N	f
29	98	897096	add_role	2025-10-05 00:51:42.937701	t	2025-10-05 00:46:42.945927	\N	f
30	98	629860	add_role	2025-10-05 00:54:34.616191	t	2025-10-05 00:49:34.623727	\N	f
31	98	960703	add_role	2025-10-05 00:58:04.305122	t	2025-10-05 00:53:04.321395	\N	f
32	98	576734	add_role	2025-10-05 00:58:44.922919	t	2025-10-05 00:53:44.931807	\N	f
33	98	592344	add_role	2025-10-05 01:05:18.063028	t	2025-10-05 01:00:18.078465	\N	f
34	98	994201	add_role	2025-10-05 01:06:20.593493	t	2025-10-05 01:01:20.621968	\N	f
35	98	731888	add_role	2025-10-05 01:09:45.659983	t	2025-10-05 01:04:45.681547	\N	f
36	115	200294	password_reset	2025-10-21 02:21:44.309922	t	2025-10-21 02:16:44.337622	\N	f
37	115	937237	add_role	2025-10-21 02:34:57.040482	t	2025-10-21 02:29:57.065271	\N	f
38	115	735284	password_reset	2025-10-23 01:45:37.969345	t	2025-10-23 01:40:37.98957	\N	f
39	115	235238	password_reset	2025-10-23 02:47:37.913486	t	2025-10-23 02:42:37.935006	\N	f
49	141	196589	password_reset	2025-11-29 11:40:00.922586	t	2025-11-29 11:35:00.941726	\N	f
40	115	923648	add_role	2025-10-25 04:24:09.455535	t	2025-10-25 04:19:09.47316	\N	f
41	115	855188	add_role	2025-10-25 06:53:34.978057	t	2025-10-25 06:48:34.997882	\N	f
42	115	533409	add_role	2025-10-25 06:54:02.755136	t	2025-10-25 06:49:02.769789	\N	f
43	115	236827	add_role	2025-10-25 07:06:58.24639	t	2025-10-25 07:01:58.256066	\N	f
45	115	109533	add_role	2025-11-12 05:49:09.160609	t	2025-11-12 05:44:09.197537	\N	f
46	115	198814	add_role	2025-11-29 11:19:09.360683	t	2025-11-29 11:14:09.402258	\N	f
47	115	821188	add_role	2025-11-29 11:19:26.383666	f	2025-11-29 11:14:26.399311	\N	f
44	115	284502	password_reset	2025-10-28 07:36:45.707746	t	2025-10-28 07:31:45.761872	\N	f
48	115	835368	password_reset	2025-11-29 11:23:02.284993	t	2025-11-29 11:18:02.314803	\N	f
51	115	112221	password_reset	2025-11-29 12:10:15.37634	t	2025-11-29 12:05:15.398491	\N	f
52	115	189422	password_reset	2025-11-29 13:17:03.474485	f	2025-11-29 13:12:03.508239	\N	f
53	141	195306	add_role	2025-11-29 13:30:43.323981	t	2025-11-29 13:25:43.339633	\N	f
54	141	776961	add_role	2025-11-29 13:31:30.230034	t	2025-11-29 13:26:30.245424	\N	f
55	141	886802	add_role	2025-11-29 14:16:42.515398	t	2025-11-29 14:11:42.547054	\N	f
50	141	575608	password_reset	2025-11-29 11:49:26.031457	t	2025-11-29 11:44:26.05245	\N	f
56	141	645160	password_reset	2025-11-29 14:17:38.724352	t	2025-11-29 14:12:38.733154	\N	f
57	141	722570	password_reset	2025-11-29 14:17:48.085179	f	2025-11-29 14:12:48.092992	\N	f
58	2	225440	password_reset	2025-12-09 00:25:44.074833	t	2025-12-09 00:10:44.075739	jediael.s.abebe@gmail.com	f
60	2	948241	password_reset	2025-12-09 00:31:15.115083	t	2025-12-09 00:16:15.115931	jediael.s.abebe@gmail.com	f
66	2	701397	verify_email	2025-12-09 11:10:47.040179	t	2025-12-09 11:00:47.041324	contact@astegni.com	f
67	1	851365	admin_invitation	2025-12-16 13:40:52.378834	f	2025-12-09 13:40:52.386365	jediael.s.abebe@gmail.com	f
68	2	495045	add_department	2025-12-09 13:57:39.627951	t	2025-12-09 13:42:39.629056	jediael.s.abebe@gmail.com	f
69	2	106096	add_department	2025-12-09 14:33:37.347327	t	2025-12-09 14:18:37.351473	jediael.s.abebe@gmail.com	f
70	2	894448	add_department	2025-12-09 16:12:55.673261	t	2025-12-09 15:57:55.6742	jediael.s.abebe@gmail.com	t
\.


--
-- Data for Name: payment_gateways; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_gateways (id, gateway_name, enabled, api_key, secret_key, webhook_url, test_mode, settings, created_at, updated_at) FROM stdin;
2	TeleBirr	f			\N	t	{}	2025-10-17 08:20:40.091246	2025-12-05 14:07:37.992178
3	CBE	f			\N	t	{}	2025-10-17 08:20:40.147815	2025-12-05 14:07:38.139556
\.


--
-- Data for Name: subscription_features; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscription_features (id, subscription_plan_id, user_role, feature_name, feature_description, is_enabled, feature_value, created_at, updated_at) FROM stdin;
1	16	tutor	profile_boost	Boost profile visibility in search results	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
2	16	tutor	performance_analytics	Access to detailed performance metrics	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
3	16	tutor	student_connections	Connect with unlimited students	t	unlimited	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
4	16	tutor	priority_support	Priority customer support	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
5	16	student	premium_content	Access to premium learning content	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
6	16	student	unlimited_tutors	Connect with unlimited tutors	t	unlimited	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
7	16	student	progress_tracking	Advanced progress tracking tools	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
8	16	student	priority_support	Priority customer support	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
9	16	parent	child_monitoring	Monitor multiple children progress	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
10	16	parent	detailed_reports	Detailed performance reports	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
11	16	parent	priority_support	Priority customer support	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
12	7	tutor	profile_boost	Boost profile visibility in search results	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
13	7	tutor	performance_analytics	Access to detailed performance metrics	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
14	7	tutor	student_connections	Connect with unlimited students	t	unlimited	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
15	7	tutor	priority_support	Priority customer support	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
16	7	student	premium_content	Access to premium learning content	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
17	7	student	unlimited_tutors	Connect with unlimited tutors	t	unlimited	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
18	7	student	progress_tracking	Advanced progress tracking tools	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
19	7	student	priority_support	Priority customer support	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
20	7	parent	child_monitoring	Monitor multiple children progress	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
21	7	parent	detailed_reports	Detailed performance reports	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
22	7	parent	priority_support	Priority customer support	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
23	8	tutor	profile_boost	Boost profile visibility in search results	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
24	8	tutor	performance_analytics	Access to detailed performance metrics	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
25	8	tutor	student_connections	Connect with unlimited students	t	unlimited	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
26	8	tutor	priority_support	Priority customer support	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
27	8	student	premium_content	Access to premium learning content	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
28	8	student	unlimited_tutors	Connect with unlimited tutors	t	unlimited	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
29	8	student	progress_tracking	Advanced progress tracking tools	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
30	8	student	priority_support	Priority customer support	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
31	8	parent	child_monitoring	Monitor multiple children progress	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
32	8	parent	detailed_reports	Detailed performance reports	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
33	8	parent	priority_support	Priority customer support	t	\N	2026-01-19 22:43:08.220427	2026-01-19 22:43:08.220427
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscription_plans (id, currency, discount_yearly, is_active, display_order, created_at, updated_at, package_title, package_price, is_base_package, discount_3_months, discount_6_months, label, duration_days, country) FROM stdin;
16	ETB	20.00	t	15	2025-12-28 00:20:45.864981	2025-12-28 01:01:48.877763	Free	0.00	f	5.00	1.00	none	1	all
7	ETB	12.00	t	6	2025-12-08 21:23:49.864258	2025-12-28 00:50:39.927797	Standard	1500.00	f	7.00	10.00	none	250	all
8	ETB	15.00	t	7	2025-12-08 21:25:09.066087	2025-12-28 00:50:54.62576	Standard +	2800.00	f	10.00	12.00	none	500	all
9	ETB	15.00	t	8	2025-12-08 21:26:17.883727	2025-12-28 00:51:06.837855	Premium	5000.00	f	10.00	12.00	none	1000	all
5	ETB	10.00	t	4	2025-12-08 21:17:30.839144	2025-12-28 01:00:36.497175	Basic	500.00	t	5.00	7.00	popular	64	all
6	ETB	10.00	t	5	2025-12-08 21:20:50.853695	2025-12-28 01:00:53.911042	Basic +	700.00	f	5.00	7.00	none	100	all
\.


--
-- Data for Name: system_affiliate_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_affiliate_settings (id, program_name, commission_rate, commission_type, min_payout, cookie_duration_days, enabled, auto_approve, payment_method, payment_schedule, terms_and_conditions, created_at, updated_at) FROM stdin;
1	Astegni Affiliate Program	10.00	percentage	500.00	30	f	f	\N	monthly	\N	2025-10-10 20:21:32.629536	2025-10-10 20:21:32.629536
\.


--
-- Data for Name: system_api_keys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_api_keys (id, key_name, api_key, api_secret, user_id, permissions, rate_limit_override, is_active, expires_at, last_used_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: system_api_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_api_settings (id, api_enabled, rate_limit_per_minute, rate_limit_per_hour, require_api_key, cors_enabled, allowed_origins, webhook_enabled, webhook_secret, api_version, documentation_url, created_at, updated_at) FROM stdin;
1	t	100	5000	t	t	["*"]	f	\N	v1	\N	2025-10-10 20:21:32.629536	2025-10-10 20:21:32.629536
\.


--
-- Data for Name: system_backup_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_backup_config (id, auto_backup_enabled, backup_frequency, backup_time, backup_retention_days, backup_location, include_media, include_database, include_logs, compression_enabled, encryption_enabled, last_backup_at, next_backup_at, created_at, updated_at) FROM stdin;
1	t	daily	02:00	30	\N	f	t	f	t	f	\N	\N	2025-10-10 20:21:32.629536	2025-10-10 20:21:32.629536
\.


--
-- Data for Name: system_backup_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_backup_history (id, backup_type, backup_size_mb, backup_location, status, error_message, started_at, completed_at, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: system_email_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_email_config (id, smtp_host, smtp_port, smtp_username, smtp_password, smtp_encryption, from_email, from_name, reply_to_email, daily_limit, enabled, test_mode, created_at, updated_at, account_name, provider) FROM stdin;
1	smtp.gmail.com	587	contact@astegni.com	wexzjrmdukcdeqge	TLS	contact@astegni.com	Astegni Educational Platform		2000	t	f	2025-10-11 20:42:51.638095	2025-12-08 16:57:52.189611	Astegni Contact	gmail
\.


--
-- Data for Name: system_email_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_email_templates (id, template_name, subject, body, variables, enabled, created_at, updated_at) FROM stdin;
1	welcome	Welcome to Astegni!	Hello {{name}}, welcome to Astegni platform!	["name"]	t	2025-10-10 20:21:32.629536	2025-10-10 20:21:32.629536
2	verification	Verify Your Email	Please verify your email: {{verification_link}}	["verification_link"]	t	2025-10-10 20:21:32.629536	2025-10-10 20:21:32.629536
3	password_reset	Reset Your Password	Click here to reset: {{reset_link}}	["reset_link"]	t	2025-10-10 20:21:32.629536	2025-10-10 20:21:32.629536
\.


--
-- Data for Name: system_general_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_general_settings (id, platform_name, platform_tagline, platform_description, primary_language, timezone, date_format, time_format, currency, currency_symbol, items_per_page, max_upload_size_mb, allowed_file_types, maintenance_mode, registration_enabled, email_verification_required, phone_verification_required, contact_email_backup, contact_phone_backup, admin_email, created_at, updated_at, site_url, contact_phone, contact_email) FROM stdin;
1	Astegni	Leading by far	The first Social media built by Ethiopian!	English	Africa/Addis_Ababa	YYYY-MM-DD	24h	ETB	ETB	15	200	["jpg", "jpeg", "png", "gif", "mp4", "mov", "pdf", "doc", "docx"]	f	t	t	f	contact@astegni.com, support@astegni.com	+251 911 111 111, +251 922 222 222	\N	2025-10-10 20:21:32.629536	2025-10-17 08:46:46.769158	https://www.astegni.com	["+251 997 0000"]	["noreplay@astegni.com"]
\.


--
-- Data for Name: system_impression_stats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_impression_stats (id, stat_date, content_type, total_impressions, unique_users, avg_duration_seconds, total_duration_seconds, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: system_impressions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_impressions (id, content_type, content_id, user_id, session_id, ip_address, user_agent, referer, page_url, view_duration_seconds, created_at) FROM stdin;
\.


--
-- Data for Name: system_integrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_integrations (id, service_name, display_name, service_type, api_key, api_secret, config, enabled, last_sync_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: system_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_logs (id, log_level, log_type, message, user_id, ip_address, user_agent, request_method, request_url, response_code, duration_ms, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: system_maintenance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_maintenance (id, is_active, message, allowed_ips, bypass_roles, scheduled_start, scheduled_end, created_by, created_at, updated_at) FROM stdin;
1	f	System is under maintenance. We will be back soon!	[]	["super_admin"]	\N	\N	\N	2025-10-10 20:21:32.629536	2025-10-10 20:21:32.629536
\.


--
-- Data for Name: system_media; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_media (id, uploader_id, media_type, title, description, file_url, thumbnail, category, targets, tags, is_active, download_count, likes, dislikes, comments, shares, saves, is_favorite, created_at, updated_at) FROM stdin;
1	2	image	test image		https://f003.backblazeb2.com/file/astegni-media/images/user_system/system_image_20251208_174025_02450843_20251208_174025.jpg	https://f003.backblazeb2.com/file/astegni-media/images/user_system/system_image_20251208_174025_02450843_20251208_174025.jpg	background	[]	[]	t	0	0	0	[]	0	0	f	2025-12-08 17:40:33.972953	2025-12-08 17:40:33.972953
2	2	image	test image 2		https://f003.backblazeb2.com/file/astegni-media/images/user_system/system_image_20251208_174235_9176090a_20251208_174235.jpg	https://f003.backblazeb2.com/file/astegni-media/images/user_system/system_image_20251208_174235_9176090a_20251208_174235.jpg	background	[]	[]	t	0	0	0	[]	0	0	f	2025-12-08 17:42:38.313463	2025-12-08 17:42:38.313463
3	2	image	test image 3		https://f003.backblazeb2.com/file/astegni-media/images/user_system/system_image_20251208_174544_d9c1a186_20251208_174544.jpg	https://f003.backblazeb2.com/file/astegni-media/images/user_system/system_image_20251208_174544_d9c1a186_20251208_174544.jpg	icon	[]	[]	t	0	0	0	[]	0	0	f	2025-12-08 17:45:46.519213	2025-12-08 17:45:46.519213
\.


--
-- Data for Name: system_media_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_media_settings (id, max_image_size_mb, max_video_size_mb, max_document_size_mb, max_audio_size_mb, storage_limit_gb, allowed_video_formats, allowed_image_formats, allowed_document_formats, allowed_audio_formats, auto_optimize_images, auto_generate_thumbnails, created_at, updated_at, max_image_storage_mb, max_video_storage_mb, auto_optimize_videos, video_quality_max, subscription_plan_id) FROM stdin;
5	10	200	225	25	64	["mp4", "mov", "avi", "webm"]	["jpg", "jpeg", "png", "gif", "webp"]	["pdf", "doc", "docx", "txt"]	["mp3", "wav", "ogg", "m4a"]	t	t	2025-12-08 21:56:21.213902	2025-12-08 22:05:26.699354	0	0	f	\N	5
6	15	500	50	50	100	["mp4", "mov", "avi", "webm"]	["jpg", "jpeg", "png", "gif", "webp"]	["pdf", "doc", "docx", "txt"]	["mp3", "wav", "ogg", "m4a"]	t	t	2025-12-08 21:56:42.334599	2025-12-08 22:05:48.682138	0	0	f	\N	6
7	25	1000	100	100	250	["mp4", "mov", "avi", "webm"]	["jpg", "jpeg", "png", "gif", "webp"]	["pdf", "doc", "docx", "txt"]	["mp3", "wav", "ogg", "m4a"]	t	t	2025-12-08 21:56:58.023052	2025-12-08 22:06:20.34478	0	0	f	\N	7
8	50	2000	200	200	500	["mp4", "mov", "avi", "webm"]	["jpg", "jpeg", "png", "gif", "webp"]	["pdf", "doc", "docx", "txt"]	["mp3", "wav", "ogg", "m4a"]	t	t	2025-12-08 21:57:20.526199	2025-12-08 22:06:55.462299	0	0	f	\N	8
9	100	5000	500	500	1000	["mp4", "mov", "avi", "webm"]	["jpg", "jpeg", "png", "gif", "webp"]	["pdf", "doc", "docx", "txt"]	["mp3", "wav", "ogg", "m4a"]	t	t	2025-12-08 21:57:34.728902	2025-12-08 22:07:22.056701	0	0	f	\N	9
10	5	50	10	10	1	["mp4", "mov", "avi", "webm"]	["jpg", "jpeg", "png", "gif", "webp"]	["pdf", "doc", "docx", "txt"]	["mp3", "wav", "ogg", "m4a"]	t	t	2025-12-28 02:33:33.913213	2025-12-28 02:33:33.913213	0	0	f	\N	16
\.


--
-- Data for Name: system_payment_gateways; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_payment_gateways (id, gateway_name, display_name, gateway_type, api_key, api_secret, webhook_secret, test_mode, enabled, supported_currencies, config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: system_performance_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_performance_metrics (id, metric_type, metric_name, metric_value, unit, recorded_at, metadata) FROM stdin;
\.


--
-- Data for Name: system_security_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_security_settings (id, two_factor_auth_enabled, two_factor_required_for_admins, session_timeout_minutes, max_login_attempts, lockout_duration_minutes, password_min_length, password_require_uppercase, password_require_lowercase, password_require_numbers, password_require_special, password_expiry_days, ip_whitelist, ip_blacklist, allowed_domains, csrf_protection, rate_limiting_enabled, created_at, updated_at) FROM stdin;
1	f	t	30	5	30	8	t	t	t	t	90	{}	{}	{}	t	t	2025-10-10 20:21:32.629536	2025-10-10 20:21:32.629536
\.


--
-- Data for Name: system_sms_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_sms_config (id, twilio_account_sid, twilio_auth_token, twilio_from_number, default_country_code, enabled, daily_limit, otp_expiry_minutes, otp_length, otp_numeric_only, created_at, updated_at) FROM stdin;
1				+251	t	1000	5	6	t	2025-10-11 22:41:30.4378	2025-10-11 22:41:30.4378
\.


--
-- Data for Name: system_sms_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_sms_log (id, phone_number, message, status, twilio_sid, error_message, sent_at, delivered_at, created_at) FROM stdin;
\.


--
-- Data for Name: system_statistics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_statistics (id, stat_date, total_users, total_students, total_tutors, total_parents, total_advertisers, total_admins, active_users_today, new_users_today, total_videos, total_courses, total_reviews, total_revenue, storage_used_gb, bandwidth_used_gb, api_calls_today, error_count_today, avg_response_time_ms, created_at, updated_at) FROM stdin;
1	2025-10-10	0	0	0	0	0	0	0	0	0	0	0	0.00	0.00	0.00	0	0	0.00	2025-10-10 20:21:32.629536	2025-10-10 20:21:32.629536
\.


--
-- Data for Name: system_subscription_tiers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_subscription_tiers (id, tier_name, display_name, description, price_monthly, price_yearly, features, limits, is_active, sort_order, created_at, updated_at) FROM stdin;
1	free	Free	\N	0.00	0.00	["Basic access", "5GB storage", "Up to 50MB videos"]	{}	t	0	2025-10-10 20:21:32.629536	2025-10-10 20:21:32.629536
2	basic	Basic	\N	499.00	4999.00	["All free features", "20GB storage", "Up to 100MB videos", "Priority support"]	{}	t	0	2025-10-10 20:21:32.629536	2025-10-10 20:21:32.629536
3	premium	Premium	\N	999.00	9999.00	["All basic features", "100GB storage", "Up to 200MB videos", "Advanced analytics"]	{}	t	0	2025-10-10 20:21:32.629536	2025-10-10 20:21:32.629536
4	enterprise	Enterprise	\N	2999.00	29999.00	["All premium features", "500GB storage", "Unlimited videos", "Dedicated support"]	{}	t	0	2025-10-10 20:21:32.629536	2025-10-10 20:21:32.629536
\.


--
-- Data for Name: verification_fee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.verification_fee (id, type, features, price, currency, duration_days, created_at, updated_at, country) FROM stdin;
1	individual	["Profile verification badge", "Identity verification", "Priority support"]	99.00	ETB	365	2025-12-05 11:45:37.114326	2025-12-05 11:45:37.114326	all
2	organization	["Organization verification badge", "Identity verification", "Multiple user verification", "Featured listing", "Priority support"]	299.00	ETB	365	2025-12-05 11:45:37.114326	2025-12-05 11:45:37.114326	all
\.


--
-- Name: admin_credentials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_credentials_id_seq', 1, false);


--
-- Name: admin_invitations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_invitations_id_seq', 1, true);


--
-- Name: admin_leave_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_leave_requests_id_seq', 1, false);


--
-- Name: admin_portfolio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_portfolio_id_seq', 1, false);


--
-- Name: admin_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_profile_id_seq', 10, true);


--
-- Name: admin_resignations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_resignations_id_seq', 1, false);


--
-- Name: admin_reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_reviews_id_seq', 53, true);


--
-- Name: affiliate_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.affiliate_settings_id_seq', 1, true);


--
-- Name: affiliate_tiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.affiliate_tiers_id_seq', 27, true);


--
-- Name: astegni_reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.astegni_reviews_id_seq', 3, true);


--
-- Name: base_price_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.base_price_rules_id_seq', 10, true);


--
-- Name: campaign_packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.campaign_packages_id_seq', 8, true);


--
-- Name: cpi_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cpi_settings_id_seq', 1, true);


--
-- Name: manage_admins_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.manage_admins_profile_id_seq', 1, true);


--
-- Name: manage_advertisers_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.manage_advertisers_profile_id_seq', 1, false);


--
-- Name: manage_contents_profile_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.manage_contents_profile_profile_id_seq', 1, false);


--
-- Name: manage_courses_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.manage_courses_profile_id_seq', 2, true);


--
-- Name: manage_credentials_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.manage_credentials_profile_id_seq', 1, true);


--
-- Name: manage_customers_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.manage_customers_profile_id_seq', 1, false);


--
-- Name: manage_schools_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.manage_schools_profile_id_seq', 2, true);


--
-- Name: manage_system_settings_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.manage_system_settings_profile_id_seq', 1, true);


--
-- Name: manage_uploads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.manage_uploads_id_seq', 1, false);


--
-- Name: otps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.otps_id_seq', 70, true);


--
-- Name: payment_gateways_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payment_gateways_id_seq', 3, true);


--
-- Name: subscription_features_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subscription_features_id_seq', 33, true);


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subscription_plans_id_seq', 17, true);


--
-- Name: system_affiliate_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_affiliate_settings_id_seq', 2, false);


--
-- Name: system_api_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_api_keys_id_seq', 1, false);


--
-- Name: system_api_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_api_settings_id_seq', 2, false);


--
-- Name: system_backup_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_backup_config_id_seq', 2, false);


--
-- Name: system_backup_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_backup_history_id_seq', 1, false);


--
-- Name: system_email_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_email_config_id_seq', 2, false);


--
-- Name: system_email_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_email_templates_id_seq', 4, false);


--
-- Name: system_general_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_general_settings_id_seq', 2, false);


--
-- Name: system_impression_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_impression_stats_id_seq', 1, false);


--
-- Name: system_impressions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_impressions_id_seq', 1, false);


--
-- Name: system_integrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_integrations_id_seq', 1, false);


--
-- Name: system_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_logs_id_seq', 1, false);


--
-- Name: system_maintenance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_maintenance_id_seq', 2, false);


--
-- Name: system_media_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_media_id_seq', 3, true);


--
-- Name: system_media_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_media_settings_id_seq', 10, true);


--
-- Name: system_payment_gateways_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_payment_gateways_id_seq', 1, false);


--
-- Name: system_performance_metrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_performance_metrics_id_seq', 1, false);


--
-- Name: system_security_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_security_settings_id_seq', 2, false);


--
-- Name: system_sms_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_sms_log_id_seq', 1, false);


--
-- Name: system_statistics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_statistics_id_seq', 2, false);


--
-- Name: system_subscription_tiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_subscription_tiers_id_seq', 5, false);


--
-- Name: verification_fee_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.verification_fee_id_seq', 2, true);


--
-- Name: admin_credentials admin_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_credentials
    ADD CONSTRAINT admin_credentials_pkey PRIMARY KEY (id);


--
-- Name: admin_invitations admin_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_invitations
    ADD CONSTRAINT admin_invitations_pkey PRIMARY KEY (id);


--
-- Name: admin_leave_requests admin_leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_leave_requests
    ADD CONSTRAINT admin_leave_requests_pkey PRIMARY KEY (id);


--
-- Name: admin_portfolio admin_portfolio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_portfolio
    ADD CONSTRAINT admin_portfolio_pkey PRIMARY KEY (id);


--
-- Name: admin_profile admin_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_profile
    ADD CONSTRAINT admin_profile_pkey PRIMARY KEY (id);


--
-- Name: admin_resignations admin_resignations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_resignations
    ADD CONSTRAINT admin_resignations_pkey PRIMARY KEY (id);


--
-- Name: admin_reviews admin_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_reviews
    ADD CONSTRAINT admin_reviews_pkey PRIMARY KEY (id);


--
-- Name: affiliate_program affiliate_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_program
    ADD CONSTRAINT affiliate_settings_pkey PRIMARY KEY (id);


--
-- Name: affiliate_tiers affiliate_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_tiers
    ADD CONSTRAINT affiliate_tiers_pkey PRIMARY KEY (id);


--
-- Name: affiliate_tiers affiliate_tiers_program_id_tier_level_business_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_tiers
    ADD CONSTRAINT affiliate_tiers_program_id_tier_level_business_type_key UNIQUE (program_id, tier_level, business_type);


--
-- Name: astegni_reviews astegni_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.astegni_reviews
    ADD CONSTRAINT astegni_reviews_pkey PRIMARY KEY (id);


--
-- Name: base_price_rules base_price_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_price_rules
    ADD CONSTRAINT base_price_rules_pkey PRIMARY KEY (id);


--
-- Name: brand_packages campaign_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_packages
    ADD CONSTRAINT campaign_packages_pkey PRIMARY KEY (id);


--
-- Name: cpi_settings cpi_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cpi_settings
    ADD CONSTRAINT cpi_settings_pkey PRIMARY KEY (id);


--
-- Name: manage_admins_profile manage_admins_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_admins_profile
    ADD CONSTRAINT manage_admins_profile_pkey PRIMARY KEY (id);


--
-- Name: manage_advertisers_profile manage_advertisers_profile_admin_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_advertisers_profile
    ADD CONSTRAINT manage_advertisers_profile_admin_id_key UNIQUE (admin_id);


--
-- Name: manage_advertisers_profile manage_advertisers_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_advertisers_profile
    ADD CONSTRAINT manage_advertisers_profile_pkey PRIMARY KEY (id);


--
-- Name: manage_courses_profile manage_courses_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_courses_profile
    ADD CONSTRAINT manage_courses_profile_pkey PRIMARY KEY (id);


--
-- Name: manage_credentials_profile manage_credentials_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_credentials_profile
    ADD CONSTRAINT manage_credentials_profile_pkey PRIMARY KEY (id);


--
-- Name: manage_customers_profile manage_customers_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_customers_profile
    ADD CONSTRAINT manage_customers_profile_pkey PRIMARY KEY (id);


--
-- Name: manage_schools_profile manage_schools_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_schools_profile
    ADD CONSTRAINT manage_schools_profile_pkey PRIMARY KEY (id);


--
-- Name: manage_system_settings_profile manage_system_settings_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_system_settings_profile
    ADD CONSTRAINT manage_system_settings_profile_pkey PRIMARY KEY (id);


--
-- Name: manage_uploads manage_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_uploads
    ADD CONSTRAINT manage_uploads_pkey PRIMARY KEY (id);


--
-- Name: otps otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otps
    ADD CONSTRAINT otps_pkey PRIMARY KEY (id);


--
-- Name: payment_gateways payment_gateways_gateway_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_gateways
    ADD CONSTRAINT payment_gateways_gateway_name_key UNIQUE (gateway_name);


--
-- Name: payment_gateways payment_gateways_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_gateways
    ADD CONSTRAINT payment_gateways_pkey PRIMARY KEY (id);


--
-- Name: subscription_features subscription_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_features
    ADD CONSTRAINT subscription_features_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: system_affiliate_settings system_affiliate_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_affiliate_settings
    ADD CONSTRAINT system_affiliate_settings_pkey PRIMARY KEY (id);


--
-- Name: system_api_keys system_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_api_keys
    ADD CONSTRAINT system_api_keys_pkey PRIMARY KEY (id);


--
-- Name: system_api_settings system_api_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_api_settings
    ADD CONSTRAINT system_api_settings_pkey PRIMARY KEY (id);


--
-- Name: system_backup_config system_backup_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_backup_config
    ADD CONSTRAINT system_backup_config_pkey PRIMARY KEY (id);


--
-- Name: system_backup_history system_backup_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_backup_history
    ADD CONSTRAINT system_backup_history_pkey PRIMARY KEY (id);


--
-- Name: system_email_config system_email_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_email_config
    ADD CONSTRAINT system_email_config_pkey PRIMARY KEY (id);


--
-- Name: system_email_templates system_email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_email_templates
    ADD CONSTRAINT system_email_templates_pkey PRIMARY KEY (id);


--
-- Name: system_general_settings system_general_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_general_settings
    ADD CONSTRAINT system_general_settings_pkey PRIMARY KEY (id);


--
-- Name: system_impression_stats system_impression_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_impression_stats
    ADD CONSTRAINT system_impression_stats_pkey PRIMARY KEY (id);


--
-- Name: system_impressions system_impressions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_impressions
    ADD CONSTRAINT system_impressions_pkey PRIMARY KEY (id);


--
-- Name: system_integrations system_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_integrations
    ADD CONSTRAINT system_integrations_pkey PRIMARY KEY (id);


--
-- Name: system_logs system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);


--
-- Name: system_maintenance system_maintenance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_maintenance
    ADD CONSTRAINT system_maintenance_pkey PRIMARY KEY (id);


--
-- Name: system_media system_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_media
    ADD CONSTRAINT system_media_pkey PRIMARY KEY (id);


--
-- Name: system_media_settings system_media_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_media_settings
    ADD CONSTRAINT system_media_settings_pkey PRIMARY KEY (id);


--
-- Name: system_media_settings system_media_settings_subscription_plan_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_media_settings
    ADD CONSTRAINT system_media_settings_subscription_plan_id_unique UNIQUE (subscription_plan_id);


--
-- Name: system_payment_gateways system_payment_gateways_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_payment_gateways
    ADD CONSTRAINT system_payment_gateways_pkey PRIMARY KEY (id);


--
-- Name: system_performance_metrics system_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_performance_metrics
    ADD CONSTRAINT system_performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: system_security_settings system_security_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_security_settings
    ADD CONSTRAINT system_security_settings_pkey PRIMARY KEY (id);


--
-- Name: system_sms_config system_sms_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_sms_config
    ADD CONSTRAINT system_sms_config_pkey PRIMARY KEY (id);


--
-- Name: system_sms_log system_sms_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_sms_log
    ADD CONSTRAINT system_sms_log_pkey PRIMARY KEY (id);


--
-- Name: system_statistics system_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_statistics
    ADD CONSTRAINT system_statistics_pkey PRIMARY KEY (id);


--
-- Name: system_subscription_tiers system_subscription_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_subscription_tiers
    ADD CONSTRAINT system_subscription_tiers_pkey PRIMARY KEY (id);


--
-- Name: subscription_features unique_plan_role_feature; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_features
    ADD CONSTRAINT unique_plan_role_feature UNIQUE (subscription_plan_id, user_role, feature_name);


--
-- Name: astegni_reviews unique_reviewer; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.astegni_reviews
    ADD CONSTRAINT unique_reviewer UNIQUE (reviewer_id);


--
-- Name: verification_fee verification_fee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_fee
    ADD CONSTRAINT verification_fee_pkey PRIMARY KEY (id);


--
-- Name: verification_fee verification_fee_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_fee
    ADD CONSTRAINT verification_fee_type_key UNIQUE (type);


--
-- Name: idx_admin_portfolio_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_portfolio_admin_id ON public.admin_portfolio USING btree (admin_id);


--
-- Name: idx_admin_portfolio_departments; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_portfolio_departments ON public.admin_portfolio USING gin (departments);


--
-- Name: idx_affiliate_tiers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliate_tiers_active ON public.affiliate_tiers USING btree (is_active);


--
-- Name: idx_affiliate_tiers_business_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliate_tiers_business_type ON public.affiliate_tiers USING btree (business_type);


--
-- Name: idx_affiliate_tiers_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliate_tiers_level ON public.affiliate_tiers USING btree (tier_level);


--
-- Name: idx_affiliate_tiers_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliate_tiers_program_id ON public.affiliate_tiers USING btree (program_id);


--
-- Name: idx_astegni_reviews_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_astegni_reviews_created ON public.astegni_reviews USING btree (created_at);


--
-- Name: idx_astegni_reviews_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_astegni_reviews_featured ON public.astegni_reviews USING btree (is_featured);


--
-- Name: idx_astegni_reviews_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_astegni_reviews_rating ON public.astegni_reviews USING btree (rating);


--
-- Name: idx_astegni_reviews_reviewer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_astegni_reviews_reviewer ON public.astegni_reviews USING btree (reviewer_id);


--
-- Name: idx_base_price_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_price_active ON public.base_price_rules USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_base_price_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_price_lookup ON public.base_price_rules USING btree (subject_category, session_format, is_active);


--
-- Name: idx_base_price_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_price_priority ON public.base_price_rules USING btree (priority, created_at DESC);


--
-- Name: idx_base_price_rules_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_price_rules_country ON public.base_price_rules USING btree (country);


--
-- Name: idx_base_price_rules_currency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_price_rules_currency ON public.base_price_rules USING btree (currency);


--
-- Name: idx_brand_packages_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_packages_active ON public.brand_packages USING btree (is_active);


--
-- Name: idx_brand_packages_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_packages_order ON public.brand_packages USING btree (display_order);


--
-- Name: idx_cpi_settings_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpi_settings_country ON public.cpi_settings USING btree (country);


--
-- Name: idx_invitations_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_department ON public.admin_invitations USING btree (department);


--
-- Name: idx_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_email ON public.admin_invitations USING btree (email);


--
-- Name: idx_invitations_invited_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_invited_by ON public.admin_invitations USING btree (invited_by);


--
-- Name: idx_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_status ON public.admin_invitations USING btree (status);


--
-- Name: idx_leave_requests_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_admin_id ON public.admin_leave_requests USING btree (admin_id);


--
-- Name: idx_leave_requests_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_dates ON public.admin_leave_requests USING btree (start_date, end_date);


--
-- Name: idx_leave_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_status ON public.admin_leave_requests USING btree (status);


--
-- Name: idx_otps_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otps_contact ON public.otps USING btree (contact);


--
-- Name: idx_otps_purpose; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otps_purpose ON public.otps USING btree (purpose);


--
-- Name: idx_resignations_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resignations_admin_id ON public.admin_resignations USING btree (admin_id);


--
-- Name: idx_resignations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resignations_status ON public.admin_resignations USING btree (status);


--
-- Name: idx_subscription_features_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_features_plan_id ON public.subscription_features USING btree (subscription_plan_id);


--
-- Name: idx_subscription_features_plan_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_features_plan_role ON public.subscription_features USING btree (subscription_plan_id, user_role);


--
-- Name: idx_subscription_features_user_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_features_user_role ON public.subscription_features USING btree (user_role);


--
-- Name: idx_subscription_plans_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_plans_active ON public.subscription_plans USING btree (is_active);


--
-- Name: idx_subscription_plans_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_plans_country ON public.subscription_plans USING btree (country);


--
-- Name: idx_system_media_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_media_category ON public.system_media USING btree (category);


--
-- Name: idx_system_media_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_media_is_active ON public.system_media USING btree (is_active);


--
-- Name: idx_system_media_media_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_media_media_type ON public.system_media USING btree (media_type);


--
-- Name: idx_system_media_uploader; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_media_uploader ON public.system_media USING btree (uploader_id);


--
-- Name: idx_unique_active_rules; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_active_rules ON public.base_price_rules USING btree (subject_category, session_format) WHERE (is_active = true);


--
-- Name: idx_unique_pending_invitation; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_pending_invitation ON public.admin_invitations USING btree (email, department) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_verification_fee_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_fee_country ON public.verification_fee USING btree (country);


--
-- Name: idx_verification_fee_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_fee_type ON public.verification_fee USING btree (type);


--
-- Name: ix_otps_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_otps_id ON public.otps USING btree (id);


--
-- Name: admin_invitations admin_invitations_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_invitations
    ADD CONSTRAINT admin_invitations_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_profile(id);


--
-- Name: admin_invitations admin_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_invitations
    ADD CONSTRAINT admin_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.admin_profile(id);


--
-- Name: admin_leave_requests admin_leave_requests_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_leave_requests
    ADD CONSTRAINT admin_leave_requests_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_profile(id) ON DELETE CASCADE;


--
-- Name: admin_leave_requests admin_leave_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_leave_requests
    ADD CONSTRAINT admin_leave_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.admin_profile(id);


--
-- Name: admin_resignations admin_resignations_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_resignations
    ADD CONSTRAINT admin_resignations_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_profile(id) ON DELETE CASCADE;


--
-- Name: admin_resignations admin_resignations_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_resignations
    ADD CONSTRAINT admin_resignations_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.admin_profile(id);


--
-- Name: affiliate_tiers fk_affiliate_tiers_program; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_tiers
    ADD CONSTRAINT fk_affiliate_tiers_program FOREIGN KEY (program_id) REFERENCES public.affiliate_program(id) ON DELETE CASCADE;


--
-- Name: system_media_settings fk_subscription_plan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_media_settings
    ADD CONSTRAINT fk_subscription_plan FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;


--
-- Name: manage_admins_profile manage_admins_profile_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_admins_profile
    ADD CONSTRAINT manage_admins_profile_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_profile(id);


--
-- Name: manage_advertisers_profile manage_advertisers_profile_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_advertisers_profile
    ADD CONSTRAINT manage_advertisers_profile_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_profile(id);


--
-- Name: manage_credentials_profile manage_credentials_profile_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manage_credentials_profile
    ADD CONSTRAINT manage_credentials_profile_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_profile(id);


--
-- Name: subscription_features subscription_features_subscription_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_features
    ADD CONSTRAINT subscription_features_subscription_plan_id_fkey FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

