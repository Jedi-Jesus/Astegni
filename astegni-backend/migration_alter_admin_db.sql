-- ADMIN DATABASE - ALTER STATEMENTS

-- affiliate_tiers
ALTER TABLE affiliate_tiers ADD COLUMN IF NOT EXISTS business_type VARCHAR(50);

-- astegni_reviews
ALTER TABLE astegni_reviews ADD COLUMN IF NOT EXISTS ease_of_use INTEGER;
ALTER TABLE astegni_reviews ADD COLUMN IF NOT EXISTS features_quality INTEGER;
ALTER TABLE astegni_reviews ADD COLUMN IF NOT EXISTS pricing INTEGER;
ALTER TABLE astegni_reviews ADD COLUMN IF NOT EXISTS support_quality INTEGER;
ALTER TABLE astegni_reviews ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN;

-- cpi_settings
ALTER TABLE cpi_settings ADD COLUMN IF NOT EXISTS country VARCHAR(5);

-- subscription_plans
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS country VARCHAR(5);

-- verification_fee
ALTER TABLE verification_fee ADD COLUMN IF NOT EXISTS country VARCHAR(5);
