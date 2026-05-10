import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const historyQuerySchema = paginationSchema.extend({
  type: z.enum(['email', 'ip', 'domain', 'url']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  search: z.string().max(500).optional(),
  sortBy: z.enum(['created_at', 'risk_score']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type HistoryQueryInput = z.infer<typeof historyQuerySchema>;
