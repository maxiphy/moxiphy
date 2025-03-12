/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontSize: {
        'xs': '0.65rem',    // 20% smaller than default 0.75rem
        'sm': '0.7rem',     // 20% smaller than default 0.875rem
        'base': '0.8rem',   // 20% smaller than default 1rem
        'lg': '0.9rem',     // 20% smaller than default 1.125rem
        'xl': '1.05rem',    // 20% smaller than default 1.25rem
        '2xl': '1.35rem',   // 20% smaller than default 1.5rem
        '3xl': '1.65rem',   // 20% smaller than default 1.875rem
        '4xl': '1.95rem',   // 20% smaller than default 2.25rem
        '5xl': '2.55rem',   // 20% smaller than default 3rem
        '6xl': '3.1rem',    // 20% smaller than default 3.75rem
        '7xl': '3.9rem',    // 20% smaller than default 4.5rem
        '8xl': '5.2rem',    // 20% smaller than default 6rem
        '9xl': '6.4rem',    // 20% smaller than default 8rem
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      },
    },
  },
  plugins: [],
}
