'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Mail,
  Server,
  Globe,
  Link2,
  Clock,
} from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { RiskBadge } from '@/components/shared/RiskBadge';
import type { RiskLevel } from '@shared/types/ai-report';

// Mock history data
const MOCK_HISTORY = Array.from({ length: 12 }, (_, i) => ({
  id: `inv_${(i + 1).toString().padStart(3, '0')}`,
  type: (['email', 'ip', 'domain', 'url'] as const)[i % 4],
  target: [
    'admin@corpmail.com',
    '185.220.101.42',
    'phish-login.tk',
    'https://evil.com/payload.js',
    'hr@company.org',
    '103.235.47.188',
    'malware-drop.xyz',
    'https://fake-bank.com/login',
    'ceo@startup.io',
    '45.33.32.156',
    'shadow-cdn.net',
    'https://crypto-scam.click/offer',
  ][i]!,
  riskLevel: (['critical', 'high', 'medium', 'low', 'high', 'critical', 'high', 'medium', 'low', 'medium', 'high', 'critical'] as RiskLevel[])[i]!,
  riskScore: [94, 72, 45, 18, 67, 88, 71, 52, 12, 41, 63, 91][i]!,
  createdAt: new Date(Date.now() - i * 3600000 * 2).toISOString(),
}));

const TYPE_ICONS: Record<string, typeof Mail> = {
  email: Mail, ip: Server, domain: Globe, url: Link2,
};

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = MOCK_HISTORY.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (searchQuery && !item.target.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-cyber-text">
            Investigation History
          </h2>
          <p className="font-mono text-xs text-cyber-text-muted mt-1">
            {MOCK_HISTORY.length} total investigations
          </p>
        </div>
        <button className="btn-ghost flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <GlassCard className="flex flex-col sm:flex-row items-stretch gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by target..."
            className="input-cyber pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyber-text-muted" />
          {['all', 'email', 'ip', 'domain', 'url'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={clsx(
                'tab-cyber text-xs',
                filterType === type && 'active',
              )}
            >
              {type === 'all' ? 'All' : type.toUpperCase()}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyber-border">
                <th className="px-5 py-3 text-left font-display text-xs font-semibold text-cyber-text-muted uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-left font-display text-xs font-semibold text-cyber-text-muted uppercase tracking-wider">Target</th>
                <th className="px-5 py-3 text-left font-display text-xs font-semibold text-cyber-text-muted uppercase tracking-wider">Risk</th>
                <th className="px-5 py-3 text-left font-display text-xs font-semibold text-cyber-text-muted uppercase tracking-wider">Score</th>
                <th className="px-5 py-3 text-left font-display text-xs font-semibold text-cyber-text-muted uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-border/50">
              {filtered.map((item, i) => {
                const Icon = TYPE_ICONS[item.type] ?? Globe;
                const date = new Date(item.createdAt);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-white/[0.02] transition-colors cursor-pointer animate-slide-up stagger-${Math.min(i + 1, 6)}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-white/[0.03] border border-cyber-border">
                          <Icon className="w-3.5 h-3.5 text-cyber-text-muted" />
                        </div>
                        <span className="font-mono text-xs text-cyber-text-secondary uppercase">
                          {item.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-sm text-cyber-text">
                        {item.target}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <RiskBadge level={item.riskLevel} size="sm" />
                    </td>
                    <td className="px-5 py-3">
                      <span className={clsx(
                        'font-mono text-sm font-bold',
                        item.riskScore >= 80 && 'text-cyber-danger',
                        item.riskScore >= 60 && item.riskScore < 80 && 'text-cyber-warning',
                        item.riskScore >= 30 && item.riskScore < 60 && 'text-cyber-warning',
                        item.riskScore < 30 && 'text-cyber-accent',
                      )}>
                        {item.riskScore}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-cyber-text-muted">
                        <Clock className="w-3 h-3" />
                        <span className="font-mono text-xs">
                          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-cyber-border">
          <span className="font-mono text-xs text-cyber-text-muted">
            Showing {filtered.length} of {MOCK_HISTORY.length}
          </span>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-md hover:bg-white/[0.05] text-cyber-text-muted hover:text-cyber-text transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 rounded-md bg-cyber-accent-dim text-cyber-accent font-mono text-xs">1</span>
            <button className="p-1.5 rounded-md hover:bg-white/[0.05] text-cyber-text-muted hover:text-cyber-text transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
