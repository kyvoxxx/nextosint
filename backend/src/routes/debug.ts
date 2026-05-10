import type { FastifyInstance } from 'fastify';
import { getEnv } from '../config/env.js';

export async function debugRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/debug/sources',
    {
      schema: {
        description: 'Check status of all external OSINT APIs',
        tags: ['debug'],
        response: {
          200: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        },
      },
    },
    async (_request, reply) => {
      const conf = getEnv();
      const status: Record<string, 'ok' | 'missing' | 'invalid' | 'error'> = {};

      const checkKey = async (name: string, key: string | undefined, testFn: () => Promise<boolean>) => {
        if (!key) {
          status[name] = 'missing';
          return;
        }
        try {
          const valid = await testFn();
          status[name] = valid ? 'ok' : 'invalid';
        } catch (e) {
          status[name] = 'error';
        }
      };

      // AbuseIPDB test
      await checkKey('abuseipdb', conf.ABUSEIPDB_API_KEY, async () => {
        const res = await fetch('https://api.abuseipdb.com/api/v2/check?ipAddress=1.1.1.1', {
          headers: { Key: conf.ABUSEIPDB_API_KEY!, Accept: 'application/json' },
        });
        return res.status !== 401 && res.status !== 403;
      });

      // VirusTotal test
      await checkKey('virustotal', conf.VIRUSTOTAL_API_KEY, async () => {
        const res = await fetch('https://www.virustotal.com/api/v3/ip_addresses/1.1.1.1', {
          headers: { 'x-apikey': conf.VIRUSTOTAL_API_KEY! },
        });
        return res.status !== 401 && res.status !== 403;
      });

      // Google Safe Browsing test
      await checkKey('googleSafeBrowsing', conf.GOOGLE_SAFE_BROWSING_KEY, async () => {
        const url = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${conf.GOOGLE_SAFE_BROWSING_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: { clientId: 'nextosint', clientVersion: '1.0' },
            threatInfo: {
              threatTypes: ['MALWARE'],
              platformTypes: ['ANY_PLATFORM'],
              threatEntryTypes: ['URL'],
              threatEntries: [{ url: 'http://example.com' }],
            },
          }),
        });
        return res.status !== 400 && res.status !== 403;
      });

      // HIBP test
      await checkKey('haveibeenpwned', conf.HIBP_API_KEY, async () => {
        const res = await fetch('https://haveibeenpwned.com/api/v3/breachedaccount/test@example.com?truncateResponse=false', {
          headers: { 'hibp-api-key': conf.HIBP_API_KEY!, 'User-Agent': 'NextOSINT-API' },
        });
        return res.status !== 401 && res.status !== 403;
      });

      // Shodan test
      await checkKey('shodan', conf.SHODAN_API_KEY, async () => {
        const res = await fetch(`https://api.shodan.io/shodan/host/1.1.1.1?key=${conf.SHODAN_API_KEY}`);
        return res.status !== 401 && res.status !== 403;
      });

      // IPInfo test
      await checkKey('ipinfo', conf.IPINFO_TOKEN, async () => {
        const res = await fetch(`https://ipinfo.io/1.1.1.1/json?token=${conf.IPINFO_TOKEN}`);
        return res.status !== 401 && res.status !== 403;
      });

      // Hunter test
      await checkKey('hunter', conf.HUNTER_API_KEY, async () => {
        const res = await fetch(`https://api.hunter.io/v2/email-verifier?email=test@example.com&api_key=${conf.HUNTER_API_KEY}`);
        return res.status !== 401 && res.status !== 403;
      });

      return reply.send(status);
    }
  );
}
