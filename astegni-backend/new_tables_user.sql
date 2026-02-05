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
-- Name: chat_two_step_verification id; Type: DEFAULT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.chat_two_step_verification ALTER COLUMN id SET DEFAULT nextval('public.chat_two_step_verification_id_seq'::regclass);


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
-- Name: idx_chat_two_step_user; Type: INDEX; Schema: public; Owner: astegni_user
--

CREATE INDEX idx_chat_two_step_user ON public.chat_two_step_verification USING btree (user_id);


--
-- Name: chat_two_step_verification chat_two_step_verification_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: astegni_user
--

ALTER TABLE ONLY public.chat_two_step_verification
    ADD CONSTRAINT chat_two_step_verification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

