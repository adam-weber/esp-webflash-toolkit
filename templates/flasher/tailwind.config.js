/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Apple-style grayscale
        'apple-dark': '#1d1d1f',
        'apple-gray': '#6e6e73',
        'apple-light-gray': '#86868b',
        'apple-blue': '#0071e3',
        'apple-red': '#ff3b30',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Consolas', 'monospace']
      },
      fontSize: {
        '56': '56px',
        '40': '40px',
        '32': '32px',
        '28': '28px',
        '21': '21px',
        '17': '17px',
        '15': '15px',
        '14': '14px',
        '13': '13px',
        '12': '12px',
      },
      letterSpacing: {
        'apple-tight': '-0.015em',
        'apple-normal': '-0.012em',
        'apple-body': '-0.022em',
        'apple-helper': '-0.016em',
        'apple-wide': '0.08em',
        'apple-subtitle': '0.011em',
      },
      borderRadius: {
        '16': '16px',
        '12': '12px',
        '8': '8px',
      },
      boxShadow: {
        'apple-card': '0 1px 3px rgba(0, 0, 0, 0.04)',
        'apple-focus': '0 0 0 4px rgba(0, 113, 227, 0.1)',
        'apple-focus-error': '0 0 0 4px rgba(255, 59, 48, 0.1)',
      }
    }
  },
  plugins: []
}
