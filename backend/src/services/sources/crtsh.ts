import { logger } from '../../utils/logger.js';
import type { CrtShEntry } from '../../../../shared/types/investigation.js';

const CRTSH_BASE = 'https://crt.sh';

/**
 * Query crt.sh Certificate Transparency logs for subdomains of a domain.
 * No API key required — this is a free public service.
 *
 * Returns deduplicated subdomain entries with certificate metadata.
 */
export async function queryCrtSh(domain: string): Promise<CrtShEntry[] | null> {
  try {
    const url = new URL(CRTSH_BASE);
    url.searchParams.set('q', `%.${domain}`);
    url.searchParams.set('output', 'json');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000), // crt.sh can be slow
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'crt.sh: unexpected status');
      return null;
    }

    const raw = (await res.json()) as Record<string, unknown>[];

    if (!Array.isArray(raw) || raw.length === 0) {
      return [];
    }

    // Deduplicate by common_name + not_before combination
    const seen = new Set<string>();
    const entries: CrtShEntry[] = [];

    for (const item of raw) {
      const commonName = String(item.common_name ?? '').toLowerCase();
      const nameValue = String(item.name_value ?? '').toLowerCase();
      const notBefore = String(item.not_before ?? '');
      const dedupeKey = `${commonName}:${notBefore}`;

      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      entries.push({
        issuerCaId: Number(item.issuer_ca_id ?? 0),
        issuerName: String(item.issuer_name ?? 'Unknown'),
        commonName,
        nameValue,
        notBefore,
        notAfter: String(item.not_after ?? ''),
        serialNumber: String(item.serial_number ?? ''),
      });
    }

    // Sort by date descending, limit to 100 most recent
    entries.sort((a, b) => new Date(b.notBefore).getTime() - new Date(a.notBefore).getTime());

    return entries.slice(0, 100);
  } catch (err) {
    logger.error({ err, domain }, 'crt.sh: request failed');
    return null;
  }
}
