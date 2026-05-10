import { getEnv } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { AbuseIpDbResult } from '../../../../shared/types/investigation.js';

const ABUSEIPDB_BASE = 'https://api.abuseipdb.com/api/v2';

/**
 * Query AbuseIPDB for IP abuse confidence scoring.
 * Returns null if the API key is missing or the request fails.
 *
 * API docs: https://docs.abuseipdb.com/
 * Free tier: 1000 checks/day
 */
export async function queryAbuseIpDb(ip: string): Promise<AbuseIpDbResult | null> {
  const env = getEnv();

  if (!env.ABUSEIPDB_API_KEY) {
    logger.warn('AbuseIPDB: API key not configured — skipping abuse check');
    return null;
  }

  try {
    const url = new URL(`${ABUSEIPDB_BASE}/check`);
    url.searchParams.set('ipAddress', ip);
    url.searchParams.set('maxAgeInDays', '90');
    url.searchParams.set('verbose', 'true');

    const res = await fetch(url.toString(), {
      headers: {
        Key: env.ABUSEIPDB_API_KEY,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401) {
      logger.error('AbuseIPDB: Invalid API key (401)');
      return null;
    }

    if (res.status === 429) {
      logger.warn('AbuseIPDB: Rate limited (429)');
      return null;
    }

    if (!res.ok) {
      logger.warn({ status: res.status }, 'AbuseIPDB: unexpected status');
      return null;
    }

    const body = (await res.json()) as { data: Record<string, unknown> };
    const d = body.data;

    return {
      abuseConfidenceScore: Number(d.abuseConfidenceScore ?? 0),
      totalReports: Number(d.totalReports ?? 0),
      lastReportedAt: d.lastReportedAt ? String(d.lastReportedAt) : null,
      isWhitelisted: Boolean(d.isWhitelisted),
      countryCode: String(d.countryCode ?? 'XX'),
      isp: String(d.isp ?? 'Unknown'),
      domain: String(d.domain ?? ''),
      usageType: String(d.usageType ?? 'Unknown'),
    };
  } catch (err) {
    logger.error({ err, ip }, 'AbuseIPDB: request failed');
    return null;
  }
}
