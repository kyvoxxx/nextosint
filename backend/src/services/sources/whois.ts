import { logger } from '../../utils/logger.js';
import type { WhoisResult } from '../../../../shared/types/investigation.js';

/**
 * Query WHOIS data for a domain.
 * Uses the whois-json npm package for parsing.
 * No API key required.
 */
export async function queryWhois(domain: string): Promise<WhoisResult | null> {
  try {
    // Dynamic import since whois-json uses CommonJS
    const whoisJson = await import('whois-json');
    const whoisLookup = whoisJson.default ?? whoisJson;

    const raw = await whoisLookup(domain);

    if (!raw || (Array.isArray(raw) && raw.length === 0)) {
      logger.info({ domain }, 'WHOIS: no data found');
      return null;
    }

    // whois-json can return an array or single object
    const data: Record<string, unknown> = (Array.isArray(raw) ? raw[0] ?? {} : raw) as Record<string, unknown>;

    // Normalize dates — WHOIS dates come in many formats
    const parseDate = (val: unknown): string => {
      if (!val) return '';
      const str = String(val);
      try {
        return new Date(str).toISOString();
      } catch {
        return str;
      }
    };

    // Normalize name servers
    const parseNameServers = (val: unknown): string[] => {
      if (Array.isArray(val)) return val.map(String);
      if (typeof val === 'string') {
        return val
          .split(/[\s,]+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
      }
      return [];
    };

    // Normalize status
    const parseStatus = (val: unknown): string[] => {
      if (Array.isArray(val)) return val.map(String);
      if (typeof val === 'string') return val.split(/[\s,]+/).filter(Boolean);
      return [];
    };

    return {
      domainName: String(data.domainName ?? data.domain_name ?? domain).toLowerCase(),
      registrar: String(data.registrar ?? 'Unknown'),
      creationDate: parseDate(data.creationDate ?? data.creation_date ?? data.created),
      expirationDate: parseDate(
        data.registrarRegistrationExpirationDate ??
          data.expiration_date ??
          data.expirationDate ??
          data.expires,
      ),
      updatedDate: parseDate(data.updatedDate ?? data.updated_date ?? data.updated),
      nameServers: parseNameServers(data.nameServer ?? data.name_server ?? data.nameServers),
      status: parseStatus(data.domainStatus ?? data.status),
      registrantOrganization: data.registrantOrganization
        ? String(data.registrantOrganization)
        : undefined,
      registrantCountry: data.registrantCountry ? String(data.registrantCountry) : undefined,
    };
  } catch (err) {
    logger.error({ err, domain }, 'WHOIS: lookup failed');
    return null;
  }
}
