"""
CPI Settings Endpoints
Handles Cost Per Impression pricing configuration

CPI Structure:
- Base rate: Cost per impression for untargeted campaigns (All audience + International location + No placement)
- Audience premiums: Additional cost for targeting specific audiences (tutor, student, parent, advertiser, user)
- Location premiums: Additional cost for targeting specific locations (national)
- Region exclusion premiums: Country-specific region premiums stored as JSONB (supports any country)
- Placement premiums: Additional cost for specific ad placements (leaderboard-banner, logo, in-session-skyscrapper-banner)

JSONB Region Structure:
{
    "ET": {"addis-ababa": 1.0, "oromia": 1.0, ...},  # Ethiopia
    "KE": {"nairobi": 1.5, "mombasa": 1.0, ...},     # Kenya
    "NG": {"lagos": 2.0, "abuja": 1.5, ...}          # Nigeria
}

Example:
- Base rate: 0.05 ETB
- Tutor premium: +0.02 ETB
- National premium: +0.01 ETB
- Widget exclusion premium: +0.02 ETB
- Total for Tutor + National + Exclude Widget: 0.05 + 0.02 + 0.01 + 0.02 = 0.10 ETB per impression
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import psycopg
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Use Admin Database
ADMIN_DATABASE_URL = os.getenv("ADMIN_DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db")

router = APIRouter(prefix="/api", tags=["CPI Settings"])

# Pydantic models
class CpiSettingsResponse(BaseModel):
    baseRate: float
    audiencePremiums: dict
    locationPremiums: dict
    placementPremiums: dict
    currency: str

class CpiSettingsUpdate(BaseModel):
    baseRate: float
    country: str = 'all'  # Country code (ET, US, etc.) or 'all' for global
    audiencePremiums: dict  # {tutor: float, student: float, parent: float, advertiser: float, user: float}
    locationPremiums: dict  # {national: float}
    regionExclusionPremiums: dict = {}  # {"ET": {"addis-ababa": 1.0, ...}, "KE": {...}}
    placementPremiums: dict = {}  # {'leaderboard-banner': float, 'logo': float, 'in-session-skyscrapper-banner': float}


def get_db():
    """Get database connection"""
    return psycopg.connect(ADMIN_DATABASE_URL)


# ============================================
# PUBLIC ENDPOINT - Get Base CPI Rate
# For advertisers creating campaigns
# ============================================

@router.get("/cpi/base-rate")
async def get_base_cpi_rate():
    """
    Get the base CPI rate for advertisers.
    This is the minimum cost per impression for untargeted campaigns.
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT base_rate, currency
            FROM cpi_settings
            WHERE is_active = TRUE
            ORDER BY id DESC
            LIMIT 1
        """)

        row = cursor.fetchone()

        if not row:
            # Return default if no settings found
            return {
                "success": True,
                "baseRate": 0.05,
                "currency": "ETB",
                "message": "Using default rate"
            }

        return {
            "success": True,
            "baseRate": float(row[0]),
            "currency": row[1]
        }

    except Exception as e:
        print(f"Error fetching base CPI rate: {e}")
        # Return default on error
        return {
            "success": True,
            "baseRate": 0.05,
            "currency": "ETB",
            "message": "Using default rate (database error)"
        }
    finally:
        if conn:
            cursor.close()
            conn.close()


@router.get("/cpi/full-rates")
async def get_full_cpi_rates():
    """
    Get all CPI rates (base + premiums) for advertisers.
    This helps advertisers understand the full pricing structure.
    Returns country-specific region premiums from JSONB column.
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                base_rate,
                tutor_premium,
                student_premium,
                parent_premium,
                advertiser_premium,
                user_premium,
                national_premium,
                leaderboard_banner_premium,
                logo_premium,
                in_session_skyscrapper_banner_premium,
                currency,
                region_exclusion_premiums,
                country_regions
            FROM cpi_settings
            WHERE is_active = TRUE
            ORDER BY id DESC
            LIMIT 1
        """)

        row = cursor.fetchone()

        # Default country regions configuration
        default_country_regions = {
            "ET": {
                "name": "Ethiopia",
                "currency": "ETB",
                "regions": [
                    {"id": "addis-ababa", "name": "Addis Ababa", "icon": "fa-city"},
                    {"id": "oromia", "name": "Oromia", "icon": "fa-mountain"},
                    {"id": "amhara", "name": "Amhara", "icon": "fa-landmark"},
                    {"id": "tigray", "name": "Tigray", "icon": "fa-monument"},
                    {"id": "snnpr", "name": "SNNPR", "icon": "fa-tree"},
                    {"id": "somali", "name": "Somali", "icon": "fa-sun"},
                    {"id": "afar", "name": "Afar", "icon": "fa-temperature-high"},
                    {"id": "benishangul-gumuz", "name": "Benishangul-Gumuz", "icon": "fa-water"},
                    {"id": "gambela", "name": "Gambela", "icon": "fa-leaf"},
                    {"id": "harari", "name": "Harari", "icon": "fa-mosque"},
                    {"id": "dire-dawa", "name": "Dire Dawa", "icon": "fa-train"},
                    {"id": "sidama", "name": "Sidama", "icon": "fa-coffee"}
                ]
            }
        }

        # Default region exclusion premiums
        default_region_premiums = {
            "ET": {
                "addis-ababa": 1.0,
                "oromia": 1.0,
                "amhara": 1.0,
                "tigray": 1.0,
                "snnpr": 1.0,
                "somali": 1.0,
                "afar": 1.0,
                "benishangul-gumuz": 1.0,
                "gambela": 1.0,
                "harari": 1.0,
                "dire-dawa": 1.0,
                "sidama": 1.0
            }
        }

        if not row:
            # Return defaults
            return {
                "success": True,
                "baseRate": 0.05,
                "audiencePremiums": {
                    "tutor": 0.02,
                    "student": 0.015,
                    "parent": 0.018,
                    "advertiser": 0.03,
                    "user": 0.01
                },
                "locationPremiums": {
                    "national": 0.01
                },
                "regionExclusionPremiums": default_region_premiums,
                "countryRegions": default_country_regions,
                "placementPremiums": {
                    "leaderboard-banner": 0.01,
                    "logo": 0.02,
                    "in-session-skyscrapper-banner": 0.05
                },
                "currency": "ETB",
                "message": "Using default rates"
            }

        # Parse JSONB columns
        region_premiums = row[11] if row[11] else default_region_premiums
        country_regions = row[12] if row[12] else default_country_regions

        return {
            "success": True,
            "baseRate": float(row[0]),
            "audiencePremiums": {
                "tutor": float(row[1]) if row[1] else 0,
                "student": float(row[2]) if row[2] else 0,
                "parent": float(row[3]) if row[3] else 0,
                "advertiser": float(row[4]) if row[4] else 0,
                "user": float(row[5]) if row[5] else 0
            },
            "locationPremiums": {
                "national": float(row[6]) if row[6] else 0
            },
            "regionExclusionPremiums": region_premiums,
            "countryRegions": country_regions,
            "placementPremiums": {
                "leaderboard-banner": float(row[7]) if row[7] else 0,
                "logo": float(row[8]) if row[8] else 0,
                "in-session-skyscrapper-banner": float(row[9]) if row[9] else 0
            },
            "currency": row[10]
        }

    except Exception as e:
        print(f"Error fetching full CPI rates: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()


# ============================================
# ADMIN ENDPOINTS - Manage CPI Settings
# ============================================

@router.get("/admin/cpi-settings")
async def get_cpi_settings():
    """
    Get all CPI settings for admin panel.
    Returns country-specific region premiums from JSONB column.
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                id,
                base_rate,
                tutor_premium,
                student_premium,
                parent_premium,
                advertiser_premium,
                user_premium,
                national_premium,
                leaderboard_banner_premium,
                logo_premium,
                in_session_skyscrapper_banner_premium,
                currency,
                is_active,
                created_at,
                updated_at,
                region_exclusion_premiums,
                country_regions
            FROM cpi_settings
            WHERE is_active = TRUE
            ORDER BY id DESC
            LIMIT 1
        """)

        row = cursor.fetchone()

        # Default country regions configuration
        default_country_regions = {
            "ET": {
                "name": "Ethiopia",
                "currency": "ETB",
                "regions": [
                    {"id": "addis-ababa", "name": "Addis Ababa", "icon": "fa-city"},
                    {"id": "oromia", "name": "Oromia", "icon": "fa-mountain"},
                    {"id": "amhara", "name": "Amhara", "icon": "fa-landmark"},
                    {"id": "tigray", "name": "Tigray", "icon": "fa-monument"},
                    {"id": "snnpr", "name": "SNNPR", "icon": "fa-tree"},
                    {"id": "somali", "name": "Somali", "icon": "fa-sun"},
                    {"id": "afar", "name": "Afar", "icon": "fa-temperature-high"},
                    {"id": "benishangul-gumuz", "name": "Benishangul-Gumuz", "icon": "fa-water"},
                    {"id": "gambela", "name": "Gambela", "icon": "fa-leaf"},
                    {"id": "harari", "name": "Harari", "icon": "fa-mosque"},
                    {"id": "dire-dawa", "name": "Dire Dawa", "icon": "fa-train"},
                    {"id": "sidama", "name": "Sidama", "icon": "fa-coffee"}
                ]
            },
            "KE": {
                "name": "Kenya",
                "currency": "KES",
                "regions": [
                    {"id": "nairobi", "name": "Nairobi", "icon": "fa-city"},
                    {"id": "mombasa", "name": "Mombasa", "icon": "fa-anchor"},
                    {"id": "kisumu", "name": "Kisumu", "icon": "fa-water"},
                    {"id": "nakuru", "name": "Nakuru", "icon": "fa-mountain"},
                    {"id": "eldoret", "name": "Eldoret", "icon": "fa-running"},
                    {"id": "central", "name": "Central", "icon": "fa-map-marker"},
                    {"id": "coast", "name": "Coast", "icon": "fa-umbrella-beach"},
                    {"id": "eastern", "name": "Eastern", "icon": "fa-sun"},
                    {"id": "western", "name": "Western", "icon": "fa-tree"},
                    {"id": "rift-valley", "name": "Rift Valley", "icon": "fa-mountain"}
                ]
            },
            "NG": {
                "name": "Nigeria",
                "currency": "NGN",
                "regions": [
                    {"id": "lagos", "name": "Lagos", "icon": "fa-city"},
                    {"id": "abuja", "name": "Abuja (FCT)", "icon": "fa-landmark"},
                    {"id": "kano", "name": "Kano", "icon": "fa-mosque"},
                    {"id": "rivers", "name": "Rivers", "icon": "fa-water"},
                    {"id": "oyo", "name": "Oyo", "icon": "fa-university"},
                    {"id": "kaduna", "name": "Kaduna", "icon": "fa-industry"},
                    {"id": "delta", "name": "Delta", "icon": "fa-oil-can"},
                    {"id": "anambra", "name": "Anambra", "icon": "fa-store"},
                    {"id": "enugu", "name": "Enugu", "icon": "fa-gem"},
                    {"id": "imo", "name": "Imo", "icon": "fa-leaf"}
                ]
            },
            "GH": {
                "name": "Ghana",
                "currency": "GHS",
                "regions": [
                    {"id": "greater-accra", "name": "Greater Accra", "icon": "fa-city"},
                    {"id": "ashanti", "name": "Ashanti", "icon": "fa-crown"},
                    {"id": "western", "name": "Western", "icon": "fa-anchor"},
                    {"id": "eastern", "name": "Eastern", "icon": "fa-mountain"},
                    {"id": "central", "name": "Central", "icon": "fa-landmark"},
                    {"id": "northern", "name": "Northern", "icon": "fa-sun"},
                    {"id": "volta", "name": "Volta", "icon": "fa-water"},
                    {"id": "brong-ahafo", "name": "Brong-Ahafo", "icon": "fa-tree"}
                ]
            },
            "ZA": {
                "name": "South Africa",
                "currency": "ZAR",
                "regions": [
                    {"id": "gauteng", "name": "Gauteng", "icon": "fa-city"},
                    {"id": "western-cape", "name": "Western Cape", "icon": "fa-mountain"},
                    {"id": "kwazulu-natal", "name": "KwaZulu-Natal", "icon": "fa-umbrella-beach"},
                    {"id": "eastern-cape", "name": "Eastern Cape", "icon": "fa-water"},
                    {"id": "limpopo", "name": "Limpopo", "icon": "fa-tree"},
                    {"id": "mpumalanga", "name": "Mpumalanga", "icon": "fa-leaf"},
                    {"id": "north-west", "name": "North West", "icon": "fa-sun"},
                    {"id": "free-state", "name": "Free State", "icon": "fa-wheat"},
                    {"id": "northern-cape", "name": "Northern Cape", "icon": "fa-gem"}
                ]
            }
        }

        # Default region exclusion premiums
        default_region_premiums = {
            "ET": {region["id"]: 1.0 for region in default_country_regions["ET"]["regions"]}
        }

        if not row:
            # Return empty response with defaults
            return {
                "success": False,
                "message": "No CPI settings found",
                "countryRegions": default_country_regions
            }

        # Parse JSONB columns
        region_premiums = row[15] if row[15] else default_region_premiums
        country_regions = row[16] if row[16] else default_country_regions

        return {
            "success": True,
            "settings": {
                "id": row[0],
                "baseRate": float(row[1]),
                "audiencePremiums": {
                    "tutor": float(row[2]) if row[2] else 0,
                    "student": float(row[3]) if row[3] else 0,
                    "parent": float(row[4]) if row[4] else 0,
                    "advertiser": float(row[5]) if row[5] else 0,
                    "user": float(row[6]) if row[6] else 0
                },
                "locationPremiums": {
                    "national": float(row[7]) if row[7] else 0
                },
                "regionExclusionPremiums": region_premiums,
                "placementPremiums": {
                    "leaderboard-banner": float(row[8]) if row[8] else 0,
                    "logo": float(row[9]) if row[9] else 0,
                    "in-session-skyscrapper-banner": float(row[10]) if row[10] else 0
                },
                "currency": row[11],
                "isActive": row[12],
                "createdAt": row[13].isoformat() if row[13] else None,
                "updatedAt": row[14].isoformat() if row[14] else None
            },
            "countryRegions": country_regions
        }

    except Exception as e:
        print(f"Error fetching CPI settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()


@router.post("/admin/cpi-settings")
async def update_cpi_settings(settings: CpiSettingsUpdate):
    """
    Update CPI settings (admin only).
    Saves region exclusion premiums to JSONB column for country-agnostic support.
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Check if settings exist
        cursor.execute("SELECT id FROM cpi_settings WHERE is_active = TRUE LIMIT 1")
        existing = cursor.fetchone()

        # Get region exclusion premiums (JSONB format: {"ET": {"addis-ababa": 1.0, ...}, "KE": {...}})
        region_premiums = settings.regionExclusionPremiums or {}

        if existing:
            # Update existing settings
            cursor.execute("""
                UPDATE cpi_settings
                SET
                    base_rate = %s,
                    country = %s,
                    tutor_premium = %s,
                    student_premium = %s,
                    parent_premium = %s,
                    advertiser_premium = %s,
                    user_premium = %s,
                    national_premium = %s,
                    leaderboard_banner_premium = %s,
                    logo_premium = %s,
                    in_session_skyscrapper_banner_premium = %s,
                    region_exclusion_premiums = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                settings.baseRate,
                getattr(settings, 'country', 'all'),
                settings.audiencePremiums.get('tutor', 0),
                settings.audiencePremiums.get('student', 0),
                settings.audiencePremiums.get('parent', 0),
                settings.audiencePremiums.get('advertiser', 0),
                settings.audiencePremiums.get('user', 0),
                settings.locationPremiums.get('national', 0),
                settings.placementPremiums.get('leaderboard-banner', 0),
                settings.placementPremiums.get('logo', 0),
                settings.placementPremiums.get('in-session-skyscrapper-banner', 0),
                json.dumps(region_premiums),
                existing[0]
            ))
        else:
            # Insert new settings
            cursor.execute("""
                INSERT INTO cpi_settings (
                    base_rate,
                    country,
                    tutor_premium,
                    student_premium,
                    parent_premium,
                    advertiser_premium,
                    user_premium,
                    national_premium,
                    leaderboard_banner_premium,
                    logo_premium,
                    in_session_skyscrapper_banner_premium,
                    region_exclusion_premiums
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                settings.baseRate,
                getattr(settings, 'country', 'all'),
                settings.audiencePremiums.get('tutor', 0),
                settings.audiencePremiums.get('student', 0),
                settings.audiencePremiums.get('parent', 0),
                settings.audiencePremiums.get('advertiser', 0),
                settings.audiencePremiums.get('user', 0),
                settings.locationPremiums.get('national', 0),
                settings.placementPremiums.get('leaderboard-banner', 0),
                settings.placementPremiums.get('logo', 0),
                settings.placementPremiums.get('in-session-skyscrapper-banner', 0),
                json.dumps(region_premiums)
            ))

        conn.commit()

        return {
            "success": True,
            "message": "CPI settings updated successfully"
        }

    except Exception as e:
        print(f"Error updating CPI settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()


# ============================================
# CPI CALCULATOR ENDPOINT
# Calculate estimated cost for campaign
# ============================================

@router.post("/cpi/calculate")
async def calculate_cpi_cost(
    impressions: int,
    audience: Optional[str] = None,  # tutor, student, parent, all
    location: Optional[str] = None,   # national, regional, international
    placement: Optional[str] = None   # placeholder, widget, popup, insession
):
    """
    Calculate estimated CPI cost for a campaign.

    Args:
        impressions: Number of impressions
        audience: Target audience (tutor, student, parent, or all/None)
        location: Target location (national, regional, or international/None)
        placement: Ad placement (placeholder, widget, popup, insession, or None)

    Returns:
        Breakdown of costs and total estimated cost
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                base_rate,
                tutor_premium,
                student_premium,
                parent_premium,
                national_premium,
                regional_premium,
                leaderboard_banner_premium,
                logo_premium,
                in_session_skyscrapper_banner_premium,
                insession_premium,
                currency
            FROM cpi_settings
            WHERE is_active = TRUE
            LIMIT 1
        """)

        row = cursor.fetchone()

        if not row:
            # Use defaults
            base_rate = 0.05
            tutor_premium = 0.02
            student_premium = 0.015
            parent_premium = 0.018
            national_premium = 0.01
            regional_premium = 0.025
            leaderboard_banner_premium = 0.01
            logo_premium = 0.02
            in_session_skyscrapper_banner_premium = 0.05
            currency = "ETB"
        else:
            base_rate = float(row[0])
            tutor_premium = float(row[1]) if row[1] else 0
            student_premium = float(row[2]) if row[2] else 0
            parent_premium = float(row[3]) if row[3] else 0
            national_premium = float(row[4]) if row[4] else 0
            regional_premium = float(row[5]) if row[5] else 0
            leaderboard_banner_premium = float(row[6]) if row[6] else 0
            logo_premium = float(row[7]) if row[7] else 0
            in_session_skyscrapper_banner_premium = float(row[8]) if row[8] else 0
            currency = row[9]

        # Calculate audience premium
        audience_premium = 0
        audience_label = "All Users"
        if audience and audience.lower() != "all":
            if audience.lower() == "tutor" or audience.lower() == "tutors":
                audience_premium = tutor_premium
                audience_label = "Tutors"
            elif audience.lower() == "student" or audience.lower() == "students":
                audience_premium = student_premium
                audience_label = "Students"
            elif audience.lower() == "parent" or audience.lower() == "parents":
                audience_premium = parent_premium
                audience_label = "Parents"

        # Calculate location premium
        location_premium = 0
        location_label = "International"
        if location and location.lower() not in ["international", "global"]:
            if location.lower() == "national" or location.lower() == "nationwide":
                location_premium = national_premium
                location_label = "National"
            elif location.lower() == "regional" or location.lower() == "local":
                location_premium = regional_premium
                location_label = "Regional"

        # Calculate placement premium
        placement_premium = 0
        placement_label = "No Placement"
        if placement:
            if placement.lower() == "leaderboard-banner":
                placement_premium = leaderboard_banner_premium
                placement_label = "Leaderboard Banner"
            elif placement.lower() == "logo":
                placement_premium = logo_premium
                placement_label = "Logo"
            elif placement.lower() == "in-session-skyscrapper-banner":
                placement_premium = in_session_skyscrapper_banner_premium
                placement_label = "In-Session Skyscrapper Banner"

        # Calculate total CPI
        total_cpi = base_rate + audience_premium + location_premium + placement_premium
        total_cost = total_cpi * impressions

        return {
            "success": True,
            "breakdown": {
                "baseRate": base_rate,
                "audiencePremium": audience_premium,
                "audienceLabel": audience_label,
                "locationPremium": location_premium,
                "locationLabel": location_label,
                "placementPremium": placement_premium,
                "placementLabel": placement_label,
                "totalCpi": total_cpi
            },
            "impressions": impressions,
            "estimatedCost": round(total_cost, 2),
            "currency": currency
        }

    except Exception as e:
        print(f"Error calculating CPI cost: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()
