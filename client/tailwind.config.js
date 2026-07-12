/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        border: "var(--color-border)",
        input: "var(--color-border)",
        ring: "var(--color-primary)",
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "#ffffff",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          hover: "var(--color-surface-hover)",
        },
        muted: {
          DEFAULT: "var(--color-surface-hover)",
          foreground: "var(--color-muted-foreground)",
        },
        status: {
          available: "var(--color-status-available)",
          allocated: "var(--color-status-allocated)",
          reserved: "var(--color-status-reserved)",
          maintenance: "var(--color-status-maintenance)",
          lost: "var(--color-status-lost)",
          retired: "var(--color-status-retired)",
          disposed: "var(--color-status-disposed)",
          overdue: "var(--color-status-overdue)",
          pending: "var(--color-status-pending)",
          approved: "var(--color-status-approved)",
          rejected: "var(--color-status-rejected)",
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        heading: ["Space Grotesk", "Sora", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
}
