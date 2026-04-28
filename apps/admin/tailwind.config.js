/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/pages/**/*.{js,ts,jsx,tsx,mdx}', './src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'heliora-dark': '#08101d',
        'heliora-panel': '#0f1726',
        'heliora-border': '#20314d',
        'heliora-cyan': '#32d7ff',
        'heliora-green': '#00ff88',
        'heliora-red': '#ff5869',
        'heliora-yellow': '#ffd76b',
        'heliora-text': '#d7e5f2',
        'heliora-text-dim': '#6c88a6'
      },
      fontFamily: {
        mono: ['Courier New', 'Courier', 'monospace']
      }
    },
  },
  plugins: [],
};
