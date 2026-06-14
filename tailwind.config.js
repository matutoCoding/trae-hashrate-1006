/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        ink: {
          50: "#f5f1e8",
          100: "#e8e2d4",
          200: "#d4cbb8",
          300: "#b8ab90",
          400: "#9a8a6a",
          500: "#7d6c4d",
          600: "#5e5039",
          700: "#42392a",
          800: "#2a2520",
          900: "#1a1a2e",
          950: "#0f0f1a",
        },
        stoneblue: {
          50: "#eef5f8",
          100: "#d6e6ed",
          200: "#b0cce0",
          300: "#7fadc9",
          400: "#5a8fb6",
          500: "#4a7c9b",
          600: "#3a6381",
          700: "#2f4e68",
          800: "#2a4257",
          900: "#27384a",
        },
        ochre: {
          50: "#fdf7f1",
          100: "#fae9d8",
          200: "#f3cfab",
          300: "#e9ad77",
          400: "#d88545",
          500: "#a0522d",
          600: "#944a24",
          700: "#7b3c20",
          800: "#63311f",
          900: "#532a1d",
        },
        pine: {
          50: "#f0f7f4",
          100: "#d8ece3",
          200: "#b3d8c8",
          300: "#82bfa6",
          400: "#5ca183",
          500: "#4a9b83",
          600: "#3a7c68",
          700: "#316354",
          800: "#2b4f45",
          900: "#264139",
        },
        cinnabar: {
          50: "#fdf4f1",
          100: "#fbe5dc",
          200: "#f7c8b8",
          300: "#efa084",
          400: "#e46c4b",
          500: "#c2410c",
          600: "#a2330b",
          700: "#872a0c",
          800: "#6d2510",
          900: "#5a2212",
        },
      },
      fontFamily: {
        song: ['"Noto Serif SC"', '"Source Han Serif SC"', 'SimSun', 'serif'],
        kai: ['"LXGW WenKai"', '"STKaiti"', '"KaiTi"', 'cursive'],
      },
      backgroundImage: {
        'paper-texture':
          'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.05\'/%3E%3C/svg%3E")',
        'ink-wash':
          'radial-gradient(ellipse at 20% 30%, rgba(74,124,155,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(160,82,45,0.06) 0%, transparent 50%)',
      },
      boxShadow: {
        'scroll': '0 4px 24px -8px rgba(26,26,46,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
        'seal': '0 2px 8px rgba(194,65,12,0.35), inset 0 0 0 1px rgba(194,65,12,0.2)',
      },
    },
  },
  plugins: [],
};
