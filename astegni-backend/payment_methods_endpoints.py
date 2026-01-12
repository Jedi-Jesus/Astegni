"""
Payment Methods Endpoints
Handles: CRUD operations for user payment methods (Bank Transfer, Mobile Money)
Mobile Money includes: TeleBirr, M-Pesa, M-Birr, HelloCash
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

# Import from app modules
from utils import get_current_user
from models import get_db, PaymentMethod, PaymentMethodCreate, PaymentMethodUpdate, PaymentMethodResponse, User

router = APIRouter(prefix="/api/payment-methods", tags=["Payment Methods"])


# ==========================================
# Reference Data
# ==========================================

ETHIOPIAN_BANKS = {
    "cbe": "Commercial Bank of Ethiopia",
    "dashen": "Dashen Bank",
    "awash": "Awash Bank",
    "boa": "Bank of Abyssinia",
    "wegagen": "Wegagen Bank",
    "united": "United Bank",
    "nib": "Nib International Bank",
    "coop": "Cooperative Bank of Oromia",
    "lion": "Lion International Bank",
    "bunna": "Bunna International Bank",
    "abay": "Abay Bank",
    "berhan": "Berhan International Bank",
    "oromia": "Oromia Bank",
    "zemen": "Zemen Bank",
    "enat": "Enat Bank",
    "addis": "Addis International Bank",
    "debub": "Debub Global Bank",
    "other": "Other Bank"
}

MOBILE_PROVIDERS = {
    "telebirr": "TeleBirr (Ethio Telecom)",
    "m-pesa": "M-Pesa",
    "m-birr": "M-Birr",
    "hello-cash": "HelloCash"
}


# ==========================================
# API Endpoints
# ==========================================

@router.get("/banks", response_model=dict)
async def get_available_banks():
    """Get list of available Ethiopian banks"""
    return {
        "banks": [
            {"code": code, "name": name}
            for code, name in ETHIOPIAN_BANKS.items()
        ]
    }


@router.get("/providers", response_model=dict)
async def get_available_providers():
    """Get list of available mobile money providers"""
    return {
        "providers": [
            {"code": code, "name": name}
            for code, name in MOBILE_PROVIDERS.items()
        ]
    }


@router.get("", response_model=List[PaymentMethodResponse])
async def get_payment_methods(
    method_type: Optional[str] = Query(None, description="Filter by method type"),
    is_active: bool = Query(True, description="Filter by active status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all payment methods for the current user.
    Optionally filter by method_type (bank, mobile_money).
    """
    query = db.query(PaymentMethod).filter(
        PaymentMethod.user_id == current_user.id,
        PaymentMethod.is_active == is_active
    )

    if method_type:
        query = query.filter(PaymentMethod.method_type == method_type)

    payment_methods = query.order_by(
        PaymentMethod.is_primary.desc(),
        PaymentMethod.created_at.desc()
    ).all()

    return payment_methods


