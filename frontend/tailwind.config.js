/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Gasilska barvna shema (FRONTEND.md)
        primary: {
          DEFAULT: '#CC2200',
          dark: '#991900',
        },
      },
    },
  },
  plugins: [],
};
