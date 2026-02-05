-- ADMIN DATABASE MIGRATION
-- Generated: $(date +%Y-%m-%d)

-- CREATE NEW TABLES

-- base_price_rules
CREATE TABLE IF NOT EXISTS "base_price_rules" (
    "id" integer NOT NULL DEFAULT nextval('base_price_rules_id_seq'::regclass),
    "rule_name" character varying(200) NOT NULL,
    "subject_category" character varying(100) NOT NULL,
    "session_format" character varying(50) NOT NULL,
    "base_price_per_hour" numeric NOT NULL,
    "credential_bonus" numeric DEFAULT 0,
    "priority" integer DEFAULT 2,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone,
    "experience_bonus_per_year" numeric NOT NULL DEFAULT 0,
    "min_grade_level" integer DEFAULT 1,
    "max_grade_level" integer DEFAULT 12,
    "country" character varying(100) DEFAULT 'all'::character varying,
    "currency" character varying(10) DEFAULT 'ETB'::character varying,
    PRIMARY KEY ("id")
);


-- subscription_features
CREATE TABLE IF NOT EXISTS "subscription_features" (
    "id" integer NOT NULL DEFAULT nextval('subscription_features_id_seq'::regclass),
    "subscription_plan_id" integer NOT NULL,
    "user_role" character varying(50) NOT NULL,
    "feature_name" character varying(255) NOT NULL,
    "feature_description" text,
    "is_enabled" boolean NOT NULL DEFAULT true,
    "feature_value" text,
    "created_at" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id"),
    PRIMARY KEY ("id")
);


-- ALTER EXISTING TABLES

-- affiliate_tiers
ALTER TABLE "affiliate_tiers" ADD COLUMN IF NOT EXISTS business_type VARCHAR(50);

-- astegni_reviews
ALTER TABLE "astegni_reviews" ADD COLUMN IF NOT EXISTS ease_of_use INTEGER;
ALTER TABLE "astegni_reviews" ADD COLUMN IF NOT EXISTS features_quality INTEGER;
ALTER TABLE "astegni_reviews" ADD COLUMN IF NOT EXISTS pricing INTEGER;
ALTER TABLE "astegni_reviews" ADD COLUMN IF NOT EXISTS support_quality INTEGER;
ALTER TABLE "astegni_reviews" ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN;
-- ALTER TABLE "astegni_reviews" DROP COLUMN IF EXISTS "customer_service";  -- COMMENTED: Manual review required
-- ALTER TABLE "astegni_reviews" DROP COLUMN IF EXISTS "employee_satisfaction";  -- COMMENTED: Manual review required
-- ALTER TABLE "astegni_reviews" DROP COLUMN IF EXISTS "platform_satisfaction";  -- COMMENTED: Manual review required
-- ALTER TABLE "astegni_reviews" DROP COLUMN IF EXISTS "reviewer_role";  -- COMMENTED: Manual review required

-- cpi_settings
ALTER TABLE "cpi_settings" ADD COLUMN IF NOT EXISTS country VARCHAR(5);

-- subscription_plans
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS country VARCHAR(5);
-- ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "features";  -- COMMENTED: Manual review required
-- ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "subscription_type";  -- COMMENTED: Manual review required

-- verification_fee
ALTER TABLE "verification_fee" ADD COLUMN IF NOT EXISTS country VARCHAR(5);
