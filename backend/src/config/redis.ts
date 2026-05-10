import Redis from 'ioredis';
import { getEnv } from './env.js';
import { logger } from '../utils/logger.js';

let _redis: Redis | null = null;

/**
 * Get or create the singleton Redis client.
 * Lazily connects — the first call triggers connection.
 */
export function getRedis(): Redis {
  if (_redis) return _redis;

  const env = getEnv();
  _redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > 5) {
        logger.error('Redis: max retries reached, giving up');
        return null; // stop retrying
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: false,
  });

  _redis.on('connect', () => {
    logger.info('Redis: connected');
  });

  _redis.on('error', (err: Error) => {
    logger.error({ err }, 'Redis: connection error');
  });

  return _redis;
}

/**
 * Gracefully disconnect Redis.
 */
export async function disconnectRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
    logger.info('Redis: disconnected');
  }
}
