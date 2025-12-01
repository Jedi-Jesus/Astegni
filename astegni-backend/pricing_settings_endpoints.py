"""
Pricing Settings Endpoints
Handles payment gateways, verification pricing, subscription tiers, and affiliate settings
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime
import json

# Import database connection
import sys
import os
import psycopg
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")

    # Parse the URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")

    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_full = host_db.split("/")

    # Remove query parameters (like ?sslmode=disable)
    if "?" in db_full:
        db_name = db_full.split("?")[0]
    else:
        db_name = db_full

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    # Connect
    return psycopg.connect(
        dbname=db_name,
        user=user,
        password=password,
        host=host,
        port=port
    )

# Pydantic models
class PaymentGatewayConfig(BaseModel):
    gateway_name: str
    enabled: bool
    api_key: Optional[str] = None
    secret_key: Optional[str] = None
    webhook_url: Optional[str] = None
    test_mode: bool = True
    settings: Dict = {}

class VerificationPricing(BaseModel):
    tier: str  # basic, professional, premium
    price: float
    currency: str = "ETB"
    features: List[str]
    badge_type: str
    duration_days: int = 365

class SubscriptionTier(BaseModel):
    tier_name: str
    monthly_price: float
    annual_price: float
    currency: str = "ETB"
    features: List[str]
    limits: Dict = {}  # storage_gb, api_calls, etc.
    is_popular: bool = False
    period_discounts: Dict[str, float] = {}  # {"1m": 0, "3m": 5, "6m": 10, "9m": 15, "12m": 20}

class AffiliateSettings(BaseModel):
    enabled: bool
    commission_percentage: float
    minimum_payout: float
    payout_frequency: str  # weekly, monthly
    cookie_duration_days: int
    tier_bonuses: Dict = {}

class CampaignPackage(BaseModel):
    package_name: str
    price: float
    currency: str = "ETB"
    duration_days: int
    impressions_limit: Optional[int] = None
    clicks_limit: Optional[int] = None
    features: List[str]
    is_featured: bool = False

# Create router
router = APIRouter(prefix="/api/admin/pricing", tags=["pricing"])

# Payment Gateway Endpoints
@router.get("/payment-gateways")
async def get_payment_gateways():
    """Get all payment gateway configurations"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM payment_gateways
            ORDER BY created_at DESC
        """)

        columns = [desc[0] for desc in cursor.description]
        gateways = []

        for row in cursor.fetchall():
            gateway = dict(zip(columns, row))
            # Don't send sensitive keys to frontend
            if 'api_key' in gateway:
                gateway['api_key'] = '***' if gateway['api_key'] else None
            if 'secret_key' in gateway:
                gateway['secret_key'] = '***' if gateway['secret_key'] else None
            gateways.append(gateway)

        return {"success": True, "gateways": gateways}

    except Exception as e:
        # If table doesn't exist, return empty list
        if "does not exist" in str(e):
            return {"success": True, "gateways": []}
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/payment-gateways")
async def save_payment_gateway(gateway: PaymentGatewayConfig):
    """Save or update payment gateway configuration"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payment_gateways (
                id SERIAL PRIMARY KEY,
                gateway_name VARCHAR(100) UNIQUE NOT NULL,
                enabled BOOLEAN DEFAULT FALSE,
                api_key TEXT,
                secret_key TEXT,
                webhook_url TEXT,
                test_mode BOOLEAN DEFAULT TRUE,
                settings JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Upsert gateway configuration
        cursor.execute("""
            INSERT INTO payment_gateways (
                gateway_name, enabled, api_key, secret_key,
                webhook_url, test_mode, settings, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (gateway_name)
            DO UPDATE SET
                enabled = EXCLUDED.enabled,
                api_key = EXCLUDED.api_key,
                secret_key = EXCLUDED.secret_key,
                webhook_url = EXCLUDED.webhook_url,
                test_mode = EXCLUDED.test_mode,
                settings = EXCLUDED.settings,
                updated_at = EXCLUDED.updated_at
        """, (
            gateway.gateway_name,
            gateway.enabled,
            gateway.api_key,
            gateway.secret_key,
            gateway.webhook_url,
            gateway.test_mode,
            json.dumps(gateway.settings),
            datetime.now()
        ))

        conn.commit()
        return {"success": True, "message": f"Payment gateway {gateway.gateway_name} saved"}

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.delete("/payment-gateways/{gateway_id}")
async def delete_payment_gateway(gateway_id: int):
    """Delete a payment gateway by ID"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if gateway exists
        cursor.execute("""
            SELECT gateway_name FROM payment_gateways WHERE id = %s
        """, (gateway_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment gateway not found"
            )

        gateway_name = result[0]

        # Delete the gateway
        cursor.execute("""
            DELETE FROM payment_gateways WHERE id = %s
        """, (gateway_id,))

        conn.commit()
        return {"success": True, "message": f"Payment gateway {gateway_name} deleted"}

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

# Verification Pricing Endpoints
@router.get("/verification-tiers")
async def get_verification_pricing():
    """Get all verification pricing tiers"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM verification_pricing
            ORDER BY price ASC
        """)

        columns = [desc[0] for desc in cursor.description]
        tiers = []

        for row in cursor.fetchall():
            tier = dict(zip(columns, row))
            tiers.append(tier)

        return {"success": True, "tiers": tiers}

    except Exception as e:
        if "does not exist" in str(e):
            return {"success": True, "tiers": []}
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/verification-tiers")
async def save_verification_pricing(tier: VerificationPricing):
    """Save or update verification pricing tier"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS verification_pricing (
                id SERIAL PRIMARY KEY,
                tier VARCHAR(50) UNIQUE NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'ETB',
                features JSONB DEFAULT '[]',
                badge_type VARCHAR(50),
                duration_days INTEGER DEFAULT 365,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Upsert pricing tier
        cursor.execute("""
            INSERT INTO verification_pricing (
                tier, price, currency, features,
                badge_type, duration_days, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (tier)
            DO UPDATE SET
                price = EXCLUDED.price,
                currency = EXCLUDED.currency,
                features = EXCLUDED.features,
                badge_type = EXCLUDED.badge_type,
                duration_days = EXCLUDED.duration_days,
                updated_at = EXCLUDED.updated_at
        """, (
            tier.tier,
            tier.price,
            tier.currency,
            json.dumps(tier.features),
            tier.badge_type,
            tier.duration_days,
            datetime.now()
        ))

        conn.commit()
        return {"success": True, "message": f"Verification tier {tier.tier} saved"}

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

