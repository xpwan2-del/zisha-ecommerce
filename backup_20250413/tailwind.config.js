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
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        accent: "var(--accent)",
        dark: "var(--dark)",
        light: "var(--light)",
        background: "var(--background)",
        "text-muted": "var(--text-muted)",
        border: "var(--border)",
        card: "var(--card)",
        // Amazon style colors (for backward compatibility)
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
