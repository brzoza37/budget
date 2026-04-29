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
          DEFAULT: '#4CAF50',
          dark: '#388E3C',
          light: '#81C784'
        },
        secondary: {
          DEFAULT: '#FF5722',
          dark: '#E64A19',
          light: '#FF8A65'
        }
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Avoid conflicts with MUI
  },
}