@router.get("/primary", response_model=Optional[PaymentMethodResponse])
async def get_primary_payment_method(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the primary payment method for the current user"""
    payment_method = db.query(PaymentMethod).filter(
        PaymentMethod.user_id == current_user.id,
        PaymentMethod.is_primary == True,
        PaymentMethod.is_active == True
    ).first()

    return payment_method


@router.get("/{payment_method_id}", response_model=PaymentMethodResponse)
async def get_payment_method(
    payment_method_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific payment method by ID"""
    payment_method = db.query(PaymentMethod).filter(
        PaymentMethod.id == payment_method_id,
        PaymentMethod.user_id == current_user.id
    ).first()

    if not payment_method:
        raise HTTPException(status_code=404, detail="Payment method not found")

    return payment_method


@router.post("", response_model=PaymentMethodResponse)
async def create_payment_method(
    payment_data: PaymentMethodCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new payment method.

    Required fields depend on method_type:
    - bank: bank_name, account_number, account_holder_name
    - mobile_money: phone_number, provider, registered_name
    """
    # Validate required fields based on method type
    if payment_data.method_type == "bank":
        if not all([payment_data.bank_name, payment_data.account_number, payment_data.account_holder_name]):
            raise HTTPException(
                status_code=400,
                detail="Bank name, account number, and account holder name are required for bank transfers"
            )
    elif payment_data.method_type == "mobile_money":
        if not all([payment_data.phone_number, payment_data.provider, payment_data.registered_name]):
            raise HTTPException(
                status_code=400,
                detail="Phone number, provider, and registered name are required for mobile money"
            )

    # If this is set as primary, unset any existing primary
    if payment_data.is_primary:
        db.query(PaymentMethod).filter(
            PaymentMethod.user_id == current_user.id,
            PaymentMethod.is_primary == True
        ).update({"is_primary": False})

    # Create the payment method
    payment_method = PaymentMethod(
        user_id=current_user.id,
        method_type=payment_data.method_type,
        # Bank fields
        bank_name=payment_data.bank_name,
        bank_code=payment_data.bank_code,
        account_number=payment_data.account_number,
        account_holder_name=payment_data.account_holder_name,
        swift_code=payment_data.swift_code,
        # Mobile Money fields
        phone_number=payment_data.phone_number,
        provider=payment_data.provider,
        registered_name=payment_data.registered_name,
        # Metadata
        nickname=payment_data.nickname,
        is_primary=payment_data.is_primary,
        is_active=True,
        verification_status="pending"
    )

    db.add(payment_method)
    db.commit()
    db.refresh(payment_method)

    return payment_method


@router.put("/{payment_method_id}", response_model=PaymentMethodResponse)
async def update_payment_method(
    payment_method_id: int,
    payment_data: PaymentMethodUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing payment method"""
    payment_method = db.query(PaymentMethod).filter(
        PaymentMethod.id == payment_method_id,
        PaymentMethod.user_id == current_user.id
    ).first()

    if not payment_method:
        raise HTTPException(status_code=404, detail="Payment method not found")

    # If setting as primary, unset any existing primary
    if payment_data.is_primary:
        db.query(PaymentMethod).filter(
            PaymentMethod.user_id == current_user.id,
            PaymentMethod.is_primary == True,
            PaymentMethod.id != payment_method_id
        ).update({"is_primary": False})

    # Update fields that are provided
    update_data = payment_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(payment_method, field, value)

    payment_method.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(payment_method)

    return payment_method


@router.delete("/{payment_method_id}")
async def delete_payment_method(
    payment_method_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a payment method (soft delete - sets is_active to False)"""
    payment_method = db.query(PaymentMethod).filter(
        PaymentMethod.id == payment_method_id,
        PaymentMethod.user_id == current_user.id
    ).first()

    if not payment_method:
        raise HTTPException(status_code=404, detail="Payment method not found")

    # Soft delete
    payment_method.is_active = False
    payment_method.updated_at = datetime.utcnow()

    db.commit()

    return {"success": True, "message": "Payment method deleted"}


@router.post("/{payment_method_id}/set-primary")
async def set_primary_payment_method(
    payment_method_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set a payment method as the primary"""
    payment_method = db.query(PaymentMethod).filter(
        PaymentMethod.id == payment_method_id,
        PaymentMethod.user_id == current_user.id,
        PaymentMethod.is_active == True
    ).first()

    if not payment_method:
        raise HTTPException(status_code=404, detail="Payment method not found")

    # Unset any existing primary
    db.query(PaymentMethod).filter(
        PaymentMethod.user_id == current_user.id,
        PaymentMethod.is_primary == True
    ).update({"is_primary": False})

    # Set this as primary
    payment_method.is_primary = True
    payment_method.updated_at = datetime.utcnow()

    db.commit()

    return {"success": True, "message": "Payment method set as primary"}


# ==========================================
# Admin Verification Endpoint
# ==========================================

@router.post("/{payment_method_id}/verify")
async def verify_payment_method(
    payment_method_id: int,
    status: str = Query(..., description="verified or rejected"),
    notes: Optional[str] = Query(None, description="Verification notes"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify or reject a payment method.
    Note: In production, this should be admin-only.
    """
    # Check if user has admin role
    user_roles = current_user.roles if current_user.roles else []
    if "admin" not in user_roles:
        raise HTTPException(status_code=403, detail="Admin access required")

    if status not in ["verified", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'verified' or 'rejected'")

    payment_method = db.query(PaymentMethod).filter(
        PaymentMethod.id == payment_method_id
    ).first()

    if not payment_method:
        raise HTTPException(status_code=404, detail="Payment method not found")

    payment_method.verification_status = status
    payment_method.is_verified = (status == "verified")
    payment_method.verification_date = datetime.utcnow()
    payment_method.verification_notes = notes
    payment_method.updated_at = datetime.utcnow()

    db.commit()

    return {
        "success": True,
        "message": f"Payment method {status}",
        "verification_status": status
    }
