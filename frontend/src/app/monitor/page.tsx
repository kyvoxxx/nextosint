'use client';

import { useState } from 'react';
import { Eye, Plus, Trash2, Mail, Server, Globe, Link2, Bell, Clock } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { NeonButton } from '@/components/shared/NeonButton';
import type { RiskLevel } from '@shared/types/ai-report';

const MOCK_WATCHLIST = [
  { id: '1', type: 'email', target: 'ceo@company.com', lastChecked: '2h ago', lastRisk: 'low' as RiskLevel, active: true },
  { id: '2', type: 'ip', target: '185.220.101.42', lastChecked: '4h ago', lastRisk: 'critical' as RiskLevel, active: true },
  { id: '3', type: 'domain', target: 'corp-login.tk', lastChecked: '6h ago', lastRisk: 'high' as RiskLevel, active: true },
  { id: '4', type: 'email', target: 'admin@internal.org', lastChecked: '1h ago', lastRisk: 'medium' as RiskLevel, active: false },
];

const TYPE_ICONS: Record<string, typeof Mail> = {
  email: Mail, ip: Server, domain: Globe, url: Link2,
};

export default function MonitorPage() {
  const [items, setItems] = useState(MOCK_WATCHLIST);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-cyber-text">Monitor Watchlist</h2>
          <p className="font-mono text-xs text-cyber-text-muted mt-1">
            Continuously monitor targets — auto-scan every 6 hours
          </p>
        </div>
        <NeonButton icon={<Plus className="w-4 h-4" />}>Add Target</NeonButton>
      </div>

      {/* Info card */}
      <GlassCard className="flex items-center gap-3 py-3">
        <Bell className="w-4 h-4 text-cyber-info" />
        <p className="font-mono text-xs text-cyber-text-secondary">
          Monitoring {items.filter((i) => i.active).length} active targets. Alerts fire when risk escalates above threshold.
        </p>
      </GlassCard>

      {/* Watchlist items */}
      <div className="grid gap-3">
        {items.map((item) => {
          const Icon = TYPE_ICONS[item.type] ?? Globe;
          return (
            <GlassCard key={item.id} className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/[0.03] border border-cyber-border">
                <Icon className="w-5 h-5 text-cyber-text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-cyber-text truncate">{item.target}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-[10px] text-cyber-text-muted uppercase">{item.type}</span>
                  <span className="flex items-center gap-1 font-mono text-[10px] text-cyber-text-muted">
                    <Clock className="w-2.5 h-2.5" /> {item.lastChecked}
                  </span>
                </div>
              </div>
              <RiskBadge level={item.lastRisk} size="sm" />
              <div className={`w-2 h-2 rounded-full ${item.active ? 'bg-cyber-accent animate-pulse-glow' : 'bg-cyber-text-muted'}`} />
              <button className="p-2 rounded-md hover:bg-cyber-danger-dim text-cyber-text-muted hover:text-cyber-danger transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
