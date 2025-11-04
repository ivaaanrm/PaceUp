"""Redis service for caching."""

import json
import logging
from typing import Any, Optional
from redis import Redis, ConnectionError as RedisConnectionError
from app.core.config import config

logger = logging.getLogger(__name__)


class RedisService:
    """Service for Redis caching operations."""

    def __init__(self):
        """Initialize Redis connection."""
        self._redis: Optional[Redis] = None
        self._enabled = True
        self._connect()

    def _connect(self):
        """Connect to Redis server."""
        try:
            self._redis = Redis.from_url(
                config.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            # Test connection
            self._redis.ping()
            logger.info(f"Connected to Redis at {config.redis_url}")
        except (RedisConnectionError, Exception) as e:
            logger.warning(f"Failed to connect to Redis: {e}. Caching disabled.")
            self._enabled = False
            self._redis = None

    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found or cache disabled
        """
        if not self._enabled or not self._redis:
            return None

        try:
            value = self._redis.get(key)
            if value:
                logger.debug(f"Cache HIT: {key}")
                return json.loads(value)
            logger.debug(f"Cache MISS: {key}")
            return None
        except Exception as e:
            logger.error(f"Redis GET error for key {key}: {e}")
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set a value in cache.
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds (default from config)
            
        Returns:
            True if successful, False otherwise
        """
        if not self._enabled or not self._redis:
            return False

        try:
            ttl = ttl or config.redis_cache_ttl
            serialized_value = json.dumps(value)
            self._redis.setex(key, ttl, serialized_value)
            logger.debug(f"Cache SET: {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Redis SET error for key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """
        Delete a key from cache.
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if successful, False otherwise
        """
        if not self._enabled or not self._redis:
            return False

        try:
            self._redis.delete(key)
            logger.debug(f"Cache DELETE: {key}")
            return True
        except Exception as e:
            logger.error(f"Redis DELETE error for key {key}: {e}")
            return False

    def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern.
        
        Args:
            pattern: Pattern to match (e.g., "athlete:*")
            
        Returns:
            Number of keys deleted
        """
        if not self._enabled or not self._redis:
            return 0

        try:
            keys = self._redis.keys(pattern)
            if keys:
                deleted = self._redis.delete(*keys)
                logger.debug(f"Cache DELETE pattern {pattern}: {deleted} keys")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Redis DELETE pattern error for {pattern}: {e}")
            return 0

    def flush_all(self) -> bool:
        """
        Flush all keys from the current database.
        
        Returns:
            True if successful, False otherwise
        """
        if not self._enabled or not self._redis:
            return False

        try:
            self._redis.flushdb()
            logger.info("Cache FLUSHED all keys")
            return True
        except Exception as e:
            logger.error(f"Redis FLUSH error: {e}")
            return False

    def ping(self) -> bool:
        """
        Check if Redis is available.
        
        Returns:
            True if Redis is available, False otherwise
        """
        if not self._redis:
            return False

        try:
            return self._redis.ping()
        except Exception:
            return False

    def get_stats(self) -> dict:
        """
        Get Redis statistics.
        
        Returns:
            Dictionary with Redis stats
        """
        if not self._enabled or not self._redis:
            return {"enabled": False}

        try:
            info = self._redis.info()
            return {
                "enabled": True,
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_human": info.get("used_memory_human", "N/A"),
                "total_connections_received": info.get("total_connections_received", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": self._calculate_hit_rate(
                    info.get("keyspace_hits", 0),
                    info.get("keyspace_misses", 0),
                ),
            }
        except Exception as e:
            logger.error(f"Error getting Redis stats: {e}")
            return {"enabled": True, "error": str(e)}

    @staticmethod
    def _calculate_hit_rate(hits: int, misses: int) -> str:
        """Calculate cache hit rate percentage."""
        total = hits + misses
        if total == 0:
            return "N/A"
        rate = (hits / total) * 100
        return f"{rate:.2f}%"


# Global Redis instance
redis_service = RedisService()

