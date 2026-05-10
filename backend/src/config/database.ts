import { PrismaClient } from '@prisma/client';
import { getEnv } from './env.js';
import { logger } from '../utils/logger.js';

let _prisma: PrismaClient | null = null;

/**
 * Get or create the singleton Prisma client.
 */
export function getPrisma(): PrismaClient {
  if (_prisma) return _prisma;

  const env = getEnv();

  _prisma = new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });

  logger.info('Prisma: client initialized');
  return _prisma;
}

/**
 * Gracefully disconnect Prisma.
 */
export async function disconnectPrisma(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
    logger.info('Prisma: disconnected');
  }
}
