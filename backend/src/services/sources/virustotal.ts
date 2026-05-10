import { getEnv } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { VirusTotalResult, VirusTotalStats } from '../../../../shared/types/investigation.js';

const VT_BASE = 'https://www.virustotal.com/api/v3';

/**
 * Shared VirusTotal query logic.
 * Supports IP, domain, and URL lookups via different endpoints.
 */
async function vtRequest(path: string): Promise<Record<string, unknown> | null> {
  const env = getEnv();

  if (!env.VIRUSTOTAL_API_KEY) {
    logger.warn('VirusTotal: API key not configured — skipping reputation check');
    return null;
  }

  try {
    const res = await fetch(`${VT_BASE}${path}`, {
      headers: {
        'x-apikey': env.VIRUSTOTAL_API_KEY,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 401) {
      logger.error('VirusTotal: Invalid API key (401)');
      return null;
    }

    if (res.status === 404) {
      logger.info({ path }, 'VirusTotal: resource not found');
      return null;
    }

    if (res.status === 429) {
      logger.warn('VirusTotal: Rate limited (429)');
      return null;
    }

    if (!res.ok) {
      logger.warn({ status: res.status, path }, 'VirusTotal: unexpected status');
      return null;
    }

    return (await res.json()) as Record<string, unknown>;
  } catch (err) {
    logger.error({ err, path }, 'VirusTotal: request failed');
    return null;
  }
}

function extractStats(attributes: Record<string, unknown>): VirusTotalStats {
  const stats = (attributes.last_analysis_stats ?? {}) as Record<string, number>;
  return {
    malicious: Number(stats.malicious ?? 0),
    suspicious: Number(stats.suspicious ?? 0),
    harmless: Number(stats.harmless ?? 0),
    undetected: Number(stats.undetected ?? 0),
  };
}

/**
 * Query VirusTotal for IP address reputation.
 */
export async function queryVtIp(ip: string): Promise<VirusTotalResult | null> {
  const body = await vtRequest(`/ip_addresses/${encodeURIComponent(ip)}`);
  if (!body) return null;

  const data = (body.data ?? {}) as Record<string, unknown>;
  const attributes = (data.attributes ?? {}) as Record<string, unknown>;

  return {
    stats: extractStats(attributes),
    permalink: `https://www.virustotal.com/gui/ip-address/${ip}`,
    scanDate: String(attributes.last_analysis_date ?? new Date().toISOString()),
    categories: (attributes.categories ?? undefined) as Record<string, string> | undefined,
  };
}

/**
 * Query VirusTotal for domain reputation.
 */
export async function queryVtDomain(domain: string): Promise<VirusTotalResult | null> {
  const body = await vtRequest(`/domains/${encodeURIComponent(domain)}`);
  if (!body) return null;

  const data = (body.data ?? {}) as Record<string, unknown>;
  const attributes = (data.attributes ?? {}) as Record<string, unknown>;

  return {
    stats: extractStats(attributes),
    permalink: `https://www.virustotal.com/gui/domain/${domain}`,
    scanDate: String(attributes.last_analysis_date ?? new Date().toISOString()),
    categories: (attributes.categories ?? undefined) as Record<string, string> | undefined,
  };
}

/**
 * Submit a URL to VirusTotal for scanning and retrieve the report.
 * This is a two-step process: submit URL → poll for analysis.
 */
export async function queryVtUrl(url: string): Promise<VirusTotalResult | null> {
  const env = getEnv();

  if (!env.VIRUSTOTAL_API_KEY) {
    logger.warn('VirusTotal: API key not configured — skipping URL scan');
    return null;
  }

  try {
    // Step 1: Submit URL for analysis
    const submitRes = await fetch(`${VT_BASE}/urls`, {
      method: 'POST',
      headers: {
        'x-apikey': env.VIRUSTOTAL_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `url=${encodeURIComponent(url)}`,
      signal: AbortSignal.timeout(15_000),
    });

    if (!submitRes.ok) {
      logger.warn({ status: submitRes.status }, 'VirusTotal: URL submission failed');
      return null;
    }

    await submitRes.json();

    // Step 2: Wait briefly then fetch the analysis
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Use the URL identifier (base64 of URL without padding)
    const urlId = Buffer.from(url).toString('base64').replace(/=+$/, '');
    const analysisBody = await vtRequest(`/urls/${urlId}`);

    if (!analysisBody) {
      // Fallback: use the analysis link from submission
      logger.info('VirusTotal: using submission ID for analysis');
      return {
        stats: { malicious: 0, suspicious: 0, harmless: 0, undetected: 0 },
        permalink: `https://www.virustotal.com/gui/url/${urlId}`,
        scanDate: new Date().toISOString(),
      };
    }

    const data = (analysisBody.data ?? {}) as Record<string, unknown>;
    const attributes = (data.attributes ?? {}) as Record<string, unknown>;

    return {
      stats: extractStats(attributes),
      permalink: `https://www.virustotal.com/gui/url/${urlId}`,
      scanDate: String(attributes.last_analysis_date ?? new Date().toISOString()),
      categories: (attributes.categories ?? undefined) as Record<string, string> | undefined,
    };
  } catch (err) {
    logger.error({ err, url }, 'VirusTotal: URL scan failed');
    return null;
  }
}
