/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind compiles these globs at build time via the Metro plugin, so any
  // file that uses `className` must be listed here or its classes are dropped.
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Mirrors frontend/src/index.css's @theme block.
        primary: '#4f46e5',
        'primary-foreground': '#ffffff',
      },
      fontFamily: {
        // Mirrors frontend/src/index.css's --font-sans. RN has no font stack —
        // css-interop only reads the first entry — so this is just the loaded
        // family name (see App.tsx's useFonts). Applied via src/components/Text.tsx,
        // since RN's Text has no defaultProps to set this globally.
        sans: ['Poppins_400Regular'],
      },
    },
  },
  plugins: [],
};
