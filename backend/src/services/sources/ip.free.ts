import { fetchWithTimeout, fetchTextWithTimeout } from '../../utils/http.js';
import { getEnv } from '../../config/env.js';

// 1. ip-api.com (free, no key, HTTP only)
export async function queryIpApi(ip: string) {
  // HTTP only on free tier!
  const url = `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,isp,org,as,lat,lon,reverse,mobile,proxy,hosting`;
  return fetchWithTimeout<any>(url);
}

// 2. Shodan InternetDB (free, no key)
export async function queryShodanInternetdb(ip: string) {
  const url = `https://internetdb.shodan.io/${ip}`;
  return fetchWithTimeout<any>(url);
}

// 3. AbuseIPDB (free key — already set)
export async function queryAbuseIpdb(ip: string) {
  const env = getEnv();
  const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`;
  return fetchWithTimeout<any>(url, {
    headers: {
      Key: env.ABUSEIPDB_API_KEY || 'MISSING_KEY',
      Accept: 'application/json',
    },
  });
}

// 4. VirusTotal IP (free key — already set)
export async function queryVtIp(ip: string) {
  const env = getEnv();
  const url = `https://www.virustotal.com/api/v3/ip_addresses/${ip}`;
  return fetchWithTimeout<any>(url, {
    headers: {
      'x-apikey': env.VIRUSTOTAL_API_KEY || 'MISSING_KEY',
      Accept: 'application/json',
    },
  });
}

// 5. HackerTarget (free, no key) - returns raw nmap text
export async function queryHackerTargetNmap(ip: string) {
  const url = `https://api.hackertarget.com/nmap/?q=${ip}`;
  return fetchTextWithTimeout(url);
}
