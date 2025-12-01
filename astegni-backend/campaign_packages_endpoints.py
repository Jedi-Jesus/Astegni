"""
Campaign Packages Endpoints
Handles CRUD operations for advertising campaign packages
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

router = APIRouter(prefix="/api/admin", tags=["Campaign Packages"])

# Pydantic models
class CampaignPackageCreate(BaseModel):
    name: str
    days: int
    price: float
    description: Optional[str] = None
    is_base: bool = False
    features: List[str] = []
    label: str = "none"

class CampaignPackageUpdate(BaseModel):
    name: Optional[str] = None
    days: Optional[int] = None
    price: Optional[float] = None
    description: Optional[str] = None
    is_base: Optional[bool] = None
    features: Optional[List[str]] = None
    label: Optional[str] = None
    is_active: Optional[bool] = None

class PackageReorderRequest(BaseModel):
    order: List[dict]  # [{"id": 1, "order": 1}, {"id": 2, "order": 2}, ...]

# Get all campaign packages
@router.get("/campaign-packages")
async def get_campaign_packages(
    active_only: bool = True
):
    """Get all campaign packages"""
    conn = None
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        query = """
            SELECT id, name, days, price, description, is_base,
                   features, label, display_order, is_active,
                   created_at, updated_at
            FROM campaign_packages
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
                "name": row[1],
                "days": row[2],
                "price": float(row[3]),
                "description": row[4],
                "is_base": row[5],
                "features": row[6] if row[6] else [],
                "label": row[7],
                "display_order": row[8],
                "is_active": row[9],
                "created_at": row[10].isoformat() if row[10] else None,
                "updated_at": row[11].isoformat() if row[11] else None
            })

        return {
            "success": True,
            "packages": packages,
            "count": len(packages)
        }

    except Exception as e:
        print(f"Error fetching campaign packages: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# Get single campaign package
@router.get("/campaign-packages/{package_id}")
async def get_campaign_package(
    package_id: int
):
    """Get a single campaign package by ID"""
    conn = None
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, name, days, price, description, is_base,
                   features, label, display_order, is_active,
                   created_at, updated_at
            FROM campaign_packages
            WHERE id = %s
        """, (package_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Package not found")

        package = {
            "id": row[0],
            "name": row[1],
            "days": row[2],
            "price": float(row[3]),
            "description": row[4],
            "is_base": row[5],
            "features": row[6] if row[6] else [],
            "label": row[7],
            "display_order": row[8],
            "is_active": row[9],
            "created_at": row[10].isoformat() if row[10] else None,
            "updated_at": row[11].isoformat() if row[11] else None
        }

        return {
            "success": True,
            "package": package
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching campaign package: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# Create campaign package
@router.post("/campaign-packages")
async def create_campaign_package(
    package: CampaignPackageCreate
):
    """Create a new campaign package"""

    conn = None
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        # If this is set as base, unset all other base packages
        if package.is_base:
            cursor.execute("UPDATE campaign_packages SET is_base = FALSE")

        # Get the max display_order
        cursor.execute("SELECT COALESCE(MAX(display_order), 0) FROM campaign_packages")
        max_order = cursor.fetchone()[0]

        # Insert new package
        cursor.execute("""
            INSERT INTO campaign_packages
            (name, days, price, description, is_base, features, label, display_order)
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s)
            RETURNING id
        """, (
            package.name,
            package.days,
            package.price,
            package.description,
            package.is_base,
            package.features,
            package.label,
            max_order + 1
        ))

        package_id = cursor.fetchone()[0]
        conn.commit()

        return {
            "success": True,
            "message": "Campaign package created successfully",
            "package_id": package_id
        }

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error creating campaign package: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# Update campaign package
@router.put("/campaign-packages/{package_id}")
async def update_campaign_package(
    package_id: int,
    package: CampaignPackageUpdate
):
    """Update an existing campaign package"""

    conn = None
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Check if package exists
        cursor.execute("SELECT id FROM campaign_packages WHERE id = %s", (package_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Package not found")

        # If setting as base, unset all other base packages
        if package.is_base is True:
            cursor.execute("UPDATE campaign_packages SET is_base = FALSE WHERE id != %s", (package_id,))

        # Build update query dynamically
        update_fields = []
        values = []

        if package.name is not None:
            update_fields.append("name = %s")
            values.append(package.name)

        if package.days is not None:
            update_fields.append("days = %s")
            values.append(package.days)

        if package.price is not None:
            update_fields.append("price = %s")
            values.append(package.price)

        if package.description is not None:
            update_fields.append("description = %s")
            values.append(package.description)

        if package.is_base is not None:
            update_fields.append("is_base = %s")
            values.append(package.is_base)

        if package.features is not None:
            update_fields.append("features = %s::jsonb")
            values.append(package.features)

        if package.label is not None:
            update_fields.append("label = %s")
            values.append(package.label)

        if package.is_active is not None:
            update_fields.append("is_active = %s")
            values.append(package.is_active)

        if update_fields:
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            values.append(package_id)

            query = f"""
                UPDATE campaign_packages
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            cursor.execute(query, values)

        conn.commit()

        return {
            "success": True,
            "message": "Campaign package updated successfully"
        }

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error updating campaign package: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# Delete campaign package
@router.delete("/campaign-packages/{package_id}")
async def delete_campaign_package(
    package_id: int
):
    """Delete a campaign package"""

    conn = None
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Check if package exists and if it's base
        cursor.execute("SELECT is_base FROM campaign_packages WHERE id = %s", (package_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Package not found")

        was_base = row[0]

        # Delete the package
        cursor.execute("DELETE FROM campaign_packages WHERE id = %s", (package_id,))

        # If we deleted the base package, set another as base
        if was_base:
            cursor.execute("""
                UPDATE campaign_packages
                SET is_base = TRUE
                WHERE id = (SELECT id FROM campaign_packages ORDER BY display_order LIMIT 1)
            """)

        conn.commit()

        return {
            "success": True,
            "message": "Campaign package deleted successfully"
        }

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error deleting campaign package: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# Reorder campaign packages
@router.post("/campaign-packages/reorder")
async def reorder_campaign_packages(
    request: PackageReorderRequest
):
    """Update display order of campaign packages"""

    conn = None
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Update each package's display_order
        for item in request.order:
            cursor.execute("""
                UPDATE campaign_packages
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
