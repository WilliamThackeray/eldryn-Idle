/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f1f1f',
        panel: '#2a2a2a',
        raised: '#3a342f',
        parchment: '#DAD6D6',
        gold: '#F4AC45',
        crimson: '#A61C3C',
        brown: '#694A38',
        sage: '#92BFB1',
        line: '#9a7b64',
        // Light enough for 4.5:1 on ink and panel. parchment/60 and /70 are not.
        muted: '#d0cbc8',
        lack: '#f0b4ae',
        rarity: {
          common: '#DAD6D6',
          uncommon: '#92BFB1',
          rare: '#7EB6D9',
          'very-rare': '#C58BE2',
          legendary: '#F4AC45',
          artifact: '#E85D4C',
        },
        difficulty: {
          easy: '#92BFB1',
          even: '#F4AC45',
          hard: '#f0c36a',
          deadly: '#ffb089',
        },
        ability: {
          str: '#E07A5F',
          dex: '#7EB6D9',
          con: '#E0A36A',
          int: '#C58BE2',
          wis: '#92BFB1',
          cha: '#F4AC45',
        },
      },
      fontSize: {
        page: ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        section: ['1.125rem', { lineHeight: '1.75rem', fontWeight: '700' }],
        card: ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        body: ['0.875rem', { lineHeight: '1.25rem' }],
        meta: ['0.75rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
}
