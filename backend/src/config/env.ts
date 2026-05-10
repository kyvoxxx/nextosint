import { z } from 'zod';

/**
 * Environment variable schema with Zod validation.
 * The server will refuse to start if any required variable is missing.
 * Optional keys (OSINT APIs) enable graceful degradation.
 */
const envSchema = z.object({
  // ─── Server ────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // ─── CORS ──────────────────────────────────────────────────
  ALLOWED_ORIGIN: z.string().default('http://localhost:3000'),

  // ─── Database ──────────────────────────────────────────────
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // ─── Redis ─────────────────────────────────────────────────
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(900), // 15 minutes

  // ─── Auth (JWT) ────────────────────────────────────────────
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // ─── AI — Anthropic Claude ─────────────────────────────────
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required for AI synthesis'),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-20250514'),

  // ─── OSINT API Keys (all optional — graceful degradation) ──
  HIBP_API_KEY: z.string().optional(),
  SHODAN_API_KEY: z.string().optional(),
  VIRUSTOTAL_API_KEY: z.string().optional(),
  IPINFO_TOKEN: z.string().optional(),
  ABUSEIPDB_API_KEY: z.string().optional(),
  HUNTER_API_KEY: z.string().optional(),
  GOOGLE_SAFE_BROWSING_KEY: z.string().optional(),

  // ─── Rate Limiting ─────────────────────────────────────────
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000), // 1 minute
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Parse and validate environment variables.
 * Throws a detailed error listing all invalid/missing vars on failure.
 */
export function loadEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error(`\n❌ Invalid environment variables:\n${formatted}\n`);
    process.exit(1);
  }

  _env = result.data;
  return _env;
}

/**
 * Get the validated environment. Must call `loadEnv()` first.
 */
export function getEnv(): Env {
  if (!_env) {
    return loadEnv();
  }
  return _env;
}

/**
 * Check which optional OSINT sources are configured.
 * Used by aggregators to skip unavailable sources.
 */
export function getAvailableSources(env: Env): Record<string, boolean> {
  return {
    haveibeenpwned: !!env.HIBP_API_KEY,
    shodan: !!env.SHODAN_API_KEY,
    virustotal: !!env.VIRUSTOTAL_API_KEY,
    ipinfo: !!env.IPINFO_TOKEN,
    abuseipdb: !!env.ABUSEIPDB_API_KEY,
    hunter: !!env.HUNTER_API_KEY,
    crtsh: true,    // No API key required
    dns: true,      // Native Node.js
    whois: true,    // No API key required
  };
}
