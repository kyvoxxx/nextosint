import { queryVtUrl } from '../sources/virustotal.js';
import { captureScreenshot } from '../screenshot.js';
import { analyzeWithClaude } from '../ai/claude.client.js';
import { URL_SYSTEM_PROMPT } from '../ai/prompts/url.prompt.js';
import { logger } from '../../utils/logger.js';
import type { UrlSources } from '../../../../shared/types/investigation.js';
import type { AiReport } from '../../../../shared/types/ai-report.js';

/**
 * URL investigation aggregator.
 *
 * 1. Submits URL to VirusTotal for scanning
 * 2. Captures a headless browser screenshot
 * 3. Sends data to Claude for phishing/malware analysis
 * 4. Returns sources + AI report
 */
export async function aggregateUrl(url: string): Promise<{
  sources: UrlSources;
  report: AiReport;
}> {
  logger.info({ url }, 'URL aggregator: starting investigation');

  const [vtResult, screenshotResult] = await Promise.allSettled([
    queryVtUrl(url),
    captureScreenshot(url),
  ]);

  const sources: UrlSources = {
    virustotal: vtResult.status === 'fulfilled' ? vtResult.value : null,
    screenshotBase64: screenshotResult.status === 'fulfilled' ? screenshotResult.value : null,
  };

  const unavailable: string[] = [];
  if (!sources.virustotal) unavailable.push('VirusTotal (URL scan)');
  if (!sources.screenshotBase64) unavailable.push('Screenshot (page render)');

  const userData = formatUrlData(url, sources);
  const aiResponse = await analyzeWithClaude(URL_SYSTEM_PROMPT, userData, unavailable);

  logger.info(
    { url, riskLevel: aiResponse.report.riskLevel, score: aiResponse.report.score },
    'URL aggregator: investigation complete',
  );

  return { sources, report: aiResponse.report };
}

function formatUrlData(url: string, sources: UrlSources): string {
  const sections: string[] = [`# URL Investigation: ${url}\n`];

  // URL structural analysis (always available, no API needed)
  try {
    const parsed = new URL(url);
    sections.push(`## URL Structure`);
    sections.push(`- Protocol: ${parsed.protocol}`);
    sections.push(`- Hostname: ${parsed.hostname}`);
    sections.push(`- Port: ${parsed.port || 'default'}`);
    sections.push(`- Path: ${parsed.pathname}`);
    sections.push(`- Query params: ${parsed.search || 'none'}`);
    sections.push(`- Fragment: ${parsed.hash || 'none'}`);

    // Structural risk indicators
    const hostname = parsed.hostname;
    const indicators: string[] = [];

    if (hostname.split('.').length > 4) {
      indicators.push('Excessive subdomain depth (possible phishing)');
    }
    if (/\d{1,3}-\d{1,3}-\d{1,3}-\d{1,3}/.test(hostname)) {
      indicators.push('IP-like hostname pattern');
    }
    if (parsed.pathname.length > 100) {
      indicators.push('Unusually long path (possible obfuscation)');
    }
    if (parsed.search.length > 200) {
      indicators.push('Excessive query parameters');
    }

    const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.xyz', '.buzz', '.click'];
    if (suspiciousTlds.some((tld) => hostname.endsWith(tld))) {
      indicators.push(`High-risk TLD detected (${hostname.split('.').pop()})`);
    }

    if (indicators.length > 0) {
      sections.push('\n### Structural Warnings:');
      for (const ind of indicators) {
        sections.push(`- ⚠️ ${ind}`);
      }
    }
  } catch {
    sections.push('- URL parsing failed');
  }

  if (sources.virustotal) {
    const v = sources.virustotal;
    sections.push(`\n## VirusTotal Scan Results`);
    sections.push(`- Malicious: ${v.stats.malicious} vendors`);
    sections.push(`- Suspicious: ${v.stats.suspicious} vendors`);
    sections.push(`- Harmless: ${v.stats.harmless} vendors`);
    sections.push(`- Undetected: ${v.stats.undetected} vendors`);
    sections.push(`- Report: ${v.permalink}`);
    if (v.categories && Object.keys(v.categories).length > 0) {
      sections.push(`- Categories: ${Object.values(v.categories).join(', ')}`);
    }
  }

  // Note: We describe the screenshot availability but don't dump base64
  if (sources.screenshotBase64) {
    sections.push(`\n## Screenshot`);
    sections.push(`- Page screenshot captured successfully`);
    sections.push(`- [Screenshot data available for visual analysis]`);
  }

  return sections.join('\n');
}
