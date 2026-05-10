'use client';

import { clsx } from 'clsx';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** Variant affects border and hover glow */
  variant?: 'default' | 'neon' | 'danger';
  /** Add padding */
  padded?: boolean;
  /** Hover effect */
  hoverable?: boolean;
}

/**
 * GlassCard — glassmorphism container with neon border options.
 */
export function GlassCard({
  children,
  className,
  variant = 'default',
  padded = true,
  hoverable = true,
}: GlassCardProps) {
  return (
    <div
      className={clsx(
        variant === 'default' && 'glass-card',
        variant === 'neon' && 'neon-card',
        variant === 'danger' && 'neon-card neon-card-danger',
        padded && 'p-5',
        hoverable && 'hover:transform hover:-translate-y-0.5',
        className,
      )}
    >
      {children}
    </div>
  );
}
