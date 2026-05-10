'use client';

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { Mail, Server, Globe, Link2, Search, Zap } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { NeonButton } from '@/components/shared/NeonButton';
import { ScanTerminal } from '@/components/shared/ScanTerminal';
import { IntelReport } from '@/components/shared/IntelReport';
import { investigateEmail, investigateIp, investigateDomain, investigateUrl } from '@/lib/api';
import type { AiReport } from '@shared/types/ai-report';

type InvestigateTab = 'email' | 'ip' | 'domain' | 'url';

const TABS: { key: InvestigateTab; label: string; icon: typeof Mail; placeholder: string }[] = [
  { key: 'email', label: 'Email', icon: Mail, placeholder: 'target@example.com' },
  { key: 'ip', label: 'IP Address', icon: Server, placeholder: '203.0.113.42' },
  { key: 'domain', label: 'Domain', icon: Globe, placeholder: 'suspicious-domain.com' },
  { key: 'url', label: 'URL', icon: Link2, placeholder: 'https://suspicious-site.com/login' },
];

// Simulated log lines per investigation phase
function generateScanLogs(type: string, target: string): string[] {
  const base = [
    `[INFO] Starting ${type.toUpperCase()} investigation...`,
    `[INFO] Target: ${target}`,
    `[INFO] Initializing OSINT data sources...`,
  ];

  const sources: Record<string, string[]> = {
    email: [
      '[OK] HaveIBeenPwned — querying breach database...',
      '[OK] Hunter.io — verifying email context...',
    ],
    ip: [
      '[OK] IPInfo — resolving geolocation...',
      '[OK] AbuseIPDB — checking abuse reports...',
      '[OK] Shodan — scanning open ports...',
      '[OK] VirusTotal — checking IP reputation...',
    ],
    domain: [
      '[OK] crt.sh — querying certificate transparency...',
      '[OK] DNS — resolving records (A, MX, NS, TXT)...',
      '[OK] VirusTotal — checking domain reputation...',
      '[OK] WHOIS — fetching registration data...',
    ],
    url: [
      '[OK] VirusTotal — submitting URL for analysis...',
      '[OK] Screenshot — capturing page render...',
    ],
  };

  return [
    ...base,
    ...(sources[type] ?? []),
    '[INFO] All sources collected.',
    '[INFO] Sending to Claude AI for threat synthesis...',
    '[OK] AI analysis complete.',
    `[INFO] Risk assessment generated for ${target}`,
  ];
}

export default function InvestigatePage() {
  const [activeTab, setActiveTab] = useState<InvestigateTab>('email');
  const [input, setInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<{ report: AiReport; target: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    if (!input.trim() || isScanning) return;

    setIsScanning(true);
    setResult(null);
    setError(null);
    setLogs([]);

    // Simulate progressive log output
    const scanLogs = generateScanLogs(activeTab, input.trim());
    for (let i = 0; i < scanLogs.length; i++) {
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
      setLogs((prev) => [...prev, scanLogs[i]!]);
    }

    try {
      const apiFn = {
        email: investigateEmail,
        ip: investigateIp,
        domain: investigateDomain,
        url: investigateUrl,
      }[activeTab];

      const { data } = await apiFn(input.trim());
      const record = data as { report: AiReport; target: string; type: string };

      setResult({
        report: record.report,
        target: record.target ?? input.trim(),
        type: record.type ?? activeTab,
      });
      setLogs((prev) => [...prev, '[OK] Investigation complete ✓']);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Investigation failed';
      setError(message);
      setLogs((prev) => [...prev, `[ERROR] ${message}`]);
    } finally {
      setIsScanning(false);
    }
  }, [activeTab, input, isScanning]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="font-display font-bold text-xl text-cyber-text">
          Investigate Target
        </h2>
        <p className="font-mono text-xs text-cyber-text-muted mt-1">
          Enter a target to begin OSINT data collection and AI threat analysis
        </p>
      </div>

      {/* ─── Tab navigation ──────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setInput('');
                setResult(null);
                setError(null);
                setLogs([]);
              }}
              className={clsx(
                'tab-cyber flex items-center gap-2',
                activeTab === tab.key && 'active',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Input + Scan button ─────────────── */}
      <GlassCard variant="neon" className="flex flex-col sm:flex-row items-stretch gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-text-muted" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            placeholder={TABS.find((t) => t.key === activeTab)?.placeholder}
            className="input-cyber pl-10"
            disabled={isScanning}
          />
        </div>
        <NeonButton
          onClick={handleScan}
          loading={isScanning}
          icon={<Zap className="w-4 h-4" />}
          disabled={!input.trim()}
        >
          {isScanning ? 'Scanning...' : 'Investigate'}
        </NeonButton>
      </GlassCard>

      {/* ─── Terminal output ─────────────────── */}
      {(logs.length > 0 || isScanning) && (
        <ScanTerminal
          logs={logs}
          isScanning={isScanning}
          title={`${activeTab.toUpperCase()} Investigation — ${input.trim()}`}
        />
      )}

      {/* ─── Error display ───────────────────── */}
      {error && (
        <GlassCard variant="danger">
          <p className="font-mono text-sm text-cyber-danger">{error}</p>
          <p className="font-mono text-xs text-cyber-text-muted mt-1">
            The backend may be offline or the target is invalid. Check the terminal output above.
          </p>
        </GlassCard>
      )}

      {/* ─── Results ─────────────────────────── */}
      {result && (
        <IntelReport
          report={result.report}
          target={result.target}
          type={result.type}
        />
      )}
    </div>
  );
}
