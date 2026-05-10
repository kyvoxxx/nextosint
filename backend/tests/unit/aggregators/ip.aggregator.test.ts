import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aggregateIp } from '../../../src/services/aggregator/ip.aggregator.js';
import * as ipinfo from '../../../src/services/sources/ipinfo.js';
import * as abuseipdb from '../../../src/services/sources/abuseipdb.js';
import * as shodan from '../../../src/services/sources/shodan.js';
import * as virustotal from '../../../src/services/sources/virustotal.js';
import * as claude from '../../../src/services/ai/claude.client.js';

vi.mock('../../../src/services/sources/ipinfo.js', () => ({ queryIpInfo: vi.fn() }));
vi.mock('../../../src/services/sources/abuseipdb.js', () => ({ queryAbuseIpDb: vi.fn() }));
vi.mock('../../../src/services/sources/shodan.js', () => ({ queryShodan: vi.fn() }));
vi.mock('../../../src/services/sources/virustotal.js', () => ({ queryVtIp: vi.fn() }));
vi.mock('../../../src/services/ai/claude.client.js', () => ({ analyzeWithClaude: vi.fn() }));

describe('aggregateIp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully aggregate IP data and return parsed report', async () => {
    const mockIpInfo = { ip: '8.8.8.8', hostname: 'dns.google', anycast: true, city: 'Mountain View', region: 'CA', country: 'US', loc: '0,0', org: 'Google' };
    const mockAbuse = { abuseConfidenceScore: 0, totalReports: 0, lastReportedAt: null, isWhitelisted: true, isp: 'Google', usageType: 'DNS', countryCode: 'US' };
    const mockShodan = { ip_str: '8.8.8.8', ports: [53, 443], os: 'Linux', isp: 'Google', org: 'Google', vulns: [], hostnames: ['dns.google'], services: [] };
    const mockVt = { stats: { malicious: 0, suspicious: 0, undetected: 90, harmless: 0 }, permalink: 'https://vt.com/123' };
    const mockAiReport = {
      report: { score: 10, riskLevel: 'low', summary: 'Test IP', indicators: [], recommendations: [] },
    };

    vi.mocked(ipinfo.queryIpInfo).mockResolvedValue(mockIpInfo as any);
    vi.mocked(abuseipdb.queryAbuseIpDb).mockResolvedValue(mockAbuse as any);
    vi.mocked(shodan.queryShodan).mockResolvedValue(mockShodan as any);
    vi.mocked(virustotal.queryVtIp).mockResolvedValue(mockVt as any);
    vi.mocked(claude.analyzeWithClaude).mockResolvedValue(mockAiReport as any);

    const result = await aggregateIp('8.8.8.8');

    expect(result.sources.ipinfo).toEqual(mockIpInfo);
    expect(result.sources.abuseipdb).toEqual(mockAbuse);
    expect(result.sources.shodan).toEqual(mockShodan);
    expect(result.sources.virustotal).toEqual(mockVt);
    expect(result.report).toEqual(mockAiReport.report);
  });
});
