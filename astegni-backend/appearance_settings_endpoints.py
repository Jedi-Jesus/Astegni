"""
Appearance Settings Endpoints
Handles user appearance preferences (theme, color palette, etc.)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import sys
import os

# Add app.py modules to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.py modules'))

# Import from existing modules
from utils import get_current_user
from models import get_db, User

router = APIRouter()


# Pydantic models for request/response
class AppearanceSettingsUpdate(BaseModel):
    """Model for updating appearance settings"""
    theme: Optional[str] = None
    color_palette: Optional[str] = None
    font_family: Optional[str] = None
    font_size: Optional[int] = None
    display_density: Optional[str] = None
    accent_color: Optional[str] = None
    enable_animations: Optional[bool] = None
    reduce_motion: Optional[bool] = None
    sidebar_position: Optional[str] = None


class AppearanceSettingsResponse(BaseModel):
    """Model for appearance settings response"""
    theme: str
    color_palette: str
    font_family: str
    font_size: int
    display_density: str
    accent_color: str
    enable_animations: bool
    reduce_motion: bool
    sidebar_position: str


@router.get("/api/user/appearance-settings", response_model=AppearanceSettingsResponse)
async def get_appearance_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's appearance settings
    Returns default values if not set
    """
    try:
        # Get user from database (fresh data)
        user = db.query(User).filter(User.id == current_user.id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Return settings with defaults if not set
        return AppearanceSettingsResponse(
            theme=user.theme or 'light',
            color_palette=user.color_palette or 'astegni-classic',
            font_family=user.font_family or 'system',
            font_size=user.font_size or 16,
            display_density=user.display_density or 'comfortable',
            accent_color=user.accent_color or 'indigo',
            enable_animations=user.enable_animations if user.enable_animations is not None else True,
            reduce_motion=user.reduce_motion or False,
            sidebar_position=user.sidebar_position or 'left'
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching appearance settings: {str(e)}")


@router.put("/api/user/appearance-settings")
async def update_appearance_settings(
    settings: AppearanceSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's appearance settings
    Only updates fields that are provided
    """
    try:
        # Get user from database
        user = db.query(User).filter(User.id == current_user.id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Update only provided fields
        update_data = settings.dict(exclude_unset=True)

        for field, value in update_data.items():
            # Validate values before setting
            if field == 'theme' and value not in ['light', 'dark', 'system']:
                raise HTTPException(status_code=400, detail=f"Invalid theme: {value}")

            if field == 'font_family' and value not in ['system', 'inter', 'roboto', 'open-sans', 'comic-neue', 'caveat', 'patrick-hand', 'dancing-script']:
                raise HTTPException(status_code=400, detail=f"Invalid font family: {value}")

            if field == 'font_size' and (value < 12 or value > 20):
                raise HTTPException(status_code=400, detail="Font size must be between 12 and 20")

            if field == 'display_density' and value not in ['compact', 'comfortable', 'spacious']:
                raise HTTPException(status_code=400, detail=f"Invalid display density: {value}")

            if field == 'sidebar_position' and value not in ['left', 'right']:
                raise HTTPException(status_code=400, detail=f"Invalid sidebar position: {value}")

            # Set the attribute
            setattr(user, field, value)

        # Commit changes
        db.commit()
        db.refresh(user)

        return {
            "message": "Appearance settings updated successfully",
            "settings": {
                "theme": user.theme,
                "color_palette": user.color_palette,
                "font_family": user.font_family,
                "font_size": user.font_size,
                "display_density": user.display_density,
                "accent_color": user.accent_color,
                "enable_animations": user.enable_animations,
                "reduce_motion": user.reduce_motion,
                "sidebar_position": user.sidebar_position
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating appearance settings: {str(e)}")


@router.post("/api/user/appearance-settings/reset")
async def reset_appearance_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reset user's appearance settings to defaults
    """
    try:
        user = db.query(User).filter(User.id == current_user.id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Reset to defaults
        user.theme = 'light'
        user.color_palette = 'astegni-classic'
        user.font_family = 'system'
        user.font_size = 16
        user.display_density = 'comfortable'
        user.accent_color = 'indigo'
        user.enable_animations = True
        user.reduce_motion = False
        user.sidebar_position = 'left'

        db.commit()
        db.refresh(user)

        return {
            "message": "Appearance settings reset to defaults",
            "settings": {
                "theme": user.theme,
                "color_palette": user.color_palette,
                "font_family": user.font_family,
                "font_size": user.font_size,
                "display_density": user.display_density,
                "accent_color": user.accent_color,
                "enable_animations": user.enable_animations,
                "reduce_motion": user.reduce_motion,
                "sidebar_position": user.sidebar_position
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error resetting appearance settings: {str(e)}")


# Export router
__all__ = ['router']
