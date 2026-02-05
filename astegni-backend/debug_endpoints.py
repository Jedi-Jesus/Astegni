"""
Debug endpoints for development
These endpoints should be disabled in production
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
import os
import sys
from datetime import datetime

router = APIRouter()

# Store recent logs in memory (last 500 lines)
recent_logs = []
MAX_LOGS = 500

# Note: We're NOT intercepting stdout/stderr anymore to avoid conflicts with uvicorn
# Instead, we'll just provide a simple log storage that endpoints can use

@router.get("/api/debug/logs")
def get_recent_logs(
    limit: int = 100,
    filter: str = None
):
    """
    Get recent backend logs

    Args:
        limit: Number of recent logs to return (default 100, max 500)
        filter: Optional keyword filter (case-insensitive)
    """
    # Limit the limit to MAX_LOGS
    limit = min(limit, MAX_LOGS)

    # Get recent logs
    logs = recent_logs[-limit:] if len(recent_logs) > limit else recent_logs

    # Apply filter if provided
    if filter:
        filter_lower = filter.lower()
        logs = [log for log in logs if filter_lower in log['message'].lower()]

    return {
        'total': len(logs),
        'logs': logs
    }

@router.get("/api/debug/logs/role-switch")
def get_role_switch_logs():
    """Get logs related to role switching"""
    keywords = [
        'switch-role',
        'get_current_user',
        '/api/me',
        'active_role',
        'BEFORE update',
        'AFTER update',
        'COMMIT',
        'VERIFIED'
    ]

    filtered_logs = []
    for log in recent_logs:
        if any(keyword.lower() in log['message'].lower() for keyword in keywords):
            filtered_logs.append(log)

    return {
        'total': len(filtered_logs),
        'logs': filtered_logs
    }

@router.delete("/api/debug/logs")
def clear_logs():
    """Clear all stored logs"""
    recent_logs.clear()
    return {'message': 'Logs cleared'}
