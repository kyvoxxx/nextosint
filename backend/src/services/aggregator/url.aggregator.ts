import { analyzeWithClaude } from '../ai/claude.client.js';
import { URL_SYSTEM_PROMPT } from '../ai/prompts/url.prompt.js';
import { logger } from '../../utils/logger.js';
import type { AiReport } from '../../../../shared/types/ai-report.js';
import {
  queryVtUrl,
  queryUrlScanSubmit,
  queryGoogleSafeBrowsing,
} from '../sources/url.free.js';

export async function aggregateUrl(urlStr: string): Promise<{ sources: any; report: AiReport }> {
  logger.info({ url: urlStr }, 'URL aggregator: starting investigation (Free APIs)');

  const [vtResult, urlscanResult, gsbResult] = await Promise.allSettled([
    queryVtUrl(urlStr),
    queryUrlScanSubmit(urlStr),
    queryGoogleSafeBrowsing(urlStr),
  ]);

  const sources = {
    virusTotal: vtResult.status === 'fulfilled' ? vtResult.value : null,
    urlscan: urlscanResult.status === 'fulfilled' ? urlscanResult.value : null,
    googleSafeBrowsing: gsbResult.status === 'fulfilled' ? gsbResult.value : null,
  };

  const unavailable: string[] = [];
  if (!sources.virusTotal) unavailable.push('VirusTotal URL Scanner');
  if (!sources.urlscan) unavailable.push('URLScan.io Scanner');
  if (!sources.googleSafeBrowsing) unavailable.push('Google Safe Browsing');

  if (!sources.virusTotal && !sources.urlscan && !sources.googleSafeBrowsing) {
    logger.warn({ url: urlStr }, 'All URL sources failed (graceful degradation)');
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

  const userData = formatUrlData(urlStr, sources);
  const aiResponse = await analyzeWithClaude(URL_SYSTEM_PROMPT, userData, unavailable);

  return { sources, report: aiResponse.report };
}

function formatUrlData(url: string, sources: any): string {
  const sections: string[] = [`# URL Investigation: ${url}\n`];

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
    if (vt.categories) {
      sections.push(`- Categories: ${JSON.stringify(vt.categories)}`);
    }
  }

  if (sources.urlscan) {
    sections.push(`## URLScan.io Submission`);
    if (sources.urlscan.message) sections.push(`- Status: ${sources.urlscan.message}`);
    if (sources.urlscan.uuid) sections.push(`- Scan ID: ${sources.urlscan.uuid}`);
    if (sources.urlscan.result) sections.push(`- Result URL: ${sources.urlscan.result}`);
  }

  if (sources.googleSafeBrowsing) {
    sections.push(`## Google Safe Browsing`);
    if (sources.googleSafeBrowsing.matches && sources.googleSafeBrowsing.matches.length > 0) {
      sections.push(`- THREAT DETECTED!`);
      sources.googleSafeBrowsing.matches.forEach((match: any) => {
        sections.push(`  - Threat Type: ${match.threatType}`);
        sections.push(`  - Platform: ${match.platformType}`);
      });
    } else {
      sections.push(`- No threats detected by Google Safe Browsing.`);
    }
  }

  return sections.join('\n');
}
