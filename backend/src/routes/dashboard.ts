import type { FastifyInstance } from 'fastify';
import { getPrisma } from '../config/database.js';
import { getCachedStats, setCachedStats } from '../services/cache.js';
import type { ApiResponse } from '../../../shared/types/api.js';
import type { DashboardStats } from '../../../shared/types/investigation.js';

/**
 * Register GET /api/dashboard/stats route.
 * Returns aggregate metrics for the dashboard overview.
 * Results are cached in Redis for 5 minutes.
 */
export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/dashboard/stats',
    {
      schema: {
        description: 'Get aggregate dashboard statistics',
        tags: ['dashboard'],
      },
    },
    async (_request, reply) => {
      // Check stats cache first
      const cached = await getCachedStats<DashboardStats>();
      if (cached) {
        return reply.send({ success: true, data: cached, cached: true } satisfies ApiResponse<DashboardStats>);
      }

      const prisma = getPrisma();

      // Run all queries in parallel
      const [
        totalScans,
        emailCount,
        ipCount,
        domainCount,
        urlCount,
        usernameCount,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        unknownCount,
        recentInvestigations,
        scanTrendRaw,
      ] = await Promise.all([
        prisma.investigation.count(),
        prisma.investigation.count({ where: { type: 'email' } }),
        prisma.investigation.count({ where: { type: 'ip' } }),
        prisma.investigation.count({ where: { type: 'domain' } }),
        prisma.investigation.count({ where: { type: 'url' } }),
        prisma.investigation.count({ where: { type: 'username' } }),
        prisma.investigation.count({ where: { riskLevel: 'critical' } }),
        prisma.investigation.count({ where: { riskLevel: 'high' } }),
        prisma.investigation.count({ where: { riskLevel: 'medium' } }),
        prisma.investigation.count({ where: { riskLevel: 'low' } }),
        prisma.investigation.count({ where: { riskLevel: 'unknown' } }),
        prisma.investigation.findMany({
          where: {
            riskLevel: { in: ['critical', 'high'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            type: true,
            target: true,
            riskLevel: true,
            riskScore: true,
            report: true,
            tags: true,
            createdAt: true,
          },
        }),
        // Raw SQL for daily scan trend (last 30 days)
        prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
          SELECT DATE(created_at) as date, COUNT(*)::bigint as count
          FROM investigations
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `.catch(() => [] as Array<{ date: string; count: bigint }>),
      ]);

      const stats: DashboardStats = {
        totalScans,
        scansByType: {
          email: emailCount,
          ip: ipCount,
          domain: domainCount,
          url: urlCount,
          username: usernameCount,
        },
        riskDistribution: {
          critical: criticalCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount,
          unknown: unknownCount,
        },
        recentAlerts: recentInvestigations.map((inv: any) => ({
          id: inv.id,
          type: inv.type as 'email' | 'ip' | 'domain' | 'url',
          target: inv.target,
          timestamp: inv.createdAt.toISOString(),
          sources: {} as never, // Not included in alert summary
          report: inv.report as DashboardStats['recentAlerts'][number]['report'],
          cached: false,
        })),
        scanTrend: scanTrendRaw.map((row: any) => ({
          date: String(row.date),
          count: Number(row.count),
        })),
      };

      // Cache for 5 minutes
      await setCachedStats(stats);

      return reply.send({ success: true, data: stats, cached: false } satisfies ApiResponse<DashboardStats>);
    },
  );
}
