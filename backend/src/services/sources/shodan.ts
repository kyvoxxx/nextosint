import { getEnv } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { ShodanResult, ShodanService } from '../../../../shared/types/investigation.js';

const SHODAN_BASE = 'https://api.shodan.io';

/**
 * Query Shodan for open ports, services, and vulnerabilities on an IP.
 * Returns null if the API key is missing or the request fails.
 *
 * API docs: https://developer.shodan.io/api
 * Free tier: limited to /shodan/host/{ip}
 */
export async function queryShodan(ip: string): Promise<ShodanResult | null> {
  const env = getEnv();

  if (!env.SHODAN_API_KEY) {
    logger.warn('Shodan: API key not configured — skipping port scan');
    return null;
  }

  try {
    const url = new URL(`${SHODAN_BASE}/shodan/host/${encodeURIComponent(ip)}`);
    url.searchParams.set('key', env.SHODAN_API_KEY);

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 401) {
      logger.error('Shodan: Invalid API key (401)');
      return null;
    }

    if (res.status === 404) {
      logger.info({ ip }, 'Shodan: no results found for IP');
      return {
        ports: [],
        vulns: [],
        os: null,
        hostnames: [],
        isp: 'Unknown',
        org: 'Unknown',
        lastUpdate: new Date().toISOString(),
        services: [],
      };
    }

    if (res.status === 429) {
      logger.warn('Shodan: Rate limited (429)');
      return null;
    }

    if (!res.ok) {
      logger.warn({ status: res.status }, 'Shodan: unexpected status');
      return null;
    }

    const data = (await res.json()) as Record<string, unknown>;

    // Extract services from the `data` array
    const rawServices = Array.isArray(data.data) ? (data.data as Record<string, unknown>[]) : [];
    const services: ShodanService[] = rawServices.map((svc) => ({
      port: Number(svc.port ?? 0),
      transport: String(svc.transport ?? 'tcp'),
      product: svc.product ? String(svc.product) : null,
      version: svc.version ? String(svc.version) : null,
      banner: svc.data ? String(svc.data).slice(0, 500) : undefined,
    }));

    return {
      ports: Array.isArray(data.ports) ? (data.ports as number[]) : [],
      vulns: Array.isArray(data.vulns) ? (data.vulns as string[]) : [],
      os: data.os ? String(data.os) : null,
      hostnames: Array.isArray(data.hostnames) ? (data.hostnames as string[]) : [],
      isp: String(data.isp ?? 'Unknown'),
      org: String(data.org ?? 'Unknown'),
      lastUpdate: String(data.last_update ?? new Date().toISOString()),
      services,
    };
  } catch (err) {
    logger.error({ err, ip }, 'Shodan: request failed');
    return null;
  }
}
