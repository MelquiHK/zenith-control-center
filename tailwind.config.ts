import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'glass': 'rgba(255,255,255,0.04)',
        'glass-border': 'rgba(255,255,255,0.08)',
        'neon-cyan': '#00f5ff',
        'neon-purple': '#a855f7',
        'neon-gold': '#f59e0b',
        'neon-green': '#10b981',
        'neon-red': '#f43f5e',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          'from': { boxShadow: '0 0 10px rgba(0,245,255,0.3)' },
          'to': { boxShadow: '0 0 20px rgba(0,245,255,0.6), 0 0 40px rgba(0,245,255,0.2)' },
        }
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        'neon-cyan': '0 0 20px rgba(0,245,255,0.4)',
        'neon-purple': '0 0 20px rgba(168,85,247,0.4)',
        'neon-gold': '0 0 20px rgba(245,158,11,0.4)',
      }
    },
  },
  plugins: [],
}
export default config
