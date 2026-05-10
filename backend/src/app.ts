import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { getEnv } from './config/env.js';
import { getRedis } from './config/redis.js';
import { investigateRoutes } from './routes/investigate.js';
import { historyRoutes } from './routes/history.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { authRoutes } from './routes/auth.js';
import { debugRoutes } from './routes/debug.js';
import jwtPlugin from './plugins/jwt.js';
import { logger } from './utils/logger.js';
import { AppError } from './utils/errors.js';

/**
 * Build and configure the Fastify application.
 * All plugins, middleware, and routes are registered here.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const env = getEnv();

  const app = Fastify({
    logger: false, // We use our own Pino instance
    trustProxy: true,
    requestTimeout: 60_000,   // 60s — some OSINT calls are slow
    bodyLimit: 1_048_576,     // 1 MB
  });

  // ─── Security headers ───────────────────────────────────────
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  // ─── CORS ────────────────────────────────────────────────────
  await app.register(fastifyCors, {
    origin: env.NODE_ENV === 'development' 
      ? ['http://localhost:3000'] 
      : env.ALLOWED_ORIGIN.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });

  // ─── JWT Authentication ──────────────────────────────────────
  await app.register(jwtPlugin);

  // ─── Rate limiting ──────────────────────────────────────────
  await app.register(fastifyRateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    redis: getRedis(),
    keyGenerator: (request) => {
      return request.ip;
    },
    errorResponseBuilder: (_request, context) => ({
      success: false,
      data: null,
      cached: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Max ${context.max} requests per ${context.after}. Try again later.`,
      },
    }),
  });

  // ─── OpenAPI / Swagger ──────────────────────────────────────
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'NextOSINT API',
        description: 'AI-powered Open-Source Intelligence platform API',
        version: '1.0.0',
      },
      servers: [
        { url: `http://localhost:${env.PORT}`, description: 'Local development' },
      ],
      tags: [
        { name: 'investigate', description: 'OSINT investigation endpoints' },
        { name: 'history', description: 'Investigation history' },
        { name: 'dashboard', description: 'Dashboard statistics' },
      ],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // ─── Request logging ─────────────────────────────────────────
  app.addHook('onRequest', async (request) => {
    logger.info(
      { method: request.method, url: request.url, ip: request.ip },
      'Incoming request',
    );
  });

  app.addHook('onResponse', async (request, reply) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
      },
      'Request completed',
    );
  });

  // ─── Routes ──────────────────────────────────────────────────
  await app.register(authRoutes);
  await app.register(investigateRoutes);
  await app.register(historyRoutes);
  await app.register(dashboardRoutes);
  await app.register(debugRoutes);

  // ─── Health check ────────────────────────────────────────────
  app.get('/api/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['system'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
          },
        },
      },
    },
  }, async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  // ─── Global error handler ─────────────────────────────────────
  app.setErrorHandler((error: FastifyError, request, reply) => {
    // Handle known operational errors
    if (error instanceof AppError) {
      logger.warn(
        { err: error, url: request.url },
        `Operational error: ${error.message}`,
      );
      return reply.status(error.statusCode).send({
        success: false,
        data: null,
        cached: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    // Handle Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        data: null,
        cached: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    }

    // Unknown/programmer errors — log full stack
    logger.error(
      { err: error, url: request.url, method: request.method },
      'Unhandled error',
    );

    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      success: false,
      data: null,
      cached: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : error.message,
      },
    });
  });

  // ─── 404 handler ──────────────────────────────────────────────
  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      success: false,
      data: null,
      cached: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  return app;
}
