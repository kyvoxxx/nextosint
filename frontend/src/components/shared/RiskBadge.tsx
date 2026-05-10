'use client';

import { clsx } from 'clsx';
import { AlertTriangle, AlertOctagon, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { RiskLevel } from '@shared/types/ai-report';

interface RiskBadgeProps {
  level: RiskLevel;
  /** Show icon alongside text */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const RISK_CONFIG = {
  critical: {
    label: 'Critical',
    icon: AlertOctagon,
    classes: 'bg-cyber-danger-dim text-cyber-danger border-cyber-danger/25',
    dotClass: 'bg-cyber-danger',
  },
  high: {
    label: 'High',
    icon: AlertTriangle,
    classes: 'bg-[rgba(255,102,68,0.12)] text-[#ff6644] border-[rgba(255,102,68,0.25)]',
    dotClass: 'bg-[#ff6644]',
  },
  medium: {
    label: 'Medium',
    icon: ShieldAlert,
    classes: 'bg-cyber-warning-dim text-cyber-warning border-cyber-warning/25',
    dotClass: 'bg-cyber-warning',
  },
  low: {
    label: 'Low',
    icon: ShieldCheck,
    classes: 'bg-cyber-accent-dim text-cyber-accent border-cyber-accent/25',
    dotClass: 'bg-cyber-accent',
  },
  unknown: {
    label: 'Unknown',
    icon: AlertTriangle,
    classes: 'bg-gray-500/10 text-gray-400 border-gray-500/25',
    dotClass: 'bg-gray-500',
  },
} as const;

const SIZE_CLASSES = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-1',
  md: 'px-2 py-1 text-[11px] gap-1.5',
  lg: 'px-3 py-1.5 text-xs gap-2',
} as const;

/**
 * RiskBadge — color-coded risk level indicator.
 *
 * Displays a pill badge with optional icon, colored by severity.
 * Uses the design system's semantic color palette.
 */
export function RiskBadge({
  level,
  showIcon = true,
  size = 'md',
}: RiskBadgeProps) {
  const config = RISK_CONFIG[level];
  const Icon = config.icon;

  return (
    <span
      className={clsx(
        'badge border inline-flex items-center',
        config.classes,
        SIZE_CLASSES[size],
      )}
    >
      {showIcon && <Icon className={clsx(
        size === 'sm' && 'w-2.5 h-2.5',
        size === 'md' && 'w-3 h-3',
        size === 'lg' && 'w-3.5 h-3.5',
      )} />}
      {config.label}
    </span>
  );
}
