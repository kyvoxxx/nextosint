import { createHash } from 'node:crypto';
import { getRedis } from '../config/redis.js';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Redis cache layer for investigation results.
 * Keys are prefixed by type and hashed (email/URL) or used directly (IP/domain).
 */

function buildCacheKey(type: string, target: string): string {
  // Hash emails and URLs which may contain special characters or sensitive data
  if (type === 'email' || type === 'url') {
    const hash = createHash('sha256').update(target).digest('hex').slice(0, 16);
    return `inv:${type}:${hash}`;
  }
  return `inv:${type}:${target}`;
}

/**
 * Retrieve a cached investigation result.
 * Returns null on cache miss or Redis errors (fail-open).
 */
export async function getCached<T>(type: string, target: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const key = buildCacheKey(type, target);
    const cached = await redis.get(key);

    if (cached) {
      logger.debug({ key }, 'Cache HIT');
      return JSON.parse(cached) as T;
    }

    logger.debug({ key }, 'Cache MISS');
    return null;
  } catch (err) {
    logger.warn({ err }, 'Cache read failed — continuing without cache');
    return null;
  }
}

/**
 * Store an investigation result in cache.
 * Silently fails on Redis errors (fire-and-forget).
 */
export async function setCache<T>(type: string, target: string, data: T): Promise<void> {
  try {
    const redis = getRedis();
    const env = getEnv();
    const key = buildCacheKey(type, target);
    const serialized = JSON.stringify(data);

    await redis.setex(key, env.CACHE_TTL_SECONDS, serialized);
    logger.debug({ key, ttl: env.CACHE_TTL_SECONDS }, 'Cache SET');
  } catch (err) {
    logger.warn({ err }, 'Cache write failed — continuing without cache');
  }
}

/**
 * Invalidate cache for a specific investigation.
 */
export async function invalidateCache(type: string, target: string): Promise<void> {
  try {
    const redis = getRedis();
    const key = buildCacheKey(type, target);
    await redis.del(key);
    logger.debug({ key }, 'Cache INVALIDATED');
  } catch (err) {
    logger.warn({ err }, 'Cache invalidation failed');
  }
}

/**
 * Cache dashboard stats with a shorter TTL (5 min).
 */
export async function getCachedStats<T>(): Promise<T | null> {
  try {
    const redis = getRedis();
    const cached = await redis.get('stats:dashboard');
    return cached ? (JSON.parse(cached) as T) : null;
  } catch {
    return null;
  }
}

export async function setCachedStats<T>(data: T): Promise<void> {
  try {
    const redis = getRedis();
    await redis.setex('stats:dashboard', 300, JSON.stringify(data)); // 5 min
  } catch {
    // Non-critical
  }
}
