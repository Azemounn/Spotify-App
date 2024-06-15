/** @type {import('tailwindcss').Config} */
module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        stone: '#292524',
        stone_2: '#171717',
        stone_3: '#78716c',
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
