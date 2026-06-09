"""
Advertiser Database Models for Astegni Educational Platform
Separate database for advertiser data (astegni_advertiser_db).

Why a separate DB:
    Advertisers are a self-contained subsystem (profiles, companies, brands,
    campaigns, ad media, impressions, engagement, billing). Like the admin DB,
    this DB has NO database-level foreign keys pointing OUT to astegni_user_db.
    The only outward link, advertiser_profiles.user_id -> users.id, is a PLAIN
    INTEGER here and is enforced in application code (two-query lookups), exactly
    like moderation_queue.user_id in the admin DB.

    Foreign keys BETWEEN advertiser tables (e.g. campaign_profile.advertiser_id ->
    advertiser_profiles.id) live entirely inside this DB and ARE enforced.

Consequences handled in app code (no longer guaranteed by the DB):
    - Deleting a user does NOT cascade to advertiser rows. The account-deletion
      flow must clean up this DB explicitly.
    - A user_id stored here is not guaranteed to exist in users.

Companion files:
    - create_advertiser_db.py     : create the DB + all tables
    - migrate_advertiser_db_split.py : copy rows out of astegni_user_db
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, Text, JSON,
    ForeignKey, Date, Numeric, BigInteger, CheckConstraint, Index, create_engine
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from config import ADVERTISER_DATABASE_URL

# ============================================
# ADVERTISER DATABASE SETUP
# ============================================

advertiser_engine = create_engine(ADVERTISER_DATABASE_URL)
AdvertiserSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=advertiser_engine)
AdvertiserBase = declarative_base()


def get_advertiser_db():
    """Dependency to get advertiser database session."""
    db = AdvertiserSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================
# ADVERTISER DATABASE MODELS
# ============================================

class AdvertiserProfile(AdvertiserBase):
    """An advertiser account's profile/role data.

    Moved out of astegni_user_db. NOTE: user_id is a plain integer linking to
    astegni_user_db.users.id with NO ForeignKey constraint (cross-DB). Resolve
    the user in application code: query users separately by this id.
    """
    __tablename__ = "advertiser_profiles"

    id = Column(Integer, primary_key=True, index=True)
    # Legacy cross-DB link to users.id (astegni_user_db). Self-contained advertiser
    # auth no longer requires it: nullable so users-less advertisers can register.
    user_id = Column(Integer, nullable=True, index=True)

    # Self-contained authentication (advertiser_profiles IS the advertiser users
    # table, analogous to admin_profile). email is unique (case-insensitive) via a
    # partial index defined in migrate_advertiser_auth.py.
    email = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    has_password = Column(Boolean, nullable=False, default=False)
    email_verified = Column(Boolean, nullable=False, default=False)
    phone = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    father_name = Column(String, nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Basic Info
    username = Column(String, unique=True, index=True)
    bio = Column(Text)
    quote = Column(Text)

    # Media
    cover_image = Column(String)

    # Hero section content (arrays for multiple lines)
    hero_title = Column(ARRAY(String), default=[])
    hero_subtitle = Column(ARRAY(String), default=[])

    # Status
    is_active = Column(Boolean, default=True)
    scheduled_deletion_at = Column(DateTime, nullable=True)

    # Membership date
    joined_in = Column(Date)

    # Two-Factor Authentication (2FA) - Role-specific
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_method = Column(String(50), nullable=True)
    two_factor_secret = Column(String(255), nullable=True)
    two_factor_backup_codes = Column(Text, nullable=True)
    two_factor_temp_code = Column(String(10), nullable=True)
    two_factor_temp_expiry = Column(DateTime, nullable=True)
    two_factor_inapp_password = Column(String(255), nullable=True)
    two_factor_verification_token = Column(String(255), nullable=True)
    two_factor_verification_expiry = Column(DateTime, nullable=True)
    two_factor_protected_panels = Column(JSONB, nullable=True,
                                         default=["settings", "team", "brands"])

    # Legacy brand id cache (array)
    brand_ids = Column(ARRAY(Integer), default=[])

    # Wallet / billing (legacy advertiser-level; per-company wallet lives on company_profile)
    balance = Column(Numeric(12, 2), default=0.00)
    currency = Column(String(3), default='ETB')
    total_deposits = Column(Numeric(12, 2), default=0.00)
    total_spent = Column(Numeric(12, 2), default=0.00)
    last_transaction_at = Column(DateTime, nullable=True)
    default_cancellation_fee_percent = Column(Numeric(5, 2), default=5.00)

    # Company Verification Fields (legacy advertiser-level company info)
    company_name = Column(String(255), nullable=True)
    industry = Column(String(100), nullable=True)
    company_size = Column(String(50), nullable=True)
    business_reg_no = Column(String(100), nullable=True)
    tin_number = Column(String(50), nullable=True)
    website = Column(String(500), nullable=True)
    company_email = Column(JSONB, default=[])
    company_phone = Column(JSONB, default=[])
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    company_description = Column(Text, nullable=True)
    company_logo = Column(String(500), nullable=True)
    business_license_url = Column(String(500), nullable=True)
    tin_certificate_url = Column(String(500), nullable=True)
    additional_docs_urls = Column(JSONB, default=[])
    verification_submitted_at = Column(DateTime, nullable=True)
    verification_reviewed_at = Column(DateTime, nullable=True)
    verification_notes = Column(Text, nullable=True)

    # Online Status (for whiteboard video calls)
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships (internal to this DB only)
    companies = relationship("CompanyProfile", back_populates="advertiser",
                             cascade="all, delete-orphan")


class CompanyProfile(AdvertiserBase):
    """A company owned by an advertiser. One advertiser can own multiple companies;
    each company has its own brands, campaigns, billing wallet, and KYC verification.
    """
    __tablename__ = "company_profile"

    id = Column(Integer, primary_key=True, index=True)
    advertiser_id = Column(Integer, ForeignKey("advertiser_profiles.id", ondelete="CASCADE"),
                           nullable=False, index=True)

    # Company identity
    company_name = Column(String(255), nullable=False)
    industry = Column(String(100), nullable=True)
    company_size = Column(String(50), nullable=True)
    business_reg_no = Column(String(100), nullable=True)
    tin_number = Column(String(50), nullable=True)
    website = Column(String(500), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    company_description = Column(Text, nullable=True)
    company_email = Column(JSONB, default=[])
    company_phone = Column(JSONB, default=[])

    # KYC / verification documents
    company_logo = Column(String(500), nullable=True)
    business_license_url = Column(String(500), nullable=True)
    tin_certificate_url = Column(String(500), nullable=True)
    additional_docs_urls = Column(JSONB, default=[])

    # Verification status (per-company)
    is_verified = Column(Boolean, default=False)
    verification_status = Column(String(20), nullable=True)
    verification_method = Column(String(20), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    verification_submitted_at = Column(DateTime, nullable=True)
    verification_reviewed_at = Column(DateTime, nullable=True)
    verification_notes = Column(Text, nullable=True)
    verification_escalated = Column(Boolean, default=False)
    verification_escalated_at = Column(DateTime, nullable=True)

    # Billing / wallet (per-company)
    balance = Column(Numeric(12, 2), default=0.00)
    currency = Column(String(3), default='ETB')
    total_deposits = Column(Numeric(12, 2), default=0.00)
    total_spent = Column(Numeric(12, 2), default=0.00)
    last_transaction_at = Column(DateTime, nullable=True)
    default_cancellation_fee_percent = Column(Numeric(5, 2), default=5.00)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    advertiser = relationship("AdvertiserProfile", back_populates="companies")


class BrandProfile(AdvertiserBase):
    """A brand under an advertiser/company. Campaigns belong to a brand.

    status_by is a plain integer (admin/user id, cross-DB) - app-enforced.
    """
    __tablename__ = "brand_profile"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    bio = Column(Text)
    quote = Column(Text)
    thumbnail = Column(String(500))
    social_links = Column(JSONB, default=[])
    hero_title = Column(String(255))
    hero_subtitle = Column(Text)
    badge = Column(String(100))
    status = Column(String(50), default='pending')
    status_by = Column(Integer, nullable=True)  # admin/user id (cross-DB, app-enforced)
    status_reason = Column(Text)
    status_at = Column(DateTime(timezone=True))
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    phone = Column(JSONB, default=[])
    email = Column(JSONB, default=[])
    location = Column(JSONB, default=[])
    campaign_ids = Column(ARRAY(Integer), default=[])
    package_id = Column(Integer, nullable=True)  # -> admin_db pricing package (cross-DB, app-enforced)
    industry = Column(String(100))
    website = Column(String(500))
    brand_color = Column(String(20), default='#8B5CF6')
    # Owning company (per-company brand model). FK internal to this DB.
    company_id = Column(Integer, ForeignKey("company_profile.id", ondelete="CASCADE"),
                        nullable=False, index=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','verified','rejected','suspended','active','paused','inactive')",
            name="brand_profile_status_check"
        ),
    )


class CampaignProfile(AdvertiserBase):
    """An ad campaign belonging to a brand/advertiser.

    cancelled_by_user_id and status_by are plain integers (cross-DB, app-enforced).
    """
    __tablename__ = "campaign_profile"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    description = Column(Text)
    objective = Column(String(255))
    is_verified = Column(Boolean, default=False)
    verification_status = Column(String(50), default='pending', index=True)
    status_by = Column(Integer, nullable=True)  # admin/user id (cross-DB, app-enforced)
    status_reason = Column(Text)
    status_at = Column(DateTime(timezone=True))
    start_date = Column(DateTime(timezone=True))
    target_location = Column(Text)
    campaign_socials = Column(JSONB, default=[])
    submitted_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    call_to_action = Column(String(255))
    target_audiences = Column(ARRAY(Text),
                              default=['tutor', 'student', 'parent', 'advertiser', 'user'])
    target_regions = Column(ARRAY(Text), default=[])
    target_placements = Column(ARRAY(Text),
                               default=['placeholder', 'widget', 'popup', 'insession'])
    cpi_rate = Column(Numeric(10, 4))
    total_charged = Column(Numeric(12, 2), default=0.00)
    billing_frequency = Column(Integer, default=1000)
    auto_pause_on_low_balance = Column(Boolean, default=True)
    minimum_balance_threshold = Column(Numeric(12, 2), default=100.00)
    launched_at = Column(DateTime, index=True)
    ended_at = Column(DateTime)
    pause_reason = Column(String(100))

    advertiser_id = Column(Integer,
                           ForeignKey("advertiser_profiles.id", ondelete="CASCADE"),
                           nullable=True, index=True)
    brand_id = Column(Integer,
                      ForeignKey("brand_profile.id", ondelete="SET NULL"),
                      nullable=True, index=True)

    cancellation_fee_percent = Column(Numeric(5, 2), default=5.00)
    campaign_budget = Column(Numeric(12, 2), default=0.00)
    amount_used = Column(Numeric(12, 2), default=0.00)
    remaining_balance = Column(Numeric(12, 2), default=0.00)
    cancellation_fee_amount = Column(Numeric(12, 2), default=0.00)
    cancelled_by_user_id = Column(Integer, nullable=True)  # users.id (cross-DB, app-enforced)
    cancellation_reason = Column(Text)
    paused_at = Column(DateTime)
    grace_period_hours = Column(Integer, default=24)
    deposit_percent = Column(Numeric(5, 2), default=20.00)
    deposit_amount = Column(Numeric(10, 2), default=0.00)
    outstanding_balance = Column(Numeric(10, 2), default=0.00)
    total_impressions_planned = Column(BigInteger, default=0)
    final_settlement_amount = Column(Numeric(10, 2), default=0.00)
    national_location = Column(String(500), default=None)
    national_country_code = Column(String(10), default=None)
    regional_country_code = Column(String(10), default=None)
    submit_for_verification = Column(Boolean, default=False)
    campaign_status = Column(String(20), default='draft')
    target_pages = Column(ARRAY(Text))
    # Owning company (per-company campaign model). FK internal to this DB.
    company_id = Column(Integer, ForeignKey("company_profile.id", ondelete="CASCADE"),
                        nullable=False, index=True)

    __table_args__ = (
        CheckConstraint(
            "campaign_status IN ('draft','active','paused','cancelled','completed')",
            name="campaign_profile_campaign_status_check"
        ),
        CheckConstraint(
            "verification_status IN ('pending','verified','approved','rejected','suspended')",
            name="campaign_profile_verification_status_check"
        ),
    )


class CampaignMedia(AdvertiserBase):
    """Uploaded creative (image/video) for a campaign placement.

    advertiser_id and brand_id are plain integers here (matches live schema:
    only campaign_id had a DB FK). file_name holds the FULL B2 key.
    """
    __tablename__ = "campaign_media"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaign_profile.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    brand_id = Column(Integer, nullable=False, index=True)
    advertiser_id = Column(Integer, nullable=False, index=True)
    media_type = Column(String(10), nullable=False, index=True)
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)  # FULL B2 key
    file_size = Column(BigInteger)
    placement = Column(String(50), nullable=False, index=True)
    content_type = Column(String(100))
    folder_path = Column(String(500))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("media_type IN ('image','video')",
                        name="campaign_media_media_type_check"),
    )


class CampaignImpression(AdvertiserBase):
    """One ad impression. user_id/profile_id are plain integers (cross-DB, app-enforced)."""
    __tablename__ = "campaign_impressions"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaign_profile.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    brand_id = Column(Integer)
    user_id = Column(Integer, index=True)         # users.id (cross-DB, app-enforced)
    profile_id = Column(Integer)
    profile_type = Column(String(50))
    placement = Column(String(50), index=True)
    location = Column(String(100), index=True)
    audience = Column(String(50))
    region = Column(String(100))
    device_type = Column(String(50))
    ip_address = Column(String(45))
    user_agent = Column(Text)
    session_id = Column(String(255))
    is_unique_impression = Column(Boolean, default=True)
    is_viewable = Column(Boolean, default=False)
    viewable_duration = Column(Integer)
    clicked = Column(Boolean, default=False)
    clicked_at = Column(DateTime)
    converted = Column(Boolean, default=False)
    converted_at = Column(DateTime)
    cpi_rate = Column(Numeric(10, 4))
    charged = Column(Boolean, default=False)
    charged_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class CampaignEngagement(AdvertiserBase):
    """Like/share/comment/save on a campaign ad.

    user_id/profile_id are plain integers (cross-DB, app-enforced).
    """
    __tablename__ = "campaign_engagement"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaign_profile.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    impression_id = Column(Integer, ForeignKey("campaign_impressions.id", ondelete="SET NULL"),
                           nullable=True, index=True)
    brand_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False)     # users.id (cross-DB, app-enforced)
    profile_id = Column(Integer, nullable=False)
    profile_type = Column(String(50), nullable=False)
    engagement_type = Column(String(20), nullable=False, index=True)
    comment_text = Column(Text)
    parent_comment_id = Column(Integer, ForeignKey("campaign_engagement.id", ondelete="CASCADE"),
                               nullable=True, index=True)
    device_type = Column(String(50))
    location = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint(
            "engagement_type IN ('like','share','comment','save','bookmark')",
            name="campaign_engagement_engagement_type_check"
        ),
        CheckConstraint(
            "engagement_type <> 'comment' OR comment_text IS NOT NULL",
            name="campaign_engagement_check"
        ),
    )


class CampaignInvoice(AdvertiserBase):
    """Billing invoice for a campaign. advertiser_id/brand_id/payment_transaction_id
    are plain integers (cross-DB / app-enforced)."""
    __tablename__ = "campaign_invoices"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaign_profile.id"), nullable=False, index=True)
    advertiser_id = Column(Integer, nullable=False, index=True)
    brand_id = Column(Integer)
    invoice_number = Column(String(50), nullable=False, unique=True)
    invoice_type = Column(String(50), default='final_settlement')
    amount = Column(Numeric(10, 2), nullable=False)
    impressions_delivered = Column(BigInteger, default=0)
    cpi_rate = Column(Numeric(10, 4))
    deposit_amount = Column(Numeric(10, 2), default=0.00)
    outstanding_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), default='pending', index=True)
    issued_at = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime)
    paid_at = Column(DateTime)
    payment_transaction_id = Column(Integer)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    billing_cycle_number = Column(Integer)
    billing_period_start = Column(DateTime)
    billing_period_end = Column(DateTime)
    discount_amount = Column(Numeric(10, 2), default=0)
    tax_amount = Column(Numeric(10, 2), default=0)
    refund_amount = Column(Numeric(10, 2), default=0)
    payment_method = Column(String(50))
    invoice_pdf_url = Column(String(500))


class AdvertiserTeamMember(AdvertiserBase):
    """A team member invited to an advertiser account.

    user_id/invited_by are plain integers (users.id, cross-DB, app-enforced).
    """
    __tablename__ = "advertiser_team_members"

    id = Column(Integer, primary_key=True, index=True)
    advertiser_profile_id = Column(Integer, nullable=False, index=True)  # app-enforced -> advertiser_profiles.id
    # Owning company (per-company team model). FK internal to this DB.
    company_id = Column(Integer, ForeignKey("company_profile.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    user_id = Column(Integer, nullable=True, index=True)   # users.id (cross-DB, app-enforced)
    email = Column(String(255), nullable=False, index=True)
    full_name = Column(String(255))
    role = Column(String(50), nullable=False, default='viewer')
    status = Column(String(50), nullable=False, default='pending')
    invitation_token = Column(String(255), index=True)
    invited_by = Column(Integer, nullable=False)           # users.id (cross-DB, app-enforced)
    invited_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime)
    last_active = Column(DateTime)
    permissions = Column(JSONB, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    dob = Column(Date)

    __table_args__ = (
        CheckConstraint("role IN ('owner','brand_manager')", name="team_role_check"),
        CheckConstraint(
            "status IN ('pending','active','suspended','removed','declined')",
            name="team_status_check"
        ),
    )


class AdvertiserTransaction(AdvertiserBase):
    """A wallet/billing transaction for an advertiser."""
    __tablename__ = "advertiser_transactions"

    id = Column(Integer, primary_key=True, index=True)
    advertiser_id = Column(Integer, ForeignKey("advertiser_profiles.id", ondelete="CASCADE"),
                           nullable=False, index=True)
    # Owning company (per-company wallet model). FK internal to this DB.
    company_id = Column(Integer, ForeignKey("company_profile.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    campaign_id = Column(Integer, index=True)   # campaign_profile.id (app-enforced)
    brand_id = Column(Integer)
    transaction_type = Column(String(50), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    balance_before = Column(Numeric(12, 2))
    balance_after = Column(Numeric(12, 2))
    currency = Column(String(3), default='ETB')
    description = Column(Text)
    impressions_count = Column(Integer)
    payment_method = Column(String(50))
    payment_reference = Column(String(255))
    status = Column(String(50), default='completed')
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class AdvertisementEarning(AdvertiserBase):
    """Per-viewer/affiliate earnings from showing ads. All user/profile/campaign refs
    are plain integers (cross-DB / app-enforced)."""
    __tablename__ = "advertisement_earnings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)     # users.id (cross-DB, app-enforced)
    profile_id = Column(Integer, nullable=False)
    profile_type = Column(String(50), nullable=False)
    advertiser_id = Column(Integer)
    advertiser_name = Column(String(255))
    campaign_id = Column(Integer)
    campaign_name = Column(String(255))
    ad_type = Column(String(50))
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    amount = Column(Numeric(12, 2), nullable=False, default=0)
    cpm_rate = Column(Numeric(8, 4))
    cpc_rate = Column(Numeric(8, 4))
    period_start = Column(Date)
    period_end = Column(Date)
    status = Column(String(50), default='pending')
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime)
    referred_user_id = Column(Integer)
    referred_user_name = Column(String(255))
    referred_user_profile_picture = Column(Text)
    tier_level = Column(Integer, default=1)
    commission_rate = Column(Numeric(5, 2), nullable=False, default=0)
    referral_chain = Column(Text)
    billing_period_id = Column(Integer)
    impressions_start = Column(BigInteger)
    impressions_end = Column(BigInteger)
    cpi_rate_used = Column(Numeric(10, 4))
    transaction_id = Column(Integer)

    __table_args__ = (
        Index("idx_advertisement_earnings_user", "user_id", "profile_id", "profile_type"),
    )
