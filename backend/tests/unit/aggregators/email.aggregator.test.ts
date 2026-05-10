import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aggregateEmail } from '../../../src/services/aggregator/email.aggregator.js';
import * as hibp from '../../../src/services/sources/haveibeenpwned.js';
import * as hunter from '../../../src/services/sources/hunter.js';
import * as claude from '../../../src/services/ai/claude.client.js';

vi.mock('../../../src/services/sources/haveibeenpwned.js', () => ({
  queryHibp: vi.fn(),
}));

vi.mock('../../../src/services/sources/hunter.js', () => ({
  queryHunter: vi.fn(),
}));

vi.mock('../../../src/services/ai/claude.client.js', () => ({
  analyzeWithClaude: vi.fn(),
}));

describe('aggregateEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully aggregate email data and return parsed report', async () => {
    const mockHibpData = { breachCount: 1, pasteCount: 0, breaches: [] };
    const mockHunterData = { score: 90, domain: 'example.com', smtp_check: true, smtp_server: true, sources: 0 };
    const mockAiReport = {
      report: {
        score: 55,
        riskLevel: 'medium',
        summary: 'Test summary',
        indicators: [],
        recommendations: [],
      },
    };

    vi.mocked(hibp.queryHibp).mockResolvedValue(mockHibpData as any);
    vi.mocked(hunter.queryHunter).mockResolvedValue(mockHunterData as any);
    vi.mocked(claude.analyzeWithClaude).mockResolvedValue(mockAiReport as any);

    const result = await aggregateEmail('test@example.com');

    expect(hibp.queryHibp).toHaveBeenCalledWith('test@example.com');
    expect(hunter.queryHunter).toHaveBeenCalledWith('test@example.com');
    expect(claude.analyzeWithClaude).toHaveBeenCalled();
    expect(result.sources.haveibeenpwned).toEqual(mockHibpData);
    expect(result.sources.hunter).toEqual(mockHunterData);
    expect(result.report).toEqual(mockAiReport.report);
  });

  it('should handle source failure gracefully', async () => {
    const mockAiReport = {
      report: {
        score: 0,
        riskLevel: 'low',
        summary: 'Test summary',
        indicators: [],
        recommendations: [],
      },
    };

    vi.mocked(hibp.queryHibp).mockRejectedValue(new Error('API Error'));
    vi.mocked(hunter.queryHunter).mockResolvedValue(null); // Missing key case
    vi.mocked(claude.analyzeWithClaude).mockResolvedValue(mockAiReport as any);

    const result = await aggregateEmail('test@example.com');

    expect(result.sources.haveibeenpwned).toBeNull();
    expect(result.sources.hunter).toBeNull();
    // Unavailable sources array should be passed to Claude
    const claudeArgs = vi.mocked(claude.analyzeWithClaude).mock.calls[0];
    expect(claudeArgs?.[2]).toContain('HaveIBeenPwned (breach database)');
    expect(claudeArgs?.[2]).toContain('Hunter.io (email context)');
  });
});
