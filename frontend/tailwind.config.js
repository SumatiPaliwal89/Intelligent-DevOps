
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        'cyber-black': '#0a0a0a',
        'cyber-charcoal': '#1a1a1a',
        'cyber-surface': '#1f1f1f',
        'cyber-surface-light': '#2a2a2a',
        'cyber-red': '#ef4444',
        'cyber-red-dark': '#dc2626',
        'cyber-red-light': '#fca5a5',
        'cyber-text': '#f5f5f5',
        'cyber-text-secondary': '#a3a3a3',
        'cyber-text-muted': '#525252',
        'cyber-border': '#262626',
        'cyber-border-light': '#404040',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-red': 'pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-line': 'scan-line 5s linear infinite',
        'gauge-fill': 'gauge-fill 2s ease-out forwards',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { 
            borderColor: '#ef4444',
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)'
          },
          '50%': { 
            borderColor: '#dc2626',
            boxShadow: '0 0 0 4px rgba(239, 68, 68, 0)'
          },
        },
        'scan-line': {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
        'gauge-fill': {
          '0%': { strokeDashoffset: '440' },
          '100%': { strokeDashoffset: 'var(--gauge-offset)' },
        },
      },
      boxShadow: {
        'red-glow': '0 0 20px rgba(239, 68, 68, 0.5)',
        'red-glow-lg': '0 0 30px rgba(239, 68, 68, 0.6)',
      },
    },
  },
  plugins: [],
}
