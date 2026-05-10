'use client';

/**
 * ScanlineOverlay — atmospheric CRT/cyberpunk scanline effect.
 * Fixed position, pointer-events: none, purely decorative.
 */
export function ScanlineOverlay() {
  return (
    <>
      {/* Static scanlines */}
      <div
        className="fixed inset-0 pointer-events-none z-[9999]"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 136, 0.012) 2px, rgba(0, 255, 136, 0.012) 4px)',
        }}
        aria-hidden="true"
      />

      {/* Moving scan beam */}
      <div
        className="fixed left-0 right-0 h-[2px] pointer-events-none z-[9997] animate-scan-line"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.10), rgba(0, 255, 136, 0.35), rgba(0, 255, 136, 0.10), transparent)',
        }}
        aria-hidden="true"
      />

      {/* Subtle noise texture */}
      <div
        className="fixed inset-0 pointer-events-none z-[9998] opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />
    </>
  );
}
