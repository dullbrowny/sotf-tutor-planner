/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#0f172a', soft: '#111827' },
        text: { DEFAULT: '#e5e7eb', muted: '#9ca3af' },
        card: { DEFAULT: '#111827', ring: '#1f2937' },
        accent: { DEFAULT: '#22d3ee', dim: '#0891b2' },
        danger: '#ef4444', success: '#22c55e', warn: '#f59e0b',
      },
      borderRadius: { xl: '0.9rem', '2xl': '1.25rem' },
      boxShadow: { card: '0 6px 24px rgba(0,0,0,0.25)' },
    },
  },
  plugins: [],
}
