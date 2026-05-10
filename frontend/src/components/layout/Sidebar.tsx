'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Search,
  History,
  Eye,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/investigate', label: 'Investigate', icon: Search },
  { href: '/history', label: 'History', icon: History },
  { href: '/monitor', label: 'Monitor', icon: Eye },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

/**
 * Sidebar — cyberpunk navigation rail with collapse toggle.
 *
 * Features:
 * - Glassmorphism background
 * - Neon accent on active route
 * - Animated collapse/expand
 * - Brand logo with glow effect
 */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        'relative flex flex-col h-full border-r transition-all duration-300 ease-in-out',
        'bg-cyber-bg-alt/80 backdrop-blur-xl border-cyber-border',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      {/* ─── Brand ────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-cyber-border">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-cyber-accent-dim">
          <Shield className="w-5 h-5 text-cyber-accent" />
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-lg shadow-glow-green opacity-50 animate-glow-pulse" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden animate-fade-in">
            <span className="font-display font-bold text-sm tracking-wide text-cyber-text">
              Next<span className="text-cyber-accent">OSINT</span>
            </span>
            <span className="font-mono text-[10px] text-cyber-text-muted tracking-widest uppercase">
              Intelligence
            </span>
          </div>
        )}
      </div>

      {/* ─── Navigation ───────────────────────── */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg',
                'font-display text-sm font-medium transition-all duration-200',
                isActive
                  ? 'text-cyber-accent bg-cyber-accent-dim'
                  : 'text-cyber-text-secondary hover:text-cyber-text hover:bg-white/[0.03]',
              )}
              title={collapsed ? item.label : undefined}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-cyber-accent shadow-glow-green" />
              )}

              <Icon
                className={clsx(
                  'w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200',
                  isActive
                    ? 'text-cyber-accent drop-shadow-[0_0_6px_rgba(0,255,136,0.5)]'
                    : 'text-cyber-text-muted group-hover:text-cyber-text-secondary',
                )}
              />

              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}

              {/* Investigate badge — pulsing dot */}
              {item.href === '/investigate' && !collapsed && (
                <div className="ml-auto flex items-center gap-1">
                  <Zap className="w-3 h-3 text-cyber-accent animate-pulse-glow" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ─── Status indicator ─────────────────── */}
      <div className={clsx(
        'px-4 py-3 border-t border-cyber-border',
        collapsed && 'flex justify-center',
      )}>
        {collapsed ? (
          <div className="w-2 h-2 rounded-full bg-cyber-accent animate-pulse-glow" />
        ) : (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-cyber-accent animate-pulse-glow" />
            <span className="font-mono text-[11px] text-cyber-text-muted">
              System Online
            </span>
          </div>
        )}
      </div>

      {/* ─── Collapse toggle ──────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={clsx(
          'absolute -right-3 top-20 z-20',
          'flex items-center justify-center w-6 h-6 rounded-full',
          'bg-cyber-bg-alt border border-cyber-border-strong',
          'text-cyber-text-muted hover:text-cyber-accent hover:shadow-glow-green',
          'transition-all duration-200 cursor-pointer',
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
}
