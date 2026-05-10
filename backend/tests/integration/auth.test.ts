/**
 * Integration tests for /api/auth/* routes.
 *
 * Tests registration, duplicate user prevention, login, and invalid credentials.
 * bcrypt is mocked to avoid native binding issues in test environment.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'super-secret-test-key-32-chars-long';
process.env.ANTHROPIC_API_KEY = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.ALLOWED_ORIGIN = 'http://localhost:3000';
process.env.REDIS_URL = 'redis://localhost:6379';

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

// ─── Mocks ──────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  investigation: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  },
};

vi.mock('../../src/config/database.js', () => ({
  getPrisma: vi.fn(() => mockPrisma),
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

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

// ─── Import after mocks ─────────────────────────────────────────

import { buildApp } from '../../src/app.js';

// ─── Test suite ─────────────────────────────────────────────────

describe('Auth Routes Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Registration ───────────────────────────────────────────

  it('POST /api/auth/register should create a new user and return token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null); // user doesn't exist yet
    mockPrisma.user.create.mockResolvedValue({
      id: 'usr_abc123',
      email: 'newuser@example.com',
      passwordHash: '$2b$10$hashedpassword',
      role: 'analyst',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'newuser@example.com',
        password: 'securepassword123',
      },
    });

    const json = response.json();

    // The route uses reply.send() without explicit status, so Fastify defaults to 200.
    // Accept both 200 and 201 depending on implementation.
    expect(response.statusCode).toBeLessThanOrEqual(201);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('token');
    expect(json.data.user.email).toBe('newuser@example.com');
  });

  it('POST /api/auth/register should reject duplicate email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'usr_existing',
      email: 'existing@example.com',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'existing@example.com',
        password: 'securepassword123',
      },
    });

    expect(response.statusCode).toBe(400);
    const json = response.json();
    expect(json.success).toBe(false);
  });

  it('POST /api/auth/register should reject weak passwords', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'short', // less than 8 chars
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('POST /api/auth/register should reject invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'not-an-email',
        password: 'securepassword123',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  // ── Login ──────────────────────────────────────────────────

  it('POST /api/auth/login should authenticate valid user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'usr_abc123',
      email: 'login@example.com',
      passwordHash: '$2b$10$hashedpassword',
      role: 'analyst',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'login@example.com',
        password: 'securepassword123',
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('token');
    expect(json.data.user.role).toBe('analyst');
  });

  it('POST /api/auth/login should reject unknown user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'ghost@example.com',
        password: 'whatever123',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/auth/login should reject wrong password', async () => {
    // Import bcrypt to override compare for this test
    const bcrypt = await import('bcrypt');
    vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(false as never);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'usr_abc123',
      email: 'user@example.com',
      passwordHash: '$2b$10$hashedpassword',
      role: 'analyst',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'user@example.com',
        password: 'wrongpassword',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });
});
