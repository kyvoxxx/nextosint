import React from 'react';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';

export interface PlatformResult {
  platform: string;
  url: string;
  reliable: boolean;
  status: 'FOUND' | 'NOT_FOUND' | 'UNCERTAIN';
  note?: string;
}

export function UsernameGrid({ sources }: { sources: any }) {
  if (!sources || !sources.sherlock) return null;
  const data = sources.sherlock;

  const renderCard = (p: PlatformResult, type: 'found' | 'not_found' | 'uncertain') => {
    const isFound = type === 'found';
    const isUncertain = type === 'uncertain';

    return (
      <a
        key={p.platform}
        href={isFound ? p.url : '#'}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx(
          'p-3 rounded-lg border bg-black/40 flex items-center justify-between transition-colors',
          isFound ? 'border-cyber-success/30 hover:border-cyber-success cursor-pointer' : '',
          type === 'not_found' ? 'border-cyber-border opacity-60 cursor-not-allowed' : '',
          isUncertain ? 'border-cyber-warning/30 cursor-help' : ''
        )}
      >
        <div className="flex flex-col">
          <span className="font-display text-sm text-cyber-text">{p.platform}</span>
          {!p.reliable && (
            <span className="text-[10px] text-cyber-warning mt-1 leading-none">{p.note || 'May be inaccurate'}</span>
          )}
        </div>
        <div>
          {isFound && <CheckCircle2 className="w-5 h-5 text-cyber-success" />}
          {type === 'not_found' && <XCircle className="w-5 h-5 text-cyber-text-muted" />}
          {isUncertain && <HelpCircle className="w-5 h-5 text-cyber-warning" />}
        </div>
      </a>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in mt-6">
      <h3 className="font-display font-semibold text-sm text-cyber-text uppercase tracking-wide flex items-center gap-2">
        Platform Scans
        <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full">
          {data.summary.total} checked
        </span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {data.found.map((p: PlatformResult) => renderCard(p, 'found'))}
        {data.uncertain.map((p: PlatformResult) => renderCard(p, 'uncertain'))}
        {data.notFound.map((p: PlatformResult) => renderCard(p, 'not_found'))}
      </div>
    </div>
  );
}
