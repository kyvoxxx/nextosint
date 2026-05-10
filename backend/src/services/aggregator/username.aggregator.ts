import { analyzeWithClaude } from '../ai/claude.client.js';
import { USERNAME_SYSTEM_PROMPT } from '../../ai/prompts/username.prompt.js';
import { logger } from '../../utils/logger.js';
import type { AiReport } from '../../../../shared/types/ai-report.js';
import { checkAllPlatforms } from '../sources/username.checker.js';

export async function aggregateUsername(username: string): Promise<{ sources: any; report: AiReport }> {
  logger.info({ username }, 'Username aggregator: starting investigation (Free APIs)');

  const results = await checkAllPlatforms(username);

  const sources = {
    sherlock: {
      username,
      found: results.found,
      notFound: results.notFound,
      uncertain: results.uncertain,
      summary: {
        total: results.found.length + results.notFound.length + results.uncertain.length,
        found: results.found.length,
        notFound: results.notFound.length,
        uncertain: results.uncertain.length,
      }
    }
  };

  const userData = formatUsernameData(username, sources.sherlock);
  const aiResponse = await analyzeWithClaude(USERNAME_SYSTEM_PROMPT, userData, []);

  return { sources, report: aiResponse.report };
}

function formatUsernameData(username: string, data: any): string {
  const sections: string[] = [`# Username Investigation: ${username}\n`];

  sections.push(`## Summary`);
  sections.push(`- Total platforms checked: ${data.summary.total}`);
  sections.push(`- FOUND: ${data.summary.found}`);
  sections.push(`- NOT FOUND: ${data.summary.notFound}`);
  sections.push(`- UNCERTAIN (Errors/Timeouts): ${data.summary.uncertain}`);

  if (data.found.length > 0) {
    sections.push(`\n## FOUND Platforms`);
    data.found.forEach((f: any) => {
      sections.push(`- **${f.platform}**: ${f.url} ${f.reliable ? '' : '(MAY BE INACCURATE)'}`);
    });
  }

  if (data.uncertain.length > 0) {
    sections.push(`\n## UNCERTAIN Platforms`);
    data.uncertain.forEach((u: any) => {
      sections.push(`- ${u.platform} (${u.note})`);
    });
  }

  return sections.join('\n');
}
