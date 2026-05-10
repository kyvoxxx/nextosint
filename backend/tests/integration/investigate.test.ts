/**
 * Integration tests for /api/investigate/* routes.
 *
 * These test the full Fastify lifecycle (plugins → middleware → handler → serialization)
 * with mocked aggregators, cache, database, and Redis to avoid real I/O.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'super-secret-test-key-32-chars-long';
process.env.ANTHROPIC_API_KEY = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.ALLOWED_ORIGIN = 'http://localhost:3000';
process.env.REDIS_URL = 'redis://localhost:6379';

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// ─── Mocks (must be hoisted before buildApp import) ─────────────

vi.mock('../../src/config/database.js', () => ({
  getPrisma: vi.fn().mockReturnValue({
    investigation: { create: vi.fn().mockResolvedValue({}), findUnique: vi.fn() },
    user: { create: vi.fn(), findUnique: vi.fn() },
  }),
  disconnectPrisma: vi.fn(),
}));

vi.mock('../../src/config/redis.js', () => ({
  getRedis: vi.fn().mockReturnValue(null),
  disconnectRedis: vi.fn(),
}));

vi.mock('../../src/services/cache.js', () => ({
  getCached: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue(undefined),
  invalidateCache: vi.fn().mockResolvedValue(undefined),
  getCachedStats: vi.fn().mockResolvedValue(null),
  setCachedStats: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/aggregator/email.aggregator.js', () => ({
  aggregateEmail: vi.fn(),
}));
vi.mock('../../src/services/aggregator/ip.aggregator.js', () => ({
  aggregateIp: vi.fn(),
}));
vi.mock('../../src/services/aggregator/domain.aggregator.js', () => ({
  aggregateDomain: vi.fn(),
}));
vi.mock('../../src/services/aggregator/url.aggregator.js', () => ({
  aggregateUrl: vi.fn(),
}));

// ─── Import after mocks ─────────────────────────────────────────

import { buildApp } from '../../src/app.js';
import * as emailAggregator from '../../src/services/aggregator/email.aggregator.js';
import * as ipAggregator from '../../src/services/aggregator/ip.aggregator.js';
import * as domainAggregator from '../../src/services/aggregator/domain.aggregator.js';
import * as urlAggregator from '../../src/services/aggregator/url.aggregator.js';

// ─── Test suite ─────────────────────────────────────────────────

describe('Investigate Routes Integration', () => {
  let app: FastifyInstance;
  let token: string;

  const mockReport = {
    sources: { haveibeenpwned: null, hunter: null },
    report: {
      score: 25,
      riskLevel: 'low' as const,
      summary: 'No significant threats found.',
      indicators: [],
      recommendations: ['Enable MFA'],
      tags: [],
    },
  };

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    token = app.jwt.sign({ id: 'usr_test', email: 'test@example.com', role: 'analyst' });
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Authentication ─────────────────────────────────────────

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/investigate/email',
      payload: { email: 'test@example.com' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  // ── Email investigation ────────────────────────────────────

  it('POST /api/investigate/email should return 200 with valid token', async () => {
    vi.mocked(emailAggregator.aggregateEmail).mockResolvedValue(mockReport as any);

    const response = await app.inject({
      method: 'POST',
      url: '/api/investigate/email',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'test@example.com' },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.cached).toBe(false);
    expect(json.data.type).toBe('email');
    expect(json.data.target).toBe('test@example.com');
    expect(json.data.report.score).toBe(25);
  });

  it('POST /api/investigate/email should reject invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/investigate/email',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'not-an-email' },
    });

    expect(response.statusCode).toBe(400);
  });

  // ── IP investigation ───────────────────────────────────────

  it('POST /api/investigate/ip should reject private IPs (SSRF prevention)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/investigate/ip',
      headers: { authorization: `Bearer ${token}` },
      payload: { ip: '192.168.1.1' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toContain('Private/reserved');
  });

  it('POST /api/investigate/ip should reject loopback IPs', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/investigate/ip',
      headers: { authorization: `Bearer ${token}` },
      payload: { ip: '127.0.0.1' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('POST /api/investigate/ip should return 200 for public IP', async () => {
    vi.mocked(ipAggregator.aggregateIp).mockResolvedValue(mockReport as any);

    const response = await app.inject({
      method: 'POST',
      url: '/api/investigate/ip',
      headers: { authorization: `Bearer ${token}` },
      payload: { ip: '8.8.8.8' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.target).toBe('8.8.8.8');
  });

  // ── Domain investigation ───────────────────────────────────

  it('POST /api/investigate/domain should return 200 for valid domain', async () => {
    vi.mocked(domainAggregator.aggregateDomain).mockResolvedValue(mockReport as any);

    const response = await app.inject({
      method: 'POST',
      url: '/api/investigate/domain',
      headers: { authorization: `Bearer ${token}` },
      payload: { domain: 'example.com' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);
  });

  it('POST /api/investigate/domain should reject invalid domain', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/investigate/domain',
      headers: { authorization: `Bearer ${token}` },
      payload: { domain: 'not a domain!!!' },
    });

    expect(response.statusCode).toBe(400);
  });

  // ── URL investigation ──────────────────────────────────────

  it('POST /api/investigate/url should reject localhost URLs (SSRF prevention)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/investigate/url',
      headers: { authorization: `Bearer ${token}` },
      payload: { url: 'http://localhost:3000/admin' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toContain('private/local');
  });

  it('POST /api/investigate/url should reject private IP URLs', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/investigate/url',
      headers: { authorization: `Bearer ${token}` },
      payload: { url: 'http://192.168.1.1/admin' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('POST /api/investigate/url should return 200 for valid URL', async () => {
    vi.mocked(urlAggregator.aggregateUrl).mockResolvedValue(mockReport as any);

    const response = await app.inject({
      method: 'POST',
      url: '/api/investigate/url',
      headers: { authorization: `Bearer ${token}` },
      payload: { url: 'https://example.com/page' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.type).toBe('url');
  });

  // ── Health check ───────────────────────────────────────────

  it('GET /api/health should return healthy status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('healthy');
  });

  // ── 404 handler ────────────────────────────────────────────

  it('should return 404 for unknown routes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/nonexistent',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });
});
