import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aggregateDomain } from '../../../src/services/aggregator/domain.aggregator.js';
import * as virustotal from '../../../src/services/sources/virustotal.js';
import * as crtsh from '../../../src/services/sources/crtsh.js';
import * as dnsResolver from '../../../src/services/sources/dns.resolver.js';
import * as whois from '../../../src/services/sources/whois.js';
import * as claude from '../../../src/services/ai/claude.client.js';

vi.mock('../../../src/services/sources/virustotal.js', () => ({ queryVtDomain: vi.fn() }));
vi.mock('../../../src/services/sources/crtsh.js', () => ({ queryCrtSh: vi.fn() }));
vi.mock('../../../src/services/sources/dns.resolver.js', () => ({ queryDns: vi.fn() }));
vi.mock('../../../src/services/sources/whois.js', () => ({ queryWhois: vi.fn() }));
vi.mock('../../../src/services/ai/claude.client.js', () => ({ analyzeWithClaude: vi.fn() }));

describe('aggregateDomain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully aggregate Domain data and return parsed report', async () => {
    const mockVt = { stats: { malicious: 0, suspicious: 0, undetected: 90, harmless: 0, timeout: 0 }, categories: {} };
    const mockCrt = [{ commonName: 'example.com', issuerName: 'Issuer', notBefore: '2020', notAfter: '2021' }];
    const mockDns = { a: ['93.184.216.34'], aaaa: [], mx: [], txt: [], ns: [], cname: [] };
    const mockWhois = { domainName: 'example.com', registrar: 'IANA', creationDate: '1995-08-14', expirationDate: '2025', updatedDate: '2024', nameServers: [], status: [] };
    const mockAiReport = { report: { score: 10, riskLevel: 'low', summary: 'Domain summary', indicators: [], recommendations: [] } };

    vi.mocked(virustotal.queryVtDomain).mockResolvedValue(mockVt as any);
    vi.mocked(crtsh.queryCrtSh).mockResolvedValue(mockCrt as any);
    vi.mocked(dnsResolver.queryDns).mockResolvedValue(mockDns as any);
    vi.mocked(whois.queryWhois).mockResolvedValue(mockWhois as any);
    vi.mocked(claude.analyzeWithClaude).mockResolvedValue(mockAiReport as any);

    const result = await aggregateDomain('example.com');

    expect(result.sources.virustotal).toEqual(mockVt);
    expect(result.sources.crtsh).toEqual(mockCrt);
    expect(result.sources.dns).toEqual(mockDns);
    expect(result.sources.whois).toEqual(mockWhois);
    expect(result.report).toEqual(mockAiReport.report);
  });
});
