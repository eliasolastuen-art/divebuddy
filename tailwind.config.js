/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#2B5C9E",
          "primary-soft": "#E3ECF7",
          dark: "#1E2B42",
          muted: "#56637A",
          line: "#E1E8F0",
          bg: "#EEF3F8",
        },
      },
      borderRadius: {
        card: "18px",
        button: "14px",
        pill: '9999px',
        sheet: '28px',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in': 'fade-in 0.2s ease',
      },
    },
  },
  plugins: [],
}
