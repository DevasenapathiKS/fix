/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#525252',
          600: '#262626',
          700: '#000000' 
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
