import { fetchWithTimeout } from '../../utils/http.js';
import { getEnv } from '../../config/env.js';

// 1. VirusTotal URL scan (free key - submit URL and fetch report later, but to save time we just submit and fetch analysis ID, or use url id)
// Note: To make it fast, VT /api/v3/urls/{id} requires base64 URL without padding.
export async function queryVtUrl(url: string) {
  const env = getEnv();
  // We can just fetch the existing report for this URL using the URL identifier
  // The identifier for a URL is its SHA-256 or base64u encoding without padding
  const base64Url = Buffer.from(url).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const endpoint = `https://www.virustotal.com/api/v3/urls/${base64Url}`;
  return fetchWithTimeout<any>(endpoint, {
    headers: {
      'x-apikey': env.VIRUSTOTAL_API_KEY || 'MISSING_KEY',
      Accept: 'application/json',
    },
  });
}

// 2. URLScan.io submit (free, no key for public scans)
export async function queryUrlScanSubmit(url: string) {
  const endpoint = `https://urlscan.io/api/v1/scan/`;
  return fetchWithTimeout<any>(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url, visibility: 'public' }),
  });
}

// 3. Google Safe Browsing (free key — already set)
export async function queryGoogleSafeBrowsing(url: string) {
  const env = getEnv();
  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${env.GOOGLE_SAFE_BROWSING_KEY || 'MISSING_KEY'}`;
  return fetchWithTimeout<any>(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client: { clientId: 'nextosint', clientVersion: '1.0' },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }],
      },
    }),
  });
}
