"""
Admin Database Endpoints
These endpoints read/write to astegni_admin_db instead of astegni_user_db
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter(prefix="/api/admin-db", tags=["Admin Database"])

# Admin Database URL
ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

def get_admin_db():
    """Get admin database connection"""
    return psycopg.connect(ADMIN_DATABASE_URL, row_factory=dict_row)


# ============================================================
# ADMIN PROFILE ENDPOINTS
# ============================================================

@router.get("/profile/{admin_id}")
async def get_admin_profile(admin_id: int):
    """Get admin profile from admin database"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM admin_profile WHERE id = %s",
                    (admin_id,)
                )
                profile = cur.fetchone()
                if not profile:
                    raise HTTPException(status_code=404, detail="Admin profile not found")
                return dict(profile)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile/by-email/{email}")
async def get_admin_profile_by_email(email: str):
    """
    Get admin profile by email from admin database

    NOTE: email is now a TEXT[] array - use ANY() for lookup
    """
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                # email is now an array column
                cur.execute(
                    "SELECT * FROM admin_profile WHERE %s = ANY(email)",
                    (email,)
                )
                profile = cur.fetchone()
                if not profile:
                    raise HTTPException(status_code=404, detail="Admin profile not found")
                return dict(profile)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/profile/{admin_id}")
async def update_admin_profile(admin_id: int, data: dict):
    """Update admin profile in admin database"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                # Build dynamic update query
                set_clauses = []
                values = []
                for key, value in data.items():
                    if key not in ['id', 'created_at']:
                        set_clauses.append(f"{key} = %s")
                        values.append(value)

                if not set_clauses:
                    raise HTTPException(status_code=400, detail="No fields to update")

                values.append(admin_id)
                query = f"UPDATE admin_profile SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = %s RETURNING *"
                cur.execute(query, values)
                profile = cur.fetchone()
                conn.commit()

                if not profile:
                    raise HTTPException(status_code=404, detail="Admin profile not found")
                return dict(profile)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ADMIN REVIEWS ENDPOINTS
# ============================================================

@router.get("/reviews")
async def get_admin_reviews(
    admin_id: Optional[int] = None,
    department: Optional[str] = None,
    limit: int = Query(default=50, le=100)
):
    """Get admin reviews from admin database"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                query = "SELECT * FROM admin_reviews WHERE 1=1"
                params = []

                if admin_id:
                    query += " AND admin_id = %s"
                    params.append(admin_id)
                if department:
                    query += " AND department = %s"
                    params.append(department)

                query += " ORDER BY created_at DESC LIMIT %s"
                params.append(limit)

                cur.execute(query, params)
                reviews = cur.fetchall()
                return [dict(r) for r in reviews]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reviews/recent")
async def get_recent_admin_reviews(
    admin_id: Optional[int] = None,
    department: Optional[str] = None,
    limit: int = Query(default=3, le=20)
):
    """Get recent admin reviews from admin database"""
    return await get_admin_reviews(admin_id=admin_id, department=department, limit=limit)


@router.post("/reviews")
async def create_admin_review(data: dict):
    """Create admin review in admin database"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO admin_reviews (admin_id, department, action, details, created_at)
                    VALUES (%s, %s, %s, %s, NOW())
                    RETURNING *
                """, (
                    data.get('admin_id'),
                    data.get('department'),
                    data.get('action'),
                    data.get('details')
                ))
                review = cur.fetchone()
                conn.commit()
                return dict(review)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# MANAGE PROFILES ENDPOINTS (All management dashboards)
# ============================================================

MANAGE_TABLES = [
    'manage_campaigns_profile',
    'manage_contents_profile',
    'manage_courses_profile',
    'manage_customers_profile',
    'manage_schools_profile',
    'manage_system_settings_profile',
    'manage_tutors_profile',
    'manage_uploads'
]


@router.get("/manage/{table_name}")
async def get_manage_profile(table_name: str, admin_id: Optional[int] = None):
    """Get management profile data from admin database"""
    if table_name not in MANAGE_TABLES:
        raise HTTPException(status_code=400, detail=f"Invalid table: {table_name}")

    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                if admin_id:
                    cur.execute(f"SELECT * FROM {table_name} WHERE id = %s", (admin_id,))
                    profile = cur.fetchone()
                    return dict(profile) if profile else {}
                else:
                    cur.execute(f"SELECT * FROM {table_name} LIMIT 100")
                    profiles = cur.fetchall()
                    return [dict(p) for p in profiles]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/manage/{table_name}/by-email/{email}")
