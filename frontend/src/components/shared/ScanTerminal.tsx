'use client';

import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

interface ScanTerminalProps {
  /** Log entries to display */
  logs: string[];
  /** Title shown in the terminal header */
  title?: string;
  /** Whether the scan is currently active */
  isScanning?: boolean;
  /** Max height in pixels */
  maxHeight?: number;
}

/**
 * ScanTerminal — live terminal output during investigations.
 *
 * Features:
 * - Auto-scrolls to latest entry
 * - Blinking cursor when scanning
 * - Terminal-style header with colored dots
 * - Monospace font with green-on-black aesthetic
 * - Line numbers
 */
export function ScanTerminal({
  logs,
  title = 'Investigation Terminal',
  isScanning = false,
  maxHeight = 320,
}: ScanTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="rounded-xl border border-cyber-border overflow-hidden bg-black/40 backdrop-blur-sm">
      {/* Terminal header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-black/30 border-b border-cyber-border">
        {/* Traffic light dots */}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyber-danger/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-cyber-warning/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-cyber-accent/70" />
        </div>
        <span className="font-mono text-[11px] text-cyber-text-muted">
          {title}
        </span>
        {isScanning && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-cyber-accent animate-pulse-glow" />
            <span className="font-mono text-[10px] text-cyber-accent uppercase tracking-wider">
              Scanning
            </span>
          </div>
        )}
      </div>

      {/* Terminal body */}
      <div
        ref={scrollRef}
        className="overflow-y-auto font-mono text-[13px] leading-relaxed p-4"
        style={{ maxHeight }}
      >
        {logs.length === 0 ? (
          <div className="text-cyber-text-muted flex items-center gap-2">
            <span className="text-cyber-accent">$</span>
            <span>Awaiting target...</span>
            <span className="animate-terminal-blink text-cyber-accent">█</span>
          </div>
        ) : (
          <>
            {logs.map((log, i) => (
              <div
                key={i}
                className="flex gap-3 animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Line number */}
                <span className="flex-shrink-0 w-6 text-right text-cyber-text-muted/40 select-none text-[11px]">
                  {(i + 1).toString().padStart(2, '0')}
                </span>

                {/* Log content */}
                <span
                  className={clsx(
                    'flex-1',
                    log.startsWith('[ERROR]') && 'text-cyber-danger',
                    log.startsWith('[WARN]') && 'text-cyber-warning',
                    log.startsWith('[OK]') && 'text-cyber-accent',
                    log.startsWith('[INFO]') && 'text-cyber-info',
                    log.startsWith('[SKIP]') && 'text-cyber-text-muted',
                    !log.match(/^\[/) && 'text-cyber-text-secondary',
                  )}
                >
                  {log}
                </span>
              </div>
            ))}

            {/* Blinking cursor */}
            {isScanning && (
              <div className="flex gap-3 mt-1">
                <span className="w-6" />
                <span className="animate-terminal-blink text-cyber-accent">█</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
