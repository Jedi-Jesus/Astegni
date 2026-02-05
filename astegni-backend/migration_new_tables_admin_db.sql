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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: base_price_rules; Type: TABLE; Schema: public; Owner: astegni_user
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


ALTER TABLE public.base_price_rules OWNER TO astegni_user;

--
-- Name: base_price_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: astegni_user
--

CREATE SEQUENCE public.base_price_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.base_price_rules_id_seq OWNER TO astegni_user;

--
-- Name: base_price_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: astegni_user
--

ALTER SEQUENCE public.base_price_rules_id_seq OWNED BY public.base_price_rules.id;


--
-- Name: subscription_features; Type: TABLE; Schema: public; Owner: astegni_user
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


ALTER TABLE public.subscription_features OWNER TO astegni_user;

--
-- Name: TABLE subscription_features; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON TABLE public.subscription_features IS 'Features available for each subscription plan, role-specific';


--
-- Name: COLUMN subscription_features.subscription_plan_id; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.subscription_features.subscription_plan_id IS 'References subscription_plans.id';


--
-- Name: COLUMN subscription_features.user_role; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.subscription_features.user_role IS 'Role this feature applies to: tutor, student, parent, advertiser';


--
-- Name: COLUMN subscription_features.feature_name; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.subscription_features.feature_name IS 'Name of the feature (e.g., profile_boost, priority_support, advanced_analytics)';


--
-- Name: COLUMN subscription_features.feature_value; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.subscription_features.feature_value IS 'Optional configuration value for the feature';


--
-- Name: subscription_features_id_seq; Type: SEQUENCE; Schema: public; Owner: astegni_user
--

CREATE SEQUENCE public.subscription_features_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_features_id_seq OWNER TO astegni_user;

--
-- Name: subscription_features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: astegni_user
--

ALTER SEQUENCE public.subscription_features_id_seq OWNED BY public.subscription_features.id;


--
-- Name: base_price_rules id; Type: DEFAULT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.base_price_rules ALTER COLUMN id SET DEFAULT nextval('public.base_price_rules_id_seq'::regclass);


--
-- Name: subscription_features id; Type: DEFAULT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.subscription_features ALTER COLUMN id SET DEFAULT nextval('public.subscription_features_id_seq'::regclass);


--
-- Name: base_price_rules base_price_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.base_price_rules
    ADD CONSTRAINT base_price_rules_pkey PRIMARY KEY (id);


--
-- Name: subscription_features subscription_features_pkey; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.subscription_features
    ADD CONSTRAINT subscription_features_pkey PRIMARY KEY (id);


--
-- Name: subscription_features unique_plan_role_feature; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.subscription_features
    ADD CONSTRAINT unique_plan_role_feature UNIQUE (subscription_plan_id, user_role, feature_name);


--
-- Name: idx_base_price_active; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_base_price_active ON public.base_price_rules USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_base_price_lookup; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_base_price_lookup ON public.base_price_rules USING btree (subject_category, session_format, is_active);


--
-- Name: idx_base_price_priority; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_base_price_priority ON public.base_price_rules USING btree (priority, created_at DESC);


--
-- Name: idx_base_price_rules_country; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_base_price_rules_country ON public.base_price_rules USING btree (country);


--
-- Name: idx_base_price_rules_currency; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_base_price_rules_currency ON public.base_price_rules USING btree (currency);


--
-- Name: idx_subscription_features_plan_id; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_subscription_features_plan_id ON public.subscription_features USING btree (subscription_plan_id);


--
-- Name: idx_subscription_features_plan_role; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_subscription_features_plan_role ON public.subscription_features USING btree (subscription_plan_id, user_role);


--
-- Name: idx_subscription_features_user_role; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_subscription_features_user_role ON public.subscription_features USING btree (user_role);


--
-- Name: idx_unique_active_rules; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE UNIQUE INDEX idx_unique_active_rules ON public.base_price_rules USING btree (subject_category, session_format) WHERE (is_active = true);


--
-- Name: subscription_features subscription_features_subscription_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.subscription_features
    ADD CONSTRAINT subscription_features_subscription_plan_id_fkey FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