async def get_manage_profile_by_email(table_name: str, email: str):
    """
    Get management profile by email from admin database

    NOTE: manage_*_profile tables don't have email columns.
    First look up admin_id from admin_profile (email is TEXT[] array),
    then get the manage_*_profile by admin_id
    """
    if table_name not in MANAGE_TABLES:
        raise HTTPException(status_code=400, detail=f"Invalid table: {table_name}")

    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                # First get admin_id from admin_profile (email is an array)
                cur.execute("SELECT id FROM admin_profile WHERE %s = ANY(email)", (email,))
                admin_result = cur.fetchone()
                if not admin_result:
                    raise HTTPException(status_code=404, detail="Admin not found")

                admin_id = admin_result['id']

                # Then get the manage_*_profile by admin_id
                cur.execute(f"SELECT * FROM {table_name} WHERE admin_id = %s", (admin_id,))
                profile = cur.fetchone()
                if not profile:
                    raise HTTPException(status_code=404, detail="Profile not found")
                return dict(profile)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/manage/{table_name}/{profile_id}")
async def update_manage_profile(table_name: str, profile_id: int, data: dict):
    """Update management profile in admin database"""
    if table_name not in MANAGE_TABLES:
        raise HTTPException(status_code=400, detail=f"Invalid table: {table_name}")

    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                set_clauses = []
                values = []
                for key, value in data.items():
                    if key not in ['id', 'created_at']:
                        set_clauses.append(f"{key} = %s")
                        values.append(value)

                if not set_clauses:
                    raise HTTPException(status_code=400, detail="No fields to update")

                values.append(profile_id)

                # Check if table has updated_at column
                id_column = 'profile_id' if table_name == 'manage_contents_profile' else 'id'
                query = f"UPDATE {table_name} SET {', '.join(set_clauses)} WHERE {id_column} = %s RETURNING *"
                cur.execute(query, values)
                profile = cur.fetchone()
                conn.commit()

                if not profile:
                    raise HTTPException(status_code=404, detail="Profile not found")
                return dict(profile)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ADMIN CREDENTIALS ENDPOINTS
# ============================================================

@router.get("/credentials")
async def get_admin_credentials(admin_id: Optional[int] = None, limit: int = 50):
    """Get admin credentials from admin database"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                if admin_id:
                    cur.execute(
                        "SELECT * FROM admin_credentials WHERE uploader_id = %s ORDER BY created_at DESC LIMIT %s",
                        (admin_id, limit)
                    )
                else:
                    cur.execute(
                        "SELECT * FROM admin_credentials ORDER BY created_at DESC LIMIT %s",
                        (limit,)
                    )
                credentials = cur.fetchall()
                return [dict(c) for c in credentials]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/credentials")
async def create_admin_credential(data: dict):
    """Create admin credential in admin database"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO admin_credentials
                    (uploader_id, uploader_role, document_type, title, description,
                     issued_by, date_of_issue, expiry_date, document_url, file_name, file_type, file_size)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    data.get('uploader_id'),
                    data.get('uploader_role', 'admin'),
                    data.get('document_type'),
                    data.get('title'),
                    data.get('description'),
                    data.get('issued_by'),
                    data.get('date_of_issue'),
                    data.get('expiry_date'),
                    data.get('document_url'),
                    data.get('file_name'),
                    data.get('file_type'),
                    data.get('file_size')
                ))
                credential = cur.fetchone()
                conn.commit()
                return dict(credential)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ADMIN STATS ENDPOINTS
# ============================================================

@router.get("/stats")
async def get_admin_stats():
    """Get admin statistics from admin database"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                stats = {}

                # Count records in each table
                for table in ['admin_profile', 'admin_reviews', 'admin_credentials'] + MANAGE_TABLES:
                    try:
                        cur.execute(f"SELECT COUNT(*) as count FROM {table}")
                        result = cur.fetchone()
                        stats[table] = result['count'] if result else 0
                    except:
                        stats[table] = 0

                return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile-stats/{admin_id}")
async def get_admin_profile_stats(admin_id: int):
    """Get admin profile stats from admin database"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM admin_profile_stats WHERE admin_id = %s",
                    (admin_id,)
                )
                stats = cur.fetchone()
                return dict(stats) if stats else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# VERIFICATION FEE ENDPOINTS
