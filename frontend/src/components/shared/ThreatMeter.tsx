'use client';

import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import type { RiskLevel } from '@shared/types/ai-report';

interface ThreatMeterProps {
  /** Risk score 0-100 */
  score: number;
  /** Size of the meter in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Whether to animate on mount */
  animate?: boolean;
  /** Optional label below the score */
  label?: string;
  /** Risk level for color coding */
  riskLevel?: RiskLevel;
}

const RISK_COLORS = {
  low:      { stroke: '#00ff88', glow: 'rgba(0, 255, 136, 0.4)', bg: 'rgba(0, 255, 136, 0.08)' },
  medium:   { stroke: '#ffaa00', glow: 'rgba(255, 170, 0, 0.4)', bg: 'rgba(255, 170, 0, 0.08)' },
  high:     { stroke: '#ff6644', glow: 'rgba(255, 102, 68, 0.4)', bg: 'rgba(255, 102, 68, 0.08)' },
  critical: { stroke: '#ff3366', glow: 'rgba(255, 51, 102, 0.4)', bg: 'rgba(255, 51, 102, 0.08)' },
} as const;

function getRiskFromScore(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

/**
 * ThreatMeter — animated circular gauge showing a 0-100 risk score.
 *
 * Features:
 * - SVG-based circular progress with animated fill
 * - Color-coded by risk level (green → yellow → orange → red)
 * - Neon glow filter matching the risk color
 * - Animated score counter
 * - Tick marks around the circumference
 * - Pulsing glow on critical scores
 */
export function ThreatMeter({
  score,
  size = 180,
  strokeWidth = 8,
  animate = true,
  label,
  riskLevel: explicitRisk,
}: ThreatMeterProps) {
  const risk = explicitRisk ?? getRiskFromScore(score);
  const colors = RISK_COLORS[risk];

  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);
  const [mounted, setMounted] = useState(!animate);
  const animationRef = useRef<number>(0);

  // Center and radius calculations
  const center = size / 2;
  const radius = center - strokeWidth - 4;
  const circumference = 2 * Math.PI * radius;

  // Arc offset: full circle at 0, empty at circumference
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  // Tick marks (every 10 units = 36 degrees)
  const ticks = Array.from({ length: 10 }, (_, i) => {
    const angle = (i * 36 - 90) * (Math.PI / 180);
    const innerR = radius + strokeWidth + 2;
    const outerR = innerR + (i % 5 === 0 ? 8 : 4);
    return {
      x1: center + innerR * Math.cos(angle),
      y1: center + innerR * Math.sin(angle),
      x2: center + outerR * Math.cos(angle),
      y2: center + outerR * Math.sin(angle),
      major: i % 5 === 0,
    };
  });

  // Animate score counter
  useEffect(() => {
    if (!animate) {
      setDisplayScore(score);
      return;
    }

    setMounted(true);
    const start = performance.now();
    const duration = 1500;

    function step(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(eased * score));

      if (t < 1) {
        animationRef.current = requestAnimationFrame(step);
      }
    }

    animationRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationRef.current);
  }, [score, animate]);

  const filterId = `glow-${risk}-${size}`;

  return (
    <div className="relative inline-flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={clsx(
          'transform -rotate-90',
          risk === 'critical' && 'animate-glow-pulse',
        )}
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Threat score: ${score} out of 100`}
      >
        <defs>
          {/* Glow filter */}
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor={colors.glow} result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glowColor" />
            <feMerge>
              <feMergeNode in="glowColor" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient for the arc */}
          <linearGradient id={`grad-${filterId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.stroke} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.04)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Background fill — subtle color hint */}
        <circle
          cx={center}
          cy={center}
          r={radius - strokeWidth * 2}
          fill={colors.bg}
        />

        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#grad-${filterId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={mounted ? strokeDashoffset : circumference}
          filter={`url(#${filterId})`}
          style={{
            transition: animate ? 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
        />

        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <line
            key={i}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.major ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}
            strokeWidth={tick.major ? 2 : 1}
            strokeLinecap="round"
          />
        ))}

        {/* Center dot */}
        <circle
          cx={center}
          cy={center}
          r={2}
          fill={colors.stroke}
          opacity={0.6}
        />
      </svg>

      {/* Score overlay (positioned over center of SVG) */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ width: size, height: size }}
      >
        <span
          className="font-mono font-bold leading-none"
          style={{
            fontSize: size * 0.22,
            color: colors.stroke,
            textShadow: `0 0 12px ${colors.glow}`,
          }}
        >
          {displayScore}
        </span>
        <span
          className="font-mono text-cyber-text-muted uppercase tracking-widest mt-1"
          style={{ fontSize: Math.max(9, size * 0.055) }}
        >
          / 100
        </span>
      </div>

      {/* Label below */}
      {label && (
        <span className="font-display text-xs font-medium text-cyber-text-secondary uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
}
