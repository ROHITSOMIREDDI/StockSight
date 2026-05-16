import json
import redis
import logging
from config import Config

logger = logging.getLogger(__name__)

# Initialize Redis client
try:
    redis_client = redis.from_url(Config.REDIS_URL, decode_responses=True, socket_connect_timeout=2)
    # Test connection
    redis_client.ping()
except Exception as e:
    logger.warning(f"Failed to connect to Redis: {e}. Falling back to no-cache.")
    redis_client = None

def get_cache(key):
    if not redis_client:
        return None
    try:
        data = redis_client.get(key)
        if data:
            return json.loads(data)
        return None
    except Exception as e:
        logger.error(f"Redis get error for {key}: {e}")
        return None

def set_cache(key, value, ttl=None):
    if not redis_client:
        return False
    try:
        redis_client.set(key, json.dumps(value), ex=ttl)
        return True
    except Exception as e:
        logger.error(f"Redis set error for {key}: {e}")
        return False

def delete_cache(key):
    if not redis_client:
        return False
    try:
        redis_client.delete(key)
        return True
    except Exception as e:
        logger.error(f"Redis delete error for {key}: {e}")
        return False

def clear_all_cache():
    if not redis_client:
        return 0
    try:
        keys = redis_client.keys("stock:*")
        if keys:
            redis_client.delete(*keys)
            return len(keys)
        return 0
    except Exception as e:
        logger.error(f"Redis clear error: {e}")
        return 0
