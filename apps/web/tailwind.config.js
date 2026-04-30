/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'heliora-dark': '#0a0e1a',
        'heliora-panel': '#0d1424',
        'heliora-border': '#1a2a4a',
        'heliora-cyan': '#00d4ff',
        'heliora-teal': '#00b4a0',
        'heliora-orange': '#ff6b35',
        'heliora-red': '#ff3b3b',
        'heliora-green': '#00ff88',
        'heliora-yellow': '#ffd700',
        'heliora-text': '#a0b4c8',
        'heliora-text-dim': '#4a6280',
      },
      fontFamily: {
        mono: ['Courier New', 'Courier', 'monospace'],
      },
    },
  },
  plugins: [],
}
