/** @type {import(tailwindcss).Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#8B4513",
        secondary: "#D2B48C",
        accent: "#CD853F",
        dark: "#3E2723",
        light: "#F5F5DC",
        // Amazon style colors
        'amazon-blue': "#007185",
        'amazon-orange': "#ff9900",
        'amazon-light-orange': "#ffd814",
        'amazon-dark': "#111111",
        'amazon-border': "#d5d5d5",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        arabic: ["Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
}
