import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  daisyui: {
    themes: [
      {
        light: {

          "primary": "#3042bf",

          "secondary": "#f0f1f6",

          "accent": "#f2a365",

          "neutral": "#e3e4e9",

          "base-100": "#ffffff",

          "info": "#9cadce",

          "success": "#4caf50",

          "warning": "#ff9800",

          "error": "#f44336",
        },
      },
    ],
  },
  plugins: [require("daisyui")],
}
export default config
