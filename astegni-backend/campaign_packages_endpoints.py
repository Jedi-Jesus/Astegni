"""
Brand Packages Endpoints
Handles CRUD operations for advertising brand packages
Uses astegni_admin_db database

Brand Packages are TIME-BASED (daily price × duration days)
Uses single 'discount' field for cross-package discount calculation
Discount is auto-calculated: ((Base Rate - This Rate) / Base Rate) × 100

Standardized Schema:
- id, package_title, package_price, currency, is_base_package, features,
- discount, is_active, label, display_order, duration_days, created_at, updated_at
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import psycopg
import os
import json
from dotenv import load_dotenv

load_dotenv()

# Use Admin Database for brand packages
ADMIN_DATABASE_URL = os.getenv("ADMIN_DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db")

router = APIRouter(prefix="/api/admin", tags=["Brand Packages"])

# Pydantic models - Simplified schema with single discount field
class BrandPackageCreate(BaseModel):
    package_title: str
    package_price: float = 0  # Daily price
    currency: str = "ETB"
    is_base_package: bool = False
    features: List[str] = []
    discount: float = 0  # Single discount field (auto-calculated from base package)
    label: str = "none"  # none, popular, best_value, etc.
    duration_days: int = 30

class BrandPackageUpdate(BaseModel):
    package_title: Optional[str] = None
    package_price: Optional[float] = None
    currency: Optional[str] = None
    is_base_package: Optional[bool] = None
    features: Optional[List[str]] = None
    discount: Optional[float] = None  # Single discount field
    label: Optional[str] = None
    is_active: Optional[bool] = None
    duration_days: Optional[int] = None

class PackageReorderRequest(BaseModel):
    order: List[dict]  # [{"id": 1, "order": 1}, {"id": 2, "order": 2}, ...]

# Get all brand packages (also supports legacy /campaign-packages route)
@router.get("/brand-packages")
@router.get("/campaign-packages")
async def get_brand_packages(
    active_only: bool = True
):
    """Get all brand packages from admin database"""
    conn = None
    try:
        conn = psycopg.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        query = """
            SELECT id, package_title, package_price, currency, is_base_package, features,
                   discount, is_active, display_order, label, duration_days,
                   created_at, updated_at
            FROM brand_packages
        """

        if active_only:
            query += " WHERE is_active = TRUE"

        query += " ORDER BY display_order ASC, id ASC"

        cursor.execute(query)
        rows = cursor.fetchall()

        packages = []
        for row in rows:
            packages.append({
                "id": row[0],
                "package_title": row[1],
                "name": row[1],  # Alias for frontend compatibility
                "package_price": float(row[2]) if row[2] else 0,
                "daily_price": float(row[2]) if row[2] else 0,  # Alias for frontend
                "currency": row[3] or "ETB",
                "is_base_package": row[4] or False,
                "isBase": row[4] or False,  # Alias for frontend
                "features": row[5] if row[5] else [],
                "discount": float(row[6]) if row[6] else 0,  # Single discount field
                "is_active": row[7],
                "display_order": row[8],
                "label": row[9] or "none",
                "duration_days": row[10] if row[10] else 30,
                "created_at": row[11].isoformat() if row[11] else None,
                "updated_at": row[12].isoformat() if row[12] else None
            })

        return {
            "success": True,
            "packages": packages,
            "count": len(packages)
        }

    except Exception as e:
        print(f"Error fetching brand packages: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# Get single brand package
@router.get("/brand-packages/{package_id}")
@router.get("/campaign-packages/{package_id}")
async def get_brand_package(
    package_id: int
):
    """Get a single brand package by ID"""
    conn = None
    try:
        conn = psycopg.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, package_title, package_price, currency, is_base_package, features,
                   discount, is_active, display_order, label, duration_days,
                   created_at, updated_at
            FROM brand_packages
            WHERE id = %s
        """, (package_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Package not found")

        package = {
            "id": row[0],
            "package_title": row[1],
            "name": row[1],
            "package_price": float(row[2]) if row[2] else 0,
            "daily_price": float(row[2]) if row[2] else 0,
            "currency": row[3] or "ETB",
            "is_base_package": row[4] or False,
            "isBase": row[4] or False,
            "features": row[5] if row[5] else [],
            "discount": float(row[6]) if row[6] else 0,  # Single discount field
            "is_active": row[7],
            "display_order": row[8],
            "label": row[9] or "none",
            "duration_days": row[10] if row[10] else 30,
            "created_at": row[11].isoformat() if row[11] else None,
            "updated_at": row[12].isoformat() if row[12] else None
        }

        return {
            "success": True,
            "package": package
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching brand package: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# Create brand package
@router.post("/brand-packages")
@router.post("/campaign-packages")  # Legacy support
async def create_brand_package(
    package: BrandPackageCreate
):
    """Create a new brand package"""

    conn = None
    try:
        conn = psycopg.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        # Get the max display_order
        cursor.execute("SELECT COALESCE(MAX(display_order), 0) FROM brand_packages")
        max_order = cursor.fetchone()[0]

        # If this is marked as base package, unmark any existing base packages
        if package.is_base_package:
            cursor.execute("UPDATE brand_packages SET is_base_package = FALSE WHERE is_base_package = TRUE")

        # Insert new package with single discount field
        cursor.execute("""
            INSERT INTO brand_packages
            (package_title, package_price, currency, is_base_package, features,
             discount, label, display_order, duration_days)
            VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s)
            RETURNING id
        """, (
            package.package_title,
            package.package_price,
            package.currency,
            package.is_base_package,
            json.dumps(package.features),
            package.discount,
            package.label,
            max_order + 1,
            package.duration_days
        ))

        package_id = cursor.fetchone()[0]
        conn.commit()

        return {
            "success": True,
            "message": "Brand package created successfully",
            "package_id": package_id
        }

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error creating brand package: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# Update brand package
@router.put("/brand-packages/{package_id}")
@router.put("/campaign-packages/{package_id}")  # Legacy support
async def update_brand_package(
    package_id: int,
    package: BrandPackageUpdate
):
    """Update an existing brand package"""

    conn = None
    try:
        conn = psycopg.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        # Check if package exists
        cursor.execute("SELECT id FROM brand_packages WHERE id = %s", (package_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Package not found")

        # If setting as base package, unmark any existing base packages
        if package.is_base_package:
            cursor.execute("UPDATE brand_packages SET is_base_package = FALSE WHERE is_base_package = TRUE AND id != %s", (package_id,))

        # Build update query dynamically
        update_fields = []
        values = []

        if package.package_title is not None:
            update_fields.append("package_title = %s")
            values.append(package.package_title)

        if package.package_price is not None:
            update_fields.append("package_price = %s")
            values.append(package.package_price)

        if package.currency is not None:
            update_fields.append("currency = %s")
            values.append(package.currency)

        if package.is_base_package is not None:
            update_fields.append("is_base_package = %s")
            values.append(package.is_base_package)

        if package.features is not None:
            update_fields.append("features = %s::jsonb")
            values.append(json.dumps(package.features))

        if package.discount is not None:
            update_fields.append("discount = %s")
            values.append(package.discount)

        if package.label is not None:
            update_fields.append("label = %s")
            values.append(package.label)

        if package.is_active is not None:
            update_fields.append("is_active = %s")
            values.append(package.is_active)

        if package.duration_days is not None:
            update_fields.append("duration_days = %s")
            values.append(package.duration_days)

        if update_fields:
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            values.append(package_id)

            query = f"""
                UPDATE brand_packages
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            cursor.execute(query, values)

        conn.commit()

        return {
            "success": True,
            "message": "Brand package updated successfully"
        }

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error updating brand package: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# Delete brand package
@router.delete("/brand-packages/{package_id}")
@router.delete("/campaign-packages/{package_id}")  # Legacy support
async def delete_brand_package(
    package_id: int
):
    """Delete a brand package"""

    conn = None
    try:
        conn = psycopg.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        # Check if package exists
        cursor.execute("SELECT id FROM brand_packages WHERE id = %s", (package_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Package not found")

        # Delete the package
        cursor.execute("DELETE FROM brand_packages WHERE id = %s", (package_id,))
        conn.commit()

        return {
            "success": True,
            "message": "Brand package deleted successfully"
        }

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error deleting brand package: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# Reorder brand packages
@router.post("/brand-packages/reorder")
@router.post("/campaign-packages/reorder")  # Legacy support
async def reorder_brand_packages(
    request: PackageReorderRequest
):
    """Update display order of brand packages"""

    conn = None
    try:
        conn = psycopg.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        # Update each package's display_order
        for item in request.order:
            cursor.execute("""
                UPDATE brand_packages
                SET display_order = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (item['order'], item['id']))

        conn.commit()

        return {
            "success": True,
            "message": "Package order updated successfully"
        }

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error reordering packages: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# Set base package
@router.post("/brand-packages/{package_id}/set-base")
@router.post("/campaign-packages/{package_id}/set-base")
async def set_base_package(
    package_id: int
):
    """Set a package as the base package for discount calculations"""

    conn = None
    try:
        conn = psycopg.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        # Check if package exists
        cursor.execute("SELECT id FROM brand_packages WHERE id = %s", (package_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Package not found")

        # Unmark all existing base packages
        cursor.execute("UPDATE brand_packages SET is_base_package = FALSE WHERE is_base_package = TRUE")

        # Mark this package as base
        cursor.execute("""
            UPDATE brand_packages
            SET is_base_package = TRUE, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (package_id,))

        conn.commit()

        return {
            "success": True,
            "message": "Base package set successfully"
        }

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error setting base package: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()
