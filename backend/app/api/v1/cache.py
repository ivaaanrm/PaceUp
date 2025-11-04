"""Cache management endpoints"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.redis_service import redis_service
from app.services.strava_service import strava_service

router = APIRouter(prefix="/cache", tags=["cache"])


class CacheStatsResponse(BaseModel):
    """Response model for cache statistics"""
    enabled: bool
    connected_clients: int | None = None
    used_memory_human: str | None = None
    total_connections_received: int | None = None
    keyspace_hits: int | None = None
    keyspace_misses: int | None = None
    hit_rate: str | None = None
    error: str | None = None


class CacheInvalidateResponse(BaseModel):
    """Response model for cache invalidation"""
    message: str
    keys_deleted: int


@router.get("/stats", response_model=CacheStatsResponse)
async def get_cache_stats():
    """
    Get Redis cache statistics.
    
    Returns cache hit rate, memory usage, and connection info.
    """
    stats = redis_service.get_stats()
    return CacheStatsResponse(**stats)


@router.post("/invalidate", response_model=CacheInvalidateResponse)
async def invalidate_cache(pattern: str = "strava:*"):
    """
    Invalidate cached data matching a pattern.
    
    Args:
        pattern: Redis key pattern to match (default: "strava:*")
        
    Common patterns:
        - "strava:*" - All Strava data
        - "strava:athlete:*" - All athlete data
        - "strava:activity:*" - All activity data
        - "strava:activity:12345:*" - Specific activity
    
    Returns:
        Number of keys deleted
    """
    deleted = strava_service.invalidate_cache(pattern)
    return CacheInvalidateResponse(
        message=f"Invalidated cache keys matching pattern: {pattern}",
        keys_deleted=deleted
    )


@router.post("/flush", response_model=CacheInvalidateResponse)
async def flush_all_cache():
    """
    Flush all cache data.
    
    **Warning**: This will delete ALL cached data from Redis.
    Use with caution!
    
    Returns:
        Confirmation message
    """
    success = redis_service.flush_all()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to flush cache")
    
    return CacheInvalidateResponse(
        message="Successfully flushed all cache data",
        keys_deleted=0  # flush_all doesn't return count
    )


@router.get("/health")
async def cache_health():
    """
    Check Redis health status.
    
    Returns:
        Status of Redis connection
    """
    is_healthy = redis_service.ping()
    if not is_healthy:
        raise HTTPException(status_code=503, detail="Redis is not available")
    
    return {"status": "healthy", "message": "Redis is connected and responding"}

