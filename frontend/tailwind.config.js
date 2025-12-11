/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1'
        },
        accent: '#f97316',
        dark: '#0b1120'
      },
      boxShadow: {
        card: '0 10px 25px -15px rgba(15, 23, 42, 0.6)'
      }
    }
  },
  plugins: []
};
