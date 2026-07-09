/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'serif'],
        data: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        paper: '#FAF9F5',
        ink: '#16211F',
        teal: {
          50:  '#EEF5F3',
          200: '#BFDAD3',
          500: '#2F6E64',
          700: '#1B4A43',
          900: '#0F2E2A',
        },
        brass: {
          400: '#C08A2E',
          500: '#A9762A',
        },
        seaglass: {
          400: '#3F9C77',
          500: '#2F7A5C',
        },
        rust: {
          400: '#C05B3C',
          500: '#A6472D',
        },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'serif'],
        data: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        paper: '#FAF9F5',
        ink: '#16211F',
        depth: {
          900: '#071B24',
          800: '#0D2B37',
          700: '#123C4C',
          600: '#1C5757',
          500: '#2A6E68',
        },
        teal: {
          50:  '#EEF5F3',
          200: '#BFDAD3',
          500: '#2F6E64',
          700: '#1B4A43',
          900: '#0F2E2A',
        },
        brass: { 400: '#C08A2E', 500: '#A9762A' },
        seaglass: { 400: '#3F9C77', 500: '#2F7A5C' },
        rust: { 400: '#C05B3C', 500: '#A6472D' },
      },
    },
  },
  plugins: [],
}