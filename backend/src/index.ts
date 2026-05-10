import { loadEnv } from './config/env.js';
import { buildApp } from './app.js';
import { disconnectRedis } from './config/redis.js';
import { disconnectPrisma } from './config/database.js';
import { logger } from './utils/logger.js';

/**
 * Server entry point.
 *
 * 1. Validates environment variables
 * 2. Builds the Fastify application
 * 3. Starts listening
 * 4. Handles graceful shutdown (SIGINT, SIGTERM)
 */
async function main(): Promise<void> {
  // Step 1: Validate environment
  const env = loadEnv();
  logger.info({ nodeEnv: env.NODE_ENV }, 'Environment validated');

  // Step 2: Build the application
  const app = await buildApp();
  logger.info('Application built successfully');

  // Step 3: Start listening
  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    logger.info(`
╔══════════════════════════════════════════╗
║        NextOSINT API Server              ║
║──────────────────────────────────────────║
║  Address:  ${address.padEnd(28)}║
║  Docs:     ${(`${address}/docs`).padEnd(28)}║
║  Env:      ${env.NODE_ENV.padEnd(28)}║
╚══════════════════════════════════════════╝
    `);
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }

  // Step 4: Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');

    try {
      await app.close();
      logger.info('Fastify server closed');

      await disconnectRedis();
      await disconnectPrisma();

      logger.info('All connections closed. Goodbye.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Catch unhandled rejections
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception — shutting down');
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
