"""
cache.py - Caching utilities for Astegni Platform
"""

import json
import hashlib
from typing import Optional, Any, Callable
from functools import wraps
import redis
from datetime import timedelta
import os
from dotenv import load_dotenv

load_dotenv()

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CACHE_TTL = int(os.getenv("CACHE_TTL", 300))  # Default 5 minutes

# Initialize Redis client
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    CACHE_ENABLED = True
    print("✅ Redis cache connected")
except:
    redis_client = None
    CACHE_ENABLED = False
    print("⚠️  Redis cache not available, running without cache")

def generate_cache_key(prefix: str, **kwargs) -> str:
    """Generate a unique cache key based on prefix and parameters"""
    # Sort kwargs to ensure consistent key generation
    sorted_kwargs = sorted(kwargs.items())
    key_data = f"{prefix}:{json.dumps(sorted_kwargs)}"
    
    # Hash long keys to avoid Redis key length limits
    if len(key_data) > 200:
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        return f"{prefix}:{key_hash}"
    
    return key_data

def get_cache(key: str) -> Optional[Any]:
    """Get value from cache"""
    if not CACHE_ENABLED or not redis_client:
        return None
    
    try:
        value = redis_client.get(key)
        if value:
            return json.loads(value)
    except Exception as e:
        print(f"Cache get error: {e}")
    
    return None

def set_cache(key: str, value: Any, ttl: int = CACHE_TTL) -> bool:
    """Set value in cache with TTL"""
    if not CACHE_ENABLED or not redis_client:
        return False
    
    try:
        redis_client.setex(
            key,
            timedelta(seconds=ttl),
            json.dumps(value, default=str)
        )
        return True
    except Exception as e:
        print(f"Cache set error: {e}")
        return False

def delete_cache(key: str) -> bool:
    """Delete key from cache"""
    if not CACHE_ENABLED or not redis_client:
        return False
    
    try:
        redis_client.delete(key)
        return True
    except Exception as e:
        print(f"Cache delete error: {e}")
        return False

def clear_cache_pattern(pattern: str) -> int:
    """Clear all cache keys matching a pattern"""
    if not CACHE_ENABLED or not redis_client:
        return 0
    
    try:
        keys = redis_client.keys(f"{pattern}*")
        if keys:
            return redis_client.delete(*keys)
    except Exception as e:
        print(f"Cache clear error: {e}")
    
    return 0

def cache_key_wrapper(prefix: str, ttl: int = CACHE_TTL):
    """Decorator for caching function results"""
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key from function arguments
            cache_key = generate_cache_key(prefix, **kwargs)
            
            # Try to get from cache
            cached_value = get_cache(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call function and cache result
            result = await func(*args, **kwargs)
            set_cache(cache_key, result, ttl)
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Generate cache key from function arguments
            cache_key = generate_cache_key(prefix, **kwargs)
            
            # Try to get from cache
            cached_value = get_cache(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call function and cache result
            result = func(*args, **kwargs)
            set_cache(cache_key, result, ttl)
            return result
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

# Cache invalidation helpers

def invalidate_user_cache(user_id: int):
    """Invalidate all cache entries for a user"""
    patterns = [
        f"user:{user_id}:*",
        f"profile:{user_id}:*",
        f"sessions:{user_id}:*"
    ]
    
    total_cleared = 0
    for pattern in patterns:
        total_cleared += clear_cache_pattern(pattern)
    
    return total_cleared

def invalidate_tutor_cache(tutor_id: int):
    """Invalidate all cache entries for a tutor"""
    patterns = [
        f"tutor:{tutor_id}:*",
        f"tutor_profile:{tutor_id}:*",
        f"tutor_videos:{tutor_id}:*"
    ]
    
    total_cleared = 0
    for pattern in patterns:
        total_cleared += clear_cache_pattern(pattern)
    
    return total_cleared

def invalidate_video_cache(video_id: int):
    """Invalidate all cache entries for a video"""
    patterns = [
        f"video:{video_id}:*",
        f"video_comments:{video_id}:*",
        f"video_reels:*"  # Clear video list caches
    ]
    
    total_cleared = 0
    for pattern in patterns:
        total_cleared += clear_cache_pattern(pattern)
    
    return total_cleared
