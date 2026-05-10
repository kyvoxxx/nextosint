import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { emailInvestigateSchema } from '../schemas/investigate.schema.js';
import { ipInvestigateSchema } from '../schemas/investigate.schema.js';
import { domainInvestigateSchema } from '../schemas/investigate.schema.js';
import { urlInvestigateSchema } from '../schemas/investigate.schema.js';
import { usernameInvestigateSchema } from '../schemas/investigate.schema.js';
import { aggregateEmail } from '../services/aggregator/email.aggregator.js';
import { aggregateIp } from '../services/aggregator/ip.aggregator.js';
import { aggregateDomain } from '../services/aggregator/domain.aggregator.js';
import { aggregateUrl } from '../services/aggregator/url.aggregator.js';
import { aggregateUsername } from '../services/aggregator/username.aggregator.js';
import { getCached, setCache } from '../services/cache.js';
import { getPrisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import type { InvestigationRecord } from '../../../shared/types/investigation.js';
import type { ApiResponse } from '../../../shared/types/api.js';

/**
 * Register all /api/investigate/* routes.
 *
 * Each route follows the same pattern:
 * 1. Validate input with Zod
 * 2. Check Redis cache
 * 3. If miss → aggregate from sources → AI synthesis → cache + persist
 * 4. Return standardized ApiResponse envelope
 */
export async function investigateRoutes(app: FastifyInstance): Promise<void> {
  // ─── POST /api/investigate/email ─────────────────────────────
  app.post<{ Body: { email: string } }>(
    '/api/investigate/email',
    {
      schema: {
        description: 'Investigate an email address for breach exposure and digital footprint',
        tags: ['investigate'],
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = emailInvestigateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          data: null,
          cached: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid email' },
        });
      }

      const { email } = parsed.data;

      // Check cache
      const cached = await getCached<InvestigationRecord<'email'>>('email', email);
      if (cached) {
        return reply.send({ success: true, data: cached, cached: true } satisfies ApiResponse<InvestigationRecord<'email'>>);
      }

      // Aggregate + AI synthesis
      const { sources, report } = await aggregateEmail(email);

      const record: InvestigationRecord<'email'> = {
        id: `inv_${randomUUID().slice(0, 12)}`,
        type: 'email',
        target: email,
        timestamp: new Date().toISOString(),
        sources,
        report,
        cached: false,
      };

      // Persist to database (fire-and-forget)
      persistInvestigation(record).catch((err) => logger.error({ err }, 'Failed to persist email investigation'));

      // Cache result
      await setCache('email', email, record);

      return reply.send({ success: true, data: record, cached: false } satisfies ApiResponse<InvestigationRecord<'email'>>);
    },
  );

  // ─── POST /api/investigate/ip ────────────────────────────────
  app.post<{ Body: { ip: string } }>(
    '/api/investigate/ip',
    {
      schema: {
        description: 'Investigate an IP address for abuse, geolocation, and open ports',
        tags: ['investigate'],
        body: {
          type: 'object',
          required: ['ip'],
          properties: {
            ip: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = ipInvestigateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          data: null,
          cached: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid IP' },
        });
      }

      const { ip } = parsed.data;

      const cached = await getCached<InvestigationRecord<'ip'>>('ip', ip);
      if (cached) {
        return reply.send({ success: true, data: cached, cached: true } satisfies ApiResponse<InvestigationRecord<'ip'>>);
      }

      const { sources, report } = await aggregateIp(ip);

      const record: InvestigationRecord<'ip'> = {
        id: `inv_${randomUUID().slice(0, 12)}`,
        type: 'ip',
        target: ip,
        timestamp: new Date().toISOString(),
        sources,
        report,
        cached: false,
      };

      persistInvestigation(record).catch((err) => logger.error({ err }, 'Failed to persist IP investigation'));
      await setCache('ip', ip, record);

      return reply.send({ success: true, data: record, cached: false } satisfies ApiResponse<InvestigationRecord<'ip'>>);
    },
  );

  // ─── POST /api/investigate/domain ────────────────────────────
  app.post<{ Body: { domain: string } }>(
    '/api/investigate/domain',
    {
      schema: {
        description: 'Investigate a domain for attack surface, subdomains, and DNS configuration',
        tags: ['investigate'],
        body: {
          type: 'object',
          required: ['domain'],
          properties: {
            domain: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = domainInvestigateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          data: null,
          cached: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid domain' },
        });
      }

      const { domain } = parsed.data;

      const cached = await getCached<InvestigationRecord<'domain'>>('domain', domain);
      if (cached) {
        return reply.send({ success: true, data: cached, cached: true } satisfies ApiResponse<InvestigationRecord<'domain'>>);
      }

      const { sources, report } = await aggregateDomain(domain);

      const record: InvestigationRecord<'domain'> = {
        id: `inv_${randomUUID().slice(0, 12)}`,
        type: 'domain',
        target: domain,
        timestamp: new Date().toISOString(),
        sources,
        report,
        cached: false,
      };

      persistInvestigation(record).catch((err) => logger.error({ err }, 'Failed to persist domain investigation'));
      await setCache('domain', domain, record);

      return reply.send({ success: true, data: record, cached: false } satisfies ApiResponse<InvestigationRecord<'domain'>>);
    },
  );

  // ─── POST /api/investigate/url ───────────────────────────────
  app.post<{ Body: { url: string } }>(
    '/api/investigate/url',
    {
      schema: {
        description: 'Investigate a URL for phishing, malware, and suspicious behaviour',
        tags: ['investigate'],
        body: {
          type: 'object',
          required: ['url'],
          properties: {
            url: { type: 'string', format: 'uri' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = urlInvestigateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          data: null,
          cached: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid URL' },
        });
      }

      const { url } = parsed.data;

      const cached = await getCached<InvestigationRecord<'url'>>('url', url);
      if (cached) {
        return reply.send({ success: true, data: cached, cached: true } satisfies ApiResponse<InvestigationRecord<'url'>>);
      }

      const { sources, report } = await aggregateUrl(url);

      const record: InvestigationRecord<'url'> = {
        id: `inv_${randomUUID().slice(0, 12)}`,
        type: 'url',
        target: url,
        timestamp: new Date().toISOString(),
        sources,
        report,
        cached: false,
      };

      persistInvestigation(record).catch((err) => logger.error({ err }, 'Failed to persist URL investigation'));
      await setCache('url', url, record);

      return reply.send({ success: true, data: record, cached: false } satisfies ApiResponse<InvestigationRecord<'url'>>);
    },
  );

  // ─── POST /api/investigate/username ──────────────────────────
  app.post<{ Body: { username: string } }>(
    '/api/investigate/username',
    {
      schema: {
        description: 'Investigate a username across multiple social platforms',
        tags: ['investigate'],
        body: {
          type: 'object',
          required: ['username'],
          properties: {
            username: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = usernameInvestigateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          data: null,
          cached: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid username' },
        });
      }

      const { username } = parsed.data;

      // Check cache
      // The return type is technically ANY or unknown since InvestigationRecord might not formally have "username" source type yet
      const cached = await getCached<any>('username', username);
      if (cached) {
        return reply.send({ success: true, data: cached, cached: true });
      }

      const { sources, report } = await aggregateUsername(username);

      const record = {
        id: randomUUID(),
        type: 'username',
        target: username,
        sources,
        report,
        timestamp: new Date().toISOString(),
      };

      if (record.report.riskLevel !== 'unknown') {
        const persistPromise = persistInvestigation(record as any).catch((err) =>
          logger.error({ err }, 'Failed to persist username investigation')
        );
        const cachePromise = setCache('username', username, record);
        
        await Promise.allSettled([persistPromise, cachePromise]);
      }

      return reply.send({ success: true, data: record, cached: false });
    },
  );
}

// ─── Persistence helper ──────────────────────────────────────────

async function persistInvestigation(record: InvestigationRecord): Promise<void> {
  const prisma = getPrisma();

  await prisma.investigation.create({
    data: {
      id: record.id,
      type: record.type,
      target: record.target,
      rawSources: record.sources as object,
      report: record.report as object,
      riskLevel: record.report.riskLevel,
      riskScore: record.report.score,
      tags: record.report.tags,
      createdAt: new Date(record.timestamp),
    },
  });

  logger.debug({ id: record.id, type: record.type }, 'Investigation persisted to database');
}
