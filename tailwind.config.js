/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'amazon-orange': '#FF9900',
        'amazon-light-orange': '#FFB84D',
        'amazon-blue': '#131921',
        'amazon-dark-blue': '#232F3E',
        'amazon-dark': '#111111',
        'amazon-border': '#d5d5d5',
      },
    },
  },
  plugins: [],
}
