'use client';

import { Key, Palette, Download, Shield } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';

const API_KEYS_CONFIG = [
  { name: 'HIBP_API_KEY', label: 'HaveIBeenPwned', status: 'configured' },
  { name: 'SHODAN_API_KEY', label: 'Shodan', status: 'missing' },
  { name: 'VIRUSTOTAL_API_KEY', label: 'VirusTotal', status: 'configured' },
  { name: 'IPINFO_TOKEN', label: 'IPInfo', status: 'configured' },
  { name: 'ABUSEIPDB_API_KEY', label: 'AbuseIPDB', status: 'missing' },
  { name: 'HUNTER_API_KEY', label: 'Hunter.io', status: 'missing' },
] as const;

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h2 className="font-display font-bold text-xl text-cyber-text">Settings</h2>
        <p className="font-mono text-xs text-cyber-text-muted mt-1">
          Configure API keys, theme preferences, and export settings
        </p>
      </div>

      {/* API Keys */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-cyber-accent" />
          <h3 className="font-display font-semibold text-sm text-cyber-text uppercase tracking-wider">
            OSINT API Keys
          </h3>
        </div>
        <p className="font-mono text-xs text-cyber-text-muted mb-4">
          API keys are stored server-side in .env — never exposed to the browser.
          Missing keys cause that source to be skipped with graceful degradation.
        </p>
        <div className="space-y-2">
          {API_KEYS_CONFIG.map((key) => (
            <div
              key={key.name}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-black/20 border border-cyber-border"
            >
              <div>
                <p className="font-mono text-sm text-cyber-text">{key.label}</p>
                <p className="font-mono text-[10px] text-cyber-text-muted">{key.name}</p>
              </div>
              <span className={`font-mono text-[11px] px-2 py-0.5 rounded-md ${
                key.status === 'configured'
                  ? 'text-cyber-accent bg-cyber-accent-dim'
                  : 'text-cyber-warning bg-cyber-warning-dim'
              }`}>
                {key.status === 'configured' ? '● Active' : '○ Not Set'}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Theme */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-cyber-accent" />
          <h3 className="font-display font-semibold text-sm text-cyber-text uppercase tracking-wider">
            Appearance
          </h3>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="font-display text-sm text-cyber-text-secondary">Theme</span>
          <span className="font-mono text-xs text-cyber-accent px-3 py-1 rounded-md bg-cyber-accent-dim border border-cyber-border">
            Cyber Dark (Default)
          </span>
        </div>
      </GlassCard>

      {/* Export */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-4 h-4 text-cyber-accent" />
          <h3 className="font-display font-semibold text-sm text-cyber-text uppercase tracking-wider">
            Export Format
          </h3>
        </div>
        <div className="flex gap-3">
          {['CSV', 'JSON', 'PDF'].map((fmt) => (
            <button key={fmt} className={`tab-cyber ${fmt === 'JSON' ? 'active' : ''}`}>
              {fmt}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* About */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-cyber-accent" />
          <h3 className="font-display font-semibold text-sm text-cyber-text uppercase tracking-wider">
            About
          </h3>
        </div>
        <div className="space-y-1.5 font-mono text-xs text-cyber-text-muted">
          <p>NextOSINT v1.0.0</p>
          <p>AI Engine: Claude claude-sonnet-4-20250514</p>
          <p>Backend: Fastify + TypeScript</p>
          <p>Frontend: Next.js 14 + Tailwind</p>
        </div>
      </GlassCard>
    </div>
  );
}
