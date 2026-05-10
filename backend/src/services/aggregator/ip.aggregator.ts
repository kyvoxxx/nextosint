import { queryIpInfo } from '../sources/ipinfo.js';
import { queryAbuseIpDb } from '../sources/abuseipdb.js';
import { queryShodan } from '../sources/shodan.js';
import { queryVtIp } from '../sources/virustotal.js';
import { analyzeWithClaude } from '../ai/claude.client.js';
import { IP_SYSTEM_PROMPT } from '../ai/prompts/ip.prompt.js';
import { logger } from '../../utils/logger.js';
import type { IpSources } from '../../../../shared/types/investigation.js';
import type { AiReport } from '../../../../shared/types/ai-report.js';

/**
 * IP address investigation aggregator.
 *
 * 1. Fetches from IPInfo, AbuseIPDB, Shodan, VirusTotal in parallel
 * 2. Sends aggregated data to Claude for synthesis
 * 3. Returns sources + AI report
 */
export async function aggregateIp(ip: string): Promise<{
  sources: IpSources;
  report: AiReport;
}> {
  logger.info({ ip }, 'IP aggregator: starting investigation');

  const [ipInfoResult, abuseResult, shodanResult, vtResult] = await Promise.allSettled([
    queryIpInfo(ip),
    queryAbuseIpDb(ip),
    queryShodan(ip),
    queryVtIp(ip),
  ]);

  const sources: IpSources = {
    ipinfo: ipInfoResult.status === 'fulfilled' ? ipInfoResult.value : null,
    abuseipdb: abuseResult.status === 'fulfilled' ? abuseResult.value : null,
    shodan: shodanResult.status === 'fulfilled' ? shodanResult.value : null,
    virustotal: vtResult.status === 'fulfilled' ? vtResult.value : null,
  };

  const unavailable: string[] = [];
  if (!sources.ipinfo) unavailable.push('IPInfo (geolocation)');
  if (!sources.abuseipdb) unavailable.push('AbuseIPDB (abuse scoring)');
  if (!sources.shodan) unavailable.push('Shodan (port scan)');
  if (!sources.virustotal) unavailable.push('VirusTotal (reputation)');

  const userData = formatIpData(ip, sources);
  const aiResponse = await analyzeWithClaude(IP_SYSTEM_PROMPT, userData, unavailable);

  logger.info(
    { ip, riskLevel: aiResponse.report.riskLevel, score: aiResponse.report.score },
    'IP aggregator: investigation complete',
  );

  return { sources, report: aiResponse.report };
}

function formatIpData(ip: string, sources: IpSources): string {
  const sections: string[] = [`# IP Address Investigation: ${ip}\n`];

  if (sources.ipinfo) {
    const i = sources.ipinfo;
    sections.push(`## Geolocation (IPInfo)`);
    sections.push(`- Location: ${i.city}, ${i.region}, ${i.country}`);
    sections.push(`- Coordinates: ${i.loc}`);
    sections.push(`- Organization: ${i.org}`);
    if (i.hostname) sections.push(`- Hostname: ${i.hostname}`);
    if (i.timezone) sections.push(`- Timezone: ${i.timezone}`);
  }

  if (sources.abuseipdb) {
    const a = sources.abuseipdb;
    sections.push(`\n## Abuse Report (AbuseIPDB)`);
    sections.push(`- Abuse Confidence Score: ${a.abuseConfidenceScore}%`);
    sections.push(`- Total Reports: ${a.totalReports}`);
    sections.push(`- Last Reported: ${a.lastReportedAt ?? 'Never'}`);
    sections.push(`- Whitelisted: ${a.isWhitelisted}`);
    sections.push(`- ISP: ${a.isp}`);
    sections.push(`- Usage Type: ${a.usageType}`);
    sections.push(`- Country: ${a.countryCode}`);
  }

  if (sources.shodan) {
    const s = sources.shodan;
    sections.push(`\n## Port Scan (Shodan)`);
    sections.push(`- Open Ports: ${s.ports.length > 0 ? s.ports.join(', ') : 'None detected'}`);
    sections.push(`- OS: ${s.os ?? 'Unknown'}`);
    sections.push(`- ISP: ${s.isp}`);
    sections.push(`- Organization: ${s.org}`);

    if (s.vulns.length > 0) {
      sections.push(`- Known Vulnerabilities: ${s.vulns.join(', ')}`);
    }

    if (s.hostnames.length > 0) {
      sections.push(`- Hostnames: ${s.hostnames.join(', ')}`);
    }

    if (s.services.length > 0) {
      sections.push('\n### Services:');
      for (const svc of s.services.slice(0, 10)) {
        const name = [svc.product, svc.version].filter(Boolean).join(' ') || 'unknown';
        sections.push(`- Port ${svc.port}/${svc.transport}: ${name}`);
      }
    }
  }

  if (sources.virustotal) {
    const v = sources.virustotal;
    sections.push(`\n## Reputation (VirusTotal)`);
    sections.push(`- Malicious: ${v.stats.malicious} vendors`);
    sections.push(`- Suspicious: ${v.stats.suspicious} vendors`);
    sections.push(`- Harmless: ${v.stats.harmless} vendors`);
    sections.push(`- Undetected: ${v.stats.undetected} vendors`);
    sections.push(`- Report: ${v.permalink}`);
  }

  return sections.join('\n');
}
