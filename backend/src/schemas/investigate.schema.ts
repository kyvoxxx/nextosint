import { z } from 'zod';

// ─── Private IP range checker (SSRF prevention) ──────────────
const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^fd/,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

// ─── Email investigation ─────────────────────────────────────
export const emailInvestigateSchema = z.object({
  email: z
    .string()
    .email('Must be a valid email address')
    .max(320, 'Email too long')
    .transform((val) => val.toLowerCase().trim()),
});

export type EmailInvestigateInput = z.infer<typeof emailInvestigateSchema>;

// ─── IP investigation ────────────────────────────────────────
export const ipInvestigateSchema = z.object({
  ip: z
    .string()
    .ip({ message: 'Must be a valid IPv4 or IPv6 address' })
    .refine((ip) => !isPrivateIp(ip), {
      message: 'Private/reserved IP addresses are not allowed',
    }),
});

export type IpInvestigateInput = z.infer<typeof ipInvestigateSchema>;

// ─── Domain investigation ────────────────────────────────────
const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export const domainInvestigateSchema = z.object({
  domain: z
    .string()
    .min(3, 'Domain too short')
    .max(253, 'Domain too long')
    .regex(domainRegex, 'Must be a valid domain name (e.g., example.com)')
    .transform((val) => val.toLowerCase().trim()),
});

export type DomainInvestigateInput = z.infer<typeof domainInvestigateSchema>;

// ─── URL investigation ───────────────────────────────────────
export const urlInvestigateSchema = z.object({
  url: z
    .string()
    .url('Must be a valid URL')
    .max(2048, 'URL too long')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          // Only allow http/https schemes
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
          }
          // Block private IPs in hostname (SSRF prevention)
          if (isPrivateIp(parsed.hostname)) {
            return false;
          }
          // Block localhost
          if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
            return false;
          }
          return true;
        } catch {
          return false;
        }
      },
      { message: 'URL must use http(s) and cannot target private/local addresses' },
    ),
});

export type UrlInvestigateInput = z.infer<typeof urlInvestigateSchema>;
