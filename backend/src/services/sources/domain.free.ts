import { fetchWithTimeout } from '../../utils/http.js';
import dns from 'node:dns/promises';
import { getEnv } from '../../config/env.js';

// 1. crt.sh (free, no key)
export async function queryCrtsh(domain: string) {
  const url = `https://crt.sh/?q=${domain}&output=json`;
  // crt.sh occasionally takes a long time, bump timeout
  return fetchWithTimeout<any[]>(url, { timeoutMs: 12000 });
}

// 2. DNS resolver (free, Node.js built-in)
export async function resolveAllDns(domain: string) {
  const results: Record<string, any> = {};

  try {
    results.A = await dns.resolve4(domain);
  } catch {
    results.A = [];
  }

  try {
    results.MX = await dns.resolveMx(domain);
  } catch {
    results.MX = [];
  }

  try {
    results.NS = await dns.resolveNs(domain);
  } catch {
    results.NS = [];
  }

  try {
    results.TXT = await dns.resolveTxt(domain);
  } catch {
    results.TXT = [];
  }

  return results;
}

// 3. HackerTarget DNS (free, no key)
export async function queryHackerTargetDns(domain: string) {
  const url = `https://api.hackertarget.com/dnslookup/?q=${domain}`;
  const res = await fetchWithTimeout<string>(url, { headers: { Accept: 'text/plain' } });
  // The fetch helper for string requires text buffer conversion or using fetchTextWithTimeout, let's just make it simpler
  if (!res) return null;
  // If fetchWithTimeout expects JSON, it might throw or return null if it's text.
  // We should do a direct text fetch.
  // Due to TS constraints let's do an ad-hoc fetch for text
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    const textRes = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!textRes.ok) return null;
    return await textRes.text();
  } catch {
    return null;
  }
}

// 4. URLScan.io search (free, no key)
export async function queryUrlScanSearchDomain(domain: string) {
  const url = `https://urlscan.io/api/v1/search/?q=domain:${domain}&size=5`;
  return fetchWithTimeout<any>(url);
}

// 5. VirusTotal domain (free key — already set)
export async function queryVtDomain(domain: string) {
  const env = getEnv();
  const url = `https://www.virustotal.com/api/v3/domains/${domain}`;
  return fetchWithTimeout<any>(url, {
    headers: {
      'x-apikey': env.VIRUSTOTAL_API_KEY || 'MISSING_KEY',
      Accept: 'application/json',
    },
  });
}
