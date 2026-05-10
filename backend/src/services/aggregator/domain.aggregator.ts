import { queryCrtSh } from '../sources/crtsh.js';
import { queryDns } from '../sources/dns.resolver.js';
import { queryVtDomain } from '../sources/virustotal.js';
import { queryWhois } from '../sources/whois.js';
import { analyzeWithClaude } from '../ai/claude.client.js';
import { DOMAIN_SYSTEM_PROMPT } from '../ai/prompts/domain.prompt.js';
import { logger } from '../../utils/logger.js';
import type { DomainSources } from '../../../../shared/types/investigation.js';
import type { AiReport } from '../../../../shared/types/ai-report.js';

/**
 * Domain investigation aggregator.
 *
 * 1. Fetches from crt.sh, DNS, VirusTotal, WHOIS in parallel
 * 2. Sends aggregated data to Claude for attack surface analysis
 * 3. Returns sources + AI report
 */
export async function aggregateDomain(domain: string): Promise<{
  sources: DomainSources;
  report: AiReport;
}> {
  logger.info({ domain }, 'Domain aggregator: starting investigation');

  const [crtResult, dnsResult, vtResult, whoisResult] = await Promise.allSettled([
    queryCrtSh(domain),
    queryDns(domain),
    queryVtDomain(domain),
    queryWhois(domain),
  ]);

  const sources: DomainSources = {
    crtsh: crtResult.status === 'fulfilled' ? crtResult.value : null,
    dns: dnsResult.status === 'fulfilled' ? dnsResult.value : null,
    virustotal: vtResult.status === 'fulfilled' ? vtResult.value : null,
    whois: whoisResult.status === 'fulfilled' ? whoisResult.value : null,
  };

  const unavailable: string[] = [];
  if (!sources.crtsh) unavailable.push('crt.sh (certificate transparency)');
  if (!sources.dns) unavailable.push('DNS resolver');
  if (!sources.virustotal) unavailable.push('VirusTotal (domain reputation)');
  if (!sources.whois) unavailable.push('WHOIS (registration data)');

  const userData = formatDomainData(domain, sources);
  const aiResponse = await analyzeWithClaude(DOMAIN_SYSTEM_PROMPT, userData, unavailable);

  logger.info(
    { domain, riskLevel: aiResponse.report.riskLevel, score: aiResponse.report.score },
    'Domain aggregator: investigation complete',
  );

  return { sources, report: aiResponse.report };
}

function formatDomainData(domain: string, sources: DomainSources): string {
  const sections: string[] = [`# Domain Investigation: ${domain}\n`];

  if (sources.crtsh) {
    const certs = sources.crtsh;
    const uniqueSubdomains = new Set(certs.map((c) => c.commonName));
    sections.push(`## Certificate Transparency (crt.sh)`);
    sections.push(`- Total certificates found: ${certs.length}`);
    sections.push(`- Unique subdomains: ${uniqueSubdomains.size}`);

    if (uniqueSubdomains.size > 0) {
      sections.push('\n### Subdomains discovered:');
      const sorted = [...uniqueSubdomains].sort();
      for (const sub of sorted.slice(0, 30)) {
        sections.push(`- ${sub}`);
      }
      if (sorted.length > 30) {
        sections.push(`- ... and ${sorted.length - 30} more subdomains`);
      }
    }

    // Show recent certificate timeline
    const recent = certs.slice(0, 5);
    if (recent.length > 0) {
      sections.push('\n### Recent certificates:');
      for (const cert of recent) {
        sections.push(
          `- ${cert.commonName}: issued ${cert.notBefore}, expires ${cert.notAfter} (by ${cert.issuerName.slice(0, 60)})`,
        );
      }
    }
  }

  if (sources.dns) {
    const d = sources.dns;
    sections.push(`\n## DNS Records`);
    if (d.a.length > 0) sections.push(`- A records: ${d.a.join(', ')}`);
    if (d.aaaa.length > 0) sections.push(`- AAAA records: ${d.aaaa.join(', ')}`);
    if (d.mx.length > 0) {
      sections.push(`- MX records: ${d.mx.map((r) => `${r.exchange} (pri: ${r.priority})`).join(', ')}`);
    }
    if (d.ns.length > 0) sections.push(`- NS records: ${d.ns.join(', ')}`);
    if (d.cname.length > 0) sections.push(`- CNAME records: ${d.cname.join(', ')}`);
    if (d.txt.length > 0) {
      sections.push('- TXT records:');
      for (const txt of d.txt.slice(0, 10)) {
        sections.push(`  - ${txt.slice(0, 200)}`);
      }
    }
    if (d.soa) {
      sections.push(`- SOA: ${d.soa.nsname} (hostmaster: ${d.soa.hostmaster})`);
    }
  }

  if (sources.virustotal) {
    const v = sources.virustotal;
    sections.push(`\n## Reputation (VirusTotal)`);
    sections.push(`- Malicious: ${v.stats.malicious} vendors`);
    sections.push(`- Suspicious: ${v.stats.suspicious} vendors`);
    sections.push(`- Harmless: ${v.stats.harmless} vendors`);
    sections.push(`- Undetected: ${v.stats.undetected} vendors`);
    if (v.categories && Object.keys(v.categories).length > 0) {
      sections.push(`- Categories: ${Object.values(v.categories).join(', ')}`);
    }
  }

  if (sources.whois) {
    const w = sources.whois;
    sections.push(`\n## WHOIS Registration`);
    sections.push(`- Domain: ${w.domainName}`);
    sections.push(`- Registrar: ${w.registrar}`);
    sections.push(`- Created: ${w.creationDate}`);
    sections.push(`- Expires: ${w.expirationDate}`);
    sections.push(`- Updated: ${w.updatedDate}`);
    if (w.nameServers.length > 0) {
      sections.push(`- Name Servers: ${w.nameServers.join(', ')}`);
    }
    if (w.registrantOrganization) {
      sections.push(`- Registrant Org: ${w.registrantOrganization}`);
    }
    if (w.registrantCountry) {
      sections.push(`- Registrant Country: ${w.registrantCountry}`);
    }
    if (w.status.length > 0) {
      sections.push(`- Status: ${w.status.join(', ')}`);
    }
  }

  return sections.join('\n');
}
