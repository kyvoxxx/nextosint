'use client';

import {
  Search,
  Shield,
  AlertTriangle,
  Activity,
  Globe,
  Mail,
  Server,
  Link2,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { ThreatMeter } from '@/components/shared/ThreatMeter';
import type { RiskLevel } from '@shared/types/ai-report';

// ─── Mock data for initial render (replaced by API call) ──────
const MOCK_STATS = {
  totalScans: 1542,
  scansByType: { email: 620, ip: 453, domain: 312, url: 157 },
  riskDistribution: { critical: 89, high: 312, medium: 567, low: 574 },
  recentAlerts: [
    { id: '1', type: 'ip', target: '185.220.101.42', riskLevel: 'critical' as RiskLevel, score: 94, timestamp: '2m ago' },
    { id: '2', type: 'email', target: 'admin@corp.com', riskLevel: 'high' as RiskLevel, score: 72, timestamp: '8m ago' },
    { id: '3', type: 'domain', target: 'phish-login.tk', riskLevel: 'critical' as RiskLevel, score: 88, timestamp: '15m ago' },
    { id: '4', type: 'url', target: 'https://evil.com/payload', riskLevel: 'high' as RiskLevel, score: 67, timestamp: '22m ago' },
    { id: '5', type: 'ip', target: '103.235.47.188', riskLevel: 'medium' as RiskLevel, score: 45, timestamp: '31m ago' },
  ],
};

const STAT_CARDS = [
  { label: 'Total Scans', value: MOCK_STATS.totalScans, icon: Search, color: 'text-cyber-accent', bgColor: 'bg-cyber-accent-dim' },
  { label: 'Critical Alerts', value: MOCK_STATS.riskDistribution.critical, icon: AlertTriangle, color: 'text-cyber-danger', bgColor: 'bg-cyber-danger-dim' },
  { label: 'High Risk', value: MOCK_STATS.riskDistribution.high, icon: Shield, color: 'text-cyber-warning', bgColor: 'bg-cyber-warning-dim' },
  { label: 'Active Monitors', value: 24, icon: Activity, color: 'text-cyber-info', bgColor: 'bg-cyber-info-dim' },
];

const TYPE_ICONS: Record<string, typeof Mail> = {
  email: Mail, ip: Server, domain: Globe, url: Link2,
};

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-cyber-text">
            Operations Overview
          </h2>
          <p className="font-mono text-xs text-cyber-text-muted mt-1">
            Real-time intelligence metrics
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-accent-dim border border-cyber-border">
          <TrendingUp className="w-3.5 h-3.5 text-cyber-accent" />
          <span className="font-mono text-xs text-cyber-accent">
            +12.5% scan volume
          </span>
        </div>
      </div>

      {/* ─── Stat cards row ──────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <GlassCard
              key={stat.label}
              className={`animate-slide-up stagger-${i + 1}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-xs font-medium text-cyber-text-muted uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="stat-value text-cyber-text mt-2">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ─── Main grid: Threat Meter + Recent Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution — Threat Meter */}
        <GlassCard className="lg:col-span-1 flex flex-col items-center justify-center py-8">
          <h3 className="font-display font-semibold text-sm text-cyber-text-secondary uppercase tracking-wider mb-6">
            Overall Risk Posture
          </h3>
          <ThreatMeter
            score={68}
            riskLevel="high"
            size={200}
            label="Aggregate Score"
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-6 w-full max-w-[260px]">
            {(Object.entries(MOCK_STATS.riskDistribution) as [RiskLevel, number][]).map(([level, count]) => (
              <div key={level} className="flex items-center justify-between">
                <RiskBadge level={level} showIcon={false} size="sm" />
                <span className="font-mono text-xs text-cyber-text-muted">{count}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Recent Alerts */}
        <GlassCard className="lg:col-span-2" padded={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-cyber-border">
            <h3 className="font-display font-semibold text-sm text-cyber-text uppercase tracking-wider">
              Recent Alerts
            </h3>
            <button className="flex items-center gap-1 text-xs text-cyber-text-muted hover:text-cyber-accent transition-colors font-display">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-cyber-border">
            {MOCK_STATS.recentAlerts.map((alert, i) => {
              const TypeIcon = TYPE_ICONS[alert.type] ?? Globe;
              return (
                <div
                  key={alert.id}
                  className={`flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors animate-slide-up stagger-${i + 1}`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white/[0.03] border border-cyber-border">
                    <TypeIcon className="w-4 h-4 text-cyber-text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm text-cyber-text truncate">
                      {alert.target}
                    </p>
                    <p className="font-mono text-[10px] text-cyber-text-muted mt-0.5 uppercase">
                      {alert.type} investigation
                    </p>
                  </div>
                  <RiskBadge level={alert.riskLevel} size="sm" />
                  <span className="font-mono text-[11px] text-cyber-text-muted w-16 text-right">
                    {alert.timestamp}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* ─── Scan volume by type ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.entries(MOCK_STATS.scansByType) as [string, number][]).map(([type, count], i) => {
          const Icon = TYPE_ICONS[type] ?? Globe;
          const pct = Math.round((count / MOCK_STATS.totalScans) * 100);
          return (
            <GlassCard key={type} className={`animate-slide-up stagger-${i + 1}`}>
              <div className="flex items-center gap-3 mb-3">
                <Icon className="w-4 h-4 text-cyber-accent" />
                <span className="font-display text-sm font-medium text-cyber-text capitalize">
                  {type}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <span className="font-mono text-2xl font-bold text-cyber-text">
                  {count}
                </span>
                <span className="font-mono text-xs text-cyber-text-muted">
                  {pct}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyber-accent/60 transition-all duration-1000"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
