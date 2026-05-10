import { getEnv } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { IpInfoResult } from '../../../../shared/types/investigation.js';

const IPINFO_BASE = 'https://ipinfo.io';

/**
 * Query IPInfo for geolocation and ASN data for an IP address.
 * Returns null if the token is missing or the request fails.
 *
 * API docs: https://ipinfo.io/developers
 * Free tier: 50k requests/month
 */
export async function queryIpInfo(ip: string): Promise<IpInfoResult | null> {
  const env = getEnv();

  if (!env.IPINFO_TOKEN) {
    logger.warn('IPInfo: token not configured — skipping geolocation');
    return null;
  }

  try {
    const res = await fetch(`${IPINFO_BASE}/${encodeURIComponent(ip)}?token=${env.IPINFO_TOKEN}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401) {
      logger.error('IPInfo: Invalid token (401)');
      return null;
    }

    if (res.status === 429) {
      logger.warn('IPInfo: Rate limited (429)');
      return null;
    }

    if (!res.ok) {
      logger.warn({ status: res.status }, 'IPInfo: unexpected status');
      return null;
    }

    const data = (await res.json()) as Record<string, unknown>;

    return {
      ip: String(data.ip ?? ip),
      hostname: data.hostname ? String(data.hostname) : undefined,
      city: String(data.city ?? 'Unknown'),
      region: String(data.region ?? 'Unknown'),
      country: String(data.country ?? 'Unknown'),
      loc: String(data.loc ?? '0,0'),
      org: String(data.org ?? 'Unknown'),
      postal: data.postal ? String(data.postal) : undefined,
      timezone: data.timezone ? String(data.timezone) : undefined,
    };
  } catch (err) {
    logger.error({ err, ip }, 'IPInfo: request failed');
    return null;
  }
}