# Subscription Tiers Endpoints
@router.get("/subscription-tiers")
async def get_subscription_tiers():
    """Get all subscription tiers"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM subscription_tiers
            ORDER BY monthly_price ASC
        """)

        columns = [desc[0] for desc in cursor.description]
        tiers = []

        for row in cursor.fetchall():
            tier = dict(zip(columns, row))
            tiers.append(tier)

        return {"success": True, "tiers": tiers}

    except Exception as e:
        if "does not exist" in str(e):
            return {"success": True, "tiers": []}
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/subscription-tiers")
async def save_subscription_tier(tier: SubscriptionTier):
    """Save or update subscription tier"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS subscription_tiers (
                id SERIAL PRIMARY KEY,
                tier_name VARCHAR(100) UNIQUE NOT NULL,
                monthly_price DECIMAL(10, 2) NOT NULL,
                annual_price DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'ETB',
                features JSONB DEFAULT '[]',
                limits JSONB DEFAULT '{}',
                is_popular BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Upsert subscription tier
        cursor.execute("""
            INSERT INTO subscription_tiers (
                tier_name, monthly_price, annual_price, currency,
                features, limits, is_popular, period_discounts, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (tier_name)
            DO UPDATE SET
                monthly_price = EXCLUDED.monthly_price,
                annual_price = EXCLUDED.annual_price,
                currency = EXCLUDED.currency,
                features = EXCLUDED.features,
                limits = EXCLUDED.limits,
                is_popular = EXCLUDED.is_popular,
                period_discounts = EXCLUDED.period_discounts,
                updated_at = EXCLUDED.updated_at
        """, (
            tier.tier_name,
            tier.monthly_price,
            tier.annual_price,
            tier.currency,
            json.dumps(tier.features),
            json.dumps(tier.limits),
            tier.is_popular,
            json.dumps(tier.period_discounts),
            datetime.now()
        ))

        conn.commit()
        return {"success": True, "message": f"Subscription tier {tier.tier_name} saved"}

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

# Affiliate Settings Endpoints
@router.get("/affiliate-settings")
async def get_affiliate_settings():
    """Get affiliate program settings"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM affiliate_settings
            ORDER BY created_at DESC
            LIMIT 1
        """)

        result = cursor.fetchone()
        if result:
            columns = [desc[0] for desc in cursor.description]
            settings = dict(zip(columns, result))
            return {"success": True, "settings": settings}
        else:
            # Return default settings
            return {
                "success": True,
                "settings": {
                    "enabled": False,
                    "commission_percentage": 10.0,
                    "minimum_payout": 1000.0,
                    "payout_frequency": "monthly",
                    "cookie_duration_days": 30,
                    "tier_bonuses": {}
                }
            }

    except Exception as e:
        if "does not exist" in str(e):
            return {
                "success": True,
                "settings": {
                    "enabled": False,
                    "commission_percentage": 10.0,
                    "minimum_payout": 1000.0,
                    "payout_frequency": "monthly",
                    "cookie_duration_days": 30,
                    "tier_bonuses": {}
                }
            }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/affiliate-settings")
async def save_affiliate_settings(settings: AffiliateSettings):
    """Save affiliate program settings"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS affiliate_settings (
                id SERIAL PRIMARY KEY,
                enabled BOOLEAN DEFAULT FALSE,
                commission_percentage DECIMAL(5, 2) DEFAULT 10.0,
                minimum_payout DECIMAL(10, 2) DEFAULT 1000.0,
                payout_frequency VARCHAR(50) DEFAULT 'monthly',
                cookie_duration_days INTEGER DEFAULT 30,
                tier_bonuses JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Check if settings exist
        cursor.execute("SELECT id FROM affiliate_settings LIMIT 1")
        existing = cursor.fetchone()

        if existing:
            # Update existing settings
            cursor.execute("""
                UPDATE affiliate_settings SET
                    enabled = %s,
                    commission_percentage = %s,
                    minimum_payout = %s,
                    payout_frequency = %s,
                    cookie_duration_days = %s,
                    tier_bonuses = %s,
                    updated_at = %s
                WHERE id = %s
            """, (
                settings.enabled,
                settings.commission_percentage,
                settings.minimum_payout,
                settings.payout_frequency,
                settings.cookie_duration_days,
                json.dumps(settings.tier_bonuses),
                datetime.now(),
                existing[0]
            ))
        else:
            # Insert new settings
            cursor.execute("""
                INSERT INTO affiliate_settings (
                    enabled, commission_percentage, minimum_payout,
                    payout_frequency, cookie_duration_days, tier_bonuses
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                settings.enabled,
                settings.commission_percentage,
                settings.minimum_payout,
                settings.payout_frequency,
                settings.cookie_duration_days,
                json.dumps(settings.tier_bonuses)
            ))

        conn.commit()
        return {"success": True, "message": "Affiliate settings saved"}

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

# Campaign Package Endpoints
@router.get("/campaign-packages")
async def get_campaign_packages():
    """Get all campaign advertising packages"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM campaign_packages
            ORDER BY price ASC
        """)

        columns = [desc[0] for desc in cursor.description]
        packages = []

        for row in cursor.fetchall():
            package = dict(zip(columns, row))
            packages.append(package)

        return {"success": True, "packages": packages}

    except Exception as e:
        if "does not exist" in str(e):
            return {"success": True, "packages": []}
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/campaign-packages")
async def save_campaign_package(package: CampaignPackage):
    """Save or update campaign package"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS campaign_packages (
                id SERIAL PRIMARY KEY,
                package_name VARCHAR(100) UNIQUE NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'ETB',
                duration_days INTEGER NOT NULL,
                impressions_limit INTEGER,
                clicks_limit INTEGER,
                features JSONB DEFAULT '[]',
                is_featured BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Upsert campaign package
        cursor.execute("""
            INSERT INTO campaign_packages (
                package_name, price, currency, duration_days,
                impressions_limit, clicks_limit, features, is_featured, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (package_name)
            DO UPDATE SET
                price = EXCLUDED.price,
                currency = EXCLUDED.currency,
                duration_days = EXCLUDED.duration_days,
                impressions_limit = EXCLUDED.impressions_limit,
                clicks_limit = EXCLUDED.clicks_limit,
                features = EXCLUDED.features,
                is_featured = EXCLUDED.is_featured,
                updated_at = EXCLUDED.updated_at
        """, (
            package.package_name,
            package.price,
            package.currency,
            package.duration_days,
            package.impressions_limit,
            package.clicks_limit,
            json.dumps(package.features),
            package.is_featured,
            datetime.now()
        ))

        conn.commit()
        return {"success": True, "message": f"Campaign package {package.package_name} saved"}

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

# Export router
__all__ = ['router']