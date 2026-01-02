/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kutunza Gourmet Brand Colors
        kutunza: {
          burgundy: '#722F37',
          gold: '#D4AF37',
          cream: '#FFF8E7',
          brown: '#8B4513',
          dark: '#2D1810',
        },
        // POS-specific colors
        pos: {
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#3B82F6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
