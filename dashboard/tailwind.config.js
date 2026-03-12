/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#060A0D',
        bg2: '#0C1117',
        surface: '#121920',
        surface2: '#18212B',
        green: '#3EE07F',
        gold: '#FFB84D',
        red: '#FF5757',
        blue: '#60A5FA',
        purple: '#C4B5FD',
      },
    },
  },
  plugins: [],
};
