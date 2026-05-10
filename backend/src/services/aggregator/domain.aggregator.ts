import { analyzeWithClaude } from '../ai/claude.client.js';
import { DOMAIN_SYSTEM_PROMPT } from '../ai/prompts/domain.prompt.js';
import { logger } from '../../utils/logger.js';
import type { AiReport } from '../../../../shared/types/ai-report.js';
import {
  queryCrtsh,
  resolveAllDns,
  queryHackerTargetDns,
  queryUrlScanSearchDomain,
  queryVtDomain,
} from '../sources/domain.free.js';

export async function aggregateDomain(domain: string): Promise<{ sources: any; report: AiReport }> {
  logger.info({ domain }, 'Domain aggregator: starting investigation (Free APIs)');

  const [crtshResult, dnsResult, htResult, urlscanResult, vtResult] = await Promise.allSettled([
    queryCrtsh(domain),
    resolveAllDns(domain),
    queryHackerTargetDns(domain),
    queryUrlScanSearchDomain(domain),
    queryVtDomain(domain),
  ]);

  const sources = {
    crtsh: crtshResult.status === 'fulfilled' ? crtshResult.value : null,
    dns: dnsResult.status === 'fulfilled' ? dnsResult.value : null,
    hackerTarget: htResult.status === 'fulfilled' ? htResult.value : null,
    urlscan: urlscanResult.status === 'fulfilled' ? urlscanResult.value : null,
    virusTotal: vtResult.status === 'fulfilled' ? vtResult.value : null,
  };

  const unavailable: string[] = [];
  if (!sources.crtsh) unavailable.push('crt.sh (Certificate Data)');
  if (!sources.dns) unavailable.push('Node.js DNS Resolver');
  if (!sources.hackerTarget) unavailable.push('HackerTarget DNS');
  if (!sources.urlscan) unavailable.push('URLScan.io Search');
  if (!sources.virusTotal) unavailable.push('VirusTotal Domain');

  if (
    !sources.crtsh &&
    !sources.dns &&
    !sources.hackerTarget &&
    !sources.urlscan &&
    !sources.virusTotal
  ) {
    logger.warn({ domain }, 'All domain sources failed (graceful degradation)');
    return {
      sources,
      report: {
        riskLevel: 'unknown',
        score: 0,
        summary: 'No data sources available at this time. Network error or rate limits reached.',
        indicators: [],
        recommendations: ['Retry investigation later'],
        tags: ['no-data'],
      },
    };
  }

  const userData = formatDomainData(domain, sources);
  const aiResponse = await analyzeWithClaude(DOMAIN_SYSTEM_PROMPT, userData, unavailable);

  return { sources, report: aiResponse.report };
}

function formatDomainData(domain: string, sources: any): string {
  const sections: string[] = [`# Domain Investigation: ${domain}\n`];

  if (sources.crtsh) {
    const certs = Array.isArray(sources.crtsh) ? sources.crtsh : [];
    sections.push(`## Certificate Transparency (crt.sh)`);
    sections.push(`- Certificates found: ${certs.length}`);
    if (certs.length > 0) {
      const issuers = Array.from(new Set(certs.map((c: any) => c.issuer_name))).slice(0, 5);
      sections.push(`- Issuers: ${issuers.join(' | ').replace(/\n/g, ' ')}`);
      const recent = certs[0];
      if (recent) {
        sections.push(`- Not Before: ${recent.not_before}`);
      }
    }
  }

  if (sources.dns) {
    const d = sources.dns;
    sections.push(`## Raw DNS Records`);
    if (d.A && d.A.length) sections.push(`- A: ${d.A.join(', ')}`);
    if (d.MX && d.MX.length) sections.push(`- MX: ${d.MX.map((mx: any) => mx.exchange).join(', ')}`);
    if (d.NS && d.NS.length) sections.push(`- NS: ${d.NS.join(', ')}`);
    if (d.TXT && d.TXT.length) sections.push(`- TXT: ${d.TXT.map((t: any) => t.join(' ')).join(' | ')}`);
  }

  if (sources.hackerTarget) {
    sections.push(`## HackerTarget DNS Lookup`);
    sections.push('```\n' + sources.hackerTarget.substring(0, 500) + '\n```');
  }

  if (sources.urlscan && sources.urlscan.results) {
    sections.push(`## URLScan.io Recent Scans`);
    sections.push(`- Total available: ${sources.urlscan.total}`);
    if (sources.urlscan.results.length > 0) {
      sources.urlscan.results.forEach((r: any, idx: number) => {
        sections.push(`  - [${idx}] URL: ${r.task.url} (IP: ${r.page.ip})`);
      });
    }
  }

  if (sources.virusTotal && sources.virusTotal.data && sources.virusTotal.data.attributes) {
    const vt = sources.virusTotal.data.attributes;
    sections.push(`## VirusTotal Analysis`);
    const stats = vt.last_analysis_stats;
    if (stats) {
      sections.push(`- Analysis Stats:`);
      sections.push(`  - Malicious: ${stats.malicious}`);
      sections.push(`  - Suspicious: ${stats.suspicious}`);
      sections.push(`  - Undetected: ${stats.undetected}`);
      sections.push(`  - Harmless: ${stats.harmless}`);
    }
    if (vt.reputation !== undefined) sections.push(`- Reputation: ${vt.reputation}`);
    if (vt.creation_date) sections.push(`- Creation Date TS: ${vt.creation_date}`);
  }

  return sections.join('\n');
}