# ============================================================

@router.get("/verification-fee")
async def get_verification_fees():
    """Get all verification fee types from admin database"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM verification_fee
                    ORDER BY id ASC
                """)
                fees = cur.fetchall()
                return {"success": True, "fees": [dict(f) for f in fees]}
    except Exception as e:
        if "does not exist" in str(e):
            return {"success": True, "fees": []}
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/verification-fee/{fee_type}")
async def get_verification_fee(fee_type: str):
    """Get specific verification fee by type"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM verification_fee WHERE type = %s",
                    (fee_type,)
                )
                result = cur.fetchone()
                if not result:
                    raise HTTPException(status_code=404, detail="Verification fee type not found")
                return {"success": True, "fee": dict(result)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verification-fee")
async def save_verification_fee(data: dict):
    """Save or update verification fee in admin database"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                import json
                cur.execute("""
                    INSERT INTO verification_fee (type, display_name, features, price, currency, country)
                    VALUES (%s, %s, %s::jsonb, %s, %s, %s)
                    ON CONFLICT (type) DO UPDATE SET
                        display_name = EXCLUDED.display_name,
                        features = EXCLUDED.features,
                        price = EXCLUDED.price,
                        currency = EXCLUDED.currency,
                        country = EXCLUDED.country,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                """, (
                    data.get('type'),
                    data.get('display_name', data.get('type', '').replace('_', ' ').title()),
                    json.dumps(data.get('features', [])),
                    data.get('price'),
                    data.get('currency', 'ETB'),
                    data.get('country', 'all')
                ))
                result = cur.fetchone()
                conn.commit()
                return {"success": True, "fee": dict(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/verification-fee/{fee_type}")
async def delete_verification_fee(fee_type: str):
    """Delete verification fee by type from admin database"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM verification_fee WHERE type = %s RETURNING *",
                    (fee_type,)
                )
                result = cur.fetchone()
                conn.commit()

                if not result:
                    raise HTTPException(status_code=404, detail="Verification fee type not found")
                return {"success": True, "message": f"Verification fee '{fee_type}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# SUBSCRIPTION PLANS ENDPOINTS
# STORAGE-BASED subscriptions (NOT time-based like brand_packages)
# TWO types of discounts:
# 1. Package-based discount: Calculated from base plan's price per GB
#    (e.g., 1TB plan is cheaper per GB than 64GB base plan)
#    Uses is_base_package field to mark the reference plan
# 2. Upfront payment discounts: For subscribers who pay multiple months at once
#    (e.g., 5% off for paying 3 months upfront, 10% for 6 months, 20% for yearly)
# Schema: id, package_title, package_price, currency, is_base_package, features,
# discount_3_months, discount_6_months, discount_yearly, is_active,
# label, display_order, duration_days (repurposed as storage_gb), subscription_type
# ============================================================

@router.get("/subscription-plans")
async def get_subscription_plans(active_only: bool = True, user_role: str = None, subscription_type: str = None):
    """
    Get all subscription plans from admin database with role-based features

    Parameters:
    - active_only: Only return active plans (default: True)
    - user_role: Filter plans by role (tutor, student, parent, advertiser)
    - subscription_type: Alias for user_role (backward compatibility)

    Returns only plans that have features for the specified role
    """
    # Backward compatibility: subscription_type is an alias for user_role
    role = user_role or subscription_type
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                # Build query with optional role filter
                if role:
                    # Get all plans, then filter features by role in the feature query
                    # This ensures plans without features are still returned
                    query = """
                        SELECT id, package_title, package_price, currency, is_base_package,
                               discount_3_months, discount_6_months, discount_yearly,
                               is_active, display_order, label, duration_days,
                               created_at, updated_at
                        FROM subscription_plans
                        WHERE 1=1
                    """
                    params = []

                    if active_only:
                        query += " AND is_active = TRUE"

                    query += " ORDER BY display_order ASC, id ASC"
                else:
                    # Get all plans (no role filter)
                    query = """
                        SELECT id, package_title, package_price, currency, is_base_package,
                               discount_3_months, discount_6_months, discount_yearly,
                               is_active, display_order, label, duration_days,
                               created_at, updated_at
                        FROM subscription_plans
                        WHERE 1=1
                    """
                    params = []

                    if active_only:
                        query += " AND is_active = TRUE"

                    query += " ORDER BY display_order ASC, id ASC"

                cur.execute(query, params)
                rows = cur.fetchall()

                plans = []
                for row in rows:
                    plan = dict(row)
                    plan_id = plan['id']

                    # Get features from subscription_features table, filtered by role if provided
                    if role:
                        features_query = """
                            SELECT user_role, feature_name, feature_description, is_enabled, feature_value
                            FROM subscription_features
                            WHERE subscription_plan_id = %s AND user_role = %s AND is_enabled = TRUE
                            ORDER BY user_role, feature_name
                        """
                        cur.execute(features_query, (plan_id, role))
                    else:
                        features_query = """
                            SELECT user_role, feature_name, feature_description, is_enabled, feature_value
                            FROM subscription_features
                            WHERE subscription_plan_id = %s AND is_enabled = TRUE
                            ORDER BY user_role, feature_name
                        """
                        cur.execute(features_query, (plan_id,))
                    feature_rows = cur.fetchall()

                    # Group features by role
                    features_by_role = {}
                    all_features = []  # For backward compatibility
                    for feature_row in feature_rows:
                        feature_role = feature_row['user_role']
                        if feature_role not in features_by_role:
                            features_by_role[feature_role] = []

                        feature_data = {
                            'name': feature_row['feature_name'],
                            'description': feature_row['feature_description'],
                            'enabled': feature_row['is_enabled'],
                            'value': feature_row['feature_value']
                        }
                        features_by_role[feature_role].append(feature_data)
                        # Also add to flat list (backward compatibility)
                        all_features.append(feature_row['feature_description'])

                    # Add aliases for frontend compatibility
                    plan['name'] = plan.get('package_title')
                    plan['monthly_price'] = plan.get('package_price')
                    plan['storage_gb'] = plan.get('duration_days', 64)  # Repurposed as storage
                    plan['isBase'] = plan.get('is_base_package', False)  # Alias for frontend

                    # Features: both formats for compatibility
                    plan['features'] = all_features  # Flat list for backward compatibility
                    plan['features_by_role'] = features_by_role  # New role-based format

                    # Build discounts object for tier pricing (upfront payments)
                    plan['discounts'] = {
                        'quarterly': plan.get('discount_3_months', 5),
                        'biannual': plan.get('discount_6_months', 10),
                        'yearly': plan.get('discount_yearly', 20)
                    }
                    plans.append(plan)

                return {"success": True, "plans": plans, "count": len(plans)}
    except Exception as e:
        if "does not exist" in str(e):
            return {"success": True, "plans": [], "count": 0}
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subscription-plans/{plan_id}")
async def get_subscription_plan(plan_id: int):
    """Get specific subscription plan by ID with role-based features"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                # Get plan (WITHOUT features column - it's been removed)
                cur.execute("""
                    SELECT id, package_title, package_price, currency, is_base_package,
                           discount_3_months, discount_6_months, discount_yearly,
                           is_active, display_order, label, duration_days, subscription_type,
                           created_at, updated_at
                    FROM subscription_plans
                    WHERE id = %s
                """, (plan_id,))
                result = cur.fetchone()
                if not result:
                    raise HTTPException(status_code=404, detail="Plan not found")

                plan = dict(result)

                # Get features from subscription_features table, grouped by role
                features_query = """
                    SELECT user_role, feature_name, feature_description, is_enabled, feature_value
                    FROM subscription_features
                    WHERE subscription_plan_id = %s AND is_enabled = TRUE
                    ORDER BY user_role, feature_name
                """
                cur.execute(features_query, (plan_id,))
                feature_rows = cur.fetchall()

                # Group features by role
                features_by_role = {}
                all_features = []  # For backward compatibility
                for feature_row in feature_rows:
                    role = feature_row['user_role']
                    if role not in features_by_role:
                        features_by_role[role] = []

                    feature_data = {
                        'name': feature_row['feature_name'],
                        'description': feature_row['feature_description'],
                        'enabled': feature_row['is_enabled'],
                        'value': feature_row['feature_value']
                    }
                    features_by_role[role].append(feature_data)
                    all_features.append(feature_row['feature_description'])

                plan['name'] = plan.get('package_title')
                plan['monthly_price'] = plan.get('package_price')
                plan['storage_gb'] = plan.get('duration_days', 64)
                plan['isBase'] = plan.get('is_base_package', False)
                plan['features'] = all_features  # Flat list for backward compatibility
                plan['features_by_role'] = features_by_role  # New role-based format
                plan['discounts'] = {
                    'quarterly': plan.get('discount_3_months', 5),
                    'biannual': plan.get('discount_6_months', 10),
                    'yearly': plan.get('discount_yearly', 20)
                }

                return {"success": True, "plan": plan}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/subscription-plans")
async def create_subscription_plan(data: dict):
    """
    DEPRECATED: Use POST /api/admin/subscription-plans instead
    This endpoint still exists for backward compatibility but does NOT support role-based features
    """
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                import json

                # Get max display_order
                cur.execute("SELECT COALESCE(MAX(display_order), 0) as max FROM subscription_plans")
                result = cur.fetchone()
                max_order = result['max'] if result else 0

                subscription_type = data.get('subscription_type', 'tutor')
                is_base_package = data.get('is_base_package', False)

                # If this is marked as base package, unmark any existing base packages
                if is_base_package:
                    cur.execute("UPDATE subscription_plans SET is_base_package = FALSE WHERE is_base_package = TRUE")

                # Storage-based subscription (features column removed, use subscription_features table)
                cur.execute("""
                    INSERT INTO subscription_plans
                    (package_title, package_price, currency, is_base_package,
                     discount_3_months, discount_6_months, discount_yearly,
                     label, display_order, duration_days, subscription_type, is_active, country)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    data.get('package_title'),
                    data.get('package_price', 0),
                    data.get('currency', 'ETB'),
                    is_base_package,
                    data.get('discount_3_months', 5),
                    data.get('discount_6_months', 10),
                    data.get('discount_yearly', 20),
                    data.get('label', 'none'),
                    max_order + 1,
                    data.get('duration_days', 64),  # Repurposed as storage_gb, default 64GB
                    subscription_type,
                    data.get('is_active', True),
                    data.get('country', 'all')
                ))
                result = cur.fetchone()
                conn.commit()
                return {"success": True, "message": "Subscription plan created", "plan_id": result['id']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/subscription-plans/{plan_id}")
async def update_subscription_plan(plan_id: int, data: dict):
    """
    DEPRECATED: Use PUT /api/admin/subscription-plans/{plan_id} instead
    This endpoint still exists for backward compatibility but does NOT support role-based features
    """
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                import json

                # Check if plan exists
                cur.execute("SELECT id FROM subscription_plans WHERE id = %s", (plan_id,))
                existing = cur.fetchone()
                if not existing:
                    raise HTTPException(status_code=404, detail="Plan not found")

                # If setting as base package, unmark any existing base packages
                if data.get('is_base_package'):
                    cur.execute("UPDATE subscription_plans SET is_base_package = FALSE WHERE is_base_package = TRUE AND id != %s", (plan_id,))

                # Build dynamic update with base package support
                update_fields = []
                values = []

                field_mappings = {
                    'package_title': 'package_title',
                    'package_price': 'package_price',
                    'currency': 'currency',
                    'is_base_package': 'is_base_package',  # For package-based discount calculation
                    # 'features': removed - use subscription_features table instead
                    'discount_3_months': 'discount_3_months',
                    'discount_6_months': 'discount_6_months',
                    'discount_yearly': 'discount_yearly',
                    'label': 'label',
                    'is_active': 'is_active',
                    'duration_days': 'duration_days',  # Repurposed as storage_gb
                    'subscription_type': 'subscription_type',
                    'country': 'country'
                }

                for key, db_field in field_mappings.items():
                    if key in data:
                        update_fields.append(f"{db_field} = %s")
                        values.append(data[key])

                if update_fields:
                    update_fields.append("updated_at = CURRENT_TIMESTAMP")
                    values.append(plan_id)

                    query = f"UPDATE subscription_plans SET {', '.join(update_fields)} WHERE id = %s"
                    cur.execute(query, values)

                conn.commit()
                return {"success": True, "message": "Subscription plan updated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/subscription-plans/{plan_id}")
async def delete_subscription_plan(plan_id: int):
    """Delete subscription plan from admin database"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM subscription_plans WHERE id = %s", (plan_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Plan not found")

                cur.execute("DELETE FROM subscription_plans WHERE id = %s", (plan_id,))
                conn.commit()
                return {"success": True, "message": "Subscription plan deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/subscription-plans/reorder")
async def reorder_subscription_plans(data: dict):
    """Update display order of subscription plans"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                order_list = data.get('order', [])
                for item in order_list:
                    cur.execute("""
                        UPDATE subscription_plans
                        SET display_order = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (item['order'], item['id']))

                conn.commit()
                return {"success": True, "message": "Plan order updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/subscription-plans/{plan_id}/set-base")
async def set_base_subscription_plan(plan_id: int):
    """Set a subscription plan as the base plan for package-based discount calculations"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                # Check if plan exists
                cur.execute("SELECT id FROM subscription_plans WHERE id = %s", (plan_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Plan not found")

                # Unmark all existing base packages
                cur.execute("UPDATE subscription_plans SET is_base_package = FALSE WHERE is_base_package = TRUE")

                # Mark this plan as base
                cur.execute("""
                    UPDATE subscription_plans
                    SET is_base_package = TRUE, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (plan_id,))

                conn.commit()
                return {"success": True, "message": "Base plan set successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# AFFILIATE PROGRAM ENDPOINTS (Global Settings)
# ============================================================

@router.get("/affiliate-program")
async def get_affiliate_program(business_type: str = None):
    """Get affiliate program global settings and tiers from admin database

    Args:
        business_type: Optional filter for business type (tutoring, subscription, advertisement)
    """
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                # Get global settings
                cur.execute("""
                    SELECT id, enabled, payout_threshold, payout_schedule, created_at, updated_at
                    FROM affiliate_program
                    ORDER BY created_at DESC
                    LIMIT 1
                """)
                program = cur.fetchone()

                # Get all tiers (optionally filtered by business_type)
                if business_type:
                    cur.execute("""
                        SELECT id, tier_level, tier_name, commission_rate, duration_months, is_active, business_type, created_at, updated_at
                        FROM affiliate_tiers
                        WHERE is_active = TRUE AND business_type = %s
                        ORDER BY tier_level ASC
                    """, (business_type,))
                else:
                    cur.execute("""
                        SELECT id, tier_level, tier_name, commission_rate, duration_months, is_active, business_type, created_at, updated_at
                        FROM affiliate_tiers
                        WHERE is_active = TRUE
                        ORDER BY business_type, tier_level ASC
                    """)
                tiers = cur.fetchall()

                if program:
                    return {
                        "success": True,
                        "program": dict(program),
                        "tiers": [dict(t) for t in tiers]
                    }
                else:
                    # Return default settings
                    return {
                        "success": True,
                        "program": {
                            "enabled": False,
                            "payout_threshold": 1000.0,
                            "payout_schedule": "monthly"
                        },
                        "tiers": []
                    }
    except Exception as e:
        if "does not exist" in str(e):
            return {
                "success": True,
                "program": {
                    "enabled": False,
                    "payout_threshold": 1000.0,
                    "payout_schedule": "monthly"
                },
                "tiers": []
            }
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/affiliate-program")
async def save_affiliate_program(data: dict):
    """Save affiliate program global settings in admin database"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                # Check if settings exist
                cur.execute("SELECT id FROM affiliate_program LIMIT 1")
                existing = cur.fetchone()

                if existing:
                    # Update existing settings
                    cur.execute("""
                        UPDATE affiliate_program SET
                            enabled = %s,
                            payout_threshold = %s,
                            payout_schedule = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                        RETURNING *
                    """, (
                        data.get('enabled', False),
                        data.get('payout_threshold', 1000.0),
                        data.get('payout_schedule', 'monthly'),
                        existing['id']
                    ))
                else:
                    # Insert new settings
                    cur.execute("""
                        INSERT INTO affiliate_program (enabled, payout_threshold, payout_schedule)
                        VALUES (%s, %s, %s)
                        RETURNING *
                    """, (
                        data.get('enabled', False),
                        data.get('payout_threshold', 1000.0),
                        data.get('payout_schedule', 'monthly')
                    ))

                result = cur.fetchone()
                conn.commit()
                return {"success": True, "program": dict(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# AFFILIATE TIERS ENDPOINTS
# ============================================================

@router.get("/affiliate-tiers")
async def get_affiliate_tiers(program_id: int = None, business_type: str = None):
    """Get all affiliate tiers from admin database, optionally filtered by program_id and business_type

    Args:
        program_id: Optional filter by program ID
        business_type: Optional filter by business type (tutoring, subscription, advertisement)
    """
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                query = "SELECT * FROM affiliate_tiers WHERE 1=1"
                params = []

                if program_id:
                    query += " AND program_id = %s"
                    params.append(program_id)

                if business_type:
                    query += " AND business_type = %s"
                    params.append(business_type)

                query += " ORDER BY business_type, tier_level ASC"

                if params:
                    cur.execute(query, tuple(params))
                else:
                    cur.execute(query)

                tiers = cur.fetchall()
                return {"success": True, "tiers": [dict(t) for t in tiers]}
    except Exception as e:
        if "does not exist" in str(e):
            return {"success": True, "tiers": []}
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/affiliate-tiers/{program_id}/{tier_level}")
async def get_affiliate_tier(program_id: int, tier_level: int):
    """Get specific affiliate tier by program_id and level"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM affiliate_tiers WHERE program_id = %s AND tier_level = %s",
                    (program_id, tier_level)
                )
                result = cur.fetchone()
                if not result:
                    raise HTTPException(status_code=404, detail="Tier not found")
                return {"success": True, "tier": dict(result)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/affiliate-tiers")
async def save_affiliate_tier(data: dict):
    """Save or update affiliate tier in admin database

    Required fields:
        - tier_level: Tier level (1-4)
        - tier_name: Name of the tier
        - commission_rate: Commission percentage (0-100)
        - business_type: Type of business (tutoring, subscription, advertisement)

    Optional fields:
        - program_id: Program ID (defaults to first program)
        - duration_months: Duration in months (defaults to 12)
        - is_active: Active status (defaults to True)
    """
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                # Get program_id from data, or use default program
                program_id = data.get('program_id')
                if not program_id:
                    cur.execute("SELECT id FROM affiliate_program LIMIT 1")
                    result = cur.fetchone()
                    program_id = result['id'] if result else 1

                business_type = data.get('business_type', 'tutoring')

                cur.execute("""
                    INSERT INTO affiliate_tiers (program_id, tier_level, tier_name, commission_rate, duration_months, is_active, business_type)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (program_id, tier_level, business_type) DO UPDATE SET
                        tier_name = EXCLUDED.tier_name,
                        commission_rate = EXCLUDED.commission_rate,
                        duration_months = EXCLUDED.duration_months,
                        is_active = EXCLUDED.is_active,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                """, (
                    program_id,
                    data.get('tier_level'),
                    data.get('tier_name'),
                    data.get('commission_rate', 0),
                    data.get('duration_months', 12),
                    data.get('is_active', True),
                    business_type
                ))
                result = cur.fetchone()
                conn.commit()
                return {"success": True, "tier": dict(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/affiliate-tiers/{program_id}/{tier_level}/{business_type}")
async def delete_affiliate_tier(program_id: int, tier_level: int, business_type: str):
    """Delete affiliate tier by program_id, tier_level, and business_type from admin database"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM affiliate_tiers WHERE program_id = %s AND tier_level = %s AND business_type = %s RETURNING *",
                    (program_id, tier_level, business_type)
                )
                result = cur.fetchone()
                conn.commit()

                if not result:
                    raise HTTPException(status_code=404, detail="Tier not found")

                # Re-order remaining tiers for this program
                cur.execute("""
                    WITH ranked AS (
                        SELECT id, ROW_NUMBER() OVER (ORDER BY tier_level) as new_level
                        FROM affiliate_tiers
                        WHERE program_id = %s
                    )
                    UPDATE affiliate_tiers t
                    SET tier_level = r.new_level
                    FROM ranked r
                    WHERE t.id = r.id
                """, (program_id,))
                conn.commit()

                return {"success": True, "message": f"Tier {tier_level} deleted and remaining tiers re-ordered"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
