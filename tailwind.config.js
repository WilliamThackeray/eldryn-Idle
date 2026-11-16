/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f1f1f',
        panel: '#2a2a2a',
        parchment: '#DAD6D6',
        gold: '#F4AC45',
        crimson: '#A61C3C',
        brown: '#694A38',
        sage: '#92BFB1',
      },
    },
  },
  plugins: [],
}
