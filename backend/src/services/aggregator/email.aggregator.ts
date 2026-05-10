import { queryHibp } from '../sources/haveibeenpwned.js';
import { queryHunter } from '../sources/hunter.js';
import { analyzeWithClaude } from '../ai/claude.client.js';
import { EMAIL_SYSTEM_PROMPT } from '../ai/prompts/email.prompt.js';
import { logger } from '../../utils/logger.js';
import type { EmailSources } from '../../../../shared/types/investigation.js';
import type { AiReport } from '../../../../shared/types/ai-report.js';

/**
 * Email investigation aggregator.
 *
 * 1. Fetches data from HaveIBeenPwned and Hunter.io in parallel
 * 2. Sends aggregated data to Claude for synthesis
 * 3. Returns a complete InvestigationRecord
 */
export async function aggregateEmail(email: string): Promise<{
  sources: EmailSources;
  report: AiReport;
}> {
  logger.info({ email }, 'Email aggregator: starting investigation');

  // Fetch from all sources in parallel
  const [hibpResult, hunterResult] = await Promise.allSettled([
    queryHibp(email),
    queryHunter(email),
  ]);

  const sources: EmailSources = {
    haveibeenpwned: hibpResult.status === 'fulfilled' ? hibpResult.value : null,
    hunter: hunterResult.status === 'fulfilled' ? hunterResult.value : null,
  };

  // Track which sources were unavailable
  const unavailable: string[] = [];
  if (!sources.haveibeenpwned) unavailable.push('HaveIBeenPwned (breach database)');
  if (!sources.hunter) unavailable.push('Hunter.io (email context)');

  // Format data for AI analysis
  const userData = formatEmailData(email, sources);

  // Get AI synthesis
  const aiResponse = await analyzeWithClaude(EMAIL_SYSTEM_PROMPT, userData, unavailable);

  logger.info(
    { email, riskLevel: aiResponse.report.riskLevel, score: aiResponse.report.score },
    'Email aggregator: investigation complete',
  );

  return {
    sources,
    report: aiResponse.report,
  };
}

function formatEmailData(email: string, sources: EmailSources): string {
  const sections: string[] = [`# Email Investigation: ${email}\n`];

  // HaveIBeenPwned data
  if (sources.haveibeenpwned) {
    const h = sources.haveibeenpwned;
    sections.push(`## HaveIBeenPwned Results`);
    sections.push(`- Total breaches: ${h.breachCount}`);
    sections.push(`- Paste appearances: ${h.pasteCount}`);

    if (h.breaches.length > 0) {
      sections.push('\n### Breach Details:');
      for (const breach of h.breaches.slice(0, 15)) {
        sections.push(
          `- **${breach.Title}** (${breach.BreachDate}): ${breach.PwnCount.toLocaleString()} records, Data types: ${breach.DataClasses.join(', ')}${breach.IsSensitive ? ' [SENSITIVE]' : ''}${breach.IsVerified ? ' [VERIFIED]' : ''}`,
        );
      }
      if (h.breaches.length > 15) {
        sections.push(`- ... and ${h.breaches.length - 15} more breaches`);
      }
    }
  }

  // Hunter.io data
  if (sources.hunter) {
    const hu = sources.hunter;
    sections.push(`\n## Hunter.io Results`);
    sections.push(`- Email score: ${hu.score}/100`);
    sections.push(`- SMTP server found: ${hu.smtp_server}`);
    sections.push(`- SMTP check passed: ${hu.smtp_check}`);
    sections.push(`- Public sources mentioning this email: ${hu.sources}`);
    sections.push(`- Domain: ${hu.domain}`);
    if (hu.first_name || hu.last_name) {
      sections.push(`- Associated name: ${[hu.first_name, hu.last_name].filter(Boolean).join(' ')}`);
    }
    if (hu.company) sections.push(`- Company: ${hu.company}`);
    if (hu.position) sections.push(`- Position: ${hu.position}`);
  }

  return sections.join('\n');
}
