'use client';

import { clsx } from 'clsx';

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const VARIANT_CLASSES = {
  primary: 'btn-neon',
  ghost: 'btn-ghost',
  danger:
    'inline-flex items-center gap-2 px-4 py-2.5 font-display font-semibold text-sm ' +
    'text-cyber-danger bg-cyber-danger-dim border border-cyber-danger/25 rounded-lg ' +
    'hover:bg-cyber-danger/20 hover:shadow-glow-red transition-all duration-200 cursor-pointer',
} as const;

const SIZE_CLASSES = {
  sm: 'text-xs px-3 py-1.5',
  md: '',
  lg: 'text-base px-6 py-3',
} as const;

/**
 * NeonButton — styled action button with loading state.
 */
export function NeonButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: NeonButtonProps) {
  return (
    <button
      className={clsx(
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        (loading || disabled) && 'opacity-60 cursor-not-allowed pointer-events-none',
        className,
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin w-4 h-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
