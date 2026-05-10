import { promises as dns } from 'node:dns';
import { logger } from '../../utils/logger.js';
import type { DnsResult } from '../../../../shared/types/investigation.js';

/**
 * Resolve DNS records for a domain using Node.js built-in dns module.
 * No API key required.
 *
 * Queries A, AAAA, MX, NS, TXT, CNAME, and SOA records in parallel.
 * Individual record type failures are silently ignored (return empty arrays).
 */
export async function queryDns(domain: string): Promise<DnsResult | null> {
  try {
    const [a, aaaa, mx, ns, txt, cname, soa] = await Promise.allSettled([
      dns.resolve4(domain),
      dns.resolve6(domain),
      dns.resolveMx(domain),
      dns.resolveNs(domain),
      dns.resolveTxt(domain),
      dns.resolveCname(domain),
      dns.resolveSoa(domain),
    ]);

    return {
      a: a.status === 'fulfilled' ? a.value : [],
      aaaa: aaaa.status === 'fulfilled' ? aaaa.value : [],
      mx:
        mx.status === 'fulfilled'
          ? mx.value.map((r) => ({ priority: r.priority, exchange: r.exchange }))
          : [],
      ns: ns.status === 'fulfilled' ? ns.value : [],
      txt: txt.status === 'fulfilled' ? txt.value.map((arr) => arr.join('')) : [],
      cname: cname.status === 'fulfilled' ? cname.value : [],
      soa:
        soa.status === 'fulfilled'
          ? {
              nsname: soa.value.nsname,
              hostmaster: soa.value.hostmaster,
              serial: soa.value.serial,
            }
          : null,
    };
  } catch (err) {
    logger.error({ err, domain }, 'DNS: resolution failed');
    return null;
  }
}
