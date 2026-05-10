export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
/** Structured output that Claude must return */
export interface AiReport {
    riskLevel: RiskLevel;
    score: number;
    summary: string;
    indicators: string[];
    recommendations: string[];
    tags: string[];
}
/** Raw AI response wrapper (may include hidden thinking) */
export interface AiRawResponse {
    thinking?: string;
    report: AiReport;
}
//# sourceMappingURL=ai-report.d.ts.map