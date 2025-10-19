import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0B0F',
          panel: '#151519',
          border: '#2A2A2F',
        },
      },
      fontFamily: {
        sans: [
          'Rubik',
          'Manrope',
          'Montserrat',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        display: [
          'Rubik Black',
          'Manrope ExtraBold',
          'Montserrat ExtraBold',
          'sans-serif',
        ],
      },
      animation: {
        'slide-up-in': 'slideUpIn 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up-out': 'slideUpOut 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.3s ease-out',
      },
      keyframes: {
        slideUpIn: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUpOut: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
