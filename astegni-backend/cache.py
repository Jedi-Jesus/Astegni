# cache.py
from functools import wraps, lru_cache
import hashlib
import json
from typing import Any, Dict
from datetime import datetime, timedelta

# Try to import redis, but don't fail if it's not available
try:
    import redis
    REDIS_AVAILABLE = True
    redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
except ImportError:
    REDIS_AVAILABLE = False
    redis_client = None

class InMemoryCache:
    """Simple in-memory cache with TTL support"""
    def __init__(self):
        self.cache: Dict[str, Dict[str, Any]] = {}
    
    def get(self, key: str) -> Any:
        """Get value from cache if not expired"""
        if key in self.cache:
            entry = self.cache[key]
            if datetime.now() < entry['expires_at']:
                return entry['value']
            else:
                # Remove expired entry
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set value in cache with TTL"""
        self.cache[key] = {
            'value': value,
            'expires_at': datetime.now() + timedelta(seconds=ttl_seconds)
        }
    
    def clear(self):
        """Clear all cache entries"""
        self.cache.clear()

# Global cache instance
cache = InMemoryCache()

def cache_key_wrapper(prefix: str, ttl: int = 300):
    """
    Decorator for caching function results
    Args:
        prefix: Cache key prefix
        ttl: Time to live in seconds (default 5 minutes)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Skip caching for database session objects
            cache_key_parts = []
            for arg in args:
                if not hasattr(arg, '_sa_instance_state'):  # Skip SQLAlchemy objects
                    cache_key_parts.append(str(arg))
            for k, v in kwargs.items():
                if k != 'db' and not hasattr(v, '_sa_instance_state'):
                    cache_key_parts.append(f"{k}={v}")
            
            # Generate cache key
            cache_key = f"{prefix}:{':'.join(cache_key_parts)}"
            
            # Try Redis first if available
            if REDIS_AVAILABLE and redis_client:
                try:
                    cached = redis_client.get(cache_key)
                    if cached:
                        return json.loads(cached)
                except:
                    pass  # Fall back to in-memory cache
            
            # Try in-memory cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            
            # Cache in both Redis (if available) and in-memory
            try:
                # Test if result can be converted to JSON
                json_result = json.dumps(result, default=str)
                
                # Cache in Redis if available
                if REDIS_AVAILABLE and redis_client:
                    try:
                        redis_client.setex(cache_key, ttl, json_result)
                    except:
                        pass  # Continue with in-memory cache
                
                # Always cache in memory
                cache.set(cache_key, result, ttl)
            except (TypeError, ValueError):
                # If not serializable, just return without caching
                pass
            
            return result
        return wrapper
    return decorator

# Simple LRU cache for database query results
@lru_cache(maxsize=128)
def get_cached_query_hash(query_params: str):
    """Generate hash for query parameters"""
    return hashlib.md5(query_params.encode()).hexdigest()