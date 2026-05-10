import type { AiReport, RiskLevel } from './ai-report.js';

export type InvestigationType = 'email' | 'ip' | 'domain' | 'url';

// ─── Source Response Types ───────────────────────────────────

export interface HibpBreach {
  Name: string;
  Title: string;
  Domain: string;
  BreachDate: string;
  DataClasses: string[];
  IsVerified: boolean;
  IsSensitive: boolean;
  PwnCount: number;
}

export interface HibpResult {
  breachCount: number;
  breaches: HibpBreach[];
  pasteCount: number;
}

export interface HunterResult {
  email: string;
  score: number;
  smtp_server: boolean;
  smtp_check: boolean;
  sources: number;
  domain: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  company: string | null;
}

export interface IpInfoResult {
  ip: string;
  hostname?: string;
  city: string;
  region: string;
  country: string;
  loc: string;           // "lat,lng"
  org: string;
  postal?: string;
  timezone?: string;
}

export interface AbuseIpDbResult {
  abuseConfidenceScore: number;
  totalReports: number;
  lastReportedAt: string | null;
  isWhitelisted: boolean;
  countryCode: string;
  isp: string;
  domain: string;
  usageType: string;
}

export interface ShodanResult {
  ports: number[];
  vulns: string[];
  os: string | null;
  hostnames: string[];
  isp: string;
  org: string;
  lastUpdate: string;
  services: ShodanService[];
}

export interface ShodanService {
  port: number;
  transport: string;
  product: string | null;
  version: string | null;
  banner?: string;
}

export interface VirusTotalStats {
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
}

export interface VirusTotalResult {
  stats: VirusTotalStats;
  permalink: string;
  scanDate: string;
  categories?: Record<string, string>;
}

export interface CrtShEntry {
  issuerCaId: number;
  issuerName: string;
  commonName: string;
  nameValue: string;
  notBefore: string;
  notAfter: string;
  serialNumber: string;
}

export interface DnsResult {
  a: string[];
  aaaa: string[];
  mx: Array<{ priority: number; exchange: string }>;
  ns: string[];
  txt: string[];
  cname: string[];
  soa: {
    nsname: string;
    hostmaster: string;
    serial: number;
  } | null;
}

export interface WhoisResult {
  domainName: string;
  registrar: string;
  creationDate: string;
  expirationDate: string;
  updatedDate: string;
  nameServers: string[];
  status: string[];
  registrantOrganization?: string;
  registrantCountry?: string;
}

// ─── Aggregated Source Maps ──────────────────────────────────

export interface EmailSources {
  haveibeenpwned: HibpResult | null;
  hunter: HunterResult | null;
}

export interface IpSources {
  ipinfo: IpInfoResult | null;
  abuseipdb: AbuseIpDbResult | null;
  shodan: ShodanResult | null;
  virustotal: VirusTotalResult | null;
}

export interface DomainSources {
  crtsh: CrtShEntry[] | null;
  dns: DnsResult | null;
  virustotal: VirusTotalResult | null;
  whois: WhoisResult | null;
}

export interface UrlSources {
  virustotal: VirusTotalResult | null;
  screenshotBase64: string | null;
}

export type SourcesMap = {
  email: EmailSources;
  ip: IpSources;
  domain: DomainSources;
  url: UrlSources;
};

// ─── Investigation Record ────────────────────────────────────

export interface InvestigationRecord<T extends InvestigationType = InvestigationType> {
  id: string;
  type: T;
  target: string;
  timestamp: string;
  sources: SourcesMap[T];
  report: AiReport;
  cached: boolean;
}

// ─── Dashboard Stats ─────────────────────────────────────────

export interface DashboardStats {
  totalScans: number;
  scansByType: Record<InvestigationType, number>;
  riskDistribution: Record<RiskLevel, number>;
  recentAlerts: InvestigationRecord[];
  scanTrend: Array<{ date: string; count: number }>;
}
