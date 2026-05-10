import { getEnv } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { HunterResult } from '../../../../shared/types/investigation.js';

const HUNTER_BASE = 'https://api.hunter.io/v2';

/**
 * Query Hunter.io for email verification and context.
 * Returns null if the API key is missing or the request fails.
 *
 * API docs: https://hunter.io/api-documentation/v2
 * Free tier: 25 requests/month
 */
export async function queryHunter(email: string): Promise<HunterResult | null> {
  const env = getEnv();

  if (!env.HUNTER_API_KEY) {
    logger.warn('Hunter.io: API key not configured — skipping email context');
    return null;
  }

  try {
    const url = new URL(`${HUNTER_BASE}/email-verifier`);
    url.searchParams.set('email', email);
    url.searchParams.set('api_key', env.HUNTER_API_KEY);

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401) {
      logger.error('Hunter.io: Invalid API key (401)');
      return null;
    }

    if (res.status === 429) {
      logger.warn('Hunter.io: Rate limited (429)');
      return null;
    }

    if (!res.ok) {
      logger.warn({ status: res.status }, 'Hunter.io: unexpected status');
      return null;
    }

    const body = (await res.json()) as { data: Record<string, unknown> };
    const d = body.data;

    return {
      email: String(d.email ?? email),
      score: Number(d.score ?? 0),
      smtp_server: Boolean(d.smtp_server),
      smtp_check: Boolean(d.smtp_check),
      sources: Number(d.sources ?? 0),
      domain: String(d.domain ?? ''),
      first_name: d.first_name ? String(d.first_name) : null,
      last_name: d.last_name ? String(d.last_name) : null,
      position: d.position ? String(d.position) : null,
      company: d.company ? String(d.company) : null,
    };
  } catch (err) {
    logger.error({ err, email }, 'Hunter.io: request failed');
    return null;
  }
}
