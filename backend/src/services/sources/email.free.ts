import { fetchWithTimeout } from '../../utils/http.js';
import crypto from 'node:crypto';

// 1. LeakCheck (free, no key)
// GET https://leakcheck.io/api/public?check={email}
export async function queryLeakCheck(email: string) {
  const url = `https://leakcheck.io/api/public?check=${encodeURIComponent(email)}`;
  return fetchWithTimeout<{ success: boolean; found: number; fields?: string[] }>(url);
}

// 2. HIBP Pastes (free, no key)
// GET https://haveibeenpwned.com/api/v3/pasteaccount/{email}
export async function queryHibpPastes(email: string) {
  const url = `https://haveibeenpwned.com/api/v3/pasteaccount/${encodeURIComponent(email)}`;
  return fetchWithTimeout<any[]>(url, {
    headers: { 'User-Agent': 'NextOSINT/1.0' },
  });
}

// 3. EmailRep.io (free, no key)
// GET https://emailrep.io/{email}
export async function queryEmailRep(email: string) {
  const url = `https://emailrep.io/${encodeURIComponent(email)}`;
  return fetchWithTimeout<any>(url, {
    headers: { 'User-Agent': 'NextOSINT/1.0' },
  });
}

// 4. Gravatar check (free, no key)
// Compute MD5 of lowercased email
export async function queryGravatar(email: string) {
  const hash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
  const url = `https://www.gravatar.com/avatar/${hash}?d=404&s=1`;

  // We only care if it's 200 vs 404, so we can use fetchWithTimeout but it tries to parse json/text.
  // Instead, let's write a targeted ping.
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(id);
    return { found: res.status === 200 };
  } catch {
    return { found: false };
  }
}

// 5. MX record lookup (free, built-in Node.js)
import dns from 'node:dns/promises';

export async function queryMxRecords(email: string) {
  const domain = email.split('@')[1];
  if (!domain) return null;
  try {
    const mx = await dns.resolveMx(domain);
    return mx;
  } catch {
    return null; // Domain error, etc.
  }
}

// 6. Eva email validation (free, no key)
// GET https://api.eva.pingutil.com/email?email={email}
export async function queryEva(email: string) {
  const url = `https://api.eva.pingutil.com/email?email=${encodeURIComponent(email)}`;
  return fetchWithTimeout<{ status: string; data: { valid_syntax: boolean; disposable: boolean; webmail: boolean; deliverable: boolean; catch_all: boolean } }>(url);
}

// 7. Paste dork link (no API call)
export function getPastebinDork(email: string) {
  return `https://www.google.com/search?q=site%3Apastebin.com+"${encodeURIComponent(email)}"`;
}
