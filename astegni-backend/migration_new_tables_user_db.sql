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
-- Name: chat_two_step_verification; Type: TABLE; Schema: public; Owner: astegni_user
--

CREATE TABLE public.chat_two_step_verification (
    id integer NOT NULL,
    user_id integer NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    secret_key character varying(255),
    backup_codes text[],
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    last_verified_at timestamp without time zone,
    password_hash character varying(255),
    recovery_email character varying(255)
);


ALTER TABLE public.chat_two_step_verification OWNER TO astegni_user;

--
-- Name: chat_two_step_verification_id_seq; Type: SEQUENCE; Schema: public; Owner: astegni_user
--

CREATE SEQUENCE public.chat_two_step_verification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_two_step_verification_id_seq OWNER TO astegni_user;

--
-- Name: chat_two_step_verification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: astegni_user
--

ALTER SEQUENCE public.chat_two_step_verification_id_seq OWNED BY public.chat_two_step_verification.id;


--
-- Name: user_investments; Type: TABLE; Schema: public; Owner: astegni_user
--

CREATE TABLE public.user_investments (
    id integer NOT NULL,
    investment_type character varying(100) NOT NULL,
    investment_name character varying(255) NOT NULL,
    amount numeric(10,2),
    current_value numeric(10,2),
    roi_percentage numeric(5,2),
    investment_date date NOT NULL,
    maturity_date date,
    status character varying(50) DEFAULT 'active'::character varying,
    description text,
    risk_level character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer NOT NULL,
    student_payment_id integer,
    due_date date,
    paid_date timestamp without time zone,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    days_overdue integer DEFAULT 0,
    late_fee numeric(12,2) DEFAULT 0.00,
    payment_method character varying(50),
    transaction_id character varying(100),
    payment_gateway character varying(50),
    billing_cycle character varying(20),
    is_recurring boolean DEFAULT false,
    next_billing_date date,
    auto_renew boolean DEFAULT false,
    subscription_plan_id integer
);


ALTER TABLE public.user_investments OWNER TO astegni_user;

--
-- Name: TABLE user_investments; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON TABLE public.user_investments IS 'Comprehensive payment tracking for subscriptions and bookings. Tracks payment due dates, actual payments, late fees, and payment reliability for all users.';


--
-- Name: COLUMN user_investments.amount; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.amount IS 'Investment amount - can be NULL if calculated from subscription_plan or package';


--
-- Name: COLUMN user_investments.user_id; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.user_id IS 'References users.id - the user who made this investment';


--
-- Name: COLUMN user_investments.student_payment_id; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.student_payment_id IS 'References enrolled_students.id - for booking/enrollment investments. The agreed_price comes from enrolled_students table.';


--
-- Name: COLUMN user_investments.due_date; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.due_date IS 'Payment due date - when payment is expected';


--
-- Name: COLUMN user_investments.paid_date; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.paid_date IS 'Actual payment date - when payment was received';


--
-- Name: COLUMN user_investments.payment_status; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.payment_status IS 'Payment status: pending, paid, late, missed, failed, refunded';


--
-- Name: COLUMN user_investments.days_overdue; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.days_overdue IS 'Number of days payment is overdue (calculated daily)';


--
-- Name: COLUMN user_investments.late_fee; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.late_fee IS 'Late fee charged for overdue payments';


--
-- Name: COLUMN user_investments.payment_method; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.payment_method IS 'Payment method: bank_transfer, mobile_money, cash, chapa, telebirr, etc.';


--
-- Name: COLUMN user_investments.transaction_id; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.transaction_id IS 'Unique transaction ID from payment gateway';


--
-- Name: COLUMN user_investments.payment_gateway; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.payment_gateway IS 'Payment gateway used: chapa, telebirr, mpesa, stripe, etc.';


--
-- Name: COLUMN user_investments.billing_cycle; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.billing_cycle IS 'Billing cycle: monthly, quarterly, yearly, one_time';


--
-- Name: COLUMN user_investments.is_recurring; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.is_recurring IS 'Whether this is a recurring subscription payment';


--
-- Name: COLUMN user_investments.next_billing_date; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.next_billing_date IS 'Next billing date for recurring subscriptions';


--
-- Name: COLUMN user_investments.auto_renew; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.auto_renew IS 'Whether subscription auto-renews';


--
-- Name: COLUMN user_investments.subscription_plan_id; Type: COMMENT; Schema: public; Owner: astegni_user
--

