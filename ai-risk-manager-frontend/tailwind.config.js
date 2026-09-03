/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'background': '#13131b',
        'surface': '#13131b',
        'surface-dim': '#0d0d15',
        'surface-container': '#1f1f27',
        'surface-container-high': '#292932',
        'surface-variant': '#34343d',
        'primary': '#c0c1ff',
        'on-primary': '#1000a9',
        'secondary': '#4edea3',
        'tertiary': '#ffb95f',
        'error': '#ffb4ab',
        'on-surface': '#e4e1ed',
        'on-surface-variant': '#c7c4d7',
        'outline-variant': '#464554'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
