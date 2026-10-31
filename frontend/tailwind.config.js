/** @type {import('tailwindcss').Config} */
export default {
  // Only the admin app uses Tailwind; the public site keeps its own CSS and is never scanned or reset by Tailwind.
  content: ['./admin/index.html', './admin/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Outfit', 'DM Sans', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
      /* Website colour theme (same palette as the Spares page).
         Every page already uses slate-* (greys), indigo-* (accent) and white, so re-defining them here re-themes the whole admin
         without touching the other files.  slate = warm sand / navy text,  indigo = navy -> teal accent,  white = soft cream. */
      colors: {
        white: '#fffdf9',
        slate: {
          50: '#f9f3e8', 100: '#f3e9da', 200: '#e8d9c0', 300: '#d9c19c', 400: '#a77f4f',
          500: '#6b5a47', 600: '#5b4e40', 700: '#1e3350', 800: '#0d2540', 900: '#0a1c30',
        },
        indigo: {
          50: '#e9f4f5', 100: '#cfe8ea', 200: '#a6d3d7', 300: '#6fb8bf', 400: '#3aa0a9',
          500: '#0d8d97', 600: '#0b3f66', 700: '#0d2540', 800: '#0a1c30', 900: '#081626',
        },
      },
    },
  },
  plugins: [],
};