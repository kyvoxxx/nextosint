import { analyzeWithClaude } from '../ai/claude.client.js';
import { IP_SYSTEM_PROMPT } from '../ai/prompts/ip.prompt.js';
import { logger } from '../../utils/logger.js';
import type { AiReport } from '../../../../shared/types/ai-report.js';
import {
  queryIpApi,
  queryShodanInternetdb,
  queryAbuseIpdb,
  queryVtIp,
  queryHackerTargetNmap,
} from '../sources/ip.free.js';

export async function aggregateIp(ip: string): Promise<{ sources: any; report: AiReport }> {
  logger.info({ ip }, 'IP aggregator: starting investigation (Free APIs)');

  const [ipapiResult, shodanResult, abuseResult, vtResult, nmapResult] = await Promise.allSettled([
    queryIpApi(ip),
    queryShodanInternetdb(ip),
    queryAbuseIpdb(ip),
    queryVtIp(ip),
    queryHackerTargetNmap(ip),
  ]);

  const sources = {
    ipApi: ipapiResult.status === 'fulfilled' ? ipapiResult.value : null,
    shodan: shodanResult.status === 'fulfilled' ? shodanResult.value : null,
    abuseIpdb: abuseResult.status === 'fulfilled' ? abuseResult.value : null,
    virusTotal: vtResult.status === 'fulfilled' ? vtResult.value : null,
    nmap: nmapResult.status === 'fulfilled' ? nmapResult.value : null,
  };

  const unavailable: string[] = [];
  if (!sources.ipApi) unavailable.push('ip-api.com (Geolocation)');
  if (!sources.shodan) unavailable.push('Shodan InternetDB');
  if (!sources.abuseIpdb) unavailable.push('AbuseIPDB');
  if (!sources.virusTotal) unavailable.push('VirusTotal');
  if (!sources.nmap) unavailable.push('HackerTarget Nmap');

  if (
    !sources.ipApi &&
    !sources.shodan &&
    !sources.abuseIpdb &&
    !sources.virusTotal &&
    !sources.nmap
  ) {
    logger.warn({ ip }, 'All IP sources failed (graceful degradation)');
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

  const userData = formatIpData(ip, sources);
  const aiResponse = await analyzeWithClaude(IP_SYSTEM_PROMPT, userData, unavailable);

  return { sources, report: aiResponse.report };
}

function formatIpData(ip: string, sources: any): string {
  const sections: string[] = [`# IP Investigation: ${ip}\n`];

  if (sources.ipApi && sources.ipApi.status === 'success') {
    const s = sources.ipApi;
    sections.push(`## Geolocation & Hosting`);
    sections.push(`- ISP: ${s.isp}`);
    sections.push(`- Organization: ${s.org}`);
    sections.push(`- AS: ${s.as}`);
    sections.push(`- Location: ${s.city}, ${s.regionName}, ${s.country} (${s.countryCode})`);
    sections.push(`- Mobile: ${s.mobile}`);
    sections.push(`- Proxy/VPN: ${s.proxy}`);
    sections.push(`- Hosting/Datacenter: ${s.hosting}`);
    if (s.reverse) sections.push(`- Reverse DNS: ${s.reverse}`);
  }

  if (sources.shodan) {
    const s = sources.shodan;
    sections.push(`## Shodan InternetDB`);
    sections.push(`- Open Ports: ${(s.ports || []).join(', ')}`);
    if (s.hostnames?.length) sections.push(`- Hostnames: ${s.hostnames.join(', ')}`);
    if (s.cpes?.length) sections.push(`- CPEs: ${s.cpes.join(', ')}`);
    if (s.tags?.length) sections.push(`- Tags: ${s.tags.join(', ')}`);
    if (s.vulns?.length) sections.push(`- Vulnerabilities: ${s.vulns.join(', ')}`);
  }

  if (sources.abuseIpdb && sources.abuseIpdb.data) {
    const a = sources.abuseIpdb.data;
    sections.push(`## AbuseIPDB`);
    sections.push(`- Confidence of Abuse: ${a.abuseConfidenceScore}%`);
    sections.push(`- Total Reports: ${a.totalReports}`);
    sections.push(`- Distinct Users Reporting: ${a.numDistinctUsers}`);
    sections.push(`- Last Reported: ${a.lastReportedAt || 'Never'}`);
    sections.push(`- Domain: ${a.domain}`);
  }

  if (sources.virusTotal && sources.virusTotal.data && sources.virusTotal.data.attributes) {
    const vt = sources.virusTotal.data.attributes;
    sections.push(`## VirusTotal`);
    const stats = vt.last_analysis_stats;
    if (stats) {
      sections.push(`- Analysis Stats:`);
      sections.push(`  - Malicious: ${stats.malicious}`);
      sections.push(`  - Suspicious: ${stats.suspicious}`);
      sections.push(`  - Undetected: ${stats.undetected}`);
      sections.push(`  - Harmless: ${stats.harmless}`);
    }
    if (vt.asn) sections.push(`- ASN: ${vt.asn}`);
    if (vt.as_owner) sections.push(`- AS Owner: ${vt.as_owner}`);
    if (vt.regional_internet_registry) {
      sections.push(`- Registry: ${vt.regional_internet_registry}`);
    }
  }

  if (sources.nmap) {
    sections.push(`## HackerTarget Nmap`);
    sections.push('```\n' + sources.nmap.substring(0, 500) + (sources.nmap.length > 500 ? '...\n```' : '\n```'));
  }

  return sections.join('\n');
}
