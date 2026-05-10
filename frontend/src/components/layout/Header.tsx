'use client';

import { usePathname } from 'next/navigation';
import { Bell, Terminal, User } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/investigate': 'Investigate',
  '/history': 'History',
  '/monitor': 'Monitor',
  '/settings': 'Settings',
};

/**
 * Header — top bar with page title, system status, and user actions.
 */
export function Header() {
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] ?? 'NextOSINT';

  return (
    <header className="flex items-center justify-between h-14 px-6 lg:px-8 border-b border-cyber-border bg-cyber-bg/60 backdrop-blur-md">
      {/* Left: Page context */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyber-accent" />
          <h1 className="font-display font-semibold text-base text-cyber-text">
            {pageTitle}
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyber-accent-dim border border-cyber-border">
          <div className="w-1.5 h-1.5 rounded-full bg-cyber-accent animate-pulse-glow" />
          <span className="font-mono text-[10px] text-cyber-accent uppercase tracking-wider">
            Live
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-lg
                     text-cyber-text-muted hover:text-cyber-text hover:bg-white/[0.03]
                     transition-colors duration-200"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyber-danger animate-pulse-glow" />
        </button>

        {/* User avatar */}
        <button
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg
                     hover:bg-white/[0.03] transition-colors duration-200"
          aria-label="User menu"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-cyber-accent-dim border border-cyber-border">
            <User className="w-3.5 h-3.5 text-cyber-accent" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="font-display text-xs font-medium text-cyber-text leading-none">
              Analyst
            </span>
            <span className="font-mono text-[10px] text-cyber-text-muted leading-none mt-0.5">
              admin
            </span>
          </div>
        </button>
      </div>
    </header>
  );
}
