"""
Admin endpoints for managing subscription plans with role-based features
Handles creation/update of subscription plans and their features in subscription_features table
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["admin-subscription-plans"])


class FeatureData(BaseModel):
    """Feature for a specific role"""
    role: str  # tutor, student, parent, advertiser
    feature_name: str
    feature_description: str
    is_enabled: bool = True
    feature_value: Optional[str] = None


class SubscriptionPlanCreate(BaseModel):
    """Create subscription plan with features"""
    package_title: str
    package_price: float
    currency: str = "ETB"
    label: str = "none"  # none, popular, recommended
    is_active: bool = True
    discount_3_months: float = 5
    discount_6_months: float = 10
    discount_yearly: float = 20
    duration_days: int = 30
    is_base_package: bool = False
    subscription_type: Optional[str] = None  # Optional field sent by frontend (not stored in DB, just for UI context)
    # Features by role
    features: List[FeatureData]


class SubscriptionPlanUpdate(BaseModel):
    """Update subscription plan with features"""
    package_title: Optional[str] = None
    package_price: Optional[float] = None
    currency: Optional[str] = None
    label: Optional[str] = None
    is_active: Optional[bool] = None
    discount_3_months: Optional[float] = None
    discount_6_months: Optional[float] = None
    discount_yearly: Optional[float] = None
    duration_days: Optional[int] = None
    is_base_package: Optional[bool] = None
    subscription_type: Optional[str] = None  # Optional field sent by frontend (not stored in DB, just for UI context)
    # Features by role (if provided, replaces all features)
    features: Optional[List[FeatureData]] = None


def get_admin_db():
    """Admin database dependency"""
    from admin_models import AdminSessionLocal
    db = AdminSessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/subscription-plans")
async def create_subscription_plan(
    plan_data: SubscriptionPlanCreate,
    admin_db: Session = Depends(get_admin_db)
):
    """
    Create a new subscription plan with role-based features

    Example:
    {
        "package_title": "Premium Plan",
        "package_price": 299,
        "currency": "ETB",
        "label": "popular",
        "features": [
            {
                "role": "tutor",
                "feature_name": "profile_boost",
                "feature_description": "Boost profile visibility",
                "is_enabled": true
            },
            {
                "role": "student",
                "feature_name": "premium_content",
                "feature_description": "Access premium content",
                "is_enabled": true
            }
        ]
    }
    """
    try:
        # Step 1: Get max display_order
        display_order_query = text("SELECT COALESCE(MAX(display_order), 0) as max_order FROM subscription_plans")
        result = admin_db.execute(display_order_query)
        row = result.fetchone()
        max_order = row.max_order if row else 0

        # Step 2: If this is base package, unmark existing base packages
        if plan_data.is_base_package:
            unmark_query = text("UPDATE subscription_plans SET is_base_package = FALSE WHERE is_base_package = TRUE")
            admin_db.execute(unmark_query)

        # Step 3: Insert subscription plan (WITHOUT features column)
        insert_plan_query = text("""
            INSERT INTO subscription_plans
            (package_title, package_price, currency, is_base_package,
             discount_3_months, discount_6_months, discount_yearly,
             label, display_order, duration_days, is_active)
            VALUES (:title, :price, :currency, :is_base,
                    :discount_3, :discount_6, :discount_yearly,
                    :label, :display_order, :duration, :is_active)
            RETURNING id
        """)

        result = admin_db.execute(insert_plan_query, {
            'title': plan_data.package_title,
            'price': plan_data.package_price,
            'currency': plan_data.currency,
            'is_base': plan_data.is_base_package,
            'discount_3': plan_data.discount_3_months,
            'discount_6': plan_data.discount_6_months,
            'discount_yearly': plan_data.discount_yearly,
            'label': plan_data.label,
            'display_order': max_order + 1,
            'duration': plan_data.duration_days,
            'is_active': plan_data.is_active
        })

        row = result.fetchone()
        plan_id = row.id

        # Step 4: Insert features into subscription_features table
        if plan_data.features:
            insert_feature_query = text("""
                INSERT INTO subscription_features
                (subscription_plan_id, user_role, feature_name, feature_description, is_enabled, feature_value)
                VALUES (:plan_id, :role, :name, :description, :enabled, :value)
            """)

            for feature in plan_data.features:
                admin_db.execute(insert_feature_query, {
                    'plan_id': plan_id,
                    'role': feature.role,
                    'name': feature.feature_name,
                    'description': feature.feature_description,
                    'enabled': feature.is_enabled,
                    'value': feature.feature_value
                })

        admin_db.commit()

        return {
            "success": True,
            "message": "Subscription plan created successfully",
            "plan_id": plan_id,
            "features_created": len(plan_data.features)
        }

    except Exception as e:
        admin_db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create subscription plan: {str(e)}")


@router.put("/subscription-plans/{plan_id}")
async def update_subscription_plan(
    plan_id: int,
    plan_data: SubscriptionPlanUpdate,
    admin_db: Session = Depends(get_admin_db)
):
    """
    Update an existing subscription plan and optionally its features

    If features are provided, all existing features for this plan are replaced
    """
    try:
        # Check if plan exists
        check_query = text("SELECT id FROM subscription_plans WHERE id = :plan_id")
        result = admin_db.execute(check_query, {'plan_id': plan_id})
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="Subscription plan not found")

        # If setting as base package, unmark existing base packages
        if plan_data.is_base_package:
            unmark_query = text("UPDATE subscription_plans SET is_base_package = FALSE WHERE is_base_package = TRUE AND id != :plan_id")
            admin_db.execute(unmark_query, {'plan_id': plan_id})

        # Build dynamic UPDATE query
        update_fields = []
        params = {'plan_id': plan_id}

        if plan_data.package_title is not None:
            update_fields.append("package_title = :title")
            params['title'] = plan_data.package_title

        if plan_data.package_price is not None:
            update_fields.append("package_price = :price")
            params['price'] = plan_data.package_price

        if plan_data.currency is not None:
            update_fields.append("currency = :currency")
            params['currency'] = plan_data.currency

        if plan_data.label is not None:
            update_fields.append("label = :label")
            params['label'] = plan_data.label

        if plan_data.is_active is not None:
            update_fields.append("is_active = :is_active")
            params['is_active'] = plan_data.is_active

        if plan_data.discount_3_months is not None:
            update_fields.append("discount_3_months = :discount_3")
            params['discount_3'] = plan_data.discount_3_months

        if plan_data.discount_6_months is not None:
            update_fields.append("discount_6_months = :discount_6")
            params['discount_6'] = plan_data.discount_6_months

        if plan_data.discount_yearly is not None:
            update_fields.append("discount_yearly = :discount_yearly")
            params['discount_yearly'] = plan_data.discount_yearly

        if plan_data.duration_days is not None:
            update_fields.append("duration_days = :duration")
            params['duration'] = plan_data.duration_days

        if plan_data.is_base_package is not None:
            update_fields.append("is_base_package = :is_base")
            params['is_base'] = plan_data.is_base_package

        # Execute update if there are fields to update
        if update_fields:
            update_query = text(f"UPDATE subscription_plans SET {', '.join(update_fields)} WHERE id = :plan_id")
            admin_db.execute(update_query, params)

        # Handle features update if provided
        features_updated = 0
        if plan_data.features is not None:
            # Delete all existing features for this plan
            delete_features_query = text("DELETE FROM subscription_features WHERE subscription_plan_id = :plan_id")
            admin_db.execute(delete_features_query, {'plan_id': plan_id})

            # Insert new features
            if plan_data.features:
                insert_feature_query = text("""
                    INSERT INTO subscription_features
                    (subscription_plan_id, user_role, feature_name, feature_description, is_enabled, feature_value)
                    VALUES (:plan_id, :role, :name, :description, :enabled, :value)
                """)

                for feature in plan_data.features:
                    admin_db.execute(insert_feature_query, {
                        'plan_id': plan_id,
                        'role': feature.role,
                        'name': feature.feature_name,
                        'description': feature.feature_description,
                        'enabled': feature.is_enabled,
                        'value': feature.feature_value
                    })

                features_updated = len(plan_data.features)

        admin_db.commit()

        return {
            "success": True,
            "message": "Subscription plan updated successfully",
            "plan_id": plan_id,
            "features_updated": features_updated if plan_data.features is not None else "not modified"
        }

    except HTTPException:
        raise
    except Exception as e:
        admin_db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update subscription plan: {str(e)}")


@router.delete("/subscription-plans/{plan_id}")
async def delete_subscription_plan(
    plan_id: int,
    admin_db: Session = Depends(get_admin_db)
):
    """
    Delete a subscription plan and all its features
    Features are auto-deleted due to ON DELETE CASCADE
    """
    try:
        # Check if plan exists
        check_query = text("SELECT id, package_title FROM subscription_plans WHERE id = :plan_id")
        result = admin_db.execute(check_query, {'plan_id': plan_id})
        plan = result.fetchone()

        if not plan:
            raise HTTPException(status_code=404, detail="Subscription plan not found")

        # Delete plan (features auto-deleted via CASCADE)
        delete_query = text("DELETE FROM subscription_plans WHERE id = :plan_id")
        admin_db.execute(delete_query, {'plan_id': plan_id})

        admin_db.commit()

        return {
            "success": True,
            "message": f"Subscription plan '{plan.package_title}' deleted successfully (features auto-deleted)"
        }

    except HTTPException:
        raise
    except Exception as e:
        admin_db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete subscription plan: {str(e)}")


@router.get("/subscription-plans/{plan_id}/features")
async def get_plan_features(
    plan_id: int,
    role: Optional[str] = None,
    admin_db: Session = Depends(get_admin_db)
):
    """
    Get all features for a subscription plan, optionally filtered by role
    """
    try:
        # Check if plan exists
        check_query = text("SELECT id, package_title FROM subscription_plans WHERE id = :plan_id")
        result = admin_db.execute(check_query, {'plan_id': plan_id})
        plan = result.fetchone()

        if not plan:
            raise HTTPException(status_code=404, detail="Subscription plan not found")

        # Get features
        if role:
            features_query = text("""
                SELECT user_role, feature_name, feature_description, is_enabled, feature_value
                FROM subscription_features
                WHERE subscription_plan_id = :plan_id AND user_role = :role
                ORDER BY feature_name
            """)
            result = admin_db.execute(features_query, {'plan_id': plan_id, 'role': role})
        else:
            features_query = text("""
                SELECT user_role, feature_name, feature_description, is_enabled, feature_value
                FROM subscription_features
                WHERE subscription_plan_id = :plan_id
                ORDER BY user_role, feature_name
            """)
            result = admin_db.execute(features_query, {'plan_id': plan_id})

        rows = result.fetchall()

        features = []
        for row in rows:
            features.append({
                "role": row.user_role,
                "feature_name": row.feature_name,
                "feature_description": row.feature_description,
                "is_enabled": row.is_enabled,
                "feature_value": row.feature_value
            })

        return {
            "success": True,
            "plan_id": plan_id,
            "plan_name": plan.package_title,
            "features": features
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get plan features: {str(e)}")


@router.post("/subscription-plans/{plan_id}/assign-features")
async def assign_plan_features(
    plan_id: int,
    features: Dict[str, List[FeatureData]],
    admin_db: Session = Depends(get_admin_db)
):
    """
    Assign features to a subscription plan by replacing all existing features

    This is a separate endpoint from create/update plan to allow managing features independently.
    Features are role-based, so each role can have different features for the same plan.

    Example request body:
    {
        "features": [
            {
                "role": "tutor",
                "feature_name": "profile_boost",
                "feature_description": "Boost profile visibility by 50%",
                "is_enabled": true,
                "feature_value": "50%"
            },
            {
                "role": "student",
                "feature_name": "premium_content",
                "feature_description": "Access to premium educational content",
                "is_enabled": true
            }
        ]
    }
    """
    try:
        # Check if plan exists
        check_query = text("SELECT id, package_title FROM subscription_plans WHERE id = :plan_id")
        result = admin_db.execute(check_query, {'plan_id': plan_id})
        plan = result.fetchone()

        if not plan:
            raise HTTPException(status_code=404, detail="Subscription plan not found")

        # Extract features list from the dict
        features_list = features.get('features', [])

        # Delete all existing features for this plan
        delete_query = text("DELETE FROM subscription_features WHERE subscription_plan_id = :plan_id")
        admin_db.execute(delete_query, {'plan_id': plan_id})

        # Insert new features
        features_count = 0
        if features_list:
            insert_query = text("""
                INSERT INTO subscription_features
                (subscription_plan_id, user_role, feature_name, feature_description, is_enabled, feature_value)
                VALUES (:plan_id, :role, :name, :description, :enabled, :value)
            """)

            for feature in features_list:
                # Handle both dict and FeatureData object
                if isinstance(feature, dict):
                    role = feature.get('role')
                    name = feature.get('feature_name')
                    description = feature.get('feature_description')
                    enabled = feature.get('is_enabled', True)
                    value = feature.get('feature_value')
                else:
                    role = feature.role
                    name = feature.feature_name
                    description = feature.feature_description
                    enabled = feature.is_enabled
                    value = feature.feature_value

                admin_db.execute(insert_query, {
                    'plan_id': plan_id,
                    'role': role,
                    'name': name,
                    'description': description,
                    'enabled': enabled,
                    'value': value
                })
                features_count += 1

        admin_db.commit()

        return {
            "success": True,
            "message": f"Successfully assigned {features_count} features to '{plan.package_title}'",
            "plan_id": plan_id,
            "features_assigned": features_count
        }

    except HTTPException:
        raise
    except Exception as e:
        admin_db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to assign features: {str(e)}")
