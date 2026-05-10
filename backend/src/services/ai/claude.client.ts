import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { AiReport, AiRawResponse } from '../../../../shared/types/ai-report.js';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  const env = getEnv();
  _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

/**
 * Send a structured analysis request to Claude.
 * The system prompt defines the analyst persona and output schema.
 * The user message contains the aggregated OSINT data.
 *
 * Returns a validated AiReport or a fallback if parsing fails.
 */
export async function analyzeWithClaude(
  systemPrompt: string,
  userData: string,
  unavailableSources: string[],
): Promise<AiRawResponse> {
  const env = getEnv();
  const client = getClient();

  // Append unavailable sources notice to the user data
  let augmentedData = userData;
  if (unavailableSources.length > 0) {
    augmentedData += `\n\n⚠️ UNAVAILABLE SOURCES (API key not configured or request failed):\n${unavailableSources.map((s) => `- ${s}`).join('\n')}\nNote: Your analysis should acknowledge these gaps and adjust confidence accordingly.`;
  }

  try {
    const response = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: augmentedData,
        },
      ],
      system: systemPrompt,
    });

    // Extract text from the response
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      logger.error('Claude: no text block in response');
      return { report: buildFallbackReport('AI response contained no text output.') };
    }

    const rawText = textBlock.text.trim();

    // Try to extract JSON from the response
    const report = parseReport(rawText);
    if (!report) {
      logger.warn({ rawText: rawText.slice(0, 200) }, 'Claude: failed to parse JSON from response');
      return { report: buildFallbackReport('AI returned non-JSON response.') };
    }

    return { report };
  } catch (err) {
    logger.error({ err }, 'Claude: API call failed');
    return { report: buildFallbackReport('AI analysis unavailable due to API error.') };
  }
}

/**
 * Parse and validate the AI report JSON from Claude's response.
 * Handles cases where Claude wraps JSON in markdown code fences.
 */
function parseReport(rawText: string): AiReport | null {
  // Strip markdown code fences if present
  let jsonStr = rawText;
  const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) {
    jsonStr = fenceMatch[1].trim();
  }

  // If the text starts with { it's likely direct JSON
  if (!jsonStr.startsWith('{')) {
    // Try to find JSON object in the text
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch?.[0]) {
      jsonStr = jsonMatch[0];
    } else {
      return null;
    }
  }

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    // Validate required fields with defaults
    const validRiskLevels = ['low', 'medium', 'high', 'critical'] as const;
    const riskLevel = validRiskLevels.includes(parsed.riskLevel as typeof validRiskLevels[number])
      ? (parsed.riskLevel as AiReport['riskLevel'])
      : 'medium';

    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 50;

    return {
      riskLevel,
      score,
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Analysis completed.',
      indicators: Array.isArray(parsed.indicators)
        ? parsed.indicators.filter((i): i is string => typeof i === 'string')
        : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.filter((r): r is string => typeof r === 'string')
        : [],
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((t): t is string => typeof t === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Build a fallback report when AI analysis fails.
 */
function buildFallbackReport(reason: string): AiReport {
  return {
    riskLevel: 'medium',
    score: 50,
    summary: `Automated analysis could not be completed. ${reason} Manual review recommended.`,
    indicators: ['AI analysis unavailable — data provided without synthesis'],
    recommendations: ['Review raw source data manually', 'Retry investigation later'],
    tags: ['ai-fallback', 'manual-review-needed'],
  };
}
