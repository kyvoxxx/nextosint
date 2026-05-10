import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aggregateUrl } from '../../../src/services/aggregator/url.aggregator.js';
import * as virustotal from '../../../src/services/sources/virustotal.js';
import * as screenshot from '../../../src/services/screenshot.js';
import * as claude from '../../../src/services/ai/claude.client.js';

vi.mock('../../../src/services/sources/virustotal.js', () => ({ queryVtUrl: vi.fn() }));
vi.mock('../../../src/services/screenshot.js', () => ({ captureScreenshot: vi.fn() }));
vi.mock('../../../src/services/ai/claude.client.js', () => ({ analyzeWithClaude: vi.fn() }));

describe('aggregateUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully aggregate URL data and return parsed report', async () => {
    const mockVt = { stats: { malicious: 0, suspicious: 0, undetected: 90, harmless: 0, timeout: 0 }, permalink: 'https://vt.com/123', categories: {} };
    const mockScreenshot = 'base64image';
    const mockAiReport = { report: { score: 10, riskLevel: 'low', summary: 'URL summary', indicators: [], recommendations: [] } };

    vi.mocked(virustotal.queryVtUrl).mockResolvedValue(mockVt as any);
    vi.mocked(screenshot.captureScreenshot).mockResolvedValue(mockScreenshot as any);
    vi.mocked(claude.analyzeWithClaude).mockResolvedValue(mockAiReport as any);

    const result = await aggregateUrl('https://example.com');

    expect(virustotal.queryVtUrl).toHaveBeenCalledWith('https://example.com');
    expect(screenshot.captureScreenshot).toHaveBeenCalledWith('https://example.com');
    expect(result.sources.virustotal).toEqual(mockVt);
    expect(result.report).toEqual(mockAiReport.report);
  });
});
