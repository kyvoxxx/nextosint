import { getEnv } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { HibpBreach, HibpResult } from '../../../../shared/types/investigation.js';

const HIBP_BASE = 'https://haveibeenpwned.com/api/v3';
const USER_AGENT = 'NextOSINT-Platform';

/**
 * Query HaveIBeenPwned for breaches associated with an email address.
 * Returns null if the API key is missing or the request fails.
 *
 * API docs: https://haveibeenpwned.com/API/v3
 * Rate limit: 1 req / 1.5s on free tier (we cache to stay within)
 */
export async function queryHibp(email: string): Promise<HibpResult | null> {
  const env = getEnv();

  if (!env.HIBP_API_KEY) {
    logger.warn('HIBP: API key not configured — skipping breach check');
    return null;
  }

  try {
    // Fetch breaches
    const breachRes = await fetch(
      `${HIBP_BASE}/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      {
        headers: {
          'hibp-api-key': env.HIBP_API_KEY,
          'user-agent': USER_AGENT,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      },
    );

    let breaches: HibpBreach[] = [];

    if (breachRes.status === 200) {
      breaches = (await breachRes.json()) as HibpBreach[];
    } else if (breachRes.status === 404) {
      // No breaches found — that's a valid result
      breaches = [];
    } else if (breachRes.status === 401) {
      logger.error('HIBP: Invalid API key (401)');
      return null;
    } else if (breachRes.status === 429) {
      logger.warn('HIBP: Rate limited (429)');
      return null;
    } else {
      logger.warn({ status: breachRes.status }, 'HIBP: unexpected status for breaches');
      return null;
    }

    // Fetch paste count (separate endpoint)
    let pasteCount = 0;
    try {
      const pasteRes = await fetch(
        `${HIBP_BASE}/pasteaccount/${encodeURIComponent(email)}`,
        {
          headers: {
            'hibp-api-key': env.HIBP_API_KEY,
            'user-agent': USER_AGENT,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(10_000),
        },
      );

      if (pasteRes.status === 200) {
        const pastes = (await pasteRes.json()) as unknown[];
        pasteCount = pastes.length;
      }
    } catch (pasteErr) {
      logger.warn({ err: pasteErr }, 'HIBP: paste lookup failed (non-critical)');
    }

    return {
      breachCount: breaches.length,
      breaches,
      pasteCount,
    };
  } catch (err) {
    logger.error({ err, email }, 'HIBP: request failed');
    return null;
  }
}