COMMENT ON COLUMN public.user_investments.subscription_plan_id IS 'References subscription_plans.id in admin_db - only for subscription investments. NOTE: Foreign key not enforced due to cross-database reference';


--
-- Name: pinned_messages; Type: TABLE; Schema: public; Owner: astegni_user
--

CREATE TABLE public.pinned_messages (
    id integer NOT NULL,
    message_id integer NOT NULL,
    conversation_id integer NOT NULL,
    pinned_by_user_id integer NOT NULL,
    pinned_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.pinned_messages OWNER TO astegni_user;

--
-- Name: pinned_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: astegni_user
--

CREATE SEQUENCE public.pinned_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pinned_messages_id_seq OWNER TO astegni_user;

--
-- Name: pinned_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: astegni_user
--

ALTER SEQUENCE public.pinned_messages_id_seq OWNED BY public.pinned_messages.id;


--
-- Name: price_suggestion_analytics; Type: TABLE; Schema: public; Owner: astegni_user
--

CREATE TABLE public.price_suggestion_analytics (
    id integer NOT NULL,
    tutor_id integer NOT NULL,
    user_id integer NOT NULL,
    suggested_price numeric(10,2) NOT NULL,
    market_average numeric(10,2) NOT NULL,
    tutor_rating numeric(3,2),
    tutor_experience_years integer,
    tutor_student_count integer,
    time_period_months integer DEFAULT 3 NOT NULL,
    filters_applied text,
    accepted boolean DEFAULT false,
    accepted_price numeric(10,2),
    accepted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.price_suggestion_analytics OWNER TO astegni_user;

--
-- Name: price_suggestion_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: astegni_user
--

CREATE SEQUENCE public.price_suggestion_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.price_suggestion_analytics_id_seq OWNER TO astegni_user;

--
-- Name: price_suggestion_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: astegni_user
--

ALTER SEQUENCE public.price_suggestion_analytics_id_seq OWNED BY public.price_suggestion_analytics.id;


--
-- Name: referral_clicks; Type: TABLE; Schema: public; Owner: astegni_user
--

CREATE TABLE public.referral_clicks (
    id integer NOT NULL,
    referral_code character varying(20) NOT NULL,
    clicked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(45),
    user_agent text,
    converted boolean DEFAULT false,
    converted_user_id integer
);


ALTER TABLE public.referral_clicks OWNER TO astegni_user;

--
-- Name: referral_clicks_id_seq; Type: SEQUENCE; Schema: public; Owner: astegni_user
--

CREATE SEQUENCE public.referral_clicks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.referral_clicks_id_seq OWNER TO astegni_user;

--
-- Name: referral_clicks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: astegni_user
--

ALTER SEQUENCE public.referral_clicks_id_seq OWNED BY public.referral_clicks.id;


--
-- Name: referral_registrations; Type: TABLE; Schema: public; Owner: astegni_user
--

CREATE TABLE public.referral_registrations (
    id integer NOT NULL,
    referrer_user_id integer NOT NULL,
    referrer_profile_type character varying(20) NOT NULL,
    referral_code character varying(20) NOT NULL,
    referred_user_id integer NOT NULL,
    referred_user_email character varying(255) NOT NULL,
    referred_user_name character varying(255),
    registration_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    last_activity timestamp without time zone,
    notes text
);


ALTER TABLE public.referral_registrations OWNER TO astegni_user;

--
-- Name: referral_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: astegni_user
--

CREATE SEQUENCE public.referral_registrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.referral_registrations_id_seq OWNER TO astegni_user;

--
-- Name: referral_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: astegni_user
--

ALTER SEQUENCE public.referral_registrations_id_seq OWNED BY public.referral_registrations.id;


--
-- Name: student_investments; Type: TABLE; Schema: public; Owner: astegni_user
--

CREATE TABLE public.student_investments (
    id integer NOT NULL,
    student_profile_id integer NOT NULL,
    investment_type character varying(50) NOT NULL,
    investment_name character varying(255) NOT NULL,
    amount numeric(10,2) NOT NULL,
    current_value numeric(10,2) DEFAULT 0,
    roi_percentage numeric(5,2) DEFAULT 0,
    investment_date date NOT NULL,
    maturity_date date,
    status character varying(50) DEFAULT 'active'::character varying,
    description text,
    payment_method character varying(100),
    transaction_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.student_investments OWNER TO astegni_user;

--
-- Name: student_investments_id_seq; Type: SEQUENCE; Schema: public; Owner: astegni_user
--

CREATE SEQUENCE public.student_investments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_investments_id_seq OWNER TO astegni_user;

--
-- Name: student_investments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: astegni_user
--

ALTER SEQUENCE public.student_investments_id_seq OWNED BY public.student_investments.id;


--
-- Name: subscription_metrics; Type: TABLE; Schema: public; Owner: astegni_user
--

CREATE TABLE public.subscription_metrics (
    id integer NOT NULL,
    investment_id integer NOT NULL,
    tutor_profile_id integer NOT NULL,
    total_impressions integer DEFAULT 0,
    profile_views integer DEFAULT 0,
    clicks integer DEFAULT 0,
    click_through_rate numeric(5,2) DEFAULT 0.00,
    student_connections integer DEFAULT 0,
    connection_rate numeric(5,2) DEFAULT 0.00,
    cost_per_impression numeric(10,4) DEFAULT 0.0000,
    cost_per_click numeric(10,2) DEFAULT 0.00,
    cost_per_connection numeric(10,2) DEFAULT 0.00,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.subscription_metrics OWNER TO astegni_user;

--
-- Name: subscription_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: astegni_user
--

CREATE SEQUENCE public.subscription_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_metrics_id_seq OWNER TO astegni_user;

--
-- Name: subscription_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: astegni_user
--

ALTER SEQUENCE public.subscription_metrics_id_seq OWNED BY public.subscription_metrics.id;


--
-- Name: tutor_investments_id_seq; Type: SEQUENCE; Schema: public; Owner: astegni_user
--

CREATE SEQUENCE public.tutor_investments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tutor_investments_id_seq OWNER TO astegni_user;

--
-- Name: tutor_investments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: astegni_user
--

ALTER SEQUENCE public.tutor_investments_id_seq OWNED BY public.user_investments.id;


--
-- Name: user_referral_codes; Type: TABLE; Schema: public; Owner: astegni_user
--

CREATE TABLE public.user_referral_codes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    referral_code character varying(20) NOT NULL,
    profile_type character varying(20) NOT NULL,
    total_referrals integer DEFAULT 0,
    active_referrals integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_referral_codes OWNER TO astegni_user;

--
-- Name: user_referral_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: astegni_user
--

CREATE SEQUENCE public.user_referral_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_referral_codes_id_seq OWNER TO astegni_user;

--
-- Name: user_referral_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: astegni_user
--

ALTER SEQUENCE public.user_referral_codes_id_seq OWNED BY public.user_referral_codes.id;


--
-- Name: chat_two_step_verification id; Type: DEFAULT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.chat_two_step_verification ALTER COLUMN id SET DEFAULT nextval('public.chat_two_step_verification_id_seq'::regclass);


--
-- Name: pinned_messages id; Type: DEFAULT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.pinned_messages ALTER COLUMN id SET DEFAULT nextval('public.pinned_messages_id_seq'::regclass);


--
-- Name: price_suggestion_analytics id; Type: DEFAULT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.price_suggestion_analytics ALTER COLUMN id SET DEFAULT nextval('public.price_suggestion_analytics_id_seq'::regclass);


--
-- Name: referral_clicks id; Type: DEFAULT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.referral_clicks ALTER COLUMN id SET DEFAULT nextval('public.referral_clicks_id_seq'::regclass);


--
-- Name: referral_registrations id; Type: DEFAULT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.referral_registrations ALTER COLUMN id SET DEFAULT nextval('public.referral_registrations_id_seq'::regclass);


--
-- Name: student_investments id; Type: DEFAULT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.student_investments ALTER COLUMN id SET DEFAULT nextval('public.student_investments_id_seq'::regclass);


--
-- Name: subscription_metrics id; Type: DEFAULT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.subscription_metrics ALTER COLUMN id SET DEFAULT nextval('public.subscription_metrics_id_seq'::regclass);


--
-- Name: user_investments id; Type: DEFAULT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.user_investments ALTER COLUMN id SET DEFAULT nextval('public.tutor_investments_id_seq'::regclass);


--
-- Name: user_referral_codes id; Type: DEFAULT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.user_referral_codes ALTER COLUMN id SET DEFAULT nextval('public.user_referral_codes_id_seq'::regclass);


--
-- Name: chat_two_step_verification chat_two_step_verification_pkey; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.chat_two_step_verification
    ADD CONSTRAINT chat_two_step_verification_pkey PRIMARY KEY (id);


--
-- Name: chat_two_step_verification chat_two_step_verification_user_id_key; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.chat_two_step_verification
    ADD CONSTRAINT chat_two_step_verification_user_id_key UNIQUE (user_id);


--
-- Name: pinned_messages pinned_messages_message_id_conversation_id_key; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.pinned_messages
    ADD CONSTRAINT pinned_messages_message_id_conversation_id_key UNIQUE (message_id, conversation_id);


--
-- Name: pinned_messages pinned_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.pinned_messages
    ADD CONSTRAINT pinned_messages_pkey PRIMARY KEY (id);


--
-- Name: price_suggestion_analytics price_suggestion_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.price_suggestion_analytics
    ADD CONSTRAINT price_suggestion_analytics_pkey PRIMARY KEY (id);


--
-- Name: referral_clicks referral_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.referral_clicks
    ADD CONSTRAINT referral_clicks_pkey PRIMARY KEY (id);


--
-- Name: referral_registrations referral_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.referral_registrations
    ADD CONSTRAINT referral_registrations_pkey PRIMARY KEY (id);


--
-- Name: student_investments student_investments_pkey; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.student_investments
    ADD CONSTRAINT student_investments_pkey PRIMARY KEY (id);


--
-- Name: subscription_metrics subscription_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.subscription_metrics
    ADD CONSTRAINT subscription_metrics_pkey PRIMARY KEY (id);


--
-- Name: user_investments tutor_investments_pkey; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.user_investments
    ADD CONSTRAINT tutor_investments_pkey PRIMARY KEY (id);


--
-- Name: referral_registrations unique_referred_user; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.referral_registrations
    ADD CONSTRAINT unique_referred_user UNIQUE (referred_user_id);


--
-- Name: user_referral_codes unique_user_profile_referral; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.user_referral_codes
    ADD CONSTRAINT unique_user_profile_referral UNIQUE (user_id, profile_type);


--
-- Name: user_referral_codes user_referral_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.user_referral_codes
    ADD CONSTRAINT user_referral_codes_pkey PRIMARY KEY (id);


--
-- Name: user_referral_codes user_referral_codes_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.user_referral_codes
    ADD CONSTRAINT user_referral_codes_referral_code_key UNIQUE (referral_code);


--
-- Name: idx_chat_two_step_user; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_chat_two_step_user ON public.chat_two_step_verification USING btree (user_id);


--
-- Name: idx_pinned_messages_conversation; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_pinned_messages_conversation ON public.pinned_messages USING btree (conversation_id);


--
-- Name: idx_pinned_messages_message; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_pinned_messages_message ON public.pinned_messages USING btree (message_id);


--
-- Name: idx_price_analytics_accepted; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_price_analytics_accepted ON public.price_suggestion_analytics USING btree (accepted) WHERE (accepted = true);


--
-- Name: idx_price_analytics_created_at; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_price_analytics_created_at ON public.price_suggestion_analytics USING btree (created_at DESC);


--
-- Name: idx_price_analytics_tutor_id; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_price_analytics_tutor_id ON public.price_suggestion_analytics USING btree (tutor_id);


--
-- Name: idx_price_analytics_user_id; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_price_analytics_user_id ON public.price_suggestion_analytics USING btree (user_id);


--
-- Name: idx_referral_clicks_code; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_referral_clicks_code ON public.referral_clicks USING btree (referral_code);


--
-- Name: idx_referral_codes_code; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_referral_codes_code ON public.user_referral_codes USING btree (referral_code);


--
-- Name: idx_referral_codes_user; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_referral_codes_user ON public.user_referral_codes USING btree (user_id);


--
-- Name: idx_referral_registrations_referred; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_referral_registrations_referred ON public.referral_registrations USING btree (referred_user_id);


--
-- Name: idx_referral_registrations_referrer; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_referral_registrations_referrer ON public.referral_registrations USING btree (referrer_user_id);


--
-- Name: idx_student_investments_dates; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_student_investments_dates ON public.student_investments USING btree (investment_date, maturity_date);


--
-- Name: idx_student_investments_investment_type; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_student_investments_investment_type ON public.student_investments USING btree (investment_type);


--
-- Name: idx_student_investments_status; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_student_investments_status ON public.student_investments USING btree (status);


--
-- Name: idx_student_investments_student_profile_id; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_student_investments_student_profile_id ON public.student_investments USING btree (student_profile_id);


--
-- Name: idx_subscription_metrics_investment_id; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_subscription_metrics_investment_id ON public.subscription_metrics USING btree (investment_id);


--
-- Name: idx_subscription_metrics_period; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_subscription_metrics_period ON public.subscription_metrics USING btree (period_start, period_end);


--
-- Name: idx_subscription_metrics_recorded_at; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_subscription_metrics_recorded_at ON public.subscription_metrics USING btree (recorded_at);


--
-- Name: idx_subscription_metrics_tutor_profile_id; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_subscription_metrics_tutor_profile_id ON public.subscription_metrics USING btree (tutor_profile_id);


--
-- Name: idx_user_investments_due_date; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_user_investments_due_date ON public.user_investments USING btree (due_date);


--
-- Name: idx_user_investments_next_billing_date; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_user_investments_next_billing_date ON public.user_investments USING btree (next_billing_date);


--
-- Name: idx_user_investments_payment_status; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_user_investments_payment_status ON public.user_investments USING btree (payment_status);


--
-- Name: idx_user_investments_student_payment_id; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_user_investments_student_payment_id ON public.user_investments USING btree (student_payment_id);


--
-- Name: idx_user_investments_subscription_plan_id; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_user_investments_subscription_plan_id ON public.user_investments USING btree (subscription_plan_id);


--
-- Name: idx_user_investments_transaction_id; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_user_investments_transaction_id ON public.user_investments USING btree (transaction_id);


--
-- Name: idx_user_investments_user_id; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_user_investments_user_id ON public.user_investments USING btree (user_id);


--
-- Name: student_investments trigger_update_student_investments_updated_at; Type: TRIGGER; Schema: public; Owner: astegni_user
--

CREATE TRIGGER trigger_update_student_investments_updated_at BEFORE UPDATE ON public.student_investments FOR EACH ROW EXECUTE FUNCTION public.update_student_investments_updated_at();


--
-- Name: subscription_metrics trigger_update_subscription_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: astegni_user
--

CREATE TRIGGER trigger_update_subscription_metrics_updated_at BEFORE UPDATE ON public.subscription_metrics FOR EACH ROW EXECUTE FUNCTION public.update_subscription_metrics_updated_at();


--
-- Name: chat_two_step_verification chat_two_step_verification_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.chat_two_step_verification
    ADD CONSTRAINT chat_two_step_verification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pinned_messages pinned_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.pinned_messages
    ADD CONSTRAINT pinned_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: pinned_messages pinned_messages_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.pinned_messages
    ADD CONSTRAINT pinned_messages_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: pinned_messages pinned_messages_pinned_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.pinned_messages
    ADD CONSTRAINT pinned_messages_pinned_by_user_id_fkey FOREIGN KEY (pinned_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: price_suggestion_analytics price_suggestion_analytics_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.price_suggestion_analytics
    ADD CONSTRAINT price_suggestion_analytics_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.tutor_profiles(id) ON DELETE CASCADE;


--
-- Name: price_suggestion_analytics price_suggestion_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.price_suggestion_analytics
    ADD CONSTRAINT price_suggestion_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: referral_clicks referral_clicks_converted_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.referral_clicks
    ADD CONSTRAINT referral_clicks_converted_user_id_fkey FOREIGN KEY (converted_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: referral_registrations referral_registrations_referred_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.referral_registrations
    ADD CONSTRAINT referral_registrations_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: referral_registrations referral_registrations_referrer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.referral_registrations
    ADD CONSTRAINT referral_registrations_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_investments student_investments_student_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.student_investments
    ADD CONSTRAINT student_investments_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: subscription_metrics subscription_metrics_investment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.subscription_metrics
    ADD CONSTRAINT subscription_metrics_investment_id_fkey FOREIGN KEY (investment_id) REFERENCES public.user_investments(id) ON DELETE CASCADE;


--
-- Name: subscription_metrics subscription_metrics_tutor_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.subscription_metrics
    ADD CONSTRAINT subscription_metrics_tutor_profile_id_fkey FOREIGN KEY (tutor_profile_id) REFERENCES public.tutor_profiles(id) ON DELETE CASCADE;


--
-- Name: user_investments user_investments_student_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.user_investments
    ADD CONSTRAINT user_investments_student_payment_id_fkey FOREIGN KEY (student_payment_id) REFERENCES public.enrolled_students(id) ON DELETE SET NULL;


--
-- Name: user_investments user_investments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.user_investments
    ADD CONSTRAINT user_investments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_referral_codes user_referral_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.user_referral_codes
    ADD CONSTRAINT user_referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

