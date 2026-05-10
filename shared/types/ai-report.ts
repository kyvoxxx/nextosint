export type RiskLevel = 'unknown' | 'low' | 'medium' | 'high' | 'critical';

/** Structured output that Claude must return */
export interface AiReport {
  riskLevel: RiskLevel;
  score: number;        // 0-100
  summary: string;      // 2-3 sentences
  indicators: string[];
  recommendations: string[];
  tags: string[];
}

/** Raw AI response wrapper (may include hidden thinking) */
export interface AiRawResponse {
  thinking?: string;    // Chain-of-thought (not exposed to client)
  report: AiReport;
}
