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
        canvas:      '#EEEBE2',
        surface:     '#F7F5EE',
        ink:         '#14141A',
        hairline:    '#D9D4C4',
        'hairline-soft': '#E5E1D3',
        muted:       '#6E6A62',
        go:          '#1F6E45',
        review:      '#B07A1B',
        nogo:        '#A8362A',
        pending:     '#4A6585',
        steel:       '#3D5D85',
      },
      fontFamily: {
        display: ['var(--font-archivo-narrow)', 'sans-serif'],
        body:    ['var(--font-inter-tight)', 'sans-serif'],
        mono:    ['var(--font-jetbrains-mono)', 'monospace'],
        arabic:  ['var(--font-ibm-plex-arabic)', 'sans-serif'],
      },
      fontSize: {
        'body': ['13.5px', '1.5'],
      },
    },
  },
  plugins: [],
}

export default config
