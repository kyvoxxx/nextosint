/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0a0a0f',
          'bg-alt': '#12121a',
          'bg-card': 'rgba(18, 18, 26, 0.80)',
          'bg-card-solid': '#12121a',
          accent: '#00ff88',
          'accent-dim': 'rgba(0, 255, 136, 0.15)',
          'accent-mid': 'rgba(0, 255, 136, 0.40)',
          danger: '#ff3366',
          'danger-dim': 'rgba(255, 51, 102, 0.15)',
          warning: '#ffaa00',
          'warning-dim': 'rgba(255, 170, 0, 0.15)',
          info: '#00ccff',
          'info-dim': 'rgba(0, 204, 255, 0.15)',
          text: '#e2e8f0',
          'text-secondary': '#94a3b8',
          'text-muted': '#475569',
          border: 'rgba(0, 255, 136, 0.10)',
          'border-strong': 'rgba(0, 255, 136, 0.25)',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(0, 255, 136, 0.3)',
        'glow-green-lg': '0 0 40px rgba(0, 255, 136, 0.2), 0 0 80px rgba(0, 255, 136, 0.1)',
        'glow-red': '0 0 20px rgba(255, 51, 102, 0.3)',
        'glow-yellow': '0 0 20px rgba(255, 170, 0, 0.3)',
        'glow-blue': '0 0 20px rgba(0, 204, 255, 0.3)',
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px)`,
        'scanline': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 136, 0.03) 2px, rgba(0, 255, 136, 0.03) 4px)',
      },
      backgroundSize: {
        'grid-40': '40px 40px',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'scan-line': 'scanLine 8s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'terminal-blink': 'terminalBlink 1s step-end infinite',
        'data-stream': 'dataStream 20s linear infinite',
        'meter-fill': 'meterFill 1.5s ease-out forwards',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        terminalBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        dataStream: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100vh' },
        },
        meterFill: {
          from: { strokeDashoffset: '283' },
          to: { strokeDashoffset: 'var(--meter-offset)' },
        },
        glowPulse: {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.3)' },
        },
      },
    },
  },
  plugins: [],
};
