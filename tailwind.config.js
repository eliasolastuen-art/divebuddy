/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50:  '#e6f4f4',
          100: '#b3dede',
          200: '#80c8c8',
          300: '#4db2b2',
          400: '#26a0a0',
          500: '#0D7377',
          600: '#0b6669',
          700: '#09595c',
          800: '#074c4e',
          900: '#053e40',
        },
        brand: {
          teal: '#0D7377',
          dark: '#0F172A',
        },
      },
      backdropBlur: {
        glass: '24px',
        nav: '32px',
      },
      borderRadius: {
        card: '20px',
        pill: '9999px',
        sheet: '28px',
      },
      boxShadow: {
        glass: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        float: '0 8px 32px rgba(13, 115, 119, 0.12), 0 2px 8px rgba(0,0,0,0.08)',
        card: '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        nav: '0 -1px 0 rgba(255,255,255,0.6), 0 8px 32px rgba(0,0,0,0.12)',
        modal: '0 20px 60px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.12)',
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
