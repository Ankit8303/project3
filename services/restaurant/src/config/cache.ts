import { Redis } from "ioredis";

// In-memory fallback cache entry
interface CacheEntry {
  value: string;
  expiry: number;
}

const memoryStore = new Map<string, CacheEntry>();

let redisClient: Redis | null = null;
let isRedisConnected = false;

// Cleanup expired in-memory entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiry && entry.expiry <= now) {
      memoryStore.delete(key);
    }
  }
}, 60000);

export const initCache = async () => {
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      lazyConnect: true,
      retryStrategy: () => null, // Don't spam retries if offline
      enableOfflineQueue: false,
    });

    redisClient.on("connect", () => {
      isRedisConnected = true;
      console.log("⚡ [Cache] Connected to Redis server successfully");
    });

    redisClient.on("ready", () => {
      isRedisConnected = true;
    });

    redisClient.on("error", (err) => {
      if (isRedisConnected) {
        console.warn("⚠️ [Cache] Redis connection lost, falling back to memory:", err.message);
      }
      isRedisConnected = false;
    });

    redisClient.on("close", () => {
      isRedisConnected = false;
    });

    // Attempt initial connect
    await redisClient.connect().catch(() => {
      isRedisConnected = false;
    });
  } catch (error) {
    isRedisConnected = false;
    console.log("ℹ️ [Cache] Redis offline - running on resilient In-Memory TTL Cache");
  }

  if (!isRedisConnected) {
    console.log("ℹ️ [Cache] Hybrid Cache Active: In-Memory TTL store ready (zero latency)");
  }
};

/**
 * Get cached item (Redis if available, else Memory fallback)
 */
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    if (isRedisConnected && redisClient) {
      const data = await redisClient.get(key);
      if (data) {
        return JSON.parse(data) as T;
      }
      return null;
    }
  } catch (err) {
    // Graceful fallback to memory on any Redis read error
    isRedisConnected = false;
  }

  // Memory fallback
  const entry = memoryStore.get(key);
  if (!entry) return null;

  if (entry.expiry && entry.expiry <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }

  try {
    return JSON.parse(entry.value) as T;
  } catch {
    return null;
  }
};

/**
 * Set item in cache with TTL in seconds (default 300s = 5m)
 */
export const cacheSet = async (
  key: string,
  value: any,
  ttlSeconds = 300
): Promise<void> => {
  const serialized = JSON.stringify(value);

  try {
    if (isRedisConnected && redisClient) {
      await redisClient.set(key, serialized, "EX", ttlSeconds);
      return;
    }
  } catch (err) {
    isRedisConnected = false;
  }

  // Memory fallback
  memoryStore.set(key, {
    value: serialized,
    expiry: Date.now() + ttlSeconds * 1000,
  });
};

/**
 * Delete a specific key from cache
 */
export const cacheDel = async (key: string): Promise<void> => {
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.del(key);
    }
  } catch {
    isRedisConnected = false;
  }

  memoryStore.delete(key);
};

/**
 * Invalidate cache by prefix pattern (e.g. 'restaurants:*' or 'menu:123:*')
 */
export const cacheDelByPattern = async (prefix: string): Promise<void> => {
  try {
    if (isRedisConnected && redisClient) {
      const keys = await redisClient.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    }
  } catch {
    isRedisConnected = false;
  }

  // Memory fallback
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) {
      memoryStore.delete(key);
    }
  }
};

/**
 * Get current cache diagnostic status
 */
export const getCacheStatus = () => {
  return {
    provider: isRedisConnected ? "Redis" : "In-Memory TTL",
    isConnected: isRedisConnected,
    memoryKeysCount: memoryStore.size,
  };
};
