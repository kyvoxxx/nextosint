import type { FastifyInstance } from 'fastify';
import { historyQuerySchema } from '../schemas/history.schema.js';
import { getPrisma } from '../config/database.js';
import type { ApiResponse, PaginatedResponse } from '../../../shared/types/api.js';

/**
 * Register GET /api/history route.
 * Returns paginated investigation history with filtering and sorting.
 */
export async function historyRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: Record<string, string>;
  }>(
    '/api/history',
    {
      schema: {
        description: 'Retrieve paginated investigation history',
        tags: ['history'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 20, maximum: 100 },
            type: { type: 'string', enum: ['email', 'ip', 'domain', 'url'] },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            search: { type: 'string', maxLength: 500 },
            sortBy: { type: 'string', enum: ['created_at', 'risk_score'], default: 'created_at' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = historyQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          data: null,
          cached: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid query' },
        });
      }

      const { page, limit, type, riskLevel, search, sortBy, sortOrder } = parsed.data;
      const prisma = getPrisma();

      // Build where clause
      const where: any = {};
      if (type) where.type = type;
      if (riskLevel) where.riskLevel = riskLevel;
      if (search) {
        where.target = { contains: search, mode: 'insensitive' };
      }

      // Map sort field names
      const orderByField = sortBy === 'risk_score' ? 'riskScore' : 'createdAt';

      const [items, total] = await Promise.all([
        prisma.investigation.findMany({
          where,
          orderBy: { [orderByField]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            type: true,
            target: true,
            riskLevel: true,
            riskScore: true,
            tags: true,
            report: true,
            createdAt: true,
            // Exclude rawSources from list view (large payload)
          },
        }),
        prisma.investigation.count({ where }),
      ]);

      const response: ApiResponse<PaginatedResponse<typeof items[number]>> = {
        success: true,
        data: {
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        cached: false,
      };

      return reply.send(response);
    },
  );

  // ─── GET single investigation by ID ────────────────────────────
  app.get<{ Params: { id: string } }>(
    '/api/history/:id',
    {
      schema: {
        description: 'Retrieve a single investigation by ID (includes full raw sources)',
        tags: ['history'],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const prisma = getPrisma();
      const investigation = await prisma.investigation.findUnique({
        where: { id: request.params.id },
      });

      if (!investigation) {
        return reply.status(404).send({
          success: false,
          data: null,
          cached: false,
          error: { code: 'NOT_FOUND', message: 'Investigation not found' },
        });
      }

      return reply.send({
        success: true,
        data: investigation,
        cached: false,
      });
    },
  );
}
