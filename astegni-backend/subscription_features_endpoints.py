"""
Subscription features endpoints
Get features available for a user's subscription based on their role
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from utils import get_current_user

router = APIRouter(prefix="/api/subscription", tags=["subscription-features"])


# Pydantic models
class FeatureResponse(BaseModel):
    feature_name: str
    feature_description: Optional[str] = None
    is_enabled: bool
    feature_value: Optional[str] = None

    class Config:
        from_attributes = True


def get_user_db():
    """User database dependency"""
    from app import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_admin_db():
    """Admin database dependency"""
    from app import AdminSessionLocal
    db = AdminSessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/features", response_model=List[FeatureResponse])
async def get_subscription_features(
    role: Optional[str] = None,
    current_user=Depends(get_current_user),
    user_db: Session = Depends(get_user_db),
    admin_db: Session = Depends(get_admin_db)
):
    """
    Get features available for the user's current subscription based on their role

    Parameters:
    - role: Optional role filter (tutor, student, parent). If not provided, uses current active role.
    """
    # Get user's current subscription plan
    user_query = text("""
        SELECT subscription_plan_id
        FROM users
        WHERE id = :user_id
    """)

    result = user_db.execute(user_query, {'user_id': current_user.id})
    user = result.fetchone()

    if not user or not user.subscription_plan_id:
        return []  # No active subscription

    subscription_plan_id = user.subscription_plan_id

    # Determine which role to query features for
    target_role = role if role else current_user.active_role

    if not target_role:
        raise HTTPException(status_code=400, detail="No active role found")

    # Get features for this plan and role from admin database
    features_query = text("""
        SELECT
            feature_name,
            feature_description,
            is_enabled,
            feature_value
        FROM subscription_features
        WHERE subscription_plan_id = :plan_id
          AND user_role = :role
          AND is_enabled = true
        ORDER BY feature_name
    """)

    result = admin_db.execute(features_query, {
        'plan_id': subscription_plan_id,
        'role': target_role
    })
    rows = result.fetchall()

    features = []
    for row in rows:
        features.append(FeatureResponse(
            feature_name=row.feature_name,
            feature_description=row.feature_description,
            is_enabled=row.is_enabled,
            feature_value=row.feature_value
        ))

    return features


@router.get("/features/check/{feature_name}")
async def check_feature_access(
    feature_name: str,
    role: Optional[str] = None,
    current_user=Depends(get_current_user),
    user_db: Session = Depends(get_user_db),
    admin_db: Session = Depends(get_admin_db)
):
    """
    Check if user has access to a specific feature

    Parameters:
    - feature_name: Name of the feature to check
    - role: Optional role filter. If not provided, uses current active role.

    Returns:
    - has_access: Boolean indicating if user has this feature
    - feature_value: Optional configuration value for the feature
    """
    # Get user's current subscription plan
    user_query = text("""
        SELECT subscription_plan_id
        FROM users
        WHERE id = :user_id
    """)

    result = user_db.execute(user_query, {'user_id': current_user.id})
    user = result.fetchone()

    if not user or not user.subscription_plan_id:
        return {
            "has_access": False,
            "feature_name": feature_name,
            "message": "No active subscription"
        }

    subscription_plan_id = user.subscription_plan_id
    target_role = role if role else current_user.active_role

    # Check if feature exists and is enabled
    check_query = text("""
        SELECT
            is_enabled,
            feature_value,
            feature_description
        FROM subscription_features
        WHERE subscription_plan_id = :plan_id
          AND user_role = :role
          AND feature_name = :feature_name
    """)

    result = admin_db.execute(check_query, {
        'plan_id': subscription_plan_id,
        'role': target_role,
        'feature_name': feature_name
    })
    row = result.fetchone()

    if not row:
        return {
            "has_access": False,
            "feature_name": feature_name,
            "message": "Feature not available in current plan"
        }

    return {
        "has_access": row.is_enabled,
        "feature_name": feature_name,
        "feature_value": row.feature_value,
        "feature_description": row.feature_description
    }


@router.get("/plan/features/all")
async def get_all_plan_features(
    current_user=Depends(get_current_user),
    user_db: Session = Depends(get_user_db),
    admin_db: Session = Depends(get_admin_db)
):
    """
    Get all features for the user's subscription plan, grouped by role
    Useful for showing what features are available across all roles
    """
    # Get user's current subscription plan
    user_query = text("""
        SELECT subscription_plan_id
        FROM users
        WHERE id = :user_id
    """)

    result = user_db.execute(user_query, {'user_id': current_user.id})
    user = result.fetchone()

    if not user or not user.subscription_plan_id:
        return {"features_by_role": {}}

    subscription_plan_id = user.subscription_plan_id

    # Get all features for this plan, grouped by role
    features_query = text("""
        SELECT
            user_role,
            feature_name,
            feature_description,
            is_enabled,
            feature_value
        FROM subscription_features
        WHERE subscription_plan_id = :plan_id
          AND is_enabled = true
        ORDER BY user_role, feature_name
    """)

    result = admin_db.execute(features_query, {'plan_id': subscription_plan_id})
    rows = result.fetchall()

    # Group features by role
    features_by_role = {}
    for row in rows:
        role = row.user_role
        if role not in features_by_role:
            features_by_role[role] = []

        features_by_role[role].append({
            "feature_name": row.feature_name,
            "feature_description": row.feature_description,
            "is_enabled": row.is_enabled,
            "feature_value": row.feature_value
        })

    return {"features_by_role": features_by_role}
