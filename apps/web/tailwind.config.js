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
        'heliora-dark': 'rgb(var(--hib-bg-0-rgb) / <alpha-value>)',
        'heliora-panel': 'rgb(var(--hib-bg-1-rgb) / <alpha-value>)',
        'heliora-border': 'rgb(var(--hib-line-rgb) / <alpha-value>)',
        'heliora-cyan': 'rgb(var(--hib-cyan-rgb) / <alpha-value>)',
        'heliora-teal': 'rgb(var(--hib-teal-rgb) / <alpha-value>)',
        'heliora-orange': 'rgb(var(--hib-orange-rgb) / <alpha-value>)',
        'heliora-red': 'rgb(var(--hib-red-rgb) / <alpha-value>)',
        'heliora-green': 'rgb(var(--hib-green-rgb) / <alpha-value>)',
        'heliora-yellow': 'rgb(var(--hib-yellow-rgb) / <alpha-value>)',
        'heliora-text': 'rgb(var(--hib-text-rgb) / <alpha-value>)',
        'heliora-text-dim': 'rgb(var(--hib-text-dim-rgb) / <alpha-value>)',
      },
      fontFamily: {
        mono: [
          'JetBrains Mono',
          'IBM Plex Mono',
          'Berkeley Mono',
          'ui-monospace',
          'SF Mono',
          'Menlo',
          'Courier New',
          'monospace',
        ],
        display: ['Rajdhani', 'Eurostile', 'Bank Gothic', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
