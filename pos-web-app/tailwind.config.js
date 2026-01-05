/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdecd6',
          200: '#f9d5ac',
          300: '#f5b677',
          400: '#f08d40',
          500: '#8B4513', // Kutunza brown
          600: '#7a3b10',
          700: '#632f0d',
          800: '#4c240a',
          900: '#3a1c08',
        },
      },
    },
  },
  plugins: [],
}
