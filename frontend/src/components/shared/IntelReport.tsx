'use client';

import { clsx } from 'clsx';
import {
  ShieldCheck,
  AlertTriangle,
  Target,
  Lightbulb,
  Tag,
  FileText,
} from 'lucide-react';
import { RiskBadge } from './RiskBadge';
import { ThreatMeter } from './ThreatMeter';
import type { AiReport } from '@shared/types/ai-report';

interface IntelReportProps {
  /** AI-generated report data */
  report: AiReport;
  /** Target that was investigated */
  target: string;
  /** Type of investigation */
  type: string;
}

/**
 * IntelReport — formatted AI intelligence report card.
 *
 * Displays the complete Claude analysis with:
 * - Risk score gauge
 * - Executive summary
 * - Indicators of compromise
 * - Actionable recommendations
 * - Classification tags
 */
export function IntelReport({ report, target, type }: IntelReportProps) {
  return (
    <div className="neon-card overflow-hidden animate-slide-up">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-cyber-border bg-black/20">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-cyber-accent" />
          <div>
            <h3 className="font-display font-semibold text-sm text-cyber-text">
              Intelligence Report
            </h3>
            <p className="font-mono text-[11px] text-cyber-text-muted mt-0.5">
              {type.toUpperCase()} → {target}
            </p>
          </div>
        </div>
        <RiskBadge level={report.riskLevel} size="lg" />
      </div>

      <div className="p-5 space-y-6">
        {/* Score + Summary row */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Threat meter */}
          <div className="flex-shrink-0 flex justify-center">
            <ThreatMeter
              score={report.score}
              riskLevel={report.riskLevel}
              size={140}
              label="Threat Score"
            />
          </div>

          {/* Summary */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-cyber-accent" />
              <h4 className="font-display font-semibold text-sm text-cyber-text uppercase tracking-wide">
                Executive Summary
              </h4>
            </div>
            <p className="font-body text-sm text-cyber-text-secondary leading-relaxed">
              {report.summary}
            </p>
          </div>
        </div>

        {/* Indicators */}
        {report.indicators.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-cyber-warning" />
              <h4 className="font-display font-semibold text-sm text-cyber-text uppercase tracking-wide">
                Key Indicators
              </h4>
            </div>
            <ul className="space-y-2">
              {report.indicators.map((indicator, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyber-warning flex-shrink-0" />
                  <span className="text-cyber-text-secondary">{indicator}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-cyber-info" />
              <h4 className="font-display font-semibold text-sm text-cyber-text uppercase tracking-wide">
                Recommendations
              </h4>
            </div>
            <ul className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm animate-slide-up"
                  style={{ animationDelay: `${i * 60 + 200}ms` }}
                >
                  <span className="font-mono text-cyber-info text-xs mt-0.5 flex-shrink-0 w-5">
                    {(i + 1).toString().padStart(2, '0')}
                  </span>
                  <span className="text-cyber-text-secondary">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags */}
        {report.tags.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-cyber-text-muted" />
              <h4 className="font-display font-semibold text-sm text-cyber-text uppercase tracking-wide">
                Tags
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-cyber-border
                             font-mono text-[11px] text-cyber-text-muted
                             hover:border-cyber-border-strong hover:text-cyber-text-secondary
                             transition-colors duration-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
