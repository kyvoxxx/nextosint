import { analyzeWithClaude } from '../ai/claude.client.js';
import { EMAIL_SYSTEM_PROMPT } from '../ai/prompts/email.prompt.js';
import { logger } from '../../utils/logger.js';
import type { AiReport } from '../../../../shared/types/ai-report.js';
import {
  queryLeakCheck,
  queryHibpPastes,
  queryEmailRep,
  queryGravatar,
  queryMxRecords,
  queryEva,
  getPastebinDork,
} from '../sources/email.free.js';

export async function aggregateEmail(email: string): Promise<{ sources: any; report: AiReport }> {
  logger.info({ email }, 'Email aggregator: starting investigation (Free APIs)');

  const [leakResult, pasteResult, repResult, gravatarResult, mxResult, evaResult] =
    await Promise.allSettled([
      queryLeakCheck(email),
      queryHibpPastes(email),
      queryEmailRep(email),
      queryGravatar(email),
      queryMxRecords(email),
      queryEva(email),
    ]);

  const sources = {
    leakcheck: leakResult.status === 'fulfilled' ? leakResult.value : null,
    hibp_pastes: pasteResult.status === 'fulfilled' ? pasteResult.value : null,
    emailrep: repResult.status === 'fulfilled' ? repResult.value : null,
    gravatar: gravatarResult.status === 'fulfilled' ? gravatarResult.value : null,
    mx: mxResult.status === 'fulfilled' ? mxResult.value : null,
    eva: evaResult.status === 'fulfilled' ? evaResult.value : null,
    pastebin_dork: getPastebinDork(email),
  };

  const unavailable: string[] = [];
  if (!sources.leakcheck) unavailable.push('LeakCheck (Breach DB)');
  if (!sources.hibp_pastes) unavailable.push('HIBP Pastes');
  if (!sources.emailrep) unavailable.push('EmailRep (Reputation)');
  if (!sources.mx) unavailable.push('MX records resolver');
  if (!sources.eva) unavailable.push('Eva (Email Validator)');

  // If ALL primary APIs failed, graceful degradation
  if (
    !sources.leakcheck &&
    !sources.hibp_pastes &&
    !sources.emailrep &&
    !sources.mx &&
    !sources.eva
  ) {
    logger.warn({ email }, 'All email sources failed (graceful degradation)');
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

  const userData = formatEmailData(email, sources);
  const aiResponse = await analyzeWithClaude(EMAIL_SYSTEM_PROMPT, userData, unavailable);

  return { sources, report: aiResponse.report };
}

function formatEmailData(email: string, sources: any): string {
  const sections: string[] = [`# Email Investigation: ${email}\n`];

  if (sources.leakcheck) {
    sections.push(`## LeakCheck Results`);
    sections.push(`- Success: ${sources.leakcheck.success}`);
    sections.push(`- Breaches Found: ${sources.leakcheck.found}`);
    if (sources.leakcheck.fields) {
      sections.push(`- Leaked fields: ${sources.leakcheck.fields.join(', ')}`);
    }
  }

  if (sources.hibp_pastes) {
    sections.push(`## HaveIBeenPwned Pastes`);
    sections.push(`- Pastes found: ${Array.isArray(sources.hibp_pastes) ? sources.hibp_pastes.length : 0}`);
    if (Array.isArray(sources.hibp_pastes) && sources.hibp_pastes.length > 0) {
      sections.push(`- Sample IDs: ${sources.hibp_pastes.map((p: any) => p.Id).slice(0, 5).join(', ')}`);
    }
  }

  if (sources.emailrep) {
    sections.push(`## EmailRep.io`);
    sections.push(`- Reputation: ${sources.emailrep.reputation}`);
    sections.push(`- Suspicious: ${sources.emailrep.suspicious}`);
    sections.push(`- References: ${sources.emailrep.references}`);
    if (sources.emailrep.details) {
      sections.push(`- Blacklisted: ${sources.emailrep.details.blacklisted}`);
      sections.push(`- Malicious activity: ${sources.emailrep.details.malicious_activity}`);
      sections.push(`- Credentials leaked: ${sources.emailrep.details.credentials_leaked}`);
      sections.push(`- Data breaches: ${sources.emailrep.details.data_breach}`);
      sections.push(`- Profiles connected: ${(sources.emailrep.details.profiles || []).join(', ') || 'none'}`);
    }
  }

  if (sources.gravatar) {
    sections.push(`## Gravatar profile`);
    sections.push(`- Profile exists: ${sources.gravatar.found}`);
  }

  if (sources.eva && sources.eva.data) {
    const d = sources.eva.data;
    sections.push(`## Eva Validation`);
    sections.push(`- Valid syntax: ${d.valid_syntax}`);
    sections.push(`- Disposable email: ${d.disposable}`);
    sections.push(`- Webmail provider: ${d.webmail}`);
    sections.push(`- Deliverable: ${d.deliverable}`);
    sections.push(`- Catch-all: ${d.catch_all}`);
  }

  if (sources.mx) {
    sections.push(`## MX Records`);
    sections.push(`- Servers found: ${Array.isArray(sources.mx) ? sources.mx.length : 0}`);
    if (Array.isArray(sources.mx)) {
      sources.mx.forEach((record: any) => {
        sections.push(`  - Exchange: ${record.exchange} (Priority: ${record.priority})`);
      });
    }
  }

  sections.push(`## Manual Verification Links`);
  sections.push(`- Pastebin Dork: ${sources.pastebin_dork}`);

  return sections.join('\n');
}
